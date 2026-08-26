# LeoVegas — 調研檔

- **URL**：https://www.leovegas.com
- **調研日期**：2026-06-26
- **Tier**：2（地區頂級 · 歐洲/亞洲，14 天刷新）
- **Regions**：europe, asia
- **定位**：「King of Mobile Casinos」行動優先娛樂城；MGM 集團旗下、歐洲持牌大品牌。核心為**真金真人荷官**（avoid 範疇），可學處集中在**行動 UX + 分層 VIP + 限時掉落獎勵的呈現**。

## 特色表（聚焦純前端可學）

### 留存系統
- **VIP Bar — 99 層微等級**：押注累積沿 99 階「VIP 進度條」推進，逐層解鎖。比起常見 5~10 段，超細粒度讓「下一階只差一點」的推進感幾乎隨時在線。
- **The Club**（VIP 專屬）：獨家真人桌、專屬錦標賽、Key Account Manager、實體禮/生日禮。本質是**會員分層 + 專屬內容門禁**。
- **每週 10% 真人娛樂城回饋**（cashback）＝返水機制的週期版。

### 促銷/紅利
- **Daily Prize Drops / 「Ready to Drop」**：每月分配約數百萬獎金，含**「必須在指定時間前掉落」的進度型 jackpot**——卡片上顯示倒數＋「即將掉落」狀態，製造急迫感與發現性。（底層多為 Pragmatic「Drops & Wins」：遊戲中隨機集 3 片觸發垂直轉盤，給倍數/免費旋轉/即時紅利。）
- 既有玩家持續餵：免費旋轉、無存款優惠、錦標賽、cash drops、免費籌碼。

### UX/上手
- **行動優先、低摩擦導航**：更少點擊到存款、更快到「我的最愛」、客服一鍵直達；以「child's play」直覺介面為招牌。為 ApexWin PWA 導航精簡的對標範本。
- iOS/Android 原生 App（App Store 上架），但 PWA 路線也能學其資訊架構。

### 金流/模式（只記錄，**不推進** — CONTROL.avoid）
- 真金、真人荷官、地區牌照、KYC、提款 — 全屬牌照範疇，僅供 UX 觀察，不開卡。

## ApexWin 對照

| LeoVegas 有 | ApexWin 狀態 |
|---|---|
| VIP 分層 + 升級獎金 | ✅ 已有，但僅 **5 段**（`HL.vip`） |
| 99 層**微等級**進度條 | ❌ 缺：粒度太粗，缺「永遠差一點」推進感 |
| 週期 cashback / 返水 | ✅ 已有 `HL.rakeback`（即時）；日桶待做 #22 |
| 限時掉落 jackpot | ⚠️ 部分：`HL.jackpot` 有三級遞增＋命中演出，但**無「必須在 X 前掉落」的倒數呈現** |
| 每日 prize drops / 轉盤 | ✅ 已有 Lucky Spin #17、錦標賽 #15、Raffle #18 |
| 行動優先低摩擦導航 | ✅ PWA 已具骨架，可借鏡精簡 |
| VIP 專屬門禁內容（The Club） | ❌ 缺：無「依等級解鎖專區」UI |

## 可落地點子（pure-frontend）

1. **VIP 微等級進度條（多階細分）** — 對標 LeoVegas 99-tier VIP Bar。在既有 `HL.vip` 5 大段位內再切「子等級/進度刻度」，header 與 VIP 面板顯示「距下一刻度 X 押注」。純前端、複用既有押注累積，**強化高頻推進感**。工作量 **S–M**。
2. **「必須掉落」限時 Jackpot 呈現** — 對標 LeoVegas Ready-to-Drop / Pragmatic Drops&Wins。為既有 `HL.jackpot` MINI/MAJOR 加「保證在倒數歸零前掉落」模式：卡片＋大廳橫幅顯示倒數，到點懶觸發派給線上玩家（沿用 #18 Raffle 的懶觸發/冪等模式）。工作量 **M**。
3. **VIP 專屬門禁區（The Club）** — 對標 The Club。大廳新增「VIP 專區」分頁，依 `HL.vip` 等級解鎖獨家促銷卡/錦標賽入口；未達等級顯示「升到 Lv X 解鎖」鎖頭。純前端門禁 UI，**讓 VIP 等級有看得見的內容回報**。工作量 **S**。
4. **行動導航低摩擦審查** — 對標 LeoVegas「更少點擊」原則。盤點 ApexWin PWA：存款/最愛/客服各需幾次點擊，能否縮短。工作量 **S**（審查＋微調）。

