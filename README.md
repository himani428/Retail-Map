# US Retail Locations Map

An interactive, performant map of US retail store locations with three zoom tiers, viewport-based fetching, debouncing, client-side caching, and filter support.

---

## Quick Start

### 1. Install dependencies
```bash
npm install              # installs concurrently at root
npm run install:all      # installs backend + frontend deps
```

### 2. Add the CSV dataset
Copy your CSV file into:
```
backend/data/my_pois.csv
```

The expected columns (from the dataset screenshot) are:
```
id, brand_name, latitude, longitude, status, state, city
```

### 3. Ingest the data
```bash
npm run ingest
```
This parses the CSV and creates `backend/data/stores.db` (SQLite). Ingest is idempotent — re-running when the DB already has rows is a no-op. Delete `stores.db` to re-ingest.

### 4. Configure environment
The backend `.env` is pre-filled with the provided API key:
```
backend/.env
  GOOGLE_MAPS_API_KEY=AIzaSyDAnh7rtiiJWBSiT6f6eZit0qce9GNP0bc
  PORT=3001
  CSV_PATH=./data/my_pois.csv
```
Do **not** commit `.env`. It is in `.gitignore`.

### 5. Run in development
```bash
npm run dev
```
This starts both backend (port 3001) and frontend (port 3000) concurrently.

Open http://localhost:3000

---

## Architecture

### Stack
| Layer | Technology |
|---|---|
| Backend | Node.js + Express + TypeScript |
| Database | SQLite via `better-sqlite3` (WAL mode, spatial index on lat/lng) |
| Clustering | Custom grid-cell clustering on the server |
| Frontend | React + TypeScript |
| Maps | `@vis.gl/react-google-maps` + Google Maps JS API v3 |

### Three Zoom Tiers

| Zoom | Tier | What is shown |
|---|---|---|
| < 6 | Tier 1 — Country | One bubble per state, showing total store count. Clicking zooms to that state. |
| 6 – 13 | Tier 2 — Regional | Grid-clustered markers. Cluster size scales logarithmically. Clicking zooms in. |
| ≥ 14 | Tier 3 — Street | Individual store markers with brand initial + color. Clicking opens an info popup. |

### Viewport-Based Fetching
- On every map `idle` event the current `NE + SW` bounds and zoom are sent to the backend.
- The backend runs a `latitude BETWEEN ? AND ? AND longitude BETWEEN ? AND ?` query — never returning the full dataset.
- Requests are **debounced 250 ms** so rapid panning does not fire a flood of requests.
- A **client-side cache** keyed by rounded bounds + zoom + filter values prevents refetching when the user pans back to a previously loaded area. The cache holds up to 50 entries.
- In-flight requests are **cancelled** (via `AbortController`) when a newer request arrives.

### Clustering (Tier 2)
Server-side grid clustering: points are bucketed into lat/lng cells whose size decreases with zoom level (3.0° at zoom 5 → 0.1° at zoom 13+). Each cell becomes one cluster marker. This approach is O(n) and fast enough for 150k+ points because the viewport query already pre-filters to only visible points.

Alternative considered: `supercluster` npm package. Rejected because it requires loading all points into memory upfront. The grid approach works well per-viewport.

### Filters
Sidebar supports state, brand, and status filtering. Filters are applied server-side via SQL `WHERE` clauses and respect the current viewport bounds.

---

## API Endpoints

| Method | Path | Description |
|---|---|---|
| GET | `/api/health` | Health check + store count |
| GET | `/api/config` | Returns `googleMapsApiKey` |
| GET | `/api/stores` | Main data endpoint (see params below) |
| GET | `/api/filters/options` | Distinct states, brands, statuses |

### `/api/stores` Query Parameters
| Param | Type | Required | Description |
|---|---|---|---|
| `swLat` | float | ✅ | Southwest latitude of viewport |
| `swLng` | float | ✅ | Southwest longitude of viewport |
| `neLat` | float | ✅ | Northeast latitude of viewport |
| `neLng` | float | ✅ | Northeast longitude of viewport |
| `zoom` | int | ✅ | Current Google Maps zoom level |
| `state` | string | ❌ | Filter by state (lowercase) |
| `brand` | string | ❌ | Filter by brand_name |
| `status` | string | ❌ | Filter by status (Active/Closed/Planned) |

---

## Trade-offs & Notes

### Given the 2-hour time limit:
- **SQLite instead of PostGIS** — SQLite with a composite index on `(latitude, longitude)` is fast enough for most viewports. PostGIS would allow proper spatial indexing (R-tree/GiST) for even faster queries.
- **Grid clustering instead of Supercluster** — Grid clustering is simpler and runs per-request without needing all data in memory. A production system would use `supercluster` with pre-loaded tiles or H3 hexagon binning.
- **No tile caching** — A Redis or in-memory tile cache keyed by `zoom:gridCell` would dramatically reduce DB reads for popular views.
- **No WebGL rendering** — `deck.gl` with `ScatterplotLayer` would handle 150k+ simultaneous markers at 60fps. Current approach caps visible markers with a `LIMIT 50000` safety guard.
- **React StrictMode double-render** — In development, effects run twice. Map listeners are cleaned up correctly, but you may see duplicate fetch logs in dev.

### AI usage
Claude (Anthropic) was used as a coding assistant to generate boilerplate, TypeScript type stubs, CSS, and the state centroid table. All architectural decisions, data flow design, and debugging were done manually.

---

## Project Structure
```
retail-map/
├── backend/
│   ├── src/
│   │   ├── index.ts          # Express server + all API routes
│   │   ├── ingest.ts         # CSV → SQLite ingestion script
│   │   ├── clustering.ts     # Grid-based clustering utility
│   │   └── stateCentroids.ts # State name → lat/lng/abbr lookup
│   ├── data/
│   │   └── my_pois.csv       # ← PUT YOUR CSV HERE
│   ├── .env                  # ← Not committed
│   └── package.json
├── frontend/
│   ├── src/
│   │   ├── App.tsx
│   │   ├── types.ts
│   │   ├── components/
│   │   │   ├── MapView.tsx       # Google Map + tier rendering
│   │   │   ├── FilterSidebar.tsx
│   │   │   ├── InfoPopup.tsx
│   │   │   └── LoadingScreen.tsx
│   │   ├── hooks/
│   │   │   ├── useStoreApi.ts    # Fetch + cache logic
│   │   │   └── useDebounce.ts
│   │   └── utils/
│   │       └── brandUtils.ts     # Brand colors + label formatting
│   └── package.json
└── package.json                  # Root scripts (install:all, dev, ingest)
```
