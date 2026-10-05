# Releasing — Mobile

A web deploy replaces the app for everyone at once. A phone app does not: each
member runs the binary they installed, and only its **JavaScript** can be
replaced over the air. So there are two ways a change reaches members, and the
question for every change is which one it needs.

| Change | How it ships | Reaches members |
|--------|--------------|-----------------|
| Screens, logic, copy, styles, translations, images under `assets/` | **EAS Update** (over the air) on push to `beta` / `main` | On the next launch after download (≈ seconds to a day) |
| A native dependency added, removed or upgraded; an Expo SDK upgrade; anything in `app.config.ts` that is native (permissions, plugins, icon, splash, identifiers) | **Store build** (`eas build` + `eas submit`) | After store review and the member updating |

The safety net is `runtimeVersion: { policy: 'fingerprint' }`: an update is
stamped with a hash of the native project it was built against, and a binary
only accepts updates with its own hash. A JavaScript change that needs a newer
native module therefore never reaches an old binary that would crash on it — it
simply waits for the store build. The flip side: after a native change, pushing
to `main` publishes an update nobody can run until that build is out. When
unsure, `npx eas-cli fingerprint:compare` against the last build tells you.

## Branches

```
feature branch ──PR──► develop ──merge──► beta ──merge──► main
                       CI only            EAS update        EAS update
                                          → channel beta    → channel production
                                                            + tag v<version>
```

| Branch | On push |
|--------|---------|
| `develop` | CI (format, lint, test, typecheck, i18n, both bundles) |
| `beta` | `deploy-beta.yml`: `eas update --channel beta` |
| `main` | `deploy-production.yml`: `eas update --channel production`, then tag `v<version>` if new |

Promotions are plain merges pushed directly, as in the other repos; promote
from a green `develop`. **Don't push `beta` or `main` unless that is the
intent** — it reaches phones.

## Store builds

Run from the **Build** workflow (`build.yml`, manual: profile, platform,
submit) or locally:

```bash
npx eas-cli build --profile preview --platform all      # internal testers (beta API)
npx eas-cli build --profile production --platform all   # store binaries
npx eas-cli submit --profile production --platform all  # upload the latest build
```

- `preview` builds install directly on registered devices (iOS ad-hoc) or as an
  APK — no store involved. Use them to test a native change before production.
- `production` build numbers (`buildNumber` / `versionCode`) are managed by EAS
  (`appVersionSource: remote`, `autoIncrement`) — never edit them by hand.
- iOS review takes a day or two; Android usually hours. Ship native changes
  ahead of the JavaScript that needs them when you can.

## Versions

`package.json`'s `version` is the app's user-visible version (`app.config.ts`
reads it). The release flow is the one the other repos use:

1. Branch `feature/<name>` off `develop`, commit the change.
2. `chore(release): X.Y.Z` — `npm version X.Y.Z --no-git-tag-version`, plus the
   docs and specs the change touched.
3. `git merge --no-ff` into `develop`, then `git tag -a vX.Y.Z -m "Release vX.Y.Z"`
   on the merge commit.

Bump it when a release changes something members can see. A store submission
needs a version above the one live on the App Store; build numbers within a
version are EAS's job.

The app's version is not tied to the backend's: this repo started at 2.0.0
because that is the API it needs, and moves on its own from there.

## Rolling back

- **An update:** `eas update:republish` the previous update group onto the
  channel (or `eas channel:rollout` back). Phones pick it up on the next launch.
- **A store build:** there is no un-shipping a binary. Ship a fix as an update
  if it is JavaScript; otherwise a new build. On Google Play, a staged rollout
  can be halted.