> 與既有任務的關係：點子 2 與 #20 流水引擎、#22 rakeback 日桶不衝突；點子 1 是 `HL.vip` 的純加值，可作為下一輪 evolve 候選。

---

## 🔄 刷新 2026-07-10（14 天週期回訪）

**定位 reconfirm**：續為「King of Mobile Casino」；2,000+ 遊戲、跨裝置即時同步、loyalty points 即時更新、一鍵最愛/客服。核心（真金/真人荷官/提款）仍屬 avoid，無定位變動。

**本輪新增訊號（兩點）**：

1. **CompetitionLabs 遊戲化引擎**（`egr.global` 報導）：LeoVegas 以第三方遊戲化平台，依**玩家資料即時生成** tournaments / missions / achievements / 個人化促銷。前端可學維度＝**成就系統（achievements）＋即時錦標賽計分呈現**，以及「促銷因人而異」的個人化卡片編排。ApexWin 現有 #15 錦標賽、#6 Missions，但**無「成就徽章/里程碑收集」層**（一次性、可累積的成就牆），此為與既有任務不重疊的小新缺口。
2. **Loss insurance（虧損保險）作為 VIP 福利**：多家 2026 評測列 VIP 階梯（Bronze→Diamond）福利含 cashback **＋ loss insurance**。與 #33 淨損 cashback 相鄰但角度不同：cashback 是「按比例退」、loss insurance 偏「達門檻後對本金/首存做保險式補償」。僅記錄為 #33 的規格分支參考，不另開卡（避免與 #33 重疊）。

**本輪判定**：既有 4 個 pure-frontend 點子（VIP 微等級進度條、必掉落限時 Jackpot、VIP 專屬門禁 The Club、行動導航精簡）仍為此平台**最有價值且未實作**的缺口，優先序不變。新訊號中唯一值得升級為 evolve 候選的是「**成就/里程碑徽章牆**」（achievements 收集層），其餘（個人化促銷引擎＝偏後端、loss insurance＝#33 分支）僅記錄。

**下次到期**：2026-07-24（+14 天）。

---

## 🔄 刷新 2026-07-30（tier-2 逾期 6 天補刷 · 維護軌 M1 健檢點名為「次逾期最久」）

**定位 reconfirm**：續為「King of Mobile」（MGM 旗下歐洲持牌）；跨裝置 session 即時同步、loyalty points 即時更新、award-winning iOS/Android app。核心（真金/真人荷官/KYC）仍屬 `avoid`，無定位變動。

**本輪淨新訊號（一點，且是本輪最有價值發現）**：

1. **No-wager free spins（零流水免費旋轉）＝紅利型別缺口**：2026 多家評測一致點名 LeoVegas 頻繁推「**no-wager** free spins，贏分直接轉為**可提領**資金」，並輔以 points→bonus funds 兌換與 Bronze 5%→Diamond 20% 的階梯 cashback。
   - **ApexWin 對照**：`HL.bonus`（#20 流水引擎）**只有一種紅利型別**——所有 bonus 一律入 `locked` 待流水達標（真站 `WAGER_MULT` 8×）。要送「零流水獎」在現行架構下**只能繞過 bonus 引擎直接改餘額**，而那會同時繞過 `source` 標記與 `HL.ledger` 記帳 ⇒ 不是「還沒做這個活動」，而是**引擎缺一個型別維度**。
   - **落地方向（S · 資料驅動）**：紅利 spec 增選用欄位 `wagerMult`（未宣告＝沿用全域值；宣告 `0`＝直入可提餘額但**照樣走 bonus.add → ledger.record**，帳目與標記完整）。已寫入台帳「獎金/流水引擎」條目（present→partial），列為候選點子而非開卡（本輪 `max_cards_per_run: 2` 已用於 #55/#56）。

