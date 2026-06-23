# ApexWin 任務佇列（Backlog）

**這是「一項一項往下做」的執行清單。** 策略全貌見 [ROADMAP.md](ROADMAP.md)。

工作方式：
1. 每日 Routine「apexwin-daily-next-step」把建議寫進下方「分析師日誌」，並把新任務放進「任務佇列」標 `⬜待批准`。
2. 你批准後，負責實作的 Claude 把該項移到 `🏗️進行中` → 做完標 `✅完成`（附 commit 短碼與日期）。
3. 預設依佇列由上往下做；你可隨時插隊或調整順序。

狀態：`⬜待批准` · `🟦已批准待做` · `🏗️進行中` · `✅完成`
原則：體驗/速度 > 資安；需牌照的功能不進此佇列（留在 ROADMAP 的 ⏸️DEFER）。

---

## 任務佇列（依優先序）

1. ✅ **Wave 1：留存基礎** — 收藏/我的最愛 + 每日簽到 streak + 底部死按鈕通電 + 縮圖 lazy-load　`(15101e5, 2026-06-22)`
2. ✅ **統一 instant 引擎 `HL.instant`** — 共用下注面板 + ½·2×·Max + 手動/自動下注(局數/贏後+%/輸後+%/止盈/止損/Turbo)　`(2026-06-22)`
3. ✅ **Dice + Limbo**（掛統一引擎，1% 莊家優勢，手動+自動）— 可玩遊戲 2 → 4 款　`(2026-06-22)`
4. ✅ **Crash + Mines**（互動式回合：Crash 倍數爬升+自動兌現；Mines 翻格累乘+兌現）— 可玩 4 → 6 款　`(2026-06-22)`
5. ✅ **Plinko**（8 排落球 + Low/Med/High 風險 + 9 倍數槽）— **originals 五天王補滿**，可玩 6 → 7　`(2026-06-22)`
6. ✅ **留存三件套**：VIP 等級(押注累積→5 段位+升級獎金) + 每日任務/成就(中央事件掛鉤) + 獎金錢包/領取中心　`(2026-06-22)`
7. ✅ **百家樂 / 輪盤 RNG 桌** → 主播跟注接真開獎 — M　`(2026-06-23)`
   - 7a：✅ **共用 RNG 桌引擎 `HL.table` + 百家樂**（莊/閒/和+閒對/莊對、真補牌規則、結算+掛 HL.liveStats.record）可玩 7→8　`(2026-06-23)`
   - 7b：✅ **輪盤 Roulette**（歐式單零、直注 35:1/紅黑·單雙·大小 1:1/打·列 2:1，複用 `HL.table`）可玩 8→9　`(2026-06-23)`
   - 7c：✅ **主播跟注接真開獎**（streamer.js PiP：Math.random→`HL.baccarat` 真桌、跟注真扣/派 HL.money、掛 liveStats）`(2026-06-23)`
   - 7d：✅ **全頁直播間 `liveroom.js` 跟注也接真桌**（同 7c：真扣真派、HL.baccarat 真桌、退回未結算）`(2026-06-23)`
8. ✅ **Rakeback 返水**即時回饋（綁等級係數）— `HL.rakeback` 掛 liveStats 中央點、VIP 面板查看/領取　`(2026-06-23)`
9. ✅ **真實累積彩金 Jackpot**（三級 MEGA/MAJOR/MINI 即時遞增 + 命中演出，`HL.jackpot` 掛 liveStats 中央點）— M　`(2026-06-23)`
10. ✅ **通知中心**（`HL.notify` 接 header 🔔 紅點 + 通知中心 Modal，VIP 升級/彩金中獎自動推播）— M　`(2026-06-23)`
11. ✅ **遊戲卡「試玩 / 真錢」雙鈕**（試玩直接啟動；真錢閘控真金模式/待牌照）— S　`(2026-06-23)`
12. ✅ **搜尋排序 + 最近遊玩**（防抖搜尋 + 推薦/熱門/最新/A-Z 排序 + 🕘 最近遊玩區，`HL.games.recent`）— S　`(2026-06-23)`
13. ✅ **i18n 輕量引擎 + 語言切換器**（`HL.i18n` t(key,def)、繁/簡/英、接 🌐，chrome 已在地化）— S　`(2026-06-23)`
14. ⬜ **PWA**（manifest + Service Worker）— M

