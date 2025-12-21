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
  console.log(`\n【Kintone 更新データ構築 - デバッグ情報】`);
  console.log(`バッチ結果数: ${batchResults.length}`);
  console.log(`Kintone レコード数: ${kintoneRecords.length}`);
  console.log(`バッチ結果の詳細:`);
  
  batchResults.forEach((result, idx) => {
    console.log(`  [${idx}] id: ${result.id}, status: ${result.status}`);
  });

  const updateRecords = [];

  // バッチ結果をマッピング（request-0 -> records[0] など）
  batchResults.forEach((result, index) => {
    console.log(`\n処理 ${index}: ${result.id}`);

    // custom_id から インデックスを抽出（例："request-0" -> 0）
    const indexMatch = result.id.match(/request-(\d+)/);
    
    if (!indexMatch) {
      console.log(`  ⚠️ インデックスを抽出できませんでした`);
      return;
    }

    const recordIndex = parseInt(indexMatch[1], 10);
    console.log(`  インデックス: ${recordIndex}`);

    const kintoneRecord = kintoneRecords[recordIndex];

    if (!kintoneRecord) {
      console.log(`  ⚠️ 対応する Kintone レコードが見つかりません`);
      return;
    }

    const recordId = kintoneRecord.$id.value;
    console.log(`  ✓ Kintone レコードID: ${recordId}`);

    // 更新データを構築
    const updateData = {
      id: recordId,
      record: {
        // フィールドコードを実際のものに置き換えてください
        最近の経営に関するニュース: {
          value: result.status === 'succeeded' ? result.content : `エラー: ${result.error || '不明なエラー'}`,
        },
      },
    };

    updateRecords.push(updateData);
    console.log(`  ✅ 更新データに追加しました`);
  });

  console.log(`\n更新対象レコード数: ${updateRecords.length}\n`);
  return updateRecords;
}

// Kintone のレコードを更新
export async function updateKintoneRecords(batchResults, kintoneRecords) {
  try {
    console.log(`\n${'='.repeat(50)}`);
    console.log(`📤 Kintone にバッチ結果を書き戻し中...`);
    console.log(`${'='.repeat(50)}`);

    // 更新データを構築
    const updateRecords = buildKintoneUpdateData(batchResults, kintoneRecords);

    if (updateRecords.length === 0) {
      console.log('⚠️ 更新対象のレコードがありません');
      return;
    }

    console.log(`\n【Kintone API への更新リクエスト】`);
    console.log(`アプリID: ${process.env.KINTONE_APP_ID}`);
    console.log(`更新件数: ${updateRecords.length}`);

    // Kintone を更新（最大100件ずつ処理）
    const batchSize = 100;
    const totalUpdated = [];

    for (let i = 0; i < updateRecords.length; i += batchSize) {
      const batch = updateRecords.slice(i, i + batchSize);
      const batchNumber = Math.floor(i / batchSize) + 1;
      
      console.log(`\n📝 バッチ ${batchNumber} を処理中 (${batch.length}件)...`);
      console.log(`   アプリID: ${process.env.KINTONE_APP_ID}`);
      console.log(`   更新対象IDs: ${batch.map(r => r.id).join(', ')}`);

      try {
        const result = await kintoneClient.record.updateRecords({
          app: process.env.KINTONE_APP_ID,
          records: batch,
        });

        console.log(`✅ バッチ ${batchNumber} - ${result.records.length} 件の更新に成功しました`);
        
        result.records.forEach((record, idx) => {
          console.log(`   [${idx + 1}] Kintone ID: ${record.id}`);
        });

        totalUpdated.push(...result.records);
      } catch (batchError) {
        console.error(`❌ バッチ ${batchNumber} の更新に失敗しました`);
        console.error(`   エラー: ${batchError.message}`);
        console.error(`   詳細: ${batchError.toString()}`);
        throw batchError;
      }
    }

    console.log(`\n${'='.repeat(50)}`);
    console.log(`✅ 合計 ${totalUpdated.length} 件のレコードを更新しました`);
    console.log(`${'='.repeat(50)}\n`);

    return totalUpdated;
  } catch (error) {
    console.error('❌ Kintone 更新エラー:', error.message);
    console.error('スタックトレース:', error.stack);
    throw error;
  }
}

// Kintone からレコードを取得（内部用）
export async function fetchRecordsFromKintoneForUpdate() {
  try {
    console.log('📥 Kintone からレコードを取得中...');
    
    const { records } = await kintoneClient.record.getRecords({
      app: process.env.KINTONE_APP_ID,
      limit: 100,
    });

    console.log(`✅ ${records.length} 件のレコードを取得しました`);

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