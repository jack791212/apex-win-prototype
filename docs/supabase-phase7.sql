-- =====================================================================
-- Apex Win｜Phase 7：伺服器端真/假站資料分離（site-mode-aware）
--
-- ★ 部署步驟（照做，不要覆蓋舊分頁）：
--   1. Supabase Dashboard → SQL Editor → 開【新查詢分頁】（保留 setup/phase4/4b/5/6 舊分頁不動）
--   2. 全部貼上 → Run（冪等；含既有 demo 資料一次性遷移）
--
-- 站別參數一律用 p_site（'demo' | 'live'），與 play_battle 既有的「遊戲模式 p_mode」不衝突。
-- 前端 rpc() 會對所有呼叫自動注入 p_site = HL.site.mode()，故所有經此呼叫的函式都需有 p_site 參數
-- （部分函式如 chicken_step/cashout/ops_summary 收下但不使用）。舊客端不帶 p_site → 落 'demo'（相容）。
-- balance 為 server 權威：live 列從 0 起 → 真站要玩先「儲值(假金流)」，正是營運健檢的收支閉環。
-- =====================================================================

-- ---------- A) member_econ：每 (uid, mode) 一列 ----------
create table if not exists public.member_econ (
  uid uuid not null references auth.users on delete cascade,
  mode text not null default 'demo',
  balance numeric not null default 0,
  wagered numeric not null default 0,
  arena_stats jsonb not null default '{"matches":0,"wins":0,"losses":0,"profit":0,"streak":0,"best":0,"bigWin":0,"hostNet":0}'::jsonb,
  updated_at timestamptz default now(),
  primary key (uid, mode)
);
alter table public.member_econ enable row level security;
drop policy if exists "own_econ_select" on public.member_econ;
create policy "own_econ_select" on public.member_econ for select using (auth.uid() = uid);
-- 不開 insert/update policy：只有下方 security definer 函式能寫

-- 正規化站別字串
create or replace function public.site_norm(p_site text)
returns text language sql immutable as $$ select case when p_site = 'live' then 'live' else 'demo' end; $$;

-- get-or-create：demo→28560、live→0（要玩先儲值）
create or replace function public.ensure_econ(p_uid uuid, p_site text)
returns void language plpgsql security definer set search_path = public as $$
begin
  insert into public.member_econ (uid, mode, balance, wagered)
  values (p_uid, public.site_norm(p_site), case when public.site_norm(p_site) = 'live' then 0 else 28560 end, 0)
  on conflict (uid, mode) do nothing;
end; $$;

-- 一次性遷移：既有 profiles 的經濟 → member_econ 的 'demo' 列（不覆蓋既有）
insert into public.member_econ (uid, mode, balance, wagered, arena_stats)
select id, 'demo', balance, coalesce(wagered, 0), arena_stats from public.profiles
on conflict (uid, mode) do nothing;

-- ---------- B) 事件表加 mode 維度 ----------
alter table public.big_wins       add column if not exists mode text not null default 'demo';
alter table public.wallet_txns    add column if not exists mode text not null default 'demo';
alter table public.battle_history add column if not exists mode text not null default 'demo';
alter table public.ops_events     add column if not exists mode text not null default 'demo';
alter table public.chicken_rounds add column if not exists mode text not null default 'demo';
create index if not exists ops_events_mode on public.ops_events (mode);
create index if not exists big_wins_mode on public.big_wins (mode, created_at desc);

-- ---------- B2) 先移除舊簽名（加了 p_site 會變「多載」而非取代，須先 drop 舊版避免殘留寫回 profiles）----------
drop function if exists public.log_big_win(uuid, text, numeric, numeric, numeric);
drop function if exists public.ops_log_srv(uuid, text, numeric, text, text);
drop function if exists public.ops_log(text, numeric, text, text);
drop function if exists public.play_battle(numeric, int, text, int, jsonb, text);
drop function if exists public.slot_spin(numeric);
drop function if exists public.slot_buy(text, numeric);
drop function if exists public.bounty_flip(numeric, text, int);
drop function if exists public.bounty_mine(numeric, numeric, text);
drop function if exists public.wallet_txn(numeric, text);
drop function if exists public.chicken_start(numeric, text);
drop function if exists public.chicken_step();
drop function if exists public.chicken_cashout();
drop function if exists public.feed_recent_wins(int);
drop function if exists public.feed_leaderboard(int);
drop function if exists public.ops_summary();

