import React from "react";
import { StorePoint } from "../types";
import { getBrandColor, getBrandInitial } from "../utils/brandUtils";
import "./InfoPopup.css";

interface Props {
  store: StorePoint;
  onClose: () => void;
}

const STATUS_COLORS: Record<string, string> = {
  Active: "#2ed573",
  Closed: "#ff4757",
  Planned: "#ffa502",
};

export const InfoPopup: React.FC<Props> = ({ store, onClose }) => {
  const color = getBrandColor(store.brand_name);
  const initial = getBrandInitial(store.brand_name);
  const statusColor = STATUS_COLORS[store.status] || "#aaa";

  return (
    <div className="info-popup">
      <button className="popup-close" onClick={onClose}>×</button>
      <div className="popup-header" style={{ borderLeftColor: color }}>
        <div className="popup-brand-icon" style={{ background: color + "22", borderColor: color }}>
          <span style={{ color }}>{initial}</span>
        </div>
        <div className="popup-brand-info">
          <span className="popup-brand-name">{store.brand_name}</span>
          <span className="popup-status" style={{ color: statusColor }}>
            <span className="status-dot" style={{ background: statusColor }}></span>
            {store.status}
          </span>
        </div>
      </div>
      <div className="popup-body">
        <div className="popup-row">
          <span className="popup-icon">📍</span>
          <span>{store.city}, {store.state.charAt(0).toUpperCase() + store.state.slice(1)}</span>
        </div>
        <div className="popup-row">
          <span className="popup-icon">🆔</span>
          <span className="popup-id">{store.id}</span>
        </div>
        <div className="popup-row">
          <span className="popup-icon">🌐</span>
          <span className="popup-coords">
            {store.lat.toFixed(5)}, {store.lng.toFixed(5)}
          </span>
        </div>
      </div>
    </div>
  );
};
