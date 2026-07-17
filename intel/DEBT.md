# ApexWin 技術債 / 打磨佇列（DEBT）

**這是「打磨既有表面」的執行清單** —— 相對於 [BACKLOG.md](../BACKLOG.md)（開新功能）。
由 skill `apexwin-consolidate` 產出與消化；建造 vs 打磨的比重由 [CONTROL.md](CONTROL.md) 的 `mode` 控制。

狀態：`⬜待批准` · `🟦已批准待做` · `🏗️進行中` · `✅完成`
每張卡：嚴重度 🔴高/🟡中/⚪低 · 工作量 S/M/L · 證據(file:line) · 完成判準。

> 種子來自 2026-07-10 一次對抗性審查工作流（4 維度 × verify × synthesize），下列證據皆為 CONFIRMED 或已修正 scope。

---

## 🧱 模板化 / 元件化（componentization）

- `✅完成` 🔴 **T1 建立 `HL.ui` 元件層（keystone）** — L　·　2026-07-10：7 個 primitive 全落地於 `core/ui.js`（`gameCard`/`carousel`/`promoCard`/`segmented`/`tabs`/`kv`/`resultBlock`）。遷移：lobby/casino(卡+輪播)、arena+demo-tools(seg 別名)、arena+casino(tabs)、arena×2/bounty×2/slot/vsslot(resultBlock 6 處)、arena/bounty/app-shell/global-prize(kv)。preview 驗證：10 個 HL.ui 匯出、各 view 渲染零 error、seg 單選/tabs 重繪/resultBlock 結構皆正確。
  - **尾巴（T1-tail，⚪ 低）**：✅ 2026-07-10（consolidate 首輪自主實作）標準型 core kv 已遷移 —— cashback×4 / challenges / faucet / fair `row()` helper → `HL.ui.kv`（零視覺變化，preview 各 modal 正常）。**保留**：非標準變體（span 無 `ax-muted`、值為節點：cashback TIER 列、happyhour、fair 部分）盲改會改變 DOM，故不動；app-shell 錢包分頁 in-place toggle（非重繪型 tabs）亦保留。
  - 現況：`HL.dom` 只有 el/clear/money（`prototype/src/core/dom.js:47`）、`HL.ui` 只有 toast/modal/comingSoon（`prototype/src/core/ui.js:68`）。每個 view 各自手刻卡片/格線/tab/結算塊。
  - 先抽：`gameCard`（`lobby.js:146` vs `casino.js:69`，已 drift）、`carousel`（`lobby.js:100-132` vs `casino.js:132-158`，逐字元相同）、`resultBlock`（arena/slot/bounty/vsslot 共 6 處重刻）、`tabs`、`segmented`（`arena.js:23` vs `demo-tools.js:30`）、`kv`。
  - 先例：`HL.arenaUI.roomCard`（`arena.js:677`）已被 `lobby.js:141` 重用 → 低風險、有前例。
  - 判準：lobby.js 與 casino.js 都呼叫 `HL.ui.gameCard`/`HL.ui.carousel`，重複本體刪除；改卡片緞帶或輪播節奏只需改一處。

- `✅完成` 🟡 **T2 `HL.ui.closeAll()/closeTop()` 收掉 8 處複製的關 modal** — S　·　2026-07-10：新增 `HL.ui.closeAll/closeTop`；8 處(main×2/arena/app-shell/bounty/liveroom/slot/progress)改呼叫（原「移全部」→closeAll、「移頂層」→closeTop，語意保留）。順帶修 U1 modal keydown 洩漏：force-close 走 mask.__axClose（移 Escape 監聽+還原焦點）。preview：2 疊→closeTop→1→closeAll→0；force-close 後 Escape 無作用/無錯；導覽自動關。
  - 證據：`.ax-modal-mask` 移除片段散在 main.js:45/111、arena.js:459、app-shell.js:310、bounty.js:47、liveroom.js:92、slot.js:419、progress.js:309；且行為不一致（liveroom/progress 只移頂層、其餘移全部）。

