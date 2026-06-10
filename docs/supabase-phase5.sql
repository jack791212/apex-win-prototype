-- =====================================================================
-- Apex Win｜Phase 5：錢包記帳 + 真資料 feeds（大獎牆/貢獻榜）+ 小雞過馬路伺服器開獎
--
-- ★ 部署步驟（請照做，不要覆蓋舊分頁）：
--   1. Supabase Dashboard → 左側 SQL Editor
--   2. 點上方「+」開一個【新的查詢分頁】（保留 setup / phase4 / phase4b 的舊分頁不動）
--   3. 將本檔「全部內容」貼上 → 按 Run（執行一次即可；重複執行也安全）
--
-- 內容：
--   A) profiles 加 wagered（累積有效押注；全球獎進度/貢獻榜用）+ 欄位級防竄改
--   B) big_wins 大獎牆資料表 + log_big_win 落獎
--   C) 既有 5 個遊戲函式升級（play_battle / slot_spin / slot_buy / bounty_flip / bounty_mine）
--      → 加上 wagered 累計與大獎牆落獎（其餘邏輯與 phase4/4b 相同）
--   D) wallet_txns 交易表 + wallet_txn 儲值/提款（伺服器記帳）
--   E) feed_recent_wins / feed_leaderboard（前端真資料 feeds）
--   F) chicken_rounds + chicken_start / chicken_step / chicken_cashout（小雞過馬路，逐步伺服器開獎）
-- =====================================================================

-- ---------- A) profiles.wagered + 欄位級防竄改 ----------
alter table public.profiles add column if not exists wagered numeric not null default 0;

-- 防竄改：client（authenticated）只能改個人化欄位；balance / arena_stats / wagered 僅伺服器函式可寫
revoke update on public.profiles from authenticated;
grant update (display_name, avatar, currency, wallet, updated_at) on public.profiles to authenticated;

-- ---------- B) big_wins 大獎牆 ----------
create table if not exists public.big_wins (
  id bigint generated always as identity primary key,
  user_id uuid references auth.users on delete cascade,
  name text,            -- 顯示名（已遮罩，如「王小明***」）
  game text,
  bet numeric,
  win numeric,
  mult numeric,
  created_at timestamptz default now()
);
alter table public.big_wins enable row level security; -- 不開任何 policy：只能透過 security definer RPC 讀寫
create index if not exists big_wins_created on public.big_wins (created_at desc);

-- 落獎：win ≥ 500 且 win ≥ bet × p_minmult 才上牆；失敗不影響遊戲結算
create or replace function public.log_big_win(p_uid uuid, p_game text, p_bet numeric, p_win numeric, p_minmult numeric default 5)
returns void language plpgsql security definer set search_path = public as $$
declare v_name text;
begin
  if p_win is null or p_bet is null or p_bet <= 0 then return; end if;
  if p_win < 500 or p_win < p_bet * p_minmult then return; end if;
  select coalesce(left(display_name, 4), '玩家') || '***' into v_name from profiles where id = p_uid;
  insert into big_wins (user_id, name, game, bet, win, mult)
  values (p_uid, coalesce(v_name, '玩家***'), p_game, p_bet, p_win, round(p_win / p_bet, 2));
exception when others then null;
end; $$;

-- ---------- C-1) play_battle 升級（+wagered、+大獎牆）----------
create or replace function public.play_battle(
  p_wager numeric,
  p_players int,
  p_mode text,
  p_rounds int,
  p_roster jsonb default '[]'::jsonb,
  p_game text default 'Slots Battle'
) returns jsonb
language plpgsql security definer set search_path = public as $$
declare
  v_uid uuid := auth.uid();
  v_bal numeric;
  v_stats jsonb;
  v_players int := greatest(2, least(4, coalesce(p_players, 2)));
  v_rounds int := greatest(1, least(8, coalesce(p_rounds, 1)));
  v_mode text := coalesce(p_mode, 'normal');
  v_wager numeric := greatest(0, coalesce(p_wager, 0));
  v_total numeric[];
  v_lastDelta numeric[];
  v_seats jsonb := '[]'::jsonb;
  v_metric numeric[];
  v_winner int := 0;
  v_i int; v_r int; v_run numeric; v_round numeric; v_best numeric;
  v_win boolean; v_net numeric; v_newbal numeric;
  v_m int; v_w int; v_l int; v_streak int; v_bestStreak int; v_bigWin numeric; v_profit numeric;
  v_rounds_json jsonb;
