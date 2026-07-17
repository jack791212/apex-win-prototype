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

  HL.dom = { el: el, clear: clear, money: money, pressable: pressable };
})(window);
