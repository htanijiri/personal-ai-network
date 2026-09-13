// Gemini 呼び出し（Phase 2 / Phase 4）
import { GoogleGenAI, Type, type GenerateContentConfig, type Schema } from "@google/genai";
import { config } from "./config";
import type { Activity, MatchResult, UserProfile } from "./types";

// Phase 2: 疎通確認。固定の文字列を送ってテキストを返す。
export async function askGemini(prompt: string): Promise<string> {
  const response = await callGemini(prompt);
  return response.text ?? "";
}

let client: GoogleGenAI | undefined;

function getClient(): GoogleGenAI {
  if (!config.geminiApiKey) {
    throw new Error("GEMINI_API_KEY が設定されていません（.env または Cloud Run の環境変数を確認）");
  }
  client ??= new GoogleGenAI({ apiKey: config.geminiApiKey });
  return client;
}

// API エラーの内容をサーバーログに出してから投げ直す
async function callGemini(contents: string, generationConfig?: GenerateContentConfig) {
  const startedAt = Date.now();
  try {
    const response = await getClient().models.generateContent({
      model: config.geminiModel,
      contents,
      config: generationConfig,
    });
    console.log(`[gemini] ${config.geminiModel} ok (${Date.now() - startedAt}ms)`);
    return response;
  } catch (err) {
    console.error(`[gemini] ${config.geminiModel} error:`, err);
    throw err;
  }
}

// MatchResult（src/types.ts）と同じ形の JSON を返させるためのスキーマ
const stringArray: Schema = { type: Type.ARRAY, items: { type: Type.STRING } };

const matchSchema: Schema = {
  type: Type.OBJECT,
  properties: {
    logs: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          speaker: { type: Type.STRING },
          message: { type: Type.STRING },
        },
        required: ["speaker", "message"],
      },
    },
    matchedUserIds: stringArray,
    activity: { type: Type.STRING },
    start: { type: Type.STRING, description: "ISO8601（+09:00）" },
    end: { type: Type.STRING, description: "ISO8601（+09:00）" },
    area: { type: Type.STRING },
    reason: { type: Type.STRING },
    conversationTopics: stringArray,
    confidence: { type: Type.NUMBER },
    notifications: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          userId: { type: Type.STRING },
          text: { type: Type.STRING },
        },
        required: ["userId", "text"],
      },
    },
  },
  required: [
    "logs",
    "matchedUserIds",
    "activity",
    "start",
    "end",
    "area",
    "reason",
    "conversationTopics",
    "confidence",
    "notifications",
  ],
  propertyOrdering: [
    "logs",
    "matchedUserIds",
    "activity",
    "start",
    "end",
    "area",
    "reason",
    "conversationTopics",
    "confidence",
    "notifications",
  ],
};

// Phase 4: ユーザーと体験候補からマッチング案を生成する。
// 提案文は参加者ごとに書かせる。users[0] は必ず参加者に含める（デモで LINE を受け取る発表者）。
export async function generateMatch(
  users: UserProfile[],
  activities: Activity[],
): Promise<MatchResult> {
  const owner = users[0];
  const prompt = buildMatchPrompt(users, activities, owner);

  const response = await callGemini(prompt, {
    responseMimeType: "application/json",
    responseSchema: matchSchema,
  });

  let match: MatchResult;
  try {
    match = JSON.parse(response.text ?? "") as MatchResult;
  } catch (err) {
    console.error("[gemini] JSON parse error. raw response:", response.text);
    throw new Error("Gemini の応答を JSON として読めませんでした（サーバーログに生の応答を出力）");
  }

  const knownIds = new Set(users.map((u) => u.id));
  const unknownIds = match.matchedUserIds.filter((id) => !knownIds.has(id));
  if (unknownIds.length > 0) {
    console.warn("[gemini] 存在しないユーザーIDを除外:", unknownIds);
    match.matchedUserIds = match.matchedUserIds.filter((id) => knownIds.has(id));
  }
  if (match.matchedUserIds.length < 2) {
    console.error("[gemini] マッチ人数が2人未満:", JSON.stringify(match));
    throw new Error("マッチングが成立しませんでした（マッチ人数が2人未満）");
  }

  console.log(
    `[gemini] match: ${match.matchedUserIds.join(", ")} / ${match.activity} @ ${match.area} ${match.start}〜${match.end} (confidence=${match.confidence})`,
  );
  return match;
}

