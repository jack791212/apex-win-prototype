-- =====================================================================
-- Apex Win｜Phase 6：多人真站雲端營運彙總（伺服器端營運帳本 + 全站彙總 RPC）
--
-- ★ 部署步驟（照做，不要覆蓋舊分頁）：
--   1. Supabase Dashboard → SQL Editor → 開【新查詢分頁】（保留 setup/phase4/4b/5 舊分頁不動）
--   2. 全部貼上 → Run（可重複執行，冪等）
--   3. 把「你自己」設為營運管理員（才看得到全站彙總）：先取得 uid，再 insert。
--      取 uid：SQL Editor 執行  select id, email from auth.users;   （或登入後前端 console: HL.auth.user().id）
--      設管理員：  insert into public.ops_admins (uid) values ('貼上你的-uid') on conflict do nothing;
--
-- 內容：
--   A) ops_events 營運事件帳本（definer-only）+ ops_log_srv 內部落帳
--   B) 8 個結算函式插樁（slot_spin/slot_buy/play_battle/bounty_flip/bounty_mine/chicken_*）
--      → 在既有扣注/派彩點加落帳（含遊戲名，供全站遊戲別 GGR/RTP）；bounty_mine 順帶夾住 p_maxmult 止血
--   C) wallet_txns 觸發器：儲值/提款自動落帳（不改 wallet_txn 函式）
--   D) ops_log 公開 RPC：客端鏡射「送幣」事件（返水/返現/VIP/faucet/JP；擋 bet/win/儲值/提款防偽造）
--   E) ops_admins + is_ops_admin + ops_summary（admin 閘；回傳與前端 HL.ledger 同形狀）
-- 安全：ops_events RLS 開、無 policy＝只有 security definer 函式能存取；全站彙總僅 admin 可讀。
-- =====================================================================

-- ---------- A) 營運事件帳本 ----------
create table if not exists public.ops_events (
  id bigint generated always as identity primary key,
  ts timestamptz not null default now(),
  uid uuid references auth.users on delete set null,
  type text not null,          -- bet|win|deposit|withdraw|bonus|faucet|jp_seed|jp_hit
  amount numeric not null,
  game text,                   -- 遊戲名（bet/win 才有）
  source text,                 -- 送幣來源（bonus/faucet 才有，如「返水 Rakeback」）
  src text not null default 'srv'  -- srv=伺服器權威 / client=客端回報（送幣層）
);
alter table public.ops_events enable row level security; -- 不開 policy：只有下方 definer 函式能存取
create index if not exists ops_events_ts on public.ops_events (ts desc);
create index if not exists ops_events_type on public.ops_events (type);

-- 伺服器權威落帳（amount<=0 略過；供各結算函式呼叫）
create or replace function public.ops_log_srv(p_uid uuid, p_type text, p_amount numeric, p_game text, p_source text)
returns void language plpgsql security definer set search_path = public as $$
begin
  if p_amount is null or p_amount <= 0 then return; end if;
  insert into public.ops_events (uid, type, amount, game, source, src)
  values (p_uid, p_type, round(p_amount), p_game, p_source, 'srv');
exception when others then null;  -- 落帳失敗絕不影響遊戲結算
end; $$;

-- ---------- B) 結算函式插樁（複製 phase5 函式體 + 落帳行；create or replace 冪等覆蓋）----------

-- B-1) play_battle（+ ops_log_srv bet/win）
create or replace function public.play_battle(
  p_wager numeric, p_players int, p_mode text, p_rounds int,
  p_roster jsonb default '[]'::jsonb, p_game text default 'Slots Battle'
) returns jsonb language plpgsql security definer set search_path = public as $$
declare
  v_uid uuid := auth.uid(); v_bal numeric; v_stats jsonb;
  v_players int := greatest(2, least(4, coalesce(p_players, 2)));
  v_rounds int := greatest(1, least(10, coalesce(p_rounds, 1)));
  v_mode text := coalesce(p_mode, 'normal'); v_wager numeric := greatest(0, coalesce(p_wager, 0));
  v_total numeric[]; v_lastDelta numeric[]; v_seats jsonb := '[]'::jsonb; v_metric numeric[]; v_winner int := 0;
  v_i int; v_r int; v_run numeric; v_round numeric; v_best numeric;
  v_win boolean; v_net numeric; v_newbal numeric;
  v_m int; v_w int; v_l int; v_streak int; v_bestStreak int; v_bigWin numeric; v_profit numeric; v_rounds_json jsonb;
