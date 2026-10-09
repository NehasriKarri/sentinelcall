# SentinelCall

A local demo that checks pasted or browser-transcribed calls and messages for scam signals. Six weighted rule categories cover English, Hindi in Devanagari, and romanized Hinglish. Optional Groq reasoning adds context; the rule score always sets the floor.

## Run locally

Python 3.11+ recommended. From the repository root:

```sh
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
cp .env.example .env
```

Optionally edit `.env` to add a Groq key. Never commit it. Backend, from `backend/`:

```sh
uvicorn main:app --reload --port 8000
```

Frontend: open `frontend/index.html` directly in a browser. On macOS, from the repository root:

```sh
open frontend/index.html
```

No build step. For browsers requiring an HTTP origin for microphone access, optionally run `python3 -m http.server 5500 --directory frontend`, then open http://localhost:5500. Speech support and permissions vary by browser.

## Configuration

| Setting | Default | Purpose |
| --- | --- | --- |
| `GROQ_API_KEY` | unset | Optional Groq reasoning; without it checks use rules |
| `GROQ_MODEL` | `llama-3.1-8b-instant` | Groq model ID; select a model available to your free-tier account |
| `RATE_LIMIT_PER_MINUTE` | `30` | Checks per client IP per rolling minute, per process |
| `window.SENTINELCALL_CONFIG.API_BASE` | `http://localhost:8000` | Edit `frontend/config.js` to point to another API |

