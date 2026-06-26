# Gamdom — 平台調研檔

- **URL**：https://gamdom.com
- **調研日期**：2026-06-26（首次）
- **tier**：3（priority 64）
- **regions**：global
- **category**：crypto, casino, originals, community

---

## 特色表（聚焦純前端可學）

### 遊戲 / Originals
- **Originals**：Crash、Dice、**Hilo**、Roulette、Plinko（provably fair、高 RTP、倍數獎勵）。
- **Originals Roulette 內建漸進式 jackpot**：每注抽成累積，可達 $10,000+。
- 平台總量 6,000+，支援 25+ 加密貨幣。
- → ApexWin 已有 Crash/Roulette/Plinko/Dice，**Hilo 為新 Original 缺口**；jackpot ApexWin 已有（#9 三級）。

### 社群 / 直播（**Gamdom 招牌、最大缺口來源**）
- **Rain 事件**：聊天室中不定時「下雨」灑免費幣，**須當下在聊天室活躍**才有機會分得；越常聊天、互動越多，分到的機率越高（2026 內部數據：活躍聊天者多收 23% 紅利）。
- **聊天門檻 Lv20**：要 Level 20 才能發言，營造「精英社群」氛圍；英文 only 嚴格執行，Rain 時段競爭激烈。
- 起家於 2016 CS:GO 皮膚博弈社群 → 社群文化是核心資產。

### 留存系統
- **8 大階 / 24 子階 VIP**（Bronze→Silver→Gold→Emerald→Sapphire→Ruby→Diamond→Opal）。
- **Royalty Up Rewards**（一次性升級獎金）+ **Reload Rewards**（儲值加碼）+ 逐階提升的 instant rakeback。
- **15% rakeback 首 7 天**（無儲值門檻、返水本身免流水）；instant reward pot 可隨時領、一天可領多次（**手動 claim 按鈕**）。
- VIP（邀請制）rakeback 可達 60%。

### UX / 上手
- 登入後畫面底部出現**倒數計時器**（新玩家 6 小時啟用窗口）。
- Rain 領取：過 reCAPTCHA → 按 **claim** 鈕。
- 響應式網頁版免下載；原生 App 提供 push（rain / 挑戰結果 / rakeback 里程碑提醒）。
- 介面對 timer / claim 按鈕有清楚視覺指示。

### 金流 / 模式（**僅記錄，CONTROL.avoid，不推進**）
- 真金 crypto（25+ 幣）、reCAPTCHA、KYC → 屬 avoid。

---

## ApexWin 對照

| Gamdom 特色 | ApexWin 現況 | 判定 |
|---|---|---|
| Crash/Roulette/Plinko/Dice | 皆有 | ✅ 已有 |
| **Hilo Original** | 無 | ❌ **缺口（新玩法）** |
| Originals Roulette 內建 jackpot | #9 三級 jackpot（全站掛鉤） | ✅ 已有（機制更完整） |
| Instant rakeback / 隨時領 pot | `HL.rakeback` + #22 每日領桶（已開卡） | ✅ 已有/規劃中 |
| 多階 VIP + 升級獎金 | `HL.vip` 5 級 + 升級獎金 | ✅ 已有（階數較少） |
| Reload Rewards 週期紅利 | 無週期 reload | ❌ **缺口**（與 Shuffle 共識，見 shuffle.md） |
| **Rain 聊天灑幣（社群留存引擎）** | 有聊天（競技場/直播間），**無 rain 灑幣** | ❌ **缺口（招牌）** |
| 新手啟用倒數窗口 | 有每日簽到，無「限時啟用窗口」 | ⚠️ 半缺 |

---

## 可落地點子（pure-frontend）

1. **Rain 聊天灑幣（Chat Rain）** — Gamdom 招牌社群留存引擎，ApexWin 已有聊天 UI（競技場/直播間）卻無灑幣。做法：每隔一段時間（或主播/系統觸發）聊天室「下雨」，**在窗口內於聊天室活躍**（近 N 分鐘有發言）的使用者按 claim 鈕分得 `HL.bonus`；附倒數條 + claim 按鈕 + 飄落動畫。純前端、localStorage 記錄參與資格，零牌照。**工作量 M**。這是把既有聊天死水通電、體驗完整度躍升的高 ROI 項。
2. **新 Original：Hilo（猜高低）** — 對標 Gamdom/Stake Hilo。翻牌猜下一張更高/更低，連對累乘、隨時兌現（機制近 Mines/Towers 的互動回合）。大量複用 `HL.instant` + `HL.fair` 可驗證亂數。**工作量 M**。與 #23 Towers 同屬「補 Original 數」的互動回合家族，可排在 Towers 後。
3. **VIP 週期 Reload Rewards** — 與 Shuffle 共識（見 shuffle.md 點子 1），兩平台交叉驗證 → **強烈建議優先**。在 `HL.vip` 上依等級給 daily/weekly/monthly 固定可領紅利。**工作量 M**。
4. **新手限時啟用窗口（onboarding countdown）** — 對標 Gamdom 登入後底部 6 小時倒數。新用戶首登給「X 小時內完成首注/簽到 → 領啟用大禮包」倒數條，提升首日轉化。沿用 #17 daily-gate 計時模式。**工作量 S**。
