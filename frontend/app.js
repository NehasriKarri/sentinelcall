"use strict";
const API_BASE = (
  window.SENTINELCALL_CONFIG?.API_BASE || "http://localhost:8000"
).replace(/\/$/, "");
const $ = (id) => document.getElementById(id);
const copy = {
  en: {
    headline: "A moment of clarity. Before you trust the call.",
    intro:
      "Paste a call transcript or message. Check for scam signals, understand the risk, and choose your next step.",
    transcript: "What did they say?",
    placeholder: "Paste the call, SMS, or WhatsApp message here…",
    privacy:
      "Up to 10,000 characters. With AI enabled, text is sent to Groq for analysis.",
    samples: "Try a sample call",
    record: "Use microphone",
    stop: "Stop recording",
    analyze: "Check this message",
    highlight: "Signals in your transcript",
    flags: "What raised a flag",
    report: "Report this scam",
    reportText:
      "If you lost money to cyber fraud in India, call 1930 promptly. You can also report on the national portal.",
    portal: "Open cybercrime.gov.in",
    helpline: "Call 1930",
    history: "Recent checks",
    clear: "Clear history",
    historyPrivacy:
      "Stored only in this browser. Saved checks include transcript text. Clear them on shared devices.",
    limitations:
      "Analyzes pasted or microphone-transcribed text. Does not capture live phone calls. A low score is not a guarantee of safety.",
    offline:
      "We cannot reach the backend. Start the API or check the URL in config.js, then try again.",
    empty: "Paste a transcript first.",
    loading: "Checking the message…",
    low: "Few known warning signs",
    medium: "Pause and verify",
    high: "High risk of a scam",
    score: "Risk score",
    rules: "Pattern score",
    ai: "AI score",
    none: "No specific phrases were flagged.",
    noHistory: "Your recent checks will appear here.",
    storage: "Browser storage is unavailable; this check was not saved.",
    speech:
      "Microphone input is unavailable in this browser. You can paste text instead.",
    listening:
      "Listening… microphone text may be processed by your browser’s speech provider.",
    micError:
      "Microphone input stopped. Check microphone permission or paste text.",
    long: "Keep the transcript under 10,000 characters.",
    rate: "Too many checks. Please wait a minute.",
    failed: "The backend could not complete this check. Please try again.",
    sampleTitles: [
      "Fake digital arrest",
      "Fake bank KYC update",
      "Fake courier / customs",
      "Genuine delivery",
      "Genuine bank service",
    ],
  },
  hi: {
    headline: "कॉल पर भरोसा करने से पहले, एक बार जांचें।",
    intro:
      "कॉल का विवरण या संदेश पेस्ट करें। धोखाधड़ी के संकेत समझें और अगला कदम सोचकर उठाएं।",
    transcript: "उन्होंने क्या कहा?",
    placeholder: "कॉल, SMS या WhatsApp संदेश यहां पेस्ट करें…",
    privacy:
      "अधिकतम 10,000 अक्षर। AI सक्षम होने पर पाठ विश्लेषण के लिए Groq को भेजा जाता है।",
    samples: "नमूना कॉल चुनें",
    record: "माइक्रोफ़ोन उपयोग करें",
    stop: "रिकॉर्डिंग रोकें",
    analyze: "संदेश जांचें",
    highlight: "आपके संदेश में संकेत",
    flags: "चेतावनी के संकेत",
    report: "धोखाधड़ी की रिपोर्ट करें",
    reportText:
      "भारत में साइबर धोखाधड़ी से पैसे खोए हैं तो तुरंत 1930 पर कॉल करें। राष्ट्रीय पोर्टल पर भी रिपोर्ट कर सकते हैं।",
    portal: "cybercrime.gov.in खोलें",
    helpline: "1930 पर कॉल करें",
    history: "हाल की जांच",
    clear: "इतिहास मिटाएं",
    historyPrivacy:
      "केवल इस ब्राउज़र में सहेजा जाता है। संदेश भी सहेजे जाते हैं। साझा डिवाइस पर इतिहास मिटाएं।",
    limitations:
      "पेस्ट किए गए या माइक्रोफ़ोन से लिखे पाठ की जांच करता है। लाइव फोन कॉल रिकॉर्ड नहीं करता। कम स्कोर सुरक्षा की गारंटी नहीं है।",
    offline:
      "बैकएंड से संपर्क नहीं हुआ। API शुरू करें या config.js में URL जांचें, फिर प्रयास करें।",
    empty: "पहले संदेश पेस्ट करें।",
    loading: "संदेश की जांच हो रही है…",
    low: "प्रमुख चेतावनी संकेत कम हैं",
    medium: "रुकें और सत्यापन करें",
    high: "धोखाधड़ी का अधिक जोखिम",
    score: "जोखिम स्कोर",
    rules: "नियम स्कोर",
    ai: "AI स्कोर",
    none: "कोई विशेष वाक्यांश चिह्नित नहीं हुआ।",
    noHistory: "आपकी हाल की जांच यहां दिखेगी।",
    storage: "ब्राउज़र स्टोरेज उपलब्ध नहीं है; जांच सहेजी नहीं गई।",
    speech: "इस ब्राउज़र में माइक्रोफ़ोन उपलब्ध नहीं है। पाठ पेस्ट करें।",
    listening:
      "सुन रहे हैं… पाठ आपके ब्राउज़र की वाणी सेवा द्वारा प्रोसेस हो सकता है।",
    micError: "माइक्रोफ़ोन बंद हुआ। अनुमति जांचें या पाठ पेस्ट करें।",
    long: "संदेश 10,000 अक्षरों से कम रखें।",
    rate: "बहुत अधिक जांच हुई हैं। एक मिनट प्रतीक्षा करें।",
    failed: "बैकएंड जांच पूरी नहीं कर सका। दोबारा प्रयास करें।",
    sampleTitles: [
      "नकली डिजिटल गिरफ्तारी",
      "नकली बैंक KYC",
      "नकली कूरियर / कस्टम",
      "असली डिलीवरी कॉल",
      "असली बैंक सेवा कॉल",
    ],
  },
};
let lang = "en",
  samples = [],
  current = null,
  history = [],
  recognition = null,
  recording = false,
  busy = false;
