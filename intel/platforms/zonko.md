# Zonko — 調研檔

- **URL**：https://zonko.com
- **調研日期**：2026-07-02（首次深挖）
- **tier**：3　**priority**：57
- **regions**：northamerica / global
- **category**：social / sweepstakes / casino / gamification
- **定位**：2026-03 上線的新 sweepstakes 社交賭場，被 sweepskings 評為「空間內最全方位、最遊戲化的獎金生態之一」（500+ 遊戲、頂級 vendor）。**純前端雙幣社交模式（無真金）＝與 ApexWin GC/SC 定位高度貼合。** 法規層（部分州禁）＝avoid。

---

## 🔄 2026-08-05 複查刷新（平台軌 20:00 窗｜逾期 4 天，與 BetPanda 同為全庫最久）

**站仍在營運**（8 日軌 / Welcome Wheel / 週三刮刮卡 / missions 生態皆續在）。本次刷新產出**一筆自我更正 + 兩筆新機制事實 + 一筆「我們已經比它好」的反向結論**：

1. ⭐ **自我更正：8 日軌是 back-loaded，不是 front-loaded**。07-02 本檔（上方）把它記為「front-loaded onboarding arc」；2026-08 評測明確寫出其**獎勵權重刻意壓在第 6–8 天**——理由是「那正是多數玩家原本會流失的時點」。⇒ **這是設計意圖的反面**：不是把糖全砸在第一天衝轉化，而是**用後段的大獎把人拉過流失懸崖**。舊記載據此更正（原文保留於下方歷史區以供稽核）。
2. **每日獎勵是「隨機/神秘禮」**（可能開出 GC、SC 或 **VIP Stars** 三種不同幣別/點數），非固定值 ⇒ 變動比率式回饋（variable reward schedule）。
3. **Power Boost 與每日獎勵、進行中特別優惠「可疊加」**——同一次登入可連領多筆掉落。⇒ 形制是「多來源可領物在同一次登入一起收割」。

### 對照結論（**刻意不開卡**，避免重演假缺口）

| Zonko 機制 | ApexWin 實查現況（本輪機械複核） | 結論 |
|---|---|---|
| 8 日軌**後段加重**（第 6–8 天最大） | `core/rewards.js` `LADDER` ＝ **30 天逐日遞增**（100→17,500，**單調遞增**）＋ **里程碑大禮壓在第 8/15/22/30 天**（3,000／8,000／15,000／50,000） | ✅ **ApexWin 已更強**：不只 back-loaded，而是「遞增 30 天 + 四個里程碑尖峰」，且第一個尖峰恰在**第 8 天**＝與 Zonko 的懸崖判斷一致。**不開卡。** |
| 有邊界的 FTUE 多日軌（8 天走完即結束） | `core/onboarding.js` ＝ **6 小時啟用窗口**（首注＋簽到→領啟用禮），**非多日** | 🕳️ **07-02 列為「最強新缺口」的這一項至今 34 天未被開卡、仍成立**（永久 streak 與 6h 窗口都不是「新手前 N 天有邊界序列」）。本輪 `max_cards_per_run: 2` 已被 #70/#71 佔滿 ⇒ **維持記錄、不硬塞第三張**，留待後續平台輪。 |
| 每日獎勵＝隨機神秘禮 | 簽到日獎為 `LADDER` **決定性固定值**；隨機性在 `HL.luckyspin`（每日轉盤）與 #38 `HL.reveal`（揭曉元件）**兩者皆已在位** | ⚠️ **零件齊備、只差組合**（把簽到日獎改為「揭曉一個範圍內隨機值」＝改 `ladderReward` 一個函式 + 走既有 reveal）。**但這會動到送幣期望值與 `HL.ledger` 成本歸屬** ⇒ 屬經濟調整、不在本輪範圍，記為候選。 |
| 多來源可領物同次登入疊加收割 | ApexWin 的可領來源已多（簽到／返水桶／cashback／季票／成就／raffle），但**分散在底部列與各面板**，無單一「今日可領」聚合 | 🕳️ 候選（與 #44 `HL.dock` 家族相關），記錄不開卡。 |

**回填**：`last_investigated` 2026-07-02 → **2026-08-05**、`next_due` → 2026-09-04。

---

## 特色表（各維度重點）

### 留存系統（招牌 — 遊戲化生態）
- **8-Day Powerboost Reward Track（八日獎勵軌）**：首購（optional GC purchase）啟動後，剩餘 52,000 GC + 25 free SC 拆成**接下來 8 天逐日派發（Instant Powerboost）**；**必須每天登入才能領到全額**。← 這是**有邊界的新手前 8 天養成軌**（front-loaded onboarding arc），與「永久每日簽到」不同。
- **Welcome Wheel**：$20 首購解鎖一次性歡迎輪盤，隨機再贏最多 15 SC（onboarding 揭曉時刻）。
- **Daily Bonuses**：每日登入領免費 GC/SC。
- **Winfinite Wednesday**：每週三**刮刮卡（scratch card）**，刮出 GC/SC 獎——**揭曉型 mini-game + 命名活動日**。
- **Daily Missions**：完成任務（旋轉特定 slot N 次、命中設定倍數…）領 bonus coins/特殊獎勵。
- **Tournaments（賽事）**：多數免費參加，依表現拿虛擬幣或 **Stars**（賽事積分/點數）。← Stars ＝另一種可累積點數來源。
- **Jackpots**：站內整合累積彩金。
- 官方定調：missions + tournaments + jackpots 是「一個生態」而非孤立促銷。