begin
  if v_uid is null then return jsonb_build_object('error', 'not authenticated'); end if;
  select balance, arena_stats into v_bal, v_stats from profiles where id = v_uid;
  if v_bal is null then return jsonb_build_object('error', 'profile not found'); end if;
  if v_wager > v_bal then return jsonb_build_object('error', 'insufficient balance'); end if;
  v_total := array_fill(0::numeric, array[v_players]); v_lastDelta := array_fill(0::numeric, array[v_players]); v_metric := array_fill(0::numeric, array[v_players]);
  for v_i in 1..v_players loop
    v_run := 0; v_rounds_json := '[]'::jsonb;
    for v_r in 1..v_rounds loop
      v_round := floor(random() * 1500)::numeric + 120;
      if random() < 0.12 then v_round := v_round * (3 + floor(random() * 4))::int; end if;
      v_run := v_run + v_round; v_rounds_json := v_rounds_json || to_jsonb(v_run);
      if v_r = v_rounds then v_lastDelta[v_i] := v_round; end if;
    end loop;
    v_total[v_i] := v_run; v_metric[v_i] := case when v_mode = 'terminal' then v_lastDelta[v_i] else v_run end;
    v_seats := v_seats || jsonb_build_object('idx', v_i - 1, 'total', v_run, 'rounds', v_rounds_json);
  end loop;
  v_winner := 1; v_best := v_metric[1];
  for v_i in 2..v_players loop
    if (v_mode = 'crazy' and v_metric[v_i] < v_best) or (v_mode <> 'crazy' and v_metric[v_i] > v_best) then v_best := v_metric[v_i]; v_winner := v_i; end if;
  end loop;
  v_win := (v_winner = 1); v_net := case when v_win then v_wager * (v_players - 1) else -v_wager end; v_newbal := v_bal + v_net;
  v_m := coalesce((v_stats->>'matches')::int, 0) + 1;
  v_w := coalesce((v_stats->>'wins')::int, 0) + (case when v_win then 1 else 0 end);
  v_l := coalesce((v_stats->>'losses')::int, 0) + (case when v_win then 0 else 1 end);
  v_streak := coalesce((v_stats->>'streak')::int, 0);
  v_streak := case when v_win then (case when v_streak >= 0 then v_streak + 1 else 1 end) else (case when v_streak <= 0 then v_streak - 1 else -1 end) end;
  v_bestStreak := greatest(coalesce((v_stats->>'best')::int, 0), v_streak);
  v_bigWin := greatest(coalesce((v_stats->>'bigWin')::numeric, 0), v_net);
  v_profit := coalesce((v_stats->>'profit')::numeric, 0) + v_net;
  v_stats := jsonb_build_object('matches', v_m, 'wins', v_w, 'losses', v_l, 'profit', v_profit, 'streak', v_streak, 'best', v_bestStreak, 'bigWin', v_bigWin, 'hostNet', coalesce((v_stats->>'hostNet')::numeric, 0));
  update profiles set balance = v_newbal, arena_stats = v_stats, wagered = coalesce(wagered, 0) + v_wager, updated_at = now() where id = v_uid;
  perform public.ops_log_srv(v_uid, 'bet', v_wager, coalesce(p_game,'Slots Battle'), null);          -- 營運帳本：押注
  perform public.ops_log_srv(v_uid, 'win', v_wager + v_net, coalesce(p_game,'Slots Battle'), null);  -- 營運帳本：派彩（輸=0）
  if v_win then perform public.log_big_win(v_uid, coalesce(p_game, 'Slots Battle'), v_wager, v_wager + v_net, 2); end if;
  insert into battle_history (user_id, vs, mode, wager, net, win, payload)
  values (v_uid, (case v_players when 4 then '1v1v1v1' when 3 then '1v1v1' else '1v1' end), v_mode, v_wager, v_net, v_win,
    jsonb_build_object('seats', v_seats, 'winnerIdx', v_winner - 1, 'roster', p_roster, 'game', p_game, 'players', v_players, 'mode', v_mode));
  return jsonb_build_object('seats', v_seats, 'winnerIdx', v_winner - 1, 'win', v_win, 'net', v_net, 'balance', v_newbal, 'stats', v_stats,
    'game', p_game, 'mode', v_mode, 'vs', (case v_players when 4 then '1v1v1v1' when 3 then '1v1v1' else '1v1' end));
