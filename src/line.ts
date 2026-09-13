// LINE Messaging API（Phase 3 / Phase 6）
import { messagingApi } from "@line/bot-sdk";
import type { Request, Response } from "express";
import { config } from "./config";

// Phase 3: テキストを Push 送信する。
export async function pushText(to: string, text: string): Promise<void> {
  await push(to, [{ type: "text", text }]);
}

let client: messagingApi.MessagingApiClient | undefined;

function getClient(): messagingApi.MessagingApiClient {
  if (!config.lineChannelAccessToken) {
    throw new Error("LINE_CHANNEL_ACCESS_TOKEN が設定されていません（.env または Cloud Run の環境変数を確認）");
  }
  client ??= new messagingApi.MessagingApiClient({ channelAccessToken: config.lineChannelAccessToken });
  return client;
}

// API エラーの内容をサーバーログに出してから投げ直す
async function push(to: string, messages: messagingApi.Message[]): Promise<void> {
  if (!to) {
    throw new Error("送信先の LINE ユーザーID が空です（LINE_DEMO_USER_ID を確認）");
  }
  try {
    await getClient().pushMessage({ to, messages });
    console.log(`[line] push ok (to=${to.slice(0, 5)}…, messages=${messages.length})`);
  } catch (err) {
    console.error("[line] push error:", err);
    throw err;
  }
}

// Phase 4〜6: マッチング提案を送る。現状は Gemini が参加者ごとに作った提案文をテキストで送る。
export async function pushMatchProposal(to: string, text: string): Promise<void> {
  // TODO(Phase 6): 「参加する / 今回は見送る」の Postback Action（action=accept / decline）を付ける
  // TODO(Phase 7): Flex Message 化
  await pushText(to, text);
}

// Phase 6: Webhook 受信。req.body は express.raw() による Buffer。
export async function handleWebhook(req: Request, res: Response): Promise<void> {
  // TODO(Phase 6):
  //   1. x-line-signature を validateSignature で検証
  //   2. events を走査し、postback の action=accept / decline を処理
  //   3. replyMessage で結果を返信
  const body = req.body?.toString?.() ?? "";
  console.log("[line/webhook] received", body);

  // 参加者の LINE ユーザーID を調べる用：Bot を友だち追加するかメッセージを送ってもらうと、ここに ID が出る
  try {
    const events = (JSON.parse(body).events ?? []) as { type: string; source?: { userId?: string } }[];
    for (const event of events) {
      console.log(`[line/webhook] event=${event.type} userId=${event.source?.userId ?? "(none)"}`);
    }
  } catch {
    // JSON でなければ無視
  }

  // LINE Developers の「検証」ボタンが通るよう、未実装でも 200 を返す
  res.sendStatus(200);
}
