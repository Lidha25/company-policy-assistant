# Gemini setup — do this on your computer

1. Extract policy-assistant-gemini-upload.zip into a NEW folder. It replaces the earlier OpenAI version. Your existing .env is not included or changed.
2. Copy .env.example to .env. Enter your Google AI Studio key after GEMINI_API_KEY=. Never upload .env or share the key in chat.
3. Leave GEMINI_MODEL=gemini-3.8-flash and GEMINI_EMBEDDING_MODEL=gemini-embedding-001 unless your account requires another supported model. Both AI approaches use the same generation model.
4. Put your name in student.json.
5. When YOU are ready to run it, open a terminal in the extracted folder and run npm test, then npm run benchmark, then npm run build. These are instructions only; no live requests were run during preparation.
6. To view live answers locally, run npm start and open http://localhost:3000. Stop any older copy first so you do not view the previous provider version. Restart after changing .env.
7. Review the recorded answers and finalize COMPARISON.md before submitting. Follow UPLOAD_GUIDE.md to upload the replacement files yourself, keeping the repository private.

The benchmark performs generation and embedding requests. Google account quotas and billing apply. If you see HTTP 429, wait and check your quota before retrying. No automatic retries or hidden extra paid calls are performed.

Generation input, output, thinking and total token counts come from Gemini usageMetadata. Embedding counts are displayed only when returned by Gemini. Missing usage is not zero: the combined total and its average remain unavailable if embedding usage is missing; the known generation subtotal is still shown. Index build time and tokens are separate from per-query measurements.

The website build is static: it supports live keyword search and recorded AI comparisons. Live Gemini questions need the local server. The Slack bot also reads GEMINI_API_KEY locally. No key belongs in the website files or GitHub.

Official references:
- https://ai.google.dev/gemini-api/docs/generate-content/structured-output
- https://ai.google.dev/api/embeddings
- https://ai.google.dev/gemini-api/docs/models/gemini-3.8-flash