**既有點子狀態**：4 個舊點子中「成就徽章牆」已於 #45 落地、「loss insurance」已於 #48 落地；剩「必掉落限時 Jackpot」(M)、「VIP 專屬門禁 The Club」(S)、「行動導航低摩擦審查」(S) 仍未做且仍有效。

**下次到期**：2026-08-13（+14 天）。

---

## 🔄 刷新 2026-08-12（tier-2 · `next_due` 08-13 提前一天刷 · 本輪全庫唯一到期票）

**定位 reconfirm**：續為「King of Mobile」（MGM 旗下歐洲持牌）。核心（真金/真人荷官/KYC）仍屬 `avoid`，無定位變動。本輪查得的常態促銷群（Monday Reload 25–50%、Happy Hour、Weekend Booster 雙倍點數、Birthday Month、每日最多 100 次 bonus spins 連發一週）**逐項對照後全數已覆蓋或已刻意排除**，詳下。

**淨新訊號＝1 條（且它揭露的是引擎缺一個維度，不是缺一檔活動）**

1. ⭐ **Golden Chips＝「限定可用範圍」的紅利**：真人娛樂城迎新給 10 枚 Golden Chips（每枚上限 $5），評測明載其 **「can be used only in Playtech games」** 且 **「will be split across five days」**。兩個性質分開看：
   - **切成五天、每片各自到期** ⇒ **#87（Roobet Vault 逐片到期軸）的第二平台佐證**，形制完全同型（一次授予、分片、各自到期）。連同「free spins spread across your first three deposits」與「spins 須 3 天內完成流水」＝同一家就有三處分片/逐片時限。**不另開卡，寫進 #87 卡體**。
   - ⭐ **「只能在某一類遊戲使用」＝ApexWin 完全沒有的維度**。grep 機械實證：`grep -rn "eligibleGames\|allowedGames\|gameScope\|onlyGames" core` **0 命中**；更根本的是 **`HL.bonus.onWager(bet)` 的簽章裡沒有 `game`**（`core/live-stats.js:31`）——中央結算點明明帶著 `game`，卻只把它傳給 `edge`／`rakeback`／`challenges`／`heat`／`achievements`／`betlog`，**送到紅利引擎時被丟掉**。⇒ 紅利在架構上**不可能**知道這一注押在哪款遊戲，「這筆紅利只能在 slot 打流水」這種業界最標準的紅利條款**做不出來** ⇒ 開卡 **#89**。
   - ⚠️ 值得記一筆的結構巧合：這與本輪實作的 **#85** 是**同一個形狀的缺陷**——`tournament.record(bet)` 當初同樣把 `game` 丟掉，導致競賽只能有單一全站榜。**「game 軸只走到一半」是這個中央掛鉤的系統性問題**，`bonus` 是目前已知還沒接上的最後一個大消費端。

**逐項對照（四項看似新的訊號，經 grep 全數證實已覆蓋或已刻意排除＝本輪省下四張假卡）**

