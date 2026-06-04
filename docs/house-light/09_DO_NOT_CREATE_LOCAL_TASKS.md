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
