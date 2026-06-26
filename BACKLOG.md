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

20. ⬜待批准 **紅利/流水（wagering/rollover）引擎** — bonus vs cash 分離記帳 + 流水達標才可提取 — **L（純前端可做、使用者明確要求「引擎」）** ← 分析師建議**排在 #19 之前**先做
    - **為何現在**：自我進化引擎正高速量產「派彩入 `HL.bonus`」的留存功能——#15 錦標賽、#17 Lucky Spin、#18 Raffle（實作中）、#19 兌換碼（待做）——全部往獎金錢包灌錢卻**零流水控制**；每多一個來源，缺口就複利放大。此為頂級平台（Stake/BC.Game）紅利系統的底層引擎，且**使用者明確點名要「引擎」**。
    - **加速器原則**：先做此共用引擎，後續所有 bonus 來源（含 #19 及未來自動開卡）直接受流水規則約束、零逐功能改裝——典型「共用引擎先於個別功能」。趁 bonus 來源還少先做最划算。
    - 範圍（首版）：`HL.bonus` 升級為分離記帳（cash 餘額 vs bonus 餘額 + 各筆 bonus 的 wagerReq/已流水進度）、有效押注經中央掛鉤 `HL.liveStats.record` 累進流水、達標自動轉入可提取、未達標不可提取（接 `canWithdraw()` 閘控）、錢包面板顯示「待解鎖紅利 + 流水進度條」。純前端 localStorage、零牌照。
    - 會動到：`core/rewards.js`（或新 `core/bonus.js`）、`live-stats.js` 掛鉤、錢包/領取中心 UI。
    - 替代快速項：完成 🟢NOW 唯一剩的 **分享單局戰績（Web Share API，S）**——病毒式分享 Lucky Spin/錦標賽/Raffle 戰績，與留存引擎相乘。

> 🤖 **以下由自我進化引擎自動開卡**（2026-06-26 evolve · 來源：新調研 bet365 / roobet / rollbit / 1xbet）。全自動模式下標 🟦已批准待做。

21. ✅ **遊戲熱度模組：On Fire 🔥 / Ice Cold 🧊 + 當下最熱牆** — S–M　`(2026-06-26)` — 新增 `core/heat.js`＝`HL.heat`：對遊戲登錄表做 ambient 模擬（玩家數隨機漫步＋近期 RTP 漂移，自帶 4s interval 跨頁持續），並由全站中央掛鉤 `HL.liveStats.record` 對「真正被玩到的遊戲」即時加溫（fuzzy 比對遊戲名）。卡片角標 🔥(RTP≥118%)/🧊(RTP≤82%)、娛樂城頂部「🔥 現在最多人玩」即時牆（依玩家數排序、本頁每 3s 即時刷新、換頁 ticker 自動停）。class 用 `ax-trend*` 避開 arena.js 既有 `.ax-heat` 撞名；i18n 繁/簡/英；bump SW 快取 v3→v4。preview 實測：牆 8 格＋卡片 9🔥/10🧊 角標、大贏一局後該遊戲 RTP 93→130 轉火熱（中央掛鉤加溫生效）、ticker 每 3s 數字漂移、離開頁面牆自清且 arena 5 條熱度條不受影響、三語標題正確、零 console error。
    - 來源：**bet365（首頁置頂「當下最熱」）** + **roobet（Live RTP / On Fire・Ice Cold）**——兩平台共識的「熱度發現性」模式。
    - 範圍：用既有中央掛鉤 `HL.liveStats` 的近期下注/輸贏，計各遊戲「近期回報熱度」，卡片角標 🔥/🧊＋大廳頂部「現在最多人玩」即時牆。純前端、零牌照、複用既有掛鉤；強化發現性。會動到 `live-stats.js`（central hook 加掛 `HL.heat.record`）、`casino.js`（角標＋熱度牆）。
