# Stake.us — 調研檔

- **平台**：Stake.us（Stake 的美國社交/sweepstakes 版）
- **url**：https://stake.us
- **調研日期**：2026-06-29
- **tier**：2　**priority**：80
- **regions**：global, northamerica
- **category**：social, sweepstakes, originals, casino
- **定位**：純前端社交模式（無真金博弈），雙幣制（Gold Coins 純娛樂 + Stake Cash 可兌獎）。**與 ApexWin GC/SC 定位最貼合的對標。**

---

## 特色表（聚焦純前端可學）

### 雙幣經濟（核心）
- **Gold Coins (GC)**：純娛樂、**永不可兌換**，故無流水要求。
- **Stake Cash (SC)**：可兌獎，**帶 3x playthrough（流水）**——bonus SC 需玩過 3 倍才轉成可提取餘額。
- 兌獎（真金/禮卡）= 牌照範疇 → **avoid，只學前端記帳/流水/雙餘額呈現**。

### 留存系統
- **每日登入**：固定 10,000 GC + 1 SC，登入後到 Wallet 一鍵領，無需碼。
- **31 天延展歡迎包**：歡迎禮 250k GC + 25 SC（輸入碼領），其餘 310k GC + 31 SC 要**連續登入 31 天逐日解鎖**（首月最高 560k GC + 56 SC）——典型「長尾連登階梯」。
- **每日挑戰**：完成任務領 GC + SC。
- **Slot races / 賽事 / 社群贈獎**頻繁。

### 促銷：Bonus Drops（招牌、ApexWin 最缺）
- 每天在站外（X / Telegram / Instagram）+ 站內掉**限時兌換碼**，**單筆 1–5 SC、會過期、要搶在失效前領**，於 `Settings > Offers` 兌換。
- **每週六 10:00 EDT 老闆「Eddie」在 Kick 直播**釋出高價值碼（5–50 SC）——把「限時掉碼」與**直播**綁定的病毒鉤子。

### 遊戲 / Originals
- 18 款 Stake Originals：Crash / Keno / Limbo / Plinko / Wheel / Scarab Spin…+ 2,000+ 第三方（Hacksaw 等）。
- 流水友善玩法引導（Dice 設 98% 勝率低風險刷流水、Plinko Low 8–10 排穩刷）——**把流水要求做成「玩法引導」而非懲罰**。

### UX
- 沿用 Stake 乾淨深色資訊架構；Wallet 為領獎中樞。

---

## ApexWin 對照

| 維度 | Stake.us 有 | ApexWin 現況 |
|---|---|---|
| 雙幣制（GC 純娛樂 / SC 帶流水可兌） | ✅ 核心 | ⚠️ 有 casual/real 模式 + 單一 HL.money，**無 GC/SC 雙餘額 + 流水分離**（=待批准 #20 流水引擎缺口） |
| 每日登入領獎 | ✅ 固定 + 31 天延展 | ✅ 7 天簽到 streak（**但無連登長尾階梯/里程碑日**） |
| 兌換碼 | ✅ **限時、會過期、頻掉** | ✅ #19 Redeem（**靜態碼表、不過期、不推播**） |
| 每日挑戰領獎 | ✅ | ✅ #6 每日任務（已涵蓋） |
| Originals | ✅ 18 款 | ✅ 7 款（Towers/Hilo/Keno 已排佇列補） |
| 直播掉碼 | ✅ Eddie 週六直播 | ⚠️ 有虛擬主播 + 直播間（**未與掉碼/領獎綁定**） |

---

## 可落地點子（pure-frontend）

1. **限時 Bonus Drop 掉碼系統（招牌缺口）** — M。把 #19 靜態 Redeem 升級為「**排程掉碼**」：碼帶 `start/expire` 時戳 + 倒數，到期作廢；掉碼時經 `HL.notify` 推播紅點 + 通知中心一條「⏰ 限時禮包，X 分後失效」，導去輸入框。對標 Stake.us Bonus Drops。複用既有 `HL.redeem` + `HL.notify` + #17 daily-gate 計時 + #22 逾期作廢模式。
2. **連登長尾階梯 + 里程碑日** — S–M。現有 7 天簽到擴成「**遞增獎勵 + 第 8/15/22/30 天里程碑大禮**」（Stake.us 31 天 / Crown Coins 里程碑日共識）。複用既有簽到 streak 狀態，純加值。
3. **直播間掉碼綁定** — S–M。把點子 1 的限時碼**在直播間/主播 PiP 浮層彈出**（對標 Eddie 週六直播放碼），觀看直播時專屬掉落 → 把既有虛擬主播從「裝飾」變「領獎入口」，與留存相乘。
4. **GC/SC 雙幣 + 流水呈現** — L（**=已待批准 #20**）。Stake.us 的 SC 3x playthrough 正是 #20 紅利/流水引擎要做的「bonus vs cash 分離 + 流水進度」；本調研**強化 #20 優先度**（兌獎本身=avoid，只做前端記帳/進度條/閘控）。
5. **流水「玩法引導」而非懲罰** — S。在帶流水的 bonus 旁提示「用 Dice 98% / Plinko Low 低風險刷流水」捷徑（待 #20 上線後接）。

> **最關鍵缺口**：①限時/會過期的 **Bonus Drop 掉碼**（ApexWin 兌換碼是靜態的，缺「限時搶領」的緊迫感與推播）；②**連登長尾階梯 + 里程碑日**（簽到只有平 7 天循環）。

---

## 來源
- [Stake.us Daily Bonus（Strafe）](https://www.strafe.com/esports-betting/reviews/stake-us/daily-bonus/)
- [Stake.us Review 560K GC + $56 SC（Casino.org）](https://www.casino.org/us/sweepstakes-casinos/stake/)
- [Stake.us Bonus Drop Codes（Next.io）](https://next.io/sweepstakes-casinos-us/stake-us/bonus-drop-codes/)
- [Stake.us Bonus Drops（Deadspin）](https://deadspin.com/sweepstakes-casinos/reviews/stake-us/bonus-drop-code/)
- [Stake.us 官網](https://stake.us/)
