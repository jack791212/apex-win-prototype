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
build_lock: false           # ← p-125630-4c7e（平台軌 07-29 12:49 catchup 建置輪）已於 14:05 收尾釋放。
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
- [G1] **Plinko 已被判 FAIL 卻仍在線上可玩**，且 `counters.games_rejected_by_gate` 仍為 0 ——閘對 FAIL 的「處置 + 計數」兩件事都沒落實。請：修 Plinko 至過閘（或下架），並讓 FAIL 真的會 +1 計數。
- [G2] **`table-dragon-tiger.js` 無 `module.exports`／DOM guard，node 無法 require** → 它宣稱的「驗的即玩的同一份數學」無法機械重現。比照其他 11 款補上（複驗判 medium，非緊急但屬契約破口）。
- [G3] **`fidelity_min_rtp_sims: 1000000` 與實務脫節**：實測 dbn 單注 SD≈36.5，1M 樣本 CI95 高達 ±7pp（連 7pp 的錯都測不出）。建議改為「以收斂為準」：新增 `fidelity_rtp_ci95_max_pp: 0.5`，先跑 1M 量 SD、再由 `N ≥ (1.96·SD/0.005)²` 決定正式樣本數（1M 僅作下限）。**這是連續三輪自己寫下卻從未落實到設定檔的改進點。**
- [G4] 保真閘白名單只補了 pirots：`prototype/src/views/game-frame.js` 的 PF 表**其餘 9 款新過閘遊戲未收**，拿不到外框 🔒 可驗證公平入口。
- [G5] 小瑕疵：輪盤規則說明「大/小」標反（大(1–18)/小(19–36)）與下注格及華語慣例相反；百家對子 side bet 用無限牌組取牌，RTP 92.31% 與真實 8 副靴 89.64% 差 2.7pp 但 catalog 當 canonical 陳述；四款保真 slot 皆無賠付表 UI。

**平台軌**
- [P1] **台帳 8 分類只審過 4 個，31/45 模組（69%）自 07-23 種子日起從未複查**，檔案卻掛 `updated: 2026-07-28`＝新鮮度假象。請把未審分類（含資安/金流）排進輪替。
- [P2] **台帳謊報**：`導覽殼層 App Shell` 仍寫「≤720px 手機無法切主分頁」，但該缺口早在 **2026-07-10** 就已修好（底部列）。請據實更正 status/evidence。同時「大廳 ~140 死佔位卡」實測僅 51 筆登錄（49 非 playable），數字要更正。
- [P3] **`#45–#49` 連 5 個平台模組 i18n 字典零覆蓋**（平台軌只出繁中成品，維護軌把 i18n 火力全放在 slot）。請補 EN/zh-Hans，或改由平台軌自己在落地時同步補。
- [P4] **`#44 HL.dock` 容器底座建成後零新註冊者**：#45–#49 五個功能面板全部繞道自刻 modal，「先做容器再填功能」原則名存實亡。請至少把其中一兩個改掛 `HL.dock.register`，證明底座可用。
- [P5] `high_water_dossier_date` 已死鎖 19 天（SKILL 第 5 步明文要求每輪回填卻四輪皆未執行）。**若此欄位在三軌架構下已無實際用途，請正式廢除並從 STATE/SKILL 移除**；若仍有用則修好它。二選一，別再放著。
- [P6] 調研逾期債累積：6 檔逾期、tier-3 三檔已 32 天未刷，刷新速率追不上到期速率；`platforms.json` 81% 逾期。請調整節流或 `stale_days`，讓警報不再長亮（長亮＝被當噪音）。
- [P7] `providers.json` 有 20/27 筆無 `last_verified` 欄位 → 逃生閥②的重驗佇列永遠碰不到它們。

**維護軌**
- [M1] **引擎健檢連 6 輪誤報「db/ 未大面積 stale」**，實際 81% 平台逾期——該響的警報從未響過。請修健檢的判定邏輯（且新職責見 SKILL 第 7 點）。
- [M2] `DEBT.md` / `BACKLOG.md` 頭部說明仍描述 **07-23 已廢除的舊治理**（consolidate skill、`mode` 開關、radar/investigate/evolve）。請更新。
- [M3] **結構性偏食**：4 張 M/L 級 `🏗️進行中` 重債長期未動，逃生閥從未被實際演練。請排一輪專門啃重債。
- [M4] 心跳紀律回歸（E2）：多輪例行心跳被誤寫進 `CONTROL.md`「已回應」區（本檔已被灌到單行破 1500 字），且 07-24 平台軌兩張卡 commit 了卻在 journal 查無心跳。**例行心跳一律寫 loop-journal.md**。
- [M5] `intel/reports/` 已實質退役卻仍被 CLAUDE.md 列為「判斷引擎在跑」的稽核訊號；`games_researched` 計數帳目不可追溯。請擇一：恢復使用或正式除役。
- [M6] 觀測點：無打包架構已達 **1.22 MB / 88 個 `<script>`**，首屏成本開始線性成長（現階段可接受，但請設一個門檻並在超過時提報）。

- (2026-07-23) 平台軌次優先候選：radar 長期點名卻沒人做的高價值缺口——~~團隊/公會 meta~~(✅ 2026-07-24 #47 已做純前端骨架)、~~成就徽章牆~~(✅ 2026-07-23 #45 已做)、~~季票/battle-pass 化外殼~~(✅ 2026-07-24 #46 已做)。**三候選全數消化完畢。** 後續 Guild 深化（好友系統/公會聊天頻道/raid 協力目標/後端多人真週榜 phase8 guild_econ）已記入 platform-modules 台帳與 #47 卡「下一步」，非插隊指令、由引擎常規排序處理。

### 已回應
<!-- 只放「對待處理指令的回覆」，最新在上；例行心跳一律寫 loop-journal.md -->
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
