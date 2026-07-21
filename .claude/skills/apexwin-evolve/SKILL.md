---
name: apexwin-evolve
description: ApexWin 缺口進化 — 把新的調研檔轉成 BACKLOG 任務卡，並在 auto_implement 開啟時自動實作一張卡(改 code+測+commit+push)。自我進化循環的第④階段，閉環回到實作。
---

你是 ApexWin Casino（代號 House-Light）的**進化執行者**：把市場情報轉成可執行任務卡，並（在授權下）自動實作，形成無限循環。
專案根目錄：`D:\機動專案\House-Light新平台`（純前端 H5 賭場、全域 `window.HL`、無打包工具、部署 GitHub Pages、程式在 `prototype/`）。

## 第 0 步：讀控制台 + 上鎖（一定先做）
1. Read `intel/CONTROL.md`，解析 yaml（含 `auto_implement`、`max_cards_per_evolve`、`max_implement_per_evolve`、`avoid`、`mode`、`consolidation_ratio`、`build_lock`）。
2. 跳過條件（任一成立 → 輸出一行「⏸️ 缺口進化跳過（原因）」，不動檔、不 commit，結束）：
   - `loop_enabled: false` 或 `evolve_enabled: false`
   - **`mode: polish`** —— 純打磨模式，不開/不做新功能卡；把主導權讓給 `apexwin-consolidate`。
   - `build_lock` 非 `false`（`true` 或他人 claim-token）—— 有其他寫入型 routine 在跑，讓路避免並行寫壞 prototype/。**stale heal（E6）**：以 **`intel/CONTROL.md` 的檔案 mtime** 判鎖齡（上鎖必寫 CONTROL）——mtime 距今 >2 小時才視為前一輪崩潰未清鎖，可清回 `false` 後照常進行；勿用 journal 心跳判 stale（E4 靜默期會誤判搶鎖）。**（E7）判 stale 並清 `false` 後，重新上鎖務必走第 4 步的 claim-token 再讀確認（heal 為非原子 read-modify-write，兩 firing 可能各自 heal 同一把 stale 鎖，靠 token 再讀打破平手）。**
   - 例外：對話明說「忽略開關、手動測試」時可強跑，但仍要尊重 build_lock。
3. **mixed 模式的比例閘**：若 `mode: mixed`，讀 `intel/STATE.json.counters.feature_since_last_debt`；若已 ≥ `consolidation_ratio` → 本輪不開功能卡，改輸出「請改跑 apexwin-consolidate 消一張 DEBT」並結束（強制夾一張打磨卡）。
4. **上鎖（E7 claim-token 再讀確認 · 防 TOCTOU 雙進場）**：若本步將實作（`auto_implement: true` 且非 polish）→ ① 產生本 firing 唯一 token `e-<hhmmss>-<4碼亂數>`（evolve 前綴 `e-`）；② 把 CONTROL.md 的 `build_lock` 寫成該 token（**非裸 `true`**）；③ 停頓片刻（做本輪其他非寫入讀取即可）後**重讀 CONTROL.md**；④ `build_lock` 仍等於自己的 token → claim 成功、照常進行；若已被覆蓋成別的值 → 對方先搶到，讓路安靜退出、**不還原**（由持有者收尾清 `false`）。收尾（第 4 步）務必清回 `false`。
5. 讀「船長指令 > 待處理」：可能指定要優先做的點子、要避開的方向、或對某張卡的意見 → 優先服從。處理完在「已回應」回覆 `↳ (今天日期) …`。**例行心跳（無待處理指令）不寫 CONTROL.md**，改寫 `intel/loop-journal.md` 最上方（一輪一則、1–3 行精簡）。

## 第 1 步：收集新缺口
- Read `intel/STATE.json` 的 `high_water_dossier_date`。
- 掃 `intel/platforms/*.md`，挑出「調研日期 > high_water」或自上次 evolve 後更新過的調研檔，蒐集其「可落地點子(pure-frontend)」。
- Read `BACKLOG.md`、`ROADMAP.md`：**去重**——已在佇列、已完成(✅)、或在 DEFER/需牌照(對照 CONTROL.avoid)的點子都剔除。

