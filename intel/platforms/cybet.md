# Cybet — 調研檔

- **平台**：Cybet（`https://cybet.io` ⚠️ 本輪未親訪，URL 待下次深挖確認）
- **tier / priority**：3 / 55
- **regions**：global, europe
- **category**：crypto, casino, sportsbook, vip
- **調研日期**：2026-08-07（首次取材 · 平台軌 08:00 窗）
- **來源**：coingabbar「best new casinos 2026」榜 + bitdegree／coingape 新站列表（多榜點名，與 Roobet／1xBit 並列）；CryptoManiaks／BettingNews／Webopedia／AskGamblers 獨立評測頁交叉

---

## 定位一句話
一個 **crypto casino + sportsbook**，遊戲化程度**刻意很低**（評測明載「只有一個即將到期的錦標賽，無 missions／challenges」），
但把火力全部押在 **VIP 設計**上——而其中一項（**玩家自選目標合約**）是 ApexWin 完全空白的維度。
⇒ **本站可學的是那一項 VIP 設計，不是整站**（誠實定位：整體遊戲化落後 ApexWin）。

## 特色表

### VIP / 忠誠
- **三段**：Unranked → Explorer → Pioneer；晉升**純看累積押注量**，第一階門檻為投注 **$10,000**。
- **`.b` Bonus Coins**：每筆投注累積，**累積比率隨 VIP 段位放大**，累積過門檻後可轉為可提餘額。
- 其餘：段位越高則返水％更高、週獎金、月獎金、生日禮、專屬促銷。

### ⭐ VIP Mission Mania（本輪最強新素材）
- **玩家自己挑一個 30 天 XP 里程碑**（自選目標，非平台派題），達成即**一次性現金**入帳 **$600–$3,000**（依所選里程碑）。
- 任務**期間內**另有 **10–15% 淨損回饋**。
- 其他附加：提款加速、優先 VIP 客服。
- 另有 **VIP 轉移／段位匹配**：憑他站 VIP 證明 + 已投注 ≥$100,000 可跳過低階直接享高階待遇。

## ApexWin 對照

| 維度 | Cybet 有 | ApexWin 現況 |
|---|---|---|
| **玩家自選目標 + 期限 + 達成才付** | ✅ 自選 30 天 XP 里程碑 | ❌ **完全空白**（見下方 grep 實證） |
| 每注累積、比率隨段位放大、過門檻可領 | ✅ `.b` Bonus Coins | ✅ **同型已具備**＝`HL.rakeback` 日桶 + VIP 係數 + 門檻領取（#60 已把公式收斂） |
| 期間內淨損回饋 | ✅ 10–15%（綁任務期間） | ⚠️ #33 cashback + #48 保險（`safetynet`）已覆蓋**淨損回饋本身**，只差「綁定在某目標期間內」這層 |
| VIP 段位純押注量決定 | ✅ 3 段 / $10,000 起 | ✅ 已具備且更細（`progress.js` 子級 + 大階雙層） |
| VIP 轉移／他站段位匹配 | ✅ 需人工審核 + 對手站證明 | ❌ 不做：純真金拉客手段，無牌照無意義（CONTROL.avoid 精神），僅記錄 |
| 任務／挑戰系統 | ❌ 評測明載無 | ✅ ApexWin 兩套（`HL.tasks` / `HL.challenges`）**遠勝本站** |

### 「自選目標」缺口的 grep 機械實證
ApexWin 現有的**每一個**進度目標都是**平台出題**：
- `core/progress.js` `HL.tasks` 的 `DAILY`＝固定次數／金額型清單
- `core/challenges.js` `HL.challenges` 的 `DAILY`＝固定單局倍數型清單
- `core/season.js` #46 賽季軌＝固定 XP 階梯（`buildTiers`）
- `core/achievements.js` #45＝固定終身里程碑
- `core/tournament.js` #15＝押注量排行榜
⇒ 玩家**唯一的「選擇」是要不要做**，從不參與「**做什麼／做到多少／在多久之內**」。

## 可落地點子（pure-frontend）

1. **【最強新素材】自選目標合約 v1** — S–M（→ 已開卡 **#79**）
   註冊表式的「合約」目錄（`registerContract({ id, metric, targets[], windowDays, reward, siteAware })`），玩家從中挑一筆並**簽下**：
   期限內達標即發獎（走 `HL.bonus.add` 帶 `source`＝帳本可歸屬），逾期未達則失效。metric 直接複用 #65 `HL.progressSrc` 的 XP
   或 `HL.vip.status().wager`，**不需要新的計量基礎設施**。

2. **合約期間的淨損回饋（選配欄位）** — S
   把 Cybet「任務期間 10–15% 淨損回饋」做成合約 spec 的一個可選欄位，實作上委派既有 #48 `safetynet` 或 #33 cashback，
   **不新增第二套回饋演算**。真站須比照 §11 收斂（或先只開假站）。

## 排程
- 首次取材回填：`status: done`、`last_investigated: 2026-08-07`、`next_due: 2026-09-06`（tier3 +30 天）、`last_verified: 2026-08-07`。
- ⚠️ 下次深挖時的待辦：**親訪官網確認 url 與段位數**（多家評測只給三段，但同時列出「返水/週獎/月獎隨段位放大」的多段式福利，兩者有張力，本輪不擇一）。
