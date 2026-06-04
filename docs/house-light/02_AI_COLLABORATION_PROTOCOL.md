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