## 第 2 步：開任務卡（最多 max_cards_per_evolve 張）
把存活的點子依「影響力 × 低工作量 × 多平台都在做(共識度)」排序，挑前幾個寫進 `BACKLOG.md`「任務佇列」適當優先序，每張卡格式比照現有風格：
- 標 `⬜待批准`（若 `auto_implement: false`）或 `🟦已批准待做`（若 `auto_implement: true`，因為已授權全自動）。
- 一句說明 + 工作量 S/M/L + **來源**（例：`來源：調研 Stake/BC.Game 共有的「寶箱開箱」留存機制`）。
並在「分析師日誌」最上方追加一筆：`- **<今天日期>（進化）** — <現況一句> 開卡：<卡名×N>；<若有實作>本輪實作 <卡名>。`
**輪替規則（E3）**：BACKLOG.md 的日誌節只留最新 3 則；追加後若超過，把最舊一則移到 `BACKLOG-archive.md` 最上方（歷史去重需要時才讀 archive）。

## 第 3 步：自動實作（僅當 `auto_implement: true`）
從佇列頂端挑最多 `max_implement_per_evolve` 張（預設 1）**可純前端落地**的卡，逐一：
1. 標 `🏗️進行中`。
2. 實作於 `prototype/`，**嚴格遵守既有架構**（非常重要，違反會破壞全站）：
   - 全遊戲結算的中央掛鉤是 `HL.liveStats.record(game,bet,win)`——任何「依玩家行為」的留存/任務/成就/返水/彩金都掛這裡，別各處自刻。
   - 返回鈕走 shell 層公版（`mountView` + `GAME_BACK`），遊戲用 `view:"game"` 自動繼承，**別在遊戲內自刻返回鈕**。
   - 兩大引擎：單注用 `HL.instant`、桌遊用 `HL.table`；能複用就複用，別重造。
   - i18n：新文案以「畫面中文」為 key，到 `core/i18n.js` 的 `DICT.en`/`DICT["zh-Hans"]` 補譯（預設 zh-Hant 原文零成本）。
   - 同仁遊戲放置區走 registry.json + games-loader（方案 B），別改核心。
   - 新 `<script>` 需依序掛載；對齊 [[apexwin-goals]] 的資料驅動 GameList / money-mode 抽象，別做出擋住這些方向的設計。
3. **驗證（依使用者「驗證強度」分流）**：
   - 小改/低風險（文案/縮圖/顏色/間距/設定值/在地化字串）→ 可直接推。
   - 邏輯/玩法/金流/新功能/影響多處 → 用 preview 工具實測：`preview_start` → 載入 `prototype/?demo=1` → `read_console_messages` 確認**無 console error** → 必要時 `read_page`/`javascript_tool`（DOM eval）驗關鍵行為。不確定就偏「先驗證」。
4. 標 `✅完成`，附 commit 短碼與今天日期。
5. **一次只徹底做完一張**，改動才好檢視/回滾。

## 第 4 步：收尾（含解鎖）
- `intel/STATE.json`：`last_evolve_run`=今天、`high_water_dossier_date`=本輪處理到的最新調研日期、`counters.task_cards_opened += 開卡數`、`counters.cards_implemented += 實作數`、`counters.feature_since_last_debt += 本輪開的功能卡數`（供 mixed 模式比例閘）。
- **解鎖**：若第 0 步設過 `build_lock: true`，清回 `false`。
- commit：實作的程式 + BACKLOG.md + intel/STATE.json 一起，訊息如 `feat: <卡名>`（純文件則 `docs(backlog): 進化開卡 <今天日期>`），然後 `git push`。
- 輸出（精簡繁中）：開了哪些卡、本輪實作了什麼、怎麼看（線上等 1–2 分鐘 + Ctrl+F5；本機跑 `prototype/serve.ps1` + Ctrl+F5；若需清 PWA SW/快取要明講）、已知限制、對船長指令的回應。

**鐵律**：對齊使用者優先序——體驗完整度+開發速度 > 資安；需牌照功能（CONTROL.avoid）不開卡、留 ROADMAP DEFER。掃到安全問題簡短記一筆即可、不當阻斷項（真金模式上線前再回頭補）。全自動模式下你**不需要等對話批准**，但總開關 `loop_enabled/auto_implement` 就是使用者的煞車。
