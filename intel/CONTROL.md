# ApexWin 自我進化引擎 — 控制台 (CONTROL)

這是整套「市場調研 → 缺口分析 → 自動實作」無限循環的**總控制台**。
每一個 Routine（市場雷達 / 逐一調研 / 缺口進化）啟動時，**第一件事就是讀這個檔**。
你只要改下面的設定區，就能掌控整個循環——不需要動任何程式或排程。

> 💡 想暫停檢視時：把 `loop_enabled` 改成 `false`，把意見/問題寫進下面「船長指令」，存檔即可。
> 重新開跑時：把 `loop_enabled` 改回 `true`。下一個 Routine 觸發時就會讀到你的指令並先處理。

---

## ⚙️ 設定區（改這裡）

```yaml
# === 總開關 ===
loop_enabled: true        # ← 最重要。true = 整套循環自動跑；false = 所有 Routine 一啟動就安靜退出，
                          #    不調研、不開卡、不改 code、不 commit。想暫停檢視就設 false。

# === 分段開關（loop_enabled: true 時才生效）===
radar_enabled: true       # 市場雷達：掃各國/全球排名熱度、更新觀察清單
investigate_enabled: true # 逐一調研：每小時深挖到期平台、寫調研檔
evolve_enabled: true      # 缺口進化：把調研轉成 BACKLOG 任務卡
auto_implement: true      # ← 真正會「自動改 code 並 push」的那一步。
                          #    想只蒐情報、先別動 code → 設 false（仍會開任務卡等你看）。

# === 節流（控成本/控改動幅度）===
max_platforms_per_hour: 2     # 每次「逐一調研」最多深挖幾個平台
max_cards_per_evolve: 3       # 每次「缺口進化」最多開幾張任務卡
max_implement_per_evolve: 1   # 每次最多自動實作幾張卡（建議 1，改動才好檢視/回滾）

# === 焦點 ===
focus_regions: ["global", "taiwan", "asia", "japan", "latam", "europe"]   # 市場雷達重點地區（依優先序）
relevance_lens: "純前端可做、提升體驗完整度、對標 Stake 類 crypto/social casino + 留存玩法"   # 篩缺口的鏡頭
avoid: ["真金流串接", "KYC", "真人視訊", "供應商聚合接入", "第三方RNG認證", "法定合規"]        # 需牌照、現在別開卡
```

---

## 🧭 船長指令 / 我的意見與問題（Captain's Orders）

> 在這裡寫任何你想**插隊的優先項、意見、要特別研究的平台、要避開的方向、或問題**。
> 每個 Routine 啟動時會先讀這裡並**優先服從**，處理完會在「已回應」區用 `↳ (日期)` 回覆你。
> 一行一條最好。處理完的可留著當記錄，或自行刪掉。

### 待處理
<!-- 還沒有待處理指令。要插隊/給意見就在這裡一行一條寫下來。 -->

