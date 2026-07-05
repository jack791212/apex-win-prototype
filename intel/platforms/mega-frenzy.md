# Mega Frenzy — 調研檔

- **URL**: https://megafrenzy.com
- **調研日期**: 2026-07-05（首次深挖，radar 2026-07-05 收編後指名快掃驗證 Hype Club）
- **tier**: 3 ｜ **priority**: 53
- **regions**: northamerica, global
- **category**: social / sweepstakes / casino / gamification
- **狀態**: ⚠️ **已停運（DEFUNCT）** — 2026-03-10 通知兩週後關閉新註冊，預計 2026-04 底完全關站。今日（07-05）已為死站，僅作歷史情報，**不再排入常態刷新輪替**。

---

## 特色表（重點）

### 留存系統 — 招牌「Hype Club」（本輪查證焦點）
- **11 段位 VIP 忠誠階梯**（Snap → … → Frenzy/Wild，Lv1–Lv10/11）。
- **本質＝自動段位階梯，非可花費點數商城**：多家評測一致確認「Hype Club 是 automatic tier ladder，沒有 spendable points shop / 兌換介面」。
- **點數只是 XP、只驅動段位**：`100 GC 下注 = 100 loyalty points`，points 自動換算成段位進度，**不能在商城花掉換 free SC/GC**。
- **段位福利**：每升一段發 level-up 獎金；Daily Login 隨段位放大（Snap 2,000 GC → Wild 5,000 GC）；生日禮最高 100,000 GC。
- 段位推進來源＝gameplay + purchases（下注與買幣皆計入 XP；評測未逐字保證兩者權重，但兩者都推進）。

### 促銷/紅利 / 領獎
- **Mega Wheel 每日輪盤**：每日一轉（買幣可解更多轉），保底 SC 獎（歡迎轉最低 0.15 SC）。
- **Missions**：每日任務 ~1,000 GC、每週任務 ~10,000 GC。
- **隨機 Prize Drops**：玩 slot 時降落傘動畫飄過畫面 → 隨機掉 surprise 獎（如 1,000 GC）。
- **Mail-in Bonus**：郵寄索取 5 free SC，最多 10 次（郵寄=avoid）。
- 註冊禮：~30K GC + ~20 SC（各評測數字略異）。

### 遊戲庫
- ~330 slots + 30 真人桌（20+ vendor）；**~130 款累進 jackpot slots**（Penguin King/BGaming/Playson/Playrogue/Swintt），為賣點。
- 真人賭場（Iconic21 / Live 88）對 sweeps 站少見。

### 金流/模式（只記錄，avoid）
- 雙幣 GC（娛樂）+ SC（可兌獎）純前端社交模式；法規層部分州禁 = avoid。

---

## ApexWin 對照

| Mega Frenzy 機制 | ApexWin 現況 | 判定 |
|---|---|---|
| Hype Club 11 段 VIP 階梯（段位化 daily login + level-up + 生日禮） | **#29 VIP 子級+大階雙層獎金已落地**；連登 #34 | ✅ **既有卡已覆蓋**（同類） |
| `100 GC 下注 = 100 points` XP 換段、下注+買幣皆累 XP | `HL.liveStats` 中央掛鉤累點 / #29 段位 | ✅ 既有骨架已支援（可微調 XP 來源含買幣） |
| Mega Wheel 每日輪盤 | #17 Lucky Spin | ✅ 已覆蓋 |
| Daily/Weekly Missions | #6 任務池 | ✅ 已覆蓋 |
| 隨機 Prize Drops（降落傘揭曉） | #38 揭曉型領獎 / 隨機掉落候補 | ✅ 已覆蓋 |
| ~130 累進 jackpot slots | #9 Jackpot | ✅ 方向再確認 |
| Mail-in 5 SC | 郵寄實體流程 | ❌ avoid（不追） |

---

## ⚠️ 對 radar 假設的重要修正（回饋 evolve）

radar（2026-07-05）收編時假設：Hype Club ＝「**買幣與玩遊戲皆累積點數 → 爬段位 → 點數兌換 free SC/GC**（雙軌賺點＋段位化兌換）」，並建議「替 #36 點數商城補一條『多來源賺點＋段位越高兌換效率越好』規格分支」。

**本輪深挖查證後：此假設不成立（僅一半對）。**
- **對的一半**：段位 XP 確實同時來自買幣與遊玩。
- **錯的一半**：Hype Club **沒有可花費的點數商城 / 兌換端**——點數只換段位，段位只放大 daily login/level-up/生日獎金。這**就是一個 VIP 階梯，＝ ApexWin 既有 #29**，不是 #36 那種「花點數逛商城換獎品」的消耗端經濟閉環。

**結論**：
- ❌ **不要**因 Mega Frenzy 替 #36 新開「多來源賺點+段位兌換」分支——那是把 VIP 階梯誤當點數商城。#36 的「多來源賺點」若要做，靈感來源應回到真正有 shop 的平台（Chancer Bonus Shop / Dorados Reward Market / BigPirate Reward Market，這些才是真商城共識）。
- ✅ Mega Frenzy 僅**再確認既有 #29/#17/#6/#9/#38**，無淨新缺口。
- 唯一可記微調：#29 的 VIP XP 累積來源可明確「下注 + 買幣雙軌皆計入」（`100 下注單位 = 100 XP` 這種線性換算），但這是 #29 內的參數，非新卡。

---

## 可落地點子（pure-frontend）
本輪**無新增可落地點子**——所有機制皆已被既有卡覆蓋，且平台已停運參考價值低。僅列 1 條「既有卡微調」原料：

1. **（#29 微調，非新卡，S）** VIP XP 累積來源明確化為「下注 + 購幣雙軌」，採線性換算（對標 Mega Frenzy `100 GC = 100 points`）；複用 `HL.liveStats` 中央掛鉤，無需新管道。

---

## 備註
- 平台已停運（2026-04 關站），本檔為歷史存證；watchlist 該筆已標 defunct、priority 降、next_due 推遠以退出常態輪替。
