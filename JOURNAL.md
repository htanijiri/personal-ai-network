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

### 9. ここまでを GitHub に push

- コミット `8c73b91`「Deploy Phase 1-2: Cloud Run deploy and Gemini connection」を作り、`main` に push した。
- 対象は7ファイル：`.env.example`、`CLAUDE.md`（新規）、`JOURNAL.md`（新規）、`README.md`、`src/config.ts`、`src/gemini.ts`、`src/server.ts`。
- push 前に、`.env` と `env.yaml` がステージされていないこと、差分に API キーやトークンらしき文字列がないことを確認した。
- この記録（項目9）自体は、次回のコミットで反映する。

### 10. Phase 3：LINE Push

- ユーザーが LINE Messaging API のチャネルを設定し、`.env` に `LINE_CHANNEL_ACCESS_TOKEN` / `LINE_CHANNEL_SECRET` / `LINE_DEMO_USER_ID` を入れた（値は表示せず、設定済みであること・長さ・ユーザーIDが U から始まることだけ確認）。
- `src/line.ts` の `pushText` を実装した。
  - `@line/bot-sdk` 11.2.0 の `messagingApi.MessagingApiClient({ channelAccessToken })` → `pushMessage({ to, messages })`。
  - クライアントは初回だけ作って使い回す。トークンや送信先が空なら、原因がわかるメッセージのエラーを投げる。
  - 共通の `push()` で、成功時は宛先の先頭5文字だけ、失敗時は API のエラー内容をサーバーログに出す。Phase 4・6 の提案送信でも `push()` を使う。
- `env.yaml` を `.env` から作り直した（Gemini 2つ + LINE 3つの計5つ。Git 管理外）。
- ローカルで `POST /api/line/test` → 200、ログは `[line] push ok`。`/health` の未設定の環境変数は 0 件。
- `--env-vars-file env.yaml` を付けて Cloud Run に再デプロイした（リビジョン `personal-ai-network-00004-4zv`）。本番でも `/health` の未設定は 0 件、`POST /api/line/test` → 200。
- ローカルと本番から1通ずつ、合計2通の「Hello from Personal AI Secretary」を送った。スマホに届いたかはユーザーに確認してもらう。
- README の Phase 3 を「✅ Cloud Run から送信確認済み（着信はユーザー確認待ち）」に更新した。

### 11. Phase 3 完了：スマホで着信を確認

- ユーザーのスマホに「Hello from Personal AI Secretary」が2通（ローカル・本番から1通ずつ）届いたことを確認した。
- 本番のデモ画面の「LINE Push 疎通確認」ボタンからも、もう1通届いた。ブラウザからの POST も問題なし。
- README の Phase 3 を「✅ スマホで着信確認済み」に更新した。

### 12. Phase 4：ユーザー JSON と Gemini でマッチング

- `src/types.ts`：`MatchResult` に `notificationText`（LINE で本人に届ける提案文）を追加した。BRIEF §9 の「LINE 通知用の自然な文章生成」も Gemini に任せるため。
- `src/gemini.ts`：`generateMatch` を実装した。
  - `responseMimeType: "application/json"` と `responseSchema`（`Type` で `MatchResult` と同じ形を定義）で、JSON を返させる。
  - `propertyOrdering` で `logs` を先頭にし、調整ログを書いてから結論の項目を出させる。
  - プロンプトには、判断のルール（空き時間の重なりと所要時間、趣味、人数の範囲、初対面の可否、エリア）と、各項目の書き方を含めた。`lineUserId` は渡さない。
  - 「明日」がずれないよう、最初の空き時間の前日を「現在」としてプロンプトに入れる（デモ当日の日付に左右されない）。
  - 通知文は `users[0]`（Hiroshi = デモで LINE を受け取る本人）向けに書かせ、参加者に必ず含める。
  - 応答の検証：JSON として読めなければ生の応答をログに出してエラー。存在しないユーザーIDは除外し、2人未満ならエラー。
  - 共通の `callGemini` が `GenerateContentConfig` を受け取れるようにした。
- `src/line.ts`：`pushMatchProposal` を最小実装にした（`notificationText` をテキストで Push）。ボタンは Phase 6 で付ける。
- `src/match.ts` は変更なし。マッチした3人の `lineUserId` が空なので、`LINE_DEMO_USER_ID` にまとめて1通だけ届く。
- ローカルで `POST /api/match` → 200。
  - 結果：Hiroshi / Aさん / Bさん の3人で、明日（9/14）14:00〜16:00、渋谷でカラオケ。confidence 0.95。
  - Cさんは「午前中の空き時間のみで初対面不可のため見送り」と、ログで理由付きで外れた。狙いどおり。
  - 通知文：「明日14:00、渋谷で音楽好きの3人とカラオケはいかがですか？」＋理由3つ。LINE の Push も成功。
  - **Gemini の応答に約17.5秒かかった。** Phase 5 の画面では、待ち時間の演出（「調整中…」表示など）が必要。

