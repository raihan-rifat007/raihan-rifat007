const API = "https://api.github.com";
const TIMEOUT_MS = 20000;

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

export class GitHubError extends Error {
  constructor(message, status) {
    super(message);
    this.name = "GitHubError";
    this.status = status;
  }
}

export const createClient = ({ token = "", fetchImpl = globalThis.fetch, retries = 3, backoff = 500 } = {}) => {
  const baseHeaders = {
    Accept: "application/vnd.github+json",
    "X-GitHub-Api-Version": "2022-11-28",
    "User-Agent": "profile-readme-builder",
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };

  const send = async (url, init = {}) => {
    let lastError = new GitHubError(`No response for ${url}`, 0);

    for (let tryNumber = 0; tryNumber <= retries; tryNumber += 1) {
      try {
        const response = await fetchImpl(url, {
          ...init,
          headers: { ...baseHeaders, ...init.headers },
          signal: AbortSignal.timeout(TIMEOUT_MS),
        });
        if (response.ok) return response;
        lastError = new GitHubError(`${response.status} ${response.statusText} for ${url}`, response.status);
        if (response.status < 500) throw lastError;
      } catch (error) {
        if (error instanceof GitHubError && error.status > 0 && error.status < 500) throw error;
        lastError = error;
      }
      if (tryNumber < retries) await sleep(backoff * 2 ** tryNumber);
    }

    throw lastError;
  };

  const rest = async (path) => (await send(`${API}${path}`)).json();

  const paginate = async (path, limit = 5) => {
    const joiner = path.includes("?") ? "&" : "?";
    const items = [];
    for (let page = 1; page <= limit; page += 1) {
      const batch = await rest(`${path}${joiner}per_page=100&page=${page}`);
      if (!Array.isArray(batch)) break;
      items.push(...batch);
      if (batch.length < 100) break;
    }
    return items;
  };

  const graphql = async (query, variables) => {
    const response = await send(`${API}/graphql`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ query, variables }),
    });
    const payload = await response.json();
    if (payload.errors?.length) {
      throw new GitHubError(payload.errors.map((entry) => entry.message).join("; "), 200);
    }
    return payload.data;
  };

  return { rest, paginate, graphql };
};

const CALENDAR_QUERY = `
query($login: String!) {
  user(login: $login) {
    contributionsCollection {
      totalCommitContributions
      totalPullRequestContributions
      totalIssueContributions
      totalPullRequestReviewContributions
      contributionCalendar {
        totalContributions
        weeks {
          contributionDays {
            date
            contributionCount
          }
        }
      }
    }
  }
}`;

export const fetchUser = (client, username) => client.rest(`/users/${encodeURIComponent(username)}`);

export const fetchRepos = (client, username) =>
  client.paginate(`/users/${encodeURIComponent(username)}/repos?type=owner&sort=pushed`);

export const fetchLanguages = (client, fullName) => client.rest(`/repos/${fullName}/languages`);

export const fetchEvents = (client, username) =>
  client.paginate(`/users/${encodeURIComponent(username)}/events/public`, 2);

export const fetchCalendar = async (client, username) => {
  const data = await client.graphql(CALENDAR_QUERY, { login: username });
  const collection = data?.user?.contributionsCollection;
  if (!collection) throw new GitHubError("Contribution data is unavailable for this user", 200);

  const days = collection.contributionCalendar.weeks.flatMap((week) =>
    week.contributionDays.map((entry) => ({ date: entry.date, count: entry.contributionCount })),
  );

  return {
    total: collection.contributionCalendar.totalContributions,
    commits: collection.totalCommitContributions,
    pullRequests: collection.totalPullRequestContributions,
    issues: collection.totalIssueContributions,
    reviews: collection.totalPullRequestReviewContributions,
    days,
  };
};
