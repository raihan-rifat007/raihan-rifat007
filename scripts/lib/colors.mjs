const LANGUAGE_COLORS = {
  JavaScript: "#f1e05a",
  TypeScript: "#3178c6",
  Python: "#3572a5",
  HTML: "#e34c26",
  CSS: "#563d7c",
  SCSS: "#c6538c",
  Shell: "#89e051",
  Dockerfile: "#384d54",
  Dart: "#00b4ab",
  Java: "#b07219",
  Kotlin: "#a97bff",
  Swift: "#f05138",
  PHP: "#4f5d95",
  "C++": "#f34b7d",
  C: "#8a8a8a",
  "C#": "#178600",
  Go: "#00add8",
  Rust: "#dea584",
  Ruby: "#701516",
  Lua: "#3d6ec8",
  Vue: "#41b883",
  Svelte: "#ff3e00",
  EJS: "#a91e50",
  Makefile: "#427819",
  Batchfile: "#c1f12e",
  "Jupyter Notebook": "#da5b0b",
  Other: "#8b949e",
};

export const languageColor = (name) => LANGUAGE_COLORS[name] ?? "#8b949e";

const parse = (hex) => {
  const value = hex.replace("#", "");
  return [0, 2, 4].map((offset) => parseInt(value.slice(offset, offset + 2), 16));
};

export const mix = (from, to, amount) => {
  const a = parse(from);
  const b = parse(to);
  const channel = (index) => Math.round(a[index] + (b[index] - a[index]) * amount);
  return `#${[0, 1, 2].map((index) => channel(index).toString(16).padStart(2, "0")).join("")}`;
};

export const THEMES = {
  dark: {
    name: "dark",
    card: "#0d1117",
    border: "#30363d",
    text: "#e6edf3",
    muted: "#8b949e",
    accent: "#58a6ff",
    track: "#21262d",
    heat: ["#161b22", "#0e4429", "#006d32", "#26a641", "#39d353"],
  },
  light: {
    name: "light",
    card: "#ffffff",
    border: "#d0d7de",
    text: "#1f2328",
    muted: "#656d76",
    accent: "#0969da",
    track: "#eaeef2",
    heat: ["#ebedf0", "#9be9a8", "#40c463", "#30a14e", "#216e39"],
  },
};
