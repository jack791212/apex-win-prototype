/*
 * Apex Win｜後端設定（Supabase）
 * ▼▼▼ 你只要填這兩個字串（Supabase → Project Settings → API）▼▼▼
 *   SUPABASE_URL      例：https://abcdefgh.supabase.co
 *   SUPABASE_ANON_KEY 例：eyJhbGciOiJIUzI1NiIsInR5cCI6...（anon public 金鑰，可公開、靠 RLS 保護）
 * 兩個都留空 → 自動維持現有「Demo 訪客模式」（不登入、資料在記憶體）。
 * ⚠️ 絕對不要把 service_role key 貼在這裡（這是公開前端）。
 */
(function (global) {
  "use strict";
  var HL = (global.HL = global.HL || {});
  HL.config = {
    SUPABASE_URL: "",
    SUPABASE_ANON_KEY: "",
    INITIAL_BALANCE: 28560 // 新會員初始 Demo 點數（與 app-state 一致）
  };
  // creds 看起來有效才啟用「真會員後端」，否則退回 Demo 模式
  HL.config.enabled = function () {
    return /^https:\/\/.+\.supabase\.co\/?$/.test(HL.config.SUPABASE_URL) && (HL.config.SUPABASE_ANON_KEY || "").length > 20;
  };
})(window);
