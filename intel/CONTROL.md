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
fidelity_min_rtp_sims: 1000000 # RTP 蒙地卡羅回合數**下限**(非充分條件)：先跑 1M 量 SD
fidelity_rtp_ci95_max_pp: 0.5  # (2026-07-29 消化船長 G3)RTP 證明的 CI95 半寬上限(pp)。高波動遊戲須由 N≥(1.96·SD/0.005)² 決定正式樣本數直到 CI95≤此值；結果空間可窮舉者改用精確解析式(零抽樣誤差)+分布吻合檢查。詳見 db/game-fidelity-spec.md 第 1 項。
quality_over_quantity: true    # 寧可一輪只徹底做好一款，也不出殘缺遊戲

# === 拒絕閒置（逃生閥 · 修「無意義一直跑」）===
ban_busywork_heartbeat: true   # 禁止「本輪無新債/無到期」的空心跳 commit(舊引擎每天空轉 5 輪的病根)
idle_escalation: revalidate    # 找不到新工作時的升級順序：① 加深/擴大調研找工作 → ② 去重驗 db/ 裡 last_verified 最舊的 N 筆(驗證工作永遠有) → ③ 仍飽和才寫一則閒置報告給船長並退避
idle_backoff_rounds: 3         # 連續 N 輪真飽和才退避、跳過接下來 N 次觸發(避免空轉)
stale_days: 7                  # db/ 任一 entry 的 last_verified 距今 > N 天 → 自動排回調研佇列重新查證

# === 存活監測（2026-07-28 健檢後新增·治「平台軌暗了 71 小時卻沒人知道」）===
lock_heartbeat_stale_min: 45    # 鎖心跳逾時判凍結的門檻(分)。實測正常輪 12–57 分完成，45 分為合理心跳間隔上限。
log_yield_rounds: true          # **讓路/撞鎖/no-op 退出必須在 loop-journal.md 留一行並單檔 commit**。
                                #   根因：包裝檔原本只說「讓路退出」不留痕跡 → repo 中「讓路」與「App 沒開沒觸發」完全同形，
                                #   使 idle_reports 統計失真、下一輪 session(無記憶)無法自 repo 判斷上輪發生什麼。
                                #   注意這與 ban_busywork_heartbeat 不衝突：後者禁止「假裝有工作的實作」，不禁止「一行退出紀錄」。
catchup_if_dark_hours: 24       # 若本軌 last_<track>_run_at 落後 > N 小時 → 本輪**禁止讓路**，必須補課(該軌已失聯太久)。

# === 焦點 ===
focus_regions: ["global", "taiwan", "asia", "japan", "latam", "europe"]   # 平台軌調研重點地區(依優先序)
relevance_lens: "純前端可做、提升體驗完整度、對標 Stake 類 crypto/social casino + 留存玩法 + 可插拔擴充架構"   # 篩缺口的鏡頭
avoid: ["真金流串接", "KYC", "真人視訊", "供應商聚合真接入", "第三方RNG認證", "法定合規"]   # 需牌照、現在別開卡(可先做開發完成/flag 停用的骨架)

# === 寫入鎖（防三軌並行寫壞 prototype/）===
build_lock: false           # ← 遊戲軌 07-30 16:04 firing 依 stale-heal 奪鎖：平台軌 07-30 14:00 建置輪（p-141010-7a4d）心跳凍結 114 分（≫45 分門檻；起始==最後心跳 14:10:00＝claim 後立即凍結、零 prototype/ WIP，未提交內容僅本鎖行本身）→ 判前輪凍結/崩潰、清 false、stalled_rounds 0→1。奪鎖後已完整重讀 STATE/db/git log/git status（§7 第 1 條）。本輪無安全的 headless 遊戲建置（媒體靜窗延續 8/18-8/25、node 契約缺口已全閉、剩餘 shadow-ritual RTP retrofit 與 G5③ 四 slot 賠付表 UI 皆重/高視覺回歸風險需可靠 preview）→ 不硬擠 heavy build（質>量、不帶未驗證上線），本輪定位＝存活恢復輪。以下為歷史釋放註記：
                            # ← 遊戲軌 07-30 10:04 建置輪（g-100451-2d96）已於 10:2x 收尾釋放：消化船長 G5 之 2/3（① 輪盤大/小標反改正 ② 百家對子升級 canonical 8 副牌靴 RTP 92.31%→89.64%·8M+40M MC 13/13 重驗全過）＋更正 G4 誤判（baccarat/roulette 補入 PF 🔒 白名單）；剩餘 G5③ 四 slot 賠付表 UI 留專輪。sw v114→v115。以下為歷史釋放註記：
                            # ← 平台軌 07-30 09:10 建置輪（p-091004-b3e7）已於 09:3x 收尾釋放：消化船長 P1/P2/P4/P5 + P3/P6 部分；實作 #55（HL.dock 第二代註冊者）、開卡 #56。
                            # ← 維護軌 07-30 00:09 catchup 輪（m-000921-64d4）已於 00:2x 收尾釋放：消化船長 M1（健檢新鮮度判定可重現化·實測 live 逾期 12/31=39%）+ M2（DEBT/BACKLOG/archive 頭部去除已廢除舊治理）；純文件/邏輯零回歸。
                            # ← 遊戲軌 22:00 建置輪（g-220437-a3f1）已於 22:2x 收尾釋放：消化船長 G2（dragon-tiger 補 module.exports/isNode guard、node 驗證器實跑 20M MC 交叉解析）+ G4（game-frame PF 白名單補 6 款過閘 HL.fair 遊戲的 🔒 入口）。
                            # ← 遊戲軌 16:00 建置輪（g-160630-27cf）已於 16:2x 收尾釋放：消化船長 G1（Plinko 過閘 13/13 + games_rejected_by_gate 0→1）+ G3（RTP 證明改精確解析/CI 收斂）。
                            # ← p-125630-4c7e（平台軌 07-29 12:49 catchup 建置輪）已於 14:05 收尾釋放。
                            #   該輪於 h- 鎖釋放後 3 分鐘乾淨接手（本軌當時 dark 22h40m、逼近 catchup 24h）。
                            #   ⚠️ 留記一個結構性風險：當持鎖者的**未提交 WIP 內含 CONTROL.md/STATE.json 本身**時，
                            #     後續軌依現行保守判準（不覆寫他人未提交工作）**永遠無法自行解鎖**，只能等人工——
                            #     07-28 19:13 → 07-29 12:53 這 17.6h 死結即為實例（四輪 firing 全數讓路、連五輪籲人工）。
                            #     建議 maintain 軌評估「WIP 含控制檔時的安全奪鎖程序」（例：先把該批 WIP 原樣 commit 為
                            #     rescue 提交、再走 claim 接手），使死結可自癒。
                            # ← h-191342-68bb 已於 2026-07-29 12:5x 收尾釋放（該鎖 07-28 19:13 由前景健檢會話取得、
                            #   因會話中斷持有 17.6h＝正是本次健檢診斷的「凍結持鎖」情境親身重演；期間四輪 firing
                            #   全部正確留下讓路痕跡且保守不奪鎖〔WIP 含 CONTROL/STATE 本身〕＝新協定首次實戰驗證成功）。
                            # 空閒為 false；寫入型 routine 進場「上鎖」、收尾清回 false；進場見非 false 就讓路。
                            #   **格式（2026-07-28 健檢後改版·帶心跳）**：`<前綴>-<時分秒>-<亂數>@<ISO 起始>@<ISO 最後心跳>`
                            #     前綴 p-(platform)/g-(games)/m-(maintain)、h-(人工/前景會話)。
                            #     **持鎖者每完成一個 SKILL 步驟就改寫「最後心跳」欄位**（同時證明自己還活著）。
                            #   **stale 判準改讀「最後心跳」**（不再用本檔 mtime——凍結的 session 不會再 touch 本檔，
                            #     mtime 只反映 claim 時刻、無法反映持有者是否還活著，2026-07-28 健檢實證：一個凍結 18.4h 的
                            #     platform session 因鎖齡「差 6 分鐘未達 2h」而餓死 games 07-27 22:00 整個建置窗）。
                            #     心跳距今 > `lock_heartbeat_stale_min` → 判前輪凍結/崩潰，**可奪鎖**，並在本行尾註記奪鎖公告。
                            #   **奪鎖後接手者鐵律**：必須完整重讀 STATE/db/git log/git status 才能寫入（防凍結者醒來後
                            #     帶著數小時前的記憶覆寫——CLAUDE.md §7 第 1 條同型風險）。
                            #   舊格式（裸 token 或 true，無 @）視為無心跳 → 退化用本檔 mtime 判定（向後相容）。
                            #   ⚠️ 勿手動長期設 true(會擋掉整個循環)；卡住時手動設回 false 即可解鎖。
