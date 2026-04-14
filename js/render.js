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

  function formatNum(n, precision) {
    if (n == null) return '—';
    var p = precision || 0.1;
    var decimals = p >= 1 ? 0 : p >= 0.5 ? 1 : 1;
    return Number(n).toFixed(decimals);
  }

  // ==== Trackers ====
  function trackers(state, settings) {
    var g = settings.goals;
    document.getElementById('water-val').textContent = state.water;
    document.getElementById('water-goal').textContent = g.water;
    document.getElementById('water-bar').style.width = Math.min(100, (state.water / g.water) * 100) + '%';
    document.getElementById('salt-val').textContent = state.salt;
    document.getElementById('salt-goal').textContent = g.salt;
    document.getElementById('salt-bar').style.width = Math.min(100, (state.salt / g.salt) * 100) + '%';

    document.getElementById('water-btns').innerHTML = g.waterIncrements.map(function(v) {
      var label = (v > 0 ? '+' : '') + v;
      return '<button class="tracker-btn" onclick="MT.app.addWater(' + v + ')">' + escapeHTML(label) + '</button>';
    }).join('');
    document.getElementById('salt-btns').innerHTML = g.saltIncrements.map(function(v) {
      var label = (v > 0 ? '+' : '') + v + 'g';
      return '<button class="tracker-btn" onclick="MT.app.addSalt(' + v + ')">' + escapeHTML(label) + '</button>';
    }).join('');
  }

  // ==== Weight card ====
  function weight(state, settings, isEditing) {
    var c = document.getElementById('weight-section');
    var w = settings.weight || {};
    var unit = w.unit || 'kg';
    var prec = w.precision || 0.1;

    if (isEditing) {
      var val = state.weight != null ? state.weight : '';
      c.innerHTML = '<div class="weight-card">' +
        '<div class="weight-header">' +
          '<div class="weight-label">⚖️ 體重 ('+escapeHTML(unit)+')</div>' +
        '</div>' +
        '<div class="weight-inline-editor">' +
          '<input id="weight-input" type="number" inputmode="decimal" step="'+prec+'" min="30" max="500" placeholder="'+escapeHTML(unit)+'" value="'+val+'">' +
          '<button class="ok" onclick="MT.app.saveWeight()">✓</button>' +
          '<button onclick="MT.app.cancelWeight()">✕</button>' +
        '</div>' +
      '</div>';
      setTimeout(function() {
        var el = document.getElementById('weight-input');
        if (el) { el.focus(); el.select && el.select(); }
      }, 50);
      return;
    }

    // 讀顯示模式
    var all = MT.storage.loadAllDays();
    var avg7 = MT.stats.weightAvg(all, 7);
    var avg30 = MT.stats.weightAvg(all, 30);
    var wk = MT.stats.weeklyWeightSeries(all, settings.weekStart, 2);
    var deltaHTML = '';
    if (wk.length >= 2 && wk[0].avg != null && wk[1].avg != null) {
      var d = wk[1].avg - wk[0].avg;
      var cls = d > 0.05 ? 'up' : (d < -0.05 ? 'down' : '');
      var arrow = d > 0.05 ? '↑' : (d < -0.05 ? '↓' : '→');
      deltaHTML = '<span class="weight-delta '+cls+'">'+arrow+' '+formatNum(Math.abs(d), prec)+' vs 上週</span>';
    } else {
      deltaHTML = '<span class="weight-delta">紀錄更多以比較</span>';
    }

    var val = state.weight != null
      ? '<span class="weight-value">'+formatNum(state.weight, prec)+' <span class="unit">'+escapeHTML(unit)+'</span></span>'
      : '<span class="weight-value empty">— '+escapeHTML(unit)+'</span>';

    var avgsHTML = '';
    if (w.showAverages) {
      avgsHTML = '<div class="weight-averages">' +
        '<span>📈 7天均 <b>'+(avg7!=null?formatNum(avg7,prec):'—')+'</b></span>' +
        '<span>📉 30天均 <b>'+(avg30!=null?formatNum(avg30,prec):'—')+'</b></span>' +
      '</div>';
    }

    var targetHTML = '';
    if (w.target != null && state.weight != null) {
      var diff = state.weight - w.target;
      var dir = diff > 0 ? '↓' : (diff < 0 ? '↑' : '🎯');
      targetHTML = '<div class="weight-target">🎯 目標 '+formatNum(w.target, prec)+' '+escapeHTML(unit)+'，差 '+formatNum(Math.abs(diff), prec)+' '+dir+'</div>';
    } else if (w.target != null) {
      targetHTML = '<div class="weight-target">🎯 目標 '+formatNum(w.target, prec)+' '+escapeHTML(unit)+'</div>';
    }

    c.innerHTML = '<div class="weight-card">' +
      '<div class="weight-header">' +
        '<div class="weight-label">⚖️ 體重</div>' +
        '<button class="weight-edit-btn" onclick="MT.app.editWeight()">📝 編輯</button>' +
      '</div>' +
      '<div class="weight-body">' + val + deltaHTML + '</div>' +
      avgsHTML + targetHTML +
    '</div>';
  }

  // ==== Meals ====
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

    for (var i = 6; i >= 0; i--) {
      var d = new Date(today);
      d.setDate(d.getDate() - i);
      var key = dateToKey(d);
      var dayLabel = weekdays[d.getDay()];
      var dateNum = d.getDate();
      var isToday = (i === 0);
      var isViewing = (viewingDate === key);

      var c = MT.stats.computeDay(history[key], settings);

      var classes = 'streak-dot';
      if (c.isGoalHit) classes += ' completed';
      if (isToday && !viewingDate) classes += ' today';
      if (isViewing) classes += ' viewing';

      var icon = c.isPerfect ? '🏆' : (c.isGoalHit ? '✅' : (isToday && !viewingDate ? '📍' : (isViewing ? '👁️' : '·')));

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

  // ==== 週報卡片（可放主頁或統計頁） ====
  function weeklyReport(settings, containerId, showLink) {
    var container = typeof containerId === 'string' ? document.getElementById(containerId) : containerId;
    if (!container) return;

    var loc = settings.weeklyReportLocation || 'both';
    if (container.id === 'weekly-report-main' && loc === 'stats') {
      container.innerHTML = ''; return;
    }

    var all = MT.storage.loadAllDays();
    var now = new Date();
    var thisWeek = MT.stats.weekSummary(all, settings, settings.weekStart, now);
    var lastWeekDate = MT.stats.addDays(thisWeek.range.start, -1);
    var lastWeek = MT.stats.weekSummary(all, settings, settings.weekStart, lastWeekDate);

    var rangeStr = MT.stats.formatShortDate(thisWeek.range.start) + ' - ' + MT.stats.formatShortDate(thisWeek.range.end);

    var perfectDelta = thisWeek.perfect - lastWeek.perfect;
    var deltaCls = perfectDelta > 0 ? 'up' : perfectDelta < 0 ? 'down' : 'flat';
    var deltaArrow = perfectDelta > 0 ? '↑' : perfectDelta < 0 ? '↓' : '→';
    var deltaTxt = perfectDelta === 0 ? '持平' : (Math.abs(perfectDelta) + ' 天 ' + deltaArrow);

    var waterPct = settings.goals.water > 0 && thisWeek.waterAvg != null
      ? Math.round(thisWeek.waterAvg / settings.goals.water * 100) : 0;

    var prec = (settings.weight && settings.weight.precision) || 0.1;
    var unit = (settings.weight && settings.weight.unit) || 'kg';
    var weightLine = '';
    if (thisWeek.weightAvg != null) {
      var wd = (lastWeek.weightAvg != null) ? (thisWeek.weightAvg - lastWeek.weightAvg) : null;
      var wdCls = wd == null ? 'flat' : (wd > 0.05 ? 'up' : wd < -0.05 ? 'down' : 'flat');
      var wdArrow = wd == null ? '' : (wd > 0.05 ? '↑' : wd < -0.05 ? '↓' : '→');
      var wdTxt = wd == null ? '（上週無紀錄）' : ('<span class="weekly-delta '+wdCls+'">('+wdArrow+' '+formatNum(Math.abs(wd), prec)+' vs 上週)</span>');
      weightLine = '<div class="weekly-row"><span class="k">⚖️ 平均體重</span><span class="v">'+formatNum(thisWeek.weightAvg, prec)+' '+escapeHTML(unit)+' '+wdTxt+'</span></div>';
    } else {
      weightLine = '<div class="weekly-row"><span class="k">⚖️ 平均體重</span><span class="v" style="color:var(--text-dim)">— 本週無紀錄</span></div>';
    }

    var cardioLine = '';
    if (thisWeek.cardioPossible > 0) {
      var emoji = thisWeek.cardioDone === thisWeek.cardioPossible ? '🎉' : '';
      cardioLine = '<div class="weekly-row"><span class="k">🏃 有氧完成</span><span class="v">'+thisWeek.cardioDone+' / '+thisWeek.cardioPossible+' '+emoji+'</span></div>';
    }

    container.innerHTML = '<div class="weekly-card">' +
      '<div class="weekly-title">📅 本週回顧 <span class="range">'+rangeStr+'</span></div>' +
      '<div class="weekly-row"><span class="k">✨ 完美日</span><span class="v">'+thisWeek.perfect+' 天 <span class="weekly-delta '+deltaCls+'">('+deltaTxt+' vs 上週)</span></span></div>' +
      '<div class="weekly-row"><span class="k">✅ 達標日</span><span class="v">'+thisWeek.goalHit+' 天</span></div>' +
      '<div class="weekly-row"><span class="k">💧 平均飲水</span><span class="v">'+(thisWeek.waterAvg!=null?Math.round(thisWeek.waterAvg)+' ml ('+waterPct+'%)':'—')+'</span></div>' +
      '<div class="weekly-row"><span class="k">🧂 平均鹽</span><span class="v">'+(thisWeek.saltAvg!=null?thisWeek.saltAvg.toFixed(1)+' g':'—')+'</span></div>' +
      weightLine + cardioLine +
      (showLink ? '<div class="weekly-see-more"><button onclick="MT.statsui.open()">看完整統計 →</button></div>' : '') +
    '</div>';
  }

  return {
    dateToKey: dateToKey,
    formatDateLabel: formatDateLabel,
    formatNum: formatNum,
    escapeHTML: escapeHTML,
    trackers: trackers,
    weight: weight,
    meals: meals,
    summary: summary,
    streak: streak,
    dayToggle: dayToggle,
    weeklyReport: weeklyReport
  };
})();
