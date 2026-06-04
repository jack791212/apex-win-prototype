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

  // 將數字格式化為 NT$ 顯示（Demo 幣值）
  function money(n) {
    return "NT$ " + Math.round(n).toLocaleString("en-US");
  }

  HL.dom = { el: el, clear: clear, money: money };
})(window);
