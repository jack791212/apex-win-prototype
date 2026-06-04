# House-Light 新平台｜本機協作規範建立指令 v0.2

> 用途：請將本文件直接貼給 Codex。  
> 目標：在本機路徑建立「ChatGPT / Codex / Claude 三方協作規範」與「實作前必讀注意事項」。  
> 重要修正：**任務卡不建立在本機，任務卡統一建立在 Notion 的 `House-Light新平台-任務追蹤工具`。**

---

## 0. 本機專案路徑

本專案 Codex 與 Claude 已經連結到同一本機路徑：

```text
D:\機動專案\House-Light新平台
```

請 Codex 之後所有本機文件、合作規範、實作前注意事項，都建立在此路徑底下。

---

## 1. 重要原則：本機與 Notion 的分工

### 1.1 本機只放什麼？

本機路徑：

```text
D:\機動專案\House-Light新平台
```

只放以下內容：

1. AI 協作規範
2. Codex / Claude 實作前必讀文件
3. House-Light 專案背景摘要
4. 開發注意事項
5. 規格同步規則
6. Claude 實作限制
7. Codex 驗收規則
8. 後續擴充注意事項
9. 不可踩雷事項
10. 文件變更紀錄

### 1.2 本機不放什麼？

本機不要建立任務卡資料夾，也不要建立本機任務卡檔案。

禁止建立：

```text
/tasks/
HL-TASK-xxxx.md
```

任務卡統一建立在 Notion。

---

## 2. Notion 頁面分工

### 2.1 專案首頁

Notion 頁面名稱：

```text
House-Light — 平台專案總覽
```

用途：

1. House-Light 專案最高層入口
2. 規格書主頁
3. UX / 玩法文件入口
4. 決策紀錄入口
5. 任務追蹤工具入口
6. ChatGPT / Codex / Claude 協作規範入口

---

### 2.2 任務追蹤工具

Notion 任務卡頁面名稱：

```text
House-Light新平台-任務追蹤工具
```

位置：

```text
House-Light — 平台專案總覽
└── House-Light新平台-任務追蹤工具
```

用途：

1. 所有任務卡都建立在這裡
2. Codex 負責新增、維護、同步任務卡
3. Claude 完成功能後，需要將回報內容提供給 Codex
4. Codex 協助驗收 Claude 完成內容後，更新任務卡
5. ChatGPT 產出的規格，可由 Codex 拆成 Notion 任務卡

---

### 2.3 通用任務派發與回填規則

此規則適用於每一次 Codex 派發任務、Claude 實作任務、Codex 驗收任務。

#### 每次合作前必讀

Codex 與 Claude 每次開始 House-Light 任務前，都必須先讀取本機初始化指令書：

```text
D:\機動專案\House-Light新平台\House-Light_Local_Collaboration_Rules_Codex_Init_v0.2.md
```

並讀取本機實作前必讀文件：

```text
D:\機動專案\House-Light新平台\docs\house-light\01_READ_BEFORE_ANY_WORK.md
```

#### Codex 派發任務方式

Codex 派發任務時，不需要把通用合作方式重複貼給 Claude。

Codex 只需要提供：

```text
請讀取 Notion 任務卡 HL-P1-xxx 並開始實作。
```

Claude 必須依任務 ID 自行到 Notion 的 `House-Light新平台-任務追蹤工具` 讀取完整任務卡內容，再開始實作。

#### Codex 派發後狀態

Codex 正式派發任務後，必須將該 Notion 任務卡狀態改為：

```text
進行中
```

#### Claude 完成後回填規則

Claude 完成任務後，不應只把完成內容貼在對話中。

Claude 必須直接更新該 Notion 任務卡，至少回填：

- 完成摘要
- 完成項目
- 新增檔案
- 修改檔案
- 新增內容說明
- 修改內容說明
- 測試方式
- 驗收方式
- 操作說明
- 已知限制
- 風險
- 建議下一步

#### Claude 完成後狀態