begin
  if v_uid is null then return jsonb_build_object('error', 'not authenticated'); end if;

  select balance, arena_stats into v_bal, v_stats from profiles where id = v_uid;
  if v_bal is null then return jsonb_build_object('error', 'profile not found'); end if;
  if v_wager > v_bal then return jsonb_build_object('error', 'insufficient balance'); end if;

  v_total := array_fill(0::numeric, array[v_players]);
  v_lastDelta := array_fill(0::numeric, array[v_players]);
  v_metric := array_fill(0::numeric, array[v_players]);
  for v_i in 1..v_players loop
    v_run := 0;
    v_rounds_json := '[]'::jsonb;
    for v_r in 1..v_rounds loop
      v_round := floor(random() * 1500)::numeric + 120;
      if random() < 0.12 then v_round := v_round * (3 + floor(random() * 4))::int; end if;
      v_run := v_run + v_round;
      v_rounds_json := v_rounds_json || to_jsonb(v_run);
      if v_r = v_rounds then v_lastDelta[v_i] := v_round; end if;
    end loop;
    v_total[v_i] := v_run;
    v_metric[v_i] := case when v_mode = 'terminal' then v_lastDelta[v_i] else v_run end;
    v_seats := v_seats || jsonb_build_object('idx', v_i - 1, 'total', v_run, 'rounds', v_rounds_json);
  end loop;

  v_winner := 1; v_best := v_metric[1];
  for v_i in 2..v_players loop
    if (v_mode = 'crazy' and v_metric[v_i] < v_best) or (v_mode <> 'crazy' and v_metric[v_i] > v_best) then
      v_best := v_metric[v_i]; v_winner := v_i;
    end if;
  end loop;

  v_win := (v_winner = 1);
  v_net := case when v_win then v_wager * (v_players - 1) else -v_wager end;
  v_newbal := v_bal + v_net;

  v_m := coalesce((v_stats->>'matches')::int, 0) + 1;
  v_w := coalesce((v_stats->>'wins')::int, 0) + (case when v_win then 1 else 0 end);
  v_l := coalesce((v_stats->>'losses')::int, 0) + (case when v_win then 0 else 1 end);
  v_streak := coalesce((v_stats->>'streak')::int, 0);
  v_streak := case when v_win then (case when v_streak >= 0 then v_streak + 1 else 1 end)
                   else (case when v_streak <= 0 then v_streak - 1 else -1 end) end;
  v_bestStreak := greatest(coalesce((v_stats->>'best')::int, 0), v_streak);
  v_bigWin := greatest(coalesce((v_stats->>'bigWin')::numeric, 0), v_net);
  v_profit := coalesce((v_stats->>'profit')::numeric, 0) + v_net;

  v_stats := jsonb_build_object(
    'matches', v_m, 'wins', v_w, 'losses', v_l, 'profit', v_profit,
    'streak', v_streak, 'best', v_bestStreak, 'bigWin', v_bigWin,
    'hostNet', coalesce((v_stats->>'hostNet')::numeric, 0)
  );

  update profiles set balance = v_newbal, arena_stats = v_stats,
    wagered = coalesce(wagered, 0) + v_wager, updated_at = now() where id = v_uid;

  if v_win then perform public.log_big_win(v_uid, coalesce(p_game, 'Slots Battle'), v_wager, v_wager + v_net, 2); end if;

  insert into battle_history (user_id, vs, mode, wager, net, win, payload)
  values (v_uid,
    (case v_players when 4 then '1v1v1v1' when 3 then '1v1v1' else '1v1' end),
    v_mode, v_wager, v_net, v_win,
    jsonb_build_object('seats', v_seats, 'winnerIdx', v_winner - 1, 'roster', p_roster, 'game', p_game, 'players', v_players, 'mode', v_mode));

  return jsonb_build_object(
    'seats', v_seats, 'winnerIdx', v_winner - 1, 'win', v_win, 'net', v_net,
    'balance', v_newbal, 'stats', v_stats,
    'game', p_game, 'mode', v_mode,
    'vs', (case v_players when 4 then '1v1v1v1' when 3 then '1v1v1' else '1v1' end)
  );
