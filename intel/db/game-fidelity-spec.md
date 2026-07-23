# 遊戲保真規格 & 上線閘（Game Fidelity Spec & Gate）

> **這份檔案是「調查隨便 → 做出劣質遊戲」的解方。**
> games 軌復刻任何遊戲：**動手前**必先照本規格寫出該遊戲的 fidelity spec（存進 `games-catalog.json` 該筆的 `fidelity_spec`）；**上線前**必逐項通過本檔末的「上線閘檢查清單」，preview 實測過才准 commit。
> 質 > 量：寧可一輪只徹底做好一款，也不出殘缺遊戲。
> 來源：2026-07-23 對 slot/table/crash/game-show 真實機制的調研（RTP 常模、賠率、節奏）。

---

## 鐵則（跨所有品類）

**區分優劣的幾乎從來不是數學本身，而是「時機與期待感」。** 賠率對、但瞬間平板結算，仍然像試算表。三條共通律：

1. **每款遊戲都要有一個「張力節拍」，在結果揭曉前刻意拉長** —— slot 出兩個 scatter 時剩餘轉輪放慢、輪盤球在框上彈跳、百家樂一點一點擠牌、crash 曲線加速逼近未知爆點、game-show 指針卡在 bonus 段邊緣。**這個「差一點」的瞬間就是產品本體。**
2. **回饋要分級、且多感官** —— 揭曉時長 / 粒子特效強度 / 音高 crescendo 都隨贏額放大，大獎有專屬全螢幕時刻。**2× 和 500× 給一樣的小計數器 = 頭號廉價破綻。**
3. **節奏要可重複而不拖沓** —— 清楚的下注/倒數 → 硬性 commit（「停止下注」/ spin lock）→ 分階段揭曉 → 逐項結算 → 下一輪前的小停頓。turbo 可壓縮但**永不刪掉期待節拍**。
4. **順序也是感覺**：轉輪由左到右停（絕不同時）、先掃輸家籌碼再付贏家（讓玩家讀懂結果）、top-slot 先於主輪、**RNG 在回合開始就 commit**（動畫誠實、client 無法偷看）。

---

## 各品類核心規格

### SLOT（現代特色 video slot）
- **RTP**：宣告目標 RTP，且賠付表在模擬下必須真的收斂到它。常模 94–97%（96% 為現代良好線；bonus-buy 版常 97%+）。RTP 是長期回收率，**不是中獎頻率**。
- **波動度是獨立軸**：低波=常中小獎（hit freq ~30–40%）、高波=罕中大獎（~18–25%）；波動 profile 與最大贏倍（低波 ~500× vs 高波 5,000–50,000×）要對得上。
- **線結構要真的是宣稱的型別**：固定 payline（20/25 線，reel1 起左到右相鄰）／ 243·1024 ways（任意相鄰輪、無線位）／ Megaways（每輪 2–7 符號變動，最多 117,649 ways，每轉重算）／ cluster（5+ 連通同符、tumbling）。
- **符號集**：低賠(牌/水果)＋高賠(主題)＋Wild(替代、可帶自身賠付/乘數)＋Scatter(任意位置賠、觸發 free spin)＋選配 Bonus。賠付隨稀有度與數量(3/4/5 連)縮放。
- **特色觸發要明確一致**：如 3/4/5 scatter = 10/15/20 free spins、可 retrigger；bonus-buy 定價 ≈ feature-EV / RTP（買了對基礎 RTP 中性，通常 80–100× 注）。
- **公式**：Win = (符號賠 × 線注) × 生效線/ways × wild 乘數，全線加總。
- **流程**：下注鎖定→餘額先扣→spin 開始即 RNG 定停點→轉輪**左到右**依序停→掃線結算→分級贏分演出→scatter 檢查進 free-spin 子流程(自有計數/常異 reel-set 與乘數/retrigger)→總結大獎→入帳。tumbling 在特色檢查前插入：移除中獎→重力補位→重算→無中獎才停(每 cascade 常累乘)。
- **節奏**：base spin ~1.5–2.5s 到首輪停、其後每輪 +150–300ms(眼睛跟左到右)。**期待感必備**：reel1-2 已現 scatter 時剩餘輪放慢 2–4 倍、音 riser、判動、發光。贏分 roll-up 時長隨額縮放。free-spin 入場給全螢幕轉場 2–4s，絕不無聲跳。turbo 縮短但不跳過觸發期待。
- **常見劣質破綻**：RTP 與 hit-freq 混為一談；賠付表照抄未模擬→暗地賠 80% 或 130%；ways/Megaways 做成固定線或 Megaways 不重算高度→永遠 243 ways；wild 不替代/scatter 要壓線/free-spin 數不隨 scatter 縮放；**無期待階段(每輪同速停)＝最大廉價 tell**；同步停輪；bonus-buy 亂定價毀 RTP；free-spin 沿用 base reel 無區別乘數/音樂；贏分特效不分級；缺 retrigger；餘額非原子扣款導致中斷重複計。

