import { create } from 'zustand';

export type ToastKind = 'success' | 'error' | 'info';

export interface Toast {
  id: string;
  kind: ToastKind;
  title: string;
  description?: string;
}

interface ToastState {
  toasts: Toast[];
  push: (toast: Omit<Toast, 'id'>) => string;
  dismiss: (id: string) => void;
}

// Errors stay longer: they usually say what to do next.
const DURATION: Record<ToastKind, number> = {
  success: 3500,
  info: 4000,
  error: 7000,
};

// More than this and the oldest makes way — a burst of failed polls must not
// bury the screen.
const MAX_VISIBLE = 3;

let counter = 0;

export const useToastStore = create<ToastState>()((set, get) => ({
  toasts: [],
  push: (toast) => {
    // The same message already up (three polls failing together while the
    // phone is offline) is said once.
    const twin = get().toasts.find(
      (t) => t.title === toast.title && t.description === toast.description,
    );
    if (twin) return twin.id;
    const id = `t${++counter}`;
    set((s) => ({
      toasts: [...s.toasts, { ...toast, id }].slice(-MAX_VISIBLE),
    }));
    setTimeout(() => get().dismiss(id), DURATION[toast.kind]);
    return id;
  },
  dismiss: (id) =>
    set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) })),
}));

/** The same call shape as the web app's toast store. */
export const toast = {
  success: (title: string, description?: string) =>
    useToastStore.getState().push({ kind: 'success', title, description }),
  error: (title: string, description?: string) =>
    useToastStore.getState().push({ kind: 'error', title, description }),
  info: (title: string, description?: string) =>
    useToastStore.getState().push({ kind: 'info', title, description }),
  dismiss: (id: string) => useToastStore.getState().dismiss(id),
};
