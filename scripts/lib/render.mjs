import { escapeCell, escapeXml, shieldText, truncate } from "./format.mjs";
import { stackOf } from "./projects.mjs";

export const TOKENS = [
  "header",
  "highlights",
  "about",
  "stack",
  "projects",
  "username",
  "stats",
  "snake",
  "activity",
  "journey",
  "connect",
  "footer",
];

const picture = ({ dark, light, alt, width }) => {
  const size = width ? ` width="${width}"` : "";
  return `<picture>
  <source media="(prefers-color-scheme: dark)" srcset="${dark}">
  <img alt="${escapeXml(alt)}" src="${light}"${size}>
</picture>`;
};

const badge = ({ label, color, logo, logoColor = "white", style = "for-the-badge", message }) => {
  const text = message ? `${shieldText(label)}-${shieldText(message)}` : shieldText(label);
  const logoPart = logo ? `&logo=${encodeURIComponent(logo)}&logoColor=${encodeURIComponent(logoColor)}` : "";
  return `https://img.shields.io/badge/${text}-${color}?style=${style}${logoPart}`;
};

export const renderHeader = (config) =>
  `<p align="center">
  <img src="assets/header.svg" alt="${escapeXml(config.name)} · ${escapeXml(config.headline)}" width="100%">
</p>`;

export const renderHighlights = (config) => {
  const user = config.username;
  const items = [
    `<a href="https://github.com/${user}?tab=followers"><img alt="Followers" src="https://img.shields.io/github/followers/${user}?style=flat-square&logo=github&label=followers&color=0d47a1"></a>`,
    `<img alt="Status" src="${badge({ label: "Status", message: config.status, color: "2ea043", style: "flat-square" })}">`,
    `<img alt="Location" src="${badge({ label: "Based in", message: config.location, color: "0d47a1", style: "flat-square" })}">`,
    `<a href="${config.website}"><img alt="Portfolio" src="${badge({ label: "Portfolio", message: config.website.replace(/^https?:\/\//, ""), color: "181717", style: "flat-square", logo: "vercel" })}"></a>`,
  ];
  return `<p align="center">\n  ${items.join("\n  ")}\n</p>`;
};

export const renderAbout = (config) => {
  const lines = [
    `${config.about}`,
    "",
    `- 🔭 **Building:** ${config.now.building.join(" · ")}`,
    `- 🌱 **Learning:** ${config.now.learning.join(" · ")}`,
    `- 📍 **Based in:** ${config.location}`,
    `- 📫 **Reach me:** [${config.email}](mailto:${config.email})`,
    `- ⚡ **Fun fact:** ${config.funFact}`,
  ];
  return lines.join("\n");
};

export const renderStack = (config) => {
  const groups = config.stack
    .map((group) => {
      const list = group.icons.join(",");
      const base = `https://skillicons.dev/icons?i=${list}&perline=${group.perline ?? group.icons.length}`;
      return `<b>${escapeXml(group.group)}</b><br>
${picture({ dark: `${base}&theme=dark`, light: `${base}&theme=light`, alt: group.group })}`;
    })
    .join("\n<br><br>\n");
  return `<div align="center">\n\n${groups}\n\n</div>`;
};

export const renderProjects = (projects) => {
  if (projects.length === 0) {
    return "_Repositories will appear here after the first automated run._";
  }

  const rows = projects.map((project) => {
    const links = [
      `[![Repo](${badge({ label: "Repo", color: "181717", logo: "github", style: "flat-square" })})](${project.url})`,
      project.homepage
        ? `[![Live](${badge({ label: "Live", color: "0d47a1", logo: "vercel", style: "flat-square" })})](${project.homepage})`
        : "",
    ]
      .filter(Boolean)
      .join(" ");
    const description = project.description ? escapeCell(truncate(project.description, 90)) : "—";
    const stack = escapeCell(stackOf(project)) || "—";
    return `| **[${escapeCell(project.name)}](${project.url})** | ${description} | ${stack} | ${project.stars} | ${links} |`;
  });

  return ["| Project | Description | Stack | ★ | Links |", "| :-- | :-- | :-- | --: | :-- |", ...rows].join("\n");
};