Claude 完成並回填 Notion 任務卡後，必須主動將該任務卡狀態改為：

```text
待驗收
```

#### Codex 驗收後狀態

Codex 驗收 Claude 完成內容後，依結果更新任務卡狀態：

```text
已完成
驗收失敗
```

若部分完成但仍需後續任務，Codex 應在 Notion 建立 Revision Task 或後續任務，不得在本機建立任務卡。

---

## 3. 三方分工定義

## 3.1 ChatGPT：規格書與協作規範負責

ChatGPT 負責：

1. 與使用者討論 House-Light 的產品方向、玩法、UX、商業邏輯與規格細節
2. 產出規格書
3. 產出 UX Flow
4. 產出玩法規則
5. 產出 Prototype Scope
6. 產出任務拆解建議
7. 產出協作規範
8. 更新與維護 Notion 中的規格內容
9. 不直接負責程式實作
10. 不直接在本機建立任務卡

ChatGPT 的主要產出類型：

```text
Product Spec
UX Spec
Gameplay Spec
Prototype Scope
Decision Log
Task Breakdown Draft
Acceptance Criteria Draft
```

---

## 3.2 Codex：任務卡、協作同步、驗收負責

Codex 負責：

1. 在本機建立並維護協作規範文件
2. 確保 Claude 實作前會閱讀本機必讀文件
3. 將 ChatGPT 產出的規格轉換為 Notion 任務卡
4. 在 Notion 的 `House-Light新平台-任務追蹤工具` 新增與維護任務卡
5. 將 Claude 的完成回報同步回 Notion 任務卡
6. 驗收 Claude 的實作結果
7. 協助確認 Claude 是否違反規格、擅自擴充、修改錯誤檔案或破壞既有功能
8. 將驗收結果回填到 Notion 任務卡
9. 將需要 ChatGPT 更新規格的內容整理成摘要

Codex 不負責直接決定產品方向。  
若發現規格不明確，Codex 應建立「待確認事項」並回報使用者，而不是自行大幅擴充需求。

---

## 3.3 Claude：程式功能實作負責

Claude 負責：

1. 根據 Notion 任務卡執行程式功能實作
2. 實作前必須閱讀本機協作規範與注意事項
3. 僅實作任務卡中明確定義的範圍
4. 不擅自追加大規模重構
5. 不擅自改變 UX / 玩法 / 商業邏輯
6. 不擅自導入大型套件
7. 完成後回報：
   - 完成項目
   - 修改檔案
   - 新增檔案
   - 測試方式
   - 已知限制
   - 風險
   - 建議下一步

Claude 的核心原則：

```text
只根據明確任務實作，不自行擴大需求。
```

### 3.4 Claude 擴大理解與主動發想授權

為了加快 House-Light Prototype 開發速度，Claude 不應只用單張任務卡的字面描述做最低限度實作。

Claude 每次接到任務 ID 後，應同時理解：

1. Notion 任務卡本身
2. House-Light — 平台專案總覽
3. 該任務卡列出的來源規格
4. 第一波 / 當前波次驗收範圍
5. 本機協作規範與實作前必讀文件

在不違反任務主題與驗收目標的前提下，Claude 可以主動：

- 補齊合理的 UI 細節與互動狀態
- 補齊必要 mock data 與展示資料
- 改善 component 結構、命名、狀態管理與資料流
- 做小範圍重構以提升後續維護性
- 主動加入展示所需的 visual polish、empty state、loading state、disabled state
- 對大廳排版、卡片內容、按鈕回饋、假資料演繹提出並實作合理方案
- 在完成回報中列出超出原字面描述但有助於展示品質的新增內容

Claude 仍需避免：

- 改變已確認的核心玩法、商業邏輯或產品方向
- 導入大型套件或改變技術棧而未說明原因
- 建立本機任務卡或本機任務資料夾
- 刪除既有重要文件或破壞既有可用功能

若 Claude 認為某個主動發想可能影響產品方向，應先標記為「建議」或「待確認」，不要直接當成正式規格。

