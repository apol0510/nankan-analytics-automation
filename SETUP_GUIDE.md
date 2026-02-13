# セットアップガイド

## 🚀 完全自動化システムのセットアップ手順

このガイドに従って、nankan-analytics完全自動化システムをセットアップします。

---

## ステップ1: GitHubリポジトリ確認 ✅

**リポジトリURL**: https://github.com/apol0510/nankan-analytics-automation

- [x] リポジトリ作成済み
- [x] コード全プッシュ済み

---

## ステップ2: Netlifyサイト作成

### 2-1. Netlifyにログイン

1. https://app.netlify.com にアクセス
2. GitHubアカウントでログイン

### 2-2. 新しいサイトをインポート

1. 「Add new site」ボタンをクリック
2. 「Import an existing project」を選択
3. 「Deploy with GitHub」を選択
4. リポジトリ検索: `nankan-analytics-automation`
5. リポジトリを選択

### 2-3. ビルド設定（自動検出されます）

```
Site name: nankan-analytics-automation
Base directory: site
Build command: npm run build
Publish directory: dist
```

6. 「Deploy nankan-analytics-automation」をクリック

### 2-4. デプロイ完了確認

- デプロイ完了までに約2-3分
- デプロイ完了後、URLが生成されます
- 例: https://nankan-analytics-automation.netlify.app

---

## ステップ3: GitHub Personal Access Token作成

### 3-1. GitHubでToken生成

1. GitHub → 右上プロフィール → **Settings**
2. 左メニュー → **Developer settings**
3. **Personal access tokens** → **Tokens (classic)**
4. 「Generate new token」→ **「Generate new token (classic)」**
5. Note: `nankan-analytics-automation`
6. Expiration: **No expiration** （または1年）
7. Scopes: **`repo` (Full control of private repositories)** にチェック ✅
8. 「Generate token」をクリック
9. **トークンをコピー**: `ghp_xxxxxxxxxxxxxxxxxxxxxxxx`

**⚠️ 重要**: トークンは一度しか表示されません。必ずコピーしてください。

---

## ステップ4: Netlify環境変数設定

### 4-1. Netlifyダッシュボードで設定

1. Netlify → Sites → `nankan-analytics-automation`
2. **Site settings** → **Environment variables**
3. 「Add a variable」をクリック
4. 以下を入力:

```
Key: GITHUB_TOKEN
Value: ghp_xxxxxxxxxxxxxxxxxxxxxxxx （先ほどコピーしたトークン）
Scopes: All scopes
```

5. 「Create variable」をクリック

### 4-2. 再デプロイ

1. Deploys タブに戻る
2. 「Trigger deploy」→ 「Deploy site」
3. 環境変数が反映されます

---

## ステップ5: GitHub Actions設定

### 5-1. GitHub Actions有効化

1. GitHub → `nankan-analytics-automation` リポジトリ
2. **Settings** → **Actions** → **General**
3. **Actions permissions**:
   - ✅ **Allow all actions and reusable workflows**
4. **Workflow permissions**:
   - ✅ **Read and write permissions**
5. 「Save」をクリック

### 5-2. GitHub Actions Secret設定

1. **Settings** → **Secrets and variables** → **Actions**
2. 「New repository secret」をクリック
3. 以下を入力:

```
Name: GITHUB_TOKEN
Secret: ghp_xxxxxxxxxxxxxxxxxxxxxxxx （同じトークン）
```

4. 「Add secret」をクリック

### 5-3. ワークフローファイル追加（GitHub UI）

1. GitHub → `nankan-analytics-automation` リポジトリ
2. **Actions** タブ
3. 「set up a workflow yourself」をクリック
4. ファイル名: `.github/workflows/auto-deploy-results.yml`
5. 以下のコードをペースト:

