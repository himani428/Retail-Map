import { useCallback, useRef } from "react";
import { ApiResponse, Bounds, Filters } from "../types";

const API_BASE = "https://retail-map.onrender.com/api";

// Simple round-based cache key
function boundsKey(
  bounds: Bounds,
  zoom: number,
  filters: Filters
): string {
  const precision = zoom >= 14 ? 3 : zoom >= 6 ? 2 : 1;

  const r = (n: number) =>
    Math.round(n * 10 ** precision) / 10 ** precision;

  return `${r(bounds.swLat)},${r(bounds.swLng)},${r(
    bounds.neLat
  )},${r(bounds.neLng)},${zoom},${filters.state},${filters.brand},${filters.status}`;
}

export function useStoreApi() {
  const cacheRef = useRef<Map<string, ApiResponse>>(new Map());

  const abortRef = useRef<AbortController | null>(null);

  const fetchStores = useCallback(
    async (
      bounds: Bounds,
      zoom: number,
      filters: Filters
    ): Promise<ApiResponse | null> => {
      const key = boundsKey(bounds, zoom, filters);

      // Cache hit
      if (cacheRef.current.has(key)) {
        return cacheRef.current.get(key)!;
      }

      // Cancel any in-flight request
      abortRef.current?.abort();

      abortRef.current = new AbortController();

      const params = new URLSearchParams({
        swLat: String(bounds.swLat),
        swLng: String(bounds.swLng),
        neLat: String(bounds.neLat),
        neLng: String(bounds.neLng),
        zoom: String(zoom),
        ...(filters.state && { state: filters.state }),
        ...(filters.brand && { brand: filters.brand }),
        ...(filters.status && { status: filters.status }),
      });

      try {
        const res = await fetch(
          `${API_BASE}/stores?${params.toString()}`,
          {
            signal: abortRef.current.signal,
          }
        );

        if (!res.ok) {
          throw new Error(`HTTP ${res.status}`);
        }

        const data: ApiResponse = await res.json();

        // Cache up to 50 entries
        if (cacheRef.current.size > 50) {
          const firstKey = cacheRef.current.keys().next().value;

          if (firstKey) {
            cacheRef.current.delete(firstKey);
          }
        }

        cacheRef.current.set(key, data);

        return data;
      } catch (e: unknown) {
        if (e instanceof Error && e.name === "AbortError") {
          return null;
        }

        console.error("fetchStores error:", e);

        return null;
      }
    },
    []
  );

  return { fetchStores };
}

export async function fetchConfig(): Promise<{
  googleMapsApiKey: string;
}> {
  const res = await fetch(`${API_BASE}/config`);

  if (!res.ok) {
    throw new Error(`HTTP ${res.status}`);
  }

  return res.json();
}

export async function fetchFilterOptions() {
  const res = await fetch(`${API_BASE}/filters/options`);

  if (!res.ok) {
    throw new Error(`HTTP ${res.status}`);
  }

  return res.json();
}