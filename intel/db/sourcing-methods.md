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

10. **活動的收尾面／賽後那一刻（2026-09-04 平台軌補上·同家族第八種實例，而且它壓在「活動」分類上）** —
   各站的限時活動（榜／race／錦標賽／抽獎）**跑完之後長什麼樣**：有沒有**往期成績**（我上期第幾名、拿了多少）；
   有沒有**得獎名單**或已結束賽事的**封存頁**；**得獎者怎麼被告知**（站內信／通知中心／email／只發一個 toast）；
   獎金**何時、以什麼形式**到帳；有沒有活動**行事曆**（起訖時間是集中排程還是各自寫在文案裡）。
   - **為什麼補（機械實測，非印象）**：`grep -lie "往期|past events|past winners|得獎名單|winners list|活動結束|ended event|活動歷史|event archive|leaderboard history"`
     在 **36 份 dossier** 中命中 **0 份**。對照組是關鍵：**同一批 dossier 裡「獎池／名次獎金／分獎曲線」命中 14 份**、
     且逐筆讀完全是**進行中**的池子大小與分法（1xbet／bc-game／betpanda／capyspin／coinsback／crown-coins／dorados／duelbits／mega-dice／rollbit…）
     ⇒ **不是「活動」這個表面沒被看，是「活動結束之後」這半個表面沒被看**。與第 5／7／8／9 條逐字同構：
     原九條維度沒有任何一條會問「賽後」，換多少榜單都補不回來。
   - ⭐ **首輪執行即在兩個彼此無關的平台上獨立收斂**：CoinsBack（sweepstakes 社交站·每小時+每日榜）與
     Betpanda（crypto 站·兩條並行週賽）——**進行中**的部分被評測寫得極細（獎池、名額、即時更新、甚至「開第二個分頁盯名次」），
     而**賽後**的往期／得獎名單／告知方式，逐項追問全文皆為 "Not mentioned"。
     ⇒ 產業對此格近乎零記載。**據實界定**：「評測沒寫」≠「站上沒有」，但這正是本條的要點——
     **這個表面連專門寫評測的人都不去看**，所以它同時是**低成本差異化**的所在。
   - ⭐ **最刺的是它當場照出我們自己**：首輪執行即查獲 ApexWin 的旗艦活動（`HL.tournament`，100 萬獎池、3 小時一期、
     付獎深 30 名）**期滿時畫面只是把榜與「我的名次」靜靜歸零**——沒有賽果、沒有名次、沒有獎金數字，
     而結構化賽果**一直都被寫進 `HL_TOURNEY_LAST` 並掛在公開 API 上（`status().lastResult`），消費者卻是 0 個**。
     同 repo 的小兄弟 `core/raffle.js` 反而做對了（`HL_RAFFLE_HIST` 清單 + view 渲染「我的開獎紀錄」）
     ⇒ 形制早就存在，只是旗艦活動漏接了消費端。開卡 **#167**。
     **這與第 7 條「做得比查得多」相反，是第三種型態：做了一半、而缺的那半剛好沒有任何維度會問到。**
   - **紀律**：往後每輪 dossier 的「它有什麼」段落**必須明文回答**「這站的限時活動結束後，玩家看得到往期成績／得獎名單嗎；
     得獎怎麼被告知」（沒有就寫「無」或「來源未載」）。

11. **帳戶安全與隱私的「自助面」（2026-09-04 平台軌 20:00 窗補上·同家族第九種實例，這一次壓在「資安」分類上）** —
   玩家自己能在帳內做到什麼：**2FA**（有沒有、走什麼 authenticator）、**登入活動／裝置與 session 清單／登出所有裝置**、
   **新裝置或異常 IP 的告警**（email／站內）、**提款目的地白名單與新增後的冷卻**、**改密碼/改信箱後的提款鎖**、
   **站內可見度自控**（隱藏統計、不進公開動態/大獎牆、賽事榜不對外）。
   - **為什麼補（機械實測）**：`grep -lie "2FA|two-factor|雙因素|裝置清單|device list|whitelist|白名單|登入紀錄|login history|ghost mode|隱身"`
     在 **36 份 dossier 命中 5 份**（1xbet／bc-game／mega-dice／stake-us／thrill），而對照組
     `VIP|cashback|rakeback` 命中 **36/36**、2026-08-16 才補進本清單的責任博弈已爬到 **14/36**。
     ⇒ 覆蓋率跟著維度清單走，不跟著重要性走。
   - ⭐ **它壓在三個 absent 模組上，而那三張卡的形制來源幾乎只有 Stake 一家**：#125 帳戶安全自助中心／
     #127 玩家可見度與隱私自控／#137 出金安全鎖。這與 08-16 之前的責任博弈**完全同形**
     （當時 35 份 dossier 命中 0，四張卡全由台帳自審生出、一次都沒有對手形制可對照）。
   - ⭐ **首輪執行就補上這一格缺的那一半證據**：Punkz **新裝置登入 email 告警**（正面形制）
     × Thrill **有 2FA 但無不明 IP／提款告警而被評測扣分**（反面佐證）⇒ 同一件事**正反兩側都有**
     ⇒ 「異常登入要告知玩家」是**評測會計分的項目**，不只是我方自審偏好。
     Chancer 則是**來源互相矛盾**（一份說 My Account 可開 2FA、另一份把「缺 2FA」列為扣分）⇒ 依「只記共識」記為未定。
   - ⚠️ **兩個不可互相類推的陷阱（本輪實測踩到）**：① **no-KYC 的「身分匿名」不等於站內「可見度隱私」**
     （Punkz 主打前者、後者零記載）；② **有 2FA 不等於有登入活動面**（Thrill 正是這個組合）。
     ⇒ dossier 要分欄記，不要合成一句「安全性不錯」。
   - **紀律**：往後每輪 dossier 的「它有什麼」段落**必須明文回答**「玩家能不能自己看到登入/裝置紀錄；
     提款目的地能不能鎖；能不能把自己的戰績從公開面藏起來」（沒有就寫「無」或「來源未載」）。
     並且 **2FA/真人風控屬真金前範疇（CONTROL.avoid）不開接入卡，但「登入活動面／可見度自控」是純前端可做完的**。
