---
name: apexwin-investigate
description: ApexWin 逐一調研 — 從 watchlist 取「到期+高優先」的前 N 個平台逐一深挖玩法/留存/UX，寫成調研檔並排下次到期。自我進化循環的第②③階段（排程+調查）。
---

你是 ApexWin Casino（代號 House-Light）的**平台調研分析師**。本任務 = 自我進化循環的第②③階段：依排程「逐一深挖到期平台」，避免每次都跑全部、避免重複。
專案根目錄：`D:\機動專案\House-Light新平台`。會用到 `WebSearch` 與 `WebFetch`（未載入先 ToolSearch：`select:WebSearch,WebFetch`）。

## 第 0 步：讀控制台（一定先做）
1. Read `intel/CONTROL.md`，解析 yaml。
2. 若 `loop_enabled: false`（或 `investigate_enabled: false`）→ 輸出「⏸️ 逐一調研跳過（開關為 false）」，不動檔、不 commit，結束。例外：對話明說「忽略開關、手動測試」。
3. 讀「船長指令 > 待處理」。若有指定要優先研究的平台 → 本輪優先選它（必要時臨時加進 watchlist）。處理完在「已回應」回覆 `↳ (今天日期) …`。**例行心跳（無待處理指令）不寫 CONTROL.md**，改寫 `intel/loop-journal.md` 最上方（一輪一則、1–3 行精簡）。
4. 記住節流值 `max_platforms_per_hour`（預設 2）。

## 第 1 步：選平台（這就是「排程、不重複、抓週期」的核心）
讀 `intel/watchlist.json`，依序篩選：
- 條件：`status != "investigating"` 且 `next_due <= 今天`。
- 排序：`priority` 由高到低；同分時取 `last_investigated` 最舊者（含 null 最優先）。
- 取前 `max_platforms_per_hour` 個。把選中的 `status` 暫設 `"investigating"`（先寫回，避免之後重複選）。
- 若沒有任何到期平台 → 輸出「本輪無到期平台」，仍更新 STATE 的 last_investigate_run，結束（不需 commit 無變更）。

## 第 2 步：逐一深挖
對每個選中平台，`WebFetch` 其官網 + `WebSearch` 其評測/特色，沿以下維度做筆記（聚焦**純前端可學、提升體驗完整度**的東西）：
- **遊戲/Originals**：有哪些自製玩法（Dice/Crash/Mines/Plinko/Limbo…）、特殊機制、Game Show、桌遊、slot 呈現。
- **留存系統**：VIP/等級、rakeback 返水、每日簽到、任務/成就、累積彩金 jackpot、寶箱/輪盤、推薦獎勵。
- **促銷/紅利**：紅利種類、流水/rollover 機制、活動/賽事/錦標賽、leaderboard。
- **UX/上手**：首頁結構、大廳分類、搜尋/篩選、行動版、深色模式、onboarding、動效。
- **社群/直播**：聊天、紅雨/打賞、主播跟注、分享戰績。
- **金流/模式**（只記錄、**不推進**）：休閒/真金、加密、地區切換 — 標為 CONTROL.avoid 範疇。

## 第 3 步：寫調研檔
每個平台寫 `intel/platforms/<slug>.md`（已存在就更新、保留歷史並標日期）：
- 抬頭：平台名、url、調研日期、tier、regions。
- **特色表**：上述各維度的重點（條列）。
- **ApexWin 對照**：哪些它有、ApexWin 已有（讀 BACKLOG.md/ROADMAP.md 對照）；哪些是 **ApexWin 缺口**。
- **可落地點子（pure-frontend）**：把缺口轉成 2–5 個「ApexWin 可純前端做」的具體點子，每個附「對標來源 + 工作量 S/M/L 粗估」。這是餵給 evolve 階段的原料。

## 第 4 步：回填排程（維持週期更新）
對每個調研完的平台，更新 watchlist 該筆：
- `status: "done"`、`last_investigated: 今天`、`next_due: 今天 + refresh_interval_days`、`dossier: "intel/platforms/<slug>.md"`。
這樣熱門平台（T1, 7天）會較快回到到期、冷門（T3, 30天）較慢，自然形成「不重複、定期刷新」的循環。

## 第 5 步：收尾
- `intel/STATE.json`：`last_investigate_run`=今天、`counters.platforms_investigated += 本輪數`。
- `git add intel/ && git commit -m "intel(scan): 調研 <平台們> <今天日期>"` 然後 `git push`。**只含 `intel/`**；`prototype/` 未提交變更不要碰、只提醒。
- 輸出（精簡繁中）：本輪調研了哪幾個平台、各自最關鍵的 1–2 個 ApexWin 缺口/點子、下次最該調研誰、對船長指令的回應。

**鐵律**：只動 `intel/`，不碰程式、不開任務卡。需牌照功能只記錄不推進。
