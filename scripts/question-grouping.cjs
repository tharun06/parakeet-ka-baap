const QUESTION_FRAGMENT_GAP_MS = 10_000;

function entryText(entry) {
  return String(entry?.content || entry?.partialContent || "").trim();
}

function entryTime(entry, fallback) {
  const value = new Date(entry?.createdAt).getTime();
  return Number.isFinite(value) ? value : fallback;
}

function groupRecentTranscriptEntries(savedEntries = [], pendingEntries = []) {
  const merged = new Map();
  let order = 0;

  for (const entry of [...savedEntries, ...pendingEntries]) {
    const content = entryText(entry);
    if (!content) continue;

    const createdAtMs = entryTime(entry, order);
    const key = entry?.id || `${entry?.type || "unknown"}:${createdAtMs}:${content}`;
    merged.set(key, { ...entry, content, createdAtMs, order: order++ });
  }

  const entries = [...merged.values()].sort((left, right) =>
    left.createdAtMs - right.createdAtMs || left.order - right.order,
  );
  if (!entries.length) return [];

  const last = entries.at(-1);
  const grouped = [last];
  let laterTime = last.createdAtMs;

  for (let index = entries.length - 2; index >= 0; index -= 1) {
    const entry = entries[index];
    if (entry.type !== last.type) break;
    if (laterTime - entry.createdAtMs > QUESTION_FRAGMENT_GAP_MS) break;
    grouped.unshift(entry);
    laterTime = entry.createdAtMs;
  }

  return grouped.map(({ createdAtMs, order: _order, ...entry }) => entry);
}

module.exports = { QUESTION_FRAGMENT_GAP_MS, groupRecentTranscriptEntries };
