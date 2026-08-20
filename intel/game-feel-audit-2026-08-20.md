# 遊戲手感/操作巡檢 — 2026-08-20（前景，消化船長 G8②）

> **這是什麼**：船長 2026-08-19 目視查驗 Plinko 後指派的全面巡檢。10 批平行稽核（涵蓋 24 款登錄遊戲 + `core/instant.js`／`core/table.js` 兩個共用引擎）→ 逐批敵對複驗（預設立場「他說錯了」，REFUTED 一律剔除）→ 合併分家族。共 21 個 agent。
> **只查手感/操作/節奏/回饋與「遊戲類型有沒有做對」**（保真規格第 3／4／9／10／11／12 項），**不碰 RTP/賠付數學**（另有閘）。
> **證據標準**：每條都附 `檔案:行號` + 真實世界做法 vs 我們的做法 + 具體重現路徑，且必須從程式碼可證。
> **不是待辦清單的全部**：這是**證據庫**。實作優先序見文末 Wave 表；逐條狀態請在本檔行內用 ✅/🏗️ 標記，勿另開第二份真相。

**規模**：存活 **78** 條 ｜ CONFIRMED **69** ｜ PLAUSIBLE 9 ｜ high 21／medium 34／low 23 ｜ 家族 42 個

---

# ApexWin 遊戲手感/操作缺陷 — 10 批巡檢總結（敵對複驗後存活 78 條）

**規模**：78 條存活缺陷，跨 25 個遊戲表面。high 21 / medium 34 / low 23。判定：**CONFIRMED 68 條、PLAUSIBLE 10 條（10 條全部落在 low）** — 也就是說**所有 high 與 medium 都已由程式逐行證明**，不需目視即可動手。

**一句話結論**：78 條裡有約 56 條可歸進 9 個家族，而這 9 個家族的根因**幾乎全部落在 6 個共用檔案**（`core/instant.js`、`core/table.js`、`layout/app-shell.js`、`views/game-frame.js`、`core/ui.js`、`core/dom.js`）。逐款修會做 78 次，修家族只要改 6 個地方 + 一輪 S 級尾巴。

---

## 一、缺陷家族（同一根因跨多款重複出現）

### 家族 A — 回合沒有硬性 commit 鎖（11 條，10 款，含 3 條 high）
**根因（引擎級，最關鍵的一條）**：`HL.instant.betPanel` 的 api（`core/instant.js:142-148`）只導出 `node/getBet/stop/pressPlay/mulBet/setMin`，**沒有 `lock()` / `isBusy()` 出口**；而各遊戲的 `busy` 是檔內閉包私有變數，panel 看不到。panel 自己的守衛 `if (state.running || playBtn.disabled) return`（`instant.js:86`）在買入動畫期間兩者皆 false ⇒ **點旋轉必開第二局**。同時 panel 的下注輸入框與 ½/2×/Max 三顆 chip 從頭到尾無 running 閘（`instant.js:45,49-51` vs `:118,:127` 兩邊搶同一欄位）。

影響與形狀：
- **兩入口並行開局**（high）：Pirots `slot-pirots.js:228`、Dead By Noon `slot-dead-by-noon.js:252`、Golden Toad `slot-golden-toad.js:239`、Gem Storm `slot-gem-storm.js:245`、暗影儀式 `slot.js:601,552-559`（買入把 `st.mode/roundWin/rows` 寫進正被 `processBoard` 使用的同一個 `st`，盤面還在跑上一注的連爆）
- **已 commit 參數可改**（high/medium）：暗影儀式押注 ±（`slot.js:603` 無 busy 閘，連爆與整輪免費遊戲的結算基準被放大 10 倍）、Dice/Limbo 的注額與滑桿（`instant-games.js:113-115,170`）
- **揭曉中不鎖**：Hilo 連點砍掉整張牌的翻牌（`instant-hilo.js:104-119,93-94`）、Pump 雙擊多賭一步（`instant-pump.js:92-104`，PLAUSIBLE）
- **網路在途不鎖**（high）：賞金局翻牌連點兩下送兩次 `bounty_flip`（`bounty.js:91-98,122-126`；SQL `supabase-phase7.sql:265-266` 每次都獨立扣費派彩）— 同檔踩地雷路徑 `:231-233` 與 `chicken.js:161-163` 都有做，只有翻牌漏了
- **完全無 escrow**（high）：Slots Battle 加入房不預扣，落後就按返回鈕（`arena.js:132-135`、`vsslot.js:241`）

**一次修（S+M）**：① `core/instant.js` 給 betPanel api 加 `lock(b)/isBusy()`，內部同時 disable input + 三顆 chip + playBtn；② 5 款 slot 的買入鈕改成買入前 `panel.lock(true)`、把私有 `busy` 改成問 panel；③ 所有「推進風險」按鈕（打氣/猜高低/翻牌/RPC 在途）進場設 in-flight 旗標；④ escrow 需後端（見第四節 Wave 3）。①+② 一次通吃 7 款。

### 家族 B — 沒有 view 卸載鉤，離場後計時器繼續跑（6 條，含 3 條 high）
**根因**：`app-shell.js:692-699 mountView` 與 `main.js:74-77 renderApp` 只 `HL.dom.clear()` 拔 DOM，`grep unmount|teardown|onLeave|destroy` 在 views 層零命中。平台其實**已有**一條正規清理通道 `HL.ticker.clearAll()`（`main.js:11-15` 註冊表），但這些 view 全走裸 setTimeout/setInterval 不註冊。且已證實 detach 後不會拋錯自然中斷（`app-shell.js:36-42`、`live-stats.js:19-48` 全程 null-safe）⇒ 迴圈會活到餘額見底。

影響：
- betPanel autobet（**9 個呼叫點**：Dice/Limbo/Cases + 4 款 slot）離場後每 770ms 持續扣款派彩，**每進一款遊戲就多疊一個並行迴圈**同吃一份餘額，且照樣餵 VIP/任務/返水/JP/錦標賽、消耗 fair nonce（`instant.js:109,131,143` — `betPanel.stop` 全 repo 零呼叫者＝死出口）
- 暗影儀式自動旋轉/免費輪鏈在大廳背景續扣，結算 modal 蓋到大廳（`slot.js:491-493,505,515`，全檔 `clearTimeout` 零命中）
- Mines `revealRestSafe` 的 30ms 階梯把鑽石畫到新棋盤，**那些格子從此點不動、全清自動兌現永不成立**（`instant-crash-mines.js:153,192,162`，全檔 `clearTimeout` 零命中）
- Dice/Limbo 按停止後解鎖過早＋in-flight 揭曉不可取消，兩局重疊寫同一顆 bigEl（`instant.js:109` vs `:91` 同檔不一致）
- 賞金局跨房：翻牌殘留鏈對「下一間房」扣次數、扣賞金池、把結算卡長進新房（`bounty.js:104-119,154-163`）
- 小雞死亡演出三段 timer 無 epoch 閘（`chicken.js:216-265`），而同檔每個 RPC 回呼都有（`:58` 註解自陳）

**一次修**：最小落地＝所有迴圈/階梯加存活檢查，**同庫已有兩個現成形制可抄**（`instant.js:26 hkPanel.node.isConnected`、`instant-crash-mines.js:104 if(!multEl.isConnected){stop();return;}`），並在各 view 內把裸 timer 收進本地 `timers[]` + epoch 世代閘（`chicken.js:58` / `vsslot.js:49` 已有寫法）。治本＝mountView 前呼叫上一個 view 的 `destroy()`。

### 家族 C — 「極速模式」是明文承諾未實現（5 條，9 款）
**根因**：`views/game-frame.js:79` 對玩家寫「極速模式 — 跳過結果動畫、縮短自動下注間隔（**全遊戲生效**）」，`core/game-settings.js:3` 也自陳「設定一次、所有遊戲生效」。但 `HL.gset.get("fast")` 全站**只有 `core/instant.js:18` 一處消費**，只被 `animate()` 與 autobet 間隔讀；5 款 slot 檔 grep `gset` **零命中**；`instant.js:91` 手動路徑硬寫 `{turbo:false}`，Turbo checkbox 只 append 進 autoWrap ⇒ **手動模式結構上拿不到 Turbo**。

影響：暗影儀式（2.57 秒/段連爆、最壞 3-4 分鐘乾等）、Pirots（買入 p90 20 秒、尾端 65 秒）、Dead By Noon（p90 12.7 秒）、Golden Toad、Gem Storm（局內動畫一毫秒都不省）、Dice/Limbo（300/620ms 揭曉閘打不通，手動永遠無 Turbo）、Crash/Mines/Towers 連 Space 熱鍵都靜默死（`hkPanel` 只由 betPanel 在 `:149` 指派）。

**一次修（S，全清單 CP 值最高）**：① `instant.js:91` 手動路徑改 `{ turbo: HL.gset.get("fast") }`；② dice/limbo 的 `fast` 改 `ctx.turbo || fastMode()`；③ 5 款 slot 的 `fast = !!(ctx&&ctx.turbo)` 改成 `|| HL.gset.get("fast")` 並讓 delay 吃速度係數。**三處改動 → 9 款受益，且可用 grep 驗收。**

### 家族 D — 揭曉沒有分階段，結果與結算擠在同一 tick（10 條）
**根因**：整局只排一顆 setTimeout，回呼內同步做完「揭曉＋亮贏區＋派彩＋文字＋歷史＋清檯＋解鎖」。直接違反 `intel/db/game-fidelity-spec.md` 第 3/4/9/10 項（「瞬間平板結算 = FAIL」）。

影響（重到輕）：Picks（`instant-picks.js:152-183` settle 內 setTimeout/Promise/rAF **零命中**，連注金離開錢包那一格都沒有）、骰寶（`table-sicbo.js:167` 唯一時間軸 680ms）、龍虎（`table-dragon-tiger.js:111-117` 兩張牌同 tick，0.32s 已可讀勝負卻空等到 620ms）、百家（`table-baccarat.js:176-177` 閒莊平行落牌、第三張同波 0.24s、點數等 890ms）、Golden Toad/Gem Storm（無轉輪階段，最終盤一次現形）、Gem Storm（tumble 缺「消除」中間影格 `slot-gem-storm.js:91,111`）、Dice Duel（同 tick，PLAUSIBLE）、Dice 指針提前 150-200ms（PLAUSIBLE）、暗影儀式無停輪期待感（PLAUSIBLE）。

**一次修（M）**：桌遊在 `core/table.js` 之上補一個階段時間軸 helper（reveal → sweep → pay → history → unlock 各一拍），與家族 E 同一輪做；兩款 slot 的逐欄停輪是 L。

### 家族 E — HL.table 層系統性債（5 條，一次通吃 6 款桌遊）
**根因（一個檔）**：`core/table.js:66-72 settle` 只回傳聚合 `{staked,payout,net}`、**無 per-id 明細**；view 一律「加 is-win → settle → `area.clear()`」同幀，`clear()` 觸發 renderStakes 把贏區與輸區籌碼徽章一起抹掉；`lock(b)`（`:108`）只改閉包旗標；`controls()`（`:90-99`）**只回傳 dealBtn** ⇒ 清除/復原/重押三顆鈕結構上無法 disable；注區 `<button>` 從不 disable、全 repo 桌遊 view 的 `is-locked` 零命中；`rebet()`（`:51-53`）每個注區只 push 一筆聚合 action ⇒ 復原一次清掉整區。

影響：**百家樂、輪盤、龍虎鬥、骰寶、安達巴哈、幸運轉盤（全 6 款）**。玩家看不到「輸的被收走、贏的留在原位被賠」，多注時無法稽核；停止下注期間注區仍有 hover/下壓回饋但點擊被靜默吞掉（`table.js:39-45` 鎖定路徑無 toast，而同一函式餘額不足時有 toast＝同函式兩種失敗兩種待遇）。

**一次修（M，改在 `core/table.js` 一處）**：settle 回傳 per-id 明細並拆兩拍（掃輸家 → 付贏家）；controls() 回傳三顆鈕 handle 並隨 lock disable；lock 加 `.is-locked`（注區 pointer-events + 灰化）；rebet 改逐顆 push。

### 家族 F — 計分板與控件狀態不隨狀態刷新（12 條，含 1 條 high）
**根因（三種寫法反覆出現）**：(i) 只在成功分支寫、沒有 else；(ii) 兩個不同單位的累加器交替寫同一顆元素；(iii) 進場/離場不重設、邊界值不夾。

影響：
- **Gem Storm 免費遊戲總贏分從不套 `CFG.G=2.30` 且每轉重置累加器**（`slot-gem-storm.js:189,190,221,227`）⇒ 數字會倒退（seed 1 實測 61.6× → 0.46×，掉 134 倍），**終值恆為實付的 1/2.3**（badge 70× vs 實付 161×）— **high**
- Keno 新局揭曉的 1.8 秒全程掛著上一局的倍數/派彩/綠色中獎字（`instant-keno.js:122-137`，`clearMarks` 只碰格子 class）
- Dead By Noon 乘數徽章只升不降（`:214` 無 else），把 ×12 留在實際只乘 ×1 的 cascade 上、金光也卡住
- Towers 兌現的勝利光環永不移除（`instant-towers.js:136` 全檔零 remove）⇒ 此後每一局含輸局整座塔都亮綠；HUD「下一層」停在不存在的第 9 層 13.19×（`:65,114-116`，同家族 Pump `instant-pump.js:81` 有做極限處理＝反證漏寫）
- Mines「下一格」顯示 `Infinity×` 並殘留到下一局（`instant-crash-mines.js:148,29`）
- Crash 自動兌現輸入框局中改動被靜默丟棄、也沒鎖（`:97,111,122`）
- Towers/Hilo/Pump 的兌現鈕開局即 enabled 但**此時 100% 被拒並吐 warn toast**（`towers:128 vs :133`、`hilo:128 vs :134`、`pump:115 vs :120`）
- 賞金局踩地雷 0 格兌現 x0.00 直接輸掉整注 + 吃一次挑戰次數（`bounty.js:249,252-257`；同專案 `instant-crash-mines.js:189` 明文擋掉這件事）
- 小雞結算後 1.5 秒沒有任何按鈕刷新：「兌現」亮著按下無反應，主鈕仍寫「出發」但語意已變成扣款開新局（`chicken.js:131-145,268-269,300-313`）
- Limbo/Dice 大字動畫起點取 `parseFloat(el.textContent)` 而全檔只有一處寫入它 ⇒ **每局起點＝上一局結果**，Limbo 約半數局是 600ms 倒數下來（`instant-games.js:175,180`；`:158` 硬寫 1.00× 起點＋`:177` 行末註解「快速滾動上升」自證本意）— **high**
- Gem Storm retrigger 分母延後一轉才無聲變大（`slot-gem-storm.js:98-99,220`，render 區零處讀 `fs.retrig`）

**一次修**：導入「單一 refresh 出口」慣例 — 每次狀態變更（含結算、離場、進場、失敗分支）都呼叫同一個 `refreshHUD/updateButtons`，且該函式內每個分支都寫（含 else 與初值）。逐檔 1-3 行，建議一輪打包成一張「HUD/控件真實性」卡。

### 家族 G — 回饋零分級 + 慶祝元件沒抽共用（6 條）
**根因**：`slot.js:446-464 bigWin()` 是 slot.js 內的 **local function**（`grep ax-bigwin` 只命中 `slot.js:449-454`），未掛上 `HL` ⇒ 它的三級覆蓋層（`x>=100?EPIC:x>=40?MEGA:BIG`）、rAF count-up、隨倍率縮放時長（`1400+min(1600,x*8)`）、點擊略過，**桌遊與 instant 全部接不到**。另：全平台 grep `Audio|AudioContext|HL.sfx` 零命中＝無音效引擎（平台級空缺，不該塞進遊戲軌卡）。

影響：龍虎同花和 51×、骰寶圍骰 181×、幸運轉盤 ×14 與 1:1 小勝**共用同一行綠字＋同一個 2px 金框，金額不 roll-up**（`table-dragon-tiger.js:150-152`、`table-sicbo.js:173-177`、`table-moneywheel.js:239-242`、`table-roulette.js:141-143`、`table-baccarat.js:192-194`）；Hilo「同點算輸」與方向猜錯像素級相同（`instant-hilo.js:109,117`）；Towers 登頂／Pump 撐到極限的專屬慶祝文字在同一 task 被 cashOut 覆寫＝**死碼**（`towers:116+135`、`pump:101+122`）；Pirots/DBN 買入 FS 繞過 `settle()`，面板「上一局」永遠寫普通旋轉那筆（`dbn:259`、`pirots:236` vs `instant.js:78`）。

**一次修（M）**：把 bigWin 抽成 `HL.ui.bigWin(amount, x)` 掛共用層，桌遊/instant 結算尾端統一呼叫；專屬慶祝改排下一 tick 或交給 bigWin 的 done 回呼。**這也是 `games-catalog.json` 把第 9/11 項記成 PASS 的那個形態 — 見第五節。**

### 家族 H — 動畫起點/終點未提交（4 條）
**根因**：(i) `HL.dom.clear(board)` 每影格砍光重建全部格子 ⇒ cell 上宣告的 `transition` 在新元素上永遠無前值可插值＝**死碼**，且無法用 reflow 救（元素本身被換掉）；(ii) animation 無 `animation-fill-mode` 且停前不把當下 transform 寫回 inline ⇒ class 一移除彈回起始態。

影響：Pirots/DBN cascade **完全沒有位移動畫**，整盤瞬間換字（`slot-dead-by-noon.js:189`、`slot-pirots.js:143`、`components.css:3062,3037`；CSS 全查無任何 drop/translateY keyframe）；Golden Toad/Gem Storm 同構（`:158`/`:160`，`components.css:3085,3109` 的 transition 是死碼）；輪盤停轉瞬間金色指針從約 51° 彈回正上方（`components.css:2635-2636` 無 fill-mode，`table-roulette.js:136-138` 同 task 移除 class，PLAUSIBLE）；Pump 爆裂 keyframes 假設 `scale(1)` 但 inline 可達 1.99 ⇒ 先縮小、0.4s 後彈回膨脹尺寸停住（`instant-pump.js:85-86,94-97`）。
**同 repo 正確對照就在隔壁**：`slot.js:321 void reelEl.offsetWidth` 提交起點 + 逐欄 `0.7+r*0.1s` 停輪 + `.ax-sym.is-drop` keyframe。

**一次修（M/L）**：改成「保留格子元素、只更新內容 + 位移 class」；輪盤/Pump 的 fill-mode 是 S。

### 家族 J — 揭曉與帳務時序錯位（2 條，4 款）
**根因**：兩個相反方向的同一種錯。(i) 派彩在動畫開始**前**就 `setBal` ⇒ 頁首錢包（`app-shell.js:37-41,671-673` 與 main 同層、mountView 不清）先洩漏結果：Keno `instant-keno.js:136` 入帳、`:141-150` 才開始 90ms/球；Duel `instant-duel.js:99` 入帳、`:106` 才排 800ms。(ii) 結果盤面在派彩**前**被固定種子待機盤抹掉：Golden Toad/Gem Storm 的 `renderResting()`（`:230`/`:237`）在同步塊裡把中獎盤換成固定無獎盤，而 settle 的 finish 在下一個 microtask 才寫「贏 +N」（Gem Storm 更把總分 badge 一起 `display:none`）。
**對照組**：Cases 走 betPanel，payout 掛 `res.done.then(finish)`（`instant.js:82`）＝動畫結束才入帳 — **同 codebase 兩套做法**。

**一次修（M）**：入帳點統一移到揭曉完成的 promise 尾；toad/gem 的 `renderResting()` 改在下一局 spin 開始時才呼叫。

---

## 二、單款專屬重點缺陷（依 severity 排序；家族成員不在此重複，其 file:line 已寫在上方家族內）

| 遊戲 | 缺陷 | 檔案:行號 | 修 | 判定 |
|---|---|---|---|---|
| Crash X | 自動兌現只在 60ms tick 求值且 bust 檢查排在它前面 ⇒ crashAt 落在 [target, target×1.0336) 的局仍判輸（target=2 時占應贏局 3.2%），同一顆亂數餵純數學會回 win:true；反向觸發時兌現的是 tick 值不是 target | `instant-crash-mines.js:107-111`（對照 `:22`） | S | CONFIRMED |
| Crash X | 兌現當下即 clearInterval ⇒ 該類型唯一的張力（看它後來飛到哪）整段消失，歷史籌碼卻立刻貼出玩家沒看到的崩盤倍數、還可點開公平驗證 | `instant-crash-mines.js:89,71,60` | M | CONFIRMED |
| Dead By Noon | 招牌「乘數彈膛」數字每次 cascade 全部重抽、落盤當下不揭曉，同一顆籌碼沿路 1→1→3→1 亂跳；資訊列與檔頭卻宣告「隨下落累積、串接成乘數」 | `slot-dead-by-noon.js:126,104,214,276` | M | CONFIRMED |
| Picks | 整局零階段：settle 從扣注到重生賽程全在同一同步 task，setTimeout/Promise/rAF 零命中，按鈕文案卻寫「下單開賽／開賽後見真章」 | `instant-picks.js:152-183,79,80` | M | CONFIRMED |
| 輪盤 | 沒有球、沒有 37 袋位 DOM，輪面 2200ms 等速無限轉且角度與開號零關聯（指針還是子節點跟著繞），中央 `Math.random` 跑馬燈，結果 textContent 瞬換 | `table-roulette.js:58,128-138,146`；`components.css:2630-2645` | L | CONFIRMED |
| 安達巴哈 | 發牌節奏被「總時長固定 1600ms」倒著壓縮：張數越多每張越快（10 張 150ms、13 張 123ms、29 張以上觸底 55ms），**最該緊張的長局讀起來最快**；贏方高亮與配對牌同幀 | `table-andar-bahar.js:151,157-163` | S | CONFIRMED |
| 幸運轉盤 | 命中乘數段（招牌高潮）只有 120ms 舞台時間，×N 徽章 200ms 淡入到 60% 不透明度時輪盤已重轉，玩家多半根本沒發現中了 | `table-moneywheel.js:214,215-229`；`components.css:2428` | S | CONFIRMED |
| Slots Battle | 會員模式 10 輪動畫是客端 `HL.fair` 抽樣，勝負由 SQL 另一組 `random()` 決定並在最後整批覆蓋總分與名次；api 不送 seed、SQL 不收 seed ⇒ 兩套 RNG 結構上不可能相關，「看過程」回放的逐輪資料也被換掉 | `vsslot.js:175,248-259,261,205`；`api.js:63-68`；`supabase-phase7.sql:133-140` | L | CONFIRMED |
| 賞金局·踩地雷 | 會員模式一次 RPC 開完整局：12 格盤面與兌現鈕純裝飾（`:247 return` 讓兌現鈕永不解鎖），資訊列那句「翻格累積倍數、隨時可兌現」對會員一句都不成立；且 RPC 在途點格子會用 render 時配好的舊雷圖跑客端結算 ⇒ 同一次挑戰結算兩次、次數扣 2 | `bounty.js:230-250,201,210-217,186-195` | M | CONFIRMED |
| 暗影儀式 | 免費遊戲觸發無硬轉場：mode/背景/儀式條/符號池在**同一注的連爆中途**翻轉，訊息宣告 5×5 但盤面仍跑 4 列，且該注後續不再掉低階符號＝已付款那一注規則被中途換掉 | `slot.js:342,416-417,285-286,216,167,211` | M | CONFIRMED |
| Mines | 踩雷收局只翻地雷、不翻剩餘鑽石；兌現收局兩者都翻 ⇒ **較殘缺的是「輸」那次**（同 repo Towers `:109/:136` 兩路徑共用 revealTraps＝同作者正確做法就在隔壁） | `instant-crash-mines.js:167` vs `:192` | S | CONFIRMED |
| 暗影儀式 | 餘額不足時沒停自動旋轉，`st.auto` 殘留成殭屍計數；日後手動一注跑完會自動接續剩下 N 局。**相鄰四行的負責任博弈閘有做，註解還自陳這條規則** | `slot.js:469` vs `:473`（對照 `instant.js:119`） | S | CONFIRMED |
| 暗影儀式 | 「自動旋轉 ×10」實跑 11 局（啟動那局未計數，node 鏡像實測扣 1,100 而非 1,000）；反向：進特色回合時 endCandle/endCursed 又各多扣一格額度 | `slot.js:565-566,493,505,515` | S | CONFIRMED |
| Golden Toad | Hold & Win 重旋期間非鎖定格是永久空白，沒落到金幣的那次重旋渲染出與前一影格逐格相同的畫面（3000 局實測 51.9% 的重旋影格 fresh 為空、24.1% 是空接空完全靜止），各停 300ms | `slot-golden-toad.js:208,212,214,172,101-102` | M | CONFIRMED |
| 百家樂 | 沒有路單：`HL.ui.histBar` 是單列 flat div（`ui.js:346-365`），只有一排 18 顆 bead、不記對子、無珠盤路/大路/大眼仔/小路，第 19 局起最舊的直接丟掉 ⇒ 無法讀連莊、只能盲押 | `table-baccarat.js:118,163-166,226` | L | CONFIRMED |
| Dice Duel | 平手重擲整段被吞：`resolve()` 回傳的 `ties` 從未被讀，畫面無平手路徑，資訊列卻對玩家宣告「平手重擲」；公平面板會列出畫面上從未出現過的 nonce（約 1% 局） | `instant-duel.js:33-37,95,125` | S | CONFIRMED |
| Keno | 「隨機選號」無條件清空既有選號且硬寫只選 5 個 ⇒ 一鍵把 10 星注型降成 5 星、賠付表整張換掉、無備份無還原，按鈕文字毫無暗示 | `instant-keno.js:96-106,70` | S | CONFIRMED |
| Pirots | 未開局的靜態擺設盤含 2 組依自家規則必被收集的 ≥6 同色連通群（9 格紅、7 格黃），且種子硬寫 `0x1234`＝每次載入都一樣（DBN 的待機盤實測 0 中獎，此條只屬 Pirots） | `slot-pirots.js:158,59` | S | CONFIRMED |
| 賞金局·踩地雷 | 翻完全部安全格後沒有任何終局：不自動兌現、不鎖剩餘格、無提示，玩家已達本局上限卻被介面引導去踩雷（同專案正牌 Mines `:170` 有封頂自動結算） | `bounty.js:199-222` | S | CONFIRMED |
| Pirots | 對玩家宣稱的「鳥收集寶石」在畫面上不存在：無收集者實體、無每色進度，鸚鵡只是 scatter（**可證的缺陷只是文案與實作不符，改文案是 S；補收集者是產品決策**） | `slot-pirots.js:253,49,141` | S | **PLAUSIBLE** |
| 幸運轉盤 | 指針是從不被動畫的靜態三角形、輪面上無釘/flapper（規格具名要求「指針 tick 過釘減速、卡邊緣的差一點」）；減速本身是有的，缺的是 tick 這一半 | `table-moneywheel.js:148,133-141`；`components.css:2414-2419` | M | **PLAUSIBLE** |
| Picks | 每下一單就把沒下注的另外兩場整批重生（無法再下同一盤口、無 rebet），且**無局內歷史帶**（duel/cases 都有）。「零可追溯」已被駁回：注單中心有金額/倍數/nonce，只缺盤口 | `instant-picks.js:180-182,67` | S | **PLAUSIBLE** |

---

## 三、CONFIRMED / PLAUSIBLE 分界

- **CONFIRMED 68 條**：全部 high（21）與全部 medium（34），加 13 條 low。這些都由行號逐字核對 + 多條用 node 重跑檔內匯出的純數學交叉驗證（Crash 失竊窗機率、Mines `Infinity`、Gem Storm 1/2.3 比值、暗影儀式 11 局、Golden Toad 空重旋 51.9%、安達巴哈 stagger 分布、Pirots 待機盤 cluster、DBN seed 7 逐值）。**可直接動手，不需目視。**
- **PLAUSIBLE 10 條（全部 low）**：機制已由程式證明，但「是否構成手感缺陷／嚴重度多少」需 preview 目視定級 — Dice 指針提前、Crash/Mines 無 autobet 熱鍵死區、Pump 雙擊、Dice Duel 同時揭曉、Picks 賽程重生、暗影儀式無停輪期待感、Pirots 鳥收集、輪盤輪面彈回、幸運轉盤指針 tick、小雞死亡殘留 timer（可達性未證明）。**這 10 條不要在 headless 輪動它們。**

複驗過程中另有多條原始指控被**部分駁回或更正**（已反映在上面的措辭）：Dice/Limbo 按 Max 不必然 all-in、極速模式省 47%/33% 不是 26%、Crash 背景分頁輸率 67% 不是「必輸」、輪盤彈回是 51° 不是 154°、骰寶注區是 35 個不是 50、安達巴哈配對牌之後其實有 463ms 停頓、暗影儀式復位按一下即可不是兩下、Pirots findClusters 其實是同色判定、賞金局餘額不會真的被扣兩次（被伺服器值覆蓋，重複的是次數/賞金池/帳本）。

---

## 四、建議修復順序

### Wave 1 — headless 安全落地（純邏輯、無視覺回歸風險，可一輪打完）
1. **Crash 自動兌現順序**（`instant-crash-mines.js:111` 移到 `:108` 之前、以 `autoTarget` 而非 tick mult 兌現）— 全清單唯一「畫面判輸、驗證器判贏」的兩套結算規則不一致，最優先。
2. **家族 C 極速模式三處改動** — 9 款受益、grep 可驗收，投報率第一。
3. **家族 F 的起點/邊界類**：Limbo/Dice 起點恆取 1、Mines `Infinity×` 夾值、Towers 幻影第 9 層、Towers `is-win` 補 remove、DBN 徽章補 else、Keno 開局清 statusEl/multEl/winEl、Gem Storm pot 統一單位（node 可對比 total）、Gem Storm retrigger 提前發事件。
4. **家族 A 的引擎修** ①②③ — betPanel `lock/isBusy` + 5 款買入鈕 + 3 款風險鈕 in-flight，行為可用 DOM 斷言驗。
5. **家族 B 最小修** — `isConnected` 存活檢查 + `timers[]` + epoch 閘（兩個現成形制可抄），優先做 betPanel autobet 與暗影儀式（會真的扣玩家的錢）。
6. **暗影儀式**：餘額不足 stopAuto、auto off-by-one（各一至兩行，node 可驗）。
7. **控件狀態 S 修**：三檔兌現鈕改「首次成功才解鎖」、賞金局 0 格兌現守衛、Crash `autoIn` 鎖、小雞 cashLocal/celebrate/afterDeath 尾端補 `updateButtons()`、賞金局跨房 epoch 閘。
8. **資訊/文案一致性 S 修**：Duel 平手宣告、Keno 隨機選號改「補到玩家星數」、Pirots 待機盤改重抽到無 cluster + 文案、Mines 踩雷改對稱揭曉、賞金局全翻完自動兌現。

### Wave 2 — 必須排有 preview 的輪次（改的是節奏/視覺，需逐款目視回歸）
9. **家族 E `core/table.js`**（per-id 明細 + 掃輸家/付贏家兩拍 + lock 可見 + rebet/undo）— 一個檔動 6 款桌遊，必須逐款目視。
10. **家族 G `HL.ui.bigWin` 抽共用 + 分級門檻** — 全螢幕覆蓋層，要驗 z-index / 點擊略過 / 不擋公版返回鈕。
11. **家族 D 桌遊分階段時間軸**（龍虎 620ms 拆兩拍、百家交替發牌 + 擠牌、骰寶先報總點、Picks 補開賽相位、安達巴哈改固定間隔 + 配對牌專屬拍、幸運轉盤乘數段延長至可讀）。
12. **家族 H**（Pirots/DBN/toad/gem 改「保留格子只換內容 + 落下 class」；輪盤 fill-mode/角度；Pump `is-pop`）。
13. **家族 J** 入帳時序（Keno/Duel 移到揭曉尾；toad/gem `renderResting()` 延後）。
14. **L 級重做**：輪盤真球 + 逐袋位、Golden Toad/Gem Storm 逐欄停輪、百家路單、DBN 乘數彈膛數字持久化（M）、Hold & Win 空重旋補滾動內容（M）、暗影儀式停輪期待感。
15. **10 條 PLAUSIBLE 全部在此輪定級**。

