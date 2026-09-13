# 2036 Personal AI Network

> 探さない。頼まない。AIが機会を連れてくる。

各個人の「専属AI秘書」同士が空き時間・趣味・対人傾向を調整し、本人が探していないリアルな体験を LINE に提案するハッカソン用プロトタイプです。
仕様の詳細は [BRIEF.md](BRIEF.md) を参照してください。

```text
発表者用トリガー（本番は Cloud Scheduler）
  → Cloud Run（Express）
  → Gemini（マッチング案を JSON で生成）
  → LINE Push（参加する / 見送る）
  → LINE Webhook（承認処理）
```

---

## ディレクトリ構成（どこに何を入れるか）

```text
.
├── BRIEF.md                 # 仕様書（ハッカソン要件・デモシナリオ）
├── README.md                # このファイル
├── package.json             # 依存関係と npm scripts
├── tsconfig.json            # TypeScript 設定（src → dist にビルド）
├── .env.example             # 環境変数のテンプレート（コピーして .env を作る）
├── .gitignore               # .env / node_modules / dist などを除外
├── .gcloudignore            # Cloud Run デプロイ時にアップロードしないファイル
│
├── src/                     # サーバー側（TypeScript）
│   ├── server.ts            # エントリーポイント。Express の起動とルーティング
│   ├── config.ts            # 環境変数の読み込み
│   ├── types.ts             # 型定義（UserProfile / Activity / MatchResult など）
│   ├── errors.ts            # 未実装エラー（501 を返す）
│   ├── gemini.ts            # Gemini 呼び出し（疎通確認・マッチング生成）
│   ├── line.ts              # LINE Push 送信・Webhook（Postback 承認）
│   ├── match.ts             # 秘書AIオーケストレーション（データ → Gemini → LINE）
│   └── data/                # 固定 JSON（DB の代わり）
│       ├── users.json       # デモ用ユーザープロフィール（空き時間・趣味・対人嗜好）
│       └── activities.json  # 体験候補（カラオケ・勉強会・ボードゲームなど）
│
└── public/                  # デモ／管理画面（発表者向け。静的ファイルとして配信）
    ├── index.html           # ユーザー一覧・AI秘書ログ・成立結果・発表者用ボタン
    ├── style.css            # 見た目
    └── app.js               # API 呼び出しと画面描画
```

### 「こういう変更はここ」早見表

| やりたいこと | 触るファイル |
|---|---|
| デモ用の人物を増やす・趣味や空き時間を変える | `src/data/users.json` |
| 提案できる体験を増やす | `src/data/activities.json` |
| Gemini へのプロンプトや出力 JSON の形を変える | `src/gemini.ts`（型は `src/types.ts`） |
| LINE の通知文面・ボタン・Flex Message | `src/line.ts` |
| 「参加する / 見送る」を押した後の処理 | `src/line.ts` の `handleWebhook` |
| マッチング後に誰へ送るか等の流れ | `src/match.ts` |
| API を追加する | `src/server.ts` |
| デモ画面の見た目・ログ演出 | `public/index.html` / `public/style.css` / `public/app.js` |
| 環境変数を追加する | `.env.example` と `src/config.ts` |
| Google Calendar / Sheets 連携（Phase 7） | `src/calendar.ts` / `src/sheets.ts` を新規作成し `src/match.ts` から呼ぶ |

---

## 開発フェーズと進捗

各ファイルの `TODO(Phase N)` コメントが実装箇所です。

| Phase | 内容 | 主なファイル | 状態 |
|---|---|---|---|
| 1 | Cloud Run で Hello World | `src/server.ts`, `public/` | ✅ 雛形あり（デプロイ確認待ち） |
| 2 | Gemini 接続 | `src/gemini.ts` の `askGemini` | ⬜ |
| 3 | LINE Push | `src/line.ts` の `pushText` | ⬜ |
| 4 | ユーザー JSON + Gemini マッチング | `src/gemini.ts` の `generateMatch`, `src/match.ts` | ⬜ |
| 5 | デモ画面の AI 秘書ログ | `public/app.js` | ⬜ |
| 6 | LINE 承認（Postback） | `src/line.ts` の `pushMatchProposal`, `handleWebhook` | ⬜ |
| 7 | Calendar / Sheets / Flex Message | 新規ファイル | ⬜ |

