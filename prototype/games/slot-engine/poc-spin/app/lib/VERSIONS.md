# 本地 dist 清單（不引 CDN、無 build 流程）

下載日期：2026-08-03　　用途：Slot Engine 技術 POC（TC-008）

| 檔案 | 套件 | 版本 | 來源 URL |
|---|---|---|---|
| `pixi.min.js` | `pixi.js` | 8.19.0 | https://cdn.jsdelivr.net/npm/pixi.js@8.19.0/dist/pixi.min.js |
| `spine-pixi-v8.min.js` | `@esotericsoftware/spine-pixi-v8` | 4.3.13 | https://cdn.jsdelivr.net/npm/@esotericsoftware/spine-pixi-v8@4.3.13/dist/iife/spine-pixi-v8.min.js |

## 相依與載入順序（重要）

1. `pixi.min.js` 是 **IIFE 建置**，頂層 `var PIXI = (function(d){...})({})` → classic script 載入後自動成為 `window.PIXI`。
   - ⚠️ PixiJS v8 **沒有** `globalThis.PIXI = ...` 這種顯式賦值；靠的是頂層 `var`。因此**必須用 classic `<script>`**，
     不能用 `<script type="module">`（module 作用域的 `var` 不會掛到 window，spine 會找不到 PIXI）。
2. `spine-pixi-v8.min.js` 是 IIFE 建置，暴露 `window.spine`；它內部用 `require("pixi.js")` 取 PixiJS，
   由套件自帶的 shim 轉成 `window.PIXI` —— 所以**必須在 pixi 之後載入**，否則 shim 條件 (`window.PIXI` 存在) 不成立。
3. spine-pixi-v8 4.3.13 的 `peerDependencies` 為 `pixi.js ^8.16.0`，故不可搭配 8.15 或更舊的 v8。

## Spine 骨架資源（`../assets/spine/`）

| 檔案 | 來源 |
|---|---|
| `coin-pro.json` / `coin-pma.atlas` / `coin-pma.png` | https://raw.githubusercontent.com/EsotericSoftware/spine-runtimes/4.3/spine-ts/assets/（`coin` 範例，骨架格式 4.3.75-beta，與 4.3.13 runtime 相容） |

⚠️ **授權注意（範圍外發現，未處理）**：
- Spine Runtimes 採 Spine Runtimes License，**每位使用者需自備 Spine Editor 授權**才可整合進產品。
- `coin-*` 是 Esoteric Software 的官方範例美術，僅供評估／學習；**正式遊戲不可沿用**，須換成自製美術。
- 本 POC 僅為驗證 runtime 整合可行性（TC-008 明列「不包含真實美術資源」）。
