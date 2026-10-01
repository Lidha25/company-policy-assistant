# Upload the prepared files yourself

This is a preparation package, not a completed submission. The website includes the saved 12-question Gemini benchmark and an AI-assisted answer review that still needs your verification. Keep your repository PRIVATE.

## 1. Extract the package

Right-click `policy-assistant-upload.zip` and choose Extract All. Open the extracted folder. You should see `README.md`, `package.json`, `company_policies.csv`, and folders including `lib`, `public`, `scripts`, `test`, `dist`, and `.github`.

The package excludes `.git`, `.env`, API keys, cached embeddings, and installed dependencies. `.env.example` is a blank template and is safe to upload. Use the prepared package rather than dragging the original development folder, which may later contain secrets.

## 2. Upload to your private repository

1. Sign in to https://github.com and open https://github.com/Lidha25/company-policy-assistant.
2. Confirm the repository is marked Private. Do not change its visibility.
3. If empty, click "uploading an existing file". If files already exist, use Add file → Upload files. These files update matching paths; review any existing work before replacing it.
4. In Windows File Explorer, enable View → Show → Hidden items so dot-prefixed files and the `.github` folder are included.
5. Open the EXTRACTED folder, select its contents, and drag them into GitHub's upload area. Drag the contents, not the ZIP and not the enclosing folder. Preserve subfolders.
6. Check the upload list includes `lib/engine.mjs`, `public/index.html`, `scripts/build.mjs`, and `.github/workflows/pages.yml`. `package.json` must be at the repository root. If paths are flattened, cancel and drag the folders again.
7. Use the message "Prepare policy assistant assignment". For an empty repository, commit to main. For an existing repository, use a new branch and review/merge its pull request if you want to inspect the changes first.
8. Click Commit changes (or Propose changes if using a new branch). Wait for GitHub to show the uploaded files.
9. Confirm README.md is displayed and the repository is still Private.

Do not upload the ZIP as the only repository file: GitHub does not unpack it into usable source files. The package is under GitHub's 100-file batch limit. Browser uploads support files and folders: https://docs.github.com/en/repositories/working-with-files/managing-files/adding-a-file-to-a-repository

## 3. Stop after uploading if that is all you want to do

Uploading does not start the website or Slack bot. The included publishing workflow is manual-only. Do not select Run workflow yet. No credentials are needed simply to upload the prepared source.

## 4. Remaining work, when you choose to continue

- Put your student name in `student.json` before building the final website. No name has been guessed.
- Review the saved answers and unsupported-claim labels in `REVIEW.md` and `public/benchmark.json` against the CSV. Confirm the two paragraphs in `COMPARISON.md` still accurately describe the results before submitting.
- Rebuild and upload the updated website/results. The static site supports live keyword search and saved AI comparisons. Live AI questions need the local server or separate backend hosting.
- For GitHub Pages from a PRIVATE repository, GitHub requires Pro, Team, or Enterprise. If Settings → Pages asks for an upgrade, leave the repository private and choose a separate website host later. You do not need to pay or change visibility just to upload source. See https://docs.github.com/en/pages/getting-started-with-github-pages/what-is-github-pages.
- If your plan supports Pages and you decide to publish: Settings → Pages → Source: GitHub Actions; then Actions → Publish policy comparison → Run workflow. Publishing may make the website and included CSV content public even though the repository is private. Confirm the intended audience first.
- Give your instructor access to the private source repository before submitting its link. The instructor's GitHub identity or accepted collaborator invitation must be confirmed; none was added during preparation.
- Create the separate Slack workspace and named test channel, install/configure the bot, invite raz@sdu.dk, and capture a real question-and-answer screenshot. Details are in README.md. None of these steps is performed by uploading the source.

## Submission checklist

- [ ] Deployed website link verified.
- [ ] All three methods measured on the same questions.
- [ ] Unsupported-answer review completed, with relevance assessed separately.
- [ ] Exactly two comparison paragraphs finalized.
- [ ] Private repository uploaded and instructor access confirmed.
- [ ] Student identity appears in Slack workspace/channel.
- [ ] Slack bot answers with a relevant policy.
- [ ] raz@sdu.dk invited to the workspace and channel.
- [ ] Genuine Slack screenshot saved.