exception when others then
  return jsonb_build_object('error', sqlerrm);
end; $$;

-- ---------- C-2) slot_spin 升級 ----------
create or replace function public.slot_spin(p_bet numeric)
returns jsonb language plpgsql security definer set search_path = public as $$
declare
  v_uid uuid := auth.uid();
  v_bal numeric; v_bet numeric := greatest(0, coalesce(p_bet, 0));
  v_base numeric := 0; v_total numeric := 0;
  v_level int := 0; v_roll numeric; v_i int; v_w numeric;
  v_candle jsonb := '[]'::jsonb; v_cursed jsonb := '[]'::jsonb;
  v_newbal numeric;
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
    for v_i in 1..8 loop
      v_w := floor(random()*(v_bet*6))::numeric; v_candle := v_candle || to_jsonb(v_w); v_total := v_total + v_w;
    end loop;
    for v_i in 1..6 loop
      v_w := floor(random()*(v_bet*30))::numeric; v_cursed := v_cursed || to_jsonb(v_w); v_total := v_total + v_w;
    end loop;
  elsif v_roll > 0.73 then
    v_level := 1 + floor(random()*4)::int;
    for v_i in 1..(v_level*2) loop
      v_w := floor(random()*(v_bet*6))::numeric; v_candle := v_candle || to_jsonb(v_w); v_total := v_total + v_w;
    end loop;
  end if;

  if v_total > v_bet * 6666 then v_total := v_bet * 6666; end if;
  v_newbal := v_bal - v_bet + v_total;
  update profiles set balance = v_newbal, wagered = coalesce(wagered, 0) + v_bet, updated_at = now() where id = v_uid;
  perform public.log_big_win(v_uid, '暗影儀式 Shadow Ritual', v_bet, v_total);

  return jsonb_build_object('baseWin', v_base, 'level', v_level, 'candle', v_candle, 'cursed', v_cursed, 'totalWin', v_total, 'balance', v_newbal);
exception when others then return jsonb_build_object('error', sqlerrm); end; $$;

-- ---------- C-3) slot_buy 升級 ----------
create or replace function public.slot_buy(p_kind text, p_bet numeric)
returns jsonb language plpgsql security definer set search_path = public as $$
declare
  v_uid uuid := auth.uid();
  v_bal numeric; v_bet numeric := greatest(0, coalesce(p_bet,0));
  v_cost numeric; v_total numeric := 0; v_i int; v_w numeric;
  v_candle jsonb := '[]'::jsonb; v_cursed jsonb := '[]'::jsonb; v_newbal numeric;
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
  perform public.log_big_win(v_uid, '暗影儀式 Shadow Ritual', v_cost, v_total);

  return jsonb_build_object('kind', p_kind, 'cost', v_cost, 'candle', v_candle, 'cursed', v_cursed, 'totalWin', v_total, 'balance', v_newbal);
exception when others then return jsonb_build_object('error', sqlerrm); end; $$;

