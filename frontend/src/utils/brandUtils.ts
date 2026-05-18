// Maps brand initials to color for visual differentiation
const BRAND_COLORS: Record<string, string> = {
  A: "#FF6B6B",
  B: "#4ECDC4",
  C: "#45B7D1",
  D: "#96CEB4",
  E: "#FFEAA7",
  F: "#DDA0DD",
  G: "#98D8C8",
  H: "#F7DC6F",
  I: "#BB8FCE",
  J: "#85C1E9",
  K: "#F0B27A",
  L: "#82E0AA",
  M: "#F1948A",
  N: "#AED6F1",
  O: "#A9DFBF",
  P: "#FAD7A0",
  Q: "#A8D8EA",
  R: "#F9E4B7",
  S: "#C39BD3",
  T: "#7FB3D3",
  U: "#76D7C4",
  V: "#F7CAC9",
  W: "#92A8D1",
  X: "#955251",
  Y: "#B5EAD7",
  Z: "#C7CEEA",
  DT: "#FF9F43",
  FD: "#EE5A24",
  BCF: "#0652DD",
  HD: "#F79F1F",
};

export function getBrandColor(brand: string): string {
  const key = brand?.toUpperCase() || "";
  return BRAND_COLORS[key] || BRAND_COLORS[key[0]] || "#6C5CE7";
}

export function getBrandInitial(brand: string): string {
  return (brand || "?").substring(0, 2).toUpperCase();
}

export function formatCount(n: number): string {
  if (n >= 1000) return `${(n / 1000).toFixed(n >= 10000 ? 0 : 1)}k`;
  return String(n);
}
