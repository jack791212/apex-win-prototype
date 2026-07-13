# 換 Claude 帳號 — 新帳號啟動包（HANDOFF-KICKOFF）

> **用途**：把 ApexWin / House-Light 新平台專案交給「新 Claude 帳號的 Claude Code」時，
> 在同一台電腦、同一個資料夾 `D:\機動專案\House-Light新平台` 打開 Claude Code 後，
> **把下面「啟動訊息」整段複製、貼成第一則訊息**，新的 Claude 就會自己讀交接檔、確認記憶、
> 重建引擎排程，然後開始運作。
>
> 完整專案交接內容見同資料夾的 [`CLAUDE.md`](CLAUDE.md)（每次開 session 會自動載入）。

---

## 為什麼貼一段話就能運作

- `CLAUDE.md` 已在 repo 內、**每次開 session 自動載入** → 新 Claude 一開就有全部脈絡，不用手動貼交接內容。
- 記憶與舊對話在 `C:\Users\mingko.hsieh\.claude\projects\D-------House-Light---\`，**同一台機器、同一個 Windows 使用者換 Anthropic 帳號本來就還在**（`~/.claude` 位置與登入哪個帳號無關）。
- 所以這段話唯一在補的，是**換帳號才會斷的兩件事**：重建 4 個排程 Routine、補回引擎的 git 自動提交權限。

---

## 啟動訊息（複製這整段，貼到新帳號 Claude Code 的第一則訊息）

```text
接手 ApexWin / House-Light 新平台專案。我把它從舊 Claude 帳號搬過來，
現在用你（新帳號）在同一台電腦、同一個資料夾 D:\機動專案\House-Light新平台 繼續。
請照下列步驟接手，做完跟我回報：

1) 讀 repo 根目錄的 CLAUDE.md（會自動載入）——那是完整交接文件。讀完用三五句話
   跟我複述你掌握到的重點：專案定位、現在的 mode、BACKLOG 佇列現況，讓我確認你有承接到。

2) 確認記憶還在：檢查 C:\Users\mingko.hsieh\.claude\projects\D-------House-Light---\memory\
   有沒有 MEMORY.md 與各 apexwin-*.md。有就代表記憶延續（同機器換帳號本來就會在）。

3) 重建自我進化引擎的 4 個排程 Routine（舊帳號的排程沒跟過來）。用 scheduled-tasks 建立，
   每個都是薄包裝：「先讀 intel/CONTROL.md → 若 loop_enabled:false 或對應開關 false 就安靜退出
   → 否則 Read 並遵照對應的 .claude/skills/<name>/SKILL.md」，全部 notifyOnCompletion：
     - apexwin-investigate    每小時      0 * * * *
     - apexwin-market-radar   每日 08:15  15 8 * * *
     - apexwin-evolve         每 2 小時   45 */2 * * *
     - apexwin-consolidate    每 2 小時   25 */2 * * *

4) 引擎要能無人值守自動 commit/push，需要在「使用者層」 ~/.claude/settings.json 加 git 權限
   allowlist（WebSearch, WebFetch, Read, Write, Edit, Glob, Grep, Bash(git *)）。這是放寬授權，
   先問我同意、我說可以你再寫；沒設的話引擎會卡在 git commit。

做完 1–4 回報狀態。之後我會用「繼續」叫你接 BACKLOG 佇列頂端的卡；動任何 code 前
務必遵守 CLAUDE.md §7 的並行安全提交鐵律（背景引擎會同時寫同一 repo）。
```

---

## 常見情況

- **只想先把平台跑起來、暫時不要引擎自動改 code**：把 `intel/CONTROL.md` 的 `loop_enabled` 設 `false`，步驟 3、4 可以之後再做；平台本身照常能開發與測試（線上 `https://jack791212.github.io/apex-win-prototype/prototype/?demo=1`，或本機 `prototype/serve.ps1`）。
- **步驟 3、4 需要的前提**：新帳號那邊要有 `scheduled-tasks` MCP；首次執行工具時按「Always allow」；步驟 4 的權限寫入會等你點頭才動。
- **換的是電腦或 Windows 使用者（不只是換帳號）**：先把整個 `C:\Users\<你>\.claude\projects\D-------House-Light---\` 資料夾複製到新機對應路徑，記憶與舊對話 transcript 才會跟過去（細節見 `CLAUDE.md` §8）。