-- ---------- C-4) bounty_flip 升級 ----------
create or replace function public.bounty_flip(p_cost numeric, p_vol text, p_flips int)
returns jsonb language plpgsql security definer set search_path = public as $$
declare
  v_uid uuid := auth.uid();
  v_bal numeric; v_cost numeric := greatest(0, coalesce(p_cost,0));
  v_flips int := greatest(1, least(10, coalesce(p_flips,5)));
  v_poolPer numeric; v_prizes numeric[]; v_w numeric[]; v_sw numeric;
  v_prizes_json jsonb := '[]'::jsonb; v_picked jsonb := '[]'::jsonb;
  v_fwin numeric := 0; v_i int; v_j int; v_tmp numeric; v_newbal numeric;
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
  for v_i in reverse 10..2 loop
    v_j := 1 + floor(random()*v_i)::int;
    v_tmp := v_prizes[v_i]; v_prizes[v_i] := v_prizes[v_j]; v_prizes[v_j] := v_tmp;
  end loop;
  for v_i in 1..10 loop
    v_prizes_json := v_prizes_json || to_jsonb(v_prizes[v_i]);
    if v_i <= v_flips then v_picked := v_picked || to_jsonb(v_i - 1); v_fwin := v_fwin + v_prizes[v_i]; end if;
  end loop;

  v_newbal := v_bal - v_cost + v_fwin;
  update profiles set balance = v_newbal, wagered = coalesce(wagered, 0) + v_cost, updated_at = now() where id = v_uid;
  perform public.log_big_win(v_uid, '賞金局 · 翻牌', v_cost, v_fwin);
  return jsonb_build_object('prizes', v_prizes_json, 'picked', v_picked, 'fWin', v_fwin, 'balance', v_newbal);
exception when others then return jsonb_build_object('error', sqlerrm); end; $$;

-- ---------- C-5) bounty_mine 升級 ----------
create or replace function public.bounty_mine(p_bet numeric, p_maxmult numeric, p_vol text)
returns jsonb language plpgsql security definer set search_path = public as $$
declare
  v_uid uuid := auth.uid();
  v_bal numeric; v_bet numeric := greatest(0, coalesce(p_bet,0));
  v_max numeric := greatest(1, coalesce(p_maxmult,10));
  v_bust boolean; v_mult numeric := 0; v_win numeric := 0; v_newbal numeric; v_p numeric;
begin
  if v_uid is null then return jsonb_build_object('error','not authenticated'); end if;
  select balance into v_bal from profiles where id = v_uid;
  if v_bal is null then return jsonb_build_object('error','profile not found'); end if;
  if v_bet > v_bal then return jsonb_build_object('error','insufficient balance'); end if;

  v_p := case lower(coalesce(p_vol,'mid')) when 'high' then 0.5 when 'low' then 0.25 else 0.38 end;
  v_bust := random() < v_p;
  if v_bust then v_win := 0; v_mult := 0;
  else
    v_mult := round((0.2 + random() * (v_max - 0.2))::numeric, 2);
    v_win := round(v_bet * v_mult);
  end if;
  v_newbal := v_bal - v_bet + v_win;
  update profiles set balance = v_newbal, wagered = coalesce(wagered, 0) + v_bet, updated_at = now() where id = v_uid;
  perform public.log_big_win(v_uid, '賞金局 · 踩地雷', v_bet, v_win);
  return jsonb_build_object('win', v_win, 'mult', v_mult, 'bust', v_bust, 'balance', v_newbal);
exception when others then return jsonb_build_object('error', sqlerrm); end; $$;

-- ---------- D) 錢包：wallet_txns + wallet_txn（虛擬點數儲值/提款，伺服器記帳）----------
create table if not exists public.wallet_txns (
  id bigint generated always as identity primary key,
  user_id uuid not null references auth.users on delete cascade,
  kind text not null check (kind in ('deposit','withdraw')),
  amount numeric not null,
  balance_after numeric,
  created_at timestamptz default now()
);
alter table public.wallet_txns enable row level security;
drop policy if exists "own_txn_select" on public.wallet_txns;
create policy "own_txn_select" on public.wallet_txns for select using (auth.uid() = user_id);
-- 不開 insert policy：只有 wallet_txn（security definer）能寫
create index if not exists wallet_txns_user_ts on public.wallet_txns (user_id, created_at desc);

create or replace function public.wallet_txn(p_amount numeric, p_kind text)
returns jsonb language plpgsql security definer set search_path = public as $$
declare
  v_uid uuid := auth.uid();
  v_amt numeric := floor(coalesce(p_amount, 0));
  v_bal numeric; v_newbal numeric;
