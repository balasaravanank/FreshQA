# Native QA: Freshdesk app (FDK, App SDK v3.0)

| Piece | File | What it does |
|---|---|---|
| Coach workspace | `app/workspace.html` (`full_page_app`) | Dashboard, review queue, AI-prefilled grade view, appeals, coaching, scorecard editor |
| Agent view | `app/sidebar.html` (`ticket_sidebar`) | The agent's score for this ticket, evidence per criterion, Appeal button |
| Events | `server/server.js` | `onTicketUpdate` (Resolved/Closed) → backend grading. `onAppInstall` creates one recurring schedule. `onScheduledEvent` runs the nightly batch backfill |
| Backend calls | `config/requests.json` | One request template per HTTP method (`qaGet`/`qaPost`/`qaPut`/`qaPatch`). The secret is added on the server side from the secure iparam |
| Install settings | `config/iparams.json` | `backend_host` (domain only, HTTPS) and `api_secret` |

## Status and what to check first

This app was written without the FDK CLI available, so the manifest and request-template schema **haven't been run through `fdk validate` yet**. On first setup:

1. `fdk validate`, then fix anything the installed FDK version flags (for example the `engines` versions in `manifest.json`).
2. Check that `onTicketUpdate`'s `changes.status` reports numeric ids (4 = Resolved, 5 = Closed). `server.js` also accepts the names.
3. Check that templating `context.path` into the request path is accepted. If not, add one template per endpoint.

You can check the screens without the CLI: the backend serves `app/` at `http://localhost:4000/preview/`, and `scripts/api.js` automatically switches from FDK request templates to plain `fetch`.
