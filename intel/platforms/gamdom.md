# Gamdom — 平台調研檔

- **URL**：https://gamdom.com
- **調研日期**：2026-06-26（首次）
- **tier**：3（priority 64）
- **regions**：global
- **category**：crypto, casino, originals, community

---

## 特色表（聚焦純前端可學）

### 遊戲 / Originals
- **Originals**：Crash、Dice、**Hilo**、Roulette、Plinko（provably fair、高 RTP、倍數獎勵）。
- **Originals Roulette 內建漸進式 jackpot**：每注抽成累積，可達 $10,000+。
- 平台總量 6,000+，支援 25+ 加密貨幣。
- → ApexWin 已有 Crash/Roulette/Plinko/Dice，**Hilo 為新 Original 缺口**；jackpot ApexWin 已有（#9 三級）。

### 社群 / 直播（**Gamdom 招牌、最大缺口來源**）
- **Rain 事件**：聊天室中不定時「下雨」灑免費幣，**須當下在聊天室活躍**才有機會分得；越常聊天、互動越多，分到的機率越高（2026 內部數據：活躍聊天者多收 23% 紅利）。
- **聊天門檻 Lv20**：要 Level 20 才能發言，營造「精英社群」氛圍；英文 only 嚴格執行，Rain 時段競爭激烈。
- 起家於 2016 CS:GO 皮膚博弈社群 → 社群文化是核心資產。

### 留存系統
- **8 大階 / 24 子階 VIP**（Bronze→Silver→Gold→Emerald→Sapphire→Ruby→Diamond→Opal）。
- **Royalty Up Rewards**（一次性升級獎金）+ **Reload Rewards**（儲值加碼）+ 逐階提升的 instant rakeback。
- **15% rakeback 首 7 天**（無儲值門檻、返水本身免流水）；instant reward pot 可隨時領、一天可領多次（**手動 claim 按鈕**）。
- VIP（邀請制）rakeback 可達 60%。

### UX / 上手
- 登入後畫面底部出現**倒數計時器**（新玩家 6 小時啟用窗口）。
- Rain 領取：過 reCAPTCHA → 按 **claim** 鈕。
- 響應式網頁版免下載；原生 App 提供 push（rain / 挑戰結果 / rakeback 里程碑提醒）。
- 介面對 timer / claim 按鈕有清楚視覺指示。

### 金流 / 模式（**僅記錄，CONTROL.avoid，不推進**）
- 真金 crypto（25+ 幣）、reCAPTCHA、KYC → 屬 avoid。

---

## ApexWin 對照

| Gamdom 特色 | ApexWin 現況 | 判定 |
|---|---|---|
| Crash/Roulette/Plinko/Dice | 皆有 | ✅ 已有 |
| **Hilo Original** | 無 | ❌ **缺口（新玩法）** |
| Originals Roulette 內建 jackpot | #9 三級 jackpot（全站掛鉤） | ✅ 已有（機制更完整） |
| Instant rakeback / 隨時領 pot | `HL.rakeback` + #22 每日領桶（已開卡） | ✅ 已有/規劃中 |
| 多階 VIP + 升級獎金 | `HL.vip` 5 級 + 升級獎金 | ✅ 已有（階數較少） |
| Reload Rewards 週期紅利 | 無週期 reload | ❌ **缺口**（與 Shuffle 共識，見 shuffle.md） |
| **Rain 聊天灑幣（社群留存引擎）** | 有聊天（競技場/直播間），**無 rain 灑幣** | ❌ **缺口（招牌）** |
| 新手啟用倒數窗口 | 有每日簽到，無「限時啟用窗口」 | ⚠️ 半缺 |

---

## 可落地點子（pure-frontend）

1. **Rain 聊天灑幣（Chat Rain）** — Gamdom 招牌社群留存引擎，ApexWin 已有聊天 UI（競技場/直播間）卻無灑幣。做法：每隔一段時間（或主播/系統觸發）聊天室「下雨」，**在窗口內於聊天室活躍**（近 N 分鐘有發言）的使用者按 claim 鈕分得 `HL.bonus`；附倒數條 + claim 按鈕 + 飄落動畫。純前端、localStorage 記錄參與資格，零牌照。**工作量 M**。這是把既有聊天死水通電、體驗完整度躍升的高 ROI 項。
2. **新 Original：Hilo（猜高低）** — 對標 Gamdom/Stake Hilo。翻牌猜下一張更高/更低，連對累乘、隨時兌現（機制近 Mines/Towers 的互動回合）。大量複用 `HL.instant` + `HL.fair` 可驗證亂數。**工作量 M**。與 #23 Towers 同屬「補 Original 數」的互動回合家族，可排在 Towers 後。
3. **VIP 週期 Reload Rewards** — 與 Shuffle 共識（見 shuffle.md 點子 1），兩平台交叉驗證 → **強烈建議優先**。在 `HL.vip` 上依等級給 daily/weekly/monthly 固定可領紅利。**工作量 M**。
4. **新手限時啟用窗口（onboarding countdown）** — 對標 Gamdom 登入後底部 6 小時倒數。新用戶首登給「X 小時內完成首注/簽到 → 領啟用大禮包」倒數條，提升首日轉化。沿用 #17 daily-gate 計時模式。**工作量 S**。

---

## 2026-07-31 刷新（平台軌 catchup 輪 · 逾期 5 天補刷）

**定位不變**：crypto casino + CS:GO 起家社群站，7,000+ 遊戲，社群感（聊天/rain/排行榜）為核心差異點。

