#!/usr/bin/env node

/**
 * keiba-data-sharedの予想データをnankan-analytics形式に変換
 *
 * 使い方:
 *   node scripts/generate-prediction.js
 *
 * 機能:
 *   - keiba-data-sharedからtotalScore・assignmentを取得
 *   - nankan-analytics用のallRacesPrediction.json形式に変換
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const KEIBA_DATA_SHARED_PATH = '/Users/apolon/Projects/keiba-data-shared';
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
 * keiba-data-shared形式 → nankan-analytics形式に変換
 */
function convertToNankanFormat(sourceData) {
  const outputData = {
    date: sourceData.raceDate,
    track: sourceData.track,
    totalRaces: sourceData.totalRaces,
    lastUpdated: new Date().toISOString(),
    races: []
  };

  sourceData.races.forEach((race) => {
    const raceOutput = {
      raceNumber: race.raceInfo.raceNumber,
      raceName: race.raceInfo.raceName,
      distance: race.raceInfo.distance,
      surface: race.raceInfo.surface,
      startTime: race.raceInfo.startTime,
      horses: []
    };

    // 本命
    const honmei = race.horses.find(h => h.assignment === '本命');
    if (honmei) {
      raceOutput.horses.push({
        number: honmei.number,
        name: honmei.name,
        mark: '◎',
        role: '本命',
        score: honmei.totalScore,
        jockey: honmei.kisyu
      });
    }

    // 対抗
    const taikou = race.horses.find(h => h.assignment === '対抗');
    if (taikou) {
      raceOutput.horses.push({
        number: taikou.number,
        name: taikou.name,
        mark: '○',
        role: '対抗',
        score: taikou.totalScore,
        jockey: taikou.kisyu
      });
    }

    // 単穴
    const tanana = race.horses.filter(h => h.assignment === '単穴');
    tanana.forEach(horse => {
      raceOutput.horses.push({
        number: horse.number,
        name: horse.name,
        mark: '▲',
        role: '単穴',
        score: horse.totalScore,
        jockey: horse.kisyu
      });
    });

    // 連下候補馬
    const renka = race.horses.filter(h => h.assignment && h.assignment.includes('連下'));
    renka.forEach(horse => {
      raceOutput.horses.push({
        number: horse.number,
        name: horse.name,
        mark: '△',
        role: '連下',
        score: horse.totalScore,
        jockey: horse.kisyu
      });
    });

    outputData.races.push(raceOutput);
  });

  return outputData;
}

/**
 * メイン処理
 */
function main() {
  console.log('🚀 nankan-analytics予想データ生成開始...\n');

  // テストデータで実行（2026-02-10）
  const testDate = '2026-02-10';
  console.log(`📅 対象日: ${testDate}\n`);

  try {
    // keiba-data-sharedからデータ取得
    const sourceData = fetchPredictionData(testDate);
    console.log(`✅ keiba-data-sharedからデータ取得成功`);
    console.log(`   競馬場: ${sourceData.track}`);
    console.log(`   レース数: ${sourceData.totalRaces}R\n`);

    // nankan-analytics形式に変換
    const outputData = convertToNankanFormat(sourceData);
    console.log(`✅ nankan-analytics形式に変換完了`);
    console.log(`   1R本命: ${outputData.races[0].horses[0].number}番 ${outputData.races[0].horses[0].name} (${outputData.races[0].horses[0].score}pt)\n`);

    // 保存
    const outputPath = path.join(OUTPUT_DIR, `allRacesPrediction-${testDate}.json`);
    fs.writeFileSync(outputPath, JSON.stringify(outputData, null, 2));
    console.log(`💾 出力ファイル: ${outputPath}\n`);

    console.log('✅ 予想データ生成完了！');
  } catch (error) {
    console.error('❌ エラー:', error.message);
    process.exit(1);
  }
}

main();
