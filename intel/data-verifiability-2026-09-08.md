# 可查證期：一筆紀錄的憑證，在種子輪換之後還算不算數

> 2026-09-08 平台軌 08:00 窗（`p-081215-b4e9`）｜台帳「資料」分類輪替時查獲並當輪落地
> 對應卡：**#179**｜常駐鎖：`platform/fair-epoch-key-survives-rotation`、`platform/betlog-verify-gate-asks-for-the-key`
> 相關：#15 可驗證公平／#51 注單／#109 報表註冊表／#151 期間軸／#170 自我統計面

---

## 1. 一句話

注單頁的每一列都亮著「驗算 →」，而**沒有任何一列是按下去會有結果的**——當期的列依承諾本來就還不能揭露種子，過去的列的種子在輪換的那一刻被永久銷毀，而畫面對這兩件事都沒有說。

## 2. 怎麼發現的（台帳盲點第 14 例）

本輪台帳輪替到「**資料**」（6 模組，全庫並列最舊）。這一格既有的五個問題是：有沒有紀錄（注單）／拿不拿得出去（報表與匯出）／平台看得到什麼（資料分析）／這台裝置存了什麼（存檔清冊）／能不能按一段時間問（期間軸），加上 09-05 新開的維度 12（玩家看不看得到自己的數字）。

**沒有一條在問：一筆紀錄留下的憑證，在鑰匙輪換之後還算不算數。**

⇒ 新開取材維度 **19**。

## 3. 機械事實（全可複跑，皆對 `prototype/src` 求值）

| # | 事實 | 複跑方式 |
|---|---|---|
| ① | `serverSeed` 全 `src` **只存在於 `core/fair.js`** 一支檔的 `HL_FAIR` blob，且**只有一個**（當期） | `grep -rn "serverSeed" prototype/src --include=*.js`（另一處命中為 `views/instant-moles.js` 的註解） |
| ② | `rotate()` 就地覆寫 `o.serverSeed = randHex(32)`，舊值**只以回傳值存在**，repo 內無第二個寫入點 | 讀 `core/fair.js` 的 `rotate()`（進場版） |
| ③ | `rotate()` 全 `src` **恰 1 個呼叫點**＝`fairnessModal` 的「輪換並揭露伺服器種子」鈕；其唯一消費者＝`revealModal`，把 64 字十六進位**畫進一個彈窗**。關掉即永久消失（無複製鈕、無持久化） | `grep -rn "\.rotate(\|oldServerSeed\|revealModal" prototype/src --include=*.js` |
| ④ | 注單每列的欄位恰 `{id, ts, game, bet, win, cs, ne}`——**沒有任何欄位說得出自己屬於哪一個承諾期** | 讀 `core/betlog.js` 的 `COLS`／`record()`（進場版） |
| ⑤ | 驗算鈕的點亮條件逐字是 `isPF(r.game) && r.ne != null && r.cs`——**從不問鑰匙在不在** | 同上 `open()` 內 `table()` |
| ⑥ | 而 `verify()` 沒有 `serverSeed` 就回 `null` ⇒ 從注單點進去的驗證器**伺服器種子欄是空的**，按「重算驗證」得到紅字錯誤 | 讀 `core/fair.js` 的 `verify()`／`verifyModal()` |

### 承諾面（我們自己說了什麼）

- `fairnessModal`：「輪換種子會揭露原始伺服器種子，**即可回頭驗證每一注**」
- `revealModal`：「把『原始伺服器種子 + 客戶端種子 + 各 nonce』貼進驗證器，即可重算先前每一注是否吻合。」
- 說明中心 `fair/how`（#72）：「平台事後改不了、**你事後算得出來**。」

三句都成立的**唯一路徑**是：玩家在按下輪換的那一刻，**手動抄下 64 個十六進位字元**，然後自己記得哪幾列注單屬於那一期（而列上沒有任何欄位告訴他）。這不是一條產品路徑。

## 4. 為什麼一路全綠（§4「修一半而看不出來」家族的第 ⑧ 種形狀）

**兩個半邊各自都對，而它們之間沒有任何一把尺。**

- `HL.fair` 那半：承諾雜湊、HMAC、輪換揭露——密碼學上**逐項正確**，`verify()` 是標準實作。
- `HL.betlog` 那半：逐局落地、站別隔離、可 CSV 匯出——**紀錄面也對**。
- 缺的是**銜接**：鑰匙的生命週期（誰保管、保管多久）與紀錄的身分（這列屬於哪一期）**沒有任何一方負責**，於是兩邊都能宣稱自己完整。

這也解釋了 #51 當初為什麼會這樣寫：它的立卡理由正是「承諾雜湊能驗算，但**要驗哪一局**查不到」——它把「查得到哪一局」修好了（落地逐局紀錄），卻沒有問**「查到之後，鑰匙還在嗎」**。⇒ **修一半的那一半，正是前一張卡宣稱修好的那件事的下一個問句。**

## 5. 業界形制（本輪取材，維度 19 首輪）

| 來源 | 取得方式 | 逐字要點 |
|---|---|---|
| btcgambling.com 指南 | **直取成功**（二手綜述） | 「Go to the 'Fairness' or 'Details' tab of that specific bet history. You will now see the previously hidden _Un-hashed Server Seed_.」⇒ **揭露掛在那一列上**，不是一個一次性彈窗 |
| thespike.gg／Stake.us 規則頁 | **直取成功**（二手評測） | 「Once a round ends, the site reveals the original server seed.」「the pre-play hash matches the revealed seed」 |
| Stake 種子歷史（WebSearch 摘要） | **二手**（`stake.com`／`stake.us` 官方頁皆 **403**） | Settings → Fairness 保存 **seed history**，可回頭取用先前的 seed pair 驗證該期任何一注 |
| efirbet／1xBet 注單頁 | **直取成功**（二手） | 預設顯示「last three months」；篩選（狀態／日期／型別）之後用 **Request History** 取回**該篩選範圍**的副本 ⇒ 期間軸屬於**篩選那一層**（**#151 的第三個獨立佐證**，前兩個為 BC.Game 與 Stake） |