Model availability changes: consult [Groq supported models](https://console.groq.com/docs/models). A model 404 or a recognized decommissioned-model error produces an explicit `GROQ_MODEL` message and a rule-only verdict. Requests have three attempts at most, a 3-second connection timeout, 10-second read timeout, and exponential backoff for transient connection errors, 429s and selected 5xx responses. Strict JSON validation rejects invalid scores or missing fields. Errors never expose raw provider responses or credentials.

## API

- `POST /analyze`: `{"transcript":"...", "language_hint":"en", "use_llm":false}`. `language_hint` accepts `en` or `hi` and is optional. `use_llm` defaults to `false`; set it to `true` to authorize sending this transcript to Groq. Transcript must be nonblank and at most 10,000 characters. Body limit: 128 KB.
- `GET /samples`: five examples, three scams and two genuine calls.
- `GET /samples/{id}`: one example.
- `GET /health`: liveness. Interactive docs: http://localhost:8000/docs.

Errors use `{"error":{"code":"...","message":"..."}}`, including validation, unknown routes, body limits, and rate limits (429 with `Retry-After`). An unavailable AI provider is a successful check with a rule-only explanation and `llm_score: null`. Responses also include complete `localized.en` and `localized.hi` explanations/actions, and `llm_status` (`used`, `disabled`, `missing_key`, `invalid_model`, `invalid_output`, or `unavailable`). The language toggle switches full results immediately without another network request.

## Detection and privacy

`backend/scam_detector.py` holds `RULE_CONFIG`, with patterns, weights, and explanations by category and language. Each category counts once. Sensitive-detail and payment categories require a request/action context. Protective advice is suppressed within its clause, while a later demand is still scored. This handles common negation, not arbitrary conversational reasoning. Normalization collapses common spoken/spaced OTP forms, lowercases, and cleans whitespace/punctuation while preserving original offsets for highlighting. Flags use Python character offsets; the frontend converts them for JavaScript Unicode indexing.

Final score is `max(rule_score, round(0.4 * rule_score + 0.6 * llm_score))`; without AI it is the rule score. Low: below 35, caution: 35–64, high: 65+. Scores are heuristics, not calibrated probabilities.

The backend does not persist transcripts. Request logs contain only method, route template, status, and duration. Uvicorn's default access log can include paths and IPs; use `--no-access-log` if desired. With AI enabled, transcripts are sent to Groq. Browser speech recognition may send audio to the browser vendor's service. AI is off by default in the frontend and API. The frontend asks separately whether to save each check; saving is unchecked again after success. Only saved checks store up to ten transcripts in localStorage. Clear history on shared devices. Storage failures do not stop analysis.

## Verification

```sh
pytest -q
python evaluation/evaluate.py
python evaluation/evaluate.py --split development
python evaluation/evaluate.py --threshold 35 --show-errors
python scripts/sync_samples.py --check
```

Tests run offline with mocked Groq requests: normalization and original spans, every rule category in three language forms, score floors, malformed JSON/schema, model failures, retries, samples, validation, private logs, body limits, and rate limits. GitHub Actions runs them on Python 3.11–3.13.

The evaluation data has 50 development examples and a separate 30-example synthetic holdout, with English, Hindi, and Hinglish, safety advice, benign notifications, transcription errors, and subtle prize scams. The default script evaluates the holdout and reports precision/recall per language; `--show-errors` prints IDs and scenarios without transcripts. Do not tune rules on holdout mistakes. Collect consented, anonymized real-world examples before making deployment accuracy claims.

At threshold 65, the current offline holdout result is 11 true positives, 0 false positives, 4 false negatives, and 15 true negatives: precision 1.000, recall 0.733. Three missed scams are subtle prize scripts; one is a speech-error script. This is a small synthetic test, not a real-world performance estimate.

## Opening animation

A four-second, full-screen opening takes inspiration from Katran's fragment/convergence/wipe choreography. Six message fragments fly in, converge into a shield, and give way to a large SentinelCall wordmark. A sage colour wipe lifts away to reveal the hero with staggered typography. It uses native CSS animations, not a new runtime dependency.

It plays once per tab. Skip it immediately with the button or Escape; replay it from the footer. Both languages are supported. Reduced-motion preferences bypass the sequence, and changing that preference during playback closes it immediately. Native dialog behavior keeps background controls inert and restores focus on dismissal. Scroll locking and timers are cleaned up on every exit. There is no audio and the animation does not imply a real scan or live-call capture.

## Frontend assets and samples

Two original illustrations are bundled as optimized JPEGs under `frontend/assets/` (about 353 KB total). Their final prompts and generation tool are documented in `frontend/assets/README.md`. No image CDN or frontend build is required. Fraunces and Work Sans load from Google Fonts with local serif/sans-serif fallbacks when offline.

Samples are bundled in `frontend/samples.js` so the picker works when the API is unavailable. After changing backend samples, run `python scripts/sync_samples.py`. CI checks that the bundle matches. Analysis still requires the backend; an unavailable API shows a friendly error. Browser speech recognition remains separate from offline text rules and may use the browser vendor's speech service.

## Docker

```sh
docker build -t sentinelcall .
docker run --rm -p 8000:8000 --env-file .env sentinelcall
```

The image runs the backend as a non-root user. Open the frontend separately. Secrets are excluded from the build context.

## Browser checks

Check 320/375/390px widths, readable sample options, keyboard focus and native dropdown operation, English/Hindi switching, microphone permissions and stop/error handling, screen-reader verdict announcements, reduced-motion settings, unavailable backend, local history reload/clear, and flags containing HTML or emoji. Changing the language toggle translates the complete stored result, including AI explanations, without another analysis request. Groq output must provide both translations or it falls back to rules.

High-risk checks show the [National Cybercrime Reporting Portal](https://cybercrime.gov.in/) and 1930 for reporting financial cyber fraud in India ([official reporting guidance](https://cybercrime.gov.in/uploadmedia/instructions_citizenreportingcyberfrauds.pdf)).

## Limitations

This app analyzes pasted or microphone-transcribed text. **It does not capture live phone calls.** False positives and missed scams are possible, particularly with negation, unfamiliar phrasing, mixed languages, or inaccurate transcription. The rule floor means AI cannot lower a false-positive rule score. A low score does not prove safety. No live Groq integration is required for tests.

CORS is permissive for local file access. Rate limits are bounded, in-memory and per process, reset on restart, and do not trust forwarded IP headers. Public deployment needs restricted origins, shared limits and appropriate reverse-proxy configuration. API request bodies are bounded before parsing; this is not a complete public abuse-protection system.

MIT licensed. See LICENSE.
