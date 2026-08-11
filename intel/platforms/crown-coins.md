# Crown Coins Casino — 調研檔

- **平台**：Crown Coins Casino（Sunflower Limited 營運，2023 上線）
- **url**：https://crowncoinscasino.com
- **調研日期**：2026-06-29
- **tier**：2　**priority**：75
- **regions**：northamerica, global
- **category**：social, sweepstakes, casino
- **定位**：US 第一梯隊 sweepstakes 社交賭場（iOS 4.8 星、10 萬+ 評；Trustpilot 業界最高評論量）。雙幣 Crown Coins (CC 純娛樂) + Sweeps Coins (SC 可兌獎)。**純前端社交模式，與 ApexWin GC/SC 定位高度貼合。**

---

## 特色表（聚焦純前端可學）

### 雙幣經濟
- **Crown Coins (CC)**：純娛樂。
- **Sweeps Coins (SC)**：可兌獎，**1x 流水**，滿 50 SC 才能兌（兌換經 Skrill/IBT/禮卡，1–3 天處理）→ 兌獎 = 牌照範疇 **avoid**。
- 註冊禮 100k CC + 2 SC（**無需碼、無需儲值**）；首購可加碼至 1.5M CC + 75 SC。

### 留存系統（重點）
- **7 天遞增每日登入**：Day 1 = 5,000 CC → **Day 7 = 50,000 CC + 1.5 SC**（逐日放大）。
- **里程碑日**：第 **8 / 15 / 22 / 30** 天另給額外 CC + SC——把「連登」拉成跨月長尾。
- **每日任務（Daily Missions）**：簡單任務領 CC + 免費 SC。
- **信箱（Mailbox）獎勵**：站內收件匣領取機制。
- **VIP「Crown VIP Club」6 階**：含 **Coinback 返幣、生日禮、額外免費幣**邀請制。

### 遊戲 / UX
- 450+ slots，含**自製獨家**（Pyramid King / Crown Treasures / Fortune 2 / Terrence 主題）；**無桌遊**。
- UI 極簡輕量、穩定不卡頓、「有個性」；**行動體驗業界最強之一**（官方 App iOS 4.8 星、快載入、直覺導航、bonus/遊戲/兌換全可用）。

---

## ApexWin 對照

| 維度 | Crown Coins 有 | ApexWin 現況 |
|---|---|---|
| 雙幣（CC 娛樂 / SC 1x 流水可兌） | ✅ | ⚠️ casual/real + 單一 HL.money，無雙餘額/流水分離（=待批准 #20） |
| **遞增每日登入 + 里程碑日（8/15/22/30）** | ✅ | ✅ 7 天簽到 streak（**無遞增放大、無里程碑日**） |
| 每日任務領獎 | ✅ | ✅ #6 每日任務（已涵蓋） |
| **信箱 / 收件匣領獎** | ✅ Mailbox | ✅ 有 #10 通知中心（**偏推播，非「可領取的禮物匣」**） |
| **VIP 生日禮** | ✅ | ❌ 無（HL.vip 只有升級/reload-排佇列） |
| VIP Coinback 返幣 | ✅ | ✅ #8 Rakeback + #22 日桶（已涵蓋） |
| 自製獨家 slots | ✅ 4+ 款 | ⚠️ slot 玩法有，但無「主題獨家」品牌化 |

---

## 可落地點子（pure-frontend）

1. **遞增連登階梯 + 里程碑日（最高 ROI、雙平台共識）** — S–M。現有 7 天簽到改為「**逐日遞增獎勵**（Day1→Day7 放大）+ 第 8/15/22/30 天**里程碑大禮**」。對標 Crown Coins 7 天遞增 + 里程碑日、Stake.us 31 天延展包。複用既有簽到 streak + `HL.bonus`，純加值狀態邏輯。**（與 stake-us.md 點子 2 為同一缺口，evolve 應合併成一張卡）**
2. **可領取「禮物信箱 / Inbox」** — S–M。在 #10 通知中心旁加「**可領取禮物匣**」——系統發的禮包（里程碑、補償、活動獎）落入信箱，使用者主動點「領取」入 `HL.bonus`（對標 Crown Coins Mailbox）。與通知中心區分：通知=唯讀資訊、信箱=可領動作。
3. **VIP 生日禮** — S。帳號設生日（profile），當日自動發一筆 VIP 等級加成的生日 bonus 入 `HL.bonus` + `HL.notify` 推播。Crown Coins VIP 特色，ApexWin 完全沒有、成本極低、情感留存高。
4. **主題獨家 Original 品牌化** — S（包裝）。把既有 slot/originals 包成「ApexWin 獨家系列」（命名 + 視覺角標），對標 Crown Coins 自製獨家（Pyramid King 等）拉辨識度。
5. **GC/SC 雙幣 + 1x 流水呈現** — L（**=待批准 #20**）。Crown Coins SC 1x 流水再次印證 #20 缺口；兌獎=avoid，只做前端雙餘額 + 流水進度 + 50 SC 門檻呈現。

