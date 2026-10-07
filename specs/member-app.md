# 📱 Member App — Mobile

What it mirrors: `bloomboard-frontend/specs/member-portal.md` and
`bloomboard-frontend/specs/workouts.md`. The contract:
`bloomboard-backend/specs/member-portal.md`, `member-access.md` and
`workouts.md`.

## Overview

Until 2.0.0 a member could only use Bloom Board in a browser. The business
described three kinds of member, and all three live on their phone:

| Who | Trains | Needs from the app |
|---|---|---|
| **Self-tracker** | at a regular gym, on their own | their own routines, plans and exercises; log every workout; records and progress; their plan and its limits |
| **Coached online** | at a regular gym, with a coach who programs them in Bloom Board | the same, plus the routines their coach's company prepared (read-only) and the company's exercises |
| **Center member** | at a gym / small-group center that runs on Bloom Board | the above, plus their sessions in a calendar and control of the session while it runs: log, tick, move between TVs, finish |

The app gives them everything the web portal (`/me`) does, as a native app for
Android and iOS:

| Tab | What |
|---|---|
| **Calendario** (only with sessions) | agenda and month of their sessions across centers; a session's detail and plan; the running one opens the session control |
| **Rutinas** | their own routines and plans (create, rename, reorder, delete, edit in the editor, start); each company's routines, read-only |
| **Entrenos** | every workout — at a center or on their own — start one (empty or from a plan), log it live, finish it, edit it after |
| **Ejercicios** | catalog, their own and their companies' exercises; filters; create / edit / copy their own; detail with their stats and progress; where an exercise is used |
| **Perfil** | identity, plan and usage (Free limits, Pro "Próximamente"), where they train, personal details, theme, language, sign out, **delete account** (password-confirmed; `DELETE /me` removes the account and all its data — `bloomboard-backend/specs/member-portal.md` decision 9; required by Google Play; the web portal has the same since 2.1.0, with the same `member:profile.delete*` strings) |

Plus, on every screen while a session is on: the live pill leading to the
session control. Sign-up, sign-in and activation (a member a center created
claims their account by email) are the web's flows.

Not in the app: anything staff (they are refused at sign-in), the TV, help
center articles, push notifications (see decision 9).

```
┌──────────────────────┐   ┌──────────────────────┐   ┌──────────────────────┐
│ Mis sesiones         │   │ ‹ Servicio     12:09 │   │ Entrenamiento   04:09│
│ [Agenda] [Mensual]   │   │ ● ━━━━━─── 1/5 [Terminar]│ │ ━━━━━━━━━━ 1/2       │
│ ‹  Octubre 2026  ›   │   │ ┌ A Plancha …        │   │ [Descartar][Terminar]│
│ HOY                  │   │ │ B Plancha lat …    │   │ ✓ Press banca     ›  │
│ 16:06 Entrenamiento ●│   │ TIEMPO DESC. RPE     │   │ ☐ Press banca     ⌄  │
│ 17:06 Mislata  En c. │   │ A1 N [30][ 5] ·  ☑ 🗑│   │ PESO REPS RPE        │
│                      │   │ A2 N [ 5][ 5] ·  ☐ 🗑│   │ N [60][ 8] –   ☐  🗑 │
│ ┌──────────────────┐ │   │ [+ Añadir serie]     │   │ [+ Añadir serie]     │
│ │● Sesión en curso›│ │   │                      │   │                      │
│ └──────────────────┘ │   │                      │   │                      │
│ 📅  📋  〰  🏋  👤     │   │                      │   │                      │
└──────────────────────┘   └──────────────────────┘   └──────────────────────┘
  calendar + live pill       session control            a workout, live
```

---

## Design decision 1: Expo, managed, native projects generated

