# Deal or No Deal Win — 調研檔

- **URL**: https://dealornodealwin.com
- **調研日期**: 2026-07-04（首次深挖）
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
