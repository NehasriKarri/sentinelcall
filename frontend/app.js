const API_BASE = window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1"
  ? "http://localhost:8000"
  : "http://localhost:8000"; // update this if you deploy the backend elsewhere

const transcriptEl = document.getElementById("transcript");
const samplePicker = document.getElementById("sample-picker");
const analyzeBtn = document.getElementById("analyze-btn");
const statusHint = document.getElementById("status-hint");
const errorBox = document.getElementById("error-box");
const resultPanel = document.getElementById("result");

async function loadSamples() {
  try {
    const res = await fetch(`${API_BASE}/samples`);
    const samples = await res.json();
    for (const s of samples) {
      const opt = document.createElement("option");
      opt.value = s.id;
      opt.textContent = `${s.label === "scam" ? "⚠" : "✓"} ${s.title}`;
      samplePicker.appendChild(opt);
    }
    samplePicker.addEventListener("change", async () => {
      if (!samplePicker.value) return;
      const res = await fetch(`${API_BASE}/samples/${samplePicker.value}`);
      const sample = await res.json();
      transcriptEl.value = sample.transcript;
    });
  } catch (e) {
    statusHint.textContent = "Backend not reachable — start the API on port 8000.";
  }
}

function riskClass(level) {
  return { low: "low", medium: "medium", high: "high" }[level] || "low";
}

function renderResult(data) {
  resultPanel.style.display = "block";
  const dial = document.getElementById("score-dial");
  const label = document.getElementById("verdict-label");
  const sub = document.getElementById("verdict-sub");

  dial.textContent = data.risk_score;
  dial.className = `score-dial ${riskClass(data.risk_level)}`;

  const levelText = { low: "Looks safe", medium: "Be cautious", high: "Likely a scam" }[data.risk_level];
  label.textContent = levelText;
  label.className = `verdict-label risk-${data.risk_level}`;
  sub.textContent = `Risk score ${data.risk_score}/100`;

  document.getElementById("explanation").textContent = data.explanation;
  document.getElementById("action-box").textContent = `→ ${data.recommended_action}`;

  const flagList = document.getElementById("flag-list");
  flagList.innerHTML = "";
  if (data.flagged_phrases.length === 0) {
    flagList.innerHTML = '<p class="flag-item">No specific phrases were flagged.</p>';
  } else {
    for (const f of data.flagged_phrases) {
      const div = document.createElement("div");
      div.className = "flag-item";
      div.innerHTML = `<span class="flag-phrase">"${f.phrase}"</span> — <span class="flag-reason">${f.reason}</span>`;
      flagList.appendChild(div);
    }
  }

  document.getElementById("score-breakdown").textContent =
    `Pattern-match score: ${data.rule_score}/100` +
    (data.llm_score !== null && data.llm_score !== undefined ? ` · AI reasoning score: ${data.llm_score}/100` : "");
}

async function analyze() {
  const transcript = transcriptEl.value.trim();
  errorBox.style.display = "none";
  if (!transcript) {
    errorBox.textContent = "Paste a transcript first.";
    errorBox.style.display = "block";
    return;
  }

  analyzeBtn.disabled = true;
  statusHint.textContent = "Analyzing…";

  try {
    const res = await fetch(`${API_BASE}/analyze`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ transcript }),
    });
    if (!res.ok) throw new Error(`API error ${res.status}`);
    const data = await res.json();
    renderResult(data);
  } catch (e) {
    errorBox.textContent = `Could not analyze: ${e.message}. Is the backend running on port 8000?`;
    errorBox.style.display = "block";
  } finally {
    analyzeBtn.disabled = false;
    statusHint.textContent = "";
  }
}

analyzeBtn.addEventListener("click", analyze);
loadSamples();