-- ---------- C) log_big_win / ops_log_srv / ops_log 收 mode ----------
create or replace function public.log_big_win(p_uid uuid, p_game text, p_bet numeric, p_win numeric, p_minmult numeric default 5, p_mode text default 'demo')
returns void language plpgsql security definer set search_path = public as $$
declare v_name text;
begin
  if p_win is null or p_bet is null or p_bet <= 0 then return; end if;
  if p_win < 500 or p_win < p_bet * p_minmult then return; end if;
  select coalesce(left(display_name, 4), '玩家') || '***' into v_name from profiles where id = p_uid;
  insert into big_wins (user_id, name, game, bet, win, mult, mode)
  values (p_uid, coalesce(v_name, '玩家***'), p_game, p_bet, p_win, round(p_win / p_bet, 2), public.site_norm(p_mode));
exception when others then null;
end; $$;

create or replace function public.ops_log_srv(p_uid uuid, p_type text, p_amount numeric, p_game text, p_source text, p_mode text default 'demo')
returns void language plpgsql security definer set search_path = public as $$
begin
  if p_amount is null or p_amount <= 0 then return; end if;
  insert into public.ops_events (uid, type, amount, game, source, src, mode)
  values (p_uid, p_type, round(p_amount), p_game, p_source, 'srv', public.site_norm(p_mode));
exception when others then null;
end; $$;

-- 客端送幣鏡射（只收非權威型別；加 p_site）
create or replace function public.ops_log(p_type text, p_amount numeric, p_source text default null, p_game text default null, p_site text default 'demo')
returns void language plpgsql security definer set search_path = public as $$
declare v_uid uuid := auth.uid();
begin
  if v_uid is null then return; end if;
  if p_type not in ('bonus','faucet','jp_seed','jp_hit') then return; end if;
  if p_amount is null or p_amount <= 0 then return; end if;
  insert into public.ops_events (uid, type, amount, game, source, src, mode)
  values (v_uid, p_type, round(p_amount), p_game, p_source, 'client', public.site_norm(p_site));
exception when others then null;
end; $$;
grant execute on function public.ops_log(text, numeric, text, text, text) to authenticated;

-- ---------- D) 結算 RPC：加 p_site、改讀寫 member_econ、事件標 mode ----------

-- D-1) play_battle（保留遊戲模式 p_mode；新增站別 p_site）
create or replace function public.play_battle(
  p_wager numeric, p_players int, p_mode text, p_rounds int,
  p_roster jsonb default '[]'::jsonb, p_game text default 'Slots Battle', p_site text default 'demo'
) returns jsonb language plpgsql security definer set search_path = public as $$
declare
  v_uid uuid := auth.uid(); v_site text := public.site_norm(p_site);
  v_bal numeric; v_stats jsonb;
  v_players int := greatest(2, least(4, coalesce(p_players, 2)));
  v_rounds int := greatest(1, least(10, coalesce(p_rounds, 1)));
  v_gmode text := coalesce(p_mode, 'normal'); v_wager numeric := greatest(0, coalesce(p_wager, 0));
  v_total numeric[]; v_lastDelta numeric[]; v_seats jsonb := '[]'::jsonb; v_metric numeric[]; v_winner int := 0;
  v_i int; v_r int; v_run numeric; v_round numeric; v_best numeric;
  v_win boolean; v_net numeric; v_newbal numeric;
  v_m int; v_w int; v_l int; v_streak int; v_bestStreak int; v_bigWin numeric; v_profit numeric; v_rounds_json jsonb;
