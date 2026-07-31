# WOW Vegas — 調研檔

- **URL**：https://www.wowvegas.com
- **調研日期**：2026-06-29（首次）
- **tier**：2 ｜ **priority**：73 ｜ **regions**：northamerica, global
- **category**：social, sweepstakes, casino
- **定位**：US 前 4 大 sweepstakes 社交賭場（PlayUSA 4.6/5）。純前端雙幣社交模式（無真金）＝與 ApexWin GC/SC 定位高度貼合。

---

## 特色表（聚焦純前端可學）

### 雙幣經濟
- **WOW Coins (GC)**：純娛樂、無兌獎價值。
- **Sweeps Coins (SC)**：達標可兌獎（兌現金門檻 50 SC 起；Prizeout 兌禮卡僅 20 SC 起）。
- 註冊大禮：**1,750,000 WOW Coins + 35 free SC**（無需 code，部分通路碼 WOWBONUS/WOWBONUS 1.75m GC+35 SC）。早期版本為 250k GC + 5 SC，2026 顯著加碼。

### 留存系統 — ⭐ Star System（招牌、最值得學）
- 六段：**Rising → Blue → Bronze → Silver → Gold → Hosted**。
- **集星機制**：每押注 50 SC 得 1 星；累積 ≥10 星升段。
- **🔑 滾動視窗衰減**：星星**30 天後過期**。平台同時追蹤「**近 30 天**星數（決定當前 status）」與「終身星數」。星到手即影響等級、過期即降級 → **status 由近期活躍度決定，而非終身累積**。
- 段位福利：每日登入幣禮、客製促銷、購幣折扣、生日禮、Race Rewards、同日兌現。VIP 2-7 購幣額外 +3%~+25%。Hosted 頂級：每日 50,000 WOW Coins + 5 free SC、+25% 購幣、24h 兌現、VIP WhatsApp 專屬客服、專人帳戶管理。

### 每日/週期獎勵
- **每日登入禮**：依 Star 段位最高 5 SC + 50,000 WOW Coins。
- **Happy Hour**（週六–週四）：限時購幣包加成（時間窗口型 boost）。
- **每日 email 競賽**：抽 3 SC 給 100 名隨機贏家。
- **Forever 永久段位**（2026 更新）：達標後鎖定段位福利不衰退。

### 推薦/社群
- **推薦計畫**：每邀一位好友加入得 **20 SC + 5,000 WOW Coins**。

### 金流/模式（avoid，僅記錄）
- 購幣（real-money coin purchase）、SC 兌獎、各州法規限制（IL/CT/CA/WA/NY/NJ/NV/MT/MI/MD/LA 等排除）— 屬牌照/合規範疇，**僅學前端機制**。

---

## ApexWin 對照

| WOW Vegas 有 | ApexWin 現況 |
|---|---|
| 雙幣 GC/SC | ✅ 已是 GC/SC 定位 |
| 每日登入禮 | ✅ #1 每日簽到 streak |
| VIP 六段 | ✅ #6 VIP 5 段（但**僅終身累積、不衰退**） |
| 每日轉盤類 | ✅ #17 Lucky Spin |
| 週期抽獎 | ✅ #18 Raffle、每日 email 競賽近似 |
| 兌換碼 | ✅ #19 Redeem Code |
| **⭐ 滾動視窗衰減 VIP status（近 30 天）** | ❌ **缺口**：ApexWin VIP 只升不降、純終身累積 |
| **推薦/邀請好友獎勵** | ❌ **缺口**：完全沒有 referral |
| **Happy Hour 限時加成窗口** | ❌ **缺口**：無排程型 boost 窗口（#22 rakeback 是日桶非排程窗口） |

---

## 可落地點子（pure-frontend，餵 evolve）

