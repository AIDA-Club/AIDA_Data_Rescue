# AIDA Data Rescue

AIDA Data Rescue is a complete local implementation and deployment package for Ajman University's 90-minute beginner data-cleaning and neural-network hackathon. Fifteen teams of three clean a synthetic equipment dataset, construct labels from a separate maintenance log, and improve a small PyTorch classifier through three timed stages.

See the [repository guide](docs/REPOSITORY_GUIDE.md) for a labelled map of every major directory and its security boundary.

## Deliverables

- `app/` and `lib/` contain the participant workspace, organizer console, APIs, event clock, AI quota enforcement, submission handling, Supabase adapter, and Vercel Sandbox adapter.
- `data/participant/` contains the safe participant dataset package. `data/private/` contains organizer-only reference and test data and must never be published.
- `starters/` contains the three beginner Python scaffolds.
- `python/` contains dataset generation, the reference solution, trusted inference, and artifact grading.
- `supabase/schema.sql` creates the event state table, private artifact bucket, and access controls.
- `scripts/` contains provisioning, sandbox preparation, API acceptance checks, trusted judging, and proposal generation.
- `output/proposal/` contains the editable dean-ready Word proposal and matching PDF.
- `output/mockups/` contains four generated concept images. These are labelled as concepts in the proposal.
- `output/reference/baseline_report.json` records the calibrated reference-model results.
- `output/qa/api-tests.json` records the API acceptance results.

## Local review

Requirements: Node.js 22 or later and Python 3.11 or later.

```powershell
cd C:\Users\User\Downloads\Hackathon\Build
npm install
npm run dev
```

`npm run dev` starts the server and opens a dedicated Google Chrome app window at `http://aida.rescue:3000`. The launcher maps that name to the local server inside the dedicated Chrome profile, so it does not change the Windows hosts file. You can also run `start-aida.cmd`. Use `npm run dev:no-open` when you do not want Chrome to launch.

- Participant review: `team-01` / `AIDA-01`
- Practice review: `demo-01` / `AIDA-DEMO-01`, `demo-02` / `AIDA-DEMO-02`, or `demo-03` / `AIDA-DEMO-03`
- Organizer review: `admin` / `AIDA-ADMIN-LOCAL`

The three practice teams can complete the full flow but are excluded from competition rankings and automatic publication checks. These local credentials exist only for interface review. The application refuses local-state mode on Vercel. Never deploy with `AIDA_LOCAL_DEMO=true`.

Local review mode runs Python from the project virtual environment so the compiler, console, and artifacts can be tested end to end. Use it only with trusted review code. Production continues to require isolated Vercel Sandboxes and never falls back to local execution.

Local review also supplies a clearly labelled rehearsal tutor so the one-prompt UI and quota can be tested without API charges. Each prompt must describe a specific issue, attempted step, error, column, or metric. The response gives a detailed stage-specific plan while remaining bounded to 350 words and twelve illustrative code lines. The live deployment always uses the configured OpenAI model. The current OpenAI project key is valid, but its project must have active API billing before live AI requests can succeed.

## Verification

```powershell
npm run typecheck
npm test
npm run build
node scripts/check-api.mjs
npm audit --omit=dev --audit-level=high
```

Generate the synthetic data and rerun the reference benchmark when changing difficulty:

```powershell
.\.venv\Scripts\python.exe python\generate_dataset.py
.\.venv\Scripts\python.exe python\reference_solution.py
```

The checked-in calibration produced 88.8% validation accuracy, 0.273 validation loss, 87.7% private-test accuracy, and 0.281 private-test loss in about 4.4 seconds on a local CPU.

## Production setup

The current package is not connected to a Supabase or Vercel project. Complete these steps with university-approved accounts before registration opens.

Run `npm run check:production` before linking or deploying the project. The check reports only whether required settings are present; it never prints credential values. Current public-domain options and the local `aida.rescue` limitation are recorded in `DOMAIN_OPTIONS.md`.

