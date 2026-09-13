# 開発ジャーナル

ハッカソン「2036 Personal AI Network」の作業記録。新しい作業は日付ごとに下へ追記する。

---

## 2026-09-13

### 1. BRIEF.md の確認・方針決定

- BRIEF.md を読み、実装方針 / 作成予定ファイル / Phase 1〜6 の順序 / 人間側の事前準備を整理した。
- 方針：Node.js 22 + TypeScript + Express の単一アプリ。データは固定 JSON。Gemini は structured output で JSON を返させ、AI秘書ログも同じ呼び出しで生成する（1回で済ませる）。デモ画面は素の HTML/JS。Cloud Run には Dockerfile なしのソースデプロイ。

### 2. プロジェクトの雛形を作成

- 作成したもの：`package.json` / `tsconfig.json` / `.gitignore` / `.gcloudignore` / `.env.example` / `README.md`、`src/`（`server.ts` `config.ts` `types.ts` `errors.ts` `gemini.ts` `line.ts` `match.ts`）、`src/data/`（`users.json` `activities.json`）、`public/`（`index.html` `style.css` `app.js`）。
- 依存パッケージ：`express` `@google/genai` `@line/bot-sdk` `dotenv`。開発用：`typescript` `tsx` `@types/express` `@types/node`。
- 決めたこと：
  - 未実装の関数は `NotImplementedError` を投げ、サーバーが「まだ実装されていません（Phase N）」付きの 501 を返す。実装箇所には `TODO(Phase N)` コメントを付けた。
  - `/line/webhook` は署名検証に生の body が要るので、`express.json()` より前に `express.raw()` で登録した。未実装でも LINE の「検証」が通るよう 200 を返す。
  - デモ用ユーザーは BRIEF の3人（Hiroshi / Aさん / Bさん）に、条件の合わない「Cさん」（午前のみ空き・囲碁・神奈川・初対面NG）を追加した。AI がマッチ対象を選び、外している様子を見せるため。
  - 各ユーザーの `lineUserId` が空なら `LINE_DEMO_USER_ID` に送る（デモでは1台のスマホに全員分の通知が届く）。
  - `gcp-build` スクリプトで、Cloud Run のビルド時に TypeScript をビルドする。
- ローカルで確認：ビルド成功。`/`、`/api/users`、Webhook は 200、Gemini・マッチング API は想定どおり 501。

### 3. GitHub にアップロード

- `git init -b main` し、初回コミット `51d6b28`。
- 公開リポジトリを作成して push：https://github.com/htanijiri/personal-ai-network
- push 前に API キーやトークンらしき文字列がないか検索し、該当なしを確認した。
- 未対応：コミットの作者メールが個人アドレス（git の global 設定のもの）のまま公開されている。気になれば GitHub の noreply アドレスに差し替える。

### 4. gcloud CLI をインストール

