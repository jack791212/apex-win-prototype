# Mega Dice（megadice.com）調研檔

- **URL**：https://www.megadice.com
- **調研日期**：2026-06-29（首次深挖）
- **tier**：3（新興，30 天刷新）
- **regions**：global
- **category**：crypto, casino, originals, gamification
- **定位**：Telegram 起家的 crypto casino，4,000+ 遊戲（估計）；2026-06 列最快出金一線（Tron/Solana 穩定幣）。主打**任務制 + 進度階梯的長期遊戲化留存**，非為單次大注設計。

## 特色表（純前端可學維度）

### 遊戲 / Originals
- 4,000+ 遊戲：slots / table / live / provably-fair / **Mega Dice Originals**（具體 Original 標題評測未列，估同類 dice/crash/plinko）。
- 招牌互動：crash(Aviator)/dice/Bac Bo 等快節奏。

### 留存系統（核心賣點）
- **Throw the Dice 擲骰領獎機制**（招牌）：玩家靠「玩真錢遊戲累積忠誠點」或「**完成任務**」賺取**擲骰次數**；用**兩顆骰子**擲出總和 → 對應階梯獎品（例：擲「5」→ 100 USDT 現金、「8」→ 250 次 Money Train 4 免費旋轉、「10」→ $125 免費組合注）。← 把任務獎勵從「固定值」變成「**擲骰隨機揭曉**」，加入期待感/變異性。
- **任務儀表**：星形按鈕（在 Account/Inbox 旁）開啟，恆有數個進行中任務（含 Game of the Week），多為「在 slots 押注 X / 投注不同運動賽事」，獎勵為擲骰次數、指定 slot 免費旋轉、免費運動注。
- **Game of the Week 每週精選遊戲**：玩當週指定遊戲 → 獎勵（例：150 Super Spins）。
- **VIP 11 級**（Junior → Overlord），**每 $1 押注 = 3 點**；**只升不降**（“the only way is up”）。Tier 2 需 30 萬點解鎖（專屬錦標賽 / 優先出金 / 秘密任務 / 更大紅利 / VIP 活動 / 帳務管理）；高段配專屬 account manager、dice game rewards、rakeback、super spins。
- **Drops & Wins**：364 場每日錦標賽（各 $40k 獎池）+ **364 場每日 Prize Drops（各 $30k，隨機掉落非排名）**；週末 2 場並行 casino 賽（各 2,500 USDT，依中獎倍數計分）。
- $DICE token：**15% 淨損 cashback（零流水、無上限）**、25% 推薦佣金、每日報告、NFT（token=avoid，但 cashback/referral 機制可學）。

### UX / 上手
- Telegram bot 起家、低摩擦註冊；任務儀表星形入口集中呈現。

### 金流 / 模式（CONTROL.avoid，只記錄）
- 真金 crypto、$DICE token、推薦佣金真金 → 牌照/合規範疇，**不推進**。

## ApexWin 對照

| 維度 | Mega Dice 有 | ApexWin 現況 |
|---|---|---|
| **任務獎勵 = 擲骰隨機揭曉** | ✅ Throw the Dice | ⚠️ #6 每日任務獎勵為**固定值**；#17 Lucky Spin 是獨立轉盤（非綁任務） |
| **Game of the Week 每週精選** | ✅ 指定遊戲加碼 | ❌ **缺**（有 #21 熱度牆但無「官方精選+獎勵」） |
| **Prize Drops 隨機掉落獎**（非排名） | ✅ 每日 364 場 | ⚠️ 有 #15 排名錦標賽 / #18 抽獎，**無「押注即隨機掉落」**維度 |
| 淨損 Cashback / Lossback | ✅ 15% 零流水 | ❌ **完全缺**（同 Thrill，本輪兩家共識） |
| VIP 多級、只升不降 | ✅ 11 級 | ✅ 5 段（#31 微等級待做）；同為只升不降 |

## 可落地點子（pure-frontend）

1. **【最高優先 · 全新維度】淨損 Cashback / Lossback 引擎** — 與 thrill.md 點子 #1 為**同一張卡**（Thrill 10% + Mega Dice 15% 兩家共識）。詳見 thrill.md。工作量 **M**。
2. **任務獎勵「擲骰揭曉」化（Throw the Dice）** — 對標 Mega Dice 招牌。把 #6 每日任務的固定獎勵改/加一條「完成任務賺擲骰次數 → 擲兩骰看總和領階梯獎」，獎勵入 `HL.bonus`，接 `HL.fair` 可驗證亂數。複用 #17 Lucky Spin 的派彩/daily-gate 模式 + #6 任務掛鉤。**為任務系統加變異性與期待感**。工作量 **S–M**。
3. **Game of the Week 每週精選遊戲** — 對標 Mega Dice。每週系統選一款遊戲掛「精選」標 + 「本週玩這款額外給 X」獎勵，玩到即發 `HL.bonus`；複用 #21 熱度模組的卡片角標 + #18 Raffle 的週期倒數。**提升發現性 + 週回訪**。工作量 **S**。
4. **Prize Drops 隨機掉落獎** — 對標 Mega Dice 364 場每日 drops。與 #15 排名錦標賽**互補**：押注時以低機率「隨機掉落」一筆獎金（非排名、人人有機會），接 `HL.liveStats.record` 中央掛鉤觸發、入 `HL.bonus`。複用 #9 Jackpot 的「每注機率觸發 + 演出」模式。工作量 **S–M**。