### Wave 3 — 需決策/跨軌，不是純修
16. **Slots Battle 真相來源**：要選「伺服器送 seed 讓客端重演」還是「客端只演伺服器逐輪資料」— 改 `supabase-phase7.sql play_battle` + `api.js`，屬平台/後端輪。
17. **Slots Battle escrow + 逃單罰則**、**賞金局踩地雷改逐格權威**（`chicken_step` 已是現成模式）— 都需 SQL，且與 `CLAUDE.md §11` 真金 checklist 的 `bounty_mine` client-trust 同一票，建議合併成一張後端卡。
18. **全平台無音效引擎**（grep `Audio|AudioContext|HL.sfx` 零命中）— 平台級空缺，不要塞進遊戲軌手感卡。

---

## 五、比任何單條缺陷更該處理的一件事：保真閘的自我認證正在失效

`intel/db/games-catalog.json` 的 `gate_log` 裡查到多筆**規格自己判 FAIL 的形態被記成 PASS**：
- 龍虎鬥 `8_expectation_exists` 記「PASS（VS 版面 + 620ms 懸念 + 金框高亮）」— 那 620ms 裡有約 300ms 是什麼都沒發生的死等（牌 0.32s 就翻完）。
- 龍虎鬥 `9_graded_feedback` 記「PASS（綠/紅 status、中獎金框發光、路紙珠）」— 這正是規格第 11 項「2× 與 500× 同回饋 = FAIL」要擋的形態。
- 龍虎鬥 `10_controls_scoreboard` 記「PASS（籌碼/place/undo/clear/rebet…）」— 只驗了鈕存在，沒驗鎖態，而那三顆鈕結構上無法 disable。

**這使 12 款「已過保真閘」遊戲的第 9/10/11/12 項判定全部不可信**，且後續復刻會繼續量產家族 D/E/G 的同族缺陷。建議把這幾項改成**可程式驗的判準**（例如：結算路徑的獨立 tick 數 ≥2；回饋分支數 ≥3 且門檻可讀；lock 期間注區有 `disabled` 或 `.is-locked`；`grep gset` 必須命中；view 必須導出 `destroy`），否則修完這 78 條，下一輪還會長回來。

---

## 六、覆蓋範圍誠實聲明

**查了什麼**：10 批、25 個遊戲表面（dice / limbo / crash / mines / towers / hilo / pump / picks / keno / duel / cases / 暗影儀式 / pirots / dead-by-noon / golden-toad / gem-storm / 百家 / 輪盤 / 龍虎 / 骰寶 / 安達巴哈 / 幸運轉盤 / 小雞 / 賞金局翻牌+踩地雷 / Slots Battle）。方法是逐行讀碼 + 對照同 repo 內部先例 + node 重跑各檔匯出的純數學（含蒙地卡羅），並對每條做過一次「找反駁證據」的敵對複驗（原始清單有相當比例被駁回或降級，未列入）。

**沒查到的地方（重要）**：
1. **沒有任何 preview 目視**。全部結論來自靜態讀碼與 node 模擬。10 條 PLAUSIBLE 就是「機制已證、觀感未證」那批；即使 CONFIRMED 條目，「玩家實際感受多糟」也未經量測，無使用者測試。
2. **沒有重跑 RTP / 賠付數學驗證**。這輪只針對手感/操作/揭曉時序。撞到的三處數學問題（Crash 結算順序、Gem Storm 的 `CFG.G` 標量、`bounty_mine` client-trust）是順帶，不代表數學面已清。
3. **Cases（instant-cases.js）這一批零存活缺陷** — 它只以「正確對照組」出現（2.6s 滾輪 Promise、histBar、payout 走 `res.done.then`）。可能它真的乾淨，也可能是這批巡檢深度不足，我無法區分。
4. **會員（後端）模式路徑未系統性巡檢**。只在暗影儀式（`playSlotSpin` 讓押注 ± 缺陷退化為 Demo 專屬）、賞金局、Slots Battle 三處被點名；其餘 20 款的會員路徑、以及 Slots Battle 的 **Demo 路徑 `finishLocal`** 都未細查。
5. **真站（live）/ 假站（demo）差異未逐款交叉**。`HL.site` 軸對這些缺陷的放大或抑制效果沒查。
6. **完全未涵蓋**：同仁開發遊戲放置區（`prototype/games/` + dev-kit + registry.json 的社群遊戲）、競技場其他房型（小雞/翻牌之外）、虛擬主播跟注路徑、大廳/錢包/活動等非遊戲畫面。
7. **未涵蓋維護軌的四維**：i18n 覆蓋、自適應/斷點、a11y、token 侵蝕 — 這輪一條都沒查（屬 `/apexwin-maintain` 範圍）。
8. **行號會漂移**：全部行號以巡檢當時的 `master` 工作樹為準；家族 A/B 的修法會大量改動 `core/instant.js` 與各 view，動手前請以 grep 重新定位，不要照抄行號。
9. **原始稽核的行號瑕疵已修正但可能仍有殘留**：複驗中發現十餘處 ±1 行偏移（多在 `core/instant.js`、`components.css`），我已在上文採用複驗後的實際行號，但未逐條再驗第二遍。

---

## 附錄 A — 全 78 條存活缺陷（依 severity → verdict → 遊戲排序）

狀態欄請就地更新：`⬜` 未做 ／ `🏗️` 進行中 ／ `✅` 已修（附 commit）。

| # | 狀態 | Sev | 判定 | 遊戲 | 缺陷 | 檔案:行號 | 家族 | 修 |
|---|---|---|---|---|---|---|---|---|
| 1 | ⬜ | medium | ✔ | 小雞過馬路 (chicken) | 結算後 1.5 秒沒有任何按鈕狀態刷新：「兌現 NT$ 246」仍亮著卻按下無反應，「出發 ▶」也沒回到「出發（押 NT$ 20）」——同一顆鈕的語意已從「免費前進一格」偷偷變成「扣款開新局」 | `prototype/src/views/chicken.js:131-145, :148-151, :221-224, :260-265, :268-269, :288-292, :300-307, :308-313` | stale-control-state | S |
| 2 | ⬜ | medium | ✔ | 百家樂 / 輪盤 / 龍虎鬥 | 輸贏回饋零分級：同花和 51× 與 2× 拿到一模一樣的一行綠字＋固定金框；slot.js 已有 big/mega/epic 三級覆蓋層＋count-up 但沒抽成共用 | `prototype/src/views/table-dragon-tiger.js:150-152、table-roulette.js:141-143、table-baccarat.js:192-194；prototype/src/views/slot.js:446-464；prototype/src/styles/components.css:2235、2297、2670` | flat-feedback | M |
| 3 | ⬜ | medium | ✔ | 百家樂 / 輪盤 / 龍虎鬥（+ sicbo / andar-bahar / moneywheel） | 鎖定期間注區與 清除/復原/重押 仍可點、有 :active 下壓回饋但靜默失效；controls() 只回傳 dealBtn ⇒ 6 款桌遊結構上無法 disable 它們 | `prototype/src/core/table.js:39-47、:90-99；prototype/src/views/table-baccarat.js:129-133、:170；prototype/src/styles/components.css:2224-2225、2286-2287` | missing-control | S |
| 4 | ⬜ | medium | ✔ | 百家樂 Baccarat | 發牌不是 閒1→莊1→閒2→莊2（閒莊平行同時落牌），第三張與前兩張同一波（0.24s）出現、點數卻要等到 ~890ms 才顯示 | `prototype/src/views/table-baccarat.js:148-156、:174-184、:197；prototype/src/styles/components.css:2211-2212` | missing-staged-reveal | M |
| 5 | ⬜ | medium | ✔ | 百家樂 Baccarat | 百家樂沒有路單：只有一排 18 顆單行 bead、不記對子，缺珠盤路/大路（大眼仔、小路、曱甴路） | `prototype/src/views/table-baccarat.js:118、:163-166、:226；prototype/src/core/ui.js:346-365` | missing-control | L |
| 6 | ⬜ | medium | ✔ | 暗影儀式 Shadow Ritual (slot.js) | 免費遊戲觸發沒有硬轉場：mode／背景／儀式條／符號池在「同一注的連爆中途」翻轉，訊息宣告 5×5 但盤面仍是 4 列 | `prototype/src/views/slot.js:342 / :333 / :416-417 / :285-286 / :216 / :167 / :211 / :331` | mid-round-state-flip | M |
| 7 | ⬜ | medium | ✔ | 暗影儀式 Shadow Ritual (slot.js) | 餘額不足時沒有停掉自動旋轉：st.auto 殘留成殭屍計數，日後手動按一次旋轉會自動接續剩下的局數 | `prototype/src/views/slot.js:469 / :473 / :493 / :522-528 / prototype/src/core/instant.js:119` | missing-control | S |
| 8 | ⬜ | medium | ✔ | 暗影儀式 Shadow Ritual (slot.js) | 連爆節奏固定 2.57 秒／段且無 Turbo、無快速旋轉、無略過；連平台自家「極速模式（全遊戲生效）」設定都不讀 | `prototype/src/views/slot.js:426 / :425 / :424 / :423 / :236 / :364 / :491 / :327 / :454 / prototype/src/views/game-frame.js:79,96 / prototype/src/core/instant.js:18,100,131` | pacing-no-turbo | M |
| 9 | ⬜ | medium | ✔ | 暗影儀式 Shadow Ritual (slot.js) | 「自動旋轉 ×10」實際跑 11 局：啟動那一局沒被計數，計數器顯示的剩餘數永遠少 1 | `prototype/src/views/slot.js:565-566 / :493 / :525-526 / :505 / :515` | off-by-one-control | S |
| 10 | ⬜ | medium | ✔ | 骰寶 Sic Bo | 骰寶整局只有一個 680ms setTimeout：揭骰＋亮贏區＋派彩＋文字＋歷史＋清籌碼＋解鎖全塞同一同步 block | `prototype/src/views/table-sicbo.js:157-181 (單一 setTimeout 於 167，body 168-180)` | flat-single-tick-round | M |
| 11 | ⬜ | medium | ✔ | 骰寶 Sic Bo / 安達巴哈 / 幸運轉盤（共用 HL.table） | 派彩與清空全部籌碼同一 task：沒有先掃輸家再付贏家，且只給總淨額、無逐注區列賠 | `prototype/src/core/table.js:66-72; table-sicbo.js:173+179; table-andar-bahar.js:169+175; table-moneywheel.js:239+244` | flat-settlement-no-sweep | M |
| 12 | ⬜ | medium | ✔ | 骰寶 Sic Bo / 安達巴哈 / 幸運轉盤（共用 HL.table） | 「停止下注」只是 JS 閉包旗標：注區仍有 hover/active 抬起、點擊被靜默吞掉、清除/復原/重押仍可按但無反應 | `prototype/src/core/table.js:39-45, 108; table-sicbo.js:159; table-moneywheel.js:206; table-andar-bahar.js:145; prototype/src/styles/components.css:2349-2350` | missing-lock-visual | S |
| 13 | ⬜ | medium | ✔ | 骰寶 Sic Bo / 幸運轉盤 Money Wheel | 輸贏回饋完全不分級：180:1 圍骰、60:1 總點、×7 乘數大獎與 1:1 小勝共用同一行狀態文字、同一個 is-win，金額不做 roll-up | `table-sicbo.js:173-177; table-moneywheel.js:239-242; prototype/src/views/slot.js:446-464` | flat-feedback-no-tiering | M |
| 14 | ⬜ | medium | ✔ | 賞金局 · 踩地雷 (bounty) | 「兌現」在 0 格就已解鎖且 mineMult 從 0 起算 ⇒ 開局誤按一下＝x0.00 直接輸掉整注並吃掉一次挑戰次數，同專案的 Mines 明文禁止這件事 | `prototype/src/views/bounty.js:198, :229, :249, :252-257, :186-195; prototype/src/views/instant-crash-mines.js:189; prototype/src/views/chicken.js:135` | missing-control | S |
| 15 | ⬜ | medium | ✔ | 賞金局 (bounty) | 整檔狀態都放模組全域、且沒有任何 timer 取消或世代閘 ⇒ 離開房間後殘留的揭示/結算計時器會對「下一間房」動手：結算卡長進新房、新房次數與賞金池被扣、翻牌房被畫成踩地雷房 | `prototype/src/views/bounty.js:16-20, :43, :67, :104-119, :151, :154-163, :217, :245, :257, :273-284; prototype/src/main.js:74-86; prototype/src/views/vsslot.js:49; prototype/src/views/chicken.js:58` | stale-timer | M |
| 16 | ⬜ | medium | ✔ | 龍虎鬥 Dragon Tiger | 龍/虎兩張牌在同一 tick 同時翻開（renderCard 無 animation-delay），0.32s 就能讀出勝負，卻要空等到 620ms 才結算 | `prototype/src/views/table-dragon-tiger.js:111-117、:137-138、:141-155；prototype/src/styles/components.css:2211` | missing-staged-reveal | S |
| 17 | ⬜ | medium | ✔ | Dead By Noon 正午對決 | 乘數徽章只在 mult>1 時更新、沒有回設，會把上一拍的 ×12 留在實際只乘 ×1 的 cascade 上 | `prototype/src/views/slot-dead-by-noon.js:214, prototype/src/views/slot-dead-by-noon.js:201, prototype/src/views/slot-dead-by-noon.js:216` | stale-hud | S |
| 18 | ⬜ | medium | ✔ | Dice / Limbo | 極速模式對 dice/limbo 的揭曉閘門完全無效：答案在點擊瞬間就寫出，卻要空等 300/620ms 才給輸贏回饋；手動模式永遠拿不到 Turbo | `prototype/src/views/instant-games.js:124,135,175,184 · prototype/src/core/instant.js:18,91,121,131,172,175 · prototype/src/views/game-frame.js:79` | flat-feedback | S |
| 19 | ⬜ | medium | ✔ | Dice / Limbo | 回合已 commit 的參數在動畫進行中仍可被改動，勝負區/賠率即時跟著變，揭曉那刻畫面判定與實際結算互相矛盾 | `prototype/src/views/instant-games.js:102,110,113,114,115,122,132,163,170,174` | no-commit-lock | S |
| 20 | ⬜ | medium | ✔ | Dice / Limbo（共用 betPanel） | 自動下注執行中「下注金額」輸入框與 ½/2×/Max 仍可操作且被程式反覆改寫，玩家打的字會被當成真注額 commit | `prototype/src/core/instant.js:45,49,50,51,115,118,127` | no-commit-lock | S |
| 21 | ⬜ | medium | ✔ | Dice / Limbo（共用 betPanel） | 按「停止」會在上一局動畫還在飛時就解鎖手動下注鈕，而揭曉計時器與 count-up 都不可取消 → 兩局重疊、數字被舊局蓋掉 | `prototype/src/core/instant.js:86,91,109,121-122 · prototype/src/views/instant-games.js:127,129,177,178` | stale-timer | M |
| 22 | ⬜ | medium | ✔ | gem-storm | tumble 連鎖缺少「消除」中間影格：上一鎖的中獎高亮還亮著，下一鎖的完整新盤就直接取代，玩家數不出連了幾鎖 | `prototype/src/views/slot-gem-storm.js:91, :93, :111, :113, :185-186；對照 prototype/src/views/slot-dead-by-noon.js:131, :214, :216 與 prototype/src/views/slot-pirots.js:183` | missing-cascade-beat | M |
| 23 | ⬜ | medium | ✔ | gem-storm | 免費遊戲 retrigger 完全沒有任何回饋：runFS 回傳的 retrig 從未被 render 使用，轉數分母還延後一轉才悄悄變大 | `prototype/src/views/slot-gem-storm.js:98, :99, :103, :220` | flat-feedback | S |
| 24 | ⬜ | medium | ✔ | golden-toad | Hold & Win 重旋期間非鎖定格是永久空白，沒落到金幣的那次重旋渲染出「與前一影格幾乎逐格相同」的畫面 —— 該類型最核心的張力被做成靜態 | `prototype/src/views/slot-golden-toad.js:208, :212, :214, :172, :101-102；prototype/src/styles/components.css:3087` | wrong-genre | M |
| 25 | ⬜ | medium | ✔ | golden-toad + gem-storm | 最終結果盤面在派彩結算之前就被固定種子的待機盤面抹除，玩家永遠看不到自己中獎的那個盤 | `prototype/src/views/slot-golden-toad.js:225-231, :180；prototype/src/views/slot-gem-storm.js:232-238, :176；prototype/src/core/instant.js:71-83` | result-erased-before-settle | S |
| 26 | ⬜ | medium | ✔ | golden-toad + gem-storm | 完全沒有轉輪/落定階段：最終盤面一次全部現形，逐欄停輪不存在，cell 上宣告的 transition 因每格重建而是死碼 | `prototype/src/views/slot-golden-toad.js:195-197, :158；prototype/src/views/slot-gem-storm.js:186, :160；prototype/src/styles/components.css:3085, 3087-3088, 3109, 3112；對照 prototype/src/views/slot.js:299-327` | missing-spin-phase | L |
| 27 | ⬜ | medium | ✔ | hilo | Hilo 0.35s 翻牌揭曉純裝飾：勝負色/倍數/歷史都在動畫起始同一 frame 寫完，且揭曉期間不鎖猜測鈕，連點可把整張牌的揭曉砍掉 | `prototype/src/views/instant-hilo.js:104-119（guess 全同步）／:75 paintCard／:93-94 refreshGuess／prototype/src/styles/components.css:2811-2812` | no-commit-lock | M |
| 28 | ⬜ | medium | ✔ | Keno 賓果彩 (keno) | Keno 新一局揭曉期間，倍數／派彩／狀態列仍掛著上一局的結果（含綠色中獎字樣） | `prototype/src/views/instant-keno.js:122-137（start 開局段，只呼叫 128 clearMarks）、89（clearMarks 只移除 is-ball/is-hit）、66-68（multEl/winEl/statusEl 宣告）、146（揭曉中 hitsEl 寫裸數字）、151-157（收尾才改寫 hitsEl/multEl/winEl/statusEl）` | stale-scoreboard | S |
| 29 | ⬜ | medium | ✔ | Keno 賓果彩 (keno) + Dice Duel 骰子對決 (dice-duel) | Keno / Dice Duel 在揭曉動畫開始前就把派彩寫進頁首錢包 ⇒ 可見餘額先洩漏結果 | `prototype/src/views/instant-keno.js:129+136（扣注與入帳）、141-150（入帳之後才開始 90ms/球揭曉）、148；prototype/src/views/instant-duel.js:99（入帳）、106（其後才排 800ms 演出）；prototype/src/core/instant.js:16（setBal→refreshChrome）；prototype/src/layout/app-shell.js:37-41（refreshWalletPill 寫 #ax-wallet-amount）、65（#ax-wallet-amount 在 header 內）、671-673（header 與 #ax-main-content 同層、只建一次）、692-699（mountView 只清 #ax-main-content）、701-702（refreshChrome 首件事＝refreshWalletPill）` | pre-reveal-payout-leak | M |
| 30 | ⬜ | medium | ✔ | Mines | 踩雷收局只翻出地雷、不翻出剩下的鑽石；兌現收局卻兩者都翻 ⇒ 輸的那次揭曉是殘缺的 | `prototype/src/views/instant-crash-mines.js:167,152,192;對照 prototype/src/views/instant-towers.js:109 與 :136 共用 revealTraps()` | incomplete-reveal | S |
| 31 | ⬜ | medium | ✔ | Pirots 探險 / Dead By Noon（兩款同一缺陷） | renderGrid 每一影格都 clear+重建全部格子，導致 cascade 的「落下」完全沒有位移動畫，整盤符號瞬間換字 | `prototype/src/views/slot-dead-by-noon.js:189, prototype/src/views/slot-pirots.js:143, prototype/src/styles/components.css:3062, prototype/src/views/slot.js:321` | missing-reflow-commit | M |
| 32 | ⬜ | medium | ✔ | Pirots 探險 / Dead By Noon（兩款同一缺陷） | 手動旋轉與買入 FS 一律 turbo:false，全站「極速模式」對這兩款完全無效，且無跳過/中止出口 | `prototype/src/core/instant.js:91, prototype/src/views/slot-pirots.js:235, prototype/src/views/slot-dead-by-noon.js:258, prototype/src/views/game-frame.js:79` | missing-control | M |
| 33 | ⬜ | medium | ✔ | towers | Towers 兌現的勝利光環 is-win 加上去後永不移除，之後每一局（含輸局）整座塔都亮著綠色勝利框 | `prototype/src/views/instant-towers.js:136（唯一 add）／instant-towers.js:71-84 buildTower／prototype/src/styles/components.css:1167` | stale-visual-state | S |
| 34 | ⬜ | medium | ✔ | towers + pump | Towers 登頂／Pump 撐到極限的專屬慶祝文字在同一 task 內被 cashOut 覆寫＝死碼，最高張力點的回饋與「爬 1 層就兌現」完全相同 | `prototype/src/views/instant-towers.js:116 + :135／prototype/src/views/instant-pump.js:101 + :122` | missing-climax-feedback | S |
| 35 | ⬜ | low | ✔ | 百家樂 / 輪盤 / 龍虎鬥（共用 HL.table，實際 6 款） | 按「重押」後再按「復原」會一次刪掉整個注區的全額（而非退一顆籌碼、也不是取消整批重押） | `prototype/src/core/table.js:46-53、:42、:44、:31` | missing-control | S |
| 36 | ⬜ | low | ✔ | 幸運轉盤 Money Wheel | Money Wheel 指針是從不被動畫的靜態三角形、輪面上沒有任何釘（peg/flapper） | `table-moneywheel.js:148, 133-141, 192-193; prototype/src/styles/components.css:2414-2419` | missing-genre-signature | M |
| 37 | ⬜ | low | ✔ | 賞金局 · 踩地雷 (bounty) | 把全部安全格翻完之後沒有任何終局：不自動兌現、不提示、盤面就這樣掛著等玩家自己想起要按兌現 | `prototype/src/views/bounty.js:199-200, :207-222; prototype/src/views/instant-crash-mines.js:170` | missing-terminal-state | S |
| 38 | ⬜ | low | ✔ | Crash X | 自動兌現倍數在 start() 時只讀一次、局中輸入框沒被鎖 ⇒ 玩家在爬升途中改的數字是無效的假控件 | `prototype/src/views/instant-crash-mines.js:56,97,111,122` | missing-control | S |
| 39 | ⬜ | low | ✔ | Dice Duel 骰子對決 (dice-duel) | Dice Duel 平手重擲整段被吞掉：resolve() 回傳的 ties 從未被讀，資訊列卻對玩家宣告「平手重擲」 | `prototype/src/views/instant-duel.js:33-37（resolve 內 do/while 重擲並回傳 ties）、95（呼叫端只取 res.you/res.oth/res.win）、125（gameInfoBar note:「平手重擲」）、47（rnd→HL.fair.floatOr）、67（histBar fair:true）；prototype/src/core/fair.js:96-102（每次 float 都 unshift 進 history 並 nonce++）、138-141（面板列出近 8 筆「game #nonce 浮點值」）、210+215（PF_GAMES 含 dice-duel ⇒ 🔒 入口存在）；prototype/src/core/ui.js:353（fair 藥丸點擊開 fairnessModal）` | hidden-round-step | S |
| 40 | ⬜ | low | ✔ | golden-toad + gem-storm | ⚙ 遊戲設定的「極速模式」對這兩款的旋轉動畫無效，且手動遊玩沒有任何速度控件（ctx.turbo 只有 autobet 會傳） | `prototype/src/views/slot-golden-toad.js:185；prototype/src/views/slot-gem-storm.js:199；prototype/src/core/dom.js:158；prototype/src/core/instant.js:18, :91（他寫 :92）, :121（他寫 :132）, :131；prototype/src/views/game-frame.js:79` | missing-control | S |
| 41 | ⬜ | low | ✔ | hilo | Hilo「同點算輸」這條非直覺房規觸發時毫無專屬回饋：與方向猜錯共用同一句「💥 猜錯」 | `prototype/src/views/instant-hilo.js:109（嚴格比較）／:117（通用敗訊）／:78 pushHist` | flat-feedback | S |
| 42 | ⬜ | low | ✔ | Keno 賓果彩 (keno) | Keno「隨機選號」先清空既有選號且固定只選 5 個 ⇒ 一鍵把 10 星注型降成 5 星、賠付表整張換掉且無法還原 | `prototype/src/views/instant-keno.js:96-106（quickPick）、98（無條件 clearAll()）、100（`for (var p = 0; p < 5; p++)` 硬寫 5）、90-95（clearAll 清 picked/pickCount 與 is-sel）、105→109-118（renderPay 依新 pickCount 重畫賠付表）、70（按鈕僅寫「隨機選號」）` | destructive-control | S |
| 43 | ⬜ | low | ✔ | Mines | 「下一格」計分板在翻完最後一個安全格時顯示 Infinity×，並留在畫面上直到下一局 | `prototype/src/views/instant-crash-mines.js:148,29,170,157,204,152` | scoreboard-garbage | S |
| 44 | ⬜ | low | ✔ | Pirots 探險 | 未開局的靜態擺設盤含 2 組「按遊戲自己的規則必定要被收集」的 ≥6 同色連通群，且固定種子＝每次載入都一樣 | `prototype/src/views/slot-pirots.js:158, prototype/src/views/slot-pirots.js:59` | illegal-resting-state | S |
| 45 | ⬜ | low | ✔ | Pirots 探險 / Dead By Noon（兩款同一缺陷） | 買入 FS 的回合繞過 betPanel.settle()，面板的「上一局」計分板不會反映買入結果 | `prototype/src/views/slot-dead-by-noon.js:259, prototype/src/core/instant.js:78, prototype/src/views/slot-pirots.js:236` | flat-feedback | S |
| 46 | ⬜ | low | ✔ | pump | Pump 爆裂動畫 keyframes 假設氣球在 scale(1)，實際 inline transform 可達 scale(1.99)：💥 先縮小、0.4s 後彈回膨脹尺寸並停住 | `prototype/src/views/instant-pump.js:85-86（inline scale）／:94-97（爆裂路徑提前 return）／prototype/src/styles/components.css:156 與 :158` | stale-visual-state | S |
| 47 | ⬜ | low | ✔ | towers | Towers 登頂後 HUD「下一層」停在不存在的第 9 層倍數（同檔家族的 Pump 同位置有做極限處理＝反證漏寫） | `prototype/src/views/instant-towers.js:65（refreshMult 的 nextEl）／:114-116（登頂路徑）／對照 prototype/src/views/instant-pump.js:81` | scoreboard-lies | S |
| 48 | ⬜ | low | ✔ | towers + hilo + pump | 「兌現」鈕在開局瞬間就 enabled，但此時點下去 100% 被拒並吐 warn toast — 主 CTA 的可用狀態與實際可用性不符（三檔同一寫法） | `prototype/src/views/instant-towers.js:128 與 :133／prototype/src/views/instant-hilo.js:128 與 :134／prototype/src/views/instant-pump.js:115 與 :120` | lying-control-state | S |
| 49 | ⬜ | low | ? | 小雞過馬路 (chicken) | 死亡演出的三段 setTimeout 沒有 epoch 世代閘（同檔每一個 RPC 回呼都有）⇒ 離開再進來，全新一局還沒下注就自己燒死並彈出「小雞陣亡 · 輸掉」；playDeath 取 lanes[-1] 讓「撞車」靜默降級成「火燒」 | `prototype/src/views/chicken.js:216-219, :234-239, :240-241, :246, :260-265, :58, :163, :191, :199, :273, :350; prototype/src/main.js:51` | stale-timer | S |
| 50 | ⬜ | low | ? | 暗影儀式 Shadow Ritual (slot.js) | 沒有停輪期待感（anticipation）：停輪時長只由輪索引決定，開獎盤面已知卻不用來製造張力 | `prototype/src/views/slot.js:323 / :483-487 / :327` | missing-tension | M |
| 51 | ⬜ | low | ? | 輪盤 Roulette | 開號瞬間輪面彈回起始角度：axRouSpin 只有 to{rotate(360deg)}、fill-mode 為 none，class 一移除 transform 立刻歸零 | `prototype/src/views/table-roulette.js:136-138、:58；prototype/src/styles/components.css:2630-2636、2643-2644` | animation-end-not-committed | S |
| 52 | ⬜ | low | ? | ApexWin Picks 賽事預測 (picks) | Picks 每下一單就把沒下注的另外兩場賽事也整批重生，且無 rebet、無局內歷史帶 | `prototype/src/views/instant-picks.js:180-182（slate = makeSlate(); sel = null; 重繪）、67（makeSlate 每次產 3 場全新 fixture）、60-66（makeFixture 隨機隊名/機率）、82（record→HL.liveStats.record("picks",...)）；對照 prototype/src/views/instant-duel.js:67 與 prototype/src/views/instant-cases.js:72（都有 histBar）；prototype/src/core/live-stats.js:57（→HL.betlog.record）；prototype/src/core/betlog.js:47-56（逐局落地 game/bet/win/倍數/淨額/clientSeed/nonce）` | state-churn | S |
| 53 | ⬜ | low | ? | Crash X | Crash/Mines 沒有自動下注／Turbo（自帶 amountField 而非 betPanel），只有一個自動兌現倍數 | `prototype/src/views/instant-crash-mines.js:46,56,133；prototype/src/core/instant.js:95-134（autobet）、:21-34（熱鍵）、:149（hkPanel 只由 betPanel 指派）、:154-167（amountField）` | missing-control | L |
| 54 | ⬜ | low | ? | Dice | Dice 指針在點擊當下就被設到落點：正常動效 100ms 走完 87%、關動效直接瞬移＝答案先出來，300ms 後才給輸贏回饋 | `prototype/src/views/instant-games.js:124-135 · prototype/src/styles/components.css:1095,2945-2947` | premature-reveal | M |
| 55 | ⬜ | low | ? | Dice Duel 骰子對決 (dice-duel) | Dice Duel 雙方點數在同一 tick 同時揭曉、勝負光暈與結論同時出現 | `prototype/src/views/instant-duel.js:103-105（先進「擲骰中…」+ is-rolling + 「?」）、106（單一 800ms setTimeout）、107-113（同 tick 移除 is-rolling／寫兩個分數／掛 is-winner／is-loser／寫結論）` | flat-feedback | S |
| 56 | ⬜ | low | ? | Pirots 探險 | 對玩家宣稱的「鳥收集寶石」機制在畫面上不存在：無收集者實體、無每色進度 | `prototype/src/views/slot-pirots.js:253, prototype/src/views/slot-pirots.js:49, prototype/src/views/slot-pirots.js:141` | wrong-genre | S |
| 57 | ⬜ | low | ? | pump | Pump「打氣 +」同一顆按鈕重複點擊推進風險，卻無 commit lock／去抖：雙擊＝兩次爆裂判定連跑 | `prototype/src/views/instant-pump.js:92-104（pump 全同步）／:115 與 :90（disabled 只在 start/endLock 切換）／prototype/src/styles/components.css:155` | no-commit-lock | S |
| 58 | ⬜ | high | ✔ | 安達巴哈 Andar Bahar | 安達巴哈發牌節奏被「總時長固定 1600ms」倒著壓縮：局面越長（越懸疑）每張牌反而越快 | `prototype/src/views/table-andar-bahar.js:151 (+157-163, 176); prototype/src/styles/components.css:2211` | inverted-tension-pacing | S |
| 59 | ⬜ | high | ✔ | 百家樂 / 輪盤 / 龍虎鬥（實際影響全部 6 款 HL.table 桌遊） | settle() 一次性總額 setBal，且同一 task 內 area.clear() 把中獎與落敗籌碼同時抹掉 —— 無「先掃輸家再付贏家」、無逐項結算 | `prototype/src/core/table.js:66-72；prototype/src/views/table-baccarat.js:189-196、table-roulette.js:140-145、table-dragon-tiger.js:148-154` | flat-feedback | M |
| 60 | ⬜ | high | ✔ | 幸運轉盤 Money Wheel | Money Wheel 命中乘數段（招牌高潮）只有 120ms 舞台時間，×N 徽章淡入到 60% 轉盤就重轉 | `prototype/src/views/table-moneywheel.js:214, 215-229 (218-220, 224-227); prototype/src/styles/components.css:2428` | missing-tension-beat | S |
| 61 | ⬜ | high | ✔ | 暗影儀式 Shadow Ritual (slot.js) | 押注 ± 在旋轉／連爆／免費遊戲全程無鎖，改注會改變「已付款那一注」剩餘連爆與整輪免費遊戲的結算基準 | `prototype/src/views/slot.js:603 / :410 / :419 / :479-480 / prototype/src/styles/components.css:1609,1611` | no-commit-lock | S |
| 62 | ⬜ | high | ✔ | 暗影儀式 Shadow Ritual (slot.js) | ⭐ 購買功能鈕在旋轉／連爆進行中仍可點，買入立刻扣款並把進行中回合的 mode/roundWin/rows 當場清掉 | `prototype/src/views/slot.js:601 / :521 / :552-559 / :467 / :491-492` | no-commit-lock | S |
| 63 | ⬜ | high | ✔ | 暗影儀式 Shadow Ritual (slot.js) | 離開遊戲不取消任何計時器：自動旋轉／免費遊戲鏈在背景繼續扣款，結算 modal 蓋到大廳 | `prototype/src/views/slot.js:491-493 / :505 / :509 / :515 / :665 / prototype/src/layout/app-shell.js:692-699 / prototype/src/main.js:75` | stale-timer | M |
| 64 | ⬜ | high | ✔ | 賞金局 · 踩地雷 (bounty) | 會員模式的踩地雷根本不是踩地雷：一次 RPC 就把整局開完，12 格盤面與「兌現」鈕變純裝飾；而且 RPC 在途中點格子會用 render 時就配好的舊雷圖跑客端結算 ⇒ 同一次挑戰被結算兩次 | `prototype/src/views/bounty.js:230-250, :201, :204-226, :210-217, :186-195; prototype/src/views/instant-crash-mines.js:161-171, :184, :189` | wrong-genre | M |
| 65 | ⬜ | high | ✔ | 賞金局 · 翻牌 (bounty) | 開局 RPC 在途期間「開始挑戰」按鈕仍留在 DOM 且可按 ⇒ 連點兩下送出兩次 bounty_flip，扣兩次費用、兩條揭示鏈互踩同一組模組全域 | `prototype/src/views/bounty.js:91-98, :122-126, :38-42, :73, :85, :103-119, :232-233; prototype/src/views/chicken.js:138, :161-163; docs/supabase-phase7.sql:249-266` | no-commit-lock | S |
| 66 | ⬜ | high | ✔ | 輪盤 Roulette (european-roulette) | 輪盤沒有球、輪面旋轉角度與開號無關：2200ms 等速轉＋中央 Math.random 亂跳，結果只是 textContent 瞬間替換 | `prototype/src/views/table-roulette.js:58, :128-138, :146；prototype/src/styles/components.css:2630-2645` | wrong-genre | L |
| 67 | ⬜ | high | ✔ | ApexWin Picks 賽事預測 (picks) | Picks 整局零階段：settle() 從扣注到重生賽程全在同一個同步 task，沒有任何「開賽中」揭曉相位 | `prototype/src/views/instant-picks.js:152-183（settle 全文）、157（busy=true）、181（busy=false）、158+164（兩次 setBal 同 task）、79（按鈕「下單開賽」）、80（「開賽後見真章」）` | wrong-genre | M |
| 68 | ⬜ | high | ✔ | Crash X | 自動兌現只在 60ms tick 上求值、且 bust 檢查排在它前面 ⇒ 崩盤點高於目標的回合仍被判輸 | `prototype/src/views/instant-crash-mines.js:96,103,107-111（bust 檢查在 108、autoTarget 檢查在 111）；對照純數學 :22` | wrong-resolution-order | S |
| 69 | ⬜ | high | ✔ | Crash X | 兌現當下就 clearInterval 結束回合 ⇒ 少了 crash 類型最核心的「看它後來飛到哪」揭曉，歷史籌碼卻馬上貼出玩家沒看到的崩盤倍數 | `prototype/src/views/instant-crash-mines.js:89,71,80,60,54,119；HL.ui.histBar 於 prototype/src/core/ui.js:346-364` | wrong-genre | M |
| 70 | ⬜ | high | ✔ | Dead By Noon 正午對決 | 招牌機制「乘數彈膛」的數字每次 cascade 全部重抽：同一顆 🎯 沿路數字亂跳，而且落盤當下不揭曉 | `prototype/src/views/slot-dead-by-noon.js:126, prototype/src/views/slot-dead-by-noon.js:104, prototype/src/views/slot-dead-by-noon.js:214` | wrong-genre | M |
| 71 | ⬜ | high | ✔ | Dice / Limbo（共用 HL.instant.betPanel） | 自動下注沒有卸載鉤：離開遊戲頁後迴圈仍持續扣款派彩，且每進一款遊戲就多疊一個並行迴圈 | `prototype/src/core/instant.js:109,116-133,143 · prototype/src/main.js:74-77 · prototype/src/layout/app-shell.js:692-695` | no-teardown-stale-timer | S |
| 72 | ⬜ | high | ✔ | gem-storm | 免費遊戲「總贏分」計分板從不套 CFG.G=2.30，且每轉重置累加器 → 數字會倒退，最終顯示值只有實付的 1/2.3 | `prototype/src/views/slot-gem-storm.js:189, :190, :221, :226-227, :102, :115` | scoreboard-desync | S |
| 73 | ⬜ | high | ✔ | golden-toad + gem-storm | 購買 bonus 按鈕與 betPanel 沒有共用回合鎖，可讓兩局動畫同時跑在同一個 board / badge / history 上 | `prototype/src/views/slot-golden-toad.js:239, :226, :230, :245；prototype/src/views/slot-gem-storm.js:245, :233, :237, :251；prototype/src/core/instant.js:86（他寫 :88，應為 :86）, :131（他寫 :135，應為 :131）, :30（熱鍵，他寫 :31）` | no-commit-lock | M |
| 74 | ⬜ | high | ✔ | Limbo | Limbo 崩盤倍數從「上一局的倍數」內插而不是從 1.00× 爬升，一半的局數是倒數下來 | `prototype/src/views/instant-games.js:158,175,177 · prototype/src/core/instant.js:180` | wrong-genre | S |
| 75 | ⬜ | high | ✔ | Mines | revealRestSafe() 的 30ms 階梯 setTimeout 沒有被取消，兌現後 0.66 秒內開新局會把 💎/is-open 畫到新棋盤上，那些格子從此點不動 | `prototype/src/views/instant-crash-mines.js:153,192,152,183,162,194；對照 prototype/src/views/instant-towers.js:93-99` | stale-timer | S |
| 76 | ⬜ | high | ✔ | Pirots 探險 / Dead By Noon（兩款同一缺陷） | 「購買免費遊戲」與主旋轉鈕/空白鍵熱鍵之間沒有互鎖，兩個回合會同時演在同一個 board 上 | `prototype/src/views/slot-dead-by-noon.js:252, prototype/src/views/slot-pirots.js:228, prototype/src/core/instant.js:86, prototype/src/core/instant.js:131` | no-commit-lock | S |
| 77 | ⬜ | high | ✔ | Slots Battle (vsslot) | 會員模式下 10 輪對戰動畫是客端 RNG、勝負卻由伺服器另一組 RNG 決定，最後一刻把總分整批覆蓋 ⇒ 玩家看的過程與結果毫無因果 | `prototype/src/views/vsslot.js:175, :248-259, :261, :205, :221; prototype/src/core/api.js:63-68; docs/supabase-phase7.sql:133-140` | wrong-source-of-truth | L |
| 78 | ⬜ | high | ✔ | Slots Battle (vsslot) | 賭注全場都沒有硬性 commit：加入現成房不預扣、只有 finish() 才動餘額，而對戰畫面還大方擺著「‹ 返回競技場」⇒ 落後就走，零成本逃單 | `prototype/src/views/vsslot.js:117-130, :138, :51, :181, :241, :243; prototype/src/views/arena.js:112, :132-135, :88-89, :619` | no-commit-lock | M |