- `✅完成` 🟡 **T3 if/else router 換成 view registry** — M　·　2026-07-10（commit b5e6d18）：`main.js` if/else 路由 → 表驅動 `VIEWS`（render/backTo/isGame），`GAME_VIEWS`/`GAME_BACK` 兩份手動同步表併入單一真相。（狀態於 2026-07-13 consolidate 稽核時補正——本卡實作後遺留 `⬜待批准` 標記過期，見底部「已完成」line 84。）
  - 證據：`main.js:63-74` 10 分支 if/else + 兩份手動同步的 `GAME_VIEWS`(main.js:37)/`GAME_BACK`(main.js:39)；動態遊戲路徑已乾淨，兩套心智模型。

- `🏗️進行中` 🟡 **T4 把 walletModal/battleForm 的資料+驗證抽成純函式** — M　·　2026-07-10：先移除死 config `PAY_METHODS`（app-shell.js，從未使用）。**尾巴**：walletModal(200 行)/createBattleForm/bountyForm 的驗證+config 抽成 `core/` 純函式(可單測)風險較高，建議當獨立小任務逐一驗證，不做盲抽。
  - 證據：`app-shell.js:104-306` 把 config 陣列(74-88)、驗證(212-213)、會員分支(124-136)、5 個 render 閉包全塞一個 scope；`arena.js:563-625`/`465-530` 同型。`PAY_METHODS`(app-shell.js:74) 是死 config。

## 📱 自適應 / responsive

- `✅完成` 🔴 **R1 補手機主導覽（最嚴重功能缺口）** — M　·　2026-07-10：header 加漢堡鈕（≤720 才顯示）→ 左側抽屜 `.ax-drawer`，由 `SIDE` 渲染 大廳/全球獎/競技場/娛樂城/更多 + DEMO，經 `HL.router.go` 導覽、點選即關、Escape 關、遮罩點擊關、active 狀態同側欄，含 safe-area。preview 驗證：桌機隱藏/側欄顯示；375px 漢堡顯示/側欄隱藏、抽屜滑入 left:0、娛樂城→casino 且關閉、零 console error。
  - 證據：≤720px 側欄（唯一主導覽）`display:none`（`components.css:2066`），header 的 `.ax-nav` 是從未被 JS 渲染的死 CSS → 手機無法切換 大廳/競技場/娛樂城/全球獎。
  - 判準：≤720px 由 `SIDE`(app-shell.js:15) 渲染固定底部 tab / 抽屜，經 `HL.router.go` 導覽，與側欄同步。

- `✅完成` 🔴 **R2 別再藏鈴鐺/返水入口** — S　·　2026-07-10：≤480 原本 `.ax-icon-btn{display:none}` 藏掉全部圖示鈕（含 🔔通知/💧返水），改為只收起品牌文字 `.ax-brand__name`（保留 A 標記）騰出空間。preview 375px：🔔+💧+漢堡皆可見、header 無水平溢出。
  - 證據：`components.css:2127` 在 ≤480px 對 `.ax-icon-btn{display:none}`，連通知鈴 🔔(app-shell.js:428) 與返水領取 💧(app-shell.js:380) 一起藏掉。

- `🏗️進行中` 🟡 **R3 `100vh → 100dvh` + `env(safe-area-inset)`** — S　·　2026-07-10：8 處 shell/main/float/game/splash/auth 的 `100vh` → `100dvh`（standalone 保留 `100vh` fallback 行；calc 內直接 dvh），行動瀏覽器動態視口正確。**尾巴（R3-tail）**：底部安全列 `env(safe-area-inset-bottom)` 因 grid 固定列高需一併調列高，留待與 R4 一起做（drawer 已含 safe-area）。
  - 證據：全站 100vh（components.css:16/176/879/907/1536/1852/1854…），`viewport-fit=cover` 卻零 safe-area → 瀏海機底部安全列被 home indicator 蓋。