exception when others then return jsonb_build_object('error', sqlerrm); end; $$;

-- B-2) slot_spin
create or replace function public.slot_spin(p_bet numeric)
returns jsonb language plpgsql security definer set search_path = public as $$
declare
  v_uid uuid := auth.uid(); v_bal numeric; v_bet numeric := greatest(0, coalesce(p_bet, 0));
  v_base numeric := 0; v_total numeric := 0; v_level int := 0; v_roll numeric; v_i int; v_w numeric;
  v_candle jsonb := '[]'::jsonb; v_cursed jsonb := '[]'::jsonb; v_newbal numeric;
begin
  if v_uid is null then return jsonb_build_object('error','not authenticated'); end if;
  select balance into v_bal from profiles where id = v_uid;
  if v_bal is null then return jsonb_build_object('error','profile not found'); end if;
  if v_bet > v_bal then return jsonb_build_object('error','insufficient balance'); end if;
  v_roll := random();
  if v_roll < 0.45 then v_base := 0;
  elsif v_roll < 0.9 then v_base := floor(random()* (v_bet*3))::numeric;
  else v_base := floor(random()* (v_bet*20))::numeric + v_bet; end if;
  v_total := v_base;
  v_roll := random();
  if v_roll > 0.95 then
    v_level := 5;
    for v_i in 1..8 loop v_w := floor(random()*(v_bet*6))::numeric; v_candle := v_candle || to_jsonb(v_w); v_total := v_total + v_w; end loop;
    for v_i in 1..6 loop v_w := floor(random()*(v_bet*30))::numeric; v_cursed := v_cursed || to_jsonb(v_w); v_total := v_total + v_w; end loop;
  elsif v_roll > 0.73 then
    v_level := 1 + floor(random()*4)::int;
    for v_i in 1..(v_level*2) loop v_w := floor(random()*(v_bet*6))::numeric; v_candle := v_candle || to_jsonb(v_w); v_total := v_total + v_w; end loop;
  end if;
  if v_total > v_bet * 6666 then v_total := v_bet * 6666; end if;
  v_newbal := v_bal - v_bet + v_total;
  update profiles set balance = v_newbal, wagered = coalesce(wagered, 0) + v_bet, updated_at = now() where id = v_uid;
  perform public.ops_log_srv(v_uid, 'bet', v_bet, '暗影儀式 Shadow Ritual', null);
  perform public.ops_log_srv(v_uid, 'win', v_total, '暗影儀式 Shadow Ritual', null);
  perform public.log_big_win(v_uid, '暗影儀式 Shadow Ritual', v_bet, v_total);
  return jsonb_build_object('baseWin', v_base, 'level', v_level, 'candle', v_candle, 'cursed', v_cursed, 'totalWin', v_total, 'balance', v_newbal);
exception when others then return jsonb_build_object('error', sqlerrm); end; $$;

-- B-3) slot_buy
create or replace function public.slot_buy(p_kind text, p_bet numeric)
returns jsonb language plpgsql security definer set search_path = public as $$
declare
  v_uid uuid := auth.uid(); v_bal numeric; v_bet numeric := greatest(0, coalesce(p_bet,0));
  v_cost numeric; v_total numeric := 0; v_i int; v_w numeric; v_candle jsonb := '[]'::jsonb; v_cursed jsonb := '[]'::jsonb; v_newbal numeric;
