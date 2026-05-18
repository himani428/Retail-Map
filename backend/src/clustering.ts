// Simple in-process grid-based clustering for Tier 2
// Groups points into cells based on zoom level

export interface StorePoint {
  id: string;
  lat: number;
  lng: number;
  brand_name: string;
  status: string;
  state: string;
  city: string;
}

export interface Cluster {
  id: string;
  lat: number;
  lng: number;
  count: number;
  // For single-store clusters (count === 1):
  brand_name?: string;
  status?: string;
  state?: string;
  city?: string;
}

/**
 * Clusters an array of store points using a grid-cell approach.
 * cellSize is in degrees of lat/lng.
 */
export function clusterPoints(points: StorePoint[], cellSize: number): Cluster[] {
  const grid = new Map<string, { sumLat: number; sumLng: number; count: number; first: StorePoint }>();

  for (const p of points) {
    const cellLat = Math.floor(p.lat / cellSize);
    const cellLng = Math.floor(p.lng / cellSize);
    const key = `${cellLat}:${cellLng}`;

    const existing = grid.get(key);
    if (existing) {
      existing.sumLat += p.lat;
      existing.sumLng += p.lng;
      existing.count += 1;
    } else {
      grid.set(key, { sumLat: p.lat, sumLng: p.lng, count: 1, first: p });
    }
  }

  const clusters: Cluster[] = [];
  for (const [key, cell] of grid) {
    const cluster: Cluster = {
      id: `cluster-${key}`,
      lat: cell.sumLat / cell.count,
      lng: cell.sumLng / cell.count,
      count: cell.count,
    };
    if (cell.count === 1) {
      cluster.brand_name = cell.first.brand_name;
      cluster.status = cell.first.status;
      cluster.state = cell.first.state;
      cluster.city = cell.first.city;
      cluster.id = cell.first.id;
    }
    clusters.push(cluster);
  }

  return clusters;
}

/**
 * Returns grid cell size in degrees for a given zoom level.
 * Higher zoom = smaller cells = finer granularity.
 */
export function getCellSize(zoom: number): number {
  if (zoom <= 5) return 3.0;
  if (zoom <= 7) return 1.5;
  if (zoom <= 9) return 0.75;
  if (zoom <= 11) return 0.25;
  return 0.1;
}
