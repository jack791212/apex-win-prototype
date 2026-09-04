# ApexWin 任務佇列（Backlog）

**這是「一項一項往下做」的執行清單。** 策略全貌見 [ROADMAP.md](ROADMAP.md)。

工作方式：
1. 自我進化引擎（intel/ 三軌雙線 skill：**平台 `apexwin-platform` / 遊戲 `apexwin-games` / 維護 `apexwin-maintain`**）把建議寫進下方「分析師日誌」，並把新任務放進「任務佇列」標 `⬜待批准`／`🟦已批准待做`。**打磨/重構/自適應/一致性類的「債務卡」不進這裡，改記在 [intel/DEBT.md](intel/DEBT.md)，由維護軌 `apexwin-maintain` 產出與消化。**（2026-07-30 M2 更正：舊述三 skill 名 radar/investigate/evolve 與 consolidate 皆為 2026-07-23 重構前的四軌，已廢除。下方分析師日誌內帶日期的舊條目〔如「2026-06-26 evolve」〕係當時實況的歷史稽核紀錄，保留不改。）
2. 你批准後，負責實作的 Claude 把該項移到 `🏗️進行中` → 做完標 `✅完成`（附 commit 短碼與日期）。
3. 預設依佇列由上往下做；你可隨時插隊或調整順序。（2026-07-30 M2 更正：舊述「建造 vs 打磨的比重由 `mode` 決定」已廢除——`mode` 開關於 2026-07-23 重構退場；三軌各自獨立跑，火力集中處由 `intel/CONTROL.md` 的 `lead_track` 指定。）

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
14. ✅ **PWA**（manifest + Service Worker：可安裝 + 離線載入，network-first+cache 後備）— M　`(2026-06-23)`

> 🎉 **原始佇列 #1–14 全數完成**（2026-06-23）。後續從 ROADMAP 🔵LATER 升級新任務，或回頭擴充 i18n 覆蓋/補強既有功能。

15. ✅ **錦標賽 / Slot Race**（限時積分賽 + 即時 leaderboard + 自動派彩）— M　`(2026-06-26)` — `HL.tournament` 掛中央計分、即時排行榜、賽末階梯自動派彩到獎金錢包；電亮「Slots 競賽」促銷卡 + 大廳橫幅
    - 從 ROADMAP 🔵LATER 升級。**體驗完整度最高 ROI**：限時競賽是 Stake/Roobet/BC.Game 等頂級平台的招牌留存引擎，目前完全空缺。
    - **電死按鈕**：mock-data 已有裝飾用側欄排行榜（`makeLeaderboard`）＋一張寫死的促銷卡「Slots 競賽 100 萬獎池」承諾了賽事卻無實作 → 把假招牌通真電。
    - **加速器已付清**：複用中央掛鉤 `HL.liveStats.record`（全遊戲＋跟注通吃）餵積分，零逐遊戲改裝；派彩入既有獎金錢包 `HL.rewards`。純前端、零牌照依賴。
    - 範圍（首版）：單一進行中限時賽（倒數計時）＋即時排行榜（mock bot 爬升＋真玩家以中央掛鉤計分）＋獎池階梯分配＋賽末自動派彩到獎金錢包＋「我的排名」。
    - 會動到：新增 `core/tournament.js`（`HL.tournament`：訂閱中央掛鉤、排行榜狀態、派彩）、`views/tournament.js`（賽事頁），並把促銷卡＋大廳/header 入口接上啟動。
    - 替代快速項：完成 🟢NOW 唯一未做的 **分享單局戰績（Web Share API，S）**。

16. ✅ **Provably Fair 可驗證公平**（`HL.fair` 同步 HMAC-SHA256 種子引擎，對標 WebCrypto 一致；Dice/Limbo/Plinko 真亂數可重算；GameFrame 🔒 / PiP ✓ / 底部「可驗證公平」三死按鈕通電；附對標審查工作流修正）— 從 ROADMAP 🔵LATER 升級　`(2026-06-26)`
    - 註：本項於 6/26 同日先行完成（建構期間分析師才把 #15 錦標賽排入），故編 #16；#15 錦標賽仍待批准。

> 🤖 **以下由自我進化引擎（市場調研→缺口）自動開卡**（2026-06-26 起，見 `intel/`）。全自動模式下標 🟦已批准待做。

17. ✅ **每日 Lucky Spin 幸運轉盤** — S–M　`(2026-06-26)` — `HL.luckyspin` 每 24h 一次免費轉、獎品依 VIP ×1~×3 放大、中獎入獎金錢包；底部列入口、8 色轉盤+落點高亮、i18n 繁簡英；preview 實測派彩精準/每日閘/二轉擋下/零 console error
    - 來源：調研 **BC.Game（Lucky Spin 每日轉盤）** + **Stake（Wheel Original）**——兩大頂級平台共有的「每日免費轉盤」高頻留存鉤子，ApexWin 完全缺（只有簽到 streak）。
    - 範圍（首版）：每 24h 一次免費轉（localStorage daily gate）＋獎品池依 `HL.vip` 等級放大＋中獎入獎金錢包 `HL.bonus`＋旋轉動畫＋「今日已轉/倒數」。新增 `core/luckyspin.js`（`HL.luckyspin`）、底部列入口、CSS、i18n。
    - 加速器：複用 `HL.bonus.add`／`HL.vip.status`／`HL.ui.modal`／`dayNum` 模式（同 rewards.js）。純前端零牌照。
18. ✅ **每週抽獎 Raffle / Lottery**（押注換券 → 週期自動開獎）— M　`(2026-06-26)` — `HL.raffle` 掛中央掛鉤累積抽獎券（每 NT$2,000 有效押注 1 張）＋每週倒數＋逾期懶觸發自動開獎（冪等、20 名階梯）＋中獎入獎金錢包 `HL.bonus`＋我的券數/預估機率/開獎紀錄；底部列 🎟️ 入口、i18n 繁簡英；preview 實測券數精準/payout=prize 精準/重入不雙倍/倒數即時/零 console error
    - 來源：**Stake（$75k Weekly Raffle，押注換券）** + **BC.Game（$20k Weekly Lottery，150 名）**——兩家共識的週期大獎留存引擎。
    - 範圍：押注經 `HL.liveStats.record` 中央掛鉤累積抽獎券（每 NT$2,000 一張）＋週期倒數＋到期自動開獎發 `HL.bonus`＋我的券數/歷史中獎。沿用 #15 錦標賽的冪等結算/懶觸發模式。
    - ⚠️ 與 #20 流水引擎相依：本期派彩仍直接 `HL.bonus.add`；待 #20 上線後，所有 bonus 來源（含本項）改走流水記帳，無須改本檔玩法邏輯。
19. ✅ **兌換碼 Redeem Code（promo / shitcode）** — S　`(2026-06-26)` — `HL.redeem`：底部列 🎫 入口 + modal 輸入框，內嵌碼表（WELCOME100/APEXWIN/LUCKY888/WEEKEND300/VIPBOOST，可設到期日），大小寫正規化、每碼每裝置限領一次（localStorage 冪等不雙倍）、派彩入獎金錢包 `HL.bonus`、我的兌換紀錄、i18n 繁簡英；preview 實測：lowercase 正規化命中、重領擋下(claimed)、無效/空白/過期各回對應 reason、餘額增量精準(+100/+888/+1000)、UI 按鈕 handler 成功入帳並顯示紀錄、EN 全譯、零 console error。bump SW 快取 v2→v3。
    - 來源：**BC.Game（Shitcode 兌換碼）**——輸入碼即領 bonus，經典低成本拉新/回流鉤子，實作極輕。
    - 範圍：大廳/錢包加「輸入兌換碼」框，比對內嵌碼表發 `HL.bonus`，每碼限領一次、可設到期。

20. ✅ **紅利/流水（wagering/rollover）引擎** — bonus vs cash 分離記帳 + 流水達標才可提取 — **L**　`(2026-07-10 · 船長批准後實作)` — 重寫 `progress.js` 獎金錢包段：`HL_BONUS` 升級為 **`{unlocked, entries:[{amt,req,prog}]}` 分離記帳**。新紅利預設附流水要求（`req = amt × WAGER_MULT`，首版 1×）、**有效押注經中央掛鉤 `onWager(bet)` 以 FIFO 推進頭筆、單注可連鎖解多筆**、達標自動轉 `unlocked`＋🔓 通知；未達標不可領。`wagerFree` 選項供零流水來源（**#33 cashback 保住「零流水」賣點**）。`MAX_ENTRIES=20` 防高頻小額爆量（超過併尾筆）。**舊資料 `{bonus:N}` 優雅遷移為 unlocked（不誤鎖既得）＋防毀損：異常態 `{unlocked:N, entries:null}` 保留 unlocked（金額不可銷毀）**。`canWithdraw()` 閘控 API＋錢包轉贈區鎖定提示；領取中心 modal 顯示「可領取＋🔒待解鎖（頭筆流水進度條＋排隊數）」。**API 相容：`balance()/add()/claim()/open()` 簽名不變＝12+ 來源零改裝**。**掛鉤順序關鍵設計：`onWager` 置於中央掛鉤最前**——同一注只累進「既存」紅利流水、不解鎖同結算內才鑄出的紅利（防 VIP 升級獎金被大注當場自解鎖）。i18n 繁/簡/英（含順帶補齊領取中心既有未譯區）。bump SW v22。**驗證**：node 模擬帳本 9 案全精準＋**1000 輪隨機守恆 fuzz（credited ≡ unlocked+locked）**；preview 實環境：遷移 500、add 1000 鎖定、流水 400/600 分段解鎖、FIFO 連鎖（250 解頭筆 200＋次筆 prog 50）、wagerFree 直入、claim 1800 守恆、跨 VIP 門檻 6000 一注鑄 740 鎖定且 prog=0（不自解鎖）、下一注推進、異常態保 777、EN 零 leak、零 console error。**審查註記**：18-agent workflow 撞 session 上限（17 陣亡、findings 未經驗證）→ 改以 node 模擬逐項驗證：2 項確認並修（遷移防毀損、掛鉤順序）；「經濟循環鑄幣 EV 正」屬 demo 慷慨經濟既有設計（先於 #20、#20 反而加了摩擦），**真金模式上線前需重調各回饋率**（記入 ROADMAP 提醒）；「金額看似消失」不成立（領取中心雙池全揭示）。
    - **為何現在**：自我進化引擎正高速量產「派彩入 `HL.bonus`」的留存功能——#15 錦標賽、#17 Lucky Spin、#18 Raffle（實作中）、#19 兌換碼（待做）——全部往獎金錢包灌錢卻**零流水控制**；每多一個來源，缺口就複利放大。此為頂級平台（Stake/BC.Game）紅利系統的底層引擎，且**使用者明確點名要「引擎」**。
    - **加速器原則**：先做此共用引擎，後續所有 bonus 來源（含 #19 及未來自動開卡）直接受流水規則約束、零逐功能改裝——典型「共用引擎先於個別功能」。趁 bonus 來源還少先做最划算。
    - 範圍（首版）：`HL.bonus` 升級為分離記帳（cash 餘額 vs bonus 餘額 + 各筆 bonus 的 wagerReq/已流水進度）、有效押注經中央掛鉤 `HL.liveStats.record` 累進流水、達標自動轉入可提取、未達標不可提取（接 `canWithdraw()` 閘控）、錢包面板顯示「待解鎖紅利 + 流水進度條」。純前端 localStorage、零牌照。
    - 會動到：`core/rewards.js`（或新 `core/bonus.js`）、`live-stats.js` 掛鉤、錢包/領取中心 UI。
    - 替代快速項：完成 🟢NOW 唯一剩的 **分享單局戰績（Web Share API，S）**——病毒式分享 Lucky Spin/錦標賽/Raffle 戰績，與留存引擎相乘。

> 🤖 **以下由自我進化引擎自動開卡**（2026-06-26 evolve · 來源：新調研 bet365 / roobet / rollbit / 1xbet）。全自動模式下標 🟦已批准待做。

21. ✅ **遊戲熱度模組：On Fire 🔥 / Ice Cold 🧊 + 當下最熱牆** — S–M　`(2026-06-26)` — 新增 `core/heat.js`＝`HL.heat`：對遊戲登錄表做 ambient 模擬（玩家數隨機漫步＋近期 RTP 漂移，自帶 4s interval 跨頁持續），並由全站中央掛鉤 `HL.liveStats.record` 對「真正被玩到的遊戲」即時加溫（fuzzy 比對遊戲名）。卡片角標 🔥(RTP≥118%)/🧊(RTP≤82%)、娛樂城頂部「🔥 現在最多人玩」即時牆（依玩家數排序、本頁每 3s 即時刷新、換頁 ticker 自動停）。class 用 `ax-trend*` 避開 arena.js 既有 `.ax-heat` 撞名；i18n 繁/簡/英；bump SW 快取 v3→v4。preview 實測：牆 8 格＋卡片 9🔥/10🧊 角標、大贏一局後該遊戲 RTP 93→130 轉火熱（中央掛鉤加溫生效）、ticker 每 3s 數字漂移、離開頁面牆自清且 arena 5 條熱度條不受影響、三語標題正確、零 console error。
    - 來源：**bet365（首頁置頂「當下最熱」）** + **roobet（Live RTP / On Fire・Ice Cold）**——兩平台共識的「熱度發現性」模式。
    - 範圍：用既有中央掛鉤 `HL.liveStats` 的近期下注/輸贏，計各遊戲「近期回報熱度」，卡片角標 🔥/🧊＋大廳頂部「現在最多人玩」即時牆。純前端、零牌照、複用既有掛鉤；強化發現性。會動到 `live-stats.js`（central hook 加掛 `HL.heat.record`）、`casino.js`（角標＋熱度牆）。
22. ✅ **Rakeback 每日領桶（逾期作廢）+ header 快速領下拉** — S　`(2026-06-27)` — `HL.rakeback` 升級為「每日返水桶」：返水累進今日桶（`{pot,lifetime,day}`），跨日未領即作廢（`rbState` 讀取時懶判定 day-roll、forfeit pot 但保留 lifetime），**舊資料無 `day` 欄位優雅遷移**（既有 pot 併為今日桶、不誤殺）；新增 `msToReset()` 回傳距作廢剩餘毫秒。header 新增 💧 返水快領下拉（可領額 + 每秒即時倒數 + 一鍵領入主餘額 + 返水明細入口），可領 ≥1 時亮紅點 badge（接 `refreshChrome`）。VIP 面板 Rakeback modal 同步改為「今日可領 + 本桶倒數 + 逾期作廢」文案。i18n 繁/簡/英、bump SW v4→v5。preview 實測：accrue 入今日桶、claim 精準入主餘額(+80/+700)、day-roll pot 123→0 且 lifetime 保留、legacy 無 day 欄位 pot 77 不作廢、下拉開關/倒數/badge/領取/空狀態全正確、EN「💧 Daily Rakeback / Expires in / Rakeback details」翻譯到位、零 console error。
    - 來源：**rollbit（每 30 分下拉領）** + **roobet（Roowards 日/週分桶）**——兩平台共識的「降低領取摩擦 + 催每日回訪」。
    - 範圍：在既有 `HL.rakeback` 上加「每日可領桶（24h 逾期作廢，沿用 #17 daily gate 模式）」＋ header 返水快領下拉（顯示可領額＋倒數、一鍵領入餘額）。會動到 `live-stats.js`/`progress.js`（rakeback 內嵌處）、`app-shell.js`（header 下拉）。
23. ✅ **新 Original：Towers 爬塔** — M　`(2026-06-29)` — 新增 `views/instant-towers.js`＝`HL.games` 註冊 originals 可玩卡 `towers`：8 層由下往上逐層選格，安全格累乘倍數、踩陷阱整局歸零、隨時兌現。難度三檔（簡單 4 格×4/3／普通 3 格×3/2／困難 2 格×2），倍數 `EDGE×(tiles/safe)^層數`（1% 莊家優勢）。**開局即用 `HL.fair.float("towers")` 對每層各取一注定陷阱位置（一層一 nonce＝逐層可驗證重算）**，game-frame `PF` 表加 `towers:1`＝顯示 🔒/PiP ✓；複用 `HL.instant`（餘額/金額欄）+ 公版返回鈕（`HL.gameFrame.wrap key:"towers"`）+ 中央掛鉤 `HL.liveStats.record("towers",bet,win)`（餵 VIP/任務/返水/彩金/熱度）。bump SW v5→v6。preview 實測：medium 爬 3 層→3.34× 精準＝EDGE×1.5³、payout 167 精準（淨 +117）、bet 50 開局即扣、踩陷阱不退款＋💥 揭露＋狀態紅＋兌現鈕鎖＋開始鈕復原、cur=0 兌現守門（餘額不變、回合續行）、🔒 公平鈕出現、8 列×24 格渲染正確、零 console error。
    - 來源：**roobet（Towers）** + **Stake（Towers/Dragon Tower）**——共識 Original，補可玩遊戲數。
    - 範圍：逐層選格、選對往上累乘、踩雷歸零、隨時兌現（機制近 Mines）。大量複用 `HL.instant` 互動回合 + `HL.fair` 可驗證亂數；新增 `views/`一檔、覆蓋 mock 占位卡。純前端零牌照。

> 🤖 **以下由自我進化引擎自動開卡**（2026-06-26 evolve · 來源：新調研 shuffle / gamdom）。全自動模式下標 🟦已批准待做。

24. ✅ **VIP 週期 Reload 領取中心（daily / weekly / monthly 固定紅利）** — M　`(2026-06-29)` — 新增 `core/reload.js`＝`HL.reload`：三檔週期固定紅利（每日/每週/每月），金額依 VIP 等級放大（青銅→鑽石：日 120→2000 / 週 600→11000 / 月 2500→50000）。各檔獨立週期閘（日＝`dayNum`、週＝7 日 `weekNum`、月＝30 日 `monthNum`，懶判定跨期自動可領、逾期不累積），到期可領入獎金錢包 `HL.bonus`、已領顯示倒數至下次。底部列新增 🔄 入口（可領檔數 badge）、VIP 面板加「🔄 領週期紅利」連結。**只讀 `HL.vip.status().index` 放大金額、不改 VIP 派發邏輯**；沿用 #17 daily-gate + #18 ticker 倒數模式。i18n 繁/簡/英（倒數採語言中性 d/h/m；標籤獨立節點供 DOM 翻譯層精確命中——因 `t()` 為 passthrough、翻譯全由 DOM walker 做，故「標籤＋動態值」拆成 span+textNode 才譯得到）。bump SW v6→v7。preview 實測：bronze 三檔 120/600/2500、diamond 2000/11000/50000 精準（VIP 放大）、claim 入獎金錢包增量精準（日 +120；週+月 +61000）、重領回 0（冪等週期閘）、claimableCount 3→2→1、modal 三卡渲染、領取後關舊開新不堆疊（單一 modal）、已領卡顯示「已領取 ✓」+「下次可領倒數：17h 30m」、EN（Daily/Weekly/Monthly Reload、Claim NT$、Available now、Next in:）/zh-Hans（每日/周/月红利、领取）全譯、底部列入口 + VIP 面板連結可開、零 console error。
    - 來源：**Shuffle（9 級 VIP 各含 daily/weekly/monthly reload）** + **Gamdom（Reload Rewards）** + 既有 **Roobet/BC.Game 分桶返水**——三方共識，ApexWin VIP 只有「升級獎金」、**無週期可領 reload**。ROI 高、強化每日/每週回訪。
    - 範圍：在既有 `HL.vip` 上，依等級給三檔週期固定紅利（沿用 #17 Lucky Spin 的 daily-gate + #18 Raffle 的週期倒數模式），到期可領入 `HL.bonus`；VIP 面板/底部列顯示「本日/本週/本月可領 + 倒數」。純前端 localStorage、零牌照。會動到 `core/progress.js`（HL.vip）或新 `core/reload.js`、VIP 面板 UI。
25. ✅ **Chat Rain 聊天灑幣（社群留存引擎）** — M　`(d-新, 2026-07-02)` — 新增 `core/rain.js`＝`HL.rain`：平台聊天室每隔一段時間（首次載入 25s、之後每場 3–5 分鐘）「下紅包雨」開 45s 限時窗口；「近 10 分鐘在聊天室發過言」＝資格，可按領取鈕分得雨露（NT$30–149）入獎金錢包 `HL.bonus`，**每場每裝置限領一次（localStorage 冪等）**。橫幅 sticky 於聊天頂部、不透明底（不被捲動訊息透出），三態：進行中可領／未發言不可領（提示先發言）／已領取 ✓。RainBot 貼真訊息入聊天（通電原 mock 假「雨露」訊息）。**僅平台單例掛鉤**（`createRoom(true)`），虛擬主播獨立聊天室不掛；隨面板開關啟停自有 1s interval（不依賴切頁會清空的 `HL.ticker`）。i18n 繁/簡/英（鍵取 trimmed 形式、"已領取 ✓" 沿用 Reload 既有鍵）、bump SW v7→v8。preview 實測：未發言領取被擋（bonus 不變）＋橫幅提示先發言、發言後領取 +34 精準入獎金錢包、二次領取冪等回 0（總額不變）、到期自動排下一場（3–5 分鐘）＋橫幅轉「下一場倒數」、RainBot 真訊息貼入、主播房不掛雨、EN（Rain is live／Claim／Chat once to join the rain／🌧️ Next rain）+ zh-Hans 全譯、零 console error。
    - 來源：**Gamdom 招牌（Rain：聊天室不定時下雨灑免費幣，窗口內活躍者按 claim 分得）**——ApexWin 已有聊天 UI（競技場/直播間）卻是「死水」，無灑幣。把既有聊天通電、體驗完整度躍升的高 ROI 項。
    - 範圍：每隔一段時間（或系統觸發）聊天室「下雨」，**窗口內近 N 分鐘有發言**的使用者按 claim 鈕分得 `HL.bonus`；附倒數條 + claim 按鈕 + 飄落動畫。純前端、localStorage 記錄參與資格與冪等領取，零牌照。會動到 `layout/chat.js`、新 `core/rain.js`。
26. ✅ **多倍數目標型挑戰（Multiplier Challenges）** — S–M　`(背景 evolve 實作、2026-07-02 補收尾提交)` — 新增 `core/challenges.js`＝`HL.challenges`：一類「在遊戲命中 ≥N 倍」目標型挑戰，掛中央掛鉤 `HL.liveStats.record(game,bet,win)`（同局 bet+win 才算倍數 win/bet）判定達標、解鎖獎金入 `HL.bonus`；底部列 🎯 入口（可領數 badge）。**註：此卡由背景排程 evolve 於 07-02 自動實作但未 commit（同「觸發卻未收尾」現象），本輪與 #36 一併補驗證＋提交**（preview 實測：50× 一局→claimableCount 0→2、API record/list/claim/claimableCount/open 齊備、零 console error）。
    - 來源：**Shuffle（Daily/Weekly Challenges：命中某倍數/達某 payout 即領獎）**——補足 ApexWin 每日任務只計「次數/金額」、缺「技巧型目標（命中 ≥N 倍）」的維度。
    - 範圍：新增一類任務「在 X 遊戲命中 ≥N 倍」即解鎖獎金，掛既有中央掛鉤 `HL.liveStats.record`（已帶單局 bet/win，可推單局倍數）判定，達標入 `HL.bonus`。複用 #6 每日任務的領取流程。純前端零牌照。會動到 `core/progress.js`（HL.tasks）/`live-stats.js`。

> 🤖 **以下由自我進化引擎自動開卡**（2026-06-26 evolve · 來源：shuffle/gamdom 調研上輪受 3 張上限暫緩、標「下輪優先」的候補項）。全自動模式下標 🟦已批准待做。

27. ✅ **新 Original：Hilo 猜高低** — M　`(2026-07-03)` — 新增 `views/instant-hilo.js`：翻牌猜下一張更高/更低（嚴格比較、同點算輸、賠率按機率定價 p(hi)=(12-r)/13、單步倍數 EDGE/p＝精確 1% edge），連對累乘、隨時兌現；K 鎖更高、A 鎖更低；猜測鈕即時顯示倍數+機率。**每張牌＝`HL.fair.float("hilo")` 一注（一牌一 nonce）**：card=floor(f×52)、rank=card%13＝逐牌可驗證，PF 表加 `hilo:1` 亮 🔒，**驗證器擴充 hilo 牌面解讀**（`hiloCardOf`＋modal 適用清單補 Towers/Hilo）。複用 `HL.instant` 餘額/金額欄＋公版返回鈕＋中央掛鉤 `HL.liveStats.record("hilo",bet,payout)`。牌面/歷史列 UI（紅花色/勝負框）。i18n 繁/簡/英（含補齊 Towers/Mines 共用 stat 標籤「目前/可贏/下注金額」與「餘額不足（Demo）」既有缺口）。bump SW v10→v11。**經 27-agent 對抗性審查（3 維度×3 票）＝6 confirmed 去重 4 真問題全處置**：①`Math.round` 派彩在小注反轉 1% edge（bet3 可刷 102% RTP）→ 改 `Math.floor`＋**同修 Towers 同族漏洞**；②「餘額不足」toast 補字典；③驗證器補 hilo 解讀；④中途離場沒收注＝全家既有設計 → 開候補卡。preview 實測：定價 2.15/6.43×精準、mult 13.80× 派 690 精準、floor 後 bet3 win 派 3（+EV 刷法已死）、同點輸、K/A 鎖鈕、守門（0 連對不可兌/局末點擊無效/重複兌現 0）、中央掛鉤金磚 +0.25 恰一次、EN/zh-Hans 零 leak、零 console error。
    - 來源：**Gamdom（Hilo Original）** + **Stake（Hilo）**——共識 Original，補可玩遊戲數。
    - 範圍：翻牌猜下一張更高/更低，賠率依當前牌面機率動態、連對累乘、隨時兌現（機制近 Mines/Towers 的互動回合）。大量複用 `HL.instant` 互動回合 + `HL.fair` 可驗證亂數；新增 `views/` 一檔、覆蓋 mock 占位卡。純前端零牌照。與 #23 Towers 同屬「互動回合補 Original 數」家族。
28. ✅ **新手限時啟用窗口（onboarding countdown）** — S　`(2026-07-03)` — 新增 `core/onboarding.js`＝`HL.onboard`：進主 shell 起算 **6 小時啟用窗口**，內完成兩任務——①首注（中央掛鉤閂鎖）②每日簽到（**閂鎖進本地狀態**）→ 領 NT$500 啟用大禮包入 `HL.bonus`（#38 戳泡泡揭曉儀式領取＝第 3 個消費點）。右下角**倒數藥丸**（自管 boot interval、可領時金框脈動）+ 任務清單 modal（倒數/任務列/領取鈕**每秒即時同步**）+「去簽到 →」捷徑。逾期不補發；既有使用者首載本版起算一次（demo 展示）。**經 23-agent 對抗性審查（2 維度×3 票）＝6 confirmed 去重 4 真問題全修**：①(HIGH) 簽到任務原為即時判定→跨日翻轉（UTC 日序 08:00 台北）會**撤銷已完成任務、獎勵懸空**→改閂鎖；②會員模式**登入頁不起算不掛藥丸**（原版會在無法完成任務的登入畫面燒窗口）→ auth 閘 + boot interval 等登入；③modal 原為開窗快照→改狀態即時刷新；④藥丸在 `#app` 外、語言切換不重繪→標籤隨 lang 變更重置供翻譯層重譯。preview 實測：任務閂鎖跨日不撤銷、登入頁閘住（意外真實驗證：URL 掉 demo 參數進會員登入頁時 pill 正確不出現）、modal 打注後 1s 內任務列+按鈕 live 解鎖、+500 恰一次、冪等、pill 領後拆除、EN/zh 標籤雙向切換正確、零 console error。bump SW v11→v12。
    - 來源：**Gamdom（登入後底部 6 小時啟用倒數窗口）**——提升首日轉化的低成本鉤子；ApexWin 有每日簽到但無「限時啟用窗口」。
    - 範圍：新用戶首登給「X 小時內完成首注/簽到 → 領啟用大禮包」倒數條，到期前完成即入 `HL.bonus`。沿用 #17 Lucky Spin 的 daily-gate 計時 + localStorage 記首登時點。純前端零牌照。會動到 `app-shell.js`（倒數條入口）、新 `core/onboarding.js` 或併入 `progress.js`。
29. ✅ **tier-up 大階獎金（VIP 子級+大階雙層獎金）** — S　`(2026-07-03)` — 擴 `core/progress.js` 的 `HL.vip`：**補上 Shuffle 雙層模型缺的「微級層」**——每段位 gap 均分 5 個子等級（步長 1000/3000/8000/18000 恰為整數），**升子級發小獎**（青銅 60／白銀 150／黃金 400／白金 1000，入 `HL.bonus`），**跨段位（大階）維持既有大獎**（500→15000）＝level-up + tier-up 雙層完整。全域子級序 `subIndexFor`＝rank×5+段內子級，段位邊界（s%5===0）由大階路徑發、子級迴圈跳過＝**不重複派彩**；一注跨多子級合併一次入帳+toast。`vstatus()` 增 `sub/subs/toNextSub/levelReward`（**為 #31 微等級進度條鋪好資料**）；VIP 面板加「⭐ 子等級 Lv X/5＋距下一級/每級獎金」列（鑽石封頂隱藏）。i18n 繁/簡/英。preview 實測五案全精準：單子級 +60、一注混跨 3 子級+段位+新段子級 = 830、恰落段位邊界 20000 = 1950、直上鑽石 20k→200k = 25,600 分毫不差、鑽石後 +0；UI 列/EN/鑽石態不炸、零 console error。**8-agent 對抗性審查：2 findings 全數被駁回（0 confirmed）＝乾淨過關**。bump SW v12→v13。
    - 來源：**Shuffle（level-up + tier-up 雙層獎金）**——在既有「升級獎金」外，跨越大階段再給一筆較大獎金，強化長期爬階動機；ApexWin 目前只有逐級升級獎金。
    - 範圍：擴 `HL.vip` 既有升級派發邏輯，於跨大階（如 Bronze→Silver 段）額外發一筆 tier-up bonus 入 `HL.bonus`。純前端零牌照。會動到 `core/progress.js`（HL.vip 升級派發處）。

> 候補（受 max_cards 3 張上限暫緩，下輪優先）：週賽「距前一名差距」即時提示（S，強化 #15 錦標賽排行榜「再押 NT$X 即可超車」）。

> 🤖 **以下由自我進化引擎自動開卡**（2026-06-27 evolve · 來源：新調研 leovegas / duelbits）。全自動模式下標 🟦已批准待做。

30. ✅ **PvP 對戰模式：Dice Duel（vs Bot）** — M　`(2026-07-03)` — 新增 `views/instant-duel.js`＝`HL.games` 註冊 originals 可玩卡 `dice-duel`：**ApexWin 首個 PvP 對戰維度**（此前所有 Originals 皆單人對莊）。玩家設賭注後與一位對手（`HL.mock.makeHost()`＝沿用 #15 leaderboard bot 命名/頭像池）各擲一次點數（0–99）比大小，**贏家通吃「雙方賭注池」扣 1% 抽水**＝派彩 `floor(bet×1.98)`（floor 而非 round：小注時 round 會反轉 1% edge，實測 bet3 floor=5/round=6＝零 edge）；平手重擲。**每擲一次＝`HL.fair.float("dice-duel")` 一注（一擲一 nonce）**：point=`floor(f×100)`＝逐擲可驗證重算，PF 表加 `dice-duel:1` 亮 🔒。**設計要點：金流同步結算（先入帳再演出）**——不把派彩綁在動畫回呼上（原用 `HL.instant.animate` 的 rAF 在背景分頁會暫停＝payout 卡住），改為決勝後立即 `setBal`+`record`，`setTimeout` 收尾揭曉（背景分頁也會觸發）＝中途離場不漏帳（順帶避開 #27 審查點名的「互動回合中途離場沒收注」家族問題）。複用 `HL.instant.amountField` 餘額/金額欄＋公版返回鈕（`view:"game"` via `gameFrame.wrap key:"dice-duel"`）＋中央掛鉤 `HL.liveStats.record("dice-duel",bet,payout)`（餵 VIP/任務/返水/彩金）。雙方面板（頭像/名稱/大點數）+ VS + 勝方高亮 + 比分歷史列。i18n 繁/簡/英。bump SW v13→v14。preview 實測：WIN bet50→+49 淨（payout99）、LOSS -50、bet3 floor-edge +2（非 +3）、平手 50:50→重擲 90:10 +49、餘額不足不扣、雙擊守門（busy 鎖）、VIP wager +20 中央掛鉤、bot 對手（GoldRush69🦅）、🔒 modal 開啟、EN/zh-Hans 全譯（含動態勝負字串，修掉尾空格鍵漏譯）零 leak、零 console error。
    - 來源：**Duelbits（Dice Duels 1v1，主打全站最透明）**——**ApexWin 完全空白的 PvP 維度**：目前所有 Originals 都是單人對莊，無任何玩家對戰。差異化最大的一張。
    - 範圍（首版）：1v1 對戰房，玩家下注後與「對手（mock bot，沿用 #15 leaderboard bot 命名/頭像池）」各擲一注比點數，贏家通吃（莊家抽水即莊家優勢）。複用 `HL.instant` 下注面板 + `HL.fair` 可驗證亂數確保透明、掛 `HL.liveStats.record` 餵 VIP/任務/返水。新增 `views/duel-dice.js`（或併入競技場 duel 路由）。純前端零牌照。
    - 加速器：競技場已有 `duel` 路由占位 + leaderboard bot 模式可直接借用；`HL.fair` 已可逐注重算＝天然「最透明」賣點。
31. ✅ **VIP 微等級進度條（多階細分 + header 推進感）** — S–M　`(2026-07-06)` — 承接 #29 已鋪好的子級資料結構：`vstatus()` 增 **`level`（全域 Lv 1–21＝段位×5+子級+1，鑽石封頂 Lv 21）、`maxLevel`、`subPct`（段內距下一子級進度%）**；header 玩家 widget 段位小字升級為「🥉 青銅 · Lv 7」＋下方 **3px 迷你進度條**（金色漸層、0.4s 過渡），`refreshChrome` 依 id 即時更新。**`addWager` 改為每注都 refreshChrome**（原僅升級時觸發＝迷你條只會瞬間跳動、不會連續推進）。純顯示、零派發邏輯變更。preview 實測：Lv 1→2 跨級正確、bar 0→50→75% 連續推進、跨級歸零重積、直上鑽石 Lv 21/100% 封頂、零 console error。**對抗性審查 0 findings 全綠**。bump SW v14→v15。
    - 來源：**LeoVegas（99 層 VIP Bar 微等級）** + **Duelbits（Rookie→…→Ace→King 多階）**——兩平台共識「超細粒度、永遠差一點」的高頻推進感；ApexWin `HL.vip` 只有 5 大段、推進感稀疏。
    - 範圍：在既有 5 段 `HL.vip` 內再切「子等級/進度刻度」（如每段 N 個 sub-tier，依累積押注換算），header 玩家 widget + VIP 面板顯示「距下一刻度 X 押注」迷你進度條。純前端、複用既有押注累積（`HL.vip.addWager`），不改派發邏輯。會動到 `core/progress.js`（HL.vip status 計算）、`app-shell.js`（player widget 進度條）。可與 #29 tier-up 大階獎金相乘。
32. ✅ **新 Original：Keno 賓果彩** — M　`(2026-07-07)` — 新增 `views/instant-keno.js`＝`HL.games` 註冊 originals 可玩卡 `keno`：8×10＝80 號碼盤選 1–10 個號 → 按「開獎」抽 20 球，依「選號數×命中數」查賠付表派彩（各選號數精算至 **1% 莊家優勢**）。**每球一注＝`HL.fair.float("keno")`（一球一 nonce＝逐球可驗證重算）**，game-frame `PF` 表加 `keno:1` 亮 🔒；隨機選號/清除；命中格金框高亮、開球 pop 動畫。複用 `HL.instant` 金額欄 + 公版返回鈕（`gameFrame.wrap key:"keno"`）+ 中央掛鉤 `HL.liveStats.record("keno",bet,win)`（餵 VIP/任務/返水/彩金/熱度）。i18n 繁/簡/英。bump SW v15→v16。**採用自一輪背景 evolve 未收尾的孤兒產出**（與 #31 同輪的「觸發卻未收尾」現象：`instant-keno.js` 完整、`game-frame.js` PF 已補、i18n/CSS/SW 均已改，但 BACKLOG/STATE 未收尾、未 commit）——本輪 preview 現場驗證後正式收編：80 格盤渲染、選 4/6 號、開 20 球、bet50 開局即扣、命中派彩（8 連抽中央掛鉤 record 恰 8 次＝餵 VIP/任務鏈）、0 命中不派彩、`node -c` 語法過、零 console error。
    - **07-07 補記＋出處更正**：此卡實為**前景 session 進行中的工作**（20-agent 對抗性審查當時正在跑），被同時運行的背景 evolve 誤判為「孤兒」提前收編——非 stall 現象，記錄更正以免污染引擎故障診斷樣本。**審查 5 confirmed 去重 4 真問題已於後續 commit 修復**：①賠付表 `toFixed` 四捨五入**高報**實付（pick2 顯示 16.47× 實付按 16.4653 floor；casino 賠付表不可高報）→ 顯示改無條件捨去 2 位小數 `fmtMult`（**Hilo 按鈕/看板同類一併修**）②手機 <423px 80 格盤溢出卡片（medium）→ `minmax(0,44px)+width:100%+max-width:380px` 可縮軌道（375px 實測 grid 249 < stage 291 無溢出、無橫向捲軸）③zh-Hans 補「倍數→倍数」④倍數格初始空白→「—」。另補強：超幾何數學離線驗證各選號數 **EV=0.9900000000 精確、機率和=1**；背景分頁 timer 節流 → 加 `document.hidden` 瞬間全揭曉 fast-path；守門全過（無選號/超選 10 擋下/busy 重入鎖/中央掛鉤恰一次）。
    - 來源：**Duelbits（Keno）** + 多數平台共識 Original——補可玩遊戲數的另一維度（選號開獎類，與互動回合類 Towers #23 / Hilo #27 互補）。
    - 範圍：8×10 號碼盤選 1–10 個號 + 開 20 球，依命中數查倍數表派彩，純前端 RNG 接 `HL.fair` 可驗證。複用 `HL.instant` 下注面板（單注結算）+ `view:"game"` 公版返回鈕；新增 `views/keno.js`、覆蓋 mock 占位卡。純前端零牌照。

> 🤖 **以下由自我進化引擎自動開卡**（2026-06-29 evolve · 來源：新調研 thrill / mega-dice / spinblitz / stake-us / crown-coins / toshi-bet / wow-vegas）。全自動模式下標 🟦已批准待做。

33. ✅ **淨損 Cashback / Lossback 引擎（全新留存維度）** — M　`(2026-07-07)` — 新增 `core/cashback.js`＝`HL.cashback`：與 #22 rakeback（turnover×率）互補的**淨輸返現**維度。**每週桶**（`weekNum`）累計 `{wagered, won, claimed}`，**淨輸＝max(0, Σ押注−Σ贏)**（真淨輸、贏局自然抵銷；非逐局高估法），×VIP 率（青銅→鑽石 5%→15%，涵蓋 Thrill 10%/Mega Dice 15%）＝本週已賺；`pot()=max(0, accrued−claimed)` 可領（**大贏使淨輸歸零時 pot 歸 0 但不追回已領**），領入 `HL.bonus`、零流水、跨週未領作廢。中央掛鉤**無條件** `HL.cashback.record(bet,win)`（bet/win 可只帶其一）。底部列 💸 入口 + 面板（複用 #22 骨架：率/淨輸/可領/倒數/VIP 率表/領取）。i18n 繁/簡/英。bump SW v16→v17。preview 實測：淨輸 1000→領 50→冪等 0→再輸累積→大贏歸零不追回、claim 鈕 +100 恰一次、底部列 EN/簡中三語、零 console error。**23-agent 對抗性審查 2 confirmed（皆 i18n）已修**：①底部列 pot==0 副標「淨輸返現」缺字典→補 EN「Net-loss rebate」/簡中「净输返现」；②toast/notify 串接不譯＝全站既有慣例（rakeback/bonus 同、toast API 單字串）保留一致；另清掉複製 rakeback 時留下的死變數 `rateRows`。VIP 中途升級率追溯、可領副標串接皆經驗證駁回為「符合既有模型/慣例、非缺陷」。
    - 來源：**Thrill（10% 淨損 cashback、零流水、即時）** + **Mega Dice（$DICE 15% 淨損 cashback）**——本輪兩家共識的**全新缺口維度**：ApexWin 只有 rakeback（算所有押注 turnover），**完全無「淨輸返現」維度**（算 net loss）。與 rakeback **互補不重疊**，是頂級平台 rewards-first 的核心賣點。
    - 範圍：在中央掛鉤 `HL.liveStats.record(game,bet,win)` 累計「淨輸」（Σ(bet−win) 取正），依 VIP 段位給 %（青銅→鑽石遞增），週期結（每日或每週桶）可領入 `HL.bonus`、零流水。複用 #22 Rakeback 每日桶的「accrue/claim/逾期作廢 + header/面板領取」骨架（但計 net loss 而非 turnover×rate）。純前端 localStorage、零牌照。會動到 `core/progress.js`（或新 `core/cashback.js`）、`live-stats.js` 掛鉤、領取 UI。
34. ✅ **遞增連登階梯 + 里程碑日** — S–M　`(2026-07-09)` — 重寫 `core/rewards.js`：把原「平 7 天循環」升級為 **30 天逐日遞增階梯**（LADDER 單調遞增 100→17,500，第 7 天 1,500 對齊原峰值續攀）＋**里程碑日**（第 8/15/22/30 天疊加大禮 3k/8k/15k/50k）。**日獎進主餘額**（同原行為＝遊戲幣），**里程碑大禮進獎金錢包 `HL.bonus`**＋通知。斷簽 streak 歸零；第 30 天後日獎 plateau、里程碑鍵於 nextStreak（非 capped index）故不重觸發。保留 `status().claimedToday` 等既有欄位（#28 新手窗口依賴）。modal：30 格捲動階梯（`.ax-checkin--ladder`）、今日高亮＋捲入視野、已領✓、里程碑格 🏅+金框。i18n 繁/簡/英（新增「天→ days」全域鍵，grep 確認全站僅簽到表頭一處獨立「天」節點、無誤譯）。bump SW v18→v19。preview 實測：day1=100、day8 領取主+1700/獎金+3000 各一次、冪等、斷簽歸零、day30 里程碑 50000、day31 plateau 17500 不重觸發、day15 E2E 主+4400/獎金+8000、30 格/4 里程碑格/今日高亮、EN「Streak 7 days」+ 標題/副標/demo tag 全譯、零 console error。**8-agent 對抗性審查 1 confirmed（low）已修**：斷簽後表頭仍顯示過期 streak → `status()` 顯示用 streak 改斷簽歸零（與 nextStreak 一致）；駁回「第N天 concatenated 不譯」（符合動態標籤既有慣例）。
    - 來源：**Crown Coins（7 天遞增 Day1→Day7 + 第 8/15/22/30 天里程碑）** + **Stake.us（31 天延展連登包）** + **SpinBlitz（escalating 每日登入禮）**——**三家共識**：ApexWin 簽到目前是平 7 天循環，缺「逐日放大 + 跨月里程碑」。低工作量、純加值。
    - 範圍：把現有每日簽到 streak 升級為「**連續天數越多、單日獎越大**的階梯表」+ 第 8/15/22/30 天**里程碑大禮**；斷簽歸零。複用既有簽到 streak 狀態 + `HL.bonus`，純擴派發表。純前端零牌照。會動到 `core/rewards.js`（簽到派發）。
35. ✅ **時間窗口型限時 Boost（Happy Hour）** — S–M　`(2026-07-10)`
    - **✅ 完成 `(2026-07-10)`** — 新增 `core/happyhour.js`＝`HL.happyhour`：每日三個固定時段（本地 12:00–13:00 / 18:00–19:00 / 22:00–23:00），**窗內返水率 ×2**——掛進 `progress.js` 的 `rbAccrue`（`rb = bet × rbRate × HL.happyhour.mult()`）＝真加成走既有 #22 返水日桶路徑、恰乘一次，非裝飾。底部列 ⚡ 入口（副標「返水×2 進行中／限時返水加成」）＋時段表 modal（進行中剩餘/下一場倒數即時跳動、跨窗界自動重繪、當前場高亮）＋窗口開啟時通知+toast（每日每窗冪等）。i18n 繁/簡/英（grep 確認「進行中」無獨立節點撞鍵）。preview 實測：窗外 accrue 1000→+5（0.5%）、stub ×2→+10（恰翻倍）、倒數即時跳動、EN 零 leak、無窗外誤通知、零 console error。**14-agent 對抗性審查 3 confirmed（皆 low）已修**：①notifyTick 加閉包鏡像（storage-blocked 環境防 30s 洗版→退化為每載入一次）②💧header 下拉與 VIP 面板返水率補「⚡×2」標示（三處顯示面一致、帳本原就正確）③底部列 ⚡ 副標＝render 快照會跨窗界過期→給 `id=ax-bb-hh`、由 30s tick 同步（≤30s 延遲）。駁回：toast t() 鍵前綴（t 為 passthrough、字典鍵==可見節點＝現行契約）。
    - 來源：**WOW Vegas（Happy Hour 週六–週四限時加成）** + **Toshi.bet（Rakeback Boosts 每日 3 個固定時段 UTC 6am/2pm/10pm）**——**兩家共識**：ApexWin 無「排程型時間窗口 boost」（#22 rakeback 是 24h 日桶、非固定時段限時）。催「特定時段回訪」。
    - 範圍：在固定時段（如每日 12:00 / 18:00 / 22:00）開啟限時窗口，窗內返水率 / 任務獎勵 / Lucky Spin 加成 ×N，附「進行中 / 下個 boost 倒數」UI 條（沿用 #17 daily-gate 計時 + #22 倒數模式）。純前端零牌照。會動到 `app-shell.js`（倒數條入口）、新 `core/happyhour.js` 或併入 `progress.js`。

> 候補（受 max_cards 3 張上限暫緩，下輪優先）：任務獎勵「擲骰揭曉」化 Throw the Dice（Mega Dice，#6 任務加變異性，S–M）、Game of the Week 每週精選遊戲（Mega Dice，複用 #21 熱度+#18 倒數，S）、Prize Drops 隨機掉落獎（Mega Dice/SpinBlitz，押注機率掉落、複用 #9 Jackpot 模式，S–M）、社群共享彩池 Community Jackpot（SpinBlitz，#9 加第四級社群池 50%/50%，M）、referral 推薦邀請好友（WOW Vegas，病毒成長維度，M）、滾動視窗衰減 VIP status（WOW Vegas 近 30 天，M）、可領取禮物信箱 Inbox（Crown Coins Mailbox，S–M）、VIP 生日禮（Crown Coins，零成本情感鉤子，S）、Rewards Calendar 統一領取日曆（Toshi，整合 5+ 模組領取，M）、限時 Bonus Drop 掉碼（Stake.us，#19 兌換碼升級為排程掉碼，M）、Coin Flip Original（Toshi，複用 HL.instant+HL.fair，S）、VIP 功能解鎖門禁（Thrill，HL.vip 跨段解鎖 UI，S–M）。

> 候補（受 max_cards 3 張上限暫緩，下輪優先）：VIP 專屬門禁區「The Club」（LeoVegas，依等級解鎖專區 UI，S）、「必須掉落」限時 Jackpot 呈現（LeoVegas Ready-to-Drop，為 `HL.jackpot` 加倒數作廢呈現，M）、rakeback 週/月桶（Duelbits 四桶結構，延伸剛完成的 #22 日桶，S）。

> 🤖 **以下由自我進化引擎自動開卡**（2026-07-02 evolve · 來源：新調研 dorados / spree，並消化 CONTROL 明載上輪未及處理的 chancer / punkz 06-29 dossier）。全自動模式下標 🟦已批准待做。

36. ✅ **點數商城 / Reward Market（消耗端經濟閉環）** — M　`(d-新, 2026-07-02)` — 新增 `core/shop.js`＝`HL.shop`：有效押注經中央掛鉤 `HL.liveStats.record` 累積「商城點數」（每 NT$100 = 1 點），商城 modal 花點數兌換獎勵入 `HL.bonus`（4 品項：小/中/大獎金券固定額 + 神秘獎勵包區間隨機），**VIP 越高折扣越好**（青銅→鑽石 0→20%）、各品項週期冷卻（日/週，冪等）。底部列 🛍️ 入口顯示目前點數。首版兌換標的皆派入獎金錢包＝**每個按鈕真的發獎、非假招牌**（頭像框/免費轉券/加成券留待後續卡）。i18n 繁/簡/英（「點/VIP 折扣」拆獨立節點供 DOM 翻譯層命中）。preview 實測：NT$15k 押注→150 點、VIP 5% 折扣 40→38、兌換 v-m 扣 95 點+入 900 獎金、二兌冷卻回 0（冪等）、點數不足 v-l 擋下、神秘包隨機 150–2000 且與入帳一致、EN/zh-Hant 全譯無殘中文、零 console error。
    - 來源：**Dorados（Reward Market：Elixir 換 free spins / Raid tokens / Shields）** + **Chancer（Bonus Shop：遊玩累點 → 逛商城換 free spins / bonus / 周邊）** + **BigPirate（Reward Market：Rum 換 free plays / 代幣）**——**三家共識的全新維度**（07-02 自動 investigate 深挖 BigPirate 後升為三方，複用度最高、本輪實作）：ApexWin 有一堆「發錢進 `HL.bonus`」的**賺取端**（Lucky Spin / Reload / Raffle / Rakeback / Cashback…），卻**完全沒有「點數消耗端 + 商品目錄」**。補上即成「賺→逛→換」完整經濟閉環，給既有所有發獎機制一個花費出口。
    - 範圍（首版）：新增一種可累積「商城點數」（複用中央掛鉤 `HL.liveStats.record` 依有效押注累點，或直接以既有 XP/押注量換算）＋一個**商品目錄 modal**（花點數換純前端獎勵：Lucky Spin 次數 / free spins 券 / 臨時 boost / 頭像框等），VIP 越高折扣越好、每品項可設每日/每週兌換上限（冪等）。派發複用 `HL.bonus`。純前端 localStorage、零牌照。會動到 新 `core/shop.js`（`HL.shop`）、底部列入口、`i18n.js`。
    - 加速器：複用 `HL.liveStats` 累點 + `HL.bonus.add` 兌換派發 + #24 Reload 的 modal/週期閘骨架。
37. ✅ **賭場之上的持久養成 meta 層「黃金之城」（基地/城市重建 v1）** — M–L　`(2026-07-03)` — 新增 `core/meta.js`＝`HL.base`：有效押注經中央掛鉤累積**金磚**（NT$200 = 1 塊，存浮點顯示取整）→ 投入建設**五階城市**（⛺營地50→🏪市集150→⚓港灣400→🏛️神殿1000→🏰王城2500 塊），每完成一階**同步派里程碑獎入 `HL.bonus`**（300/1k/3k/8k/25k，總 NT$37,300）＋ #38 揭曉儀式慶祝（樣式按階輪換 bubble/wheel/scratch）。天際線五格 UI（已建成亮✓/當前階金框脈動+進度條/未解鎖暗）、投入鈕一次投 min(持有,尚缺)、進度離線保留（localStorage）、全建成顯示 🏆 狀態+累計獎勵。底部列 🏰 入口顯示金磚數。**v1 僅基地養成；PvP raid 依規劃留候補卡。** i18n 繁/簡/英。preview 實測：NT$6k→30 磚、部分投入不派彩、30+20 精準補滿完成階 +300 恰一次、餘磚保留、階推進 invested 歸零、全 5 階完成 +37,000、doneAll 後 invest 回 null、跨 reload 持久、中途關 modal 錢不掉（同步記帳）、三語全譯、零 console error。
    - 來源：**Dorados（Lost City：玩 slot 賺 Coins → 分層 Upgrades 重建城市 → 每層解鎖里程碑 SC）** + **BigPirate（Adventure Mode：Rum 蓋島升級、24/7 離線照跑、里程碑 10,000 Diamonds）**——**兩家共識的全新軸線**：ApexWin 所有留存機制（VIP/任務/連登/Reload/Lucky Spin/Jackpot）都在賭場**之內**，**完全缺一層跨場、離線也持續累積、階梯升級的養成 meta 層**。是與既有機制完全不重疊的差異化維度。
    - 範圍（首版，**先只做基地養成、PvP raid 另拆卡**）：玩任一遊戲的有效押注（中央掛鉤 `HL.liveStats.record`）→累積一種 meta 專用資源（如「金磚」）；資源投入**分層 Upgrades（3–5 層建設進度條）**，每完成一層解鎖里程碑獎入 `HL.bonus`；資源與進度**離線保留**（localStorage），登入即見成長。附一個 meta 面板/頁顯示建設進度 + 下一里程碑。純前端零牌照。會動到 新 `core/meta.js`（暫名 `HL.base`）、底部列/大廳入口、`i18n.js`。
    - 加速器：複用 `HL.liveStats` 累資源 + `HL.bonus` 派里程碑獎 + #24 modal 骨架。**非對稱 PvP raid（搶對手資源、Shield 防守，複用 #15 bot 池 + `HL.fair`）留待此卡完成後另開後續卡。**
38. ✅ **通用「揭曉型領獎」元件（刮刮卡 / 戳泡泡 / 獎輪）** — M　`(2026-07-03)` — 新增 `core/reveal.js`＝`HL.reveal.show({style, title, ic, amount, onDone})`：三種互動揭曉儀式——**scratch**（canvas destination-out 擦除、放開取樣清除率 >45% 揭曉、覆蓋層畫金幣圖樣避開 canvas 不可翻譯問題）、**bubble**（3×3 戳泡泡、第 3 顆揭曉）、**wheel**（8 段裝飾轉輪、停 🎁 段揭曉）；style 不給則隨機。**鐵律：元件純呈現、不派彩**——呼叫端先同步入帳再播儀式（房規），使用者中途關 modal 也不漏帳（preview 實測 bail 錢安全）。已掛兩個真實消費點：**#36 商城神秘獎勵包**（兌換→刮刮卡揭曉→onDone 回商城）、**#37 完成階儀式**（按階輪換三樣式）；未來可掛連登 #34/任務 #6/Reload #24。i18n 繁/簡/英。preview 實測：三樣式全流程（泡泡計數/轉輪鎖鈕/合成 pointer 刮除）、onDone 回呼、金額與入帳一致、三語全譯、零 console error。**經 58-agent 對抗性審查工作流（4 維度×3 票驗證、18 findings→7 confirmed 去重 4 真問題全修）**：組字串儀式標題補全鍵（⛺ 營地 建成！等 6 鍵）、zh-Hans SUFFIX 補「 點→ 分」、HANS 補「已入獎金錢包」、清死鍵。
    - 來源：**Spree（XP 每 10 級解鎖 → 以 scratch-off / bubble burst / prize wheel 揭曉領獎）** + 呼應 **Punkz（Loot Box 開箱儀式）**——ApexWin 領獎多為「直接入帳」，**缺互動揭曉的儀式感**。做成**可複用元件**（非單一玩法）＝一次做、多處掛。
    - 範圍：新增 `HL.reveal` 小元件：傳入「獎勵內容 + 揭曉樣式（scratch/bubble/wheel）」，玩家互動揭曉後再入 `HL.bonus`。可掛在**任何既有領獎點**（連登里程碑 #34 / 任務 #6 / Reload #24 / 點數商城 #36），把「直接入帳」升級為「先揭曉再入帳」。**只在派發前插一層動畫、不改任何派發金額邏輯。** 純前端零牌照。會動到 新 `core/reveal.js`、`components.css`、`i18n.js`。
    - 加速器：純 UI 層、複用既有 modal；與 #17 Lucky Spin 的隨機演出可共用視覺資產。

> 候補（受 max_cards 3 張上限暫緩，下輪優先）：Loot Box 寶箱（Punkz，XP 解鎖/分層/每日多開，複用 #17 隨機派發，M）、provably-fair 即時種子揭露動畫（Punkz，升級 #16 為下注當下視覺揭露，S–M）、Split-Screen 多開模式（Kaasino，同畫面開 1/2/4 款各自結算，複用 `HL.gameFrame.wrap`，最大風險＝多實例狀態隔離，M）、非對稱 PvP raid（Dorados/BigPirate，接 #37 基地養成之後，M）、月度常設積分賽（Dorados Monthly Race，延展 #15 為月榜，S）、XP 等級解鎖軌 Battle Pass（Spree/Zonko/WOW Vegas/Stake.us/SpinBlitz 多家共識，可搭 #38 揭曉領取，M）、**Faucet 餘額歸零續命幣（CoinsBack，餘額耗盡時可領小額續玩、ApexWin 全空白的防流失鉤子，S）**、**逐注 RTP 返還即時可視化「返還中心」（CoinsBack「靜默無 tracker」的反面機會＋#33 淨損 cashback＋rakeback 整成三軌領取視圖，M）**、**互動回合遊戲「離場退回未結算注」watchdog（#27 審查發現：Hilo/Towers/Crash/Mines 全家中途切頁＝扣的注直接沒收且零結算——複用 liveroom.js 既有「ticker 退回未結算注」前例做通用防護，S–M）**。

> 🤖 **以下由自我進化引擎自動開卡**（2026-07-07 evolve · 來源：新調研 stake / bc-game / courtside 07-03 刷新）。全自動模式下標 🟦已批准待做。

39. ✅ **餘額歸零救濟金 Faucet（防流失鉤子）** — S　`(2026-07-07)` — 新增 `core/faucet.js`＝`HL.faucet`：可玩餘額 ≤ 門檻（NT$100）時右下浮現藍色救濟金藥丸，每 8 小時可領一次固定續命金（NT$1,000）。與 Courtside/CoinsBack 一致＝**直接補進可玩主餘額**（`HL.state.set`，救濟金意義就是「馬上能玩」，非入獎金錢包），冷卻中顯示倒數、餘額充足時藥丸自動收起。沿用 #28 onboarding 的**自管 boot interval（不靠切頁清空的 ticker）+ body-mounted 藥丸 + 登入頁 gated 閘 + 語言切換標籤重置**模式；藥丸位置左移避開 #28 右下啟用禮藥丸。純前端 localStorage、零牌照。i18n 繁/簡/英。**preview 實測**：餘額 50→領救濟金 +1000→1050、冷卻 8h、二次領取回 0（冪等）、餘額充足時 eligible=false、零 console error。bump SW v15→v16（與 #32 同輪帶入）。
    - 來源：**Courtside（餘額歸零自動補回 1,000 Coins）** + **CoinsBack（Faucet 續命幣）**——**雙平台共識**、船長 07-03 investigate 日誌明確點名「建議 evolve 優先成卡（高優先）」；ApexWin 對「免費玩家玩到見底就流失」**全空白**的防流失鉤子。此前僅列候補，本輪雙平台共識升為正式卡並即實作。
    - 範圍：餘額 ≤ 門檻時提供「領救濟金」按鈕（冷卻閘），純前端閘 + 補回可玩餘額。純前端零牌照。會動到 新 `core/faucet.js`、`index.html`、`components.css`、`i18n.js`。
40. 🟦 **VIP 升級贈免費 Lucky Spin（level-up 送轉）** — S
    - 來源：**Stake + BC.Game 共識**（VIP 8 起每次升級加送免費 Lucky Spin，升級愈多轉愈多）——把既有 #17 Lucky Spin 與 VIP 升級事件（#29 子級/大階、#31 微等級）掛鉤。ApexWin 現況 Lucky Spin 只有 24h 每日閘，缺「升級即額外送一次免費轉」的獎勵回路。
    - 範圍：`HL.luckyspin` 增「贈轉 token」概念（每日閘外的額外免費轉次數），`HL.vip.addWager` 升子級/大階時 `HL.luckyspin.grant(n)` 累加；底部列 🎡 入口顯示可轉次數。純前端、複用既有 luckyspin 隨機派發 + `HL.bonus`，不改派發金額邏輯。會動到 `core/luckyspin.js`、`core/progress.js`（升級事件掛鉤處）。**注意**：升級事件掛鉤點與 #29/#31 同在 `addWager`，實作時需與該區塊協調。
41. 🟦 **押注質押被動收入引擎 `HL.engine`（BC Engine 對標）** — M
    - 來源：**BC.Game「BC Engine」（2026-04 上線，07-03 刷新頭號情報）**——**ApexWin 全空白的全新留存軸線**：有效押注 `× 房屋優勢 × 10%` 即時取得引擎積分 → 自動歸入**持續生息本金池**（不清空、越玩越大）→ **每小時 drip 派息**入 `HL.bonus`（一天 24 個回訪觸點）。與 ApexWin #22 rakeback 日桶（會清空）、#33 cashback（事後結算）**根本不同**：本金累積 + 高頻 drip + 「被動收入/質押」敘事。
    - 範圍（首版）：有效押注經中央掛鉤 `HL.liveStats.record` 依 `bet×edge×k%` 累積本金池 → **懶觸發**（讀取時依「距上次派息經過幾個整點」補派、冪等）每小時 drip 一筆入 `HL.bonus` → 儀表板顯示本金/累計收益/待領/下次整點倒數（即時跳動）。可選 7 天軟鎖。純前端 localStorage、零牌照。會動到 新 `core/engine.js`（`HL.engine`）、`live-stats.js` 掛鉤、底部列入口。
    - ⚠️ **與 #20 流水引擎相依**：這是「往 `HL.bonus` 灌錢」的**又一新來源、且是高頻 drip**，會複利放大 #20 缺口。實作時派彩走 `HL.bonus`，待 #20 上線改走流水記帳、玩法邏輯不改。

> 🤖 **以下由自我進化引擎自動開卡**（2026-07-09 evolve · 來源：新調研 deal-or-no-deal-win 07-04 / mega-frenzy 07-05 / capyspin 07-06；三份 dossier 淨新缺口極稀，僅 DoND 產出一條真新增量）。全自動模式下標 🟦已批准待做。

42. ✅ **點數商城「機率型兌換」品項：命運寶箱（gacha 加權抽層）** — S–M　`(2026-07-09)` — 為既有 #36 商城 `HL.shop` 補一類 `kind:"gacha"` 品項「命運寶箱」（🎰，日冷卻、cost 90 點）：花固定點數 → 依 `tiers` 權重抽一層獎（200×55%/600×28%/1500×12%/6000×5%，含小機率大獎尾，EV≈758），走 **#38 `HL.reveal` 獎輪（wheel）揭曉**呈現「賭一把」的期待感。與既有 `mystery`（區間均勻隨機＋刮刮卡）區隔＝**離散分層加權＋大獎尾**。派獎複用既有 `HL.bonus.add`（先同步入帳、動畫僅呈現，房規不漏帳）、沿用商城既有折扣/週期冷卻/冪等骨架，**零新架構、零新 bonus 管道**（仍受未解的 #20 流水缺口約束，與商城其餘品項同源）。改 `core/shop.js`（CATALOG 加 gacha 品項＋`pickTier` 加權抽層＋redeem/rewardLabel/揭曉路由三處分支）、`core/i18n.js`（繁/簡/英：命運寶箱/Fortune Chest/命运宝箱）、SW 快取本輪由並行 firing 一路帶到 v19（我的 shop.js 走 network-first、v19 已足以讓回訪者拿到新檔）。preview 實測：品項入列、單抽回合（−90 點/+獎入 bonus/日冷卻二抽回 0 冪等）、**4000 抽分佈 56.1/27.5/11.6/4.9 對齊設計 55/28/12/5、0 個非法層**、UI 兌換鈕→獎輪 reveal modal 出現、三語（NT$200–NT$6,000 標籤 + Fortune Chest/命运宝箱）全譯、零 console error。
    - 來源：**Deal or No Deal Win（Star Shop：花固定 Stars → 「up to X SC」機率型兌換）** + 姊妹站 **Zonko（同源 Stars 經濟）**——DoND 07-04 dossier 唯一真新增量：ApexWin #36 商城的兌換此前全為「固定目錄」或「區間均勻」，缺「離散分層加權 + 大獎尾」的 gacha 期待曲線。
    - 註：同輪 mega-frenzy(07-05，已停運)/capyspin(07-06) 兩份 dossier **淨新缺口＝0**——其機制（Hype Club VIP 階梯／Growth Points／28 日連登／Daily Draw／Season Pass）皆已被既有 #29/#34/#17/#15/#28 覆蓋；並**證偽** radar 對「Hype Club＝可兌換點數商城」與 CapySpin「Guild Battles＝團隊競賽層」兩項假設（來源不足），故**不依其開任何重複/無實證卡**。CapySpin「每日共抽榜 Daily Draw」與 #29 XP 雙軌來源僅記為既有卡（#17/#15、#29）內的微增強候補，非新卡。

> 🤖 **以下由自我進化引擎自動開卡**（2026-07-10 evolve · 來源：新調研 legendz 07-09；唯一淨新缺口＝社交運彩 pick'em 第三內容軸線）。全自動模式下標 🟦已批准待做。

43. ✅ **社交運彩預測「ApexWin Picks」——模擬賽事 pick'em v1（ApexWin 全新第三內容軸線）** — M　`(2026-07-10)` — 新增 `views/instant-picks.js`＝`HL.games` 註冊 originals 可玩卡 `picks`：ApexWin 此前只有 slots／originals 兩大品類，**運彩預測完全空白**——本卡開出第三軸線。把傳統運彩下注 UI 壓成純前端『用主餘額預測**模擬賽事**』：本地隊名池＋運動別 emoji（⚽🏀🏈🎮🏒）產一批 3 場虛擬對戰，每場含兩類盤口——**獨贏 moneyline（主/客）＋大小分 totals（大/小）**，賠率＝`EDGE/p`（1% 莊家優勢，與其餘 originals 一致）。玩家點盤口進「注單（bet slip lite）」顯示我的預測＋預估回報（隨金額欄即時重算），按「下單開賽」→ **一單一 `HL.fair.float("picks")` nonce** 決勝（命中＝`draw < 所選盤口機率`＝逐單可驗證重算），派彩 `floor(bet×odds)`（**floor 而非 round＝小注不反轉 edge**，同 #27/#32 修正）入**主餘額**（運彩贏分＝可玩幣，非灌 bonus），結算走中央掛鉤 `HL.liveStats.record("picks",bet,payout)`＝**補上調研點名 ApexWin 缺的「運彩預測」計分來源**（一次餵 VIP/任務/races/返水/淨損 cashback/熱度）。顯示賠率無條件捨去 2 位小數＝絕不高報實付。game-frame `PF` 表加 `picks:1` 亮 🔒；產生與結果一致的裝飾比分/總分。複用 `HL.instant.amountField`＋公版返回鈕（`gameFrame.wrap key:"picks"`）。i18n 繁/簡/英（🎯 ApexWin Picks／Moneyline／Totals／Home·Away·Over·Under／My pick／Est. return／Place bet／demo tag 全譯）。**v1 僅單注；bet slip 串關 parlay + live 盤口留後續卡。** SW 快取本輪並行 firing 一路帶到 v22（我的檔走 network-first、v22 已足以讓回訪者拿到新檔）。**驗證＝headless DOM/HL stub 載入真檔跑 settle()**（preview 8200 埠被另一 chat 佔用、serve.ps1 自動改埠不被 preview 工具追蹤，故改用對金流更嚴謹的邏輯 harness）：10/10 通過——WIN 派彩 104（bet50 @2.08）餘額 delta 精準、LOSE 恰扣 50 派 0、**60k 注 Monte Carlo RTP 98.45%＝edge ≥1% 守住**、中央掛鉤 record 恰一次且 game=picks/bet=50、floor 語意不高報（displayed ≤ real odds）。`node -c` 全過、零語法錯。
    - 來源：**Legendz（Social Sportsbook：33+ 運動、moneyline/spread/totals/props、雙幣預測）** + **Courtside（sports-first）**——**雙平台共識的全新內容軸線**：ROADMAP 🔵LATER「運動博彩骨架 + bet slip + 串關 Parlay」的純前端具現（**非** DEFER 需牌照項）。真實賽事賠率數據源／結算引擎／即時 feed＝avoid，僅取「社交預測前端 UI」以站內模擬賽事 + `HL.fair` 實現。
    - 範圍（首版）：3 場模擬賽事 × 兩類盤口單注、`HL.fair` 可驗證結算、派主餘額、中央掛鉤補「運彩計分來源」。調研 idea 2（bet slip 組件）已內化為本卡注單 lite、idea 3（運彩計分接留存鏈）已由 `HL.liveStats.record("picks",…)` 達成。純前端零牌照。會動到 新 `views/instant-picks.js`、`index.html`（掛載）、`game-frame.js`（PF）、`components.css`（ax-picks*）、`i18n.js`。

> 🤖 **以下由自我進化引擎「平台軌」自動開卡**（2026-07-23 · 三軌重構後首張平台實作卡 · 來源：`intel/db/platform-modules.json` ★Dockable Layout absent + 船長指令「起步優先＝平台功能先，先把可收納/自由擺放的容器底座做起來」）。全自動模式下標 🟦已批准待做。

44. ✅ **模組化/可停靠佈局底座 `HL.dock`（可收納 · 自由擺放 · 跨站持久佈局）** — M　`(2026-07-23, 本輪 commit)` — 使用者親述核心訴求「功能齊全 + 用不到可收納/自由擺放」的**容器底座**（platform-modules ★ 最高價值缺口，此前僅 `panels.js` 兩個寫死浮層、無收納/擺放/持久）。新增 `prototype/src/layout/dock.js`＝`HL.dock`：**資料驅動面板註冊表** `register(spec)`（id/title/icon/sub/cls/buildScroll/buildFooter/onOpen/onClose/mobileExclusive）——任何未來功能面板一行註冊即獲統一：**開/關/toggle**、**收合(可收納)**（標題列保留、`.is-collapsed` 隱藏主體+底部、▾⇄▸ 切換）、**桌機拖標題列自由擺放**（複用 `HL.dom.makeDraggable`，放手 pointerup 持久座標）、**自動堆疊**（無自訂座標者右→左 16+i×372px、自訂擺放者不參與堆疊、其餘 reflow）、**跨站持久佈局**（`ax:dock:v1` **原生 localStorage、不走 `HL.dom.lsGet` 站別前綴**＝比照 i18n，UI 偏好兩站共用）、resize 去抖重排、手機互斥（mobileExclusive 同時只留一個）。**擴充性優先＝容器先於內容**：把既有的**夥伴 + 聊天**兩浮層改掛到 dock（`panels.js` 重寫為註冊 + 保留 `HL.panels` 舊 API 表面＝app-shell FAB/main.js **零改動**）。改 `index.html`（dock.js 掛在 panels.js 前）、`components.css`（`.ax-float__collapse` + `.is-collapsed` + 標題列 grab 游標）、`i18n.js`（繁/簡/英：收合/展開/收合面板/展開面板/關閉面板）。**驗證**：preview（`http://localhost:3000/?demo=1`，serve root 即 prototype/）零 console error；因 headless 視埠回報寬度 0（CLAUDE.md §9 已知）致 `isMobile()` 恆真，改以 `Object.defineProperty` 覆寫 clientWidth=1280 逐項驗桌機路徑——**開兩面板堆疊 partner right:16px / chat right:388px 精準**、**收合**類別+按鈕字+主體 display:none 三者同步、**拖曳持久**（pointerup 寫入 `pos:{left:120px,top:90px}`）、**relayout 保留自訂座標**（partner 留原位、chat reflow 回 right:16px）、關 partner 不影響 chat、跨站原生 key 寫入正確。**下一步（platform-modules 已回填 partial）**：把主內容區(大廳/儀表板) widget 也納入 grid slot 引擎、面板↔停靠列吸附、多佈局 preset。
    - 來源：platform-modules 台帳 ★Dockable Layout absent（category=擴充性）+ 船長 07-23 待處理指令（起步優先=平台功能先做容器底座）+ extensibility_patterns「Widget/Slot 佈局引擎：shell 只提供骨架與 slot，內容動態渲染、可拖排/釘選/摺疊/隱藏」。

> 🤖 **以下由自我進化引擎「平台軌」自動開卡**（2026-07-23 · 來源：`intel/db/platform-modules.json` ★ 成就徽章牆缺口 + 船長次優先候選「成就徽章牆」+ 新調研 Stake/BC.Game 2026 gamification 共識）。全自動模式下標 🟦已批准待做。

45. ✅ **成就徽章牆 `HL.achievements`（資料驅動成就引擎 + 成就點數 XP 底座 · 擴充性優先）** — M　`(2026-07-23, 本輪 commit)` — 船長 07-23 待處理次優先三候選之一（radar 連 7 輪點名、platform-modules 標為 Missions 模組內未做的 ★ 缺口）。對標 **Stake「達成新目標即獲成就徽章」+ BC.Game「成就/任務→紅利+榜分」**（新調研確認 2026 gamification 共識：徽章/XP/里程碑是留存核心、即時發獎才有多巴胺、業界 22% 留存增益）。新增 `prototype/src/core/achievements.js`＝`HL.achievements`：**擴充性優先＝容器先於內容**——本體是一個「成就『註冊表』」`register(spec)`（比照 `HL.games.register` 自我上架），任何未來模組/同仁遊戲一行註冊即把新成就掛上牆，不動引擎；種子目錄先塞 **19 枚成就 × 6 分類**（下注里程碑/累積押注/勝利/大獎·高倍/探索/忠誠）× 4 分層（銅/銀/金/白金）。**資料流**：掛中央結算點 `HL.liveStats.record` 尾端（一處掛鉤全遊戲＋跟注通吃），累積**終身統計**（下注數/累積押注/勝場/單筆最大贏分/最大倍數/玩過幾款），每次結算後重評→跨門檻且未解鎖者**即時解鎖**：發**成就點數（XP 底座，供未來季票 Season Pass 消耗）**+ 獎金入 `HL.bonus`（帶 source 自動入帳本 → 真站 8× 流水鎖、假站友善）+ 通知 + toast。忠誠類（VIP 段位/連續簽到）門檻於重評時**即時讀取** `HL.vip`/`HL.rewards`，並在 `rewards.claim` 尾端加一行 `HL.achievements.sync()`＝簽到後即時解鎖。牆＝資料驅動徽章網格（`HL.ui.modal` wide、依 cat 分組、已解鎖 ✓+金邊+分層邊條配色、未解鎖灰階+`HL.ui.progress` 進度條、頂部成就點數/已解鎖數/完成度）。入口掛福利中心 hub「成長·商城」分類（🏅 成就徽章牆，sub 顯示 `已解鎖/總數`）。**站別命名空間**（`HL.dom.lsGet/lsSet` → demo/live 平行宇宙隔離，比照 VIP/任務；成就為玩家真實進度非假活動產生器，故不加 isLive() 閘）。改 `achievements.js`(新)/`live-stats.js`(中央掛鉤一行)/`rewards.js`(sync 一行)/`app-shell.js`(hub 入口一項)/`index.html`(掛在 progress.js 後)/`components.css`(`.ax-badge*`/`.ax-badgewall*`)。**驗證**：preview（`http://localhost:3000/?demo=1`）零 console error；JS eval 逐項驗——19 枚註冊、record(dice,100,1500) 即解鎖 first-bet+mult-10（15×）pts=20/獎金 delta=700(100+600)、mult-100 進度 15%、二次 record 冪等不重發、**經真中央點 `liveStats.record` 驅動有效**、`test()` 型忠誠成就 vip-gold 於 VIP 升黃金後 `sync()` 即時解鎖、牆 modal 19 卡/2 金邊/17 進度條渲染正確。**下一步**：季票 Season Pass 可消耗成就點數作 XP 來源；徽章可掛個人檔/排行榜；同仁遊戲 register 專屬成就。
    - 來源：platform-modules 台帳「任務/成就/簽到」evidence 標「成就徽章牆為 radar 反覆點名缺口」+ 船長待處理次優先三候選（Guild meta / **成就徽章牆** / Season Pass ★）+ 新 WebSearch 調研（Stake achievement badges / BC.Game achievements+missions / Xtremepush 7 大 gamification 機制含 Badges/Points/Tiers）。extensibility_patterns「訂閱者模式中央掛鉤」+「插件註冊表」雙落地。

46. ✅ **季票 / Season Pass 外殼 `HL.season`（雙軌加速 · config 驅動 · 擴充性優先）** — M　`(2026-07-24, 本輪 commit)` — 船長 07-23 待處理次優先三候選最後可純前端落地者（platform-modules ★ 缺口「季票/battle-pass 化外殼 Season Pass」absent；radar 第 7 度共識主題）。對標 2026 頂級 casino 的 **live-service / battle-pass 化留存**（gamified 6 月留存 >75% vs ~50%），疊在既有骨架上不重造輪子。新增 `prototype/src/core/season.js`＝`HL.season`：**擴充性優先＝容器先於內容**——一份「賽季設定」(SEASON) 就是一張**可換的 config 排程**（`setSeason(cfg)` 出口；`state.sid` 不符即自動重置進度＝換季），階梯 `tiers` 為純資料陣列（種子 30 階、每 10 階與最終階加碼 milestone）。**雙軌**：免費軌（人人可領）／進階軌（premium，需先**花費「成就點數」解鎖**＝直接消耗 #45 `HL.achievements` 鋪的 XP 底座、解鎖後回溯領已達階級）。**資料流**：賽季經驗(XP) 由中央結算點 `HL.liveStats.record` 尾端**有效押注**累積（比照 VIP addWager，一處掛鉤全遊戲＋跟注通吃）、跨階即時通知；階梯獎勵一律入獎金錢包 `HL.bonus`（帶 source `季票·免費軌`/`季票·進階軌` 自動進帳本 → 真站 8× 流水鎖、假站友善）。面板＝`HL.ui.modal` wide 資料驅動階梯（賽季進度條/剩餘天數/Tier x/總數、免費軌+進階軌雙欄 chip、已領/可領/未達/需進階四態、逐階領取 button + 一鍵領取、進階軌解鎖 CTA 顯示成本/可用成就點數）。入口掛福利中心 hub「成長·商城」（🎟️ 季票，sub 顯示可領項數/當前 Tier）。**站別命名空間**（`HL.dom.lsGet/lsSet` → demo/live 平行宇宙隔離，比照 VIP/成就；玩家真實進度非假活動產生器，故不加 isLive() 閘）。改 `season.js`(新)/`live-stats.js`(中央掛鉤一行)/`app-shell.js`(hub 入口一項)/`index.html`(掛在 achievements.js 後)/`components.css`(`.ax-spass*`)/`sw.js`(v84→v85)。**驗證**：preview（`http://localhost:3000/?demo=1`）零 console error；JS eval 逐項驗——經真中央點 `liveStats.record("dice",4500,0)` 累積 XP 精準（4500→Tier 3）、claim 冪等/未達階級/進階未解鎖三閘皆擋、`unlockPrem` 恰扣 60 成就點數（135→75 可用）且回溯開放、`claimAll` 清空可領、**六階獎金精準落地 locked 獎金錢包**（免費 180/1200/2500、進階 480/3600/30000＝config 數學正確）、面板 30 階/60 chip/7 可領 button/進行中階 is-now 渲染正確、`HL.bonus.add` 走 locked 待解鎖（與 #45 一致、非直入 balance）。**下一步**：季票任務（每日/每週任務給額外賽季 XP）、賽季輪替排程、進階軌獎勵擴充（點數商城券/faucet 券）、季票掛個人檔展示。
    - 來源：platform-modules 台帳 ★「季票/battle-pass 化外殼 Season Pass」absent + 船長 07-23 待處理次優先三候選（Guild meta / 成就徽章牆 / **Season Pass** ★，成就徽章牆 #45 已消化）+ radar 第 7 度 live-service/battle-pass 共識。extensibility_patterns「訂閱者模式中央掛鉤」+「config-driven」+「命名空間隔離持久化」三落地；直接消耗 #45 成就點數＝兩張成長卡串成 XP 經濟閉環。

47. ✅ **團隊/公會 meta `HL.guild`（team-vs-team 社交層 · 資料驅動骨架 · 擴充性優先）** — M　`(2026-07-24, 本輪 commit)` — 船長 07-23 待處理次優先三候選**最後一項**（Guild meta；radar 連 7 輪標為「業界最強空缺、仍空白」＝CapySpin Guild Battles/島戰 raid/Stake·BC.Game crew 週榜共識；platform-modules 台帳「團隊/公會 meta」★ absent）。ApexWin 先前僅 #30 Dice Duel 1v1、無團隊層。**依船長建議「先做純前端骨架＝好友/隊伍容器 + team-vs-team 掛中央結算點」**。新增 `prototype/src/core/guild.js`＝`HL.guild`：**擴充性優先＝容器先於內容**——本體是一個「公會『註冊表』」`register(spec)`（比照 `HL.games.register`/`HL.achievements.register` 自我上架），未來模組/後端一行註冊即把新公會掛上榜；種子 6 個公會（暗影狼群/黃金龍族/霓虹辛迪加/幸運草會/赤紅騎士團/虛空行者，各帶 icon/tag/motto）。玩家加入一個公會，其有效押注即成該公會「週貢獻」。**資料流**：掛中央結算點 `HL.liveStats.record` 尾端 `HL.guild.record(bet)`（一處掛鉤全遊戲＋跟注通吃），累積玩家本週貢獻→計入所屬公會週榜分數，推進**個人貢獻任務**里程碑（4 階 5k/20k/60k/150k → 200/800/2500/8000 獎金）。**兩條獎勵路徑**皆入獎金錢包 `HL.bonus`（帶 source 自動進帳本→真站 8× 流水鎖）：① 貢獻任務里程碑（玩家本人本週貢獻跨門檻即可領，冪等 per week）＝真正玩家賺得；② **週榜結算**（跨週 `weekNum()` 換季時依所屬公會 vs 對手最終名次派團隊獎金 5000/2500/1000，冪等 per week，比照 `tournament.settle`）。**純前端骨架 + isLive() 閘**：其他隊伍週分與隊友貢獻為確定性種子模擬（同週穩定、隨週變動），**真站(live) 一律歸零/過濾**（無假隊伍/假隊友，只留玩家自己所屬公會的真實貢獻＝比照 tournament/arena bot 的假活動閘）。面板＝`HL.ui.modal` wide：未入會→公會瀏覽卡（6 卡 join CTA）；已入會→儀表板（所屬公會 header/名次/我的貢獻 + team-vs-team 週榜 6 列高亮「我」+ 隊內貢獻榜 + 4 階貢獻任務 chip + 換公會/退出）。入口掛福利中心 hub「成長·商城」（⚔️ 公會·團隊戰，sub 顯示週榜名次/加入 CTA）。**站別命名空間**（`HL.dom.lsGet/lsSet` → demo/live 平行宇宙隔離，比照 VIP/成就/季票）。改 `guild.js`(新)/`live-stats.js`(中央掛鉤一行)/`app-shell.js`(hub 入口一項)/`index.html`(掛在 season.js 後)/`components.css`(`.ax-guild*`)/`sw.js`(v85→v86)。**驗證**：preview（`http://localhost:3000/?demo=1`）零 console error；JS eval 逐項驗——6 公會註冊、未入會 record 不累積(contrib=0)、join 好/壞值(true/false)、經真中央點 `liveStats.record("dice",3000,0)` 精準 +3000 累積、貢獻 6k→1 項可領、claim 冪等(二次 false)/未達階級擋、26k→milestone 1 可領、名次計算(6 隊中第 2/3)、**isLive() 閘：真站 totalGuilds 6→1（無假對手隊）/rank=1，切回 demo 復原 6**、leave 後 joined=false；面板 DOM——瀏覽 6 卡/週榜 6 列(1 列 is-mine)/4 貢獻任務列/1 可領 button/隊友 4 列(含「你」)/header 渲染正確（「赤紅騎士團｜第 3 名 / 6 隊｜NT$24,000 我的貢獻」）。**下一步（route C/D）**：好友系統/邀請入會、公會聊天頻道（掛 HL.dock）、公會 raid/協力目標、後端多人真週榜（phase8 guild_econ 依站別）、公會招募/申請審核。
    - 來源：platform-modules 台帳 ★「團隊/公會 meta Guild/Team Layer」absent + 船長 07-23 待處理次優先三候選最後一項（Guild meta）+ radar 連 7 輪「業界最強空缺」。extensibility_patterns「插件註冊表」+「訂閱者模式中央掛鉤」+「命名空間隔離持久化」+「站別感知閘門 isLive()」四落地；與 #45 成就牆/#46 季票同構的資料驅動註冊表家族。**待處理次優先三候選至此全數消化（#45 徽章牆 + #46 季票 + #47 公會）。**

48. ✅ **限時損失保險 / 新手安全網 `HL.safetynet`（首週淨損自動退還 · onboarding 留存鉤）** — S–M　`(開卡 2026-07-27 研究輪；實作完成 2026-07-27 平台軌建置輪 commit 見日誌)` — 來源：**BC.Game 2026『BC Engine』72 小時新手安全網**（前 3 日虧損 20% cashback、無流水綁定）+ platform-modules 台帳 活動分類 07-27 審新增缺口。ApexWin 已有 #33 事後 cashback（依 VIP 週期結算）+ #28 新手窗口，但**無「限時損失退還」變體**＝針對新玩家前 N 日（建議首 3–7 日）累計淨損按 % 自動退回、無流水綁定，是頂級平台驗證過的高效 onboarding 留存鉤（降低新手早期爆倉流失）。
    - 範圍（首版，純前端）：`HL.ledger` 已逐筆記 bet/win → 可算「註冊後 N 日窗口內累計淨損」；窗口內每日（或到期）把淨損 × 退還率（如 20%，設封頂）自動退回 `HL.bonus.add`（帶 source `新手安全網`→自動入帳本、真站流水鎖與慷慨值分站別，比照 §11 站別感知）。UI：福利中心一張卡顯示「安全網倒數 X 天 / 目前可退還 NT$Y / 已退還」。冪等 per day，逾窗自動退場（比照 raffle/guild 週期懶觸發）。
    - 擴充性：做成 **限時損失保險** 為 促銷/活動框架 的一種 campaign 模板（窗口天數 + 退還率 + 封頂皆 config），用不到 toggle 關；未來可推廣為「週末損失保險」等變體。工作量 S–M。**注意**：真站退還率須併入 §11 經濟重調（避免刷淨損套利），demo 可慷慨。

> 🤖 **以下由自我進化引擎「平台軌」自動開卡**（2026-07-28 · 來源：新調研 stake-us 07-28 刷新（每週輪替促銷排程）+ roobet 07-28 刷新（30 級成本導向 rakeback）+ `intel/db/platform-modules.json` 促銷/活動框架 weak 排程軸缺口）。全自動模式下標 🟦已批准待做。

49. ✅ **促銷排程註冊表 + 活動日曆 `HL.promoCal`（排程軸容器 · 玩家可見「現在／即將」· 擴充性優先）** — S–M　`(開卡 + 實作完成 2026-07-28 平台軌建置輪，commit 見日誌)` — 來源：**Stake.us 2026「每週輪替促銷排程」**（raffles/races/jackpots/poker 每週重設或換一批，站上以排程呈現「本週在跑什麼」）+ **業界共識**（多家 casino 促銷頁同時提供 **calendar view + list view**，讓玩家**預先看到即將到來的活動**並安排回訪；weekly reload 固定在特定日）+ platform-modules 台帳「促銷/活動框架」**weak**（統一事件驅動 campaign 引擎的**排程軸**）。**問題**：ApexWin 既有 `HL.raffle`/`HL.tournament`（startAt/endAt）、`HL.happyhour`（排程型時段 boost）、`HL.season`（config 賽季）、`HL.safetynet`（#48 窗口）**各自都有時間窗口，卻彼此不知道對方**；玩家**無任何一處**能看到「全部活動 + 即將到來者」，只能逐個入口點進去猜。
    - 範圍（首版，純前端）：新增 `prototype/src/core/promo-cal.js`＝**資料驅動排程註冊表**（比照 `HL.dock`/`HL.achievements`/`HL.guild` 註冊表家族）——`register(spec)` 自我上架，支援三種排程型別：`window`（絕對 startAt/endAt，如 raffle/tournament/safetynet）、`recurring`（每日/每週固定時段，如 happyhour）、`always`（常設，如 luckyspin/rain）。統一 `list()` 回傳依 **live → upcoming → ended** 排序並帶 `phase`/`startsIn`/`endsIn`；`HL.ui.modal` 活動日曆面板＝**7 日時間軸 + 清單雙檢視**（對標業界 calendar/list view），每則可點擊直接 `open()` 該活動。**容器先於內容**：既有模組只需 register 一次即上架，日曆本身不認識任何特定活動。
    - 擴充性：`extensibility_patterns`「插件註冊表」+「Config-driven Dashboard」落地；空清單自動不渲染整區；未來新 campaign（週末損失保險/節慶活動）register 一行即出現在日曆，無需改日曆程式。補上台帳 promo 框架的**排程軸**（A-B/分群仍缺 → 整框架維持 weak）。

50. ✅ **成本加權 VIP/賽季進度（每遊戲 edge 係數 config 表 · 三平台共識）** — M　`(實作完成 2026-07-31 平台軌 14:00 建置輪)` — 來源：**BC.Game 2026『BC Engine』**（XP 改依每局實際成本／house edge 計權，策略型/低-edge 遊戲終獲對等 XP；07-27 深挖）**+ Roobet 2026 刷新**（rakeback **30 級制**的等級由「押注活動 + 存提頻率 + **win/loss 戰績** + **遊戲選擇**」複合決定＝同樣依玩家對莊家的實際成本計權）＝**兩平台獨立收斂到同一設計、已升級為跨平台共識缺口**（platform-modules 台帳 VIP 模組已記）。
    - 問題：ApexWin `live-stats.js` 現行 `HL.vip.addWager(bet)` 為**平權流水記點**（每 $1 押注等值、不分遊戲 RTP）→ 玩 98% RTP 的 Dice 與玩 96% 的 slot 給莊家的實際成本差一倍以上，VIP/賽季進度卻相同；既鼓勵純刷低 edge 遊戲套返水，也讓高波動玩家的貢獻被低估。
    - 範圍（純前端）：中央點 `HL.liveStats.record(game, bet, win)` 結算時**已同時知道 game 與 bet** → 只需一張「每遊戲 edge 係數」**config 表**（每遊戲一筆，如 dice 0.02 / slot 0.035），把餵給 VIP/賽季/成就的有效押注乘上係數（或改餵 `bet × edge` 的理論損失）。**不填係數即退回平權＝零回歸**（未列入表的遊戲維持現行行為）。可順道在 VIP 面板顯示「本局貢獻」讓機制透明。
    - 注意：係數表須與 §11 經濟重調對齊（真站係數影響返水/升級金成本）；屬打磨向、非急，但已有兩平台共識支撐。
    - **第三個平台共識（2026-07-31 本輪刷新 Duelbits）**：Ace Lounge 明載為「基於 **house edge** 的永久 cashback 系統，而非傳統 VIP 階梯」＝第三家獨立收斂到同一設計（BC.Game／Roobet／Duelbits）。
    - **落地（2026-07-31 平台軌 14:00 建置輪）**：新增 `core/edge.js`＝**每遊戲 edge 係數 config 表**（22 款，值一律取自該遊戲程式內實際 `EDGE` 常數或已過保真閘實測 RTP，非行銷值）。加權只在中央點 `live-stats.js` 一處發生：`var xpBet = HL.edge.weighted(game, bet)` 只餵 **`HL.vip.addWager` 與 `HL.season.record`**；`bet` 本身與帳本/返水/彩金/抽獎券/任務目標/公會貢獻**一律維持真實金額**（preview 實測 money-wheel 押 10000 → VIP **+18000**、而 turnover/公會貢獻 **+10000**、抽獎券 **+5**）。
    - **設計：一條曲線、兩種縮放（站別感知，比照 §11 既有範式）**——`SHAPE(edge)` 線性映射到 1.00×–1.80×，再乘站別 `SCALE`：**假站** SCALE=1 ⇒ 最低倍率恰 **1.00×**（**沒有任何遊戲比改版前更慢**＝避免懲罰感，正是 wow-vegas 調研檔自記的設計建議）；**真站** SCALE=1/mean(SHAPE) ⇒ 全表**平均恰 1.00×**（純重分配、**不加發經驗**＝不鬆動剛轉正的真站 NGR）。**兩個性質皆為機械驗證的測項**，非口頭宣稱。
    - **雙環境契約 + 6 個常駐測項**：純函式區 `module.exports` 供 `tests/run.js` require ⇒ `edge/table-sane`／`edge/demo-floor`（假站零退步）／`edge/live-neutral`（真站平均 1.00×，實測 0.9982）／`edge/monotone`（倍率隨成本單調不減）／`edge/unknown-neutral`（未登記＝恰 1.00×，故漏登記只退化不出錯）／`edge/weighted-int`，外加瀏覽器 `edge/wired`（檢查中央點確實引用 `HL.edge`、且帳本仍記真實 `bet`）。node **16/16**、瀏覽器 **17/17** 全過。
    - **附帶修掉一個既存缺陷（本卡的前置條件）**：`views/instant-games.js` 的 **Dice／Limbo／Plinko 三款完全沒傳 `game:`**，於 `instant.js:76` 落入 `opts.game || "instant"` ⇒ 三款旗艦 originals 長期以**同一個假 key `"instant"`** 回報中央結算點。連帶受害者不只本卡：**#51 注單中心分不出這三款**、`HL.heat` 遊戲熱度替不存在的遊戲加溫、`HL.achievements` 逐遊戲統計失準。已補三個真 key（全 repo 其餘 13 個 betPanel／betArea 呼叫本來都有帶；grep 確認無任何程式消費 `"instant"` 這個 game key ⇒ 修正零破壞）。preview 實測真打一局 Dice：中央點收到 `record("dice", 50, 99)`。
    - **UI**：VIP 面板新增唯讀入口「⚖️ XP 成本加權（各遊戲倍率）→」開 wide modal（22 列倍率表，依倍率高→低排序、gold token、`overflow-y:auto`、零水平溢出）；i18n 補 EN 8 鍵／zh-Hans 7 鍵，**三語逐項驗證**。sw v120→v121。
    - **⚠️ 誠實限制**：① 「平均 1.00× 中性」是對**係數表 22 款均勻抽樣**而言，非對真實玩家遊戲分佈（真實分佈未知；若玩家高度集中於低 edge originals，真站實際平均會低於 1.00×＝偏保守，不會超發）。② 真站中性模式本輪**未在真站環境實跑**（切站需 reload，headless 輪未做），但 `meanWeight("live")=0.9982` 與 `edge/live-neutral` 測項在兩環境皆通過。③ 沙箱 viewport=0，倍率表的窄螢幕幾何未量測（已採 `overflow-y:auto` + `text-overflow:ellipsis` 防線）。④ `slot`（Shadow Ritual）與 `chicken` 仍無 RTP 數學模型故**刻意未列入表**＝維持 1.00×，待遊戲軌補模型後再登記。

51. ✅ **注單／投注歷史中心 `HL.betlog`（逐局紀錄容器 · 掛中央點全遊戲通吃 · CSV 匯出 · 擴充性優先）** — M — **建議為下一張實作卡**。來源：**2026 可驗證公平業界基準線**（07-28 調研：provably fair 已從「加分項」變成 crypto casino 的 baseline requirement，操作商普遍提供「**bet history 匯出，含 seed / nonce / timestamp / 遊戲識別**」與 in-browser verifier；驗證流程的標準第一步就是「**開啟歷史紀錄、選一筆 bet ID**」再比對 server seed + client seed + nonce）+ platform-modules 台帳 **資料** 分類 07-28 審新增 ★ 缺口。
    - 問題（07-28 grep 實證）：**ApexWin 全站無任何逐局紀錄落地**。`HL.liveStats` 是工作階段記憶體統計（`live-stats.js` `fresh()` 每次歸零、不落地）；`HL.fair` 只在記憶體留最近 **12** 筆種子/nonce（`fair.js:101` `history.slice(0,12)`）；app-shell 的「交易紀錄」只有 deposit/withdraw 不含遊戲局。⇒ 玩家無法回看昨天玩了什麼／贏多少，且**#16 可驗證公平實質半殘**——輪換種子後對不上第 N 局（承諾能驗算，但沒有可查的注單與 nonce 對應表）。同時 `csv|Blob|download` 全 repo 零命中＝台帳「報表與匯出」weak 的根因。
    - 範圍（首版，純前端）：新增 `prototype/src/core/betlog.js`＝**統一注單中心**。**寫入點只有一處**——掛既有中央結算點 `HL.liveStats.record(game, bet, win)` 尾端 append 一筆 `{betId, game, bet, win, mult, ts, clientSeed, nonce}`（**不動任何遊戲檔即全遊戲＋主播跟注通吃**，比照 #45/#46/#47 的中央掛鉤範式）；seed/nonce 由 `HL.fair.info()` 當下快照取得。**環形緩衝上限**（建議 500 筆，超過丟最舊）防 localStorage 膨脹；**站別命名空間**（`HL.dom.lsGet/lsSet` → demo/live 平行宇宙隔離）。面板＝`HL.ui.modal` wide 分頁表格 + 篩選（遊戲／日期／只看贏／只看輸），單筆可**深連結 `HL.fair.verifyModal({clientSeed, nonce})`** 直接帶入驗算，並提供 **CSV 匯出**（`Blob` + `a[download]`，同時補「報表與匯出」weak 的第一個真出口）。
    - 擴充性：**欄位為資料描述子陣列**（加欄位＝加一筆定義，表頭/CSV/篩選器同步生成）＝`extensibility_patterns`「Config-driven Dashboard」+「訂閱者模式中央掛鉤」+「命名空間隔離持久化」三落地。後續可掛：個人統計檔（每遊戲勝率/最佳倍數，餵 #45 成就與 ROADMAP「分享單局戰績」）、`HL.dock` 面板化、phase8 後端 `bet_log` 依站別。
    - 注意：純呈現/紀錄層，**不改任何結算數學**＝零經濟回歸風險；`record` 為 hot path，append 需輕量（單次 `lsSet`、不做同步 JSON 大量重排）。
    - **落地（2026-07-31 平台軌 catchup 建置輪）**：新增 `core/betlog.js`（9 欄 `COLS` 描述子驅動表頭／明細／CSV 單一真相、環形 `CAP=500`、站別命名空間）；寫入點只有 `live-stats.js` 尾端一行 `HL.betlog.record`。**順帶把「哪些遊戲算可驗證公平」收斂成單一真相** `HL.fair.isPF`／`pfGames`（此前只存在於 `views/game-frame.js` 的區域 `PF` 表，任何模組要判「這局能不能驗算」都得複製一份）。入口兩處：`fair.fairnessModal` 新增「📜 我的注單」（＝業界驗證流程第一步「開歷史紀錄挑一筆 bet ID」）＋ ⚙ DEMO 工具面板。i18n 補 EN 25 鍵／zh-Hans 24 鍵。sw v118→v119。
    - **雙環境契約**：純函式區（`COLS`/`_push`/`_csvOf`）以 `module.exports` 暴露，`tests/run.js` 新增 require ⇒ 兩個測項（環形上限、CSV 表頭與 RFC4180 跳脫）**每次跑 harness 都會重跑**，不重蹈 #53 立卡理由的「一次性 `node -e` 驗完就消失」。
    - **驗證（preview `?demo=1` 全程零 console error + node harness）**：node `tests/run.js` **10/10 PASS**（既有 8 + 本卡 2，零回歸）；瀏覽器 `HL.selftest.run({group:"betlog"})` **3/3 PASS**。走**真中央結算點**：`liveStats.record("dice",100,250)`+`("chicken",500,0)` → 落 2 列、最新在前、`cs`/`ne` 皆帶值；**環形上限實測**灌 520 筆 → 留 500（id 551–1050）；篩選 all2/win1/loss1/byGame1；CSV 表頭 `bet_id,time_iso,game,bet,win,multiplier,net,client_seed,nonce_end`。**PF 閘正確**：`dice`/`baccarat` → 有「驗算」鈕，`chicken`/`shadow-ritual` → 顯「—」且無鈕（＝不對非可驗證公平的局偽造可驗證性）；**驗算深連結**帶入 `nonce = ne-1 = 5` 且 clientSeed 相符。淨額色票紅/金正確。三語逐項（表頭 9 欄＋分段＋動作鈕）繁/簡/EN 全覆蓋。
    - **本輪未能驗到、誠實記錄**：preview 沙箱視窗 `clientWidth = 0`（headless 排程輪固有），**幾何/自適應（水平溢出、窄螢幕表格）無法量測**；已採 `/apexwin-ui-quality` 對寬表的標準防線＝`.ax-betlog__scroll { overflow-x:auto }` 自身捲動不外溢，並經 `getComputedStyle` 確認生效，但真實斷點表現待有可靠 viewport 的一輪或使用者線上複核。
    - **留給維護軌的去重債**：`views/game-frame.js` 的區域 `PF` 表尚未收斂到 `HL.fair.isPF`（該檔為遊戲軌高頻改動檔，本輪刻意不動以免撞車）；改讀即可消除一處必然 drift 的重複名單。

52. ✅完成（2026-08-04 平台軌建置輪） **促銷 opt-in「我的優惠」+ 限時返水加成（rakeboost）· 兩平台共識** — S–M — 來源：**bet365 2026**（Offers 頁長年主機制＝**每個促銷需玩家主動 opt-in 才生效**，玩家因此得到「我的優惠」清單與到期預期，平台得到意圖訊號；同時 bet365 casino 刻意無 VIP 階梯、全靠輪替 targeted offers）**+ Rollbit 2026**（返水為**時間窗階梯**：首 24 小時每注 15%、之後常態 5%＝把最高回饋壓在最易流失的頭 24 小時；另有需啟用的 Rakeboost）＝**兩平台獨立收斂到「促銷是可加入的狀態 + 回饋率可被限時放大」**。
    - 問題：① **#49 `HL.promoCal` 已鋪好排程註冊表 + 日曆/清單雙檢視容器，但每則只有「前往」沒有「加入」**＝缺 opt-in 狀態層（玩家無「我的優惠」概念，也無到期提醒依據）。② `HL.rakeback`（`progress.js:282` `accrue/pot/rate/claim`）**費率只由 VIP 係數決定，無任何時間窗／活動加成入口**——`HL.happyhour` 已證明「時段加成」在本站可行，但吃不到返水這條線。
    - 範圍（純前端）：① promoCal spec 增選用欄位 `optIn:true` → 面板每則多一顆「加入」，狀態存站別命名空間（`{promoId: joinedAt}`），清單可篩「我的優惠」，並在 `phase` 之外多一態 `joined`；**未宣告 `optIn` 的既有 spec 行為完全不變＝零回歸**。② `HL.rakeback.rate()` 加一層 **boost 乘數解析**（`rate = VIP 係數 × activeBoost()`），boost 來源為 config 化的加成排程（新手首 N 小時／opt-in 活動／happyhour 時段皆為同一張表的一筆），並 register 進 #49 日曆＝**活動排程與回饋率首次接線**。返水面板顯示「當前 ×N 加成，剩餘 hh:mm」。
    - 注意：**站別感知（§11）**——真站返水本已收斂至 0.1–0.3%，boost 乘數與時長須另設保守值（假站慷慨、真站小幅），且需經 `HL.ledger` 確認送幣成本不致 NGR 轉負；新手窗口與 #48 `HL.safetynet`（前 N 日淨損退還）為互補而非重疊，勿雙重補貼同一批新玩家過頭。
    - **落地內容**：新增 `core/rakeboost.js`（加成排程註冊表 + 純數學核心，雙環境契約）＝`progress.js` 的 boost 入口由「硬編 `HL.happyhour.mult()`」改為 `HL.rakeboost.mult()`，happyhour／新手窗口／opt-in 活動皆退位成表裡的一筆（新增加成＝register 一行，不再動金流熱路徑）。`promo-cal.js` 加 opt-in 狀態層（`join/leave/joinedAt/isJoined/canJoin`，狀態走 `HL.dom.lsSet` ⇒ 自動吃 §4 真假站命名空間）＋第三個分頁「我的優惠」＋每列「加入／退出」鈕；**未宣告 `optIn` 的既有 spec 一律不生成按鈕、`list()` 欄位補 false ⇒ 零回歸**。
    - **解析規則＝取最高、不相乘**（刻意）：相乘會讓送幣成本無上界（兩個 ×2 疊成 ×4），§11 剛轉正的真站 NGR 會被一次活動疊穿 ⇒ 改「最高適用加成勝出」＋站別硬上限（demo 3.0／live 1.5）。**副作用＝只有 happyhour 生效時 `mult()` 逐位等於 `HL.happyhour.mult()`＝#35 零回歸**（常駐測項 `rakeboost/wired` 盯著）。
    - **順帶補強 #60 的不變量證明**：#60 證「返水 < 該注理論莊家收入」時**全部測項跑在 boost=1**，而線上 happyhour ×2 時假站頂階 0.875×2=1.75 ⇒ **早已可超過莊優**（既存事實，非本卡新增）。本卡依 §11 把它分軌並機械化：真站 `maxPct×CAP = 0.145×1.5 = 0.2175 < 1` ⇒ **含加成仍恆真（硬測項，逐遊戲逐段位實算）**；假站明載刻意超發但斷言有界（<3）。⇒ 真站保證比 #60 出貨時更強，假站超發從「沒人算過」變成「寫明並被測項盯著」。
    - **反濫用**：opt-in 加成一次 6 小時、**每日限加入一次**，且「退出」保留當日記錄 ⇒ 反覆加入/退出無法刷加成（`rejoinWhileActive=false`／`rejoinSameDay=false` 實測）。新手窗口用**老玩家守衛**播種（播種當下 `HL.vip.status().wager > 0` 即記 0＝永不啟用），避免上線瞬間讓所有既有玩家白拿一輪。
    - **驗證**：node `--group rakeback` 8/8、全量 fast **39→42**；**負向驗證**（① resolve 改成相乘 ② `CAP.live` 放寬到 8× ③ 真站乘數反轉成比假站慷慨）**三種擾動皆被對應守衛判 FAIL、還原後全綠**＝測項非空殼。瀏覽器 harness **26→30**（rakeback 群 10/10 含兩支 wired）。**真結算路徑 e2e**：同一注 NT$10,000 pirots 未加成 262.14／加成後 393.21＝**精確 ×1.5**，且 262.14 與 #60 上輪記錄的 e2e 值**逐位相同**＝零回歸。繁簡英三語逐項驗（新字串在 EN/zh-Hans 皆生效、本卡負責字串零殘留繁中）、零 console error、375px 手機下 modal 與各列**零水平溢出**、按鈕 60×53／77×53 未被壓成 0 寬。
    - **本輪自身教訓（第三次踩 P3 混合文字節點雷）**：首版寫了三處「中文＋動態值」單節點（`已加入 0 / 1`、`加入即開啟返水加成 ×1.5`、`加成生效中 · 剩 5h`）⇒ preview EN 模式抓到全數翻不到。已修前兩處（拆成「可翻譯 label 節點 + 純數字值節點」／把 ×N 移出 note 改由返水面板呈現）；第三處（帶倒數）**受限於 #49 `note` 是單一字串→單一文字節點**，該檔七個既有 note 全同形＝**#49 的既存 i18n 債**，已在 `rakeboost.js` 檔頭寫明並留給維護軌隨 #49 note 形狀一併處理。另記一條 **preview 驗證陷阱**：MutationObserver 回呼是非同步的，「開 modal → 同一個 tick 讀 innerText」會讀到**未翻譯**的中間狀態，連既有鍵都像壞掉 ⇒ 驗 i18n 必須 `setTimeout` 後再讀（本輪先誤判成回歸、追查後確認為量測法錯誤）。

> 🤖 **以下由自我進化引擎「平台軌」自動開卡**（2026-07-29 · 來源：`intel/db/platform-modules.json` **擴充性** 分類審（輪替接續 07-28 資料）+ crown-coins 07-29 刷新（Early Bird 搶先體驗））。全自動模式下標 🟦已批准待做。

53. ✅ **自我檢測底座 `HL.selftest`（測項註冊表 + 雙環境執行器 + 唯讀面板 · 擴充性優先）** — M　`(開卡 + 實作完成 2026-07-29 平台軌建置輪)` — 來源：platform-modules 台帳 **擴充性** 分類「自動化測試 Automated Tests」**absent**（長期唯一 absent 的擴充性模組）+ **2026-07-28 健檢實證代價**：`Dead By Noon` 買入價誤設 80× 而 E[買入]≈41.7×（**買入 RTP 僅 52%、玩家暗虧 44pp**）竟被記「13/13 PASS」上線——**一次性 `node -e` 驗證做完就消失，沒有任何東西會在下一輪重跑它**。
    - 問題：全站零測試基建，驗證全靠人工 preview + 一次性 `node -e`（CLAUDE.md §9）。架構鐵律（中央結算掛鉤 `liveStats.record` 下游鏈、站別 `ns()` 前綴隔離、遊戲註冊表可 launch、`--ax-*` token、i18n 字典）**壞掉不會有任何東西叫出來**，只能等人在 preview 肉眼撞見。
    - 範圍（首版，純前端零相依）：新增 `prototype/src/core/selftest.js`＝**資料驅動測項註冊表**（比照 `HL.games`/`HL.dock`/`HL.achievements`/`HL.promoCal` 註冊表家族）——`register({id, group, title, tier, env, run})` 自我上架 + 執行器 + 斷言（`ok/equal/close/finite/isFn/skip`）+ 唯讀面板（⚙ 工具 →「🧪 自我檢測」，`HL.ui.modal` wide）。**雙環境同一份引擎與同一批測項**：瀏覽器 7 項不變量；node `prototype/tests/run.js`（+ `tests/checks-games.js`）8 項 fast + 4 項 deep，**失敗 exit 1 ＝可直接當遊戲軌保真閘的一道自動檢查**。
    - **分層**：`fast`（秒級結構性不變量，預設全跑）／`deep`（蒙地卡羅買入 RTP，`--deep` 啟用、`AX_DEEP_SIMS` 可調樣本）。
    - **鐵律**：測項必須**唯讀非破壞**——不得呼叫 `HL.liveStats.record`、不得動餘額/流水/成就；需暫存 localStorage 走 `t.tmpKey()` 自動清除（已實測跑兩輪後餘額不變、零殘留 key）。
    - **負向驗證（證明測項非空殼）**：回放 2026-07-28 兩處實際缺陷價 → `dead-by-noon` 80× 測得買入 RTP **53.4%**、`pirots` 100× 測得 **99.7%（可套利）**，harness 皆判 FAIL。修正後的四款現值全數 PASS。
    - 擴充性：任何模組一行 `HL.selftest.register(spec)` 即納入檢測；新增一款遊戲的數學檢測＝在 `tests/checks-games.js` 的 `GAMES` 陣列**加一筆**。仍缺（後續）：CI 自動觸發（本機無 runner）、UI 互動/視覺回歸、核心經濟模組（vip/rakeback/bonus/ledger）測項。

54. ✅ **遊戲上架排程 × 受眾分層（Early Access 搶先體驗 · 接 #49 promoCal 排程底座）** — M　`(開卡 2026-07-29 · 實作完成 2026-08-05 平台軌 catchup 輪)` — 來源：**Crown Coins 2026-07-29 刷新**「**Early Bird 新遊戲搶先體驗／獨家標題**」——新遊戲**依排程分批開放**（先給特定族群/階級搶先玩）而非全站同時上架；同源訊號「Crown Bingo Live 每日固定時段開局房型」。
    - 問題：`HL.games` 註冊表是「註冊即全站可見」的**二元狀態**（`playable`/`comingSoon`），**沒有任何「何時對誰開放」的維度**；#49 `HL.promoCal` 已鋪好排程軸（`window`/`recurring`/`always` 三型 + 日曆/清單雙檢視），但**遊戲上架不在其中**。⇒ 新遊戲上線只能「全站同時可見」，無法做搶先體驗、限時回歸、VIP 專屬首發。
    - 範圍（純前端）：遊戲 spec 增選用欄位 `release: {startAt, audience}`（audience＝VIP 階／公會／季票進階軌／全體）→ `HL.games.all()` 加一道過濾閘 + 卡片標「搶先體驗」角標；排程本身 **register 進 #49 promoCal** ＝遊戲上架與促銷共用同一條排程軸與同一個日曆面板。**未宣告 `release` 的既有遊戲行為完全不變＝零回歸**。
    - 擴充性：排程與受眾皆為**資料描述子**，一款遊戲加一筆 spec；不啟用時退化為現行「全站可見」。台帳新增模組「內容/遊戲上架排程 × 受眾分層」absent 對應本卡。
    - **落地（2026-08-05）**：新增 `core/release.js`＝`HL.release` 排程註冊表。三階段 `upcoming → early → open`（`phaseOf`）；**受眾述詞表 `AUDIENCES`**（`all`/`vip`/`season`/`guild`，**加一種受眾＝加一筆定義**，不是散在各處的 if）；`declare({game, earlyAt, startAt, audience})` 一行上架，**`game` 可以是尚未註冊的遊戲 id**＝「先排程、後實作」的真實流程（該筆只出現在活動日曆，大廳完全不受影響）。
    - **零回歸契約（本卡最重要的相容性設計，且已成常駐測項）**：未宣告排程的遊戲 → `stateOf()` 回 `null`、`playable()` **逐位退化回 `g.playable`**、卡片不生成任何角標。閘**只會收緊不會放寬**（本來不可玩的遊戲不因排程開放而變可玩）。未知受眾 kind **保守不放行**（拼錯不會把未上架遊戲全站放出去）。
    - **接線**：`views/casino.js` 的 `gameCard` 改問 `HL.release.playable(g)`（原 `g.playable`）並掛 `badge`；不合格時點卡改開 `HL.release.explain(g)`＝說明「現在什麼階段／現在誰能玩／我還要等多久」+ CTA 開活動日曆（不讓玩家撞到無解釋的牆）。`core/ui.js` 的共用 `gameCard` 新增 `opts.badge`（給 null 即完全不變＝大廳日後可自行採用）。每筆排程**自動 register 進 #49 `promoCal`**（`id: "release:<game>"`、`cat` 新上架、上架後保留 7 天當「新上架」後自動 ended）⇒ **遊戲上架與促銷首次共用同一條排程軸與同一個日曆**，也順帶成為 promoCal 的**第二、三個外部註冊者**（07-31 台帳曾記「外部註冊者為零」）。
    - **驗證**：node harness **49→51**（`release/phase-boundaries` 含 `>=` 邊界逐毫秒 + 受眾 `>=` 而非 `>` + 未知 kind 保守；`release/zero-regression` 對 `basePlayable` 兩值皆斷言恆等）；**負向驗證三種擾動皆被判 FAIL 並還原全綠**（① 邊界 `>=`→`>` ② 未知受眾改放行 ③ 未宣告排程改恆可玩）。瀏覽器 harness **30→32**、`browser==node` 同一份測項。preview `?demo=1` 逐項：`HL.release.all()`=[gem-storm, aurora-rush]；**合格路徑** gem-storm phase=early/eligible=true → 角標「⚡ 搶先體驗」且**仍保有 試玩/真錢 雙鈕與「▶ 可玩」緞帶**（零鎖住）；**不合格路徑**（runtime 把門檻改 Lv99）→ 角標「🔒 搶先體驗中」、`playable=false`、雙鈕消失、explain modal 正確列出「搶先體驗期／VIP 段位 99+／全站開放倒數 3d 9h」；**upcoming 路徑** aurora-rush 未註冊進 `HL.games` 故僅存在於日曆；**零回歸** dice `stateOf=null` 且 base==gated；日曆兩列 phase/note/cat 皆正確；**三語 round-trip**（⚡ 搶先體驗 / ⚡ Early Access / ⚡ 抢先体验 → 再切回）；零 console error。i18n 新增 EN 23 鍵、HANS 20 鍵（**經實際載入 DICT 物件驗證：EN 缺鍵 0、無「列了卻與繁體相同」的死鍵**，不重蹈 U31 靜默覆蓋債）。sw v140→v141。
    - **刻意的設計取捨（與卡片原文的偏離，據實記錄）**：原文寫「`HL.games.all()` 加一道過濾閘」，**實作改為「可見但鎖住 + 說明」而非過濾隱藏**——隱藏會同時砍掉發現性（玩家連「有這款、什麼時候開」都看不到），與 Early Access 的行銷目的相反；閘改在 `playable` 這一層。另**種子排程刻意不鎖任何現有玩家**：gem-storm 門檻設 Lv 1（人人達標）⇒ demo 站只多一枚角標、不把玩家原本玩得到的遊戲關起來；「被擋住」的行為改由常駐測項與 runtime 驗證覆蓋（比在 demo 製造一個鎖更有證據力）。
    - **已知限制**：① 沙箱 preview viewport=0，**角標的實際幾何未量測**（position/色彩/字級/圓角等 computed 值已驗，但「是否壓到縮圖或收藏鈕」需線上肉眼確認） ② `explain` 的倒數值走 `dhm()`＝動態值不可翻譯（已按 P3 契約把「倒數」二字移進標籤，值只留純數字） ③ 大廳 `lobby.js` 尚未採用 `opts.badge`（僅娛樂城接線）。

55. ✅ **成長進度可停靠面板 `HL.dock` 第二代註冊者（證明容器底座可用 · 消化船長 P4）** — S　`(開卡 + 實作完成 2026-07-30 平台軌建置輪)` — 來源：**船長 P4**「`#44 HL.dock` 容器底座建成後零新註冊者：#45–#49 五個功能面板全部繞道自刻 modal，『先做容器再填功能』原則名存實亡。請至少把其中一兩個改掛 `HL.dock.register`，證明底座可用」。
    - 問題與設計判斷：#44 建了 dock 底座後，唯一註冊者仍是它自己遷移進去的 partner + chat（`panels.js`）＝**底座從未被「新功能」實際使用過**，等於未經第二代驗證。但**不宜把 #45–#49 的完整面板直接改成 dock 面板**——徽章牆/季票階梯/公會週榜都是「進去專心看一次」的全幅內容，modal 才是對的容器；硬塞進 360px 側邊浮窗會讓資訊密度崩掉（違反 `/apexwin-ui-quality` 的「元件情境自適配」）。
    - 因此範圍＝**新增一個真正適合停靠的聚合面板**：`layout/dock-growth.js` 註冊 `HL.dock.register({id:"growth"})`，把 #45 成就點數 / #46 季票階級與賽季經驗 / #47 公會週貢獻三條**成長進度**壓縮成「邊玩邊看」的即時進度條，每區一個 CTA 開回各自完整 modal（`HL.achievements.open`/`HL.season.open`/`HL.guild.open`）＝**dock 面板與 modal 各司其職**。
    - 為何這才叫「證明底座可用」：面板本身零自刻浮窗程式——開/關/收合/桌機拖曳自由擺放/跨站持久座標/手機互斥全部由 `HL.dock` 提供，`buildScroll` 只負責內容。若底座設計有問題，這張卡會當場暴露。
    - 同時消化 **P3 的一半**：新面板所有畫面字串同步補 `i18n.js` 的 `en` / `zh-Hans` 字典（不再重複「平台軌只出繁中」的舊病）。
    - **落地驗證（preview `?demo=1`，零 console error）**：`HL.dock.ids()` 由 `["partner","chat"]` → `["partner","chat","growth"]`＝底座首個第二代註冊者；收合 body `display` none↔flex；三面板桌機自動堆疊 right **16 / 388 / 760px**（STACK_GAP 372 算術正確）；`ax:dock:v1` 座標持久化；手機路徑（`clientWidth` 覆寫 400）`mobileExclusive` 只留 growth；**走真中央結算點** `HL.liveStats.record("dice",5000,0)` → 季票階 4/30、成就 60 點、公會貢獻 NT$7,000 三區同步跳動；底部列 FAB toggle 三態；繁/簡/EN 三語逐字；token 全解析（gold `#ffb524`／radius 8px／13·11px）；CTA `display:block` 但寬 78px 不撐長條；零水平溢出；progressbar `role`+`aria-valuenow`；CTA 可聚焦。sw.js bump v112→v114。
    - **首驗抓到並當場修掉兩處自身缺陷**：① 經驗值誤用 `HL.dom.money` 而冠上 `NT$`（XP 不是金額）② 無進度條的區塊（未入會的公會區）CTA 因 button 為 inline-block 而貼在 inline `<small>` 說明後 → 補 `display:block`。
    - **引擎改進點（記入 journal，後續類似面板比照）**：定時重繪面板須加**資料指紋**（三模組狀態 hash，5s tick 僅在真變化時重繪）——否則每次重繪都先產生繁中節點再被 i18n walker 翻回，**非繁中語系每 5 秒閃一次原文**；另 `HL.i18n.t` 為 passthrough、翻譯只發生在 DOM walker 且要求**整個文字節點等於一條 key**，故「中文＋動態值」串接永遠翻不到（首版即犯此錯，已改為「中文全片語 + 值純數字」並寫成檔頭契約）。
56. ✅完成（`6d6d39e` rescue + `94cd6d3` 收官，2026-08-03 平台軌） **修 P2P 轉贈誤記為 withdraw 汙染營運帳本** — S — 來源：**2026-07-30 平台軌審「金流」分類查獲**（船長 P1 排程的未審分類）。
    - 問題：`layout/app-shell.js:170` 休閒模式「玩家間轉贈遊戲幣」把轉出額記成 `pushDemoTxn("withdraw", amt, nb)` ⇒ **玩家互贈被計為營運提款**，直接汙染 `HL.ledger.derived()` 的淨現金流與 NGR（提款是「錢離開平台」，轉贈是「錢在平台內換手」，兩者對莊家帳的意義相反）。且 Demo 下**收款方從未入帳**＝帳上那筆幣是淨銷毀而非移轉，流通幣總量也跟著失真。
    - 範圍（純前端 S）：`HL.ledger` 增 `p2p_out`（與 `p2p_in` 對稱）交易型別＝**平台內移轉、不計入淨現金流**；`derived()` 的現金流彙總排除之；轉贈端改記此型別。收款方入帳需玩家帳戶系統（Demo 無真對手方）→ 本卡只修「記帳語意」，並在 UI 明示「Demo 模式不會有真實收款方」。
    - 為何值得修而非放著：`HL.ledger` 是 §4 明列的「莊家視角唯一真相」，且 ⚙ 儀表板的規則健檢會依 NGR/淨現金流亮警示 ⇒ 錯誤型別會讓健檢誤判（真金前重調經濟數值時會拿這組數字當基準）。
    - **落地（2026-08-03）**：`HL.ledger` 新增 `p2p_out`／`p2p_in` 對稱型別，並把現金流語意收斂成**三張分類表＝唯一真相**（`CASH_IN`／`CASH_OUT`／`INTERNAL`），`deriveFrom()` 依表求值而非散落的加減式；**退役死型別 `trade`**（自建檔起零寫入者零讀取者，實測 grep 全 repo 僅 ledger.js 自身一處）。轉贈端 `app-shell.js` 改記 `p2p_out`，並把錢包紀錄列重構為**資料描述子 `TXN_KINDS`**（label/sign/tone/ic，加型別＝加一筆，取代原本只有 dep/withdraw 的二元 if）。儀表板加「站內轉贈」tile + cashNet 標註「不含站內轉贈」。
    - **雙環境契約（比照 #50／#51）**：分類表與 `deriveFrom` 以 `module.exports` 暴露並接進 `tests/run.js` ⇒ 三個測項（含 **#56 迴歸鎖**「站內轉贈不得汙染淨現金流」）每次跑 harness 都重跑。node **32/32**、瀏覽器 selftest **3/3**。
    - **修一處自身缺陷（preview 抓到）**：`ledger.js` 在 `index.html` 載入序（第 52 行）**早於** `selftest.js`（第 84 行），故收尾直接 `registerTests(HL.selftest)` 時該物件尚未存在 → **瀏覽器端三個測項全部靜默未註冊**（`run({group:"ledger"})` 回 total=0）。不動載入序（其他模組依賴本檔早期就緒），改延後至 `DOMContentLoaded`。⚠️ 此坑對**任何載於 selftest.js 之前的核心檔**都成立，後續比照。
    - **真實 UI e2e**（非只測純函式）：錢包→交易→填暱稱+3000→送出 ⇒ 餘額 −3000、`p2pOut` +3000、`withdraw`／`cashNet`／`NGR` **三者皆不動**、`walletTxns.kind="p2p_out"`；**對照組**真實提款 1000 仍正常推動 cashNet（證明不是把記帳整條拔掉）；儀表板 cashNet 顯示 **−NT$1,000**（舊碼會是 −9,000＝把 8,000 轉贈算成提款）。繁/簡/EN 三語逐項（tile 標籤+sub+誠實揭露句+轉贈標籤）。零 console error、sw v132→v133。
    - **副產品**：儲值／提款／轉贈原本是「標籤＋動態時間」融成單一文字節點＝**從來翻不到**（船長 P3 那條雷的既存實例），本卡把標籤拆成獨立文字節點後**首次可譯**（新增 EN 8 鍵／zh-Hans 7 鍵）。
    - **誠實限制**：① Demo 無真實對手方 ⇒ `p2p_in` 恆為 0，轉出的幣在帳上仍是淨銷毀，`p2pNet<0` 即該缺口的量化呈現（收款方入帳需玩家帳戶系統＝後端，不在本卡）② 沙箱 viewport=0，幾何／自適應未能量測。

> 🤖 **以下由自我進化引擎「平台軌」自動開卡**（2026-07-31 · 來源：shuffle 07-31 刷新（逾期 5 天補刷）+ `intel/db/platform-modules.json` **功能** 分類審（12 模組全審，輪替接續 07-30 金流））。全自動模式下標 🟦已批准待做。

57. ✅完成（2026-08-18 平台軌·08:00 窗） **限量挑戰「先搶先贏」（稀缺性獎勵軸 · 掛 #49 promoCal 排程 + 中央結算點）** — S–M — 來源：**Shuffle 2026-07-31 刷新**——其 challenges 除個人達標型外另有一類明載 **「the first player to complete a challenge will win」**、週任務要 **「be the first to catch a specified bet multiplier」**：獎品是**單一名額、先搶先贏、被領走即消失**。
    - 問題（本輪 grep 實證）：ApexWin 現有**全部**任務/挑戰皆為**純個人日常**——`core/challenges.js` 的 DAILY 三條（2×/10×/50×）每位玩家各自累進、各自 claim，`claimed` 只記自己，**沒有任何「名額 / 剩餘幾份 / 已被誰搶走」的概念**；`HL.tournament` 則是排名分潤（人人有份、只差多寡）。⇒ **「稀缺性：競逐同一份限量獎」這條留存力學 ApexWin 完全空白**，與既有「人人有獎」正交。
    - 範圍（純前端）：`core/challenges.js` 的 spec 增選用欄位 `slots:N`（名額）+ `expiresAt`；達標時改為「搶」而非「領」——名額耗盡即該挑戰轉 `taken` 態並顯示搶得者。**假站以既有 bot 模式模擬被搶走**（比照 `arena` sim / `tournament` bots / `guild` 週榜對手隊的確定性種子模擬），並**一律加 `if (HL.site && HL.site.isLive()) return;` 閘**＝真站只計真實玩家（CLAUDE.md §4 鐵律）。挑戰本身 **register 進 #49 `HL.promoCal`** ＝限時挑戰首次出現在活動日曆的「現在／即將」軸上。
    - **零回歸**：未宣告 `slots` 的既有三條 DAILY 行為完全不變（`slots` 未定義＝無限名額＝現行語意）。
    - 擴充性：`slots`/`expiresAt` 皆為**資料描述子**，新增一條限量挑戰＝加一筆 spec；不啟用時退化為現行個人日常挑戰。
    - 注意：獎勵仍須走 `HL.bonus.add`（帶 `source`）→ `HL.ledger` 記帳，勿直接改餘額（§4 鐵律）；真站名額與獎額需保守（§11 經濟收斂）。
    - **落地（2026-08-18）**：新檔 `core/challenge-slots.js`（`HL.chalSlots`＝名額仲裁**純函式**，node 可 require，比照 #50 edge／#63 sla／#71 bonusTtl 的雙環境契約）+ `core/challenges.js` 接線。spec 新增選用資料描述子 `slots`／`expiresAt`；DAILY 第 4 條 `rush25`（25× 單局、名額 3、獎金 3000）為首位註冊者。**register 進 #49 `HL.promoCal`**（`sched:"window"`，note 即時顯示「剩 N/3 個名額」）。
    - ⭐ **本卡最重要的一個發現，是卡上那句「真站只計真實玩家」在純前端**做不到**，而且失敗方向恰好是最壞的那一邊**：把 bot 依 §4 鐵律關掉之後，「先搶先贏」就只剩玩家一個人在搶＝**必贏**——名額變成假的稀缺，且**真站的送幣成本反而高於假站**，直接違反 §11「真站不得比假站寬鬆」。⇒ 處置**不是**靜默退化成無限名額（那會讓一條房規在真站悄悄失效、外觀完全一樣），而是**真站在沒有伺服器仲裁者時根本不供應限量挑戰**，並在面板據實寫明原因。容器留著：`HL.challenges.setArbiter(fn)` 一行即恢復供應（見 #104）。
    - **五道鎖（全部經負向擾動實證，19/19 抓到）**：① 純函式側四紀律〔未宣告 slots ⇒ 無限退化／不可超賣（玩家佔的那格從 bot 排程扣掉，taken≤total 是**結構保證**）／開窗後有真空窗期／玩家名額不可撤銷〕；② 真站閘〔`specs()` 必須同時看站別與仲裁者〕；③ **`DAILY` 只准 `specs()`／`hiddenCount()` 兩個讀者**——首版的 `specOf` 直接掃 `DAILY` 就繞過了整道真站閘（當時靠 claim 的 grab 前置條件**巧合**擋住，不是結構上的），已改並釘死讀者數；④ 沒搶到名額不得派彩、且名額在**達標當下**結算而非領取時（搬到 claim 就不是先搶先贏了）；⑤ 名額算術只有一份（不得在 challenges.js 內再算一次）。
    - ⚠️ **兩次「量測法自己錯，且錯得像成功」**（同 08-17 towers/pump 家族的第三、四個變形）：(i) 空窗期斷言首版寫「`now===startMs` 時 remaining===total」，把 `LEAD` 改成 0 **仍全綠**——因為 bot 落點是連續值、恰好等於開窗那一毫秒的機率趨近 0 ⇒ 那條斷言**鎖不到 LEAD**，已改為直接對 LEAD 邊界斷言；(ii) 出口鎖寫 `[^}]*setArbiter`，把出口改名成 `setArbiterX` **仍全綠**（前綴也匹配）⇒ 已釘死冒號。**兩者都是被負向擾動抓出來的，靜態全綠時完全看不出來。**
    - ⚠️ **連擾動 harness 自己也有同型盲區並已修**：它原本只判「跑完有沒有紅」，於是**乾淨樹本來就紅**時（本輪確實發生：新斷言把絕對時戳當差值 `s0 + guard*0.001`）「擾動抓到了」與「本來就壞」輸出**完全同形**，一例因此被誤記為通過。已前置「乾淨樹必須全綠」的基線檢查。⇒ **通則：任何「破壞它、看它是否報錯」的驗證法，都必須先證明未破壞時是綠的。**
    - **驗證**：node **166→170 項全過**；負向擾動 **19/19**；另因排程輪結構上取不到 dev server（`preview_start` 對無人值守 session 設計性拒絕，08-17 已記機械原文），改以最小 `HL` stub 在 node vm 內把**瀏覽器路徑真的跑一遍**——達標→搶名額→領獎（3000 入 `HL.bonus`，source `限量挑戰`）→名額耗盡時達標也拿不到→真站濾除→註冊仲裁者後恢復供應→日曆接線，**32/32 通過**。⚠️ 該模擬過程**兩次誤報成產品 bug**（stub 缺 `document` 全域、缺 `addEventListener`），皆為 harness 缺陷、非程式碼問題——記此以免後手看到相同訊息時誤判。i18n EN/zh-Hans 各 +6 鍵、兩包重複鍵掃描 0/0。sw `v176→v177`。
    - ⚠️ **未目視（連續第十一輪）**：名額圓點、「名額已滿」按鈕態、真站說明文字的**視覺**仍未經人眼確認（邏輯已由上述 32 項頭尾跑過）。列入待目視清單。

58. ✅完成（2026-08-18 平台軌·**14:00 窗**，**但卡上「雙方各得獎勵」這句話在真站是做不到的，而那不是工作量問題**） **推薦/邀請好友（referral · 病毒成長軸首次開通 · 容器優先）** — M — 來源：**WOW Vegas 2026-07-31 刷新**（tier-2 社交賭場長年主推：每邀一位好友加入，**雙方**各得獎勵〔其站為 20 SC + 5,000 GC〕）+ platform-modules 台帳「活動」分類 **推薦/聯盟 Referral & Affiliate = absent**（本輪複審維持 absent）。
    - **2026-08-04 平台軌補一條關鍵設計（SpinBlitz 刷新 · 使 referral 成為第三平台共識）**：獎勵**不要一次性發放，改依被推薦人的里程碑分階段釋放**——SpinBlitz 每位好友上限 100,000 GC + 50 SC，但達 $20 先放 20,000 GC + 10 SC、累計達 $500 才放剩餘 80,000 GC + 40 SC。⇒ ApexWin 純前端無真金消費，可改用**被推薦人的累積押注/等級**當里程碑（例：好友累積押注達 X 放第一段、達 Y 放第二段）＝同一個反濫用形狀、零金流依賴。**實作時務必採此形狀**，否則「註冊即給」的一次性紅包在假站幾乎等於無限印幣（mock 好友可任意生成）。
    - 問題（本輪 grep 機械實證）：`referral|Referral|邀請碼|推薦碼|inviteCode` 在 `prototype/src/` 命中 **0**。⇒ ApexWin 的成長**全部**來自玩家自身押注（VIP／賽季／成就／公會貢獻皆單人累積），**「把人帶進來」這條軸線完全空白**——這是唯一一條連 mock 骨架都沒有的主流留存/成長維度。
    - 範圍（首版純前端）：新增 `core/referral.js`＝`HL.referral`。① **邀請碼容器**：依裝置生成穩定專屬碼（可 `HL.dom.lsGet/lsSet` 站別隔離）+ 分享連結（`?ref=CODE`，複用 ROADMAP 既有 Web Share 方向）；② **落地歸因**：開站帶 `?ref=` 時記錄「我被誰邀請」（一次性、不可覆寫、不可自我推薦）；③ **雙向獎勵**：受邀者達成首個里程碑（如首次有效押注達 N）時，**雙方**各入 `HL.bonus`（帶 `source` → `HL.ledger` 記帳，勿直接改餘額＝§4 鐵律）；④ 面板＝我的邀請碼／已邀人數／各自狀態（待達標/已發獎）／累計獲得。
    - 擴充性：里程碑與獎額為**資料描述子**（`MILESTONES` 陣列，加一階＝加一筆）；**register 進 #49 `HL.promoCal`**（`sched:"always"`）＝順手把「外部註冊者為零」這個容器採用度缺口（本輪審「活動」分類查獲、與 P4 對 `HL.dock` 的發現同形）**實際補上第一個外部註冊者**。
    - **假站/真站鐵律**：假站可用確定性種子模擬「已有 N 位好友加入」以展示完整體驗，但**必須加 `if (HL.site && HL.site.isLive()) return;` 閘**（CLAUDE.md §4 假活動閘清單）；真站只計真實歸因。
    - 注意：**真正的聯盟/佣金分潤（affiliate）需後端與金流，屬 `avoid`＝本卡不含**，只做玩家對玩家邀請的純前端骨架；真站獎額須保守（§11）。防濫用（同裝置自我推薦、無限刷）首版以 localStorage 冪等 + 自我推薦擋下即可，完整防刷待後端。
    - **落地（2026-08-18 · 新增 `core/referral-core.js`＋`core/referral.js`、接線 3 處、node 173→176、sw v177→v178）**
        - **分層**：可算錯的部分（邀請碼／歸因／分階／冪等／真站獎額）全在 `HL.refCore`（純函式、`module.exports`、node 可 require＝驗的即跑的）；`HL.referral` 只做殼層（localStorage、面板、`?ref=` 落地、日曆與旋鈕接線）。**殼層不得自行實作 settle/due** 由測項釘死（避免長出第二份真相）。
        - **五條紀律皆有測項**：① 冪等靠**單調整數 `paidUpTo`**（不是「已發放集合」）⇒ 重複發放**沒有路徑可走**；② `due()` 只回已達成的階（差 1 都不預付）；③ 自我推薦／非法碼不可歸因；④ `applyRef()` 已有歸因時**原樣回傳同一參考**（`===` 可斷言，覆寫不掉）；⑤ 真站獎額逐階 ≤ 假站、門檻逐階 ≥ 假站（§11，並 register 進 #90 `HL.econCfg` ⇒ 儀表板健檢自動涵蓋，實測 audit 零告警）。
        - **接線**：#49 `HL.promoCal`（`sched:"always"`，真站無見證者時 `enabled:false` ⇒ 日曆同步不顯示）／#90 `HL.econCfg`（4 個維度、描述子當場求值不手抄）／福利中心「成長 · 商城」入口。里程碑尺＝`HL.vip.status().wager`（已是 #50 成本加權後的量，推薦獎勵因此不會被低 edge 遊戲刷）。
        - **刻意沒做的事**：**沒有掛 `HL.liveStats.record`**——被推薦人的里程碑只需要「當下累計值」，用拉取式即可，少一個訂閱者就少一條每局都跑的程式碼。
    - ⭐ **本卡最重要的發現＝「雙方各得獎勵」在純前端的真站是結構上不可能的，不是還沒做**：被邀請者的歸因寫在**他自己的 localStorage**，我的裝置與他的裝置之間**沒有任何通道** ⇒ 真站的好友清單**恆為空**（不是「暫時沒人用」，是永遠不會有資料），推薦人側的獎勵無從觸發；而被推薦人側若照發，就成了「自己貼一個碼給自己就領錢」＝**無限印幣**（§11）。⇒ 依 #57 立下的先例：**真站無見證者就據實不供應獎勵、面板明說原因**，但**歸因照記**（記錄不是付款，那是未來後端結算的唯一依據）。`HL.referral.setAttestor(fn)` 容器留著，接上後端一行恢復供應。**這條限制已回填進台帳「會員/身分系統」模組**，因為它管的是所有「兩個玩家之間」的功能（好友、私訊、贈禮、公會邀請），不只本卡。
    - ⭐ **第二個發現＝「有種子」不等於「看得到」**：模擬好友的窗口起點原本設在「本機首次開站的那一刻」，於是新玩家第一次打開面板時**一位好友都沒有**（所有模擬加入時刻都在未來）——卡上要求的「展示完整體驗」落空，而且**畫面與真站無見證者時長得一模一樣**（兩種完全不同的原因、同一個空清單）。修法是把假站窗口起點回推 10 天（受 isLive 閘管制的假站種子，同 boot 種子／ambientFeed 家族）。**假站種子要問的不是「有沒有生成」，是「玩家第一眼看不看得到」。**
    - ⚠️ **負向擾動 22/22 全抓，但其中兩例是被擾動抓出來的**（先證明乾淨樹全綠 176/176 才開始，08-18 08:00 教訓③）：(i) **真洞**——`platform/referral-wiring` 原本用「全檔存在 `id: "referral"`」判日曆註冊，但這個字串在本檔**出現兩次**（日曆一次、econCfg 一次）⇒ 把日曆 id 改成 `referralX`（活動日曆上整個消失）時測項**仍全綠**；已改為兩個 register 各自切區段驗（#57 教訓②「同一個字串出現兩次」的第二個變形）。(ii) **harness 缺陷**——`bots: !isLive()` 這串字在檔頭註解裡也有一份，replace 命中的是註解、程式碼一字未改，差點被我記成「鎖是空的」。**擾動必須錨定到程式碼本體，否則「沒抓到」與「沒擾動」同形。**
    - **驗證**：node **176/176**（新增 3 個純函式測項 + 3 條架構鎖）；負向擾動 **22/22**；排程輪結構上取不到 dev server ⇒ 以最小 `HL` stub 在 node vm 內載入**真正的** `econ-config.js`／`referral-core.js`／`referral.js` 把瀏覽器路徑真跑一遍（碼穩定→分享→模擬好友→領獎→冪等→自我推薦擋下→歸因寫一次→我方分階→真站不供應→歸因仍記→註冊見證者後恢復→撤除後回到不供應→日曆/旋鈕接線），**51/51**。i18n EN/zh-Hans 各 +26／+25 鍵（串接型 toast 依 P3 刻意不加），兩包重複鍵 **0/0**。首屏 1447→**1484KB／90 支**（門檻 1600/120，餘裕 116KB）。⚠️ **無 preview／無目視（連續第十二輪）**：邀請碼大字級、里程碑列、好友進度條、真站說明文字未經人眼確認。

59. ✅完成（2026-08-19 平台軌·08:00 窗，**卡上說「真站加成須保守」，既有結構給的是恰好零——而繞過它就是再造第二真相**） **近 30 天活躍度「光環」層（滾動視窗 · 不讓核心等級倒退）** — M — 來源：**WOW Vegas Star System**（每押注 50 SC 得 1 星、**星星 30 天後過期**，平台同時追蹤「近 30 天星數」決定當前段位與「終身星數」⇒ **status 由近期活躍度決定，而非終身累積**）——本檔 06-29 即列為「最關鍵缺口 ①」，**逾一個月未開卡**，本輪複核仍空白故正式立卡。
    - 問題（本輪 grep 機械實證）：`rolling|近30天|last30|decay` 在 `prototype/src/core/` 命中 **0**。`HL.vip` 的 `addWager` 只單向累加 `o.wager`（`progress.js`）⇒ **只升不降、純終身累積**：一位半年前狂刷、此後完全不玩的玩家，與每天都玩的玩家享有完全相同待遇，平台**沒有任何「催回訪」的等級槓桿**。
    - 範圍（首版純前端）：在 `HL.vip` 旁**加一個滾動桶**（如 30 個日桶的環形陣列，`dayNum()` 推進時汰除最舊，比照 `rakeback` 日桶／`cashback` 週桶既有範式），由中央結算點餵入（**建議直接吃 #50 `HL.edge` 的加權額**＝與 VIP 經驗同一把尺）。
    - **⚠️ 關鍵設計取捨（本檔 06-29 自記的建議，立卡時明確採納）**：**不讓核心 VIP 等級倒退**——衰退只作用在**額外光環層**（如「活躍中」徽章 + 近 30 天達標才享的加成，例如返水/轉盤/任務獎勵小幅上浮），核心終身等級與已解鎖福利**永不回收**。理由：等級倒退的懲罰感過重，且與 §11「真站經濟已收斂」相衝（回收福利＝實質扣獎）；光環層是**加法式**、零回歸、可 flag 停用。
    - 擴充性：光環門檻與加成幅度為 config；`HL.vip.status()` 增 `activity:{last30, tier, active}` 欄位供 header 迷你條/面板讀取，既有讀者不受影響（加法式）。
    - 注意：站別隔離（`HL.dom.lsGet/lsSet`）；真站加成幅度須保守（§11）；**與 #50 相依**——兩者都在改「進度怎麼算」，建議 #50 落地後再做（#50 已於 2026-07-31 完成，本卡現可動工）。
    - **📈 佐證升級（2026-08-06 平台軌 20:00 窗 · GoKong 新取材）**：**第三平台佐證、優先序上調**。GoKong 的 VIP **依「最近 90 天活動」重算**（gameplay/存款/提款/已領紅利四項綜合），停下來就會掉級 ⇒ 與 **Punkz**（XP 6 週過期、每週重算會掉階）同一派；反例 **Stake** 明文終身累計永不重置。**三平台兩派分歧的結論不變、反而更硬**：本卡原採的「核心等級不倒退、只讓額外光環層衰減」**正好是兩派交集**，故設計一字不改，只把佐證強度由兩平台提升為三平台（滾動窗評級已是主流做法而非個案）。**新增一個可抄的實作細節**：GoKong 的評估窗是 **90 天**而非 30 天（WOW Vegas 為 30 天）⇒ 窗長本身應是 config 而非寫死。
    - **⬆️ 2026-08-05 平台軌：第三家共識、優先序上調**。**Punkz 刷新取得完整機制**：XP **收集後 6 週過期**、平台**每週重新計算段位** ⇒ **段位會下降**（明確非 rolling「達標即永久保有」）；其 VIP 表 Rookie 0／Riser 12k／Outlaw 24k／Hotshot 1M／Maverick 4M／Apex 8M 對應 cashback 0→15%。加上 WOW Vegas（星星 30 天過期）＝**兩家獨立平台皆以「近期活躍度」而非終身累積決定當前待遇**，本卡從「單一平台觀察」升級為**共識級缺口**。
    - **同時取得一條反向佐證（強化本卡原本的設計取捨）**：**Stake（2026-08-04 刷新）明確為終身累計、永不重置**。⇒ 頂級站在此分歧：Stake 走「只升不降」、Punkz/WOW Vegas 走「滾動衰減」。**本卡採納的「核心等級不倒退 + 額外光環層才衰減」正好是兩者的交集**（不必二選一），此判斷現有外部依據，實作時不需再猶豫。
    - **另可參考 Punkz 的粗分做法**：它把 XP 來源分三檔（slots $1=10 XP／live+table+sports $1=1 XP／**provably-fair 一律 0**）＝與 ApexWin #50 `HL.edge` 同源但更粗；我們既有逐遊戲係數更細，**光環層直接吃 `HL.edge` 加權額**即與 VIP 經驗同一把尺（本卡原範圍已如此規劃，此為外部佐證）。
    - **🔧 2026-08-10 平台軌（Stake 深挖刷新併入本卡，非新卡）｜本卡的滾動桶已不只服務自己＝多了第二個等著它的消費者，優先序再上調**：Stake 的 **Bonus Drops**（碼型獎勵）領取資格＝**「過去 7 天押注達標」**。查 `core/redeem.js`：`CODES` 只有 `{amount, exp}`，**無任何資格述詞**；而本卡 06-29 記的 `rolling|近30天|last30|decay` 命中 0，本輪改用更寬的樣式重驗（`rolling|滾動|windowMs|sinceMs` 於 `core/*.js`）**仍 0 命中** ⇒ **「滾動窗口押注量」這件基礎設施全站確實不存在**（連續兩種樣式、兩個日期各自機械證實）。⇒ **本卡的 30 個日桶不該只長在 `HL.vip` 旁邊，應該是一個可被查詢的公用出口**（例 `HL.activity.wageredSince(ms)`），這樣 `redeem` 的資格閘、未來的 reload 獎勵都是**加一行呼叫**而非各自再刻一份桶——這正是 #81 對 `rakeboost` 三筆種子「各自手刻一份時間戳」的同型教訓，趁本卡尚未動工先把形制定對。**⚠️ 同來源的另一半刻意不併入**：Stake Bonus Drops 還有「**全站供給上限**（先領先得、達總量即止）」，純前端無全站共享計數器 ⇒ 做出來必然是假的、真站禁假活動（CLAUDE.md §4），待後端 phase 再議、**不寫進本卡範圍**。

> 🤖 **以下由自我進化引擎「平台軌」自動開卡**（2026-08-03 · 來源：thrill + mega-dice tier-3 到期刷新 + `intel/db/platform-modules.json` **後台** 分類審〔7 模組全審，輪替接續 07-31 活動〕）。全自動模式下標 🟦已批准待做。

    - **✅ 落地（2026-08-19 · 平台軌 08:00 窗 · 新檔 `core/activity.js` ＝ `HL.activity`）**：環形日桶（保留 `KEEP_DAYS=90` 天、光環評估窗 `WINDOW_DAYS=30`，**窗長為 config**＝兌現卡上「GoKong 90 天 vs WOW Vegas 30 天 ⇒ 窗長本身應是旋鈕」）；由中央結算點 `live-stats.record` 一行餵入；四段光環（💤休眠／🔥活躍中 2,000／⚡高活躍 10,000／🌟常駐 40,000，門檻為視窗內 XP）；效果＝`HL.progressSrc.registerBoost` 表裡的**第三筆註冊**（假站 1.05×/1.10×/1.20×）；出口 `wageredSince/xpSince/betsSince/status/tiers/open`；`HL.vip.status()` 加法式新增 `activity` 欄；VIP 俱樂部面板新增光環列＋入口鈕；#72 說明中心一條（段數/門檻/倍率全當場向 `tiers()` 求值）；#90 經濟旋鈕一筆（各段 `strict:"le"`）。sw v179→**v180**。
    - ⭐ **本輪最重要的發現＝卡上寫「真站加成幅度須保守」，但既有結構給的不是「小一點」而是「恰好零」**：`progress-src.js` 的 `BOOST_CAP.live = 1.0` 把真站**任何**進度加速夾成 1×，且該檔頭明文警告改動前先讀經濟安全段、另有測項 `progress-src/boost-live-identity` 鎖住。⇒ 要讓光環在真站給加速，唯一的路是**繞過那道夾子＝再造一套第二真相**。**刻意不繞**：真站光環只有徽章與視窗查詢（零成本、非送幣），加速是假站限定，並在檔頭與面板文案**明說**。這是「卡上的形容詞（保守）與程式裡的常數（1.0）不一致時，該讓誰贏」的一則實例——讓常數贏，並把差異寫下來，而不是默默做成 1.02×。
    - ⭐ **第二個發現＝一個滾動桶要存幾把尺，答案是兩把，而只存一把必然有人拿到錯的數字**：光環段位要的是**edge 加權後的 XP**（與 VIP 經驗同一把尺＝卡上明列的要求），但 #107 預定的兌換碼資格閘（Stake Bonus Drops「過去 7 天押注達標」）要的是**真實押注金額**。首版若只存加權額，`wageredSince()` 就會回一個被加權汙染的「金額」——**而它看起來完全正常**（同樣是遞增的錢數字）。⇒ 每個日桶存 `{w: 真實, x: 加權, n: 注數}` 三欄。這不是「抄兩份同一個值」（那才是第二真相），而是**誠實承認這是兩個不同的量**；反向鎖 `activity/two-rulers` 把兩者釘死不得互相冒充（擾動③實證：把 `cur.w` 改吃 `xp` 立刻轉紅）。
    - ⭐ **第三個發現＝「衰退」與「桶的上界」是兩條不同的不變量，各自要有各自的鎖**：擾動①（`sweep` 不再汰除過期桶）**只被 `ring-bounded` 抓到、沒被 `window-decays` 抓到**——因為衰退其實發生在 `sumSince` 的 `d > today - days` 視窗過濾，`sweep` 純粹只管儲存量的上界。兩者剛好都在同一個檔、名字也像，但**弄壞任一個，另一個的測項都不會叫**。若當初只寫一條「滾動視窗會衰退」的測項並以為它兼顧了兩件事，桶就會無聲地長到一年 500 筆。
    - **真站/假站與經濟安全**：站別隔離走 `HL.dom.lsGet/lsSet`（`HL_ACTIVITY` key，兩站平行宇宙）；真站倍率在**本檔**即恆 1（不倚賴下游夾子，兩層同向保險）；`isLive()` 閘數 54→69。**核心等級永不倒退是作用域限制而非斷言**：本檔沒有 `addWager`／`HL.bonus`／`HL.state`／`HL_VIP` 任何寫入路徑（反向鎖 `activity/never-touches-vip` 對原始碼直接斷言；擾動⑧加一行 `HL.vip.addWager(1)` 立刻被抓）。**光環吃加速前的量**⇒ 不存在「加速→視窗變大→段位更高→加速更多」正回饋（`activity/no-self-feedback` 釘死 `record(bet, xpBet)` 的引數形狀；擾動⑦改餵加速後的量立刻被抓）。
    - **驗證**：node 測項 **177→184 全綠**（新增 7 條純函式測項）；**node vm + DOM/localStorage stub 跑瀏覽器路徑：手工斷言 33/33 + `activity` 群 browser 測項 12/12**（含「停 200 天 ⇒ 視窗歸零、光環淡出、加速回 1×，而核心 VIP 經驗逐位不變」的完整 e2e，以及兩個面板真的渲染得出內容、說明 body 與經濟旋鈕真的求值得出來）；**負向擾動 14/14 全被抓**，且**先證乾淨樹全綠才開始擾動**（否則「擾動抓到了」與「本來就壞」同形——journal 08-18 記過的陷阱）。首屏 1493→**1527KB／91 支**（門檻 1600／120，餘裕 73KB）。
    - ⚠️ **本輪據實記的三件事**：① **i18n 是被既有棘輪抓出來的，不是我自己想到的**——首版漏補說明標題兩語，`platform/support-title-i18n`（前一輪 08-18 才立的鎖）當場轉紅 ⇒ 該鎖第一次抓到的是**下一輪的自己**。② 面板首版把「近 30 天」寫成 `「近」+數字+「天」` 三節點，助詞單獨成 key 翻不出通順英文 ⇒ 改為窗長獨立成一列。段位名一律獨立成文字節點（`progress.js` 的 VIP 段位名 `icon + " " + name` 串接是既有債、本檔不跟進）。③ 我自己的驗證腳本錯過一次：把 `HL.econCfg.list()` 當物件陣列過濾（它回的是 **id 字串陣列**）得 0，一度讀成「註冊失敗」——**尺錯了，不是被量的東西錯了**（同 08-18 記的家族）。
    - **仍未做（據實記，非漏做）**：卡上舉例的「返水/轉盤/任務獎勵小幅上浮」只落地了**進度加速**一個消費端 ⇒ 其餘消費端**開卡 #108**（`HL.rakeboost` 為第二個消費端，且它的真站 CAP 是 1.5 而非 1.0 ⇒ 與本卡不同，那條路在真站**真的有錢的成本**，屬船長經濟決策）。另：真站玩家會看到一個「有徽章但沒有好處」的光環，這是 §11 下的刻意取捨、已在面板文案明說。
60. ✅完成（2026-08-04 平台軌建置輪） **返水改以「莊家優勢」為計價基準（rakeback on house edge · 五平台共識）** — S–M — 來源：**Thrill 2026-08-03 刷新**（Instant Rakeback 明載 `up to 70% rakeback on the house edge of every bet`、即時可領）＋ **Mega Dice 2026-08-03 刷新**（Mega Dice Throw 積分率**依類別分級**：運彩 6／slots 3／其他 casino 2 點每 USDT）＝兩家獨立收斂；連同 #50 檔頭已記的 **BC.Game「BC Engine」依 house edge 計 XP**、**Roobet 30 級 rakeback 納入「遊戲選擇」**、**Duelbits Ace Lounge「基於 house edge 的永久 cashback」** ⇒ **五平台共識**。
    - 問題（本輪機械實證）：`core/progress.js:246 rbAccrue` ＝ `bet × VIP段位率 × happyhour倍數`，**與該遊戲的莊家優勢完全無關**。配上 #50 已建的 `core/edge.js` EDGE 表實算：同一個率在 **1.00% edge** 的 originals 家族＝吐回莊家收入的 **30%**，在 **3.7% edge** 的 slot＝只吐 **8%** ⇒ 同一制度對不同遊戲的實際慷慨度**差 3.75 倍**，且此差異純屬「基準選錯」的副作用、非任何人的設計意圖。
    - **更關鍵的結構性問題**：`progress.js:233` 的既有註解自己寫著「返水率 ≥ 莊優＝結構性虧損」，但**現行架構無法機械保證這件事**（率是常數、edge 逐遊戲不同）。改用 edge 基準後此不變量成為**數學恆真**：`rakeback = bet × edge × pct`，`pct<1` ⇒ 永不可能超過該注的理論莊家收入。這是**把口頭紀律變成型別安全**，正是本卡最大價值。
    - 範圍（純前端 S–M）：`rbAccrue` 改吃 `HL.edge.edgeOf(game)`（中央結算點已帶 `game`，#50 已把它接進 `HL.edge`；**目前 rakeback 拿不到 game ⇒ 需把 game 一路傳進 `accrue`**＝本卡主要工作量）。段位表由「%押注」改為「%莊家優勢」（如 Base 20%→Obsidian 45%），**站別感知**：真站取保守值、假站維持慷慨（§11 範式）。
    - **必守（比照 #50 的紀律）**：① 一條曲線兩種縮放＝**改版前後全站總返水成本應大致中性**（重分配而非加發／減發），以 node 測項機械驗證「假站不得整體變少（零退步）、真站不得整體變多（不鬆動剛轉正的 NGR）」② 未登記 edge 的遊戲須有安全 fallback（沿 #50「未列出一律 1.00×」的退化紀律，此處應退化為現行行為而非 0 返水）③ `HL.edge` 只加權「進度」的既有承諾不變——本卡是**另一件事**：不是把加權額當押注額餵進派彩，而是改變返水公式本身的計價基準（兩者差異須寫進檔頭，避免日後誤讀為違反 #50 契約）。
    - 相依：#50（edge 表，已完成）；與 #52（限時返水加成 rakeboost）相鄰——#52 是「率可被限時放大」、本卡是「率的基準改對」，**兩者可疊加不衝突**，建議本卡先落地再做 #52 以免在錯基準上疊功能。
    - **落地（2026-08-04）**：新增 `core/rakeback-core.js`＝純數學核心（雙環境契約，比照 #50/#51/#56），`progress.js` 只留「取用＋記桶＋UI」。公式 `rakeback = bet × edge × 段位返還比例 × boost`；`live-stats.js` 中央點改傳 `accrue(bet, game)`（**傳的仍是真實 bet**，只是多帶 game 讓返水自行查 edge 定率 ⇒ 與 #50「edge 只加權進度、金錢帳目維持真實」的契約不牴觸，已在兩檔檔頭寫明避免日後誤讀）。
    - **校準（成本中性＝重分配，不是加發/減發）**：基準取 #50 EDGE 表 22 款平均莊優 **2.0613%**，`pct_i ≈ legacy_i / meanEdge`，再 **demo 一律向上取整（零退步）、live 一律向下取整（不鬆動 NGR）** ⇒ demo `[24.5, 39.0, 53.5, 68.0, 87.5]%`、live `[4.8, 7.2, 9.6, 12.1, 14.5]%` of edge。實測均勻遊戲分布下總成本 **demo +0.12%～+1.00%（零退步）／live −0.23%～−1.06%（不增加）**。
    - **本卡真正修掉的結構性缺陷（量化）**：舊制假站頂階 1.8%×押注，在 **1.00% edge 的 dice ＝吐回莊家理論收入的 180%**（每注淨虧）、cases 120%，而 money-wheel 只吐 40%＝**同一制度慷慨度差 3.75 倍**。改制後同段位一律 87.5%、**`pct<1` 使「返水 < 該注理論莊家收入」成為數學恆真**——把 `progress.js:233` 那句只存在於註解的紀律變成型別安全。
    - **未登記 edge 的退化**：`slot`(Shadow Ritual)／`chicken` 走 `LEGACY_RATES` ⇒ node 逐段位逐模式實測與舊制**逐位相同**（只退化、不歸零）。
    - **驗證**：node harness **39/39**（新增 5 項 rakeback 測項：不變量/假站零退步/真站不增加/未登記退化/單調＋邊界）；**負向驗證證明測項非空殼**——四種擾動（頂階改 120% edge 印鈔／demo 段位調降／live 段位調升／段位非單調）**皆被對應守衛判 FAIL**，還原後回綠。瀏覽器 `?demo=1` **全 harness 26/26**（含 edge 群 7/7＝#50 契約未破）、**browser==node 逐項相符**（dice 0.0068／pirots 0.026214／未登記 0.014＝legacy）、**真中央結算點 e2e**（同 NT$10,000：dice 68／pirots 262.14／slot 140 三者與預測精準相等）、繁/簡/EN 三語逐項、零 console error、零水平溢出。sw v136→v137。
    - **修一處自身缺陷（preview 抓到）**：首版把單位寫成 `(值).toFixed(1) + "% 莊優"`＝**數字＋中文串接的混合文字節點，i18n 永遠翻不到**（船長 P3 那條雷）。已改為「值只放純數字、單位/語意放進可翻譯的整句 label」（`目前返還比例（占莊家優勢）`／`各等級返還比例（占該注莊家優勢）`），EN/zh-Hans 實測全覆蓋。順帶把三條因改寫而不再被引用的舊字典鍵**原地換成新鍵**，不留死鍵（避免累積 U31 型 i18n 債）。
    - **誠實限制**：① 成本中性以「均勻遊戲分布」為模型，真實玩家的遊戲組合若極度偏斜（例如只玩 originals），假站總成本會低於舊制、真站會高於舊制——本卡未做實際下注分布加權（無此資料）。② 校準常數 `CALIB_MEAN_EDGE_PCT` 寫死 2.0613，**EDGE 表增修後需重跑校準**（已於檔頭註明；兩條成本中性測項會在偏離時 FAIL 提醒）。③ 沙箱 viewport=0，幾何/自適應未能量測。

61. ✅完成（2026-08-23 平台軌·14:00 窗，commit `d9a3924`） **內容資料層（banner／公告／促銷內容 schema · 容器先於編輯器）** — M — 來源：**2026-08-03 平台軌審「後台」分類查獲**（7 模組全審，輪替接續 07-31 活動）——`CMS 內容管理` 複審維持 **absent**，但本輪把缺口形狀具體化。
    - 問題（本輪 grep 實證）：`src/data/mock-data.js` 仍以**硬寫 var 陣列**承載全部可展示內容——`promos`(第128行)／`hotGames`／`newGames`／`worldEvent`／`globeEvent`／`idols`／`casinoCats`／`pools`／`currencies` 等 20+ 個常數；**無 schema、無可編輯 store、每則無 `enabled`／排程(`startAt`/`endAt`)／地區／語言欄位** ⇒ 換一張 banner 或上一則公告都要改碼並重新部署。
    - **與 #49 的分工（去重紀律，勿誤判重複）**：`HL.promoCal` 管「**活動的時間排程**」（window/recurring/always），本卡管「**內容物本身**」（圖／文／公告／頁面 copy）。兩者互補：一則 banner 需要「內容」（本卡）+「什麼時候出現」（可註冊進 promoCal）。
    - 範圍（純前端 M · **容器優先、刻意不含編輯 UI**）：新增 `HL.content` 註冊表（比照 `HL.dock`／`HL.promoCal`／`HL.achievements` 的資料驅動註冊表家族）——每則內容為描述子 `{id, type, enabled, startAt, endAt, locales:{...}, regions, payload}`；`list(type)` 即時求值過濾（過期／未啟用／不符地區自動不回傳、**空清單不佔位**）；把 `mock-data.js` 的 banner／公告／促銷三類**遷移為註冊呼叫**（其餘常數留待後續，避免一次動太多）。編輯 UI 屬後台（ROADMAP LATER），本卡只把資料層做對，讓日後接編輯器或後端 CMS 時**不用再動渲染端**。
    - 為何值得現在做：`活動/紅利設定 Bonus & Campaign Builder` 本輪由 absent **改判 partial**（#49 已補上排程容器），而「內容」是同一塊拼圖裡**唯一仍全硬寫**的一半；且 `i18n` 目前靠「畫面中文當 key」翻譯，內容若帶 `locales` 欄可讓**營運文案脫離字典**（字典管 UI 用語、內容管營運文案），兩者職責分離。
    - 注意：`mock-data.js` 是高頻共用檔（多軌會碰）⇒ 遷移須小步、逐類、每步 preview；站別隔離不適用（內容非玩家資料，兩站共用）。
    - **落地（2026-08-23 平台軌 14:00 窗）**：`prototype/src/core/content.js` 新檔（16.1KB，首屏 +1 支 script）。descriptor＝`{id, type, enabled, startAt, endAt, priority, audience, locales, payload}`；
      查詢 `list(type)` **即時求值**（過期／未啟用／不符受眾自動不回傳、**空清單整段不佔位**）；`register/unregister/get/sources/types/counts`；**同 id 熱替換且保留原順序**（換文案不讓卡片跳位）。
      **已遷移 12 則**（大廳促銷 6＋娛樂城廣告牌 6）；`data/mock-data.js` 的兩個硬寫陣列與其 exports **逐條刪除、刻意不留代理**（留了就是第二份真相＝T26/T39 家族），模組級 `var` 口徑 **26→24**。
      渲染端 `views/lobby.js`／`views/casino.js` 改讀 `HL.content.list(type)`，`HL.ui.promoCard` 一個字沒動（回傳物件欄位與遷移前逐位相同）。
    - ⭐ **落地當輪查獲並一併修掉的真缺陷（本卡真正的價值所在，開卡時不知道）**：那 12 張卡的 36 段文案**幾乎零 i18n**——逐條實測只有「限時錦標賽」1 條在字典裡 ⇒
      切 EN／简中時**首屏最顯眼的那條輪播原樣顯示繁中**，而 node 全綠、console 零錯誤、繁中下畫面完全正常（P3 家族第 8 例）。
      **它為什麼躲過了 #119 的棘輪**：棘輪掃的是 `t("中文")` **呼叫點**，而內容是**資料**、不是呼叫點 ⇒ **天生在射程外**（#120 要擴的 DOM 面也不含它：`text: p.title` 的中文在資料裡，不在那行程式碼裡）。
      本卡的正解就是 schema 本身：descriptor 自帶 `locales.en`／`locales["zh-Hans"]`，**新增 banner 的人在同一個物件裡就把三語寫齊**，不必記得去改兩個語言包。已補齊 12 則 × 2 語 × 每則 3 欄。
    - **不重複造輪子（去重紀律的三處外求）**：① 受眾述詞一律向 #54 `HL.release.matches` 求（**本層不建第二張受眾表**，fail-closed：拿不到述詞＝不顯示）；
      ② 語言取 `HL.i18n.current()`；③ 與 #49 `HL.promoCal` 明文分工（promoCal 管活動排程呈現、本卡管內容物與其可見窗口）。
    - **常駐鎖 4 條（node，`tests/checks-platform.js`）+ 1 條瀏覽器鎖**：`content/window-both-ways`（窗口**兩個方向**都擋＋`enabled:false`＋排序契約）／
      `content/audience-delegated`（述詞外求、原樣傳遞、fail-closed、拋錯保守、未宣告零回歸＋**機械證據：邏輯區不得出現 AUDIENCES/受眾門檻欄位**）／
      `content/resolve-pure`（解析不改寫 descriptor、缺語言退回原文、回傳值可安全改）／`content/locale-coverage`（**逐則 × 逐語言 × 逐含漢字欄位**＋反向錨〔descriptor 數量、漢字偵測器兩向、型別詞彙非空〕）／`content/wired`（瀏覽器：兩條輪播真的在消費註冊表、lobby 不得再讀 `HL.mock.promos`）。
    - **驗證**：node **260→264 全綠**（+4 常駐鎖）；**負向擾動 5/5 CAUGHT**——① 窗口只擋單向 ② 受眾 fail-open ③ 解析就地改寫 ④ 種子少一條譯文 ⑤ 內容層自刻受眾表（⑤ 同時被既有鎖 `platform/audience-single-vocabulary` 抓到＝兩條鎖互相佐證），每例還原後回 264 綠。
      **遷移對等性（headless vm 實跑 12 項全 PASS）**：zh-Hant 下兩條輪播**逐則逐欄位逐順序與遷移前的硬寫陣列相同**；EN 下 12 張卡**零繁中殘留**、简中下**零繁體專有字殘留**；
      未開始／已結束／停用／受眾未達四則皆不出現而註冊表仍握有全部 16 則（**過濾發生在查詢，不是刪資料**）；受眾述詞接上且達標後限定內容出現；熱替換不跳位；未登記型別被拒。sw v214→v215。
    - **誠實限制**：① 排程輪不得啟動 dev server ⇒ **UNVERIFIED＝視覺**（輪播卡在 EN 較長標題下是否斷行/擠壓；資料層與欄位對等已機械證明，但 `100% First Deposit Bonus` 比原文長，下一個 preview 輪請目視三語各一眼）。
      ② **公告（notice）型別刻意未登記**——全站尚無公告渲染表面，登記了沒出口＝又一個「有容器沒內容」；該表面落地那輪加一行即可。
      ③ `mock-data.js` 仍有 24 個硬寫陣列，其中可展示者（`worldEvent`／`globeEvent`／`hotGames`／`newGames`／`winTypes`／`casinoCats`／`idols`）尚未遷移且**同樣缺 i18n** ⇒ 開卡 **#121**。
      ④ **首屏預算**：1579KB → **1594KB**（門檻 1600KB，餘裕僅 **5.7KB**）⇒ 已在 CONTROL 船長指令區提報：**下一個首屏新增必須先等 #118**。

> 🤖 **以下由自我進化引擎「平台軌」自動開卡**（2026-08-04 · 來源：stake + bc-game **tier-1 到期刷新**〔船長 08-04 點名優先清〕+ `intel/db/platform-modules.json` **擴充性** 分類審〔4 模組全審，偏離嚴格輪替、改採新鮮度優先，理由見卡內〕）。全自動模式下標 🟦已批准待做。

62. 🟦已批准待做 **支援/透明度中心（FAQ ／規則說明 ／「我的狀態為何如此」· 內容即資料）** — S–M — 來源：**BC.GAME 2026 官方稿**（prnewswire／streetinsider『Strengthens User Experience and Transparency With New Public-Facing Platform Enhancements』）——三項對外強化皆屬**公開可讀面**：① 付款處理說明更清楚 ② 支援資訊更結構化 ③ **帳戶審查過程的溝通改善**；同源訊號＝BC.GAME 01 月 App 改版主打「更清楚的資訊層級／從發現到開玩步數更少」。
    - 問題（本輪 grep 機械實證）：`幫助中心|支援中心|客服|helpCenter|HL.help|HL.support|FAQ|常見問題` 在 `prototype/src/**/*.js` 命中 **1 處且為註解**（`core/ui.js:3` 描述 comingSoon 彈窗清單順帶提及「客服」）⇒ **零 FAQ、零說明頁、零支援入口**。玩家遇到的每一個疑問——「紅利為什麼不能領」「流水還差多少」「站內轉贈為什麼沒有收款方」「可驗證公平要怎麼自己驗」「真站與假站差在哪」——**目前只能靠在 UI 裡摸索**，而這些規則 ApexWin 其實都已經實作得很完整（#20 流水引擎／`HL.fair`／`HL.site` 真假站軸／#56 轉贈語意），只是**從未對玩家解釋過**。⇒ 這是「功能做完但沒說」的落差，不是功能缺口。
    - 範圍（純前端 S–M · **容器優先**）：新增 `HL.help` 說明註冊表（比照 `HL.dock`／`HL.promoCal`／`HL.selftest`／`HL.achievements` 註冊表家族）——一則說明＝資料描述子 `{id, category, q, a, order}`；面板做分類 + 搜尋 + 展開（`HL.ui.modal`）。首批內容鎖定**已實作但玩家看不懂**的規則（紅利流水／可驗證公平驗證步驟／真假站差異／轉贈限制／VIP 與返水怎麼算）。
    - **與既有模組的分工（去重紀律，勿誤判重複）**：`HL.notify` 管「推給你的即時事件」，本卡管「你主動去查的常設說明」；**與 #61 `HL.content` 天然同源**——本卡的說明條目應**共用 #61 的內容註冊表**（本卡是它的一個 `type` 消費者），**勿各造一套**。若 #61 先落地則本卡直接掛上去；若本卡先落地，註冊表形狀須預留給 #61 收編。
    - **真金前的槓桿（§11）**：checklist 的 KYC／提款審核佇列雖屬 `avoid`（需牌照），但「**把規則講清楚**」這半邊**純前端現在就能先做完**，牌照到位時只需把靜態說明接上真狀態源。刻意**不含真人客服對話**（需後端＋人力＝avoid）。
    - 擴充性：加一則說明＝加一筆 spec；i18n 走 `locales` 欄（讓營運文案脫離 `i18n.js` 字典——字典管 UI 用語、內容管營運文案，與 #61 同一紀律）。

> 🤖 **以下由自我進化引擎「平台軌」自動開卡**（2026-08-04 14:00 · 來源：dorados + spinblitz **tier-3 到期補刷**〔船長 08-04 db 點名的剩餘 12 筆之首兩筆〕+ `intel/db/platform-modules.json` **前端UI/UX** 分類審〔4 模組全審，輪替接續 08:00 的擴充性〕）。全自動模式下標 🟦已批准待做。

63. ✅完成（2026-08-05 平台軌 14:00 窗建置輪） **VIP 分階提領 SLA + 分階額度（VIP 從「送錢軸」延伸到「服務水準軸」· 容器優先）** — S–M — 來源：**Dorados 2026-08-04 刷新**——其五階 VIP 決定的不是給多少錢，而是 **① 兌獎處理速度（L1 72h → 42h → L5 24h）② 每月兌獎上限（30,000 → 60,000 Gems）**；刻意**不分階**的是每日上限（全階 2,500 Gems）。同源訊號＝業界已把「兌獎速度」當獨立競爭軸橫評（sportsgambler「Fastest Redemptions」專題）。
    - 問題：ApexWin 的 VIP（#1 段位／#50 成本加權經驗／#60 返水段位比例）**每一條延伸線都是「送錢」**；提款體驗則是**單一固定流程、與段位完全無關**。⇒ 高段位玩家在「拿錢這件事」上感受不到任何差別，而這正是真金站最有感的差異點。
    - 範圍（純前端 · 容器優先）：一張 config 表 `tier → { slaHours, dailyCap, monthlyCap }`（站別感知：假站寬鬆、真站保守）＋ `wallet` 提款流程顯示「預計到帳時間／本日剩餘額度／本月剩餘額度」＋達上限時明確擋下並說明原因（接 #62 支援中心的說明條目）。**表是唯一真相**，真金上線後把數值換成真 SLA 即可，介面與文案不動。
    - 擴充性槓桿：`HL.vip.status().index` 已是全站段位單一出口、`wallet` 已有 demo 提款交易流、`HL.ledger` 已記 withdraw ⇒ 本卡不新增軸線，只把既有三者接起來。**與 §11 真金 checklist 天然對齊**（提款審核佇列屬 `avoid`，但「分階額度與預計時間」這半邊純前端現在就能做完）。
    - **📈 立卡後升級為五平台共識（2026-08-05 本輪兩張新 dossier 帶回）**：**Kaasino** 標準提領上限為**三週期制**（£10,000/日・£20,000/週・£60,000/月）+ Cheese Club 分階解鎖更高門檻 + Prime 頂階專屬客戶經理〔⚠️ 來源衝突已在 dossier 兩記〕；**CoinsBack** CoinsClub 14 級高階解鎖的是**加速兌獎 + 優先客服**。加上原有 Dorados（兌獎 SLA + 月上限）、Chancer（提領上限 + 商城折扣）、BigPirate（客服 / 客戶經理）＝**五站各自貢獻的維度互不相同**（時效／額度／週期數／客服）⇒ **這正是本卡最終不做「固定三欄位 config」而做「可註冊維度表」的決定性依據**（原卡文寫的 `tier → {slaHours, dailyCap, monthlyCap}` 會容不下第 4 種維度；Kaasino 的「週上限」當場就是第一個容不下的例子）。
    - **落地（2026-08-05 · commit 見 git log）**：新增 `prototype/src/core/service-level.js`＝`HL.sla`。**容器先於內容**——本體是**服務水準維度註冊表** `register(spec)`，每筆＝`{id,label,unit,kind,period,better,byTier:{demo,live},fmt}`；`kind:"cap"` 帶 `period`（day/week/month）會被閘逐筆求值、`kind:"info"` 只呈現；`better:"lower"|"higher"` 讓**單調性測項自動逐向驗證**。**新增一種服務水準＝加一筆 spec，閘與面板皆零改動**。首版註冊 5 維度：提領處理時效（假站 48→6h／真站 72→24h＝Dorados 實測值那一列）、每日／每週／每月提領上限、客服層級（標準→優先→專屬客戶經理，以數值 level + `fmt` 映射文字＝證明註冊表不限於金額型）。
    - **三個機械化不變量（皆為常駐測項，非口頭紀律）**：① **每日上限刻意全段位一致**（`sla/daily-cap-uniform` 斷言相等）——這是 Dorados 的設計決策，把它寫成測項是為了讓未來某輪「順手把日限也分階」時**當場失敗並被迫說明理由**；② **日 ≤ 週 ≤ 月**（`sla/period-ordering`，防額度階梯倒掛）；③ **真站在任一維度都不比假站寬鬆**（`sla/live-not-looser`，§11 經濟安全）。
    - **掛鉤**：`app-shell.js renderWd` 提款頁顯示「預計到帳時間／本日・本週・本月剩餘額度」+ 送出前 `HL.sla.check(amt)` 擋下並說明原因、成功後 `HL.sla.record(amt)` **同一筆同時計入三個桶**；`progress.js` VIP 面板加一顆「🚚 服務水準」入口（比照 #50 `HL.edge.open` 的唯讀說明表定位，**刻意不塞進 benefitMatrix** 以免撐爆其四欄網格）。
    - **驗證**：node harness **56→63**（新 7 項）、瀏覽器 selftest **37→45**（含 `sla/wired`）；**負向驗證五種擾動全部被抓**（日限偷偷分階／高段位月上限倒退／真站時效比假站更短／額度閘 off-by-one／跨日誤清週累計）；**真金提款 e2e 六步**（30,000 撞日限 25,000 → 擋且餘額 300,000 **逐位不變**、20,000 成功 → 280,000 且三桶同時扣成 5,000/30,000/60,000、10,000 → 擋、5,000 **恰好等於剩餘** → 放行且日剩 0、100 → 擋、帳本僅 2 筆 withdraw＝**被擋的嘗試零記帳**）；VIP 拉到 💎 後時效 48h→6h、客服層級→專屬客戶經理、**日限仍為 25,000 不變**（不變量①的執行期實證）；EN/zh-Hans 逐項翻譯零繁中殘留；375px 零水平溢出、入口按鈕 235px（未撞「`.ax-btn-ghost` 撐成長條」既載反例）；零 console error（唯一 404＝`/favicon.ico`，serve.ps1 既有、與本卡無關）。sw v142→v143。
    - **本輪自身教訓（誠實記錄）**：① **負向驗證抓到的是我自己的空殼測項**——`sla/period-rollover` 首版寫成 `t.ok(A || weekOf(base)!==weekOf(base+DAY))`，而該起點恰好跨週 ⇒ 斷言永遠被 `||` 右半救活、**植入「跨日誤清週累計」缺陷竟仍 PASS**。已改為把起點對齊到「週的第 3 天」+ 前提斷言，無退路。**教訓：測項裡的 `||` 兜底條件是空殼的溫床**，寧可多一條前提斷言。② **i18n 新鍵撞既有語意**：`本期剩餘` 早已存在且 EN 作 `"Time left"`（錦標賽倒數用），若沿用會讓金額欄位顯示「Time left」⇒ 改用專屬鍵 `本期剩餘額度`（同 08-05 早輪「進行中，剩餘」的同型陷阱，**這是連兩輪同一種撞鍵**）。
    - **仍為 partial（下一步）**：① 提款頁只在 `HL.money.canWithdraw()`（真金模式 + 已核照）時渲染 ⇒ **休閒模式看不到額度閘**，只能從 VIP 面板看說明表；② 額度為**純前端 localStorage**、站別隔離，**無伺服器權威**（真金前必補，與「提款審核佇列」同一批）；③ 時效僅為**顯示值**，沒有真的排程/狀態機（`avoid` 範疇）；④ Chancer 的**商城折扣**維度**刻意未註冊**——它會實際改變送幣成本，需先做 §11 經濟校準，不在本卡「只擋/只顯示、不動錢」的邊界內。

64. 🟦已批准待做 **遊戲專屬任務（game-keyed missions · 單款導流工具）** — S–M — 來源：**SpinBlitz 2026-08-04 刷新**——該站**明確沒有 VIP/忠誠度方案**，唯一的留存結構是 **Starlight Missions＝任務綁定特定遊戲標題、獎勵發回該遊戲的 free spins**（實例：在 Playtech《Better Wilds》轉滿 50 次 → 得 10 SC free spins）。
    - 問題：ApexWin #33 任務是「今日下注 10 次／今日贏 5 次」＝**遊戲無關的通用計數**，#26 挑戰雖按 game 記錄但只認「倍數達標」。⇒ 平台**沒有任何「把玩家導去某一款特定遊戲」的工具**——這對「同仁自製遊戲放置區」（目標 2）特別可惜：新上架的同仁遊戲沒有任何導流機制，只能等玩家自己在大廳翻到。
    - 範圍（純前端 · 容器優先）：一張 game-keyed 任務表 `{ id, game, goal:{type:'spins'|'wager'|'win', n}, reward, window }` + 面板（可依遊戲分組、顯示進度）。**掛既有中央點即可**：`HL.liveStats.record(game, bet, win)` **本來就帶 game key**，不需新基建。獎勵先走 `HL.bonus`（free spins 之類的道具型獎勵留給未來的道具層）。
    - 擴充性槓桿：任務表資料驅動 ⇒ 新遊戲上架時**加一筆就有導流**；與 registry.json/games-loader 的資料驅動 GameList 同一紀律。**與 #33 分工**：#33 管「每天回來玩」，本卡管「去玩這一款」，勿合併成一張表。
    - **📈 佐證升級（2026-08-06 平台軌 20:00 窗 · Legendz 深挖刷新）**：**第二平台佐證**（原僅 SpinBlitz 單平台）。Legendz 的任務同樣綁定特定遊戲：**「play 500 SC on Legendz-branded slots → 5 free SC」**。**差別值得抄**：SpinBlitz 綁**單一遊戲標題**，Legendz 綁的是**一組遊戲（自家品牌 slots）** ⇒ 卡上的 `game` 欄位應允許「單一 id **或** 一組條件」（例：`{ studio: "同仁開發" }`）——這正好服務目標 2 的「同仁自製遊戲放置區」整區導流，比逐款開一筆更省。
    - **📈 佐證升級（2026-08-10 平台軌 20:00 窗 · Stake 深挖 + Shuffle 交叉）：第三、第四平台佐證，且「一組遊戲」那個設計已被兩家獨立驗證為主流形制**。① **Stake Multiplier Drops**＝每週輪換**一組**非-Originals 遊戲才計入（**遊戲組每週換**）；② **Shuffle「Hacksaw Shootout」**（$20,000、2026-07-23→08-06）＝要在**六款不同 Hacksaw 遊戲**各自打到不同倍數目標。⇒ 四平台中 SpinBlitz 綁單款、其餘三家皆綁**一組**（品牌／供應商／每週精選）⇒ 卡上「`game` 欄應允許一組條件」**由建議升為預設形制**，單款只是「一組裡剛好一款」的特例。**另新增一個本卡原本沒有的欄位需求＝`rotates`（輪換週期）**：Stake 的組**每週換**，若寫死一組就得每週改原始碼 ⇒ 應可宣告「這筆任務的遊戲組由某規則每週重選」（最小做法＝`window` 加一個 `rotateEvery` 欄，配一份候選池）。⚠️ **與 #83 的分工先講清楚，免得下一輪把兩張卡做成同一件事**：本卡管「**要在哪些遊戲做到什麼**」（資格條件的遊戲軸），#83 管「**達標之後獎金怎麼分**」（分配軸）；Shuffle 那個活動同時示範了兩者（六款 × 均分池），但它們是可獨立落地的兩層。

> 🤖 **以下由自我進化引擎「平台軌」自動開卡**（2026-08-05 · 來源：spree + punkz **tier-3 到期補刷**〔船長 08-04 db 點名的剩餘 tier-3 群：spree 為其中 priority 最高、punkz 為逾期最久〕+ `intel/db/platform-modules.json` **資料** 分類審〔3 模組全審，取 `last_audited` 最舊者〕）。全自動模式下標 🟦已批准待做。

65. ✅完成（2026-08-06 平台軌 14:00 窗建置輪） **進度來源註冊表（非投注行為也能累積進度 · 容器優先）** — S–M — 來源：**四平台共識**（Spree／BigPirate／DoND／**CapySpin 2026-08-06 本輪刷新**）——原始來源：**Spree 2026-08-05 刷新**——其 XP Rewards Loyalty Program 的 XP **來自「遊玩」＋「選購 GC 幣包」兩條來源**（購買行為本身就累積等級進度），且**需主動 enroll**、100 級 + Emerald/Ruby/Diamond 三層 VIP。
    - 問題（本輪 grep 機械實證）：ApexWin **全站進度只認投注**——`HL.liveStats.record(game,bet,win)` 是唯一入口，其下游 18 條訂閱者（vip/season/guild/tasks/rakeback/jackpot/tournament/raffle/shop…）**全部**由 `bet` 驅動。⇒ 玩家**儲值、在商城消費、完成新手流程、邀請好友**這些「平台其實更在乎」的行為，對 VIP 段位與賽季經驗**貢獻恰好為零**。`app-shell.js` 的 `pushDemoTxn` 只記 `HL.ledger`，不碰任何進度。
    - 範圍（純前端 · 容器先於內容）：一張**進度來源註冊表** `HL.progressSrc.register({ id, kind:'wager'|'purchase'|'shop'|'social', xpPer, cap?, siteAware? })`，把「什麼行為換多少進度」從硬編散落改成一筆定義；`HL.vip.addWager`／`HL.season.record` 改由該表餵入（既有投注來源註冊成第一筆＝**行為零變更**）。首批新來源：儲值（`pushDemoTxn` deposit）、商城消費（`shop.js`）。
    - **⚠️ 經濟安全前提（必須做，否則是印鈔）**：本卡**只發進度、不發錢**——沿用 #50 `HL.edge` 已確立的紀律（加權只餵 VIP／賽季經驗，金錢與帳目一律真實）。另須**每日/每週上限** `cap` + **站別感知**（真站係數保守，§11）；否則「儲值換段位」會讓 VIP 升級金（`LEVEL_REWARDS`）變成可套利的儲值返利。**驗證時必須有一條測項證明「新增購買來源後，真站每單位成本的期望送出額不增加」**。
    - 擴充性槓桿：新增一種可累積進度的行為＝加一筆定義（不改 progress.js）；與 #59 光環層天然相容（光環吃同一份加權額）。**與 #50 分工**：#50 管「同樣是投注，不同遊戲值多少」，本卡管「除了投注，還有什麼算進度」，勿合併。
    - **落地（2026-08-06 · `core/progress-src.js` 新檔 + 4 處接線）**：`HL.progressSrc` ＝ SOURCES 純資料表（`xpPer`／`xpPerLive`／`cap`）+ 純函式 + `grant()` 單一出口 + 唯讀說明面板；node 測項 72→**77**、瀏覽器 54→**61**。
      - **投注註冊為第一筆＝行為零變更**：`live-stats.js` 由「直呼 `vip.addWager` + `season.record`」改為 `progressSrc.grant("wager", xpBet)`（係數恆 1、不設 cap）⇒ 每一注的 XP **逐位不變**（測項 `wager-identity` 對 5 種注額 × 2 站別逐一斷言；真實一注 e2e：Pirots NT$10,000 → `HL.edge.weighted`=16,500，VIP 與賽季各 +16,500 完全相符）。未載入時**回退舊直呼路徑**＝漏載只退化不整組失效。
      - **首批兩個新來源恰好對上 CapySpin 的兩條**：`deposit`（假站 0.5×、日上限 20,000 XP）＋ `checkin`（每日定額 800 XP）。⚠️ **卡上原列的第三個來源「商城消費」經查證後刻意不做**——`shop.js` 的點數本身就來自 `record(bet)`＝**投注衍生**，把兌換再算一次進度是**同一筆投注被計兩次**，且與「選購幣包」的平台證據**不是同一件事**（ApexWin 無真幣包商城，其對應物就是 deposit）。此判斷寫在此以免後續輪回頭補做。
      - ↳ **(2026-08-11 平台軌 14:00 窗) 第二平台佐證＝1xBet**：其 Promo Code Store 的點數除了下注，也來自**帳號驗證、手機綁定、參加賽事**等非投注行為。⇒ 本卡的容器**已足以承接**（`register({ id, kind:"social", xpPer, xpPerLive })` 一筆 spec + 呼叫端一行），故**刻意不開新卡**；此處記下是為了讓下一個無記憶 session 知道「綁手機/驗證給點」屬於填表工作，不是新功能。⚠️ 同時提醒沿用既有紀律：**非投注來源在真站一律 `xpPerLive:0`**（`register()` 對非 wager 類別硬夾 0），否則就是本卡落地時量化過的那條套利路徑（NT$40,000 儲值 → 憑空 NT$800 升級金）。
      - **⭐ 經濟安全＝恆等式而非宣稱（達成卡上的驗證要求）**：真站非投注來源一律 `xpPerLive: 0` ⇒ 真站 XP 流入與改版前**逐位相同**，故「每單位成本的期望送出額不增加」為**恆真**。真站 e2e：儲值 100 萬 + 簽到 → XP／VIP／賽季／**帳本送幣成本四者 delta 全為 0**，同時真站投注照常（Dice 5,000 → 4,000 加權，零回歸）。`register()` 對非 wager 類別**硬夾** live 為 0（即使呼叫端刻意傳 `xpPerLive:9` 也夾 0）⇒ 動態註冊永不可能成為真站經濟漏口，要開啟必須改原始碼表 + 過測項。
      - **為何真站設 0（把理由量化了）**：demo 實測一筆 NT$40,000 儲值 → 20,000 XP → 跨 2 個子級 → **憑空產生 NT$800 升級金**＝2% 儲值返利。真站若開啟，玩家儲值拿一次進度、把同一筆錢押出去再拿一次 ⇒ 每單位莊家理論收入對應的 XP 上升 ⇒ 送幣量上升，牴觸 §11。**未來要在真站開啟的前提**＝先有下注模型能估該筆儲值的期望莊家收入。
      - **負向擾動六項全被抓**（證明測項非空殼）：真站 deposit 開 0.5×／wager 改 1.1×／wager 加上限／假站 checkin 改 0（功能變死碼）／移除全部非投注來源／取消 cap ⇒ 各被 1–13 條斷言抓出，baseline 零誤報。
      - **誠實標註的三處附帶修正**：① i18n **首版踩到 P3 串接陷阱**（`每日上限 20,000 XP（已用 0）` 為單一文字節點 ⇒ EN/zh-Hans 整列殘留繁中，而同列純 key 的 `不設上限` 正常翻譯＝診斷鐵證）→ 改為「每條 key 各自成元素、數字放裸文字節點」，三語重驗全通、EN 零殘留 CJK；② XP 誤用 `HL.dom.money` 印成 `NT$ 20,000` → 改純數字 helper（XP 不是錢）；③ VIP 面板 `累積有效押注`／矩陣 `累積押注` 標籤已不誠實（值自 #50 起即加權、本輪起更含非投注來源）→ 改 `累積 VIP 經驗`／`累積經驗` 並補入口鈕。
      - **🐞 順帶修掉一個既有 P0 缺陷（本卡最大意外收穫）**：`progress.js` benefitMatrix 仍引用 **#60 更名前的 `RB_RATES`**（已改名 `RB_LEGACY`）⇒ **`HL.vip.open()` 自 #60 起整個 VIP 俱樂部面板拋 `ReferenceError`、零渲染，歷時 2 天無人察覺**（過往驗證從未真的開過本面板）。已修（並**刻意不用** `rakebackCore.edgePctFor`——那回的是「占莊家優勢比例」53.5%，會與同面板「返水率（本級）1.1%」自相矛盾；`RB_LEGACY` 本就是 `RB_RATES` 同一份陣列＝精準還原原意，實測矩陣 0.5/0.8/1.1/1.4/1.8% 與本級 1.1% 一致）+ 補**兩條迴歸鎖**（實際呼叫 `HL.vip.open()` 斷言不拋錯/矩陣 6 列/入口鈕恰 1 個；返水欄數值必 <5% 以防再度混入 edge 比例）。i18n +14 EN／+12 zh-Hans（grep-first 複用既有 `經驗倍率`／`儲值`／`每日簽到` 三鍵、省 3 個 dup；`每日上限`／`已用` 簡繁同形故刻意不列 HANS）。sw v147→v148。

66. ✅完成（2026-08-06 平台軌 08:00 窗建置輪） **里程碑獎勵改以既有 `HL.reveal` 揭曉發放（接線缺口，非缺元件）** — S — 來源：**兩平台共識**——Spree「**每 10 級解鎖一份禮物，且禮物本身是一種開獎玩法**」（Gift Spins／Scratch-Offs／Bubble Bursts／Wonder Wheels）+ Punkz「**loot box 獎品品質隨 VIP 階提升**」（最多 3 個）。
    - 問題（本輪查證修正了原本的誤判）：一度以為缺「揭曉型領獎元件」，**實查發現元件早已存在**——#38 `core/reveal.js` 提供 `scratch`/`bubble`/`wheel` 三種樣式，且鐵律正確（呼叫端先同步入帳、動畫僅呈現，中途關閉不漏帳）。**真正的缺口是採用率**：全站只有 3 個呼叫點（`meta.js` 里程碑、`onboarding.js` 大禮包、`shop.js` mystery/gacha），而**四大進度里程碑仍是直接入帳、零儀式**：VIP 升級金（`progress.js` `LEVEL_REWARDS`）、季票階梯（#46）、成就徽章（#45）、任務完成（#33）。
    - 範圍（純前端 · 極小改動面）：在上述四處的**派發之後**插一層 `HL.reveal.show({...})`；樣式**依里程碑層級選擇**（比照 Punkz「階級越高箱子越好」：小里程碑 scratch／中 bubble／大 wheel），並讓樣式選擇成為一筆 config 而非寫死在四個檔。**不動任何金額邏輯**（金額與帳本、`HL.ledger` 插樁點完全不變）＝零經濟風險、可 flag 停用。
    - 為何值得做（低成本高感知）：這是**唯一一張「複用既有元件、不新增任何機制」就能提升儀式感的卡**；同時修掉「建了容器卻沒人用」的重複病（與船長 P4 對 `HL.dock`、07-31 台帳對 `promoCal.register` 外部註冊者為零的發現**完全同形**——ApexWin 反覆出現「元件做好但接線沒補完」）。
    - 注意：`HL.reveal` 為**純呈現**，務必維持「先入帳再播動畫」的順序；連續多筆里程碑同時達成時需排隊或合併，勿同時彈三個 modal。
    - **落地（2026-08-06）**：`core/reveal.js` 加**里程碑層**（層級→樣式表 `TIER_STYLE` + `registerMilestone` 註冊表 + 佇列 + `planMilestone` 純決策函式），四處呼叫端各一行接線（`progress.js` 升段/升子級/任務領取、`season.js` 兩軌、`achievements.js` 合併一則）。**採用率 3 → 8 個呼叫點**。
      - **樣式為資料不是散寫**：`vip-rank`→wheel、`season`/`badge`→bubble、`vip-sub`/`task`→scratch，比照 Punkz「階級越高箱子越好」；**新增一種里程碑＝加一筆註冊**（測項 `reveal/milestone-extensibility` 實測：註冊 `__probe` 後立即可播且樣式由層級決定，非法 style 退回層級預設）。
      - **停用＝複用既有 kill-switch**（`HL.gset.anim` + `prefers-reduced-motion`），**刻意不新增旗標**——`game-settings.js` 檔頭已立「避免死 flag」紀律。實測動效關閉時 0 modal 但獎金照入（locked 840→3400，+2560）。
      - **本卡順帶修掉兩個既有缺陷**：① `HL.ui.modal` 新增 `onClose`（任何關閉路徑都觸發一次 + close 冪等）——原本呼叫端的 `onDone` **只在按確認鈕時觸發**，玩家按 × 就永遠不來 ⇒ 若沒有這條，揭曉佇列會**永久卡死**；② `main.js enterView`／登出改為先 `HL.reveal.drain()` 再 `closeAll()`——否則關掉當前那則後**下一則會蓋在新頁面上**，正是該處註解（「避免換頁後仍蓋著」）要防的情況。
      - **重排載入序（真缺陷，非美化）**：`reveal.js` 原位於 `selftest.js` **之前** ⇒ 新測項在 node 註冊得到、**瀏覽器整組註冊不到**（實測 `revealTests: []`）。移到 `service-level.js` 之後即修復；本檔只定義 `HL.reveal`、所有呼叫端皆執行期取用，故零風險。
    - **驗證**：node harness **68→72**、瀏覽器 selftest **50→54**（4 項 reveal 測項**兩端皆在**＝node/瀏覽器同步，正是上面那個載入序缺陷的迴歸鎖）。
      - **負向驗證（證明測項非空殼）**：六種擾動逐一注入再還原，**全部被抓到**——① 大禮層級改刮刮卡 ② 拿掉動效檢查 ③ 佇列上限 off-by-one ④ 顯示額改無條件進位 ⑤ 非法 style 不退回預設 ⑥ 零/負獎額照播。
      - **真實 e2e（走中央結算點與真按鈕，非直呼內部函式）**：`liveStats.record("dice",5200,0)` → 青銅→白銀、**同時觸發 3 個里程碑但畫面上恆為 1 個 modal**（`pending:3 / masks:1`），依序 wheel→scratch→bubble 播完；**全程 `locked` 逐位釘在 840 不動**＝關動畫不影響帳。真實點擊任務面板「領取 +NT$ 400」→ locked +400 且彈出 `🎯 每日任務達成` scratch 顯示 NT$ 400。完成路徑（戳 3 泡泡 → 「太棒了，收下 ✓」）實測 `onDone` **恰觸發一次**；動效關閉時 `played:false` 但 `onDone` **仍恰觸發一次**（呼叫端不必分支）。
      - **零回歸**：真實 Dice 局 28,560→28,510（−50）、betlog +1、無殘留 modal；**既有 3 個 `show()` 呼叫點未受 `onClose` 改動影響**——真實買「命運寶箱」走完 wheel→轉動→收下 NT$ 200，`onDone` 正確開回 🛍️ 點數商城。換頁實測 `masks:0 / pending:0` 且 `locked` 不變。
      - **三語**：EN 五條全譯且**零殘留 CJK**（VIP Rank Up／VIP Level Up／Daily Mission Complete／Season Pass Reward／Achievement Unlocked）；zh-Hans 五條**逐條與繁體相異**＝無 U31 型等值死鍵（晉升/等级/任务达成/阶梯奖励/解锁）。**過程中再次撞到量測競態**（前一個 modal 未關完就讀標題 → `vip-sub` 誤讀成 season），追查後確認是量測法問題、未誤改 code——與 08-05 那輪「簡繁同形偽陽性」同家族。
      - **375px 手機**：wheel／bubble／scratch 三種舞台**皆零元素超出視窗右緣**。console 唯一錯誤為既存 `/favicon.ico` 404（已單獨 fetch 複核 status 404）。sw **v145→v146**。
    - **已知限制（誠實記載）**：按 × 關閉時 `onDone` 不觸發 ⇒ 任務面板不會自動開回（**沿用 `shop.js` 既有慣例、非本卡新增**，「太棒了，收下 ✓」才是設計路徑）；佇列上限 4 則，超出直接丟棄動畫（獎金早已入帳）；`meta`/`onboarding`/`shop` 三個舊呼叫點**維持直呼 `show()`**，未強制改走註冊表（它們的樣式與標題本就逐案不同，硬收進表反而是過度抽象）。

67. ✅完成（2026-08-05 平台軌 08:00 窗建置輪） **負責任博弈 `HL.rg`（限額型別註冊表 + 下注前閘 + 冷靜期／現實檢查 · 容器優先）** — S–M — 來源：**2026-08-05 平台軌審「資安」分類**（本輪輪替接續 07-28，為該分類最舊、逾期 8 天）。**這不是新功能，是把三個早已存在卻懸空的零件接起來**——07-28 台帳即已記載本項「並非乾淨的 absent，而是**『已對外宣告但點進去是空的』**」並明列為「**下一輪平台軌首選候選**」，其後 8 天、約 15 個平台窗**無人認領**。
    - 三個懸空件（全部由本卡接線）：① `layout/app-shell.js` 福利中心 hub 的 `🛡️ 負責任博弈` 只呼叫 `ui.comingSoon()` ＝**死巷入口**；② `core/app-state.js` 的 `lossLimitRemaining: 5000`（註解「安全遊戲：今日剩餘額度」）有宣告、`reset()` 也會重設，但**全站零讀取者＝死欄位**（node grep 實證：全 repo 僅 app-state.js 自身 2 處）；③ `core/i18n.js` 早已備妥 key「負責任博弈」→ Responsible Gaming／负责任博弈。⇒ **缺的只有中間那層引擎**。這是引擎**第四次**遇到「元件/欄位做好但接線沒補完」（前有船長 P4 的 `HL.dock`、07-31 台帳的 `promoCal` 外部註冊者為零、#66 的 `HL.reveal`）。
    - **與 CONTROL.avoid 的界線**：avoid 列的是「法定合規」＝法域強制、認證、報送、KYC；本卡做的是**玩家自願的自我約束工具**，屬純前端 UX，不涉牌照與外部審查（台帳 07-28 即已判定「可做」；同分類的 KYC 則維持 absent 且**不開卡**）。
    - 範圍（已落地）：新增 `core/responsible.js`＝`HL.rg`。**容器先於內容**——本體是**限額型別註冊表** `register(spec)`（比照 `HL.games.register`／`HL.achievements.register`），每筆 spec＝`{id,label,unit,period,measure(st)}`，**新增一種限額＝加一筆 spec，閘與面板皆零改動**。首版註冊 4 型別（每日淨損／每日投注額／單注／每日遊玩時間），另有**冷靜期**（24h/7d/30d，全站擋注、到期自動解除、**不可提前解除**）與**現實檢查**（每 N 分提醒已玩時長與今日淨損，可關）。
    - **完整性關鍵＝調升冷卻的不對稱性**：**調降/新設立即生效、調升/移除須等 24 小時**（期間可隨時取消）。若限額能隨時調高，工具就只是裝飾——玩家上頭時一鍵放寬等於沒有。這條不對稱性是本檔最重要的不變量。
    - 掛鉤：**累積**走中央結算點 `HL.liveStats.record` 一行（全遊戲＋跟注通吃）；**閘**走 `HL.instant` 手動/自動兩處 + `HL.table.commit`（兩大共用引擎、約 16 個呼叫點）。**未設限額時 `check()` 恆真、不碰餘額不碰結算＝零回歸契約**（selftest `rg/zero-regression` 盯著）。
    - **驗證**：node harness **51→56**（新 5 測項）、瀏覽器 selftest **32→37**；**負向驗證**——四種擾動（① 拿掉 24h 不對稱 ② 限額比較 off-by-one ③ 冷靜期不擋注 ④ 跨日不歸零）**全部被對應測項抓到**＝測項非空殼。**真實 Dice 局 e2e**：設單注上限 10 後點「擲骰」→ 餘額 28,560 **逐位不變** + toast「已達單注上限（NT$ 10）」；冷靜期同樣擋下；清空限額後**同一顆按鈕**正常扣款 28,560→28,510（−50）且 RG 累積今日押注 50。死欄位接線實證：設淨損上限 1000、已淨損 700 ⇒ `lossLimitRemaining` ＝ **300**。三語逐項驗（EN/zh-Hans **零繁中殘留**）、375px 手機零水平溢出、零 console error。sw v141→v142。
    - **本輪順帶修掉自己踩的兩個既知雷**：① 首版把「目前 未設定 · 今日已用 NT$0」寫成單一文字節點 ⇒ 依 P3 契約**永遠翻不到**（preview 抓到後改為中文片語各自成節點）；② `.ax-btn-ghost` 預設 `display:block` + 撐滿容器，首版讓「套用」與冷靜期三選項全變成 265px 長條（＝UI 品質清單既載的反例）⇒ 改為內容寬行內按鈕，冷靜期三 chip 現同列（實測 top 皆 967）。
    - **仍為 partial（下一步）**：**自我排除（self-exclusion，長期/永久且不可自行解除）未做**；純前端 localStorage、站別命名空間隔離，**無跨裝置/伺服器強制**（真金前需後端權威）；**slot 等自走結算路徑目前只累積、未接閘**（僅 `HL.instant`/`HL.table` 有閘）。

> 🤖 **以下由自我進化引擎「平台軌」自動開卡**（2026-08-05 14:00 窗 · 來源：kaasino + coinsback **tier-3 到期補刷**〔kaasino 逾期 7 天＝全庫最久、coinsback priority 67＝逾期群最高〕+ `intel/db/platform-modules.json` **金流** 分類審〔5 模組全審，該分類 `last_audited` 07-30＝全 8 分類最舊〕）。全自動模式下標 🟦已批准待做。

68. 🟦已批准待做 **逐注返還的「即時可視化」（把 #60 已算好的莊優返還演出來 · 零經濟變動）** — S — 來源：**CoinsBack 2026-08-05 刷新**——其招牌「逐注即時退 50% 理論房屋優勢」**機制與 ApexWin #60 已同構**（#60 於 08-01 把返水改為 `bet × 該遊戲莊優 × VIP 段位返還比例`，且用 #50 逐遊戲 EDGE 表比對手「slot 一律 97%」更細）⇒ **殘存缺口只剩可視化與即時性**。
    - 問題：ApexWin 的返水**逐注即時算出、卻只累進每日桶等玩家自己去領**——下注當下**零回饋**，玩家完全感受不到「這一注退了多少」。本專案的 coinsback dossier 早在 07-02 就寫下「CoinsBack 有這個好機制卻沒把它演出來，這是 ApexWin 的機會」；**34 天後我們自己落入同一狀態**（機制更好、演出更少）。
    - 範圍（純前端 · **不改任何公式、不多發一毛**）：`HL.rakeback.accrue` 已在中央結算點被呼叫且知道本注的返還額 ⇒ ① 結算瞬間在下注面板附近飄一個「+X 已返還」微動效 ② 一個「今日已返還」小計（讀既有桶，不新增儲存）③ 可在遊戲設定或返水面板一鍵關閉動效。**驗證重點＝金額必須逐位等於 `HL.rakeback` 既有計算**（新增一條測項斷言「可視化讀到的值 === 桶內累加值」），避免出現「畫面說退 3 元、桶裡只有 2 元」的信任裂縫。
    - 擴充性槓桿：飄字元件若做成 `HL.ui` 的通用 `floatText(anchor, text)`，#38 `HL.reveal`／#45 徽章／#33 任務達標皆可複用（**與 #66 同一個「儀式感缺口」家族，但兩張不重疊**：#66 是里程碑用既有 modal 揭曉、本卡是逐注的微回饋）。
    - 注意：**不要**順手把返水改成「免領取自動入帳」——那會改變送幣時點與 `HL.ledger` 的成本歸屬（且 CoinsBack 之所以能自動入帳是因其為 SC 直入）。本卡只碰呈現層。

69. 🟦已批准待做 **多開網格 Multi-Game（1／2／4 格同時玩 · GameFrame 之上的網格容器）** — M — 來源：**Kaasino 2026-08-05 刷新（招牌 reconfirm）**——其 split-screen 可**同時開 1/2/4 款** slots 或真人桌（可混搭），控制列含 `1 game／2 games／4 games` 切換 + 每格獨立 `X` 關閉，評測把「多款 slot 間切換仍順暢」當賣點寫出。**本專案的 kaasino dossier 自 2026-06-29 首次深挖即列為「最關鍵缺口」，至今 37 天、約 100 個平台窗未被開卡**——本輪正式立卡以免繼續沉在 dossier 裡。
    - 問題：`HL.gameFrame` 至今**單款獨佔全畫面**，重度玩家無法同時跑多局；而 ApexWin 的 Originals 全走 `HL.instant` 的互動回合制，**天生適合網格化同時跑**（比 slot 站更適合，因為每格都是可獨立操作的回合，不是被動轉軸）。
    - 範圍（純前端 · **容器優先**）：在 GameFrame 之上加一層網格容器＝頂部控制列（1／2／4 格切換 + 全螢幕）+ 每格獨立 `X`；每格各自載入一款 `HL.instant` Original，**各格獨立下注、獨立結算**，全部照樣走中央掛鉤 `HL.liveStats.record`（VIP／任務／返水／彩金／熱度／#67 限額閘一律通吃、無需改任何遊戲檔）。窄螢幕自動降階為單格或 1×2 直排。
    - **最大風險＝多實例狀態隔離**（已知、須先設計再寫）：`HL.instant` 現為單實例假設，多開時每格的 `nonce`／自動下注計時器／面板 DOM 參照都必須獨立，否則會出現「A 格的自動下注扣到 B 格」這類災難級錯誤。**實作前必須先確認 `HL.instant` 可安全多實例化**（或先做一張 S 級前置卡把它實例化），**不要直接在 UI 層硬塞兩個面板**。
    - 附帶加值（Kaasino 沒做、可差異化）：網格頂部一條**本次多開 session 匯總條**（總下注／總輸贏／最高單局倍數），資料全部來自各格已回報給 `HL.liveStats` 的單局結果。

> 🤖 **以下由自我進化引擎「平台軌」自動開卡**（2026-08-05 **20:00 窗** · 來源：betpanda + zonko **tier-3 到期補刷**〔兩者皆逾期 4 天＝全庫最久，betpanda priority 65＝逾期群最高〕+ `intel/db/platform-modules.json` **活動** 分類審〔6 模組全審，該分類 `last_audited` 07-31＝全 8 分類最舊〕）。全自動模式下標 🟦已批准待做。

70. ✅ **儲值側限額閘（`HL.rg` 加三型別：日／週／月儲值上限 · 業界最標準的 RG 限額）** — S　`(2026-08-05)` — 來源：**08-05 14:00 窗台帳審「資安」時查獲**（當輪 `max_cards_per_run` 已滿，只記在 `STATE._platform_run_note_20260805c` 與台帳，指名「下輪低成本高價值候選」）＝**本輪正式認領並落地**。
    - 問題：#67 `HL.rg` 首版註冊 4 種限額（每日淨損／每日投注額／單注／每日遊玩時間）**全部在下注側**；而**業界最標準、幾乎每個負責任博弈頁面第一項的「儲值上限（deposit limit）」完全缺席**。缺口的具體形狀是「錢包 `doDeposit` 是全站唯一儲值咽喉點、但沒有任何閘」——玩家可以在設了嚴格淨損上限的同時無限儲值。
    - **這張卡正是 #67「容器先於內容」設計的第一次外部兌現**：預期成本＝「加三筆 spec + 一處閘呼叫」，若真如此，則 #67 的註冊表抽象成立；若得改閘/改面板，則抽象是假的。**實測結果：抽象成立但需一次誠實的擴充**（見下）。
    - 範圍（已落地）：`core/responsible.js` 三處擴充 + `layout/app-shell.js` 一處接線。
      - **① spec 新增 `axis` 維度**（`"bet"`／`"deposit"`，預設 `bet`）：閘依 axis 過濾型別 ⇒ **下注閘看不到儲值限額、儲值閘看不到下注限額**（否則「單注上限 500」會擋掉「儲值 1000」＝災難級誤擋）。`evaluate()` 第 6 參數，**漏傳即退化為 `bet`＝既有 16 個呼叫點一字未改**。
      - **② period 由 `day|none` 擴充為 `day|week|month|none`**：週/月桶**刻意沿用 #63 `service-level.js` 的同一口徑**（`weekOf = floor(ts/WEEK)` 固定長度桶、`monthOf` 走曆月）＝兩個模組的期間語意不分岔。
      - **③ 儲值累計器 `st.dep`**（`{day,week,month,used:{...}}`，跨期只清該期＝跨日不清週、否則玩家可用跨日繞過週限）。
      - **④ 接線**：`doDeposit` 開頭 `if (!HL.rg.checkDeposit(amt)) return;`、成功入帳後 `HL.rg.recordDeposit(amt)`。**商城買幣包（休閒模式）與法幣儲值共用同一個 `doDeposit`** ⇒ 一處接線兩條路徑通吃。加密貨幣儲值只給地址、無金額入口，故無閘（已在卡上註明，非遺漏）。
      - **⑤ 冷靜期一併擋儲值**（原僅擋下注）：冷靜期＝「暫停賭博」，期間還能儲值等於工具漏了一半。這是本卡唯一**刻意改變既有行為**之處，已寫成測項。
    - **驗證**：node harness **63→68**（新 5 測項）、瀏覽器 selftest **45→50**（10 項 rg 全 pass）。
      - **負向驗證（證明測項非空殼）**：五種擾動逐一注入再還原，**全部被抓到**——① 閘不依 axis 過濾 →`rg/deposit-axis-isolation`；② 跨日連週/月桶一起清 →`rg/deposit-period-rollover`；③ 冷靜期不擋儲值 →`rg/deposit-cooling-off`；④ 邊界改 `>=` →`rg/limit-gate` + `rg/deposit-gate` 兩項同時紅；⑤ 累計器不進位 →`rg/deposit-gate` + `rg/deposit-period-rollover`。
      - **真實錢包 e2e（走商城買幣包按鈕，非直呼函式）**：設每日儲值上限 5,000 → 買 1,000 幣包放行（餘額 28,560→**29,560**、`walletTxns` 0→1、`HL.ledger.derived().deposit` 0→**1,000**、`used` 0→1,000）→ 買 5,300 幣包**被擋**（餘額、txns、帳本、used **四項逐位不變**，toast「已達每日儲值上限（NT$ 5,000）」）。
      - **不對稱性在真實 UI 上成立**：調升為 50,000 → 生效值仍 5,000 + pending，再買 5,300 **仍被擋**；取消 pending 後調降為 2,000 **立即生效**，買 1,000（1,000+1,000＝2,000 **恰達上限**）放行、再買 1,000 被擋 ⇒ 邊界為 `>` 而非 `>=`。
      - **下注側零回歸（真實 Dice 局）**：在每日儲值額度**已用滿 2,000/2,000** 的狀態下，走大廳→娛樂城→Dice「▶ 試玩」→ 點「擲骰 🎲」⇒ 餘額 28,560→**28,510（−50）正常扣款**、`deposit-daily.used` **仍為 2,000（下注不吃儲值額度）**、RG 下注累計器 `wagered=50`／`loss-daily used=50`（兩軸各自累積、互不汙染，持久化 `HL_RG.st.dep` 三桶號齊備）。
      - **三語**：EN／zh-Hans 面板**零繁中殘留**（EN「Deposit limits／Weekly deposit limit／Used this week」、HANS「储值限额／每周储值上限／本周已用」逐項確認）。⚠️ 過程中**抓到並修掉自己犯的一個 U31 同型錯**：HANS 字典寫了 `"本月已用": "本月已用"`＝**簡繁完全相同的等值死鍵**（首版誤加，已刪並在該處註明只列相異者；順帶記下本檔既有的 `"今日已用": "今日已用"` 是同型冗餘，屬 i18n 維度既存項、不跨軌改）。
      - **375px 手機**：面板內**零元素超出視窗右緣**（逐元素 `getBoundingClientRect().right` 檢查）；7 顆「套用」鈕皆 **60px 內容寬**（未犯 `.ax-btn-ghost` 撐滿長條的既知反例）；`documentElement.scrollWidth` 的 1px 差在**面板關閉時完全相同**＝既存、非本卡回歸。
      - **console**：唯一錯誤為既存 `/favicon.ico` 404（已單獨 fetch 複核），與本卡無關。sw **v143→v144**。
    - **已知限制（誠實記載）**：純前端 localStorage、站別命名空間隔離，**無跨裝置/伺服器強制**（真金前需後端權威，與 #67 同）；**會員（後端）模式下 `HL.api.walletTxn` 的伺服器側無對應閘**——前端擋得住 UI 路徑，擋不住直接打 RPC（已記入 §11 真金前 checklist 的性質，非本卡範圍）。

71. ✅完成（2026-08-17 平台軌·08:00 窗，**刻意只做一半並寫明理由**） **紅利到期軸（`HL.bonus` 的可領取獎金與待解鎖紅利加上到期時鐘）** — S–M — 來源：**BetPanda 2026-08-05 刷新**——其歡迎禮明碼寫出「**80× 流水、7 天內未達標即失效**」，且**每日 rakeback 08:00 UTC／每週 cashback 週三 13:00 UTC 自動入帳（免 opt-in、可即提）**＝紅利有明確的「時鐘」與「壽命」。
    - 問題：ApexWin `core/progress.js` 的 `HL.bonus` **兩側都永不到期**——`unlocked`（可領取獎金）可以無限期躺著不領，`entries`（待解鎖紅利，逐筆 `{amt, req, prog}`）也**沒有任何時間欄位**。已用 grep 機械複核 `badd/bstate/bclaim` 零 `at|expireAt|ttl`（**刻意複核以免重演 07-30 的假缺口事故**：當時台帳誤記「缺 no-wager 零流水紅利」，實際 `wagerFree` 自 #20 起即存在）。
    - **不是路線爭議、是房規漏了一處**：同站內**已有兩個逾期作廢先例**——`HL.rakeback` 每日桶跨日作廢、#33 `HL.cashback` 逾期作廢。⇒ 主軸 `HL.bonus` 反而是唯一沒有壽命的送幣出口。
    - 範圍（純前端 · **描述子優先**）：`badd(amt, opts)` 的 `opts` 已是描述子（現有 `source`／`wagerFree`）⇒ **加一個 `ttlMs` 欄位**即可讓「每個送幣來源自訂壽命」（簽到里程碑 30 天、活動紅利 7 天、cashback 沿用零流水立即可領…），**不改任何送幣端**。逐筆 entry 與 unlocked 各記 `at`；`bstate()` 載入時懶清理逾期筆（比照 rakeback 日桶的懶觸發，不需常駐計時器）；領取中心顯示「剩餘 X 天到期」倒數 + 到期前一天走 `HL.notify` 提醒。
    - **經濟方向與 §11 一致**（真金前需把整體回饋率收斂）：到期作廢會**降低**送幣成本 ⇒ 應為**站別感知**（假站給寬鬆 TTL 或不到期以維持展示體驗、真站給業界值），並在 `HL.ledger` 記一筆「逾期作廢」讓成本回沖可稽核。
    - ⚠️ **實作前必讀的風險**：這是**唯一會「銷毀玩家已看到的錢」的機制** ⇒ 必須有 (a) 到期前提醒、(b) 面板明示壽命（不能靜默蒸發）、(c) 一條測項斷言「**已達流水標準而轉入 unlocked 的錢不得因原 entry 的 TTL 被回頭作廢**」（否則玩家做完流水卻被追溯沒收＝信任崩塌）。`progress.js` 檔頭已載「金額不可銷毀」的防毀損原則，本卡是它的**唯一例外**，必須寫明是刻意例外。
    - **落地（2026-08-17 平台軌 08:00 窗）**：新檔 `core/bonus-ttl.js`＝依**送幣來源**註冊的壽命描述子表（`id` 直接就是 `badd` 的 `source` 字串，**不另立第二套 key**）。`progress.js` 三處接點：`mkEntry` 授予當下求值一次寫 `exp`、`bSweep` 懶清理、`bStatus/bonusOpen` 出倒數。**卡上不變量 (c) 不是靠斷言而是靠作用域**：`sweep(entries, now)` 的簽章裡**沒有 unlocked**，而達標的 entry 早被 `entries.shift()` 移出 ledger ⇒ TTL 結構上夠不著已解鎖的錢。帳本新增 `bonus_void` 型別做成本回沖（`promo = bonus + faucet − bonus_void`，**毛額不動**＝發出去多少與真被拿走多少同時可見）。
    - **零回歸是「欄位不存在」而非比對**：全站 23 個送幣來源中本輪只給 6 個壽命，其餘 **17 個 `expAt()` 恆回 0 ⇒ `if (exp>0)` 不成立 ⇒ entry 裡沒有 `exp` 這個鍵**，與改版前在 localStorage 中逐位相同；改版前的舊存檔在 `now=9e15`（最嚴苛）掃描下 **清 0 筆、留 2 筆且逐位不變**＝壽命不追溯。
    - ⚠️ **刻意只做一半，理由寫在這裡而非埋在程式裡**：卡上另要求 `unlocked`（可領取獎金）也加壽命，**本輪不做**。(1) `unlocked` 是**單一純量**、沒有逐筆授予紀錄，要讓它到期得先把它改成第二本 ledger＝資料模型變更；(2) 那是「銷毀玩家已經賺到、隨時可領的錢」＝本卡風險最高的變體，屬**船長裁決**而非引擎自行開啟；(3) 若只先塞個 `uat` 時戳等以後用，就會長出**零讀取的死欄位**——維護軌 08-17 00:00 窗剛開的 T34（`HL.rg` hint 死欄位）正是同一種病。⇒ **不預留、要做時再加。**
    - **驗證**：node fast **153 → 164 全綠**（新增 10 條 #71 鎖 + 1 條棘輪）；**負向擾動 37/37 全被抓**（見 #101 與日誌）。首屏 1392→**1412KB／87 支**（+20KB／+1 支，門檻 1600KB，餘裕 188KB）。sw v173→v174。

101. ✅完成（2026-08-17 平台軌·**14:00 窗**，**但卡上那個「36」是錯的，而它錯的方式正是本卡最有價值的地方**） **7 支核心模組的自我測項在瀏覽器端從未註冊過（node 有、瀏覽器沒有）** — S–M — 來源：**#71 實作當輪自我檢出**（非外部平台、非台帳輪替）。
    - **怎麼被發現的**：#71 首版把 `bonus-ttl.js` 排在 `progress.js` 之前（也就是 `selftest.js` 之前），5 個新測項因此**只在 node 註冊得到**。這正是 `index.html` 裡 `reveal.js` 那條註記（「#66 新增的 4 個測項因此在瀏覽器端整組註冊不到」）**同一個坑第二次**——⇒ 順手機械掃了全家族，發現**不是只有我踩到**。
    - **實測（2026-08-17，去註解）**：凡瀏覽器區呼叫 `registerTests(HL.selftest)` 的 core 模組共 15 支，其中 **7 支排在 `selftest.js`（第 54 支）之前**：`econ-config.js`(2 項·第 3 支)、`ledger.js`(3·19)、`rewards.js`(6·22)、`rakeback-core.js`(6·26)、`wager-scope.js`(5·27)、`score-axis.js`(5·36)、`rakeboost.js`(9·50) ⇒ **合計 36 個測項在瀏覽器端從未註冊過**。node 端因為 `run.js` 逐檔 require 而全部跑得到，所以**這件事在 CI 上完全看不出來**。
    - ⚠️ **為什麼不能順手全修（這才是本卡的難點）**：`econ-config.js` 排在第 3 支**是必要的**——`cashback/edge/faucet/jackpot/progress-src/progress` 都在載入時 `if (HL.econCfg && HL.econCfg.register)` 自我註冊，把它往後移會讓那些註冊**靜默變成 no-op**（守衛是短路的，不會報錯）。⇒ 這是一張要逐檔判相依方向的卡，不是調換 7 行 `<script>` 就好。
    - 範圍：逐支判定「它被誰在載入期取用」→ 能往後移的往後移；不能移的（如 `econ-config.js`）改為**延遲註冊**（例如引擎提供 `selftest.ready(fn)`，或各模組把 `registerTests` 掛到 `DOMContentLoaded`）。**已先立棘輪**（常駐鎖 `platform/selftest-registration-order`）：名單只能變短、不得變長，且修好後沒從名單刪除也會 FAIL（防棘輪自己鬆掉）。負向擾動雙向各 1 例、皆被抓。
    - ⭐ **落地當輪機械複驗推翻了卡上的「36 項／7 支」——真值是 16 項／3 支**。做法＝寫一支**瀏覽器載入模擬器**（vm + DOM shim，依 `index.html` 的 `<script>` 序真的跑一遍，再 fire `DOMContentLoaded`，然後直接讀 `HL.selftest._reg`），不再用 grep 推論。實測：7 支裡有 **4 支本來就註冊得到**——`econ-config`(2)／`ledger`(3)／`rakeback-core`(6)／`rakeboost`(9)＝**20 項**早有 `else addEventListener("DOMContentLoaded", …)` 的延後分支（分別由 #90／#56／#60／#52 補過）。真正掉的是 **3 支**：`rewards`(6·有 `if` 沒 `else`)、`wager-scope`(5)、`score-axis`(5)（後兩者是**無條件呼叫**，而 `registerTests` 對 falsy `st` 會 early-return ⇒ **連錯都不報**）。
    - ⭐ **為什麼會錯＝棘輪守的是代理指標**：舊鎖以 `grep` 判「載入位置是否早於 selftest.js」，而位置只是**代理**——它把「排得早」直接當成「收不到」，對已經自己延後註冊的模組**全部誤報（4/7）**。⇒ 這是「卡片範圍是上一輪的推論」家族的**第 7 變形：鎖守的是代理指標，而代理與真相已經分岔**（前六種＝範圍被低估／前提被推翻／要求與從未建造的模組整合／宣稱其餘已被中央機制覆蓋／鎖的錨點不存在／卡片描述的是症狀的一半）。
    - ✅ **修法不是逐檔調位置，而是讓位置不再有意義**（沿用 #71 的通則：能用結構消滅的相依，就別只用斷言看守）：`selftest.js` 新增**延後註冊佇列 `HL._selftestQ`**——排在它前面的模組把 `registerTests` 推進佇列，它一載入就 `while/shift` 清算完畢（**同步**，不等 `DOMContentLoaded`）。**15 支模組全部收斂成同一個形狀**（直通分支 + else 排隊分支），連排在 selftest.js **之後**的 8 支也一起改，理由是「哪天 `index.html` 被重排也不會再靜默掉測項」。原本 4 份複製貼上的 `DOMContentLoaded` 寫法一併退場＝同一件事不再有兩套機制。
    - ✅ **棘輪換成守真不變量**（保留同一個 id `platform/selftest-registration-order`，不新增也不刪除，避免看起來像有鎖消失）：不再記載入位置債務名單，改為斷言**沒有任何模組能再寫出「拿不到 `HL.selftest` 就默默不註冊」的形狀**——容器側驗 `HL._selftestQ` 存在且**真的被清空**（`while` + `shift`，只讀不清空會被抓），模組側驗 15 支全具兩分支、且不得殘留 `DOMContentLoaded` 延後法，另有 `scanned >= 15` 的不空心閘。
    - **驗證**：node fast **164/164 全綠**（總數不變＝新增的 `core/selftest-queue` 是 `env:"browser"`、node 不跑，鎖 id 沿用）；**瀏覽器載入模擬器 87 → 104**（+16 復活 +1 新增），且「由 `DOMContentLoaded` 補回的項數」由 20 **降為 0**＝全部改在載入期同步完成。**負向擾動 8/8 全被抓**（含「鎖自身空心化」與「清算只讀不 shift」兩種自我攻擊），且**擾動前先確認乾淨樹全綠**（164/164、sim 104）＝落實 08:00 窗記下的「基線是髒的」教訓。⭐ 其中最有說服力的一例：**把清算整段刪掉，模擬器由 104 掉到 68＝正好少 36 項** ⇒ 佇列現在確實承載著卡上點名的那整組 36 個註冊，只是其中 20 個原本就有另一條路走。sw v174→v175。
    - ⚠️ **驗證誠實聲明**：排程輪起不了 dev server ⇒ 上述「瀏覽器端」全部來自 **vm + DOM shim 模擬**，**非真實瀏覽器**。shim 有一處已知落差（某個 `DOMContentLoaded` handler 因 shim 的 `querySelector` 回 null 而拋錯，已隔離不影響註冊統計）。⇒ **下一個可靠 preview 之輪請開 ⚙ →「🧪 自我檢測」確認面板總數為 104 且全綠**（此前為 87）。

> 🤖 **以下由自我進化引擎「平台軌」自動開卡**（2026-08-17 **14:00 窗** · 來源：`intel/db/platform-modules.json` **前端UI/UX** 分類審〔5 模組全審，該分類 `last_audited` 08-14＝全 8 分類最舊〕——本輪查出 #94 留下的 rtp 軸阻塞**已於 08-16 由 #98 解除**，缺口形狀由「被阻塞」變成「已解鎖未做」）。全自動模式下標 🟦已批准待做。

102. ✅完成（2026-08-17 平台軌·**20:00 窗**，**但卡上「只需加一筆 register」低估了一件會讓結論反過來的事**） **補上大廳分群軸剩下兩條（波動／RTP）——#94 的容器已在，缺的是內容** — S–M — 來源：**platform-modules「前端UI/UX / 大廳分群軸」2026-08-17 複審**：容器 `HL.gameAxes` 自 08-15 上線至今**仍只有 `pace` 一條軸**（執行期實測 registered 1／enabled 1、24/24 可玩遊戲有 pace 值），而 #94 卡上原本規劃的三條軸只上了一條。
    - **為什麼是現在**：08-15 記載「rtp 軸有一個**具體且已被查證的阻塞**——各遊戲 RTP 只以顯示字串存在、不可查詢」。該前置條件 **#98 `HL.gameRtp` 已於 08-16 落地** ⇒ **阻塞不再成立**。若不開這張卡，台帳會繼續高報一個已經解除的阻塞（正是 `ledger-card-sweep` 想抓的那種失真）。
    - ⚠️ **三項阻塞事實已先抄進本卡（依 SKILL 第 3 步，別讓實作輪重新發現一次）**：
      - (a) **`rtp` 的值必須向 `HL.gameRtp` 求值，不得寫進 `data/game-traits.js`** ——既有常駐反向鎖 `platform/game-axes-no-second-rtp` 會擋（它對 `rtp:` 物件字面量與 `put(id,"rtp",…)` 字串引數**兩種寫法**都有效）。這條鎖是 08-15 刻意設的：側表再抄一份 RTP＝第二份真相，且是「遊戲軌改了賠付表只會去改 `gameInfoBar`、不會想到來改大廳」的那一種。
      - (b) **`HL.gameRtp` 只覆蓋 7 款，而可玩遊戲有 24 款** ——且 `shadow-ritual` 是**刻意不登記**的（DEBT `S-slot-rtp` 實測 full RTP 1132%，登記它等於把已知為假的數字鑄成可查詢 API）。依 #94 既有規則「缺值不進軸」「非空桶 <2 則整條軸不渲染」，RTP 軸上線後**只會分到 7 款** ⇒ 實作前要先判斷這樣的軸對玩家是否還有意義，或先把覆蓋率補上去。
      - (c) **`volatility` 的權威在遊戲軌**（#94 定案：需蒙地卡羅或解析證明，平台軌無權代填；`pace` 才屬平台軌，因為它是互動結構、一行 grep 可複驗）⇒ 波動軸**跨軌**，本卡不得由平台軌自行填值，需遊戲軌提供逐款判定（其 `games-catalog.json` 的 gate_log 已有多款的實測波動特徵，但那是自由散文、`intel/` 不被前端服務——**取值路徑要另外談，別重蹈 #94 不變量 (d) 那條「鎖沒有錨點」的覆轍**）。
    - 範圍（純前端）：① 先做 **RTP 軸**（單軌、無跨軌依賴、值向 `HL.gameRtp` 求值）＝在 `data/game-traits.js` 加一筆 `register` 並讓桶的 predicate 去查 `HL.gameRtp`，`views/casino.js` **一行不改**（#94 已把這點寫成常駐鎖，正好順便再證一次）；② 波動軸待遊戲軌供值後再上。
    - **必寫成測項的不變量**：(a) 缺值遊戲不得進任何桶（既有規則，需對新軸再證一次）；(b) 加這條軸**不得改動 `views/casino.js`**（既有鎖已守，實作時應保持零 diff）；(c) 反向鎖 `platform/game-axes-no-second-rtp` 必須**維持綠燈**＝證明新軸沒有在側表裡偷存第二份 RTP。
    - ✅ **落地（2026-08-17 平台軌·20:00 窗）｜RTP 軸上線、`views/casino.js` 零 diff、側表零副本**
      - ⭐ **卡上的 (b) 是對的，但它把「只覆蓋 7 款」當成一個進度問題——實際上那 7 款剛好偏在會讓整條軸說謊的那一邊。** `HL.gameRtp` 當時登記的 7 款是 4 slot + chicken/cases/bounty；而**全站 RTP 最高的 10 款 originals 一款都不在**（dice/limbo/crash-x/mines/keno/towers/hilo/dice-duel/picks 99%、pump 98%）⇒ 照卡上字面「加一筆 register 讓桶去查 `HL.gameRtp`」直接上線，會長出一條**「💎 RTP 99%+」桶裡沒有任何一款真正 99% 遊戲**的軸（玩家篩最高 RTP 只看到 cases 98.5% 與 bounty 100%，看不到 Dice）＝**比沒有這條軸更糟**。⇒ 依卡上 (b) 授權的第二條路「**先把覆蓋率補上去**」處理：先補登記、再讓軸見光。**通則：卡上寫「容器就緒、只缺內容」時要多問一句——缺的內容是隨機缺的，還是剛好缺在會讓結論反過來的那一邊？覆蓋率不是進度條，它有方向性。**
      - **登記數 7 → 17（補 originals 家族 10 款）**，且**平台軌沒有代填任何一個數字**：#94 定案 `rtp` 屬遊戲軌權威，故本批每個值都是**從該遊戲自己的模組窮舉重算**而得——`instant-games.js`/`instant-crash-mines.js`/`instant-keno.js`/… 各自 `module.exports` 的 `edge`(或 `EDGE`/`RAKE`) 常數與機率/賠率純函式，逐款掃過**全參數空間**：dice ∀target(2–98)×∀方向（194 組）、limbo/crash-x ∀兌現點、mines ∀雷數×∀翻格（300 組）、keno ∀選號數、towers ∀難度×∀層（24 格）、hilo ∀牌面×∀方向（24 組·A/K 各有一鎖向不可下注故排除）、pump ∀難度×∀打氣數（81 組）、dice-duel/picks 模組自帶 `fairRTP()` ⇒ **min 與 max 皆恰等常數×100、零離散**。新常駐鎖 `platform/game-rtp-derived-from-module` **每輪重新算一次再比對**（不比對任何寫死數字）⇒ 遊戲軌哪天調了 edge 常數，紅的是鎖、不是玩家看到的數字。
      - **側表仍然一個 RTP 數字都沒有**：`data/game-traits.js` 新增**求值型欄位** `DERIVED.rtp`＝當下向 `HL.gameRtp.of(id)` 求，故「大廳能依 RTP 分群」與「RTP 只有一份」同時成立。鎖法＝**拔掉 `HL.gameRtp` 後必須全部缺值**（實跑驗證，若側表私藏副本就會有殘值）。既有反向鎖 `platform/game-axes-no-second-rtp` 維持綠燈（不變量 c 達成）。
      - **桶**：💎 RTP 99%+（9 款）／🟢 RTP 98–99%（2）／🔵 RTP 96–98%（5）＝**16 款落桶**。未覆蓋 8 款依容器「缺值不進軸」**不出現在任何桶**：桌遊 6 款（每注型 RTP 不同，`HL.edge` 對它們的值明載『頭條主注』/『近似中值』＝加權係數不是宣告 RTP）／`shadow-ritual`（已知為假 1132%）／**`plinko`（本輪查獲它沒有單一 RTP：9 種 rows×risk 實測 98.8164–99.1014% ⇒ 開卡 #103 交遊戲軌裁決）**。
      - **不變量 (a)/(b)/(c) 全數寫成測項**，另補三條卡上沒要求但擾動證明必要的：**桶必須窮盡所有登記值**（有值卻落不進任何桶＝在軸上**靜默消失**，而它與「缺值」外觀完全一樣）／**桶界不得重疊**／`casino.js` 逐字不得出現 `rtp`/`回報率`/桶界字樣。
      - ⚠️ **順手修掉一個既有鎖的盲區**：`platform/game-axes-title-i18n` 原本以 shim 載入時**沒注入 `HL.gameRtp`** ⇒ 在它眼中回報率軸「零非空桶」而整條不渲染、三個新標題**從未被檢查過**。負向擾動實證：把 EN 的一條標題整行刪掉，**本鎖照樣全綠**。已補注入並**釘死被檢查的軸集合＝`pace,rtp`**（少一條就紅）。**教訓：用 shim 載入的鎖，少注入一個依賴不會報錯，只會讓被檢查的集合默默變小。**
      - **i18n（P3 紀律續行）**：3 條結果牆標題 whole-key 各補 EN/zh-Hans；**桶標籤刻意寫成零中文**（`💎 RTP 99%+` 三語同形）⇒ 免掉三條鍵，也避開 P3 記載的「中文＋動態值串接永遠翻不到」陷阱。`回報率` 簡繁有差（報→报）＝非等值死鍵。
      - **驗證**：node **166/166 全綠**（新增 2 條常駐鎖、修 1 條盲鎖、改 2 條把「目前只有一條軸」當不變量的舊斷言）；**負向擾動 13 例全數被抓**（登記值高報/低報、偷登記 plinko、basis 造假、側表私藏副本、桶界裂縫、桶界重疊、缺值歸桶、i18n 缺鍵、未來登記 92% 遊戲落裂縫、多註冊一條軸沒補鎖…），擾動前後乾淨樹皆 166/166。首屏 1412→**1424KB／87 支**（+12KB，門檻 1600 ⇒ 餘裕 176KB）。sw v175→v176。

> 🤖 **以下由自我進化引擎「平台軌」自動開卡**（2026-08-17 **20:00 窗** · 來源：#102 實作當輪查獲的**跨軌阻塞**）。

103. ✅完成（2026-08-20 前景·船長裁定選項 (c)）**Plinko 沒有單一 RTP：9 種 rows×risk 實測 98.8164–99.1014%，而它的 `edge` 常數寫著 0.99** — S（遊戲軌·純數學裁決，不必動 UI） — 來源：**#102 回報率軸實作當輪查獲**（非外部平台、非台帳輪替）。⚠️ **本卡屬遊戲軌權威**（#94 定案 `rtp` 需蒙地卡羅或解析證明），平台軌只提出證據與選項、**不代填任何值**。
    - ↳ **(2026-08-20 前景·G7 同輪) 三個選項裡「唯一不需要裁決的那一半」已修完：`>99%` 的溢出是 bug、不是設計。** 根因不在取整本身，而在殘差吸收的**下限被寫成 `Math.max`**：`t[c] = Math.max(0.01, floor(want,2))` 在殘差吸不下時會把中央槽的值**墊高**——9 種設定裡**只有 16 排/高風險**撞到（需要 0.0048、被墊成 0.01）⇒ 殘差反向溢出、RTP 衝到 **99.1014%**，同時違反該區檔頭自己寫的不變量（「Σ p·m ≤ EDGE、floor＝莊家安全側、永不 >100%」）＝**程式沒有做到註解宣稱的事**，而且只有一種設定會露出來，所以錯了很久沒人看見。 修法：兩位小數優先、吸不下才降到千分位（`want >= 0.01 ? floor(want,2) : max(0.001, floor(want,3))`）＋收尾保險迴圈（排數集合擴充時仍把不變量拉回來）。 **爆破半徑經對照 HEAD 逐值確認：9 種設定裡只有 16 排/高風險改變，且只有中央槽一格 0.01→0.004**，其餘 8 種賠付表逐值不變。 新幅度 **98.8125%～98.9844%**（原 98.8125%～99.1014%）、離散 0.29pp→**0.17pp**、**超過宣告值的設定數 0**。常駐鎖 `games/plinko/rtp-never-above-declared`（值鎖＋形狀鎖：不准回到 `Math.max` 墊高的寫法），負向擾動實測會紅。 ⇒ **仍待遊戲軌裁決的只剩「怎麼宣告」**：(a) 進一步把 9 種收斂到單一 99.0000%（會再動玩家實得派彩，前景不代裁）／(b) 登記單值＋note 逐設定列出／(c) 正式承認參數化 RTP、不進單值登記表（比照桌遊六款「每注型 RTP 不同」的處置）。前景**不動 `HL.edge` 的 1.00**（同源、應與裁決一併對齊）。
    - ↳ **(2026-08-20 船長裁定：選 (c) 正式承認參數化 RTP)** 落地兩件事：**① 登記表加第二種形狀**——`HL.gameRtp.declareRange()` 有自己的儲存區與查詢出口（`rangeOf/isParameterized/rangeText/parameterizedIds`），**永遠不出現在單值 API**（`of()/list()/atLeast()`）⇒ RTP 軸不會被假數字污染，但站內從此問得到這款遊戲的回報率。plinko 以 9 筆逐設定值登記（98.8125%～98.9836%、basis analytic）。⭐ **不變量必須雙向**：第一版只讓 declareRange 拒絕已有單值的 id，實測「先 declareRange 再 declare」照樣打穿、而且會靜默混進 list()/atLeast() ⇒ 已補 declare 端的反向拒絕，鎖也一起守。**② 玩家端逐設定揭露**：遊戲內新增「本設定回報率 XX.XX%（N 排 · X風險）」一行，切排數/風險即時換數字（三語齊備，preview 逐語實測）；infoBar 文案由 `~1% 莊家優勢` 改為 `1% 莊家優勢（上界）` ＋「回報率隨排數與風險而不同」。常駐鎖 `platform/game-rtp-derived-from-module` 擴充為：必須有參數化登記、9 筆逐項與模組現算值相符（±0.0002pp）、無任一設定超過 99% 上界、declare 端拒絕、被拒後仍不得出現在單值 API。**#103 三個選項全部結案**。
    - **查獲過程**：#102 要把 originals 家族登記進 `HL.gameRtp` 時，逐款從遊戲自己的模組窮舉重算解析 RTP，**其餘 10 款皆恰等 `edge`×100、零離散**，唯 plinko 例外：`Plinko.buildTable(n, risk)` × `Plinko.comb` 算出的 Σp·mult 為 —— low `98.8594／98.8164／98.9439%`（8/12/16 排）、medium `98.9844／98.8589／98.8658%`、high `98.8125／98.8413／99.1014%` ⇒ **離散 0.285pp、且 high/16 排的 99.1014% 超過 edge 常數所宣稱的 99%**。成因是**賠付表倍數取整**（`buildTable` 產生的槽倍數為 2 位小數級），非設計意圖。
    - **這為什麼值得一張卡（而不是就地登記一個近似值）**：① 它是**玩家面向的宣稱**——`instant-games.js:267` 的 `gameInfoBar({ edge: "~1% 莊家優勢" })` 那個 `~` 是全站唯一帶波浪號的莊優宣稱，也就是說**這個不確定性早就被誠實標示了**，但沒有人回頭把它收斂；② 它擋住 plinko 進入 #102 的回報率軸（其餘 22 款可玩遊戲中已有 16 款進得去），**且 plinko 是 originals 五天王之一**＝大廳最熱門的一格分不到軸；③ 若隨手登記 99，會**高報 9 種設定中的 8 種**；登記均值 98.88 則是**發明一個沒有任何一種設定真正等於的數字**——兩種都正是 `platform/game-rtp-no-false-claim` 家族要防的形狀。
    - **三個選項（供遊戲軌裁決，平台軌不預設答案）**：(a) **校準賠付表**使 9 種設定皆收斂到 99.0000%（動 `buildTable` 的取整策略；**會改動玩家實得派彩**，須走保真閘）；(b) **維持現狀、登記為 `rtp: 98.8` + `basis:"analytic"` 並在 note 逐設定列出九個值**（誠實但仍是單值宣告，會讓軸把它排進 96–98 桶——**與玩家實際體感 99% 不符**）；(c) **承認它是「參數化 RTP」遊戲**、正式不進單值登記表，改為在保真規格與說明中心逐設定揭露（同桌遊六款「每注型 RTP 不同」的處置）。⇒ 平台軌傾向 **(a) 或 (c)**：(b) 是三者中唯一會**同時**產生誤導與不精確的。
    - **已就位的守衛（無論裁決結果為何都不必新建）**：`platform/game-rtp-derived-from-module` 內已含 plinko 反向鎖——**它同時擋兩個方向**：登記任何單值就紅（現行狀態）；而若哪天九種設定真的收斂到單值（離散 ≤0.05pp），**鎖也會紅並要求重新評估本卡**（避免「已經修好了卻沒人來關卡」）。
    - 註：`HL.edge` 表內 plinko 記 `1.00`（＝99%），與本卡同源；裁決後應一併對齊，否則 VIP/賽季加權與宣告 RTP 會各說一套。

104. ⬜待批准 **限量挑戰的伺服器名額仲裁（真站唯一缺的那一塊 · 容器已就位、只缺權威）** — M（含後端 SQL/RPC，故不標自動批准） — 來源：**#57 落地當輪查獲**（非外部平台、非台帳輪替）。
    - **問題敘述**：#57 的「先搶先贏」在假站以確定性 bot 模擬名額競逐，依 §4 鐵律真站必須關掉模擬 ⇒ 真站只剩玩家一人在搶＝**必贏**。這不只是「體驗打折」，方向是壞的那一邊：**同一條挑戰在真站的送幣成本高於假站**（§11 明令不得如此）。⇒ 現行處置是**真站不供應**限量挑戰（`specs()` 直接濾掉、面板據實說明），並留下 `HL.challenges.setArbiter(fn)` 容器。
    - **為什麼純前端做不到（不是偷懶）**：名額競逐的本質是**跨客端的互斥**——誰先搶到那一格必須由一個所有人都同意的權威裁決。localStorage 只知道自己這台裝置；兩個玩家同時達標，兩邊都會認為自己搶到。這與 §11 已列的 `bounty_mine` 信任客端同型，只是方向相反（那個是可印錢，這個是可超賣）。
    - **範圍（接續既有 phase6/7 形制，不新造輪子）**：① `limited_challenge_slots(challenge_id, day, mode, slot_no, uid, taken_at)` 表，`(challenge_id, day, mode, slot_no)` 唯一鍵；② `grab_challenge_slot(p_challenge, p_day, p_site)` RPC＝**單一 SQL 交易內**「查剩餘→佔位」，靠唯一鍵讓超賣成為資料庫層不可能（不是靠應用層檢查）；③ 回傳 `{taken, total, mine, takenBy[]}`——**刻意與 `HL.chalSlots.state()` 同形**，前端 `setArbiter` 直接轉接、`challenges.js` 一行不改；④ 沿 phase7 紀律帶 `p_site`、事件表標 `mode`，真/假站平行宇宙。
    - **驗收**：真站註冊仲裁者後 `specs()` 恢復供應（已有測項覆蓋此路徑）；併發測試（同一 `day` 併發 N 次 grab，N > slots）**佔位數恆等於 slots**；假站行為零改變（仍走本機確定性模擬，不打伺服器）。
    - ⚠️ **不建議的捷徑**：把名額仲裁交給客端「先寫先贏」再由伺服器事後對帳——那等於把可超賣改成可爭議，且獎金已經入袋（`HL.bonus.add` 走的是不可逆路徑）。要嘛有權威，要嘛據實不供應，**沒有中間態**。


105. ⬜待批准 **推薦歸因的伺服器見證者（referral attestor · 真站唯一缺的那一塊 · 容器已就位）** — M（含後端 SQL/RPC，故不標自動批准） — 來源：**#58 落地當輪查獲**（非外部平台、非台帳輪替）。
    - **問題敘述**：純前端**沒有任何跨裝置通道**——被邀請者的歸因寫在**他自己的 localStorage**，推薦人的裝置永遠不會知道。⇒ 真站的好友清單**結構上恆為空**（不是「還沒有人用」，是永遠不會有資料），推薦人側獎勵無從觸發；而被推薦人側若照發，就是「自己貼一個碼給自己就領錢」＝**無限印幣**（§11）。現行處置＝真站無見證者**據實不供應**獎勵、面板說明原因，但**歸因照記**（`HL.referral.setAttestor(fn)` 容器已備、形狀已定）。
    - **與 #104 的關係（刻意同形，不是巧合）**：#104 解「跨客端互斥」（誰先搶到名額），本卡解「跨客端關係」（誰把誰帶進來）。兩者都是「純前端只能有容器、權威必須在伺服器」的同一族，**建議一併排程**：同一批 SQL、同一套 `p_site` 紀律、同一種「回傳形狀與前端純函式同形 ⇒ 前端一行不改」的接法。
    - **範圍（接續既有 phase6/7 形制）**：① `referrals(referee_uid, referrer_code, mode, created_at)`，`(referee_uid, mode)` **唯一鍵**＝一人只能有一位推薦人、且在資料庫層不可覆寫（前端的「寫一次」到伺服器仍成立）；② `referral_payouts(uid, friend_uid, tier_idx, mode, paid_at)`，`(uid, friend_uid, tier_idx, mode)` **唯一鍵**＝分階冪等由唯一鍵保證，不是靠應用層比對（與前端 `paidUpTo` 單調整數同一個保證、兩層互為備援）；③ `referral_state(p_site)` RPC 回 `{ friends:[{id,name,joinedAt,wager}], eeWager }`——**刻意與 `HL.referral` 內部形狀同形**，`setAttestor` 直接轉接；④ 好友的 `wager` 一律由**伺服器權威值**（`member_econ`）給，不得採信客端上報。
    - **驗收**：真站註冊見證者後 `status().enabled` 轉 true、`friends()` 改由伺服器供給（已有測項覆蓋此路徑）；同一 `(uid, friend_uid, tier_idx)` 併發 N 次結算**入帳恰一次**；自我推薦（referee_uid 的碼等於自己的碼）在 RPC 層再擋一次；假站行為零改變（仍走本機確定性模擬、不打伺服器）。
    - ⚠️ **不建議的捷徑**：讓被推薦人的客端「代為回報」推薦人是誰再由伺服器發獎——那等於把印幣權交給任何一個玩家的瀏覽器（他可以聲稱自己帶進了 100 個人）。**要嘛有權威，要嘛據實不供應，沒有中間態**（同 #104 結語）。

106. ✅完成（2026-08-18 平台軌·**20:00 窗**，**卡上說「只要加兩筆 register」，但其中一個擁有者在結構上註冊不到**） **把 #57／#58 兩條新規則註冊進說明中心（headless 可落地 · 純出口不新增資料）** — S — 來源：**platform-modules「功能／支援與透明度中心」2026-08-18 複審**（本輪審該分類時查獲，記為該模組現唯一開放缺口）。
    - **問題（本輪機械實證）**：`HL.support.register(` 全站 **7 次呼叫、來自 6 個檔**＝「規則的擁有者自己註冊說明」的分散式形狀運作中；但**最近兩張留存卡都沒有註冊**——#57 限量挑戰（先搶先贏怎麼算、為什麼真站看不到）與 #58 推薦制（分階釋放、自我推薦擋下、真站為何不發獎）**在說明中心搜不到**。這正是 #72 卡自己寫下的病：「有內容沒出口」。
    - **範圍**：兩筆 `HL.support.register({ cat:'rules', … })`，body **一律當場從活值求值**（`HL.refCore.tiers()`／`HL.chalSlots`／`specs()`），**不得手抄任何數字**——#72 已記過 `ops-dashboard` 的 `STATIC_RISKS` 手抄「返水 0.1–0.3%」是前車之鑑。真站/假站說法要一致地依 `HL.site` 分支（真站要能答「為什麼這裡看不到限量挑戰／領不到推薦獎勵」）。
    - **為什麼值得單獨一張卡**：這是**純文字出口、零新資料、零視覺回歸**的改動＝少數**排程輪（無 preview）也能安全落地**的工作。近十二輪的建置輪都在抱怨沒有 headless-safe 候選，這張就是。
    - 注意：註冊即上架，**不改中心頁**（容器已在）；順手複查其餘近期落地卡（#94 分群軸／#102 回報率軸／#71 紅利壽命）是否也漏註冊，有則一併補（同一形狀、同一輪做完才不會又漏）。
    - ✅ **落地（2026-08-18 平台軌·20:00 窗）｜三筆條目上架、順手補回 #71 漏掉的兩語、並把載入序的坑根治**
      - ⭐ **卡上的「順手複查」那一句，查出來的不是「忘了註冊」，是「註冊不到」**：#94/#102 分群軸的擁有者是 `core/game-axes.js`，而它為了當 `views/casino.js` 的相依必須早載（index.html 第 54 行），**排在 `core/support.js`（第 59 行）之前** ⇒ 它的 `if (HL.support && HL.support.register)` 軟依賴守衛在載入當下**恆為 false**、整段靜默略過。這是 #66（reveal 測項）、#101（7 支模組 36 個測項）之後**同一個坑的第三次**，只是這次坑在說明表而不是測項表。
      - **修法選了「移動註冊表」而不是「加一條佇列」**：`support.js` 載入期只取 `HL.dom.el`（`HL.ui`／`HL.i18n` 都是開面板時才用）⇒ 上移到 `dom.js` 之後即可**早於任何可能的擁有者**。刻意不仿 `HL._selftestQ` 的佇列形狀：既有常駐鎖 `platform/support-owners` 已明訂守衛的**規範形狀**與「support.js 必須早於註冊者」，再長出第二種註冊寫法＝兩套慣例並存、下一個人會挑錯那套。⇒ 結構保證（永遠在最前面）勝過再加一層機制。
      - **三筆條目**（皆 `body: function`＝當場向擁有者求值，零手抄）：`rules/limited-challenge`（#57：名額在**達標當下**結算而非領獎當下、達標沒搶到會據實顯示「已被搶走」、真站無仲裁者時整條不供應並說明理由）／`bonus/referral`（#58：分階釋放而非註冊即發、門檻算成本加權後的成長進度、自我推薦當場被擋、**真站為何領不到獎**）／`rules/game-axes`（#94+#102：軸與桶由 `active()` 當場列舉、逐軸交代值的出處、明說「缺實證值的遊戲不進任何桶」）。
      - ⭐ **第二個發現＝我自己差點在容器裡種下第二份真相**：`rules/game-axes` 首版把「rtp 的值向單一真相求得／pace 依互動結構判定」寫成 `core/game-axes.js` 內的 `field → 說明` 對照表，**當場被既有反向鎖 `platform/game-axes-no-second-rtp`（「容器層不得認識 rtp 這個欄位」）擋下**——而那條鎖是對的：容器一認得某條軸的名字就不再是容器。⇒ 改為 `register()` 收一個選用的 **`source` 描述子**，出處寫在**軸自己的定義**（`data/game-traits.js`）裡；搜尋關鍵詞同理不列舉軸名（不必列也搜得到：`search()` 比對的是 title + **當場求值的 body**，body 本來就會印出當下每條軸的名字）。**新增一軸＝連出處一起加一行，容器永遠不必知道有哪些軸。**
      - **順手補掉一個既有的 P3 漏洞**：機械掃全庫 10 條說明條目標題的兩語覆蓋，查出 **#71「紅利有效期限」（08-17 落地）EN/zh-Hans 皆缺**——漏翻不會報錯，只會在切語言時靜靜露出中文，已補齊。並**把紀律機械化**為新常駐鎖 `platform/support-title-i18n`：每條說明條目的標題必須兩語齊備、`body` 必須是函式（字串 body 在結構上不可能讀活值＝只能手抄），樣本量下限 10。
      - **驗證（排程輪無 preview，走 §9 既定替代）**：node **176 → 177 全綠**（新增 1 條常駐鎖、`support-owners` 的擁有者樣本量下限 5 → 8）；**node vm + HL stub 跑瀏覽器路徑 15/15**（三筆條目在假站/真站兩態都註冊得到且 body 求值成功、四條搜尋詞命中、改 `refCore.tiers()` 後說明數字跟著變＝反手抄實證）；**負向擾動 6/6 全被抓**（刪 EN 一條標題／刪 zh-Hans 一條標題／body 改手抄字串／support.js 移回 game-axes 之後／拿掉軟依賴守衛／把出處寫回容器）。首屏 1484 → **1493KB／90 支**（門檻 1600／120，餘裕 107KB）。sw v178 → v179。
      - ⚠️ **據實記載的限制**：本輪**無 preview、無目視**——三條說明在真實面板裡的斷行/長度觀感、以及切 EN/zh-Hans 後標題是否真的換字，未經任何人眼或真實渲染引擎確認。搜尋「波動」目前**零命中**（波動軸尚未存在＝#102 已查證屬遊戲軌權威、跨軌未補），這是誠實而非缺陷，但玩家若真的搜這兩字會什麼都找不到。
107. ✅完成（2026-08-21 平台軌·14:00 窗，commit `0d9dc42` + `96b3216`） **促銷/活動的受眾述詞（同一批活動可以只給某一群人看）— 複用 #54 既有受眾詞彙，不另立第二套表** — S–M — 來源：**platform-modules「活動／促銷活動框架」2026-08-18 複審**（並**更正該欄連五輪的抑制理由**，見下）。
    - **問題（機械實證·連六輪同一個數字）**：`grep -c audience core/promo-cal.js` = **0**。#49 `HL.promoCal` 有完整的排程軸（window/recurring/always + 日曆/清單雙檢視、本輪外部註冊者已成長到 5 個），但**沒有任何「給誰看」的維度** ⇒ 所有促銷都是全站同時同內容，做不到「新手專屬」「VIP 5 起」「回訪者限定」，也做不到 A/B。
    - ⭐ **這張卡遲到了約五輪，原因是台帳自己的一句話**：該模組 evidence 自 08-14 起寫「已開卡 #71，本輪不重複開卡」——但 **#71 是「紅利到期軸」**（治 Roobet Vault 那條「未領即作廢」的壽命缺口），**與受眾分群無關**，且已於 08-17 完成 ✅。⇒ 受眾缺口既沒有卡、又因為這句話而每輪被抑制。**`ledger-card-sweep` 對這一類完全免疫**：它查的是「引用的卡已完成但 status 沒回填」，而本例的卡確實完成、status 也確實該維持 partial——錯的是**卡與缺口不對應**，那需要語意判斷。⇒ **開卡時寫下「已開卡 #N」必須連「#N 治的是哪一句缺口」一起寫**，否則它就成了下一輪的抑制器。
    - **範圍（純前端 · 容器先於內容 · 明文禁止第二套受眾表）**：① `promoCal.register()` 收一個**選用** `audience` 描述子，形狀**必須逐位沿用 #54 `HL.release`** 的 `{ kind, arg }`，述詞一律向 `HL.release.AUDIENCES[kind].test(ctx, arg)` 求 ⇒ **加一種受眾＝在 release.js 的 AUDIENCES 加一筆，兩處同時受益**；② 未宣告 `audience` 者行為**逐位不變**（零回歸靠「欄位不存在」，不靠比對）；③ 日曆/清單兩處只顯示「當下這位玩家符合」的活動，且**不合格者不是灰掉而是不出現**（灰掉等於預告一個拿不到的獎）；④ 面板需顯示受眾標籤（`AUDIENCES[k].label`，#54 已有）讓玩家知道「這是給哪一群人的」。
    - **第二批消費端（刻意寫進本卡，避免長成雙胞胎）**：`core/redeem.js` 的 `CODES` 只有 `{amount, exp}` 兩欄＝**兌換碼缺領取資格述詞**（08-10 首記，08-14/08-16/08-18 連四輪複核未變，依 #82 先例本該獨立升格為卡）。它問的是同一個問題「誰有資格拿到這個」⇒ **併入本卡當第二個消費端**，不另開卡（SKILL 第 3 步警示的「同來源出口形狀、卡名不同」＝#95/#72 前例）。
    - ⚠️ **先抄進卡的阻塞事實**：(a) `HL.release` 的受眾 ctx 由 `audienceCtx()` 組出 `{ vipLevel, seasonTier, inGuild }`（release.js:149）——**促銷要用的維度可能更多**（是否新手、近 30 天是否活躍、是否已 opt-in），缺的維度要加在 `audienceCtx()` 而**不是**在 promo-cal 自己組第二份 ctx；(b) `HL.release` 的 `audience` 語意是「**early 期**只給符合者、`open` 後全站開放」，促銷的語意是「**整段窗口**都只給符合者」⇒ 述詞可以共用，**階段語意不可照抄**，本卡必須自己定義何時求值；(c) 真站/假站差異：受眾若含「假站模擬出來的活躍度」，真站會恆為 false ⇒ 需依 `HL.site` 分支並在面板據實說明（同 #57/#58 的處置）。
    - **🔓 2026-08-19 平台軌（#59 落地後回填）：本卡阻塞事實 (a) 列的三個缺失維度，其中「**近 30 天是否活躍**」已就位**——`HL.activity.status()` 回 `{ last30, index, tier, active }`，另有 `HL.activity.wageredSince(days)` 可問任意窗長（環形桶保留 90 天）。⇒ 本卡的 `audienceCtx()` 要加這個維度是**加一行取值**，不必再自己刻時間窗。**連帶：第二批消費端（`redeem` 兌換碼資格）所對標的 Stake Bonus Drops「過去 7 天押注達標」現在真的算得出來**——且務必用 `wageredSince()`（真實金額尺）而非 `xpSince()`（edge 加權尺），兩者刻意分開存，混用會讓資格門檻在高 edge 遊戲上被悄悄放寬。
    - **擴充性槓桿**：受眾述詞一旦成為平台級詞彙，#49 促銷、#54 上架排程、`redeem` 兌換碼、未來的任務/挑戰投放都吃同一份定義 ⇒ 這是「加一筆定義、四個表面同時受益」的容器型改動，符合本軌「容器先於內容」。
    - **✅ 落地（2026-08-21 平台軌 14:00 窗）**：`AUDIENCES` 4→**7 種**（新增 `newcomer`／`active`／`wagered7`）；新增純述詞求值 **`matches(audience, ctx)`（無階段語意）**，`eligibleAt` 改為疊在它之上 ⇒ **卡上點名的阻塞事實 (b)「述詞共用、階段語意各自定義」以「同源」的形式落實**（測項逐組比對 `eligibleAt === matches`，分叉即紅）。三種階段語意各自成立：#54＝只在搶先期問／#49＝整段窗口問／#19＝領取當下問。
      - **阻塞事實 (a) 的處置**：三個新維度全部**向既有單一真相求值**，不新刻狀態——帳齡→ `HL.rakeboost.newcomerTs()`（#52 已有的惰性播種時間戳，本輪只是把它 export 出來；語意刻意只回時間戳、不回「是不是新手」，窗口長度屬各消費端政策）；活躍/押注→ `HL.activity.status().active` 與 `wageredSince(7)`（**用真實金額尺，不用 `xpSince` 的 edge 加權尺**，照 #59 卡上的警告）。`audienceCtx()` 成為唯一 ctx 產生器，消費端不得自組第二份（有鎖）。
      - **阻塞事實 (c) 的處置**：三個新維度**都由真實押注/真實帳齡供給，真站假站皆可算** ⇒ 本卡不需要 `HL.site` 分支，也**不需要面板說明「真站恆為 false」**（與 #57/#58 不同——那兩張的維度來自模擬對手/跨裝置通道，本卡沒有這道牆）。
      - **消費端二：兌換碼**。`CODES` 收選用 `audience`，新增 `reason: "ineligible"` 並在訊息裡說清楚誰才領得到；資格判定**排在「已領取」之前**（不符資格的人明天可能就符合，重試合理；已領取的人重試永遠沒用）。既有五組碼不加 audience＝行為逐位不變。新增兩組資格碼 `FIRSTWEEK`(200·新手 7 天)／`GRIND500`(150·近 7 天押注 500)，**刻意小額**——本卡要證明的是資格閘存在，不是加碼送幣（§11 方向）。
      - **順手修掉一個既有 P3 缺口**：redeem 的五種錯誤訊息原本是 `"⚠️ " + 片語` 同一個文字節點 ⇒ 依 P3 契約**一句都翻不到**（字典裡有 `"兌換碼無效。"`，但節點是 `"⚠️ 兌換碼無效。"`）。改成兩個節點後五句同時可翻。
      - **真實宣告者三處（容器不得是孤兒）**：`onboarding`（新手期 7 天；**順帶把全站最短的 6 小時啟用窗口接進 #49 日曆**——#49 的立卡理由就是「各活動各有窗口卻彼此不知道」，而它一直只有右下角一顆藥丸）、`activity`（光環亮著才看得到）、`redeem` 兩組碼。promoCal 外部註冊者 5→**7**。
    - **驗證（排程輪 headless·`preview_start` 在無人值守 session 被拒，走 §9 既定替代）**：node **225 → 230 全綠**（新增 4 條常駐鎖：`platform/audience-single-vocabulary`／`audience-promo-hidden-not-greyed`／`audience-consumers-not-orphan`／`audience-gate-actually-filters` + `release/audience-vocabulary`）。**負向擾動 21/21 全被抓**（17 條主測 + 4 條專打新鎖④）。
      - ⭐ **第 4 條鎖是本輪最重要的一件事**：前三條都是**源碼級**的（誰呼叫誰、誰不准有第二張表），它們證明不了「不符合的活動真的不會出現在 `list()` 裡」。第 4 條用最小 DOM shim 把 `promo-cal/redeem/release` 三個真檔載進 node **實跑**。專項擾動證實它抓得到三種源碼級鎖**全綠**的破法：受眾標籤漏掉單位、redeem 資格閘被短路成恆真、`list()` 不再帶出 `audienceLabel`。該鎖**刻意不 skip**（載不起來就 FAIL 並印原因）——skip 會讓「shim 過時」與「閘壞掉」在輸出上同形。
    - ⚠️ **據實記載的限制**：**無 preview、無目視**——受眾標 chip 的實際觀感（圓角框在窄螢幕會不會與 `已加入` 標擠在一起）、以及兌換碼錯誤訊息新增的第二個節點在 `.ax-redeem__msg` 下的換行行為，皆為 **UNVERIFIED（headless）**。下一個可靠 preview 輪請開活動日曆目視三則受眾標 + 兌換碼輸入 `FIRSTWEEK` 看錯誤訊息版面。

114. ✅完成（2026-08-21 平台軌·20:00 窗，commit `5ea694b`＋`6ce4545`） **成就牆的外部註冊出口全 repo 零呼叫——19 枚成就全是它自己的種子** — S — 來源：**platform-modules「功能／成就徽章牆」2026-08-21 複審**（機械量測，非印象）。
    - **問題（node 一行，附對照組證明尺會動）**：`HL.achievements.register(` 在全 `src/` 的**非註解命中數＝0**（種子 19 枚走的是檔內區域變數 `register`，不是公開出口）。同型容器對照：`HL.games.register` **19** 個外部註冊者、`HL.econCfg.register` **14**、`HL.support.register` **10**、`HL.promoCal.register` **7**（本輪 +2）⇒ **這把尺會動，achievements 是真的零**。
    - **為什麼這是缺口而不只是統計**：#45 落地（07-23）以來新增的平台功能 **#57 限量挑戰／#59 活躍光環／#63 服務水準／#71 紅利壽命／#96 自我排除／#106／#107／#109** 沒有任何一個掛上成就。成就牆宣稱的擴充性是「加一筆 register 即上牆」，但**一個月零實例**＝與 `HL.reports` 08-20 被抓到的「容器是孤兒」同型（那次的教訓是：grep 命中兩處、兩處都在註解裡）。
    - **範圍（S · 不改成就引擎，只補註冊者 + 立非孤兒鎖）**：挑 3–4 個既有功能各掛一枚成就（建議：首次加入限量挑戰／光環達到最高段／首次設定自我排除或限額〔**這枚 reward 必須為 0**，付錢請人設限額是反向誘因〕／首次匯出報表），並比照 `platform/reports-not-orphan` 立一條「`HL.achievements.register` 外部註冊者 ≥ N」的常駐鎖。
    - ⚠️ **先抄進卡的阻塞事實（讀 achievements.js 才寫的）**：
      ① **`stats()` 是固定 8 欄詞彙**（`bets/wagered/wins/bestWin/bestMult/variety/vipRank/streak`），`meets()` 的 `stat`+`goal` 型只認得這 8 個。新維度要嘛加進 `stats()`，要嘛走 `test(st)` 閉包直接讀 `HL.xxx`（可行，因為 spec 在註冊檔裡）。
      ② **但 `test` 型沒有進度條**——`progressOf()` 對 `test` 型只回 0 或 1（原始碼明寫）。⇒ 想要進度條的成就必須讓 `stats()` 吐得出那個維度，或先讓 spec 支援選用的 `progress()`。**這一條決定了本卡是 S 還是 M**：只做 0/1 型是 S，要進度條就得先動引擎。
      ③ **`reward` 是真的送幣**（走 `HL.bonus.add`）⇒ 新成就會增加送幣成本，真站需照 §11 收斂。建議新掛的成就 `pts` 給滿、`reward` 給 0 或極小，讓「成就＝榮譽 + 少量」而不是第 N 條送幣管道。
      ④ `register()` 對重複 id **靜默忽略**（`if (byId[spec.id]) return`）⇒ 新成就 id 撞到既有 19 枚之一時不會報錯、只會什麼都沒發生。
    - **✅ 落地（2026-08-21 平台軌 20:00 窗）**：4 個既有功能各掛一枚，新分類「平台里程碑」，**一律 `reward: 0`**（榮譽＋成就點數；§11 真站送幣成本正在收斂，不新增第 N 條送幣管道）：
      `challenges.js` **先搶先贏**（在限量挑戰中搶到名額，silver/15pts）／`activity.js` **常駐玩家**（活躍光環達到最高段，gold/30pts）／
      `responsible.js` **為自己畫線**（首次設定任一遊玩限額，bronze/10pts）／`reports.js` **留下紀錄**（首次匯出任一報表，bronze/10pts）。
      `core/achievements.js` **一 byte 未改** ⇒ 卡上「不改成就引擎、只補註冊者」是字面成立的。i18n EN/zh-Hans 同步（badgeCard 是整節點 text ⇒ 翻得到）。sw v201→v202。
    - **四條阻塞事實逐條被遵守，不是繞過**：①四個維度都不在 `stats()` 的 8 欄裡、**也不該塞進去**（那會讓成就引擎知道限量挑戰／光環／限額／報表的存在）⇒ 一律 `test` 閉包、真相留在擁有該維度的檔；
      ②`test` 型沒有進度條（0/1）＝卡上判定「要進度條就是 M」，本卡刻意停在 S；③`reward: 0`；④已逐一比對 19 枚種子 id 無碰撞（並把「重複 id 靜默忽略且先註冊的贏」寫成可執行的測項）。
    - ⭐ **落地時最該記下的一件事＝「要不要補 sync」的答案藏在 live-stats.js 的行序裡，而那是隱形依賴**：`HL.activity.record` 與 `HL.challenges.record` 在 `live-stats.js` 中**都排在 `HL.achievements.record` 之前**
      ⇒ 跨過段位／搶到名額的**那一注當場解鎖**，兩檔的 `record()` 一字未改（本卡對它們是純新增）。而設限額與匯出報表**不經中央結算點**，各自在存檔之後呼一次 `HL.achievements.sync()`（形制沿用 `rewards.js` 簽到後那一行）。
      **兩者都必須排在 save/lsSet 之後**——成就的 `test` 走 `load()`／`lsGet` 讀存檔，先 sync 會讀到舊值＝**與沒接線完全同形**。
      ⚠️ 那個行序是**沒有任何宣告的契約**：排反了徽章會晚一注才解鎖，而「搶到名額當下沒有徽章」與「徽章壞了」在玩家眼裡一模一樣 ⇒ 已把它寫成測項斷言（見鎖①）。
    - ⭐ **第二件事＝`meets()` 的 try/catch 讓「讀錯欄位」變成一種完全靜默的失效**（`if (typeof spec.test === "function") { try { return !!spec.test(st); } catch (e) { return false; } }`）：
      任何 `test` 裡打錯一個欄位名，那枚徽章就**永遠鎖著、零錯誤訊息、牆上看起來完全正常**——正是 CLAUDE.md 那條「修一半而看不出來」的形狀。
      ⇒ 四枚的判定式**刻意都向擁有該維度的檔自己的既有出口求值**（`tierIndexFor`／`load().grab`／`effective(o.limits[...])`／`lsGet(XKEY)`），
      這樣欄位漂移會**同時弄壞面板或閘**，不會只有徽章靜默失效。並把「拋錯的 test 維持鎖著且不中斷同批其他成就」寫成測項（鎖②，擾動 M9 實證）。
    - **驗證**：node **231 → 234 全綠**（新增 3 條常駐鎖）；**負向擾動 13/13 全被抓**（拿掉 challenges 註冊區塊／拿掉 reports 註冊區塊／把 achievements.record 搬到 activity.record 之前／拿掉 responsible 的 sync／
      reward 偷偷改 500／最高段寫死 3／光環自己比門檻數字／報表徽章改 stat-goal 假裝有進度條／引擎 test 型一律回 false／引擎重複 id 不再忽略／引擎 reward 0 也送幣／引擎 sync 變 no-op／自我排除被接進責任博弈徽章）。
      每則先斷言 `mutated !== orig`（no-op 即報警）——16:00 遊戲軌剛記過「沒擾動與沒抓到同形」，本輪 harness 第一版的 M5 錨點也真的踩到了（`TIERS.length - 1` 誤命中 `CORE.TIERS[CORE.TIERS.length - 1]` 造成語法錯 ⇒ 輸出 `fail=-1` 而非「沒被抓到」，改用完整 test 行當錨點後被抓）。
    - **一個刻意的產品決定（卡上把兩者並列為候選，此處據實收斂）**：責任博弈那枚**只認「設定限額」，不認自我排除／冷靜期**。設限額是健康的自我掌控、值得給個肯定；
      自我排除是危機動作，把它做成可收集的徽章是不恰當的獎勵訊號。鎖③把這個**方向**鎖住（區塊內出現 `excluded/pauseKind/applyPause/setPause` 即轉紅，擾動 M7 實證），逼未來想接的人重新想一次。
    - ⚠️ **據實記載的限制**：**無 preview、無目視**——新分類「平台里程碑」在徽章牆網格裡的分組位置（它排在既有 6 組之後，`cat` 首次出現順序決定）、以及 4 枚 `is-locked` 徽章的 `HL.ui.progress(0)` 進度條在窄螢幕的觀感，皆為 **UNVERIFIED（headless）**。
      下一個可靠 preview 輪請開 🏅 成就徽章牆滾到最下面目視新分類，並確認「已解鎖徽章 N / 23」的分母由 19 變 23。

> 🤖 **以下由自我進化引擎「平台軌」自動開卡**（2026-08-21 **20:00 窗** · 來源：`intel/db/platform-modules.json` **擴充性** 分類全審〔5 模組，該分類 `last_audited` 最新值 08-19＝全 8 分類最舊〕本輪的**註冊表家族全庫量測** + **Jackpotter 招牌差異點複查**〔本輪新平台取材發現 08-06 首次深挖漏了它〕）。全自動模式下標 🟦已批准待做。

115. ✅完成（2026-08-22 平台軌·08:00 窗，commit `4c1a39e`+`2bacc91`） **報表中心的註冊出口也是 0 外部呼叫——而既有那條「非孤兒」鎖綠著卻證明不了這件事** — S — 來源：**擴充性分類審的註冊表家族全庫量測**（node 實測，非印象）。
    - **問題**：本輪把 #114 那把尺套到整個家族，`HL.reports.register` 的**外部呼叫檔數＝0**——6+ 張報表全部在 `core/reports.js` 內定義。
      對照組（同一把尺、同一次執行）：`HL.games.register` **21**／`HL.econCfg.register` **14**／`HL.support.register` **10**／`HL.promoCal.register` **7**／`HL.achievements.register` **4（#114 本輪由 0 補上）** ⇒ 尺會動，reports 是真的 0。
    - ⭐ **為什麼這條先前查不出來——這是本卡最有價值的部分**：`platform/reports-not-orphan`（#109 立的鎖）數的是 `HL.reports.(open|download|register|defineEvent)` **任一**的消費端，
      實測命中 `betlog.js` 與 `demo-tools.js`——但那兩個用的是 **`download`／`open`，是消費端、不是註冊者**。
      ⇒ **一條綠著的「容器不是孤兒」鎖，可以完全不涵蓋「註冊出口有沒有人用」**。這與 CLAUDE.md「修一半而看不出來」家族的④（同一件事有兩套真相）不同，是新的一種：**鎖的定義比它的名字寬**，寬到把要證明的那件事漏在外面。
    - **範圍（S · 比照 #114：不改 reports 引擎，只補外部註冊者 + 把鎖收窄）**：挑 2–3 個「有內容沒出口」的既有資料從別的檔註冊成報表（候選：`HL.ledger` 的逐日現金流／`HL.betlog` 之外的 `HL.arena` 對戰戰績〔#113 家族〕／`HL.achievements` 解鎖時序），
      並把 `platform/reports-not-orphan` **拆成兩條**：一條數消費端（現行語意，保留）、一條**只數 `register`／`defineEvent` 的外部呼叫者**。
    - ⚠️ **先抄進卡的阻塞事實（讀 reports.js 才寫的）**：① `R.register` 需要 `cols`／`rows(f)`／`avail()` 三件，且 `cols` 在**載入期**求值（`(HL.betlog && HL.betlog.COLS) || []`）⇒ **註冊者必須排在資料模組之後**，排錯會靜默註冊出一張零欄位的報表（`platform/reports-load-order` 只盯 betlog 那一對）。
      ② `aud` 只有 `player`／`ops` 兩值且**是唯一的閘**（`cat` 不參與授權）⇒ 新報表選錯 `aud` 會把營運資料送到玩家面前。③ `reports.js` 是 node 可 require 的雙模式檔（`isNode` 早退），**新註冊者不要寫進純函式區**。

    - ✅ **落地（比照 #114：`core/reports.js` 一 byte 未改，只補外部註冊者 + 把鎖收窄）**：`HL.reports.register` 的非註解外部呼叫檔數 **0 → 3**——
      ① `core/release.js` → **`release-schedule`（aud `ops`）** 上架排程與受眾閘（`all()`×`stateOf()` 當下求值；先前只看得到卡片上那枚角標）；
      ② `core/responsible.js` → **`rg-limits`（aud `player`）** 我的自律設定與用量（逐型別的生效上限／本期已用／剩餘／**待生效變更**；先前只活在 `HL.rg.open()` 面板裡＝看得到、帶不走）；
      ③ `views/arena.js` → **`arena-battles`（aud `player`）** Slots Battle 逐場戰績（先前只在 `historyModal()` 裡，重整即清空）。
    - ⭐ **實作當下才浮出來的一件事：這張報表是「對戰排名」的第五個表面**。08-21 那個顯示 BUG 的根因正是四個表面各自硬寫「總分越高越好」；
      報表若自己算一份，crazy（最低總分勝）與 terminal（比最後一輪增量）兩模式的 CSV 就會與同一列的「勝負」欄互相矛盾，
      而且**匯出檔比畫面更難被發現說謊**（沒有旁邊那個「勝/敗」立刻對照）。⇒ 排名量走 `metricOf`、欄名走 `displayMetricLabel`、
      模式與勝負條件走 `labelOf`／`winCondOf`，並立成第三條鎖。實測 terminal 那一列顯示「$750（本輪增量）」而非總分 1050。
    - **三條常駐鎖（node 237 → 240 全綠．負向擾動 7/7）**：
      ① `platform/reports-register-has-external-callers`——**只數 `register`／`defineEvent`**（原 `platform/reports-not-orphan` 數的是 `open|download|register|defineEvent` 任一，語意保留不動、兩條並存）。
      內建**反向錨**：必須存在「只消費不註冊」的檔（實測 `betlog.js`／`demo-tools.js`），否則兩條鎖退化成同一把尺＝本卡要修的病靜默復發（擾動 M5 實證會紅）；
      另含**逐筆靜態驗屍**：每個 `register({` 呼叫點都要有 `aud`（值須在 `player|ops`）／`cols`／`rows()`——`register()` 對缺件是**回 null 而不拋錯**，少寫一個 `aud` 的後果是「那張報表從來沒存在過」而畫面完全正常（擾動 M7 實證會紅）。
      ② `platform/reports-registrars-load-order`——每個註冊者都必須靜態掛載且**晚於 `reports.js`**（排前面時 `if (HL.reports && ...)` 直接短路＝報表靜默消失），且**不得列在 `lazy-views` 清單**（把註冊過東西的檔搬離首屏，那筆註冊會跟著消失且不報錯＝#114 收尾記下的那條）。
      ③ `platform/reports-battle-metric-single-truth`——戰績報表的排名量／欄名／勝負條件四個出口一律向 `HL.battleMode` 求，含反向錨（battleMode 必須真的提供那四支，否則上面全是在對不存在的 API 打勾）。
    - **執行期驗證（preview 在排程輪不可用 ⇒ 這是能做到的最強驗證，非靜態 grep）**：把三個檔裡**真正那段註冊程式碼原文**抽出來餵給 `reports.js` 的真 `makeRegistry()` 執行，
      **24 項全過**——三筆全被收下（沒有靜默回 null）／受眾閘實測擋住（玩家視角看不到 `release-schedule`、連 CSV 表頭都拿不到）／三張報表的列與 CSV 行數對得上、每一格 `cell()` 都回字串／
      crazy 列排名量 200 而 terminal 列 750（1050−300）／`rg-limits` 的「500 − 已用 120 ⇒ 剩餘 380」「未設限顯示 —」「待生效 90 分鐘 @ 時間」皆正確。
    - ⚠️ **UNVERIFIED（headless·無 preview）**：三張報表在報表中心頁的**分群位置與版面**（`cat` 分別為 `ops`／`account`／`play`，其中 `account` 是本站首次出現的分群）、
      `arena-battles` 11 欄在窄螢幕的橫向捲動觀感。**下一個可靠 preview 輪**：⚙ DEMO →「📊 報表中心（營運）」應多出「🗓️ 上架排程與受眾閘」；
      注單頁「📊 報表中心」應多出「🛡️ 我的自律設定與用量」與「⚔ Slots Battle 逐場戰績」（後者需先打過一場才 `avail`），各按一次「匯出這張報表」確認 CSV 真的下載。
116. 🟦已批准待做 **社群共決：玩家能不能對平台本身投票（容器先行 · `HL.poll` 提案註冊表）** — M — 來源：**Jackpotter 2026-08-21 複查**（`platforms/jackpotter.md`）＋ 本輪新增台帳模組 `功能／社群共決／玩家投票`（absent）。
    - **對手形制**：Jackpotter 把 **community-powered** 當招牌差異點——玩家投票決定 ① 接下來優先開發哪款遊戲 ② 要加哪些功能 ③ 紅利怎麼設計 ④ 路線圖優先序（官方首頁 + MEXC News／BlockchainReporter 專文 + AskGamblers／WorldPokerDeals，四源一致）。
    - ⭐ **這張卡的來歷本身就是本輪最重要的發現**：這個表面在本庫缺席了 **36 份 dossier**，而缺席的原因是機械的——`db/sourcing-methods.md` 的維度清單（流水／名氣／營收／玩法機制／玩家保護）**沒有任何一條會問「玩家能不能參與決策」**。
      最刺的證據是：`platforms/jackpotter.md` 08-06 那一輪查得很認真（抓出 13 階 Mystery Box、法師系 VIP、wager-free 條款軸，並據此開出 #74），卻**一字未提該站首頁講的第一句話**。
      ⇒ 與 08-16 補「玩家保護」時記下的「35 份 dossier 命中 0」**逐字同構**的第四種取材漏法實例。**已把「社群治理／共決」補成 sourcing 第 6 條常規維度**，並明訂往後每份 dossier 必須明文回答這一項（沒有就寫「無」）。
    - **範圍（容器先於內容）**：`HL.poll` 提案註冊表——一則提案＝一筆 spec（`id`／題目／選項／窗口／受眾／票權尺）。**明文禁止新造第二套排程或第二套受眾**：窗口吃 #49 `HL.promoCal` 的排程軸、受眾吃 #107 已升格的受眾述詞。
      第一批註冊者建議 2–3 則真提案（例：「下一款遊戲做哪種品類」／「返水想要更頻繁還是更大筆」），沒有進行中的提案時入口自然收起（退化為現行行為、零影響）。
    - ⚠️ **真站必須先閘掉假票**：假站可有模擬投票人數，真站在沒有伺服器計票前**只能顯示自己的票**——比照 #57 限量挑戰真站無仲裁者時據實不提供，**不以單機模擬冒充多人結果**（§4 的假活動閘：新增產生器要加 `if (HL.site && HL.site.isLive()) return;`）。
    - ⚠️ **未查證、不要照抄的部分**：票權怎麼計（人頭／持幣／VIP 段位／流水）、投票是否有約束力、歷史結果是否公開存檔、提案由誰發起——四項皆未取得權威來源，dossier 已據實留白。**票權尺請當成本卡要自己決定的設計，不是抄來的**。
    - **擴充性槓桿**：做完之後「要讓玩家對第 N 件事投票」＝加一筆 spec。與 `HL.reports`／`HL.support`／`HL.achievements` 同屬註冊表家族 ⇒ 落地時**一併按 #115 的教訓立一條「只數 register 外部呼叫者」的鎖**，別再長出第三個孤兒容器。

> 🤖 **以下由自我進化引擎「平台軌」自動開卡**（2026-08-22 **08:00 窗** · 來源：`intel/db/platform-modules.json` **資安** 分類全審〔5 模組〕＋ **#115 實作當下的機械查證**——不是抽象缺口，是一行程式碼與一個硬寫值域）。全自動模式下標 🟦已批准待做。

117. ✅完成（2026-08-22 平台軌·20:00 窗，commit `5fd28b7`＋`c768819`） **營運身分的述詞註冊表 `HL.rbac`（容器先行 · 權威仍在伺服器）——今天新增第三種營運身分要改的是值域與測項，不是加一筆註冊** — M — 來源：**資安分類審 × #115 實作查證**（node 實測，非印象）。
    - **問題（把抽象缺口換成兩個可指的坐標）**：本模組自 08-05 起連五輪記為 partial，理由一直是「無完整角色分級/稽核」——**抽象到無從動手**。本輪查到具體形狀：
      ① 全站唯一產生「營運視角」授權上下文的**產品程式碼只有一行**：`core/demo-tools.js:69` 的 `HL.reports.open({ ops: true })` ⇒ **前端的「你是營運」＝「你打開了 ⚙ DEMO 面板」**，背後沒有任何身分；
      ② 受眾值域是 `core/reports.js:49` 硬寫的 `AUDS = ["player", "ops"]`，且常駐測項 `reports/aud-must-be-explicit` 有一條 `t.equal(AUDS.join(","), "player,ops")` **把它釘成恰好兩值**。
      ⇒ 要新增第三種營運身分（客服／風控／行銷）＝**改值域 + 改那條測項**，而不是加一筆註冊。這與 `HL.games`／`HL.support`／`HL.promoCal`／`HL.reports` 一路建立的「加一筆 spec」形制**背道而馳**。
    - **範圍（容器先於內容 · 一筆角色＝一筆 spec）**：`HL.rbac.register({ id, label, icon, grants: [...], avail() })` —— `grants` 是**受眾述詞的集合**（例：`ops-finance` 授 `["ops.ledger", "ops.release"]`），
      `HL.rbac.can(grant, ctx)` 為唯一謂詞。`reports.js` 的 `visible()` 改為向它求（`aud` 由「兩個硬寫值」升為「一個 grant 字串」），**`cat` 仍不參與授權**（`reports/cat-is-not-permission` 那條鎖不得放寬）。
      第一批註冊者＝現況的兩種身分（`player` 與 `ops`），**行為必須逐位不變＝零回歸**（比照 #54 release 的相容性契約：沒宣告角色的呼叫端走原路徑）。
    - ⚠️ **先抄進卡的阻塞事實（讀 reports.js／demo-tools.js／checks-platform.js 才寫的，別讓實作輪重新發現一次）**：
      ① `reports.js` 的 `visible(def, ctx)` 是**唯一的閘**且同時管顯示與匯出（`download()` 自己再驗一次）⇒ 換謂詞要**兩處一起換**，只換顯示端等於沒換（CSV 才是資料本體）。
      ② 測項 `reports/aud-must-be-explicit` 明寫 `AUDS.join(",") === "player,ops"`，**這張卡一定會讓它變紅**——依 §10.1 紀律必須改成「守新形狀下的同一組不變量」（受眾必須明寫、不給預設值、寫錯值拒絕註冊），**不得放寬成不檢查**。
      ③ **前端零權威，這張卡不得假裝解決那件事**：伺服器權威目前只覆蓋 `ops_summary` 一支 RPC（回 `{error:'forbidden'}`），其餘 ops 報表（`ops-by-game`／`event-schemas`／`release-schedule`）全由本機資料就地產生。
      ⇒ 註冊表只決定「**提供什麼**」，不決定「**准不准**」；台帳 08-05 記下的「權威在伺服器＝設計本身正確」**不得被這張卡推翻**，面板須據實說明（比照 #57／#105 無見證者時的據實不供應）。
      ④ 真站/假站正交：角色是身分軸，`HL.site` 是站別軸，**不得互相冒充**（真站沒有角色伺服器 ⇒ 真站的營運面仍只有 `ops_summary` 那一支是真的）。
    - **擴充性槓桿**：做完之後「多一種營運身分」＝加一筆 spec；且 `HL.support`（10 個註冊者）／`HL.reports`（本輪 3 個）／未來 #116 `HL.poll` 都能共用同一個 grant 字串當受眾，**不必各自長一套授權欄位**。
      ⚠️ 落地時比照 #115 立一條「只數 `HL.rbac.register` 外部呼叫者」的鎖（#116 卡也已寫同一條）——別再長出第四個孤兒容器。

    - ✅ **落地（2026-08-22 平台軌·20:00 窗）**：新檔 `core/rbac.js`（純函式工廠 `makeRbac()` **零內建角色** + 純資料 `BASELINE` + `seeded()`），
      `register({ id, label, icon, grants, base?, ctxFlag?, avail? })`、**唯一謂詞** `can(grant, ctx)`、值域閘 `knows(grant)`。
      `grants` 帶**點號層級**（`covers("ops","ops.ledger")` 為真）＝今天寫 `aud:"ops.ledger"` 的報表，今天的 `ops` 身分就已看得到，
      而明天的 `ops-finance` 只授 `ops.ledger` 就自動只看得到那一張（避免將來又一次「回頭改值域」）。
    - ✅ **零回歸的形狀**：第一批＝現況兩種身分（`player` 為 `base`＝恆生效／`ops` 以 `ctxFlag:"ops"` 接住既有 `{ ops: true }` 呼叫端）
      ⇒ 三種判斷結果與舊硬寫閘**逐位相同**（`can("player",{})` 真／`can("ops",{})` 假／`can("ops",{ops:true})` 真），呼叫端一行不改。
      `reports.js` 的 `AUDS` 兩值陣列已移除，`register()` 改問 `rb.knows(def.aud)`、`visibleWith()` 改問 `rbac.can(def.aud, ctx)`，**顯示與匯出仍共用同一個閘**。
    - ✅ **卡上四條紅線全部守住**：① 兩處一起換（`download()` 內仍 `R.visible(d, ctx)`，常駐鎖盯住）；
      ② `reports/aud-must-be-explicit` 依 §10.1 改錨（`AUDS.join(",")==="player,ops"` 那句沒放寬，改成「值域向授權表求 + 封閉性 + 加一筆註冊即可擴充」三段）；
      ③ **不假裝解決權威**——報表中心對 ops 報表加一行據實說明「前端角色只決定提供什麼、不決定准不准」，台帳同輪回填「權威仍只覆蓋 `ops_summary` 一支 RPC」；
      ④ 身分軸/站別軸正交——`rbac.js` 一個字都不讀 `HL.site`、不寫任何 localStorage（常駐鎖 `platform/rbac-single-predicate` 兩條反向斷言盯著）。
    - ⚠️ **刻意偏離卡上一項要求，理由已記進測項檔頭**：卡末要求立一條「只數 `HL.rbac.register` 外部呼叫者」的鎖（防孤兒容器）。
      本輪**沒有立**——唯一誠實的外部註冊者是 `demo-tools.js`（全站唯一產生 ops 上下文者），但它靜態排在 `reports.js` **之前**，
      把 `ops` 身分搬過去 ⇒ `reports.js` 註冊 3 張 ops 報表時值域還不存在 ⇒ **靜默拒收三張報表且畫面完全正常**（#115 那條鎖存在的正是這個坑）。
      ⇒ 改以「消費端非孤兒 + 顯示/匯出兩路徑同一謂詞 + 種子身分恰為兩種」守同一件事，並**先立好** `platform/rbac-load-order`：
      第三種身分真的由外部註冊那天，它必須排在消費端之前。
    - ✅ **順帶修掉一個查獲的真缺口（P3 紀律）**：#109 報表中心**落地當輪整個 i18n 是空的**（`📊 報表中心`／`選擇報表`／`⬇ 匯出這張報表`
      等鍵在 `en.js`／`zh-Hans.js` 皆 0 命中）⇒ 本輪補齊 EN/zh-Hans 各 12+ 條純片語，並據實界定帶數值的串接節點依 P3 契約永遠翻不到。
      ⚠️ 這件事**沒有任何機械閘攔得住**（既有 i18n 鎖都是逐表面特化的）⇒ 已開卡 **#119**。
    - ✅ **驗證**：node **247→254 全綠**（+7：rbac 4 條〔含 1 條 browser-only〕、reports 1 條 fail-closed、platform 3 條結構鎖），
      **負向擾動 8/8**（每條先斷言 mutated≠orig 排除 no-op 假綠；M1 載入序排反／M2 授權退回硬寫／M3 `ops` 誤標 base／M4 `covers` 恆真／
      M5 值域閘被拆／M6 rbac 缺席改 fail-open／M7 偷讀 `HL.site`／M8 外部註冊者寫未宣告受眾 —— 各由**對應那一條**抓到，restore 後 254 全綠）。
      首屏 1550.9→**1576.9KB／90 支**（M6 門檻餘裕 49KB→**23.1KB**＝本季最窄；已回填台帳並對下一個建置輪立下硬約束：先做 #118 或讓改動淨負）。sw v209→v210。
    - ⚠️ **UNVERIFIED（排程輪無 dev server·§9）**：報表中心那兩行說明的**視覺**（新增的第二行是否擠壓、切語言後 EN/簡中的斷行）——
      headless 不合成影格；授權行為與 i18n 鍵覆蓋已由常駐鎖與字典實測機械證明。

108. ✅完成（2026-08-19 平台軌·14:00 窗，commit 見下方日誌） **活躍光環的第二個消費端：返水加成（註冊進 #52 `HL.rakeboost`，不新增第三套加成表）** — S — 來源：**#59 落地當輪自查**（非外部平台、非台帳輪替）——#59 卡上舉例的效果是「返水/轉盤/任務獎勵小幅上浮」，實際只落地了**進度加速**一個消費端。
    - **問題**：光環現在只有一個讀者（`HL.progressSrc.registerBoost`）。而 `HL.progressSrc` 的真站上限是 **1.0＝真站零效果** ⇒ **真站玩家看得到光環徽章、拿不到任何好處**（#59 已在面板文案明說，但那是誠實聲明，不是設計終點）。
    - **範圍（一筆註冊，不改任何呼叫端）**：`HL.rakeboost.register({ id:"activity-aura", name, icon, avail, mult })`——形狀與 #59 已用的 `progressSrc.registerBoost` **逐位相同**（`core/rakeboost.js:384` 的契約：id/name/icon/avail()/mult()/msLeft()），故實作是把 `multFor(xpSince(WINDOW_DAYS), mode())` 換成一組**返水專用**的段位倍率並註冊進去。**明文禁止**新增第三套加成表或第二個「光環倍率」定義：段位判定必須向 `HL.activity` 求，不得在 rakeboost 側複製門檻。
    - ⚠️ **先抄進卡的阻塞事實（與 #59 的關鍵差異，別照搬結論）**：`rakeboost` 的站別硬上限是 **`CAP = { demo: 3.0, live: 1.5 }`**（rakeboost.js:70）——**真站不是 1.0**。⇒ 與 #59 的進度加速**完全不同**：這條路在真站**真的會增加送幣成本**，不是結構上恆零。而該檔的真站硬不變量是 **`maxPct(live) × CAP.live = 0.145 × 1.5 = 0.2175 < 1`**（＝返水率永不超過該注的理論莊家收入），且**有常駐測項盯著 `CAP` 不得被改動**（`#81 不得改動 CAP`）⇒ **本卡只能在既有 CAP 之內加一筆乘數，一律不得動 CAP**；真站段位倍率須保守到讓上述恆等式繼續成立（既有測項會自動驗，不必新寫）。
    - **需船長裁決的一點（引擎不代裁）**：真站要不要給光環返水加成，是 **§11 經濟決策**（真站 NGR 才剛轉正）。⇒ 實作時**預設真站段位倍率全為 1**（與 #59 同樣零成本落地、容器就位），把「真站要開多少」留成一個 config 常數 + 一行 CONTROL 船長指令即可開啟。這樣本卡不必等裁決就能落地，而裁決來時是改一個數字。
    - **擴充性槓桿**：做完之後「光環要影響第 N 個表面」＝在該表面既有的加成註冊表加一筆（轉盤 `HL.luckyspin`／任務獎勵 `HL.tasks` 各自是否已有加成註冊表，實作前先查、沒有的話**不要為此新造**，改回報開卡）。
    - **驗證要點**：① 真站含本加成後 `rakeboost` 既有的「真站含加成仍守不變量」測項必須仍綠（不得改 CAP 讓它綠）；② 光環淡出後返水率回到基準（零回歸）；③ 段位門檻只有一份真相（反向鎖：rakeboost 側不得出現任何門檻數字）。
    - **✅ 落地（2026-08-19 平台軌 14:00 窗）**：`core/activity.js` 加 `TIERS[].rb` 一欄 + 純函式 `rbMultFor(windowXp, mode, scale)` + 真站旋鈕常數 `RB_LIVE_SCALE = 0`，
      並在本檔（**不是** rakeboost.js）以 `HL.rakeboost.register({ id:"activity-aura", … })` 掛成該表**第五筆**（happyhour／newcomer／rakeboost／claimwindow 之後）。
      **`core/rakeboost.js` 一 byte 未改**（含 `CAP`）⇒ 卡上「不改任何呼叫端」是字面成立的，而 `maxPct(live) × CAP.live = 0.2175 < 1` 是**恆等式繼續成立**、不是重新證明。
      面板加一列「目前加成」（經驗加速 ×N · 返水加成 ×N，兩個值皆當場求值）、說明中心與 #90 旋鈕表同步吐 rb 值與旋鈕本身。i18n EN/zh-Hans 同步（P3 紀律連續第 N 輪）。
    - ⭐ **落地時最該記下的一件事＝「該不該把兩欄合併」是個陷阱，而它偽裝成去重**：`mult`（進度加速）與 `rb`（返水加成）數字很接近（1.05/1.10/1.20 vs 1.03/1.06/1.10），
      任何下一輪來讀這個表的人都會覺得「這不是同一組數字抄兩份嗎」。**但它們花的不是同一種東西**：`mult` 動的是 XP（帳面速度、零成本），`rb` 動的是真的付出去的返水（§11 送幣成本）。
      合成一欄之後，「把光環加速調快一點」這種純體驗調整會**同時**推高真站送幣，而且沒有任何地方會提醒。⇒ 已加**反向鎖** `activity/rb-two-columns`：兩欄若被改成逐段相同即轉紅
      （擾動②實證）。這與 #59 記下的「兩把尺 `w`/`x` 都要存」是同一個家族的第二個實例——**「看起來重複」與「真的重複」的分界線是消費者花的成本，不是數字長得像不像**。
    - ⭐ **第二件事＝同一個機制的兩條路徑，站別結構可以完全相反，所以上一輪的結論不能照搬**：#59 那條路（`progressSrc`）真站是「想給也給不了」——下游 `BOOST_CAP.live = 1.0` 夾成恰好零；
      本卡這條路（`rakeboost`）下游 `CAP.live = **1.5**`，真站是「給得出去、而且真的要付錢」。⇒ 真站幅度做成一顆**顯式旋鈕**（預設 0＝零成本落地、容器就位），
      要開多少留給船長改一個數字；並補測項 `activity/rb-live-scale-wired` 證明**這顆旋鈕不是死碼**（scale=1 → 真站等於假站、0.5 → 半幅、>1 → 夾回 1、負數/垃圾 → 夾回 0）。
      若沒有這條測項，「預設 0」與「這段程式根本沒接線」在測項上完全同形。
    - ⭐ **第三件事＝讓文案由常數推導，而不是各自斷言**：#59 落地時記的教訓是「卡上的形容詞與常數矛盾時讓常數贏」；本輪是它的**正向用法**——
      面板站別說明句改成 `rbMultFor(9e9,"live") > 1 ? 「已開啟」句 : 「不提供任何額外加成」句`，說明中心那句也逐項向 `tiers()` 求值。
      ⇒ 船長哪天把旋鈕轉開，文案**自動**換句，不可能出現「文案說沒有、實際有」。（vm 實測：把 `RB_LIVE_SCALE` 改 1 後，面板確實換句且不再出現「不提供任何額外加成」。）
    - **驗證**：node **184 → 187 全綠**（新增 3 條 both-env 測項）；**負向擾動 10/10 全被抓**（旋鈕被偷偷轉開／兩欄被合併／rb 倒掛／幅度失控 1.30／rb 高於同段 mult／
      真站分支被拿掉／旋鈕不夾上界／首段被給加成／rb 欄整組消失／旋鈕接線斷掉——先證乾淨樹 187 全綠再逐一擾動、每次跑完立即還原）。
      **瀏覽器路徑（node vm + dom/ui stub 載入真實 `rakeboost.js` + 真實 `activity.js`）：46/46**——三情境（假站／真站旋鈕 0／真站旋鈕 1）各驗
      註冊表 5 筆、零活躍時不入 `active()` 且 `mult()===1`、第二段 1.03、頂段 1.10、**31 天後淡出回到 1**、`CAP` 未動、面板文字與數字、新 browser 測項 `activity/rb-registered` 實跑。
      ⚠️ **據實記兩個限制**：(a) 本輪**無 preview／無目視**（§9 headless 沙箱過不了登入 gate），面板新那一列的**版面**未經視覺確認、翻譯未三語目視；
      (b) 假站的**新玩家**在頭 24 小時本來就有 `newcomer ×2` 生效，`resolve()` 取最大 ⇒ 該期間光環加成**看不出效果**（不是壞掉，是設計）。首屏 1527→**1540KB／92 支**（見 #110）。sw v180→**v181**。

> 🤖 **以下由自我進化引擎「平台軌」自動開卡**（2026-08-19 **14:00 窗** · 來源：① `intel/db/platform-modules.json` **資料** 分類審〔3 模組全審，該分類 `last_audited` 08-16＝全 8 分類最舊〕② M6 首屏預算常駐閘的**實測值逼近門檻**）。

109. ✅完成（2026-08-21 平台軌·08:00 窗·commit `0ecc78e`；**實作本體由 08-20 14:00 窗完成後凍結未提交，本輪接手驗證並收尾**，見下方日誌） **報表/匯出定義註冊表 `HL.reports`：全站唯一的真匯出出口只有注單一種，加一張報表＝改程式** — S–M — 來源：**platform-modules 台帳「報表與匯出」連四輪 partial**（08-05／08-07／08-16／08-19 皆同一組理由未動），其 `stowable_note` 早已寫明「報表為可註冊查詢清單，加報表＝加定義」。
    - **問題（本輪機械實證）**：naive grep `csv|CSV|Blob|download` 命中 5 檔／36 行，逐筆確認**只有 `core/betlog.js` 是真出口**（`:166 download()`＋`:168 new Blob`＋`:169 createObjectURL`＋`:170 <a download>`）；
      `demo-tools.js:59`／`fair.js:157` 是註解、i18n 兩檔是譯文字串。⚠️ **命中檔數 4→5 是 #100 拆 i18n 造成的量測假上升，不是新出口**（這條要寫進卡，否則下一輪會誤讀成「已有第二個出口」）。
    - **範圍（容器先於內容 · 資料驅動）**：`HL.reports.register({ id, cat, name, icon, cols, rows(), avail() })`——`cols` 沿用 #51 `betlog.COLS` 已證可行的**欄位描述子**形制
      （表頭／明細／CSV 三處由同一份定義生成）；中心頁只做分群＋篩選＋「匯出這張報表」，**新增一張報表＝加一筆註冊，不改中心頁與匯出程式**。
    - **首批註冊者（全部是「有內容沒出口」的既有資料，本卡幾乎不產生新資料）**：① `betlog`（把既有 CSV 出口**遷移**成第一筆註冊，不是再寫一份）② `HL.ledger.derived()` 營運彙總
      ③ `HL.activity` 的日桶（#59；逐日 w／x／n，保留 90 天）④ VIP／任務／季票進度快照。
    - **第二批註冊者（刻意併進本卡，避免雙胞胎）**：台帳「資料/分析」模組要的**事件 schema 註冊表**。它與本卡問的是同一個問題「這種資料長什麼樣、從哪裡出去」，
      出口形狀相同 ⇒ 依 #95/#72 前例**不另開卡**。⚠️ 先抄進卡的阻塞事實：`grep eventSchema|funnel|cohort|retentionCohort` 於 `prototype/src` **連三輪 0 命中**（08-05／08-07／08-19），
      即產品側分析**完全從零**；但 #59 之後「時間維度」已真的存在（`wageredSince/xpSince/betsSince` 任意窗長），所以缺的是定義與出口、不是資料。
    - ⚠️ **先抄進卡的第二個阻塞事實**：`HL.ledger`／`opsBoard` 的彙總是**莊家視角**資料，真站含真實金流語意 ⇒ 報表中心若對玩家開放，必須依 `HL.site` 與現有 admin 閘分「玩家可見／營運可見」兩類，
      別讓一個 `cat` 欄位同時承載「分類」與「權限」（那是把授權寫進顯示層，日後很難拆）。
    - **擴充性槓桿**：做完之後「多一種可匯出的資料」＝加一筆定義，且 #51 已證這條路能一份定義餵三個出口 ⇒ 屬本軌「容器先於內容」的正選。

110. ✅完成（2026-08-19 平台軌·20:00 窗） **首屏預算只剩 3.7%：#80 已建好的延遲載入容器，還有 123KB 現成的第二批沒搬進去** — S — 來源：**M6/M8 首屏常駐閘本輪實測 1540KB／1600KB＝96.3%**（08-16 1493／08-19 08:00 1527／本輪 1540，趨勢 ~+15KB/輪）＋**#80 落地時自己寫進台帳「首屏載入架構」`stowable_note` 的下一步從未被開成卡**。
    - **問題**：`HL.lazyGames`（#80）已把 `src/views/` 的遊戲檔搬離首屏，但 node 實測**仍有 14 支 views 靜態掛載＝241KB**，其中 #80 自己點名的六支合計 **123KB**：
      `arena.js` 42KB／`ops-dashboard.js` 21KB／`bounty.js` 18KB／`vsslot.js` 17KB／`liveroom.js` 13KB／`global-prize.js` 13KB。**開站看大廳的玩家一行都用不到這六支**。
    - **範圍（不是新架構，是把現成容器用滿）**：逐支改走 #80 既有的延遲載入註冊（入口點按下才抓檔），**不新增第二套載入器**；每支各自驗「入口可開、開起來與現在逐位相同」。
      預估落地後首屏 1540 → **~1417KB（回到 11.4% headroom）**。
    - ⚠️ **先抄進卡的阻塞事實**：`ops-dashboard.js` 由 ⚙ DEMO 面板開、`arena.js`／`bounty.js` 有**背景 sim/計時器**與真站閘（`HL.site.isLive()`），
      延後載入等於延後那些常駐計時器的起跑 ⇒ 需逐支確認「沒載入時不會有人去讀它的全域」（#80 已建立的守衛樣式可直接沿用）。
    - ⭐ **順帶記一個結構性事實，供船長裁決要不要處理**：本專案**刻意無打包步驟**（CLAUDE.md §0），因此**每一行中文註解都是照原樣送到玩家瀏覽器的位元組**。
      本輪一張 S 級卡（#108）的落地就讓 `activity.js` 由 31.0KB 長到 **44.0KB（+13.5KB，其中絕大多數是註解）**＝一口氣吃掉剩餘 headroom 的 **23%**。
      ⇒ 「文件寫在程式裡」這條紀律（本軌的核心紀律之一）**本身有可量測的首屏成本**。真正便宜的解法是**部署期壓縮/剝註解**，但那等於引入 build step（現行架構明文避開）
      ⇒ **不代裁**，只把數字放在這裡：若船長願意接受「部署時 minify」的 build step，首屏可一次省下遠超 123KB；若不願意，本卡的延遲載入就是唯一的長期出口。
    - ✅ **落地（2026-08-19 平台軌·20:00 窗｜送走 5/6 支，第 6 支（arena）經機械查證後判定「不得送」）**：新增 `data/lazy-views.js`（`HL.lazyViews`）＝route／全域型出口的延遲載入容器，清單一列一檔：`views:[{id,methods?}]` 佔位進 `HL.views[id]`、`globals:[{ns,methods}]` 佔位進 `HL[ns]`。**首屏 1539.9KB／91 支 → 1467.9KB／88 支**（−72.0KB／−3 支），門檻餘裕 **60.1KB（3.8%）→ 132.1KB（8.3%）**；離開首屏者 5 支共 81.5KB（global-prize 12.5／liveroom 13.0／bounty 18.5／vsslot 16.8／ops-dashboard 20.6），扣回兩個容器本身約 9.5KB。仍靜態的 `views/` 由 14 支／241KB 降為 **9 支／159.9KB**。
    - ⚠️ **先說卡上實際錯了的兩件事（據實記，而且兩件的真相本來就在台帳裡）**：
      ① 卡寫「逐支改走 #80 既有的延遲載入註冊、**不新增第二套載入器**」——但這 6 支註冊的是 `HL.views.<id>`（路由表）而非 `HL.games`，**#80 的容器在結構上碰不到它們**。而這件事 **`platform-modules.json` 模組 46 的 `stowable_note` 早已寫明**：「它們走 `HL.views[route]` 出口（非 render）⇒ 需先為 route 型出口做一個對應的 stub 機制」。⇒ 這是 SKILL 第 3 步「開卡前要把來源模組 evidence 裡的阻塞事實抄進卡」的**第三種變形：阻塞事實不在 `evidence`、而在 `stowable_note`**（開卡那輪只讀了前者）。⭐ **紀律：開卡前要讀完來源模組的兩個欄位，`stowable_note` 不是裝飾——它就是上一位留下的施工條件。**
      ② 卡寫「開站看大廳的玩家一行都用不到這六支」——**對最大的那一支是錯的**：`views/arena.js`（42KB，佔 123KB 的 34%）被 `views/lobby.js:110` 的「🔥 熱門玩家擂台」**無守衛地**呼叫 `HL.arenaUI.roomCard()`（大廳首屏就在渲染它），且 `main.js:131` 開機起一個每秒 `HL.arenaSim.tick()` 的假站環境活動 interval。搬走＝大廳渲染時 TypeError ＋ 假站「看起來沒人在玩」。⇒ 它的程式**真的參與首屏，不是漏搬**。⭐ **候選清單上的 KB 數是誘因、不是判準；判準是「首屏那一次渲染有沒有同步碰到它的全域」。**
    - ⭐ **第三件發現：注入器與載入態表只能有一份**。兩個容器各留一份的話，**同一個 src 被兩邊分別要求時會被注入兩次**（view 檔重複執行＝計時器與註冊重複）⇒ 新增 `core/lazy-load.js` 為單一真相（`load`／`state`／`loadingNode`／`failNode`／`gatedOut`），`data/lazy-games.js` 的注入器、占位節點、登入閘全數改向它借，**`HL.lazyGames` 公開 API 一字未改**（vm harness 逐項複驗 22 款換手仍正常）。
    - ⭐ **第四件：route 型 view 不只有 `render`**。`HL.views.liveroom.enter(idol, init)` 被 `global-prize.js` 的主播卡同步呼叫，純 render stub 會讓那條路徑**靜默變成 `undefined is not a function`**（而且「點了沒反應」與「還在載入」在畫面上完全同形）⇒ 清單支援 `methods: []`，方法型 stub 先注入、載完把**原參數原封轉給真方法**（載不到則 toast，不靜默）。
    - **三條常駐鎖（node fast·191 項全綠）**：`platform/lazy-views-manifest`（src 存在／不得同時靜態掛載／容器與注入原語已掛／宣告的 id 與 methods 真的存在於該檔）、`platform/lazy-views-consumer-guard`（**全庫掃跨檔同步呼叫 `HL.views.<延遲id>.<成員>` 與 `HL.<ns>.<成員>`，不在 render+methods 白名單即紅**）、`platform/arena-first-screen-dependency`（arena 必須留在首屏；**若未來真的拆掉 lobby/main 那兩個依賴，該鎖會要求一併改寫它自己而不是靜默失效**）。
    - **驗證**：`node prototype/tests/run.js` **188 → 191 全綠**；**負向擾動 10/10 全被抓**（bounty 又被靜態掛回去／容器沒掛／注入原語沒掛／清單 id 寫錯／liveroom 漏宣告 enter／opsBoard 漏宣告 open／arena 被順手搬進清單／arena 被移出首屏／liveroom 改名註冊目標／有人在 lobby 同步呼叫未宣告成員——**先證乾淨樹全綠**、每例跑完立即還原）；**瀏覽器路徑 vm harness 76/76**（`document.head.appendChild` 改成「從磁碟讀真檔並在同一 context 求值」⇒ 5 支真實 view 是**真的被載入**、真的執行自己那句 `HL.views.<id> = {...}` 換手：開機零注入、4 支 route 型逐支「同步回占位→換手→只重繪一次」、玩家已離開則不硬拉回、`enter`／`open` 參數真的轉到真方法、同一 src 併發三次只注入一次、失敗路徑回 failNode／toast 且不重繪、**#80 零回歸**（dice 完整換手））。sw v182→**v183**。
    - ⚠️ **據實記一個驗證限制**：本輪對 `preview_start` 的回應是「**無人值守 session 不得啟動 dev server**」（比 §9 的登入 gate 更前面的一道門）⇒ **5 個入口的真實目視與點擊未經確認**，上面的 harness 只證到「換手機制」而非「畫面正確」。**下一個可靠 preview 輪請逐支點開**：側欄 🌐 全球獎 → 主播卡進直播間、競技場房卡 → 賞金局與對戰 slot、⚙ DEMO → 營運工具 → 儀表板，確認占位「載入中…」一閃而過後畫面與改版前一致（並注意 SW 快取：已 bump v183）。
111. ✅完成（2026-08-20 平台軌·08:00 窗） **「這支 view 能不能搬出首屏」必須是算出來的，不能是看 KB 數猜的** — S–M — 來源：**#110 實作輪的機械查證**（候選清單把 42KB 的 `arena.js` 列為「非開站必要」，實測它是大廳首屏的同步依賴）＋ **platform-modules 模組 46 `stowable_note` 本輪剛寫入的「下一批四支待查證候選」**。
    - **問題**：#80（送走 19 支）與 #110（送走 5 支）兩輪下來，「哪些檔可以延遲載入」全靠**人工 grep ＋ 人工判斷**；#110 就因此差點把大廳弄白屏（arena），而**那一步如果漏了，錯誤只會在真實瀏覽器上現形（headless 輪拓不到）**。現在餘裕 8.3%、不急，正是把判準工具化的時點。
    - **範圍（容器先於內容 · 本卡不搬任何一支檔，只做「算得出來」這件事）**：一支 node 工具＋常駐鎖，對每一支仍靜態掛載的 `views/` 算出三欄：① 它對外掛上的全域（`HL.<x> =` 與 `HL.views.<id> =`）、② 首屏渲染路徑（`main.js`／`layout/*`／`views/lobby.js`／shell）中**無守衛**引用那些全域的位置、③ 結論：`safe-to-lazy` ／ `needs-methods:[...]`（有跨檔同步方法）／ `first-screen-bound`（有首屏依賴，附行號），並報出**可回收的 KB 總量**。
    - **擴充性槓桿**：① 未來每一輪想再省首屏時，**讀工具輸出而不是重新推理一次**；② `platform/arena-first-screen-dependency` 這種「一支檔一條鎖」可收斂成一條通則鎖（任何被列入 lazy 清單的檔不得被工具判為 `first-screen-bound`）；③ 同一把尺也能回答 `layout/` 與 `core/` 的可否（目前完全未被評估過）。
    - ⚠️ **先抄進卡的阻塞事實**：「無守衛」必須比 `if (HL.x)` 更寬——`main.js:66` 的 `HL.arenaSim && HL.arenaSim.flush` 是有守衛的，但 `main.js:131` 的每秒 interval 即使有守衛也仍然**改變了行為**（假站環境活動不跑）⇒ 工具除了「會不會 TypeError」還要報「有守衛但依賴它存在才正常」的第二類，**否則它會把 arena 判為 safe**。
    - ✅ **落地（2026-08-20 平台軌·08:00 窗｜一支 `prototype/` 產品檔都沒動、沒新增任何 `<script>`、sw 不 bump）**：新增 `intel/tools/first-screen-deps.js`（分析器 + CLI：`--scope views|layout|core|all`／`--file`／`--json`／`--verify`）＋常駐鎖 `platform/lazy-list-not-first-screen-bound`（`prototype/tests/checks-platform.js`）。三欄如卡上所定：① 對外全域（`HL.<ns> =`／`HL.views.<id> =`，**只認賦值不認讀取**）② 首屏路徑引用位置＋分類 ③ 結論 `safe-to-lazy`／`needs-methods:[...]`／`first-screen-bound`，末尾報可回收 KB。
    - ⭐ **本卡最重要的一件事：首版工具「跑得出漂亮報表，但答案是錯的」，而兩個錯都不是筆誤、是模型錯**。首版把 **9 支中 7 支**判成 `first-screen-bound`（含 casino／slot／chicken／tournament），若當成判準就等於宣告「首屏再也省不了」：
      ① **把 router 登錄表的閉包當成首屏引用**。`main.js:41–52` 的 `VIEWS = { slot: { render: function () { return HL.views.slot.render(); } } }` 是**該路由被走到時才跑**的閉包，不是首屏。決定性反證就在手邊：**#110 已成功延遲的 globe／liveroom／bounty／vsslot，引用點正是這張表**——它們在線上活著、沒白屏 ⇒ 工具若判它們 bound，錯的是工具。⇒ 新增 **R 類（route-attributed）**：登錄表內**非預設路由**的閉包不算首屏；預設路由（自 `VIEWS[view] || VIEWS.lobby` 讀出＝`lobby`）才算。
      ② **裸的括號計數被註解與字串騙了**。首版判「是否在 `setInterval` 回呼內」用 `{`/`}` 相減，於是 `main.js:16` 那個頂層 ticker 的回呼「永遠沒閉合」，**整個 main.js 的引用都被標成「setInterval 回呼內」**。⇒ 加一層 `maskSrc()`（把字串/註解字元換成空白、**長度不變故索引仍能對回原檔**），所有括號配對與符號搜尋都在遮罩後的副本上做。順帶解掉台帳連四輪記載的「註解提及被當成出口」——本工具**結構上不可能**把註解算成引用。
      ⇒ **通則（建議收進 SKILL）：任何新量測工具都必須先找出「已知答案的樣本」當地面真相**。這裡的地面真相是免費的——**已經延遲成功且線上沒白屏的檔**。故把它做成工具的 `--verify` 與常駐鎖的第一段。
    - ✅ **自我校準（非空跑實證）**：`--verify` 對延遲清單 **24 支**（#80 的 19 + #110 的 5）逐支分析，**24/24 皆非 bound**（21 `safe-to-lazy` + 3 `needs-methods`＝liveroom.enter／opsBoard.open 那類已宣告 methods 者），且**24/24 都真的被分析到**（非 null-skip 的假綠）。
    - ✅ **對 arena 的三筆判定與 #110 的人工結論逐位相符**（本工具的存在理由）：`A src/views/lobby.js:110`（預設路由 lobby 的渲染鏈上、無守衛 `HL.arenaUI.roomCard` ⇒ 搬走即 TypeError）＋ `B src/main.js:131`（開機註冊的 `setInterval` 回呼內，**即使有 `if (HL.arenaSim)` 守衛也算** ⇒ 搬走不報錯但假站環境活動靜默不跑）；而 `main.js:66` 的 `HL.arenaSim && HL.arenaSim.flush` 被正確歸為 **C 類事件驅動＝不阻擋**（與台帳 08-19 的人工判讀相同）。
    - 📊 **本輪產出的實際答案（下一張卡的輸入，不必再推理一次）**：仍靜態掛載的 `views/` 9 支中 —— ⛔ `arena.js`(41.8KB)／`lobby.js`(10.5·預設路由)／`auth-view.js`(4.2·登入閘在開機可達的 `renderAuthView()` 內) 三支**必須留**；✅ `slot.js`(42.1)／`chicken.js`(21.9)／`casino.js`(13.1)／`tournament.js`(8.9) 四支 `safe-to-lazy`（引用點皆只在 R 類路由閉包）；🟡 `game-frame.js`(11.2)`needs-methods:[gameFrame.wrap, gameFrame.resumeFrame]`／`fgboard.js`(6.2)`needs-methods:[fgBoard.create]`。**可回收 103.4KB**（首屏現 1467.9KB／M6 門檻 1600KB）⇒ 已開 **#112** 承接。⚠️ 這也更正了台帳模組 46 `stowable_note` 08-19 列的下批候選：`fgboard` 需 methods stub（不是純 render）、而清單漏掉了 `casino`。
    - **常駐鎖 `platform/lazy-list-not-first-screen-bound`（node fast·192 項全綠）**：延遲清單上每一支檔都不得被判 bound（把 #110 的「一支檔一條鎖」`platform/arena-first-screen-dependency` 收斂成通則；**兩者並存**——通則鎖看「清單裡的檔有沒有首屏依賴」，arena 那條看「arena 有沒有被錯誤地移出 `index.html`」，覆蓋面不同）。**內建防靜默轉綠三重錨**：① 清單掃不到檔即紅（正則/路徑壞掉）② 分析到的支數必須等於清單支數 ③ **反向錨：已知必須留在首屏的 `arena.js` 一定要被判 bound**——否則「工具壞掉把所有檔都判 safe」會讓整圈檢查全綠通過。
    - **負向擾動 2/2 全被抓**（各跑完立即還原、還原後 70/70 綠）：① 把 `arena.js` 塞進 `lazy-views.js` 清單 → 3 項紅（含本鎖，訊息直接指出 `A lobby.js:110`）；② 把分析器的符號正則改成永不命中（模擬「壞掉但沒人發現」）→ arena 反向錨紅、訊息明說「要嘛依賴真被拆了請一併改寫本測項，要嘛分析器壞了正在把所有檔都判 safe」。
    - ⚠️ **誠實界定**：靜態啟發式、誤報率不為零，且**刻意偏保守**——兩種錯的代價不對稱（誤判 bound 只是少省幾 KB，誤判 safe 是線上白屏）⇒ 不確定一律留在首屏；名稱式呼叫圖會高報（同名不同物、條件分支都算）。工具自己在輸出末尾印這段。**本輪無 preview**（排程輪不得啟動 dev server），但本卡零產品檔改動、零 `<script>` 變動 ⇒ **無瀏覽器可觀測面**，非「該驗沒驗」。

112. 🏗️進行中（**一半已落地**：2026-08-22 平台軌·14:00 窗 commit `b1e9b1a`+`a8a541c` 送走 casino／tournament／chicken＝43.9KB；剩下的 64.2KB 已查明**有前置條件**，鎖在 #118 之後） **第三批首屏遷移：把 #111 算出來的 103.4KB 依結論分兩類送走** — S–M — 來源：**#111 工具輸出**（`node intel/tools/first-screen-deps.js`，非人工推理）＋ platform-modules 模組 46「首屏載入架構」。
113. 🟦已批准待做 **競技場剩餘工作（規格已寫完、逐條有證據，照波次吃）** — M–L（分批，勿一輪吞） — 來源：**2026-08-21 前景競技場輪**（船長原話「競技場是一個很大的重點」）：5 份外部同類平台研究 + 4 批稽核 → 逐批敵對複驗 ⇒ 32 條存活、29 CONFIRMED。
    - **規格與逐條證據**：[intel/arena-battle-spec-2026-08-21.md](intel/arena-battle-spec-2026-08-21.md)（對照表／狀態機／節奏表 ms／資訊 IA／顯示 BUG 清單／分波建議）。**該檔頭部有「已落地／仍待做」兩張清單，動工前先讀、做完就地標記。**
    - **已落地（2026-08-21 前景，7 個 commit）**：排名規則四處硬寫的根因（新增 `core/battle-mode.js`）、自建房雙扣、關 PiP 後孤兒對戰、換頁沒收賭注、對手開打前被換掉、平手一律判你贏、對戰無公平入口、對戰中資訊顯示、節奏五拍（新增 `core/battle-tempo.js`）、彈分被硬切。
    - **仍待做（依價值）**：① **會員模式 F5 後戰績每列「敗 · −NT$ NaN」**（伺服器 payload 缺前端讀的欄位、全 repo 無 normalize；同一個根因也讓回放 10 輪縮成 1 輪、席位標籤全空）② 賞金池原地更新漏掉（挑戰次數在爬、賞金池凍結）③ `canJoin` 不重算 ⇒ 滿房仍寫「加入 NT$X」、點下去付錢進滿房 ④ 大廳「🔥 熱門玩家擂台」是凍結快照（倒數不動、已 splice 的鬼房還在賣；**要接 `HL.ticker`，不要新開 setInterval**）⑤ 房卡無 `done/plays` 進度（房間會在 ⏱ 還剩十幾分鐘時憑空消失）⑥ 進行中/結算兩套淨利公式（差一個開房費）⑦ `isBusyView` 與 `VIEWS[].isGame` 兩份真相（結算模態會蓋住直播房）⑧ 空狀態文案不分頁籤 ⑨ 四個缺的狀態：ROOM_OPEN（房間開著等人＋5:00 加入窗）／SEAT_FILLING／SPECTATE 觀戰／EXPIRED 逾時退款⑩ 結算卡兩欄制（本局分數／派彩）＋平手裁決可見化（現在已由 `HL.fair` 裁決但畫面沒說）＋「再戰一局」印原價 ⑪ 跳過本輪演出（Enter／點畫面）。
    - ⚠️ **動手前必讀的兩條紀律**：(a) 任何「誰領先／這數字越大越好嗎／勝負條件」一律問 `HL.battleMode`，**不得自寫比較子或字串**（這正是本輪顯示 BUG 的根因，且已有常駐鎖 `games/arena/mode-semantics-single-truth` 擋著）；(b) 任何節拍一律問 `HL.battleTempo`，**view 內不得再寫裸毫秒**（鎖：`games/arena/tempo-beats`）。
    - **驗證要求**：節奏類改動請沿用 `data-beat` 狀態化（headless 驗得到拍的順序與「餘額有沒有排在動畫之後」）；顯示類改動可用「偽造 `arenaStats.history` 記錄 → 直接開回放 → 驗 DOM」繞過動畫（本輪就是這樣復現兩個顯示 BUG 的）。
    - **問題**：#111 已把「能不能搬」變成算得出來的，但**本輪刻意一支都沒搬**（工具卡與遷移卡分開，才不會拿自己的新工具替自己的遷移背書）。現輸出指出 6 支可動、**可回收 103.4KB**（首屏 1467.9KB → 約 1364KB、M6 門檻 1600KB 餘裕 8.3% → 約 14.8%）。
    - **範圍（兩類分開做，別混成一批）**：① **純 R 類 4 支**（`slot.js` 42.1／`chicken.js` 21.9／`casino.js` 13.1／`tournament.js` 8.9＝86.0KB）——引用點只在 router 登錄表閉包，走 #110 既有 `HL.lazyViews` 清單加列即可，**不需要新機制**；② **`needs-methods` 2 支**（`game-frame.js`：`gameFrame.wrap`／`gameFrame.resumeFrame`；`fgboard.js`：`fgBoard.create`）——必須先在清單宣告 `methods`，否則載入前那些成員是 `undefined`，而「點了沒反應」與「還在載入」在畫面上完全同形。
    - ⚠️ **先抄進卡的阻塞事實（讀完來源模組的 evidence 與 stowable_note 才寫的）**：
      ① **`casino.js` 是 `backTo` 的目標**（`main.js` 多列 `backTo: "casino"`）＝從遊戲頁按公版返回鈕會**同步**走過去；那是字串路由（不是同步呼叫全域）故工具正確判 safe，但**遷移後必須實測「遊戲 → 返回 → 遊戲牆」這條路徑**，它是本批唯一會被大量玩家踩到的返回路徑。
      ② **`slot.js` 帶兩個非 view 全域**（`HL.slotEngine`／`HL.shadowRitual`）；工具說首屏零引用，但**遷移前要再跑一次 `--file` 確認沒有新消費者**（同仁放置區 `games/` 下的 `game.js` 不在 `src/` 掃描範圍內，registry 的 slot-engine WIP 若被提交就可能出現新引用）。
      ③ **本批全部是 route 型出口**，`HL.lazyGames`（#80 那套）**結構上碰不到**——這正是 #110 卡上寫錯、真相卻早就在模組 46 `stowable_note` 裡的那件事，別再重踩。
    - ✅ **2026-08-22 落地的那一半（class ① 的 4 支中 3 支）**：`casino.js`(13.1)／`tournament.js`(8.9)／`chicken.js`(21.9)＝**43.9KB** 加入 `data/lazy-views.js` MANIFEST 並自 `index.html` 移除，**未新增任何機制**（純 route 型出口，引用點只在 `main.js` VIEWS 非預設路由閉包內）。首屏 **1593KB／91 支 → 1550.9KB／88 支**（門檻餘裕 0.4% → 3.1%）；node **243 → 244 全綠**、**負向擾動 4/4**、另寫執行期驗證 **22 項全過**（注入假 document 讓 `lazy-views.js` 走瀏覽器路徑 boot，逐支驗「stub → 占位 → 注入 → 換手 → 重繪一次」＋反例「玩家已離開該頁 ⇒ 零重繪」）。
    - ⛔ **同輪查明：class ① 的第 4 支 `slot.js` 與 class ② 兩支都不能搬，且原因與卡上寫的完全不同**（＝這張卡的據實修正）。卡上原本擔心的是「首屏依賴」與「needs-methods 未宣告」；真正的阻塞是**第三種、卡上沒有的**：**延遲檔之間的依賴**。`views/slot.js` 掛的 `HL.slotEngine` 首屏確實零引用（工具判 safe-to-lazy 正確），但 `views/vsslot.js:508` 寫 `if (!room || !HL.fgBoard || !HL.slotEngine) …「遊戲引擎未載入。」`，而 **vsslot 自己也在延遲清單上** ⇒ 兩支都延後、載入順序無保證 ⇒ **每一場 Slots Battle 都會落進那個錯誤分支**。當時的驗證面全部無感：首屏 KB 真的降了、`--verify` 全過、兩條既有鎖全綠、console 零錯誤。第二個盲點讓它更難發現：`views/fgboard.js:20` 寫 `var E = HL.slotEngine;` 才 `E.makeGrid(…)` ⇒ 文字上永遠不出現 `HL.slotEngine.makeGrid`，**#111 工具的 ③ needs-methods 偵測整段失效**（別名接走整個命名空間）。
    - 🔧 **本輪把它機械化（別再靠人記得）**：`intel/tools/first-screen-deps.js` 新增第 ④ 節 `sharedConsumers()`／`sharedRisks()`（三種消費形狀：`member`／`bare` 存在性守衛／`alias` 別名；可滿足性只承認「manifest 有宣告 stub」與「首屏檔的明示降級」）＋第四種結論 **`shared-dep-blocked`**；常駐鎖 **`platform/lazy-no-unsatisfiable-shared-dep`**（含反向錨：算不出 slot.js 的風險就紅）。⇒ 「順手多搬一支」從此會在 node 端變紅，而不是在玩家眼前壞掉。**剩餘 64.2KB 的前置＝新卡 #118**。
    - **驗收（工具＋鎖已就位，這張卡只要照著跑）**：`--verify` 仍 24+6 支全非 bound、`platform/lazy-list-not-first-screen-bound` 綠、`platform/first-screen-budget`(M6) 實測下降、負向擾動（把任一支靜態掛回去/漏宣告 methods）會紅。⚠️ **本卡建議排在有可靠 preview 的輪**：#110 的 5 個入口至今仍是「harness 證得出換手、證不了看起來對」，本批多 6 支且含返回路徑 ⇒ 不宜再累積未目視的遷移。

> 🤖 **以下由自我進化引擎「平台軌」自動開卡**（2026-08-06 **08:00 窗** · 來源：courtside + deal-or-no-deal-win **tier-3 到期補刷**〔逾期 4／3 天＝全庫最久兩筆〕+ `intel/db/platform-modules.json` **功能** 分類審〔13 模組全審，該分類 `last_audited` 07-31＝全 8 分類最舊〕）。全自動模式下標 🟦已批准待做。

72. ✅完成（2026-08-14 平台軌·20:00 窗，**合併 #95 一併落地**） **支援與透明度中心（可註冊的「公開說明條目」表 · 容器優先）** — M — 來源：**BC.GAME 2026 官方稿**（『Strengthens User Experience and Transparency With New Public-Facing Platform Enhancements』三項：付款處理說明更清楚／支援資訊結構化／帳戶審查溝通改善）+ **Courtside 2026-08-06 刷新**（客服＝AI chatbot「Coach」、數分鐘回應，被評測列為評分項）⇒ **AI 助理已是 2026 社交賭場的標配支援層**。
    - **本卡開卡過程本身修正了台帳一處誤判（據實記載）**：08-04 台帳記本模組「完全空白」，本輪回頭 grep 發現 **ApexWin 早有同型支援面**——`layout/ai-concierge.js`（`HL.partner`「AI Luna」罐頭問答，7 組 KB、掛 `HL.dock`）＝與 Courtside Coach 同型。⇒ 模組據實由 `absent` 上修為 **`weak`**，本卡的目標也隨之收斂。
    - 真缺口有二：① **對外可讀的透明度公開面**（金流怎麼處理、帳戶審查怎麼走、規則在哪）——目前零出口；② **規則／機率／RTP 的單一玩家端出口**——ApexWin 其實**資料很齊**（`HL.edge` 逐遊戲莊優表、12+ 款過保真閘的 RTP 證明、`HL.fair` 承諾雜湊、`game-fidelity-spec.md`），但**全部只存在於引擎與 repo，玩家端無處可讀**＝典型的「有內容沒出口」。
    - 範圍（純前端 · **容器先於內容**）：一張**說明條目註冊表** `HL.support.register({ id, cat:'payment'|'fairness'|'rules'|'account', title, body|render, order })`，中心頁只負責分群渲染＋搜尋；**新增一條說明＝加一筆註冊，不改中心頁**。首批註冊：逐遊戲 RTP／莊優表（直接讀 `HL.edge`，**不手抄數字**＝不會與實作分歧）、`HL.fair` 驗證說明與 seed 查詢入口（已有元件、只缺入口）、儲值／提款流程與額度（讀 `HL.sla` #63 + `HL.rg` #70 的既有值）、負責任博弈（連 #67 面板）。
    - **擴充性槓桿＋反重複病**：這是**第五次**遇到「元件/資料做好但沒接線」（P4 `HL.dock`、`promoCal` 外部註冊者為零、#66 `HL.reveal` 採用率、#67 死巷入口＋死欄位）——本卡幾乎不產生新資料，**只做出口**。同時讓 `HL.partner` 的 KB 可改為**從註冊表生成**（罐頭答案與真實說明同一份來源，杜絕下述漂移）。
    - ⚠️ **本輪已順手修掉一個由此查獲的實體缺陷**（見 #66 落地段）：`ai-concierge.js` 的風險條答「可在底部『損失限制』查看今日剩餘額度」，但全站 grep `損失限制` **僅 1 命中＝它自己**——#67 落地後真入口是「福利中心 → 🛡️ 負責任博弈」，該罐頭答案是**指向不存在 UI 的過期指路**。⇒ 這正是「兩份真相各自漂移」的活體樣本，本卡的單一來源設計即為根治。
    - 注意：**不涉牌照**——只公開自家既有規則與數值，不做 KYC／申訴仲裁／法定揭露（那些屬 CONTROL.avoid）。
    - 📌 **(2026-08-10 平台軌·Rollbit 刷新併入本卡，非新卡)** **第三平台佐證 + 一條具體 spec**：Rollbit 對外把回饋量化為「**返還最高 70% 莊家優勢**」，並附**逐筆算式範例**（$100 押注 × 5% 莊優 → 返 $0.75）。⇒ ApexWin 的 `HL.edge`（#50，22 款係數）＋ #60 的 `bet × edge × 段位比例 × boost` **早就逐筆算出這個數**，卻從未以玩家看得懂的方式呈現 ⇒ **首批註冊再加一條「你的回饋率」**：讀既有值算出「本站對你的**莊優返還比例**」＋一個逐筆算式範例（**不新增任何計算、不手抄數字**，沿用本卡「只做出口」的原則）。這同時是 **#78（彩金資格軸）的天然顯示位**——「你每注貢獻了多少彩池」與「已返還你多少％」放同一頁才完整。
    - ⭐ **實作前重新機械量測，查獲本卡與 #95 是同一張卡（去重紀律失效的實例，故一併記在這裡）**：#95（08-14 14:00 窗開）與本卡**來源同一個模組**（`功能/支援與透明度中心`）、**形狀同一種**（可註冊說明條目表 + 分群 + 搜尋）、**首批註冊者同一批**（sla／fair／rg／edge）⇒ 實質重複。SKILL 第 3 步明訂「去重：已在佇列的剔除」，14:00 窗開卡時**沒有回頭掃佇列裡的既有卡**。⇒ **通則：開卡前的去重不能只比對卡名，要比對「來源模組 + 出口形狀」**；同一個模組被連續幾輪審到時最容易長出雙胞胎。處置＝**以較早的 #72 為主體落地，#95 標 ♻️併入**，並把 #95 多出來的兩個好設計吸收進來（`when()` 情境述詞、「不新增第 N 顆常駐底部列按鈕」的入口紀律）。
    - ⚠️ **同時查獲 #95 卡上一個不可能滿足的前提，據實記下以免下輪重踩**：#95 寫「**本卡應是 #61 `HL.content` 的一個 type 消費者，共用同一份註冊表，不得另造一套內容儲存**」——但 **#61 尚未落地**（`grep -rniE "HL\.(content|cms|copy)\b" prototype/src` **0 命中**、無 `core/content.js`）⇒ 該約束**當下無法滿足**。這是「卡片範圍是上一輪的推論」家族的第三種變形（前兩種：範圍被低估／前提被推翻，本次是**要求與一個從未被建造的模組整合**）。處置＝本卡自帶最小登記表，並在檔頭寫明「#61 落地後，說明內容物可改為 `HL.content` 的一個 type，登記表本身保留為出口」。
    - ✅ **落地（2026-08-14 平台軌·20:00 窗｜容器先於內容、一條規則的「內容真相」都沒新增）**：新增 `core/support.js`＝`HL.support`（`register({id,cat,title,body|render,keys,order,when,action})`／`list`／`cats`／`search`／`describe`／`open`）。**五個規則擁有者各自註冊自己那條說明**（`fair` 公平性驗算／`edge` 逐遊戲莊優／`service-level` 提領時效與分階額度／`responsible` 責任博弈與 24h 不對稱／`progress` 紅利流水倍數與範圍），`body` **一律是函式、開面板當下才求值** ⇒ 讀的是各模組的活值，**不手抄任何一個數字**（本卡的核心設計，正是為了根治 :457 記的那種漂移）。`when()` 為情境述詞（首個真實用例＝「這裡能不能真的儲值」只在假站顯示），且**面板與搜尋共用同一個 `visible()` 出口**（只藏其一等於沒藏）。
    - ✅ **入口＝把死巷改成真入口，且一顆常駐鈕都沒新增**：側欄「更多」原本是 `soon:"更多"` → `ui.comingSoon()` 死巷（點了只說「建構中」），現改為開啟說明中心；`SIDE` 維持 **5 筆**，桌機側欄與手機抽屜**仍讀同一份 `SIDE`**（#93 的單一真相性質未被破壞，且新增的 `open` 分支兩個表面都處理）。`ai-concierge` 改為 **KB 未命中時才問 `HL.support`**（既有罐頭答案逐字零回歸），泛用回覆改為指路說明中心。i18n 補 EN/zh-Hans 各 20 條；⚠️ **誠實界定**：條目 `body` 是「中文＋當下數值」串接，依 P3 契約（翻譯只發生在整個文字節點等於一條 key 時）**永遠翻不到** ⇒ 只收整節點純片語，不假裝有覆蓋。sw v164→v165。
    - ✅ **驗證**：① node fast **121→125 全綠**（4 條常駐鎖：登記表不變量／五個擁有者自註冊＋載入序／入口存在且不新增導覽鈕／concierge 逐字零回歸）。② **負向擾動 10/10 皆被抓**——⭐ 其中**初版有 2 條是空心的，靠擾動才發現**：(a) 「edge.js 不再註冊」用 `if (false && HL.support …)` 就能繞過，因為原鎖只檢查「文字出現過」＝**又一次「出口 vs 提及」**，已改為比對**規範形狀** `if (HL.support && HL.support.register) {`；(b) 「抽屜漏處理 it.open」沒被抓，因為原鎖**全檔數 `it.open()` 筆數**，而福利中心 hub 另有一個同名區域變數 `it` 也呼叫 `it.open()` ⇒ 全檔得 3、拿掉抽屜那個仍有 2 而照樣綠＝**naive 口徑陷阱**，已改為**逐表面各自檢查自己的 render 區塊**。③ **瀏覽器區以 shim 載入「真的那份 `support.js`」跑 13/13**（node 端 `module.exports` 會 early-return，`open()`/`renderInto()`/`rowOf()` 這條玩家真正看到的路徑在 node 測項裡完全沒被執行過）：空登記表開得起來且顯示空狀態、`when()=false` 不進 DOM、整群被藏時分群標題不渲染、函式 body 渲染的是活值、action 鈕真的呼叫擁有者的 `run()`、搜尋輸入後只留命中者。④ 新增的 10 個 class **全部有對應 CSS**、CSS 用到的 15 個 token **全部存在於 tokens.css**（機械確認，防死 class／死 token）。
    - ⚠️ **驗證誠實聲明**：排程輪起不了 dev server（沙箱拒無人值守 preview）⇒ **無瀏覽器 e2e、無視覺目視**。面板的實際排版（間距節奏、長文字換行、≤720px 窄寬）**本輪未經任何人眼或真實渲染引擎確認**，shim 驗的是結構與行為、不是像素。⇒ **下一個可靠 preview 之輪請優先目視此面板**（桌機 + ≤720px 兩態），這是本輪最大的未驗證面。

73. 🟦已批准待做 **進度解鎖「內容」而不只是「錢」（等級門檻 → 解鎖任務／賽事／品項）** — S–M — 來源：**Deal or No Deal Win 2026-08-06 刷新**——其 7 段 Stars 階梯明載高階「**可解鎖 hidden missions 與 tournaments**」。~~⚠️ 誠實標註：目前為單平台佐證~~ → **已升為三平台佐證（2026-08-06 · 撤回單平台標註）**：**Jackpotter**（Instant Rakeback 全段位、但 Daily 需 Sorcerer+／Weekly 需 Mage+／Monthly 需 Wizard+＝**獎勵節奏隨段位解鎖**）＋ **GoKong**（**cashback 只有 L3/L4/L5 才有**，5%/10%/15%）。⇒ 佐證形制三站各異（內容解鎖／節奏解鎖／福利門檻），與 #63 同型的「可註冊述詞」抽象更站得住；優先序可上調，仍列於 #72 之後只因 #72 是它的顯示出口。
    - 問題（本輪機械實證）：ApexWin 的段位獎勵**全部是金額**——`progress.js` `RANKS[].reward`（段位大獎）＋ `LEVEL_REWARDS`（子級小獎）＋ 返水率隨段位放大，**零「內容型」解鎖**。⇒ 玩家爬 VIP 的唯一動機是「錢變多」，而**「解鎖了新東西可玩」是更便宜、更耐久的動機**（不增送幣成本，與 §11 真金前收斂方向一致）。
    - 範圍（純前端 · **述詞優先，勿硬寫 if 等級**）：一個**可見性述詞**掛到既有註冊表——`HL.tasks` 的 `DAILY`、`HL.tournament`、`HL.shop` 的 `CATALOG`、`HL.achievements` 各加一個選填 `unlockAt`（VIP 段位索引或成就點數門檻）；未達門檻者**顯示為鎖定佔位（可見但不可用）而非隱藏**——看得到才有動機，藏起來等於沒做。
    - **與 #54 的關係（勿合併）**：#54 `release.js` 已有「受眾述詞表」做上架分群，本卡是**同一族的第二個消費者**；實作時**優先評估直接複用 #54 的述詞表**（若可複用，本卡由 S–M 降為 S＝又一張「接線卡」）。**這條評估必須寫進落地紀錄**，別默默另起爐灶。
    - 經濟安全：**只改可見性，不改任何金額**；鎖定品項解鎖後的價格/獎額與現行完全一致 ⇒ 零經濟風險、可 flag 停用。
    - ↳ **(2026-08-06 平台軌 14:00 窗) 升為兩平台佐證**：**Jackpotter** 的獎勵**節奏**依段位解鎖（Instant Rakeback 5% 全員／**Daily 需 Sorcerer+／Weekly 需 Mage+／Monthly 需 Wizard+**）＝低階拿不到「每週/每月」這個節奏本身，與 DoND 獨立收斂 ⇒ 卡首「誠實標註：目前為單平台佐證」一句**已可撤下**（保留原文以存稽核痕跡）。附帶新範圍建議：`HL.reload`（週期紅利）也應成為 `unlockAt` 的消費者之一。
    - ↳ **(2026-08-11 平台軌 14:00 窗) 第四平台佐證＝Crown Coins**：其 **Premium Store 需 Gold 階以上才開放**＝把「**商城品項**」納入段位解鎖，是本卡目前四個佐證中**唯一指向 `HL.shop`** 的一個。⚠️ 實查後的重要收窄：ApexWin 的 `shop.js` **已有 `VIP_DISCOUNT`（依段位打折）但無 `minTier`（依段位開放品項）** ⇒ 這**不是缺口而是同軸不同做法**（折扣 vs 可見性），本卡若動 shop，應是**在既有 `VIP_DISCOUNT` 旁加一個可見性述詞**，而不是另建一套段位邏輯。此判斷寫進卡體以免後續輪把它誤判成「shop 完全沒有段位概念」。

> 🤖 **以下由自我進化引擎「平台軌」自動開卡**（2026-08-06 **14:00 窗** · 來源：capyspin **tier-3 到期補刷**〔全庫當時唯一逾期〕+ **jackpotter 新平台取材**〔LIVE overdue 歸零後改「深挖 1 + 新取材 1」〕+ `intel/db/platform-modules.json` **後台** 分類審〔7 模組全審，該分類 `last_audited` 08-03＝全 8 分類最舊〕）。全自動模式下標 🟦已批准待做。

74. ✅完成（2026-08-06 · 平台軌 20:00 窗 · commit 見下方日誌） **紅利流水倍數成為 VIP 維度（條款軸，不是金額軸）** — S–M — 來源：**Jackpotter 2026-08-06 首次取材**（VIP 專屬 **wager-free／極低流水** 獎勵、BOX free spins 常為 no-wagering，並作為 VIP 賣點行銷）+ **2026-08 crypto 榜通則**（「loyalty bonuses include … **lower wagering requirements**」）+ **betpanda 08-05**（反例：80× 流水/7 天到期＝流水條款本身就是產品）。
    - 問題（本輪 grep 機械實證）：`core/progress.js:31` `var WAGER_MULT = (HL.site && HL.site.isLive()) ? 8 : 1;` ＝**扁平常數**，只分站別、**完全不分 VIP 段位**，且是 **module 級 `var`、載入期一次求值**（連動態改都做不到）。全站唯一的流水豁免是 `badd(n, {wagerFree:true})`＝**由「來源」決定**（#33 cashback 等），**不是由「玩家段位」決定** ⇒ **鑽石玩家與青銅玩家的解鎖門檻一模一樣**。
    - 為何是高槓桿：**#63 `HL.sla` 已經確立「VIP 決定條款」這條軸並做成可註冊維度表**（提領時效／日週月額度／客服層級），本卡是**它的下一個維度**（`bonusWagerMult`）⇒ 幾乎不需新架構，是一張**接線/擴表卡**。而且它**不增加任何送幣量**——只讓高階玩家「早一點拿到本來就會拿到的錢」，與 §11 真金前收斂方向相容（甚至可設計為真站整體**更緊**：低階 10×、頂階 6×，平均仍 ≥ 現行 8×）。
    - 範圍（純前端）：① `WAGER_MULT` 由常數改為**依段位查表的函式**（`multFor(vipIndex, mode)`），註冊進 #63 的維度表；② `badd()` 在建立 entry 時以**當下段位**求值並**寫進該 entry**（`req` 一旦寫定就不再變＝**避免降段追溯加重玩家門檻**，這是必須寫成測項的不變量）；③ VIP 福利矩陣與 #72 說明中心各加一欄「紅利流水倍數」。
    - ⚠️ **實作前必讀的三個不變量**（否則會製造信任問題或經濟漏洞）：(a) **已建立的 entry 其 `req` 不得因段位變動而上調**（可下調或維持，但絕不上調）；(b) **真站任一段位的倍數不得低於「真站平均 ≥ 現行 8×」的成本中性線**（比照 #60 `rakeback-core` 的成本中性測項寫法）；(c) 段位越高倍數**單調不增**（比照 #63 `sla/monotone-service`）。
    - **必須同步修的過期斷言**：`views/ops-dashboard.js:69` 的規則健檢字串硬寫「紅利流水 WAGER_MULT 真站 8×（假站 1×）」——本卡落地後該行即成**過期斷言**（與 `ai-concierge` 曾指向不存在 UI 的舊案同型）。
    - **✅ 落地（2026-08-06 平台軌 20:00 窗）**：新維度 `bonus-wager-mult` 註冊進 #63 `HL.sla` 維度表（`kind:"info"`、`better:"lower"`、`fmt` 出 `10×`），值＝**假站 `[1,1,1,0.75,0.5]`／真站 `[10,9,8,7,6]`**；`progress.js` 的 `var WAGER_MULT` 由**扁平常數**改為求值出口 `reqFor(n)` →（有 `HL.sla` 時）`HL.sla.bonusReqFor(n)`，**只在 `badd()` 建立 entry 時求值一次**。
      - **三個不變量全部做成機械閘**：(a) **凍結**＝`sla/bonus-wager-frozen` 用「誰引用了求值出口」鎖住結構（`bonus.add` 必含 `reqFor(`、`bonus.onWager`／`bonus.status` 必**不含**）＋真實 e2e（青銅建 1,000 → `req=1000`；升鑽石後**同一筆仍 1000**；鑽石新建一筆 `req=500`；押注 1,000 恰解鎖第一筆）；(b) **真站成本中性**＝`live` 平均 `(10+9+8+7+6)/5 = 8.0` **恰等於**改制前扁平 8×，測項斷言 `mean ≥ 8`；(c) **單調不變差** 由既有 `sla/monotone-service` 自動涵蓋。**另加一條反向護欄**：任一段位倍數**不得為 0**（0× ＝依段位的零流水後門；`wagerFree` 只該由「來源」決定）。
      - **假站零退步**：`demo` 任一段位 `≤ 1×`（改制前值）⇒ 既有玩家門檻只可能持平或變鬆；白金 0.75×／鑽石 0.5× 是**唯一的行為差異**（同一筆獎金更早解鎖，**金額一分不變**）。
      - **驗證**：node **77→79**／瀏覽器 **61→65**（新增 2 both + 2 browser）；**負向擾動 6/6 全被抓**（真站平均降 6×／假站青銅 2×／真站非單調／鑽石 0×／真站比假站鬆／`Math.round`→`floor` 使 1 元紅利變零流水）；三語逐項驗（EN `Bonus wagering`／HANS `红利流水`、EN 面板零 CJK 殘留）；375px 與 1280px 皆**零折行零裁切、頁面本體不橫捲**。
      - ⚠️ **UI 副作用與修法（值得記的一條可重複踩的雷）**：VIP 福利矩陣由 4 欄變 5 欄後，純 `fr` 的 grid 變成**打地鼠**——調寬等級欄 → 表頭「紅利流水」折行 → 再調 → 「NT$ 15,000」折行（實測三輪）。正解＝**`minmax(<內容下限>, <fr>)` + `white-space:nowrap` + 容器自身 `overflow-x`**（窄機表格自己捲、**頁面本體永不橫捲**）。已寫進該段 CSS 註解並記入台帳「設計系統」。
      - **同步修掉的過期斷言**：`ops-dashboard.js` 規則健檢改述現制（真站 10×→6×、平均 ≥ 舊制 8×）。**未做**卡上第③項的「#72 說明中心加一欄」——**#72 尚未實作**（卡還在佇列），故只做 VIP 矩陣那一半，等 #72 落地時一併補。

75. ✅完成（2026-08-07 · 平台軌 08:00 窗 · commit 見下方日誌） **進度加速器（Pass／Booster 作為 `HL.progressSrc` 的乘數層）** — S — 來源：**CapySpin 2026-08-06 刷新**——其 Monthly／Season Pass 賣的是「**extra daily login rewards and climb the ranks of the VIP program that much faster**」＝**賣進度速度，不是賣獎金額度**。
    - 問題（本輪 grep 機械實證）：ApexWin **有季票但它不加速進度**——`core/season.js` 的進階軌（`prem`）解鎖後給的是**更大的獎金**（`tier.prem.bonus` 現金），`s.prem` 只影響**可領什麼**，**完全不影響 XP 累積速度**；全站唯一的進度乘數是 #50 `HL.edge`（依**遊戲**加權），**沒有任何「玩家層級的進度乘數」**。⇒ 「加速成長」這個在對標平台上可販售/可獎勵的維度，ApexWin 目前無處可掛。
    - 範圍（純前端 · **本卡是 #65 的自然第二個消費者**）：在 `HL.progressSrc` 加一層**乘數註冊表** `HL.progressSrc.registerBoost({ id, mult, until?, sources?, siteAware })`，`grant()` 求值時套用「取最大不相乘」（**直接沿用 #52 `rakeboost` 已確立的疊加紀律**，勿改成相乘）；首批消費者＝季票進階軌（`s.prem` → 1.2×）與 #49 促銷日曆可排程的限時加速檔期。
    - ⚠️ **經濟安全（與 #65 同一條紅線）**：乘數**只作用於進度**，一行都不得碰金額；**真站乘數上限必須 ≤ 假站**且需重跑 #65 的 `live-no-purchase-xp` 恆等式（真站非投注來源仍須恰 0——**乘數不得成為繞過該 0 的後門**，這條要寫成測項：`grant(非投注來源, live)` 在任何 boost 下**仍恆為 0**）。另須沿用 `cap` 日上限（乘數不得穿透上限）。
    - 為何值得做（低成本）：#65 已把「什麼行為換多少進度」收成一張表，本卡只是在同一個 `grant()` 出口上加一個乘數欄位 ⇒ **不改任何呼叫端**。同時它讓 #46 季票的進階軌從「只是錢比較多」變成「成長比較快」＝對標平台公認更耐久的動機。
    - **落地（2026-08-07 平台軌 08:00 窗）**：`core/progress-src.js` 加第二層＝**加速註冊表**（`registerBoost`／`activeBoosts`／`boostMult`／`unregisterBoost`），`grant()` 改走新的 `xpForBoosted(id, amount, mode, usedToday, boostMult(id))`。**呼叫端一行未改**（liveStats／儲值／簽到三處原封不動）。
      - **首批兩筆種子**：① **季票進階軌 ×1.2**（`s.prem` 解鎖後生效＝#46 的進階軌從「錢比較多」變成「成長也比較快」）② **#49 促銷日曆的 opt-in 限時加速 ×1.5**（6 小時、每日限加入一次）⇒ **`promoCal.register` 的外部註冊者 2 → 3**（前兩個為 rakeboost／release；這正是台帳連兩輪盯的「容器採用度」指標，本輪首次由平台軌自己推進）。
      - **四條不變量全部機械化（不是宣稱）**：**(a) 取最大不相乘**（沿用 #52 `rakeboost` 紀律，1.4 與 1.2 並存 ⇒ ×1.4 而非 ×1.68，preview 面板肉眼可見）；**(b) 真站零加速＝恆等式**——純核心 `BOOST_CAP.live = 1.0` 把真站夾死，**任何註冊（含刻意傳 ×9、×1e6）都無法加速真站**，真站 XP 流入與落地前**逐位相同**；**(c) 乘數不得穿透每日上限**（先乘後夾，加速只是更快撞上限：儲值帶 ×1.5 仍恰得 20,000）；**(d) <1 的乘數不得減損進度**。
      - **經濟安全的理由與 #65 同一條紅線**（寫進檔頭）：加速真站進度 ⇒ 每單位真實莊家收入對應的 XP 上升 ⇒ VIP 升級金與季票獎勵的**每單位成本送出額**隨之上升（牴觸 §11）。未來要開啟真站加速，前提同 #65＝先有能算出該行為期望莊家收入的模型，屆時只改一個數字。
      - **驗證**：node **84→88**（+4 both-env）／瀏覽器 **65→71**（+2 browser：`boost-wired` 接線鎖、`panel-opens` 面板實開鎖）；**負向擾動 7 項中 6 項被抓**（真站上限鬆綁／改成相乘／移除上限夾子／穿透每日上限／假站上限降為 1＝死碼／grant 不走加速出口）。**第 7 項誠實記錄為「不可達」而非測項漏洞**：拿掉 `best < 1 ? 1 : best` 下限夾子後測項仍全綠，因為 `var best = 1` 的初值本身就保證了下限 ⇒ 該行是防禦性冗餘（`rakeboost.resolve` 同形）。
      - **真實 e2e（preview）**：未加速 `grant("wager",1000)` → VIP／賽季各 +1000；加入促銷 → `boostMult()` 1 → **1.5**、`activeBoosts()` 顯示 `progress-boost×1.5`；再 `grant("wager",1000)` → 各 **+1500**；兩次的**餘額 delta 與帳本送幣成本 delta 皆恰為 0**（只發進度不發錢）；`grant("deposit",1e9)` 帶加速仍恰 **20,000**（上限未被穿透）；離開促銷 → 倍率回 1。
      - **三語 + 響應式**：新增 **9 EN／8 zh-Hans** 鍵（`其他符合但未套用的加速：` 逐字簡繁同形故刻意不列 HANS＝避免 U31 型等值死鍵；術語對齊 rakeboost 同族的 boost/qualify 用字）；EN／zh-Hans 面板逐項驗**零繁中殘留**；375px **零元素溢出、頁面本體不橫捲**；零新 console error。
      - ⚠️ **一條量測法陷阱（本輪踩到並記下）**：`i18n` 的翻譯發生在 **MutationObserver 回呼**（微任務非同步）⇒ 在**同一個 eval 內**「setLang → open → 讀 innerText」會讀到**尚未翻譯**的畫面，看起來像 EN 完全沒生效。正確做法＝**設語言/開面板與讀取分成兩次呼叫**。這與 08-06 記的 `HL.dock.ids()` 執行期回 `[]` 同族＝**量測時機錯了會誤判功能壞掉**。

76. ✅ **每日獎「揭曉化」（等期望值改造：固定值 → 走 `HL.reveal`／`luckyspin` 呈現）** — S　`(2026-08-10)` — 來源：**兩平台共識（2026-08-06 平台軌 20:00 窗）**——**Legendz `Daily Drop`＝Plinko 式掉落**（「drop a ball and keep whatever prize it lands on」，且直接餵忠誠進度）＋ **GoKong `Bonus Crab`＝爪機式揭曉**（抓到不同物件對應紅利/現金/free spins/Coins）。
    - 問題（grep 機械實證）：`core/rewards.js` 的 `LADDER` 是**30 天固定值遞增**（100→17,500 + 第 8/15/22/30 天里程碑大禮），`ladderReward(streakDay)` 直接回一個數 ⇒ **每日簽到永遠是「按一下、看到一個早就知道的數字」**。而**零件全在位**：`core/reveal.js`（#38，三樣式 + #66 里程碑層）與 `core/luckyspin.js` 都已落地，`rewards.js` **零引用**（grep `reveal|luckyspin` 於 rewards.js 命中 0）⇒ 這是**接線卡，不是新功能卡**。
    - ⭐ **為何這一輪可以開、上一輪（08-05 zonko）刻意沒開**：當時的否決理由是「會動送幣期望值與帳本成本歸屬」。**本卡把約束寫成恆等式即消除該理由**：揭曉的權重分布**必須**滿足 `Σ(pᵢ · prizeᵢ) == ladderReward(day)`（同一天的期望值逐位相等）⇒ **純呈現改造、零經濟變動**、帳本 `bonus` 成本歸屬與送幣總量完全不變。
    - 範圍（純前端 · 容器先於內容）：① 在 `rewards.js` 加一層 `revealPlan(day)`＝把當日固定值攤成 3–5 個權重獎項（例：0.6×/1×/1.5× 三檔，權重使期望值恰為 1×，**尾巴檔不得超過當日值的 3 倍**避免第 1 天就給出第 30 天的量級）；② 呈現走既有 `HL.reveal.show`（不自刻動畫）；③ **必須是可關的**（`HL.rewards` 加一個 flag／或走 #49 促銷日曆排程「本週簽到揭曉」檔期）＝不啟用時退回現行固定值行為。
    - ⚠️ **必寫成測項的不變量**：(a) **期望值恆等** `Σ(p·prize) == ladderReward(day)` ∀day ∈ [1,30]（浮點用整數分配：權重乘完後**以整數配額湊足總量**，勿依賴四捨五入）；(b) 權重和恆為 1；(c) **最小獎不得為 0**（簽到給 0 ＝反面教材，見 capyspin「餘額低時彈窗沒完沒了」那類體驗禁區）；(d) 真站/假站共用同一恆等式（本卡不引入站別差異＝沒有新的經濟旋鈕）。
    - 來源：`intel/platforms/legendz.md`（2026-08-06 深挖）＋ `intel/platforms/gokong.md`（2026-08-06 新取材）。
    - **✅ 落地（2026-08-10 平台軌 catchup 輪）**：`core/rewards.js` 加揭曉層（純數學區 + `module.exports` 雙環境契約，比照 `reveal.js`／`edge.js` 家族），`core/reveal.js` 加一個**選配 `note`**，`tests/run.js` 掛入本檔測項。
        - ⭐ **期望值恆等做成「純整數等式」而非四捨五入湊數**：關鍵觀察＝`LADDER` 全為 **50 的倍數** ⇒ 必為 10 的倍數 ⇒ 可取整數單位 `u = R/10`，把每檔寫成 `cᵢ×u`（cᵢ 整數）、權重 `wᵢ` 整數（分母 100），恆等式即化為**與 R 無關**的整數等式 `Σ(wᵢ·cᵢ) == 1000`。實配 **35%×0.6 + 30%×0.9 + 25%×1.2 + 8%×2.0 + 2%×3.0** ⇒ `35·6+30·9+25·12+8·20+2·30 = 1000` ✓ ⇒ **∀day∈[1,30] 期望值逐位等於階梯值、零浮點誤差、無殘差配額**（卡上「勿依賴四捨五入」的要求被結構性滿足，而不是靠測試容忍度）。
        - **卡上四條不變量全數機械化**：(a) 期望值恆等（測項比的是 `Σ(w·prize) === R×100` **整數等式**，不是浮點近似）；(b) 權重和恆為 100；(c) 最小檔 0.6× **>0**（簽到給 0 ＝體驗禁區）；(d) 真/假站**共用同一份分布**＝本卡不引入任何站別差異、零新經濟旋鈕。另加兩條卡上未列但必要的護欄：**尾檔恰 3.0×（不得超過當日值 3 倍）** 與 **不得有權重 0 的死檔**，以及「必須同時存在低於／高於當日值的檔」（否則揭曉毫無張力）。
        - **可關**：`HL.rewards.setReveal(false)` ⇒ **逐位退回改版前的固定值行為**（e2e 實證：關閉時第 1 天實發恰 100＝階梯值、`claimedTier` 為 null）。
        - **誠實呈現（卡上未要求但不可省）**：階梯格仍顯示 `ladderReward`，但揭曉開啟時面板多一行「今日獎勵以揭曉方式發放 · 平均值與階梯相同」——否則玩家看到「+1500」卻抽中 0.6×＝900 會（正確地）覺得被騙。**這是恆等式的表裡兩面：數學上不變，但必須讓玩家知道那是平均值。**
        - **驗證**：node fast **92→95**（3 新測項，全 95/95 PASS）；**負向擾動 9/9 全被抓**（權重和／期望值兩向破壞〔偷減與偷送〕／最小獎變 0／尾檔超 3 倍〔**且該案刻意同時調權重維持期望值恆等 ⇒ 只有 3× 上限那條測項能抓到，證明它獨立有價值**〕／權重 0 死檔／全檔位皆 1.0× 張力消失／抽取切點 `<` 誤為 `<=`／單位除數 10→7）。**preview 實證**：browser==node（`revealEV(7)=1500` 與 node 逐位相同、檔位 900/1350/1800/3000/4500）；**真實 e2e ⇒ 餘額 delta == 帳本 `bonus` delta == 實發額**（60，`0.6×`）＝**帳本記的是實發額而非階梯值**（成本歸屬正確）；**20 萬次走真實 `HL.fair.floatOr` 路徑**觀察頻率 35.20/29.83/25.12/7.92/1.93% vs 期望 35/30/25/8/2%、樣本均值 1496.04（−0.264%＝純 MC 噪聲，解析 EV 恆為 1500）；面板 30 格完整、EN 三處新舊字串全翻（含新增的誠實說明行）；`reveal.show` **不給 `note` 時文案逐位不變**＝既有 4 個呼叫端零回歸；375px 面板內**零元素溢出**。sw **v153→v154**。
        - ⚠️ **誠實記兩筆既存債（非本卡引入、已複驗）**：① 階梯格「第N天」是 `t("第")+day+t("天")` 串接成單一文字節點 ⇒ **EN 下仍顯示中文**（30 格），屬 CLAUDE.md §4／#55 已載明的 P3 陷阱、全站同型；② 375px 下 `documentElement.scrollWidth` 為 376（1px），**開啟面板前後皆同** ⇒ 與本卡無關的既存 1px。兩者皆宜由維護軌統一處理。

77. 🟦已批准待做 **「完成量」本身成為一層獎勵（meta-mission：本期完成 N 個任務再給一階）** — S–M — 來源：**GoKong 2026-08-06 首次取材**——40+ 挑戰（每週型 + 一次型）之外，**每週完成 20 個／40 個挑戰另有額外 Coin 獎**＝獎勵的不是「你完成了哪個任務」，而是「**你完成了幾個**」。
    - 問題（grep 機械實證）：ApexWin 有**兩套**日常系統且**各自只獎勵單一達成**——`core/progress.js` 的 `HL.tasks`（`DAILY` 次數/金額型，逐項 `claimed[id]`）與 `core/challenges.js` 的 `HL.challenges`（`DAILY` 單局倍數型，逐項 `claimed[id]`）。**「期間內完成計數」這個維度完全不存在**：`HL.achievements`（#45）是**終身**里程碑、`HL.season`（#46）是 **XP 總量**，兩者都不是「本週完成幾個任務」。
    - 為何值得做（低成本高槓桿）：它把**兩套既有系統的完成事件**接到同一個計數器上 ⇒ 玩家有理由把當日任務**做完而不是只挑最肥的一個**；且**不需要新的送幣來源**——階梯獎可直接走 `HL.bonus.add`（帶 `source`），成本在帳本上可歸屬。
    - 範圍（純前端 · **容器先於內容**）：① 計數器＝`HL.tasks.progressCount(period)`（`day|week`，沿用 `#63/#70` 已確立的期間口徑，勿再造第三套桶）；② **階梯是註冊表**（`registerCountTier({ id, period, need, reward, source })`）而非硬寫 20/40 兩個門檻 ⇒ 加一階＝加一筆 spec；③ 兩套系統的領取端各呼叫一次 `bumpCount()`（**在「領取」而非「達成」時計數**——避免達成後不領也算，且與既有 `claimed[id]` 語意一致）；④ 面板：任務中心加一列「本週已完成 X / 下一階 N」。
    - ⚠️ 實作前必讀：(a) **同一個任務不得被計兩次**（`claimed[id]` 已是天然的去重鍵，計數必須綁它）；(b) **真站送幣量**須比照 #60/#65 做成本中性檢查（階梯獎在真站應顯著小於假站，或直接 0＝先只做假站）；(c) 跨期歸零只清該期桶（比照 `sla/period-rollover`）。
    - 來源：`intel/platforms/gokong.md`（2026-08-06 新取材）＋ platform-modules「任務/成就/簽到」（present，但缺此維度）。

78. 🟦已批准待做 **彩金參與＝可選加注的「資格軸」（把隱形抽水變成明示選擇）** — S–M — 來源：**Card Crush 2026-08-07 複查**——其社群彩池是 **opt-in 側注**：slot 每轉**多付 0.1 MC** 才取得四級彩池（Mini/Minor/Major/Grand）的中獎**資格**，官方保證池 ≥50,000 MC（實測見 108,000+）。
    - 問題（grep 機械實證 `core/jackpot.js`）：ApexWin 的彩池是**隱形抽水 + 無條件資格**——`onBet()` 從**每一筆下注**按比例抽（假站 mega/major/mini＝0.5%/0.3%/0.2%、真站 0.15%/0.1%/0.05%），命中判定對所有下注一律生效。⇒ 玩家 **① 不知道自己在付 ② 不能選擇不付 ③ 沒有「因為付了才有資格」的對價感**。三級 vs 四級只是數量差，真正缺的是**資格軸**。
    - 範圍（純前端 · 容器先於內容）：① `HL.jackpot` 加 `eligibility` 維度（`always`＝現況／`optIn`＝需加注），旗標與加注率**皆為 config**、預設維持 `always` ⇒ **不啟用時行為逐位不變**；② opt-in 開關掛在下注面板（`HL.instant` 的 betPanel 與 `HL.table` 共用出口），並在 `game-frame` 的 📈/⚙ 面板顯示「本局是否具彩池資格」；③ 透明度：把「你每注貢獻了多少彩池」做成 #72 說明中心的一條（本卡與 #72 天生互補）。
    - ⚠️ **必寫成測項的不變量**：(a) **未啟用 opt-in 模式時，貢獻率與命中機率與現制逐位相同**（零回歸）；(b) 啟用後，**未加注者既不貢獻也不可命中**（不能只拿掉資格卻繼續抽水＝那會比現況更差）；(c) 加注額**進池、不進莊家收入**（`HL.ledger` 記 `jp_seed` 而非 GGR），且真站的加注率 ≤ 假站；(d) 冷靜期／#67 限額生效時，opt-in 加注**一併被擋**（它是下注的一部分）。
    - 為何值得做：它同時是**透明度**（#72 家族）與**負責任博弈**（#67 家族）議題——把一筆玩家看不見的成本變成一個看得見的選擇，且**期望值可設計成不變**（加注率 = 原抽成率時，願意付的人拿到的是「本來就被抽走的錢換來的資格」）。
    - 來源：`intel/platforms/card-crush.md`（2026-08-07 複查）＋ platform-modules「累積彩金」。

79. 🟦已批准待做 **自選目標合約（玩家自己挑目標 + 期限 + 達成才付）** — S–M — 來源：**Cybet 2026-08-07 首次取材**——其 VIP Mission Mania 讓玩家**自行挑一個 30 天 XP 里程碑**，達成即付 $600–$3,000，期間另有 10–15% 淨損回饋。
    - 問題（grep 機械實證）：ApexWin 的**每一個**進度目標都是**平台出題**——`progress.js` 的 `HL.tasks.DAILY`（固定次數/金額）、`challenges.js` 的 `HL.challenges.DAILY`（固定單局倍數）、#46 賽季軌（`buildTiers` 固定 XP 階梯）、#45 成就（固定終身里程碑）、#15 錦標賽（押注量榜）。⇒ 玩家**唯一的選擇是要不要做**，從不參與「**做什麼／做到多少／在多久內**」。這個「玩家自選 + 承諾 + 期限」維度完全不存在。
    - 範圍（純前端 · **註冊表而非硬寫幾檔**）：① `registerContract({ id, metric, targets[], windowDays, reward, siteAware })`——`metric` **直接複用** #65 `HL.progressSrc` 的 XP 或 `HL.vip.status().wager`（**不新建計量設施**）；② 玩家從目錄挑一筆「簽下」，狀態機僅三態（`open → signed → done|expired`）；③ 到期結算走 `HL.bonus.add` 帶 `source`（帳本可歸屬成本）；④ 面板：#49 促銷日曆與成長 dock 面板各一個入口（**不新增第三個入口**）。
    - ⚠️ **必寫成測項的不變量**：(a) **同一時間只能有一份生效合約**（否則變成「全簽一輪必中一個」＝送幣失控）；(b) 簽下後**目標與期限凍結**（比照 #74 `req` 一旦寫定不隨段位變）；(c) **逾期即失效且不退**，跨期歸零只清該期桶（沿用 #63/#70 期間口徑）；(d) 真站獎勵須顯著小於假站或先只開假站（比照 #60/#65/#77 的成本中性檢查）；(e) 目標值必須**依玩家近期水準生成或分級**，不得出現「必達」或「不可能達成」兩種極端（前者＝白送、後者＝反體驗）。
    - 可選第二段（同卡不同階）：Cybet「合約期間淨損回饋」做成 spec 的**選配欄位**，實作委派既有 #48 `safetynet` 或 #33 cashback，**不新增第二套回饋演算**。
    - 來源：`intel/platforms/cybet.md`（2026-08-07 新取材）＋ platform-modules「任務/成就/簽到」（present，但缺此維度）。

80. ✅ **內建遊戲延遲載入（首屏 code-splitting 容器）`HL.lazyGames`** — M — 來源：**船長指令 [M8]（2026-08-07 12:00 維護軌引擎健檢·點名平台軌）**——首屏 **1557KB / 97 scripts**，距 M6 硬門檻 1600KB 僅剩 43KB，近日成長 **+20~48KB／平台輪** ⇒ 預估 1–2 個建置輪內觸警；因涉載入架構故屬平台軌職責。　`(2026-08-07)`
    - 問題（node 機械實證）：`index.html` 靜態掛載 97 支 `<script>`，其中 **33 支在 `src/views/`＝464KB**，但玩家開站只看到大廳 ⇒ **遊戲程式在首屏一行都用不到**。既有唯一的延遲載入是同仁放置區（`games/registry.json` + `games-loader.js`），**內建遊戲完全沒有對應機制**。
    - 做法（容器先於內容·與放置區同構）：新增 `src/data/lazy-games.js`（`HL.lazyGames`）把「大廳卡需要的 meta」與「遊戲程式本體」拆開——MANIFEST 每列 `{src, games:[meta…]}`，開機以 meta + **stub render** 註冊進 `HL.games`（卡照樣出現、可點），玩家**第一次開啟**該遊戲才注入 `<script>`。**換手機制＝view 檔自己那句 `HL.games.register`**（同 id 覆蓋 stub）⇒ **19 個 view 檔零改動**。stub 同步回傳「載入中」占位（`render` 契約要求同步回節點），載完若玩家仍停在該款則 `HL.app.refresh()` 重繪出真畫面。
    - 成果：**1559KB / 97 支 → 1338KB / 78 支（−221KB／−19 支）**，門檻餘裕 41KB → **262KB**；移出 19 檔／**22 款遊戲**（instant 12＋table 6＋slot 4 家族全覆蓋）。**新增內建遊戲＝MANIFEST 加一列**，不必改 `index.html`、不必改核心。
    - 防呆：注入失敗／清單 id 指錯 → 顯示「載入失敗，請稍後再試」且**不重繪**（`_state==='done'` 時 render 仍是 stub 即判定，stub 帶 `__lazyStub` 標記）＝**無無限迴圈**；只在「玩家仍停在該款」時 refresh；會員未登入時不 refresh（沿用 `games-loader.js` 的 gate 判斷，避免蓋掉登入頁）。
    - 迴歸鎖（新增 `prototype/tests/checks-platform.js`，node fast **89→92**）：① `platform/lazy-games-manifest` 清單完整性（src 存在／id 不重複／**不得同時還靜態掛載**／容器已掛／不得帶 route 或 render）；② `platform/lazy-games-meta-parity` **漂移鎖**——靜態解析（brace matching）view 原始碼的 `HL.games.register` meta 與清單**逐欄比對**（因 register 呼叫在 DOM guard 之後、node require 拿不到，故不能用 require）；③ `platform/first-screen-budget` **把 M6 的手動 node 一行量變成會 FAIL 的常駐閘**（>1600KB 或 >120 支）＝[M8] 這類「觸警前無人知」的缺口從此有機械閘。**負向擾動 9/9 全被抓**。
    - 驗證（preview 實測）：**載入前後 66 張卡 × 15 欄快照逐位相同（0 差異、66/26 → 66/26）**＝大廳不可區分；開機**零延遲檔被抓取**（network log 確認）且 `HL.cases/towers/keno/pirots/gemStorm/goldenToad/deadByNoon` 全部**不存在**＝真的沒載；Keno 走真實玩家路徑（點卡→`launch`→`goGame`）**占位→換手→真棋盤**完成、`stubStillThere:false`、公版返回鈕在；baccarat（賠率表齊）／gem-storm（**🔒 保真旗標仍在**＝G4 白名單未受影響）／towers 皆正常；**中央結算鏈完整**（延遲載入的 dice 走 `liveStats.record` 後 turnover/GGR/betCount/JP 累積/VIP 全部前進）；375px 占位與真畫面**零溢出、頁面本體不橫捲**（38 個 flagged 節點全為既有 `ax-bottombar`〔自身 `overflow-x:auto`〕與關閉的 `ax-drawer`）；零新 console error。sw **v152→v153**。
    - ⚠️ 已知取捨（誠實記）：瀏覽器測項 `games/buyin-price-single-source` 在四款買入 slot 尚未載入時**由 PASS 轉 SKIP**（該測項原本就寫了 `if(!checked) t.skip(...)`＝作者已預期此情形）。**數值正確性不受影響**——買入 RTP 的權威覆蓋在 node 的 `tests/checks-games.js`（直接 require 檔案、與載入時機無關）；開過遊戲後該測項即恢復 PASS，亦可用 `HL.lazyGames.loadAll()` 先備齊。
    - 下一步（已寫進 platform-modules「首屏載入架構」的 `stowable_note`）：① 仍靜態的 `ops-dashboard/bounty/arena/vsslot/liveroom/global-prize`（約 114KB）也非開站必要，但走 `HL.views[route]` 出口 ⇒ 需為 **route 型出口**補一個對應 stub；② **`core/i18n.js` 151KB＝全站最大單檔**（引擎＋EN＋zh-Hans 綁一起，而**預設 zh-Hant 一份字典都不需要**）⇒ 按語言拆檔可再省約 140KB，且「加語言＝加檔」才是正確 i18n 擴充形制；動它需注意 §4 的 SW/HTTP 快取餵舊檔陷阱。

81. ✅完成（2026-08-10 平台軌 **20:00 窗**建置輪） **加成的「觸發軸」：領取即開窗（`HL.rakeboost` 的窗口能力化）** — S–M — 來源：**Rollbit 2026-08-10 刷新**——Rewards Calendar **每領一次 → 隨即 +15% Rakeboost 持續 60 分鐘**（官方 blog + 評測雙源一致），**可重複觸發、一天多次**。
    - 問題（grep 機械實證 `core/rakeboost.js`）：#52 的註冊表形制正確，但**三筆種子的觸發源只有三種且都不是「領取」**——`happyhour`＝排程、`newcomer`＝**註冊時間**（自刻 `HL_RB_NEWCOMER` 時間戳）、`rakeboost`＝**加入活動**（借 `promoCal.joinedAt`）。更根本的是：**「限時窗口」這件事本身沒有被容器化**——每筆各自手刻一份時間戳存取（一筆自刻、一筆借用），**第三筆要加就得再刻第三份**。
    - 為何值得做（行為迴圈，非數值）：ApexWin 的**每一個領取點都是死路**——簽到／任務／返水／VIP 升級金／#48 保險／#46 賽季領完就結束。Rollbit 把每次領取變成「接下來一小時快去玩」的個人窗口 ⇒ **把既有的一次性領取轉成一段有理由回來的遊玩窗**，不需要任何新的送幣來源。
    - 範圍（純前端 · **容器先於內容**）：① `HL.rakeboost.trigger(id)` 開一個個人窗口（時間戳走 `HL.dom.lsGet/lsSet`＝**自動獲得 #4 的真/假站命名空間隔離**，不再手刻）；② `registerTriggered({ id, ttlMs, mult, name, icon })`＝註冊即免費得到 `mult()/msLeft()`，**把 newcomer/optin 的手刻邏輯收斂進同一條路徑**（兩者可後續改寫為它的特例，本卡不強制重構）；③ 領取點只加一行 `trigger()`，**不動金流路徑**（沿用 #52 立下的「progress.js 只問一句 `mult()`」）；④ 呈現沿用既有 `summaryNode()` 與 #49 日曆。
    - ⚠️ **必寫成測項的不變量**：(a) **不引入新的經濟旋鈕**——新加成一律走既有 `resolve()`（**取最大不相乘**）與**站別 `CAP`**，故真站既有硬不變量 `maxPct(live) × CAP.live = 0.2175 < 1` **自動繼續成立**（這是本卡成本安全的**恆等式論證**，非宣稱）；(b) **未觸發時逐位零回歸**（沒有任何 `trigger()` 被呼叫時 `mult()` 與現制完全相同）；(c) **窗口不可無限展期**——同 id 重複觸發採「**取較晚到期**」而非累加時長，並設單日觸發次數上限（否則領 10 次＝10 小時加成＝變相全天加成）；(d) 真站 `ttlMs`／倍數須 ≤ 假站（比照 #60/#65/#74 的成本中性檢查）；(e) 跨站切換不得繼承窗口（命名空間已保證，但需一條測項釘死）。
    - 來源：`intel/platforms/rollbit.md`（2026-08-10 刷新）＋ platform-modules「促銷框架」。
    - **✅ 落地（2026-08-10 平台軌 20:00 窗）**：`core/rakeboost.js` 新增 `registerTriggered()` / `trigger(id)` / `triggerStatus(id)`；種子 `claimwindow` 掛在**每日簽到**領取點（`core/rewards.js` 的 `claim()` 內**一行**，金額路徑一字未動）。**零新 `<script>`** ⇒ 首屏成本與 M6/M8 門檻完全不受影響（1338KB/78 支不變）。sw `v154→v155`。
      - **五條不變量的落地與證據**：**(a) 不引入新經濟旋鈕**＝`CAP` **一字未改**（`{demo:3.0, live:1.5}`，有測項釘死）⇒ 真站硬不變量 `maxPct(live)×CAP.live = 0.2175 < 1` **自動續成立**（恆等式，非宣稱）；乘數改由 `MULTS` 中央表新增 `claim`（demo 1.5／live 1.15）。**(b) 未觸發零回歸**＝preview 實測 `mult()` **1**、`active()` **[]**（claimwindow 因 mult===1 不入 `active()`）。**(c) 窗口不可無限展期**＝`nextUntil()` **取較晚到期不累加**（node+browser 皆實測「連觸發 10 次後剩餘恰為一個 ttl」）＋**單日次數上限**（實測序列 `ok,ok,daily-cap`、`usedToday` 停在 4）⇒ 每日加成時間**硬上界＝ttl×max**（假站 4h／真站 1h，兩者皆為測項斷言）。**(d) 真站三維度皆 ≤ 假站**＝窗口 30 vs 60 分、次數 2 vs 4、乘數 1.15 vs 1.5。**(e) 跨站不繼承窗口**＝時間戳走 `HL.dom.lsGet/lsSet`（實測 `HL.site.ns()===""`、只存在 `HL_RB_TRIG`、**無** `r:HL_RB_TRIG`），並以結構測項禁止直接碰 `localStorage`。
      - ⭐ **刻意偏離卡上 API 草案（強化）**：卡寫 `registerTriggered({..., mult})`，實作**不收自帶乘數**，改為 `kind` → 查 `MULTS` 中央表。理由＝若每個註冊者能自帶數字，經濟數值就會散落到各呼叫端（＝#60 `RB_RATES` 更名事故的同型土壤）。連帶把既有測項的 `["newcomer","optin"]` 硬列改為**遍歷 `Object.keys(MULTS.demo)`** ⇒ **之後每新增一種 kind 都自動被「假站 ≥ 真站 ≥ 1」盯住**，並新增反向護欄「真站表不得漏登記某 kind」（漏登記會靜默退化為 ×1＝真站悄悄失效）。
      - **驗證**：node fast **95→98**；**負向擾動 10/10 全被抓**（累加時長／次數閘失效／真站更慷慨三種／偷放寬 CAP／真站表漏登記／每日上界被放大／跨日砍窗兩種）。⚠️ 其中「跨日砍窗」第一版擾動**是無效擾動**（改的那行會被下一行 `nextUntil(prevUntil,…)` 覆寫），追查後改擾動真正的來源行才成立——**擾動本身也需要被驗證**。真實 e2e：走 `HL.rewards.claim()` 使用者路徑 → 餘額 **+120 == `claimedAmount`**（金流未受影響）且窗口開 60 分、`mult()` 1→**1.5**；**同日二次 claim 不再開窗**（`usedToday` 維持 1＝冪等早退在我那行之前，防連點刷窗）。browser==node（`TRIGGER_MS`/`TRIGGER_DAILY_MAX`/`MULTS`/`CAP`/`nextUntil` 10 次結果逐位相同）。瀏覽器 **76 項 0 fail**，9 個 rakeboost 測項在「未觸發」與「窗口生效中」**兩態各跑一次皆 pass**。EN/zh-Hans 各 2/1 條新鍵實測 resolve（`領取加成窗口` 四字簡繁同形 ⇒ 刻意不列 HANS＝零等值死鍵）。375px 面板 `scrollWidth==clientWidth==375` 零溢出。
      - ⚠️ **preview 過程記兩筆量測法陷阱（本輪各絆一次）**：① **測項第一版用 `t.skip()` 反而把整條鎖弄消失**——本 harness 的 skip 標記**整個測項**，故「窗口生效中」時連同「領取點確有呼叫」那條最重要的鎖一起不執行（線上最常見狀態就是今天已簽到）⇒ 已改為**兩態互補斷言、不用 skip**。而我第一次讀結果時把 skip **誤讀成 pass**（自訂彙總用 `ok===false` 判失敗，而此 harness 的欄位是 `status`）＝同一輪內「量測法」連錯兩次。② **preview 伺服器以 `prototype/` 為根**，故 `/prototype/?demo=1` 是 **404**；先前 SW 又把 404 遮成看似正常的頁面（`document.scripts.length===1` 才露餡）⇒ 正確網址是 `/?demo=1`，且**改 sw.js 後必須先 unregister SW + 清 caches**（§4）。三筆 console 404 全是我這幾次錯路徑請求，正確載入時**全部資源 200、零 app error**。
      - **下一步（不在本卡）**：其餘領取點（任務／返水／VIP 升級金／#48 保險／#46 賽季）要接就是各加一行 `HL.rakeboost.trigger("claimwindow")`；`newcomer`／`optin` 兩筆種子**可後續改寫為 `registerTriggered` 的特例**以消掉各自手刻的時間戳（本卡不強制重構、故未動）。

82. 🟦已批准待做 **支付通道註冊表（收銀台的 provider/地區/幣別/限額述詞層 · 骨架先行、預設全關）** — S–M — 來源：**platform-modules「支付/收銀台」stowable_note**——該設計自種子日即寫明「支付方式為 provider 插件註冊表（enabled/地區/幣別/限額），關通道 toggle，加通道＝註冊 adapter」，但**歷經 07-30／08-05／08-10 三次審計、三次都被記下卻從未被認領**＝08-06 記載的「**處置管道沒有帳可查**」家族第 8 筆。
    - 問題（grep 機械實證，連三次審計同一結果）：`grep -E 'psp|PSP|對帳|reconcil' prototype/src`（排除 `chatChannel`）**三次皆 0 命中**；付款方式是兩個**純展示常數陣列**——`app-shell.js:87` `FIAT_METHODS = [{ic,n}…]`、`:88` `CRYPTO_COINS = [{code,net,ic}…]`，**無 enabled／地區／幣別／限額任一欄位** ⇒ 想關掉一個通道、想讓某地區只看到某些通道、想給通道設最小/最大額，**都只能改陣列硬碼**。
    - ⚠️ **與 CONTROL.avoid 的邊界（本卡刻意只做被允許的那半）**：avoid 列的是「真金流**串接**」——本卡**不接任何真 PSP、不做對帳、不碰真錢**，只做**述詞層 + 預設全關的骨架**，正是 SKILL 鐵律明文允許的「**開發完成 + flag 停用的可收納骨架**」。它也直接服務長期目標 4（雙金流模式依市場法規切換）與目標 5（後台可切換通道）。
    - 範圍（純前端 · **容器先於內容**）：① `HL.cashier.register({ id, kind:'fiat'|'crypto', name, icon, enabled, regions[], currencies[], min, max, order })`，`FIAT_METHODS`/`CRYPTO_COINS` 改為**這張表的首批註冊**（行為零變更＝現有三法幣三幣種原樣呈現）；② 收銀台 UI 改讀註冊表並套 `enabled`／地區／幣別過濾（**述詞表直接複用 #54 `release.js` 的 audience 述詞形制**，勿造第三套——這正是台帳「擴充性」記載的既有缺口）；③ 額度**委派 #70 `HL.rg` 的儲值閘與 #63 `HL.sla` 的分階額度**，本卡**不新增第二套限額演算**。
    - ⚠️ **必寫成測項的不變量**：(a) **首批註冊後的收銀台與現制逐位相同**（零回歸）；(b) `enabled:false` 的通道**不得出現在 UI 也不得被選中**（不能只隱藏不擋）；(c) 空清單時**不顯示入口**而非顯示空面板（沿用 stowable_note 的「空目錄不顯入口」原則）；(d) 本卡**不得引入任何真實金流呼叫**（測項可用 grep 釘死無 fetch/PSP 端點）。
    - 來源：platform-modules「金流/支付|收銀台」stowable_note（三次審計未認領）＋ 長期目標 4（雙金流 + 法域切換）。
    - ↳ **(2026-08-26 平台軌·14:00 窗 · 吸收三個新軸，不另開雙胞胎卡)** 本輪金流分類輪替時**首次取到「該長什麼樣」的一手形制**（前六輪只證明了缺口存在）：
      改以 **B2B 支付編排商**為取材對象（照 08-26 08:00 窗方法論：收銀台前台玩家看得到，但「通道怎麼被選出來」只有賣收銀台的人會寫到欄位級）。
      **三個本卡原範圍沒有的軸**——(a) **推薦/顯著度**：`order` 已在本卡描述子裡，但那是**靜態排序**；Rainbet 2026 把 SEPA **置頂並標 recommended**，
      GR8 Tech 官方部落格寫的是依「player behavior, not just GEO」動態調整（"If a player prefers debit cards, the platform highlights cards"）
      ⇒ 需要 `recommend` 述詞（**可求值**、不是寫死的名次），且它必須是**述詞而非分數**，否則會長成第二份受眾表（撞 `platform/audience-single-vocabulary`，
      正解＝復用 `HL.release.AUDIENCES` 的 kind，與 #131 同一條紀律）；
      (b) **幣別 ≠ 網路**：本卡描述子只有 `currencies[]`，但 Rainbet 為 **20+ 幣 × 15+ 鏈**；ApexWin `CRYPTO_COINS` 雖已有 `net` 欄位卻是**硬寫 1:1**
      （USDT↔TRC20 唯一）⇒ 同一幣多鏈**在資料結構上不可表達**。修法是 `networks[]` 而非把鏈塞進 `currencies[]`（後者會讓「USDT」在 UI 出現三次）；
      (c) **交易狀態詞彙（status normalization）**：編排商的共同賣點是「connecting multiple providers, routing, cascading and **status normalization**」，
      而 `app-shell.js:98` `TXN_KINDS` 只有**型別**（deposit／withdraw／p2p_out）**沒有狀態**（`pending|處理中|declined` 於該檔 0 命中）
      ⇒ 提款是前端即時結算、交易永遠只有「已完成」一態。⭐ **這一軸的價值超出本卡**：台帳「提款審核佇列」absent 的根就是它——
      沒有 `pending` 這個態，審核佇列在資料上無處可掛。而**狀態詞彙本身是純前端可做、不在 CONTROL.avoid 內** ⇒ 它是那個 absent 模組唯一能先推的一半。
    - ⚠️ **本卡仍卡在 [P-FS]**（出口必然在 `app-shell.js` 首屏 51.5KB ＋ 新註冊表 core 檔）⇒ 排在 #118 之後；這也是它為何六輪未動的**真原因**，不是沒人認領。

> 🤖 **以下由自我進化引擎「平台軌」自動開卡**（2026-08-10 **20:00 窗** · 來源：stake + bc-game **tier-1 到期深挖**〔`next_due` 08-11 並列全庫最早、priority 96/90 全庫最高〕+ `intel/db/platform-modules.json` **活動** 分類審〔6 模組全審，08-05 為全庫最舊之一〕）。全自動模式下標 🟦已批准待做。

83. 🟦已批准待做 **獎池分配軸：「達標即均分」型分配（`prizeFor` 的分配策略容器化）** — S–M — 來源：**Stake 2026-08-10 深挖**（Originals Challenges：資格＝單局 ≥0.5 SC 押注 + 命中 ≥x110，獎金＝**固定 5,000 SC 池「均分給所有達標者」**）＋ **Shuffle「Hacksaw Shootout」**（$20,000 池，**六款 Hacksaw 各打到倍數目標者全部均分**，2026-07-23→08-06）＝**兩平台獨立佐證**，且 Shuffle 正是 ApexWin #26 當年的對標對象（它把自己那套挑戰演進到共享池）。
    - 問題（grep 機械實證，**資格與獎金要分開看**）：**資格那半 ApexWin 早就有了**——`core/challenges.js`（#26）就是「單局倍數門檻 × 需達成次數」（`{id:"m2",mult:2,goal:5}`／`m10`／`m50`），連「slot 把 bet/win 拆兩次回報不誤判倍數」都處理過。**缺的是獎金那半**：全站只有兩種分配法，**都不是均分**——① `core/tournament.js:50` `prizeFor(rank)=Math.round(POOL*SPLIT[rank-1])`＝**名次階梯**（且 `rank > SPLIT.length` 領 0）；② `challenges` 的 `reward: 200/500/1500`＝**每人固定額**。
    - 為何值得做（**這是成本結構的改善，不只是新玩法**）：每人固定額的總成本 ＝ 達標人數 × reward ⇒ **在人數上沒有上界**（一個好抽的 `m10` 若一天有 500 人達標就是 250,000）；固定池均分的總成本 **恆等於池子**、與人數無關，且**達標人數越多每人越少**＝天然的自我節流。⇒ 它同時是「新的獎勵敘事」與「既有送幣模組的成本上蓋」。
    - 範圍（純前端 · **容器先於內容**）：① 把分配法做成**策略註冊表** `HL.prizeSplit.register({ id, split(ctx) })`，首批註冊 `ladder`（原樣搬 `tournament.SPLIT`，**行為零變更**）與 `equalShare`；② `tournament` 與 `challenges` 的活動宣告增一個 `payout: "ladder" | "equalShare"` 欄位（**不填＝維持現況**）；③ 呈現沿用既有面板與 #49 日曆。
    - ⚠️ **必寫成測項的不變量**：(a) **零回歸恆等**——不指定 `payout` 時 `prizeFor(rank)` 對 1..50 名**逐位等於**現行值；(b) **總派彩 ≤ 池**：`equalShare` 需 `Σ payouts == POOL`（餘數處理須釘死，例：整數除後餘數不發，**不得四捨五入到超過池**）；(c) **達標人數 0 ⇒ 零派彩**（池不得無主發出、也不得除以 0）；(d) ⛔ **真站必須 flag 停用，且這是本卡最重要的一條**——「均分」需要**真實達標人數**，而純前端單機拿不到；假站可用既有已站別閘控的 bot/players mock（`tournament.js:36` 本來就 `if (!live)` 才生 bot），**真站若只有你一人達標就會獨得整池＝成本災難** ⇒ `equalShare` 在 `HL.site.isLive()` 下必須拒絕註冊/退回 `ladder`，並在卡上明載「解禁前提＝伺服器端達標人數」（比照 #82 的「骨架先行、預設全關」，屬 SKILL 鐵律允許的形制）。
    - 來源：`intel/platforms/stake.md`（2026-08-10 刷新）＋ [Shuffle Hacksaw Shootout](https://www.whichcasino.com/promotions/shuffle-hacksaw-shootout-20260723-0003/)＋ platform-modules「活動/促銷框架」。⚠️ **與 #64 分工**：#64 管「要在哪些遊戲做到什麼」（資格的遊戲軸），本卡管「達標後怎麼分」（分配軸）。

84. ✅完成（2026-08-11 平台軌 **08:00 窗**建置輪） **連簽容錯（streak grace · 讓新手真的走到第 8 天里程碑）** — S — 來源：**platform-modules「活動/新手引導」本輪複審**——並**據實收窄了 08-05 自己記下的缺口**：08-05 記「缺有邊界 FTUE 多日軌」，本輪機械複查後**部分推翻**——`core/rewards.js` 檔頭第 7 行明載「第 30 天後日獎 plateau、不再觸發里程碑（**旅程完成**）」、里程碑落在第 8/15/22/30 天 ⇒ **對新玩家而言那已經是一條邊界明確、back-loaded 的多日軌**，「第三項為空」的舊記載過度悲觀。
    - 問題（grep 機械實證，**真病灶是另一件事且更尖銳＝零容錯**）：`grace|寬限|freeze|凍結|protect|補簽|保護` 於 `core/rewards.js` **命中 0**；`:217` 斷簽即 streak 歸零、`:53 milestoneOf(streakDay)` 只讀 `MILESTONES[streakDay]`＝**只在精確連續第 8/15/22/30 天觸發** ⇒ **一個第 3 天漏簽的新手，必須從第 1 天重新連滿 8 天才拿得到首個里程碑**。而 Zonko 的 back-loaded 8 日軌之所以存在，正是因為**第 6–8 天就是流失懸崖**（本專案 07-02 記下、08-05 複記，兩次都沒開卡＝「處置管道沒有帳可查」家族第 9 筆）。
    - 為何是 S 而不是 M：**不新增任何模組、不新增送幣來源**——只在既有 `nextStreak` 的計算路徑上插一個「可否動用一次容錯」的判斷，獎勵金額表（`LADDER`/`MILESTONES`）一字不改。
    - 範圍（純前端 · **容器先於內容**）：① 一張 **config 化的容錯 spec 表** `{ id, grants:n, scope:述詞, refill:'never'|'season' }`（比照 #67 `HL.rg` 的「新增一種限額＝加一筆 spec」形制，**不硬寫死「新手前 14 天送 2 次」**）；② 動用時**顯式留痕**（面板該格標「已用容錯」而非假裝連續，並記 `HL.ledger`／通知——**不得讓玩家以為自己真的連續**，同 #76「誠實呈現」紀律）；③ 容錯**不補發漏掉那天的日獎**，只保住 streak（＝這是為什麼它不新增送幣來源）。
    - ⚠️ **必寫成測項的不變量**：(a) **未授予容錯時逐位零回歸**（`nextStreak`／`ladderReward`／`milestoneOf` 對所有輸入與現制相同）；(b) **成本上界要算出來而非宣稱**——容錯確實會**提高里程碑的期望觸達率**（這是它的目的），故須以「每玩家終身容錯次數上限」把增量夾住，並在卡上寫出「上限 n 次 ⇒ 最壞情況多發 ≤ ? 元」的算式；(c) **真站 `grants` 須 ≤ 假站**（比照 #60/#65/#74 的成本中性紀律，真站建議先給 0 或 1）；(d) **容錯不可累積成無限展期**（同 #81 的「取較晚到期而非累加」精神：連續兩天漏簽不得各用一次而變相把 streak 凍住，需釘死「連續漏簽只能用一次」）；(e) 站別隔離（走 `HL.dom.lsGet/lsSet` 自動繼承）。
    - 來源：platform-modules「活動/新手引導」（2026-08-10 複審，狀態維持 partial 但缺口重新定義）＋ `intel/platforms/zonko.md`（07-02 首記、08-05 複記）。
    - **✅ 落地（2026-08-11 平台軌 08:00 窗）**：`core/rewards.js` 新增純數學區 `GRACE_SPECS`／`GRACE_GAP`／`nextStreakOf()`／`graceGrantsOf()`（node 可測、`module.exports` 已含），把原本**寫死在 `status()` 裡的三分支** streak 計算收斂成一個純函式；瀏覽器端 `HL.rewards` 亦暴露同一批出口以做 browser==node 逐位對照。**零新 `<script>` ⇒ 首屏與 M6/M8 門檻不受影響**（`platform/first-screen-budget` 常駐閘仍 PASS）。
      - **spec 首版**：`{ id:"ftue", grants:{demo:2, live:0}, scope:{maxProtectedDay:8}, refill:"never" }`。⭐ **`maxProtectedDay` 刻意取 8 而非我首版寫的 14**——理由是**列舉量測後才定的**：14 使最壞多發額達 **129,950**（全勤總額 260,300 的 49.9%），8 則降到 **96,100（36.9%）**，且 8 恰好就是本卡標題承諾的「走到第 8 天里程碑」所需的最小範圍 ⇒ **取能達成承諾的最小 scope**。此數字寫成測項門檻（>100,000 即 FAIL），故日後放寬 scope/grants 會被自動叫出（已用擾動證明）。
      - ⭐ **成本論證中途被我自己推翻並改寫成更強的形式**：卡上要求「寫出上限 n 次 ⇒ 最壞多發 ≤ ? 元」，我首版直接猜 90,000 當門檻，**列舉當場打成 FAIL（真值 129,950）**。更關鍵的是這個「相對被罰的自己多發多少」本身是**弱**的框法；真正有意義的天花板是 **`withGrace(任何漏簽樣式) < 全勤總額 260,300`**——容錯者必定少領 ≥1 天，故**每人 30 天曝險上限一分未增**（房家最大暴露量與改版前逐位相同），容錯只是把被罰的玩家往既有天花板挪。已把此不變量做成主測項（列舉 4,525 種漏簽樣式，違反數須為 0）。
      - **不變量全部成為測項**（`rewards/grace-zero-regression`／`grace-gap-rules`／`grace-spec-cost`，node fast **98→101**）：(a) `graceLeft=0` 時對 13×41 組 `(gap,streak)` **逐位等於**舊三分支（舊式保留在測項內當黃金參考）；(b) **只救 gap===2**，`gap 3..30` 一律歸 1 且不得動用（＝卡上「連續漏簽只能用一次」被做成 `gap` 的定義域限制，而非額外計數器）；(c) 真站 `grants=0` ⇒ 對所有單日漏簽樣式送幣額與改版前**逐位相同**（真站等於功能關閉）、且 `live ≤ demo`；(d) 全勤者差額恰為 **0**（沒斷簽＝永不動用）；(e) `refill` 必須為 `never`（`season` 未實作故不得登記）。
      - **負向擾動 11/11 全被抓**（`GRACE_GAP` 2→3、取消 gap≥3 歸零、`live` 0→3、`live` 0→1、`maxProtectedDay` 8→30、移除 scope、`refill`→season、`gap===0` 誤 +1、`gap===1` 改歸零、未登記 spec 預設給 1 次、`LADDER` 第 7 天改 1600），擾動後檔案已逐位還原。
      - **誠實呈現（卡上要求，不可省）**：① 被容錯保住的那格標「已用容錯」+ **虛線框**（`.is-grace`，computed `borderStyle: dashed` 實證）＝**不與真正連續的格同形**；② 動用當下面板顯示「昨天漏簽 · 本次領取將動用 1 次連簽容錯（**不補發漏掉那天的日獎**）」；③ 通知留痕。**未動用時顯示可用次數**。
      - **preview 實證（§9 headless→DOM 逐項驗）**：browser==node（零回歸掃描 bad=0、`GRACE_GAP`/gap 規則/scope 邊界/站別 grants 逐位相同）＋**真實 e2e 走 `HL.rewards.claim()`**：gap=2 streak 7 ⇒ `gracePending:true`→`nextStreak 8`、**餘額 delta == `claimedAmount`**、**獎金錢包 locked delta == 里程碑 3000**、**帳本 `bonus` delta 4020 == 1020 日獎 + 3000 里程碑（各記一次、無重複計）**、`graceLeft 2→1`、`marks:[8]` 落地；五情境全對（gap=3 歸零／容錯用盡歸零／scope 外歸零／gap=1 正常且不消耗）；三語逐項驗（EN 兩變體 `You missed yesterday…` / `Streak grace left 2 · covers one missed day`、HANS `已用容错`，EN 零殘留中文、HANS 零等值死鍵，EN 1088 / HANS 941 鍵 **dup 皆 0**）；**零 console error**；375px 容錯標記 63.5px 落在 69.5px 格內、單行不折行。
      - ⚠️ **誠實記兩筆**：① 375px `scrollWidth` 376 屬**既存**（開面板前後皆 376、與 08-10 記載同一筆，非本卡引入）；② 我的第一版 i18n 註解誤寫「已用容錯四字簡繁同形故不列」——**錯→错 實為異形**，已補上 HANS 鍵（若沿用該誤判就會漏一個簡體字串）。
      - ⚠️ **量測法陷阱本輪兩筆（同家族連六輪）**：① 我的 i18n 驗證器第一版用 `src.indexOf('en:')` 定位字典，**抓到的是 `PREFIX/SUFFIX` 子字典（EN 僅 18 鍵）**，於是把 6 個新鍵全報成「缺鍵」——**是量測壞了不是字典壞了**；真字典是 `var EN = {`／`var HANS = {`（`DICT` 於 `i18n.js:1107` 才組裝）。② 修正後 brace 解析仍失敗，因**該解析器不跳過註解**、註解裡的撇號被當字串起點而吞掉整段 ⇒ 改為「行區間 + 截到自身 `};` 收尾行 + 去整行註解」。**兩筆都是「工具說有問題」而非「程式有問題」，先驗工具再改程式**。

> 🤖 **以下由自我進化引擎「平台軌」自動開卡**（2026-08-11 **08:00 窗** · 來源：stake-us + roobet **tier-2 到期深挖**〔`next_due` 08-11 並列全庫最早〕+ `intel/db/platform-modules.json` **資安** 分類審〔5 模組全審，08-05 為全庫唯一最舊〕）。全自動模式下標 🟦已批准待做。

85. ✅完成（2026-08-12 平台軌 08:00 窗建置輪） **競賽「計分軸」：可宣告的計分函式 + per-game 分組結算（`tournament` 的 `score += bet` 容器化）** — M — 來源：**Stake.us 2026-08-11 深挖**（Weekly Wrapped：獎池 50,000 SC / 500M GC 掛**當週 10 款精選新上市遊戲**，決勝＝**每款各出一名優勝者**，`Big Win`＝該款**最大贏額**、`Lucky Win`＝該款**最高倍數**，平手比押注額、再同則均分）。
    - 問題（grep 機械實證）：**ApexWin 的競賽只有一種計分軸，而且是寫死的**——`core/tournament.js:54` `record(bet)` → `o.score += bet`（純流水），名次由 `prizeFor(rank)=Math.round(POOL*SPLIT[rank-1])` 決定＝**單一全站榜**。`core/achievements.js:106` 雖有 `bestMult`/`bestWin`，但那是**個人終身門檻型成就**（`mult-10/100/1000`），**不是競賽計分**，兩者資料流完全分離。⇒ 想辦「本週最高倍數」或「每款遊戲各出一名冠軍」目前**無處可宣告**。
    - 為何值得做（**這是三軸拼圖的最後一塊，而且前兩塊已經在佇列上**）：#64 管「**要在哪些遊戲做到什麼**」（資格的遊戲軸）、#83 管「**達標後怎麼分**」（分配軸）、本卡管「**憑什麼排名**」（計分軸）。三軸都容器化後，「六款遊戲各打倍數目標者均分池」這類活動＝**填三張表而非寫一個新活動**。而流水單一軸還有個副作用：**它獎勵的是投注量而非精彩程度**，最高倍數/最大贏額才是玩家會截圖分享的東西。
    - 範圍（純前端 · **容器先於內容**）：① `HL.scoreAxis.register({ id, label, score(ctx) })`，首批註冊 `turnover`（原樣搬 `score += bet`，**行為零變更**）／`bestWin`／`bestMult`；② 活動宣告增 `axis: "turnover"|"bestWin"|"bestMult"`（**不填＝ `turnover` ＝維持現況**）；③ 增 `groupBy: "none"|"game"`——`"game"` 時**每款遊戲各自一份榜與各自的獎**（Stake.us 形制）；④ 計分資料一律取自中央結算點 `HL.liveStats.record(game, bet, win)` 已有的三個參數，**不新增掛鉤**；⑤ 呈現沿用既有錦標賽面板 + #49 日曆。
    - ⚠️ **必寫成測項的不變量**：(a) **零回歸恆等**——不指定 `axis`/`groupBy` 時，`record()` 後的 `score`、`leaderboard()` 排序、`prizeFor(rank)` 對 1..50 名**逐位等於**現行值；(b) `bestMult`/`bestWin` 必須**取最大值而非累加**（累加會讓刷量又贏一次，等於變回流水軸）；(c) **`bet=0` 不得產生倍數**（slot 把 bet/win 拆兩次回報，`win/bet` 會除以 0 ⇒ 必須沿用 `challenges.js` 已處理過的同一套判斷，卡上明列「複用而非重寫」）；(d) `groupBy:"game"` 時**總派彩 ≤ 池**（N 款分池須釘死餘數處理，同 #83）；(e) 真站不得因此新增假榜（`tournament.js:36` 既有 `if (!live)` 才生 bot 的閘必須對每個分組都成立）。
    - 來源：`intel/platforms/stake-us.md`（2026-08-11 刷新）＋ platform-modules「活動/促銷框架」。⚠️ **與 #83 分工**：本卡管「憑什麼排名」，#83 管「排完怎麼分」；Stake.us 那個活動只在**平手**時才均分，故**刻意不算 #83 的第三平台佐證**。
    - **落地（2026-08-12 · 新 `core/score-axis.js` + `tournament` 三處接線 · sw v159→v160）**
      - **容器**：`HL.scoreAxis.register({ id, label, unit, accum(cur,ctx), round, botScore })`，首批三軸 `turnover`（原樣搬 `score += bet`）／`bestWin`／`bestMult`。賽事宣告 `startNew({ axis, groupBy })` 即換賽制；`groupBy:"game"` 時**每款遊戲各一份榜、各一份獎池**（總池平分、餘數留房家）。純函式區 `module.exports` 供 node require ⇒ **驗的即瀏覽器跑的同一份**。
      - ⭐ **卡上不變量 (c) 在實作時被證實是真的、而且比卡上寫的更嚴重**：卡只說「slot 把 bet/win 拆開」，實測 `views/slot.js:434` 是 `record("暗影儀式", 0, win)`、`:477` 是 `record(…, bet, 0)`，`views/chicken.js` 五處同型 ⇒ **不只是「倍數會算錯」，而是舊的 `HL.tournament.record(bet)` 掛在 `bet > 0` 區塊內、win-only 那半根本進不到錦標賽** ⇒ 若照卡面直接加軸，`bestWin` 會**永遠收不到旗艦 slot 的贏分**（分數恆 0 卻沒有任何錯誤訊息）。修法＝在 `live-stats.js` 補一行**只在 `win>0 && bet<=0` 時**呼叫的 win-only 餵入，並讓 `record()` **分數沒變就完全不動**（不寫檔、不通知、不觸發逾期結算）⇒ 流水軸下該行恆為 no-op＝**新增一條餵入路徑卻零回歸**（node 實測寫入次數 5→5 一次未增）。
      - ⭐ **第二個實作期發現：`game` 軸只走到一半是這個中央掛鉤的系統性問題**。`liveStats.record(game,bet,win)` 明明帶著 `game`，卻只傳給 `edge`／`rakeback`／`challenges`／`heat`／`achievements`／`betlog`；`tournament`（本卡修掉）與 **`bonus.onWager(bet)`（仍缺）** 都收不到 ⇒ 直接催生本輪的 **#89**（紅利可用範圍軸），兩者是同一形狀的缺陷。
      - **驗證**：node fast **102→107**（新增 5 個 `scoreAxis/*` 測項）、**負向擾動 9/9 全被抓**（含「流水軸多算一倍」「bestWin 改累加」「拿掉 bet>0 守衛」「未知軸回 null」「分組池改進位」「未帶遊戲名被丟棄」），擾動後檔案 **SHA256 逐位還原**。⚠️ 排程輪無法開 preview（無人核准），改以 `vm` 載入**同一份 `score-axis.js` + `tournament.js` 的瀏覽器分支**跑 28 項 e2e：零回歸（Σbet 逐位相同、榜深仍 50、`prizeFor(1)` 逐位等於 `POOL×SPLIT[0]`）／win-only 零副作用／**舊存檔相容**（既有 localStorage 沒有 `axis` 欄位仍正常計分）／分組獎池 `Σ ≤ 總池`／真站兩種榜皆無假 bot。
      - ⚠️ **控制組救回一個空過的測項（#86 教訓的直接應用）**：分組結算第一版驗完顯示「E2 總獎金 = Σ 各組獎金 ✅」，但實際 `prize` 是 **0**（決定性 stub 讓假 bot 全部 250.6× 而玩家只有 20× ⇒ 名次第 50、本來就沒獎金）＝**「發不出錢」與「金額正確」在那個情境下完全同形**。補上「玩家真的拿下 dice 組第 1 名」的控制組後才真正驗到：獎金 **125,000 == 該組獎池 500,000 × SPLIT[0]**、且**只入獎金錢包一次**。
      - **範圍誠實聲明**：① 種子賽事仍全部是 `turnover`/`none` ⇒ **線上玩家本輪看不到賽制改變**，新增的只有賽事頁一行「計分方式 有效押注」與（分組賽才出現的）分頁列＝容器已備、內容待排；② 分組賽的假 bot 為 demo 專屬（真站恆空），與既有全站榜同一條 §4 閘；③ i18n 新增 5 個 EN 鍵 / 4 個 HANS 鍵（`有效押注` 簡繁同形故刻意不列＝避免 U35 那種等值死鍵）。

86. ✅完成（2026-08-11 平台軌 14:00 窗建置輪） **負責任博弈的閘補到 slot 路徑（工具的承諾與實際覆蓋面不一致 · §11 前置）** — S — 來源：**platform-modules「資安/負責任博弈」2026-08-11 複審**（本輪查獲，非外部平台）。
    - 問題（grep 機械實證，**這是一個尖銳的不對稱**）：`grep -rl "HL.rg" views/` **實測 0 命中** ⇒ 下注前閘只掛在 `instant.js:89`（手動）/`:120`（自動）/`table.js:59`/`app-shell.js:143`（儲值），**5 個 slot 檔（shadow-ritual/pirots/dead-by-noon/golden-toad/gem-storm）+ vsslot 各自的 `spin()`（例 `views/slot.js:466`）完全繞過**。
      **而累積側是全通的**——`live-stats.js:48` 的 `HL.rg.record(bet, win)` 在中央結算點、全遊戲通吃 ⇒ 形成的實際行為是：**slot 押注會把玩家自設的每日限額吃掉，卻永遠不會被擋**；一旦額度用盡，instant/table 被擋而 **slot 照玩**。玩家設了「每日投注上限 1000」卻能在 slot 無限押下去。
    - 為何是 S 而不是 M：**閘本身已經存在且是一行**（`if (HL.rg && !HL.rg.check(bet)) return;`），工作量是找出 6 個檔的 spin/buy 入口逐一掛上；`HL.rg.check` 未設限時**恆真**（`rg/zero-regression` 已釘死）⇒ 對沒設限額的玩家零行為變更。
    - 範圍：① 6 個 view 的 spin 入口 + 買入型入口（`slot.js` 的 baphomet/cursed 買入亦是押注）各加一行閘；② ⚠️ **會員（後端）模式須留意**：slot 走 `HL.api.playSlotSpin` 由伺服器結算，客端閘只是前置擋門（與 instant/table 同構、非權威），卡上明載「真金時代權威閘須在伺服器」＝ §11 項；③ 順手在 selftest 補一條**反向 grep 鎖**（`views/` 中每個註冊了 spin 的遊戲檔都必須出現 `HL.rg`），否則下一款 slot 又會漏。
    - ⚠️ **必寫成測項的不變量**：(a) **未設限額時逐位零回歸**（所有 slot 行為完全不變）；(b) 設限後 slot **確實被擋**且 toast 原因與 instant 一致；(c) 自動/連續旋轉撞限額須**停止**而非連撞數百次 toast（`instant.js:120` 已有先例，slot 的 autoplay 須比照）；(d) 反向 grep 鎖須能抓到「新增一個 slot 檔卻沒掛閘」。
    - 來源：platform-modules「資安/負責任博弈」（2026-08-11 複審，維持 partial 但缺口首次機械定位）＋ #67/#70 既有註冊表。⚠️ 依 CLAUDE.md 鐵律「體驗完整度+開發速度 > 資安」，本卡**不當阻斷項**、按常規優先序排入；但它不是純合規題——**它是一個已上線功能的承諾與行為不一致**，故優先序高於一般 §11 延後項。
    - **落地（2026-08-11 · 17 個 view 各一行閘 + 1 條行為型反向 grep 鎖 · sw v158→v159）**
      - ⭐ **卡上的範圍被實測推翻並擴大近 3 倍（6 檔 → 17 檔），這是本輪最重要的一件事**。卡上寫「5 slot + vsslot 各自 `spin()` 全繞過」，其推論前提是「其餘遊戲都掛 `HL.instant.betPanel` ⇒ 已受 `instant.js:89/:120` 保護」。**實測兩處都不對**：
        (i) **四款保真 slot（pirots/dbn/toad/gem）確實掛 betPanel ⇒ 它們的「正常旋轉」本來就有閘、從來沒有繞過**——卡上把它們列為未閘是**過度指控**；它們真正沒閘的是**買入型入口**（`買入`按鈕自己 `HL.instant.setBal(bal-cost)`、完全不經 betPanel）。
        (ii) 反過來，**更晚期的 instant 遊戲根本沒用 betPanel**——`keno/towers/hilo/pump/picks/duel/crash/mines` 都是自己 `amt.get()` + `setBal(bal()-bet)`（例 `instant-keno.js:128`），**外加 `bounty`(賞金局)／`liveroom`(主播跟注)／`chicken`(小雞)／`arena`(開房預扣賭注)** ⇒ 這些**全部**未閘。**實際受影響面比卡上大得多**。
        ⇒ **選擇補完全部 17 個而非只做卡上的 6 個**：同一行修法、同一風險剖面，而且若只做 6 個，那條反向 grep 鎖就得被改鬆到能通過——**那等於為了讓測項變綠而弱化測項**，正是本專案一再記錄要避免的反模式。
      - **閘點（17 檔）**：`slot.js` 的 `spin()`（僅 base，免費輪不扣款故不閘）+ `buyBaphomet`/`buyCursed`；4 款保真 slot 的買入鈕；`vsslot.accept()`（賭注＝`room.wager`）；`keno/towers/hilo/pump/picks/duel/crash-mines`(×2 站)；`bounty.chargeOK()`；`liveroom` 跟注；`chicken.startRound()`（**練習模式不閘**、且閘在會員/Demo 分支之前＝兩條路徑同受限）；`arena` 開賞金房與建對戰房。
      - **零回歸是既有不變量而非新宣稱**：`HL.rg.check` 在未設限時恆真（`rg/zero-regression` 已釘死，本輪 node `--group rg` **10/10 全綠**）⇒ 沒設限額的玩家**逐位零行為變更**。`check()` **只評估不累加**（累加仍只在 `live-stats.js:48` 的 `record`）⇒ 新增這些閘**不會**造成限額被重複計。
      - **新增鎖＝全站第一條「行為型反向 grep 鎖」**（`platform/rg-bet-gate-coverage`，node fast 101→**102**）：不列檔名白名單，而是宣告「凡 `src/views/*.js` 出現直接扣餘額的寫法，該檔就必須出現 `HL.rg`」⇒ **擋得住下一個還沒被寫出來的遊戲**（卡上要求的 (d)）。另附**樣本量自我保護**（偵測到的扣款檔須 ≥17），防規則被改窄到抓不到東西而假綠——**負向擾動 8/8 全被抓**（7 檔各自移除閘行 + 把 `DEDUCT_RE` 改成永不匹配），擾動後檔案**逐位還原**。
      - **瀏覽器 e2e 實證（繞過 §9 登入 gate 的新路徑）**：登入 gate 仍擋住 shell，但 **#80 lazy-games 讓 `HL.games.byId(id).render()` 可直接取用** ⇒ 把遊戲掛進 detached 容器就能點真按鈕。**Keno**：設 `bet-single=10` → 下注 50 **被擋且餘額一分未動**（28560→28560）；**控制組**下注 5 **正常扣款**（28560→28555）⇒ 證明擋的是**注額大小**而非把遊戲弄壞。**Golden Toad 買入**（cost=50×86.4=4320 ≫ 10）**被擋、餘額不動**＝買入型閘同樣生效。全程 **零 console error**。
      - ⚠️ **量測法陷阱本輪一筆（同家族連八輪），而且是被自己設的控制組抓出來的**：第一版 e2e 我用「取第一個非數字按鈕」當開獎鈕，實際抓到的是 **`½`（減半籌碼鈕）** ⇒ A/B 兩組**都沒真的開局**。**若當初只做 A 組（被擋），我會看到「餘額沒動」而誤判為閘生效**——是**控制組 B 顯示「連該過的也沒過」才揭穿量測無效**。⇒ 通則再加一句：**驗「擋得住」時必須同時驗「該過的要過」**，否則「什麼都沒發生」與「閘生效」完全同形。
      - ⚠️ **誠實記一筆未能完成的驗證**：原想再驗「解除限額後大注恢復可下」，但 `HL.rg.setLimit(id, null)` 依 #67 的**調升冷卻不對稱**設計會進入 `pending`（24h 後生效）⇒ 當下無法即時解除。**這是正確行為不是缺陷**（放寬限額須冷卻、收緊立即生效），該分支已由 `rg/deposit-raise-cooldown` 等既有測項覆蓋，故不另補。
      - ⚠️ **範圍誠實聲明**：客端閘只是**前置擋門非權威**——會員模式下 slot 走 `HL.api.playSlotSpin` 由伺服器結算，真金時代的權威閘必須在伺服器（卡上第 ② 點，已列 §11）。本輪未動伺服器。

> 🤖 **以下由自我進化引擎「平台軌」自動開卡**（2026-08-11 **14:00 窗** · 來源：crown-coins + 1xbet **tier-2 到期深挖**〔`next_due` 08-12 並列全庫最早〕+ `intel/db/platform-modules.json` **擴充性** 分類審〔5 模組全審，08-06 為全庫最舊之一〕）。全自動模式下標 🟦已批准待做。

87. 🟦已批准待做 **獎勵日曆的「逐片到期」軸：一次授予、切成多日、每片各自到期、未領即作廢** — M — 來源：**Roobet Vault**（獎勵切成 7/14 天日曆、每片各自到期、未領即作廢）。⚠️ **這是 07-10／07-28／08-11 三度重記卻從未開卡的訊號**，依 #82 先例升格（「處置管道沒有帳可查」家族第 10 筆）。
    - 問題（grep 機械實證）：ApexWin 的送幣**只有兩種時間形狀**——① **立即入帳**（`rewards.claim` 日獎直入餘額）②**入獎金錢包後由流水解鎖**（`bonus.add` + `onWager`）。**沒有「先授予、但分成 N 片、每片有自己的到期日、過期即作廢」這種形狀**：`grep "expire\|到期\|作廢" core/bonus.js` 無逐片到期結構，`promo-cal.js`（#49）管的是**活動檔期**（何時開放給所有人），不是**某個玩家手上這筆獎勵的第 3 片還剩幾小時**。
    - 為何值得做（**它是成本下修、不是成本上加**，與本佇列多數送幣卡方向相反）：未領即作廢 ⇒ 房家把「已宣告但未兌現」的部分留下，**實際成本 ≤ 名目成本**，且天然製造回訪理由（每片到期前要回來領）。與 #83（固定池均分＝成本上蓋）同屬「**送幣模組的成本上蓋**」家族，兩張都在把「宣告了多少」與「實際發出多少」拉開。
    - 範圍（純前端 · **容器先於內容**）：① `HL.vault.grant({ id, pieces:[{ day, amount, kind }], expiresEachMs })`＝**一次授予、N 片各自帶到期**；② 每片三態 `pending / claimable / forfeited`，到期未領自動轉 forfeited；③ 領取走既有出口（`bonus.add` 或直入餘額，**不新造送幣路徑**）；④ 呈現複用 #49 日曆與 #76 揭曉層；⑤ **作廢必須記帳**——`HL.ledger` 應能答「本月宣告 X、實發 Y、作廢 Z」，否則又是一筆「沒有帳可查」。
    - ⚠️ **必寫成測項的不變量**：(a) **Σ 實發 ≤ Σ 宣告**（作廢只會讓實發變少，恆等式而非宣稱）；(b) 過期片**永不可領**（含改系統時間後重進的路徑）；(c) 未使用本模組時**逐位零回歸**；(d) 真站須能整體停用或收斂（沿 #81/#84 的站別旗標形制）；(e) 作廢事件必入帳本，且**不得被記成「發出去了」**。
    - 來源：`intel/platforms/roobet.md`（2026-08-11 記於台帳 `stowable_note` 並指派本輪開卡）。⚠️ **與 #49 分工**：#49 管「這個活動什麼時候對誰開放」，本卡管「**你手上這筆獎勵的每一片什麼時候過期**」——前者是全站檔期，後者是**個人持有物的生命週期**，兩者可獨立落地。
    - 🔴 **2026-08-25 平台軌 08:00 窗 · 來源規格更正（實作前務必看這段，照舊敘述做會做出錯的形狀）**：本卡標題與「來源」欄寫的是「切成 7/14 天**日曆**、每片各自到期」——那是 07-10／07-28／08-11 三輪的**推測形狀**。本輪（roobet 到期複驗）實查官方與多家評測，Roobet Vault 的**確切結構**是：
      **(i)** 每次領 Instant Rakeback 時**當場對半拆**——**50% 立即入下注餘額、50% 進 Rakeback Vault**（不是把一筆獎勵預先排進日曆）；
      **(ii)** Vault **每 8 小時解鎖一次、一天三次**；**(iii)** 每片**解鎖後 24 小時內未領即作廢**；**(iv)** 整個 Vault 最長保管 **14 天**。
      ⇒ 兩種形狀的**目的不同**：日曆型是「每天回來看一次」；50/50 型是把**每一次領取行為本身**變成下一次回訪的鉤（你領的當下就有一半被押後）。
      **對本卡範圍的實際影響**：① `grant()` 的呼叫時機從「活動授予時」改為**「玩家每次領取時」**（＝掛在既有領取出口的**後面**，不是新造授予事件）；
      ② `pieces` 不該由呼叫端手寫日曆，應由**拆分策略**產生（`split: 0.5` + `unlockEveryMs: 8h` + `pieceTtlMs: 24h` + `vaultTtlMs: 14d`）——四個參數就是上面四條，寫死成日曆等於把策略焊進容器；
      ③ 不變量 (a) `Σ實發 ≤ Σ宣告` 不受影響、仍成立。
      ⇒ 順帶記一條取材通則（已寫進 `intel/platforms/roobet.md`）：**同一個機制被記三輪，不代表記對了**；`saturation_watch` 量的是「有沒有新缺口」，不是「既有記載有沒有失真」——**達 `saturated` 的那一輪反而最該把既有記載逐項對一次**，因為之後就低頻了。

88. 🟦已批准待做 **簽到/日曆的「酬賞負載軸」：獎勵發什麼可宣告（現在寫死成錢）** — M — 來源：**Crown Coins 2026-08-11 深挖**（每日登入第 **2、7 天**發的是「一次幸運輪盤轉動」而非幣）。
    - 問題（grep 機械實證）：`core/rewards.js:409-427` 的派發是 `var amount = st.reward … HL.state.set({ balance: balance + amount })`＝**日獎恆為「一筆金額進主餘額」**，里程碑則進獎金錢包（locked）——**兩種都仍是錢**。`grep "luckyspin" core/rewards.js` **0 命中** ⇒ 想讓第 2 天發一次 `HL.luckyspin`、第 7 天發一張商城券，**無處可宣告**，只能去改 claim 本體。
    - 為何值得做（**第四條軸，前三條已在佇列**）：#64＝資格的**遊戲**軸、#83＝**分配**軸、#85＝**計分**軸、本卡＝**酬賞負載**軸。四軸齊備後，一檔活動＝填四張表而非改四份派發程式。另有一個實際效益：**非現金酬賞的成本可控性遠高於現金**（一次輪盤轉動的期望成本由該輪盤的獎表決定、且天然有上界）。
    - 範圍（純前端 · 容器先於內容）：① `HL.payout.register({ id, label, grant(ctx), estCost() })`，首批註冊 `coins`（**原樣搬現行金額路徑、行為零變更**）／`bonus`（獎金錢包）／`spin`（`HL.luckyspin` 一次）／`shopCredit`；② 階梯宣告增 `payout: "coins"`（**不填＝`coins`＝維持現況**）；③ **一律走既有送幣出口**（`bonus.add`／`ledger.record`），不新造路徑；④ 呈現複用 #76 揭曉層。
    - ⚠️ **必寫成測項的不變量**：(a) **零回歸恆等**——不宣告 `payout` 時，30 天逐日實發額與現行**逐位相同**（含 #76 揭曉與 #84 容錯路徑）；(b) **每種負載都必須有 `estCost()` 且入帳本**，否則會出現「發了東西但帳上看不到成本」（`ledger` 的既有教訓）；(c) 非現金負載**不得繞過站別收斂**（真站仍須可調降/停用）；(d) 授予失敗（如 `HL.luckyspin` 未載入）**必須回退為等值 coins 而非靜默不發**。
    - 來源：`intel/platforms/crown-coins.md`（2026-08-11 刷新）＋ platform-modules「活動/促銷框架」。⚠️ **刻意排除**：Crown Coins 的「生日禮」雖為真缺（`grep birthday` 0 命中）但需生日欄位（近 KYC）且價值低 ⇒ 不開卡；「商城 Gold 階才開放」併入 **#73**（等級門檻解鎖）而非本卡。
    - **範圍擴充（2026-08-12 平台軌·台帳審「後台/活動紅利設定」量化後併入，刻意不另開卡）**：本卡原本只講「發什麼」，現一併涵蓋「**這筆送幣是哪一類**」。機械實證：`grep -rho 'source: "[^"]*"' core views layout | sort -u` ＝ **22 個相異自由字串**（每日簽到/返水 Rakeback/VIP 升級金/公會週榜獎金/幸運轉盤/兌換碼…）＝**送幣型別散在 22 個呼叫端、不是一張可宣告的描述子表**。三個可查證的後果：(a) 打錯一個字會在營運儀表板**靜默長出一個新的成本分類**（分類直接吃這個字串）；(b) 沒有任何地方能宣告某型別的預設流水倍數／成本上限／可否停用／真站是否收斂；(c) 停辦一檔活動只能去改該呼叫端的程式。⇒ 本卡的 `HL.payout.register({ id, label, grant, estCost })` 應**同時成為 `source` 的來源**（描述子提供顯示名，呼叫端不再自寫字串），並新增不變量：**(e) 所有 `bonus.add` 的 `source` 必須來自註冊表**（反向 grep 鎖：`core|views|layout` 不得再出現字面量 `source: "…"`，樣本量下限 ≥22）。理由同 08-11 把商城段位門檻併入 #73：這與本卡是同一條線（發什麼 vs 屬於哪一類），拆成兩張容器卡會做出形狀重疊的兩套註冊表。

> 🤖 **以下由自我進化引擎「平台軌」自動開卡**（2026-08-12 **08:00 窗** · 來源：leovegas **tier-2 到期深挖**〔`next_due` 08-13，本輪全庫唯一到期票〕+ `intel/db/platform-modules.json` **後台** 分類審〔7 模組全審，08-06＝當時最舊之一〕）。全自動模式下標 🟦已批准待做。

89. ✅完成 **紅利的「可用範圍軸」：一筆紅利可以宣告只在哪些遊戲打流水（`onWager` 收不到 `game`）** — M　`(b1a1df8, 2026-08-13)` — 來源：**LeoVegas 2026-08-12 刷新**（Golden Chips **「can be used only in Playtech games」**）＋ 業界最標準的紅利條款之一。
    - 問題（grep 機械實證，**這是架構層的斷線、不是缺一個活動**）：`grep -rn "eligibleGames\|allowedGames\|gameScope\|onlyGames" core` **0 命中**；根因在更上游——`core/live-stats.js:31` 的 `HL.bonus.onWager(bet)` **簽章裡沒有 `game`**。中央結算點 `record(game, bet, win)` 明明帶著 `game`，卻只把它傳給 `edge`／`rakeback`／`challenges`／`heat`／`achievements`／`betlog`，**送到紅利引擎時被丟掉** ⇒ 紅利在架構上**不可能**知道這一注押在哪款遊戲，「這筆紅利只能在 slot 打流水」「真人桌不計流水」這類條款**做不出來**。
    - 為何值得做（**它同時是 #85 已證實的系統性問題的最後一塊**）：2026-08-12 實作 #85 時查明 `tournament.record(bet)` 是同一形狀的缺陷（丟掉 `game` ⇒ 競賽只能有單一全站榜），修掉後 **`bonus` 是這個中央掛鉤上已知還沒接上 `game` 軸的最後一個大消費端**。接上之後，「紅利限定遊戲範圍」只是第一個消費者；「某遊戲不計流水」「不同遊戲流水權重不同」（業界標準：slot 100%／桌遊 10%）都變成填一張表。
    - 範圍（純前端 · 容器先於內容）：① `onWager(bet, game)` 加參數（**不傳＝維持現行行為**＝零回歸錨點）；② 紅利 spec 增選用欄位 `scope: { games: [...] }` 或 `weights: { slot: 1, table: 0.1 }`（**不宣告＝全遊戲 100%＝現況**）；③ 權重表比照 #50 `EDGE` 走**遊戲類別**而非逐款列舉（新遊戲不必回頭改表）；④ 領取中心對受限紅利顯示一行「限定 X 類遊戲」（純片語 + 值分節點，P3 契約）。
    - ⚠️ **必寫成測項的不變量**：(a) **未宣告 scope 時逐位零回歸**（FIFO 推進、連鎖解鎖、`wagerFree` 全部逐位不變）；(b) **權重不得 >1**（否則是「打 1 塊算 2 塊」的隱形加速，與 #65 `BOOST_CAP` 真站 1.0 同一條紅線）；(c) **不符範圍的注不得倒扣進度**（只能不推進）；(d) 真站權重表不得比假站寬鬆（沿 #63/#81 形制）；(e) 反向 grep 鎖：`onWager` 的呼叫端必須帶 `game`（防下一個結算點又把它丟掉）。
    - 來源：`intel/platforms/leovegas.md`（2026-08-12 刷新）＋ #20 流水引擎 + #63 段位 `wagerMult`。⚠️ **與 #63 分工**：#63 管「這筆紅利要打幾倍流水」（**量**），本卡管「哪些注算得進去」（**範圍**）；兩者正交、可獨立落地。
    - ✅ **落地（2026-08-13 平台軌 20:00 窗 · `b1a1df8`）**：新增 `core/wager-scope.js`（`HL.wagerScope`）＝具名範圍描述子註冊表（`all`/`slotOnly`/`originalsOnly`/`standard`＝SLOT 100%／桌遊·真人 10%），權重走 `HL.games` 的 **`type` 類別軸**而非逐款列舉（比照 #50 EDGE 教訓：逐款表會讓每款新遊戲都得回頭改表）；`badd(n, {scope})` 選用宣告、`bOnWager(bet, game)` 依權重推進。**五個必寫不變量全部成為常駐測項**（node fast 114/114）：(a) `wagerScope/zero-regression` (b) `weight-never-exceeds-one` (c) 不倒扣（含 FIFO 不跳頭筆）(d) `live-never-looser`（今日全 preset 未宣告 `wLive` ⇒ **恆等式而非宣稱**，並附探針證明 `wLive` 路徑真的會被走到＝防 #81 t.skip 空殼事故同型陷阱）(e) 反向 grep 鎖 `platform/bonus-onwager-carries-game`（凡呼叫 `HL.bonus.onWager(` 實參須 ≥2 + 樣本量下限）。
    - ⭐ **實作期發現三筆（值得後續 session 知道）**：① **併筆會靜默改掉玩家的紅利條款**——`badd` 原本在 `entries.length >= MAX_ENTRIES(20)` 時把新紅利併入尾筆，但**範圍不同的紅利一併筆，其中一筆的可用範圍就被靜默改掉了**（玩家看到的條款與實際不符）⇒ 改為**只在範圍相同時才併**，寧可讓 ledger 略微超過 20 筆（上限本是防爆量的軟保護，正確性優先）。② **`sc` 只在有宣告時才寫進 entry** ⇒ 未宣告的紅利與舊存檔在 localStorage 裡是**逐位相同的物件**（沒有多出來的鍵）＝**零回歸靠「不存在」而非靠比對**。③ **`clamp01` 的一致性 bug（實作期實測抓到）**：`Infinity` 若不特別處理會落進 NaN 分支變成 0，出現「寫 5 被夾成 1、寫 Infinity 反而變 0」的不一致 ⇒ 統一為 `>1 一律夾 1`。
    - ⚠️ **驗證誠實聲明**：排程輪**無 preview**（沙箱不允許無人值守起 dev server）⇒ 改以**瀏覽器 shim 載入「真的那份 `progress.js`」**做 48 項 e2e（不重寫演算法——重寫等於驗一份 copy）：**HEAD 版 vs 本版跑同一組未宣告 scope 的下注序列，localStorage 逐位相同 + `freed` 回傳值逐位相同 + entry 不多出 `sc` 鍵**；`status()` 證明為**加法式**（僅多 `scope`/`scopeLabel` 兩鍵且未宣告時恆 `null`，既有鍵零變動）；並**代跑平常無人跑得到的 browser-env 架構鎖** `sla/bonus-wager-frozen`（`String(onWager)` 不得含 `reqFor|WAGER_MULT`＝本卡改寫了 `onWager` 本體，正是這條鎖要守的東西）。sw v160→v161。
    - ⚠️ **本卡尚無宣告 scope 的生產者**（`容器先於內容`＝刻意）：今日全站紅利皆未宣告 ⇒ 玩家可見行為**零變更**。第一個消費者由後續活動卡填（例：只在 slot 打流水的存款紅利），填法＝`HL.bonus.add(n, { scope: "slotOnly" })` 一個參數。

90. ✅完成（2026-08-15 平台軌·08:00 窗） **經濟旋鈕的「自我描述」層：五張 config 表現在沒有任何出口（儀表板一張都沒讀）** — S–M → 實際 M（**範圍實測後由 5 張擴為 8 張**） — 來源：**platform-modules「後台」2026-08-12 複審**（本輪查獲，非外部平台）。
    - 問題（grep 機械實證，**是承諾與現況不符，不是還沒做**）：台帳「經濟/RTP 設定」的 `stowable_note` 長期寫著「新旋鈕加進 config 表即被儀表板健檢納管」，但實測 `grep -o "HL\.\(edge\|rakeback\|progressSrc\|rakeboost\|sla\|ledger\)" views/ops-dashboard.js` **只命中 `HL.ledger`(8) 與 `HL.site`(2)**＝儀表板**一個具名經濟旋鈕表都沒讀**。⇒ 它看得到「已發生的結果」（ledger 事件彙總出的 GGR/NGR/RTP），**看不到「旋鈕現在被設成幾」**——faucet 上限、VIP 升級金、`rakeboost` CAP、`edge` 係數、段位 `wagerMult` 全都只存在於程式碼裡；而健檢規則是硬寫的、非由旋鈕表推導。
    - 為何值得做（**這是後台分類裡投入產出比最高的一張**）：旋鈕表本身**已經長得很好**——本輪據實把數量由 3 更正為 **5**（#50 `edge`／#60 `rakeback-core`／#65 `progress-src`／#81 `rakeboost`／#63 `service-level`），五張皆站別感知、皆有 node 測項。缺的只是**一個共同的自我描述介面 + 一個消費端**，不必新增任何經濟邏輯。做完之後「§11 真金上線前重調經濟數值」那件事才有一個地方可以一次看完所有旋鈕的 demo/live 值差。
    - 範圍（純前端 · 容器先於內容）：① 每張表暴露 `describe()` → `[{ key, label, demo, live, unit, note }]`（**純讀、不可寫**＝維持儀表板唯讀性質，不做半套的線上改參數）；② `HL.opsBoard` 新增一區「經濟旋鈕（唯讀）」，**遍歷已註冊者**而非硬列五張 ⇒ 第六張表加一行 `register` 就自動出現；③ 健檢規則改由 `describe()` 推導可推導的部分（如「真站任一維度不得比假站寬鬆」可對所有旋鈕自動檢查，而非逐條硬寫）。
    - ⚠️ **必寫成測項的不變量**：(a) `describe()` **不得洩漏可寫入的參考**（回傳純值副本，改它不會改到旋鈕）；(b) **五張表全部都要有 `describe()`**（反向 grep 鎖：凡 `core/*.js` 出現具名經濟表就必須出現 `describe`，樣本量下限 ≥5，防第六張表漏接）；(c) 儀表板未載入任一表時只是少一區、不得整頁壞掉；(d) 零經濟行為變更（本卡一個數字都不改）。
    - 來源：platform-modules「後台/營運後台儀表板 + 經濟/RTP 設定」（2026-08-12 複審）。⚠️ 與 CONTROL.avoid 無涉（純唯讀呈現）；與 #82 支付通道註冊表同屬「後台骨架」家族。
    - ⭐ **實作前重新機械量測，卡上的「五張」被推翻（「卡片範圍是上一輪的推論」家族第 4 次）**：以「站別分歧的經濟常數」為機械判準掃 `src/core/*.js`，得 **8 張**——卡上五張（#50 `edge`／#60 `rakeback-core`／#65 `progress-src`／#81 `rakeboost`／#63 `service-level`）之外，還有 **#48 `safetynet`**（`rate {demo:.20,live:.10}`／`cap {demo:5000,live:500}`）、**#84 `rewards` 的 `GRACE_SPECS`**（`grants {demo:2,live:0}`）、**#33 `cashback`**（`CB_RATES`）。三者都明文寫著與五張表同一條「真站 ≤ 假站」成本中性紀律 ⇒ **同一個面板該一次看完**。**選擇全做而非只做卡上五張**，理由同 #86/#92：只做五張的話，反向覆蓋鎖就得被改鬆才能通過＝為了讓測項變綠而弱化測項。
    - ✅ **落地（容器先於內容 · 本卡一個經濟數字都沒改）**：新檔 `core/econ-config.js`＝`HL.econCfg` 登記表（`register/list/all/audit/count`）；八張表**各自註冊自己的 `describe()`**（同 #72「規則的擁有者自己註冊說明」）、值一律**當場從常數求值不手抄**；`views/ops-dashboard.js` 新增「🎛️ 經濟旋鈕（唯讀）」一區**遍歷 `all()`**（第九張表加一句 `register` 就自動出現）＋把 `audit()` 推導出的健檢併入既有警示。`index.html` 掛載於 `site-mode.js` 之後（**必須早於所有旋鈕表**，否則 register 靜默漏掉——已寫成測項）。sw v165→v166。
    - ⭐ **反向覆蓋鎖當場抓出一張連卡片與台帳都不知道存在的「第 9 張表」**：`core/progress.js:318` 的 `RB_LEGACY` 是與 `rakeback-core.js` `LEGACY_RATES` **逐位相同的第二份真相**——而該檔第 317 行才剛寫「純資料在 rakeback-core.js，本檔只負責取用+記桶+UI」。⇒ 已收斂為**從單一真相取值**（載入序有保證：`rakeback-core.js` index.html 第 64 行 < `progress.js` 第 67 行），**零回歸以逐位比對證明**：兩站別 × 5 段位共 10 個取值與改版前字面量**完全相同**。並補常駐鎖 `platform/rakeback-legacy-single-truth`（反向 grep：不得再出現整排費率字面量）。
    - ✅ **驗證**：① node fast **125→130 全綠**（新增 `platform/econ-cfg-readonly`〔不變量 a：回傳凍結純值副本、改副本不動旋鈕；不變量 c：單表 `describe()` 拋錯不拖垮快照〕、`platform/econ-cfg-strict-audit`〔推導健檢有鑑別力、陣列型逐段位比較、不可比者寧可漏報不誤報〕、`platform/econ-cfg-coverage`〔行為型反向鎖 + 掛載序 + 採用度下限 8〕、`platform/econ-cfg-dashboard`〔必須遍歷、不得硬列 id、不得寫入〕、`platform/rakeback-legacy-single-truth`）。② **負向擾動 14/14 全被抓**。③ ⚠️ **其中一次擾動抓到的是「我自己的鎖是空心的」**：禁止「載入期三元式」那條鎖首版寫成 `isLive\(\)\s*\?\s*\[`，但真實寫法是 `(HL.site && HL.site.isLive()) ? [...]`——`isLive()` 與 `?` 之間隔著 `&&` 群組的**右括號** ⇒ **鎖對它要禁的那個形制本身完全無效**。修正為 `isLive\(\)[\s)]*\?\s*\[` 後，才連帶抓出上面那張第 9 張表。⇒ **通則再證：負向擾動必須也擾動「鎖要抓的那個真實形狀」，只擾動理想形狀會讓空心鎖看起來是綠的。**
    - ⚠️ **驗證誠實聲明**：排程輪起不了 dev server ⇒ **無 preview 無目視**；新增的「🎛️ 經濟旋鈕」區塊**排版未經任何人眼或真實渲染引擎確認**（測項驗的是結構與行為，非像素）＝本輪最大未驗證面，**下一個可靠 preview 之輪請優先目視**（八張表 × 3–7 列的表格在 ≤720px 是否橫捲）。
    - ⚠️ **本卡未做、已記為 #97 的兩件事**：(a) 反向鎖的偵測**只涵蓋兩種形制**（`{demo,live}` 表／`isLive() ? [..] : [..]`），**抓不到「純量常數藏在 isLive 分支裡」**——實測至少還有 `core/faucet.js` 的 `LIVE_CAP=5` 與 `core/progress.js:189` 的 VIP 升級金 `× 0.4`；(b) 儀表板的 `STATIC_RISKS` 六條風險文案裡**手抄了 5 組數字**（返水 0.1–0.3%／返現 2–6%／VIP 金 40%／faucet 300+5 次／流水 10×→6×、1×→0.5%），本輪逐項比對**目前全部相符、尚未漂移**，但它們正是 `describe()` 已經能提供活值的東西。
    - ⚠️ **i18n 據實記錄（P3 紀律的例外，非遺漏）**：`views/ops-dashboard.js` **現況零 i18n 覆蓋**（實測「收支總覽」「送幣成本明細」「已知結構性風險」「規則健檢」等既有字串在 `i18n.js` 皆 **0 命中**）＝這是一個從未被翻譯的**營運內部工具**（藏在 ⚙ DEMO 工具後）。本輪新區塊沿用該檔既有慣例、**刻意不只為自己這一區補三語**（單區翻譯反而製造不一致）；不開卡（操作者專用、價值低）。

> 🤖 **以下由自我進化引擎「平台軌」自動開卡**（2026-08-13 **20:00 窗** · 來源：**rainbet 首次建檔深挖**〔本輪最大研究發現：多訊號一致的流量冠軍，先前完全不在庫〕+ `intel/db/platform-modules.json` **功能** 分類審〔13 模組，08-06＝當時全庫最舊〕）。全自動模式下標 🟦已批准待做。

91. ✅完成（2026-08-14 平台軌·08:00 窗） **週期獎勵「檔期軸」：把 `reload` 的私有 `PERIODS` 升為可註冊 + 加階級解鎖閘** — S–M — 來源：**Rainbet 2026-08-13 首次建檔**（獎勵被產品化為**五個各有刷新週期與解鎖條件的桶**：Rakeback **每 15 分鐘**／Daily／Weekly／Monthly／**Pre-Monthly〔Silver 段位以上才解鎖〕**）。
    - 現況（**先查證再開卡，避免重造已有的東西**）：#24 `core/reload.js` **已是同型容器且長得很好**——`PERIODS` 三檔 × **懶判定週期閘**（`num() !== 已領序號`，跨期自動可領）× VIP 等級放大金額 × 領取入 `HL.bonus`（帶 `source` 自動進帳本）× `msToNext()` 倒數 ⇒ **Rainbet 五桶中的 3 桶已覆蓋**。`core/rakeboost.js`（#81）另已有「領取即觸發限時加成」形制。
    - 缺口（grep 機械實證，**三項皆為「補出口」而非「造軸」**）：① **無註冊出口**——`grep -n "register\|minTier\|gate\|unlock" core/reload.js` **0 命中**（僅檔頭註解提及 gate），`PERIODS` 是模組私有硬寫陣列 ⇒ 加一檔必須改該檔原始碼，外部模組/活動無法註冊自己的檔期桶；② **無階級解鎖閘**——現況所有檔位**全等級皆可領**、只有**金額**依 VIP 分級 ⇒ 做不出 Pre-Monthly 這種「Silver+ 才出現的桶」；③ **無次日級（sub-day）節奏先例**——三檔皆 ≥1 天（數學形制 `num`/`msToNext` 直接支援 15 分鐘，不需改架構）。
    - 範圍（純前端 · 容器先於內容 · **本卡一個獎勵金額都不新增**）：① `HL.reload.register({ key, ic, label, amts, num, msToNext, minTier })`，`PERIODS` 三筆種子改由同一出口註冊（**自己吃自己的狗糧**＝證明出口真的夠用，比照 #55 dock 第二代註冊者）；② `minTier` 選用，**不宣告＝全等級可領＝現況**（零回歸錨點）；③ 允許 sub-day 週期。
    - ⚠️ **必寫成測項的不變量**：(a) **未宣告 `minTier` 時逐位零回歸**（三檔種子的可領判定/金額/倒數與改版前相同）；(b) **階級閘不得可繞過**——`claim(key)` 本身要擋，不能只在 UI 隱藏（否則 console 一行就領到）；(c) **`claimableCount()` 必須排除被階級閘鎖住的桶**（否則紅點顯示可領、點進去卻領不到）；(d) 註冊即擴充（`register` 後 `status()` 多一筆、`claim` 可領）；(e) 反向 grep 鎖：`PERIODS` 不得再被檔外直接引用/硬寫擴充。
    - 來源：`intel/platforms/rainbet.md`（2026-08-13 建檔）。⚠️ **與 #91 之後的「15 分鐘 rakeback 桶」分工**：本卡只做**出口與閘**，真要加 sub-hour 桶是另一張卡，且**經濟面須先收斂真站值**（sub-hour 節奏顯著提高送幣頻率，§11）。
    - ✅ **落地（2026-08-14 平台軌·08:00 窗）**：`core/reload.js` 的 `PERIODS` 改為空登記表 + `register(spec)` 出口，**三檔種子改由同一個 register() 註冊**（自己吃自己的狗糧）；新增 `unlocked(p)` 階級閘（`minTier` 為 VIP index 下限，不宣告＝現況）；`status()` 加 `locked/minTier/minTierLabel` **加法式新鍵**；`claimableCount()` 與 `claim()` 皆排除被鎖桶；`open()` 對被鎖桶渲染「🔒 尚未解鎖 + 解鎖條件」；出口 `HL.reload.register/keys`。i18n 補 EN/zh-Hans 各 2 鍵。sw v161→v162。
    - ✅ **驗證**：① **零回歸以「HEAD 版 vs 本輪版逐位比對」證明**（沿用 08-13 的 shim 手法：`new Function` 載入*真的那份* reload.js、固定假時鐘）——5 個 VIP 等級 × 3 種已領狀態下 `status()` 的**舊有 6 鍵逐位相同**、`claimableCount()` 相同、三檔 `claim()` 的回傳值／`bonus.add` 參數／localStorage 落點逐位相同，**67/67**。② 常駐鎖 2 條入 `tests/checks-platform.js`（`platform/reload-period-outlet` 反向 grep + 出口存在 + 種子樣本量下限 3；`platform/reload-tier-gate` 涵蓋不變量 a/b/c/d），node fast **115→117 全綠**。③ **負向擾動 3/3 皆被抓**（拿掉 `claim()` 的 `unlocked` 閘／`claimableCount()` 忽略閘／他檔引用 `PERIODS`）＝非空心鎖。⚠️ **驗證誠實聲明**：排程輪起不了 dev server（沙箱拒無人值守 preview），故**無瀏覽器 e2e**；`open()` 的 🔒 渲染分支**在目前沒有任何種子宣告 `minTier` 的情況下不會被執行**（＝視覺零變更），該分支的目視驗證留待第一張真的帶 `minTier` 的卡。

92. ✅完成（2026-08-14 平台軌·14:00 窗） **`liveroom` 跟注在取不到真桌結果時 fallback 硬幣翻轉，卻走真派彩路徑** — S → 實際 S–M（範圍實測後擴大：**消費端 1 → 2**） — 來源：**platform-modules「可驗證公平」2026-08-13 複審**（本輪查獲，非外部平台）。
    - 問題（**唯一仍會影響真實派彩卻不可驗算的分支**）：`views/liveroom.js:140` — `var winner = o ? o.winner : (Math.random() < 0.5 ? side : (side === "banker" ? "player" : "banker"));`。`o` 為真桌結果；取不到時退化為 **`Math.random()` 硬幣翻轉**，而該路徑**真扣真派**（§4/7d：虛擬主播跟注走真 `HL.baccarat`、真扣 `HL.money`、掛 `liveStats`）⇒ 玩家實際輸贏由不可驗算的 `Math.random` 決定。同檔 `:158` 的 `Math.random` 為假聊天觸發＝非關鍵、無須動。
    - 為何是 S 且值得做：本輪複驗證實**全 24 款登錄遊戲的決定路徑已全數走 `HL.fair`**（可驗證公平模組因此 partial→**present**），這一行是**殘留的唯一真缺口**；修法極小＝比照同檔既有形制改走 `HL.fair.floatOr("liveroom")`（一行），並補一條測項鎖住「liveroom 的勝負決定不得出現 `Math.random`」。
    - ⚠️ **注意兩件事**：① **不要順手把 `:158` 假聊天也改掉**——那會讓假活動的隨機性吃掉 fair 的 nonce 序列，使 `betlog` 的 `nonce_end` 對不回該局（`fair.js` nonce 是全站共用遞增）；② 若判定「取不到真桌結果」本身就該是錯誤狀態（而非正常 fallback），更正確的修法可能是**退回未結算跟注**（同檔 `:134` 離開直播間時已有此形制）而非翻硬幣 ⇒ 實作前先判斷這兩條路哪個才是真意圖。
    - 來源：`intel/db/platform-modules.json`「功能/可驗證公平」（2026-08-13 複審）。
    - ⭐ **實作前重新機械量測，卡上的兩個前提各修正一項（同 #86『卡片範圍是上一輪的推論』家族）**：
      - **① 嚴重度被低估＝這不是殘留邊角，是 08-07 之後的『預設路徑』**。`git show` 逐版比對證明：#80（內建遊戲延遲載入，08-07 14:00 落地）**把 `table-baccarat.js` 移出 `index.html`**（#80 前 `index.html` 命中 `table-baccarat` 1 次、HEAD **0 次**），而 `liveroom.js`／`streamer.js` 仍是靜態載入 ⇒ **玩家只要沒開過百家樂，`HL.baccarat` 就不存在**，每一局跟注都由 `Math.random` 決定真實輸贏。⇒ **通則：延遲載入會把休眠的「防呆分支」升級成「預設分支」**；改載入方式時必須重掃所有 `HL.<模組> &&` 形式的守衛（本輪即靠 grep `HL.baccarat` 找到第二個消費端）。
      - **② 範圍是 2 個消費端不是 1 個**：卡上只列 `views/liveroom.js:140`，實測 `layout/streamer.js:156`（子母畫面 PiP 跟注）有**逐字同型**的後備分支，且同樣真扣真派。只修其中一個＝反向鎖必須被改鬆才能通過（#86 同型陷阱）⇒ **兩個一起修**。
      - **③ 修法選了卡上的第二條路（退回未結算跟注）而非第一條（改走 `HL.fair.floatOr`）**：50/50 硬幣與百家樂真實勝率／莊 1.95× 賠付本來就對不上，改走 fair 只會讓它**「可驗算地錯」**；取不到真桌＝錯誤狀態，正解是比照 `liveroom.js:134`（離開直播間退回跟注）與 `streamer.js` `teardown/cancelFollow(true)` 兩處**既有形制**。卡上的禁區也遵守：**未動** `liveroom.js` 假聊天的 `Math.random`（動它會吃掉 `HL.fair` 的 nonce 序列，使 `betlog` 的 `nonce_end` 對不回該局）。
    - ✅ **落地（容器先於內容）**：新增 `core/live-table.js`＝**真桌結果的單一出口** `HL.liveTable`（`result()` 取不到回 **null、絕不編造勝負**／`ensure()` 冪等地請 #80 延遲載入器拉 baccarat／`available()`），兩個消費端改走同一份；`result()` 取不到時**自癒式**自己請一次載入（消費端入口漏喊 `ensure()` 時，最壞只是第一局不結算、不會永遠不結算——此設計是負向擾動實測逼出來的）。入口（`liveroom.render()`／`streamer.open()`）各先拉一次 ⇒ 開獎前就位、玩家看不到退回局。i18n 補 EN/zh-Hans 各 2 鍵（P3 紀律；已先 grep 確認無撞既有語意）。`index.html` 掛載、sw v162→v163。**本卡一分錢的派彩公式都沒改**。
    - ✅ **驗證**：① node fast **118→120 全綠**（新增 `platform/live-table-no-fabrication`＝真桌未就緒時連跑 50 次恆 null／有真桌時原樣傳回且**每局只開一次牌**〔多開會吃 nonce〕／殘缺結果視為取不到／`ensure()` 冪等・已可用時不請・無載入器時安靜略過；`platform/live-table-consumers`＝**反向鎖**：決定 `winner` 的行不得含 `Math.random`、兩消費端不得再直接碰 `HL.baccarat`、**樣本量下限 2**、出口須真的掛在 `index.html`，並含**不空心證明**〔假聊天的 `Math.random` 必須還在，否則代表有人為了讓鎖變綠把假活動也改掉〕）。② **負向擾動 7/7 皆被抓**（winner 改回硬幣翻轉／繞過出口直接碰 `HL.baccarat`／`result()` 編造勝負／拿掉自癒／`ensure()` 失去冪等／`index.html` 漏掛／入口漏喊 `ensure()`）。⚠️ **驗證誠實聲明**：排程輪起不了 dev server ⇒ **無瀏覽器 e2e**；`available()` 為 true 是絕大多數實際情境（入口預拉），故新的「退回跟注」文案在正常流程下**不會出現**＝視覺零變更，該分支目視留待可靠 preview 之輪。

> 🤖 **以下由自我進化引擎「平台軌」自動開卡**（2026-08-14 **08:00 窗** · 來源：`intel/db/platform-modules.json` **前端UI/UX + 資料** 兩分類複審〔皆 08-07＝當時「功能」以外最舊〕）。全自動模式下標 🟦已批准待做。

93. 🟦已批准待做 **導覽入口註冊表 `HL.nav`：三個導覽表面的項目全是硬寫，本模組承諾的 registry 從未兌現** — S–M — 來源：**platform-modules「前端UI/UX / 導覽殼層」2026-08-14 複審**（本輪查獲，非外部平台）。
    - 問題（grep 機械實證）：導覽有**三個表面**——桌機側欄 `sidebar()`（`app-shell.js:505`）、手機抽屜 `mobileDrawer()`（:643）、底部列 `bottombar()`（:600）。**前兩者已共用同一份私有陣列 `SIDE`**（:15，5 筆：大廳/全球獎/競技場/娛樂城/更多）＝單一真相、不會 drift（這點做得好，別破壞）；**但底部列的 5 個獎勵入口（任務/簽到/錦標賽/福利/VIP）＋右側 3 顆 FAB（夥伴/聊天/成長）是逐個行內 `item(...)` 呼叫硬寫**，零描述子、零 `enabled`、零 `order`。
    - 為何值得做（**這是本模組自己寫了很久卻從未兌現的承諾**）：台帳「導覽殼層」的 `stowable_note` 白紙黑字寫著「導覽項目應為 registry 陣列（icon+label+view+enabled+order）可拖排/隱藏，**未啟用模組不出現避免入口擠壓**」——**三個表面沒有一個做到**。而 `apexwin-ui-quality` skill 收錄的三大真實反例之一正是「**底部列 17 項擠壓**」，其根因就是缺 `enabled`/`order`：每加一個功能就多一顆常駐鈕、沒有任何機制能把它收起來。⇒ 這張卡同時是**擴充性卡**與**既有 UI 品質債的根因修法**。
    - ⚠️ **判別註記（避免下輪誤讀）**：這**不是**「台帳承諾與現況不符」那一類（#90 家族）——`stowable_note` 是**可收納設計意圖**、不是對現況的宣稱，故該模組 status 正確維持 `present`（導覽功能本身完好、手機抽屜 a11y 齊備）。真正的訊號是「意圖存在但一直沒有出口」。
    - 範圍（純前端 · 容器先於內容 · **本卡不新增也不移除任何一個導覽入口**）：① `HL.nav.register({ surface, key, ic, label, go|onClick, group?, enabled?, order?, badge? })`，`surface` ∈ `side`/`bottom`；② 現有 5 筆 `SIDE` + 底部列 5+3 顆**全部改由同一出口註冊**（比照 #91/#55 自己吃自己的狗糧）；③ 三個 render 函式改為遍歷登記表（依 `order` 排序、`enabled:false` 不渲染）；④ `badge`（如「N 可領取」副標）改為描述子上的取值函式，而非行內閉包。
    - ⚠️ **必寫成測項的不變量**：(a) **逐位零回歸**——註冊表驅動後，三個表面渲染出的項目 key/順序/文案與改版前完全相同（沿用 #91 的「HEAD 版 vs 新版 shim 比對」手法）；(b) `enabled:false` 的項目**三個表面都不出現**（不是只有其中一個）；(c) 側欄與抽屜**必須仍讀同一份來源**（反向鎖：不得出現第二份主導覽清單，否則等於把現有的單一真相退化掉）；(d) 反向 grep 鎖：`SIDE` 與底部列項目不得再被檔外或行內硬寫擴充。
    - 依賴/風險：**三個表面都要 preview 逐一目視**（含 ≤720px 抽屜態與桌機收合 icon-rail 態）⇒ **這張卡不適合 headless 排程輪落地**，宜排在可靠 preview 之輪。

94. ✅完成（2026-08-15 平台軌·20:00 窗，**三條軸只上一條，且 rtp 軸被查證為「現在不能做」而非「先不做」**） **大廳「玩起來像什麼」分群軸（節奏／波動／RTP 型）** — M — 來源：**platform-modules「前端UI/UX / 大廳分群軸」2026-08-07 建檔、2026-08-14 複審仍 absent 滿一週**。
    - 問題（grep 機械實證）：`views/casino.js` 對 `volatility`／`pace`／`rtp`／`playstyle`／`quickWin` **五個關鍵字全部零命中**（不分大小寫）。現有分群軸**全部是目錄型 metadata**——`filter` 僅 all／hot／new／fav／community／`author:<暱稱>`／`cat`，`sortBy` 僅 default／popular／new／az。玩家問的「我現在想玩**節奏快、輸贏小**的」這條軸完全不存在。
    - 為何值得做：ApexWin 的**遊戲數已到 20+ 款**（且遊戲軌每輪還在加），目錄型分類的邊際效益正在下降；而本專案**恰好有別家沒有的素材**——四款保真 slot 與多款 instant 都已有**經蒙地卡羅證過的 RTP 與波動特徵**（遊戲軌的 gate_log），這條軸對別家是行銷話術、對 ApexWin 是**有實測數據撐的真分類**。
    - 範圍（純前端 · 容器先於內容）：① 分群軸為 config 陣列 `{ key, label, predicate }`，未啟用的軸不出現在 tab 列（**避免入口擠壓**，與 #93 同一設計原則）；② 遊戲 meta 加 `pace`／`volatility`／`rtp` 三個**選用**欄位，**缺值的遊戲自動不進該軸**（而非顯示為 0 或假值）；③ 先只上「節奏」一軸驗證形狀，波動/RTP 軸留後續填。
    - ⚠️ **必寫成測項的不變量**：(a) 缺值遊戲不得出現在任何分群軸結果中；(b) 新增一軸只需加一筆 config、不得改 render；(c) 既有 filter/sortBy 行為零回歸；(d) **RTP 欄位的值必須與遊戲軌 `games-catalog.json` 的 gate_log 對得上**（反向鎖：不得在 UI 端自己編一個好看的數字）。
    - 依賴：需要遊戲軌提供逐款的 pace/volatility 判定（可先由平台軌依 gate_log 代填、標註來源），**跨軌，宜先在卡上談好誰是權威**。
    - ✅ **落地（容器先於內容）**：新增 `core/game-axes.js`＝`HL.gameAxes` 分群軸註冊表（**容器本身一條軸的內容都沒有**）＋ `data/game-traits.js`＝逐款特徵側表 + 軸設定；`views/casino.js` 只接三個點（`match` / `tabs` / `labelOf`），**它認得的只有「這是不是一個軸 key」，不認得任何一條軸的名字** ⇒ 加一條軸＝在 data 檔多一筆 register，render 一行都不用改（寫成常駐鎖）。i18n 補 EN/zh-Hans 各 3 條（桶標題是整節點純片語 ⇒ 依 P3 契約**真的翻得到**）。sw v167→v168。
    - ✅ **卡上的不變量 (d) 在實作時被查證為「不能照字面建」，且它要防的事另有更近的答案**（「卡片範圍是上一輪的推論」家族第 5 次，本次的變形是**鎖的錨點不存在**）：卡上要求「rtp 的值必須與 `games-catalog.json` 的 `gate_log` 對得上」——但 `gate_log` 是**自由散文**（整段敘述、無結構化欄位），且 `intel/` 不被前端服務 ⇒ 無法逐位比對。更關鍵的是：**RTP 早就有一份玩家看得到的真相**＝各遊戲 view 內的 `HL.ui.gameInfoBar({ rtp: "96.27%" })`（實測 **8 處／8 檔**）。在大廳側表再抄一次就是**第二份真相**，而且是最壞的那一種——遊戲軌改了賠付表只會去改 gameInfoBar，不會想到來改大廳。⇒ **處置：側表刻意不收 `rtp`**，改以反向鎖 `platform/game-axes-no-second-rtp` 擋住往後偷加，並把「先讓 gameInfoBar 的 rtp 可列舉」開成 **#98**。⚠️ 這一點 **08-07 建檔時其實已經寫在台帳 evidence 裡**（「各遊戲的 RTP/莊優只以顯示字串存在＝不可查詢」），只是 08-14 開卡時沒有把它讀進不變量 ⇒ **通則：開卡時要把來源模組 evidence 裡的「阻塞事實」一起抄進卡，否則實作輪會重新發現一次**。
    - ✅ **權威分工（卡上「宜先談好誰是權威」的答覆，已寫進 `game-traits.js` 檔頭）**：`pace`（互動節奏）＝**平台軌**擁有，因為它是**互動結構不是數學**——判定只需看該遊戲有沒有「局中兌現」控制，任何人可一行 grep 複驗；`volatility` / `rtp` ＝**遊戲軌**擁有，因為要蒙地卡羅或解析證明，平台軌無權代填。⇒ 跨軌依賴就此解除，本卡不必等遊戲軌。
    - ✅ **判準可機械複驗，而且它當場改掉了我一個憑印象的分類**：rubric＝`stepwise` ⟺ view 檔有局中兌現控制，實測 24 款只有 6 款（crash-x／mines／chicken-cross／pump／towers／hilo）。⚠️ **`picks` 原本被我歸為「等待開獎」**（「賽事預測當然要等賽果」），讀碼才發現 `betBtn → settle()` **當下就結算**（站內 mock 賽程、不接真實賽事 feed）⇒ 正確歸 instant。**pending 桶保留在設定裡但目前 0 款 ⇒ 依容器規則不渲染**——這讓「空的不出現」在**真實資料**上被實證，而不是只在測項裡。最終 instant 18／stepwise 6／pending 0，覆蓋 **24/24**。
    - ✅ **驗證**：① node fast **131→134 全綠**（新增三項：`platform/game-axes-container` 缺值不進任何桶／空桶與單桶軸不渲染／`enabled:false` 三處都不出現／非軸 key 必須回 `null` 而非 `false`；`platform/game-axes-pace-rubric` 側表不得有幽靈 id、stepwise ⟺ 真有兌現控制、覆蓋率、真實 roster 下只渲染 2 桶；`platform/game-axes-no-second-rtp` 反向鎖 + 載入序 + casino.js 不得硬寫軸名）。② **負向擾動 16/16 全被抓**。③ **零回歸以 HEAD 版 vs 本輪版逐格比對證明**：抽出兩版的 `matchFilter`，對 **21 個既有 filter key × 24 款遊戲＝504 格**逐格比對，**504/504 相同**；並附**不空心證明**（同一個軸 key 在 HEAD 版命中 0 款、本輪版命中 18/6 款＝新程式碼真的有跑，不是「零回歸因為根本沒生效」）。
    - ⚠️ **負向擾動再次證明「只驗綠燈看不出鎖是空的」**：`no-second-rtp` 首版只驗 `rtp:`（物件字面量形），**正向測試全綠**，但擾動用真實會出現的另一種寫法 `put(id, "rtp", 96.5)`（欄位名走**字串引數**）當場穿過去 ⇒ 修成「欄位名以任何形式出現都算」後兩種寫法都被抓。**與 08-15 08:00 窗的 `isLive()[\s)]*\?` 同一條教訓的第二次應驗：擾動要用真實世界會出現的形狀，不是腦中的理想形狀。**
    - ⚠️ **驗證誠實聲明**：排程輪起不了 dev server（工具明確回「unattended session 不能開 dev server」）⇒ **無 preview、無目視**。本卡**在大廳頁籤列新增了 2 個頁籤**，其在 ≤720px 的換行/橫捲表現**未經任何人眼或真實渲染引擎確認**＝本輪最大未驗證面，且與 #90/#97 的經濟旋鈕面板（11 張表）、#72 說明中心面板**並列待目視，已連續四輪**。

> 🤖 **以下由自我進化引擎「平台軌」自動開卡**（2026-08-14 **14:00 窗** · 來源：`intel/db/platform-modules.json` **功能** 分類複審〔12 模組，08-06＝當時全庫最舊〕）。全自動模式下標 🟦已批准待做。

95. ♻️併入 #72（2026-08-14 平台軌·20:00 窗判定重複，設計已被吸收） **說明中心 `HL.helpdesk`：玩家主動查詢的常設說明完全沒有出口（模組唯一真空的那一半）** — S–M — 來源：
    - ♻️ **判定與處置**：本卡（08-14 14:00 窗開）與 **#72**（08-06 08:00 窗開）**來源同一個模組**（`功能/支援與透明度中心`）、**出口形狀同一種**（可註冊說明條目表 + 分群 + 搜尋）、**首批註冊者同一批**（sla／fair／rg／edge）＝實質重複；SKILL 第 3 步的「去重：已在佇列的剔除」在 14:00 窗失效（只比對了卡名、沒比對來源模組與出口形狀）。⇒ **以較早的 #72 為主體落地**，本卡標 ♻️併入、不重複實作。
    - ✅ **本卡多出來的兩個好設計已被 #72 吸收**：① `when()` 情境述詞（不符情境的條目不渲染），且落地時強化為「**面板與搜尋共用同一個 `visible()` 出口**——只藏其一等於沒藏」；② 入口紀律「**不新增第 N 顆常駐底部列按鈕**」（`apexwin-ui-quality` 反例「底部列 17 項擠壓」）⇒ 落地選擇把側欄「更多」的 `ui.comingSoon` **死巷**改成真入口，`SIDE` 維持 5 筆、一顆鈕都沒加，並寫成常駐鎖。
    - ⚠️ **本卡的一條前提查證後不成立，記此以免下輪重踩**：卡上寫「本卡應是 **#61 `HL.content`** 的一個 type 消費者、共用同一份註冊表」，但 **#61 從未落地**（`HL.content` 全 repo **0 命中**）⇒ 該約束當下不可能滿足。#72 落地時自帶最小登記表，並在 `core/support.js` 檔頭載明「#61 落地後內容物可改掛 `HL.content`，登記表本身保留為出口」。
    - 原卡內容如下（保留供稽核）：**platform-modules「功能 / 支援與透明度中心」2026-08-14 複審**（本輪查獲，非外部平台）。
    - 問題（grep 機械實證，**本輪把模組拆成兩半分別量測才看清楚**）：`幫助中心|支援中心|helpCenter|HL.help|HL.support|FAQ|常見問題` 於 `prototype/src/**/*.js`，**排除 i18n 字典與註解後 0 命中**。玩家遇到「為何紅利不能領／流水還差多少／提款要多久／這個 🔒 是什麼意思」時，**只能在 UI 上自己摸索**。
    - ⚠️ **同時據實記另一半已經有了**（故本卡是 S–M 不是 L，且模組 status 本輪由 `weak` **上修為 `partial`**）：透明度側已有**三個真出口**——`HL.sla`（#63 提領時效／各週期額度／客服層級，依段位）、`HL.release`（#75 發佈狀態）、`HL.responsible`（#70 責任博弈工具）。缺的是**把它們（以及各模組自己的規則）匯到一個玩家找得到的地方**，不是從零造。
    - 範圍（純前端 · 容器先於內容 · **本卡不新增任何一條規則文案的「內容」，只做承載它的架子**）：① `HL.helpdesk.register({ key, group, q, a|render, order?, when? })`＝說明條目註冊表，**各模組自己註冊自己的說明**（紅利流水規則由 `progress` 註冊、提領時效由 `sla` 註冊、公平性由 `fair` 註冊…＝誰擁有規則誰負責解釋，避免說明與規則各改各的而 drift）；② `when()` 選用述詞，**不符情境的條目不渲染**（避免入口擠壓，同 #93/#94 設計原則）；③ 一個可搜尋的面板 + 從既有表面（`HL.dock` 或側欄「更多」）進入，**不新增第 N 顆常駐底部列按鈕**（`apexwin-ui-quality` 反例「底部列 17 項擠壓」）。
    - ⚠️ **與既有模組的分工（去重紀律，卡上先寫清楚免得做成第二套）**：`HL.notify` 管「**推**給你的即時事件」、本卡管「你**主動去查**的常設說明」；**#61 `HL.content` 管營運文案的內容物 ⇒ 本卡應是它的一個 type 消費者，共用同一份註冊表，不得另造一套內容儲存**。
    - ⚠️ **必寫成測項的不變量**：(a) 註冊即出現（新增一條說明不必改面板 render）；(b) `when()` 為 false 的條目**不得**出現在面板與搜尋結果**兩處**（只藏其一等於沒藏）；(c) 反向 grep 鎖：規則類說明文字不得再散寫在各面板行內（樣本量下限 ≥ 首批註冊者數）；(d) 未註冊任何條目時面板只是空狀態、不得整頁壞掉（同 #90 不變量 c）。

> 🤖 **以下由自我進化引擎「平台軌」自動開卡**（2026-08-14 **20:00 窗** · 來源：`intel/tools/ledger-card-sweep.js` 掃出 `資安/負責任博弈` 的缺口敘述已過期，回填後查獲其**唯一剩餘的純前端缺口**）。全自動模式下標 🟦已批准待做。

96. ✅完成（2026-08-16 平台軌·14:00 窗） **自我排除（self-exclusion）：責任博弈工具最後一塊、也是唯一一塊不需後端的缺口** — S–M — 來源：**platform-modules「資安 / 負責任博弈」2026-08-14 複審**（本輪由台帳自我查核掃出，非外部平台）。
    - ✅ **落地（`core/responsible.js` 為主 + `layout/app-shell.js` 一行 + `i18n.js`）**：新增**暫停期間註冊表** `PAUSES`（冷靜期 3 筆＝既有 24h/7d/30d **由面板硬寫遷入、值逐位不變**；自我排除 4 筆＝6 個月／1 年／5 年／永久），`registerPause` 自我上架＝**加一種期間＝加一筆 spec、面板與閘一行不改**。二次確認 modal（確認鈕刻意不是主色 CTA、取消才是視覺預設出口）、生效期間**整段設定 UI 收起**只留倒數。sw v171→v172。
    - ⭐ **關鍵設計＝把「自我排除」做成既有冷靜期的第二個 kind，而不是第二套機制**：兩者對閘的要求逐字相同（擋注+擋儲值、不可提前解除、到期恢復），差別只有長度與確認強度。做成兩套 ⇒ 閘就有**兩個入口**，第二個哪天漏接就是一個「UI 擋得住、console 擋不住」的洞——**正是不變量 (a) 要防的事**。⇒ 全站只留**一個**被閘讀取的欄位 `pause.until`，既有 27 個閘呼叫點**一處未改**即自動涵蓋自我排除。
    - ⭐ **不變量 (b) 改成「結構上做不到」而非「UI 藏起來」**：`planPause` 是 pause 的**唯一寫入口**且只能加長，更短一律原樣退回（no-op）⇒ 已排除 5 年者點 24 小時冷靜期無效、永久排除後點任何選項都無效。常駐鎖 `platform/self-exclusion-single-writer` 直接禁止任何其他形式的 `.pause =` 指派。
    - ⭐ **期間值依調研改掉卡上的推測**（卡寫 90 天／180 天／1 年／永久）：Stake「Break in Play」＝1 天/2 天/1 週/1 個月（與我方冷靜期同族），其 self-exclusion 為**無限期、最短 6 個月起跳**、期滿需 formal return to play review；業界通用為 **6 個月／1 年／5 年＋永久** ⇒ 採後者。**刻意未做「期滿人工復場審查」**（需客服/後端裁決＝CONTROL.avoid，純前端只能做成假流程）⇒ 採「期滿自動恢復、永久型永不恢復」，界線寫進台帳。
    - ⭐ **「永久」用最大合法時戳而非 `Infinity`**：`JSON.stringify(Infinity)` 會變成 `null` ⇒ 存進 localStorage 讀回來**鎖會自己開**。用 `8640000000000000` 則 `now < until` 這條唯一判斷式不必為永久型加任何特例（已寫成測項：永久值必須能 JSON 往返）。
    - ✅ **驗證**：node fast **142→149 全綠**（新增 4 條行為鎖 `rg/self-exclusion-gate|-monotone|-expiry`＋`rg/pause-registry`、3 條源碼結構鎖 `platform/self-exclusion-gate-authority|-single-writer|-options-config`）；**負向擾動 13/13 全被抓**（evaluate 回退成只認冷靜期、三個閘出口各自改回讀 `coolUntil`、拿掉單調守衛、拿掉 no-op 退回、新增 `pause=null` 解鎖後門、永久改 Infinity、砍掉一個期間、期間短於最長冷靜期、面板改回寫死時長、改用 sessionStorage、拿掉 permanent 旗標）。**零回歸以 HEAD 版 vs 本輪版 `evaluate` 逐格比對證明＝10935 格全同**，其中 **2936 格真的走到擋注分支**（非空心）；同一組輸入餵 pause 物件時 HEAD 版回 `{ok:true}`、本輪版回 `{ok:false,kind:"exclude"}`＝新行為確實是新的。
    - ⚠️ **本輪首版的鎖是空的，是測項自己抓出來的（同一教訓第四次應驗，這次換載體）**：`platform/self-exclusion-gate-authority` 首版用 `new RegExp("function " + fn + "\\(…")` 組樣式——**字串字面量會先吃掉一層反斜線**（`\(`→`(`、`\s`→`s`），regex 當場失效、`exec` 恆為 null。與 08-14「測項寫進 template literal 使 `\s` 被吃掉」同病不同載體 ⇒ **通則升級：含正則的測項一律用字面量正則，需要動態片段就改「先切片、再用字面量正則」**。第二版又踩 lazy 量詞（`allowed` 寫成 `evaluate(load().limits,…)`，`[^;]*?` 停在 `load(` 的右括號）⇒ 改貪婪。
    - ⚠️ **順帶修一個既有的讀不出意義的顯示**：`fmtLeft` 原本一律印小時，7 天/30 天冷靜期會顯示「168h 0m」「720h 0m」；自我排除更會印出「43800h 0m」⇒ ≥1 天改印天數。**這是本輪唯一一處既有行為的視覺變更**（值不變、單位變）。
    - ⚠️ **未驗證面（誠實聲明）**：排程輪起不了 dev server ⇒ **無 preview、無目視**。二次確認 modal 的排版、生效期間的「入口收起態」、以及新的兩排 chip 在 ≤720px 的換行**皆未經任何人眼或真實渲染引擎確認**（行為與結構由 149 項測項 + 13 次擾動保證，但那不是像素）⇒ **待目視清單增為五項**。
    - 現況（**先查證再開卡**）：#67 `core/responsible.js` **已經很完整**——限額型別註冊表（4 型：每日淨損／每日投注額／單注／每日遊玩時間）＋ 下注前閘 ＋ 中央結算點累積 ＋ **調升冷卻的不對稱性**（調降立即生效、調寬須等 24h）＋ 現實檢查 ＋ 冷靜期（24h/7d/30d，不可提前解除）。本輪並確認 **#86 已把閘覆蓋到 20 個檔／27 處**（含四款買入型 slot），累積側與閘側不再不對稱。
    - 缺口（grep 機械實證）：`自我排除|selfExclude|self_exclude` 於 `prototype/src` **0 命中**。現有冷靜期是**時限型**（最長 30 天、到期自動恢復），業界標準的 **self-exclusion 是「長期／永久且期間內不可自行解除」**——兩者不是同一件事：冷靜期是「我想休息一下」，自我排除是「我要把這扇門鎖上、且鎖上之後不讓當下的我打開」。⇒ 這是本模組 `partial` 僅剩的**純前端可做**理由（另一項「跨裝置／伺服器權威強制」需後端，屬真金前項目，**不在本卡**）。
    - 範圍（純前端 · **沿用既有形制，不另起爐灶**）：① 期間選項為 **config 陣列**（如 90 天／180 天／1 年／永久），比照 `TYPES` 註冊表風格，加一個期間＝加一筆 config；② 沿用冷靜期既有的「全站擋注」機制與**不可提前解除**語義，差別在**長度**與**解除路徑**（永久型不提供任何前端解除入口）；③ 生效期間**入口本身也要收起來**（不是點進去才擋），避免每天面對一顆點不動的按鈕；④ 設定當下需**二次確認 + 明確告知不可撤銷**（這是唯一一個「刻意讓玩家更難做」的流程，別套用一般 CTA 的順滑設計）。
    - ⚠️ **必寫成測項的不變量**：(a) **不可繞過**——擋注要在 `HL.rg` 的閘本身（比照 #67/#86 的 27 處覆蓋），不能只在 UI 隱藏（否則 console 一行就下注）；(b) **不可提前解除**——生效期間任何前端路徑都不得縮短或取消它（含改設定、切站別、清單一鍵重置）；(c) **站別命名空間隔離不得成為漏洞**：真站設了自我排除、切到假站可以照玩是可接受的（兩站是平行宇宙），但**同一站內切語言／重新載入／換裝置模擬都必須仍生效**；(d) 到期（非永久型）自動恢復，且恢復後不得殘留半鎖狀態。
    - 依賴/風險：**需 preview 目視**二次確認流程與生效期間的入口收起態 ⇒ 宜排在可靠 preview 之輪；純 headless 輪可先做 `HL.rg` 側的閘與不變量測項、UI 留後。

> 🤖 **以下由自我進化引擎「平台軌」自動開卡**（2026-08-15 **08:00 窗** · 來源：實作 #90 時由**新落地的反向覆蓋鎖自己掃出的兩個殘缺面**）。全自動模式下標 🟦已批准待做。

97. ✅完成（2026-08-15 平台軌·14:00 窗） **經濟旋鈕自我描述層的兩個殘缺面：偵測抓不到「純量型」旋鈕 + 儀表板風險文案仍手抄數字** — S → 實際 S–M（**範圍由 2 個殘缺面擴為 3 張新註冊表**，第 3 張由新規則自己掃出） — 來源：**#90 落地當輪自我檢出**（非外部平台、非台帳輪替）。
    - ✅ **落地內容**：① 兩個「不可描述形制」收斂為可描述的兩站別表——`faucet.js` `RELIEF = liveOn() ? 300 : 1000` → `RELIEF_BY_SITE`、`progress.js` `LEGACY_WAGER_MULT = isLive() ? 8 : 1` → `LEGACY_WAGER_MULT_BY_SITE`；VIP 縮放係數具名為 `VIP_LIVE_SCALE` 並**先留存假站基準**（否則真站載入後陣列已就地改寫、`describe()` 只能手抄＝正是 #90 要根除的第二份真相）。② 新增 3 張註冊表 `faucet`／`vip-upgrade`／`jackpot`（**8 → 11**，採用度下限同步 8→11）。③ `STATIC_RISKS` 由字串陣列改函式陣列、數字一律 `knobSpan()` 當場求值。
    - ⭐ **卡上只寫 2 個殘缺面，宣告性質的規則自己多掃出 2 個**（同 08-15 08:00 通則第二次成立）：把偵測寫成「數字字面量由站別軸**選擇或縮放**」而非列白名單後，額外落網 `progress.js:38` 舊制流水倍數（8 vs 1）與 **`jackpot.js` 整張 `TIERS`**（起始池 8M/80k/3k→真站 0、貢獻率 0.5/0.3/0.2%→真站 0.15/0.1/0.05%）＝**§11 明列的印鈔黑洞修補處，兩站別值早已並存卻一直沒有出口**。
    - ⭐ **規則的「鑑別力」比「綠燈」重要，本輪兩個方向都證了**：(a) **窄了會漏**——`faucet.js` 的站別檢查藏在本地別名 `liveOn()` 後面，只掃 `isLive()` 整個抓不到（探針實測）；(b) **寬了會誤抓**——只要求「一臂是數字」的 naive 版會把 `raffle.js` 的 `botTickets: isLive() ? 0 : rint(6000,18000)`（假券氛圍量、非可調旋鈕）算成經濟表、逼出一個假的 register。⇒ 定案為「**兩臂都必須是數字字面量**」，並把這兩個方向各寫成一條常駐測項（鎖自己驗自己）。
    - ⭐ **求值當下查獲一筆「值沒漂、義已遷」**：原文案「返水 0.1–0.3%」恰為 `rakeback.legacy`（改制前流水固定費率）的真站值，但 #60 自 08-01 起已改為「返還該注理論莊家收入的 `edgePct`%（真站 4.8–14.5%）」⇒ **同一句話描述的機制已換過一次**，只因換算後有效費率仍落在 0.1–0.3% 這一帶，**逐項比對數字永遠看不出來**（08-15 08:00 那輪正是逐項比對後判「尚未漂移」）。⇒ 通則：**手抄數字的風險不只是值會漂，還有值不動而語意遷移**；已改為以現制單位敘述現制旋鈕（把新值塞回舊句子會變成「返水 4.8–14.5%」這種**可驗算地錯**的敘述）。
    - ✅ **驗證**：node fast **130→131 全綠**；**負向擾動 11/11 全被抓**（純量三元式復辟 ×2、拿掉 register ×2、文案改回手抄、取值數低於下限、面板改回硬列表 id、拿掉逐條 try/catch、掛載序倒置、規則改窄漏別名、規則放寬誤抓 raffle）；**不變量 (a) 順序證明**＝以 `git show HEAD:` 對 HEAD 版原始碼跑同一條規則，實測命中 `faucet.js`／`progress.js` **兩檔皆未註冊＝在 HEAD 為紅**，補完才轉綠。**零經濟回歸**＝shim 載入 HEAD 版 vs 本輪版，兩站別 × 10 個觀測值（faucet 續命金/門檻、JP 三池與 TIERS、紅利流水 req）**逐位相同**（假站 JP 池含 `Math.random()` 抖動且為**延遲載入**⇒ RNG 須在 probe 期間也釘住，首版只釘 boot 期間，兩次跑出來的假站池還不一樣）。sw v166→v167。
    - ⚠️ **本輪把 #90 的一條鎖改精確（不是改鬆，理由寫在測項裡）**：`platform/econ-cfg-dashboard` 原本禁止**整檔**出現旋鈕表 id，但本檔現在有**兩種都正當、需求卻相反**的消費者——面板必須 id 無關地遍歷、風險敘述本質上就是逐條指名。整檔黑名單分不出兩者，只會逼敘述層改回手抄數字。⇒ 收斂為「**面板區塊零 id**」＋新增正向要求「面板真的在遍歷 `all()` 的表與 rows」＋全檔「id 只能出現在 `knobSpan(` 引數位置」，退化路徑（硬列 N 張表）仍被擋住。
    - ⚠️ **未驗證面（誠實聲明）**：排程輪起不了 dev server ⇒ **無 preview、無目視**。「🎛️ 經濟旋鈕」面板現為 **11 張表**（08-15 08:00 為 8 張），其在 ≤720px 是否橫捲**仍未經任何人眼或真實渲染引擎確認**——**與 #72 說明中心面板並列為待目視項，且本輪又多了 3 張表**。風險文案已由 shim 走玩家實際路徑（攔截 `HL.ui.rules()` 收到的陣列）驗出 6 條正確求值，但那是結構與行為、不是像素。
    - 為何是「殘缺面」而不是「下一個功能」：#90 已把容器做好（八張表註冊、儀表板遍歷、健檢由描述子推導），這張卡只補**它自己蓋不到的兩個角**，做完之後「§11 真金上線前重調經濟數值」才真的能在一個地方看完**所有**旋鈕。
    - **(a) 反向鎖的偵測形制不完整（grep 機械實證）**：`platform/econ-cfg-coverage` 目前只認兩種寫法——`{ demo: <值>, live: <值> }` 表與 `isLive() ? [..] : [..]` 載入期三元式。**抓不到「純量常數藏在 `isLive()` 分支裡」**這第三種，實測至少兩例：`core/faucet.js:21` 的 `LIVE_CAP = 5`（真站救濟金終身次數上限，**§11 明列的印鈔防線**）、`core/progress.js:189-191` 的 VIP 升級金/子級金 `× 0.4`（真站一次性取得成本）。⇒ 兩者都是貨真價實的站別經濟旋鈕，卻不會出現在面板、也不受「真站不得比假站寬鬆」的推導健檢盯著。
    - **(b) `views/ops-dashboard.js` 的 `STATIC_RISKS` 手抄了 5 組數字**：返水 0.1–0.3%／返現 2–6%／VIP 金 40%／faucet 300+5 次／流水（真站 10×→6×、假站 1×→0.5×）。⚠️ **本輪逐項比對確認目前全部與程式碼相符、尚未漂移**——所以這是**防漂移**而非修錯；但它們正是 `describe()` 已經能當場求值的東西，留著就是等一次「改了表卻沒改文案」。**同 #72 的教訓**（說明的 `body` 一律函式當場求值＝讀活值不手抄）。
    - 範圍（純前端 · 一個經濟數字都不改）：① 為 `faucet` 與 VIP 升級金補 `HL.econCfg.register`（升級金屬 `progress.js`，該檔為純瀏覽器檔無 node 契約 ⇒ 描述子放該檔即可，數學不動）；② 把偵測第三種形制的規則加進 `platform/econ-cfg-coverage`，並**同步上調採用度下限**（8 → 10）；③ `STATIC_RISKS` 由字串陣列改為「函式陣列」，需要數字的地方改讀 `HL.econCfg.all()`，取不到時退回現有文字（軟依賴、不得整頁壞掉）。
    - ⚠️ **必寫成測項的不變量**：(a) 新偵測規則必須**先在現況為紅**（能抓到 faucet/VIP 升級金）、補完 register 後才轉綠——**順序反了就證明不了它有鑑別力**；(b) `STATIC_RISKS` 改為求值後，**不得再出現百分比/金額字面量**（反向 grep 鎖，樣本量下限 5）；(c) `HL.econCfg` 不存在時風險區塊仍需渲染（軟依賴）。
    - 依賴/風險：**headless 輪可完整落地**（純 node 可驗；唯一的視覺面是風險文案措辭，與 #90 同一區塊 ⇒ 建議與 #90 的目視一起做）。

> 🤖 **以下由自我進化引擎「平台軌」自動開卡**（2026-08-15 **20:00 窗** · 來源：實作 #94 時查證出「卡上的不變量鎖不到任何錨點」，追下去發現的**前置缺口**）。全自動模式下標 🟦已批准待做。

98. ✅ **遊戲數值面板 `gameInfoBar` 的 RTP／莊優只是顯示字串，全站無法列舉——擋住了大廳 RTP 軸，也擋住了任何「用數字做事」的功能** — S–M　`(2026-08-16 平台軌 08:00 窗)` — 來源：**#94 實作當輪自我檢出**（非外部平台、非台帳輪替；但 08-07 的台帳 evidence 早已寫下同一句話，見下）。
    - 問題（grep 機械實證）：各遊戲把自己的 RTP 寫在 `HL.ui.gameInfoBar({ rtp: "96.27%", edge: "3.73% 莊家優勢" })` 裡——實測 **8 處／8 檔**（bounty／chicken／instant-cases／slot-dead-by-noon／slot-gem-storm／slot-golden-toad／slot-pirots／slot.js）。它是**字串**、且**寫在 render() 內部**（只有玩家點進那款遊戲的當下才存在）⇒ **站內沒有任何一段程式碼能問出「哪些遊戲的 RTP ≥ 96.5%」**。
    - ⭐ **為何現在才開這張卡（而它其實早就被寫下過）**：08-07 建 `大廳分群軸` 台帳時 evidence 已明載「各遊戲的 RTP/莊優只以**顯示字串**存在＝不可查詢」；但 08-14 開 #94 時沒有把這句話抄進不變量，反而寫成「rtp 值必須與 `games-catalog.json` 的 `gate_log` 對得上」——**而 `gate_log` 是自由散文、且 `intel/` 不被前端服務，那條鎖沒有錨點可以鎖**。⇒ 本卡把那個真正的前置條件獨立出來。**通則已寫進 SKILL 第 3 步：開卡時要把來源模組 evidence 裡的「阻塞事實」一併抄進卡。**
    - 為何值得做（**它不只是為了 RTP 軸**）：只要 RTP/莊優變成可列舉的數值，至少四件事同時解鎖——① #94 的 RTP 軸與波動軸（一筆 config）；② 營運儀表板的「slot 無 RTP 模型」健檢警示可由**真值**取代人工判斷（§11 §4 皆已點名）；③ #72 說明中心可自動生成「本站各遊戲 RTP 一覽」而不必手抄（比照 #90/#97 的當場求值紀律）；④ #50 `HL.edge` 的成本係數可與宣告 RTP **互相對帳**（現在兩者各說各話、無人比對）。
    - 範圍（純前端 · 容器先於內容 · **一個數字都不改，只改它存在的形式**）：① `gameInfoBar` 的 `rtp`／`edge` 改為接受**數值**（`rtp: 96.27`），顯示字串由元件自己格式化（現有字串形式**必須繼續支援**＝漸進遷移，不得一次改 8 檔還要保證零視覺變更）；② 數值一律**由該遊戲自己的常數推導**（例 `EDGE`／`G` 標量），不得再手寫第二份——這是本卡的核心，否則只是把第二份真相從側表搬到 infoBar；③ 註冊一個可列舉出口（`HL.games` meta 或 `HL.gameTraits`），使「哪些遊戲 RTP ≥ X」可被程式問到。
    - ⚠️ **必寫成測項的不變量**：(a) **零視覺回歸**——8 處已遷移者渲染出的字串與遷移前逐字相同（HEAD 版 vs 新版 shim 比對，比照 #94 的 504 格手法）；(b) 未遷移的遊戲**仍可傳字串**且照常顯示（漸進遷移不得變成大爆炸）；(c) **反向鎖：數值不得與該遊戲已有的常數不一致**（例 `instant-*` 家族的 `EDGE=0.99` ⇒ rtp 必須是 99，不得出現一個「好看但對不上」的數字）——這正是 #94 不變量 (d) 真正想要、當時卻鎖不到的東西；(d) `HL.gameTraits` 於本卡落地後**才可以**收 `rtp` 欄位 ⇒ 屆時需**同步放寬** `platform/game-axes-no-second-rtp`，且放寬時必須改成「值須由 infoBar 的單一真相推導」而非直接刪掉該鎖。
    - 依賴/風險：**headless 輪可落地**（8 檔皆有 node 可讀的常數、比對靠 shim）；⚠️ 但它改的是**玩家看得到的數值列**，落地後**強烈建議排一次目視**確認 8 款遊戲的資訊列外觀無變化。
    - ✅ **落地（2026-08-16 平台軌 08:00 窗）**：新檔 `src/data/game-rtp.js`＝`HL.gameRtp` 單一真相（`of`/`gateOf`/`list`/`atLeast`/`edgeOf`/`fmt`/`rtpText`/`edgeText`），7 款登記；`core/ui.js` 的 `gameInfoBar` 同時接受**數值與字串**（漸進遷移）；7 個 view 改為向單一真相求值；`tests/checks-games.js` 的 `GAMES[].declaredRTP` 由寫死改為 `gameRtp.gateOf()`。新增 **7 條常駐鎖**（node fast **135→142 全綠**、**負向擾動 14/14 全被抓**）。
    - ⭐ **卡上的前提「只是顯示字串」講少了一半——宣告 RTP 早就有第二份機器可讀副本，只是不在前端**：`tests/checks-games.js` 的 `GAMES[].declaredRTP`（4 款）＋各 deep 測項內的裸字面量。⇒ migration 前這個數字散在**三處**（玩家看到的字串／檔頭與買入價推導的註解／測試表）。若照卡上字面「把字串改成數字」而不收斂，只會多造出**第四份**。⇒ 處置＝登記表成為唯一真相，**view 與 harness 都改讀它**。
    - ⭐ **而且那三份已經漂了（pirots）**：玩家看到 `rtp:"96.0%"`，但買入價 `buyPrice: 103.7` 的推導是 `99.68/0.96145`、deep 鎖 `pirots/base-rtp` 也是對 **0.96145** 收斂 ⇒ 同一款遊戲在 repo 內同時宣稱兩個 RTP。兩者都在真值 96.187%（08-14 250M×5 種子定案）的 ±0.5pp 內故非保真閘失敗，**但它正是第 14 項要防的形狀**：玩家以為基礎局 96.0%、買入路徑實得 99.68/103.7＝96.12% ⇒ 買入看起來比基礎「還划算」。**依 #94 定案的權威分工 `rtp` 屬遊戲軌，平台軌不代改** ⇒ 登記成 `gateRtp` 欄位並用 `platform/game-rtp-divergence-pinned` 釘死（白名單只有 pirots 一筆，**再多一筆就紅**；要關掉必須刪掉那行＝逼出一次明確裁決），另**開卡 #99** 交遊戲軌。
    - ⭐ **刻意不登記 `shadow-ritual`**：它顯示 `~97%（基礎連爆）`，但 DEBT `S-slot-rtp` 已實測 full RTP＝**1132.68%**。登記它＝**把一個已知為假的數字鑄成可查詢 API**，之後 RTP 軸會把旗艦排進 97% 那一格。⇒ 由 `platform/game-rtp-no-false-claim` 鎖住，等重平衡完成才可登記。**這是「容器落地時內容不該照單全收」的第一個實例。**
    - ⚠️ **負向擾動又抓到我自己的鎖是空的（同一條教訓第三次應驗）**：`game-rtp-derived-from-game` 首版以為 `require()` 直接回傳數學物件，實際兩檔都包一層（`{chicken:{…}}`／`{cases:{…}}`）⇒ 取值全 `undefined`、走進 `else { t.ok(true) }` 跳過分支，**測項照樣全綠**（把登記值改成 99 也不會紅）。改為**取不到就直接紅、不留跳過分支**後才真的鎖住。
    - **不變量 (a) 零視覺回歸以真的 `gameInfoBar` 證明**（DOM shim 載入 HEAD 版與本輪版兩份 `ui.js`，逐字比對 8 款的整條資訊列）：**7/8 逐字相同**；唯一差異＝pirots `RTP 96.0%` → `RTP 96%`（**值完全相同**，只少一個尾隨 0——`fmt()` 去尾隨零是為了不把 `96.5%`/`96.27%` 補成 `96.500%`/`96.270%` 而製造 6 處回歸）。`4% 莊家優勢` 等既有 i18n 鍵**全部保留**、無 P3 缺口。
    - ⚠️ **實作當輪查獲第三份副本（本輪只鎖不改）**：`i18n.js` 有 `"最高 {m}　RTP 98.5%"` 鍵＝cases RTP 的第三份。改成求值會失去 i18n 鍵，故改以 `platform/game-rtp-i18n-second-copy` 鎖住兩者一致（漂了就紅）。

99. ✅ (2026-08-16 遊戲軌·10:00 窗) **pirots 兩個 RTP 已裁決＝標稱收斂到 96.145%（只動顯示、不動經濟）** — S — 來源：**#98 實作當輪自我檢出**（`rtp` 依 #94 定案屬遊戲軌權威，平台軌只登記與釘死、不代改）。
    - **裁決（遊戲軌·RTP 權威）**：canonical = **96.145%**。理由＝四處已對齊它（買入價 103.7×＝99.68/0.96145／deep 鎖 `pirots/base-rtp` 0.96145／`edge.js` 3.855＝100−96.145／`checks-games.js` 用 gateOf 96.145 驗買入 RTP），**唯一離群值是顯示字串 96.0%**（建置期 1M MC 校準的過時目標；250M×5 種子實測真值 96.187%＝標稱 +0.042pp、±0.5pp 內、玩家實得略高於標稱）。選 96.145% 而非 96.0% 因後者需改買入價 103.7×→103.8×＝動玩家真付的錢；96.145% 只需改一個顯示值＝零經濟變更、headless 可完整驗。**副作用（正）＝除去保真閘第 14 項要防的假象**：裁後基礎(96.145%)≥買入路徑(99.68/103.7=96.123%)，買入不再看起來比基礎划算。
    - 落地：`data/game-rtp.js` pirots `rtp:96.0→96.145`（now of===gateOf、刪分歧 note 改記裁決）；`slot-pirots.js` 檔頭過時 96.00%/96.1% 註解更正；`checks-platform.js` `KNOWN_DIVERGENCE ["pirots"]→[]`（卡明訂：關掉鎖必須刪白名單＝逼出裁決）＋render-parity 的 pirots 期望值改為 96.145%/3.855%（六款仍零回歸、pirots 為唯一刻意改動者）；`checks-games.js` 過時註解更正。sw v170→v171。
    - 驗證：node fast **142/142**（render-parity 由紅轉綠＝先看到它抓到刻意改動、更新期望後綠）、deep 全綠（所有 pirots deep 測項鍵 gateOf 96.145／硬寫 0.96145＝未受影響）。⚠️ 排程輪無 dev server ⇒ 顯示字串以 `HL.gameRtp.rtpText("pirots")==="96.145%"` 求值證明、非像素目視（併入平台軌待目視清單第一項「8 款遊戲資訊列」）。
    - 事實（三處逐一查證）：① `views/slot-pirots.js` 的 `gameInfoBar` 顯示 **96.0%**；② 同檔 `CFG.buyPrice: 103.7` 的推導註解寫明 `99.68 / 0.96145`；③ `tests/checks-games.js` 的 `pirots/base-rtp` deep 鎖對 **0.96145** 收斂。08-14 的 250M×5 種子定案真值＝**96.187%**。
    - 為何值得裁（不是純潔癖）：**保真閘第 14 項要防的正是這個形狀**——玩家以為基礎局 96.0%，但買入路徑實得 `99.68/103.7 = 96.12%` ⇒ **買入看起來比基礎划算**。若改以 96.0% 為準，買入價應為 **103.8×** 而非 103.7×（＝要動玩家真的付出去的錢）；若以 96.145% 為準，只需改一個顯示值。兩者皆在 ±0.5pp 內故**非閘失敗**，但 repo 不該同時說兩個數字。
    - 範圍（S）：在 `src/data/game-rtp.js` 把 pirots 的 `rtp` 與 `gateRtp` 收斂為同一個值（並刪掉 `note` 的分歧說明），或改買入價——**擇一**。改完後 `platform/game-rtp-divergence-pinned` 的 `KNOWN_DIVERGENCE` 白名單必須同步清空（該鎖就是為了逼出這次裁決而存在）。
    - ⚠️ 附帶：`i18n.js` 的 `"最高 {m}　RTP 98.5%"` 是 cases RTP 的第三份副本（已由 `platform/game-rtp-i18n-second-copy` 鎖住一致性，非本卡範圍，但同族問題）。

> 🤖 **以下由自我進化引擎「平台軌」自動開卡**（2026-08-16 **14:00 窗** · 來源：M6/M8 首屏預算常駐閘的**趨勢外推**＋M8 自己點名卻沒人認領的最大單檔）。全自動模式下標 🟦已批准待做。

100. ✅完成（2026-08-16 · commit 見下方日誌）**i18n 按語言拆檔：全站最大單檔（160KB）在預設語言下一個字都用不到** — M — 來源：**M8 結案時自己寫下的「下一批可再省的候選」**（2026-08-07）＋**首屏預算連四輪逼近門檻**（08-15 1494KB → 08-16 08:00 1516KB → 本輪 **1532KB／86 支**，門檻 1600KB ⇒ **餘裕 68KB**，近日 +16~50KB／建置輪＝**約 2–4 個建置輪就會觸警**）。
    - 問題：`core/i18n.js` 現為 **160KB**（08-15 量測 157KB、08-11 151KB＝**仍在長**，且每張新卡照 P3 紀律補 EN/zh-Hans 就會再長）＝**全站最大單檔**，內容是「引擎 + EN 全譯 + zh-Hans 差異補丁」綁在一起。**而預設語言 zh-Hant 一份字典都不需要** ⇒ 絕大多數 session 首屏白帶約 **140KB** 從不執行的資料。
    - 為何是平台軌（而非維護軌）：這改的是**載入架構**（開機載什麼、何時載），與 #80 `HL.lazyGames` 同一層；維護軌的範圍是零回歸的表面打磨。M8 原文亦明載「屬平台軌職責、非維護軌純前端零回歸範圍」。
    - 範圍（純前端 · 容器先於內容 · **一條翻譯都不改**）：① 把 `DICT.en` / `DICT["zh-Hans"]` 各自切出 `src/i18n/en.js`／`src/i18n/zh-Hans.js`，內容**逐鍵原樣搬移**（不重譯、不合併、不刪鍵）；② `i18n.js` 只留引擎（walker/MutationObserver/`t`/`fmt`/語言切換）＋一張 `LANGS` 註冊表；③ 切換語言時才注入對應字典檔（比照 `lazy-games.js` 的 MANIFEST 形制：**新增一種語言＝多一筆 register + 一個檔**，這正是目標 3「可擴充 i18n」的正確形制）；④ 開機若已存有非預設語言偏好 ⇒ 在首次 render 前把該語言字典**同步載入**（否則會閃一下中文＝比省 KB 更糟的回歸）。
    - ⚠️ **必寫成測項的不變量**：(a) **零翻譯回歸**——拆檔前後對**每一條 key** 逐字比對兩語言的譯文（HEAD 版 vs 新版 require 後 diff，樣本＝全鍵而非抽樣）；(b) 拆出的字典檔**不得出現在 `index.html` 的首屏 `<script>`**（否則等於沒拆，反向鎖）；(c) 首屏預算閘實測應**下降 ≥100KB**（正向斷言，防「拆了但又被別處載回來」）；(d) 語言切換後 `HL.i18n.t` 對既有鍵的行為與拆檔前逐字相同。
    - ⚠️ **實作前必讀的陷阱（CLAUDE.md §4 明載）**：改 `i18n.js`／`sw.js` 後在 preview 驗證會被 **PWA Service Worker + HTTP 快取餵舊檔** ⇒ 必須先清 SW/caches 或用 cache-buster 重載，否則會驗到舊檔而誤判成功。
    - 依賴/風險：**headless 輪可完整落地**（逐鍵比對與預算量測都是 node 可驗）；⚠️ 但語言切換的**閃爍/時序**是真實瀏覽器現象 ⇒ 落地後應排一次目視（切 EN → 重載 → 確認不閃中文）。

> 更大型（運動博彩、Crazy Time、營運後台、Promo Points 積分商城、Bonus Battles、partial cash-out）見 ROADMAP 🔵LATER / 後續調研，做完上面再升級進佇列。

---

> 🤖 **以下由自我進化引擎「平台軌」自動開卡**（2026-08-22 **14:00 窗** · 來源：#112 實作當輪的機械輸出〔first-screen-deps 第 ④ 節共享依賴掃描〕+ platform-modules 模組 46「首屏載入架構」同輪回填）。全自動模式下標 🟦已批准待做。

118. 🟦已批准待做 **把三個「被 view 綁住的共享引擎」抽成 core：`HL.slotEngine`／`HL.gameFrame`／`HL.fgBoard`（解鎖 #112 剩下的 64.2KB）** — M — 來源：**#112 實作當輪的機械輸出**（`node intel/tools/first-screen-deps.js` 第 ④ 節，非人工推理）。
    - **問題**：這三個是**引擎/框，不是頁面**，卻各自住在一支 view 檔裡 ⇒ 那支 view 一旦延後載入，引擎就跟著延後，而消費它們的又正好是**另外幾支延遲檔**（`vsslot`／各延遲遊戲）⇒ 形成「兩邊都延後、誰先載入沒有保證」的死結：`views/slot.js`→`HL.slotEngine`（消費者 `vsslot.js:508` 裸守衛、`fgboard.js:20` 別名）、`views/game-frame.js`→`HL.gameFrame`（`wrap`／`resumeFrame` 被各延遲遊戲同步呼叫，實測 56 個消費點）、`views/fgboard.js`→`HL.fgBoard`（`create` 被 `vsslot.js:310` 同步呼叫並**取回傳值**⇒ stub 的非同步轉發救不了）。
    - **範圍（純搬移 + 零行為改動，容器先於內容）**：① 把三者的**引擎/框本體**移到 `src/core/`（如 `core/slot-engine.js`／`core/game-frame.js`／`core/fg-board.js`），各自仍以 `HL.<ns> =` 掛同一個命名空間、**API 一字不改**（同 #110 把注入原語抽成 `core/lazy-load.js` 的做法）；② 留在 `views/` 的只剩「這一頁的畫面」，該部分才是可延後的；③ 之後把 `slot.js` 的 view 殘餘加入 `lazyViews`，由常駐鎖 `platform/lazy-no-unsatisfiable-shared-dep` 判定是否真的解鎖（**不得為了讓鎖變綠而放寬鎖**）。
    - ⚠️ **先抄進卡的阻塞事實（讀完 #112 當輪的機械輸出才寫的）**：① `slot.js` 的引擎與 view **共用同一個 IIFE 閉包**（`HL.slotEngine` 與 `HL.views.slot` 在同一支檔裡互相取用）⇒ 拆檔要先確認引擎區沒有讀 view 區的私有變數，這是本卡真正的工作量所在（純搬 `<script>` 順序無法解決）。② 抽成 core 會讓這三支**回到首屏**（+64.2KB 帳面），淨效益來自「view 殘餘可延後」——**動手前先用 `--file` 量一次殘餘 KB，若淨省 <10KB 就該重新評估**，別為了讓工具輸出好看而搬。③ `HL.gameFrame` 有 56 個消費點且含 `resumeFrame`（子母畫面續接）⇒ 屬全站框架級，**這一支優先度最高但風險也最高，建議與 slot-engine 分兩輪**。④ **必須在有可靠 preview 的輪做**：#110/#112 兩批遷移至今都是「harness 證得出換手、證不了看起來對」，而本卡動的是遊戲外框與盤面引擎。
    - **擴充性槓桿**：做完之後「引擎」與「頁面」在檔案層級分離＝以後任何新遊戲想重用盤面引擎，不必把一整頁 view 拖進首屏；這也是 §4 記載的「規則/引擎放在延遲載入的模組 ⇒ 取不到就靜默退回」這個家族的**結構性解法**（前四個實例都是逐條補守衛）。

119. ✅完成（2026-08-23 平台軌 08:00 窗·`22f2a5e` 補譯 ＋ `bc3dabc` 掃描器與棘輪鎖） **新表面的 i18n 覆蓋棘輪閘：整個面板可以零翻譯上線，而沒有任何一條鎖會紅** — S–M — 來源：**#117 實作當輪查獲**（機械實測，非預防性猜測）。
    - **問題（可重現的實測）**：#109 報表中心 08-21 落地，`open()` 內 13 個 `t("…")` 純片語鍵在 `src/i18n/en.js`／`zh-Hans.js` **全部 0 命中**
      ——整個面板切成英文後會**原樣顯示繁中**，而 node 全綠、console 零錯誤、畫面在中文下完全正常。⇒ 這是 P3 紀律第 7 次被記錄，
      也是第一次**由後手在別的卡的實作輪偶然發現**（前 6 次都是落地者自己記得）。既有 i18n 鎖全是**逐表面特化**的
      （`support-title-i18n`／`auth-view-i18n`／`game-axes-title-i18n`…）⇒ **新表面天生不在任何鎖的射程內**。
    - **範圍（先量再定基線 · 棘輪而非一次補完）**：① 新工具掃全 `src/**`（排除 `src/i18n/`）抓出所有 `t("<純中文片語>"` 的**整節點鍵**，
      比對兩份字典 ⇒ 輸出「逐檔缺漏鍵數」；② 立一條**棘輪鎖**：缺漏總數不得高於基線（今天的實測值），
      **新檔一律 0 容忍**（新增檔案的缺漏必須為 0，否則紅）；③ 兩條反向錨：假造一個缺翻譯的新鍵必須讓鎖變紅、
      把工具的正則改壞（掃不到任何鍵）也必須紅（零樣本＝完美通過的同形陷阱）。
    - ⚠️ **先抄進卡的阻塞事實（讀 `core/i18n.js` 與 P3 既有紀錄才寫的，別讓實作輪重新發現）**：
      ① **翻譯只發生在「整個文字節點恰好等於一條 key」時** ⇒ `t("中文" + 數值)` 這種串接節點**結構上永遠翻不到**，
      工具必須把它們判為 **N/A 而不是缺漏**，否則基線會被一堆永遠修不掉的項目灌爆（#106／#72 都踩過這個界定）。
      ② `zh-Hans` 字典**刻意只收與繁體不同的字** ⇒ 簡繁同形的鍵**不算缺漏**（照抄一份反而是噪音）。
      ③ 現存缺漏數未知（本輪只量了報表中心那 13 個）⇒ **第一步是量，不是修**；基線若大到荒謬，該分批補而不是把鎖放寬。
    - **擴充性槓桿**：這條鎖一旦在位，「落地時同步補 i18n」從**六輪的人為紀律**變成**機械閘**，而且對**還沒寫的表面**也生效
      ——這是 P3 家族唯一一種不必逐表面補鎖的解法。
    - **落地（2026-08-23 平台軌 08:00 窗）**：三件套，**鎖與報告 require 同一支掃描器**（本專案已被「同一把尺抄成兩份然後 drift」咬過太多次）。
      ① `prototype/tests/i18n-key-scan.js`＝唯一的尺：狀態機逐字走過原始碼，**只認呼叫、不認提及**（字串內與註解內的 `t("…")` 一律不算，符合船長 08-16 硬規則）。
      ② 常駐鎖 `platform/i18n-key-ratchet`（逐檔上限 + 總量，基線 **0＝全站零容忍**、不在基線表的檔一律 0 ⇒ **新檔天生在射程內**）。
      ③ `intel/tools/i18n-key-gaps.js`＝逐檔缺漏排行（給實作輪挑補哪一檔）。
    - **首測結果與當輪補完**：`t()` 呼叫點 **498**／整節點鍵 **334**；真缺漏 **15 條**（EN 2 + zh-Hans 13，其中 **11 條是兌換碼面板整片 zh-Hans 零覆蓋**）⇒ 數量小到值得當輪補完，**基線直接壓到 0**。
      N/A 分類：串接 **146**、繁簡同形 **53**（兩者都是「補了也不生效／補了是噪音」，依卡上抄好的阻塞事實不計入）。
    - ⭐ **實作輪查獲三件卡上沒寫、但會讓這條鎖『修一半而看起來正常』的事**（皆已寫進掃描器檔頭）：
      ① **key 必須 trim**——`HL.i18n.t` 只是 passthrough（回傳 def），真正查表的是 DOM walker，而它查的是 `nodeValue.trim()`。
      實例：`rain.js` 的 `t("已領取 ✓ ")`（後面接一個 money 文字節點）**照字面補進字典永遠查不到**。不 trim 就會產出「補了也不生效」的假缺漏（首版實測多報 4 條）。
      ② **串接判定不能只看左右緊鄰的 `+`**——`capReached ? t("（已達封頂）") : ""` 的左右是 `?` 與 `:`，可是它最終仍被串進同一個文字節點。
      改成**逐層往外走、每層先用該層的逗號切段**後，正確判為 N/A 的從 106 條升到 146 條（否則這 40 條會被灌進基線、且永遠補不掉）。
      ③ **zh-Hans 的「需不需要補」不能用天真的逐字對齊反推**——「評估視窗內累積經驗 → 评估窗口内累积经验」等長但**換的是詞序**，天真對齊會學到 `窗→口` 這種假映射，
      於是「保障窗口」被誤判成缺漏。改成**只採一致映射**（同一個字恆指向同一目標且從未原樣不變）後，假缺漏從 27 條收斂到 13 條真缺漏。**寧可低估也不誤判**（低估＝漏抓，誤判＝逼人補一條沒必要的條目、並汙染基線）。
    - **負向擾動 7/7 CAUGHT**（每條先 assert mutated≠orig 排除 no-op 假綠）：M1 產品檔出現未翻譯整節點鍵／M2 刪必要 zh-Hans 條目／M2b 刪必要 EN 條目／M3 掃描器抽不到呼叫點（零樣本＝完美通過的同形陷阱）／M4 語言包讀不到內容／M5 串接判定失效／M6 基線表殘骸（上限高於實測＝棘輪對該檔悄悄鬆開）。
      ⚠️ **M1 首版是失敗的擾動、而它的失敗有價值**：首版用 `+ t("沒補翻譯的新片語")` 注入，鎖沒紅——因為**串接判定正確地把它判成 N/A**。改成「把既有非串接鍵改成字典裡沒有的新片語」才是真的在打棘輪。**擾動打錯目標時，紅不紅都證明不了鎖**。
    - **已知射程限制（誠實記載，並已據此開卡 #120）**：本鎖只覆蓋**經 `t()` 宣告**的那一面。沒走 `t()`、直接把中文餵進 DOM 的字面量（`text:`／`textContent=`／`placeholder:`，去註解後 **615 條**）仍無任何閘，其中 **225 條在 en.js 沒有條目**。


120. ✅完成（2026-08-23 平台軌 20:00 窗 · commit `03a9eaa`+`930604e`） **把 i18n 棘輪的射程從「宣告面」擴到「DOM 面」：沒走 `t()` 的中文一樣會上線就露繁中** — M — 來源：**#119 實作當輪量測**（機械實測，非推論）。
    - **問題**：#119 的棘輪只認 `t("中文")` 呼叫，但本站**大多數畫面文字根本沒經過 `t()`**——i18n 是 DOM 層翻譯（walker 比對整個文字節點），
      所以 `el("div", { text: "中文" })` 一樣需要字典條目、一樣會在切 EN 時露繁中，而**目前完全不在任何鎖的射程內**。
      實測（去註解、只取三種 DOM 綁定形狀 `text:`／`textContent=`／`placeholder:`）：**615 條**中文字面量，其中 **225 條（36.6%）在 `en.js` 沒有對應條目**；
      未覆蓋最多者 `views/bounty.js` 18／`views/global-prize.js` 18／`views/vsslot.js` 18／`views/slot.js` 16／`core/fair.js` 14。
    - **範圍**：① 把 DOM 綁定形狀併進 `tests/i18n-key-scan.js`（**同一支掃描器，不得另立第二把尺**），輸出獨立的 `domGaps` 欄；
      ② 以**當時實測值**為基線立第二段棘輪（新檔 0 容忍），**不要求一次補完 225 條**——分批補、基線只准往下；
      ③ 逐輪由成長軌在自己動到的檔上順手補（#119 已證明「落地時順手補」在小批量下可行）。
    - ⚠️ **先抄進卡的阻塞事實（#119 實作輪量到的，別讓實作輪重新發現）**：
      ① **`title:` 必須排除**——它同時是 HTML title 屬性與 `selftest.register` 的測項標題；混在一起分母會從 615 灌到 934（多出來的 319 條幾乎全是測項標題，本來就不該翻）。這是舊粗尺 `i18n-coverage.js` 三個已知偏差裡最大的那個。
      ② **PREFIX／SUFFIX 表也算覆蓋**——`i18n.js` 除了精確比對還有前綴/後綴表（例：`✓ 已解鎖`、`挑戰次數 `）。只比對 `DICT` 會把它們誤報成缺漏（上述 225 條裡已知含此類假陽性，落地時要先扣掉再定基線）。
      ③ **串接與 trim 兩條規則照舊適用**（#119 檔頭已寫），DOM 面同樣會遇到。
    - **擴充性槓桿**：兩段棘輪合起來，「一個面板可以零翻譯上線」這件事在**兩種寫法下都被機械擋住**，P3 紀律才算真的不依賴人記得。
    - **落地（2026-08-23 平台軌 20:00 窗）**：`scanDomBindings` 併進**同一支** `tests/i18n-key-scan.js`（不另立第二把尺），輸出獨立的 `dom.perFile`／`dom.totals`；
      新鎖 `platform/i18n-dom-ratchet`；`intel/tools/i18n-key-gaps.js` 改為兩面分段列印。
    - **首測 630 綁定點／494 鍵／缺漏 267 條（EN 141＋zh-Hans 126、30 檔）⇒ 當輪全數補完**（`en.js` +139 條、`zh-Hans.js` +125 條）
      ⇒ **基線直接訂 0，且刻意不建 `I18N_DOM_BASELINE` 表**——沒有基線表，就沒有第一段那個「基線殘骸讓棘輪悄悄鬆開」的失效模式（第一段的健檢③ 正是為了防它）。
      最深的兩處都是**玩家看得到、但沒人想到要翻**的表面：`core/fair.js` 可驗證公平面板 30 條、`views/ops-dashboard.js` 28 條。N/A 分類：串接 115、繁簡同形 92。
    - ⭐ **實作輪查獲一個卡上沒寫、而且是既有第一段也在用的量測缺陷（已修）**：`changedCharSet` 的「等長換詞」污染有一族**舊濾網結構上抓不到**。
      `重整即清空`→`刷新即清空` 教出假映射 `整→新`；`整` 既無第二個目標、也從未原樣不變 ⇒ 一致性檢查放行 ⇒ **`🔄 重新整理` 被判成需要 zh-Hans 條目，但它簡繁同形**，
      照判定補下去就是往「差異補丁」字典塞一條 key 與 value 逐字相同的條目（違反語言包契約）。**是補譯腳本的自我檢查擋下來的，不是掃描器**。
      修法＝第二道濾網「**目標字若是繁簡共用字（曾出現在 `poisoned`）則整條映射作廢**」：真正的字形簡化，其目標是簡體專用形（动/记/网/图），不可能出現在繁體側；
      換詞產生的假映射，目標必然是共用字（新/持/只/服）。一擊命中全部 4 條假映射，代價是誤殺 3 條真映射（裡>里／準>准／註>注）＝方向仍是**低估缺漏**而非逼人補多餘條目。
    - ⚠️ **一條「擾動打空」的紀錄（比 CAUGHT 更有價值）**：首版 M8「拿掉 PREFIX 覆蓋判定」**沒有讓鎖轉紅**。
      原因是本輪把兩面都補到 0 之後，`covers()` 的 PREFIX/SUFFIX 分支在真實語料上**已經沒有任何 witness** ⇒ 拆掉它缺漏數一樣是 0。
      **沒有 witness 的性質等於沒被守住** ⇒ 在鎖裡自己造 witness（`挑戰次數 5` 走 PREFIX、`3 點` 走 SUFFIX、一條不存在的片語走反向），補上後 M8/M9/M10 全部 CAUGHT。
    - **驗證**：node **264→265 全綠**；**負向擾動 10/10 CAUGHT**（刪必要 EN 條目／刪必要 zh-Hans 條目／**新表面零翻譯上線**／抽取器射程縮小／抽取器空掃／串接判定失效／
      還原 `changedCharSet` 漏洞／PREFIX 不算覆蓋／SUFFIX 不算覆蓋／`covers()` 恆真），**每例都只有本鎖轉紅**（fail=1），還原後皆回 265 綠。
      **首屏預算零影響**：語言包按語言拆檔、不在首屏（`platform/i18n-packs-not-eager` 擋著），實測仍為 **1593.7KB／90 支**。
    - **仍在射程外（誠實記載，已據此開卡 #122）**：`core/i18n.js` 的 `tAttrs` 實際翻 **title／placeholder／aria-label 三個屬性**，本段只涵蓋 `placeholder`。

> 🤖 **以下由自我進化引擎「平台軌」自動開卡**（2026-08-23 **14:00 窗** · 來源：**#61 實作當輪量測**〔機械實測，非推論〕＋ `intel/db/platform-modules.json` **後台** 分類全審〔7 模組〕）。全自動模式下標 🟦已批准待做。

121. ✅完成（2026-08-24 平台軌 20:00 窗 · commit `693649e`+`cdb40e8`；**射程＝資料宣告檔（8 支）已零容忍**，全 src 殘量 401 條交 **#126** 分批） **第三面 i18n 缺口：中文躲在「資料」裡，兩段棘輪都掃不到** — M — 來源：**#61 落地當輪量測**。
    - **問題（本輪實測）**：i18n 目前有兩個守衛面——#119 守 `t("中文")` **呼叫面**（已 0 容忍），#120 要守 `text:`／`textContent=`／`placeholder:` 的 **DOM 綁定面**（225 條待分批補）。
      但還有**第三面**：中文以**資料值**存在，兩者都掃不到。渲染端寫的是 `text: p.title`（無中文字面），中文在 `data/` 的物件裡。
      實測（字串字面含漢字、去長句）：`data/mock-data.js` **60 條**中缺 EN **45**／缺 zh-Hans **50**；`core/game-axes.js` 18 條中缺 17；`data/games.js` 5 條全缺；`data/game-traits.js` 7 條中缺 3。
      已知會上畫面的樣本：`世界活動 · WORLD EVENT`／`全服累積總獎池`／`紅或黑`／`大或小`／`單或雙`／`體感`／`分群`。⇒ 切 EN 時這些位置**原樣露繁中**。
    - **與 #120 的分工（去重紀律，勿誤判重複）**：#120 的尺量的是**程式碼裡的中文字面**（宣告在渲染那一行）；本卡量的是**資料裡的中文值**（宣告在 data/ 的物件裡，渲染那行只有變數）。
      兩者需要**不同的抽取法**（前者掃字面、後者要能認出「這個欄位會走到 DOM」），故不是同一條鎖能覆蓋的；但**必須共用同一支掃描器檔** `tests/i18n-key-scan.js`（本專案已被『同一把尺抄成兩份然後 drift』咬過）。
    - **範圍**：① 定口徑——只認**會走到 DOM 的欄位**（`title/tag/sub/name/label/t/prizeLabel/subtitle` 這類），排除註解型長句、內部鍵、色碼、路由字串（本輪的 60/45 含此類假陽性，落地時要先扣掉再定基線）；
      ② 兩條出路擇一逐筆決定：**(a) 遷入 #61 `HL.content`**（內容型，自帶 `locales`＝作者當下寫齊三語，且已有 `content/locale-coverage` 鎖）／**(b) 補進語言包**（UI 詞彙型，如 `體感`／`分群`）；
      ③ 以當時實測值立第三段棘輪（新檔 0 容忍、只准往下）。
    - **為何值得**：三面合起來，「中文上線而沒有譯文」在**三種寫法下都被機械擋住**，P3 紀律（已被記錄 8 次）才算真的不依賴人記得。
    - ⚠️ **先抄進卡的阻塞事實**：(a) `data/mock-data.js` 是**高頻共用檔**（多軌會碰）⇒ 遷移須小步逐類；(b) **首屏預算只剩 5.7KB**（1594/1600KB）⇒ 若本卡選 (a) 遷入 content.js 會再吃首屏，**必須排在 #118 之後**，或改走 (b) 補字典（字典是按語言拆檔、非首屏）。
> 🤖 **以下由自我進化引擎「平台軌」自動開卡**（2026-08-23 **20:00 窗** · 來源：**#120 實作當輪量測**〔機械實測，非推論〕＋ `intel/db/platform-modules.json` **金流** 分類全審〔5 模組〕）。全自動模式下標 🟦已批准待做。

122. ✅完成（2026-08-25 平台軌 20:00 窗）**i18n 第四面：屬性面（`title` / `aria-label`）——引擎明明會翻，棘輪卻只守其中一個** — M — 來源：**#120 落地當輪量測**。
    - **落地結果**：353 宣告點／156 去重鍵、首量缺 EN 3／缺 zh-Hans 6 **當輪補到 0**，新鎖 `platform/i18n-attr-ratchet`（node 276→**277 全綠**、負向擾動 **13/13 CAUGHT**）。sw v227→v228。首屏逐位未動（1638397/1638400）。
    - **卡上寫的三個前置，兩個要據實更正**：① 「`title` 一詞**兩**義」其實是**三**義（HTML 屬性／測項標題 131 條／玩家面資料欄位如 `notify.add({title})`、成就名、發行排程名）——前兩者卡上有，第三者沒有，而它正是「必須補譯」的那一類。
      ② 「`selftest.register` 在 `src/` 只有 2 檔會呼叫」在 #126 批次二已證明是錯的（注入式 `st.register` 有 22 支檔）；本卡改用**逐宣告** `testSpecRegions()`（`register(` 的引數物件 ∧ 直屬 `run: function`），不再倚賴任何檔名清單。
      ③ 卡上「`tAttrs` 只做精確比對 ⇒ 覆蓋判定要更嚴」**正確且已落實**（新增 `coversExact`）；但實測 `strictDelta === 0`＝真實語料上沒有 witness ⇒ 由合成探針站崗。
    - ⭐ **順帶修掉一條影響全四面的尺缺陷**：`segmentIsConcat` 過度外走，把 **34 筆**命中誤判成 NA_CONCAT，其中 **32 條是真缺漏**（`出發`／`點擊略過`／`開牌中…`／三檔大獎橫幅…）——當時三段棘輪全綠。詳見分析師日誌 08-25 20:00 窗第 ③ 點與 CLAUDE.md §4 第六例。
    - **未併入本卡（已另開）**：非中文 key 的 `t(key, 中文 fallback)` ⇒ **#129**；220 條結構性翻不到的串接節點 ⇒ **#130**。
    - **問題**：`core/i18n.js:102` 的 `tAttrs` 對 **`title`／`placeholder`／`aria-label` 三個屬性**都做翻譯（`OBS.attributeFilter` 也監聽這三個），
      但 #120 的 DOM 面棘輪只涵蓋 `placeholder`。⇒ 另外兩個屬性的中文**寫下去就上線、切 EN 原樣露繁中**，而且 `aria-label` 是**螢幕閱讀器唸出來的字**，露繁中比視覺文字更難察覺。
      實測（含漢字、去重後）：`title:` **333 命中／161 鍵／缺 EN 72**；`aria-label` **21 命中／15 鍵／缺 EN 6**
      （樣本：`遊戲設定`／`購買功能`／`自動旋轉 ×10`／`放大(劇院)`／`收合至頁籤`／`切回大畫面直播間`）。
    - ⚠️ **先抄進卡的阻塞事實（#120 實作輪量到的，別讓實作輪重新發現）**：
      ① **`title` 在本站一詞兩義**——HTML title 屬性 vs `selftest.register({ title })` 的測項標題。上述 333 命中裡**約 122 命中疑為測項標題**（粗啟發式，尚未去噪）。
      **不先做出語境判別就納入射程，分母會從 630 灌到 934、多出來的幾乎全是本來就不該翻的東西**——#120 正是為此把 `title:` 排除，本卡的第一步就是解掉這個判別，而不是放寬。
      可用的判別線索：測項標題恆與 `id:`／`group:`／`env:` 同物件出現，且 `selftest.register` 在 `src/` 只有 2 檔會呼叫（`core/selftest.js`、`core/challenge-slots.js`）。
      ② **`aria-label` 有兩種書寫形狀**（`"aria-label": "…"` 引號鍵與 `aria-label: "…"`），抽取器要同時認。
      ③ 覆蓋判定沿用 #120 已與 `tText` 同構的 `covers()`；但注意 **`tAttrs` 只做精確比對、不走 PREFIX/SUFFIX**（`i18n.js:105`）⇒ **屬性面的覆蓋判定要比文字節點面更嚴**，不可直接複用同一個 `covers()`。
    - **範圍**：① 併進**同一支** `tests/i18n-key-scan.js`（第三種抽取法，不得另立第二把尺）；② 立第三段棘輪，比照 #120 以「當輪補完 → 基線 0、不留基線表」為目標；
      ③ 若 title 去噪後殘量過大再退為逐檔基線，但要在卡上寫清楚為何退。
    - **為何值得**：四面合起來，「中文上線而沒有譯文」在**呼叫面／DOM 文字面／資料面（#121）／屬性面**四種寫法下都被機械擋住，P3 紀律（已記錄 8 次）才真的不依賴人記得。

123. ✅完成（2026-08-24 平台軌 08:00 窗） **點數商城目錄改「註冊表 + 受眾資格閘」：其他模組能擺獎品進商城，且品項可依段位解鎖** — M — 來源：**platform-modules 台帳新增模組「功能／點數商城與兌換目錄」（全庫首次入帳）＋ bet365 Loyalty Store 形制對照**。
    - **問題（兩層，兩層都「壞了也看不出來」）**：① `core/shop.js` 的 `CATALOG` 是**硬寫陣列**（5 筆）——季票／公會／成就／活動想把自己的獎品擺進商城，只能改 shop.js ⇒ 消耗端經濟是死的容器。
      ② 目錄**無任何門檻**：`VIP_DISCOUNT` 只影響「價格」，不影響「換不換得到」。bet365 Loyalty Store 的 **Cash Reward 只有 Platinum/Diamond 換得到**＝目錄逐項有等級門檻，那是段位制度的動機來源（看得到、還沒解鎖）。
    - ⚠️ **開卡時抄進來的阻塞事實**：受眾述詞**已有單一真相** `HL.release.AUDIENCES`（#107），且有常駐鎖 `platform/audience-single-vocabulary` 禁止消費端自建第二張表或自刻門檻。
      ⇒ 本卡**不得**新增 `minVip` 這類自有欄位，必須成為該詞彙的第四個消費端（前三：#54 上架排程／#49 促銷日曆／#19 兌換碼）。
    - **範圍（已落地）**：
      ① **註冊表**：`HL.shop.register(item)` + `catalog()`。`CATALOG` 起始為空，**連內建品項都走同一道驗證門**（`BUILTIN.forEach(register)`）⇒ 驗證器若拒絕真實形狀會當場暴露，不會有「內建走後門、只有外部註冊者被檢查」的雙軌。`CATALOG.push` 全檔僅一處＝單一寫入口。驗證器擋：未知 kind／`bonus` 缺 `value`／`mystery` range 不成對／`gacha` 全零權重／非法 period／`cost ≤ 0`／重複 id（回 `false` 不拋錯——一筆壞資料不該讓商城打不開）。
      ② **資格閘**：`eligible(item)` 走 `HL.release.matches(item.audience, HL.release.audienceCtx())`，fail-closed（宣告了受眾但 release 未載入 ⇒ 不放行，比照 promo-cal／redeem）。**兩個消費者共用同一支**：逛目錄的 `status()`/`open()` 與**派彩的 `redeem()`**。
      ③ **首個閘品項**「🏆 白金專屬大獎券」（cost 400 / value 4000 / weekly / `audience: {kind:'vip', arg:16}`）＝直接對標 Cash Reward。**arg 的尺是 `AUDIENCES.vip` 既有的全域微等級 Lv 1..21，不是 RANKS 索引**：白金＝`RANKS[3]` ⇒ 起點全域等級 `3×SUBS(5)+1 = 16`（此數與 `progress.js` 的 `SUBS` 綁定，改 SUBS 要跟著動；已寫進行內註解）。
      ④ **`release.js` 受眾詞彙新增 `goal` 欄位**：解「未達標該**藏**還是該**鎖著展示**」。goal＝只單向前進、可憑遊玩自行達成 ⇒ 可見但鎖著；未標 goal 者一律隱藏（`newcomer` 過了永遠回不去、`active30`/`wagered7` 是會退的滾動窗、`season` 每季歸零）。**`vip` 是目前唯一 goal**（`status().level` 由終身押注導出＝只升不降）。
    - ⭐ **本卡最值得記住的一條：它把一條「個案風格」升級成「詞彙自帶的欄位」**。#107 已有常駐鎖 `platform/audience-promo-hidden-not-greyed`（**灰掉＝預告一個玩家拿不到的獎**，故不符受眾的活動必須不出現）。
      商城要做的卻正好相反——bet365 形制是**刻意讓你看到還沒解鎖的獎**。兩者都對，差別在**受眾維度可不可達成**。
      若各消費端自己判斷 kind，這個差別就會變成兩種風格在站上並存而沒人說得清規則 ⇒ 改由 `HL.release.isGoalAudience()` 回答，`shop.js` 內**禁止出現 `kind === 'newcomer'` 這類列舉**（已立鎖）。
    - **零回歸**：既有 5 筆品項一律未宣告 `audience` ⇒ `eligible()` 首行「未宣告＝true」恆真、`audience` 標籤為空字串。**靠「欄位不存在」而非靠比對**。
    - **驗證**：`node prototype/tests/run.js` **267→268 全綠**（+1 常駐鎖 `platform/shop-registry-and-audience-gate`＝**功能鎖**，以最小宿主真的把 `core/shop.js` 載進 node 跑 register／status／redeem，不是原始碼掃描）。
      **負向擾動 7/7 CAUGHT**，且每例只有這一條鎖轉紅、還原後回到 268：P1 拔掉 `redeem()` 的閘（只剩 UI 擋）／P2 `register` 不再驗證形狀／P3 內建改直接 `push` 繞過驗證門／P4 `vip` 不再是 goal／P5 目標型也被隱藏（動機消失）／P6 非目標型也鎖著展示（違反 #107）／P7 `shop.js` 自刻述詞改讀 `HL.vip.status().level`。
    - ⚠️ **首屏預算：本卡實測撞線並已處理**。首版落地後 `platform/first-screen-budget` **直接轉紅（1601KB > 1600KB）**——這正是 [P-FS] 預告的「下一個新增首屏內容的卡，落地當下就會讓那條鎖轉紅」，只是它來自**註解位元組**而非新 script。
      處置＝把本輪自己寫的註解逐段收緊（`shop.js` −746B、`release.js` −134B），未動任何他人檔案、未放寬門檻 ⇒ 回綠。**本卡未新增任何首屏 `<script>`**（仍守平台軌自我約束）。
    - **限制（誠實聲明）**：① 排程輪禁啟 dev server ⇒ **UNVERIFIED＝視覺**（鎖態卡的樣式、`🔒 未解鎖` 按鈕外觀、解鎖條件那行的排版**未經目視**；邏輯/帳目/可見性全部 headless 驗過）。
      ② **容器已備但只有內建註冊者**——尚無任何外部模組真的呼叫 `register()`（台帳已把這點記為 partial 的第一個理由）。

124. ⬜待批准 **分潤獎池：獎金池由「本站營運結果」挹注，且金額怎麼算出來的玩家點得進去看** — M — 來源：**rollbit 深挖（RLB 質押樂透＝平台每日利潤 20% 挹注）＋ ApexWin 既有 `HL.ledger` 是全庫唯一算得出 GGR 的地方**。
    - **形制**：Rollbit 的樂透獎池由**平台每日利潤的 20%** 挹注。ApexWin 剛好是**有基礎設施接得上的狀態**：`HL.ledger.derived()`（#56）已算出 GGR/NGR/RTP/淨現金流，`HL.opsBoard` 已把它顯示出來。
      與既有 `HL.jackpot`（**按注**累積、真站 seed=0 自籌）**正交不重複**：這個是**按結果**累積。
    - ⭐ **本卡的賣點不是獎金，是可查帳（這條請勿在實作時丟掉）**：分潤獎池的吸引力完全建立在「玩家相信平台會照帳付」。Rollbit 用代幣敘事撐這件事，而它的實測信任評分是 **Casino Guru 4.2/100、Trustpilot 2.4/5**（出款/KYC 爭議）。
      我們沒有代幣也不該有；我們的等價物是**帳本本來就公開**。⇒ 出口應該是「這期獎池 N 元 ＝ 期間 GGR × r%，點進去看逐筆組成」。**若做成一個只顯示金額的漂亮數字，就是複製了形、丟掉唯一撐得住它的東西。**
    - **明確排除**：代幣、質押、任何金融產品語意（CONTROL.avoid 精神範圍）。
    - ⚠️ **待批准的兩個真問題（所以沒有直接標已批准）**：
      ① **真站經濟安全**：這是一條**新的送幣路徑**，而 §11 明載真站仍在收斂長尾送幣。分潤率 r 若沒訂在「已扣除該獎池後 NGR 仍為正」，就是在真站開一個新漏口 ⇒ 需要一條不變量（且要**雙向**：r 過大擋、r 為 0 時獎池不得顯示「即將開獎」）。
      ② **首屏成本**：新獎池若要在大廳露出，可能需要新首屏 script ⇒ **依 [P-FS] 必須排在 #118 之後**，或設計成掛進既有容器（`HL.dock`／`content.js` 描述子）而不新增檔案。**這一條請船長連同 #118 的做法一起裁決。**
    - **工作量**：M（純前端；讀既有 ledger、無後端）。

> 🤖 **以下由自我進化引擎「平台軌」自動開卡**（2026-08-24 **20:00 窗** · 來源：`intel/db/platform-modules.json` **資安**分類全審〔5 模組複核 + **新增全庫首見模組**〕＋ Stake 官方 Help Center 形制對照＋本輪 #121 實作當輪的機械量測）。

125. ⬜待批准 **帳戶安全自助中心：玩家自己看得到「是誰在用我的帳號」，並能自助關掉** — M — 來源：**platform-modules 台帳新增模組「資安／帳戶安全自助中心」（全庫首見）＋ Stake 官方 Help Center 明載帳戶設定下有獨立 Security 分頁**。
    - ⭐ **這張卡的來源本身是一則台帳盲點紀錄（第 2 例）**：資安分類原有 5 個模組——真/假站軸（工程軸）／風控反詐欺（**營運看玩家**）／KYC（法遵）／負責任博弈（**玩家管自己的錢與時間**）／權限角色（**營運端授權**）。
      **沒有一個是「玩家管自己的帳號安全」** ⇒ 這一格從來沒有欄位會問到它，所以連續多輪的資安審計都不可能判它缺口。與 08-16「玩家保護維度漏了 35 份 dossier」、08-24 08:00「商城硬寫目錄安靜存在七週」**同型**：**台帳沒有的欄位，審多少輪都審不到。**
    - **形制（外部對照）**：Stake 官方 Help Center 明載帳戶設定底下有**獨立的 Security 分頁**，以驗證器 App（Google Authenticator／Authy）啟用 2FA，並明文建議把 SMS 2FA 升級為驗證器 App；啟用後保護提款/儲值/帳號使用。⇒ **「帳戶設定底下一個 Security 分頁」是這個垂直的標準形制**，不是某一家的特色。
    - **範圍（容器先於內容）**：① **可註冊的安全項目清單** `HL.accountSec.register({ id, label, state, action, avail })`——每一項自我上架、未啟用者不渲染，比照 `HL.rg` 限額型別註冊表（新增一種安全項目＝加一筆 spec，面板與入口零改動）；
      ② 首批四項：**2FA 開關**／**登入活動**（時間·裝置·地區·結果）／**裝置與 session 清單**／**登出所有其他裝置**。Demo 下以本機資料驅動並標明是演繹；`HL.site.isLive()` 下留真實接線位（伺服器強制屬真金前項）；
      ③ 與既有兩軸**正交、不得互相冒充**：`HL.rg` 管「錢與時間」、本項管「**是誰在用這個帳號**」；`HL.rbac` 管「營運端准不准」、本項是玩家端自助。
    - **為何不落在 CONTROL.avoid**：avoid 明列的是**真金流串接／KYC／法定合規**。2FA 開關、登入活動、裝置清單、登出所有裝置屬**帳號自助**，純前端可做完整骨架，且不需牌照才有意義。
    - ⚠️ **先抄進卡的阻塞事實（本輪量到的，別讓實作輪重新發現）**：
      ① **入口必然落在 `layout/app-shell.js`（首屏檔）**——個人抽屜現有「編輯個人資料」「錢包設定」「提款帳戶」「設定限額與冷靜期」四個入口，安全分頁要進去就得改它。而 **[P-FS] 首屏餘裕實測 3 bytes（1638397／1638400）** ⇒ **本卡必須排在 #118 之後**，或設計成「掛進 #93 `HL.nav` 註冊表而完全不改 app-shell」（後者也依賴 #93 先落地）。**這是本卡標 ⬜待批准 而非 🟦已批准的唯一原因。**
      ② **量測法陷阱（本輪首次遇到「同一個中文詞兩種語意」）**：`2fa|two-factor|雙因|authenticator|登入紀錄|loginHistory|activeSession|裝置管理|deviceList` 全 src **79 命中，逐筆確認全是誤導命中**——絕大多數是可驗證公平的「🔎 **驗證器**」（`core/fair.js` 的 verifyModal 與其 i18n 譯文），與帳號安全的「**驗證器 App**」同詞不同義。
      ⇒ 「grep 命中 ≠ 功能出現」第 3 例，也是**首次由中文一詞兩義造成**（前兩例是註解與風險提醒文案）。**複查判準請直接看個人抽屜有沒有安全分頁，不要用這組樣式的命中數。**
      ③ 真站的**伺服器強制**（真的能終止 session、真的記錄登入）需後端，屬 §11；本卡只做「開發完成 + 真站留接線位」的可收納骨架。
    - **工作量**：M（純前端骨架；不含後端強制）。

126. 🏗️進行中（**批次一 ✅ 2026-08-25 平台軌 08:00 窗**；**批次二 ✅ 2026-08-25 平台軌 14:00 窗**〔射程 48→92 支檔＝+`src/core/`、33 條缺漏補到 0、並修掉錨④「只認一種測項註冊寫法」的盲區、營運受眾改為逐宣告〕；**批次三＝把 SPEC_HOSTS 剩下的 20 支檔收回射程**〔#122 已於 08-25 20:00 窗落地並**退役 4 筆殘骸**，SPEC_HOSTS 由 24→20；但 #122 只解掉 `title` 那一半——實測那 20 支檔的**非 title 欄位**仍有 **100 條缺 EN／71 條缺 zh-Hans**，其中大半是**測項夾具名**（`name:"探針"`／`label:"會爆的表"`／`name:"#58 邀請碼與歸因：…"`）與 **ops 報表欄位**（`reports.js` 的 來源/欄位/型別…）⇒ 需要的是**把 #122 的逐宣告判別套回資料面**＋一次 ops 受眾裁決，**不是單純補字典**，故仍為獨立批次〕） **i18n 資料面的另外九成：同一把尺量全 src 是 401 條缺漏，而本輪只關了 45 條** — M — 來源：**#121 實作當輪的機械量測（非推論）**。
    - ✅ **批次一（2026-08-25 平台軌 08:00 窗）**：射程 8 支 → **48 支**（`src/data/**` + **`src/views/**`** + **`src/layout/**`** + `core/game-axes.js`），**54 條缺漏（EN 31／zh-Hans 23）當輪補到 0**（`en.js` +31／`zh-Hans.js` +23）。**範圍① 的受眾口徑本輪定案，且刻意不是新發明**：直接沿用 `core/reports.js` 既有的 `aud` 軸（`player`｜`ops`）——玩家面在射程內、**營運面 `OPS_ONLY`（現為 `src/views/ops-dashboard.js`）為口徑排除**。⚠️ **口徑必須是有守衛的口徑，否則它就是一個逃生門**（「寫進清單就不用翻」本身就是誘因）⇒ 三道反向錨逐輪查證：**(a)** 清單上的檔真的存在且真的有命中嗎（沒有＝殘骸，排除它毫無作用）／**(b)** 它真的帶營運受眾標記嗎（`HL.opsBoard`／`ops_admins`／`aud:"ops"`／營運管理員／`HL.rbac`；沒有＝有人把玩家面的檔停在這裡躲翻譯）／**(c)** 排除真的生效嗎（`inDataScope()` 的實際行為，不是它的宣稱）。實測 `src/views/` + `src/layout/` 內**只有 `ops-dashboard.js` 帶得起那組標記** ⇒ 該錨有真 witness、不是裝飾。另加「**每個目錄閘各自要有 witness**」——只看檔案總數的話，拿掉 `src/views/` 後總數仍大、鎖仍綠，而 30 支 view 的中文從此無人看管。
    - ⬜ **批次二起（下一輪起）＝`src/core/**`，但兩個前置已釘死、別重新發現**：① **`title` 一進 core 就撞 `selftest.register({ title })`**（`core/selftest.js`／`core/challenge-slots.js`）⇒ **必須先過 #122**；② **`core/reports.js`（29 條）同一支檔裡同時有 player 與 ops 兩種受眾的報表定義，檔案級的 `OPS_ONLY` 切不開它** ⇒ 它需要的是**逐筆註冊看 `aud`** 的切法，這才是批次二真正的設計題。**可先做的安全子集**＝`src/core/` 中不含 `title:` 宣告且非 ops 的檔（`core/responsible.js` 22 條／`core/activity.js` 20／`core/progress-src.js` 19 等）。
    - **本輪已關掉的那一塊**：#121 落地的 `platform/i18n-data-ratchet` 射程＝`src/data/**` + `core/game-axes.js`（8 支檔），實測 60 鍵／**45 條缺漏，當輪全補到 0、零容忍**。
    - **同一組欄位量全 `src/` 的實測值（本輪一併量了，寫下來就不必再推一次）**：**444 個宣告點／378 條鍵／缺 EN 233 + 缺 zh-Hans 168 ＝ 401 條缺漏**。最深的十支：
      `data/mock-data.js` 34（已關）／`core/reports.js` 29／`core/responsible.js` 28／`core/content.js` 26／`views/arena.js` 25／`core/progress.js` 16／`core/release.js` 15／`core/demo-tools.js` 14／`core/econ-config.js` 14／`views/ops-dashboard.js` 14。
    - ⚠️ **為什麼本輪刻意沒有一次全開（這是取捨，不是漏做）**：這 401 條裡有**一大塊是營運面板與經濟旋鈕的 `label:`**（樣本：`活躍光環（#59）`／`真站返水加成開啟比例（#108）`／`測試來源`／`淨損回饋率（逐段位）`）。
      它們有兩個性質使「當輪全補」是**低品質的做法**：(a) **受眾是營運人員而非玩家**（`HL.rbac` 的 `ops` 受眾），是不是該進玩家語言包本身需要一個決定；(b) 文案裡**帶卡號**（`（#59）`／`（#108）`）⇒ 直譯會把內部卡號翻進英文介面。
      ⇒ 一次補 401 條只會產出大批**沒人讀、且把內部術語外洩到 EN 的字典條目**，違反 `quality_over_quantity`。**先要一個口徑決定，再分批補。**
    - **範圍**：① **先定受眾口徑**——以 `HL.rbac` 的受眾軸切開「玩家面」與「營運面」兩批，營運面是否納入 i18n 射程需明確裁決並寫進掃描器檔頭（是口徑不是缺漏）；
      ② 玩家面（含 `core/content.js`／`views/arena.js`／`core/responsible.js` 的 `label:`／`name:`）**分批補到 0**，每批擴一次射程並同步擴 `platform/i18n-data-ratchet` 的檔案閘；
      ③ 帶卡號的文案先**把卡號移出可見文案**（改進註解）再翻，否則翻出來就是外洩。
    - ⚠️ **先抄進卡的阻塞事實**：(a) 擴射程時**只准擴檔案閘、不准放寬缺漏上限**——本段自 #121 起零容忍且**刻意不留基線表**，加基線表＝把「新表面可以零翻譯上線」重新合法化；
      (b) `title` 欄位在擴到 `src/core/**` 之後會**立刻撞上 `selftest.register({ title })` 一詞兩義**（`core/selftest.js`／`core/challenge-slots.js`）⇒ 那正是 **#122** 要解的判別，**本卡擴到 core 之前必須先過 #122**；`platform/i18n-data-ratchet` 的反向錨④ 已經在替這個前提站崗（射程內出現 `selftest.register` 就轉紅）；
      (c) 字典是按語言拆檔、**不在首屏** ⇒ 本卡的補字典部分**首屏零成本**，不受 [P-FS] 3-byte 邊界限制（本輪 #121 實測落地後首屏逐位未動）。
    - **工作量**：M（分批；每批一輪即可，headless 完全可驗）。
127. 🟦已批准待做 **玩家可見度自控 `HL.visibility`：五個表面都會把「我」推到台前，而玩家一顆開關都沒有** — M — 來源：**Stake.us 官方 Help Center〈Controlling Visibility and Sharing〉**（2026-08-25 平台軌深挖）+ 台帳新模組「資安／玩家可見度與隱私自控」（absent·全庫首見）。
    - 🔴 **落地前置（先寫在最上面，別讓實作輪重新發現）**：本卡的註冊表必是**首屏檔**（大廳的大獎牆在首屏、`views/lobby.js` 開機即渲染），且設定入口落在 `layout/app-shell.js`（首屏）⇒ **撞 [P-FS] 3-byte 邊界**（實測 1638397／1638400 bytes）。**必須排在 #118 之後**，或改掛 #93 `HL.nav`（若 #93 先落地）。與 #125 同一個閘，兩張卡都在等 #118。
    - **問題（機械查證·非推論）**：ApexWin 會把「我」推上公開面的表面**至少五個**——大獎牆（`views/lobby.js` `bigWinsWall`）／全球獎 hero + 榜／競技場戰績與回放（`views/arena.js`）／聊天／錦標賽·抽獎榜。玩家**沒有任何一顆開關**能決定自己出不出現。
    - ⚠️ **這一格特別容易被判成「已經有了」，因為畫面在替它打廣告**：`grep -rniE "ghostmode|隱身|hideStats|隱藏統計|privacy" prototype/src` **命中 1 筆**，而那筆是 `data/mock-data.js:140` 的 `var hidden = Math.random() < 0.15; var name = hidden ? "隱身玩家" : (…)`
      ＝**發給假玩家的 15% 機率裝飾**。大獎牆上真的會滾出「隱身玩家」字樣 ⇒ 看起來這個功能存在。但真實會員路徑 `views/lobby.js:180` 的 `realRows` map 是 `name: r.name || "玩家"`，**連 `hidden` 欄位都沒有**。
      ⇒ **「grep 命中 ≠ 功能出現」第 4 例，也是最會騙人的一種**：前三例（可驗證公平的「驗證器」／`title` 一詞兩義／`role` 全是 aria）都是**同詞不同義**，這一例是**畫面在替一個玩家用不到的功能打廣告**——它不只騙過 grep，還會**騙過任何人在畫面上的目視**。
      ⇒ 歸入 CLAUDE.md §4「修一半而看不出來」的**新形狀：先做了裝飾、沒做功能**（既載四種都是「功能做了一半」，這一種是「零功能但有完整外觀」）。
    - **外部形制（Stake.us 官方，非二手評測）**：帳號→設定→Preferences 下三顆玩家自控開關——**Ghost Mode**（自己的遊戲不出現在 public feed 與 game previews）／**Hidden Statistics**（隱藏帳號整體狀態與相關數據）／**Race Statistics 隱藏**（賽事榜上的個人表現不對外）。
    - **範圍（純前端 · 容器先於內容 · 刻意做得比 Stake 更可擴充）**：
      ① **註冊表** `HL.visibility.register({ id, name, surface })`＝每個公開表面**自陳**「我會把玩家推到台前」；單一閘 `HL.visibility.shows(id)` 決定「我」出不出現。**表面加一行註冊即納管，閘的邏輯一行不改**——這是 Stake 三顆硬寫開關做不到的地方（它每多一個表面就多一顆手寫開關）。
      ② **首批註冊者＝上面那五個表面**；②-a 大獎牆與競技場戰績是**必收**的兩個（前者是真站唯一會把真名推出去的地方、後者含回放）。
      ③ **收斂兩份真相**：假玩家既有的 `hidden` 欄位與真玩家的偏好**必須走同一個閘**——現在假資料有、真資料沒有＝兩份真相，且正是上面那筆假廣告的來源。
      ④ **設定面呈現「你目前會出現在這 N 個地方」的摘要列**（由註冊表求值），而不是 N 顆散落開關；新表面上線時**摘要列自動長出一行**，不需要有人記得去加。
      ⑤ 偏好走 `HL.dom.lsSet`＝**受 `HL.site.ns()` 站別命名空間隔離**（真站與假站各自的可見度偏好不互相污染，沿既有形制）。
    - ⚠️ **必寫成測項的不變量**：
      (a) **反向錨——註冊表不得只有一個消費者**：`shows()` 若只被一處呼叫，這條鎖轉紅（防「做了容器但只接一個表面」＝§4 家族的第 2 條自問「有沒有第二個消費者」）；
      (b) **假資料的 `hidden` 必須經由 `shows()` 求值**，不得再自帶 `Math.random()` 分歧（防第二份真相復活）；
      (c) **預設值必須明寫且 fail-open 或 fail-closed 擇一並在檔頭說明**——「沒設定過」的玩家出不出現是產品決策，不能靠 `undefined` 的真假值巧合決定；
      (d) **關掉可見度不得影響結算**：`HL.liveStats.record` 一律照跑，只影響「別人看不看得到」（防把顯示層的開關做成經濟層的開關）；
      (e) 未註冊的 `id` 呼叫 `shows()` 必須**明確拒絕並可被測到**（不得靜默回 true——那會讓打錯字的表面永遠曝光）。
    - **工作量**：M（註冊表 S、五個表面接線 S、設定面 + 摘要列 M；**全部卡在 #118**）。

128. ⬜待批准 **通知的分類軸與玩家偏好：37 個生產者共用一條扁平串流，玩家一顆開關都沒有** — M — 來源：**1xBet 2026-08-25 深挖（換「玩家保護/責任博弈」+「帳號安全」兩維度重查的唯一淨新）＋ platform-modules 台帳新增模組「功能／通知中心：分類軸與玩家偏好」（partial）**。
    - 🔴 **落地前置（先寫在最上面，別讓實作輪重新發現）**：`core/notify.js` 是**首屏**檔、偏好入口又落在 `layout/app-shell.js`（首屏個人抽屜）⇒ 撞 **[P-FS] 3-byte 邊界**（實測 1638397／1638400 bytes）。**必須排在 #118 之後**，或改掛 #93 `HL.nav`（若 #93 先落地）。與 #125／#127 是**同一個閘上的第三張卡**——這也是本卡標 ⬜待批准 而非 🟦已批准的唯一原因。
    - **問題（機械實證·非推論）**：`grep -c "notify.add("` 全 `src` ＝ **37 個呼叫點**（achievements／cashback／challenges／faucet／guild／happyhour／jackpot／luckyspin／meta／onboarding／progress×5／raffle×2／rain… 幾乎每個留存模組都在推）。而 `core/notify.js:26` 的 `add(n)` 收的是 **`{ ic, title, text }`**——**沒有任何分類維度**（無 `cat`／`kind`／`aud`），`HL.notify` 表面就只有 `{ add, open, unreadCount, markAllRead, refreshBadge }`；`grep -riE "notifyPref|通知偏好|unsubscribe|退訂|mute|靜音"` 全 `src` ＝ **0**。
      ⇒ 玩家**關不掉促銷推播**、**無法只看帳務**、也無法把「紅利即將到期」（時效·會損失錢）與「聊天室灑幣」（氛圍·可有可無）分開。
    - **為何值得做（三條，且第二條是它真正的分量）**：
      ① **通知量隨留存模組數線性成長**——37 個已經是「每加一個留存模組 +1」的結果，扁平串流的訊噪比只會單向惡化；愈晚做，回頭要標註的呼叫點愈多。
      ② **在對標平台，「關掉促銷推播」是被歸進玩家保護工具的**，不是 UI 偏好。1xBet 2026 把**投注速率告警門檻**（5 分鐘 >5 注／單日 >$2,500）與**現實檢查間隔**都做成玩家可設定 ⇒ 它與 `HL.rg` 同族。而 ApexWin 的 `HL.rg` 已經很完整（存款三週期／時間上限／現實檢查／自我排除四段／調升 24h 不對稱冷卻，且**在限額面比 1xBet 更完整**）——**只有通知這一面是空的**。
      ③ **`HL.notify.add` 是中央掛鉤**（`HL.liveStats.record`／`HL.bonus.add` 家族）。中央掛鉤缺分類軸 ⇒ **所有下游都沒有選擇權**，且將來要接 email／push／站內信任何一條通道時，都得先有這個軸才知道「哪一類走哪一條」。
    - **範圍（純前端 · 容器先於內容）**：
      ① **類別註冊表** `HL.notify.registerCat({ id, label, aud, defaultOn, protectable })`＝一筆一種類別，**加一種通知＝加一筆 spec**（比照 `HL.rg` 限額型別註冊表／`HL.games`／`HL.dock`／`HL.reports` 註冊表家族）。
      ② `add()` 加**選用** `cat`：**未宣告 `cat` 者退化為現行行為＝零回歸**（沿用 #54 `stateOf()` 回 null、#107 `audience` 未宣告＝全體的既定相容契約，別另發明第三種退化語意）。
      ③ 首批類別建議 4 種：`account`（帳務/紅利到期/VIP·**`protectable:false`＝不可關**）／`reward`（返水/返現/簽到）／`promo`（活動/促銷·可關）／`ambient`（灑幣/聊天/假熱度·可關）。
      ④ 偏好面：通知中心加篩選 + 個人抽屜一個「通知偏好」入口（**受 ③ 的前置所限，入口位置待 #118／#93**）。偏好走 `HL.dom.lsSet` ⇒ **自動受 `HL.site.ns()` 站別命名空間隔離**（真站/假站各自偏好）。
      ⑤ **未讀徽章必須與篩選一致**：關掉某類後 `unreadCount()` 不得再計那一類（否則徽章永遠亮著卻點進去看不到東西）。
    - ⚠️ **必寫成測項的不變量**：
      (a) **零回歸恆等**——37 個現有呼叫點一個都不改的前提下，通知中心的渲染結果與 `unreadCount()` 與現行**逐位相同**；
      (b) **`protectable:false` 的類別不可被關掉**，且此性質要有**反向錨**（若所有類別都變成可關，或都變成不可關，鎖須轉紅——沒有 witness 的性質等於沒守住）；
      (c) **徽章與可見集合同源**：`unreadCount()` 必須由「通過偏好過濾後的集合」求值，不得各算一份（本專案反覆踩的「同一把尺兩份」）；
      (d) **未註冊的 `cat` 必須明確拒絕並可被測到**（不得靜默當成「全部顯示」——那會讓拼錯類別名的通知變成關不掉的漏網之魚，方向與 #54 `AUDIENCES` 未知 kind 保守不放行一致）；
      (e) **關掉通知不得影響結算或入帳**：`HL.liveStats.record`／`HL.ledger.record` 一律照跑，偏好只影響「要不要告訴玩家」。
    - **刻意排除（連同理由，別在實作輪順手加回來）**：① **email／push 真通道**＝需後端，屬 §11／目標 5；本卡只做分類軸與站內偏好。② **投注速率告警門檻**（1xBet 那兩個數字）＝屬風控/RG 域（#117 已落地風控），且它需要的是行為窗口統計而非通知分類，**不併進本卡**以免一張卡縫兩件事。
    - **工作量**：M（註冊表 S、37 個呼叫點標註 `cat` S–M、偏好面 + 徽章一致性 M；**全部卡在 #118**）。

129. ✅完成（2026-08-26 平台軌 08:00 窗 · commit `144c7c5`）**i18n 第五面：非中文 key 的 `t("nav.menu", "主選單")` 同時逃出全部四面棘輪** — S — 來源：**#122 實作當輪的機械量測（非推論）＋ 台帳「前端UI/UX／導覽殼層」本輪複審**。
    - **落地結果（2026-08-26）**：新鎖 `platform/i18n-fallback-ratchet`，node **278 → 279 全綠**、**負向擾動 13 例中 12 例 CAUGHT**（每例都只有本鎖轉紅、fail=1，還原皆回 279）。
      實測值：**42 個呼叫點／34 條逐檔去重鍵**（卡上寫 37 是**全庫去重**口徑，落地採**逐檔去重**與前四面一致，據實更正）、**10 個命中掛在屬性鍵上**、缺漏 **0**、`strictDelta` **0**。
      **首屏逐位未動**：1638397／1638400 bytes、91 支 script，與進場時逐位相同（只碰 `tests/`，不出貨）。**sw 不 bump**——`tests/` 不在 PRECACHE、永不送到使用者機器，bump 只會讓所有人白重抓一次全站。
    - **落地時比卡上多做的一件事（否則會有一條性質沒有 witness）**：位置分流原本寫在 `measureFallback` 內部，但真實語料 `strictDelta === 0`
      ⇒ 把 `coversExact` 改回 `covers` 是 **no-op**、缺漏數不變、所有鎖全綠＝**負向擾動會打空**（#122 ④-b 記過的同一種病）。
      改成抽出具名函式 **`fbCovers(pack, key, attr)`** 並外露，鎖直接對它下探針 ⇒ 雙向擾動（改寬鬆／改全部從嚴）都被抓到（P8／P8b）。
    - ⚠️ **一條擾動打空、據實記載（不當成通過）**：`P3 右邊界失效`（拿掉 `!ID_CHAR.test(src[after])`）**沒有讓任何鎖轉紅**。
      原因是它與後面的 `src[p] === "("` **重複**——`tabc (` 的 `p` 會落在 `a` 上、本來就進不去。真正擋住 `tt(` 的是**左**邊界 `!ID_CHAR.test(src[i-1])`，
      改打那裡即 CAUGHT（P3b）。⇒ 探針保留（它守的性質是真的、由 P3b 見證），但**斷言訊息已改寫指名左邊界**，不讓後手誤以為右邊界是唯一的擋。
      這條右邊界沿用第一面的寫法保留＝兩面同構，不是因為它是唯一的擋。
    - **口徑題（卡上留給實作輪的那一題）本輪的答案＝先不動 `src/`**：37 個點分 key 要「補進字典」還是「改寫成中文 key」，兩條路都要改 `src/`
      ⇒ 撞 [P-FS] 3-byte 邊界。棘輪立起來之後**兩條路都不會再退步**，故這題可以安全地留到 #118 之後再答。
    - 🟢 **零首屏成本**（只改 `tests/`，不出貨），**且今天缺漏為 0** ⇒ 立棘輪的成本恰好是零，是最佳時機。
    - **問題（機械實證）**：本站有 **42 個呼叫點／37 個去重 key** 寫成 `t("<英文點分 key>", "<中文 fallback>")`
      （`nav.menu`／`nav.notify`／`nav.lang`／`nav.rakeback`／`bb.hub`／`bb.tasks`／`bb.vip`／`sort.popular`／`card.demo`／`sec.fav`…），
      集中在**兩支最顯眼的檔**：`layout/app-shell.js`（導覽＋底部列＋福利中心，12 條）與 `views/casino.js`（大廳排序頁籤／卡片 CTA／分區標題／空狀態）。
      **37 個 key 在 `en.js`／`zh-Hans.js` 全數零命中** ⇒ 這些 key 本身從來不是字典鍵。
    - ⚠️ **為什麼四面棘輪一條都攔不到**（這才是本卡的重點，不是那 37 條字串）：
      ① **呼叫面（#119）**要求 `t()` 的**第一引數含 CJK** 才算命中——這裡第一引數是 `nav.menu`，純 ASCII ⇒ 結構性失明；
      ② **DOM 面（#120）／資料面（#121/#126）／屬性面（#122）**都要求值是**引號字面量**——這裡 `title: t(...)` 是**呼叫** ⇒ 三面同樣看不見。
      ⇒ 這是「同一件事的第五種寫法」，也是 P3 紀律的第 9 例。
    - ✅ **今天實際外洩 0 條，據實記載**：把 35 條去重的 fallback 中文逐條回查字典，**35/35 都在**（`主選單`／`每日任務`／`熱門`／`找不到符合的遊戲。`…）
      ⇒ 渲染出中文後由 DOM walker 事後接住，切 EN 目前不露繁中。**這正是它至今沒咬人、也沒人發現的原因**；
      但沒有任何機制擋住「下一個 `t("nav.foo", "新字串")` 的中文沒進字典」——那一刻它會像 #119 的原始事故一樣：node 全綠、console 零錯誤、畫面只在切語言時壞掉。
    - **範圍**：① 併進**同一支** `tests/i18n-key-scan.js`（第五種抽取法，**不得另立第二把尺**）——抽取形狀＝`t(<非CJK字面量>, <含CJK字面量>)`，
      **量的是 fallback（第二引數）的字典覆蓋**，不是 key；② 覆蓋判定分位置：值落在 `title:`／`"aria-label":`／`placeholder:` 上時用 `coversExact`（tAttrs 契約），
      其餘用 `covers`（tText 契約）——這條**已由 #122 建立好兩個判定函式**，直接取用；③ 基線訂 0（今天就是 0，無須補譯即可零容忍）。
    - **反向錨必備兩條**（照 #122 的教訓）：(a) 抽取器要有**合成探針**認得 `t("a.b","中")` 且**不**誤收 `t("中","中")`（那是第一面的，重疊會雙記）；
      (b) 命中數下限（實測 42／37）——射程一縮，缺漏一樣是 0、鎖一樣全綠。
    - **順帶要回答的一個口徑題**：這 37 個 key 究竟該**留著**（把 key 補進字典＝走 key-based i18n）還是**改寫成中文 key**（與全站慣例一致）？
      本卡**只做量測與棘輪、不動 src**（首屏 3-byte 邊界），口徑題留給實作輪或船長；但棘輪一旦立起來，兩條路都不會再退步。

130. ⬜待批准 **220 個文字節點是「串接出來的完整句子」，因此結構性永遠翻不到——而四面棘輪都正確地把它們記成 N/A** — L — 來源：**#122 實作當輪量測 ＋ 2026-08-25 平台軌新開維度「在地化的產品形制」外部取材**（Wizards〈Casino Game Localization Architecture〉／Yogonet〈Localization as a product strategy〉）。
    - **外部形制（本輪新維度的第一個產出）**：對標架構的核心原則是「**規則引擎輸出型別化的狀態，不輸出寫好的句子**（typed state, not completed sentences），
      由表現層依當前 locale 選字串並格式化數值」。ApexWin 目前正好相反——`text: "剩餘" + n + "次"` 這類寫法把**句子在業務層就組好**，
      而 `core/i18n.js` 的契約是「整個文字節點 trim 後等於一條字典 key 才翻」⇒ 串接出來的節點**補了字典也永遠不生效**。
    - **規模（四面掃描器的 N/A 桶就是它的權威量測，非估算）**：`NA_CONCAT` 合計 **220 條**、散在 **54 支檔**；
      最深的是 `core/promo-cal.js` 19／`core/responsible.js` 13／`core/raffle.js` 12／`views/arena.js` 11／`core/rewards.js` 10／`views/bounty.js` 10。
      ⇒ **四面棘輪全綠 ≠ 全站可翻譯**：0 條「缺漏」與 220 條「結構上翻不到」是兩回事，台帳與卡上都必須分開講。
    - ✅ **機制早就有，只是沒有系統性套用**：`HL.i18n.fmt`（U22，`core/i18n.js` 的 `renderFmt`）已支援「模板（含 `{name}` 佔位符）進字典、值運行時填」，
      並由 `data-i18n-fmt` 屬性讓切語言時整體重繪。**實際採用僅 8 個 view 呼叫點**（chicken／global-prize／instant-cases／instant-games／instant-pump／tournament×2／table）。
      ⇒ 本卡不是發明新機制，是**把 220 條遷到既有機制**。
    - **為何標 L 且待批准**：① 220 條散在 54 支檔、每條都要改 `src/`（**撞 [P-FS] 3-byte 邊界，必須排在 #118 之後**）；
      ② 每遷一條就要決定模板切法（`"剩餘 {n} 次"` vs `"剩餘"`＋`"次"`），是**逐條的語意判斷**不是機械替換；
      ③ 需要分批＋每批立棘輪（比照 #126 的批次制），否則做到一半沒有任何東西擋住回退。
    - **建議切法（供船長裁決優先序）**：先做**玩家最常看到的兩支**（`views/bounty.js` 10 條、`views/arena.js` 11 條）當第一批驗證形制，
      再依 N/A 密度排序推進；`core/promo-cal.js`（19 條，最深）建議放後面——它多半是營運面文案，受眾口徑要先照 #126 批次二的 `aud` 軸判過。

> 🤖 **以下由自我進化引擎「平台軌」自動開卡**（2026-08-26 **08:00 窗** · 來源：**B2B 平台供應商取材**〔SOFTSWISS Motion 官方發布 + GR8 Journey Builder，兩個獨立訊號〕＋ `intel/db/platform-modules.json` **後台** 分類全審〔7 模組〕）。

131. ⬜待批准 **每一條「玩家做了 A 就給 B」都硬寫在 17 支檔各自的 `if` 裡——營運規則沒有容器** — M — 來源：**SOFTSWISS Motion（2026-04 官方發布）＋ GR8 Tech Journey Builder ＋ 本輪 grep 實證**。
    - **外部形制（兩家獨立平台⇒形制而非單一供應商特色）**：SOFTSWISS **Motion** 把營運自動化定義成 **trigger–condition–action** 三段——
      trigger＝註冊／儲值／排程；condition＝儲值金額／所屬 segment／地區／裝置；action＝**發紅利／指派 tag／換 group／發通知**，已在 130+ casino 專案上線。
      GR8 Tech 的 **Journey Builder** 同型（bonus 設定與 FreeChips 機制皆掛在 journey 上）。⇒ 2026 年 campaign builder 的核心已從「一張活動設定表單」移到「**一條可註冊的規則**」。
    - **ApexWin 實況（本輪 grep 實證，非推論）**：`HL.rules`／`playerTag`／`assignTag`／`HL.tags` 全 `src/` **0 命中**。
      最接近的是 `core/rakeboost.js` 的 `registerTriggered(spec)`——但它**只服務返水加成一種 action**，是一條專用路徑不是容器。
      缺口規模：`HL.bonus.add(` 呼叫者 **17 支 core 檔**、`HL.notify.add(` 呼叫者 **23 支**，每一條「什麼時候給、給誰」都是那支檔自己寫死的 `if`。
    - ⭐ **已經就位的那一半，勿重複造（這正是本卡標 M 而非 L 的理由）**：
      condition 段本站**已有單一真相** `HL.release.AUDIENCES`（#107，且有常駐鎖 `platform/audience-single-vocabulary` 禁止第二張受眾表）；
      排程段有 `HL.promoCal`（7 個註冊者）；action 的收件端有 `HL.bonus.add`／`HL.notify.add`／`HL.ledger.record`。
      ⇒ **缺的只有把三段接起來的規則物件**。本卡**不得**新增第二套受眾述詞，也**不得**繞過 `HL.ledger` 直接改餘額（§4 記帳鐵律）。
    - **範圍**：① `HL.rules.register({ id, on, when, then })`＋`fire(event, ctx)`；`on` 取自一份**具名事件表**（不接受任意字串，否則打錯字＝規則永不觸發而畫面全對）；
      ② `when` 只接受 `AUDIENCES` 的 kind；③ `then` 只接受既有授予出口的具名 action；④ 把 17 支檔中**最單純的 2–3 條**改成規則（示範，不一次全遷）；
      ⑤ 常駐鎖：規則表非空、每筆 descriptor 齊備、`when.kind` 必在 `AUDIENCES`、`then` 必走記帳出口、**反向錨**（射程縮成空集合要紅）。
    - ⚠️ **先抄進卡的阻塞事實（台帳 evidence 已載，別讓實作輪重新發現）**：
      (a) 新規則引擎＝新 core 檔＝**新首屏 `<script>`**，而首屏餘裕實測 **3 bytes**（1638397／1638400）⇒ **必須排在 #118 之後**；
      (b) 在 #118 落地前，本卡唯一可安全推進的部分是 **`tests/` 側的形狀盤點**（把 17／23 個硬寫點逐一分類成 trigger/condition/action，產出遷移順序），那一半零首屏成本；
      (c) **`會員管理 Player/CRM Admin` 那條 absent 不是本卡**——它卡在「需伺服器權威 + 角色閘」（§11），本卡的規則本體是純前端可做的，兩者阻塞條件不同，勿併卡。
    - **為何值得**：這是把「營運行為」從**程式碼**移進**資料**的唯一出口。做完之後「加一條營運規則」＝加一筆 descriptor，
      而不是找到那 17 支檔中的正確一支、在正確的位置插一個 `if`——後者正是本專案 §4 記過的「第二份真相」最容易長出來的地方。


> 🤖 **以下由自我進化引擎「平台軌」自動開卡**（2026-08-26 **14:00 窗** · 來源：`intel/db/platform-modules.json` **金流** 分類全審〔5 模組，`last_audited` 08-23＝全 8 分類最舊〕＋ **Rainbet 到期票深挖**〔tier-1／p94／`next_due` 08-27 全庫最早〕＋ **B2B 支付編排商取材**。兩張卡皆撞 [P-FS] 3-byte 邊界故標 ⬜待批准，理由寫在卡上）。

132. ⬜待批准 **玩家沒有任何辦法「把贏到的錢收起來別玩掉」——全站三個餘額概念沒有一個是玩家可控的分倉（`HL.vault`）** — M（卡在 #118） — 來源：**Rainbet 2026 Vault（2026-08-26 平台軌深挖·兩份獨立評測交叉）＋ 台帳新增模組「金流／資金分倉／保險庫」（absent·全庫首見）**。
    - **外部形制**：Rainbet 的 Vault 明載為**帳內分倉**——"store funds safely inside your account, ready to withdraw or play anytime"，評測形容為 in-house cold wallet。
      它不是提款、不是冷靜期，是**同一個帳戶裡的第二個口袋**。
    - ⭐ **2026-08-29 平台軌 08:00 窗補充：取得獨立第二來源，且它多一條本卡原本沒有的軸**（toshi.bet 到期深挖）：
      本卡 08-26 立卡時是 **Rainbet 單一來源**。toshi.bet 的 Vault 形制為 **(a) 倉容隨 VIP 階級成長**（最高階 VIP 權益明載 `increased vault size`）、**(b) 存入的資金會生息**（earning on deposited funds）。
      ⇒ 差別是：**Rainbet 版的 Vault 是個開關**（放進去／拿出來），**toshi.bet 版的 Vault 是個可成長的容器**（倉容隨段位放大、放著會長）。
      **對本卡的設計意義（實作時採納，不另開卡）**：① 倉容上限**掛 `HL.vip` 既有段位表**＝分倉本身成為留存系統的獎勵標的，且**不新增經濟旋鈕**（複用既有段位骨架，符合「容器先於內容」）；
      ② 生息**屬送幣**，須走 `HL.ledger.record` 並**帶 `source`**（見 #144 立的常駐鎖 `platform/bonus-add-source-attribution`——新送幣路徑漏傳 source 會當場轉紅）且受站別夾（真站收斂，同 #60/#65/#74 成本中性紀律）；
      ③ 生息率必須進 `HL.econCfg`（受 `platform/econ-cfg-coverage` 與 #142 的形制鑑別力鎖管轄），不得寫成散在 view 裡的字面量。
      ⇒ **兩平台共識成立**，本卡排序權重上調；落地阻塞不變（仍在 [P-FS]／#118 閘上）。
    - **ApexWin 實況（機械查證，非推論）**：`vault|Vault|保險庫|分倉|金庫` 於 `prototype/src/**/*.js` **0 命中**；
      `儲蓄|鎖倉|存起來|savings|reserve|不可下注` 命中 2 筆、逐筆讀過**皆為無關註解**（`table.js:59` 籌碼歷程、`instant-hilo.js:28` 方向不可下注）。
      現有三個餘額概念**沒有一個是玩家可控的分倉**：`HL.state.balance`（可下注主餘額）／紅利 `locked`（受流水鎖，**平台**鎖玩家）／`unlocked`（隨時可領＝實質等同主餘額）。
    - ⭐ **為何它不是既有機制的重複（開卡前先自己打自己，防長成雙胞胎）**：
      ① 與 `HL.bonus` locked/unlocked **鎖的主體相反**——那是平台因流水條款鎖住玩家的錢，分倉是**玩家自己**鎖住自己的錢；
      ② 與 `HL.rg` 冷靜期／自我排除（#96 註冊表）**鎖的對象不同**——那些鎖**行為**（一段時間內全站不能下注，全有全無），分倉鎖**金額**（可以繼續玩，只是這一份不參與）
      ⇒ 分倉是全站唯一「**不必停止遊戲就能保護資金**」的形制，兩者互補；
      ③ 與提款不同——提款在真金模式需牌照／審核（CONTROL.avoid），分倉**完全站內**、零合規面。
    - **範圍（容器先於內容）**：① `HL.vault` 存分倉餘額並提供 `deposit/withdraw`（站內移轉，**不是**金流）；
      ② 分倉為**可註冊的餘額口袋表**（`id/label/spendable/withdrawable/order`），主餘額即 `spendable:true` 的第一格
      ⇒ 未來「賽季寶庫」「公會金庫」「儲值禮預留」都是多註冊一格、下注閘與餘額顯示一行不改；③ 空表時整個入口不渲染（沿用「空的不出現」紀律）。
    - ⚠️ **必寫成測項的不變量**：(a) **分倉餘額不可被任何下注路徑動到**（反向鎖：掃全部扣款出口，任一條讀到分倉即紅——比照 `platform/rg-bet-gate-coverage` 的行為式射程，才擋得住**下一款**遊戲）；
      (b) **移轉必記帳**：分倉進出走 `HL.ledger`（型別為站內移轉、**不得**計入營運淨現金流，比照 #56 的 `p2p_out` 前例）；
      (c) **停用時不得靜默吞錢**（旗標關閉＝既有分倉餘額一次性併回主餘額並提示）；(d) 分倉餘額**不計入** VIP/賽季進度（否則變成免費刷進度）。
    - 🔴 **落地前置（先寫在最上面，別讓實作輪重新發現）**：出口落在 `layout/app-shell.js` 錢包面板（首屏 51.5KB）＋一支新 core 檔
      ⇒ 撞 **[P-FS] 3-byte 邊界**（實測 1638397／1638400）。**必須排在 #118 之後**。**與 #125／#128／#131 是同一個閘上的第四張卡**——這也是本卡標 ⬜待批准而非 🟦已批准的唯一原因。

133. ⬜待批准 **紅利與儲值流程完全脫鉤：`doDeposit()` 全鏈碰不到 `HL.bonus`，所以「儲值禮」在架構上不可能存在** — S–M（卡在 #118） — 來源：**GR8 Tech 官方部落格〈The Biggest iGaming Payment Trends in 2026〉一手查證（WebFetch）＋ 本輪 grep 實證**。
    - **外部形制**：2026 收銀台把「**bonus selection at the deposit stage**」列為標準——"players see the set of bonuses that adjust to their currency right in the Payment Widget"
      ＝玩家在**按下儲值的那一刻**挑本次要不要／要哪一個紅利（而不是事後去活動頁找）。
    - **ApexWin 實況（機械實證）**：`doDeposit()`（`app-shell.js:146-160`）全鏈只碰 `HL.rg.checkDeposit` → `HL.api.walletTxn`／`HL.state.set` → `HL.rg.recordDeposit` → `HL.progressSrc.grantNotify`；
      **`HL.bonus` 與 `HL.promo*` 在該函式內 0 命中** ⇒ 紅利只能由活動／簽到／返水等**旁路**授予。
    - ⭐ **這是「兩個都做好了但沒有接起來」型缺口，不是引擎缺失**（故標 S–M 而非 M–L）：`HL.bonus.add(amount, {source})` 已是中央授予出口、
      `HL.release.AUDIENCES`（#107）已是唯一受眾述詞、`HL.wagerScope`（#89）已能逐筆宣告可用範圍、`HL.sla.bonusReqFor` 已能依段位定流水倍數。
      **缺的只有「儲值當下把可選紅利列出來、玩家選一個、按下去時一起授予」這條接線。**
    - **範圍**：① 儲值面板新增可選紅利區（**空清單時整區不渲染**）；② 候選來自既有促銷/紅利描述子（**不得**新增第二份紅利目錄，也不得新增第二套受眾述詞）；
      ③ 選中者於**入帳成功後**才 `HL.bonus.add(..., {source:'deposit'})`（會員模式須等 `walletTxn` 回值，比照現有 `recordDeposit` 只在真入帳後才計的紀律）；
      ④ 常駐鎖：不選＝行為與現制逐位相同（零回歸）／選了必經 `HL.bonus.add` 且帶 source（不得直接改餘額，§4 記帳鐵律）／授予失敗不得吃掉儲值。
    - ⚠️ **與 #88（簽到酬賞負載軸）的邊界**：#88 問的是「獎勵**發什麼**可宣告」（現在寫死成錢），本卡問的是「**什麼時候讓玩家選**」——
      同一個 `HL.bonus` 收件端、但一個改酬賞型別、一個加觸發時機，出口形狀不同 ⇒ 非雙胞胎，惟若 #88 先落地本卡可直接復用其酬賞述詞。
    - 🔴 **落地前置**：出口在 `app-shell.js`（首屏）⇒ 同撞 [P-FS] 3-byte 邊界，**排在 #118 之後**。同一個閘上的第五張卡。

> 🤖 **以下由自我進化引擎「平台軌」自動開卡**（2026-08-26 **20:00 窗** · 來源：`intel/db/platform-modules.json` **功能** 分類全審〔16 模組，該分類 `last_audited` 為全庫最舊〕＋ **本庫首次向「遊戲化引擎供應商」取材**〔Smartico／Gamanza Engage 的模組欄位級清單〕＋ 本輪新工具 `intel/tools/registry-gaps.js` 的機械讀數）。

134. ⬜待批准 **蒐集是徽章做不到的第二種留存曲線，而 `achievements.js` 的判定只有純量門檻 ⇒ 「集滿 N 件才成套」無處可表達（`HL.collection` 容器）** — M（卡在 #118） — 來源：**Smartico gamification 模組清單（2026-08-26 平台軌 WebFetch 一手）＋ Gamanza Engage ＋ 台帳新增模組「功能／收集套組與圖鑑」（absent·全庫首見）**。
    - **外部形制**：主題式**蒐集**是供應商清單上與 badges 並列、但**分開描述**的一格——"themed collections across sessions (gem sets, card collections, map pieces)"、"Achievement/Collection Systems — themed item gathering (7 of 10 pieces)、completion-drive mechanics"。
    - ⭐ **為什麼它不是徽章的皮膚（這是本卡唯一需要說服的點）**：徽章＝「跨過一個門檻就發」的**單點事件**；蒐集＝「多個離散物件的**集合狀態** + 成套判定」。
      兩者的留存曲線不同——**「差 3 片」這個狀態本身就是回站動機，而徽章沒有這個狀態**（門檻式進度只有一個百分比，沒有「缺哪幾片」）。
    - **ApexWin 實況（可機械證明的 absent，非「大概沒有」）**：`core/achievements.js` 的判定只有兩種形狀——`stat >= goal` 與 `test(stats)`，
      兩者都對**純量**終身統計（bets／wagered／wins／bestWin／bestMult／variety／streak／vipRank）求值 ⇒ **沒有集合型狀態、沒有 piece 掉落來源、沒有成套判定**；
      spec 欄位（`{id,cat,icon,title,desc,tier,stat,goal,test,pts,reward}`）裡沒有任何欄位能承載「一組件」。
      全 `src/` grep `收集/碎片/集滿/套組/collection/fragment/shard` 的命中**全部**落在 slot 內部玩法（`slot-pirots.js` 網格收集／`slot-golden-toad.js`／`instant-cases.js` 開箱）＝**單局內**的詞彙，與跨局的玩家蒐集進度無關。
    - **範圍（容器先於內容）**：① `HL.collection.register({ id, title, pieces[], reward, dropFrom })` 自我上架（比照 `HL.achievements.register`／`HL.games.register`）；
      ② piece 掉落**掛既有中央點** `HL.liveStats.record`（比照 `achievements.record`）⇒ 一條線通吃全 25 款遊戲，**不改任何遊戲檔**；
      ③ 成套兌現走 `HL.bonus.add(..., {source:"collection"})`（§4 記帳鐵律，不得直接改餘額）；
      ④ 圖鑑展示面**沿用 P4 已確立的分工**：`HL.dock` 掛「差幾片」摘要（邊玩邊看）、完整圖鑑走 modal（進去專心看一次）——不新造第三種容器。
    - **站別感知**：掉落率與成套獎額須進 `HL.econCfg`（真站不得比假站寬鬆的健檢自動涵蓋），比照 #97/#58 的既定做法。
    - **常駐鎖預定**：未註冊任何套組時**逐位零回歸**（不渲染、不掛掛鉤、不動餘額）／同一 piece 不得重複計入／集滿才兌現且只兌一次（冪等）／`register` 對壞 spec fail-closed（本輪新鎖 `platform/registry-extension-fail-closed` 會自動接管這一條）。
    - 🔴 **落地前置**：新首屏 core 模組 ⇒ 撞 [P-FS] 3-byte 邊界，**排在 #118 之後**。同一個閘上的第八張平台卡。

135. ✅完成（`98e2c66`，2026-08-29 平台軌 20:00 窗） **`HL.guild.register` 是全庫唯一「兩個環境都無法證明」的擴充點——公會目錄註冊得進去嗎？沒有任何測項答得出來** — S（**前置條件失效、零首屏位元組落地**） — 來源：**本輪新工具 `intel/tools/registry-gaps.js` 的機械讀數 ＋ 新鎖 `platform/registry-extension-fail-closed` 的唯一基線例外**。
    - **機械事實**：全庫 14 個「有外部呼叫點」的 `HL.<ns>.register` 擴充點中，13 個至少有一條可證明的路（外部註冊者 ≥1，或 node 可 require 到 CORE 的 `register` + 列舉器）。
      **只有 `HL.guild` 兩條都沒有**：`core/guild.js:295` 頂層取用 `window` ⇒ node 不可 require；外部註冊者 **0**（公會目錄全是檔內種子）。
    - **為什麼這值得一張卡而不是註記**：這正是 repo 內已**五次**記錄的那個形狀——**容器做好了、接線沒補完**
      （P4 的 `HL.dock` 外部註冊者為零／07-31 台帳的 `promoCal` 外部註冊者為零／#66 的 `HL.reveal`／`app-state.lossLimitRemaining` 零讀取者／#67 前身「已對外宣告但點進去是空的」）。
      ⚠️ 但**本輪沒有發現 guild 真的壞掉**——據實說：它是**無法證明**，不是**已證明是錯的**。這張卡買的是「以後壞掉會被抓到」。
    - **範圍（S）**：比照 #50 `edge`／#54 `release`／#65 `progressSrc` 的既定雙環境契約——把 `guild.js` 的純資料/純函式區（公會目錄、週榜結算、貢獻累計）上移並以 `module.exports` 暴露 `register` + 一個列舉器（`ids()`／`list()`），DOM 區保留在 `window` guard 之後。
      落地後 `UNPROVEN_BASELINE` 清空 ⇒ 新鎖的基線防腐斷言會**要求**把 `guild` 從基線移除（不許養過時的免罪名單）。
    - ✅ **落地（2026-08-29 20:00 窗）· 原本的「落地前置」是錯的，而錯的方向是「成本被高估」**：卡上原寫「`core/guild.js` 在首屏 ⇒ 加 `module.exports` 一行也是位元組，撞 [P-FS] 3-byte 邊界，**排在 #118 之後**」——那個成本模型在**同一天 14:00 窗**就失效了。#145 為了驗「同 id 再註冊」在 `checks-platform.js` 建了 **vm 沙箱**，而沙箱裡的 `window` 是我們自己造的物件 ⇒ 「`guild.js:295` 頂層取用 window」不再是障礙，**`module.exports` 那一行根本不需要**。本輪把該沙箱一般化進 `tests/registry-probe.js`（`boot(files)`／`sandbox()` 唯讀快取／`freshSandbox()` 給會寫入的測項；首屏 script 清單的單一真相＝`index.html` 本身，不抄第二份），**實測首屏核心 76 支全載入、0 失敗、一次 ~80ms**。⇒ **本卡落地的首屏成本＝0 bytes**（產出全在 `prototype/tests/` 與 `intel/`，收尾實測 1638373／1638400＝餘裕 **27 bytes**，與進場逐位相同）。**新增第三個「證明得到」的環境**：`registry-probe` 的分類由 `externallyExercised`／`nodeVerifiable` 兩格擴為三格（+`sandboxVerifiable`），`UNPROVEN_BASELINE` 由 `["guild"]` **清空為 `[]`** ⇒ 既有鎖的零成長棘輪**變嚴**（不是放寬）。**常駐鎖 `platform/guild-registry-provable`**：(a) 規模自保＝種子須恰為 6 公會（08-18 brace-matching 權威值，機械複驗成立）(b) 外部註冊一筆 → `ids()`／`status().count`／`totalGuilds` 三個出口同步 6→7 (c) **消費端錨＝走玩家路徑**：`join()` → `status().guild.name` 解析到新註冊那一筆（只斷言 `ids()` 變長擋不住「`ids()` 是一份裝飾性平行清單」）＋結構錨釘住 `guildBrowser()` 逐一走的就是同一個 `GUILDS` (d) 反向錨①壞 spec 5 種全拒 (e) 反向錨②**釘住「先到先得」語意**（見 #147）(f) 棘輪錨＝guild 不得再被加回免罪名單。另在既有鎖補**沙箱自保**三條（ready／0 失敗／射程 ≥70 支）——否則沙箱靜默壞掉時 `sandboxVerifiable` 會整排變 false，錯誤訊息會指向「新的無法證明擴充點」而**把人帶錯方向**。**驗證**：node **301→302 全綠**；**負向擾動 7/7 CAUGHT**（P1 移除 `|| byId[spec.id]` 先到先得守衛／P2 register 不再要求 `spec.id`／P3 `ids()` 改回硬寫的平行清單／P4 `guildBrowser` 改抄快照不走 GUILDS／P5 把 guild 塞回免罪名單／P6 首屏有一支在沙箱裡會拋／P7 `join()` 不再解析 byId），擾動後 `guild.js`／`edge.js` 皆 `git diff` 零殘留。`sw.js` **不 bump**（`grep -c "tests/" prototype/sw.js` ＝ 0＝不出貨）。⭐ **本卡真正的產物是一條紀律**：**卡片與台帳上的「阻塞事實」跟 evidence 一樣會過期，而且會往「成本被高估」的方向過期**（08-24 記過反方向：零首屏成本 ≠ 不加 script）。⇒ **新工具落地時要回頭問「它讓哪些卡的前置條件失效了」**。本卡被四輪誤判為受阻，代價是四輪。

136. ⬜待批准 **活動只在大廳側——`HL.promoCal` 的 7 個註冊者，沒有任何一個能出現在玩家真正花時間的那個畫面上** — M（卡在 #118） — 來源：**台帳「活動」分類本輪新增的全庫首見模組「遊戲內活動掛件 In-game Promotion Surface」（absent）＋本庫首次向「網路型促銷」取材（Pragmatic Play Drops & Wins 條款／Wazdan Network Promotions 2026-08／ESA Gaming prize-drop 說明）**。
    - **對手形制的定義性性質不是獎池，是露出位置**：Drops & Wins 這類促銷之所以會轉換，是因為玩家**在參加活動的那款遊戲畫面裡**就即時看到自己的中獎、別人的中獎、剩餘獎項份數與雙結束條件（到時間 or 獎發完，以先到者為準），**不必離開遊戲**。
    - **機械事實（可複跑）**：① `views/game-frame.js`（遊戲外框公版）對 `promo|tournament|jackpot|challenge|season|活動|任務|賽事` 命中 **0**；② 全 `views/*.js` 中引用 `HL.promoCal` 者只有 `lobby.js`／`casino.js`／`tournament.js`＝**零遊戲 view**；③ `layout/app-shell.js:709 mountView` 在遊戲頁只補 `gameBackBar(backTo)` ＋遊戲節點，**沒有任何活動槽**。
    - ⚠️ **據實界定，不誇大成「零」**：遊戲畫面內確實有兩格活動訊號——底部列 `app-shell.js:616`（每日簽到）與 `:617`（限時錦標賽）。但它們是**硬寫的兩個固定入口**，既非註冊表、也不承載任何一則促銷的即時狀態（剩餘份數／倒數／我的進度）。⇒ 缺的不是「有沒有東西」，是「**新活動上架後有沒有辦法自動出現在遊戲裡**」——目前答案是沒有。
    - **範圍（M · 容器先於內容 · 加法式零回歸）**：① 既有 `promoCal` spec 加一個**選用**出口 `inGame()`，回傳 `{ text, progress?, endsIn?, tone? }`，沿用本檔已確立的「即時求值、不快取、模組未載入即跳過」契約；**未宣告 `inGame` 的 spec 逐位不變**（同 #107 `audience`／#52 `optIn` 的相容做法）。② 遊戲外框提供**單一掛載槽**，渲染當下才向 `promoCal` 求值。③ 掛件**可收合／可關閉**（不想被打擾的玩家收起來，偏好走 `HL.dom.lsSet` ⇒ 自動吃 §4 站別命名空間）。④ 首批只接 1–2 個既有註冊者驗形狀，不一次全上。
    - 🚧 **明確的反重複界線（開卡前已掃同來源模組，寫進卡以免實作輪重新發現）**：
      (a) **不得長出第二份份額算術**——「有限份數 + 剩餘可見 + 雙結束條件」在本庫**已經有了**：`core/challenge-slots.js`（`HL.chalSlots`，#57 的純數學層、node 可 require）的 `state()` 回 `{unlimited,total,taken,remaining,mine,closed,open,takenBy[]}`，且 `closed = remaining<=0 || expired` 就是雙結束條件，並帶「不可超賣／開窗必定全空／名額不可撤銷」三條紀律。本卡只做**露出面**，份額一律向它求。
      (b) **不是 #93 的雙胞胎，但不得越界**——#93 `HL.nav` 管的是**導覽入口**（去哪裡），本卡管的是**活動狀態的遊戲內即時顯示**（現在怎麼樣）。底部列那兩格硬寫入口的收斂**仍歸 #93**，本卡不得建立第二份導覽登記簿。
      (c) **與 #134（收集套組）互不重疊**——#134 是新的**玩法狀態**（集合＋成套判定），本卡是既有活動的**顯示通道**；但若兩者都落地，#134 的「差 3 片」正是本卡掛件最好的第一個內容。
    - 🔴 **落地前置（先寫在最上面，別讓實作輪重新發現）**：出口必落在 `views/game-frame.js`（首屏 `shared-dep-blocked` 檔）或 `layout/app-shell.js`（首屏）⇒ 撞 **[P-FS] 餘裕 63 bytes**（2026-08-27 實測 1638337／1638400 bytes、90 支 script）。**必須排在 #118 之後**。這是本卡標 ⬜待批准 而非 🟦已批准的唯一原因。同一個閘上的第十張平台卡。

137. ⬜待批准 **玩家可以鎖住自己的帳號，但鎖不住自己的錢往外走——出金目的地是一行硬寫字串，沒有白名單、沒有新增後冷卻** — M（卡在 #118） — 來源：**台帳「資安」分類本輪新增的全庫首見模組「出金安全鎖 Withdrawal Security Locks」（absent ★）＋本輪向加密資產平台的出金安全形制取材**。
    - **這一格為什麼從來沒被問到（台帳盲點第 4 例，且漏法是新的）**：資安 7 個模組分別問工程／營運看玩家／法遵／玩家管自己的**錢與時間**／營運端授權／玩家保護**帳號**／玩家控制**自己的曝光**；金流 6 個模組問收銀台／錢包帳本／提款審核（**營運側**）／P2P／紅利流水／分倉。**「玩家自控的出金安全」正好落在兩個分類的交界，各自都以為對方會問。**
    - ⚠️ **它極可能一直被 `CONTROL.avoid` 的外溢蓋住**（08-26 14:00 窗對 Vault 記過同一機制，這是第二例）：avoid 明列的是「真金流串接／KYC」，而本卡管的是「**這筆錢可以送去哪裡**」，不是「錢怎麼流」——**零 PSP、零合規面、完全站內**。
    - **形制（外部對照）**：加密資產平台的通行四件套，crypto casino 直接沿用——① **提款目的地白名單**（開啟後只能提到清單內的目的地，帳號被接管也送不出去）；② **新增目的地後 24 小時鎖**（把「攻擊者加自己的地址」變成有時間差、可被察覺的動作）；③ **反釣魚碼**（平台通知帶玩家自設暗語，用來辨識假站信）；④ **信任裝置管理**。
    - **機械事實（可複跑）**：`白名單|whitelist|allowlist|提款鎖|withdrawLock|反釣魚|antiPhishing` 全 `prototype/src` 對本語意 **0 命中**——既有命中全是 `wager-scope.js` 的逐款流水白名單／`shop.js` 週期白名單／`game-rtp.js` 分歧白名單，**同詞不同義**（＝『grep 命中 ≠ 功能出現』第 5 例，也是**第二次由同一個中文詞的兩種語意造成**，前一次是「驗證器」）。提款目的地本身在 `layout/app-shell.js:280` 是**一行硬寫顯示字串** `"🏦 台北富邦 ****8731"` ⇒ 無地址簿、無新增流程、無鎖。
    - **範圍（M · 容器先於內容 · 加法式零回歸）**：① 出金目的地成為**可註冊清單**（現有那行硬寫字串成為清單的第一筆，畫面逐位不變）；② 每筆帶 `addedAt`，清單本身帶 `armed`（白名單開關）；③ 提款送出前的閘：`armed` 時目的地必須在清單內、且 `now - addedAt >= 冷卻`；④ 面板顯示「這筆目的地還要等多久才能用」。首批只做 demo 資料驅動並標明是演繹，`HL.site.isLive()` 下留伺服器強制的接線位（伺服器權威屬 §11 真金前項）。
    - 🚧 **明確的反重複界線（開卡前已對本庫既有純函式層做反向搜尋——08-27 08:00 窗新訂的取材紀律）**：
      (a) ⭐ **不得自刻第二份「延遲生效」算術**——「**安全性放寬要等、收緊立即**」這條語意本庫**已經有單一真相**：`core/responsible.js:220` 的 `planChange()`（`RAISE_DELAY_MS`；調降/新設立即生效，調升/移除排程後生效），以及 `planPause()`（暫停狀態的唯一寫入口、單調不可縮短）。本卡的冷卻期**一律向它求**，否則會出現「限額的延遲」與「出金鎖的延遲」兩套語意各自漂移——這正是 §4「參數化 RTP 的不變量只擋一個方向」那一族的形狀。
      (b) **不是 #125 的雙胞胎**——#125（帳戶安全自助中心）管的是「**是誰在用我的帳號**」（2FA／登入活動／裝置與 session／登出所有裝置），本卡管的是「**錢可以被送去哪裡**」。兩張卡若都落地，同一個安全分頁下是兩個區塊；本卡不得建立第二份安全入口。
      (c) **不是 #64／提款審核佇列的雙胞胎**——那是**營運側**的人工審核，本卡是**玩家側**的自我約束，兩者方向相反（一個是別人擋你，一個是你先擋住自己）。
    - 🔴 **落地前置（先寫在最上面，別讓實作輪重新發現）**：入口必然落在 `layout/app-shell.js` 個人抽屜（**首屏檔**，該檔第 280 行就是現況那行硬寫字串）⇒ 撞 **[P-FS] 餘裕 63 bytes**（2026-08-27 實測 1638337／1638400 bytes、90 支 script）。**必須排在 #118 之後**，或改掛 #93 `HL.nav`（若 #93 先落地）。這是本卡標 ⬜待批准而非 🟦已批准的唯一原因。**同一個閘上的第十一張平台卡。**
138. ⬜待批准 **玩家在這台裝置上被存了 42 個 key，一個都看不到、一個都清不掉，而其中 40 個沒有上界** — M（卡在 #118） — 來源：**台帳「資料」分類本輪新增的全庫首見模組「本機存檔台帳與保留策略 Local Data Inventory & Retention」（absent）**＋ 08-27 14:00 窗 `platform/site-ns-storage-allowlist` 立起後才第一次成立的「存檔出口唯一」前提。
    - **這一格為什麼從來沒被問到（台帳盲點第 5 例·成因與 14:00 窗「出金安全鎖」同型）**：「資料」分類原有 3 個模組（報表與匯出／資料分析／注單），**三者問的都是「平台看得到玩家的什麼」**；而「玩家自己的資料」落在**資料與資安的交界**——資安 8 個模組（08-27 審過）沒有一個問「玩家這台裝置上存了什麼」，資料 3 個模組沒有一個問「玩家能不能拿回/清掉」⇒ **兩邊都以為對方會問**。
    - ⚠️ **它極可能一直被 `CONTROL.avoid` 的外溢蓋住（第三例）**：avoid 明列「法定合規」，而「資料可攜／被遺忘權」聽起來就是 GDPR ⇒ 被整格略過。**本卡刻意不做任何合規承諾、不宣稱 GDPR**，只做兩件純前端、零牌照的事：① 玩家看得到、清得掉自己這台裝置上的東西；② 每個 key 有上界。
    - **機械事實（可複跑）**：`grep -rn "var KEY[A-Z_]* = \"" prototype/src --include=*.js | wc -l` ＝ **42**（散在 25+ 個 core 檔各自宣告）；`grep -rn "HL.storage|清除資料|清除所有|resetAll|wipeLocal|localStorage.clear" prototype/src` ＝ **0 命中** ⇒ 沒有清冊、沒有清除路徑（連整站重置都沒有）、沒有逐 key 保留策略。目前**只有 2 個模組各自在自己的檔裡做上界**（`betlog` 的 `CAP=500` 環形緩衝、`activity` 的 90 天日桶），其餘 **40 個 key 無限成長且無人知道**。
    - **為什麼是現在才問得出來（而不是這輪才長出的缺口）**：直到 08-27 14:00 窗 `platform/site-ns-storage-allowlist` 立起，「所有玩家存檔都經 `HL.dom.lsGet/lsSet` 唯一出口（白名單 10 支例外）」才**從一句敘述變成有鎖的事實**。在那之前任何「存檔清冊」都不可能宣稱完整——隨時有人繞道直接碰 `localStorage`。⇒ **本卡是前一輪那把鎖的直接紅利。**
    - **範圍（M · 容器先於內容 · 加法式零回歸）**：① `HL.storage.register({ key, owner, purpose, audience: 'player'|'pref', retention, cap })` ＝存檔描述子註冊表（沿 #109 `HL.reports`／#90 `econCfg` 形制）；② 一個「我的本機資料」面板：逐筆列出 key／用途／大小／保留策略，可**逐項清除**與**整站重置**（重置需二次確認）；③ 每筆可宣告 `cap`（筆數或天數），由既有出口在寫入時套用——`betlog` 的 `CAP=500` 與 `activity` 的 90 天日桶**成為清單的前兩筆、行為逐位不變**；④ 站別感知：面板須標明哪些 key 是**跨站共用的 UI 偏好**（語言／側欄／收藏／最近遊玩／dock 佈局），清除它們會同時影響真站與假站。
    - 🚧 **明確的反重複界線（開卡前已對既有層做反向搜尋）**：
      (a) **不是 #109 `HL.reports` 的雙胞胎**——#109 是「**把資料匯出給人看**」（報表定義＋CSV，受眾閘 `aud`），本卡是「**這些資料本身在哪、多大、留多久、怎麼刪**」。出口形狀不同（報表列 vs 存檔清冊）、動作不同（讀/匯出 vs 刪除/設上界）。真要說關係：本卡的清冊**可以**註冊成 #109 的一張報表，那是消費端、不是本體。
      (b) **不是 #127 `HL.visibility` 的雙胞胎**——#127 管「**別的玩家看得到我的什麼**」（大獎牆／全球獎榜／戰績回放／聊天的露出開關），本卡管「**我這台瀏覽器上存了我的什麼**」。一個對外、一個對內。
      (c) ⭐ **不得自刻第二份「站別命名空間」判斷**——`HL.site.ns()` 是唯一真相且已由 `platform/site-ns-storage-allowlist` 上鎖；本卡列 key 時**必須向 `HL.dom`／`HL.site` 求值**，不得自行拼 `"r:"` 前綴（自刻＝白名單雙向等式當場轉紅，這是刻意的摩擦）。
    - 🔴 **落地前置（先寫在最上面，別讓實作輪重新發現）**：
      ① **首屏成本是本卡的主要風險**。若照直覺讓 25+ 個 core 檔各自 `register()`，等於改 25 支**首屏** eager 檔 ⇒ 必撞 **[P-FS] 63 bytes 餘裕**（實測 1638337／1638400）。**建議形狀**：改由 `HL.dom.lsSet` 這個**已被鎖住的唯一出口**被動記錄實際寫過的 key，描述子表（用途／受眾／保留策略）放在**延遲載入**的面板檔，兩者以**雙向等式**對帳（被動看到的 key 集合 === 描述子表；多一個＝未登記的存檔、少一個＝描述子過期）。⇒ 首屏增量壓在 `dom.js` 的數十位元組、其餘零。
      ② 面板入口若掛 `layout/app-shell.js` 個人抽屜，該檔是**首屏**檔 ⇒ 與 #125／#127／#128／#137 同一個閘。**必須排在 #118 之後**，或改掛 #93 `HL.nav`（若 #93 先落地）。
      ③ **刪除是不可逆動作**：整站重置必須二次確認，且**不得**碰 `sb-*`（Supabase session）與 `HL_SITE_MODE`（站別旗標，原生 key 不帶前綴）——清掉前者＝把玩家登出、清掉後者＝把玩家從真站彈回假站。
139. ⬜待批准 **全站流量最高的那個畫面，是唯一沒有登記簿的表面——大廳的區塊清單、順序與「給誰看」全部硬寫在 view 裡** — S–M（卡在 #118） — 來源：**台帳「擴充性」分類本輪新增的全庫首見模組「大廳版位登記簿 × 分眾大廳 Lobby Slot Registry & Segment Lobbies」（absent）**＋本輪配對取材（2026 平台側材料：widget 型大廳版位庫／**依分眾建多個大廳實例**／以 tag 控前台顯示；玩家側材料：多組自訂收藏清單 Personalise Hub）。
    - **機械事實（可複跑）**：`views/casino.js:154–166` 逐行 `appendChild(section(...))` 出「最近遊玩／我的最愛／熱門遊戲／最新遊戲／同仁開發遊戲／各分類」——**區塊有哪些、什麼順序、標題文案、對誰出現，四件事全部寫死在 view 內**，沒有任何資料出口可以增刪或重排；`core/fav.js` 的收藏是**單一扁平 id 陣列**（`has/toggle/list/count`，1.8KB），沒有「多組清單」的形狀。
    - **為什麼這是擴充性缺口而不是 UI 缺口**：本庫其餘大表面**全都已經有登記簿**——`HL.content`(#61)／`HL.reports`(#109)／`HL.dock`(#40)／`HL.promoCal`(#49)／`HL.achievements`／`HL.shop`(#123)／`HL.games`。**唯獨大廳沒有** ⇒ 任何新東西想在大廳露出，今天只能改 `views/casino.js` 本體。這與 #136 記過的痛是同一個：`HL.promoCal` 有 7 個註冊者，卻沒有一個能出現在玩家真正花時間的畫面上——**容器做好了、露出面沒有**（本專案第六次記錄同一形狀）。
    - **這一格為什麼從來沒被問到（台帳盲點第 5 例·成因是「分類交界」的變體）**：`[前端UI/UX] 大廳/遊戲牆` 這個欄位問的是「**遊戲牆好不好用**」（判 present，且判得沒錯）；`[擴充性] Dockable Layout` 問的是「**側浮窗容器**」（判 partial，也沒錯）。**「大廳自身的組成是不是資料驅動」不屬於任何一個欄位** ⇒ 歷次審計結構上不可能問到（同 08-16 玩家保護／08-24 帳戶安全／08-25 Feature Flags／08-26 營運自動化／08-27 出金安全鎖：台帳沒有的欄位，審多少輪都審不到）。
    - **範圍（S–M · 容器先於內容 · 加法式零回歸）**：① `HL.lobbySlots.register({ id, title, order, audience, source|render, collapsible })` ＝版位描述子登記簿；② `views/casino.js` 現有 6 種區塊**逐一改成註冊者**（順序以 `order` 復刻今天的字面順序 ⇒ 畫面逐位不變＝零回歸的驗收標準）；③ 「分眾大廳」＝同一份登記簿以不同受眾解出不同組合（**不複製 view、不建第二個大廳檔**）；④ 玩家側可收合/隱藏個別版位（跨站持久，比照 `HL.dock` 的 `ax:dock:v1` 原生 key 慣例）。
    - 🚧 **明確的反重複界線（開卡前已對既有層做反向搜尋）**：
      (a) ⭐ **不得自刻第二份受眾述詞**——「給誰看」一律向 `HL.release.matches` / `AUDIENCES` 求（全站唯一詞彙）。⚠️ **落地當下本卡會讓 `platform/audience-consumer-roster-closed` 轉紅（第五個受眾消費端），那是設計好的**：紅燈逼你把它顯式納冊，並當場受「必須委派／不得自建 AUDIENCES／不得自刻玩家維度」三條紀律管轄。
      (b) **不是 #103 大廳分群軸的雙胞胎**——#103 管「**一個區塊裡的遊戲怎麼排/怎麼篩**」（節奏／波動／RTP），本卡管「**這個畫面有哪些區塊**」，兩者是內容與容器的關係，落地後 #103 成為某一個版位的 `source`。
      (c) **不是 #40 `HL.dock` 的雙胞胎**——dock 管「側浮窗」（360px、邊玩邊看），本卡管「主內容區的版位流」（全幅、進去專心看），P4 已明文界定過這兩種容器的分工。
      (d) **不是 #93 `HL.nav` 的雙胞胎**——#93 管「**怎麼去到別的頁**」（導覽入口註冊表），本卡管「**這一頁裡有什麼**」。
    - 🔴 **落地前置（先寫在最上面，別讓實作輪重新發現）**：
      ① **`HL.lobbySlots` 必是首屏 core 檔**（大廳＝首屏，`views/casino.js` 已在 `first-screen-bound` 名單上）⇒ **現階段卡在 [P-FS] 的 63 bytes 餘裕**（實測 1638337／1638400 bytes）。**必須排在 #118 之後**。
      ② **零回歸的驗收要靠序**：改完後大廳區塊的**字面順序與標題必須逐位不變**，否則玩家看到的是「首頁被重排了」。建議落地時同步立一條「版位順序基線」測項（今天的 6 種區塊 id + order 為基線），否則這種漂移在 headless 下沒有讀數。
      ③ **空版位不得留下空標題**：`source` 回空陣列時整個版位不渲染（今天 `views/casino.js:154/160/164` 的 `if (rec.length)` 就是這個語意，改成登記簿後要在容器層一次做對，別讓每個註冊者各自記得）。
140. ✅完成（2026-08-28 平台軌 14:00 窗 · commit `72c3ad2`）**「引擎到底翻哪幾個屬性」被硬寫了五次，而五面 i18n 棘輪沒有一條問過這件事** — S — 來源：**platform-modules 台帳「前端UI/UX ▸ 多語系前端 i18n」(partial) ＋ 08-25 在「遊戲客戶端框架」查獲的屬性露繁中事故的上游**
    - **機械事實（可複跑）**：`core/i18n.js` 把「翻哪幾個屬性」硬寫**三次**——`:83 OBS.attributeFilter`（屬性被**改**時的通知面）／`:102 tAttrs` 的 forEach 清單（**真正動手翻**的那一份）／`:151 walk()` 的 `querySelectorAll`（**子孫元素**走訪面；root 自己走 `:147`）；尺這邊又各自宣告一次——`ATTR_QUOTED_KEYS`+`ATTR_BARE_KEY`(#122)／`FB_ATTR_KEYS`(#129)／`DOM_SHAPES` 的 `placeholder`(#120) ⇒ **五份副本、零機械關聯**。
    - **失效模式（三種，症狀全都是「畫面看起來完全正常」）**：漏改 `:151` ⇒ **只有 root 被翻、子孫原樣繁中**（最難目視發現）；漏改 `:83` ⇒ 首次渲染翻得到、之後程式改該屬性就再也不翻；**漏改尺 ⇒ 那個屬性的中文永遠不進零容忍棘輪的分母**，五面全部繼續寫著「缺漏 0」＝覆蓋率單向下降且**無讀數** ⇒ CLAUDE.md §4「修一半而看不出來」的**名冊變體第三例**（前兩例 08-27 `central-hook-fanout-roster`、08-28 `audience-consumer-roster-closed`）。
    - **同輪修掉一條真的「修一半」**：#122 的核心論證是**契約差異**（`tText` 有 精確→PREFIX→SUFFIX 三段，`tAttrs`（`:104`）只精確比對 ⇒ 只被 PREFIX 表覆蓋的屬性值，寬鬆 `covers()` 說「已覆蓋」而執行期翻不到），它據此把 `title`／`aria-label` 改用 `coversExact`，**但 `placeholder` 是同一個 `tAttrs` 翻的、卻仍留在 DOM 面被寬鬆的 `covers()` 判**（`measureDom` 舊碼對所有形狀一律 `covers`）＝同一條契約差異、三個屬性修了兩個。
    - **落地（純 `prototype/tests/`·首屏逐位未動·零行為變更）**：① `i18n-key-scan.js` 新增 `engineAttrs()` ——**尺從引擎讀**那份清單（含解析全檔屬性選擇器的聯集、以 `data-` 前綴排除 `renderFmt` 的 `[data-i18n-fmt]`），不再自己抄第四份；② `attrShapeSet()`＝`DOM_SHAPES` 的 prop ∩ 引擎屬性集（今天＝`placeholder`）；③ **分流決策點 `domCovers(pack,key,shape)` 外露**（形制與理由同 #129 的 `fbCovers`：分流若只藏在 `measureDom` 內部，今天 `strictDelta===0` 下「改回一律 covers」是**完全的 no-op**、負向擾動會打空）；④ `measureDom` 補 `strictDelta` 自我揭露欄位。
    - **常駐鎖 `platform/i18n-attr-surface-closed`**：引擎三份副本互等 ＋ **雙向等式**（三面尺的屬性射程聯集 ≡ 引擎屬性集；正向漏＝新屬性沒人要求條目、反向漏＝尺要求引擎不翻的屬性＝死鍵，#121 付過這種代價）＋ 契約分流的合成 witness ＋ **尺自身反向錨 3 條**（解析非空／`attrShapeSet` 非空／PREFIX 覆蓋鍵在 `covers`/`coversExact` 上必須真的分歧）。
    - **驗證**：`node prototype/tests/run.js` **293→294 全綠**；五面缺漏逐面實測 0（呼叫 500/364・DOM 632/515・資料 222/176・屬性 353/156・第五面 42/34）；`strictDelta` 落地當輪 **0**（9 條 placeholder 命中全是精確覆蓋）＝**零回歸**。**負向擾動 8/8 CAUGHT、其中 7 例僅本鎖轉紅**；P3（引擎三處都加 `alt`）另觸發 `platform/first-screen-budget`＝**[P-FS] 的第二個實證**（往首屏檔插 `, "alt"` 三處就吃掉全部 10 bytes 餘裕）。
    - **誠實聲明**：本鎖**今天沒有抓到任何現存缺陷**（三份引擎副本一致、射程聯集恰等於引擎屬性集）。它買的是「以後長第四個屬性時會被抓到」＋「placeholder 的契約分流不會被改回去」。
141. ⬜待批准 **平台在執行期完全不知道任何語言包翻了幾成——`LANGS` 只有 code/name/flag/src，加一種語言就是靜默把半譯 UI 上線** — S–M（卡在 #118） — 來源：**platform-modules 台帳新模組「語言包完備度登記簿（執行期）× 語言選單狀態」(absent) ＋ 2026 本地化實務取材**
    - **機械事實（可複跑）**：① `core/i18n.js:32` 的 `LANGS` 三筆欄位只有 `code`／`name`／`flag`／`src`，**無 status／coverage／fallback**；② 全 `prototype/src` 對 `coverage|完備度|翻譯進度|translationStatus|i18nStatus` 語意**僅 1 命中且是字典值**（`src/i18n/en.js:832`）＝機制零存在；③ 語言選單 `:198` 逐筆渲染 `LANGS`，只有旗標＋語言名；④ 五面棘輪**全部住在 `prototype/tests/`**（不在 `sw.js` PRECACHE、不出貨）⇒ **執行期零讀數**。
    - **為什麼這是擴充性缺口而不是 i18n 缺口**：#100 已兌現「加一種語言＝`LANGS` 加一筆＋一支檔，引擎一行不改」——**容器做到了，但那筆宣告沒有地方說明自己的完備度與回退策略**。而本庫的 zh-Hans 是**刻意只收「與繁體不同者」**＝「部分覆蓋」在這裡本來就是常態設計，更需要一個可宣告的語意，而不是靠讀原始碼推斷。對手形制把「passively supported 語言以英文回退」視為**須被追蹤的暫時狀態**、並要求 workflow 自動 flag 未翻內容。
    - **範圍（S–M · 容器先於內容 · 加法式零回歸）**：① `LANGS` 每筆可**選**帶 `status: full|partial|passive` 與 `fallback`（未帶＝沿用今天行為，畫面逐位不變）；② `HL.i18n.status(code)` 執行期可查；③ 語言選單對 partial/passive 顯示**一枚低調記號**（不是警告橫幅——目標是誠實不是嚇人）；④ 完備度數字由 build/測試寫入**快照**供執行期讀。
    - 🚧 **明確的反重複界線（開卡前已對既有層做反向搜尋）**：
      (a) **不是 #100 的雙胞胎**——#100 做的是「加語言的容器」，本卡做的是「那筆宣告的**狀態欄位**」。
      (b) ⭐ **執行期一律不得掃檔、不得自刻第二把覆蓋判定尺**——`covers`／`coversExact` 的唯一真相在 `tests/i18n-key-scan.js`，本卡只消費它們的產出。在 `src/` 重寫一份會同時吃掉首屏並違反 #140 `platform/i18n-attr-surface-closed` 的雙向等式精神（那條鎖剛把「屬性面射程」綁回引擎地面真相）。
      (c) **不是 `intel/tools/i18n-coverage.js` 的雙胞胎**——那是**粗尺**（測試訊息灌大分母、串接低估），#126 已正式收斂其定位為「只能排序哪一檔最需要補、不能當閘」。
    - 🔴 **落地前置（先寫在最上面，別讓實作輪重新發現）**：`core/i18n.js` 與 `layout/app-shell.js` **皆首屏** ⇒ 卡在 [P-FS]（本窗實測餘裕 **10 bytes**，且 #140 的 P3 擾動已實證「往首屏檔插三處小字串就爆」）⇒ **必須排在 #118 之後**；**或改走推薦出口＝語言包自帶 meta**（`src/i18n/<code>.js` 內宣告 status，引擎只讀**已載入的那包**）＝語言包按需載入、**首屏零新增**，這條可在 #118 之前做。
142. ✅完成（2026-08-28 平台軌 20:00 窗 · commit `28c2fc5`）**「經濟旋鈕住在 core」這條慣例沒有任何機械保證，而想補上它的那一行修法會當場誤報——因為陣列型三元式規則從來沒拿到它純量型兄弟早就有的鑑別力** — S — 來源：**platform-modules 台帳「後台」分類本輪輪替複審（8 模組）＋ 對 `platform/econ-cfg-coverage` 的射程盤問**
    - **機械事實（可複跑）**：`platform/econ-cfg-coverage` 的**三條斷言全部只掃 `src/core`**（`found/missing` 覆蓋、`registrants >= 11` 採用度、「經濟表不得用載入期三元式宣告值」禁令）。⇒ 只要一個站別分歧的經濟旋鈕落在 `src/core` 之外，它會**同時**逃過「必須註冊自我描述」與「不得用三元式」兩條紀律，儀表板 `HL.econCfg.all()` 從此看不到它，`audit()` 的「真站不得比假站寬鬆」也管不到它——**而全套測試是綠的**。#110／#118 正在把檔案在 core／views／延遲層之間搬動，這不是假想風險。
    - ⭐ **真正的阻塞點不是射程，是鑑別力（本卡的核心發現）**：把掃描目錄從 `core` 改成 `src` 看起來是一行修法，實測**當場誤報**。`TERNARY_FORM`（`isLive() ? [`）**對「經濟旋鈕陣列」與「假資料閘」完全不能分辨**——今天 `src` 內唯一命中它的 core 外檔案是 [`views/global-prize.js:132`](prototype/src/views/global-prize.js:132) `(HL.site && HL.site.isLive()) ? [] : HL.mock.makeContributors()`，那是 §4 的**假資料閘**（真站不顯示假貢獻榜），不是旋鈕。誤報的處置會是「幫一個假資料閘註冊一張經濟表」＝**把錯的東西寫進台帳**。
    - ⭐ **這是 CLAUDE.md §4「修一半而看不出來」家族的又一例，且形制最乾淨**：純量型（#97）**早就學過這一課**——鎖裡明文要求「**兩臂都必須是數字字面量**」，理由白紙黑字寫著 `raffle.js` 的 `botTickets: isLive() ? 0 : rint(…)` 是氛圍量、規則過寬「**會逼出假的 register**」，還附了一條專測鑑別力的斷言。**同一條禁令裡、同一行程式碼上的陣列型兄弟，從頭到尾沒拿到這個待遇。** 它之所以看起來完全正常，是因為在 `src/core` 的射程內陣列型**目前命中 0 個檔** ⇒ **鑑別力不足這件事在原射程內永遠不會顯形**。（自問清單命中「這條不變量有沒有反向？」與「有沒有第二個消費者？」）
    - **落地（純 `prototype/tests/`·零行為變更·首屏逐位未動）**：常駐鎖 **`platform/econ-cfg-knob-form-discrimination`**（`tests/checks-platform.js`，緊接 `econ-cfg-coverage` 之後）：
      (a) **把缺口本身釘成斷言**——naive 陣列規則對真旋鈕與假資料閘一視同仁；哪天有人真的收緊了它，這條轉紅提醒兩處同步。
      (b) **鑑別規則**：比照純量型的「兩臂都是值」紀律，改判「**至少一臂是數字字面量陣列**」。正例取自 commit `a388822` 的 `cashback.js` `CB_RATES = isLive() ? [0.02,…] : [0.05,…]`；反例取自 `global-prize.js` 現行兩處假資料閘。**四個形狀全部取自 repo 真實內容**，不是為了過測而編（同 08-15「擾動要用真實世界會出現的形狀」）。
      (c) **順帶補回 naive 看不見的反序寫法** `? HL.mock.rates() : [0.1, 0.2]`（naive 要求 `?` 後緊跟 `[`）⇒ 新規則不只是「naive + 過濾」，射程實際更大。
      (d) **射程閉合**：掃**全 `src`**，站別分歧的經濟旋鈕不得出現在 `src/core` 之外；處置二選一（搬進 core，或就地 `register` 並擴充 coverage 掃描目錄）。
      (e) **自我保護**：`files.length >= 60` 與 `tableHits >= 9` 兩條下限，防 walker 走錯目錄或表形規則被改窄而**假綠**（同 #72／#90 兩次「鎖是空的」教訓）。
    - **驗證**：`node prototype/tests/run.js` **295→296 全綠**；**負向擾動 7/7 CAUGHT 且每次僅本鎖轉紅**（P1 收窄使抓不到真旋鈕／P2 放寬成 naive 使假資料閘被誤判／P3 拿掉反序分支／**P4 在 `views/global-prize.js` 種一個真旋鈕＝射程閉合的正題**／P5 walker 走錯目錄／P6 收窄表形規則／P7 讓 naive 變得有鑑別力）；擾動後 `checks-platform.js` 與 `global-prize.js` 兩支檔 `Buffer.equals` 驗**逐位還原**。
    - **誠實聲明（兩件）**：① 本鎖**今天沒有抓到任何現存缺陷**——`src/core` 外的知名命中是假資料閘、不是旋鈕，(d) 落地當輪 strays **= 0**。它買的是「以後有人把經濟旋鈕寫進 view／data／延遲層時會被抓到」，形制同 #140 的合成探針站崗。② 本卡**沒有動 `econ-cfg-coverage` 一個字**——擴充它的掃描目錄是 (d) 的後續，屬**行為面**改動且需連帶處置 `global-prize.js` 的誤報，刻意留給下一輪或併入 #118 後的整理；本卡只交付「擴之前必須先有的那把尺」＋一條會在真的出事時轉紅的鎖。

143. ⬜待批准 **Dead By Noon 招牌「乘數彈膛」名不副實：籌碼落盤不定值、每次 cascade 全部重抽數字，與檔頭/資訊列宣告的「隨下落累積、串接成乘數」直接矛盾** — M（需 preview + RTP 重校準，故不自動落地） — 來源：**2026-08-20 手感巡檢單款專屬（CONFIRMED·M），2026-08-28 遊戲軌複驗坐實**。
    - **機械事實（可複跑）**：`slot-dead-by-noon.js:101-106` 的 `chamberMult(g, rng, digitsOut)` 收集盤上所有 CHIP 格，對**每一顆**當場 `drawDigit(rng)` 抽一個新數字；而它在 `runSpin` 迴圈裡**每次 cascade 都被呼叫一次**（`:126`）。⇒ 一顆撐過 cascade（`cascadeDown` 下落一列）而仍在盤上的籌碼，下一次 cascade 會拿到**完全不同的隨機數字**，同一顆籌碼沿路 1→3→1 亂跳；且**落盤當下不揭曉**（數字非籌碼的狀態，只是每輪 ephemeral）。
    - **與檔頭契約矛盾**：`:4-7` 明白宣告「Poker Chip 🎯 **落盤即化 Wild 並「開膛」露出 1–9 數字** → 盤上各彈膛由左到右串接成乘數 → 只要有中獎就持續 cascade、**彈膛隨下落累積** → 罕見暴走」。實作違反「落盤即定值」與「累積」兩條。（`:214` 的 #17 stale-HUD 修**是對的**——它修的是「上一拍 ×12 殘留」的顯示 bug；但它把設計意圖固化成「每次連爆各自計算而非累積」，恰與招牌機制的文字承諾相反。）
    - **忠實修法（需下一個 preview 輪）**：籌碼數字在**被抽上盤的當下**決定（`newGrid`／`cascadeDown` 補新符號時，若是 CHIP 就 `drawDigit` 一次並存進一張與 grid 平行的 digit-map），`cascadeDown` 搬列時**連同 digit 一起搬**，`chamberMult` 只**讀**已存的 digit（不再重抽）。⇒ 落盤即定值、撐過 cascade 保留、串接隨累積長大＝符合檔頭與真實 Hacksaw DBN。
    - 🔴 **為什麼不自動落地（三個真前置）**：① **改動玩家可見的派彩數學**——digit 由「每 cascade 重抽」變「定值持有」會改變乘數分布 ⇒ 必須重跑保真閘 RTP 蒙地卡羅（≥1M）並**重新校準 `CFG.G`** 使宣告 96.27% 收斂、且**重驗 `buyX=43.4` 的買入 RTP≈96%**（保真閘第 14 項）。② **是招牌機制的玩法方向變更**（reverses #17 的既定設計），依 CLAUDE.md「改變已確認玩法方向先問船長」不宜自動輪單方拍板。③ 招牌動畫的視覺回歸（籌碼定值揭曉、串接數字沿路長大）**需 preview 目視**，非 headless 可完全驗。
    - **範圍（M）**：`slot-dead-by-noon.js` 純數學區改 digit 持有制 + node 保真閘重校 G/驗 buyX + preview 目視招牌動畫。**是遊戲軌 heavy-build，排在有可靠 preview 的建置輪。**

144. ✅完成（`8e1bf2f`，2026-08-29） **送幣成本歸屬：`HL.bonus.add` 漏傳 `source` 會把該筆成本靜默併進「其他紅利」桶——19 個發放點裡連登里程碑大禮是唯一漏的那個** — S — 來源：**平台軌 08-29 08:00 窗台帳輪替「金流」（錢包/帳本 × 獎金/流水引擎 兩模組交界）+ toshi.bet 到期深挖**。
    - **架構前提（先講清楚，免得被讀成「沒記帳」）**：紅利側的記帳是**單一漏斗**——17 個發放模組全部呼叫 `HL.bonus.add()`，由 `progress.js` 的 `badd()` 統一 `HL.ledger.record("bonus", n, { source: ... })`。⇒ **「有沒有記到帳」架構上不會漏，總額永遠對。**
    - **但漏斗只保證總額、不保證歸屬**：`badd()` 記的是 `(opts && opts.source) || "其他紅利"`，`ledger.js:161` 用 `meta.source || "其他紅利"` 分桶，`views/ops-dashboard.js:257-261` 的「🎁 送幣成本明細（by 來源）」逐桶列金額與佔比，真站還經 `ledger.js:177` 的 `api.opsLog` 上雲。⇒ **呼叫端漏傳 source，錢照樣進總額，只是被併進雜項桶。**
    - **機械事實（可複跑）**：`HL.bonus.add(` 全 src **19 個呼叫點／17 支檔**，**18 個帶 `{ source }`、1 個沒有**＝`core/rewards.js:433` 的連登里程碑大禮 `HL.bonus.add(st.milestone)`。⚠️ 同一個 `claim()` 函式**往上兩行**才剛為日獎寫過 `{ source: "每日簽到" }` ⇒ **慣例是真的、這裡是 drift，不是設計**。
    - **為什麼屬 §4「修一半而看不出來」家族**：玩家拿到的錢正確、餘額正確、`🏅 連登里程碑` 通知正確、帳本**總額**正確、儀表板照樣渲染出一個看起來合理的「其他紅利」數字 ⇒ **畫面上沒有任何一處會變**。只有當有人問「連登里程碑到底花了我們多少」時才發現答不出來，而且會拿到一個**看起來像答案的錯答案**（把雜項桶讀成雜項）。里程碑額度為 8/15/22/30 天的 3,000／8,000／15,000／**50,000** ⇒ 被併掉的不是零頭。
    - **落地**：`rewards.js` 補 `{ source: "連登里程碑" }`；+1 常駐鎖 **`platform/bonus-add-source-attribution`**（純 `tests/`）＝(a) 規模自我保護（≥18 點／≥15 檔，防掃錯目錄假綠）(b) 每個呼叫點的 source 必須是**非空字串字面量**（三元式則兩臂都要）(c) **鑑別力自檢 8 例**（缺 source／空字串／undefined／變數／正常字面量／非首位／三元式兩臂合法／三元式一臂非法）(d) 反向錨＝`ledger.js` 的 `|| "其他紅利"` 後備**必須留著**（拿掉它漏傳會以 `undefined` 當桶名＝比現況更糟）(e) 消費端錨＝ops-dashboard 消費 `bySource`、ledger 鏡射 `opsLog`（沒有消費端＝歸屬是裝飾品）(f) 釘死本格＝簽到的兩條送幣路徑不得共用同一個桶。
    - ⭐ **鑑別力是本卡的重點（承 #142 的教訓）**：只檢查「有沒有 `source:` 這個字」**毫無鑑別力**——`{ source: "" }`／`{ source: undefined }`／`{ source: v }` 都會過。故判準要求「非空字串字面量」，並用 8 個反例**在鎖裡自證**分得出好壞。
    - **[P-FS] 處置（本卡是首屏正數卡，但收尾是淨負）**：`core/rewards.js` 是首屏 eager（`index.html:70`），補 source 淨增 **+31B**，而進場餘裕只有 **10B** ⇒ 直接落地會讓 `platform/first-screen-budget` 轉紅、**三軌同時被擋**。處置＝**只回收本卡所在的 `status()`／`claim()`／`open()` 頭三個函式裡的「註解欄位對齊空白」共 9 行**（純 cosmetic，**一個字都沒刪**）⇒ 收尾首屏 **1638364／1638400＝餘裕 36 bytes**（進場 10 ⇒ **淨 −26B**）。⚠️ 這與 08-26 明文拒絕的「砍註解換餘裕」**不同**：那條拒絕的是刪掉「為什麼」的文字，本卡刪的是欄位對齊的空白，**why 一字未動**；而該寫的 why 寫進了**不出貨的 `tests/` 鎖檔頭**（零首屏成本）。
    - 🔗 **順帶回應 08-28 12:00 窗的「找淨負首屏機會償還 −53B」指派**：維護軌 08-29 00:00 窗已定論「**CSS 層無可回收位元組**」（死變數 0／死 class 0）。本輪補上另一半：**JS 層的註解欄位對齊空白是可回收的**——光 `rewards.js` 一支就有 219B，本卡只動了其中 86B。⇒ 「淨負機會不存在」只對 CSS 成立，對 JS 不成立。

145. ✅完成（`38b9b78`，2026-08-29 平台軌 14:00 窗） **登錄表的「同 id 再註冊」是整筆取代，於是 #80 延遲載入把 seed 的開發者暱稱靜默洗掉——25 款可玩遊戲裡有 5 款的作者從此不存在，而大廳的「🎨 我們的開發者」名單看起來完全正常** — S — 來源：**平台軌 08-29 14:00 窗台帳輪替「功能」上半（遊戲引擎與聚合 × 可驗證公平 × 中央掛鉤 × VIP × 點數商城 …）＋ #144「漏斗只保證總額、不保證歸屬」形制的反向搜尋**
    - **架構前提**：`data/games.js` 的 `HL.games` 是全庫**外部註冊者最多**的擴充點（`intel/tools/registry-gaps.js` 實測 **26 個外部檔案**、24 個呼叫點／21 支 `src` 檔）。CLAUDE.md 目標 2 明文要求「可**依同仁暱稱分類**」，出口就是 `byAuthor()`／`authors()`。
    - **機械事實（可複跑；本輪以 vm 沙箱按真實載入序實跑 `core/dom.js → data/mock-data.js → data/games.js → lazyGames.boot()`）**：
      ① `games.js` 的 seed 依 `AUTHOR` 表把 Apex 原創掛上暱稱 ⇒ 此時 `authors()` ＝ **Mina 3／Jack 2／Leo 2**。
      ② `data/lazy-games.js` 的 MANIFEST 用**同一批 id**（dice／limbo／plinko／crash-x／mines）再註冊一次 stub（#80 換手的第一步），而 MANIFEST 的 meta **沒有 author 欄位**。
      ③ 舊 `register()` 是**整筆取代**（`var g = norm(meta)`），`norm()` 的 `m.author || null` 於是把暱稱填成 `null` ⇒ boot 後 `authors()` ＝ **Jack 1／Mina 1／Leo 整個消失**。
    - **為什麼藏得住（§4「修一半而看不出來」家族·第七種形狀）**：登錄表是單一漏斗 ⇒ 遊戲照樣註冊、卡片照樣渲染、`authors()` 照樣回一份**看起來合理的**名單。壞掉的只有「歸屬」，而**歸屬沒有總量可以對帳**。倖存的 shadow-ritual／chicken-cross 恰好不在 MANIFEST 上，於是名單永遠不是空的——**這正是它能活著的原因**。⇒ 與 08-29 08:00 窗 #144 逐字同構（`HL.bonus.add` 漏傳 `source`，錢照樣進總額、只是被併進雜項桶）：**漏斗保證了總額，於是沒有人再問歸屬**。這一輪是它在**登錄表**上的鏡像。
    - **三個活的受害消費端**（都不會報錯、只會少講）：`views/casino.js:106` 的「🎨 我們的開發者（依暱稱）」分群、`:52` 的 `author:<暱稱>` 篩選、`:41` 的搜尋比對 author；以及 `core/ui.js:218` 遊戲卡的「provider · 🎨暱稱」。
    - **落地**：`register()` 改為「**只覆蓋本次宣告的欄位**」——`norm(m)` 先算出這次的值，凡本次 raw meta **沒有宣告的 key**（`!(k in m)`）沿用前一筆。⭐ 判準用 `k in m` 而非「值是不是空」是本卡唯一的關鍵：`norm()` 會把未宣告欄位填成預設值，**「有宣告」與「被填了預設」在 norm 之後就分不開了**，只有 raw meta 的 key 集合分得開。顯式寫 `author: null` 仍然清得掉。順帶收掉一處重複查表（`_list.indexOf(_byId[g.id])` → `_list.indexOf(p)`）。
    - **常駐鎖 `platform/games-register-merges`**（純 `tests/`，不出貨）＝**行為鎖**（在 vm 沙箱裡按真實載入序把登錄表跑起來，不靠原始碼字串比對）：(a) 規模自保（沙箱須載出 ≥50 款、`AUTHOR` 表須仍在，防空掃假綠）(b) 五款的暱稱逐款釘死＋`authors()` 必含 Leo＋`byAuthor('Leo')===2` (c) **反向錨①**：本次宣告的欄位仍須覆蓋前一筆（crash-x 的 `comingSoon` seed=true→MANIFEST=false、`type` seed=original→MANIFEST=special）(d) **反向錨②**：stub→真 render 的 #80 換手不得被合併擋掉（否則玩家永遠停在「載入中」而大廳卡完全正常）(e) **反向錨③**：顯式 `author:null` 仍須清得掉（欄位不得變成只能寫不能刪）(f) 結構錨：判準必須是 key 判斷 (g) 消費端錨：`authorsRow()` 內引用的每個 `HL.games.<名>` 都必須真的存在於沙箱跑出來的 API 上。
    - ⚠️ **(g) 首版鑑別力不足、被負向擾動當場抓到**：原寫成 `casino.indexOf("HL.games.authors") > -1`，而擾動 P5 把守衛改成 `HL.games.__authors ? HL.games.authors() : []`（＝分群整區靜默消失、畫面不報錯）時**字串仍在、鎖照樣綠**（P5 首跑 **MISSED**）⇒ 改為「函式體內引用的名字必須真的在 API 上」才分得出來。**同 08-28 遊戲軌 `epoch++` 錨的教訓：字串包含不是鑑別力。**
    - **驗證**：`node prototype/tests/run.js` **300→301 全綠**；**負向擾動 6/6 CAUGHT、6 例全部僅本鎖轉紅**（P1 register 回到整筆取代＝本卡缺陷本身／P2 合併過頭成先到先得＝換手失效／P3 判準改用「值是不是空」／P4 拿掉 AUTHOR 表裡的 Leo／P5 消費端守衛改名／P6 同 id 長出第二筆）；擾動後 `games.js`＋`casino.js` 兩支檔 `Buffer.equals` 驗**逐位還原**。
    - **[P-FS] 處置（本卡是首屏正數卡，收尾淨 −9B）**：`data/games.js` 首屏 eager，合併邏輯 +65B、指標註解 +80B（合計 +145B），而進場餘裕只有 **36B**。處置＝比照 #144，只回收**本卡動到的三支首屏檔**（`games.js` 107B／`mock-data.js` 25B／`lazy-games.js` 4B）的**註解欄位對齊空白**共 136B（純 cosmetic、**一個字都沒刪**），並把完整 why 寫進**不出貨的 `tests/` 鎖檔頭**、`src/` 只留一行指標。收尾 **1638373／1638400＝餘裕 27 bytes**（進場 36 ⇒ 淨 −9B）。
146. ⬜待批准 **開發者暱稱只是一個「篩選值」，從來不是一個「目的地」——目標 2 的分類軸做完了，但作者本身沒有身分** — S–M（卡在 #118，或改走延遲 view 出口） — 來源：**取材維度清單新增第 8 條「創作者/工作室做為瀏覽軸與目的地」（見 `db/sourcing-methods.md`）＋ 本輪 #145 修掉洗暱稱缺陷後浮現的下一格**
    - **機械事實（可複跑）**：`HL.games` 對作者的出口只有三個——`byAuthor(a)`（篩）、`authors()`（`[{nick,count}]` 分群）、以及 `norm()` 的 `author` 字串欄位。**沒有任何一個地方能回答「Leo 是誰」**：無頭像、無簡介、無代表作、無「Leo 的全部作品」這個頁面（`views/casino.js:106` 的分群點下去只是套一個 `author:<暱稱>` 篩選、留在同一頁）。同仁放置區的 `games/registry.json` 與 dev-kit 交件格式 `<編號>_<遊戲名>(<開發者>)` 也只帶得動一個字串。
    - **對手形制（本輪新維度首次取材）**：外部普遍把「誰做的」當成**一級瀏覽軸＋可停靠的目的地**——① 大廳有 provider 篩選器（依工作室收斂遊戲庫）② 有**供應商目錄頁**，卡片帶 logo／名稱／產地／`View Profile →` ③ 點進去是**工作室檔案**（背景、作品目錄、認證、整合、代表作）④ 目錄本身**依內容型別分群**（slots／live／table／crash & instant／…）並可**分層**（Premium Partners vs Verified）⑤ 工作室的**品牌素材**（logo／縮圖／橫幅）由平台代管 ⇒ 工作室在大廳裡有**視覺身分**，不只是一串文字。
    - **為什麼這條缺口過去查不到（同第 5/6/7 條的家族第六例）**：`intel/platforms/` **36 份 dossier** 對「供應商/工作室做為瀏覽軸」的命中數 ＝ **1**，且那 1 筆（`kaasino.md`）只是「含分類/供應商篩選」一句帶過、**零形制**。原七條取材維度沒有任何一條會走到 provider 目錄頁 ⇒ 我們**做了三個月的目標 2 分類軸，一份對手形制都沒有**。
    - **範圍（S–M · 容器先於內容 · 加法式零回歸）**：① `HL.creators` 註冊表（`register({nick, avatar, bio, links, tier})`，**未註冊的暱稱一律沿用今天行為**＝零回歸）② 大廳分群卡片改為可點進的**開發者名片**（頭像／一句簡介／作品列）③ 名片為 `HL.dock` 或 modal 的第二個消費者，不新增主導覽層級（比照 #55 的判斷：全幅內容走 modal、邊玩邊看走 dock）④ 同仁放置區 `registry.json` 可選帶 `creator` 區塊，dev-kit 交件格式同步（見 CLAUDE.md §5「改 dev-kit 必做」四步）。
    - 🔴 **落地前置（先寫在最上面，別讓實作輪重新發現）**：(a) `data/games.js` 與 `core/ui.js` **皆首屏** ⇒ 若新增 `core/creators.js` 會是**新首屏 script**，卡在 [P-FS]（本輪收尾餘裕 **27 bytes**）⇒ **必須排在 #118 之後，或把註冊表放進延遲 view 並以「取不到就沿用今天行為」的守衛式讀取接線**（後者可在 #118 之前做，且形制同 #110 對 `HL.battleMode` 的反面教訓——**規則放進延遲檔會靜默退回舊行為，所以這裡只放「資料」不放「規則」**）。(b) 名片是**視覺表面** ⇒ 依 08-24 20:00 窗釘死的機械事實「排程軌永遠拿不到 preview」，本卡的目視驗收只能由船長在前景做。
    - 🚧 **反重複界線**：不是 #103／#94 大廳分群軸的雙胞胎（那是**遊戲的**體感屬性 `HL.gameTraits`／`HL.gameAxes`，本卡是**人的**身分）；也不是 #139 大廳版位登記簿的雙胞胎（那是版位容器，本卡是版位裡的內容型別）。落地時名片區塊應**註冊進 #139 的版位登記簿**而不是自己 append。

147. ⬜待批准 **21 個登錄表有三種互相矛盾的「同 id 再註冊」語意，而沒有任何一處宣告過是哪一種——其中一種已經出貨過一次真缺陷** — S（棘輪先行·純 `tests/`·零首屏）— 來源：**#135 落地當輪把 vm 沙箱一般化後，順手對全部 `HL.<ns>.register` 做的機械普查（非人工推理）**
    - **架構前提**：「容器先於內容」是本專案的招牌哲學，全庫已有 **21 個** `HL.<ns>.register` 擴充點。**接得進來**這一半已由 `platform/registry-extension-fail-closed` 與 `intel/tools/registry-gaps.js` 守住（壞 spec 不得進場、不得有無法證明的擴充點，本輪起 unproven **0**）。**本卡問的是另一半：接進來之後，第二次註冊同一個 id 會發生什麼事。**
    - **機械事實（逐支讀 register() 實作，可複跑）＝三種語意並存、且分布接近對半**：
      · **A. 先到先得（第二次註冊完全無作用、靜默）— 7 支**：`guild`（`|| byId[spec.id]`）／`achievements`（同）／`shop`（`if (itemBy(item.id)) return false`）／`reports`（`if (defs[def.id]) return null`）／`gameAxes`（「同 key 只收第一次」）／`rbac`（`if (roles[spec.id]) return null`）／`reload`（`if (pBy(spec.key)) return false`）。
      · **B. 整筆取代（第二次註冊把前一筆整個換掉）— 13 支**：`support`（`SPECS[spec.id] = spec`·**外部註冊者最多的擴充點，11 個**）／`econCfg`／`promoCal`（註解自述「同 id 覆蓋＝可熱替換」）／`progressSrc`／`scoreAxis`／`bonusTtl`／`wagerScope`／`rg`／`sla`／`selftest`（三者註解自述「同 id 覆蓋（重載安全）」）／`content`／`i18n`／`edge`。
      · **C. 疊上本次宣告的欄位 — 1 支**：`games`，而且**它是 2026-08-29 才變成 C 的**（#145）。
    - ⭐ **為什麼這值得一張卡：B 這一族有出貨紀錄，不是假想風險**。#145 就是 B 的一個實例——`data/lazy-games.js` 用同一批 id 再註冊 stub（#80 換手第一步、meta 無 `author` 欄），整筆取代把 seed 的開發者暱稱洗成 `null`，**Leo 整個人從大廳「🎨 我們的開發者」消失，而名單看起來完全正常**，直接打到 CLAUDE.md 目標 2。⇒ **B 族還有 13 支，其中 `support` 有 11 個外部註冊者。**
    - **兩族的失效方向剛好相反、而且都是靜默的**（這是本卡的核心）：A 族＝**該生效的更新沒生效**（第二次註冊被丟掉，呼叫端拿到 `false`／`null`／鏈式物件，**沒有任何一個現有呼叫端在檢查回傳值**）；B 族＝**不該消失的欄位消失了**（前一位註冊者宣告的欄位被後來者的部分 spec 洗掉）。兩者都不報錯、畫面都正常 ⇒ CLAUDE.md §4「修一半而看不出來」家族在**擴充層**的第二種形狀（第一種是 #135 買下的「沒有東西證明註冊得進去」）。
    - **哪一種是「對的」？本卡刻意不主張統一** — 三種語意各有正當用途（`reports`／`rbac` 的註解明寫「不得覆蓋＝不會出現兩份真相」是刻意的；`selftest`／`rg`／`sla` 的「重載安全」也是刻意的）。**問題不在不一致，在「沒有宣告」**：21 支裡只有 5 支在原始碼註解裡講過自己選了哪一種，其餘 16 支要讀實作才知道，而**沒有任何測項守著它** ⇒ 任何一輪「順手統一一下」的重構都能靜默翻轉其中一支。
    - **範圍（S · 棘輪先行 · 零首屏位元組 · 加法式零回歸）**：① 在 `tests/registry-probe.js` 加一支 `rereg(ns)` 行為探針，用本輪 #135 已證可行的 vm 沙箱**實跑**（複製既有 entry → 改 id → 註冊 → 帶同 id 再註冊 → 觀察 `first-wins`／`replace`／`merge`／`duplicate`）② 立一條常駐鎖，把每一支的**現況語意逐支釘死**（形狀比照 `platform/guild-registry-provable` 的 (e) 面），翻轉任一支即轉紅並指名該支 ③ `intel/tools/registry-gaps.js` 多印一欄「再註冊語意」，台帳審「擴充性／功能」時可直接引用 ④ **不動任何 `src/`**（本卡買的是「翻轉會被抓到」，不是「改成一致」；真要統一是另一張卡，且必須逐支論證）。
    - 🔴 **已知的實作阻礙（先寫下來，別讓實作輪重新發現）**：(a) 每支登錄表的**必填欄位不同** ⇒ 「部分 spec」探針會被驗證門擋掉而誤判成 `first-wins`（本輪首版探針就踩了：`{id, label}` 對 `games` 缺 `title`、對 `econCfg` 缺 `describe`，六支全被誤報成「IGNORED」）。**正解＝複製一筆既有 entry 當模板**，只改一個欄位，才分得出「拒收」與「先到先得」。(b) `promoCal.list()`／`edge` 的列舉器會**再過一層過濾/求值**（受眾閘、排程窗口），註冊進去不一定列得出來 ⇒ 觀測點要挑 `sources()` 這種**未過濾**的出口。(c) 探針會寫入登記簿 ⇒ 必須用 `freshSandbox()`（本輪已備），不得污染 `sandbox()` 的唯讀共用快取。
    - 🚧 **反重複界線**：不是 `platform/registry-extension-fail-closed` 的雙胞胎——那條問「**壞 spec 進不進得去**」（負向、單次註冊），本卡問「**同一個 id 註冊兩次會怎樣**」（時序、兩次註冊）。兩者共用同一支 `registry-probe.js`（單一真相，不得各自實作正則/沙箱）。

148. ⬜待批准 **開機每次都把 `data-theme` 寫進 `<html>`，而全站沒有任何一行 CSS 或 JS 讀它——主題這條線接了一半、接了很久，而畫面完全正常** — S–M（卡在 #118；容器優先） — 來源：**台帳「前端UI/UX」本輪輪替審計 + wow-vegas 到期複查配對取材**（WOW Vegas 2026 評測明載 `dark/light theme switch` 為站台功能）
    - **機械事實（全 `prototype/` 可複跑，排除 `tests/`）**：
      · `core/app-state.js:15` 宣告 `theme: "dark"`；`main.js:128` 每次開機把它寫進 `document.documentElement` 的 `data-theme`；`index.html:2` 另把 `data-theme="dark"` 硬寫在 `<html>` 上。
      · **`data-theme` 在整個出貨前端的命中數就是上面這 2 筆**——`src/styles/` 三支 CSS 對 `[data-theme` 命中 **0**、全庫 `prefers-color-scheme` 命中 **0**、`.theme` 的 JS 讀取者 **0**、任何「設定主題」的 UI 出口 **0**。
      · ⇒ **把 `HL.state` 的 `theme` 改成任何值，畫面一個像素都不會變**，而 node 全綠、console 零錯誤、畫面完全正常。
    - ⭐ **為什麼這一例的漏法是新的（§4「修一半而看不出來」家族第 ⑥ 例）**：前五例（`HL.dock` 外部註冊者為零／`promoCal` 同／`HL.reveal`／`app-state.lossLimitRemaining` 零讀取者／#67 空目的地）缺的都是**同一種語言裡的第二端**（JS 寫、JS 沒讀）⇒ `intel/tools/registry-gaps.js` 掃 `HL.<ns>` 消費者就抓得到。本例的生產端在 **JS**、消費端本來就該在 **CSS** ⇒ registry-gaps、五面 i18n 棘輪、`ledger-card-sweep.js` **射程上全都看不到它**。**跨語言的契約，本庫先前沒有任何一把尺在量。**
    - ✅ **那把尺本輪已經先立起來了**（08-30 08:00 窗落地，純 `tests/`、零首屏位元組）：常駐鎖 `platform/root-dom-contract-consumers` 掃出根元素 DOM 契約名冊 **3 筆**——`class:ax-anim-off`（消費端 css ✅）／`attr:lang`（native+js ✅）／**`attr:data-theme`（消費端 0 ⇒ 唯一孤兒）**，並帶**基線防腐**：`data-theme` 一旦有了消費端，鎖會**要求**把它從 `ROOT_CONTRACT_ORPHAN_BASELINE` 移除。⇒ **本卡落地時「把它移出免罪名單」是必要的一步，忘了做會轉紅。**
    - **範圍（容器優先·比照本專案招牌哲學）**：① `HL.theme.register({id,name,vars})` 主題登記表——**不新增 DOM 契約，接上已經在寫的那一個**（`data-theme` 已是現成出口，這是本卡成本低的原因）；② CSS 端只需 `:root[data-theme="<id>"]{ --ax-*: … }` 一段覆寫——`src/styles/tokens.css` 的 `--ax-*` token 層本來就是主題化的正確底座，缺的只是「同一組 token 有第二套值」；③ 一個切換出口（設定面板/語言選單旁），未註冊任何主題時整格自動不渲染（fail-closed，比照 `platform/registry-extension-fail-closed`）；④ 落地當下把 `data-theme` 移出孤兒免罪名單。
    - ⚠️ **據實界定不誇大**：absent 指的是「主題**模式**這個容器」，**不是**說本庫沒有設計 token——`--ax-*` token 層是完整的。也**不是**主張一定要出淺色皮膚（那是產品決定）；本卡買的是「這條線接得完、且接不完會被抓到」。
    - **對手形制（2026 取材·`intel/platforms/wow-vegas.md`）**：WOW Vegas 明載 `dark/light theme switch`；多份 2026 報導把主題切換定位為**可近用性**而非美術偏好（>80% 有選擇時選深色、93% 回報深色減少眼睛疲勞、畏光/偏頭痛族群），另有「把對比變體放進主體驗而非藏進無障礙選單」與「依時段自動切換」兩種進階形制。
    - 🔴 **首屏成本（本卡卡在 #118 的原因，先寫下來別讓實作輪重新發現）**：主題定義若寫進 `tokens.css` 即首屏位元組，而進場餘裕僅 **27 bytes**。可行的零首屏路徑＝主題表隨設定面板/`HL.dock` 延遲載入、只有使用者真的切換時才注入 `<style>`（比照語言包按需載入、`platform/i18n-packs-not-eager` 已守著同型性質）。⇒ **本卡在 #118 解鎖前不落地，但它不需要 preview**（結構性改動可由新鎖 + token 覆寫的存在性斷言守住）。
    - 🚧 **反重複界線**：不是 `platform/root-dom-contract-consumers` 的雙胞胎——那條是**尺**（守「寫了沒人讀會被抓到」，本輪已落地），本卡是**修**（把消費端真的補上）。也不是 #141（語言包完備度登記簿）的雙胞胎——兩者同屬「宣告端做完、消費端從未存在」家族，但 #141 缺的消費端是「語言選單要顯示什麼」，本卡缺的消費端在 **CSS**。

149. ⬜待批准 **挑戰引擎每一局都收得到 `game`，而它從來沒有看過一眼——「這個促銷只在指定遊戲算」在架構上做不出來，可是簽名看起來是完整的** — S（加法式零回歸；卡在 #118，見下方首屏成本） — 來源：**台帳「活動/促銷框架」相鄰面 + 2026-08-30 取材五站共識**（`intel/platforms/gamdom.md`／`duelbits.md` 08-30 刷新）
    - **機械事實（可複跑，靜態分析全 `prototype/src`）**：
      · 中央點 `core/live-stats.js` 的 `record(game, bet, win)` 把 **裸識別字 `game`** 當頂層引數交給 **8 支**下游：`achievements.record`／`betlog.record`／`bonus.onWager`／`edge.weighted`／`heat.record`／`rakeback.accrue`／`tournament.record`／`challenges.record`。
      · 這 8 支裡 **7 支真的讀它**（讀取次數 1–2 次）。**只有 `challenges.record` 是 0。**
      · `core/challenges.js` 全檔 `game` 的命中數就是 **2**：一次在檔頭註解（`* 資料源：HL.liveStats.record(game,bet,win) …`），一次在 `record(game, bet, win)` 的簽名。**函式體內零次。**
    - ⭐ **為什麼這是 CLAUDE.md §4「修一半而看不出來」家族（第八種形狀）**：前幾例缺的是「**第二端不存在**」（`HL.dock` 零外部註冊者／`data-theme` 零 CSS 消費端）。這一例**兩端都在、線也接好了、每局都真的傳值進去**——缺的是**收的人沒有看**。於是每一個既有驗證面都是綠的：扇出名冊 `platform/central-hook-fanout-roster` ✅（確實被呼叫）、引數值鎖 ✅（bet/win 都對）、record-once ✅、console 零錯誤、挑戰照常達成照常發獎。**唯一的症狀是一個做不出來的能力，而沒有任何讀數在描述它。**
    - **有前例可證這不是假想風險**：#89 修的是**同一條線的另一半**——當年 `HL.bonus.onWager` 是這個中央掛鉤上「最後一個**收不到** `game` 的大消費端」，所以「這筆紅利只能在 slot 打流水」做不出來。#89 把 `game` 接上去之後，下一種形狀就是**收到了卻不讀**，而它比前一種更難看見。
    - **對手形制＝五站共識（不是單站新聞）**（2026-08-30 取材）：
      · **Duelbits** — monthly challenges **for selected games**，固定賠付＋倍數門檻
      · **Gamdom** — Tuesday Free Spins Giveaway 綁 **Game of the Week**，每週輪替一款
      · **Shuffle** — multiplier-based Challenges，「一次大命中」而非流水量決勝
      · **Gambulls** — 一次上架 18 條週挑戰，明載 across the most popular **titles in the lobby**
      · **CryptoGames** — Weekend Challenge「Multigame · highest multiplier hunt」
      ⇒ 五站橫跨三種商業模式都做同一件事＝依 SKILL 第 3 步「多平台共識」準則足以支撐開卡。
    - ✅ **那把尺本輪已經先立起來了**（08-30 14:00 窗落地，純 `tests/`、零首屏位元組）：常駐鎖 **`platform/central-hook-game-arg-consumed`**——射程是**掃出來的地面真相**（從 `live-stats.js` 的 `record()` 掃出誰收到裸 `game`、解匯出別名找到實作、取同位置形參數讀取次數），與宣告名冊做**雙向等式**。**本卡落地時必須把 `challenges.record` 從 `GAME_ARG_ORPHAN_BASELINE` 移進 `GAME_ARG_CONSUMED_BASELINE`**，否則那條鎖的「少一個」方向會轉紅（這是刻意的摩擦）。負向擾動 **7/7 CAUGHT**。
    - **範圍（S · 加法式零回歸 · 容器優先）**：
      ① `core/challenges.js` 的 spec 加**選用**欄位 `games: ["slot", …]`（未宣告＝全遊戲通吃，與今日行為逐位相同）；
      ② `record()` 讀它**已經收到**的 `game` 做比對（不新增引數、不動中央點、不動 `platform/central-hook-fanout-roster` 的任何斷言）；
      ③ 挑戰卡的文案要能說出「限 ○○」——**i18n 走既有片語字典**（畫面中文為 key），不得新增硬寫字串；
      ④ 遊戲 id 的**唯一真相**是 `HL.games`／`data/games.js` 的登錄 id，**不得在 challenges.js 自刻第二份遊戲名單**（比照 `platform/audience-single-vocabulary` 的「不得自刻第二份詞彙」紀律）；宣告了不存在的 id ⇒ 該挑戰**永遠不會達成、不報錯、console 全乾淨**（同家族的靜默失敗）⇒ 落地時要一併鎖住「宣告的 id 必須存在於登錄表」。
    - 🔴 **首屏成本（本卡卡在 #118 的原因，先寫下來別讓實作輪重新發現）——而且這次是被**實測**證明的，不是估的**：`core/challenges.js` 是首屏 eager src，進場餘裕 **27 bytes**。本窗的負向擾動 P1 只往 `record()` 裡插了**一行** `if (game === "__never__") return;`，`platform/first-screen-budget` **當場轉紅**（與 `central-hook-game-arg-consumed` 一起紅）。⇒ 本卡的最小可行落地也遠超 27B。**#118 解鎖那 64.2KB 之前不得落地。**
    - 🚧 **反重複界線（三條）**：
      · **不是 #136（遊戲內活動掛件）的雙胞胎**——#136 要的是「**露出位置**在遊戲畫面裡」，本卡要的是「**資格與計分**綁在那款遊戲上」。兩者是**前後置**關係：沒有本卡，#136 即使做出來也只能顯示與該遊戲無關的全站進度（挑戰引擎根本分不出是哪一款打出來的）。⇒ **建議實作順序 #149 → #136**。
      · **不是 #52／#107（促銷受眾分群）的雙胞胎**——那條軸切的是**玩家**（誰有資格看到），本卡切的是**遊戲**（哪一款算數）。兩軸正交，未來可疊。
      · **不是 `platform/central-hook-fanout-roster` 的雙胞胎**——那條問「有沒有被呼叫、數量對不對」，本卡（與同窗新立的尺）問「拿到的 `game` 有沒有被讀」。
    - **下游**：#136（遊戲內活動掛件）；本卡落地後「每週換一款」只是往 `HL.promoCal` 註冊一條 promo，**不需要新容器**（排程軸 #49 已在位、7 個外部註冊者）。


150. ⬜待批准 **玩家可以把整個帳戶鎖起來，卻鎖不掉「其中一類遊戲」——25 個下注閘全部只收到一個數字，範圍型排除在架構上做不出來** — S–M（卡在 #118，見下方首屏成本） — 來源：**台帳「資安／負責任博弈」本輪輪替審計 ＋ Stake 官方 Help Center 一手**（其自我排除頁把 `Casino Exclusion`／`Poker Exclusion` 列為與帳戶級自我排除**並列的獨立工具**）
    - **機械事實（可複跑，全 `prototype/src`）**：
      · `HL.rg.check()`／`HL.rg.checkDeposit()` 全庫命中 **27 行**，扣掉 2 行註解＝**25 個真實呼叫點**（12×`check(bet)`／6×`check(cost)`／`check(t)`／`check(total)`／`check(stake)`／`check(st.bet)`／`check(room.wager)`／`check(b)`／`checkDeposit(amt)`）。
      · 這 25 個呼叫點**全部只傳一個數字**；`grep` 帶第二引數者 **0 個**。
      · 鏈路 `check(bet) → evaluate(limits, st, amount, now, pause, axis)`（`core/responsible.js:639/249`）**自始至終沒有任何遊戲身分**——不是「收到了沒讀」，是**根本沒有那個引數**。
      · 既有 `axis`（#70）是**交易別**（`bet`／`deposit`），不是產品範圍：它答的是「這筆是下注還是儲值」，答不了「這是哪一款遊戲」。
    - ⭐ **為什麼這值得一張卡，而不是「自我排除本來就該是全帳戶」**：本庫的責任博弈**面板是完整的**——七種限額型別（`loss-daily`／`wager-daily`／`bet-single`／`time-daily`／`deposit-daily|weekly|monthly`）＋暫停註冊表兩 kind（`cool` 3 檔／`exclude` 4 檔含永久）＋reality check，**BC.GAME 2026 的整套工具集我們逐項全備、本輪對照零新缺口**。缺的不是某一項工具，是**所有工具共用的那條「範圍」軸**：今天玩家只有「全開」或「全關」兩格。
    - 🧬 **與 #149 的關係（同族的另一半，刻意分卡）**：#149 是「**引數傳進去了、消費端沒看**」（`challenges.record(game,…)` 讀取次數 0）；本卡是「**引數從來沒有被傳**」（`rg.check()` 的簽名裡沒有 game）。兩者都讓「限定某些遊戲」做不出來，但**修法完全不同**：#149 改 `challenges.js` 內部即可、不動呼叫點；本卡**必然要動 25 個呼叫點**（或在中央處補上遊戲身分）⇒ 工作量與回歸面不同級，合併會讓兩者互相拖住。
    - **對手形制**：Stake — 自我排除頁明列 `Casino Exclusion`／`Poker Exclusion`／`Break In Play`／`Deposit Limits` 為**並列的獨立工具**，帳戶級自我排除則是無限期、最短 6 個月且需人工 return-to-play 審核 ⇒ **「範圍」與「強度」是兩條正交軸**，我們只有強度那條。
    - **範圍（容器優先·加法式零回歸）**：
      ① 閘收下遊戲身分：`check(bet, game)`（第二引數**選用**，漏傳＝今日行為逐位相同，比照 #70 的 `axis` 相容契約）；遊戲 id 的**唯一真相**是 `HL.games` 的登錄 id，**不得在 `responsible.js` 自刻第二份名單**。
      ② `registerPause` 的 spec 加**選用** `scope`（未宣告＝全帳戶＝今日語意）；範圍述詞獨立成表，讓「只排除 slot」「只排除對戰」都是**加一筆 spec**而非改閘。
      ③ 限額型別同軸可用（例：「slot 每日投注上限」）——但**本卡只買容器與自我排除的範圍，限額的範圍化留給下游卡**，避免一次縫死。
      ④ 面板要能說出範圍，且**文案走既有片語字典**（畫面中文為 key），不得新增硬寫字串。
    - 🔴 **首屏成本（卡在 #118 的原因，先寫下來別讓實作輪重新發現）**：`core/responsible.js` 是**首屏 eager**（`index.html:145`）且已是 **63.1KB**（全庫第二大首屏 src），而進場餘裕 **27 bytes**——**連一段完整的 why 註解都放不下**（08-24 那次超標正是註解造成的）。零首屏路徑：把範圍述詞表與面板段落放進**延遲檔**、`responsible.js` 只留選用引數的最小接線（仍是正數位元組）⇒ 實際上仍須等 #118。
    - 🚧 **反重複界線**：不是 #96／#86（自我排除本體，皆 ✅）的雙胞胎——那兩張買的是「有沒有這個工具」，本卡買的是「這個工具有沒有範圍」；不是 #127（玩家可見度）的雙胞胎——那條管「別人看不看得到我」，本卡管「我自己能不能只關掉一部分」；不是 #137（出金安全鎖）的雙胞胎——那條在**錢往外走**那一側。

151. ⬜待批准 **報表中心對玩家說「匯出為全部資料」，而它的兩個資料來源分別在第 501 局與第 91 天把過去丟掉——玩家問不出「我八月玩了什麼」，也不知道自己的歷史回溯到哪一天** — M（卡在 #118） — 來源：**台帳「資料」分類本輪新增的全庫首見模組「期間軸與對帳單 Period Axis & Account Statements」（absent）**＋本輪配對取材（bet365 *My Activity* 7 天／30 天／12 個月、BetMGM 逐年對帳單、Stake `my-bets/archive`、多數 sportsbook「日期區間＋結果」兩軸並列）。
    - **這一格為什麼從來沒被問到（台帳盲點第 6 例·成因與 #138 同型）**：「資料」分類原有 4 個模組問的是「**有沒有紀錄**（注單）／**拿不拿得出去**（報表與匯出）／**平台看得到什麼**（資料分析）／**這台裝置上存了什麼**（存檔清冊）」——**沒有一個問「能不能按一段時間去問」**。期間是這四個表面**共用**的一條軸，於是四格都以為它屬於另外三格。
    - **機械事實（可複跑）**：
      ① `core/betlog.js:158–166` `list(f)` 的篩選軸**只有兩個**：`f.game`、`f.outcome`（全部／只看贏／只看輸）。全檔 `ts` 只被寫入與顯示，**從不被拿來篩** ⇒ 沒有任何期間入口。
      ② `core/reports.js:12` `register({ id, cat, aud, name, icon, cols, rows(f), avail(), file })`——**沒有任何欄位能宣告這張報表的涵蓋期間或保留上界**。就算想誠實揭露，今天也沒有地方放。
      ③ 六張註冊報表中**只有 `activity-daily` 帶時間欄**（`ago` 距今天數／`date`，`reports.js:472–486`），而它的來源是 `HL.activity` 的日桶、不是注單。
      ④ 兩個玩家側來源的保留上界**不同軸也不同長度**：`betlog` `CAP=500`（**筆數**）、`activity` `KEEP_DAYS=90`（**天數**）。⇒ 同一段過去，日桶說有、注單可能已經丟掉（重度玩家 500 局可能不到三天）＝**兩份彼此不一致的過去並列在同一個中心頁上，沒有一處說明它們涵蓋的期間不同**。
      ⑤ `reports.js:680` 對玩家寫死 `僅顯示前 200 列；匯出為全部資料。`（`src/i18n/en.js:794` 譯為 *the export contains everything*）——**這句話今天是假的**。注單面板自己還有 `已記錄注單 N / 500` 這行（`betlog.js` 頁尾），**中心頁與 CSV 兩處都沒有** ⇒ 越新、越正式的那個表面反而揭露得越少。
    - **業界形制（本輪取材，只用來說明量級是共識、不作合規承諾）**：bet365 *My Activity* 提供 7 天／30 天／12 個月三個期間；BetMGM 提供逐年對帳單；Stake 有 `my-bets/archive`；UKGC RTS 要求「不必聯絡客服即可取得至少 3 個月的帳戶與投注歷史，12 個月可索取」。⇒ **本庫剛好只有標配的一半**（結果篩選有、期間軸沒有）。
    - **範圍（M · 容器先於內容 · 加法式零回歸）**：
      ① **期間是報表描述子上的一個欄位**，不是每張報表各自長一個下拉：`register({ …, period: { axis: "ts", windows: [7, 30, 90] } })`；未宣告 `period` 的報表**不顯示期間選擇器**（既有六張逐位零回歸）。
      ② `betlog.list(f)` 收下**選用**的 `f.from`／`f.to`（未帶＝今日行為逐位相同，比照 #70 `axis`／#150 `game` 的相容契約）；面板加「近 7／30／90 天／全部」一列，與既有 `outcome` 分段列並排。
      ③ ⭐ **水平線揭露（本卡的重點，不是期間選擇器）**：任何期間視圖與任何 CSV 都要能說出「這份資料實際回溯到哪一天／被什麼上界截斷」。值**必須向已可查詢的出口求值**（`HL.betlog.CAP`／`HL.activity.core.KEEP_DAYS`，由本輪新立的常駐鎖 `platform/retention-bound-queryable` 保證轉發），**不得由 UI 自己抄 500／90**。
      ④ 若選定期間**超出**該來源的保留水平線，要當場說出來（例：「你選了 90 天，但注單只回溯到 08-12＝最舊的一筆」），而不是回一張看起來很正常、只是比較短的表。
      ⑤ `reports.js:680` 那句「匯出為全部資料」改成由描述子求值的誠實文案；**走既有片語字典**（畫面中文為 key），並同步 `en`／`zh-Hans` 兩包。
    - 🚧 **反重複界線（開卡前已對既有層做反向搜尋）**：
      (a) **不是 #138 `HL.storage` 的雙胞胎**——#138 是「**這台裝置上存了什麼、多大、怎麼刪**」（存檔清冊＋逐項清除＋整站重置），本卡是「**我能不能按一段時間問我的歷史，以及它到底回溯到哪天**」。出口形狀不同（存檔清冊 vs 報表描述子上的期間欄位＋水平線），動作不同（刪除／設上界 vs 查詢／揭露）。**兩張卡共用同一組保留常數，但方向相反**：#138 是**設**上界，本卡是**說出**上界的後果。
      (b) **不是 #109 `HL.reports` 的雙胞胎**——#109 買的是「報表定義可註冊、匯出只有一個出口、受眾有閘」，那三件事都已 ✅ 且有鎖；本卡買的是**描述子上還缺的那一欄**（期間），以及中心頁對玩家的**那句不實文案**。
      (c) ⭐ **不得自刻第二份保留上界**——`platform/retention-bound-queryable`（本輪立）已把 `CAP`／`KEEP_DAYS` 鎖成「經公開出口轉發同一識別字、宣告點恰一處」；本卡若在 UI 或 CSV 裡重打 500／90，那條鎖不會紅（它守的是**來源**端），但會製造 #94 記過的第二份真相 ⇒ **實作時必須向出口求值**，並在落地同輪把「有沒有向出口求值」補成一條可鎖的形狀。
    - 🔴 **落地前置（先寫在最上面，別讓實作輪重新發現）**：
      ① **首屏成本＝本卡卡在 #118 的唯一原因**：要動的 `core/betlog.js`（9.8KB）／`core/reports.js`（25KB）／`core/activity.js` **三支都是首屏 eager**，而 [P-FS] 餘裕實測 **27 bytes**（1638373／1638400）⇒ 落地當下 `platform/first-screen-budget` 必紅、三軌全被擋。**照 08-24 的教訓，這裡的判準是「落地後量一次 KB」，不是「有沒有新增 script」**——本卡光是把上面這些 why 寫成註解就會超標。
      ② **不要為了繞開 ① 而把期間軸做成延遲檔**：期間是**描述子的欄位**，欄位定義必須與 `register()` 同檔，否則就是把一份真相拆成兩處（本庫 #118 卡上已記過「延遲檔之間也有依賴，壞掉時每個既有驗證面都是綠的」）。
      ③ **兩個來源的期間語意不同，不要用同一把尺**：注單是**事件時戳**（可任意區間），日桶是**天粒度且只回溯 90 天**。描述子的 `windows` 應由各報表自己宣告，中心頁不得假設所有報表都支援同一組期間。

152. ⬜待批准 **全站流量最高的擴充點是唯一沒有登記簿的擴充點——21 個 `HL.<ns>.register` 都不是它，而「再掛一個子系統」今天過不了 27 位元組的預算閘** — M（容器優先；卡在 #118） — 來源：**台帳「擴充性」分類本輪輪替審計新增的全庫首見模組「中央結算掛鉤的擴充形制（訂閱者登記簿）」(absent)＋`intel/tools/registry-gaps.js` 全庫普查**
    - **這一格為什麼從來沒被問到（台帳盲點第 7 例）**：`[功能] 中央結算掛鉤 liveStats.record Hub` 問的是「**這個匯流點存不存在、下游有沒有被餵到**」（present，兩條鎖在守）；`[擴充性]` 原有 7 個模組問的是停靠佈局／元件庫／測試／首屏分割／上架排程／旗標／大廳版位——**沒有一格問「這個擴充點本身是不是資料驅動的」**（同 08-16 玩家保護／08-24 帳戶安全／08-25 Feature Flags／08-26 營運自動化／08-28 大廳版位：台帳沒有的欄位，審多少輪都審不到）。
    - **機械事實（可複跑）**：
      ① `grep -rn "liveStats.register\|liveStats.on(" prototype/src` ＝ **0 命中**。`intel/tools/registry-gaps.js` 列出全庫 `HL.<ns>.register` 擴充點——**中央結算掛鉤不在其中**。〔**2026-08-31 20:00 窗回填·不改本卡結論**：開卡當下抄的那組數字（21 個擴充點／`games` 26／`econCfg` 15）是**被污染的讀數**——該工具的篩子把註解與字串裡的**提及**也算成呼叫點。修正後的口徑＝**擴充點合計 24 個**（其中 **10 個**有程式碼外部呼叫點）、`games` **24 個呼叫點／21 個檔**、`econCfg` **14**、`support` **11**（不變）、`promoCal` **7**（不變）。本卡的論點（中央掛鉤不在任何一份登記簿裡）與這些數字無關，逐字仍成立。詳見常駐鎖 `platform/registry-sites-code-only`。〕
      ② 22 個下游全部以 `if (HL.<ns>) HL.<ns>.xxx(...)` **硬寫在 `core/live-stats.js` 的 `record()` 函式體內**（`live-stats.js:22–58`，其中第 47 行一行掛 11 支）。
      ③ ⇒ CLAUDE.md §4 那句「任何依玩家行為觸發的留存/任務/成就/返水，掛這裡即全遊戲通吃」為真，**代價是每掛一個新子系統就要改一次首屏 core 檔**。
    - ⭐ **為什麼是現在（這是本卡與「早就知道它是 if 鏈」的差別）**：[P-FS] 的首屏餘裕只剩 **27 位元組**。一行 `if (HL.x) HL.x.record(bet);` 約 30–40B ⇒ **下一個訂閱者落地當下就會讓 `platform/first-screen-budget` 轉紅、node 全套紅、三軌同時被擋**。台帳 08-15 記的「三者都是後來的卡自己掛上來的、不必改架構」在**位元組層面已不再成立** ⇒ 這個擴充機制在 #118 解鎖前**實質關閉**。
    - **範圍（M · 容器先於內容 · 加法式零回歸）**：
      ① `HL.liveStats.on({ id, order, fn })` ＋ `off(id)`：`record()` 只保留「算本工作階段統計」與「依 order 逐筆派發」兩件事；每個下游改由**自己的檔**註冊（`core/betlog.js` 註冊 `betlog`、`core/heat.js` 註冊 `heat`…）。
      ② 派發時**逐筆 try/catch**：一支下游 throw 不得讓其餘下游收不到這一局（＝把本輪 `platform/central-hook-tolerates-absent-downstream` 鎖住的性質從「靠守衛慣例」升級為「架構保證」）。
      ③ 每筆註冊宣告 `phase: "wager" | "win" | "both"`，取代今天散在函式體內的 `bet > 0`／`win > 0`／`bet > 0 && win > 0` 三種閘（`platform/central-hook-fanout-roster` 的 (e) 面「押注側零白送」即這條的既有網）。
    - 🔴 **落地前置（先寫下來，別讓實作輪重新發現——本庫 #94/#98 的教訓）**：
      ① ⚠️ **順序是語意的一部分，不是實作細節**：`#20` 要求紅利流水推進**必須最前**（否則本注會解鎖同一結算內才鑄出的紅利）；`#50/#59` 要求 `progressSrc` 吃加權額而 `tasks` 吃真實額（兩把尺不得互冒充）；`progressSrc` 缺席時要退化成 `vip.addWager`＋`season.record`。⇒ 登記簿**必須有顯式 `order`**，且遷移時每一支的相對次序要逐支比對，不能靠「註冊順序＝載入順序」（載入順序在 #110/#118 之後不再穩定）。
      ② **首屏成本＝本卡卡在 #118 的唯一原因**：`core/live-stats.js` 是首屏 eager，登記簿本體與 22 支下游各自的註冊呼叫都會淨增位元組，而餘裕是 **27B**。⇒ 必須排在 #118 之後（或與它同輪）。
      ③ **不得在遷移中順手改語意**：本卡買的是「掛法從硬寫改成註冊」，**不是**「重新設計誰該收到什麼」。逐支 one-out 與全載入兩條鎖必須在遷移前後都全綠（且不得放寬——§10.1）。
    - 🚧 **反重複界線（開卡前已對既有層做反向搜尋）**：
      (a) **不是 #147 的雙胞胎**——#147 問「**既有 21 個登錄表**的『同 id 再註冊』語意是哪一種」（時序語意、純 `tests/` 棘輪），本卡問「**中央掛鉤根本不是登錄表**」（缺一個容器）。兩張卡方向相反：#147 守既有容器的行為，本卡造一個不存在的容器。
      (b) **不是 #118 的雙胞胎**——#118 是「把三支共享引擎搬出首屏換回 64.2KB」，本卡是「把一個 if 鏈換成登記簿」。本卡**依賴** #118 的位元組，不取代它。
      (c) **不是 `platform/central-hook-fanout-roster`／`-tolerates-absent-downstream` 的雙胞胎**——那兩條是**鎖**（守現況不退步），本卡是**改造**（換擴充形制）；兩條鎖正是本卡的回歸網。

153. ⬜待批准 **「註冊進去了沒有」這個問題有一半的登記簿答不出來，而原因是我們的詞彙表只認五個字** — S（純 `tests/`·零首屏位元組） — 來源：**本輪（08-31 20:00 窗）修 `registry-probe.js` 篩子時實測到的射程缺口**（非台帳分類自審，故無來源模組）
    - **一句話**：`registry-probe.js` 判一支登記簿「證明得到」的條件是「有 `register` **且**有 ≥1 個**列舉器**」，而列舉器的判準是一份**寫死的五字詞彙表** `ENUMERATORS = ["ids", "list", "all", "count", "keys"]`。凡是把列舉器取成別的名字的登記簿，機械上一律被讀成「無法斷言註冊有沒有生效」。
    - **機械事實（本輪實測·可複跑）**：把 unproven 的射程試著擴到②那張清單時，**三支**當場被判 unproven，而三支的真實原因都是詞彙表收不到它們的列舉器：
      · `HL.shop` → 列舉器叫 **`catalog`**（`register, redeem, points, status, record, open, catalog`）
      · `HL.sla` → 列舉器叫 **`dims`**／**`caps`**
      · `HL.rg` → 最接近的是 **`pauseOptions`**／`status`
      同一次實測還撞到**反方向**的一個誤判：`HL.dock` 被判「不是擴充點」，只因 `layout/` 不進 vm 沙箱（`SANDBOX_SKIP`）而它又不在 `PROBEABLE` 名單上——**而它明明有真實的外部註冊者**（`layout/dock-growth.js`）。⇒ 一邊三個誤報、一邊一個漏報，**都不是登記簿壞了，是尺的詞彙與射程不夠**。
    - ⭐ **為什麼這是一張卡而不是順手改**（本輪刻意撤回了順手改的那一版）：把詞彙表加四個字（`catalog`／`dims`／`caps`／`pauseOptions`）是**十秒的事**，但那正是本專案記過六次的那個家族——**「維度清單漏掉一個表面，換多少來源都補不回來」**（08-16 玩家保護／08-24 帳戶安全／08-26 營運自動化／08-28／08-31 兩次）。補四個字只是把今天看得到的四支收進來，**下一支取名叫 `entries()` 的登記簿仍然會靜默逃過**。⇒ 要買的是**判準從清單式換成行為式**。
    - **範圍（S · 純 `tests/`）**：
      ① 列舉器判準改**行為式**：對 CORE 的每個零參數函式，先取一次回傳值、`register()` 一筆合法 spec、再取一次——**回傳長度變大的那個就是列舉器**（`Array.length`／`Object.keys().length`／`Map.size`／`number`）。這與本檔既有主斷言的哲學一致（檔頭第二段明文寫著「本檔的主斷言是**行為的**」），清單式只是當年的權宜。
      ② 探針射程的兩份名單（`PROBEABLE`／`SANDBOX_SKIP`）要能**答得出「這一支我看不到」**：現在看不到就等於靜默通過（`dock` 即此例）。改為明列「不在任何環境射程內」的清單並在報告第③段印出來——不是把它們判紅，而是**不許它們消失**。
      ③ 有了 ①② 之後，才把 `unproven` 的射程擴到②那張清單（本輪已在 `registry-probe.js` 內把取捨與撤回理由寫成註解，並由 `platform/registry-sites-code-only` ⑤ 暫時守住四支移動過去的擴充點）。**順序不可顛倒**：先擴射程會製造三個假警報，而假警報疲勞會讓下一個真的被忽略（同 08-30 20:00 窗「刻意不鎖正向」的判斷）。
    - **驗收（不變量 · 每條都要有負向擾動）**：(a) 行為式判準對現有 24 個擴充點的結果，必須與人工逐支確認的名單一致（不得靠放寬拿到全綠）；(b) 把 `ENUMERATORS` 五字詞彙表**整條刪掉**後結果不變（＝真的不再依賴它）；(c) 任一環境的射程縮小（`PROBEABLE` 少一支／`SANDBOX_SKIP` 多一條）必須有斷言轉紅；(d) `unproven` 擴射程後仍為空集合，且 `UNPROVEN_BASELINE` 不得被拿來塞這三支。
    - 🚧 **反重複界線**：不是 `platform/registry-extension-fail-closed`（那條守「壞 spec 不得進場 + unproven 零成長」，本卡修的是**它憑什麼認定一支是 proven**）；也不是本輪的 `platform/registry-sites-code-only`（那條守「呼叫點只認程式碼」，是**輸入端**的篩子，本卡是**判定端**的詞彙）。兩條鎖都是本卡的回歸網。
    - **首屏成本 0**：全部落在 `prototype/tests/`（不出貨、不在 `index.html`、不在 PRECACHE）⇒ **不卡 #118**。
154. ⬜待批准 **一注抵達中央掛鉤時叫「暗影儀式」，而查表的人只認得「shadow-ritual」——兩套詞彙，管錢的那一端用精確比對** — M（**動首屏 `core/wager-scope.js` ⇒ 卡在 #118**；解析表本身可先落 `data/`） — 來源：**platform-modules 台帳 `金流/獎金與流水引擎` 09-01 08:00 窗輪替自審**（機械查證，非外部取材）
    - **一句話**：`HL.liveStats.record(game, …)` 這條中央掛鉤上流通的 `game` 是**結算詞彙**（顯示名或舊 slug），而 `HL.wagerScope.typeOf()` 用 `HL.games.byId(id)` 查的是**登錄表 id 詞彙**；兩套詞彙有 **7 個鍵對不上**，其中包含**旗艦 slot**。
    - **機械事實（2026-09-01 實測·可複跑 `node -e "console.log(require('./prototype/tests/registry-probe.js').settleVocab())"`）**：結算詞彙共 **29 個字面量鍵／52 個呼叫點**（direct 15 鍵＝各 view 直呼掛鉤；engine 14 鍵＝經 `HL.instant.betPanel({game})`／`HL.table.betArea({game})` 轉手），權威登錄表 **65 筆 id**（沙箱實跑 `HL.games.all()`）⇒ **22 解析成功／7 失敗**：
      · `暗影儀式` ×7（`views/slot.js`）→ 應為 **`shadow-ritual`**（type `original`）
      · `小雞過馬路` ×5（`views/chicken.js`）→ 應為 **`chicken-cross`**（type `special`）
      · `roulette` ×1（`views/table-roulette.js:93`）→ 應為 **`european-roulette`**（type `table`）＊唯一的「舊 slug」型，且**只出現在 engine 側**
      · `Slots Battle` ×3（`views/vsslot.js`）／`賞金局 · 翻牌` ×2、`賞金局 · 踩地雷` ×2（`views/bounty.js`）／`跟注·百家樂` ×2（`layout/streamer.js`、`views/liveroom.js`）→ **這四個在登錄表裡根本沒有對應遊戲**（它們是玩法/入口，不是登錄的遊戲）⇒ 需要的不是改名，是**明訂它們的類別**（見範圍③）
    - ⭐ **為什麼是錢的問題，不是命名潔癖**：`core/wager-scope.js` 的 `typeOf()` 查不到回 `unknown`；`weightFor()` 對未列出的類別取 `w.rest`、**沒有 `rest` 就 0**；而出貨的 `standard` preset（`{slot:1, original:1, special:1, table:0.1, live:0.1}`）**正好沒有 `rest`** ⇒ 一旦有紅利宣告 `scope`，**押在旗艦 slot 上的流水對那筆紅利貢獻 0**，而 `standard` 的賣點正是「slot 全額、桌遊一折」＝**與意圖完全相反**，且畫面上、帳本上、其他每一條鎖上都看不出異常。
    - ⭐ **為什麼到今天才被看到（三層的第三層）**：同一條掛鉤上已有兩條鎖——`platform/central-hook-fanout-roster`（下游**收不收到** game）與 `platform/central-hook-game-arg-consumed`（下游**讀不讀** game）——**兩條都綠**，而沒有任何一條問「**讀到的那個值，在它要查的那本字典裡查得到嗎**」。⇒ CLAUDE.md §4「修一半而看不出來」在**量測層**的形狀。
    - ⭐ **同一個落差在另一個消費端早就被發現過，只是那裡不致命**：`core/heat.js` 的 `matchGame()` 自己寫了一個 fuzzy 比對器（`indexOf` 雙向）繞過去，檔內註解原句是「名稱字串各遊戲不一致，找不到不致命」。⇒ **無害的消費端局部繞過、管錢的消費端維持精確查表，而繞過的那一版沒有回頭把落差本身記下來**。這是「局部繞過吃掉了全域修法的動機」這一型的第一個明確實例，值得記進 §4 家族。
    - **今天還沒出事的唯一原因**：全站 `HL.bonus.add` **零筆**宣告 `scope`（實測），`weightFor` 的零回歸錨點（`scope == null → 1`）直接回 1。⇒ **潛伏缺陷**：#89 的功能一被用上就變活缺陷。
    - 🔒 **已先上互鎖（09-01 08:00 窗落地，零首屏位元組）**：常駐鎖 `platform/settle-vocab-scoped-bonus-interlock` — 不符集合**不得成長**（棘輪＋雙向基線防腐），且**只要還有不符，就不許有任何宣告 `scope` 的紅利上線**；詞彙全部對上時互鎖**自動釋放**。⇒ 本卡未落地期間，這個缺陷**不會變成活的**，但也**擋住 #89 的功能被使用**（這是刻意的取捨，不是副作用）。
    - **範圍（M · 三段，②③ 可分卡）**：
      ① **解析層**：把「結算詞彙 → 登錄表 id」做成**一張資料驅動的別名表**（`data/` 內，不是硬寫在引擎裡；空表時行為與今天逐位相同＝零回歸錨點），並讓 `HL.wagerScope.typeOf()` 在精確查表失敗時走這張表。**刻意不採 `heat.matchGame` 的 fuzzy 路線**——管錢的地方不該靠子字串命中（`roulette` 之所以能 fuzzy 命中 `european-roulette` 是巧合，反向的 `dice` vs `dice-duel` 就會誤中）。
      ② **四個「沒有對應遊戲」的鍵**（對戰／賞金局 ×2／跟注）要在別名表裡明訂 **type**，不是留 `unknown`：跟注＝`live`、對戰與賞金局＝`special`（建議值，需一併確認這是不是船長想要的流水待遇）。
      ③ **兩個引擎後備 `opts.game || "instant"`／`|| "table"`**（`core/instant.js:109`／`core/table.js:86`）：它們是「呼叫端漏傳 game 時靜默吸收」的同一形制（＝2026-08-29 `bonus.add` source 那條教訓）。建議改為**開發期可見**（漏傳時 console.warn 或在自我檢測裡紅），但**不要改成 throw**（會讓一個命名疏漏變成遊戲不能玩）。
    - **首屏成本（阻塞事實·開卡時已寫進卡）**：`core/wager-scope.js` 是 **index.html 首屏 eager**，而 [P-FS] 餘裕 **27 bytes** ⇒ ① 的引擎側改動**必須排在 #118 之後**。①的**別名表本身**若放 `data/` 也仍是首屏（`data/` 都在 index.html 裡）⇒ **整張卡都在 #118 閘上**，這一點不要在實作輪重新發現。
    - **驗收（不變量 · 每條都要有負向擾動）**：(a) 別名表為空時，`weightFor` 對全部 29 個結算詞彙鍵的回傳值與 HEAD 版**逐格相同**（零回歸，比照 #94 的 504 格逐格比對）；(b) 別名表填滿後 `settleVocab().unresolved` 為 **0**，且 `platform/settle-vocab-scoped-bonus-interlock` 的基線防腐斷言會**要求把 7 筆移出基線**（＝棘輪往下走到底，鎖自動釋放）；(c) `standard` preset 對旗艦 slot 的權重必須是 **1**（不是 0、也不是 `rest`）——這條是本卡的存在理由，要有專屬測項；(d) 別名表**不得**變成第二份遊戲清單（只許存 `結算鍵 → id|type`，不得出現 title/thumb/rtp 等欄位；反向鎖擋住往後偷加，比照 #94 側表刻意不收 `rtp`）。
    - 🚧 **反重複界線（開卡前已對既有層做反向搜尋）**：
      (a) **不是 #89 本身**——#89 建的是「範圍軸這個機制」（`PRESETS`／`weightFor`／權重夾取），已完成且測項齊備；本卡修的是**餵進那個機制的鍵解析不出來**。
      (b) **不是 `platform/central-hook-game-arg-consumed` 的雙胞胎**——那條問「下游有沒有讀 game」（今天綠），本卡問「讀到的值查不查得到」（第三層）。
      (c) **不是 #98 的雙胞胎**——#98 是「讓 `gameInfoBar` 的 rtp 可列舉」（把顯示字串變成可查詢的值），本卡是「把兩套遊戲識別詞彙接起來」。兩張都在講「第二份真相」，但一個是 **RTP 這個值**、一個是 **遊戲這個鍵**。
      (d) **不是 `HL.edge` 的問題**——`core/edge.js:55` 的 EDGE 表用的是**結算詞彙**（`"roulette": 2.70`），與呼叫端一致 ⇒ 它自己那套是**內部自洽**的，本卡不動它（動它反而會把一個正常的消費端弄壞）。

155. ⬜待批准 **莊家優勢有兩份真相，它們從不打架、只會缺席——而缺席那一格的返水會靜默退回舊制** — M（①段**動首屏 `core/edge.js`**＝卡在 #118；②段依賴 #154；③段可獨立先做）
    - **一句話**：全站有兩處都寫著「這款遊戲的莊家優勢是多少」——`data/game-rtp.js`（#98/#103 的權威 RTP 登記表，`edgeOf()`＝100−RTP）與 `core/edge.js` 的 `EDGE`（**管錢那一份**：#50 的 VIP/賽季加權基準 + #60 的返水計價基準）。本輪實測**交集 12 筆逐位相同**，所以它們從來不會「打架」；但**缺席不會被任何人看見**，因為 `edgeOf()` 查不到就靜默退化（加權 1.00×、返水回舊制）。
    - **它真的漏過一次（本輪查獲、已當輪修掉）**：`moles`（2026-08-21 上架、保真閘**解析證明** RTP 恰 98.0000%、當天就登記進 `game-rtp.js`）**從未進 EDGE 表**，漏了 11 天。
      · 進度面：每注 VIP／賽季經驗拿 **1.00×** 而非 **1.23×**（假站）＝比**莊家優勢完全相同（2.00%）**的 `pump` 少約 **19%**。這是玩家可觀測、可重現的不一致。
      · 金錢面：返水**退回 #60 之前的「押注額基準」**。moles 這次損害小（假站頂階舊制 1.8% ÷ 理論莊收 2.0% ＝ **90%**，正確值 87.5%）——**但那是運氣不是設計**，因為 moles 的 edge 恰好貼近校準均值 2.0613%。同樣的漏登記若發生在 **1.00% edge 的 originals 家族**（dice/limbo/mines/…），假站頂階會吐回理論莊收的 **180%＝每注淨虧**，而 180% 這個數字正是 `rakeback-core.js` 檔頭親口寫下、宣稱已被「型別安全」根除的那一個。
    - ⭐ **形狀（值得單獨記住）＝不變量被恢復了，但它的逃生門沒有守衛**。#60 把「返水 ≤ 該注理論莊家收入」做成數學恆真，代價是留了一條「未登記 ⇒ 退回舊制」的退化路徑（刻意的：漏登記只退化、不懲罰玩家）。**那條路徑本身沒錯，錯在沒有任何東西保證『已經知道 edge 的遊戲不會走上去』。** 這是 CLAUDE.md §4「修一半而看不出來」的第 6 變形：**修好的是主幹，沒守的是它自己留的後路。**
    - ⭐ **為什麼 08:00 窗剛看過這裡卻沒看到**：#154 的卡上第 (d) 條反重複界線明寫「**不是 `HL.edge` 的問題**——EDGE 表用的是結算詞彙，與呼叫端一致 ⇒ 內部自洽」。**那句話在它問的那個問題上完全正確**（鍵確實對得上），但它問的是「**鍵有沒有對上**」，沒問「**表有沒有蓋滿**」。⇒ 開卡時寫下的「不是 X 的問題」只對**當時問的那個維度**成立，不是對 X 的全面免責。
    - 🔒 **已落地（09-01 14:00 窗，零首屏成本以外淨 −99 bytes）**：① EDGE 補 `"moles": 2.00`；② 重跑 #60 校準（EDGE 22→23 款、均值 2.0613→**2.0586** ⇒ 假站段位4 返還比例 0.680→**0.681** 才守得住「總成本零退步」；真站五段仍全數 ≤ 舊成本，不動）；③ 常駐鎖 `platform/edge-table-covers-rtp-registry`（負向擾動 10/10 CAUGHT）。
    - **本卡剩下的範圍（三段）**：
      ① **收斂成一份真相**（M·**卡 #118**）：讓 `EDGE` 由 `HL.gameRtp` 推導而非平行維護——12 筆重複值一次消掉，未來上架新遊戲只要登記 RTP 就自動有 edge。⚠️ 阻塞事實：`core/edge.js` 與 `data/game-rtp.js` **都是首屏 eager**，且推導需要載入序保證（`game-rtp.js` 目前排在 `edge.js` 之後 → 要嘛調序、要嘛改成延遲求值）。桌遊 6 款（每注型 edge，game-rtp 刻意不登記）與參數化的 plinko 必須維持可手寫覆寫。
      ② **7 個查不到 EDGE 的結算詞彙鍵**（依賴 **#154**）：`Slots Battle`／`賞金局 · 翻牌`／`賞金局 · 踩地雷`／`跟注·百家樂`／`小雞過馬路`／`暗影儀式` 六個是 #154 的顯示名型（以正式 id 登記進 EDGE 也永遠查不到，等於自我安慰）＋ `moles`（本輪已修）。⇒ **#154 的別名表落地後，本段才有意義**；屆時 chicken（game-rtp 已有解析上界 97%）可一併脫離豁免。`bounty` 的 edge＝0 是設計恆等式，「0 edge 要不要發返水」是產品決策，需你裁決。
      ③ **未登記名單要對玩家可見**（S·可獨立先做·`core/edge.js` 已有 `HL.support.register` 條目）：現在說明條目只寫「已登記遊戲數 N 款」，玩家看不到**哪些沒登記**——而沒登記正是返水計價會退化的那一格。
    - **驗收（每條都要有負向擾動）**：(a) 收斂後 23 款的 `edgeOf()` 回傳值與 HEAD **逐格相同**（零回歸錨）；(b) 拔掉 `HL.gameRtp` 後 EDGE 不得仍有數值（＝證明真的是推導不是副本）；(c) 桌遊 6 款與 plinko 的手寫值不得被推導覆蓋；(d) 新增一款只登記 RTP、不碰 edge.js，`weightFor()` 與 `rakeback` 兩條路必須立刻拿到正確值。
    - **來源**：platform-modules 台帳「功能／VIP·等級·返水」09-01 14:00 窗輪替審 + 「中央結算掛鉤」的第二個消費端交叉。

156. ⬜待批准 **百家樂三條衍生路：大眼仔／小路／曱甴路** — M（遊戲軌·lazy `table-baccarat.js`＝零首屏；接續 #5 的珠盤路＋大路）
    - **一句話**：#5（2026-09-01 16:00 遊戲軌）已把百家樂從「單排 18 顆 flat bead」升級成 **珠盤路＋大路** 兩條 canonical 路（純函式 `beadPlate`／`bigRoad`、node 契約鎖 `games/baccarat/roadmap-derivation`、負向擾動全 CAUGHT）。賭場標準記分板還有三條**由大路推導**的衍生路：大眼仔（大眼路）、小路、曱甴路（小強路），本卡補齊。
    - **為什麼 #5 當輪刻意不做**：衍生路的紅/藍判定規則細緻（依「新開行時比左方兩行等高否／同行往下時比左一行同列有無」），且**沒有可信的 oracle 可比對**——自撰一套演算法再自寫「期望值」去鎖，等於把可能錯的演算法鎖成「正確」（§4：說謊的路單比沒有路單更糟）。故 #5 只落地兩條可由第一性原理 node 驗證的路，衍生路獨立成卡，實作前**須先取得一份可信參考序列**（如公開賭場記分板範例逐格對照，或交叉兩份獨立實作），再據以寫 node 契約。
    - **實作要點**：衍生路的來源是**大路的行結構**（非原始 P/B 序列）；三條路各自的「起點錨」不同（大眼仔自大路第 2 行、小路第 3 行、曱甴路第 4 行）、每格紅/藍。渲染複用 #5 的 `roadmap()` 網格骨架（inline style·零首屏 CSS），加三個小格 sub-grid。
    - **驗收（每條都要有負向擾動）**：(a) 三條衍生路的 `derive(bigRoadCols)` 對一份**可信參考序列**逐格紅/藍相同（無 oracle 不得上線）；(b) 衍生自大路而非原序列（拔掉大路輸入即空）；(c) 珠盤路／大路（#5）逐格不變（零回歸錨）。
    - **來源**：game-feel-audit #5（medium/CONFIRMED/L）拆分；#5 落地時保留的後續。

157. ⬜待批准 **活動可得性述詞 `drivable()`：日曆問的是「模組在不在」，不是「這個活動在這個站別跑不跑得起來」** — S（動首屏 `core/promo-cal.js` ⇒ **卡在 #118**；[P-FS] 餘裕 8 bytes）
    - **一句話**：`core/promo-cal.js` 的 `evalSpec()` 用 `avail` 決定上架，檔內註解寫的是「模組未載入/未啟用＝不上架」——**它問的是「這支模組在不在」**。在假站這兩件事永遠同義，所以七個 spec 有六個從來不需要分辨；rain 是第一個把它們分開的（模組在、機制不在）⇒ 讓 spec 可選宣告 `drivable()`，把「這個活動在這個站別跑不跑得起來」變成一等公民。
    - **為什麼現在開（三次各自手寫＝該抽了）**：同一個問題已經被三個模組各自回答過一次，三種寫法：
      · `core/challenges.js:261` 的註解「真站無仲裁者時 `specs()` 自然為空 ⇒ 日曆同步不顯示，**不需要第二套判斷**」＝靠**資料恰好為空**；
      · `core/referral.js:51` 的 `rewardsEnabled()`＝`!isLive() || !!ATTESTOR`＝**已經是述詞了，但寫在自己家、沒有出口給日曆**；
      · `core/promo-cal.js` 的 rain（2026-09-01 20:00 窗本輪修的那一格）＝**在 `avail` 裡手寫一個 `isLive`**。
      ⇒ 第四個一定會來（#136 遊戲內活動掛件落地時會**再問一次**同一個問題：一個在此站別跑不起來的活動，掛件同樣不該宣告它）。
    - **出口形狀（容器先於內容）**：spec 可選 `drivable: function () { … }`；`evalSpec()` 在 `avail` 之後、`audienceOk` 之前問它；**未宣告＝恆真＝零回歸**（比照 `audience`／`optIn` 兩次加維度的既定做法）。`referral.js` 的 `setAttestor` 容器是現成範本，**不得另立第二套**。
    - **順帶收斂**：本輪 rain 的 `avail` 內嵌 `isLive` 是**權宜**（首屏餘裕只夠 139 bytes）；#157 落地時要把它改宣告成 `drivable`，讓站別判斷只留在一個地方。
    - **驗收（每條都要有負向擾動）**：(a) 全部既有 spec 未宣告 `drivable` 時，`list()` 的輸出與 HEAD 版**逐格相同**（零回歸錨）；(b) 宣告 `drivable` 回 false 者**整則不出現**而非灰掉（沿用 #107 既定語意）；(c) `drivable` 拋例外時 fail-closed＝當作不可得（比照 `audienceOk` 的 fail-closed，寧可少顯示也不要預告拿不到的獎）；(d) 現有常駐鎖 `platform/promo-cal-hides-undrivable` 的差集棘輪 `["rain"]` 在改用述詞後**仍須逐位成立**（＝這次不是換一種方式壞掉）。
    - 🚧 **反重複界線**：(a) **不是 #107 的雙胞胎**——#107 問「這則活動**給誰**看」（受眾，述詞向 `HL.release.AUDIENCES` 求），本卡問「這則活動**在這個站別**發不發生得了」（可得性，述詞向自己的模組求）。兩者正交：受眾符合但機制跑不起來，仍然不該上架。(b) **不是 #52 opt-in 的雙胞胎**——opt-in 是「玩家要不要參加」，本卡是「平台這邊供不供應」。(c) **不是 `HL.site` 的第二份真相**——站別真相仍只有 `HL.site` 一份，本卡只是給各模組一個把自己的結論交出來的出口。
    - **首屏成本（阻塞事實·開卡時已寫進卡）**：`core/promo-cal.js` 是 index.html **首屏 eager**，而 [P-FS] 落地後餘裕僅 **8 bytes** ⇒ **必須排在 #118 之後**。
    - **來源**：platform-modules 台帳「活動/促銷活動框架」partial + 「活動/抽獎·Raffle·Rain」2026-09-01 20:00 窗查獲的 rain 缺陷（同輪已修＋已上鎖）+ challenges/referral 兩處既有的同型自製述詞。

158. ⬜待批准 **下注前置閘只有 25 個手寫呼叫點，而記帳只有 1 個中央點——於是漏閘的表面「算得到卻擋不住」，每個讀數都正確** — M（新增出口動首屏 ⇒ **卡在 #118**；[P-FS] 落地後餘裕 14 bytes）
    - **一句話**：全站「這一注要不要記帳」有**唯一**入口（`core/live-stats.js:58` 的中央結算點尾端 `HL.rg.record(bet, win)`），但「這一注**允不允許**」是 **25 個各自手寫的 `HL.rg.check()`**。⇒ 新增一個會扣錢的表面時，**忘記記帳是不可能的（會自己壞給你看），忘記裝閘卻毫無症狀**——因為那一注照樣被算進今日已用額度、面板數字完全正確。**把「允不允許」也收斂成一個出口。**
    - **為什麼現在開（不是假想，2026-09-02 剛被咬過一次）**：`layout/streamer.js` 的子母畫面(PiP)跟注真扣真派真記帳、卻不問 `HL.rg`，玩家**自我排除進行中照樣跟得下去**；而通往它的按鈕就在整頁直播間**那顆已被擋住的跟注鈕旁邊**。當輪已補閘＋擴大覆蓋率鎖的量程（見分析師日誌 09-02 08:00 窗），**但那是「把第 26 個表面補進尺裡」，不是「讓第 27 個表面不可能漏」**。
    - **出口形狀（容器先於內容·此為本卡重點）**：提供 `HL.bet.attempt(game, amount, opts)` 作為**下注側的中央前置點**，回 `true/false`：內部依序問 `HL.rg.check` →（未來）`HL.wagerScope` 可用範圍 → 站別／房間規則，任一否決即回 false 並由被否決者自行 toast。**現有 25 個呼叫點逐一改為委派**（一次一個、每個都要零回歸錨）。**未接線者行為逐位不變**（比照 #70 `axis`／#89 未宣告零回歸的既定相容契約）。
    - **為什麼不能把閘掛在中央結算點**（先寫下來，免得後手重新發現）：`liveStats.record` 跑在**結算時**，錢**早就扣掉了**——那裡能記帳、不能否決。⇒ 前置點必須是**另一個**中央出口，這正是本卡要建的容器。
    - **驗收（每條都要有負向擾動）**：(a) 25 個呼叫點全數改完後，未設任何限額時全站每一款遊戲的扣款行為與 HEAD 逐位相同（零回歸錨）；(b) 任一呼叫點改回直接呼 `HL.rg.check` 而繞過 `HL.bet.attempt` 時，常駐鎖必須紅（**反向錨：不得有第二條路**）；(c) 新增一個**故意不裝閘**的假表面時，`platform/rg-bet-gate-coverage` 必須紅（該鎖已於 09-02 擴成全 `src/` 量程，本條驗它沒退化）；(d) `HL.bet.attempt` 拋例外時 **fail-closed＝視為不允許**（玩家保護寧可誤擋不可誤放，與 `promo-cal` 的 `audienceOk` 同紀律）。
    - 🚧 **反重複界線**：(a) **不是 #150 的雙胞胎**——#150 是「產品範圍型自我排除」（只關掉一類遊戲），問的是**限額的表達能力**；本卡問的是**限額的執行點有幾個**。#150 落地後反而更需要本卡（範圍判斷若也逐點手寫，就是 25 份新的漏網機會）。(b) **不是 #89 `HL.wagerScope` 的雙胞胎**——#89 是紅利流水的**加權**（結算後算貢獻），本卡是下注前的**否決**。(c) **不是 `HL.rg` 的第二份真相**——限額規則仍只有 `core/responsible.js` 一份，本卡只是把「誰該去問它」從 25 處收成 1 處。
    - **首屏成本（阻塞事實·開卡時已寫進卡）**：新出口若獨立成檔即多一支首屏 `<script>`；掛進既有 eager 檔亦需位元組。**[P-FS] 09-02 落地後餘裕 14 bytes** ⇒ **必須排在 #118 之後**（與 #155／#154①／#157 同一個閘）。
    - **來源**：platform-modules 台帳「資安/負責任博弈」2026-09-02 08:00 窗查獲的 PiP 跟注漏閘（同輪已修＋已上兩道鎖）+ 取材對照（Mega Dice ＝工具存在但不被強制執行／Thrill ＝工具不存在；BBC 2019 記錄的自我排除繞道）。

159. ⬜待批准 **匯出的檔案說不出自己是什麼——真站與假站的同一張報表，檔名逐字相同、表頭逐字相同** — S（`core/reports.js` 首屏 eager，但 #160 若先落地即有充裕餘裕；亦可淨零落地）
    - **一句話**：`HL.reports.register()` 的 `def.file = "apexwin-" + def.id + ".csv"` 是**恆定檔名**，不帶站別／涵蓋期間／擷取時刻；`HL.site` 的資料隔離只做到 localStorage 命名空間前綴，**沒做到「離開瀏覽器之後」**。
    - **玩家看得到的後果（不是假想）**：真站（`live`）與假站（`demo`）的經濟/注單是**平行宇宙**（CLAUDE.md §4），但同一張報表匯出的兩個檔**檔名逐字相同（`apexwin-betlog.csv`）、表頭逐字相同、內容格式逐字相同**
      ⇒ 落到下載夾就變成 `apexwin-betlog.csv` 與 `apexwin-betlog (1).csv`，**再也分不出哪個是真錢那一份**。同理連續兩天各匯一次也分不出先後。
    - **出口形狀（容器先於內容·此為本卡重點）**：`register()` 增一個**選用**的檔案身分述詞，並讓**唯一匯出原語** `saveText()` 成為檔名的單一真相——
      不要在每張報表各自拼檔名（那就是第二份真相）。建議欄位：`period()`（回傳這張報表實際涵蓋的期間，未知回 `null`＝據實說不知道，不得假裝全量）；
      站別與擷取時刻由 `saveText()` 統一從 `HL.site.mode()` 與呼叫時刻取（呼叫端不得覆寫）。
    - **兩個表面要同時吃到**（否則就是本輪剛踩過的「修一半」）：`reports.js` 中心頁與 `betlog.js` 注單面板都走 `HL.reports.download` ⇒ 檔名改在原語上，兩邊自動一致；
      常駐鎖 `platform/reports-error-not-empty` 已內建「數 download 消費者 ≥2 且全數覆蓋」的量程錨，落地時沿用它加斷言即可。
    - **⭐ 順帶關掉 08-31 記下的那條「表面說謊」**：中心頁頁尾寫死 `僅顯示前 200 列；匯出為全部資料。`，而兩個玩家側來源分別被 `betlog.CAP=500`／`activity.KEEP_DAYS=90` 截斷
      ⇒ 有了 `period()` 之後那句話可以據實改寫，且**保留上界已經可查詢**（08-31 立的 `platform/retention-bound-queryable` 保證 `CAP`／`KEEP_DAYS` 經公開出口轉發同一個識別字）⇒ **本卡不必也不得再抄一次 500／90**。
    - **驗收（每條都要有負向擾動）**：(a) 只切 `HL_SITE_MODE` 一顆旋鈕，同一張報表匯出的檔名必須不同；(b) `period()` 未提供時檔名/抬頭**不得**出現任何期間字樣（據實說不知道，不是填今天）；
      (c) 呼叫端試圖覆寫站別欄位必須無效；(d) 反向錨：拿掉 `saveText` 的單一真相、改回各報表自拼檔名時必須有測項轉紅。
    - 🚧 **反重複界線**：(a) **不是 #151 的雙胞胎**——#151 要的是**期間軸（能不能按一段時間去問）**，本卡要的是**檔案的身分（拿走的那份說不說得出自己是什麼）**；
      兩者相鄰但可獨立落地，且 #151 落地後正好把 `period()` 從 `null` 變成有值 ⇒ **本卡刻意設計成「#151 不做也能落地」**。
      (b) **不是 #138 的雙胞胎**——#138 是「這台裝置上存了什麼」（清冊+清除），本卡是「已經被帶出去的那些檔」；但兩張卡共用同一個出口，故 #138 的清冊落地時應直接讀本卡的述詞（已寫進 #138 的台帳格）。
    - **來源**：sourcing-methods 新增維度 9「玩家資料自主權／可攜性」（2026-09-02 平台軌補上·36 份 dossier 真實命中數 0）＋ platform-modules 台帳「資料/報表與匯出」2026-09-02 14:00 窗查獲 ＋ 外部形制對照（Stake 逐頁各一顆 Export CSV、注單另一套 JSON archive ⇒ 標竿站亦無「一份對帳單」）。

160. ⬜待批准 **首屏有 14.3KB 是同一句中文被打了兩遍——而首屏餘裕只剩 14 bytes，四張卡因此排在 #118 後面** — M（純機械折疊，零行為改變；**落地後首屏餘裕 14B → 約 14.6KB**）
    - **一句話**：本站 i18n 的 key 就是畫面上的中文（CLAUDE.md §4），所以各檔的 `t(k, d)` 幾乎每個呼叫點都寫成 `t("某句中文", "某句中文")`——**第二個引數是第一個引數的逐字拷貝**。
    - **機械量測（2026-09-02 14:00 窗，可複跑）**：首屏 90 支 eager script 中，兩引數**逐字相同**的呼叫點 **479 個、散 28 支檔、合計 14,659 bytes（14.3KB）**。
      前六名：`referral.js` 35 站/1269B、`responsible.js` 41 站/1228B、`promo-cal.js` 43 站/903B、`challenges.js` 24 站/801B、`rewards.js` 26 站/791B、`betlog.js` 20 站/772B。
    - **⭐ 為什麼這是本佇列現在最高槓桿的一張卡**：首屏預算門檻 1600KB，進場實測 **1638386/1638400＝餘裕 14 bytes**（連一個中文字都放不下，3 bytes 一個字）。
      #118（首屏 code-splitting）之所以成為 #155／#154①／#157／#158 四張卡的事實前置，就是這 14 bytes。**本卡回收的量是那個餘裕的 1000 倍以上，且不需要任何 preview 目視回歸**（純字面折疊、不搬檔、不改載入序）
      ⇒ **它可以在 headless 輪安全落地，而 #118 不行**（搬 eager→lazy 的視覺回歸驗不到）。⇒ 建議排序：**本卡 → 那四張 → #118**（#118 仍該做，但不再是唯一解法）。
    - **落地形狀**：逐檔把該檔的本地 helper 從 `function t(k, d) { return HL.i18n ? HL.i18n.t(k, d) : d; }` 改為 `function t(k) { return HL.i18n ? HL.i18n.t(k, k) : k; }`，並折疊該檔所有兩引數逐字相同的呼叫點。
      **語意逐位相同**：`HL.i18n.t(k, d)` 的 `d` 是「字典查不到時的預設」，而 `d === k` 時兩者無法區分；無 i18n 分支原本回 `d`，現回 `k`（同一個值）。
    - 🔴 **不得動的那一族（本卡最重要的界線）**：`t(<非中文 key>, <中文 fallback>)` 是**合法且有鎖在管的**形態（`platform/i18n-fallback-ratchet`／#129）。
      首屏實測有 **17 個** `k ≠ d` 的呼叫點 ⇒ **折疊條件必須是「兩引數位元組逐字相同」，不是「有兩個引數」**。動到那 17 個會靜默改變 fallback 語意。
    - **驗收（每條都要有負向擾動）**：(a) 折疊前後 `node prototype/tests/run.js` 全綠，且**五面 i18n 棘輪逐項不退**（key/DOM/資料/屬性/fallback）；
      (b) 立一條常駐鎖：首屏 eager 檔中「兩引數逐字相同」的 `t()` 呼叫點數必須為 **0**（棘輪，防新檔又打兩遍）；
      (c) **反向錨**（否則 (b) 是一把只會往一個方向走的尺）：`k ≠ d` 的合法呼叫點數必須 **> 0** 且該族仍被 #129 的棘輪覆蓋——若有人把折疊寫成「刪掉所有第二引數」，這條必須轉紅；
      (d) 首屏位元組必須**實際下降 ≥14KB**（把量測寫成斷言，否則「折疊了但沒省到」看不出來）。
    - 🚧 **反重複界線**：**不是 #118 的雙胞胎也不是它的替代**——#118 是**把檔搬出首屏**（結構性、需視覺回歸驗證），本卡是**在原地移除重複位元組**（機械性、headless 可驗）。
      兩者相加才是首屏預算的完整解；本卡只是把「現在什麼都做不了」變成「小修做得動」。
    - 🔴 **落地前置（2026-09-02 20:00 窗實測補上·本卡最重要的新事實）：折疊回收的那 479 個呼叫點，正好是另一條鎖的「量程」本身。**
      `tests/i18n-key-scan.js` 是五面 i18n 鎖的單一真相，而它的**盤存清單就是 `t("中文")` 呼叫點**（檔頭「承認的呼叫形狀」）。
      實測（可複跑）：掃描器基線 **sites 499／keys 363／gaps 0**；本輪拿 `core/edge.js` 真的折疊它的 8 個同引數呼叫點 ⇒
      **sites 499→491、keys 363→355、gaps 仍 0、全套仍 GREEN** ⇒ **小批折疊會靜默縮短那把尺，且沒有任何測項會出聲**。
      而 `platform/i18n-key-ratchet` 的反向錨要求 `sites >= 350`／`keys >= 240` ⇒ **全 src 479 個全折疊後 sites 只剩約 20**，那條錨會轉紅。
      ⇒ 本卡原訂的驗收 (b)（「同引數呼叫點數必須為 0」的棘輪）與既有的 `i18n-key-ratchet` **方向相反、無法同時滿足**：
      前者要求折到 0，後者要求盤存 ≥350。**這不是把哪一條調鬆就好**——真正的問題是「一句畫面中文該不該有翻譯」這件事，
      現在**只能由 `t()` 包裹來表達**；折疊掉包裹，就等於把 i18n 覆蓋率的尺從 499 條縮到 20 條，
      **未來任何未翻譯的新表面都會落在尺外**（正是 #119 建這把尺要根除的那個形狀）。
    - **⇒ 據此本卡的可行路線收斂為三條（需船長裁決選哪條，原卡把它寫成「純機械、零風險」是低估了）**：
      **(a) 不折疊**，首屏位元組另尋來源——本輪已證實**第二種回收法可行且不動任何量程**：把「遷移考古」型註解壓成
      「行為契約＋刻意保留原地的例外清單」，`core/dom.js`＋`layout/dock.js` 兩檔就回收 **~800B**（本輪修法 +1226B 全額自付、還淨賺 45B）。
      **(b) 折疊 ＋ 同時把掃描器的盤存改成認「畫面中文字面量」而不是認 `t()` 呼叫點**——這才是能同時成立的解，
      但它改變「什麼算一條 key」的定義、要重量五面基線，工作量由 M 升為 **L**，且**不再是 headless 零風險的機械改動**。
      **(c) 只折疊「該檔所有 key 都已證實有 EN+zh-Hans 翻譯」者，並把反向錨的下限依折疊後盤存重新推導**（折一批就要重推一次）——
      成本最低但**每次折疊都在削尺**，與 #119 的立意相左，我不建議。
    - **來源**：2026-09-02 14:00 窗在 `core/reports.js` 修缺陷時**為了付得起修法成本**而就地回收（該檔 12+3 個呼叫點回收 629B，使本輪修法的首屏淨成本為 **0**——首屏逐位不變 1638386B），順手做了全首屏量測。

161. ⬜待批准 **可停靠面板底座沒有「重設佈局」——而它是全站唯一會把座標存下來的地方（本輪剛修掉存下的座標會把面板送出畫面）** — S（出口可完全落在 `layout/dock.js` 內＝**不撞 #118**；若改掛個人抽屜就會撞） — 來源：**platform-modules 台帳「擴充性」09-02 20:00 窗輪替自審（模組「模組化/可停靠佈局系統」partial）＋ 本輪修掉的 off-screen 缺陷 ＋ 跨業取材**
    - **一句話**：`HL.dock` 提供了 register／開／關／收合／桌機拖曳／**跨站持久佈局**，六項裡只有最後一項沒有「回到預設」的路——而它正是唯一會把狀態寫進 `ax:dock:v1` 的那一項。
    - **跨業取材（本輪唯一取到可用形制的來源；casino 側該軸為零信號）**：先搜 casino 側「可自訂佈局／重設」只回到 SEO 型泛文（可調音量/日夜主題/收藏排列），**無一家提供面板佈局重設** ⇒ 該軸不足以對標。
      改向「發明了 dockable 面板的那個行業」取材，形制清楚且一致：**Adobe（After Effects／Photoshop／Illustrator／Bridge）一律有 `Window > Workspace > Reset`**；
      **Altium Designer 的官方 KB 甚至專門記載了「面板被移到畫面外」這個失效模式**，並給出 `Preferences > View > Desktop > Reset` 與一套 Alt→Space→M→↑ 的救援按鍵儀式。
      ⇒ **「持久化的佈局會走到不可用的狀態」在成熟的 dockable 生態裡是已知事實，而成熟的答案是一顆 Reset，不是一套救援儀式。**
    - **本輪已經先修掉最嚴重的那一半（所以本卡是整理、不是救火）**：`platform/dock-restores-onscreen` 落地後，還原座標會夾進當前視窗
      ⇒ 面板**不會再整塊消失**。本卡要補的是剩下的三格：
      ① **重設佈局**（清掉該面板/全部面板的 `pos`+`collapsed`，回到自動堆疊）；
      ② **孤兒條目**：`layout` 物件以 id 為鍵累積，**面板改名/下架後那筆永遠留著**（現況 3 個註冊者，`ax:dock:v1` 卻可能存著任意多筆），且無上界、玩家看不到、也清不掉；
      ③ 折疊/座標偏好目前**跨真假站共用**（刻意，比照語言/側欄），重設也應同時對兩站生效——這一條要寫進卡以免實作輪誤加站別前綴。
    - **落地形狀（刻意不新增首屏檔）**：出口放在**面板自己的標題列**（`dock.js` 的 `head` 已有收合/關閉兩顆鈕）或 `HL.dock` 的 API + 既有成長面板內一列；
      **不要**掛 `layout/app-shell.js` 個人抽屜——那是首屏檔，會把一張 S 卡變成卡在 #118 的第 N 張（#125／#127／#128／#137／#138 都在那個閘上）。
    - **驗收（負向擾動比照本輪）**：(a) 重設後 `ax:dock:v1` 內該面板的 `pos`/`collapsed` 真的消失、且面板回到自動堆疊（`right` 有值、`left` 為空）；
      (b) 孤兒條目：註冊表中不存在的 id 不得無限累積（存檔筆數 ≤ 註冊者數，或重設時一併清）；
      (c) 反向錨：重設**不得**順手清掉別的面板或別的偏好（語言/側欄/收藏不在 `ax:dock:v1` 內，動到它們要轉紅）；
      (d) 本輪 `platform/dock-restores-onscreen` 的 (e) 條（不得回寫玩家擺放）必須仍綠——重設是玩家明示要求，夾取不是。

162. ✅完成 **大廳頁籤上印著「桌上遊戲」，玩家把那四個字打進搜尋框，得到「找不到符合的遊戲」** — S　`(2026-09-03 平台軌·08:00 窗)` — 來源：**platform-modules 台帳「前端UI/UX」09-03 08:00 窗輪替自審（模組「大廳/遊戲牆」present、「大廳分群軸」partial）＋ 本輪新開的「搜尋與發現」維度**
    - **一句話**：`views/casino.js` 的篩選述詞 `matchFilter` 是**登記表驅動**的（檔內自述「加一條軸不必回來改這裡」），而它的雙胞胎搜尋述詞卻硬寫死 `title`／`provider`／`author` 三個欄位 ⇒ **入口列印一套字、搜尋認另一套欄位**。
    - **修前實測（可複跑）**：15/15 個「進得去的入口」的標籤打進搜尋框都是 **0 款**——六個分類名（Originals／老虎機／真人娛樂／桌上遊戲／累積彩金／遊戲節目）、五條體感桶名、♥ 收藏／熱門／最新，以及兩個軸名。**而那些字全部是我們自己印在畫面上的。**
    - ⭐ **為什麼它會自己長大**：`data/game-traits.js` 每加一條軸，頁籤列就多一個入口、死巷就多一條——而加軸的人**完全不會經過 `casino.js`**（那正是 #94 容器化的成果）。⇒ 這不是一次性的疏漏，是一台**每次擴充都會多生一條死巷**的機器。
    - **修法**：入口列抽成單一份 `browseTabs()`＋只以區塊標題存在的 `offTabEntries()`（判準是「`setFilter` 進得去嗎」，不是「有沒有頁籤」）；搜尋的乾草堆改由 `allEntries()` **反推**「這款遊戲屬於哪些入口」。⇒ **頁籤列與搜尋共讀一份**，新軸自動可搜。
    - **順帶修掉第二面（差點漏掉的那一半）**：`HL.i18n.t` 是相容 passthrough（直接回 def），翻譯由 i18n 的 DOM 層在文字節點上做 ⇒ 程式裡的標籤**永遠是 zh-Hant**，而英文/簡體玩家看到的是譯文。只補 zh-Hant＝**死巷只修掉最不需要修的那一種語言**。已補當前語言的譯文（字典查不到者本來就顯示原文、已被涵蓋）。
    - **成本**：`views/casino.js` 自 #112 起就在**延遲載入清單**上 ⇒ **首屏零位元組**（落地後仍 1638341B／91 scripts／餘裕 59B，與進場逐位相同）。⇒ 本卡是**不撞 #118** 的那一類，與 #157／#158／#159／#160 不同閘。
    - **常駐鎖** `platform/lobby-search-knows-its-own-tabs`（八條錨：逐入口掃描／軸名／英文面／述詞不得恆真／原三欄不得退化／入口數量程錨／入口列只准一份建構處／結果牆必須呼叫同一個述詞）。**負向擾動 11/11 CAUGHT。**
    - ⚠️ **鎖的首版自己就是「修一半」**（記在這裡當第七例）：首版留了一個 `matchQ(g)` 包裝順手讀畫面狀態，而鎖問的是無狀態的 `matchesQuery` ⇒ 擾動①「把包裝改回硬寫三欄」時**玩家的搜尋壞回去了、鎖依然全綠**。處置是**拿掉第二份述詞**（不是把鎖改鬆），並補「全檔只准一處文字比對」＋「結果牆必須呼叫本述詞」兩條錨。

163. ⬜待批准 **搜尋沒有結果時只給一句「找不到符合的遊戲。」，然後就沒有路了** — S（出口完全落在延遲載入的 `views/casino.js` 內＝**不撞 #118**） — 來源：**同上輪台帳自審（「搜尋與發現」維度新開）＋ #162 實作當輪查獲**
    - **一句話**：`renderContent()` 的零結果分支是一個 `<p class="ax-muted">`。玩家打錯字、或搜一款我們沒有的遊戲（3,000+ 款的對手站上有、我們 25 款沒有），畫面就停在那裡——**沒有清除搜尋的鈕、沒有「你是不是想找」、沒有退回瀏覽的路**，而搜尋框上方的頁籤列此時仍顯示著「全部」為未選中。
    - **為什麼值得單獨一張卡而不是併進 #162**：#162 修的是「**我們自己印的字要搜得到**」——那是一條可以機械證明的不變量（已成鎖）。空結果出口修的是「**搜不到時該怎麼辦**」，那是設計問題（要不要模糊比對？要不要推薦？推薦誰？），兩者的驗收方式不同，硬併會讓 #162 那條鎖的口徑失焦。
    - **落地形狀（擴充性優先）**：零結果區做成**可註冊的「救援出口」表**（`{ id, when(query), render() }`），首批註冊者三個：① 清除搜尋回到瀏覽 ② 最接近的幾款（拿 `searchWords` 的乾草堆做編輯距離／子詞比對＝**沿用 #162 的同一份詞彙**，不另建一套） ③ 該關鍵詞若命中某個入口的名字就直接給那個入口的捷徑。
    - **反向要一起鎖**：救援出口**不得**在有結果時出現，且**不得**自己去問 `HL.games`（只准吃傳進來的結果集與 query）——否則它會變成第二個大廳。

164. ✅完成 **玩家點進遊戲，一次網路瞬斷就永久壞掉——畫面寫著「載入失敗，請稍後再試」，而「再試」這件事在程式裡不存在** — S（`core/lazy-load.js` + 兩個延遲容器，**淨 +31B**，常駐鎖放 `tests/`＝零首屏成本）　`(2026-09-03 平台軌·20:00 窗)` — 來源：**擴充性 / 首屏載入架構模組 · 本輪主動查缺陷**（本輪台帳輪替的分類是金流，且金流 6 模組零漂移 ⇒ 本卡不出自輪替分類）
    - **一句話**：`core/lazy-load.js` 的 `load()` 第二行是 `if (_state[src] === "error") return Promise.resolve(false);` ⇒ **一次注入失敗，那個 src 在本次 session 內永遠不會再發出任何請求**，即使網路下一秒就恢復。
    - **修前實測（假 document 沙箱實跑真檔，可複跑）**：第 1 次注入失敗後，第 2、3 次呼叫 `load()` 的 **injection 次數恆為 1**、回傳恆 false。玩家端的三條「重試」路徑全是假的：① 離開再進來（stubRender 的 error 分支直接 `return failNode()`，連 `load` 都不呼叫）② 再按一次入口（`stubMethod` 呼叫 `load` 但被短路，實測按 2 次 → **1 次請求、2 次「請稍後再試」toast**）③ `preload`/`loadAll` 同樣被短路。**唯一救法是整頁重新載入，而畫面上沒有任何地方這樣說。**
    - ⭐ **同一個缺陷的第二半（差點只修一半）**：**首次**失敗時 stubRender 的 `.then` 因 `if (!ok || …) return;` 什麼都不做 ⇒ 畫面停在「載入中…」**永遠不動**；那個**專為此情境寫好的失敗節點第一次根本上不了畫面**——要離開再回來才看得到，而那條路徑正好就是永不重試的那一條。⇒ 兩半合起來才是玩家看到的樣子：先永遠轉圈，再永遠「請稍後再試」。
    - **影響面**＝玩家真正要玩的那一塊全部在內：**23 款延遲遊戲**（20 支 src）+ **7 個延遲整頁 view**（casino 遊戲牆／tournament／chicken／globe／liveroom／bounty／vsslot）+ **1 個延遲 global**（opsBoard 營運儀表板）。手機 H5 + PWA 的使用情境下，瞬斷不是罕例。
    - ⭐ **為什麼它躲得住（§4「說謊的控件／修一半而看不出來」家族新一例）**：症狀長得像**不可控的環境問題**（「網路不好嘛」），而失敗節點的文案又完全合理 ⇒ 沒有人會去懷疑「重試」本身是假的。三軌歷來對這套容器的鎖全部在問「清單對不對／有沒有雙重註冊／首屏省了多少」，**沒有一條在問「失敗之後會怎樣」**。
    - **修法（首屏餘裕進場只有 48B ⇒ 刻意做成淨 +31B）**：① `load()` 不再快取 error（刪掉那行短路）＝每次呼叫都是一次真實嘗試；② 兩個容器的 `stubRender` 改成 `var failed = state === "error"`，畫面 `failed ? failNode : loadingNode`（**失敗畫面照樣重試一次**），`.then` 改成 `ok ? (沒換手成功) : failed` 才 return ⇒ **首次失敗會重繪一次讓失敗節點真的上畫面，已在失敗畫面時不重繪＝防迴圈**。行為結果：健康路徑 1 次請求；瞬斷一次 → **玩家什麼都沒按就自動救回真畫面**；永久斷線 → 一次進場恰 **2** 次嘗試後停手、畫面誠實；玩家再進場 → 再給一次機會。
    - **常駐鎖** `platform/lazy-load-failure-is-recoverable`（放 `tests/checks-platform.js`＝**零首屏成本**，故根因與紀律可以寫長）。七段斷言：(A) 正向對照（健康路徑只准 1 次注入且畫面必須換成真內容——**沒有它，下面的綠燈可能只是沙箱空轉**）／(B) 瞬斷自動救回／(C) 永久斷線**恰 2 次**＋畫面誠實／(D) error 態重新進場必須真的再發請求／(E) 清單寫錯（設定錯誤）不得變成重試／(F)(G) 遊戲容器是**另一份** stubRender ⇒ 重試、上限、誠實三條各自再守一次。
    - ⚠️ **沙箱的一個坑（寫測項的人請先讀）**：`selftest` 執行器是**同步**的（`run(t)` 的回傳值不被 await）⇒ **任何寫成 Promise 鏈的測項都會靜默假綠**。本鎖改用注入**同步 thenable** 進 `vm` context，並讓注入完成走一個明確 `drain()` 佇列，保留「render 先返回、之後才結算」的真實順序；`drain()` 自帶上限＝請求風暴的斷路器。
    - **負向擾動 9/10 CAUGHT（每例僅本鎖轉紅，還原後皆回 331/331）**：P1 還原 error 短路／P2 首次失敗不重繪／P3 失敗畫面改回轉圈／P4 拿掉迴圈防護（風暴）／P5 遊戲容器還原 error 早退／P6 view 容器 error 早退／P7 換手後不重繪（打 (A) 的鑑別力）／P9 遊戲容器失敗畫面改回轉圈／P10 遊戲容器拿掉迴圈防護。**P8 為 by-design MISSED**：把「清單寫錯」分支也改成呼叫 `load()`，而 `done` 態仍（正確地）被快取 ⇒ 那次呼叫是真 no-op、行為零變化，鎖不該叫。（P1/P5/P6 另外會連帶讓 `platform/first-screen-budget` 轉紅——純粹因為擾動文字本身佔位元組而餘裕只剩 17B，不是鎖重疊。）⭐ **P9 第一版實測 MISSED**，才補出 (G)：(F) 只證了遊戲容器「會重試 + 救得回來」，沒證「誠實」——**兩個容器的每一條性質都得各自守一次**，這正是 CLAUDE.md §4 那條「有沒有第二個消費者？」的自問生效。
    - **成本**：首屏 1638352 → **1638383／1638400（餘裕 48→17B，淨 +31B）**、90 支 script 不變；`node` 330 → **331 全綠**；`sw` v264→**v265**。
    - ⚠️ **順帶更正一個量測口徑（比修法本身更容易咬到下一輪）**：`platform/first-screen-budget` 量的是**磁碟位元組**，而本 repo `core.autocrlf=true` 且**無 `.gitattributes`** ⇒ 任何經 `git checkout` 還原的首屏檔在磁碟上會變成 CRLF、**每行 +1 byte**。本輪實測：`git checkout` 那三支延遲載入檔後，首屏由 1638352 變成 **1638429（超標 29B），而內容一位元組未改**。⇒ ① 用 `git checkout` 還原首屏檔後**必須把換行轉回 LF** 再量（CLAUDE.md §10.2 原本只記了 `core/fair.js`／`tests/checks-games.js` 兩支個案，其實這是**全 repo 的通則**）；② GitHub Pages 服務的是 git 裡的 LF 版本 ⇒ **LF 才是部署真值**。

165. ✅完成 **首屏預算尺一直在量一個部署上不存在的東西——它把工作區的換行符當成了程式碼，讓整個 backlog 以為自己被 17 bytes 卡住** — S（`tests/checks-platform.js` + 新增 `.gitattributes`，**首屏零成本**）　`(2026-09-04 平台軌 08:00 窗 · 同窗開卡+落地)`
    - **一句話**：`platform/first-screen-budget` 讀的是 `fs.statSync().size`＝**磁碟位元組**。而本機 `core.autocrlf=true` 且（本輪之前）repo **沒有 `.gitattributes`** ⇒ 任何經 `git checkout` 還原過的文字檔，在工作區會被寫成 CRLF、**每行多 1 byte**，而 git blob（＝GitHub Pages 服務的那份）仍是 LF。
    - **實測（進場當下，可複跑）**：首屏 94 個檔中有 **8 支**處於 CRLF——`index.html` +223／`data/mock-data.js` +2／`core/ui.js` +422／`core/live-stats.js` +144／`core/demo-tools.js` +121／`core/fair.js` +247／`views/lobby.js` +225／`views/arena.js` +721＝**共 1,683 bytes 的幽靈**。
      ⇒ 舊尺讀 **1,638,383（餘裕 17B）**，**部署真值是 1,636,700（餘裕 1,700B）**。也就是說餘裕被低估了 **100 倍**。
    - ⭐ **為什麼它比一般的量測誤差嚴重得多**：這個讀數是**排序依據**。#118／#155／#154①／#157／#158／#160 以及遊戲軌 [G-FS] 那一票，全都把「只剩 14–59 bytes」當成**事實前置**寫進卡裡，用來決定「這張卡 headless 輪不能做」「要不要讓路」。⇒ 一把灌水的尺，讓引擎連續多輪對自己的能力做出過度悲觀的判斷。
    - ⭐ **為什麼躲得掉（三個條件同時成立才躲得住）**：① 讀數**單調且平滑**，看起來就像「功能一直加、餘裕一直縮」，沒有任何跳變可疑；② 兩個環境（部署 LF／工作區 CRLF）**永遠不會被同時量到**，沒有第二把尺可對照；③ **2026-09-03 那輪其實踩到了**——它 checkout 三支檔後讀數暴增 77B、並寫下「還原後要先轉回 LF 再量、LF 才是部署真值」，但**只把它當成自己那三支檔的操作注意事項**，沒有回頭問「那**已經**躺在磁碟上的 CRLF 檔呢」⇒ 它引用的 1,638,383 基線本身就含 1,683B 灌水。
      **⇒ CLAUDE.md §4「修一半而看不出來」家族的新變形：發現了尺會失真，卻只修了「會讓它失真的那個動作」，沒修尺本身。**（前四種＝登記簿把自己 purge 掉／不變量只擋一個方向／規則放在延遲載入模組／JS 與 CSS 各寫一套）
    - **修法（三件，全部零首屏成本）**：① 本鎖改量 **LF 正規化後的位元組**＝git blob＝Pages 服務的位元組；② repo 根新增 **`.gitattributes`**（`* text=auto eol=lf` + 常見二進位副檔名 `binary`）讓工作區換行恆為 LF，使**磁碟 = git = 部署**三者恆等、讀數可複現；③ 把當下那 8 支檔就地轉回 LF（blob 本來就是 LF ⇒ **git 內容零 diff**）。
    - **新增不變量**：(c) **讀數必須與換行風格無關**——把同一批檔在記憶體裡全部轉成 CRLF 再量一次，總數必須逐位相同；且先跑一條**正向對照**（CRLF 版的原始位元組必須真的變大 >1000B），否則 (c) 會在擾動被中和時空綠。(d) 防空心：script 數 ≥50、總位元組 >1MB。
    - **負向擾動 4/4 CAUGHT**：P1 讀數改回 `b.length`（＝舊 statSync 口徑）／P2 CRLF 擾動改成 no-op（空綠）／P3 只量 index.html（樣本量崩掉）／P4 預算下修（主斷言 sanity）。
    - **對其他卡的效力**：**「首屏只剩十幾 bytes」這句話從本輪起不再成立**。#118 仍值得做（把 eager view 搬進 lazy 是對的架構），但它**不再是 #155／#154①／#157／#158／#160 的硬前置**；遊戲軌 [G-FS] 主張的「新 slot view 放不進 eager 檔」也要以 1,700B（本輪用掉 340B 後仍餘 **1,360B**）重新評估。

166. ✅完成 **大廳促銷輪播 6 張卡的「立即參加」，按下去一律說「此功能尚未實作」——而其中 5 個功能早就在站上跑著** — S（`core/ui.js`＋`core/content.js`＋兩個消費端，**首屏淨 +340B**，常駐鎖放 `tests/`）　`(2026-09-04 平台軌 08:00 窗 · 同窗開卡+落地)`
    - **玩家看到的事**：全站流量最高的畫面上，促銷卡按鈕寫著「立即參加」，點下去跳出「此功能在本 Demo 中為示意，尚未實作正式流程。」——**6 張全部如此**。而每日返水、VIP 俱樂部、推薦好友、週末充值加碼、競技場**全都已經做好而且能用**。⇒ 平台在首頁把自己做好的東西宣告成沒做。
    - ⭐ **根因＝同一個元件的兩個消費端各寫了一份 CTA**：`HL.ui.promoCard` 收 `opts.onCta`。`views/casino.js:174` 那份**寫對了**（`go` → router、`cat` → 篩選、皆無 → comingSoon）；`views/lobby.js:101` 那份是 `function () { HL.ui.comingSoon(p.title); }`＝**把描述子整個吃掉**。
      最難看的地方在於：**大廳那份與 `promoCard` 的預設值逐字相同**（連 `ctaText: "立即參加"` 都與預設相同）⇒ 它讀起來像一句無害的樣板，不像一條會吃掉去向的分支。**兩份都「正常運作」、畫面也正常，差別只在其中一份永遠走不到目的地。**
    - **修法（容器先於內容 · CTA 去向收回唯一一處）**：`promoCard` 內解析 `p.go`（**帶 `.open()` 的面板命名空間** 優先，否則當 router view）→ `p.cat`（交回呼叫端的 `opts.onCat`）→ 皆無才 comingSoon；**移除 `opts.onCta` 這個出口**，讓「再寫第二份」在型別上就沒有位置。大廳呼叫端縮成 `HL.ui.promoCard(p)`（−80B），娛樂城縮成 `{ ctaText, onCat: setFilter }`（−115B，只留 view 本地那一半）。
    - **資料側**：5 則大廳促銷補上真去向——`rakeback`／`arena`／`vip`／`reload`／`referral`（前四後一分別對應 `HL.rakeback.open`／router `arena`／`HL.vip.open`／`HL.reload.open`／`HL.referral.open`，皆已存在）。
    - ⚠️ **第 6 則刻意不補，而這正好暴露一個容器缺口**：`lobby:welcome`（100% 首儲獎金）唯一合理的去向是**收銀台**，但收銀台是 `layout/app-shell.js` 的**私有函式 `walletModal`**（`HL.shell` 只導出 render/mountView/refreshChrome/onExit/runExit）⇒ **全站沒有任何一條資料驅動的路徑可以把玩家送去儲值**：促銷、引導、通知、任務完成頁想這麼做都不行。站上也沒有「首儲 100%」這個商品 ⇒ 對它而言「示意」是誠實的、不是漏掉。**若日後要補，形狀＝把收銀台掛成一個帶 `.open()` 的命名空間（例 `HL.cashier`），本卡的解析器不需任何改動就會接上**（S，約 +40B）。
    - **常駐鎖** `platform/promo-cta-destination`（放 `tests/`＝零首屏成本）：(a) 反向鎖——全 `src` 對 `promoCard` 的呼叫點**都不得再傳 `onCta`**，且 `core/ui.js`（**去註解後**掃）不得再開這個出口；(b) `promoCard` 內 `comingSoon` 退路恰 1 處；(c) **行為級**——沙箱真的建卡、真的點下去，四條去向各走一次且**觀測值互斥**（面板／路由／篩選三條 `built===0`，「什麼都沒宣告」那條反過來要求 `built>0`）；(d) 已上架促銷宣告的每個 `go` 都必須解析得到真出口（打錯字會被抓）；(e) **大廳**促銷有去向者 ≥5。
    - ⚠️ **寫鎖時自己踩到兩個坑，兩個都由擾動抓出來**：① 「不得再出現 `opts.onCta`」第一版直接掃原始碼，被**本鎖自己寫在 ui.js 檔頭那句解釋**打中而誤紅——正是本專案「只認呼叫、不認提及」那條硬規則（08-31 記過）；② (e) 第一版數的是「大廳 + 娛樂城」合計，於是擾動 P7（拔掉大廳的 `go: "vip"`）**MISSED**——娛樂城的 `casino:tournament` 自帶一個 `go`，剛好把合計補回 5。**缺陷活在大廳這個母體裡，計數就得對著它數。**
    - **負向擾動 9/9 CAUGHT**（含修正後重跑的 P7／P9）：P1 大廳又自帶 onCta（原缺陷本體）／P2 promoCard 把 onCta 出口開回來／P3 不讀 `p.go`／P4 不讀 `p.cat`／P5 CTA 什麼都不做（按鈕變裝飾）／P6 `go` 打錯字（靜默回大廳）／P7 大廳 `go` 被拔／P8 面板與 router 優先序翻轉（面板永遠開不了）／P9 只拔一則。
    - **成本**：首屏 1,636,700 → **1,637,040／1,638,400（淨 +340B，餘裕 1,700→1,360B）**、90 支 script 不變；`node prototype/tests/run.js` 331→**332 全綠**；sw v265→**v266**。

167. ✅完成 **玩家衝了三小時的錦標賽，期滿那一刻畫面只是把排行榜和「我的名次」靜靜歸零——沒有賽果、沒有名次、沒有獎金，而賽果其實一直被寫下來、只是沒有任何人讀它** — S（`core/tournament.js` 首屏淨 +416B ＋ `views/tournament.js` 延遲檔＋`tests/`）　`(2026-09-04 平台軌·14:00 窗)`
    - **玩家看到的事**：錦標賽是站上最大的限時活動（**100 萬獎池、3 小時一期、50 人榜、付獎深 30 名**）。一期結束時，賽事頁只是把榜與「我的名次/積分」**重置為新一期**——**沒有任何一個表面告訴玩家「你第幾名、拿了多少」**；事後想回查「我上期第幾名」也**無處可查**。三小時的競賽，收場是一次無聲的重置。
    - ⭐ **根因＝資料層早就做好了，表現層從來沒接上（write-only 檔案）**：`settle()` 一直都把**結構化賽果**寫進 `HL_TOURNEY_LAST`（`eventName/rank/prize/total/when/groups` 六欄齊備），並**掛在公開 API 上**（`status().lastResult`）。而 `grep -rn "lastResult" prototype/src/` 實測＝**只有生產它的那一行，消費者 0 個**。
    - ⭐ **為什麼躲得掉（三層，全部指向同一個方向：結算那一秒畫面是對的）**：① settle() 當下**確實有兩個瞬時出口**——`HL.ui.toast`（**僅 prize>0 才發**）與 `HL.notify.add`（恆發）⇒ 看起來什麼都沒少；但 toast 是瞬時的、notify **上限 50 筆且與全站所有通知共用**（`core/notify.js:32`），而錦標賽**每天結算 8 次** ⇒ 那行字很快被擠掉，且它是自由文字、不是可查的紀錄。② **唯一有賽果彈窗的地方是「⏱ Demo 立即結算本期」那顆鈕自己內嵌的一份 modal** ⇒ **手動結算會宣告、自然期滿不會**，而開發與驗證幾乎都按那顆鈕 ⇒ 期滿這條路徑從來沒被走過。③ **同 repo 的小兄弟做對了**：`core/raffle.js` 用 `KEY_H = HL_RAFFLE_HIST` 存**清單**並渲染「我的開獎紀錄」（最近 6 筆）⇒ **形制早就存在，只是旗艦活動漏接了消費端**。
    - ⚠️ **它躲過了「同一天早上剛審過」的台帳**：`功能/累積彩金與錦標賽` 模組在 **09-04 08:00 窗**才被審為 `present`、記「逐位零漂移」——因為**模組審核問的是「這個功能在不在」，不是「它結束之後長什麼樣」**。⇒ 這正是本輪同時補上取材維度 **#10「活動的收尾面」**的理由（見 `db/sourcing-methods.md`）。
    - **修法（容器先於內容）**：① **core（首屏·刻意極省，註解外移 `tests/`）**：`KEY_H = HL_TOURNEY_HIST` 存**清單**（最新在前、保留 **8 期 ≒ 一天**）；`hist()` 在 KEY_H 不存在時把舊的單筆 `KEY_L` **遷入為第 1 筆**（不寫檔、老玩家既有賽果不消失）；新增 **`HL.tournament.history()`** 為唯一資料出口；`status().lastResult` 改由 `history()[0]` 供應（不再是第二份真相）。② **view（延遲載入·零首屏）**：新增「**往期賽果**」段（**沿用既有 `.ax-tny__row` 四欄格線＝零新 CSS、免費繼承手機斷點**），並在 `refresh()` 加**期別翻轉偵測**（`st.id !== seenId`）⇒ 期滿當下彈出賽果。③ ⭐ **把 Demo 鈕內嵌的那份 modal 拆掉**，讓它只負責 `settleAndCycle()`：**宣告收斂成唯一一條路**，手動與自然期滿從此走同一段程式（＝不再有「兩個消費端各一份」的位置）。
    - ⭐ **負向擾動當場抓到我自己實作裡的一個 bug，而且它正是本卡在修的那個形狀**：`settle()` 原本先 `save(KEY_L, res)` 才 `save(KEY_H, [res].concat(hist()))`，而 `hist()` 的**遷移分支**在 KEY_H 還不存在時會去讀 KEY_L ⇒ **讀回剛寫進去的這一筆** ⇒ **全新玩家的第一次結算就寫成 `["E1","E1"]`**（同一期重複兩列），且**只在第一次結算發生**。**更值得記的是我的測項遮蔽了它**：原本只驗「上限 8 筆」與「頭尾期名」，多一筆重複只是把清單推長，截到 8 筆後 h[0]／h[7] **恰好仍然全對** ⇒ 10 期版本全綠。修法＝`var prior = hist()` 移到寫 KEY_L **之前**；並補一條「**全新玩家第一次結算恰為 1 筆**」的不變量（P10）。
    - **常駐鎖** `platform/tournament-results-are-readable`（放 `tests/`＝零首屏成本，故根因與紀律可以寫長）：(a) API 契約 (b0) **首次結算恰 1 筆**（上面那條 bug 的專屬鎖）(b) 行為級真的連續結算 10 期驗**累積與順序**（`startNew({name})` 控制期名，才能斷言順序而非只斷言數量）(c) 上限 8 (d) 舊格式 `KEY_L` 遷移 (e) `lastResult` 與 `history()[0]` 同源 (f) ⭐**反向鎖：賽果必須有讀者**（沒有這條，本缺陷會原樣長回來）(f2) ⭐**往期段的渲染函式自己必須讀 history()** (g) ⭐**反向鎖：宣告只能有一份**（`settleAndCycle` 呼叫點不得再自組 modal）＋翻轉偵測不得被拿掉。
    - ⚠️ **(f2) 也是擾動抓出來的——我的鎖自己就是「修一半」**：P7（把往期段的 `history()` 讀取改成空陣列）**首次實測 MISSED**，因為 view 裡還有**第二個**呼叫點（翻轉偵測那行），於是「至少一個讀者」仍然成立、鎖照樣全綠，而**玩家的往期清單已經永遠是空的**。⇒ **缺陷活在哪個母體，計數就得對著哪個母體數**（同 #166 記過的那條通例）。補 (f2) 後重跑 **CAUGHT**。
    - **驗證**：`node prototype/tests/run.js` 333→**334 全綠**；**負向擾動 10/10 CAUGHT**（P1 不寫清單／P2 拆掉上限／P3 不遷移舊格式／P4 history 不掛 API／P5 lastResult 指向另一份真相／P6 順序反了／P10 prior 取太晚／P7 往期段不讀 history／P8 Demo 鈕又自組 modal／P9 拆掉翻轉偵測）。**排程輪拿不到 preview**（`preview_start` 在無人值守 session 被拒），故改用 §9 配方的 node 版：在 `registry-probe` 沙箱裡**真的執行 `views/tournament.js` 並呼叫 `render()`**，攤平 stub 樹確認「往期賽果」段與三期期名（期別-3/2/1）**逐筆依序上畫面**；`hasAttribute` 的 stub 缺口**已用 HEAD 版 view 當對照組確認非本輪造成**。
    - **成本**：首屏 1,637,377 → **1,637,793／1,638,400（淨 +416B，餘裕 1,023→607B）**、90 支 script 不變；i18n 補 EN/zh-Hans 各 6 條（語言包非首屏），並回收 2 條因本輪改動而孤兒化的舊 key（`🏁 本期結算`／`新一期已開始 · Demo`）；sw v267→**v268**。
    - **殘存缺口（刻意不同輪開卡）**：現在有結果面的兩個活動（raffle／tournament）**各自存一份、各自渲染一份，沒有登記簿** ⇒ 第三個活動要有結果面就得再抄第三份，而**抄漏的症狀正好是「畫面看起來完全正常」**。建議下輪開 `HL.eventResults.register({ id, label, history() })` ＋統一「往期活動」面板（比照 #109 `HL.reports`／`HL.dock` 形制）。已記入台帳新模組 `活動/活動收尾面／往期成績與得獎公示`。

## 分析師日誌（最新 3 則；歷史見 [BACKLOG-archive.md](BACKLOG-archive.md)）
- **2026-09-04（平台軌 · **14:00 窗** · 建置輪＝台帳輪替審「**活動**」8 模組（含**新增一格**）＋補上取材維度 **#10「活動的收尾面」**＋查獲並當輪修完「**期滿的錦標賽只是靜靜歸零，而賽果一直被寫下卻沒有任何人讀**」＋立常駐鎖 `platform/tournament-results-are-readable`＋開 #167（同窗 ✅）· claim `p-141420-3f9c`·進場鎖乾淨 false **未奪鎖**·dark 4.6h 非 catchup · 首屏 1637377→**1637793（餘裕 1,023→607B·淨 +416B）** · `node` 333→**334 全綠** · 負向擾動 **10/10 CAUGHT** · sw v267→**v268**）**
    - **① 進場**：`build_lock` 乾淨 `false`（遊戲軌 09-04 10:00 窗 `g-122904-ba34db03` 已於 12:41 釋放）→ claim `p-141420-3f9c` → **當下即單檔 commit `3bde399`** → 重讀確認 token 仍在。`lead_track: games` 但本軌有前手 08:00 窗明指的到期工作（台帳輪替→`活動`、到期平台 6 筆）⇒ **不讓路**。船長「待處理」區無平台軌新指派（#118／#160 仍待裁決，一位元組未動）。
    - **② 先重跑尺**（依 #165 落地時訂下的紀律「引用首屏餘裕前先重跑一次」）：**1,637,377／1,638,400＝餘裕 1,023B、90 支 script、CRLF 幽靈 0B** ⇒ 與遊戲軌 12:41 的收尾讀數**逐位相符**＝`.gitattributes` 正在生效、尺可複現。
    - **③ 取材（本輪維度＝#10 活動的收尾面·新開）**：到期 **6/36**（全 tier-3、08-05 那批），依 `max_platforms_per_run=2` 深挖 priority 最高兩筆 **CoinsBack(P67)／Betpanda(P65)**。兩站**進行中**的限時榜被評測寫得極細（CoinsBack 每小時 200 SC／每日 3,000 SC；Betpanda 兩條並行週賽 $7,000／$10,000），而**賽後**的往期成績／得獎名單／告知方式**逐項追問皆為 "Not mentioned"** ⇒ 兩個彼此無關的平台獨立收斂。順帶讀到 Betpanda 的 RG 工具在 AskGamblers 被**逐項列為缺**（明載 "limited information currently available on their site"）⇒ **玩家保護軸連續兩輪、四個平台皆無新缺口，建議下輪改輪替其他維度**。到期餘 **4 筆**（punkz/zonko/chancer/kaasino）。
    - **④ ⭐ 維度 #10 首輪執行即照出我們自己**：`grep` 實測**36 份 dossier 對「往期／得獎名單／活動封存」命中 0 份**，而對照組「獎池／名次獎金」**命中 14 份且逐筆都是進行中的池子** ⇒ **不是「活動」沒被看，是「活動結束之後」這半個表面沒被看**。同一把尺轉回自己身上，當場查獲 #167。
    - **⑤ 台帳（輪替＝活動，7→8 模組）**：`ledger-card-sweep` 正/反向皆 **0 筆**待確認。7 筆回填 `last_audited`；**新增一格** `活動收尾面／往期成績與得獎公示`（partial）——刻意**不併進**「促銷/活動框架」，因為框架管的是**排程與上架**（`promo-cal.js` 已有 `phase:"ended"`、RANK.ended=3），而**結果面是另一個表面**：ended 只代表「不再顯示為進行中」，不等於「看得到結果」。分開記，才不會再出現「時間軸綠、結果面空白」而指標完全免疫。
    - **⑥ 實作**：見卡 **#167**。兩個「擾動抓到我自己」的坑都寫進卡與鎖的註解（實作的首次結算重複一筆；鎖自己只驗到「至少一個讀者」而漏掉正確母體）。
    - **⑦ 下輪建議**：台帳輪替→**資安**；到期平台餘 4 筆；**最高價值續作＝結果面的登記簿**（`HL.eventResults`，把 raffle／tournament 兩份各自實作收斂成一份，且它是**下一個活動不會再漏接**的唯一機械保證）。#118／#160 仍待船長裁決。
- **2026-09-04（平台軌 · **08:00 窗** · 審計＋建置輪＝**修掉自己的尺**，發現「首屏只剩 17 bytes」是換行符灌出來的假象；另修一條線上活著的首頁謊言 · claim `p-081230-7c41`）**
    - **① 進場**：`build_lock` 乾淨 `false`（維護軌 09-04 00:00 窗 `m-001100-9d2e` 已釋放）→ claim `p-081230-7c41` → **當下即單檔 commit `19298e2`** → 重讀確認 token 仍在＝claim 成立·**未奪鎖**。`last_platform_run_at` 09-03T20:55（dark **11.3h** < 24h＝非 catchup）。`lead_track=games` 本可讓路，但遊戲軌 09-03 22:00 起處於 backoff-skip、且平台軌 09-03 20:00 窗明載「**09-04 有一大批平台到期，下輪可正常深挖**」⇒ **做而不讓路**。
    - **② 取材（本輪維度＝玩家保護）**：`platforms.json` 到期 **8/36**（全為 tier-3、08-05 那批），依 `max_platforms_per_run=2` 深挖 priority 最高兩筆 **BigPirate(71)／Spree(70)**。兩家**獨立收斂**出同一形狀：**責任博弈工具清單齊、但交付通道是客服工單**（BigPirate 多家評測一致寫明「須寄 email、介面沒有任何開關」；Spree 有 Take a Break 7/14/30 天、自我排除 ≥6 個月，同樣 email 且非即時）。第三方指南的應然基準＝帳內即時限額＋調升 24–72h 冷卻＋1/2/3 小時現實檢查。**ApexWin `HL.rg` 六項中五項優於對手 ⇒ 本維度零缺口、刻意不開卡**（`ban_busywork_heartbeat`）。⚠️ BigPirate 規模讀數由「3,150+」下修為多家一致的 **1,682**，依只記共識原則採之並記錄口徑差。其餘 6 筆到期留給下輪。
    - **③ 台帳（輪替＝功能，18 模組，09-01 全庫最舊）**：`ledger-card-sweep` 正/反向皆 **0 筆待確認**。六項機械讀數**逐位零漂移**：`HL.games.register(` **24 呼叫點／21 檔**、MANIFEST **20 檔**（連六輪）、`registry.json` HEAD **1 筆**、第三方聚合程式碼 **0**（naive 1＝註解，第 8 次同法量測）、views **34 檔中 25 檔**命中 `HL.fair`（連五輪）、`registry-probe.scan()` **10 個註冊表／unproven 0**。`點數商城` 三條 partial 理由逐條複驗仍成立（外部註冊者仍 0＝連五輪）。
    - **④ ⭐ 本輪最重要的發現＝尺本身**：見卡 **#165**。首屏預算鎖量磁碟位元組，而 8 支首屏檔正處於 CRLF ⇒ **1,683 bytes 的幽靈**，讀數 1,638,383（餘裕 17B）而部署真值 1,636,700（**餘裕 1,700B**）。這個假讀數是 #118／#155／#154①／#157／#158／#160 與遊戲軌 [G-FS] 共同的「事實前置」。已修尺（改量 LF 正規化）＋加 `.gitattributes` 釘死換行＋就地轉回 LF（git 內容零 diff）。擾動 **4/4 CAUGHT**。
    - **⑤ 用回收到的餘裕修掉一條線上缺陷**：見卡 **#166**。大廳 6 張促銷卡的「立即參加」全部通往「尚未實作」，而其中 5 個功能早就能用；根因是 `promoCard` 的兩個消費端各寫一份 CTA，大廳那份**與預設值逐字相同**所以讀起來像樣板。CTA 去向收回元件內唯一一處、移除 `opts.onCta` 出口、5 則補上真去向。擾動 **9/9 CAUGHT**（其中 2 個坑是擾動抓出我自己的鎖寫錯：掃到自己的註解、母體數錯邊）。
    - **⑥ 順帶記一個容器缺口（不另開卡，寫在 #166 內）**：收銀台 `walletModal` 是 `app-shell.js` 私有函式 ⇒ **全站沒有資料驅動的路徑能把玩家送去儲值**。日後補法＝掛成帶 `.open()` 的命名空間，#166 的解析器零改動就會接上。
    - **⑦ 收尾**：首屏 **1,637,040／1,638,400（餘裕 1,360B）**、90 支 script；`node` 331→**332 全綠**；sw v265→**v266**。counters：`platform_cards_opened` 144→**146**、`platform_cards_implemented` 93→**95**、`platforms_researched` 119→**121**、`consecutive_idle_rounds` 維持 **0**。他軌/前景 WIP（`games/registry.json` M／`styles/tokens.css` M／`games/slot-engine/` ??／兩個 `Game assets/`）依 §7 **一位元組未碰**。
    - **⑧ 下輪**：台帳輪替＝**活動**（7 模組，09-01 最舊）；`platforms.json` 仍有 **6 筆**到期可深挖（coinsback／betpanda／punkz／zonko／chancer／kaasino）。
- **2026-09-03（平台軌 · **20:00 窗** · 建置輪＝台帳輪替審「**金流**」6 模組（零漂移）＋查獲並當輪修完「**一次網路瞬斷就永久壞掉的延遲載入，而畫面寫著「請稍後再試」**」＋立常駐鎖 `platform/lazy-load-failure-is-recoverable`＋開 #164（同窗 ✅）· claim `p-201230-4b8e`·心跳 20:12→20:4x·進場鎖乾淨 false **未奪鎖** · 首屏 1638352→**1638383（餘裕 48→17B·淨 +31B）** · `node` 330→**331 全綠** · 負向擾動 **9/10 CAUGHT（1 例 by-design）** · sw v264→**v265**）**
    - **① 進場**：`build_lock` 乾淨 `false`（遊戲軌 09-03 16:00 窗 `g-160751-6731` 已於 `a34b7ab` 釋放）→ claim `p-201230-4b8e` → **當下即單檔 commit `adec742`** → 重讀確認 token 仍在＝claim 成立。dark 5.3h（14:52→20:12）< 24h＝非 catchup；`lead_track=games` 但**遊戲軌 16:00 窗已達 `idle_backoff=3` 並寫了退避報告**（結構性受阻於「須可靠 preview 輪／#118」）⇒ 本軌讓路等於全引擎空轉，故照常做而不讓路。
    - **② 台帳（輪替＝金流，09-01 全庫最舊）**：6 模組機械讀數**逐位複驗全數未動**——收銀台 `HL.payment|payMethod|payments.register|pspRegistry` **0 命中**（#82 未落地連九輪）、`ledger.record(` raw **10**（真插樁 9 行／6 檔）、提款審核 raw **4／實質 0**、`canTrade(` **1**、`wagerMult` **1**（且仍是註解）、`vault|保險庫|分倉|金庫` **0**。`ledger-card-sweep` 正/反向皆 **0 筆待確認**。調研側 `platforms.json` **到期 0/36**（最早一批 `next_due=09-04`）⇒ 本輪不取材新平台、不硬掃（`ban_busywork_heartbeat`），對各模組**據實記零淨新**。輪替序下一個＝**功能**（18 模組·09-01 最舊，與活動同日）。
    - **③ ⭐ 本輪缺陷：這套延遲載入容器的「失敗」是不可復原的，而畫面上寫的是「請稍後再試」。** `load()` 第二行短路 `_state[src] === "error"` ⇒ 一次注入失敗後該 src 在本次 session **永不再發請求**。沙箱實跑（假 document + 真檔）：失敗後第 2、3 次呼叫 **injection 恆 1**、回傳恆 false；玩家的三條重試路徑（離開再進來／再按一次入口／preload）全是假的——按 2 次入口實測 **1 次請求、2 次「請稍後再試」toast**。影響面＝**23 款延遲遊戲 + 7 個延遲整頁 view + 1 個延遲 global**（casino 遊戲牆／tournament／chicken／globe／liveroom／bounty／vsslot／opsBoard）＝玩家真正要玩的那一塊全在內；唯一救法是整頁重載，而畫面沒有任何地方這樣說。
    - **④ ⭐ 第二半（差點只修一半）**：**首次**失敗時 stubRender 的 `.then` 因 `if (!ok || …) return;` 什麼都不做 ⇒ 畫面停在「載入中…」**永遠不動**，那個專為此情境寫好的失敗節點**第一次上不了畫面**（要離開再回來才看得到，而那條路徑正好永不重試）。兩半合起來＝先永遠轉圈、再永遠「請稍後再試」。
    - **⑤ 為什麼躲得住**：症狀長得像**不可控的環境問題**，文案又完全合理；而三軌歷來對這套容器的鎖全在問「清單對不對／有沒有雙重註冊／首屏省了多少」，**沒有一條在問「失敗之後會怎樣」**。⇒ §4「說謊的控件」家族新一例。
    - **⑥ 修法與行為結果**（首屏餘裕進場僅 48B ⇒ 刻意淨 +31B）：error 不再快取；兩容器改「上輪失敗 ⇒ 畫面給失敗節點但**照樣重試一次**」，首次失敗重繪一次讓失敗節點真的上畫面、已在失敗畫面時不重繪＝**防迴圈**。⇒ 健康路徑 1 次請求／瞬斷一次**玩家什麼都沒按就自動救回真畫面**／永久斷線一次進場恰 **2** 次後停手且畫面誠實／再進場再給一次機會。
    - **⑦ 鎖與擾動**：`platform/lazy-load-failure-is-recoverable` 放 `tests/`＝**零首屏成本**（故根因寫得長）；七段斷言含**正向對照**(A)與**上限**(C)。負向擾動 **9/10 CAUGHT、每例僅本鎖轉紅**；**P8 為 by-design MISSED**（`done` 態仍正確快取 ⇒ 那次 `load()` 是真 no-op、行為零變化）。⭐ **P9 第一版 MISSED 才補出 (G)**：(F) 只證了遊戲容器「會重試+救得回」、沒證「誠實」——**兩個容器的每一條性質都得各自守一次**（§4 那條「有沒有第二個消費者？」生效）。
    - **⑧ ⚠️ 順帶更正一個量測口徑（比修法更容易咬到下一輪）**：`platform/first-screen-budget` 量的是**磁碟位元組**，而本 repo `core.autocrlf=true`、**無 `.gitattributes`** ⇒ 任何經 `git checkout` 還原的首屏檔在磁碟上變 CRLF、**每行 +1 byte**。本輪實測 `git checkout` 三支延遲檔後首屏 1638352→**1638429（超標 29B）而內容一位元組未改**。⇒ 還原首屏檔後**必須轉回 LF 再量**；Pages 服務的是 git 裡的 LF 版本＝**LF 才是部署真值**。CLAUDE.md §10.2 原本只記兩支個案，實為全 repo 通則。
    - **⑨ 記帳**：`platform_cards_opened` 143→**144**、`platform_cards_implemented` 92→**93**、`platforms_researched` 維持 **119**（到期 0、未新增平台）、`consecutive_idle_rounds` 維持 **0**（真修一條活缺陷）。
    - **⑩ 下輪**：台帳輪替＝**功能**（18 模組·09-01 最舊）；`platforms.json` **09-04 一大批到期**（spree／bigpirate／coinsback／betpanda／punkz／zonko／chancer… `next_due=09-04`）⇒ 下輪有真到期票、可正常深挖。**船長待裁決仍是那兩件（本輪無新增）**：① **#118** 的 (A) 前景開一輪 preview／(B) 允許 headless 純搬移版（建議 **(A)**）② **#160** 走哪條路線（建議 **(a) 不折疊**）。**本輪再次證實「首屏天花板 ≠ 沒工作可做」**：淨 +31B 就修掉一條打到 31 個表面的缺陷，長註解全部付在 `tests/`。
- **2026-09-02（平台軌 · **20:00 窗** · 建置輪＝台帳輪替審「**擴充性**」8 模組＋查獲並當輪修完「**在寬螢幕擺好的面板，換窄視窗開站就再也找不回來**」·claim `p-201047-9a3c`·心跳 20:11→20:42·進場鎖乾淨 false 未奪鎖·**首屏餘裕 14B→59B（本輪淨 −45B）**·sw v261→v262·node 327→**328 全綠**·負向擾動 **8/8 CAUGHT**）**
    - **① 進場**：`build_lock` 乾淨 `false`（遊戲軌 09-02 16:00 窗 `g-160539-2e93` 已於 commit `108cad7` 釋放）→ claim `p-201047-9a3c` → **當下即單檔 commit `7d5fd80`** → 重讀確認 token 仍在＝claim 成立·未奪鎖。`last_platform_run_at` 09-02T15:35（dark **4.6h**<24h＝非 catchup）；`lead_track: games` 允許讓路但本輪有真工作 ⇒ 不讓路。`ledger-card-sweep` 進場正向/反向皆 **0 筆**告警。
    - **② ⭐ 本輪的缺陷：夾取只守了「寫入」那半，而「還原」那半沒有任何守衛。** `HL.dock` 把玩家拖曳後的座標持久化在 `ax:dake:v1`（跨站原生 key），`relayout()` 的自訂座標分支**原樣套用存下的 px**。夾進視窗的規則只寫在 `HL.dom.makeDraggable` 的 pointermove 裡 ⇒ 拖曳中確實拖不出畫面，但在寬視窗（雙螢幕/最大化）把聊天室拖到右側存下 `left:2190px`，之後換窄視窗（筆電螢幕／半寬視窗／**瀏覽器放大縮放也會縮 innerWidth**）開站，**面板整塊落在畫面外**。實跑真檔量到的就是 `left:2190px` 套在 1280 寬的視窗上（可見上界 920）。
    - **③ ⭐ 為什麼它一點都不像壞了（§4「修一半而看不出來」家族第 N 例）**：`isOpen(id)` 仍回 **true**、`order` 仍含它 ⇒ 每個讀數都是對的；FAB 只是把一個看不見的面板原地開/關（toggle→close→open 回到同一組座標）；**專為「避免堆疊座標殘留」而寫的 resize 重排，刻意 early-return 跳過自訂座標者**＝正好跳過唯一會出畫面的那一群；而全站**沒有任何重設佈局的出口**（`grep ax:dock:v1` 僅 dock.js 自己）⇒ 玩家在那台裝置上**永久失去該面板**（夥伴／聊天／成長進度三者之一），只能自己清 localStorage。
    - **④ 只有 dock 有這個形狀（所以鎖敢把值釘死）**：`makeDraggable` 另兩個消費者（`core/live-stats.js` 浮窗、`views/game-frame.js` 的 PiP）都是 session 內拖曳、**不持久化座標** ⇒ 沒有「還原」那半可以漏。鎖的 (i) 條因此把「會還原持久化座標的表面集合」釘成**恰好 `[layout/dock.js]`**（比照 promo-cal rain 的差集棘輪），多一個表面開始存座標就會紅。
    - **⑤ 修法／鎖**：夾法抽成單一份 `HL.dom.clampPos`，**拖曳與還原兩個消費者共用**；還原刻意**不回寫** `layout`（夾是「這次怎麼顯示」，不是「玩家擺哪」——回到寬視窗要回到原位）。常駐鎖 **`platform/dock-restores-onscreen`**：真的 `dom.js`+`dock.js` 實跑、只切「視窗多寬」一顆旋鈕，九面斷言含 (a) 尺不是空心的對照組（無存檔時必須真的走 right 堆疊）、(b) 還原後整塊在畫面內、(c) resize 與關再開都不得又跑掉、(d) 縱向同理、(e) **不得回寫玩家擺放**、(f) clampPos 非恆等（四個邊界＋視窗窄於面板不得回負）、(g) 只有一份夾法（dock 不得出現面板尺寸運算或 Math.min/max）、(h) 載入序錨（dom.js 必須早於 dock.js——還原路徑刻意硬相依、不寫「取不到就沿用舊行為」，那正是 #110 的反面教訓）、(i) 還原者集合差集棘輪。
    - **⑥ 負向擾動 8/8 CAUGHT**：P1 還原不夾（回缺陷原狀）／P2 clampPos 改恆等／P3 只夾橫向忘縱向／P4 夾後回寫存檔（沒收玩家擺放）／P5 夾法用寫死 1920 而非當前視窗／P6 makeDraggable 不再走 clampPos（夾法抄回第二份）／P7 dock.js 自己夾／P8 載入序倒過來。每例僅擾動一處、還原後回 328 全綠，`index.html`／`dom.js`／`dock.js` 對 HEAD 零殘留。（⚠️ 首版的 (g) 口徑寫成「dock.js 不得讀視窗寬」，**當場被自己的基線抓紅**——`isMobile()` 本來就合法地讀 `clientWidth||innerWidth` 判 720px 斷點 ⇒ 已改為只禁「視窗尺寸減面板尺寸」那一半（offsetWidth/offsetHeight）與 Math.min/max。）
    - **⑦ ⭐ 首屏：本輪證實了**第二種**回收法，而它比 #160 那種安全。** 修法原始成本 **+1226B**＝遠超進場餘裕 14B，全額由**就地誠實回收**支付：把 `core/dom.js` 三段「遷移考古」註解（T9 hms/dhm、T9 pad/mmss/dhms、T10 makeDraggable）壓成「行為契約＋刻意保留原地的例外清單」，＋`layout/dock.js` 檔頭兩處贅述（已可由 grep 回答的註冊者清單、與一句「註冊於 window.HL.dock」）⇒ 共回收 ~800B。**每一項行為事實與每一條「別再收斂」的警告都逐字留著**，拿掉的只有「原本複製在哪幾支檔」這類 git/journal 可回溯的來源史。落地 **1638341／1638400、90 支 script＝餘裕 59B（淨 −45B）**。
    - **⑧ ⭐⭐ 而 #160 的那種回收法，本輪實測會削掉另一條鎖的量程（本卡最重要的新事實，已寫回 #160）**：`tests/i18n-key-scan.js` 是五面 i18n 鎖的單一真相，而它的**盤存清單就是 `t("中文")` 呼叫點**。基線 **sites 499／keys 363／gaps 0**；本輪拿 `core/edge.js` 真的折疊它的 8 個同引數呼叫點 ⇒ **sites 499→491、keys 363→355、gaps 仍 0、全套仍 GREEN** ⇒ **小批折疊會靜默縮短那把尺、沒有任何測項出聲**；而 `i18n-key-ratchet` 的反向錨要求 `sites >= 350` ⇒ **全 src 479 個全折疊後只剩約 20**，錨會轉紅。⇒ #160 原訂驗收 (b)（同引數呼叫點折到 0 的棘輪）與既有 `i18n-key-ratchet` **方向相反、無法同時滿足**；真正的問題是「一句畫面中文該不該有翻譯」目前**只能由 `t()` 包裹來表達**。已把三條可行路線（(a) 不折疊改用本輪的註解回收法／(b) 折疊＋把掃描器盤存改認「中文字面量」＝升為 L／(c) 只折已證實有譯者並每批重推下限＝不建議）寫進 #160 待船長裁決。
    - **⑨ 台帳（擴充性 8 模組全審·回填 last_audited=09-02）**：Dockable Layout **partial 維持**但本格查獲上述缺陷（容器三個承諾裡「持久佈局」先前只有一半是真的）／Design Tokens present（`HL.ui` 仍 19 出口；順帶記下「浮窗的**位置**不在 `HL.ui` 管轄內」＝為何元件庫層的鎖看不到面板跑出畫面）／Automated Tests partial（**327→328**；⭐ 查獲本分類射程缺口＝`layout/` 先前**零行為級測項**，因 `registry-probe.js` 的沙箱明文 `SANDBOX_SKIP=["layout/","views/","main.js"]`，本輪證明那個成本估計對**座標類邏輯**過高：~40 行啞節點 shim 就跑得起真檔 ⇒ 與 08-02 `layout/streamer.js` 同一教訓第二次：**layout/ 不是驗不到，是沒人去驗**）／首屏架構 present（見 ⑦）／上架排程 present／Feature Flags absent（維持刻意不開卡）／大廳版位 absent（#139 未動）／中央掛鉤訂閱者登記簿 absent（`liveStats.register` 仍 0 命中·#152 未動）。
    - **⑩ 取材（本輪唯一取到可用形制的是跨業，casino 側該軸零信號·據實記下）**：casino 側搜「可自訂佈局／重設」只回 SEO 型泛文（可調音量／日夜主題／收藏排列），**無一家提供面板佈局重設** ⇒ 不足對標。改向「發明 dockable 面板的那個行業」取材，形制一致且清楚：**Adobe（AE／PS／AI／Bridge）一律有 `Window > Workspace > Reset`**；**Altium Designer 官方 KB 專門記載「面板被移到畫面外」這個失效模式**並提供 Reset 與一套 Alt→Space→M→↑ 救援儀式 ⇒ **「持久化佈局會走到不可用狀態」在成熟 dockable 生態是已知事實，而成熟的答案是一顆 Reset，不是救援儀式。** 平台庫**不新增**（overdue **0/36**，次批 09-03 dorados／spinblitz 到期）；同日 14:00 窗已做過完整名次取材，再掃屬 busywork。
    - **⑪ 開卡 1 張**：**#161**（可停靠面板的重設佈局出口＋孤兒 `layout` 條目＋跨站共用語意；刻意設計成出口全落在 `dock.js` 內＝**不撞 #118**）。另更新 **#160**（見 ⑧）。counters：`platform_cards_opened` 140→**141**、`platform_cards_implemented` 90→**91**（本輪實作額度用在缺陷修，非卡）、`platforms_researched` 維持 117（未新增平台）、`consecutive_idle_rounds` 維持 **0**。
    - **⑫ 下輪**：台帳輪替＝**前端UI/UX**（7 模組·08-30 最舊）；09-03 兩站到期（dorados／spinblitz·tier-3）＋媒體/名次可重掃。**建議船長優先裁決兩件**：① #118 的 (A)/(B)（十餘張卡仍排在它後面）② #160 的三條路線選哪條（在裁決前**不要**再用折疊法付首屏帳，本輪的註解回收法是安全替代）。
