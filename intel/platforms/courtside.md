# Courtside — 調研檔

- **平台**：Courtside（Courtside Games Inc.）｜ url: https://www.courtside.app/
- **調研日期**：2026-07-03（首次深挖）
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

## 來源
- https://sweepskings.com/reviews/courtside/
- https://next.io/sweepstakes-casinos-us/courtside/
- https://phandroid.com/sweepstakes/courtside/
- https://www.thelines.com/casino/sweepstakes/courtside/
- https://www.courtside.app/
