# 📱 Member App — Mobile

What it mirrors: `bloomboard-frontend/specs/member-portal.md` and
`bloomboard-frontend/specs/workouts.md`. The contract:
`bloomboard-backend/specs/member-portal.md`, `member-access.md` and
`workouts.md`; for measurements and the Hevy import,
`bloomboard-backend/specs/body-measurements.md` and `hevy-import.md`.

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

Since 2.5.0 (decision 16) it has three tabs:

| Tab | What |
|---|---|
| **Calendario** (only with sessions) | agenda and month of their sessions across centers; a session's detail and plan; the running one opens the session control |
| **Rutinas** | where training starts: an empty workout at the top, then their own routines and plans (create, rename, reorder, delete, edit in the editor) and each company's (read-only), every workout a card with its exercises and **Empezar entrenamiento** |
| **Perfil** | photo, name (or nickname) and how many workouts they have done; **Ejercicios** (catalog, their own and their companies'; filters; create / edit / copy; stats and usages), **Medidas** (last 3 months, last year or all), **Calendario** (their workouts by the month, the streak of weeks and the rest days); then every workout they have done, newest first. The gear opens **Ajustes**: Cuenta (Perfil — details and where they train; Cuenta — password and **delete account**, password- or Google-confirmed, `DELETE /me`, required by Google Play; Suscripción — plan, limits and usage, Pro "Próximamente"), Preferencias (units, language, light/dark, the Hevy import), Ayuda (FAQ, Contáctanos, Sobre Bloom Board) and signing out |

A workout — live, or finished and opened from the profile or the calendar — is its own
screen; a finished one opens read-only until **Editar**.

Plus, on every screen while a session is on: the live pill leading to the
session control. Sign-up, sign-in and activation (a member a center created
claims their account by email) are the web's flows.

Not in the app: anything staff (they are refused at sign-in), the TV, help
center articles, push notifications (see decision 9; the one local
notification — the workout under way — is decision 17).

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
│   📅      📋      👤   │   │                      │   │                      │
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
| Live workout: every exercise but the current one folded, a tick per exercise beside the sets' (from `md` up) | Nothing folds, and the sets carry the only ticks — an exercise with no metrics keeps its own, or it could never be done. No `toggleCollapsed` / `SessionCollapseToggle` here. | The web's phone layout (its `TemplateSessionView.compact`, `bloomboard-frontend/specs/workouts.md` decision 8): the member logs sets; the exercise tick is a trainer's, on the board. |

The keyboard is handled by `react-native-keyboard-controller`, which keeps the
focused field above it. It is not in Expo Go, so the app runs in a development
build (Gotchas).

The logging rules are the web's, copied (`workout-cells.ts`, `set-comment.ts`,
`workout-set.types.ts`): ticking a set keeps its hints as values (the plan's,
else last time's), the plan's notes are the placeholders of the trainee's own
(`planNotes`, backend 2.4.0 — an older backend sends none and the fields fall
back to their usual placeholders), and the RPE and option cells draw their hint
exactly as `DraftInput` draws a placeholder (`CellHint`).

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

*Still true for pushes. Since 2.5.0 the app posts one local notification of its
own — the workout under way, decision 17 — which needs no server and no push
credentials.*

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
| Upload to Play | **EAS Submit** after each build, with a Google service account whose key lives in EAS (2026-10-11); internal testing `releaseStatus: completed` (testers get it at once); **production `releaseStatus: draft`** since 2026-10-14 — the release waits in Play Console for its notes and is sent for review by hand | Uploading the `.aab` by hand: what builds 2.1.0 (5) and, before the key existed, 2.2.0 (6)/(7) needed. `completed` for production (2.2.0–2.5.0) sent releases to review with no notes: EAS Submit cannot attach them, and editing a release in review can restart it. |

Google requires two things of an app with sign-up that the product did not have:
**account deletion inside the app** (*Perfil › Eliminar cuenta*, since 2.5.0 *Perfil › Ajustes › Cuenta › Eliminar cuenta*, backed by
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

## Design decision 13: body measurements and the Hevy import (2.5.0 API)

Two screens over the tabs, reached from Perfil → **Tus datos**, mirroring the
web's `/me/measurements` and `/me/import`
(`bloomboard-frontend/specs/body-measurements.md`, `hevy-import.md`):

- **Medidas** (`(member)/measurements`): the latest value of each measure with
  its change, the evolution chart (the workouts' `ProgressChart`, fed one
  measure at a time), the history with edit / delete, and a full sheet to record
  one at a date and time (`DateField mode="datetime"`). The list is the same one
  their trainers read and write from the client profile; each row says who
  wrote it.
- **Importar desde Hevy** (`(member)/import`): how to export from Hevy, the
  files (`expo-document-picker`), a review of every exercise (match to one here,
  create as their own — counted against the Free plan's 10 —, or not import),
  then the outcome. Nothing is written before the member confirms.

| Choice | Why |
|---|---|
| **The web's logic copied** (`features/measurements/lib/measurements.ts`, `features/imports/lib/decisions.ts`, with their tests) | Decision 3: the same units, limits and decision rules on both. |
| **Files sent as `{ uri, name, type }`** (the web build sends the `File`) | React Native's `FormData` reads the file from its URI; the multipart header is set by hand, the axios default would send JSON. |
| **Long timeouts** (90 s to read, 180 s to import) | A few years of Hevy is thousands of rows; the server parses and matches them in one request. |

**`expo-document-picker` is a native module**: like `expo-audio`, it needs a new
store build and a version bump. The screens need backend **2.5.0**; against an
older one both are 404s.

## Design decision 14: Google Sign-In (2.6.0 API)

"Continuar con Google" on the login, register and activation screens, and "Confirma que
eres tú" with Google when an account without a password is deleted — the web's flows
(`bloomboard-frontend/specs/google-sign-in.md`, backend `specs/google-sign-in.md`).

| Choice | Why |
|---|---|
| **Native Google Sign-In** (`@react-native-google-signin/google-signin`) asking for an ID token for the **Web** client (`EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID`) | The API accepts one audience for web and phone. Google knows the app by its package and signing certificate — the Android OAuth clients in Google Cloud: Play's app-signing key, EAS's upload key, and the debug keystore for `pro.bloomboard.app.dev`. A build signed with a key Google does not know gets `DEVELOPER_ERROR`. |
| Rejected: a browser flow (`expo-auth-session`) | A browser tab and a redirect for what the system account picker does in one tap. |
| **The account picker every time** (`signOut` before `signIn`) | Shared phones, and members with a personal and a work Google account. |
| **Drawn to Google's guidelines** (four-colour G, neutral outline / dark fill) | Their branding rules; the app's palette does not apply to it. |
| **Staff refused after Google, as after a password** | The app is for members; their Google account stays linked for the web. |
| **No config plugin yet** | On Android autolinking is all it needs; the plugin only adds the iOS URL scheme, which comes with an iOS OAuth client when iOS ships. |

A **native module**: a new store build and a version bump. Without the env var, or on the
web export, no Google buttons render.

## Design decision 15: units and the metrics cleanup (2.7.0 API)

The web's 2.7.0 round, ported as-is (`bloomboard-frontend/specs/metrics-and-units.md`, backend
`specs/metrics-and-units.md`):

| Choice | Why |
|---|---|
| **Unidades** on Perfil (Métrico · kg, km, cm / Imperial · lb, mi, in), saved to the account (`PATCH /configurations/me { unitSystem }`) | The same setting as on the web; read through the configuration query `AppEffects` already makes (`features/units/useUnitSystem.ts`). |
| **Display-only conversion** — the editor converts at render (`SetsEditor`, `SuperSetCard` view) and saves untouched values exactly as stored (`shared/lib/unit-system.ts`, `features/editor/lib/display-sets.ts`) | A coach's plan in kg reads in lb for a member who reads lb; only what the member types is saved in lb. |
| **A composite's unit in two pickers** (numerator / denominator, `CompositeUnitPicker` in `MetricSelectorSheet`), the label above them | Two segmented controls side by side leave no room for the label on a phone. |
| **Plan-only metrics** (TEMPO, CARDIO_ZONE, REST) read-only in a workout; **REVOLUTIONS** not offered alone | `Metric.isPlanOnly` / `isHidden`, as on the web. |
| Records, charts, measurements (lb, in), the Work/Rest player and the references sheet read in the member's units | Same helpers as the web: `records.ts`, `measurements.ts`, `workoutInUnits`. |

JavaScript only — no native module. It is still a store build, because the version moved and
updates are keyed to it (`runtimeVersion: appVersion`).

## Design decision 16: three tabs — training starts in Rutinas, the profile is the record (2.5.0, backend 2.9.0)

The user's redesign brief (2026-10-13): simpler, cleaner, easier — modelled on how gym
loggers like Hevy are laid out.

| Choice | Why |
|---|---|
| **Entrenos and Ejercicios are no longer tabs.** Workouts live in the profile (an endless list) and its calendar; exercises behind a profile tile (`/exercises`, a pushed screen) and in the editor's add/replace picker | Five tabs were five places to look. What a member does every day is start a workout and look back at them. |
| **Starting is on Rutinas**: *Empezar entrenamiento vacío* on top (*Continuar entrenamiento* while one of their own is under way), and *Empezar entrenamiento* under every workout card — their own and their coach's | Starting was two taps away in a sheet on another tab. A coach's routine loses its "Preparada por X · solo lectura" line: the missing ⋯ already says it, and the plan screen still says so. |
| **Workout cards are big**: name, description, the plan's exercises (two lines), the Start button; no chevron | The card *is* the button to open the plan; the arrow added nothing. |
| **The profile is the record**: name or nickname, the number of workouts (`GET /me/workouts/summary`), three tiles (Ejercicios, Medidas, Calendario), then the history — date and time, name, description, duration, exercises done, sets done (`WorkoutCard`) | What a member wants from "me" is what they have done. |
| **Calendario (workouts)**: a month grid with every trained day filled in the accent, the chosen day's workouts under it, and on top the **streak** (weeks in a row with at least one, Monday–Sunday, counted on the server in the phone's time zone) and the **rest days** since the last one (counted on the phone) | Backend `specs/workouts.md` → Training summary. Only finished workouts count; the week under way never breaks the streak. Not to be confused with the **Calendario tab** (sessions). |
| **Ajustes** behind the profile's gear, grouped Cuenta / Preferencias / Ayuda; a choice of units, language or theme opens an option sheet | Everything that is not training out of the way. The unit choice stays the one metric/imperial switch (the user's call, 2026-10-13: per-dimension units would need backend and web work). |
| **Cuenta › Cambiar contraseña** (`POST /me/password`): current password, or — for a Google-only account — *Crear una contraseña* confirmed with Google | Backend `specs/member-portal.md` decision 10. |
| **Suscripción** shows the plan, limits and usage; Pro "Próximamente", nothing to cancel | Members cannot pay yet (the user's call, 2026-10-13). A paid plan in an Android app must go through Google Play Billing — its own project. |
| **Ayuda**: the FAQ the team writes in the admin portal, *Contáctanos* (a suggestion or a problem, sent with the app version, system and language, read in the admin's Buzón), *Sobre Bloom Board* (web, email, privacy policy, Instagram / Facebook / LinkedIn, version) | Backend `specs/member-help.md`. The FAQ is data so it changes without a store build. Brand marks are drawn in lucide's style (`SocialIcons.tsx`): lucide 1.x dropped them. |
| **A finished workout opens read-only**; *Editar* turns the editor on (the same cards, the plan as placeholders), *Hecho* turns it off, pinned at the top once the header scrolls away; the ⋯ keeps *Nombre, hora y nota*, *Reanudar* and *Eliminar* | Scrolling through a past workout should never nudge a value. |
| **Medidas**: the evolution chart and the list of days narrowed to the last 3 months (default), the last year or all time | Asked for in the brief. The latest-values cards stay all-time. |

**Account deletion moved** to *Perfil › Ajustes › Cuenta › Eliminar cuenta*: the privacy policy
(landing `src/legal/privacy.ts`, §10), the Play listing's notes and the web's help article
`client-accounts` name the new path. The policy also lists the new data: *Mensajes que nos
envías*. On Play's *Data safety*, feedback is "Other user-generated content" — already
declared; add "Developer communications" to its purposes (`store/google-play/listing.md`).

**Needs backend 2.9.0 live first.** On an older one the workout count and the calendar's
streak are empty (404), the FAQ, *Contáctanos* and the password change fail with a toast, and
the calendar month ignores `from`/`to` (it shows the latest 100 workouts' days — still right
for a recent month).

## Design decision 17: the workout under way in the shade, an icon per build (2.5.0)

The user's second brief of 2026-10-13.

| Choice | Why |
|---|---|
| **A notification while a workout is under way** (theirs or a session's): the exercise that is up, "Serie 2 de 4 · 50 kg · 8 reps" (what was logged, else the plan, else last time, in the member's units), the workout's name; **Completar serie** ticks that set | The phone sits locked on the bench; the next set should be one glance — and one tap — away. Same "current" as the workout screen (`features/workouts/notification/content.ts`). |
| **expo-notifications, local only**, one notification per workout replaced in place, `sticky` (Android ongoing), on a **silent LOW channel** ("Entrenamiento en curso") so updates never buzz; shown in the shade with the app open too, never as a banner | The user's call (2026-10-13) over a native module of our own: standard, low risk. **Android shows no photo**: expo-notifications only draws an image for a remote push. iOS gets the exercise's photo as an attachment (written, not yet run: iOS is not shipped). |
| **Completar serie** fills the set's empty fields as a tick in the table does (`withPlaceholderValues`) and saves the exercise (`PATCH …/exercises/:entryId`); the server completes the exercise with its last set, so the notification moves on | One code path with the sets table, so a set ticked from the shade reads exactly like one ticked on screen. A set already ticked is left alone, so the tap is safe twice. |
| **App open**: the member layout's listener handles the button and the tap (opens the workout). **App in the background or closed**: a background task (`task.ts`, Android) — expo-task-manager starts the bundle headless; the task restores the session, language and units, ticks, and redraws | Why the entry is **`index.ts`** (task first, then `expo-router/entry`): the task must be defined before anything runs. |
| **No button inside a super-set** (the text still shows) | A super-set's sets are saved as one sequence (`PUT …/sequence`); ticking one member from the shade would need the whole sequence rebuilt. |
| **Permission asked when a workout starts**, once (Android 13+); denied, the app simply shows none. Signing out clears it; finishing or discarding takes it away | The prompt means something at that moment. |
| **The icon is the `a` mark alone**, coloured per build like the web's favicon — production blue, beta amber, development green (`scripts/app-icons.mjs`, picked by `APP_ENV` in `app.config.ts`); the splash keeps the full lockup; the status-bar icon is the mark in white | "BLOOM" over the mark was illegible at launcher size. Beta shares production's package (Play internal testing), so a tester's phone shows amber until the production build replaces it. |
| **The floating pill can discard** the member's own workout (a trash beside it, confirmed); **Discard** moved from beside Finish to the foot of the workout | Throwing a workout away should be possible from anywhere, and should never sit next to the button you press to finish. |
| **The set type and the tick are as tall as the value fields** (40, `FIELD_HEIGHT`) | One line of equal controls per set. |

Native modules added: `expo-notifications`, `expo-task-manager`, `expo-file-system` — a
new native build (it is in 2.5.0's store build anyway).

## File map

| Area | Where |
|---|---|
| Routes | `src/app/` — `(member)/(tabs)/*` the tabs (calendar, routines, profile), `(member)/session`, `measurements`, `import`, `exercises/*`, `settings/*`, `sessions/[sessionId]`, `templates/[templateId]`, `workouts/[workoutId]`, `workouts/calendar`; `login`, `register`, `activate/*` |
| Auth | `src/features/auth/` — `auth.store.ts`, `AppEffects.tsx`, screens |
| Session control, pill, socket, plan | `src/features/member/` |
| Editor (shared by plans, workouts, session) | `src/features/editor/` — `lib/` copied from the web; `widgets/` native |
| Workouts, finish flow, records, progress, the Work/Rest player, the workout calendar | `src/features/workouts/` (`WorkoutCalendarScreen.tsx`, `widgets/WorkoutCard.tsx`, `widgets/WorkRestPlayer.tsx`, `lib/training.ts`, `lib/work-rest-timeline.ts`) |
| The workout notification | `src/features/workouts/notification/` (`content.ts` pure + tested, `notification.ts`, `useWorkoutNotification.ts`, `task.ts`); `index.ts` (entry) |
| App icons | `scripts/app-icons.mjs` → `assets/images/icon*.png`, `android-icon-*.png`, `notification-icon.png`, `store/google-play/graphics/icon-512.png` |
| Profile | `src/features/profile/ProfileScreen.tsx` |
| Ajustes (account, preferences, help) | `src/features/settings/` (`widgets/SettingsList.tsx`, `links.ts`) |
| Work/Rest cue sounds | `assets/sounds/`, generated by `scripts/work-rest-sounds.mjs` |
| Exercises | `src/features/exercises/` |
| Calendar | `src/features/calendar/` |
| Body measurements | `src/features/measurements/` (`MeasurementsScreen.tsx`, `widgets/MeasurementSheet.tsx`) |
| Hevy import | `src/features/imports/` (`HevyImportScreen.tsx`, `widgets/ExerciseDecisionCard.tsx`) |
| Google Sign-In | `src/features/auth/google.ts` (picker → ID token), `GoogleSignInButton.tsx` (button, `useGoogleSignIn`, divider, consent) |
| API client, refresh, coded errors, services | `src/shared/api/` |
| Theme, UI kit | `src/shared/theme/`, `src/shared/ui/` |
| Native config, variants | `app.config.ts`, `eas.json` |

More in `docs/ARCHITECTURE.md`.

## Gotchas

- **Don't remove a query something still watches.** `removeQueries` on a key
  with an active observer makes that observer fetch it again — after a delete,
  a 404 the request's toast shows ("Workout … not found" on discarding, seen
  on the phone: the workout notification watches the active workout; the web
  build has no notification, so it never showed there). After deleting a
  workout, `forgetWorkout` (features/workouts/hooks.ts) clears the active
  workout and lets the cached copy expire.
- **A sheet is sized by the space left, never in pixels.** A full sheet of a
  fixed height overflowed upwards when the keyboard opened (the exercise
  picker's title and search field went off the top): `Sheet` fills the
  keyboard-avoiding area with flex instead.
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

- **App 2.5.0 against a backend older than 2.9.0:** the profile's workout count
  and the calendar's streak stay empty, and the FAQ, Contáctanos and the
  password change answer 404 (toasted); the calendar month ignores `from`/`to`
  (it shows the latest 100 workouts' days). Ship backend 2.9.0 first.

- **App 2.4.0 against a backend older than 2.7.0:** the old backend drops the unknown
  `unitSystem` (whitelist), so Unidades snaps back to Métrico; and composite units in the new
  form (`KILOMETERS/HOURS`) are refused when a set is saved. Ship backend 2.7.0 first.

- **App 2.3.0 against a backend older than 2.6.0:** "Continuar con Google"
  reaches no `/auth/google` and ends in the generic Google error. Ship backend
  2.6.0 first.

- **App 2.2.0 against a backend older than 2.5.0:** Medidas and Importar desde
  Hevy answer 404 (the axios interceptor toasts it). Ship backend 2.5.0 first.

- **Store build 2.1.0 against backend 2.4.0:** it keeps working (nothing it
  calls was removed), but until the next store build its members do not see the
  plan's exercise notes and set comments in a workout — 2.1.0 draws only the
  trainee's own notes, and since backend 2.4.0 the plan's are a separate field
  (`planNotes`) shown as the placeholder. The trainer's note shows in the
  workout header without "Nota de X", and a client with no plan whose trainer
  took a note sees an empty workout holding it. Details:
  `bloomboard-backend/specs/workouts.md` → Compatibility.

- **Finish summary, a record without its unit:** "Peso máximo — 30" for the
  seated military press, while the bench press shows "52.5 kg". Seen on
  2026-10-06 with a demo member; to fix in the next release (and check the web's
  copy of the same summary).

## Verification

Automated (CI): `format:check`, `lint:check`, `npm test` (logging rules, metric
columns, calendar grid), `typecheck` (with typed routes), `check:i18n`,
`bundle:check` (Hermes, Android + iOS).

By hand, against a local backend of the same round (2.9.0 for 2.5.0) with a
CLIENT that has a center, a session now and one tomorrow with a plan:

1. Sign in; a staff account is refused. Sign out and back in: no password asked
   on relaunch.
2. Calendario: agenda and month; today's session marked "En curso" → session
   control; tomorrow's → its detail with the plan.
3. Session control: log a value, tick a set; reload the app — both kept. Move
   to a TV. Scroll down: Finish appears in the bar. Finish → summary →
   "¿Qué tal ha ido?" → the finished workout. The trainer's board shows the
   ticks within seconds (socket) and the member off the TV.
4. Rutinas: "Empezar entrenamiento vacío", add an exercise (metrics sheet), log
   60 × 8, tick — the exercise completes; the floating bar leads back to it and
   its trash discards it (confirmed). Finish → summary shows the volume (960 kg
   for two such sets); the finished workout opens read-only, Editar … Hecho.
5. Rutinas: create a routine, a plan in it; plan 80 × 5; reload — kept; its
   card's "Empezar entrenamiento" starts a workout from it. Free limits: a 2nd
   routine opens the upgrade sheet.
6. Perfil: the count, the history (scroll for more); Ejercicios (search,
   filter, open one, create an own exercise, copy a company's); Medidas (3
   months / year / all); Calendario (trained days, the streak, the rest days).
7. Ajustes: details, password (wrong one refused), plan, units, language,
   theme (follows to the web), the FAQ, Contáctanos (arrives in the admin's
   Buzón), Sobre Bloom Board's links.
8. On a phone only: during a workout, lock it — the notification shows the
   exercise and the set; "Completar serie" ticks it and the notification moves
   on, also with the app swiped away (Metro running for a dev build).
9. Dark and light, Spanish and English; Android and iOS.

Steps 2–5 were also driven in a browser build with Playwright at 390 × 844,
light and dark, with no console or HTTP errors — and on 2026-10-13 steps 4–7 of
2.5.0 (the browser build has no notification shade: step 8 needs the phone). On 2026-10-06 the same flows
ran on a Pixel 7 (development build against the local backend) with a demo
member, and the store build 2.1.0 (5) was installed from Play's internal
testing track against production.
