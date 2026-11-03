# Neon Setup

The existing page stays on GitHub Pages. A Neon Function handles shared reads,
the five progress flags, and validated atomic reordering. The layout, Jira
links, progress calculation, drag handles, and keyboard ordering are unchanged.

## Infrastructure

- Organization: `org-long-credit-41767666`
- Project: `cold-shadow-70887954`
- Branch: `production`
- Region: Frankfurt (`aws-eu-central-1`)
- Function: `progress`, declared in `neon.ts`
- Public API: https://br-gentle-silence-b945wk5c-progress.compute.c-7.eu-central-1.aws.neon.tech/

Anyone can read the table, update its progress flags, or reorder all services.
This intentionally preserves anonymous editing. Edits cannot be attributed to
a person. The API does not expose insertion, deletion, or service-detail edits.
CORS is not authentication or abuse protection. Public requests can consume the
free-tier allowance; add authentication or an edge gateway if that becomes a risk.

The API uses a reusable `pg` connection pool with Neon's idle-disconnect handler.
Database credentials stay in the Function environment and ignored local env
files. Never put them into HTML, browser JavaScript, or the Git repository.

## Local Development

Run commands from this directory, the Git repository root:

```sh
npm ci
neon login
neon link -y --org-id org-long-credit-41767666 --project-id cold-shadow-70887954 --branch production
npm test
npm run build
npm start
```

The preview is http://127.0.0.1:8080 and calls the deployed API. The preview
serves only `dist`, not local env files or migration backups. `npm run dev:api`
runs the Function locally when backend development is needed.

`neon deploy` deploys the Function and pulls Neon environment variables into
`.env.local`. `npm run build` validates browser JavaScript, bundles the API as
a check, and copies the public page into `dist`. It generates `api-config.js`
from `NEON_FUNCTION_PROGRESS_BASE_URL`, containing only the public API URL.
That generated file belongs in Git alongside `index.html`, so GitHub Pages
continues to work without a server or a build step. When env files are absent,
the build reuses the checked-in public config.

After backend changes:

```sh
npm test
npm run build
neon deploy
npm run build
```

Publish `index.html` and `api-config.js` together through the existing GitHub
Pages workflow. Local edits do not update the hosted page automatically.

## Data Preservation

The migration captured 27 live rows on 2026-11-03, including every service key,
name, version, progress flag, and saved sort position. It did not use seed data.
The transactional import refused a nonempty target and compared every field
before committing. Browser tests restored their changes afterward.

Snapshot checksum (SHA-256):

```text
44f65a91d94e99080639bff6fe7b5a756eab8796ba8b4e6590c26b9f9b7392b9
```

The complete snapshot is in ignored `backups/progress.json`. Keep it outside
public hosting. Verify the target at any time:

```sh
npm run data -- verify
```

`schema.sql` owns the portable schema and validated reorder function. For a
fresh empty target, `npm run data -- import` imports the saved snapshot. It
does not overwrite an existing table's rows.

The generic snapshot tool can capture a PostgREST table using locally supplied
`SOURCE_URL` and `SOURCE_API_KEY`, and `verify-source` detects edits made after
capture. Neither value is required by the migrated app.

Before retiring the old hosted database, pause edits, verify its current data
against the snapshot, publish the migrated page, and test the public page.
If the source changed before publication, reconcile those changes first.
The old hosted database has not been deleted by this migration.