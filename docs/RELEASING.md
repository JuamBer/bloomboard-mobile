# Releasing — Mobile

A web deploy replaces the app for everyone at once. A phone app does not: each
member runs the binary they installed from the store, and a new version reaches
them only through the store. So every release here is a **store build**, made by
EAS (Expo's build service) and submitted to Google Play by GitHub Actions.

First-time setup of the Play listing and the accounts:
`store/google-play/README.md`.

## Branches

```
feature branch ──PR──► develop ──merge──► beta ──merge──► main
                       CI only            build →           build →
                                          Play internal     Play production
                                          testing           + tag v<version>
```

| Branch | On push |
|--------|---------|
| `develop` | CI (format, lint, test, typecheck, i18n, both bundles) |
| `beta` | `deploy-beta.yml`: `eas build --profile beta` → submitted to Play **internal testing** |
| `main` | `deploy-production.yml`: `eas build --profile production` → submitted to Play **production**, then tag `v<version>` if new |

Promotions are plain merges pushed directly, as in the other repos; promote
from a green `develop`. **Don't push `beta` or `main` unless that is the
intent** — it builds and ships.

The workflow only queues the build and returns in about a minute. The build
itself runs on EAS (10–20 minutes, longer in the free tier's queue), and EAS
submits it when it finishes. Follow it on expo.dev → the project → *Builds*;
a failed build or submission is emailed to the account.

- **Internal testing**: testers on the Play opt-in list get the update from the
  Play Store within minutes of the upload.
- **Production**: Google reviews every release (usually hours, sometimes a few
  days), then rolls it out.

Until the app's first production release is published by hand, Google only
accepts **draft** releases through the API, so both submit profiles in
`eas.json` say `"releaseStatus": "draft"` — the build lands in the track and you
press *Roll out* in Play Console. Once the app is live, set both to
`"completed"` and pushes go out on their own.

## Manual builds

The **Build Mobile (EAS)** workflow (`build.yml`, *Run workflow*) builds any
profile on demand — `beta` or `production`, with optional submission. Locally:

```bash
npx eas-cli build --profile beta --platform android
npx eas-cli submit --profile beta --platform android --latest
```

## Versions

`package.json`'s `version` is what members see (Play's *version name*;
`app.config.ts` reads it). The *version code* Play requires to grow on every
upload is managed by EAS (`appVersionSource: remote`, `autoIncrement` on
`beta` and `production`) — never edit it by hand.

The release flow is the one the other repos use:

1. Branch `feature/<name>` off `develop`, commit the change.
2. `chore(release): X.Y.Z` — `npm version X.Y.Z --no-git-tag-version`, plus the
   docs and specs the change touched.
3. `git merge --no-ff` into `develop`, then `git tag -a vX.Y.Z -m "Release vX.Y.Z"`
   on the merge commit.

Bump it when a release changes something members can see. The app's version is
not tied to the backend's: this repo started at 2.0.0 because that is the API
it needs, and moves on its own from there.

**Each push to `beta` or `main` costs one EAS build.** The free plan has a
monthly allowance — promote in batches, not on every commit.

## Over-the-air updates (not used yet)

EAS Update can replace an installed app's JavaScript without a store release.
The app is prepared for it (`runtimeVersion: appVersion`: an update only
reaches binaries of the same `package.json` version — so **bump the version
with every native change**), but the workflows ship store builds only.
(`fingerprint`, which would track native changes by itself, is unusable from
Windows: the hash differs between a Windows machine and EAS's Linux builders
and every build fails with "Runtime version mismatch".) Adding updates later means: publish
`eas update --channel <beta|production>` for JavaScript-only changes and keep
store builds for native ones.

## Rolling back

There is no un-shipping a binary. Ship a fix as a new release. On Google Play,
a staged production rollout can be **halted** (*Production → Releases → Halt
rollout*), and a previous build can be re-released from the bundle library.
