import assert from "node:assert/strict";
import test from "node:test";
import { renderActivityCard, renderCards, renderHeader, renderLanguagesCard, renderStatsCard } from "../scripts/lib/svg.mjs";
import { buildDays } from "./helpers.mjs";

const summary = { repositories: 12, stars: 1500, forks: 3, followers: 40 };
const calendar = { total: 90, pullRequests: 4, commits: 80, issues: 1, reviews: 0, days: buildDays(new Array(90).fill(1), "2026-07-01") };

const assertSvg = (svg) => {
  assert.ok(svg.startsWith("<svg"));
  assert.ok(svg.trimEnd().endsWith("</svg>"));
  assert.equal(svg.split("<svg").length, 2);
  assert.doesNotMatch(svg, /undefined|NaN|\[object/);
};

test("stats card shows compact numbers and dashes for missing data", () => {
  const filled = renderStatsCard({ summary, calendar, username: "u", theme: "dark" });
  assertSvg(filled);
  assert.match(filled, />1\.5K</);
  const empty = renderStatsCard({ summary: { repositories: null, stars: null, forks: null, followers: null }, calendar: null, username: "u", theme: "light" });
  assertSvg(empty);
  assert.match(empty, />—</);
});

test("languages card renders a legend or an empty state", () => {
  const languages = [
    { name: "TypeScript", percent: 70, color: "#3178c6" },
    { name: "C++", percent: 30, color: "#f34b7d" },
  ];
  const svg = renderLanguagesCard({ languages, username: "u", theme: "dark" });
  assertSvg(svg);
  assert.match(svg, /TypeScript/);
  assert.match(svg, /70\.0%/);
  assert.match(renderLanguagesCard({ languages: [], username: "u", theme: "dark" }), /first automated run/);
});

test("activity card handles missing calendars", () => {
  assertSvg(renderActivityCard({ calendar, username: "u", theme: "light" }));
  assert.match(renderActivityCard({ calendar: null, username: "u", theme: "dark" }), /first automated run/);
});

test("header escapes text and animates only with several roles", () => {
  const multi = renderHeader({ name: "A & B", roles: ["One", "Two", "Three"], tagline: "<tag>", accent: "#0d47a1" });
  assertSvg(multi);
  assert.match(multi, /A &amp; B/);
  assert.match(multi, /&lt;tag&gt;/);
  assert.equal((multi.match(/attributeName="opacity"/g) ?? []).length, 3);
  const single = renderHeader({ name: "A", roles: ["Only"], tagline: "t", accent: "#0d47a1" });
  assert.equal((single.match(/attributeName="opacity"/g) ?? []).length, 0);
});

test("renderCards produces the full file set", () => {
  const files = renderCards({
    config: { username: "u", name: "N", roles: ["R1", "R2"], tagline: "t", accent: "#0d47a1" },
    data: { summary, calendar, languages: [] },
  });
  assert.deepEqual(Object.keys(files).sort(), [
    "activity-dark.svg",
    "activity-light.svg",
    "header.svg",
    "languages-dark.svg",
    "languages-light.svg",
    "stats-dark.svg",
    "stats-light.svg",
  ]);
});