22. 🟦 **Rakeback 每日領桶（逾期作廢）+ header 快速領下拉** — S
    - 來源：**rollbit（每 30 分下拉領）** + **roobet（Roowards 日/週分桶）**——兩平台共識的「降低領取摩擦 + 催每日回訪」。
    - 範圍：在既有 `HL.rakeback` 上加「每日可領桶（24h 逾期作廢，沿用 #17 daily gate 模式）」＋ header 返水快領下拉（顯示可領額＋倒數、一鍵領入餘額）。會動到 `live-stats.js`/`progress.js`（rakeback 內嵌處）、`app-shell.js`（header 下拉）。
23. 🟦 **新 Original：Towers 爬塔** — M
    - 來源：**roobet（Towers）** + **Stake（Towers/Dragon Tower）**——共識 Original，補可玩遊戲數。
    - 範圍：逐層選格、選對往上累乘、踩雷歸零、隨時兌現（機制近 Mines）。大量複用 `HL.instant` 互動回合 + `HL.fair` 可驗證亂數；新增 `views/`一檔、覆蓋 mock 占位卡。純前端零牌照。

> 🤖 **以下由自我進化引擎自動開卡**（2026-06-26 evolve · 來源：新調研 shuffle / gamdom）。全自動模式下標 🟦已批准待做。

24. 🟦 **VIP 週期 Reload 領取中心（daily / weekly / monthly 固定紅利）** — M
    - 來源：**Shuffle（9 級 VIP 各含 daily/weekly/monthly reload）** + **Gamdom（Reload Rewards）** + 既有 **Roobet/BC.Game 分桶返水**——三方共識，ApexWin VIP 只有「升級獎金」、**無週期可領 reload**。ROI 高、強化每日/每週回訪。
    - 範圍：在既有 `HL.vip` 上，依等級給三檔週期固定紅利（沿用 #17 Lucky Spin 的 daily-gate + #18 Raffle 的週期倒數模式），到期可領入 `HL.bonus`；VIP 面板/底部列顯示「本日/本週/本月可領 + 倒數」。純前端 localStorage、零牌照。會動到 `core/progress.js`（HL.vip）或新 `core/reload.js`、VIP 面板 UI。
25. 🟦 **Chat Rain 聊天灑幣（社群留存引擎）** — M
    - 來源：**Gamdom 招牌（Rain：聊天室不定時下雨灑免費幣，窗口內活躍者按 claim 分得）**——ApexWin 已有聊天 UI（競技場/直播間）卻是「死水」，無灑幣。把既有聊天通電、體驗完整度躍升的高 ROI 項。
    - 範圍：每隔一段時間（或系統觸發）聊天室「下雨」，**窗口內近 N 分鐘有發言**的使用者按 claim 鈕分得 `HL.bonus`；附倒數條 + claim 按鈕 + 飄落動畫。純前端、localStorage 記錄參與資格與冪等領取，零牌照。會動到 `layout/chat.js`、新 `core/rain.js`。
26. 🟦 **多倍數目標型挑戰（Multiplier Challenges）** — S–M
    - 來源：**Shuffle（Daily/Weekly Challenges：命中某倍數/達某 payout 即領獎）**——補足 ApexWin 每日任務只計「次數/金額」、缺「技巧型目標（命中 ≥N 倍）」的維度。
    - 範圍：新增一類任務「在 X 遊戲命中 ≥N 倍」即解鎖獎金，掛既有中央掛鉤 `HL.liveStats.record`（已帶單局 bet/win，可推單局倍數）判定，達標入 `HL.bonus`。複用 #6 每日任務的領取流程。純前端零牌照。會動到 `core/progress.js`（HL.tasks）/`live-stats.js`。

> 🤖 **以下由自我進化引擎自動開卡**（2026-06-26 evolve · 來源：shuffle/gamdom 調研上輪受 3 張上限暫緩、標「下輪優先」的候補項）。全自動模式下標 🟦已批准待做。