const t = (key) => copy[lang][key];
const reasons = {
  en: [
    "Authentication details mentioned. Never share OTPs or PINs.",
    "Authority claim: verify independently.",
    "Pressure to act quickly.",
    "Payment or transfer mentioned.",
    "Threat of consequences.",
    "Pressure to keep the call secret.",
  ],
  hi: [
    "सुरक्षा जानकारी का उल्लेख है। OTP या PIN न दें।",
    "अधिकारी होने का दावा: स्वतंत्र रूप से सत्यापन करें।",
    "जल्दी करने का दबाव।",
    "भुगतान या ट्रांसफर का उल्लेख।",
    "परिणामों की धमकी।",
    "कॉल गुप्त रखने का दबाव।",
  ],
};
const categories = [
  "otp_or_pin_request",
  "impersonation_of_authority",
  "urgency_pressure",
  "payment_or_transfer_request",
  "threat_of_consequence",
  "secrecy_or_isolation",
];
const historyKey = "sentinelcall.history.v1";
try {
  const saved = JSON.parse(localStorage.getItem(historyKey) || "[]");
  if (Array.isArray(saved))
    history = saved
      .filter(
        (x) =>
          typeof x.text === "string" &&
          x.text.length <= 10000 &&
          ["low", "medium", "high"].includes(x.level) &&
          Number.isFinite(x.score),
      )
      .slice(0, 10);
} catch {
  /* Storage is optional. */
}
function message(key) {
  $("error-box").textContent = t(key);
  $("error-box").hidden = false;
}
async function api(path, options = {}) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 50000);
  try {
    const response = await fetch(API_BASE + path, {
      ...options,
      signal: controller.signal,
    });
    if (!response.ok)
      throw {
        key:
          response.status === 429
            ? "rate"
            : response.status === 422
              ? "long"
              : "failed",
      };
    return await response.json();
  } catch (error) {
    throw { key: error.key || "offline" };
  } finally {
    clearTimeout(timer);
  }
}
function sampleOptions() {
  const selected = $("sample-picker").value;
  $("sample-picker").replaceChildren(new Option(t("samples"), ""));
  samples.forEach((s, i) =>
    $("sample-picker").add(
      new Option(copy[lang].sampleTitles[i] || s.title, s.id),
    ),
  );
  $("sample-picker").value = selected;
}
function setLanguage(value) {
  lang = value;
  document.documentElement.lang = lang;
  document
    .querySelectorAll("[data-i18n]")
    .forEach((el) => (el.textContent = t(el.dataset.i18n)));
  document
    .querySelectorAll("[data-i18n-placeholder]")
    .forEach((el) => (el.placeholder = t(el.dataset.i18nPlaceholder)));
  document
    .querySelectorAll(".lang-btn")
    .forEach((el) =>
      el.setAttribute("aria-pressed", String(el.dataset.lang === lang)),
    );
  $("record-btn").textContent = t(recording ? "stop" : "record");
  $("status-hint").textContent = busy
    ? t("loading")
    : recording
      ? t("listening")
      : "";
  $("error-box").hidden = true;
  sampleOptions();
  renderHistory();
  if (current) renderResult(current.data, current.text);
}
function renderResult(data, text) {
  $("result").hidden = false;
  $("score-dial").textContent = data.risk_score;
  $("gauge-needle").style.transform = `rotate(${data.risk_score * 1.8}deg)`;
  $("verdict-label").textContent = t(data.risk_level);
  $("verdict-label").className = `risk-${data.risk_level}`;
  $("verdict-sub").textContent = `${t("score")} ${data.risk_score}/100`;
  // The API supplies localized reasoning for the language used for that check.
  $("explanation").textContent =
    current?.language === lang
      ? data.explanation
      : lang === "hi"
        ? "यह स्कोर पहचाने गए संकेतों और उपलब्ध AI विश्लेषण पर आधारित है। मूल भाषा में पूरा विश्लेषण देखने के लिए वापस बदलें।"
        : "This score uses detected signals and any available AI reasoning. Switch back to the check’s original language for its full explanation.";
  $("action-box-text").textContent =
    current?.language === lang
      ? data.recommended_action
      : lang === "hi"
        ? "व्यक्तिगत जानकारी या पैसे देने से पहले स्वतंत्र रूप से सत्यापन करें।"
        : "Verify independently before sharing personal details or sending money.";
  $("flag-list").replaceChildren();
  for (const flag of data.flagged_phrases) {
    const item = document.createElement("p");
    item.className = "flag-item";
    item.textContent = `“${flag.phrase}” — ${reasons[lang][categories.indexOf(flag.category)] || flag.reason}`;
    $("flag-list").append(item);
  }
  if (!data.flagged_phrases.length) $("flag-list").textContent = t("none");
  const points = Array.from(text);
  const utf16 = [0];
  for (const point of points) utf16.push(utf16.at(-1) + point.length);
  const ranges = data.flagged_phrases
    .filter(
      (f) =>
        Number.isInteger(f.start) &&
        Number.isInteger(f.end) &&
        f.start >= 0 &&
        f.end > f.start &&
        f.end <= text.length,
    )
    .map((f) => [utf16[f.start], utf16[f.end]])
    .sort((a, b) => a[0] - b[0]);
  const merged = [];
  for (const range of ranges) {
    const last = merged.at(-1);
    if (last && range[0] <= last[1]) last[1] = Math.max(last[1], range[1]);
    else merged.push([...range]);
  }
  const preview = $("highlighted-transcript");
  preview.replaceChildren();
  let offset = 0;
  for (const [a, b] of merged) {
    preview.append(document.createTextNode(text.slice(offset, a)));
    const mark = document.createElement("mark");
    mark.textContent = text.slice(a, b);
    preview.append(mark);
    offset = b;
  }
  preview.append(document.createTextNode(text.slice(offset)));
  $("score-breakdown").textContent =
    `${t("rules")}: ${data.rule_score}/100` +
    (data.llm_score == null ? "" : ` · ${t("ai")}: ${data.llm_score}/100`);
  $("report-helper").hidden = data.risk_level !== "high";
}
function renderHistory() {
  $("history-list").replaceChildren();
  if (!history.length) {
    $("history-list").textContent = t("noHistory");
    return;
  }
  history.forEach((item) => {
    const button = document.createElement("button");
    button.className = "history-item";
    const date = new Date(item.time);
    button.textContent = `${t(item.level)} · ${item.score}/100 · ${Number.isNaN(date.getTime()) ? "" : date.toLocaleString(lang === "hi" ? "hi-IN" : "en-IN")} — ${item.text.slice(0, 100)}`;
    button.onclick = () => {
      $("transcript").value = item.text;
      current = null;
      $("result").hidden = true;
      $("transcript").focus();
    };
    $("history-list").append(button);
  });
}
$("clear-history").onclick = () => {
  try {
    localStorage.removeItem(historyKey);
    history = [];
    renderHistory();
  } catch {
    message("storage");
  }
};
$("sample-picker").onchange = () => {
  const sample = samples.find((s) => s.id === $("sample-picker").value);
  if (sample) $("transcript").value = sample.transcript;
};
$("analyze-btn").onclick = async () => {
  const text = $("transcript").value;
  $("error-box").hidden = true;
  if (!text.trim()) return message("empty");
  if (text.length > 10000) return message("long");
  if (recording) recognition.stop();
  busy = true;
  $("analyze-btn").disabled = true;
  $("record-btn").disabled = true;
  $("status-hint").textContent = t("loading");
  $("result").hidden = true;
  current = null;
  const requestLang = lang;
  try {
    const data = await api("/analyze", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ transcript: text, language_hint: requestLang }),
    });
    current = { data, text, language: requestLang };
    renderResult(data, text);
    history.unshift({
      text,
      score: data.risk_score,
      level: data.risk_level,
      time: new Date().toISOString(),
    });
    history = history.slice(0, 10);
    try {
      localStorage.setItem(historyKey, JSON.stringify(history));
    } catch {
      message("storage");
    }
    renderHistory();
  } catch (e) {
    message(e.key);
  } finally {
    busy = false;
    $("analyze-btn").disabled = false;
    $("record-btn").disabled = false;
    $("status-hint").textContent = "";
  }
};
const SpeechRecognition =
  window.SpeechRecognition || window.webkitSpeechRecognition;
