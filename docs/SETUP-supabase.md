# Apex Win 接 Supabase｜你的操作手冊（約 10 分鐘）

> 前端我已全部寫好，且**未填 creds 時自動維持現有 Demo 模式**（不會壞）。
> 你只要做下面 4 步，填好 creds 就會切換成「真會員系統」。

---

## Step 1 — 建立 Supabase 專案
1. 到 https://supabase.com → 用 GitHub/Google 註冊登入
2. **New project** → 取名（如 `apex-win`）、設一組資料庫密碼（先記著，這步不會用到前端）、選最近區域（如 Singapore）
3. 等專案建好（約 1–2 分鐘）

## Step 2 — 建資料表（貼 SQL 按 Run）
1. 左側 **SQL Editor** → New query
2. 打開本專案的 `docs/supabase-setup.sql`，**全選複製 → 貼上 → 右下 Run**
3. 看到 Success 即建好（profiles / battle_history / RLS / 觸發器）

## Step 3 — 關掉 Email 確認（試做免收信）
1. 左側 **Authentication → Providers → Email**
2. 把 **Confirm email** 開關**關掉** → Save
   （這樣註冊完直接就能用，不用去收驗證信。日後要嚴謹再打開。）

## Step 4 — 填 creds 到前端
1. 左側 **Project Settings → API**，複製兩個值：
   - **Project URL**（像 `https://abcd1234.supabase.co`）
   - **anon public** key（很長一串 `eyJ...`，這個可公開）
2. 打開 `prototype/src/core/config.js`，把這兩個字串填進去：
   ```js
   SUPABASE_URL: "https://abcd1234.supabase.co",
   SUPABASE_ANON_KEY: "eyJhbGciOi... (你的 anon key)",
   ```
3. 存檔。重新整理頁面 → 會看到**登入頁**。註冊一組 email/密碼即可進入，餘額/戰績從此跨裝置同步。

> ⚠️ 只填 **anon public** key，**絕不要**填 `service_role`（那是後台密鑰，不能進前端）。

---

## 之後我們一起驗收（你填好 creds 後跟我說一聲）
- 註冊 / 登入 / 登出
- 玩一場 slot 或 Battle 扣加分 → 重整後餘額仍在（雲端同步）
- 打一場對戰 → `battle_history` 多一列、戰績清單/回放讀得到
- 換一台裝置登入同帳號 → 資料一致

## 想用 Magic Link / Google 登入（選配）
Email/密碼**不需要**這步。要讓「✉ 寄登入連結」或 Google 在正式站運作，到
Authentication → URL Configuration：
- **Site URL** 設成 `https://jack791212.github.io/apex-win-prototype/prototype/`
- **Redirect URLs** 加入（App 實際在 /prototype/ 下，務必含此路徑）：
  - `https://jack791212.github.io/apex-win-prototype/prototype/`
  - `http://localhost:8777/`（本機測試）
Google 另需到 Authentication → Providers → Google 開啟並填 Google OAuth Client（Google Cloud Console 建）。

## 後續階段 SQL（已完成的請打勾）
每一份都要在 SQL Editor **開新的查詢分頁**貼上 → Run（不要覆蓋舊分頁）：
- [x] `docs/supabase-phase4.sql` — 對戰開獎/結算搬後端（play_battle）
- [x] `docs/supabase-phase4b.sql` — slot + 賞金局開獎也搬後端（slot_spin / slot_buy / bounty_flip / bounty_mine）
- [ ] `docs/supabase-phase5.sql` — 錢包記帳（wallet_txn）+ 大獎牆/貢獻榜真資料（big_wins / feeds）+ 小雞過馬路伺服器開獎（chicken_*）+ 既有遊戲函式升級（累計有效押注、落獎上牆）+ profiles 欄位級防竄改

> phase5 沒跑之前，前端也不會壞：小雞自動降級「練習模式」、錢包儲值/提款會提示尚未部署、大獎牆/貢獻榜維持 Demo 假動態。

## 重要提醒
- **虛擬點數**：帳號內是 Demo 點數，不涉及真實金流（碰真錢是另一個含牌照/KYC 的專案）。
- **本機測 OAuth/Magic Link** 要用 `serve.ps1`（http://localhost:8777），不能用 file:// 直接開。
- 開獎已搬後端（phase4/4b/5）：對戰、slot、賞金局、小雞的開獎與餘額皆由伺服器函式決定（防作弊）。