### 3.5 Claude 全權實作模式

當使用者明確宣布進入 Claude 全權實作模式後，House-Light 的實作與調整暫時由 Claude 全權負責。

此模式下：

1. Claude 可以連續修改、調整、補強 Prototype，不需要 Codex 每次拆成細碎任務再派發。
2. Claude 應自行理解整份專案目標、Notion 規格、目前 Prototype 狀態與使用者最新方向。
3. Claude 可以主動提出並實作 UI、互動、資料演繹、視覺細節、Demo 體驗與展示節奏的優化。
4. Codex 不直接接手實作，主要負責驗證 Claude 修改後的結果。
5. Codex 需將驗證結果、完成狀態、風險、待調整項目回補到 Notion 任務卡或規格頁。
6. Codex 與使用者一起整理下一輪優化方向，再產出清楚文字給 Claude 實作。

Codex 在此模式下的工作重點：

- 驗證目前畫面與互動是否符合第一波 / 當前波次目標
- 對照 Notion 任務卡與規格，回補完成狀態與驗收紀錄
- 整理可執行、可驗收的優化建議給 Claude
- 協助使用者把口頭想法整理成 Claude 可直接執行的文字
- 判斷哪些內容需要新增 Notion 任務卡或更新既有任務卡

Claude 在此模式下仍不得：

- 建立本機任務卡或本機任務資料夾
- 刪除本機協作規範
- 將假資料包裝成真實系統
- 未說明原因就導入大型依賴或改變技術棧
- 將重大產品方向變更直接當成正式規格

---

## 4. 請 Codex 在本機建立的文件結構

請在以下路徑建立文件：

```text
D:\機動專案\House-Light新平台
```

建立以下結構：

```text
D:\機動專案\House-Light新平台
└── docs
    └── house-light
        ├── 00_PROJECT_CONTEXT.md
        ├── 01_READ_BEFORE_ANY_WORK.md
        ├── 02_AI_COLLABORATION_PROTOCOL.md
        ├── 03_NOTION_TASK_CARD_RULES.md
        ├── 04_SPEC_SYNC_RULES.md
        ├── 05_CLAUDE_IMPLEMENTATION_GUARDRAILS.md
        ├── 06_CODEX_VERIFICATION_RULES.md
        ├── 07_EXTENSION_NOTES.md
        ├── 08_DECISION_LOG_SYNC_RULES.md
        ├── 09_DO_NOT_CREATE_LOCAL_TASKS.md
        └── handoff
            ├── CHATGPT_TO_CODEX_TEMPLATE.md
            ├── CODEX_TO_CLAUDE_TEMPLATE.md
            ├── CLAUDE_TO_CODEX_REPORT_TEMPLATE.md
            └── CODEX_TO_CHATGPT_SUMMARY_TEMPLATE.md
```

注意：

```text
不要建立 /tasks/
不要建立任何 HL-TASK-xxxx.md 本機檔案
任務卡只存在 Notion
```

---

## 5. 必須建立的本機文件內容

---

# 5.1 `00_PROJECT_CONTEXT.md`

內容需包含：

```markdown
# House-Light 新平台｜專案背景

## 專案名稱

House-Light 新平台

## 專案階段

規格書與可操作 Prototype 實作階段

## 來源

新興博弈平台設計簡報已通過初步審查。

目前高層針對 House-Light 概念，希望進一步具體化：

1. 玩法設計
2. UX / 操作流程
3. 可互動 Prototype
4. 後續可拆分為規格書、任務卡、實作、驗收的開發流程

## 本機路徑

D:\機動專案\House-Light新平台

## Notion 專案首頁

House-Light — 平台專案總覽

## Notion 任務追蹤工具

House-Light新平台-任務追蹤工具

## AI 分工摘要

- ChatGPT：規格書、UX、玩法、協作規範、Notion 規格內容
- Codex：Notion 任務卡、協作同步、Claude 任務派發、實作驗收
- Claude：程式功能實作、完成回報
```

