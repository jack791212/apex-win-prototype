# Apex Win × Supabase 改造計畫（會員/登入/真玩家資料 試做）

> 目標：把現在的純靜態 Prototype，接上 **Supabase**（Auth + Postgres），做到「真註冊/登入 + 跨裝置的真玩家資料」。**維持虛擬點數**（零法規風險）。
> 原則：**前端不重寫**。沿用 `window.HL` 全域 + classic script + zero-build；新增一層資料服務當邊界，畫面層幾乎不動。

---

## 0. 大原則：什麼變、什麼不變

| 不變 | 變 |
|---|---|
| 所有 view（lobby/casino/slot/arena/vsslot…）讀寫 `HL.state` | `HL.state` 的「玩家資料切片」改為登入時從雲端載入、變動時寫回 |
| `HL.fgBoard` / `HL.slotEngine` / Battle 流程 | 開機流程：先驗證 session → 沒登入擋在登入頁 → 登入後才 render App |
| GitHub Pages 靜態部署 | 多一個雲端後端（Supabase），但**不用自架伺服器** |
| zero-build（CDN script） | Supabase JS 用 UMD CDN 版載入，維持 zero-build |

**只持久化「玩家自己的資料切片」**：`balance` / `currency` / `wallet` / `arenaStats(摘要)` + 戰績列(`battle_history`)。
**不持久化**：`arenaRooms`（假房間）、`bigWins`/`feed`/`leaderboard`（假動態）、`demo`、`view` 等。

---

## 1. Supabase 後端設定（Phase 0，無前端碼）

1. 建立 Supabase 專案 → 取得 **Project URL** + **anon public key**（這兩個放前端是安全的，配合 RLS）。**service_role key 絕不放前端。**
2. Auth → 開 Email/Password（試做可關 email 確認）或直接用 **Magic Link / Google OAuth**（免密碼，最省事）。
3. Auth → URL Configuration 把允許的 redirect 加白名單：
   - `https://jack791212.github.io/apex-win-prototype/`（正式）
   - `http://localhost:8777/`（本機測試；**注意 OAuth 不能用 file://，要用 serve.ps1 的 http origin**）
4. SQL（資料表 + RLS + 自動建檔）：

```sql
-- 玩家檔：一個 user 一列（id = auth.users.id）
create table profiles (
  id uuid primary key references auth.users on delete cascade,
  display_name text,
  avatar text default '👑',
  balance numeric not null default 28560,
  currency text not null default 'TWD',
  wallet jsonb not null default '{}',
  arena_stats jsonb not null default
    '{"matches":0,"wins":0,"losses":0,"profit":0,"streak":0,"best":0,"bigWin":0,"hostNet":0}',
  updated_at timestamptz default now()
);
alter table profiles enable row level security;
create policy "own_select" on profiles for select using (auth.uid() = id);
create policy "own_update" on profiles for update using (auth.uid() = id);
create policy "own_insert" on profiles for insert with check (auth.uid() = id);

-- 戰績列：一場一列（取代記憶體 history[]，可無限留存）
create table battle_history (
  id bigint generated always as identity primary key,
  user_id uuid not null references auth.users on delete cascade,
  ts timestamptz default now(),
  vs text, mode text, wager numeric, net numeric, win boolean,
  payload jsonb               -- 完整 rec（seats/totals/rounds）供回放
);
alter table battle_history enable row level security;
create policy "own_h_select" on battle_history for select using (auth.uid() = user_id);
create policy "own_h_insert" on battle_history for insert with check (auth.uid() = user_id);

-- 註冊時自動建 profile
create function public.handle_new_user() returns trigger
  language plpgsql security definer as $$
begin
  insert into public.profiles (id, display_name)
  values (new.id, split_part(new.email,'@',1));
  return new;
end; $$;
create trigger on_auth_user_created
  after insert on auth.users for each row execute procedure public.handle_new_user();
```

> 設計重點：`profiles.arena_stats` 只存**摘要計數**；逐場 `history` 改放 `battle_history` 表（比 JSONB 陣列好查、好擴充排行榜）。

---

## 2. 要新增的檔（資料服務層 = 與 Supabase 的唯一邊界）

新增 5 個檔，全部掛在 `window.HL` 底下，view 只透過它們碰雲端：

| 新檔 | 角色 | 對外 API（範例） |
|---|---|---|
| `src/core/supabase.js` | 初始化 client | `HL.sb = supabase.createClient(URL, ANON_KEY)` |
| `src/core/auth.js` | 驗證封裝 | `HL.auth.signUp/signIn/signInWithOAuth/signOut/init/onChange/user()` |
| `src/core/api.js` | **資料服務層**（唯一讀寫 DB 的地方） | `HL.api.loadProfile() / saveProfile(patch) / loadHistory(n) / recordBattle(rec)` |
| `src/core/persistence.js` | 自動寫回（diff + debounce） | 監聽 `HL.state` 玩家切片變動 → 呼叫 `HL.api.saveProfile` |
| `src/views/auth-view.js` | 登入/註冊整頁畫面 | `HL.views.auth.render()` |

