import React from "react";
import "./LoadingScreen.css";

interface Props {
  message?: string;
}

export const LoadingScreen: React.FC<Props> = ({ message = "Loading..." }) => (
  <div className="loading-screen">
    <div className="loading-content">
      <div className="loading-logo">◈</div>
      <div className="loading-text">RetailMap</div>
      <div className="loading-bar">
        <div className="loading-bar-fill"></div>
      </div>
      <div className="loading-message">{message}</div>
    </div>
  </div>
);