begin
  if v_uid is null then return jsonb_build_object('error', 'not authenticated'); end if;
  perform public.ensure_econ(v_uid, v_site);
  select balance, arena_stats into v_bal, v_stats from member_econ where uid = v_uid and mode = v_site;
  if v_bal is null then return jsonb_build_object('error', 'econ not found'); end if;
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
    v_total[v_i] := v_run; v_metric[v_i] := case when v_gmode = 'terminal' then v_lastDelta[v_i] else v_run end;
    v_seats := v_seats || jsonb_build_object('idx', v_i - 1, 'total', v_run, 'rounds', v_rounds_json);
  end loop;
  v_winner := 1; v_best := v_metric[1];
  for v_i in 2..v_players loop
    if (v_gmode = 'crazy' and v_metric[v_i] < v_best) or (v_gmode <> 'crazy' and v_metric[v_i] > v_best) then v_best := v_metric[v_i]; v_winner := v_i; end if;
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
  update member_econ set balance = v_newbal, arena_stats = v_stats, wagered = coalesce(wagered, 0) + v_wager, updated_at = now() where uid = v_uid and mode = v_site;
  perform public.ops_log_srv(v_uid, 'bet', v_wager, coalesce(p_game,'Slots Battle'), null, v_site);
  perform public.ops_log_srv(v_uid, 'win', v_wager + v_net, coalesce(p_game,'Slots Battle'), null, v_site);
  if v_win then perform public.log_big_win(v_uid, coalesce(p_game, 'Slots Battle'), v_wager, v_wager + v_net, 2, v_site); end if;
  insert into battle_history (user_id, vs, mode, wager, net, win, payload)
  values (v_uid, (case v_players when 4 then '1v1v1v1' when 3 then '1v1v1' else '1v1' end), v_site, v_wager, v_net, v_win,
    jsonb_build_object('seats', v_seats, 'winnerIdx', v_winner - 1, 'roster', p_roster, 'game', p_game, 'players', v_players, 'mode', v_gmode));
  return jsonb_build_object('seats', v_seats, 'winnerIdx', v_winner - 1, 'win', v_win, 'net', v_net, 'balance', v_newbal, 'stats', v_stats,
    'game', p_game, 'mode', v_gmode, 'vs', (case v_players when 4 then '1v1v1v1' when 3 then '1v1v1' else '1v1' end));
exception when others then return jsonb_build_object('error', sqlerrm); end; $$;

-- D-2) slot_spin
create or replace function public.slot_spin(p_bet numeric, p_site text default 'demo')
returns jsonb language plpgsql security definer set search_path = public as $$
declare
  v_uid uuid := auth.uid(); v_site text := public.site_norm(p_site);
  v_bal numeric; v_bet numeric := greatest(0, coalesce(p_bet, 0));
  v_base numeric := 0; v_total numeric := 0; v_level int := 0; v_roll numeric; v_i int; v_w numeric;
  v_candle jsonb := '[]'::jsonb; v_cursed jsonb := '[]'::jsonb; v_newbal numeric;
begin
  if v_uid is null then return jsonb_build_object('error','not authenticated'); end if;
  perform public.ensure_econ(v_uid, v_site);
  select balance into v_bal from member_econ where uid = v_uid and mode = v_site;
  if v_bal is null then return jsonb_build_object('error','econ not found'); end if;
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
  if v_site = 'live' then v_total := round(v_total * 0.90); end if; -- 真站莊家利潤上限（同前端 SLOT_LIVE_SCALE）
  if v_total > v_bet * 6666 then v_total := v_bet * 6666; end if;
  v_newbal := v_bal - v_bet + v_total;
  update member_econ set balance = v_newbal, wagered = coalesce(wagered, 0) + v_bet, updated_at = now() where uid = v_uid and mode = v_site;
  perform public.ops_log_srv(v_uid, 'bet', v_bet, '暗影儀式 Shadow Ritual', null, v_site);
  perform public.ops_log_srv(v_uid, 'win', v_total, '暗影儀式 Shadow Ritual', null, v_site);
  perform public.log_big_win(v_uid, '暗影儀式 Shadow Ritual', v_bet, v_total, 5, v_site);
  return jsonb_build_object('baseWin', v_base, 'level', v_level, 'candle', v_candle, 'cursed', v_cursed, 'totalWin', v_total, 'balance', v_newbal);
