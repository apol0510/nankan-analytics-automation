import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { exec } from 'child_process';
import { promisify } from 'util';

const execPromise = promisify(exec);
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const OUTPUT_DIR = '/tmp/output';
const NANKAN_ANALYTICS_PATH = '/tmp/nankan-analytics';

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
 * nankan-analyticsをクローン
 */
async function cloneNankanAnalytics(githubToken) {
  try {
    if (fs.existsSync(NANKAN_ANALYTICS_PATH)) {
      await execPromise(`rm -rf ${NANKAN_ANALYTICS_PATH}`);
    }

    const cloneUrl = `https://x-access-token:${githubToken}@github.com/apol0510/nankan-analytics.git`;
    await execPromise(`git clone ${cloneUrl} ${NANKAN_ANALYTICS_PATH}`);

    // Git設定
    await execPromise(`cd ${NANKAN_ANALYTICS_PATH} && git config user.email "noreply@anthropic.com"`);
    await execPromise(`cd ${NANKAN_ANALYTICS_PATH} && git config user.name "Claude Code"`);

    return true;
  } catch (error) {
    throw new Error(`nankan-analyticsクローン失敗: ${error.message}`);
  }
}

/**
 * 結果データのデプロイ
 */
function deployResults(date) {
  const sourceFile = path.join(OUTPUT_DIR, `archiveResults-${date}.json`);

  if (!fs.existsSync(sourceFile)) {
    throw new Error(`結果データが見つかりません: ${sourceFile}`);
  }

  // src/data/にマージ
  const archiveFile = path.join(NANKAN_ANALYTICS_PATH, 'astro-site/src/data/archiveResults.json');
  let existingData = {};

  if (fs.existsSync(archiveFile)) {
    existingData = JSON.parse(fs.readFileSync(archiveFile, 'utf-8'));
  }

  const newData = JSON.parse(fs.readFileSync(sourceFile, 'utf-8'));
  const [year, month, day] = date.split('-');
  if (!existingData[year]) existingData[year] = {};
  if (!existingData[year][month]) existingData[year][month] = {};
  existingData[year][month][day] = newData[year][month][day];

  fs.writeFileSync(archiveFile, JSON.stringify(existingData, null, 2));

  // public/data/にコピー
  const publicArchiveFile = path.join(NANKAN_ANALYTICS_PATH, 'astro-site/public/data/archiveResults.json');
  fs.copyFileSync(archiveFile, publicArchiveFile);

  return true;
}

/**
 * Git コミット・プッシュ
 */
async function gitCommitAndPush(date) {
  const commitMessage = `📊 結果データ自動更新・${date}

🤖 Generated with [Claude Code](https://claude.com/claude-code)

Co-Authored-By: Claude <noreply@anthropic.com>`;

  try {
    // Git add
    await execPromise(`cd ${NANKAN_ANALYTICS_PATH}/astro-site && git add src/data/archiveResults.json public/data/archiveResults.json`);

    // Git commit
    await execPromise(`cd ${NANKAN_ANALYTICS_PATH}/astro-site && git commit -m "${commitMessage}"`);

    // Git push
    await execPromise(`cd ${NANKAN_ANALYTICS_PATH}/astro-site && git push origin main`);

    return true;
  } catch (error) {
    throw new Error(`Git操作失敗: ${error.message}`);
  }
}

/**
 * Netlify Function Handler
 */
export default async (req, context) => {
  let log = '';

  try {
    const githubToken = process.env.GITHUB_TOKEN;
    if (!githubToken) {
      throw new Error('GITHUB_TOKEN環境変数が設定されていません');
    }

    const targetDate = getTodayDate();
    log += `📅 対象日: ${targetDate}\n`;

    // nankan-analyticsクローン
    log += '⏳ nankan-analytics クローン中...\n';
    await cloneNankanAnalytics(githubToken);
    log += '✅ クローン完了\n';

    // 結果データデプロイ
    log += '⏳ 結果データマージ中...\n';
    deployResults(targetDate);
    log += '✅ マージ完了\n';

    // Git コミット・プッシュ
    log += '⏳ Git コミット・プッシュ中...\n';
    await gitCommitAndPush(targetDate);
    log += '✅ プッシュ完了！ Netlify自動ビルド開始\n';

    return new Response(JSON.stringify({
      success: true,
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
  path: "/auto-deploy"
};
