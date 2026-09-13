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
  return generateMatch(users, activities);
}

export type NotificationPlan = {
  to: string; // LINE ユーザーID
  userId: string; // users.json の id
  text: string;
};

// 参加者ごとに宛先と文面を決める
// - lineUserId が空の人は LINE_DEMO_USER_ID 宛
// - 同じ宛先には1通だけ送る（users.json で先に並んでいる人の文面を使う）
export function planNotifications(match: MatchResult): NotificationPlan[] {
  const notifications = match.notifications ?? [];
  const plans: NotificationPlan[] = [];
  const sentTo = new Set<string>();

  for (const user of users.filter((u) => match.matchedUserIds.includes(u.id))) {
    const to = user.lineUserId || config.lineDemoUserId;
    if (!to || sentTo.has(to)) continue;
    // Gemini がその人の文面を返さなかった場合は、最初の文面で代用する
    const text = notifications.find((n) => n.userId === user.id)?.text ?? notifications[0]?.text;
    if (!text) {
      throw new Error(`${user.id} への提案文がありません（Gemini の notifications を確認）`);
    }
    sentTo.add(to);
    plans.push({ to, userId: user.id, text });
  }
  return plans;
}

export type NotificationResult = {
  userId: string;
  ok: boolean;
  error?: string;
};

// マッチした参加者へ提案を送り、宛先ごとの結果を返す
// 1人に送れなくても残りの人には送る（デモ中に止めないため）。全員に失敗したときだけエラーにする。
export async function notifyMatch(match: MatchResult): Promise<NotificationResult[]> {
  const plans = planNotifications(match);
  if (plans.length === 0) {
    throw new Error("提案の送信先がありません（matchedUserIds と LINE_DEMO_USER_ID を確認）");
  }

  const results: NotificationResult[] = [];
  for (const plan of plans) {
    try {
      await pushMatchProposal(plan.to, plan.text);
      console.log(`[match] 提案を送信: ${plan.userId}`);
      results.push({ userId: plan.userId, ok: true });
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      console.error(
        `[match] 提案の送信に失敗: ${plan.userId}（Bot を友だち追加しているか、lineUserId がこのチャネルで取得したものか確認）`,
      );
      results.push({ userId: plan.userId, ok: false, error: message });
    }
  }

  if (!results.some((r) => r.ok)) {
    throw new Error(`全員への送信に失敗しました: ${results.map((r) => `${r.userId}（${r.error}）`).join(", ")}`);
  }
  return results;
}
