#!/usr/bin/env node

/**
 * nankan-analytics自動デプロイスクリプト
 *
 * 使い方:
 *   node scripts/auto-deploy.js [prediction|results] [YYYY-MM-DD]
 *
 * 例:
 *   node scripts/auto-deploy.js results 2026-02-12
 *   node scripts/auto-deploy.js prediction (今日の日付)
 *
 * 機能:
 *   - 生成したJSONファイルをnankan-analyticsにコピー
 *   - Git add, commit, push
 *   - Netlify自動デプロイ
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { execSync } from 'child_process';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const OUTPUT_DIR = path.join(__dirname, '../output');
const NANKAN_ANALYTICS_PATH = '/Users/apolon/Projects/nankan-analytics/astro-site';

/**
 * 今日の日付を YYYY-MM-DD 形式で取得
 */
function getTodayDate() {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * コマンド実行（エラーハンドリング付き）
 */
function runCommand(command, cwd = NANKAN_ANALYTICS_PATH) {
  try {
    console.log(`\n💻 実行: ${command}`);
    const output = execSync(command, { cwd, encoding: 'utf-8' });
    if (output) {
      console.log(output);
    }
    return true;
  } catch (error) {
    console.error(`❌ エラー: ${error.message}`);
    return false;
  }
}

/**
 * 予想データのデプロイ
 */
function deployPrediction(date) {
  console.log('\n🔮 === 予想データデプロイ ===');

  const sourceFile = path.join(OUTPUT_DIR, `allRacesPrediction-${date}.json`);

  if (!fs.existsSync(sourceFile)) {
    console.log(`⚠️ 予想データが見つかりません: ${sourceFile}`);
    return false;
  }

  // src/data/にコピー
  const destFile = path.join(NANKAN_ANALYTICS_PATH, 'src/data/allRacesPrediction.json');
  fs.copyFileSync(sourceFile, destFile);
  console.log(`✅ コピー完了: src/data/allRacesPrediction.json`);

  // public/data/にコピー
  const publicDestFile = path.join(NANKAN_ANALYTICS_PATH, 'public/data/allRacesPrediction.json');
  fs.copyFileSync(sourceFile, publicDestFile);
  console.log(`✅ コピー完了: public/data/allRacesPrediction.json`);

  return true;
}

/**
 * 結果データのデプロイ
 */
function deployResults(date) {
  console.log('\n📊 === 結果データデプロイ ===');

  const sourceFile = path.join(OUTPUT_DIR, `archiveResults-${date}.json`);

  if (!fs.existsSync(sourceFile)) {
    console.log(`⚠️ 結果データが見つかりません: ${sourceFile}`);
    return false;
  }

  // 既存のarchiveResults.jsonを読み込み
  const archiveFile = path.join(NANKAN_ANALYTICS_PATH, 'src/data/archiveResults.json');
  let existingData = {};

  if (fs.existsSync(archiveFile)) {
    existingData = JSON.parse(fs.readFileSync(archiveFile, 'utf-8'));
  }

  // 新しいデータを読み込み
  const newData = JSON.parse(fs.readFileSync(sourceFile, 'utf-8'));

  // マージ（新しいデータで上書き）
  const [year, month, day] = date.split('-');
  if (!existingData[year]) existingData[year] = {};
  if (!existingData[year][month]) existingData[year][month] = {};
  existingData[year][month][day] = newData[year][month][day];

  // src/data/に保存
  fs.writeFileSync(archiveFile, JSON.stringify(existingData, null, 2));
  console.log(`✅ マージ完了: src/data/archiveResults.json`);

  // public/data/にコピー
  const publicArchiveFile = path.join(NANKAN_ANALYTICS_PATH, 'public/data/archiveResults.json');
  fs.copyFileSync(archiveFile, publicArchiveFile);
  console.log(`✅ コピー完了: public/data/archiveResults.json`);

  return true;
}

/**
 * Git コミット・プッシュ
 */
function gitCommitAndPush(type, date) {
  console.log('\n🚀 === Git コミット・プッシュ ===');

  // Git add
  const files = [
    'src/data/allRacesPrediction.json',
    'public/data/allRacesPrediction.json',
    'src/data/archiveResults.json',
    'public/data/archiveResults.json'
  ];

  if (!runCommand(`git add ${files.join(' ')}`)) {
    return false;
  }

  // コミットメッセージ生成
  let commitMessage = '';
  if (type === 'prediction') {
    commitMessage = `🔮 予想データ自動更新・${date}

🤖 Generated with [Claude Code](https://claude.com/claude-code)

Co-Authored-By: Claude <noreply@anthropic.com>`;
  } else if (type === 'results') {
    commitMessage = `📊 結果データ自動更新・${date}

🤖 Generated with [Claude Code](https://claude.com/claude-code)

Co-Authored-By: Claude <noreply@anthropic.com>`;
  }

  // Git commit
  if (!runCommand(`git commit -m "${commitMessage}"`)) {
    console.log('⚠️ コミット失敗（変更なしの可能性）');
    return false;
  }

  // Git push
  if (!runCommand('git push origin main')) {
    return false;
  }

  console.log('✅ Git push完了！Netlify自動デプロイ開始');
  return true;
}

/**
 * メイン処理
 */
function main() {
  console.log('🚀 nankan-analytics自動デプロイ開始...\n');

  // 処理タイプ選択（コマンドライン引数から）
  const args = process.argv.slice(2);
  const type = args[0] || 'prediction'; // デフォルトは予想
  const targetDate = args[1] || getTodayDate(); // 日付指定（デフォルトは今日）

  console.log(`📅 対象日: ${targetDate}\n`);

  let success = false;

  if (type === 'prediction') {
    success = deployPrediction(targetDate);
  } else if (type === 'results') {
    success = deployResults(targetDate);
  } else {
    console.error('❌ 無効な処理タイプ。"prediction" または "results" を指定してください。');
    process.exit(1);
  }

  if (!success) {
    console.error('❌ デプロイ失敗');
    process.exit(1);
  }

  // Git コミット・プッシュ
  if (!gitCommitAndPush(type, targetDate)) {
    console.error('❌ Git push失敗');
    process.exit(1);
  }

  console.log('\n✅ 自動デプロイ完了！');
}

main();