begin
  if v_uid is null then return jsonb_build_object('error','not authenticated'); end if;
  if p_kind not in ('baphomet','cursed') then return jsonb_build_object('error','bad kind'); end if;
  select balance into v_bal from profiles where id = v_uid;
  if v_bal is null then return jsonb_build_object('error','profile not found'); end if;
  v_cost := case p_kind when 'baphomet' then v_bet*50 else v_bet*100 end;
  if v_cost > v_bal then return jsonb_build_object('error','insufficient balance'); end if;
  if p_kind = 'baphomet' then
    for v_i in 1..6 loop v_w := floor(random()*(v_bet*7))::numeric; v_candle := v_candle || to_jsonb(v_w); v_total := v_total + v_w; end loop;
  else
    for v_i in 1..10 loop v_w := floor(random()*(v_bet*30))::numeric; v_cursed := v_cursed || to_jsonb(v_w); v_total := v_total + v_w; end loop;
  end if;
  if v_total > v_bet * 6666 then v_total := v_bet * 6666; end if;
  v_newbal := v_bal - v_cost + v_total;
  update profiles set balance = v_newbal, wagered = coalesce(wagered, 0) + v_cost, updated_at = now() where id = v_uid;
  perform public.ops_log_srv(v_uid, 'bet', v_cost, '暗影儀式 Shadow Ritual', null);
  perform public.ops_log_srv(v_uid, 'win', v_total, '暗影儀式 Shadow Ritual', null);
  perform public.log_big_win(v_uid, '暗影儀式 Shadow Ritual', v_cost, v_total);
  return jsonb_build_object('kind', p_kind, 'cost', v_cost, 'candle', v_candle, 'cursed', v_cursed, 'totalWin', v_total, 'balance', v_newbal);
exception when others then return jsonb_build_object('error', sqlerrm); end; $$;

-- B-4) bounty_flip
create or replace function public.bounty_flip(p_cost numeric, p_vol text, p_flips int)
returns jsonb language plpgsql security definer set search_path = public as $$
declare
  v_uid uuid := auth.uid(); v_bal numeric; v_cost numeric := greatest(0, coalesce(p_cost,0));
  v_flips int := greatest(1, least(10, coalesce(p_flips,5)));
  v_poolPer numeric; v_prizes numeric[]; v_w numeric[]; v_sw numeric;
  v_prizes_json jsonb := '[]'::jsonb; v_picked jsonb := '[]'::jsonb; v_fwin numeric := 0; v_i int; v_j int; v_tmp numeric; v_newbal numeric;
begin
  if v_uid is null then return jsonb_build_object('error','not authenticated'); end if;
  select balance into v_bal from profiles where id = v_uid;
  if v_bal is null then return jsonb_build_object('error','profile not found'); end if;
  if v_cost > v_bal then return jsonb_build_object('error','insufficient balance'); end if;
  v_poolPer := round(v_cost * 10 / v_flips);
  v_w := case lower(coalesce(p_vol,'mid'))
    when 'high' then array[6,3,1,1,0,0,0,0,0,0]::numeric[]
    when 'low'  then array[2,2,1,1,1,1,1,1,0,0]::numeric[]
    else array[3,2,2,1,1,1,0,0,0,0]::numeric[] end;
  v_sw := 0; for v_i in 1..10 loop v_sw := v_sw + v_w[v_i]; end loop;
  v_prizes := array_fill(0::numeric, array[10]);
  for v_i in 1..10 loop v_prizes[v_i] := round((v_w[v_i]/v_sw) * v_poolPer / 100) * 100; end loop;
  for v_i in reverse 10..2 loop v_j := 1 + floor(random()*v_i)::int; v_tmp := v_prizes[v_i]; v_prizes[v_i] := v_prizes[v_j]; v_prizes[v_j] := v_tmp; end loop;
  for v_i in 1..10 loop
    v_prizes_json := v_prizes_json || to_jsonb(v_prizes[v_i]);
    if v_i <= v_flips then v_picked := v_picked || to_jsonb(v_i - 1); v_fwin := v_fwin + v_prizes[v_i]; end if;
  end loop;
  v_newbal := v_bal - v_cost + v_fwin;
  update profiles set balance = v_newbal, wagered = coalesce(wagered, 0) + v_cost, updated_at = now() where id = v_uid;
  perform public.ops_log_srv(v_uid, 'bet', v_cost, '賞金局 · 翻牌', null);
  perform public.ops_log_srv(v_uid, 'win', v_fwin, '賞金局 · 翻牌', null);
  perform public.log_big_win(v_uid, '賞金局 · 翻牌', v_cost, v_fwin);
  return jsonb_build_object('prizes', v_prizes_json, 'picked', v_picked, 'fWin', v_fwin, 'balance', v_newbal);
exception when others then return jsonb_build_object('error', sqlerrm); end; $$;