exception when others then return jsonb_build_object('error', sqlerrm); end; $$;

-- D-3) slot_buy
create or replace function public.slot_buy(p_kind text, p_bet numeric, p_site text default 'demo')
returns jsonb language plpgsql security definer set search_path = public as $$
declare
  v_uid uuid := auth.uid(); v_site text := public.site_norm(p_site);
  v_bal numeric; v_bet numeric := greatest(0, coalesce(p_bet,0));
  v_cost numeric; v_total numeric := 0; v_i int; v_w numeric; v_candle jsonb := '[]'::jsonb; v_cursed jsonb := '[]'::jsonb; v_newbal numeric;
begin
  if v_uid is null then return jsonb_build_object('error','not authenticated'); end if;
  if p_kind not in ('baphomet','cursed') then return jsonb_build_object('error','bad kind'); end if;
  perform public.ensure_econ(v_uid, v_site);
  select balance into v_bal from member_econ where uid = v_uid and mode = v_site;
  if v_bal is null then return jsonb_build_object('error','econ not found'); end if;
  v_cost := case p_kind when 'baphomet' then v_bet*50 else v_bet*100 end;
  if v_cost > v_bal then return jsonb_build_object('error','insufficient balance'); end if;
  if p_kind = 'baphomet' then
    for v_i in 1..6 loop v_w := floor(random()*(v_bet*7))::numeric; v_candle := v_candle || to_jsonb(v_w); v_total := v_total + v_w; end loop;
  else
    for v_i in 1..10 loop v_w := floor(random()*(v_bet*30))::numeric; v_cursed := v_cursed || to_jsonb(v_w); v_total := v_total + v_w; end loop;
  end if;
  if v_site = 'live' then v_total := round(v_total * 0.90); end if;
  if v_total > v_bet * 6666 then v_total := v_bet * 6666; end if;
  v_newbal := v_bal - v_cost + v_total;
  update member_econ set balance = v_newbal, wagered = coalesce(wagered, 0) + v_cost, updated_at = now() where uid = v_uid and mode = v_site;
  perform public.ops_log_srv(v_uid, 'bet', v_cost, '暗影儀式 Shadow Ritual', null, v_site);
  perform public.ops_log_srv(v_uid, 'win', v_total, '暗影儀式 Shadow Ritual', null, v_site);
  perform public.log_big_win(v_uid, '暗影儀式 Shadow Ritual', v_cost, v_total, 5, v_site);
  return jsonb_build_object('kind', p_kind, 'cost', v_cost, 'candle', v_candle, 'cursed', v_cursed, 'totalWin', v_total, 'balance', v_newbal);
exception when others then return jsonb_build_object('error', sqlerrm); end; $$;

-- D-4) bounty_flip
create or replace function public.bounty_flip(p_cost numeric, p_vol text, p_flips int, p_site text default 'demo')
returns jsonb language plpgsql security definer set search_path = public as $$
declare
  v_uid uuid := auth.uid(); v_site text := public.site_norm(p_site);
  v_bal numeric; v_cost numeric := greatest(0, coalesce(p_cost,0));
  v_flips int := greatest(1, least(10, coalesce(p_flips,5)));
  v_poolPer numeric; v_prizes numeric[]; v_w numeric[]; v_sw numeric;
  v_prizes_json jsonb := '[]'::jsonb; v_picked jsonb := '[]'::jsonb; v_fwin numeric := 0; v_i int; v_j int; v_tmp numeric; v_newbal numeric;
