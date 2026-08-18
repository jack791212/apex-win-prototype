/*
 * Apex Win｜大廳分群軸登記表 HL.gameAxes  #94
 * ---------------------------------------------------------------------------
 * 大廳原有的分群**全部是目錄型 metadata**（filter: all/hot/new/fav/community/author:/cat、
 * sortBy: default/popular/new/az）——回答的是「這款遊戲被歸在哪一櫃」。
 * 玩家真正會問的另一種問題是「我現在想玩**玩起來像這樣**的」，那是遊戲的**體感特徵**，
 * 跟它被放在哪一櫃無關。這個檔就是承載那種軸的容器。
 *
 * 【容器先於內容】本檔**一條軸的內容都沒有**，只提供註冊/求值/渲染資料。
 *   軸的 config 與逐款特徵值都在 `data/game-traits.js`（新增一軸＝在那裡加一筆，不必改本檔、也不必改 casino.js）。
 *
 * 【缺值即不進軸】某款遊戲沒有該欄位的值 ⇒ 它**不出現在該軸的任何一個桶**（而不是被歸進「其他」或顯示 0）。
 *   理由：這條軸的價值全在「說得準」。把不知道的東西塞進某個桶，一次就會讓玩家不再相信整條軸。
 *
 * 【空的不渲染】`active()`／`tabs()` 只回**真的有遊戲落進去**的軸與桶：
 *   - 一個桶沒有任何遊戲 → 該桶不出現（點進去空白牆＝死巷）
 *   - 一條軸剩不到 2 個非空桶 → 整條軸不出現（只剩一個桶＝那不是分群，是「全部」的同義詞）
 *   這同時是 `apexwin-ui-quality` 反例「底部列 17 項擠壓」的預防：入口只在有內容時才長出來。
 *
 * filter key 格式：`axis:<軸key>:<桶key>`（casino.js 只認得這個前綴，不認得任何一條軸的名字）。
 */