### TABLE / 棋牌（Baccarat / Blackjack / Roulette）
- **輪盤賠率(不可協商)**：直注 35:1、分注 17:1、街注 11:1、角注 8:1、線注 5:1、列/打 2:1、紅黑單雙大小 1:1。**輪盤拓樸必須對**：歐式 37 格(單 0)→edge 2.70%/RTP 97.30%；美式 38 格(0+00)→edge 5.26%/RTP 94.97%。格數或任一賠率錯 = 整個 edge 壞。法式 La Partage/En Prison 把偶注 edge 減半到 1.35%。
- **百家樂**：閒 1:1(edge 1.24%)、莊 1:1 減 5% 佣(edge 1.06%/RTP 98.94%)、和 8:1(edge ~14.4%；有些 9:1)。**第三張補牌是固定 tableau、不是選擇**：閒 0–5 補、6–7 停；莊補牌依莊點數 AND 閒第三張。天牌 8/9 不補。
- **21 點**：天牌 21 賠 3:2(**絕不 6:5**，6:5 偷加 ~1.4% edge)、其餘 1:1、保險 2:1。莊家規則要宣告一致：S17(軟 17 停) vs H17(軟 17 補)。玩家 hit/stand/double/split/surrender 要真的可行；正確基本策略要做得到(3:2+S17 → RTP ~99.5%)。平手 push、爆牌即輸。
- **流程**：輪盤=下注窗(籌碼 place/undo/clear/rebet、多注同下、顯總額)→「停止下注」硬鎖→spin(開始即定格)→球落→亮號亮色→先掃輸家再按固定賠率付贏家→rebet。百家=下注→各發兩張→天牌檢查→補牌 tableau→比點(近 9、mod-10)→含佣結算→路子/珠盤更新。21 點=下注→發牌(閒兩明、莊一明一暗)→莊 10/A peek→玩家動作 loop→莊翻暗牌按規則補→比較結算。
- **節奏**：輪盤球繞 4–6s 減速、在框上彈跳才落定 —— **彈跳就是期待感、瞬間揭曉會殺死它**；先掃輸再付贏讓結果可讀。百家的**擠牌(一點一點揭)是整個儀式**、瞬間發兩手毀感覺。21 點每張之間留拍、暗牌翻開是戲劇性揭曉。
- **常見劣質破綻**：賠率錯(直注 36:1、21 點 1:1 或 6:5、和 9:1 但宣告 8:1、莊佣漏扣)；美式 38 格卻報歐式 2.70% edge；百家第三張規則簡化錯(莊永遠 <6 補)→老玩家一眼識破；21 點莊家邏輯錯；無「停止下注」鎖；瞬間結果/零球彈/零擠牌→像 RNG 試算表；多注不逐項列賠→無法稽核；缺路子/計分板；side bet 賠率捏造不符機率。

