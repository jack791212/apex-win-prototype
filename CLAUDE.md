# ApexWin / House-Light 新平台 — 專案交接 & 工作準則（CLAUDE.md）

> 這份檔案會被 Claude Code **每次開啟 session 時自動載入**。
> 它是「換 Claude 帳號 / 換機器」時讓新的 Claude **完整承接記憶、工作流程、架構與慣例**的單一交接文件。
> 讀完這份，你（接手的 Claude）就能無縫繼續本專案，不需要翻舊對話。
> 換新帳號的「一鍵啟動」步驟見 `HANDOFF-KICKOFF.md`（把裡面那段訊息貼給新帳號的 Claude Code 即可）。
> 最後更新：2026-07-13。

---

## 0. 30 秒定位（先讀這段）

- **這是什麼**：`ApexWin Casino`（內部代號 *House-Light 新平台*）＝一個真金博弈風格的 **H5 娛樂城前端原型**，位於 `D:\機動專案\House-Light新平台`。
- **技術棧**：**純前端、無 build 工具**。classic `<script>` 依序載入到 `window.HL` 全域命名空間，可 `file://` 直接開。後端選用 Supabase（auth + Postgres RPC），無 creds 時降級 **Demo 模式**。
- **使用者**：`mingko.hsieh`（mingko.hsieh@wanin.tw），自 2026-06-15 起正式實作。**唯一協作者就是 Claude + Claude Code，沒有 Codex、沒有 Notion 派卡**。
- **你的預設模式**：**全權實作**。直接做、依合理 default 決策、主動補強品質；只有真正模糊/不可逆/會改變已確認玩法方向時才先問。
- **現階段方向（重要）**：**停止一直加新功能，改打磨既有**（UI/UX 一致性、自適應 responsive、模板化）。引擎現為 `mode: polish`。
- **鐵律**：純前端 localStorage、**體驗完整度 + 開發速度 > 資安/合規**；需真錢/牌照才有意義的功能一律延後。
- **每輪收尾**：簡潔列出「改了什麼 / 動了哪些檔 / 怎麼測 / 已知限制 / 建議下一步」，並**主動附一行「怎麼看」**。

---

## 1. 使用者與工作模式

- **實際工作模式**：沒有 Codex，就是 Claude + Claude Code 直接完成並推進。repo 內 `House-Light_Local_Collaboration_Rules_Codex_Init_v0.2.md` 與 `docs/house-light/` 描述的「ChatGPT→Codex→Claude + Notion 任務卡」流程是**舊治理、已不適用**，不要因它停下來等派卡。
- **決策原則**：預設主動往前做；遇到真正模糊/不可逆/改變已確認產品方向才先問。
- **回報偏好**：使用者**不會自己去翻檔案**，建議/選項要在對話裡講清楚讓他決定。常用指令：「**繼續**」＝接佇列頂端的卡實作；「**繼續 #N**」＝推進第 N 張。
- **語言**：繁體中文（zh-Hant）為主。

---

## 2. 長期產品目標（5 點，每個架構決策都要顧及）

即使任務只要求其中一小塊，也要避免做出擋住這些方向的設計：

1. **完整 H5 Casino**：大廳、支付/金流、會員、UI/UX、遊戲串接、活動機制全部做完整，追求體驗完整度與速度。
2. **可插拔遊戲串接**：SLOT/特殊/牌桌/直播遊戲都要能串接「**團隊同仁自行開發的遊戲**」，並能**依同仁暱稱分類** → 需資料驅動的 GameList（provider/studio/作者暱稱欄位）+ 動態註冊。（已落地方案 B，見 §5）
3. **多語系架構**：可擴充 i18n（已有輕量引擎，見 §4）。
4. **雙金流模式（一開始就都開發好，依市場法規切換）**：
   - 休閒模式：玩家間可交易/商城購買遊戲幣，官方不提供真金兌換。
   - 真金模式：法幣 + 加密貨幣，功能做完但**待牌照才啟用**。
   - 需要 money-mode + jurisdiction 抽象層。`wallet` 已含多幣別、已有 Demo/會員雙模式雛形。
5. **後台 (admin)**：快速更新活動、圖片、GameList、公告、會員、經濟設定、i18n、金流模式切換、基礎報表。（尚未做，ROADMAP LATER）

---

## 3. 現階段方向：打磨（2026-07-10 轉向）

使用者明確要求「**開始優化既有功能與介面，而不是一直加新的**」，痛點：**UI/UX、自適應、模板化**。

