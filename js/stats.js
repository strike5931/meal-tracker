// 統計計算 — 純函式，不涉及 DOM
window.MT = window.MT || {};

MT.stats = (function() {

  function parseKey(k) {
    var p = k.split('-');
    return new Date(parseInt(p[0]), parseInt(p[1])-1, parseInt(p[2]));
  }
  function dateToKey(d) {
    return d.getFullYear() + '-' + String(d.getMonth()+1).padStart(2,'0') + '-' + String(d.getDate()).padStart(2,'0');
  }
  function addDays(d, n) { var x = new Date(d); x.setDate(x.getDate() + n); return x; }

  // 拿到「從今天往前 n-1 天」的 key 陣列（含今天，由舊到新）
  function lastNDays(n) {
    var today = new Date();
    today.setHours(0,0,0,0);
    var arr = [];
    for (var i = n - 1; i >= 0; i--) arr.push(dateToKey(addDays(today, -i)));
    return arr;
  }

  function getDayData(allDays, key) {
    return allDays[key] || null;
  }

  // ==== 判斷完美日 / 達標日 ====
  function computeDay(dayData, settings) {
    if (!dayData) return { hasData: false, isPerfect: false, isGoalHit: false,
      mealRatio: 0, waterRatio: 0, saltRatio: 0, cardioDone: false, totalMeals: 0, checkedCount: 0 };

    var dm = (settings.meals[dayData.dayType] || []);
    var totalMeals = dm.length;
    var checkedCount = 0;
    for (var i = 0; i < dm.length; i++) {
      if (dayData.checked && dayData.checked[dm[i].id]) checkedCount++;
    }
    var cardioEnabled = (dayData.dayType === 'train' && settings.cardio && settings.cardio.enabled);
    var cardioDone = cardioEnabled ? !!(dayData.checked && dayData.checked['cardio']) : false;

    // 有氧納入餐點比例
    var effTotal = totalMeals + (cardioEnabled ? 1 : 0);
    var effChecked = checkedCount + (cardioDone ? 1 : 0);
    var mealRatio = effTotal > 0 ? effChecked / effTotal : 0;

    var waterRatio = settings.goals.water > 0 ? (dayData.water / settings.goals.water) : 0;
    var saltRatio  = settings.goals.salt  > 0 ? (dayData.salt  / settings.goals.salt)  : 0;

    var t = settings.thresholds;
    var isPerfect = (mealRatio >= t.perfectMeals && waterRatio >= t.perfectWater && saltRatio >= t.perfectSalt);
    var isGoalHit = (mealRatio >= t.goalMeals && waterRatio >= t.goalWater && saltRatio >= t.goalSalt);

    // hasData: 有任何欄位大於 0 / 有打卡 / 有體重
    var hasData = (dayData.water > 0 || dayData.salt > 0 || checkedCount > 0 ||
                   (dayData.weight != null));

    return {
      hasData: hasData, isPerfect: isPerfect, isGoalHit: isGoalHit,
      mealRatio: mealRatio, waterRatio: waterRatio, saltRatio: saltRatio,
      cardioDone: cardioDone, cardioEnabled: cardioEnabled,
      totalMeals: totalMeals, checkedCount: checkedCount,
      water: dayData.water, salt: dayData.salt, weight: dayData.weight,
      dayType: dayData.dayType
    };
  }

  // ==== streak（從今天往前，不含今天若今天還沒達標的處理） ====
  function currentStreak(allDays, settings) {
    var today = new Date(); today.setHours(0,0,0,0);
    var streak = 0;
    for (var i = 0; i < 365; i++) {
      var d = addDays(today, -i);
      var key = dateToKey(d);
      var c = computeDay(allDays[key], settings);
      if (c.isPerfect) streak++;
      else if (i === 0 && !c.hasData) continue;   // 今天還沒開始 → 跳過
      else break;
    }
    return streak;
  }

  function longestStreak(allDays, settings) {
    var keys = Object.keys(allDays).sort();
    if (keys.length === 0) return 0;
    var longest = 0, cur = 0, prev = null;
    keys.forEach(function(k) {
      var c = computeDay(allDays[k], settings);
      var d = parseKey(k);
      if (c.isPerfect) {
        if (prev && (d - prev) === 86400000) cur++;
        else cur = 1;
        if (cur > longest) longest = cur;
        prev = d;
      } else { cur = 0; prev = null; }
    });
    return longest;
  }

  // ==== 週期統計 ====
  function rangeSummary(allDays, settings, days) {
    var keys = lastNDays(days);
    var perfect = 0, goalHit = 0, logged = 0;
    var waterSum = 0, waterDays = 0;
    var saltSum = 0,  saltDays = 0;
    var mealsCheckedTotal = 0, mealsPossibleTotal = 0;
    var cardioDone = 0, cardioPossible = 0;
    var trainDays = 0, restDays = 0;
    var weightSum = 0, weightDays = 0;
    var waterHit = 0, saltHit = 0, mealHit = 0;

    keys.forEach(function(key) {
      var d = allDays[key];
      var c = computeDay(d, settings);
      if (c.isPerfect) perfect++;
      if (c.isGoalHit) goalHit++;
      if (c.hasData) {
        logged++;
        if (d.dayType === 'train') trainDays++;
        else if (d.dayType === 'rest') restDays++;

        waterSum += d.water || 0; waterDays++;
        saltSum  += d.salt  || 0; saltDays++;
        mealsCheckedTotal  += c.checkedCount + (c.cardioDone ? 1 : 0);
        mealsPossibleTotal += c.totalMeals + (c.cardioEnabled ? 1 : 0);
        if (c.cardioEnabled) { cardioPossible++; if (c.cardioDone) cardioDone++; }
        if (d.weight != null) { weightSum += d.weight; weightDays++; }

        if (c.waterRatio >= settings.thresholds.goalWater) waterHit++;
        if (c.saltRatio  >= settings.thresholds.goalSalt)  saltHit++;
        if (c.mealRatio  >= settings.thresholds.goalMeals) mealHit++;
      }
    });

    return {
      days: days, logged: logged, perfect: perfect, goalHit: goalHit,
      trainDays: trainDays, restDays: restDays,
      waterAvg: waterDays > 0 ? waterSum / waterDays : 0,
      saltAvg:  saltDays  > 0 ? saltSum  / saltDays  : 0,
      weightAvg: weightDays > 0 ? weightSum / weightDays : null,
      weightLogCount: weightDays,
      mealCompletion: mealsPossibleTotal > 0 ? mealsCheckedTotal / mealsPossibleTotal : 0,
      cardioCompletion: cardioPossible > 0 ? cardioDone / cardioPossible : 0,
      cardioPossible: cardioPossible, cardioDone: cardioDone,
      waterHitRate: logged > 0 ? waterHit / logged : 0, waterHit: waterHit,
      saltHitRate:  logged > 0 ? saltHit  / logged : 0, saltHit: saltHit,
      mealHitRate:  logged > 0 ? mealHit  / logged : 0, mealHit: mealHit,
      perfectRate:  logged > 0 ? perfect  / logged : 0,
      weightLogRate: days > 0 ? weightDays / days : 0
    };
  }

  // ==== 週區間（給定 weekStart 1=週一, 0=週日） ====
  function weekRange(date, weekStart) {
    var d = new Date(date); d.setHours(0,0,0,0);
    var dow = d.getDay();
    // 距離本週起始日的天數
    var diff = (dow - weekStart + 7) % 7;
    var start = addDays(d, -diff);
    var end = addDays(start, 6);
    return { start: start, end: end };
  }

  function weekKeys(date, weekStart) {
    var r = weekRange(date, weekStart);
    var keys = [];
    for (var i = 0; i < 7; i++) keys.push(dateToKey(addDays(r.start, i)));
    return { start: r.start, end: r.end, keys: keys };
  }

  function weekSummary(allDays, settings, weekStart, date) {
    var w = weekKeys(date || new Date(), weekStart);
    var perfect = 0, goalHit = 0, logged = 0;
    var waterSum = 0, waterDays = 0;
    var saltSum = 0, saltDays = 0;
    var weightSum = 0, weightDays = 0;
    var cardioDone = 0, cardioPossible = 0;

    w.keys.forEach(function(key) {
      var d = allDays[key]; if (!d) return;
      var c = computeDay(d, settings);
      if (!c.hasData) return;
      logged++;
      if (c.isPerfect) perfect++;
      if (c.isGoalHit) goalHit++;
      waterSum += d.water || 0; waterDays++;
      saltSum  += d.salt  || 0; saltDays++;
      if (c.cardioEnabled) { cardioPossible++; if (c.cardioDone) cardioDone++; }
      if (d.weight != null) { weightSum += d.weight; weightDays++; }
    });

    return {
      range: { start: w.start, end: w.end },
      keys: w.keys,
      logged: logged, perfect: perfect, goalHit: goalHit,
      miss: logged - perfect - goalHit + (goalHit >= perfect ? perfect : 0), // 未達標：登記但沒達目標
      waterAvg: waterDays > 0 ? waterSum / waterDays : null,
      saltAvg:  saltDays > 0 ? saltSum / saltDays : null,
      weightAvg: weightDays > 0 ? weightSum / weightDays : null,
      weightLogCount: weightDays,
      cardioDone: cardioDone, cardioPossible: cardioPossible
    };
  }

  // ==== 體重 ====
  function weightHistory(allDays, days) {
    var keys = lastNDays(days || 90);
    var series = [];
    keys.forEach(function(k) {
      var d = allDays[k];
      if (d && d.weight != null) series.push({ date: k, weight: d.weight });
    });
    return series;
  }

  function weightAvg(allDays, days) {
    var keys = lastNDays(days);
    var sum = 0, n = 0;
    keys.forEach(function(k) {
      var d = allDays[k];
      if (d && d.weight != null) { sum += d.weight; n++; }
    });
    return n > 0 ? sum / n : null;
  }

  // 起始：近 days 天內最舊的一筆；現在：最新一筆
  function weightTrend(allDays, days) {
    var hist = weightHistory(allDays, days);
    if (hist.length === 0) return { start: null, end: null, delta: null };
    return { start: hist[0].weight, end: hist[hist.length-1].weight,
             delta: hist[hist.length-1].weight - hist[0].weight, count: hist.length };
  }

  // 連續 N 週的週平均陣列
  function weeklyWeightSeries(allDays, weekStart, numWeeks) {
    var today = new Date(); today.setHours(0,0,0,0);
    var out = [];
    for (var i = numWeeks - 1; i >= 0; i--) {
      var anchor = addDays(today, -i * 7);
      var w = weekKeys(anchor, weekStart);
      var sum = 0, n = 0;
      w.keys.forEach(function(k) {
        var d = allDays[k];
        if (d && d.weight != null) { sum += d.weight; n++; }
      });
      out.push({ start: w.start, end: w.end, avg: n > 0 ? sum / n : null });
    }
    return out;
  }

  // ==== 熱圖 ====
  function heatmapData(allDays, settings, days) {
    var keys = lastNDays(days);
    return keys.map(function(key) {
      var c = computeDay(allDays[key], settings);
      var level = 0;
      if (c.hasData) {
        if (c.isPerfect) level = 3;
        else if (c.isGoalHit) level = 2;
        else level = 1;
      }
      return { key: key, level: level, data: c };
    });
  }

  function formatShortDate(d) {
    return (d.getMonth()+1) + '/' + d.getDate();
  }

  return {
    dateToKey: dateToKey, parseKey: parseKey, addDays: addDays,
    lastNDays: lastNDays, computeDay: computeDay,
    currentStreak: currentStreak, longestStreak: longestStreak,
    rangeSummary: rangeSummary,
    weekRange: weekRange, weekKeys: weekKeys, weekSummary: weekSummary,
    weightHistory: weightHistory, weightAvg: weightAvg, weightTrend: weightTrend,
    weeklyWeightSeries: weeklyWeightSeries,
    heatmapData: heatmapData, formatShortDate: formatShortDate
  };
})();
