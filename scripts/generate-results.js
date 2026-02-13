#!/usr/bin/env node

/**
 * keiba-data-sharedの結果データをnankan-analytics形式に変換
 *
 * 使い方:
 *   node scripts/generate-results.js
 *
 * 機能:
 *   - keiba-data-sharedから結果データ取得
 *   - 予想データと結果を照合して的中判定
 *   - archiveResults.json形式に変換（馬単）
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const KEIBA_DATA_SHARED_PATH = '/Users/apolon/Projects/keiba-data-shared';
const TEST_DATA_DIR = path.join(__dirname, '../test-data');
const OUTPUT_DIR = path.join(__dirname, '../output');

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
  // まずtest-dataディレクトリをチェック
  const testFilePath = path.join(TEST_DATA_DIR, `prediction-${date}.json`);
  if (fs.existsSync(testFilePath)) {
    return JSON.parse(fs.readFileSync(testFilePath, 'utf-8'));
  }

  // keiba-data-sharedから取得
  const [year, month] = date.split('-');
  const filePath = path.join(
    KEIBA_DATA_SHARED_PATH,
    'nankan/predictions',
    year,
    month,
    `${date}.json`
  );

  if (!fs.existsSync(filePath)) {
    throw new Error(`予想データが見つかりません: ${filePath}`);
  }

  return JSON.parse(fs.readFileSync(filePath, 'utf-8'));
}

/**
 * 指定日付の結果データを取得
 */
function fetchResultData(date) {
  // まずtest-dataディレクトリをチェック
  const testFilePath = path.join(TEST_DATA_DIR, `result-${date}.json`);
  if (fs.existsSync(testFilePath)) {
    return JSON.parse(fs.readFileSync(testFilePath, 'utf-8'));
  }

  // keiba-data-sharedから取得
  const [year, month] = date.split('-');
  const filePath = path.join(
    KEIBA_DATA_SHARED_PATH,
    'nankan/results',
    year,
    month,
    `${date}.json`
  );

  if (!fs.existsSync(filePath)) {
    throw new Error(`結果データが見つかりません: ${filePath}`);
  }

  return JSON.parse(fs.readFileSync(filePath, 'utf-8'));
}

/**
 * 馬単軸流しの的中判定と配当取得
 *
 * 買い目パターン（assignmentベース）:
 * - 軸馬: 本命、対抗、単穴
 * - ヒモ馬: 対抗、単穴、連下最上位、連下
 *
 * 的中条件: 軸馬が1着 AND ヒモ馬が2着
 */
function checkUmatanHit(prediction, result) {
  // 軸馬候補を取得（本命・対抗・単穴）
  const jikuHorses = prediction.horses.filter(h =>
    ['本命', '対抗', '単穴'].includes(h.assignment)
  );

  // ヒモ馬候補を取得（対抗・単穴・連下最上位・連下・補欠）
  const himoHorses = prediction.horses.filter(h =>
    ['対抗', '単穴', '連下最上位', '連下', '補欠'].includes(h.assignment)
  );

  if (jikuHorses.length === 0 || himoHorses.length === 0) {
    return { hit: false, payout: 0 };
  }

  // 結果の1着・2着を取得
  const first = result.results.find(r => r.rank === 1);
  const second = result.results.find(r => r.rank === 2);

  if (!first || !second) {
    return { hit: false, payout: 0 };
  }

  // 軸馬番号リスト
  const jikuNumbers = jikuHorses.map(h => h.number);

  // ヒモ馬番号リスト
  const himoNumbers = himoHorses.map(h => h.number);

  // 的中判定:
  // パターン1: 軸馬が1着 AND ヒモ馬が2着
  // パターン2: ヒモ馬が1着 AND 軸馬が2着（逆向き）
  const pattern1 = jikuNumbers.includes(first.number) && himoNumbers.includes(second.number);
  const pattern2 = himoNumbers.includes(first.number) && jikuNumbers.includes(second.number);
  const isHit = pattern1 || pattern2;

  if (!isHit) {
    return { hit: false, payout: 0 };
  }

  // 配当取得
  const umatanPayout = result.payouts?.umatan?.find(
    p => p.combination === `${first.number}-${second.number}`
  );

  return {
    hit: true,
    payout: umatanPayout?.payout || 0
  };
}

