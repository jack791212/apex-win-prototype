# Chancer — 調研檔

- **平台**：Chancer（Chancer.bet）
- **url**：https://chancer.bet
- **調研日期**：2026-06-29（首次）
- **tier / regions**：T3 · europe, global
- **定位**：2024 上線的 crypto casino + sportsbook，13,000+ 遊戲、80+ 供應商。2026-06 被多榜評為「長期價值/留存型獎勵生態」導向——獎勵不前置一次性大禮，而是註冊後**持續累積**（cashback / rakeback / shop points / free spins / loyalty）。真金/真人荷官/加密金流＝avoid，只取留存系統與 Originals 呈現。

---

## 特色表（聚焦純前端可學）

### ⭐ 招牌：留存型獎勵生態（同時派 + 點數商城）
- **同時雙軌返利**：頂層玩家可同時拿 **30% 週 cashback + 20% rakeback 並行派發**（不是二選一），ApexWin 目前 rakeback 與週期紅利各自獨立、無「並行雙軌」呈現。
- **🔑 Bonus Shop / 點數商城（最關鍵新維度）**：玩遊戲累積 **shop points**，到「商城」**花點數兌換** free spins、bonus funds、實體周邊等。VIP 等級越高 **shop point 賺取效率越好 + 享 25% 商城折扣**。
  - → 這是一個**點數「消耗端 sink」+ 商品目錄**：ApexWin 目前所有留存機制（Lucky Spin / Reload / Raffle / Rakeback）都只「發錢進獎金錢包」，**完全沒有「賺點數 → 逛商城 → 花點數換東西」的經濟閉環**。這是體驗完整度的明顯缺口。
- **每日 spin-the-wheel**：24h 倒數轉盤，獎free spins / bonus funds / **shop points** / XP / 真金（ApexWin #17 Lucky Spin 已覆蓋此維度，但 Chancer 轉盤會掉「shop points」餵商城）。

### VIP / XP 階梯
- **10 大級 + 子階**：Bronze → Silver → Gold → Platinum → Pearl → Topaz → Emerald → Sapphire → Ruby → 頂級。靠 wager 賺 XP 升級。
- 升級解鎖：更高 cashback/rakeback %、更好的 shop-point 賺取率、shop 折扣。

### 促銷 / 賽事
- **Drops & Wins**（Pragmatic 網路型促銷，月池 €2,000,000）：daily cash drops + multiplier boosts + free spin rewards + 低門檻 mini 錦標賽。
- 賽事整體偏少，主要靠「持續累積獎勵」而非大型競賽。

### 遊戲 / Originals
- **7 款 Chancer Originals**（provably-fair，RTP 98–99%）：Mines、Crash（Avia Fly / Diver / Ballonix 等 crash 變體）、Limbo、Plinko 1000、Sugar Daddy、Squid Game 等。
- 1,000+ 真人桌（16 家 live 供應商）、80+ studio。

### 金流 / 模式（avoid，只記錄）
- 加密 + 法幣（信用卡/e-wallet/voucher）、真人荷官、三倍存款 bonus＝牌照/真金範疇 avoid。

---

## ApexWin 對照

| 維度 | Chancer | ApexWin 現況 |
|---|---|---|
| VIP 多級 + 子階 | ✅ 10 級 + sub-tier | ✅ 5 段（#31 子等級進度條已開卡待做） |
| rakeback 返水 | ✅ 20% | ✅ #8 + #22 每日桶 |
| 週期 cashback | ✅ 30% 週 | ⚠️ #24 Reload（固定紅利）有週期，但**非「依輸贏算」的 cashback**；#33 淨損 cashback 已開卡待做 |
| **點數商城 Bonus Shop（賺點→花點換目錄）** | ✅ 核心 | ❌ **完全缺**（只有「發錢進錢包」，無點數消耗端 + 商品目錄） |
| 每日轉盤 | ✅（掉 shop points） | ✅ #17 Lucky Spin（但無 shop points 維度） |
| 自研 Originals | ✅ 7 款 | ✅ ApexWin 已 8+ 款，旗鼓相當 |

**最關鍵缺口**：**Bonus Shop / 忠誠點數商城**——ApexWin 有一堆「發獎」機制，卻沒有一個讓玩家「累積點數再逛店花掉」的消耗端與商品目錄。補上即形成「賺 → 逛 → 換」的完整經濟閉環，是頂級平台留存生態的核心拼圖，且純前端可做。

---

## 可落地點子（pure-frontend）

1. **忠誠點數商城 HL.shop（賺點 → 逛店 → 兌換）** — 對標 Chancer Bonus Shop（+ BC.Game/Stake 商城共識）。
   - 新增 `core/shop.js`＝`HL.shop`：經中央掛鉤 `HL.liveStats.record` 依有效押注累積 **shop points**（VIP 等級越高賺取係數越大，複用 `HL.vip.status().index`）；底部列新增 🛍️ 商城入口，modal 呈現商品目錄（free spins 券 / bonus funds 包 / Lucky Spin 額外轉 / Reload 加成等**全用既有獎金機制當商品**），花點數兌換、冪等扣點、入 `HL.bonus`。
   - 加速器：複用 `HL.liveStats.record`（累積點數零逐遊戲改裝）＋ `HL.bonus.add`（兌換派發）＋ #24 Reload 的 modal/i18n 骨架。純前端 localStorage、零牌照。工作量 **M**。

2. **VIP 商城折扣 + 點數賺取加成** — 對標 Chancer「VIP 越高 shop 折扣 + 賺點效率越好」。
   - 上點 1 之後，讓 `HL.shop` 的兌換價與賺點係數讀 `HL.vip.status().index` 放大/打折（如鑽石享 25% 折扣）。強化 VIP 爬階的「實感回報」，與 #29 tier-up、#31 子等級相乘。
   - 加速器：純查表 × VIP index，不改 VIP 派發邏輯。工作量 **S**。

3. **cashback + rakeback 並行雙軌領取視圖** — 對標 Chancer「30% cashback + 20% rakeback 同時派」。
   - 在 header 💧 返水下拉 / VIP 面板，把 #22 rakeback（turnover）與 #33 淨損 cashback（net loss）整成「兩條並行可領桶」一目了然的雙軌視圖（兩者本就互補不重疊）。提升獎勵透明度與領取動機。
   - 加速器：#33 開卡後兩引擎都在，純 UI 整合。工作量 **S**。

---

## 來源
- [CCN — Chancer.bet Casino & Sportsbook Review](https://www.ccn.com/crypto-casinos/reviews/chancer-bet/)
- [Cryptomaniaks — Chancer Casino Review 2026: 10,000+ Games & Triple Deposit Bonuses](https://cryptomaniaks.com/gambling/reviews/chancer)
- [Bitranked — Chancer.bet Review 2026: Cashback & Rakeback](https://bitranked.com/review/chancer-bet)
- [CryptoSlate — Chancer Casino Review 2026](https://cryptoslate.com/crypto-casinos/chancer-casino-review/)
- [AskGamblers — Chancer.bet Casino Review (2026)](https://www.askgamblers.com/online-casinos/reviews/chancer-bet-casino)
