# CLAUDE.md

ハッカソン用プロトタイプ「2036 Personal AI Network」。仕様の原本は `BRIEF.md`、作業記録は `JOURNAL.md`、構成と手順は `README.md`。

## 現状（2026-09-14）

- ハッカソンは一次審査で落選し、終了した。
- **Cloud Run のサービス、Artifact Registry のイメージ、Cloud Storage のソースバケットは削除済み。** 本番 URL は存在しない。再開するときは、下のデプロイ手順でデプロイし直す（URL は変わる可能性があるので、LINE の Webhook URL も設定し直す）。
- `src/data/users.json` の `lineUserId` は4人とも空にした。複数人に送るには、Webhook のログから ID を取り直す必要がある。
- GCP プロジェクト、Gemini API キー、LINE チャネル（MukoBot）は残っている。

## 作業記録（必ず守る）

- **何か作業をしたら、そのたびに `JOURNAL.md` に記録する。** 後からやってきたことを追えるようにするため。
- 対象は、コード実装、設定変更、デプロイ、外部サービスの設定、調査、トラブルと解決策、方針の決定など、プロジェクトに関わる作業すべて。
- 書き方：その日の日付見出し（`## YYYY-MM-DD`）の下に番号付きの小見出しで追記する。日付が変わったら新しい見出しを作る。
- 書く内容：やったこと、決めたことと理由、確認結果、ハマったことと解決策。末尾の「この時点で残っていること」も最新の状態に更新する。
- 作業の報告をする前に記録を済ませる。

## 最優先の原則

- **審査員の前で確実に動くデモを成立させること**が最優先。迷ったら機能を削ってでも「動くこと」を取る。
- 審査は「価値 / 実現性 / 新規性 / AIの活かし方 / 展開性」の5項目（各1〜5点）。同点なら「実現性」、次に「価値」で比べる。つまり機能の数よりデモの安定が大事。
- 完成条件（BRIEF §21）を満たしたら、追加機能より**デモの安定化**を優先する。
- **一度に全部作らない。** Phase 順に、各 Phase で動作を確認してから次へ進む。
  1. Cloud Run で Hello World → 2. Gemini 接続 → 3. LINE Push → 4. ユーザー JSON と Gemini でマッチング → 5. デモ画面の AI秘書ログ → 6. LINE で承認 → 7. 余裕があれば Calendar / Sheets / Flex Message
- 各 Phase の終わりに「実装した内容」「動作確認の方法」「次へ進む前に人間が確認すべきこと」を示す。
- 最新の進捗は `README.md` の「開発フェーズと進捗」表と `JOURNAL.md` を見る。

## 世界観（実装で崩さないこと）

- コアメッセージ：**探さない。頼まない。AIが機会を連れてくる。**
- 一般ユーザーは「AIを起動する」操作をしない。`/api/match` などのボタンは**発表者用のデモ開始トリガー**であり、ユーザー向け機能として作ったり書いたりしない。本番では Cloud Scheduler 等から自律的に起動する想定。
- 一般ユーザーとの接点は LINE。Web 画面は発表者・開発者向けのデモ／管理画面。
- 「Gemini におすすめを聞くアプリ」ではない。AI秘書が、ユーザーを理解する → 空き時間を把握する → 他人の条件と照合する → 体験を組み立てる → 最終提案だけを人間に届ける。
- 画面の「AI秘書ログ」は、ユーザー向けに生成した**判断サマリー**。実際の Chain of Thought は表示しない。
- 裏で複数の LLM を並列に動かす必要はない。1回または少数回の Gemini 呼び出しで、秘書同士の調整を表現してよい。
- UI は未来感を出しつつ派手すぎないトーンにする。「マッチングアプリ」らしい見た目にしすぎない。

## 実装ルール

