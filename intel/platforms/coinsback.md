# CoinsBack — 調研檔

- **URL**：https://www.coinsbackcasino.com
- **調研日期**：2026-07-02（首次深挖）
- **Tier / Priority**：T3 / P67
- **Regions**：northamerica, global
- **營運**：MW Services Limited（同集團營運 WOW Vegas、Rolla），2026-05 上線的新 sweepstakes 社交賭場（1,400+ 遊戲、20+ 供應商）
- **定位**：以「留存 + 被動累積」為核心賣點。招牌＝**逐注即時退 50% 房屋優勢**。

---

## 特色表

### 招牌：自動 CoinsBack（逐注即時房屋優勢返還）
- 每一注 SC 玩法，**即時**退回「該注理論房屋優勢的 50%」進 SC 錢包。
- 演算：房屋優勢 =（1 − 遊戲 RTP）。退還 = 房屋優勢 × 50% × 注額。
  - 例：10 SC 押 RTP 97% 的 slot → 房屋優勢 3% → 退 1.5% = **0.15 SC 立即入帳**。
- **無門檻、無 VIP 等級要求、無需操作**，全體玩家一律享有 → 等於「永遠玩在比別家更高的有效 RTP」。
- 退款**直接進 SC 餘額**，立即可再玩或兌獎。

### ⚠️ 關鍵洞察（修正先前雷達假設）
- 雷達先前記為「即時 cashback 儀表板」，但**實際評測指出這機制是「靜默在背景運作」，沒有明顯的 per-spin 追蹤器 / cashback tracker / 活動 feed**。
- → **這反而是 ApexWin 的更大機會**：CoinsBack 有這個好機制卻沒把它演出來。ApexWin 若補上「逐注 RTP 返還的即時可視化時刻」，就能把一個對手藏起來的價值變成自己的差異化賣點。

### 留存 / VIP
- **CoinsClub VIP**：14 級、**只升不降（永久累積、無衰減）**；升級獎 Silver I 20 SC → 頂級 3,000 SC，全程約 10,000 SC。極度肝（需玩滿 500 萬 SC 才到頂）。
- **Hourly Leaderboards 每小時排行榜**：所有 SC 模式遊戲即時計分，前 10 名得 3–25 SC，**即時更新名次**。
- **Faucet 水龍頭**：餘額歸零想再玩時，發 15,000 GC 讓你續玩（防止「卡死出局」）。
- Referral 推薦、Mail-in 索取（每次核准 3 SC）、email/社群公告的活動。
- 註冊禮：500,000 GC + 2 SC。

### 限制 / 反面
- **只有 slots，無桌遊、無真人**；無專屬 app。

### 金流 / 模式（avoid，只記錄）
- sweepstakes 雙幣社交模式（無真金）；部分州禁 = 法規 avoid，只學前端機制。

---

## ApexWin 對照

| CoinsBack 機制 | ApexWin 現況 |
|---|---|
| 逐注即時退 50% 房屋優勢（進 SC） | **空白**。已開卡 #33 是「淨損 cashback / lossback」（事後結算 net loss）、rakeback 算 turnover —— **三者互補不重疊**：CoinsBack 是「每注即時退 RTP 差」 |
| 房屋優勢返還的**即時可視化**（對手其實沒做） | 空白 → **最大機會點**：做出對手都沒做好的可視化 |
| 14 級只升不降 VIP | ApexWin VIP 有升降/段位設計討論（WOW Vegas 曾浮現「滾動衰減 VIP」相反維度）；「永久只升」是明確對照選項 |
| Hourly Leaderboards 每小時即時排行 | 有 #15 排名賽；「**每小時**短週期 + 即時名次更新」的高頻節奏可強化 |
| Faucet 餘額歸零救濟 | **空白**（ApexWin 無「玩到 0 給你續命幣」機制，防流失鉤子） |
| Referral 推薦 | 空白（多平台共識的病毒成長維度，仍未開卡） |

---

## 可落地點子（pure-frontend）

1. **逐注即時「RTP 返還」可視化時刻**（對標 CoinsBack，**但補齊對手沒做的可視化**，M）
   - 每注結算時，中央掛鉤 HL.liveStats 依該遊戲 RTP 算出「房屋優勢 × 50% × 注額」，即時飄一個「+0.15 SC returned」微動效並累加到一個「今日已返還」小計。
   - 灌回獎金錢包（複用 HL.bonus）。純前端、複用既有逐注掛鉤，差異化賣點強。**建議 evolve 開卡**（與 #33 lossback 互補，可整成「返還中心」多軌視圖：逐注 RTP 返還 / 淨損 cashback / rakeback 三軌）。

2. **餘額歸零「Faucet 續命幣」**（對標 CoinsBack Faucet，S）
   - 偵測遊玩幣（GC）餘額歸零時，彈出「領 X GC 繼續玩」（純前端每日/每次閘）。低成本高防流失鉤子，補齊「玩到 0 就走人」的漏斗。

3. **每小時高頻即時排行榜**（對標 CoinsBack Hourly Leaderboard，S–M）
   - 在既有 #15 排名賽上加一個「每小時檔」短週期 + 名次即時跳動動效，複用 #18 週期倒數 + #15 bot 湊榜。提高日內回訪頻率。

4. **「永久只升 VIP」對照選項**（對標 CoinsBack 14 級無衰減，記錄用）
   - 與 WOW Vegas「滾動衰減 VIP」是相反哲學。ApexWin 可在 VIP 設計時二選一或做成「主段位只升 + 附加活躍加成會衰減」的混合。此為設計決策記錄，非急迫開卡。
