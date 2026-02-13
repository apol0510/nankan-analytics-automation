# nankan-analytics 完全自動化プロジェクト

## 🎯 目的

nankan-analyticsの日常更新作業（予想・結果・穴馬）を完全自動化する。

## 📋 自動化の流れ

```
keiba-data-shared（データソース）
  ↓ 自動取得
調整ロジック適用（独自アルゴリズム）
  ↓ 自動生成
nankan-analytics用データ（JSON）
  ↓ 自動コミット・プッシュ
本番サイト自動デプロイ
```

## 🚀 自動化対象

1. **予想更新（allRacesPrediction.json）**
   - keiba-data-sharedから予想データ取得
   - 調整ロジック適用
   - 自動生成・デプロイ

2. **穴馬更新（darkHorseData.json）**
   - ⚠️ 手動更新のまま（前走成績データ不足のため）

3. **結果更新（archiveResults.json）**
   - keiba-data-sharedから結果データ取得
   - 的中判定・集計
   - 自動生成・デプロイ

## 📁 ディレクトリ構造

```
nankan-analytics-automation/
├── .github/
│   └── workflows/
│       └── auto-deploy-results.yml       # GitHub Actions自動デプロイ
├── scripts/
│   ├── fetch-from-keiba-data-shared.js  # データ取得
│   ├── generate-prediction.js            # 予想生成
│   ├── generate-results.js               # 結果生成
│   └── auto-deploy.js                    # 自動デプロイ
├── site/                                 # Netlify管理サイト
│   ├── netlify/
│   │   └── functions/
│   │       ├── generate-results.mjs      # 結果生成API
│   │       └── auto-deploy.mjs           # 自動デプロイAPI
│   ├── src/
│   │   └── pages/
│   │       └── index.astro               # 管理ダッシュボード
│   ├── netlify.toml                      # Netlify設定
│   └── package.json
├── test-data/                            # テスト用データ
├── output/                               # 生成結果確認用
├── netlify.toml                          # ルートNetlify設定
└── README.md
```

## ⚠️ 重要な原則

- ❌ nankan-analyticsプロジェクトに一切影響を与えない
- ✅ 完全に独立したテスト環境
- ✅ 完成後、スクリプトのみnankan-analyticsにコピー
- ✅ マコさんの承認を得てから本番適用

## 🛠️ 開発状況

- [x] Phase 1: keiba-data-sharedからのデータ取得 ✅
- [x] Phase 2: 予想生成スクリプト ✅
- [x] Phase 3: 結果判定・アーカイブ生成スクリプト ✅
- [x] Phase 4: 自動デプロイスクリプト ✅
- [x] Phase 5: GitHub Actions統合（完全自動化） ✅
- [x] Phase 6: Netlifyサイト構築（管理ダッシュボード） ✅

## 📝 使い方

### 🌐 管理ダッシュボード（推奨）

**Netlify管理サイト**: https://nankan-analytics-automation.netlify.app

**機能:**
- ✅ ワンクリックで結果生成・的中判定
- ✅ ワンクリックで自動デプロイ
- ✅ リアルタイムログ表示
- ✅ デプロイ状況確認

**使い方:**
1. 管理ダッシュボードにアクセス
2. 「結果生成実行」ボタンをクリック
3. 的中判定結果を確認
4. 「自動デプロイ実行」ボタンをクリック
5. Netlify自動ビルド開始 ✅

---

### 💻 ローカル実行（開発者向け）

#### 1. 予想データ生成
```bash
npm run generate:prediction
```
出力: `output/allRacesPrediction-YYYY-MM-DD.json`

#### 2. 結果データ生成
```bash
npm run generate:results
```
出力: `output/archiveResults-YYYY-MM-DD.json`

#### 3. 自動デプロイ
```bash
# 予想データデプロイ
npm run deploy prediction [YYYY-MM-DD]

# 結果データデプロイ
npm run deploy results [YYYY-MM-DD]
```

**例:**
```bash
# 2026-02-12の結果をデプロイ
npm run deploy results 2026-02-12

# 今日の予想をデプロイ（日付省略）
npm run deploy prediction
```

**実行内容:**
- nankan-analytics/astro-site/src/data/ にコピー
- nankan-analytics/astro-site/public/data/ にコピー
- Git add, commit, push
- Netlify自動ビルド開始

---

### ⚙️ GitHub Actions（完全自動）

