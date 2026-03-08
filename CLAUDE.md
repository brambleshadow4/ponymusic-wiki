# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm run dev      # Build frontend + watch for changes + start server (development)
npm run build    # Production build (minified)
npm test         # Run mocha tests (test/ directory)
```

Development workflow: `npm run dev` builds the Svelte frontend via Rollup, then auto-starts the Express server. The server reads `.env` for configuration (port, database, SSL, Discord link). The frontend is rebuilt to `public/build/bundle.js` on changes.

To run a single test file: `npx mocha test/titleParsingTest.js`

## Architecture

### Overview
A community wiki for My Little Pony fan music. Users can browse/search/filter tracks, and authenticated users can add/edit track metadata. All data is stored in PostgreSQL.

### Frontend (`src/`)
Svelte 3 SPA compiled by Rollup. Client-side routing is manual — `App.svelte` reads `window.location.pathname` and renders the appropriate component with `{#if}` blocks. There is no router library.

- **`src/App.svelte`** — Root component. Handles all routing, manages the open track/artist/album editor sidebar, and the filter popup overlay.
- **`src/Views.js`** — Defines view configurations (column definitions, API endpoint, tabs, filter functions) for each list page type (DefaultView, ArtistView, AlbumView, etc.).
- **`src/ListView.svelte`** — The main paginated list component, used by most pages. Takes a `view` object from `Views.js` and fetches data from the API.
- **`src/Grid.svelte`** — The actual table renderer used by ListView.
- **`src/TrackEditor.svelte`** — Slide-in panel for viewing/editing a single track.
- **`src/helpers.js`** — Client-side utilities: `buildFilterQuery`, `canonicalURL`, `setUserFlag`, column definitions (`Columns`).
- **`src/authClient.js`** — Client-side permission checking using `localStorage.role`. Contains a copy of the ROLE/PERM lookup table.

### Backend (`server.js` + `server/`)
Express.js server serving both the REST API and static frontend files from `public/`.

- **`server.js`** — All API routes live here. Key endpoints: `/api/view/tracks`, `/api/view/albums`, `/api/view/artists`, `/api/updateProperty`, `/api/getTags`, `/api/tagAutofill`, `/api/setUserFlag`, `/export/*`.
- **`server/auth.js`** — Authentication middleware. Sessions are stored in the DB (`sessions` table) and cached in-memory. Provides `auth(permission)` middleware factory and `reqHasPerm`.
- **`server/helpers.js`** — Server-side utilities: `getOgCache` (fetches embed info from YouTube/Bandcamp/SoundCloud), `canonicalURL`, `areTitlesIdentical` (fuzzy title deduplication using Damerau-Levenshtein).
- **`server/exportWorker.js`** — Worker thread that generates daily data exports (xlsx, RDF/Turtle, SQL) via `server/loaderLib.js`.

### Database Schema (`server/tables.sql`)
PostgreSQL. Key tables:
- **`tracks`** — id, title, release_date, locked, ogcache (JSONB embed info), titlecache, hidden
- **`track_tags`** — EAV table: (track_id, property, value, number). All track metadata (artist, album, genre, hyperlinks, etc.) is stored here.
- **`tag_metadata`** — EAV table for artist/album metadata: (type, id, property, value).
- **`track_history`** / **`tag_metadata_history`** — Full edit history stored as JSONB snapshots.
- **`users`**, **`sessions`**, **`user_flags`** — Auth and per-user track status flags.

Valid track tag properties: `album`, `genre`, `artist`, `featured artist`, `tag`, `hyperlink`, `alt mix hyperlink`, `reupload hyperlink`, `youtube offset`, `pl`, `cover`, `remix`, `original artist`, `hidden`.

### Auth / Permissions
Discord OAuth2 is used for login. Sessions are UUIDs stored in `sessionStorage.session` (client) and the `sessions` DB table (server). The user's role is stored in `localStorage.role` client-side. Permission checking uses a role→permission lookup table that is **duplicated** between `src/authClient.js` (client) and `server/auth.js` (server) — if you edit one, you must update the other.

### Important Duplication
`canonicalURL()` is duplicated in `src/helpers.js` and `server/helpers.js`. Both files include a comment warning about this. Keep them in sync when modifying.

### Filter System
Track list filters are encoded as URL query parameters by `buildFilterQuery()` in `src/helpers.js`. Include filters use `property=value`, exclude filters use `x_property=value`. Multiple values are comma-separated with commas within values doubled (`,,`).

### Data Export
`/export-data` triggers a worker thread (via `server/exportWorker.js`) to generate xlsx, RDF/Turtle, and SQL files. Export is regenerated at most once per day. The server polls progress via `/export/precheck`.

## Environment Variables (`.env`)
```
PORT=8000
PGHOST, PGPORT, PGDATABASE, PGUSER, PGPASSWORD  # PostgreSQL connection
DISCORD=                                         # Discord invite link URL
SSL_CERT, SSL_KEY                               # Optional HTTPS
PULL_KEY                                        # Server pull/deploy key
PROD_SESSION                                    # Admin session token for production
```