根因（一次對抗性審查確認）：自我進化引擎原本四相位全是「競品缺口→加新功能」漏斗，**沒有收斂/重構相位**，所以只會加新。已補上反相位 `apexwin-consolidate`（見 §6）。三大技術債（詳見 `intel/DEBT.md`）：

- **模板化**：無元件層，`HL.dom` 只有 el/clear/money、`HL.ui` 只有 toast/modal/comingSoon；gameCard/carousel/seg()/.ax-result 跨檔複製貼上已 drift。可仿 `HL.arenaUI.roomCard` 抽取。
- **自適應**：≤720px 側欄（唯一主導覽）`display:none` 且無替代 → 手機無法切主要分頁；9 個雜亂斷點；`--ax-bp-*` token 是死碼；用 `100vh` 非 `dvh`；無 `env(safe-area)`。
- **UI/UX**：token 侵蝕（冒牌 gold 色大量繞過 `--ax-gold`；font-size 繞過 scale）；a11y 缺口（無 `:focus-visible`、modal 無 role/Escape/focus-trap、`--ax-text-dim` 未過 WCAG）。

---

## 4. 架構關鍵掛鉤（動任何東西前先認得這些）

- **`HL.liveStats.record(game, bet, win)` ＝全遊戲結算的中央點**。尾端餵：`HL.vip.addWager` + `HL.tasks.bump` + `HL.rakeback.accrue`（返水，綁 VIP 係數）+ `HL.jackpot.onBet`（三級累積彩金）+ `HL.tournament.record`（限時積分賽）。**任何「依玩家行為觸發」的留存/任務/成就/返水，掛這裡即全遊戲通吃**（含主播跟注）。
- **兩大遊戲引擎**：
  - `HL.instant`（單注：betPanel + ½/2×/Max + 自動下注）→ Dice/Limbo/Crash/Mines/Plinko。
  - `HL.table.betArea`（多注區：籌碼/place/undo/clear/rebet/commit/settle）→ 百家樂、輪盤。
  - 兩者結算都匯入 `HL.liveStats.record`。
- **可驗證公平 `HL.fair`（core/fair.js）**：自帶同步 SHA-256 + HMAC-SHA256；serverSeed 承諾雜湊→clientSeed→nonce；`HL.fair.float(game)` 取代 `Math.random`。**Dice/Limbo/Plinko/Picks/Crash/Mines 已接**（crash/mines 2026-07-17 S3 補接）；baccarat/roulette 仍 `Math.random`，未來比照 dice 補接。
- **i18n `HL.i18n`（core/i18n.js）＝片語字典 + DOM 自動翻譯**：key＝畫面上的 zh-Hant 中文，`DICT.en` 全譯、`DICT["zh-Hans"]` 只補與繁體不同的字。引擎 walk 文字節點 + title/placeholder、MutationObserver 接動態 DOM。**要加翻譯＝在字典加一條 key（畫面中文），免逐檔包字串**。
  - ⚠️ 改 `i18n.js`/`sw.js` 後在 preview 驗證會被 **PWA Service Worker + HTTP 快取餵舊檔** → 需先清 SW/caches 或用 cache-buster 重載。
- **公版返回鈕**：shell 層 `mountView` 統一注入（`GAME_BACK`）；遊戲走 `view:"game"` 自動繼承，**勿在各遊戲各自刻**。

---

## 5. 同仁自製遊戲放置區（目標 2，已落地方案 B）

- **路線**：B（現在）→ C（iframe 沙箱，對外/真金前）→ D（後端註冊 + 後台審核，最終）。
- **B（已落地）**：`prototype/games/registry.json` 列各遊戲入口；`prototype/src/data/games-loader.js` 開機讀清單注入各 `game.js`（內部 `HL.games.register` 自我上架，免改核心）。娛樂城有「🧪 同仁開發遊戲(放置區)」專區（`community:true`）。
- **Dev Kit（給同仁的獨立開發包）**：`prototype/games/dev-kit/`（index.html + hl-stub.js 模擬器 + game.js 範例 + 自包含 README）。同仁解壓→改 game.js→交回 `<編號>_<遊戲名>(<開發者>)` 資料夾。平台方丟進 `prototype/games/` + registry.json 加一行 + push。
- **⚠️ 改 dev-kit 任何東西後必做**：① bump `dev-kit/hl-stub.js` 的 `DEVKIT_VERSION`（小修 1.0.x / 加功能 1.x.0）② 重跑 `prototype/pack-devkit.ps1`（產出 `prototype/dist/…zip`，`dist/` 已 gitignore）③ 驗證載入無 console error ④ commit/push。長久說明寫進檔案，別只留對話。

