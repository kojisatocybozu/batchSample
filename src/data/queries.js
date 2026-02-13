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
    const query = '調査対象 in ("On")';
    const { records } = await kintoneClient.record.getRecords({
      app: process.env.KINTONE_APP_ID,
      limit: 100,  // 最大100件を取得
      query: query,
    });
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

1. Salesforce, ServiceNow等のSaaSサービスの導入に関する最新のニュースや発表
2. 直近の経営状況
3. 企業合併や社名変更、大きな組織変更等のニュース
4. DX推進やAIの導入等、ITについての取り組みについての情報

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

    return queries;
  } catch (error) {
    console.error('❌ クエリ生成に失敗しました:', error.message);
    throw error;
  }
}

export default getQueries;