#!/usr/bin/env node

/**
 * keiba-data-sharedから予想・結果データを取得する
 *
 * 使い方:
 *   node scripts/fetch-from-keiba-data-shared.js
 *
 * 機能:
 *   - ローカルのkeiba-data-sharedから最新の予想・結果データを取得
 *   - test-data/ディレクトリに保存
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// パス設定
const KEIBA_DATA_SHARED_PATH = '/Users/apolon/Projects/keiba-data-shared';
const OUTPUT_DIR = path.join(__dirname, '../test-data');

// 出力ディレクトリ作成
if (!fs.existsSync(OUTPUT_DIR)) {
  fs.mkdirSync(OUTPUT_DIR, { recursive: true });
}

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
 * 指定日付の予想データを取得
 */
function fetchPredictionData(date) {
  const [year, month] = date.split('-');
  const filePath = path.join(
    KEIBA_DATA_SHARED_PATH,
    'nankan/predictions',
    year,
    month,
    `${date}.json`
  );

  if (!fs.existsSync(filePath)) {
    console.warn(`⚠️ 予想データが見つかりません: ${filePath}`);
    return null;
  }

  const data = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
  console.log(`✅ 予想データ取得: ${date}`);
  return data;
}

/**
 * 指定日付の結果データを取得
 */
function fetchResultData(date) {
  const [year, month] = date.split('-');
  const filePath = path.join(
    KEIBA_DATA_SHARED_PATH,
    'nankan/results',
    year,
    month,
    `${date}.json`
  );

  if (!fs.existsSync(filePath)) {
    console.warn(`⚠️ 結果データが見つかりません: ${filePath}`);
    return null;
  }

  const data = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
  console.log(`✅ 結果データ取得: ${date}`);
  return data;
}

/**
 * メイン処理
 */
function main() {
  console.log('🚀 keiba-data-sharedからデータ取得開始...\n');

  const today = getTodayDate();
  console.log(`📅 対象日: ${today}\n`);

  // 予想データ取得
  const predictionData = fetchPredictionData(today);
  if (predictionData) {
    const outputPath = path.join(OUTPUT_DIR, `prediction-${today}.json`);
    fs.writeFileSync(outputPath, JSON.stringify(predictionData, null, 2));
    console.log(`💾 予想データ保存: ${outputPath}\n`);
  }

  // 結果データ取得
  const resultData = fetchResultData(today);
  if (resultData) {
    const outputPath = path.join(OUTPUT_DIR, `result-${today}.json`);
    fs.writeFileSync(outputPath, JSON.stringify(resultData, null, 2));
    console.log(`💾 結果データ保存: ${outputPath}\n`);
  }

  console.log('✅ データ取得完了！');
}

main();
