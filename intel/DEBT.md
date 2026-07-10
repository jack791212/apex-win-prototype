# ApexWin 技術債 / 打磨佇列（DEBT）

**這是「打磨既有表面」的執行清單** —— 相對於 [BACKLOG.md](../BACKLOG.md)（開新功能）。
由 skill `apexwin-consolidate` 產出與消化；建造 vs 打磨的比重由 [CONTROL.md](CONTROL.md) 的 `mode` 控制。

狀態：`⬜待批准` · `🟦已批准待做` · `🏗️進行中` · `✅完成`
每張卡：嚴重度 🔴高/🟡中/⚪低 · 工作量 S/M/L · 證據(file:line) · 完成判準。

> 種子來自 2026-07-10 一次對抗性審查工作流（4 維度 × verify × synthesize），下列證據皆為 CONFIRMED 或已修正 scope。

---

## 🧱 模板化 / 元件化（componentization）

- `✅完成` 🔴 **T1 建立 `HL.ui` 元件層（keystone）** — L　·　2026-07-10：7 個 primitive 全落地於 `core/ui.js`（`gameCard`/`carousel`/`promoCard`/`segmented`/`tabs`/`kv`/`resultBlock`）。遷移：lobby/casino(卡+輪播)、arena+demo-tools(seg 別名)、arena+casino(tabs)、arena×2/bounty×2/slot/vsslot(resultBlock 6 處)、arena/bounty/app-shell/global-prize(kv)。preview 驗證：10 個 HL.ui 匯出、各 view 渲染零 error、seg 單選/tabs 重繪/resultBlock 結構皆正確。
  - **尾巴（T1-tail，⚪ 低）**：core/* 特徵模組（cashback/challenges/faucet/happyhour/fair）仍各有 kv 變體（含 node 值/著色/額外 class），app-shell 錢包分頁為 in-place toggle（非重繪型 tabs），皆待漸進收斂，不阻斷。
  - 現況：`HL.dom` 只有 el/clear/money（`prototype/src/core/dom.js:47`）、`HL.ui` 只有 toast/modal/comingSoon（`prototype/src/core/ui.js:68`）。每個 view 各自手刻卡片/格線/tab/結算塊。
  - 先抽：`gameCard`（`lobby.js:146` vs `casino.js:69`，已 drift）、`carousel`（`lobby.js:100-132` vs `casino.js:132-158`，逐字元相同）、`resultBlock`（arena/slot/bounty/vsslot 共 6 處重刻）、`tabs`、`segmented`（`arena.js:23` vs `demo-tools.js:30`）、`kv`。
  - 先例：`HL.arenaUI.roomCard`（`arena.js:677`）已被 `lobby.js:141` 重用 → 低風險、有前例。
  - 判準：lobby.js 與 casino.js 都呼叫 `HL.ui.gameCard`/`HL.ui.carousel`，重複本體刪除；改卡片緞帶或輪播節奏只需改一處。

- `⬜待批准` 🟡 **T2 `HL.ui.closeAll()/closeTop()` 收掉 8 處複製的關 modal** — S
  - 證據：`.ax-modal-mask` 移除片段散在 main.js:45/111、arena.js:459、app-shell.js:310、bounty.js:47、liveroom.js:92、slot.js:419、progress.js:309；且行為不一致（liveroom/progress 只移頂層、其餘移全部）。

- `⬜待批准` 🟡 **T3 if/else router 換成 view registry** — M
  - 證據：`main.js:63-74` 10 分支 if/else + 兩份手動同步的 `GAME_VIEWS`(main.js:37)/`GAME_BACK`(main.js:39)；動態遊戲路徑已乾淨，兩套心智模型。

- `⬜待批准` 🟡 **T4 把 walletModal/battleForm 的資料+驗證抽成純函式** — M
  - 證據：`app-shell.js:104-306` 把 config 陣列(74-88)、驗證(212-213)、會員分支(124-136)、5 個 render 閉包全塞一個 scope；`arena.js:563-625`/`465-530` 同型。`PAY_METHODS`(app-shell.js:74) 是死 config。

## 📱 自適應 / responsive

- `✅完成` 🔴 **R1 補手機主導覽（最嚴重功能缺口）** — M　·　2026-07-10：header 加漢堡鈕（≤720 才顯示）→ 左側抽屜 `.ax-drawer`，由 `SIDE` 渲染 大廳/全球獎/競技場/娛樂城/更多 + DEMO，經 `HL.router.go` 導覽、點選即關、Escape 關、遮罩點擊關、active 狀態同側欄，含 safe-area。preview 驗證：桌機隱藏/側欄顯示；375px 漢堡顯示/側欄隱藏、抽屜滑入 left:0、娛樂城→casino 且關閉、零 console error。
  - 證據：≤720px 側欄（唯一主導覽）`display:none`（`components.css:2066`），header 的 `.ax-nav` 是從未被 JS 渲染的死 CSS → 手機無法切換 大廳/競技場/娛樂城/全球獎。
  - 判準：≤720px 由 `SIDE`(app-shell.js:15) 渲染固定底部 tab / 抽屜，經 `HL.router.go` 導覽，與側欄同步。

- `✅完成` 🔴 **R2 別再藏鈴鐺/返水入口** — S　·　2026-07-10：≤480 原本 `.ax-icon-btn{display:none}` 藏掉全部圖示鈕（含 🔔通知/💧返水），改為只收起品牌文字 `.ax-brand__name`（保留 A 標記）騰出空間。preview 375px：🔔+💧+漢堡皆可見、header 無水平溢出。
  - 證據：`components.css:2127` 在 ≤480px 對 `.ax-icon-btn{display:none}`，連通知鈴 🔔(app-shell.js:428) 與返水領取 💧(app-shell.js:380) 一起藏掉。

- `🏗️進行中` 🟡 **R3 `100vh → 100dvh` + `env(safe-area-inset)`** — S　·　2026-07-10：8 處 shell/main/float/game/splash/auth 的 `100vh` → `100dvh`（standalone 保留 `100vh` fallback 行；calc 內直接 dvh），行動瀏覽器動態視口正確。**尾巴（R3-tail）**：底部安全列 `env(safe-area-inset-bottom)` 因 grid 固定列高需一併調列高，留待與 R4 一起做（drawer 已含 safe-area）。
  - 證據：全站 100vh（components.css:16/176/879/907/1536/1852/1854…），`viewport-fit=cover` 卻零 safe-area → 瀏海機底部安全列被 home indicator 蓋。

- `⬜待批准` 🟡 **R4 斷點收斂 9→3~4 階 + 刪死 token** — L
  - 證據：9 個雜亂 max-width（480/520/560/720/760/860/880/1024/1280）、相鄰重複(1280×2、720×3)；`--ax-bp-*` 是死碼(CSS var 不能用於 @media)；斷點第三份真相硬寫在 `panels.js:55`。

- `⬜待批准` ⚪ **R5 修被 `overflow-x:hidden` 遮蓋的水平溢出** — M
  - 證據：`base.css:28` body overflow-x:hidden 遮蓋 14 項底欄、11 欄 `.ax-warmap`(2096 未減欄)、520px `.ax-rou`(2377/2387) 的真實溢出。

## 🎨 UI/UX 一致性 & a11y

- `✅完成` 🔴 **U1 全域 `:focus-visible` + modal role/Escape/focus-trap + toast aria-live** — M　·　2026-07-10：base.css 全域 focus-visible 環；ui.js modal role=dialog/aria-modal/aria-label、Escape 關閉、焦點鎖+還原、× aria-label；toast role=status/aria-live。（preview 驗證通過）
  - 證據：全站無 `:focus-visible`（6 處裸 outline:none：components.css:479/1317/1829/1861/2311/2434）；`ui.js:29-56` modal 無 role=dialog/aria-modal/Escape/focus 管理、× 無 aria-label；`ui.js:12-26` toast 無 role=status。

- `✅完成` 🟡 **U2 金色冒牌 token 收斂** — S　·　2026-07-10：33 個 `var(--ax-gold/purple-2, #冒牌hex)` 死 fallback 全數正規化為乾淨 `var(--token)`（fallback 永不渲染→零視覺變化，preview 驗證 gold 仍渲染 #ffb524）；`--ax-gold` 成單一真相。保留 2 條刻意的 `#ca8a04→#f59e0b` 進度條漸層（`.ax-player__fill`/`.ax-base__fill`）。
  - 證據：`#ca8a04`×17、`#ffd76a`×14（散在 components.css:1023-2615），真 `--ax-gold`(#ffb524) 只 3 次；68 個 var() 帶不符的 hex fallback。

- `🏗️進行中` 🟡 **U3 font-size / 顏色 / 圓角 回歸 token** — L　·　2026-07-10：110 處 bare `font-size:12/13/15/18/24/34px` 精確對應 → `var(--ax-font-*)`（同值、零視覺變化；preview 驗證 computed 不變）；token 使用 138→217。**尾巴**：非 token 尺寸(40/22/11/10/9px…)需先定 display/2xs 級距 + fluid clamp 標題；圓角 76 處另收。
  - 證據：225 硬寫 font-size vs 138 token（62% 繞過）、505 裸色碼、76 硬寫圓角。scale 缺 display / sub-12px 級距與 fluid clamp 標題。

- `✅完成` 🟡 **U4 調亮 `--ax-text-dim`（過 WCAG AA）** — S　·　2026-07-10：`#5d6a8a` → `#7d8aae`（全站 dim 文字一次提升，過 AA 4.5:1）。preview 驗證 token 已生效。
  - 證據：`tokens.css:53` #5d6a8a 在卡面 ~2.8:1，未達 4.5:1；用於 auth/空位/preview 等處。

- `🏗️進行中` ⚪ **U5 動效時間收斂到 `--ax-dur` + 加 `prefers-reduced-motion`** — M　·　2026-07-10：已加全域 `@media (prefers-reduced-motion: reduce)` 關閉非必要動畫/轉場（a11y）。**尾巴**：20+ 種裸 duration 收斂到 `--ax-dur`、`.ax-pool` 的 `transition:all` 改具體屬性，留待另收。
  - 證據：單一 --ax-dur/--ax-ease vs 20+ 種裸 duration；無 reduced-motion 區塊。`.ax-pool`(319) 用 `transition:all` 反模式。

- `⬜待批准` 🟡 **U6 保留焦點/捲動位置（全量重繪的 UX 傷害）** — M
  - 證據：`main.js` renderApp() 每次清空 #app 全量重繪 → 焦點與捲動全丟。與 T1/T3 相關，元件層/registry 落地後較好處理。

## ⚙️ 引擎可靠度（元循環自身）

- `⬜待批准` 🔴 **E1 落地 `build_lock`（已在 CONTROL 加旗標，待各寫入 skill 遵守）** — S
  - 證據：CONTROL.md 記錄多輪「觸發卻未收尾」孤兒（#26/#31/#32）、並行寫入 counter 漂移；已加 `build_lock` 旗標，需 evolve/investigate/radar/consolidate 進場檢查+設定、收尾清回。**必須先於任何 counter-based 比例閘。**

- `⬜待批准` 🟡 **E2 no-op 靜默退出 + 日誌搬出 CONTROL** — S
  - 證據：CONTROL.md ~117KB、43 筆重複 heartbeat（「本輪 0 筆到期」）；investigate SKILL 已說無變更不 commit 卻仍附段落。建議日誌搬到 `intel/loop-journal.md`。

- `⬜待批准` ⚪ **E3 BACKLOG 完成卡歸檔** — S
  - 證據：BACKLOG.md ~126KB 從不修剪；evolve 每 2h 須整檔 Read+去重，成本無上限成長。歸檔到 `BACKLOG-archive.md`、留精簡索引。

---

## ✅ 已完成
- **T1**（模板化 keystone）：`HL.ui` 元件層 7 primitive 全落地並遷移主要重複點（gameCard/carousel/promoCard/segmented/tabs/kv/resultBlock）— 2026-07-10。（尾巴 T1-tail 見上，低優先）
- **T3**（router registry）：`main.js` if/else 路由 → 表驅動 `VIEWS`（render/backTo/isGame）— 2026-07-10（commit b5e6d18）。
- **U2**（金色/紫色 token fallback 正規化）— 2026-07-10。
- **U3 部分**（font-size 精確對應回歸 token，110 處，138→217 token 使用）— 2026-07-10。
- **R1**（手機主導覽）：header 漢堡 → 左側抽屜，≤720 補上 大廳/全球獎/競技場/娛樂城 導覽 — 2026-07-10。
- **R2**（≤480 保留 🔔/💧 圖示鈕，改收品牌文字）— 2026-07-10。
- **R3 部分**（8 處 100vh→100dvh；safe-area 底列留 R3-tail）— 2026-07-10。
- **U4**（--ax-text-dim 提亮過 WCAG AA）— 2026-07-10。
- **U5 部分**（加 prefers-reduced-motion；duration 收斂留尾巴）— 2026-07-10。
- **U1**（a11y：focus-visible + modal 對話框語意/Escape/焦點管理 + toast aria-live）— 2026-07-10。
- **附帶**（templating `ticker-leak-on-refresh`）：`main.js` renderApp 統一 `ticker.clearAll()`，修 refresh 路徑（i18n 切語系/改資料/存檔）ticker 重複註冊洩漏 — 2026-07-10。
