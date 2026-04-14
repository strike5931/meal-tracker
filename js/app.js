// 主控制器
window.MT = window.MT || {};

MT.app = (function() {
  var settings;          // 使用者設定（menu/goals/macros/cardio）
  var state;             // { dayType, water, salt, checked }
  var viewingDate = null;

  function today() { return MT.render.dateToKey(new Date()); }
  function isViewingHistory() { return viewingDate !== null; }

  function init() {
    settings = MT.storage.loadSettings();
    var saved = MT.storage.loadDay(today());
    state = {
      dayType: saved.dayType || 'train',
      water: saved.water || 0,
      salt: saved.salt || 0,
      checked: saved.checked || {}
    };
    document.getElementById('date-label').textContent = MT.render.formatDateLabel(today());
    refreshUI();
    registerServiceWorker();
  }

  function reloadSettings() {
    settings = MT.storage.loadSettings();
    refreshUI();
  }

  function refreshUI() {
    MT.render.dayToggle(state);
    MT.render.trackers(state, settings);
    MT.render.meals(state, settings);
    MT.render.summary(state, settings);
    MT.render.streak(viewingDate, settings);
  }

  function saveCurrentDay() {
    if (isViewingHistory()) return;
    MT.storage.saveDay(today(), {
      dayType: state.dayType,
      water: state.water,
      salt: state.salt,
      checked: state.checked
    });
  }

  function switchDay(day) {
    if (isViewingHistory()) return;
    state.dayType = day;
    MT.render.dayToggle(state);
    MT.render.meals(state, settings);
    MT.render.summary(state, settings);
    saveCurrentDay();
    haptic();
  }

  function toggleMeal(id) {
    if (isViewingHistory()) return;
    state.checked[id] = !state.checked[id];
    MT.render.meals(state, settings);
    MT.render.streak(viewingDate, settings);
    saveCurrentDay();
    haptic();
  }

  function addWater(amount) {
    if (isViewingHistory()) return;
    state.water = Math.max(0, Math.min(20000, state.water + amount));
    MT.render.trackers(state, settings);
    MT.render.streak(viewingDate, settings);
    saveCurrentDay();
    haptic();
  }

  function addSalt(amount) {
    if (isViewingHistory()) return;
    state.salt = Math.max(0, Math.min(50, state.salt + amount));
    MT.render.trackers(state, settings);
    MT.render.streak(viewingDate, settings);
    saveCurrentDay();
    haptic();
  }

  function resetToday() {
    if (isViewingHistory()) return;
    if (!confirm('確定要重置今天的紀錄嗎？')) return;
    state.water = 0;
    state.salt = 0;
    state.checked = {};
    refreshUI();
    saveCurrentDay();
  }

  function viewDate(dateStr) {
    if (dateStr === today()) { backToToday(); return; }
    viewingDate = dateStr;
    var data = MT.storage.loadDay(dateStr);
    state.dayType = data.dayType;
    state.water = data.water;
    state.salt = data.salt;
    state.checked = data.checked;

    document.getElementById('history-banner').style.display = 'flex';
    document.getElementById('history-label').textContent = '📋 查看：' + MT.render.formatDateLabel(dateStr);
    document.getElementById('date-label').textContent = MT.render.formatDateLabel(dateStr);

    document.getElementById('trackers-section').classList.add('readonly-overlay');
    document.getElementById('meals-container').classList.add('readonly-overlay');
    document.querySelector('.day-toggle').classList.add('readonly-overlay');
    document.querySelector('.reset-btn').style.display = 'none';

    refreshUI();
  }

  function backToToday() {
    viewingDate = null;
    var data = MT.storage.loadDay(today());
    state.dayType = data.dayType || 'train';
    state.water = data.water || 0;
    state.salt = data.salt || 0;
    state.checked = data.checked || {};

    document.getElementById('history-banner').style.display = 'none';
    document.getElementById('date-label').textContent = MT.render.formatDateLabel(today());

    document.getElementById('trackers-section').classList.remove('readonly-overlay');
    document.getElementById('meals-container').classList.remove('readonly-overlay');
    document.querySelector('.day-toggle').classList.remove('readonly-overlay');
    document.querySelector('.reset-btn').style.display = '';

    refreshUI();
  }

  function openSettings() { MT.settings.open(); }

  // ---- 小工具 ----
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
    // iOS Safari 目前不支援 vibrate，但 PWA 環境 + Capacitor 可用
    if (navigator.vibrate) { try { navigator.vibrate(5); } catch (e) {} }
  }

  function registerServiceWorker() {
    if (!('serviceWorker' in navigator)) return;
    // file:// 下註冊會失敗，直接跳過
    if (location.protocol === 'file:') return;
    navigator.serviceWorker.register('sw.js').catch(function(e) {
      console.warn('SW 註冊失敗', e);
    });
  }

  // 自動檢測跨日：若應用在前台且日期變了，重新載入今天的 state
  document.addEventListener('visibilitychange', function() {
    if (document.visibilityState === 'visible' && !isViewingHistory()) {
      var saved = MT.storage.loadDay(today());
      if (saved.dayType !== state.dayType || saved.water !== state.water || saved.salt !== state.salt) {
        state.dayType = saved.dayType || 'train';
        state.water = saved.water || 0;
        state.salt = saved.salt || 0;
        state.checked = saved.checked || {};
      }
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
    resetToday: resetToday,
    viewDate: viewDate, backToToday: backToToday,
    openSettings: openSettings,
    toast: toast
  };
})();