/**
 * 結果データをnankan-analytics形式に変換
 */
function convertToArchiveFormat(predictionData, resultData, targetDate) {
  const [year, month, day] = targetDate.split('-');

  // レース結果を照合
  const races = [];
  let hitRaces = 0;
  let totalPayout = 0;
  const betPoints = 12; // 馬単1点あたりの点数（固定）

  predictionData.races.forEach((prediction) => {
    const raceNum = parseInt(prediction.raceInfo.raceNumber.replace('R', ''));
    const result = resultData.races.find(r => r.raceNumber === raceNum);

    if (!result) {
      console.warn(`⚠️ ${raceNum}Rの結果データが見つかりません`);
      races.push({
        raceNumber: prediction.raceInfo.raceNumber,
        raceName: prediction.raceInfo.raceName || '-',
        betType: '馬単',
        betPoints: betPoints,
        hit: false,
        payout: 0
      });
      return;
    }

    const { hit, payout } = checkUmatanHit(prediction, result);

    if (hit) {
      hitRaces++;
      totalPayout += payout;
    }

    races.push({
      raceNumber: prediction.raceInfo.raceNumber,
      raceName: result.raceName || prediction.raceInfo.raceName || '-',
      betType: '馬単',
      betPoints: betPoints,
      hit: hit,
      payout: payout
    });
  });

  // 回収率計算
  const totalBet = betPoints * predictionData.totalRaces;
  const recoveryRate = totalBet > 0 ? Math.round((totalPayout / totalBet) * 100) : 0;

  // 全レース的中判定
  const perfectHit = (hitRaces === predictionData.totalRaces);

  return {
    [year]: {
      [month]: {
        [day]: {
          venue: resultData.venue || predictionData.track,
          totalRaces: predictionData.totalRaces,
          hitRaces: hitRaces,
          perfectHit: perfectHit,
          totalPayout: totalPayout,
          recoveryRate: recoveryRate,
          races: races
        }
      }
    }
  };
}

/**
 * メイン処理
 */
function main() {
  console.log('🚀 結果判定・アーカイブ生成開始...\n');

  // テストデータで実行（2026-02-12）
  const testDate = '2026-02-12';
  console.log(`📅 対象日: ${testDate}\n`);

  try {
    // keiba-data-sharedからデータ取得
    const predictionData = fetchPredictionData(testDate);
    console.log(`✅ 予想データ取得成功`);
    console.log(`   競馬場: ${predictionData.track}`);
    console.log(`   レース数: ${predictionData.totalRaces}R\n`);

    const resultData = fetchResultData(testDate);
    console.log(`✅ 結果データ取得成功`);
    console.log(`   競馬場: ${resultData.venue}`);
    console.log(`   レース数: ${resultData.races.length}R\n`);

    // 結果判定・アーカイブ形式に変換
    const archiveData = convertToArchiveFormat(predictionData, resultData, testDate);
    console.log(`✅ 結果判定完了`);

    const [year, month, day] = testDate.split('-');
    const dayData = archiveData[year][month][day];
    console.log(`   的中レース: ${dayData.hitRaces}/${dayData.totalRaces}R`);
    console.log(`   総配当: ${dayData.totalPayout}円`);
    console.log(`   回収率: ${dayData.recoveryRate}%`);
    console.log(`   全レース的中: ${dayData.perfectHit ? 'YES 🎉' : 'NO'}\n`);

    // 保存
    const outputPath = path.join(OUTPUT_DIR, `archiveResults-${testDate}.json`);
    fs.writeFileSync(outputPath, JSON.stringify(archiveData, null, 2));
    console.log(`💾 出力ファイル: ${outputPath}\n`);

    console.log('✅ 結果判定・アーカイブ生成完了！');
  } catch (error) {
    console.error('❌ エラー:', error.message);
    process.exit(1);
  }
}

main();