(function (global) {
  "use strict";
  var HL = (global.HL = global.HL || {});

  var PREFIX = "axis:";
  var _axes = [];

  function byOrder(a, b) { return (a.order - b.order) || (a.key < b.key ? -1 : 1); }

  // register({ key, label, field, buckets:[{key,label,is?,order?}], order?, enabled?, source? })
  //   field ＝ 要從遊戲特徵取哪個欄位；bucket.is(v) ＝ 該值是否屬於此桶（預設 v === bucket.key）
  //   source ＝（選用·#106）「這個欄位的值打哪來」的一句人話，給說明中心印。
  //     ⚠️ **刻意收在軸的定義裡而不是容器裡**：首版把「rtp 的值向單一真相求得／pace 依互動結構判定」
  //     寫成容器內的 field→說明對照表，當場被常駐鎖 `platform/game-axes-no-second-rtp`（「容器層不得
  //     認識 rtp 這個欄位」）擋下——而那條鎖是對的：容器一旦認得某條軸的名字，就不再是容器了。
  //     ⇒ 新增一軸＝連它的出處一起加一行，本檔永遠不必知道有哪些軸。
  function register(a) {
    if (!a || !a.key || !a.field || !a.buckets || !a.buckets.length) return false;
    for (var i = 0; i < _axes.length; i++) if (_axes[i].key === a.key) return false; // 同 key 只收第一次
    _axes.push({
      key: a.key,
      label: a.label || a.key,
      field: a.field,
      order: a.order == null ? 100 : a.order,
      enabled: a.enabled !== false,
      source: a.source || "",
      buckets: a.buckets.map(function (b, i) {
        var own = b.key;
        return {
          key: own,
          label: b.label || own,
          order: b.order == null ? i : b.order,
          is: typeof b.is === "function" ? b.is : function (v) { return v === own; }
        };
      }).sort(byOrder)
    });
    return true;
  }

  function all() { return _axes.slice().sort(byOrder); }
  function enabled() { return all().filter(function (a) { return a.enabled; }); }

  // 取某款遊戲在某欄位的值：遊戲自己的 meta 優先（供遊戲軌日後把值搬回各自 view 檔而不必動大廳），
  // 其次才查 HL.gameTraits 側表。取不到一律 null＝缺值。
  function valueOf(g, field) {
    if (!g || !field) return null;
    if (g[field] !== undefined && g[field] !== null && g[field] !== "") return g[field];
    if (HL.gameTraits) {
      var v = HL.gameTraits.value(g, field);
      if (v !== undefined && v !== null && v !== "") return v;
    }
    return null;
  }

  function inBucket(g, axis, bucket) {
    var v = valueOf(g, axis.field);
    if (v === null) return false;          // 缺值 ⇒ 不進任何桶（本檔的核心不變量）
    return !!bucket.is(v);
  }

  // 只回真的有內容的軸/桶（見檔頭「空的不渲染」）
  function active(games) {
    games = games || [];
    var out = [];
    enabled().forEach(function (a) {
      var buckets = a.buckets.map(function (b) {
        var n = 0;
        for (var i = 0; i < games.length; i++) if (inBucket(games[i], a, b)) n++;
        return { key: b.key, label: b.label, order: b.order, count: n };
      }).filter(function (b) { return b.count > 0; });
      if (buckets.length >= 2) out.push({ key: a.key, label: a.label, order: a.order, buckets: buckets });
    });
    return out;
  }

  function keyOf(axisKey, bucketKey) { return PREFIX + axisKey + ":" + bucketKey; }

  // 給大廳頁籤用的扁平描述子（{k,n} ＝ HL.ui.tabs 的格式）
  function tabs(games) {
    var out = [];
    active(games).forEach(function (a) {
      a.buckets.forEach(function (b) { out.push({ k: keyOf(a.key, b.key), n: b.label, axis: a.key, bucket: b.key }); });
    });
    return out;
  }

  function parse(k) {
    if (typeof k !== "string" || k.indexOf(PREFIX) !== 0) return null;
    var rest = k.slice(PREFIX.length), i = rest.indexOf(":");
    if (i <= 0) return null;
    return { axis: rest.slice(0, i), bucket: rest.slice(i + 1) };
  }
  function isAxisKey(k) { return !!parse(k); }

  function find(p) {
    if (!p) return null;
    for (var i = 0; i < _axes.length; i++) {
      if (_axes[i].key !== p.axis) continue;
      var a = _axes[i];
      for (var j = 0; j < a.buckets.length; j++) if (a.buckets[j].key === p.bucket) return { axis: a, bucket: a.buckets[j] };
      return null;
    }
    return null;
  }

  // 給 casino.js 的 matchFilter 用：不是軸 key 就回 null（讓既有分支照原樣處理）
  function match(g, k) {
    var hit = find(parse(k));
    if (!hit || !hit.axis.enabled) return null;
    return inBucket(g, hit.axis, hit.bucket);
  }

  // 結果牆標題：「節奏 · ⚡ 一鍵見分」
  function labelOf(k) {
    var hit = find(parse(k));
    return hit ? (hit.axis.label + " · " + hit.bucket.label) : null;
  }

  HL.gameAxes = {
    register: register, all: all, enabled: enabled, active: active,
    tabs: tabs, parse: parse, isAxisKey: isAxisKey, match: match,
    labelOf: labelOf, valueOf: valueOf, keyOf: keyOf, PREFIX: PREFIX
  };

  /* #106 說明中心（#72 容器）：分群軸是**唯一一條「別家是行銷話術、本站是實測數據」的軸**，
   * 而那件事玩家看不出來——頁籤上只寫「⚡ 一鍵見分」，沒有任何地方說明它憑什麼這樣分、
   * 以及**為什麼有些遊戲不在任何一個桶裡**（缺值即不進軸＝本檔核心不變量，但對玩家像是漏了遊戲）。
   *
   * ⚠️ **標題與內文都刻意不列舉軸名**：#94 定案 pace 屬平台軌、volatility／rtp 屬遊戲軌權威，
   *   截至 2026-08-18 實際上線的只有「節奏」與「回報率」兩軸（波動軸跨軌、尚無逐款判定）。
   *   把軸名寫進標題＝**第二份真相**，遊戲軌哪天補上波動軸、或某軸因覆蓋率不足而整條收起，
   *   這句話就開始說謊。⇒ 一律由 active() 當場列舉，說明自動跟著容器長。 */
  if (HL.support && HL.support.register) {
    // active() 只回 key/label/buckets ⇒ 出處由登記表反查（不在這裡複製一份軸定義）
    function sourceOf(k) { var v = ""; all().forEach(function (x) { if (x.key === k) v = x.source || ""; }); return v; }
    HL.support.register({
      id: "rules/game-axes", cat: "rules", order: 30,
      title: "大廳那些「玩起來像什麼」的頁籤是怎麼分的？",
      // ⚠️ 搜尋關鍵詞**同樣不得列舉軸名**（同一條鎖）——不必列也搜得到：search() 比對的是
      //   title + **當場求值的 body** + keys，而 body 本來就會印出當下每條軸與桶的名字。
      keys: ["分群", "篩選", "頁籤", "分類", "體感", "lobby", "filter"],
      body: function () {
        var games = (HL.games && HL.games.all) ? HL.games.all() : [];
        var act = active(games);
        if (!act.length) {
          return "體感分群頁籤目前一條都沒有出現——因為沒有足夠的遊戲帶著經證實的特徵值。"
               + "本站的原則是：不知道就不分。寧可少一條軸，也不把沒量過的遊戲塞進某個桶。";
        }
        var rows = act.map(function (a) {
          var n = 0;
          a.buckets.forEach(function (b) { n += b.count; });
          return a.label + "（" + a.buckets.map(function (b) { return b.label + " " + b.count + " 款"; }).join("、")
               + "）——" + (sourceOf(a.key) || "依該遊戲已登記的特徵值判定")
               + "；全站 " + games.length + " 款中有 " + (games.length - n) + " 款未登記此值。";
        });
        return "大廳除了目錄型分類（熱門／新品／收藏／作者），另有依**玩起來的體感**分的頁籤，目前有 "
             + act.length + " 條：" + rows.join(" ")
             + " **沒有該欄位實證值的遊戲不會出現在該軸的任何一個桶**，這是刻意的——"
             + "把不知道的東西塞進某個桶，一次就會讓整條軸不可信。"
             + "同理，沒有遊戲的桶不會長出空頁籤，非空桶不足兩個的軸整條不顯示（只剩一個桶那不是分群，是「全部」的同義詞）。";
      }
    });
  }
})(window);
