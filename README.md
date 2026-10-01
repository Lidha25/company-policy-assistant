# Company Policy Assistant

Uses the supplied `company_policies.csv` (98 records) to compare keyword search, an LLM with the full CSV, and an LLM with a persistent embedding vector index. Includes a local Slack Socket Mode bot and a static website suitable for GitHub Pages.

## Run locally

Install Node.js 22 or later. No package installation is required.

```text
copy .env.example .env
node scripts/build.mjs
npm start
```

Open http://localhost:3000. Add your Gemini API key to `.env` locally; never commit it or paste it into chat. Restart the server after editing `.env`. The configurable default model is `gemini-3.8-flash`; embedding model is `gemini-embedding-001`. API calls require account credits and model access.

## Record the comparison

```text
npm test
npm run benchmark
npm run build
```

The benchmark sends 12 shared questions through each method. It makes 24 generation calls plus embedding calls when a key is configured. Without a key, it records rules-based results and explicitly marks the two AI approaches unavailable. No fake timings or token counts are produced. Re-running replaces the recorded benchmark; save reviewed results first.

Inspect each answer in `public/benchmark.json` against `company_policies.csv`. Add `review: "supported"` or `review: "unsupported"` and a `review_note` to each successful result. "Unsupported" means at least one factual claim is absent from or contradicted by the CSV. Record relevance and completeness separately: a copied but irrelevant policy may contain no fabricated facts while still failing to answer the question. Correct abstentions contain no unsupported claim. Review all results before reporting a final rate. The website calculates unsupported / reviewed answers and shows the unreviewed count. Do not label all unreviewed answers supported.

Response time includes retrieval, query embedding, and generation, but not one-time index construction. Index build time and tokens are separate. Token totals use Gemini generation usage (including thinking) and query embedding usage when reported. Missing embedding usage leaves combined totals unavailable, while generation subtotals remain visible. Read GEMINI_SETUP.md. Tests rotate execution order and run sequentially. One sample per question is descriptive; repeat with retained runs for stronger conclusions. Network and provider caching affect timings.

Edit `COMPARISON.md` after actual measurements and review. Keep exactly two paragraphs. The build copies it to the website. Its initial preference is explicitly provisional, not a measured conclusion.

## How each approach works

- Rules: lowercase token matching, stop-word removal, title matches weighted 3 and text matches weighted 1. Return the highest-ranked exact policy text if the score is at least 3; otherwise abstain. This intentionally simple baseline has no semantic understanding.
- Full-context LLM: send all 98 policy entries and the question to the Gemini generateContent API. Require structured answers and policy IDs.
- Vector LLM: embed each record, persist vectors under `.cache/`, embed the question, use exact cosine nearest-neighbor retrieval over the index, and send the best five records to the same model and prompt. This is a small, exact vector index; no separate database service is needed. The cache key includes CSV content and embedding model.

Policy IDs P001–P098 are generated from CSV row order, and source row numbers are displayed. Department is metadata; it does not establish exclusive applicability. Both AI approaches are instructed to abstain on missing details. Returned IDs are checked against supplied context, but valid IDs do not prove factual support.

## Publish the website

The `dist` folder contains only public site assets, policy data, and recorded results. The published static site offers live rules-based search and lets visitors inspect measured AI answers by selecting a recorded question. Arbitrary live AI questions require the local server; GitHub Pages cannot execute the server. No API key is sent to visitors.

Follow `UPLOAD_GUIDE.md` to upload the prepared files to your private repository. Uploading does not trigger this project's deployment workflow. The workflow runs only when you manually choose Run workflow. Set your name in `student.json` before the final build; `STUDENT_NAME` is an optional environment override. GitHub Pages from a private repository requires an eligible paid GitHub plan. Keep the repository private if Pages is unavailable; a separate static hosting service can host the `dist` folder. A deployed website can expose policy content even while the source repository remains private. The current preparation does not publish either.

## Slack setup

1. Create a separate workspace named with your confirmed student name or identifier, and a testing channel such as `student-name-policy-test`.
2. Create a Slack app from `slack-manifest.json` at https://api.slack.com/apps and install it in that workspace. It requests only `app_mentions:read` and `chat:write`.
3. Under Basic Information → App-Level Tokens, generate a token with `connections:write`. Set `SLACK_APP_TOKEN` in `.env`. Set the installed bot token as `SLACK_BOT_TOKEN`.
4. Invite the app into your testing channel. Copy the channel ID into `SLACK_ALLOWED_CHANNEL`.
5. Run `npm run slack`. It uses the full-context LLM when an API key exists, or explicitly labeled rules-based search otherwise. The full-context approach is the provisional choice for this small database.
6. Mention `@Policy Assistant How often must I change my password?` in the testing channel. Open the thread to see the answer and source policy.
7. Invite `raz@sdu.dk` to the workspace and add them to the testing channel. Verify the invitation in Slack.
8. Capture a real screenshot showing the workspace/channel identity, your mention, and the bot's answer. Do not substitute a mockup.

The bot acknowledges Socket Mode envelopes promptly, deduplicates event IDs, limits execution to the configured channel, and posts threaded replies. It needs to stay running during use. Tokens remain local.

## Submission status

- Website: built locally; publish after account setup.
- Two paragraphs: `COMPARISON.md`, provisional until live evaluation is complete.
- Source repository: publish using your GitHub account.
- Slack workspace/channel, instructor invitation, and genuine screenshot: require Slack account setup and verification.

## References

- https://ai.google.dev/gemini-api/docs/text-generation
- https://ai.google.dev/gemini-api/docs/embeddings
- https://docs.slack.dev/apis/events-api/using-socket-mode/
- https://docs.github.com/en/pages/getting-started-with-github-pages/using-custom-workflows-with-github-pages

## Resumable benchmark update
The benchmark now preserves successful results and saves after each attempt. It makes at most two unfinished AI answers per invocation, waiting 30 seconds between them, and stops immediately on any failure (including 429 quota limits and 503 service unavailability). It does not automatically retry. Re-run the same command later to continue. Existing results are backed up under .cache/benchmark-backups; old failed attempts are retained in history. Timings exclude inter-answer delays; comparisons may span service conditions. The earlier instructions saying every rerun replaces the entire benchmark are superseded by this section. Do not repeatedly rerun after a quota failure; check Google AI Studio first. This change cannot remove provider limits or guarantee that two requests will fit your quota.
