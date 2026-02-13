import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { exec } from 'child_process';
import { promisify } from 'util';

const execPromise = promisify(exec);
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const KEIBA_DATA_SHARED_PATH = '/tmp/keiba-data-shared';
const OUTPUT_DIR = '/tmp/output';

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
 * keiba-data-sharedをクローン
 */
async function cloneKeibaDataShared() {
  try {
    if (fs.existsSync(KEIBA_DATA_SHARED_PATH)) {
      await execPromise(`rm -rf ${KEIBA_DATA_SHARED_PATH}`);
    }
    await execPromise(`git clone https://github.com/apol0510/keiba-data-shared.git ${KEIBA_DATA_SHARED_PATH}`);
    return true;
  } catch (error) {
    throw new Error(`keiba-data-sharedクローン失敗: ${error.message}`);
  }
}

/**
 * 予想データ取得
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
 * 結果データ取得
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
    throw new Error(`結果データが見つかりません: ${filePath}`);
  }

  return JSON.parse(fs.readFileSync(filePath, 'utf-8'));
}

/**
 * 馬単的中判定
 */
function checkUmatanHit(prediction, result) {
  const jikuHorses = prediction.horses.filter(h =>
    ['本命', '対抗', '単穴'].includes(h.assignment)
  );

  const himoHorses = prediction.horses.filter(h =>
    ['対抗', '単穴', '連下最上位', '連下', '補欠'].includes(h.assignment)
  );

  if (jikuHorses.length === 0 || himoHorses.length === 0) {
    return { hit: false, payout: 0 };
  }

  const first = result.results.find(r => r.rank === 1);
  const second = result.results.find(r => r.rank === 2);

  if (!first || !second) {
    return { hit: false, payout: 0 };
  }

  const jikuNumbers = jikuHorses.map(h => h.number);
  const himoNumbers = himoHorses.map(h => h.number);

  const pattern1 = jikuNumbers.includes(first.number) && himoNumbers.includes(second.number);
  const pattern2 = himoNumbers.includes(first.number) && jikuNumbers.includes(second.number);
  const isHit = pattern1 || pattern2;

  if (!isHit) {
    return { hit: false, payout: 0 };
  }

  const umatanPayout = result.payouts?.umatan?.find(
    p => p.combination === `${first.number}-${second.number}`
  );

  return {
    hit: true,
    payout: umatanPayout?.payout || 0
  };
}

/**
 * アーカイブ形式に変換
 */
function convertToArchiveFormat(predictionData, resultData, targetDate) {
  const [year, month, day] = targetDate.split('-');

  const races = [];
  let hitRaces = 0;
  let totalPayout = 0;
  const betPoints = 12;

  predictionData.races.forEach((prediction) => {
    const raceNum = parseInt(prediction.raceInfo.raceNumber.replace('R', ''));
    const result = resultData.races.find(r => r.raceNumber === raceNum);

    if (!result) {
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

  const totalBet = betPoints * predictionData.totalRaces;
  const recoveryRate = totalBet > 0 ? Math.round((totalPayout / totalBet) * 100) : 0;
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
 * Netlify Function Handler
 */
export default async (req, context) => {
  let log = '';

  try {
    const targetDate = getTodayDate();
    log += `📅 対象日: ${targetDate}\n`;

    // keiba-data-sharedクローン
    log += '⏳ keiba-data-shared クローン中...\n';
    await cloneKeibaDataShared();
    log += '✅ クローン完了\n';

    // データ取得
    log += '⏳ 予想・結果データ取得中...\n';
    const predictionData = fetchPredictionData(targetDate);
    const resultData = fetchResultData(targetDate);
    log += `✅ データ取得完了（${predictionData.track} ${predictionData.totalRaces}R）\n`;

    // 結果判定
    log += '⏳ 的中判定中...\n';
    const archiveData = convertToArchiveFormat(predictionData, resultData, targetDate);

    const [year, month, day] = targetDate.split('-');
    const dayData = archiveData[year][month][day];
    log += `✅ 的中: ${dayData.hitRaces}/${dayData.totalRaces}R | 配当: ${dayData.totalPayout}円 | 回収率: ${dayData.recoveryRate}%\n`;

    // 出力
    if (!fs.existsSync(OUTPUT_DIR)) {
      fs.mkdirSync(OUTPUT_DIR, { recursive: true });
    }
    const outputPath = path.join(OUTPUT_DIR, `archiveResults-${targetDate}.json`);
    fs.writeFileSync(outputPath, JSON.stringify(archiveData, null, 2));
    log += `💾 保存完了: ${outputPath}\n`;

    return new Response(JSON.stringify({
      success: true,
      hitRaces: dayData.hitRaces,
      totalRaces: dayData.totalRaces,
      totalPayout: dayData.totalPayout,
      recoveryRate: dayData.recoveryRate,
      log: log
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });

  } catch (error) {
    log += `❌ エラー: ${error.message}\n`;
    return new Response(JSON.stringify({
      success: false,
      error: error.message,
      log: log
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
};

export const config = {
  path: "/generate-results"
};
