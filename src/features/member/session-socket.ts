import { useQueryClient } from '@tanstack/react-query';
import { useEffect } from 'react';
import { AppState } from 'react-native';
import { io, type Socket } from 'socket.io-client';
import { getValidAccessToken } from '@shared/api/session-refresh';
import { WS_URL } from '@shared/config/env';

/**
 * The trainer's board and the member's phone write the same workout. Polling
 * alone (4 s on the control) would show a trainer's tick late; the backend
 * also pings the member's own socket room — `user:<id>`, joined from the
 * verified token, never from a message — with `session-updated` and just the
 * session id. A ping refetches; it carries no data (as every socket event in
 * Bloom Board).
 *
 * Connected only while a session is running and the app is in the
 * foreground: a socket held open in a pocket all day is battery for nothing,
 * and the polls cover anything a dropped connection misses.
 */
export function useSessionSocket(active: boolean) {
  const queryClient = useQueryClient();

  useEffect(() => {
    if (!active) return;
    let socket: Socket | null = null;

    const refetch = () => {
      void queryClient.invalidateQueries({ queryKey: ['me', 'session'] });
      void queryClient.invalidateQueries({ queryKey: ['me', 'workouts'] });
      void queryClient.invalidateQueries({ queryKey: ['workout'] });
    };

    const connect = () => {
      if (socket) return;
      socket = io(`${WS_URL}/sessions`, {
        transports: ['websocket'],
        // A callback, so every (re)connect presents a token current at that
        // moment — the socket outlives the 1 h access token.
        auth: (cb) => {
          getValidAccessToken().then(
            (token) => cb(token ? { token } : {}),
            () => cb({}),
          );
        },
      });
      socket.on('session-updated', refetch);
      // Back after a drop: catch up on whatever was missed meanwhile.
      socket.io.on('reconnect', refetch);
    };

    const disconnect = () => {
      socket?.disconnect();
      socket = null;
    };

    connect();
    const subscription = AppState.addEventListener('change', (status) => {
      if (status === 'active') connect();
      else disconnect();
    });
    return () => {
      subscription.remove();
      disconnect();
    };
  }, [active, queryClient]);
}
