# intel/ — ApexWin 自我進化引擎（市場情報層）

這個資料夾是 ApexWin 的「自我進化」大腦：一條 **市場調研 → 缺口分析 → 自動實作** 的無限循環，
目的是讓平台**不需要你一直手動決定要做什麼**，就能持續對標全球線上博弈市場、自我長大。

```
①市場雷達  → ②逐一調研  → ③缺口進化  → ④自動實作  ──┐
（掃排名熱度）  （深挖到期平台）  （轉成任務卡）   （改 code+push）  │
   ▲                                                          │
   └──────────────  維持各平台週期更新  ◀──────────────────────┘
```

---

## 🎛️ 你唯一要碰的檔：`CONTROL.md`

- **總開關** `loop_enabled`：`true` 開始自動跑、`false` 全面暫停（所有 Routine 一啟動就安靜退出）。
- **分段開關**：`radar_enabled` / `investigate_enabled` / `evolve_enabled` / `auto_implement`。
  - 想「只蒐情報、先別動 code」→ 把 `auto_implement` 設 `false`（仍會開任務卡等你看）。
- **船長指令區**：寫你的意見/問題/插隊優先項，Routine 會先讀、優先處理，並在「已回應」區回覆你。

> ⚠️ 出廠預設 `loop_enabled: false`。檢視過設定、滿意了再翻成 `true` 才會開始自動動 code。

---

## 📁 檔案地圖

| 檔案 | 角色 | 誰維護 |
|---|---|---|
| `CONTROL.md` | 總控制台：開關 + 船長指令 | **你**（手改）|
| `watchlist.json` | 平台觀察清單 + 調研排程游標（排序/週期/到期日）| 市場雷達寫、逐一調研回填 |
| `STATE.json` | 循環游標與計數（last_run、high-water）| 各 Routine |
| `platforms/<slug>.md` | 每個平台一份調研檔（玩法/留存/UX/缺口）| 逐一調研 |
| `reports/<date>.md` | 市場報告（排名變動、新進場、值得關注主題）| 市場雷達 |

## 🔁 三個 Routine（排程在本機，App 開著時才會觸發）

| Routine | 頻率 | 做什麼 | 用哪個 Skill |
|---|---|---|---|
| `apexwin-market-radar` | 每日 08:00 | 掃各國/全球排名熱度 → 更新清單排序 + 出市場報告 | `/apexwin-market-radar` |
| `apexwin-investigate` | 每小時 | 取清單上「到期 + 高優先」的前 N 個逐一深挖 → 寫調研檔 + 排下次到期 | `/apexwin-investigate` |
| `apexwin-evolve` | 每 2 小時 | 把新調研轉成 BACKLOG 任務卡 →（auto_implement）挑一張自動實作+push | `/apexwin-evolve` |

> 「不重複跑、抓週期」靠 `watchlist.json` 的 `next_due` + `priority`：每次只取到期且最高優先的，做完把 `next_due` 推到 `今天 + refresh_interval_days`（T1 7天 / T2 14天 / T3 30天）。冷門平台自然低頻刷，熱門平台高頻刷。

## ▶️ 手動跑（測試/想立刻看效果）

三個 Skill 都可手動叫：在 Claude Code 輸入 `/apexwin-market-radar`、`/apexwin-investigate`、`/apexwin-evolve`。
手動執行**同樣會先讀 CONTROL**，所以 `loop_enabled: false` 時手動跑也會被擋（想單獨測試可暫時翻 true，或直接跑對應 skill 並在指令裡說「忽略開關，這是手動測試」）。

## ⏱️ 本機排程的限制

排程只有在 **Claude Code App 開著**時才會觸發；關掉 App 或關機期間到期的任務，會在下次開啟 App 時補跑（或順延）。想要 24/7 不間斷，需改用雲端 routine（屆時再談）。
