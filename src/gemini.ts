// Gemini 呼び出し（Phase 2 / Phase 4）
import { GoogleGenAI } from "@google/genai";
import { config } from "./config";
import { NotImplementedError } from "./errors";
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
async function callGemini(contents: string) {
  const startedAt = Date.now();
  try {
    const response = await getClient().models.generateContent({
      model: config.geminiModel,
      contents,
    });
    console.log(`[gemini] ${config.geminiModel} ok (${Date.now() - startedAt}ms)`);
    return response;
  } catch (err) {
    console.error(`[gemini] ${config.geminiModel} error:`, err);
    throw err;
  }
}

// Phase 4: ユーザーと体験候補からマッチング案を生成する。
// structured output（responseSchema）で MatchResult 形式の JSON を返させる。
export async function generateMatch(
  users: UserProfile[],
  activities: Activity[],
): Promise<MatchResult> {
  // TODO(Phase 4): プロンプト組み立て + responseSchema 指定 + JSON.parse
  void users;
  void activities;
  throw new NotImplementedError("Phase 4: Geminiマッチング");
}
