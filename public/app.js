// デモ画面のスクリプト
// 流れ：探索中の表示 → /api/match（Gemini）→ AI秘書ログを1件ずつ表示 → 成立結果 → /api/line/push

const LOG_INTERVAL_MS = 1200; // AI秘書ログを1件ずつ出す間隔

const state = { users: [], running: false };

const $ = (id) => document.getElementById(id);
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

function escapeHtml(value) {
  return String(value).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);
}

function jst(iso, options) {
  return new Date(iso).toLocaleString("ja-JP", { timeZone: "Asia/Tokyo", ...options });
}
const hm = (iso) => jst(iso, { hour: "2-digit", minute: "2-digit" });
const formatRange = (start, end) => `${jst(start, { month: "numeric", day: "numeric", weekday: "short" })} ${hm(start)}〜${hm(end)}`;

function setStatus(stateName, text) {
  $("status").dataset.state = stateName;
  $("status-text").textContent = text;
}

// ---- 画面1：ユーザー一覧 ----

async function loadUsers() {
  const res = await fetch("/api/users");
  const { users } = await res.json();
  state.users = users;
  $("users").innerHTML = users.map(renderCard).join("");
}

function renderCard(u) {
  const p = u.socialPreferences;
  return `
    <article class="card" data-user-id="${escapeHtml(u.id)}">
      <div class="card-head">
        <div class="avatar">${escapeHtml(u.displayName.slice(0, 1))}</div>
        <div>
          <h3>${escapeHtml(u.displayName)} AI</h3>
          <p class="sub">${escapeHtml(u.area)}</p>
        </div>
      </div>
      <p class="meta">空き <b>${u.freeSlots.map((s) => `${hm(s.start)}〜${hm(s.end)}`).join(", ")}</b></p>
      <p class="meta">初対面 <b>${p.firstMeetingOk ? "OK" : "苦手"}</b> ・ 人数 <b>${p.preferredGroupSizeMin}〜${p.preferredGroupSizeMax}人</b></p>
      <div class="chips">${u.interests.map((i) => `<span class="chip">${escapeHtml(i)}</span>`).join("")}</div>
    </article>`;
}

function cards() {
  return document.querySelectorAll(".card");
}

function cardBySpeaker(speaker) {
  const user = state.users.find((u) => `${u.displayName} AI` === speaker);
  return user ? document.querySelector(`.card[data-user-id="${CSS.escape(user.id)}"]`) : null;
}

// ---- 画面3：AI秘書ログ ----

function addLog(speaker, message, kind = "") {
  $("logs").querySelector(".placeholder")?.remove();
  const li = document.createElement("li");
  li.className = `log ${kind}`.trim();
  li.innerHTML = `<span class="speaker">${escapeHtml(speaker)}</span><p>${escapeHtml(message)}</p>`;
  $("logs").appendChild(li);
  return li;
}

// ---- 画面4：成立結果 ----

function renderResult(match) {
  const names = match.matchedUserIds.map((id) => state.users.find((u) => u.id === id)?.displayName ?? id);
  const result = $("result");
  result.className = "result";
  result.innerHTML = `
    <p class="result-eyebrow">PROPOSAL · 確信度 ${Math.round(match.confidence * 100)}%</p>
    <h3>${escapeHtml(match.activity)}</h3>
    <dl>
      <div><dt>誰と</dt><dd>${names.map(escapeHtml).join("・")}（${names.length}人）</dd></div>
      <div><dt>いつ</dt><dd>${escapeHtml(formatRange(match.start, match.end))}</dd></div>
      <div><dt>どこで</dt><dd>${escapeHtml(match.area)}</dd></div>
      <div><dt>なぜ</dt><dd>${escapeHtml(match.reason)}</dd></div>
    </dl>
    <h4>共通の話題（事前ブリーフィング）</h4>
    <ul class="topics">${match.conversationTopics.map((t) => `<li>${escapeHtml(t)}</li>`).join("")}</ul>
    <p id="line-status" class="line-status">LINE への送信を準備中…</p>`;
}

