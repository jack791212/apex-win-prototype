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

  // 倒數/計時格式化（T9）：pad 原本逐字複製於 6 檔（arena/lobby/global-prize/tournament/
  // instant-duel/raffle），mm:ss 與「d天 hh:mm:ss」兩式亦各有多處逐字重複——收斂為單一出口。
  // 輸出與原各處手刻逐字相同；非此二式的變體（時分、d h、ms 入參）屬各檔語意，保留原地。
  function pad(n) { return (n < 10 ? "0" : "") + n; }
  function mmss(sec) { return pad(Math.floor(sec / 60)) + ":" + pad(sec % 60); }
  function dhms(sec) {
    var d = Math.floor(sec / 86400), r = sec % 86400;
    return pad(d) + "天 " + pad(Math.floor(r / 3600)) + ":" + pad(Math.floor((r % 3600) / 60)) + ":" + pad(r % 60);
  }

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

  HL.dom = { el: el, clear: clear, money: money, pressable: pressable, linkable: linkable, pad: pad, mmss: mmss, dhms: dhms };
})(window);
