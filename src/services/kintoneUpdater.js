import * as dotenv from 'dotenv';
import { KintoneRestAPIClient } from '@kintone/rest-api-client';

dotenv.config({ path: '.env' });

const kintoneClient = new KintoneRestAPIClient({
  baseUrl: process.env.KINTONE_BASE_URL,
  auth: {
    apiToken: process.env.KINTONE_API_TOKEN,
  },
});

// バッチ処理結果から Kintone 更新データを構築
function buildKintoneUpdateData(batchResults, kintoneRecords) {
  const updateRecords = [];

  // バッチ結果をマッピング（request-0 -> records[0] など）
  batchResults.forEach((result) => {
    // custom_id から インデックスを抽出（例："request-0" -> 0）
    const indexMatch = result.id.match(/request-(\d+)/);
    if (!indexMatch) return;

    const recordIndex = parseInt(indexMatch[1], 10);
    const kintoneRecord = kintoneRecords[recordIndex];

    if (!kintoneRecord) return;

    // 更新データを構築
    updateRecords.push({
      id: kintoneRecord.$id.value,
      record: {
        // フィールドコードを「最近の経営に関するニュース」に置き換えてください
        最近の経営に関するニュース: {
          value: result.status === 'succeeded' ? result.content : `エラー: ${result.error || '不明なエラー'}`,
        },
      },
    });
  });

  return updateRecords;
}

// Kintone のレコードを更新
export async function updateKintoneRecords(batchResults, kintoneRecords) {
  try {
    console.log(`\n📤 Kintone にバッチ結果を書き戻し中...\n`);

    // 更新データを構築
    const updateRecords = buildKintoneUpdateData(batchResults, kintoneRecords);

    if (updateRecords.length === 0) {
      console.log('⚠️ 更新対象のレコードがありません');
      return;
    }

    // Kintone を更新
    const result = await kintoneClient.record.updateRecords({
      app: process.env.KINTONE_APP_ID,
      records: updateRecords,
    });

    console.log(`✅ ${result.records.length} 件のレコードを更新しました\n`);
    result.records.forEach((record) => {
      console.log(`   ID: ${record.id} - 更新成功`);
    });

    return result;
  } catch (error) {
    console.error('❌ Kintone 更新エラー:', error.message);
    throw error;
  }
}

// Kintone からレコードを取得（内部用）
export async function fetchRecordsFromKintoneForUpdate() {
  try {
    const { records } = await kintoneClient.record.getRecords({
      app: process.env.KINTONE_APP_ID,
      limit: 100,
    });

    return records;
  } catch (error) {
    console.error('❌ Kintone レコード取得エラー:', error.message);
    throw error;
  }
}

export default {
  updateKintoneRecords,
  fetchRecordsFromKintoneForUpdate,
};