### CRASH / INSTANT（Crash·Aviator / Dice / Limbo / Mines / Plinko —— 單注可驗證公平）
- **CRASH**：edge ~1–3%(Aviator 97% RTP/3% edge 為基準)。爆點分布是**重尾曲線、非均勻**：多數低爆、罕見到 100–1000×+。標準公式：先有 instant-bust 機率(~1–3% 回合恰在 1.00× 爆＝這就是 edge)，然後 crashPoint = (1-edge)/(1-r)，r 均勻 [0,1)，得 P(≥m) ≈ (1-edge)/m，故 P(2×) ≈ 48.5%(97% RTP) —— 模擬下必須成立。cashout 前=注×倍數，未 cashout=全損。支援 auto-cashout 與共享連續曲線。
- **DICE**：over/under 目標 0–100.00，payout = (100-edge%)/winChance(1% edge→49.5% 時 2×)。
- **LIMBO**：選目標倍數，RNG 倍數 ≥ 目標則贏、賠付=目標，P(win)=(1-edge)/target。
- **MINES**：N×N(常 5×5)選雷數；每安全格揭開按「剩餘安全/剩餘總格」的公平比抬升乘數；隨時 cash out；踩雷全輸。
- **PLINKO**：球過釘落桶；桶乘數必須是真的二項分布、與宣告 RTP 及風險級(低/中/高改 edge 分散)一致。
- **全部可驗證公平**：serverSeed 承諾 hash→clientSeed→nonce→HMAC-SHA256→float，事後可重算驗證。
- **節奏**：crash 活在**上升曲線張力**——平滑加速倍數＋升音，爬越久越考驗神經；**突兀的爆(閃屏/曲線斷/音切)必須嚇人**。cash-out 給即時滿足鎖定(凍結數字、ka-ching)。dice/limbo 要快、脆、近瞬(數十 ms)讓 autobet 爽快，但輸贏仍要清楚色+音+數字滾動。mines 每格翻前留屏息拍(安全=寶石音、雷=爆炸)。plinko 要可信釘彈物理與落桶 pop。
- **常見劣質破綻**：均勻爆點分布(任何倍數等機率)取代 1/m 重尾→RTP 大錯、100× 太常或永不出現；漏掉 instant-bust(1.00×)機率＝edge 來源→賠 >100%；賠付公式沒把 edge 折進(dice 賠 100/chance→0% edge)；mines/plinko 乘數「看起來對」但在真實機率樹下不加總到宣告 RTP；不可驗證公平或假 commit-hash(毀了整個品類的信任前提)；無 auto-cashout/autobet→像玩具；瞬間爆無上升曲線→拿掉 100% 張力；結果在動畫後才算(client 可偷看)而非回合開始 commit；無歷史帶。

### GAME-SHOW / money-wheel（Crazy Time / Monopoly Live 風）
- **RTP** 95–96.5%，但**每個下注格 RTP 不同、要各自建模**(Crazy Time：Number1 ≈96.08%、Pachinko ≈94.33%、Crazy Time bonus ≈94.41%…)。輪是固定 54 段 money wheel，段數決定基礎機率、要對上賠付表(數字格賠面值 X:1)。bonus 段觸發獨立高變異子遊戲(最高 20,000×)。
- **TOP SLOT 機制**：每輪副 reel 對旋轉，某下注格符號對齊某乘數(2×–50×)時該格本輪套用——疊在主輪上的獨立 RNG 事件。
- **bonus 回合是各自 mini-game**(Cash Hunt 挑選 / Pachinko 掉落 / Coin Flip 二選 / Crazy Time 大飛輪)、各有自己的乘數分布餵回該格 RTP。只有押中該格的玩家有資格。
- **流程**：下注窗(可倒數)→top-slot 先解析→「停止下注」鎖→主輪轉減速→指針落段→若數字:套 top-slot 乘數(若對齊)、付該數字、掃其餘；若 bonus:只帶押中者進子遊戲(全製作 mini-game 自有乘數揭曉)其餘旁觀→入帳、歷史更新。
- **節奏**：呈現優先。倒數建立共同節奏、top-slot 是主輪前的小期待、主輪長轉(數秒)指針 tick 過釘減速可能剛好推進/推出 bonus 段——**指針卡邊緣的差一點是核心快感**。落 bonus 要升級成大轉場。無真人主持→時機與音效扛起整個「秀」感。
- **常見劣質破綻**：全格套單一 RTP 而非逐格建模；段數錯→機率不符賠付；top-slot 省略或做成全域平乘而非(格,乘數)對齊閘→拿掉招牌鉤子；**bonus 回合做成「你贏了 X」瞬間賠付而非真的可玩 mini-game→整個賣點(秀)沒了＝最常見的空洞化**；非押中者誤付；瞬間輪結果無指針減速/差一點；bonus 乘數分布捏造非依各格真 RTP；無下注鎖/無歷史板。

---

## 🚦 上線閘檢查清單（復刻遊戲 commit 前逐項通過）

每項 PASS/FAIL；任一 FAIL 不准上線。preview 實測(node -e 模擬 + DOM eval)後把結果記進 `games-catalog.json` 該筆 `fidelity_score` 與 `gate_log`。