- `winget install Google.CloudSDK` で Google Cloud SDK 584.0.0 を入れた。
- インストール先：`C:\Users\tanij\AppData\Local\Google\Cloud SDK\`（PATH に登録済み。反映には VS Code の再起動が必要だった）。
- ユーザーが `gcloud auth login` し、Google Cloud コンソールでプロジェクトを作成・選択した。

### 5. Phase 1：Cloud Run にデプロイ

- プロジェクト：`personal-ai-network-508503`（課金は有効）
- API を有効化：`run` / `cloudbuild` / `artifactregistry`
- デプロイ：
  ```bash
  gcloud run deploy personal-ai-network --source . --region asia-northeast1 --allow-unauthenticated --quiet
  ```
- URL：https://personal-ai-network-1005286368657.asia-northeast1.run.app
- **ハマったこと**：`/healthz` だけ 404（Google のエラーページ）になった。Cloud Run では末尾が `z` のパスが Google のフロントエンドに予約されていて、アプリまで届かない。`/health` に名前を変えて再デプロイし、解決した（リビジョン `personal-ai-network-00002-pwx`）。
- 確認：`/`、`/health`、`/api/users`、CSS/JS、Webhook がすべて 200。サーバーログに起動メッセージと未設定の環境変数の警告が出ている。
- README の Phase 1 を「✅ Cloud Run デプロイ確認済み」に更新した。

### 6. 作業記録のルールを決めた

- `JOURNAL.md`（この作業記録）と `CLAUDE.md`（BRIEF から大事な点を抜き出したもの：最優先の原則、世界観、実装ルール、環境・コマンド、注意点）を作成した。
- ユーザーの指示で、**今後は何か作業をするたびに JOURNAL.md に記録する**ことにした。`CLAUDE.md` の先頭近くに「作業記録（必ず守る）」セクションとして明記した。

### 7. Phase 2：Gemini 接続（実装済み、クレジット不足で確認待ち）

- ユーザーが Gemini API キーを `.env` に設定した（値は表示せずに、設定済みであることと `.env` が Git 管理外であることだけ確認）。
- `src/gemini.ts` の `askGemini` を実装した。
  - `@google/genai` 2.22.0 の `GoogleGenAI` → `models.generateContent` → `response.text`。
  - クライアントは初回だけ作って使い回す。キーが未設定なら、原因がわかるメッセージのエラーを投げる。
  - 成功時はモデル名と所要時間、失敗時は API のエラー内容をサーバーログに出す（`callGemini`）。Phase 4 のマッチングでもこの関数を使う。
- Cloud Run 用の `env.yaml` を `.env` から自動生成した（空の値は除外。現状は `GEMINI_API_KEY` と `GEMINI_MODEL` の2つ）。Git 管理外であることを確認。
- **ハマったこと①：モデルが使えない**
  - `gemini-2.5-flash` は 404「no longer available to new users」。
  - API でこのキーが使えるモデルを一覧し、案内どおり `gemini-3.6-flash` が使えることを確認した（ほかに `gemini-3.7-flash` / `gemini-3.8-flash` もある）。
  - `src/config.ts` の既定値、`.env.example`、`README.md`、`.env`、`env.yaml` を `gemini-3.6-flash` に変えた。
- **ハマったこと②：クレジット不足（未解決）**
  - `gemini-3.6-flash` で呼ぶと 429 `RESOURCE_EXHAUSTED`「Your prepayment credits are depleted」。
  - API キーは有効で、モデルにも届いている。キーが紐づく AI Studio のプロジェクトで、前払いクレジットの残高が 0 になっている。
  - ユーザーが AI Studio（https://ai.studio/projects）でプロジェクトの課金設定かクレジットを確認する必要がある。
- ローカルのビルドは成功。Cloud Run への反映は、疎通が確認できるまで保留にした。

### 8. Phase 2 完了：クレジット補充後に疎通確認し、Cloud Run に反映

- ユーザーが AI Studio で前払いクレジットをチャージし、429 は解消した。
- ローカルで `POST /api/gemini/test` → 200。Gemini（`gemini-3.6-flash`）の返答が返ってきた（所要 6.4 秒）。
- `--env-vars-file env.yaml` を付けて Cloud Run に再デプロイした（リビジョン `personal-ai-network-00003-9js`）。
  - `/health` の未設定の環境変数は LINE の3つだけになり、Gemini の環境変数が反映されていることを確認した。
  - 本番の `POST /api/gemini/test` → 200。返答が返ってきた。
- **ハマったこと**：本番に curl で本文なしの POST を送ると、Google のフロントエンドが 411（Content-Length が必要）を返す。`-H "Content-Type: application/json" -d '{}'` を付ければ通る。ブラウザの fetch は POST のとき `Content-Length: 0` を自動で付けるので、デモ画面のボタンには影響しない。
- README の Phase 2 を「✅ Cloud Run で疎通確認済み」に更新した。

### この時点で残っていること

- [ ] 次の変更をまだコミット・push していない：`/health` への変更、README 更新、`JOURNAL.md` と `CLAUDE.md` の追加、Gemini の実装とモデル名の変更、README の Phase 2 更新
- [ ] Phase 3 に向けて：LINE Messaging API チャネルを作成（アクセストークン・シークレット・ユーザーID、友だち追加、応答メッセージ OFF）
- [ ] LINE の値を `.env` に入れたら `env.yaml` にも追加して再デプロイする（`env.yaml` は Git 管理外）
