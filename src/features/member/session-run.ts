import { useMutation, useQueryClient } from '@tanstack/react-query';
import { createContext, useContext } from 'react';
import { meService } from '@shared/api/services/me.service';
import type { MemberActiveSession } from '@shared/types/api.types';
import {
  withRunAt,
  withRunPaused,
} from '@features/workouts/lib/work-rest-controls';
import { currentWorkRestBlock } from '@features/workouts/lib/work-rest-timeline';
import { MEMBER_ACTIVE_SESSION_KEY } from './hooks';

/**
 * The member's Work/Rest run in a session (app 2.6.0, backend 2.10.0): the
 * one the trainer's board and the TV play. Whoever presses — the trainer on
 * the board, the member here — writes the same run, and the others follow on
 * the socket's ping: start, pause, previous / next, finish, cancel. The
 * player reads its clock from it instead of keeping its own, and logs
 * nothing: the run marks its block done when it retires, as on the board
 * (specs/member-app.md, decision 19).
 *
 * Provided by the session control around its workout; null anywhere else,
 * where a timed block runs on the phone's own clock as before.
 */
export interface SessionRun {
  /** The run in flight, or null. `key` names it through pauses and skips. */
  run: {
    blockId: string;
    startedAt: string;
    endsAt: string;
    pausedAt: string | null;
    key: string;
  } | null;
  /** The timed block that is up — the only one Empezar starts, as on the
   *  board; null when what is up is not timed. */
  readyBlockId: string | null;
  start: () => void;
  pause: (paused: boolean) => void;
  seek: (elapsedMs: number) => void;
  finish: () => void;
  cancel: () => void;
  /** The clock passed the end (and its flourish): ask, so the server
   *  retires the run and marks the block done. */
  over: () => void;
  starting: boolean;
}

export const SessionRunContext = createContext<SessionRun | null>(null);

/** Null outside a session's control. */
export const useSessionRun = () => useContext(SessionRunContext);

type SessionUser = MemberActiveSession['sessionUser'];

/** The session control's run: read off the active session, written through
 *  /me/sessions/:id/work-rest — pause and skip land in the cache at once. */
export function useSessionRunController(
  active: MemberActiveSession,
): SessionRun {
  const queryClient = useQueryClient();
  const key = MEMBER_ACTIVE_SESSION_KEY;

  const patchRun = (change: (su: SessionUser) => SessionUser) =>
    queryClient.setQueryData<MemberActiveSession | null>(key, (old) =>
      old ? { ...old, sessionUser: change(old.sessionUser) } : old,
    );

  const mutation = useMutation({
    mutationFn: (
      args:
        | { action: 'start' | 'pause' | 'resume' | 'finish' | 'cancel' }
        | { action: 'seek'; elapsedMs: number },
    ) =>
      args.action === 'seek'
        ? meService.seekWorkRest(active.id, args.elapsedMs)
        : meService.workRest(active.id, args.action),
    onMutate: async (args) => {
      if (
        args.action !== 'pause' &&
        args.action !== 'resume' &&
        args.action !== 'seek'
      )
        return {};
      await queryClient.cancelQueries({ queryKey: key });
      const prev = queryClient.getQueryData<MemberActiveSession | null>(key);
      const now = Date.now();
      patchRun((su) =>
        args.action === 'seek'
          ? withRunAt(su, args.elapsedMs, now)
          : withRunPaused(su, args.action === 'pause', now),
      );
      return { prev };
    },
    onError: (_e, _args, ctx) => {
      if (ctx?.prev !== undefined) queryClient.setQueryData(key, ctx.prev);
    },
    onSuccess: (next) => queryClient.setQueryData(key, next),
    // A run that retired marked its block: the workout moves on too.
    onSettled: () =>
      void queryClient.invalidateQueries({ queryKey: ['workout'] }),
  });

  const su = active.sessionUser;
  const run =
    su.workRestStartedAt && su.workRestBlockId && su.workRestEndsAt
      ? {
          blockId: su.workRestBlockId,
          startedAt: su.workRestStartedAt,
          endsAt: su.workRestEndsAt ?? su.workRestStartedAt,
          pausedAt: su.workRestPausedAt ?? null,
          key: su.workRestBeganAt ?? su.workRestBlockId,
        }
      : null;

  return {
    run,
    readyBlockId: currentWorkRestBlock(su.workout)?.id ?? null,
    start: () => mutation.mutate({ action: 'start' }),
    pause: (paused) => mutation.mutate({ action: paused ? 'pause' : 'resume' }),
    seek: (elapsedMs) => mutation.mutate({ action: 'seek', elapsedMs }),
    finish: () => mutation.mutate({ action: 'finish' }),
    cancel: () => mutation.mutate({ action: 'cancel' }),
    over: () => void queryClient.invalidateQueries({ queryKey: key }),
    starting: mutation.isPending && mutation.variables?.action === 'start',
  };
}
