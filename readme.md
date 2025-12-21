~~~
// ============================================
// ディレクトリ構成
// ============================================
/*
project/
├── src/
│   ├── index.js                 ← メインファイル（エントリーポイント）
│   ├── clients/
│   │   └── batchClient.js       ← Claude バッチ処理の核機能
│   ├── services/
│   │   ├── batchMonitor.js      ← バッチの監視・ポーリング
│   │   ├── resultHandler.js     ← 結果の取得・処理
│   │   └── fileOutput.js        ← ファイル出力機能
│   └── data/
│       └── queries.js           ← クエリ定義
├── .env                         ← 環境変数
├── .gitignore
├── package.json
└── README.md
*/
~~~
