import { access, mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { attempt, mapLimit } from "./lib/async.mjs";
import { loadConfig } from "./lib/config.mjs";
import { summarizeEvents } from "./lib/events.mjs";
import {
  createClient,
  fetchCalendar,
  fetchEvents,
  fetchLanguages,
  fetchRepos,
  fetchUser,
} from "./lib/github.mjs";
import { fromFallback, selectProjects } from "./lib/projects.mjs";
import { TOKENS, buildValues, fillTemplate } from "./lib/render.mjs";
import { aggregateLanguages, fallbackLanguageBytes, summarizeProfile } from "./lib/stats.mjs";
import { renderCards } from "./lib/svg.mjs";

const defaultRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

const exists = (file) => access(file).then(
  () => true,
  () => false,
);

const writeIfChanged = async (file, content) => {
  const current = await readFile(file, "utf8").catch(() => null);
  if (current === content) return false;
  await mkdir(path.dirname(file), { recursive: true });
  await writeFile(file, content, "utf8");
  return true;
};

const collectOnline = async (config, client) => {
  const user = await fetchUser(client, config.username);
  const repos = await fetchRepos(client, config.username);

  const hiddenTopic = String(config.projects.excludeTopic ?? "").toLowerCase();
  const sample = repos
    .filter((repo) => !repo.fork && !repo.private)
    .filter((repo) => !(repo.topics ?? []).some((topic) => topic.toLowerCase() === hiddenTopic))
    .sort((a, b) => String(b.pushed_at).localeCompare(String(a.pushed_at)))
    .slice(0, config.languages.sampleRepos);

  const [languageMaps, events, calendar] = await Promise.all([
    mapLimit(sample, 5, (repo) =>
      attempt(`languages for ${repo.name}`, () => fetchLanguages(client, repo.full_name), fallbackLanguageBytes(repo)),
    ),
    attempt("public events", () => fetchEvents(client, config.username), []),
    attempt("contribution calendar", () => fetchCalendar(client, config.username), null),
  ]);

  return {
    summary: summarizeProfile(user, repos),
    projects: selectProjects(repos, config.projects, config.username),
    languages: aggregateLanguages(languageMaps, config.languages.top),
    events: summarizeEvents(events, { exclude: [`${config.username}/${config.username}`], max: config.activity.max }),
    calendar,
  };
};

const collectOffline = (config) => ({
  summary: summarizeProfile(null, []),
  projects: fromFallback(config.projects.fallback).slice(0, config.projects.max),
  languages: [],
  events: [],
  calendar: null,
});

export const run = async ({ root = defaultRoot, mode = "online", client, log = console.log } = {}) => {
  const config = await loadConfig(path.join(root, "config", "profile.json"));
  const template = await readFile(path.join(root, "templates", "README.template.md"), "utf8");

  if (mode === "check") {
    const dummy = Object.fromEntries(TOKENS.map((token) => [token, ""]));
    fillTemplate(template, dummy);
    log(`config ok · template ok · ${TOKENS.length} tokens`);
    return { changed: [] };
  }

  const resolvedClient =
    client ??
    createClient({ token: process.env.PROFILE_TOKEN || process.env.GITHUB_TOKEN || process.env.GH_TOKEN || "" });

  const data = mode === "offline" ? collectOffline(config) : await collectOnline(config, resolvedClient);

  const changed = [];
  const assetsDir = path.join(root, "assets");
  const cards = renderCards({ config, data });

  for (const [name, svg] of Object.entries(cards)) {
    const file = path.join(assetsDir, name);
    const protectedCard = !data.calendar && mode === "online" && /^(activity|stats)-/.test(name);
    if (protectedCard && (await exists(file))) continue;
    if (await writeIfChanged(file, svg)) changed.push(`assets/${name}`);
  }

  const readme = fillTemplate(template, buildValues({ config, data }));
  if (await writeIfChanged(path.join(root, "README.md"), readme)) changed.push("README.md");

  log(
    `${mode} build · ${data.projects.length} projects · ${data.languages.length} languages · ${data.events.length} events · calendar ${data.calendar ? "ok" : "missing"}`,
  );
  log(changed.length ? `updated: ${changed.join(", ")}` : "no changes");
  return { changed, data };
};

const entry = process.argv[1] ? pathToFileURL(path.resolve(process.argv[1])).href : "";

if (import.meta.url === entry) {
  const flags = new Set(process.argv.slice(2));
  const mode = flags.has("--check") ? "check" : flags.has("--offline") ? "offline" : "online";

  run({ mode }).catch((error) => {
    console.error(error instanceof Error ? error.message : error);
    if (flags.has("--soft")) {
      console.error("soft mode: keeping the existing profile");
      process.exit(0);
    }
    process.exit(1);
  });
}