1. **RTP 證明**：跑蒙地卡羅模擬（≥ CONTROL.fidelity_min_rtp_sims，預設 1,000,000 回合），確認實測回收率在宣告 RTP ±0.5% 內、每個下注格/型別都驗。暗地賠 <95% 或 >100% = FAIL。**不接受手拍賠付表上線**。
2. **賠付對真實標準**：輪盤直注 35:1(非 36:1)、偶注 1:1、列/打 2:1；21 點天牌 3:2(非 6:5)、保險 2:1；百家閒 1:1、莊 1:1 減 5% 佣、和 8:1。任何偏離必須是**刻意且記錄**的 variant，不能是意外。
3. **輪/牌拓樸正確**：歐式輪盤 37 格(單 0/2.70%)或美式 38 格(0+00/5.26%)——格數與 edge 要一致；百家第三張照 canonical tableau；21 點莊家規則(S17 vs H17)宣告且一致實作。
4. **波動度與最大贏一致**(slot/crash/game-show)：宣告波動度在模擬下對得上實際 hit-freq AND 最大贏倍。「高波」卻 100× 上限 + 40% hit rate = FAIL。
5. **線/ways 結構名副其實**：固定 payline 只算定義線左到右；243/1024 ways 任意相鄰無位；Megaways 每轉重算每輪符號數(最多 117,649)；cluster 算連通群。ways 遊戲偷跑固定線 = FAIL。
6. **crash 家分布是重尾 1/m 律**(非均勻)：驗 P(≥2×) ≈ (1-edge)/2(~48.5%@97%)、存在等於 edge 的 instant-bust(1.00×)機率；dice/limbo/mines/plinko 賠付公式把 edge 折進(payout=(1-edge)/winChance)、模擬驗證。
7. **特色觸發全在且能動**：slot scatter→free-spin(數隨 scatter 縮放 + retrigger + bonus-buy 定價與基礎 RTP 一致)；game-show top-slot 對齊 + 所有相關 bonus 回合做成**真正可玩 mini-game**(非「你贏了 X」stub)；crash auto-cashout + autobet；mines/plinko 風險級。特色驅動遊戲做成殘缺 = FAIL。
8. **可驗證公平**(crash/instant/dice 等品類期望處)：回合前顯示 serverSeed 承諾 hash、clientSeed 可設、nonce 遞增、事後 verifier 能重算出同結果。假/不可驗 hash = FAIL。**接 `HL.fair.float`，別用 `Math.random`。**
9. **回合流程順序正確完整**：下注→鎖(「停止下注」)→RNG 在回合**開始**即 commit→分階段揭曉→逐項結算→歷史更新。RNG 先於動畫(client 不可偷看)；結算後才入帳、原子餘額處理(中斷不重複計)。
10. **期待感存在於品類的關鍵張力點**：slot 近觸發放慢+左到右錯開停；輪盤球繞+彈跳才落；百家擠牌；21 點分階段發+暗牌翻；crash 上升曲線才突爆；game-show 指針 tick+top-slot 拍。瞬間平板結算 = FAIL（即使數學對）。
11. **輸贏回饋分級且多感官**：演出隨贏額縮放(小/大/mega 分帶、遞增 roll-up、特效、音 crescendo)；輸也讀得清。2× 與 500× 同回饋 = FAIL。
12. **玩家控件與計分板齊全**：多注 place/undo/clear/rebet + 逐項賠付(輪盤)、路子/珠盤(百家)、split/double/surrender(21 點)、歷史/統計帶(crash/instant/game-show)、autoplay/turbo(slot)——且不跳過必備期待。
13. **平台整合正確**（ApexWin 架構鐵律）：結算走 `HL.liveStats.record(game,bet,win)` 中央掛鉤(自動餵 VIP/任務/返水/JP/帳本)；返回鈕走 shell 公版(`mountView`+`GAME_BACK`)、不自刻；單注用 `HL.instant`、桌遊用 `HL.table`、能複用就複用；新文案以畫面中文為 i18n key；顏色走 `--ax-*` token 不裸寫。**side bet(若有)賠率符合真機率並納入 RTP 稽核，不捏造。**

> **一句話**：數字對是為了公平，節奏對是為了真實——**兩道閘都過才准上線。**