未実装の API を呼ぶと `501` とメッセージが返ります。

---

## ローカルで動かす

必要なもの：Node.js 22

```bash
npm install
cp .env.example .env   # 値を記入する
npm run dev            # http://localhost:8080
```

| コマンド | 内容 |
|---|---|
| `npm run dev` | ファイル変更を監視しながら起動（tsx） |
| `npm run build` | `dist/` に JavaScript を出力 |
| `npm start` | ビルド済みの `dist/server.js` を起動（Cloud Run と同じ） |

---

## 環境変数

| 変数 | 用途 | 入手先 |
|---|---|---|
| `GEMINI_API_KEY` | Gemini API キー | Google AI Studio |
| `GEMINI_MODEL` | 使用モデル（省略時 `gemini-2.5-flash`） | — |
| `LINE_CHANNEL_ACCESS_TOKEN` | Push / Reply 送信 | LINE Developers > Messaging API 設定 > チャネルアクセストークン（長期） |
| `LINE_CHANNEL_SECRET` | Webhook の署名検証 | LINE Developers > チャネル基本設定 |
| `LINE_DEMO_USER_ID` | デモの通知先 | LINE Developers > チャネル基本設定 > あなたのユーザーID |
| `GOOGLE_CLOUD_PROJECT` | Calendar / Sheets 利用時のみ | Google Cloud コンソール |

**`.env` は絶対に Git にコミットしないでください。** 未設定の変数は起動時にログへ警告が出ます（`GET /healthz` でも確認できます）。

---

## API

| メソッド | パス | 内容 | Phase |
|---|---|---|---|
| GET | `/` | デモ画面 | 1 |
| GET | `/healthz` | 動作確認・未設定の環境変数一覧 | 1 |
| GET | `/api/users` | デモ用ユーザーと体験候補 | 1 |
| POST | `/api/gemini/test` | Gemini 疎通確認（発表者用） | 2 |
| POST | `/api/line/test` | LINE に「Hello from Personal AI Secretary」を送信（発表者用） | 3 |
| POST | `/api/match` | マッチング生成 + LINE 提案送信（発表者用デモトリガー） | 4 |
| POST | `/line/webhook` | LINE Webhook（Postback: accept / decline） | 6 |

> `/api/match` などの発表者用ボタンは本番のユーザー機能ではありません。本番では Cloud Scheduler 等から自律的に起動する想定です。

---

## Cloud Run へのデプロイ

Dockerfile は使わず、Buildpacks によるソースデプロイを使います（`gcp-build` スクリプトで TypeScript をビルド）。

### 1. gcloud にログイン

```bash
gcloud auth login
```

### 2. プロジェクトを選択

```bash
gcloud config set project <PROJECT_ID>
```

### 3. 必要な API を有効化

```bash
gcloud services enable run.googleapis.com cloudbuild.googleapis.com artifactregistry.googleapis.com
```

### 4. 環境変数ファイルを用意

`env.yaml`（`.gitignore` 済み）を作成します。

```yaml
GEMINI_API_KEY: "xxxx"
GEMINI_MODEL: "gemini-2.5-flash"
LINE_CHANNEL_ACCESS_TOKEN: "xxxx"
LINE_CHANNEL_SECRET: "xxxx"
LINE_DEMO_USER_ID: "Uxxxx"
```

### 5. デプロイ

```bash
gcloud run deploy personal-ai-network \
  --source . \
  --region asia-northeast1 \
  --allow-unauthenticated \
  --env-vars-file env.yaml
```

完了すると `https://personal-ai-network-xxxx.asia-northeast1.run.app` のような URL が表示されます。

### 6. LINE Webhook URL を設定

LINE Developers > Messaging API 設定で以下を設定します。

- Webhook URL：`https://<Cloud Run の URL>/line/webhook`
- Webhook の利用：ON
- 「検証」ボタンで成功することを確認
- LINE Official Account Manager で「応答メッセージ」を OFF

---

## 事前準備チェックリスト

- [ ] Google Cloud プロジェクト（課金有効）
- [ ] gcloud CLI のインストールとログイン
- [ ] Gemini API キー
- [ ] LINE Messaging API チャネル作成（アクセストークン・シークレット・ユーザーID）
- [ ] 自分の LINE で Bot を友だち追加