-- B-5) bounty_mine（+ 落帳；+ 夾住 p_maxmult 止血：伺服器上限 100×，client 傳巨值無效）
create or replace function public.bounty_mine(p_bet numeric, p_maxmult numeric, p_vol text)
returns jsonb language plpgsql security definer set search_path = public as $$
declare
  v_uid uuid := auth.uid(); v_bal numeric; v_bet numeric := greatest(0, coalesce(p_bet,0));
  v_max numeric := least(greatest(1, coalesce(p_maxmult,10)), 100);  -- 止血：夾住 client 傳入的最大倍數（原信任 client＝可印錢）
  v_bust boolean; v_mult numeric := 0; v_win numeric := 0; v_newbal numeric; v_p numeric;
begin
  if v_uid is null then return jsonb_build_object('error','not authenticated'); end if;
  select balance into v_bal from profiles where id = v_uid;
  if v_bal is null then return jsonb_build_object('error','profile not found'); end if;
  if v_bet > v_bal then return jsonb_build_object('error','insufficient balance'); end if;
  v_p := case lower(coalesce(p_vol,'mid')) when 'high' then 0.5 when 'low' then 0.25 else 0.38 end;
  v_bust := random() < v_p;
  if v_bust then v_win := 0; v_mult := 0;
  else v_mult := round((0.2 + random() * (v_max - 0.2))::numeric, 2); v_win := round(v_bet * v_mult); end if;
  v_newbal := v_bal - v_bet + v_win;
  update profiles set balance = v_newbal, wagered = coalesce(wagered, 0) + v_bet, updated_at = now() where id = v_uid;
  perform public.ops_log_srv(v_uid, 'bet', v_bet, '賞金局 · 踩地雷', null);
  perform public.ops_log_srv(v_uid, 'win', v_win, '賞金局 · 踩地雷', null);
  perform public.log_big_win(v_uid, '賞金局 · 踩地雷', v_bet, v_win);
  return jsonb_build_object('win', v_win, 'mult', v_mult, 'bust', v_bust, 'balance', v_newbal);
exception when others then return jsonb_build_object('error', sqlerrm); end; $$;

-- B-6) chicken_start（押注落帳；win 於 step 自動兌現 / cashout 落帳）
create or replace function public.chicken_start(p_bet numeric, p_diff text)
returns jsonb language plpgsql security definer set search_path = public as $$
declare
  v_uid uuid := auth.uid(); v_bet numeric := floor(greatest(0, coalesce(p_bet, 0)));
  v_diff text := case when p_diff in ('easy','mid','hard','hell') then p_diff else 'mid' end; v_bal numeric; v_newbal numeric;
begin
  if v_uid is null then return jsonb_build_object('error','not authenticated'); end if;
  if v_bet < 10 or v_bet > 1000 then return jsonb_build_object('error','bet 10~1000'); end if;
  select balance into v_bal from profiles where id = v_uid for update;
  if v_bal is null then return jsonb_build_object('error','profile not found'); end if;
  if v_bet > v_bal then return jsonb_build_object('error','insufficient balance'); end if;
  v_newbal := v_bal - v_bet;
  update profiles set balance = v_newbal, wagered = coalesce(wagered, 0) + v_bet, updated_at = now() where id = v_uid;
  perform public.ops_log_srv(v_uid, 'bet', v_bet, '小雞過馬路 Chicken Cross', null);
  insert into chicken_rounds (user_id, bet, diff, step, mult, cum, active, updated_at)
  values (v_uid, v_bet, v_diff, 0, 0, 1, true, now())
  on conflict (user_id) do update set bet = excluded.bet, diff = excluded.diff, step = 0, mult = 0, cum = 1, active = true, updated_at = now();
  return jsonb_build_object('balance', v_newbal, 'diff', v_diff, 'bet', v_bet);
exception when others then return jsonb_build_object('error', sqlerrm); end; $$;

-- B-7) chicken_step（達 5000x 自動兌現時派彩落帳）
create or replace function public.chicken_step()
returns jsonb language plpgsql security definer set search_path = public as $$
declare
  v_uid uuid := auth.uid(); v_r record; v_k int; v_p numeric; v_cum numeric; v_mult numeric; v_win numeric; v_newbal numeric;
