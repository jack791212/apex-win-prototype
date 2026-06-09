/*
 * Apex Win｜驗證封裝（Supabase Auth）
 * 對外只暴露 HL.auth；view/主流程不直接碰 HL.sb.auth。
 * backend() 為 false 時（Demo 模式）所有方法都安全 no-op。
 */
(function (global) {
  "use strict";
  var HL = (global.HL = global.HL || {});
  var _user = null, _changeCbs = [];

  function backend() { return !!HL.sb; }
  function user() { return _user; }

  // 開機還原 session（SDK 會自動讀 localStorage）；cb(session)
  function init(cb) {
    if (!backend()) { cb && cb(null); return; }
    HL.sb.auth.getSession().then(function (res) {
      var session = res && res.data ? res.data.session : null;
      _user = session ? session.user : null;
      // 訂閱登入/登出變化
      HL.sb.auth.onAuthStateChange(function (_evt, s) {
        _user = s ? s.user : null;
        _changeCbs.forEach(function (fn) { try { fn(s); } catch (e) {} });
      });
      cb && cb(session);
    }).catch(function () { cb && cb(null); });
  }
  function onChange(fn) { _changeCbs.push(fn); }

  function signUp(email, pw) { return HL.sb.auth.signUp({ email: email, password: pw }); }
  function signIn(email, pw) { return HL.sb.auth.signInWithPassword({ email: email, password: pw }); }
  function magicLink(email) { return HL.sb.auth.signInWithOtp({ email: email, options: { emailRedirectTo: redirect() } }); }
  function signInOAuth(provider) { return HL.sb.auth.signInWithOAuth({ provider: provider, options: { redirectTo: redirect() } }); }
  function signOut() { return HL.sb.auth.signOut(); }
  function redirect() { return location.origin + location.pathname; }

  // 顯示用：名稱與頭像
  function displayName() {
    if (!_user) return "訪客";
    var m = _user.user_metadata || {};
    return m.display_name || m.name || (_user.email ? _user.email.split("@")[0] : "玩家");
  }
  function avatarChar() { var n = displayName(); return (n[0] || "A").toUpperCase(); }

  HL.auth = {
    backend: backend, user: user, init: init, onChange: onChange,
    signUp: signUp, signIn: signIn, magicLink: magicLink, signInOAuth: signInOAuth, signOut: signOut,
    displayName: displayName, avatarChar: avatarChar
  };
})(window);
