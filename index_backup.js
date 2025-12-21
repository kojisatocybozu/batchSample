import Anthropic from '@anthropic-ai/sdk';
import * as fs from 'fs';
import * as dotenv from 'dotenv';

dotenv.config();

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

// バッチリクエストを作成する関数
function createBatchRequests(queries) {
  return queries.map((query, index) => ({
    custom_id: `request-${index}`,
    params: {
      model: 'claude-opus-4-1-20250805',
      max_tokens: 1024,
      messages: [
        {
          role: 'user',
          content: query,
        },
      ],
    },
  }));
}

// バッチを送信する関数
async function submitBatch(requests) {
  console.log(`\n📤 バッチを送信中... (${requests.length}件のリクエスト)\n`);

  try {
    const batch = await anthropic.messages.batches.create({
      requests: requests,
    });

    console.log(`✅ バッチ送信成功`);
    console.log(`   バッチID: ${batch.id}`);
    console.log(`   ステータス: ${batch.processing_status}`);

    return batch.id;
  } catch (error) {
    console.error('❌ バッチ送信エラー:', error);
    throw error;
  }
}

// バッチの処理状況を確認する関数
async function checkBatchStatus(batchId) {
  try {
    const batch = await anthropic.messages.batches.retrieve(batchId);

    return batch;
  } catch (error) {
    console.error('❌ ステータス確認エラー:', error);
    throw error;
  }
}

// バッチの処理完了を待つ関数（改善版）
async function waitForBatchCompletion(batchId, maxWaitTime = 600000) {
  // デフォルト: 10分
  const startTime = Date.now();
  let checkCount = 0;
  let lastStatus = 'in_progress';

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
      console.log(
        `後で以下のコマンドで結果を確認できます:`
      );
      console.log(`node check-batch.js ${batchId}\n`);
      return batch;
    }

    // 5秒待機してから再度チェック
    await new Promise((resolve) => setTimeout(resolve, 5000));
  }
}

// バッチの結果を取得する関数
async function getBatchResults(batchId) {
  console.log(`\n📥 バッチ結果を取得中...`);

  const results = [];
  let count = 0;

  try {
    const resultsStream = await anthropic.messages.batches.results(batchId);

    for await (const entry of resultsStream) {
      count++;

      if (entry.result.type === 'succeeded') {
        const message = entry.result.message;
        results.push({
          id: entry.custom_id,
          status: 'succeeded',
          content: message.content[0].text,
        });
        console.log(`   ✓ ${entry.custom_id} - 成功`);
      } else if (entry.result.type === 'errored') {
        results.push({
          id: entry.custom_id,
          status: 'errored',
          error: entry.result.error.message,
        });
        console.log(
          `   ✗ ${entry.custom_id} - エラー: ${entry.result.error.message}`
        );
      } else if (entry.result.type === 'expired') {
        results.push({
          id: entry.custom_id,
          status: 'expired',
        });
        console.log(`   ⏱ ${entry.custom_id} - 期限切れ`);
      }
    }

    console.log(`\n📊 結果数: ${count}件\n`);

    return results;
  } catch (error) {
    console.error('❌ 結果取得エラー:', error);
    throw error;
  }
}

// 結果を表示して保存する関数
function displayAndSaveResults(results, batchId) {
  console.log('========================================');
  console.log('📋 バッチ処理結果');
  console.log('========================================\n');

  results.forEach((result, index) => {
    console.log(`【${result.id}】${result.status === 'succeeded' ? '✅' : '❌'}`);
    console.log('----------------------------------------');

    if (result.status === 'succeeded') {
      // 最初の500文字を表示
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

  // JSONファイルに保存
  const fileName = `batch-results-${batchId}.json`;
  fs.writeFileSync(fileName, JSON.stringify(results, null, 2));
  console.log('========================================');
  console.log(`✅ 詳細結果を保存しました: ${fileName}`);
  console.log('========================================\n');

  // CSV形式でも保存
  const csvFileName = `batch-results-${batchId}.csv`;
  const csvData = results
    .map((r) => {
      const content = r.status === 'succeeded' ? r.content.replace(/"/g, '""') : '';
      return `"${r.id}","${r.status}","${content.substring(0, 100)}"`;
    })
    .join('\n');
  fs.writeFileSync(
    csvFileName,
    '整理番号,ステータス,プレビュー\n' + csvData
  );
  console.log(`✅ CSV形式でも保存しました: ${csvFileName}\n`);
}

// メイン実行関数
async function main() {
  try {
    console.log('============================================');
    console.log('🚀 Claude バッチ処理プログラムを開始');
    console.log('============================================\n');

    // バッチで処理するクエリの例
    const queries = [
      'サイボウズ株式会社の最近の経営に関するニュースについて教えてください',
      '日本KFCホールディングス株式会社最近の経営に関するニュースについて教えてください',
    ];

    console.log(`📝 処理対象: ${queries.length}件のクエリ\n`);
    queries.forEach((q, i) => {
      console.log(`  ${i + 1}. ${q.substring(0, 50)}...`);
    });

    // ステップ1: バッチリクエストを作成
    console.log();
    const requests = createBatchRequests(queries);

    // ステップ2: バッチを送信
    const batchId = await submitBatch(requests);

    // ステップ3: 処理完了を待つ（改善版）
    const completedBatch = await waitForBatchCompletion(batchId);

    // ステップ4: 完了状態を確認
    if (completedBatch.processing_status !== 'succeeded') {
      console.log(
        `⚠️ 注意: バッチステータスが '${completedBatch.processing_status}' です`
      );
      console.log(`   成功: ${completedBatch.request_counts.succeeded}`);
      console.log(`   エラー: ${completedBatch.request_counts.errored}`);
    }

    // ステップ5: 結果を取得
    const results = await getBatchResults(batchId);

    // ステップ6: 結果を表示して保存
    displayAndSaveResults(results, batchId);

    console.log('✅ 処理完了！');
  } catch (error) {
    console.error('❌ エラーが発生しました:', error.message);
    process.exit(1);
  }
}

// プログラムを実行
main();