## 備註
- 官網 /challenges/missions 直連 403，數據以官網評測 + coinspeaker/valuewalk/99bitcoins/WebSearch 共識為準。Throw the Dice 的骰面→獎品對應為評測舉例（5/8/10），實際表可能浮動。
- 具體 Mega Dice Originals 標題未取得，下次刷新可補。

---

## 🔄 2026-08-03 複查（平台軌·tier-3 到期刷新）

**取材**：coinspeaker / valuewalk / coincentral / 99bitcoins / bitedge / gameshub 2026 評測交叉。

**淨新增量＝忠誠積分「依遊戲類別分級」**：
- **Mega Dice Throw** 忠誠制度的積分累積率**逐類別不同**：運彩 **6 點／USDT**、slots **3 點**、其他 casino 遊戲 **2 點**。
- 這是與 Thrill 的 house-edge 基準**獨立收斂到同一原理**：回饋／進度應反映該注對莊家的真實價值，而非一律等值。兩者手法不同（Mega Dice 用粗粒度類別係數、Thrill 用精確 house edge %），但診斷同一件事。
- ⇒ 強化 **#60** 的多平台共識強度（連同 #50 檔頭已記的 BC.Game「BC Engine」依 house edge 計 XP、Roobet 30 級 rakeback 納入「遊戲選擇」、Duelbits Ace Lounge「基於 house edge 的永久 cashback」＝**五平台共識**）。

**其餘訊號與處置**：
- Telegram 原生（可直接以 Telegram 身分登入、不經瀏覽器、no-KYC 註冊）＝**需後端 + Bot 平台**，非純前端可落地 → 不開卡，僅記錄為未來通道層選項。
- 「依玩家偏好客製化 email 促銷」（加成％／cashback 率／免費旋轉個人化）→ 與 Gamdom「rank+playstyle 個人化促銷」、bet365 targeted offers 同一缺口面，**已由 #52／#54 覆蓋**，依去重紀律不重複開卡。
- $DICE 代幣獎勵 → CONTROL.avoid（真金/代幣），不開卡。
- 5,000+ 遊戲 / 五大分類 IA、Evolution/NetEnt/Play'n GO/Pragmatic 供應商 → 供應商真接入屬 avoid。

## 🔄 2026-09-02 複查（平台軌·tier-3 到期刷新·資安輪）

**取材**：vip-grinders / casino.guru / askgamblers / coincentral / cryptomaniaks / bitedge / sportscasting / coinspeaker / insidebitcoins 2026 評測交叉。

**本輪鏡頭同 thrill＝玩家保護**（台帳輪替到資安分類）。

**淨新增量＝一則比 Thrill 更尖銳的反面形制：工具「寫在條款裡」但不在面板上**
- **帳戶安全**：SSL；2FA **各家說法互相矛盾**（部分評測列為已提供，另有評測明指「缺 2FA」為扣分項）⇒ 依「只記共識、不臆造」紀律，本欄記為**未定**、不作為我方對照基準。
- **責任博弈**：條款上**有**儲值限額（日／週／月）、timeout（24h–6 週）、自我排除（6 個月以上）；
  但實測敘述指出 **① 站上實際「zero deposit limits」**（建議玩家自我節制，而非系統強制）
  **② 自我排除必須「寄 email 給客服」才能辦理**＝**非自助**。
- ⇒ AskGamblers／casino.guru 系評測給它的責任博弈評分明顯落後於其遊戲數與紅利面。

**⭐ 兩站合起來的形制結論（本輪最有價值的一句，且它剛好命中我方本輪的真缺口）**：
- Thrill 的失效模式＝**工具不存在**；Mega Dice 的失效模式＝**工具存在但不可自助／不被強制執行**。
- **後者才是我方這次撞到的形狀**：我方工具齊備、面板漂亮、數字正確，但**執行面漏了一個表面**（PiP 跟注）。
- ⇒ 把這條寫成往後審「負責任博弈」的固定判準：**不要問「面板上有沒有這個限額」，要問「每一條會扣錢的路徑是不是都問過它」**。工具齊備度是**必要非充分**條件。

**ApexWin 對照**：
- 儲值限額：我方 `deposit-daily/weekly/monthly` 三型別**皆自助且真的在閘上**（`HL.rg.checkDeposit`，#70 的 deposit 軸）⇒ 優於 Mega Dice。
- 自我排除：我方為**面板自助**（`HL.rg.setPause`，4 檔含永久）⇒ 優於「寄信給客服」。
- **但**：見 thrill.md 同輪記錄的 PiP 跟注漏閘——**我方在「強制執行」這一半上，本輪之前有一個實體破口**，已於本輪修復並上常駐鎖。

**未開卡（依去重紀律）**：
- Telegram 原生通道／$DICE 代幣 → 同 08-03，仍屬 avoid 或需後端，不開卡。
- 「依遊戲類別分級的忠誠積分」→ 08-03 已收斂進 #60，本輪無新增量。