> **最關鍵缺口**：①**遞增連登 + 里程碑日**（與 Stake.us 共識——ApexWin 簽到是平 7 天循環，缺放大與跨月里程碑）；②**可領取禮物信箱**（通知中心只能讀、不能領）；③**VIP 生日禮**（零成本情感鉤子，ApexWin 完全缺）。

---

## 2026-07-13 刷新（re-investigate）

- **reconfirm 既有招牌**：7 天遞增登入（Day1 5,000 CC → Day7 50,000 CC + 1.5 SC）、里程碑日（8/15/22/30）、Mailbox 信箱、6 階 Crown VIP Club（**Coinback 淨損最高 6% + 生日禮 + 免費幣**）皆不變 → 三大缺口（遞增連登+里程碑日、可領取禮物信箱、VIP 生日禮）**續為本檔最高優先**。
- **新訊號①＝Bingo 類別上線**：官方近期新增 Bingo 遊戲品類。→ ApexWin 目前無 Bingo，屬**潛在新內容軸線**，但為完整遊戲玩法（工作量 M–L）、非留存機制，優先序低於既有三大缺口；僅記錄，暫不開卡。
- **新訊號②（非新缺口）＝Crown Races 積分賽**：eligible slots 積分賽、獎池 15M CC / 750 SC、**top 100** 分獎，**計分＝總轉數的平方根（√spins）**＝抑制鯨魚、拉近長尾玩家的反線性曲線。→ **ApexWin 已有 #15 錦標賽/Slot Race 覆蓋**，故**不開新卡**；可借鑑細節＝**平方根計分曲線**（比純累加更公平、鼓勵中小玩家參與），作為 #15 計分策略的微調素材。
- 另確認 referral 獎勵、seasonal events、社群贈獎（與既有卡重疊，無淨新）。

> **本輪結論**：Crown Coins 為成熟對標，無足以開新卡的淨新缺口；三大既有缺口維持最高優先，其中「遞增連登+里程碑日」與 stake-us 為同一張合併卡，交由 evolve 消費。Bingo 為唯一新內容素材（低優先、僅記錄）。

---