**共同形制**：鑰匙**不是一次性揭露**，而是**留成一份可回訪的台帳**；且**揭露掛在紀錄那一側**（bet 的 Fairness/Details 分頁），玩家不需要自己保管任何字串。

## 6. 本輪落地（#179）

**(A) 鑰匙留得住** — `core/fair.js`
- `HL_FAIR` 新增 `epochs[]`（已揭露種子期台帳），`rotate()` 在覆寫之前 `unshift({h, s, c, n, ts})`，上界 `EPOCH_CAP = 20`。
- 新出口 `HL.fair.seedOf(hash)`（**可吃前綴**，注單只存 16 字）／`HL.fair.epochs()`／`HL.fair.EPOCH_CAP`。
- **`seedOf` 對當期恆回 `null`**——當期種子不是遺失，是承諾本身；任何表面要判「這列驗不驗得動」一律問它，不得自己判斷。
- `revealModal` 的散文改為據實：種子已存進台帳、該期每一列注單會自動帶入。
- `fairnessModal` 新增一行 KV：已揭露的種子期數。

**(B) 紀錄自己說得出屬於哪一期** — `core/betlog.js`
- `record()` 每列多存 `sh` ＝ 當期承諾雜湊前綴 16 字（`info()` 本來就在算這個雜湊，**非新成本**）。
- `COLS` 多一欄「承諾雜湊」／CSV 欄名 `server_seed_hash` ⇒ **匯出也帶得走期身分**（否則拿到檔案一樣驗不了）。
- 驗算欄改**三態**，一律向 `seedOf` 求值：
  - 拿得到鑰匙 → 「驗算 →」，點下去**自動帶入種子＋客戶端種子＋nonce**（玩家零手抄）
  - 當期（`sh === 當期雜湊`）→ 據實寫「**待輪換**」
  - 其餘（非 PF／無憑證／已被上界擠出）→ 「—」

**(C) i18n**：EN／zh-Hans 三語同步（新增 5 條、汰換 2 條過期條目）。語言包為延遲載入 ⇒ **零首屏位元組**。

**(D) 首屏位元組**：兩支宿主皆首屏 eager、進場餘裕僅 **72B**。本輪把兩檔的**敘事型註解壓縮**（不變量逐條保留、脈絡搬進本檔）⇒ 收尾餘裕 **158B**，**淨還回 86 bytes**。這是連續九輪來第一次「動了 eager 檔而餘裕變大」。

## 7. 常駐鎖與負向擾動

- **`platform/fair-epoch-key-survives-rotation`（行為級）**：在 node 內以樁環境（`HL.dom.lsGet/lsSet`＋`TextEncoder`＋`crypto`）**真跑 `fair.js`**，驗：當期恆不外洩／輪換後憑舊承諾雜湊（含 16 字前綴）查得回種子／`sha256hex(查回的種子) === 當初承諾`／新一期同樣不外洩／`EPOCH_CAP` 擠掉最舊那期後據實查不到。
  **刻意用真跑而非掃字串**：把 `unshift` 搬到覆寫之後，字面上一樣有那一行，行為卻整個反了（存的是**新**種子）⇒ 這正是 §4 形狀⑦(a)「斷言認的是寫法」的射程。
- **`platform/betlog-verify-gate-asks-for-the-key`**：`sh` 必須是**欄位**且 CSV 欄名為 `server_seed_hash`／`record()` 必須寫入／`table()` 內 `seedOf` 求值必須**早於** `can` 判定且 `can` 逐字為 `!!key`／點擊必須 `serverSeed: key`／當期必須顯示「待輪換」且以 `r.sh === curSh` 為條件／**防空綠正向對照**：`HL.fair` 出口真的轉發 `seedOf` 與 `EPOCH_CAP`。
- **`platform/retention-bound-queryable`**（既有鎖）：`EPOCH_CAP` 由該鎖的**反向掃描當場抓到**並登記進 `RETENTION_ROSTER`。這一筆與前兩筆（betlog `CAP=500`／activity `KEEP_DAYS=90`）的差別是：**它丟掉的不是資料而是鑰匙**——列還在、`sh` 還在，只是 `seedOf` 回 `null`。

`node prototype/tests/run.js` 349 → **351 全綠**；**負向擾動 13/13 CAUGHT**（明細見 loop-journal 當日條目）。

## 8. 誠實邊界（不要把它講得比事實大）

1. **這不是「結果被竄改」**。`HL.fair` 的密碼學是對的，結果本來就由承諾決定；本輪治的是**玩家事後查證的能力**，不是公平性本身。
2. **Demo 站的伺服器種子存在玩家自己的瀏覽器裡**——嚴格說這一整套在純前端下只是形制演練，正式版必須由伺服器簽發保管（檔內 `ax-demo-tag` 已明示，本輪未改這句）。
3. **`EPOCH_CAP = 20` 仍是一個會丟東西的上界**：第 21 次輪換會讓最舊那期的注單失去可驗算性。這是刻意的取捨（localStorage 容量），且現在**至少是可查詢、被鎖盯著的**上界，而不是一個沒人知道的懸崖。
4. **本輪沒有任何 preview 目視**（`preview_start` 在排程輪被環境拒絕）⇒ 「畫面有沒有真的長出三態」屬 **UNVERIFIED**；已改以 node 行為級測項與源碼形狀鎖替代，並在 journal 據實標明。
