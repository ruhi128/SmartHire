// A notification response can be surfaced both by Expo's response listener and
// getLastNotificationResponseAsync while the app restores authentication. Keep
// recent response identifiers only long enough to coalesce that duplicate work,
// with hard time/count bounds so a long-lived session cannot retain every tap.

export const PUSH_TAP_DEDUPLICATION_MAX_ENTRIES = 64;
export const PUSH_TAP_DEDUPLICATION_TTL_MS = 5 * 60 * 1000;

function positiveWholeNumber(value, fallback) {
  const number = Math.floor(Number(value));
  return Number.isFinite(number) && number > 0 ? number : fallback;
}

function keyFrom(value) {
  return typeof value === 'string' ? value.trim() : '';
}

/**
 * Creates a small in-memory LRU/TTL response-key deduper. `remember()` returns
 * true only for a key that has not been seen in the active bounded window.
 * This deliberately does not persist across launches: the authoritative read
 * state remains in the authenticated server inbox, not device storage.
 */
export function createPushTapDeduper({
  maxEntries = PUSH_TAP_DEDUPLICATION_MAX_ENTRIES,
  ttlMs = PUSH_TAP_DEDUPLICATION_TTL_MS,
  now = () => Date.now(),
} = {}) {
  const safeMaxEntries = positiveWholeNumber(maxEntries, PUSH_TAP_DEDUPLICATION_MAX_ENTRIES);
  const safeTtlMs = positiveWholeNumber(ttlMs, PUSH_TAP_DEDUPLICATION_TTL_MS);
  const entries = new Map();

  function prune(at) {
    for (const [key, seenAt] of entries) {
      if (at - seenAt >= safeTtlMs) entries.delete(key);
    }
    while (entries.size > safeMaxEntries) {
      const oldestKey = entries.keys().next().value;
      if (oldestKey === undefined) break;
      entries.delete(oldestKey);
    }
  }

  return {
    remember(value, timestamp = now()) {
      const key = keyFrom(value);
      if (!key) return false;
      const at = Number.isFinite(Number(timestamp)) ? Number(timestamp) : now();
      prune(at);
      if (entries.has(key)) {
        // Treat a repeated native callback as recent while refreshing its LRU
        // position; it still must not mark/read/navigate a second time.
        entries.delete(key);
        entries.set(key, at);
        return false;
      }
      entries.set(key, at);
      prune(at);
      return true;
    },

    forget(value) {
      const key = keyFrom(value);
      if (key) entries.delete(key);
    },

    clear() {
      entries.clear();
    },

    size(timestamp = now()) {
      const at = Number.isFinite(Number(timestamp)) ? Number(timestamp) : now();
      prune(at);
      return entries.size;
    },
  };
}
