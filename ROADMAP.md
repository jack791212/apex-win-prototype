# ApexWin 產品路線圖 / Backlog

來源：對標全球頂級線上博弈平台的缺口分析（10 領域）。核心策略：**把「結構完整、引擎中空」的死按鈕逐一通電**，純前端就能把體驗完整度大幅拉升，零真金依賴。
優先級原則（使用者定）：**體驗完整度 + 開發速度 > 資安/合規**；需真錢/牌照才有意義的功能一律延後。

每日由 Routine「ApexWin 每日下一步分析」更新建議；**實作與否由使用者批准**。

---

## ✅ 已完成
- **目標2 同仁自製遊戲放置區**：遊戲登錄表 + 動態載入 + community 放置區 + Dev Kit（含 hl-stub 離線開發、pack-devkit.ps1 打包、版本號）。
- **虛擬主播**：整頁直播間 + 子母畫面 PiP + 跟注（Demo 結算）。
- **雙金流抽象**：休閒/真金模式切換、錢包 UI（提款待牌照閘控）。
- **Wave 1 留存基礎（2026-06-22）**：收藏/我的最愛（localStorage 持久 + 大廳分頁/專區）、每日簽到 streak（7 天循環、發遊戲幣）、底部「每日任務/獎勵中心」通電、縮圖 lazy-load。

## 🟢 NOW（純前端 · S · 把死按鈕變真功能）
- [ ] 遊戲卡「試玩 / 真錢」雙模式按鈕與標示
- [ ] 搜尋強化：排序（熱門/新/A-Z）+ 防抖 + 最近遊玩
- [ ] i18n 輕量引擎 + 語言切換器（接 header 🌐，目標3）
- [ ] 通知中心（接 header 🔔 badge）
- [ ] 分享單局戰績（Web Share API）

## 🟡 NEXT（引擎 + 擴充遊戲 · M）
- [x] 統一 instant 引擎 HL.instant（共用下注面板 + ½/2×/Max + 自動下注）✅ 2026-06-22
- [x] 進階自動下注（次數/贏後+%/輸後+%/止盈/止損/Turbo）✅ 2026-06-22
- [x] Dice / Limbo / Crash / Mines / Plinko（originals 五天王全可玩，可玩數 2 → 7）✅ 2026-06-22
- [ ] VIP 等級 MVP + 任務/成就引擎 + 獎金錢包/領取中心（留存三件套）
- [ ] Rakeback 返水即時回饋
- [ ] 百家樂 / 輪盤 RNG 桌 → 主播跟注接真開獎（取代 Math.random Demo）
- [ ] 真實累積彩金 Jackpot（demo 獎池遞增 + 命中演出）
- [ ] PWA（manifest + Service Worker）

## 🔵 LATER（大引擎 / 新支柱 · L）
- [ ] 紅利/流水（wagering/rollover）引擎 — bonus vs cash 分離記帳（使用者明確要求「引擎」）
- [ ] 運動博彩骨架 + bet slip + 串關 Parlay（+ 電競）
- [ ] Crazy Time 類 Game Show 轉盤（掛主播主持）
- [ ] 錦標賽 / Slot Race（限時積分賽 + 即時 leaderboard + 自動派彩）
- [ ] Provably Fair 可驗證公平（WebCrypto HMAC-SHA256 驗證頁，先做 Dice/Limbo）
- [ ] 營運後台 MVP（admin.html + RBAC + 玩家/金流/遊戲上下架 CMS，目標5）

## ⏸️ DEFER（待牌照才做，現在別碰）
真金流串接 / KYC（Jumio/SumSub）、真人視訊串流、真實多供應商聚合接入（Evolution/Pragmatic）、第三方 RNG/RTP 認證（iTech Labs/GLI）、法定負責任博彩與反詐 AML、即時賽事資料 feed、提款審核佇列/對帳 ledger、完整 CRM。
（`canWithdraw()` 已正確閘控；GameFrame 已預留 iframe 容器——維持占位即可。）
