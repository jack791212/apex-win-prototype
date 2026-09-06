# Rollbit (rollbit.com) — 調研檔

- **調研日期**：2026-06-26
- **tier**：2（地區頂級 · 14 天刷新）
- **regions**：global
- **category**：crypto / casino / originals / trading
- **定位**：crypto casino + 槓桿交易（Futures）+ NFT 的三合一混合平台；以「自製 X-系列 Originals + RLB 代幣經濟 + 社群對戰」為差異化。

## 🔄 2026-07-10 刷新（reconfirm + 兩處 nuance）

本輪（T2 14 天到期）重查，**核心定位與可學缺口全數維持**，追加：

- **Rakeback 費率更新**：多家 2026 評測改口徑為「每注自動返 **10–20%**」（原記 5% 全押注 + Originals 50% instant）。屬**費率描述刷新**，不改「自動、高頻、無前置大禮、聚焦終身價值」的機制本質 → ApexWin `HL.rakeback` 已同構，**非新缺口**。競品續強調 **$1M/月排行榜、Daily/Weekly/Monthly reload、Daily Races** → 對應 ApexWin #15 錦標賽 / #22 日桶返水，**已涵蓋**。
- **Duel Arena（新 Original，RuneScape 風 0% edge 1v1 PvP 戰鬥）**：兩玩家各 990 HP，輪流出拳（可格擋、1~112 傷害含爆擊），血量歸零者輸、贏家收走賭注；provably-fair、最低 $10、可押 cash/RLB/NFT。**機制上＝把「1v1 對賭」包成一層 HP 戰鬥動畫**。→ **強化既有 #30 Dice Duel（1v1 PvP，ApexWin 唯一 PvP 空白）+ Duelbits Dice Duels + 本檔 Bonus Battles 的 PvP 共識**；戰鬥 HP 呈現只是 UI 皮，非新軸線。**NFT 質押/RLB 賭注端＝avoid，只取『1v1 對賭 + 戰鬥揭曉動畫』前端骨架**。
- **結論**：本輪為 **reconfirm**。標準未解缺口續為 → X-Roulette 倍數輪盤 Original（無卡，S–M）、Rakeback header 快領下拉（無卡，S）、VIP 細分子級（27 級觀感，S–M）、Bonus Battles/Duel 式 PvP（併入 #30 Dice Duel 候補）。

## 🔄 2026-07-28 刷新（T2 14 天到期 · 逾期 4 天補刷）

本輪重查，**核心定位與既有 4 點子全數維持**（Bonus Battles 對戰／X-Roulette 倍數輪盤／Rakeback 快領下拉／VIP 細分子級），追加：

