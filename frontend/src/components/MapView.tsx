import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  APIProvider,
  Map,
  useMap,
  useMapsLibrary,
} from "@vis.gl/react-google-maps";
import { Bounds, Filters, ClusterMarker, StateMarker, StorePoint } from "../types";
import { useStoreApi } from "../hooks/useStoreApi";
import { useDebounce } from "../hooks/useDebounce";
import { getBrandColor, getBrandInitial, formatCount } from "../utils/brandUtils";
import { InfoPopup } from "./InfoPopup";
import "./MapView.css";

interface Props {
  apiKey: string;
  filters: Filters;
  onTierChange: (tier: number) => void;
  onStatsChange: (count: number, ms: number) => void;
}

// ── Inner map controller (has access to map instance) ──────────────────
const MapController: React.FC<{
  filters: Filters;
  onTierChange: (tier: number) => void;
  onStatsChange: (count: number, ms: number) => void;
}> = ({ filters, onTierChange, onStatsChange }) => {
  const map = useMap();
  const coreLib = useMapsLibrary("core");
  const markerLib = useMapsLibrary("marker");
  const { fetchStores } = useStoreApi();

  const markersRef = useRef<google.maps.marker.AdvancedMarkerElement[]>([]);
  const [selectedStore, setSelectedStore] = useState<StorePoint | null>(null);

  // Clear all overlay markers
  const clearMarkers = useCallback(() => {
    markersRef.current.forEach((m) => (m.map = null));
    markersRef.current = [];
  }, []);

  // ── Render Tier 1: state bubble markers ─────────────────────────────
  const renderTier1 = useCallback(
    (data: StateMarker[]) => {
      if (!map || !markerLib) return;
      clearMarkers();
      data.forEach((s) => {
        const el = document.createElement("div");
        el.className = "state-marker";
        el.innerHTML = `<span class="state-abbr">${s.abbr}</span><span class="state-count">${formatCount(s.count)}</span>`;

        const marker = new markerLib.AdvancedMarkerElement({
          map,
          position: { lat: s.lat, lng: s.lng },
          content: el,
        });
        marker.addListener("click", () => {
          map.setZoom(7);
          map.panTo({ lat: s.lat, lng: s.lng });
        });
        markersRef.current.push(marker);
      });
    },
    [map, markerLib, clearMarkers]
  );

  // ── Render Tier 2: cluster markers ──────────────────────────────────
  const renderTier2 = useCallback(
    (data: ClusterMarker[]) => {
      if (!map || !markerLib) return;
      clearMarkers();
      data.forEach((c) => {
        const isSingle = c.count === 1;
        const color = isSingle ? getBrandColor(c.brand_name || "") : "#00cec9";
        const el = document.createElement("div");

        if (isSingle) {
          el.className = "store-marker-small";
          el.style.background = color + "33";
          el.style.borderColor = color;
          el.innerHTML = `<span style="color:${color}">${getBrandInitial(c.brand_name || "")}</span>`;
        } else {
          const size = Math.min(64, 32 + Math.log10(c.count) * 14);
          el.className = "cluster-marker";
          el.style.width = el.style.height = `${size}px`;
          el.style.fontSize = `${Math.max(10, size * 0.28)}px`;
          el.innerHTML = `${formatCount(c.count)}`;
        }

        const marker = new markerLib.AdvancedMarkerElement({
          map,
          position: { lat: c.lat, lng: c.lng },
          content: el,
        });
        marker.addListener("click", () => {
          const zoom = map.getZoom() || 8;
          map.setZoom(Math.min(zoom + 2, 15));
          map.panTo({ lat: c.lat, lng: c.lng });
        });
        markersRef.current.push(marker);
      });
    },
    [map, markerLib, clearMarkers]
  );

  // ── Render Tier 3: individual store markers ──────────────────────────
  const renderTier3 = useCallback(
    (data: StorePoint[]) => {
      if (!map || !markerLib) return;
      clearMarkers();
      data.forEach((store) => {
        const color = getBrandColor(store.brand_name);
        const el = document.createElement("div");
        el.className = "store-marker";
        el.style.background = color + "22";
        el.style.borderColor = color;
        el.innerHTML = `<span style="color:${color}">${getBrandInitial(store.brand_name)}</span>`;

        const marker = new markerLib.AdvancedMarkerElement({
          map,
          position: { lat: store.lat, lng: store.lng },
          content: el,
        });
        marker.addListener("click", () => setSelectedStore(store));
        markersRef.current.push(marker);
      });
    },
    [map, markerLib, clearMarkers]
  );

  // ── Main fetch + render function ────────────────────────────────────
  const loadData = useCallback(async () => {
    if (!map || !coreLib) return;

    const bounds = map.getBounds();
    const zoom = map.getZoom();
    if (!bounds || zoom === undefined) return;

    const ne = bounds.getNorthEast();
    const sw = bounds.getSouthWest();
    const viewportBounds: Bounds = {
      swLat: sw.lat(),
      swLng: sw.lng(),
      neLat: ne.lat(),
      neLng: ne.lng(),
    };

    const result = await fetchStores(viewportBounds, zoom, filters);
    if (!result) return;

    onTierChange(result.tier);

    if (result.tier === 1) {
      onStatsChange(result.data.length, result.ms);
      renderTier1(result.data as StateMarker[]);
    } else if (result.tier === 2) {
      onStatsChange(result.data.length, result.ms);
      renderTier2(result.data as ClusterMarker[]);
    } else {
      onStatsChange(result.data.length, result.ms);
      renderTier3(result.data as StorePoint[]);
    }
  }, [map, coreLib, filters, fetchStores, onTierChange, onStatsChange, renderTier1, renderTier2, renderTier3]);

  const debouncedLoad = useDebounce(loadData, 250);

  // Attach map event listeners
  useEffect(() => {
    if (!map) return;
    const listeners = [
      map.addListener("idle", debouncedLoad),
    ];
    debouncedLoad();
    return () => listeners.forEach((l) => google.maps.event.removeListener(l));
  }, [map, debouncedLoad]);

  return (
    <>
      {selectedStore && (
        <InfoPopup store={selectedStore} onClose={() => setSelectedStore(null)} />
      )}
    </>
  );
};

