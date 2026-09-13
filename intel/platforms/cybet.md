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

---

## 2026-09-13 第二輪深挖（`next_due` 到期 · 平台軌 08:00 窗）

**本輪原本的劇本是「第二輪零增量 ⇒ 判 `saturated` ⇒ 直接汰除」**（08-14 的 `saturation_watch` 逐字這樣寫）。
照劇本重查之後，劇本被推翻了：**增量不是零**。而多出來的東西**不是這個站長出了新機制**——
是**我們上一輪沒有把它的紅利條款當成一個維度來讀**。

- **08-14 用的鏡頭**：「這個站有哪些留存機制？」→ 逐項答完（rakeback／`.b` 幣／3 段 VIP／週月生日紅利／VIP transfer），全部已被覆蓋 ⇒ 判零增量。
- **09-13 用的鏡頭**：「它那張**條款頁**上有哪幾個維度？」→ 同一批來源、同一個站，**多出兩個真缺口**。

⇒ 與 2026-08-16「取材維度清單漏掉玩家保護」（35 份 dossier 對責任博弈命中 0）、
2026-09-12「族群級盲點（傳統型大型 crypto casino 整支未進視野）」**同形**，
只是這次漏的層級更小也更難看見：**漏在同一份 dossier 內部的一個欄位層**。

### 一手來源
`guidebook.cybet.com`（該站自家手冊，`/deposit-bonus/` 一頁）＋ bettingnews／99bitcoins／cryptoslate／tribuna 二手交叉。
`url` 由此確認為 `cybet.io`（08-14 標註的「未親訪、url 待確認」已消）。

### 它的紅利條款逐項 × ApexWin 對照

| 條款軸 | Cybet | ApexWin | 判定 |
|---|---|---|---|
| 流水倍數 | 40×（扁平） | #74 `HL.sla.bonusReqFor`，**依 VIP 段位查表** | ✅ 已有，且比它細 |
| 期限 | 7 天 | #71 `HL.bonusTtl`（授予當下求值一次） | ✅ 已有 |
| 逐遊戲貢獻率 | 第三方 slot 100%／自家 Originals **5%** | #89 `HL.wagerScope.weightFor(sc, game)` | ✅ 已有——**一次正面確認容器選對了** |
| **紅利期間單注上限** | **$5／spin** | 全站零命中 | ❌ **缺口 → #187** |
| **贏額／提領上限** | 紅利額 200% 且封頂 $2,000；免費旋轉贏額封頂 $50；跑完流水後總提領封頂＝初始（存款＋紅利）10×，超出**自動沒收** | 全站零命中 | ❌ **缺口 → #187** |

⚠️ **一個開卡時很容易混淆的同名不同物**：`grep -rn "winCap|贏額上限|maxWin" prototype/src` 會命中四款 slot 的 `CFG.maxWin`
（`dead-by-noon` 10000／`gem-storm` 5000／`golden-toad` 2000／`pirots` 10000）——那是**遊戲內派彩數學的上限**（機率模型參數、進 RTP 計算），
**不是紅利條款的贏額上限**。把兩者當成同一件事會得出「我們已經有了」的錯誤結論。

### 連二輪確認已覆蓋、維持不開卡
20% instant rakeback（→ `HL.rakeback`，且真站已收斂為 0.1–0.3%，照抄其數字反而撞 §11）／
`.b` bonus coins 每注累積過門檻可轉（→ 與 rakeback 累積+claim 同構）／
3 段 VIP + 更快提領 + 專屬客服（→ `HL.vip` 5 階 + #63 `HL.sla` 更細）／
VIP transfer（需他站 VIP 證明 + 已投注 $100,000 ⇒ 跨營運商身分驗證，撞 `CONTROL.avoid`，純前端只能做成「自己宣告自己是鑽石」＝假機制）。

### 排程回填
`last_investigated: 2026-09-13`、`next_due: 2026-10-13`（tier3 +30）、`last_verified: 2026-09-13`、
`saturation_watch` **1/2 → 0/2（歸零重算）**、`status` 維持 `done`（**未汰除**）。