---

# 5.2 `01_READ_BEFORE_ANY_WORK.md`

這是最重要的文件。  
Codex 與 Claude 每次開始實作或拆任務前都必須先讀。

內容需包含：

```markdown
# House-Light｜實作前必讀

## 最高原則

任何 Codex 或 Claude 的工作開始前，必須先閱讀本機初始化指令書與本文件。

本機初始化指令書：

D:\機動專案\House-Light新平台\House-Light_Local_Collaboration_Rules_Codex_Init_v0.2.md

## 本機只放規範，不放任務卡

本機路徑：

D:\機動專案\House-Light新平台

本機只放：

- 協作規範
- 實作前注意事項
- 擴充注意事項
- 風險與限制
- Handoff 模板

本機不放：

- 任務卡
- 任務追蹤資料庫
- HL-TASK-xxxx 任務文件

任務卡統一建立在 Notion：

House-Light新平台-任務追蹤工具

## 執行順序

1. 使用者 / ChatGPT 產出需求或規格
2. Codex 將規格轉為 Notion 任務卡
3. Claude 讀取 Notion 任務卡
4. Claude 讀取本機必讀文件
5. Claude 依任務卡實作
6. Claude 回報完成內容
7. Codex 驗收
8. Codex 更新 Notion 任務卡
9. 需要時回報 ChatGPT 更新規格

## 通用任務派發與回填規則

- Codex 派發任務時，只需告知 Claude 任務 ID，例如：請讀取 Notion 任務卡 HL-P1-001 並開始實作。
- Claude 必須自行到 Notion 的 House-Light新平台-任務追蹤工具 讀取完整任務卡。
- Codex 派發任務後，必須將任務卡狀態改為：進行中。
- Claude 完成後，必須直接回填該 Notion 任務卡。
- Claude 回填內容至少包含：完成摘要、完成項目、新增檔案、修改檔案、新增內容說明、修改內容說明、測試方式、驗收方式、操作說明、已知限制、風險、建議下一步。
- Claude 完成並回填後，必須主動將任務卡狀態改為：待驗收。
- Codex 驗收後，依結果將任務卡狀態更新為：已完成或驗收失敗。
- 任何派發、回填、驗收資料都以 Notion 任務卡為準，不建立本機任務卡。

## 嚴禁事項

- Claude 不可跳過任務卡直接實作
- Claude 不可只看口頭描述就自由開發
- Codex 不可在本機建立任務卡
- Codex 不可把推測寫成正式規格
- Claude 不可擅自導入大型套件
- Claude 不可擅自大規模重構
- Claude 不可改變已確認 UX / 玩法 / 商業邏輯
```

---

# 5.3 `02_AI_COLLABORATION_PROTOCOL.md`

內容需定義：

```markdown
# House-Light｜AI 三方協作流程

## 協作流程

使用者 / 高層需求
↓
ChatGPT 討論並產出規格
↓
Codex 將規格轉為 Notion 任務卡
↓
Claude 根據 Notion 任務卡實作
↓
Claude 回報完成內容
↓
Codex 驗收與更新 Notion 任務卡
↓
ChatGPT 根據結果更新規格書與 Notion

## 核心規則

1. 所有任務必須有明確來源規格
2. 所有程式實作必須對應 Notion 任務卡
3. Claude 不得直接根據口頭概念自由開發
4. Codex 不得把尚未確認的推測寫成正式規格
5. ChatGPT 產出的規格若尚未確認，需標記為 Draft
6. 驗收失敗時，Codex 需在 Notion 建立 Revision Task
7. 所有重要決策必須同步到 Notion 或 Decision Log
8. 本機不保存任務卡，只保存協作規範
```

---

# 5.4 `03_NOTION_TASK_CARD_RULES.md`

內容需明確定義：

