import React, { useEffect, useState } from "react";
import { MapView } from "./components/MapView";
import { FilterSidebar } from "./components/FilterSidebar";
import { LoadingScreen } from "./components/LoadingScreen";
import { fetchConfig, fetchFilterOptions } from "./hooks/useStoreApi";
import { FilterOptions, Filters } from "./types";
import "./App.css";

const App: React.FC = () => {
  const [apiKey, setApiKey] = useState<string | null>(null);
  const [filterOptions, setFilterOptions] = useState<FilterOptions | null>(null);
  const [filters, setFilters] = useState<Filters>({ state: "", brand: "", status: "" });
  const [tier, setTier] = useState<number | null>(null);
  const [storeCount, setStoreCount] = useState<number | null>(null);
  const [responseMs, setResponseMs] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    Promise.all([fetchConfig(), fetchFilterOptions()])
      .then(([config, options]) => {
        if (!config.googleMapsApiKey) {
          setError("Google Maps API key missing. Check backend .env");
          return;
        }
        setApiKey(config.googleMapsApiKey);
        setFilterOptions(options);
      })
      .catch(() => setError("Cannot connect to backend. Make sure it is running on port 3001."));
  }, []);

  const handleStatsChange = (count: number, ms: number) => {
    setStoreCount(count);
    setResponseMs(ms);
  };

  if (error) {
    return (
      <div className="error-screen">
        <div className="error-icon">⚠️</div>
        <div className="error-title">Connection Error</div>
        <div className="error-msg">{error}</div>
      </div>
    );
  }

  if (!apiKey) {
    return <LoadingScreen message="Connecting to server..." />;
  }

  return (
    <div className="app">
      <FilterSidebar
        filters={filters}
        options={filterOptions}
        onChange={setFilters}
        storeCount={storeCount}
        responseMs={responseMs}
        tier={tier}
      />
      <div className="map-wrapper">
        <MapView
          apiKey={apiKey}
          filters={filters}
          onTierChange={setTier}
          onStatsChange={handleStatsChange}
        />
      </div>
    </div>
  );
};

export default App;
