# 每輪重新取材方法（Sourcing Methods）

> 兩軌 Routine 的鐵律：**永不吃固定清單**。排名/流量/新遊戲隨時在變，固定站名或固定遊戲名一定過期。
> 每次執行都照本檔重新推導當前的調研對象，並把結果 + 抓取日期 + 訊號來源寫進對應資料庫。
> 來源：2026-07-23 對 casino 流量榜與遊戲媒體生態的調研。

---

## A. 平台軌取材：如何每輪重新推導「當前頂級 web casino」

多訊號交叉，**只記名次/趨勢/共識，不臆造絕對訪問數**：

1. **流量訊號**（主）— SimilarWeb 的 Casinos/Gambling **類別排名**為主：
   - 抓 `similarweb.com/website/<slug>/` 的 Category Rank in Gambling + 全球排名（記相對名次/趨勢）。
   - 用 `similarweb.com/website/<slug>/competitors/` 的「Top Sites Like」**自動擴展候選集**（從種子如 stake.com 展開到 rainbet/bcgame/roobet/clash.gg…）。
2. **名氣/評測訊號** — Casino Guru「Big Online Casinos」(以營收+玩家基數挑選)、win.gg/tokenist/99bitcoins 等「top crypto casinos / alternatives 2026」榜、btcgambling 排行 → 交叉出高共識品牌。
3. **營收/規模訊號** — 上市博弈公司走 Statista/financecharts/Tracxn(Flutter/Entain/Aristocrat…) 佐證「傳統大廠」面向。
4. **主題/機制訊號** — 從各平台評測抓可玩機制(VIP 層數/rakeback/rain/leaderboard/provably fair/原創遊戲)做玩法雷達。
5. **玩家保護訊號（2026-08-16 平台軌補上·本清單先前的結構性盲點）** — 各站 Responsible Gambling / Safer Gambling 頁與 Help Center：
   限額型別與週期、調升冷卻時長、冷靜期(cool-off/break in play)期間選項、**自我排除期間與能否解除**、現實檢查、帳戶關閉路徑。
   - **為什麼補**：實測 `intel/platforms/` **35 份調研檔對這組詞的命中數＝0**（唯一命中是引用我們自己的卡）。
     成因是機械的——上面第 1–4 條訊號與 SKILL 第 1 步的 dossier 維度（遊戲/留存/促銷/UX/社群/金流）
     **沒有任何一項會走到那些頁面**，於是 ApexWin 的 #67/#70/#86/#96 四張責任博弈卡**全部只能靠台帳自審生出來**，
     一次都沒有對手形制可對照。⇒ 這是取材漏法家族的**第三種**：
     ① 鏡頭濾掉整個垂直（08-15 caliente）② 上游來源自己看不見（08-16 bet.br）③ **維度清單根本沒有這個表面**（本項）。
     前兩種換榜單/換來源可修，這一種**換多少來源都修不掉**，因為每次取材都會照同一份維度清單抄。
   - **成本/收益實測**：補這條的成本＝每輪多一次 WebSearch；本輪首次執行即當場修正 #96 的期間設計
     （見 `platforms/stake.md` 2026-08-16 段）⇒ 高收益、低成本，列為常規維度而非選配。