```markdown
# House-Light｜Notion 任務卡規則

## 任務卡唯一建立位置

所有任務卡只建立於 Notion：

House-Light新平台-任務追蹤工具

## 本機禁止建立任務卡

本機不可建立：

- /tasks/
- HL-TASK-xxxx.md
- task tracker
- task database

## Codex 維護任務卡

Codex 負責：

1. 根據 ChatGPT 規格建立任務卡
2. 根據 Claude 回報更新任務卡
3. 根據驗收結果更新狀態
4. 需要修正時建立 Revision Task
5. 將阻塞問題回報使用者或 ChatGPT

## 任務卡必要欄位

每張 Notion 任務卡必須包含：

- 任務 ID
- 任務名稱
- 任務類型
- 優先級
- 狀態
- 負責 AI
- 來源規格
- 任務目標
- 明確範圍
- 不包含範圍
- 驗收條件
- 允許修改檔案
- 禁止修改檔案
- Claude 完成回報
- Codex 驗收紀錄
- 風險與阻塞
- 是否需要 ChatGPT 更新規格

## 任務狀態

- Backlog
- Ready
- In Progress
- Review
- Revision
- Done
- Blocked

## 驗收狀態

- Pass
- Partial
- Fail
- Blocked
```

---

# 5.5 `04_SPEC_SYNC_RULES.md`

內容需包含：

```markdown
# House-Light｜規格同步規則

## 規格來源

House-Light 的產品規格由 ChatGPT 與使用者討論產出。

## 規格正式保存位置

正式規格應同步至 Notion：

House-Light — 平台專案總覽

## 本機規格文件定位

本機規格文件只作為：

- 協作參考
- 實作前注意事項
- 開發限制
- Handoff 補充
- Claude / Codex 必讀規則

不得將本機文件視為最新正式產品規格。  
正式產品規格以 Notion 最新版本為準。

## 規格衝突處理

若本機文件與 Notion 規格衝突：

1. 以 Notion 最新版為準
2. Codex 需記錄衝突
3. Codex 回報使用者確認
4. 必要時請 ChatGPT 更新規格
```

---

# 5.6 `05_CLAUDE_IMPLEMENTATION_GUARDRAILS.md`

內容需包含：

```markdown
# House-Light｜Claude 實作限制

## 實作前必讀

Claude 每次實作前必須先讀：

1. Notion 任務卡
2. docs/house-light/01_READ_BEFORE_ANY_WORK.md
3. docs/house-light/05_CLAUDE_IMPLEMENTATION_GUARDRAILS.md

## Claude 可以做什麼

Claude 可以：

- 根據任務卡實作功能
- 修改任務卡允許的檔案
- 新增任務卡允許的新檔案
- 補充必要註解
- 回報風險與限制

## Claude 不可以做什麼

Claude 不可以：

- 沒有任務卡就實作
- 擅自擴大任務範圍
- 擅自更改 UX
- 擅自更改玩法邏輯
- 擅自更改商業邏輯
- 擅自重構無關系統
- 擅自導入大型套件
- 擅自建立本機任務卡
- 擅自將假資料當正式資料
- 擅自刪除既有文件

## Claude 完成回報格式

# Claude 完成回報

## 任務 ID

## 完成摘要

## 修改檔案

## 新增檔案

## 操作方式

## 測試方式

## 驗收建議

## 已知限制

## 風險

## 建議下一步
```

---

# 5.7 `06_CODEX_VERIFICATION_RULES.md`

內容需包含：

```markdown
# House-Light｜Codex 驗收規則

## Codex 驗收目標

Codex 需確認 Claude 的實作是否符合：

1. Notion 任務卡
2. ChatGPT 規格
3. 本機協作規範
4. Claude 實作限制
5. 驗收條件

## 驗收檢查項目

Codex 需檢查：

- Claude 是否完成任務卡所有驗收條件
- Claude 是否修改未授權檔案
- Claude 是否擅自擴充需求
- Claude 是否造成既有功能破壞
- Claude 是否有明確測試方式
- Claude 是否有風險或限制未說明
- 是否需要補任務卡
- 是否需要回報 ChatGPT 更新規格

## 驗收結果

- Pass：完全通過
- Partial：部分完成，可保留但需補任務
- Fail：未達標，需建立 Revision Task
- Blocked：因規格或資源不足無法驗收

## 驗收後動作

1. 更新 Notion 任務卡
2. 填入 Claude 回報
3. 填入 Codex 驗收紀錄
4. 若失敗，建立 Revision Task
5. 若規格需要調整，回報 ChatGPT
```

