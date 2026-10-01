# Host the live Gemini website on Render

This project serves the website and Gemini API from one Node server. GitHub Pages can show the recorded comparison, but it cannot run the Node API. Render runs the complete app.

## Deploy it

1. Commit and push the updated project files to the existing GitHub repository. Confirm the repository contains `server.mjs`, `company_policies.csv`, `lib/`, `public/`, and this file.
2. Sign in at [Render](https://render.com/) and select **New → Web Service**.
3. Connect GitHub, choose `Lidha25/company-policy-assistant`, and select branch `main`.
4. Configure the service:
   - Runtime: **Node**
   - Build command: `npm install && npm test && npm run build`
   - Start command: `npm start`
   - Instance type: **Free** for a coursework demonstration, if offered in your account.
5. In the service's **Environment** settings, add these variables:
   - `GEMINI_API_KEY` = your Gemini key (enter it directly in Render's secret field)
   - `GEMINI_MODEL` = `gemini-3.5-flash-lite`
   - `GEMINI_EMBEDDING_MODEL` = `gemini-embedding-001`
   - `STUDENT_NAME` = your name or student identifier, if you want it shown
6. Create the Web Service and wait for the deployment to finish. Open its `onrender.com` URL and check the page. Submit this URL for the interactive website.

Do not put the API key in `.env.example`, website JavaScript, GitHub, or a message. Render supplies the public `PORT`; the server binds to `0.0.0.0` to accept web traffic. The page makes Gemini requests only after a visitor submits a question, not when someone merely opens the site.

The server limits each visitor IP to 12 AI requests per minute. This reduces accidental overuse but cannot stop all abuse of a public API endpoint. Anyone who can reach the page may use your Gemini quota. Monitor Google AI Studio usage and disable the Render service when the public demo is no longer needed. Free services may pause while idle, so the first request after a pause may take longer.

## Updating the live site

Edit the project in your local repository, commit and push to `main`. Render will build and deploy that commit automatically. Confirm the new deployment is healthy before sharing the URL.