### 13. Phase 4：Cloud Run に反映して本番で確認

- `--env-vars-file env.yaml` を付けて再デプロイした（リビジョン `personal-ai-network-00005-69d`）。
- 本番で `POST /api/match` → 200（約15秒）。
  - ローカルと同じく、Hiroshi / Aさん / Bさん で明日14:00〜16:00、渋谷でカラオケ（confidence 0.95）。Cさんは理由付きで見送り。2回とも同じ結論になり、デモでの再現性は良さそう。
  - 通知文の1行目は「明日14:00、渋谷でKing Gnu好きの3人とカラオケはいかがですか？」で、BRIEF の例とほぼ同じ。
- ログの言い回しは実行ごとに少し変わる（「Hiroshiは」「Hiroshi様は」など）。気になるなら Phase 5 でプロンプトの口調を固定する。
- ローカルと本番から1通ずつ、合計2通の提案を LINE に送った。
- README の Phase 4 を「✅ Cloud Run で確認済み（テキスト通知）」に更新した。

### 14. Phase 4 完了：スマホで提案メッセージの着信を確認

- ローカルと本番から送った提案メッセージが、スマホに2通とも届いたことをユーザーが確認した。

### 15. Phase 5：デモ画面（AI秘書ログ・成立結果・待ち時間の演出）

- **LINE 送信のタイミングを変えた**：画面でログが流れ終わってからスマホが鳴る方が、デモとして伝わるため。
  - `src/match.ts`：`runMatching`（Gemini だけ）と `notifyMatch`（LINE 送信。宛先の数を返し、0件ならエラー）に分けた。
  - `src/server.ts`：`POST /api/match` は body に `{"notify": false}` があれば送らない（curl から呼んだときは従来どおりすぐ送る）。`POST /api/line/push` を追加し、body の `match` を送る（形がおかしければ 400）。
- **画面（`public/index.html` / `style.css` / `app.js`）を作り直した**：
  - ヘッダー右に状態表示（待機中 → 探索中 → 調整中 → LINE 送信中 → 届けました／エラー）。
  - ユーザーカード：探索中は枠が明滅し、ログを話している秘書のカードを強調する。終わったら参加者は強調、不参加（Cさん）は薄く表示。
  - AI秘書ログ：Gemini の応答を待つ間は「各AI秘書に問い合わせています...」を表示。結果が来たら1件ずつ（`LOG_INTERVAL_MS` = 1.2秒間隔）表示し、Secretary Network のログは強調する。
  - 成立結果：確信度、活動、誰と／いつ／どこで／なぜ、共通の話題（事前ブリーフィング）、LINE 送信状況。
  - 発表者用コントロールは `<details>` で閉じておき、審査員に見せない。キーボードの `S` で開始、`R` でリセットできる（閉じたままでも効く）。
  - Gemini の文字列は `escapeHtml` を通してから表示する。動きを減らす設定（prefers-reduced-motion）ではアニメーションを止める。
- **ハマったこと**：Git Bash のヒアドキュメントで HTML と CSS を2つ続けて書き出したら、構文解釈エラーで何も書かれなかった。この2ファイルは Write ツールで書いた。
- **ヘッドレス Chrome で画面を確認**：
  - スクラッチパッドに puppeteer-core を入れ、`S` キーで開始 → 各段階のスクリーンショット、JS エラー、スマホ幅（400px）での横はみ出しを確認した。LINE 送信はスマホに通知が増えないよう、モック応答にした。
  - ローカル：18.7秒で完了。3人強調・Cさん薄表示・リセット OK・横はみ出し 0px。
  - 見つけて直したこと：
    - `favicon.ico` の 404 → `<link rel="icon" href="data:,">` を追加した。
    - ログで Hiroshi の空き（13:00〜18:00）が「14〜18時」になっていた、「様」が付くことがある → プロンプトに「敬称を足さない」「空き時間などの事実はデータのとおり正確に書く」を追加した。
- 再デプロイした（リビジョン `personal-ai-network-00006-qpp`）。本番 URL でも同じテストを実行。
  - 24.6秒で完了（最初のログまで17.9秒）。JS エラーは0件。
  - ログは「Hiroshiは13:00〜18:00が空いており…」のように正確で、敬称も統一された。
