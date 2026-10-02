import { THEMES, mix } from "./colors.mjs";
import { compact, escapeXml, truncate } from "./format.mjs";
import { computeStreaks, monthlyTotals } from "./stats.mjs";

const FONT = "'Segoe UI', -apple-system, BlinkMacSystemFont, 'Helvetica Neue', Arial, sans-serif";
const MONO = "ui-monospace, SFMono-Regular, Menlo, Consolas, monospace";

const frame = ({ width, height, theme, title, description, body }) => `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" fill="none" role="img" aria-labelledby="t d">
  <title id="t">${escapeXml(title)}</title>
  <desc id="d">${escapeXml(description)}</desc>
  <style>
    text { font-family: ${FONT}; }
    .title { font-size: 15px; font-weight: 600; fill: ${theme.text}; }
    .label { font-size: 10px; font-weight: 600; letter-spacing: 0.08em; fill: ${theme.muted}; }
    .value { font-size: 26px; font-weight: 700; fill: ${theme.text}; }
    .accent { fill: ${theme.accent}; }
    .small { font-size: 11px; fill: ${theme.muted}; }
    .name { font-size: 12px; fill: ${theme.text}; }
    @keyframes rise { from { opacity: 0; transform: translateY(6px); } to { opacity: 1; transform: translateY(0); } }
    @keyframes grow { from { transform: scaleY(0); } to { transform: scaleY(1); } }
    .rise { animation: rise 0.6s ease-out both; }
    .bar { transform-box: fill-box; transform-origin: bottom; animation: grow 0.8s cubic-bezier(0.2, 0.8, 0.2, 1) both; }
    @media (prefers-reduced-motion: reduce) { .rise, .bar { animation: none; } }
  </style>
  <rect x="0.5" y="0.5" width="${width - 1}" height="${height - 1}" rx="10" fill="${theme.card}" stroke="${theme.border}"/>
${body}
</svg>
`;

const heading = (text, theme) =>
  `<text class="title" x="25" y="36">${escapeXml(text)}</text><rect x="25" y="46" width="32" height="3" rx="1.5" fill="${theme.accent}"/>`;

export const renderStatsCard = ({ summary, calendar, username, theme: themeName }) => {
  const theme = THEMES[themeName];
  const metrics = [
    ["Repositories", summary.repositories],
    ["Stars earned", summary.stars],
    ["Forks", summary.forks],
    ["Followers", summary.followers],
    ["Contributions · 1y", calendar?.total ?? null],
    ["Pull requests · 1y", calendar?.pullRequests ?? null],
  ];
  const columns = [25, 185, 345];

  const cells = metrics
    .map(([label, value], index) => {
      const x = columns[index % 3];
      const labelY = 84 + Math.floor(index / 3) * 60;
      const delay = (index * 0.07).toFixed(2);
      return `  <g class="rise" style="animation-delay:${delay}s"><text class="label" x="${x}" y="${labelY}">${escapeXml(label.toUpperCase())}</text><text class="value" x="${x}" y="${labelY + 28}">${compact(value)}</text></g>`;
    })
    .join("\n");

  const description = metrics.map(([label, value]) => `${label}: ${compact(value)}`).join(", ");

  return frame({
    width: 495,
    height: 195,
    theme,
    title: `${username} GitHub overview`,
    description,
    body: `  ${heading("GitHub overview", theme)}\n${cells}`,
  });
};