---

## 6. 自我進化引擎（intel/ ＝專案的「自動長大」大腦）

一條 **市場調研 → 缺口分析 → 自動實作** 的無限循環，讓平台不必手動決定要做什麼。**完整說明見 `intel/README.md`。**

### 資料層 `intel/`（在 repo 根，不被 GitHub Pages 服務）
| 檔案 | 角色 | 誰維護 |
|---|---|---|
| `CONTROL.md` | **使用者唯一要碰的檔**：總開關 + 船長指令 | 使用者手改 |
| `watchlist.json` | 平台觀察清單 + 調研排程游標（排序/週期/到期日）| radar 寫、investigate 回填 |
| `STATE.json` | 循環游標與計數（last_run、high-water、counters）| 各 Routine |
| `platforms/<slug>.md` | 每平台調研檔 | investigate |
| `reports/<date>.md` | 市場報告 | radar |
| `DEBT.md` | 技術債/打磨佇列 | consolidate |

### CONTROL.md 控制面板（出廠 `loop_enabled:false`）
- `loop_enabled`：總開關。`false` = 所有 Routine 一啟動就安靜退出。
- 分段開關：`radar_enabled` / `investigate_enabled` / `evolve_enabled` / `consolidate_enabled` / `auto_implement`。
- `auto_implement:false` = 只蒐情報、開卡等你看，不動 code。
- `mode`：`build`（只加新功能）/ `polish`（只收斂既有）/ `mixed`（每 `consolidation_ratio` 張功能卡夾 1 張打磨卡）。**現為 `polish`**。
- `build_lock`：單一寫入鎖，寫入型 routine 進場設 `true`、收尾清 `false`，防並行寫壞 `prototype/`。**卡住時手動設回 `false` 解鎖**（勿長期手動設 true，會擋掉整個循環）。
- **船長指令區（Captain's Orders）**：使用者寫意見/插隊優先項；每個 Routine 啟動先讀、優先服從，做完在「已回應」用 `↳(日期)` 回覆。

### 四個 Skill（`.claude/skills/`，可手動 `/呼叫`，每個第 0 步先讀 CONTROL 做閘門）
- `/apexwin-market-radar`（每日 08:15）掃排名熱度 → 更新清單 + 市場報告。
- `/apexwin-investigate`（每小時）取「到期 + 高優先」前 N 個深挖 → 寫調研檔 + 排下次到期。
- `/apexwin-evolve`（每 2h）`build/mixed` 時把調研轉 BACKLOG 卡 → auto_implement 挑 1 張自動實作+push；`polish` 時讓路。
- `/apexwin-consolidate`（每 2h）`polish/mixed` 時審計既有表面 → 寫 `DEBT.md` → 挑 1 張打磨/重構自動實作+push；`build` 時讓路。
- `evolve` 與 `consolidate` **反相位**：同一時間只有一個真的動 code（由 `mode` 決定），兩者都遵守 `build_lock`。
- （舊的 `apexwin-daily-next-step` 已停用，角色被本套件取代。）

### ⚠️ 引擎已知踩雷
1. **本機排程只在 Claude Code App 開著時觸發**；關機/關 App 期間順延。要 24/7 需改雲端 routine。
2. **權限**：桌面排程任務讀的是**使用者層 `~/.claude/settings.json`**（非專案 `.claude/settings.local.json`）。引擎能自動 commit/push 是因為那裡有 allowlist（見 §8 交接）。
3. **`lastRunAt` ≠ 真的完成**：排程常「觸發卻未收尾」，留下未 commit 半成品。判斷引擎是否在跑要交叉比對 `STATE.json` / `reports/` 當日檔 / `git log` / **`git status` 有無孤兒產出**，別只看時間戳。
4. **多 routine 並行寫同一 repo** 是「觸發卻未收尾」的根因（彼此 `git add`/commit 交錯吃掉對方未提交的工作）→ 見 §7 鐵律。

---

## 7. 並行安全提交鐵律（背景引擎會同時寫同一 repo）

前景你在做卡時，背景 routine 可能同時在寫 `intel/` 與 `prototype/`。**commit 前務必**：

