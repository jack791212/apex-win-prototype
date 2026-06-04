# Apex Win｜娛樂城 H5 Prototype（Demo）

> 平台：**Apex Win**（《2026 博弈平台設計方案》Prototype）
> 定位：單機前端 Demo，**無後端、無資料庫、無建置工具**。所有資料皆為 Demo 假資料。
> 註：**House-Light** 不是平台名，而是平台內的核心玩法 / 大廳之一（對押池玩法）。

---

## 這是什麼

現代 Crypto / Social Casino 風格的單機 H5 前端 Demo，用於提案展示與實際體驗樂趣。已完成：

- **Lobby 大廳**：World Event Hero（DRAGON SIEGE 獎池 + 倒數）、快速入口、热门对押池、安全遊戲列
- **對押池玩法（核心）**：可實際遊玩的單局迴圈
  - 選擇一方（A/B、紅黑、大小、單雙）→ 選參與額 → 加入（扣款）→ 倒數 → 開獎
  - **輸方池扣平台抽水 2% 後，由勝方依投注比例分配**（pari-mutuel）
  - 結算更新餘額、假玩家各自結果、即時動態 Feed、今日排行榜
  - 可再玩一局 / 返回大廳
- **AI Concierge「AI Luna」**：罐頭問答 + 快速按鈕（活動 / 玩法 / 獎勵 / 風險）
- **即時社群演繹**：依活躍度定期產生假玩家動態
- **Demo 測試工具**：控制下一局結果（隨機 / 強制贏 / 強制輸 / 假玩家爆贏）、活躍度、重置餘額 / 排行榜
- **響應式**：桌機 / 平板 / 手機

---

## 如何在本機啟動

### 方式 A：直接用瀏覽器開啟（最簡單，無需任何工具）

雙擊或拖入瀏覽器開啟：

```
prototype/index.html
```

本專案以純 HTML/CSS/JS 撰寫、不使用 ES module import，可直接從 `file://` 執行。
（本機目前未安裝 Node.js，亦無可用的 Python 靜態伺服器，故採此零工具啟動方式。）

### 方式 B：本機靜態伺服器預覽（可選）

附帶一個極簡 PowerShell 靜態伺服器（僅供本機預覽 / 驗證）：

```
powershell -File prototype/serve.ps1   # 之後開 http://localhost:8777/
```

> `serve.ps1` 與 `.claude/launch.json` 僅為本機預覽輔助，非正式服務。

---

## 操作導覽

- 大廳點任一「熱門對押池 → 加入」，或快速入口「加入對押池」→ 進入玩法
- 在玩法畫面選 A/B、選參與額、按「加入挑戰」體驗完整一局
- 左下「⚙ DEMO 工具」可控制輸贏與活躍度，方便提案演示
- 右側 AI Luna 可試問：「對押池怎麼玩？」「平台抽水多少？」

---

## 目錄結構

```
prototype/
├── index.html              進入點（雙擊即可開啟）
├── serve.ps1               本機預覽用靜態伺服器（可選）
├── README.md
└── src/
    ├── main.js             ticker / router / 即時動態 / bootstrap
    ├── core/
    │   ├── dom.js          DOM 與金額格式化工具
    │   ├── app-state.js    全域狀態（餘額 / 排行榜 / Demo 設定）
    │   ├── ui.js           Toast + Modal
    │   └── demo-tools.js   Demo 測試工具
    ├── data/
    │   └── mock-data.js    集中式 Demo 假資料
    ├── layout/
    │   ├── app-shell.js    Header / Sidebar / 底部安全列
    │   └── ai-concierge.js AI Luna
    ├── views/
    │   ├── lobby.js        大廳
    │   └── duel-pool.js    對押池玩法（核心迴圈）
    └── styles/
        ├── tokens.css      設計 Token（深色霓虹）
        ├── base.css        reset + 全域
        └── components.css  版面與所有元件
```

---

## 邊界與約定

- ✅ 純前端、可啟動、可實際遊玩一局、可重玩、Demo 可重置
- ✅ 假資料集中於 `src/data/mock-data.js`，UI 皆標記 Demo
- ❌ 無後端、無資料庫、無真帳號 / 真金流 / 真儲值提款
- 可調數值集中於 `tokens.css`，避免散落 magic number