## 附錄 B — 逐條重現路徑（附錄 A 的同序號）

**1. 小雞過馬路 (chicken) — 結算後 1.5 秒沒有任何按鈕狀態刷新：「兌現 NT$ 246」仍亮著卻按下無反應，「出發 ▶」也沒回到「出發（押 NT$ 20）」——同一顆鈕的語意已從「免費前進一格」偷偷變成「扣款開新局」**（medium／CONFIRMED／S／家族 stale-control-state）
- 位置：`prototype/src/views/chicken.js:131-145, :148-151, :221-224, :260-265, :268-269, :288-292, :300-307, :308-313`
- 重現：押 20、走 3 格、按「兌現」→ toast「兌現獲得 NT$ 246」。此後 1.5 秒內：(a) 連按旁邊的「兌現 NT$ 246」數次，毫無反應也毫無提示；(b) 主鈕仍寫「出發 ▶」（不是「出發（押 NT$ 20）」），玩家以為是繼續前進而按下 → 立刻被扣 20 開新局，畫面上的兌現慶祝文字與 is-cash 動畫瞬間被新道路覆蓋。
- 複驗依據：行號全部精確，我從程式把整條時序走完：survive()(:221-224) → setBusy(false) → updateButtons(:131-144) 留下的狀態是 goBtn.disabled=false / textContent="出發 ▶"（因 st.active 為真）、canCash=true ⇒ cashBtn.disabled=false / text="兌現 NT$ X"。玩家按兌現 → cashout(:268) 通過 → cashLocal(:288-292) → celebrate(:300-307) 只改 status/toast/fx/st.active=false，afterDeath(:260-265) 同樣，兩者都沒呼叫 updateButtons，要等 1.5 秒後的 resetRound(:311) 才刷新。於是那 1.5 秒內：(a) cashBtn 仍是可按外觀，按下去被 cashout 第一列 `if (!st.active ／／ st.step < 1 ／／ st.busy) return`(:269) 靜默吃掉＝死控件、無任何提示；(b) goBtn 仍寫「出發 ▶」，但 go()(:148-151) 走 `st.active ? doStep() : startRound()` 的 else 支 ⇒ 直接用 betInput 舊值扣款開新局，beginRound() 還會立刻 buildRoad() 把慶祝畫面抹掉。同一顆鈕在兩個回合狀態下語意相反而外觀完全相同，屬規格第 12 項（控件狀態）與第 11 項（回饋分級）的缺陷，100% 每局發生。會員路徑因 setBusy(true) 而免疫，但 Demo 正是主要展示路徑。死亡後同樣中彈（剛陣亡就按「出發 ▶」＝立刻再扣一注）。

**2. 百家樂 / 輪盤 / 龍虎鬥 — 輸贏回饋零分級：同花和 51× 與 2× 拿到一模一樣的一行綠字＋固定金框；slot.js 已有 big/mega/epic 三級覆蓋層＋count-up 但沒抽成共用**（medium／CONFIRMED／M／家族 flat-feedback）
- 位置：`prototype/src/views/table-dragon-tiger.js:150-152、table-roulette.js:141-143、table-baccarat.js:192-194；prototype/src/views/slot.js:446-464；prototype/src/styles/components.css:2235、2297、2670`
- 重現：龍虎鬥押「同花和」100 並命中（退 51× ＝淨 +5000）→ 畫面表現與押「龍」100 贏（淨 +100）完全相同：同一個 2px 金框＋16px 發光、同一行綠字，只有數字不同、且數字瞬間出現不滾動。命中 50:1 的情緒曲線是平的。
- 複驗依據：三款贏局回饋確實只有兩件事、且對所有倍率相同：① `spotEls[id].box.classList.add("is-win")` → components.css:2235/:2297 固定 `border-color: var(--ax-gold)!important; box-shadow: 0 0 0 2px …, 0 0 16px …`、:2670 輪盤固定 `outline:3px solid var(--ax-gold)` —— 三條規則內**沒有任何倍率分支**；② statusEl 文字＋`className = "ax-inst__last " + (r.net>=0 ? "ax-green" : "ax-red")`（dragon-tiger:152 / roulette:143 / baccarat:194）＝純二分法。slot.js 的 `function bigWin(amount, x, done)` 實際起於 **:446**（稽核員寫 446-462、實為 446-464），:448 `x>=100?EPIC:x>=40?MEGA:BIG` 三級、:457 `dur = 1400 + Math.min(1600, x*8)` 隨倍率縮放、:462 rAF count-up、:461 點擊略過 —— 而 `grep -rn "ax-bigwin" prototype/src --include=*.js` **只命中 slot.js:449-454**，證實它是 slot.js 內的 local function、未掛上 HL、桌遊接不到。核心也不是「與別家不同」：fidelity-spec 鐵則第 2 條「回饋要分級…2× 和 500× 給一樣的小計數器 = 頭號廉價破綻」、閘第 11 項「2× 與 500× 同回饋 = FAIL」。**一處要縮限**：`grep -rn "new Audio／AudioContext／HL.sfx／playSound" prototype/src --include=*.js` **零命中** ⇒ 全平台沒有任何音效引擎，所以「音效升一階/音 crescendo」不能算桌遊專屬缺陷（是平台級空缺、且不該塞進這張卡）；可證的是「零分級、無 count-up、無覆蓋層」。旁證：games-catalog.json 龍虎鬥 gate_log 把 `9_graded_feedback` 記成「PASS(綠/紅 status、中獎金框發光、路紙珠)」——正是規格判 FAIL 的形態被記成 PASS。

**3. 百家樂 / 輪盤 / 龍虎鬥（+ sicbo / andar-bahar / moneywheel） — 鎖定期間注區與 清除/復原/重押 仍可點、有 :active 下壓回饋但靜默失效；controls() 只回傳 dealBtn ⇒ 6 款桌遊結構上無法 disable 它們**（medium／CONFIRMED／S／家族 missing-control）
- 位置：`prototype/src/core/table.js:39-47、:90-99；prototype/src/views/table-baccarat.js:129-133、:170；prototype/src/styles/components.css:2224-2225、2286-2287`
- 重現：百家樂押 閒 500 → 按「開牌」→ 在「開牌中…」的 890ms 內連點「莊」注區五下：按鈕有 hover 金邊與（baccarat/dt/sicbo/mw/ab）下壓動畫，但籌碼徽章不動、本局總注不變、無任何 toast；再按「重押」「清除」同樣毫無反應也無提示。玩家會以為介面卡住或自己點錯。
- 複驗依據：table.js:40 `if (locked) return false;` 靜默返回，而**緊接的下一行** :41 餘額不足時是 `HL.ui.toast("餘額不足（Demo）","warn")` ——同一函式兩種失敗一種有回饋一種沒有，這對比成立。:44-47 `undo()/clear()/rebet()` 同樣 `if (locked) return;` 靜默。:90-99 `controls()` 把 清除/復原/重押 三顆 button inline 建在陣列裡，`return { node: node, dealBtn: dealBtn }` 確實只回傳 dealBtn。我另外用 grep 把「6 款」這句坐實：`grep -rn "disabled" prototype/src/views/table-*.js` 全部命中只有 `ctrls.dealBtn.disabled`（andar-bahar:145/175、baccarat:170/196、dragon-tiger:131/154、moneywheel:206/244、roulette:125/145、sicbo:159/179），且 6 檔全用 `area.controls(...)` ⇒ 另外三顆鈕確實沒有任何 handle。注區 `spot()` 造的 `<button>` 從不 disable，CSS 也無任何 `.is-locked`/`pointer-events:none` 鎖態樣式。依據 fidelity-spec 鐵則第 3 條「硬性 commit（『停止下注』/spin lock）」與閘第 12 項「玩家控件與計分板齊全」。**一處要修正**：`:active{transform:translateY(1px)}` 只存在於 components.css:2225（.ax-bacc__spot）、:2287（.ax-dt__spot）、:2350（sicbo）、:2439（moneywheel）、:2493（andar-bahar）；輪盤注區（:2654-2668）只有 `:hover{translateY(-1px)}` 與 `transition: transform .08s`，**沒有 :active 規則** ⇒ 「按下去還有下壓動畫」對輪盤不成立、對其餘 5 款成立。核心缺陷不受影響。旁證：games-catalog.json 龍虎鬥 gate_log 把 `10_controls_scoreboard` 記成「PASS(籌碼/place/undo/clear/rebet…)」——只驗了鈕存在，沒驗鎖態。

**4. 百家樂 Baccarat — 發牌不是 閒1→莊1→閒2→莊2（閒莊平行同時落牌），第三張與前兩張同一波（0.24s）出現、點數卻要等到 ~890ms 才顯示**（medium／CONFIRMED／M／家族 missing-staged-reveal）
- 位置：`prototype/src/views/table-baccarat.js:148-156、:174-184、:197；prototype/src/styles/components.css:2211-2212`
- 重現：押「閒」→ 按「開牌」→ 0~0.24s 內 5 張牌（含莊第三張）幾乎一起飛進來，兩側點數欄仍是「–」→ 玩家在點數公布前就知道有人補牌 → 約 0.33s 空白 → 890ms 一次跳出「閒 4 : 6 莊 — 莊贏　輸 500」。中間沒有任何可緊張的段落。
- 複驗依據：table-baccarat.js:148-156 `renderHand(container,cards)` 的 delay 確實用**該手自己的 index**（`(i*0.12).toFixed(2)+"s"`），而 :176-177 `renderHand(playerCards,o.P); renderHand(bankerCards,o.B);` 在同一 tick 連續呼叫 ⇒ 閒1/莊1 同在 t=0、閒2/莊2 同在 t=0.12s，零交替感；第三張（index 2）在 t=0.24s 緊接同一波，無相位分隔、無擠牌（全檔 grep 無任何 squeeze/逐張分段邏輯）。:159 起 `pTotal/bTotal` 從 clearTable 起是 `"–"`，直到 :181 的 `setTimeout(…, revealMs)` 才在 :182 一次寫入；revealMs（:180）＝`250 + max(len)*130 + 250`，三張時 = 890ms，而牌面動畫（components.css:2211 `0.32s`）最晚 0.24+0.32=0.56s 就結束 ⇒ 約 330ms 死等後一次性傾倒點數＋is-win＋結算。玩家能在 0.24s 從牌數看出「有人補牌」＝已知非天牌，而點數欄還是「–」，資訊揭露順序與真牌桌相反。規格依據在專案內部：fidelity-spec TABLE 流程「百家＝下注→各發兩張→天牌檢查→補牌 tableau→比點→含佣結算」與節奏「百家的擠牌（一點一點揭）是整個儀式、瞬間發兩手毀感覺」，劣質破綻明列「零擠牌」。補牌數學本身（:36-73 canonical tableau）是對的，這純粹是揭曉節奏缺陷、不是數學/RTP 問題。

**5. 百家樂 Baccarat — 百家樂沒有路單：只有一排 18 顆單行 bead、不記對子，缺珠盤路/大路（大眼仔、小路、曱甴路）**（medium／CONFIRMED／L／家族 missing-control）
- 位置：`prototype/src/views/table-baccarat.js:118、:163-166、:226；prototype/src/core/ui.js:346-365`
- 重現：連玩 20 局百家樂 → 想看「莊是否連開」決定下一手 → 只看到最新 18 個 P/B/T 擠成一橫排（第 19 局起最舊的直接被丟掉），無法讀連莊長度、無法看對子頻率、沒有大路可讀，只能盲押。
- 複驗依據：行號逐一對得上。table-baccarat.js:118 `HL.ui.histBar({cls:"ax-bacc__history", itemCls:"ax-bacc__bead", max:18, fair:true})`；core/ui.js **:346** 正是 `function histBar(opts)` 起點、**:365** 是 `return { node: box, push: push, clear: … }`（引用精準），其內容確實是一個 flat `<div>`（:349 `el("div",{class:opts.cls})`）＋ :359 `box.insertBefore(pill, box.firstChild)` ＋ :360 `while(box.children.length>max) box.removeChild(box.lastChild)` —— 單列、無列/欄二維結構、無滿欄換欄邏輯。CSS 也坐實：components.css:2244 `.ax-bacc__history{display:flex; flex-wrap:nowrap; overflow:hidden}` ＋ :2245 `.ax-bacc__bead{width:22px;height:22px;border-radius:50%}` ＝一橫排圓珠。:163-166 `pushHistory` 只推 `P/B/T` 單字，`o.pPair/o.bPair` 完全沒進 history（雖然 :191 的結算文字有「· 閒對」），也無和局斜線慣例；:226 整條 hist 塞在標題只有「近況」兩字的一行。依據是專案自訂閘第 12 項明文「路子/珠盤(百家)」與 TABLE 劣質破綻「缺路子/計分板」，不是外部平台比較。

**6. 暗影儀式 Shadow Ritual (slot.js) — 免費遊戲觸發沒有硬轉場：mode／背景／儀式條／符號池在「同一注的連爆中途」翻轉，訊息宣告 5×5 但盤面仍是 4 列**（medium／CONFIRMED／M／家族 mid-round-state-flip）
- 位置：`prototype/src/views/slot.js:342 / :333 / :416-417 / :285-286 / :216 / :167 / :211 / :331`
- 重現：玩到儀式 Lv.4、條差一顆 ❤ 就滿 → 某一注的第 2 段連爆把條推滿 → 畫面「當場」切成 Cursed 背景、儀式條瞬間消失、freeEl 顯示「🔥 Cursed Spins 剩 6」、msg 寫「Cursed Spins：5×5」，但盤面仍在跑同一注的 4 列連爆，且從這一刻起補位不再出現 ❤/L ⇒ 玩家體驗到的是「一注旋轉中途規則被換掉」，而非一段免費遊戲轉場。
- 複驗依據：行號全中，鏈路可逐行走通：processBoard 的連爆迴圈在 416 同步呼叫 addRitual → 333 的 while 迴圈同步呼叫 onLevelUp → 342 當場 `st.mode="cursed"; st.cursed+=6; st.rows=5` 並只發一個 toast＋setMsg，沒有任何暫停/轉場/確認；417 緊接的 refreshHUD() 同一 tick 內執行 284（freeEl→「🔥 Cursed Spins 剩 6」）、285（儀式條 display:none）、286（stage 掛 mode-cursed 背景 class）。同一注剩餘連爆的補位走 216 `drawSym(st.level, st.mode === "cursed", frnd)` → pool(167) 在 cursed 下 `add("S", 0)`、且 lowCount=max(0,5-5)=0 ⇒ 這一注後續再也不可能掉出 ❤ 或任何 L 符號＝已付款那一注的規則中途被換。st.rows=5 只寫進狀態，tumbleAnimate(211) 讀 `st.grid[0].length` ⇒ 盤面整注維持 4 列，而 342 的 setMsg 文字是「Cursed Spins：5×5 · 僅 M+H 符號」。兩點修正/降權：① 那句 5×5 出現在 msgEl(setMsg) 而非 toast，稽核員把 setMsg 說成 Toast；② 「同一注後續儀式點數被靜默丟棄」(331 no-op) 這一小節我認定是設計而非缺陷——node 端鏡像 _addRitual 也刻意寫同一個 guard，且進 FG 後儀式條本就撤掉。扣掉②，主張（沒有硬轉場＋回合中途翻規則）仍站得住，故 CONFIRMED，但降為 medium：無金流損失、屬順序/演出層。

**7. 暗影儀式 Shadow Ritual (slot.js) — 餘額不足時沒有停掉自動旋轉：st.auto 殘留成殭屍計數，日後手動按一次旋轉會自動接續剩下的局數**（medium／CONFIRMED／S／家族 missing-control）
- 位置：`prototype/src/views/slot.js:469 / :473 / :493 / :522-528 / prototype/src/core/instant.js:119`
- 重現：押注 100、餘額約 850 → 按 ↻（自動旋轉 ×10）→ 扣到餘額 <100 時彈「餘額不足」旋轉停住，但 ↻ 鈕仍亮紫並顯示「⏹ N」＝看起來還在待命。之後儲值／領紅利後只想試一注，手動按一次 ⟳ → 該注結束後遊戲自己把剩下的 N 次自動旋轉跑完，扣掉玩家沒同意的 N 注。
- 複驗依據：行號全中且對比極硬。469 逐字是 `if (st.bet > bal()) { HL.ui.toast("餘額不足", "err"); return; }`——不動 st.auto、不呼叫 updateSpinBtn；僅四行之下的 473 負責任博弈閘寫著 `if (HL.rg && !HL.rg.check(st.bet)) { if (st.auto > 0) { st.auto = 0; updateSpinBtn(); } return; }`，且 472 的註解自己就寫「否則 st.auto 會留著假的剩餘次數（同 instant.js:120 的 stopAuto）」＝作者知道這條規則、只補了兩個相鄰閘中的一個。平台慣例也在另一邊：instant.js:119 `if (bet > bal()) { HL.ui.toast("餘額不足，自動停止","warn"); stopAuto(); return; }`（stopAuto 於 109 clearTimeout＋復位按鈕）⇒ slot.js 是唯一沒跟上的。後果可逐行推：鏈死後 st.auto 保持 >0，522-528 讓 autoBtn 維持 is-on＋`⏹<small>N</small>`；日後手動 ⟳ 一注跑完，493 的 `st.mode === "base" && st.auto > 0` 仍成立 → 自動接續剩餘局數。一處修正：稽核員說「必須手動點兩下才復位」不對——toggleAuto(563) 第一次點就 `st.auto = 0; updateSpinBtn(); return`，**一下**即復位。

**8. 暗影儀式 Shadow Ritual (slot.js) — 連爆節奏固定 2.57 秒／段且無 Turbo、無快速旋轉、無略過；連平台自家「極速模式（全遊戲生效）」設定都不讀**（medium／CONFIRMED／M／家族 pacing-no-turbo）
- 位置：`prototype/src/views/slot.js:426 / :425 / :424 / :423 / :236 / :364 / :491 / :327 / :454 / prototype/src/views/game-frame.js:79,96 / prototype/src/core/instant.js:18,100,131`
- 重現：在 ⚙ 遊戲設定勾選「極速模式」（文案寫全遊戲生效）→ 回暗影儀式旋轉：節奏一秒都沒變。觸發一次 1 波愛心＋4 段連爆的旋轉 → 1220+1380+4×2570 ≈ 12.9 秒，期間點畫面任何位置都不能加速或跳過（只有 x≥15 的大獎覆蓋層可點擊略過）。開 6 次 Cursed 免費遊戲、每次 2 段連爆 ≈ 43 秒乾等；自動旋轉 ×10 最壞情況 3~4 分鐘。
- 複驗依據：常數與加總都對：1000(426)+720(425)+320(424)+tumble 430(236)+段間 100(423)=2570ms/段，全部硬編、不隨段數遞減、無任何速度係數；愛心階段 950(364)+430(236)；免費輪間隔固定 800(491)；停輪 (0.7+4*0.1)*1000+120=1220ms(327)。全檔 grep `turbo／Turbo／快速／略過` 只命中 445/454 的 bigWin「點擊略過」＝作者確實知道要給略過 affordance，卻只給了大獎覆蓋層、沒給連爆序列。稽核員的「其他 slot 有 Turbo」我實查也成立：slot-pirots.js:224 / slot-gem-storm.js:242 / slot-dead-by-noon.js:249 / slot-golden-toad.js:236 都掛 `HL.instant.betPanel`，因此吃到 instant.js:100 的 Turbo checkbox 與 131 的 110ms/470ms 間隔，且各自 playRound 都讀 `ctx.turbo` 縮短演出。**還有一條比原文更硬的證據**：slot.js:661 自己把遊戲包進 `HL.gameFrame.wrap`，那個外框列(game-frame.js:96)就掛著 ⚙ 遊戲設定，裡面第一列(game-frame.js:79)寫「極速模式 — 跳過結果動畫、縮短自動下注間隔（**全遊戲生效**）」；instant.js:18/131/172 有讀 `HL.gset.get("fast")`，但 `grep -n gset prototype/src/views/slot.js` **零命中** ⇒ 這顆開關就長在暗影儀式的外框上、承諾全遊戲生效，而本遊戲完全不讀＝可由程式證明的破口，不是「跟某家平台做法不同」的設計選擇。

**9. 暗影儀式 Shadow Ritual (slot.js) — 「自動旋轉 ×10」實際跑 11 局：啟動那一局沒被計數，計數器顯示的剩餘數永遠少 1**（medium／CONFIRMED／S／家族 off-by-one-control）
- 位置：`prototype/src/views/slot.js:565-566 / :493 / :525-526 / :505 / :515`
- 重現：押注 100、餘額 5,000、不進特色回合 → 按 ↻（標示自動旋轉 ×10）→ 全程不再操作 → 實際扣 1,100 而非 1,000；且第一局旋轉時計數器顯示 10，數到 0 之後還會再轉一局才停。
- 複驗依據：行號全中，且我把 565-566 與 493 抽成獨立腳本忠實鏡像跑過（node，scratchpad/autosim.js）：toggleAuto 先 `st.auto = 10`(565) 再 `if (!st.busy) spin()`(566)＝第一局不經任何計數；493 是「先判 st.auto > 0、再 st.auto--、再排下一局」。模擬輸出為 spin#1(auto=10) … spin#10(auto=1) → 因 1>0 仍排 spin#11(auto=0) → spin#11 結束才停，**總計 11 局＝扣 11×押注**。顯示面同步錯位：第 1 局進行中 525 顯示 `⏹10`、526 title「自動旋轉 ×10」，而含當前局實際剩 11 局。附帶（同一 off-by-one 家族、稽核員未提）：endCandle:505 / endCursed:515 在離開免費輪時**又**各做一次 `st.auto--` 再 setTimeout(spin)，一次旋轉吃掉兩格額度 ⇒ 有進特色回合的場次反而比標示少跑，方向相反但同源。

**10. 骰寶 Sic Bo — 骰寶整局只有一個 680ms setTimeout：揭骰＋亮贏區＋派彩＋文字＋歷史＋清籌碼＋解鎖全塞同一同步 block**（medium／CONFIRMED／M／家族 flat-single-tick-round）
- 位置：`prototype/src/views/table-sicbo.js:157-181 (單一 setTimeout 於 167，body 168-180)`
- 重現：開骰寶→同時押「大」＋「總點 10」＋兩三個單骰→按「搖骰」：三顆骰以 is-roll 晃動 680ms（唯一的拍），到期後在同一幀骰面揭曉、所有中獎注區同時亮 is-win、餘額跳動、結果文字寫出、歷史珠 push、四個籌碼徽章消失、按鈕重新可按。沒有「先報總點」的懸念段，也看不到自己的籌碼被放在贏區上派彩。
- 複驗依據：核心主張成立。table-sicbo.js:167 `setTimeout(function () { … }, 680);` 是整個 onRoll 唯一的時間軸，body 內依序同步執行 168 renderDice(o,true)、171 全部 ret>0 注區加 is-win、173 area.settle、175-177 statusEl 一次寫完骰面+總點+淨額、178 pushHistory、179 `area.lock(false); area.clear();`、179 dealBtn.disabled=false ⇒ 從按鈕到完全重置＝680ms、結算段零階段化。違反上線閘第 9 項（分階段揭曉→逐項結算）與第 10 項（瞬間平板結算 = FAIL）。 【我駁掉/修正的子主張，故降級 high→medium】① 原稿說「回合零階段化」過頭：165 行 `renderDice(o, false)` 會掛上 `.ax-sb__die.is-roll`，而 components.css:2331 `.ax-sb__die.is-roll { animation: axSbRoll 0.5s linear infinite; }` ⇒ 那 680ms 確實有搖骰晃動的張力段，是一個真實的拍，不是空白。② 原稿把「renderDice(o,true) 三顆同時揭」列為缺陷，這點我認為不成立：真實骰寶（含電子檯）就是骰盅一次掀開、三顆同時可見，不像 slot 轉輪必須左到右錯開——這是品類正確行為而非破綻。真正站得住的只有「揭曉之後的一切（贏區/派彩/文字/歷史/清檯/解鎖）全在同一幀」。③ 原稿另處寫「骰寶最多可同時押 50 個注區」是膨脹的：實際 spot() 呼叫數＝大小 2＋全圍 1＋指定圍 6＋單骰 6＋對子 6＋總點 14 ＝ 35（原稿自己的拆解也只加到 35）。