27. 🟦 **新 Original：Hilo 猜高低** — M
    - 來源：**Gamdom（Hilo Original）** + **Stake（Hilo）**——共識 Original，補可玩遊戲數。
    - 範圍：翻牌猜下一張更高/更低，賠率依當前牌面機率動態、連對累乘、隨時兌現（機制近 Mines/Towers 的互動回合）。大量複用 `HL.instant` 互動回合 + `HL.fair` 可驗證亂數；新增 `views/` 一檔、覆蓋 mock 占位卡。純前端零牌照。與 #23 Towers 同屬「互動回合補 Original 數」家族。
28. 🟦 **新手限時啟用窗口（onboarding countdown）** — S
    - 來源：**Gamdom（登入後底部 6 小時啟用倒數窗口）**——提升首日轉化的低成本鉤子；ApexWin 有每日簽到但無「限時啟用窗口」。
    - 範圍：新用戶首登給「X 小時內完成首注/簽到 → 領啟用大禮包」倒數條，到期前完成即入 `HL.bonus`。沿用 #17 Lucky Spin 的 daily-gate 計時 + localStorage 記首登時點。純前端零牌照。會動到 `app-shell.js`（倒數條入口）、新 `core/onboarding.js` 或併入 `progress.js`。
29. 🟦 **tier-up 大階獎金** — S
    - 來源：**Shuffle（level-up + tier-up 雙層獎金）**——在既有「升級獎金」外，跨越大階段再給一筆較大獎金，強化長期爬階動機；ApexWin 目前只有逐級升級獎金。
    - 範圍：擴 `HL.vip` 既有升級派發邏輯，於跨大階（如 Bronze→Silver 段）額外發一筆 tier-up bonus 入 `HL.bonus`。純前端零牌照。會動到 `core/progress.js`（HL.vip 升級派發處）。

> 候補（受 max_cards 3 張上限暫緩，下輪優先）：週賽「距前一名差距」即時提示（S，強化 #15 錦標賽排行榜「再押 NT$X 即可超車」）。

> 更大型（運動博彩、Crazy Time、營運後台、Promo Points 積分商城、Bonus Battles、partial cash-out）見 ROADMAP 🔵LATER / 後續調研，做完上面再升級進佇列。

---

## 分析師日誌（每日 Routine 追加，最新在上）

