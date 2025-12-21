// ============================================
// src/services/fileOutput.js
// ============================================

import * as fs from 'fs';

export function displayResults(results) {
  console.log('========================================');
  console.log('📋 バッチ処理結果');
  console.log('========================================\n');

  results.forEach((result) => {
    console.log(`【${result.id}】${result.status === 'succeeded' ? '✅' : '❌'}`);
    console.log('----------------------------------------');

    if (result.status === 'succeeded') {
      const preview = result.content.substring(0, 500);
      console.log(preview);
      if (result.content.length > 500) {
        console.log('\n...(省略)...\n');
      } else {
        console.log();
      }
    } else if (result.status === 'errored') {
      console.log(`エラー: ${result.error}\n`);
    } else {
      console.log(`ステータス: ${result.status}\n`);
    }
  });
}

export function saveResultsAsJSON(results, batchId) {
  const fileName = `batch-results-${batchId}.json`;
  fs.writeFileSync(fileName, JSON.stringify(results, null, 2));
  console.log(`✅ 詳細結果を保存しました: ${fileName}`);
  return fileName;
}

export function displayAndSaveResults(results, batchId) {
  displayResults(results);
  console.log('========================================');
  saveResultsAsJSON(results, batchId);
  console.log('========================================\n');
}

export default {
  displayResults,
  saveResultsAsJSON,
  displayAndSaveResults,
};