**スケジュール**: 毎日 23:00 JST（14:00 UTC）

**実行内容:**
1. keiba-data-shared から結果データ取得
2. 的中判定・アーカイブ生成
3. nankan-analytics へ自動デプロイ
4. Netlify自動ビルド

**手動実行:**
- GitHub Actions → "Auto Deploy Results" → "Run workflow"

**監視:**
- https://github.com/apol0510/nankan-analytics-automation/actions

## ⚙️ セットアップ

### 1. Netlifyサイト作成

1. https://app.netlify.com にアクセス
2. 「Add new site」→「Import an existing project」
3. GitHub → `nankan-analytics-automation` を選択
4. **Site name**: `nankan-analytics-automation`
5. **Base directory**: `site` （自動検出）
6. **Build command**: `npm run build` （自動検出）
7. **Publish directory**: `dist` （自動検出）
8. 「Deploy site」をクリック

### 2. 環境変数設定（重要）

Netlifyダッシュボード → Site settings → Environment variables

```
GITHUB_TOKEN = ghp_xxxxxxxxxxxxxxxxxxxxxxxx
```

**GITHUB_TOKEN作成:**
1. GitHub → Settings → Developer settings → Personal access tokens → Tokens (classic)
2. Generate new token (classic)
3. Scopes: `repo` (full control)
4. Copy token → Netlifyに貼り付け

### 3. GitHub Actions有効化

GitHub リポジトリ → Settings → Actions → General
- Actions permissions: **Allow all actions and reusable workflows**

### 4. GitHub Actions Secrets設定

GitHub リポジトリ → Settings → Secrets and variables → Actions → New repository secret

```
Name: GITHUB_TOKEN
Secret: (GitHub Personal Access Token)
```

**注意**: `GITHUB_TOKEN`はNetlifyとGitHub両方に設定必要

---

## 🔧 技術スタック

- **フロントエンド**: Astro (SSG)
- **バックエンド**: Netlify Functions (Node.js)
- **CI/CD**: GitHub Actions
- **ホスティング**: Netlify
- **データソース**: keiba-data-shared (GitHub)
- **デプロイ先**: nankan-analytics (GitHub → Netlify)

---

## 🎯 運用フロー

### パターンA: 管理ダッシュボード（手動実行）
```
https://nankan-analytics-automation.netlify.app
  ↓ 「結果生成実行」ボタンクリック
的中判定完了（7/12R, 33,720円など）
  ↓ 「自動デプロイ実行」ボタンクリック
nankan-analyticsへプッシュ
  ↓
Netlify自動ビルド
```

### パターンB: GitHub Actions（完全自動）
```
毎日23:00 JST
  ↓ 自動実行
keiba-data-shared取得
  ↓
結果生成・的中判定
  ↓
nankan-analyticsへ自動プッシュ
  ↓
Netlify自動ビルド
```

---

## 🚨 トラブルシューティング

### Netlify Functions エラー
- Netlify Functions タブでログ確認
- `GITHUB_TOKEN` 環境変数が設定されているか確認

### GitHub Actions 失敗
- Actions タブでログ確認
- `GITHUB_TOKEN` Secretが設定されているか確認
- keiba-data-sharedに該当日のデータが存在するか確認

### デプロイ失敗
- nankan-analyticsリポジトリへのアクセス権限確認
- `GITHUB_TOKEN`のスコープに`repo`が含まれているか確認

---

## 📊 的中判定ロジック

### 馬単（Umatan）軸流し方式

**軸馬（Jiku）**: 本命・対抗・単穴
**ヒモ馬（Himo）**: 対抗・単穴・連下最上位・連下・補欠

**的中条件（双方向）:**
- パターン1: 軸馬が1着 AND ヒモ馬が2着
- パターン2: ヒモ馬が1着 AND 軸馬が2着

**実績:**
- 2026-02-12: 7/12R的中, 33,720円, 回収率234% ✅

---

## 📝 開発履歴

- **2026-02-12**: Phase 1-4完成（スクリプト基盤）
- **2026-02-13**: Phase 5-6完成（Netlify管理サイト + GitHub Actions）

---

**作成日**: 2026-02-12
**最終更新**: 2026-02-13
**作成者**: Claude Code（クロちゃん）
**協力者**: マコさん

**リポジトリ**: https://github.com/apol0510/nankan-analytics-automation
**管理サイト**: https://nankan-analytics-automation.netlify.app （セットアップ後）