begin
  if v_uid is null then return jsonb_build_object('error','not authenticated'); end if;
  perform public.ensure_econ(v_uid, v_site);
  select balance into v_bal from member_econ where uid = v_uid and mode = v_site;
  if v_bal is null then return jsonb_build_object('error','econ not found'); end if;
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
  update member_econ set balance = v_newbal, wagered = coalesce(wagered, 0) + v_cost, updated_at = now() where uid = v_uid and mode = v_site;
  perform public.ops_log_srv(v_uid, 'bet', v_cost, '賞金局 · 翻牌', null, v_site);
  perform public.ops_log_srv(v_uid, 'win', v_fwin, '賞金局 · 翻牌', null, v_site);
  perform public.log_big_win(v_uid, '賞金局 · 翻牌', v_cost, v_fwin, 5, v_site);
  return jsonb_build_object('prizes', v_prizes_json, 'picked', v_picked, 'fWin', v_fwin, 'balance', v_newbal);
exception when others then return jsonb_build_object('error', sqlerrm); end; $$;

-- D-5) bounty_mine（夾 p_maxmult ≤ 100× 止血）
create or replace function public.bounty_mine(p_bet numeric, p_maxmult numeric, p_vol text, p_site text default 'demo')
returns jsonb language plpgsql security definer set search_path = public as $$
declare
  v_uid uuid := auth.uid(); v_site text := public.site_norm(p_site);
  v_bal numeric; v_bet numeric := greatest(0, coalesce(p_bet,0));
  v_max numeric := least(greatest(1, coalesce(p_maxmult,10)), 100);
  v_bust boolean; v_mult numeric := 0; v_win numeric := 0; v_newbal numeric; v_p numeric;
begin
  if v_uid is null then return jsonb_build_object('error','not authenticated'); end if;
  perform public.ensure_econ(v_uid, v_site);
  select balance into v_bal from member_econ where uid = v_uid and mode = v_site;
  if v_bal is null then return jsonb_build_object('error','econ not found'); end if;
  if v_bet > v_bal then return jsonb_build_object('error','insufficient balance'); end if;
  v_p := case lower(coalesce(p_vol,'mid')) when 'high' then 0.5 when 'low' then 0.25 else 0.38 end;
  v_bust := random() < v_p;
  if v_bust then v_win := 0; v_mult := 0;
  else v_mult := round((0.2 + random() * (v_max - 0.2))::numeric, 2); v_win := round(v_bet * v_mult); end if;
  v_newbal := v_bal - v_bet + v_win;
  update member_econ set balance = v_newbal, wagered = coalesce(wagered, 0) + v_bet, updated_at = now() where uid = v_uid and mode = v_site;
  perform public.ops_log_srv(v_uid, 'bet', v_bet, '賞金局 · 踩地雷', null, v_site);
  perform public.ops_log_srv(v_uid, 'win', v_win, '賞金局 · 踩地雷', null, v_site);
  perform public.log_big_win(v_uid, '賞金局 · 踩地雷', v_bet, v_win, 5, v_site);
  return jsonb_build_object('win', v_win, 'mult', v_mult, 'bust', v_bust, 'balance', v_newbal);
exception when others then return jsonb_build_object('error', sqlerrm); end; $$;

-- D-6) wallet_txn（儲值/提款；member_econ + wallet_txns 標 mode；現金流由觸發器落帳）
create or replace function public.wallet_txn(p_amount numeric, p_kind text, p_site text default 'demo')
returns jsonb language plpgsql security definer set search_path = public as $$
declare
  v_uid uuid := auth.uid(); v_site text := public.site_norm(p_site);
  v_amt numeric := floor(coalesce(p_amount, 0)); v_bal numeric; v_newbal numeric;
