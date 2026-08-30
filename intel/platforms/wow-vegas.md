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

---

## 2026-08-30 重新調研（平台軌 08:00 窗｜第 N 次到期複查｜維度＝前端UI/UX 配對取材）

**本輪取材角度**：本窗台帳輪替到 `前端UI/UX`（該分類最舊、08-25），故刻意以「**前台外觀層**」為鏡頭重讀本站評測，
而不是照舊沿留存/促銷維度再抄一次（那三條 08-19 已確認飽和）。

**訊號（多份 2026 評測共識）**
- **lobby UX 被評為受測五家之最乾淨**：八個分區（popular / new releases / jackpot / classic slots / hold-and-spin / hold-and-win / Megaways / all games），
  主選單直達 games / promotions / support，遊戲牆帶排序與分類過濾。
- ⭐ **明載 `dark/light theme switch`**（與 live chat、game cards、WOW Zone、**random game selector** 並列為站台功能）。
- 2,000+ 遊戲、200 萬活躍；exclusive Originals（Plinko / Dragon Tower / Mines）。

**ApexWin 對照（本輪逐項機械複驗，非印象）**

| WOW Vegas 前台外觀層 | ApexWin 現況（可複跑） |
|---|---|
| 分區化遊戲牆 + 過濾/排序 | ✅ 資料驅動 gameCard + 分類 tab + provider/暱稱過濾 + 收藏/最近 rail（台帳 `大廳/遊戲牆` present） |
| 主選單直達 games/promotions/support | ✅ 側欄 + 底部列 + `mountView` 路由（台帳 `導覽殼層` present；未兌現缺口為 #93） |
| **dark/light theme switch** | ❌ **半成品容器**（本輪查獲，見下） |
| random game selector | ⬜ 未查證本庫是否有等價出口，本輪不開卡（`max_cards_per_run` 已用於 #147；列下輪候選） |

**⭐ 本輪淨新訊號＝一個「寫了但沒有人讀」的外觀契約（§4「修一半而看不出來」家族第 ⑥ 例）**

機械事實（全 `prototype/` 可複跑，排除 `tests/`）：
- `core/app-state.js:15` 宣告 `theme: "dark"`；
- `main.js:128` 每次開機把它寫進 `document.documentElement` 的 **`data-theme`** 屬性；
- `index.html:2` 另把 `data-theme="dark"` 硬寫在 `<html>` 上；
- **`data-theme` 在整個出貨前端的命中數就是上面這 2 筆**——`prototype/src/styles/` 三支 CSS 對 `[data-theme` 命中 **0**，
  全庫對 `prefers-color-scheme` 命中 **0**，`.theme` 的 JS 讀取者 **0**，任何「設定主題」的 UI 出口 **0**。

⇒ 這個屬性**每次開機都被正確地寫上去，然後沒有任何一行 CSS 或 JS 讀它**。
把 `HL.state` 的 `theme` 改成任何值，畫面**一個像素都不會變**——而 node 全綠、console 零錯誤、畫面完全正常。

**為什麼這一例的漏法是新的**：前五例（`HL.dock` 外部註冊者為零／`promoCal` 外部註冊者為零／`HL.reveal`／`app-state.lossLimitRemaining` 零讀取者／#67 空目的地）
缺的都是**同一種語言裡的第二端**（JS 寫、JS 沒讀）。這一例的生產端在 **JS**、而消費端本來就該在 **CSS** ⇒
任何「掃 `HL.<ns>` 有沒有外部消費者」的既有工具（`intel/tools/registry-gaps.js`）**射程上就看不到它**，
`ledger-card-sweep.js` 也看不到（它掃的是 evidence×卡狀態）。**跨語言的契約沒有任何一把既有的尺在量。**

**對手形制（2026 共識，供落地時定形）**：主題切換已被視為基本期待而非加分項（多份 2026 報導：>80% 使用者在有選擇時選深色、93% 回報深色減少眼睛疲勞），
且其定位是**可近用性**而非美術偏好（畏光/偏頭痛族群）；業界另有把對比變體直接放進主體驗、而非藏進無障礙選單的做法，以及依時段自動切換的動態主題。
⇒ 對 ApexWin 的意義不是「多一個皮膚」，是**那條線本來就已經接了一半**：狀態欄位有了、開機寫入有了、缺的是「可註冊的主題定義 + CSS 消費端 + 一個出口」。

→ **本輪開卡 #147**（外觀/主題模式登記簿；容器優先＝先做可註冊的主題表與 CSS 消費端，再談要不要真的出淺色皮膚）。
→ 同時把「跨語言契約沒有尺」這件事本身補成常駐鎖（本輪已落地，見 `platform/root-dom-contract-consumers`）。

**回填**：`last_investigated=2026-08-30`、`next_due` 依 `refresh_interval_days` 順延。
