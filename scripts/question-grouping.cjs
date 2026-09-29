function entryText(entry) {
  const content = String(entry?.content || "").trim();
  const partialContent = String(entry?.partialContent || "").trim();
  if (!content) return partialContent;
  if (!partialContent || partialContent === content) return content;
  return `${content} ${partialContent}`;
}

function entryTime(entry, fallback) {
  const value = new Date(entry?.createdAt).getTime();
  return Number.isFinite(value) ? value : fallback;
}

function collectQuestionTranscriptEntries(
  savedEntries = [],
  pendingEntries = [],
  { after, boundaryAt } = {},
) {
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
  const afterMs = entryTime({ createdAt: after }, Number.NEGATIVE_INFINITY);
  const boundaryMs = entryTime({ createdAt: boundaryAt }, Number.POSITIVE_INFINITY);
  const entriesWithinClickBoundary = entries.filter(entry =>
    entry.createdAtMs > afterMs && entry.createdAtMs <= boundaryMs,
  );
  const questionSource = entriesWithinClickBoundary.at(-1)?.type;
  return entriesWithinClickBoundary
    .filter(entry => entry.type === questionSource)
    .map(({ createdAtMs, order: _order, ...entry }) => entry);
}

module.exports = { collectQuestionTranscriptEntries };
