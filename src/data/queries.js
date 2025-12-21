import * as dotenv from 'dotenv';
import { KintoneRestAPIClient } from '@kintone/rest-api-client';

dotenv.config({ path: '.env' });

const kintoneClient = new KintoneRestAPIClient({
  baseUrl: process.env.KINTONE_BASE_URL,
  auth: {
    apiToken: process.env.KINTONE_API_TOKEN,
  },
});

// Kintone からレコードを取得
async function fetchRecordsFromKintone() {
  try {
    console.log('🔍 Kintone からレコードを取得中...\n');

    const { records } = await kintoneClient.record.getRecords({
      app: process.env.KINTONE_APP_ID,
      limit: 100,  // 最大100件を取得
    });

    console.log(`✅ ${records.length} 件のレコードを取得しました\n`);

    return records;
  } catch (error) {
    console.error('❌ Kintone からのデータ取得に失敗しました:', error.message);
    throw error;
  }
}

// Kintone のレコードからクエリを生成
function generateQueriesFromRecords(records) {
  const queries = records.map((record) => {
    // フィールドコードを適切に置き換えてください
    const content = record.会社名.value || '';

    // クエリを生成
    return `この会社の最近の経営に関する主なニュースについて、5件調べて教えてください：\n\n会社名: ${content}`;
  });

  return queries;
}

// メイン関数：Kintone からデータを取得してクエリを生成
export async function getQueries() {
  try {
    // ステップ1: Kintone からレコード取得
    const records = await fetchRecordsFromKintone();

    if (records.length === 0) {
      console.log('⚠️ 警告: Kintone にレコードがありません');
      return [];
    }

    // ステップ2: レコードからクエリを生成
    const queries = generateQueriesFromRecords(records);

    console.log(`📝 生成されたクエリ数: ${queries.length}件\n`);
    queries.forEach((q, i) => {
      console.log(`  ${i + 1}. ${q.substring(0, 50)}...`);
    });
    console.log();

    return queries;
  } catch (error) {
    console.error('❌ クエリ生成に失敗しました:', error.message);
    throw error;
  }
}

export default getQueries;