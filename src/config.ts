// 環境変数の読み込み。ローカルでは .env、Cloud Run ではサービスの環境変数から読む。
import "dotenv/config";

export const config = {
  port: Number(process.env.PORT ?? 8080),
  geminiApiKey: process.env.GEMINI_API_KEY ?? "",
  geminiModel: process.env.GEMINI_MODEL ?? "gemini-3.6-flash",
  lineChannelAccessToken: process.env.LINE_CHANNEL_ACCESS_TOKEN ?? "",
  lineChannelSecret: process.env.LINE_CHANNEL_SECRET ?? "",
  lineDemoUserId: process.env.LINE_DEMO_USER_ID ?? "",
};

export function missingEnv(): string[] {
  const required: Record<string, string> = {
    GEMINI_API_KEY: config.geminiApiKey,
    LINE_CHANNEL_ACCESS_TOKEN: config.lineChannelAccessToken,
    LINE_CHANNEL_SECRET: config.lineChannelSecret,
    LINE_DEMO_USER_ID: config.lineDemoUserId,
  };
  return Object.entries(required)
    .filter(([, value]) => !value)
    .map(([key]) => key);
}
