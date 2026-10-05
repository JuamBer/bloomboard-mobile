import { useEffect, useRef, useState } from 'react';

const DEFAULT_DELAY = 1500;

interface UseDebouncedSaveOptions<T> {
  /** The payload as the editor currently stands. Called on every render — keep
   *  it cheap and pure. */
  buildPayload: () => T;
  /** What is already persisted. Read once, to seed the dirty check. */
  initialPayload: () => T;
  save: (payload: T) => Promise<unknown>;
  /** Read-only surfaces never save. */
  disabled?: boolean;
  delay?: number;
}

export interface DebouncedSave<T> {
  isSaving: boolean;
  savedRecently: boolean;
  saveError: boolean;
  /** Save now if dirty. Called on unmount; also useful before navigating away. */
  flush: () => void;
  /** Re-baseline after the same record was written through another path (a
   *  replace, leaving a super-set…), so the debounce doesn't re-send it. */
  markSaved: (payload: T) => void;
  /** The JSON signature of what the server last confirmed — compare a payload
   *  against it to know whether there are edits still to save. */
  savedSignature: () => string | null;
}

/**
 * Debounced autosave for one record, with the two guarantees the template
 * editor depends on: a save already in flight is never raced (the follow-up is
 * coalesced and re-run once it settles), and pending edits are flushed when the
 * component unmounts so navigating away can't silently drop them.
 *
 * Dirtiness is a JSON signature of the payload rather than a dependency array,
 * so callers can't forget to list a field.
 */
export function useDebouncedSave<T>({
  buildPayload,
  initialPayload,
  save,
  disabled = false,
  delay = DEFAULT_DELAY,
}: UseDebouncedSaveOptions<T>): DebouncedSave<T> {
  const [isSaving, setIsSaving] = useState(false);
  const [savedRecently, setSavedRecently] = useState(false);
  const [saveError, setSaveError] = useState(false);

  const savedTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const errorTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const mountedRef = useRef(true);
  const savingRef = useRef(false);
  const needsResaveRef = useRef(false);

  // The saver runs async, so it must read the latest closures through refs
  // rather than whichever render created it.
  const buildRef = useRef(buildPayload);
  const saveFnRef = useRef(save);
  const disabledRef = useRef(disabled);
  const performSaveRef = useRef<() => void>(() => {});

  const lastSavedSigRef = useRef<string | null>(null);
  if (lastSavedSigRef.current === null) {
    lastSavedSigRef.current = JSON.stringify(initialPayload());
  }

  const performSave = () => {
    if (disabledRef.current) return;
    const payload = buildRef.current();
    const sig = JSON.stringify(payload);
    if (sig === lastSavedSigRef.current) return; // nothing to save
    if (savingRef.current) {
      // A save is already in flight — coalesce; re-run once it settles.
      needsResaveRef.current = true;
      return;
    }
    savingRef.current = true;
    if (mountedRef.current) setIsSaving(true);
    saveFnRef
      .current(payload)
      .then(() => {
        lastSavedSigRef.current = sig;
        if (mountedRef.current) {
          setSaveError(false);
          setSavedRecently(true);
          if (savedTimerRef.current) clearTimeout(savedTimerRef.current);
          savedTimerRef.current = setTimeout(
            () => mountedRef.current && setSavedRecently(false),
            2000,
          );
        }
      })
      .catch(() => {
        if (mountedRef.current) {
          setSaveError(true);
          if (errorTimerRef.current) clearTimeout(errorTimerRef.current);
          errorTimerRef.current = setTimeout(
            () => mountedRef.current && setSaveError(false),
            3000,
          );
        }
      })
      .finally(() => {
        savingRef.current = false;
        if (mountedRef.current) setIsSaving(false);
        if (needsResaveRef.current) {
          needsResaveRef.current = false;
          performSaveRef.current();
        }
      });
  };

  // Refresh every ref the async saver reads. Declared before the debounce effect
  // so they are current by the time it runs.
  useEffect(() => {
    buildRef.current = buildPayload;
    saveFnRef.current = save;
    disabledRef.current = disabled;
    performSaveRef.current = performSave;
  });

  // Restarts the countdown whenever the payload actually changes.
  const signature = disabled ? null : JSON.stringify(buildPayload());
  useEffect(() => {
    if (disabled) return;
    if (signature === lastSavedSigRef.current) return;
    const timer = setTimeout(() => performSaveRef.current(), delay);
    return () => clearTimeout(timer);
  }, [signature, disabled, delay]);

  // Flush pending edits on unmount (e.g. navigating away).
  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      performSaveRef.current();
    };
  }, []);

  return {
    isSaving,
    savedRecently,
    saveError,
    flush: () => performSaveRef.current(),
    markSaved: (payload: T) => {
      lastSavedSigRef.current = JSON.stringify(payload);
    },
    savedSignature: () => lastSavedSigRef.current,
  };
}