function buildMatchPrompt(users: UserProfile[], activities: Activity[], owner: UserProfile): string {
  // デモデータの日付が常に「明日」になるよう、最初の空き時間の前日を現在日とする
  const firstSlotStart = users.flatMap((u) => u.freeSlots.map((s) => s.start)).sort()[0];
  const today = new Date(Date.parse(firstSlotStart) - 24 * 60 * 60 * 1000).toLocaleDateString("ja-JP", {
    timeZone: "Asia/Tokyo",
    year: "numeric",
    month: "long",
    day: "numeric",
    weekday: "short",
  });

  // LINE の ID など、判断に不要な情報は渡さない
  const profiles = users.map(({ lineUserId: _lineUserId, ...profile }) => profile);

  return `あなたは2036年の「AI Secretary Network」です。
各ユーザーには専属のAI秘書がいて、本人の空き時間・趣味・対人傾向を把握しています。
AI秘書同士が条件を持ち寄って調整し、本人が探していないリアルな体験を1つ提案してください。

## 現在
${today}（日本時間）。「明日」はこの翌日です。

## ユーザー（各AI秘書が把握している情報）
${JSON.stringify(profiles, null, 2)}

## 体験候補
${JSON.stringify(activities, null, 2)}

## 判断のルール
- 参加者は2人以上。全員の空き時間が重なる時間帯に、体験の所要時間（durationMinutes）が収まるように start / end を決める。
- 趣味・嗜好の近さ、人数（全員の preferredGroupSizeMin〜Max と体験の groupSizeMin〜Max に収まる）、初対面の可否（firstMeetingOk）、エリアを考慮する。
- 条件が合わない人は無理に入れない。
- 参加者には必ず ${owner.id}（${owner.displayName}）を含める。
- activity は体験候補から1つ選び、その name を入れる。area はその候補の area を入れる。
- start / end は "2026-09-14T14:00:00+09:00" のような ISO8601（+09:00）。

## 出力する各項目
- logs: 画面に表示する「AI秘書ネットワークの調整ログ」を4〜6件。
  - 各ユーザーのAI秘書（speaker は「{displayName} AI」）が、本人の条件を伝えたり他の秘書と照合したりする様子を、1件1文・40字程度で書く。
  - 本人の呼び方は displayName をそのまま使い、「様」などの敬称を足さない（例：「Dさんは」「Aさんは」）。
  - 空き時間・趣味・エリアなどの事実は、ユーザー情報のとおり正確に書く（例：空きが 13:00〜18:00 の人を「14〜18時」と書かない）。
  - 参加しない人がいれば、その人の秘書のログで理由を穏やかに述べる。
  - 最後の1件は speaker を「Secretary Network」にし、提案内容をまとめる。
  - これはユーザー向けの判断サマリー。内部の思考過程は書かない。
- matchedUserIds: 参加者のユーザーID。
- reason: おすすめの理由を1〜2文で。
- conversationTopics: 初対面でも話しやすい話題を2〜3件。
- confidence: 提案の自信度（0〜1）。
- notifications: 参加者それぞれに LINE で届ける提案文。参加者1人につき1件（userId はその人のユーザーID）。
  - 1行目は「明日14:00、渋谷でKing Gnu好きの3人とカラオケはいかがですか？」のような問いかけ（他の参加者の名前は出さない）。
  - 空行のあとに「あなたにおすすめの理由：」と、「・」で始まる理由を3つ。理由は、その人自身の空き時間・趣味・対人の好みに合わせて書く。
  - ボタンの文言は含めない。1件あたり200字以内。`;
}
