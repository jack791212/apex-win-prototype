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
2. ✅ **統一 instant 引擎 `HL.instant`** — 共用下注面板 + ½·2×·Max + 手動/自動下注(局數/贏後+%/輸後+%/止盈/止損/Turbo)　`(2026-06-22)`
3. ✅ **Dice + Limbo**（掛統一引擎，1% 莊家優勢，手動+自動）— 可玩遊戲 2 → 4 款　`(2026-06-22)`
4. ✅ **Crash + Mines**（互動式回合：Crash 倍數爬升+自動兌現；Mines 翻格累乘+兌現）— 可玩 4 → 6 款　`(2026-06-22)`
5. ✅ **Plinko**（8 排落球 + Low/Med/High 風險 + 9 倍數槽）— **originals 五天王補滿**，可玩 6 → 7　`(2026-06-22)`
6. 🟦 **留存三件套**：VIP 等級 MVP + 任務/成就引擎 + 獎金錢包/領取中心 — M　← *建議下一步*
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

- **2026-06-22（晚上）** — 完成 #5 Plinko，**originals 五天王(Dice/Limbo/Crash/Mines/Plinko)補滿**，可玩遊戲 6 → 7。遊戲擴充告一段落；建議轉做 **#6 留存三件套**（VIP 等級 + 任務/成就 + 獎金錢包），把玩家 widget「Unranked」換真段位、點亮升級動機，與每日簽到相乘。
- **2026-06-22（傍晚）** — 完成 #4 Crash + Mines（可玩遊戲 4 → 6 款）。Crash：倍數爬升+手動/自動兌現；Mines：5×5 翻格累乘+隨時兌現，皆 1% 莊家優勢、掛 HL.instant。建議下一步：**#5 Plinko**（落球動畫 + Low/Med/High 風險 + 倍數槽），補滿 originals 五天王（可玩 6 → 7）。
- **2026-06-22（下午）** — 完成 #2 統一 instant 引擎 `HL.instant` + #3 Dice/Limbo（可玩遊戲 2 → 4 款，含手動/自動下注、1% 莊家優勢）。建議下一步：**#4 Crash + Mines**——複用 chicken.js（Crash 家族範本：倍數/cashout）與 bounty.js（Mines 後端雛形）狀態機，掛上 HL.instant，可玩數可再 4 → 6。
- **2026-06-22** — 完成 Wave 1（收藏 + 每日簽到 + 死按鈕通電）。建議下一步：**統一 instant 引擎 `HL.instant`**（佇列 #2）。理由：先磨刀，之後 Dice/Limbo/Crash/Mines/Plinko 五款的工作量從 M 降到 S，是所有 originals 的加速器；且 autobet 是 instant 類標準配備（目前僅 slot 固定 auto=10）。