- 実機ブラウザでのボタン操作と、実際の LINE 着信（ログ表示の後に届くか）は、ユーザーに確認してもらう。

### 16. 参加者それぞれの LINE に、本人向けの提案を送れるようにした

- **決めたこと（ユーザーの判断）**：
  - ハッカソンのデモなので、2〜3人の実際の LINE に送れればよい。
  - Webhook（Postback による承認）はデモの対象外。
  - 参加者の LINE ユーザーIDは `users.json` に直接入れ、GitHub には上げない。IDはユーザーが LINE Developers 経由で取得済み。
- **GitHub に上げない仕組み**：`git update-index --skip-worktree src/data/users.json` を設定した。ローカルで ID を書いても `git add -A` の対象にならない。Cloud Run のソースデプロイではローカルのファイルが使われる。
- **Gemini の出力を変えた**：`notificationText`（Hiroshi 向けの1通）を `notifications: [{ userId, text }]`（参加者ごと）に変えた。
  - プロンプトでは「理由はその人自身の空き時間・趣味・対人の好みに合わせて書く」と指示した。
  - `src/types.ts` に `MatchNotification` を追加した。
- **送信の振り分け**（`src/match.ts`）：`planNotifications` を追加した。
  - 参加者ごとに、宛先（`lineUserId`、空なら `LINE_DEMO_USER_ID`）と文面を決める。
  - 同じ宛先には1通だけ送る（`users.json` で先に並んでいる人の文面を使う）。
  - Gemini がある人の文面を返さなかったら、最初の文面で代用する（デモ中に送信が止まらないように）。
  - `notifyMatch` はこの結果に従って送る。`pushMatchProposal(to, text)` は文面を受け取る形にした。`/api/line/push` のチェック項目も `notifications` に変えた。
- **Webhook のログ**：受け取ったイベントごとに `event=… userId=…` を出すようにした（ID 取得用。今回は ID 取得済みなので使わないが、残しておく）。
- **ローカルで確認**（LINE には送っていない）：
  - `/api/match`（notify:false）：3人それぞれの文面が返った。理由が本人に合わせて変わった（Hiroshi「13:00〜18:00の空き時間にぴったり」、Aさん「14:00〜17:00の空き時間内で無理なく」、Bさん「少人数（3人）での心地よい交流」）。
  - `planNotifications`：ID が空の今は発表者宛ての1通だけ。ID を入れた想定では3人がそれぞれの宛先に分かれた。文面が欠けた場合も代用で送れた。
  - Webhook に follow/message イベントを送ると `event=follow userId=…` がログに出た。
- README に「参加者それぞれの LINE に送る」節を、CLAUDE.md に「users.json を GitHub に上げない」ルールを追記した。

### 17. デモユーザー「Hiroshi」を「Dさん」に変えた

- ユーザーの指示で、`users.json` の先頭ユーザーを `id: "hiroshi"` / `displayName: "Hiroshi"` から `id: "userD"` / `displayName: "Dさん"` に変えた。空き時間・趣味などの中身と並び順（先頭）はそのまま。
  - 先頭のユーザーは、プロンプトで「必ず参加者に含める」人（デモの発表者役）なので、今後は Dさんがその役になる。
  - `lineUserId` には触れていない（この時点では4人とも空）。
  - `users.json` は skip-worktree のため、この変更も GitHub には上がらない（GitHub 上は Hiroshi のまま）。
- プロンプトの敬称の例（`src/gemini.ts`）と、`src/types.ts` のコメントの例も「Dさん」に変えた。ビルドは成功。
- BRIEF.md（元の仕様書）と、この JOURNAL の過去の記録は変えていない。

### 18. 参加者の実 ID で本番テスト → Aさん宛てだけ送信失敗

- ユーザーが `users.json` の `lineUserId` に ID を入れた。値は表示せずに確認：Dさん・Aさん・Bさんは正しい形式（`U` + 32桁の16進数）、重複なし。Dさんの ID は `LINE_DEMO_USER_ID` と同じ。Cさんは空。`git status` に `users.json` が出ないことも確認した。
- 再デプロイした（リビジョン `personal-ai-network-00007-459`）。
- 画面テストのスクリプトに `REAL_LINE=1` を足し、LINE 送信を止めない（実際に送る）モードを追加した。本番でこのモードを実行した。
  - Gemini：Dさん・Aさん・Bさんでカラオケ（渋谷 14:00〜16:00）、Cさんは見送り。ログは「Dさんは13時から18時まで…」のように正確だった。
  - LINE：画面に「LINE 送信エラー: 400 - Bad Request」が出た。
