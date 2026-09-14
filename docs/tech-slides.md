---
marp: true
size: 16:9
paginate: true
header: '2036 Personal AI Network · Tech'
style: |
  @import url('https://fonts.googleapis.com/css2?family=Noto+Sans+JP:wght@400;500;700&family=JetBrains+Mono:wght@400;600&display=swap');

  :root {
    --bg: #0b0f14;
    --panel: #121820;
    --panel-2: #18212c;
    --border: #243040;
    --text: #e6edf3;
    --muted: #8b98a8;
    --accent: #7ee0c3;
    --accent-dim: rgba(126, 224, 195, 0.10);
    --blue: #8ab4ff;
    --amber: #f2c46d;
  }

  section {
    display: flex;
    flex-direction: column;
    justify-content: flex-start;
    padding: 72px 72px 56px;
    background:
      radial-gradient(1100px 560px at 100% 0%, rgba(126, 224, 195, 0.10), transparent 60%),
      radial-gradient(900px 480px at 0% 100%, rgba(138, 180, 255, 0.07), transparent 60%),
      var(--bg);
    color: var(--text);
    font-family: 'Noto Sans JP', system-ui, sans-serif;
    font-size: 24px;
    line-height: 1.6;
  }

  header {
    top: 30px;
    left: 72px;
    color: var(--accent);
    font-size: 14px;
    letter-spacing: 0.16em;
    text-transform: uppercase;
  }

  section::after {
    color: var(--muted);
    font-size: 14px;
    font-family: 'JetBrains Mono', monospace;
  }

  h1 {
    margin: 0 0 28px;
    color: var(--text);
    font-size: 40px;
    font-weight: 700;
    line-height: 1.3;
  }

  h6 {
    margin: 0;
    color: var(--accent);
    font-size: 18px;
    font-weight: 500;
    letter-spacing: 0.16em;
    text-transform: uppercase;
  }

  strong { color: var(--accent); font-weight: 600; }
  a { color: var(--blue); }
  li::marker { color: var(--accent); }

  code {
    padding: 0.05em 0.4em;
    border: 1px solid var(--border);
    border-radius: 6px;
    background: var(--panel-2);
    color: var(--accent);
    font-family: 'JetBrains Mono', monospace;
    font-size: 0.82em;
    white-space: nowrap;
  }

  pre {
    margin: 0;
    padding: 22px 26px;
    border: 1px solid var(--border);
    border-radius: 14px;
    background: var(--panel);
    font-size: 17px;
    line-height: 1.55;
  }
  pre code { padding: 0; border: 0; background: none; color: var(--text); font-size: 1em; white-space: pre; }
  .hljs-comment { color: var(--muted); font-style: normal; }
  .hljs-string { color: var(--accent); }
  .hljs-attr, .hljs-property { color: var(--blue); }
  .hljs-number, .hljs-literal { color: var(--amber); }
  .hljs-punctuation { color: var(--muted); }

  blockquote {
    margin: 24px 0 0;
    padding: 14px 22px;
    border-left: 4px solid var(--accent);
    border-radius: 0 12px 12px 0;
    background: var(--accent-dim);
    color: var(--text);
    font-size: 21px;
  }
  blockquote::before, blockquote::after { content: none; }

  table { display: table; width: 100%; border-collapse: collapse; font-size: 18px; }
  tr { background: transparent !important; }
  th {
    padding: 10px 14px;
    border: 0;
    border-bottom: 1px solid var(--accent);
    background: var(--panel-2);
    color: var(--accent);
    font-weight: 600;
    text-align: left;
  }
  td {
    padding: 9px 14px;
    border: 0;
    border-bottom: 1px solid var(--border);
    background: var(--panel);
    color: var(--text);
  }
  td code { font-size: 0.85em; }

  /* 表紙 */
  section.lead { justify-content: center; }
  section.lead h1 {
    margin: 12px 0 20px;
    font-size: 64px;
    line-height: 1.2;
    background: linear-gradient(90deg, #e6edf3 30%, #7ee0c3);
    -webkit-background-clip: text;
    background-clip: text;
    color: transparent;
  }
  section.lead p { margin: 6px 0; color: var(--muted); font-size: 26px; }
  section.lead p code { margin-right: 6px; padding: 0.2em 0.6em; font-size: 0.72em; }

  /* システム構成：横並びのフロー */
  section.arch ol {
    display: flex;
    gap: 34px;
    margin: 0 0 30px;
    padding: 0;
    list-style: none;
  }
  section.arch ol li {
    position: relative;
    flex: 1;
    padding: 20px 16px;
    border: 1px solid var(--border);
    border-radius: 14px;
    background: var(--panel);
    font-size: 16px;
    line-height: 1.5;
    text-align: center;
  }
  section.arch ol li:nth-child(3) { border-color: var(--accent); background: linear-gradient(var(--accent-dim), var(--accent-dim)), var(--panel); }
  section.arch ol li:not(:last-child)::after {
    content: '→';
    position: absolute;
    top: 50%;
    right: -26px;
    transform: translateY(-50%);
    color: var(--accent);
    font-size: 22px;
  }
  section.arch li p { margin: 0; }
  /* 改行が <br> になり、ブロック要素の後ろに空行ができるのを防ぐ。標準テーマの li + li の余白も打ち消す */
  section.arch li br, section.cards li br { display: none; }
  section.arch li, section.cards li, section.flow li { margin: 0 !important; }
  section.arch ol { align-items: stretch; }
  section.arch li strong { display: block; margin-bottom: 8px; color: var(--text); font-size: 22px; }
  section.arch li em { display: block; color: var(--muted); font-style: normal; font-size: 15px; }
  section.arch ul {
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    gap: 16px;
    margin: 0;
    padding: 0;
    list-style: none;
  }
  section.arch ul li {
    padding: 16px 18px;
    border: 1px solid var(--border);
    border-radius: 12px;
    background: var(--panel);
    font-size: 17px;
    line-height: 1.55;
  }
  section.arch ul li strong { color: var(--accent); font-size: 15px; letter-spacing: 0.08em; margin-bottom: 4px; }

  /* 左右2カラム */
  section.split {
    display: grid;
    grid-template-columns: 1.08fr 1fr;
    grid-template-rows: auto 1fr;
    column-gap: 36px;
    align-content: start;
  }
  section.split h1 { grid-column: 1 / -1; }
  section.split pre { align-self: start; }
  section.split ul { margin: 0; padding-left: 1.1em; font-size: 20px; line-height: 1.5; }
  section.split ul li { margin: 0 0 12px; }

  /* 番号付きの縦フロー */
  section.flow ol {
    display: grid;
    gap: 12px;
    margin: 0;
    padding: 0;
    list-style: none;
    counter-reset: step;
  }
  section.flow ol li {
    position: relative;
    padding: 12px 20px 12px 72px;
    border: 1px solid var(--border);
    border-radius: 12px;
    background: var(--panel);
    font-size: 20px;
    line-height: 1.5;
    counter-increment: step;
  }
  section.flow ol li::before {
    content: counter(step);
    position: absolute;
    top: 50%;
    left: 20px;
    display: grid;
    place-items: center;
    width: 34px;
    height: 34px;
    transform: translateY(-50%);
    border: 1px solid var(--accent);
    border-radius: 50%;
    color: var(--accent);
    font-family: 'JetBrains Mono', monospace;
    font-size: 16px;
  }
  section.flow li p { margin: 0; }
  section.flow li em { display: block; color: var(--muted); font-style: normal; font-size: 16px; }

  /* 実施したこと */
  section.log h1 { margin-bottom: 18px; }
  section.log p:first-of-type { margin: 0 0 18px; }
  section.log p:first-of-type code { margin: 0 4px 6px 0; padding: 0.2em 0.5em; font-size: 13.5px; }
  section.log p:last-of-type { margin: 16px 0 0; color: var(--muted); font-size: 16px; }

  /* カード */
  section.cards ul {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 20px;
    margin: 0;
    padding: 0;
    list-style: none;
  }
  section.cards li {
    padding: 22px 26px;
    border: 1px solid var(--border);
    border-radius: 14px;
    background: var(--panel);
    font-size: 19px;
    line-height: 1.6;
  }
  section.cards ul { align-items: stretch; }
  section.cards li p { margin: 0; }
  section.cards li strong { display: block; margin-bottom: 8px; color: var(--text); font-size: 24px; }
  section.cards li strong::before { content: '▸ '; color: var(--accent); }
---

<!-- _class: lead -->
<!-- _paginate: false -->
<!-- _header: '' -->

###### 2036 · AI Secretary Network

# Personal AI Network<br>技術構成と実装

AI秘書同士が条件を調整し、リアルな体験を LINE に届けるプロトタイプ

`Cloud Run` `Node.js 22 / TypeScript` `Gemini 3.6 Flash` `LINE Messaging API`

---

<!-- _class: arch -->

# システム構成

1. **トリガー**
   *発表者用デモ画面*
   *本番は Cloud Scheduler*
2. **Cloud Run**
   *Express 5 + TypeScript*
   *秘書AIの処理をつなぐ*
3. **Gemini**
   *gemini-3.6-flash*
   *構造化出力（JSON）*
4. **LINE Messaging API**
   *Push 送信*
   *Webhook 受信*
5. **参加者の LINE**
   *本人向けの提案*
   *マッチした人だけ*

- **DATA**
  固定 JSON（ユーザー4人・体験候補5件）。DB を作らず、動くことを優先
- **DEPLOY**
  `gcloud run deploy --source .` で Buildpacks がビルド。Dockerfile なし
- **SECRETS**
  API キーは `env.yaml` で環境変数に。LINE ユーザーID入りの `users.json` は Git 管理外

---

<!-- _class: split -->

# AI の活かし方：1回の呼び出しで、調整から通知文まで

```js
// responseSchema で、この形の JSON だけを返させる
{
  logs: [{ speaker, message }],  // AI秘書ログ
  matchedUserIds: ["userD", "userA", "userB"],
  activity: "カラオケ",
  area: "渋谷",
  start: "2026-09-14T14:00:00+09:00",
  end: "2026-09-14T16:00:00+09:00",
  reason, conversationTopics,
  confidence: 0.95,
  notifications: [{ userId, text }]  // 1人ずつ
}
```

- **構造化出力**で JSON を強制し、後続の処理を安定させる
- `propertyOrdering` で**ログを先に**書かせてから結論を出させる
- 判断ルールをプロンプトに明記：空き時間の重なり、人数、初対面の可否、エリア
- 画面のログは**判断サマリー**。思考過程そのものは出さない
- 応答を検証：存在しない ID を除外、2人未満ならエラー
- 事実の誤記（空き時間のずれ）をテストで見つけ、プロンプトで修正

---

<!-- _class: flow -->

# デモの処理フロー

1. `POST /api/match` に `{"notify": false}` を送り、マッチング案を作る
   *Gemini の応答待ちは約13〜18秒。その間、画面は「探索中」を表示*
2. AI秘書ログを1.2秒間隔で表示し、参加者のカードを強調する
   *演出はブラウザ側。Gemini の文字列は escapeHtml を通して表示*
3. ログを表示し終えてから `POST /api/line/push` に `{ match }` を送る
   *画面のログが流れ終わった瞬間に、スマホが鳴る*
4. `planNotifications` で宛先と本人向けの文面を決める
   *ID が空の人は発表者宛て。同じ宛先には1通だけ*
5. 宛先ごとに Push し、1人失敗しても残りの人には送る
   *全員に失敗したときだけエラー。失敗した人は画面に表示*

---

<!-- _class: log -->

# 実施したことと、ハマりどころ

`Phase 1 Cloud Run ✓` `Phase 2 Gemini ✓` `Phase 3 LINE Push ✓` `Phase 4 マッチング ✓` `Phase 5 デモ画面 ✓` `実機3台に送信 ✓`

| 起きたこと | 原因 | 対処 |
|---|---|---|
| `/healthz` だけ 404 | Cloud Run では末尾が `z` のパスが予約済み | `/health` に変更 |
| `gemini-2.5-flash` が 404 | 新規ユーザーには提供されていない | `models.list()` で確認し `gemini-3.6-flash` に |
| 本番への curl の POST が 411 | 本文がなく Content-Length がない | `-d '{}'` を付ける（ブラウザは影響なし） |
| 他の人への Push が 400 | LINE ユーザーIDはプロバイダーごとに違う | Webhook のログと `getProfile` で ID を取得 |

検証：ヘッドレス Chrome（puppeteer-core）で画面操作・スクリーンショット・JS エラーを自動確認 ／ 本番から3人の実機に本人向けの提案を送信

---

<!-- _class: cards -->

# 次の技術ステップ

- **LINE で参加・見送り**
  Postback ボタンと Webhook の署名検証（`x-line-signature`）で、承認状況を管理する
- **デモの安定化**
  Gemini のタイムアウトと再試行、事前に作った結果への切り替え
- **自律的な起動**
  Cloud Scheduler から定期実行し、「探さない」体験を実際の動きにする
- **実データとの連携**
  Google Calendar の空き時間（FreeBusy）、Firestore で体験後の感想から学習