function setLineStatus(text, kind = "") {
  const el = $("line-status");
  if (!el) return;
  el.className = `line-status ${kind}`.trim();
  el.textContent = text;
}

// ---- API ----

async function postJson(endpoint, body = {}) {
  const res = await fetch(endpoint, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const data = await res.json().catch(() => ({ success: false, error: `HTTP ${res.status}` }));
  $("output").textContent = `${endpoint}\nHTTP ${res.status}\n${JSON.stringify(data, null, 2)}`;
  if (!res.ok || !data.success) {
    throw new Error(data.error || `HTTP ${res.status}`);
  }
  return data;
}

// ---- デモ本体 ----

function resetView() {
  $("logs").innerHTML = '<li class="placeholder">まだ探索は始まっていません。</li>';
  const result = $("result");
  result.className = "result empty";
  result.textContent = "提案が成立すると、ここに表示されます。";
  cards().forEach((c) => c.classList.remove("scanning", "speaking", "matched", "excluded"));
  setStatus("idle", "待機中");
}

async function startDemo() {
  if (state.running) return;
  state.running = true;
  $("start").disabled = true;
  resetView();

  setStatus("scanning", "AI秘書ネットワークが探索中");
  cards().forEach((c) => c.classList.add("scanning"));
  const pending = addLog("Secretary Network", "各AI秘書に、明日の空き時間と最近の関心を問い合わせています", "network pending");

  try {
    const { match } = await postJson("/api/match", { notify: false });
    pending.remove();
    cards().forEach((c) => c.classList.remove("scanning"));

    setStatus("negotiating", "AI秘書同士が調整中");
    for (const log of match.logs) {
      const card = cardBySpeaker(log.speaker);
      card?.classList.add("speaking");
      addLog(log.speaker, log.message, log.speaker === "Secretary Network" ? "network" : "");
      await sleep(LOG_INTERVAL_MS);
      card?.classList.remove("speaking");
    }

    cards().forEach((c) => {
      c.classList.add(match.matchedUserIds.includes(c.dataset.userId) ? "matched" : "excluded");
    });
    renderResult(match);

    setStatus("notifying", "LINE に提案を送信中");
    setLineStatus("LINE に提案を送信中…");
    try {
      const { notified } = await postJson("/api/line/push", { match });
      const failed = notified.filter((r) => !r.ok);
      if (failed.length === 0) {
        setLineStatus("✓ 参加者の LINE に提案を届けました", "sent");
        setStatus("matched", "提案を LINE に届けました");
      } else {
        const nameOf = (id) => state.users.find((u) => u.id === id)?.displayName ?? id;
        setLineStatus(`${notified.length - failed.length}件送信 ・ 送れなかった人：${failed.map((r) => nameOf(r.userId)).join("、")}`, "failed");
        setStatus("matched", "提案を LINE に届けました（一部失敗）");
      }
    } catch (err) {
      setLineStatus(`LINE 送信エラー: ${err.message}`, "failed");
      setStatus("error", "LINE 送信エラー");
    }
  } catch (err) {
    pending.remove();
    cards().forEach((c) => c.classList.remove("scanning"));
    addLog("System", `エラー: ${err.message}`, "error");
    setStatus("error", "エラー");
  } finally {
    state.running = false;
    $("start").disabled = false;
  }
}

// ---- イベント ----

$("start").addEventListener("click", startDemo);
$("reset").addEventListener("click", () => {
  if (!state.running) resetView();
});

document.querySelectorAll("button[data-endpoint]").forEach((btn) => {
  btn.addEventListener("click", async () => {
    $("output").textContent = `${btn.dataset.endpoint} を実行中…`;
    await postJson(btn.dataset.endpoint).catch(() => {});
  });
});

// 発表者用ショートカット：S で開始、R でリセット
document.addEventListener("keydown", (e) => {
  if (e.ctrlKey || e.metaKey || e.altKey || e.target.closest("input, textarea")) return;
  if (e.key === "s" || e.key === "S") startDemo();
  if ((e.key === "r" || e.key === "R") && !state.running) resetView();
});

loadUsers();