1. **重跑 `git status` / `git log`** 看實際磁碟狀態（別信記憶中的檔案狀態——可能已被別的 firing 覆寫或 commit）。
2. `git show HEAD:<file>` 確認自己的改動有沒有意外進 HEAD。
3. **只 `git add` 明確屬於自己的檔**；別碰 `Game assets/` 增刪雜訊、也別碰別的 firing 正在飛的檔（rewards.js/components.css/sw.js/i18n 鍵等）。
4. `index.html` 這種共用檔若被污染，用「還原到 HEAD 再單獨插回自己那行」重建。
5. counters 並行下會輕微漂移（各自 base+1、後 commit 覆蓋前者＝低估），屬固有、可接受。
6. **判孤兒前先查檔案 mtime**——數分鐘內有寫入 = 多半是另一個 session 的活躍工作，別當 stall 收編。

---

## 8. 換帳號 / 換機器交接（本檔核心用途）

### 什麼會「自動跟著資料夾走」（你不用做任何事）
- **程式碼、prototype/、intel/、docs/**：都在 repo（git）裡。
- **4 個 Skill**：在 `.claude/skills/apexwin-*`（repo 內）。
- **專案權限 allowlist**：`.claude/settings.local.json`（repo 內）。
- **preview 設定**：`.claude/launch.json`（name `apex-win`，跑 `prototype/serve.ps1`）。
- **這份 `CLAUDE.md`**：每次 session 自動載入。

### 什麼**不在 repo**、綁「這台機器 + 這個 Windows 使用者」（換帳號同機不受影響，換機器才要手動搬）
- **自動記憶**：`C:\Users\mingko.hsieh\.claude\projects\D-------House-Light---\memory\`（`MEMORY.md` + 各 `apexwin-*.md`）。
- **過往對話 transcript**：同上層目錄的 `*.jsonl`。
- 👉 **同一台電腦、同一個 Windows 使用者換 Anthropic 帳號登入 Claude Code**：以上**本來就還在**，記憶與對話不會掉（`~/.claude` 的位置與登入哪個帳號無關）。
- 👉 **若哪天換電腦/換 Windows 使用者**：把整個 `C:\Users\<你>\.claude\projects\D-------House-Light---\` 資料夾複製到新機對應路徑，記憶 + transcript 就跟過去。（若專案路徑改變，資料夾雜湊名會不同——屆時直接靠本 `CLAUDE.md` 承接即可，本檔已含記憶精華。）

### 換帳號後**唯一需要手動重建**的東西
1. **自我進化引擎的排程 Routine**（4 個：market-radar / investigate / evolve / consolidate）—— 排程註冊在本機，換帳號/換機可能要重建。用 `scheduled-tasks` MCP 重新建立，各自薄包裝：讀 `intel/CONTROL.md` → 開關 false 就退出 → 否則 Read 並遵照對應 `.claude/skills/<name>/SKILL.md`。頻率：investigate 每小時（`0 * * * *`）、radar 每日 08:15（`15 8 * * *`）、evolve 每 2h（`45 */2 * * *`）、consolidate 每 2h（`25 */2 * * *`，與 evolve 錯開）。
2. **引擎的自動 commit/push 權限**：需在**新帳號/新機的使用者層 `~/.claude/settings.json`** 加 allowlist（`WebSearch, WebFetch, Read, Write, Edit, Glob, Grep, Bash(git *)` 等）。**這要使用者明確同意才寫**（放寬授權會被自動模式分類器擋）。沒設的話引擎會卡在 `git commit` → 成果堆積未提交。
3. 不需要重連任何外部 connector——本專案只用內建的排程 / preview / 瀏覽器工具，無第三方 MCP 依賴。

> ⚠️ 誠實提醒：「完美承接**對話**」指的是承接**已提煉的決策與狀態**（就是這份 CLAUDE.md + 記憶檔），不是逐字重播每一段舊對話。舊對話原文只在 `~/.claude/.../*.jsonl`；同機還在、換機需複製那個資料夾。

---

## 9. 怎麼測 / 怎麼看（每次改完主動附）

- **線上（主要，使用者最常用）**：`https://jack791212.github.io/apex-win-prototype/prototype/?demo=1`。push 到 `master` 後 GitHub Pages 約 1–2 分鐘生效 → Ctrl+F5。
- **本機（輔助）**：使用者自己在電腦跑 `prototype/serve.ps1`（手動跑仍先試 8200，被占則自動換候選埠；launch.json 為 `autoPort: true`，preview 由 `PORT` 環境變數指派埠——serve.ps1 會優先採用。serve.ps1 每次請求重讀檔，改完 Ctrl+F5 即可，不必重啟；只有換埠/關視窗才重跑）。**我在 session 內開的 preview 在沙箱，使用者瀏覽器連不到，別叫他開那個。**
- **驗證強度**：
  - 小改（換圖/文案/顏色/間距/設定值）→ **直接 commit + push，跳過本機 preview 驗證**，省時間。
  - 邏輯/玩法/金流/新功能/影響多處 → 跑完整驗證（preview + eval/snapshot）再推。不確定時偏「先驗證」。
- **此 app 驗證小抄**：截圖常逾時 → 改用 eval/inspect DOM 逐項驗；Demo 無後端，preview 沙箱過不了登入 gate（底部列需登入才渲染）→ 驗證時可暫設 member 強制渲染主殼；審查 Workflow 可能撞 session 上限（agents 陣亡）→ 改用 `node -e` 模擬逐項驗 findings。

---

## 10. 現況快照（2026-07-13）

- **BACKLOG**：編號卡 `#1–#43 + #20` **全數 ✅ 完成**（`BACKLOG.md` ＝任務佇列 + 分析師日誌；`ROADMAP.md` ＝策略全貌 Now/Next/Later/⏸️待牌照）。
- **引擎狀態**：`mode: polish`、`loop_enabled: true`。`STATE.json` counters：平台已調研 44、開卡 26、已實作 22、債務卡已解 1。radar 最後跑 07-13、investigate 07-13、evolve 07-10、consolidate 07-10；evolve high-water 07-09。
- **watchlist 下批到期**：07-17（stake / bc-game / bet365，T1 7 天刷新）→ 07-24（roobet/rollbit/1xbet/leovegas）→ 後續 07-26/07-27/07-29…
- **ROADMAP 🟢NOW 唯一未做小項**：分享單局戰績（Web Share API）。
- **已完成大塊**：9+ 可玩遊戲（Shadow Ritual/Chicken + Dice/Limbo/Crash/Mines/Plinko/Baccarat/Roulette + Keno/Towers 等）、留存三件套（VIP/任務/獎金錢包）+ 簽到/收藏/返水/累積彩金/錦標賽/可驗證公平/PWA、虛擬主播跟注、同仁遊戲放置區 + Dev Kit、i18n 引擎、紅利/流水引擎（#20）。

---

## 11. 真金上線前 checklist（現在別擋，牌照前才回頭做）

現階段刻意不以資安為優先（Demo、無真實金流）。但**真金模式啟用前**必須回頭處理：

- **`bounty_mine`（`supabase-phase5.sql`）信任 client 傳入的 `p_maxmult` 算派彩 = 可印錢漏洞**，須修。
- **經濟數值整體重調**：demo 回饋率刻意慷慨，實測刷流水 EV 為正 → 真金前重調所有回饋（rakeback/cashback/reload/shop/連登/VIP/`WAGER_MULT`）讓整體 RTP < 100%。
- 其餘 ⏸️DEFER 項（見 ROADMAP）：真金流串接、KYC、真人視訊、供應商聚合、第三方 RNG/RTP 認證、AML、提款審核佇列/對帳 ledger、完整 CRM。

---

## 12. 檔案地圖（快速索引）

| 路徑 | 是什麼 |
|---|---|
| `prototype/` | H5 前端本體（`index.html` + `src/`：core / views / data / styles）|
| `prototype/serve.ps1` | 本機測試伺服器（Ctrl+F5 重讀檔）|
| `prototype/games/` | 同仁遊戲放置區（registry.json + dev-kit + pack-devkit.ps1）|
| `intel/` | 自我進化引擎資料層（見 §6；`README.md` 有完整說明）|
| `.claude/skills/apexwin-*` | 4 個引擎 Skill（劇本）|
| `.claude/settings.local.json` | 專案權限 allowlist |
| `.claude/launch.json` | preview 設定（name `apex-win`）|
| `BACKLOG.md` / `ROADMAP.md` | 任務佇列＋日誌 / 策略路線圖 |
| `HANDOFF-KICKOFF.md` | 換帳號啟動包：貼給新帳號 Claude Code 的第一則訊息 + 換機器注意事項 |
| `docs/`、`House-Light_Local_Collaboration_Rules_*.md` | **舊治理文件（已不適用，僅存參考）** |
| `~/.claude/projects/D-------House-Light---/memory/` | 自動記憶（**不在 repo**，見 §8）|