- **淨新＝「新手期返水加成窗口」**：2026 評測口徑統一為 **首 24 小時每注 15% rakeback、之後常態 5%**（先前記 10–20% 區間為描述模糊，本輪收斂為「有明確時間窗的階梯」）。這不是費率刷新而是**機制淨新**：把最高返水集中在「玩家剛進來、最容易流失」的頭 24 小時＝onboarding 與 rakeback 的交叉。→ ApexWin `HL.rakeback`（progress.js:282，`accrue/pot/rate/claim`）**費率只由 VIP 係數決定，無任何時間窗/活動加成入口** → 與 bet365「promo 需 opt-in」交叉 **開為 #52 卡**（限時 rakeback 加成 ×N，掛 #49 promoCal 排程 + opt-in）。
- **Rollbit Rewards「最高 70% rakeback」的組成**：非單一費率，而是 rakeback + cashback + 驚喜掉落 + races **多桶疊加後的對外行銷上限值**。→ ApexWin 已有 rakeback/cashback(#33)/錦標賽(#15)/raffle(#18) 同構多桶，**差別在沒有把多桶「合成一個對外總回饋率」呈現**（純呈現層、極小工作量，記錄非開卡）。
- **NFT Lootboxes（自製 original：轉箱開 NFT/RLB）**：機制骨架＝加權隨機掉落表 + 稀有度分層 + 開箱演出。→ ApexWin `HL.luckyspin`(#17 每日轉)＋`HL.shop`(商城) 已覆蓋「加權掉落 + 演出」骨架，**NFT/代幣端屬 avoid**；唯一可借者為「**多階價位箱**（不同買入價對不同掉落表）」，屬 shop 的資料擴充，**非新軸線**。
- **RLB 質押抽獎（獎池由平台每日利潤撥入）**：續為 avoid（代幣/質押），只記錄。
- **結論**：本輪產出 **1 個機制淨新（新手期返水加成窗口 → #52）**，其餘 reconfirm。下次到期 2026-08-11。

### 來源（2026-07-28 刷新）
- https://tokenist.com/crypto-casinos/rollbit-casino-review/ （首 24h 15% → 常態 5%）
- https://www.covers.com/casino/bonuses/rollbit-promo-code （Rakeboost 10%）
- https://blockonomi.com/rollbit-review/ （NFT Lootboxes／trading floor）
- https://casinosblockchain.io/rollbit-review/ （Rewards 最高 70% 的多桶組成）

## 🔄 2026-08-10 刷新（T2 14 天到期 · 平台軌 catchup 輪）

本輪重查，**核心定位與既有 4 點子全數維持**，產出 **1 個機制淨新**：

- ⭐ **淨新＝「領取」本身觸發個人限時加成窗口（claim-triggered Rakeboost）**：兩份獨立來源一致記載 **Rewards Calendar 每領一次 → 隨即獲得 +15% Rakeboost、持續 60 分鐘**（另一源同述「領取 Daily/Weekly 紅利即啟動 15% Rakeboost 60 分鐘」）。這**不是**已記錄過的「首 24h 新手窗口」（那是**註冊時間**驅動）、也不是「promo 需 opt-in」（那是**加入活動**驅動）——而是把**每一次領取動作**變成一個「接下來一小時快去玩」的個人窗口，且**可重複觸發、一天多次**。
  - **ApexWin 對照（grep 實證）**：`core/rakeboost.js` 的註冊表已存在且形制正確（#52），但三筆種子的觸發源分別是**排程**（happyhour）／**註冊時間**（newcomer，自刻 `HL_RB_NEWCOMER` 時間戳）／**加入活動**（optin，借 `promoCal.joinedAt`）⇒ **「領取」這個觸發源完全不存在**，且更根本的是**每筆限時窗口都各自手刻一份時間戳存取**（newcomer 自刻、optin 借用），第三筆要加就得再刻第三份。
  - ⇒ 開卡 **#81**（觸發軸：把「窗口」本身變成註冊表提供的能力，`trigger(id)` 開窗、`registerTriggered` 免費得到 `mult/msLeft`），並把全站既有領取點（簽到／任務／返水／VIP 升級金／保險／季票）接上去。
- **VIP 段位數兩源衝突 → 兩記不擇一**（沿用 legendz 08-06 的處置）：一源記 **27 級 / 7 段位**（Bronze→Vibranium，與本檔 06-26 首挖的「27 級/7 段位」一致）；另一源記 **4 級 Silver→Diamond**。研判為「大段位 vs 細子級」兩種數法或改版，**不擇一、不據此改任何設計**（ApexWin #29 子級設計不受影響）。
- **reconfirm（無淨新，只記）**：Rewards Calendar 分 Daily（依 P&L + 押注量）／Weekly／Monthly 三桶＝ApexWin `#22 日桶返水`＋`#33 cashback`（淨損）已同構；「每日 $25,000 races + 挑戰 + 推薦制」＝#15/#58 已覆蓋；「1% 每日虧損返還」＝#33 已覆蓋。
- 📌 **寫進既有卡而非開新卡**（沿用 08-06 起的紀律：併入既有卡必須當場寫進卡體）：Rollbit 對外把回饋量化為「**返還最高 70% 莊家優勢**」並附**逐筆算式範例**（$100 押注 × 5% 莊優 → 返 $0.75）。ApexWin 的 `HL.edge`（#50，22 款係數）＋ #60 的 `bet × edge × 段位比例 × boost` **早就逐筆算出這個數**，卻從未以「你被抽了多少／已還你多少％」呈現給玩家 ⇒ 已寫進 **#72 說明中心**卡體（第三平台佐證 + 具體 spec）。

> 結論：本輪產出 **1 個機制淨新（領取觸發個人限時窗口 → #81）**＋1 筆併入 #72，其餘 reconfirm。下次到期 2026-08-24。

### 來源（2026-08-10 刷新）
- https://www.datawallet.com/crypto/rollbit-review （Rewards Calendar 三桶／27 級 7 段位／領取即 15% Rakeboost 60 分鐘）
- https://blog.rollbit.com/rollbit-rewards-rewards-calendar/ （官方部落格：每次 Calendar 領取＝1 小時 +15% Rakeboost）
- https://blockonomi.com/rollbit-review/ （4 級 Silver→Diamond 的衝突記載／每日 1% 虧損返還／70% rakeback 多桶組成）

## 特色快照

### 遊戲 / Originals
- **X-Crash / X-Roulette**：自製可驗證公平玩法。X-Roulette = 輪盤外觀但帶**倍數機制**（與傳統輪盤不同的數值玩法），Rollercoaster 亦同家族。
- **Bonus Battles（紅利對戰）**：社群玩法——多名玩家**買入同一個 slot bonus 回合**，比拼總贏額排名。屬「共享回合 PvP」競技。
- **Game Shows**：30+ 款（Crazy Time、Monopoly、Lightning Dice、Balloon Race…，多為供應商真人）。

### 留存系統
- **Rank-Up Bonus（VIP）**：27 級 / 7 段位（Bronze→Silver→Gold→Platinum→Diamond→Blood Diamond），門檻以累積押注計（Bronze L5 ~$30k 起）。**層級粒度遠細於一般 5 級**。
- **Rakeback**：全押注 5% 返水 + Originals 50% instant rakeback、0% house edge；**每 30 分鐘**可從下拉選單或 Rewards 頁領取。
- **RLB Lottery**：質押 RLB 代幣入抽獎池，獎池由平台每日利潤 20% 撥入分配（⚠️ 代幣/質押屬 avoid 範疇，只記錄）。

### 促銷 / 紅利
- Rakeboost（提升返水率）、週期促銷碼。

### UX / 上手
- **高密度行動 UI**：底部導覽 3 大產品（casino / sportsbook / crypto 衍生品）一鍵直達。
- **深色「Bloomberg 終端」風**：炭黑底 + 點綴光，資訊密度高、偏專業交易感。

### 金流 / 模式（⚠️ CONTROL.avoid，只記錄不推進）
- 純加密；含真槓桿交易（Futures）、NFT、RLB 代幣質押——皆需牌照/真金流，不推進。

## ApexWin 對照

| 項目 | Rollbit | ApexWin 現況 |
|---|---|---|
| Originals 五天王 | 部分 | ✅ Dice/Limbo/Crash/Mines/Plinko |
| **X-Roulette（倍數輪盤 original）** | ✅ | ❌ **缺**（有標準歐式輪盤 #7b，無倍數型 X-Roulette original）|
| **Bonus Battles（共享回合 PvP 對戰）** | ✅ | 🟡 有錦標賽 #15（個人積分），無「多人買入同回合比總贏額」對戰 |
| VIP / Rakeback | ✅ 27 級 + 30 分領 | ✅ HL.vip(5 級) + HL.rakeback（VIP 面板領）|
| Rakeback 快速領（下拉/週期） | ✅ 每 30 分下拉領 | 🟡 僅 VIP 面板領，無 header 下拉快領 |
| 週期抽獎 | ✅(代幣質押) | 🟦 #18 Raffle 實作中（不走代幣，押注換券）|
| Game Shows | ✅ 供應商真人 | ❌（屬供應商接入 = avoid）|

## 可落地點子（pure-frontend，餵給 evolve）

1. **Bonus Battles 對戰模式**（對標 Rollbit Bonus Battles）：多名玩家（真玩家 + mock bot）買入**同一場限定回合**，以本回合總贏額排名分獎池。可複用 `HL.tournament` 排行榜/派彩 + `HL.liveStats.record`，差異是「同回合、買入制、比單場總贏」而非長時積分賽。**工作量 M**。← 社群競技差異化、純前端、與 #15 共骨架。
2. **X-Roulette 倍數輪盤 Original**（對標 Rollbit X-Roulette）：複用 `HL.instant` 單注引擎 + 環形倍數段（非標準賠率桌），落點派倍數。與既有歐式輪盤 #7b 區隔、補 Originals。**工作量 S–M**。
3. **Rakeback 快速領下拉**（對標 Rollbit「每 30 分下拉領」）：header 加返水快領下拉，顯示可領額 + 倒數，一鍵領入餘額；底層直接接既有 `HL.rakeback`。降低領取摩擦、提高回訪頻次。**工作量 S**。
4. **VIP 細分段位（27 級觀感）**（對標 Rollbit Rank-Up）：在現有 5 大段位內加子級進度（如 Bronze I–V），升子級即發小獎，強化「下一級就到」的推進感。掛現有 `HL.vip`。**工作量 S–M**。

---

## 附錄：2026-08-24 刷新（平台軌 08:00 窗 · 到期 14 天）

**本輪增量＝非零**（產出 #124 一張待批准卡），但本站同時是本輪最重要的**負面樣本**。

### 淨新機制

1. **RLB 質押樂透 —— 「營運利潤 → 玩家獎池」的分潤形制（唯一真正的新東西）**
   質押平台代幣即取得樂透資格，**獎池由平台每日利潤的 20% 挹注**。
   ⇒ 這是 ApexWin **既有基礎設施剛好接得上**的一種獎池：`HL.ledger.derived()` 已經算得出 GGR/NGR/RTP/淨現金流
   （#56 落地、營運儀表板 `HL.opsBoard` 已在跑）——全庫唯一「知道自己賺了多少」的地方。
   既有的三級累積彩金 `HL.jackpot` 是**按注累積**、真站 seed=0 自籌；分潤獎池是**按結果累積**，兩者正交、不重複。
   ⇒ 開 **#124**（⬜待批准）。**明確不做代幣與質押**：那是金融產品，屬 CONTROL.avoid 的精神範圍；只取「獎池由可查帳的營運結果挹注」這一層。
2. **返水為主要回饋機制**：基礎 **5%**、高 VIP 至 **10%**。評測明指此值在 crypto casino 中**偏低**（同業常見 15–20%）。
   ⇒ ApexWin 對照：假站返水的慷慨度落在合理區間、真站 0.1–0.3% 屬保守端（§11 刻意收斂）。**記為對照，不改。**
3. **自研遊戲**：Crash、**X-Roulette**（帶乘數的輪盤變體）⇒ 轉給遊戲軌參考（ApexWin 已有 Crash X；帶乘數輪盤是未復刻形制）。
4. 1000× 槓桿加密交易 —— 金融產品，**不開卡**。

### ⚠️ 玩家保護：本站是負面樣本（機制可抄、治理不可抄）

| 訊號 | 值 |
|---|---|
| Trustpilot | **2.4 / 5**（4,094 則，2026-02） |
| Casino Guru 安全指數 | **4.2 / 100（Low）** |
| 評測反覆點出 | 出款爭議、KYC 卡關、地區封鎖 |
| 牌照 | Curaçao |

**這對 #124 有直接的設計含意，不只是道德註腳**：
分潤獎池的全部吸引力建立在「玩家相信平台會照帳付」。Rollbit 用**代幣敘事**撐這個信任，而它的實測信任評分是 4.2/100。
ApexWin 沒有代幣、也不該有；我們的等價物是**可查帳**——`HL.ledger` 已把 GGR/NGR/RTP 算出來、`HL.opsBoard` 已把它顯示出來。
⇒ **#124 的賣點應該是「這期獎池 N 元是怎麼從本站營運結果算出來的，你點得進去看」，而不是獎池金額本身。**
若做成一個只顯示金額的漂亮數字，我們就複製了 Rollbit 的形，而丟掉唯一能讓它站得住的東西。

### 來源（2026-08-24 刷新）
- https://www.datawallet.com/crypto/rollbit-review （RLB 質押樂透＝每日利潤 20% 挹注；1000× 槓桿）
- https://cryptocashspin.com/rollbit-casino-review/ （返水 5%→10% 與同業 15–20% 對照）
- https://blog.xyes.com/blog/en/reviews/rollbit-casino-review （KYC／出款／地區封鎖風險）
- https://fairness.gg/reviews/rollbit/ ／ https://nodegamble.com/casino/rollbit （Trustpilot 2.4、Casino Guru 4.2/100、Curaçao 牌照）

---

## 📌 附錄：2026-09-06（14:00 窗刷新 · 主題＝金流分類輪替 · 與 bet365 同輪、**從相反方向指到同一格**）

**取材限制（據實）**：`help.rollbit.com` 官方說明頁 **403**；本段一手直取的是 **thespike.gg 的 Rollbit 提款專文**（二手評測，直取成功），
另佐 WebSearch 摘要（bitcoin.com 指南、casino.guru 客訴、bitcointalk 串）。**全段標為二手**。

### 它有什麼（同一個問句：玩家怎麼知道錢在哪一段）

- **① 有一個專屬的「Withdrawals 頁」，而它的用途就是查狀態**：Cashier → Withdrawal 分頁送出後，
  逐字為「**You can check the status of your crypto withdrawal on the withdrawal page**」，並可取得 **TXID** 去鏈上查。
  ⇒ **狀態面是一個獨立目的地，不是交易紀錄裡的一行字。**
- **② 時效綁在「資產」上**：Solana／Litecoin 幾乎即時或數分鐘；BTC／ETH 尖峰可達 **60 分鐘**。
  ⇒ 與 bet365 綁「方式」同構——**時效是通道的屬性**。
- **③ 費用綁在通道上**：平台端不收，鏈上 gas 由玩家付（專文舉例 BTC 約 $0.18）。
- **④ 「pending」是玩家日常會遇到、且會去追的狀態**：2026-07-28 一筆約 $2,200 被官方回覆
  「**under review as a normal/standard procedure**」；另一筆 pending 約 20 小時後才找客服。
  ⇒ **即使是「即時」定位的 crypto 站，pending 也是常態**；有名字的狀態是客訴的**減壓閥**，不是多餘的裝飾。

### ApexWin 對照

| | Rollbit | ApexWin 現況 |
|---|---|---|
| 狀態面 | **獨立的 Withdrawals 頁**（可查狀態＋鏈上 TXID） | **無**——錢包彈窗的「歷史」分頁只有 `txnRow`（`app-shell.js:112-122`：圖示／型別標籤／時間／金額，**共四個欄位，無狀態**） |
| 時效綁在哪 | 資產（SOL/LTC vs BTC/ETH） | VIP 段位（`wd-sla-hours`）；`CRYPTO_COINS`(:92) 只有 `{code, net, ic}` **三欄，無時效/費用** |
| pending 是不是一個狀態 | 是（且是常態，客訴的減壓閥） | **不是**——全 `prototype/src/**/*.js` 的交易語境 `pending|processing|審核中|處理中` **實質 0 命中**（唯二 `pending` 是 `core/i18n.js` 的語言包載入旗標與 `core/responsible.js` 的**限額調升冷卻**，皆非交易狀態） |

### ⭐ 兩站同輪、方向相反、指到同一格

- **bet365（受監管法幣）** 從**事前**回答：逐方式的預計時效公開且差異化。
- **Rollbit（crypto、主打即時）** 從**事後**回答：一個專門查狀態的頁 ＋ 鏈上憑據。
- **我方兩邊都缺，而且我方是唯一一個「先做出承諾、再讓行為否證它」的**：
  `wd-sla-hours` 印出「48 小時內」→ 玩家按下確認 → 餘額當場少了、toast 說「已提款」、歷史多一行沒有狀態的紀錄。
  **那 48 小時從來沒有發生過。**
- ⇒ 開**取材維度 15**（見 `db/sourcing-methods.md`）＋台帳新格＋卡 **#174**。

### 玩家保護／責任博弈（維度 5 常規問句）
- 本輪**未取到新事實**（Rollbit 側 RG 工具集歷輪記載未變）⇒ 不重複宣稱、不改判。

### 來源（2026-09-06 刷新）
- https://www.thespike.gg/reviews/rollbit/withdrawal （**直取成功**；withdrawal page 查狀態、TXID、逐資產時效、gas 費）
- WebSearch 摘要交叉：https://help.rollbit.com/en/articles/6181371-how-do-i-withdraw （**403，未直取**）／ https://www.bitcoin.com/get-started/rollbit-deposit-withdrawal-guide/ ／ https://casino.guru/rollbit-casino-the-player-s-withdrawal-is-delayed ／ https://bitcointalk.org/index.php?topic=5466907.0 （pending 常態、under review 回覆、20 小時案例）

**下次到期 2026-09-20**（維持 14 天週期）。