$("record-btn").onclick = () => {
  if (!SpeechRecognition) return message("speech");
  if (recording) {
    recognition.stop();
    return;
  }
  recognition = new SpeechRecognition();
  recognition.lang = lang === "hi" ? "hi-IN" : "en-IN";
  recognition.continuous = true;
  recognition.interimResults = false;
  recognition.onstart = () => {
    recording = true;
    $("record-btn").setAttribute("aria-pressed", "true");
    $("record-btn").textContent = t("stop");
    $("status-hint").textContent = t("listening");
  };
  recognition.onresult = (event) => {
    for (let i = event.resultIndex; i < event.results.length; i++)
      if (event.results[i].isFinal)
        $("transcript").value = (
          $("transcript").value +
          " " +
          event.results[i][0].transcript
        ).slice(0, 10000);
  };
  recognition.onerror = () => message("micError");
  recognition.onend = () => {
    recording = false;
    $("record-btn").setAttribute("aria-pressed", "false");
    $("record-btn").textContent = t("record");
    $("status-hint").textContent = busy ? t("loading") : "";
  };
  try {
    recognition.start();
  } catch {
    message("micError");
  }
};
document.querySelectorAll(".lang-btn").forEach(
  (button) =>
    (button.onclick = () => {
      if (recording) recognition.stop();
      setLanguage(button.dataset.lang);
    }),
);
setLanguage("en");
api("/samples")
  .then((data) => {
    samples = data;
    sampleOptions();
  })
  .catch((e) => message(e.key));