| Option | Verdict |
|---|---|
| **Expo (managed) + Expo Router + EAS** | **Chosen.** One TypeScript codebase for both stores, the same language and libraries as the web (React, TanStack Query, Zustand, i18next, axios — and the web's domain code, see decision 3). `ios/` and `android/` are generated from `app.config.ts` (Continuous Native Generation), so an SDK upgrade is a version bump, not a merge into two native projects. EAS builds in the cloud (no Mac needed for iOS) and ships JavaScript fixes over the air. |
| Bare React Native | Rejected. Same code, plus two native projects to own and upgrade by hand, for no capability the app needs — every native need (secure storage, haptics, keep-awake, keyboard, fonts, date picker) has an Expo module or a config plugin. |
| Flutter / Swift + Kotlin | Rejected. A second (or third) language and none of the web's logic reusable — the editor's rules alone are thousands of lines that would be re-derived and drift. |
| The web portal in a WebView, or a PWA | Rejected. The member portal is responsive, but logging a set in a gym is where a web view hurts most: number pads without a next key, the keyboard covering the field, no haptics, no keep-awake, a page reload losing a half-typed value. iOS also limits PWAs (no install prompt, storage evicted). And a store listing that is only a web view is routinely rejected by Apple. |

## Design decision 2: built for the 2.0.0 API

The app targets backend 2.0.0 (`feature/workouts` until promoted), not the 1.x
in production today.

| Option | Verdict |
|---|---|
| **2.0.0** | **Chosen.** 2.0.0 is where "auto-track my own workouts" exists at all: the Workout (what was trained, beside the plan), logging, records, progress, the finish flow, and the session's workout the trainer and the member share. Two of the three member types are mostly that. |
| 1.x first, workouts later | Rejected. An app without workouts is a calendar and a read-only routine list — not worth a store release — and every screen built on 1.x's session sheet would be rebuilt for 2.0.0's. |

Consequence: **deploy the backend 2.0.0 before shipping the app** to an
environment. Against 1.x, Entrenos, the session's workout and the finish flow
fail.

## Design decision 3: the web's logic, copied; the UI, native

| Option | Verdict |
|---|---|
| **Copy the web's pure modules, rebuild the screens in React Native** | **Chosen.** The rules — what a logged value is, which cells a set has, super-set slot sequences, metric columns and modes, records, session progress, the finish flow's totals — are copied file by file from `bloomboard-frontend`, with their tests. The screens are written for a phone with the same structure (`EditorBody` → `BlockCard` → `ExerciseEntryCard` / `SuperSetCard` → `SetsEditor`) and the same `EditorSource` seam, so a web change maps onto one file here. |
| A shared package (monorepo or npm) for both | Not now. It is the right end state, but it means restructuring the web repo's imports (path aliases, i18n, the editor's coupling to shadcn components) before the app could start. The copied modules are pure and named as on the web, so extracting them later is mechanical. Until then: **a change to one of them is made in both repos** (AGENTS.md). |
| Rewrite the logic for mobile | Rejected. Two implementations of "is this set done, what does it show" will disagree, and the trainer's board and the member's phone show the same workout. |

The web's locale namespaces are copied the same way, so the app speaks exactly
the portal's Spanish and English; strings that only a phone needs are in the
app's own `app` namespace. `check:i18n` keeps es/en in step and fails on a key
the code uses that does not exist.

## Design decision 4: members only

Staff run sessions from the web (the control board, tablets at the floor, the
TVs). An app for both would double the surface and the review risk for no
member value. A staff account is refused at login with a pointer to the web,
and an already signed-in staff session (an old build, a shared phone) is signed
out on the next launch when `/auth/me` reports a non-CLIENT role.

## Design decision 5: the editor on a phone

The web editor is a table with popovers, hover cards and drag handles. On a
phone:

| Web | App | Why |
|---|---|---|
| Sets table, columns sized to the screen | A grid with fixed side columns (type, tick, delete) and metric columns with a minimum width; scrolls sideways only when an exercise has more metrics than the phone is wide | Three metrics fit a 390-pt phone; six do not, and wrapping a set onto two lines breaks the reading of a table. |
| Tab between fields | A field chain: the keyboard's next key, an iOS accessory bar ("Siguiente" / "Listo" — the number pad has no return key) and a full digit budget (3 for kg, 2 for reps) all move to the next field | A set is logged one-handed between sets; tapping each cell is the slow path. |
| Popovers, dropdowns | Bottom sheets (`Sheet`, `ActionSheet`) | Reachable with a thumb, as the web already does below `md` (`ActionMenu`). |
| Drag to reorder (blocks, exercises, a routine's plans, a super-set's sequence) | A reorder sheet: each row moves up or down, saved with "Guardar orden" | A drag inside a scrolling list fights the scroll gesture, and long lists need auto-scroll while dragging — fragile for a rare action. |
| Decimal point | Comma accepted (`60,5`) and normalised | The Spanish number pad types a comma. |
| Hover cards on an exercise name | Tap → the exercise's page | No hover on a phone. |