```

---

## 🧭 船長指令 / 我的意見與問題（Captain's Orders）

> 在這裡寫任何你想**插隊的優先項、意見、要特別研究的平台/遊戲、要避開的方向、或問題**。
> 每個 Routine 啟動時會先讀這裡並**優先服從**，處理完會在「已回應」區用 `↳ (日期)` 回覆你。
> 一行一條最好。處理完的可留著當記錄，或自行刪掉。
> 例行心跳（沒有待處理指令的一般輪次）**不寫這裡**，寫 [loop-journal.md](loop-journal.md)（最新在上、一輪一則精簡）——這樣本檔永遠保持輕薄可讀。

### 待處理
> 🔬 **2026-07-28 全面健檢派工**（5 維度平行審計 + 對抗性複驗，兩個 critical 已由前景當場修掉；以下是**經複驗確認**、交回三軌自行消化的剩餘項。各軌照常規優先序排入，勿一次全做。）

**遊戲軌**
- [G1] ✅ (2026-07-29 遊戲軌) **Plinko 已被判 FAIL 卻仍在線上可玩**，且 `counters.games_rejected_by_gate` 仍為 0 ——閘對 FAIL 的「處置 + 計數」兩件事都沒落實。請：修 Plinko 至過閘（或下架），並讓 FAIL 真的會 +1 計數。 ↳ 已修 buildTable 過閘 13/13、`games_rejected_by_gate` 0→1，見已回應。
- [G2] ✅ (2026-07-29 遊戲軌·22:00) **`table-dragon-tiger.js` 無 `module.exports`／DOM guard，node 無法 require** → 已比照其餘 11 款補 `isNode` guard + 純數學區上移 `module.exports=CORE`；node 驗證器實跑 require OK + 20M 蒙地卡羅交叉精確解析（Δ<0.04pp）+ 決定性 PASS，契約恢復。見已回應。
- [G3] ✅ (2026-07-29 遊戲軌·隨 G1 一併落地) **`fidelity_min_rtp_sims: 1000000` 與實務脫節**：實測 dbn 單注 SD≈36.5，1M 樣本 CI95 高達 ±7pp（連 7pp 的錯都測不出）。建議改為「以收斂為準」：新增 `fidelity_rtp_ci95_max_pp: 0.5`，先跑 1M 量 SD、再由 `N ≥ (1.96·SD/0.005)²` 決定正式樣本數（1M 僅作下限）。**這是連續三輪自己寫下卻從未落實到設定檔的改進點。**
- [G4] ✅ (2026-07-29 遊戲軌·22:00) 保真閘白名單只補了 pirots：`game-frame.js` 的 PF 表已補其餘 6 款過閘 HL.fair 遊戲（dead-by-noon/golden-toad/dragon-tiger/sic-bo/andar-bahar/money-wheel）→ 全 7 款外框現顯 🔒；baccarat/roulette 仍 Math.random 故正確不列。preview 逐款驗證 🔒 出現。見已回應。
- [G5] 🏗️ (2026-07-30 遊戲軌·2/3 完成) 小瑕疵三項：① ✅ 輪盤「大/小」標反已改正（小(1–18)/大(19–36)）。② ✅ 百家對子 side bet 已由無限牌組升級為 canonical 8 副牌靴無替換 → RTP 92.31%→89.64% 對齊真實、13/13 重驗全過（見已回應）；**順帶更正 G4 誤判**：baccarat/roulette 皆走 HL.fair.floatOr 且過閘，已補入 game-frame PF 白名單 🔒。③ ⬜ **四款保真 slot 無賠付表 UI** 未做（Pirots/Dead By Noon/Golden Toad/Gem Storm）——屬 UI 完整度、面積較大、視覺回歸風險高，留待專輪或維護軌。

**平台軌**
- [P1] ✅ (2026-07-30 平台軌) **修根因＋審一分類**：根因是本檔原本**只有檔案級 `updated` 一個時戳**（改任一模組就整檔看似新鮮，個別模組多久沒審機械上不可查）→ 已為**全 46 筆模組加 `last_audited`**（evidence 有載複查日者採該日，其餘一律回填種子日 07-23＝寧可低估新鮮度），逾期可 node 一行算出。本輪按 P1 指名審 **金流**（5 模組，種子日後首次複查）；資安已於 07-28 審過。實測分佈：07-30×7、07-29×2、07-28×6、**07-23×31**（＝待輪替，數字與 P1 的 31 相符）。見已回應。
- [P2] ✅ (2026-07-30 平台軌) 兩處皆據實更正：① `導覽殼層` partial→**present**，修法實證為 commit `8981686`（2026-07-10「DEBT R1 — 手機主導覽 header 漢堡→左側抽屜」）；**順帶更正 P2 自身一處不準**——修法不是「底部列」而是**左側抽屜 `ax-drawer`**（底部列承載的是任務/簽到/錦標賽/福利/VIP 五個獎勵入口＋FAB，不含主分頁切換）。② 大廳數字改為 node 實跑值 **51 筆（playable 2 / 非 playable 49）**、可玩總數約 20 款登錄（views 自我註冊 18 + 種子 2）。見已回應。
- [P3] 🏗️ (2026-07-30 平台軌·部分＋已改紀律) 選了船長給的第二條路「**平台軌自己在落地時同步補**」：本輪新落地的 #55 成長進度面板**含完整 EN/zh-Hans**（32 條 key，preview 三語逐項驗證）。**#45–#49 五個既有面板的字典仍為零覆蓋**（徽章牆/季票階梯/公會週榜/保險/活動日曆的內文），留待後續平台輪或維護軌補。本輪另記一條**可重複踩的雷**（已寫入 dock-growth.js 檔頭契約）：`HL.i18n.t` 是 passthrough、翻譯只發生在 DOM walker 且**要求整個文字節點等於一條 key**，故「中文＋動態值」串接（如 `解鎖 1 / 19 枚徽章`）永遠翻不到——本輪首版就是這樣寫錯、preview 抓到後改為「中文全片語 + 值純數字」。
- [P4] ✅ (2026-07-30 平台軌·本輪實作卡 #55) 底座已有**第二代註冊者**：`layout/dock-growth.js` 一行 `HL.dock.register` 即取得 開/關/收合/桌機拖曳/跨站持久座標/手機互斥（`HL.dock.ids()` 由 `["partner","chat"]` → `["partner","chat","growth"]`，preview 實證）。**刻意不把 #45–#49 直接改掛 dock**：徽章牆/季票階梯/公會週榜是「進去專心看一次」的全幅內容，塞進 360px 側浮窗會讓資訊密度崩掉 ⇒ 改為新增一個**真正適合停靠的聚合面板**（三條成長進度摘要 + CTA 開回各自 modal）＝dock 管「邊玩邊看」、modal 管「完整檢視」。見已回應。
- [P5] ✅ (2026-07-30 平台軌·選「廢除」) 已從 `STATE.json` 與 SKILL 第 6 步移除。理由：它是**舊四軌流水線的消費游標**——當年 radar/investigate 產 dossier、evolve **另一軌**才去消化「尚未處理的最新調研」，故需水位；三軌重構後平台軌同一輪內自研自用，無跨軌生產者/消費者關係，**全 repo 無任何邏輯讀它**（這正是它能死鎖 19 天而毫無影響的原因）。新鮮度的真實出口有二且都在運作：`platforms.json` 的 `last_investigated`/`next_due`（逐平台）＋ `platform-modules.json` 的 `last_audited`（逐模組，本輪新增）。廢除理由完整記於 STATE `_abolished_high_water_doc`。
- [P6] 🏗️ (2026-07-30 平台軌·本輪只還了兩筆，結構問題仍在) 本輪刷 **leovegas**（tier-2 逾期 6 天＝維護軌 M1 點名的次逾期最久）+ **toshi-bet**（tier-2 逾期 1 天）→ 逾期 12→10。**但 P6 的結構診斷成立且未解**：`max_platforms_per_run: 2` × 每日最多 3 窗 vs 32 筆（多為 30 天週期）＝刷新速率長期追不上到期速率。**建議（留給船長裁決，因涉及調研深度取捨）**：tier-3 的 `refresh_interval_days` 30→45~60（tier-3 多為新興小站，30 天刷一次過密），或本軌改「每輪 1 深挖 + 2 淺刷」。本輪未自行改設定＝不想在船長未表態下降低調研密度。
- [P7] `providers.json` 有 20/27 筆無 `last_verified` 欄位 → 逃生閥②的重驗佇列永遠碰不到它們。

**維護軌**
- [M1] ✅ (2026-07-30 維護軌·catchup 輪) 健檢「db/ 新鮮度」判定改為可重現 node 一行實測（排除已停運站）+ 明訂門檻 + 強制記實測百分比。本輪實測 **live 逾期 12/31=39%**（非 81%＝平台軌 07-27/28/29 已刷回；mega-frenzy 為已停運刻意 park 非逾期）。見已回應。
- [M2] ✅ (2026-07-30 維護軌) `DEBT.md:4`／`BACKLOG.md:6,8`／`BACKLOG-archive.md:4` 頭部舊治理述（consolidate skill／`mode` 開關／radar-investigate-evolve）已據實更正為三軌雙線+`lead_track`；日誌 body 帶日期舊條目屬歷史稽核保留不改。見已回應。
- [M3] **結構性偏食**：4 張 M/L 級 `🏗️進行中` 重債長期未動，逃生閥從未被實際演練。請排一輪專門啃重債。
- [M4] 心跳紀律回歸（E2）：多輪例行心跳被誤寫進 `CONTROL.md`「已回應」區（本檔已被灌到單行破 1500 字），且 07-24 平台軌兩張卡 commit 了卻在 journal 查無心跳。**例行心跳一律寫 loop-journal.md**。
- [M5] `intel/reports/` 已實質退役卻仍被 CLAUDE.md 列為「判斷引擎在跑」的稽核訊號；`games_researched` 計數帳目不可追溯。請擇一：恢復使用或正式除役。
- [M6] 觀測點：無打包架構已達 **1.22 MB / 88 個 `<script>`**，首屏成本開始線性成長（現階段可接受，但請設一個門檻並在超過時提報）。

- (2026-07-23) 平台軌次優先候選：radar 長期點名卻沒人做的高價值缺口——~~團隊/公會 meta~~(✅ 2026-07-24 #47 已做純前端骨架)、~~成就徽章牆~~(✅ 2026-07-23 #45 已做)、~~季票/battle-pass 化外殼~~(✅ 2026-07-24 #46 已做)。**三候選全數消化完畢。** 後續 Guild 深化（好友系統/公會聊天頻道/raid 協力目標/後端多人真週榜 phase8 guild_econ）已記入 platform-modules 台帳與 #47 卡「下一步」，非插隊指令、由引擎常規排序處理。

### 已回應
<!-- 只放「對待處理指令的回覆」，最新在上；例行心跳一律寫 loop-journal.md -->
↳ (2026-07-30 遊戲軌·10:00 建置輪·消化船長 G5 之 2/3＋更正 G4 誤判) 建置輪（`build_lock=g-100451-2d96`；進場鎖乾淨、本軌 dark 11.6h 未達 catchup 24h，但 `lead_track=games` 下不讓路。媒體靜窗延續〔BigWinBoard/SlotCatalog 頂 07-23、下波 8/18-8/25〕→ 不硬擠新遊戲，改清船板遊戲軌品質債，質>量）。**① 輪盤大/小標反**：`table-roulette.js:48` 規則說明改正為「小(1–18)/大(19–36)」（歐式輪盤 1–18＝小、19–36＝大；下注格 spot 標籤本就正確「1–18」「19–36」無 大/小 字、故只錯在規則 modal 文案）。**② 百家對子 8 副靴**：`table-baccarat.js` 純數學 `dealWith` 由 with-replacement(無限牌組，對子 P=1/13=7.692%→RTP 12/13=92.31%) 升級為 **canonical 8 副牌靴(416 張)無替換發牌**（fresh shoe per coup＝百家一靴首局分布、比照龍虎鬥/安達巴哈；以「剩餘牌數均勻排名」逐張抽＝等價 Fisher–Yates 逐步、仍一牌一 HL.fair 浮點可事後重算、對玩家操作零變更）→ 對子 P=31/415=7.470%、RTP 372/415=**89.64%** 對齊真實 casino（差 2.67pp 修正）。順帶把賠付說明「同點」正名為「同數字(同 rank)」（K+Q 皆 0 點但非對子）。**RTP 重驗過閘**（require view module.exports＝驗的即玩的同一份 dealWith）：shipped dealWith **8M**〔閒 98.76%(Δ-0.006pp)/莊 98.95%(Δ+0.006)/和 85.67%(Δ+0.029)/閒對 89.70%(Δ+0.063)/莊對 89.63%(Δ-0.013)〕+ 分布等價 fast-model **20M×2 seed**〔對子 89.59%/89.54%、CI95<0.15pp〕，五注型皆 canonical 8 副靴 Wizard of Odds ±0.5pp 內且 ≤100% PASS、P(對子)實測 31/415、P(莊/閒/和)=45.86/44.62/9.52% 對齊、determinism 同 seed 5000 局逐局一致 PASS。**③ 更正 G4 誤判**：G4 稱「baccarat/roulette 仍 Math.random 故不列 🔒」為事實錯誤——baccarat 開牌走 `dealWith(()=>HL.fair.floatOr('baccarat'))`、roulette 走 `resolveFloat(HL.fair.floatOr('roulette'))`（G4 誤把 roulette line 132 的滾號視覺 Math.random 當結果來源），兩者皆過保真閘＝可驗證公平 → `game-frame.js` PF 白名單補列 baccarat/roulette，外框現顯 🔒。**驗證**（此 app 截圖/沙箱 preview 在 headless 排程輪不可達＝CLAUDE.md §9 驗證小抄情境）：3 檔 node --check 全 OK、baccarat 8M+40M MC 全過閘（見上）、PF `meta.key` 接線確認（roulette/baccarat wrap key 對映 whitelist）、外部呼叫者 streamer/liveroom 僅讀 o.winner/o.pt/o.bt 未破。sw.js v114→v115。**剩餘 G5**：③ 四款保真 slot 賠付表 UI（面積大、視覺回歸風險，留專輪/維護軌）。收尾清 `build_lock=false`。

↳ (2026-07-30 平台軌·消化船長 P1/P2/P4/P5 四項＋P3/P6 部分) 建置輪（`build_lock=p-091004-b3e7`；進場鎖乾淨、本軌 dark 19.9h 未達 catchup 24h，但 `lead_track=games` 下仍選擇做而非讓路——理由：**同輪 08:00 窗已到且 games 軌 07-29 三窗全數交付、無需讓火力**）。**調研**（`max_platforms_per_run: 2`）leovegas + toshi-bet 兩張 tier-2 逾期票。leovegas 淨新＝**no-wager free spins** ⇒ 揭露 `HL.bonus` **只支援「帶流水」單一紅利型別**的引擎缺口（要送零流水獎只能繞過引擎直接改餘額＝連帶繞過 source 標記與帳本），台帳「獎金/流水引擎」present→partial；toshi-bet **零新開卡**＝其 rakeback 無門檻+50% boost 訊號依去重紀律**歸併為既有卡 #52 的第三個平台共識**而非重複開卡。**台帳審 金流**（P1 指名、種子日後首次複查）：5 模組全部重寫 evidence，查獲 ① PSP 抽象層 grep 零命中、付款方式僅兩個純展示常數陣列 ② **提款是前端即時扣款**＝「提款審核佇列 absent」不是缺 UI 而是缺整條待審狀態機 ③ 「玩家間交易」舊述『無』已過期（`app-shell.js:158` 早有轉贈）④ **記帳失真：轉贈被記成 `withdraw`**（玩家互贈計為營運提款、汙染淨現金流/NGR，且收款方從未入帳＝幣是淨銷毀）→ 開卡 #56。**開卡 #55/#56，實作 #55**（見 P4 回覆）。**驗證**：preview 零 console error；DOM eval 逐項——註冊表 2→3 筆、收合 body display none↔flex、三面板桌機自動堆疊 right 16/388/760px（STACK_GAP 372 算術正確）、`ax:dock:v1` 座標持久化、手機路徑（clientWidth 覆寫 400）互斥只留 growth、**走真中央結算點** `liveStats.record("dice",5000,0)` → 季票 XP/成就點數/公會週貢獻三者同步跳動（4/30 階、60 點、NT$7,000）、FAB toggle 三態、三語（繁/簡/EN）逐字驗證、token 全部解析為具體值（gold #ffb524 / radius 8px / 13px·11px）、CTA `display:block` 但寬 78px 不撐長條、零水平溢出、progressbar role/aria-valuenow、CTA 可聚焦。**自身修掉兩處**（preview 首驗抓到）：經驗值誤用 `HL.dom.money` 冠上 NT$；CTA 在無進度條區塊貼在 inline `<small>` 後面。sw.js bump v112→v114。**引擎改進點**：本輪為面板加了**資料指紋**（三模組狀態 hash），5 秒 tick 僅在進度真變時重繪——除了省 DOM churn，更關鍵是避免「每次重繪產生繁中節點再被 walker 翻回 EN/簡中」導致非繁中語系每 5 秒閃一次原文（這是任何『定時重繪 + DOM walker 翻譯』面板的通病，後續類似面板請比照）。收尾清 `build_lock=false`。

↳ (2026-07-30 維護軌·00:09 catchup 輪) 消化 **[M1] 完成 + [M2] 完成**（build_lock=m-000921-64d4；本軌 last_maintain_run_at 停 07-28T12:20＝dark 35.8h>24h→catchup 禁讓路、必補課；進場 build_lock=false 乾淨、平台/遊戲軌 07-29 已正常收尾＝07-28→29 那把凍結 h- 鎖死結已由人工 commit `242987b` 解除）。**[M1]**：健檢「db/ 新鮮度」連 6 輪誤報「未大面積 stale」的三病根＝① 判的欄位名錯（SKILL 舊述 `last_verified`，`platforms.json` 實為 `next_due`/`last_investigated`）② 「大面積」無門檻＝每輪目測 ③ 未排除已停運站。已把 SKILL 第 2 步改為**可重現 node 一行**（排除 `popularity_note` 含 DEFUNCT/已停運/死站 或 `refresh_interval_days>=180` 的 park 站）+ 門檻（live 逾期率>30%／tier-1/2 逾期>7d／provider·games-catalog>stale_days→警報 ON）+ **強制在 journal 記實測百分比**（禁「未大面積 stale」空話）。**本輪實測 live 逾期 12/31=39%**（1 defunct=mega-frenzy 排除）：worst=**leovegas(tier-2, 6d 逾期)**、shuffle/gamdom/duelbits(tier-3, 4d)、餘 8 站 1d——**非 M1 寫的 81%**（那是 07-28 值，平台軌 07-27/28/29 三輪已把 tier-1/2 刷回 08-03~08-12）。⚠️ 仍點名平台軌：**leovegas 為 tier-2 卻逾期 6 天**（次逾期最久），建議下輪平台軌優先刷。**查證副產品**：原疑 mega-frenzy `next_due:2027-07-05` 為 typo，**經讀 dossier 確認係 2026-04 已停運死站刻意 park 於 365d 輪替**（E5 先驗後改＝未誤改）。**[M2]**：`DEBT.md:4`（consolidate skill+`mode` 控比重）／`BACKLOG.md:6`（radar/investigate/evolve 三 skill+consolidate）／`BACKLOG.md:8`（`mode` 決定比重）／`BACKLOG-archive.md:4`（evolve/consolidate 追加規則）四處**現行規則頭部**皆為 2026-07-23 三軌重構前舊治理→據實更正為三軌雙線（platform/games/maintain）+ `lead_track`；**下方帶日期的分析師日誌舊條目（如「2026-06-26 evolve」）係當時實況歷史稽核，明確保留不改**。開卡 E9（引擎可靠度）記錄本次消化、標✅完成。**剩餘維護軌待處理**：M3（4 張 M/L 重債專輪）、M5（reports/ 除役 or 恢復）、M6（1.22MB/88 script 門檻）；M4（心跳紀律）本輪已遵守（心跳寫 journal、CONTROL 只回指令）。純文件/邏輯、零 prototype/ code、零視覺回歸、無需 preview。收尾清 build_lock=false。（build_lock=g-220437-a3f1；媒體靜窗延續〔BigWinBoard/SlotCatalog 頂 07-23，下波 8/18-8/25，16:00 輪已確認〕→ 不硬擠新遊戲，改清船板遊戲軌契約/入口債，質>量）。**[G2]**：`table-dragon-tiger.js` 是 12 款過閘遊戲中唯一無法 node require 者——檔頂 `var el=HL.dom.el` 在 node 無 `HL` 即炸、且無 `module.exports`，使其「驗的即玩的同一份數學」宣稱機械上不成立（契約破口）。已**比照其餘 11 款重構**：加 `var isNode=typeof module!=="undefined"&&module.exports`、`HL=!isNode?…:null`、純數學區（`cardOf`/`resolveRound(next)`/`returnsOf`）上移並以 `var CORE={…};if(isNode){module.exports=CORE;return;}HL.dragonTiger=CORE` 暴露、`var el=HL.dom.el,money` 移至早退後、IIFE 結尾改 `(typeof window!=="undefined"?window:this)`；瀏覽器 `deal()=resolveRound(()=>HL.fair.floatOr('dragon-tiger'))` 保留可驗證公平。**node 驗證器實跑**（scratchpad verify-dt.js）：require OK（keys=cardOf,resolveRound,returnsOf,RANK_LABELS,SUITS）＋ **20M 蒙地卡羅（seed 0x51ce）交叉精確解析**（8 副靴 P(tie)=31/415、P(win)=192/415、P(suited)=7/415）：dragon 96.271%/tiger 96.262% vs 解析 96.2651%（Δ<0.007pp）、tie 67.199% vs 67.229%、suited 86.064% vs 86.024%，四注型皆 <0.5pp PASS；決定性（同 seed 重算一致）PASS、靴 rank 各 32/suit 各 104 均勻 PASS。契約恢復。**[G4]**：`game-frame.js` 的 PF 白名單（決定外框是否顯 🔒 可驗證公平）先前只有 pirots，其餘過閘 HL.fair 遊戲拿不到入口。已補 6 款：dead-by-noon/golden-toad/dragon-tiger/sic-bo/andar-bahar/money-wheel（全接 `HL.fair.floatOr`、node 驗證器可重現）。**preview 逐款驗證**（`?demo=1`、零 console error）：7 款 gate-passed HL.fair 遊戲外框 🔒 全部出現、baccarat 正確**無** 🔒（仍 Math.random 未過閘、G5 另有 side bet RTP 議題）。sw.js bump v111→v112。catalog dragon-tiger 條目補記 G2 修復＋node 驗證數字。**剩餘遊戲軌待處理**：G5（輪盤大/小標反、baccarat 對子 side bet 無限牌組 RTP 92.31% vs 真 8 靴 89.64%、四 slot 無賠付表 UI）留後續遊戲輪。**下一 games 輪**：恢復 media 取材（8/18-8/25 新品波）或消化 G5 或旗艦 shadow-ritual 接 HL.fair+RTP 模型（剩餘最大真缺口）。收尾清 build_lock=false。
↳ (2026-07-29 遊戲軌·16:00 建置輪) 消化 **[G1] 完成 + [G3] 完成**。**[G1]**：Plinko 先前 11/13 FAIL（買桶乘數表捨入使 16med raw-MC 報 100.29%＝玩家有利）卻仍在線、`games_rejected_by_gate` 停 0。① 修 `instant-games.js` buildTable＝讓『中央槽』吸收捨入殘差（floor＝莊家安全側），邊緣槽保留漂亮行銷值 → 9 configs **exact RTP [98.81%,99.10%]、每型 ≤100%、|Δ99%|≤0.188pp**（node 驗證器同一份 module.exports exit 0、browser==node、preview 零 error）；catalog plinko 標 **13/13 PASS**、status→built。② FAIL 計數落實：`games_rejected_by_gate` 0→1（追記 Plinko 07-28 之 FAIL）。**[G3]**：Plinko 正是「raw MC @1e6 測不動」的實例（16high 頂桶 25031×、raw-MC 曾報 102.4% 純雜訊）→ 改用**精確解析式**（桶 k＝二項 C(n,k)/2^n、RTP=Σp·m 零抽樣誤差）+ MC 分布吻合檢查佐證；`game-fidelity-spec.md` 第 1 項據此改寫（無解析式的高波動遊戲改用 CI 收斂 `N≥(1.96·SD/0.005)²`）；CONTROL 新增 `fidelity_rtp_ci95_max_pp: 0.5`。**剩餘遊戲軌待處理**：G2（dragon-tiger 補 module.exports/DOM guard）、G4（game-frame PF 白名單補其餘 9 款過閘遊戲的 🔒 入口）、G5（輪盤大/小標反、baccarat 對子 side bet 無限牌組 RTP、四 slot 無賠付表 UI）留後續遊戲輪。

↳ (2026-07-26 遊戲軌·第七款保真遊戲＝SLOT 品類第三款保真 slot) lead_track=games 第三次同日 firing（22:00、build_lock=g-220622；遵 07-25 build→research→build 先例：10:00 已建 dead-by-noon、16:00 研究輪確認 media 靜窗→本輪不重刷 media 避空心跳，直接建置）。**產出 金蟾聚寶 Golden Toad（`slot-golden-toad.js`）＝games 軌第七款過保真閘、SLOT 品類第三款保真 slot**。**Hold & Win 鎖定重旋**＝ApexWin 全新 slot 互動維度（業界近五年最紅子機制、平台完全缺；與 pirots 網格收集、dead-by-noon 連消串接皆不同）：5×3·10 線，base ≥6 🪙金幣觸發（約 1/98）→鎖定金幣、3 次重旋、落新幣重置回 3、加總金幣現金值、滿盤(15) 再加 GRAND +200×。原創主題（金蟾）、忠實復刻業界標準 Hold & Win 格式（比照 money-wheel 忠實 Dream Catcher 格式）。複用 `HL.instant.betPanel`+`HL.fair`（一注一浮點→mulberry32 決定整局可重算）。**保真閘 13/13 PASS**（crash 專屬項 N/A）：**100M 蒙地卡羅 RTP 96.4423%（±0.23pp）vs 宣告 96.3%（Δ0.14pp、±0.5% 內）**、交叉 60M 96.2077%；base 11.19%+bonus 85.25%、SD 11.6、hit 26.2%、觸發 1/98、滿盤 GRAND 1/703、實測 max 602×；純數學 `module.exports` 供 node 驗證器＝驗的即玩的（`HL.goldenToad`）；preview 零 console error（v98）+ e2e（base spin 走 `liveStats.record('golden-toad')` 中央點通吃 VIP/任務/返水/JP/帳本、buy 87× 扣 4350→bonus 開 64×=3200 net -1150 精準）+ determinism 200 seed/evalLines/滿盤/觸發門檻 JS eval 逐項 PASS。sw.js bump v97→v98。**買入公平性**：87×＝買入 RTP 95.9%（E[bonus]=83.4×/87≈base，修正首版 100×=83% 暗虧）。**設計取捨**：未選旗艦 shadow-ritual 全面 retrofit（評估為多輪 heavy build：純數學全重寫+RTP 開放式調參+改 showcase 高回歸風險），改做加性零回歸的完整交付（質>量、不倉促改旗艦、不帶 FAIL 上線）。**引擎改進點（記入 games-catalog）**：Hold & Win 這類『rare-trigger×big-bonus』RTP 對 coinWt 極敏感（~5pp/0.2wt）需大樣本 pin；slot 保真閘應新增『bonus-buy RTP≈base 非坑』檢查項。**至此 games 軌七款保真＝SLOT×3(Pirots/Dead By Noon/Golden Toad)+TABLE×3(龍虎鬥/骰寶/安達巴哈)+GAME-SHOW×1(轉盤)。下一 games 輪**：恢復 media 取材（拉 > bigwinboard/slotcatalog 07-23、下波 8/18-8/25）或旗艦 shadow-ritual 獨立 retrofit 輪（接 HL.fair+RTP 模型＝剩餘最大真缺口）或補 slot 子維度(cluster/quantum·megaways)。收尾清 build_lock=false。
↳ (2026-07-26 遊戲軌·第六款保真遊戲＝SLOT 品類第二款保真 slot) lead_track=games 建置輪（10:00 firing、build_lock=g-100452）：開場重刷 media（BigWinBoard/SlotCatalog 仍頂 07-23＝**靜窗延續**，下一波大 releases 排 8/18-8/25，無新頂級候選）→照 auto_implement 直接建置 catalog 最高複合分未復刻 **Dead By Noon（Hacksaw，`slot-dead-by-noon.js`）**＝games 軌第六款過保真閘、**SLOT 品類第二款保真 slot**（補 pirots 後 slot 縱深、對真實 casino 80% 為 slot 的結構性缺口）。**Multiplier Chamber 彈膛「數字串接」**（Poker Chip 落盤化 Wild 露 1-9→盤上由左到右串接 2·5·1→×251 非相加）＝ApexWin 全新 slot 互動維度；Row Cascade（中獎移除最底列下落補新）、生死決鬥 8/神槍手 10 免費（保證彈膛）、buy 80×。5×4·14 線，複用 `HL.instant.betPanel`+`HL.fair`（一注一浮點→mulberry32 決定整局可重算）。**保真閘 13/13 PASS**（crash 專屬項 N/A）：**180M 蒙地卡羅 RTP 96.3334%（±0.54pp 95%CI）vs 宣告 96.27%（Δ0.06pp、±0.5% 內）**、交叉 100M 96.13%/150M 96.06% 皆帶內；SD 36.1、hit 22.5%≈宣告 21.9%、max 10000× 可達 1/180000（cap 貢獻 5.56pp）；純數學 `module.exports` 供 node 驗證器＝驗的即玩家玩的同一份（`HL.deadByNoon`）；preview 零 console error + determinism 200 seed（可驗證公平）/彈膛串接 2 chips→×11/evalLines 5oak/NANF timeline JS eval 逐項通過。結算走 `HL.instant.betPanel`→`liveStats.record` 中央點通吃 VIP/任務/返水/JP/帳本。sw.js bump v95→v96。**引擎改進點**：高波+10000× 重尾 slot 的 RTP 蒙地卡羅精度受樣本限制（`fidelity_min_rtp_sims=1M` 對 SD 36 不足以 ±0.5% 收斂，需 100M+），應隨波動/max-win 調高；串接類機制須主動壓 tail 貢獻保可驗證性。**至此 games 軌六款保真＝SLOT×2(Pirots/Dead By Noon)+TABLE×3(龍虎鬥/骰寶/安達巴哈)+GAME-SHOW×1(轉盤)。下一 games 輪**：恢復 media 取材（拉 > bigwinboard/slotcatalog 07-23）或深化 GAME-SHOW(Crazy Time 風)/補 slot 子維度(cluster/megaways/hold&win)。收尾清 build_lock=false。
↳ (2026-07-25 遊戲軌·第五款保真遊戲＝完成 TABLE 縱深) lead_track=games 建置輪(22:00 firing)：復刻 catalog 明列 TABLE 第三補位 **安達巴哈 Andar Bahar `table-andar-bahar.js`**＝games 軌第五款過保真閘遊戲、**TABLE 縱深補齊**(百家/輪盤/龍虎鬥/骰寶/安達巴哈五桌)。印度/南亞國民牌戲:翻「莊牌 Joker」定目標點數→交替往 Andar(先發)/Bahar 兩堆發牌,先出現同 rank 者該側贏。**ApexWin 桌遊全新「發牌循環+懸念累積」節奏**——每局發牌張數不固定(min 1/avg 13/max 49),不同於百家/龍虎鬥固定張數,每張都可能配對故張力隨發牌累積。複用 `HL.table.betArea`(五桌已驗)+ `HL.fair`(先抽莊牌⌊f×52⌋、再逐張均勻抽剩 51 張交替發=等價 Fisher–Yates 逐步、可事後重算)。**canonical 賠率不對稱**:Andar 0.9:1(退 1.9×)、Bahar 1:1(退 2.0×)——先發側多一奇數發牌位、勝率略高(51.50%)的進場優勢對價,非暗地扣付。**保真閘 13/13 PASS**(slot/crash 專屬項 N/A):20M 蒙地卡羅 **Andar 97.8831%/Bahar 96.9652%** 皆宣告 ±0.5% 內、**精確解析 P(Andar)=0.515006/P(Bahar)=0.484994** 交叉== Wizard of Odds(edge 2.15%/3.00%);純數學區 `module.exports` 供 node 驗證器＝驗的即玩家玩的同一份(`HL.andarBahar.resolveRound/returnsOf/cardOf`);平均 12.999 張/局(解析 E≈13)、min1/max49 有界、0 次 guard 空轉。preview 零 console error + end-to-end 實測(下注 100 於 Andar→翻莊牌 4→交替發 21 張→Andar 配對贏、餘額 28560→28460 扣注→28650 派彩=190=本金+90 淨利 0.9:1 精準、莊牌顯示、中獎側金框、中獎格 is-win、路紙珠、解鎖)通過。結算走 `HL.table.betArea`→`liveStats.record` 中央點通吃 VIP/任務/返水/JP/帳本。sw.js bump v93→v94。**至此 TABLE 補位候選(dragon-tiger/sic-bo/andar-bahar)全數消化。下一 games 輪建議恢復 media 取材**(拉日期 > bigwinboard 07-23/slotcatalog 07-23 新品)或深化 GAME-SHOW(Crazy Time 風多獎段,money-wheel 已鋪轉盤+乘數重轉底座)。收尾清 build_lock=false。
↳ (2026-07-25 遊戲軌·第四款保真遊戲＝首款 GAME-SHOW 品類) lead_track=games 建置輪：**開新品類**——復刻 canonical Evolution Dream Catcher 現金轉盤 **幸運轉盤 Money Wheel `table-moneywheel.js`**＝games 軌第四款過保真閘遊戲、**ApexWin 首款 GAME-SHOW 大轉盤**（填 casinoCats 早已宣告卻空白的『遊戲節目 gameshow』分類——原僅 6 張 comingSoon 佔位 Crazy Time/Monopoly…，本作為首款可玩；修正頭三輪 SLOT/TABLE 傾斜）。複用 `HL.table.betArea`（百家/輪盤/龍虎鬥/骰寶已驗）+ `HL.fair` 每次旋轉取一浮點→⌊f×54⌋ 選段。**54 段 canonical**（1×23/2×15/5×7/10×4/20×2/40×1/×2乘數×1/×7乘數×1）忠實對標；**乘數段重轉累乘**＝ApexWin 首個「事件驅動重轉」機制（轉到 ×2/×7→全注保留、累乘、再轉，可連乘）。**保真閘 13/13 PASS**（slot/crash 專屬項 N/A）：RTP 20M 蒙地卡羅六號碼皆宣告 ±0.5% 內，六 house edge **逐項==Wizard of Odds**（1=4.66%/2=4.49%/5=8.76%/10=3.42%/20=7.26%/40=9.19%），解析式 RTP(N)=s_N/52+N·s_N/45 交叉一致；乘數命中率 3.704%≈2/54、平均 1.0385 旋轉/局。純數學區 `module.exports` 供 node 驗證器＝驗的即玩家玩的同一份（`HL.moneyWheel.resolveRound/returnsOf`）。preview 零 console error + end-to-end 實測（六號碼各下 50→旋轉開出 1→號碼1 贏賠 1:1、餘額 50000→49700 扣注→49800 派彩、中獎格金框、路紙珠『1』、解鎖）通過。結算走 `HL.table.betArea`→`liveStats.record` 中央點通吃 VIP/任務/返水/JP/帳本。sw.js bump v91→v92。**下一 games 輪建議恢復 media 取材**（拉日期 > bigwinboard 07-23/slotcatalog 07-15 新品）或深化 GAME-SHOW（Crazy Time 風多獎段 bonus wheel，本作已鋪轉盤+乘數重轉底座）/補 andar-bahar(66)。收尾清 build_lock=false。
↳ (2026-07-24 遊戲軌·第三款保真遊戲=TABLE 第二補位) lead_track=games 建置輪：復刻 catalog 明列的 TABLE 第二補位 **骰寶 Sic Bo `table-sicbo.js`**＝games 軌第三款過保真閘遊戲、**首個「骰類 bet-area」新維度**（現有 TABLE 百家/輪盤/龍虎鬥皆發牌，骰寶是三骰多下注區）。複用 `HL.table.betArea` 引擎（百家/輪盤/龍虎鬥已驗）+ `HL.fair` 擲三骰（一局取三浮點→⌊f×6⌋+1，比發牌更純數學、可驗證公平契合度最高）。**35 下注格**忠實對標 live-casino canonical 賠付（Wizard of Odds 交叉）：大/小 1:1 逢圍骰輸（edge 2.78%/RTP 97.22% 頭條主注）、全圍 30:1、指定圍骰×6 180:1、單骰×6（出現 1/2/3 次→1/2/3 倍）、對子×6 10:1、總點 4-17 逐點（60/30/17/12/8/6:1）。**保真閘 13/13 PASS**（slot/crash 專屬 4 項 N/A）：RTP 以 **216 精確窮舉（解析式 exact）+ 20M 蒙地卡羅交叉**，每格皆宣告 ±0.5% 內；純數學區 `module.exports` 供 node 驗證器＝驗的即玩家玩的同一份；preview 零 console error + end-to-end 實測（下注 100 於小→搖骰 1·2·4=7 小→贏 +100、餘額 28560→28660、路紙珠『小』、解鎖）通過。結算走 `HL.table.betArea`→`liveStats.record` 中央點通吃 VIP/任務/返水/JP/帳本。sw.js bump v89→v90。**至此 TABLE 縱深補齊**（百家/輪盤/龍虎鬥/骰寶）＝修正頭兩輪 all-SLOT 傾斜。**剩餘 TABLE 補位**：andar-bahar(66,印度發牌循環);下一 games 輪建議恢復 media 取材(拉 > bigwinboard 07-23/slotcatalog 07-15 新品)或補 GAME-SHOW 品類。收尾清 build_lock=false。
↳ (2026-07-24 遊戲軌·第二款保真遊戲=首款 TABLE 擴充) lead_track=games 建置輪：復刻 catalog 明列「下一款 TABLE 建置」的 spec-ready 候選 **龍虎鬥 Dragon Tiger `table-dragon-tiger.js`**＝games 軌第二款過保真閘遊戲、**首款 TABLE 品類擴充**（補百家樂/輪盤後的桌遊縱深、修正頭兩輪 all-SLOT 傾斜）。複用 `HL.table.betArea` 引擎（百家樂/輪盤已驗）+ `HL.fair` 發牌（一局取兩浮點→8 副牌靴 416 張 skip-technique 抽兩張不重複，可事後重算）。忠實對標 live-casino 標準：龍/虎 1:1 平手退半(edge 3.735%/RTP 96.265%)、和 8:1(edge 32.77%)、同花和 50:1(edge 13.98%)；A 最小→K 最大(龍虎鬥核心規則)。**保真閘 13/13 PASS**：RTP 20M 蒙地卡羅每注型皆 ±0.5% 內(dragon 96.245%/tiger 96.281%/tie 67.260%/suited 86.181%)+解析式交叉一致、preview 零 console error、end-to-end 實測(下注→發牌龍5:9虎→虎贏→紅字結算+金框高亮+路紙珠+解鎖)通過。結算走 `HL.liveStats.record` 中央點通吃 VIP/任務/返水/JP/帳本；複用共用 `.ax-card` 撲克牌 primitive。sw.js bump v88→v89。**剩餘 TABLE 補位候選**：sic-bo(70,三骰多下注區)、andar-bahar(66,印度發牌循環);下一 games 輪可恢復 media 取材(拉 > bigwinboard 07-23/slotcatalog 07-15 新品)。收尾清 build_lock=false。
↳ (2026-07-24 遊戲軌·首款保真遊戲) 已服從船長「切 lead_track: games、出第一款保真遊戲（指定 Pirots 5）」：實作 **Pirots 探險 `slot-pirots.js`**＝games 軌**首款過保真閘的遊戲**、ApexWin 全新「網格收集」互動維度。忠實復刻 ELK Pirots 5 玩法：6×6 網格鳥收集連通同色≥6→cascade→漸進乘數→集滿擴張 6→8、⭐×3 免費遊戲乘數持續暴走(+retrigger)、X-iter buy 100×。**保真閘全過**：RTP 96.145%(20M 蒙地卡羅、累計 40M+ 校準、±0.5% 內)、SD≈28 高波動、max 10000× 實測可達、13 項上線閘全 PASS、preview 零 error、HL.fair 一注一種子可驗證、中央掛鉤 liveStats.record。**引擎改進點(記入 games-catalog)**：`fidelity_min_rtp_sims:1000000` 對此波動級不足(需 30M+ 才 ±0.3%)，未來應隨宣告波動調高最低模擬數。收尾清 build_lock=false。
↳ (2026-07-24 平台軌·次優先候選消化 3/3＝全數完成) 已服從三候選之最後一項 **Guild/公會 meta**，本輪實作 **#47 團隊/公會 meta `HL.guild`**（`core/guild.js`）＝**依船長建議「先做純前端骨架：隊伍容器 + team-vs-team 掛中央結算點」**：資料驅動公會『註冊表』`register(spec)`（比照 `HL.games`/`HL.achievements` 自我上架、種子 6 公會），玩家加入一公會→有效押注經中央結算點 `HL.liveStats.record` 尾端 `record(bet)` 累積週貢獻。**team-vs-team 週榜**（對手隊/隊友為確定性種子模擬、同週穩定，`isLive()` 閘＝真站整批歸零只留玩家真實貢獻，比照 tournament/arena bot）；**兩獎勵路徑**入 `HL.bonus`（帶 source 入帳本）：① 個人貢獻任務 4 階里程碑（冪等 per week）② 跨週 `weekNum()` 週榜結算派團隊獎金（冪等 per week，比照 `tournament.settle`）。面板 `HL.ui.modal` wide（未入會→6 公會瀏覽卡；已入會→儀表板/週榜/隊內貢獻榜/任務 chip/換公會/退出），入口掛福利中心 hub「成長·商城」。站別命名空間隔離。preview 零 console error（先清 SW `apexwin-v85` 舊快取避免 404）；JS eval 逐項驗（6 註冊、未入會不累積、經真中央點 +3000 精準、貢獻 6k→1 可領/claim 冪等/未達擋、isLive 閘 totalGuilds 6→1 切回復原 6、leave→joined=false、面板 6 瀏覽卡/週榜 6 列 1 is-mine/4 任務/1 可領/隊友含「你」/header 正確）。platform-modules「團隊/公會 meta」absent→partial。**至此 07-23 待處理次優先三候選（#45 徽章牆 + #46 季票 + #47 公會）全數落地**，三者同構資料驅動註冊表家族。**下一步深化**：好友系統/邀請入會、公會聊天頻道（掛 `HL.dock`）、公會 raid/協力目標、後端多人真週榜（phase8 `guild_econ` 依站別）。
↳ (2026-07-24 平台軌·次優先候選消化 2/3) 已服從次優先三候選之最後可純前端落地者，本輪實作 **#46 季票 Season Pass `HL.season`**（`core/season.js`）：**config 驅動雙軌季票外殼**（擴充性優先＝一份 SEASON 設定就是可換的 config 排程、`setSeason` 出口、`state.sid` 不符即換季重置、tiers 純資料 30 階）；免費軌人人可領 + **進階軌花費「成就點數」解鎖**＝直接消耗 #45 `HL.achievements` 鋪的 XP 底座（**兩張成長卡串成 XP 經濟閉環**）、解鎖後回溯領已達階級；賽季經驗由中央結算點 `HL.liveStats.record` 尾端有效押注累積、跨階即時通知；階梯獎勵入 `HL.bonus`（帶 source 入帳本、走 locked 待解鎖與 #45 一致、真站 8× 流水鎖）。面板＝`HL.ui.modal` wide 資料驅動雙欄階梯（四態 chip + 逐階/一鍵領取 + 進階解鎖 CTA），入口掛福利中心 hub「成長·商城」。站別命名空間隔離（比照 VIP/成就）。preview 零 console error；JS eval 逐項驗（中央點 4500 wager→Tier 3、claim 三閘皆擋、unlockPrem 恰扣 60 點且回溯開放、claimAll 清空、六階獎金 180/1200/2500·480/3600/30000 精準落 locked 錢包、面板 30 階/60 chip/7 可領 button 渲染正確）。platform-modules「季票/battle-pass 化外殼 Season Pass」absent→present。**剩餘候選**：僅 **Guild/公會 meta**（radar 連 7 輪最強空缺、業界仍空白；需社交層、部分需後端 → 建議下輪先做純前端骨架：好友/隊伍容器 + team-vs-team 掛 `HL.liveStats.record` 中央點，比照 dock/achievements 的資料驅動註冊）。
↳ (2026-07-23 平台軌·次優先候選消化 1/3) 已服從次優先三候選，本輪實作 **#45 成就徽章牆 `HL.achievements`**（`core/achievements.js`）：資料驅動成就註冊表(register(spec) 比照 HL.games 自我上架、19 枚×6 分類×4 分層)、掛中央結算點 liveStats.record 累積終身統計即時解鎖、發**成就點數(XP 底座，特意為未來 Season Pass 鋪路)**+獎金入獎金錢包、忠誠類即時讀 VIP/簽到、徽章牆 modal+福利中心入口。preview 零 error、JS eval 逐項驗證(解鎖/獎金/進度/冪等/中央點驅動/test 型忠誠即時解鎖皆精準)。platform-modules 新增獨立模組「成就徽章牆」status=present。**剩餘兩候選**：Guild/公會 meta（需社交層，較重、部分需後端可先做純前端骨架）、Season Pass 季票（現可疊在本輪成就點數 XP + 既有 VIP/連登骨架上，門檻低、建議為下一張平台卡）。
↳ (2026-07-23 平台軌·首張平台卡) 已服從「起步優先＝平台功能先，先做可收納/自由擺放的容器底座」：實作 **#44 `HL.dock` 模組化/可停靠佈局底座**（`prototype/src/layout/dock.js`）——資料驅動面板註冊表，任何未來功能面板一行 `HL.dock.register(spec)` 即獲 開/關/**收合(可收納)**/**桌機拖曳自由擺放**/自動堆疊/**跨站持久佈局**/手機互斥；既有夥伴+聊天已改掛（保留 `HL.panels` 舊 API 零改動）。platform-modules 台帳 Dockable Layout：absent→partial。preview 驗證零 error（桌機路徑經 clientWidth 覆寫逐項驗：堆疊/收合/拖曳持久/relayout 保留座標皆精準）。**下一步容器化**：把主內容區(大廳/儀表板) widget 納入 grid slot 引擎、面板↔停靠列吸附、多佈局 preset。次優先三項(Guild/徽章牆/Season Pass)仍在待處理。
↳ (2026-07-23 重構) 引擎從四軌改三軌雙線：見本檔頂部說明 + intel/README.md + intel/db/。舊四軌 skill(radar/investigate/evolve/consolidate)已由 platform/games/maintain 三軌取代；資料庫層 intel/db/ 新建(platforms/platform-modules/providers/games-catalog + game-fidelity-spec + sourcing-methods)。
↳ (2026-07-17 打磨) E2 落地：原累積於此的 103 筆例行心跳已全數搬到 [loop-journal.md](loop-journal.md)。此區今後只放「對上方待處理指令的回覆」；例行心跳請看 loop-journal.md（最新在上）。