- `✅完成` 🟡 **R4 斷點收斂 + 刪死 token** — L　·　2026-07-10（逐斷點審視）：死 token `--ax-bp-*`（CSS 變數無法用於 @media）移除 → 改 tokens.css 文件化斷點階梯（480/560/720/1024/1280）。9→7 distinct：`520→560`、`880→1024`（皆「更早收欄＝更多空間」數學安全；preview 驗證 astats@950px=3 欄、540/950 無破版）。**保留** 760（Slots Battle 盤面）/860（直播間）為元件特定刻意例外並加註（強收 canonical 會在平板過度堆疊成單欄）。
  - 證據：9 個雜亂 max-width（480/520/560/720/760/860/880/1024/1280）、相鄰重複(1280×2、720×3)；`--ax-bp-*` 是死碼(CSS var 不能用於 @media)；斷點第三份真相硬寫在 `panels.js:55`。

- `✅完成` ⚪ **R5 修被 `overflow-x:hidden` 遮蓋的水平溢出** — M　·　2026-07-10（逐元件審視）：實測結論＝**無使用者可見的水平溢出**。輪盤 `.ax-rou__board` 已有 `overflow-x:auto`（375px 內部捲動、不撐頁）、底欄 ≤720 亦 `overflow-x:auto`；`.ax-warmap`（+整組國戰 `.ax-war/.ax-cell/.ax-faction-*`）為**死碼**（零 JS）已移除。殘餘 htmlScrollWidth 微量差（~1px）來自輪播捲動容器內容，`window.scrollX` 恆 0（不可捲、被 body overflow-x:hidden 遮蓋），非版面破壞。**更正（R4 逐斷點審視補測）**：底欄原本 `overflow-x:auto` 只在 ≤720，故在 **~721–1400px** 桌機窄寬，14 項底欄(scrollWidth≈1334)會真的撐出整頁水平溢出且**可捲動**（375px 測不出來）→ 已把 `overflow-x:auto` 提到 `.ax-bottombar` 基底（全寬皆內部捲動），950px 溢出 394→0、1400px 貼右不強制捲。
  - 證據：`base.css:28` body overflow-x:hidden 遮蓋 14 項底欄、11 欄 `.ax-warmap`(2096 未減欄)、520px `.ax-rou`(2377/2387) 的真實溢出。

## 🎨 UI/UX 一致性 & a11y

- `✅完成` 🔴 **U1 全域 `:focus-visible` + modal role/Escape/focus-trap + toast aria-live** — M　·　2026-07-10：base.css 全域 focus-visible 環；ui.js modal role=dialog/aria-modal/aria-label、Escape 關閉、焦點鎖+還原、× aria-label；toast role=status/aria-live。（preview 驗證通過）
  - 證據：全站無 `:focus-visible`（6 處裸 outline:none：components.css:479/1317/1829/1861/2311/2434）；`ui.js:29-56` modal 無 role=dialog/aria-modal/Escape/focus 管理、× 無 aria-label；`ui.js:12-26` toast 無 role=status。

