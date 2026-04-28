// 設定頁：外觀、目標、菜單、體重、統計入口、門檻、資料管理
window.MT = window.MT || {};

MT.settings = (function() {
  var modal = null;
  var body = null;
  var currentTab = 'train';
  var draft = null;

  function esc(s) { return MT.render.escapeHTML(s); }

  function open() {
    modal = document.getElementById('settings-modal');
    body = document.getElementById('settings-body');
    draft = JSON.parse(JSON.stringify(MT.storage.loadSettings()));
    modal.style.display = 'flex';
    render();
  }

  function close() {
    modal.style.display = 'none';
    MT.app.reloadSettings();
  }

  function render() {
    body.innerHTML =
      renderStatsEntry() +
      renderTheme() +
      renderGoals() +
      renderWeightSettings() +
      renderMealTiming() +
      renderMealsSection() +
      renderMacrosSection() +
      renderCardioSection() +
      renderThresholds() +
      renderWeeklyReportSettings() +
      renderDataSection() +
      renderAboutSection();
  }

  // ---- 排餐時間建議 ----
  function renderMealTiming() {
    var t = draft.mealTiming || {};
    return '<div class="settings-section">' +
      '<div class="settings-section-title">🕐 排餐時間建議</div>' +
      '<div class="settings-row"><label>啟用（勾第一餐自動排時間）</label>' +
        '<input type="checkbox" '+(t.enabled!==false?'checked':'')+' onchange="MT.settings.setMealTiming(\'enabled\', this.checked)" style="width:20px;height:20px">' +
      '</div>' +
      '<div class="settings-row"><label>餐間隔 (h)</label>' +
        '<input class="settings-input" type="number" step="0.5" min="2" max="5" value="'+t.intervalHours+'" oninput="MT.settings.setMealTiming(\'intervalHours\', this.value)">' +
      '</div>' +
      '<div class="settings-row"><label>練前餐 → 訓練 (min)</label>' +
        '<input class="settings-input" type="number" step="5" min="15" max="90" value="'+t.preWorkoutToTraining+'" oninput="MT.settings.setMealTiming(\'preWorkoutToTraining\', this.value)">' +
      '</div>' +
      '<div class="settings-row"><label>訓練時長 含有氧 (min)</label>' +
        '<input class="settings-input" type="number" step="5" min="30" max="180" value="'+t.trainingDuration+'" oninput="MT.settings.setMealTiming(\'trainingDuration\', this.value)">' +
      '</div>' +
      '<div class="settings-row"><label>練後餐 → 第三餐 (min)</label>' +
        '<input class="settings-input" type="number" step="5" min="15" max="90" value="'+t.postWorkoutToNext+'" oninput="MT.settings.setMealTiming(\'postWorkoutToNext\', this.value)">' +
      '</div>' +
      '<div class="settings-row"><label>第三餐 → 第四餐 (h)</label>' +
        '<input class="settings-input" type="number" step="0.5" min="1.5" max="5" value="'+t.postMeal3IntervalHours+'" oninput="MT.settings.setMealTiming(\'postMeal3IntervalHours\', this.value)">' +
      '</div>' +
      '<details class="timing-principles">' +
        '<summary>📖 查看 5 項排餐原則</summary>' +
        '<div class="body">' +
          '<ol>' +
            '<li><b>餐間隔 3-4 小時</b>：MPS 每次啟動持續 3-5h，太短浪費，太長有空窗。</li>' +
            '<li><b>練前餐距離訓練 30-60 分鐘</b>：米糊+香蕉快碳 30-45 分達峰，剛好供能。</li>' +
            '<li><b>練後餐 → 45 分鐘 → 第三餐</b>：教練規定。練後快碳+乳清啟動恢復，45 分後固體食物穩定供應胺基酸。</li>' +
            '<li><b>米糊餐和肉餐分開</b>：米糊餐快進快出（第一/練前/練後），肉餐慢消化長時間供能，邏輯不要混。</li>' +
            '<li><b>第一餐到最後一餐控制 12-14 小時內</b>：超過 14h 壓縮睡眠。睡前留 1-1.5h 消化。</li>' +
          '</ol>' +
          '<div style="margin-top:8px"><b>判斷流程：</b>固定訓練時間→往前推練前/第二/第一餐→往後排練後+45min(第三)+3h(第四)。</div>' +
          '<div style="margin-top:6px"><b>彈性：</b>下午沒空可拉到 4h，但不超過 5h；練後+45min 是規定不能省。</div>' +
        '</div>' +
      '</details>' +
    '</div>';
  }

  // ---- 統計頁入口 ----
  function renderStatsEntry() {
    return '<div class="settings-section">' +
      '<button class="btn full primary" onclick="MT.statsui.open()">📊 查看完整統計</button>' +
    '</div>';
  }

  // ---- 外觀 ----
  function renderTheme() {
    var t = draft.theme;
    return '<div class="settings-section">' +
      '<div class="settings-section-title">🎨 外觀</div>' +
      '<div class="settings-row"><label>主題</label>' +
        segmented([
          { v: 'auto',  l: '自動' },
          { v: 'dark',  l: '深色' },
          { v: 'light', l: '淺色' }
        ], t, 'MT.settings.setTheme') +
      '</div>' +
      (t === 'auto' ? '<div class="settings-row" style="border:none"><label>目前</label><span style="color:var(--text-dim);font-size:12px">'+esc(currentEffectiveTheme())+'（跟隨系統）</span></div>' : '') +
    '</div>';
  }

  function currentEffectiveTheme() {
    if (window.matchMedia && window.matchMedia('(prefers-color-scheme: light)').matches) return '淺色';
    return '深色';
  }

  // ---- 目標 ----
  function renderGoals() {
    var g = draft.goals;
    return '<div class="settings-section">' +
      '<div class="settings-section-title">🎯 每日目標</div>' +
      rowLabel('飲水量 (ml)', numInput('water', g.water, 500, 20000)) +
      rowLabel('鹽攝取 (g)', numInput('salt', g.salt, 1, 30)) +
      '<div class="settings-row"><label>飲水快捷按鈕 (ml)</label>' +
        '<div class="inc-editor">' +
          incInput('water', 0, g.waterIncrements[0]) +
          incInput('water', 1, g.waterIncrements[1]) +
          incInput('water', 2, g.waterIncrements[2]) +
        '</div></div>' +
      '<div class="settings-row"><label>鹽快捷按鈕 (g)</label>' +
        '<div class="inc-editor">' +
          incInput('salt', 0, g.saltIncrements[0]) +
          incInput('salt', 1, g.saltIncrements[1]) +
          incInput('salt', 2, g.saltIncrements[2]) +
        '</div></div>' +
    '</div>';
  }

  // ---- 體重 ----
  function renderWeightSettings() {
    var w = draft.weight;
    return '<div class="settings-section">' +
      '<div class="settings-section-title">⚖️ 體重</div>' +
      '<div class="settings-row"><label>單位</label>' +
        segmented([
          { v: 'kg', l: 'kg' },
          { v: 'lb', l: 'lb' }
        ], w.unit, 'MT.settings.setWeightUnit') +
      '</div>' +
      '<div class="settings-row"><label>小數位</label>' +
        segmented([
          { v: '0.1', l: '0.1' },
          { v: '0.5', l: '0.5' },
          { v: '1',   l: '1' }
        ], String(w.precision), 'MT.settings.setWeightPrecision') +
      '</div>' +
      '<div class="settings-row"><label>目標體重 ('+esc(w.unit)+')</label>' +
        '<input class="settings-input" type="number" step="0.1" placeholder="可留空" value="'+(w.target!=null?w.target:'')+'" oninput="MT.settings.setWeightTarget(this.value)">' +
      '</div>' +
      '<div class="settings-row"><label>顯示 7 / 30 天均</label>' +
        '<input type="checkbox" '+(w.showAverages?'checked':'')+' onchange="MT.settings.setWeightShowAverages(this.checked)" style="width:20px;height:20px">' +
      '</div>' +
    '</div>';
  }

  // ---- 門檻 ----
  function renderThresholds() {
    var t = draft.thresholds;
    return '<div class="settings-section">' +
      '<div class="settings-section-title">🏆 完美日 / 達標日門檻</div>' +
      '<div style="font-size:11px;color:var(--text-dim);margin-bottom:8px">調整完美日與達標日的判定比例（0–100%）</div>' +
      '<div style="font-size:11px;color:var(--text-dim);margin:4px 0 4px">✨ 完美日</div>' +
      rowLabel('餐點完成', pctInput('perfectMeals', t.perfectMeals)) +
      rowLabel('飲水', pctInput('perfectWater', t.perfectWater)) +
      rowLabel('鹽', pctInput('perfectSalt', t.perfectSalt)) +
      '<div style="font-size:11px;color:var(--text-dim);margin:8px 0 4px">✅ 達標日</div>' +
      rowLabel('餐點完成', pctInput('goalMeals', t.goalMeals)) +
      rowLabel('飲水', pctInput('goalWater', t.goalWater)) +
      rowLabel('鹽', pctInput('goalSalt', t.goalSalt)) +
    '</div>';
  }

  // ---- 週報 ----
  function renderWeeklyReportSettings() {
    return '<div class="settings-section">' +
      '<div class="settings-section-title">📅 週報</div>' +
      '<div class="settings-row"><label>顯示位置</label>' +
        segmented([
          { v: 'main',  l: '主頁' },
          { v: 'stats', l: '統計頁' },
          { v: 'both',  l: '都顯示' }
        ], draft.weeklyReportLocation, 'MT.settings.setWeeklyLocation') +
      '</div>' +
      '<div class="settings-row"><label>週起始日</label>' +
        segmented([
          { v: '1', l: '週一' },
          { v: '0', l: '週日' }
        ], String(draft.weekStart), 'MT.settings.setWeekStart') +
      '</div>' +
    '</div>';
  }

  // ---- helpers ----
  function rowLabel(label, inputHTML) {
    return '<div class="settings-row"><label>'+esc(label)+'</label>'+inputHTML+'</div>';
  }
  function numInput(key, value, min, max) {
    return '<input class="settings-input" type="number" min="'+min+'" max="'+max+'" value="'+value+'" oninput="MT.settings.updateGoal(\''+key+'\', this.value)">';
  }
  function incInput(key, idx, value) {
    return '<input type="number" value="'+value+'" oninput="MT.settings.updateIncrement(\''+key+'\', '+idx+', this.value)">';
  }
  function pctInput(key, ratio) {
    var pct = Math.round((ratio || 0) * 100);
    return '<input class="settings-input" type="number" min="0" max="100" value="'+pct+'" oninput="MT.settings.updateThreshold(\''+key+'\', this.value)"> <span style="font-size:12px;color:var(--text-dim);margin-left:4px">%</span>';
  }

  function segmented(options, current, handlerName) {
    return '<div class="segmented">' + options.map(function(o) {
      var cls = String(current) === String(o.v) ? 'active' : '';
      return '<button class="'+cls+'" onclick="'+handlerName+'(\''+o.v+'\')">'+esc(o.l)+'</button>';
    }).join('') + '</div>';
  }

  // ---- 菜單 ----
  function renderMealsSection() {
    var list = draft.meals[currentTab] || [];
    var h = '<div class="settings-section">' +
      '<div class="settings-section-title">🍽️ 菜單編輯</div>' +
      '<div class="sub-tabs">' +
        '<button class="sub-tab '+(currentTab==='train'?'active':'')+'" onclick="MT.settings.switchTab(\'train\')">🌅 早訓 ('+draft.meals.train.length+')</button>' +
        '<button class="sub-tab '+(currentTab==='train_pm'?'active':'')+'" onclick="MT.settings.switchTab(\'train_pm\')">🌙 晚訓 ('+draft.meals.train_pm.length+')</button>' +
        '<button class="sub-tab '+(currentTab==='rest'?'active':'')+'" onclick="MT.settings.switchTab(\'rest\')">😴 休息 ('+draft.meals.rest.length+')</button>' +
      '</div>';
    list.forEach(function(m, idx) { h += mealEditor(m, idx); });
    h += '<button class="btn full" onclick="MT.settings.addMeal()">＋ 新增一餐</button>';
    h += '</div>';
    return h;
  }

  function mealEditor(meal, idx) {
    return '<div class="meal-editor">' +
      '<div class="meal-editor-row">' +
        '<label>名稱</label>' +
        '<input type="text" value="'+esc(meal.name)+'" oninput="MT.settings.updateMeal('+idx+', \'name\', this.value)">' +
      '</div>' +
      '<div class="meal-editor-row">' +
        '<label>內容</label>' +
        '<input type="text" value="'+esc(meal.items)+'" oninput="MT.settings.updateMeal('+idx+', \'items\', this.value)">' +
      '</div>' +
      '<div class="meal-editor-row">' +
        '<label>備註</label>' +
        '<input type="text" value="'+esc(meal.note||'')+'" placeholder="(可留空)" oninput="MT.settings.updateMeal('+idx+', \'note\', this.value)">' +
      '</div>' +
      '<div class="meal-editor-row">' +
        '<label>標籤</label>' +
        '<input type="checkbox" '+(meal.tag?'checked':'')+' onchange="MT.settings.updateMeal('+idx+', \'tag\', this.checked)">' +
        '<span style="font-size:12px;color:var(--text-dim)">顯示「訓練相關」</span>' +
      '</div>' +
      '<div class="meal-editor-actions">' +
        '<button class="btn small" onclick="MT.settings.moveMeal('+idx+', -1)">↑</button>' +
        '<button class="btn small" onclick="MT.settings.moveMeal('+idx+', 1)">↓</button>' +
        '<button class="btn small danger" onclick="MT.settings.deleteMeal('+idx+')">刪除</button>' +
      '</div>' +
    '</div>';
  }

  function renderMacrosSection() {
    var t = draft.macros.train, p = draft.macros.train_pm, r = draft.macros.rest;
    return '<div class="settings-section">' +
      '<div class="settings-section-title">📊 營養概估</div>' +
      '<div style="font-size:11px;color:var(--text-dim);margin-bottom:8px">🌅 早訓</div>' +
      rowLabel('熱量', macroInput('train', 'kcal', t.kcal)) +
      rowLabel('碳水', macroInput('train', 'carbs', t.carbs)) +
      rowLabel('蛋白', macroInput('train', 'protein', t.protein)) +
      rowLabel('脂肪', macroInput('train', 'fat', t.fat)) +
      '<div style="font-size:11px;color:var(--text-dim);margin:10px 0 8px">🌙 晚訓</div>' +
      rowLabel('熱量', macroInput('train_pm', 'kcal', p.kcal)) +
      rowLabel('碳水', macroInput('train_pm', 'carbs', p.carbs)) +
      rowLabel('蛋白', macroInput('train_pm', 'protein', p.protein)) +
      rowLabel('脂肪', macroInput('train_pm', 'fat', p.fat)) +
      '<div style="font-size:11px;color:var(--text-dim);margin:10px 0 8px">😴 休息日</div>' +
      rowLabel('熱量', macroInput('rest', 'kcal', r.kcal)) +
      rowLabel('碳水', macroInput('rest', 'carbs', r.carbs)) +
      rowLabel('蛋白', macroInput('rest', 'protein', r.protein)) +
      rowLabel('脂肪', macroInput('rest', 'fat', r.fat)) +
    '</div>';
  }

  function macroInput(day, key, value) {
    return '<input class="settings-input" type="text" value="'+esc(value)+'" oninput="MT.settings.updateMacro(\''+day+'\', \''+key+'\', this.value)">';
  }

  function renderCardioSection() {
    var c = draft.cardio;
    return '<div class="settings-section">' +
      '<div class="settings-section-title">🏃 訓練日有氧</div>' +
      '<div class="settings-row"><label>啟用</label>' +
        '<input type="checkbox" '+(c.enabled?'checked':'')+' onchange="MT.settings.updateCardio(\'enabled\', this.checked)" style="width:20px;height:20px">' +
      '</div>' +
      '<div class="settings-row"><label>文字</label>' +
        '<input class="settings-input wide" type="text" value="'+esc(c.text)+'" oninput="MT.settings.updateCardio(\'text\', this.value)">' +
      '</div>' +
    '</div>';
  }

  function renderDataSection() {
    return '<div class="settings-section">' +
      '<div class="settings-section-title">💾 資料</div>' +
      '<div class="data-actions">' +
        '<button class="btn" onclick="MT.settings.exportData()">📤 匯出 JSON</button>' +
        '<button class="btn" onclick="MT.settings.importData()">📥 匯入 JSON</button>' +
      '</div>' +
      '<div style="height:10px"></div>' +
      '<div class="data-actions">' +
        '<button class="btn danger full" onclick="MT.settings.resetSettings()">🔄 還原預設菜單/目標</button>' +
      '</div>' +
      '<div style="height:6px"></div>' +
      '<div class="data-actions">' +
        '<button class="btn danger full" onclick="MT.settings.clearAll()">🗑 清除全部紀錄</button>' +
      '</div>' +
    '</div>';
  }

  function renderAboutSection() {
    return '<div class="settings-section">' +
      '<div class="settings-section-title">ℹ️ 關於</div>' +
      '<div style="font-size:12px;color:var(--text-dim);line-height:1.8">' +
        '每日飲食追蹤 · v4<br>' +
        '資料僅儲存在本機 localStorage（保留 365 天）<br>' +
        '換機或清除瀏覽器資料前請先匯出' +
      '</div>' +
    '</div>';
  }

  // ==== 更新函式 ====
  function setTheme(v) { draft.theme = v; MT.storage.saveSettings(draft); MT.app.applyTheme(v); render(); }

  function setWeightUnit(v) { draft.weight.unit = v; MT.storage.saveSettings(draft); render(); }
  function setWeightPrecision(v) { draft.weight.precision = parseFloat(v); MT.storage.saveSettings(draft); render(); }
  function setWeightTarget(v) {
    draft.weight.target = v === '' ? null : parseFloat(v);
    if (isNaN(draft.weight.target)) draft.weight.target = null;
    MT.storage.saveSettings(draft);
  }
  function setWeightShowAverages(v) { draft.weight.showAverages = !!v; MT.storage.saveSettings(draft); }

  function setMealTiming(key, v) {
    if (key === 'enabled') {
      draft.mealTiming.enabled = !!v;
    } else {
      var n = parseFloat(v);
      if (isNaN(n)) return;
      draft.mealTiming[key] = n;
    }
    MT.storage.saveSettings(draft);
  }

  function setWeeklyLocation(v) { draft.weeklyReportLocation = v; MT.storage.saveSettings(draft); render(); }
  function setWeekStart(v) { draft.weekStart = parseInt(v); MT.storage.saveSettings(draft); render(); }

  function updateThreshold(key, v) {
    var n = parseFloat(v); if (isNaN(n)) return;
    draft.thresholds[key] = Math.max(0, Math.min(1, n / 100));
    MT.storage.saveSettings(draft);
  }

  function updateGoal(key, v) {
    var n = parseFloat(v); if (isNaN(n)) return;
    draft.goals[key] = n;
    MT.storage.saveSettings(draft);
  }
  function updateIncrement(key, idx, v) {
    var n = parseFloat(v); if (isNaN(n)) return;
    var arr = key === 'water' ? draft.goals.waterIncrements : draft.goals.saltIncrements;
    arr[idx] = n;
    MT.storage.saveSettings(draft);
  }
  function switchTab(t) { currentTab = t; render(); }
  function updateMeal(idx, key, v) { draft.meals[currentTab][idx][key] = v; MT.storage.saveSettings(draft); }
  function addMeal() {
    var prefix = currentTab === 'train' ? 't' : 'r';
    var id = prefix + Date.now().toString(36);
    draft.meals[currentTab].push({ id: id, name: '新的一餐', items: '', note: '', tag: false });
    MT.storage.saveSettings(draft);
    render();
  }
  function deleteMeal(idx) {
    if (!confirm('確定刪除這一餐？')) return;
    draft.meals[currentTab].splice(idx, 1);
    MT.storage.saveSettings(draft);
    render();
  }
  function moveMeal(idx, dir) {
    var list = draft.meals[currentTab];
    var ni = idx + dir;
    if (ni < 0 || ni >= list.length) return;
    var tmp = list[idx]; list[idx] = list[ni]; list[ni] = tmp;
    MT.storage.saveSettings(draft);
    render();
  }
  function updateMacro(day, key, v) { draft.macros[day][key] = v; MT.storage.saveSettings(draft); }
  function updateCardio(key, v) { draft.cardio[key] = v; MT.storage.saveSettings(draft); }

  // ---- 資料操作 ----
  function exportData() {
    var data = MT.storage.exportAll();
    var blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    var url = URL.createObjectURL(blob);
    var a = document.createElement('a');
    a.href = url;
    a.download = 'meal-tracker-' + MT.render.dateToKey(new Date()) + '.json';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setTimeout(function() { URL.revokeObjectURL(url); }, 1000);
    MT.app.toast('✅ 已匯出');
  }

  function importData() {
    var input = document.getElementById('import-file');
    input.value = '';
    input.onchange = function() {
      var f = input.files[0]; if (!f) return;
      var r = new FileReader();
      r.onload = function() {
        try {
          var obj = JSON.parse(r.result);
          if (!confirm('匯入將覆蓋目前資料，確定？')) return;
          MT.storage.importAll(obj);
          draft = JSON.parse(JSON.stringify(MT.storage.loadSettings()));
          MT.app.applyTheme(draft.theme);
          render();
          MT.app.toast('✅ 匯入成功');
        } catch (e) {
          alert('匯入失敗：' + e.message);
        }
      };
      r.readAsText(f);
    };
    input.click();
  }

  function resetSettings() {
    if (!confirm('還原預設菜單 / 目標？（每日紀錄不會被刪除）')) return;
    MT.storage.resetSettings();
    draft = JSON.parse(JSON.stringify(MT.storage.loadSettings()));
    MT.app.applyTheme(draft.theme);
    render();
    MT.app.toast('已還原預設');
  }

  function clearAll() {
    if (!confirm('⚠️ 清除全部紀錄與設定，無法還原！')) return;
    if (!confirm('再次確認：真的清除全部資料？')) return;
    MT.storage.clearAll();
    draft = JSON.parse(JSON.stringify(MT.storage.loadSettings()));
    MT.app.applyTheme(draft.theme);
    render();
    MT.app.toast('已清除');
  }

  return {
    open: open, close: close,
    switchTab: switchTab,
    setTheme: setTheme,
    setWeightUnit: setWeightUnit, setWeightPrecision: setWeightPrecision,
    setWeightTarget: setWeightTarget, setWeightShowAverages: setWeightShowAverages,
    setWeeklyLocation: setWeeklyLocation, setWeekStart: setWeekStart,
    setMealTiming: setMealTiming,
    updateThreshold: updateThreshold,
    updateGoal: updateGoal, updateIncrement: updateIncrement,
    updateMeal: updateMeal, addMeal: addMeal, deleteMeal: deleteMeal, moveMeal: moveMeal,
    updateMacro: updateMacro, updateCardio: updateCardio,
    exportData: exportData, importData: importData,
    resetSettings: resetSettings, clearAll: clearAll
  };
})();
