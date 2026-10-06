# Mobile Architecture

> The member app. What it does and why it is shaped this way:
> `specs/member-app.md`. The web portal it mirrors:
> `bloomboard-frontend/docs/ARCHITECTURE.md` and `specs/member-portal.md`.

## Layers (`src/`)

```
src/
├── app/            routes only (Expo Router, file-based) — each renders a screen
├── features/       one folder per area, screens + their widgets/lib/hooks
│   ├── auth/       login, register, activation, the session store, AppEffects
│   ├── member/     member hooks (profile, plan, active session), session control,
│   │               the live pill, the tab bar, plan cards, the session socket
│   ├── calendar/   agenda + month, a session's detail
│   ├── routines/   own routines + the centers' (read-only)
│   ├── editor/     the shared workout editor (plan or workout), its sheets and grid
│   ├── workouts/   history, the workout view (live mode), finish flow, records, progress
│   ├── exercises/  catalog, filters, own exercises (form), detail, usages
│   └── profile/    identity, plan, personal details, theme, language, logout
├── shared/
│   ├── api/        axios client, token refresh, coded errors, services/*.service.ts
│   ├── config/     env (API_URL, WS_URL, APP_ENV, web/landing links)
│   ├── lib/        query client, formatting, session progress, display helpers
│   ├── storage/    secure (Keychain/Keystore) and persist (AsyncStorage) helpers
│   ├── theme/      palettes, tokens, ThemeProvider + makeStyles, mode store
│   ├── types/      api.types.ts — the member slice of the web's types
│   └── ui/         the kit: Text, Button, Sheet, ActionSheet, ConfirmDialog,
│                   TextField, pickers, controls, layout, states, toasts
└── i18n/           i18next setup, language store, locales/{es,en}/*.json
```

Aliases: `@features/*`, `@shared/*`, `@assets/*` (`tsconfig.json`; Metro
resolves them through Expo's tsconfig-paths support).

## Navigation

```
_layout.tsx                 fonts, splash, providers, AppEffects, Toaster
├── Stack.Protected (signed out)
│   ├── login · register · activate/index
├── activate/[token]        always reachable — an emailed link may open signed in
└── Stack.Protected (signed in)
    └── (member)/_layout.tsx    stack + LivePill + session socket + finish flow
        ├── (tabs)/_layout.tsx  MemberTabBar: Calendario* · Rutinas · Entrenos · Ejercicios · Perfil
        │   └── index           redirect: calendar if they have sessions, else routines
        ├── session             the session control (the running session's workout)
        ├── sessions/[sessionId]   a session's detail (read-only)
        ├── templates/[templateId] a plan in the editor
        ├── workouts/[workoutId]   a workout (live while under way)
        └── exercises/[exerciseId]/index · usages
```

\* Calendario appears only for members with sessions (a center that runs on
Bloom Board) — `useHasSessions()`.

Guards are `Stack.Protected` on the auth store's `status`. The splash screen
stays up until the auth store, the theme and the language have hydrated, so the
first frame is already the right screen in the right theme.

## State

| What | Where |
|------|-------|
| Server data | TanStack Query. Keys: `['me', …]` for member reads, `['workout', id]`, `['workout-template', id]`, `['metrics']` |
| Session (tokens, user) | `features/auth/auth.store.ts` (Zustand) — tokens mirrored from SecureStore |
| Theme mode | `shared/theme/theme.store.ts` — persisted locally, synced with `/configurations/me` |
| Language | `i18n/language.store.ts` — device language until chosen, synced with the profile |
| Finish flow | `features/workouts/lib/finish-flow.ts` — a store, mounted once by the member layout |
| Toasts | `shared/ui/toast/toast.store.ts` |

The query client knows about the app lifecycle: `focusManager` follows
`AppState` (coming back to the app refetches what is stale) and
`onlineManager` follows NetInfo (queries pause offline and resume).

## Auth flow

1. **Login** (`POST /auth/login`). A non-CLIENT account is refused on the
   spot with a message pointing at the web — staff do not use this app.
2. Tokens go to SecureStore, the user to AsyncStorage (shown on the first frame
   of the next launch, before `/auth/me` answers).
3. Every request carries the access token. A 401 triggers one refresh (`POST
   /auth/refresh`) — single-flight, every waiting request retries with the new
   token. A failed refresh signs out with "session expired".
4. `AppEffects` re-reads `/auth/me` once per run (a staff account left signed
   in by an old build is signed out there), and applies the server-side theme
   and language.
5. **Register** and **activate** mirror the web: register sends the device
   language; activation (for members a center created, whose account exists
   without a password) is requested by email and completed through
   `/activate/[token]`, which the emailed link opens.

## Real time

The member and the trainer's board write the same session workout.

- **Polling:** the active session every 60 s, every 4 s on the session control;
  a workout under way every 8 s when nothing is being edited.
- **Socket:** while a session is running and the app is in the foreground, a
  Socket.IO connection to `/sessions` (token in the handshake, re-read on every
  reconnect). The backend pings the member's own room `user:<id>` with
  `session-updated` and the session id only — the app refetches, the event
  carries no data.
- **Edits:** values autosave debounced; ticks save at once. A server copy only
  replaces the local one when nothing local is pending, so a poll never eats a
  half-typed number.

## Platform

- **Keyboard:** `react-native-keyboard-controller` (`KeyboardAwareScrollView`)
  keeps the focused set field above the keyboard. Number pads have no return
  key, so iOS gets an input accessory ("Siguiente" / "Listo"); Android's
  decimal pad has a next key.
- **Bottom insets:** the tab bar and the live pill float over content;
  `BottomInsetContext` tells each screen how much to pad.
- **Haptics** on ticks and records (the web's fanfare would be a sound in a
  gym). **Keep-awake** while a workout is under way.
- **Links out:** privacy/terms and the web app open in an in-app browser
  (`expo-web-browser`).

## Build shape

- Managed Expo, Continuous Native Generation: `app.config.ts` is the only
  native configuration. `APP_ENV` (from the EAS profile) picks name, bundle id
  and API.
- Hermes, the New Architecture (default in SDK 57), React Compiler.
- `runtimeVersion: appVersion` — an over-the-air update only reaches binaries
  of the same app version. Not `fingerprint`: its hash differs between Windows
  and EAS's Linux builders and fails the build. See `docs/RELEASING.md`.
- The **web build** (`expo export --platform web`) is for development checks
  only — Playwright at phone size against a local API. It is not deployed;
  members on the web use `app.bloomboard.pro`.