| LeoVegas 訊號 | ApexWin 實況（機械實證） | 處置 |
|---|---|---|
| Weekend Booster（週末雙倍點數） | `core/progress-src.js` 已有 `xpForBoosted` + `resolveBoost`，假站 `BOOST_CAP.demo = 2.0`＝**恰好就是「雙倍點數」**；「週末」這個時間軸由 #49 `promoCal` 的 `recurring` 與 #81 `rakeboost.registerTriggered` 提供 | 已覆蓋，不開卡 |
| Monday Reload 25–50% | `core/reload.js`（#? 週期紅利，`source: "Reload 週期紅利"`） | 已覆蓋 |
| Happy Hour | `core/happyhour.js` | 已覆蓋 |
| Birthday Month | `grep birthday` **0＝真缺**，但需生日欄位（近 KYC）且價值低 | 同 08-11 crown-coins 的處置：**據實記錄、刻意不開卡** |
| 99 層 VIP 微等級 / The Club 門禁 | 舊點子，狀態不變（`HL.vip` 為粗段位；門禁已由 #54 `release` 的 `audience` 覆蓋一半） | 保留為舊點子 |

**既有點子狀態**：「成就徽章牆」#45 已落地、「loss insurance」#48 已落地、「no-wager free spins」已由 #20 的 `wagerFree` + #63 的段位 `wagerMult` 覆蓋（07-30 記的引擎缺口**已被後續卡消化**，此處據實更正）。剩「必掉落限時 Jackpot」(M)、「行動導航低摩擦審查」(S) 仍未做且仍有效。

**下次到期**：2026-08-26（+14 天）。

---

## 🔄 刷新 2026-08-26（tier-2 · `next_due` 08-26 到期票 · 本輪全庫唯一到期）

**定位 reconfirm**：續為「King of Mobile」（MGM 旗下歐洲持牌）。核心（真金/真人荷官/KYC/體育投注）仍屬 `avoid`，無定位變動。

**淨新訊號＝0 條（據實記載，不硬湊）**

本輪兩次搜尋回來的可用訊號只有兩條，逐條檢視後**都不產生 ApexWin 缺口**：

| LeoVegas 訊號（2026） | 為何不成為缺口 |
|---|---|
| **App UI 改版**：官方更新紀錄稱新版「更緊湊、更好讀、更快進到玩」 | 純視覺改版，**沒有可對照的形制**（沒有新表面、沒有新機制）。要對標得看得到畫面，而排程軌拿不到 preview（08-24 20:00 窗已機械證實）⇒ 不寫成點子 |
| **2026-04 擴充 CFL/NHL/NBA 賽事投注 + Ontario iGaming 合規更新** | 整段落在 `CONTROL.avoid`（體育投注真接入／法域合規），**刻意不開卡** |
| 責任博弈工具細節（存款/損失/時段限額、24h–永久自我排除、reality check、可自助啟用不需客服） | 逐項比對後**全數已覆蓋**：限額三週期＝#70、暫停期間註冊表與不可提前解除＝#96、冷靜期＝既有 `rg/cooling-off`。**這是 08-16 補上「玩家保護」維度後第三次確認本站已追平**，不再重複記載 |

⇒ 本輪 leovegas 的價值在於**確認沒有退步、也沒有新形制**，而不是生出點子。連續兩輪（08-12 有 1 條、本輪 0 條）顯示這一票的邊際產出正在下降；
若下一輪（09-09）仍為 0，建議把 `refresh_interval_days` 由 14 拉長到 21，把配額讓給還沒被任何維度掃過的表面。

**本輪真正的產出不在這份 dossier**：台帳輪替到「後台」，而後台在任何 casino 的前台都看不到 ⇒ 改向 **B2B 平台供應商**取材，命中 SOFTSWISS **Motion**（trigger–condition–action）與 GR8 **Journey Builder** 同型 ⇒ 台帳新增模組「營運自動化規則」+ 開卡 **#131**。詳見 `intel/db/platforms.json` 的 `_sourcing_negative_log` 2026-08-26 條與 `intel/db/platform-modules.json`。

**既有點子狀態**：「必掉落限時 Jackpot」(M)、「行動導航低摩擦審查」(S) 仍未做且仍有效（後者需 preview，同上受阻）。

**下次到期**：2026-09-09（+14 天）。