---

# 5.8 `07_EXTENSION_NOTES.md`

內容需包含：

```markdown
# House-Light｜後續擴充注意事項

## 文件用途

本文件記錄 Codex 與 Claude 在後續擴充 House-Light Prototype 時必須注意的事項。

## 擴充原則

1. 每次擴充前必須有 Notion 任務卡
2. 每次擴充前必須確認是否影響既有 UX Flow
3. 每次擴充前必須確認是否影響玩法核心邏輯
4. 每次擴充前必須確認是否需要 ChatGPT 更新規格
5. 每次擴充後必須回報修改檔案與測試方式
6. 不得為了快速 Demo 犧牲後續維護性
7. 不得把 Hardcode 假資料包裝成正式系統

## Prototype 特別規則

House-Light Prototype 每個功能都必須明確定義：

- 可以點什麼
- 點了會發生什麼
- 畫面有哪些狀態
- 哪些是假資料
- 哪些是未來功能
- 哪些是 MVP 內
- 哪些是 MVP 外
```

---

# 5.9 `08_DECISION_LOG_SYNC_RULES.md`

內容需包含：

```markdown
# House-Light｜決策紀錄同步規則

## 決策紀錄位置

重要決策應同步至 Notion：

House-Light — 平台專案總覽

## 本機定位

本機只保存決策同步規則，不保存正式決策資料庫。

## 需要記錄的決策

以下內容必須記錄：

- 玩法方向改變
- UX Flow 改變
- MVP 範圍改變
- Prototype 技術方向改變
- 任務優先級重大調整
- 高層要求
- 使用者確認的產品方向
- Claude 實作造成的規格差異
- Codex 驗收發現的重要問題

## 決策紀錄格式

- 決策 ID
- 日期
- 決策狀態
- 決策來源
- 背景
- 決策內容
- 影響範圍
- 後續任務
- Notion 同步狀態
```

---

# 5.10 `09_DO_NOT_CREATE_LOCAL_TASKS.md`

內容需包含：

```markdown
# House-Light｜禁止建立本機任務卡

## 最高規則

House-Light 專案的任務卡只建立在 Notion：

House-Light新平台-任務追蹤工具

## 本機禁止事項

Codex 與 Claude 不得在本機建立：

- /tasks/
- /task-tracker/
- /todo/
- HL-TASK-xxxx.md
- 任務卡 Markdown
- 任務追蹤資料庫

## 原因

避免出現兩套任務系統，導致：

1. Notion 任務卡與本機任務卡不一致
2. Claude 讀錯任務來源
3. Codex 驗收紀錄分散
4. ChatGPT 更新規格時無法追蹤任務狀態
5. 使用者無法在 Notion 統一管理專案

## 正確做法

- 任務卡：Notion
- 協作規範：本機
- 實作前必讀：本機
- 規格正式版：Notion
- Claude 完成回報：回填 Notion 任務卡
- Codex 驗收紀錄：回填 Notion 任務卡
```

---

## 6. Handoff 模板

請在：

```text
D:\機動專案\House-Light新平台\docs\house-light\handoff
```

建立以下模板。

---

# 6.1 `CHATGPT_TO_CODEX_TEMPLATE.md`

```markdown
# ChatGPT → Codex Handoff

## 規格名稱

## 規格狀態

Draft / Review / Approved

## 背景

## 目標

## 核心需求

## UX / 玩法重點

## 建議拆分的 Notion 任務卡

## 每個任務的驗收條件

## 不包含範圍

## 風險與待確認事項

## Notion 更新位置
```

