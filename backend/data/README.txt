Place your my_pois.csv file here, then run:

  npm run ingest   (from the project root)

This will parse the CSV and create a SQLite database (stores.db) in this folder.
The ingest is idempotent — running it again when the DB already has rows is a no-op.

Expected CSV columns:
  id, brand_name, latitude, longitude, status, state, city

(based on what was visible in the dataset screenshot)