> 更大型（紅利/流水引擎、運動博彩、Crazy Time、錦標賽、Provably Fair、營運後台）見 ROADMAP 🔵LATER，做完上面再升級進佇列。

---

## 分析師日誌（每日 Routine 追加，最新在上）

- **2026-06-23（#12 + #13）** — 一次做兩項。**#12 搜尋排序+最近遊玩**：`games.js` launch 中央點記錄最近遊玩（localStorage，`HL.games.recent`），娛樂城預設頂部加 🕘 最近遊玩區；搜尋加 220ms 防抖；分類/搜尋結果牆加排序控制（推薦/熱門/最新/A-Z）。**#13 i18n 輕量引擎+語言切換器**：新增 `core/i18n.js`（`HL.i18n`，`t(key,def)→DICT[lang]||def`，預設 zh-Hant 免建字典），header 🌐 死按鈕通電＝切換器（繁中/簡中/English，寫 localStorage+設 `HL.lang`+`HL.app.refresh`）。已在地化 header/底部列/娛樂城 chrome；其餘畫面逐步擴充（字典加 key 即可）。驗證：#12 最近遊玩最新在前、A-Z 排序正確；#13 三語切換 chrome 文案正確、persist；無 console error。建議下一步：#14 PWA（manifest + Service Worker，M）＝佇列最後一項；或回頭把 i18n 覆蓋擴到大廳/競技場等其餘畫面。
- **2026-06-23（#10 + #11）** — 一次做兩項。**#10 通知中心**：新增 `core/notify.js`（`HL.notify`，localStorage 佇列），header 🔔 死按鈕通電——未讀紅點（取代寫死的 3）、點開為通知中心 Modal、開啟即標已讀清紅點、`renderApp` 後同步；由真實事件餵入（VIP 升級、累積彩金中獎）＋首載三則種子通知。**#11 遊戲卡雙鈕**：可玩卡新增「▶ 試玩／💵 真錢」（`casino.js`）——試玩直接啟動；真錢已核照直接玩，否則彈真金模式說明（提款待牌照、`canWithdraw()` 閘控），可切換真金模式或改用試玩。驗證：#10 紅點 3→清→+1、Modal 列表正確；#11 26 張可玩卡皆雙鈕、即將推出卡 0、真錢閘控 Modal（休閒/真金兩變體）、試玩啟動且公版返回鈕在；皆無 console error。建議下一步：#12 搜尋排序+最近遊玩(S)，或 #13 i18n 輕量引擎+語言切換器(接 🌐，目標3, S)。
- **2026-06-23（#9·累積彩金 Jackpot）** — 新增 `core/jackpot.js`＝三級漸進式彩池 `HL.jackpot`（MEGA 8M／MAJOR 80K／MINI 3K 起跳）。**遞增**：每秒 ambient 成長（`setInterval` 跨頁持續）＋每筆下注貢獻比例（mega 0.5%／major 0.3%／mini 0.2%）。**命中**：每筆下注各級依機率（mini 1/120、major 1/3000、mega 1/80000）觸發，命中即把當前池額真派到 `HL.money`、重置該池、播全螢幕中獎演出（彩帶＋金額 count-up）。掛在 `HL.liveStats.record` 中央點（全遊戲＋跟注通吃，與 VIP/任務/返水並列）。娛樂城頁頂新增即時跳動彩金橫幅、ℹ 規則/近期中獎/預覽演出。驗證：橫幅渲染、池額即時遞增、onBet 與中央點貢獻精確、forceHit 派彩=當前池額並重置 seed、演出浮層各元素正確、無 console error。可玩體驗再升一級。建議下一步：#10 通知中心（接 header 🔔 badge），或 #11 遊戲卡「試玩/真錢」雙鈕(S)。
- **2026-06-23（7d + #8）** — 一次做兩項。**7d**：全頁直播間 `liveroom.js` 跟注補齊到與 7c 一致（先前只有子母畫面接真桌，全頁仍假）——確認跟注真扣 `HL.money`、本局倒數結束以 `HL.baccarat.deal()` 真桌結算真派彩、掛 `HL.liveStats.record`、重複跟注被擋、開獎前離開退回本金。**#8 Rakeback 返水**：新增 `HL.rakeback`（綁 VIP 等級係數 0.5%→1.8%），每筆下注即時累積，掛在 `HL.liveStats.record` 中央點＝全遊戲+跟注通吃；VIP 俱樂部面板可查返水率/可領額並領到主餘額（取整數、餘數續留）。驗證：7d 強制莊勝+手動驅動 ticker 繞過分頁節流→扣100退195(淨+95)、真點數聊天、離開退回；#8 accrue 數學精確、經中央點累積、領取入餘額；皆無 console error。建議下一步：#9 真實累積彩金 Jackpot（demo 獎池遞增+命中演出），或 #11 遊戲卡「試玩/真錢」雙鈕(S)。
- **2026-06-23（7c·主播跟注接真開獎）** — 完成 #7 的 7c，#7 整段收尾。`streamer.js`（子母畫面 PiP 主播）的 `Math.random()<0.5` 假勝負→改用 **`HL.baccarat.deal()` 真桌真開牌**（7a 暴露 `HL.baccarat={deal,returnsOf}`），依主播押注方向(莊/閒)判勝負；跟注改為「**真扣**」`HL.money`、下一局以真桌結果「**真派**」（莊1.95×/閒2×/和退本/輸0），並掛 `HL.liveStats.record("跟注·百家樂")`（餵 VIP/任務）；取消/關閉/切大畫面/換主播皆退回未結算本金。200 局自動測：每局精準扣注、淨值僅{+19/0/-20}、零漏帳、分布 47/9/44% 符合百家樂、傭金正確。**發現同類缺口**：全頁直播間 `liveroom.js` 的跟注仍是假結算（toast + 結果硬寫「pickSide 勝」），已列為 **7d**（表面一致性、S）。建議下一步：7d 把全頁直播間也接真桌（與 7c 一致），或跳 #8 Rakeback 返水。
- **2026-06-23（7b·輪盤）** — 完成 #7 的 7b。新增 `views/table-roulette.js`＝歐式單零輪盤（0–36、莊家優勢 2.7%），注區**直接複用 7a 的 `HL.table.betArea`**（驗證了桌引擎的可複用性）：直注 35:1(36×)、紅黑/單雙/大小 1:1(2×)、打(12)/列 2:1(3×)、開 0 場外全輸。賭桌佈局（0+12×3 號碼+列注+打/場外）、CSS 旋轉輪盤+中心開號+近況路紙。覆蓋 mock 占位卡 id:"european-roulette"。**可玩 8 → 9 款**。3 局自動測 0 對帳誤差（涵蓋全輸/紅單列/直注 36× 命中）、中獎高亮與開號顏色正確、無 console error。建議下一步：**7c 主播跟注接真開獎**——把 `streamer.js` 的 `Math.random` 勝負改成「真桌結果」、跟注真扣/派 `HL.money`，完成 #7 整段（直播間最大死路通電）。
- **2026-06-23（7a·RNG 桌引擎+百家樂）** — 完成 #7 的 7a。新增 `core/table.js`＝共用桌遊引擎 `HL.table.betArea`（多注區：籌碼列、place/undo/clear/rebet 受餘額閘控、commit 扣注+快照、settle 依各注區總賠付倍數派彩+同步餘額+掛 `HL.liveStats.record` 餵 VIP/任務）——7b 輪盤可直接複用。新增 `views/table-baccarat.js`＝真開牌百家樂（標準補牌：閒0–5補、莊依閒第三張補牌表、天牌8/9停；閒1:1·莊1:1扣5%傭金=1.95×·和8:1=9×·閒對/莊對11:1=12×、和局退本），覆蓋 mock 占位卡 id:"baccarat"。**可玩 7 → 8 款**。實測抓到並修掉一個跨局 bug（每局結算後未清籌碼→累積）；15 局自動測 0 對帳誤差、莊家傭金/和局退本正確、undo/clear/重押皆正常、無 console error。建議下一步：**7b 輪盤**（歐式單零，複用 `HL.table`，工作量 S）。
- **2026-06-23（修補·公版返回鈕）** — 使用者回報：5 款 instant(Dice/Limbo/Crash/Mines/Plinko)無「返回娛樂城」鈕，只有暗影儀式/小雞有。根因：返回鈕原寫死在各遊戲自身 DOM。改為**公版**：shell 層 `mountView` 統一注入返回列，掛在遊戲節點「之外、之上」(不進 GameFrame)；`main.js` 以 `GAME_BACK={slot,chicken,game}` 宣告套用頁，instant/同仁自製遊戲走 `view:"game"` 自動繼承；拔掉 slot.js/chicken.js 舊手刻鈕。preview 實測 7 款各恰好 1 顆、為 main 首子元素、點擊回 casino、無 console error。`(b20de37)` 接著進 7a。
- **2026-06-23（優化）** — 五款 instant 由 MVP 重做到 Stake 類標配水準（對標規格後）：引擎 betPanel 支援「動畫結束才結算(res.done)」+ onBetChange + 共用 animate；Dice(紅綠軌道/可拖曳握把/大於小於/指針落點/三欄資訊/最近結果)、Limbo(滾動上升+脈動/抖動+三欄+歷史)、Crash(SVG 火箭曲線/爆炸/歷史/動態兌現/補接 liveStats)、Mines(資訊條/翻格/踩雷震盤/兌現金光/隨機鈕/補接 liveStats)、Plinko(逐排彈跳/8·12·16 排可選/程式生成倍數表)。動畫一律「單一 setTimeout 閘門保證結算 + 視覺盡力」以防背景分頁節流卡死。各款 demo 實測通過、無 console error。
- **2026-06-23** — 巡檢：佇列 #1–6 與程式一致（core/ 已有 instant/live-stats/rewards/progress/money，views/ 五天王俱在）。確認 #7 缺口屬實——`streamer.js:130` 仍用 `Math.random()<0.5` 演主播勝負，跟注只發 toast/聊天、**不動 HL.money 餘額**；`liveroom.js:123` 的 Math.random 僅作假聊天。建議下一步：**#7，但拆三段做**——先 7a「共用 RNG 桌引擎＋百家樂」(真開牌、HL.money 結算)，再 7b 輪盤複用結算，最後 7c 把主播跟注接真桌(取代 Math.random、真扣真派)。理由：先做共用桌引擎再做個別桌＝加速器原則，且把直播間最大死路(跟注不結算)通電，體驗完整度躍升、純前端零牌照依賴。工作量原 M、拆後每段 S。會動到：新增 views/table-baccarat.js·table-roulette.js(或合一 instant-tables.js)、改 streamer.js。⚠️ 另發現 `prototype/src/views/instant-crash-mines.js` 有未提交程式變更(+47/-11)，非本日誌任務、未碰未提交，請使用者自行確認。
- **2026-06-22（深夜）** — 完成 #6 留存三件套：VIP 等級(以 HL.liveStats.record 為中央點累積押注→5 段位、升級發獎金)、每日任務(下注/贏/押注/簽到，事件自動推進)、獎金錢包/領取中心(任務與升級獎金入此、可領到主餘額)。玩家頭像「Unranked」已換真段位；底部「每日任務/獎勵中心/VIP 俱樂部」三顆死按鈕通電。建議下一步：**#7 百家樂/輪盤 RNG 桌**，並把虛擬主播跟注接到真開獎(取代 liveroom 的 Math.random)。
- **2026-06-22（晚上）** — 完成 #5 Plinko，**originals 五天王(Dice/Limbo/Crash/Mines/Plinko)補滿**，可玩遊戲 6 → 7。遊戲擴充告一段落；建議轉做 **#6 留存三件套**（VIP 等級 + 任務/成就 + 獎金錢包），把玩家 widget「Unranked」換真段位、點亮升級動機，與每日簽到相乘。
- **2026-06-22（傍晚）** — 完成 #4 Crash + Mines（可玩遊戲 4 → 6 款）。Crash：倍數爬升+手動/自動兌現；Mines：5×5 翻格累乘+隨時兌現，皆 1% 莊家優勢、掛 HL.instant。建議下一步：**#5 Plinko**（落球動畫 + Low/Med/High 風險 + 倍數槽），補滿 originals 五天王（可玩 6 → 7）。
- **2026-06-22（下午）** — 完成 #2 統一 instant 引擎 `HL.instant` + #3 Dice/Limbo（可玩遊戲 2 → 4 款，含手動/自動下注、1% 莊家優勢）。建議下一步：**#4 Crash + Mines**——複用 chicken.js（Crash 家族範本：倍數/cashout）與 bounty.js（Mines 後端雛形）狀態機，掛上 HL.instant，可玩數可再 4 → 6。
- **2026-06-22** — 完成 Wave 1（收藏 + 每日簽到 + 死按鈕通電）。建議下一步：**統一 instant 引擎 `HL.instant`**（佇列 #2）。理由：先磨刀，之後 Dice/Limbo/Crash/Mines/Plinko 五款的工作量從 M 降到 S，是所有 originals 的加速器；且 autobet 是 instant 類標準配備（目前僅 slot 固定 auto=10）。
