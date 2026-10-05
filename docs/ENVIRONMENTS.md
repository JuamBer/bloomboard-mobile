# Environments — Mobile

> Repo-specific details. The **canonical** cross-repo infra doc (AWS, domains,
> conventions) lives in `bloomboard-backend/docs/ENVIRONMENTS.md`. This app has
> no AWS footprint: it is built and distributed by **EAS** (Expo Application
> Services) and the stores.

| Env | Branch | API | EAS build profile | EAS update channel | App name / id suffix |
|-----|--------|-----|-------------------|--------------------|----------------------|
| Develop | `develop` | local (`:3000` on the Metro host) | `development` (dev client) | `development` | "Bloom Board (dev)" / `.dev` |
| Beta | `beta` | `beta.service.bloomboard.pro` | `preview` (internal distribution) | `beta` | "Bloom Board (beta)" / `.beta` |
| Production | `main` | `service.bloomboard.pro` | `production` (stores) | `production` | "Bloom Board" / — |

The three variants have different bundle ids, so a phone can carry all three.
`APP_ENV` (set per profile in `eas.json`) drives `app.config.ts`: name, id, and
which API the JavaScript is compiled against (`EXPO_PUBLIC_API_URL` /
`EXPO_PUBLIC_WS_URL`, also per profile). Those are public — they end up in the
bundle — so they live in `eas.json`, not in secrets.

**The API must be 2.0.0 or later** in the environment a build points at. Beta
and production backends get 2.0.0 when `feature/workouts` is promoted; until
then a beta build of this app shows errors on Entrenos and the session workout.

## Identifiers

| | iOS bundle id | Android package |
|---|---|---|
| Production | `pro.bloomboard.app` | `pro.bloomboard.app` |
| Beta | `pro.bloomboard.app.beta` | `pro.bloomboard.app.beta` |
| Development | `pro.bloomboard.app.dev` | `pro.bloomboard.app.dev` |

**Decide the Android package before the first production build.** A member
app is already published on Google Play (built outside this repo). Two ways
on:

- **Replace it** — this app becomes the next version of that listing, members
  get it as an update. Set `ANDROID_PACKAGE` (in the EAS `production`
  environment, or in `app.config.ts`) to that listing's package name, sign with
  the **same upload key** (EAS can import the existing keystore: `eas
  credentials`), and give the first build a `versionCode` above the published
  one (`eas build:version:set`).
- **A new listing** — keep `pro.bloomboard.app` and unpublish the old one
  later. Members have to install the new app.

A package name can never change once published, so this is a one-way door.
`APP_BUNDLE_ID` overrides the base id on both platforms the same way.

## One-off setup

Nothing here has been done yet. In order:

1. **Expo account.** Create (or reuse) the organisation on expo.dev that owns
   the app — not a personal account, so the project outlives any one person.
2. **Link the project.** `npx eas-cli login`, then `npx eas-cli init` in this
   repo. The config is dynamic (`app.config.ts`), so EAS cannot write the id
   itself: copy the printed project id into `EAS_PROJECT_ID` and the account
   into `EAS_OWNER` at the top of `app.config.ts`, and commit that. From then
   on `runtimeVersion` and the update URL are configured.
3. **Apple.** An Apple Developer Program membership (organisation). `eas
   build --profile production --platform ios` the first time walks through
   creating the certificates and provisioning profile and stores them in EAS.
   Create the app record in App Store Connect with bundle id
   `pro.bloomboard.app`. For `eas submit`, an App Store Connect API key
   (`eas credentials` → iOS → App Store Connect API Key).
4. **Google.** The Play Console app (see *Identifiers* above), and a service
   account with release permissions for `eas submit` — its JSON key uploaded
   with `eas credentials` (never committed; `.gitignore` covers it). The very
   first Android upload must be done by hand in the Console; `eas submit`
   works from the second.
5. **GitHub.** Repository secret `EXPO_TOKEN` (expo.dev → Access tokens, a
   robot user's token). Until it exists the deploy workflows skip themselves
   with a notice instead of failing — CI on `develop` does not need it.
6. **Store listings** — privacy policy URL `https://bloomboard.pro/privacy/`
   (`/en/privacy/` in English — the register form links the same pages), the data-safety / privacy
   questionnaires (account data, workout data; nothing shared with third
   parties; no tracking), screenshots, and a **review account**: a CLIENT
   account with a center, sessions and a workout, so a reviewer can see every
   tab. Use a dedicated one (as the existing Play listing does), never a real
   member.

## GitHub configuration

| Where | Name | Value |
|-------|------|-------|
| Repository secret | `EXPO_TOKEN` | robot user token from expo.dev |

No environments, no AWS roles: the deploy workflows only talk to EAS, and the
API URLs are in `eas.json`.

## Links back into the app

Emailed links (activation) point at the web app
(`app.bloomboard.pro/activate/<token>`), which handles them in a browser. The
app has its own route for the same path and the `bloomboard://` scheme, but
opening `https://app.bloomboard.pro/...` links directly in the app needs
universal links / App Links: an `apple-app-site-association` and an
`assetlinks.json` served by the web app's domain, plus `associatedDomains` and
`intentFilters` in `app.config.ts`. Not set up yet — a follow-up once the
production identifiers are final.

## Monetisation note

The member plan's **Pro** is "Próximamente" today. When it becomes a purchase,
Apple and Google expect a digital subscription sold inside the app to go
through their own in-app purchase; a link out to a web checkout is allowed only
in some storefronts and under each store's conditions. Plan the billing
integration (StoreKit / Play Billing, e.g. through RevenueCat) together with
the backend's member billing, rather than as a web link.
