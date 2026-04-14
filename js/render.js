// UI 渲染
window.MT = window.MT || {};

MT.render = (function() {

  function escapeHTML(s) {
    return String(s == null ? '' : s)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
  }

  function dateToKey(d) {
    return d.getFullYear() + '-' + String(d.getMonth()+1).padStart(2,'0') + '-' + String(d.getDate()).padStart(2,'0');
  }

  function formatDateLabel(dateStr) {
    var parts = dateStr.split('-');
    var d = new Date(parseInt(parts[0]), parseInt(parts[1])-1, parseInt(parts[2]));
    var w = ['日','一','二','三','四','五','六'];
    return (d.getMonth()+1) + '/' + d.getDate() + '（' + w[d.getDay()] + '）';
  }

  function trackers(state, settings) {
    var g = settings.goals;
    document.getElementById('water-val').textContent = state.water;
    document.getElementById('water-goal').textContent = g.water;
    document.getElementById('water-bar').style.width = Math.min(100, (state.water / g.water) * 100) + '%';
    document.getElementById('salt-val').textContent = state.salt;
    document.getElementById('salt-goal').textContent = g.salt;
    document.getElementById('salt-bar').style.width = Math.min(100, (state.salt / g.salt) * 100) + '%';

    // 動態按鈕
    document.getElementById('water-btns').innerHTML = g.waterIncrements.map(function(v) {
      var label = (v > 0 ? '+' : '') + v;
      return '<button class="tracker-btn" onclick="MT.app.addWater(' + v + ')">' + escapeHTML(label) + '</button>';
    }).join('');
    document.getElementById('salt-btns').innerHTML = g.saltIncrements.map(function(v) {
      var label = (v > 0 ? '+' : '') + v + 'g';
      return '<button class="tracker-btn" onclick="MT.app.addSalt(' + v + ')">' + escapeHTML(label) + '</button>';
    }).join('');
  }

  function meals(state, settings) {
    var container = document.getElementById('meals-container');
    var dayMeals = settings.meals[state.dayType] || [];
    var isRest = state.dayType === 'rest';
    var macro = settings.macros[state.dayType] || { kcal: '' };

    var html = '<div class="section-label">🍽️ '+(isRest?'休息日':'訓練日')+'菜單 ・ ' + escapeHTML(macro.kcal) + ' kcal</div>';

    dayMeals.forEach(function(meal) {
      var ic = state.checked[meal.id] ? 'checked' : '';
      var tc = isRest ? 'rest-tag' : '';
      var nc = isRest ? 'rest-note' : '';
      html += '<div class="meal-card '+ic+'" onclick="MT.app.toggleMeal(\''+escapeHTML(meal.id)+'\')">' +
        '<div class="meal-inner">' +
          '<div class="meal-check"></div>' +
          '<div class="meal-content">' +
            '<div class="meal-name">' + escapeHTML(meal.name) +
              (meal.tag ? ' <span class="meal-tag '+tc+'">訓練相關</span>' : '') +
            '</div>' +
            '<div class="meal-items">'+escapeHTML(meal.items)+'</div>' +
            (meal.note ? '<div class="meal-note '+nc+'">⚠️ '+escapeHTML(meal.note)+'</div>' : '') +
          '</div>' +
        '</div></div>';
    });

    if (state.dayType === 'train' && settings.cardio && settings.cardio.enabled) {
      var cc = state.checked['cardio'] ? 'checked' : '';
      html += '<div class="cardio-card '+cc+'" onclick="MT.app.toggleMeal(\'cardio\')">' +
        '<div class="cardio-icon">🏃</div>' +
        '<div class="cardio-text">'+escapeHTML(settings.cardio.text)+'</div></div>';
    }

    container.innerHTML = html;
  }

  function summary(state, settings) {
    var m = settings.macros[state.dayType] || {};
    document.getElementById('summary-card').innerHTML =
      '<div class="summary-row"><span class="label">熱量</span><span class="value">'+escapeHTML(m.kcal||'-')+' kcal</span></div>' +
      '<div class="summary-divider"></div>' +
      '<div class="summary-row"><span class="label">碳水化合物</span><span class="value">'+escapeHTML(m.carbs||'-')+'</span></div>' +
      '<div class="summary-row"><span class="label">蛋白質</span><span class="value">'+escapeHTML(m.protein||'-')+'</span></div>' +
      '<div class="summary-row"><span class="label">脂肪</span><span class="value">'+escapeHTML(m.fat||'-')+'</span></div>';
  }

  function streak(viewingDate, settings) {
    var history = MT.storage.loadAllDays();
    var today = new Date();
    var container = document.getElementById('streak-days');
    var html = '';
    var weekdays = ['日','一','二','三','四','五','六'];
    var g = settings.goals;

    for (var i = 6; i >= 0; i--) {
      var d = new Date(today);
      d.setDate(d.getDate() - i);
      var key = dateToKey(d);
      var dayLabel = weekdays[d.getDay()];
      var dateNum = d.getDate();
      var isToday = (i === 0);
      var isViewing = (viewingDate === key);

      var dayData = history[key];
      var completed = false;
      if (dayData) {
        var dm = settings.meals[dayData.dayType] || [];
        var total = dm.length + (dayData.dayType === 'train' && settings.cardio && settings.cardio.enabled ? 1 : 0);
        var cnt = 0;
        for (var k in dayData.checked) { if (dayData.checked[k]) cnt++; }
        completed = (total > 0 && cnt >= total && dayData.water >= g.water * 0.7 && dayData.salt >= g.salt * 0.8);
      }

      var classes = 'streak-dot';
      if (completed) classes += ' completed';
      if (isToday && !viewingDate) classes += ' today';
      if (isViewing) classes += ' viewing';

      var icon = completed ? '✅' : (isToday && !viewingDate ? '📍' : (isViewing ? '👁️' : '·'));

      html += '<div class="'+classes+'" onclick="MT.app.viewDate(\''+key+'\')">' +
        '<span class="dot-icon">'+icon+'</span>' +
        '<span>'+dateNum+'</span>' +
        '<span>'+dayLabel+'</span></div>';
    }

    container.innerHTML = html;
  }

  function dayToggle(state) {
    document.querySelectorAll('.day-btn').forEach(function(b) { b.classList.remove('active'); });
    var btn = document.querySelector('[data-day="'+state.dayType+'"]');
    if (btn) btn.classList.add('active');
  }

  return {
    dateToKey: dateToKey,
    formatDateLabel: formatDateLabel,
    escapeHTML: escapeHTML,
    trackers: trackers,
    meals: meals,
    summary: summary,
    streak: streak,
    dayToggle: dayToggle
  };
})();
