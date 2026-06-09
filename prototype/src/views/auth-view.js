/*
 * Apex Win｜登入 / 註冊整頁（真會員模式才會出現）
 * 不掛 App Shell；登入成功由 auth.onChange → main hydrate 後進入 App。
 * 註冊於 window.HL.views.auth。
 */
(function (global) {
  "use strict";
  var HL = (global.HL = global.HL || {});
  var el = HL.dom.el;

  function render() {
    var mode = "login"; // login | signup
    var email = el("input", { class: "ax-auth__in", type: "email", placeholder: "Email", autocomplete: "email" });
    var pw = el("input", { class: "ax-auth__in", type: "password", placeholder: "密碼（至少 6 碼）", autocomplete: "current-password" });
    var msg = el("div", { class: "ax-auth__msg" });
    var primaryBtn = el("button", { class: "ax-btn-primary ax-auth__go", text: "登入", onClick: submit });
    var tabLogin = el("button", { class: "ax-auth__tab is-on", text: "登入", onClick: function () { setMode("login"); } });
    var tabSignup = el("button", { class: "ax-auth__tab", text: "註冊", onClick: function () { setMode("signup"); } });

    function setMode(m) {
      mode = m;
      tabLogin.classList.toggle("is-on", m === "login");
      tabSignup.classList.toggle("is-on", m === "signup");
      primaryBtn.textContent = m === "login" ? "登入" : "建立帳號";
      msg.textContent = ""; msg.className = "ax-auth__msg";
    }
    function setMsg(t, kind) { msg.textContent = t; msg.className = "ax-auth__msg" + (kind ? " is-" + kind : ""); }
    function busy(on) { primaryBtn.disabled = on ? "" : null; primaryBtn.textContent = on ? "處理中…" : (mode === "login" ? "登入" : "建立帳號"); }

    function submit() {
      var e = email.value.trim(), p = pw.value;
      if (!e || !p) { setMsg("請輸入 Email 與密碼", "warn"); return; }
      if (p.length < 6) { setMsg("密碼至少 6 碼", "warn"); return; }
      busy(true);
      var fn = mode === "login" ? HL.auth.signIn(e, p) : HL.auth.signUp(e, p);
      fn.then(function (res) {
        if (res.error) { setMsg(res.error.message, "err"); busy(false); return; }
        if (mode === "signup" && res.data && !res.data.session) {
          setMsg("註冊成功！若有開 Email 確認請收信驗證，再回來登入。", "ok"); busy(false); setMode("login"); return;
        }
        // 有 session → onAuthStateChange 會把我們帶進 App
      }).catch(function (err) { setMsg(String(err && err.message || err), "err"); busy(false); });
    }
    function magic() {
      var e = email.value.trim();
      if (!e) { setMsg("請先輸入 Email", "warn"); return; }
      HL.auth.magicLink(e).then(function (res) {
        setMsg(res.error ? res.error.message : "登入連結已寄出，請收信點擊。", res.error ? "err" : "ok");
      });
    }
    function google() {
      HL.auth.signInOAuth("google").then(function (res) {
        if (res.error) setMsg("Google 登入未啟用或失敗：" + res.error.message, "err");
      });
    }

    pw.addEventListener("keydown", function (ev) { if (ev.key === "Enter") submit(); });

    return el("div", { class: "ax-auth" }, [
      el("div", { class: "ax-auth__card ax-fade-in" }, [
        el("div", { class: "ax-auth__brand" }, [
          el("span", { class: "ax-brand__mark", text: "A" }),
          el("span", { class: "ax-brand__name", html: "Apex <b>Win</b>" })
        ]),
        el("p", { class: "ax-auth__lead", text: "登入以保存你的點數與戰績（跨裝置同步）" }),
        el("div", { class: "ax-auth__tabs" }, [tabLogin, tabSignup]),
        email, pw, msg, primaryBtn,
        el("div", { class: "ax-auth__or", text: "或" }),
        el("div", { class: "ax-auth__alt" }, [
          el("button", { class: "ax-btn-ghost", text: "✉ 寄登入連結（免密碼）", onClick: magic }),
          el("button", { class: "ax-btn-ghost", text: "用 Google 登入", onClick: google })
        ]),
        el("p", { class: "ax-auth__note", text: "Demo 試做 · 帳號內為虛擬點數，不涉及真實金流。" })
      ])
    ]);
  }

  HL.views = HL.views || {};
  HL.views.auth = { render: render };
})(window);