begin
  if v_uid is null then return jsonb_build_object('error','not authenticated'); end if;
  select * into v_r from chicken_rounds where user_id = v_uid and active for update;
  if not found then return jsonb_build_object('error','no active round'); end if;
  v_k := v_r.step + 1; v_p := chicken_p(v_r.diff, v_k);
  if random() >= v_p then
    update chicken_rounds set active = false, updated_at = now() where user_id = v_uid;
    return jsonb_build_object('alive', false, 'step', v_k);
  end if;
  v_cum := v_r.cum * v_p; v_mult := floor((0.97 / v_cum) * 100) / 100;
  if v_mult >= 5000 then
    v_mult := 5000; v_win := floor(v_r.bet * v_mult);
    update profiles set balance = balance + v_win, updated_at = now() where id = v_uid returning balance into v_newbal;
    update chicken_rounds set active = false, step = v_k, mult = v_mult, cum = v_cum, updated_at = now() where user_id = v_uid;
    perform public.ops_log_srv(v_uid, 'win', v_win, '小雞過馬路 Chicken Cross', null);
    perform public.log_big_win(v_uid, '小雞過馬路 Chicken Cross', v_r.bet, v_win);
    return jsonb_build_object('alive', true, 'cashed', true, 'step', v_k, 'mult', v_mult, 'win', v_win, 'balance', v_newbal);
  end if;
  update chicken_rounds set step = v_k, mult = v_mult, cum = v_cum, updated_at = now() where user_id = v_uid;
  return jsonb_build_object('alive', true, 'step', v_k, 'mult', v_mult);
exception when others then return jsonb_build_object('error', sqlerrm); end; $$;

-- B-8) chicken_cashout（派彩落帳）
create or replace function public.chicken_cashout()
returns jsonb language plpgsql security definer set search_path = public as $$
declare v_uid uuid := auth.uid(); v_r record; v_win numeric; v_newbal numeric;
begin
  if v_uid is null then return jsonb_build_object('error','not authenticated'); end if;
  select * into v_r from chicken_rounds where user_id = v_uid and active for update;
  if not found then return jsonb_build_object('error','no active round'); end if;
  if v_r.step < 1 then return jsonb_build_object('error','must move first'); end if;
  v_win := floor(v_r.bet * v_r.mult);
  update profiles set balance = balance + v_win, updated_at = now() where id = v_uid returning balance into v_newbal;
  update chicken_rounds set active = false, updated_at = now() where user_id = v_uid;
  perform public.ops_log_srv(v_uid, 'win', v_win, '小雞過馬路 Chicken Cross', null);
  perform public.log_big_win(v_uid, '小雞過馬路 Chicken Cross', v_r.bet, v_win);
  return jsonb_build_object('win', v_win, 'mult', v_r.mult, 'balance', v_newbal);
exception when others then return jsonb_build_object('error', sqlerrm); end; $$;

-- ---------- C) wallet_txns 觸發器：儲值/提款自動落帳（不改 wallet_txn 函式）----------
create or replace function public.ops_on_wallet_txn()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  perform public.ops_log_srv(new.user_id, new.kind, new.amount, null, null); -- kind ∈ deposit|withdraw
  return new;
exception when others then return new;
end; $$;
drop trigger if exists ops_wallet_txn_ins on public.wallet_txns;
create trigger ops_wallet_txn_ins after insert on public.wallet_txns for each row execute procedure public.ops_on_wallet_txn();

-- ---------- D) ops_log 公開 RPC：客端鏡射「送幣」事件（前端 HL.ledger 呼叫）----------
-- 只允許非權威型別（防客端偽造流水/儲值）；bet/win/deposit/withdraw 一律由伺服器權威產生。
create or replace function public.ops_log(p_type text, p_amount numeric, p_source text default null, p_game text default null)
returns void language plpgsql security definer set search_path = public as $$
declare v_uid uuid := auth.uid();
begin
  if v_uid is null then return; end if;
  if p_type not in ('bonus','faucet','jp_seed','jp_hit') then return; end if; -- 擋權威型別
  if p_amount is null or p_amount <= 0 then return; end if;
  insert into public.ops_events (uid, type, amount, game, source, src)
  values (v_uid, p_type, round(p_amount), p_game, p_source, 'client');
exception when others then null;
end; $$;
grant execute on function public.ops_log(text, numeric, text, text) to authenticated;

-- ---------- E) 管理員 + 全站彙總 ----------
create table if not exists public.ops_admins (
  uid uuid primary key references auth.users on delete cascade,
  added_at timestamptz default now()
);
alter table public.ops_admins enable row level security; -- 不開 policy：只有 definer 函式（is_ops_admin）讀

