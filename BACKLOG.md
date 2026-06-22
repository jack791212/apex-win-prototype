# ApexWin 任務佇列（Backlog）

**這是「一項一項往下做」的執行清單。** 策略全貌見 [ROADMAP.md](ROADMAP.md)。

工作方式：
1. 每日 Routine「apexwin-daily-next-step」把建議寫進下方「分析師日誌」，並把新任務放進「任務佇列」標 `⬜待批准`。
2. 你批准後，負責實作的 Claude 把該項移到 `🏗️進行中` → 做完標 `✅完成`（附 commit 短碼與日期）。
3. 預設依佇列由上往下做；你可隨時插隊或調整順序。

狀態：`⬜待批准` · `🟦已批准待做` · `🏗️進行中` · `✅完成`
原則：體驗/速度 > 資安；需牌照的功能不進此佇列（留在 ROADMAP 的 ⏸️DEFER）。

---

## 任務佇列（依優先序）

1. ✅ **Wave 1：留存基礎** — 收藏/我的最愛 + 每日簽到 streak + 底部死按鈕通電 + 縮圖 lazy-load　`(15101e5, 2026-06-22)`
2. 🟦 **統一 instant 引擎 `HL.instant`** — 共用下注面板/RNG/賠率連動/½·2×·Max/Turbo/autobet 掛點　— M —　*NEXT 加速器，先做這個，後續 instant 遊戲成本 M→S*
3. ⬜ **Dice + Limbo**（掛統一引擎，單步結果最易驗證）— S
4. ⬜ **Crash + Mines**（複用 chicken.js / bounty.js 狀態機）— M
5. ⬜ **Plinko**（落球動畫 + 風險檔 + 倍數槽）— M
6. ⬜ **留存三件套**：VIP 等級 MVP + 任務/成就引擎 + 獎金錢包/領取中心 — M
7. ⬜ **百家樂 / 輪盤 RNG 桌** → 主播跟注接真開獎（取代 liveroom Math.random）— M
8. ⬜ **Rakeback 返水**即時回饋（綁等級係數）— M
9. ⬜ **真實累積彩金 Jackpot**（demo 獎池遞增 + 命中演出）— M
10. ⬜ **通知中心**（接 header 🔔 badge）— M
11. ⬜ **遊戲卡「試玩 / 真錢」雙鈕** — S
12. ⬜ **搜尋排序 + 最近遊玩** — S
13. ⬜ **i18n 輕量引擎 + 語言切換器**（接 🌐，目標3）— S
14. ⬜ **PWA**（manifest + Service Worker）— M

> 更大型（紅利/流水引擎、運動博彩、Crazy Time、錦標賽、Provably Fair、營運後台）見 ROADMAP 🔵LATER，做完上面再升級進佇列。

---

## 分析師日誌（每日 Routine 追加，最新在上）

- **2026-06-22** — 完成 Wave 1（收藏 + 每日簽到 + 死按鈕通電）。建議下一步：**統一 instant 引擎 `HL.instant`**（佇列 #2）。理由：先磨刀，之後 Dice/Limbo/Crash/Mines/Plinko 五款的工作量從 M 降到 S，是所有 originals 的加速器；且 autobet 是 instant 類標準配備（目前僅 slot 固定 auto=10）。
