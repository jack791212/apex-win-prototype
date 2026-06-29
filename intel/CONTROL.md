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
↳ (2026-06-29) 逐一調研：待處理區無指令。本輪深挖 WOW Vegas + Toshi.bet。最大產出＝兩個全新缺口維度：①「滾動視窗衰減 VIP status（近 30 天活躍度決定段位）」(WOW Vegas Star System，ApexWin VIP 只升不降的根本性差異) ②「推薦/邀請好友 referral」(ApexWin 完全空白的病毒成長維度)；另發現 WOW Vegas Happy Hour 與 Toshi Rakeback Boosts 共識的「時間窗口型限時 boost」、Toshi「Rewards Calendar 統一領取日曆」兩個高 ROI 整合點。皆純前端可做，已寫 dossier 待 evolve 開卡。
↳ (2026-06-29) 市場雷達：待處理區無指令。本輪正式收編 WOW Vegas 至 watchlist(19→20)；最大產出為「Battle Pass/進度條式留存」取得硬數據(Day-30 留存可翻倍、即時獎勵純前端可做)，已寫 reports/2026-06-29.md 並列為強烈建議排入 BACKLOG 的可選議題。
↳ (2026-06-28) 市場雷達：待處理區無指令。本輪新增 Crown Coins/Punkz/Chancer 至 watchlist(16→19)，浮現「Battle Pass/進度條式留存」新主題，已寫 reports/2026-06-28.md 並列為給船長的可選議題。
