// 排餐時間建議 — 純函式
// 依 5 原則：間隔 3-4h、練前餐前 30-60 min、練後 +45 min、米/肉分開、12-14h 內完成
window.MT = window.MT || {};

MT.timing = (function() {

  function pad2(n) { return String(n).padStart(2, '0'); }

  // 'HH:MM' → minutes since midnight
  function parseTime(hhmm) {
    if (!hhmm || typeof hhmm !== 'string') return null;
    var p = hhmm.split(':');
    if (p.length !== 2) return null;
    var h = parseInt(p[0], 10), m = parseInt(p[1], 10);
    if (isNaN(h) || isNaN(m)) return null;
    return h * 60 + m;
  }

  function formatTime(mins) {
    if (mins == null || isNaN(mins)) return '—';
    // 跨日處理
    var m = ((mins % 1440) + 1440) % 1440;
    return pad2(Math.floor(m / 60)) + ':' + pad2(m % 60);
  }

  function nowHHMM() {
    var d = new Date();
    return pad2(d.getHours()) + ':' + pad2(d.getMinutes());
  }

  // 找出 meals 陣列中各餐角色：'pre' / 'post' / 'regular'
  function detectRoles(mealList) {
    var roles = [];
    var preIdx = -1, postIdx = -1;
    for (var i = 0; i < mealList.length; i++) {
      if (mealList[i].tag) {
        if (preIdx < 0) preIdx = i;
        else if (postIdx < 0) postIdx = i;
      }
    }
    for (var j = 0; j < mealList.length; j++) {
      if (j === preIdx) roles.push('pre');
      else if (j === postIdx) roles.push('post');
      else roles.push('regular');
    }
    return { roles: roles, preIdx: preIdx, postIdx: postIdx };
  }

  // 主要計算：給定錨點時間 + 設定 + 餐單，回傳每餐的建議時間（分鐘）
  // 也回傳訓練開始 / 結束時間
  function compute(anchorHHMM, mealList, mt) {
    var anchor = parseTime(anchorHHMM);
    if (anchor == null) return null;

    var roles = detectRoles(mealList).roles;
    var times = new Array(mealList.length);
    var trainingStart = null, trainingEnd = null;

    var intervalMin = mt.intervalHours * 60;
    var post3IntervalMin = mt.postMeal3IntervalHours * 60;

    times[0] = anchor;
    var lastWasPost = false;

    for (var i = 1; i < mealList.length; i++) {
      var role = roles[i];
      var prevRole = roles[i-1];

      if (role === 'post') {
        // 練後餐 = 練前餐 + 練前到訓練 + 訓練時長
        // 找前面 'pre' 的 index
        var preIdx = -1;
        for (var k = i - 1; k >= 0; k--) { if (roles[k] === 'pre') { preIdx = k; break; } }
        if (preIdx >= 0 && times[preIdx] != null) {
          trainingStart = times[preIdx] + mt.preWorkoutToTraining;
          trainingEnd = trainingStart + mt.trainingDuration;
          times[i] = trainingEnd;
        } else {
          times[i] = times[i-1] + intervalMin;
        }
      } else if (prevRole === 'post') {
        // 練後餐之後的第一餐：+ 45 min
        times[i] = times[i-1] + mt.postWorkoutToNext;
      } else if (prevRole === 'regular' && roles.indexOf('post') >= 0 && i > roles.indexOf('post') + 1) {
        // 第三餐之後的餐：用 postMeal3IntervalHours
        times[i] = times[i-1] + post3IntervalMin;
      } else {
        // 一般餐間隔
        times[i] = times[i-1] + intervalMin;
      }

      lastWasPost = (role === 'post');
    }

    return {
      anchor: anchor,
      times: times,
      roles: roles,
      trainingStart: trainingStart,
      trainingEnd: trainingEnd
    };
  }

  // 用最後一餐 - 第一餐 算總窗口（小時）
  function totalWindow(result) {
    if (!result || result.times.length < 2) return 0;
    var last = result.times[result.times.length - 1];
    return (last - result.anchor) / 60;
  }

  return {
    parseTime: parseTime,
    formatTime: formatTime,
    nowHHMM: nowHHMM,
    detectRoles: detectRoles,
    compute: compute,
    totalWindow: totalWindow
  };
})();