12. **玩家的自我統計面（2026-09-05 平台軌 08:00 窗補上·同家族第十種實例，壓在「資料」分類上）** —
   玩家在這個站上**看不看得到「自己的數字」，還是只看得到「自己的進度條」**：
   有沒有一處顯示自己的累計量（下注筆數／累積押注／累積贏額／淨盈虧／最大單筆／最高倍數／玩過幾款）；
   這些數字**涵蓋多久**（本次工作階段／本月／終身）；**口徑說不說得清**（「押注」是原始金額還是加權後的合格流水）；
   是私密的還是公開在個人檔案上；有沒有圖表；以及最關鍵的——**是站方自己做，還是丟給第三方工具**。
   - **為什麼補（機械實測，非印象）**：`grep -lie "my stats|player stats|統計頁|個人統計|自我統計|stats page|profile stats|勝率|win rate|統計儀表|統計面板"`
     在 **36 份 dossier** 中命中 **1 份**，逐筆讀完＝`stake-us.md:32` 的「Dice 設 98% **勝率**低風險刷流水」
     ——那是**遊戲的中獎機率設定**，與玩家統計面無關的**同形詞**（與第 9 條那 5 筆 "bet slip" 完全同型的假命中）
     ⇒ **真實命中數＝0/36**。對照組 `VIP|cashback|rakeback` **36/36**。
   - ⭐ **它與第 9 條是兩件事，而第 9 條會讓人以為已經問過了**：第 9 條問的是**可攜性**（拿不拿得出去），
     這一條問的是**可理解性**（看不看得懂自己）。**首輪執行即在兩個標竿站上取到相反的一半**：
     **Stake**＝`my-bets/archive` 的**逐期 JSON 給得很完整，站上零分析面**，閱讀被一整圈第三方接走
     （StakeStats／StakeArchiveDownloader／Stake Analyzer／Spindex 的盈虧・月 ROI・逐幣別分解）；
     **BC.Game**＝Transactions／Bill／Game history 三分頁 + **內建圖表化分析** + 依時間區間/遊戲型別出自訂報表，
     而**原生匯出來源未載**。⇒ **兩個標竿站各只做一半，沒有一家兩者都有** ⇒ 對我方是低成本差異化位置。
   - ⭐ **首輪執行即照出我們自己，而且照出的是「資料早就在」**：ApexWin 的中央掛鉤 `live-stats.js:56`
     **每一注都在累積玩家的 6 欄終身統計**（`HL_ACHIEVE` 的 bets／wagered／wins／bestWin／bestMult／games，站別隔離），
     但 `achievements.js:179` 的公開 API **不含 `stats()`**，而 `status()` 把每一欄折成 **`prog`（0–1）**餵給徽章進度條
     ⇒ **玩家看得到 25 條進度條，讀不到任何一個數字**；唯一叫「統計」的表面（📈 實時統計）是**本工作階段限定、重載歸零**。
     **這是第三種型態（做了一半、缺的那半沒有維度會問）的第二例**，但比 #167 更省：**缺的不是資料，是出口與面**。開卡 **#170**。
   - ⚠️ **本條首輪就踩到一個陷阱，寫下來給後手**：「站上有一個顯示累計押注的地方」**不等於**「玩家問得到自己押了多少」。
     ApexWin 唯一長期可見的累計數字（進度快照報表的 VIP 累積量）是 **edge 加權且可含儲值/簽到來源的經驗值**，
     與徽章門檻用的**原始押注額**是兩個不同的量（倍率 1.00×–1.80×）——而當時**兩者的標籤都寫著「押注」**。
     ⇒ 查這一條時要**逐個數字問它是哪個量**，不要看到一個數就記「有」。（本輪已修並上鎖 `platform/vip-xp-label-single-truth`。）
   - **紀律**：往後每輪 dossier 的「它有什麼」段落**必須明文回答**「玩家看得到自己的累計數字嗎／涵蓋多久／口徑說不說得清／是站方做還是第三方做」（沒有就寫「無」或「來源未載」）。
