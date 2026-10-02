const compactFormatter = new Intl.NumberFormat("en", { notation: "compact", maximumFractionDigits: 1 });

export const compact = (value) => (value === null || value === undefined ? "—" : compactFormatter.format(value));

export const escapeXml = (text) =>
  String(text)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");

export const escapeCell = (text) =>
  String(text)
    .replace(/\r?\n/g, " ")
    .replace(/\|/g, "\\|")
    .trim();

export const truncate = (text, max) => {
  const value = String(text);
  return value.length > max ? `${value.slice(0, max - 1).trimEnd()}…` : value;
};

export const unique = (items) => [...new Set(items.filter(Boolean))];

export const day = (iso) => String(iso).slice(0, 10);

export const shieldText = (text) =>
  encodeURIComponent(String(text).replace(/-/g, "--").replace(/_/g, "__").replace(/ /g, "_"));
