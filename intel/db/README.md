# intel/db/ — ApexWin 自我進化引擎「知識資料庫」

> 這是引擎的**持續累積 + 驗證**資料層（2026-07-23 重構新增）。
> 三軌 Routine（platform / games / maintain）每輪把調研結果寫進這裡，**永不吃固定清單**：每次執行都重新取材、更新、標記驗證時間。
> 目的：把「調研 → 分析 → 資料庫 → 發卡 → 實作」變成有記憶、可累積、可驗證的閉環，**拒絕無效任務與閒置空轉**。

---

## 檔案地圖

| 檔案 | 是什麼 | 誰維護 |
|---|---|---|
| `platforms.json` | **web casino 觀察庫**（前身 watchlist.json）：對標平台清單 + 流量/名氣訊號 + 調研排程游標 | platform 軌 |
| `platform-modules.json` | **平台功能模組台帳**：完整功能目錄（8 分類）× ApexWin 現況（present/stowed/weak/absent）+ 擴充性模式。確保「項目齊全 + 用不到可收納」 | platform 軌 |
| `providers.json` | **博弈遊戲開發商庫** + 招牌機制 + 遊戲分類法 | games 軌 |
| `games-catalog.json` | **遊戲候選庫**：每輪從遊戲媒體重新列出的新遊戲 + 評分 + **復刻狀態**（candidate→specd→building→built/rejected）+ 保真分數 | games 軌 |
| `game-fidelity-spec.md` | **遊戲保真規格 + 上線閘檢查清單**（規則/流程/節奏）。復刻任何遊戲前必讀、上線前必過 | games 軌讀，maintain 軌可補 |
| `sourcing-methods.md` | 兩軌的**每輪重新取材方法**（casino 流量榜 / 遊戲媒體 API）。skill 保持精簡，方法維護在此 | 兩軌共用 |

---

## 每筆資料的通用驗證欄位（拒絕過期）

無論平台或遊戲，每筆 entry 盡量帶：

- `source` — 來源（含 url / 榜單名），**不臆造絕對數字**，只記名次/趨勢/共識。
- `first_seen` — 首次進庫日期。
- `last_verified` — 上次查證日期。
- `confidence` — `high | medium | low`（多源交叉=high，單源估計=low）。
- `status` — 生命週期狀態（各庫定義不同）。
- `next_due` / `refresh_interval_days` — 到期重驗游標（T1 7天 / T2 14天 / T3 30天）。

**驗證循環**：`last_verified` 距今 > `stale_days`（CONTROL 預設 7）→ 自動排回調研佇列重新查證。這保證資料庫**持續被刷新**，而不是寫一次就腐爛。

---

## 「拒絕閒置」與資料庫的關係

CONTROL 的 `idle_escalation: revalidate` 逃生閥就靠這個資料庫運作：
當某軌本輪找不到新工作時，**不准發空心跳** → 改去把本庫中 `last_verified` 最舊的 N 筆重新查證（驗證工作永遠有）→ 若連驗證都飽和，才寫一則閒置報告給船長並退避。
所以這個資料庫既是「知識累積處」，也是「永遠有意義工作可做」的來源。