6. **社群治理／共決訊號（2026-08-21 平台軌補上·與第 5 條完全同一個病、同一個家族的第四種實例）** —
   各站首頁與「about / community」頁：**玩家能不能對平台本身投票**（要做哪款遊戲、要加哪個功能、紅利怎麼設計、
   路線圖優先序），投票是諮詢性還是有約束力、票權怎麼算（人頭／持幣／VIP 段位／流水）、結果公不公開。
   - **為什麼補（機械實測，非印象）**：`grep -lie "投票|vote|voting|共決|roadmap|提案" intel/platforms/*.md`
     在 **36 份調研檔**中命中 3 份，而逐筆讀完＝**3 份全部是我們自己寫的 "ROADMAP LATER"**
     ⇒ **競品的玩家投票機制，本庫真實命中數＝0**。
   - ⭐ **最刺的證據就在自己庫裡**：`platforms/jackpotter.md`（2026-08-06 首次深挖）把該站的 VIP 段位／Mystery Box／
     wager-free 條款軸全記下來了（並據此開出 #74），卻**一字未提該站首頁講的第一句話**——
     "community-powered：玩家投票決定接下來做哪款遊戲、加哪個功能、路線圖怎麼走"。
     那不是它的次要特色，那是它的**招牌差異點**。⇒ 這證明的不是那一輪查得不認真，而是
     **維度清單決定了眼睛看得到什麼**：第 1–5 條訊號沒有任何一條會問「玩家能不能參與決策」，
     所以再多來源、再細的評測都補不回來（與第 5 條「玩家保護 35 份 0 命中」逐字同構）。
   - **對 ApexWin 的意義**：這是**純前端完全可做**的一條軸（提案註冊表 + 票倉 + 結果面板，無需後端即可先有容器），
     且與既有註冊表家族同形；同時它是少數「不送幣就能提升留存」的機制（§11 方向）。本輪開卡 #116。
   - **紀律**：往後每輪 dossier 的「它有什麼」段落**必須明文回答這一項**（沒有就寫「無」），
     不得因為找不到而略過——第 5 條補上時就是靠這一句才在首輪當場改到 #96 的設計。

7. **在地化的產品形制訊號（2026-08-25 平台軌補上·同家族第五種實例，但這一次是**我們自己已經做了三個月卻沒有對照組**的維度）** —
   各站與 iGaming 平台商的在地化架構文獻：語言與**貨幣/支付方式/法遵文案**是不是綁在同一個 locale 軸、
   語言切換器擺哪（頁首 vs 帳戶設定）、**逐市場網域**（`.mx`／`.br`）vs 單域多語、RTL、
   以及最關鍵的**技術形制**：文案是「規則引擎組好句子送出」還是「引擎輸出型別化狀態、表現層依 locale 選字串並格式化數值」。
   - **為什麼補**：既有六個維度只有「UX/上手」最接近，而它問的是首次入金前的流程長度，**從不問這個站怎麼支援多語**。
     ApexWin 的 i18n 已經做到第四面棘輪（#119→#120→#121/#126→#122）、寫了五張卡，卻**一份 dossier 都沒有對手形制可對照**
     ——與第 5 條「玩家保護 35 份 0 命中」逐字同構，差別只在這次我們**做得比查得多**，所以缺的不是靈感而是**檢驗自己做法的外部座標**。
   - ⭐ **首輪執行即當場產出一張卡**：外部形制的核心原則是「**typed state, not completed sentences**」
     （Wizards〈Casino Game Localization Architecture〉／Yogonet〈Localization as a product strategy〉2026-04）。
     ApexWin 正好相反——`text: "剩餘" + n + "次"` 在業務層就把句子組好，而 `core/i18n.js` 只翻「整個文字節點等於一條 key」的節點
     ⇒ 四面掃描器的 `NA_CONCAT` 桶（**220 條、散 54 支檔**）是**結構性永遠翻不到**的量，不是待補的量。
     **⇒ 一般結論：四面棘輪全綠 ≠ 全站可翻譯。**「0 條缺漏」與「220 條結構上翻不到」是兩個不同的數，台帳與卡上必須分開講。開卡 **#130**。
   - **紀律**：往後每輪 dossier 的「它有什麼」段落必須明文回答「它支援幾種語言／語言與貨幣是不是同一個軸／切換器在哪」（沒有就寫「無」）。