begin
  if v_uid is null then return jsonb_build_object('error','not authenticated'); end if;
  if p_kind not in ('deposit','withdraw') then return jsonb_build_object('error','bad kind'); end if;
  if v_amt < 100 then return jsonb_build_object('error','min 100'); end if;
  if v_amt > 1000000 then return jsonb_build_object('error','max 1,000,000'); end if;
  select balance into v_bal from profiles where id = v_uid for update; -- 列鎖：避免並發交易彼此覆蓋餘額
  if v_bal is null then return jsonb_build_object('error','profile not found'); end if;
  if p_kind = 'withdraw' and v_amt > v_bal then return jsonb_build_object('error','insufficient balance'); end if;

  v_newbal := case p_kind when 'deposit' then v_bal + v_amt else v_bal - v_amt end;
  update profiles set balance = v_newbal, updated_at = now() where id = v_uid;
  insert into wallet_txns (user_id, kind, amount, balance_after) values (v_uid, p_kind, v_amt, v_newbal);
  return jsonb_build_object('balance', v_newbal, 'kind', p_kind, 'amount', v_amt);
exception when others then return jsonb_build_object('error', sqlerrm); end; $$;

-- ---------- E) 真資料 feeds ----------
-- 大獎牆：最近 N 筆真實落獎
create or replace function public.feed_recent_wins(p_limit int default 30)
returns jsonb language sql security definer set search_path = public as $$
  select coalesce(jsonb_agg(t), '[]'::jsonb) from (
    select name, game, bet, win, mult, created_at
    from big_wins order by created_at desc
    limit greatest(1, least(100, coalesce(p_limit, 30)))
  ) t;
$$;

-- 貢獻榜：累積有效押注排行（名稱已遮罩）
create or replace function public.feed_leaderboard(p_limit int default 8)
returns jsonb language sql security definer set search_path = public as $$
  select coalesce(jsonb_agg(t), '[]'::jsonb) from (
    select coalesce(left(display_name, 4), '玩家') || '***' as name, avatar, coalesce(wagered, 0) as wagered
    from profiles where coalesce(wagered, 0) > 0
    order by wagered desc
    limit greatest(1, least(50, coalesce(p_limit, 8)))
  ) t;
$$;

-- ---------- F) 小雞過馬路（逐步伺服器開獎；與前端同一機率模型，RTP 97%）----------
-- 第 k 格存活率 p(k) = max(pMin, pStart − dec×(k−1))；賠率 = floor2(0.97 ÷ 累積存活率)
-- 任何時點兌現的期望值 = 押注 × 97% → RTP 恆 ≤ 97% < 100%
create table if not exists public.chicken_rounds (
  user_id uuid primary key references auth.users on delete cascade,
  bet numeric not null,
  diff text not null,
  step int not null default 0,
  mult numeric not null default 0,
  cum numeric not null default 1,   -- 累積存活率（伺服器持有，client 無法竄改）
  active boolean not null default true,
  updated_at timestamptz default now()
);
alter table public.chicken_rounds enable row level security; -- 不開 policy：只有下方 definer 函式能讀寫

create or replace function public.chicken_p(p_diff text, p_k int)
returns numeric language sql immutable as $$
  select greatest(
    case p_diff when 'easy' then 0.85 when 'hard' then 0.60 when 'hell' then 0.45 else 0.72 end,
    case p_diff when 'easy' then 0.96 when 'hard' then 0.83 when 'hell' then 0.72 else 0.90 end
    - case p_diff when 'easy' then 0.004 when 'hard' then 0.010 when 'hell' then 0.012 else 0.007 end * (p_k - 1)
  )::numeric;
$$;

-- 開局：扣注、累計 wagered、建立/重置回合（既有未結束回合視同放棄，押注已扣不退）
create or replace function public.chicken_start(p_bet numeric, p_diff text)
returns jsonb language plpgsql security definer set search_path = public as $$
declare
  v_uid uuid := auth.uid();
  v_bet numeric := floor(greatest(0, coalesce(p_bet, 0)));
  v_diff text := case when p_diff in ('easy','mid','hard','hell') then p_diff else 'mid' end;
  v_bal numeric; v_newbal numeric;
