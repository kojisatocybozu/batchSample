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
    const company = record.会社名?.value || '(会社名なし)';
    
    return `${company} について Web で検索して、以下の情報を詳しく提供してください：

1. 直近のニュースと重要な発表
2. 経営戦略の最新動向
3. 最新の業績データ
4. 業界内での現在の立場

Web 検索を使用して最新情報を取得し、詳細に分析して回答してください。`;
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