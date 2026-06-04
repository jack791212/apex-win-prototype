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
- Claude 接到任務 ID 後，必須同時理解 House-Light 專案總覽、來源規格與當前波次驗收範圍，不應只看單張卡片做最低限度實作。
- Codex 派發任務後，必須將任務卡狀態改為：進行中。
- Claude 完成後，必須直接回填該 Notion 任務卡。
- Claude 回填內容至少包含：完成摘要、完成項目、新增檔案、修改檔案、新增內容說明、修改內容說明、測試方式、驗收方式、操作說明、已知限制、風險、建議下一步。
- Claude 完成並回填後，必須主動將任務卡狀態改為：待驗收。
- Codex 驗收後，依結果將任務卡狀態更新為：已完成或驗收失敗。
- 任何派發、回填、驗收資料都以 Notion 任務卡為準，不建立本機任務卡。

## Claude 主動發想授權

Claude 可以在任務主題與當前波次驗收目標內，主動補齊 UI 細節、互動狀態、mock data、展示內容、component 結構與小範圍維護性改善。

Claude 不需要只做最小字面實作；但若會影響核心玩法、商業邏輯、產品方向、技術棧或大型依賴，必須先標記為「建議」或「待確認」。

## Claude 全權實作模式

當使用者明確宣布進入 Claude 全權實作模式後：

- Claude 全權負責 Prototype 的修改、調整與補強。
- Codex 不再逐張細碎派發任務，而是驗證 Claude 修改後的結果。
- Codex 負責回補 Notion 任務卡、整理驗收紀錄、標記風險與待調整項目。
- Codex 與使用者一起思考下一輪優化內容，再整理成 Claude 可直接執行的文字。
- 若需要追蹤新工作，仍只能建立或更新 Notion 任務卡，不建立本機任務卡。

## 嚴禁事項

- Claude 不可跳過任務卡直接實作
- Claude 不可只看口頭描述就自由開發
- Codex 不可在本機建立任務卡
- Codex 不可把推測寫成正式規格
- Claude 不可擅自導入大型套件
- Claude 不可擅自大規模重構
- Claude 不可改變已確認 UX / 玩法 / 商業邏輯