### `api.js`（資料服務層的核心）
```js
HL.api = {
  // 載入玩家檔（沒有就回 default；trigger 已建檔）
  async loadProfile() {
    var u = HL.auth.user(); if (!u) return null;
    var { data } = await HL.sb.from('profiles').select('*').eq('id', u.id).single();
    return data;
  },
  // 寫回玩家切片（persistence.js 會 debounce 呼叫）
  async saveProfile(patch) {
    var u = HL.auth.user(); if (!u) return;
    patch.updated_at = new Date().toISOString();
    await HL.sb.from('profiles').update(patch).eq('id', u.id);
  },
  // 載入最近 N 場戰績（hydrate 進 arenaStats.history）
  async loadHistory(n) {
    var u = HL.auth.user(); if (!u) return [];
    var { data } = await HL.sb.from('battle_history')
      .select('payload').eq('user_id', u.id).order('ts', { ascending:false }).limit(n||30);
    return (data||[]).map(function (r){ return r.payload; });
  },
  // 一場結束插一列（arena.js statRecord 內呼叫）
  async recordBattle(rec) {
    var u = HL.auth.user(); if (!u) return;
    await HL.sb.from('battle_history').insert({
      user_id:u.id, vs:rec.vs, mode:rec.mode, wager:rec.wager,
      net:rec.net, win:rec.win, payload:rec
    });
  }
};
```

### `persistence.js`（零侵入寫回：靠既有 subscribe + diff）
```js
(function(){
  var last = null, t = null;
  function slice(s){ return JSON.stringify({
    b:s.balance, c:s.currency, w:s.wallet,
    a:Object.assign({}, s.arenaStats, { history: undefined }) // 摘要，不含 history
  }); }
  HL.state.subscribe(function(s){
    if (!HL.auth.user()) return;            // 未登入不寫
    var snap = slice(s);
    if (snap === last) return;               // 玩家切片沒變(例如只是房間 tick)→ 跳過
    last = snap;
    clearTimeout(t);
    t = setTimeout(function(){
      var as = Object.assign({}, s.arenaStats); delete as.history;
      HL.api.saveProfile({ balance:s.balance, currency:s.currency, wallet:s.wallet, arena_stats:as });
    }, 800);                                 // debounce，避免連續扣分狂打 API
  });
})();
```
> **關鍵設計**：因為 `HL.state.set` 早就有 `subscribe`，又有「切片 diff」過濾掉每秒的假房間 tick，所以**所有 view 的扣分/加分程式碼一行都不用改**，就會自動寫回雲端。唯一要手動加的是「逐場戰績」這種事件型寫入（見下）。

---

## 3. 要修改的既有檔（很少）

| 檔 | 改什麼 | 幅度 |
|---|---|---|
| `index.html` | 加 Supabase CDN + 4 個 core 檔 + auth-view（**載入順序見下**） | 小 |
| `src/main.js` | `boot()` 改為「先驗證 session → 擋路由 → 登入後 hydrate → renderApp」；`HL.router.go` 加守衛 | 中 |
| `src/views/arena.js` | `statRecord(rec)` 內加一行 `HL.api.recordBattle(rec)`（事件型寫入） | 1 行 |
| `src/layout/app-shell.js` | header 玩家小工具改顯示**真 user**（名稱/頭像）+ 加「登出」 | 小 |
| `src/core/demo-tools.js` | 「重置餘額」對真帳號要嘛同步寫回、要嘛只在 Demo 帳號顯示 | 小 |
| `src/core/app-state.js` | 加 `user / authReady` 欄位；（選配）`applyProfile(p)` 把雲端檔灌進 state | 小 |

### index.html 載入順序
```html
<!-- BaaS SDK（UMD：window.supabase）-->
<script src="https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2"></script>

<script src="./src/core/dom.js"></script>
<script src="./src/data/mock-data.js"></script>
<script src="./src/core/app-state.js"></script>
<!-- 新：資料服務層（在 state 之後、ui/views 之前）-->
<script src="./src/core/supabase.js"></script>
<script src="./src/core/auth.js"></script>
<script src="./src/core/api.js"></script>
<script src="./src/core/persistence.js"></script>
<script src="./src/core/ui.js"></script>
... 既有 layout / views ...
<script src="./src/views/auth-view.js"></script>
<script src="./src/main.js"></script>   <!-- 最後，負責 gate -->
```

---

## 4. 登入流程怎麼「擋路由」（核心）

概念：在 `HL.router` / `boot` 外面包一道 **Auth Gate**。沒 session 的人，永遠只看得到登入頁，連 view 都不 render。