1. Create a dedicated Supabase project and run `supabase/schema.sql` in its SQL editor.
2. Copy `.env.example` to the deployment environment. Set `SUPABASE_URL`, `SUPABASE_ANON_KEY`, and `SUPABASE_SERVICE_ROLE_KEY`. Keep the service-role key server-side.
3. Set `AIDA_TEAM_EMAIL_DOMAIN` to an organizer-controlled domain, then run `node scripts/provision.mjs`. Give each generated credential to exactly one team through an approved channel. Delete the local credential file after secure distribution.
4. Configure a funded Vercel project with `VERCEL_TOKEN`, `VERCEL_TEAM_ID`, and `VERCEL_PROJECT_ID`.
5. Run `node scripts/prepare-sandbox.mjs`, then save the returned snapshot ID as `AIDA_SANDBOX_SNAPSHOT`.
6. Set `OPENAI_API_KEY` and `OPENAI_MODEL` in server-side environment variables. Do not expose the key through a `NEXT_PUBLIC_` variable.
7. Remove `AIDA_LOCAL_DEMO`, deploy the Next.js project, and verify all acceptance checks against the production URL.
8. Run a supervised 15-team rehearsal. The Vercel Hobby allowance is below the required concurrency, so use a paid allocation or approved university infrastructure.

`AIDA.Rescue` cannot be used as a public domain because `.rescue` is not a delegated public top-level domain. The launcher provides `aida.rescue` only inside its dedicated local Chrome window. For production, register an available domain such as `aidarescue.com` or use a university subdomain such as `aida-rescue.ajman.ac.ae`, then attach it to the Vercel project. Supabase custom domains are for the backend API and are a paid add-on; they do not host the Next.js frontend.

## Event operation

Before opening the room, confirm the private files are absent from the deployed bundle, the sandbox network policy is deny-all, fifteen equivalent environments can start, and each team can access only its own state. Test autosave, explicit submission, deadline rejection, prompt quotas, pause and resume, and result publication.

The organizer signs in to start, pause, resume, and publish the event. The shared server clock opens scheduled stages for everyone. A valid Stage 1 or Stage 2 submission immediately opens the next stage for that team; a missed earlier stage scores zero but does not block later scheduled work. Autosave does not count as submission.

The generated concept images are used as visual layers in the welcome screen, participant workspace, guide sheet, and finale. The working controls remain native, accessible interface elements rather than text embedded in the images. A black-hole transition pulls the interface inward between completed stages. After Stage 3, that team is closed, the AI judge scores its frozen work, and a 2.8-second celebration automatically reveals its result. The score remains on screen for five seconds before the three highest-scoring competition teams are revealed. Practice teams receive a score but are excluded from this ranking.

Stage output is stored under `output/` inside each team runtime and remains available to later stages. Stage 2 normally loads `output/cleaned.csv`. If a team skipped Stage 1 or did not create that file, the Stage 2 starter clearly reports the missing artifact and loads `data/equipment_dirty.csv` so the team can continue by completing the cleaning work in Stage 2. The missed Stage 1 still receives zero points.

Stage 3 submission automatically invokes the AI judge. When trusted private-test metrics are available, they supply the 30 performance points; otherwise the AI judge assesses those points from the frozen solution evidence. For the strongest competition integrity, run the trusted judge from an organizer machine before publishing:

```powershell
npx tsx scripts\judge-event.ts
```

The trusted judge reruns frozen code in fresh sandboxes, downloads allowlisted artifacts, performs inference in a separate trusted sandbox, and scores predictions against private labels outside participant code. Import each generated score in the organizer console, then select **AI judge solution** to refresh that team’s result with trusted metrics. The AI records its model and reasoning and preserves a zero for every missed stage. Faculty approval remains required before results are published.

Local rehearsal uses a deterministic rubric simulator so the workflow can be tested without spending API credits. Set `AIDA_AI_JUDGE_LIVE=true` only when intentionally testing the configured OpenAI judge locally. Production uses `OPENAI_JUDGE_MODEL`, falling back to `OPENAI_MODEL`.

## Security boundaries

- Participant code receives no application secrets, private labels, or unrestricted outbound network access.
- Supabase browser access to event state and artifacts is revoked; the application server mediates team access.
- AI prompts are claimed atomically once per team and stage. Provider retries reuse the same claim.
- Runtime commands stop after 120 seconds, use two CPU threads, and accept only allowlisted artifacts up to 10 MB.
- `.gitignore` and `.vercelignore` exclude `.env.local`, local credentials, SQLite state, private data, judge outputs, and proposal working files.

## Final administrative work

Complete the proposal's event date, college, venue, signatories, registration dates, and technical operator fields. Confirm funding and sponsor approvals before advertising monetary prizes. Current cloud pricing and quotas must be checked again before purchase.
