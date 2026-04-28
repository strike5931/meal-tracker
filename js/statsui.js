// 統計頁 UI
window.MT = window.MT || {};

MT.statsui = (function() {
  var modal, body;
  var range = 30;  // 7 / 30 / 90
  var weightChart = null;

  function esc(s) { return MT.render.escapeHTML(s); }
  function fnum(n, p) { return MT.render.formatNum(n, p); }

  function open() {
    modal = document.getElementById('stats-modal');
    body = document.getElementById('stats-body');
    modal.style.display = 'flex';
    render();
  }

  function close() {
    if (weightChart) { weightChart.destroy(); weightChart = null; }
    modal.style.display = 'none';
  }

  function setRange(n) { range = n; render(); }

  function render() {
    var settings = MT.storage.loadSettings();
    var all = MT.storage.loadAllDays();

    var cur = MT.stats.currentStreak(all, settings);
    var best = MT.stats.longestStreak(all, settings);
    var summary = MT.stats.rangeSummary(all, settings, range);
    var heat = MT.stats.heatmapData(all, settings, range);
    var weightTrend = MT.stats.weightTrend(all, range);
    var weightSeries = MT.stats.weightHistory(all, range);
    var weeklyWeights = MT.stats.weeklyWeightSeries(all, settings.weekStart, 6);

    var prec = settings.weight.precision || 0.1;
    var unit = settings.weight.unit || 'kg';
    var wTarget = settings.weight.target;

    var html = '';

    // ---- 區間切換 ----
    html += '<div class="stats-tabs">' +
      rangeBtn(7, '7 天') +
      rangeBtn(30, '30 天') +
      rangeBtn(90, '90 天') +
    '</div>';

    // ---- 週報 ----
    html += '<div id="stats-weekly-slot"></div>';

    // ---- 3 張數字卡 ----
    html += '<div class="stats-cards">' +
      statCard('當前連勝', '🔥 '+cur, '完美日連續') +
      statCard('最長連勝', '🏆 '+best, '歷史紀錄') +
      statCard('完美率', '📈 '+Math.round(summary.perfectRate*100)+'%', '近 '+range+' 天') +
    '</div>';

    // ---- 分項達成率 ----
    html += '<div class="settings-section">' +
      '<div class="settings-section-title">🎯 目標達成率（近 '+range+' 天）</div>' +
      statRow('💧', '飲水達標', summary.waterHitRate, summary.waterHit, summary.logged) +
      statRow('🧂', '鹽量達標', summary.saltHitRate, summary.saltHit, summary.logged) +
      statRow('🍽️', '餐點完成', summary.mealCompletion, null, null, '%') +
      (summary.cardioPossible > 0 ? statRow('🏃', '有氧完成', summary.cardioCompletion, summary.cardioDone, summary.cardioPossible) : '') +
      statRow('✨', '完美日', summary.perfectRate, summary.perfect, summary.logged) +
      statRow('⚖️', '體重記錄率', summary.weightLogRate, summary.weightLogCount, range) +
    '</div>';

    // ---- 平均值 ----
    html += '<div class="settings-section">' +
      '<div class="settings-section-title">📊 平均值（近 '+range+' 天）</div>' +
      '<div class="settings-row"><label>💧 平均飲水</label><b>'+(summary.waterAvg>0?Math.round(summary.waterAvg)+' ml':'—')+'</b></div>' +
      '<div class="settings-row"><label>🧂 平均鹽</label><b>'+(summary.saltAvg>0?summary.saltAvg.toFixed(1)+' g':'—')+'</b></div>' +
      '<div class="settings-row"><label>⚖️ 平均體重</label><b>'+(summary.weightAvg!=null?fnum(summary.weightAvg,prec)+' '+esc(unit):'—')+'</b></div>' +
      '<div class="settings-row"><label>🌅/🌙/😴 早訓/晚訓/休息</label><b>'+summary.trainDays+' / '+summary.trainPmDays+' / '+summary.restDays+'</b></div>' +
    '</div>';

    // ---- 熱圖 ----
    html += '<div class="settings-section">' +
      '<div class="settings-section-title">📅 月曆熱圖</div>' +
      heatmapHTML(heat) +
      '<div class="heatmap-legend">' +
        '<span><span class="sw" style="background:var(--heatmap-empty)"></span>無</span>' +
        '<span><span class="sw" style="background:var(--heatmap-low)"></span>有紀錄</span>' +
        '<span><span class="sw" style="background:var(--heatmap-mid)"></span>達標</span>' +
        '<span><span class="sw" style="background:var(--heatmap-high)"></span>完美</span>' +
      '</div>' +
    '</div>';

    // ---- 體重 ----
    html += '<div class="settings-section">' +
      '<div class="settings-section-title">⚖️ 體重趨勢（近 '+range+' 天）</div>' +
      weightSection(weightTrend, weightSeries, prec, unit, wTarget, weeklyWeights) +
    '</div>';

    body.innerHTML = html;

    // 插入週報
    if (settings.weeklyReportLocation !== 'main') {
      MT.render.weeklyReport(settings, 'stats-weekly-slot', false);
    }

    // 畫體重圖
    drawWeightChart(weightSeries, weightTrend, prec, unit, wTarget);
  }

  function rangeBtn(n, label) {
    var cls = range === n ? 'active' : '';
    return '<button class="'+cls+'" onclick="MT.statsui.setRange('+n+')">'+label+'</button>';
  }

  function statCard(label, value, sub) {
    return '<div class="stat-card">' +
      '<div class="label">'+esc(label)+'</div>' +
      '<div class="value">'+esc(value)+'</div>' +
      '<div class="sub">'+esc(sub)+'</div>' +
    '</div>';
  }

  function statRow(emoji, name, ratio, num, den, unit) {
    var pct = Math.round((ratio || 0) * 100);
    var detail = '';
    if (num != null && den != null) detail = ' ('+num+'/'+den+')';
    else if (unit === '%') detail = '';
    return '<div class="stat-row">' +
      '<div class="emoji">'+emoji+'</div>' +
      '<div class="name">'+esc(name)+'</div>' +
      '<div class="bar-wrap"><div class="bar-fill" style="width:'+pct+'%"></div></div>' +
      '<div class="pct">'+pct+'%'+esc(detail)+'</div>' +
    '</div>';
  }

  function heatmapHTML(heat) {
    // 依 DOW 把第一週之前的格子補空格
    if (heat.length === 0) return '<div style="font-size:12px;color:var(--text-dim)">無紀錄</div>';
    var first = MT.stats.parseKey(heat[0].key);
    var lead = first.getDay(); // 0=日 ... 6=六
    var weekdays = ['日','一','二','三','四','五','六'];
    var header = '<div class="heatmap-header">' +
      weekdays.map(function(w){ return '<div>'+w+'</div>'; }).join('') + '</div>';
    var cells = '';
    for (var i = 0; i < lead; i++) cells += '<div></div>';
    var todayKey = MT.render.dateToKey(new Date());
    heat.forEach(function(d) {
      var dd = MT.stats.parseKey(d.key).getDate();
      var todayCls = d.key === todayKey ? ' today' : '';
      cells += '<div class="heatmap-cell'+todayCls+'" data-level="'+d.level+'" onclick="MT.statsui.jumpTo(\''+d.key+'\')" title="'+d.key+'">'+dd+'</div>';
    });
    return header + '<div class="heatmap">'+cells+'</div>';
  }

  function jumpTo(key) {
    close();
    MT.settings.close();
    MT.app.viewDateFromStats(key);
  }

  function weightSection(trend, series, prec, unit, target, weeklyWeights) {
    if (series.length === 0) {
      return '<div style="font-size:13px;color:var(--text-dim);padding:10px 0">尚無體重紀錄</div>' +
             targetRemaining(null, target, prec, unit, weeklyWeights);
    }
    var deltaCls = trend.delta == null ? '' :
      (trend.delta > 0.05 ? 'color:var(--warn)' : trend.delta < -0.05 ? 'color:var(--check)' : 'color:var(--text-dim)');
    var arrow = trend.delta == null ? '' : (trend.delta > 0.05 ? '↑' : trend.delta < -0.05 ? '↓' : '→');
    var pct = (trend.start && trend.delta != null) ? ((trend.delta / trend.start) * 100).toFixed(1) : '0.0';

    return '' +
      '<div class="settings-row"><label>起始 ('+series.length+' 筆)</label><b>'+fnum(trend.start, prec)+' '+esc(unit)+'</b></div>' +
      '<div class="settings-row"><label>現在</label><b>'+fnum(trend.end, prec)+' '+esc(unit)+'</b></div>' +
      '<div class="settings-row"><label>總變化</label><b style="'+deltaCls+'">'+arrow+' '+fnum(Math.abs(trend.delta), prec)+' '+esc(unit)+' ('+pct+'%)</b></div>' +
      '<div class="weight-chart-wrap"><canvas id="weight-chart"></canvas></div>' +
      targetRemaining(trend, target, prec, unit, weeklyWeights);
  }

  function targetRemaining(trend, target, prec, unit, weeklyWeights) {
    if (target == null) return '';
    // 預估還需要幾週（以近 4 週平均變化為基準）
    var validW = weeklyWeights.filter(function(w){ return w.avg != null; });
    if (trend && trend.end != null && validW.length >= 2) {
      var first = validW[0].avg;
      var last  = validW[validW.length-1].avg;
      var weeksSpan = validW.length - 1;
      var weeklyChange = (last - first) / weeksSpan;
      var diff = trend.end - target;
      var msg = '';
      if (Math.abs(diff) < 0.1) msg = '🎉 已達標！';
      else if ((diff > 0 && weeklyChange >= 0) || (diff < 0 && weeklyChange <= 0)) {
        msg = '以近 '+validW.length+' 週趨勢推估：目前方向與目標相反，建議調整';
      } else if (Math.abs(weeklyChange) < 0.01) {
        msg = '近週變化不大，無法推估';
      } else {
        var weeks = Math.ceil(Math.abs(diff / weeklyChange));
        msg = '以近 '+validW.length+' 週週均 '+(weeklyChange>0?'+':'')+fnum(weeklyChange, 0.1)+' '+esc(unit)+'/週推估，達標約 '+weeks+' 週';
      }
      return '<div style="font-size:12px;color:var(--text-dim);margin-top:10px">🎯 目標 '+fnum(target, prec)+' '+esc(unit)+'。'+msg+'</div>';
    }
    return '<div style="font-size:12px;color:var(--text-dim);margin-top:10px">🎯 目標 '+fnum(target, prec)+' '+esc(unit)+'</div>';
  }

  function drawWeightChart(series, trend, prec, unit, target) {
    if (!window.Chart) return;
    var canvas = document.getElementById('weight-chart');
    if (!canvas || series.length === 0) return;

    if (weightChart) { weightChart.destroy(); weightChart = null; }

    var bodyStyle = getComputedStyle(document.body);
    var lineColor = bodyStyle.getPropertyValue('--accent-weight').trim() || '#b388ff';
    var textColor = bodyStyle.getPropertyValue('--text-dim').trim() || '#888';
    var gridColor = bodyStyle.getPropertyValue('--border').trim() || '#2a2a2a';

    var labels = series.map(function(p) {
      var d = MT.stats.parseKey(p.date);
      return (d.getMonth()+1)+'/'+d.getDate();
    });
    var data = series.map(function(p) { return p.weight; });

    var datasets = [{
      label: '體重 '+unit,
      data: data,
      borderColor: lineColor,
      backgroundColor: lineColor + '33',
      tension: 0.3,
      fill: true,
      pointRadius: 3,
      pointHoverRadius: 5
    }];

    if (target != null) {
      datasets.push({
        label: '目標',
        data: new Array(series.length).fill(target),
        borderColor: 'rgba(76,175,80,0.6)',
        borderDash: [4, 4],
        borderWidth: 1.5,
        pointRadius: 0,
        fill: false
      });
    }

    weightChart = new Chart(canvas, {
      type: 'line',
      data: { labels: labels, datasets: datasets },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        animation: false,
        plugins: {
          legend: { display: false }
        },
        scales: {
          x: { ticks: { color: textColor, maxRotation: 0, autoSkipPadding: 16 }, grid: { color: gridColor } },
          y: { ticks: { color: textColor }, grid: { color: gridColor } }
        }
      }
    });
  }

  return { open: open, close: close, setRange: setRange, jumpTo: jumpTo };
})();
