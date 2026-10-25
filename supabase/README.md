# Gemini AI chapter allocation setup

The Chapter Allocation UI and Gemini-powered Supabase Edge Function are committed. To activate live AI, create a Gemini API key, save it as a GitHub Actions repository secret, and run the deployment workflow. The key is then stored as a Supabase Edge Function secret; it is never added to the website JavaScript.

## 1) Get a Gemini API key

1. Open [Google AI Studio API keys](https://aistudio.google.com/apikey).
2. Sign in with your Google account.
3. Choose **Create API key**. If asked, choose or create a Google Cloud project.
4. Copy the key and keep it private. Do not paste it in this repository, into the website, or into a chat.

Gemini API has a free tier for selected models with usage limits. Availability and request quotas depend on the model and account; check [Gemini API pricing](https://ai.google.dev/gemini-api/docs/pricing) and your usage dashboard before relying on it. Free-tier data use can differ from paid-tier terms, so review Google's current data-use terms.

## 2) Add three GitHub Actions secrets

In this GitHub repository, open **Settings → Secrets and variables → Actions → New repository secret**. Add the following names exactly:

- `SUPABASE_ACCESS_TOKEN`: Create a personal access token in your Supabase account's Access Tokens page. Do not use a service-role key here.
- `SUPABASE_PROJECT_REF`: Your project reference from the Supabase Dashboard URL, like `https://supabase.com/dashboard/project/<project-ref>`.
- `GEMINI_API_KEY`: The key you just created in Google AI Studio.

Do not add these values to source code or issue comments. GitHub Actions stores them as encrypted secrets.

## 3) Deploy the Gemini function

1. Open the repository's **Actions** tab.
2. Choose **Deploy Chapter Allocation AI**.
3. Tap **Run workflow**, select the `personal-space-v6` branch, and run it.
4. Wait for the workflow to finish successfully.

The workflow stores `GEMINI_API_KEY` and `GEMINI_MODEL` as Supabase Edge Function Secrets in the project you specified, then deploys the authenticated `chapter-allocation` function. It targets the project reference directly, so no interactive database-password prompt is needed. The default model is `gemini-3.5-flash-lite`. If it is unavailable for your project, update the model in the workflow to a model enabled for your Gemini API account.

This workflow is manual only. It does not run on every commit. The function requires authenticated Supabase users; do not turn off JWT verification.

## 4) Connect it to your website

1. Open the deployed [Personal Space V6 site](https://raashop.github.io/personal-space-jee/v6/).
2. Open **Backup & Sync** and enter your Supabase Project URL and **Publishable** key. Use the Publishable key only; never put a Supabase secret or service-role key in the browser.
3. Sign in through Backup & Sync to the same Supabase project used by the deployment workflow.
4. Create a planned topic test with a future date and select its chapters.
5. Return to the dashboard's **Chapter Allocation** panel and press **Generate AI allocation**.

Gemini will estimate hours and priorities per chapter, suggest how many days to revisit each chapter, explain its reasoning, and reserve time for the rest of the JEE syllabus. This is a flexible workload allocation, not an hourly timetable.

## Troubleshooting

- **AI service isn't configured yet**: add `GEMINI_API_KEY` to GitHub Actions secrets, rerun the workflow, and check that it succeeds.
- **401 / sign in**: sign in through Backup & Sync. The function is configured to verify Supabase JWTs.
- **404 / function not found**: deploy the function to the same Supabase project whose URL is saved in the website settings.
- **Gemini rejects the API key or model**: check the key, model availability and Google AI Studio project settings.
- **Quota / 429**: you've reached a request limit. Check the AI Studio usage page and retry after the quota resets.
- **The dashboard still shows old text or layout**: wait for GitHub Pages to deploy, then refresh the page.

The website sends selected JEE chapter names, subject, preparation status, test date and workload estimates to the backend. It does not need to send your email or password to Gemini. Keep personal information out of chapter names and test titles.
