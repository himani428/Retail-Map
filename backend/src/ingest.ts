import Database from "better-sqlite3";
import { parse } from "csv-parse";
import fs from "fs";
import path from "path";
import dotenv from "dotenv";

dotenv.config();

const DB_PATH = path.join(__dirname, "../data/stores.db");
const CSV_PATH = process.env.CSV_PATH || path.join(__dirname, "../data/my_pois.csv");

export function getDb(): Database.Database {
  const db = new Database(DB_PATH);
  db.pragma("journal_mode = WAL");
  db.pragma("synchronous = NORMAL");
  return db;
}

export function initDb(): Database.Database {
  const db = getDb();

  db.exec(`
    CREATE TABLE IF NOT EXISTS stores (
      id TEXT PRIMARY KEY,
      brand_name TEXT,
      latitude REAL NOT NULL,
      longitude REAL NOT NULL,
      status TEXT,
      state TEXT,
      city TEXT
    );
    CREATE INDEX IF NOT EXISTS idx_lat_lng ON stores(latitude, longitude);
    CREATE INDEX IF NOT EXISTS idx_state ON stores(state);
    CREATE INDEX IF NOT EXISTS idx_brand ON stores(brand_name);
    CREATE INDEX IF NOT EXISTS idx_status ON stores(status);
  `);

  return db;
}

async function ingest(): Promise<void> {
  if (!fs.existsSync(CSV_PATH)) {
    console.error(`CSV not found at: ${CSV_PATH}`);
    console.error("Place your CSV at backend/data/my_pois.csv and re-run npm run ingest");
    process.exit(1);
  }

  const db = initDb();
  const count = (db.prepare("SELECT COUNT(*) as c FROM stores").get() as { c: number }).c;

  if (count > 0) {
    console.log(`DB already has ${count} stores. Skipping ingest. Delete data/stores.db to re-ingest.`);
    db.close();
    return;
  }

  console.log("Ingesting CSV...");
  const insert = db.prepare(
    "INSERT OR IGNORE INTO stores (id, brand_name, latitude, longitude, status, state, city) VALUES (?, ?, ?, ?, ?, ?, ?)"
  );

  const insertMany = db.transaction((rows: string[][]) => {
    for (const row of rows) {
      insert.run(row);
    }
  });

  const fileStream = fs.createReadStream(CSV_PATH);
  const parser = fileStream.pipe(
    parse({
      columns: true,
      skip_empty_lines: true,
      trim: true,
    })
  );

  let batch: string[][] = [];
  let total = 0;

  for await (const record of parser) {
    const lat = parseFloat(record.latitude);
    const lng = parseFloat(record.longitude);
    if (isNaN(lat) || isNaN(lng)) continue;

    batch.push([
      record.id || `${lat}_${lng}_${Math.random()}`,
      record.brand_name || record.brand_initial || "",
      lat,
      lng,
      record.status || "",
      (record.state || "").toLowerCase(),
      record.city || "",
    ]);

    if (batch.length >= 5000) {
      insertMany(batch);
      total += batch.length;
      console.log(`  Inserted ${total} rows...`);
      batch = [];
    }
  }

  if (batch.length > 0) {
    insertMany(batch);
    total += batch.length;
  }

  console.log(`Done. Total rows inserted: ${total}`);
  db.close();
}

ingest().catch(console.error);
