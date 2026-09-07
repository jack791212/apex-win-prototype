# 競技場 9 角度平行巡檢原始清單（2026-09-07）

> 共 94 條 finding，逐條含 file:line／why／repro／fix／confidence。
> 已處理的家族見 [arena-repair-2026-09-07.md](arena-repair-2026-09-07.md)；仍待做的家族見該檔 §7。

## 角度①【掛載/離場/世代競態】——render 期間登記、被清理程序作廢的機制家族（onExit / epoch / livePanels / ticker / gameFrame PiP key / reveal / stopAll）

### 1. [blocker / likely] 開 PiP 後換頁：同一場對戰「既記棄局又跑完派彩」——雙記戰績＋雙記流水，贏了照樣入帳
- **位置**：`prototype/src/views/vsslot.js:579`
- **為什麼是錯的**：離場鉤的 clearTimers() 只認 later() 自己 push 進 timers 的那些計時器；盤面引擎 fgboard 的滾動/命中停留/消除/落下用的是**裸 setTimeout**（fgboard.js:81/107/122/125/127），完全不在 timers 裡。而 PiP host 是 document.body.appendChild(pipHost)（game-frame.js:135）＝在 #app 之外，renderApp 的 HL.dom.clear(root) 動不到它 ⇒ 換頁後盤面節點仍 isConnected。於是：runExit 先跑 forfeitEscrow（markEscrow(0)＋liveStats.record(lost,0)＋arenaStats.record({forfeit:true,win:false})＋toast「賭注不退還」），接著在飛的 fgboard setTimeout 回呼 cb → d(s) → done 湊滿 → 用 later() 排下一拍，而 later() 的存活閘看的是模組級 root（仍在 PiP 內＝attached、通過）、runRound 的閘看的是 sides[0].boardEl（也在 PiP 內＝通過）⇒ 整場繼續跑到 finish()→finishLocal()→liveStats.record(wager,payout)＋arenaStats.record(真結果)＋climaxThen→escrowSettle(payout) 直接 balance += wager×席位數。看起來正常的原因：玩家只看到一句「已離開對戰，賭注不退還」，之後 PiP 裡的結算卡被當成「上一場的殘影」，而餘額變動與 VIP/任務/返水/JP/錦標賽的雙份流水沒有任何表面會對帳。註：spec 已落地的「關掉子母畫面後對戰在隱形 DOM 跑完」修的是 closePip 這條路（game-frame.js:190-199），這一條是**不關 PiP、直接換頁**的另一個入口，closePip 的修法覆蓋不到。
- **重現**：1) 競技場 → 任一 Slots Battle 房卡「加入」→「接受對戰」→ 等 3-2-1 歸零、盤面開始轉。  
  2) 趁盤面**正在轉/連爆**（不要在輪間空檔）在 devtools 執行：  
     document.querySelector('.ax-gframe__bar [title="子母畫面"]').click();  
     var m0=HL.state.get().arenaStats.matches, b0=HL.state.get().balance;  
     HL.router.go("lobby");   // 這裡會跳「已離開對戰，賭注 NT$X 不退還」  
  3) 等 30–90 秒（PiP 裡的對戰會自己跑完並在 PiP 內渲染結算卡），再執行：  
     console.log("matches +", HL.state.get().arenaStats.matches - m0, " balance ", HL.state.get().balance - b0);  
     console.log(HL.state.get().arenaStats.history.slice(0,2).map(function(r){return [r.win, r.net, !!r.forfeit];}));  
  期望（缺陷現象）：matches +2、history 同時有一筆 forfeit:true 敗局與一筆真結果；若那場是贏，balance 淨 +wager×(N−1)（＝宣告沒收後照樣派彩）。
- **建議修法**：「一場對戰是否已了結」必須是一個狀態，不是散在 clearTimers/escrow/pendingSettle 三處的副作用。建議：① 在 vsslot 引入 per-render 的 alive 旗標（或 epoch，比照 bounty.js:26），forfeitEscrow/escrowSettle/finishLocal 的第一行就 `if (!alive) return;`，離場鉤把它設 false ⇒ 不管哪一條計時器（含 fgboard 的裸 setTimeout）續命都無法再動錢與戰績；② fgBoard.create 回傳一個 stop()（清掉自己的 setTimeout 並讓 cascade/animateRoll 的 cb 不再呼叫），由 vsslot 的 clearTimers 一併呼叫——現在 clearTimers 只是「一半的清理」；③ 離場鉤先問 HL.gameFrame.isPipActive("vsslot:"+room.id)：若這一場真的被移到 PiP 續播，就不要棄局（見另一條 finding），二者只能選一個語意，不能兩個都成立。

### 2. [high / certain] vsslot.render 的 PiP 續播早退，跳過離場鉤註冊／escrow 認領／timers 重置 ⇒ 續播回來的那一場「沒有任何離場鉤」，賭注會被靜默沒收
- **位置**：`prototype/src/views/vsslot.js:566`
- **為什麼是錯的**：render() 第一行的 resumeFrame 命中就 `return resumed`，於是後面全部沒跑：room=findRoom、timers=[]、escrow=room._escrow 的**認領**、normalize、noSeatFor、以及 579 行的 HL.shell.onExit 註冊。這正是 P0 的鏡像——P0 是「鉤子被同一次掛載殺掉」，這條是「鉤子根本沒被裝上」。可達路徑很短：對戰中開 PiP → 在 PiP 底部按 ⚙ 遊戲設定 → 改「金額顯示幣別」→ game-frame.js:69 呼 HL.app.refresh() → renderApp({rerender:true}) → mountView 走 dropExit（丟掉不開火，正確）→ clear(main) → vsslot.render() → resumeFrame 命中 → 早退。此刻 exitFns 是空的、room._escrow 仍 >0，玩家下一次按底部導覽＝賭注消失且不記敗局、不記 liveStats、無 toast（＝2026-09-07 那條鎖原本要修的現象，從 PiP 這個門又走回來了）。看起來正常的原因：畫面上外框重建、盤面回到原視窗，一切如常；而 `HL.gameFrame.isPipActive` 這個唯一能分辨「這一場只是搬到 PiP」的 API 全 repo **零個使用者**（game-frame.js:209 匯出、無人呼叫）＝典型「容器沒有人用」。
- **重現**：1) 進一場 Slots Battle，等 3-2-1 歸零扣款、進入對戰。  
  2) 按外框「⧉ 子母畫面」。  
  3) 在 PiP 底部按「⚙」→ 把「金額顯示幣別」改成 USD（這會呼叫 HL.app.refresh）。  
  4) devtools：  
     var st=HL.state.get(); var r=st.arenaRooms.filter(function(x){return x.id===st.activePoolId;})[0];  
     console.log("escrow=", r._escrow);      // >0（錢已扣）  
     var m0=st.arenaStats.matches, b0=st.balance;  
     HL.router.go("lobby");                  // 沒有任何 toast  
     console.log(HL.state.get().arenaStats.matches-m0, HL.state.get().balance-b0, r._escrow);  
  期望（缺陷現象）：0、0、且 r._escrow 仍 >0 ⇒ 一份賭注不見了、沒退、沒記敗局、沒進流水。
- **建議修法**：resumeFrame 續接原場 ≠ 不必登記：把 render() 拆成「認領 + 登記」與「建構相位」兩段，早退分支只跳過後者。最小修法是在 566 行的 resumed 分支內同樣做 room=findRoom(roomId)、escrow=room._escrow||0，並照 579 行註冊同一份離場鉤（不要 timers=[]、不要 phaseSearching）。同時給 isPipActive 找到它的第一個使用者：離場鉤內 `if (HL.gameFrame && HL.gameFrame.isPipActive("vsslot:"+room.id)) return;`，讓「續播」與「棄局」二選一而不是兩者都發生。

### 3. [high / certain] later() 的存活閘認的是模組級 root，同頁重繪後恆為真 ⇒ 舊 render 的相位鏈繼續跑並寫進新畫面；鎖 games/arena/exit-hook-settles-escrow 最後一條是 vacuous
- **位置**：`prototype/src/views/vsslot.js:60`
- **為什麼是錯的**：閘寫成 `if (root && root.ownerDocument && !root.ownerDocument.body.contains(root)) return;`，而 root 是模組級變數，第 584 行的新 render 已經把它換成新節點（並由 mountView 掛進 main）⇒ 舊那批回呼求值時看到的是**新的、attached 的** root，閘永遠通過。更糟的是 phaseSearching/phaseFound/phaseGame/setBeat 全都對同一個模組 root 做 HL.dom.clear/appendChild/setAttribute ⇒ 舊鏈不是「對著脫離文件的節點跑完」，而是**直接把上一場的相位與 data-beat 畫進新畫面**。同時 render() 只做 `timers = []`（567 行）而不 clearTimers ⇒ 舊那批計時器連參照都被丟掉，永遠不可能被清。實際可觀察的兩種現象：(a) 對戰跑到第 N 輪時切語系／改顯示幣別／存個資（i18n.js:191、game-frame.js:69、app-shell.js:423 都呼 HL.app.refresh）⇒ 畫面**退回「配對中…等待玩家加入」**、十輪進度全失，但賭注已扣（room._escrow 仍在），此時按「拒絕」或底部導覽＝沒收一份賭注＋記一筆生涯敗局，而玩家從沒接受過這一場；(b) 若重繪落在承諾倒數期間，舊鏈的 step(0) 會在畫面顯示「配對中」時執行 escrowTake ⇒ 餘額在沒有任何倒數/封盤宣告的情況下自己少一份賭注。看起來正常的原因：兩條鏈寫同一個 root，畫面永遠「有東西」，且 node 測項只 grep 到 `body.contains(root)` 這串字就判綠——checks-games.js:3241 那條斷言（「vsslot 的 later() 必須自帶存活閘（同頁重繪後舊計時器不得繼續跑）」）在真實破壞下也不會紅，它守的性質從未成立。實際擋住舊鏈的其實是 runRound 第一行的 `document.body.contains(sides[0].boardEl)`（per-instance，正確形制），而那只在輪邊界生效。
- **重現**：1) 進一場 Slots Battle，接受、扣款、打到 Round 4 左右。  
  2) 按外框「⚙ 遊戲設定」→「金額顯示幣別」改 USD（＝HL.app.refresh）。  
  3) 立刻觀察：  
     document.querySelector('.ax-mm__txt') && document.querySelector('.ax-mm__txt').textContent  // "配對中…等待玩家加入"  
     document.querySelector('.ax-duel').getAttribute('data-beat')  // 仍被舊鏈寫成 round-reveal / round-score / round-gap  
     var st=HL.state.get(); st.arenaRooms.filter(function(x){return x.id===st.activePoolId;})[0]._escrow  // >0：錢已扣、進度歸零  
  4) 按「拒絕」→ toast「賭注不退還」＋ HL.state.get().arenaStats.losses +1。  
  負向擾動驗鎖 vacuous：把 60 行改成 `if (false) return;`（等於拿掉存活閘），跑 `node prototype/tests/run.js` ⇒ 只有那條 grep 斷言會紅；反之把閘保留但讓它永真（現況）＝全綠而缺陷存在。
- **建議修法**：存活閘必須綁**這一次 render 的**節點，不是模組變數：在 render() 內 `var myRoot = el(...)`，later 改成 `function later(fn, ms, node)` 或用閉包工廠 `makeLater(myRoot)`，閘判 `document.body.contains(myRoot)`（比照同檔 runRound 與 fgboard 的 container 形制）。同時 render() 進場應該 clearTimers()（而不是 timers=[]）＋比照 bounty 加一個 epoch，讓「上一次掛載」在任何情況下都無法再動 root/room/escrow。鎖也要改成守性質而非守字串：斷言閘的參數不得是模組級識別字（例如要求 later 簽章帶節點參數、或 body 內出現 `contains(myRoot)` 這類 per-render 名稱），否則它抓不到自己要抓的東西。

### 4. [high / certain] 會員模式：play_battle 在開打前就已在伺服器原子結算並寫進 battle_history，中途離場的棄局又寫第二筆 ⇒ 同一場兩筆戰績，且「賭注不退還」在會員模式是假的
- **位置**：`prototype/src/views/vsslot.js:543`
- **為什麼是錯的**：phaseGame 一進場就呼 HL.api.playBattle（543 行），而 docs/supabase-phase6.sql:95-101 的 play_battle 是 security definer 的**原子結算**：當場 update profiles set balance/arena_stats/wagered、ops_log_srv 記 bet+win、並 insert into battle_history。也就是說在第一輪盤面轉之前，伺服器上這一場**已經結束並入帳**。此時玩家中途離場：forfeitEscrow（99 行）只動客端——escrow 標記清掉、記一筆 liveStats、並呼 HL.arenaStats.record({forfeit:true,win:false,net:-lost})，而 arena.js:252 的 statRecord 尾端無條件 `HL.api.recordBattle(rec)` ⇒ **同一場在 battle_history 多插一列棄局敗局**。下一次 F5/hydrate（main.js:142 loadProfile+loadHistory）餘額與 arena_stats 一律採伺服器值 ⇒ 客端那筆棄局敗局消失、若那場其實是贏，玩家把獎金完整拿回 ⇒ 整個 escrow 設計要防的「落後就走零成本」在會員模式並未成立。看起來正常的原因：Demo 模式（唯一常被測的模式）沒有伺服器，這條路完全不會走到；而會員模式下畫面上的 toast、戰績、餘額在**當下**都是自洽的，矛盾只在重新載入後才顯現。反向不對稱可佐證：正常結束的 SRV 路徑（finish() 的 SRV 分支）刻意不呼 statRecord，只手動 merge R.stats——只有棄局那條路忘了同樣的紀律。
- **重現**：需 Supabase 會員模式（不帶 ?demo=1、登入後切站）。  
  1) 進一場 Slots Battle → 接受 → 等承諾倒數歸零進入對戰（此刻 play_battle 已在伺服器結算完，可在 Network 看到 rpc/play_battle 200 且回傳含 balance/stats）。  
  2) 第 3 輪時用底部導覽離開 → toast「已離開對戰，賭注 NT$X 不退還」，Network 會多出一次 battle_history 的 insert（recordBattle）。  
  3) F5 重新載入 → HL.state.get().arenaStats（來自伺服器 arena_stats）沒有那筆棄局、matches 只 +1、餘額＝伺服器值（若該場勝，錢完整拿回）。  
  4) 直接查表：select ts,win,net,payload->>'forfeit' from battle_history order by ts desc limit 2; ⇒ 同一場兩列。
- **建議修法**：「一場對戰只准有一個權威結算點」。會員模式下伺服器已是權威，客端的棄局就不該再自己記帳：① forfeitEscrow 在 memberMode 時不得呼 HL.arenaStats.record（或 statRecord 對 forfeit:true 一律不做 recordBattle）；② 真要讓棄局有成本，必須把 play_battle 拆成 open_battle（伺服器預扣 escrow、回傳 commit）與 settle_battle（結算），棄局改呼一支 forfeit_battle RPC 由伺服器據實了結——目前的「開打即結算」讓客端的棄局在語意上不可能成立。短期至少要在畫面上停止承諾做不到的事（會員模式的棄局 toast 不該說「不退還」）。

### 5. [high / certain] 賞金局開 PiP 後換房：PiP 裡殘留的是舊房 DOM 但 room/playEl 是模組單例 ⇒ 在 PiP 上按「開始挑戰」會對「現在這一房」扣費並把畫面畫進新房
- **位置**：`prototype/src/views/bounty.js:301`
- **為什麼是錯的**：bounty 的全部狀態都是模組全域（room/playEl/fCards/fCardEls/mineActive…），世代閘 epoch 只被用在 setTimeout 與 RPC .then 的首行（見 116/121/127 等），**完全沒有閘住 click handler**——buildCard 的 `node.addEventListener("click", …pickCard(i,node))`、renderIdle 的「開始挑戰」鈕、renderMine 的 startBtn/cashBtn 都是活的。平常這不成問題（換頁時 DOM 被 clear 掉，按鈕跟著消失），但 PiP host 掛在 document.body（game-frame.js:135）而不是 #app ⇒ 舊房的整塊互動面板在換頁後**仍然可見且可點**。此時 room 已被新一次 render 重指到另一間房 ⇒ 在 PiP（A 房畫面）按下的動作，扣的是 B 房的 room.cost、改的是 B 房的 prizePool/playsLeft、清空並重畫的是 B 房的 playEl。看起來正常的原因：兩個表面各自都「有反應」——PiP 動不了（因為卡片其實已經是別房的狀態機在跑），而 B 房的頁面看起來像自己開了一局；玩家只會覺得「我按錯了」。#15 那組 epoch 註記（bounty.js:20-27）描述的正是這個家族，但它把答案寫成「閘計時器與 RPC」，漏了「還活著的 DOM 事件」。
- **重現**：1) 競技場 → 進 A 房（賞金局·翻牌）→ 按外框「⧉ 子母畫面」。  
  2) 底部導覽回競技場 → 進 B 房（另一間賞金局，最好 cost 不同）。  
  3) devtools 記基準並在 PiP 上按主鈕：  
     var st=HL.state.get(); var B=st.arenaRooms.filter(function(x){return x.id===st.activePoolId;})[0];  
     var b0=st.balance, p0=B.prizePool, l0=B.playsLeft;  
     document.querySelector('.ax-pip .ax-btn-primary').click();   // PiP 顯示的是 A 房  
     console.log(HL.state.get().balance-b0, B.prizePool-p0, B.playsLeft-l0);  
  期望（缺陷現象）：扣的是 −B.cost、B.prizePool +B.cost、B.playsLeft −1，且 B 房頁面的盤面被清空重畫，而 PiP（A 房）畫面完全沒動。
- **建議修法**：epoch 要閘的是「這一次掛載的所有出口」，不只計時器：在 buildCard/renderIdle/renderMine 建互動節點時捕捉 `var tk = epoch`，handler 首行 `if (tk !== epoch) return;`（並把節點標成 disabled）；更根本的做法是讓 bounty 的一次掛載回傳一個 session 物件（room/playEl/state 都掛在它身上）而不是寫模組全域，PiP 續播就自然只驅動自己那個 session。另外 render 的 resumeFrame 早退（bounty.js:296）同樣跳過了 onExit 註冊與 epoch++，與 vsslot 是同一形狀，要一併處理。

### 6. [high / certain] arenaSim 的席位重置只跑 seats[1..n-1]，seat 0 永遠留著 buildPlayers 寫進去的「你」⇒ 進過的房永久寫「回到對戰 ›」，點下去其實是重新開一場並再收一份賭注
- **位置**：`prototype/src/views/arena.js:476`
- **為什麼是錯的**：vsslot 的 buildPlayers（vsslot.js:157）會把陣容寫回 room.seats，而「你」恆為索引 0；simVsslot 跑完一場後的重置迴圈是 `for (var m = 1; m < n; m++)`、緊接著的強制清位是 `seats[n-1] = null` ⇒ **seats[0] 從來沒有人清**。後果三個表面同時說謊：① joinability 的 seated 恆真 ⇒ battleCta 永遠回「回到對戰 ›」，而它上一行的註記逐字寫著「（且不得再收一次賭注）」——實際上 enterRoom→router.go("vsslot")→render→phaseSearching 是**全新一場**，承諾倒數歸零時 escrowTake 再扣一份（前一場的 room._escrow 早已在結算/棄局時 delete）；② isMineRoom 恆真 ⇒ 那間房永久佔住「我的房間」頁籤（連你只是加入過的公開房也算）；③ simVsslot 的假模擬把 seats[0]（你）當成參賽席位算勝負（472-475），`best===0` 時把 wager 記進 r.hostEdge、並往 r.log 推一筆 `winner:"你"` ⇒ 房間熱度條與過程明細顯示你贏了你根本沒打的場次。看起來正常的原因：2026-09-07 那輪把 CTA 收斂成單一出口並每秒重建（rooms-cta-not-stale 全綠），但那條鎖守的是「文字要跟著 joinability 走」——joinability 讀的資料本身就永久錯了，於是修完的按鈕忠實地顯示了錯的狀態。
- **重現**：1) 競技場 → 加入任一公開 Slots Battle 房，記下 id（devtools：HL.state.get().activePoolId）。  
  2) 打完或中途離場，回競技場。  
  3) devtools：  
     var id="<剛才的 id>"; var r=HL.state.get().arenaRooms.filter(function(x){return x.id===id;})[0];  
     console.log(r.seats[0], r.mine, r.log.slice(-2));   // seats[0] 恆為 {name:"你"}；log 可能出現 winner:"你"  
  4) 房卡 CTA 永遠是「回到對戰 ›」；記下餘額後按它 → 走完承諾倒數 → 餘額再少一份 wager：  
     var b0=HL.state.get().balance; /* 按「回到對戰 ›」→「接受對戰」→ 等 3-2-1 */ HL.state.get().balance-b0;  // = -wager  
  5) 切到「我的房間」頁籤 ⇒ 那間別人開的房長在裡面。
- **建議修法**：「我在這間房有沒有位子」需要一個明確的離座出口，而不是靠假模擬去清。建議：① vsslot 在結算完成（escrowSettle）與棄局（forfeitEscrow）時把自己從 room.seats 移除（單一出口，例如 leaveSeat(room)）；② simVsslot 的重置迴圈改成「清掉所有非房主席位（含 index 0 若那不是房主）」，並在挑選勝者時排除沒有真人在打的席位——現在它會把「你」算進去；③ battleCta 的 seated 分支若要保留「回到對戰」語意，就必須真的能回到那一場（續接 escrow），否則文案應改成「再戰一局 NT$X」把價錢印在鈕上（與結算卡的 REBET 語意一致）。

### 7. [high / certain] 直播間跟注的「離開時退回未結算跟注」是死碼：ticker.clearAll 恆早於 DOM 拔除 ⇒ 離開/切語系＝那一注被靜默沒收
- **位置**：`prototype/src/views/liveroom.js:131`
- **為什麼是錯的**：退款寫在 ticker 回呼裡、條件是 `!cdEl.isConnected`（節點已脫離文件才退）。但每一條離開路徑都先清 ticker 才清 DOM：enterView→renderApp 的第一行就是 HL.ticker.clearAll()（main.js:77），renderAuthView 也是先 clearAll（main.js:123）再 clear(root)（129）。因此那個回呼**永遠不會在 cdEl 已脫離文件的狀態下被呼叫一次**，退款分支不可達；跟注的錢在 liveroom.js:93 已經 setBal(bal()-stake) 扣掉，於是離開直播間＝一注消失（不退、不結算、無 toast、不進 liveStats）。同一段的註記（128-129 行）寫著「換頁 enterView 會 clearAll；但 HL.app.refresh 重繪不經 clearAll」——這句話在 main.js:77 加上 clearAll 之後就過時了，而**正是那句過時的假設**讓這個自我移除式防禦被當成足夠。另外「📺 切換子母畫面」（liveroom.js:101-104）把 stake 交給 HL.streamer 後直接 router.go，streamer 自己維護 following/followBet（layout/streamer.js:76/86），liveroom 的 followed 同樣蒸發。看起來正常的原因：金額小、無提示，且回到直播間時一切重新開始。（註：本檔不在指派的檔案清單內，但它與 vsslot escrow 是同一個家族——延後結算 + 靠「節點還在不在」當存活閘 + 清理排在拔 DOM 之前——故一併回報。）
- **重現**：1) 全球獎 → 任一主播 → 進直播間 → 選邊 → 按「跟注」（餘額立刻 −stake）。  
  2) 在本局倒數結束前，devtools：  
     var b0=HL.state.get().balance;  
     HL.router.go("lobby");            // 或按底部導覽任一頁；切語系同理  
     console.log(HL.state.get().balance - b0);   // 0 ⇒ 沒退也沒結算，那一注消失  
  3) 反證退款分支不可達：在 131 行加 console.log 後重跑步驟 2 ⇒ 永遠不會印出來（tickFn 已在 renderApp 第一行被 clearAll 移除）。
- **建議修法**：錢的了結不能掛在「畫面節點還在不在」這種被清理順序決定的訊號上。改用與對戰同一套出口：liveroom 在 render 內 `HL.shell.onExit(function(){ if (followed) { setBal(bal()+followed.bet); followed=null; } })`（mountView 已保證清理先於建構，且同頁重繪走 dropExit＝不誤退），並在「切換子母畫面」交棒時把 followed 一起移交給 HL.streamer（或當場退回）。131 行那個 isConnected 分支可以留作第二層保險，但不能是唯一的一層；順手更正 128-129 的過時註記。

### 8. [medium / certain] 房間過程明細的 Slots Battle 分支讀的欄位與 simVsslot 寫入的 log 形狀完全不符，而該分支目前 0 個使用者（createBattle 寫死 mine:false ⇒ endMyRoom 對對戰房不可達）
- **位置**：`prototype/src/views/arena.js:212`
- **為什麼是錯的**：processModal 的非 bounty 分支渲染 `e.name / e.my / e.opp / e.win`，但全 repo 唯一會往 vsslot 房的 log 寫東西的是 simVsslot（arena.js:475），它推的是 `{ winner, scores }`；vsslot.js 的 bumpRoom 只加計數、不寫 log。所以那一列一旦被渲染就是「? ／（空名字）／你 undefined : undefined 對手 ／ 對手勝」，而且 `e.win` 恆 undefined ⇒ 每一場都標成對手勝。之所以沒人發現：這個分支**根本到不了**——processModal 只從 settlement() 的「看過程」進入（arena.js:232），settlement 只從 endMyRoom（481）進入，endMyRoom 只在 tick 的 `if (r.mine) ended.push(r)`（461）時被呼叫，而 createBattle 對自建對戰房寫死 `mine: false`（735）⇒ 對戰房永遠不會結算、不會出現「我的房間結算」卡、也就永遠不會有人按那顆「看過程」。這是「容器沒有人用，而它一有人用就是壞的」那一型：等哪天補上 S15 EXPIRED／房主結算，第一個使用者就會看到一整面 undefined，而所有既有測項仍然全綠。
- **重現**：devtools（Demo 模式，不需要等房間到期）：  
    // 1) 造出 simVsslot 寫的 log 形狀  
    var r = HL.state.get().arenaRooms.filter(function(x){return x.type==="vsslot";})[0];  
    for (var i=0;i<40;i++) HL.arenaSim.tick();  
    console.log(r.log[0]);          // => { winner: "…", scores: [...] }  沒有 name/my/opp/win  
    // 2) 直接餵給那個渲染分支（把 r.mine 打開讓 endMyRoom 這條路走得通）  
    r.mine = true; r.endsInSec = 1;  
    HL.arenaSim.tick();             // 觸發 endMyRoom → settlement 卡 → 按「看過程」  
  期望（缺陷現象）：每一列都是「? ／ 你 undefined : undefined 對手 ／ 對手勝」。  
    // 3) 反證沒人用：全 repo 對「帶 spec 的房主結算」呼叫點為 0 —— grep -n "mine: true" prototype/src/views/arena.js 只有賞金局，createBattle(735) 是 mine:false
- **建議修法**：讓寫入端與讀取端共用一份形狀：把「一場對戰的紀錄」收斂成單一建構子（vsslot.js 的 makeRec 已經是一份，simVsslot 應該產出同形狀，或 processModal 改讀 winner/scores 並用 HL.battleMode.rankBy 決定名次與勝負，不要自己判 e.win）。同時決定自建對戰房的房主結算到底要不要有：要，就把 createBattle 的 mine 改對並補 roomNet/endMyRoom 的對戰分支；不要，就把 processModal 的 vsslot 分支刪掉——留著一個到不了又是壞的分支，只會讓下一輪誤判「這裡已經做好了」。

> 掃過但判定沒問題／無法驗證：【掃過、判定沒問題的地方】\n① mountView 的工廠簽章與順序：`typeof build !== \"function\"` 拒收節點 → stopAll → dropExit/runExit → clear(main) → appendChild(build())（app-shell.js:707-724）確實保證「清理先於建構」，P0 那個形狀在 mountView 這一層已封住。\n② renderApp 的兩個全域清理都排在新 view render 之前：HL.ticker.clearAll()（main.js:77）與 HL.instant.stopAll()（78），mountView 內又各跑一次（714）——都早於 build()，所以新 view 在 render 期間註冊的 ticker 與 livePanel 不會被同一次掛載殺掉。instant.js:264 那段「刻意不在註冊時 stopAll(true)」的註記是對的，登記簿沒有自刪問題。\n③ 4 個 onExit 註冊點逐一確認：vsslot.js:579、bounty.js:301、instant-duel.js:114、instant-picks.js:220 都在各自 render 的同步流程內註冊 ⇒ 在 mountView 的 runExit 之後、不會被自己開火（前提是走 mountView；resumeFrame 早退這條例外已列為 finding 2/5）。\n④ runExit 的一次性語意（`var fns = exitFns; exitFns = []`）在 build() 拋例外時不會「漏鉤」——鉤子早已開火；後果只是 main 留白且新 view 無鉤，不足以單獨成立一條 finding。\n⑤ enterView 的 `HL.reveal.drain()` 排在 state.set/renderApp 之前（main.js:61-64），renderAuthView 也先 drain（121）⇒ 新 view render 期間入列的 reveal 不會被同一次掛載清掉；HL.app.refresh 刻意不 drain，正確。\n⑥ renderAuthView 的 runExit(\"signed-out\")（main.js:126）排在 clear(root)（129）之前，登出這條不經 mountView 的路徑已補上。\n⑦ vsslot 的 runRound 存活閘用 `document.body.contains(sides[0].boardEl)`（per-instance）＝正確形制；fgboard 的 cascade 用 container 亦同。真正錯的只有 later() 那一個（finding 3）。\n⑧ bounty 的 epoch 對「計時器 / RPC .then」那一半是正確的（render 進場 ++、onExit ++、每個回呼首行比對 tk）；漏的是 DOM 事件那一半（finding 5）。\n⑨ arena.js updateCard 的對戰分支已連 CTA 一起重建（513），bounty 分支不重建 CTA 但 playsLeft<=0 的房會在同一個 tick 被 splice 掉，窗口 <1s，不列。\n\n【我無法驗證的地方】\n(a) 畫面是否真的在動：preview 面板隱藏時瀏覽器不合成影格（rAF 不觸發、CSS transition 不推進、screenshot 逾時），所以所有動畫時序類推論只到「拍的順序與 DOM/狀態」為止。\n(b) finding 1 的「整場跑完」帶時序條件——離場瞬間必須有 fgboard 的裸 setTimeout 在飛（實務上一輪的大部分時間都是），若剛好落在輪間空檔（round_gap，500×sp ms）則 clearTimers 會真的把鏈切斷、只剩「PiP 內凍結的對戰 + 已棄局」這個較輕的症狀。故標 likely 而非 certain；兩種結果都是缺陷。\n(c) 會員模式（finding 4）沒有 Supabase 憑證可實跑，結論來自 vsslot.js:543 的呼叫時機 + docs/supabase-phase6.sql:95-101 的 play_battle 本體（update profiles + insert battle_history 在同一交易內）+ arena.js:252 的無條件 recordBattle 三者對讀；若正式環境部署的是 phase7 版本，站別欄位不同但「開打即結算」的時序不變。\n(d) 沒有實際跑 `node prototype/tests/run.js`（只讀不改、且不確定是否會動到 build_lock/工作區），finding 3 提到的 vacuous 鎖是靠逐字讀 checks-games.js:3239-3242 的斷言本體判定的。

## 配對與房間狀態機（arena 房卡 ⇄ arenaSim.tick ⇄ vsslot 相位機）

### 9. [high / certain] 只要看到「✅ 配對成功」，你就被永久寫進那間房的 seats[0]——按「拒絕」也一樣，而且整房被填滿
- **位置**：`prototype/src/views/vsslot.js:157`
- **為什麼是錯的**：`phaseFound()`(vsslot.js:190) 的第一行就是 `buildPlayers()`，而 buildPlayers 的副作用是 `room.seats = list.map(...)`（157 行）——把「你」寫進 seats[0]、把原房主推到 seats[1]、並用現抽的 `HL.mock.makeHost()` 把**所有空位一次填滿**。這一切發生在「接受／拒絕」兩顆按鈕渲染出來**之前**，而真正的扣款點在倒數歸零（vsslot.js:245）。於是：①按「拒絕」（vsslot.js:196 → backArena）或直接用底部導覽走掉，房間狀態已被改壞、你沒付一毛錢卻佔著位子；②`HL.state.get()` 回傳的是活物件（app-state.js:49），mutation 立即共享，下一個 tick 的 `updateCard` 會忠實把卡片刷成「2/2 玩家」＋CTA「回到對戰 ›」（joinability 的 `seated` 分支，arena.js:101/111）；③`visibleRooms()` 的「我的房間」頁籤靠 `iAmSeated`（arena.js:89/177），所以每一間你只是**點進去看一眼**的房都會堆進「我的房間」；④房間被填滿 ⇒ `simVsslot` 的 `emptyIdx` 為 -1 ⇒ 立刻開始跑模擬場、`r.done` 加速逼近 `r.plays`。看起來正常的原因：所有表面都一致地顯示「你在座」——它們讀的是同一份（已被污染的）真相，沒有任何一層知道你其實拒絕了。
- **重現**：競技場頁開 devtools：  
  var st=HL.state.get();  
  var r=st.arenaRooms.filter(x=>x.type==="vsslot"&&(x.seats||[]).filter(Boolean).length<(x.players||2)&&!(x.prefs&&x.prefs.priv))[0];  
  console.log("before",r.id,r.players,JSON.stringify(r.seats));  
  HL.router.go("vsslot", r.id);  
  setTimeout(function(){  
    document.querySelectorAll(".ax-mm__actions button")[0].click();   // 按「拒絕」  
    setTimeout(function(){  
      var r2=HL.state.get().arenaRooms.filter(x=>x.id===r.id)[0];  
      console.log("after ",JSON.stringify(r2&&r2.seats));              // → [{name:"你"},{bot},…] 全滿  
      var c=document.querySelector('[data-room-id="'+r.id+'"] .ax-room-card__foot button');  
      console.log("CTA", c&&c.textContent);                            // → "回到對戰 ›"  
    },1500);  
  },2000);  
  再點「我的房間」頁籤，剛剛拒絕的那間房就在裡面。
- **建議修法**：把「陣容決定」與「席位認領」拆開：`buildPlayers()` 只回傳 `room._lineup`（純計算，不寫 `room.seats`），真正把「你」寫進 `room.seats` 的動作移到 `accept()` 內、與 `escrowTake(room.wager)` 同一拍（vsslot.js:245）——**扣款與佔位是同一個事件，就不會有「沒付錢卻佔位」的中間態**。相對地離場鉤/棄局/`declineBtn` 要一併釋放席位（把 seats 內 name==="你" 的格子設回 null，並保留原房主在 seats[0]），寫成 `claimSeat(room)/releaseSeat(room)` 一組唯一出口。同時 `buildPlayers` 不該把空位一次填滿：空位補 bot 是 `simVsslot` 的職責，對戰陣容用 `_lineup` 表達即可。

### 10. [blocker / certain] 對 Slots Battle 開子母畫面再換頁＝自動棄局＋凍死；回頭進去走 resumeFrame，連離場鉤都沒註冊
- **位置**：`prototype/src/views/vsslot.js:566`
- **為什麼是錯的**：PiP 的設計意圖被寫在 game-frame.js:182 的註記裡：「開 PiP → 用底部導覽回大廳（**PiP 續播＝設計**）」。但 `vsslot.render` 在 579 行把 `clearTimers()+forfeitEscrow()` 掛上 `HL.shell.onExit`，而 `mountView`（app-shell.js:718）在**任何**換頁都會 `runExit("view-left")`——它不知道 PiP 存在（全 repo 沒有任何 `isPipActive` 的呼叫點）。於是玩家一換頁：所有計時器被清（對戰凍在當前那一輪）、escrow 被沒收並記一筆 `forfeit:true` 敗局，而 `pipHost` 是直接掛在 `document.body`（game-frame.js:135），`HL.dom.clear(main)` 動不到它 ⇒ **子母畫面上還好好地擺著一個「正在播放」的對戰盤面，其實已經死了、錢也沒了**。更糟的是回頭：從房卡點「回到對戰 ›」→ `render()` 第 566 行 `resumeFrame` 命中就 `return resumed`，**在第 567–583 行之前**——所以這一次掛載沒有 `findRoom`、沒有 `escrow = room._escrow` 認領、沒有 `normalize`、沒有 `noSeatFor` 檢查，**也沒有註冊 onExit**。玩家拿到一個永遠凍結、無法繼續、也不再受離場鉤保護的殭屍對戰（唯一出口是盤面內的「‹ 返回競技場」）。這正是你要我掃的家族：清理/建構的順序修好了，但「跳過建構」這條路徑同時也跳過了登記。
- **重現**：1) 進任一 Slots Battle，倒數歸零後（餘額已扣 wager）按外框工具列的「⧉ 子母畫面」。  
  2) 點底部導覽任一頁（例如「大廳」）。  
     → 立刻出現 toast「已離開對戰，賭注 NT$… 不退還」，但右下角 PiP 仍寫「Slots Battle」且盤面停在某一輪。  
  3) devtools 驗證凍結與帳：  
     HL.state.get().arenaStats.history[0];      // → {forfeit:true, win:false, net:-wager}  
     document.querySelector(".ax-pip").style.display;   // → "flex"（還在演「播放中」）  
     var b=document.querySelector('.ax-pip [data-beat]'); b && b.getAttribute("data-beat"); // 停在 round-* 不再前進  
  4) 回競技場點該房的「回到對戰 ›」→ 盤面原封不動、永不前進；devtools 確認沒有離場鉤：  
     HL.shell.runExit("probe");   // → 回傳 0（resumeFrame 路徑沒登記任何鉤子）
- **建議修法**：兩處都要補。①`mountView` 的 `runExit` 需要一個「這個 view 還活在 PiP 裡」的豁免：離場鉤改成回傳/登記時帶一個存活判準（例如 `HL.shell.onExit(fn, {aliveIf: function(){ return HL.gameFrame.isPipActive("vsslot:"+roomId); }})`），`runExit` 對 aliveIf 為真者**保留不開火**（保留而非丟棄，等 PiP 真的 closePip 時由既有的 `onTeardown` 了結）——`isPipActive` 已經導出但目前 0 個使用者，就是這個缺口。②`render()` 的 `resumeFrame` 早退路徑必須跟正常路徑共用同一段「認領」：把 567–583 行（findRoom／escrow 認領／normalize／onExit 註冊）抽成 `adopt(roomId)`，`resumeFrame` 命中時先 `adopt(roomId)` 再 return，讓「有沒有走 PiP」不改變登記行為。

### 11. [medium / certain] 觀戰資訊框是模式語意的第五個表面，自己硬寫勝負條件（且與 battleMode 的字不同），現有的 mode-semantics 鎖抓不到
- **位置**：`prototype/src/views/arena.js:161`
- **為什麼是錯的**：`battleInfoModal` 是玩家在**決定要不要進這間房之前**唯一能讀到規則的地方，而它把三模式的勝負條件硬寫成 `r.mode === "crazy" ? "Crazy Mode（最低分勝）" : r.mode === "terminal" ? "Terminal Mode（末輪決勝）" : "標準模式"`。單一真相 `core/battle-mode.js` 的字是 `Crazy Mode`＋`最低總分勝`、`Terminal Mode`＋`最後一輪增量最高勝`。差異不是美觀問題：「末輪決勝」讀起來像「末輪定生死（比總分）」，而真正的判準是**末輪增量**——這正是 08-21 那個顯示 BUG 的語意來源，只是搬到了觀戰面。看起來正常的原因有兩層：①房卡本身的模式標籤已經改走 `HL.battleMode.labelOf`（arena.js:117），所以卡面是對的，只有點進資訊框才會露出第二份真相；②常駐鎖 `games/arena/mode-semantics-single-truth`（checks-games.js:3493）用的是**存在性斷言**（`t.ok(/BM.winCondOf\(|battleMode.winCondOf\(/.test(ar))`）＋幾條針對舊寫法的黑名單正則，只要檔案裡**某處**用過 winCondOf 就綠——它不會發現同一個檔案裡另有一處自寫，所以這是 vacuous 的一半。
- **重現**：1) 競技場頁找一間 crazy 或 terminal 的滿房（CTA 顯示「👁 觀戰」），點它。  
  2) 對照兩行字：資訊框「模式」列寫「Terminal Mode（末輪決勝）」，而同一場打起來時 infoBar（vsslot.js:340）與回放標題（arena.js:336）都寫「Terminal Mode：最後一輪增量最高勝」。  
  3) devtools 直接證明第二份真相存在：  
     var src = HL.views.arena.render.toString();  // 拿不到私有函式，改讀檔：  
     fetch("src/views/arena.js").then(r=>r.text()).then(s=>{  
       console.log(/最低分勝|末輪決勝/.test(s));            // → true（硬寫的字還在）  
       console.log(HL.battleMode.winCondOf("crazy"), HL.battleMode.winCondOf("terminal"));  
       // → "最低總分勝" "最後一輪增量最高勝"（單一真相的字）  
     });
- **建議修法**：`battleInfoModal` 的「模式」列改成 `HL.battleMode.labelOf(r.mode) + "（" + HL.battleMode.winCondOf(r.mode) + "）"`，並把 `HL.battleMode.displayMetricLabel` 一併用上（觀戰面也該說明「你看到的數字是哪個量」）。同時把鎖從存在性檢查升級為**反向**檢查：斷言 `views/arena.js`／`views/vsslot.js`／`views/lobby.js` 內 `crazy`／`terminal` 兩個字串**只**出現在傳給 `HL.battleMode.*` 的位置——具體做法是把 `SPECS` 裡的每個 `winCond`/`label` 字面值抓出來，斷言它們在 view 檔中的出現次數為 0（文案只能來自模組，不能在 view 出現）。這條反向鎖同時能擋住未來任何新表面。

### 12. [medium / certain] 自建的對戰房永遠 mine:false ⇒ 房主結算整條路徑（roomNet/settlement/myRoomStatusModal/hostNet）0 個使用者，房間到期無聲消失
- **位置**：`prototype/src/views/arena.js:735`
- **為什麼是錯的**：`createBattle` 寫死 `mine: false`（735 行，為了讓 CTA 走「回到對戰」），而 `makeArenaRoom` 也從不給 vsslot 房 `mine`——`grep 'mine: true'` 全 repo 只命中 `createBounty`（arena.js:637）。於是 `r.mine && r.type==="vsslot"` 這個條件**永不成立**，下列容器全部 0 使用者：`endMyRoom`（arena.js:481，只有 `if (r.mine) ended.push(r)` 才會被呼叫）、`roomNet` 的 vsslot 分支（`r.net||0`——而 `r.net` 除了在 735 行初始化成 0，全 repo 沒有任何寫入點）、`myRoomStatusModal`/`settlement`/`processModal` 的 vsslot 分支、`battleCta` 的 `j.mine → "我的對戰" disabled` 分支（arena.js:88），以及 `arenaStats.hostNet`（唯一寫入點是 arena.js:490，永不執行 ⇒ 這個欄位在 app-state/api/main/statSummary 四處被搬運卻恆為 0，且 statTiles 也沒顯示它）。玩家看得到的後果：賞金局到期會彈「我的房間結算」卡，**你的對戰房到期只會從清單裡憑空消失**（tick 的 splice，arena.js:528），沒有結算、沒有通知、被挑戰期間累積的 `hostEdge/challEdge` 也沒人回報。看起來正常的原因：`iAmSeated` 那條補丁把「我的房間」頁籤救回來了，所以表面上「我的房間」是對的，只有「結算」這一半是空的——典型的修一半。另外 `bumpRoom`（vsslot.js:469）只加 `r.matches` 不加 `r.done`，而房間壽命只看 `done`，所以你自己在房裡打一百場也不會推進房間進度，兩個計數器長期分歧且卡面兩個都沒顯示。
- **重現**：1) 開房：競技場 →「＋ 開房發起挑戰」→ Slots Battle → 建立對戰。  
  2) devtools：  
     var mine=HL.state.get().arenaRooms.filter(r=>r.type==="vsslot"&&(r.seats||[]).some(s=>s&&s.name==="你"))[0];  
     console.log(mine.mine, mine.net, HL.state.get().arenaStats.hostNet);   // → false 0 0  
  3) 打完一場回競技場，再看：  
     console.log(mine.matches, mine.done, mine.hostEdge, mine.challEdge);   // matches 增加、done 沒動  
  4) 強制到期，看有沒有結算卡：  
     mine.endsInSec = 1;   // 等 1–2 秒  
     // → 卡片直接從格狀清單消失，沒有任何 modal / toast（對照：把賞金房的 endsInSec 設 1 會彈「我的房間結算」）
- **建議修法**：讓「這是不是我開的房」與「我有沒有坐在裡面」變成兩個獨立事實：`createBattle` 應該寫 `mine: true`（它確實是你開的），CTA 的判斷改用既有的 `joinability().seated` 優先（arena.js:87 已經是這個順序：seated 先於 mine，所以設 mine:true 不會回到「賣你一個你已經坐著的位子」）；`isMineRoom` 因此退化成 `!!r.mine || iAmSeated(r)` 的既有形狀不必動。接著把對戰房的房主帳補起來：`bumpRoom` 除了 `matches` 也要推進 `done`（或者把 `fin` 條件改成同一個計數器，二選一但只能留一個），並在 `endMyRoom` 的 vsslot 分支真的寫 `r.net`（用 `challEdge - hostEdge` 之類的單一公式，比照 `roomNet` 的 bounty 分支）。若決定「對戰房不做房主帳」，那就**刪掉** `roomNet`/`settlement`/`myRoomStatusModal` 的 vsslot 分支與 `hostNet` 欄位，不要留著假裝有。

### 13. [medium / certain] arenaSim 不認得座位 0 可能是「你」：模擬會把你算進去打幾十場（甚至判你勝）、換掉你的對手、最後把房間打到消失
- **位置**：`prototype/src/views/arena.js:476`
- **為什麼是錯的**：`simVsslot` 是照「seats[0]＝房主 bot」寫的：補位只補空格（470 行）、跑完一場只重置 `m = 1..n-1` 的席位（476 行）、最後強制 `seats[n-1]=null`（477 行）——**seats[0] 永遠不動**。但 `buildPlayers`（vsslot.js:157）會把「你」寫進 seats[0]，而 tick 的豁免只有 `r.id === st.activePoolId`（arena.js:519），一旦你回到競技場 activePoolId 就歸零 ⇒ 你入座過的每一間房都繼續被模擬。三個具體後果：①`best === 0` 時模擬會判**你**贏（472 行），`r.hostEdge += r.wager`、`r.log.push({winner:"你"})`，但沒有任何派彩、沒有 `liveStats`、沒有 `arenaStats`——房間帳本說你打了 N 場，生涯戰績說 0 場；②476 行每輪換掉 seats[1..]，`updateCard` 忠實把新頭像刷上卡面，而你點「回到對戰 ›」時 `buildPlayers` 因 `room._lineup` 已快取而**早退不重寫**（vsslot.js:152）⇒ **房卡上的對手名字/頭像跟你實際會對上的那批人不同**；③`r.done` 一路加到 `r.plays`(20) ⇒ `fin` 成立 ⇒ 房間被 splice（528 行），你那張「回到對戰 ›」的卡在中途無聲消失。看起來正常的原因：每一層都自洽——卡面刷的是 `r.seats` 的真值、對戰讀的是 `_lineup` 的真值、戰績讀的是 `arenaStats` 的真值，三份真值互不相通，沒有任何一層會噴錯。
- **重現**：1) 進任一 Slots Battle、打完（或倒數後棄局）回競技場，讓你留在 seats[0]。  
  2) devtools 觀察模擬把你算進去：  
     var r=HL.state.get().arenaRooms.filter(x=>x.type==="vsslot"&&(x.seats||[]).some(s=>s&&s.name==="你"))[0];  
     var m0=HL.state.get().arenaStats.matches, d0=r.done||0, s0=JSON.stringify(r.seats);  
     setTimeout(function(){  
       console.log("done", d0, "→", r.done);                       // 房間場次一直增加  
       console.log("我的生涯場次", m0, "→", HL.state.get().arenaStats.matches);  // 完全沒動  
       console.log("seats", s0, "→", JSON.stringify(r.seats));     // seats[1..] 已換人，seats[0] 還是「你」  
       console.log("log 判誰贏", (r.log||[]).slice(-3));            // 可看到 {winner:"你"}  
     }, 30000);  
  3) 對手不一致：記下卡面 seats[1] 的名字，點「回到對戰 ›」，等「✅ 配對成功」——畫面上的對手是舊的 `room._lineup`：  
     console.log(JSON.stringify(r._lineup), JSON.stringify(r.seats));  
  4) 讓它打到消失：r.plays = (r.done||0)+2;  // 等幾十秒，卡片會直接不見
- **建議修法**：給房間一個明確的「這一席是真人（你）」旗標，讓模擬繞開它：`buildPlayers`/`claimSeat` 寫席位時帶 `{ name:"你", av:"👑", me:true }`，`simVsslot` 開頭先 `if ((r.seats||[]).some(function(s){return s&&s.me;})) return;`——**有真人在座的房間不由背景模擬推進**（比照全檔既有的 `if (HL.site.isLive()) return;` 閘的形狀）。若仍想讓房間在你離場後恢復模擬，那就把「離場即釋放席位」做掉（見第 1 條的 `releaseSeat`），兩者合起來才是一致的：在座＝模擬停手、離場＝席位還原＋模擬接手。另外 `room._lineup` 的快取條件要跟 `room.seats` 綁在一起（例如存一個 `_lineupSig` = seats 名字串接，簽名不符就重建），否則「卡面對手 ≠ 實際對手」會以別的入口再長回來。

### 14. [medium / certain / 已知] 大廳「熱門玩家擂台」重用 roomCard 但零更新機制：倒數/席位/CTA 全是凍結快照，已被刪掉的房間還能點進「此對戰已結束」
- **位置**：`prototype/src/views/lobby.js:114`
- **為什麼是錯的**：`hotRoomsSection` 直接 `HL.arenaUI.roomCard(r)`，拿到的是跟競技場一模一樣的卡（含 `data-room-id`、⏱ 倒數、席位格、CTA），但 `arenaSim.tick` 的原地更新有兩道限制：①守衛 `HL.state.get().view === "arena"`（arena.js:533）②`updateCard` 用的是 `gridEl.querySelector`（arena.js:503），而 `gridEl` 是 arena view 的模組變數、不是大廳那個 `.ax-room-grid`。⇒ 大廳的卡從渲染那一刻起就**完全凍結**：倒數不走、席位不變、「加入 NT$X」不會變成「觀戰」。競技場那邊 09-07 的修法（`battleCta` 單一出口 + `updateCard` 重建按鈕）解的是同一個病，但只解了一個表面。點擊行為只有一半被救回：`cardAction`（arena.js:107）會在點擊當下重問 `joinability`，所以「剛剛滿了」會給 toast；但**房間已被 tick splice 掉**時，`joinability` 面對的是一個仍然有效的 detached 物件（`HL.state.get()` 回傳活物件、splice 只從陣列移除），判定 canJoin 為真 ⇒ `enterRoom` → `HL.router.go("vsslot", id)` → `findRoom` 回 undefined → 玩家撞上「此對戰已結束。」的死面板（vsslot.js:572）。另外「熱門」的排序鍵是 `challenges`，而 `simVsslot` 每補一個 bot 就 `r.challenges++`（arena.js:470），所以這個排序其實在排「bot 坐下次數」。
- **重現**：1) 停在大廳，記下「🔥 熱門玩家擂台」某張卡的 ⏱ 倒數與人數。  
  2) 等 30 秒——數字完全沒動（切到競技場，同一間房的倒數是在走的）。  
  3) devtools 造出「房間已消失但卡還在」：  
     var id=document.querySelector("#ax-main-content [data-room-id]").getAttribute("data-room-id");  
     var st=HL.state.get(); var i=st.arenaRooms.findIndex(r=>r.id===id);  
     st.arenaRooms.splice(i,1);            // 模擬 tick 的 fin splice  
     document.querySelector('[data-room-id="'+id+'"]').click();  
     // → 進到「此對戰已結束。」，而點下去之前那張卡看起來完全正常（還寫著「加入 NT$…」）
- **建議修法**：把「房卡的活性」變成卡自己的責任，而不是 arena view 的：在 `HL.arenaUI` 導出一個 `mountRoomGrid(container)`，內部用 `HL.ticker.add` 註冊自己的更新回呼（`document.body.contains(container)` 為存活閘、比照 vsslot 的 `later()`），競技場與大廳都改用它 ⇒ 只有一個地方知道「怎麼刷一張房卡」，第三個表面出現時自動跟上。同時把「房間還在不在」補進單一出口：`cardAction` 與 `enterRoom` 動作前先 `HL.state.get().arenaRooms.indexOf(r) >= 0` 判一次（或讓 `joinability` 多回一個 `gone` 欄位），gone 就 toast「這間房已經結束了」並就地移除卡片，不要讓玩家走到死面板。`hotRoomsSection` 的排序鍵改用 `matches`（真的打過幾場），並讓 `simVsslot` 的補位不再算進 `challenges`。

### 15. [blocker / likely] HL.api.playBattle 繞過 rpc() 包裝 ⇒ 唯一沒帶 p_site 的結算 RPC：真站的對戰結算會落在假站(demo)的經濟列
- **位置**：`prototype/src/core/api.js:65`
- **為什麼是錯的**：站別注入的單一出口是 `rpc()`（api.js:76-81：`if (HL.site && HL.site.mode && args.p_site == null) args.p_site = HL.site.mode();`），CLAUDE.md §4 也明文寫「前端 api.js `rpc()` 自動注入 `HL.site.mode()`」。但 `playBattle` 是全檔**唯一**直接呼叫 `HL.sb.rpc("play_battle", {...})` 的結算函式（65 行）——`slot_spin`/`slot_buy`/`bounty_flip`/`bounty_mine`/`wallet_txn` 全部走 `rpc()`。而 phase7 的簽章是 `p_site text default 'demo'`（docs/supabase-phase7.sql:113）⇒ 真站會員打一場 Slots Battle，伺服器 `perform ensure_econ(v_uid,'demo')`、扣加的是 **demo 那一列**的 balance/wagered/arena_stats、`ops_log_srv`/`log_big_win`/`battle_history` 全部標 `mode='demo'`，然後客端把伺服器回來的 `R.balance`（＝假站餘額）用 `HL.state.set({balance:+R.balance})` 直接寫進真站畫面（vsslot.js:532）——真站餘額被假站餘額整批覆蓋。看起來正常的原因：RPC 成功回傳、結算卡正常、餘額有動、`ops_summary` 只算 `mode='live'` 所以帳本上「什麼都沒發生」，沒有任何錯誤訊息；而 `defaultMode` 是 SQL 端的 default，不是前端能看到的失敗。同一形狀還有第二個入口 `rpcChicken`（api.js:113-115）也繞過注入，而 `chicken_start` 同樣是 `p_site default 'demo'`（phase7:332）。
- **重現**：會員模式登入、切到真站（⚙ DEMO 面板 → 真站，或 localStorage 的 HL_SITE_MODE='live' 後 reload），devtools：  
  var orig = HL.sb.rpc.bind(HL.sb);  
  HL.sb.rpc = function(n,a){ console.log("RPC", n, JSON.stringify(a)); return orig(n,a); };  
  console.log("目前站別", HL.site.mode());          // → "live"  
  HL.api.playSlotSpin(10);                          // 對照組 → RPC slot_spin {"p_bet":10,"p_site":"live"}  
  // 然後去打一場 Slots Battle：  
  // → RPC play_battle {"p_wager":1000,"p_players":2,"p_mode":"normal","p_rounds":10,"p_roster":[…],"p_game":"…"}  
  //   完全沒有 p_site ⇒ 伺服器用 default 'demo'  
  純程式碼佐證（不需部署）：  
  console.log(/HL\.sb\.rpc\("play_battle"/.test(HL.api.playBattle.toString()));  // → true（沒走 rpc()）
- **建議修法**：`playBattle` 改成走同一個出口：`return rpc("play_battle", { p_wager:…, p_players:…, p_mode:…, p_rounds:…, p_roster:…, p_game:… })`（`rpc()` 的錯誤折疊語意與現況一致：error → null → 前端降級結算，零回歸）。`rpcChicken` 需要保留「錯誤不折成 null」的語意，所以把注入本身抽成一個 `withSite(args)` 小函式，讓 `rpc`/`rpcChicken`/任何未來的包裝都呼叫它，注入邏輯只有一份。再立一條反向鎖：斷言 `core/api.js` 內 `HL.sb.rpc(` 的出現次數 ≤ 定義 `rpc`/`rpcChicken` 的那幾行（也就是**沒有任何遊戲函式直接呼叫 `HL.sb.rpc`**），否則紅——現有測項只驗「rpc() 會注入」，這是單向的，抓不到「有人不走 rpc()」。

### 16. [high / certain] battle_history.mode 一欄兩義（伺服器寫站別、客端寫遊戲模式），而 loadHistory 完全不依站別過濾 ⇒ 真站的「戰績與回放」混進假站對戰
- **位置**：`prototype/src/core/api.js:46`
- **為什麼是錯的**：phase7 把 `battle_history` 加了 `mode text not null default 'demo'` 作為**站別**維度（docs/supabase-phase7.sql:50），並讓 `play_battle` 的 insert 寫 `v_site`（phase7:162-164），把遊戲模式改塞進 `payload.mode`。但同一張表的第二個寫入者 `HL.api.recordBattle`（api.js:55-56）**還是照 phase6 的語意**寫 `mode: rec.mode`＝遊戲模式（'normal'/'crazy'/'terminal'，phase6:97-99 的 `v_mode` 就是這個意思）。⇒ 同一欄同時存在 'demo'/'live' 與 'normal'/'crazy'/'terminal' 兩族值。而讀取端 `loadHistory`（46 行）是 `.select("payload").eq("user_id",…).order("ts").limit(n)`——**沒有任何站別條件**，回值直接被 `main.js:144-152` 塞進 `arenaStats.history`，也就是「戰績與回放」清單（arena.js:266）與 `#115` 報表（arena.js:383）的資料來源。所以 phase7 承諾的「真站戰績真分離」在讀取端是空的：真站登入後看到的最近 30 場包含你在假站打的。看起來正常的原因：欄位沒有 CHECK 約束、insert 不會失敗、清單長度與內容都「合理」，而且**沒有任何查詢在用這一欄**，所以一欄兩義目前完全不會報錯——等哪天有人加上 `.eq("mode","live")`，客端寫入的那批（'normal'/'crazy'）會整批消失。
- **重現**：程式碼層（不需部署即可坐實）：  
  console.log(HL.api.loadHistory.toString());  
  // → 只有 .eq("user_id", u.id)，沒有任何 mode/站別條件  
  console.log(HL.api.recordBattle.toString());  
  // → insert({ user_id, vs, mode: rec.mode, … })，rec.mode 來自 vsslot makeRec 的 room.mode  
  // 對照 docs/supabase-phase7.sql:162：insert into battle_history (…, mode, …) values (…, v_site, …)  
  部署後的行為驗證：  
  1) 會員登入、假站打 1 場（記住對手名字）。  
  2) 切真站（HL_SITE_MODE='live'）→ reload → 競技場 →「戰績與回放 ›」。  
     → 剛才假站那一場仍在清單第一列（真站經濟列是乾淨的，戰績卻不是）。  
  3) SQL 端：select mode, count(*) from battle_history group by 1;  
     → 同時看到 demo/live 與 normal/crazy/terminal 兩族值。
- **建議修法**：欄位語意只能留一個：既然 phase7 選了「mode = 站別」，就把客端寫入對齊——`recordBattle` 改成寫 `mode: (HL.site && HL.site.mode ? HL.site.mode() : "demo")`，遊戲模式本來就已經在 `payload.mode` 裡（`rec` 整包存進 payload）。同時 `loadHistory` 補上站別過濾 `.eq("mode", HL.site.mode())`，並在 SQL 加 `alter table battle_history add constraint battle_history_mode_chk check (mode in ('demo','live'))` ＋一次性遷移把既有 'normal'/'crazy'/'terminal' 的列改成 'demo'——**約束就是那條反向不變量**：只要有人再把遊戲模式寫進去，insert 直接失敗而不是靜默污染。長遠更乾淨的做法是把站別欄改名為 `site`，讓「mode」這個字在整個 schema 裡只有一個意思。

### 17. [medium / certain] vsslot.speed() 自己再寫一份速度常數，繞過 battleTempo.speedOf ⇒ 真站的「不提供 ultra」只夾住節拍，動畫與標籤仍是超快
- **位置**：`prototype/src/views/vsslot.js:160`
- **為什麼是錯的**：`battleTempo` 明文宣告自己是節奏的單一真相（檔頭：「view 內禁止再寫裸毫秒」），並提供 `speedOf(prefs)`＋在 `ms()` 內對真站做 `if (live && s < SPEED.fast) s = SPEED.fast;`（battle-tempo.js:72）。但 `vsslot.speed()` 是 `p.ultra ? 0.35 : p.fast ? 0.6 : 1`——把 `SPEED` 三個常數逐字複製了一份（家族「JS 與 JS 各寫一套」）。這個 `sp` 有兩條下游不經過 `ms()`：①`HL.fgBoard.create(…, { animSpeed: sp })`（vsslot.js:361）——盤面轉輪/彈分/消除的動畫速度；②`sp <= 0.35 ? "⚡⚡ 超快" : "⚡ 快速"` 的常駐標籤（vsslot.js:341）。⇒ 真站玩家開 ultra 房（`createBattle` 完全沒有站別閘，arena.js:727 起），節拍被夾成 fast、**動畫仍以 0.35 跑、infoBar 還掛著「⚡⚡ 超快」**：合規承諾（對標 UKGC RTS 14D/14E 禁 turbo）只實現了一半，而畫面反而在宣稱它沒被限制。看起來正常的原因：`battle-tempo/constants` 那條鎖驗的是 `ms("roll", ultra, {live:true}) === ms("roll", fast, {live:true})`——模組**自己**的行為是對的，鎖從來沒問「呼叫端的 sp 是怎麼算出來的」。
- **重現**：真站（localStorage HL_SITE_MODE='live'）：  
  1) 競技場 → 開房 → Slots Battle → 打開「⚡⚡ 超快旋轉 Ultra」→ 建立對戰。  
  2) devtools：  
     console.log(HL.site.mode());                                   // → "live"  
     console.log(HL.battleTempo.ms("roll", 0.35), HL.battleTempo.ms("roll", 0.6));  
     // → 兩者相同（節拍被夾到 fast＝540ms，模組層正確）  
     console.log(document.querySelector(".ax-battle__fast").textContent);   // → "⚡⚡ 超快"（標籤沒被夾）  
  3) 證明 view 自帶第二份常數：  
     fetch("src/views/vsslot.js").then(r=>r.text()).then(s=>console.log(/p\.ultra \? 0\.35 : p\.fast \? 0\.6 : 1/.test(s)));  // → true
- **建議修法**：`speed()` 改成薄轉接：`function speed(){ return HL.battleTempo.speedOf(room.prefs); }`，並在 `battleTempo` 加一個把真站夾制也算進去的出口（例如 `effSpeed(prefs, opts)`＝`speedOf` 後套同一段 `if (live && s < SPEED.fast) s = SPEED.fast`），讓 `ms()` 與 `animSpeed`／標籤都吃同一個值 ⇒ 真站的「無 ultra」在節拍、動畫、文案三處一致。另外 `createBattle` 的 ultra 開關在真站應該直接不給（`prefRow` 加站別閘），不要讓玩家設一個系統會偷偷改掉的偏好。鎖要立在**呼叫端**：斷言 `views/vsslot.js` 不得出現 `0.35`／`0.6` 這兩個字面值、且 `animSpeed` 的來源必須是 `battleTempo` 的出口（比照 `games/arena/tempo-beats` 已在做的 `has(rs, "BM.rankBy(room.mode")` 形狀）。

### 18. [low / certain] 私密房 priv 只有「擋」沒有「進」：建房表單承諾的分享連結不存在，而 vsslot.render 的進場閘也沒認 priv（單向不變量）
- **位置**：`prototype/src/views/vsslot.js:576`
- **為什麼是錯的**：`joinability()` 把 priv 硬性排除在 `canJoin` 之外（arena.js:104），`battleCta` 因此對每一間私密房都渲染「🔒 私密房」→ `battleInfoModal`。但 `prefRow("🔒", "私密房間 Private", "僅分享連結可加入")`（arena.js:704）承諾的那條連結**全 repo 不存在**（`grep 分享連結` 只命中 `core/referral.js` 的推薦碼與這兩行文案）⇒ mock 產生的 ~10% 私密房（mock-data.js:300）是永遠只能觀戰的裝飾，玩家自己開的私密房也沒有任何邀請動作可做。同時這是一條只有一個方向的不變量：**擋在 `joinability`（大廳側），而真正的進場閘 `noSeatFor`（vsslot.js:129/576）只看席位滿不滿、完全不看 priv**——`HL.arenaUI.enterRoom` 是導出的公開函式，任何未來的入口（深連結、通知、推薦落地、第二個房卡表面）只要呼叫它就直接繞過私密限制，而且不會有任何跡象。看起來正常的原因：今天所有點擊路徑都經過 `cardAction`，所以缺口是純潛在的；而 `battleInfoModal` 對 priv 房的說明文字（arena.js:165）剛好也自洽，讀不出「這功能其實是空的」。
- **重現**：1) 大廳/競技場找一張帶 🔒 的 Slots Battle 卡 → CTA 是「🔒 私密房」，點了只彈觀戰資訊框；卡片任何地方都沒有「取得連結／邀請」。  
  2) devtools 證明進場閘不認 priv：  
     var p=HL.state.get().arenaRooms.filter(r=>r.type==="vsslot"&&r.prefs&&r.prefs.priv&&(r.seats||[]).filter(Boolean).length<(r.players||2))[0];  
     HL.arenaUI.enterRoom(p);        // ← 導出的公開出口  
     // → 直接進到「配對中…」，接著就能接受並下注，私密限制完全沒作用  
  3) 證明分享連結不存在：  
     fetch("src/views/arena.js").then(r=>r.text()).then(s=>console.log((s.match(/分享連結/g)||[]).length));  // → 2（都是文案，沒有實作）
- **建議修法**：二選一，但要選乾淨的。(a) 真的做：`createBattle` 產生 `room.inviteCode`，我的房間狀態框（`myRoomStatusModal`）給一顆「複製邀請連結」（`?room=<id>&code=<code>`，落地由 router 認），`joinability` 對「持有正確 code」者放行；(b) 先不做：把 `prefRow` 的文案比照同一張表單的 Shared／Team／Sponsored 改標「（示意）」並說明「本版僅標記、不改變可加入性」，別再承諾一條不存在的連結。不論哪一種，**進場閘必須跟大廳同源**：把 `joinability` 搬進一個開站即載的模組（或讓 vsslot 讀 `HL.arenaUI.joinability`），`vsslot.render` 改成 `if (!joinability(room).seated && !joinability(room).canJoin) return noSeatPanel();`——一個判定、兩個方向，`noSeatFor` 這種只認「滿房」的半套判定就不會再有第二份。

> 掃過但判定沒問題／無法驗證：## 掃過但判定沒問題的地方

**09-07 那五項修法我逐條複驗，磁碟現況確實已修，且沒有回頭路**
- `mountView` 只收工廠函式並在 `typeof build !== "function"` 時 throw（app-shell.js:711），`main.js:85` 傳的是 `function () { return def.render(s); }` ⇒ 清理必然先於建構，你給的那個 P0（新 view 的 `later(phaseFound,1200)` 被自己的 runExit 清掉）在磁碟上已不成立。`refresh()` 走 `{rerender:true}` → `dropExit()`（717 行）＝丟掉不開火，`renderAuthView` 補了 `runExit("signed-out")`（main.js:126）。
- `later()` 的存活閘寫在**開火時**而非排程時（vsslot.js:60），這一點很關鍵且寫對了（render 期間 root 還沒掛上去）。
- `escrowTake` 冪等（`if (escrow > 0) return;`）、`room._escrow` 認領而非清零（vsslot.js:570）、`markEscrow` 兩邊同步（86 行）——我試著找「同一場扣兩次」與「重繪後錢消失」的入口，找不到（唯一還會讓 escrow 從帳上消失的是 F5，但 `arenaRooms` 根本不持久化 persistence.js:14 的切片只有 currency/wallet，這屬已知的 F5 家族）。
- `joinability/battleCta/cardAction` 確實是單一出口，`updateCard` 每秒連按鈕一起 `replaceChild`（arena.js:512-513），我核對過 CTA 選擇器 `.ax-btn-join, .ax-btn-watch` 覆蓋 `battleCta` 的全部四個分支、`.ax-rc-done span:last-child` 在有/無 prefs 圖示兩種 DOM 下都命中正確的節點。**競技場頁**的「滿房寫加入／空房寫觀戰」已經真的修好了（剩下的是大廳那個表面，見 finding 6）。
- `noSeatFor` 是純判定、`forfeit: true` 的敗局有寫進 `arenaStats`、`pendingSettle` 讓「勝負已定後離場」據實付回——這三條我都追到底了，邏輯正確。

**你點名要查的其餘幾項，結論是「沒問題」或「不是缺陷」**
- **`r.plays` / `r.done` 對 vsslot 房有定義**：`makeArenaRoom` 給 `plays:20, done:rint(0,8)`（mock-data.js:305）、`createBattle` 給 `plays:20, done:0`（arena.js:739）⇒ tick 的 `fin` 條件 `(r.done||0) >= r.plays` 不會撞 undefined。唯一的瑕疵是 `bumpRoom` 只加 `matches` 不加 `done`（已併入 finding 4）。
- **tick 的 activeId 豁免對「你正在配對中被 splice 掉」是夠的**：`if (r.id === activeId) continue;` 在 `endsInSec--` 與 `fin` 之前（arena.js:521），所以你在 vsslot view 內時房間既不老化也不會被移除。它**不**夠的地方只有 PiP（換頁後 activePoolId 歸零），但那條路徑上對戰已經先被離場鉤棄局了 ⇒ 我沒把它另立一條，併進 finding 2。
- **滿房進場**：`vsslot.render` 的 `noSeatFor` 閘（576 行）確實擋住「擠掉在座玩家」——`buildPlayers` 那個會把你寫回 `room.seats` 的動作在它後面。所以「進到滿房會擠掉誰」現在的答案是「進不去，看到 noSeatPanel」。
- **開房後的 filter 頁籤**：`isMineRoom = !!r.mine || iAmSeated(r)`（arena.js:89）確實讓自建對戰房進得了「我的房間」；`render()` 每次把 `filter` 重設為 `"all"` 是刻意的、不是 bug。真正的問題是 `mine` 旗標本身（finding 4）與「看一眼就算在座」（finding 1）。
- **排名語意**：`vsslot` 已經完全是 `HL.battleMode` 的消費者（`refreshStandings` 全部走 `rankBy/leaderIndex/metricOf/gapTo`，回放走 `barFrac`），`core/battle-mode.js` 在 `index.html` 排在 `views/arena.js` 之前。唯一漏網的表面是 `battleInfoModal`（finding 3）。
- **平手裁決**：`rankBy` 的 tie 群組輪轉＋`finishLocal` 從 `HL.fair.floatOr("vsslot")` 取 tieRoll（vsslot.js:507）是對的；`tieAtTop` 目前 0 個 UI 使用者（規格說「平手→公平抽籤」要顯示給玩家，那句承諾還沒兌現），但這屬既有待做清單、我沒另立。
- **「快速配對」沒有入口**：全 repo 無 `快速配對`／`quickMatch`／任何不指定房間的配對進入點。`phaseSearching` 的「配對中…等待玩家加入」只能經由「加入某一間具體的房」或「開房」到達，也就是說那 1200ms 的搜尋動畫是純演出。這是功能缺口不是缺陷，我列在這裡供你決定要不要開卡。
- `simVsslot` 寫進 `r.log` 的條目形狀是 `{winner, scores}`，而 `processModal` 的 vsslot 分支讀的是 `e.my/e.opp/e.win` ⇒ 兩者對不上，但那條路徑要 `r.mine && r.type==="vsslot"` 才到得了（永不成立，見 finding 4），所以是純死碼，我沒單獨立條。
- `bumpRoom` 在「你就是房主」的房裡把你贏記成 `challEdge`、輸記成 `hostEdge`（方向相反），但對戰卡不畫 heatBar、`myRoomStatusModal` 也到不了 ⇒ 目前不可見，同樣併入 finding 4 的收尾範圍。

## 我無法驗證的地方
- **沒有實跑瀏覽器**：這一輪全部是逐行推導 + 交叉比對（`HL.state.get()` 回傳活物件、`later` 存活閘、`runExit` 呼叫點、`pipHost` 掛在 body）。finding 1／2／5 我寫的 repro 都是可直接貼進 devtools 的可執行程式，但**我沒有親自執行過**——`later`/`setTimeout` 在背景分頁被夾到 ≥1s（CLAUDE.md §9 的坑），所以那幾段 repro 的 `setTimeout` 等待值我刻意放寬到 1.5–2s；若在前景分頁跑可以縮短。
- **Supabase 未部署，finding 7／8 是程式碼 + SQL 對讀的結論**：`p_site default 'demo'`（phase7:113）與 `playBattle` 不帶 `p_site`（api.js:65）兩件事我都逐字確認了，推論鏈是確定的；但「phase7 是否已部署」我查不到（CLAUDE.md 說啟用需手動部署），所以 finding 7 的 confidence 標 likely——若 phase7 未部署，落到 phase6 的 6 參數版本，那就是「完全沒有站別分離」的舊狀態，同樣要修。finding 8 的讀取端缺過濾是純前端事實，與部署無關，故標 certain。
- **CSS 側沒有系統性掃**：`.ax-mm / .ax-vs / .ax-room-card / .ax-seat` 我只在確認 `updateCard` 的選擇器命中時讀了對應的 class 用法，沒有去找「JS 與 CSS 各寫一份時長」的第四類缺陷（本輪角度是狀態機，時長家族上一輪已修 `pop` 那條）。若要補，建議查 `.ax-seat.empty` 有沒有可點語意、以及 `is-reveal`／`is-lead` 的 transition 時長是否與 `reveal_stagger`(400ms) 對齊。
- **`fgboard.js` 我只讀了被 vsslot 呼叫的介面**（`create/spin/getTotal`、`animSpeed/noPopup/popTone/onWin`），沒有進去驗它內部的節拍是否全部改讀 `battleTempo`；finding 9 的下游影響（真站 ultra 動畫）我是從 `animSpeed: sp` 這個傳遞點推出來的，`fgboard` 內部怎麼用這個值我沒逐行確認。

## ③ 錢與帳（Slots Battle escrow → 結算 / arena 房主帳 / 會員模式權威來源）

### 19. [blocker / certain] 會員模式的 playBattle 繞過 rpc() 包裝 ⇒ 沒帶 p_site，真站對戰結算在假站帳上，回傳的餘額再蓋掉真站餘額
- **位置**：`prototype/src/core/api.js:65`
- **為什麼是錯的**：§4 明文規定「所有結算 RPC 加 p_site（前端 api.js rpc() 自動注入 HL.site.mode()）」，而站別注入只寫在 rpc() 裡（api.js:81）。playBattle 卻直接呼 `HL.sb.rpc("play_battle", {p_wager,p_players,p_mode,p_rounds,p_roster,p_game})`——六個參數，沒有 p_site。伺服器端 `play_battle(..., p_site text default 'demo')`（docs/supabase-phase7.sql:112）於是**恆走 demo 站別**：`ensure_econ(uid,'demo')`、讀寫 `member_econ(uid,'demo')` 的餘額、`battle_history.mode='demo'`、`ops_log_srv(...,'demo')`。回傳的 `v_newbal` 是**假站**餘額，而客端在 vsslot.js:532 無條件 `HL.state.set({ balance: +R.balance })` 寫進**當前站別**的餘額。⇒ 真站按一次對戰，餘額就被替換成假站那條慷慨帳的數字（假站 demo 值刻意寬鬆，§11）；反向也成立：真站的贏分寫進假站帳。為什麼看起來正常：一切都「有結算、有動畫、有結算卡」，數字自洽（server 算得對，只是算在另一個宇宙的帳上），且 demo 模式（多數測試路徑）p_site 本來就是 'demo' ⇒ 差異完全不可見。同檔 8 支同類 RPC（slot_spin/bounty_flip/wallet_txn/chicken_*）全部走 rpc() 而正確帶站別，只有這一支自己開一條路＝典型「判準認的是某一種寫法而不是概念」。
- **重現**：開站主控台（不需部署後端，只驗參數面）：  
  HL.auth.backend=function(){return true;}; HL.auth.user=function(){return {id:'u'};};  
  HL.sb={ rpc:function(n,a){ console.log(n, JSON.stringify(a)); return Promise.resolve({data:null}); } };  
  HL.api.playSlotSpin(100);   // → slot_spin {"p_bet":100,"p_site":"demo"}   ← 有站別  
  HL.api.playBattle({wager:1000,players:3,mode:'normal',rounds:10});  
  // → play_battle {"p_wager":1000,"p_players":3,"p_mode":"normal","p_rounds":10,"p_roster":[],"p_game":"Slots Battle"}  ← 沒有 p_site  
    
  金額走一遍（真站、餘額 9,000；假站帳上 500,000；wager 1000、3 人房、你贏）：  
  escrowTake 本機 9,000→8,000 → server 讀 member_econ(uid,'demo')=500,000 → net=+2,000 → v_newbal=502,000 → 客端 balance=502,000 ⇒ 真站憑空多 494,000。
- **建議修法**：playBattle 改走同檔的 `rpc("play_battle", {...})`（它已負責 p_site 注入 + error/降級語意），刪掉自寫的 HL.sb.rpc 分支；playBattle 目前多出來的「res.data.error → null」處理與 rpc() 內部完全同形，可直接刪。並立一條鎖：`core/api.js` 內**任何** `HL.sb.rpc(` 只准出現在 `rpc()` 函式體內（反向錨 count===1），否則新增 RPC 又會複製這條旁路。

### 20. [high / certain] 會員模式高潮期間離場：pendingSettle 被設成 0，你贏的錢與那一場戰績一起消失
- **位置**：`prototype/src/views/vsslot.js:529`
- **為什麼是錯的**：demo 路徑的 climaxThen 收到的是真實應付額（`climaxThen(R.winnerIdx, payout, …)`，:515），所以「勝負已定後離場＝據實付回」成立。會員路徑傳的是常數 0（`climaxThen(R.winnerIdx, 0, …)`），因為真正的入帳是 `done` 裡的 `HL.state.set({ balance: +R.balance, arenaStats: …history… })`（:532）。於是 forfeitEscrow 的「勝負已定」分支（:102）走 `escrowSettle(0)` ⇒ **付回 0、回傳 false**：leaveBattle 不 toast、onExit 不 toast，而 `done` 那一拍已被同一個鉤子的 clearTimers 取消 ⇒ 本機餘額停在「已扣一份賭注」、arenaStats 連這一場都沒有、玩家沒有任何提示。為什麼看起來正常：`games/vsslot/forfeit-is-honest` 鎖逐條驗了 `pendingSettle = payout`、`escrowSettle(pendingSettle)`、順序全對——它讀的是 climaxThen 的函式體，看不到呼叫端傳進來的是 0；demo 路徑（測試與日常都走這條）行為完全正確。同時 :512/:527 的 liveStats.record 早就記了 bet=1000/win=3000 ⇒ 流水、VIP、任務、返水、帳本說你贏了，餘額說你輸了。
- **重現**：主控台假造會員模式（不需真後端）：  
  HL.auth.backend=function(){return true;}; HL.auth.user=function(){return {id:'u'};};  
  HL.api.playBattle=function(){ return Promise.resolve({  
    seats:[0,1,2].map(function(i){return {idx:i,total:i===0?9000:1000,rounds:Array.from({length:10},function(_,k){return (i===0?900:100)*(k+1);})};}),  
    winnerIdx:0, win:true, net:2000, balance:12000,  
    stats:{matches:1,wins:1,losses:0,profit:2000,streak:1,best:1,bigWin:2000,hostNet:0} }); };  
  HL.state.set({balance:10000});  
  var r=HL.state.get().arenaRooms.filter(function(x){return x.type==='vsslot'&&(x.seats||[]).filter(Boolean).length<(x.players||2);})[0];  
  r.wager=1000; r.players=3; r.prefs={ultra:true};  
  HL.router.go('vsslot', r.id);  
  // 按「接受對戰」→ 等倒數歸零（餘額 10000→9000）→ 十輪跑完  
  // 當 document.querySelector('.ax-duel').dataset.beat 進入 suspense / climax-lose / climax-win 時，  
  // 立刻按底部導覽任一項離開，然後看：  
  HL.state.get().balance          // 9000（應為 12000，少 3000）  
  HL.state.get().arenaStats        // matches 仍為 0，這一場不存在  
  // 對照：把 HL.auth.backend 改回 false 走 demo 路徑做同一件事 → 餘額正確變成 12000
- **建議修法**：會員路徑也必須把「應付金額」交給 climaxThen，讓 pendingSettle 是真值而不是 0：把 `+R.balance` 的權威寫入包成一個 settle 函式交給 climaxThen（例如 `climaxThen(R.winnerIdx, { srvBalance: +R.balance, stats: R.stats, rec: rec }, done)`，escrowSettle 若收到物件就寫伺服器權威值），或最低成本改法＝在呼叫 climaxThen **之前**就把 R.balance/R.stats/history 寫進 state（伺服器值本來就已成定局，動畫只是演出），climaxThen 只負責演出與 escrow 標記清理。任一改法都要新增鎖：「pendingSettle 不得是字面常數 0」＋「會員路徑在高潮任一拍離場後，state.balance 必須等於 R.balance」（可用 node 餵假 R 跑純函式）。

### 21. [high / certain] later() 的存活閘讀的是模組級 root（會被 render 換掉）＝空閘；承諾倒數期間同頁重繪就會在沒接受、沒過 rg 閘的情況下扣掉一份賭注
- **位置**：`prototype/src/views/vsslot.js:60`
- **為什麼是錯的**：閘寫成 `if (root && root.ownerDocument && !root.ownerDocument.body.contains(root)) return;`，而 `root` 是模組級變數，`render()`（:568/:582）每次都把它指向**新節點**。同頁重繪（mountView 的 rerender 分支只 dropExit、刻意不清計時器）之後：舊 root 被 HL.dom.clear 拔掉，但模組 `root` 已經是新 root、而新 root 就掛在 document 上 ⇒ **閘恆為 false-negative，上一次 render 排的每一個計時器全部照常開火**；同時 `render()` 只做 `timers = []`（:567）把舊 timer id 丟掉、不 clearTimeout ⇒ 沒有任何機制收得回來。註記自己寫的「注意閘要在開火時判」正是這個 bug：開火時判的是**已經被換掉的**那個變數。危害具體化：重繪若落在 commitCountdown 內，新 render 認領到的 escrow 是 0（還沒扣款），而舊 `step(0)` 照樣開火 `escrowTake(room.wager)`（:245）⇒ 玩家沒有按任何「接受」、沒有經過 `HL.rg.check`（:215）也沒有經過餘額檢查（:216），就被扣掉一份賭注；接著舊 `later(phaseGame,…)` 又在新 root 上蓋一場對戰，與新 render 的 phaseFound 互踩。這也直接回答本輪的 (g)：責任博弈閘只在 accept() 評估，而「唯一的硬性 commit」escrowTake 自己不評估任何閘 ⇒ 只要有第二條路徑走到 escrowTake，閘就被完全繞過。為什麼看起來正常：`games/arena/exit-hook-settles-escrow` 的最後一條斷言是 `/body\.contains\(root\)/.test(body(vs,"later"))`——只認「有沒有這串字」，對閘讀的是哪個 root 一無所知（vacuous lock，型態 #7）。觸發同頁重繪的路徑不只切語系：game-frame.js:69（⚙ 遊戲設定 → 金額顯示幣別）就在對戰外框自己的工具列上，lazy-views.js:91/152 與 lazy-games.js:143/181 也會在模組載入完成時呼 HL.app.refresh()。
- **重現**：開站 ?demo=1，主控台：  
  var seen=[]; var os=HL.state.set.bind(HL.state);  
  HL.state.set=function(p){ if(p&&p.balance!=null) seen.push(p.balance); return os(p); };  
  HL.state.set({balance:10000});  
  var r=HL.state.get().arenaRooms.filter(function(x){return x.type==='vsslot'&&(x.seats||[]).filter(Boolean).length<(x.players||2);})[0];  
  r.wager=1000; r.prefs={};   // 不開快速，讓 3 秒倒數看得清楚  
  HL.router.go('vsslot', r.id);  
  // 手動按「接受對戰」→ 畫面出現「3　全員就緒…」的那一刻立刻執行：  
  HL.app.refresh();  
  // 觀察：畫面回到「配對中…等待玩家加入」（新 render 的 phaseSearching），但 2 秒內：  
  seen                                   // 出現 9000 ⇒ 舊 step(0) 開火了 escrowTake  
  HL.state.get().arenaRooms.filter(function(x){return x.id===r.id;})[0]._escrow   // 1000  
  // ＝沒有按任何接受鈕、沒過 HL.rg.check、沒過餘額檢查，錢已經扣了。  
  // 反向確認閘是空的：重繪後把 later 排的舊回呼加旗標即可看到它們全部執行。
- **建議修法**：閘要判「排程當下捕捉的那個節點」，不是模組變數：`function later(fn, ms){ var owner = root; var t = setTimeout(function(){ if (owner && owner.ownerDocument && !owner.ownerDocument.body.contains(owner)) return; if (owner !== root) return; fn(); }, ms); timers.push(t); return t; }`（第二條同時擋掉「舊 root 恰好還在文件裡」的 PiP 情形）。並且 `render()` 不能只 `timers = []`——要先 `clearTimers()` 再重建（同頁重繪不該結帳，但**一定**該停上一批計時器；停計時器與結帳是兩件事）。鎖要改成能被負向擾動打中的形狀：把 `later` 抽成可在 node 求值的純函式（吃 `{ current: () => root }`），驗「排程後把 current 換成另一個已掛載節點 ⇒ 回呼必須不執行」；再加一條「escrowTake 的呼叫點只准有一處，且該處必須在同一函式體內先過 HL.rg.check 與餘額檢查」。

### 22. [high / certain] 開子母畫面後用底部導覽換頁：onExit 沒收賭注並凍結對戰，而 PiP 還在畫面上顯示這場對戰（closePip 的設計前提是「PiP 續播」）
- **位置**：`prototype/src/views/vsslot.js:579`
- **為什麼是錯的**：game-frame.js:182 的註記把「開 PiP → 用底部導覽回大廳（**PiP 續播＝設計**）→ 按 PiP 的 ×」寫成既定行為，closePip 整套修法都建立在這個前提上。但 2026-08-21/09-07 補的離場鉤是無條件的：openPip 只是把 `stage` 搬進 `pipHost`（掛在 document.body 上，#app 之外），底部導覽換頁仍然走 mountView ⇒ runExit 開火 vsslot 的 onExit ⇒ `clearTimers()` 把整條回合鏈殺掉、`forfeitEscrow()` 沒收賭注並記一筆生涯敗局。結果：PiP 裡的對戰**凍在某一輪**（分數、名次、盤面全部停住，看起來像壞掉而不是像結束），賭注沒了、多一筆敗局，且緊接著按 PiP 的 × 又會跳出第二個語意矛盾的 toast「已關閉子母畫面（未完成的回合視為棄局）」——那時候其實已經沒有在途賭注了。更糟的是回頭路：pip.active 仍為 true 且 pip.key 相符，所以從房卡「回到對戰 ›」再進來會被 `resumeFrame` 早退（:566）直接吐回**同一張凍結的畫面**，每次都一樣，直到玩家想到要去按 PiP 的 ×。為什麼看起來正常：兩個修法各自的鎖都綠——`exit-hook-settles-escrow` 只驗「換頁要開火鉤子」，`escrow-equivalence` 只驗「要有 onTeardown 並在其中棄局」，沒有任何一條問「這兩個機制在 PiP 續播下會不會互相拆台」。
- **重現**：開站 ?demo=1，餘額設 10000，進一場 wager=1000 的 3 人房：  
  HL.state.set({balance:10000});  
  var r=HL.state.get().arenaRooms.filter(function(x){return x.type==='vsslot'&&(x.seats||[]).filter(Boolean).length<(x.players||2);})[0];  
  r.wager=1000; r.players=3; r.prefs={};  
  HL.router.go('vsslot', r.id);  
  // 按「接受對戰」→ 倒數歸零（餘額 10000→9000）→ 打到第 2、3 輪  
  // 點外框工具列的「⧉ 子母畫面」  
  // 點底部導覽任一項（例如娛樂城）  
  // 觀察：  
  //   1) toast「已離開對戰，賭注 NT$1,000 不退還」  
  //   2) PiP 仍在右下角顯示這場對戰，但永久凍結（data-beat 不再變）：  
  //      document.querySelector('.ax-pip .ax-duel').dataset.beat  // 停在離場那一拍  
  //   3) HL.state.get().balance === 9000；HL.state.get().arenaStats.losses 多 1（forfeit:true）  
  //   4) 回競技場點該房的「回到對戰 ›」→ 還是同一張凍結畫面（resumeFrame 早退）  
  //   5) 按 PiP 的 × → 又一個 toast「未完成的回合視為棄局」（此時已無在途賭注）
- **建議修法**：離場鉤必須知道「這個 view 的畫面是不是還活在 PiP 裡」——PiP 續播不是離場。vsslot 註冊的鉤子改成：`if (HL.gameFrame && HL.gameFrame.isPipActive("vsslot:" + roomId)) return;`（isPipActive 已經是 game-frame.js:209 的出口、目前沒有任何消費者），把「真正了結」交給既有的 onTeardown（closePip 已會呼叫它）。同一句要一併套到 instant-duel.js:114（它的 onExit 會 clearTimers + settlePending，導致 PiP 裡的 Dice Duel 永久卡在「擲骰中… ?」且 battleBtn 永久 disabled，而它連 onTeardown 都沒登記，closePip 的「視為棄局」toast 對它是空話）。並立鎖：「凡是同時向 gameFrame 登記 key 與向 shell 登記 onExit 的 view，其 onExit 必須先問 isPipActive(該 key)」＋「凡登記 onExit 的遊戲 view 必須同時登記 onTeardown」。

### 23. [medium / certain] resumeFrame 早退路徑跳過整段 render 的登記：不註冊離場鉤、不清舊計時器、不認領 room._escrow
- **位置**：`prototype/src/views/vsslot.js:566`
- **為什麼是錯的**：`render()` 第一行就是 `if (resumed) return resumed;`，於是它下面**全部**的帳務登記都不會執行：`room = findRoom(roomId)`（:567，room 仍指向上一次的房）、`timers = []`、`escrow = room._escrow || 0` 的認領（:570）、`HL.shell.onExit(...)` 的離場鉤（:579）、gameFrame 的 `onTeardown`（:592，因為 resumeFrame 走的是 buildFrame(stage, meta)，meta 是**舊的**那份，這點僥倖仍在）。可達且會發生的組合：對戰進行中（escrow 在途）→ 開 PiP → 在 PiP 開著的狀態下觸發同頁重繪（⚙ 遊戲設定改「金額顯示幣別」走 game-frame.js:69 的 HL.app.refresh，或切語系、或某個延遲載入模組剛好載完）⇒ mountView 走 rerender 分支 dropExit（鉤子被丟棄、不開火）→ 新 render 早退 ⇒ **這一場從此完全沒有任何離場鉤**：之後用底部導覽換頁，runExit 的清單是空的，賭注既不結算也不棄局，`room._escrow` 就懸在房間物件上（下次進同一間房會被重新認領，但玩家已經看不到任何對應的畫面或提示）。為什麼看起來正常：PiP 裡的對戰仍在跑（later 的閘因為前一條 finding 也擋不住），會自己跑完、自己 escrowSettle、自己貼結算卡，帳面數字最後多半是對的 ⇒ 只有在「跑完之前又發生第二次離場事件」時才露出。
- **重現**：開站 ?demo=1：  
  HL.state.set({balance:10000});  
  var r=HL.state.get().arenaRooms.filter(function(x){return x.type==='vsslot'&&(x.seats||[]).filter(Boolean).length<(x.players||2);})[0];  
  r.wager=1000; r.prefs={};  
  HL.router.go('vsslot', r.id);  
  // 接受 → 倒數歸零（餘額 9000，r._escrow===1000）→ 打到第 2 輪  
  // 點「⧉ 子母畫面」  
  HL.app.refresh();                      // 同頁重繪（等同在 ⚙ 遊戲設定改金額顯示幣別）  
  HL.shell.runExit('probe')              // → 0  ⇒ 這一場已經沒有任何離場鉤  
  // 對照組（不開 PiP 直接 refresh）：  
  // HL.app.refresh(); HL.shell.runExit('probe')  → 1
- **建議修法**：把「認領 escrow ＋ 註冊 onExit」提到 resumeFrame 早退**之前**（它們與畫面從哪裡來無關），例如：先 `room = findRoom(roomId); if (!room) …; normalize(); escrow = room._escrow || 0; registerExitHooks(roomId);` 再判 `resumeFrame`。同時 render 的早退不得跳過 `clearTimers()`。鎖：`views/vsslot.js` 的 render 函式體內，`HL.shell.onExit(` 的位置必須早於 `resumeFrame(`；並補一條可在 node 求值的形狀鎖「render 的任何 early-return 之前必須已註冊離場鉤」。

### 24. [high / certain] 賞金局翻牌：扣款在開局、入帳與 liveStats 都在 finishFlip，中途離場整注消失於帳外（餘額少一份費用、已開出的彩金不入帳、流水/VIP/帳本完全沒有這一注）
- **位置**：`prototype/src/views/bounty.js:143`
- **為什麼是錯的**：`startFlipClient` 開局當下就 `HL.state.set({ balance: balance - room.cost })`（:143）並 `room.prizePool += room.cost`（:144），但玩家的贏分（`fWin`）、`playsLeft--`、`hostEdge/challEdge`、以及**唯一一次** `HL.liveStats.record("賞金局 · 翻牌", room.cost, fWin)` 全部只寫在 `finishFlip()`（:171-173），而 finishFlip 只有在翻滿 `room.flips` 張、再等 650ms 之後才跑（:166）。這條路的離場鉤只做 `epoch++`（:301）——它的作用是**作廢**殘留回呼，不是據實了結。⇒ 玩家翻了 2 張、已經開出 NT$3,000，用底部導覽換頁：費用沒了、3,000 沒入帳、沒有 toast、沒有棄局紀錄，而且因為 liveStats 從未被呼叫，這一注在 `HL.ledger`（GGR/NGR/RTP）、VIP 流水、任務、返水、累積彩金提撥、錦標賽積分、注單中心、責任博弈的今日累計裡**完全不存在**——玩家餘額少了 1,000，帳本上卻沒有這 1,000 的 bet。同房的 `prizePool` 則永久多一份費用而 `playsLeft/done/challenges` 沒動。為什麼看起來正常：同檔的踩地雷是原子的（:203 一次 `- bet + win`），vsslot 有 escrow/pendingSettle、instant-duel 有 settlePending、instant-picks 有離場補結——只有翻牌這條保留了「先扣、成功走完才記帳」的舊形狀，而 epoch 閘讓殘留回呼安靜地消失，看起來像乾淨的離場。
- **重現**：開站 ?demo=1，主控台：  
  HL.state.set({balance:10000});  
  var b=HL.state.get().arenaRooms.filter(function(x){return x.type==='bounty'&&x.game==='flip'&&!x.mine;})[0];  
  b.cost=1000; b.flips=5;  
  var led0=HL.ledger?JSON.stringify(HL.ledger.derived()):null;  
  HL.router.go('bounty', b.id);  
  // 按「開始挑戰」→ 餘額 10000→9000 → 只點 2 張卡（畫面上「已翻 2 / 5」，本次贏分顯示 >0）  
  // 然後按底部導覽任一項離開，回來看：  
  HL.state.get().balance                 // 9000（已開出的彩金一分都沒入帳，也沒有任何提示）  
  HL.state.get().arenaRooms.filter(function(x){return x.id===b.id;})[0].playsLeft   // 沒減  
  HL.state.get().arenaRooms.filter(function(x){return x.id===b.id;})[0].prizePool   // 永久多 1000  
  JSON.stringify(HL.ledger.derived()) === led0   // true ⇒ 帳本看不到這 1,000 的 bet  
  // 對照：翻滿 5 張走完 → 餘額正確、ledger 的 bet/win 都有、playsLeft 減 1
- **建議修法**：比照 vsslot 的 pendingSettle／instant-duel 的 settlePending，把「已扣款但還沒了結」做成顯式的在途狀態並給它一個據實出口：開局時記 `pending = { cost: room.cost }`，每翻一張更新 `pending.win = fWin`；把 finishFlip 的帳務段（餘額 += fWin、prizePool、playsLeft--、log、`liveStats.record(cost, fWin)`、hostEdge/challEdge）抽成 `settleFlip()` 並做成冪等；onExit 改為 `epoch++; settleFlip();`（提前離場＝以當下已開出的彩金據實結算，或明確定義為棄局但**仍要** `liveStats.record(cost, 0)` 讓那一注進帳本）。鎖的形狀要守概念而不是位置：「bounty 翻牌的扣款點與 liveStats.record 必須成對——凡有 `balance - room.cost` 的路徑，離場鉤必須能到達一次 `liveStats.record("賞金局 · 翻牌", …)`」，並用負向擾動（把 onExit 改回只 epoch++）確認會紅。

### 25. [medium / certain] 會員模式的棄局敗局只寫本機 arenaStats，會被下一場伺服器 R.stats 與 F5 的 load_econ 整批覆蓋 ⇒ forfeit-is-honest 對會員模式是空鎖
- **位置**：`prototype/src/views/vsslot.js:532`
- **為什麼是錯的**：`forfeitEscrow` 記敗局走的是 `HL.arenaStats.record` → `statRecord`（arena.js:242-252），它從**本機** `HL.state.arenaStats` 讀出來 +1 再寫回。但會員模式下 arenaStats 的權威在伺服器：finish() 的 `HL.state.set({ ..., arenaStats: Object.assign({history:…}, R.stats) })`（vsslot.js:532）用 `play_battle` 回傳的 `v_stats` **整批覆蓋**，而 F5 後的 hydrate 也是 `Object.assign(defStats, p.arena_stats)`（main.js:144，來源 member_econ.arena_stats）。play_battle 完全不知道有棄局這件事（它在開打前就把整場結算掉了，SQL 裡沒有任何 forfeit 概念）⇒ 會員模式棄一場：本機 matches/losses/streak/profit 動了，下一場對戰或一次重整就把它抹掉，戰績重新變乾淨。`statRecord` 尾端的 `HL.api.recordBattle(rec)` 只寫進 `battle_history`（那張表不是 arenaStats 的來源），所以也補不回來。為什麼看起來正常：`games/vsslot/forfeit-is-honest` 逐字驗了 forfeitEscrow 的寫法（敘述句本體、條件逐字、win:false、net:-lost、forfeit:true）——全部成立，而它守的性質在會員模式下被下游的整批覆蓋吃掉；demo 模式（測試與日常）沒有覆蓋者，行為完全正確。
- **重現**：主控台假造會員模式：  
  HL.auth.backend=function(){return true;}; HL.auth.user=function(){return {id:'u'};};  
  HL.api.recordBattle=function(){return Promise.resolve();};  
  HL.api.playBattle=function(){ return Promise.resolve({  
    seats:[0,1].map(function(i){return {idx:i,total:i===0?500:9000,rounds:Array.from({length:10},function(_,k){return (i===0?50:900)*(k+1);})};}),  
    winnerIdx:1, win:false, net:-1000, balance:HL.state.get().balance,  
    stats:{matches:1,wins:0,losses:1,profit:-1000,streak:-1,best:0,bigWin:0,hostNet:0} }); };  
  HL.state.set({balance:10000, arenaStats:{matches:0,wins:0,losses:0,profit:0,streak:0,best:0,bigWin:0,hostNet:0,history:[]}});  
  var r=HL.state.get().arenaRooms.filter(function(x){return x.type==='vsslot'&&(x.seats||[]).filter(Boolean).length<(x.players||2);})[0];  
  r.wager=1000; r.players=2; r.prefs={ultra:true};  
  // ① 打一場、第 3 輪用底部導覽棄局：  
  HL.router.go('vsslot', r.id);  // 接受 → 倒數歸零 → 第 3 輪離場  
  HL.state.get().arenaStats.losses   // 1  ← 有記  
  // ② 再打第二場、正常打完：  
  HL.router.go('vsslot', r.id);  // 接受 → 打完  
  HL.state.get().arenaStats.losses   // 1  ← 棄局那一筆被 R.stats 的 losses:1 蓋掉，兩場只剩一敗  
  HL.state.get().arenaStats.matches  // 1  ← 同上
- **建議修法**：會員模式的棄局要有伺服器對應：短期做法＝arenaStats 改成「伺服器基準 + 本機 forfeit 增量」兩層（`{srv: R.stats, localForfeits: {matches,losses,profit,streak}}`，summary() 相加），這樣覆蓋 srv 不會吃掉增量；正確做法＝phase7 加一支 `record_forfeit(p_wager, p_site)` RPC（更新 member_econ.arena_stats 並插一列 battle_history），forfeitEscrow 在會員模式呼它。鎖要打自己：「棄局後**再跑一場伺服器結算**，arenaStats.losses 必須是 2」——現行鎖只驗 forfeitEscrow 的寫法，加這一條負向擾動才抓得到覆蓋。

### 26. [medium / certain] recordBattle 把「遊戲模式」寫進 battle_history.mode，而 phase7 已把該欄改成「站別」；loadHistory 也完全沒有站別過濾
- **位置**：`prototype/src/core/api.js:56`
- **為什麼是錯的**：phase7 為了真/假站分離，把 `battle_history` 加了站別欄：`alter table public.battle_history add column if not exists mode text not null default 'demo'`（docs/supabase-phase7.sql:50），伺服器端 play_battle 也照此寫入 `mode = v_site`（同檔 :163）。但客端 `recordBattle` 插的是 `mode: rec.mode`——`rec.mode` 是**遊戲模式**（'normal' / 'crazy' / 'terminal'，vsslot.js makeRec 與 forfeitEscrow 都這樣填）。⇒ 凡是走客端插入的列（會員模式的棄局、以及 play_battle RPC 失敗降級成 finishLocal 的那些場），`battle_history.mode` 會是 'crazy' 這種值，站別維度被汙染成第三種語意；再加上 `loadHistory` 的 `select("payload").eq("user_id", …)`（:46-48）**沒有任何 mode 過濾**，真站的戰績與回放清單會混進假站的場次（§4 明文說 battle_history 加 mode 是為了「戰績真分離」）。為什麼看起來正常：兩個 mode 都是 text、插入不會報錯；demo 模式下 `on()` 為 false，recordBattle 與 loadHistory 都是 no-op ⇒ 日常路徑完全看不到；而目前 phase7 尚未部署，所以連線上也沒人踩過。註：spec §5 #1 也指到 api.js:46-48，但那條講的是 payload 缺欄位造成的「−NT$ NaN」，與本條（欄位語意衝突 + 沒有站別過濾）是不同的缺陷，修 normalize 不會修到這裡。
- **重現**：主控台（不需後端，驗參數面）：  
  HL.auth.backend=function(){return true;}; HL.auth.user=function(){return {id:'u'};};  
  HL.sb={ from:function(t){ return {  
    insert:function(row){ console.log('INSERT', t, JSON.stringify(row)); return Promise.resolve({}); },  
    select:function(c){ var q={ eq:function(){return q;}, order:function(){return q;}, limit:function(){return Promise.resolve({data:[]});} }; console.log('SELECT', t, c); return q; } }; } };  
  HL.api.recordBattle({vs:'1v1',mode:'crazy',wager:1000,net:-1000,win:false,forfeit:true});  
  // → INSERT battle_history {"user_id":"u","vs":"1v1","mode":"crazy",...}  
  //   而 supabase-phase7.sql:50/163 定義 battle_history.mode ∈ {'demo','live'}  
  HL.api.loadHistory(30);  
  // → SELECT battle_history payload   ← 只 eq(user_id)，沒有 .eq('mode', HL.site.mode())  
  // 對照：docs/supabase-phase7.sql 裡 feeds 都依站別過濾，只有這條讀取路徑沒有
- **建議修法**：① `recordBattle` 的 insert 改成 `mode: (HL.site && HL.site.mode) ? HL.site.mode() : 'demo'`，遊戲模式改放別的欄（`payload.mode` 本來就已經有一份，或另加 `game_mode`）；② `loadHistory` 補 `.eq("mode", HL.site.mode())`；③ 順手把 `select("payload")` 改成 `select("vs,wager,net,win,ts,payload")`——表上現成的那四個欄位正是 spec §5 #1 的 NaN 來源。鎖：node 讀 `docs/supabase-phase7.sql` 抓出被宣告為站別的欄位名，再對 `core/api.js` 的每一個 insert/select 斷言「凡寫入該欄位者必須寫 HL.site.mode()、凡讀取該表者必須帶站別過濾」——這條同時涵蓋未來新增的事件表。

### 27. [medium / certain / 已知] 自建 Slots Battle 房永遠 mine:false ⇒ 房主側整條帳（endMyRoom 入帳／hostNet／進行中淨利／結算卡）不可達，roomNet 的非賞金分支沒有任何生產者
- **位置**：`prototype/src/views/arena.js:528`
- **為什麼是錯的**：`createBattle` 寫死 `mine: false`（:735），而全 repo 只有 `createBounty`（:637）會設 `mine: true`、`makeArenaRoom` 也不設 ⇒ tick 的 `if (r.mine) ended.push(r)`（:528）對 vsslot 房**恆不成立**，`endMyRoom` 的非賞金分支 `balance += (r.net || 0)`（:487）與 `hostNet` 累計（:490）都到不了；`joinability().mine` 也是 `!!r.mine`（:101），所以 `cardAction` 的 `myRoomStatusModal` 分支、`settlement(kind='vsslot')` 那張結算卡也全是死碼。更根本的是 `r.net`：全 repo 沒有任何 `r.net =` / `.net +=` 寫入者（`simVsslot` 只動 hostEdge/challEdge、`bumpRoom` 只動 challEdge/hostEdge/matches/challenges），所以 `roomNet(r)` 的非賞金分支恆為 0——「房間淨利單一出口」在 vsslot 這半邊是一個永遠回 0 的常數。可見後果：自己開的 Slots Battle 房被 bot 挑戰 20 場後到期，房間**直接從清單消失，沒有任何結算回報**（賞金房會彈結算卡），`HL.arenaStats.summary().hostNet` 永遠 0。為什麼看起來正常：`games/arena/battle-single-charge` 的註記把這件事當成**已知事實**寫進去（「房寫死 mine:false ⇒ endMyRoom 不可達、r.net 全 repo 從未被寫入」），但它守的是「建房不得扣款」，沒有任何鎖問「那條房主帳到底有沒有人走」；`games/arena/room-net-single-truth` 的四條斷言全在驗賞金那半（prizePool−deposit−openFee、myRoomStatusModal、endMyRoom 讀 roomNet、反向錨 count===1），vsslot 那半一條都沒驗 ⇒ 型態 #8「容器沒有人用」＋ #7「半邊空鎖」。
- **重現**：開站 ?demo=1，主控台：  
  var n0=HL.state.get().arenaRooms.length;  
  // 用 UI 開一場 Slots Battle（＋開房發起挑戰 → Slots Battle → 選 1 款遊戲 → 建立），  
  // 進去之後按「‹ 取消」回競技場，然後：  
  var mineRoom=HL.state.get().arenaRooms.filter(function(x){return x.type==='vsslot'&&x.host&&x.host.name==='你';})[0];  
  mineRoom.mine            // false  ⇒ arena.js:528 的 if (r.mine) 永不成立  
  mineRoom.net             // 0，且全 repo 無寫入者：  
  // （終端）grep -rn "\.net\s*=\|\.net\s*+=" prototype/src/views/arena.js prototype/src/views/vsslot.js prototype/src/data/mock-data.js  → 只有 createBattle 的初始化 net: 0  
  var before=HL.arenaStats.summary().hostNet;   // 0  
  mineRoom.endsInSec = 1;  // 讓它到期  
  // 等 2–3 秒（arenaSim 每秒 tick）：  
  HL.state.get().arenaRooms.filter(function(x){return x.id===mineRoom.id;}).length   // 0（房間消失）  
  HL.arenaStats.summary().hostNet                                                    // 仍是 before ⇒ 沒有任何結算  
  // 對照：開一間賞金房並讓它到期 → 會彈「我的房間結算」卡
- **建議修法**：兩條路選一條，但要選明白並讓鎖釘住：(a) 承認自建對戰房是房主身分 ⇒ createBattle 設 `mine: true`（`joinability.canJoin` 已排除 `r.mine`，CTA 會給「我的對戰」），並讓 `simVsslot` 真的把房主淨收寫進 `r.net`（`best===0 ? r.net += r.wager : r.net -= r.wager`，與它已在算的 hostEdge/challEdge 同一筆），endMyRoom 才有東西可結；(b) 明確判定 vsslot 沒有房主帳 ⇒ 刪掉 endMyRoom 的 vsslot 分支、hostNet 欄位、myRoomStatusModal/settlement 的 vsslot 分支與 roomNet 的非賞金分支，`roomNet` 只服務賞金房並改名，避免留一個永遠回 0 的假出口。無論哪條，`room-net-single-truth` 都要補一條打自己的斷言：「roomNet 的每一個分支都必須存在至少一個真實生產者（該分支讀的欄位在 repo 內有寫入點）」——這正是型態 #8 的通用鎖形狀。

### 28. [medium / certain] 「扣款/入帳各一個出口」的反向錨只認一種字面寫法，會員模式的第三個餘額寫入者不被計入（實際是 1 扣 2 入）
- **位置**：`prototype/tests/checks-games.js:3377`
- **為什麼是錯的**：鎖 `games/vsslot/forfeit-is-honest` 的收尾用 `vs.match(/balance: HL\.state\.get\(\)\.balance - /g).length === 1` 與 `+ ` === 1 來證明「動餘額往下/往上各只准一個出口」。但 vsslot 有**第三個**餘額寫入者：finish() 會員路徑的 `HL.state.set({ balance: +R.balance, arenaStats: … })`（vsslot.js:532）。它不符那兩個字面，所以鎖看不見它，而它正是與 escrow 打架的那一個——escrowTake 已在本機扣過 wager，這裡再用伺服器權威值整批取代，兩者只是「恰好對得上」（因為 R.balance 是 server 在 wager 扣款前的餘額加上 net），一旦 p_site 錯（見 finding 1）或 done 沒跑到（見 finding 2），差額就是整場的錢。同樣的盲區也讓任何未來以 `HL.state.set({balance: x})`、`HL.instant.setBal()`、`setBalance()` 形式新增的出口自動免檢。為什麼看起來正常：鎖是綠的、且它報的實測數字（1 / 1）看起來像是嚴格證明；negative perturbation 若照現行寫法加一個 `balance: HL.state.get().balance - 1` 也確實會紅——所以連負向擾動都會給出「鎖有效」的錯誤結論，除非擾動故意換一種寫法。
- **重現**：（終端）在 repo 根執行：  
  node -e "var s=require('fs').readFileSync('prototype/src/views/vsslot.js','utf8');console.log('字面 -:',(s.match(/balance: HL\\.state\\.get\\(\\)\\.balance - /g)||[]).length);console.log('字面 +:',(s.match(/balance: HL\\.state\\.get\\(\\)\\.balance \\+ /g)||[]).length);console.log('所有 balance 寫入:',(s.match(/balance:/g)||[]).length);"  
  // 輸出：字面 - : 1 ／ 字面 + : 1 ／ 所有 balance 寫入: 3  
  // 第三處＝vsslot.js:532 的 `balance: +R.balance`，鎖完全看不到。  
  // 負向擾動證明它認的是寫法不是概念：把 escrowSettle 的入帳改寫成  
  //   var b = HL.state.get().balance; HL.state.set({ balance: b + payout });  
  // 語意完全不變、遊戲照常運作，但 `pays` 變成 0 ⇒ 鎖紅；  
  // 反之新增 `HL.state.set({ balance: 999999 })` 這種真正的第二個入帳出口，鎖仍全綠。
- **建議修法**：把斷言從「字面比對」改成「概念比對」：抓出 vsslot.js 內所有會改寫餘額的節點——正則放寬成 `/balance\s*:/` 與 `/setBal\(|HL\.instant\.setBal|state\.set\([^)]*balance/`——再要求每一處都落在白名單函式體內（`escrowTake` / `escrowSettle`），會員權威寫入必須經由 escrowSettle 的同一出口（配合 finding 2 的修法：讓 escrowSettle 能接受「伺服器權威餘額」而不是自己另開一條 state.set）。更通用的做法是把餘額改成只能經 `HL.state.setBalance(reason, next)` 一個 API，鎖只需斷言「views/ 內零處直接寫 balance:」，這樣寫法怎麼變都守得住。

> 掃過但判定沒問題／無法驗證：【逐項回答本輪的檢查清單】\n\n(a) 出口數量：**扣款出口恰好一個**——`vsslot.js:87 escrowTake`（唯一呼叫點在 `commitCountdown` 倒數歸零處 :245，且冪等；`arena.js createBattle` 已確認不扣款，`cost()` 回 `p.wager` 單份）。**入帳出口在 demo 恰好一個**（`escrowSettle` :93），但**會員模式有第二個**（`finish()` 的 `balance: +R.balance` :532）⇒ 已報成 finding「反向錨只認一種寫法」。\n\n(b) 棄局：demo 路徑正確（liveStats + arenaStats 各一筆、forfeit:true、net:-wager、`pendingSettle` 分支避免了「贏了被沒收」）。會員模式的 arenaStats 那一筆會被覆蓋 ⇒ 已報。棄局**不**呼 `bumpRoom`（房間的 matches/hostEdge 不動）——判定為刻意（棄局不算一場完成的對戰），未報。\n\n(c) 派彩零和：`CORE.resolve` 的 `net = win ? wager*(n-1) : -wager` 與 `payout = win ? wager*n : 0` 在 escrow 前扣一份的前提下恆等（`-wager + wager*n === wager*(n-1)`），N=2/3/4 我逐一算過（10000/1000/3人/你贏 → 9000 → 12000 = 10000+2000 ✓）；`games/vsslot/escrow-equivalence` 已對 3 模式 × 3 人數 × 勝負 18 組窮舉驗過，這條**沒問題**。會員路徑的 `liveStats.record(wager, wager+net)` 與 demo 的 `(wager, wager*n)` 在 win 時同值、lose 時同為 0，兩條路徑一致。\n\n(f) 餘額排在動畫之後：demo 路徑正確（`escrowSettle` 在 `setBeat(\"climax-win\")` 之後，鎖有守）；會員路徑的 `balance: +R.balance` 也在 `done` 裡＝動畫之後 ✓。唯一的漏水點是 `liveStats.record` 在 `climaxThen` **之前**（:512/:527），而 `HL.jackpot.onBet` 命中時會 `setBal(bal()+amount)` 直接入帳（jackpot.js:69）⇒ 累積彩金命中的金額會在「懸念」拍就跳出來。判定為**可接受**（JP 是獨立事件、有自己的慶祝演出與 toast，不是本局派彩），未報。\n\n(g) 責任博弈閘：`HL.rg.check(room.wager)` 只在 `accept()`（:215）評估一次，而真正的硬性 commit 在 3 秒後的 `escrowTake`（:245）——正常路徑下這個時間差無害（區間內沒有任何其他扣款者，`arenaSim` 只會加錢）。但 `escrowTake` 自己**不評估任何閘也不重驗餘額**，所以只要有第二條路徑走到它，閘就整條被繞過——這正是 `later()` 空閘那條 finding 的具體危害。另外 `accept()` 在 `escrow > 0` 時刻意跳過 rg 與餘額檢查（:214）＝正確（同一注不得評估兩次），已核對。`createBattle` 也已正確移除重複的 `HL.rg.check`。\n\n(e) 同一場能否被結算兩次：四個入口交叉我逐一走過——`leaveBattle`→`backArena`→`router.go`→`mountView`→`runExit`→`onExit`：第二次 `forfeitEscrow` 因 `escrow <= 0` 早退，**不會雙結算**；`onTeardown`（closePip）與 `onExit` 同樣被 `escrow<=0` 擋住；`escrowSettle` 會清 `pendingSettle` 與 `room._escrow`，`escrowTake` 冪等。**沒有找到真正的雙結算**。找到的是相反方向的問題：某些入口把該結的帳結成 0（member pendingSettle）或把不該沒收的錢沒收（PiP 續播）。\n\n【掃過但判定沒問題】`instant-picks.js:218-221` 的離場補結、`bounty.js` 踩地雷的原子 `- bet + win`（:203）、`persistence.js` 已不寫回 balance/arena_stats（不會把本機錯值推上伺服器）、`main.js:126` 登出也 runExit、`battle-mode.js`／`battle-tempo.js` 的純函式（無金流）、`ledger` 對 PvP 的 GGR 期望值為 0（`E[win]=(1/N)·wager·N=wager=E[bet]` ⇒ RTP≈100%、NGR≈0，不是缺陷）、`mock-data.makeArenaRoom` 不設 mine（已納入 arena 那條 finding）。\n\n【無法驗證】① 所有會員模式的結論都是**讀 SQL 形狀 + 客端程式碼**推出來的：Supabase phase4–7 未部署（intel/arena-battle-spec-2026-08-21.md:264 已記明），`play_battle` 的實際回傳、`ops_log_srv` 副作用、`member_econ` 的站別列都沒在真後端跑過。我在 repro 裡一律改用「注入假 `HL.sb` / 假 `HL.api.playBattle`」的方式，讓每一條都能在純前端當場復現。② preview 面板隱藏時不合成影格 ⇒ 我沒有實跑動畫時序，`data-beat` 的順序斷言是讀碼推得（`climaxThen` 巢狀回呼的字面順序 ≠ 執行順序這個坑我有避開，一律以 `setBeat` 的位置判先後）。③ PiP 那條的「畫面確實凍住」是從 `clearTimers` + `stage` 仍掛在 `pipHost` 推出來的，未實際目視；但錢與戰績那半（forfeit + losses+1 + toast）是純狀態，repro 可直接讀出。

## ④ 顯示真相與文案（競技場／配對／對戰）

### 29. [high / certain / 已知] 會員模式 F5 後：戰績每列「敗 · −NT$ NaN」、對手名變成「、」、回放全 0——伺服器 payload 缺前端讀的欄位，全 repo 無 normalize
- **位置**：`prototype/src/views/arena.js:313`
- **為什麼是錯的**：戰績列/回放/報表三個表面都直接讀 `rec.*`，而 rec 有兩個來源：①Demo 由 `vsslot.makeRec()` 產（含 net/win/ts/wager/myTotal/totals/rounds、seats 帶 name/av/me）②會員模式 F5 後由 `main.js:142 loadHistory()` 從 `battle_history.payload` 取，而那個 payload 是伺服器自己組的（docs/supabase-phase7.sql:162 `jsonb_build_object('seats',…,'winnerIdx',…,'roster',…,'game',…,'players',…,'mode',…)`）——**沒有 net、沒有 win、沒有 ts/wager、沒有 myTotal/totals/rounds，seats 也只有 {idx,total,rounds} 而沒有 name/av/me**。於是 `money(Math.abs(rec.net))` → `Math.round(undefined).toLocaleString()` → 「NT$ NaN」；`rec.win` undefined ⇒ 贏過的局一律標「敗」；`opps.map(o=>o.name).join("、")` 對兩個 undefined 回傳「、」（非空字串 ⇒ `|| "對手"` 這個保險絲永遠不會燒）；`myT` 落到 `(rec.totals||[0])[0]` = 0。看起來正常的原因：Demo（絕大多數驗證都在 Demo）永遠是路徑①，而會員模式要**重新整理過**才會走路徑②；node 347 項全綠、console 零錯誤。已知：intel/arena-battle-spec-2026-08-21.md §5 #1/#2（仍待做）。
- **重現**：node -e "var rec={seats:[{idx:0,total:9000,rounds:[100,200]},{idx:1,total:8000,rounds:[90,180]}],winnerIdx:0,roster:[{name:'你',av:'👑'}],game:'暗影儀式',players:2,mode:'terminal'};function money(v){return 'NT\$ '+Math.round(v).toLocaleString('en-US');}var seats=rec.seats,opps=seats.filter(function(x){return !x.me;});var myT=rec.myTotal!=null?rec.myTotal:((rec.totals||[0])[0]);console.log((rec.vs||'1v1')+' vs '+(opps.map(function(o){return o.name;}).join('、')||'對手'));console.log('你 '+money(myT)+' / '+(rec.win?'勝':'敗')+' / '+(rec.net>=0?'+':'-')+money(Math.abs(rec.net)));console.log('回放輪次='+JSON.stringify((rec.rounds&&rec.rounds.length)?rec.rounds:[(rec.totals||[0])]));"  
  → 印出「1v1 vs 、」「你 NT$ 0 / 敗 / -NT$ NaN」「回放輪次=[[0]]」。瀏覽器等效做法：devtools 執行 `HL.state.set({arenaStats:Object.assign({},HL.state.get().arenaStats,{matches:1,history:[上面那個 rec]})}); HL.arenaStats.history();`
- **建議修法**：在 arena.js 加一個**唯一的 normalize 出口** `function fromPayload(p)`：把伺服器 payload 轉成前端 rec 形狀（`win`/`net` 從 `battle_history` 的欄位或 `winnerIdx===0` 推、`ts` 用列的 ts、`seats` 用 `roster` 補 name/av 並以 `idx===0` 標 me、`totals` 由 `seats[].total` 組、`rounds` 由 `seats[].rounds` 轉置成「每輪 × 每席」）。`main.js` hydrate 與 `HL.api.loadHistory` 都必須經過它——不要在 historyModal/replayModal/battleRows 三處各自補 `|| 0`（那就是第四、五、六份真相）。另在伺服器端把 net/win/vs 一併寫進 payload 使兩條路徑同形。負向擾動：造一筆缺 net 的 rec，鎖要求 normalize 後 `typeof rec.net === 'number' && isFinite(rec.net)`。

### 30. [high / certain] 滿房／私密房玩家唯一能讀到規則的那個 modal，自己另寫了一套模式名與勝負條件，且與 HL.battleMode 語意不同（「最低分勝」/「末輪決勝」）
- **位置**：`prototype/src/views/arena.js:161`
- **為什麼是錯的**：`battleInfoModal` 的「模式」列是 `r.mode === "crazy" ? "Crazy Mode（最低分勝）" : r.mode === "terminal" ? "Terminal Mode（末輪決勝）" : "標準模式"`——完全繞過 `HL.battleMode.labelOf/winCondOf`。而單一真相寫的是「最低**總分**勝」與「最後一輪**增量**最高勝」。差異不是修辭：crazy 比的是**累計總分**，寫「最低分勝」玩家會讀成「每輪拿最低分」；terminal 寫「末輪決勝」則讀成「比末輪的總分」，而判準是末輪**增量**。這個 modal 正是滿房／私密房唯一的規則入口（`battleCta` 的「👁 觀戰」與 `cardAction` 的 fallback 都指到它），玩家看不到 infoBar 那份正確文案。看起來正常的原因：三個字串各自都通順，而 `games/arena/mode-semantics-single-truth` 鎖對 arena.js 只要求「檔案裡某處出現 winCondOf」（3527 行），出現在 historyModal 就算過 ⇒ 這條硬寫永遠綠。同一家族的第 4 個表面是 `arena.js:700` 建房表單的模式分段（自寫「標準/Crazy/Terminal」且完全沒有勝負條件行）。
- **重現**：開 preview → devtools：`var r=HL.state.get().arenaRooms.filter(function(x){return x.type==='vsslot';})[0]; r.mode='terminal'; r.players=2; r.seats=[{name:'Ken12',av:'🐯'},{name:'Ada7',av:'🐶'}]; HL.router.go('arena');` → 點該房卡**卡身**（不是按鈕）→ 觀戰 modal 的「模式」列顯示「Terminal Mode（末輪決勝）」。同一顆房卡的模式徽章走 `labelOf` 顯示「Terminal Mode」，打完後回放標題走 `winCondOf` 顯示「最後一輪增量最高勝」⇒ 三處措辭三種說法。
- **建議修法**：把該列改成 `["模式", HL.battleMode.labelOf(r.mode) + "（" + HL.battleMode.winCondOf(r.mode) + "）"]`，並在 `arena.js:700` 的模式分段每個選項下掛一行 `winCondOf(v)`。把鎖從「檔案裡有出現 winCondOf」升級為「arena.js 裡不得出現 `mode === "crazy" ?` / `mode === "terminal" ?` 這類對 r.mode 的字面分支」——用概念而不是舊字面當判準（見下一條）。

### 31. [medium / certain] vsslot 結算名次表仍自寫一份 metricOf（`room.mode === "terminal" ? o.last : o.total`），而防它的那條鎖只認舊字面 `e.last : e.total` ⇒ 空鎖
- **位置**：`prototype/src/views/vsslot.js:454`
- **為什麼是錯的**：`renderResult` 的名次列主數字用 `money(room.mode === "terminal" ? o.last : o.total)`，這正是 `core/battle-mode.js` 檔頭明令「各表面不得自寫」的那個判準（應為 `BM.metricOf(room.mode, o)`）。而 `prototype/tests/checks-games.js:3513` 的反向斷言寫成 `!/mode === "terminal" \? e\.last : e\.total/`——變數名是 `e.`，現行程式碼是 `o.`，字面不匹配 ⇒ 鎖對這份第二真相**完全失明**（347 項全綠）。這是本專案 checklist #6（判準認寫法而不是概念）＋ #7（vacuous lock）同時發生。目前三個模式下這個三元式恰好與 `metricOf` 同值，所以畫面沒有立刻錯——但它把「顯示哪個量」的規則複製到了 core 之外，第四個模式或 metric 改名時只會在這裡靜默錯掉；而且這一欄**沒有欄名**（結算卡同時擺著席位面板的累計值與這裡的末輪增量，兩個互斥數字無標籤並存，spec §5「結算與後續動作」已點名）。
- **重現**：node -e "var fs=require('fs'),vs=fs.readFileSync('prototype/src/views/vsslot.js','utf8');console.log('鎖的反向斷言命中舊字面：', /mode === \"terminal\" \? e\.last : e\.total/.test(vs));console.log('實際硬寫存在：', /room\.mode === \"terminal\" \? o\.last : o\.total/.test(vs));" → false / true。再跑 `node prototype/tests/run.js` → 347 全綠。
- **建議修法**：① `vsslot.js:454` 改 `money(BM.metricOf(room.mode, o))`，並在該欄上方補欄名 `BM.displayMetricLabel(room.mode)`（terminal 還要另列一欄累計，兩欄各自標名）。② 把鎖改成概念判準而非字面：對 `views/*.js` 掃「`mode` 與字串 'terminal'/'crazy' 做 `===` 比較」的**任何**形式（正則 `\bmode\s*===\s*"(terminal|crazy)"` 打在 strip 過註解的原始碼上），白名單只留 `core/battle-mode.js`。負向擾動：把 `metricOf(...)` 改回三元式，該鎖必須紅。

### 32. [medium / likely] 伺服器結算路徑直接改寫席位主數字，繞過「只有 refreshStandings 會動這些節點」的宣告 ⇒ terminal 局標籤寫「本輪增量」而數字是累計總分
- **位置**：`prototype/src/views/vsslot.js:521`
- **為什麼是錯的**：`refreshStandings` 的註記明說「只有這一個出口會動這些節點 ⇒ 不會出現兩處各自計算而漂移」（304 行），但 `finish()` 的伺服器分支多了一行 `sides.forEach(function (s, i) { s.totalEl.textContent = money(totals[i]); })`，`totals[i]` 取的是 `R.seats[i].total`＝**累計總分**（見 supabase-phase7.sql：`v_total[v_i] := v_run`）。而 `totalEl` 上方那顆 `metricLbl` 是 `BM.displayMetricLabel(room.mode)`，terminal 局寫的是「本輪增量」；同時 `rankEl`／`gapEl`／`subEl` 都不跟著這一行更新。⇒ 會員模式 + terminal 局，懸念到結算的那 2–4 秒裡，畫面是「本輪增量：NT$ 9,000」（其實是十輪累計），底下差距/名次仍是上一輪的值。normal/crazy 下 total 與 metric 同值 ⇒ 完全看不出來，只有 terminal 露出；而 terminal 只佔 mock 房 8%、且需要真的部署 Supabase 才走得到這條路徑，所以從沒被撞到。
- **重現**：headless 配方（CLAUDE.md §9）：把 `SRV` 那條路徑短路成假伺服器結果即可觀察——devtools 內 `HL.api.playBattle = function(){return Promise.resolve({seats:[{idx:0,total:9000,rounds:[100,300,700,1200,2000,3000,4000,6000,8000,9000]},{idx:1,total:8000,rounds:[90,280,650,1100,1900,2800,3900,5800,7900,8000]}],winnerIdx:1,win:false,net:-1000,balance:HL.state.get().balance-1000,stats:{}});};` 再把 `HL.auth.backend/user` 造成 truthy，開一間 `mode='terminal'` 的房打完 → 觀察 `.ax-vs__score` 內 `small`（本輪增量）與 `.ax-vs__total`（9,000）並存；`.ax-vs__gap` 停在倒數第二輪的值。
- **建議修法**：刪掉 521 行的直接寫入，改成把伺服器最終值灌回 `sides[i].cum/last` 後呼叫 `refreshStandings()`（單一出口）。若要「收斂到伺服器分數」的語意，就讓 `refreshStandings` 接受一個 override 參數，不要在外面另寫一次。負向擾動：加一條鎖「vsslot.js 內對 `totalEl.textContent` 的賦值點必須恰好 1 個（在 refreshStandings 內）」。

### 33. [medium / certain] 背景模擬 simVsslot 自寫排序方向，且 terminal 房用「總分最高」決定模擬勝者（第 5 個繞過 HL.battleMode 的表面）
- **位置**：`prototype/src/views/arena.js:472`
- **為什麼是錯的**：`var best = 0; for (…) { if (r.mode === "crazy" ? scores[k] < scores[best] : scores[k] > scores[best]) best = k; }`——這是「排名方向」的第二份真相，應為 `HL.battleMode.better(r.mode, …)`。而且它連 metric 都錯：terminal 的判準是**最後一輪增量**，這裡只生成單一 `scores[]`（總分）並用「越高越好」判勝，等於把 terminal 房當 normal 房模擬。結果寫進 `r.log[].winner` 與 `hostEdge/challEdge`。看起來正常的原因：(a) 這些數字在對戰房卡上沒有渲染（heatBar 只掛在賞金卡），所以沒有畫面可對照；(b) `games/arena/mode-semantics-single-truth` 只檢查 vsslot.js 與 arena.js 的**回放**段，從未問「這條規則有沒有第二個消費者」（CLAUDE.md §4 ⭐ 家族的自問②/⑤）。附帶一個潛伏不一致：這裡 push 的 log 形狀是 `{winner, scores}`，而 `processModal` 非 bounty 分支讀的是 `e.my / e.opp / e.win`（arena.js:215）⇒ 兩份形狀不相容（目前因為對戰房 `mine` 恆 false 而不可達，見最後一條）。
- **重現**：node -e "var BM=require('./prototype/src/core/battle-mode.js');var scores=[900,300];var best=0;for(var k=1;k<2;k++){if('terminal'==='crazy'?scores[k]<scores[best]:scores[k]>scores[best])best=k;}console.log('simVsslot 判勝者=席'+best);console.log('單一真相（terminal 應比末輪增量，這裡連 last 都沒有）=', BM.spec('terminal').metric);" → simVsslot 一律用 total 判勝；grep 亦可證：`grep -n 'battleMode' prototype/src/views/arena.js` 的命中裡沒有任何一行在 simVsslot 內。
- **建議修法**：simVsslot 改為同時生成 `totals` 與 `lastDeltas`（每輪逐次累加即可），勝者一律走 `HL.battleMode.rankBy(r.mode, entries)[0]`；log 條目改成與 `processModal` 同形（`{name, my, opp, win}`）或反過來讓 processModal 只讀 `winner/scores` 一種形狀。鎖：把「不得自寫比較子」的掃描範圍從「回放段」擴到 arena.js 全檔（白名單只留 core/battle-mode.js）。

### 34. [medium / certain / 已知] 大廳「🔥 熱門玩家擂台」是永久凍結快照：⏱ 不動、席位不變、已結束的鬼房仍可點進去
- **位置**：`prototype/src/views/lobby.js:108`
- **為什麼是錯的**：`hotRoomsSection()` 在 lobby render 的那一刻讀一次 `HL.state.get().arenaRooms`、呼一次 `HL.arenaUI.roomCard(r)` 就結束，**沒有訂閱任何更新通道**（同檔 186 行的 `HL.ticker.add` 只餵大獎牆）。而 `arena.js tick()` 每秒 mutate 這些房（endsInSec--、seats 補位、prizePool 變動、done++）並在結束時 `rooms.splice(i,1)`；它的原地更新 `updateCard` 又只查 `gridEl.querySelector(...)`＝**競技場自己的格線**，永遠碰不到大廳這批節點。⇒ 玩家在大廳停留 5 分鐘，看到的是 5 分鐘前的席位與倒數；已從 state 移除的房間卡片還在，點下去 `enterRoom → router.go('vsslot', id) → findRoom` 回 undefined，畫面才說「此對戰已結束。」。看起來正常的原因：卡片渲染完全正確、換頁再回來就刷新了，只有停留才會露出。已知：intel/arena-battle-spec-2026-08-21.md §5 #9（仍待做）。
- **重現**：開 preview 進大廳，devtools 記下 `var id=HL.state.get().arenaRooms[0].id, t0=HL.state.get().arenaRooms[0].endsInSec;` 與畫面上該卡的 ⏱ 值 → 等 60 秒 → `HL.state.get().arenaRooms.filter(r=>r.id===id)[0].endsInSec` 已少 60，畫面 ⏱ 完全沒動。再執行 `HL.state.set({arenaRooms: HL.state.get().arenaRooms.filter(r=>r.id!==id)})` → 該卡仍在大廳、仍可點 → 落到「此對戰已結束。」。
- **建議修法**：`hotRoomsSection` 掛上 `HL.ticker.add`（spec 明示：**不要新開 setInterval**），每 tick 對可見卡呼叫一次 arena 的原地更新；為此把 `updateCard` 從「查 gridEl」改成「查傳入的 container（預設 gridEl）」並經 `HL.arenaUI` 對外開放，讓大廳與競技場共用同一個更新出口。同時每 tick 移除已不在 `arenaRooms` 的鬼卡。

### 35. [medium / certain / 已知] 房卡原地更新漏掉賞金池：卡片的 ⏱／挑戰次數／熱度條每秒在動，賞金池卻是進場那一刻的值
- **位置**：`prototype/src/views/arena.js:506`
- **為什麼是錯的**：`updateCard` 的 bounty 分支只更新 `[data-room-time]`、`.ax-rc-done`、`.ax-heat` 三處，**沒有** `.ax-room-card__prize`（bountyCard:53 用 `money(r.prizePool)` 渲染）。而 `simBounty`（arena.js:460）每次假挑戰都改 `r.prizePool`，`tick()` 只在「有房間新增/移除」時才整批 `renderGrid()`。⇒ 玩家看著同一張卡上三個數字在跳、賞金池卻不動；同一間房點進 `views/bounty.js` 後，那裡的 `refreshInfo()`（bounty.js:35）顯示的是**真值** ⇒ 兩個表面對同一個數字說兩種話。看起來正常的原因：卡片明顯「有在動」，凍結的那一格不會引起懷疑；重繪一次（切頁籤/開房）就對上了。已知：intel/arena-battle-spec-2026-08-21.md §5 #7（仍待做）。
- **重現**：競技場頁籤停在「賞金局」，devtools：`var r=HL.state.get().arenaRooms.filter(x=>x.type==='bounty')[0]; console.log(r.id, r.prizePool);` 記下畫面上那張卡的賞金池 → 等 30–60 秒（或直接 `r.prizePool = 1;`）→ 再讀 `document.querySelector('[data-room-id="'+r.id+'"] .ax-room-card__prize b').textContent`，與 `r.prizePool` 不符（挑戰次數與 ⏱ 卻已同步）。
- **建議修法**：在 `updateCard` 的 bounty 分支補 `var p = card.querySelector('.ax-room-card__prize b'); if (p) p.textContent = money(r.prizePool);`。更根治的做法是比照本輪 `battleCta` 的處理：把「卡片上所有會變的欄位」集中成一個 `cardFields(r)` 出口，render 與 updateCard 都跑同一份，避免下一次又漏一格。鎖：對 bountyCard 內出現的每個 `money(r.<field>)`/`r.<field>` 動態欄位，要求 `updateCard` 內存在對應的 querySelector（結構性比對，不是逐條列舉）。

### 36. [medium / certain / 已知] 平手裁決完全不可見：battleMode.tieAtTop 有定義、有測項，但 prototype/src 內零呼叫 ⇒ terminal 末輪雙 0 時結算卡照樣寫「🏆 你贏了！」
- **位置**：`prototype/src/core/battle-mode.js:79`
- **為什麼是錯的**：`tieAtTop()` 的註記寫明它存在的理由是「UI 要據實顯示『平手→公平抽籤』而不是靜默給獎盃」，但 grep 全 `prototype/src` 只有 `views/vsslot.js:26` 把它**轉出**（`CORE.tieAtTop`）而沒有任何呼叫點，唯二的消費者是 `tests/checks-games.js:3254-3255`。⇒ 本專案 checklist #8「容器沒有人用」。實際後果：`finishLocal` 確實把 `HL.fair` 的 tieRoll 餵給 `resolve`（勝者是公平抽的，這半修對了），但 `renderResult` 只有「🏆 你贏了！／你輸了」＋名次表，**沒有任何字樣說明這局是平手、由抽籤裁決、roll 值是多少**。terminal 模式末輪雙 0 在 1v1 約 1.7%（spec 實測），畫面上兩人都是 NT$ 0 卻有人拿獎盃——與 2026-08-21 修掉的那個 bug 在玩家眼裡**完全無法區分**。看起來正常的原因：抽籤是對的、鎖 `games/arena/tie-break-and-fairness` 驗的是 `rankBy` 的數學而不是「畫面有沒有說」。已知：spec §4.4「結算卡：平手裁決可見化」（仍待做）。
- **重現**：node -e "var BM=require('./prototype/src/core/battle-mode.js');var e=[{total:0,last:0},{total:0,last:0}];console.log('tieAtTop=',BM.tieAtTop('terminal',e));" → 2（資料查得出來）。再 grep 證明沒人問：`grep -rn 'tieAtTop' prototype/src | grep -v 'core/battle-mode.js'` → 只有 vsslot.js:26 的轉出行。
- **建議修法**：`finishLocal` 把 `tieRoll` 與 `CORE.tieAtTop(room.mode, entries)` 一起帶進 `rec` 與 `renderResult`；結算卡在 `resultBlock` 下加一行「平手 N 人 · 由可驗證公平抽籤裁決（roll 0.4173）」並在回放/戰績列同樣標記（同一個出口，不要各寫一句）。鎖：`tieAtTop` 必須至少有一個 `src/` 呼叫點（反 vacuous），並用一筆雙 0 的 rec 斷言結算卡文字含裁決字樣。

### 37. [medium / certain] 對戰中同一件「平手」被兩處各自渲染成互相矛盾的話：名次徽章寫 #2/#3，差距文案同時寫「並列第一」
- **位置**：`prototype/src/views/vsslot.js:313`
- **為什麼是錯的**：`refreshStandings` 內名次來自 `order.indexOf(e)+1`（`rankBy` 平手時退回席位順序 ⇒ 必然給出 #1/#2/#3 三個不同名次），而差距文案來自 `gapTo`（平手 ⇒ 0 ⇒ 寫「並列第一」），領先高亮則來自 `leaderIndex`（平手 ⇒ 取第一個索引）。三者對「平手」有三種呈現。最常見的觸發不是罕見情境，而是**每一場對戰的開場**：538 行 `refreshStandings()` 在第一輪之前就跑，此時全員 0 分 ⇒ 席 0 顯示「#1/3 領先」（沒人得分卻宣稱領先）、席 1/2 顯示「#2/3 並列第一」「#3/3 並列第一」。看起來正常的原因：每一行文字單看都合理，而 `games/arena/in-play-standings` 鎖驗的是節點存在與走了哪個 API，不驗「同一狀態下兩個節點是否自相矛盾」。
- **重現**：node -e "var BM=require('./prototype/src/core/battle-mode.js');var E=[{total:0,last:0},{total:0,last:0},{total:0,last:0}];var o=BM.rankBy('normal',E),L=BM.leaderIndex('normal',E);E.forEach(function(e,i){var g=BM.gapTo('normal',BM.metricOf('normal',e),BM.metricOf('normal',E[L]));console.log('席'+i+' 徽章=#'+(o.indexOf(e)+1)+'/3  文案='+(i===L?'領先':(g===0?'並列第一':'距第一 '+g)));});" → 席0 #1/3 領先｜席1 #2/3 並列第一｜席2 #3/3 並列第一。畫面驗法：按 §9 配方把 vsslot view 掛進 DOM，讀 `[...document.querySelectorAll('.ax-vs__side')].map(s=>s.querySelector('.ax-vs__rank').textContent+' / '+s.querySelector('.ax-vs__gap').textContent)`。
- **建議修法**：名次改由 `tieAtTop`/同分分組決定：同分者一律顯示同一個名次（`#1= 並列`），並在全員 0 分（尚未開賽）時把徽章與「領先」都改成中性的「未開賽」。三個節點（rank/lead 高亮/gap）必須由同一次分組計算餵養——現在是三個 API 各問一次。鎖：構造全平手 entries，斷言「所有席位的名次字串相同」且「沒有任何席位同時出現『領先』與非 #1」。

### 38. [medium / certain] i18n：對戰的勝負條件與名次資訊切到 EN／简中後全留繁中，而零容忍 i18n 棘輪全綠——單一真相檔 core/battle-mode.js 被 SPEC_HOSTS 整檔排除在射程外
- **位置**：`prototype/src/core/battle-mode.js:31`
- **為什麼是錯的**：`SPEC_HOSTS`（tests/i18n-key-scan.js:538）列了 `src/core/battle-mode.js`，而 `inDataScope()` 對它是 `return false`（同檔 562 行）＝**整檔**退出資料面棘輪。那份清單的用途是排除 `selftest.register({title})` 的測項標題，卻連同排除了這支檔**唯一存在的理由**：玩家面的模式名與勝負條件（`label:"標準模式"`、`winCond:"最高總分勝"/"最低總分勝"/"最後一輪增量最高勝"`）。實測 `scanDataValues` 直接餵進去會抓到「標準模式」，但 `inDataScope` 先把檔案擋掉 ⇒ 缺漏數 0。三個 winCond 另外還被 `DATA_FIELDS`（tag/subtitle/prizeLabel/label/name/style/game/t）漏掉。DOM 面同樣有一族逃出：`s.gapEl.textContent = 三元式`（「領先」/「並列第一」/「距第一 」）與 `leftEl.textContent = 三元式`（「只有這一輪算分」/「最後一輪」）不是字面量賦值 ⇒ 抽取器抓不到；「還剩 N 輪」「決勝輪 10 / 10」「累計 」「本輪 」則被判 NA_CONCAT（串接＝補了也不生效）而合法排除。實查兩本字典：`最高總分勝`/`最低總分勝`/`最後一輪增量最高勝`/`標準模式`/`Crazy Mode`/`Terminal Mode`/`領先`/`並列第一`/`只有這一輪算分`/`最後一輪`/`距第一 `/`還剩 `/`決勝輪 `/`累計 `/`本輪 `/`已棄局，賭注 `/`已離開對戰，賭注 `/`此房已滿，僅供觀戰（Demo）。` 全部 0 命中。看起來正常的原因：`node prototype/tests/run.js` 347 綠、i18n 兩面棘輪都宣稱零容忍。
- **重現**：node -e "var s=require('./prototype/tests/i18n-key-scan.js'),fs=require('fs');console.log('inDataScope(core/battle-mode.js)=',s.inDataScope('src/core/battle-mode.js'));console.log('若在射程內會抓到：',JSON.stringify(s.scanDataValues(fs.readFileSync('prototype/src/core/battle-mode.js','utf8'),'src/core/battle-mode.js')));var en=fs.readFileSync('prototype/src/i18n/en.js','utf8'),h=fs.readFileSync('prototype/src/i18n/zh-Hans.js','utf8');['最高總分勝','最低總分勝','最後一輪增量最高勝','標準模式','領先','並列第一','只有這一輪算分','最後一輪'].forEach(function(k){console.log((en.indexOf('\"'+k+'\"')>=0?'en有':'en缺')+' '+(h.indexOf('\"'+k+'\"')>=0?'简有':'简缺')+' '+k);});"
- **建議修法**：① 把 SPEC_HOSTS 從**檔案級排除**改成**區段級排除**（該檔已有 `testSpecRegions()` 可用：只跳過 `register({… run: function …})` 的物件字面，其餘照掃）——否則任何「同時託管測項又宣告玩家面文案」的 core 檔都是這條逃生門。② `DATA_FIELDS` 加 `winCond`（以及 `desc`/`sub` 若同族）。③ 在 en.js／zh-Hans.js 補上 3 條 winCond + 「標準模式」＋ 上列整節點片語；串接型（還剩 N 輪／決勝輪 k / n／距第一 X）改走 PREFIX/SUFFIX 表或把數字拆進獨立 span，讓整節點鍵可被翻譯。④ 三元式賦值改成 `el(...).textContent = t(...)` 形狀或把兩個字串宣告成模組常數，使抽取器看得到。

### 39. [low / certain / 已知] 競技場空狀態文案不隨頁籤變化：在「我的房間」「賞金局」空清單時，一律叫玩家「按開房發起第一場挑戰」
- **位置**：`prototype/src/views/arena.js:185`
- **為什麼是錯的**：四個頁籤（全部／我的房間／賞金局／Slots Battle）共用同一句「目前沒有房間，按「開房」發起第一場挑戰！」。最常撞到的是「我的房間」：`visibleRooms()` 用 `isMineRoom` 過濾，只要玩家沒開過房就是空的，而這句話對該情境的敘述是錯的（不是「目前沒有房間」，而是「你還沒有房間」；而且全部頁籤明明滿滿是房）。看起來正常的原因：句子本身通順，且「全部」頁籤幾乎不會空（tick 每秒有 18% 機率補房）所以測試時只會看到合理的那一種。已知：intel/arena-battle-spec-2026-08-21.md §5 #21（仍待做）。
- **重現**：競技場 → 點「我的房間」頁籤（未開過任何房）→ 顯示「目前沒有房間，按「開房」發起第一場挑戰！」，同時點回「全部」有 10 張房卡。devtools 等效：`HL.state.set({arenaRooms: HL.state.get().arenaRooms.filter(r=>r.type!=='bounty')}); ` 再點「賞金局」頁籤 → 同一句。
- **建議修法**：把空狀態做成 `emptyFor(filter)` 單一出口，四種頁籤各一句（含各自的行動：我的房間→「＋ 開房」、賞金局→「看看 Slots Battle」、Slots Battle→「看看賞金局」），並讓文案是整節點字面量以便進 i18n 字典。

### 40. [low / certain] 同一張滿房房卡的兩個點擊入口回應不同：點卡身跳 warn「這間房剛剛滿了」，點「👁 觀戰」鈕不跳；而房其實早就滿了
- **位置**：`prototype/src/views/arena.js:122`
- **為什麼是錯的**：`battleCard` 卡身 `onClick: cardAction(r)`，而 `battleCta` 的觀戰鈕 `onClick: battleInfoModal(r)`——兩條路都是「看這間房」，但只有卡身那條會先跑 `if (j.full) HL.ui.toast("這間房剛剛滿了，改為觀戰（Demo）", "warn")`。那個 toast 是為「渲染到點擊之間才滿掉」的競態寫的（117 行註記），但判斷式只問 `j.full`、不問「是否與渲染時的狀態不同」⇒ 一間已經滿了十分鐘、CTA 明明寫著「👁 觀戰」的房，只要點卡身就宣稱「剛剛滿了」。看起來正常的原因：toast 內容看似體貼，而按鈕路徑（大多數人會點按鈕）不會出現它。
- **重現**：競技場 → devtools：`var r=HL.state.get().arenaRooms.filter(x=>x.type==='vsslot')[0]; r.players=2; r.seats=[{name:'A',av:'🐯'},{name:'B',av:'🐶'}]; HL.router.go('arena');` → 該卡 CTA 已是「👁 觀戰」→ 點**卡身空白處** → 冒出 warn toast「這間房剛剛滿了，改為觀戰（Demo）」；改點「👁 觀戰」**按鈕** → 沒有 toast，直接開 modal。
- **建議修法**：`cardAction` 只在真的偵測到競態時才提示：`battleCta` 渲染時把當下的 `canJoin` 寫進 `data-cta-state`，`cardAction` 比對 `data-cta-state === 'join'` 且現在 `full` 才 toast「這間房剛剛滿了」；其餘情況兩條路徑都直接 `battleInfoModal`。

### 41. [low / certain] 「對押競技」房主結算路徑是零使用者容器：r.net 全 repo 從未被賦值，所以淨利恆 +NT$ 0、hostNet 恆 0，而那三個表面都不可達
- **位置**：`prototype/src/views/arena.js:195`
- **為什麼是錯的**：`roomNet(r)` 的非 bounty 分支回 `r.net || 0`，而 `grep -rn '\.net =' views/arena.js views/vsslot.js` 命中 0 ⇒ `r.net` **從來沒有被寫過**。連帶：`endMyRoom:487` 的 `balance + (r.net||0)` 是加 0、`490` 的 `hostNet += net` 是加 0（而 `hostNet` 在 `statSummary` 回傳卻沒有任何 tile/報表消費它）。而這三個表面本身也進不去：`endMyRoom` 只把 `r.mine` 的房推進 `ended`，`myRoomStatusModal` 只由 `cardAction` 在 `j.mine` 時呼叫，但 Slots Battle 房的 `mine` 恆為 false（`createBattle:735` 明寫 `mine: false`，`makeArenaRoom` 也不設）⇒ `myRoomStatusModal`／`settlement`／`processModal` 的 vsslot 分支（含「對押競技 · <slot>」這個已退役的舊名、以及與 simVsslot 的 log 形狀不相容的那段）**呼叫點為 0**。看起來正常的原因：程式碼齊備、鎖 `games/arena/room-net-single-truth` 驗的是賞金房那半的公式（有使用者的那半），沒人問「vsslot 那半有人用嗎」。這正是 CLAUDE.md §4 ⭐ 家族的自問⑤（沒人用的容器）。
- **重現**：node -e "var fs=require('fs'),a=fs.readFileSync('prototype/src/views/arena.js','utf8'),v=fs.readFileSync('prototype/src/views/vsslot.js','utf8');console.log('r.net 賦值點：', (a+v).match(/\.net\s*=[^=]/g));console.log('vsslot 房設 mine:true 的地方：', /type: \"vsslot\"[\s\S]{0,300}mine: true/.test(a));" → null／false。devtools：`HL.state.get().arenaRooms.filter(r=>r.type==='vsslot'&&r.mine).length` → 恆 0。
- **建議修法**：二選一，別讓它繼續半掛著：(a) 若「開房被別人挑戰」要成為真功能，就讓 `simVsslot` 在每場模擬後寫 `r.net += (best===0 ? +wager*(n-1) : -wager)`（或 hostEdge/challEdge 的淨差），並把自建對戰房標成 `mine:true` 使它進「我的房間」與結算流；(b) 若不做，就刪掉 `roomNet` 的 vsslot 分支、`endMyRoom` 的 vsslot 加值、`myRoomStatusModal/settlement/processModal` 的 vsslot 分支與 `hostNet`，避免下一輪有人以為它會動。無論哪一個，加一條鎖斷言「roomNet 的每個分支都有至少一個真實寫入來源」。

> 掃過但判定沒問題／無法驗證：【掃過但判定沒問題】① `battleCard` 的 sub 行分隔：`arena.js:137-143` 目前是兩個獨立 span，`.ax-room-card__mode` 在 `components.css:1846` 有 `margin-left: var(--ax-space-1_5)` ⇒ 「10 輪 · 1v1v1」與模式徽章之間有實體間距，任務描述裡「1v1v1Crazy 少了分隔」的舊症狀在磁碟現況已不成立（且模式名已改問 `labelOf`）。② `updateCard` 的 vsslot 分支覆蓋率：⏱、席位格、`x/y 玩家`、CTA（含 disabled/文案/onClick 閉包）四者每秒重建，本輪修好的部分我逐一比對過 `battleCard` 的動態欄位，沒有再漏；`.ax-room-card__prize`（賭注）與模式徽章、輪數是靜態值，不需更新。③ `.ax-vs__rank/__state/__sub/__delta/__gap`、`ax-battle__info/__left/__mode/__fast`、`is-reveal/is-final-round/is-suspense/is-eliminated/is-champion`、`ax-stand__rk` 全部在 `components.css` 有規則（沒有「掛了 class 卻沒樣式＝文字隱形」的情況）。④ `HL.fair.isPF` 已改吃 `key.split(\":\")[0]` 且 `PF_GAMES` 已收 `vsslot`（fair.js:215/219）⇒ spec 記載的「對戰沒有公平入口」確已修好。⑤ `battleRows`（報表）與 `historyModal`、`replayModal` 的模式語意都走 `HL.battleMode`（labelOf/winCondOf/metricOf/displayMetricLabel/barFrac/leaderIndex），沒有殘留「總分越高越好」的硬寫；報表欄名依模式而變也正確。⑥ `views/bounty.js` 有 `refreshInfo()` 集中刷新賞金池/剩餘次數，覆蓋率良好（唯 `startFlipClient:144` 先加 prizePool 但未即時刷，`finishFlip` 會補上，最終值正確 ⇒ 不報）。⑦ `views/instant-duel.js` 的分階段揭曉與文案未見兩處各寫；`game-frame.js` 的 `meta.title/provider` 只有單一來源。⑧ 本輪已修好的五項我都逐檔比對過磁碟現況（工廠函式 mountView／later 存活閘／room._escrow／joinability 三出口／noSeatFor／forfeit 記敗局），未發現修得不完整之處，只在第 4 條指出伺服器結算路徑仍有第二個寫入者繞過 `refreshStandings` 這個單一出口。

【無法驗證】(a) 會員模式（Supabase）路徑我只能靠 `docs/supabase-phase7.sql` 的 payload 形狀＋前端讀法做靜態推導與 node 重演，沒有真實後端可跑；第 1、4 條的實際畫面請以會員帳號 F5 後的「戰績與回放」複驗。(b) 節奏/動畫類（懸念→高潮→餘額）只驗到 `data-beat` 與 DOM/帳目序列，preview 隱藏時不合成影格 ⇒ 「畫面有沒有在動」與 CSS transition 的實際觀感未驗（CLAUDE.md §9 已載明此限制）。(c) 第 9 條的名次/差距矛盾我用 `battle-mode.js` 純函式重演坐實了資料層，實際 DOM 文字請按 §9 配方把 vsslot view 掛進 DOM 後讀 `.ax-vs__rank`/`.ax-vs__gap` 複核。(d) 第 12 條的 toast 我確認了兩個入口的程式路徑差異，但沒有在 preview 上實點（登入 gate）。

## ⑤ 節奏與拍（battleTempo 單一真相 / 裸毫秒 / JS↔CSS 雙寫 / phaseGame 拍序 / 真站夾與 ultra 禁用）

### 42. [high / certain] 真站「不提供 ultra」只在 battleTempo.ms 裡生效——view 把裸 0.35 交給 fgboard，轉輪與落下實際仍是 ultra
- **位置**：`prototype/src/views/vsslot.js:361`
- **為什麼是錯的**：battle-tempo.js:14/66 明文承諾「真站不提供 ultra（夾到 fast），以符合禁 turbo/slam stop」，而夾住的動作只寫在 `ms()` 裡（`if (live && s < SPEED.fast) s = SPEED.fast`）。vsslot 的 `speed()`（:160）是**第二份 SPEED 表**（自己寫 0.35/0.6/1，不呼叫 `HL.battleTempo.speedOf`），也不做真站夾，然後把這個未夾的乘數當 `animSpeed: sp` 交給 fgboard；fgboard 的 `animateRoll`（:77/:81）與 `tumbleAnim`（:106/:107）是**純裸算式 × SP**，完全不經過 `ms()` ⇒ 真站 ultra 局的轉輪實測 377ms、落下 140ms，而模組自己回答的是 540ms／240ms。看起來正常的原因有三：① 經過 `ms()` 的那些拍（commit/suspense/dwell/clear/cascade_gap/round_gap…）確實被夾住了，畫面整體不會「快到破」；② battle-tempo 自帶的鎖只在 API 層斷言 `ms('roll',ultra,{live:true})===ms('roll',fast,…)`，那條永遠綠，因為真正的轉輪根本不問它；③ 建房精靈（arena.js:703）在真站照樣提供「⚡⚡ 超快旋轉 Ultra」，對戰資訊列（vsslot.js:341）還掛「⚡⚡ 超快」徽章——玩家與程式都以為 ultra 生效，只有「政策說不該生效」這件事被繞過。真站唯一的房來源就是自建房（arena.js:517 已把假房擋掉），所以這條路徑必達。
- **重現**：1) devtools：`localStorage.setItem("HL_SITE_MODE","live"); location.reload();`  
  2) 競技場 → 開房 → 勾「⚡⚡ 超快旋轉 Ultra」→ 建立 → 接受 → 承諾倒數歸零後第一輪起轉時立刻讀：  
     `document.querySelector(".ax-reel__strip").style.transition`  → `transform 0.175s …`（=0.5×0.35，第一欄）  
     `HL.battleTempo.ms("roll", 0.35)`                              → `540`（真站夾到 fast 後的答案）  
     `document.querySelector(".ax-battle__fast").textContent`        → 「⚡⚡ 超快」（真站不該提供）  
  3) 純算術對照：`node -e "var T=require('./prototype/src/core/battle-tempo.js');console.log(T.ms('roll',0.35,{live:true}), (0.5+4*0.08)*1000*0.35+90, T.ms('drop',0.35,{live:true}), 400*0.35)"` → `540 377 240 140`
- **建議修法**：把「速度」也收成單一出口：`speed()` 改成 `HL.battleTempo.speedOf(room.prefs)`，並在 battleTempo 裡新增 `effectiveSpeed(prefs, opts)`＝在**來源處**就做真站夾（回傳 ≥ SPEED.fast），view/fgboard 一律只拿夾過的值；fgboard 的 `animateRoll`/`tumbleAnim` 改吃 `T.ms("roll"|"drop", SP)`（見另一條 finding），這樣 ultra 禁用只需在一個地方成立。同時 arena.js:703 的 Ultra 開關與 vsslot.js:341 的徽章在 `HL.site.isLive()` 時要隱藏／標「真站不提供」，否則 UI 仍在承諾一件政策禁止的事。

### 43. [medium / certain] 分級命中停留被「保護彈分」的下限壓平：預設 fast 下三檔變 700/700/720，ultra 下完全相同
- **位置**：`prototype/src/core/battle-tempo.js:82`
- **為什麼是錯的**：`dwellFor` 回傳 `Math.max(ms(小/中/大), popMs())`，理由寫的是「停留不得短於彈分壽命，否則彈分會被硬切」。但 fgboard 的實際序是 **dwell → 才 popup() → hold → 消除 → 落下**（fgboard.js:122-130）：彈分是在 dwell **結束之後**才被建立的，它的壽命由 `hold = Math.max(popMs(), 650*SP)`（:121，恆等於 700，因為 650×SP 永遠 <700）保護，容器要到 `dwell+hold+clear` 才被清 ⇒ **dwell 對彈分完全沒有保護作用**。這個套錯區間的下限把規格 §3 第 8 項要的分級演出吃掉了：小獎 400／中獎 700／大獎 1200 在常速變成 700/700/1200（小＝中，三檔剩兩檔），在**建房預設的 fast**（arena.js:657 `fast:true`）變成 700/700/720（差 20ms＝不可感知），在 ultra 變成 700/700/700（完全沒有分級）。之所以看不出來：battle-tempo 自己的鎖只斷言「dwellFor ≥ popMs」（那正是壓平的原因，恆綠）＋「大獎 > 小獎」而且**只在 sp=1 驗一次**（1200>700 通過），沒有任何一條在預設速度下驗過三檔仍然可分辨。
- **重現**：`node -e "var T=require('./prototype/src/core/battle-tempo.js');[1,0.6,0.35].forEach(function(s){console.log('sp='+s, [10,80,300].map(function(w){return T.dwellFor(w,10,s,{live:false});}).join(' / '));})"`  
  → `sp=1 700 / 700 / 1200` ｜ `sp=0.6 700 / 700 / 720` ｜ `sp=0.35 700 / 700 / 700`  
  （0.6 就是建房精靈的預設值：arena.js:657 `fast: true`）
- **建議修法**：把下限移到它真正該守的區間：`dwellFor` 只回傳分級值（不做 popMs 下限），改在 fgboard 把「彈分不得被清場吃掉」寫成 `hold = max(T.popMs(), T.ms("clear"…))` 這一條不變量（現況已成立，只是理由掛錯地方）；若擔心小獎 240ms 太短，就給 `dwell_small` 一個自己的地板常數（規格 §3 第 9 項本來提的是 `.ax-fgb__pop--sm` 350ms 輕量彈分），不要用 pop 的壽命當所有停留的地板。鎖要補：**在 sp=0.6 與 0.35 驗三檔互不相等**（負向擾動＝把分級改回單一值時必須紅）。

### 44. [high / certain] 「本輪增量／名次／差距」在下一輪起轉時不重置——整個轉輪階段顯示的是上一輪的值（terminal 局連主數字都是）
- **位置**：`prototype/src/views/vsslot.js:394`
- **為什麼是錯的**：`s.last` 只在揭曉那一刻被寫（:414），**沒有任何地方把它歸零**。新一輪開始時（:391-394）只重設了 `roundEl`／`leftEl`／`stateEl`（「進行中」）與 `is-done`，`refreshStandings()` 也不在這裡被呼叫 ⇒ 上一輪留下的 `s.last` 與由它算出的節點原封不動掛在畫面上：於是「Round 7 / 10 · 進行中」的同一畫面上寫著「本輪 +1,200」，而那 1,200 是第 6 輪的增量。normal/crazy 只錯在這一行文案（累計沒變、名次仍對），但 **terminal 模式的主數字就是 `last`**（`metricOf`）⇒ 每席的大數字、`#k/N` 名次徽章、`is-lead` 金框、「距第一 X」在每一輪約 70% 的時間裡全部是**上一輪的排名**，直到本輪揭曉才跳成真值。看起來正常的原因：數字一直在動、每輪結束時也會變成正確值，而所有既有鎖（`games/arena/in-play-standings`）守的是「有沒有走 `BM.*` 那個出口」，沒有一條守「這些節點屬於哪一輪」——這就是 §4 那個顯示 BUG 家族（顯示的量 ≠ 當前輪的量）換一個入口復發。
- **重現**：devtools（§9 掛載配方，繞過登入 gate）：  
  ```js  
  await HL.lazyViews.load("vsslot");  
  var r = HL.state.get().arenaRooms.filter(function(x){return x.type==="vsslot";})[0];  
  r.mode = "terminal"; r.prefs = {};            // terminal 最明顯；normal 也看得到文案錯  
  var h = document.createElement("div"); document.body.appendChild(h);  
  h.appendChild(HL.views.vsslot.render(r.id));  
  // 點「接受對戰」→ 等 3-2-1 → 等第 1 輪揭曉完 → 第 2 輪「起轉中」時讀：  
  document.querySelector("[data-beat]").getAttribute("data-beat");            // "round-spin"  
  document.querySelector(".ax-battle__info b").textContent;                    // "Round 2 / 10"  
  [].map.call(document.querySelectorAll(".ax-vs__delta"), n=>n.textContent);   // 仍是第 1 輪的「本輪 +…」  
  [].map.call(document.querySelectorAll(".ax-vs__total"), n=>n.textContent);   // terminal：仍是第 1 輪的增量  
  h.remove();  
  ```
- **建議修法**：新一輪的重設迴圈（:394）就是唯一該做這件事的地方：`sides.forEach(function(s){ s.last = 0; s.stateEl.textContent = "進行中"; s.side.classList.remove("is-done"); })` 之後立刻 `refreshStandings()`，讓「本輪」在未揭曉時是空的、terminal 的主數字顯示「—」或「待揭曉」（`refreshStandings` 已會在 `s.last` 為 0 時把 deltaEl 寫成空字串，所以只差歸零與呼叫）。重設與揭曉共用 `refreshStandings` 這一個出口＝不會再有第二份計算。鎖：驗「round-spin 拍期間每席 `.ax-vs__delta` 必須為空、terminal 的 `.ax-vs__total` 不得等於上一輪的增量」。

### 45. [high / certain] 離場鉤在「子母畫面續播」時誤判棄局：對戰其實還在跑完，於是同一場被記成棄局敗＋正式勝負兩筆，贏了照樣派全額獎池
- **位置**：`prototype/src/views/vsslot.js:581`
- **為什麼是錯的**：PiP 的設計就是「換頁後遊戲繼續在子母畫面播」（game-frame.js:182-186 明文），但 2026-09-07 新加的離場鉤無條件 `forfeitEscrow()` ⇒ 一開 PiP 再用底部導覽換頁，玩家立刻吃到「已離開對戰，賭注不退還」＋一筆 `forfeit:true` 敗局，而對戰在 PiP 裡**照樣往下跑**。它跑得下去的原因有兩層：① `clearTimers()` 只清 vsslot 自己 `later()` 註冊的計時器，fgboard 的內部 `setTimeout`（fgboard.js:81/122/127）**沒有任何登記簿也沒有 stop API**，在飛的那一輪會照常完成並回呼 `d(s)`；② `later()` 的存活閘問的是 `body.contains(root)`，而 root 已被搬進掛在 `document.body` 上的 pipHost ⇒ 閘**為真**，整條輪次鏈重新接上並跑到 `finishLocal`。到那裡 `escrowSettle(payout)` 沒有任何「已了結就不得再付」的反向不變量（`escrowTake` 有冪等閘、`escrowSettle` 沒有，型態②），於是贏局照付 `wager × N`；同時 `liveStats.record` 被記第二次（棄局那筆 + 結算那筆）⇒ 流水／VIP 積分／任務／返水／`jackpot.onBet`／`HL.ledger` 全部雙計，`arenaStats` 也多一筆（贏的話生涯同時 +1 勝 +1 敗）。餘額的淨值剛好對得上（棄局不退＋贏付全額 = 正常淨額），這正是它看起來正常的原因；錯的是帳與由流水衍生的回饋。註：若是在逐輪停留（vsslot 自己的拍）那一刻換頁，鏈就真的斷了＝正確棄局 ⇒ 同一操作結果不確定，取決於離場落在哪一拍。
- **重現**：devtools：  
  ```js  
  await HL.lazyViews.load("vsslot");  
  var r = HL.state.get().arenaRooms.filter(function(x){return x.type==="vsslot";})[0];  
  HL.router.go("vsslot", r.id);  
  // 接受對戰 → 倒數歸零（此刻 escrow 已扣）→ 點外框 ⧉ 子母畫面  
  // → 在「盤面正在滾」時按底部導覽的「大廳」  
  HL.state.get().arenaStats.history[0];   // → forfeit:true 的敗局，且 toast 說賭注不退還  
  // 停在大廳看 PiP：對戰繼續跑完 10 輪、播完高潮、貼出結算卡  
  HL.state.get().arenaStats.history[0];   // → 又多一筆完整戰績（贏的話 win:true）  
  // 贏局時餘額會再 +wager*N；並比對 HL.liveStats / HL.ledger.derived() 的 bet 筆數＝2 倍  
  ```
- **建議修法**：離場鉤要先問「這一場是不是被交給 PiP 了」——`HL.gameFrame.isPipActive("vsslot:" + roomId)` 這個出口**已經存在但零消費者**（型態⑧）：真的續播就不 forfeit、不 clearTimers（了結交給 `closePip` 的 `onTeardown`，那條路已經是對的）。另外補兩道反向閘：① `escrowSettle` 在 `escrow <= 0 && pendingSettle === null` 時必須 no-op（與 `escrowTake` 的冪等對稱）；② fgboard 的 `create()` 要回傳 `stop()`（把內部 setTimeout 收進實例的登記簿），讓 `clearTimers()` 真的能停住「所有還在跑的拍」，而不只是自己那一半。`render` 的 resumeFrame 早退路徑（:566）也要重新註冊離場鉤，否則續播後回到對戰的那次掛載完全沒有鉤子。

### 46. [medium / certain] fgboard 的轉輪與落下兩拍仍硬寫：`roll` 只被真站下限當估算、`drop` 零消費者 ⇒ 節奏表不是真相
- **位置**：`prototype/src/views/fgboard.js:77`
- **為什麼是錯的**：規格 §3 明令「單一常數表放 core/battle-tempo.js，禁止 vsslot.js/fgboard.js/bounty.js 各自硬寫」，落地紀錄也標了 ✅「節拍收進 battle-tempo」。但實際只收了一半：fgboard 走表的是 clear／cascade_gap／dwell／pop，**轉輪**仍是 `(0.5 + r*0.08) * SP` 秒＋`820*SP+90` 的收尾（:77/:81），**落下**仍是 `0.38*SP` 秒＋`400*SP`（:106/:107）。對照表裡 `BEATS.drop = 400` 的消費者數是 **0**（`grep -c '"drop"'` 全 repo 除定義處為 0），`BEATS.roll = 900` 的唯一消費者是 vsslot.js:425 的 `liveRoundPad(revealTotal + T.ms("roll", sp))`——它只把 roll 當**估算值**餵給真站每輪下限。於是：改 `BEATS.roll` 畫面一動也不動（單一真相是假的），而真站每輪 ≥2500ms 的算術用的是一個**與實際轉輪不同源**的數字（真站 ultra 局實際 377ms、算術當成 540ms，每輪虛報 163ms＋每次連爆虛報 100ms 落下）。看起來正常是因為常速下 820+90=910 ≈ 900 幾乎相等，而真站下限被大幅 over-pad（1v1 fast 補 1480ms）所以 ≥2500 仍成立——錯的是讀數的可信度，不是當下的時長。
- **重現**：1) 「改表無效」：把 `BEATS.roll.ms` 改成 3000 → `node prototype/tests/run.js` 仍全綠，開一局對戰轉輪時長不變（`document.querySelector('.ax-reel__strip').style.transition` 仍是 `0.5s`）。把 `BEATS.drop.ms` 改成 5000 → 完全沒有任何效果（零消費者）。  
  2) 「估算與實際不同源」：`node -e "var T=require('./prototype/src/core/battle-tempo.js');console.log('表:',T.ms('roll',0.35,{live:true}),'實際:',(0.5+4*0.08)*1000*0.35+90)"` → `表: 540 實際: 377`
- **建議修法**：fgboard 的兩處改成問表：轉輪 `var base = T.ms("roll", SP)`，每欄 `dur = base*(1 + r*0.16)/1.32` 之類的比例由表上的單一 `roll` 推導（或在表裡加 `roll_reel_stagger`），收尾 `setTimeout` 用同一個算式的結果而不是重算一次；落下改 `T.ms("drop", SP)`（transition 與 setTimeout 共用同一個變數，別再各寫 0.38 與 400）。`liveRoundPad` 的 spent 改成**實測**（每輪進場記 `t0 = Date.now()`，在 round-score 拍算 `Date.now()-t0`），這樣真站下限不再依賴任何估算。鎖：驗「fgboard 內不得出現 `* SP` 的裸秒/毫秒算式」＋「每個 BEATS 名稱至少有一個 view 消費者」（後者可直接掃 src，順便擋掉下一個死拍）。

### 47. [medium / certain] 決勝輪蓄勢拍寫上去的「決勝輪 10/10 · 只有這一輪算分」被同一函式的一般分支立刻覆蓋掉
- **位置**：`prototype/src/views/vsslot.js:391`
- **為什麼是錯的**：`runRound` 的 final-prep 分支（:380-388）把 `roundEl` 寫成「決勝輪 10 / 10」、`leftEl` 寫成 terminal 的「只有這一輪算分」／「最後一輪」，然後 `later(runRound, prepMs)` 再進來一次；第二次進來時 `_prepped` 已為 true，於是直接走一般路徑，:391/:392 無條件把兩個節點**覆寫回**「Round 10 / 10」與「還剩 1 輪」。結果是：那兩句話只在蓄勢的 800ms（terminal 1500ms）內存在，**決勝輪真正開跑的那一刻就消失**，而 terminal 模式最關鍵的一句「只有這一輪算分」正是要在這時候陪著玩家看盤面。看起來正常的原因：`is-final-round` 的視覺（`.ax-battle__info` 轉金、席位邊框 3px，components.css:1581/1584）是加在 root 上且從不移除，所以「決勝輪」的**氛圍**留著，只有文字退回一般字樣；而「還剩 1 輪」本身是合法句子，不像壞掉。既有鎖只驗 `T.finalPrepMs(room.mode` 這個出口有被呼叫，沒有驗蓄勢拍寫的東西活到下一拍。
- **重現**：devtools：  
  ```js  
  await HL.lazyViews.load("vsslot");  
  var r = HL.state.get().arenaRooms.filter(function(x){return x.type==="vsslot";})[0];  
  r.mode = "terminal"; r.prefs = { fast: true };  
  HL.router.go("vsslot", r.id);  // 接受 → 一路看到第 10 輪  
  // 蓄勢拍中：  
  document.querySelector("[data-beat]").getAttribute("data-beat");  // "final-prep"  
  document.querySelector(".ax-battle__left").textContent;            // "只有這一輪算分"  
  // 蓄勢結束（≈560ms 後）再讀同兩行：  
  document.querySelector("[data-beat]").getAttribute("data-beat");  // "round-spin"  
  document.querySelector(".ax-battle__left").textContent;            // "還剩 1 輪"  ← 被覆蓋  
  document.querySelector(".ax-battle__info b").textContent;          // "Round 10 / 10" ← 「決勝輪」不見了  
  ```
- **建議修法**：把「這一輪叫什麼／還剩多少」收成一個純函式出口（例如 `roundLabels(rIdx, rounds, mode)` 回 `{round, left}`），final-prep 與一般路徑都呼叫它，決勝輪的字樣就不需要靠「先寫再被覆蓋」來表達；一般分支不得再直接組字串。順帶把對戰結束後（`rIdx >= rounds`）的 `leftEl` 從「還剩 1 輪」改成「對戰結束」——現在懸念/高潮兩拍期間資訊列仍寫著還剩一輪。

### 48. [low / certain] 承諾倒數→開打之間殘留唯一的裸毫秒 `Math.min(300, tick)`，而節奏表已有 `first_spin_lead` 這一拍
- **位置**：`prototype/src/views/vsslot.js:246`
- **為什麼是錯的**：battle-tempo.js:16 明令「view 只問 ms(name, sp)，禁止再在 view 裡寫裸毫秒」，而 `commitCountdown` 歸零後用 `later(phaseGame, Math.min(300, tick))` 交棒——`tick` 恆為 1000/1050（total 3000 或 2100、n=3 或 2），所以這實際上是一個寫死的 300ms：**不隨速度縮放、不受真站夾**，而且節奏表裡本來就有一拍專門負責這個交界（`first_spin_lead`「倒數 0 → 第一輪起轉」，600ms），現在變成 300（裸）+ 600（表）＝兩段串接、其中一段沒有名字。之所以沒被抓到：`games/arena/tempo-beats` 那條鎖用的是「不得出現這幾個舊字面量」（`380 * sp`／`later(phaseFound, 1500)`／`later(phaseGame, 700)`）——它認的是**特定寫法**而不是「裸毫秒」這個概念（型態⑥），所以換成 `Math.min(300, tick)` 照樣全綠。
- **重現**：`grep -n 'later(' prototype/src/views/vsslot.js` → 全檔 17 個 `later()` 呼叫中，唯一不是 `T.ms(...)`/`finalPrepMs(...)`/`stg` 的就是 :246 的 `Math.min(300, tick)`。  
  `node -e "var T=require('./prototype/src/core/battle-tempo.js');[1,0.6,0.35].forEach(function(s){var t=T.ms('commit',s,{live:false});console.log(s, '交棒拍=', Math.min(300, Math.round(t/Math.max(1,Math.round(t/1000)))));})"` → 三檔速度都是 300（不縮放）。
- **建議修法**：刪掉這個 300：倒數歸零後直接 `later(phaseGame, 0)`（或把封盤宣告的停留也命名成一拍，例如 `commit_seal`），讓「歸零 → 起轉」的全部時間都由 `first_spin_lead` 這一個名字表達。鎖改成概念式：掃 `later(` 的第二個引數，除 `T.ms(`/`T.finalPrepMs(`/`T.dwellFor(`/`stg`/`0` 以外一律紅（負向擾動＝塞任何一個裸數字進去必須被抓到）。

### 49. [low / certain] 回放是第四個節拍表面，完全不走 battleTempo：JS 700/850 與 CSS 0.6s 各寫一份
- **位置**：`prototype/src/views/arena.js:397`
- **為什麼是錯的**：逐輪回放（`replayModal`）用的是裸 `700 * (r + 1)` 逐輪推進（:397）與裸 `850` 進終局卡（:396），而條長動畫的時長寫在 CSS 裡（components.css:1833 `.ax-replay__track > i { transition: width 0.6s }`）⇒ 同一個節拍被 JS 與 CSS 各寫一份，靠 0.6 < 0.7 的巧合維持「條走完才換下一輪」。這正是 CLAUDE.md §4 點名的第四種型態（JS 與 CSS 各寫一套，只在特定速度下露出）：只要有人把回放加速（規格 §4.4 要的「重播/加速」）、或把 `round_result` 從 700 改掉而順手同步了回放，條就會追不上或提前停死；`round_result` 也剛好是 700，所以現在看起來像是「同一份真相」，其實三處各自寫著 700/700/0.6s，改任何一處都不會連動另外兩處。回放也不吃房間的速度偏好與模式（crazy/terminal 的節拍需求不同）。
- **重現**：`grep -n '700 \* (r + 1)\|laterR(showFinal, 850)' prototype/src/views/arena.js` → :397 / :396；`grep -n 'ax-replay__track > i' prototype/src/styles/components.css` → :1833 `transition: width 0.6s`。  
  把 CSS 改成 `transition: width 1.2s` 重載後開任一場回放 → 條永遠追不上下一輪（每 700ms 就被寫新寬度），但 `node prototype/tests/run.js` 仍全綠（沒有任何鎖看回放的節拍）。
- **建議修法**：回放接進節奏表：逐輪用 `HL.battleTempo.ms("round_result", sp)`、終局用 `ms("suspense"|"settle_card", sp)`，並把條的 transition 時長以 CSS 變數（`--ax-replay-step`）由 JS 餵入，比照 fgboard 的 `--ax-pop-life` 已經做對的那個形狀 ⇒ JS 與 CSS 不可能再各說一套。

### 50. [low / likely] 揭曉高亮的 CSS 進場時長 .18s 大於 ultra 下的錯開拍 140ms，高亮還沒到位就被移除
- **位置**：`prototype/src/styles/components.css:1579`
- **為什麼是錯的**：`.ax-vs__side.is-reveal` 的 `transition: transform .18s, box-shadow .18s` 是 CSS 側自己寫的一份時長，而 JS 加上／移除它的間隔是 `stg = T.ms("reveal_stagger", sp)`（vsslot.js:411/417）＝常速 400／fast 240／**ultra 140**。ultra（假站可選）下 140 < 180 ⇒ 紫框與位移在動畫走到約 78% 時就被移除，而且移除態沒有 transition（`.18s` 只寫在 `.is-reveal` 上）⇒ 直接跳回原狀：這一拍的「輪到我被揭曉」在 ultra 下幾乎看不見。看起來正常是因為常速與 fast 都大於 180ms，而 ultra 局本來就快、玩家會歸因於「太快了」而不是「這拍壞了」——典型的「只在特定速度下露出」的雙寫。
- **重現**：`node -e "var T=require('./prototype/src/core/battle-tempo.js');console.log('stg ultra=',T.ms('reveal_stagger',0.35,{live:false}),'CSS transition=180');"` → `stg ultra= 140 CSS transition=180`。  
  devtools：開一局 ultra（`r.prefs={ultra:true}`）→ 逐輪揭曉時 `getComputedStyle(document.querySelector('.ax-vs__side')).transitionDuration` → `0.18s`，而 `.is-reveal` 的存活只有 140ms（`data-beat="round-reveal"` 期間連續取樣 classList 可見）。
- **建議修法**：同一個數字只能有一個來源：JS 在建 side 時 `s.side.style.setProperty("--ax-reveal-dur", stg + "ms")`，CSS 改 `transition: transform var(--ax-reveal-dur, 180ms) ease, box-shadow var(--ax-reveal-dur, 180ms) ease`（比照 fgboard `--ax-pop-life` 的作法），並把 transition 宣告移到 `.ax-vs__side` 本身讓移除也有回程。

> 掃過但判定沒問題／無法驗證：【掃過但判定沒問題的地方】\n\n1. **phaseGame 的拍序與 data-beat 一致**：實際執行序 `round-spin → round-reveal → round-score → round-gap →（下一輪）`，`final-prep` 插在第 10 輪之前，`suspense → climax-lose → climax-win → settled` 四拍的字面順序＝執行順序（每一層的 delay 都寫在該層最後一個引數上，沒有踩到 §10.2「巢狀回呼字面序 ≠ 執行序」那個坑）。`escrowSettle` 確實排在 `climax_win` 之後、`setBeat(\"settled\")` 與結算卡之前 ⇒ 規格「餘額不得比動畫先跳」成立，且 `refreshChrome()` 會同步刷 `#ax-duel-balance`（app-shell.js:728），對戰內的餘額不是死值。\n\n2. **彈分不會被清場硬切**：popup 建立於 `dwell` 之後，容器最早在 `dwell + hold(≥700) + clear` 才被 `drawStatic` 清掉，而 `--ax-pop-life` 由 JS 餵給 CSS keyframes（fgboard.js:52 ↔ components.css:1798）＝JS/CSS 單一真相，這一處做對了（唯一殘留是 CSS 的 700ms fallback 與 `hold` 裡恆不生效的 `650 * SP`，皆無實害）。\n\n3. **背景分頁的 ≥1s 夾不會造成拍序反轉**：Chrome 的背景節流是把到期時間對齊到 1s 桶（單調函數的向上取整仍單調），加上同桶依建立順序觸發，而 vsslot 的每一條後續拍都由較晚建立或較大延遲排出 ⇒ 我沒有找到任何會反轉的組合。可觀察到的退化只有「錯開拍被壓成同一 tick」（4 席 fast 下 0/240/480/720 全落同一桶 ⇒ `reveal_stagger` 與 `spin_stagger` 的掃視順序在背景消失）與整場變慢，玩家不在看，不列為缺陷。`commitCountdown` 的 tick 恆 ≈1000ms，背景下只會走得略慢，不會少數幾秒。\n\n4. **真站每輪 ≥2500ms 的結果面是成立的**（1v1 fast 實測估 ≈3.1s／輪，甚至 over-pad），只是它的算術用了與實際不同源的估算值——已併入 finding「fgboard 的 roll/drop 仍硬寫」，沒有另立一條。\n\n5. **`later()` 的存活閘、`runRound` 的 `body.contains(sides[0].boardEl)` 前置、fgboard `cascade.step()` 的存活閘**在「非 PiP」的離場路徑上都會正確終止整場（`animateRoll` 的收尾 setTimeout 雖無閘，但它下一步就撞到 cascade 的閘、`cb` 不會被呼叫）⇒ 只有 PiP 續播那一條路徑會續跑（已報）。\n\n6. **其他 PK 表面的節拍**：`instant-duel.js` 自帶 `YOU_AT_MS/REVEAL_GAP_MS/VERDICT_GAP_MS` 純函式（:42-47）並有 `games/dice-duel/staged-reveal` 鎖，是有意識的獨立真相、拍序正確，我不視為 battleTempo 的違規；`bounty.js` 有 6 處裸毫秒（650/1100/1500，:166/:233/:265/:279），規格 §3 的確寫了「禁止 bounty.js 硬寫」，但那些拍（翻牌收尾／雷盤重繪）在拍表裡沒有對應列，硬套會是誤配 ⇒ 只在此註記，不列 finding。順帶記一筆：`game-frame.js` 的 ⚙ 遊戲設定裡「極速模式（全遊戲生效）」被 instant.js/table.js/picks/4 支 slot 消費，但整個競技場（vsslot/fgboard）完全不讀 `HL.gset.get(\"fast\")` ⇒ 在對戰視窗裡開極速模式零效果；我把它併進 finding①的修法（速度應收成單一出口）而沒有另立，因為修的是同一行 `speed()`。\n\n7. **零消費者的容器（型態⑧）**：`BEATS.drop`（已報）、`HL.gameFrame.isPipActive`（已報）、`HL.battleMode.tieAtTop`（只有測項在用，UI 沒有把「平手→公平抽籤」顯示出來——但那屬結算卡顯示，且 spec §4.4「平手裁決可見化」已標 ⬜ 仍待做，故不重報）。\n\n【無法驗證的地方】\n- 所有「畫面到底有沒有在動」的部分（rAF 不觸發、CSS transition 在 preview 隱藏時不推進、screenshot 逾時）＝ finding①⑨的**視覺**後果、以及 finding②的實際轉輪觀感，都只能在前景 preview 用秒錶／錄影確認；我報的是可從程式與純算術坐實的部分。\n- 真站每輪實測長度（需要前景跑完 10 輪計時）與真站 ultra 是否另有上游把 prefs 過濾掉（我只在 arena.js/mock-data.js/vsslot.js 三處找過 prefs 的來源，沒有找到任何 `isLive()` 閘）。\n- 會員（後端）模式下 `HL.api.playBattle` 的回應延遲會如何與 `first_spin_lead` 疊加——RPC 未部署，我只能讀到 `.then/.catch` 兩路都走同一拍（:549/:550，這點是對的）。

## 角度⑥ 會員（後端）模式路徑：api.js playBattle / recordBattle / loadHistory ↔ supabase-phase7.sql ↔ arena.js statRecord/battleRows/replayModal ↔ main.js hydrateThenStart

### 51. [blocker / certain] playBattle 是全 api.js 唯一繞過 rpc() 的呼叫 ⇒ 沒帶 p_site，真站對戰讀寫的是 demo 經濟列（等於在真站印錢）
- **位置**：`prototype/src/core/api.js:65`
- **為什麼是錯的**：phase7 的整套站別分離靠一個機制：`rpc()`（api.js:81）對每一次呼叫自動注入 `p_site = HL.site.mode()`。但 `playBattle` 直接呼 `HL.sb.rpc("play_battle", {...})`，參數只有 p_wager/p_players/p_mode/p_rounds/p_roster/p_game——**沒有 p_site**。而 SQL 端 `play_battle(..., p_site text default 'demo')`（phase7.sql:113）有預設值 ⇒ 呼叫**不會報錯**，伺服器安靜地落到 'demo'。後果全部在真站（HL.site.mode()==='live'）發生：① `ensure_econ(uid,'demo')` + `select balance ... where mode='demo'` ⇒ 餘額檢查與扣款打在 demo 列（demo 種子 28560），真站「餘額 0 要先儲值」的前提被繞過；② 回傳的 `R.balance` 是 **demo 列的餘額**，而 vsslot.js:532 直接 `HL.state.set({ balance: +R.balance })` ⇒ 真站畫面餘額被寫成 demo 餘額＝憑空生出錢；③ `ops_log_srv(..., v_site='demo')` ⇒ 真站營運帳本（`ops_summary` 只算 mode='live'）完全漏記所有對戰 bet/win，GGR/RTP 健檢失真；④ `battle_history` 這一列 mode 落 'demo' ⇒ 真站戰績永遠混進假站。**為什麼看起來正常**：demo 站（預設站）下 p_site 缺省值恰好等於正確值，所以開發與測試路徑 100% 正常；只有切到真站才錯，而真站又是「乾淨起帳」路徑，餘額突然變成 28560 會被誤讀成 hydrate 問題。同一形狀的第二個實例在同檔 `rpcChicken`（api.js:115）——小雞過馬路的三支 RPC 也繞過注入，chicken_start/step/cashout（phase7.sql:332/354/381）同樣有 p_site 預設 'demo'。
- **重現**：1) 部署 phase7、以會員登入。2) devtools 先裝探針：`var o=HL.sb.rpc.bind(HL.sb); HL.sb.rpc=function(n,a){console.log("RPC",n,JSON.stringify(a));return o(n,a);};`。3) 切真站：`localStorage.setItem("HL_SITE_MODE","live"); location.reload();`（重新裝探針）。4) 進競技場打一場 Slots Battle。5) console 對照：`load_econ` 那筆印出 `{"p_site":"live"}`，`play_battle` 那筆**沒有 p_site 鍵**。6) SQL 端 `select mode,balance from member_econ where uid=auth.uid();` ⇒ 變動發生在 mode='demo' 那一列，'live' 列未動；`select mode,count(*) from battle_history group by 1;` ⇒ 真站打的那場記在 'demo'。純靜態複核（不需後端）：`grep -n 'HL.sb.rpc(' prototype/src/core/api.js` ⇒ 三處，只有第 82 行（rpc 內部）有注入。
- **建議修法**：把「注入站別」抽成單一純函式出口（例如 `function withSite(args){ args=args||{}; if (HL.site&&HL.site.mode&&args.p_site==null) args.p_site=HL.site.mode(); return args; }`），並讓 `rpc()`／`rpcChicken()`／`playBattle()` 三者一律經它；最乾淨的是讓 `playBattle` 直接改成 `rpc("play_battle", {...})`（它的 null 語意與現行 catch 完全一致），`rpcChicken` 則保留自己的錯誤分類但參數先過 withSite。單一真相＝「api.js 內除了 withSite 的唯一消費者之外，不得出現任何直接 `HL.sb.rpc(` 呼叫」，並立成常駐鎖（正向：三支都帶 p_site；負向：把 playBattle 改回直呼 HL.sb.rpc 必須讓鎖變紅）。

### 52. [blocker / certain] 會員模式的降級結算（playBattle 回 null → finishLocal）動的是永不持久的本機餘額 ⇒ 輸贏 F5 蒸發，但 recordBattle 的戰績列留著
- **位置**：`prototype/src/core/persistence.js:24`
- **為什麼是錯的**：這是「playBattle 失敗的 fallback 能不能把玩家帶回可玩狀態」的真正答案：**畫面上可以，經濟上不行**。phase4 起 `persistence.js` 刻意不再寫回 balance / arena_stats（第 24 行註記「伺服器擁有」），而 phase7 又把經濟搬到 `member_econ` 且**沒有開任何 insert/update policy 給客端**（phase7.sql 的 A 段明寫「只有 security definer 函式能寫」）⇒ 會員模式下，客端對餘額的任何變動都沒有出口。於是 `playBattle` 失敗時 vsslot 走 `finishLocal()`（vsslot.js:518），用本機 `HL.state` 扣加餘額、更新 arenaStats，並經 `statRecord`→`recordBattle`（arena.js:252）把這一場**寫進 battle_history**。下一次 F5，`hydrateThenStart`（main.js:142-148）用伺服器的 balance 與 arena_stats 覆蓋 ⇒ **這一場的錢和勝敗全部消失，只剩戰績清單裡那一列**。玩家看到的是「戰績有這場、勝率/累積收益不含它、餘額也沒動」。而且 `loadProfile`（api.js:25）在 load_econ 未部署時退回 `profiles.balance`，那個欄位客端也不再寫 ⇒ 每次 F5 餘額都回到註冊時的定值。**為什麼看起來正常**：整場對戰、結算卡、餘額數字、戰績列全部即時正確，錯誤只在下一次重整才顯現，而重整又很容易被歸因成「Demo 資料本來就不留」——歷史清單的標籤（arena.js:321「Demo · 紀錄存於本次連線，重整即清空」）剛好幫這個 bug 撐了一句錯誤的解釋。
- **重現**：1) 會員登入（backend 開），確保 `play_battle` RPC 不可用（未部署 phase4~7，或 devtools 先 stub：`HL.api.playBattle=function(){return Promise.resolve(null);}`）。2) 記下當前餘額 B0。3) 打一場 Slots Battle 到結算卡，記下結算後餘額 B1（B1≠B0）。4) 打開「戰績與回放」，確認多了一列。5) F5 重整。6) 觀察：餘額回到 B0、統計磚（勝率/累積收益/場次）不含這一場，但戰績清單裡那一列還在（來自 battle_history）。輔證：`console.log(HL.persistence)`＋看 network 面板整場只有 `profiles.update {currency,wallet}`，沒有任何餘額寫回。
- **建議修法**：單一真相＝「會員模式下餘額只能由伺服器 RPC 改」。因此降級路徑不得假裝結算：`playBattle` 回 null 時，vsslot 應走一條**據實的不可用路徑**——退還 escrow（`escrowSettle(room.wager)`）、明確 toast「對戰伺服器不可用，本場未進行」、不呼叫 statRecord/recordBattle；或者提供一支能寫 member_econ 的降級結算 RPC 再結。另外在 state 層補一道守門：memberMode 下偵測到非 RPC 來源的 balance 變動就 console.warn + 記 ledger，讓這類「假結算」不能再靜默存在（同一道守門會一併抓出 bonus/faucet/rakeback/JP 在會員模式的相同蒸發問題）。

### 53. [high / certain / 已知] loadHistory 只 select payload，伺服器 payload 缺 9 個前端讀的欄位、全 repo 無 normalize ⇒ 每列「敗 · −NT$ NaN」、回放 10 輪塌成 1 輪、席位標籤空白
- **位置**：`prototype/src/core/api.js:46`
- **為什麼是錯的**：（intel/arena-battle-spec-2026-08-21.md §5 #1/#2 已記載為「仍待做」，此處補完整逐欄位對照＋指出單一出口。）伺服器 payload 的逐字形狀在 phase7.sql:164：`{seats:[{idx,total,rounds}], winnerIdx, roster, game, players, mode}`。前端把它**原樣**當成客端 rec 用（main.js:145 `stats.history = hist`），而客端 rec 的形狀由 vsslot.js:437 `makeRec` 定義，兩者只有 game/mode/players 三個鍵重疊。逐欄位差異：
① `rec.win`（arena.js:312 勝/敗、372 resultBlock）— payload 無（伺服器把勝負放在 `winnerIdx===0`；表上 `win` 欄有值但沒被 select）⇒ 永遠 falsy ⇒ **每列都顯示「敗」**，回放終局卡也一律「你輸了」。
② `rec.net`（arena.js:313、372）— payload 無（表上 `net` 欄未 select）⇒ `Math.abs(undefined)`→`HL.dom.money` 的 `Math.round(NaN).toLocaleString()`（dom.js:188）⇒ **「−NT$ NaN」**，這就是船長回報的字串。
③ `rec.wager`（battleRows arena.js:411）— payload 無（表欄未 select）⇒ 報表押注欄全 0。
④ `rec.ts`（battleRows 410）— payload 無（表上 ts 欄未 select）⇒ 報表時間全部 epoch 0。
⑤ `rec.vs`（arena.js:308、364）— payload 無（表欄未 select）⇒ 退化成 "1v1"，1v1v1 / 1v1v1v1 的局全部標錯人數。
⑥ `rec.myTotal` / `rec.totals`（arena.js:298、334）— payload 只有 `seats[0].total`，沒有 totals 陣列 ⇒ `myT=0`（列上寫「你 NT$ 0」），且 `maxv = Math.max(1, ...(rec.totals||[1]))` = **1** ⇒ 回放條長歸一分母錯，normal 局所有條 100%、crazy 因 barFrac 反向也全滿。
⑦ `rec.rounds`（arena.js:296、331；客端是「每輪 × 各席位」的二維）— payload 把輪次放在 **每個席位底下**（`seats[i].rounds`，需轉置）⇒ `rec.rounds` undefined ⇒ `rounds=[(rec.totals||[0])]` = `[[0]]` ⇒ **10 輪回放塌成 1 輪、單一席位、值 0**。
⑧ `rec.seats[].name/.av`（arena.js:307-309、340-343）— payload 的 seats 只有 idx/total/rounds，名字/頭像在 `payload.roster` ⇒ 席位標籤全空、對手名字串是 `"、"`。
⑨ `rec.seats[].me`（arena.js:293、340、349、390）— payload 無 ⇒ `opps = seats.filter(x=>!x.me)` **把你自己也算成對手**（頭像變 👥、對手數 +1），回放裡你那條被畫成 `.opp`。
⑩ `rec.winnerName`（arena.js:372、415）— payload 只有 winnerIdx ⇒ 敗局終局卡顯示「你輸了」而非「優勝：<名字>」。
唯一對得上的是 `rec.mode`（payload.mode = v_gmode 遊戲模式）——注意**表上的 `mode` 欄存的是站別 v_site**，所以修法不可以直接把欄位 mode 拿來補（見另一條 finding）。**為什麼看起來正常**：Demo 模式與「phase4 未部署」的會員模式都走客端 `recordBattle`（payload 就是客端 rec）⇒ 渲染完全正確；只有伺服器真的結算過的列才壞，而壞掉的樣子（一片「敗」）在賭博 App 裡很像「就是輸了」。
- **重現**：不需後端。存成 t.js 後 `node t.js`：  
  ```js  
  var BM=require("D:/機動專案/House-Light新平台/prototype/src/core/battle-mode.js");  
  function money(n){return "NT$ "+Math.round(n).toLocaleString("en-US");}  
  // phase7.sql:164 的逐字 payload 形狀  
  var rec={seats:[{idx:0,total:5000,rounds:[500,1000,1500,2000,2500,3000,3500,4000,4500,5000]},{idx:1,total:3000,rounds:[300,600,900,1200,1500,1800,2100,2400,2700,3000]}],winnerIdx:0,roster:[{name:"你",av:"👑"},{name:"Kai",av:"🐯"}],game:"暗影儀式",players:2,mode:"terminal"};  
  var seats=rec.seats||[],opps=seats.filter(x=>!x.me);  
  var myT=rec.myTotal!=null?rec.myTotal:((rec.totals||[0])[0]);  
  console.log("列:",(rec.vs||"1v1"),"vs",JSON.stringify(opps.map(o=>o.name).join("、")),"| 你",money(myT),"|",rec.win?"勝":"敗","|",(rec.net>=0?"+":"-")+money(Math.abs(rec.net)));  
  var rounds=(rec.rounds&&rec.rounds.length)?rec.rounds:[(rec.totals||[0])];  
  console.log("回放輪數=",rounds.length,JSON.stringify(rounds),"| maxv=",Math.max.apply(null,[1].concat(rec.totals||[1])),"| 席位標籤=",JSON.stringify(seats.map(p=>[p.av,p.name])));  
  ```  
  實測輸出：`列: 1v1 vs "、" | 你 NT$ 0 | 敗 | -NT$ NaN` / `回放輪數= 1 [[0]] | maxv= 1 | 席位標籤= [[null,null],[null,null]]`——與船長回報逐字相符。
- **建議修法**：**單一出口＝資料入口那一層**，不是四個表面。① `loadHistory` 的 select 補回表上現成欄位：`.select("ts,vs,wager,net,win,payload")`（**不要**把欄位 `mode`拉進來，它是站別）。② 在 arena.js（rec 形狀的擁有者，且開站即載）新增一支冪等純函式 `HL.arenaStats.fromRow(row)`：payload 已是客端形狀（`payload.seats[0].name != null`）就原樣回傳；否則由 `roster[i]` 補 `seats[i].name/av`、`me = (i===0)`、`rounds` 由 `seats[].rounds` **轉置**成每輪一列、`totals = seats.map(s=>s.total)`、`myTotal = seats[0].total`、`winnerName = roster[winnerIdx].name`、`win = (winnerIdx===0)`、`net/wager/vs/ts` 取自欄位、`mode` 取 `payload.mode`。③ `loadHistory` 的 `.map()` 內就呼它（runtime 才呼，不受 core→views 載入序限制），main.js:145 維持 `stats.history = hist` 不動 ⇒ historyModal / replayModal / battleRows（報表）/ 未來第五個表面全部一次修好。④ 立鎖：餵一份 phase7 逐字 payload 進 `fromRow`，斷言 10 個欄位齊備且 `rounds.length===10`、`seats[0].me===true`；負向擾動＝拿掉轉置或拿掉 select 欄位都必須變紅。

### 54. [high / certain] playBattle 沒有 timeout，而承諾倒數已經扣過款 ⇒ 連線卡住時玩家永遠停在「連線對戰伺服器…」，唯一出路是棄局賠掉賭注
- **位置**：`prototype/src/views/vsslot.js:542`
- **為什麼是錯的**：扣款點與伺服器往返的先後被寫反了：`commitCountdown` 歸零時 `escrowTake(room.wager)`（vsslot.js:246 附近）先把餘額扣掉，接著 `phaseGame` 才在第 543 行呼 `HL.api.playBattle(...)`，並且**只有 then/catch 兩條路，沒有第三條 timeout 路**。`api.js:63-72` 的 promise 來自 supabase-js 的 fetch，預設**永不逾時**；行動網路的半開連線（切換 Wi-Fi/基地台、captive portal）會讓 promise 既不 resolve 也不 reject ⇒ `later(runRound, ...)` 永遠不被呼叫，畫面就停在第 542 行 append 的「連線對戰伺服器…」，10 個盤面靜止不動。此時玩家錢已扣、對戰未開始，畫面上唯一的出口是「‹ 返回競技場」→ `leaveBattle()` → `forfeitEscrow()` ⇒ **賭注不退還並記一筆真實的敗局**。也就是說「網路卡住」在帳上等同「逃單」。**為什麼看起來正常**：失敗（res.error / 例外）那兩條路是好的（回 null → finishLocal，零回歸），所以「fallback 有沒有做」的檢查會通過；只有「不失敗也不成功」這第三態沒人處理，而它不會出現在任何本機測試裡。（spec §5 #22 只記到「兩條失敗路徑玩家端完全靜默」，沒有記這條懸掛態。）
- **重現**：devtools（Demo 或會員皆可，重點是走 memberMode 分支）：  
  1) 先讓 memberMode 為真並讓 playBattle 懸掛：`HL.api.playBattle=function(){return new Promise(function(){});};`（若在 Demo，把 vsslot 的 memberMode 條件滿足或直接改測 api 層行為）。  
  2) 進競技場 → 加入任一 Slots Battle 房 → 接受 → 讓 3-2-1 倒數走完。  
  3) 觀察：餘額立刻 −wager（`HL.state.get().balance`）、畫面出現「連線對戰伺服器…」。  
  4) 等 60 秒：`document.querySelector('.ax-duel').getAttribute('data-beat')` 停在 `commit`，`document.querySelector('.ax-vs__result').textContent` 仍是「連線對戰伺服器…」，Round 標籤還在 1/10，永不推進。  
  5) 按「‹ 返回競技場」：toast「已棄局，賭注 X 不退還」，`HL.arenaStats.summary()` 的 losses/matches 各 +1 ⇒ 一場沒打的對戰被記成敗局。
- **建議修法**：把「向伺服器要結果」的逾時做成單一出口：在 api.js 加 `function withTimeout(p, ms, fallback)`（`Promise.race` + `setTimeout` 回 fallback），`playBattle` 包一層（例如 8000ms → 回 null），所有需要「拿不到就降級」的 RPC 共用同一支。同時把扣款與往返的順序對齊語意：要嘛在 playBattle 回應（或逾時）之後才 `escrowTake`，要嘛在逾時分支明確 `escrowSettle(room.wager)` 退還並 toast「對戰伺服器沒有回應，本場取消、賭注已退回」——不得讓「網路懸掛」落進棄局那條分支。立鎖：斷言 api.js 的 playBattle 路徑存在 timeout/Promise.race，且 vsslot 的 memberMode 分支有第三條（逾時）出口。

### 55. [high / certain] 會員模式對戰中離場：伺服器已經記過一列並結算過，客端棄局又 recordBattle 插第二列 ⇒ 同一場兩列、「賭注不退還」的提示與伺服器結算相反
- **位置**：`prototype/src/views/vsslot.js:110`
- **為什麼是錯的**：會員模式的時序是「開打前就把整場結果向伺服器要完」：`playBattle` 一成功，phase7.sql:162 已經 `insert into battle_history`、`update member_econ`（餘額、勝敗、連勝、profit 全部落地）。客端接下來只是**播動畫**。此時若玩家用底部導覽/側欄換頁、關掉 PiP、或按 view 內的返回，`forfeitEscrow()`（vsslot.js:98-118）會走「棄局」語意：不退 escrow、toast「賭注不退還」、並呼 `HL.arenaStats.record({... win:false, net:-lost, forfeit:true})`（第 110 行）→ arena.js:252 `HL.api.recordBattle(rec)` → **在同一場對戰上再 insert 一列客端 payload**。後果：① 若伺服器判你贏，你看到的是「已棄局，賭注不退還」，但伺服器餘額已 `+wager×(N−1)` ⇒ F5 後錢突然多出來，玩家眼中是「系統亂給錢」；② `battle_history` 同一場兩列（伺服器一列 + 客端一列，內容互相矛盾），而 `arena_stats.matches` 只被伺服器加過一次 ⇒ **戰績清單的列數永久多於場次數**；③ 那一列客端 payload 渲染是完全正常的（有 win/net/seats.name）⇒ 玩家看到一場自己沒輸過的敗局。**為什麼看起來正常**：Demo 模式沒有伺服器那一列，棄局記帳完全自洽；而在會員模式，兩份紀錄各自看起來都對，只有把列數和 matches 對起來數才會發現。
- **重現**：1) 部署 phase4+（play_battle 可用）、會員登入。2) `select count(*) from battle_history where user_id=auth.uid();` 記為 C0，`HL.arenaStats.summary().matches` 記為 M0。3) 進競技場加入一場 Slots Battle，接受、倒數歸零，等畫面出現盤面（此時 playBattle 已回、SRV 已設；可用 `HL.state.get().balance` 確認已 −wager）。4) **不要等結算**：直接按底部導覽切到「大廳」。5) 觀察 toast「已離開對戰，賭注 X 不退還」。6) `select count(*) ...` ⇒ C0+2（伺服器一列 + 客端棄局一列）；F5 後 `HL.arenaStats.summary().matches` ⇒ M0+1，但「戰績與回放」清單多了 2 列。7) 若該場伺服器判你贏，F5 後餘額比離場時多 `wager×N`。
- **建議修法**：棄局語意必須知道「這一場是否已經被權威結算過」。在 vsslot 加一個純判定出口 `settledByServer()`（＝`!!SRV`），`forfeitEscrow()` 開頭比照現有 `pendingSettle` 的處理：`if (SRV) { /* 勝負已由伺服器決定 */ escrowSettle(SRV.win ? room.wager + (+SRV.net) : 0); HL.state.set({balance:+SRV.balance}); return false; }`——據實了結、不記棄局、不呼 recordBattle。另外在 arena.js `statRecord` 加一道防重：會員模式下若這一場已由伺服器 insert（rec 帶 `srv:true` 旗標）就只更新本機 state、不呼 `recordBattle`。立鎖：以假的 SRV 物件驅動 forfeitEscrow，斷言（a）不呼 recordBattle（b）餘額變動等於伺服器 net（c）losses 不增；負向擾動＝把 SRV 判斷拿掉必須變紅。

### 56. [high / certain] 離場鉤與「PiP 續播」互相抵銷：開子母畫面後用底部導覽換頁＝賭注被沒收且 PiP 裡的對戰凍結，而 game-frame 明文寫著 PiP 續播是設計
- **位置**：`prototype/src/views/vsslot.js:579`
- **為什麼是錯的**：兩個各自正確的修法互斥了。`game-frame.js:182-183` 的註記逐字寫著設計意圖：「玩家『開 PiP → 用底部導覽回大廳（**PiP 續播＝設計**）→ 按 PiP 的 ×』」。但 2026-08-21 立、2026-09-07 大修的離場鉤（vsslot.js:579）是**一次性、在真換頁時無條件開火**（app-shell.js:718 `runExit("view-left")`），鉤子內容是 `clearTimers() + forfeitEscrow()`。於是「開 PiP → 底部導覽回大廳」這條被明文承認的路徑會：① `clearTimers()` 清掉 vsslot 全部計時器 ⇒ PiP 視窗裡的對戰**當場凍結**（盤面停住、Round 不再推進、永遠不會結算）；② `forfeitEscrow()` 沒收已預扣的賭注並記一筆敗局，toast 說「已離開對戰，賭注不退還」——但玩家眼前的 PiP 視窗還亮著那場對戰。接著若玩家點 PiP 的 ×，`closePip` 走 `onTeardown` → `forfeitEscrow()` 已無 escrow ⇒ no-op，PiP 只是消失。更糟的是回頭：再 `HL.router.go("vsslot", id)` 時 `render()` 第 568 行 `resumeFrame` 命中就**直接 return**，跳過第 579 行的 onExit 註冊、也跳過 `phaseSearching()` ⇒ 拿回一個已死的盤面、沒有離場鉤、escrow 已為 0，玩家沒有任何前進出口（沒有結算卡就沒有「再來一場」）。**為什麼看起來正常**：不開 PiP 的主流程完全正確（這正是 exit-hook 那條鎖在守的東西）；PiP 這條路徑既沒有鎖、也不會噴錯，凍結的畫面很容易被當成「動畫卡住」。
- **重現**：1) 進競技場加入一場 Slots Battle，接受、倒數歸零，確認開始跑輪（`document.querySelector('.ax-duel').dataset.beat` 會在 round-* 之間變）。2) 點外框工具列的 ⧉（子母畫面）。3) 按底部導覽切到「大廳」。4) 觀察：toast「已離開對戰，賭注 X 不退還」；`HL.state.get().balance` 少了 wager；PiP 視窗仍在，但 `document.querySelector('.ax-pip .ax-duel').dataset.beat` **從此不再變化**、Round 標籤停在原輪次（等 30 秒再看一次即可確認凍結）。5) `HL.arenaStats.summary().losses` +1（一場沒打完的敗局）。6) 再 `HL.router.go("vsslot", <該房 id>)`：拿回同一個凍結盤面，且 `HL.shell.runExit("probe")` 回傳 0（證明這次掛載沒有註冊任何離場鉤）。
- **建議修法**：離場鉤要能回答「這個 view 真的離場了嗎，還是只是搬進 PiP？」——這個問題現在沒有單一出口。建議在 `HL.gameFrame` 暴露純判定 `isInPip(key)`（讀既有的 `pip.active && pip.key === key`），vsslot 的離場鉤第一行改為 `if (HL.gameFrame && HL.gameFrame.isInPip("vsslot:" + roomId)) return;`（PiP 續播不是離場 ⇒ 不清計時器、不沒收），並在 `onExit` 回傳一個「保留」語意讓 app-shell 把該鉤子**留在清單裡**（或由 vsslot 在 PiP 關閉/還原時自行重新註冊），否則一次性清空會讓後續真正的離場失去鉤子。同時 `render()` 的 `resumeFrame` 早退路徑（第 568 行）也必須註冊離場鉤——把 onExit 註冊移到 `resumeFrame` 之前。立鎖：斷言（a）vsslot 的離場鉤內有 PiP 判定且早退（b）onExit 註冊出現在 resumeFrame 早退之前；負向擾動＝把 PiP 判定拿掉、或把 onExit 移回 resumeFrame 之後，都必須變紅。

### 57. [medium / certain] 排名規則的第五個表面寫在 SQL 裡，而且平手處理與客端相反：伺服器恆判席位 0（你）勝——客端剛修好的 tieRoll 在會員模式是死碼
- **位置**：`docs/supabase-phase7.sql:146`
- **為什麼是錯的**：`core/battle-mode.js` 的檔頭立了規矩：「任何要回答『誰領先／名次怎麼排』的表面一律呼叫它」。但會員模式下**決定勝負的那個表面在 postgres 裡**（phase7.sql:144-147），它把三個模式的判準用 SQL 自己寫了一份：`v_metric := case when v_gmode='terminal' then v_lastDelta else v_run end`、勝者迴圈 `(crazy and < ) or (not crazy and > )`。兩個後果：① **平手沒有裁決**——比較子是嚴格不等，平手時 `v_winner` 維持初始值 1，也就是**永遠判你（席位 0）贏**。這正是 2026-08-21 在客端修掉的那個缺陷（鎖 `games/arena/tie-break-and-fairness` 的標題逐字寫著「平手不得由席位順序決定（原本一律判索引 0＝你贏）」），但那條鎖只 require `battle-mode.js` 並 grep `views/vsslot.js`，**完全沒有碰 SQL** ⇒ 不變量只有一個方向：客端拒絕了席位偏差，權威端沒有。會員模式下 `CORE.resolve` 的 tieRoll（vsslot.js:507-508）根本不會被呼到（`finish()` 走 SRV 分支，第 518 行就 return 了 finishLocal），是死碼。② 若哪天 `SPECS` 加第四個模式（battle-mode.js:30 的資料驅動設計就是為此），SQL 會把它靜默當 normal 排名，客端顯示卻按新規則 ⇒ 顯示與結果再次互相矛盾，且**所有既有測項全綠**（沒人換過軸——同 CLAUDE.md §4 第 ⑤ 型）。實際發生率：伺服器每輪分數是 `floor(random()*1500)+120`（≥120，不會是 0），1v1 末輪增量撞值約 1/1500 ⇒ 每場約 0.07%，比客端的 1.72% 低很多，但方向性偏差（永遠偏向你）在真金模式是不可接受的莊家/玩家不對稱。
- **重現**：純 SQL 可證（不需前端）：在 Supabase SQL Editor 跑  
  ```sql  
  -- 模擬 phase7.sql:144-147 的勝者迴圈，餵一組平手 metric  
  with m as (select array[500::numeric,500::numeric] as v, 'terminal' as g)  
  select (select case when true then 1 end) as v_winner_init,  
         (select bool_and(not ((g='crazy' and v[i]<v[1]) or (g<>'crazy' and v[i]>v[1]))) from m, generate_series(2,2) i) as never_updated  
  from m;  
  ```  
  `never_updated = true` ⇒ v_winner 永遠停在 1 ⇒ `v_win := (v_winner = 1)` 為真＝你贏。前端側複核死碼：devtools 打一場會員模式對戰，在 `CORE.resolve` 上插 `console.trace`（或 `HL.fair.floatOr` 上插樁），確認 `HL.fair.floatOr("vsslot")`（vsslot.js:507）在 SRV 存在時**一次都沒被呼叫**。靜態複核鎖的單方向性：`grep -n 'phase7\|\.sql' prototype/tests/checks-games.js` ⇒ 零命中。
- **建議修法**：讓 SQL 端與 `battle-mode.js` 對齊，並把「對齊」變成可驗證的：① phase7 的 play_battle 收一個 `p_tie_roll numeric`（前端從 `HL.fair.floatOr("vsslot")` 取、可事後重算），平手組以它輪轉決定勝者，並在回傳 payload 加 `tieRoll` 與 `tieAtTop` 供結算卡據實顯示「平手 → 公平抽籤」。② 把模式判準從 SQL 硬寫改成資料驅動：SQL 讀一張 `battle_modes(id, metric, lower_better)` 小表（或至少集中成一支 `battle_metric(p_mode, p_total, p_last)` 函式），並新增一條常駐鎖，用 `battle-mode.js` 的 `SPECS` 逐 mode 去 grep/比對 SQL（或比對那張表的 seed）——**任何一邊新增模式而另一邊沒跟上就必須變紅**。③ 同時擴充 `games/arena/tie-break-and-fairness`：加斷言「play_battle 的勝者判定必須含 tie 裁決」，負向擾動＝把 SQL 改回嚴格不等要能被抓到。

### 58. [medium / certain] 戰績的站別維度既寫錯又沒讀：recordBattle 把「遊戲模式」寫進 phase7 已改成站別的 mode 欄，而 loadHistory 完全不依站別過濾
- **位置**：`prototype/src/core/api.js:56`
- **為什麼是錯的**：phase7 把 `battle_history.mode` 重新定義成**站別**（`add column if not exists mode text not null default 'demo'`，phase7.sql:50；play_battle 寫入 `v_site`，phase7.sql:163）。但客端 `recordBattle` 第 56 行寫的是 `mode: rec.mode`＝**遊戲模式**（'normal'/'crazy'/'terminal'）。於是同一個欄位在同一張表裡有兩種語意，而客端寫的那些列既不是 'demo' 也不是 'live' ⇒ 落在站別維度之外，任何按站別過濾的查詢都看不到它們。反方向也壞：`loadHistory`（第 46 行）**沒有任何 `.eq("mode", ...)`** ⇒ 真站與假站的戰績混在同一份清單，直接違反 CLAUDE.md §4 對 phase7 的承諾「戰績/全球獎進度/大獎牆真分離」（餘額與 arena_stats 已經真分離，只有 history 沒有）。最危險的是**照現有規格修反而會復活 P0**：intel/arena-battle-spec-2026-08-21.md §6 的修法表寫「loadHistory 的 select 補 `vs,mode,wager,net,win`」——真的照做的話，伺服器列的 `rec.mode` 會變成 'demo'/'live'，`HL.battleMode.spec('live')` 靜默退化 normal（battle-mode.js:37 的零回歸設計）⇒ **crazy/terminal 的回放又回到「總分越高越好」**，也就是 battle-mode.js 這個檔當初被建立起來要殺的那個顯示 BUG，而且不會有任何測項變紅。（spec 第 212 行有一句 ⚠️ 提醒讀取端別搞混，但沒有記到客端寫入端也在污染這個欄位。）
- **重現**：1) 部署 phase7、會員登入。2) 在 Demo 站（預設）讓一場對戰走**客端**結算路徑（devtools `HL.api.playBattle=function(){return Promise.resolve(null);}` 後打一場），再讓一場走伺服器路徑（移除 stub 再打一場）。3) `select id, mode, win, net from battle_history where user_id=auth.uid() order by ts desc limit 5;` ⇒ 會同時看到 `mode='normal'`（客端插的）與 `mode='demo'`（伺服器插的）。4) 切真站 `localStorage.setItem("HL_SITE_MODE","live"); location.reload();` 再打一場，然後打開「戰績與回放」⇒ 清單裡同時出現真站與假站的場次（`HL.state.get().arenaStats.history.length` 等於兩站總和）。5) 復活 P0 的驗證：把 select 改成含欄位 mode（`HL.sb.from("battle_history").select("mode,payload")...`）後重整，打開一場 crazy 局的回放 ⇒ 標題寫「標準模式（最高總分勝）」、條長與領先高亮全部反向，`node prototype/tests/run.js` 仍全綠。
- **建議修法**：① 站別欄位不要再借用 `mode` 這個名字給兩種語意：客端 `recordBattle` 改成 `{ vs, site: HL.site.mode(), mode: rec.mode, wager, net, win, payload: rec }`，SQL 端加 `site text` 欄（或把站別欄改名 `site`、把 `mode` 還給遊戲模式，一次性 migration 把 'demo'/'live' 搬過去）。② `loadHistory` 加 `.eq("site", HL.site.mode())`（或改走 `rpc("load_history", {p_limit})` 讓 p_site 由既有注入出口統一帶入——這樣站別就只有一個來源）。③ 遊戲模式**永遠只從 `payload.mode` 讀**，並在 `HL.arenaStats.fromRow`（見 normalize 那條 finding）裡明文擋掉欄位來源。④ 立鎖：斷言（a）api.js 的 recordBattle 不得把 `rec.mode` 寫進站別欄（b）loadHistory 必須帶站別條件（c）`HL.battleMode.spec` 收到 'demo'/'live' 時，fromRow 不得把它當模式（餵一列站別='live' 的假資料，斷言 normalize 後 `mode` 仍是 payload 的 'crazy'）；負向擾動＝把 mode 改回讀欄位必須變紅。

### 59. [medium / certain] loadHistory 把軟錯誤折成空陣列（walletHistory 已修掉的同一個坑）⇒ 戰績載入失敗時顯示「尚無紀錄」，且會與「12 勝 8 敗」的統計磚並存
- **位置**：`prototype/src/core/api.js:48`
- **為什麼是錯的**：第 48 行 `.then(res => (res.data || []).map(...))` 把 PostgREST 的軟錯誤（RLS 拒絕、欄位不存在、schema cache 未刷新）與「真的沒有紀錄」折成同一個結果：空陣列。同檔 `walletHistory` 已經因為完全相同的理由被修過（api.js:100-102 的註記逐字寫著「軟錯誤改拋出，讓呼叫端能分辨『載入失敗』與『無紀錄』，避免降級成誤導性空態」）——`loadHistory` 是同一個坑的第二個入口，沒跟著修。可觀察的矛盾：`arena_stats`（來自 member_econ，另一條查詢）成功回來說你有 20 場、勝率 65%，而 history 因為錯誤變成 `[]` ⇒ `statsPanel`（arena.js:289）的按鈕條件 `s.matches ? historyModal() : toast(...)` 會用 matches>0 通過，打開的 modal 標題寫「最近 0 場」、內容是「尚無紀錄。」，統計磚卻在同一個 modal 上方寫「12 勝 8 敗」。**為什麼看起來正常**：`console.warn` 都沒有（loadHistory 連 warn 都沒加），network 面板要展開才看得到 4xx；玩家與開發者都會把它讀成「回放紀錄本來就不留」。
- **重現**：1) 會員登入。2) devtools 讓查詢軟失敗（模擬 RLS/schema 錯誤）：`var f=HL.sb.from.bind(HL.sb); HL.sb.from=function(t){ var q=f(t); if(t==="battle_history"){ var s=q.select.bind(q); q.select=function(){ var b=s.apply(null,arguments); b.then=function(cb){ return Promise.resolve(cb({data:null,error:{message:"permission denied"}})); }; return b; }; } return q; };`。3) `location.reload()` 前先把上面那段放進 boot 前（或直接呼 `HL.api.loadHistory(30).then(console.log)`）⇒ 印出 `[]`，**沒有任何 warn/throw**。4) 讓 `arena_stats.matches` 非 0（打過幾場或直接 `HL.state.set({arenaStats:Object.assign({},HL.state.get().arenaStats,{matches:20,wins:13,losses:7,history:[]})})`），5) 到競技場點「戰績與回放 ›」⇒ 標題「最近 0 場」+ 內容「尚無紀錄。」，但同一個 modal 上方的統計磚寫「13 勝 7 敗 · 勝率 65%」。
- **建議修法**：比照同檔 `walletHistory`（api.js:102）：`.then(function(res){ if (res.error) throw new Error(res.error.message || "battle history failed"); return (res.data||[]).map(...); })`，並在 `main.js` hydrate 的 `Promise.all` 改成能分辨兩者——史料失敗不該擋住整個 hydrate（現在 catch 會整包退回 startApp），建議 `HL.api.loadHistory(30).catch(function(){ return null; })`，`null`＝載入失敗、`[]`＝真的沒紀錄；`stats.history = hist || []` 之外多存一個 `stats.historyError = (hist === null)`。表面端（historyModal / battleRows）在 historyError 為真時顯示「戰績載入失敗，請稍後重試」而不是「尚無紀錄」，並讓「戰績與回放」按鈕的條件由 matches 改成同一個出口的判定，避免 matches 與 history 各說一套。立鎖：斷言 api.js 內所有 `.from(...)` 讀取都有 `res.error` 分支（現在 loadHistory 是唯一的例外），負向擾動＝把 throw 拿掉必須變紅。

### 60. [medium / certain] statRecord 是「記一場對戰」的宣稱單一出口，但會員模式的正常結算路徑繞過它自己寫 state ⇒ 掛在 statRecord 上的東西在會員模式靜默不觸發
- **位置**：`prototype/src/views/vsslot.js:532`
- **為什麼是錯的**：`arena.js:238-253` 的 `statRecord(rec)` 是「一場對戰結束要做的事」的登記處（更新 matches/wins/losses/streak/best/profit/bigWin、寫 history、呼 recordBattle）。`finishLocal`（vsslot.js:514）與棄局（vsslot.js:110）都走它，但**會員模式的正常路徑不走**：`finish()` 的 SRV 分支在第 532 行直接 `HL.state.set({ balance:+R.balance, arenaStats: Object.assign({history:[rec].concat(oldHist).slice(0,30)}, R.stats) })`，自己拼一份 arenaStats。今天兩條路徑的效果剛好等價（伺服器也算了同一組統計、也自己 insert 了 history），所以看不出問題；但這是本專案第 ①/⑧ 型缺陷的溫床：任何**未來**掛到 statRecord 上的「依對戰行為觸發」的東西（成就徽章、任務、季票、公會 meta、通知）在會員模式會**一場都不觸發**，而畫面完全正常、所有測項全綠。對照 CLAUDE.md §4 的紀律「`HL.liveStats.record` ＝全遊戲結算的中央點，掛這裡即全遊戲通吃」——對戰的統計面缺了同等級的單一中央點。另有一個今天就存在的小差異：`Object.assign({history:...}, R.stats)` 會**整份替換** arenaStats，本機新增的任何非伺服器欄位（例如未來的 `historyError`、`lastReplayAt`）會被靜默丟掉。
- **重現**：1) 部署 phase4+、會員登入。2) devtools 在單一出口上插樁：`var _r=HL.arenaStats.record; HL.arenaStats.record=function(rec){ console.log("statRecord 被呼叫", rec.win, rec.net); return _r(rec); };`。3) 打一場 Slots Battle 打到結算卡（確保 SRV 有值：`HL.api.playBattle` 未被 stub、network 面板看得到 play_battle 200）。4) 觀察 console：**一次都沒印**，但 `HL.arenaStats.summary().matches` 已 +1、`battle_history` 已多一列 ⇒ 這一場完全沒有經過宣稱的單一出口。5) 對照：把 playBattle stub 成回 null 再打一場，console 會印一次（finishLocal 路徑）。6) 欄位遺失驗證：`HL.state.set({arenaStats:Object.assign({},HL.state.get().arenaStats,{probe:1})})` 後再打一場會員模式對戰，`HL.state.get().arenaStats.probe` ⇒ undefined。
- **建議修法**：把「記一場對戰」收斂成真正的單一出口：`statRecord(rec, opts)` 多收一個 `opts.authoritative`（伺服器已結算）——為真時跳過自己算統計、改採 `opts.stats`（R.stats）並跳過 `recordBattle`（伺服器已 insert），但**仍然**執行所有「掛在這裡」的後續（history 併入、未來的成就/任務/通知）。vsslot 的 SRV 分支改成 `HL.arenaStats.record(rec, { authoritative: true, stats: R.stats, balance: +R.balance })`，不要自己 `Object.assign` 覆蓋 arenaStats（改成 merge，保住非伺服器欄位）。立鎖：斷言（a）vsslot 內**兩條**結算路徑都出現 `HL.arenaStats.record(`（現在只有一條）（b）SRV 分支不得直接 `HL.state.set({ ... arenaStats: Object.assign(`（c）餵一份帶額外欄位的 arenaStats 給 authoritative 路徑，斷言該欄位仍存在；負向擾動＝把 SRV 分支改回直接寫 state 必須變紅。

> 掃過但判定沒問題／無法驗證：【掃過但判定沒問題的地方】
1. `loadProfile`（api.js:15-30）的三段降級（profiles 失敗／load_econ 未部署／欄位缺）邏輯正確：`econ.balance != null ? +econ.balance : base.balance ?? INITIAL_BALANCE`，且 `arena_stats` 的 fallback 鏈完整。`rpc()`（api.js:76-87）的 p_site 注入、null 語意、try/catch 都對。
2. `rpcChicken`（api.js:113-123）刻意不把錯誤折成 null（區分「RPC 未部署」與「回合錯誤」），這個設計是對的——它缺的只是 p_site 注入（已併入 finding #1）。
3. 座位索引對齊：phase7 的 `v_seats` 用 `idx = v_i - 1`、`v_win := (v_winner = 1)`，客端 `sides[0]` 是「你」⇒ 伺服器索引 0 = 你，`SRV.seats[i]` 與 `sides[i]` 對得上，`finish()` 第 519-523 行的取值與轉置沒有 off-by-one。
4. 累計/增量語意一致：伺服器 `v_rounds_json` push 的是 `v_run`（累計），客端 `roundData` 存的也是累計（vsslot.js:404-405、423），`lastDeltas()` 兩邊算法相同。
5. `climaxThen` / `escrowSettle` / `markEscrow` / `pendingSettle` 的四拍與「餘額排在動畫之後」在會員模式也成立：SRV 分支 `climaxThen(R.winnerIdx, 0, ...)` 內部 `escrowSettle(0)` 只清標記，餘額由 callback 內 `HL.state.set({balance:+R.balance})` 一次寫入，沒有重複加。
6. `hydrateThenStart`（main.js:142-155）的 `Object.assign(默認統計, p.arena_stats)` 讓統計磚在會員模式正確；壞的只有 `stats.history = hist`（見 finding #3）。
7. 本輪已修的五項我逐一複核，沒有發現修得不完整之處：`mountView` 只收工廠函式且 `typeof build !== "function"` 會 throw（app-shell.js:709-711）、`dropExit` 只在 rerender 走、`later()` 的存活閘、`room._escrow` 認領＋`escrowTake` 冪等、`noSeatFor` 純判定、`joinability/battleCta/cardAction` 出口、`forfeit: true` 記敗局——都成立。唯一的例外是離場鉤與 PiP 續播的衝突（finding #6），那是既有 PiP 設計與 09-07 大修之間的縫，不是這五項本身寫錯。
8. `PF_GAMES` 已收 `vsslot`、`isPF` 已支援複合 key（fair.js:209-219），game-frame 的 🔒/✓ 兩處都讀同一個出口，沒有 drift。

【我無法驗證的地方】
A. 沒有可用的 Supabase 後端：所有 SQL 側結論（p_site 落 'demo'、member_econ 寫到哪一列、battle_history 的 mode 值、play_battle 的實際回傳）都是**讀 phase7.sql 逐字 + 用 node 餵真形狀 payload 跑同一段前端渲染運算式**推出來的，未在真後端跑過。這與 intel/arena-battle-spec-2026-08-21.md 第 264 行的自我限制一致。finding #1/#5/#7/#8 的「實際發生」需要部署 phase7 才能坐實；不過造成它們的**程式碼事實**（playBattle 繞過 rpc()、recordBattle 寫 rec.mode、loadHistory 無站別條件、SQL 勝者迴圈是嚴格不等）都是可直接讀出的，不依賴部署。
B. `prototype/src/views/vsslot.js` 是 #110 延遲載入，我沒有在 preview 裡實跑 PiP 續播那條路徑（finding #6 的凍結與沒收是靠讀 `runExit`／`clearTimers`／`resumeFrame` 三段程式碼推出來的，repro 步驟已寫成可照做的形式，建議在 preview 用 `data-beat` 是否停止變化來驗）。
C. 舊版 `docs/supabase-phase4/5/6.sql` 裡的 play_battle 也各自 insert battle_history，payload 形狀我只掃了 phase7 那一版逐字。若既有資料庫上跑的是 phase4/5/6 的函式，normalize 需要能吃下那幾版的形狀差異——我沒有逐版比對。
D. 沒有量測 `battle_history` 的實際列數/站別分布（需要後端），所以 finding #5 的「列數永久多於場次數」與 finding #8 的「兩站混列」都只給了可照做的 SQL 查詢，沒有真實讀數。

## 角度⑦ 玩家死路：對抗式走查（競技場／配對／對戰）

### 61. [blocker / certain] 同頁重繪會把對戰倒回「配對中」，而賭注只扣一次 ⇒ 同一份注可以無限重骰到贏
- **位置**：`prototype/src/views/vsslot.js:585`
- **為什麼是錯的**：`render()` 最後無條件呼叫 `phaseSearching()`，完全沒有「這一場打到哪了」的續接。而 `HL.app.refresh()`（＝`renderApp({rerender:true})`）走的是 `dropExit()`（丟掉離場鉤、不結帳，這是 2026-09-07 刻意的正確設計），於是重繪不是離場、escrow 不會被了結 ⇒ `render()` 第 570 行把 `room._escrow` 原封認領回來，`escrowTake`（第 88 行 `if (escrow > 0) return;`）在新一場的承諾倒數歸零時**直接早退不扣款**。結果：畫面重新從配對走一次完整 10 輪，餘額**一毛都沒再動**。看起來完全正常的原因有三：①「重繪不結帳」與「escrowTake 冪等」兩條都是本輪剛立的正確修法，缺的是第三條（重繪要續接而不是重來）②`games/arena/exit-hook-settles-escrow`、`games/vsslot/escrow-equivalence` 全綠——它們守的是「不重複扣」，沒有人守「不重複發牌」③觸發鈕就在對戰自己的外框上（`views/game-frame.js:69` 的「金額顯示幣別」下拉，`HL.gameFrame.wrap(root,…)` 把它掛在對戰畫面上），玩家不必離開對戰就能按到。附帶：每次重打都會再跑一次 `HL.liveStats.record("Slots Battle", room.wager, payout)`（第 511 行）⇒ 一份注可刷出任意多份流水，VIP／任務／返水／JP／錦標賽全部一起免費進帳。
- **重現**：1) Demo 開站 → 競技場 → ＋開房發起挑戰 → Slots Battle → 選 1 款遊戲、1v1、賭注 1000 → 建立對戰。  
  2) 接受對戰 → 等 3-2-1 倒數歸零（此刻餘額 −1,000，devtools 記下 `HL.state.get().balance`）。  
  3) 打到第 4～5 輪，點對戰外框工具列的 ⚙「遊戲設定」→「金額顯示幣別」選 USD。  
  4) 畫面立刻回到「配對中…等待玩家加入」。按「接受對戰」→ 倒數歸零。  
  5) 檢查餘額：**與步驟 2 完全相同，沒有再扣 1,000**。devtools 可直接證明：  
     var R=HL.state.get().arenaRooms.filter(r=>r.id===HL.state.get().activePoolId)[0];  
     R._escrow            // 1000（重繪後仍在途）  
     var b0=HL.state.get().balance;  
     HL.app.refresh();    // 等同步驟 3  
     // 接受→倒數歸零後  
     HL.state.get().balance === b0   // true ⇒ 第二場免費  
  6) 只要輸了就重複步驟 3–5（把幣別在 USD／NT$ 之間來回切即可），1v1 每次 50% ⇒ 必然在數次內贏到 `wager*(N-1)`。
- **建議修法**：讓「重繪」與「重來」分家，並用同一個判準：①在 `room` 上記一個對戰階段狀態（例如 `room._battle = {phase, rIdx, roundData, seed}`），`render()` 依 `room._escrow > 0 || room._battle` 決定進 `phaseSearching()` 還是**續接**（最小可行版：escrow 在途就直接跳過配對/接受，重建 `phaseGame` 並從 `roundData.length` 那一輪接下去）。②把「在途賭注」與「可以開始新一場」綁成單一出口 `canStartNewBattle(room)`＝`!room._escrow`，`phaseFound.accept()` 與 `commitCountdown` 都問它；escrow 在途卻走到 accept ⇒ 視為程式錯誤（丟 console.warn），不要靜默當成「免費再打一場」。③立鎖：`games/vsslot/rerender-resumes-not-restarts`——負向擾動要打自己（把 render 改回無條件 `phaseSearching()` 必須紅、把 `escrowTake` 的冪等移除必須紅），並斷言「一次 escrowTake 對應至多一次 escrowSettle/forfeitEscrow」與「一次 escrowTake 對應至多一次 liveStats.record」。

### 62. [high / certain] 開子母畫面後換頁：對戰被靜默凍結在 PiP 裡、賭注沒收，再點「回到對戰 ›」是一張永遠不會動的死畫面
- **位置**：`prototype/src/views/vsslot.js:566`
- **為什麼是錯的**：PiP 的整個賣點就是「換頁也繼續播」——`views/game-frame.js:182` 的註記把「開 PiP → 用底部導覽回大廳（PiP 續播＝設計）」明文寫成預期行為，占位卡也寫「遊戲於子母畫面播放中」。但 2026-09-07 之後，底部導覽換頁必經 `app-shell.js:718 runExit("view-left")` → vsslot 的離場鉤（第 579–583 行）`clearTimers()` + `forfeitEscrow()` ⇒ **PiP 裡的對戰當場停拍、賭注沒收**。玩家看到的是：PiP 視窗還在、盤面與分數還在（stage 被搬進 `pipHost`，沒有被拔掉），只是永遠不再前進；同時跳一個「已離開對戰，賭注 NT$1,000 不退還」的 toast，而他明明沒有離開對戰、是特地 PiP 起來繼續看的。更難看出來的是回頭路：從大廳房卡按「回到對戰 ›」→ `render()` 第 566 行 `resumeFrame` **早退**在 `timers = []`、escrow 認領、`HL.shell.onExit(...)` 註冊、`root =` 全部之前 ⇒ 拿回來的是同一顆已被 `clearTimers` 清空的舊 root：沒有任何計時器、沒有新的離場鉤、沒有任何按鈕能重啟，只剩「‹ 返回競技場」。畫面上每一格都對（頭像、名次、Round k/10、分數），只是這一場已經死了。`bounty.js:297` 是同一形狀（早退在 `epoch++` 與 onExit 註冊之前）。
- **重現**：1) Demo → 競技場 → 開一場 1v1 Slots Battle → 接受 → 倒數歸零（餘額 −1,000）。  
  2) 進到第 2～3 輪時，點外框工具列的 ⧉「子母畫面」→ 出現右下角 PiP、原視窗變成「遊戲於子母畫面播放中」。  
  3) 按底部導覽「大廳」。  
  4) 觀察：PiP 仍在、盤面停在切走那一刻不再動；同時跳 toast「已離開對戰，賭注 NT$1,000 不退還」。等 60 秒也不會有結算。  
     devtools 佐證：document.querySelector('.ax-pip').style.display === 'flex' 且 document.querySelector('.ax-vs__total').textContent 永遠不變。  
  5) 回競技場 → 該房卡按「回到對戰 ›」→ 畫面回到那張凍結的盤面（不是配對、不是結算），任何操作都無反應。  
  6) 對照組（證明是這一輪的修法造成）：把 `vsslot.js:579-583` 的 onExit 註冊註解掉重跑步驟 1–4，PiP 會正常把 10 輪跑完並結算。
- **建議修法**：離場鉤要區分「這個 view 真的結束了」與「它被搬進 PiP 繼續跑」。①`HL.gameFrame` 補一個查詢 `isPipActive(key)`（已存在，只是沒被消費），vsslot 的離場鉤改成：`if (HL.gameFrame && HL.gameFrame.isPipActive("vsslot:"+roomId)) return;`——PiP 在播就不是離場，錢與計時器都不動（真正的了結交給既有的 `onTeardown`／`closePip`，那條路已經修好）。②`resumeFrame` 這條路徑不能繞過掛載契約：把 `room=`／escrow 認領／`onExit` 註冊抽成 `claim(roomId)`，`resumeFrame` 成功也要跑它（bounty 同理，且 `epoch` 要沿用而不是 `++`）。③立鎖 `games/arena/pip-continues-battle`：斷言（a）vsslot 的離場鉤內出現 PiP 在播的早退條件（b）`resumeFrame` 早退之前必須先跑 claim（用 `body(vs,"render").indexOf("resumeFrame") > indexOf("HL.shell.onExit")` 之類的順序斷言）——負向擾動：拿掉 PiP 早退條件要紅、把 claim 移到 resumeFrame 之後要紅。

### 63. [high / certain] `later()` 的存活閘讀的是模組全域 `root`（開火時求值）⇒ 重繪後閘等於不存在，而現有的鎖正好只驗這個寫法
- **位置**：`prototype/src/views/vsslot.js:60`
- **為什麼是錯的**：閘寫的是 `if (root && root.ownerDocument && !root.ownerDocument.body.contains(root)) return;`。`root` 是**模組全域**、每次 `render()` 都被重新指派（第 584 行）。所以上一次 render 排下的 timeout 開火時，讀到的是**新那顆 root**——它當然在文件裡 ⇒ 閘放行。而它要防的正是重繪：檔頭第 53–57 行明寫「同頁重繪刻意不開離場鉤 … 若沒有這一閘，舊那批回呼會對著已脫離文件的節點把整場跑完並自行結算」。實際上這個保護只在「完全沒有任何 vsslot 掛載」時才成立，那種情況本來就有離場鉤在守。雪上加霜的是 `render()` 第 567 行只做 `timers = []`（把舊陣列丟掉），**從不 `clearTimeout` 舊的那批**，所以那些 timeout 全部還活著。目前沒有整場跑完是靠另外兩道與這個閘無關的守衛（`runRound` 的 `document.body.contains(sides[0].boardEl)`、`fgboard.cascade` 的 `document.body.contains(container)`），但 `climaxThen` 的四拍鏈**一個守衛都沒有** ⇒ 在懸念/高潮期間重繪，舊那場會照樣走完並呼叫 `escrowSettle(payout)`，而那一刻 `escrow`／`room._escrow` 已經被新那場認領走了：`markEscrow(0)` 會把新一場的在途標記刪掉（餘額卻已經扣過）＝2026-09-07 修法宣稱關掉的「那筆錢從帳上消失」原地復活。最後，`checks-games.js:3240` 的斷言只是 `/body\.contains\(root\)/.test(body(vs,"later"))`——它認的是「有沒有寫這串字」，不是「這個閘會不會真的關」，所以這是一條 vacuous lock。
- **重現**：devtools（Demo）：  
  1) 開一場 1v1 Slots Battle，接受，等到第 10 輪跑完、`document.querySelector('.ax-duel').getAttribute('data-beat') === 'suspense'`。  
  2) 立刻執行：  
     var id=HL.state.get().activePoolId;  
     var R=HL.state.get().arenaRooms.filter(r=>r.id===id)[0];  
     HL.app.refresh();                 // 同頁重繪（＝切語系／改幣別顯示）  
     R._escrow                         // 1000：新一場已認領同一筆在途賭注  
     document.querySelector('.ax-mm__txt').textContent   // "配對中…等待玩家加入"（確定是新一場）  
  3) 等 4.5 秒（suspense 3000 + climax_lose 600 + climax_win 800）後再查：  
     R._escrow                         // undefined ⇒ 上一場的 climax 鏈跨進新一場，把在途標記清掉了  
     （若上一場是贏，餘額還會在「配對中」的畫面上突然跳一筆派彩）  
  4) 證明閘是死的：把步驟 2 換成  
     var oldRoot=document.querySelector('.ax-duel'); HL.app.refresh();  
     document.body.contains(oldRoot)   // false（舊 root 已脫離）  
     但舊 timeout 讀的是模組變數 `root`，此刻已指向新 root ⇒ contains 為 true ⇒ 放行。
- **建議修法**：閘要綁**排程當下那一顆節點**，不是模組變數。①`render()` 建 root 後 `var myRoot = root;`，`later()` 改成 `function later(fn, ms){ var r = root; var t = setTimeout(function(){ if (r && r.ownerDocument && !r.ownerDocument.body.contains(r)) return; fn(); }, ms); ... }`——把 `root` 在**排程時**捕捉進閉包（檔頭那句「閘要在開火時判」只對『節點是否還在文件裡』成立，對『這是哪一次掛載』必須在排程時定案）。②更乾淨的做法是比照 `bounty.js` 的 epoch：`render()` 進場 `gen++`，`later` 捕捉 `var g = gen`，回呼首行 `if (g !== gen) return;`——同時解決「舊 timeout 從不被 clearTimeout」與 `climaxThen` 無守衛。③把鎖從「有沒有寫這串字」改成「會不會真的關」：`games/arena/stale-render-callbacks-die` 斷言 `later` 的存活判準來自**排程時捕捉的區域變數**（`body(vs,"later")` 內必須出現 `var g = gen`／`var r = root` 這類捕捉，且回呼比較的是那個區域變數，不是裸 `root`），並補一條「`render` 必須 `clearTimers()` 或 `gen++`，不得只 `timers = []`」。負向擾動：把捕捉改回裸 `root` 要紅。

### 64. [high / certain] 會員模式棄局：伺服器在開打前就已經把整場結算完，前端卻照樣沒收賭注並補記一筆假敗局（同一場在戰績裡出現兩次、一勝一敗）
- **位置**：`prototype/src/views/vsslot.js:105`
- **為什麼是錯的**：會員模式的 `HL.api.playBattle`（`core/api.js:63`）是**一次 RPC 算完整場**：`docs/supabase-phase7.sql:112` 的 `play_battle` 當場 `update member_econ set balance = v_newbal, arena_stats = …` 並 `insert into battle_history`。也就是說玩家一進 `phaseGame`、RPC 一 resolve，伺服器上這一場的勝負、餘額、戰績、歷史列**全部已經定案**，之後的 10 輪只是把伺服器的分數揭曉出來。但 `forfeitEscrow()` 完全不看模式：只要 `escrow > 0` 就 (a) 不退錢 (b) `HL.liveStats.record("Slots Battle", lost, 0)` (c) `HL.arenaStats.record({win:false, net:-lost, forfeit:true})`，而 `arena.js:252` 的 `statRecord` 尾端又會 `HL.api.recordBattle(rec)` **往 battle_history 再插一列**。⇒ 玩家在會員模式打到第 5 輪按底部導覽離開：畫面扣他 1,000、戰績 +1 敗，而伺服器那邊可能記的是 +1 勝 +3,000。F5 之後 `main.js:142` 的 hydrate 用 `loadProfile()` 的 `arena_stats`（伺服器版）覆蓋戰績摘要、用 `loadHistory(30)` 拉回歷史 ⇒ **同一場對戰在清單裡出現兩列，一列「勝 +3,000」一列「敗 −1,000」，而摘要的勝敗數又只算伺服器那一列**。為什麼看起來正常：棄局語意在 Demo（前端結算、離場前結果真的還沒定）完全正確，這條鉤子是本輪剛立的正確修法；錯的是它在兩條路徑上意義相反，而 Demo 下永遠測不出來。附帶：`api.js:43` 的 `loadHistory` 連 `mode` 都沒過濾，`recordBattle`（第 55 行）也不帶 `mode` ⇒ 客端補寫的假敗局一律落在 `'demo'` 列。
- **重現**：需 Supabase 已部署 phase4+（`play_battle` 存在）並以會員登入（不帶 `?demo=1`）：  
  1) 競技場 → 開一場 1v1 Slots Battle → 接受 → 倒數歸零。  
  2) 進到 `phaseGame` 後，等 devtools network 看到 `rpc/play_battle` 回 200（回傳含 `win`/`net`/`balance`）。記下回傳的 `win` 與 `balance`。  
  3) 打到第 4～5 輪，按底部導覽「大廳」。  
  4) 觀察：toast「已離開對戰，賭注 NT$1,000 不退還」；競技場戰績面板多一筆「敗 · −NT$1,000」。  
  5) 按 F5 重新載入 → 戰績與回放清單裡**同一時間點有兩列**：伺服器那列（可能是「勝 +3,000」）與客端補寫的「敗 −1,000」；上方勝率／累積收益卻只反映伺服器那列 ⇒ 摘要與清單互相矛盾。  
  6) 純程式佐證（不必真部署）：`grep -n "forfeitEscrow" prototype/src/views/vsslot.js` 全檔零命中 `HL.auth`／`memberMode` ⇒ 棄局路徑對「伺服器已結算」完全無感。
- **建議修法**：「棄局」只在**結果尚未定案**時成立，所以要有一個判準說「這一場的結果定了沒有」。①把 `SRV`（伺服器結果）從 `phaseGame` 的區域變數提升到與 escrow 同層（例如 `room._srv`），`forfeitEscrow()` 改成：`if (room._srv) { /* 結果已定案 */ escrowSettle(伺服器應付額); return false; }`——語意與既有的 `pendingSettle` 完全同一族（勝負已定 ⇒ 據實付回、不算逃單），只是把「已定案」的來源從「本地跑完」擴充到「伺服器已回」。②會員模式下客端不得補寫戰績：`statRecord` 的 `HL.api.recordBattle` 呼叫改成只在 `!HL.auth.backend()` 或 `rec.forfeit !== true` 時才發，避免同一場兩列。③`api.js` 的 `loadHistory`／`recordBattle` 補站別：查詢加 `.eq("mode", HL.site.mode())`、插入帶 `mode: HL.site.mode()`。④立鎖 `games/vsslot/forfeit-only-when-undecided`：斷言 `forfeitEscrow` 的本體同時檢查 `pendingSettle` **與**伺服器結果旗標（負向擾動：刪掉伺服器旗標那一支要紅），並斷言 `arenaStats.record` 的 forfeit 路徑在會員模式不打 `recordBattle`。

### 65. [blocker / likely] `playBattle` 是唯一沒走 `rpc()` 包裝的結算 RPC ⇒ 少帶 `p_site` ⇒ 真站的對戰用 demo 經濟列結算，並把 demo 餘額寫回畫面
- **位置**：`prototype/src/core/api.js:65`
- **為什麼是錯的**：phase7 的站別隔離是靠 `api.js:76` 的 `rpc()` 包裝**自動注入** `args.p_site = HL.site.mode()`（第 81 行）。`slot_spin`／`slot_buy`／`bounty_flip`／`bounty_mine`／`wallet_txn`／`ops_*` 全部走它。但 `playBattle` 直接寫 `HL.sb.rpc("play_battle", {…})`，六個參數裡沒有 `p_site`；而 `docs/supabase-phase7.sql:112` 的簽章是 `p_site text default 'demo'` ⇒ **真站的 Slots Battle 一律落在 demo 站**：`perform public.ensure_econ(v_uid, 'demo')`、`select balance … where mode='demo'`、`update member_econ … where mode='demo'`、`insert into battle_history(… mode='demo')`、`ops_log_srv(… 'demo')`。回傳的 `v_newbal` 是 **demo 站的餘額**，而 `vsslot.js:532` 直接 `HL.state.set({ balance: +R.balance })` ⇒ 真站玩家打完一場對戰，頁首餘額當場被換成假站的餘額。為什麼看起來正常：注入寫在 `rpc()` 裡，程式碼讀起來像是「所有 RPC 都自動帶站別」（CLAUDE.md §4 也是這樣記載的），而唯一的例外剛好是唯一不共用那個包裝的那一支；`rpcChicken`（第 113 行）是第二個同形狀的例外。這是「判準認的是某一種寫法（`rpc()`）而不是概念（結算 RPC）」的教科書案例，而所有既有測項全綠，因為沒有任何鎖比對過「前端呼叫的參數集合 ⊇ SQL 簽章要求的站別參數」。
- **重現**：1) 靜態證明（不需部署）：  
     grep -n 'HL.sb.rpc' prototype/src/core/api.js        # 只有 play_battle(65) / rpc(82) / rpcChicken(115)  
     grep -n 'p_site' prototype/src/core/api.js           # 只出現在 rpc() 內（81）  
     grep -n 'p_site' docs/supabase-phase7.sql | head     # play_battle / chicken_* 皆宣告 p_site default 'demo'  
     ⇒ play_battle 與 chicken_start/step/cashout 的呼叫端永遠不帶站別。  
  2) 執行時（需部署 phase7 + 會員登入）：  
     HL.site.mode()                    // 先切真站：HL.site.set('live') → reload → 'live'  
     // 記下真站餘額 A、假站餘額 B（切回 demo 看一次）  
     // 真站打一場 Slots Battle  
     // devtools network → rpc/play_battle 的 request body：**沒有 p_site 欄位**  
     HL.state.get().balance            // 等於 B ± net（demo 站的餘額），不是 A  
  3) 資料佐證：`select mode, count(*) from battle_history where user_id = <uid> group by mode;` ⇒ 真站打的場次全落在 mode='demo'。
- **建議修法**：把「站別注入」從包裝函式的實作細節升級成契約：①`playBattle` 與 `rpcChicken` 改成復用同一條注入（最小改法：`playBattle` 內把 args 物件先過一次共用的 `withSite(args)`，`rpcChicken` 同；理想改法是讓兩者都呼叫 `rpc()`，只把「錯誤要不要折成 null」抽成 options，這樣注入點就真的只有一個）。②把 `withSite` 做成單一出口並讓它成為 `HL.sb.rpc` 的唯一入口（例如 `function sbRpc(name,args){ return HL.sb.rpc(name, withSite(args)); }`，全檔禁止再直接寫 `HL.sb.rpc(`）。③立鎖 `platform/rpc-site-scoped`：（a）掃 `core/api.js`，除了那一個 `sbRpc` 定義外不得再出現 `HL.sb.rpc(`（負向擾動：把 play_battle 改回直呼要紅）；（b）交叉比對——把 `docs/supabase-phase7.sql` 裡所有宣告了 `p_site` 的函式名抽出來，斷言每一個都出現在前端會被注入站別的呼叫路徑上（這條才是概念判準，改寫法也逃不掉）。

### 66. [medium / certain] 「回到對戰 ›」在沒有任何進行中對戰時也出現：點下去是全新一場、承諾倒數歸零會再扣一次賭注，而註記明文說「不得再收一次賭注」
- **位置**：`prototype/src/views/arena.js:111`
- **為什麼是錯的**：`joinability()` 的 `seated` 只問「`room.seats` 裡有沒有『你』」（第 89 行 `iAmSeated`），而 `vsslot.buildPlayers()`（`vsslot.js:157`）在你**第一次**進任何一間對戰房時就把 `room.seats` 整批覆寫成 `[你, bot…]`，而且從不釋放。於是打完一場、回競技場之後，那張房卡永遠是「回到對戰 ›」——但那間房裡沒有任何在途對戰：點下去走 `enterRoom` → `render()` 認領到 `room._escrow`＝0（上一場已 `escrowSettle`）→ 配對 → 接受 → 倒數歸零 → `escrowTake(room.wager)` **重新扣一次 1,000**。第 110–111 行的註記寫的是「已在房內：給『回到對戰』而不是再賣你一次入場（**且不得再收一次賭注**）」——那句承諾只在 escrow 真的在途時成立，程式卻用一個永久為真的 `seated` 去代表它。附帶兩個看不出來的後果：①這一支 CTA 是唯一**不印價格**的（`canJoin` 那支印「加入 NT$1,000」），所以玩家從卡面上完全看不到自己要再付一次；②`isMineRoom` 也吃 `iAmSeated`（第 90 行），該房從此常駐「我的房間」頁籤，但 `cardAction` 的 `seated` 分支先於 `mine` 分支 ⇒ `myRoomStatusModal` 對它永遠不可達，玩家沒有任何入口看那間房的淨利／場次；而 `endMyRoom` 只在 `r.mine` 為真時觸發（`arena.js:528`），對戰房 `mine:false` ⇒ 那間房被 `tick()` splice 掉時**不報任何結算**，你就看著「回到對戰 ›」的卡片消失。
- **重現**：1) Demo → 競技場 → 開一場 1v1 Slots Battle（賭注 1,000）→ 接受 → 打完 10 輪 → 結算卡按「返回競技場」。  
  2) 在房卡格線找到那間房（「我的房間」頁籤也有）：按鈕是「回到對戰 ›」，卡面沒有任何金額提示。  
  3) 記下餘額 → 點「回到對戰 ›」。  
  4) 觀察：畫面是「配對中…等待玩家加入」（不是回到任何東西），接受後倒數歸零 → **餘額再 −1,000**。  
     devtools 佐證：  
     var R=HL.state.get().arenaRooms.filter(r=>r.type==='vsslot'&&(r.seats||[]).some(s=>s&&s.name==='你'))[0];  
     R._escrow                     // undefined ⇒ 沒有在途對戰，卻仍顯示「回到對戰」  
     R.seats.map(s=>s&&s.name)     // ['你','<bot>'] ⇒ 席位永久佔著，沒有離開房間的出口  
  5) 反向：在對戰中（escrow 在途）用底部導覽離開再回競技場 —— 這時「回到對戰」才是對的，但畫面與步驟 2 一模一樣，玩家無從區分。
- **建議修法**：把 CTA 綁到「有沒有在途賭注」而不是「席位上有沒有我」。①`joinability()` 補 `inFlight: !!r._escrow`，`battleCta()` 拆兩支：`inFlight` → 「回到對戰（已下注 NT$X）›」；`seated && !inFlight` → 「再打一場 NT$X」（把價格印在鈕上，與 `canJoin` 那支同格式）。②給「離開房間」一個出口：結算卡或房卡加「讓出席位」，把 `room.seats` 裡的『你』清掉（否則 `iAmSeated` 是單向不變量——進得去、出不來）。③`cardAction` 的分支順序改成 `inFlight → enterRoom`、`mine || seated → myRoomStatusModal`，讓自建對戰房的淨利/場次重新可達。④立鎖 `games/arena/return-cta-means-in-flight`：斷言 `battleCta` 的「回到對戰」字樣只出現在讀了 `_escrow`／`inFlight` 的分支裡，且 `seated && !inFlight` 的分支必須 `money(r.wager)`（負向擾動：把條件改回裸 `j.seated` 要紅）。

### 67. [medium / certain] `battleInfoModal` 自己硬寫模式名與勝負條件＝排名語意的第五個表面、第三套文案，而 `mode-semantics-single-truth` 鎖抓不到
- **位置**：`prototype/src/views/arena.js:161`
- **為什麼是錯的**：這一行是 `r.mode === "crazy" ? "Crazy Mode（最低分勝）" : r.mode === "terminal" ? "Terminal Mode（末輪決勝）" : "標準模式"`——完全繞過 `HL.battleMode.labelOf/winCondOf`，而且文案與 core 的真相**不一樣**：core 寫的是「最低**總分**勝」與「最後一輪**增量**最高勝」（`core/battle-mode.js:32-33`）。玩家在同一輪裡會先在房卡上看到 `labelOf` 出來的「Crazy Mode」，點進觀戰資訊卡看到「最低分勝」（沒說是總分），打完在結算卡與回放標題看到「最低總分勝」——三處三種說法，而 terminal 的「末輪決勝」比 core 的「最後一輪增量最高勝」少掉最關鍵的「增量」兩個字（玩家會以為是比末輪的累計）。為什麼看起來正常：這個 modal 只在滿房／私密房才會被叫到（`battleCta` 的第四支），日常點卡進得去的房都走 `enterRoom`，所以它是全檔最少被看見的表面；而 `checks-games.js:3493` 的 `games/arena/mode-semantics-single-truth` 只斷言「arena.js 有讀 HL.battleMode」「有出現 `BM.leaderIndex(`／`BM.barFrac(`／`winCondOf(`」以及幾個**特定舊寫法的黑名單正則**——同一支檔裡再多一份硬寫的文案完全不觸發任何一條。這正是 2026-08-21 那個顯示 BUG 的原始形狀（同一條規則被 N 個表面各自硬寫），只是被修了四個表面、漏了第五個。
- **重現**：1) 靜態：sed -n '155,168p' prototype/src/views/arena.js —— 第 161 行是硬寫的三元式，全檔該行沒有 `HL.battleMode`。  
  2) 對照 core：sed -n '30,34p' prototype/src/core/battle-mode.js —— crazy 的 winCond 是「最低總分勝」、terminal 是「最後一輪增量最高勝」。  
  3) 玩家可見：Demo 開站 → 競技場 → 等 `arenaSim` 把某間 crazy 房補滿（或 devtools 直接造）：  
     var r=HL.state.get().arenaRooms.filter(x=>x.type==='vsslot')[0];  
     r.mode='crazy'; r.seats=[{name:'A',av:'🐯'},{name:'B',av:'🦊'}]; r.players=2;  
     HL.router.go('arena');  
     → 房卡徽章寫「Crazy Mode」（走 labelOf），按「👁 觀戰」→ 資訊卡「模式」欄寫「Crazy Mode（最低分勝）」。  
  4) 再打一場 crazy 局看結算卡／回放標題 → 「Crazy Mode（最低總分勝）」。三處文案不一致，且觀戰卡那句沒說是「總分」。  
  5) 證明鎖是空的：把第 161 行改成 `"隨便寫"`，`node prototype/tests/run.js` 仍然全綠。
- **建議修法**：①第 161 行改成 `["模式", HL.battleMode.labelOf(r.mode) + "（" + HL.battleMode.winCondOf(r.mode) + "）"]`（與 `historyModal:303-304`、`replayModal:359-360`、`vsslot.commitCountdown:252` 完全同一句組法）。②把鎖從黑名單改成白名單：`games/arena/mode-semantics-single-truth` 增一條——掃 `views/arena.js` 與 `views/vsslot.js`，**任何**出現 `mode === "crazy"` 或 `mode === "terminal"` 的行都必須在 `core/battle-mode.js` 之內（兩支 view 內命中數必須為 0）。這條判準認的是概念（誰有權比對模式字串），不是某一種舊寫法，所以換個寫法也逃不掉。負向擾動：把任一表面改回硬寫要紅。

### 68. [medium / certain / 已知] 結算卡的名次表自己硬寫排名量（`room.mode === "terminal" ? o.last : o.total`）且該欄無欄名，而鎖的正則只認 `e.last : e.total` 所以放行
- **位置**：`prototype/src/views/vsslot.js:454`
- **為什麼是錯的**：`renderResult` 的名次列最後一欄是 `money(room.mode === "terminal" ? o.last : o.total)`——這就是 `HL.battleMode.metricOf(mode, o)` 的第二份實作，寫在對戰本體裡。同一支檔的 `refreshStandings`（第 311 行）與報表（`arena.js:417`）都已改走 `BM.metricOf`，只有結算卡沒改。後果有兩層：①同一場的「排名量」有兩份來源，只要 `metricOf` 的語意再變（例如未來加第四個模式、或 terminal 改成比末兩輪），結算卡會靜默停在舊語意，而畫面上仍然對齊名次順序（順序是 `CORE.rankBy` 算的）⇒ 名次對、數字錯。②那一欄**沒有欄名**（`standRows` 只有 `#k / 頭像 / 名字 / 一個裸數字`），而 terminal 局它是「本輪增量」、其他模式是「累計總分」——玩家同時看到席位面板上還掛著的累計值與這個裸數字，兩個互斥的量並排（`intel/arena-battle-spec-2026-08-21.md` §1「結算與後續動作」已記載「268 的第四欄在 terminal 悄悄換成 `o.last` 且無欄名」，至今未修）。最難看出來的是鎖：`checks-games.js:3514` 寫 `t.ok(!/mode === "terminal" \? e\.last : e\.total/.test(vs), "vsslot 不得自己再寫一份 metricOf")`——正則綁死變數名 `e`，而實際程式用的是 `o` ⇒ 這條鎖對現存的違規**完全不作用**，是一條 vacuous lock。
- **重現**：1) 證明鎖是空的（純 node，秒級）：  
     node -e "var fs=require('fs');var s=fs.readFileSync('prototype/src/views/vsslot.js','utf8');console.log('鎖的正則命中:', /mode === \"terminal\" \? e\.last : e\.total/.test(s));console.log('實際違規行:', s.split('\n').findIndex(function(l){return l.indexOf('room.mode === \"terminal\" ? o.last : o.total')>=0;})+1);"  
     → 印出 `鎖的正則命中: false` 與 `實際違規行: 454`。  
  2) 玩家可見（Demo）：競技場 → 開房 → 模式選「Terminal」→ 1v1v1、賭注 100 → 打完 10 輪。  
  3) 結算卡的名次表每列最後一個數字是「最後一輪增量」（例如 480），沒有任何欄名；而它上方的席位面板同時還顯示「本輪增量 480」與副行「累計 12,340」⇒ 畫面上三個數字、兩種量、零標籤。  
  4) `node prototype/tests/run.js` 全綠。
- **建議修法**：①第 454 行改成 `money(HL.battleMode.metricOf(room.mode, o))`（`o` 已含 `total`/`last` 兩欄，形狀正好是 `metricOf` 吃的 entry）。②名次表補欄名，並照規格拆兩欄「本局分數（`displayMetricLabel(mode)`）／派彩」——欄名一律問 `HL.battleMode.displayMetricLabel`，不要自己寫「總分」。③把鎖改成不綁變數名的概念判準：斷言 `views/vsslot.js` 內 `/mode === ?"terminal"/` 的命中數為 0（唯一允許處是 `core/battle-mode.js`），並斷言 `renderResult` 的本體出現 `metricOf(`。負向擾動：把第 454 行改回任何一種手寫三元式（換成 `x.last`、`seat.last`、反寫成 `!== "terminal"`）都必須紅。

### 69. [medium / certain] 私密房是一個永遠進不去的狀態：全 repo 沒有任何分享／邀請出口，建房表單卻承諾「僅分享連結可加入」
- **位置**：`prototype/src/views/arena.js:102`
- **為什麼是錯的**：`joinability()` 的 `canJoin` 把 `!priv` 當成硬條件，於是私密房的 CTA 永遠是「🔒 私密房」→ `battleInfoModal`，卡面文案是「🔒 私密房：僅限分享連結加入（Demo 觀戰）」（第 165 行），建房表單的開關說明是「僅分享連結可加入」（第 704 行）。但**那條連結不存在**：`grep -rn '分享連結|邀請|invite' prototype/src` 只命中這兩句文案本身；`HL.router` 是純狀態路由、沒有 URL/hash，所以連理論上可分享的位址都沒有。`mock-data.js:300` 讓每間新生成的對戰房有 10% 機率 `priv:true` ⇒ 大廳格線裡固定有一成房卡是「看得到、有賭注、有席位空格、但任何操作都只會彈一張說『去用那條不存在的連結』的資訊卡」。這正是 `sponsored` 已經修過的同一個形狀（`arena.js:705-708` 的註記：「建房端照 × 人數 收了錢、卻沒有任何一席被豁免＝收了錢什麼都沒發生」→ 改標「示意」），`priv` 是同一批表單上唯一沒被一起處理的旗標。為什麼看起來正常：🔒 + 「僅限分享連結」讀起來像一個完整的功能說明，而不像未實作；且它不會報錯、不會扣錢、席位格還在正常跳動。同一支 CTA 的另一半「👁 觀戰」也是空的（點下去只是同一張資訊卡，沒有任何觀戰畫面——規格 §2 `S14 SPECTATE［缺］` 已記載）。
- **重現**：1) 靜態：grep -rn '分享連結\|invite\|邀請' prototype/src —— 只命中 arena.js:165 與 arena.js:704 兩句文案，沒有任何產生/複製連結的程式。  
  2) 玩家可見（Demo）：競技場 → 在格線裡找帶 🔒 的房卡（約一成；或 devtools 造一間：  
     var r=HL.state.get().arenaRooms.filter(x=>x.type==='vsslot')[0]; r.prefs=r.prefs||{}; r.prefs.priv=true; r.seats=[{name:'A',av:'🐯'},null]; r.players=2; HL.router.go('arena');）  
  3) 卡面顯示「1/2 玩家」「賭注 NT$X」＝看起來有空位可加入，但按鈕是「🔒 私密房」。  
  4) 點按鈕、點整張卡（`cardAction` 的 fall-through）—— 兩條路都只彈同一張資訊卡「僅限分享連結加入」。整個 app 沒有任何地方能取得那條連結 ⇒ 這間房在整個 session 內對玩家永久不可達，直到 `tick()` 把它 splice 掉。  
  5) 自己開一間私密房則進得去（走 `seated` 分支），所以開發者自測時不會踩到——只有加入別人的私密房才是死路。
- **建議修法**：兩條路選一條，但要與 `sponsored` 的處理一致：①（最小、與既有裁決同軸）把「私密房間 Private」在建房表單改標「（示意）」並在 `battleInfoModal` 改成「🔒 私密房（Demo 未實作邀請，暫不可加入）」，同時把 `mock-data.js:300` 的 `priv` 機率降為 0，讓大廳不再長出不可達的房卡。②（做完）給房間一個可分享的識別：`HL.router` 補 hash（`#/vsslot/<roomId>`）或在房卡/我的房間加一顆「複製邀請碼」，`joinability` 改成 `canJoin: !seated && !r.mine && filled < cap && (!priv || hasInvite(r))`。③立鎖 `games/arena/no-unreachable-room-state`：對 `joinability()` 回傳的每一種狀態組合，斷言至少存在一個能推進它的出口——具體判準是「凡是讓 `canJoin` 為 false 的旗標，必須在同一支檔裡有對應的解鎖函式（如 `hasInvite`）或該旗標的文案含『示意/未實作』」。負向擾動：把 `priv` 改回沒有解鎖路徑又不標示意要紅。

### 70. [medium / certain] 「真站不提供 ultra」只在 `battleTempo.ms()` 內成立：fgboard 的轉輪／落下仍用裸 SP 常數，真站實際照 ultra 演出，而 vsslot 的真站每輪下限用的是與實際不符的估算
- **位置**：`prototype/src/views/fgboard.js:77`
- **為什麼是錯的**：`core/battle-tempo.js` 的合規承諾寫在第 14 行與 `ms()` 第 72 行：`if (live && s < SPEED.fast) s = SPEED.fast;`——真站把 ultra 夾到 fast，對標「禁 turbo/slam-stop」。問題是**這個夾制只作用在走 `ms()` 的拍**。真正決定「轉輪多久」「落下多久」的是 fgboard 自己的裸常數：第 77 行 `var dur = (0.5 + r * 0.08) * SP;`、第 81 行 `setTimeout(..., (0.5 + (n-1)*0.08)*1000*SP + 90)`、第 106 行 `0.38 * SP`、第 107 行 `setTimeout(cb, 400 * SP)`、第 121 行 `650 * SP`——`SP` 是 `opts.animSpeed`，由 `vsslot.js:362` 直接餵進來，而 `vsslot.speed()`（第 160 行）又是**自己算的**（`p.ultra ? 0.35 : p.fast ? 0.6 : 1`），沒有問 `HL.battleTempo.speedOf(prefs)`、也沒有任何 live 夾制。⇒ 真站開一間 ultra 房，轉輪與落下真的以 0.35 倍速跑，同時 `infoBar` 掛著「⚡⚡ 超快」徽章（第 341 行），而 `vsslot.js:425` 算真站每輪下限時用的是 `T.ms("roll", sp)` ＝ 被夾到 fast 的 540ms，與實際的 `(0.5+4×0.08)×1000×0.35+90 ≈ 377ms` 不符，所以那個 `liveRoundPad` 補的量本身就是錯的。另有兩個直接證據說明這是「常數住在兩個地方」而不是設計：`battle-tempo` 的 `drop: 400` 拍**零消費者**（`grep 'ms("drop"' prototype/src` 全庫零命中），`roll: 900` 拍的唯一消費者是 vsslot 那個估算式、不是真正的動畫——也就是節奏表宣稱「view 內禁止再寫裸毫秒」（檔頭第 16 行）的那兩拍，正是唯一沒被搬過去的兩拍。
- **重現**：1) 零消費者（純靜態，秒級）：  
     grep -rn 'ms("drop"\|ms("roll"' prototype/src   # drop 零命中；roll 只有 vsslot.js:425 的 pad 估算  
     grep -n 'SP' prototype/src/views/fgboard.js      # 77/81/106/107/121 全是裸常數 × SP  
     grep -n 'function speed' prototype/src/views/vsslot.js  # 160：自算，未問 battleTempo.speedOf  
  2) 真站實測（Demo 資料、真站旗標）：  
     HL.site.set('live')  →  location.reload()  
     競技場 → ＋開房 → Slots Battle → 打開「⚡⚡ 超快旋轉 Ultra」→ 選 1 款遊戲 → 建立 → 接受 → 倒數歸零。  
  3) 觀察 infoBar 掛著「⚡⚡ 超快」，並量一輪轉輪的實際時長：  
     var t0=performance.now(); var mo=new MutationObserver(function(){});  
     // 或直接量：HL.battleTempo.ms('roll', 0.35, {live:true})   // 540（宣稱值，已夾到 fast）  
     // 對照 fgboard 實際值：(0.5 + 4*0.08)*1000*0.35 + 90        // ≈ 377（真實值，未夾）  
     兩者不等 ⇒ 真站的「禁 turbo」在實際演出上沒有生效。  
  4) `node prototype/tests/run.js` 全綠（`battle-tempo/constants` 只驗 `ms()` 自己的算術，沒有任何測項比對 fgboard 用的是不是 `ms()`）。
- **建議修法**：讓「速度」與「拍長」都只有一個出口。①`vsslot.speed()` 改成 `return HL.battleTempo.speedOf(room.prefs);`，並把徽章文案改成依 `speedOf` 的回傳值判斷（真站被夾到 fast 時就顯示「⚡ 快速」，不要留一個說謊的 ⚡⚡）。②`fgboard` 把 `roll`／`drop`／命中前的 `hold` 全部改問節奏表：`animateRoll` 的總長走 `T.ms("roll", SP)`（每卷的 stagger 用 `T.ms("spin_stagger", SP)`）、`tumbleAnim` 走 `T.ms("drop", SP)`、`hold` 走 `T.ms("dwell_small", SP)` 或新增一拍——關鍵是**所有毫秒都經過 `ms()`**，這樣 live 夾制與結構拍下限自動涵蓋整條演出鏈。③`battle-tempo` 補 `ms()` 之外的第二層保險：`speedOf` 自己也做 live 夾制（`if (isLive() && s < SPEED.fast) s = SPEED.fast`），讓「拿到速度值」這一步就已經合規，任何下游即使寫裸常數也不會破真站承諾（＝把單向不變量補成雙向）。④立鎖 `games/arena/tempo-no-raw-ms`：斷言 `views/fgboard.js`／`views/vsslot.js` 內不得出現 `* SP`／`* sp` 形式的裸毫秒或裸秒數（白名單只留 `T.ms(...)`／`T.popMs()`／`T.dwellFor(...)` 的回傳），且 `battle-tempo` 的每一個 BEATS 鍵都至少有一個 `src/` 消費者（治 `drop` 那種零使用者的拍）。負向擾動：把 `roll` 改回 `(0.5+…)*SP` 要紅。

### 71. [medium / certain] 真站的 Slots Battle 用假 bot 當對手：`buildPlayers()` 直接呼 `HL.mock.makeHost()`，全檔沒有 `HL.site.isLive()` 閘
- **位置**：`prototype/src/views/vsslot.js:155`
- **為什麼是錯的**：CLAUDE.md §4 的鐵律是「新增任何『假玩家/假流水/假活動』產生器，記得加 `if (HL.site && HL.site.isLive()) return;`」，已閘清單裡有「arena sim」——指的是 `arena.js:516 tick()` 的那一道（真站不生成/不推進假房）。但對戰本體的對手產生器**不在那道閘後面**：`buildPlayers()` 第 155 行 `var p = pool[i - 1] || HL.mock.makeHost();`，全檔 `grep HL.site` 零命中。真站雖然沒有假房可加入（tick 早退），但玩家仍可自己開房：`createBattle`（第 727 行）沒有站別判斷 ⇒ 建房 → 進場 → 空席位被 `makeHost()` 補成假名假頭像 → 以真站的錢跑零和結算（Demo/降級路徑是客端 `finishLocal`，會員路徑則把假 roster 送給 `play_battle`，伺服器同樣照 N 人零和發錢）。畫面上唯一的線索是配對頁那行「Demo 自動補位」與 `header()` 的 `ax-demo-tag`（第 168 行）——在真站掛著「Demo」標籤本身也是錯的另一半。為什麼看起來正常：真站的競技場格線是空的，所以第一眼像是「這個功能在真站不存在」；只有真的按下「＋開房發起挑戰」才會發現它照跑，而且假對手的名字/頭像與 Demo 一模一樣、不會有任何警訊。
- **重現**：1) 靜態：  
     grep -n 'HL.site' prototype/src/views/vsslot.js      # 零命中  
     grep -n 'makeHost' prototype/src/views/vsslot.js     # 155：buildPlayers 無條件造 bot  
     grep -n 'HL.site' prototype/src/views/arena.js       # 只有 tick()（517）一處  
  2) 真站實測：  
     HL.site.set('live'); location.reload();  
     競技場 → 格線是空的（「目前沒有房間…」）＝看起來真站無此功能。  
     ＋開房發起挑戰 → Slots Battle → 選 1 款 → 1v1v1v1、賭注 1,000 → 建立。  
  3) 配對頁副標仍寫「Demo 自動補位」，接受後三個對手是 `makeHost()` 產的假名（例如「雷霆47」）＋ emoji 頭像。  
     devtools：  
     HL.site.mode()                                        // 'live'  
     var R=HL.state.get().arenaRooms.filter(r=>r.id===HL.state.get().activePoolId)[0];  
     R._lineup.map(p=>p.name)                              // ['你','雷霆47','影狼88','幻月12'] ⇒ 真站三個假對手  
  4) 倒數歸零 → 真站餘額 −1,000，10 輪跑完後按名次對假 bot 派彩。
- **建議修法**：①依既有紀律在對手產生器上加閘：`buildPlayers()` 在 `HL.site && HL.site.isLive()` 時不得呼 `HL.mock.makeHost()`。②但空席位不能就這樣留白（那會讓 `d()` 永遠湊不齊），所以要同時決定真站的語意——最小可行是把真站的「開對戰房」擋在更前面：`arena.js createBattle`（與 `createModal` 的 Slots Battle 選項）在真站顯示「真站對戰需伺服器配對（尚未啟用）」並不建房；`vsslot.render` 也補同一道（直接進 URL/舊房 id 的情況）。③`header()` 的 `ax-demo-tag` 與 `phaseSearching` 的「Demo 自動補位」文案改成依 `HL.site.mode()` 求值，別在真站掛 Demo 標。④立鎖 `games/arena/no-fake-opponents-on-live`：斷言凡是呼叫 `HL.mock.*` 產生「人」的檔案（`makeHost`／`fakeNames`／`makeArenaRoom`）都必須在同一支檔內出現 `HL.site` 的早退閘——這條判準認的是概念（誰在造假人），逐檔掃過去也能一次抓出其他漏閘的表面。負向擾動：拿掉 vsslot 的閘要紅。

> 掃過但判定沒問題／無法驗證：【掃過、判定沒問題的地方】\n1. 本輪已修的五項我逐條驗過磁碟現況，都成立：`mountView` 只收工廠且 `runExit` 排在 `HL.dom.clear` 之前（app-shell.js:711-721）；`escrowTake` 冪等且 escrow 掛在 `room._escrow`（vsslot.js:86-92, 570）；`joinability/battleCta/cardAction` 是單一出口且 `updateCard` 每秒連按鈕一起重建（arena.js:95-124, 512-513）；`noSeatFor` 是純判定並在 render 早退（vsslot.js:129-133, 576）；棄局記 `forfeit:true` 敗局、`pendingSettle` 讓勝負已定後離場據實付回（vsslot.js:99-119）。我報的 finding 1/2/3/4/6 都是**在這些修法之上**才浮出來的縫（重繪續接、PiP 續播、閘綁錯世代、會員模式棄局語意反轉、seated≠in-flight），不是推翻它們。\n2. 大廳/底部導覽/抽屜三個競技場入口都通：`app-shell.js:18` 的 group 涵蓋 arena/bounty/vsslot/duel；`lobby.js:113-114` 的「熱門玩家擂台」重用 `HL.arenaUI.roomCard`，房卡點擊走同一個 `cardAction`（不是第二套行為）——它的「凍結快照」問題（`updateCard` 只認 arena 的 `gridEl`，大廳那批永不更新；點到已被 splice 的鬼房會落到 `vsslot.render` 的「此對戰已結束。」）是規格 §5 #9 已記載的既知項，且退場是有畫面、有返回鈕的軟死路，故不重報。\n3. 開房精靈兩條路（賞金局／Slots Battle）的表單、預覽、費用計算、餘額檢查都會在 `createBounty`／`createBattle` 內**重新求值**（arena.js:629-630, 729-730），footer 那個被閉包捕捉的 `ok` 不會造成越權建房。`bountyForm` 的 `我的房間` 鈕 disabled + `myRoomStatusModal`「你的房間無法自行挑戰」是明示設計，不算死路。\n4. 配對中按「取消」/「拒絕」→ `backArena()`（escrow 尚未扣，無損失）；對戰中按「‹ 返回競技場」→ `leaveBattle()` 有 toast 有記帳；關 PiP 走 `closePip` → 真移除 stage + `onTeardown`（game-frame.js:190-200）——這三條都正確。滿房進場有 `noSeatPanel`、房間消失有「此對戰已結束。」、引擎未載入有「遊戲引擎未載入。」，三張都帶返回鈕。\n5. 延遲載入的換手（`lazy-views.js` stub → `LL().load` → `HL.app.refresh()`）在載入失敗後會自我重試（`lazy-load.js:36-48` 的 error 態會 fall through 到 loading），所以「網路一次失敗把房間永久鎖死」不成立。\n6. `battle-mode.js` 的純函式語意（rankBy 的 tie 輪轉、leaderIndex、barFrac 反向、gapTo 方向）逐條看過，與它自己的測項一致；`refreshStandings`（vsslot.js:304-327）、`replayModal`（arena.js:374-399）、報表註冊（arena.js:407-441）三個表面都確實走 `BM.*`。我只找到兩個漏網表面（finding 7 的 `battleInfoModal`、finding 8 的結算卡名次表）。\n7. `HL.instant.stopAll` / `HL.ticker.clearAll` / `HL.reveal.drain` / `HL.ui.closeAll` 在換頁與登出兩條路徑上都有涵蓋（main.js:61-66, 121-126；app-shell.js:716）。`instant-duel.js` 的 `pending`/`settlePending`/onExit 三件套是正確的（且 timers 是**函式內區域**，沒有 vsslot 那個模組全域的問題）。\n\n【我無法驗證的地方】\n- **沒有跑 preview**：本輪全程靜態 + 依 CLAUDE.md §9 的 headless 配方推理。finding 1/2/3 的重現步驟我寫成了可照做的形式並附 devtools 佐證式，但「畫面有沒有在動」「PiP 裡的盤面是不是真的凍住」這類需要合成影格的觀察，headless 驗不到，得由前景在 preview 逐條複測（尤其 finding 2 的步驟 4）。\n- **finding 5（`play_battle` 少帶 `p_site`）的執行時後果**取決於 Supabase 是否已部署 phase7。前端與 SQL 簽章的不匹配是磁碟事實（可靜態證明），但「真站餘額被 demo 餘額覆蓋」我沒有實際連線復現，故 confidence 標 likely。同一形狀的第二支 `rpcChicken`（api.js:113）我只做了靜態確認，沒有追它的伺服器端影響。\n- **finding 4 的雙列歷史**同樣需要真會員 + 已部署的 `play_battle` 才能眼見；靜態部分（`forfeitEscrow` 全檔無 memberMode 判斷、`statRecord` 尾端無條件 `recordBattle`、`loadHistory` 無 mode 過濾）是確定的。\n- **一條我懷疑但證不出可達性、故未報**：`fgboard.cascade` 的 `step()` 在容器脫離時 `return` 而**不呼叫 cb**（fgboard.js:112），`spin()` 在 `busy` 時也是（第 136 行）；理論上會讓 `vsslot` 的 `d()` 永遠湊不齊 `sides.length` ⇒ 對戰停在某一輪不再前進。我試了 PiP 搬移（同步、觀察不到脫離）、重繪、換頁三條路，都會被別的守衛先接手，找不到「容器脫離但整場還活著」的真實路徑，所以按寧缺勿濫不報——但如果日後加了「跳過本輪演出」或任何會在 cascade 途中重掛盤面的功能，這裡就會變成真的卡死，值得順手把 cb 補上（`if (!contains) return cb();`）。\n- 我沒有審 `styles/*.css`（.ax-mm / .ax-vs / .ax-room-card / .ax-seat）的視覺層，也沒有查 JS/CSS 時長是否另有第三處分歧——finding 10 只涵蓋 JS 側的 fgboard↔battle-tempo；彈分那一對（`--ax-pop-life`）已由 fgboard.js:52 收斂成單一來源，看起來是對的。

## ⑧ 常駐鎖的覆蓋與空洞（含競技場／配對／對戰子系統實質缺陷）

### 72. [blocker / certain] playBattle 是 api.js 唯一繞過 rpc() 的 RPC：真站對戰全部結算到 demo 經濟列，還把 demo 餘額寫回真站畫面
- **位置**：`prototype/src/core/api.js:65`
- **為什麼是錯的**：phase7 的站別隔離唯一注入點是 rpc()（api.js:81 args.p_site = HL.site.mode()）。playBattle 沒走它，直接 HL.sb.rpc('play_battle', {六個參數}) 且不帶 p_site；而 docs/supabase-phase7.sql:112-115 的簽章是 p_site text default 'demo' ⇒ 真站的每一場 Slots Battle 都拿 demo 那一列仲裁：讀 demo balance 判餘額不足、扣 demo balance、寫 demo arena_stats、ops_log_srv 標 demo、battle_history.mode='demo'。接著 views/vsslot.js:532 無條件 HL.state.set({balance:+R.balance}) ⇒ 真站畫面餘額被覆寫成 demo 列的餘額（demo 起始 28560／真站起始 0）。看起來正常的三個原因：① Demo 訪客模式 on() 為 false，根本不打這支 RPC，日常驗證碰不到；② 會員+假站時 p_site 本來就該是 demo，行為正確；③ 真站唯一症狀是「餘額突然變成兩萬多」，很容易被當成 Demo 種子。CLAUDE.md §4 明文寫『所有結算 RPC 加 p_site（前端 rpc() 自動注入）』——這支是唯一例外，而 347 條鎖沒有一條在守『api.js 不得有第二個直呼 HL.sb.rpc 的出口』。
- **重現**：① 靜態證明（可直接跑）：node -e "var s=require('fs').readFileSync('prototype/src/core/api.js','utf8');var g=s.slice(s.indexOf('function playBattle'),s.indexOf('function rpc'));console.log('p_site in playBattle?', /p_site/.test(g))" → 印出 false。② 已部署 phase7 的環境：登入會員 → localStorage.setItem('HL_SITE_MODE','live') 後 reload → 競技場打完一場 Slots Battle → Supabase 執行 select mode,balance,wagered from member_econ where uid='<你的uid>'; ⇒ live 列完全沒動、demo 列被扣/加；再 select mode,net from battle_history order by ts desc limit 1; ⇒ mode='demo'。同時瀏覽器 header 錢包顯示的是 demo 列餘額。
- **建議修法**：改成 function playBattle(p){ return rpc('play_battle', { p_wager:p.wager, p_players:p.players, p_mode:p.mode, p_rounds:p.rounds, p_roster:p.roster||[], p_game:p.game||'Slots Battle' }); }（rpc() 的錯誤折成 null 語意與現況相同＝失敗即降級前端結算，零回歸）。rpcChicken（api.js:113）有同一個洞，一併收。單一真相＝rpc() 是唯一能碰 HL.sb.rpc 的地方，並立鎖 platform/api-site-tag-single-injector：斷言 api.js 中 HL.sb.rpc( 的出現次數恰為 1（在 rpc() 內），其餘一律經它；負向擾動＝把任何一支 RPC 改回直呼即紅。

### 73. [high / certain] 對戰結束後席位永不釋放：房卡的「回到對戰 ›」會靜默再扣一份賭注、房間永久停在「我的房間」
- **位置**：`prototype/src/views/arena.js:111`
- **為什麼是錯的**：vsslot.js:157 buildPlayers 把「你」寫回 room.seats，而全 repo 沒有任何一處把「你」移出 seats（grep seats 的所有寫入點：vsslot 157、arena 470/476/477/732-733，沒有一處移除 name==='你'），room._lineup 也永不清除。於是一場打完（或棄局）之後：iAmSeated(r) 恆真 → joinability().seated 恆真 → battleCta 回傳「回到對戰 ›」。玩家點它 → enterRoom → 新的一次 render → phaseSearching → phaseFound → accept（escrow 已於上一場 escrowSettle 歸零，所以 rg/餘額檢查會重跑）→ commitCountdown 歸零 → escrowTake(room.wager) 又扣一份。也就是說 2026-09-07 那一輪把『滿房仍寫加入 NT$X』的症狀改掉了，但只改了標籤：現在按鈕反向說謊——它宣稱是『回到』一場在途對戰（不該再收錢），實際是開一場全新付費對戰，而且金額不再寫在按鈕上。旁證：該房永久留在「我的房間」頁籤（isMineRoom 吃 iAmSeated）、arenaSim.simVsslot 會把 hostEdge 記到「你」名下（arena.js:474 best===0 ⇒ 你就是 seats[0]）、1v1 房永遠顯示 1/2（simVsslot 每次把 seats[1] 清空）。既有鎖 games/arena/room-cta-not-stale 只驗『已入座→文字必須是回到對戰』與『不得再賣一次入場』，對『回到對戰不得產生新扣款』完全沒有斷言 ⇒ 全綠。
- **重現**：① 競技場任一 Slots Battle 房 → 加入 → 打完十輪 → 結算卡按「返回競技場」。② 該房卡現在寫「回到對戰 ›」。devtools 確認席位沒釋放：var r=HL.state.get().arenaRooms.filter(x=>x.type==='vsslot'&&x.seats.some(s=>s&&s.name==='你'))[0]; console.log(r.id, r.seats, r._escrow) → seats 仍含 {name:'你'}、_escrow 為 undefined（沒有在途賭注）。③ 記下 HL.state.get().balance，點「回到對戰 ›」，等承諾倒數歸零 → 再看 HL.state.get().balance ⇒ 又少一份 r.wager。
- **建議修法**：加一個釋放席位的單一出口 releaseSeat(room)：把 room.seats 中 name==='你' 的格清成 null、刪 room._lineup，並在 escrowSettle()、forfeitEscrow()、finish() 的伺服器分支三個了結點都呼叫它（與 markEscrow(0) 同一拍）。battleCta 的「回到對戰」條件改成『有在途賭注』而非『曾經入座』：seated 用 !!r._escrow（或 j.seated && r._escrow）判，否則回到「加入 NT$X」。立鎖 games/arena/seat-released-on-settle：(a) 純判定 —— 把 releaseSeat 用 new Function 取出，喂 {players:2,seats:[{name:'你'},{name:'A'}]} 後斷言 seats[0]===null 且 _lineup 已刪；(b) 形狀 —— 三個了結點（escrowSettle/forfeitEscrow/finish 的 markEscrow(0) 附近）逐字含 releaseSeat(；(c) 反向 —— battleCta 的 body 不得出現裸 j.seated 當『回到對戰』的唯一條件。負向擾動要打在真正的不變量上：只刪三個呼叫點之一（例如只留 forfeit）就必須紅——所以 (b) 要逐點斷言，不能只斷言『全檔有 releaseSeat 字串』。

### 74. [high / certain] 子母畫面「續播」與離場鉤互相矛盾：開 PiP 後用底部導覽換頁會清光計時器並沒收賭注，而 PiP 還在畫面上
- **位置**：`prototype/src/views/vsslot.js:579`
- **為什麼是錯的**：game-frame.js:180-189 的註記明文把『開 PiP → 用底部導覽回大廳（PiP 續播＝設計）』寫成正常路徑，openPip 也在原外框留下『遊戲於子母畫面播放中／返回原視窗』的占位。但 app-shell.js:718 的 runExit('view-left') 在任何換頁時無條件開火，vsslot 註冊的鉤子是 clearTimers() + forfeitEscrow() ⇒ 換頁那一刻：所有輪次計時器被清、escrow 被沒收、arenaStats 記一筆 forfeit 敗局、toast 說『已離開對戰，賭注不退還』，而 PiP 視窗仍停在半場的盤面上，像是卡住的活對戰。兩個子系統各自都『正確』，合起來讓 PiP 這個功能在對戰上完全不可用。看起來正常的原因：2026-09-07 之前 vsslot 根本走不到對戰（配對卡死 17 天），PiP 續播從來沒被真的走過一次；而修好之後沒人回頭檢查這條路。決定性旁證：game-frame.js:209/211 導出的 isPipActive(key) 正是判這件事該用的 API，全 repo 消費者為 0（grep 只命中宣告與導出）＝典型『容器沒有人用』。
- **重現**：① 進入任一 Slots Battle 打到第 2-3 輪。② 按外框工具列的 ⧉（子母畫面）——盤面移進右下 PiP，原位置出現『遊戲於子母畫面播放中』。③ 按底部導覽任一頁（例如大廳）。④ 立刻出現 toast『已離開對戰，賭注 NT$X 不退還』，PiP 裡的分數從此不再變動；devtools：HL.state.get().arenaStats.history[0] → {forfeit:true, win:false}，HL.gameFrame.isPipActive() → true（PiP 仍作用中，只是遊戲已被殺）。⑤ 再按 PiP 的 × ⇒ 又跳一次『已關閉子母畫面（未完成的回合視為棄局）』。
- **建議修法**：離場鉤要問『我是不是被搬去 PiP 了』：if (HL.gameFrame && HL.gameFrame.isPipActive('vsslot:'+roomId)) return;（PiP 續播＝不是離場，錢與計時器都不動；真正的了結交給既有的 closePip → onTeardown）。同時 PiP 續播中的房間要留一條回頭路（房卡 CTA 讀 room._escrow 就會自然給『回到對戰』）。立鎖 games/arena/pip-continue-not-forfeit：(a) 源碼 —— vsslot 的 onExit 註冊區塊逐字含 isPipActive( 且該判斷排在 forfeitEscrow( 之前；(b) 反向錨 —— gameFrame 的導出必須含 isPipActive（拿掉 API 就紅）；(c) 消費者計數 —— 斷言 isPipActive( 在 prototype/src 中至少有一個非宣告命中（這條直接打掉『容器沒有人用』）。負向擾動：把 return 換成不 return（只記 log）必須紅，所以 (a) 要驗順序而不只驗字串存在。

### 75. [high / certain] resumeFrame 的提前 return 跳過 onExit 註冊與 timers/escrow 認領，回到 PiP 中的對戰＝一個沒有離場鉤的死畫面
- **位置**：`prototype/src/views/vsslot.js:566`
- **為什麼是錯的**：render(roomId) 的第一行就是 if (resumed) return resumed;，它在 room=findRoom / timers=[] / escrow 認領 / HL.shell.onExit(...) 全部之前。於是從 PiP 取回一場對戰之後：① 這一次掛載沒有任何離場鉤 ⇒ 下一次換頁 runExit 找不到東西可跑，已預扣的賭注被靜默沒收（不記敗局、無 toast）＝2026-08-21 修掉的那個原始缺陷從這條路完整復活；② escrow/room/root/timers 仍沿用上一次 render 的模組變數，若中間走過別的房間，指的就是別間房。同一形狀在 bounty.js:297 更明顯：那一行的註記寫『resumeFrame 續接原場故不在此路徑』，於是連 epoch++ 一起跳過——但它同時也跳過了 onExit(function(){epoch++;})，所以 PiP 取回後的賞金局殘留回呼一樣能寫到下一間房的 room/playEl（正是 #15 epoch 閘要擋的那件事）。看起來正常的原因：正常玩法很少『開 PiP → 換頁 → 再點同一間房』，而且 resumed 節點外觀完全正確。既有鎖 games/arena/exit-hook-settles-escrow 只斷言『vsslot 必須註冊離場鉤』（全檔有 HL.shell.onExit( 字串即綠），完全不管有幾條 render 路徑會繞過它。
- **重現**：① 進入 Slots Battle → 開 ⧉ PiP → 底部導覽回大廳 → 再從競技場點同一間房。② devtools：HL.shell.status 不存在，改用計數法 —— 在步驟①之前先包一層 var n=0, o=HL.shell.onExit; HL.shell.onExit=function(f){n++;return o(f);}; 然後走完①②，console.log(n) ⇒ 只會是 1（第一次進場），resumeFrame 那一次是 0。③ 此時再換頁：不會出現任何『已離開對戰／棄局』toast，而 HL.state.get().arenaRooms.filter(r=>r.id===<房id>)[0]._escrow 若仍存在，那筆錢就永遠掛在帳上沒人了結。
- **建議修法**：把『每一次掛載都必須做的登記』搬到 resumeFrame 之前，或在 resumed 分支內重做一次：room=findRoom(roomId); escrow=(room&&room._escrow)||0; 並照樣 HL.shell.onExit(...)（timers 不要重置成新陣列，否則反而丟掉正在跑的那批 id —— 這裡要的是沿用同一個 timers 陣列，正好是 resumeFrame 的語意）。bounty.js:297 同樣補 onExit 註冊（epoch++ 可維持不做）。立鎖 games/arena/every-mount-registers-exit：對 vsslot.js 與 bounty.js 的 render() 函式體做結構斷言 —— 所有 return 敘述之前必須已經出現 HL.shell.onExit(（做法：取 body(vs,'render')，找出每個 'return ' 的索引，斷言 min(returnIdx) > indexOf('HL.shell.onExit(')，只有『房間不存在／滿房』這兩個明確標註的早退例外可白名單且它們必須不持有 escrow）。負向擾動：把 onExit 那一行往下移一行到任何 return 之後即紅。

### 76. [high / certain] later() 的存活閘讀的是可變的模組變數 root（不是排程當下的快照），且 render() 只把 timers 換成新陣列不清舊的 ⇒ 同頁重繪後上一次 render 的計時器完全停不下來
- **位置**：`prototype/src/views/vsslot.js:60`
- **為什麼是錯的**：這正是本角度要找的空綠鎖。既有斷言只有一條：t.ok(/body\.contains\(root\)/.test(body(vs,'later')))，而它守的不變量宣稱是『同頁重繪後舊計時器不得繼續跑』。實際上 root 是模組層變數，同頁重繪會重跑 render() 並把 root 指到新節點，新節點是掛在文件上的 ⇒ 舊計時器開火時讀到的是新 root、contains 為真、閘直接放行。雪上加霜的是 render() 第 567 行寫 timers = []（不是 clearTimers()），舊那批 timer id 當場變成孤兒，之後任何路徑都清不掉它們。同頁重繪在對戰中非常好觸發：外框工具列 ⚙ → 金額顯示幣別（game-frame.js:69 直接 HL.app.refresh()）、i18n 切語系（i18n.js:191）、任何延遲檔載完（lazy-views.js:91/152、lazy-games.js:143/181）。後果：舊 commitCountdown 的 step 鏈會在玩家眼前是『配對中…』的畫面上跑到 k<=0 並執行 escrowTake(room.wager) —— 賭注在看不到封盤倒數的情況下被扣掉；緊接著舊鏈的 later(phaseGame,…) 用模組 root 把一整個對戰盤面畫進新畫面，再被新鏈的 phaseFound 蓋掉；舊鏈的 setBeat / classList.add('is-suspense'|'is-final-round') 也全部落在新 root 上。看起來正常的原因：runRound 自己另有一道正確的捕獲式守衛（!document.body.contains(sides[0].boardEl)），所以輪次迴圈確實會停，症狀只剩『餘額少一份 + 畫面閃一下 + data-beat 亂掉』，不像 bug 像網路卡頓。
- **重現**：① 進入 Slots Battle，在『配對成功』按下「接受對戰」，趁 3-2-1 承諾倒數還在跑時，② 按外框工具列 ⚙ → 把「金額顯示幣別」改成任一外幣（會呼叫 HL.app.refresh）。③ 畫面回到『配對中…等待玩家加入』；記下此刻 HL.state.get().balance。④ 等 1-3 秒 ⇒ 餘額自己少了一份 room.wager，且畫面會閃出一次對戰盤面又被配對畫面蓋掉。devtools 直接量：進入對戰後執行 var r0=document.querySelector('.ax-duel'); HL.app.refresh(); setTimeout(function(){console.log('舊 root 還在文件裡?', document.body.contains(r0), ' 但閘讀的是新 root ⇒ 放行');},50)。
- **建議修法**：later() 改成捕獲式：function later(fn, ms){ var owner = root; var t = setTimeout(function(){ if (!owner || (owner.ownerDocument && !owner.ownerDocument.body.contains(owner))) return; if (owner !== root) return; fn(); }, ms); timers.push(t); return t; } —— 兩個條件都要：owner 已脫離文件、或 owner 已不是當前那一次 render 的 root。同時 render() 第 567 行把 timers = [] 改成 clearTimers()（它自己就會清成空陣列），這樣孤兒 timer 在結構上不可能存在。立鎖 games/vsslot/timer-gate-is-snapshot：(a) 純邏輯 —— 把 later 的閘抽成純函式 aliveFor(owner, cur, attached) 並在 node 直接求值，斷言 aliveFor(A,B,true)===false（root 已被換掉就必須擋）、aliveFor(A,A,false)===false、aliveFor(A,A,true)===true；(b) 源碼 —— later 的函式體必須在 setTimeout( 之前出現 var <x> = root（快照），且 contains( 的引數不得是裸 root；(c) render 的函式體必須含 clearTimers() 且不得含 timers = [](裸賦值)。負向擾動要打在真正的不變量上：把 owner 換回 root（＝現況）必須被 (a) 的第一條與 (b) 同時抓到；只把 (b) 寫成『含 body.contains』就是現在這條空綠鎖。

### 77. [high / likely] 會員模式下 escrow／棄局整套是純客端幻覺：伺服器在開打前就結算完了，中途離場既沒沒收也沒損失，只留下一筆假的敗局與錯的餘額
- **位置**：`prototype/src/views/vsslot.js:99`
- **為什麼是錯的**：會員模式的流程是 commitCountdown → escrowTake（只動客端 HL.state.balance）→ phaseGame → HL.api.playBattle()，而 play_battle 是 security definer 的原子 RPC：它在被呼叫的那一刻就把 balance/arena_stats/wagered 全部更新完並插好 battle_history（phase7:158-164）。所以 ① 伺服器餘額是權威且已含本局結果，客端 escrow 只是暫時把顯示壓低一份注 ⇒ 玩家中途離場後下一次 hydrate（F5／重新登入，main.js:142 loadProfile）就把那份注原封還回來＝逃單零成本，而 escrow 存在的唯一理由就是要堵這個洞；② forfeitEscrow 會呼叫 HL.arenaStats.record({win:false, net:-lost, forfeit:true}) → statRecord → HL.api.recordBattle 又往 battle_history 插一列 ⇒ 同一場比賽在伺服器上有兩列（伺服器那列可能是勝、客端那列是敗），生涯戰績與餘額互相矛盾；③ 若玩家在高潮演出中離場，pendingSettle 在會員路徑被設成 0（finish() 傳 climaxThen(R.winnerIdx, 0, …)），escrowSettle(0) 不付錢、而權威的 R.balance 永遠不會被套上 ⇒ 贏了卻看到少一份注，直到下次 hydrate。看起來正常的原因：預設是 Demo 訪客模式，這條路平常跑不到；而所有相關的鎖（games/vsslot/escrow-equivalence、forfeit-is-honest）都只在純前端零和代數上驗恆等，對『伺服器已經結算過』這個前提完全沒有斷言。
- **重現**：需要部署了 phase4/7 的會員環境。① 登入會員 → 打 Slots Battle → 承諾倒數歸零（此時客端已扣一份注）→ 等『連線對戰伺服器…』消失（RPC 已回來＝伺服器已結算）。② 第 3 輪時用底部導覽換頁 ⇒ toast『賭注不退還』，devtools：HL.state.get().balance 少一份注、HL.state.get().arenaStats.history[0].forfeit===true。③ 按 F5（走 hydrateThenStart → loadProfile）⇒ 餘額回到伺服器權威值，那份注回來了，但步驟②那筆 forfeit 敗局還留在戰績裡。④ Supabase：select ts,mode,net,win from battle_history order by ts desc limit 2; ⇒ 同一場出現兩列（伺服器一列 + 客端 forfeit 一列）。
- **建議修法**：會員模式下不要用客端 escrow 假裝 commit：(a) 把 playBattle 的呼叫時機與 escrowTake 綁在同一個 commit 點（倒數歸零就打 RPC，並用 R.balance 立刻取代客端餘額，escrow 只在『RPC 尚未回來』的窗口存在）；(b) forfeitEscrow 在 memberMode && SRV 已取得時走 pendingSettle 路徑（據實套用 R.balance），絕不再插一列 forfeit —— 那場的權威紀錄伺服器已經寫了；(c) 真正的伺服器端棄局仲裁列進 BACKLOG（同 #104/#105 形狀）。立鎖 games/vsslot/member-mode-no-fake-forfeit：(a) 純邏輯 —— 抽一個 forfeitKind(memberMode, hasSrv, pendingSettle) 的純函式，斷言 (true,true,null) 回 'server-authoritative'（不記敗局、不沒收）、(false,false,null) 回 'forfeit'、(*,*,非 null) 回 'settle'；(b) 源碼 —— forfeitEscrow 內必須出現 memberMode（或等價的 SRV 判斷），且 HL.arenaStats.record 的呼叫被它包住；(c) 反向 —— 會員路徑不得有第二處動餘額（維持既有 takes/pays 各 1 的計數鎖）。

### 78. [medium / certain] arenaSim 的背景對戰自寫比較子：terminal 模式用累計總分判勝，熱度條／過程明細／hostEdge 全在錯的規則下累積
- **位置**：`prototype/src/views/arena.js:472`
- **為什麼是錯的**：simVsslot 只認 crazy 一種例外：r.mode === 'crazy' ? scores[k] < scores[best] : scores[k] > scores[best]。terminal 的判準是最後一輪增量（core/battle-mode.js SPECS.terminal.metric === 'last'），落到 else 分支就變成『總分最高勝』——正是 2026-08-21 船長回報的那個顯示 BUG 的同一個錯誤，只是搬到了背景模擬這第六個表面。後果：terminal 房的 r.log[].winner、熱度條（hostEdge/challEdge，arena.js:474）、房間過程明細（processModal）都在錯的規則下累積，玩家在房卡上看到的『房主優勢/挑戰者火熱』與該房宣告的勝負條件無關。既有鎖 games/arena/mode-semantics-single-truth 的反向錨只寫了 !/if \(rd\[k\] > rd\[leadIdx\]\)/ ——它認的是舊那一種寫法而不是概念，所以這個新寫法（別名 scores/best、三元式）整條逃過，鎖全綠。這也是為什麼 P0 那種缺陷抓不到：所有 arena/vsslot 鎖都在比對特定字串或特定順序，沒有一條在問『這個檔裡還有沒有第二個能回答誰領先的地方』。
- **重現**：node -e "var s=require('fs').readFileSync('prototype/src/views/arena.js','utf8');var i=s.indexOf('function simVsslot');var b=s.slice(i,i+900);console.log(b.match(/r\.mode === .crazy.[\s\S]{0,90}/)[0]);var BM=require('./prototype/src/core/battle-mode.js');console.log('BM 說 terminal 用的量是', BM.spec('terminal').metric)" ⇒ 印出的比較子只分 crazy／非 crazy，而 BM 說 terminal 是 last。瀏覽器端：var r=HL.state.get().arenaRooms.filter(x=>x.type==='vsslot')[0]; r.mode='terminal'; r.seats=[{name:'A',av:'a'},{name:'B',av:'b'}]; r.done=0; for(var i=0;i<40;i++) HL.arenaSim.tick(); console.log(r.log) ⇒ winner 一律是總分高的那位，與 terminal 無關（log 裡的 scores 只有總分，連末輪增量都沒產生）。
- **建議修法**：simVsslot 產生逐輪分數（至少產出 last 一輪的增量）後改問 HL.battleMode：var entries = scores.map(function(t,i){return {i:i,total:t,last:lastDelta[i]};}); var best = HL.battleMode.rankBy(r.mode, entries)[0].i;。立鎖 games/arena/no-second-ranking-comparator：(a) 概念式反向錨 —— 對 views/arena.js 與 views/vsslot.js 掃『被 r.mode/mode 三元式包住的 < 或 > 比較』的正則（例如 /mode\s*===\s*["']crazy["'][^;]{0,120}[<>]/），命中即紅（這條就會抓到現在這一行，也會抓到未來任何別名寫法）；(b) 純邏輯 —— 把 simVsslot 的勝者判定抽成純函式在 node 求值，斷言 terminal 下 {total:1050,last:50} 必須輸給 {total:800,last:700}。負向擾動：把 rankBy 換回任何自寫比較子都會被 (a) 抓到，而不是只有『長得像舊寫法』的那一種。

### 79. [medium / certain] battleInfoModal 是模式語意的第五個表面，自寫「Crazy Mode（最低分勝）／Terminal Mode（末輪決勝）」而不問 battleMode
- **位置**：`prototype/src/views/arena.js:161`
- **為什麼是錯的**：battleMode 的官方措辭是 labelOf+winCondOf：'Crazy Mode' + '最低總分勝'、'Terminal Mode' + '最後一輪增量最高勝'。觀戰／私密房的資訊 modal 自己寫了一套『（最低分勝）』『（末輪決勝）』，並把未知模式硬寫成『標準模式』（battleMode 的退化路徑是 spec(mode) → normal，語意剛好相同，所以錯得看不出來）。這是 CLAUDE.md §4 點名的那個家族：同一條規則被多個表面各自渲染，改一處另一處把症狀遮掉——今天只是措辭不一致（同一間房在房卡寫『Crazy Mode』、在觀戰面寫『Crazy Mode（最低分勝）』、在對戰中 infoBar 寫『Crazy Mode：最低總分勝』），但只要哪天調整 winCond 的字，這裡就會靜默留下舊版說法。既有鎖 games/arena/tie-break-and-fairness 的反向錨是 !/Crazy Mode：總分最低者獲勝|Terminal Mode：最後一輪決勝/.test(vs) —— 它只掃 vsslot.js，而且只認那兩串已經被刪掉的字面，對 arena.js 的這一行完全沒有覆蓋。
- **重現**：node -e "var s=require('fs').readFileSync('prototype/src/views/arena.js','utf8');var i=s.indexOf('function battleInfoModal');console.log(s.slice(i,i+520).match(/\[.模式.[\s\S]{0,160}/)[0]);var BM=require('./prototype/src/core/battle-mode.js');['normal','crazy','terminal'].forEach(function(m){console.log(m, BM.labelOf(m), BM.winCondOf(m));})" ⇒ 三組措辭與 BM 的不一致。畫面上：在競技場找一間滿房或私密的 crazy 房 → 點卡（走 battleInfoModal）⇒『模式：Crazy Mode（最低分勝）』；同一間房若你已入座進去打，對戰中 infoBar 寫『Crazy Mode：最低總分勝』。
- **建議修法**：改成 ['模式', HL.battleMode.labelOf(r.mode) + '（' + HL.battleMode.winCondOf(r.mode) + '）']。把既有的反向錨從『掃 vsslot.js 的兩串字面』升級成『掃全 repo 的概念』：立鎖 games/arena/mode-copy-single-source —— 對 prototype/src 下所有檔案斷言字串 'Crazy Mode' 與 'Terminal Mode' 只准出現在 core/battle-mode.js 的 SPECS 內（其餘檔案零命中），同理 '最低總分'/'最後一輪' 這類勝負條件片語。負向擾動：在任何 view 裡寫回任何一種模式文案（不論措辭）都必須紅——這才是打在『只准一份文案』這個不變量上，而不是打在某一種舊寫法上。

### 80. [medium / certain / 已知] tieAtTop 有鎖在驗、卻零消費者：榜首平手時畫面謊稱有人「領先」並靜默抽籤，玩家看到相同數字卻拿到獎盃或敗局
- **位置**：`prototype/src/views/vsslot.js:304`
- **為什麼是錯的**：battle-mode.js:79 的 tieAtTop 註記自己寫著『UI 要據實顯示平手→公平抽籤而不是靜默給獎盃』，鎖 games/arena/tie-break-and-fairness 也逐項驗它的行為。但全 repo 的消費者是 0：grep tieAtTop 只命中 core/battle-mode.js 的宣告、vsslot.js:26 的轉接與測項本身；refreshStandings（vsslot.js:304）與 renderResult（vsslot.js:446）都沒有問過它。實際行為：refreshStandings 呼叫 rankBy 時不傳 tieRoll ⇒ 平手組維持席位順序 ⇒ 每一場開局（全員 cum=0）你都被標成『#1/N 領先』純粹因為你是席位 0，其他人卻同時顯示『並列第一』（gap===0 分支）——同一列裡『#3』和『並列第一』互相矛盾。而最終結算 finishLocal 是有傳 tieRoll 的（從 HL.fair 取），所以 terminal 局末輪雙 0（1v1 實測約 1.72%）會發生：對戰中全程顯示你領先、結算卡上兩邊都是 NT$ 0、獎盃卻可能給對手，而畫面上沒有任何一個字說明『平手已由可驗證抽籤裁決』。這就是本角度的核心症狀：鎖在驗一個沒人用的容器，所以永遠是綠的。
- **重現**：① node -e "var BM=require('./prototype/src/core/battle-mode.js');var t=[{total:0,last:0},{total:0,last:0}];console.log('tieAtTop=',BM.tieAtTop('terminal',t),' leaderIndex=',BM.leaderIndex('terminal',t),' rankBy 無 tieRoll 的第一名=',BM.rankBy('terminal',t).indexOf(t[0]))" ⇒ tieAtTop=2（是平手）但 leaderIndex=0（謊稱席位 0 領先）。② 瀏覽器：進入任一 Slots Battle，在第一輪起轉之前截圖 ⇒ 你的席位已經是『#1/2』+『領先』、對手是『#2/2』+『並列第一』，而此刻兩邊都是 NT$ 0。③ grep -rn tieAtTop prototype/src ⇒ 只有宣告與轉接，沒有任何表面呼叫。
- **建議修法**：refreshStandings 與 renderResult 都先問 var tied = BM.tieAtTop(room.mode, entries)；tied>0 時：領先高亮改成全部平手者一起亮（或都不亮）、gapEl 寫『並列第一（平手將由公平抽籤裁決）』、rankEl 對平手組顯示同一個名次（#1= 而不是 #1/#2）；結算卡在 tied>0 時加一行『平手 → 可驗證公平抽籤（tieRoll=…）』。立鎖 games/arena/tie-is-disclosed：(a) 消費者計數 —— 斷言 tieAtTop( 在 prototype/src/views 下至少 2 個非註解命中（這一條直接把『容器沒有人用』變成不可能）；(b) 純邏輯 —— 把『名次字串』抽成純函式 rankLabel(mode, entries, i) 在 node 求值，斷言全 0 的 2 人局兩邊拿到同一個標籤、且不含『領先』；(c) 反向 —— 非平手時 rankLabel 必須回不同名次（零回歸）。負向擾動：把 (a) 的呼叫刪掉、或把 rankLabel 改回 order.indexOf(e)+1 都會紅。

### 81. [medium / certain] 節拍單一真相只做了一半：fgboard 仍自寫 6 個裸常數、ms("roll")/ms("drop")/speedOf() 零實際消費者，且真站的 ultra 夾制對轉輪完全無效
- **位置**：`prototype/src/views/fgboard.js:77`
- **為什麼是錯的**：battle-tempo.js 的檔頭自己列出它要取代的對象就是『vsslot 的 1500/500/700/380×sp、fgboard 的 820/800/650/250/400/80×SP』，並宣告『禁止再在 view 裡寫裸毫秒』。但鎖 games/arena/tempo-beats 只讀 views/vsslot.js，從來沒讀過 fgboard.js ⇒ fgboard 至今仍是第二份真相：animateRoll 的 (0.5 + r*0.08)*SP 與 +90（第 77/81 行）、tumbleAnim 的 0.38*SP 與 400*SP（第 106/107 行）、cascade 的 650*SP（第 121 行）全是裸常數；對應的 BEATS.roll(900) 與 BEATS.drop(400) 因此變成沒人驅動動畫的死值——ms('roll') 全 repo 唯一命中是 vsslot.js:425 拿它當『這一輪花了多久』的估算，而真正的轉輪是 500-820ms，所以 liveRoundPad 的『每輪 ≥2500ms』是拿一個假的耗時去補，補出來的量與事實無關。更嚴重的是夾制方向：ms() 內部有 if (live && s < SPEED.fast) s = SPEED.fast（真站不給 ultra，對標 UKGC 禁 turbo/slam-stop），但 vsslot 自己另寫了一份 speed()（vsslot.js:160，硬寫 0.35/0.6/1，讓 battle-tempo 導出的 speedOf 也變成零消費者），並把**未經夾制的原始 SP** 直接餵給 fgBoard.create({animSpeed: sp})（vsslot.js:361）⇒ 真站開 ultra 房時，結構拍確實被夾住了，轉輪與落下卻照 0.35× 跑。這是典型『不變量只有一個方向』：夾制寫在 ms() 這一個出口上，但另一條路（原始 sp 傳進元件）沒有人擋。
- **重現**：① node -e "var T=require('./prototype/src/core/battle-tempo.js');console.log('真站 ultra 的 roll 被夾成', T.ms('roll',0.35,{live:true}), '（=fast 540）');var s=require('fs').readFileSync('prototype/src/views/fgboard.js','utf8');console.log('fgboard 裸常數:', (s.match(/[\d.]+ ?\* ?SP/g)||[]));console.log('fgboard 有問 battleTempo 的地方:', (s.match(/battleTempo\.[a-zA-Z]+/g)||[]))" ⇒ 裸常數清單非空，而 battleTempo 只被用來取 popMs。② 瀏覽器：切真站（localStorage HL_SITE_MODE='live' 後 reload）→ 開房時打開『超快旋轉 Ultra』→ 進對戰第一輪 → devtools：document.querySelector('.ax-reel__strip').style.transition ⇒ 'transform 0.175s …'（0.5×0.35），而 HL.battleTempo.ms('roll',0.35,{live:true}) 回 540ms ⇒ 兩份真相互相矛盾，且真站確實吃到了 ultra。
- **建議修法**：(a) fgboard 的每一拍改問 battleTempo：roll 用 T.ms('roll',SP)（含跨轉輪錯開一併搬成一個 beat）、落下用 T.ms('drop',SP)、hold 用 T.ms('dwell_*')/popMs，這樣 BEATS.roll/drop 才真的有消費者；(b) 速度只留一個出口 —— vsslot 的 speed() 改成 HL.battleTempo.speedOf(room.prefs)，並且該出口自己做真站夾制（把 ms() 內的 live 夾制上移到 speedOf，ms() 保留為冪等），這樣『傳給元件的 sp』與『用來算拍的 sp』必然同一個值；(c) liveRoundPad 改吃實際量到的耗時（各席位 spin 回呼的時間差）而不是 ms('roll')。立鎖 games/arena/tempo-covers-fgboard：(a) 源碼 —— views/fgboard.js 不得出現 /[0-9.]+\s*\*\s*SP/（把 tempo-beats 的『不得寫裸毫秒』延伸到第二支檔）；(b) 消費者計數 —— 斷言 BEATS 裡每一個 struct=false 的拍名在 prototype/src 至少有一個 ms('<name>' 的命中（零消費者的拍即紅，這條會同時抓到 roll/drop）；(c) 純邏輯 —— 斷言 speedOf({ultra:true},{live:true}) === SPEED.fast（夾制搬到 speedOf 之後，任何拿 sp 去乘的地方都自動安全）。負向擾動：把夾制留在 ms() 而 speedOf 不夾，(c) 立刻紅；只把 fgboard 的某一個裸常數改回去，(a) 立刻紅。

### 82. [medium / certain] isBusyView 是「是否遊戲頁」的第二份真相：缺 chicken／liveroom ⇒ 房間結算 modal 會蓋在進行中的小雞回合／直播下注上
- **位置**：`prototype/src/views/arena.js:480`
- **為什麼是錯的**：main.js 的 VIEWS 登錄表已經把『是否遊戲頁』做成一列資料（isGame: true，共 7 個：liveroom/bounty/vsslot/duel/slot/chicken/game），enterView 也是問它（main.js:66）。arena.js 的 isBusyView 卻自己硬寫了一份五元素清單 v==='vsslot'||'bounty'||'duel'||'slot'||'game'，漏掉 liveroom 與 chicken。後果：你自己開的賞金房到期時 endMyRoom → isBusyView() 回 false → 直接 settlement() 彈 modal，蓋在小雞過馬路的在途回合（有真實在途押注、伺服器 chicken_step 狀態機）或直播間的下注窗上；而 flushSettlements 那條排隊路徑（本來就是為這件事設計的）反而用不到。看起來正常的原因：chicken 與 liveroom 都是 2026 後期才進 VIEWS 的 isGame 名單，isBusyView 沒有跟著改；而房間到期需要等 30-60 分鐘，日常驗證幾乎不會撞上。全 347 條鎖沒有一條在守『isGame 只准有一份定義』——BACKLOG #93（導覽入口註冊表 HL.nav）正是為這類第二份真相開的卡，但這一處不在它的射程內。
- **重現**：① Demo 模式進競技場 → 開房（賞金局，任意參數）→ 回大廳。② devtools 把它催熟：HL.state.get().arenaRooms.filter(function(r){return r.mine;})[0].endsInSec = 2;。③ 立刻 HL.router.goGame('chicken')（或從娛樂城點小雞過馬路），開始一局並走幾步。④ 兩秒內『我的房間結算 · 賞金局』modal 直接蓋在小雞盤面上（正確行為應該是排進 settleQueue，等回大廳/競技場再彈）。⑤ 對照：node -e "var s=require('fs').readFileSync('prototype/src/main.js','utf8');var g=(s.match(/^\s+(\w+):\s+\{[^}]*isGame: true/gm)||[]).map(function(x){return x.trim().split(':')[0];});var a=require('fs').readFileSync('prototype/src/views/arena.js','utf8');var b=a.slice(a.indexOf('function isBusyView'),a.indexOf('function isBusyView')+180);console.log('VIEWS isGame:',g);console.log('isBusyView 認得:',(b.match(/\"(\w+)\"/g)||[]))" ⇒ 兩份清單不一致。
- **建議修法**：把判斷收斂到登錄表：main.js 導出 HL.router.isGameView = function(v){ return !!(VIEWS[v] && VIEWS[v].isGame); }（或直接進 BACKLOG #93 的 HL.nav），arena.js 的 isBusyView 改成 return HL.router.isGameView(HL.state.get().view);。立鎖 platform/is-game-view-single-truth：(a) 消費者 —— arena.js 不得出現 v === \"vsslot\"（或任何 view id 的字面比較）；(b) 純邏輯 —— 從 main.js 的 VIEWS 用 new Function 取出 isGame 名單，斷言它與『任何自稱在判遊戲頁的函式』的名單逐項相等（做法：把 isBusyView 的 body 求值，對 VIEWS 的每個 key 比對兩者結論）；(c) 反向 —— 把新的 view 加進 VIEWS 並標 isGame 時，(b) 自動涵蓋（不需要改鎖）。負向擾動：往 isBusyView 補一個硬寫清單（即使內容目前正確）也必須紅，因為守的是『只准一份定義』而不是『這份清單今天對不對』。

### 83. [medium / certain] battle_history 的 mode 欄有兩個寫入者、兩種語意，且 loadHistory 沒有站別過濾 ⇒ 真站的戰績與回放會列出 demo 場次
- **位置**：`prototype/src/core/api.js:46`
- **為什麼是錯的**：phase7（docs/supabase-phase7.sql:50）把 battle_history.mode 定義成**站別**（'demo'|'live'，default 'demo'），伺服器的 play_battle 也是這樣寫（phase7:162-164 用 v_site）。但客端的 recordBattle（api.js:56）寫的是 mode: rec.mode ——那是**玩法模式**（'normal'/'crazy'/'terminal'）。同一個欄位同時裝著兩種東西，而且沒有 CHECK 約束會抱怨。第二層：loadHistory（api.js:46）只 .eq('user_id', u.id)，完全沒有站別條件 ⇒ main.js:142 hydrate 時，真站會把 demo 站打的每一場都灌進 arenaStats.history，於是真站的『Slots Battle 戰績與回放』列出 demo 的場次與淨額（CLAUDE.md §4 明說 phase7 之後『戰績/大獎牆真分離，不再靠客端遮罩』——這條路沒做到）。看起來正常的原因：回放只讀 payload（裡面 payload.mode 才是真正的玩法模式），所以畫面渲染完全正常、沒有 NaN、沒有 console 錯誤；唯一的症狀是『真站的戰績裡有一些你在假站打的場次』，而這在假資料為常態的原型裡看不出來。哪一條鎖該紅？沒有——現有的 arena/vsslot 鎖全部只驗客端純數學與源碼形狀，沒有一條在驗 api.js 的讀寫是否帶站別。
- **重現**：① node -e "var s=require('fs').readFileSync('prototype/src/core/api.js','utf8');var h=s.slice(s.indexOf('function loadHistory'),s.indexOf('function recordBattle'));console.log('loadHistory 有站別過濾?', /mode/.test(h));var r=s.slice(s.indexOf('function recordBattle'),s.indexOf('function playBattle'));console.log('recordBattle 寫進 mode 欄的是:', (r.match(/mode:\s*[^,]+/)||[])[0])" ⇒ 前者 false、後者 'mode: rec.mode'（玩法模式）。② 已部署 phase7 的會員環境：在假站打一場（或用 forfeit 觸發客端 recordBattle）→ select ts,mode from battle_history order by ts desc limit 3; ⇒ 同一張表裡同時有 'demo'/'live'（伺服器寫的）與 'normal'/'crazy'（客端寫的）。③ 切真站後 F5 → 開『戰績與回放』⇒ 列出你在假站打的場次。
- **建議修法**：(a) recordBattle 改寫站別：mode: (HL.site && HL.site.mode) ? HL.site.mode() : 'demo'，玩法模式本來就已經在 payload.mode 裡（回放讀的就是那個），不需要佔用這一欄；(b) loadHistory 補 .eq('mode', HL.site.mode())；(c) SQL 端加 check (mode in ('demo','live')) 讓語意錯誤在寫入時就炸，而不是靜默混進表裡。立鎖 platform/battle-history-site-scoped：(a) 源碼 —— api.js 中凡是 from('battle_history') 的 select 都必須含 .eq(\"mode\"（用同一個計數法：select 次數 === 帶 mode 過濾的次數）；(b) 純邏輯 —— 抽一個 historyRow(rec, siteMode) 純函式，斷言回傳物件的 mode 欄恆為 'demo'|'live' 且與 rec.mode（玩法模式）無關（喂 rec.mode='crazy'、siteMode='live' 必須得到 'live'）；(c) 反向 —— 斷言 payload 內仍保有玩法模式（零回歸，回放要用）。負向擾動：把 (a) 的過濾拿掉、或把 (b) 的 mode 改回 rec.mode 都必須紅。

> 掃過但判定沒問題／無法驗證：【本角度的核心回答：9 條競技場鎖在 P0 那個破壞下會不會紅】逐條檢視 prototype/tests/checks-games.js（現況 347 項全綠，run.js 只有 fast/deep 兩層、無 DOM 層）：

- games/vsslot/contract-and-resolve（794）：純數學 resolve/rankBy 的零和與三模式正確性。P0 是 mountView 的**求值順序**，與純數學無關 → 不會紅。
- games/vsslot/pvp-fairness（828, deep）：同上，只是蒙地卡羅版 → 不會紅。
- games/arena/tempo-beats（3114）：只斷言 vsslot.js 裡有哪些 beat 名字與 data-beat 字串、以及不得有裸毫秒。P0 之下這些字串全在（節拍表沒被動過），而遊戲根本跑不到第一輪 → 不會紅。
- games/arena/in-play-standings（3144）：斷言 refreshStandings 走 BM.* 且有「已完成/進行中」字串。全是源碼包含 → 不會紅。
- games/arena/exit-hook-settles-escrow（3180）：**P0 之前它是全綠的，而且它的斷言正是 P0 的近旁**——舊版驗的是「有註冊 onExit／runExit 排在 HL.dom.clear 之前／跑完清空」，這三件在 P0 下**全部成立**。它抓不到，因為缺陷在**呼叫端把節點先建好**（mountView(def.render(s)) 參數先求值），那是 node 沒有 DOM 也跑不了 renderApp 的求值順序問題。2026-09-07 補的三條（只收工廠／傳節點要 throw／呼叫端一律傳函式）才把它變成寫不出來——這是 9 條裡唯一現在會紅的。
- games/arena/tie-break-and-fairness（3244）：純數學 tie-break + 源碼有 tieRoll/HL.fair 字串 → 不會紅（而且它驗的 tieAtTop 零消費者，見 finding 9）。
- games/game-frame/close-pip-tears-down（3275）：只讀 closePip 的源碼形狀 → 不會紅。
- games/arena/battle-single-charge（3296）：驗建房端不扣款、escrowTake 出現位置在 commitCountdown 之後、字串計數為 2。P0 下 escrowTake 仍在原位（只是永遠跑不到）→ 不會紅。
- games/vsslot/forfeit-is-honest（3341）、games/arena/room-cta-not-stale（3382）、room-net-single-truth（3463）、mode-semantics-single-truth（3493）、escrow-equivalence（3536）：全部是源碼字串／順序／純數學，沒有一條在驗「相位會不會推進」。
共同的結構性原因：**這 13 條鎖沒有任何一條的斷言主體是「行為」**——它們驗的是「檔案裡有沒有這串字」「這串字排在那串字前面」「純函式的輸入輸出」。而 P0 是「模組 A 呼叫模組 B 的參數求值時機」造成的行為缺陷，三種斷言都碰不到。

【應該有鎖但沒有（每條都給 node 可成立的判準）】
1. 「view 自己註冊的離場鉤不得被同一次掛載開火」——已補（三條形狀鎖），但缺**概念式**版本：把 mountView 的 body 抽成純函式並在 node 用假的 build/clear/runExit 記錄呼叫序列，斷言 序列 === ['stopAll','runExit','clear','build']。這樣改名字、加中介函式都擋得住，而不是只擋現在那種寫法。負向擾動：把 build() 搬到 runExit 之前，序列鎖立刻紅（形狀鎖只在「傳的是節點」時才紅，改寫成 var n = build(); ... mountView-ish 的內聯版本就逃掉了）。
2. 「每一次掛載都必須完成同一組登記」——見 finding 4：對 render() 的所有 return 位置與 onExit 註冊位置做索引比較，比「全檔有沒有 onExit 字串」強一個量級。
3. 「配對相位一定會推進到下一相位」——node 可成立的做法：把 vsslot 的相位表抽成純資料（PHASES = [{from:'searching',to:'found',beat:'match_search'}, {from:'found',to:'commit'}, {from:'commit',to:'game',charge:true}]），render/phase* 只當它的執行器；然後鎖 (a) 圖是連通的、每個非終端相位恰有一條出邊；(b) charge:true 的邊恰好一條且它的 from 是 'commit'；(c) 用一個假時鐘（把 later 換成把 {fn,ms} 推進佇列的注入版）在 node 跑完整條鏈，斷言最終抵達 'game' 且 escrowTake 被呼叫恰一次。這條就是 P0 的直接對打面：清理殺掉第一個計時器時，假時鐘會停在 'searching' → 紅。
4. 「房卡按鈕的可加入性必須與當下 seats 一致」——已有（room-cta-not-stale），但缺**釋放方向**（finding 2）與**原地更新的完整性**：對 battleCard 產生的每一個「會隨時間變的節點」列一張清單（席位格／人數／CTA／倒數／熱度／賞金池），斷言 updateCard 的 body 對每一個都有對應的更新語句。順帶抓到的低優先缺口：bountyCard 的「賞金池」數字（arena.js:53）在 updateCard（arena.js:505-507）裡沒有被更新，只有時間/次數/熱度有——因為 tick 每秒有 18% 機率整格重繪（struct=true），實測只會停留幾秒，故未單獨立案。
5. 「金流出口計數」已有（takes/pays 各 1），但缺「站別標記出口計數」（finding 1）與「戰績寫入出口計數」（finding 6/12：伺服器與客端可能對同一場各插一列）。
6. 「排名／模式語意只准一份」要從『掃特定字面』升級成『掃概念』（finding 7/8 的 fix 有正則與消費者計數兩種寫法）。
7. 「節拍表的每一拍都必須有真的消費者」（finding 10 的 (b)）——這一條會同時抓到 roll/drop 兩個死拍與 speedOf 零消費者，屬於本專案 §4 第 ⑤ 型（容器沒有人用）的機械化偵測，可直接套到 battle-mode（tieAtTop）與 gameFrame（isPipActive）。

【掃過但判定沒問題的地方】
- app-shell.js mountView / runExit / dropExit 的新形狀本身正確：工廠簽章 + throw、rerender 走 dropExit、一次性清空、順序 stopAll → runExit/dropExit → clear → build 都成立；main.js:85 的呼叫端確實傳函式，renderApp 不自行 runExit，renderAuthView 有補 runExit。
- battle-mode.js 的純數學（metricOf/better/rankBy 的平手分組與輪轉、tieAtTop 的計數、barFrac 的反向歸一、gapTo 的方向）逐項手算與 node 求值皆正確，未知模式退化成 normal 也正確。
- vsslot 的 escrowTake 冪等、markEscrow 寫進 room._escrow、render 改為認領而非清零、pendingSettle 在 climaxThen 第一拍之前就記下、escrowSettle 清 pendingSettle：這五件在**純前端 Demo** 路徑上是自洽的（問題只在會員模式，見 finding 6）。
- noSeatFor / joinability / battleCta / cardAction 的純判定語意正確（滿房、私密、我開的房、我已入座、缺 seats 的舊房都對），updateCard 的 CTA 選擇器 .ax-btn-join, .ax-btn-watch 涵蓋 battleCta 的全部四種回傳。
- replayModal 的 laterR 有正確的捕獲式存活閘（document.body.contains(bars[0].fill)），stopR 在關閉時被呼叫；runRound 的守衛（sides[0].boardEl）也是捕獲式的、且排在扣款/推進之前。
- fgboard 的 --ax-pop-life 確實把同一個數字餵給 CSS（components.css:1798 animation 用 var(--ax-pop-life,700ms)），JS/CSS 兩份時長的舊債已結。
- instant-duel.js 的 pending/settlePending/onExit 三件是自洽的（且它在 P0 之下不會壞：hook 被同一次掛載開火時 pending 還是 null、timers 還是空，屬於「碰巧倖存」）。bounty.js 的 epoch 閘同理倖存。

【我無法驗證的地方】
- 任何需要瀏覽器真的合成影格的事：轉輪/落下/彈分/灰化/獎盃的實際觀感、is-reveal/is-eliminated/is-champion 的 transition 是否真的推進、以及 finding 5/3 的「畫面閃一下」的視覺程度。headless 下 CSS transition 不推進、screenshot 逾時（CLAUDE.md §9）。
- 需要已部署 Supabase phase4/6/7 的三條：finding 1 的真站/假站經濟列實測、finding 6 的 F5 後餘額回復與重複 history 列、finding 12 的 battle_history.mode 混雜。我只能從 SQL 檔的函式簽章與 api.js 的呼叫端推出結論（兩邊都逐字讀過，簽章與參數缺漏是確定的；只有「伺服器上的實際資料長相」沒有實機證據）。
- multi-client 行為（對手也逃單、伺服器端預扣仲裁）：現況純前端 escrow 只能約束自己這一端，這一點檔內註記已誠實記載，我沒有另立 finding。

## UI/CSS/自適應/可用性（競技場・Slots Battle・房卡・配對／對戰／回放樣式）

### 84. [high / certain] 配對成功畫面在 3/4 人房於窄螢幕橫向溢出，且被 body{overflow-x:hidden} 靜默裁掉（JS 有 ax-mm__vs--multi，CSS 從未寫）
- **位置**：`prototype/src/styles/components.css:1786`
- **為什麼是錯的**：`.ax-mm__vs` 是 `display:flex` 且**沒有 flex-wrap**（預設 nowrap），子項 `.ax-mm__p` 有 `min-width:130px`（≤480px 收成 110px）⇒ flex-shrink 打不下去。4 人時最小需求＝4×110（卡）+3×~30（VS 徽章）+6×16（gap）≈ 626px，而 390–480px 手機的可用寬度只有 ~424px（480 − .ax-main padding 12×2 − .ax-mm padding 16×2）；3 人也已經 ~454px > 424px。base.css:28 的 `body{overflow-x:hidden}` 讓它**不產生捲軸、直接裁掉**，而 `.ax-mm{align-items:center}` 又讓它左右各裁一半 ⇒ **第 1 席與第 4 席的 `.ax-mm__ok`「✔ 已接受」被切掉**，玩家在「賭注將於歸零時扣款」的畫面上看不到誰已接受，而畫面上其餘部分（✅ 配對成功、接受/拒絕鈕）完全正常，所以不像壞掉、只像「排版比較擠」。證據是修法的意圖曾經存在：`views/vsslot.js:205` 掛了 `ax-mm__vs--multi` 這個修飾類，但 `grep -n ax-mm__vs--multi prototype/src/styles/*.css` **零命中**——該修飾類要承載的 wrap 規則從來沒被寫出來（§4 家族「修一半而看不出來」的 CSS 版）。
- **重現**：在 preview（或線上）把視窗寬度設成 390px，然後在 devtools 貼：  
  var host=document.querySelector('.ax-main')||document.body;  
  var w=document.createElement('div'); w.className='ax-mm ax-mm--found';  
  var r=document.createElement('div'); r.className='ax-mm__vs ax-mm__vs--multi';  
  for(var i=0;i<4;i++){ if(i){var b=document.createElement('div');b.className='ax-mm__vsbadge';b.textContent='VS';r.appendChild(b);} var p=document.createElement('div');p.className='ax-mm__p '+(i?'opp':'me'); p.innerHTML='<div class="ax-mm__av">🦊</div><b>Lucky小明</b><span class="ax-mm__ok">✔ 已接受</span>'; r.appendChild(p);}  
  w.appendChild(r); host.appendChild(w);  
  console.log('flexWrap=',getComputedStyle(r).flexWrap);            // 'nowrap'  
  console.log('need/have=',r.scrollWidth,'/',r.clientWidth);        // scrollWidth 明顯大於 clientWidth  
  console.log('rect=',JSON.stringify(r.getBoundingClientRect()));   // left 為負 ＝ 已被裁到畫面外  
  console.log('第1席可見寬=',r.children[0].getBoundingClientRect().right);  
  w.remove();  
  真流程版：競技場 → 開房 → Slots Battle → 人數選「1v1v1v1」→ 建立對戰 → 等「✅ 配對成功！」，在 390px 寬下數得到的頭像卡不足 4 張。
- **建議修法**：在 `.ax-mm__vs` 加 `flex-wrap: wrap`（並讓 `.ax-mm__vsbadge` 在換行時可省略）；把「幾人房怎麼排」收成**一個**出口——既然 `views/vsslot.js:205` 已經在標 `ax-mm__vs--multi`，就把 N>2 的排版規則（wrap／min-width 降階／VS 徽章隱藏）全部寫在 `.ax-mm__vs--multi` 這一條上，而不是散在 `.ax-mm__vs` 與 ≤480 media（components.css:2193）兩處。順帶立一條常駐鎖：「JS 掛出去的 `ax-mm__*` 修飾類必須在 CSS 有對應規則」，並用負向擾動（把該規則改名）證明它會紅。

### 85. [medium / certain] tokens.css 明文承諾的「760 以下 Slots Battle 盤面收單欄」對 1v1v1／1v1v1v1 是死規則——被後面沒包 media 的 .ax-vs--n3/--n4 蓋掉
- **位置**：`prototype/src/styles/components.css:1861`
- **為什麼是錯的**：層疊順序：`@media (max-width:760px){ .ax-vs--fg{grid-template-columns:1fr} }` 在 **1588 行**，而 `.ax-vs--n3`（1860）/`.ax-vs--n4`（1861）**不在任何 media 裡、行號更後面、特異度相同（0,1,0）**。media query 不加特異度 ⇒ 後者恆勝。真正把 n3/n4 收單欄的規則在 1906 行的 `@media (max-width:720px)`。結果是 **721–760px 這一段** 的 1v1v1v1 仍然套 `1fr auto 1fr auto 1fr auto 1fr` 七條軌；而 `.ax-vs__side` 沒有 `min-width:0`（1545），grid 的 `1fr`＝`minmax(auto,1fr)` 不得小於 min-content（含 `.ax-vs__total` 30px 數字與 44px 頭像），四席最小需求約 838px ⇒ 在 736px（iPhone 8/7/6s Plus 橫向就是 736）上外側兩席被 `body{overflow-x:hidden}` 裁掉且**沒有捲軸**。看起來正常是因為：中間兩席與 infoBar／勝負條件全都在畫面內，只是「有兩個對手不見了」，而 1v1（`ax-vs--n2` 無 CSS，吃 base 的 `1fr auto 1fr`）在 ≤720 是正常單欄，所以只有多人房才露出。tokens.css:60 還把 760 記成「單一參考來源的刻意例外」⇒ 台帳承諾與現況不符。
- **重現**：把視窗寬度設成 736px（或 750px），devtools 貼：  
  var d=document.createElement('div'); d.className='ax-vs ax-vs--fg ax-vs--n4'; document.body.appendChild(d);  
  console.log('736px 下 n4 的軌數 =', getComputedStyle(d).gridTemplateColumns.split(' ').length);  
  // 期望 1（tokens.css:60 承諾 760 以下收單欄）；實際會印出 7  
  d.className='ax-vs ax-vs--fg ax-vs--n2';  
  console.log('n2 =', getComputedStyle(d).gridTemplateColumns.split(' ').length); // 3（base 的 1fr auto 1fr）  
  d.remove();  
  再把寬度改成 719px 重跑，n4 會變 1 ⇒ 證明壞掉的區間就是 721–760px。  
  真流程版：以 736px 寬跑一場 1v1v1v1（開房→人數 1v1v1v1→建立→接受→倒數結束），對戰畫面只看得到中間兩席。
- **建議修法**：讓「幾人房在什麼寬度收單欄」只有一個出口：把 n3/n4 的多欄軌宣告改成**與 --fg 例外同一個 media 邊界**（例如 `@media (min-width:761px){ .ax-vs--fg.ax-vs--n3{...} .ax-vs--fg.ax-vs--n4{...} }`），或把 761 以下的收欄規則寫進同一條 `.ax-vs--fg` 區塊並提高特異度（`.ax-vs--fg.ax-vs--n4`）。同時給 `.ax-vs__side` 加 `min-width:0`（否則 761–840px 一樣會溢出，只是不在「刻意例外」的承諾範圍內）。立鎖方式：headless 讀 components.css，斷言「每個 `.ax-vs--nN` 的多欄宣告，其後不存在比 ≤760 收欄規則更晚且無 media 的同特異度覆蓋」，並以負向擾動（把 1861 搬回 media 外）證明會紅。

### 86. [medium / certain] 房卡 CTA 按鈕每 1000ms 被 replaceChild 整顆換掉（無條件），鍵盤焦點每秒被丟回 body ⇒ 大廳無法用鍵盤穩定操作
- **位置**：`prototype/src/views/arena.js:513`
- **為什麼是錯的**：`main.js:137` 用 `setInterval(HL.arenaSim.tick, 1000)`，`tick()` 在非結構變動時對每一張可見房卡呼叫 `updateCard`；`updateCard` 的對戰分支**不比較狀態就無條件** `cta.parentNode.replaceChild(battleCta(r), cta)`（513）與 `sg.parentNode.replaceChild(seatRow(r), sg)`（509）。DOM 節點被移除時，若它是 `document.activeElement`，焦點會退回 `<body>` ⇒ 使用者 Tab 到「加入 NT$1,000」後不到一秒焦點就消失，下一次 Tab 從文件開頭（header）重新開始，等於**永遠無法用鍵盤停在那顆鈕上**；螢幕閱讀器也會每秒被打斷。這是 2026-09-07 修「滿房仍寫加入」時新引進的副作用：功能面完全正確（狀態不再 stale），所以測項全綠、滑鼠使用者也毫無感覺（點擊即使卡在 mousedown/mouseup 之間被換掉，`click` 也會派送到共同祖先 `.ax-room-card`，而它的 onClick 正好也是 `cardAction(r)`）——只有鍵盤/AT 這條路徑會壞。
- **重現**：進入競技場（線上或本機），devtools 貼：  
  var b=document.querySelector('.ax-room-card__foot .ax-btn-join'); b.focus();  
  console.log('t=0 focused?', document.activeElement===b, b.textContent);  
  setTimeout(function(){ console.log('t=1.2s activeElement =', document.activeElement.tagName, document.activeElement.className); }, 1200);  
  // 印出 BODY（空 className）＝焦點已被 replaceChild 丟掉  
  手動版：在競技場一直按 Tab，會發現焦點每約 1 秒被彈回頁首，永遠走不到房卡的「加入」鈕。
- **建議修法**：把「CTA 需不需要重建」變成可判定的純函式並只在**答案改變時**才動 DOM：讓 `battleCta` 額外回一個狀態鍵（例如 `cardAction` 的分支名 + 顯示金額），在按鈕上寫 `data-cta-state`，`updateCard` 先比對 `cta.dataset.ctaState !== nextState` 才 replace；不變時只更新 `textContent`。`.ax-seat-grid` 同理（比對 `filled/cap/席位名` 的簽名）。這樣「可加入性單一出口」保留，但穩定期零 DOM 抽換。立鎖：連續呼叫兩次 `updateCard(r)` 而房間狀態不變時，第二次不得替換節點（比對 replace 前後的節點 identity）。

### 87. [medium / certain] 承諾倒數期間「拒絕」鈕被設 disabled 卻完全沒有 disabled 視覺（.ax-btn-ghost 沒有 :disabled 規則，且 :hover 還會亮起）
- **位置**：`prototype/src/styles/components.css:485`
- **為什麼是錯的**：`views/vsslot.js:218` 在按下「接受對戰」後同時對 acceptBtn 與 declineBtn 下 `setAttribute("disabled","")`。`.ax-mm__accept` 走 `.ax-btn-primary`，而 `.ax-btn-primary:disabled`（476）有 `opacity:.5; cursor:not-allowed; filter:grayscale(.4)` ⇒ 會變灰。但「拒絕」是 `.ax-btn-ghost`，全 repo **沒有任何 `.ax-btn-ghost:disabled`、也沒有通用 `button:disabled`／`[disabled]` 規則**（`grep -n disabled prototype/src/styles/*.css` 只有元件各自的 `:disabled`，base.css 一條都沒有），而 base.css:36 的 `button{cursor:pointer}` 與 components.css:485 的 `.ax-btn-ghost:hover{border-color:var(--ax-purple)}` **對 disabled 元素照樣生效**（`:hover` 匹配 disabled 元素）⇒ 那顆鈕仍是滿亮、仍是手指游標、滑過還會變紫邊，但點下去什麼都不會發生（disabled 元素不派送 click）。看起來正常卻是錯的關鍵在於**不對稱**：旁邊的接受鈕確實灰掉了，於是玩家會理解成「只有接受被鎖住，拒絕還可以按」——而這 3 秒（ultra 2.1 秒）正是唯一還沒扣款、還來得及反悔的窗口，倒數歸零 `escrowTake` 就把賭注收走。競技場規格 §1「開打前確認」明文要求「控件改 disabled 而非隱藏（讓玩家看見鎖住了）」，語意那一半做了，視覺那一半沒有。
- **重現**：開一場對戰 → 按「接受對戰」→ 在 3 秒倒數期間 devtools 貼：  
  var btns=[].slice.call(document.querySelectorAll('.ax-mm__actions button'));  
  btns.forEach(function(b){ var cs=getComputedStyle(b); console.log(b.textContent, '| disabled=',b.disabled, '| opacity=',cs.opacity, '| cursor=',cs.cursor, '| filter=',cs.filter); });  
  // 「拒絕」→ disabled=true / opacity=1 / cursor=pointer / filter=none  
  // 「接受對戰」→ disabled=true / opacity=0.5 / cursor=not-allowed / filter=grayscale(0.4)  
  b=btns.filter(function(x){return x.textContent==='拒絕';})[0]; b.click(); // 無任何反應、也不返回競技場
- **建議修法**：補一條通用降級規則，讓「disabled」的視覺只有一份真相：`button:disabled, [role="button"][aria-disabled="true"] { opacity:.45; cursor:not-allowed; filter:grayscale(.5); }`，並把各元件現有的 `:disabled` 收斂成只覆寫差異；同時把 hover 規則一律改成 `:hover:not(:disabled)`（`.ax-btn-ghost:hover`、`.ax-btn-join:hover`、`.ax-gfbtn:hover`、`.ax-room-card:hover` 都要）。立鎖：掃 components.css，任何有 `:hover` 的按鈕 class 若在 JS 裡曾被 `setAttribute("disabled")`，就必須存在對應的 `:disabled`（或被通用規則覆蓋），並用負向擾動（刪掉通用規則）證明會紅。

### 88. [medium / certain] 消除動畫的時長 JS 與 CSS 各寫一份：clear 拍 250ms×SP 對上 CSS 固定 0.3s，fast/ultra 下消除只播到 50%／29% 就被清場
- **位置**：`prototype/src/styles/components.css:1708`
- **為什麼是錯的**：`views/fgboard.js:126` 加 `.is-removing` 觸發 `.ax-sym.is-removing{ animation: ax-sym-remove 0.3s ... forwards }`（固定 300ms，**不隨速度縮放**），但 127–128 行只等 `T.ms("clear", SP)` 就進 `tumbleAnim` → `drawStatic` → `HL.dom.clear(container)` 把那些格子整批換掉。`clear` 拍是演出拍（非 struct）⇒ 常速 250ms、fast 150ms、ultra 88ms，三檔**全都短於 300ms**。這正是 2026-08-21 已經為「彈分」修過的同一個形狀（`popup()` 用 `--ax-pop-life` 把同一個數字餵給 CSS，`.ax-fgb__pop` 也寫成 `animation: ax-popwin var(--ax-pop-life,700ms)`），但消除這一拍沒有跟著遷移 ⇒ 家族④「JS 與 CSS 各寫一份時長」還留著第二個入口。看起來正常是因為：符號確實消失了、連爆確實接上了，缺的只是「縮小/淡出」那段中間影格，而預設值就是 fast（`arena.js:657` `fast:true`），所以幾乎沒人見過完整的消除動畫、也就沒有對照組。
- **重現**：node 端就能證明數字對不上：  
  cd D:/機動專案/House-Light新平台  
  node -e "var T=require('./prototype/src/core/battle-tempo.js'); [1,0.6,0.35].forEach(function(s){ console.log('SP='+s, 'JS 等待 ms =', T.ms('clear', s, {live:false}), ' vs CSS 動畫 300ms'); });"  
  // SP=1 → 250 / SP=0.6 → 150 / SP=0.35 → 88，三者都 < 300  
  grep -n 'ax-sym-remove' prototype/src/styles/components.css   # 1708：固定 0.3s  
  grep -n 'is-removing' prototype/src/views/fgboard.js           # 126：加 class；128：只等 T.ms('clear',SP)  
  瀏覽器版（照 CLAUDE.md §9 掛 view 的配方）：跑一場對戰，在 cascade 命中時抓 `document.querySelector('.ax-sym.is-removing')`，它的 `getAnimations()[0].effect.getTiming().duration` 恆為 300，而該節點在 150ms（fast）後就已不在 document 內。
- **建議修法**：比照 `--ax-pop-life`：`popup()` 之外再加一個 `--ax-clear-life`，由 `T.ms("clear", SP)` 在 JS 端 `setProperty` 到容器上，`.ax-sym.is-removing` 改成 `animation: ax-sym-remove var(--ax-clear-life, 300ms) ...`；或反過來把 `clear` 拍設成不縮放的單一常數（比照 `popMs()`）並讓 CSS 讀它。原則一致：**同一段時長只能有一個定義處**，view 端只允許問 `HL.battleTempo`。立鎖：掃 fgboard.js + components.css，斷言所有由 JS 計時驅動的 `.ax-sym`/`.ax-fgb__*` 動畫，其 CSS `animation` 時長必須是 `var(--ax-*-life)` 形式（不得是字面秒數），負向擾動＝把 `var()` 換回 `0.3s` 必須紅。

### 89. [low / certain] 節奏表的 drop 拍（400ms）零消費者：fgboard.tumbleAnim 仍自己寫 400*SP 與 0.38*SP，roll 拍也是第二份真相
- **位置**：`prototype/src/views/fgboard.js:106`
- **為什麼是錯的**：`core/battle-tempo.js` 的檔頭明令「view 內禁止再寫裸毫秒」，`intel/arena-battle-spec-2026-08-21.md` §3 也寫「禁止 vsslot.js/fgboard.js/bounty.js 各自硬寫」，而「節拍收進 core/battle-tempo.js」在該檔的『已落地』清單裡是 ✅。但實測 `BEATS.drop`（400ms）**沒有任何呼叫點**：`grep -rn 'ms("drop"' prototype/src prototype/tests` 零命中，落下時長仍是 fgboard.js:106 的 `0.38 * SP` 秒（transition）＋ 107 的 `400 * SP`（timeout）兩個裸常數；`roll`（900ms）也只被 `vsslot.js:425` 拿去算真站補時，實際滾輪長度是 fgboard.js:77/82 自己算的 `(0.5 + r*0.08)*SP` 與 `820*SP+90`。這是家族⑧「容器沒有人用」：常數表建好了、測項（checks-games.js:3124）也確認 11 個拍名字串存在於原始碼裡，但 `drop` 不在那 11 個之列，所以**沒有任何一條鎖會發現它零消費者**；而畫面上落下動畫照跑，完全看不出來有兩份真相。副作用已可量到：`vsslot.js:425` 用 `T.ms("roll",sp)` 當每輪已花時間，fast 下算 540ms 而 fgboard 實際滾 582ms，真站每輪下限因此系統性多補 ~42ms/輪。
- **重現**：cd D:/機動專案/House-Light新平台  
  node -e "var T=require('./prototype/src/core/battle-tempo.js'); console.log('drop 拍存在:', JSON.stringify(T.beats().drop));"   # {\"ms\":400,\"struct\":false}  
  grep -rn 'ms(\"drop\"' prototype/src prototype/tests   # 零命中 ＝ 零消費者  
  grep -n '0.38 \* SP\|400 \* SP' prototype/src/views/fgboard.js   # 106、107 兩個裸常數  
  grep -n '0.5 + r \* 0.08\|0.08) \* 1000 \* SP' prototype/src/views/fgboard.js  # 77、82：roll 的第二份真相  
  node -e "var T=require('./prototype/src/core/battle-tempo.js'); console.log('T.ms(roll,0.6)=',T.ms('roll',0.6,{live:false}),' fgboard 實際=',820*0.6+90);"  # 540 vs 582
- **建議修法**：把 fgboard 的 `0.38*SP`／`400*SP` 改成 `T.ms("drop", SP)`（transition 秒數由同一個毫秒數推出，或改成 CSS 變數讓 CSS 讀），滾輪長度新增 `roll_stagger` 拍後由 `T.ms("roll",SP)` + `T.ms("roll_stagger",SP)*r` 組出，讓 `vsslot.js:425` 的真站補時吃到的就是真值。並把既有的拍名檢查（checks-games.js:3124）從「白名單字串出現過」升級成**雙向**：① 每個 `BEATS` 鍵至少有一個 `ms("<name>"` 呼叫點（或明確標 internal，如 `pop` 由 `popMs()` 消費）② fgboard/vsslot/bounty 三檔的 `setTimeout`／`transition` 不得出現字面毫秒/秒數。負向擾動：把任一拍改回裸常數必須紅。

### 90. [low / certain] 2026-08-21 競技場那批 CSS 自稱「不新增色值」，卻引進了兩處冒牌 gold rgba(255,200,87)（全檔其餘 23 處都是 --ax-gold 的 255,181,36）
- **位置**：`prototype/src/styles/components.css:1568`
- **為什麼是錯的**：components.css:1563 的區塊註記寫「顏色與字級全部走既有 token（不新增色值、不硬寫 px）」，但同區塊的 1568（`.ax-vs__rank.is-lead` 背景）與 1581（`.ax-vs__side.is-champion` 光暈）用了 `rgba(255,200,87,…)` ＝ #ffc857，而 tokens.css 的 `--ax-gold` 是 #ffb524、`--ax-gold-2` 是 #ffcd5b，兩者都不是它。全 components.css 的 gold 半透明光暈共 23 處用 `rgba(255,181,36,…)`（含同一批的 `.ax-seat.filled.me`）——這 2 處是唯一的例外。看起來正常是因為它就在 `color: var(--ax-gold); border-color: var(--ax-gold)` 的同一行裡，肉眼看不出 #ffc857 與 #ffb524 的差別；但一旦調整 `--ax-gold`（真金模式換主色、或做亮色主題），領先徽章與冠軍光暈會**不跟著變**，而別的金色都變了 ⇒ §3 台帳裡「token 侵蝕：冒牌 gold 色大量繞過 --ax-gold」這條債被同一輪重新種回去。
- **重現**：cd D:/機動專案/House-Light新平台/prototype/src  
  grep -n '255, *200, *87' styles/components.css        # 只有 1568、1581（皆屬 2026-08-21 競技場區塊）  
  grep -c '255, *181, *36' styles/components.css        # 23（＝--ax-gold #ffb524 的正確寫法）  
  grep -n 'ax-gold:' styles/tokens.css                  # --ax-gold: #ffb524; --ax-gold-2: #ffcd5b  
  瀏覽器驗：devtools 在 :root 上把 --ax-gold 改成 #00ff00，領先席位的 `.ax-vs__rank.is-lead` 文字/邊框變綠，**背景仍是金色**；`.ax-vs__side.is-champion` 的 inset 邊變綠、外圈 24px 光暈仍是金色。
- **建議修法**：把兩處改成 `color-mix(in srgb, var(--ax-gold) 18%, transparent)`（或新增一個 `--ax-gold-glow: rgba(255,181,36,.35)` 之類的單一光暈 token 並讓 23 處一起用它），使「金色」只有一個定義處。既有的死 token 鎖（checks-platform.js 的 `--ax-*` 消費端掃描）只管 token 有沒有人用、不管有沒有人繞過它 ⇒ 建議補反向鎖：components.css 內不得出現與 `--ax-gold`/`--ax-purple`/`--ax-red` 相鄰但數值不同的硬寫 rgba（白名單化目前的 23 處基準值），負向擾動＝再塞一個 rgba(255,200,87) 必須紅。

### 91. [low / likely] .ax-mm__actions 是全 repo 唯一沒有替 .ax-btn-ghost 補寬度覆寫的 flex 容器 ⇒「拒絕」比主 CTA「接受對戰」還寬
- **位置**：`prototype/src/styles/components.css:1795`
- **為什麼是錯的**：`.ax-btn-ghost` 的基底是 `width:100%`（477–484），這在 grid/縱向堆疊裡是對的，但放進 `display:flex` 的橫向列會讓它的 flex-basis 解析成容器 100%、把次要動作撐成主角。這個 repo 早就知道這件事，並在**每一個**橫向 flex 容器補了覆寫：`.ax-task`（1214 `width:auto;flex:0 0 auto`）、`.ax-mine__btns`（1541 `width:auto;flex:1`）、`.ax-lstat__foot`（2090）、`.ax-tny__actions`（2655）、`.ax-ops__actions`（3065）、`.ax-vsh__replay`（1818）、`.ax-btn-watch`（1854）。`.ax-mm__actions{display:flex;gap:…}`（1795）**沒有**，而它的兩個子項正是「拒絕」（ghost，width:100%）與「接受對戰」（`.ax-mm__accept`，1796 明確 `width:auto`）⇒ shrink 之後 ghost 的最終寬度大於 primary，破壞破壞性動作 < 主動作的視覺層級。這也是 apexwin-ui-quality skill 收錄的三個真實反例之一（「CTA width:100% 撐成長條」）。看起來正常是因為兩顆鈕都在畫面上、字都讀得到，只有「哪一顆看起來像主鈕」被反轉。
- **重現**：開一場對戰 → 停在「✅ 配對成功！」畫面 → devtools 貼：  
  var a=document.querySelector('.ax-mm__actions');  
  console.log(getComputedStyle(a).display);   // flex  
  [].forEach.call(a.children, function(b){ console.log(b.textContent, '| CSS width=', getComputedStyle(b).width, '| 實測 px=', Math.round(b.getBoundingClientRect().width)); });  
  // 「拒絕」的實測寬度大於「接受對戰」  
  對照：對同一顆 ghost 鈕臨時下 `a.querySelector('.ax-btn-ghost').style.cssText='width:auto;flex:0 0 auto'`，層級立刻回正。
- **建議修法**：補 `.ax-mm__actions .ax-btn-ghost { width:auto; flex:0 0 auto; }`（與 `.ax-task` 同一種寫法）。更根本的做法是把「ghost 在橫向列裡的寬度」變成一個出口而不是七個：讓 `.ax-btn-ghost` 不再自帶 `width:100%`，改由 `.ax-btn-block`（或容器級 `.ax-btn-row > *`）決定滿版與否，然後把現有七處覆寫刪掉。立鎖：掃 components.css，任何 `display:flex` 的容器若其後代選擇器會命中 `.ax-btn-ghost`／`.ax-btn-primary`，就必須存在寬度覆寫；負向擾動＝刪掉 `.ax-task` 那條必須紅。

### 92. [medium / certain / 已知] updateCard 的賞金局分支從不刷 .ax-room-card__prize：賞金池每秒被 simBounty 推進，卡上金額卻是進場那一刻的凍結值
- **位置**：`prototype/src/views/arena.js:507`
- **為什麼是錯的**：`bountyCard`（arena.js:55）把 `money(r.prizePool)` 印在 `.ax-room-card__prize > b` 上，`tick()` 每秒有 15–28% 機率呼叫 `simBounty(r)` 推高 `r.prizePool`，但 `updateCard` 的 bounty 分支（505–507）只更新 `[data-room-time]`、`.ax-rc-done`、`.ax-heat` 三處 ⇒ 賞金池數字永遠不動。看起來正常是因為熱度條與挑戰次數**確實在動**（同一張卡上有三個會動的東西），玩家會認定卡片是即時的；而點進房間後 `bounty.js` 讀的是同一個 `r.prizePool`，於是**大廳寫 12,000、房內寫 18,400**，錢的顯示自相矛盾。2026-09-07 那一輪把對戰分支的 stale 問題（席位/CTA）修掉了，但賞金局分支一行未動 ⇒ 同一個缺陷型態只修了一半。`intel/arena-battle-spec-2026-08-21.md`「仍待做 §5 #7」已記載此條。
- **重現**：進入競技場，devtools 貼：  
  var r=HL.state.get().arenaRooms.filter(function(x){return x.type==='bounty';})[0];  
  var card=document.querySelector('[data-room-id="'+r.id+'"]');  
  var before=card.querySelector('.ax-room-card__prize b').textContent;  
  r.prizePool += 99999;                 // 模擬 simBounty 推進賞金池  
  HL.arenaSim.tick();                   // 走一次完整 tick（非結構變動 → 只跑 updateCard）  
  console.log('卡上：', before, '→', card.querySelector('.ax-room-card__prize b').textContent);  
  console.log('資料：', r.prizePool);  
  // 卡上兩個值相同、資料多了 99999 ＝ 凍結；同時 .ax-heat 與 .ax-rc-done 都刷新了  
  手動版：在競技場放著看一分鐘，某張賞金卡的「挑戰次數」會從 3/20 走到 6/20、熱度條會左右移動，但「賞金池」數字一次都不變；點進去房內的賞金池比卡上大。
- **建議修法**：把「房卡上會隨模擬變動的欄位」列成一份清單並由**同一個出口**重繪（例如 `refreshCardFields(card, r)` 內對 bounty 走 `[time, done, heat, prize, playsLeft]`、對 battle 走 `[time, seats, count, cta]`），而不是兩個分支各自手挑幾個 querySelector；並比照第 3 條 finding 只在值改變時才動 DOM。立鎖：對一個 mock 房間逐一擾動每個「會被 sim 改的欄位」，斷言 `updateCard` 後卡片上對應文字都變了——負向擾動＝把 prize 那一行註解掉必須紅（現在的鎖不會紅，因為沒有人斷言 prize）。

### 93. [low / certain] 建立對戰精靈的四個偏好開關是無名、無狀態的 <button>：既無 aria-label／可見文字，也無 aria-pressed，鍵盤與螢幕閱讀器讀不出它是什麼、開或關
- **位置**：`prototype/src/views/arena.js:649`
- **為什麼是錯的**：`prefRow` 產生的是 `el("button", { class:"ax-tgl" ... }, [el("span",{class:"ax-tgl__k"})])`——子節點只有一個純裝飾的滑塊 span，**沒有文字、沒有 title、沒有 aria-label**，開關狀態只由 `.on` class（＝純視覺的 `transform:translateX(18px)` 與背景漸層）表達，**沒有 aria-pressed／aria-checked**。可見標籤「快速旋轉 Fast Spins」等文字在旁邊的 `.ax-prefrow__txt` 裡，但沒有 `<label for>`／`aria-labelledby` 把它們關聯起來。所以 Tab 過去只會聽到四個「按鈕」，無法得知是哪一項、也無法得知現值——而其中兩項（Fast/Ultra）會直接改變整場對戰的節奏、一項（私密房）會改變別人能不能加入。這在本 repo 裡是**孤例而非慣例**：`aria-pressed` 已在 `core/ui.js`(3)、`layout/app-shell.js`(5)、`core/fav.js`(2)、`views/bounty.js`(1)、`core/table.js`(1)、`views/liveroom.js`(1)、`views/instant-crash-mines.js`(1) 共 14 處使用，`aria-label` 全庫 39 處（同子系統的 `views/game-frame.js:44` 每顆工具鈕都有）⇒ 是這一支漏了，不是專案沒這個標準。看起來正常是因為滑鼠使用者一眼就懂，而 `:focus-visible`（base.css:54）也確實會畫出焦點環——只是環裡那個東西沒有名字。另外 `renderPrefs`（arena.js:722）用 `tgs[0]`／`tgs[1]` 的 DOM 索引綁 fast/ultra，任何一天在這四列之間插入新列都會靜默切錯開關。
- **重現**：競技場 → 開房 → 選 Slots Battle → 進入「建立對戰 · Create Battle」，devtools 貼：  
  console.table([].map.call(document.querySelectorAll('.ax-tgl'), function(b,i){ return { i:i, text:JSON.stringify(b.textContent), ariaLabel:b.getAttribute('aria-label'), title:b.getAttribute('title'), ariaPressed:b.getAttribute('aria-pressed'), role:b.getAttribute('role'), on:b.classList.contains('on') }; }));  
  // 四列全部 text="" / ariaLabel=null / title=null / ariaPressed=null ＝ 無名無狀態  
  對照：console.log(document.querySelector('.ax-gfbtn').getAttribute('aria-label'));   // game-frame 的工具鈕有名字  
  鍵盤版：從搜尋框開始按 Tab，會依序停在四個沒有可讀名稱的按鈕上；按 Enter 只有滑塊視覺移動，AT 不會播報任何狀態變化。
- **建議修法**：`prefRow` 改成 `el("button", { class:"ax-tgl", role:"switch", "aria-checked": get()?"true":"false", "aria-label": label, ... })`，並在切換處同時更新 `aria-checked`（與 `.on` class 同一個出口，別再各寫一次——否則就是第 5 條 finding 的同型缺陷）。順帶把 `renderPrefs` 的 `tgs[0]/tgs[1]` 索引綁定改成用 `data-pref="fast"|"ultra"` 查，去掉 DOM 順序耦合。立鎖：掃所有 views/core，任何 `el("button", …)` 若其 children 不含文字節點，就必須帶 `aria-label` 或 `title`；負向擾動＝拿掉 `.ax-gfbtn` 的 aria-label 必須紅。

### 94. [medium / certain] 「這是我的房間」有兩份真相：頁籤篩選與 CTA 都已改問 isMineRoom/iAmSeated，但房卡的金框 is-mine 仍鎖在 r.mine（自建對戰房恆為 false）
- **位置**：`prototype/src/views/arena.js:130`
- **為什麼是錯的**：`createBattle` 明確寫死 `mine: false`（arena.js:735），2026-09-07 那一輪為此新增了 `iAmSeated()`／`isMineRoom()`，並把 `visibleRooms()`（177）、`battleCta()`（118–122，回「回到對戰 ›」）、`cardAction()`（126）三處都改成問席位。但 `battleCard` 產生根節點時仍是 `class: "ax-room-card is-vs is-battle" + (r.mine ? " is-mine" : "")`（130）⇒ `.ax-room-card.is-mine{outline:2px solid var(--ax-gold)}`（components.css:1442）這個「這張是你的房」唯一視覺標記，對你自己開的 Slots Battle 房**永遠不會出現**；而同一張卡的 CTA 又寫著「回到對戰 ›」、「我的房間」頁籤也確實列出它。同一個問題在同一張卡上被兩個表面用兩套判準回答，正是 §4 點名的家族①。看起來正常是因為金框只是加分項、缺了不會報錯，而賞金局自建房（`openRoom` 於 637 行寫 `mine:true`）金框是正常的 ⇒ 只有對戰房這一支壞，且要兩種房型並排才看得出來。附帶：`updateCard` 也從不重算這個 class，所以就算日後 `mine` 會變也不會刷新。
- **重現**：競技場 → 開房 → Slots Battle → 建立對戰（會直接進對戰畫面）→ 用左上「‹ 返回競技場」回大廳，devtools 貼：  
  var r=HL.state.get().arenaRooms.filter(function(x){ return x.type==='vsslot' && (x.seats||[]).some(function(s){return s&&s.name==='你';}); })[0];  
  var card=document.querySelector('[data-room-id="'+r.id+'"]');  
  console.log('r.mine =', r.mine);                                    // false  
  console.log('金框 is-mine =', card.classList.contains('is-mine'));   // false ← 沒有標記  
  console.log('outline =', getComputedStyle(card).outlineStyle);       // none  
  console.log('CTA 說 =', card.querySelector('.ax-btn-join').textContent);  // 「回到對戰 ›」← 但這裡承認是你的  
  // 再點「我的房間」頁籤：這張卡確實被列出來（isMineRoom 為 true）＝三個表面兩套答案  
  對照：先用「開房」建一個賞金局，它的卡有金色外框（因為 openRoom 寫 mine:true）。
- **建議修法**：把 130 行改成 `+ (isMineRoom(r) ? " is-mine" : "")`，並讓 `joinability()` 回傳的 `mine` 也走 `isMineRoom(r)` 而不是 `!!r.mine`（101 行現在是後者，只是 `seated` 分支先命中所以行為正確——這就是家族②「不變量只有一個方向」：seated 認得你，mine 不認得你）。更乾淨的做法是消滅雙軌：`createBattle` 直接寫 `mine: true`，並確認 `battleCta` 的 `j.mine` 分支（「我的對戰」disabled）不會蓋掉 `j.seated` 分支（順序上 seated 在前，安全）。立鎖：建一個 `mine:false` 但席位含「你」的對戰房，斷言（a）它出現在 mine 頁籤（b）房卡帶 `is-mine`（c）CTA 是「回到對戰 ›」三者同時成立；負向擾動＝把 130 行改回 `r.mine` 必須紅（現有的 `games/arena/room-cta-not-stale` 只驗 (c)，所以今天全綠）。

> 掃過但判定沒問題／無法驗證：【掃過但判定沒問題的地方】

1. **JS↔CSS class 對帳（雙向全掃）**：對 `views/arena.js`、`vsslot.js`、`bounty.js`、`instant-duel.js`、`fgboard.js`、`game-frame.js` 逐檔抽出所有 `ax-*` 字面，比對 `styles/{base,components,tokens}.css`。JS 有而 CSS 無的只有：`ax-mm__vs--multi`（已報，finding 1 的證據）、`is-battle`（arena.js:130，全庫零 CSS／零 JS 查詢＝純死 class，但無任何行為影響，故不單獨報）、`ax-gfbtn__i`／`ax-gfcur__c`（game-frame.js:24/44 的裝飾 span，無 CSS 亦無影響）、`ax-rc-done`／`ax-duel-balance`（刻意的 JS 查詢鉤，非樣式）、`ax-vs--n`（動態拼 `"ax-vs--n"+n`，n=2 時 `ax-vs--n2` 無 CSS 但吃 base 的 `1fr auto 1fr` 正確）。反向（CSS 有而無人用）只掃到 `.ax-vs__ctl`／`.ax-vs__spin`，且兩者只存在於 components.css:1553 的「已移除」註記裡，不是活規則 ⇒ **競技場沒有真正的死樣式**。

2. **既有鎖不是空殼**：`tests/checks-games.js:3104-3136`／`3345-3369`／`3575-3584` 的節奏鎖確實用 `setBeat("…")` 的字面順序判拍序（並在 3577 行留了「不要用 T.ms 的位置判順序」的教訓註記），`checks-platform.js:4855`／`6100-6180` 的死碼／根元素契約鎖都有雙向反向錨。唯一的方向性缺口是 **class 層的 JS→CSS 對帳刻意沒有落地**（checks-platform.js 對 token 掃描的註記明說「class 大量動態拼接 ⇒ 必然假陽性、不落地」），這是有意識的取捨、不是漏。

3. **無問題項**：`.ax-btn-join:disabled`（1443）有完整 disabled 樣式且晚於 `:hover`（302）⇒ 灰化生效；`.ax-room-card` 經 `HL.dom.pressable` 補了 `role="button"`+`tabindex=0`+Enter/Space（core/dom.js:45），`.ax-bcard` 遊戲選卡同樣 pressable ⇒ **建房與加入用純鍵盤走得通**（唯一障礙是 finding 3 的焦點被秒殺與 finding 10 的無名開關）；base.css:54 的全域 `:focus-visible` 帶 `!important`，蓋得過各元件的 `outline:none`；`.ax-sym` 用 `aspect-ratio` 無固定寬 ⇒ 盤面在窄欄會等比縮不會硬撐；`.ax-vs__board .ax-sym`（0,2,0）勝過 ≤720 的 `.ax-sym`（0,1,0）⇒ 迷你盤字級在手機是刻意保留、非誤覆蓋；`.ax-duel__top`／`.ax-battle__info`／`.ax-seat-grid` 都有 `flex-wrap:wrap` ⇒ 4 人席位列在 480px 單欄卡內會正常換行；`.ax-result__actions--3`（1841）與其 ≤560 單欄降階（1843）都存在；`.ax-heat` 的 gold/red 語意與標籤方向一致；`.ax-bsearch__in` 13px 由 base.css `@media (pointer:coarse)` 夾到 ≥16px ⇒ iOS 不會自動縮放。

【我無法驗證的地方】

- **所有「畫面實際被裁掉多少 px」的量**：preview 面板隱藏時瀏覽器不合成影格、`computer{action:"screenshot"}` 逾時（CLAUDE.md §9），本輪全程未開 preview。finding 1／2 的溢出量是用 CSS 明文的 `min-width:130px/110px`、`padding: --ax-space-4/5`、`gap: --ax-space-6/4` 與 tokens.css 的實際 px 值手算的**下界**（不含文字實測寬），層疊順序與 `flex-wrap:nowrap`／`overflow-x:hidden` 三項事實是原始碼可確定的；因此 finding 1 標 certain（min-width 一項就已超出可用寬）、finding 2 的「軌數」標 certain 而「裁掉哪幾席」屬推算。
- **finding 8 的最終像素寬**：flex 的 `width:100%` 在 shrink-to-fit 容器裡如何解析有引擎差異，我只能確定「`.ax-mm__actions` 是唯一沒補覆寫的橫向 flex 容器」這個結構事實，故標 likely。
- **會員（後端）模式**：所有 repro 都在 Demo 假站下推導；`core/api.js` 的 `playBattle/recordBattle/loadHistory` 路徑我只讀不跑，伺服器 payload 造成的顯示問題（spec §5 #1/#2 的「戰績 NaN」）不在本角度、也未複驗。
- **實機觸控**：`.ax-tgl`（44×26px）、`.ax-seat`（38×38）、`.ax-gfbtn`（36×32）都低於常見 44px 觸控下限，但 apexwin-ui-quality skill 未載明此門檻、專案亦無對應 token 或鎖 ⇒ 判定為「純視覺推測」，刻意不報。
- 未修改任何檔案（只讀）。`node prototype/tests/run.js` 未執行（本輪為稽核，不動工作區）。