---

# 6.2 `CODEX_TO_CLAUDE_TEMPLATE.md`

```markdown
# Codex → Claude Implementation Task

## Notion 任務卡名稱

## 任務 ID

## 任務目標

## 必須完成

## 不包含

## 允許修改檔案

## 允許新增檔案

## 禁止修改檔案

## 驗收條件

## 測試方式

## 實作前必讀文件

- docs/house-light/01_READ_BEFORE_ANY_WORK.md
- docs/house-light/05_CLAUDE_IMPLEMENTATION_GUARDRAILS.md

## 完成後回報格式
```

---

# 6.3 `CLAUDE_TO_CODEX_REPORT_TEMPLATE.md`

```markdown
# Claude → Codex Completion Report

## Notion 任務卡名稱

## 任務 ID

## 完成摘要

## 完成項目

## 修改檔案

## 新增檔案

## 測試方式

## 操作說明

## 已知限制

## 風險

## 建議下一步
```

---

# 6.4 `CODEX_TO_CHATGPT_SUMMARY_TEMPLATE.md`

```markdown
# Codex → ChatGPT Verification Summary

## Notion 任務卡名稱

## 任務 ID

## 任務名稱

## 驗收結果

Pass / Partial / Fail / Blocked

## 實作摘要

## 與原規格差異

## 需要更新的規格文件

## 需要更新的 Notion 頁面

## 新增風險

## 建議下一步
```

---

## 7. Codex 初始化任務

請 Codex 立即執行：

### 任務 1：建立本機協作規範資料夾

在：

```text
D:\機動專案\House-Light新平台
```

建立：

```text
docs\house-light
docs\house-light\handoff
```

---

### 任務 2：建立本機協作規範文件

建立以下文件：

```text
00_PROJECT_CONTEXT.md
01_READ_BEFORE_ANY_WORK.md
02_AI_COLLABORATION_PROTOCOL.md
03_NOTION_TASK_CARD_RULES.md
04_SPEC_SYNC_RULES.md
05_CLAUDE_IMPLEMENTATION_GUARDRAILS.md
06_CODEX_VERIFICATION_RULES.md
07_EXTENSION_NOTES.md
08_DECISION_LOG_SYNC_RULES.md
09_DO_NOT_CREATE_LOCAL_TASKS.md
```

---

### 任務 3：建立 Handoff 模板

建立：

```text
handoff\CHATGPT_TO_CODEX_TEMPLATE.md
handoff\CODEX_TO_CLAUDE_TEMPLATE.md
handoff\CLAUDE_TO_CODEX_REPORT_TEMPLATE.md
handoff\CODEX_TO_CHATGPT_SUMMARY_TEMPLATE.md
```

---

### 任務 4：不得建立本機任務卡

請確認：

```text
不建立 docs\house-light\tasks
不建立任何 HL-TASK-xxxx.md
不建立本機 task tracker
```

任務卡應由 Codex 在 Notion 的以下頁面建立：

```text
House-Light新平台-任務追蹤工具
```

---

## 8. Codex 完成後回報格式

完成後請 Codex 回報：

```markdown
# Codex 本機協作規範初始化回報

## 已確認本機路徑

D:\機動專案\House-Light新平台

## 已建立資料夾

## 已建立文件

## 已建立 Handoff 模板

## 已確認未建立本機任務卡

## 後續建議

## 需要使用者確認事項

## 是否需要建立 Notion 任務卡
```

---

## 9. 最終提醒

請 Codex 特別注意：

1. 本機只放協作規範與注意事項
2. 任務卡只建立在 Notion
3. `House-Light新平台-任務追蹤工具` 是唯一任務管理位置
4. Claude 每次實作前都要讀本機必讀文件
5. Codex 每次拆任務前都要確認規格來源
6. 任何任務都不可在本機建立 HL-TASK Markdown
7. 若需要追蹤任務，請到 Notion 建立或更新任務卡
