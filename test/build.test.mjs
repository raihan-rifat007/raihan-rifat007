import assert from "node:assert/strict";
import { readFile, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import test from "node:test";
import { run } from "../scripts/build.mjs";
import { createClient } from "../scripts/lib/github.mjs";
import { buildDays, json, makeSandbox, repo } from "./helpers.mjs";

const repos = [
  repo("alpha", { stargazers_count: 4, language: "TypeScript", homepage: "alpha.dev" }),
  repo("beta", { stargazers_count: 1 }),
  repo("hidden", { topics: ["no-showcase"], language: "Rust" }),
];

const days = buildDays(new Array(120).fill(2), "2026-06-01");

const makeFetch = ({ calendar = true, calls = [] } = {}) => async (url, init = {}) => {
  const target = new URL(String(url));
  calls.push(target.pathname);
  if (target.pathname === "/graphql") {
    if (!calendar) return json({ errors: [{ message: "denied" }] });
    return json({
      data: {
        user: {
          contributionsCollection: {
            totalCommitContributions: 200,
            totalPullRequestContributions: 5,
            totalIssueContributions: 1,
            totalPullRequestReviewContributions: 0,
            contributionCalendar: {
              totalContributions: 240,
              weeks: [{ contributionDays: days.map((entry) => ({ date: entry.date, contributionCount: entry.count })) }],
            },
          },
        },
      },
    });
  }
  if (target.pathname === "/users/raihan-rifat007") return json({ public_repos: 3, followers: 9, following: 1 });
  if (target.pathname === "/users/raihan-rifat007/repos") return json(target.searchParams.get("page") === "1" ? repos : []);
  if (target.pathname === "/users/raihan-rifat007/events/public") return json([]);
  if (target.pathname.endsWith("/languages")) return json({ TypeScript: 900, CSS: 100 });
  return json({ message: "missing" }, 404);
};

test("offline mode renders placeholders from the fallback projects", async () => {
  const root = await makeSandbox();
  const logs = [];
  const { changed } = await run({ root, mode: "offline", log: (line) => logs.push(line) });
  assert.ok(changed.includes("README.md"));
  const readme = await readFile(path.join(root, "README.md"), "utf8");
  assert.match(readme, /YouTube-API/);
  assert.match(readme, /Recent public activity/);
  const card = await readFile(path.join(root, "assets", "activity-dark.svg"), "utf8");
  assert.match(card, /first automated run/);
  await rm(root, { recursive: true, force: true });
});

test("online mode builds from API data, hides excluded repos and is idempotent", async () => {
  const root = await makeSandbox();
  const client = createClient({ fetchImpl: makeFetch(), retries: 0 });
  const first = await run({ root, mode: "online", client, log: () => undefined });
  assert.ok(first.changed.includes("README.md"));
  assert.equal(first.data.projects.some((project) => project.name === "hidden"), false);
  assert.equal(first.data.languages.some((language) => language.name === "Rust"), false);

  const readme = await readFile(path.join(root, "README.md"), "utf8");
  assert.match(readme, /\[alpha\]\(https:\/\/github.com\/raihan-rifat007\/alpha\)/);
  assert.match(readme, /https:\/\/alpha\.dev/);

  const second = await run({ root, mode: "online", client: createClient({ fetchImpl: makeFetch(), retries: 0 }), log: () => undefined });
  assert.deepEqual(second.changed, []);
  await rm(root, { recursive: true, force: true });
});

test("a missing contribution calendar keeps previously generated cards", async () => {
  const root = await makeSandbox();
  await run({ root, mode: "online", client: createClient({ fetchImpl: makeFetch(), retries: 0 }), log: () => undefined });
  const before = await readFile(path.join(root, "assets", "activity-dark.svg"), "utf8");

  const degraded = await run({
    root,
    mode: "online",
    client: createClient({ fetchImpl: makeFetch({ calendar: false }), retries: 0 }),
    log: () => undefined,
  });
  const after = await readFile(path.join(root, "assets", "activity-dark.svg"), "utf8");
  assert.equal(after, before);
  assert.equal(degraded.changed.includes("assets/activity-dark.svg"), false);
  await rm(root, { recursive: true, force: true });
});

test("an unreachable user endpoint fails the build", async () => {
  const root = await makeSandbox();
  const failing = createClient({ fetchImpl: async () => json({ message: "nope" }, 404), retries: 0 });
  await assert.rejects(run({ root, mode: "online", client: failing, log: () => undefined }), /404/);
  await rm(root, { recursive: true, force: true });
});

test("check mode validates without writing", async () => {
  const root = await makeSandbox();
  const { changed } = await run({ root, mode: "check", log: () => undefined });
  assert.deepEqual(changed, []);
  await writeFile(path.join(root, "templates", "README.template.md"), "{{nonsense}}", "utf8");
  await assert.rejects(run({ root, mode: "check", log: () => undefined }), /unknown tokens/);
  await rm(root, { recursive: true, force: true });
});

test("the github client retries server errors and gives up on client errors", async () => {
  let attempts = 0;
  const flaky = createClient({
    retries: 2,
    backoff: 1,
    fetchImpl: async () => {
      attempts += 1;
      return attempts < 3 ? json({}, 502) : json({ ok: true });
    },
  });
  assert.deepEqual(await flaky.rest("/x"), { ok: true });
  assert.equal(attempts, 3);

  let hits = 0;
  const strict = createClient({ retries: 3, backoff: 1, fetchImpl: async () => { hits += 1; return json({}, 403); } });
  await assert.rejects(strict.rest("/x"), /403/);
  assert.equal(hits, 1);
});
