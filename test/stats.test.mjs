import assert from "node:assert/strict";
import test from "node:test";
import { aggregateLanguages, computeStreaks, monthlyTotals, summarizeProfile } from "../scripts/lib/stats.mjs";
import { buildDays } from "./helpers.mjs";

test("computeStreaks counts the current streak through an empty today", () => {
  const days = buildDays([0, 2, 3, 0, 1, 1, 0]);
  assert.deepEqual(computeStreaks(days), { total: 7, current: 2, longest: 2 });
});

test("computeStreaks resets the current streak after a gap", () => {
  const days = buildDays([4, 4, 4, 0, 0, 1]);
  const result = computeStreaks(days);
  assert.equal(result.current, 1);
  assert.equal(result.longest, 3);
});

test("computeStreaks handles empty and all-zero input", () => {
  assert.deepEqual(computeStreaks([]), { total: 0, current: 0, longest: 0 });
  assert.deepEqual(computeStreaks(buildDays([0, 0, 0])), { total: 0, current: 0, longest: 0 });
});

test("computeStreaks sorts unordered days", () => {
  const days = buildDays([1, 1, 1]).reverse();
  assert.equal(computeStreaks(days).current, 3);
});

test("monthlyTotals returns twelve ascending months across a year boundary", () => {
  const days = buildDays(new Array(60).fill(1), "2026-01-01");
  const months = monthlyTotals(days, 12);
  assert.equal(months.length, 12);
  assert.equal(months[months.length - 1].key, "2026-03");
  assert.equal(months[0].key, "2025-04");
  assert.equal(months[months.length - 1].total, 60 - 31 - 28);
  assert.equal(months[0].total, 0);
});

test("monthlyTotals is empty without data", () => {
  assert.deepEqual(monthlyTotals([]), []);
});

test("aggregateLanguages groups the tail into Other and sums to roughly 100", () => {
  const maps = [
    { JavaScript: 600, TypeScript: 300 },
    { Python: 50, Shell: 20, CSS: 15, HTML: 10, Go: 5 },
  ];
  const result = aggregateLanguages(maps, 3);
  assert.deepEqual(
    result.map((entry) => entry.name),
    ["JavaScript", "TypeScript", "Python", "Other"],
  );
  const total = result.reduce((sum, entry) => sum + entry.percent, 0);
  assert.ok(Math.abs(total - 100) < 0.5);
  assert.equal(result[0].percent, 60);
});

test("aggregateLanguages returns nothing without bytes", () => {
  assert.deepEqual(aggregateLanguages([{}, null]), []);
});

test("summarizeProfile ignores forks and tolerates a missing user", () => {
  const repos = [
    { stargazers_count: 5, forks_count: 1, fork: false },
    { stargazers_count: 50, forks_count: 9, fork: true },
    { stargazers_count: 2, forks_count: 0, fork: false },
  ];
  const summary = summarizeProfile({ public_repos: 3, followers: 10, following: 4 }, repos);
  assert.deepEqual(summary, { repositories: 3, stars: 7, forks: 1, followers: 10, following: 4 });
  assert.equal(summarizeProfile(null, []).stars, null);
});
