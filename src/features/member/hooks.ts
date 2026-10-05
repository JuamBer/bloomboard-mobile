import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { useAuthStore } from '@features/auth/auth.store';
import { useFinishFlow } from '@features/workouts/lib/finish-flow';
import { meService } from '@shared/api/services/me.service';
import type { MemberLimitKey } from '@shared/types/api.types';

export const MEMBER_PROFILE_KEY = ['me', 'profile'] as const;
export const MEMBER_PLAN_KEY = ['me', 'plan'] as const;
export const MEMBER_ACTIVE_SESSION_KEY = ['me', 'session', 'active'] as const;

/** The member's profile and affiliations — the app's one shared read. */
export function useMemberProfile(enabled = true) {
  return useQuery({
    queryKey: MEMBER_PROFILE_KEY,
    queryFn: meService.getProfile,
    staleTime: 5 * 60 * 1000,
    enabled,
  });
}

/** Whether the member trains somewhere with sessions — the calendar's tab
 *  and the landing screen follow it. */
export function useHasSessions() {
  const { data } = useMemberProfile();
  return !!data?.affiliations.some((a) => a.hasSessions);
}

/** Signs the member out: drops the tokens and every cached read, so the next
 *  person on this phone starts clean. The navigator's guard then shows the
 *  login. */
export function useMemberLogout() {
  const queryClient = useQueryClient();
  const closeFinishFlow = useFinishFlow((s) => s.close);
  return async () => {
    closeFinishFlow();
    await useAuthStore.getState().signOut();
    queryClient.clear();
  };
}

/** The member's plan, limits and usage — what gates creating their own
 *  routines, workouts and exercises. Every create or delete invalidates ['me']. */
export function useMemberPlan(enabled = true) {
  return useQuery({
    queryKey: MEMBER_PLAN_KEY,
    queryFn: meService.getPlan,
    enabled,
  });
}

/**
 * The session the member is training in right now, or null. Drives the
 * "session in progress" pill and the session control. Polled — `fast` while
 * the control is open — and nudged by the socket's `session-updated` ping
 * (features/member/session-socket.ts), so a trainer's mark shows up at once.
 */
export function useActiveSession(fast = false) {
  return useQuery({
    queryKey: MEMBER_ACTIVE_SESSION_KEY,
    queryFn: meService.getActiveSession,
    refetchInterval: fast ? 4000 : 60_000,
  });
}

/**
 * Runs a create only while the member's plan has room for it; otherwise
 * remembers which limit was hit, for the caller to open <UpgradeSheet>. The
 * server enforces the same limits — this just says so before asking it.
 */
export function useLimitGuard() {
  const { data: plan } = useMemberPlan();
  const [blocked, setBlocked] = useState<MemberLimitKey | null>(null);
  const guard = (key: MemberLimitKey, action: () => void) => {
    const max = plan?.limits[key];
    if (plan && max != null && plan.usage[key] >= max) setBlocked(key);
    else action();
  };
  return { guard, blocked, dismiss: () => setBlocked(null) };
}
