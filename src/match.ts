// 秘書AIオーケストレーション：データ読み込み → Gemini でマッチング → LINE へ提案
import activitiesData from "./data/activities.json";
import usersData from "./data/users.json";
import { config } from "./config";
import { generateMatch } from "./gemini";
import { pushMatchProposal } from "./line";
import type { Activity, MatchResult, UserProfile } from "./types";

export const users = usersData as UserProfile[];
export const activities = activitiesData as Activity[];

export async function runMatching(): Promise<MatchResult> {
  const match = await generateMatch(users, activities);

  // マッチしたユーザーへ提案を送る（デモでは lineUserId が空なら LINE_DEMO_USER_ID 宛）
  const recipients = new Set(
    users
      .filter((u) => match.matchedUserIds.includes(u.id))
      .map((u) => u.lineUserId || config.lineDemoUserId)
      .filter(Boolean),
  );
  for (const to of recipients) {
    await pushMatchProposal(to, match);
  }

  return match;
}