begin
  if v_uid is null then return jsonb_build_object('error','not authenticated'); end if;
  if p_kind not in ('deposit','withdraw') then return jsonb_build_object('error','bad kind'); end if;
  if v_amt < 100 then return jsonb_build_object('error','min 100'); end if;
  if v_amt > 1000000 then return jsonb_build_object('error','max 1,000,000'); end if;
  perform public.ensure_econ(v_uid, v_site);
  select balance into v_bal from member_econ where uid = v_uid and mode = v_site for update;
  if v_bal is null then return jsonb_build_object('error','econ not found'); end if;
  if p_kind = 'withdraw' and v_amt > v_bal then return jsonb_build_object('error','insufficient balance'); end if;
  v_newbal := case p_kind when 'deposit' then v_bal + v_amt else v_bal - v_amt end;
  update member_econ set balance = v_newbal, updated_at = now() where uid = v_uid and mode = v_site;
  insert into wallet_txns (user_id, kind, amount, balance_after, mode) values (v_uid, p_kind, v_amt, v_newbal, v_site);
  return jsonb_build_object('balance', v_newbal, 'kind', p_kind, 'amount', v_amt);
exception when others then return jsonb_build_object('error', sqlerrm); end; $$;

-- wallet_txns 觸發器：帶該列 mode 落帳（取代 phase6 版）
create or replace function public.ops_on_wallet_txn()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  perform public.ops_log_srv(new.user_id, new.kind, new.amount, null, null, coalesce(new.mode, 'demo'));
  return new;
exception when others then return new;
end; $$;
drop trigger if exists ops_wallet_txn_ins on public.wallet_txns;
create trigger ops_wallet_txn_ins after insert on public.wallet_txns for each row execute procedure public.ops_on_wallet_txn();

-- D-7) chicken_start（回合列標 mode）/ step / cashout（econ 依回合 mode；p_site 收下不用，供 rpc 統一注入）
create or replace function public.chicken_start(p_bet numeric, p_diff text, p_site text default 'demo')
returns jsonb language plpgsql security definer set search_path = public as $$
declare
  v_uid uuid := auth.uid(); v_site text := public.site_norm(p_site);
  v_bet numeric := floor(greatest(0, coalesce(p_bet, 0)));
  v_diff text := case when p_diff in ('easy','mid','hard','hell') then p_diff else 'mid' end; v_bal numeric; v_newbal numeric;
begin
  if v_uid is null then return jsonb_build_object('error','not authenticated'); end if;
  if v_bet < 10 or v_bet > 1000 then return jsonb_build_object('error','bet 10~1000'); end if;
  perform public.ensure_econ(v_uid, v_site);
  select balance into v_bal from member_econ where uid = v_uid and mode = v_site for update;
  if v_bal is null then return jsonb_build_object('error','econ not found'); end if;
  if v_bet > v_bal then return jsonb_build_object('error','insufficient balance'); end if;
  v_newbal := v_bal - v_bet;
  update member_econ set balance = v_newbal, wagered = coalesce(wagered, 0) + v_bet, updated_at = now() where uid = v_uid and mode = v_site;
  perform public.ops_log_srv(v_uid, 'bet', v_bet, '小雞過馬路 Chicken Cross', null, v_site);
  insert into chicken_rounds (user_id, bet, diff, step, mult, cum, active, mode, updated_at)
  values (v_uid, v_bet, v_diff, 0, 0, 1, true, v_site, now())
  on conflict (user_id) do update set bet = excluded.bet, diff = excluded.diff, step = 0, mult = 0, cum = 1, active = true, mode = excluded.mode, updated_at = now();
  return jsonb_build_object('balance', v_newbal, 'diff', v_diff, 'bet', v_bet);
exception when others then return jsonb_build_object('error', sqlerrm); end; $$;

create or replace function public.chicken_step(p_site text default 'demo')
returns jsonb language plpgsql security definer set search_path = public as $$
declare
  v_uid uuid := auth.uid(); v_r record; v_k int; v_p numeric; v_cum numeric; v_mult numeric; v_win numeric; v_newbal numeric; v_mode text;
