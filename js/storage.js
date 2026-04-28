// localStorage 封裝 + 匯出 / 匯入
window.MT = window.MT || {};

MT.storage = (function() {
  var DAYS_KEY = 'mealTracker_v3_days';
  var SETTINGS_KEY = 'mealTracker_v3_settings';
  var MAX_DAYS = 365;  // v4: 保留 1 年歷史（統計需要）

  function safeParse(raw, fallback) {
    try { return raw ? JSON.parse(raw) : fallback; }
    catch (e) { return fallback; }
  }

  function deepClone(o) { return JSON.parse(JSON.stringify(o)); }

  function loadAllDays() {
    var all = safeParse(localStorage.getItem(DAYS_KEY), {});
    // 相容舊資料：補齊 weight / firstMealTime 欄
    for (var k in all) {
      if (all[k] && typeof all[k] === 'object') {
        if (!('weight' in all[k])) all[k].weight = null;
        if (!('firstMealTime' in all[k])) all[k].firstMealTime = null;
      }
    }
    return all;
  }

  function saveAllDays(all) {
    try {
      var keys = Object.keys(all).sort();
      if (keys.length > MAX_DAYS) {
        keys.slice(0, keys.length - MAX_DAYS).forEach(function(k) { delete all[k]; });
      }
      localStorage.setItem(DAYS_KEY, JSON.stringify(all));
    } catch (e) {
      console.warn('儲存失敗', e);
      MT.app && MT.app.toast && MT.app.toast('⚠️ 儲存失敗：儲存空間已滿');
    }
  }

  function loadDay(dateStr) {
    var all = loadAllDays();
    return all[dateStr] || { dayType: 'train', water: 0, salt: 0, weight: null, checked: {}, firstMealTime: null };
  }

  function saveDay(dateStr, data) {
    var all = loadAllDays();
    all[dateStr] = data;
    saveAllDays(all);
  }

  function mergeSettings(raw) {
    if (!raw) return deepClone(MT.defaults);
    return {
      goals:  Object.assign({}, MT.defaults.goals,  raw.goals  || {}),
      meals:  {
        train:    raw.meals && raw.meals.train    ? raw.meals.train    : deepClone(MT.defaults.meals.train),
        train_pm: raw.meals && raw.meals.train_pm ? raw.meals.train_pm : deepClone(MT.defaults.meals.train_pm),
        rest:     raw.meals && raw.meals.rest     ? raw.meals.rest     : deepClone(MT.defaults.meals.rest)
      },
      macros: {
        train:    Object.assign({}, MT.defaults.macros.train,    (raw.macros && raw.macros.train)    || {}),
        train_pm: Object.assign({}, MT.defaults.macros.train_pm, (raw.macros && raw.macros.train_pm) || {}),
        rest:     Object.assign({}, MT.defaults.macros.rest,     (raw.macros && raw.macros.rest)     || {})
      },
      cardio: Object.assign({}, MT.defaults.cardio, raw.cardio || {}),
      theme: raw.theme || MT.defaults.theme,
      weight: Object.assign({}, MT.defaults.weight, raw.weight || {}),
      weekStart: (typeof raw.weekStart === 'number') ? raw.weekStart : MT.defaults.weekStart,
      weeklyReportLocation: raw.weeklyReportLocation || MT.defaults.weeklyReportLocation,
      thresholds: Object.assign({}, MT.defaults.thresholds, raw.thresholds || {}),
      mealTiming: Object.assign({}, MT.defaults.mealTiming, raw.mealTiming || {})
    };
  }

  function loadSettings() {
    return mergeSettings(safeParse(localStorage.getItem(SETTINGS_KEY), null));
  }

  function saveSettings(settings) {
    try { localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings)); }
    catch (e) { console.warn('設定儲存失敗', e); }
  }

  function resetSettings() { localStorage.removeItem(SETTINGS_KEY); }

  function exportAll() {
    return {
      version: 4,
      exportedAt: new Date().toISOString(),
      days: loadAllDays(),
      settings: safeParse(localStorage.getItem(SETTINGS_KEY), null)
    };
  }

  function importAll(obj) {
    if (!obj || typeof obj !== 'object') throw new Error('格式錯誤');
    if (obj.days && typeof obj.days === 'object') {
      localStorage.setItem(DAYS_KEY, JSON.stringify(obj.days));
    }
    if (obj.settings && typeof obj.settings === 'object') {
      localStorage.setItem(SETTINGS_KEY, JSON.stringify(obj.settings));
    }
  }

  function clearAll() {
    localStorage.removeItem(DAYS_KEY);
    localStorage.removeItem(SETTINGS_KEY);
  }

  return {
    loadAllDays: loadAllDays, saveAllDays: saveAllDays,
    loadDay: loadDay, saveDay: saveDay,
    loadSettings: loadSettings, saveSettings: saveSettings, resetSettings: resetSettings,
    exportAll: exportAll, importAll: importAll, clearAll: clearAll
  };
})();
