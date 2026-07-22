---
name: apexwin-ui-quality
description: ApexWin UI/UX 品質把關清單 — 建立任何新畫面/元件、或檢視既有介面時的強制檢查依據。涵蓋「間距與垂直節奏一致性、導覽/功能入口 IA 容量與分類、元件情境自適配（寬度/比例）、自適應 responsive、token 不繞道、a11y、i18n」七維，並內含三個真實反例（底部列 17 項擠壓、錦標賽橫幅零上間距、CTA `width:100%` 撐成長條）的根因與修法。手動呼叫或建 UI 前先讀。
---

你是 ApexWin Casino（代號 House-Light）的 **UI/UX 品質把關者**。專案根目錄：`D:\機動專案\House-Light新平台`（純前端 H5 賭場、全域 `window.HL`、無打包工具、CSS 在 `prototype/src/styles/`、tokens 在 `tokens.css`、共用元件在 `core/ui.js`/`core/dom.js`、佈局在 `layout/app-shell.js`、畫面在 `views/`）。

## 何時用這份
- **建立任何新畫面 / 新元件 / 新功能入口前**：把「§2 七維檢查」當成 definition-of-done，邊做邊對。
- **檢視既有介面 / 收 UI 打磨債時**：照「§4 檢視流程」逐維稽核並回報違規（可與 `apexwin-consolidate` 的 UI-UX 維度互補：consolidate 是自動循環相位，本清單是每次動 UI 都要過的門檻）。

## §1 核心原則（先懂這個，再看清單）
> **佈局不變量要在「容器/系統層」強制，不能靠每個元件各自 ad-hoc。**

House-Light 至今的 UI 傷害幾乎都源自同一件事：**沒有被強制的佈局不變量**——間距靠各元件自己的 margin、功能入口靠一個方便的 `item()` 工廠無限加、按鈕靠一個 `width:100%` 的 base class 到處貼。方便的加法路徑 + 沒有容量/一致性的門檻 = drift。把不變量上移到容器/token/primitive 層，讓「做錯」變成不可能（而非靠人記得）。§3 的三個真實反例都是這條原則的破口。

## §2 七維檢查清單（建 UI 時逐項對，改完自問）

### A. 間距與垂直節奏（spacing rhythm）
- [ ] **堆疊容器用 `gap`，不要靠子元素各自的 `margin-bottom`**。多個區塊縱向堆疊時，父層 `display:flex; flex-direction:column; gap: var(--ax-space-N)`（或 grid `gap`）統一節奏；不要讓 A 只有 `margin-bottom`、B 只有 `margin-top`——邊界會落在「兩邊都沒出力 = 0 間距」。
- [ ] **沒有任何區塊緊貼另一區塊**。相鄰卡片/橫幅/section 之間一律有一致間距（同一頁面用同一階 token）。掃視全頁：每個相鄰邊界間距是否目測相等？
- [ ] 間距值一律走 `--ax-space-*` 階（4/6/8/10/12/14/16/18/24/32/48），**不寫裸 px**（見 D 維 token）。
- [ ] 卡片內 padding 同族一致（同類卡不要一個 16px 一個 20px）。

### B. 導覽 / 功能入口 IA（capacity + 分類）
- [ ] **主要導覽/快捷列有容量上限**。一條 bar/列的頂層項目**上限約 5–7 個**（Miller's law）。超過就必須**分類收進 hub / 子選單 / 抽屜**，不是「反正能水平捲就一直加」。
- [ ] **加新入口前先問「這屬於哪一類，該進哪個 hub」**，而不是往最方便的扁平工廠再塞一個。同質功能（獎勵/留存類、資訊/信任類、社交類…）歸群，一個群一個入口。
- [ ] **`overflow-x:auto` 不是解法，是遮羞布**。若一條列要靠水平捲動才裝得下，代表 IA 已超載——捲動只是把「擠壓」換成「藏起來、要滑才看得到」，兩者都爛。
- [ ] 資訊/信任類（負責任博弈、可驗證公平、條款）不該和高頻行動類（下注、領獎）擠在同一條主行動列——放 footer/設定/about 區。

### C. 元件情境自適配（context-fit：寬度/比例）
- [ ] **base 元件的隱含情境假設不要外洩**。`.ax-btn-primary` base 是 `width:100%`（為手機遊戲面板全寬 CTA 設計，且全站 66 個使用點中絕大多數是 modal/面板/領取鈕＝全寬才是正確主流，故**刻意保留此預設**）——但**一旦內嵌到橫向 flex（橫幅/工具列/inline）就會撐成一整條**。
  - **canonical 橫向按鈕模式（一律走這條，勿再各自刻 override）**：按鈕加 `.ax-btn-primary--inline`（components.css 已提供：`width:auto; flex:0 0 auto; white-space:nowrap`），文字區 `flex:1; min-width:0`。窄屏要佔滿一列時在該情境補 `@media(max-width:560px){ …--inline{width:100%} }`（見 `.ax-tny-banner`）。
  - 反面教訓（T23 列舉）：base 反轉為 `width:auto` 需為 ~40 個全寬站點逐一加 `--block`＝高回歸風險又讓常見全寬變成要顯式宣告（更差人因）→ **不反轉 base、以 `--inline` 收斂**才是這 app 的正解。