The keyboard is handled by `react-native-keyboard-controller`, which keeps the
focused field above it. It is not in Expo Go, so the app runs in a development
build (Gotchas).

## Design decision 6: the session control, live without a server push

The trainer's board and the member's phone write the same workout during a
session.

| Option | Verdict |
|---|---|
| **Polling + a socket ping while a session runs** | **Chosen.** The active session is polled every 60 s app-wide and every 4 s on the session control; a workout under way every 8 s. While a session is running and the app is in the foreground, a socket on `/sessions` receives `session-updated` (the session id only) in the member's own room, joined from the verified token — and refetches. |
| Socket only | Rejected. A phone drops its socket every time the screen locks or the network changes; polling is what keeps it right after. |
| Push notifications to wake the app | Not needed for this: the session control is on screen while it matters. Push is decision 9. |

A server copy replaces the screen's copy only when no local edit is pending, so
a poll never eats a half-typed weight. Ticks save at once; values debounce.

Finish is always one tap away: in the workout's header, and — once that header
has scrolled away (live mode scrolls to the current exercise, so it usually
has) — in the session bar pinned on top, next to the progress.

## Design decision 7: the calendar is an agenda and a month

The web calendar has 3-day and week time grids. At a phone's width a week grid
gives each day ~45 pt — a session's name does not fit. The app keeps the
**agenda** (the month's sessions, day by day — the default) and the **month**
(a dot per session, the selected day's sessions below). A running session is
marked "En curso"; tapping it opens the session control, any other opens its
detail.

## Design decision 8: built for the gym floor

- **Live mode** as on the web: every exercise but the current one folds; ticking
  the last set completes the exercise and scrolls to the next.
- **Keep-awake** while a workout is under way — the phone sits on a bench.
- **Haptics** on a tick and on a new record instead of the web's fanfare: a
  sound in a gym is either inaudible or embarrassing. The one exception is the
  Work/Rest player (decision 12): a clock you train to has to be heard.
- **Exercise media on white**, never dimmed — the web's rule
  (`EXERCISE_MEDIA_BG`; `bloomboard-frontend/specs/design-system.md`, *Exercise
  media*). A done row fades its name, not its picture: a white image at half
  opacity took on the screen's blue.
- **Tokens in the Keychain / Keystore**, refreshed silently (30-day refresh,
  re-issued on use): an app opened once a month never asks for the password.

## Design decision 9: no push notifications in the first release

Reminders ("your session starts in an hour"), "your coach changed your plan"
and records shared by a trainer are the obvious next features. They need a
backend piece that does not exist (device tokens per member, a sender, and the
events), Apple/Google push credentials, and a permission prompt worth its
moment. Deferred to a release of their own rather than shipped half-built.

## Design decision 10: the member's theme, the brand's palette

Members always see the **BLOOM** palette (a company's palette is for its staff
and TVs). Light / dark / system is the member's choice, stored on the server
(`/configurations/me`) so web and phone agree, and cached locally so the first
frame is right. Light mode repaints the muted foreground steps darker, as the
web's `html:not(.dark)` overrides do — the alpha helpers on the theme carry
that, so components never pick a colour themselves.

## Design decision 11: one Play listing, two tracks, store builds only

How the app reaches phones (set up 2026-10-06/07; the step-by-step is
`store/google-play/README.md`).

| Question | Chosen | Rejected, and why |
|---|---|---|
| Which listing | A **new** Play app, `pro.bloomboard.app` | Taking over the member app already on Play (built outside this repo): it meant importing its upload key and package name and inheriting its reviews and reviewer account for an app this code does not come from. The business chose to leave it alone. |
| Beta testers | The **internal testing track of the same app**; the `beta` profile builds the store package against the beta API, named "Bloom Board (beta)" | A separate `pro.bloomboard.app.beta` listing: a second app to set up, review and keep in sync. A sideloaded APK (`preview` profile, removed): no updates through the store, and two variants for one branch. |
| What ships | A **store build** on every push to `beta` / `main` (EAS Build + Submit) | Over-the-air updates (EAS Update) on push: faster, but a JavaScript update that needs a newer native module would reach binaries that cannot run it. Prepared (`runtimeVersion`), not wired in. |
| Runtime version | `appVersion` | `fingerprint`: tracks native changes by itself, but hashes the project differently on Windows and on EAS's Linux builders — every build failed with "Runtime version mismatch", and resolving it in the dev server crashed Metro on Windows. The cost: bump `package.json`'s version with any native change. |
| Signing | Upload key generated and held by **EAS**; **Play App Signing** for what users download | A keystore file kept by someone: one more secret to lose, and a lost upload key without Play App Signing means a new listing. |
| Developer account | **Organization** | Personal: a closed test with 12 testers for 14 days before any production release. |

Google requires two things of an app with sign-up that the product did not have:
**account deletion inside the app** (*Perfil › Eliminar cuenta*, backed by
`DELETE /me` — backend decision 9 in `specs/member-portal.md`) and a public
**deletion URL** (`bloomboard.pro/privacy/#eliminar-cuenta`). Both shipped in
2.1.0 on the app, the web portal and the landing before the first review.

## Design decision 12: the Work/Rest player, with sound (2.2.0)

In a workout, a Work/Rest block shows **Empezar**: a full-screen modal that runs
the block as the TV does — 3-2-1, the work clock over the demo, the rest clock
with the next exercise, the slot rail, a "Siguiente · …" line during work, and
the cues. Pause, close; nothing is logged. The web has the same player
(`bloomboard-frontend/specs/work-rest-mode.md`, *The member's player*).

| Choice | Why |
|---|---|
| **The TV's timeline, ported** (`features/workouts/lib/work-rest-timeline.ts`, with the web's test suite) | The same block must time the same on the wall and on a phone. Only the demo size differs: `large` (720p), not the wall's 1080p. |
| **`expo-audio` playing four WAVs** (`assets/sounds/work-rest-*.wav`) | React Native has no Web Audio, so the web's synthesised tones are rendered once to files by `scripts/work-rest-sounds.mjs` (same frequencies, offsets, lengths and ramps). Each cue is a preloaded player, so one landing on the second never waits for a load. |
| **No `expo-audio` config plugin** | With its defaults it adds `RECORD_AUDIO` and media-playback foreground-service permissions (and an iOS microphone string) — Play wants declarations for those, and playback needs none of it. Autolinking alone merges only `MODIFY_AUDIO_SETTINGS`. |
| **`mixWithOthers`, plays in silent mode** | Members train with music: the cues sound over it instead of stopping it, and the iOS ring switch does not mute a workout clock. |
| **Haptics with the cues** (heavy on go / rest, success at the end) | The phone is on the floor or in a pocket. Not on every lead-in tick — that would be noise. |
| **Always dark** (`SchemeOverride`) | As the TV it mirrors; the colours (accent work, orange rest, green done) were tuned on a dark wall. |

**`expo-audio` is a native module**: the first build with it is a new store
build, and the version must be bumped (`runtimeVersion: appVersion`) — an
over-the-air update could never deliver it to a 2.1.0 binary.

## File map

| Area | Where |
|---|---|
| Routes | `src/app/` — `(member)/(tabs)/*` the five tabs, `(member)/session`, `sessions/[sessionId]`, `templates/[templateId]`, `workouts/[workoutId]`, `exercises/[exerciseId]/*`; `login`, `register`, `activate/*` |
| Auth | `src/features/auth/` — `auth.store.ts`, `AppEffects.tsx`, screens |
| Session control, pill, socket, plan | `src/features/member/` |
| Editor (shared by plans, workouts, session) | `src/features/editor/` — `lib/` copied from the web; `widgets/` native |
| Workouts, finish flow, records, progress, the Work/Rest player | `src/features/workouts/` (`widgets/WorkRestPlayer.tsx`, `lib/work-rest-timeline.ts`) |
| Work/Rest cue sounds | `assets/sounds/`, generated by `scripts/work-rest-sounds.mjs` |
| Exercises | `src/features/exercises/` |
| Calendar | `src/features/calendar/` |
| API client, refresh, coded errors, services | `src/shared/api/` |
| Theme, UI kit | `src/shared/theme/`, `src/shared/ui/` |
| Native config, variants | `app.config.ts`, `eas.json` |

More in `docs/ARCHITECTURE.md`.

## Gotchas

- **Expo Go cannot run it** (`react-native-keyboard-controller`). Use a
  development build.
- **Members are default-denied** on the backend. A new call needs its route open
  to CLIENT, in `bloomboard-backend`, deployed first — else a 403 the axios
  interceptor toasts.
- **A separate member app is on Google Play**, built outside this repo; it
  calls `POST /auth/select-center` after login. This app ships as its own new
  listing (`pro.bloomboard.app`) and does not replace it, but backend changes
  that restrict members can still break that one.
- **Typed routes are generated.** `npm run typecheck` generates them; a bare
  `tsc` passes without them and checks no href.
- **The web build is not the phone.** It is good for layout and flows in
  Playwright, but a browser `<input>` defaults to ~20 characters wide (the
  metric input zeroes its width on web), there is no keyboard accessory, no
  haptics, and secure storage falls back to `localStorage`.
- **Login is throttled** (5 attempts / 15 min per IP) — a test script that
  signs in on every run locks itself out; reuse a session.
- **React Compiler + refs:** reading `useRef().current` during render fails
  lint (`react-hooks/refs`). An `Animated.Value` read by styles lives in
  `useState(() => new Animated.Value(0))`.
- **Every release is a store build** (push to `beta` → Play internal testing,
  `main` → production). Over-the-air updates are prepared but not wired in
  (`docs/RELEASING.md`). On EAS's free plan a build waits **2–3 hours** in a
  queue, and `eas build` uploads the local committed project, not GitHub.
- **Bump the version with any native change** (`runtimeVersion: appVersion`) —
  otherwise a future over-the-air update could reach a binary it does not fit.
- **On a real phone from Windows:** firewall rule, the connected adapter's LAN
  address, wireless adb pairing, native builds from a short path with JDK 22 —
  `docs/DEVELOPMENT.md`. `adb shell input text` into a dev build reloads it on
  any "rr".

## Known issues

- **Finish summary, a record without its unit:** "Peso máximo — 30" for the
  seated military press, while the bench press shows "52.5 kg". Seen on
  2026-10-06 with a demo member; to fix in the next release (and check the web's
  copy of the same summary).

## Verification

Automated (CI): `format:check`, `lint:check`, `npm test` (logging rules, metric
columns, calendar grid), `typecheck` (with typed routes), `check:i18n`,
`bundle:check` (Hermes, Android + iOS).

By hand, against a local 2.0.0 backend with a CLIENT that has a center, a
session now and one tomorrow with a plan:

1. Sign in; a staff account is refused. Sign out and back in: no password asked
   on relaunch.
2. Calendario: agenda and month; today's session marked "En curso" → session
   control; tomorrow's → its detail with the plan.
3. Session control: log a value, tick a set; reload the app — both kept. Move
   to a TV. Scroll down: Finish appears in the bar. Finish → summary →
   "¿Qué tal ha ido?" → the finished workout. The trainer's board shows the
   ticks within seconds (socket) and the member off the TV.
4. Entrenos: start an empty workout, add an exercise (metrics sheet), log
   60 × 8, tick — the exercise completes and folds; Finish → summary shows the
   volume (960 kg for two such sets).
5. Rutinas: create a routine, a plan in it; plan 80 × 5; reload — kept;
   "Entrenar" starts a workout from it. Free limits: a 2nd routine opens the
   upgrade sheet.
6. Ejercicios: search, filter, open one (stats, progress), create an own
   exercise, copy a company's one.
7. Perfil: change theme (follows to the web), language, personal details.
8. Dark and light, Spanish and English; Android and iOS.

Steps 2–5 were also driven in a browser build with Playwright at 390 × 844,
light and dark, with no console or HTTP errors. On 2026-10-06 the same flows
ran on a Pixel 7 (development build against the local backend) with a demo
member, and the store build 2.1.0 (5) was installed from Play's internal
testing track against production.