- **Cloud Run のログで原因を調べた**：
  - Dさん宛て → `push ok`（届いたはず）
  - Aさん宛て → 400、LINE の返答は `{"message":"Failed to send messages"}`
  - Bさん宛て → 送っていない（Aさんの失敗で処理が止まった）
  - 「Failed to send messages」は、その ID にこの Bot から送れないときのエラー。考えられる原因は、Aさんが Bot を友だち追加していない（またはブロックしている）か、ID が別のチャネル／プロバイダーで取得したものか（LINE のユーザーIDはプロバイダーごとに違う）。ユーザーに確認してもらう。
- **対策：1人が失敗しても残りの人には送るようにした**（デモ中に止めないため）。
  - `src/match.ts`：`notifyMatch` は宛先ごとに try/catch し、`[{ userId, ok, error }]` を返す。失敗した人はログに「提案の送信に失敗: userA（Bot を友だち追加しているか…確認）」と出す。全員失敗したときだけエラーにする。
  - `src/server.ts`：`/api/match` と `/api/line/push` の `notified` を、件数から結果の配列に変えた。
  - `public/app.js`：一部が失敗したら「2件送信 ・ 送れなかった人：Aさん」のように表示する。

### 19. 送信の部分失敗への対策を Cloud Run に反映

- ローカルでビルド成功を確認し、再デプロイした（リビジョン `personal-ai-network-00008-p6n`）。
- 本番での実際の送信テストは、まだ再実行していない。ユーザーから「Bot の友だち追加の方法」を質問されたため、Aさん（と、未送信の Bさん）が友だち追加を済ませてから、1回だけ実行する方針にした（LINE の送信数を無駄にしないため）。

### 20. Bot の友だち追加の方法を調べた

- LINE API の `getBotInfo` で Bot の情報を取得した：表示名「MukoBot」、ベーシックID `@245wynrk`、chatMode は bot。
- 友だち追加用の URL：https://line.me/R/ti/p/%40245wynrk（QR コードは LINE Developers の「Messaging API設定」タブにある）。
- フォロワー一覧 API（`getFollowers`）は 403（このアカウント種別では使えない）。友だち追加されたかを API では確認できないので、Webhook のログ（follow イベント）か、実際の送信結果で確かめる。
- ユーザーに、他の人へ友だち追加してもらう方法と、ID の取り方の注意点を案内した。

### 21. デモでは Dさん（発表者）にだけ LINE を送ることにした

- 分かったこと：以前にユーザーが取得した Aさん・Bさん・Cさんの ID は、MukoBot とは別のプロバイダーから見た ID だった。LINE のユーザーIDはプロバイダーごとに違うので、MukoBot からは送れない（Aさん宛ての「Failed to send messages」の原因）。
- Webhook 以外で MukoBot 用の ID を取る方法は、同じプロバイダーの LINE ログイン（LIFF）だけ。フォロワー一覧 API は 403 で使えない。
- **決めたこと（ユーザーの判断）**：
  - ID の取得はデモに間に合わないのでやめる。**デモでは Dさん（発表者の LINE）にだけ届けばよい。**
  - **一次審査を通過したら、実機デモのために LIFF ページで参加者の ID を取得して確認する。**
- `users.json` の Aさん・Bさん・Cさんの `lineUserId` を空に戻した（値は表示していない）。空の人は `LINE_DEMO_USER_ID` 宛てになり、同じ宛先はまとめるので、Dさん本人向けの文面が1通だけ届く。Dさんの ID は入ったまま（`LINE_DEMO_USER_ID` と同じ）。
- 参加者ごとの文面作成と、部分失敗への対策の仕組みはそのまま残す（LIFF で ID が揃えば、そのまま使える）。

### 22. Dさんだけに送る構成で、本番の実送信テストに成功

- `users.json` の変更を反映して再デプロイした（リビジョン `personal-ai-network-00009-jpk`）。CLAUDE.md に「LINE ID はプロバイダーごとに違う」「今は Dさんにだけ送る構成」「一次審査通過後に LIFF で確認する予定」を追記した。
- 本番でデモ画面を Chrome で開き、`S` キーで開始した（`REAL_LINE=1` で LINE 送信を止めずに実行）。
  - 24.5秒で完了（最初のログまで17.7秒）。画面は「✓ 参加者の LINE に提案を届けました」、JS エラーは0件。
  - ログ：Dさん「13〜18時が空いており…」、Aさん、Bさん、Cさん（見送り）、Secretary Network（Dさん・Aさん・Bさんの3名で14時から渋谷でカラオケ）。
