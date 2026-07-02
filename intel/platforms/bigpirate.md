# BigPirate — 調研檔

- **URL**：https://bigpirate.com
- **調研日期**：2026-07-02（首次深挖）
- **Tier / Priority**：T3 / P69
- **Regions**：northamerica, global
- **營運**：Rafflefy Limited，2025-12 上線的新 sweepstakes 社交賭場
- **定位**：把整個賭場包進一層持久養成 meta 遊戲「Adventure Mode 島戰探險」。與 Dorados「Lost City」PvP 養成形成**雙平台強共識**＝賭場之上的持久養成/PvP meta 層（ApexWin 完全空白的全新軸線）。

---

## 特色表

### 遊戲 / 規模
- 3,150+ 遊戲，50+ 供應商（3Oaks / RubyPlay / Hacksaw / Evolution / TaDa / Novomatic / Playson…），含真人桌（真人=avoid）。
- slots-first，另嵌一批遊戲化小遊戲（見下）。

### 招牌：Adventure Mode 島戰養成 meta 層
- **110+ 座可解鎖島嶼**：以 **Rum Coin** 為養成貨幣，蓋島 / 升級 / 解鎖新地點，逐步推進地圖探險。
- **進度式養成**：升級島嶼 → 提升等級 → 解鎖里程碑主獎（招牌 10,000 Diamonds 級大獎）。
- **PvP raid**：可 raid 其他玩家的島搶寶箱（內含數千 GC 或 Diamonds），有攻防要素。
- **24/7 離線照跑**：登出後 meta 進度仍持續運轉（放置/idle 型留存鉤子）。
- Rum 亦可花在 **Reward Market 點數商城**（換 free plays / Claw Machine 代幣）。

### 內嵌小遊戲（領獎/娛樂儀式）
- **Spin Rally**、**Claw Machine 夾娃娃**（抓 Diamonds / free plays）、**Wheel of Fortune 幸運輪**、**MegaGame 錦標賽**。
- Claw Machine 是「揭曉型領獎」的一種變體（把抽獎包裝成夾取動作）。

### 多幣經濟（四幣）
- **GC（Gold Coins）**：純娛樂遊玩幣。
- **Diamonds**：= Sweeps Coins，可兌換真實獎勵。
- **Rum**：meta 養成 + Reward Market 專用幣。
- **Claw Machine Credits**：夾娃娃專用代幣。
- → 明確的「娛樂幣 / 兌獎幣 / 養成幣 / 小遊戲幣」四層分工。

### 留存 / VIP
- **每日登入寶箱**：treasure chest 開出 5,000–100,000 GC（隨機/漸增）。
- **5 級 VIP**：專屬 VIP 經理、免費 Rum、專屬儲值包、**生日禮**、獨家優惠。
- 註冊禮：20,000 GC + 2 Diamonds + 2 Rum（驗證 email 後）。

### 金流 / 模式（avoid，只記錄）
- sweepstakes 雙/多幣社交模式（無真金），但部分美國州禁 sweepstakes = 法規 avoid，只學前端機制。

---

## ApexWin 對照

| BigPirate 機制 | ApexWin 現況 |
|---|---|
| Adventure Mode 島戰養成 meta 層 | **完全空白**（無任何「賭場之上」的持久養成層）— 與 Dorados 雙共識 |
| PvP raid 搶別人資源 | 空白（#15 排名賽是競速、非互搶資源；#9 Jackpot 是單人命中） |
| 24/7 離線照跑的 idle 進度 | 空白（無放置/idle 型鉤子） |
| Rum 養成幣 + Reward Market 商城 | 空白（無「點數消耗端 + 商品目錄」；與 Chancer Bonus Shop / Dorados Reward Market 三方共識） |
| 每日登入寶箱（隨機/漸增金額） | 部分有：#17 Lucky Spin 每日轉盤、#34 連登階梯（可整合為「寶箱式」呈現） |
| Claw Machine / Spin Rally / Wheel 等揭曉型小遊戲 | 部分有：Lucky Spin；缺「夾娃娃」「幸運輪」等多樣揭曉型演出 |
| 5 級 VIP + 生日禮 | 有 VIP 架構；**生日禮**空白（Toshi 曾提，候補） |
| 四層幣經濟 | 有 GC/SC 雙幣；缺養成幣 / 小遊戲幣的分層 |

---

## 可落地點子（pure-frontend）

1. **「賭場之上」的持久養成 meta 層（島戰/基地）**（對標 BigPirate Adventure + Dorados Lost City，**雙平台共識**，L）
   - 新增一層 meta 畫面：用養成幣（新增第三幣或複用既有點數）解鎖/升級「基地」節點，每升一層解鎖里程碑獎（灌 HL.bonus）。
   - **拆卡建議**：①基地養成骨架（節點/等級/里程碑獎，M）②養成幣的賺取（複用 HL.liveStats 逐注累積）③idle/離線進度（純前端用時間戳補算，S–M）。raid PvP 可用 #15 的 bot 名單當假想敵（M）。
   - 這是 ApexWin 全新軸線，建議 evolve 正式立骨架卡（L，可能需船長批准架構）。

2. **點數商城 Reward Market（消耗端經濟閉環）**（對標 BigPirate Reward Market + Dorados + Chancer Bonus Shop，**三方共識**，M）
   - 累點（複用 HL.liveStats）→ 逛商城花點數換 free spins / Lucky Spin 次數 / 小遊戲代幣（複用 HL.bonus 兌換 + #24 modal 骨架）。
   - ApexWin 一堆「發錢進獎金錢包」卻無消耗端，補上即成「賺→逛→換」完整生態。**建議優先 evolve**（共識最強、複用度最高）。

3. **通用「揭曉型領獎」元件 + 多樣小遊戲皮**（對標 Claw Machine / Wheel of Fortune / Spin Rally + Spree mini-game，S–M）
   - 做一個可複用的「先揭曉再入帳」元件，套皮成夾娃娃/幸運輪/刮刮卡，掛在所有領獎點（連登#34 / 任務#6 / Reload#24 / 寶箱）。把「直接入帳」升級為「先玩一下再入帳」的期待感時刻。（與 Spree 調研的同名點子完全共識）

4. **每日登入寶箱（隨機/漸增金額）**（對標 BigPirate treasure chest，S）
   - 把現有連登#34 / Lucky Spin#17 的視覺升級為「開寶箱」，金額隨連登天數放大、隨機揭曉，複用既有派發引擎。（可與點子 3 合併）

5. **生日禮 + VIP 專屬禮**（對標 BigPirate + Toshi 候補，S）
   - VIP 面板加生日禮領取（純前端記日期閘），小卡但補齊 VIP 情感留存。
