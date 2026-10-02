export const mapLimit = async (items, limit, task) => {
  const results = new Array(items.length);
  let cursor = 0;

  const worker = async () => {
    for (;;) {
      const index = cursor;
      cursor += 1;
      if (index >= items.length) return;
      results[index] = await task(items[index], index);
    }
  };

  await Promise.all(Array.from({ length: Math.min(limit, items.length) }, worker));
  return results;
};

export const attempt = async (label, task, fallback) => {
  try {
    return await task();
  } catch (error) {
    const message = `${label}: ${error instanceof Error ? error.message : String(error)}`;
    if (process.env.GITHUB_ACTIONS) console.log(`::warning::${message}`);
    else console.warn(`[warn] ${message}`);
    return fallback;
  }
};
