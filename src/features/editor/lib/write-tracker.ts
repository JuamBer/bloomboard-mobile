/**
 * The editor's writes to one document, so a read can tell whether it may be
 * older than what the screen already holds.
 *
 * A workout under way is polled (every 8 s) while its cards autosave. A poll
 * sent just before a save and answered just after it carries the document as
 * it was before the save — and a card with nothing pending takes a server
 * copy in, so the values just typed (or ticked) flashed back to the old ones
 * until the next poll, and an edit made meanwhile was built on them. Seen on
 * the phone as "many changes at once and strange things happen".
 *
 * Every editor write goes through `trackWrite` (editor-source wraps the API);
 * a read started before a write settled is not trusted over the cache, whose
 * copy each write's own answer already updated (`readGuarded`).
 */
const inFlight = new Map<string, number>();
const settledAt = new Map<string, number>();

export function trackWrite<T>(docKey: string, write: Promise<T>): Promise<T> {
  inFlight.set(docKey, (inFlight.get(docKey) ?? 0) + 1);
  return write.finally(() => {
    inFlight.set(docKey, Math.max(0, (inFlight.get(docKey) ?? 1) - 1));
    settledAt.set(docKey, Date.now());
  });
}

/** Whether a read started at `since` may predate a write: one is still under
 *  way, or one settled after the read began. */
export const writesSince = (docKey: string, since: number): boolean =>
  (inFlight.get(docKey) ?? 0) > 0 || (settledAt.get(docKey) ?? 0) >= since;

/**
 * Reads the document, unless a write overlapped the read: then the copy
 * already in the cache (`current`) stands, and the next read catches up.
 */
export async function readGuarded<T>(
  docKey: string,
  read: () => Promise<T>,
  current: () => T | undefined,
): Promise<T> {
  const since = Date.now();
  const fresh = await read();
  if (!writesSince(docKey, since)) return fresh;
  return current() ?? fresh;
}
