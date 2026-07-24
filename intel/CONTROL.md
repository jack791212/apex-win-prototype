# ApexWin 自我進化引擎 — 控制台 (CONTROL)

這是整套「市場調研 → 資料庫 → 發卡 → 自動實作」無限循環的**總控制台**。
每一個 Routine（平台進化 / 遊戲擴充 / 維護健檢）啟動時，**第一件事就是讀這個檔**。
你只要改下面的設定區，就能掌控整個循環——不需要動任何程式或排程。

> 💡 想暫停檢視時：把 `loop_enabled` 改成 `false`，把意見/問題寫進下面「船長指令」，存檔即可。
> 重新開跑時：把 `loop_enabled` 改回 `true`。下一個 Routine 觸發時就會讀到你的指令並先處理。

> 🔄 **2026-07-23 重構**：從舊的四軌（radar/investigate/evolve/consolidate + build/polish/mode 開關）改為**三軌雙線**：
> **① 平台進化軌** + **② 遊戲擴充軌**（兩條「成長線」，各自做完整的 調研→資料庫→發卡→實作）＋ **③ 維護健檢軌**（打磨既有 + 拒絕閒置逃生閥）。
> 舊的 `mode: build/polish/mixed` 已退場——成長不再被單一開關悶住。資料庫在 `intel/db/`。

---

## ⚙️ 設定區（改這裡）

```yaml
# === 總開關 ===
loop_enabled: true          # ← 最重要。true = 整套循環自動跑；false = 所有 Routine 一啟動就安靜退出。

# === 三軌開關（loop_enabled: true 時才生效）===
platform_track_enabled: true   # ① 平台進化軌：重新調研頂級 casino → 更新平台模組台帳 → 開平台卡 → 實作(擴充性優先)
games_track_enabled: true      # ② 遊戲擴充軌：從遊戲媒體重新列新遊戲+評分 → 寫保真規格 → 復刻 → 過保真閘才上線
maintain_track_enabled: true   # ③ 維護健檢軌：打磨既有表面(UI/UX/自適應/模板化/a11y/i18n) + 引擎健檢 + 拒絕閒置
auto_implement: true           # ← 真正會「自動改 code 並 push」那一步。想只蒐情報先別動 code → 設 false(仍會開卡等你看)

# === 起步優先（兩條成長軌並開時，火力集中處）===
lead_track: games           # platform | games | balanced —— 2026-07-24 切 games(平台三缺口#45/#46/#47全補完→火力轉遊戲軌出第一款保真遊戲)

# === 節流（控成本/控改動幅度）===
max_platforms_per_run: 2       # 平台軌每輪重新調研幾個頂級 casino / 深挖幾個到期平台
max_game_candidates_per_run: 8 # 遊戲軌每輪重新列出幾個新遊戲候選寫進 games-catalog
max_cards_per_run: 2           # 每輪最多開幾張卡
max_implement_per_run: 1       # 每輪最多自動實作幾張(建議 1，改動才好檢視/回滾)

# === 遊戲保真閘（治「調查隨便→做出劣質遊戲」）===
fidelity_gate: true            # 復刻遊戲上線前必逐項通過 db/game-fidelity-spec.md 的「上線閘檢查清單」
require_spec_before_code: true # 動手前必先照保真規格寫出該遊戲的 fidelity_spec 存進 games-catalog.json
fidelity_min_rtp_sims: 1000000 # RTP 蒙地卡羅最少回合數(實測回收率須在宣告 RTP ±0.5% 內)
quality_over_quantity: true    # 寧可一輪只徹底做好一款，也不出殘缺遊戲

# === 拒絕閒置（逃生閥 · 修「無意義一直跑」）===
ban_busywork_heartbeat: true   # 禁止「本輪無新債/無到期」的空心跳 commit(舊引擎每天空轉 5 輪的病根)
idle_escalation: revalidate    # 找不到新工作時的升級順序：① 加深/擴大調研找工作 → ② 去重驗 db/ 裡 last_verified 最舊的 N 筆(驗證工作永遠有) → ③ 仍飽和才寫一則閒置報告給船長並退避
idle_backoff_rounds: 3         # 連續 N 輪真飽和才退避、跳過接下來 N 次觸發(避免空轉)
stale_days: 7                  # db/ 任一 entry 的 last_verified 距今 > N 天 → 自動排回調研佇列重新查證

# === 焦點 ===
focus_regions: ["global", "taiwan", "asia", "japan", "latam", "europe"]   # 平台軌調研重點地區(依優先序)
relevance_lens: "純前端可做、提升體驗完整度、對標 Stake 類 crypto/social casino + 留存玩法 + 可插拔擴充架構"   # 篩缺口的鏡頭
avoid: ["真金流串接", "KYC", "真人視訊", "供應商聚合真接入", "第三方RNG認證", "法定合規"]   # 需牌照、現在別開卡(可先做開發完成/flag 停用的骨架)

# === 寫入鎖（防三軌並行寫壞 prototype/）===
build_lock: false           # 空閒為 false；寫入型 routine 進場「上鎖(claim-token)」、收尾清回 false；進場見非 false 就讓路。
                            #   token 形如 <前綴>-<時分秒>-<亂數>：p-(platform)/g-(games)/m-(maintain)。
                            #   stale heal：以本檔 mtime 判鎖齡，>2 小時才視為前輪崩潰未清鎖、可清回 false 後走 claim-token 再讀確認重進場。
                            #   ⚠️ 勿手動長期設 true(會擋掉整個循環)；卡住時手動設回 false 即可解鎖。
```

