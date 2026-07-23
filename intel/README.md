# intel/ — ApexWin 自我進化引擎（市場情報 + 知識資料庫層）

這個資料夾是 ApexWin 的「自我進化」大腦：一條 **調研 → 資料庫 → 發卡 → 自動實作** 的無限循環，
目的是讓平台**不需要你一直手動決定要做什麼**，就能持續對標全球線上博弈市場、自我長大。

> 🔄 **2026-07-23 重構**：從舊四軌（radar/investigate/evolve/consolidate + build/polish/mode 開關）
> 改為 **三軌雙線**。成長不再被單一 mode 開關悶住；新增 `intel/db/` 知識資料庫做持續累積+驗證；
> 每軌內建「拒絕閒置逃生閥」——無真工作時不空轉，改去重驗資料庫或誠實回報退避。

```
成長線（兩條常開，各自跑完整循環：調研→資料庫→發卡→實作）
① 平台進化軌 apexwin-platform ── 前端UI/UX·後台·金流·功能·活動·資安·資料·擴充性
   每輪重新調研頂級 casino(流量/名氣多訊號) → 更新平台模組台帳 → 開卡 → 實作(擴充性優先:先做可收納/可擺放的容器再填功能)
② 遊戲擴充軌 apexwin-games ──── SLOT·棋牌·crash/instant·game-show·特殊
   每輪從遊戲媒體(BigWinBoard/SlotCatalog/Slotslaunch/供應商官頁)重新列新遊戲+評分 → 寫保真規格 → 復刻 → 過保真閘才上線

維護線
③ 維護健檢軌 apexwin-maintain ── 打磨既有表面(UI/UX·自適應·模板化·去重複·死碼·a11y·i18n) + 引擎健檢 + 拒絕閒置
```

---

## 🎛️ 你唯一要碰的檔：`CONTROL.md`

- **總開關** `loop_enabled`：`true` 開始自動跑、`false` 全面暫停。
- **三軌開關**：`platform_track_enabled` / `games_track_enabled` / `maintain_track_enabled` / `auto_implement`。
  - 想「只蒐情報、先別動 code」→ `auto_implement: false`（仍會開卡等你看）。
- **起步優先** `lead_track`：`platform`（現值，平台先）/ `games` / `balanced`。
- **遊戲保真閘** `fidelity_gate` / `require_spec_before_code` / `fidelity_min_rtp_sims`：治「調查隨便→劣質遊戲」。
- **拒絕閒置** `ban_busywork_heartbeat` / `idle_escalation` / `idle_backoff_rounds` / `stale_days`：修「無意義一直跑」。
- **寫入鎖** `build_lock`：寫入型 routine 進場上 claim-token 鎖(p-/g-/m-)、收尾清 `false`。卡住時手動設回 `false`。
- **船長指令區**：寫你的意見/插隊優先項，Routine 先讀、優先處理，並在「已回應」回覆。

---

## 📁 檔案地圖

| 檔案 | 角色 | 誰維護 |
|---|---|---|
| `CONTROL.md` | 總控制台：三軌開關 + 保真閘 + 逃生閥 + 船長指令 | **你**（手改）|
| `STATE.json` | 循環游標與計數（last_*_run 三軌、counters、consecutive_idle_rounds）| 各軌 |
| `db/platforms.json` | web casino 觀察庫（前身 watchlist.json）+ 調研排程游標 | platform 軌 |
| `db/platform-modules.json` | 平台功能模組台帳(8 分類 × 現況 + 擴充性模式) | platform 軌 |
| `db/providers.json` | 博弈遊戲開發商庫 + 招牌機制 + 分類法 | games 軌 |
| `db/games-catalog.json` | 遊戲候選庫 + 評分 + 復刻狀態 + 保真分數 | games 軌 |
| `db/game-fidelity-spec.md` | 遊戲保真規格 + 13 項上線閘檢查清單 | games 軌讀 |
| `db/sourcing-methods.md` | 兩軌每輪重新取材方法 | 兩軌 |
| `db/README.md` | 資料庫 schema + 驗證契約 | — |
| `platforms/<slug>.md` | 每平台一份調研檔 | platform 軌 |
| `reports/<date>.md` | 市場報告（歷史） | platform 軌 |
| `DEBT.md` | 技術債/打磨佇列 | maintain 軌 |
| `loop-journal.md` | 各軌每輪心跳（最新在上） | 各軌 |

## 🔁 三個 Routine（排程在本機，App 開著時才會觸發）

| Routine | 頻率(可調) | 做什麼 | Skill |
|---|---|---|---|
| `apexwin-platform` | 每日 08/14/20 時 | 重新調研頂級 casino → 更新模組台帳 → 開卡 → 實作 1(擴充性優先) | `/apexwin-platform` |
| `apexwin-games` | 每日 10/16/22 時 | 從遊戲媒體重新列新遊戲+評分 → 保真規格 → 復刻 → 過保真閘上線 | `/apexwin-games` |
| `apexwin-maintain` | 每日 00/12 時 | 打磨既有 + 引擎健檢 + 拒絕閒置逃生閥 | `/apexwin-maintain` |

> 三軌都遵守 `build_lock` 互不並行寫入（claim-token 再讀確認防 TOCTOU）。時段錯開，避免同時觸發。

## ▶️ 手動跑（測試/想立刻看效果）
三個 Skill 都可手動叫：`/apexwin-platform`、`/apexwin-games`、`/apexwin-maintain`。手動執行同樣先讀 CONTROL 做閘門。

## 🛑 拒絕閒置（重構核心）
舊引擎的病：飽和後每天空轉數輪、發「本輪無新債」空心跳 commit。新引擎每軌找不到真工作時**禁止空心跳**，按 `idle_escalation` 升級：① 加深/擴大調研找工作 → ② 重驗 `db/` 中 `last_verified` 最舊的 N 筆或補已知品質缺口（驗證工作永遠有）→ ③ 連續 `idle_backoff_rounds` 輪仍飽和 → 寫閒置報告給船長並退避跳過接下來 N 次觸發。**要嘛做真工作、要嘛做真驗證、要嘛誠實回報退避。**

## ⏱️ 本機排程的限制
排程只有在 **Claude Code App 開著**時才會觸發；關掉期間到期的任務下次開 App 時補跑或順延。要 24/7 需改雲端 routine。
