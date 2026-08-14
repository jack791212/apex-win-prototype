# Courtside — 調研檔

- **平台**：Courtside（Courtside Games Inc.）｜ url: https://www.courtside.app/
- **調研日期**：2026-07-03（首次深挖）｜**2026-08-06 到期補刷**（見文末「2026-08-06 刷新」）
- **tier**：3（新興 sweepstakes 社交賭場，2026-01 上線）
- **regions**：northamerica / global
- **定位**：**「sports-first」社交 sweepstakes** — 把運動 pick'em 與 casino 兩半併進**單一帳號 + 單一虛擬幣**。**純 App-only（iOS/Android，無瀏覽器/桌面版）**。純前端社交模式（無真金）＝與 ApexWin GC/SC 定位貼合；法規層（部分州禁 sweepstakes）＝**avoid**。

---

## 特色表

### 招牌全新機制：Card Rips（「Rip and Ship」實體卡牌開包）
- 用 **Courtside Coins（GC，不可兌獎那幣）** 購買 Pokémon 卡包，包分稀有度階，**成本 1,000 → 25,000 Coins** 一包。
- 開包＝**「rip」揭曉時刻**（教科書級 reveal 動畫），抽中的**實體 Pokémon 卡實際寄送給玩家**（rare 卡對藏家值數百美元）。
- 意義：把「點數商城的兌換端」延伸到**實體收藏品 + 開包揭曉**——不是發免費幣，而是「用娛樂幣換實體物 + 儀式感」。

### 留存系統（**刻意不做分層 VIP**）
- **無傳統 VIP 忠誠階梯**——與 ApexWin「VIP 只發獎金」哲學相反的設計決策。改用：
  - **排行榜（leaderboard）**：picks 表現與他人排名對比，供競爭型玩家動機。
  - **不斷輪替的 contests**：週期性競賽維持黏著（取代固定階梯）。
  - ⚠️ 註：sweepskings 深評指此排行榜/contests 結構「文件化不足、實測偏薄」，故此為**宣稱模型**，落地深度存疑。
- **Faucet 餘額歸零自動續命**：餘額歸零時**自動補回 1,000 Coins**，讓免費玩永不斷炊。
  → **與 CoinsBack 的 Faucet 形成雙平台共識**（ApexWin 全空白的防流失鉤子）。
- 每日獎勵（daily rewards，需驗證後開通）。

### 促銷 / 紅利
- 註冊禮 **1,000 Courtside Coins**（免 code）。
- 首購 $10 → casino 加送 **10 Courtside Cash**；sportsbook 另有「Spend $10 Get 50 in Free Picks」。
- **Referral**：需 SSN 驗證，每有效推薦得 **5 Courtside Cash**（僅限 Picks/sportsbook 端用）。
- **AMOE 郵寄免費入場**：郵寄可免費得 5 CC（合規要件）。

### 貨幣模型（單幣跨 sports + casino）
- **Courtside Coins（GC 型）**：純娛樂、不可兌獎。
- **Courtside Cash（CC，=SC 型）**：**1x playthrough**、玩過 **50 CC** 起可兌獎。
- 亮點＝**同一虛擬幣把運動 pick'em 與 casino 兩個垂直打通**（多數對手兩邊分開）。

### 遊戲 / 內容
- 近 1,000 遊戲、20+ vendor：slots、live-casino 風桌台、RNG poker、blackjack 等。
- **Sports Picks**：15+ 運動、50+ 聯盟（美國四大 + eSports + 拳擊 + 飛鏢），含 parlay/profit boosts。

### UX / 上手
- **App-only**、技術表現/穩定度獲多家好評、低 playthrough 門檻＝上手摩擦低。

### 金流 / 模式（只記錄，不推進）
- sweepstakes 雙幣、部分州禁 → 法規層 **avoid**；實體卡寄送（物流/庫存）亦非純前端，僅取「開包揭曉 UI + 收藏兌換概念」。

---

## ApexWin 對照