13. **玩家偏好的「安放處」（2026-09-05 平台軌 20:00 窗補上·同家族第十一種實例，壓在「前端UI/UX」分類上）** —
   這個站把**玩家偏好**（語言／顯示幣別／主題明暗／動效強度／通知開關／版面密度／熱鍵）**放在哪裡**：
   有沒有一個**站層的「設定」出口**（一頁、一抽屜、一個帳戶分頁），還是散在各功能裡、
   甚至藏在「只有進到某個功能才碰得到」的地方；哪些偏好被歸進**帳戶層**、哪些被歸進**遊戲層**；
   以及最關鍵的一問——**一條「生效範圍是全站」的偏好，它的編輯入口是不是也在全站可達的地方**。
   - **為什麼補（機械實測，非印象）**：`grep -lie "settings page|preferences|偏好設定|設定頁|account settings|設定中心"`
     在 dossier 群裡雖有零星命中，但逐筆讀完**全部是「帳戶資料/限額/KYC」語意**，
     **沒有任何一份回答過「這個站的偏好放在哪裡」**——因為第 1–12 條**沒有一條會問到這件事**：
     第 7 條問的是**多語系的產品形制**（支援幾種語言、怎麼切），第 11 條問的是**帳戶安全的自助面**，
     第 5 條問的是**責任博弈工具**。**偏好的容器本身，從來沒有維度負責。**
   - ⭐ **首輪執行即在兩個站上取到清楚的形制**：
     **Stake** ＝ 站層專頁 **`/settings/preferences`**（與 `/settings/account` 併排），
     且「**把餘額顯示成本地法幣**」（25 種法幣）就設在那裡＝**顯示幣別是帳戶層偏好**；
     **GoKong** ＝ 評測把「**Player Customization**」當成一個獨立段落來寫，內容是
     「multiple supported **languages and currency options**」＝**語言與顯示幣別並列為帳戶層偏好**。
   - ⭐ **首輪執行即照出我們自己，而且照出的是「做了、但放錯地方」**：ApexWin 的 `HL.gset`
     （`core/game-settings.js`）有 4 條偏好（`fast`／`anim`／`hotkeys`／`fiatView`），
     **其中 2 條的生效範圍是全站**——`fiatView` 被 `core/dom.js` 的 `money()` 消費＝**全站金額格式化器**
     （實測 **67 支檔／384 個呼叫點**，改完還 `HL.app.refresh()` 全站重繪）；
     `anim` 被掛成 `<html>.ax-anim-off` 全域 kill-switch 並由 `core/reveal.js` 讀取。
     而**編輯面只有一份、住在 `views/game-frame.js` 的遊戲外框 ⚙ 齒輪（＋PiP 的 ⚙）**
     ⇒ **玩家想在大廳關動效、或換金額顯示幣別，必須先進一款遊戲。** 開卡 **#171**。
   - ⭐ **它照出的第二件事比第一件更有結構意義**：佇列裡**已經有三張卡各自需要「一個放偏好的地方」**
     —— **#128**（通知分類軸與玩家偏好，卡體自陳「入口位置待 #118／#93」）、**#148**（外觀/主題模式）、
     以及本條的 **#171** ——**而沒有任何一張卡擁有那個容器**。
     ⇒ 這正是本軌「**擴充性優先：先做容器再填功能**」哲學要攔的形狀：三個功能各自等一個沒人負責的容器。
   - ⚠️ **查這一條時的陷阱（首輪就踩到）**：「站上有這個設定」**不等於**「玩家找得到這個設定」。
     判斷時要**分別記兩件事**：(1) 這條偏好的**生效範圍**（單一遊戲／整站）、(2) 它的**編輯入口在哪一層**。
     兩者不一致（全站生效、遊戲內編輯）才是缺口——而只問「有沒有這個功能」永遠問不出來。
   - **紀律**：往後每輪 dossier 的「它有什麼」段落**必須明文回答**
     「這站的玩家偏好放在哪裡（站層設定頁／帳戶分頁／各功能內／查無）／哪些偏好在帳戶層／有沒有動效或主題類的感官偏好」
     （沒有就寫「無」或「來源未載」）。



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
