# Deal or No Deal Win — 調研檔

- **URL**: https://dealornodealwin.com
- **調研日期**: 2026-07-04（首次深挖）｜**2026-08-06 到期補刷**（見文末「2026-08-06 刷新」）
- **tier**: 3 ·  **priority**: 54
- **regions**: northamerica, global
- **營運**: Mamba Limited（**Zonko P57 的姊妹站**）；持 Banijay 授權電視節目品牌 IP「Deal or No Deal」
- **定位**: 2026-03 上線的新 sweepstakes 社交賭場，雙幣 GC+SC，500+ slots/scratch/shooting，<60s 極速註冊。多榜（sweepskings/deadspin/next.io/rg.org）列為「遊戲化獎勵生態最全方位之一，但取得免費 SC 的管道偏少 + Purchase Now 窗口偏激進」。

---

## 特色表

### 留存 / 獎勵系統（本輪重點）
- **★ Stars 點數 + Star Shop（招牌 · 本輪頭號產出）**：Stars 主要靠**完成 missions** 賺得，同時**兼作 VIP 經驗值**。可在 Store 兌換——**關鍵：兌換是「機率型」而非固定目錄**：
  - 「Cupid's Choice 需 1,000 Stars，**給 up to 1.25 SC**」
  - 「Romance Riches 需 1,750 Stars，**offers up to 2 SC**」
  - 「Mystic Scratchcard」也是 Star Shop 品項之一。
  - 「up to」措辭＝**每次兌換結果隨機**（花固定點數，換到的 SC 是機率分佈）＝**gacha 式兌換層**（本輪確認船長假設成立）。
