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

## 來源
- [Crown Coins Review 100k CC + 2 SC（Casino.org）](https://www.casino.org/us/sweepstakes-casinos/crowncoins/)
- [Crown Coins Review（Legal Sports Report）](https://www.legalsportsreport.com/sweepstakes-casinos/crown-coins-casino/)
- [Best CrownCoins Slots（Next.io）](https://next.io/sweepstakes-casinos-us/crown-coins/slots/)
- [Crown Coins 官網](https://crowncoinscasino.com/)