begin
  if v_uid is null then return jsonb_build_object('error','not authenticated'); end if;
  if v_bet < 10 or v_bet > 1000 then return jsonb_build_object('error','bet 10~1000'); end if;
  select balance into v_bal from profiles where id = v_uid for update; -- 列鎖：避免與其他結算並發時覆蓋餘額
  if v_bal is null then return jsonb_build_object('error','profile not found'); end if;
  if v_bet > v_bal then return jsonb_build_object('error','insufficient balance'); end if;

  v_newbal := v_bal - v_bet;
  update profiles set balance = v_newbal, wagered = coalesce(wagered, 0) + v_bet, updated_at = now() where id = v_uid;
  insert into chicken_rounds (user_id, bet, diff, step, mult, cum, active, updated_at)
  values (v_uid, v_bet, v_diff, 0, 0, 1, true, now())
  on conflict (user_id) do update
    set bet = excluded.bet, diff = excluded.diff, step = 0, mult = 0, cum = 1, active = true, updated_at = now();

  return jsonb_build_object('balance', v_newbal, 'diff', v_diff, 'bet', v_bet);
exception when others then return jsonb_build_object('error', sqlerrm); end; $$;

-- 前進一格：伺服器擲存活率；達 5000x 上限自動兌現
create or replace function public.chicken_step()
returns jsonb language plpgsql security definer set search_path = public as $$
declare
  v_uid uuid := auth.uid();
  v_r record; v_k int; v_p numeric; v_cum numeric; v_mult numeric;
  v_win numeric; v_newbal numeric;
begin
  if v_uid is null then return jsonb_build_object('error','not authenticated'); end if;
  select * into v_r from chicken_rounds where user_id = v_uid and active for update;
  if not found then return jsonb_build_object('error','no active round'); end if;

  v_k := v_r.step + 1;
  v_p := chicken_p(v_r.diff, v_k);
  if random() >= v_p then
    update chicken_rounds set active = false, updated_at = now() where user_id = v_uid;
    return jsonb_build_object('alive', false, 'step', v_k);
  end if;

  v_cum := v_r.cum * v_p;
  v_mult := floor((0.97 / v_cum) * 100) / 100;
  if v_mult >= 5000 then
    v_mult := 5000;
    v_win := floor(v_r.bet * v_mult);
    update profiles set balance = balance + v_win, updated_at = now() where id = v_uid returning balance into v_newbal;
    update chicken_rounds set active = false, step = v_k, mult = v_mult, cum = v_cum, updated_at = now() where user_id = v_uid;
    perform public.log_big_win(v_uid, '小雞過馬路 Chicken Cross', v_r.bet, v_win);
    return jsonb_build_object('alive', true, 'cashed', true, 'step', v_k, 'mult', v_mult, 'win', v_win, 'balance', v_newbal);
  end if;

  update chicken_rounds set step = v_k, mult = v_mult, cum = v_cum, updated_at = now() where user_id = v_uid;
  return jsonb_build_object('alive', true, 'step', v_k, 'mult', v_mult);
exception when others then return jsonb_build_object('error', sqlerrm); end; $$;

-- 兌現：派彩 + 結束回合
create or replace function public.chicken_cashout()
returns jsonb language plpgsql security definer set search_path = public as $$
declare
  v_uid uuid := auth.uid();
  v_r record; v_win numeric; v_newbal numeric;
begin
  if v_uid is null then return jsonb_build_object('error','not authenticated'); end if;
  select * into v_r from chicken_rounds where user_id = v_uid and active for update;
  if not found then return jsonb_build_object('error','no active round'); end if;
  if v_r.step < 1 then return jsonb_build_object('error','must move first'); end if;

  v_win := floor(v_r.bet * v_r.mult);
  update profiles set balance = balance + v_win, updated_at = now() where id = v_uid returning balance into v_newbal;
  update chicken_rounds set active = false, updated_at = now() where user_id = v_uid;
  perform public.log_big_win(v_uid, '小雞過馬路 Chicken Cross', v_r.bet, v_win);
  return jsonb_build_object('win', v_win, 'mult', v_r.mult, 'balance', v_newbal);
exception when others then return jsonb_build_object('error', sqlerrm); end; $$;

-- 完成。前端：錢包儲值/提款、會員大獎牆/貢獻榜、小雞過馬路會自動切換為伺服器模式。