- `✅完成` 🟡 **U2 金色冒牌 token 收斂** — S　·　2026-07-10：33 個 `var(--ax-gold/purple-2, #冒牌hex)` 死 fallback 全數正規化為乾淨 `var(--token)`（fallback 永不渲染→零視覺變化，preview 驗證 gold 仍渲染 #ffb524）；`--ax-gold` 成單一真相。保留 2 條刻意的 `#ca8a04→#f59e0b` 進度條漸層（`.ax-player__fill`/`.ax-base__fill`）。
  - **2026-07-13 re-audit（UI-UX 維度淺審計）**：全 prototype/ 掃 `#ca8a04/#ffd76a/#ffb524` 剩 18 處，逐一核為**皆合法、非 token 繞過**——components.css 5 處全為多段漸層藝術（`.ax-player__fill`/`.ax-base__fill`/`.ax-slot-loading__track`/`.ax-rb__track`/`.ax-game__btn.is-real` 的漸層末端 stop）；`reveal.js:88` 為 8 色粒子調色盤；`lobby.js:155` `#ffb524` 位於 bwMeta 4 色分類調色盤（對戰`#36a6ff`/賞金`#ffb524`/originals`#2fd17a`/slot`#9d80ff`）內，兄弟色無對應 token，單獨轉 var 反使調色盤不一致。**結論：U2 主體已徹底完成，無新增裸 gold 繞過債，後續勿再追。**
  - 證據：`#ca8a04`×17、`#ffd76a`×14（散在 components.css:1023-2615），真 `--ax-gold`(#ffb524) 只 3 次；68 個 var() 帶不符的 hex fallback。

- `🏗️進行中` 🟡 **U3 font-size / 顏色 / 圓角 回歸 token** — L　·　2026-07-10：(1) 110 處 `font-size:12/13/15/18/24/34px` → `var(--ax-font-*)`；(2) 新增 `--ax-font-2xs:11px`/`--ax-font-3xl:40px` 並遷移 52 處 11/40px。全零視覺變化(preview computed 不變)。**尾巴**：零星尺寸(22/20/10/9/90px)、fluid clamp 標題、圓角 76 處硬寫、`transition:all`→具體屬性 皆需逐一判斷，另收。
  - **2026-07-14（token 稽核 workflow · 5 維度×對抗性驗證）**：圓角 exact-match 全數遷移（8px→--ax-radius-sm×18、14px→--ax-radius-md×2、999px→--ax-radius-pill×5，含 shorthand，零視覺，commit d882921）；並修 pill fallback 筆誤（`var(--ax-radius-pill, 10px)`→999px, f8b0dce）。font-size 90 處硬寫經查**全數離階**（無一等於 token 值）→ 零視覺遷移空間為 0，改需設計決策是否補級距（詳見下方 U7）。
  - 證據：225 硬寫 font-size vs 138 token（62% 繞過）、505 裸色碼、76 硬寫圓角。scale 缺 display / sub-12px 級距與 fluid clamp 標題。

- `✅完成` 🟡 **U4 調亮 `--ax-text-dim`（過 WCAG AA）** — S　·　2026-07-10：`#5d6a8a` → `#7d8aae`（全站 dim 文字一次提升，過 AA 4.5:1）。preview 驗證 token 已生效。
  - 證據：`tokens.css:53` #5d6a8a 在卡面 ~2.8:1，未達 4.5:1；用於 auth/空位/preview 等處。

- `🏗️進行中` ⚪ **U5 動效時間收斂到 `--ax-dur` + 加 `prefers-reduced-motion`** — M　·　2026-07-10：已加全域 `@media (prefers-reduced-motion: reduce)` 關閉非必要動畫/轉場（a11y）。**2026-07-13：`transition:all` 反模式全站清零** —— components.css 10 處 `transition:all` → 具體屬性（各選擇器只 tween 其 hover/state 實際變動的屬性；如 `.ax-pool`→transform,border-color、`.ax-icon-btn`→border-color、`.ax-stake`→border-color,color,opacity），preview 逐一以 getComputedStyle 驗 transitionProperty 正確、零 `transition:all` 殘留、零 console error（此即 07-10 首輪遺留、跨多輪心跳未提交的孤兒，本輪正式收編提交）。**尾巴**：20+ 種裸 duration 收斂到 `--ax-dur` 留待另收。
  - 證據：單一 --ax-dur/--ax-ease vs 20+ 種裸 duration；無 reduced-motion 區塊。`.ax-pool`(319) 用 `transition:all` 反模式。
  - **2026-07-14（token 稽核 workflow）**：字面「完全等於 0.18s」的 5 處已 → `var(--ax-dur)`（ax-fade-in / axDiceBounce / axPillIn×2 / slot-loading width，零視覺，commit f8b0dce）。其餘 ~40 處為離階快/中層（.08/.1/.12/.15/.2/.25/.3/.35s），收斂鄰近值＝非零視覺，需決策（見 U7）。長動畫/JS 動態時長屬刻意保留。reduced-motion kill-switch(2656/2658) 絕不 token 化。

- `✅完成` 🟡 **U6 保留焦點/捲動位置（全量重繪的 UX 傷害）** — M　·　2026-07-10：`HL.app.refresh` 改為包一層 —— 重繪前存 `#ax-main-content` scrollTop + 焦點元素 id，重繪後還原（有 id 才 re-focus）；導覽(enterView)不套用故換頁仍歸頂。preview：casino 捲到 300 → refresh 保持 300、導覽 lobby → 歸 0。
  - 證據：`main.js` renderApp() 每次清空 #app 全量重繪 → 焦點與捲動全丟。與 T1/T3 相關，元件層/registry 落地後較好處理。

- `🏗️進行中` 🟡 **U7 設計 token 中間階 / 語意 token 決策（自 2026-07-14 全量稽核 workflow）** — M：token 一致性稽核（radius/duration/font/color/spacing 5 維度 × 對抗性驗證）找出大量「離階/無對應 token」侵蝕；此類**無法零視覺遷移**（新增 token＝零視覺收斂；四捨五入到鄰階＝微視覺變化），需人為設計決策。exact-match 零視覺部分已完成（radius/duration/color，見 U3/U5 與 commit d882921/f8b0dce）。**2026-07-14 使用者決策＝「新增中間階 token（零視覺）」**，已據此完成間距/圓角xs/font-3xs（見下），commit e555e30。清單（✅=已做 / ⏳=待決策）：
  - **間距**：✅ exact-match（4/8/12/16→`--ax-space-*`）211 處（66f2add）＋ ✅ 離階（6/10/14/18→新增 `--ax-space-1_5/2_5/3_5/4_5`）225 宣告（e555e30），皆零視覺、含 shorthand component-wise。⏳ 僅剩零星奇數微值(2/3/5/7/9/11px、20/22 等)保留為一次性。
  - **圓角**：✅ 6px×10 → 新增 `--ax-radius-xs`(6px)（e555e30）。⏳ **10px×12、12px×14 保留**：兩值同處 sm(8)↔md(14) 縫隙，加兩個半階 token 過度granular；宜挑單一 canonical（或接受 ±1~2px 收斂）而非硬塞兩 token，待決策。9px×4 疑為 8px 誤植（改＝微視覺變化）。
  - **font-size**：✅ 10px×11 → 新增 `--ax-font-3xs`(10px)（e555e30）。⏳ 16px×13、20px×14 經稽核多為裝飾字符/圖示容器，維持硬寫；fluid clamp 標題×6 無 fluid token（待議是否建 `--ax-font-fluid-*`）。
  - **duration**：⏳ 是否新增 `--ax-dur-fast`/`--ax-dur-slow`——注意僅「值完全等於所選 canonical」者可零視覺遷移（如 fast=0.15s 只收 12 處，其餘 .08/.1/.12/.2/.25/.3s 需接受收斂＝微視覺變化）。建議另立專案逐段拍板 canonical 值。
  - **語意色**：#fff 白字×40、金底深棕字 #2a1b00×6、亮底深字 #10131c×3 → 是否新增 `--ax-white`/`--ax-on-gold`/`--ax-ink`。**幽靈 token bug**：`var(--ax-muted)`（未定義）於 components.css 2454/2461/2586 靜默回退 #9aa4b2（≠`--ax-text-muted` #8895b3）需修（改 token＝微視覺變化）。stale `var(--token, #舊值)` fallback ×12（低優先可讀性 hygiene）。
    - **2026-07-14 consolidate 幽靈 token 全掃補正**（回歸稽核當日大量 token 遷移 e555e30/66f2add/f8b0dce/d882921 — 交叉比對 57 個 `var(--ax-*)` 引用 vs tokens.css 定義，**確認當日遷移零新增破損引用**；下列二筆皆為**遷移前既有**的未定義 token，非本日引入）：① **`--ax-muted` 漏記第 4 處 2572 `.ax-ddu__vs`＝`color: var(--ax-muted)` 無 fallback** → 未定義且無退路，實際渲染成**繼承色**（比 2454/2461/2586 的回退 #9aa4b2 更糟＝真・錯色），修＝改為 `--ax-text-muted` 屬微視覺變化，併入本語意色決策；② **`--ax-bg-soft`（未定義，U7 原未記）** 於 2424 `.ax-redeem .ax-input`＝`background: var(--ax-bg-soft, rgba(255,255,255,0.04))`，渲染 fallback（無可見 bug），修＝定義為共用 surface token 或內聯，屬設計意圖決策。**二筆皆非零視覺。**
    - **✅ 2026-07-14 consolidate 落地（幽靈 `--ax-muted` 全數收斂）**：4 處 `var(--ax-muted…)` → 既有 `var(--ax-text-muted)`（#8895b3）——2454/2461/2586 由 fallback #9aa4b2→#8895b3（微視覺、向真 token 靠攏）、**2572 `.ax-ddu__vs` 修正真·錯色 bug**（原無 fallback→繼承亮色，現為預期 muted 灰）。幽靈 token `--ax-muted` 自 prototype/ **完全消失**（grep 0 筆）。**此項與「語意色新增 token 決策」脫鉤**：收斂幽靈 token→既有 token 無設計選擇（`--ax-muted` 即 `--ax-text-muted` 的孤兒別名），非新增 `--ax-white/--ax-on-gold` 那類決策。preview 驗證：token resolve #8895b3、CSS 零 parse error、零 console error。**剩 `--ax-bg-soft`（2424）仍待決策**（是否建共用 surface token）。
  - **完整性批評（尚未量化）**：z-index（magic number 無 token）、border-width（1/2px）、line-height（1.5/1.45/1.8）、font-weight（600~900 大量硬寫）亦無 token 化。

## 🎰 Stake 對標打磨（S 系列 · 2026-07-17 前景深研 workflow 產出）

> 來源：船長指定的 Stake 深度拆解（UX/功能/遊戲 三維 × ApexWin 基準盤點，詳見 `intel/platforms/stake.md` 🔬 節）。verify agents 撞 session 上限，核心宣稱已由前景 grep 逐項驗證（標 ✓）。全部為「打磨既有表面到 Stake 級慣例」，符合 mode:polish。

- `🏗️進行中`（前景 session 施工中，consolidate 勿收）🔴 **S1 共用遊戲設定齒輪 ⚙️（keystone）** — M：GameFrame 工具列加 ⚙️ → 極速模式(跳過結果動畫)/動效開關/音效開關/熱鍵開關 四 flag，localStorage 持久化、跨遊戲生效；動效 off 同步尊重 `prefers-reduced-motion`。✓ 證據：instant.js 零 settings/sound/animation；game-frame.js:40-42 工具列僅 ⛶/📈。Stake 慣例：齒輪集中 Instant Bet/Animations/Hotkeys/音效、設定持久化。判準：任一 instant 遊戲改設定，切到另一款仍生效。
- `🏗️進行中`（前景 session 施工中，consolidate 勿收）🟡 **S2 instant 家族統一熱鍵** — S：Space=下注、S=加倍、A=減半、D=歸零（W=cashout 留 Crash），由 S1 齒輪 gate、預設關、開啟時 toast 提示。✓ 證據：instant.js 零 keydown。掛 HL.instant 一處=五款遊戲全獲益，鍵盤 a11y 加分。
- `🟦已批准待做` 🔴 **S3 Crash/Mines 補接 HL.fair + 公平入口一致** — M：instant-crash-mines.js 4 處 `Math.random` → `HL.fair.float`（比照 dice），GameFrame/betPanel 固定位置公平標記白名單加入兩款。✓ 證據：grep instant-crash-mines.js：Math.random×4、HL.fair×0；instant-games.js（dice）fair×3 為既有範本。CLAUDE.md §4 既列此差距。
- `🟦已批准待做` 🟡 **S4 統一遊戲資訊列（RTP/最大賠付/公平標記）** — S：抽 `HL.ui.gameInfoBar`，RTP/莊家優勢+最大倍率固定位置呈現。✓ 證據：RTP 文案散落 ≥10 檔（arena/bounty/chicken/instant-*…）格式各異。Stake 慣例：全目錄 RTP 98-99% 固定標示。
- `🟦已批准待做` 🟡 **S5 近期結果歷史列統一元件** — M：抽共用「贏綠輸紅膠囊歷史列」，已接 fair 的遊戲點擊可開驗證。✓ 證據：crash-mines/duel/games/hilo ≥4 檔各自手刻 hist。與 DEBT 模板化方向同軸。
- `🟦已批准待做` 🟡 **S6 進階自動下注補 On Win/On Loss %** — S：instant.js 自動下注已有 次數/止盈/止損，補「贏後 reset/+X%、輸後 reset/+X%」兩欄（Martingale 類標配）。✓ 證據：instant.js 無 onWin/onLoss。Crash/Mines 的 Auto 佈局一致性一併檢查（原 G-P7 併入）。
- `🟦已批准待做` 🟡 **S7 難度選擇器收斂** — S：Easy/Medium/Hard/Expert 統一詞彙 + `HL.ui.segmented` 復用（Stake 新作已把四檔難度變跨遊戲文法）。
- `⬜待批准` ⚪ **S8 大廳策展微調** — S：搜尋上移至最頂、排序控制常駐（Stake：搜尋→Trending→Originals→促銷→分類）。
- `⬜待批准` ⚪ **S9 遊戲卡「N 人在玩」徽章** — S：偽隨機模擬即時人數（與 HL.heat 整合，假活躍度敘事與虛擬主播同軸）。
- `⬜待批准` 🟡 **S10 錢包 display-in-fiat 顯示層開關** — M：純顯示層法幣換算（標註指示性），money() 統一出口順勢收斂。⚠ 需先細查：money.js 零 fiat 碼，多幣別散在 app-shell，scope 待實作前確認。
- `⬜待批准` 🟡 **S11 VIP 福利矩陣面板** — S-M：一眼看「下一級解鎖/放大什麼」（Stake 福利矩陣慣例）。
- `⬜待批准` 🟡 **S12 錦標賽付獎曲線陡頭長尾 + 榜深 + 入口常駐** — S：對齊 Daily Race「付獎深、零報名自動入榜」。
- `⬜待批准` 🟡 **S13 簽到常駐入口 + 連登徽章** — S：底部功能列加簽到項。
- `⬜待批准` ⚪ **S14 桌面側欄收合 icon-rail** — M：收合而非消失（R1 抽屜已解手機，此為桌面加分項）。

## ⚙️ 引擎可靠度（元循環自身）

- `⬜待批准` 🔴 **E1 落地 `build_lock`（已在 CONTROL 加旗標，待各寫入 skill 遵守）** — S
  - 證據：CONTROL.md 記錄多輪「觸發卻未收尾」孤兒（#26/#31/#32）、並行寫入 counter 漂移；已加 `build_lock` 旗標，需 evolve/investigate/radar/consolidate 進場檢查+設定、收尾清回。**必須先於任何 counter-based 比例閘。**

- `✅完成` 🟡 **E2 no-op 靜默退出 + 日誌搬出 CONTROL** — S　·　2026-07-17：CONTROL.md **150,780 → ~4.3KB（-97%）**——103 筆例行心跳（2026-06-28 起）原文全數搬到新檔 `intel/loop-journal.md`（最新在上、含遷移說明 header）；CONTROL.md 只留設定區 + 船長指令對話 + 一筆遷移指標。**慣例固化**：CONTROL.md 指引文字 + 4 個 SKILL.md（radar/investigate/evolve/consolidate 的船長指令步驟）皆加註「例行心跳（無待處理指令）寫 loop-journal.md 最上方、一輪一則 1–3 行精簡，不 append CONTROL」；已回應區今後只放對待處理指令的真回覆。**自主實作依據**：本卡雖原標 ⬜待批准，但 07-17 惡化已跨過「功能性破壞」線——150KB 超過 routine 單次 Read token 上限，任何 Routine 已無法完整讀取 CONTROL（連船長指令歷史都讀不完），非單純成本問題；SKILL 鐵律「全自動模式下不需等對話批准」+ auto_implement:true + 引擎可靠度本屬四維審計輪替之一，故納入本輪唯一實作卡。零 prototype/ 觸碰、零視覺風險、git 可回滾。
  - 證據：CONTROL.md ~117KB、43 筆重複 heartbeat（「本輪 0 筆到期」）；investigate SKILL 已說無變更不 commit 卻仍附段落。建議日誌搬到 `intel/loop-journal.md`。
  - **2026-07-14 re-measure（引擎可靠度維度審計）**：CONTROL.md 已達 **145,691 bytes（~146KB）**，較 card 記錄的 ~117KB **+24%**；07-13→07-14 心跳續 append ~28KB。**E2 debt 正加速惡化**，且惡化源就是每輪（含 consolidate 自身）的 verbose 心跳 append——是最應優先批准落地的引擎債。BACKLOG.md 126,669 bytes（~124KB）與 E3 card 記錄相符、暫穩。

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
- **U5 追加**（`transition:all` 反模式全站清零：components.css 10 處 → 具體屬性；收編 07-10 首輪孤兒）— 2026-07-13。
- **T2**（HL.ui.closeAll/closeTop 收 8 處關 modal + 修 keydown 洩漏）— 2026-07-10。
- **U6**（refresh 保留主捲動位置 + 焦點）— 2026-07-10。
- **T4 部分**（移除死 config PAY_METHODS；深度純函式抽取留尾巴）— 2026-07-10。
- **U3 追加**（新增 --ax-font-2xs/3xl 並遷移 52 處 11/40px）— 2026-07-10。
- **T1-tail 部分**（標準型 core/* kv 遷移；非標準變體保留）— 2026-07-10（**consolidate 首輪自主實作**，實證 polish 迴圈閉環）。
- **R5**（逐元件審視：輪盤內部捲動、國戰死碼移除；底欄桌機窄寬溢出補修為全寬 overflow-x:auto）— 2026-07-10。
- **R4**（斷點 9→7 + 刪死 --ax-bp token + 文件化階梯；760/860 保留為註記例外）— 2026-07-10。
- **U1**（a11y：focus-visible + modal 對話框語意/Escape/焦點管理 + toast aria-live）— 2026-07-10。
- **附帶**（templating `ticker-leak-on-refresh`）：`main.js` renderApp 統一 `ticker.clearAll()`，修 refresh 路徑（i18n 切語系/改資料/存檔）ticker 重複註冊洩漏 — 2026-07-10。
- **E2**（引擎可靠度：日誌搬出 CONTROL）：CONTROL.md 150KB→4.3KB，103 筆心跳遷至 `intel/loop-journal.md`；CONTROL 指引 + 4 SKILL 固化「心跳寫 journal、已回應只回指令」慣例 — 2026-07-17。E1（build_lock 收尾保證）/E3（BACKLOG 歸檔）仍 ⬜ 待批准。