**11. 骰寶 Sic Bo / 安達巴哈 / 幸運轉盤（共用 HL.table） — 派彩與清空全部籌碼同一 task：沒有先掃輸家再付贏家，且只給總淨額、無逐注區列賠**（medium／CONFIRMED／M／家族 flat-settlement-no-sweep）
- 位置：`prototype/src/core/table.js:66-72; table-sicbo.js:173+179; table-andar-bahar.js:169+175; table-moneywheel.js:239+244`
- 重現：開骰寶→同時押「大」「小」「總點 8」「單骰 ⚂」四區→搖骰：結果那一刻四個籌碼徽章全部同時消失（含中獎的那些），只剩一行「贏 +N / 輸 N」。玩家無法分辨「小」是輸掉被收走、還是「單骰 ⚂」中了幾顆賠幾倍。安達巴哈、幸運轉盤（以及既有的輪盤、百家樂）按同樣路徑重現。
- 複驗依據：四處行號全部對上。core/table.js:66-72 的 settle 只回傳聚合 `{staked, payout, net}`，沒有任何 per-id 明細；三個 view 的結算 block 都是「加 is-win → 立刻 settle → 立刻 area.clear()」：sicbo 171→173→179、andar 168→169→175、moneywheel 237→239→244。table.js:45 `clear()` 走 `changed()` → opts.onChange = 各檔的 renderStakes()，而 renderStakes 是 `badge.textContent = v ? money(v) : ""` ⇒ 贏區與輸區的籌碼徽章在同一幀一起被清空，無先後、無掃籌動作。三檔的 statusEl 也都只寫一個淨額（sicbo 175-177、andar 171-173、mw 241）。違反 spec 鐵則 4「先掃輸家籌碼再付贏家（讓玩家讀懂結果）」、TABLE 破綻清單「多注不逐項列賠→無法稽核」、上線閘第 12 項。 【修正】原稿的「骰寶可同時押到 50 個注區」不實，實際 35 個（見上條）；但 35 區同時無明細一樣不可稽核，結論不變。 【補一個原稿沒說、對修法有影響的事實】這不是本批三款獨有：table-roulette.js:139-145 與 table-baccarat.js:189-196 的既有（且已過保真閘的）遊戲是完全相同的 settle→clear 同幀樣式，且全 repo `is-locked` 在任何桌遊 view 都零命中 ⇒ 這是 HL.table 層的系統性債，修在 core/table.js（settle 回傳 per-id 明細 + 兩階段 sweep/pay）可一次通吃五款。

**12. 骰寶 Sic Bo / 安達巴哈 / 幸運轉盤（共用 HL.table） — 「停止下注」只是 JS 閉包旗標：注區仍有 hover/active 抬起、點擊被靜默吞掉、清除/復原/重押仍可按但無反應**（medium／CONFIRMED／S／家族 missing-lock-visual）
- 位置：`prototype/src/core/table.js:39-45, 108; table-sicbo.js:159; table-moneywheel.js:206; table-andar-bahar.js:145; prototype/src/styles/components.css:2349-2350`
- 重現：開幸運轉盤→押「40」→按「旋轉」→在 2600ms 轉盤動畫期間連點「20」注區：按鈕照樣有 :active 下沉再彈起的觸感回饋，但籌碼徽章不出現、也沒有 toast 或任何提示；同時再按「清除」「復原」「重押」三顆鈕也都能按下卻毫無反應。玩家無法判斷是「沒點到」還是「已停止下注」，要到下一局開始才發現什麼都沒押。骰寶（680ms 窗）與安達巴哈（約 2.4s 窗）同樣重現。
- 複驗依據：逐項核對成立。core/table.js:108 `lock: function (b) { locked = !!b; }` 只改閉包變數；39 `place()` 開頭 `if (locked) return false;`、44 `undo()`、45 `clear()`、47 `rebet()` 同樣是無聲 return（place 只在餘額不足時才 toast，鎖定路徑完全靜默）。三個 view 的 `area.lock(true)` 旁只有 `ctrls.dealBtn.disabled = true`（sicbo:159、mw:206、andar:145），沒有任何 class 加到注區或面板。我照原稿要求 grep 全 `prototype/src/`：`is-locked` 只命中 achievements/guild/meta/season/mines 與其 CSS，三個桌遊 view 與 core/table.js **零命中**，屬實。components.css:2349-2350 精準是 `.ax-sb__spot:hover { transform: translateY(-1px); }` / `:active { transform: translateY(1px); }`，且 2342-2348 的 `.ax-sb__spot` 是可點的 `<button>`（view 用 el("button")，鎖定期間沒有設 disabled）；`.ax-mw__spot:hover/:active` 同樣在 2437-2438 生效。core/table.js:90-97 的 controls() 三顆 ghost 鈕（清除/復原/重押）自始至終不 disable。違反上線閘第 9 項「鎖（停止下注）」的可見性要求與 TABLE 破綻清單「無停止下注鎖」。 【公允界定】功能鎖是有的（不會偷押成功、不會漏扣），缺的純粹是視覺/回饋層，所以維持 medium 而非 high。

**13. 骰寶 Sic Bo / 幸運轉盤 Money Wheel — 輸贏回饋完全不分級：180:1 圍骰、60:1 總點、×7 乘數大獎與 1:1 小勝共用同一行狀態文字、同一個 is-win，金額不做 roll-up**（medium／CONFIRMED／M／家族 flat-feedback-no-tiering）
- 位置：`table-sicbo.js:173-177; table-moneywheel.js:239-242; prototype/src/views/slot.js:446-464`
- 重現：骰寶押 100 在「指定圍骰 ⚄⚄⚄」（返還 181×）：命中時畫面只有一行綠色小字「🎲 5 · 5 · 5 ＝ 15（圍骰 5）　贏 +17,900」，與押 100 中「大」贏 +100 在視覺重量上完全相同——同一個 statusEl、同一個 ax-green、同一個 is-win class、金額直接跳到終值。幸運轉盤押 40 並吃到 ×2 再 ×7（返還 1+40×14）也只是同一行綠字多接「（×14 乘數！）」。
- 複驗依據：全部行號對上。table-sicbo.js:173-177 結算後只有 `statusEl.textContent = 骰面+總點+kind+（贏 +N / 輸 N）` 與 `className = 'ax-inst__last ' + (r.net >= 0 ? 'ax-green' : 'ax-red')`，無任何依 r.net / 倍數的分支；table-moneywheel.js:239-242 同構，僅在 `o.mult > 1` 時多接字串「（×N 乘數！）」（240 行）。金額是一次性 textContent 寫入最終數字，無遞增。原稿引用的正例也對：slot.js:446 `function bigWin(amount, x, done)`，447 行 `x >= 100 ? EPIC : x >= 40 ? MEGA : BIG` 三帶，458 行 `var dur = 1400 + Math.min(1600, x * 8)` 隨倍數縮放 count-up，並掛全螢幕 `.ax-bigwin` overlay。我另外反向查證「有沒有全域慶祝會自動接手」：在三個桌遊 view 與 core/table.js grep `bigWin／celebrate／jackpot` 為零命中；repo 內 bigWin/celebrate 的使用者只有 api/app-state/demo-tools/jackpot/main/arena/chicken/lobby/slot，桌遊完全沒接；core/live-stats.js 也沒有任何 big-win overlay/toast 出口（唯一 toast 是「實時統計已重置」）⇒ 沒有隱形的替代回饋。上線閘第 11 項明文「2× 與 500× 同回饋 = FAIL」，故這是形式上的閘 FAIL 而非口味問題。

**14. 賞金局 · 踩地雷 (bounty) — 「兌現」在 0 格就已解鎖且 mineMult 從 0 起算 ⇒ 開局誤按一下＝x0.00 直接輸掉整注並吃掉一次挑戰次數，同專案的 Mines 明文禁止這件事**（medium／CONFIRMED／S／家族 missing-control）
- 位置：`prototype/src/views/bounty.js:198, :229, :249, :252-257, :186-195; prototype/src/views/instant-crash-mines.js:189; prototype/src/views/chicken.js:135`
- 重現：進踩地雷賞金房 → 選押注 500 → 按「開始挑戰（押 NT$ 500）」→ 一格都不翻，直接按旁邊剛剛亮起來的「兌現」→ 狀態列「兌現 x0.00，獲得 NT$ 0」、toast「兌現獲得 NT$ 0」、餘額 −500、剩餘次數 −1，1.1 秒後盤面重置，無法撤回。
- 複驗依據：行號與程式一致。:198 `mineActive = false; mineMult = 0;`；:229 cashBtn 建立時 disabled；Demo 開局那一列(:249)同時做 `mineActive = true; mineMult = 0; multEl.textContent = "x0.00"; cashBtn.removeAttribute("disabled")` ⇒ 乘數還是 0 就把兌現解鎖。cash handler(:252-257) 唯一守衛是 `if (!mineActive) return;`，沒有「至少翻一格」判斷，於是 `mult = Math.min(0, room.maxMult) = 0`、`win = Math.round(bet*0) = 0` → afterPlay(0)(:186-195) 扣掉整注 + playsLeft--，且 :256 的 `win > 0 ? "ok" : "warn"` 證明作者早就預期 win 會是 0 卻沒擋。同專案兩個對照都成立：instant-crash-mines.js:189 `if (safeCount === 0) { HL.ui.toast("至少翻一格再兌現", "warn"); return; }`（原文寫 :188，實際 189，在其引用區間 187-189 內）、chicken.js:135 `var canCash = st.active && st.step >= 1 && !st.busy;`。這是控件可用性判斷缺失（規格第 12 項），不是賠付數學。

**15. 賞金局 (bounty) — 整檔狀態都放模組全域、且沒有任何 timer 取消或世代閘 ⇒ 離開房間後殘留的揭示/結算計時器會對「下一間房」動手：結算卡長進新房、新房次數與賞金池被扣、翻牌房被畫成踩地雷房**（medium／CONFIRMED／M／家族 stale-timer）
- 位置：`prototype/src/views/bounty.js:16-20, :43, :67, :104-119, :151, :154-163, :217, :245, :257, :273-284; prototype/src/main.js:74-86; prototype/src/views/vsslot.js:49; prototype/src/views/chicken.js:58`
- 重現：會員(後端)模式：翻牌房按「開始挑戰」，揭示鏈開始逐張翻牌後（約 3 秒的窗）按「‹ 返回競技場」→ 立刻點進一間『踩地雷』賞金房 → 殘留的 :112 收尾對新房動手：地雷盤下方憑空長出上一局的翻牌結算卡、新房「剩餘次數」被扣 1、賞金池被上一局的贏額結算。變體：踩地雷房按「兌現」後 1.1 秒內離開、改進一間『翻牌』房 → 殘留 renderMine() 用新 room 重畫，翻牌盤面被換成 12 格地雷盤。
- 複驗依據：機制證實：room/playEl/infoEl/fCards/fFlipped/fWin/fPhase(:16-18) 與 fHeadWin/fBoard/fCardEls(:43) 全是模組全域，render()(:273-284) 進來就整組覆寫；`grep clearTimeout／clearTimers／clearInterval bounty.js` 零命中 ⇒ 既沒有 vsslot.js:49 的 clearTimers 也沒有 chicken.js:58 的 epoch 世代閘。main.js 的 renderApp（實際 74-86，原引用 79-84 落在其中）只有 HL.ticker.clearAll() + HL.dom.clear(root) + mountView，沒有 view teardown hook——值得注意的是 ticker 這種共用計時設施每次重繪都會清，偏偏這些 view 用的是裸 setTimeout。殘留計時器與副作用都對得上：finishFlip(:154-163) 會動新 room 的 prizePool、balance、playsLeft--、done++、challenges++、log，並把結算卡 appendChild 進新的 playEl；會員揭示鏈(:104-119)同理且窗口最長。兩處修正：① 窗口大小差很多——Demo 的 setTimeout(finishFlip,650)(:151) 要在 650ms 內按返回再點進另一間房，人手幾乎摸不到；會員路徑的收尾在 250+picked*320+500（flips=8 時 ~3.3 秒）才開火，這才是真正可重現的那條。② 「下一間房是翻牌房」時不會長出結算卡：render(:284) 與 renderIdle(:67) 會把 fCards 設成 null（卻不同步 fCardEls），finishFlip 第一列 fCards.forEach 直接 TypeError（即原文的變體 C）；要看到「結算卡長進新房、新房次數被扣」必須是「下一間房是踩地雷房」。另外變體 B 的 renderMine 只重畫狀態列/12 格/按鈕，押注列在 leftCol 不由它產生，原文多寫了「+ 押注列」。

**16. 龍虎鬥 Dragon Tiger — 龍/虎兩張牌在同一 tick 同時翻開（renderCard 無 animation-delay），0.32s 就能讀出勝負，卻要空等到 620ms 才結算**（medium／CONFIRMED／S／家族 missing-staged-reveal）
- 位置：`prototype/src/views/table-dragon-tiger.js:111-117、:137-138、:141-155；prototype/src/styles/components.css:2211`
- 重現：押「龍」→ 按「發牌」→ 0.32s 兩張牌同時翻好，看到龍 K、虎 5，玩家此刻已確定贏 → 接下來約 300ms 畫面完全靜止 → 620ms 才亮金框、才顯示「龍 K : 5 虎 — 龍贏 +500」。每局都是「先給答案，再罰站等系統承認」。
- 複驗依據：table-dragon-tiger.js:111-117 `renderCard` 建立 `.ax-card.ax-card--in`，**確實完全沒有 animation-delay**；對照組正確：table-baccarat.js:151 的 renderHand 有 `style:"animation-delay:"+(i*0.12).toFixed(2)+"s"`。:137-138 `renderCard(dragonCard,o.D); renderCard(tigerCard,o.T);` 在同一同步區塊連續呼叫 ⇒ 兩張牌的 components.css:2211 `axCardIn 0.32s cubic-bezier(…) both` 同時起跑同時結束。牌面 :114 印的就是 `c.rank`（components.css:2215 `.ax-card__r`），而 :35 的勝負只比 `rankIdx` 大小，故 t≈0.32s 勝負 100% 可讀；但 rank 標籤/is-win/settle/statusEl 全在 :141 的 `setTimeout(…,620)` 內 ⇒ 約 300ms 完全靜止的死等。額外坐實證據：intel/db/games-catalog.json 龍虎鬥 gate_log 把 `8_expectation_exists` 記成「PASS(VS 版面+620ms 懸念+金框高亮)」——把「什麼都沒發生的 300ms」自我認證成懸念，正是 fidelity-spec 閘第 10 項「瞬間平板結算 = FAIL」要擋的東西。我唯一修正的是 family：這是 missing-staged-reveal（缺分階段揭曉），不是 wrong-genre（玩法型別本身沒做錯，龍虎比大小、和退半、8 副靴都對）。

**17. Dead By Noon 正午對決 — 乘數徽章只在 mult>1 時更新、沒有回設，會把上一拍的 ×12 留在實際只乘 ×1 的 cascade 上**（medium／CONFIRMED／S／家族 stale-hud）
- 位置：`prototype/src/views/slot-dead-by-noon.js:214, prototype/src/views/slot-dead-by-noon.js:201, prototype/src/views/slot-dead-by-noon.js:216`
- 重現：進 Dead By Noon 旋轉到任一「先有籌碼中獎、後續 cascade 無籌碼」的局（seed 7 可 node 復現）：第一拍徽章跳 ×12 並亮金光，第二拍派彩只有 0.30 單位（實際乘數 ×1），徽章與金光仍停在 ×12；玩家用徽章判斷「這一拍值多少」永久失準，回饋與結算長期不符（保真第 11/12 項）。
- 複驗依據：:214 字面就是 `renderGrid(e.grid,e.cells,e.digits); if(e.mult>1) setMult(e.mult);`——只升不降、沒有 else 分支；cascade 影格（:216）只 renderGrid 不碰徽章；整局唯二歸位點是 fill（:213 `setMult(1)`）與回合收尾（:244 `setMult(1)`）⇒ **一局之內徽章單調停在歷史最大值**。setMult（:201）`multBadge.classList.toggle("is-hot", m>=10)` 只在被呼叫時才會關掉金光，所以不呼叫＝金光也卡住（CSS 規則實際在 components.css:3059 `.ax-dbn__mult.is-hot`，他寫 3058 是 `.ax-dbn__mult` 本體，位移 1 行，不影響結論）。而 mult===1（盤上無籌碼）是**多數**情況：CFG.wt[CHIP]=0.6 對比總權重 ~86，base 局多數 cascade 無籌碼。node 實跑 seed 7 完全複製他的敘述：第 1 拍 mult=12 → 徽章 ×12 且 is-hot（12≥10）亮金框；第 2 拍實際 mult=1、`units=0.30000000000000004`（他寫 0.30，正確）→ :214 不執行 → 玩家在只乘 ×1 的那一拍看到發光的 ×12；第 3 拍 setMult(3)（is-hot 關）；第 4、5 拍 mult=1 → 徽章卡在 ×3。至於「×251 一次跳終值、沒有逐位串接」也屬實（整局只有一次 setMult 寫入最終值），但那是與發現 2 同源的同一個根因，不宜當獨立第二罪狀。

**18. Dice / Limbo — 極速模式對 dice/limbo 的揭曉閘門完全無效：答案在點擊瞬間就寫出，卻要空等 300/620ms 才給輸贏回饋；手動模式永遠拿不到 Turbo**（medium／CONFIRMED／S／家族 flat-feedback）
- 位置：`prototype/src/views/instant-games.js:124,135,175,184 · prototype/src/core/instant.js:18,91,121,131,172,175 · prototype/src/views/game-frame.js:79`
- 重現：⚙ 遊戲設定 → 勾「極速模式」→ Limbo 手動按「開始 🚀」：大字在按下的同一幀就顯示最終崩盤倍數（animate ms=0 同步寫終值），但綠/紅配色、歷史 chip、餘額入帳要等 620ms 後 :179 的閘門才發生 —— 玩家已知結果、遊戲還沒承認，且手動模式沒有任何方法縮短這 620ms。Dice 同理 300ms。修法：:135/:184 的 fast 應為 `ctx.turbo ／／ HL.gset.get('fast')`。
- 複驗依據：全部行號對得上，而且核心那一步是硬證據而非推測：animate() 的 :172 `if (fastMode()) ms = 0`，:175 `if (ms <= 0) { onFrame(to,1); resolve(to); return; }` 位在 Promise executor 內＝同步執行 ⇒ 極速模式下大字在呼叫的那一瞬間就顯示最終值。而 dice :135 `fast ? 0 : 300` 與 limbo :184 `fast ? 0 : 620` 的 fast 只來自 ctx.turbo（:124/:175），ctx 只有兩個產生點：instant.js:91 手動硬寫 `{ turbo: false }`、:121 自動 `{ turbo: turbo.checked }`，且 turbo checkbox 只被 append 進 autoWrap（:105-106）⇒ 手動路徑結構上不可能拿到 Turbo，確認。game-frame.js:79 我實讀為 `row("fast", "極速模式", "跳過結果動畫、縮短自動下注間隔（全遊戲生效）")`（:80 才是 anim）⇒ 文案承諾與行為不符成立。唯一錯的是他的數字：極速模式下自動間隔 470→110（:131），dice 週期 770→410（省 47%）、limbo 1090→730（省 33%），不是他寫的 ~26%；不影響結論。

**19. Dice / Limbo — 回合已 commit 的參數在動畫進行中仍可被改動，勝負區/賠率即時跟著變，揭曉那刻畫面判定與實際結算互相矛盾**（medium／CONFIRMED／S／家族 no-commit-lock）
- 位置：`prototype/src/views/instant-games.js:102,110,113,114,115,122,132,163,170,174`
- 重現：Dice 設「滾出 < 50」→ 開始自動下注（每局 770ms）→ 動畫飛行中把握把從 50 拖到 90。若該局擲出 70：指針落在 70，此刻 70 已位於重畫後的綠色 win 區內、資訊卡顯示 90 的中獎率，但 300ms 後大字轉紅、history 記 is-lose、餘額被扣。Limbo 版：動畫中把目標從 50 改成 1.5，可贏卡立刻變小，該局仍以 50 判定。
- 複驗依據：行號全中：Dice 的 :113 setFromX 直接改 target 並 sync()、:114/:115 pointerdown/pointermove 無任何 running 或 in-flight 閘，:102 sync()→:96 layout() 立刻重畫 zoneWin/zoneLose 與 :105-107 的賠率/中獎率/可贏三張卡；而這一局的結果在 :122 `Dice.resolve(HL.fair.floatOr("dice"), target, dir)` 就已定案，:132 的 rollBadge 配色用的是那份已 commit 的 win。Limbo 同形：:170 tIn 的 input→sync 立即改中獎率/可贏，本局用 :174 讀到的舊 t 結算。我原本準備以『鎖不鎖滑桿是設計選擇』駁回，但缺陷不必依賴任何平台慣例即可成立——它是同一畫面的自相矛盾：指針停在 70、剛重畫的綠色 win 區覆蓋 0-90 含 70、資訊卡顯示 90 的高中獎率，而大字是紅色、history chip 是 is-lose。派彩本身是對的（賠付用 commit 值），所以這是純顯示可信度問題，不是金流錯誤 ⇒ 維持 medium。順帶：:110 dirBtn 的方向切換同樣無閘，屬同一家族。

**20. Dice / Limbo（共用 betPanel） — 自動下注執行中「下注金額」輸入框與 ½/2×/Max 仍可操作且被程式反覆改寫，玩家打的字會被當成真注額 commit**（medium／CONFIRMED／S／家族 no-commit-lock）
- 位置：`prototype/src/core/instant.js:45,49,50,51,115,118,127`
- 重現：(a) Dice 開始自動（局數 0）→ 在下注金額欄慢慢輸入「1500」：每打一個字 :45 就把 state.bet 改成當下的殘缺值（1→15→150），而 :118 每 770ms 讀一次 ⇒ 有機率把「15」當成真注額結算；結算後 :127 又把整個欄位改寫成程式算的注額，玩家打到一半的字被吃掉。(b) 自動下注中按「Max」→ state.bet=當下全額；若該圈結算為贏（餘額≥注額），下一圈就以全部餘額下注一局，無任何確認。
- 複驗依據：行號全中且我確認 instant.js 全檔只有 playBtn 有 disabled 操作（:90/:91/:109/:115），input 與三顆 chip 從頭到尾無任何 running 閘。機制對得上：:45 input 的 input 監聽直接 `state.bet = clampInt(input.value,...)`（且刻意不呼叫 notifyBet ⇒ 連資訊卡都不同步）；:51 Max chip `writeBet(bal())`；step() :118 `var bet = state.bet` 每圈重讀、:127 `input.value = String(state.bet)` 每圈回寫 ⇒ 兩邊搶同一欄位，證明成立。他的 (b) all-in 我實測邏輯後要補一個他沒寫的前提：:119 `if (bet > bal()) { toast; stopAuto; return; }`，所以按 Max 後若下一圈之前餘額下跌（上一局輸），迴圈會直接停而非 all-in；只有餘額持平或上升時才真的用全額下注一局。缺陷仍在（無鎖、無確認就 commit 了玩家沒打算下的注額，且下一圈 :124-126 自己跳回 base），但『必定 all-in』要打折 ⇒ 我把 high 降為 medium。

**21. Dice / Limbo（共用 betPanel） — 按「停止」會在上一局動畫還在飛時就解鎖手動下注鈕，而揭曉計時器與 count-up 都不可取消 → 兩局重疊、數字被舊局蓋掉**（medium／CONFIRMED／M／家族 stale-timer）
- 位置：`prototype/src/core/instant.js:86,91,109,121-122 · prototype/src/views/instant-games.js:127,129,177,178`
- 重現：Limbo →「自動」→ 開始自動 → 大字還在爬時按「停止」→ 立刻切「手動」→ 620ms 內按「開始 🚀」。新局爬到一半時舊局的 620ms 閘門開火：bigEl 被改寫成舊局崩盤值並塗上舊局輸贏色、舊局 history chip 這時才插進去、lastEl 顯示舊局結果，接著新局閘門又蓋回去；期間兩條 animate rAF 同時寫同一顆 bigEl。餘額側：新局的注在舊局派彩之前扣，餘額接近見底時新局會誤報「餘額不足（Demo）」。
- 複驗依據：行號全中。instant.js:109 stopAuto 無條件 `playBtn.disabled = false`，不看是否仍有 in-flight 的 res.done；對照 :91 手動路徑自己是對的（`.then` 完才解鎖）⇒ 同檔不一致成立。我補查了他沒證的兩個環節：① 停止後能否切回手動 —— :65 tabM 監聽只擋 `state.running`，stopAuto 先把它設 false ⇒ 可切；② playBtn onClick :86 的守衛是 `if (state.running ／／ playBtn.disabled) return`，兩者皆 false ⇒ 新局確實會開。舊局那半也成立：view 端 :129/:178 的揭曉閘是裸 setTimeout 沒存 handle，:127/:177 的 HL.instant.animate 回傳 promise 被丟棄、instant.js:171-184 內部沒有 cancel 出口（rAF id 未保存）⇒ 舊局的 rAF 與 setTimeout 必定照原時程對同一顆 bigEl/rollBadge 開火。另外 settle 的 finish 不受 :122 的 `if(!state.running) return` 保護（那道閘在 finish 之後），所以舊局派彩仍會在新局進行中入帳＝他說的餘額順序錯亂有據。

**22. gem-storm — tumble 連鎖缺少「消除」中間影格：上一鎖的中獎高亮還亮著，下一鎖的完整新盤就直接取代，玩家數不出連了幾鎖**（medium／CONFIRMED／M／家族 missing-cascade-beat）
- 位置：`prototype/src/views/slot-gem-storm.js:91, :93, :111, :113, :185-186；對照 prototype/src/views/slot-dead-by-noon.js:131, :214, :216 與 prototype/src/views/slot-pirots.js:183`
- 重現：下注按「旋轉 💎」直到出現 2 鎖以上連鎖（hit 率 35%，很快遇到）：畫面不會出現寶石消失的空缺，也沒有高亮熄滅的瞬間——整盤 30 格直接被換成另一盤已經在發光的 30 格，間隔 460ms（base）或 253ms（免費 paceFS=0.55）。3 鎖時玩家無法判斷發生了幾次消除，只感覺盤面在閃爍抽動。
- 複驗依據：行號全對，含他引用的兩個對照組（dead-by-noon:131 `events.push({t:"cascade",grid:snap(g)})`、:214 win 影格 520ms、:216 cascade 影格 280ms；pirots:183 獨立 cascade 影格 300ms）。程式事實：gem 的 steps 只在 tumble() 之前 snapshot（:91 免費 / :111 base，緊接著 :93/:113 就 tumble），所以時間軸裡結構性地不存在「移除後、補牌前」那一拍；playSteps :185-186 每個 step 都是「完整盤 + 該盤自己的中獎高亮」，渲染序列必然是「帶高亮的盤 A → 已落下已補牌且帶高亮的盤 B」，中間沒有一格空缺、沒有一個無高亮的過渡影格（只有最後 win=0 那一步是無高亮，因為它在 break 前被 push）。這同樣是對照專案自己的閘：保真規格 SLOT 流程明文「tumbling 在特色檢查前插入：移除中獎→重力補位→重算」，中間那一拍是規格要求的、不是外部平台慣例。

**23. gem-storm — 免費遊戲 retrigger 完全沒有任何回饋：runFS 回傳的 retrig 從未被 render 使用，轉數分母還延後一轉才悄悄變大**（medium／CONFIRMED／S／家族 flat-feedback）
- 位置：`prototype/src/views/slot-gem-storm.js:98, :99, :103, :220`
- 重現：買入免費遊戲，玩到某轉開盤有 ⭐≥3（node seed=3 為第 7 轉）：該轉畫面持續顯示「🎁 免費 7/10」，沒有 +5 提示、沒有 pop、沒有暫停、沒有分母跳動；下一轉標籤才無聲變成「🎁 免費 8/15」。玩家不會知道自己剛剛加了 5 轉，整個 bonus 最大的張力釋放點是完全靜音的。
- 複驗依據：行號全對，且我用 node 找到實例逐格核對。程式事實：:98 `evSpins.push({... spinsPlanned:spins})` 比 :99 `if(initScat>=CFG.fsRetrig){ spins+=CFG.fsRetrigAdd; retrig++; }` 早一行 → 觸發 retrigger 的那一轉，事件裡帶的 spinsPlanned 仍是舊值。:103 有把 retrig 回傳，但我 grep 全檔 `retrig`：render 區（138-275）唯一命中是 :215 的中文註解（講 paceFS 壓縮），零處讀 fs.retrig、零處為 retrigger 發 pop。唯一線索就是 :220 `setSpins(sp.spinNo, sp.spinsPlanned)`。node 實測 seed=3（retrig=2、共播 20 轉）標籤序列：1/10 … 7/10 → 8/15 … 13/15 → 14/20 …，而 retrigger 實際是在第 7 轉（init ⭐=3）與第 13 轉開盤時發生的 → 那兩轉畫面上仍寫舊分母，要等下一轉才無聲變大。對照保真閘第 7 項明列 retrigger 為必備特色、第 10/11 項要求張力點與分級回饋。

**24. golden-toad — Hold & Win 重旋期間非鎖定格是永久空白，沒落到金幣的那次重旋渲染出「與前一影格幾乎逐格相同」的畫面 —— 該類型最核心的張力被做成靜態**（medium／CONFIRMED／M／家族 wrong-genre）
- 位置：`prototype/src/views/slot-golden-toad.js:208, :212, :214, :172, :101-102；prototype/src/styles/components.css:3087`
- 重現：買入 Hold & Win 反覆試（或用 node seed=178 對照）：進 bonus 後盤面變成一片空白方框，只有金幣格有數字；接著 🔄 重旋 3→3→2→1→3→3→3→2→1→0，其中 5 次的盤面符號零變化（其中連續兩次空重旋時整格畫面完全靜止），各停 300ms，只有右上角數字在變。玩家分不出遊戲是在重旋還是卡住了。
- 複驗依據：行號全對，node 實測與他報的種子結果完全一致。程式事實：重旋影格一律 `renderGrid(null, e.locked, null, fset)`（:212，bstart 是 :208），grid=null → :172 `txt = (grid ? symChar(s) : "")` 讓每個未鎖定格輸出空字串且不帶任何 class；數學端 :101-102 只擲「這個空格是否變成金幣」（rng()<CFG.respinP=0.135），從不產生非金幣符號，所以結構上根本沒有可顯示的滾動內容。fresh 為空時 locked 未變、grid 仍 null、fset 為空 → DOM 與前一影格的符號內容完全相同，卻仍空等 300ms（:214）。node `simSpin(mulberry32(178),0,true)`：10 次 respin 事件中 5 次 fresh 為空，重旋計數序列 3(bstart)→3→3→2→1→3→3→3→2→1→0，與他報的一致；我另跑 3000 局強制 bonus：28722 個重旋影格中 14902 個（51.9%）fresh 為空、6924 個（24.1%）是「空接空」＝真正逐格零變化。唯一要修正的措辭：緊跟在有 fresh 的影格之後那一格空影格，DOM 其實有一個差異——前一影格的 is-fresh class 被移除（components.css:3087 的 0.5s scale 動畫因此結束），所以「完全沒有任何像素改變」只對連續兩次空重旋成立（佔 24%）。這不改變結論：對照保真閘第 10 項「瞬間平板 = FAIL」，Hold & Win 的重旋本身就是這個類型唯一的張力來源，這裡有一半的重旋是完全不動的。

