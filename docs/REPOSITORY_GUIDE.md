# Repository guide

| Path | Purpose |
|---|---|
| `app/` | Next.js participant workspace, organizer console, styling, and API routes. |
| `lib/` | Authentication, event state, timing rules, Python execution, and AI judging. |
| `data/participant/` | Synthetic files that teams are allowed to access. |
| `data/private/` | Organizer-only reference data. This directory is intentionally ignored by Git. |
| `starters/` | Beginner Python scaffolds for the three stages. |
| `python/` | Dataset generation, reference training, and trusted inference tools. |
| `scripts/` | Local startup, capture, verification, judging, provisioning, and proposal scripts. |
| `supabase/` | Production database and storage schema. |
| `public/` | Club branding, concept layers, and locally packaged Monaco assets. |
| `output/proposal/` | Dean-ready Word and PDF proposal. |
| `output/mockups/` | Generated concept images. |
| `output/screenshots/` | Screenshots of the implemented application. |
| `tests/` | Event-rule and scoring unit tests. |

## Repository boundaries

The repository contains only synthetic participant data. Environment files, private test labels, local SQLite state, runtime files, virtual environments, and generated judge reports are excluded through `.gitignore`.

The checked-in local credentials are rehearsal-only identifiers used when `AIDA_LOCAL_DEMO=true`. Production team credentials must be generated separately and distributed through an approved university channel.

## Standard validation

```powershell
npm install
npm run typecheck
npm test
npm run build
node scripts/check-api.mjs
```

See the main [README](../README.md) for local operation, production provisioning, event rules, and acceptance criteria.
