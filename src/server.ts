// エントリーポイント：Express サーバーとルーティング
import express, { type NextFunction, type Request, type Response } from "express";
import path from "path";
import { askGemini } from "./gemini";
import { config, missingEnv } from "./config";
import { handleWebhook, pushText } from "./line";
import { activities, runMatching, users } from "./match";

const app = express();

// LINE Webhook は署名検証に生の body が必要なので express.json() より前に登録する
app.post("/line/webhook", express.raw({ type: "*/*" }), handleWebhook);

app.use(express.json());
app.use(express.static(path.join(__dirname, "../public")));

// Phase 1: 動作確認
app.get("/health", (_req, res) => {
  res.json({ ok: true, missingEnv: missingEnv() });
});

// デモ画面用のデータ
app.get("/api/users", (_req, res) => {
  res.json({ users, activities });
});

// Phase 2: Gemini 疎通確認（発表者用）
app.post("/api/gemini/test", async (_req, res) => {
  const text = await askGemini("2036年のAI秘書として、一言で自己紹介してください。");
  res.json({ success: true, text });
});

// Phase 3: LINE Push 疎通確認（発表者用）
app.post("/api/line/test", async (_req, res) => {
  await pushText(config.lineDemoUserId, "Hello from Personal AI Secretary");
  res.json({ success: true });
});

// Phase 4〜5: マッチングデモ開始（発表者用トリガー。本番は Cloud Scheduler 等で自律起動）
app.post("/api/match", async (_req, res) => {
  const match = await runMatching();
  res.json({ success: true, match });
});

// エラーハンドラ：原因がわかるようにサーバーログへ出す
app.use((err: Error, _req: Request, res: Response, _next: NextFunction) => {
  if (err.name === "NotImplementedError") {
    res.status(501).json({ success: false, error: err.message });
    return;
  }
  console.error("[error]", err);
  res.status(500).json({ success: false, error: err.message });
});

app.listen(config.port, () => {
  console.log(`Server listening on http://localhost:${config.port}`);
  const missing = missingEnv();
  if (missing.length > 0) {
    console.warn(`[warn] 未設定の環境変数: ${missing.join(", ")}`);
  }
});
