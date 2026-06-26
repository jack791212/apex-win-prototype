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