- [ ] **CTA 寬度要與標籤成比例**。短標籤（「立即參賽」）配一整條全寬按鈕 = 醜且比例失衡。按鈕寬度應貼合內容或設合理 `max-width`。
- [ ] 內嵌別的元件前，先確認它的 base CSS 有沒有 `width:100%`/`flex:1`/`display:block` 之類會在新情境下爆走的預設；有就加情境 modifier，不要就地 override 一次性 hack。
- [ ] 兩欄/多欄 flex 裡，「該伸縮的那欄」要 `flex:1; min-width:0`，「固定的那欄」`flex:0 0 auto`——別讓預設 `width:100%` 的一方吃掉全部。

### D. 自適應 responsive
- [ ] 375px（手機）實測**無橫向溢出**（`scrollWidth <= clientWidth`、`window.scrollX===0`）；寬內容（表格/滾輪/長列）自身 `overflow-x:auto` 內部捲，不撐破頁。
- [ ] 斷點沿用既有主斷點（≤720 手機 / ≤1024 平板欄收合），不要新增雜亂斷點。
- [ ] 高度用 `dvh` 不用 `vh`（行動端動態工具列）；固定/遮罩用 `env(safe-area-inset-*)`。
- [ ] 手機下主導覽可達（≤720 側欄隱藏→漢堡抽屜，見 R1）。

### E. token 不繞道
- [ ] 顏色走語意 token：gold 用 `var(--ax-gold)`，**不寫裸 `#ffd76a/#ffb524/#ca8a04` 冒充**（多段漸層藝術例外）。
- [ ] 字級走 `--ax-font-*` scale；圓角走 `--ax-radius-*`；間距走 `--ax-space-*`；時長走 `--ax-dur`。
- [ ] 沒有對應 token 的一次性奇值先想「是否該新增中間階 token」（見 U7 決策：新增中間階＝零視覺收斂）。

### F. a11y
- [ ] 可點擊的非 `<button>` 元素用 `HL.dom.pressable()`（role=button + tabindex + Enter/Space）。
- [ ] modal 有 role/Escape/焦點管理（走 `HL.ui.modal`）；segmented/tabs 有 `aria-pressed`/`aria-selected`。
- [ ] `:focus-visible` 有可見焦點環；文字對比過 WCAG（`--ax-text-dim` 別用在需讀的正文）。

### G. i18n
- [ ] 畫面上的**靜態**中文字串在 `i18n.js` 字典補 EN + zh-Hans（key＝畫面中文整串）。
- [ ] **組字/動態字串**（「最高 5×　RTP 98.5%」「第 N 次」）walker 無法逐節點翻 → **一律用 `HL.i18n.fmt("模板含 {name}", {name: 值})`**（U22 已建：模板進字典、值運行時填、隨 setLang 三語重繪+往返還原）。字典補模板 key（EN + zh-Hans）。**已知不適用**：值被字串 concat 進 `textContent` 的地方（如 betPanel `lastEl`、`HL.ui.kv` 字串值）需先讓該處以「節點」組裝才能塞 fmt span（見 U22 尾巴）。
- [ ] gameInfoBar 的 fair 標籤是**整串**節點（`可驗證公平（一注一轉）`），字典要放整串 key，不是子字串。

## §3 三個真實反例（就是我們犯過的錯 · 建 UI 時拿來對照）

### 反例①：底部快捷列 17 項擠壓（IA 容量超載）
- **現象**：`app-shell.js:495 bottombar()` 扁平排了 16 個功能項（任務/簽到/錦標賽/獎勵中心/幸運轉盤/每週抽獎/兌換碼/週期紅利/多倍數挑戰/點數商城/淨損回饋/Happy Hour/黃金之城/負責任博弈/可驗證公平/VIP）+ 右側夥伴/聊天。文字全擠在一起、手機下靠 `overflow-x:auto` 水平捲。
- **根因**：有個方便的 `item()` 工廠 + `.ax-bottombar{overflow-x:auto}` 遮羞布 → S12/S13 等 firing 不斷往這條扁平列加項，**沒有容量門檻、沒有分類**。違反 §2-B。
- **修法方向**：留 4–6 個高頻頂層項（如 錢包/獎勵中心 hub/錦標賽/VIP）；把獎勵留存類（簽到/轉盤/抽獎/兌換碼/週期紅利/多倍挑戰/點數商城/淨損回饋/Happy Hour/黃金之城）**收進「🎁 獎勵中心」單一入口 → 分類的 hub 面板**；信任資訊類（負責任博弈/可驗證公平）移 footer/about。加新獎勵功能＝進 hub，不是進主列。

