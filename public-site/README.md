# Public hackathon deployment

This directory adapts the existing SentinelCall frontend and detection rules to a same-origin Cloudflare Worker for Sites hosting. The Python FastAPI app remains available for local development.

From the repository root:

```sh
node public-site/build.mjs
node public-site/validate.mjs
```

The build embeds frontend assets, uses the public origin for API requests, and exposes `/health`, `/samples`, `/samples/:id`, and `/analyze`. No transcript is logged or saved by the Worker. Browser history is still opt-in. Request bodies are bounded; rate limiting is per IP within each Worker isolate, not a global distributed limit.

`worker/data.json` contains rules, bilingual reasons, samples, and the Groq system prompt exported from the Python engine. `parity.json` records Python rule outputs for all 80 synthetic evaluation cases. The validator compares scores, categories, and exact phrase spans, then exercises the bundled API and asset routes. Refresh these files if Python rules change.

Optional Groq requires a server-side `GROQ_API_KEY` runtime secret and optional `GROQ_MODEL`. Without that secret, rules still work and responses explicitly report `missing_key` when AI is requested. No AI key was configured or tested for this deployment. The Worker uses one bounded Groq attempt; the local Python implementation retains its retry behavior.

Hosting identity is persisted in `.openai/hosting.json`. Reuse this project; do not create a duplicate. Public access was configured, but source upload was blocked by this session's disabled sandbox approval category. No version has been published yet. Resume the Sites source workflow from this directory with a fresh short-lived source credential, then save and deploy the resulting archive and commit.