### 促銷/紅利
- 註冊禮 3,000 GC；首購 200% 加成＝ 112,000 GC + 75 SC + Welcome Wheel（$20）。

### UX/上手
- 雙幣：Gold Coins（娛樂）+ Sweeps Coins（達條件可兌獎）；含刮刮卡等 instant-win 玩法。

### 金流/模式（avoid，只記錄）
- sweepstakes 社交模式（無真金賭博）；部分州法規禁 ＝ avoid，只學前端機制。

---

## ApexWin 對照

| Zonko 機制 | ApexWin 現況 | 判定 |
|---|---|---|
| **8-Day Powerboost 新手獎勵軌**（有邊界、每日登入解鎖） | 有**永久**每日簽到 streak（Wave 1）＋ #34 連登階梯（⬜） | **缺口**：ApexWin 無「新手前 N 天 front-loaded onboarding 軌」——一個**有限、專供新手 FTUE 的多日養成序列**，與永久 streak 是不同東西 |
| Welcome Wheel（一次性歡迎輪盤） | 有 `HL.luckyspin` 每日轉盤（#17）；#38 揭曉型領獎（⬜） | 大致有引擎；缺「首次啟用專屬 onboarding 輪盤」變體 |
| Winfinite Wednesday 刮刮卡 | 無刮刮卡；#38 揭曉型領獎（⬜，正含刮刮卡）＋ #35 Happy Hour 命名時段（⬜） | **強佐證 #38**：刮刮卡是經典揭曉 UI；且「命名活動日」佐證 #35 |
| Tournaments 給 **Stars** 點數 | #36 點數商城/Reward Market（⬜，本輪 evolve 最高優先）；`HL.tournament`（#15） | 佐證 #36：Stars ＝又一個「賺點→逛商城換」的點數來源 |
| Daily Missions | 有每日任務/成就（#6） | 有 |
| Jackpots | 有 `HL.jackpot`（#9） | 有 |
| 雙幣 GC/SC | 已是核心定位 | 有 |

---

## 可落地點子（pure-frontend）

1. **新手 8 日 Onboarding 獎勵軌（FTUE Powerboost）**（對標：Zonko 8-Day Powerboost）——**全新缺口**：一條**有邊界、專供註冊後前 8 天**的獎勵序列，逐日登入解鎖遞增 GC/bonus，前 8 天走完即結束（之後交棒給永久 streak / #34 階梯）。與現有永久簽到互補（一個抓新手前期黏著、一個做長期習慣）。複用 `dayNum` 日閘 + `HL.bonus.add` + 進度條 UI。**M**（新 `core/onboarding.js` 或併入 rewards）。
2. **Winfinite Wednesday 型「命名週活動日 + 刮刮卡」**（對標：Zonko 週三刮刮卡）——把 #38 揭曉型領獎的**刮刮卡**變體綁到一個**命名週活動日**（如「幸運週三」），每週三登入可刮一張，獎入 `HL.bonus`。同時餵養 #38（揭曉元件）與 #35（命名時段）兩張既有卡的具體場景。**S–M**（若 #38 先落地則近乎免費複用）。
3. **賽事積分 Stars → 併入 #36 點數商城**（對標：Zonko Tournaments 發 Stars）——實作 #36 Reward Market 時，把「錦標賽 #15 表現」也設為一個賺點來源（Stars），與 liveStats 累點並列，強化「賺點來源多元 → 商城消耗」的經濟閉環。**（併入 #36，非獨立卡）**。

---

## 給 evolve 的結論
- Zonko 的**最強新缺口 ＝「新手前 8 天有邊界 onboarding 獎勵軌」**（FTUE Powerboost）——ApexWin 只有永久 streak，缺專攻新手前期的 front-loaded 多日序列，**建議成一張 M 卡**（與 #34 永久階梯互補、不重疊）。
- 其餘（刮刮卡、Welcome Wheel、Stars 點數）皆**強力佐證既有待做卡** #38（揭曉型領獎，刮刮卡是教科書級 UI）、#35（命名活動日）、#36（點數商城多元賺點來源）——建議在實作那些卡時把 Zonko 當具體場景參考，不另開重複卡。
- Battle-Pass/進度軌主題至此再獲一票（WOW Vegas / Stake.us / SpinBlitz / Zonko 共識），但 Zonko 的貢獻是「**有限 onboarding 軌**」這個新切面，而非又一個永久軌。
