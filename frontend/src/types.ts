export interface Bounds {
  swLat: number;
  swLng: number;
  neLat: number;
  neLng: number;
}

export interface Filters {
  state: string;
  brand: string;
  status: string;
}

export interface StateMarker {
  state: string;
  abbr: string;
  lat: number;
  lng: number;
  count: number;
}

export interface ClusterMarker {
  id: string;
  lat: number;
  lng: number;
  count: number;
  // present when count === 1
  brand_name?: string;
  status?: string;
  state?: string;
  city?: string;
}

export interface StorePoint {
  id: string;
  lat: number;
  lng: number;
  brand_name: string;
  status: string;
  state: string;
  city: string;
}

export type ApiResponse =
  | { tier: 1; data: StateMarker[]; ms: number }
  | { tier: 2; data: ClusterMarker[]; ms: number }
  | { tier: 3; data: StorePoint[]; ms: number };

export interface FilterOptions {
  states: string[];
  brands: string[];
  statuses: string[];
}