// ── Map dark style ─────────────────────────────────────────────────────
const MAP_STYLE = [
  { elementType: "geometry", stylers: [{ color: "#0d1117" }] },
  { elementType: "labels.text.stroke", stylers: [{ color: "#0d1117" }] },
  { elementType: "labels.text.fill", stylers: [{ color: "#746855" }] },
  { featureType: "administrative.locality", elementType: "labels.text.fill", stylers: [{ color: "#d59563" }] },
  { featureType: "poi", elementType: "labels.text.fill", stylers: [{ color: "#d59563" }] },
  { featureType: "poi.park", elementType: "geometry", stylers: [{ color: "#263c3f" }] },
  { featureType: "poi.park", elementType: "labels.text.fill", stylers: [{ color: "#6b9a76" }] },
  { featureType: "road", elementType: "geometry", stylers: [{ color: "#1a1f35" }] },
  { featureType: "road", elementType: "geometry.stroke", stylers: [{ color: "#212a37" }] },
  { featureType: "road", elementType: "labels.text.fill", stylers: [{ color: "#9ca5b3" }] },
  { featureType: "road.highway", elementType: "geometry", stylers: [{ color: "#746855" }] },
  { featureType: "road.highway", elementType: "geometry.stroke", stylers: [{ color: "#1f2835" }] },
  { featureType: "road.highway", elementType: "labels.text.fill", stylers: [{ color: "#f3d19c" }] },
  { featureType: "transit", elementType: "geometry", stylers: [{ color: "#2f3948" }] },
  { featureType: "transit.station", elementType: "labels.text.fill", stylers: [{ color: "#d59563" }] },
  { featureType: "water", elementType: "geometry", stylers: [{ color: "#17263c" }] },
  { featureType: "water", elementType: "labels.text.fill", stylers: [{ color: "#515c6d" }] },
  { featureType: "water", elementType: "labels.text.stroke", stylers: [{ color: "#17263c" }] },
  { featureType: "administrative.country", elementType: "geometry.stroke", stylers: [{ color: "#4b6878" }] },
  { featureType: "administrative.province", elementType: "geometry.stroke", stylers: [{ color: "#4b6878" }] },
];

// ── Top-level MapView ──────────────────────────────────────────────────
export const MapView: React.FC<Props> = ({ apiKey, filters, onTierChange, onStatsChange }) => {
  return (
    <APIProvider apiKey={apiKey}>
      <div className="map-container">
        <Map
          defaultCenter={{ lat: 39.5, lng: -98.35 }}
          defaultZoom={4}
          mapId="retail-map"
          styles={MAP_STYLE}
          disableDefaultUI={false}
          zoomControl={true}
          fullscreenControl={false}
          streetViewControl={false}
          mapTypeControl={false}
          className="google-map"
        >
          <MapController
            filters={filters}
            onTierChange={onTierChange}
            onStatsChange={onStatsChange}
          />
        </Map>
      </div>
    </APIProvider>
  );
};