### 已回應
<!-- Routine 會把回覆追加在這裡，最新在上 -->
↳ (2026-06-30) 市場雷達：待處理區無指令。掃了 global/taiwan/asia/japan/latam/europe。本輪**無顛覆性新霸主**，市場續確認既有領先者（Crown Coins 仍 sweepstakes 榜首、Stake/BC.Game/Thrill 仍 crypto 標竿）。**新收編 2 家**：Spree（P70，多榜「最全方位」社交賭場，均衡無短板）+ BetPanda（P65，多榜「出金最快」crypto，Bitcoin Lightning <30s，可學極速到帳的純前端 UX）；watchlist 21→23（仍 ≤30）。**最大主題收穫＝「Battle Pass / quest 式 CRM 留存」再獲大量 2026 趨勢與硬數據佐證**（遊戲化 6 個月留存 75% vs 50%、Day-30 30–40% vs 業界 15–25%），純前端可做、契合既有任務/VIP/連登骨架——此主題前數輪已浮現，**建議下次 evolve 正式成卡**。日本(Vera&John/Casino Secret cashback)、台灣(玖富/富馬/王者，真金百家樂)、LATAM(巴西 crash+stablecoin，加密博弈當地非法)皆核心真金/法規=avoid，僅記錄趨勢不收編。最值得進下階段調研：**Spree + BetPanda（皆今日新進、pending）**，以及既有最高優先 stake/bc-game/bet365（T1，07-03 到期）。已寫 reports/2026-06-30.md。**提醒**：`prototype/` 若有未提交變更本輪未碰（只動 intel/）。
↳ (2026-06-29) 逐一調研：待處理區無指令。本輪清掉 watchlist 上唯二到期的 pending——**Chancer（P56，06-28 到期）+ Kaasino（P55，06-27 到期）**（皆首次調研，正是上輪逐一調研指名的「下次最該調研」者，至此 watchlist 全部平台皆已有 dossier）。**兩個全新缺口維度**：①**Chancer「Bonus Shop 忠誠點數商城」**——玩遊戲累積 shop points → 逛商城花點數換 free spins/bonus/周邊，VIP 越高賺點效率+折扣越好。ApexWin 一堆「發錢進獎金錢包」的機制（Lucky Spin/Reload/Raffle/Rakeback）卻**完全沒有「點數消耗端 + 商品目錄」的經濟閉環**——補上即成「賺→逛→換」完整生態（複用 HL.liveStats 累點 + HL.bonus 兌換 + #24 modal 骨架，M）②**Kaasino「Split-Screen 多開模式」**——同畫面同時開 1/2/4 款遊戲（各格獨立下注結算），ApexWin GameFrame 單款獨佔全畫面、完全無多開；ApexWin 全 Originals 走 HL.instant 互動回合＋HL.gameFrame.wrap，天生適合網格多開，最大風險＝多實例狀態隔離（M）。另佐證：Chancer「30% cashback+20% rakeback 並行派發」呼應已開卡的 #33 淨損 cashback（可整成雙軌領取視圖）。皆純前端可做，已寫兩份 dossier 待 evolve。下次最該調研：**stake/bc-game/bet365（T1，07-03 到期，最高優先）**，其餘 T2/T3 多在 07-10 之後。**提醒**：`prototype/` 若有未提交變更本輪未碰、未一起 commit（本輪只動 intel/）。
↳ (2026-06-29) 缺口進化（第七輪）：待處理區無指令。**消化七份新調研**（thrill/mega-dice/spinblitz/stake-us/crown-coins/toshi-bet/wow-vegas，high_water 推進至 2026-06-29）。**實作佇列頂端 🟦 卡 #24 VIP 週期 Reload 領取中心**（新 `core/reload.js`：日/週/月三檔固定紅利、金額依 VIP 放大、各檔週期閘逾期不累積、入獎金錢包；底部列 🔄 + VIP 面板入口；preview 實測金額/冪等/三語 i18n/零 console error 全過）。**開 3 卡**（依共識度挑前 3）：#33 淨損 Cashback/Lossback（Thrill+Mega Dice 共識的**全新維度**，與 rakeback 互補）、#34 遞增連登階梯+里程碑日（Crown Coins+Stake.us+SpinBlitz **三家共識**）、#35 時間窗口型 Happy Hour boost（WOW Vegas+Toshi 共識）。其餘浮現點子（Throw the Dice/Game of Week/Prize Drops/社群彩池/referral/滾動 VIP/禮物信箱/生日禮/Rewards Calendar/限時掉碼/Coin Flip/VIP 功能門禁）已記入 BACKLOG 候補區待下輪。**注意**：本輪掃描後逐一調研又寫入 SpinBlitz+**Punkz** dossier（Punkz 含 Loot Box 寶箱/種子揭露動畫等新點子），因同日寫入、本輪未及消化——下輪 evolve 由「自上次 evolve 後更新過的調研檔」條款接住，不會遺漏。**提醒**：#20 紅利/流水引擎（⬜待批准、L）缺口仍未解，#24 又是直接灌 `HL.bonus` 的新來源（日/週/月三檔）、複利放大此缺口——需船長批准才動工（L 級架構改動，全自動下不自行碰）。
↳ (2026-06-29) 逐一調研：待處理區無指令。本輪深挖 SpinBlitz + Punkz（兩家皆首次調研、watchlist 久未到期的最高優先 pending）。**最大產出＝三個全新缺口維度**：①**SpinBlitz「社群共享彩池」**——彩金觸發時 50% 給觸發者、50% 平分給「近 24h 有貢獻」的 100 名隨機玩家，ApexWin #9 Jackpot 只派給命中者一人，缺這個「雨露均霑」社交分配維度（複用 HL.jackpot 演出 + 中央掛鉤判活躍 + #15 bot 湊名單，M）②**Punkz「Loot Box 寶箱」**——XP 解鎖、分 3 層、每日多開的開箱儀式，與 #17 Lucky Spin 不同（綁押注進度而非純每日閘，複用 Lucky Spin 隨機派發 + HL.bonus，M）③**Punkz「provably-fair 即時種子揭露動畫」**——把已有 #16 HL.fair 從「事後驗證器」升級為「下注當下的視覺揭露時刻」，純前端、複用既有引擎、天然差異化賣點（S–M）。另佐證既有缺口：Punkz「6 週 80k XP 過期重置」再次力證 WOW Vegas Star System 浮現的「滾動視窗衰減 VIP（只升不降 vs 會掉段）」維度，建議 evolve 正式成卡。SpinBlitz 另有「Hourly/Daily 時間排程必掉彩金」（與 LeoVegas Ready-to-Drop 候補共識）。皆純前端可做，已寫兩份 dossier 待 evolve。下次最該調研：Chancer（P56，今日到期）+ Kaasino（P55，多開 split-screen UX），下輪續清剩餘 pending。
↳ (2026-06-29) 逐一調研：待處理區無指令。本輪深挖 Thrill + Mega Dice。**最大產出＝全新缺口維度「淨損 Cashback / Lossback」**——Thrill(10%) 與 Mega Dice(15%) 兩家共識的「淨輸返現、零流水」，ApexWin 只有 rakeback(算 turnover)、完全無此維度(算 net loss)，兩者互補不重疊，強烈建議 evolve 開卡。另發現三個高 ROI 整合點：①Mega Dice「Throw the Dice」把任務獎勵改為擲骰隨機揭曉(加變異/期待感，複用 #17 Lucky Spin+#6 任務) ②「Game of the Week 每週精選遊戲」(複用 #21 熱度+#18 週期倒數，提升發現性/週回訪) ③「Prize Drops 隨機掉落獎」(與 #15 排名賽互補，複用 #9 Jackpot 每注機率觸發)。另記 Thrill「VIP 升段解鎖功能(Vault X/Reloads/host)」門禁式設計(ApexWin VIP 只發獎金)。皆純前端可做，已寫 dossier 待 evolve。
↳ (2026-06-29) 逐一調研：待處理區無指令。本輪深挖 WOW Vegas + Toshi.bet。最大產出＝兩個全新缺口維度：①「滾動視窗衰減 VIP status（近 30 天活躍度決定段位）」(WOW Vegas Star System，ApexWin VIP 只升不降的根本性差異) ②「推薦/邀請好友 referral」(ApexWin 完全空白的病毒成長維度)；另發現 WOW Vegas Happy Hour 與 Toshi Rakeback Boosts 共識的「時間窗口型限時 boost」、Toshi「Rewards Calendar 統一領取日曆」兩個高 ROI 整合點。皆純前端可做，已寫 dossier 待 evolve 開卡。
↳ (2026-06-29) 市場雷達：待處理區無指令。本輪正式收編 WOW Vegas 至 watchlist(19→20)；最大產出為「Battle Pass/進度條式留存」取得硬數據(Day-30 留存可翻倍、即時獎勵純前端可做)，已寫 reports/2026-06-29.md 並列為強烈建議排入 BACKLOG 的可選議題。
↳ (2026-06-28) 市場雷達：待處理區無指令。本輪新增 Crown Coins/Punkz/Chancer 至 watchlist(16→19)，浮現「Battle Pass/進度條式留存」新主題，已寫 reports/2026-06-28.md 並列為給船長的可選議題。
