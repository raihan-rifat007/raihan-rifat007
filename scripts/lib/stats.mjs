import { languageColor } from "./colors.mjs";

const EMPTY_SUMMARY = {
  repositories: null,
  stars: null,
  forks: null,
  followers: null,
  following: null,
};

export const summarizeProfile = (user, repos) => {
  if (!user) return { ...EMPTY_SUMMARY };
  const owned = (repos ?? []).filter((repo) => !repo.fork);
  const sum = (key) => owned.reduce((total, repo) => total + (repo[key] ?? 0), 0);
  return {
    repositories: user.public_repos ?? owned.length,
    stars: sum("stargazers_count"),
    forks: sum("forks_count"),
    followers: user.followers ?? null,
    following: user.following ?? null,
  };
};

export const computeStreaks = (days) => {
  const sorted = [...days].sort((a, b) => a.date.localeCompare(b.date));
  let total = 0;
  let longest = 0;
  let run = 0;

  for (const entry of sorted) {
    total += entry.count;
    if (entry.count > 0) {
      run += 1;
      if (run > longest) longest = run;
    } else {
      run = 0;
    }
  }

  let current = 0;
  for (let index = sorted.length - 1; index >= 0; index -= 1) {
    if (sorted[index].count > 0) current += 1;
    else if (index === sorted.length - 1) continue;
    else break;
  }

  return { total, current, longest };
};

const monthKey = (year, monthIndex) => `${year}-${String(monthIndex + 1).padStart(2, "0")}`;

export const monthlyTotals = (days, months = 12) => {
  if (days.length === 0) return [];
  const sorted = [...days].sort((a, b) => a.date.localeCompare(b.date));
  const last = sorted[sorted.length - 1].date;
  let year = Number(last.slice(0, 4));
  let month = Number(last.slice(5, 7)) - 1;

  const keys = [];
  for (let index = 0; index < months; index += 1) {
    keys.unshift({ year, month, key: monthKey(year, month) });
    month -= 1;
    if (month < 0) {
      month = 11;
      year -= 1;
    }
  }

  const totals = new Map();
  for (const entry of sorted) {
    const key = entry.date.slice(0, 7);
    totals.set(key, (totals.get(key) ?? 0) + entry.count);
  }

  return keys.map(({ year: y, month: m, key }) => ({
    key,
    label: new Date(Date.UTC(y, m, 1)).toLocaleString("en", { month: "short", timeZone: "UTC" }),
    total: totals.get(key) ?? 0,
  }));
};

export const aggregateLanguages = (byteMaps, top = 5) => {
  const totals = new Map();
  for (const map of byteMaps) {
    for (const [name, bytes] of Object.entries(map ?? {})) {
      totals.set(name, (totals.get(name) ?? 0) + bytes);
    }
  }

  const ranked = [...totals.entries()].sort((a, b) => b[1] - a[1]);
  const grand = ranked.reduce((sum, [, bytes]) => sum + bytes, 0);
  if (grand === 0) return [];

  const head = ranked.slice(0, top);
  const restBytes = ranked.slice(top).reduce((sum, [, bytes]) => sum + bytes, 0);
  if (restBytes > 0) head.push(["Other", restBytes]);

  return head.map(([name, bytes]) => ({
    name,
    bytes,
    percent: Math.round((bytes / grand) * 1000) / 10,
    color: languageColor(name),
  }));
};

export const fallbackLanguageBytes = (repo) =>
  repo.language ? { [repo.language]: Math.max(1, (repo.size ?? 1) * 1024) } : {};