- Cloud Run のログで、この実行の送信は `push ok (to=Ueeab…)` → `提案を送信: userD` の1件だけだったことを確認した。
- 同じログに、05:34 に別の実行（リビジョン 00008 で、Aさん・Bさんの ID が入っていたとき。おそらくユーザーが画面から実行したもの）で「提案の送信に失敗: userB」が出ていた。部分失敗しても処理が止まらない対策が、本番で実際に働いたことも確認できた。
- その後ユーザーから「Webhook URL の設定に審査がないなら、Webhook で ID を取ってみたい」と言われたので、手順を案内した（→ 次の項目で結果を記録する）。

### 23. Webhook URL の設定を API で確認・検証した

- ユーザーは LINE Official Account Manager の画面で Webhook URL を保存した。その画面には「検証」ボタンがない。
- LINE API で状態を確認した：
  - `getWebhookEndpoint`：URL は `https://personal-ai-network-1005286368657.asia-northeast1.run.app/line/webhook` で保存済み。ただし **`active: false`（Webhook の利用が OFF）**。
  - `testWebhookEndpoint`（「検証」ボタンと同じ）：`success: true`、statusCode 200。LINE から Cloud Run の Webhook に届くことを確認した。
- 利用の ON/OFF は API では切り替えられないので、ユーザーに画面で ON にしてもらう（Official Account Manager の「応答設定」→ Webhook、または LINE Developers の「Messaging API設定」→「Webhookの利用」）。

### 24. Webhook の利用を ON にした

- ユーザーが Webhook の利用を ON にした。`getWebhookEndpoint` で `active: true` を確認した。
- 次は、Aさん・Bさん・Cさんに MukoBot へ名前が分かるメッセージを送ってもらい、Cloud Run のログの `[line/webhook] event=message userId=…` と本文から ID を取得する。

### 25. Webhook で Cさんの ID を取得した

- Cさんが MukoBot に「Cです」と送った。
- スクラッチパッドに ID 取り出し用のスクリプト（`extract-line-ids.js`）を作った。
  - Cloud Run のログをファイルに書き出し、`[line/webhook] received` の本文から送り主の userId と本文を取り出す。
  - `getProfile` で LINE の表示名を照合する。
  - 画面には ID を伏せ字で出し、全体はスクラッチパッドの `line-ids.json` にだけ保存する。
- 結果：`U80ac…685`、本文「Cです」、プロフィールの表示名も取得できた（MukoBot の友だちであることも確認できた）。`LINE_DEMO_USER_ID`（Dさん）とは別の ID。
- `users.json` の Cさんの `lineUserId` に入れた（GitHub には上がらない）。再デプロイは、Aさん・Bさんの ID がそろってから1回で行う。
- 補足：デモの結果では Cさんは「見送り」になるので、この ID に提案が届くのは Cさんがマッチしたときだけ。

### 26. Webhook で Aさんの ID を取得した

- Aさんが MukoBot に「Aです」と送った。ログを書き出し直して `extract-line-ids.js` を再実行した。
- 結果：`Uafa4…22c`、本文「Aです」、プロフィールの表示名も取得できた（MukoBot から送れる状態）。
- `users.json` の Aさんの `lineUserId` に入れた。ID の重複なし。`git status` に `users.json` は出ない。
- 以前に別のプロバイダーで取得した Aさんの ID（送信に失敗したもの）とは別の値。
- 残りは Bさん。そろってから再デプロイする。

### 27. ここまでを GitHub に push

- ユーザーの指示で、Phase 3〜5、参加者ごとの通知、部分失敗への対策、Webhook のログ、ドキュメントの更新をまとめてコミットし、`main` に push した（コミットは `git log` で確認できる）。
- **`src/data/users.json`（実在の LINE ユーザーID入り）は含めていない。** skip-worktree のため、GitHub 上は初回コミット時のデモデータ（Hiroshi、ID は空）のまま。
- push 前に確認したこと：`users.json` / `.env` / `env.yaml` がステージされていない。差分に API キー・アクセストークン・LINE ユーザーID（`U` + 32桁の16進数）らしき文字列がない。

### 28. Webhook で Bさんの ID を取得し、4人分がそろった

- Bさんが MukoBot に「Bです」と送った。ログを書き出し直して `extract-line-ids.js` を再実行した。
- 結果：`U2199…626`、本文「Bです」、プロフィールの表示名も取得できた（MukoBot から送れる状態）。
- `users.json` の Bさんの `lineUserId` に入れた。これで Dさん（`Ueeab…75d`、= `LINE_DEMO_USER_ID`）・Aさん（`Uafa4…22c`）・Bさん（`U2199…626`）・Cさん（`U80ac…685`）の4人がそろった。ID の重複なし。`users.json` は GitHub に上がらない。
- 次は、再デプロイして本番で1回だけ実際に送り、マッチした Dさん・Aさん・Bさんのスマホに、それぞれ本人向けの提案が届くか確認する。