begin
  if v_uid is null then return jsonb_build_object('error','not authenticated'); end if;
  select * into v_r from chicken_rounds where user_id = v_uid and active for update;
  if not found then return jsonb_build_object('error','no active round'); end if;
  v_mode := coalesce(v_r.mode, 'demo');
  v_k := v_r.step + 1; v_p := chicken_p(v_r.diff, v_k);
  if random() >= v_p then
    update chicken_rounds set active = false, updated_at = now() where user_id = v_uid;
    return jsonb_build_object('alive', false, 'step', v_k);
  end if;
  v_cum := v_r.cum * v_p; v_mult := floor((0.97 / v_cum) * 100) / 100;
  if v_mult >= 5000 then
    v_mult := 5000; v_win := floor(v_r.bet * v_mult);
    update member_econ set balance = balance + v_win, updated_at = now() where uid = v_uid and mode = v_mode returning balance into v_newbal;
    update chicken_rounds set active = false, step = v_k, mult = v_mult, cum = v_cum, updated_at = now() where user_id = v_uid;
    perform public.ops_log_srv(v_uid, 'win', v_win, '小雞過馬路 Chicken Cross', null, v_mode);
    perform public.log_big_win(v_uid, '小雞過馬路 Chicken Cross', v_r.bet, v_win, 5, v_mode);
    return jsonb_build_object('alive', true, 'cashed', true, 'step', v_k, 'mult', v_mult, 'win', v_win, 'balance', v_newbal);
  end if;
  update chicken_rounds set step = v_k, mult = v_mult, cum = v_cum, updated_at = now() where user_id = v_uid;
  return jsonb_build_object('alive', true, 'step', v_k, 'mult', v_mult);
exception when others then return jsonb_build_object('error', sqlerrm); end; $$;

create or replace function public.chicken_cashout(p_site text default 'demo')
returns jsonb language plpgsql security definer set search_path = public as $$
declare v_uid uuid := auth.uid(); v_r record; v_win numeric; v_newbal numeric; v_mode text;
begin
  if v_uid is null then return jsonb_build_object('error','not authenticated'); end if;
  select * into v_r from chicken_rounds where user_id = v_uid and active for update;
  if not found then return jsonb_build_object('error','no active round'); end if;
  if v_r.step < 1 then return jsonb_build_object('error','must move first'); end if;
  v_mode := coalesce(v_r.mode, 'demo');
  v_win := floor(v_r.bet * v_r.mult);
  update member_econ set balance = balance + v_win, updated_at = now() where uid = v_uid and mode = v_mode returning balance into v_newbal;
  update chicken_rounds set active = false, updated_at = now() where user_id = v_uid;
  perform public.ops_log_srv(v_uid, 'win', v_win, '小雞過馬路 Chicken Cross', null, v_mode);
  perform public.log_big_win(v_uid, '小雞過馬路 Chicken Cross', v_r.bet, v_win, 5, v_mode);
  return jsonb_build_object('win', v_win, 'mult', v_r.mult, 'balance', v_newbal);
exception when others then return jsonb_build_object('error', sqlerrm); end; $$;

-- ---------- E) load_econ + feeds(依 mode) + ops_summary(只算 live) ----------
create or replace function public.load_econ(p_site text default 'demo')
returns jsonb language plpgsql security definer set search_path = public as $$
declare v_uid uuid := auth.uid(); v_site text := public.site_norm(p_site); v_bal numeric; v_wag numeric; v_stats jsonb;
begin
  if v_uid is null then return jsonb_build_object('error','not authenticated'); end if;
  perform public.ensure_econ(v_uid, v_site);
  select balance, wagered, arena_stats into v_bal, v_wag, v_stats from member_econ where uid = v_uid and mode = v_site;
  return jsonb_build_object('balance', v_bal, 'wagered', v_wag, 'arena_stats', v_stats, 'mode', v_site);
exception when others then return jsonb_build_object('error', sqlerrm); end; $$;
grant execute on function public.load_econ(text) to authenticated;

create or replace function public.feed_recent_wins(p_limit int default 30, p_site text default 'demo')
returns jsonb language sql security definer set search_path = public as $$
  select coalesce(jsonb_agg(t), '[]'::jsonb) from (
    select name, game, bet, win, mult, created_at from big_wins
    where mode = public.site_norm(p_site)
    order by created_at desc limit greatest(1, least(100, coalesce(p_limit, 30)))
  ) t;