**25. golden-toad + gem-storm — 最終結果盤面在派彩結算之前就被固定種子的待機盤面抹除，玩家永遠看不到自己中獎的那個盤**（medium／CONFIRMED／S／家族 result-erased-before-settle）
- 位置：`prototype/src/views/slot-golden-toad.js:225-231, :180；prototype/src/views/slot-gem-storm.js:232-238, :176；prototype/src/core/instant.js:71-83`
- 重現：Golden Toad 任一次進 Hold & Win：bend 事件顯示 💰 總額後等 600ms（:219）→ 盤面瞬間換成每次都一樣的那張 2 金幣無獎待機盤，「🎉 12.30×」的浮字同時出現在這張假盤上方，再一個 microtask 後底部才寫「贏 +615」。Gem Storm：免費遊戲最後一轉播完 → 盤面換成固定 0 勝符盤且 💰 badge 直接消失 → 才跳「💥 MEGA WIN」。連續玩十局，結束畫面永遠是同一張圖。
- 複驗依據：行號正確、機制正確，固定盤的內容我也用 node 算過並與他一致。程式事實：done 鏈最後那個 .then 是同步塊 —— toad:226 busy=false → :227 history.push → :228/:229 pop → :230 renderResting()，gem:233→:237 同構；renderResting（toad:180 / gem:176）用固定種子 mulberry32(0x60A7) / mulberry32(0x6E33) 建盤，所以每局結束都是同一張圖。node 實測：toad 的固定盤 = [[2,0,2,0,4],[7,1,0,7,3],[3,5,2,1,1]]，countCoins=2、evalLines.units=0（正是他說的「2 個金幣的無獎盤」）；gem 的固定盤 evalBoard.win=0、countScat=0（「0 勝符的無獎盤」）。而 instant.js:71 settle 的 finish()（:73-81）掛在 res.done.then 上（:82），也就是加餘額（:75）與寫「贏 +N」（:78）必定發生在盤面被抹掉之後一個 microtask。gem 更嚴重：renderResting 同時把 potBadge 與 spinBadge 設 display:none，💰 總分在宣布贏錢的同一瞬間消失。唯一要更正的措辭：pop 與 renderResting 在同一個同步塊，所以慶祝字是「與抹盤同時」出現、不是「之後」；「贏 +N」的文字才是之後。這不影響結論——玩家被告知中獎的那一刻，畫面上是一張與結果無關的固定盤，Hold & Win 15 格填滿拿 GRAND 的那張圖從未在畫面上停留。

**26. golden-toad + gem-storm — 完全沒有轉輪/落定階段：最終盤面一次全部現形，逐欄停輪不存在，cell 上宣告的 transition 因每格重建而是死碼**（medium／CONFIRMED／L／家族 missing-spin-phase）
- 位置：`prototype/src/views/slot-golden-toad.js:195-197, :158；prototype/src/views/slot-gem-storm.js:186, :160；prototype/src/styles/components.css:3085, 3087-3088, 3109, 3112；對照 prototype/src/views/slot.js:299-327`
- 重現：按「旋轉 💎」→ 30 格瞬間變成最終結果，無任何滾動、無逐欄落定，接著靜止 200–460ms 才閃中獎框；Golden Toad 按「旋轉 🐸」→ 15 格瞬間現形，靜止 360ms 才亮連線。連按十次，除了符號不同看不出「轉」過。同一 session 打開 Shadow Ritual（slot.js）按一次旋轉，可見 5 欄依序停輪＝同 repo 內即有正確對照。
- 複驗依據：六個行號我逐一開檔核對，全部精準（含 CSS 的 3085/3087/3088/3109/3112，一行不差）。程式事實：toad:195 `renderGrid(tl.base.grid,null,null,null)` 把 15 格最終符號一次貼上，之後只有 :196 `delay(fast?60:360)` 的靜止等待；gem 走 playSteps 第一個 step（:186）同樣一次貼上 30 格。兩者的 renderGrid 都以 HL.dom.clear(board)（toad:158 / gem:160）砍光再 append，我另外 grep 證實：兩檔對 cell 零 classList 操作、零 inline style，且 CSS 中 .ax-toad__cell / .ax-gem__cell 只有 4 條規則、沒有任何 :hover/:focus/:active → 3085/3109 上的 `transition: transform .12s, box-shadow .12s, opacity .18s` 在任何路徑下都不可能觸發（新節點無前一狀態可插值），確實是死碼，且如他所說連 reflow 都救不了（元素本身被換掉）。會播的只有 is-win / is-fresh 兩個 animation，即「已經中了」才有動效。對照組也成立：slot.js:299-327 每欄自建 strip、:321 `void reelEl.offsetWidth` 提交起點、`dur = 0.7 + r*0.1` 逐欄延後停輪。這不是「與某家平台做法不同」的設計選擇——保真規格第 4 項明文「轉輪由左到右停（絕不同時）」、SLOT 流程明文「spin 開始即 RNG 定停點→轉輪左到右依序停」、上線閘第 10 項明文「瞬間平板結算 = FAIL」，兩款遊戲自己的檔頭又都宣稱「忠實復刻業界標準」。

**27. hilo — Hilo 0.35s 翻牌揭曉純裝飾：勝負色/倍數/歷史都在動畫起始同一 frame 寫完，且揭曉期間不鎖猜測鈕，連點可把整張牌的揭曉砍掉**（medium／CONFIRMED／M／家族 no-commit-lock）
- 位置：`prototype/src/views/instant-hilo.js:104-119（guess 全同步）／:75 paintCard／:93-94 refreshGuess／prototype/src/styles/components.css:2811-2812`
- 重現：開局拿到 5♠→快速雙擊「⬆ 更高」→第一張（猜對）的翻牌動畫在 350ms 內被第二次點擊 remove("flip") 重設，玩家從未看見自己贏的那張牌；若第二張輸了，畫面只剩「💥 猜錯，這局結束」，倍數在同一 frame 從 1.00× 跳到 1.61× 又凍住，只能從 histBar 小 pill 反推中間贏過一次。單擊也一樣：文字與倍數先於牌面可讀，0.35s 翻牌失去揭曉功能。
- 複驗依據：guess() 我逐行讀完＝純同步無任何動畫閘：:108 drawCard → :110 paintCard(next) 後緊接 pushHist(next, good)（:78 立刻打上 is-win/is-lose）→ :113 refreshStats()（倍數 bump）→ :114/:117 setStatus 寫出「✅ 猜對」/「💥 猜錯」。而 paintCard :75 是 `classList.remove("flip"); void cardEl.offsetWidth; classList.add("flip")`，對應 components.css:2811 `.ax-hilo__card.flip { animation: ax-hilo-flip .35s ease; }`、:2812 keyframes `0% { transform: rotateY(90deg); opacity: .4 }` ⇒ 首次 paint 時牌面正側轉 90 度且半透明幾乎不可讀，但答案文字與倍數已完全可讀＝揭曉順序反了（保真規格第 3/4 項）。鎖的部分我核對 :83-95 refreshGuess：hiBtn/loBtn 的 disabled 只由 `pHi/pLo > 0` 決定，:113 猜對後立刻 refreshGuess() 重新解鎖，全檔沒有任何 busy/pending 旗標 ⇒ 0.35s 動畫窗內連點會直接抽下一張，paintCard 的 remove("flip") 把上一張的揭曉動畫砍掉。對比本平台自己的慣例 core/instant.js:85-92（playBtn.disabled=true → 等 res.done Promise resolve 才 finish 結算再解鎖）與 instant-cases.js:110-117（先跑 2.6s 滾輪 Promise、land() 後才 resolve 給結算），證明這是本檔漏做而非全站設計。唯一不精確處：原 repro 寫「1.00×→1.28×」，5♠(rank 4) 猜更高的實際單步倍數是 0.99×13/8=1.61×，數字舉例錯但不影響機制。

**28. Keno 賓果彩 (keno) — Keno 新一局揭曉期間，倍數／派彩／狀態列仍掛著上一局的結果（含綠色中獎字樣）**（medium／CONFIRMED／S／家族 stale-scoreboard）
- 位置：`prototype/src/views/instant-keno.js:122-137（start 開局段，只呼叫 128 clearMarks）、89（clearMarks 只移除 is-ball/is-hit）、66-68（multEl/winEl/statusEl 宣告）、146（揭曉中 hitsEl 寫裸數字）、151-157（收尾才改寫 hitsEl/multEl/winEl/statusEl）`
- 重現：選 5 個號 → 開獎 → 命中 3 個（計分板停在 倍數 4.24×／派彩 $212、狀態列綠色「🎉 中獎」）→ 不改選號直接再按「開獎」→ 接下來約 1.8 秒球一顆顆落下的整段時間，倍數仍是 4.24×、派彩仍是 $212、狀態列仍是綠色中獎，直到最後一顆球落下才翻成紅色「未達起付命中數」。
- 複驗依據：start()（122-137）我逐行看過：開局只做 busy 鎖、127 disabled、128 clearMarks()、129 扣注，接著直接抽球結算。clearMarks()（89）的實作是 `c.classList.remove("is-ball", "is-hit")`，只碰格子 class，完全沒有動 multEl(66)/winEl(67)/statusEl(68)。全檔搜過，這三者唯一的寫入點就是收尾段 152/153/154-157，也就是 20 顆球全部揭曉完之後。因此第 2 局起，整段約 1.8 秒的逐球揭曉期間，計分板的「倍數／派彩」與狀態列（含 ax-green class）都還是上一局的值＝畫面上顯示一筆不屬於本局的派彩金額。原稿的附帶觀察也對：hitsEl 在 146 行被寫成 `String(countShown())` 裸數字、151 行收尾才變 "3 / 5"，同一個 stat 格在一局內兩種格式（不過 hitsEl 本身在第一次 reveal 呼叫就被覆寫，並非 stale，這點原稿也沒說錯）。與規格第 11 項（輸贏回饋要讀得清）／第 9 項（逐項結算）相衝。此條與上一條疊加後更糟：錢包已先跳、計分板又寫著別局的派彩。

**29. Keno 賓果彩 (keno) + Dice Duel 骰子對決 (dice-duel) — Keno / Dice Duel 在揭曉動畫開始前就把派彩寫進頁首錢包 ⇒ 可見餘額先洩漏結果**（medium／CONFIRMED／M／家族 pre-reveal-payout-leak）
- 位置：`prototype/src/views/instant-keno.js:129+136（扣注與入帳）、141-150（入帳之後才開始 90ms/球揭曉）、148；prototype/src/views/instant-duel.js:99（入帳）、106（其後才排 800ms 演出）；prototype/src/core/instant.js:16（setBal→refreshChrome）；prototype/src/layout/app-shell.js:37-41（refreshWalletPill 寫 #ax-wallet-amount）、65（#ax-wallet-amount 在 header 內）、671-673（header 與 #ax-main-content 同層、只建一次）、692-699（mountView 只清 #ax-main-content）、701-702（refreshChrome 首件事＝refreshWalletPill）`
- 重現：keno：記下頁首錢包金額 → 選 5 個號 → 按「開獎」→ 在第一顆球亮起之前看頁首：金額已經是本局結算後的淨值（中獎則高於局前值），20 顆球那 1.8 秒的揭曉已無懸念。duel：記下錢包 → 按「對戰」→ 兩邊還顯示「?」的那 800ms 內，錢包已經加了 floor(bet×1.98)－bet。
- 複驗依據：整條鏈我自己走完了，每一環都對得上：keno 129 行扣注、136 行 `if (payout > 0) setBal(bal() + payout)`，逐球揭曉的 IIFE 才在 141 行開始，148 行 `global.setTimeout(reveal, 90)`＝20 球約 1.7–1.8s；duel 99 行 `if (payout) setBal(bal() + payout)`，800ms 的 setTimeout 在 106 行才排。setBal 是 core/instant.js:16 的那個，尾端無條件 `if (HL.shell && HL.shell.refreshChrome) HL.shell.refreshChrome()`；app-shell.js:701-702 refreshChrome 第一行就 refreshWalletPill()，37-41 直接改寫 id=ax-wallet-amount 的 textContent。錢包藥丸的持久性我也證了（原稿沒證這一步，是它最脆的環節，但它成立）：header() 產生的節點含 walletWidget()（484-501，其中 65 行是 #ax-wallet-amount），render()（671-673）把 header() 與 `<main id="ax-main-content">` 建成兄弟節點且只建一次，而 mountView（692-699）只 clear/append #ax-main-content ⇒ 遊戲頁全程可見同一顆錢包藥丸。因為兩次 setBal 在同一 task，實際洩漏的是「淨值」：中獎時藥丸高於局前值、未中獎時直接低於局前值，玩家在第一顆球落下前就能反推結果。對照組也複驗：cases 走 betPanel，core/instant.js:71-82 的 settle 只先扣注、payout 走 `res.done.then(finish)`（82 行）＝動畫結束才入帳，同 codebase 內確實兩套做法。與規格第 9 項「結算後才入帳」直接衝突。我只下修嚴重度：帳務時序（先入帳防中途離場漏帳）是刻意房規且該保留，缺陷純在顯示層，且揭曉窗只有 0.8–1.8s、藥丸不在視覺焦點，故 medium 而非 high。

**30. Mines — 踩雷收局只翻出地雷、不翻出剩下的鑽石；兌現收局卻兩者都翻 ⇒ 輸的那次揭曉是殘缺的**（medium／CONFIRMED／S／家族 incomplete-reveal）
- 位置：`prototype/src/views/instant-crash-mines.js:167,152,192;對照 prototype/src/views/instant-towers.js:109 與 :136 共用 revealTraps()`
- 重現：地雷數 3 → 開始 → 翻 2 格拿 💎 → 第 3 格踩雷 → 棋盤只多出另外 2 顆 💣，其餘 20 格永遠空白，玩家無法知道自己踩的是唯一擋路的雷還是滿盤都是雷；同一局若改按「兌現」，那 20 格會全部翻成 💎。兩條路徑資訊量不同。
- 複驗依據：line 167 踩雷路徑是 `record(0); lockAll(true); winEl.textContent = "—"; return;`——只有 lockAll；line 152 lockAll 只對 `minePos[i]` 的格子寫 💣，其餘未開安全格保持空白灰底（只多一個 is-locked）。line 192 兌現路徑則是 `revealRestSafe(); lockAll(true);` 兩者都做。⇒ 同一款遊戲兩條收局路徑的揭曉完整度確實不對稱，且較殘缺的是「輸」的那次。我不採信「與 Stake 不同就是缺陷」這種論證，所以特別去查同 repo 的內部先例：towers.js:109（踩陷阱）與 :136（兌現）呼叫的是同一個 revealTraps()，揭曉對稱——同作者同家族的正確做法就在隔壁檔，因此這是不一致而非刻意設計（程式裡也沒有任何註解主張刻意隱藏）。降級理由：這條沒有功能性錯誤，只影響收局情緒/資訊完整度（保真規格第 9、11 項）。

**31. Pirots 探險 / Dead By Noon（兩款同一缺陷） — renderGrid 每一影格都 clear+重建全部格子，導致 cascade 的「落下」完全沒有位移動畫，整盤符號瞬間換字**（medium／CONFIRMED／M／家族 missing-reflow-commit）
- 位置：`prototype/src/views/slot-dead-by-noon.js:189, prototype/src/views/slot-pirots.js:143, prototype/src/styles/components.css:3062, prototype/src/views/slot.js:321`
- 重現：Pirots 旋轉並打中一組收集：收集格會縮小消失（ax-pir-collect 420ms，正常），420ms 後 cascade 影格一次把整盤換掉——上方寶石不是掉下來填洞，而是原地變成別的圖案，頂部新寶石也沒有從盤外落入。DBN 中獎後最明顯：cascadeDown 數學上只是「全體下移一列」，但玩家看到 20 個字元同時瞬變，沒有任何一格在移動。
- 複驗依據：全部引用查證屬實。dbn:189 與 pirots:143 都是 `HL.dom.clear(board)`（dom.js:37 `while(node.firstChild) removeChild`）後重新 append 全新 el() 格子 ⇒ 元素身分每影格銷毀，`.ax-dbn__cell`/`.ax-pir__cell` 上的 `transition: transform .12s, box-shadow .12s, opacity .18s`（components.css:3062 / 3037）在新元素上永遠無前一個 computed value 可插值、必然不觸發（與 slot.js:321 `void reelEl.offsetWidth; // reflow` 所治的「起點未提交」同一家族，只是更徹底）。我另外驗證了 CSS 側的「有無替代動畫」這個最可能翻盤的反駁點：grep components.css 全部 ax-pir（3029-3052，24 條）與 ax-dbn（3055-3076）規則，keyframes 只有 `ax-pir-collect`（3040，原地放大→縮小消失）、`ax-dbn-win`（3066，原地放大）與 pop 的 `ax-pir-pop`（3047）——**沒有任何 drop/fall/translateY 位移動畫**，且 `.ax-pir__cell`/`.ax-dbn__cell` 本體無 `animation` 屬性 ⇒ 新格子是瞬間出現（keyframe 動畫會在新元素上跑，但這兩款根本沒有落下 keyframe）。對照本專案自己做對的 slot.js（:321 提交 reflow + 逐輪 0.7+r*0.1s 左到右停 + `.ax-sym.is-drop`/`@keyframes ax-sym-drop` components.css:1675-1676）⇒ 這是**內部標準落差，不是與外部產品不同**。事件模型面也證實：collapse（pirots:63-67）與 cascadeDown（dbn:109-112）都在同一 pass 內「移除+補新」，時間軸只事後拍一張 snapshot（pirots:90 / dbn:131），連「空洞中間態」都不存在 ⇒ 光改 CSS 做不出落下，fix M 合理。DBN 更是連 fill 都一次畫滿 20 格、沒有 slot.js 那種左到右逐欄停輪（保真第 4 項）。

**32. Pirots 探險 / Dead By Noon（兩款同一缺陷） — 手動旋轉與買入 FS 一律 turbo:false，全站「極速模式」對這兩款完全無效，且無跳過/中止出口**（medium／CONFIRMED／M／家族 missing-control）
- 位置：`prototype/src/core/instant.js:91, prototype/src/views/slot-pirots.js:235, prototype/src/views/slot-dead-by-noon.js:258, prototype/src/views/game-frame.js:79`
- 重現：進遊戲點齒輪打開「極速模式」（說明寫全遊戲生效）→ 回到 Pirots 按「購買免費遊戲 103.7×」→ 動畫照原速跑，畫面上沒有任何加速/跳過/停止控件；抽到長局時（p90 20 秒、尾端可到 65 秒）只能乾等。手動旋轉同理：即使在「自動」分頁勾了 Turbo，回到手動按旋轉仍是全速。中途按公版返回鈕離開，計時器與派彩仍在背景跑完（無 unmount 清理）。
- 複驗依據：引用全部命中：instant.js:91 手動路徑硬寫 `opts.playRound(bet, { turbo: false })`；Turbo 勾選框（instant.js:100）只被塞進 autoWrap（:105）且只餵 autobet（:121）；買入鈕 pirots:235 `{turbo:false,forceFS:true}`、dbn:258 `{turbo:false,forceFS:1}`。fastMode()（instant.js:18）只被 animate（:171-175）與 autobet 間隔（:131）讀，`grep gset` 在 slot-pirots.js / slot-dead-by-noon.js / slot.js **零命中**（我實跑），而這兩款的動畫完全走自己的 playEvents（dbn:206-221 / pirots:163-188）純 setTimeout 鏈、只認 ctx.turbo ⇒ 極速模式一秒也省不到。他沒提到但更致命的加分證據：設定列對玩家寫的是「極速模式 — 跳過結果動畫、縮短自動下注間隔（**全遊戲生效**）」（views/game-frame.js:79）⇒ 是明文承諾未實現，不是設計選擇。無中止出口也證實：`grep clearTimeout／cancel／abort` 在兩檔零命中，且 shell 的 mountView（layout/app-shell.js:692-699）只 `HL.dom.clear(main)` 後 append、**沒有任何 unmount/destroy hook** ⇒ 按公版返回鈕離開後，setTimeout 鏈與結算（settle 的 finish 或買入的 mini-settle）仍會在背景跑完。他的時長 MC 我用 300 局獨立種子複算：DBN 買入 p50 7.44s / p90 12.72s / max 28.24s（他 6.96/12.56/23.44）、Pirots 買入 p50 11.06s / p90 20.14s / max 65.58s（他 10.34/20.14/65.30）——同量級、p90 幾乎一致，屬 MC 噪音，結論成立。

**33. towers — Towers 兌現的勝利光環 is-win 加上去後永不移除，之後每一局（含輸局）整座塔都亮著綠色勝利框**（medium／CONFIRMED／S／家族 stale-visual-state）
- 位置：`prototype/src/views/instant-towers.js:136（唯一 add）／instant-towers.js:71-84 buildTower／prototype/src/styles/components.css:1167`
- 重現：開局→爬 1 層→按「兌現」（塔套上綠色勝利外光暈）→按「開始」開新局→綠框整局都還在→第 1 層就踩陷阱，狀態列寫「💥 踩到陷阱」而整座塔仍亮綠色勝利光暈。此後每一局都一樣，勝負無法用畫面判斷。
- 複驗依據：我自己 grep 全檔 `is-win`：instant-towers.js 只有 1 行命中，就是 :136 `towerEl.classList.add("is-win")` — 全檔零 remove。start()(:121-130) 只呼叫 buildTower()，buildTower():72 走 HL.dom.clear(towerEl)，而 core/dom.js:37-40 `clear` 是 `while (node.firstChild) node.removeChild(...)` — 只拔子節點，完全不動容器 classList。CSS 我逐行數到 components.css:1167 `.ax-tower__grid.is-win { box-shadow: 0 0 0 2px var(--ax-green,#34d399), 0 0 22px rgba(52,211,153,.5); border-radius:12px; }` — 靜態 box-shadow，非 animation、無自動結束、也無任何 :not(.is-win) 反向規則可蓋掉。難度切換(:140-144)同樣只 buildTower()。同族 Pump 有補 remove（instant-pump.js:124 700ms 計時器）＝反證這是漏寫而非設計。

**34. towers + pump — Towers 登頂／Pump 撐到極限的專屬慶祝文字在同一 task 內被 cashOut 覆寫＝死碼，最高張力點的回饋與「爬 1 層就兌現」完全相同**（medium／CONFIRMED／S／家族 missing-climax-feedback）
- 位置：`prototype/src/views/instant-towers.js:116 + :135／prototype/src/views/instant-pump.js:101 + :122`
- 重現：Towers 選「簡單」連爬 8 層登頂→畫面直接跳「兌現 9.89× 贏 +XXX」，「🏆 登頂！」一次都沒出現，塔的高亮與爬 1 層兌現無差別。Pump 選「簡單」撐到第 24 次打氣→直接顯示「兌現 24.50× 贏 +XXX」，「🎈 撐到極限！」不出現。
- 複驗依據：towers.js:116 `statusEl.textContent = "🏆 登頂！"; cashOut(); return;`，而 cashOut() 在 :135 同步再指派一次 `statusEl.textContent = "兌現 …"`；pump.js:101 `statusEl.textContent = "🎈 撐到極限！"; cashOut();`，cashOut() 在 :122 呼叫 setStatus()，該函式(:77)先 HL.dom.clear(statusEl) 再 append。兩處都在同一個 click handler 的同步流程內、中間沒有 await/setTimeout/rAF ⇒ 瀏覽器不會在 task 中途 paint，這兩句慶祝文案 100% 不會被畫出來。視覺也確實沒有分級：towers 登頂走的就是 :136 同一個 towerEl.is-win，pump 走的就是 :123 同一個 balloon.is-win。數值我複算過：towers easy 登頂 0.99×(4/3)^8=9.889→「9.89×」、pump easy maxSafe=24（Pump.maxSafe=25-1）最大 0.98×C(25,1)=24.50×，與 repro 相符。額外坐實：pump 的 start()(:113) 只 remove("is-pop") 不 remove("is-win")，且 :124 那顆 700ms 計時器從不被取消 — 若玩家在 700ms 內完成「開始→打氣→兌現」，舊計時器會把新局剛加上的 is-win 提早砍掉（未鎖控件使此連點路徑可達，見下一條）。

**35. 百家樂 / 輪盤 / 龍虎鬥（共用 HL.table，實際 6 款） — 按「重押」後再按「復原」會一次刪掉整個注區的全額（而非退一顆籌碼、也不是取消整批重押）**（low／CONFIRMED／S／家族 missing-control）
- 位置：`prototype/src/core/table.js:46-53、:42、:44、:31`
- 重現：上一局押 閒 500（5 顆 100）＋ 和 100 → 這一局按「重押」（本局總注 600）→ 按一下「復原」：不是 600→500，而是『和』整個 100 直接消失變 500；再按一下「復原」，閒的 500 一次全清變 0。同一顆鈕在手動下注時是一顆一顆退。
- 複驗依據：程式讀出同樣結論。table.js:42 正常 `place()` 每次只壓一筆 `actions.push({id:id, amt:chip})`＝一顆籌碼；:51-53 `rebet()` 卻是 `stakes={}; actions=[]; for(k in last){ stakes[k]=last[k]; actions.push({id:k, amt:last[k]}); }` ＝每個注區壓一筆**聚合金額**的 action；:44 `undo()` 做 `actions.pop()` 並整筆扣 `a.amt`（`stakes[a.id]-=a.amt; if(<=0) delete`）⇒ 重押後按一次復原，整個注區的錢一次消失。同一顆「復原」鈕在手動下注時逐顆退、重押後變成逐區清空，行為不一致（閘第 12 項要求控件齊全且行為可預期）。**一處要修正該稽核員的措辭**：他說「被清掉的注區順序完全由 object key 順序決定，玩家無從預期」——JS 物件的字串鍵是**插入序**（`last` 來自 :60 `for(var k in stakes)` 的快照），所以刪除順序其實是決定性的「最初下注順序的反序」，不是任意/不可預期；他給的 repro 結果（先消失『和』的 100）恰好正確。缺陷本體不受影響，但別把它寫成不確定行為。

**36. 幸運轉盤 Money Wheel — Money Wheel 指針是從不被動畫的靜態三角形、輪面上沒有任何釘（peg/flapper）**（low／CONFIRMED／M／家族 missing-genre-signature）
- 位置：`table-moneywheel.js:148, 133-141, 192-193; prototype/src/styles/components.css:2414-2419`
- 重現：開幸運轉盤→按「旋轉」→全程盯住頂端金色三角指針：輪面在 2600ms 內 cubic-bezier 平滑減速停住，指針本體從頭到尾像素不動；即使最終落點就在 ×7 段隔壁一格，也沒有逐段 tick、沒有指針偏擺、沒有卡邊緣的訊號，只剩 241 行那行文字告知結果。
- 複驗依據：結構性缺席可從程式證明。table-moneywheel.js:148 `el("div", { class: "ax-mw__pointer" })` 是直接塞進 wheel children 的匿名節點，沒有被任何變數接住，全檔（grep `ax-mw__pointer` 只有這一處 JS 命中）再無 class 切換或 transform 覆寫。components.css:2414-2419 的 `.ax-mw__pointer` 只有 position/border 畫的三角形 + drop-shadow，**無 animation、無 transition、無對應 keyframes**。133-141 行 wheelRot 的子節點只有 54 個 `.ax-mw__seglbl`（外加 132 行的 conic-gradient 背景），沒有任何釘/隔板元素。符合 spec 上線閘第 10 項明列的 game-show 必備張力點「指針 tick」與 GAME-SHOW 段「指針 tick 過釘減速…卡邊緣的差一點是核心快感」，所以這不是「與某家平台做法不同」的設計選擇之爭，而是規格具名要求的缺口。 【我駁掉的子主張，故 medium→low】原稿寫「輪面從段邊界滑過時指針不會抖動、不會出現卡在邊緣的視覺」可以，但同段暗示的「無減速」不成立：192-193 行 `transition: transform <dur>ms cubic-bezier(0.15,0.55,0.15,1)` 且最終段 FINAL=2600ms、turns=6 ⇒ 減速是有的、時長也在規格建議的「主輪長轉數秒」內。真正缺的只有 tick/釘/flapper 偏擺這一半，且「平滑減速讀起來夠不夠差一點」需目視判斷 ⇒ 我把它降為 low、視為 enhancement 形狀的缺口，而非破損流程。

**37. 賞金局 · 踩地雷 (bounty) — 把全部安全格翻完之後沒有任何終局：不自動兌現、不提示、盤面就這樣掛著等玩家自己想起要按兌現**（low／CONFIRMED／S／家族 missing-terminal-state）
- 位置：`prototype/src/views/bounty.js:199-200, :207-222; prototype/src/views/instant-crash-mines.js:170`
- 重現：進震盪 low 的踩地雷賞金房（2 顆雷、10 個安全格）→ 開始挑戰 → 把 10 個安全格全部翻開 → 狀態列仍是「翻開格子；💎 累積倍數，💣 出局。地雷數：2」，沒有封頂演出、沒有自動結算；剩下兩格明知是雷卻仍可點，點了就輸掉整注——玩家已達本局上限卻被介面引導去踩雷。
- 複驗依據：程式一致（唯一小誤：TILES=12 在 :200 而非 :199，mineBombs 的 4/3/2 在 :199）。tile click 的安全格分支(:218-221)只做 `mineMult += step; multEl.textContent = ...`，全域沒有 `已翻格數 === TILES - mineBombs` 的判斷、沒有自動兌現、沒有把剩餘格鎖起來或提示；因此翻完 8–10 個安全格後畫面零變化，剩下的 2–4 格全是雷卻仍通過 `if (!mineActive ／／ done) return` 守衛可點，點下去 afterPlay(0) 沒收整注。對照組行號精確：instant-crash-mines.js:170 `if (safeCount === N - mines) cashOut(); // 全翻完`——同專案的正牌 Mines 有封頂自動結算，賞金局沒有。這是回合終局狀態缺失（規格第 9 項）＋期待感封頂缺失（第 10 項），與賠付數學無關。

**38. Crash X — 自動兌現倍數在 start() 時只讀一次、局中輸入框沒被鎖 ⇒ 玩家在爬升途中改的數字是無效的假控件**（low／CONFIRMED／S／家族 missing-control）
- 位置：`prototype/src/views/instant-crash-mines.js:56,97,111,122`
- 重現：自動兌現留 0 → 按「下注 🚀」→ 爬到 1.20× 時把欄位改成 2 → 倍數照樣飛過 2.00×、3.00× 不兌現，一路到崩盤全輸，欄位仍白底可編輯、無任何提示。反向：開局填 5、中途改 1.5，仍要等到 5× 才兌現。
- 複驗依據：line 97 `autoTarget = Math.max(0, +autoIn.value ／／ 0);` 只在 start() 內執行一次，line 111 的判斷用的永遠是這份快照。我對整檔 grep `autoIn` 只有三處命中（56 宣告、97 讀值、122 掛進 DOM），grep `disabled` 的所有命中都是 betBtn/cashBtn/startBtn/randBtn ⇒ autoIn 在整個回合中確實從未被 disabled，也沒有任何 class/樣式切換做視覺鎖定。所以「可以打字、看起來生效、實際被丟掉」的第三種狀態成立，屬無回饋的死控件（保真規格第 12 項）。維持 low：不影響已 commit 的結果，只是玩家的輸入被靜默忽略。

