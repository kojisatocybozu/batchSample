import * as dotenv from 'dotenv';
import Anthropic from '@anthropic-ai/sdk';

dotenv.config({ path: '.env' });

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

export function createBatchRequests(queries) {
  return queries.map((query, index) => ({
    custom_id: `request-${index}`,
    params: {
      model: process.env.CLAUDE_MODEL || 'claude-opus-4-1-20250805',
      max_tokens: 4096,
      tools: [
        {
          type: 'web_search_20250305',
          name: 'web_search',
        },
      ],
      messages: [
        {
          role: 'user',
          content: query,
        },
      ],
    },
  }));
}

export async function submitBatch(requests) {
  console.log(`\n📤 バッチを送信中... (${requests.length}件のリクエスト、Web Search 有効)\n`);

  try {
    const batch = await anthropic.messages.batches.create({
      requests: requests,
    });

    console.log(`✅ バッチ送信成功`);
    console.log(`   バッチID: ${batch.id}`);
    console.log(`   ステータス: ${batch.processing_status}`);
    console.log(`   💡 Web Search ツールが有効です。最新情報を検索して回答します。\n`);

    return batch.id;
  } catch (error) {
    console.error('❌ バッチ送信エラー:', error);
    throw error;
  }
}

export async function checkBatchStatus(batchId) {
  try {
    const batch = await anthropic.messages.batches.retrieve(batchId);
    return batch;
  } catch (error) {
    console.error('❌ ステータス確認エラー:', error);
    throw error;
  }
}

export default anthropic;