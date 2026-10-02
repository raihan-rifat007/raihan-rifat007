import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import path from "node:path";
import test from "node:test";
import { loadConfig, validateConfig } from "../scripts/lib/config.mjs";
import { TOKENS, buildValues, fillTemplate, renderActivity, renderProjects, renderSnake } from "../scripts/lib/render.mjs";
import { projectRoot } from "./helpers.mjs";

const loadFixture = async () => loadConfig(path.join(projectRoot, "config", "profile.json"));

test("fillTemplate replaces every token", () => {
  assert.equal(fillTemplate("a {{x}} b {{y}}", { x: "1", y: "2" }), "a 1 b 2");
});

test("fillTemplate throws on unknown tokens", () => {
  assert.throws(() => fillTemplate("{{missing}}", { x: "1" }), /unknown tokens: missing/);
});

test("the shipped template only uses known tokens", async () => {
  const template = await readFile(path.join(projectRoot, "templates", "README.template.md"), "utf8");
  const dummy = Object.fromEntries(TOKENS.map((token) => [token, ""]));
  assert.doesNotThrow(() => fillTemplate(template, dummy));
});

test("renderProjects escapes pipes, truncates and shows a placeholder when empty", () => {
  const project = {
    name: "demo",
    description: `a | b ${"x".repeat(200)}`,
    url: "https://github.com/u/demo",
    homepage: "",
    language: "Go",
    topics: ["cli"],
    stars: 3,
  };
  const table = renderProjects([project]);
  assert.match(table, /a \\\| b/);
  assert.match(table, /…/);
  assert.doesNotMatch(table, /Live/);
  assert.match(renderProjects([]), /first automated run/);
});

test("renderProjects adds a live badge when a homepage exists", () => {
  const table = renderProjects([{ name: "d", description: "", url: "https://g/d", homepage: "https://d.dev", language: "", topics: [], stars: 0 }]);
  assert.match(table, /\[!\[Live\]/);
  assert.match(table, /\| — \| — \|/);
});

test("renderActivity links to repositories and shortens own ones", async () => {
  const config = await loadFixture();
  const markdown = renderActivity(
    [
      { icon: "🔨", verb: "Pushed 2 commits to", repo: "raihan-rifat007/app", date: "2026-10-01" },
      { icon: "⭐", verb: "Starred", repo: "vercel/next.js", date: "2026-09-30" },
    ],
    config,
  );
  assert.match(markdown, /\[app\]\(https:\/\/github.com\/raihan-rifat007\/app\)/);
  assert.match(markdown, /\[vercel\/next.js\]/);
  assert.match(renderActivity([], config), /Recent public activity/);
});

test("renderSnake is empty when disabled", async () => {
  const config = await loadFixture();
  assert.equal(renderSnake({ ...config, snake: false }), "");
  assert.match(renderSnake(config), /output\/snake-dark\.svg/);
});

test("buildValues provides every template token", async () => {
  const config = await loadFixture();
  const data = { summary: { repositories: 1, stars: 2, forks: 0, followers: 3 }, projects: [], languages: [], events: [], calendar: null };
  const values = buildValues({ config, data });
  for (const token of TOKENS) assert.ok(token in values, token);
});

test("validateConfig reports problems clearly", async () => {
  const config = await loadFixture();
  assert.deepEqual(validateConfig(config), []);
  const broken = { ...config, accent: "blue", email: "nope", roles: [], projects: { ...config.projects, max: 0 } };
  const errors = validateConfig(broken);
  assert.ok(errors.some((message) => message.includes("accent")));
  assert.ok(errors.some((message) => message.includes("email")));
  assert.ok(errors.some((message) => message.includes("roles")));
  assert.ok(errors.some((message) => message.includes("projects.max")));
});