```yaml
name: Auto Deploy Results

on:
  schedule:
    - cron: '0 14 * * *'  # 毎日23:00 JST (14:00 UTC)
  workflow_dispatch:  # 手動実行も可能

jobs:
  deploy:
    runs-on: ubuntu-latest

    steps:
      - name: Checkout automation repo
        uses: actions/checkout@v3

      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '18'

      - name: Clone keiba-data-shared
        run: |
          git clone https://github.com/apol0510/keiba-data-shared.git

      - name: Clone nankan-analytics
        env:
          GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}
        run: |
          git clone https://x-access-token:${{ secrets.GITHUB_TOKEN }}@github.com/apol0510/nankan-analytics.git

      - name: Install dependencies
        run: npm install

      - name: Generate results
        run: npm run generate:results

      - name: Deploy to nankan-analytics
        env:
          GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}
        run: |
          # 今日の日付取得
          DATE=$(date +%Y-%m-%d)

          # 結果ファイル確認
          if [ ! -f "output/archiveResults-$DATE.json" ]; then
            echo "❌ 結果データが見つかりません"
            exit 1
          fi

          # nankan-analyticsに移動
          cd nankan-analytics/astro-site

          # Git設定
          git config user.email "noreply@anthropic.com"
          git config user.name "Claude Code"

          # 新しいデータをマージ（Node.jsスクリプトで実行）
          node -e "
            const fs = require('fs');
            const path = require('path');

            const sourceFile = '../../output/archiveResults-$DATE.json';
            const targetFile = 'src/data/archiveResults.json';

            let existingData = {};
            if (fs.existsSync(targetFile)) {
              existingData = JSON.parse(fs.readFileSync(targetFile, 'utf-8'));
            }

            const newData = JSON.parse(fs.readFileSync(sourceFile, 'utf-8'));
            const [year, month, day] = '$DATE'.split('-');

            if (!existingData[year]) existingData[year] = {};
            if (!existingData[year][month]) existingData[year][month] = {};
            existingData[year][month][day] = newData[year][month][day];

            fs.writeFileSync(targetFile, JSON.stringify(existingData, null, 2));
            fs.copyFileSync(targetFile, 'public/data/archiveResults.json');

            console.log('✅ マージ完了');
          "

          # Git add
          git add src/data/archiveResults.json public/data/archiveResults.json

          # Git commit
          git commit -m "📊 結果データ自動更新・$DATE

🤖 Generated with [Claude Code](https://claude.com/claude-code)

Co-Authored-By: Claude <noreply@anthropic.com>"

          # Git push
          git push origin main

          echo "✅ デプロイ完了！Netlify自動ビルド開始"

      - name: Notify success
        if: success()
        run: |
          DATE=$(date +%Y-%m-%d)
          echo "✅ $DATE の結果データデプロイ完了"

      - name: Notify failure
        if: failure()
        run: |
          DATE=$(date +%Y-%m-%d)
          echo "❌ $DATE の結果データデプロイ失敗"
```

6. 「Commit changes」をクリック

---

## ステップ6: 動作テスト

### 6-1. 管理ダッシュボードテスト

1. https://nankan-analytics-automation.netlify.app にアクセス
2. 「結果生成実行」ボタンをクリック
3. ログを確認:
   ```
   📅 対象日: 2026-02-XX
   ✅ データ取得完了
   ✅ 的中: X/12R | 配当: XXXXX円
   ```
4. 「自動デプロイ実行」ボタンをクリック
5. ログを確認:
   ```
   ✅ プッシュ完了！Netlify自動ビルド開始
   ```

### 6-2. GitHub Actions手動実行テスト

1. GitHub → `nankan-analytics-automation` → **Actions**
2. 「Auto Deploy Results」ワークフローを選択
3. 「Run workflow」→ 「Run workflow」をクリック
4. 実行ログを確認

---

## ✅ セットアップ完了チェックリスト

- [ ] Netlifyサイト作成完了
- [ ] Netlify環境変数 `GITHUB_TOKEN` 設定完了
- [ ] GitHub Actions有効化完了
- [ ] GitHub Actions Secret `GITHUB_TOKEN` 設定完了
- [ ] ワークフローファイル追加完了
- [ ] 管理ダッシュボード動作確認完了
- [ ] GitHub Actions手動実行テスト完了

---

## 🎉 完成！

すべてのチェックが完了したら、以下が自動的に実行されます：

**毎日23:00 JST:**
```
GitHub Actions起動
  ↓
keiba-data-shared取得
  ↓
結果生成・的中判定
  ↓
nankan-analyticsへプッシュ
  ↓
Netlify自動ビルド
```

---

## 🔍 監視・確認方法

### Netlify Functions ログ
- Netlify → `nankan-analytics-automation` → **Functions** タブ
- `generate-results` と `auto-deploy` の実行ログ確認

### GitHub Actions ログ
- GitHub → `nankan-analytics-automation` → **Actions** タブ
- 各実行のログ確認

### nankan-analytics デプロイ確認
- https://app.netlify.com/sites/nankan-analytics/deploys
- 自動ビルドが開始されているか確認

---

## ⚠️ トラブルシューティング

### 「GITHUB_TOKEN環境変数が設定されていません」エラー
- Netlify環境変数で `GITHUB_TOKEN` が設定されているか確認
- 再デプロイして環境変数を反映

### GitHub Actions が「refusing to allow an OAuth App」エラー
- GitHub Actions Settingsで「Read and write permissions」が有効か確認
- `GITHUB_TOKEN` Secretが設定されているか確認

### 「結果データが見つかりません」エラー
- keiba-data-sharedに該当日のデータが存在するか確認
- `scripts/generate-results.js` の日付設定を確認

---

**サポート**: 問題が解決しない場合は、GitHub Issuesで報告してください。