**39. Dice Duel 骰子對決 (dice-duel) — Dice Duel 平手重擲整段被吞掉：resolve() 回傳的 ties 從未被讀，資訊列卻對玩家宣告「平手重擲」**（low／CONFIRMED／S／家族 hidden-round-step）
- 位置：`prototype/src/views/instant-duel.js:33-37（resolve 內 do/while 重擲並回傳 ties）、95（呼叫端只取 res.you/res.oth/res.win）、125（gameInfoBar note:「平手重擲」）、47（rnd→HL.fair.floatOr）、67（histBar fair:true）；prototype/src/core/fair.js:96-102（每次 float 都 unshift 進 history 並 nonce++）、138-141（面板列出近 8 筆「game #nonce 浮點值」）、210+215（PF_GAMES 含 dice-duel ⇒ 🔒 入口存在）；prototype/src/core/ui.js:353（fair 藥丸點擊開 fairnessModal）`
- 重現：連續對戰約 100 局 → 某局內部先擲出 55:55 再擲出 91:12：畫面只顯示 91:12，沒有任何「平手，重擲」的提示或動作 → 點歷史藥丸開 🔒 公平性面板，該局區間會有 4 筆 dice-duel 記錄，最早兩筆換算出的點數（55/55）從未在畫面上出現過，而資訊列同時寫著「平手重擲」。
- 複驗依據：全部對得上。Duel.resolve（33-37）的 `do { you=…; oth=…; guard++; } while (you === oth && guard < 30)` 確實在內部把平手局重擲掉，並回傳 `ties: guard - 1`；呼叫端 95 行原文是 `var you = res.you, oth = res.oth, win = res.win;`——res.ties 從此無人讀取，我全檔搜 ties 只有 36 行那一處定義。UI 三個出口（statusEl 112-113、pushHist 77、卡片 class 110-111）都沒有任何平手路徑。同時 125 行的 gameInfoBar `note: "平手重擲"` 對玩家宣告了一條他永遠看不到的規則＝契約與呈現不符（規格第 9 項「回合流程順序正確完整」＋第 12 項計分板/歷史帶要讀得懂）。可驗證公平那條佐證也成立：rnd() 是 47 行的 HL.fair.floatOr("dice-duel")，fair.js:96-102 每次 float 都 unshift 一筆 {game,nonce,value} 並 nonce++，面板 138-141 逐筆列出並提供「驗證 →」，dice-duel 在 PF_GAMES（210）內故 🔒 入口確實存在，histBar fair:true（67）也確實接 ui.js:353 的 fairnessModal ⇒ 平手局會吃掉 4 個以上 nonce、面板列 4 筆而畫面只給過 2 個數字。P(平手)=1/100 由 rollOf=floor(f*100) 在 0..99 均勻推得，正確。我唯一下修的是嚴重度：影響 ~1% 局、屬透明度/儀式缺失而非每局手感破壞，且面板上兩筆相同點數對細心玩家有一定自證性，故 low 而非 medium。

**40. golden-toad + gem-storm — ⚙ 遊戲設定的「極速模式」對這兩款的旋轉動畫無效，且手動遊玩沒有任何速度控件（ctx.turbo 只有 autobet 會傳）**（low／CONFIRMED／S／家族 missing-control）
- 位置：`prototype/src/views/slot-golden-toad.js:185；prototype/src/views/slot-gem-storm.js:199；prototype/src/core/dom.js:158；prototype/src/core/instant.js:18, :91（他寫 :92）, :121（他寫 :132）, :131；prototype/src/views/game-frame.js:79`
- 重現：Golden Toad 點 ⚙ 勾「極速模式」（描述寫著「全遊戲生效」）→ 回遊戲手動按「旋轉 🐸」：base 仍固定等 360ms、中獎再 520ms，Hold & Win 仍逐事件 520/540/300/600ms 播完，一局動輒 5–10 秒，與沒勾前逐毫秒相同。Gem Storm 同理（免費遊戲 10 轉、每轉每個 tumble 253ms）。唯一會變的是自動下注「兩局之間」的空檔（470→110ms），局內動畫一秒都沒省。
- 複驗依據：instant.js 的兩個行號又偏了（:92 是 `} });`、:132 是 `});`；實際是 :91 `opts.playRound(bet, { turbo: false })` 與 :121 `opts.playRound(bet, { turbo: turbo.checked })`），其餘行號精準（dom.js:158 `function delay(ms){ return new Promise(...setTimeout...) }`、instant.js:18 fastMode()）。他引用的兩段專案自述我也逐字核對過、確實存在：core/game-settings.js:3「對標 Stake 遊戲齒輪慣例：設定一次、所有遊戲生效」，而 game-frame.js:79 那顆齒輪的 UI 描述更是直接寫「跳過結果動畫、縮短自動下注間隔（全遊戲生效）」。程式事實：兩款的節奏唯一開關是 `fast=!!(ctx&&ctx.turbo)`（toad:185 / gem:199）；我 grep 兩檔 `gset／fastMode／"fast"` → 零命中；全站 grep `gset.get("fast")` 只有 instant.js:18 一處，而 fastMode() 只被 animate()（:171-185，兩款都沒用）與 autobet 間隔（:131）消費；兩款所有等待都走 HL.dom.delay ＝裸 setTimeout、無 fast 閘。對照保真閘第 12 項明列 slot 必備 autoplay/turbo。唯一要更正的是標題那句「完全無效」：勾了極速模式，autobet 兩局之間的間隔確實會從 470ms 縮到 110ms（instant.js:131），所以不是零影響；但每一局內部的動畫時長（toad 360/520/540/300/600ms、gem 460/253ms×tumble×轉數）完全不受影響，且手動模式下沒有第二個地方可以加速——這部分證明得很紮實。

**41. hilo — Hilo「同點算輸」這條非直覺房規觸發時毫無專屬回饋：與方向猜錯共用同一句「💥 猜錯」**（low／CONFIRMED／S／家族 flat-feedback）
- 位置：`prototype/src/views/instant-hilo.js:109（嚴格比較）／:117（通用敗訊）／:78 pushHist`
- 重現：開局翻到 7♠→按「⬆ 更高 55% 1.80×」→翻出 7♥→畫面顯示「💥 猜錯，這局結束」，但牌面是同樣的 7，歷史列也只是一顆紅框 pill，沒有任何「同點＝輸」的即時說明（1/13 機率會遇到）。
- 複驗依據：我 grep `=== cur.rank` / `rank ===` 全檔零命中，確認沒有任何平手分支。:109 `good = dir > 0 ? next.rank > cur.rank : next.rank < cur.rank;` 嚴格比較 ⇒ tie 直接落進 :115 else，:116 record(0)+endLock()，:117 只輸出通用「💥 猜錯，這局結束」；:78 pushHist 也只給 is-lose（components.css:2820 紅框 pill），與方向真的猜錯像素級相同。房規本身有揭露（:130 開局狀態列「…更高還是更低？同點算輸」、:158 gameInfoBar note「連對累乘，同點算輸」），這是我把嚴重度從 medium 降到 low 的理由 — 缺的只是「事發當下」的專屬結果狀態（保真規格第 11 項回饋分級），而非規則不透明。

**42. Keno 賓果彩 (keno) — Keno「隨機選號」先清空既有選號且固定只選 5 個 ⇒ 一鍵把 10 星注型降成 5 星、賠付表整張換掉且無法還原**（low／CONFIRMED／S／家族 destructive-control）
- 位置：`prototype/src/views/instant-keno.js:96-106（quickPick）、98（無條件 clearAll()）、100（`for (var p = 0; p < 5; p++)` 硬寫 5）、90-95（clearAll 清 picked/pickCount 與 is-sel）、105→109-118（renderPay 依新 pickCount 重畫賠付表）、70（按鈕僅寫「隨機選號」）`
- 重現：在 1–80 盤上點滿 10 個號（賠付表出現 5✕–10✕ 的 chips）→ 想再隨機加幾顆做對照，按一下「隨機選號」→ 10 個選號全部消失、只剩 5 個隨機號亮起，賠付表塌成 3✕–5✕，原本那 10 個號無法還原，只能一格一格重新點回來。
- 複驗依據：程式與後果都證實。quickPick()（96-106）第 98 行是無條件 `clearAll()`，而 clearAll（90-95）把 `picked = {}; pickCount = 0;` 並移除所有 is-sel；接著 100 行的迴圈是字面上的 `for (var p = 0; p < 5; p++)`＝不論玩家原本選幾個號，一律只剩 5 個隨機號。原選號沒有被保存在任何變數裡（我全檔搜過，沒有備份/undo 路徑），105 行的 renderPay() 走 109-118 依新的 pickCount 重建 TABLES[pickCount] 的 chips ⇒ 玩家正在比對的門檻與倍數整張被換掉（THRESH[10]=5、THRESH[5]=3，起付門檻與整條倍數階梯都變）。70 行的按鈕文字只有「隨機選號」，沒有任何「會清空」或「5 星」的暗示。我考慮過「quick pick 本來就會取代選號」這個反駁，但真實 quick pick 是補到／沿用玩家的星數，硬寫 5 是把玩家已排好的注型（keno 的注型就是選號數，決定整張賠付表）在無確認、無還原的情況下換掉，屬破壞性控件而非單純便利鍵。嚴重度維持 low（不涉金流、可手動點回）。

**43. Mines — 「下一格」計分板在翻完最後一個安全格時顯示 Infinity×，並留在畫面上直到下一局**（low／CONFIRMED／S／家族 scoreboard-garbage）
- 位置：`prototype/src/views/instant-crash-mines.js:148,29,170,157,204,152`
- 重現：地雷數選 24 → 開始 → 點中那唯一一格安全格（1/25 機率，約每 25 局一次）→「下一格」統計格顯示「Infinity×」，全清自動兌現後仍持續顯示，直到下一次按「開始」才被覆寫。mines=3 時同樣會發生（需翻滿 22 格）。
- 複驗依據：line 148 `nextEl.textContent = active ? (fairMult(safeCount + 1).toFixed(2) + "×") : ...` 無條件算下一格；line 29 `Mines.fairMult` 的分母是 `(N - mines - i)`，i 走到 N-mines 時為 0。我用 node require 本檔的匯出實測：mines=24 時 fairMult(1)=24.75、**fairMult(2)=Infinity**、`.toFixed(2)` 得字串 "Infinity"；mines=3 時 fairMult(22)=2277.00、fairMult(23)=Infinity ⇒ 兩個路徑都會發生，行為與描述一致。時序也讀證了：line 169 先 `safeCount++; refreshMult();`（此時 active 仍為 true ⇒ 印出 Infinity×），line 170 才 `if (safeCount === N - mines) cashOut();`，而 cashOut→line 152 lockAll 只設 active=false、不再呼叫 refreshMult ⇒ 字串殘留到下一次 start()。line 157 的地雷數選項 [1,3,5,10,24] 確含 24，line 204 `stat("下一格", nextEl)` 也對。維持 low：純顯示垃圾、不影響金流。

**44. Pirots 探險 — 未開局的靜態擺設盤含 2 組「按遊戲自己的規則必定要被收集」的 ≥6 同色連通群，且固定種子＝每次載入都一樣**（low／CONFIRMED／S／家族 illegal-resting-state）
- 位置：`prototype/src/views/slot-pirots.js:158, prototype/src/views/slot-pirots.js:59`
- 重現：從大廳點進「Pirots 探險」，什麼都不要按：盤面固定擺著 9 格相連的 🟥（(2,4)(3,3)(3,4)(3,5)(4,2)(4,3)(4,5)(5,1)(5,2)）與 7 格相連的 🟨（(2,1)(2,2)(2,3)(3,1)(3,2)(4,0)(4,1)），而下方資訊列（:253）同時寫「連通同色 ≥6 鳥即收集」——依自家規則早該被吃掉的盤面靜靜停著；按下旋轉後這盤又被整個換掉，它也不是任何真實局的殘留。
- 複驗依據：renderResting（:157-160）確實用硬寫常數種子 `mulberry32(0x1234)` 填盤後直呼 renderGrid，中間沒有任何「重抽到無 cluster」過濾；:245 在掛載前呼叫它 ⇒ 玩家進場看到的就是這盤。我在 node 用檔內同一份 drawSym/fillGrid 重建該盤並跑 `findClusters(g,6)`，回傳**恰好 2 群：色 2（🟨）7 格、色 0（🟥）9 格**，與他的數字完全一致（minCluster=6 定義在 :28，判定在 :59）。硬編種子 ⇒ 非機率問題、每次載入必然重現。反向查證加分項：DBN 的 renderResting（:204，seed 0x51A4）我也跑了 evalLines，`units=0`、零中獎格 ⇒ 這條**只屬於 Pirots**，他沒有錯誤地擴大成兩款通病。我唯一下修的是嚴重度：這是靜態裝飾盤、不影響任何回合流程或金流，屬第一印象/規則教學層面。

**45. Pirots 探險 / Dead By Noon（兩款同一缺陷） — 買入 FS 的回合繞過 betPanel.settle()，面板的「上一局」計分板不會反映買入結果**（low／CONFIRMED／S／家族 flat-feedback）
- 位置：`prototype/src/views/slot-dead-by-noon.js:259, prototype/src/core/instant.js:78, prototype/src/views/slot-pirots.js:236`
- 重現：先普通旋轉一次輸掉 → 面板顯示「輸 50」。接著按「購買免費遊戲 43.4×」並贏 500 → 歷史膠囊列多一顆 is-win 的 ×N，但面板「上一局」仍寫「輸 50」；買入的輸贏只出現在幾秒後消失的 toast 裡，玩家回頭想確認這筆最大額回合的賺賠時，計分板給的是上一筆普通旋轉的數字。
- 複驗依據：買入路徑（dbn:259-265 / pirots:236-242）在 `r.done.then` 內自行算 payout、自行 setBal、自行 `HL.liveStats.record`，**完全沒有經過 settle()**；而 `lastEl`（「贏 +N／輸 N」那一行）唯一的寫入點是 settle 內的 finish()（instant.js:78），且 lastEl 未出現在 api（instant.js:142-148）⇒ 外部無法更新。反向確認 history 確實有被更新：`history.push(...)` 位於 playRound 收尾（dbn:240 / pirots:215），兩條路徑都會經過 ⇒ 歷史膠囊列有買入那筆、面板「上一局」沒有，**兩個計分面板互相矛盾**成立。唯一即時回饋是 toast（dbn:263 / pirots:240），數秒後消失。低嚴重度、修法小（買入改呼叫 panel 提供的結算出口或補一個 setLast API）。

**46. pump — Pump 爆裂動畫 keyframes 假設氣球在 scale(1)，實際 inline transform 可達 scale(1.99)：💥 先縮小、0.4s 後彈回膨脹尺寸並停住**（low／CONFIRMED／S／家族 stale-visual-state）
- 位置：`prototype/src/views/instant-pump.js:85-86（inline scale）／:94-97（爆裂路徑提前 return）／prototype/src/styles/components.css:156 與 :158`
- 重現：選「簡單」連打 12–16 次氣把氣球脹到近 2 倍→下一次打氣爆裂→💥 先縮小一截、彈一下，0.4s 結束時突然跳回原本的膨脹尺寸並停在那裡（文字已是 💥），直到按「開始」才被 refreshHUD 拉回 scale(1)。
- 複驗依據：三個環節都從程式/CSS 直接證明：① refreshHUD():85-86 把 `transform: scale(1 + Math.min(cur,16)*0.062)` 寫成 inline style，cur=16 時 1.992；② pump() 的爆裂路徑 :94-97 在 `cur++; refreshHUD()`(:99) 之前就 return，所以 inline 的膨脹 scale 完全沒被重設，只 add("is-pop")，且 :113 start() 才會 remove("is-pop")；③ 我逐行數到 components.css:156 `.ax-pump__balloon.is-pop { animation: ax-pump-pop 0.4s var(--ax-ease); }` — 沒有 animation-fill-mode，:158 keyframes 是 `0% scale(1.15) → 40% scale(1.5) → 100% scale(1)`。依 CSS 級聯，animation origin 高於 inline style ⇒ 動畫期間氣球從 1.992 被壓到 1.15；動畫結束無 fill-mode ⇒ computed transform 退回 inline 的 1.992，尺寸走向非單調且結束狀態是「爆裂前的體積」。機制已證，僅「跳動有多刺眼」需目視，故維持 low。

**47. towers — Towers 登頂後 HUD「下一層」停在不存在的第 9 層倍數（同檔家族的 Pump 同位置有做極限處理＝反證漏寫）**（low／CONFIRMED／S／家族 scoreboard-lies）
- 位置：`prototype/src/views/instant-towers.js:65（refreshMult 的 nextEl）／:114-116（登頂路徑）／對照 prototype/src/views/instant-pump.js:81`
- 重現：Towers 選「簡單」爬滿 8 層登頂自動兌現→回合已結束（開始鈕復活、兌現鈕灰掉），但頂部計分板「下一層」仍寫著 13.19×，看起來像還能再爬一層去拿它。
- 複驗依據：ROWS=8(:15)。pick() 在第 8 層成功後 `cur++`(:114) 使 cur=8 並先呼叫 refreshMult()，此時 active 仍為 true，:65 `nextEl.textContent = active ? (fairMult(cur+1).toFixed(2)+"×") : …` 於是寫入 fairMult(9)=0.99×(4/3)^9=13.185→顯示「13.19×」；緊接 :115-116 `if (cur === ROWS) { statusEl…; cashOut(); return; }`，而 cashOut():136 只呼叫 revealTraps()+endLock()，endLock():100 只做 active=false／按鈕鎖／markRows() — 不重算 refreshMult ⇒ 幻影第 9 層倍數留在計分板直到下一次 start()。同家族的 Pump 在同一情境有正確處理：instant-pump.js:81 `active && cur < maxSafe ? fmtMult(fairMult(cur+1)) : (active ? "極限" : …)`。

**48. towers + hilo + pump — 「兌現」鈕在開局瞬間就 enabled，但此時點下去 100% 被拒並吐 warn toast — 主 CTA 的可用狀態與實際可用性不符（三檔同一寫法）**（low／CONFIRMED／S／家族 lying-control-state）
- 位置：`prototype/src/views/instant-towers.js:128 與 :133／prototype/src/views/instant-hilo.js:128 與 :134／prototype/src/views/instant-pump.js:115 與 :120`
- 重現：任一款按「開始」（「兌現」立刻變成可按的金色主鈕，在 towers/hilo 還緊貼剛變灰的「開始」旁）→直接按「兌現」→沒有兌現，只跳一個警告 toast。
- 複驗依據：六個行號我逐一核對全部正確：三檔 start() 都在還沒有任何進度時就解鎖 cashBtn（towers:128 `cashBtn.disabled = false`（此時 cur=0，:125 才剛設）、hilo:128（streak=0，:125 設）、pump:115（cur=0，:110 設）），而 cashOut() 的第一件實質檢查就是把該狀態擋掉並吐警告：towers:133 `if (cur === 0) { HL.ui.toast("至少爬一層再兌現","warn"); return; }`、hilo:134 `if (streak === 0) …`、pump:120 `if (cur === 0) …`。三檔的 pick/guess/pump 成功路徑也確實都沒有「首次成功才解鎖 cashBtn」的處理（因為早就 enabled）。按鈕 class 是 `ax-btn-primary ax-crash__cash`＝視覺上的金色主鈕。我不採信「Stake 的 Cashout 要第一步後才亮」這條外部平台依據，但缺陷本身自成立：控件狀態說「可按」而程式保證拒絕，等於把控件狀態的錯誤丟給玩家承擔（保真規格第 12 項）。

**49. 小雞過馬路 (chicken) — 死亡演出的三段 setTimeout 沒有 epoch 世代閘（同檔每一個 RPC 回呼都有）⇒ 離開再進來，全新一局還沒下注就自己燒死並彈出「小雞陣亡 · 輸掉」；playDeath 取 lanes[-1] 讓「撞車」靜默降級成「火燒」**（low／PLAUSIBLE／S／家族 stale-timer）
- 位置：`prototype/src/views/chicken.js:216-219, :234-239, :240-241, :246, :260-265, :58, :163, :191, :199, :273, :350; prototype/src/main.js:51`
- 重現：難度「普通」→ 按「出發（押 NT$ 20）」→ 在小雞起跳、💀 還沒出現的那不到 0.4 秒內按公版返回鈕回娛樂城 → 娛樂城頁面上冒出一則「小雞陣亡 · 輸掉 NT$ 20」toast（上一局的殘留計時器）。若能在同一個 0.4 秒內再點進「小雞過馬路」，新的乾淨待機頁會自己播 🔥 燒死動畫、狀態列寫「💀 …本輪結束，押注輸掉。」（撞車死法被 lanes[-1] 靜默改寫成火燒），1.5 秒後才被 resetRound 掃乾淨——此變體窗口極窄，我未能證明人手可達。
- 複驗依據：行號全部精確、機制我也讀出同樣結論：hopTo 的 setTimeout(done,380)(:219)、hopDeath 的 setTimeout(playDeath,400)(:238)、playDeath 撞車支的 330ms(:246)、afterDeath 的 setTimeout(resetRound,1500)(:264) 一個都沒有 `var tk = epoch` 守衛，而同檔每個 RPC 回呼都有(:163/:191/:199/:273，:58 註解自陳)；render() 只在重進時 `st = freshState(); epoch++`(:350)，playDeath 讀的是模組全域 st/lanes/chickEl；lanes[-1] 降級也對（新 st.step=0 → `kind==="car" && ln` 為假、非 hole ⇒ 掉進 else 火燒支）。降級為 PLAUSIBLE 的理由是原文的重現路徑站不住、且可達性沒被證明：(1) 「💀 字樣剛出現時按返回」時 playDeath 與 afterDeath 已經執行完了，此刻只剩 resetRound 那顆——而 resetRound(:308-313) 第一列 `if (st.active) return`，對一個剛重進的乾淨頁面只是把已經是初始態的東西再重設一次，無害；要看到原文描述的幽靈火燒＋「陣亡 −NT$20」toast，必須在『致命那一跳的 400ms(火/井)或 730ms(車)之內』完成「按返回 + 重新點進小雞」兩次點擊，而 demo 路徑的死亡判定在按下出發的同一 tick 就發生 ⇒ 手動幾乎不可達。(2) 會員路徑無此問題（:199 的 epoch 守衛在 hopDeath 之前）。真正可達的殘留是較小的一種：在那 400ms 內只按一次返回，回到娛樂城後會冒出一則來自上一局的「小雞陣亡 · 輸掉 NT$ X」toast（toast 是全域），畫面狀態寫入的是已 detach 的節點。結構債真實存在、值得修，但嚴重度與可重現性都低於原判。

**50. 暗影儀式 Shadow Ritual (slot.js) — 沒有停輪期待感（anticipation）：停輪時長只由輪索引決定，開獎盤面已知卻不用來製造張力**（low／PLAUSIBLE／M／家族 missing-tension）
- 位置：`prototype/src/views/slot.js:323 / :483-487 / :327`
- 重現：儀式條停在 18/20（再一顆 ❤ 就升級）連續旋轉 → 即使前 3 輪已停出 2 顆 ❤，第 4、5 輪的停輪時長仍固定 1.0s/1.1s，與完全沒中的旋轉一字不差（需目視確認玩家實際是否感受不到加壓）。
- 複驗依據：程式事實我完全證實：322-326 的迴圈裡 `var dur = 0.7 + r * 0.1;`(323) 的唯一輸入是輪索引 r，與盤面內容零關聯，總停輪時間 327 也是常數 1220ms＝每一注停輪節奏一模一樣；而做 anticipation 所需資訊在動畫開始前全部在手（483 makeGrid 已定 finalGrid、484 applySticky、485 maybeXSplit、486 st.grid=g，487 甚至已預先排定 xSplit 的 toast）。降為 PLAUSIBLE 的理由：這是「缺一項可選演出」而非壞掉的行為——本機並非沒有張力裝置（儀式條 282-283 逐注推進、bloodToBar 366-375 的獻祭血滴、bigWin 446-463 三階慶祝、xSplit toast 487），且「哪一輪該放慢、放慢多少才有感」屬設計/手感決策，需 preview 目視校準才知道現況是否真的不足；把它當硬缺陷會滑向「與某家商業機台做法不同就算 bug」。建議當低優先手感增益卡處理，不是缺陷。

**51. 輪盤 Roulette — 開號瞬間輪面彈回起始角度：axRouSpin 只有 to{rotate(360deg)}、fill-mode 為 none，class 一移除 transform 立刻歸零**（low／PLAUSIBLE／S／家族 animation-end-not-committed）
- 位置：`prototype/src/views/table-roulette.js:136-138、:58；prototype/src/styles/components.css:2630-2636、2643-2644`
- 重現：按「旋轉」→ 盯著輪面上緣的金色指針三角形 → 2200ms 號碼出現的同一 frame，指針從約 51° 的位置瞬間彈回正上方（紅黑楔形因 36° 週期只讀到約 15° 的抽動）。每局結束都會出現這個與「停下來」物理直覺相反的回彈。
- 複驗依據：**機制成立、數字錯、觀感需目視**。機制部分我讀出同樣結論：components.css:2635 `animation: axRouSpin 0.7s linear infinite`＋:2636 `@keyframes axRouSpin{to{transform:rotate(360deg)}}`，既沒有 `animation-fill-mode: forwards` 也沒有在停轉前把當下角度寫回 inline transform（全檔 grep 無 `wheel.style.transform`），`.ax-rou__wheel`（:2630-2634）也沒有任何 `transition` 可以緩衝；table-roulette.js:136-138 在同一 task 內 `remove("is-spinning")` + `setPocket(result)` ⇒ 元素回到未動畫狀態 `transform:none`(0°)，:2643 的反向補償 `axRouCounter` 同時被移除。這正是專案認定的高產角度（動畫結束態未提交）。**但該稽核員的量化是錯的**：2200 / 700 = 3.1428 個週期，餘 100ms ⇒ 約 51.4°，不是他寫的「1.428 個週期 ≈ 154°」；而且背景是 36° 週期的 repeating-conic-gradient，紅黑楔形的視覺跳動實際只讀到 51.4−36 ≈ 15°。真正穩定可見的彈跳是他漏掉的那個：`.ax-rou__pointer` 是 wheel 的子節點（table-roulette.js:58），會整段跟著轉，停轉瞬間那顆金色三角形會從約 51° 的位置整體彈回正上方。另外 animation 起算時間是 class 套上後的第一次樣式 flush、setTimeout 又只保證 ≥2200ms，所以移除瞬間的相位有抖動、非定值。⇒ 缺陷真實存在但屬 #1 那張大卡的附帶修法，嚴重度需 preview 目視定級。

**52. ApexWin Picks 賽事預測 (picks) — Picks 每下一單就把沒下注的另外兩場賽事也整批重生，且無 rebet、無局內歷史帶**（low／PLAUSIBLE／S／家族 state-churn）
- 位置：`prototype/src/views/instant-picks.js:180-182（slate = makeSlate(); sel = null; 重繪）、67（makeSlate 每次產 3 場全新 fixture）、60-66（makeFixture 隨機隊名/機率）、82（record→HL.liveStats.record("picks",...)）；對照 prototype/src/views/instant-duel.js:67 與 prototype/src/views/instant-cases.js:72（都有 histBar）；prototype/src/core/live-stats.js:57（→HL.betlog.record）；prototype/src/core/betlog.js:47-56（逐局落地 game/bet/win/倍數/淨額/clientSeed/nonce）`
- 重現：進 Picks → 記下第三場「客 @ 2.90」這條想等一下打 → 先在第一場下一注 → 結算後第三場（含 2.90 那條線）已被換成一場隨機新對戰，且沒有任何按鈕能重複剛才那一注、遊戲畫面內也沒有任何歷史帶（要查得離開遊戲開注單中心，而且那裡只有金額/倍數、沒有盤口）。
- 複驗依據：拆成三個子主張分別查證，結果一半成立一半被我駁掉。①「整批重生」成立：181 行確實 `slate = makeSlate(); sel = null;`，而 67 行 makeSlate() 是 `[makeFixture(), makeFixture(), makeFixture()]`＝三場全部丟掉重抽，玩家沒碰的兩場與剛比價的賠率一起消失；剛結算的 fixture 物件也被丟棄 ⇒ 結構上無法再下同一盤口，也確實沒有 rebet 控件。但這是 180 行註解「換新賽程、清選擇（讓玩家繼續下一單）」明示的刻意設計，且賽程本身是純 mock（makeFixture 60-66 全隨機），不存在真實 coupon 需要維持穩定的義務——把它當 FAIL 級缺陷是把設計選擇當缺陷，故不給 CONFIRMED。②「無局內歷史帶」成立且是規格第 12 項（instant 家族需歷史/統計帶）的實質缺口：picks 全檔無 histBar，而 duel(67)/cases(72) 都有，我逐檔比對確認。③「零可追溯／狀態列是唯一結果載體」被我駁掉：picks 82 行走 HL.liveStats.record，live-stats.js:57 接 HL.betlog.record，betlog.js COLS（47-56）逐局落地編號/時間/遊戲/押注/贏分/倍數/淨額/clientSeed/nonce 共 500 筆環形緩衝並可開面板與匯出 CSV ⇒ 押注額、派彩、實得倍數（中獎時即等於實付賠率）都查得到，只有「哪一場、哪個盤口」沒被記。原稿據此推出的高強度結論站不住。綜合：方向對（該補局內歷史帶＋rebet），但頭條框架有一半是設計選擇、一半被平台級注單中心抵銷 ⇒ PLAUSIBLE、降為 low。

**53. Crash X — Crash/Mines 沒有自動下注／Turbo（自帶 amountField 而非 betPanel），只有一個自動兌現倍數**（low／PLAUSIBLE／L／家族 missing-control）
- 位置：`prototype/src/views/instant-crash-mines.js:46,56,133；prototype/src/core/instant.js:95-134（autobet）、:21-34（熱鍵）、:149（hkPanel 只由 betPanel 指派）、:154-167（amountField）`
- 重現：進 Crash X → 沒有「手動／自動」頁籤：填了自動兌現 2× 後，每一局仍須手動按一次「下注 🚀」，無法設「跑 50 局、輸後加注 20%、止損 5000」；按 Space 也不會下注（同一批 instant 遊戲裡走 betPanel 的 Dice/Limbo/Cases 可以，Crash/Mines/Towers 靜默無反應）。
- 複驗依據：程式事實全部查證為真：crashGame line 46 與 minesGame line 133 都用 `HL.instant.amountField(50)`（core/instant.js:154-167＝只有輸入框＋½/2×/Max，回傳 {node,get,set,input}，沒有 tabs、沒有 autobet、也沒有 settle）；instant.js:95-134 確實已實作整套 autobet（局數 0=∞、贏後+%、輸後+%、止盈、止損、Turbo、餘額不足/撞 rg 限額自動停）；:21-34 的 Space/S/A/D 熱鍵只作用於 `hkPanel`，而 hkPanel 僅在 betPanel 尾端 :149 被指派，且 :26 會在面板離開 DOM 時把它清成 null ⇒ 在 Crash/Mines/Towers 按 Space 確實完全沒反應，而隔壁走 betPanel 的 Dice/Limbo/Cases 可以。但我不給 CONFIRMED，因為缺陷認定有兩個未證成的前提：①「共用引擎裡現成的 autobet 完全沒用到」暗示可直接沿用，實際上 betPanel 的 settle(bet,res) 模型（:71-83，一次 playRound → 依 multiplier 結算）**結構上無法表達「回合中手動兌現」**，Crash/Mines 要接 autobet 得另寫回合驅動或限定「已設自動兌現時才可自動」——這也是原稽核員自己標 fix_size L 的原因；②「缺一半招牌控件」是類型慣例＋範圍取捨的判斷，程式裡沒有任何行為出錯，只是功能不存在。真正 code-provable 的部分是熱鍵在同一批 instant 遊戲間不一致（靜默死區）。據此把嚴重度由 medium 降為 low。

