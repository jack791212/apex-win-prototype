-- =====================================================================
-- Apex Win｜Phase 4b：slot + 賞金局 開獎/餘額也搬後端（全平台防作弊）
-- 在 Supabase → SQL Editor 全選貼上 → Run（可重複，CREATE OR REPLACE）。
-- 設計：每個「付費動作」由伺服器一次決定完整結果(含特色/免費遊戲總贏分)並
--       原子結算餘額；前端只播動畫呈現。因此無 session state、天然防刷
--       （免費遊戲不是獨立可呼叫的端點，無法被單獨farm）。皆用 auth.uid()。
-- =====================================================================

-- ---------- slot_spin：一次付費旋轉的完整結果（含可能觸發的免費遊戲總分）----------
-- 回傳：{ baseWin, level, candle:[wins...], cursed:[wins...], totalWin, balance }
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

  -- 基礎旋轉贏分（多數小贏/不中，偶發較大）
  v_roll := random();
  if v_roll < 0.45 then v_base := 0;
  elsif v_roll < 0.9 then v_base := floor(random()* (v_bet*3))::numeric;
  else v_base := floor(random()* (v_bet*20))::numeric + v_bet; end if;
  v_total := v_base;

  -- 特色觸發：~22% Candle(lv1-4)、~5% Cursed(lv5)
  v_roll := random();
  if v_roll > 0.95 then
    v_level := 5;
    for v_i in 1..8 loop  -- 進 Cursed 前的 Candle
      v_w := floor(random()*(v_bet*6))::numeric; v_candle := v_candle || to_jsonb(v_w); v_total := v_total + v_w;
    end loop;
    for v_i in 1..6 loop  -- Cursed Spins（5x5、較高）
      v_w := floor(random()*(v_bet*30))::numeric; v_cursed := v_cursed || to_jsonb(v_w); v_total := v_total + v_w;
    end loop;
  elsif v_roll > 0.73 then
    v_level := 1 + floor(random()*4)::int; -- lv1-4
    for v_i in 1..(v_level*2) loop
      v_w := floor(random()*(v_bet*6))::numeric; v_candle := v_candle || to_jsonb(v_w); v_total := v_total + v_w;
    end loop;
  end if;

  if v_total > v_bet * 6666 then v_total := v_bet * 6666; end if; -- 最大贏分上限
  v_newbal := v_bal - v_bet + v_total;
  update profiles set balance = v_newbal, updated_at = now() where id = v_uid;

  return jsonb_build_object('baseWin', v_base, 'level', v_level, 'candle', v_candle, 'cursed', v_cursed, 'totalWin', v_total, 'balance', v_newbal);
exception when others then return jsonb_build_object('error', sqlerrm); end; $$;

-- ---------- slot_buy：購買特色的完整結果 ----------
-- p_kind: 'baphomet'(cost=bet*50) | 'cursed'(cost=bet*100)
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
  update profiles set balance = v_newbal, updated_at = now() where id = v_uid;

  return jsonb_build_object('kind', p_kind, 'cost', v_cost, 'candle', v_candle, 'cursed', v_cursed, 'totalWin', v_total, 'balance', v_newbal);
exception when others then return jsonb_build_object('error', sqlerrm); end; $$;

-- ---------- bounty_flip：翻牌一次挑戰（伺服器產生 10 張固定彩金 + 抽 flips 張）----------
-- 回傳：{ prizes:[10], picked:[idx...], fWin, balance }
create or replace function public.bounty_flip(p_cost numeric, p_vol text, p_flips int)
returns jsonb language plpgsql security definer set search_path = public as $$
declare
  v_uid uuid := auth.uid();
  v_bal numeric; v_cost numeric := greatest(0, coalesce(p_cost,0));
  v_flips int := greatest(1, least(10, coalesce(p_flips,5)));
  v_poolPer numeric; v_prizes numeric[]; v_w numeric[]; v_sw numeric;
  v_prizes_json jsonb := '[]'::jsonb; v_picked jsonb := '[]'::jsonb;
  v_fwin numeric := 0; v_i int; v_j int; v_tmp numeric; v_order int[]; v_newbal numeric;
begin
  if v_uid is null then return jsonb_build_object('error','not authenticated'); end if;
  select balance into v_bal from profiles where id = v_uid;
  if v_bal is null then return jsonb_build_object('error','profile not found'); end if;
  if v_cost > v_bal then return jsonb_build_object('error','insufficient balance'); end if;

  v_poolPer := round(v_cost * 10 / v_flips);
  -- 依震盪集中度的權重（對應前端 flipWeights）
  v_w := case lower(coalesce(p_vol,'mid'))
    when 'high' then array[6,3,1,1,0,0,0,0,0,0]::numeric[]
    when 'low'  then array[2,2,1,1,1,1,1,1,0,0]::numeric[]
    else array[3,2,2,1,1,1,0,0,0,0]::numeric[] end;
  v_sw := 0; for v_i in 1..10 loop v_sw := v_sw + v_w[v_i]; end loop;
  v_prizes := array_fill(0::numeric, array[10]);
  for v_i in 1..10 loop v_prizes[v_i] := round((v_w[v_i]/v_sw) * v_poolPer / 100) * 100; end loop;
  -- 洗牌（Fisher-Yates）
  for v_i in reverse 10..2 loop
    v_j := 1 + floor(random()*v_i)::int;
    v_tmp := v_prizes[v_i]; v_prizes[v_i] := v_prizes[v_j]; v_prizes[v_j] := v_tmp;
  end loop;
  -- 抽前 flips 張（已洗牌→等於隨機抽）
  for v_i in 1..10 loop
    v_prizes_json := v_prizes_json || to_jsonb(v_prizes[v_i]);
    if v_i <= v_flips then v_picked := v_picked || to_jsonb(v_i - 1); v_fwin := v_fwin + v_prizes[v_i]; end if;
  end loop;

  v_newbal := v_bal - v_cost + v_fwin;
  update profiles set balance = v_newbal, updated_at = now() where id = v_uid;
  return jsonb_build_object('prizes', v_prizes_json, 'picked', v_picked, 'fWin', v_fwin, 'balance', v_newbal);
exception when others then return jsonb_build_object('error', sqlerrm); end; $$;

-- ---------- bounty_mine：踩地雷一次挑戰（伺服器決定出局或兌現倍數）----------
-- 回傳：{ win, mult, bust, balance }
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

  -- 出局機率依震盪（高震盪較常出局但倍數高）
  v_p := case lower(coalesce(p_vol,'mid')) when 'high' then 0.5 when 'low' then 0.25 else 0.38 end;
  v_bust := random() < v_p;
  if v_bust then v_win := 0; v_mult := 0;
  else
    v_mult := round((0.2 + random() * (v_max - 0.2))::numeric, 2); -- 0.2 ~ maxMult
    v_win := round(v_bet * v_mult);
  end if;
  v_newbal := v_bal - v_bet + v_win;
  update profiles set balance = v_newbal, updated_at = now() where id = v_uid;
  return jsonb_build_object('win', v_win, 'mult', v_mult, 'bust', v_bust, 'balance', v_newbal);
exception when others then return jsonb_build_object('error', sqlerrm); end; $$;

-- 完成。前端會員模式呼叫對應 rpc。
