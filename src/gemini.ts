// Gemini 呼び出し（Phase 2 / Phase 4）
import { config } from "./config";
import { NotImplementedError } from "./errors";
import type { Activity, MatchResult, UserProfile } from "./types";

// Phase 2: 疎通確認。固定の文字列を送ってテキストを返す。
export async function askGemini(prompt: string): Promise<string> {
  // TODO(Phase 2): @google/genai の GoogleGenAI で config.geminiModel を呼び出す
  void prompt;
  void config;
  throw new NotImplementedError("Phase 2: Gemini接続");
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
