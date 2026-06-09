-- =====================================================================
-- Apex Win｜Phase 4：開獎 RNG + 餘額結算搬後端（防作弊）
-- 在 Supabase → SQL Editor 全選貼上 → Run。可重複執行（CREATE OR REPLACE）。
-- 重點：對戰的分數/勝負/餘額由「伺服器」決定並原子結算；前端只負責動畫呈現。
--       使用 auth.uid()（JWT 內的使用者），玩家無法替別人結算或竄改餘額。
-- =====================================================================

-- ---------- play_battle：伺服器決定 Slots Battle 的分數/勝負/結算 ----------
-- 輸入：賭注、人數(2~4)、模式(normal/crazy/terminal)、回合數、對手名單(僅作顯示/紀錄)
-- 動作：驗證餘額 → 伺服器亂數產生各玩家逐回合分數 → 依模式定勝者 →
--       原子更新 balance + arena_stats → 寫 battle_history → 回傳完整結果
-- 回傳：{ seats:[{idx,total,rounds:[累計分...]}], winnerIdx, win, net, balance, stats, game, mode, vs }
create or replace function public.play_battle(
  p_wager numeric,
  p_players int,
  p_mode text,            -- 'normal' | 'crazy' | 'terminal'
  p_rounds int,
  p_roster jsonb default '[]'::jsonb,  -- [{name,av}, ...]（含「你」在 idx 0，僅顯示用）
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
  v_total numeric[];        -- 各 seat 總分
  v_lastDelta numeric[];    -- 各 seat 末輪增量
  v_seats jsonb := '[]'::jsonb;
  v_metric numeric[];       -- 排序依據
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

  -- 伺服器亂數：各玩家逐回合分數（累計），模擬 FG 連爆分布（偶發大獎）。一個迴圈內直接累積 jsonb，避免 2D 陣列
  v_total := array_fill(0::numeric, array[v_players]);
  v_lastDelta := array_fill(0::numeric, array[v_players]);
  v_metric := array_fill(0::numeric, array[v_players]);
  for v_i in 1..v_players loop
    v_run := 0;
    v_rounds_json := '[]'::jsonb;
    for v_r in 1..v_rounds loop
      v_round := floor(random() * 1500)::numeric + 120;          -- 基礎一回合分
      if random() < 0.12 then v_round := v_round * (3 + floor(random() * 4))::int; end if;  -- 12% 大獎
      v_run := v_run + v_round;
      v_rounds_json := v_rounds_json || to_jsonb(v_run);
      if v_r = v_rounds then v_lastDelta[v_i] := v_round; end if;
    end loop;
    v_total[v_i] := v_run;
    v_metric[v_i] := case when v_mode = 'terminal' then v_lastDelta[v_i] else v_run end;
    v_seats := v_seats || jsonb_build_object('idx', v_i - 1, 'total', v_run, 'rounds', v_rounds_json);
  end loop;

  -- 找勝者（crazy=最低、其餘=最高）；平手取較前者
  v_winner := 1; v_best := v_metric[1];
  for v_i in 2..v_players loop
    if (v_mode = 'crazy' and v_metric[v_i] < v_best) or (v_mode <> 'crazy' and v_metric[v_i] > v_best) then
      v_best := v_metric[v_i]; v_winner := v_i;
    end if;
  end loop;

  v_win := (v_winner = 1);                                  -- seat 1 = 你
  v_net := case when v_win then v_wager * (v_players - 1) else -v_wager end;
  v_newbal := v_bal + v_net;

  -- 更新 arena_stats（matches/wins/losses/profit/streak/best/bigWin）
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

  -- 原子結算
  update profiles set balance = v_newbal, arena_stats = v_stats, updated_at = now() where id = v_uid;

  -- 記錄戰績（payload 供回放）
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

-- 完成。前端在會員模式呼叫 supabase.rpc('play_battle', {...}) 取得結果。
