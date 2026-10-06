# Environments — Mobile

> Repo-specific details. The **canonical** cross-repo infra doc (AWS, domains,
> conventions) lives in `bloomboard-backend/docs/ENVIRONMENTS.md`. This app has
> no AWS footprint: it is built and distributed by **EAS** (Expo Application
> Services) and the stores.

| Env | Branch | API | EAS build profile | Where it goes | App name / package |
|-----|--------|-----|-------------------|---------------|--------------------|
| Develop | `develop` | local (`:3000` on the Metro host) | `development` (dev client) | your phone, by hand | "Bloom Board (dev)" / `pro.bloomboard.app.dev` |
| Beta | `beta` | `beta.service.bloomboard.pro` | `beta` | Google Play **internal testing** (automatic) | "Bloom Board (beta)" / `pro.bloomboard.app` |
| Production | `main` | `service.bloomboard.pro` | `production` | Google Play **production** (automatic, after review) | "Bloom Board" / `pro.bloomboard.app` |

A fourth profile, `preview`, builds a sideloadable APK against beta with its own
package (`pro.bloomboard.app.beta`), for a tester who should not join the Play
track — run it from the manual *Build* workflow.

`APP_ENV` (set per profile in `eas.json`) drives `app.config.ts`: name, package,
and which API the JavaScript is compiled against (`EXPO_PUBLIC_API_URL` /
`EXPO_PUBLIC_WS_URL`, also per profile). Those are public — they end up in the
bundle — so they live in `eas.json`, not in secrets.

**The API must be 2.0.0 or later** in the environment a build points at.

## Identifiers

| | Android package | iOS bundle id |
|---|---|---|
| Store (beta track and production) | `pro.bloomboard.app` | `pro.bloomboard.app` |
| Sideloaded beta (`preview`) | `pro.bloomboard.app.beta` | `pro.bloomboard.app.beta` |
| Development | `pro.bloomboard.app.dev` | `pro.bloomboard.app.dev` |

`pro.bloomboard.app` is a **new** Google Play listing, "Bloom Board". An earlier
member app built outside this repo was published separately; it is unrelated to
this listing and is not replaced by it. A package name can never change once
published. `APP_BUNDLE_ID` / `ANDROID_PACKAGE` override the base id for a
one-off build.

## One-off setup

The Google Play side, step by step (developer account, EAS, creating the app,
the first upload, the service account, going to production):
**`store/google-play/README.md`**. Texts, forms and graphics:
`store/google-play/listing.md` and `graphics/`.

iOS is not set up yet: an Apple Developer Program membership (organisation),
the App Store Connect app record for `pro.bloomboard.app`, then `eas build
--platform ios` creates the certificates and `eas credentials` takes an App
Store Connect API key for submissions.

## GitHub configuration

| Where | Name | Value |
|-------|------|-------|
| Repository secret | `EXPO_TOKEN` | robot user token from expo.dev |

No environments, no AWS roles: the deploy workflows only talk to EAS, the API
URLs are in `eas.json`, and the Google Play service account key is stored in
EAS (uploaded with `eas credentials`), never in GitHub or the repo. Until
`EXPO_TOKEN` exists the deploy workflows skip themselves with a notice.

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
