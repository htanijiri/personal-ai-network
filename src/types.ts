// アプリ全体で使う型定義

export type TimeSlot = {
  start: string; // ISO8601（例: 2026-09-14T13:00:00+09:00）
  end: string;
};

export type UserProfile = {
  id: string;
  displayName: string;
  lineUserId: string; // 空の場合は LINE_DEMO_USER_ID に送る
  freeSlots: TimeSlot[];
  interests: string[];
  socialPreferences: {
    firstMeetingOk: boolean;
    preferredGroupSizeMin: number;
    preferredGroupSizeMax: number;
  };
  area: string;
};

export type Activity = {
  id: string;
  name: string;
  tags: string[];
  area: string;
  groupSizeMin: number;
  groupSizeMax: number;
  durationMinutes: number;
};

// デモ画面に表示する「AI秘書の判断サマリー」（Chain of Thought ではない）
export type SecretaryLog = {
  speaker: string; // 例: "Hiroshi AI", "Secretary Network"
  message: string;
};

// Gemini が返すマッチング結果（BRIEF §10）
export type MatchResult = {
  matchedUserIds: string[];
  activity: string;
  start: string;
  end: string;
  area: string;
  reason: string;
  conversationTopics: string[];
  confidence: number;
  logs: SecretaryLog[];
};
