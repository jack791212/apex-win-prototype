/*
 * Apex Win｜你的專屬夥伴（AI Luna）內容
 * 提供浮動視窗用的內容：scroll 區（hero + 快速鈕 + 對話）與 footer（輸入）。
 * 罐頭問答，不串接真 AI。註冊於 window.HL.partner。
 */
(function (global) {
  "use strict";
  var HL = (global.HL = global.HL || {});
  var el = HL.dom.el;

  var KB = [
    { k: ["对押", "對押", "怎么玩", "怎麼玩", "玩法", "duel", "競技"], a: "競技場對押池玩法：選擇你支持的一方（如 A 或 B），倒數結束開獎，輸方池扣除平台抽水 2% 後，由勝方依投注比例分配。" },
    { k: ["抽水", "手续费", "手續費", "rake", "费用", "費用"], a: "大部分對押池的平台抽水為 2%，少數特殊活動不同，以各局詳情為準。" },
    { k: ["存款", "充值", "儲值", "deposit", "儲"], a: "本平台為 Demo 展示版，不提供真實儲值；假儲值功能之後會做。" },
    { k: ["提款", "提现", "提現", "withdraw"], a: "Demo 版不提供真實提款。所有金額僅供體驗。" },
    { k: ["活动", "活動", "event", "dragon", "全球", "世界"], a: "目前主推世界活動「DRAGON SIEGE」：全服共同累積獎池，達標解鎖大獎。" },
    { k: ["奖励", "獎勵", "reward", "vip", "俱樂部"], a: "可在「獎勵中心」與「VIP 俱樂部」查看每日任務與等級獎勵（Demo）。" },
    { k: ["风险", "風險", "安全", "限制"], a: "請理性娛樂。可在底部「損失限制」查看今日剩餘額度。" }
  ];
  function answer(q) {
    var low = (q || "").toLowerCase();
    for (var i = 0; i < KB.length; i++)
      for (var j = 0; j < KB[i].k.length; j++)
        if (low.indexOf(KB[i].k[j].toLowerCase()) >= 0) return KB[i].a;
    return "我是 AI Luna（Demo）。你可以問我：競技場怎麼玩、平台抽水多少、今天有哪些活動、如何理性遊戲。";
  }

  var msgsEl;
  function pushMsg(text, who) {
    if (!msgsEl) return;
    msgsEl.appendChild(el("div", { class: "ax-msg " + (who || "bot"), text: text }));
    msgsEl.scrollTop = msgsEl.scrollHeight;
  }
  function ask(q) {
    pushMsg(q, "me");
    setTimeout(function () { pushMsg(answer(q), "bot"); }, 350);
  }
  function quickBtn(ic, label, q) {
    return el("button", { class: "ax-ai__qbtn", onClick: function () { ask(q); } }, [
      el("span", { class: "ic", text: ic }), el("span", { text: label })
    ]);
  }

  // 填入 scroll 區（hero + 快速鈕 + 對話）
  function fillScroll(s) {
    s.appendChild(el("div", { class: "ax-ai__hero" }, [
      el("h4", { text: "我是 AI Luna" }),
      el("p", { text: "一起征服 Dragon，贏取全服大獎！" }),
      el("span", { class: "ax-ai__avatar", text: "🧝‍♀️" })
    ]));
    s.appendChild(el("div", { class: "ax-ai__quick" }, [
      quickBtn("🧭", "活動導航", "今天有哪些活動？"),
      quickBtn("📖", "玩法說明", "競技場怎麼玩？"),
      quickBtn("🎁", "獎勵規則", "獎勵怎麼領？"),
      quickBtn("🛡️", "風險提醒", "如何理性遊戲？")
    ]));
    msgsEl = el("div", { class: "ax-chat" }, [
      el("div", { class: "ax-msg bot", text: "你好！我是 AI Luna ✨ 我可以幫你了解活動、玩法、獎勵規則，也會提醒你理性遊戲哦！" })
    ]);
    s.appendChild(msgsEl);
  }

  function footer() {
    var input = el("input", { type: "text", placeholder: "有問題？問我吧…" });
    function submit() { var v = input.value.trim(); if (!v) return; ask(v); input.value = ""; }
    input.addEventListener("keydown", function (e) { if (e.key === "Enter") submit(); });
    return el("div", { class: "ax-chat__input" }, [
      input, el("button", { class: "ax-chat__send", text: "➤", title: "送出", onClick: submit })
    ]);
  }

  HL.partner = { fillScroll: fillScroll, footer: footer, ask: ask, answer: answer };
})(window);