- **2026-06-26（進化 · 實作 #21 遊戲熱度模組 + 開卡 #27–#29）** — 缺口進化第四輪。**無新調研檔**（8 份 dossier 皆 2026-06-26、high_water 已涵蓋），故本輪開卡來源為 shuffle/gamdom 上輪受 3 張上限暫緩、標「下輪優先」的候補項。**實作佇列頂端純前端 🟦 卡 #21 遊戲熱度模組 On Fire/Ice Cold + 當下最熱牆**（#20 流水引擎為 ⬜待批准 L 級架構改動、分析師已留給使用者批准，全自動下跳過）：新增 `core/heat.js`＝`HL.heat`，對遊戲登錄表 ambient 模擬（玩家數隨機漫步＋近期 RTP 漂移、自帶 4s interval 跨頁持續），由全站中央掛鉤 `HL.liveStats.record` 對真被玩的遊戲 fuzzy 比對加溫；卡片角標 🔥(RTP≥118)/🧊(RTP≤82)、娛樂城頂部「🔥 現在最多人玩」即時牆（依玩家數排序、本頁每 3s 刷新、換頁 ticker 自停）。**改 `live-stats.js`** central hook 加掛 record、**`casino.js`** 加角標＋頂部牆、i18n（繁/簡/英）、CSS、bump SW v3→v4。**抓到並修一個撞名 bug**：arena.js 既有 `.ax-heat`/`.ax-heat__bar`（房間挑戰者熱度條）會與新牆 class 衝突 → 全改用 `ax-trend*` 隔離。preview 實測：牆 8 格＋ 9🔥/10🧊 角標、大贏一局後該遊戲 RTP 93→130 轉火熱、ticker 數字每 3s 漂移、離開頁牆自清且 arena 5 條熱度條不受影響、三語標題正確、零 console error。**開卡（來源＝候補項）**：#27 新 Original Hilo 猜高低（Gamdom+Stake 共識，複用 HL.instant+HL.fair）、#28 新手限時啟用窗口（Gamdom 6h 倒數，沿用 #17 daily-gate）、#29 tier-up 大階獎金（Shuffle 雙層獎金，擴 HL.vip）；皆純前端、複用既有引擎、已去重。候補（受 3 張上限暫緩）：週賽距前名差距提示。**對船長指令**：CONTROL 待處理區為空，無插隊。**注意**：#20 流水引擎缺口仍未解（#21 不灌 bonus 故未加劇），但 #19 兌換碼/#24 Reload/#25 Rain 等 bonus 來源持續累積，#20 仍待使用者批准。下一步：佇列頂端待做為 #20（待批准）/ #22 Rakeback 每日領桶（已批准 S）；evolve 下輪將挑頂端 🟦 純前端卡（預計 #22）實作。
- **2026-06-26（進化 · 實作 #19 兌換碼 + 開卡 #24–#26）** — 缺口進化第三輪。**消化新調研**：shuffle.md / gamdom.md（上次 evolve 後新增的兩份 dossier，high_water 推進至 2026-06-26）。**實作佇列頂端 🟦 卡 #19 兌換碼 Redeem Code**：新增 `core/redeem.js`＝`HL.redeem`，內嵌碼表（5 組，可設到期日）、大小寫正規化、每碼每裝置限領一次（localStorage 冪等防雙倍）、派彩入獎金錢包 `HL.bonus`、modal 輸入框＋我的兌換紀錄、底部列新增 🎫 入口（共 8 顆）、CSS、i18n（繁/簡/英）；bump SW 快取 v2→v3。preview 實測：lowercase 命中、重領擋下、無效/空白/過期各回正確 reason、餘額增量精準(+100/+888/+1000)、UI 按鈕 handler 入帳＋顯示紀錄、EN 全譯、零 console error。**開卡（來源＝新調研 shuffle/gamdom）**：#24 VIP 週期 Reload 領取中心（Shuffle+Gamdom+Roobet/BC.Game 三方共識、ApexWin 缺週期 reload，最高 ROI）、#25 Chat Rain 聊天灑幣（Gamdom 招牌、把既有聊天死水通電）、#26 多倍數目標型挑戰（Shuffle、補任務「技巧型目標」維度）；皆純前端、複用既有引擎、已去重。候補（受 3 張上限暫緩）：Hilo Original、tier-up 獎金、新手限時窗口、週賽距前名差距提示。**對船長指令**：CONTROL 待處理區為空，無插隊。**注意**：#19 又是一個直接灌 `HL.bonus` 的來源 → #20 紅利/流水引擎（⬜待批准、L）缺口持續複利放大；#20 仍待使用者批准（L 級架構改動，全自動下未自行動工）。下一步：佇列頂端待做為 #20（待批准）/ #24（已批准），evolve 下輪將挑頂端 🟦 純前端卡實作。
- **2026-06-26（進化 · 收尾 #18 Raffle + 開卡 #21–#23）** — 缺口進化第二輪。**收尾 #18 每週抽獎**：新增 `core/raffle.js`＝`HL.raffle`，押注經中央掛鉤 `HL.liveStats.record` 每滿 NT$2,000 累積 1 張抽獎券，每週倒數＋逾期懶觸發自動開獎（沿用 #15 錦標賽冪等旗標＋單一 cycleEvent 路徑杜絕雙倍派彩，20 名階梯權重），中獎入獎金錢包 `HL.bonus`；底部列新增 🎟️ 入口（共 7 顆）、modal 顯示彩池/倒數/我的券數/預估機率/獎級/開獎紀錄、CSS、i18n（繁/簡/英）。bump SW 快取 v1→v2。preview 實測：5000 押注→2 券（carry 1000）、再 +1000→3 券；強制必中 payout=prize（30,000）精準入獎金錢包；重入/逾期多次觸發只派一次（冪等）；新期券數歸零；底部列點擊開 modal、倒數即時、en 顯示「🎟️ Weekly Raffle」；零 console error。**開卡（來源＝investigate 新增的 bet365/roobet/rollbit/1xbet 調研）**：#21 遊戲熱度模組 🔥/🧊+當下最熱（bet365+roobet 共識）、#22 Rakeback 每日領桶+快速領（rollbit+roobet 共識）、#23 新 Original Towers 爬塔（roobet+Stake 共識）；皆純前端、複用既有引擎、已去重。對船長指令：CONTROL 待處理區為空，無插隊。下一步：循環續跑；佇列頂端待做為 #19 兌換碼／#20 流水引擎（分析師建議 #20 先於 #19），evolve 下輪自動挑頂端純前端卡實作。
- **2026-06-26（每日分析 · 自我進化引擎高速產出巡檢 + #18 WIP 警示）** — 自當日 09:57 上一輪分析後大幅推進並巡檢確認：#15 錦標賽（`b0cccc8`/`977a663`）、#16 Provably Fair（`9708249`/`217df81`）、#17 Lucky Spin（`99d0463`）皆**已完成並提交**，core/ 已含 `tournament.js`/`fair.js`/`luckyspin.js` 且 index.html 皆掛載，BACKLOG/ROADMAP 勾選與程式**一致、無需修文件**。自我進化引擎（`intel/` + CONTROL 總開關 + 3 Skill + watchlist，Stake/BC.Game 已寫 dossier、next_due=2026-07-03）已上線跑首輪閉環。⚠️ **發現 `prototype/` 有未提交的 #18 Raffle 實作 WIP**：`core/raffle.js`（未追蹤 `??`）＋ `index.html`／`live-stats.js`／`app-shell.js`／`components.css`（已改未提交 `M`），另有未追蹤 `intel/platforms/bet365.md`（雷達剛掃 bet365）。依規範本日誌**只動文件、未碰亦未提交這些程式變更**——請使用者確認後由實作 Claude 收尾提交；**#18 在提交＋驗證前先維持 🟦，勿標 ✅**。**今日建議下一步：新增 #20 紅利/流水（wagering/rollover）引擎（L，純前端可做、使用者明確要求「引擎」），並建議排在 #19 之前先做**。理由：自我進化引擎正高速量產「派彩入獎金錢包 `HL.bonus`」的留存功能（#15 錦標賽／#17 Lucky Spin／#18 Raffle 實作中／#19 兌換碼待做），全部往 `HL.bonus` 灌錢卻**零流水控制**，bonus 來源每多一個缺口就複利放大；先做此共用引擎＝「共用引擎先於個別功能」加速器原則，之後所有 bonus 來源（含未來自動開卡）直接受流水規則約束、零逐功能改裝。替代快速項：🟢NOW 唯一剩的「分享單局戰績（Web Share API，S）」。
- **2026-06-26（🤖 自我進化引擎上線 · 首輪閉環 · #17 Lucky Spin）** — 建立並啟用自我進化引擎（`intel/` + 3 Skill + 3 本機 Routine + CONTROL 總開關，詳見 `intel/README.md`），完成第一個完整閉環：①**調研** Stake + BC.Game（寫 `intel/platforms/`、回填 watchlist 週期 next_due=2026-07-03）②**開卡** #17 每日 Lucky Spin、#18 週期抽獎 Raffle/Lottery、#19 兌換碼（皆為兩大頂級平台共識、ApexWin 皆缺、純前端可做）③**全自動實作 #17**：新增 `core/luckyspin.js`（`HL.luckyspin`，每 24h 免費轉、獎品依 VIP ×1~×3、中獎入獎金錢包 `HL.bonus`）+ 底部列入口 + 轉盤 CSS + i18n（繁/簡/英）。preview 實測：派彩=base×VIP 精準、每日閘鎖定、二轉擋下、轉盤落點與圖例高亮一致、零 console error。**順手補提交** #15 錦標賽遺漏的 `tournament.js`（core+view）script 掛載——功能已於 `b0cccc8` 完成，但 index.html 的註冊未提交（線上版實際載不到錦標賽），本次一併補上。下一步：循環自動續跑（investigate 每小時、evolve 每 2h），#18/#19 待後續自動實作；市場雷達每日 08:15 刷新清單。
- **2026-06-26（#15 錦標賽 / Slot Race）** — 完成分析師當日推薦的 #15。新增 `core/tournament.js`＝`HL.tournament`：限時積分賽（賽期內有效押注即積分，掛 `HL.liveStats.record` 中央點＝全遊戲＋跟注通吃）＋即時排行榜（mock bot＋真玩家）＋賽末依名次階梯（40/24/14/9/6/4/2/1%）自動派彩到獎金錢包 `HL.bonus`。新增 `views/tournament.js` 賽事頁。**電亮**寫死的「Slots 競賽 100 萬獎池」促銷卡（改 go:"tournament"）＋大廳橫幅入口；新增 `view:"tournament"` 路由。跑對標審查工作流（3 維度×驗證＝24 agents、18 findings）並修真問題：settle 加冪等旗標＋單一 `cycleEvent` 路徑（杜絕雙倍派彩）；移除「跨頁 4s setInterval」改觀看時 `viewTick` 推進 bot＋懶觸發逾期結算（免暴衝/空轉）；排行榜同分玩家優先；浮層暫停刷新；賽事頁全文進 i18n（繁/簡/英）。實測：押 30 萬→第 1 名、Demo 結算 40 萬恰一次入獎金錢包、非前 8 名派彩 0、跨 reload 持久、促銷卡/橫幅進場、en 翻譯、無 console error。**ROADMAP 🔵LATER 剩**：紅利/流水引擎、運動博彩、Crazy Time、營運後台。建議下一步：Crazy Time 類 Game Show（可掛主播主持、體驗強）或紅利/流水引擎（使用者明確要求）。
- **2026-06-26（#16 Provably Fair · 從 LATER 升級）** — 應使用者「看分析師任務接著執行」，從 🔵LATER 取 Provably Fair 實作（建構當下尚未見到當日 routine 已把 #15 錦標賽排入，故此項編 #16）。新增 `core/fair.js`＝`HL.fair`：同步 SHA-256+HMAC-SHA256（對標 WebCrypto 逐位元一致，含多 block／>64byte key／SHA256("")標準向量），種子模型 serverSeed 承諾雜湊→clientSeed→nonce，每注=HMAC(serverSeed, clientSeed:nonce) 前 4byte→[0,1)。Dice/Limbo/Plinko 改用 `HL.fair.float(game)`（Plinko 一注一 nonce、單 float 取 16 位元定各排）。通電 GameFrame 🔒／PiP ✓／底部「可驗證公平」。**跑對標審查工作流（4 維度×獨立驗證＝30 agents，23 findings）並修**：Plinko 補可驗證公平（原漏）、🔒/✓ 僅 PF 遊戲顯示、揭露「純前端 Demo 伺服器種子存本機」誠實聲明、setClientSeed 回傳成功、revealModal 改用 modal API、新增近期下注紀錄、驗證器加 Plinko 解讀+nonce 上限+i18n 標籤。實測：HMAC 對標一致、Dice 41.79／Limbo 7.28× 由種子完整重算、Plinko 一注一 nonce、🔒 僅 PF 遊戲、無 console error。建議下一步：回到分析師當日推薦 **#15 錦標賽 / Slot Race（M）**。
- **2026-06-26** — 巡檢：原始佇列 #1–14 與程式完全一致（core/ 18 檔含 instant/table/jackpot/notify/i18n 俱在；rakeback 內嵌於 live-stats.js+progress.js，非獨立檔但功能在；views/ 含 table-baccarat/table-roulette；prototype/ 有 manifest+sw.js+icon.svg）。`prototype/` 工作樹乾淨，無未提交程式。順手修正**文件與程式不一致**：ROADMAP 🟢NOW 的試玩/真錢·搜尋·i18n·通知中心仍標 `[ ]`、🟡NEXT 的 Rakeback·百家樂輪盤·Jackpot·PWA 仍標 `[ ]`，實際皆已完成 → 全部勾起並附 #編號/日期。**建議下一步：新任務 #15 錦標賽 / Slot Race（M）**——從 🔵LATER 升級。理由：原始佇列清空後，限時競賽是頂級平台（Stake 週賽/Roobet/BC.Game）的招牌留存引擎，是 LATER 中體驗完整度 ROI 最高者；且**雙重加速器命中**——(1) 已有裝飾用側欄排行榜＋一張寫死的「Slots 競賽 100 萬獎池」促銷卡承諾賽事卻無實作（電死招牌）；(2) 中央掛鉤 `HL.liveStats.record` 可直接餵積分、獎金錢包 `HL.rewards` 可直接派彩，零逐遊戲改裝。純前端零牌照。會動到：新增 `core/tournament.js`＋`views/tournament.js`、接促銷卡/大廳入口。替代快速項：🟢NOW 唯一剩的「分享單局戰績（Web Share API，S）」。

