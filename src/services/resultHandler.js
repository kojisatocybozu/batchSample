import anthropic from '../clients/batchClient.js';

export async function getBatchResults(batchId) {
//  console.log(`\n📥 バッチ結果を取得中...`);

  const results = [];
  let count = 0;

  try {
    const resultsStream = await anthropic.messages.batches.results(batchId);

    for await (const entry of resultsStream) {
      count++;

      if (entry.result.type === 'succeeded') {
        const message = entry.result.message;
        
        // すべてのコンテンツブロックを処理
        let fullContent = '';
        
        if (message.content && message.content.length > 0) {
          // テキストとツール使用結果をまとめる
          message.content.forEach((block) => {
            if (block.type === 'text') {
              fullContent += block.text;
            } else if (block.type === 'tool_use') {
              // ツール使用情報は含めない（テキストのみ）
              console.log(`   ℹ️ ${entry.custom_id} - Web Search を使用しました`);
            }
          });
        }

        // コンテンツが空でないか確認
        if (!fullContent.trim()) {
          fullContent = '(コンテンツなし)';
        }

        results.push({
          id: entry.custom_id,
          status: 'succeeded',
          content: fullContent,
        });
//        console.log(`   ✓ ${entry.custom_id} - 成功（${fullContent.length} 文字）`);
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