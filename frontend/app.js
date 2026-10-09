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
Object.assign(copy.en, {
  skip: "Skip to message checker",
  eyebrow: "A LITTLE PAUSE. A LOT OF PROTECTION.",
  headline: "Trust your instincts. Check the message.",
  intro:
    "A strange call. An urgent message. Before you share, pay, or panic, take a moment to see the warning signs.",
  heroCta: "Check a message",
  proofOne: "No account needed",
  proofTwo: "English & Hindi",
  visualTitle: "A clearer next step",
  visualText: "Calm guidance, when you need it.",
  checkerEyebrow: "LET’S TAKE A CLOSER LOOK",
  checkerTitle: "What’s on your mind?",
  checkerNote: "A little clarity goes a long way.",
  transcript: "Paste the call or message",
  placeholder:
    "For example: ‘Your account will be blocked. Share the OTP right now to verify…’",
  yourChoice: "YOUR PRIVACY, YOUR CHOICE",
  useAi: "Add AI context with Groq",
  aiConsent:
    "Optional. Sends this transcript to Groq. Leave off to use local backend rules only.",
  saveCheck: "Save this check on this device",
  saveConsent:
    "Optional. Saves the transcript in this browser. Unchecked again after each check.",
  privacy: "Nothing is saved unless you choose. Up to 10,000 characters.",
  guideEyebrow: "WHEN SOMETHING FEELS OFF",
  guideTitle: "Pause. Check. Protect.",
  guideIntro: "Scams often rush you. Give yourself room to think.",
  stepOne: "Keep your details yours",
  stepOneText: "Never share OTPs, PINs, or passwords with a caller.",
  stepTwo: "Verify on your terms",
  stepTwoText: "Hang up. Find the official number yourself and call back.",
  stepThree: "Talk it through",
  stepThreeText: "Ask someone you trust before sending money or taking action.",
  guideFoot: "Real help gives you time to verify.",
  resultTitle: "YOUR MESSAGE, EXPLAINED",
  heuristic: "Signal score · not a probability",
  score: "Signal score",
  nextStep: "YOUR NEXT STEP",
  onlyYours: "ONLY ON THIS DEVICE",
  historyPrivacy:
    "Only checks you choose to save appear here. Stored in this browser, never on our server.",
  noHistory: "A little peace of mind. No saved checks yet.",
  principleOne: "Understand the signals",
  principleOneText:
    "See the phrases that raised a flag, with a clear explanation of why they matter.",
  principleTwo: "Stay in control",
  principleTwoText:
    "AI and saving are optional. Choose what happens to your message on every check.",
  principleThree: "Take the next step",
  principleThreeText:
    "Get practical guidance. For high-risk messages, find India’s cybercrime reporting resources.",
  footerNote: "A thoughtful pause can make a difference.",
  online: "Backend connected",
  disconnected: "Backend offline",
  connecting: "Connecting…",
  mode_used: "Rules + AI context",
  mode_disabled: "Offline rules only",
  mode_missing_key: "Rules only · AI not configured",
  mode_invalid_model: "Rules only · model unavailable",
  mode_invalid_output: "Rules only · invalid AI response",
  mode_unavailable: "Rules only · AI unavailable",
  uncertainty:
    "This score measures known warning signals, not the chance of fraud. Subtle scams can be missed. Verify unexpected requests independently.",
  fallbackNote:
    "AI did not run successfully. Pattern matching can miss context; treat the result as a starting point.",
  loading: "Looking for warning signs…",
  saved: "Saved on this device.",
  unsaved: "This check was not saved.",
});
Object.assign(copy.hi, {
  skip: "संदेश जांच पर जाएं",
  eyebrow: "थोड़ा ठहरें। ज्यादा सुरक्षित रहें।",
  headline: "अपने मन की सुनें। संदेश जांचें।",
  intro:
    "अजीब कॉल या जल्दबाजी वाला संदेश? जानकारी या पैसे देने से पहले चेतावनी के संकेत समझने के लिए थोड़ा समय लें।",
  heroCta: "संदेश जांचें",
  proofOne: "खाते की जरूरत नहीं",
  proofTwo: "अंग्रेज़ी और हिन्दी",
  visualTitle: "अगला कदम समझें",
  visualText: "जरूरत के समय सहज मार्गदर्शन।",
  checkerEyebrow: "आइए ध्यान से देखें",
  checkerTitle: "आपको क्या चिंता है?",
  checkerNote: "थोड़ी समझ, बेहतर फैसला।",
  transcript: "कॉल का विवरण या संदेश पेस्ट करें",
  placeholder:
    "उदाहरण: ‘आपका खाता बंद हो जाएगा। सत्यापन के लिए अभी OTP बताएं…’",
  yourChoice: "आपकी गोपनीयता, आपकी पसंद",
  useAi: "Groq से AI विश्लेषण जोड़ें",
  aiConsent:
    "वैकल्पिक। यह पाठ Groq को भेजता है। बंद रखने पर केवल लोकल बैकएंड के नियम उपयोग होंगे।",
  saveCheck: "यह जांच इस डिवाइस पर सहेजें",
  saveConsent:
    "वैकल्पिक। पाठ इस ब्राउज़र में सहेजता है। हर जांच के बाद यह विकल्प फिर बंद हो जाता है।",
  privacy: "आपकी पसंद के बिना कुछ नहीं सहेजा जाता। अधिकतम 10,000 अक्षर।",
  guideEyebrow: "जब कुछ गलत लगे",
  guideTitle: "रुकें। जांचें। सुरक्षित रहें।",
  guideIntro: "धोखाधड़ी में जल्दबाजी कराई जाती है। सोचने के लिए समय लें।",
  stepOne: "जानकारी अपने पास रखें",
  stepOneText: "कॉल करने वाले को OTP, PIN या पासवर्ड न दें।",
  stepTwo: "खुद सत्यापन करें",
  stepTwoText: "कॉल काटें। आधिकारिक नंबर खुद खोजें और वापस कॉल करें।",
  stepThree: "किसी से बात करें",
  stepThreeText:
    "पैसे भेजने या कदम उठाने से पहले किसी भरोसेमंद व्यक्ति से सलाह लें।",
  guideFoot: "असली मदद आपको सत्यापन का समय देती है।",
  resultTitle: "आपके संदेश का विश्लेषण",
  heuristic: "संकेत स्कोर · संभावना नहीं",
  score: "संकेत स्कोर",
  nextStep: "आपका अगला कदम",
  onlyYours: "केवल इस डिवाइस पर",
  historyPrivacy:
    "केवल आपकी चुनी हुई जांच यहां सहेजी जाती हैं। इस ब्राउज़र में, हमारे सर्वर पर नहीं।",
  noHistory: "अभी कोई जांच सहेजी नहीं गई है।",
  principleOne: "संकेत समझें",
  principleOneText:
    "चिह्नित वाक्यांश देखें और समझें कि वे चिंता का कारण क्यों हैं।",
  principleTwo: "नियंत्रण आपके हाथ",
  principleTwoText:
    "AI और इतिहास वैकल्पिक हैं। हर जांच में तय करें कि आपके संदेश का क्या होगा।",
  principleThree: "अगला कदम उठाएं",
  principleThreeText:
    "व्यावहारिक मार्गदर्शन पाएं। अधिक जोखिम वाले संदेश पर भारत के साइबर अपराध रिपोर्टिंग संसाधन देखें।",
  footerNote: "थोड़ा ठहरना बड़ा फर्क ला सकता है।",
  online: "बैकएंड जुड़ा है",
  disconnected: "बैकएंड ऑफलाइन है",
  connecting: "जोड़ रहे हैं…",
  mode_used: "नियम और AI विश्लेषण",
  mode_disabled: "केवल ऑफलाइन नियम",
  mode_missing_key: "केवल नियम · AI कॉन्फ़िगर नहीं है",
  mode_invalid_model: "केवल नियम · मॉडल अनुपलब्ध",
  mode_invalid_output: "केवल नियम · अमान्य AI उत्तर",
  mode_unavailable: "केवल नियम · AI अनुपलब्ध",
  uncertainty:
    "यह स्कोर ज्ञात चेतावनी संकेत बताता है, धोखाधड़ी की संभावना नहीं। सूक्ष्म धोखाधड़ी छूट सकती है। अचानक आए अनुरोध की स्वतंत्र जांच करें।",
  fallbackNote:
    "AI विश्लेषण सफल नहीं हुआ। नियम पूरे संदर्भ को समझ नहीं सकते; परिणाम को शुरुआती संकेत मानें।",
  loading: "चेतावनी के संकेत खोज रहे हैं…",
  saved: "इस डिवाइस पर सहेजा गया।",
  unsaved: "यह जांच सहेजी नहीं गई।",
});
let lang = "en",
  samples = window.SENTINELCALL_SAMPLES || [],
  current = null,
  history = [],
  recognition = null,
  recording = false,
  busy = false,
  connectionState = "connecting",
  errorKey = null;
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
const historyKey = "sentinelcall.history.v2";
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
  errorKey = key;
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
  $("error-box").hidden = !errorKey;
  if (errorKey) message(errorKey);
  updateConnection(connectionState);
  updateCharacterCount();
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
  const localized = data.localized?.[lang];
  $("explanation").textContent = localized?.explanation || data.explanation;
  $("action-box-text").textContent =
    localized?.recommended_action || data.recommended_action;
  const mode =
    data.llm_status || (data.llm_score == null ? "disabled" : "used");
  $("analysis-mode").textContent = t(`mode_${mode}`) || t("mode_unavailable");
  $("analysis-mode").dataset.mode = ["used", "disabled"].includes(mode)
    ? "normal"
    : "fallback";
  $("analysis-note").textContent =
    t("uncertainty") +
    (["used", "disabled"].includes(mode) ? "" : " " + t("fallbackNote"));
  $("result").dataset.risk = data.risk_level;
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
        f.end <= points.length,
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
  $("save-status").textContent = t(current?.saved ? "saved" : "unsaved");
}
function renderHistory() {
  $("history-list").replaceChildren();
  if (!history.length) {
    const empty = document.createElement("div");
    empty.className = "history-empty";
    empty.textContent = t("noHistory");
    $("history-list").append(empty);
    return;
  }
  history.forEach((item) => {
    const button = document.createElement("button");
    button.className = "history-item";
    const date = new Date(item.time);
    const title = document.createElement("strong");
    title.textContent = `${t(item.level)} · ${item.score}/100`;
    const preview = document.createElement("span");
    preview.textContent = item.text.slice(0, 100);
    const meta = document.createElement("span");
    meta.className = "history-meta";
    meta.textContent = Number.isNaN(date.getTime())
      ? ""
      : date.toLocaleString(lang === "hi" ? "hi-IN" : "en-IN");
    button.append(title, preview, meta);
    button.onclick = () => {
      $("transcript").value = item.text;
      current = null;
      $("result").hidden = true;
      updateCharacterCount();
      $("transcript").focus();
    };
    $("history-list").append(button);
  });
}
$("clear-history").onclick = () => {
  try {
    localStorage.removeItem(historyKey);
    localStorage.removeItem("sentinelcall.history.v1");
    history = [];
    renderHistory();
  } catch {
    message("storage");
  }
};
$("sample-picker").onchange = () => {
  const sample = samples.find((s) => s.id === $("sample-picker").value);
  if (sample) {
    $("transcript").value = sample.transcript;
    transcriptChanged();
  }
};
$("analyze-btn").onclick = async () => {
  const text = $("transcript").value;
  errorKey = null;
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
  const useAI = $("use-ai").checked;
  const saveThisCheck = $("save-check").checked;
  $("use-ai").disabled = true;
  $("save-check").disabled = true;
  try {
    const data = await api("/analyze", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        transcript: text,
        language_hint: requestLang,
        use_llm: useAI,
      }),
    });
    current = { data, text, language: requestLang };
    updateConnection("online");
    if (saveThisCheck) {
      const entry = {
        text,
        score: data.risk_score,
        level: data.risk_level,
        time: new Date().toISOString(),
      };
      const nextHistory = [entry, ...history].slice(0, 10);
      try {
        localStorage.setItem(historyKey, JSON.stringify(nextHistory));
        history = nextHistory;
        current.saved = true;
      } catch {
        message("storage");
      }
    }
    renderResult(data, text);
    $("save-check").checked = false;
    $("result").focus({ preventScroll: true });
    $("result").scrollIntoView({ block: "start" });
    renderHistory();
  } catch (e) {
    if (e.key === "offline") updateConnection("disconnected");
    message(e.key);
  } finally {
    busy = false;
    $("analyze-btn").disabled = false;
    $("record-btn").disabled = false;
    $("use-ai").disabled = false;
    $("save-check").disabled = false;
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
    transcriptChanged();
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
function updateCharacterCount() {
  $("character-count").textContent =
    `${Array.from($("transcript").value).length.toLocaleString(lang === "hi" ? "hi-IN" : "en-IN")} / 10,000`;
}
function updateConnection(state) {
  connectionState = state;
  $("connection-status").textContent = t(state);
  $("connection-status").dataset.state = state;
}
function transcriptChanged() {
  updateCharacterCount();
  current = null;
  $("result").hidden = true;
}
$("transcript").addEventListener("input", transcriptChanged);
setLanguage("en");
api("/health")
  .then(() => updateConnection("online"))
  .catch(() => updateConnection("disconnected"));