| Courtside 有 | ApexWin 現況 |
|---|---|
| Card Rips 開包揭曉 + 實體收藏兌換 | ⚠️ #38 揭曉型領獎（reveal）已做骨架；#36 點數商城已做 — **缺「開包/收藏品兌換」這種消耗端品類** |
| Faucet 餘額歸零自動補幣 | ❌ **完全空白**（防流失鉤子；CoinsBack 亦有＝雙平台共識） |
| 排行榜 + 輪替 contests 取代 VIP | ✅ 已有排行榜賽 #15；ApexWin 走 VIP 階梯（設計哲學不同，非缺口） |
| 單幣跨 sports+casino | ➖ ApexWin 無 sportsbook（體育=avoid），不追 |
| Referral 邀請獎勵 | ⚠️ 已列候補（WOW Vegas 起的 referral 維度，仍未成卡） |

**ApexWin 缺口（純前端可做）**：
1. **Faucet 餘額歸零續命幣**（雙平台共識、ApexWin 全空白）。
2. **「開包 / 卡包揭曉」作為 #36 商城的一種兌換品類**（把 reveal #38 接到收藏/盲盒消耗端）。

---

## 可落地點子（pure-frontend）

1. **Faucet 餘額歸零救濟金**（對標 Courtside + CoinsBack Faucet）
   - 當 GC 餘額低於門檻（或歸零）時，提供「領救濟金補回 X」按鈕，帶冷卻（每 N 小時/每日一次）。純前端閘 + `HL.bonus` 入帳，防止免費玩家玩到 0 就流失。
   - 工作量 **S**。**雙平台共識，建議 evolve 優先成卡。**

2. **盲盒 / 卡包（Loot-Pack）兌換品類，掛進 #36 點數商城 + #38 揭曉**（對標 Card Rips「rip」開包）
   - 商城多一種商品＝「神秘卡包」：花點數買包 → 走 #38 揭曉動畫（撕包/翻卡）→ 隨機得虛擬收藏卡/獎金/免費轉。純虛擬（不做實體寄送＝avoid 物流），保留「開包儀式 + 稀有度」的爽感。與既有 Punkz Loot Box 候補、Courtside Card Rips 共識。
   - 工作量 **M**（複用 #36 商城 + #38 reveal + #17 隨機派發）。

3. **虛擬收藏冊 / 圖鑑（collection meta）**（對標 Card Rips 的收藏驅動）
   - 開包得到的虛擬卡進「收藏冊」，集滿一套給里程碑獎——把開包從一次性變成長期收集目標。可掛進既有 meta 養成軸線（#37）。
   - 工作量 **M–L**（新收藏資料層 + UI，建議 v1 先小套）。

> ⚠️ Courtside 核心（真金 sports pick'em / 實體卡寄送 / sweepstakes 兌獎 / App-only 原生）多屬 avoid 或非純前端；本檔萃取的是「Faucet 續命」與「開包揭曉+收藏兌換」兩個可純前端移植的機制。

---

## 2026-08-06 刷新（tier-3 到期補刷 · 逾期 4 天＝全庫最久）

**結論：本站無新增可移植機制；本次刷新最大價值是「更正本檔自己的過期斷言」。**

### ⭐ 自我更正一：Faucet 已非缺口（本檔上方對照表的 ❌「完全空白」已過期）
- 上方對照表寫「Faucet 餘額歸零自動補幣 → ApexWin ❌ **完全空白**」，且「可落地點子 1」建議成卡。**兩者皆已過期**：`prototype/src/core/faucet.js` 即 **#39 餘額歸零救濟金**，且其**檔頭第 3 行明文寫著「對標 Courtside（餘額歸零自動補回 1,000 Coins）+ CoinsBack（Faucet 續命幣）——雙平台共識」**＝正是本檔當初提出的那張卡，已落地並含真站經濟收斂（`RELIEF` 金額 + 終身次數上限 + `HL.ledger.record("faucet",…)` 記帳）。
- **教訓（與 08-05 兩輪同型、本輪第三次）**：dossier 的「ApexWin 缺口」欄位是**寫檔當下的快照**，不會隨實作自動失效。**斷言「ApexWin 缺 X」前務必先 grep**（07-30 `wagerFree` 假缺口、08-05 CoinsBack 逐注返還、本輪 Faucet）。