```js
// main.js
function boot() {
  renderSplash();                       // 先放 loading（避免閃一下大廳）
  HL.auth.init(function (session) {     // ① 還原/監聽 session（SDK 自動讀 localStorage）
    if (!session) { renderAuthView(); return; }   // ② 沒登入 → 只 render 登入頁
    hydrateThenRender();                            // ③ 登入 → 載資料 → 進 App
  });
  HL.auth.onChange(function (session) { // ④ 登入/登出即時切換
    session ? hydrateThenRender() : renderAuthView();
  });
}

async function hydrateThenRender() {
  var p = await HL.api.loadProfile();
  var hist = await HL.api.loadHistory(30);
  HL.state.set({
    user: HL.auth.user(),
    balance: p.balance, currency: p.currency, wallet: p.wallet,
    arenaStats: Object.assign({}, p.arena_stats, { history: hist })
  });
  renderApp();                          // 既有流程，畫面不變
  HL.panels.ensureBuilt(); ...
}

// 路由守衛：保險絲，任何 go() 都不能在未登入時進入受保護 view
var _go = HL.router.go;
HL.router.go = function (view, arg) {
  if (!HL.auth.user()) return renderAuthView();
  return _go(view, arg);
};
```

要點：
- **Session 還原**：Supabase SDK 預設把 session 存在 localStorage 並自動續期 → **重整後仍保持登入**，`auth.init` 讀得到。
- **登出**：`HL.auth.signOut()` → `onChange` 收到 null → 自動回登入頁；同時把 `HL.state` 玩家切片清回預設、`persistence` 因 `user()` 為 null 停止寫回。
- **登入頁不掛 App Shell**：整頁 `auth-view`（logo + Email/密碼 或 Google 按鈕 或 Magic Link），登入成功才掛 shell。
- **OAuth 注意**：要用 http origin（GitHub Pages 或 localhost:8777），**file:// 不行**；redirect URL 要在 Supabase 後台白名單。

---

## 5. 分階段落地（每階段可獨立驗收）

- **Phase 0**：Supabase 專案 + 上面 SQL（schema/RLS/trigger）。〔半天〕
- **Phase 1**：`supabase.js`＋`auth.js`＋`auth-view.js`＋`main.js` gate。**能註冊/登入/登出、擋路由**，資料仍記憶體。〔1 天〕
- **Phase 2**：`api.js`＋`persistence.js`＋`hydrateThenRender`。**餘額/幣別/戰績摘要 跨裝置同步**（登入即載入、扣加分自動寫回）。〔1 天〕
- **Phase 3**：`arena.js` 加 `recordBattle`；header 顯示真 user + 登出；demo-tools 收斂。**逐場戰績入庫、回放讀雲端**。〔半天〕
- **Phase 4（之後）**：開獎 RNG/結算搬後端（防作弊）、Realtime、用真資料做排行榜/大獎牆。

> Phase 1–3 完成就是你要的「會員系統 + 真玩家資料試做」，約 **2.5～3 個工作天**。

---

## 6. 一定要記住的雷

1. **虛擬點數，別碰真錢**：碰真錢 = 博弈牌照/KYC/AML/金流/RNG 認證，完全不同專案。試做維持虛擬點數。
2. **前端只放 anon key**：靠 RLS 保護，service_role 永遠在後端/CLI。
3. **只持久化玩家切片**：`arenaRooms` 等假資料別寫進雲端（diff 已過濾，但別手癢加進去）。
4. **RNG 還在前端**：目前 slot/Battle 用 `Math.random()`，玩家改前端可作弊。「結果有意義」的正式版要把開獎搬後端（Phase 4）。
5. **OAuth/redirect 要 http origin**：本機測試請用 `serve.ps1`（localhost:8777），不要 file://。
6. **email 確認**：試做可關，或用 Magic Link/Google 免密碼，UX 最順。

---

## 7. 改動總表（速查）

```
新增：
  src/core/supabase.js     初始化 HL.sb
  src/core/auth.js         HL.auth（驗證封裝）
  src/core/api.js          HL.api（資料服務層；唯一碰 DB 的地方）
  src/core/persistence.js  自動寫回（subscribe + diff + debounce）
  src/views/auth-view.js   HL.views.auth（登入/註冊整頁）

修改：
  index.html               加 CDN + 4 core + auth-view（依順序）
  src/main.js              boot 加 Auth Gate；router.go 守衛；hydrateThenRender
  src/views/arena.js       statRecord 內 +1 行 HL.api.recordBattle(rec)
  src/layout/app-shell.js  header 顯示真 user + 登出
  src/core/demo-tools.js   重置餘額 對真帳號的處理
  src/core/app-state.js    加 user/authReady（選配 applyProfile）

幾乎不動：所有 view 的扣加分邏輯（靠 persistence 自動寫回）
```
