/*
 * Apex Win｜直播間（整頁視圖，像 SLOT 一樣切頁，而非彈窗）
 * 主角是「主直播畫面」(assets/streamer/live.png，佔最大)；偶像身份疊在畫面上當看板。
 * 右側為直播聊天；下方為本局資訊 + 跟注(觀看/跟注模式) + 切換子母畫面 + 玩法說明。
 * 「切換子母畫面」= 開啟 HL.streamer 子母畫面(PiP) 並退回原本頁面，邊逛邊看。
 * 進入：HL.views.liveroom.enter(idol, init?)；init 可帶 {side,bet,viewers} 維持連續。
 * 註冊於 window.HL.views.liveroom。
 */
(function (global) {
  "use strict";
  var HL = (global.HL = global.HL || {});
  var el = HL.dom.el;
  var money = HL.dom.money;
  var pick = function (a) { return HL.mock.pick(a); };
  var rint = function (a, b) { return HL.mock.rint(a, b); };
  function kv(k, v, cls) { return el("div", { class: "ax-kv" }, [el("span", { class: "ax-muted", text: k }), el("b", { class: cls || "", text: v })]); }

  var _idol = null, _init = {}, _returnView = "globe";

  // 進入直播間（切頁）。記住來源頁，子母畫面/返回時可回到原處。
  function enter(idol, init) {
    _idol = idol || HL.mock.idols[0];
    _init = init || {};
    var v = HL.state.get().view;
    _returnView = (v && v !== "liveroom") ? v : "globe";
    HL.router.go("liveroom");
  }

  function roomRulesModal() {
    HL.ui.modal("直播房玩法", [
      el("ul", { class: "ax-rules" }, [
        el("li", { text: "可純觀看，不一定要下注。" }),
        el("li", { text: "想參與時切換為跟注模式。" }),
        el("li", { text: "跟注需再次確認後才加入本局。" }),
        el("li", { text: "結果與獎勵皆為 Demo 假資料。" })
      ]),
      el("span", { class: "ax-demo-tag", text: "虛擬主持 · Demo 演繹 · 非真人" })
    ]);
  }

  function render() {
    var idol = _idol || HL.mock.idols[0];
    var init = _init || {};
    var mode = "watch", stake = init.bet || 50;
    var pickSide = init.side || (idol.game === "對押挑戰" ? "A" : "莊");
    var left = rint(15, 30);
    var cdEl = el("b", { text: String(left) });
    var totalEl = el("b", { text: money(rint(50, 400) * 1000) });
    var viewersEl = el("b", { text: init.viewers || rint(1000, 9000).toLocaleString() });

    // ---- 直播聊天 ----
    var chatBox = el("div", { class: "ax-room__chat" });
    function addChat(m) {
      chatBox.appendChild(el("div", { class: "ax-cmsg ax-feed-item" }, [
        el("span", { class: "ax-cmsg__av", text: (m.name || "?").charAt(0) }),
        el("div", {}, [el("div", { class: "ax-cmsg__name", text: m.name }), el("div", { class: "ax-cmsg__text", text: m.text })])
      ]));
      while (chatBox.children.length > 40) chatBox.removeChild(chatBox.firstChild);
      chatBox.scrollTop = chatBox.scrollHeight;
    }
    for (var i = 0; i < 6; i++) addChat({ name: pick(HL.mock.fakeNames) + rint(10, 99), text: pick(["跟一注", "主持穩", "上車", "這局看好", "GoGo"]) });

    // ---- 跟注控制 ----
    var modeBtn = el("button", { class: "ax-btn-ghost", text: "目前：觀看模式（點此切換跟注）" });
    var stakeWrap = el("div", { class: "ax-stakes", style: "display:none" });
    [10, 50, 100, 500].forEach(function (v) {
      stakeWrap.appendChild(el("button", { class: "ax-stake" + (v === stake ? " is-picked" : ""), text: String(v), onClick: function () { stake = v; Array.prototype.forEach.call(stakeWrap.children, function (c) { c.classList.remove("is-picked"); }); this.classList.add("is-picked"); } }));
    });
    var followBtn = el("button", { class: "ax-btn-primary", text: "確認跟注", style: "display:none" });
    modeBtn.addEventListener("click", function () {
      mode = mode === "watch" ? "follow" : "watch";
      modeBtn.textContent = mode === "watch" ? "目前：觀看模式（點此切換跟注）" : "目前：跟注模式（點此切回觀看）";
      stakeWrap.style.display = mode === "follow" ? "flex" : "none";
      followBtn.style.display = mode === "follow" ? "block" : "none";
    });
    followBtn.addEventListener("click", function () {
      HL.ui.modal("確認跟注", [
        el("div", { class: "ax-panel" }, [kv("直播主本局選擇", pickSide), kv("跟注金額", money(stake)), kv("風險提示", "可能全部輸掉", "ax-red")]),
        el("button", { class: "ax-btn-primary", text: "確認加入本局", onClick: function () { var ms = document.querySelectorAll(".ax-modal-mask"); if (ms.length) ms[ms.length - 1].remove(); HL.ui.toast("已跟注 " + money(stake) + "（Demo）", "ok"); addChat({ name: "你", text: "跟注 " + money(stake) }); } }),
        el("span", { class: "ax-demo-tag", text: "Demo · 不扣真錢" })
      ]);
    });

    // 切換子母畫面：開 PiP，退回原本頁面 → 邊逛邊看
    var pipBtn = el("button", { class: "ax-btn-ghost ax-room__pip", text: "📺 切換子母畫面", title: "縮成子母畫面，邊看主播邊逛其他頁、跟注", onClick: function () {
      HL.streamer.open({ idol: idol, side: pickSide, bet: stake, viewers: viewersEl.textContent });
      HL.router.go(_returnView || "globe");
    } });

    var input = el("input", { type: "text", placeholder: "說點什麼…（Demo）" });
    input.addEventListener("keydown", function (e) { if (e.key === "Enter" && input.value.trim()) { addChat({ name: "你", text: input.value.trim() }); input.value = ""; } });

    // ---- 主直播畫面（主角）+ 偶像看板疊層 ----
    var camImg = el("img", { class: "ax-liveroom__cam-img", src: "./assets/streamer/live.png", alt: "主播畫面" });
    camImg.addEventListener("error", function () { if (this.parentNode) this.parentNode.removeChild(this); });
    var cam = el("div", { class: "ax-liveroom__cam" }, [
      el("div", { class: "ax-liveroom__ph", style: "background:linear-gradient(160deg," + idol.c1 + "," + idol.c2 + ")" }, [
        el("div", { class: "ax-liveroom__ph-emoji", text: idol.emoji }),
        el("div", { class: "ax-streamer__ph-live", text: "🔴 LIVE" }),
        el("small", { text: "主播畫面預留位（放假圖：assets/streamer/live.png）" })
      ]),
      camImg,
      el("div", { class: "ax-liveroom__bar" }, [
        el("span", { class: "ax-streamer__live", text: "● LIVE" }),
        el("b", { class: "ax-liveroom__nm", text: idol.name }),
        el("span", { class: "ax-liveroom__style", text: idol.style }),
        el("span", { class: "ax-liveroom__bargame", text: "正在玩：" + idol.game })
      ])
    ]);

    // ---- 本局演繹（用 HL.ticker）。換頁 enterView 會 clearAll；但 HL.app.refresh 重繪不經 clearAll，
    //      故 callback 在自身 cdEl 脫離 DOM 時自我移除，避免重複 render 堆疊殘留 ticker ----
    var tickFn = HL.ticker.add(function () {
      if (!cdEl.isConnected) { HL.ticker.remove(tickFn); return; }
      left--;
      if (left <= 0) {
        var winner = pick(HL.mock.fakeNames) + rint(10, 99);
        addChat({ name: "系統", text: "本局結果：" + pickSide + " 勝　恭喜 " + winner + " 獲得大獎！" });
        HL.ui.toast(winner + " 跟注獲得大獎（Demo）", "ok");
        left = rint(15, 30); totalEl.textContent = money(rint(50, 400) * 1000);
      }
      cdEl.textContent = String(left);
      if (Math.random() < 0.5) addChat({ name: pick(HL.mock.fakeNames) + rint(10, 99), text: pick(["跟一注", "主持神準", "上車 🚀", "穩", "再來"]) });
    });

    return el("div", { class: "ax-liveroom ax-fade-in" }, [
      el("div", { class: "ax-liveroom__top" }, [
        el("button", { class: "ax-link ax-liveroom__back", text: "‹ 返回", onClick: function () { HL.router.go(_returnView || "globe"); } }),
        el("div", { class: "ax-liveroom__title", text: "📡 " + idol.name + " 直播間" }),
        el("span", { class: "ax-demo-tag", text: "虛擬主持 · 非真人直播" })
      ]),
      el("div", { class: "ax-liveroom__stats" }, [
        el("span", {}, ["👁 在線 ", viewersEl]),
        el("span", {}, ["💰 本局總跟注 ", totalEl]),
        el("span", {}, ["⏱ 本局倒數 ", cdEl, " 秒"]),
        el("span", { class: "ax-gold" }, ["🏆 本局大獎"])
      ]),
      el("div", { class: "ax-liveroom__grid" }, [
        el("div", { class: "ax-liveroom__main" }, [
          cam,
          el("div", { class: "ax-liveroom__panel" }, [
            el("div", { class: "ax-room__gtitle", text: "本局遊戲：" + idol.game }),
            el("div", { class: "ax-muted", text: "直播主本局選擇：" + pickSide }),
            el("div", { class: "ax-liveroom__actions" }, [pipBtn, modeBtn, stakeWrap, followBtn]),
            el("a", { class: "ax-link", text: "玩法說明 ›", onClick: roomRulesModal })
          ])
        ]),
        el("div", { class: "ax-liveroom__side" }, [
          el("div", { class: "ax-liveroom__sidehd", text: "聊天室" }),
          chatBox,
          el("div", { class: "ax-chat__input" }, [input, el("button", { class: "ax-chat__send", text: "➤", onClick: function () { if (input.value.trim()) { addChat({ name: "你", text: input.value.trim() }); input.value = ""; } } })])
        ])
      ])
    ]);
  }

  HL.views = HL.views || {};
  HL.views.liveroom = { render: render, enter: enter };
})(window);
