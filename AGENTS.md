# AGENTS.md — bloomboard-mobile

The Bloom Board member app for Android and iOS: what a CLIENT has on the web
portal (`app.bloomboard.pro/me`), on their phone. React Native 0.86 + Expo SDK
57 (managed, Continuous Native Generation), Expo Router (file-based), TanStack
Query, Zustand, axios, i18next (es/en). TypeScript strict, React Compiler on.

This is one of four sibling repos under `bloomboard/`, each with its own git
history: `bloomboard-backend` (NestJS API), `bloomboard-frontend` (the web app:
staff portal, TVs and the member portal this app mirrors), `bloomboard-landing`
(Astro marketing site).

**Members only.** Staff sign in on the web; a staff account is refused at
login. Who the app is for — the member who trains alone, the one an online
coach programs, the one whose center runs on Bloom Board — is in
`specs/member-app.md`.

## Commands

| Task | Command |
| --- | --- |
| Dev server (Metro) | `npm start` — opened in a development build (not Expo Go: `react-native-keyboard-controller`) |
| Development build | `npx expo run:android` / `npx expo run:ios`, or `eas build --profile development` |
| Typecheck | `npm run typecheck` |
| Lint | `npm run lint:check` / `lint:fix` |
| Format | `npm run format:check` / `format:fix` |
| Unit tests | `npm test` (`npm run test:watch` while working) |
| es/en parity + every used key exists | `npm run check:i18n` |
| Both native bundles compile | `npm run bundle:check` (Hermes, Android + iOS, into `dist/`) |
| Dependency sanity | `npm run doctor` |

There is no `ios/` or `android/` folder, and there must never be one in git:
native projects are generated from `app.config.ts` (`npx expo prebuild`, or EAS
does it on its build machines). A native setting goes in `app.config.ts` or a
config plugin. See `docs/ARCHITECTURE.md`.

A local run talks to `http://<the Metro host's LAN address>:3000/api` unless
`EXPO_PUBLIC_API_URL` says otherwise (`.env.example`), so a phone on the same
Wi-Fi reaches the backend on your machine with no setup. The Android emulator
gets `10.0.2.2`.

**The API this app needs is backend 2.0.0** (workouts — `feature/workouts` in
`bloomboard-backend` until it is promoted). Against 1.x the Entrenos tab, the
session's workout and the finish flow answer 404. Deploy the backend first.

## After every change — run these

```bash
npm run format:fix
npm run lint:fix
```

Then what CI runs, in this order:

```bash
npm run format:check
npm run lint:check
npm test
npm run typecheck
npm run check:i18n
npm run bundle:check
```

All of them pass on a clean checkout. If one fails and you did not expect it,
it is your change.

- **Typed routes.** `experiments.typedRoutes` makes every `href` a checked
  type — `router.push('/sesion')` fails with "Did you mean '/session'?". The
  route types (`.expo/types/router.d.ts`) are generated, not committed: `expo
  start` writes them, `expo export` does not, and a bare `tsc` without them
  passes with `href` typed as a plain string. So `npm run typecheck` runs
  `scripts/typed-routes.mjs` first, which calls the Expo CLI's own generator
  without starting Metro. Use the script, not a bare `npx tsc`.
- **Line endings are LF**, as in the other repos (`.gitattributes`,
  `.editorconfig`, prettier `endOfLine`). A CRLF file fails `format:check`.
- `bundle:check` is the closest thing to "does it build" short of an EAS build:
  it runs Metro and Hermes for both platforms. A native-module mistake (a
  package that needs a config plugin, a missing peer) only shows in a real
  build — `npm run doctor` catches most of those first.

## Conventions

**Layout.** `src/app/` is routes only — each file renders one screen from
`src/features/<feature>/`. Feature code never imports another feature's
internals except through what that feature exports for it (the editor is
shared by templates, workouts and the session control). `src/shared/` holds
what has no feature: API client and services, theme, storage, UI kit, types.
Aliases: `@features/*`, `@shared/*`, `@assets/*`.

**Ported from the web, kept in step with it.** The domain logic is the web's,
copied — not reimplemented: the editor's libraries (`editor-source`,
`logged-values`, `workout-cells`, `superset-sequence`, `metric-field-config`…),
`records`, `finish-flow`, `sessionProgress`, the types in `api.types.ts`, and
the web's locale namespaces (`common`, `auth`, `member`, `workouts`,
`templates`, `exercises`, `profile`, `session`, `clients`, `routines`). When the
web changes one of these, carry the change across; a fix in only one place is a
bug in the other. Only the `app` namespace is this repo's own — strings that
exist only because a phone is not a browser.

