import express, { Request, Response } from "express";
import cors from "cors";
import dotenv from "dotenv";
import path from "path";
import fs from "fs";
import { initDb } from "./ingest";
import { clusterPoints, getCellSize, StorePoint } from "./clustering";
import { STATE_CENTROIDS } from "./stateCentroids";

dotenv.config();

const app = express();
const PORT = parseInt(process.env.PORT || "3001", 10);

app.use(cors());
app.use(express.json());

// Initialize DB on startup
const DB_PATH = path.join(__dirname, "../data/stores.db");
let db: ReturnType<typeof initDb>;

try {
  if (!fs.existsSync(path.dirname(DB_PATH))) {
    fs.mkdirSync(path.dirname(DB_PATH), { recursive: true });
  }
  db = initDb();
  console.log("✅ Database initialized");
} catch (e) {
  console.error("Failed to init DB:", e);
  process.exit(1);
}

// ─────────────────────────────────────────────
// GET /api/health
// ─────────────────────────────────────────────
app.get("/api/health", (_req: Request, res: Response) => {
  const count = (db.prepare("SELECT COUNT(*) as c FROM stores").get() as { c: number }).c;
  res.json({ ok: true, storeCount: count });
});

// ─────────────────────────────────────────────
// GET /api/config
// Returns the Maps API key to the client (never hardcoded in frontend)
// ─────────────────────────────────────────────
app.get("/api/config", (_req: Request, res: Response) => {
  res.json({ googleMapsApiKey: process.env.GOOGLE_MAPS_API_KEY || "" });
});

// ─────────────────────────────────────────────
// GET /api/stores
// Query params:
//   swLat, swLng, neLat, neLng  — viewport bounds
//   zoom                         — current zoom level
//   state, brand, status         — optional filters
// ─────────────────────────────────────────────
app.get("/api/stores", (req: Request, res: Response) => {
  const start = Date.now();

  const swLat = parseFloat(req.query.swLat as string);
  const swLng = parseFloat(req.query.swLng as string);
  const neLat = parseFloat(req.query.neLat as string);
  const neLng = parseFloat(req.query.neLng as string);
  const zoom = parseInt(req.query.zoom as string, 10);

  if ([swLat, swLng, neLat, neLng, zoom].some(isNaN)) {
    res.status(400).json({ error: "Missing or invalid viewport parameters" });
    return;
  }

  const filterState = (req.query.state as string || "").toLowerCase().trim();
  const filterBrand = (req.query.brand as string || "").trim();
  const filterStatus = (req.query.status as string || "").trim();

  // ── Tier 1: Country view (zoom < 6) ──────────────
  if (zoom < 6) {
    const rows = db
      .prepare("SELECT state, COUNT(*) as count FROM stores GROUP BY state")
      .all() as { state: string; count: number }[];

    const stateData = rows.map((row) => {
      const centroid = STATE_CENTROIDS[row.state];
      if (!centroid) return null;
      return {
        state: row.state,
        abbr: centroid.abbr,
        lat: centroid.lat,
        lng: centroid.lng,
        count: row.count,
      };
    }).filter(Boolean);

    res.json({ tier: 1, data: stateData, ms: Date.now() - start });
    return;
  }

  // ── Build spatial query ───────────────────────────
  let sql = `
    SELECT id, brand_name, latitude, longitude, status, state, city
    FROM stores
    WHERE latitude BETWEEN ? AND ?
      AND longitude BETWEEN ? AND ?
  `;
  const params: (string | number)[] = [swLat, neLat, swLng, neLng];

  if (filterState) {
    sql += " AND state = ?";
    params.push(filterState);
  }
  if (filterBrand) {
    sql += " AND brand_name = ?";
    params.push(filterBrand);
  }
  if (filterStatus) {
    sql += " AND status = ?";
    params.push(filterStatus);
  }

  // Cap raw rows to prevent OOM on huge viewports
  sql += " LIMIT 50000";

  const rows = db.prepare(sql).all(...params) as {
    id: string;
    brand_name: string;
    latitude: number;
    longitude: number;
    status: string;
    state: string;
    city: string;
  }[];

  const points: StorePoint[] = rows.map((r) => ({
    id: r.id,
    lat: r.latitude,
    lng: r.longitude,
    brand_name: r.brand_name,
    status: r.status,
    state: r.state,
    city: r.city,
  }));

  // ── Tier 3: Street view (zoom >= 14) ─────────────
  if (zoom >= 14) {
    res.json({ tier: 3, data: points, ms: Date.now() - start });
    return;
  }

  // ── Tier 2: Regional/cluster view ────────────────
  const cellSize = getCellSize(zoom);
  const clusters = clusterPoints(points, cellSize);

  res.json({ tier: 2, data: clusters, ms: Date.now() - start });
});

// ─────────────────────────────────────────────
// GET /api/filters/options
// Returns distinct values for filter dropdowns
// ─────────────────────────────────────────────
app.get("/api/filters/options", (_req: Request, res: Response) => {
  const states = (db.prepare("SELECT DISTINCT state FROM stores ORDER BY state").all() as { state: string }[])
    .map((r) => r.state)
    .filter(Boolean);

  const brands = (db.prepare("SELECT DISTINCT brand_name FROM stores ORDER BY brand_name").all() as { brand_name: string }[])
    .map((r) => r.brand_name)
    .filter(Boolean);

  const statuses = (db.prepare("SELECT DISTINCT status FROM stores ORDER BY status").all() as { status: string }[])
    .map((r) => r.status)
    .filter(Boolean);

  res.json({ states, brands, statuses });
});

app.listen(PORT, () => {
  console.log(`🚀 Server running on http://localhost:${PORT}`);
});

export default app;
