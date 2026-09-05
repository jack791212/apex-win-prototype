# ApexWin / House-Light 新平台 — 專案交接 & 工作準則（CLAUDE.md）

> 這份檔案會被 Claude Code **每次開啟 session 時自動載入**。
> 它是「換 Claude 帳號 / 換機器」時讓新的 Claude **完整承接記憶、工作流程、架構與慣例**的單一交接文件。
> 讀完這份，你（接手的 Claude）就能無縫繼續本專案，不需要翻舊對話。
> 換新帳號的「一鍵啟動」步驟見 `HANDOFF-KICKOFF.md`（把裡面那段訊息貼給新帳號的 Claude Code 即可）。
> 最後更新：2026-08-21（競技場體驗優化輪；§4 新增 battleMode/battleTempo/onExit 三條掛鉤、§10 快照與驗證紀律重寫）。

---

## 0. 30 秒定位（先讀這段）

- **這是什麼**：`ApexWin Casino`（內部代號 *House-Light 新平台*）＝一個真金博弈風格的 **H5 娛樂城前端原型**，位於 `D:\機動專案\House-Light新平台`。
- **技術棧**：**純前端、無 build 工具**。classic `<script>` 依序載入到 `window.HL` 全域命名空間，可 `file://` 直接開。後端選用 Supabase（auth + Postgres RPC），無 creds 時降級 **Demo 模式**。
- **使用者**：`mingko.hsieh`（mingko.hsieh@wanin.tw），自 2026-06-15 起正式實作。**唯一協作者就是 Claude + Claude Code，沒有 Codex、沒有 Notion 派卡**。
- **你的預設模式**：**全權實作**。直接做、依合理 default 決策、主動補強品質；只有真正模糊/不可逆/會改變已確認玩法方向時才先問。
- **現階段方向（重要）**：引擎 2026-07-23 重構為**三軌雙線**（平台進化軌 + 遊戲擴充軌兩條成長線 + 維護健檢軌），現值 **`lead_track: games`**（2026-07-24 起；平台三缺口補完後轉遊戲軌領跑）。兩成長軌每輪重新調研+更新知識資料庫(`intel/db/`)+發卡+實作；遊戲軌有保真閘防劣質；三軌都內建拒絕閒置逃生閥。詳見 §6。
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
- **自適應**（⚠️ 2026-08-12 維護軌·12:00 窗複測更正：5 項 2026-07-10 痛點已解 4，僅「斷點分散」未收斂——「台帳承諾與現況不符」家族·比照 §4 baccarat/roulette 過時記載之更正）：~~≤720px 側欄（唯一主導覽）`display:none` 且無替代 → 手機無法切主要分頁~~〔✅ 已解：R1〈commit `8981686`, 2026-07-10〉手機主導覽改左側抽屜 `ax-drawer`，平台軌 P2 台帳「導覽殼層」已 partial→present〕；**9 個雜亂斷點仍在**（實測 `@media` px 值 560/480/720/1280/1024/860/760/721/520＝9 個 distinct·低優先·收斂需 preview 逐態驗視覺回歸故 headless 輪不落地）；~~`--ax-bp-*` token 是死碼~~〔✅ 已解：`grep -rn "ax-bp" prototype/src` 零命中＝死 token 已移除〕；~~用 `100vh` 非 `dvh`~~〔✅ 已解：18 處 `dvh`＋僅存 3 處 `100vh` 皆為 `min-height:100vh;min-height:100dvh` 漸進回退正確樣式〕；~~無 `env(safe-area)`~~〔✅ 已解：4 處 `env(safe-area)`〕。
- **UI/UX**：token 侵蝕（冒牌 gold 色大量繞過 `--ax-gold`；font-size 繞過 scale〔部分收斂：U3 已把 icon 字形遷入 `--ax-icon-*`，但 styles 仍餘 ~48 處硬寫 `font-size:NNpx`〔多為 hero/大數字顯示〕未全收，故不標已解〕）；a11y 缺口（~~無 `:focus-visible`~~〔✅ 2026-08-12 複測已解：`base.css:54` 有全域 `:focus-visible` 規則＋2 個元件級〕、~~modal 無 role/Escape/focus-trap~~〔✅ 已解：T2＋`core/ui.js:75` modal 具 `role=dialog`/`aria-modal`/`aria-label`/Escape/焦點鎖與還原〕、`--ax-text-dim` 未過 WCAG〔未複測·保留〕）。

---

## 4. 架構關鍵掛鉤（動任何東西前先認得這些）

- **`HL.liveStats.record(game, bet, win)` ＝全遊戲結算的中央點**。尾端餵：`HL.vip.addWager` + `HL.tasks.bump` + `HL.rakeback.accrue`（返水，綁 VIP 係數）+ `HL.jackpot.onBet`（三級累積彩金）+ `HL.tournament.record`（限時積分賽）。**任何「依玩家行為觸發」的留存/任務/成就/返水，掛這裡即全遊戲通吃**（含主播跟注）。
- **兩大遊戲引擎**：
  - `HL.instant`（單注：betPanel + ½/2×/Max + 自動下注）→ Dice/Limbo/Crash/Mines/Plinko。
  - `HL.table.betArea`（多注區：籌碼/place/undo/clear/rebet/commit/settle）→ 百家樂、輪盤。
  - 兩者結算都匯入 `HL.liveStats.record`。
