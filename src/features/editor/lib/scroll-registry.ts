import {
  createContext,
  useContext,
  useEffect,
  useRef,
  type RefObject,
} from 'react';
import type { ScrollView, View } from 'react-native';

/**
 * Where each exercise sits in the page's scroll, so the page can bring one
 * into view: the exercise that is up in a live workout, or the one a link
 * points at ("Dónde lo usas" → this entry). The web scrolls by DOM id; here a
 * card registers its view and the page measures it against the scroll's
 * content when asked.
 */
export class ScrollRegistry {
  private views = new Map<string, View>();

  constructor(
    private scroll: RefObject<ScrollView | null>,
    private content: RefObject<View | null>,
    /** Room left above the exercise — a pinned bar over the content. */
    private offset = 12,
  ) {}

  register(entryId: string, view: View | null) {
    if (view) this.views.set(entryId, view);
    else this.views.delete(entryId);
  }

  /** Scrolls so the entry starts near the top. False when it is not drawn. */
  scrollTo(entryId: string, animated = true): boolean {
    const view = this.views.get(entryId);
    const content = this.content.current;
    if (!view || !content) return false;
    view.measureLayout(
      content,
      (_x, y) =>
        this.scroll.current?.scrollTo({
          y: Math.max(0, y - this.offset),
          animated,
        }),
      () => undefined,
    );
    return true;
  }
}

export const ScrollRegistryContext = createContext<ScrollRegistry | null>(null);

/** A card's ref callback that keeps its view in the page's registry. */
export function useRegisterEntry(entryIds: string[]) {
  const registry = useContext(ScrollRegistryContext);
  const key = entryIds.join(',');
  const viewRef = useRef<View | null>(null);
  useEffect(() => {
    const ids = key.split(',');
    return () => ids.forEach((id) => registry?.register(id, null));
  }, [registry, key]);
  return (view: View | null) => {
    viewRef.current = view;
    for (const id of key.split(',')) registry?.register(id, view);
  };
}
