import assert from "node:assert/strict";
import test from "node:test";
import { normalizeHomepage, selectProjects, stackOf } from "../scripts/lib/projects.mjs";
import { repo } from "./helpers.mjs";

const settings = {
  max: 4,
  pin: ["alpha", "beta"],
  exclude: ["ignored"],
  featuredTopic: "featured",
  excludeTopic: "no-showcase",
  includeForks: false,
  includeArchived: false,
};

test("selectProjects filters forks, archived, private, excluded and hidden repositories", () => {
  const repos = [
    repo("kept"),
    repo("forked", { fork: true }),
    repo("old", { archived: true }),
    repo("secret", { private: true }),
    repo("ignored"),
    repo("hidden", { topics: ["no-showcase"] }),
    repo("raihan-rifat007"),
  ];
  const names = selectProjects(repos, settings, "raihan-rifat007").map((project) => project.name);
  assert.deepEqual(names, ["kept"]);
});

test("selectProjects orders pinned first, then featured topic, then stars", () => {
  const repos = [
    repo("popular", { stargazers_count: 99 }),
    repo("beta"),
    repo("starred", { stargazers_count: 5, topics: ["featured"] }),
    repo("alpha"),
  ];
  const names = selectProjects(repos, settings, "x").map((project) => project.name);
  assert.deepEqual(names, ["alpha", "beta", "starred", "popular"]);
});

test("selectProjects respects max and breaks ties by recency", () => {
  const repos = [
    repo("a", { pushed_at: "2026-01-01T00:00:00Z" }),
    repo("b", { pushed_at: "2026-03-01T00:00:00Z" }),
    repo("c", { pushed_at: "2026-02-01T00:00:00Z" }),
  ];
  const names = selectProjects(repos, { ...settings, pin: [], max: 2 }, "x").map((project) => project.name);
  assert.deepEqual(names, ["b", "c"]);
});

test("selectProjects can include forks and archived when enabled", () => {
  const repos = [repo("forked", { fork: true }), repo("old", { archived: true })];
  const result = selectProjects(repos, { ...settings, includeForks: true, includeArchived: true }, "x");
  assert.equal(result.length, 2);
});

test("selectProjects hides reserved topics from the stack", () => {
  const [project] = selectProjects([repo("tagged", { topics: ["featured", "react", "vite", "x", "y"] })], settings, "z");
  assert.deepEqual(project.topics, ["react", "vite", "x"]);
  assert.equal(stackOf(project), "JavaScript • react • vite • x");
});

test("normalizeHomepage adds a protocol and ignores blanks", () => {
  assert.equal(normalizeHomepage("example.com"), "https://example.com");
  assert.equal(normalizeHomepage("http://a.dev"), "http://a.dev");
  assert.equal(normalizeHomepage("  "), "");
  assert.equal(normalizeHomepage(null), "");
});
