# レッド＆グリーン・エクササイズ記録アプリ

日々の活動をグリーン/レッドに分類してエネルギー状態を可視化し、週次の強み・弱み分析とリフレクションを支援するPWA対応の静的Webアプリです。

## 主な機能
- 日次入力: 活動タイプ、エネルギー指標、タグ、所要時間、メモを1ステップで記録
- 履歴ビュー: 期間/タイプ/エネルギー/キーワードでフィルタし、編集・削除が可能
- 週次ビュー: グリーン・ベスト5 / レッド・ワースト5 選定、強み・弱みメモ、週次リフレクション
- ダッシュボード: 平均スコア、グリーン比率、タグ別集計などをローカル計算で可視化
- データ保存: IndexedDB（`rgx-db`）に完全ローカル保存。JSON/CSVエクスポートとJSONインポート対応
- PWA: オフライン利用、ホーム画面追加、プリキャッシュ、インストールプロンプト

## 技術スタック
- HTML / CSS / JavaScript (ES Modules)
- IndexedDB API（独自ラッパ）
- Service Worker + Web App Manifest
- テスト: Playwright E2E

## ディレクトリ構成
```
├─ index.html
├─ styles/
│  └─ main.css
├─ scripts/
│  ├─ app.js
│  ├─ state.js
│  ├─ db.js
│  ├─ data-service.js
│  ├─ utils/
│  │  ├─ date.js
│  │  └─ dom.js
│  └─ ui/
│     ├─ home.js
│     ├─ history.js
│     ├─ weekly.js
│     ├─ dashboard.js
│     ├─ settings.js
│     └─ entry-modal.js
├─ assets/icons/
│  ├─ icon-192.png
│  └─ icon-512.png
├─ manifest.webmanifest
├─ service-worker.js
├─ package.json
├─ playwright.config.ts
└─ tests/e2e/main.spec.ts
```

## セットアップ
1. Node.js 18 以上をインストールしてください。
2. 依存関係をインストール：
   ```bash
   npm install
   ```
3. 開発サーバを起動：（`http://127.0.0.1:4173` に配信）
   ```bash
   npm start
   ```
   `http-server` を利用したシンプルな静的配信です。ブラウザでアクセスするとアプリが動作します。

## PWA とオフライン対応
- 初回アクセス後は Service Worker が静的アセットをプリキャッシュします。
- ブラウザの「インストール」またはアプリ内の「インストール」ボタンからホーム画面に追加できます。
- オフライン時も IndexedDB に保存されたデータを参照・更新できます。

## データバックアップ / 復元
- 設定画面から JSON/CSV エクスポートが可能です。
- インポートは JSON のみ対応。既存IDは上書き、未登録は追加入力として保存されます。
- サーバ連携はありません。必要に応じて手動でバックアップしてください。

## テスト
- Playwright を使用したE2Eテストを用意しています。
  ```bash
  npm test
  ```
  テスト実行時は自動で `npm start` が立ち上がり、主要な入力フローを検証します。

## 開発メモ / TODO
- ローカル通知のスケジューリング（Service Worker での通知計画）は未実装。権限付与のみ行います。
- ダッシュボードのグラフは簡易表示です。必要に応じて描画ライブラリ導入を検討してください。
- 週次選定のロック状態は `weekly_selections` ストアの `locked` フィールドで管理しています。

ご要望に合わせて機能拡張（AIサジェスト、カレンダー連携など）も追加しやすい構成です。
