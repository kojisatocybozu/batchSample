import * as dotenv from 'dotenv';

// 最初に .env ファイルを読み込む（全より前）
dotenv.config();

import { createBatchRequests, submitBatch } from './clients/batchClient.js';
import { waitForBatchCompletion } from './services/batchMonitor.js';
import { getBatchResults } from './services/resultHandler.js';
import { updateKintoneRecords, fetchRecordsFromKintoneForUpdate } from './services/kintoneUpdater.js';
import { getQueries } from './data/queries.js';

async function main() {
  try {
    console.log('============================================');
    console.log('🚀 Claude バッチ処理プログラムを開始');
    console.log('============================================\n');

    // ステップ1: Kintone からレコードを取得
    const kintoneRecords = await fetchRecordsFromKintoneForUpdate();

    // ステップ2: クエリを生成
    const queries = await getQueries();

    // クエリの確認
    if (!queries || !Array.isArray(queries) || queries.length === 0) {
      console.log('⚠️ クエリが生成されていません');
      process.exit(1);
    }

    // ステップ3: バッチリクエストを作成
    console.log();
    const requests = createBatchRequests(queries);
    console.log(`✅ バッチリクエスト作成完了: ${requests.length} 件\n`);

    // ステップ4: バッチを送信
    const batchId = await submitBatch(requests);

    // ステップ5: 処理完了を待つ
    console.log('\n⏳ バッチ処理の完了を待機中...');
    const completedBatch = await waitForBatchCompletion(batchId);

    // ステップ6: 完了状態を確認
    console.log(`\nバッチ最終ステータス: ${completedBatch.processing_status}`);
    if (completedBatch.processing_status !== 'succeeded') {
      console.log(
        `⚠️ 注意: バッチステータスが '${completedBatch.processing_status}' です`
      );
      console.log(`   成功: ${completedBatch.request_counts.succeeded}`);
      console.log(`   処理中: ${completedBatch.request_counts.processing}`);
      console.log(`   エラー: ${completedBatch.request_counts.errored}`);
      
      if (completedBatch.processing_status === 'in_progress') {
        console.log('\n⚠️ バッチ処理がまだ進行中です');
        console.log(`バッチID: ${batchId}`);
        console.log('以下のコマンドで後で結果を確認してください：');
        console.log(`node check-batch.js ${batchId}\n`);
        process.exit(0);
      }
    }

    // ステップ7: 結果を取得
    console.log('\n📥 バッチ結果を取得中...');
    const batchResults = await getBatchResults(batchId);
    console.log(`✅ 結果取得完了: ${batchResults.length} 件`);

    // ステップ8: Kintone のレコードを更新
    await updateKintoneRecords(batchResults, kintoneRecords);

    console.log('✅ 処理完了！');
  } catch (error) {
    console.error('❌ エラーが発生しました:', error.message);
    console.error('\n【エラー詳細】');
    console.error(error.stack);
    process.exit(1);
  }
}

main();