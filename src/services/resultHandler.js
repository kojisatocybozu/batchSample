// ============================================
// src/services/resultHandler.js
// ============================================

import anthropic from '../clients/batchClient.js';

export async function getBatchResults(batchId) {
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

export default getBatchResults;