## 來源
- [How Crown Coins Works（Deadspin）](https://deadspin.com/sweepstakes-casinos/reviews/crown-coins/how-it-works/)
- [Crown Coins Existing Player Promos（Next.io）](https://next.io/sweepstakes-casinos-us/crown-coins/existing-player-bonus/)
- [Crown Coins Review 100k CC + 2 SC（Casino.org）](https://www.casino.org/us/sweepstakes-casinos/crowncoins/)
- [Crown Coins Review（Legal Sports Report）](https://www.legalsportsreport.com/sweepstakes-casinos/crown-coins-casino/)
- [Best CrownCoins Slots（Next.io）](https://next.io/sweepstakes-casinos-us/crown-coins/slots/)
- [Crown Coins 官網](https://crowncoinscasino.com/)

---

## 2026-07-29 刷新（re-investigate）

- **reconfirm**：續居 US sweepstakes 榜首；遊戲庫成長至 **450+**；Crown VIP Club 仍為 6 階，**coinback 依階 2%（Bronze）→ 5%（Diamond）**，Diamond 另有 24 小時兌獎、生日禮。既有三大缺口（遞增連登+里程碑日、可領取禮物信箱、VIP 生日禮）狀態不變。
- **新訊號①＝Early Bird 新遊戲搶先體驗 / 獨家標題**：新遊戲**依排程分批開放**（先給特定族群/階級搶先玩），而非全站同時上架。
  → **ApexWin 對照**：`HL.games` 註冊表是「註冊即全站可見」的二元狀態，**沒有任何「何時對誰開放」的維度**；#49 `HL.promoCal` 已鋪好促銷排程軸，但**遊戲上架排程不在其中**。
  → 缺口性質＝**擴充性維度而非單一功能**（遊戲上架 = 排程 × 受眾），可掛既有 promoCal 排程底座。工作量 M。**本輪開卡 #54**。
- **新訊號②＝Crown Bingo Live 每日固定場次**：每日固定時段開局 + 獎池的 bingo 房。
  → ApexWin 無 Bingo 品類（07-13 已記錄為低優先內容軸線）；本輪維持不開卡（屬遊戲軌內容，非平台機制），但「**每日固定時段開局的房型**」與上面的排程軸同源，一併記入台帳。

> **本輪結論**：Crown Coins 本輪唯一**平台級**淨新缺口＝「內容/遊戲的上架排程 × 受眾分層」（Early Bird）。Bingo 屬遊戲軌素材，續為低優先記錄。

---

## 2026-08-11 刷新（re-investigate · tier-2 到期深挖）

**結論：淨新缺口 ≈ 0，但查獲一個結構性「軸」缺口（已開卡 #88）。** 本輪逐項對照，凡斷言「ApexWin 缺 X」一律先 grep（沿用 08-06 起的硬紀律）。

| Crown Coins 機制（實查） | ApexWin 現況（機械證據） | 判定 |
|---|---|---|
| 每日登入階梯 30 天、里程碑落 **第 8/15/22/30 天** | `core/rewards.js` LADDER + 里程碑**恰為 8/15/22/30**、第 30 天後 plateau | **已覆蓋**（形制幾乎逐位相同） |
| 連簽斷掉的處置 | #84（08-11 落地）連簽容錯：漏簽 1 天可保 streak | 已覆蓋且**更完整** |
| VIP 五階、coinback **2–6%** | 真站返現實裝 **2–6%**（CLAUDE.md §11） | 已覆蓋（數值恰同區間） |
| 每日任務 | `core/tasks.js`（#6/#26） | 已覆蓋 |
| 推薦好友獎勵 | #58 referral 已在佇列 | 已在案 |
| 每月獎勵 | reload 已有日/週/**月**三週期（i18n:164-168 三鍵齊備） | 已覆蓋 |
| 商城 Gold 階以上才開放 | `shop.js` 有 `VIP_DISCOUNT`（**依段位折扣**）但無 `minTier`（**依段位開放品項**） | **weak**：同軸不同做法，非真缺口 ⇒ 併入 #73（等級門檻解鎖），不另開卡 |
| 生日禮 | `grep -rni "birthday\|生日" src/` **0 命中** | 真缺，但需生日欄位（近 KYC）+ 價值低 ⇒ **刻意不開卡**，記此處備查 |
| **登入第 2、7 天送「幸運輪盤轉動」** | `grep "luckyspin" rewards.js` **0 命中** ⇒ 簽到只會發幣 | ⭐ **淨新（軸）** |

### ⭐ 唯一淨新＝簽到/日曆的「酬賞負載軸」被寫死成錢
`rewards.js:409-427` 的派發路徑是 `var amount = st.reward … HL.state.set({ balance: balance + amount })`＝**日獎恆為「一筆金額進主餘額」**，里程碑則進獎金錢包（locked）——兩種都仍是**錢**。Crown Coins 的第 2/7 天發的是**一次輪盤轉動**（一個可玩的東西），這在 ApexWin **無處可宣告**：要讓第 3 天發一次 `HL.luckyspin`，只能去改 `rewards.js` 的 claim 本體。

⇒ 開卡 **#88**。這與已在佇列的三軸屬同一家族、是第四條軸：#64＝資格的**遊戲**軸、#83＝**分配**軸、#85＝**計分**軸、#88＝**酬賞負載**軸。四軸齊備後，「第 2 天送一次輪盤、第 7 天送商城券」＝填表而非改派發本體。

**⚠️ 一筆刻意的克制**：本輪**不**把「雙幣 CC/SC」記為缺口——ApexWin 的 `HL.money` money-mode 就是同一件事的抽象（休閒/真金），CLAUDE.md 目標 4 已涵蓋。

**下次複驗**：2026-09-10（tier-2，30 天）。
