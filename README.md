# 🍽️ 每日飲食追蹤 (Meal Tracker)

訓練日 / 休息日菜單、飲水、鹽攝取的每日打卡 PWA，可安裝到 iPhone 當原生 App 使用。

---

## ✨ 功能

- 🔥 訓練日 / 😴 休息日 菜單切換
- 💧 飲水、🧂 鹽攝取 即時追蹤與進度條
- ✅ 每餐勾選 + 練後有氧打卡
- 📅 近 7 天完成率 + 歷史日期回看
- ⚙️ 可編輯菜單、目標、營養概估、快捷按鈕
- 📤 JSON 匯出 / 匯入（換機備份）
- 📴 離線可用（Service Worker）
- 🎨 支援 iPhone 17 Dynamic Island / safe area

---

## 📁 專案結構

```
meal-tracker/
├── index.html              # 主頁
├── manifest.json           # PWA manifest
├── sw.js                   # Service Worker（離線 cache）
├── css/styles.css
├── js/
│   ├── data.js             # 預設菜單與目標
│   ├── storage.js          # localStorage + 匯出入
│   ├── render.js           # UI 渲染
│   ├── settings.js         # 設定頁
│   └── app.js              # 主控制器
├── icons/
│   ├── icon.svg            # SVG 源
│   ├── icon-*.png          # 用產生器產生
│   └── apple-touch-icon.png
├── scripts/
│   └── generate-icons.html # 在瀏覽器開一次，產生所有 PNG
├── capacitor.config.json   # Capacitor 設定（路線 B）
├── package.json            # Capacitor 依賴與腳本
└── README.md
```

---

## 🚀 快速開始

### 1. 產生 App Icon

PNG icon 是 iOS 加入主畫面必需。只要做一次：

```bash
cd meal-tracker
python3 -m http.server 8000
```

瀏覽器打開 http://localhost:8000/scripts/generate-icons.html
→ 按「⬇️ 下載全部 PNG」
→ 把下載下來的 5 個 PNG 搬到 `icons/` 目錄。

### 2. 本地啟動

```bash
python3 -m http.server 8000 --bind 0.0.0.0
```

---

## 📱 路線 A：PWA 安裝（推薦，不用 Xcode）

**前置**：Mac 跟 iPhone 連同一個 Wi-Fi。

1. Mac 跑 `npm run serve`（或上面 `python3 -m http.server`）
2. 在 Mac 執行 `ipconfig getifaddr en0`（或 `npm run ip`）取得 IP，例如 `192.168.1.23`
3. iPhone **Safari** 開 `http://192.168.1.23:8000`
4. 點分享 → 「加入主畫面」
5. 圖示出現後即可全螢幕使用，斷網也能用

> ⚠️ iOS 的 Service Worker 只在 https 或 localhost 啟用，區網 http 會註冊失敗但**不影響功能**（只是少了離線 cache）。
> 要完整離線，推薦把整個資料夾丟到 **GitHub Pages / Netlify / Cloudflare Pages**（免費），就會自動有 https。

### 永久方案：丟上 GitHub Pages

```bash
cd meal-tracker
git init
git add .
git commit -m "initial"
# 建好 GitHub repo 後：
git remote add origin git@github.com:<你>/meal-tracker.git
git push -u origin main
```
接著在 repo Settings → Pages → 選 `main` branch → 發布。

---

## 🔧 路線 B：Capacitor + Xcode（真·原生 App）

**前置**：
- macOS
- Xcode（App Store 下載）
- Node.js 18+
- 免費 Apple ID（可 sideload 但每 7 天要重新簽）或付費 Apple Developer（$99/年，可安裝一年）

**步驟**：

```bash
cd meal-tracker
npm install
npm run cap:init     # 首次
npm run cap:add-ios  # 首次
npm run cap:sync
npm run cap:open     # 開啟 Xcode
```

Xcode 中：

1. Signing & Capabilities → 選你的 Apple ID team
2. Bundle Identifier 若衝突改為 `com.<你>.mealtracker`
3. iPhone USB 連接 Mac（第一次需要設定「信任」）
4. 選擇你的 iPhone 為 Run Destination
5. 按 ▶️ Run

iPhone 上第一次會要到「設定 → 一般 → VPN 與裝置管理」信任開發者憑證。

> 每次改 HTML/CSS/JS 後執行 `npm run cap:sync` 再 Run。

---

## ⚙️ 設定頁功能

點右上齒輪進入：

- **🎯 每日目標**：飲水 / 鹽 的目標值、快捷按鈕數值
- **🍽️ 菜單編輯**：訓練/休息日各自新增、編輯、排序、刪除
- **📊 營養概估**：熱量、碳水、蛋白、脂肪文字
- **🏃 有氧**：啟用 / 停用與顯示文字
- **💾 資料**：JSON 匯出入、還原預設菜單、清除全部

---

## 💾 資料儲存

- 全部存 `localStorage`
- 每日紀錄保留 **60 天**（超過自動刪除最舊）
- 設定獨立儲存（不會被「清除紀錄」影響除非你選「清除全部」）
- 換手機：設定頁 → 匯出 JSON → AirDrop 給新機 → 匯入

---

## 🐛 疑難排解

| 問題 | 解法 |
|---|---|
| Safari 加入主畫面後 icon 是空白 | 先跑 icon 產生器把 PNG 產出放到 `icons/` |
| iPhone 連不上 Mac 的 server | 確認同 Wi-Fi；Mac 防火牆允許 Python；用 `en0` 的 IP |
| Capacitor build 失敗 Pods | `cd ios/App && pod install` |
| 修改後 iPhone PWA 沒更新 | 雙擊 Home Screen 圖示 → 滑掉重開；或刪除主畫面圖示重新加入 |
| localStorage 滿了 | 匯出 JSON → 設定頁「清除全部」→ 再匯入 |

---

## 📜 授權

個人使用，隨意改。
