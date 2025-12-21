// ============================================
// src/services/batchMonitor.js
// ============================================

import { checkBatchStatus } from '../clients/batchClient.js';

export async function waitForBatchCompletion(batchId) {
  const startTime = Date.now();
  let checkCount = 0;
  let lastStatus = 'in_progress';

  const maxWaitTime = parseInt(process.env.BATCH_MAX_WAIT_TIME) || 600000;
  const checkInterval = parseInt(process.env.BATCH_CHECK_INTERVAL) || 5000;

  console.log(`⏳ バッチ処理の完了を待機中...`);
  console.log(`   タイムアウト: ${maxWaitTime / 1000}秒\n`);

  while (true) {
    checkCount++;
    const batch = await checkBatchStatus(batchId);
    const elapsedTime = Date.now() - startTime;
    const elapsedSeconds = Math.floor(elapsedTime / 1000);

    // ステータスが変わった場合のみ表示
    if (batch.processing_status !== lastStatus) {
      console.log(`[${elapsedSeconds}秒経過] ステータス: ${batch.processing_status}`);
      console.log(
        `   成功: ${batch.request_counts.succeeded} | 処理中: ${batch.request_counts.processing} | エラー: ${batch.request_counts.errored}`
      );
      lastStatus = batch.processing_status;
    }

    // 処理完了
    if (batch.processing_status !== 'in_progress') {
      console.log(`\n✅ バッチ処理完了！（${checkCount}回チェック）`);
      return batch;
    }

    // タイムアウト
    if (elapsedTime > maxWaitTime) {
      console.log(
        `\n⚠️ タイムアウト（${maxWaitTime / 1000}秒以上経過）\n`
      );
      console.log(`バッチID: ${batchId}`);
      console.log(`後で以下のコマンドで結果を確認できます:`);
      console.log(`node src/index.js ${batchId}\n`);
      return batch;
    }

    // 指定間隔で再度チェック
    await new Promise((resolve) => setTimeout(resolve, checkInterval));
  }
}

export default waitForBatchCompletion;
