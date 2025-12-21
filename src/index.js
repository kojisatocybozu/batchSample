// ============================================
// src/index.js - メインファイル（エントリーポイント）
// ============================================

import * as dotenv from 'dotenv';

// 最初に .env ファイルを読み込む
dotenv.config();

import { createBatchRequests, submitBatch } from './clients/batchClient.js';
import { waitForBatchCompletion } from './services/batchMonitor.js';
import { getBatchResults } from './services/resultHandler.js';
import { displayAndSaveResults } from './services/fileOutput.js';
import { updateKintoneRecords, fetchRecordsFromKintoneForUpdate } from './services/kintoneUpdater.js';
import { getQueries } from './data/queries.js';

async function main() {
  try {
    console.log('============================================');
    console.log('🚀 Claude バッチ処理プログラムを開始');
    console.log('============================================\n');

    // ステップ1: Kintone からレコードを取得
    console.log('📚 Kintone からレコードを取得中...\n');
    const kintoneRecords = await fetchRecordsFromKintoneForUpdate();

    // ステップ2: クエリを生成
    const queries = await getQueries();
    console.log(`📝 処理対象: ${queries.length}件のクエリ\n`);
    queries.forEach((q, i) => {
      console.log(`  ${i + 1}. ${q.substring(0, 50)}...`);
    });

    // ステップ3: バッチリクエストを作成
    console.log();
    const requests = createBatchRequests(queries);

    // ステップ4: バッチを送信
    const batchId = await submitBatch(requests);

    // ステップ5: 処理完了を待つ
    const completedBatch = await waitForBatchCompletion(batchId);

    // ステップ6: 完了状態を確認
    if (completedBatch.processing_status !== 'succeeded') {
      console.log(
        `⚠️ 注意: バッチステータスが '${completedBatch.processing_status}' です`
      );
      console.log(`   成功: ${completedBatch.request_counts.succeeded}`);
      console.log(`   エラー: ${completedBatch.request_counts.errored}`);
    }

    // ステップ7: 結果を取得
    const results = await getBatchResults(batchId);

    // ステップ8: 結果を表示して保存
    displayAndSaveResults(results, batchId);

    // ステップ9: Kintone のレコードを更新
    await updateKintoneRecords(results, kintoneRecords);


    console.log('✅ 処理完了！');
  } catch (error) {
    console.error('❌ エラーが発生しました:', error.message);
    process.exit(1);
  }
}

main();
