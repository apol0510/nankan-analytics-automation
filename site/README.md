# nankan-analytics 管理ダッシュボード

このディレクトリは、nankan-analytics-automation の管理ダッシュボード（Netlifyサイト）です。

## 🌐 本番サイト

**URL**: https://nankan-analytics-automation.netlify.app

## 🎯 機能

### 管理ダッシュボード (`src/pages/index.astro`)
- ✅ 結果生成・的中判定（ワンクリック）
- ✅ 自動デプロイ実行（ワンクリック）
- ✅ リアルタイムログ表示
- ✅ デプロイ状況確認

### Netlify Functions (`netlify/functions/`)

#### 1. `generate-results.mjs`
- keiba-data-sharedから結果データ取得
- 馬単的中判定（双方向軸流し方式）
- アーカイブJSON生成

**API Endpoint**: `/.netlify/functions/generate-results`

**レスポンス例:**
```json
{
  "success": true,
  "hitRaces": 7,
  "totalRaces": 12,
  "totalPayout": 33720,
  "recoveryRate": 234,
  "log": "📅 対象日: 2026-02-12\n✅ 的中: 7/12R..."
}
```

#### 2. `auto-deploy.mjs`
- nankan-analyticsリポジトリをクローン
- archiveResults.jsonにマージ
- Git commit & push
- Netlify自動ビルド開始

**API Endpoint**: `/.netlify/functions/auto-deploy`

**レスポンス例:**
```json
{
  "success": true,
  "log": "📅 対象日: 2026-02-12\n✅ プッシュ完了..."
}
```

---

## 🚀 プロジェクト構造

```
site/
├── netlify/
│   └── functions/
│       ├── generate-results.mjs    # 結果生成API
│       └── auto-deploy.mjs         # 自動デプロイAPI
├── src/
│   └── pages/
│       └── index.astro             # 管理ダッシュボード
├── public/
│   ├── favicon.ico
│   └── favicon.svg
├── netlify.toml                    # Netlify設定
├── package.json
└── README.md
```

---

## 🧞 コマンド

| コマンド | 説明 |
|---------|------|
| `npm install` | 依存関係インストール |
| `npm run dev` | 開発サーバー起動 (`localhost:4321`) |
| `npm run build` | 本番ビルド (`./dist/`) |
| `npm run preview` | ビルドプレビュー |

---

## ⚙️ Netlify設定

### 環境変数（必須）

Netlifyダッシュボード → Site settings → Environment variables

```
GITHUB_TOKEN = ghp_xxxxxxxxxxxxxxxxxxxxxxxx
```

**用途**: nankan-analyticsリポジトリへのプッシュ権限

**作成方法**:
1. GitHub → Settings → Developer settings → Personal access tokens
2. Generate new token (classic)
3. Scopes: `repo` (Full control)

### ビルド設定

```toml
[build]
  base = "site"
  command = "npm run build"
  publish = "dist"

[functions]
  directory = "netlify/functions"
  node_bundler = "esbuild"
```

---

## 🔧 ローカル開発

### 1. 依存関係インストール
```bash
npm install
```

### 2. 開発サーバー起動
```bash
npm run dev
```

### 3. ブラウザでアクセス
```
http://localhost:4321
```

### 4. Netlify Functions ローカルテスト
```bash
netlify dev
```

**Functions Endpoint:**
- `http://localhost:8888/.netlify/functions/generate-results`
- `http://localhost:8888/.netlify/functions/auto-deploy`

---

## 📊 的中判定ロジック

### 馬単（Umatan）軸流し方式

**軸馬（Jiku）**: 本命・対抗・単穴
**ヒモ馬（Himo）**: 対抗・単穴・連下最上位・連下・補欠

**的中条件（双方向）:**
- パターン1: 軸馬が1着 AND ヒモ馬が2着
- パターン2: ヒモ馬が1着 AND 軸馬が2着

**実装**: `netlify/functions/generate-results.mjs` - `checkUmatanHit()`

---

## 🚨 トラブルシューティング

### Functions エラー

**エラー**: `GITHUB_TOKEN環境変数が設定されていません`

**解決策**:
1. Netlify環境変数で `GITHUB_TOKEN` を設定
2. 再デプロイ

---

### Functions ログ確認

Netlify → `nankan-analytics-automation` → **Functions** タブ
- `generate-results` の実行ログ
- `auto-deploy` の実行ログ

---

## 📝 開発履歴

- **2026-02-13**: 初期実装（管理ダッシュボード + Netlify Functions）

---

**作成者**: Claude Code（クロちゃん）
**協力者**: マコさん

**親リポジトリ**: https://github.com/apol0510/nankan-analytics-automation
