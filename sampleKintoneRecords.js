// ============================================
// 1. インストール
// ============================================
// ターミナルで実行：
// npm install @kintone/rest-api-client dotenv

// ============================================
// 2. .env ファイルを作成
// ============================================
// .env に以下を記述：
/*
KINTONE_BASE_URL=https://your-subdomain.kintone.com
KINTONE_API_TOKEN=your-api-token-here
KINTONE_APP_ID=123
*/

// ============================================
// 3. サンプルコード
// ============================================

import { KintoneRestAPIClient } from '@kintone/rest-api-client';
import * as dotenv from 'dotenv';

dotenv.config();

// Kintone クライアントを初期化
const kintoneClient = new KintoneRestAPIClient({
  baseUrl: process.env.KINTONE_BASE_URL,
  auth: {
    apiToken: process.env.KINTONE_API_TOKEN,
  },
});

const appId = process.env.KINTONE_APP_ID;

async function main() {
  try {
    console.log('🔍 Kintone からレコードを取得中...\n');

    // ステップ1: レコードを取得
    const { records } = await kintoneClient.record.getRecords({
      app: appId,
      limit: 10,  // 最初の10件を取得
    });

    console.log(`📊 ${records.length} 件のレコードを取得しました\n`);

    if (records.length === 0) {
      console.log('レコードがありません');
      return;
    }

    // ステップ2: 取得したレコード情報を表示
    console.log('【現在のレコード情報】');
    records.forEach((record, index) => {
      console.log(`${index + 1}. ID: ${record.$id.value}, 会社名: ${record.会社名?.value || '(空)'}`);
    });

    // ステップ3: 最近の経営に関するニュースを更新するデータを準備
    const updateRecords = records.map((record, index) => {
      const newTitle = `更新済み_${new Date().getTime()}_${index + 1}`;
      return {
        id: record.$id.value,
        record: {
          最近の経営に関するニュース: {
            value: newTitle,
          },
        },
      };
    });

    console.log('\n📝 レコードを更新中...\n');

    // ステップ4: レコードを更新
    const updateResult = await kintoneClient.record.updateRecords({
      app: appId,
      records: updateRecords,
    });

    console.log(`✅ ${updateResult.records.length} 件のレコードを更新しました\n`);

    // ステップ5: 更新後のレコードを確認
    console.log('【更新後のレコード情報】');
    const { records: updatedRecords } = await kintoneClient.record.getRecords({
      app: appId,
      limit: 10,
    });

    updatedRecords.forEach((record, index) => {
      console.log(`${index + 1}. ID: ${record.$id.value}, 会社名: ${record.会社名?.value || '(空)'}`);
    });

    console.log('\n🎉 処理完了！');
  } catch (error) {
    console.error('❌ エラーが発生しました:', error.message);
    process.exit(1);
  }
}

// プログラムを実行
main();