---

## 🧭 船長指令 / 我的意見與問題（Captain's Orders）

> 在這裡寫任何你想**插隊的優先項、意見、要特別研究的平台/遊戲、要避開的方向、或問題**。
> 每個 Routine 啟動時會先讀這裡並**優先服從**，處理完會在「已回應」區用 `↳ (日期)` 回覆你。
> 一行一條最好。處理完的可留著當記錄，或自行刪掉。
> 例行心跳（沒有待處理指令的一般輪次）**不寫這裡**，寫 [loop-journal.md](loop-journal.md)（最新在上、一輪一則精簡）——這樣本檔永遠保持輕薄可讀。

### 待處理
- (2026-07-23) 平台軌次優先候選：radar 長期點名卻沒人做的高價值缺口——~~團隊/公會 meta~~(✅ 2026-07-24 #47 已做純前端骨架)、~~成就徽章牆~~(✅ 2026-07-23 #45 已做)、~~季票/battle-pass 化外殼~~(✅ 2026-07-24 #46 已做)。**三候選全數消化完畢。** 後續 Guild 深化（好友系統/公會聊天頻道/raid 協力目標/後端多人真週榜 phase8 guild_econ）已記入 platform-modules 台帳與 #47 卡「下一步」，非插隊指令、由引擎常規排序處理。

### 已回應
<!-- 只放「對待處理指令的回覆」，最新在上；例行心跳一律寫 loop-journal.md -->
↳ (2026-07-24 遊戲軌·首款保真遊戲) 已服從船長「切 lead_track: games、出第一款保真遊戲（指定 Pirots 5）」：實作 **Pirots 探險 `slot-pirots.js`**＝games 軌**首款過保真閘的遊戲**、ApexWin 全新「網格收集」互動維度。忠實復刻 ELK Pirots 5 玩法：6×6 網格鳥收集連通同色≥6→cascade→漸進乘數→集滿擴張 6→8、⭐×3 免費遊戲乘數持續暴走(+retrigger)、X-iter buy 100×。**保真閘全過**：RTP 96.145%(20M 蒙地卡羅、累計 40M+ 校準、±0.5% 內)、SD≈28 高波動、max 10000× 實測可達、13 項上線閘全 PASS、preview 零 error、HL.fair 一注一種子可驗證、中央掛鉤 liveStats.record。**引擎改進點(記入 games-catalog)**：`fidelity_min_rtp_sims:1000000` 對此波動級不足(需 30M+ 才 ±0.3%)，未來應隨宣告波動調高最低模擬數。收尾清 build_lock=false。
↳ (2026-07-24 平台軌·次優先候選消化 3/3＝全數完成) 已服從三候選之最後一項 **Guild/公會 meta**，本輪實作 **#47 團隊/公會 meta `HL.guild`**（`core/guild.js`）＝**依船長建議「先做純前端骨架：隊伍容器 + team-vs-team 掛中央結算點」**：資料驅動公會『註冊表』`register(spec)`（比照 `HL.games`/`HL.achievements` 自我上架、種子 6 公會），玩家加入一公會→有效押注經中央結算點 `HL.liveStats.record` 尾端 `record(bet)` 累積週貢獻。**team-vs-team 週榜**（對手隊/隊友為確定性種子模擬、同週穩定，`isLive()` 閘＝真站整批歸零只留玩家真實貢獻，比照 tournament/arena bot）；**兩獎勵路徑**入 `HL.bonus`（帶 source 入帳本）：① 個人貢獻任務 4 階里程碑（冪等 per week）② 跨週 `weekNum()` 週榜結算派團隊獎金（冪等 per week，比照 `tournament.settle`）。面板 `HL.ui.modal` wide（未入會→6 公會瀏覽卡；已入會→儀表板/週榜/隊內貢獻榜/任務 chip/換公會/退出），入口掛福利中心 hub「成長·商城」。站別命名空間隔離。preview 零 console error（先清 SW `apexwin-v85` 舊快取避免 404）；JS eval 逐項驗（6 註冊、未入會不累積、經真中央點 +3000 精準、貢獻 6k→1 可領/claim 冪等/未達擋、isLive 閘 totalGuilds 6→1 切回復原 6、leave→joined=false、面板 6 瀏覽卡/週榜 6 列 1 is-mine/4 任務/1 可領/隊友含「你」/header 正確）。platform-modules「團隊/公會 meta」absent→partial。**至此 07-23 待處理次優先三候選（#45 徽章牆 + #46 季票 + #47 公會）全數落地**，三者同構資料驅動註冊表家族。**下一步深化**：好友系統/邀請入會、公會聊天頻道（掛 `HL.dock`）、公會 raid/協力目標、後端多人真週榜（phase8 `guild_econ` 依站別）。
↳ (2026-07-24 平台軌·次優先候選消化 2/3) 已服從次優先三候選之最後可純前端落地者，本輪實作 **#46 季票 Season Pass `HL.season`**（`core/season.js`）：**config 驅動雙軌季票外殼**（擴充性優先＝一份 SEASON 設定就是可換的 config 排程、`setSeason` 出口、`state.sid` 不符即換季重置、tiers 純資料 30 階）；免費軌人人可領 + **進階軌花費「成就點數」解鎖**＝直接消耗 #45 `HL.achievements` 鋪的 XP 底座（**兩張成長卡串成 XP 經濟閉環**）、解鎖後回溯領已達階級；賽季經驗由中央結算點 `HL.liveStats.record` 尾端有效押注累積、跨階即時通知；階梯獎勵入 `HL.bonus`（帶 source 入帳本、走 locked 待解鎖與 #45 一致、真站 8× 流水鎖）。面板＝`HL.ui.modal` wide 資料驅動雙欄階梯（四態 chip + 逐階/一鍵領取 + 進階解鎖 CTA），入口掛福利中心 hub「成長·商城」。站別命名空間隔離（比照 VIP/成就）。preview 零 console error；JS eval 逐項驗（中央點 4500 wager→Tier 3、claim 三閘皆擋、unlockPrem 恰扣 60 點且回溯開放、claimAll 清空、六階獎金 180/1200/2500·480/3600/30000 精準落 locked 錢包、面板 30 階/60 chip/7 可領 button 渲染正確）。platform-modules「季票/battle-pass 化外殼 Season Pass」absent→present。**剩餘候選**：僅 **Guild/公會 meta**（radar 連 7 輪最強空缺、業界仍空白；需社交層、部分需後端 → 建議下輪先做純前端骨架：好友/隊伍容器 + team-vs-team 掛 `HL.liveStats.record` 中央點，比照 dock/achievements 的資料驅動註冊）。
↳ (2026-07-23 平台軌·次優先候選消化 1/3) 已服從次優先三候選，本輪實作 **#45 成就徽章牆 `HL.achievements`**（`core/achievements.js`）：資料驅動成就註冊表(register(spec) 比照 HL.games 自我上架、19 枚×6 分類×4 分層)、掛中央結算點 liveStats.record 累積終身統計即時解鎖、發**成就點數(XP 底座，特意為未來 Season Pass 鋪路)**+獎金入獎金錢包、忠誠類即時讀 VIP/簽到、徽章牆 modal+福利中心入口。preview 零 error、JS eval 逐項驗證(解鎖/獎金/進度/冪等/中央點驅動/test 型忠誠即時解鎖皆精準)。platform-modules 新增獨立模組「成就徽章牆」status=present。**剩餘兩候選**：Guild/公會 meta（需社交層，較重、部分需後端可先做純前端骨架）、Season Pass 季票（現可疊在本輪成就點數 XP + 既有 VIP/連登骨架上，門檻低、建議為下一張平台卡）。
↳ (2026-07-23 平台軌·首張平台卡) 已服從「起步優先＝平台功能先，先做可收納/自由擺放的容器底座」：實作 **#44 `HL.dock` 模組化/可停靠佈局底座**（`prototype/src/layout/dock.js`）——資料驅動面板註冊表，任何未來功能面板一行 `HL.dock.register(spec)` 即獲 開/關/**收合(可收納)**/**桌機拖曳自由擺放**/自動堆疊/**跨站持久佈局**/手機互斥；既有夥伴+聊天已改掛（保留 `HL.panels` 舊 API 零改動）。platform-modules 台帳 Dockable Layout：absent→partial。preview 驗證零 error（桌機路徑經 clientWidth 覆寫逐項驗：堆疊/收合/拖曳持久/relayout 保留座標皆精準）。**下一步容器化**：把主內容區(大廳/儀表板) widget 納入 grid slot 引擎、面板↔停靠列吸附、多佈局 preset。次優先三項(Guild/徽章牆/Season Pass)仍在待處理。
↳ (2026-07-23 重構) 引擎從四軌改三軌雙線：見本檔頂部說明 + intel/README.md + intel/db/。舊四軌 skill(radar/investigate/evolve/consolidate)已由 platform/games/maintain 三軌取代；資料庫層 intel/db/ 新建(platforms/platform-modules/providers/games-catalog + game-fidelity-spec + sourcing-methods)。
↳ (2026-07-17 打磨) E2 落地：原累積於此的 103 筆例行心跳已全數搬到 [loop-journal.md](loop-journal.md)。此區今後只放「對上方待處理指令的回覆」；例行心跳請看 loop-journal.md（最新在上）。