**One editor, two documents.** As on the web: the editor cards never call a
service, they ask the `EditorSource` context for its API and query key, so the
same cards edit a plan (template) or a workout (what was trained). A new editor
feature must go through the source or it breaks the other document.
`specs/member-app.md` has the rest of the editor's phone-specific decisions.

**Theming.** Never write a colour in a component. `useTheme()` gives the
palette's tokens (`theme.colors.*`) and the alpha helpers — `theme.fg()`,
`theme.text()`, `theme.line()`, `theme.fill()`, `theme.ink()` — which repaint
for light mode the way the web's `html:not(.dark)` overrides do. Styles come
from `makeStyles((t) => ({ … }))`, cached per theme. Members always see the
BLOOM palette; light / dark / system is theirs, stored on the server
(`/configurations/me`) so it follows them across web and phone.

**i18n.** Every string through `t('namespace:key')`, fully qualified. A key
added to `es` must be added to `en` — `check:i18n` fails otherwise, and it also
fails on any key the code uses that neither file has.

**Data.** TanStack Query for server state, Zustand for client state. The axios
interceptor already toasts every failed request (with the coded messages:
`MEMBER_LIMIT_REACHED`, `EXERCISE_IN_USE`…) — don't add error toasts at call
sites. Pass `silentErrors` for a call whose failure the screen handles itself.

**Auth.** Custom JWT, as everywhere in Bloom Board. Tokens live in the
Keychain / Keystore (`expo-secure-store`), never AsyncStorage. The access token
lasts an hour, the refresh token 30 days and is re-issued on every refresh — one
refresh in flight at a time (`session-refresh.ts`). A CLIENT token carries no
company or center; the member's endpoints are `/me/*`.

**Members are default-denied on the backend.** A new screen that calls a route
not yet open to CLIENT gets a 403. The route needs `@Roles(... CLIENT)` or
`@AllowMember()` and an entry in the backend's route-access spec — that change
belongs in `bloomboard-backend`, deployed first.

**On a phone, choices open from the bottom.** Menus are `ActionSheet`, pickers
and forms are `Sheet`, irreversible actions are `ConfirmDialog`. Number fields
chain (`FieldChain`): the keyboard's next key, the iOS accessory's
"Siguiente", and a full digit budget all move to the next set field.

**React Compiler is enabled.** No hand-rolled `useMemo`/`useCallback` that
fights it, and no `useRef(...).current` read during render (`react-hooks/refs`
fails lint) — an `Animated.Value` that styles read goes in `useState(() => …)`.

## Testing

`jest-expo`, pure modules only (`src/**/*.test.ts`) — logic that is
load-bearing and painful to check by hand: the logging rules, the metric
columns, the calendar's month grid. Nothing renders a component. Import the
globals from `@jest/globals`.

Screens are verified by hand on a device or simulator against a local
backend — and, for layout and flows, in a browser: `npx expo export --platform
web` gives a build Playwright can drive at phone size (the backend's CORS list
accepts `:4173`). The web build exists for that only; members use the real web
app on the web. Its quirks are not the phone's (a browser `<input>` is ~20
characters wide by default; see `MetricCell`'s input style).

## Specs — `specs/`

Same rule as the other repos: one Markdown file per feature, kept current **in
the same change as the code**. `specs/member-app.md` is this app's; the
behaviour it mirrors is specified in `bloomboard-frontend/specs/member-portal.md`
and `workouts.md`, and the contract in `bloomboard-backend/specs/`. When a
change here needs the backend, update the backend spec there too.

House style (read `bloomboard-frontend/specs/member-portal.md` first): the
reasoning, not a description of the code — `## Overview`, `## Design decision
N` with the rejected options and why, `## File map`, `## Gotchas`,
`## Verification`. In English; quote Spanish UI strings where they matter.

## Branching and releasing

```
feature branch ──PR──► develop ──merge──► beta ──merge──► main
                       (CI)               (EAS update     (EAS update
                                           → beta)         → production)
```

`develop` is checked by CI. `beta` and `main` publish over-the-air JavaScript
updates to the matching EAS channel; store binaries are built on demand. What
can ship over the air and what needs a store build, how to cut one, and how the
version and tag are managed: `docs/RELEASING.md`. Environments and the one-off
EAS setup: `docs/ENVIRONMENTS.md`.

Do not push `beta` or `main` unless asked — a push there reaches phones.
