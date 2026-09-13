// LINE Messaging API（Phase 3 / Phase 6）
import type { Request, Response } from "express";
import { config } from "./config";
import { NotImplementedError } from "./errors";
import type { MatchResult } from "./types";

// Phase 3: テキストを Push 送信する。
export async function pushText(to: string, text: string): Promise<void> {
  // TODO(Phase 3): @line/bot-sdk の messagingApi.MessagingApiClient で pushMessage
  void to;
  void text;
  void config;
  throw new NotImplementedError("Phase 3: LINE Push");
}

// Phase 4〜6: マッチング提案を「参加する / 見送る」ボタン付きで送る。
export async function pushMatchProposal(to: string, match: MatchResult): Promise<void> {
  // TODO(Phase 6): Postback Action（data: action=accept&matchId=... / action=decline）付きで送信
  // TODO(Phase 7): Flex Message 化
  void to;
  void match;
  throw new NotImplementedError("Phase 4: LINE提案通知");
}

// Phase 6: Webhook 受信。req.body は express.raw() による Buffer。
export async function handleWebhook(req: Request, res: Response): Promise<void> {
  // TODO(Phase 6):
  //   1. x-line-signature を validateSignature で検証
  //   2. events を走査し、postback の action=accept / decline を処理
  //   3. replyMessage で結果を返信
  console.log("[line/webhook] received", req.body?.toString?.() ?? "");
  // LINE Developers の「検証」ボタンが通るよう、未実装でも 200 を返す
  res.sendStatus(200);
}
