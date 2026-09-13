// 未実装の機能を呼んだときに投げる。server.ts で 501 に変換される。
export class NotImplementedError extends Error {
  constructor(phase: string) {
    super(`まだ実装されていません（${phase}）`);
    this.name = "NotImplementedError";
  }
}