### 29. 3人の実機に本人向けの提案を送れた

- `users.json`（4人の ID 入り）を反映して再デプロイした（リビジョン `personal-ai-network-00010-5bz`）。
- 本番でデモ画面を Chrome で開き、`S` キーで開始した（`REAL_LINE=1` で実際に送る）。
  - 20.5秒で完了（最初のログまで13.4秒）。画面は「✓ 参加者の LINE に提案を届けました」、JS エラーは0件、スマホ幅の横はみ出しは0px。
  - マッチング：Dさん・Aさん・Bさんで、明日14:00〜16:00に渋谷でカラオケ（confidence 0.95）。Cさんは「9〜12時・神奈川希望で初対面不可のため見送り」。
- Cloud Run のログで、宛先ごとに `push ok` → `提案を送信` が出たことを確認した：Dさん（`Ueeab…`）、Aさん（`Uafa4…`）、Bさん（`U2199…`）。失敗は0件。
- **Webhook で ID を取れば、参加者それぞれの LINE に本人向けの文面を届けられる**ことを、本番で確認できた。一次審査後に予定していた LIFF での ID 取得は不要になった。
- 各スマホに実際に届いたか（文面が本人向けになっているか）は、ユーザーに確認してもらう。

### 30. JOURNAL.md と CLAUDE.md の更新を GitHub に push

- ユーザーの指示で、項目28〜29 の記録と、CLAUDE.md の書き直し（Webhook で ID を取る方法、4人分の ID が入った今の構成、Webhook が有効なこと）をコミットし、`main` に push した。
- `users.json` / `.env` / `env.yaml` がステージされていないこと、差分に API キー・トークン・LINE ユーザーIDの全体がないこと（伏せ字のみ）を確認した。

### 31. 技術面の Marp スライドを作った

- ユーザーの依頼で、技術面だけに絞った6枚の Marp スライド `docs/tech-slides.md` を作った。
  1. 表紙（技術スタックのチップ付き）
  2. システム構成（トリガー → Cloud Run → Gemini → LINE → 参加者、データ・デプロイ・秘密情報の扱い）
  3. AI の活かし方（1回の呼び出しで返す JSON の形、構造化出力・propertyOrdering・判断ルール・応答の検証）
  4. デモの処理フロー（`/api/match` → ログ表示 → `/api/line/push` → `planNotifications` → 部分失敗への対策）
  5. 実施したことと、ハマりどころ（Phase 1〜5 と実機3台への送信、404/429/411/400 の原因と対処）
  6. 次の技術ステップ（LINE で参加・見送り、デモの安定化、Cloud Scheduler、Calendar/Firestore 連携）
- デザイン：デモ画面と同じダークトーン（背景 #0b0f14、アクセント #7ee0c3）。Noto Sans JP / JetBrains Mono。`<style>` とクラス指定（`_class`）だけで作ったので、HTML を有効にしなくても表示できる。
- LINE のユーザーID や API キーなどの秘密情報は載せていない。
- 確認：スクラッチパッドに Marp CLI（v4.5.1）を入れ、Chrome で PNG に書き出して目視した。
  - 1回目の崩れ（コード枠の間延び、チップの折り返し、インラインコードの途中改行）を CSS で直した。
  - 2回目でもカードの見出しと本文の間に空行が残り、1枚目のカードだけ上端がずれていた。原因は、Marp が改行を `<br>` にするため、ブロック表示にした見出しの後ろに空行ができることと、標準テーマの `li + li` の余白。カード内の `br` を非表示にし、`li` の margin を 0 にして直した。
  - 3回目の書き出しが180秒以上止まった（PNG は1枚も出ていない）。止まっていた Marp CLI のプロセスを終了させ、`--browser-timeout 120` を付けて書き出し直すと成功した。6枚とも崩れがないことを目視で確認した。

### 32. Marp スライドを PDF に書き出した

- ユーザーの依頼で、`docs/tech-slides.md` を Marp CLI（スクラッチパッドに導入済みの v4.5.1、Chrome 使用）で PDF に書き出した。
  - 出力：`docs/tech-slides.pdf`（約885KB）
  - 前回の書き出しが止まったことがあるので、`timeout 240` と `--browser-timeout 120` を付けて実行した。問題なく終わった。