### 本輪查得的新事實（皆屬「記錄」等級，不成卡）
- **仍無分層 VIP**（2026-08 多家評測一致覆核）——「排行榜 + 輪替 contests 取代忠誠階梯」的設計決策維持，且評測明載 loyalty program「currently unavailable, may be available in the future」＝**不是刻意哲學，是還沒做**（上方特色表原記為設計哲學，語氣據實下修）。
- **⚠️ 來源衝突（兩記不擇一）**：Courtside Cash 的 playthrough，sweepskings 記 **1×**（"simple one-time playthrough"）、next.io 記 **2×**。兌獎門檻 **50 CC/$50** 兩家一致。對 ApexWin 無影響（#20 流水引擎為自有參數），僅記錄。
- **客服＝AI chatbot「Coach」，評測稱數分鐘內回應**——與 ApexWin `layout/ai-concierge.js`（AI Luna 罐頭問答）**同型且 ApexWin 已有**；差別在 Courtside 把它當**唯一客服入口**寫進評測評分項 ⇒ 佐證「AI 助理＝2026 社交賭場的標配支援層」，餵給本輪台帳「支援/透明度中心」模組（見下）。
- **App 內主導覽＝三分頁 `Casino / Rips / My Picks`**（App-only，~70MB 原生）。Card Rips 包價區間 **1,000–25,000 Coins** 覆核不變。
- 註冊禮 1,000 Coins、餘額歸零自動補 1,000 Coins 覆核不變。

### 本輪不改的判斷
- 「開包/收藏冊」兩個點子（上方點子 2/3）**維持未認領**：ApexWin 側 `shop.js` 的 `mystery`/`gacha` 已提供「機率型兌換 + 揭曉」，真正缺的只剩**收藏冊（集齊一套的長期目標）**＝點子 3。工作量 M–L，仍列候補、本輪卡額給了更高價值項。

---

## 2026-08-14 定向複查 → **本站退出 30 天輪替（status: saturated）**

第 2 筆零增量確認（第 1 筆為 2026-08-06 到期補刷），依 2026-08-07 立的「逐站證據制」汰除：**不刪除本檔**（已萃取佐證有稽核價值），僅把 `refresh_interval_days` 30 → 180、`next_due` → 2027-02-10。該站若重大改版（例如真的上線 VIP 階梯）手動改回 `done`。

**兩來源交叉的逐項結果（sweepskings 逐項表 ＋ deadspin「few promotions」）**——以下九項一致列為 **N/A**，而 ApexWin **九項全部已有**：VIP/分層忠誠、每日登入連續、任務/挑戰、排行榜、輪替 contests、點數商城、累積彩金、返水、幸運轉盤。

**仍在營運的三項促銷，逐項判定為不可移植**：

| 它有的 | ApexWin 對照 | 判定 |
|---|---|---|
| 餘額歸零補 1,000 Coins | **#39 `faucet.js` 已落地**（檔頭即註明對標 Courtside + CoinsBack 雙平台共識） | 已有，無增量 |
| 推薦禮 5 Courtside Cash | **需 SSN 驗證**且僅限 sports 分頁；推薦機制本身已開 **#58** | 撞 `CONTROL.avoid`（KYC）＋已開卡 |
| **Card Rips 實體 Pokémon 卡包**（1,000–25,000 Coins） | 需真實世界履約/物流，純前端 Demo 不可真做；唯一可移植的「開包揭曉時刻」已由 **#38 揭曉型領獎 + #17 Lucky Spin** 覆蓋，「機率型兌換層」已記於 `deal-or-no-deal-win` 的 `saturated_reason` | 不可真做 ＋ 同素材已記，勿重複開卡 |

⚠️ **來源衝突（降級一筆舊斷言）**：本檔 07 月建檔時記「刻意不做分層 VIP，**改用排行榜 + 不斷輪替的 contests** 維持黏著」，並被引為一項設計決策對照。但 2026-08-14 的 sweepskings 逐項表把**排行榜與 contests 也列為 N/A** ⇒ 舊述的「改用 X 維持黏著」很可能是評測語氣的推論、而非實有機制，**降級為存疑、不再作為對照素材引用**。（同型教訓見 2026-08-14 rainbet：二手記載互相矛盾時，只抄結構、不抄數字。）

## 來源
- https://sweepskings.com/reviews/courtside/ （2026-08-06 複查、**2026-08-14 定向複查**）
- https://deadspin.com/sweepstakes-casinos/reviews/courtside/ （2026-08-14 交叉）
- https://next.io/sweepstakes-casinos-us/courtside/
- https://phandroid.com/sweepstakes/courtside/
- https://www.thelines.com/casino/sweepstakes/courtside/
- https://www.courtside.app/
