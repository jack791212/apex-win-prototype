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
2. 派發任務時只告知 Claude 任務 ID，讓 Claude 自行讀取 Notion 任務卡
3. 根據驗收結果更新狀態
4. 需要修正時建立 Revision Task
5. 將阻塞問題回報使用者或 ChatGPT

## 通用派發與回填規則

- Codex 派發任務時，只需告知 Claude 任務 ID。
- Claude 必須自行讀取 Notion 任務卡與本機必讀文件。
- Codex 派發後，必須將任務卡狀態改為：進行中。
- Claude 完成後，必須直接回填該 Notion 任務卡。
- Claude 回填內容至少包含：完成摘要、完成項目、新增檔案、修改檔案、新增內容說明、修改內容說明、測試方式、驗收方式、操作說明、已知限制、風險、建議下一步。
- Claude 完成並回填後，必須主動將任務卡狀態改為：待驗收。
- Codex 驗收後，依結果將任務卡狀態更新為：已完成或驗收失敗。
- 任何派發、回填、驗收資料都以 Notion 任務卡為準。

## Claude 全權實作模式下的 Notion 回補

若使用者宣布 Claude 全權實作，Codex 不必為每個小調整新增任務卡。

Codex 應根據 Claude 修改後結果：

- 回補既有任務卡的完成狀態
- 補上 Codex 驗收紀錄
- 記錄仍需修正或優化的項目
- 需要時建立 Notion 後續任務或 Revision Task
- 將口頭優化方向整理成 Claude 可執行文字

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