- 確認（Read ツールで PDF を画像表示する pdftoppm が無かったため、別の方法で確認した）：
  - PDF の中身を解析：6ページ、ページサイズ 960×540pt（16:9）。
  - スクラッチパッドに pypdfium2 と Pillow を入れて、PDF の各ページを PNG にして目視した。6ページとも、事前に確認した PNG 版と同じ見た目で、本文のゴシック体・コードの等幅フォント・レイアウトに崩れはなかった。
  - 最初の解析で埋め込みフォントが `BIZ-UDGothic` しか見つからなかったのは、圧縮されたオブジェクトを一部しか展開できていなかったため。実際の表示では、指定したフォントが使われていた。

### 33. スライドから「クレジット残高0」の件を削除し、PDF を作り直した

- ユーザーの指示で、5枚目「実施したことと、ハマりどころ」の表から「Gemini が 429 / 前払いクレジットの残高が0 / AI Studio でチャージ」の行を削除した（表は4行になった）。
- `docs/tech-slides.pdf` を書き出し直した（約872KB）。
  - **ハマったこと**：1回目は、同じコマンドに続けた Python のヒアドキュメントを Marp CLI が標準入力として読み込み、待ち続けて `timeout` で打ち切られた（PDF は古いまま）。`--no-stdin` と `< /dev/null` を付けて、別のコマンドで実行したら成功した。残ったプロセスはなかった。
  - 新しい PDF（6ページ）の5ページ目を画像にして確認した。クレジットの行がなくなって表は4行になり、レイアウトの崩れもない。

### 34. スライド2ページ目（システム構成）だけを1枚の PDF にした

- ユーザーの依頼で、`docs/tech-slides.pdf` の2ページ目を切り出し、`docs/tech-slides-system-architecture.pdf` を作った。
- 方法：スクラッチパッドの pypdfium2 で、元の PDF から2ページ目をそのまま新しい PDF に取り込んだ（再レンダリングしていないので、見た目は元の PDF と同じ）。
- 確認：1ページ、960×540pt（16:9）、約242KB。画像にして、「システム構成」のページであること（流れ図とデータ・デプロイ・秘密情報のカード）を目視した。
- 注意：元のスライド（.md）を直したときは、`tech-slides.pdf` を書き出し直してから、このファイルも切り出し直す必要がある。

### 35. システム構成の1枚 PDF を、ページ番号なしで作り直した

- ユーザーの依頼（1枚ものとして使う）で、右下のページ番号「2」を消した。
- 方法：元の `docs/tech-slides.md` は変えず、スクラッチパッドに「設定部分（front matter）＋2枚目だけ」の `system-architecture.md` を作り、`paginate: false` にして Marp CLI で PDF に書き出した（`--no-stdin` と `< /dev/null` 付き）。
- 出力：`docs/tech-slides-system-architecture.pdf` を上書き（約180KB）。前の版はページを抜き出したものだったが、今回は1枚だけを直接書き出したもの。
- 確認：1ページ、960×540pt。画像にして、右下のページ番号が消えていること、流れ図と3枚のカードのレイアウトが元と同じであることを目視した。
- 注意：元のスライドの2枚目を直したら、同じ手順でこのファイルも作り直す。

### 36. ハッカソンの結果：一次審査で落選

- ユーザーから報告：一次審査で落選し、発表には進まなかった。
- 気づいた点：本番の Cloud Run はまだ公開中。`GET /api/users` は `users.json` をそのまま返すので、実在の LINE ユーザーIDが外から見える可能性がある。`POST /api/line/push` も認証なしで任意の文面を送れる。実際に見えるかを確認し、対応をユーザーに相談する。
- 確認結果：本番の `GET /api/users` が HTTP 200 で、**4人分の LINE ユーザーIDをそのまま返していた**（Dさん `Ueeab…`、Aさん `Uafa4…`、Bさん `U2199…`、Cさん `U80ac…`）。公開を止めるか、サービスを消すか、ID を空にして再デプロイするかをユーザーに相談する。

## 2026-09-14

### 37. Cloud Run のサービスを削除した

- ユーザーの判断で、LINE ユーザーIDの公開と、認証なしの送信 API を止めるため、`gcloud run services delete personal-ai-network --region asia-northeast1` を実行した。
- 確認：
  - `gcloud run services list`（asia-northeast1）→ 0件。
  - 旧 URL の `GET /api/users` と `POST /line/webhook` → どちらも HTTP 404。ID の公開と送信 API は止まった。