1. **滾動視窗 VIP status（近 30 天活躍度決定段位）** — 對標 WOW Vegas Star System；在既有 `HL.vip` 旁加「近 30 天有效押注」滾動桶，status 取近 30 天（非終身）→ 不活躍會降段，催回訪。可與 #31 微等級、#29 tier-up 相乘。**工作量 M**。
   - ⚠️ 設計平衡：建議「衰退」做成「光環/額外福利」層（如 reload 倍率、購幣折扣呈現），核心終身等級不倒退，避免懲罰感過重。
2. **推薦/邀請好友獎勵（referral）** — 對標 WOW Vegas（20 SC+5k GC）；產生專屬邀請碼/連結，被邀請者註冊→雙方入 `HL.bonus`（純前端 mock：localStorage 記邀請碼、模擬好友加入）。ApexWin 病毒成長維度完全空白。**工作量 M**。
3. **Happy Hour 限時加成窗口** — 對標 WOW Vegas Happy Hour（週六–週四限時）；排程型時間窗口內，返水/任務/Lucky Spin 獎勵 ×N，附倒數條。沿用 #17 daily-gate 計時 + #22 倒數模式。**工作量 S–M**。
4. **大方註冊禮包（onboarding 首登大禮）** — 對標 1.75m GC+35 SC 大方註冊禮；新用戶首登一次性發放顯著啟用禮，與 #28 新手限時窗口相乘。**工作量 S**。

> 最關鍵缺口：**① 滾動視窗衰減 VIP status**（ApexWin VIP 只升不降的根本性差異）＋ **② referral 病毒成長**（完全空白維度）。

---

## 2026-07-31 刷新（平台軌 14:00 輪 · tier-2 逾期 2 天）

**舊缺口逐項複核（grep 機械查證）**
- **Happy Hour 限時加成窗口** → ✅ **已關閉**：#35 `core/happyhour.js` 每日三固定時段返水 ×2
  （走既有 `rbAccrue` 真加成、非裝飾），且已上架 #49 活動日曆（`sched: "recurring"`）。
- **大方註冊禮包** → ✅ 已由 `HL.onboarding` 首登禮 + #48 `HL.safetynet` 新手安全網覆蓋。
- **① 滾動視窗衰減 VIP status** → ❌ **仍空白**：`rolling|近30天|last30|decay` 在 `prototype/src/core/` 命中 **0**。
  `HL.vip` 仍是純終身累積、只升不降（`progress.js` `addWager` 單向累加 `o.wager`）。**本輪開卡 #59**，
  並採本檔早先自記的設計建議：做成**額外光環層**（近 30 天活躍才享的加成）而非讓核心等級倒退，避免懲罰感。
- **② referral 病毒成長** → ❌ **仍空白**：`referral|Referral|邀請碼|推薦碼|inviteCode` 命中 **0**。
  **本輪開卡 #58**（形制對標本站：每邀一友雙方各得獎勵）。

**本輪淨新訊號**
- **每日 prize drops：可從「六個指定 slot 標題」中贏取獎勵**（各階級皆可參加）＝**遊戲指定型隨機掉落**
  （業界標準 Drops & Wins 形制；Duelbits 亦有 Drops & Wins ⇒ 兩平台共識）。
  ApexWin 現況：#49 promoCal 有排程容器、#15 錦標賽有計分競賽、#57 有「先搶先贏」稀缺軸，
  但**「在指定的一組遊戲上下注 → 隨機掉落獎勵」這條軸線空白**（現有活動皆非遊戲範圍限定）。
  → **本輪不開卡（`max_cards_per_run: 2` 已用於 #58/#59）**，列為**下輪平台軌首要候選**；
  落地時應掛 #49 promoCal（排程）+ 中央結算點（`game` 參數本輪起已逐款正確歸屬，見 #50 附帶修正）。
- Star System 段位名列為 Rising/Bronze/Silver/Gold/Hosted（本檔舊記含 Blue，且另有 Elite 敘述）——
  屬第三方評測用詞不一，**不足以據此改寫本檔**，維持原記載並標註此差異。
- WOW Originals 自研遊戲線 → ApexWin 已有 Apex Studio originals 12 款 + 同仁放置區，無缺口。
