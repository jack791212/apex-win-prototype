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


---

## 🔄 2026-08-05 複查（tier-3 逾期 7 天·本批最久）

- **VIP 階梯校正**：10 段（Bronze1→Silver/Gold/Platinum/Pearl/Topaz/Emerald/Sapphire/Ruby），**XP 同時吃 casino + sports**（非僅 casino）；頂階**回收淨損 25%**。另有一套**與 VIP 平行的 comp point 制**：每 €10 有效押注 1 點。
- **Bonus Shop 具體化**：店名 **The Armoury**，點數可換 free spins／現金紅利／**實體商品**（TV、PS5、iPhone 16、MacBook）。
- ⭐ **本輪關鍵新發現＝VIP 放大的不只是「給多少錢」**：高段位另得 **shop discounts（商城折扣）** 與 **increased withdrawal limits（提領上限上調）**。
  - → 與 **Dorados**（VIP 決定兌獎 SLA 72h→24h 與月額度，#63 開卡來源）、**BigPirate**（Lv3 起專屬 VIP 客戶經理 + 24/7 真人客服）收斂為 **「VIP＝服務水準軸」三平台共識** ⇒ 已回寫 #63 卡，優先序上調。
- **ApexWin 對照（沿用 06-29 判定，本輪覆核仍成立）**：`prototype/src/core/shop.js` 的商城是**用錢買遊戲幣的套餐**，**不是**「押注賺點數 → 逛商城 → 花點數換東西」的點數 sink；ApexWin 所有留存機制仍一律「發錢進獎金錢包」。此缺口 06-29 首次記錄、**至今 37 天未開卡**（本輪不開＝已有 9 張未做卡積壓，僅重申並標記待排）。

---

## 🔄 2026-09-04 複查（tier-3 到期 30 天；**首次沿新開的維度 #11「帳戶安全與隱私自控」深挖**）

> **為什麼這輪問的是安全而不是又問一次 VIP**：台帳「資安」分類有 **3 個 absent 模組**（#125 帳戶安全自助中心／#127 隱私自控／#137 出金安全鎖），
> 而它們的形制來源**全部只有 Stake 一家**。本輪機械量測：`2FA|two-factor|裝置清單|device list|whitelist|白名單|登入紀錄|login history|ghost mode|隱身`
> 在 **36 份 dossier 命中 5 份**（1xbet／bc-game／mega-dice／stake-us／thrill），而對照組 `VIP|cashback|rakeback` 命中 **36/36**、
> 2026-08-16 才補進維度清單的責任博弈命中 **14/36**。⇒ 與 08-16 那次一樣：**維度清單漏掉的表面，換多少來源都補不回來**。

- **帳戶安全（self-service）**：評測明載可在 **「My Account」自行啟用 2FA**；帳戶設定內也能自設責任博弈限額。
  - ⚠️ **來源互相矛盾**：另有一份 2026 評測把「仍缺 2FA」列為扣分項 ⇒ 依「只記共識、不臆造」紀律，本欄記為**2FA 有／但實作完整度未定**（同 mega-dice 的處置）。
- **登入活動／裝置與 session 清單／新裝置告警**：AskGamblers 全文逐項追問皆 **"Not mentioned"** ⇒ 無正面證據。
- **提款安全（白名單／新地址冷卻／提款鎖）**：**Not mentioned**；只有**額度**（€2,000/日、€10,000/週、€20,000/月）與提款前驗證。
- **隱私自控（隱藏統計／不進公開動態）**：**Not mentioned** ⇒ 對照 Stake 的 Ghost Mode／Hidden Statistics，這一格在本站零證據。
- ⭐ **責任博弈的交付面（本輪順手取得的第三家獨立佐證）**：AskGamblers 原文說自我排除「**須透過 live chat 聯絡客服，客服再要你寄 email**」。
  - → 與 **BigPirate**（限額/永久排除須寄 email）、**Spree**（Take a Break 7/14/30 天須填表、非即時）收斂為**三平台同一形狀**：
    **工具清單齊、但交付通道是客服工單**。ApexWin 為帳內自助即時＋`RAISE_DELAY_MS=24h` 調升冷卻 ⇒ 我方在這一維**領先第三次被外部證實**。
    （依 09-04 14:00 窗的判斷，玩家保護軸**本輪仍不開卡**——邊際價值已低；此處僅記錄佐證。）
- **維度 #10「活動的收尾面」複驗**：本站錦標賽/賽事本就偏少，往期成績／得獎名單／賽果封存 **Not mentioned** ⇒ 該維度第 **5** 個平台仍為零命中。

### ApexWin 對照（本輪新增三格）

| 維度 | Chancer | ApexWin 現況 |
|---|---|---|
| 帳戶安全自助（2FA/登入活動/裝置清單） | 2FA 於 My Account（來源互相矛盾）；登入活動/裝置清單無證據 | ❌ absent（個人抽屜僅四個入口，無安全分頁）＝#125，卡在 [P-FS] |
| 提款安全鎖（白名單/新地址冷卻） | 無證據，只有額度上限 | ❌ absent（提款目的地是 `app-shell.js:280` 一行硬寫字串）＝#137 |
| 隱私自控（隱藏統計/不進公開動態） | 無證據 | ❌ absent（全 src 只有假玩家「隱身玩家」裝飾字串）＝#127 |
| 責任博弈交付通道 | live chat → email（非即時） | ✅ 帳內自助即時＋調升 24h 冷卻＋排除只能加長 |

- **落地點子（沿用擴充性優先，工作量標註沿舊制）**：本輪**不開新卡**——三格缺口皆已有卡（#125/#127/#137），且三張卡的共同阻塞是**首屏預算**而非設計未定。
  真正該推的是解開那個閘（見本輪新開的 #168）。

## 來源（2026-09-04 補）
- [AskGamblers — Chancer.bet Casino Review (2026)](https://www.askgamblers.com/online-casinos/reviews/chancer-bet-casino)
- [CryptoSlate — Chancer Casino Review 2026](https://cryptoslate.com/crypto-casinos/chancer-casino-review/)
- [Bitranked — Chancer.bet Review 2026](https://bitranked.com/review/chancer-bet)