- シンプル・読みやすい・すぐ直せる・すぐデプロイできる、を優先する。Clean Architecture、複雑な DI、本格的な認証、過剰なテストや抽象化は入れない。
- データは固定 JSON（`src/data/`）。DB を作るせいでデモ完成が遅れるなら作らない。
- Gemini の出力は必ず JSON（structured output / responseSchema を使う）。形は `src/types.ts` の `MatchResult`（BRIEF §10 に AI秘書ログ `logs` を足したもの）。
- Gemini / LINE の API エラーは、原因がわかる形でサーバーログに出す。
- **`src/data/users.json` には実在の LINE ユーザーIDが入る。GitHub には絶対に上げない。** `git update-index --skip-worktree` を設定してあるので `git add -A` でも入らないが、解除したり、`git add -f` などで強制的に追加したりしない。push 前には `git diff --cached --name-only` に `users.json` がないことを確認する。
- 秘密情報をソースコードに書かない。`.env` と `env.yaml` は Git 管理外。環境変数を増やすときは `.env.example` と `src/config.ts` を両方更新する。
- 未実装の関数は `NotImplementedError` を投げる（サーバーが 501 を返す）。実装箇所には `TODO(Phase N)` コメントがある。

## 環境・コマンド

- Windows 11。Node.js 22。PowerShell と Git Bash の両方が使える。
- `npm run dev`（tsx watch、http://localhost:8080）/ `npm run build` / `npm start`
- GCP プロジェクト：`personal-ai-network-508503`、リージョン `asia-northeast1`、サービス名 `personal-ai-network`
- デプロイ（Dockerfile なし、Buildpacks。`gcp-build` で tsc が走る）：
  ```bash
  gcloud run deploy personal-ai-network --source . --region asia-northeast1 --allow-unauthenticated --quiet
  ```
  環境変数を渡すときは `--env-vars-file env.yaml` を足す。
- 本番 URL：（サービス削除済み。旧 URL は https://personal-ai-network-1005286368657.asia-northeast1.run.app）
- GitHub：https://github.com/htanijiri/personal-ai-network（公開リポジトリ。push 前に秘密情報がないか確認する）

## 注意点

- Cloud Run では **`/healthz` など末尾が `z` のパスが Google のフロントエンドに予約されていてアプリに届かない**。動作確認用のパスは `/health`。
- Gemini のモデルは `gemini-3.6-flash`。`gemini-2.5-flash` は新規ユーザーには使えない（404）。モデルを変えるときは、使えるモデルを API の `models.list()` で一覧して確認してから `GEMINI_MODEL` を変える。
- 本番の API を curl で POST するときは `-H "Content-Type: application/json" -d '{}'` を付ける。本文なしだと Google のフロントエンドが 411 を返す。
- LINE の提案文は、Gemini が参加者ごとに作る（`notifications`）。宛先は `lineUserId`、空なら `LINE_DEMO_USER_ID`。同じ宛先には1通だけ送る（`src/match.ts` の `planNotifications`）。
- デモ画面は `/api/match` に `{"notify": false}` を渡してログを表示し、表示し終えてから `/api/line/push` で送る（画面の後にスマホが鳴る演出）。この順番を崩さない。
- Gemini の文字列を画面に出すときは、必ず `escapeHtml` を通す。
- HTML や CSS をまとめて書くときは、Git Bash のヒアドキュメントではなく Write ツールを使う（ヒアドキュメントを続けると構文解釈エラーになったことがある）。
- 画面の確認は、スクラッチパッドの puppeteer-core ＋ インストール済みの Chrome（`C:\Program Files\Google\Chrome\Application\chrome.exe`）で行える。LINE 送信はモック応答にして、スマホへの通知を増やさない。
- **LINE のユーザーIDはプロバイダーごとに違う。** 別のプロバイダーや別の Bot で取得した ID には、MukoBot（ベーシックID `@245wynrk`）から送れない（400「Failed to send messages」）。フォロワー一覧 API は 403 で使えない。MukoBot 用の ID は、Webhook のログから取る（Bot にメッセージを送ってもらい、`[line/webhook] event=message userId=…` と本文で見分ける）。
- 仕組みとしては、`users.json` に ID を入れれば、マッチした人それぞれの LINE に本人向けの提案が届く（3人への送信を確認済み）。今は ID をすべて空にしてあるので、提案は `LINE_DEMO_USER_ID`（発表者）宛ての1通になる。
- Webhook（`/line/webhook`）は署名検証をしておらず、ログに出すだけ。サービス削除後は送り先がないので、LINE 側の「Webhook の利用」は OFF にしておく。
- LINE Webhook（`/line/webhook`）は署名検証のため `express.raw()` で受ける。`express.json()` より前に登録する順番を崩さない。