8. **創作者／工作室做為瀏覽軸與目的地（2026-08-29 平台軌補上·同家族第六種實例，而且是**我們的長期目標之一整整三個月沒有對照組**）** —
   各站的遊戲庫與供應商面：**「誰做的」在這個站上是什麼**——只是卡片上的一行字？一個篩選器？還是一個**可以點進去的目的地**？
   具體要問：大廳有沒有 provider 篩選器；有沒有**供應商目錄頁**（卡片帶什麼欄位：logo／名稱／產地／進入連結）；
   點進去有沒有**工作室檔案**（背景、作品目錄、認證、整合、代表作）；目錄本身怎麼分群（依內容型別：slots／live／table／crash & instant／…）
   與怎麼分層（Premium Partners vs Verified 之類）；工作室的**品牌素材**（logo／縮圖／橫幅）是不是由平台代管
   ——也就是工作室在大廳裡有沒有**視覺身分**，而不只是一串文字。
   - **為什麼補（機械實測，非印象）**：`grep -lie "provider filter|providers page|供應商頁|供應商篩選|依供應商|studio page|工作室頁|provider directory|供應商目錄"`
     在 **36 份 dossier** 中命中 **1 份**，逐筆讀完＝`kaasino.md` 的「含分類/供應商篩選」一句帶過、**零形制**（無欄位、無目錄頁、無檔案頁）。
     寬鬆詞 `provider|供應商` 雖有 16 份命中，但逐筆都是「這站用了哪些供應商的遊戲」的**名單**，
     從來不是「這站怎麼呈現供應商」的**形制** ⇒ 與第 5 條「玩家保護 35 份 0 命中」、第 7 條「在地化 0 對照組」逐字同構：
     **原七條維度沒有任何一條會走到 provider 目錄頁**，換多少榜單都補不回來。
   - ⭐ **最刺的地方是這條直接壓在 CLAUDE.md 目標 2 上**：「可插拔遊戲串接 … 並能**依同仁暱稱分類**」是使用者親述的五大長期目標之一，
     我們也真的做出了 `HL.games.byAuthor()`／`authors()`／`author:<暱稱>` 篩選／遊戲卡的「provider · 🎨暱稱」——
     **但一份對手形制都沒有**，所以三個月來沒有人問過「暱稱除了拿來篩，還能是什麼」。
     首輪執行即當場產出 **#146**（把暱稱從「篩選值」升級為「可停靠的目的地」）。
   - **紀律**：往後每輪 dossier 的「它有什麼」段落必須明文回答「這站怎麼呈現遊戲的製作者：只是一行字／可篩選／有目錄頁／有工作室檔案」（沒有就寫「無」）。

9. **玩家資料自主權／可攜性（2026-09-02 平台軌補上·同家族第七種實例，而且它剛好壓在本輪要審的「資料」分類上）** —
   各站帳戶頁的 **transaction history／bet history／statement**：**玩家拿不拿得出自己的資料**——
   具體要問：有沒有匯出（CSV／PDF／JSON）；匯出的**單位**是什麼（一份對帳單？還是逐頁各匯一次？）；
   金流與注單是**同一份**還是**兩種不同格式**；匯出前能不能先篩（日期區間／型別／狀態）；
   以及最關鍵的**檔案本身說不說得出自己是什麼**（涵蓋期間、擷取時刻、哪個帳戶／哪個站別）。
   - **為什麼補（機械實測，非印象）**：`grep -lie "匯出|export|對帳單|statement|bet history|投注歷史|注單|transaction history|交易紀錄"`
     在 **36 份 dossier** 中命中 3 份，逐筆讀完＝**5 筆全部是 "bet slip（注單＝下注前的選擇單）" 的同形詞**
     （`bet365.md` 的 Edit Bet／即時改價、`legendz.md` 的 Bet Slip 組件、`mega-frenzy.md` 的「下注單位」）
     ⇒ **「玩家能不能把自己的紀錄拿走」這件事，本庫真實命中數＝0**。與第 5／7／8 條逐字同構：
     原八條維度沒有任何一條會走到帳戶頁的 history 分頁，換多少榜單都補不回來。
   - ⭐ **最刺的是它壓在哪裡**：「資料」分類 08-31 才新增 `期間軸與對帳單` 模組並開卡 **#151**，
     而那張卡的業界對照**全部來自單次臨時取材**（bet365 7天/30天/12個月、BetMGM 逐年 PDF、UKGC RTS 3 個月）
     ——不是來自任何一份 dossier ⇒ **有卡、有規格、零對照組**，正是第 7 條「做得比查得多」的翻版。
   - ⭐ **首輪執行即取到一條會改設計的形制**：**Stake 的匯出是「逐頁各按一次」**——Deposits 分頁與
     Withdrawals 分頁**各有自己的 Export CSV 鈕，要匯兩次再自己併**；而**注單是另一套**（bet archive，JSON，
     且靠第三方工具讀）。⇒ **連標竿站都沒有「一份對帳單」**：金流與注單是兩種格式、兩個出口。
     **我方在容器上反而領先**（`HL.reports` 單一註冊表＋唯一匯出原語＋六張報表同一個 CSV 生成器），
     **落後的是檔案的身分**（`apexwin-<id>.csv` 恆定檔名，不帶站別/期間/擷取時刻）⇒ 本輪開卡 **#159**。
   - **紀律**：往後每輪 dossier 的「它有什麼」段落必須明文回答「玩家能不能自助匯出自己的紀錄／匯出前能不能篩／金流與注單是不是同一份」（沒有就寫「無」）。

