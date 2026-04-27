// 主控制器
window.MT = window.MT || {};

MT.app = (function() {
  var settings;
  var state;
  var viewingDate = null;
  var editingWeight = false;
  var editingAnchor = false;
  var cameFromStats = false;

  function today() { return MT.render.dateToKey(new Date()); }
  function isViewingHistory() { return viewingDate !== null; }

  function init() {
    settings = MT.storage.loadSettings();
    applyTheme(settings.theme);
    listenSystemTheme();

    var saved = MT.storage.loadDay(today());
    state = {
      dayType: saved.dayType || 'train',
      water: saved.water || 0,
      salt: saved.salt || 0,
      weight: (saved.weight == null ? null : saved.weight),
      checked: saved.checked || {},
      firstMealTime: saved.firstMealTime || null
    };
    document.getElementById('date-label').textContent = MT.render.formatDateLabel(today());
    refreshUI();
    registerServiceWorker();
  }

  function reloadSettings() {
    settings = MT.storage.loadSettings();
    applyTheme(settings.theme);
    refreshUI();
  }

  function refreshUI() {
    MT.render.dayToggle(state);
    MT.render.trackers(state, settings);
    MT.render.weight(state, settings, editingWeight);
    MT.render.meals(state, settings, editingAnchor);
    MT.render.summary(state, settings);
    MT.render.streak(viewingDate, settings);
    renderWeeklyReport();
  }

  function renderWeeklyReport() {
    var loc = settings.weeklyReportLocation || 'both';
    if (loc === 'main' || loc === 'both') {
      MT.render.weeklyReport(settings, 'weekly-report-main', true);
    } else {
      document.getElementById('weekly-report-main').innerHTML = '';
    }
  }

  function saveCurrentDay() {
    if (isViewingHistory()) return;
    MT.storage.saveDay(today(), {
      dayType: state.dayType,
      water: state.water,
      salt: state.salt,
      weight: state.weight,
      checked: state.checked,
      firstMealTime: state.firstMealTime
    });
  }

  function switchDay(day) {
    if (isViewingHistory()) return;
    state.dayType = day;
    MT.render.dayToggle(state);
    MT.render.meals(state, settings);
    MT.render.summary(state, settings);
    MT.render.streak(viewingDate, settings);
    renderWeeklyReport();
    saveCurrentDay();
    haptic();
  }

  function toggleMeal(id) {
    if (isViewingHistory()) return;
    var willCheck = !state.checked[id];
    state.checked[id] = willCheck;

    // 若是第一餐：勾選 → 寫入錨點 + 自動進入編輯模式（讓使用者改成實際進食時間）
    //              取消勾 → 清除錨點
    var dayMeals = settings.meals[state.dayType] || [];
    if (dayMeals[0] && dayMeals[0].id === id && (settings.mealTiming || {}).enabled !== false) {
      if (willCheck) {
        if (!state.firstMealTime) state.firstMealTime = MT.timing.nowHHMM();
        editingAnchor = true;
      } else {
        state.firstMealTime = null;
        editingAnchor = false;
      }
    }

    MT.render.meals(state, settings, editingAnchor);
    MT.render.streak(viewingDate, settings);
    renderWeeklyReport();
    saveCurrentDay();
    haptic();
  }

  // ==== 錨點時間編輯 ====
  function editAnchor() {
    if (isViewingHistory()) return;
    editingAnchor = true;
    MT.render.meals(state, settings, true);
  }

  function saveAnchor() {
    var el = document.getElementById('anchor-input');
    if (!el) return;
    var v = el.value;
    if (!/^\d{2}:\d{2}$/.test(v)) { toast('⚠️ 時間格式錯誤'); return; }
    state.firstMealTime = v;
    editingAnchor = false;
    saveCurrentDay();
    MT.render.meals(state, settings, false);
    MT.render.streak(viewingDate, settings);
    renderWeeklyReport();
    haptic();
    toast('✅ 第一餐 ' + v);
  }

  function cancelAnchor() {
    editingAnchor = false;
    // 若是「剛勾第一餐就取消編輯」這種情況，保留勾選與當下時間（已存入）
    // 若是「未勾但設定時間後取消」→ 清掉時間（沒確認過）
    var dayMeals = settings.meals[state.dayType] || [];
    if (dayMeals[0] && !state.checked[dayMeals[0].id]) {
      state.firstMealTime = null;
      saveCurrentDay();
    }
    MT.render.meals(state, settings, false);
  }

  function addWater(amount) {
    if (isViewingHistory()) return;
    state.water = Math.max(0, Math.min(20000, state.water + amount));
    MT.render.trackers(state, settings);
    MT.render.streak(viewingDate, settings);
    renderWeeklyReport();
    saveCurrentDay();
    haptic();
  }

  function addSalt(amount) {
    if (isViewingHistory()) return;
    state.salt = Math.max(0, Math.min(50, state.salt + amount));
    MT.render.trackers(state, settings);
    MT.render.streak(viewingDate, settings);
    renderWeeklyReport();
    saveCurrentDay();
    haptic();
  }

  // ==== 體重 ====
  function editWeight() {
    if (isViewingHistory()) return;
    editingWeight = true;
    MT.render.weight(state, settings, true);
  }

  function cancelWeight() {
    editingWeight = false;
    MT.render.weight(state, settings, false);
  }

  function saveWeight() {
    var el = document.getElementById('weight-input');
    if (!el) return;
    var raw = el.value.trim();
    if (raw === '') {
      state.weight = null;
    } else {
      var n = parseFloat(raw);
      if (isNaN(n) || n < 30 || n > 500) {
        toast('⚠️ 體重需在 30–500');
        return;
      }
      state.weight = n;
    }
    editingWeight = false;
    saveCurrentDay();
    MT.render.weight(state, settings, false);
    MT.render.streak(viewingDate, settings);
    renderWeeklyReport();
    haptic();
    toast(state.weight != null ? '✅ 已記錄體重' : '已清除體重');
  }

  function resetToday() {
    if (isViewingHistory()) return;
    if (!confirm('確定要重置今天的紀錄嗎？(體重不會被清除)')) return;
    state.water = 0;
    state.salt = 0;
    state.checked = {};
    state.firstMealTime = null;
    editingAnchor = false;
    // 體重保留
    refreshUI();
    saveCurrentDay();
  }

  function viewDateFromStats(dateStr) {
    cameFromStats = true;
    viewDate(dateStr);
  }

  function backToStats() {
    MT.statsui.open();
  }

  function viewDate(dateStr) {
    if (dateStr === today()) { backToToday(); return; }
    viewingDate = dateStr;
    editingWeight = false;
    editingAnchor = false;
    var data = MT.storage.loadDay(dateStr);
    state.dayType = data.dayType;
    state.water = data.water;
    state.salt = data.salt;
    state.weight = (data.weight == null ? null : data.weight);
    state.checked = data.checked;
    state.firstMealTime = data.firstMealTime || null;

    document.getElementById('history-banner').style.display = 'flex';
    document.getElementById('history-label').textContent = '📋 查看：' + MT.render.formatDateLabel(dateStr);
    document.getElementById('date-label').textContent = MT.render.formatDateLabel(dateStr);
    document.getElementById('back-to-stats-btn').style.display = cameFromStats ? '' : 'none';

    document.getElementById('trackers-section').classList.add('readonly-overlay');
    document.getElementById('weight-section').classList.add('readonly-overlay');
    document.getElementById('meals-container').classList.add('readonly-overlay');
    document.querySelector('.day-toggle').classList.add('readonly-overlay');
    document.querySelector('.reset-btn').style.display = 'none';

    refreshUI();
  }

  function backToToday() {
    viewingDate = null;
    editingWeight = false;
    editingAnchor = false;
    cameFromStats = false;
    document.getElementById('back-to-stats-btn').style.display = 'none';
    var data = MT.storage.loadDay(today());
    state.dayType = data.dayType || 'train';
    state.water = data.water || 0;
    state.salt = data.salt || 0;
    state.weight = (data.weight == null ? null : data.weight);
    state.checked = data.checked || {};
    state.firstMealTime = data.firstMealTime || null;

    document.getElementById('history-banner').style.display = 'none';
    document.getElementById('date-label').textContent = MT.render.formatDateLabel(today());

    document.getElementById('trackers-section').classList.remove('readonly-overlay');
    document.getElementById('weight-section').classList.remove('readonly-overlay');
    document.getElementById('meals-container').classList.remove('readonly-overlay');
    document.querySelector('.day-toggle').classList.remove('readonly-overlay');
    document.querySelector('.reset-btn').style.display = '';

    refreshUI();
  }

  function openSettings() { MT.settings.open(); }

  // ==== Theme ====
  function applyTheme(theme) {
    document.documentElement.setAttribute('data-theme', theme || 'auto');
    // 同步 meta theme-color（iOS 狀態列顏色）
    var meta = document.getElementById('theme-color-meta');
    if (meta) {
      var isLight = (theme === 'light') ||
        (theme === 'auto' && window.matchMedia && window.matchMedia('(prefers-color-scheme: light)').matches);
      meta.setAttribute('content', isLight ? '#f5f5f7' : '#0a0a0a');
    }
  }

  function listenSystemTheme() {
    if (!window.matchMedia) return;
    var mq = window.matchMedia('(prefers-color-scheme: light)');
    var handler = function() { if (settings.theme === 'auto') applyTheme('auto'); };
    if (mq.addEventListener) mq.addEventListener('change', handler);
    else if (mq.addListener) mq.addListener(handler);
  }

  // ==== toast ====
  var toastTimer;
  function toast(msg) {
    var el = document.createElement('div');
    el.className = 'toast';
    el.textContent = msg;
    document.body.appendChild(el);
    clearTimeout(toastTimer);
    toastTimer = setTimeout(function() {
      if (el.parentNode) el.parentNode.removeChild(el);
    }, 1800);
  }

  function haptic() {
    if (navigator.vibrate) { try { navigator.vibrate(5); } catch (e) {} }
  }

  function registerServiceWorker() {
    if (!('serviceWorker' in navigator)) return;
    if (location.protocol === 'file:') return;
    navigator.serviceWorker.register('sw.js').catch(function(e) {
      console.warn('SW 註冊失敗', e);
    });
  }

  document.addEventListener('visibilitychange', function() {
    if (document.visibilityState === 'visible' && !isViewingHistory()) {
      var saved = MT.storage.loadDay(today());
      state.dayType = saved.dayType || state.dayType || 'train';
      state.water = saved.water || 0;
      state.salt = saved.salt || 0;
      state.weight = (saved.weight == null ? null : saved.weight);
      state.checked = saved.checked || {};
      state.firstMealTime = saved.firstMealTime || null;
      document.getElementById('date-label').textContent = MT.render.formatDateLabel(today());
      refreshUI();
    }
  });

  document.addEventListener('DOMContentLoaded', init);

  return {
    init: init,
    reloadSettings: reloadSettings,
    switchDay: switchDay,
    toggleMeal: toggleMeal,
    addWater: addWater, addSalt: addSalt,
    editWeight: editWeight, saveWeight: saveWeight, cancelWeight: cancelWeight,
    editAnchor: editAnchor, saveAnchor: saveAnchor, cancelAnchor: cancelAnchor,
    resetToday: resetToday,
    viewDate: viewDate, viewDateFromStats: viewDateFromStats,
    backToToday: backToToday, backToStats: backToStats,
    openSettings: openSettings,
    applyTheme: applyTheme,
    toast: toast
  };
})();