create or replace function public.is_ops_admin()
returns boolean language sql security definer set search_path = public stable as $$
  select exists(select 1 from public.ops_admins where uid = auth.uid());
$$;
grant execute on function public.is_ops_admin() to authenticated;

-- 全站彙總（admin 閘）：回傳與前端 HL.ledger.derived()/byGame()/bySource() 同形狀
create or replace function public.ops_summary()
returns jsonb language plpgsql security definer set search_path = public as $$
declare
  v_turnover numeric; v_payout numeric; v_deposit numeric; v_withdraw numeric;
  v_bonus numeric; v_faucet numeric; v_jpseed numeric; v_jphit numeric;
  v_betcnt bigint; v_wincnt bigint; v_players bigint; v_coins numeric;
  v_ggr numeric; v_promo numeric; v_ngr numeric;
  v_bygame jsonb; v_bysource jsonb;
begin
  if not public.is_ops_admin() then return jsonb_build_object('error','forbidden'); end if;
  select
    coalesce(sum(amount) filter (where type='bet'),0),      coalesce(sum(amount) filter (where type='win'),0),
    coalesce(sum(amount) filter (where type='deposit'),0),  coalesce(sum(amount) filter (where type='withdraw'),0),
    coalesce(sum(amount) filter (where type='bonus'),0),    coalesce(sum(amount) filter (where type='faucet'),0),
    coalesce(sum(amount) filter (where type='jp_seed'),0),  coalesce(sum(amount) filter (where type='jp_hit'),0),
    coalesce(count(*) filter (where type='bet'),0),         coalesce(count(*) filter (where type='win'),0),
    coalesce(count(distinct uid),0)
  into v_turnover, v_payout, v_deposit, v_withdraw, v_bonus, v_faucet, v_jpseed, v_jphit, v_betcnt, v_wincnt, v_players
  from public.ops_events;
  select coalesce(sum(balance),0) into v_coins from public.profiles;
  v_ggr := v_turnover - v_payout; v_promo := v_bonus + v_faucet; v_ngr := v_ggr - v_promo;
  select coalesce(jsonb_agg(g order by (g->>'bet')::numeric desc), '[]'::jsonb) into v_bygame from (
    select jsonb_build_object('game', game, 'bet', b, 'win', w, 'plays', plays, 'ggr', b - w, 'rtp', case when b>0 then w/b else 0 end) as g
    from (
      select coalesce(game,'—') as game,
        coalesce(sum(amount) filter (where type='bet'),0) as b,
        coalesce(sum(amount) filter (where type='win'),0) as w,
        coalesce(count(*) filter (where type='bet'),0) as plays
      from public.ops_events where type in ('bet','win') group by coalesce(game,'—')
    ) t
  ) gg;
  select coalesce(jsonb_agg(s order by (s->>'amount')::numeric desc), '[]'::jsonb) into v_bysource from (
    select jsonb_build_object('source', src2, 'amount', amt) as s from (
      select coalesce(source, case when type='faucet' then '救濟金 Faucet' else '其他紅利' end) as src2, sum(amount) as amt
      from public.ops_events where type in ('bonus','faucet') group by 1
    ) t
  ) ss;
  return jsonb_build_object(
    'scope','site',
    'turnover', v_turnover, 'payout', v_payout, 'ggr', v_ggr,
    'rtp', case when v_turnover>0 then v_payout/v_turnover else 0 end,
    'bonus', v_bonus, 'faucet', v_faucet, 'promo', v_promo, 'ngr', v_ngr,
    'deposit', v_deposit, 'withdraw', v_withdraw, 'cashNet', v_deposit - v_withdraw,
    'jpSeed', v_jpseed, 'jpHit', v_jphit, 'jpNet', v_jpseed - v_jphit,
    'coins', v_coins, 'players', v_players, 'betCount', v_betcnt, 'winCount', v_wincnt,
    'byGame', v_bygame, 'bySource', v_bysource
  );
exception when others then return jsonb_build_object('error', sqlerrm); end; $$;
grant execute on function public.ops_summary() to authenticated;

-- 完成。① 已部署 ② 記得把自己加進 ops_admins（見檔頭步驟 3）③ 前端儀表板「全站(雲端)」即會顯示合併數字。
