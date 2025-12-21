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
        
        // content_block を確認
        let content = '(コンテンツなし)';
        if (message.content && message.content.length > 0) {
          // テキストコンテンツを探す
          const textContent = message.content.find(block => block.type === 'text');
          if (textContent && textContent.text) {
            content = textContent.text;
          }
        }

        results.push({
          id: entry.custom_id,
          status: 'succeeded',
          content: content,
        });
        console.log(`   ✓ ${entry.custom_id} - 成功`);
      } else if (entry.result.type === 'errored') {
        results.push({
          id: entry.custom_id,
          status: 'errored',
          error: entry.result.error.message || '不明なエラー',
        });
        console.log(
          `   ✗ ${entry.custom_id} - エラー: ${entry.result.error.message}`
        );
      } else if (entry.result.type === 'expired') {
        results.push({
          id: entry.custom_id,
          status: 'expired',
          error: '期限切れ',
        });
        console.log(`   ⏱ ${entry.custom_id} - 期限切れ`);
      }
    }

    console.log(`\n📊 結果数: ${count}件\n`);
    
    // 明示的に results を返す
    return results;
  } catch (error) {
    console.error('❌ 結果取得エラー:', error);
    throw error;
  }
}

export default getBatchResults;