⚠️ **讀 SimilarWeb「Casinos 類別榜」的口徑陷阱（2026-09-02 平台軌實測記下）**：本輪直接 WebFetch
`similarweb.com/top-websites/gambling/casinos/`（2026-07 資料、08-01 發布），前十名為
`casinoplus.com.ph／melbetegypt.com／stipepay.com／crowncoinscasino.com／truelayerpayments.com／`
`unlockmyrewardslocker.com／rainbet.com／bet88.ph／cidercasino.com／solitairegrandharvest.com`。
兩件事必須記住：① **這個榜不是純博弈站榜**——`stipepay`／`truelayerpayments` 是支付商、
`solitairegrandharvest` 是社交紙牌遊戲 ⇒ 直接引用名次會把非競品當競品；
② **二手來源的「類別第 1」多半是換過口徑的**：產業報導稱 rainbet 為「SimilarWeb Casinos 類別第 1」，
一手頁面上它是**第 7**；正確讀法是「**crypto casino 這個子集的第 1**」。
⇒ 紀律：**名次一律以一手 SimilarWeb 頁為準，二手榜單只用來擴展候選集**（本檔開頭「只記名次/趨勢/共識」的具體化）。
**每輪流程**：先 WebSearch「top online/crypto casino 2026 traffic ranking SimilarWeb」+「Casino Guru big casinos」→ 收 8–15 候選 → 逐一 WebFetch SimilarWeb 頁確認仍在類別榜且趨勢向上 → 取交集/高共識前 N 寫入 `platforms.json`（附抓取日期 + 訊號來源）→ 設 T1(7天)/T2(14天)/T3(30天) 刷新週期、到期重跑。

**參考標竿平台**（種子節點，非固定清單）：Stake（品牌/流量標竿、VIP/rakeback + 原創遊戲藍本）、BC.Game（大遊戲庫 + Chat Rain + 大廳模組化）、Roobet（美/拉美、competitor 展開種子）、SOFTSWISS（turnkey iGaming 供應商 = 平台「模組如何切分」權威）、GR8 Tech/Soft2Bet（headless CMS + 事件驅動 bonus engine = 後台/活動框架範本）。

---

## B. 遊戲軌取材：如何每輪重新列出「新出的遊戲 + 評價」

`games-catalog.json` 存 cursor（`media_last_run` + 各來源 high-water 日期 + 已復刻 slug 去重集）。每輪：

**STEP 1 — 結構化主拉（優先）Slotslaunch API**（最機器友善）
- base `https://slotslaunch.com/api`，需 token + Origin header。
- `GET /api/games?order_by=updated_at&updated_at=<last_run>&published=1`（150/頁，分頁到日期早於 cursor）→ 只拿新/異動遊戲，帶 provider/release date/RTP/volatility/features/reels/paylines。
- 排名端點：`/api/rankings/best-new-slots`、`/api/rankings/trending`(rank+change+times_played)、`/api/rankings/highest-rated`、`/api/rankings/most-rated`。
- 參考端點：`/api/providers`(**每輪重新拉→自動接住新工作室**)、`/api/types`、`/api/themes`。
- （無 token 時退回 STEP 2–3 的抓取來源即可，不阻斷。）

