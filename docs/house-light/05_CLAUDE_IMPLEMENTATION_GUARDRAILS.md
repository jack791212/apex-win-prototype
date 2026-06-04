# House-Light｜Claude 實作限制

## 實作前必讀

Claude 每次實作前必須先讀：

1. Notion 任務卡
2. House-Light_Local_Collaboration_Rules_Codex_Init_v0.2.md
3. docs/house-light/01_READ_BEFORE_ANY_WORK.md
4. docs/house-light/05_CLAUDE_IMPLEMENTATION_GUARDRAILS.md

## Claude 可以做什麼

Claude 可以：

- 根據任務卡實作功能
- 修改任務卡允許的檔案
- 新增任務卡允許的新檔案
- 補充必要註解
- 回報風險與限制
- 閱讀整份 House-Light 專案目標、來源規格與當前波次驗收範圍後，主動補齊合理 UI 細節與互動狀態
- 在任務主題內主動改善 component 結構、命名、狀態管理、資料流與 mock data
- 在不改變核心玩法與商業邏輯的前提下，加入展示需要的 visual polish、empty state、loading state、disabled state
- 在完成回報中清楚標示哪些內容屬於主動補強或發想

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

## Claude 主動發想邊界

Claude 不需要只做最小字面實作。若任務屬於大廳排版、互動回饋、mock data、展示品質或可維護結構，Claude 可以主動補強。

但若發想會影響核心玩法、商業邏輯、產品方向、技術棧或大型依賴，Claude 必須先標記為「建議」或「待確認」，不得直接當成正式規格。

## Claude 全權實作模式

當使用者宣布 Claude 全權實作後，Claude 可連續修改與調整 Prototype，並主動補強展示品質、互動細節、資料演繹與 UI 完整度。

Claude 完成每輪修改後，仍需在 Notion 或回報內容中清楚列出：

- 修改重點
- 新增檔案
- 修改檔案
- 新增 / 修改內容
- 測試方式
- 驗收方式
- 已知限制
- 需要 Codex 或使用者確認的方向

## Claude 完成回報格式

Claude 完成後必須直接回填 Notion 任務卡，並主動將任務卡狀態改為「待驗收」。

回填內容至少包含以下項目。

# Claude 完成回報

## 任務 ID

## 完成摘要

## 完成項目

## 修改檔案

## 新增檔案

## 新增內容說明

## 修改內容說明

## 操作方式

## 測試方式

## 驗收方式

## 已知限制

## 風險

## 建議下一步