### 反例②：錦標賽橫幅緊貼世界活動（垂直節奏破口）
- **現象**：`.ax-tny-banner`（lobby.js:82）緊貼上方 `.ax-hero-row`，唯獨這個邊界零間距，其他區塊都有間距。
- **根因**：`.ax-lobby__main{display:flex;flex-direction:column;}` **沒有 `gap`**；縱向間距全靠各子元素自己的 margin。`.ax-hero-row` 無 `margin-bottom`、`.ax-tny-banner` 只有 `margin-bottom` 無 `margin-top` → 兩者邊界 0px。違反 §2-A。
- **修法方向**：`.ax-lobby__main` 加 `gap: var(--ax-space-5)`（或 `-4`），移除各子元素 ad-hoc 的 `margin-bottom` 讓節奏統一 → 任何區塊都不可能再緊貼。這是「容器層強制不變量」的示範。

### 反例③：「立即參賽」按鈕撐成一整條（元件情境外洩）
- **現象**：`.ax-tny-banner` 裡的 `立即參賽 →` 按鈕（`.ax-btn-primary`）在橫向橫幅裡變成占大半寬度的長條，比例怪異。
- **根因**：`.ax-btn-primary` base 是 **`width:100%`**（為手機遊戲面板全寬 CTA 設計）；內嵌到橫向 flex 橫幅就撐滿。`.ax-tny-banner__l` 又無 CSS（不 `flex:1`）→ 文字區縮到內容寬、按鈕吃掉剩餘全部。違反 §2-C。
- **修法方向（已修 · commit 98e707e）**：新增可復用 `.ax-btn-primary--inline`（width:auto/flex:0 0 auto/nowrap）+ `.ax-tny-banner__l{flex:1; min-width:0}`＝CTA 佔比 75%→11%。**以後任何把 `.ax-btn-primary` 放進橫向容器都走 `--inline`（見 §2-C canonical 模式）**；base 預設維持 width:100%（全寬是主流正解，T23 已論證不反轉）。

## §4 檢視流程（稽核既有畫面 / 一筆 UI 改動時）
1. **先讀相關檔**：該畫面的 view（`views/*.js`）、它用到的 primitive（`core/ui.js`）、對應 CSS（`components.css`）、tokens。
2. **逐維過 §2 七維**，用 Grep 找系統性破口（不是只看眼前這處）：
   - 間距：該堆疊容器有沒有 `gap`？相鄰邊界間距一致嗎？（grep 容器 class 的 CSS）
   - IA：這條列/選單有幾個頂層項？> 7 就是債。
   - 情境：內嵌的 base 元件有沒有 `width:100%`/`flex:1` 外洩？（grep 該 class base 規則）
   - token：`grep` 裸值 `#ffd76a|#ffb524|[0-9]+px`（間距/圓角/字級）。
3. **驗證用 DOM eval 為主**（本 app 截圖常逾時，見 CLAUDE.md §9）：`preview_start` → `?demo=1` → `read_console_messages` 無 error → 對受影響區塊 `javascript_tool` 量幾何（相鄰區塊間距、按鈕寬/容器寬比例、375px `scrollWidth<=clientWidth`）→ 必要時切 EN/zh-Hans 驗 i18n。
4. **回報**：每筆違規附 `file:line` 證據、命中哪一維、根因（是不是「該在容器/系統層強制的不變量被 ad-hoc 化」）、修法方向、嚴重度/工作量。要收成打磨債就寫進 `intel/DEBT.md`（遵守 §7 並行提交鐵律：commit 前 `git status`/`git log` 複查、只 add 自己的檔、避開背景 firing 正在飛的檔）。

## §5 任何新 UI 的 Definition of Done（收尾自檢）
- 間距：走容器 `gap` + `--ax-space-*`，無區塊緊貼；
- IA：新入口有歸類，沒讓主列超過 ~7 項；
- 情境：內嵌元件寬度/比例正確，無 `width:100%` 外洩；
- responsive：375px 無橫向溢出、dvh/safe-area 到位；
- token：無裸色/裸字級/裸間距繞道；
- a11y：可點元素可鍵盤達、modal/segmented 有 ARIA、有 focus ring；
- i18n：靜態字串三語補齊、動態組字有意識處理；
- 驗證：preview DOM eval 過、零 console error。