- **可驗證公平 `HL.fair`（core/fair.js）**：自帶同步 SHA-256 + HMAC-SHA256；serverSeed 承諾雜湊→clientSeed→nonce；`HL.fair.float(game)` 取代 `Math.random`。**現況（2026-08-12 遊戲軌全面複驗）＝全 24 款登錄遊戲的「決定結果/派彩」路徑一律走 `HL.fair`（23 個 view 檔 grep 命中 `HL.fair`/`floatOr`；baccarat/roulette 已於 ~07-30 G5 隨對子/大小標修正一併遷入 `HL.fair.floatOr` 並補進保真閘 🔒 白名單——舊記載「baccarat/roulette 仍 Math.random」已過時、更正之）**。views 內殘留的 `Math.random` 全數經逐筆確認**僅屬非公平關鍵**（假玩家/血滴/火花動畫/`table-roulette.js:132` 滾號視覺/keno 玩家自選號/picks 盤口參數/mines 代客隨機翻——結果均由 `HL.fair` 決定並可事後重算），皆帶行內註記。
- **i18n `HL.i18n`（core/i18n.js）＝片語字典 + DOM 自動翻譯**：key＝畫面上的 zh-Hant 中文，`DICT.en` 全譯、`DICT["zh-Hans"]` 只補與繁體不同的字。引擎 walk 文字節點 + title/placeholder、MutationObserver 接動態 DOM。**要加翻譯＝在字典加一條 key（畫面中文），免逐檔包字串**。
  - ⚠️ 改 `i18n.js`/`sw.js` 後在 preview 驗證會被 **PWA Service Worker + HTTP 快取餵舊檔** → 需先清 SW/caches 或用 cache-buster 重載。
