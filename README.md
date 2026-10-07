# Bloom Board — Mobile 📱

The **Bloom Board member app** for Android and iOS. Everything a member has on
the web portal, on their phone: their sessions at the centers that run on Bloom
Board, control of the session while it is on (log, tick, move between TVs),
their own routines, plans and exercises, every workout they train — at the
center or on their own — with records and progress, and their profile and plan.

One of four Bloom Board repos:

| Repo | Role | Where |
|------|------|-------|
| bloomboard-backend | REST + WebSocket API | `service.bloomboard.pro`, `beta.service.bloomboard.pro` |
| bloomboard-frontend | Staff portal, TVs, member web portal | `app.bloomboard.pro`, `beta.app.bloomboard.pro` |
| bloomboard-landing | Marketing site | `bloomboard.pro`, `beta.bloomboard.pro` |
| **bloomboard-mobile** (this) | Member app | Google Play `pro.bloomboard.app` (internal testing ← `beta`, production ← `main`) |

## Stack

- **React Native** + **Expo SDK 57** — managed workflow, Continuous Native
  Generation (no `ios/` / `android/` in git), **EAS** Build, Submit and Update
- **Expo Router** — file-based routing (`src/app/`), typed routes
- **TanStack Query** — server state; **Zustand** — client state
- **Axios** — HTTP, with token refresh; **Socket.IO client** — live session pings
- **i18next** — Spanish default, English available (the web's namespaces)
- **expo-secure-store** — tokens in the Keychain / Keystore
- **React Compiler**, TypeScript strict, Jest (`jest-expo`)

## Quick start

```bash
npm install
npm start          # Metro; press a (Android), i (iOS), or scan with a dev build
```

> **Prerequisites:** Node ≥ 22. A backend at **2.0.0 or later** (workouts) —
> local on `:3000`, or point at beta with `.env` (see
> [`.env.example`](.env.example)). Android Studio for the emulator, Xcode for
> the iOS simulator.

With no `.env`, the app calls port 3000 on the machine running Metro, by its LAN
address — a phone on the same Wi-Fi reaches your local backend as is.

The app runs in a **development build**, not Expo Go: it uses
`react-native-keyboard-controller`, which Expo Go does not ship. Build one once
(`eas build --profile development`, or locally — on Windows from a short path,
see [docs/DEVELOPMENT.md](docs/DEVELOPMENT.md)); after that `npm start` is
enough until a native dependency changes.

**Status (2026-10-07):** on Google Play as `pro.bloomboard.app` — 2.1.0 (5) on
internal testing and in its first production review. Details and what is
pending: [store/google-play/README.md](store/google-play/README.md).

## Scripts

| Script | Description |
|--------|-------------|
| `npm start` | Metro dev server |
| `npm run typecheck` | Typed routes + `tsc` |
| `npm run lint:check` / `format:check` | Lint / format checks (`:fix` to apply) |
| `npm test` | Unit tests (pure modules) |
| `npm run check:i18n` | es/en parity, every key the code uses exists |
| `npm run bundle:check` | Android + iOS Hermes bundles compile |
| `npm run doctor` | `expo-doctor` dependency checks |

## Documentation

- [AGENTS.md](AGENTS.md) — commands, the checks to run, conventions
- [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) — structure, navigation, state, auth, real time
- [docs/DEVELOPMENT.md](docs/DEVELOPMENT.md) — running it on a phone (Windows: firewall, LAN address, wireless adb, native builds)
- [docs/ENVIRONMENTS.md](docs/ENVIRONMENTS.md) — EAS project, profiles, identifiers, secrets
- [docs/RELEASING.md](docs/RELEASING.md) — store builds on push, versions, rollbacks
- [store/google-play/README.md](store/google-play/README.md) — publishing on Google Play, step by step
- [specs/member-app.md](specs/member-app.md) — who it is for and the design decisions
