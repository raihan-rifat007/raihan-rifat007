import { cp, mkdtemp } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

export const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

export const makeSandbox = async () => {
  const root = await mkdtemp(path.join(os.tmpdir(), "profile-"));
  await cp(path.join(projectRoot, "config"), path.join(root, "config"), { recursive: true });
  await cp(path.join(projectRoot, "templates"), path.join(root, "templates"), { recursive: true });
  return root;
};

export const json = (data, status = 200) =>
  new Response(JSON.stringify(data), { status, headers: { "content-type": "application/json" } });

export const repo = (name, extra = {}) => ({
  name,
  full_name: `raihan-rifat007/${name}`,
  html_url: `https://github.com/raihan-rifat007/${name}`,
  description: `${name} description`,
  homepage: "",
  language: "JavaScript",
  topics: [],
  stargazers_count: 0,
  forks_count: 0,
  fork: false,
  archived: false,
  private: false,
  disabled: false,
  size: 100,
  pushed_at: "2026-09-20T10:00:00Z",
  ...extra,
});

export const buildDays = (counts, start = "2026-01-01") => {
  const base = Date.parse(`${start}T00:00:00Z`);
  return counts.map((count, index) => ({
    date: new Date(base + index * 86400000).toISOString().slice(0, 10),
    count,
  }));
};