export const renderLanguagesCard = ({ languages, username, theme: themeName }) => {
  const theme = THEMES[themeName];
  const barX = 25;
  const barWidth = 445;

  let body = `  ${heading("Top languages", theme)}\n`;

  if (languages.length === 0) {
    body += `  <text class="small" x="247.5" y="115" text-anchor="middle">Language data will appear after the first automated run</text>`;
  } else {
    let cursor = barX;
    const segments = languages
      .map((language) => {
        const width = (language.percent / 100) * barWidth;
        const rect = `<rect x="${cursor.toFixed(2)}" y="62" width="${Math.max(width, 1).toFixed(2)}" height="10" fill="${language.color}"/>`;
        cursor += width;
        return rect;
      })
      .join("");

    const legend = languages
      .slice(0, 6)
      .map((language, index) => {
        const x = 25 + (index % 2) * 230;
        const y = 104 + Math.floor(index / 2) * 30;
        const delay = (index * 0.08).toFixed(2);
        return `  <g class="rise" style="animation-delay:${delay}s"><circle cx="${x + 5}" cy="${y - 4}" r="5" fill="${language.color}"/><text class="name" x="${x + 18}" y="${y}">${escapeXml(truncate(language.name, 16))}</text><text class="small" x="${x + 200}" y="${y}" text-anchor="end">${language.percent.toFixed(1)}%</text></g>`;
      })
      .join("\n");

    body += `  <clipPath id="bar"><rect x="${barX}" y="62" width="${barWidth}" height="10" rx="5"/></clipPath>
  <rect x="${barX}" y="62" width="${barWidth}" height="10" rx="5" fill="${theme.track}"/>
  <g clip-path="url(#bar)">${segments}</g>
${legend}`;
  }

  const description = languages.length
    ? languages.map((language) => `${language.name} ${language.percent.toFixed(1)}%`).join(", ")
    : "No language data yet";

  return frame({ width: 495, height: 195, theme, title: `${username} top languages`, description, body });
};

export const renderActivityCard = ({ calendar, username, theme: themeName }) => {
  const theme = THEMES[themeName];
  const width = 830;
  const height = 214;
  const streaks = calendar ? computeStreaks(calendar.days) : null;
  const months = calendar ? monthlyTotals(calendar.days, 12) : [];

  const metrics = [
    ["Contributions · last year", streaks ? streaks.total : null, false],
    ["Current streak · days", streaks ? streaks.current : null, true],
    ["Longest streak · days", streaks ? streaks.longest : null, false],
  ];

  const metricMarkup = metrics
    .map(([label, value, highlight], index) => {
      const x = 25 + index * 270;
      const delay = (index * 0.08).toFixed(2);
      return `  <g class="rise" style="animation-delay:${delay}s"><text class="label" x="${x}" y="68">${escapeXml(label.toUpperCase())}</text><text class="value${highlight ? " accent" : ""}" x="${x}" y="98">${compact(value)}</text></g>`;
    })
    .join("\n");

  const chartBottom = 180;
  const maxHeight = 56;
  const slot = 780 / 12;
  const peak = Math.max(1, ...months.map((month) => month.total));

  let chart = `  <line x1="25" x2="805" y1="${chartBottom}" y2="${chartBottom}" stroke="${theme.border}"/>\n`;

  if (months.length === 0) {
    chart += `  <text class="small" x="415" y="150" text-anchor="middle">Contribution data will appear after the first automated run</text>`;
  } else {
    chart += months
      .map((month, index) => {
        const x = 25 + index * slot + (slot - 34) / 2;
        const barHeight = month.total === 0 ? 2 : Math.max(3, Math.round((month.total / peak) * maxHeight));
        const y = chartBottom - barHeight;
        const opacity = month.total === 0 ? 1 : (0.55 + 0.45 * (month.total / peak)).toFixed(2);
        const fill = month.total === 0 ? theme.track : theme.accent;
        const delay = (index * 0.05).toFixed(2);
        const valueLabel =
          month.total > 0
            ? `<text class="small" x="${(x + 17).toFixed(1)}" y="${y - 5}" text-anchor="middle">${compact(month.total)}</text>`
            : "";
        return `  <g><rect class="bar" style="animation-delay:${delay}s" x="${x.toFixed(1)}" y="${y}" width="34" height="${barHeight}" rx="3" fill="${fill}" opacity="${opacity}"/>${valueLabel}<text class="small" x="${(x + 17).toFixed(1)}" y="198" text-anchor="middle">${escapeXml(month.label)}</text></g>`;
      })
      .join("\n");
  }

  const description = streaks
    ? `${streaks.total} contributions in the last year, current streak ${streaks.current} days, longest streak ${streaks.longest} days`
    : "Contribution data is not available yet";

  return frame({
    width,
    height,
    theme,
    title: `${username} contribution activity`,
    description,
    body: `  ${heading("Contribution activity", theme)}\n${metricMarkup}\n${chart}`,
  });
};

