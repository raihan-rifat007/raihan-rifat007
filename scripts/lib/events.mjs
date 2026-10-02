import { day } from "./format.mjs";

const describe = (event) => {
  const payload = event.payload ?? {};
  switch (event.type) {
    case "PushEvent": {
      const count = payload.size ?? payload.commits?.length ?? 1;
      return { icon: "🔨", verb: `Pushed ${count} commit${count === 1 ? "" : "s"} to`, weight: count };
    }
    case "PullRequestEvent": {
      if (payload.action === "closed" && payload.pull_request?.merged) return { icon: "🔀", verb: "Merged a pull request in" };
      if (payload.action === "opened") return { icon: "📬", verb: "Opened a pull request in" };
      return null;
    }
    case "IssuesEvent":
      return payload.action === "opened" ? { icon: "🐛", verb: "Opened an issue in" } : null;
    case "CreateEvent":
      return payload.ref_type === "repository" ? { icon: "✨", verb: "Created repository" } : null;
    case "ReleaseEvent":
      return payload.action === "published" ? { icon: "🚀", verb: "Published a release in" } : null;
    case "ForkEvent":
      return { icon: "🍴", verb: "Forked" };
    case "WatchEvent":
      return { icon: "⭐", verb: "Starred" };
    default:
      return null;
  }
};

export const summarizeEvents = (events, { exclude = [], max = 6 } = {}) => {
  const skip = new Set(exclude.map((name) => name.toLowerCase()));
  const merged = [];

  for (const event of events) {
    const meta = describe(event);
    if (!meta || !event.repo?.name) continue;
    if (skip.has(event.repo.name.toLowerCase())) continue;

    const date = day(event.created_at);
    const previous = merged[merged.length - 1];

    if (event.type === "PushEvent" && previous && previous.type === "PushEvent" && previous.repo === event.repo.name && previous.date === date) {
      previous.count += meta.weight;
      previous.verb = `Pushed ${previous.count} commit${previous.count === 1 ? "" : "s"} to`;
      continue;
    }

    merged.push({
      type: event.type,
      icon: meta.icon,
      verb: meta.verb,
      repo: event.repo.name,
      date,
      count: meta.weight ?? 1,
    });
  }

  return merged.slice(0, max);
};
