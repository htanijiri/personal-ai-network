// デモ画面のスクリプト（Phase 5 でログのアニメーション表示などを追加する）

async function loadUsers() {
  const res = await fetch("/api/users");
  const { users } = await res.json();
  document.getElementById("users").innerHTML = users
    .map(
      (u) => `
      <div class="card">
        <h3>${u.displayName} AI</h3>
        <p>空き: ${u.freeSlots.map((s) => `${s.start.slice(11, 16)}〜${s.end.slice(11, 16)}`).join(", ")}</p>
        <p>趣味: ${u.interests.join(" / ")}</p>
        <p>初対面: ${u.socialPreferences.firstMeetingOk ? "OK" : "苦手"} ・ ${u.socialPreferences.preferredGroupSizeMin}〜${u.socialPreferences.preferredGroupSizeMax}人</p>
      </div>`,
    )
    .join("");
}

async function callApi(endpoint) {
  const output = document.getElementById("output");
  output.textContent = `${endpoint} を実行中…`;
  try {
    const res = await fetch(endpoint, { method: "POST" });
    const data = await res.json();
    output.textContent = `HTTP ${res.status}\n${JSON.stringify(data, null, 2)}`;
    // TODO(Phase 5): data.match.logs を #logs に順番に表示し、#result に成立結果を表示
  } catch (err) {
    output.textContent = `エラー: ${err}`;
  }
}

document.querySelectorAll("button[data-endpoint]").forEach((btn) => {
  btn.addEventListener("click", () => callApi(btn.dataset.endpoint));
});

loadUsers();