export const renderHeader = ({ name, roles, tagline, accent }) => {
  const width = 1000;
  const height = 240;
  const deep = mix(accent, "#000000", 0.6);
  const bright = mix(accent, "#ffffff", 0.22);
  const count = roles.length;
  const cycle = Math.max(count, 1) * 3;
  const round = (value) => Number(value.toFixed(4));

  const roleMarkup = roles
    .map((role, index) => {
      const text = `&gt; ${escapeXml(role)}`;
      const base = `x="60" y="158" font-size="22" font-family="${MONO}" fill="#ffffff"`;
      if (count === 1) return `  <text ${base}>${text}</text>`;

      const start = index / count;
      const end = (index + 1) / count;
      const fade = Math.min(0.03, (end - start) / 4);
      let values;
      let times;
      if (index === 0) {
        values = "1;1;0;0";
        times = [0, end - fade, end, 1];
      } else if (index === count - 1) {
        values = "0;0;1;1";
        times = [0, start, start + fade, 1];
      } else {
        values = "0;0;1;1;0;0";
        times = [0, start, start + fade, end - fade, end, 1];
      }
      return `  <text ${base} opacity="${index === 0 ? 1 : 0}">${text}<animate attributeName="opacity" values="${values}" keyTimes="${times.map(round).join(";")}" dur="${cycle}s" repeatCount="indefinite"/></text>`;
    })
    .join("\n");

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" fill="none" role="img" aria-labelledby="t d">
  <title id="t">${escapeXml(name)}</title>
  <desc id="d">${escapeXml(`${name} · ${roles.join(", ")}`)}</desc>
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="${bright}"/>
      <stop offset="0.45" stop-color="${accent}"/>
      <stop offset="1" stop-color="${deep}"/>
    </linearGradient>
    <radialGradient id="glow" cx="0.5" cy="0.5" r="0.5">
      <stop offset="0" stop-color="#ffffff" stop-opacity="0.28"/>
      <stop offset="1" stop-color="#ffffff" stop-opacity="0"/>
    </radialGradient>
    <pattern id="grid" width="32" height="32" patternUnits="userSpaceOnUse">
      <path d="M32 0H0V32" stroke="#ffffff" stroke-opacity="0.07"/>
    </pattern>
    <clipPath id="round"><rect width="${width}" height="${height}" rx="18"/></clipPath>
  </defs>
  <g clip-path="url(#round)">
    <rect width="${width}" height="${height}" fill="url(#bg)"/>
    <rect width="${width}" height="${height}" fill="url(#grid)"/>
    <circle cx="830" cy="50" r="170" fill="url(#glow)">
      <animateTransform attributeName="transform" type="translate" values="0 0;-50 34;0 0" dur="14s" repeatCount="indefinite"/>
    </circle>
    <circle cx="140" cy="250" r="140" fill="url(#glow)" opacity="0.6">
      <animateTransform attributeName="transform" type="translate" values="0 0;40 -24;0 0" dur="18s" repeatCount="indefinite"/>
    </circle>
    <text x="620" y="178" font-size="170" font-weight="800" font-family="${MONO}" fill="#ffffff" fill-opacity="0.1">&lt;/&gt;</text>
  </g>
  <text x="60" y="108" font-size="54" font-weight="800" font-family="${FONT}" fill="#ffffff" letter-spacing="-1">${escapeXml(name)}</text>
${roleMarkup}
  <text x="60" y="200" font-size="15" font-family="${FONT}" fill="#ffffff" fill-opacity="0.75">${escapeXml(tagline)}</text>
</svg>
`;
};

export const renderCards = ({ config, data }) => {
  const files = { "header.svg": renderHeader({ name: config.name, roles: config.roles, tagline: config.tagline, accent: config.accent }) };

  for (const theme of ["dark", "light"]) {
    files[`stats-${theme}.svg`] = renderStatsCard({ summary: data.summary, calendar: data.calendar, username: config.username, theme });
    files[`languages-${theme}.svg`] = renderLanguagesCard({ languages: data.languages, username: config.username, theme });
    files[`activity-${theme}.svg`] = renderActivityCard({ calendar: data.calendar, username: config.username, theme });
  }

  return files;
};
