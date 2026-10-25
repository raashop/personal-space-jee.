# Chapter Allocation AI setup

The website UI and the secure Supabase Edge Function source are committed. Actual AI requests will work only after the function is deployed to your Supabase project and an OpenAI API key is set in Supabase Secrets.

## 1) Confirm you have a Supabase project

In the Supabase Dashboard, open your project and copy its Project URL and Publishable key from Project Settings → API. In Personal Space V6, open **Backup & Sync**, enter those values, then sign in to the same Supabase project. Use only the Publishable key in the browser. Never put a Supabase secret/service-role key or an OpenAI API key in website settings or in GitHub.

## 2) Add the OpenAI secret

In the Supabase Dashboard, open Edge Functions → Secrets (sometimes shown as Edge Function Secrets) and add:

- Name: `OPENAI_API_KEY`
- Value: your OpenAI API key

Optional model setting:

- Name: `OPENAI_MODEL`
- Value: `gpt-4.1-mini`

The AI key remains on the server. Do not commit it to this repository. OpenAI API usage may incur separate charges.

## 3) Deploy the function

**Fastest route: the included GitHub Actions workflow.** It deploys the function and writes the OpenAI key into Supabase Secrets without putting the key in the site or committing it to Git.

1. In GitHub, open this repository's **Settings → Secrets and variables → Actions** and add these repository secrets:
   - `SUPABASE_ACCESS_TOKEN`: a Supabase personal access token from your Supabase account's Access Tokens page (not a service-role key).
   - `SUPABASE_PROJECT_REF`: the project ref from the Supabase Dashboard URL `https://supabase.com/dashboard/project/<project-ref>`.
   - `OPENAI_API_KEY`: your OpenAI API key.
2. Open the repository's **Actions** tab and select **Deploy Chapter Allocation AI**.
3. Click **Run workflow** and select the `personal-space-v6` branch.
4. Wait for the workflow to finish successfully. It deploys the authenticated `chapter-allocation` function and stores `OPENAI_API_KEY` and `OPENAI_MODEL` as Supabase Edge Function Secrets.

The workflow is manual only; it will not run or deploy just because you commit code. Do not add secrets to source files or issue comments.

Alternative CLI route, from a local clone of this repository:

1. Install Node.js 20+ and the Supabase CLI: `npm install supabase --save-dev`.
2. Sign in: `npx supabase login`.
3. Link the project: `npx supabase link --project-ref <project-ref>`.
4. Add the OpenAI secret with `npx supabase secrets set OPENAI_API_KEY=your-key OPENAI_MODEL=gpt-4.1-mini`.
5. Deploy: `npx supabase functions deploy chapter-allocation`.

The `supabase/config.toml` keeps JWT verification enabled. Do not deploy with `--no-verify-jwt`; the function is intended for signed-in users only.

## 4) Use it

1. Open the deployed GitHub Pages website and configure Backup & Sync with the same Supabase Project URL and Publishable key.
2. Sign in to Supabase using the site's Backup & Sync panel.
3. Create a planned topic test with a future date and select its chapters.
4. Open the dashboard's **Chapter Allocation** panel and press **Generate AI allocation**.

The AI produces estimated total hours per chapter, priority, the number of days to revisit each chapter, and a short rationale. Chapter focus days may overlap across multiple chapters; this deliberately isn't an hourly timetable.

## Troubleshooting

- **AI service isn't configured yet**: add `OPENAI_API_KEY` to Edge Function Secrets and wait a moment before trying again.
- **401 / sign in**: sign in through Backup & Sync and ensure the Edge Function's JWT verification is enabled.
- **404 / function not found**: deploy the function named exactly `chapter-allocation` to the same Supabase project whose URL is stored in the site.
- **AI key rejected or provider error**: check the OpenAI API key, API project billing/usage limits, and `OPENAI_MODEL`.
- The current function has a lightweight per-runtime request limit; for a public multi-user launch, add a persistent per-user quota table and monitoring.
