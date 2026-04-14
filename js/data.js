// 預設資料 — 使用者可透過設定頁面覆寫，儲存在 localStorage
window.MT = window.MT || {};

MT.defaults = {
  goals: {
    water: 7000,      // ml
    salt: 10,         // g
    waterIncrements: [250, 500, -250],
    saltIncrements: [1, 2, -1]
  },
  meals: {
    train: [
      { id: 't1', name: '第一餐', items: '米糊 100g・香蕉 50g・水解乳清 30g・杏仁醬 25g', note: '', tag: false },
      { id: 't2', name: '第二餐', items: '生米 100g・雞胸/瘦牛 75g・橄欖油 5g', note: '', tag: false },
      { id: 't3', name: '⭐ 練前餐', items: '米糊 50g・香蕉 50g', note: '吃完後開始訓練', tag: true },
      { id: 't4', name: '⭐ 練後餐', items: '玉米片 50g・水解乳清 30g', note: '吃完 45 分鐘後才吃正餐', tag: true },
      { id: 't5', name: '第三餐', items: '生米 75g・雞胸/瘦牛 75g・橄欖油 5g', note: '', tag: false },
      { id: 't6', name: '第四餐', items: '生米 50g・生鮭魚 75g', note: '', tag: false }
    ],
    rest: [
      { id: 'r1', name: '第一餐', items: '米糊 50g・香蕉 50g・水解乳清 30g・杏仁醬 25g', note: '', tag: false },
      { id: 'r2', name: '第二餐', items: '生米 50g・雞胸/瘦牛 100g・橄欖油 5g', note: '', tag: false },
      { id: 'r3', name: '第三餐', items: '生米 50g・雞胸/瘦牛 100g・橄欖油 5g', note: '', tag: false },
      { id: 'r4', name: '第四餐', items: '生米 50g・生鮭魚 100g・橄欖油 5g', note: '', tag: false },
      { id: 'r5', name: '第五餐', items: '乳清 30g', note: '', tag: false }
    ]
  },
  macros: {
    train: { kcal: '~2,500', carbs: '363g', protein: '~155g', fat: '~45g' },
    rest:  { kcal: '~2,000', carbs: '174g', protein: '~175g', fat: '~55g' }
  },
  cardio: { enabled: true, text: '練後有氧 25 分鐘｜心律 120-130' },

  // v4: 外觀
  theme: 'auto',            // auto / dark / light

  // v4: 體重
  weight: {
    unit: 'kg',             // kg / lb
    precision: 0.1,         // 0.1 / 0.5 / 1
    target: null,           // number | null（無目標）
    showAverages: true
  },

  // v4: 週報與統計
  weekStart: 1,             // 1=週一, 0=週日
  weeklyReportLocation: 'both',  // main / stats / both

  // v4: 完美日 / 達標日門檻（比例 0-1）
  thresholds: {
    perfectWater: 1.0,
    perfectSalt: 0.8,
    perfectMeals: 1.0,
    goalWater: 0.7,
    goalSalt: 0.8,
    goalMeals: 0.8
  }
};