export const renderStats = (data, config) => {
  const s = data.summary;
  const alt = (title) => `${title} for ${config.username}`;
  const overview = `GitHub overview: ${s.repositories ?? "n/a"} repositories, ${s.stars ?? "n/a"} stars, ${s.followers ?? "n/a"} followers`;
  return `<p align="center">
${picture({ dark: "assets/stats-dark.svg", light: "assets/stats-light.svg", alt: overview, width: "49%" })}
${picture({ dark: "assets/languages-dark.svg", light: "assets/languages-light.svg", alt: alt("Top languages"), width: "49%" })}
</p>

<p align="center">
${picture({ dark: "assets/activity-dark.svg", light: "assets/activity-light.svg", alt: alt("Contribution activity"), width: "100%" })}
</p>`;
};

export const renderSnake = (config) => {
  if (!config.snake) return "";
  const base = `https://raw.githubusercontent.com/${config.username}/${config.username}/output`;
  return `<p align="center">
${picture({ dark: `${base}/snake-dark.svg`, light: `${base}/snake.svg`, alt: "Contribution snake animation", width: "100%" })}
</p>`;
};

export const renderActivity = (events, config) => {
  if (events.length === 0) return "_Recent public activity will show up here._";
  return events
    .map((event) => {
      const [owner] = event.repo.split("/");
      const name = owner.toLowerCase() === config.username.toLowerCase() ? event.repo.split("/")[1] : event.repo;
      return `- ${event.icon} ${event.verb} [${name}](https://github.com/${event.repo}) · \`${event.date}\``;
    })
    .join("\n");
};

export const renderJourney = (config) => {
  const rows = config.journey.map((entry) => `| **${escapeCell(entry.year)}** | ${escapeCell(entry.text)} |`);
  return `<details>
<summary><b>Journey</b></summary>

<br>

| Year | Milestone |
| :-- | :-- |
${rows.join("\n")}

</details>`;
};

export const renderConnect = (config) => {
  const items = [
    { label: "Email", url: `mailto:${config.email}`, color: "D14836", logo: "gmail" },
    ...config.socials,
  ];
  const links = items
    .map(
      (item) =>
        `<a href="${item.url}"><img alt="${escapeXml(item.label)}" src="${badge({ label: item.label, color: item.color, logo: item.logo, logoColor: item.logoColor })}"></a>`,
    )
    .join("\n  ");
  return `<p align="center">${escapeXml(config.cta)}</p>

<p align="center">
  ${links}
</p>`;
};

export const renderFooter = (config) => {
  const user = config.username;
  return `<p align="center">
  <sub>Rebuilt automatically every 6 hours by GitHub Actions · <a href="docs/AUTOMATION.md">how it works</a></sub>
  <br>
  <img alt="Last update" src="https://img.shields.io/github/last-commit/${user}/${user}?style=flat-square&label=updated&color=0d47a1">
</p>`;
};

export const fillTemplate = (template, values) => {
  const used = [...template.matchAll(/\{\{(\w+)\}\}/g)].map((match) => match[1]);
  const missing = used.filter((key) => !(key in values));
  if (missing.length > 0) throw new Error(`Template uses unknown tokens: ${[...new Set(missing)].join(", ")}`);
  return template.replace(/\{\{(\w+)\}\}/g, (_, key) => values[key]);
};

export const buildValues = ({ config, data }) => ({
  header: renderHeader(config),
  highlights: renderHighlights(config),
  about: renderAbout(config),
  stack: renderStack(config),
  projects: renderProjects(data.projects),
  username: config.username,
  stats: renderStats(data, config),
  snake: renderSnake(config),
  activity: renderActivity(data.events, config),
  journey: renderJourney(config),
  connect: renderConnect(config),
  footer: renderFooter(config),
});