$$;

create or replace function public.feed_leaderboard(p_limit int default 8, p_site text default 'demo')
returns jsonb language sql security definer set search_path = public as $$
  select coalesce(jsonb_agg(t), '[]'::jsonb) from (
    select coalesce(left(p.display_name, 4), '玩家') || '***' as name, p.avatar, coalesce(e.wagered, 0) as wagered
    from member_econ e join profiles p on p.id = e.uid
    where e.mode = public.site_norm(p_site) and coalesce(e.wagered, 0) > 0
    order by e.wagered desc limit greatest(1, least(50, coalesce(p_limit, 8)))
  ) t;
$$;

-- 全站彙總：固定只算 live（營運健檢＝真站）。p_site 收下不用，供 rpc 統一注入。
create or replace function public.ops_summary(p_site text default 'live')
returns jsonb language plpgsql security definer set search_path = public as $$
declare
  v_turnover numeric; v_payout numeric; v_deposit numeric; v_withdraw numeric;
  v_bonus numeric; v_faucet numeric; v_jpseed numeric; v_jphit numeric;
  v_betcnt bigint; v_wincnt bigint; v_players bigint; v_coins numeric;
  v_ggr numeric; v_promo numeric; v_ngr numeric; v_bygame jsonb; v_bysource jsonb;
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
  from public.ops_events where mode = 'live';
  select coalesce(sum(balance),0) into v_coins from public.member_econ where mode = 'live';
  v_ggr := v_turnover - v_payout; v_promo := v_bonus + v_faucet; v_ngr := v_ggr - v_promo;
  select coalesce(jsonb_agg(g order by (g->>'bet')::numeric desc), '[]'::jsonb) into v_bygame from (
    select jsonb_build_object('game', game, 'bet', b, 'win', w, 'plays', plays, 'ggr', b - w, 'rtp', case when b>0 then w/b else 0 end) as g
    from (
      select coalesce(game,'—') as game,
        coalesce(sum(amount) filter (where type='bet'),0) as b,
        coalesce(sum(amount) filter (where type='win'),0) as w,
        coalesce(count(*) filter (where type='bet'),0) as plays
      from public.ops_events where mode='live' and type in ('bet','win') group by coalesce(game,'—')
    ) t
  ) gg;
  select coalesce(jsonb_agg(s order by (s->>'amount')::numeric desc), '[]'::jsonb) into v_bysource from (
    select jsonb_build_object('source', src2, 'amount', amt) as s from (
      select coalesce(source, case when type='faucet' then '救濟金 Faucet' else '其他紅利' end) as src2, sum(amount) as amt
      from public.ops_events where mode='live' and type in ('bonus','faucet') group by 1
    ) t
  ) ss;
  return jsonb_build_object('scope','site-live',
    'turnover', v_turnover, 'payout', v_payout, 'ggr', v_ggr, 'rtp', case when v_turnover>0 then v_payout/v_turnover else 0 end,
    'bonus', v_bonus, 'faucet', v_faucet, 'promo', v_promo, 'ngr', v_ngr,
    'deposit', v_deposit, 'withdraw', v_withdraw, 'cashNet', v_deposit - v_withdraw,
    'jpSeed', v_jpseed, 'jpHit', v_jphit, 'jpNet', v_jpseed - v_jphit,
    'coins', v_coins, 'players', v_players, 'betCount', v_betcnt, 'winCount', v_wincnt,
    'byGame', v_bygame, 'bySource', v_bysource);
exception when others then return jsonb_build_object('error', sqlerrm); end; $$;
grant execute on function public.ops_summary(text) to authenticated;

-- 完成。前端 rpc() 自動帶 p_site = HL.site.mode()；hydrate 改讀 load_econ(p_site)。舊客端不帶 p_site → demo（相容）。