- **公版返回鈕**：shell 層 `mountView` 統一注入（`GAME_BACK`）；遊戲走 `view:"game"` 自動繼承，**勿在各遊戲各自刻**。
- **真/假站軸 `HL.site`（core/site-mode.js）＝與休閒/真金(HL.money)、後端(config)正交的第三軸**。`demo`（假站，預設）＝現況一堆假玩家/假流水/假JP/假報獎；`live`（真站）＝關掉所有假活動、乾淨起帳、每筆金流記進帳本做營運健檢。旗標存 `HL_SITE_MODE`（**原生 localStorage、不加前綴**），boot 早期經 `HL.dom.lsGet` 讀、載入序在 app-state/money/config 前；**切站＝`location.reload()`**。`HL.site.ns()` 回 `""`/`"r:"`，被 `HL.dom.lsGet/lsSet` 當命名空間前綴 → 真站與假站的經濟/留存/JP/notify/fair/ledger 資料**平行宇宙隔離**（UI 偏好如語言/側欄/收藏/最近遊玩不走此出口＝兩站共用；Supabase `sb-*` 不受影響）。**新增任何「假玩家/假流水/假活動」產生器，記得加 `if (HL.site && HL.site.isLive()) return;` 閘**（已閘：boot 種子/ambientFeed/heat/rain/chat/arena sim/JP 自漲+種子/raffle+tournament bots/大獎牆假生成+`fetchReal`/虛擬主播/全球獎 hero+榜/**lobby 世界活動 hero(worldEvent 歸零)**）。**會員(後端)模式的伺服器資料改由 phase7 真分離**（`docs/supabase-phase7.sql`）：新增 `member_econ (uid,mode)` 每站別經濟列（balance/wagered/arena_stats），事件表 `big_wins/wallet_txns/battle_history/ops_events/chicken_rounds` 加 `mode` 欄；所有結算 RPC 加 **`p_site`**（前端 `api.js` `rpc()` 自動注入 `HL.site.mode()`；舊客端不帶→'demo' 相容），改讀寫 member_econ、事件標 mode；`load_econ(p_site)` 供 hydrate 讀當前站別經濟；feeds 依站別過濾、`ops_summary` 只算 `mode='live'`。⇒ 真站讀 server 的 **live 乾淨列**（餘額從 0 起＝要玩先儲值、戰績/全球獎進度/大獎牆真分離），**不再靠客端遮罩**（已撤 hydrate/`fetchReal` 的 live-skip；`main.js` hydrate 直接採 `load_econ` 回值）。啟用：部署 phase7 SQL（含既有 demo 一次性遷移）。註：`profiles` 只留身份(display_name/avatar/currency/wallet)；lobby 世界活動 hero 仍是純 mock 歸零(無 server)。

- **對戰語意的兩個單一真相（2026-08-21 競技場輪新增，動競技場前必讀）**：
  - `HL.battleMode`（core/battle-mode.js）＝**排名用哪個量、方向、給玩家看的勝負條件**。Slots Battle 三模式的判準不同（normal 最高總分／crazy **最低**總分／terminal **最後一輪增量**），而「畫面顯示的量」曾被**四個表面各自硬寫**成「總分越高越好」⇒ 回放把輸家標成領先、對戰中十輪裡九輪的數字與勝負無關。任何表面要回答「誰領先／這數字越大越好嗎／勝負條件是什麼／名次怎麼排」，一律呼叫它（`metricOf/leaderIndex/rankBy/barFrac/gapTo/displayMetricLabel/winCondOf/tieAtTop`），**禁止自寫字串或比較子**。
  - `HL.battleTempo`（core/battle-tempo.js）＝**所有節拍**（承諾倒數/轉輪/命中停留/逐輪結果/揭曉錯開/懸念/高潮…）。演出拍隨速度線性縮放、**結構拍有 ×0.7 下限**（承諾/懸念/高潮不是等待，縮太短就沒有張力）、彈分壽命刻意不縮放且命中停留恆 ≥ 它、真站夾每輪 ≥2500ms 且不提供 ultra。**view 內禁止再寫裸毫秒。**
  - ⚠️ **這兩個檔為什麼在 core 而不是在對戰本體**：`views/vsslot.js` 是 #110 **延遲載入**的，而大廳/戰績/回放（`views/arena.js`）是**開站即載**。規則放在對戰本體 ⇒ 玩家一進站直接開「戰績與回放」時取不到，會**靜默退回錯的行為而畫面看起來完全正常**（實測踩過）。
- **離場鉤 `HL.shell.onExit(fn)`（2026-08-21）**：view 被換掉時要「結束自己」的帳。`HL.instant.stopAll()` 解的是計時器，這個解的是**錢**——對戰的 escrow 曾因「用底部導覽換頁」而被靜默沒收（不記敗局、無提示）。mountView 在清 DOM **之前**跑、renderApp 也跑、**一次性**（跑完清空清單）。需要據實了結的 view 自己註冊。
- ⭐ **一條反覆出現的缺陷型態：「修一半而看不出來」**（2026-08-20/21 共踩四次，立鎖時務必自問）：① 活面板登記簿在註冊時順手 purge 把自己刪掉（層① 死了但層② 會補上，畫面全對）② 參數化 RTP 的不變量只擋一個方向（反向呼叫就能造出第二份真相）③ 排名規則放在延遲載入的模組（取不到就靜默退回舊行為）④ 彈分壽命 JS 與 CSS 各寫一套（只有在特定速度下才露出）。**共同點：功能看起來正常，只有寫測項去打自己才會發現。⇒ 立鎖時一併問「這條不變量有沒有反向？有沒有第二個消費者？」**
- **`HL.ledger`（core/ledger.js）＝全站「莊家視角」營運帳本**（原本只有玩家自身盈虧、無莊家帳）。`record(type,amount,meta)` 記 deposit/withdraw/bet/win/bonus(帶 source)/faucet/jp_seed/jp_hit；彙總 `derived()` 出 GGR/NGR/RTP/淨現金流/流通幣。**插樁點**：`liveStats.record`(bet/win 中央點)、`HL.bonus.add`(所有紅利，帶 `{source}`)、faucet/簽到/rakeback claim/JP 直入餘額點、`pushDemoTxn`(儲值/提款)、jackpot onBet。**任何新送幣/新金流務必在授予當下 `HL.ledger.record(...)`**（別在領取端記＝重複計）。儀表板 `HL.opsBoard.open()`（views/ops-dashboard.js）從 ⚙ DEMO 面板開，含規則健檢警示（NGR<0、RTP>100%、slot 無 RTP 模型、faucet 無上限、bounty_mine client-trust…）。**多人真站雲端彙總（phase6）**：`docs/supabase-phase6.sql` 建 `ops_events`(definer-only)＋8 個結算 RPC 插樁權威記 bet/win＋wallet 觸發器記儲值/提款＋`ops_log`(收客端送幣 bonus/faucet)＋`ops_summary`(admin 閘、全站聚合、回傳同 `HL.ledger.derived()` 形狀)；前端 `HL.api.opsSummary/opsLog`、`HL.ledger` 送幣鏡射、儀表板「本機／全站(雲端)」切換。**啟用**：Supabase 部署 phase6 + 把自己 uid 加進 `ops_admins` + 開站不帶 `?demo=1` 登入 + 切真站。

---

## 5. 同仁自製遊戲放置區（目標 2，已落地方案 B）

- **路線**：B（現在）→ C（iframe 沙箱，對外/真金前）→ D（後端註冊 + 後台審核，最終）。
- **B（已落地）**：`prototype/games/registry.json` 列各遊戲入口；`prototype/src/data/games-loader.js` 開機讀清單注入各 `game.js`（內部 `HL.games.register` 自我上架，免改核心）。娛樂城有「🧪 同仁開發遊戲(放置區)」專區（`community:true`）。
- **Dev Kit（給同仁的獨立開發包）**：`prototype/games/dev-kit/`（index.html + hl-stub.js 模擬器 + game.js 範例 + 自包含 README）。同仁解壓→改 game.js→交回 `<編號>_<遊戲名>(<開發者>)` 資料夾。平台方丟進 `prototype/games/` + registry.json 加一行 + push。
- **⚠️ 改 dev-kit 任何東西後必做**：① bump `dev-kit/hl-stub.js` 的 `DEVKIT_VERSION`（小修 1.0.x / 加功能 1.x.0）② 重跑 `prototype/pack-devkit.ps1`（產出 `prototype/dist/…zip`，`dist/` 已 gitignore）③ 驗證載入無 console error ④ commit/push。長久說明寫進檔案，別只留對話。

---

## 6. 自我進化引擎（intel/ ＝專案的「自動長大」大腦）

一條 **市場調研 → 缺口分析 → 自動實作** 的無限循環，讓平台不必手動決定要做什麼。**完整說明見 `intel/README.md`。**

> 🔄 **2026-07-23 重構（重要）**：引擎從舊四軌（radar/investigate/evolve/consolidate + build/polish/mode 開關）改為 **三軌雙線**。舊的 `mode: build/polish/mixed` 已退場——成長不再被單一開關悶住。新增 `intel/db/` 知識資料庫（持續累積+驗證）+ 每軌「拒絕閒置逃生閥」。以下說明已更新為新架構；完整見 `intel/README.md`。

### 資料層 `intel/`（在 repo 根，不被 GitHub Pages 服務）
| 檔案 | 角色 | 誰維護 |
|---|---|---|
| `CONTROL.md` | **使用者唯一要碰的檔**：三軌開關 + 保真閘 + 逃生閥 + 船長指令 | 使用者手改 |
| `STATE.json` | 循環游標與計數（last_platform/games/maintain_run、counters、consecutive_idle_rounds）| 各軌 |
| `db/platforms.json` | web casino 觀察庫（前身 watchlist.json）+ 調研排程游標 | platform 軌 |
| `db/platform-modules.json` | 平台功能模組台帳（8 分類 × 現況 present/partial/weak/absent + 擴充性模式）| platform 軌 |
| `db/providers.json` | 博弈遊戲開發商庫 + 招牌機制 | games 軌 |
| `db/games-catalog.json` | 遊戲候選庫 + 評分 + 復刻狀態 + 保真分數 | games 軌 |
| `db/game-fidelity-spec.md` | 遊戲保真規格 + 13 項上線閘檢查清單（治劣質遊戲）| games 軌讀 |
| `db/sourcing-methods.md` | 兩軌每輪重新取材方法（不吃固定清單）| 兩軌 |
| `platforms/<slug>.md` | 每平台調研檔 | platform 軌 |
| `reports/<date>.md` | 市場報告（**已退役** 2026-07-23·僅 06-27~07-23 歷史；產出改散於 db/platforms.json + platforms/<slug>.md + loop-journal.md）| ~~platform 軌~~ |
| `DEBT.md` | 技術債/打磨佇列 | maintain 軌 |

### CONTROL.md 控制面板
- `loop_enabled`：總開關。`false` = 所有 Routine 一啟動就安靜退出。
- **三軌開關**：`platform_track_enabled` / `games_track_enabled` / `maintain_track_enabled` / `auto_implement`。
- `auto_implement:false` = 只蒐情報、開卡等你看，不動 code。
- `lead_track`：`platform`（現值，平台先）/ `games` / `balanced`——兩成長軌並開時的火力集中處。
- **遊戲保真閘**：`fidelity_gate` / `require_spec_before_code` / `fidelity_min_rtp_sims`（治「調查隨便→劣質遊戲」：規格先於程式、RTP 蒙地卡羅、13 項上線檢查）。
- **拒絕閒置**：`ban_busywork_heartbeat` / `idle_escalation` / `idle_backoff_rounds` / `stale_days`（無真工作時不空轉：重驗資料庫或回報退避，絕不發空心跳）。
- `build_lock`：單一寫入鎖，寫入型 routine 進場上 claim-token 鎖(p-/g-/m-)、收尾清 `false`，防並行寫壞 `prototype/`。**卡住時手動設回 `false` 解鎖**。
- **船長指令區（Captain's Orders）**：使用者寫意見/插隊優先項；每個 Routine 啟動先讀、優先服從，做完在「已回應」用 `↳(日期)` 回覆。

### 三個 Skill（`.claude/skills/`，可手動 `/呼叫`，每個第 0 步先讀 CONTROL 做閘門）
- `/apexwin-platform`（每日 08/14/20 時）**平台成長線**：每輪重新調研頂級 casino(流量/名氣多訊號、db/sourcing-methods) → 更新平台模組台帳 → 開卡 → 自動實作 1(擴充性優先:先做可收納/可擺放的容器再填功能)+push。吸收舊 radar+investigate+evolve 的平台部分。
- `/apexwin-games`（每日 10/16/22 時）**遊戲成長線**：每輪從遊戲媒體(BigWinBoard/SlotCatalog/Slotslaunch/供應商官頁)重新列新遊戲+評分 → 寫保真規格 → 復刻 → **過 db/game-fidelity-spec.md 保真閘(RTP 模擬+13 項)才上線**+push。質>量、規格先於程式、帶 FAIL 不上線。
- `/apexwin-maintain`（每日 00/12 時）**維護線**：打磨既有表面(UI/UX·自適應·模板化·a11y·i18n) + 引擎健檢 + **拒絕閒置逃生閥**(無真債時去重驗資料庫/補品質缺口/回報退避，絕不空心跳)。吸收舊 consolidate。
- 三軌都遵守 `build_lock`（claim-token 再讀確認防 TOCTOU），時段錯開避免並行寫入。
- （舊四軌 skill radar/investigate/evolve/consolidate 已移除，角色由本三軌取代；舊 daily-next-step 早已停用。）

### ⚠️ 引擎已知踩雷
1. **本機排程只在 Claude Code App 開著時觸發**；關機/關 App 期間順延。要 24/7 需改雲端 routine。
2. **權限**：桌面排程任務讀的是**使用者層 `~/.claude/settings.json`**（非專案 `.claude/settings.local.json`）。引擎能自動 commit/push 是因為那裡有 allowlist（見 §8 交接）。
3. **`lastRunAt` ≠ 真的完成**：排程常「觸發卻未收尾」，留下未 commit 半成品。判斷引擎是否在跑要交叉比對 `STATE.json`（尤其 `last_*_run_at` ISO 時戳）/ `intel/loop-journal.md` 當日條目 / `git log` / **`git status` 有無孤兒產出**，別只看時間戳。（2026-08-01 M5：原列的「`reports/` 當日檔」訊號已移除——reports/ 於 07-23 退役、不再產新檔，該訊號永不觸發＝誤導。）
5. **🚨 stdin heredoc ＝ 排程殺手（2026-08-03 事故根因，最嚴重的一種停擺）**：`node - <<'EOF' … EOF` 這類「從 stdin 讀取」的指令，只要 heredoc 結束標記沒完整送達，`node -` 就會**永遠阻塞等 stdin** → Bash 工具無限等待 → **整個 session 掛死**。致命的是：**排程器會認定該 task「仍在執行」而拒絕啟動後續任何 firing**。平台軌 2026-07-31 20:08 那輪即因此掛死 **73 小時**，吞掉 08-01/08-02 共 6 個到期窗，`lastRunAt` 凍在 07-31 不動；維護軌 M7 連 5 次坐實「platform dark」卻查不出原因——**因為它查不到排程器內部狀態，只有使用者/前景能查 `list_scheduled_tasks`**。
   - **辨識法**：`lastRunAt` 長期不動 + 該軌 journal 無讓路留痕 + transcript 有「懸空 tool_use（有呼叫無結果）」。
   - **修法**：`disable→enable` **無效**（實測 lastRunAt 不會清），必須 **delete + create 重建該排程任務**。
   - **預防**：三軌 wrapper 已加最高優先規則禁用 stdin heredoc；改用 `node -e "…"`（短）或 Write 暫存 `.js` 再 `node 檔.js`（長），並加 `timeout`。
6. **多 routine 並行寫同一 repo** 是「觸發卻未收尾」的根因（彼此 `git add`/commit 交錯吃掉對方未提交的工作）→ 見 §7 鐵律。

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
1. **自我進化引擎的排程 Routine**（2026-07-23 重構後 3 個：platform / games / maintain）—— 排程註冊在本機，換帳號/換機可能要重建。用 `scheduled-tasks` MCP 重新建立，各自薄包裝：讀 `intel/CONTROL.md` → 總開關或該軌開關 false 就退出 → 否則 Read 並遵照對應 `.claude/skills/apexwin-<track>/SKILL.md`（尊重 build_lock、§7 逐檔 add）。頻率（時段錯開）：platform `0 8,14,20 * * *`、games `0 10,16,22 * * *`、maintain `0 0,12 * * *`。
2. **引擎的權限 allowlist（2026-07-29 大幅補齊·排程卡死的頭號原因）**：
   - **排程 Routine 讀的是使用者層 `~/.claude/settings.json`**——**不是**專案 `.claude/settings.local.json`，也**不受你在對話裡手動切的 Bypass 影響**（那只對當下 session 有效，排程每次觸發都是全新 session，必然回到預設）。這就是「每次手動改成 Bypass 但又變回來」的原因。
   - **2026-07-29 實測**：舊清單只有 9 條（`WebSearch/WebFetch/Read/Write/Edit/Glob/Grep/Bash(git *)/mcp__Claude_Preview__*`），但近 40 個 session 統計顯示三軌實際會用 `node`(154 次·保真閘 RTP 蒙地卡羅的命脈)、`echo`(154)、`grep`(104)、`sed`(45)、`date`(33)、`cat/ls/head/tail/awk/stat/wc/for/timeout`… **除了 git 幾乎全被擋**。
   - **另一個隱形殺手**：清單寫的是 `mcp__Claude_Preview__*`（舊名，僅 13 個 session 用過），但實際 preview 工具是 **`mcp__Claude_Browser__*`（86 個 session 在用）**——名稱對不上 ⇒ 每輪的 preview 驗證（遊戲軌保真閘 + 維護軌回歸檢查的必經步驟）必被攔。
   - **現況**：使用者層已擴到 **50 條 allow + 4 條 deny 護欄**（擋 `rm -rf /`、`git push --force`、`git reset --hard`）。同一份清單也寫進**專案層 `.claude/settings.json`（已進 git）**，換機器時至少專案脈絡會跟著走；但**使用者層仍須手動重建一次**（複製該檔即可）。
   - **2026-08-04 升級為 `defaultMode: "bypassPermissions"`（使用者明確要求兩次後執行）**：allowlist 補到 50 條後**仍每天中斷數十次**。以 1494 條排程實際跑過的 Bash 指令做**引號感知**比對，證實仍有 **155 條(10%)不匹配**，且原因是**結構性、非漏列**：① `for/while` 迴圈體被解析成指令頭 `do`（74 次·最大宗）② 多行 `node -e` 每行被當獨立指令（`const`/`var`/`function`/`//`）③ `head`/`cat` 等已允許指令出現在**續行位置** ④ 裸變數賦值 `SC="…"`。**只要引擎還會寫迴圈與多行腳本，白名單就永遠補不完** → 唯一能保證零詢問的是 `defaultMode`。
   - **必要配套 `skipDangerousModePermissionPrompt: true`**：否則開 bypass 後首次執行會跳「確認使用 bypass 模式」對話框，無人值守排程會卡死在那裡（反而更糟）。
   - ⚠️ **範圍與取捨**：bypass 作用於**這台機器所有 session**（含互動對話與其他專案），且 `deny` 清單在此模式下未必被強制執行（allow/deny 保留作降級 fallback）。**刻意不寫進專案 `.claude/settings.json`**——該檔會進 git 且 repo 公開，否則任何人 clone 就靜默取得無提示模式。**代價：換機器時使用者層必須手動重建一次**（複製 `~/.claude/settings.json` 即可）。
   - 環境前提已查證：無企業 managed-settings、無 HKLM/HKCU 政策、專案層無 `defaultMode` 覆蓋、無 `ask` 清單 → 使用者層設定會完整生效。
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
- **⚠️ 遊戲 view 的 headless 驗證配方（2026-08-20 前景實測·更正一個長期誤解）**：三軌長期認為「headless 完全驗不了 UI，所以保真閘第 10/11 項只能自我宣稱」——**只有一半成立**。
  - **繞過登入 gate**：不要走 `HL.router.goGame()`（會被導去登入頁）。改為 **直接把遊戲 view 掛進 DOM**：`var g = HL.games.all().filter(x=>x.id==="plinko")[0]; var h=document.createElement("div"); document.body.appendChild(h); h.appendChild(g.render());`（遊戲檔是 #80 延遲載入 → 先 `await HL.lazyGames.load("<id>")`）。這樣拿得到真實元件、真實引擎、真實金流。
  - **驗得到**：DOM 結構/class、按鈕 disabled 狀態、inline style 序列、元素數量（如「同時幾顆球在空中」）、`HL.state` 餘額逐筆帳目、計時器行為、console/network。本專案大多數「結構性手感缺陷」（未提交的動畫起點、未取消的計時器、共用單例 DOM、說謊的控件狀態、計分板殘留）**都能在 headless 輪抓到並修掉**。
  - **驗不到（保真閘 10/11 的 UNVERIFIED 紀律因此仍然正確）**：preview 面板隱藏時瀏覽器**不合成影格** ⇒ `requestAnimationFrame` 不觸發、CSS transition 不推進（元素停在最後一次 commit 的值）、`computer{action:"screenshot"}` 逾時。**還有一個會誤導量測的陷阱**：分頁在背景時 `setTimeout` 被夾到 **≥1s**，所以「連點看併發」要用**同步連點**（不 await）才量得準。
  - 副作用提醒：`g.render()` 掛出來的 view 不會被 `mountView` 清掉 → 測完自己 `h.remove()`，否則殘留面板會干擾下一次量測（換頁的 autobet 已由 `HL.instant.stopAll()` 停掉）。

---

## 10. 現況快照（2026-08-21 競技場輪後更新）

- **BACKLOG**：編號卡到 **#112**。待做（已批准）：#87 獎勵逐片到期、#88 簽到酬賞負載軸、#93 導覽入口註冊表 `HL.nav`、#103 已結案、#107 促銷受眾述詞、#110 已完成。**待你批准**：#104 限量挑戰伺服器名額仲裁、#105 推薦歸因見證者（含後端 SQL，2026-08-19 裁決**暫緩**）。
- **引擎狀態**：三軌雙線、`loop_enabled: true`、`lead_track: games`。排程 platform 08/14/20、games 10/16/22、maintain 00/12。⚠️ 前景 claim `build_lock` **必須當下就 commit**——2026-08-20 有一次前景 claim 只存在工作區就閃退，等於沒 claim（三軌照常工作，行為正確）；閃退無法留痕，靠 `lock_heartbeat_stale_min` 的 stale-heal 兜底。
- **規模**：`prototype/src/core/` 67 檔、`prototype/src/views/` 34 個 view 檔；自我檢測 **225 項**（`node prototype/tests/run.js`）。
- **RTP 登記**：單值 18 款 + **參數化 1 款**（plinko，9 種 rows×risk；#103 裁決 (c)＝正式承認參數化、逐設定揭露，**不得混進單值 API**）。
- **遊戲**：25 款登錄可玩（最新：Moles 打地鼠，2026-08-21 遊戲軌）。品類齊備：SLOT／TABLE 6 款／CRASH-INSTANT 12 款／GAME-SHOW／特殊。
- **2026-08-20 遊戲手感巡檢**（78 條存活/69 CONFIRMED）→ [intel/game-feel-audit-2026-08-20.md](intel/game-feel-audit-2026-08-20.md)，已修 22 條（家族 A 回合鎖／B 換頁不停 autobet／C 極速模式承諾未實現／D+E 桌遊分階段結算一處通吃 6 款）、⬜ 53 條待做。
- **2026-08-21 競技場輪**（32 條存活/29 CONFIRMED + 5 份外部研究）→ [intel/arena-battle-spec-2026-08-21.md](intel/arena-battle-spec-2026-08-21.md)。已修：顯示 BUG 根因（排名規則四處硬寫）、自建房雙扣（贏一場實際淨 0 卻寫 +1,000）、關 PiP 後孤兒對戰、換頁沒收賭注、對手開打前被換掉、平手一律判你贏、對戰沒有公平入口、對戰中資訊顯示（名次/差距/本輪增量/常駐勝負條件）、節奏五拍、彈分被硬切。**仍待做見該檔頭部清單**（會員模式 F5 後戰績 NaN、賞金池原地更新、滿房仍寫「加入」、大廳熱門擂台是凍結快照、房卡無回合進度、四個缺的狀態…）。
- **已完成大塊**：25 款遊戲 + 留存三件套（VIP/任務/獎金錢包）+ 簽到/收藏/返水/累積彩金/錦標賽/可驗證公平/PWA、虛擬主播跟注、同仁遊戲放置區 + Dev Kit、i18n 引擎（按語言拆檔 #100）、紅利/流水引擎、營運帳本+儀表板、真/假站軸、`HL.dock` 佈局底座、成就徽章牆、季票、公會 meta、損失保險、促銷排程、報表註冊表 #109、首屏延遲載入 #110/#111。

### 10.1 驗證紀律（每次改完照做）

1. `node prototype/tests/run.js` 必須全綠（現 225 項）。**改動讓既有鎖變紅時，改成「守新形狀下的同一組不變量」，不要放寬。**
2. 修完一條缺陷就**立一條常駐鎖**，並用**負向擾動**證明它真的會紅（把修好的性質逐一破壞、確認被**對應的那一條**抓到）。
3. 動 `prototype/` 就 bump `prototype/sw.js` 的 `CACHE` 版號（現 v199），否則 preview 會被 SW 餵舊檔。
4. preview 驗證配方見 §9（直接把 game view 掛進 DOM 繞過登入 gate；驗得到 DOM/狀態/序列/帳目，驗不到「畫面有沒有在動」）。
5. 節奏類改動：每一拍都寫進 `data-beat` ⇒ headless 也能驗出「拍的順序」與「餘額有沒有排在動畫之後」。

### 10.2 工具鏈坑（已踩過，別再踩）

- ~~**換行不統一**：`core/fair.js`、`tests/checks-games.js`（經 git checkout 後）是 **CRLF**，多數檔是 LF~~ 〔✅ **2026-09-04 平台軌·根治（#165）**：這不是那兩支檔的個案，而是**全 repo 通則**——git blob 一律 LF，但本機 `core.autocrlf=true` 且當時**沒有 `.gitattributes`** ⇒ 任何經 `git checkout` 還原的文字檔，工作區都會變 CRLF、每行 +1B。**危害不只是改檔腳本**：`platform/first-screen-budget` 量的是磁碟位元組 ⇒ 進場實測 8 支首屏檔正處於 CRLF、共 **+1,683B**，讀數 1,638,383（餘裕 17B）而**部署真值 1,636,700（餘裕 1,700B）**，而 #118／#155／#154①／#157／#158／#160 與遊戲軌 [G-FS] 全都拿那個假讀數當「headless 做不了」的事實前置。**修法已落地**：repo 根 `.gitattributes`（`* text=auto eol=lf`）把工作區換行釘成 LF，使**磁碟 = git = 部署**三者恆等；首屏鎖改量 LF 正規化位元組並加不變量「讀數與換行風格無關」。⇒ 現在不需要再為換行做任何偵測或補償；若哪天又看到 CRLF，代表 `.gitattributes` 被移除了。〕
- **bash heredoc 會吃掉正則的一層反斜線**（寫出 `/refreshStandings(/` 這種壞正則）⇒ 測項斷言優先用「字串包含」而非正則。
- **雙引號 bash 字串裡的 `!!` 會觸發 history expansion** ⇒ 改用 Write 工具寫腳本檔再 `node 檔.js`。
- **同一個坑的第二個入口（2026-09-05 平台軌 20:00 窗實踩）：雙引號 `node -e "…"` 裡的 markdown 反引號會被 bash 當 command substitution 執行掉。** 本專案的 intel 註記大量使用 `` `code` ``，而寫 STATE/CONTROL 註記時最自然的寫法就是 `node -e "…"` ⇒ 那一輪的 STATE 註記**首寫即被吃掉 10 段**（`` `/settings/preferences` ``、`` `HL.gset` ``…全部消失或變成「command not found」），而**指令回傳成功、JSON 合法、`git diff --stat` 讀數正常** ⇒ §4「修一半而看不出來」家族的工具鏈版本。**規則**：只要字串含反引號（幾乎所有中文技術註記都含），一律走 Write 暫存 `.js` 再 `node 檔.js`；`node -e` 只留給不含反引號的短算式。
- **巢狀回呼的字面順序 ≠ 執行順序**（外層 delay 寫在最後一行）⇒ 判「先後」要用各拍開頭的標記（如 `setBeat`），不要用延遲毫秒數的位置。
## 11. 真金上線前 checklist（現在別擋，牌照前才回頭做）

現階段刻意不以資安為優先（Demo、無真實金流）。但**真金模式啟用前**必須回頭處理：

- **`bounty_mine`信任 client 傳入的 `p_maxmult` 算派彩 = 可印錢漏洞**（伺服器端；儀表板已標示）。**phase6 已止血**：伺服器夾 `p_maxmult ≤ 100×`（`supabase-phase6.sql`）；完整權威修法（伺服器房間設定為權威）仍待。
- **經濟數值整體重調**：demo 回饋率刻意慷慨，實測刷流水 EV 為正 → 真金前重調所有回饋讓整體 RTP < 100%。**（部分完成）** 已把主要漏洞做成「站別感知」：真站(live) 已收斂 JP(改自籌 seed=0)、返水(0.1–0.3%)、返現(2–6%)、VIP 升級金(×0.4)、`WAGER_MULT`(8×)、faucet(300＋終身 5 次上限)、slot(客端贏分×0.90 近似上限)；假站(demo)一律維持原慷慨值。Monte-Carlo 實測真站穩態 NGR 轉正(約 +0.1~0.5% 流水)。**仍待**：slot 精準 RTP 伺服器數學模型、bounty_mine 伺服器修、reload/luckyspin/raffle/redeem/rain/meta/onboarding/shop 等長尾送幣的真站微調（目前仍用假站值，可續收斂）。
- 其餘 ⏸️DEFER 項（見 ROADMAP）：真金流串接、KYC、真人視訊、供應商聚合、第三方 RNG/RTP 認證、AML、提款審核佇列/對帳 ledger、完整 CRM。

---

## 12. 檔案地圖（快速索引）

| 路徑 | 是什麼 |
|---|---|
| `prototype/` | H5 前端本體（`index.html` + `src/`：core / views / data / styles）|
| `prototype/src/core/site-mode.js` | 真/假站軸 `HL.site`（見 §4；localStorage 命名空間前綴的來源）|
| `prototype/src/core/ledger.js` | 營運帳本 `HL.ledger`（見 §4；莊家視角記帳 → GGR/NGR/RTP）|
| `prototype/src/views/ops-dashboard.js` | 營運監控儀表板 `HL.opsBoard`（⚙ DEMO 開；收支/RTP/送幣成本/規則健檢）|
| `prototype/serve.ps1` | 本機測試伺服器（Ctrl+F5 重讀檔）|
| `prototype/games/` | 同仁遊戲放置區（registry.json + dev-kit + pack-devkit.ps1）|
| `intel/` | 自我進化引擎資料層（見 §6；`README.md` 有完整說明）|
| `intel/db/` | 知識資料庫（platforms/platform-modules/providers/games-catalog + game-fidelity-spec + sourcing-methods）|
| `.claude/skills/apexwin-{platform,games,maintain}` | 3 個引擎 Skill（劇本；2026-07-23 三軌重構）|
| `.claude/settings.local.json` | 專案權限 allowlist |
| `.claude/launch.json` | preview 設定（name `apex-win`）|
| `BACKLOG.md` / `ROADMAP.md` | 任務佇列＋日誌 / 策略路線圖 |
| `HANDOFF-KICKOFF.md` | 換帳號啟動包：貼給新帳號 Claude Code 的第一則訊息 + 換機器注意事項 |
| `docs/`、`House-Light_Local_Collaboration_Rules_*.md` | **舊治理文件（已不適用，僅存參考）** |
| `~/.claude/projects/D-------House-Light---/memory/` | 自動記憶（**不在 repo**，見 §8）|
