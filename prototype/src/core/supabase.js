/*
 * Apex Win｜Supabase client 初始化
 * 有填 creds 且 SDK 載入成功 → HL.sb = client；否則 HL.sb = null（Demo 模式）。
 * 註冊於 window.HL.sb。
 */
(function (global) {
  "use strict";
  var HL = (global.HL = global.HL || {});
  HL.sb = null;
  try {
    if (HL.config && HL.config.enabled() && global.supabase && global.supabase.createClient) {
      HL.sb = global.supabase.createClient(HL.config.SUPABASE_URL, HL.config.SUPABASE_ANON_KEY, {
        auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true }
      });
      if (global.console) console.log("[Apex Win] Supabase 已連線 · 真會員模式");
    } else if (global.console) {
      console.log("[Apex Win] 未設定 Supabase creds · 維持 Demo 訪客模式");
    }
  } catch (e) {
    HL.sb = null;
    if (global.console) console.warn("[Apex Win] Supabase 初始化失敗，退回 Demo 模式：", e);
  }
})(window);
