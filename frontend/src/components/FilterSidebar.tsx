import React from "react";
import { FilterOptions, Filters } from "../types";
import "./FilterSidebar.css";

interface Props {
  filters: Filters;
  options: FilterOptions | null;
  onChange: (filters: Filters) => void;
  storeCount: number | null;
  responseMs: number | null;
  tier: number | null;
}

const TIER_LABELS: Record<number, string> = {
  1: "🌎 Country View",
  2: "🔍 Regional Clusters",
  3: "📍 Street View",
};

export const FilterSidebar: React.FC<Props> = ({
  filters,
  options,
  onChange,
  storeCount,
  responseMs,
  tier,
}) => {
  const set = (key: keyof Filters, value: string) =>
    onChange({ ...filters, [key]: value });

  const clearAll = () => onChange({ state: "", brand: "", status: "" });
  const hasFilters = filters.state || filters.brand || filters.status;

  return (
    <aside className="filter-sidebar">
      <div className="sidebar-header">
        <div className="sidebar-logo">
          <span className="logo-icon">◈</span>
          <span className="logo-text">RetailMap</span>
        </div>
        <p className="sidebar-subtitle">US Store Locations</p>
      </div>

      {tier !== null && (
        <div className="tier-badge">
          <span>{TIER_LABELS[tier] || "Loading..."}</span>
        </div>
      )}

      <div className="stats-row">
        {storeCount !== null && (
          <div className="stat-item">
            <span className="stat-value">{storeCount.toLocaleString()}</span>
            <span className="stat-label">visible</span>
          </div>
        )}
        {responseMs !== null && (
          <div className="stat-item">
            <span className="stat-value">{responseMs}ms</span>
            <span className="stat-label">response</span>
          </div>
        )}
      </div>

      <div className="filters-section">
        <div className="filters-title">
          <span>Filters</span>
          {hasFilters && (
            <button className="clear-btn" onClick={clearAll}>
              Clear all
            </button>
          )}
        </div>

        <div className="filter-group">
          <label className="filter-label">State</label>
          <select
            className="filter-select"
            value={filters.state}
            onChange={(e) => set("state", e.target.value)}
          >
            <option value="">All states</option>
            {options?.states.map((s) => (
              <option key={s} value={s}>
                {s.charAt(0).toUpperCase() + s.slice(1)}
              </option>
            ))}
          </select>
        </div>

        <div className="filter-group">
          <label className="filter-label">Brand</label>
          <select
            className="filter-select"
            value={filters.brand}
            onChange={(e) => set("brand", e.target.value)}
          >
            <option value="">All brands</option>
            {options?.brands.map((b) => (
              <option key={b} value={b}>
                {b}
              </option>
            ))}
          </select>
        </div>

        <div className="filter-group">
          <label className="filter-label">Status</label>
          <div className="status-pills">
            {["", "Active", "Closed", "Planned"].map((s) => (
              <button
                key={s}
                className={`status-pill ${filters.status === s ? "active" : ""} ${s === "Active" ? "pill-active" : s === "Closed" ? "pill-closed" : s === "Planned" ? "pill-planned" : ""}`}
                onClick={() => set("status", s)}
              >
                {s || "All"}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="sidebar-footer">
        <div className="zoom-guide">
          <div className="zoom-tier">
            <span className="zoom-dot dot-1"></span>
            <span>Zoom &lt;6 → State counts</span>
          </div>
          <div className="zoom-tier">
            <span className="zoom-dot dot-2"></span>
            <span>Zoom 6–13 → Clusters</span>
          </div>
          <div className="zoom-tier">
            <span className="zoom-dot dot-3"></span>
            <span>Zoom ≥14 → Stores</span>
          </div>
        </div>
      </div>
    </aside>
  );
};