**STEP 2 — 專家評分 BigWinBoard**
- `GET https://www.bigwinboard.com/new-slots/`（或 RSS `https://www.bigwinboard.com/feed/`）。解析卡片：title/provider/0–10 專家分/release date。留 date ≥ last_run。
- 有潛力者深抓評測頁(pattern `/[game]-[provider]-slot-review/`)取確切分數 + RTP + 最大贏 + 一句機制描述。

**STEP 3 — 人氣 SlotCatalog**
- 抓 `https://slotcatalog.com/en/New-Slots`(分頁)按 release date 排 → 取 name/provider/date/**SlotRank**(掃 50+ 市場大廳的客觀曝光度)/Users Rating/RTP/variance/max-win。
- 選讀 `/en/popular-slots` 取當前 top-N 交叉核對熱度；可切語言/地區取地域加權 SlotRank。

**STEP 4 — 群眾/hype**
- 掃 AskGamblers `/casino-games/online-slots/new` + 社群層(CasinoGrounds 討論串、AskGamblers 論壇、streamer 大獎 clip 量) 找 STEP1–3 浮現的候選名；每年一次讀 AskGamblers Awards「Best New Slot」提名當精選短名單。

**STEP 5 — metadata 驗證（供應商官頁）**
- 每個存活候選抓原工作室遊戲頁取 canonical release date/官方機制名/RTP/volatility/max-win/美術。供應商清單本身每輪從 Slotslaunch `/api/providers` 或 SlotCatalog provider 過濾重新推導。

**STEP 6 — 合併去重**：以正規化(game+provider) slug join 全來源，一遊戲一候選 record，帶 bigwinboard_score / slotcatalog_slotrank + users_rating / slotslaunch_trending_rank + rank_change + times_played / release_date / RTP / volatility / max_win / mechanic tags / hype_notes。剔除已復刻集。

**STEP 7 — 評分排序**：算複合候選分（權重見下），降序取 top-N 為本輪候選清單，寫進 `games-catalog.json`（status: candidate）。

**STEP 8 — 更新 cursor**：推進 `media_last_run` + 各來源 high-water。因每步查 live 端點、供應商每輪重推 → 目標清單完全重生，無固定清單。

### 候選評分訊號（權重由重到輕）
1. **專家評分** — BigWinBoard 0–10（≥8/10 列優先層）；AskGamblers/Casino Guru 專家裁決。單一最強「值得復刻」訊號。
2. **SlotCatalog SlotRank** — 客觀跨市場人氣（快速攀升/榜首 = 真的在被玩）。
3. **Slotslaunch trending rank + rank_change + times_played** — 即時遊玩動能；新品大正 rank_change = 早期爆發訊號。
4. **玩家評分** — SlotCatalog Users Rating / AskGamblers player score（與專家分背離本身即資訊）。
5. **hype/社群** — streamer 大獎 clip 量、論壇串熱度、Awards 提名（人氣先行指標）。
6. **供應商血統** — 高訊號工作室(Hacksaw/Nolimit/ELK/Pragmatic/Push/Play'n GO/NetEnt/BGaming)先驗更高。
7. **機制新穎度** — 真的新/獨特機制(cluster 演化/grid 擴張/新 bonus-buy 或乘數系統)即使中分也值得復刻(教一種新互動)、標機制型別並加權。
8. **最大贏 & 波動 profile** — 極高 max-win(x15000+) + 高波驅動 streamer/玩家興趣。
9. **新鮮度** — release 在窗內，越新越加權，保持 pipeline 當前。
10. **跨源共識** — 專家分 AND SlotRank AND trending 同時高 = 最高信心復刻目標（最終 tie-breaker/乘數）。
