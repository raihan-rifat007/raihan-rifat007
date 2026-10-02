import { unique } from "./format.mjs";

const lower = (value) => String(value ?? "").toLowerCase();

export const normalizeHomepage = (value) => {
  const url = String(value ?? "").trim();
  if (!url) return "";
  return /^https?:\/\//i.test(url) ? url : `https://${url}`;
};

const toProject = (repo, reserved) => ({
  name: repo.name,
  description: repo.description ?? "",
  url: repo.html_url,
  homepage: normalizeHomepage(repo.homepage),
  language: repo.language ?? "",
  topics: (repo.topics ?? []).filter((topic) => !reserved.has(lower(topic))).slice(0, 3),
  stars: repo.stargazers_count ?? 0,
  forks: repo.forks_count ?? 0,
  pushedAt: repo.pushed_at ?? "",
});

export const selectProjects = (repos, settings, username) => {
  const exclude = new Set([...settings.exclude, username].map(lower));
  const pin = settings.pin.map(lower);
  const featured = lower(settings.featuredTopic);
  const hidden = lower(settings.excludeTopic);
  const reserved = new Set([featured, hidden]);

  const topicsOf = (repo) => (repo.topics ?? []).map(lower);

  const eligible = repos.filter(
    (repo) =>
      !repo.private &&
      !repo.disabled &&
      (settings.includeForks || !repo.fork) &&
      (settings.includeArchived || !repo.archived) &&
      !exclude.has(lower(repo.name)) &&
      !topicsOf(repo).includes(hidden),
  );

  const rank = (repo) => {
    const index = pin.indexOf(lower(repo.name));
    if (index !== -1) return index;
    return topicsOf(repo).includes(featured) ? pin.length : pin.length + 1;
  };

  eligible.sort(
    (a, b) =>
      rank(a) - rank(b) ||
      (b.stargazers_count ?? 0) - (a.stargazers_count ?? 0) ||
      String(b.pushed_at ?? "").localeCompare(String(a.pushed_at ?? "")),
  );

  return eligible.slice(0, settings.max).map((repo) => toProject(repo, reserved));
};

export const stackOf = (project) => unique([project.language, ...project.topics]).join(" • ");

export const fromFallback = (entries) =>
  entries.map((entry) => ({
    name: entry.name,
    description: entry.description ?? "",
    url: entry.url,
    homepage: normalizeHomepage(entry.homepage),
    language: entry.language ?? "",
    topics: entry.topics ?? [],
    stars: entry.stars ?? 0,
    forks: 0,
    pushedAt: "",
  }));