- **2026-06-23（補強·i18n 全站覆蓋）** — 使用者回報「換語系幾乎沒變化」。原 #13 只翻被 `t()` 包過的少數字串。改為**片語字典引擎**：以「畫面中文」為 key，DOM 自動翻譯層 walk 文字節點＋title/placeholder，`MutationObserver` 接住 Modal/Toast/換頁/聊天，`renderApp` 末同步 `apply()`（換頁即時翻不閃爍）；另加 prefix/suffix 比對處理「標籤＋動態值」串接（房主 X／加入 NT$X／3/4 玩家／% 挑戰者）。**擴充覆蓋＝字典加一條**。字典涵蓋側欄/header/底部列/錢包/帳號/大廳/競技場(房間卡·熱度條·賞金)/直播間/娛樂城/遊戲共用鈕/彩金·VIP·返水·通知標題；en 全譯、zh-Hans 補差異。預設 zh-Hant 零成本(observer 關)。preview 驗證四大頁全轉換、繁體可還原、简体正常、無 console error。殘留深層 Modal/遊戲內文/登入頁可續補(加 key 即可)。⚠️ 開發注意：PWA SW + 瀏覽器 HTTP 快取會讓改 i18n.js 後驗證拿到舊檔，需清 SW/caches 或 no-store 重載。

- **2026-06-23（#14 PWA · 佇列收尾）** — 完成 #14，**原始 14 項佇列全清**。新增 `manifest.webmanifest`（standalone、start_url `./?demo=1`、theme #131312、`icon.svg` any+maskable）、`icon.svg`（品牌 A 漸層）、`sw.js`（network-first + cache 後備：線上最新、離線回快取、導航離線退回 index.html；activate 清舊版、改版 bump CACHE）。index.html 補 manifest/theme-color/apple-touch-icon + 註冊 SW（僅 http(s)，file:// 略過維持可直接開啟）。驗證：manifest 解析、SW activated 並控制頁面、二次載入快取 56 檔＝離線可開、head 標籤齊全、無 console error。下一步建議：從 ROADMAP 🔵LATER 挑（紅利/流水引擎、運動博彩、Crazy Time、錦標賽、Provably Fair、營運後台），或回頭把 i18n 在地化覆蓋擴到大廳/競技場/直播間等其餘畫面（字典加 key 即可）。
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