- **Power Boost**：首購一次性觸發後，**接下來 8 天每日登入獎勵被放大**＝與姊妹站 Zonko「8-Day Reward Track」同源的 front-loaded 多日養成軌（battle-pass/連登進度主題再獲一次姊妹站共識）。
- **每日登入獎勵**：首次登入僅 500 GC，**隨天數遞增**（遞增連登，佐證 #34）。
- **Missions**：日/週/特殊主題三型，任務內容＝玩指定遊戲 N 次、命中特定倍數等；獎勵可為 GC/SC/**Stars**。
- **Weekly Scratchcard**：週常刮刮卡獎勵（reveal 機制）。
- **VIP**：7 級，靠 Stars 當 XP 推進；tier 福利描述模糊，「collecting stars may unlock hidden missions and tournaments」。

### 促銷 / 紅利
- 註冊禮 3,000 GC 免 code；首購最高 112,000 GC + 65 free SC + 一次 Bonus/Welcome Wheel 轉盤。
- 幾乎所有 GC 購買包都附贈免費 SC（唯 $15 包只給 15k GC）。
- Slot 錦標賽 / contests。

### 遊戲
- 500+ 遊戲：BTG、NetEnt、Playson 等 vendor；slots + scratch + shooting。
- **注意：招牌節目「Deal or No Deal」的選箱/開箱玩法本身並未實裝**（無真人荷官、無 RNG 桌台）——評測直指「a huge missed opportunity」。品牌 IP 僅為外皮，**選箱/開箱＝靈感來源，非可抄的實際功能**。

### UX / 上手
- 註冊約 1 分鐘。側欄 shortcut：Coin Shop / promotions / profile / redemptions / support。
- 大廳靠**拖曳** icon 而非箭頭切換（記錄，非優點）。純瀏覽器、無 App。

### 金流 / 模式（avoid，只記錄）
- 雙幣 GC（純娛樂）+ SC（可兌獎）；SC 需 **1x playthrough + 累積滿 100 SC + 帳號驗證**才能兌，1:1 USD。
- Banijay 品牌授權本身＝avoid（IP 法務）；部分州禁＝avoid。

---

## ApexWin 對照

| 維度 | Deal or No Deal Win | ApexWin 現況 |
|---|---|---|
| 點數商城消耗端 | Star Shop（Stars→兌換） | **#36 點數商城已在佇列**（賺→逛→換閉環） |
| **機率型兌換** | **「up to X SC」gacha 式隨機兌換** | **缺口**：#36 目前應為固定目錄，無「機率型兌換」分支 |
| 揭曉動畫 | Mystic/Weekly Scratchcard | **#38 揭曉型領獎元件已實作**（scratch/bubble/wheel） |
| 隨機派發 | 兌換結果隨機 | **#17 Lucky Spin 隨機派發引擎已有** |
| 首期多日養成軌 | Power Boost 8 天放大 | **#28 新手限時窗口 + #34 遞增連登**已實作（同主題，Zonko/DoND 姊妹站雙重佐證） |
| 遞增每日登入 | 500 GC 起遞增 | #34 遞增連登階梯已實作 |
| 節目式選箱/開箱 | 未實裝（只有品牌皮） | 不追（IP=avoid，僅呈現靈感） |

**結論：本平台幾乎無 ApexWin 全新缺口**——Power Boost/遞增登入/scratch 皆已被既有卡覆蓋。**唯一有價值的增量＝為既有 #36 點數商城補一條「機率型兌換」規格分支**，正好複用 #38 揭曉動畫 + #17 隨機派發引擎，**不另開重複卡**。

---

## 可落地點子（pure-frontend，餵給 evolve）

1. **#36 點數商城「機率型兌換」規格分支（併入 #36，不另開卡）** — S–M
   - 對標：DoND Star Shop「花 1,000 點 → up to 1.25 SC」的隨機兌換。
   - 做法：商城品項除既有「固定目錄」外，新增一類「機率包」品項：花固定點數 → 抽一個定義好的獎勵分佈（如 0.5/1.0/1.25 SC 加權）。**複用 #17 Lucky Spin 的加權隨機派發 + #38 reveal 揭曉動畫呈現開獎時刻**，入帳走既有 `HL.bonus`。
   - 好處：把 #36 的「逛→換」從確定性升級為「賭一把期待感」，消耗端多一條變異玩法，零新架構。
   - **注意（承既有備註）**：又是灌 `HL.bonus` 的來源，複利放大未解的 #20 流水/紅利引擎缺口——實作時掛在 #36 既有規格內，勿新增獨立 bonus 管道。

2. **（記錄，非新卡）Power Boost 8 天首購放大軌** — 已被 #28/#34 覆蓋
   - 姊妹站 Zonko「8-Day Reward Track」與本站 Power Boost 為同源設計，再次佐證 front-loaded 多日養成主題；ApexWin #28 新手窗口 + #34 遞增連登已落地，**無需新卡**，僅作主題再確認。

---

## 一句話總結
Mamba Limited 姊妹站雙人組（Zonko + DoND）的共同 DNA＝「Stars 點數 + 機率型 Star Shop + 多日 front-loaded 養成軌」。對 ApexWin 唯一增量＝**替 #36 補「機率型兌換」規格分支**（複用 #17+#38），其餘皆既有卡已覆蓋；品牌節目選箱玩法本站根本沒做，不追。

---

## 2026-08-06 刷新（tier-3 到期補刷 · 逾期 3 天）

### ⭐ 自我更正：本檔「唯一有價值的增量」早已落地（#42，34 天前）
- 上方對照表與「可落地點子 1」把 **「#36 點數商城缺機率型兌換分支」** 列為本站對 ApexWin 的**唯一增量**。**此斷言已過期**：`git log -S` 機械實證 → **`d400894` 「feat: #42 商城機率型兌換品項 命運寶箱（gacha 加權抽層 + 獎輪揭曉）」** 已落地；`core/shop.js` `CATALOG` 現有**兩種機率型 kind**——`mystery`（區間均勻隨機，`range:[150,2000]`）與 `gacha`（**加權分層、有小機率大獎尾**），兩者結算後皆走 `HL.reveal`（`scratch`／`wheel`）揭曉。
- ⇒ DoND Star Shop「花 1,000 Stars → **up to 1.25 SC**」＝ ApexWin `mystery`（花點數 → 區間隨機）的**逐字同構**；「加權大獎尾」ApexWin 甚至更完整。**本站現對 ApexWin 增量歸零**。
- **教訓（本輪第二筆、與 courtside.md 同型）**：dossier 的缺口欄位是寫檔當下的快照。**斷言「ApexWin 缺 X」前務必先 grep + `git log -S`**。

### 本輪查得的新事實
- **忠誠制正式覆核＝7 段 Stars 階梯**（Blue／Bronze／Silver／Gold／Black／Platinum／Diamond），Stars 為 VIP 的經驗值底座；高階「可解鎖 hidden missions 與 tournaments」。
- ⭐ **Stars 的取得來源＝「遊玩／完成任務」＋「選購 GC 幣包」兩條**（**⚠️ 來源衝突兩記不擇一**：搜尋摘要記「gameplay + optional GC purchases」、sweepskings 記「mission completion + specific bonuses」；兩者共同點是**不只投注**）。⇒ **這是 #65「進度來源註冊表」的第三個平台佐證**（前有 Spree「XP 來自遊玩＋買幣包」、BigPirate「升段來源兩條」）＝**三平台共識、#65 應上調優先序**。
- **Star Shop 具名品項與價格**：`Cupid's Choice 1,000 Stars → up to 1.25 SC`、`Romance Riches 1,750 Stars → up to 2 SC`（＝節慶主題輪替的機率包；ApexWin `shop.js` 為固定 6 品項**無主題輪替**，但 #49 `HL.promoCal` 已是排程容器 ⇒ 屬「接線」而非缺機制，記錄不成卡）。
- **每日登入禮＝500 GC 起遞增**（sweepskings 明載為**遞增確定值、非隨機**——**更正 07-04 本檔「隨機選給」的記載**，該說法來自另一家評測對「每日 GC 購買優惠」的描述，兩者被混為一談）。ApexWin `rewards.js` 30 天單調遞增 100→17,500 ＝**同型且更長**。
- **首購 $20 → 112,000 GC + 65 free SC + Infinity Wheel 轉一次**，價值沿 **8 天 Power Boost** 每日登入放大（與姊妹站 Zonko 8-Day Track 同源，ApexWin #28/#34 已覆蓋）。
- **庫存實測收斂**：**500+ slots**（classic／video／Megaways／bonus buys）+ ~20 fish shooter + **1 款 Keno**；**無桌台、無真人**（舊記「500+ slots/scratch/shooting」大致相符，本輪補上「無 table/live」這條**負向事實**——對 ApexWin 是反向佐證：ApexWin 的 TABLE 5 款屬相對優勢）。
- **大廳篩選維度＝`Newest`／`Best for Quick Wins`／供應商**。⭐ **`Best for Quick Wins` 是 ApexWin 沒有的排序維度**——它不是「熱門/最新」這種中性排序，而是**依玩法節奏（快結算）分群**；ApexWin 已有 `HL.edge` 逐遊戲莊優表與 `liveStats` 節奏資料，天生做得到，記錄為 UI/UX 分類候補（本輪不成卡，卡額已滿）。

### 本輪不改的判斷
- 品牌節目選箱（IP＝avoid）不追；sweepstakes 兌獎/KYC 屬 CONTROL.avoid。
- 本站已從「有一個增量」降為「**零增量、純對照樣本**」⇒ 建議下次刷新週期由 30 天**延長**（tier-3 且連兩輪零增量），留待 P6 結構裁決一併處理。
