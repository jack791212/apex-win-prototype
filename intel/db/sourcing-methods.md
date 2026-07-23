# 每輪重新取材方法（Sourcing Methods）

> 兩軌 Routine 的鐵律：**永不吃固定清單**。排名/流量/新遊戲隨時在變，固定站名或固定遊戲名一定過期。
> 每次執行都照本檔重新推導當前的調研對象，並把結果 + 抓取日期 + 訊號來源寫進對應資料庫。
> 來源：2026-07-23 對 casino 流量榜與遊戲媒體生態的調研。

---

## A. 平台軌取材：如何每輪重新推導「當前頂級 web casino」

多訊號交叉，**只記名次/趨勢/共識，不臆造絕對訪問數**：

1. **流量訊號**（主）— SimilarWeb 的 Casinos/Gambling **類別排名**為主：
   - 抓 `similarweb.com/website/<slug>/` 的 Category Rank in Gambling + 全球排名（記相對名次/趨勢）。
   - 用 `similarweb.com/website/<slug>/competitors/` 的「Top Sites Like」**自動擴展候選集**（從種子如 stake.com 展開到 rainbet/bcgame/roobet/clash.gg…）。
2. **名氣/評測訊號** — Casino Guru「Big Online Casinos」(以營收+玩家基數挑選)、win.gg/tokenist/99bitcoins 等「top crypto casinos / alternatives 2026」榜、btcgambling 排行 → 交叉出高共識品牌。
3. **營收/規模訊號** — 上市博弈公司走 Statista/financecharts/Tracxn(Flutter/Entain/Aristocrat…) 佐證「傳統大廠」面向。
4. **主題/機制訊號** — 從各平台評測抓可玩機制(VIP 層數/rakeback/rain/leaderboard/provably fair/原創遊戲)做玩法雷達。

**每輪流程**：先 WebSearch「top online/crypto casino 2026 traffic ranking SimilarWeb」+「Casino Guru big casinos」→ 收 8–15 候選 → 逐一 WebFetch SimilarWeb 頁確認仍在類別榜且趨勢向上 → 取交集/高共識前 N 寫入 `platforms.json`（附抓取日期 + 訊號來源）→ 設 T1(7天)/T2(14天)/T3(30天) 刷新週期、到期重跑。

**參考標竿平台**（種子節點，非固定清單）：Stake（品牌/流量標竿、VIP/rakeback + 原創遊戲藍本）、BC.Game（大遊戲庫 + Chat Rain + 大廳模組化）、Roobet（美/拉美、competitor 展開種子）、SOFTSWISS（turnkey iGaming 供應商 = 平台「模組如何切分」權威）、GR8 Tech/Soft2Bet（headless CMS + 事件驅動 bonus engine = 後台/活動框架範本）。

---

## B. 遊戲軌取材：如何每輪重新列出「新出的遊戲 + 評價」

`games-catalog.json` 存 cursor（`media_last_run` + 各來源 high-water 日期 + 已復刻 slug 去重集）。每輪：

**STEP 1 — 結構化主拉（優先）Slotslaunch API**（最機器友善）
- base `https://slotslaunch.com/api`，需 token + Origin header。
- `GET /api/games?order_by=updated_at&updated_at=<last_run>&published=1`（150/頁，分頁到日期早於 cursor）→ 只拿新/異動遊戲，帶 provider/release date/RTP/volatility/features/reels/paylines。
- 排名端點：`/api/rankings/best-new-slots`、`/api/rankings/trending`(rank+change+times_played)、`/api/rankings/highest-rated`、`/api/rankings/most-rated`。
- 參考端點：`/api/providers`(**每輪重新拉→自動接住新工作室**)、`/api/types`、`/api/themes`。
- （無 token 時退回 STEP 2–3 的抓取來源即可，不阻斷。）

**STEP 2 — 專家評分 BigWinBoard**
- `GET https://www.bigwinboard.com/new-slots/`（或 RSS `https://www.bigwinboard.com/feed/`）。解析卡片：title/provider/0–10 專家分/release date。留 date ≥ last_run。
- 有潛力者深抓評測頁(pattern `/[game]-[provider]-slot-review/`)取確切分數 + RTP + 最大贏 + 一句機制描述。

**STEP 3 — 人氣 SlotCatalog**
- 抓 `https://slotcatalog.com/en/New-Slots`(分頁)按 release date 排 → 取 name/provider/date/**SlotRank**(掃 50+ 市場大廳的客觀曝光度)/Users Rating/RTP/variance/max-win。
- 選讀 `/en/popular-slots` 取當前 top-N 交叉核對熱度；可切語言/地區取地域加權 SlotRank。

**STEP 4 — 群眾/hype**
- 掃 AskGamblers `/casino-games/online-slots/new` + 社群層(CasinoGrounds 討論串、AskGamblers 論壇、streamer 大獎 clip 量) 找 STEP1–3 浮現的候選名；每年一次讀 AskGamblers Awards「Best New Slot」提名當精選短名單。

**STEP 5 — metadata 驗證（供應商官頁）**
- 每個存活候選抓原工作室遊戲頁取 canonical release date/官方機制名/RTP/volatility/max-win/美術。供應商清單本身每輪從 Slotslaunch `/api/providers` 或 SlotCatalog provider 過濾重新推導。

**STEP 6 — 合併去重**：以正規化(game+provider) slug join 全來源，一遊戲一候選 record，帶 bigwinboard_score / slotcatalog_slotrank + users_rating / slotslaunch_trending_rank + rank_change + times_played / release_date / RTP / volatility / max_win / mechanic tags / hype_notes。剔除已復刻集。

**STEP 7 — 評分排序**：算複合候選分（權重見下），降序取 top-N 為本輪候選清單，寫進 `games-catalog.json`（status: candidate）。

**STEP 8 — 更新 cursor**：推進 `media_last_run` + 各來源 high-water。因每步查 live 端點、供應商每輪重推 → 目標清單完全重生，無固定清單。

### 候選評分訊號（權重由重到輕）
1. **專家評分** — BigWinBoard 0–10（≥8/10 列優先層）；AskGamblers/Casino Guru 專家裁決。單一最強「值得復刻」訊號。
2. **SlotCatalog SlotRank** — 客觀跨市場人氣（快速攀升/榜首 = 真的在被玩）。
3. **Slotslaunch trending rank + rank_change + times_played** — 即時遊玩動能；新品大正 rank_change = 早期爆發訊號。
4. **玩家評分** — SlotCatalog Users Rating / AskGamblers player score（與專家分背離本身即資訊）。
5. **hype/社群** — streamer 大獎 clip 量、論壇串熱度、Awards 提名（人氣先行指標）。
6. **供應商血統** — 高訊號工作室(Hacksaw/Nolimit/ELK/Pragmatic/Push/Play'n GO/NetEnt/BGaming)先驗更高。
7. **機制新穎度** — 真的新/獨特機制(cluster 演化/grid 擴張/新 bonus-buy 或乘數系統)即使中分也值得復刻(教一種新互動)、標機制型別並加權。
8. **最大贏 & 波動 profile** — 極高 max-win(x15000+) + 高波驅動 streamer/玩家興趣。
9. **新鮮度** — release 在窗內，越新越加權，保持 pipeline 當前。
10. **跨源共識** — 專家分 AND SlotRank AND trending 同時高 = 最高信心復刻目標（最終 tie-breaker/乘數）。
