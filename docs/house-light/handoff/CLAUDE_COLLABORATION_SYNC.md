# Claude Collaboration Sync｜House-Light 新平台

請 Claude 在開始任何 House-Light 實作前，先閱讀並遵守以下協作規範。

## 專案本機路徑

```text
D:\機動專案\House-Light新平台
```

## 必讀文件

開始任何實作前，請先讀取：

1. `docs/house-light/01_READ_BEFORE_ANY_WORK.md`
2. `docs/house-light/05_CLAUDE_IMPLEMENTATION_GUARDRAILS.md`
3. `docs/house-light/02_AI_COLLABORATION_PROTOCOL.md`
4. `docs/house-light/03_NOTION_TASK_CARD_RULES.md`

## 任務卡唯一來源

所有任務卡只存在 Notion：

```text
House-Light新平台-任務追蹤工具
```

Claude 不可以根據口頭描述、本機猜測或未確認規格直接實作。  
Claude 只有在拿到明確 Notion 任務卡後，才可以開始實作。

## 三方分工

- ChatGPT：負責產品方向、規格書、UX、玩法、Prototype Scope 與規格更新。
- Codex：負責將規格拆成 Notion 任務卡、派發 Claude 任務、驗收 Claude 實作、更新 Notion 任務卡。
- Claude：只負責根據 Notion 任務卡執行程式功能實作，並在完成後回報給 Codex。

## 標準協作流程

1. 使用者或 ChatGPT 產出需求與規格
2. Codex 將規格轉為 Notion 任務卡
3. Claude 讀取 Notion 任務卡
4. Claude 讀取本機必讀文件
5. Claude 依任務卡允許範圍實作
6. Claude 完成後回報 Codex
7. Codex 驗收實作結果
8. Codex 更新 Notion 任務卡
9. 若規格需要調整，由 Codex 整理給 ChatGPT 更新

## Claude 可以做的事

- 根據 Notion 任務卡實作功能
- 修改任務卡明確允許的檔案
- 新增任務卡明確允許的新檔案
- 補充必要且簡潔的程式註解
- 回報測試方式、限制、風險與建議下一步

## Claude 不可以做的事

- 沒有 Notion 任務卡就開始實作
- 擅自擴大任務範圍
- 擅自更改 UX、玩法或商業邏輯
- 擅自大規模重構無關系統
- 擅自導入大型套件
- 擅自建立本機任務卡
- 擅自建立 `tasks`、`task-tracker`、`todo` 等本機任務資料夾
- 擅自建立任何 `HL-TASK-xxxx.md`
- 擅自把假資料包裝成正式資料
- 擅自刪除既有文件

## 本機禁止建立任務卡

本機只保存協作規範、實作前必讀文件、handoff 模板與注意事項。  
任務卡只能建立在 Notion。

禁止在本機建立：

```text
/tasks/
/task-tracker/
/todo/
HL-TASK-xxxx.md
任務卡 Markdown
任務追蹤資料庫
```

## Claude 完成後回報格式

請 Claude 完成任務後，使用以下格式回報給 Codex：

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

## 實作啟動條件

Claude 可以開始實作前，必須同時滿足：

1. 已有明確 Notion 任務卡
2. 任務卡包含目標、範圍、不包含範圍與驗收條件
3. 任務卡列出允許修改或新增的檔案
4. Claude 已閱讀本機必讀文件
5. 若規格不明確，先回報 Codex，不自行補需求

## 給 Claude 的一句話原則

只根據明確 Notion 任務卡實作，不自行擴大需求；完成後把修改內容、測試方式、限制與風險完整回報 Codex。