**校正既有記載**：
- 忠誠制正名為 **Gamdom Royalty Club（Rewards 2.0）**：**8 大階 × 24 級**（Bronze/Silver/Gold/Emerald/Sapphire/Ruby/Diamond/**Opal**）——與舊記「8 階 24 子階」相符，本輪補上 Opal 為頂階與 Rewards 2.0 品牌名。
- rakeback 分 instant / weekly / monthly 三桶，隨階提升，對外宣稱**上限 60%**（舊記首 7 天 15% 為另一促銷軸，不衝突）。
- 排行榜校正為**雙節奏**：**King of the Hill 月賽 $500k** + **每日榜上限 $30k**。
- Rain 仍為招牌（rainbot 定期向「當下在聊天室的活躍者」發幣）。

**舊記缺口已關閉**（本輪 grep 實證）：「Rain 灑幣」→ `core/rain.js`；「Hilo」→ `views/instant-hilo.js`；「VIP 週期 Reload」→ `core/reload.js`；「新手限時窗口」→ `core/onboarding.js`。

**淨新訊號＝促銷「依 rank + playstyle 個人化」**：
評測一致描述其獎勵為 **tailored bonuses customized to your rank and playstyle**、高階享 bespoke promotions 與專屬 VIP 經理。
- **去重裁決（不開新卡）**：這與 **bet365 2026「targeted offers / 輪替式個人化促銷」**（07-28 已記）**收斂為同一件事＝促銷受眾分群 / 個人化**，而台帳「促銷/活動框架」的 **A-B 測試與分群** 早已明列為 weak 的殘餘缺口，且佇列已有 **#52（promo opt-in「我的優惠」）** 與 **#54（上架排程 × 受眾分層 audience）** 兩張未實作卡覆蓋相鄰面。
- 依去重紀律（比照 07-30 toshi-bet 併入 #52 的先例）：**歸併為既有缺口的第二個平台共識訊號**，記入台帳 evidence，**不重複開卡**。#54 的 `audience` 描述子未來即為此訊號的落點。

**未達開卡門檻、僅記錄**：King of the Hill 日/月雙節奏排行榜——ApexWin `HL.tournament` 為 3 小時一期單節奏（`DURATION = 3 * 3600 * 1000`），差異屬**參數/排程**而非機制，且 #49 `HL.promoCal` 已提供排程軸；不值一張卡。

---

## 2026-08-30 刷新（平台軌 14:00 窗 · 到期當日刷 · **取材角度＝活動/促銷層**，配對本窗台帳輪替格）

> **為什麼換角度**：07-31 那輪已把「留存/rakeback/VIP 階梯」這條線挖到零新開卡（見上一節）。
> SKILL 第 1 步的紀律是「每輪重新取材、不吃固定清單」，而 08-30 08:00 窗剛示範過**把取材角度
> 對準本窗要審的台帳分類**（那輪對「前台外觀/瀏覽層」）。本輪台帳輪替到 **活動**，故本節只挖活動層。

**定位與忠誠制不變**（Royalty Club 8 階 × 24 級、三桶 rakeback 上限 60% ——與 07-31 記載逐項相符，不重抄）。

**活動層形制（本輪淨新）**：
- **King of the Hill 排行榜**：對外口徑本輪為**月賽 $1M + 每日 $10k**（07-31 記為月 $500k／日上限 $30k）。
  ⇒ **這是行銷數字的季度調整，不是機制變化**；本檔不追這個數字，僅記「日/月雙節奏」這個**機制**穩定未變。
- **Multiplier Clash / Weekend Wager races** — 輪替式賽事，兩種賽制**並存**：一種吃倍數、一種吃流水量。
- **⭐ Tuesday Free Spins Giveaway 綁定「Game of the Week」** — 每週輪替一款指定遊戲，
  該週的免費旋轉只能用在那一款上；VIP 另有專屬場次。
  **這是本輪唯一的結構性訊號**：促銷的**資格與計分綁定在單一款遊戲上**，而且**每週輪替**。

**ApexWin 對照**：
- 它有 / ApexWin 已有：日/月雙節奏排行榜 → `HL.tournament`（3 小時單節奏，屬**參數差**，07-31 已裁決不開卡，本輪維持）；
  倍數型賽事 → `core/challenges.js` 的 `m2/m10/m50/rush25`（單局 `win/bet` 門檻）**已在位**；
  輪替排程 → `HL.promoCal`（#49）**已在位**，7 個外部註冊者。
- **它有 / ApexWin 缺**：**「這個促銷只在指定遊戲算」這件事本身**。
  `core/challenges.js` 的 `record(game, bet, win)` **收得到 `game`**（中央點 `live-stats.js` 每局傳真值），
  但函式體內對 `game` 的讀取次數是 **0**（全檔 `game` 僅 2 次命中：一次在檔頭註解、一次在簽名）。
  ⇒ Game of the Week 這一整類形制在**架構上做不出來**，而簽名看起來是完整的。
  ⇒ **本輪開卡 #149**（詳見 BACKLOG；同窗已先立常駐鎖 `platform/central-hook-game-arg-consumed` 把這條線量起來）。

**可落地點子（純前端，附工作量）**
1. **指定遊戲挑戰（Game of the Week）** — S–M。`challenges.js` 的 spec 加 `games: []` 選用欄位，
   `record()` 讀已經收到的 `game` 做比對；未宣告 `games` 者行為逐位不變（加法式零回歸）。⇒ 已成 #149。
2. **賽制軸（倍數 vs 流水）並存** — S。`HL.tournament` 已有 `scoreAxis`（#85 記載），
   缺的只是**同時開兩種賽制**的容器；優先序低於 #149，本輪不開卡（`max_cards_per_run` 留給更高價值者）。
3. **每週輪替的「指定標的」抽象** — S，但**刻意不開**：`HL.promoCal` 已是排程軸，
   #149 落地後「每週換一款」只是註冊一條 promo，不需要新容器（容器先於內容的反面：容器已經在了）。
