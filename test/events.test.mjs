import assert from "node:assert/strict";
import test from "node:test";
import { summarizeEvents } from "../scripts/lib/events.mjs";

const push = (repo, size, created) => ({ type: "PushEvent", repo: { name: repo }, payload: { size }, created_at: created });

test("summarizeEvents merges consecutive pushes to one repository on the same day", () => {
  const result = summarizeEvents([push("a/b", 2, "2026-10-01T10:00:00Z"), push("a/b", 3, "2026-10-01T02:00:00Z")]);
  assert.equal(result.length, 1);
  assert.equal(result[0].verb, "Pushed 5 commits to");
  assert.equal(result[0].date, "2026-10-01");
});

test("summarizeEvents keeps pushes from different days apart", () => {
  const result = summarizeEvents([push("a/b", 1, "2026-10-02T10:00:00Z"), push("a/b", 1, "2026-10-01T10:00:00Z")]);
  assert.equal(result.length, 2);
  assert.equal(result[0].verb, "Pushed 1 commit to");
});

test("summarizeEvents drops excluded repositories and unknown events", () => {
  const events = [
    push("me/me", 1, "2026-10-01T10:00:00Z"),
    { type: "GollumEvent", repo: { name: "a/b" }, payload: {}, created_at: "2026-10-01T10:00:00Z" },
    { type: "PullRequestEvent", repo: { name: "a/b" }, payload: { action: "labeled" }, created_at: "2026-10-01T10:00:00Z" },
    { type: "WatchEvent", repo: { name: "a/b" }, payload: {}, created_at: "2026-10-01T10:00:00Z" },
  ];
  const result = summarizeEvents(events, { exclude: ["Me/Me"] });
  assert.deepEqual(result.map((entry) => entry.type), ["WatchEvent"]);
});

test("summarizeEvents describes merged pull requests and respects max", () => {
  const events = [
    { type: "PullRequestEvent", repo: { name: "a/b" }, payload: { action: "closed", pull_request: { merged: true } }, created_at: "2026-10-01T10:00:00Z" },
    { type: "WatchEvent", repo: { name: "c/d" }, payload: {}, created_at: "2026-09-30T10:00:00Z" },
    { type: "ForkEvent", repo: { name: "e/f" }, payload: {}, created_at: "2026-09-29T10:00:00Z" },
  ];
  const result = summarizeEvents(events, { max: 2 });
  assert.equal(result.length, 2);
  assert.equal(result[0].verb, "Merged a pull request in");
});
