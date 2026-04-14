// 設定頁面：目標、菜單、宏量、資料管理
window.MT = window.MT || {};

MT.settings = (function() {
  var modal = null;
  var body = null;
  var currentTab = 'train';
  var draft = null;   // 編輯中副本

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
    // 已在每次變更時自動儲存，這裡關閉即可
    MT.app.reloadSettings();
  }

  function render() {
    body.innerHTML = renderGoals() + renderMealsSection() + renderMacrosSection() + renderCardioSection() + renderDataSection() + renderAboutSection();
  }

  function renderGoals() {
    var g = draft.goals;
    return '' +
      '<div class="settings-section">' +
        '<div class="settings-section-title">🎯 每日目標</div>' +
        row('飲水量 (ml)', numInput('water', g.water, 500, 20000)) +
        row('鹽攝取 (g)', numInput('salt', g.salt, 1, 30)) +
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

  function row(label, inputHTML) {
    return '<div class="settings-row"><label>'+esc(label)+'</label>'+inputHTML+'</div>';
  }

  function numInput(key, value, min, max) {
    return '<input class="settings-input" type="number" min="'+min+'" max="'+max+'" value="'+value+'" oninput="MT.settings.updateGoal(\''+key+'\', this.value)">';
  }

  function incInput(key, idx, value) {
    return '<input type="number" value="'+value+'" oninput="MT.settings.updateIncrement(\''+key+'\', '+idx+', this.value)">';
  }

  function renderMealsSection() {
    var list = draft.meals[currentTab] || [];
    var h = '<div class="settings-section">' +
      '<div class="settings-section-title">🍽️ 菜單編輯</div>' +
      '<div class="sub-tabs">' +
        '<button class="sub-tab '+(currentTab==='train'?'active':'')+'" onclick="MT.settings.switchTab(\'train\')">🔥 訓練日 ('+draft.meals.train.length+')</button>' +
        '<button class="sub-tab '+(currentTab==='rest'?'active':'')+'" onclick="MT.settings.switchTab(\'rest\')">😴 休息日 ('+draft.meals.rest.length+')</button>' +
      '</div>';
    list.forEach(function(m, idx) {
      h += mealEditor(m, idx);
    });
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
    var t = draft.macros.train, r = draft.macros.rest;
    return '<div class="settings-section">' +
      '<div class="settings-section-title">📊 營養概估</div>' +
      '<div style="font-size:11px;color:var(--text-dim);margin-bottom:8px">🔥 訓練日</div>' +
      row('熱量', macroInput('train', 'kcal', t.kcal)) +
      row('碳水', macroInput('train', 'carbs', t.carbs)) +
      row('蛋白', macroInput('train', 'protein', t.protein)) +
      row('脂肪', macroInput('train', 'fat', t.fat)) +
      '<div style="font-size:11px;color:var(--text-dim);margin:10px 0 8px">😴 休息日</div>' +
      row('熱量', macroInput('rest', 'kcal', r.kcal)) +
      row('碳水', macroInput('rest', 'carbs', r.carbs)) +
      row('蛋白', macroInput('rest', 'protein', r.protein)) +
      row('脂肪', macroInput('rest', 'fat', r.fat)) +
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
        '每日飲食追蹤 · v3<br>' +
        '資料僅儲存在本機 localStorage<br>' +
        '換機或清除瀏覽器資料前請先匯出' +
      '</div>' +
    '</div>';
  }

  // ---- 更新函式 ----
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
  function updateMeal(idx, key, v) {
    draft.meals[currentTab][idx][key] = v;
    MT.storage.saveSettings(draft);
  }
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
  function updateMacro(day, key, v) {
    draft.macros[day][key] = v;
    MT.storage.saveSettings(draft);
  }
  function updateCardio(key, v) {
    draft.cardio[key] = v;
    MT.storage.saveSettings(draft);
  }

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
    render();
    MT.app.toast('已還原預設');
  }

  function clearAll() {
    if (!confirm('⚠️ 清除全部紀錄與設定，無法還原！')) return;
    if (!confirm('再次確認：真的清除全部資料？')) return;
    MT.storage.clearAll();
    draft = JSON.parse(JSON.stringify(MT.storage.loadSettings()));
    render();
    MT.app.toast('已清除');
  }

  return {
    open: open, close: close,
    switchTab: switchTab,
    updateGoal: updateGoal, updateIncrement: updateIncrement,
    updateMeal: updateMeal, addMeal: addMeal, deleteMeal: deleteMeal, moveMeal: moveMeal,
    updateMacro: updateMacro, updateCardio: updateCardio,
    exportData: exportData, importData: importData,
    resetSettings: resetSettings, clearAll: clearAll
  };
})();
