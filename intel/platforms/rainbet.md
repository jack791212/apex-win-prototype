# Rainbet — 平台調研檔

- **網址**：https://rainbet.com
- **首次建檔**：2026-08-13（平台軌 20:00 窗）
- **tier**：1（priority 94）　**刷新週期**：14 天　**next_due**：2026-08-27
- **取材**：多訊號交叉 — SimilarWeb Casinos 類別榜 + 2026 crypto casino 榜單（win.gg／gncrypto／webopedia／chipreign）+ 產業流量報導（igamingtoday／businessofigaming／surgence）+ 專門評測（vip-grinders／strafe／bitdegree／btcgambling）

---

## 0. 為什麼這一筆值得單獨記一句方法論

**本庫先前完全沒有 Rainbet，而它是多訊號一致的當前流量冠軍。** 同時本庫追蹤了 **24 個 tier-3 小站**，卻把 Rainbet 漏掉、並把 shuffle 記為 tier-3（priority 68）。

⇒ 這是 SKILL 第 1 步「**每輪重新取材、不吃固定清單**」這條紀律的價值實證：若沿用固定清單，這一筆永遠不會出現。也是「新鮮度指標全綠 ≠ 覆蓋完整」的實例——本輪 `platforms.json` 逾期率 **0/34 = 0%**（帳面完美），但**漏掉的那一筆不會出現在逾期率裡**。逾期率量的是「已知的有多舊」，量不到「不知道的有幾個」。

---

## 1. 規模訊號（只記名次/趨勢/共識，不臆造絕對值以外的推論）

| 訊號 | 值 | 來源口徑 |
|---|---|---|
| SimilarWeb Casinos 類別 | **第 1** | 多篇 2026 榜單一致 |
| 月訪 | **23.4M** | SimilarWeb（2026-06 期） |
| 全球排名 | ~1,495 | 同上 |
| MoM 成長 | **+23.25%** | 同上（「sector 內最快上升」） |
| 流量市佔 | **超過 Shuffle + BC.Game + Roobet + Rollbit 四家之和** | 產業報導 |
| 品質評分 | 業界評測對其「無 KYC/快速出款」正評、對「Originals 不顯示 RTP」負評 | 多源 |

## 2. 產品面

- **遊戲量**：7,000+（另有 6,500+ 之口徑，屬統計時點差）；25+ 幣種；Betby 體育（40+ 運動、~50,000 場/月）
- **自研 provably fair Originals** 為品牌核心識別
- **VIP 7 段位**：Bronze → Infernal-Diamond
- **五個獨立「檔期桶」**（本輪淨新訊號，見下）
- 每日/每週/每月抽獎，宣稱總奖池 >$1.3M

---

## 3. ApexWin 對照（**已機械查證，非憑印象**）

### ⭐ 淨新訊號＝「領取節奏」被產品化為五個獨立檔期桶

Rainbet 的獎勵不是一個「領取中心」，而是五個**各有自己刷新週期與解鎖條件**的桶：

| 桶 | 週期 | 特殊 |
|---|---|---|
| Rakeback | **每 15 分鐘** | 全業界最快之一；每次領取可再疊 rakeboost |
| Daily Bonus | 24h | |
| Weekly Bonus | 7d | |
| Monthly Bonus | 30d | |
| **Pre-Monthly Bonus** | 30d | **Silver 段位以上才解鎖** |

### 它有 / ApexWin 已有 / ApexWin 缺口

- **它有**：五桶 × 週期閘 × 段位解鎖 × 領取即觸發加成
- **ApexWin 已有（查證後確認容器本身長得很好，勿重造）**：#24 `core/reload.js` 已是同型容器——
  `PERIODS` 三檔（daily/weekly/monthly）× **懶判定週期閘**（`num() !== 已領序號`，跨期自動可領）
  × VIP 等級放大金額（`amts[vipIdx()]`）× 領取入 `HL.bonus`（帶 `source` 自動進帳本）
  × `msToNext()` 倒數。⇒ **5 桶中的 3 桶已覆蓋**。
  另 `core/rakeboost.js`（#81）已有「領取/觸發即得限時加成」的註冊表形制。
- **ApexWin 缺口（三項，皆為「補出口」而非「造軸」）**：
  1. **`PERIODS` 是模組私有硬寫陣列，無註冊出口** — `grep -n "register|minTier|gate|unlock" core/reload.js` **0 命中**（僅檔頭註解提及 gate）⇒ 加一檔必須改該檔原始碼，外部模組/活動無法註冊自己的檔期桶。
  2. **無階級解鎖閘** — 現況所有檔位**全等級皆可領**、只有**金額**依 VIP 分級 ⇒ 做不出 Pre-Monthly 這種「Silver+ 才出現的桶」。
  3. **無次日級（sub-day）節奏先例** — 三檔皆 ≥1 天；數學形制（`num`/`msToNext`）直接支援 15 分鐘，不需改架構。

  ⇒ **開卡 #91**。與 **#90 同一形狀**（表長得很好、缺的只是出口），故評 S–M 而非 L。

### 佐證既有卡（不另開卡）

- 評測普遍批評 **Rainbet 自研 Originals 不顯示 RTP** ＝與 ApexWin「RTP/莊優散在 `HL.edge` 與各遊戲檔、玩家端無處可讀」**同型透明度缺口** ⇒ 寫進 **#72** 卡體（**第四平台佐證**，前三為 BC.GAME 官方稿／Courtside／Rollbit 逐筆算式）。
- 「領取即觸發限時加成」與 Rollbit 的 Rewards Calendar +15% Rakeboost/60min **同型** ⇒ #81 已落地，本筆僅為第二平台佐證。

---

## 4. 純前端可落地點子（附工作量）

1. **`PERIODS` 升為可註冊檔期表 + 階級解鎖閘**（#91）— **S–M**。容器先於內容：註冊出口 + `minTier` 閘 + 允許 sub-day 週期；不新增任何獎勵金額。
2. **次日級 rakeback 領取桶**（15 分鐘）— **S**，但**須先有 #91 的註冊出口**，否則又是硬寫第四筆。⚠️ 經濟面：sub-hour 節奏會顯著提高送幣頻率，真站值須另行收斂（§11）。
3. **對外「總回饋率」呈現層** — **S**。Rollbit 記載已指出 ApexWin「多桶已同構、只差沒合成一個對外總回饋率」；Rainbet 同樣以單一數字對外行銷。屬純呈現層。
4. **玩家端 RTP/莊優公開出口** — 屬 #72，**M**。

---

## 5. 下次刷新要查什麼（2026-08-27）

- 15 分鐘 rakeback 的**實際費率階梯**（本輪只查到節奏、未查到逐段位費率）
- Pre-Monthly 的解鎖條件是否還有流水/儲值前置（本輪僅確認「Silver+」）
- 該站 Originals 是否開始揭露 RTP（若開始揭露＝#72 的外部壓力訊號）
- 流量是否延續 +23% MoM（若延續，tier-1 地位穩固；若回落，須據實下修 priority）