**54. Dice — Dice 指針在點擊當下就被設到落點：正常動效 100ms 走完 87%、關動效直接瞬移＝答案先出來，300ms 後才給輸贏回饋**（low／PLAUSIBLE／M／家族 premature-reveal）
- 位置：`prototype/src/views/instant-games.js:124-135 · prototype/src/styles/components.css:1095,2945-2947`
- 重現：⚙ 遊戲設定 → 關閉「介面動效」→ Dice 按「擲骰 🎲」：金色指針在按下當幀就跳到落點（.ax-anim-off 把 transition-duration 壓成 0.001ms），大字這時才從上一局數值往新值跑（:124 from=parseFloat(rollBadge.textContent)，與 Limbo 同一個「從上一局內插」形制），300ms 後才變紅/綠、才進歷史、餘額才動。需目視確認這段 300ms 是否讀起來像死時間。
- 複驗依據：引用全部正確：components.css:1095 確為 `.ax-dice__pointer { … transition: left .3s cubic-bezier(.22,1,.36,1); }`；:2945 起是 `.ax-anim-off *…{ transition-duration:0.001ms !important }`（transition-duration 實際在 :2947，規則起於 :2945，可接受）；instant-games.js:126 在 playRound 進場即 `pointer.style.left = roll + "%"`，而配色/is-bounce/history/派彩全塞在 :129-135 的 setTimeout(300)。他的 bezier 數字我用 node 二分反解 x(t) 驗過：p=1/3(100ms)→0.8667、p=0.5(150ms)→0.9614，『~0.87』正確。但我不給 CONFIRMED：整個揭曉閘只有 300ms，指針滑行本身就是合法的揭曉動畫，『指針比配色早到約 150-200ms』是否構成手感缺陷需要目視判斷；他最硬的那半（關動效時指針瞬移、而 count-up 走 rAF 不受 CSS kill-switch 影響 ⇒ 落點 t=0 → 數字 0-280ms → 配色/歷史/餘額 t=300 的順序倒置）本質上與第 4 條同源（同一個沒被 fastMode 打通的 300ms 閘），且『玩家自己關了動效所以瞬移是預期行為』的反解釋我無法從程式排除。降為 low。

**55. Dice Duel 骰子對決 (dice-duel) — Dice Duel 雙方點數在同一 tick 同時揭曉、勝負光暈與結論同時出現**（low／PLAUSIBLE／S／家族 flat-feedback）
- 位置：`prototype/src/views/instant-duel.js:103-105（先進「擲骰中…」+ is-rolling + 「?」）、106（單一 800ms setTimeout）、107-113（同 tick 移除 is-rolling／寫兩個分數／掛 is-winner／is-loser／寫結論）`
- 重現：設定賭注 → 按「對戰」→ 兩邊分數顯示「?」抖動 800ms → 下一 frame 同時出現：你 87、對手 42、你方卡片綠框、對方變暗、狀態列「🏆 你贏了！贏家通吃 +$xx」。全程沒有任何一刻是「你 87、對手還在擲」。
- 複驗依據：程式事實我完全複驗成立：106 行只有一個 800ms setTimeout，回呼裡 107（移除兩邊 is-rolling）、108（youScore 與 oppScore textContent 相鄰兩行）、110-111（勝負 class）、112-113（結論文字）全在同一 tick，畫面上不存在「只有一個數字」的時刻。但我不接受它被算成已證實缺陷，理由有二：①103-105 行其實已經有一個張力節拍——setStatus(「擲骰中…」)＋兩邊 is-rolling 抖動＋顯示「?」持續 800ms，所以原稿「1v1 的懸念完全不存在／唯一的張力點被抹平」是過度陳述，存在的是「節拍不夠分層」而非沒有節拍。②「對立擲點必須有序揭曉」這個前提沒有被證明：保真規格第 4 項的「絕不同時」是針對 slot 轉輪（左到右停），第 10 項列舉的關鍵張力點也沒有對稱決鬥的條目；而對稱型決鬥／擲硬幣／case-battle 在真實產品裡同時揭曉相當常見 ⇒ 這一條落在「與某家平台做法不同」這側，屬可做得更好的加分項（先我方落定、再對手擲），不是可判 FAIL 的缺陷。故降級為 PLAUSIBLE 並下修嚴重度。

**56. Pirots 探險 — 對玩家宣稱的「鳥收集寶石」機制在畫面上不存在：無收集者實體、無每色進度**（low／PLAUSIBLE／S／家族 wrong-genre）
- 位置：`prototype/src/views/slot-pirots.js:253, prototype/src/views/slot-pirots.js:49, prototype/src/views/slot-pirots.js:141`
- 重現：進 Pirots 玩任何一局：資訊列說「鳥即收集」，但盤面從頭到尾找不到鳥（🦜 只會偶爾作為 scatter 出現在某格）；收集發生時是所有顏色的所有群在同一拍（420ms）一起縮小消失，沒有「飛向某個收集者」的方向感，也沒有可追蹤的收集進度 ⇒ 玩家沒有可投射期待的對象（保真第 10 項），且畫面文字與實際機制不符。
- 複驗依據：核心觀察成立但寫法有一處實質錯誤，且一半論據落在「與外部產品不同＝設計選擇」的禁區，故降為 PLAUSIBLE。**成立部分（全部我自己讀出）**：findClusters（:49-62）無收集者座標、無每色計數；`collected`（:82）是單一總數，唯一用途是版面擴張門檻（:89）；renderGrid（:141-151）只產出 `.ax-pir__cell`；grep components.css 的 ax-pir 全部 24 條規則（3029-3052）確實**沒有任何鳥/收集器元素**；🦜 只是 scatter（:123-124 `v===-1?SCAT`）；收集是單一 collect 事件、單一 420ms（:174-181）一次收掉所有顏色所有群，沒有方向感也沒有進度條；而資訊列（:253）對玩家寫「連通同色 ≥6 **鳥即收集**」、檔頭 :5 寫「鳥 CollectR 收集」⇒ 畫面文案承諾了程式沒有的東西，這一條是真缺陷。**駁回/更正部分**：他說 findClusters 是「純顏色無關的連通判定」——**錯**，:58 的 flood fill 明文要求 `g[nr][nc]===col`，群一定同色；他真正想說的是「無每色收集者閘門」。另外「ELK 的 Pirots 有鳥、我們沒有」本身是產品簡化選擇，不能當缺陷；而他開的 fix_size L（新增收集者實體與升級系統）也偏離最小修法——可證明的缺陷只是文案與實作不符，改文案是 S。

**57. pump — Pump「打氣 +」同一顆按鈕重複點擊推進風險，卻無 commit lock／去抖：雙擊＝兩次爆裂判定連跑**（low／PLAUSIBLE／S／家族 no-commit-lock）
- 位置：`prototype/src/views/instant-pump.js:92-104（pump 全同步）／:115 與 :90（disabled 只在 start/endLock 切換）／prototype/src/styles/components.css:155`
- 重現：選「專家」（25 槽 10 尖刺，第 1 次爆裂率 40%）→ 只想打一次氣但滑鼠雙擊「打氣 +」（或焦點在鈕上按住 Enter 觸發鍵盤自動重複，間隔約 30ms）→ 連續兩次 pump() 各自做一次爆裂判定，第二次的決定玩家實際上沒做出；氣球 0.18s 脹大過渡也在中途被改寫成新目標值，永遠到不了上一步的尺寸。
- 複驗依據：程式事實我全部證實：pump()(:92-104) 由頭到尾同步，無 busy flag、無時間戳去抖、不等任何動畫；pumpBtn.disabled 全檔只在 start():115（設 false）與 endLock():90（設 true）被動過，pump() 內完全不碰。氣球只有 components.css:155 的 `transition: transform var(--ax-dur)`（tokens.css:102 `--ax-dur: 0.18s`），連點只是不斷改寫目標值、不會排隊。也證實 Towers 有結構性保護（instant-towers.js:103-104 `r !== cur` ＋ is-open/is-trap 雙擋，不可能被雙擊多推一步）而 Pump 沒有。**但降級為 PLAUSIBLE 的理由**：repro 的關鍵斷言「同一 frame 內執行兩次 pump()」不成立 — 雙擊是兩個獨立的 click event、落在兩個獨立 task，中間必然有 paint（80ms 間隔≈5 frames），HUD 的爆裂率/倍數/氣球尺寸其實有被畫出來，只是玩家來不及反應。所以「玩家看到第一次結果之前」未被程式證明，屬感知層主張，需目視才能判定嚴重度；「Stake 每次打氣要等動畫播完才可再按」也是外部平台做法、不能單獨當缺陷依據。真正站得住的核心只有「主要風險鈕無冷卻＝誤觸雙擊會多賭一步」。

**58. 安達巴哈 Andar Bahar — 安達巴哈發牌節奏被「總時長固定 1600ms」倒著壓縮：局面越長（越懸疑）每張牌反而越快**（high／CONFIRMED／S／家族 inverted-tension-pacing）
- 位置：`prototype/src/views/table-andar-bahar.js:151 (+157-163, 176); prototype/src/styles/components.css:2211`
- 重現：開安達巴哈→押 Andar→連按「發牌」十餘局並注意每張牌的落牌間隔：2–3 張的短局每張 150ms（看得清），13 張的典型局每張 123ms（每張都在前一張 320ms 進場動畫未完成時落下），29 張以上的長局觸底 55ms（一團閃影、無法數清）。最該緊張的長局讀起來最快，且整局發牌時間被鎖在約 2.0–2.1 秒（len 11/13/20/29 的總發牌時長分別為 2055/2059/2060/2055ms，幾乎不變）。配對那一張的贏方高亮在該牌出現的同一幀亮起。
- 複驗依據：行號逐字對上。table-andar-bahar.js:151 = `var stagger = Math.max(55, Math.min(150, Math.round(1600 / Math.max(1, o.seq.length))));`，157-163 的 forEach 用 `startAt + i * stagger`（startAt=460）排每張牌，161 行 is-win 與最後一張 append 同 task。components.css:2211 `.ax-card--in { animation: axCardIn 0.32s … }` 確認進場動畫 320ms。我用該檔自己的 module.exports 跑 20 萬局（node -e require table-andar-bahar.js，Math.random 供給）並算 stagger：len 10→150ms、11→145、13→123、20→80、29+→55（觸底，佔 8.39% 局）。⇒ 每張牌時間確實與張數成反比＝張力反向，程式可證。實測分布 mean 12.93 張、max 49、p50 11 / p90 27 / p99 40（原稿寫 mean 13.45 / max 47 略有偏差，不影響結論）。overlap 算術也對：13 張局 123ms 間隔 vs 320ms 動畫 ≈ 2.6 張同時在動。違反 game-fidelity-spec.md 鐵則 1（張力節拍要刻意拉長）與上線閘第 10 項。 【必須降級的子主張】原稿說「最後一張（配對牌）沒有任何專屬拍」不成立：第 176 行的結算閘門是 `startAt + len*stagger + 340`，而最後一張落在 `startAt + (len-1)*stagger`，兩者相距 stagger+340（13 張局 ≈ 463ms），所以配對牌之後確實有近半秒的停頓。真正站得住的只是「贏方 is-win 高亮與該牌 append 同一 task/同一幀」（161 行）。

**59. 百家樂 / 輪盤 / 龍虎鬥（實際影響全部 6 款 HL.table 桌遊） — settle() 一次性總額 setBal，且同一 task 內 area.clear() 把中獎與落敗籌碼同時抹掉 —— 無「先掃輸家再付贏家」、無逐項結算**（high／CONFIRMED／M／家族 flat-feedback）
- 位置：`prototype/src/core/table.js:66-72；prototype/src/views/table-baccarat.js:189-196、table-roulette.js:140-145、table-dragon-tiger.js:148-154`
- 重現：百家樂押 閒 500 + 和 100 → 按「開牌」→ 開出閒贏。同一 frame 內：閒區亮金框、和區 100 籌碼消失、閒區 500 籌碼也一起消失、餘額直接跳到淨額。玩家看不到「和被收走」，也看不到「500 留在閒區被賠 500」，只看到全部籌碼一起蒸發。
- 複驗依據：table.js:66-72 的 `settle` 確實把所有注區折成單一 `payout`（`for(k in snap){staked+=…; payout+=Math.round(snap[k]*ret[k]);}`）後 `if(payout) setBal(bal()+payout)` ＝一次 setBal、零逐項、零順序。我另外追進 core/instant.js:16 `setBal` ＝ `HL.state.set({balance:…}) + refreshChrome()`，**沒有任何 count-up/roll-up**，所以餘額確實是一次跳號。三款 view 的揭曉 timeout 內順序也如描述、且全在同一個同步 task（無 await/rAF/巢狀 timeout）：baccarat 189 `area.settle` → 194 statusEl → 196 `area.lock(false); area.clear();`；roulette 140 → 143 → 145；dragon-tiger 148 → 152 → 154。`clear()`（table.js:45）→ `changed()`（:37）→ `opts.onChange` → 各 view 的 `renderStakes()` 把 badge 設為 `""`，配合 components.css:2240 `.ax-bacc__stake:empty{display:none}` / :2302 `.ax-dt__stake:empty` / :2627 `.ax-tbl__stake:empty` ⇒ 中獎與落敗注區的籌碼徽章在同一 frame 一起消失。規格依據非外部平台：fidelity-spec 鐵則第 3 條「分階段揭曉 → 逐項結算」、第 4 條「先掃輸家籌碼再付贏家（讓玩家讀懂結果）」、TABLE 劣質破綻「多注不逐項列賠→無法稽核」。唯一要修正該稽核員的是**影響範圍**：`area.controls`/`settle` 的呼叫者是 6 個檔（table-baccarat/roulette/dragon-tiger/sicbo/andar-bahar/moneywheel），不只 3 款。

**60. 幸運轉盤 Money Wheel — Money Wheel 命中乘數段（招牌高潮）只有 120ms 舞台時間，×N 徽章淡入到 60% 轉盤就重轉**（high／CONFIRMED／S／家族 missing-tension-beat）
- 位置：`prototype/src/views/table-moneywheel.js:214, 215-229 (218-220, 224-227); prototype/src/styles/components.css:2428`
- 重現：開幸運轉盤→押任一號碼→按「旋轉」，重複到指針停在 ×2 或 ×7 段（每轉 2/54 ≈ 3.70%，約 27 轉會遇到一次）：輪盤在 1200ms 停在乘數段，1280ms 時輪轂內出現小字「×2」並開始 200ms 淡入，1400ms 輪盤就再次轉走——徽章當下只有 60% 不透明度。玩家多半完全沒發現剛才中了乘數，直到最終狀態列出現「（×2 乘數！）」（241 行 multTxt）才回頭困惑。
- 複驗依據：行號全部對上且算術可核。table-moneywheel.js:214 `var STAGE = 1400, FINAL = 2600, accMult = 1;`；219 行 `spinTo(sp.idx, isLast ? FINAL : STAGE - 200, …)` ⇒ 乘數段動畫 1200ms，於 at+1200 停；224-227 行徽章 setTimeout 在 `at + (STAGE - 120)` = at+1280 才 `hubMult.classList.add('is-on')`；下一段的 spinTo setTimeout 在 `at = (i+1)*STAGE` = at+1400 開火（同一個 t0 基準）⇒ 徽章到重轉間距確實只有 120ms，輪盤靜止到重轉為 200ms。components.css:2428 `.ax-mw__hubmult { … opacity: 0; transition: opacity 0.2s; }` + 2429 `.is-on { opacity: 1 }` ⇒ 120/200 = 60% 不透明度時輪盤已重新啟動；且 183 行 clearWins() 每局開頭 `hubMult.classList.remove('is-on')`，所以本局第一次命中乘數必定從 opacity 0 起跳（原稿正確地把範圍限縮在「第一次命中」——第二次連乘時 is-on 已在，不會再淡入）。全檔無任何隨乘數放大的轉場/縮放/音效，只有 hubMult 文字與 hubNum 換成「🔥」（225-226 行）。違反 spec 上線閘第 10 項與 GAME-SHOW 段「落 bonus 要升級成大轉場」。

**61. 暗影儀式 Shadow Ritual (slot.js) — 押注 ± 在旋轉／連爆／免費遊戲全程無鎖，改注會改變「已付款那一注」剩餘連爆與整輪免費遊戲的結算基準**（high／CONFIRMED／S／家族 no-commit-lock）
- 位置：`prototype/src/views/slot.js:603 / :410 / :419 / :479-480 / prototype/src/styles/components.css:1609,1611`
- 重現：Demo 模式，押注 10 → 按 ⟳ → 第一段連線亮起後（10 元已於 474 扣掉）連按 ＋ 三次拉到 100 → 該注剩下的每一段連爆都以 bet=100 走 evaluate 並累進 st.spinWin，結算時以放大後的金額入帳。更嚴重版：以 10 元把儀式條推滿觸發 Cursed Spins → 進入免費輪後把押注拉到 100 → 6 次免費旋轉全部以 100 元基準派彩，玩家零成本取得 10 倍免費遊戲。
- 複驗依據：逐行對過，行號全中。slot.js:603 betBtn 的 onClick 逐字是 `var i = BETS.indexOf(st.bet) + d; if (i >= 0 && i < BETS.length) { st.bet = BETS[i]; refreshHUD(); }`——無 st.busy 閘、無 mode 閘。CSS 面我用 `grep -n "is-busy" prototype/src/styles/*.css` 得到**全站僅一條** components.css:1609 `.ax-slot__spin.is-busy{opacity:.6;pointer-events:none}`；`.ax-slot__rbtn`(1611-1615) 五條規則裡沒有任何 busy/disabled 態，slot.js 也只在 519 對 spinBtn 單獨 toggle is-busy ⇒ ± 兩顆鈕在整個回合鏈中都可點。而 processBoard 每段連爆都重新讀 `evaluate(st.grid, st.bet)`(410)、遞迴自己(423)、最大贏分上限 `MAXWIN_X * st.bet`(419)，免費遊戲分支(479/480)只 `st.candle--`/`st.cursed--` 不鎖 bet；finishRound(433) 派 st.spinWin。⇒ 保真規格第 3 項「硬性 commit / spin lock」在此完全缺席。兩點小修正（不影響結論）：BETS=[10,20,50,100](149)，10→100 要按**三次**＋不是兩次（兩次只到 50＝5×）；且會員(後端)模式下 476 由 `playSlotSpin` 決定總分、spend() no-op，本缺陷實際生效於 Demo（＝使用者日常玩的模式）。

**62. 暗影儀式 Shadow Ritual (slot.js) — ⭐ 購買功能鈕在旋轉／連爆進行中仍可點，買入立刻扣款並把進行中回合的 mode/roundWin/rows 當場清掉**（high／CONFIRMED／S／家族 no-commit-lock）
- 位置：`prototype/src/views/slot.js:601 / :521 / :552-559 / :467 / :491-492`
- 重現：押注 10 → 按 ⟳ → 連爆進行中按 ⭐ → 選「Cursed Spins（NT$1,000）」→ 立刻扣 1,000；「本輪贏得」當場歸零、儀式條瞬間消失、背景切成 Cursed，但盤面還在跑上一注的 4 列連爆，該注剩餘贏分最後被記進「Free Game 總贏得」。
- 複驗依據：行號全中。601 `buyBtn = el("button", {... onClick: buyMenu})`；521 `buyBtn.style.visibility = st.mode === "base" ? "visible" : "hidden"`——只看 mode 不看 busy，而 base 旋轉中 mode 仍是 "base"（spin() 只在 478 重設 bar/level/rows/roundWin，不動 mode）⇒ 按鈕在整個 base 回合鏈可見可點；CSS 側同上，`.ax-slot__rbtn` 無 busy 態。buyCursed(552-559) 零 busy 守衛：`spend(-cost)`(555) 後 558 直接把 `st.bar=0; st.level=5; st.mode="cursed"; st.cursed+=10; st.rows=5; st.roundWin=0` 寫進**正被 processBoard 使用的同一個 module 級 st**，559 呼叫 spin() 但 467 `if (st.busy) return` 把它吞掉（animateSpin:300 已把 busy 設 true，直到 finishRound:441 才放）——吞的是旋轉，污染已落地。接著 559 的 refreshHUD() 立刻執行 284/285/286：freeEl 顯示「🔥 Cursed Spins 剩 10」、儀式條 display:none、stage 掛 mode-cursed 背景 class，winEl 顯示 money(0)；而盤面仍在跑上一注的 4 列連爆（tumbleAnimate:211 讀 st.grid[0].length，非 st.rows），其贏分繼續累進被歸零的 st.roundWin。回合結束時 finishRound 的 cb 走 492 `st.mode === "cursed"` → `setTimeout(spin, 800)` 直接接上免費輪，最後 endCursed(509-510) 的「🩸 Free Game 總贏得」把上一注的殘餘連爆一起算進去。buyBaphomet(543-550) 同構（改寫成 mode="candle"）。

**63. 暗影儀式 Shadow Ritual (slot.js) — 離開遊戲不取消任何計時器：自動旋轉／免費遊戲鏈在背景繼續扣款，結算 modal 蓋到大廳**（high／CONFIRMED／M／家族 stale-timer）
- 位置：`prototype/src/views/slot.js:491-493 / :505 / :509 / :515 / :665 / prototype/src/layout/app-shell.js:692-699 / prototype/src/main.js:75`
- 重現：(a) 押注 100、按 ↻ → 立刻按「‹ 返回娛樂城」→ 在大廳盯 header 錢包：每 ~2 秒被扣一注、連扣 10 次，玩家已離開遊戲卻仍在下注。(b) 觸發或買入 Cursed Spins → 立刻返回大廳 → 數秒後 endCursed 的「Cursed Spins 結束 / 🩸 Free Game 總贏得」modal(509-510) 蓋在大廳上。(c) 自動旋轉中返回、馬上重進：殘留 timer 在 buildGame(593) 重設 st 前後開火 → 幽靈旋轉扣款、且其 finishRound 會把 busy/餘額寫進剛建立的新 session（(c) 的先後順序視載入條進度而定，(a)(b) 純由程式即可證）。
- 複驗依據：行號全中。回合鏈確實整條靠裸 setTimeout：491/492 `setTimeout(spin, 800)`、493 `setTimeout(spin, 700)`、505/515 endCandle/endCursed 也各自 `st.auto--; setTimeout(spin, 700)`。我跑 `grep -n "clearTimeout／isConnected／destroy／unmount" prototype/src/views/slot.js` ⇒ **零命中**（只有 445/454 的「點擊略過」註解與文案）。665 確實只導出 `HL.views.slot = { render: render }`，無 destroy；app-shell.js:692-699 mountView 只做 `HL.dom.clear(main)` + appendChild + scrollTop=0，從不通知離場 view。更硬的一條佐證（原稽核員沒抓到）：main.js:75 renderApp 每次重繪都呼叫 `HL.ticker.clearAll()`＝平台**有**一條正規的離場清理通道（main.js:11-15 的 tickFns 註冊表），slot.js 完全不走它。我也排除了「PiP 讓它繼續跑是刻意設計」這條反駁：game-frame.js 的 openPip(139) 只有玩家主動按 ⧉ 才觸發，按「‹ 返回娛樂城」時 pip.active 為 false，resumeFrame(185-186) 回 null，stage 直接被 clear 掉——所以背景續跑不是 PiP 設計，是漏清。且 detach 後不會拋錯中斷鏈：animateSpin 306 `wins[0].clientWidth ／／ 60` 有回退、tumbleAnimate 225 `getBoundingClientRect().height` 回 0 也不炸，474 `spend(-st.bet)`、435 refreshHUD → HL.shell.refreshChrome() 照樣改 header 錢包。

**64. 賞金局 · 踩地雷 (bounty) — 會員模式的踩地雷根本不是踩地雷：一次 RPC 就把整局開完，12 格盤面與「兌現」鈕變純裝飾；而且 RPC 在途中點格子會用 render 時就配好的舊雷圖跑客端結算 ⇒ 同一次挑戰被結算兩次**（high／CONFIRMED／M／家族 wrong-genre）
- 位置：`prototype/src/views/bounty.js:230-250, :201, :204-226, :210-217, :186-195; prototype/src/views/instant-crash-mines.js:161-171, :184, :189`
- 重現：會員(後端)模式進踩地雷賞金房 → 押 100 → 按「開始挑戰」→ (a) 不亂點：整局一格都不能翻、兌現鈕全程灰、12 格盤面純擺飾，只有狀態列跳出一行結果；(b) 趁狀態列「開獎中…」時點格子踩到雷：先跳「踩雷，輸掉 NT$ 100」、剩餘次數 −1，接著伺服器回應再結算一次（例如「💎 兌現 x2.40 · 獲得 NT$ 240（🔒 伺服器結算）」）、剩餘次數再 −1。
- 複驗依據：逐行成立。會員分支(:232-247)：mineActive=true → 一次 playBountyMine(bet, room.maxMult, room.vol) → 回 {bust,mult,win} 就直接寫 statusEl/multEl 並結算，全程沒有任何 tile 被揭示；:247 `return;` 讓 :249 的 `cashBtn.removeAttribute("disabled")` 永不執行 ⇒ 會員的兌現鈕從頭到尾 disabled。同時 :201 那句寫給玩家看的「按開始挑戰翻格累積倍數，踩雷則輸；隨時可兌現」對會員一句都不成立——這是內部自我矛盾，不是「跟某家平台做法不同」，所以我不用真實世界類比也判缺陷；而 chicken.js 的 chicken_step 逐步 RPC 證明本專案有逐格權威開獎的現成模式。在途窗也成立：layout() 在 renderMine 時就已佈好一組客端雷圖並綁 click(:210-217)，會員分支不重新 layout，守衛只有 `if (!mineActive ／／ tile.classList.contains("done")) return;` 而 mineActive 在 RPC 在途期間正是 true ⇒ 點雷會跑完整客端結算(afterPlay(0)：:186-195 扣注、liveStats.record、prizePool、playsLeft--)，隨後伺服器回應再 playsLeft--(:241)、再 toast 一次。修正一處：餘額不會真的被扣兩次——afterPlay 的本機扣款隨後被 setBalance(R.balance)(:237) 以伺服器值覆蓋；真正被重複的是 playsLeft(−2)、prizePool、liveStats/ledger 的一筆幽靈注與兩次結算演出，另外 :217 的 setTimeout(renderMine,1100) 常在伺服器回應前就重繪，害伺服器那句結算文字寫進已 detach 的 statusEl（玩家看不到真正的結果）。對照組行號也對：instant-crash-mines.js 逐格 reveal(:161-171)、start 時 startBtn.disabled=true(:184)。

**65. 賞金局 · 翻牌 (bounty) — 開局 RPC 在途期間「開始挑戰」按鈕仍留在 DOM 且可按 ⇒ 連點兩下送出兩次 bounty_flip，扣兩次費用、兩條揭示鏈互踩同一組模組全域**（high／CONFIRMED／S／家族 no-commit-lock）
- 位置：`prototype/src/views/bounty.js:91-98, :122-126, :38-42, :73, :85, :103-119, :232-233; prototype/src/views/chicken.js:138, :161-163; docs/supabase-phase7.sql:249-266`
- 重現：會員(後端)模式進賞金局翻牌房 → 對「開始挑戰（押 NT$ 200）」連點兩下（畫面在 RPC 回來前完全沒有任何回饋，玩家很自然會再按一次）→ 送出兩次 bounty_flip：室內「剩餘次數」被扣 2、賞金池被結算兩次、playEl 底部疊出兩張結算卡，且先到的揭示鏈會翻在後到那批新卡上。
- 複驗依據：行號全部精確。startFlip(:122-126) 只擋 flipChargeOK 就 return startFlipServer()；startFlipServer 第一列(:92)直接打 RPC，沒有 disable、沒有 in-flight 旗標、fPhase 也不變（fPhase 只在 :97 的 .then 內才變 revealing），而清畫面的 HL.dom.clear(playEl) 在 :98 也在 .then 內 ⇒ 整段網路來回期間 renderIdle 的「開始挑戰」(:73) 與結算卡的「再挑戰一次」(:85) 都還活著、都指向 startFlip。flipChargeOK(:38-42) 只看 room.playsLeft 與餘額，而 playsLeft-- 在 :115（第二顆 setTimeout 內）、餘額要等 setBalance(R.balance) ⇒ 第二次點擊必然過閘。伺服器端我另查了 supabase-phase7.sql bounty_flip：:251 檢查餘額、:265-266 `v_newbal := v_bal - v_cost + v_fwin; update member_econ ...` ⇒ 每一次呼叫都是獨立的一次扣費+派彩（若兩次真並行，read-modify-write 還會互相蓋寫，變成扣一次卻派兩次獎——無論哪一種都是錯的）。客端污染也成立：fCards/fCardEls/fHeadWin/fWin 皆為模組全域(:18,:43)，後到的回應在 :96-101 整組覆寫，先到那條的 setTimeout 鏈(:105-110)在呼叫時才讀全域 ⇒ 往新的 fCardEls 上翻牌，兩顆 :112 收尾各自 playsLeft--、改 prizePool、appendChild 一張結算卡。對照組也成立：同檔踩地雷會員路徑 :232-233 先 mineActive=true 才打 RPC（:231 有 `if (mineActive) return`），chicken.js:161-163 先 setBusy(true) 才 chickenStart，且 :138 明寫「開局 RPC 在途時也要鎖住」——只有翻牌漏了。Demo 路徑無此問題（startFlipClient 同步扣款並立刻重繪，按鈕已離開 DOM）。

**66. 輪盤 Roulette (european-roulette) — 輪盤沒有球、輪面旋轉角度與開號無關：2200ms 等速轉＋中央 Math.random 亂跳，結果只是 textContent 瞬間替換**（high／CONFIRMED／L／家族 wrong-genre）
- 位置：`prototype/src/views/table-roulette.js:58, :128-138, :146；prototype/src/styles/components.css:2630-2645`
- 重現：進輪盤 → 押「紅」→ 按「旋轉」：看到一個等速轉的紅黑圓盤（連指針一起繞圈）、中央每 60ms 換一個看不清的數字 → 2200ms 後數字直接變成開出號碼並同時結算。玩家全程無法從輪面/球的位置預期結果，也沒有「快要停了」的節奏。
- 複驗依據：逐行核對全部成立。table-roulette.js:58 `wheel` 的子節點確實只有 `[el(.ax-rou__pointer), pocket]` ＝無球元素、無 37 袋位 DOM。components.css:2632 背景是 `repeating-conic-gradient(#c0392b 0 18deg, #18181b 18deg 36deg)`＝36° 週期共 20 片楔形（連綠色 0 格都沒有），:2635 `.is-spinning{animation: axRouSpin 0.7s linear infinite}` + :2636 `@keyframes axRouSpin{to{transform:rotate(360deg)}}`＝等速無限轉，全程無 easing、無減速、rotation 與 `result` 零關聯。結果在 :130 由 `resolveFloat(HL.fair.floatOr("roulette"))` 一次算完（RNG 回合開始就 commit 這點是對的、符合閘第 9 項），:132 `setInterval(function(){pocket.textContent=String(Math.floor(Math.random()*37));},60)` 只是純噪音跑馬燈，:146 的 `2200` timeout 內 :136-138 `clearInterval` → `remove('is-spinning')` → `setPocket(result)` 一次替換。2200ms 內確實零遞進資訊（無減速、無候選收窄、無彈跳）。**這不是「與某平台做法不同」＝設計選擇**：intel/db/game-fidelity-spec.md TABLE 節奏段明文寫「輪盤球繞 4–6s 減速、在框上彈跳才落定 —— 彈跳就是期待感、瞬間揭曉會殺死它」，劣質破綻段明列「瞬間結果／零球彈」，閘第 10 項「瞬間平板結算 = FAIL」。故為本專案自訂規格的直接違反。附帶補強一條該稽核員漏掉的證據：`.ax-rou__pointer` 是 wheel 的**子節點**，所以旋轉期間連「固定參考指針」都跟著繞圈，玩家連一個可對位的基準都沒有。