- 残っているもの：Artifact Registry のリポジトリ `cloud-run-source-deploy`（216MB）に、ビルド済みイメージ `personal-ai-network` がある。デプロイ時の `users.json`（実在の LINE ユーザーID入り）を含むので、非公開だが消すかどうかをユーザーに相談する。
- ほかに残っている作業：スクラッチパッドの `line-ids.json` とローカルの `users.json` の ID の削除、LINE Developers で Webhook を OFF（ユーザーの操作）、スライド・PDF・JOURNAL のコミット。

### 38. コンテナイメージ（Artifact Registry）を削除した

- ユーザーの指示（使う予定がない）で、`gcloud artifacts repositories delete cloud-run-source-deploy --location asia-northeast1` を実行し、イメージ `personal-ai-network` ごとリポジトリを削除した。`gcloud artifacts repositories list` で0件になったことを確認した。
- **別の残りを見つけた**：Cloud Storage のバケット `run-sources-personal-ai-network-508503-asia-northeast1` に、ソースデプロイでアップロードしたソースの zip が10個（合計約546KB）残っている。
  - 最新の zip をスクラッチパッドにダウンロードして中身を確認：24ファイル。`src/data/users.json`（実在の LINE ユーザーID入り）を含む。`.env` / `env.yaml` は含まれていない（`.gcloudignore` が効いていて、API キーなどはアップロードされていない）。`node_modules` も含まれない。
  - ダウンロードした zip は確認後すぐに削除した。
  - このバケットはコンテナイメージとは別物なので、消すかどうかをユーザーに確認する。
- 補足：`<プロジェクトID>_cloudbuild` バケットは存在しなかった。

### 39. ソースのバケットと、手元の LINE ユーザーIDを削除した

- ユーザーの指示で、Cloud Storage のバケット `run-sources-personal-ai-network-508503-asia-northeast1` を中の zip（10個）ごと削除した（`gcloud storage rm --recursive`）。`gcloud storage buckets list` で何も出ないことを確認した。
- 手元の ID を削除した：
  - スクラッチパッドの `line-ids.json`（ID 取得スクリプトの出力）と、`webhook-logs.txt`（Cloud Run のログを書き出したもの。3人の完全な ID を含む）を削除した。スクラッチパッドの他のファイル（node_modules・pylib・画像・PDF を除く）に完全な ID が残っていないことも確認した。
  - `src/data/users.json` の4人の `lineUserId` を空にした。skip-worktree のままなので、Git の差分には出ない。
  - `dist/data/users.json`（ビルド時にコピーされた古い版。3人分の ID 入り）が残っていたので、ビルドし直して空の版に置き換えた。
- 残している ID：`.env` と `env.yaml` の `LINE_DEMO_USER_ID`（ユーザー本人＝Dさんの ID）。アプリの設定値なので触っていない。
- 補足：Cloud Run のサービスは削除したが、Cloud Logging には Webhook の受信ログ（ID と本文を含む）が保存期間（既定30日）のあいだ残る。

### 40. ログは残す判断、Webhook の扱い、GitHub への push

- ユーザーの判断：Cloud Logging の Webhook 受信ログ（LINE ユーザーID入り）は削除せず、保存期間が過ぎて自然に消えるのを待つ。
- ユーザーから「Webhook を無効にしないと問題があるか」と質問された。回答：送り先のサービスはもうないので、MukoBot にメッセージが届いても LINE からの送信が 404 で失敗するだけ。セキュリティ上の実害はない。旧 URL はプロジェクト固有の番号を含み、他人が同じ URL を作ることはできない。ただし、LINE 側でエラーとして記録され、エラー通知を有効にしていればメールが届く可能性があるので、整理のために OFF を推奨した。
- ユーザーの指示で、スライド（`docs/tech-slides.md`）、PDF 2つ（`docs/tech-slides.pdf`、`docs/tech-slides-system-architecture.pdf`）、JOURNAL.md、CLAUDE.md をコミットして `main` に push した（コミットは `git log` で確認できる）。
- push 前に確認したこと：`users.json` / `.env` / `env.yaml` がステージされていない。ステージしたファイル（PDF を含む）に、API キー・トークン・チャネルシークレット・LINE ユーザーIDの完全な値が含まれていない。

### この時点で残っていること

- [ ] （推奨・任意）LINE Developers で Webhook を OFF にする（ユーザーの操作。放置しても実害はない）
- Cloud Logging の Webhook 受信ログは、保存期間が過ぎて自然に消えるのを待つ（ユーザーの判断）
- （ハッカソンは一次審査で終了。Phase 6、デモの安定化、実機での着信確認は、再開するときに改めて検討する）
