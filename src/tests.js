import * as dotenv from 'dotenv';

// 最初に .env ファイルを読み込む（全より前）
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
    let kintoneRecords;
    try {
      kintoneRecords = await fetchRecordsFromKintoneForUpdate();
      console.log(`✅ Kintone からレコード取得完了: ${kintoneRecords.length} 件\n`);
    } catch (error) {
      console.error('❌ Kintone レコード取得エラー:', error.message);
      throw error;
    }

    // ステップ2: クエリを生成
    console.log('📝 クエリを生成中...\n');
    let queries;
    try {
      queries = await getQueries();
      console.log(`✅ クエリ生成完了\n`);
    } catch (error) {
      console.error('❌ クエリ生成エラー:', error.message);
      throw error;
    }

    // デバッグ：queries の確認
    console.log('【デバッグ情報】');
    console.log(`queries の型: ${typeof queries}`);
    console.log(`queries は配列か: ${Array.isArray(queries)}`);
    console.log(`queries の長さ: ${queries ? queries.length : 'undefined'}`);
    
    if (!queries || queries.length === 0) {
      console.log('⚠️ クエリが生成されていません');
      console.log('原因の可能性：');
      console.log('  1. Kintone にレコードがない');
      console.log('  2. queries.js のフィールドコードが間違っている');
      console.log('  3. 環境変数が正しく設定されていない');
      process.exit(1);
    }

    console.log(`\n📝 処理対象: ${queries.length}件のクエリ\n`);
    queries.forEach((q, i) => {
      // substring エラーを防ぐため、typeof チェックを追加
      const preview = typeof q === 'string' ? q.substring(0, 50) : '(文字列でない)';
      console.log(`  ${i + 1}. ${preview}...`);
    });

    // ステップ3: バッチリクエストを作成
    console.log();
    let requests;
    try {
      requests = createBatchRequests(queries);
      console.log(`✅ バッチリクエスト作成完了: ${requests.length} 件\n`);
    } catch (error) {
      console.error('❌ バッチリクエスト作成エラー:', error.message);
      throw error;
    }

    // ステップ4: バッチを送信
    let batchId;
    try {
      batchId = await submitBatch(requests);
    } catch (error) {
      console.error('❌ バッチ送信エラー:', error.message);
      throw error;
    }

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
    console.error('\n【エラー詳細】');
    console.error(error);
    process.exit(1);
  }
}

main();