**67. ApexWin Picks 賽事預測 (picks) — Picks 整局零階段：settle() 從扣注到重生賽程全在同一個同步 task，沒有任何「開賽中」揭曉相位**（high／CONFIRMED／M／家族 wrong-genre）
- 位置：`prototype/src/views/instant-picks.js:152-183（settle 全文）、157（busy=true）、181（busy=false）、158+164（兩次 setBal 同 task）、79（按鈕「下單開賽」）、80（「開賽後見真章」）`
- 重現：進 ApexWin Picks → 點第一場「主」→ 按「下單開賽」：同一 frame 內頁首錢包直接跳到淨值、狀態列直接出現「✅ 命中！終場 雷霆 2–1 蒼狼 +$xx」、上方三場賽事同時被換掉、按鈕再度變灰。從按下到結果之間沒有任何一格畫面屬於「比賽進行中」，也永遠看不到自己的注金被扣走。
- 複驗依據：我逐行讀了 instant-picks.js:152-183，settle() 內確實沒有任何 setTimeout / Promise / rAF / transition：`grep -n "setTimeout／Promise／requestAnimationFrame／transition／classList.add" instant-picks.js` 全檔只有一個命中＝124 行的選盤高亮 is-sel，settle 區間零命中。busy=true(157) 與 busy=false(181) 之間是純同步碼，瀏覽器不可能在中間 paint ⇒ 提交鎖（157 setAttribute disabled）確實從未被看見。更硬的自證：158 行 setBal(bal()-bet) 與 164 行 setBal(bal()+payout) 也在同一 task，而 setBal → core/instant.js:16 → HL.shell.refreshChrome() → app-shell.js:37-41 refreshWalletPill() 改寫 #ax-wallet-amount，所以頁首錢包只會從 B 直接跳到 B-bet+payout，連「注金離開錢包」這一格都沒有。契約不符也成立：79/80 兩處文案宣告「開賽」，程式無此階段。對照保真規格 intel/db/game-fidelity-spec.md 第 3 項（下注→硬性 commit→分階段揭曉→逐項結算）、第 9 項（分階段揭曉→逐項結算→歷史更新）、第 10 項（『瞬間平板結算 = FAIL（即使數學對）』）＝三項同時不成立。同 repo 同類 originals 對照我也複驗過：keno 90ms/球（instant-keno.js:148）、duel 800ms（instant-duel.js:106）、cases DUR=2.6s（instant-cases.js:51）都有揭曉節拍，只有 picks 沒有。原稿唯一略誇之處是「無法判斷點擊是否被受理」——狀態列與賽程其實同 frame 就改了，玩家看得到「有事發生」，只是看不到過程；不影響本條成立。

**68. Crash X — 自動兌現只在 60ms tick 上求值、且 bust 檢查排在它前面 ⇒ 崩盤點高於目標的回合仍被判輸**（high／CONFIRMED／S／家族 wrong-resolution-order）
- 位置：`prototype/src/views/instant-crash-mines.js:96,103,107-111（bust 檢查在 108、autoTarget 檢查在 111）；對照純數學 :22`
- 重現：自動兌現填 2 → 按「下注 🚀」→ 該局 crashAt 落在 [2.00, 2.07) 時（約 1.6% 的局、應贏局的 3.2%），畫面直接跳 💥「崩盤 2.0x× — 沒兌現」判輸，玩家設的 2× 從未觸發；同一顆亂數丟給本檔 line 22 的 Crash.resolve 會回 win:true multiplier:2。反向路徑：crashAt 遠高於 2 時觸發的兌現金額是 tick 上的 2.00–2.07×，不是恰好 2.00×。切到背景分頁再切回來，輸率由 50.5% 升至約 67%。
- 複驗依據：逐行讀完 91-113：line 96 `crashAt = Crash.crashOf(HL.fair.floatOr("crash-x"))` 確實在回合開始就 commit；line 103 `setInterval(...,60)`；line 107 `mult = Math.exp(K*elapsed)` 以牆鐘重算；line 108 `if (mult >= crashAt) { ...; bust(); return; }` 帶 return，line 111 `if (autoTarget && !cashed && mult >= autoTarget) cashOut();` 排在其後 ⇒ 單一 tick 同時跨過兩者時 cashOut() 永不被呼叫。行號全部對得上。我用 node 實跑本檔匯出的純數學做交叉驗證：單 tick 成長 exp(0.55*0.06)=1.033551，target=2 的失竊窗＝[2.0000, 2.0671)，機率質量 0.99/2-0.99/2.0671=0.01607（約占該設定全部應贏局的 3.2%）；同一顆亂數餵 line 22 的 Crash.resolve → `{crash:2.03, win:true, multiplier:2}`＝node RTP 驗證器認定贏、玩家畫面卻判輸，兩套結算規則實質不一致。額外自查到一條更強的佐證（原稽核員沒寫）：line 111 觸發時 cashOut()（line 84）用的是 `mult` 而非 `autoTarget`，所以就算有觸發也不是「恰好 2.00×」而是最多高 3.36% 的 tick 值 ⇒ 這個控件在兩個方向都不精確。唯一要打折的是背景分頁那段修辭：setInterval 被夾到 ~1s 時每 tick 跳 exp(0.55)=1.733×，target 2 的輸率從 50.5% 升到約 67%（1-0.99/3.004），是大幅惡化但不是「幾乎必被吃掉／永遠看到崩盤輸」；核心缺陷不受此影響。

**69. Crash X — 兌現當下就 clearInterval 結束回合 ⇒ 少了 crash 類型最核心的「看它後來飛到哪」揭曉，歷史籌碼卻馬上貼出玩家沒看到的崩盤倍數**（high／CONFIRMED／M／家族 wrong-genre）
- 位置：`prototype/src/views/instant-crash-mines.js:89,71,80,60,54,119；HL.ui.histBar 於 prototype/src/core/ui.js:346-364`
- 重現：下注 → 在 1.50× 按「兌現」→ 舞台與大倍數字永久凍在 1.50×（is-win 綠）、狀態列「兌現 @1.50×」，火箭停在原地不再爬；同一秒畫面上緣歷史條多出一顆可點的「8.32×」籌碼，而 8.32× 的曲線、紅線、💥、spark、is-boom 抖動全部沒播。玩家可立刻按「下注 🚀」開新局（stop() 已把 betBtn 解鎖），該局爆點永遠看不到。
- 複驗依據：line 89 `cashBtn.disabled = true; addHist(crashAt); stop();` 與 line 71 `stop(){ if(timer){clearInterval(timer);timer=null;} active=false; ... }` 都與描述一字不差。計時器一清＝line 107-109 不再跑（mult 凍結、plot 不再更新、rocket 不再前進），而 bust()（line 76-81，含 is-boom 抖動、紅線 stroke、spark()、💥 狀態文案）只在 line 108 的 tick 分支裡被呼叫 ⇒ 兌現後永遠不會執行，該局的爆點演出整段消失。同時 addHist(crashAt)（line 60）推入的是**真崩盤點**並依 <2 / <10 / 其他 上三段色。我另外去讀了 core/ui.js:346-364 佐證原稽核員「可點的公平驗證籌碼」這句：`opts.fair && HL.fair` 時膠囊是 `<button class="… ax-histbar__b" title="可驗證公平" onClick=fairnessModal>`，且預設 newestFirst＝`insertBefore(pill, box.firstChild)`＝最新在最前；line 54 建立時帶 `fair:true`，line 119 把 hist.node 排在舞台上方 ⇒ 「玩家沒見過的 8.32× 立刻出現在畫面上緣、還可點開公平驗證」成立。這條不是「與某家平台不同＝設計選擇」：兌現後續飛到 💥 是 crash 這個類型的張力點本身（保真規格第 10 項），而且就算不談慣例，同一畫面上「凍在 1.50× 的綠色舞台」與「8.32× 歷史籌碼」互相矛盾這件事本身就是缺陷。

**70. Dead By Noon 正午對決 — 招牌機制「乘數彈膛」的數字每次 cascade 全部重抽：同一顆 🎯 沿路數字亂跳，而且落盤當下不揭曉**（high／CONFIRMED／M／家族 wrong-genre）
- 位置：`prototype/src/views/slot-dead-by-noon.js:126, prototype/src/views/slot-dead-by-noon.js:104, prototype/src/views/slot-dead-by-noon.js:214`
- 重現：進 Dead By Noon 連續旋轉到出現 🎯：籌碼落下的那一格顯示的是 🎯（無數字），要等下一個中獎影格才閃出數字，且 cascade 影格又把數字藏回 🎯。以 seed 7 那局為例，玩家看到同一顆籌碼在四次揭曉中顯示 1→1→3→1，乘數 ×12→×1→×3→×1 毫無延續性；資訊列同時告訴他數字會串接累積，盤面上卻沒有任何可追蹤、可預測的數字，張力點（保真第 10 項）與分階段揭曉（第 3 項）雙失。
- 複驗依據：程式讀來完全如述，且我用 node 重跑了他引用的種子，輸出**逐值吻合**。chamberMult（:101-106）在 :104 對「當前盤上每一顆 CHIP」呼叫 `drawDigit(rng)`，數字只存在 digitsOut 這個臨時陣列；:126 在 `while(true)` 每輪 cascade 都重呼一次；snap()（:137）只複製符號 id ⇒ 數字**沒有任何地方被寫回 grid 或持久化**，所以「同一顆籌碼的數字」在程式裡根本不存在這個概念。渲染面：只有 win 事件傳 e.digits（:214），fill（:213）與 cascade（:216）都傳 null，而 renderGrid（:197）`var txt=(v===CHIP && digMap[key]) ? String(digMap[key]) : symChar(v)` ⇒ 沒 digits 就顯示 🎯。因此籌碼**落盤影格必然顯示 🎯 而非數字**；若某次 cascade 無中獎，:124 `if(ev.units<=0) break;` 在 chamberMult 之前就跳出 ⇒ 那顆籌碼從落盤到被 cascadeDown 推出盤外一次都沒揭曉過。檔頭 :7 確實寫「彈膛隨下落累積」、資訊列 :276 確實對玩家寫「露 1–9 由左到右串接成乘數（2·5·1→×251）」——**與實作自相矛盾**（這是我判 CONFIRMED 的關鍵：不是拿外部產品比較，而是本檔自己的文案與程式打架）。node 實跑 `runSpin(mulberry32(7),1,false,true)`：5 個 win 影格 mult=12/1/3/1/1，digits 依序 [(0,2)=1,(3,4)=2] → [(1,2)=1] → [(2,2)=3] → [(3,2)=1] → []，同一顆籌碼沿 (0,2)→(1,2)→(2,2)→(3,2) 下落而數字 1→1→3→1 亂跳，與他的敘述完全一致（他少提最後一拍籌碼已掉出盤外）。

**71. Dice / Limbo（共用 HL.instant.betPanel） — 自動下注沒有卸載鉤：離開遊戲頁後迴圈仍持續扣款派彩，且每進一款遊戲就多疊一個並行迴圈**（high／CONFIRMED／S／家族 no-teardown-stale-timer）
- 位置：`prototype/src/core/instant.js:109,116-133,143 · prototype/src/main.js:74-77 · prototype/src/layout/app-shell.js:692-695`
- 重現：Dice →「自動」→ 局數 0 → 開始自動 → 立刻按公版「‹ 返回娛樂城」。dice 一圈＝300ms 揭曉閘＋470ms 間隔=770ms，與他寫的『每 ~770ms 跳動』吻合：大廳 header 錢包 pill 會被 setBal→refreshChrome 持續改寫直到彈出「餘額不足，自動停止」，全程無停止鈕（面板 DOM 已被 dom.clear 拔掉，重進 Dice 只會 new 一個新閉包）。再進 Limbo 開一次＝第二個無主迴圈同吃一份餘額，且 HL.liveStats.record 照樣餵 VIP/任務/返水/JP/錦標賽並消耗 HL.fair nonce。
- 複驗依據：逐條對過，行號全中，且比他說的更嚴重。instant.js:109 stopAuto 是全檔唯一把 state.running 設 false 的地方；:131 timer=setTimeout(step,470) 自我續跑；api.stop=stopAuto(:143) 我用 grep -rn 'stop(' prototype/src 全庫掃過，唯一命中是 instant-crash-mines.js 自己的 stop()＝betPanel.stop 全 repo 零呼叫者，確認為死出口。換頁路徑我實際數行確認：main.js:74 renderApp / :75 HL.ticker.clearAll() / :77 HL.dom.clear(root)、app-shell.js:692 mountView / :695 HL.dom.clear(main)，兩處都只拔 DOM，沒有任何 view 卸載鉤（grep unmount／teardown／onLeave／destroy 在 src 只命中 faucet/onboarding/streamer 自己的 pill，不含 view 層）。我做了他沒做的關鍵反駁測試——若 finish() 在 DOM 消失後拋錯，promise 鏈斷裂反而會讓迴圈自己停：實讀 app-shell.js:36-42 refreshWalletPill 與 :482 refreshRbBadge 全部 getElementById + null 檢查，live-stats.js:19-48 record() 內 panel 存取為 `panel && panel.style.display`，全程不觸 detached DOM ⇒ 不會拋，迴圈確實活到餘額見底。範圍還更大：betPanel 共 9 個呼叫點（instant-games.js:142/189/282、instant-cases.js:139、slot-pirots/golden-toad/gem-storm/dead-by-noon）＝八款遊戲同病。同庫已有兩個現成存活檢查形制可抄：instant.js:26 hkPanel.node.isConnected、instant-crash-mines.js:104 `if(!multEl.isConnected){stop();return;}`⇒『同檔/同庫不一致』成立。

**72. gem-storm — 免費遊戲「總贏分」計分板從不套 CFG.G=2.30，且每轉重置累加器 → 數字會倒退，最終顯示值只有實付的 1/2.3**（high／CONFIRMED／S／家族 scoreboard-desync）
- 位置：`prototype/src/views/slot-gem-storm.js:189, :190, :221, :226-227, :102, :115`
- 重現：買入免費遊戲（或自然中 ⭐≥4）→ 看右上角 💰 badge。以 seed=1 的走勢為例：第 4 轉結束顯示 61.60×，第 7 轉第一次 tumble 命中的瞬間被覆寫成 0.46×（往下掉 134 倍），該轉結束又跳回 70.00×；10 轉跑完 badge 停在 70.00×，但同一時刻 history pill 與底下「贏 +N」寫的是 161.00×。玩家全程盯著的期待值計數器與實際入帳差 2.3 倍，且中途會倒退。
- 複驗依據：逐行讀完 slot-gem-storm.js 全檔，行號全部對得上，且我用 node 獨立重跑數學區證實了他報的每一個數字。程式事實：(1) :102 `total*=CFG.G` 與 :115 `win*CFG.G` 是唯一乘上校準標量的地方，而 steps 裡存的 `e.win`（:91/:111）是未乘 G 的原始單位；(2) potBadge 被兩個不同單位的累加器交替寫入 —— :189 `setPot(running.acc*CFG.G)` 的 running 是 :221 每轉新建的 `var run={acc:0}`（只含當前這一轉、且不含炸彈加乘），:227 `setPot(acc.v)` 的 acc.v 是跨轉累計但未乘 G；(3) :190 base 的 `pop(fmtX(s.win))` 同樣是未乘 G 的原始值（base 走 running=null，potBadge 全程不顯示）。node 實測 `runFS(mulberry32(1),true)`：pot 序列 0→(轉4 內)1.84×→61.6×→(轉7 內)0.46×→70×，收尾停在 70×，而 runFS 回傳 total=161×＝history pill/label/入帳值；seed 12345：pot 最高 16×、實付 36.8×。兩組比值皆 = 1/2.30。他寫「倒退 134 倍」是 61.6/0.46 的正確計算。唯一措辭不精準處：repro 說「每一個回合內數字都恰好是實付的 1/2.30」——實際只有「每轉結束」那個值（acc.v）恆等於 total/G，轉內那個值（running.acc*G）是另一種錯（缺炸彈加乘＋缺前幾轉），不是同一個比例。這不影響結論，反而更糟。另外自然觸發（非買入）時 pot 連 base 那段贏分都沒算進去，偏差比他報的更大。

**73. golden-toad + gem-storm — 購買 bonus 按鈕與 betPanel 沒有共用回合鎖，可讓兩局動畫同時跑在同一個 board / badge / history 上**（high／CONFIRMED／M／家族 no-commit-lock）
- 位置：`prototype/src/views/slot-golden-toad.js:239, :226, :230, :245；prototype/src/views/slot-gem-storm.js:245, :233, :237, :251；prototype/src/core/instant.js:86（他寫 :88，應為 :86）, :131（他寫 :135，應為 :131）, :30（熱鍵，他寫 :31）`
- 重現：路徑 A（最快）：Golden Toad 點「購買 Hold & Win 86.4×」，動畫約 5–10 秒；在動畫進行中直接點「旋轉 🐸」（或先在 ⚙ 開熱鍵後按 Space，instant.js:30 → pressPlay，其三個守衛 state.running / playBtn.disabled / manualWrap 顯示狀態此時全部放行）→ 第二個 playRound 立刻啟動，兩條 delay 鏈交錯寫同一個 board：重旋盤面被 base 盤蓋掉、🔄 重旋數與 💰 數字亂跳，先跑完的那條把另一局的盤直接換成固定待機盤。路徑 B：切「自動」開 10 局 → 在兩局之間（busy 已 false、autobet 尚未 step）點買入 → 470ms 後 autobet 照樣開下一局，同樣兩局並行。Gem Storm 完全同構。
- 複驗依據：機制完全成立，但他在 instant.js 的三個行號都偏了（:88 其實是餘額檢查、:135 是 addEventListener、:31 是 KeyS）；實際證據在 instant.js:86 `if (state.running ／／ playBtn.disabled) return;`、:131 `timer = setTimeout(step, (turbo.checked ／／ fastMode()) ? 110 : 470);`、:30 Space→pressPlay。核心論證我自己讀出同樣結論：betPanel 的 playBtn.disabled 只在它自己的 onClick（:90）與 startAuto（:115）被設，buyBtn 的 onClick（toad:238-253 / gem:244-259）從頭到尾沒碰 panel，只自保 `if(busy／／buyBtn.disabled) return`（toad:239 / gem:245），且 busy 是各檔閉包私有變數（grep 全檔，panel 完全看不到它）。反向也漏：busy=false 在 done 鏈最後一個 .then 開頭（toad:226 / gem:233）就設回，而 settle 的 finish 掛在 done.then 之後、autobet 的 470ms setTimeout 又在 finish 之後 → 這整段空窗 buyBtn 皆可按，而 autobet 的 playBtn.disabled=true 完全擋不到它。兩局並行時共寫 board / respBadge / potBadge / history，且先結束的那條會在 toad:230 / gem:237 呼叫 renderResting() 把另一局還在播的盤抹成固定待機盤、並把 busy 設回 false 放行第三局。這正面違反保真閘第 3 項「硬性 commit / spin lock」與第 9 項。副作用還包含 liveStats.record 在同一時窗被記兩筆。

**74. Limbo — Limbo 崩盤倍數從「上一局的倍數」內插而不是從 1.00× 爬升，一半的局數是倒數下來**（high／CONFIRMED／S／家族 wrong-genre）
- 位置：`prototype/src/views/instant-games.js:158,175,177 · prototype/src/core/instant.js:180`
- 重現：Limbo 目標 2.00× → 連按「開始 🚀」。任一局崩在高倍（如 48.51×，畫面留著該值）後，下一局若崩在 1.09×，大字就從 48.51× 在 600ms 內「倒數」掉到 1.09×；下一局崩 60× 時起點又變成 1.09×⇒ 同樣的 60× 結果，爬升幅度會隨上一局隨機變動，玩家無法用視覺讀「爬多高」。修法：:175 的 from 恆取 1（或每局先寫回 1.00×）。
- 複驗依據：行號全中：:158 bigEl 初值寫死 "1.00×"、:175 `from = parseFloat(bigEl.textContent) ／／ 1`、:177 animate(from, crash, 600, ...)、instant.js:180 `onFrame(from + (to - from) * easing(p), p)` ⇒ from>to 就是遞減動畫。我特別去查『中間有沒有人把文字重置回 1.00×』：全檔只有 :180 `bigEl.textContent = crash.toFixed(2)+"×"` 會寫這顆元素，:176/:181/:182 只動 className ⇒ 每局起點確定等於上一局崩盤值。我原本想以『這是設計選擇』駁回，但被檔內自證推翻：:177 行末註解自己寫『快速滾動上升（盡力）』，加上 :158 硬寫 1.00× 起點，作者本意就是上升；且 crash=max(1,0.99/(1-f)) 中位數約 1.98，約半數局的 from>to ⇒ 不是邊角案例。唯一要打折的是他的『第一幀就把輸贏洩光』：倒數只洩露「本局 < 上一局」，未必洩露輸贏（上一局若低於目標則反而無資訊），措辭誇大但缺陷本體成立。

**75. Mines — revealRestSafe() 的 30ms 階梯 setTimeout 沒有被取消，兌現後 0.66 秒內開新局會把 💎/is-open 畫到新棋盤上，那些格子從此點不動**（high／CONFIRMED／S／家族 stale-timer）
- 位置：`prototype/src/views/instant-crash-mines.js:153,192,152,183,162,194；對照 prototype/src/views/instant-towers.js:93-99`
- 重現：地雷數選 1 → 開始 → 翻 1 格 → 按「兌現」→ 0.6 秒內立刻按「開始」→ 新棋盤憑空浮出一串 is-open 綠 💎（按得越快越少、越慢越多，上限 23 格），計分板卻寫 1.00×；點那些格子完全沒反應（line 162 被 is-open 擋掉），若其中含新局的雷則永遠踩不到，`safeCount === N - mines` 的全翻自動兌現也永遠不成立。變體：新局在該窗內踩雷，舊 timer 會把該格的 💣 覆寫成 💎。
- 複驗依據：四個關鍵行號全部對得上：line 153 revealRestSafe 對每個未開安全格排一顆 `setTimeout(... cc.classList.add("is-open"); cc.textContent="💎")`、`d += 30`；line 192 cashOut 尾端 `gridEl.classList.add("is-win"); revealRestSafe(); lockAll(true);`；line 152 lockAll 當下就 `startBtn.disabled = false; active = false`；line 183 start() 只 `c.className="ax-mines__cell"; c.textContent=""`。我對整檔 grep `clearTimeout` ⇒ **零命中**，整份 instant-crash-mines.js 沒有任何計時器取消，所以待處理的 timer 一定會在新局開火。cells 陣列在 line 194 只建立一次、之後每局重用同一批 DOM 元素（不像 Towers 的 buildTower 會 HL.dom.clear 重建）⇒ 舊 timer 的 cc 參照就是新局那格。後果鏈也讀證了：line 162 `if (c.classList.contains("is-open") ／／ ...) return;` ⇒ 被幽靈 💎 佔住的格子永遠點不開，safeCount 因此不可能達到 line 170 的 `N - mines` 全清自動兌現。mines=1、只翻 1 格 → 25-1-1=23 顆 timer、最後一顆 22*30=660ms，數字正確。原稽核員引的內部先例也成立：towers.js:93-99 revealTraps 是同步 for 迴圈一次畫完、零待處理計時器。

**76. Pirots 探險 / Dead By Noon（兩款同一缺陷） — 「購買免費遊戲」與主旋轉鈕/空白鍵熱鍵之間沒有互鎖，兩個回合會同時演在同一個 board 上**（high／CONFIRMED／S／家族 no-commit-lock）
- 位置：`prototype/src/views/slot-dead-by-noon.js:252, prototype/src/views/slot-pirots.js:228, prototype/src/core/instant.js:86, prototype/src/core/instant.js:131`
- 重現：開 Dead By Noon → 按「購買免費遊戲 43.4×」（我 300 局實測動畫 p50 7.44s、p90 12.72s，有 7~13 秒的窗口）→ 動畫中按「旋轉 🤠」或空白鍵 → 第二局立刻開跑，board 在兩局盤面間閃跳，先結束者把 fsBadge 藏掉並 setMult(1)（免費進度停在 3/8 就消失、乘數歸零），pop 在同一座標疊字。Pirots 版另加：買入局在 7×7/8×8 演 collect 時，若新局已把 `size` 寫回 6，金色收集框會打在完全無關的格子上。
- 複驗依據：逐行對過全部引用皆存在且語意如述。dbn:252 `if(busy／／buyBtn.disabled) return;`、pirots:228 同型，只讀自己的旗標；買入路徑（dbn:257 / pirots:233-235）只 `buyBtn.disabled=true` 後直呼 playRound，**完全沒有動 betPanel**。反向 betPanel 的 playBtn 只看 `state.running ／／ playBtn.disabled`（instant.js:86），`state.running` 僅在 autobet 期間為 true、`playBtn.disabled` 只在自己的 click 內短暫為 true ⇒ 買入動畫期間兩者皆 false，點旋轉必開第二局。api（instant.js:142-148）確實只導出 node/getBet/stop/pressPlay/mulBet/setMin，**沒有任何 disable/lock 出口**，而 `busy` 是遊戲檔閉包私有變數（grep 全檔只有 dbn:225 寫、:252 讀），betPanel 無從得知。熱鍵 Space→pressPlay（instant.js:30→145）用同一組條件，同樣穿透。autobet 空窗成立但行號應為 instant.js:131（`timer=setTimeout(step, …470)`）而非 :130（止損判斷）——唯一的行號瑕疵，位移 1 行。後果全部可從程式證明：renderGrid 每影格 `HL.dom.clear(board)`（dbn:189 / pirots:143，dom.js:37 逐一 removeChild）⇒ 兩條鏈互相清空重建；dbn:239/:244 的 `fsBadge.style.display="none"` 與 `setMult(1)` 在先結束者身上執行 ⇒ 另一局的免費進度徽章與乘數被歸零；pop 走 HL.dom.floatPop（dom.js:148 每次新建元素 append 到同一 stage），CSS `.ax-dbn__pop{left:50%;top:42%}`（components.css:3067）⇒ 兩局字疊字。Pirots 的 stride 錯位也證實：collect 影格用**共用閉包 `size`** 算 `idx=p[0]*size+p[1]`（pirots:178），而 `size` 會被另一局的 fill（pirots:173）或收尾 `size=CFG.sizeBase`（pirots:219）改寫；單執行緒下 collect 前必有 fill/cascade 對齊 size 故無害，**只有併發時才錯位**——這個界定也正確。

**77. Slots Battle (vsslot) — 會員模式下 10 輪對戰動畫是客端 RNG、勝負卻由伺服器另一組 RNG 決定，最後一刻把總分整批覆蓋 ⇒ 玩家看的過程與結果毫無因果**（high／CONFIRMED／L／家族 wrong-source-of-truth）
- 位置：`prototype/src/views/vsslot.js:175, :248-259, :261, :205, :221; prototype/src/core/api.js:63-68; docs/supabase-phase7.sql:133-140`
- 重現：會員(後端)模式打一場 1v1v1v1：全程盯著自己的總分（例如你 8,400、對手 3,100）→ 第 10 輪連爆演完的瞬間，四人總分同時跳成伺服器另一組數字，名次表把全程墊底者排 #1、橫幅寫「你輸了」→ 按「看過程」回放，逐輪分數與剛剛親眼看到的每一輪都不同。
- 複驗依據：逐行對得上，且我補查了兩個原稽核員沒證明的環節，結論更強。(a) 動畫源：vsslot.js:175 每席位 HL.fgBoard.create(...onWin: s.totalEl.textContent = money(t))；fgboard.js:16 `frnd = HL.fair.floatOr("vsslot")` ⇒ 盤面與分數 100% 客端抽樣。(b) 伺服器源：supabase-phase7.sql:136-137 `v_round := floor(random()*1500)+120; if random()<0.12 then v_round := v_round*(3+floor(random()*4))`，逐席逐輪自己重抽一整套。(c) 沒有 seed 通道：core/api.js:64-68 playBattle 只送 p_wager/p_players/p_mode/p_rounds/p_roster/p_game，既不送 clientSeed 也不送客端分數，SQL 也沒有收 seed 的參數 ⇒ 兩套 RNG 結構上不可能相關。(d) 覆蓋時點：finish() 在 10 輪跑完(:182 rIdx>=rounds)才呼叫 RPC，:259 `sides.forEach(... s.totalEl.textContent = money(totals[i]))` 直接改寫剛演完的總分，:205 rankBy 用伺服器 totals 排名次，:261 連「看過程」回放的逐輪資料也換成伺服器 rounds。這不是 RTP/賠付問題（零和 net 兩邊都是 ±wager），是保真規格第 4 項「RNG 在回合開始就 commit、之後只是揭曉」與第 10 項期待感的直接違反：計分板在此不是結果，只是與結果無關的動畫。

**78. Slots Battle (vsslot) — 賭注全場都沒有硬性 commit：加入現成房不預扣、只有 finish() 才動餘額，而對戰畫面還大方擺著「‹ 返回競技場」⇒ 落後就走，零成本逃單**（high／CONFIRMED／M／家族 no-commit-lock）
- 位置：`prototype/src/views/vsslot.js:117-130, :138, :51, :181, :241, :243; prototype/src/views/arena.js:112, :132-135, :88-89, :619`
- 重現：競技場點一間 wager=5,000 的 Slots Battle → 按「加入 NT$ 5,000」→ 接受對戰 → 第 3 輪看到自己落後 → 按左上「‹ 返回競技場」→ 餘額未動、生涯無敗場、該房 matches 仍是原值 → 同一張卡再按「加入」重來一場。
- 複驗依據：機制全部對得上，且比原稽核員說的更寬。arena.js:112 按鈕字面「加入 NT$ X」→ onClick enterRoom(r)；enterRoom 實際在 132-135（原文寫 131-134，131 是空行，±1 偏移，非虛構行號），內容只有 HL.router.go，零扣款。vsslot.js accept()(117-130) 只做 HL.rg.check + disable 按鈕 + later(phaseGame)，也零扣款。全檔唯一動餘額處是 :241 finishLocal 的 `balance + net` 與 :266 伺服器結算，皆在 10 輪跑完之後；bumpRoom(:243)/arenaStats.record(:245) 同樣只在 finish 內。逃生路徑成立：phaseGame 第一列(:138)就掛 backArena，backArena(:51) clearTimers() 清掉 later(runRound)，即使漏一顆 :181 的 detach 守衛也只是 return ⇒ 靜靜消失、不結算、不記敗場、房間 matches 不動。我另外查證兩件原稽核員沒查的事：① 全 repo grep forfeit/abandon/棄賽/判輸 = 零命中，確認沒有任何棄賽罰則；② arena.js:88-89 canJoin 只看 seats 填滿數，而加入不會寫入 seats ⇒ 同一間房可無限次重進重抽。修正一處：原文說「自建房 arena.js:615 有預扣所以漏洞專屬加入別人房」——實際預扣在 :619 且外面包著 `if (!member)`，會員模式連自建房也不預扣（:617 註解自陳），加上 SQL play_battle(:131) 只在結算時檢查餘額 ⇒ 會員模式兩條路徑都沒有 escrow，洞比原文更大。這條屬保真規格第 3 項「下注→硬性 commit」缺失；附帶的「勝率可推到 100%」是 EV 後果、不是我判斷的依據。
