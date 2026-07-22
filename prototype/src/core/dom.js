/*
 * Apex Win｜DOM 小工具
 * 極簡輔助，避免散落 document.createElement / addEventListener。
 * classic script（相容 file:// 直接開啟），註冊於 window.HL.dom。
 */
(function (global) {
  "use strict";
  var HL = (global.HL = global.HL || {});

  /**
   * 建立元素
   * @param {string} tag
   * @param {object} [props] class/text/html/onClick/其他 attribute
   * @param {Array} [children]
   */
  function el(tag, props, children) {
    var node = document.createElement(tag);
    props = props || {};
    Object.keys(props).forEach(function (key) {
      var v = props[key];
      if (v == null) return;
      if (key === "class") node.className = v;
      else if (key === "text") node.textContent = v;
      else if (key === "html") node.innerHTML = v;
      else if (key === "onClick") node.addEventListener("click", v);
      else if (key === "onInput") node.addEventListener("input", v);
      else if (key === "style") node.setAttribute("style", v);
      else node.setAttribute(key, v);
    });
    (children || []).forEach(function (c) {
      if (c == null || c === false) return;
      node.appendChild(typeof c === "string" ? document.createTextNode(c) : c);
    });
    return node;
  }

  function clear(node) {
    while (node && node.firstChild) node.removeChild(node.firstChild);
    return node;
  }

  // a11y（U8）：讓「整卡可點」的非 button 元素鍵盤可及——補 role="button" + tabindex="0"，
  // Enter/Space 觸發 click。只在焦點落在本體時作用（內部 button 的鍵盤操作冒泡不誤觸整卡）。
  // 用於內含其他互動元素或複雜排版、不適合直接換 <button> 的容器。
  function pressable(node) {
    if (!node.hasAttribute("role")) node.setAttribute("role", "button");
    if (!node.hasAttribute("tabindex")) node.setAttribute("tabindex", "0");
    node.addEventListener("keydown", function (e) {
      if (e.target !== node) return;
      if (e.key === "Enter" || e.key === " ") { e.preventDefault(); node.click(); }
    });
    return node;
  }

  // a11y（U8-tail）：讓「假連結」<a>（無 href、onClick 導覽）鍵盤可及——補 role="link" +
  // tabindex="0"，Enter 觸發 click。連結語意不含 Space（Space 保留原生捲動），與 pressable 區分。
  function linkable(node) {
    if (!node.hasAttribute("role")) node.setAttribute("role", "link");
    if (!node.hasAttribute("tabindex")) node.setAttribute("tabindex", "0");
    node.addEventListener("keydown", function (e) {
      if (e.target !== node) return;
      if (e.key === "Enter") { e.preventDefault(); node.click(); }
    });
    return node;
  }

  // 拖曳（T10）：live-stats 浮窗與 GameFrame PiP 原各有一份近逐字相同的指標拖曳 helper——唯一差
  // ＝live-stats 額外鎖寬（避免手機版 left+right 佈局一拖就縮）；收斂為單一出口，鎖寬改由 opts.lockWidth
  // 開關。host＝被移動的定位元素、handle＝拖曳把手；點按鈕不拖曳，pointermove 夾在視口內（左緣 0、頂緣 8）。
  function makeDraggable(host, handle, opts) {
    var dragging = false, sx = 0, sy = 0, ox = 0, oy = 0;
    handle.addEventListener("pointerdown", function (e) {
      if (e.target.closest("button")) return;       // 點按鈕不拖曳
      dragging = true; try { handle.setPointerCapture(e.pointerId); } catch (er) {}
      var r = host.getBoundingClientRect();
      host.style.left = r.left + "px"; host.style.top = r.top + "px";
      if (opts && opts.lockWidth) host.style.width = r.width + "px"; // 鎖寬：避免手機版 left+right 佈局一拖就縮
      host.style.right = "auto"; host.style.bottom = "auto";
      sx = e.clientX; sy = e.clientY; ox = r.left; oy = r.top;
    });
    handle.addEventListener("pointermove", function (e) {
      if (!dragging) return;
      var nx = ox + (e.clientX - sx), ny = oy + (e.clientY - sy);
      var maxX = global.innerWidth - host.offsetWidth, maxY = global.innerHeight - host.offsetHeight;
      host.style.left = Math.max(0, Math.min(maxX, nx)) + "px";
      host.style.top = Math.max(8, Math.min(maxY, ny)) + "px";
    });
    function end() { dragging = false; }
    handle.addEventListener("pointerup", end);
    handle.addEventListener("pointercancel", end);
  }

  // 倒數/計時格式化（T9）：pad 原本逐字複製於 6 檔（arena/lobby/global-prize/tournament/
  // instant-duel/raffle），mm:ss 與「d天 hh:mm:ss」兩式亦各有多處逐字重複——收斂為單一出口。
  // 輸出與原各處手刻逐字相同；非此二式的變體（時分、d h、ms 入參）屬各檔語意，保留原地。
  function pad(n) { return (n < 10 ? "0" : "") + n; }
  function mmss(sec) { return pad(Math.floor(sec / 60)) + ":" + pad(sec % 60); }
  function dhms(sec) {
    var d = Math.floor(sec / 86400), r = sec % 86400;
    return pad(d) + "天 " + pad(Math.floor(r / 3600)) + ":" + pad(Math.floor((r % 3600) / 60)) + ":" + pad(r % 60);
  }

  // 倒數「剩餘時間」粗格式（本輪淺審計 · T9 同族收尾）：兩個「取粗略兩單位＋字母後綴」的倒數格式化——
  // hms（h/m/s 級聯：≥1h 顯「Nh Nm」否則「Nm Ns」）原逐字複製於 faucet/onboarding，happyhour 僅多一組
  // 冗餘括號 `(m)`＝輸出相同；dhm（d/h/m 級聯：≥1d「Nd Nh」、≥1h「Nh Nm」、否則「Nm」）原逐字複製於
  // reload/shop（僅 var 宣告換行差）——收斂為單一出口，5 檔各改薄別名（var fmtLeft = HL.dom.hms|dhm）＝呼叫端零改動。
  // 與 mmss/dhms（冒號時鐘式）不同：此二式為字母後綴、粗略兩單位。輸出與各處手刻逐字相同。
  // 其餘 fmtLeft 變體語意各異、保留原地：cashback「Nd Nh」（無級聯）、rain「Nm Ns」（m/s）、arena「N時MM分」（sec 入參、中文）。
  function hms(ms) {
    ms = Math.max(0, ms); var s = Math.floor(ms / 1000), h = Math.floor(s / 3600), m = Math.floor((s % 3600) / 60);
    if (h > 0) return h + "h " + m + "m";
    return m + "m " + (s % 60) + "s";
  }
  function dhm(ms) {
    ms = Math.max(0, ms); var s = Math.floor(ms / 1000), d = Math.floor(s / 86400), h = Math.floor((s % 86400) / 3600), m = Math.floor((s % 3600) / 60);
    if (d > 0) return d + "d " + h + "h";
    if (h > 0) return h + "h " + m + "m";
    return m + "m";
  }

  // 日/週序 epoch-bucket（T12）：`Math.floor(Date.now()/86400000)`（本地日序）與 `/604800000`（週序）
  // 原逐字複製於 9 檔 core 模組（daily：challenges/tasks(progress)/luckyspin/rewards/reload/shop；
  // weekly：cashback/reload/shop）——收斂為單一出口。各檔 msToReset 的乘回式（(dayNum()+1)*DAY-…）
  // 留原地讀此共用 index；reload.js monthNum（/30 天）語意獨立、不收。輸出與原各處逐字相同。
  function dayNum() { return Math.floor(Date.now() / 86400000); }
  function weekNum() { return Math.floor(Date.now() / 604800000); }

  // 隨機整數 [a, b]（含兩端）（T21）：`a + Math.floor(Math.random() * (b - a + 1))` 原逐字複製於 3 個
  // core 模組（jackpot/raffle/tournament），mock-data 另有等價變體 `Math.floor(a + …)`（整數 a 下逐位元相等）
  // ——收斂為單一出口，4 檔改薄別名（var rint = HL.dom.rint）＝呼叫端零改動。皆為 Demo 裝飾性亂數
  // （非 HL.fair 可驗證公平結算），故沿用 Math.random；所有呼叫點 a 皆整數＝輸出與各處手刻逐字相同。
  function rint(a, b) { return a + Math.floor(Math.random() * (b - a + 1)); }

  // localStorage JSON 持久化（T20）：`ls(k,d)`（讀＋JSON.parse＋fallback）與 `save(k,v)`（JSON.stringify 寫）
  // 原各有一份逐字相同的副本散在 6 個 core 模組（fair/jackpot/notify/progress/raffle/tournament）——
  // 收斂為單一出口，各檔改薄別名（var ls = HL.dom.lsGet, save = HL.dom.lsSet）＝呼叫端零改動。
  // 輸出與原各處手刻逐字相同；dom.js 的 global 即 window（同各消費檔的 IIFE global），語意不變。
  // 站別命名空間（HL.site.ns）：真站('r:')資料與假站('')完全隔離＝平行宇宙。經此出口的
  //   經濟/留存/JP/notify/fair/ledger 全自動分身；HL.site 尚未載入時退化為無前綴（安全）。
  //   UI 偏好（語言/側欄/收藏/最近遊玩/game-settings）不走此出口，維持兩站共用。
  function nsKey(k) { return (HL.site && HL.site.ns ? HL.site.ns() : "") + k; }
  function lsGet(k, d) { try { return JSON.parse(global.localStorage.getItem(nsKey(k))) || d; } catch (e) { return d; } }
  function lsSet(k, v) { try { global.localStorage.setItem(nsKey(k), JSON.stringify(v)); } catch (e) {} }

  // 將數字格式化為 NT$ 顯示（Demo 幣值）。
  // S10 display-in-fiat：⚙ 遊戲設定選了顯示幣別（HL.gset.fiatView）時，以 mock 示意匯率
  // 換算「顯示」——僅顯示層，所有結算/儲存仍以遊戲幣（TWD 計價）為準。未設定時輸出不變。
  function money(n) {
    var code = (HL.gset && HL.gset.get) ? HL.gset.get("fiatView") : "";
    if (code && code !== "TWD" && HL.mock && HL.mock.currencies) {
      var m = null, list = HL.mock.currencies;
      for (var i = 0; i < list.length; i++) if (list[i].code === code) { m = list[i]; break; }
      if (m && m.rate) {
        var v = n / m.rate, s;
        if (v >= 100) s = Math.round(v).toLocaleString("en-US");
        else if (v >= 1) s = (Math.round(v * 100) / 100).toFixed(2);
        else s = v.toFixed(6).replace(/0+$/, "").replace(/\.$/, "");
        return m.ic + " " + s;
      }
    }
    return "NT$ " + Math.round(n).toLocaleString("en-US");
  }

  HL.dom = { el: el, clear: clear, money: money, pressable: pressable, linkable: linkable, makeDraggable: makeDraggable, pad: pad, mmss: mmss, dhms: dhms, hms: hms, dhm: dhm, dayNum: dayNum, weekNum: weekNum, rint: rint, lsGet: lsGet, lsSet: lsSet };
})(window);
