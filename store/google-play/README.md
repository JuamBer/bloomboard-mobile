# Publishing on Google Play — step by step

The Android app is `pro.bloomboard.app`, a **new** Play listing called "Bloom
Board" (not the earlier member app published outside this repo, which is left
as it is). Once set up, releasing is automatic:

| Push to | GitHub Actions does | Members get |
|---|---|---|
| `beta` | EAS builds against the beta API → Play **internal testing** | Testers on the opt-in list, minutes after the build |
| `main` | EAS builds against production → Play **production**, tags `v<version>` | Everyone, after Google's review (hours–days) |

Texts, forms and graphics to paste: [`listing.md`](listing.md),
[`graphics/`](graphics/), [`screenshots/`](screenshots/).

## Status (2026-10-07)

| Step | State |
|---|---|
| 1. Play developer account | ✅ **Organization** account (no 12-tester closed test needed) |
| 2. Expo / EAS | ✅ Project `@juamber/bloomboard` (id `4ee08910-fb31-4fda-b84a-c0d5de67c175`), `EXPO_TOKEN` in GitHub (robot user "GitHub App · @JuamBer", Developer role) |
| 3. App in Play Console | ✅ `pro.bloomboard.app`, store listing (es-ES + en-US), app content, data safety, 6 screenshots |
| 4. First build, by hand | ✅ Production build **2.1.0 (5)** uploaded to internal testing; installed and checked on a Pixel 7 |
| 5. Service account for EAS Submit | ⏳ Not done — until then pushes to `beta`/`main` build but cannot upload |
| 6. Production | ⏳ **2.1.0 (5) submitted for review on 2026-10-07**, countries Spain + United States, managed publishing **off** (goes live as soon as Google approves). After approval: `releaseStatus` → `"completed"` in `eas.json` |

`beta` and `main` were pushed on 2026-10-06 (at the screenshots commit): their
workflows queued EAS builds 3 (beta) and 4 (production), which built fine but
uploaded nothing — no service account yet (EAS lists no submissions). No
`v2.1.0` tag reached GitHub from that run; check the *Deploy Mobile PRODUCTION*
run's *Tag release* job in the Actions tab. iOS / App Store: not started.

**Next release, waiting on `develop`** (merged 2026-10-07, not released): the
Work/Rest player with sound, exercise media on white, equal-ended ranges; and
(merged 2026-10-10) the workout logging round — set ticks only and nothing
folded, a ticked set keeps its hints, the plan's notes as placeholders,
deleting a finished session's workout, the trainer's note on the workout signed
"Nota de …" (needs backend 2.4.0 live first).
Held until 2.1.0 (5) is approved. It adds `expo-audio` (native), so it ships as
**2.2.0 with a new store build** — bump the version first (`docs/RELEASING.md`).
`expo-audio` merges only `MODIFY_AUDIO_SETTINGS` into the manifest (its config
plugin is deliberately not used), so the Play data-safety and permission
answers do not change.

---

## 1. Google Play developer account (once) — done

1. <https://play.google.com/console/signup> with the Google account that owns
   the app — a company account, not a personal Gmail; it can't be moved later.
2. **Organization** if the business is registered (Bloom Board is): needs a
   **D-U-N-S number** (free, Dun & Bradstreet, days to weeks) and the company's
   legal name and address.
   - **Personal** accounts created after Nov 2023 must run a **closed test with
     at least 12 testers for 14 days in a row** before Google allows
     production, and then request access (about a week). Organizations skip it.
3. One-time **US$25** fee and identity verification (a few days).

## 2. Expo / EAS (once) — done

EAS (Expo Application Services) builds the app in the cloud and uploads it to
Play — no Android Studio needed for releases.

1. An account at <https://expo.dev>. The project lives under the personal
   account `juamber`; it can be transferred to an organization later.
2. In `bloomboard-mobile`: `npx eas-cli login`, then `npx eas-cli init`.
   - **Expected error:** "Cannot automatically write to dynamic config at:
     app.config.ts". The config is code, so `eas init` cannot edit it: copy the
     printed project id into `EAS_PROJECT_ID` and the account into `EAS_OWNER`
     at the top of `app.config.ts`, and commit. (Done.)
3. expo.dev → *Access tokens* → **Create token** on the **robot user** row ("GitHub
   App · @JuamBer"), not under "Personal access tokens": it is not tied to a
   login and its Developer role can build and submit but not touch billing or
   settings. GitHub → `JuamBer/bloomboard-mobile` → *Settings → Secrets and
   variables → Actions* → secret **`EXPO_TOKEN`**. The token is shown once —
   paste it straight there, nowhere else.

## 3. Create the app in Play Console — done

*Home → Create app*:

- App name `Bloom Board` · default language **Español (España) – es-ES**
- **App** · **Free** (the in-app Pro plan does not make the app paid; a free
  app can never become paid)
- **Package name `pro.bloomboard.app`** — reverse-domain order. The form
  suggested typing `app.bloomboard.pro`; that would have been permanent and
  every upload would have been rejected. It must match `app.config.ts`.

### Where the setup tasks are

The Dashboard's "Mostrar más" next to *Comienza a configurar la app* only shows
help text. The tasks are:

- **Supervisa y mejora → Política y programas → Contenido de la aplicación**:
  privacy policy, app access (review account), ads, content rating, target
  audience, data safety, government, financial features, health.
- **Aumenta la cantidad de usuarios → Presencia en Google Play Store**: the main
  store listing (texts, icon, feature graphic, screenshots) and the store
  settings (category, contact).
- **Prueba y lanza → Producción**, card *Crea y publica una versión*: countries,
  then the release. Its review page lists anything still missing.

Answers for every form: [`listing.md`](listing.md). The ones that need care:

- **Data safety → account deletion URL:**
  `https://bloomboard.pro/privacy/#eliminar-cuenta` — privacy policy §10,
  which names Bloom Board, gives the steps and says what is deleted and kept.
  Account creation: **Username and password** only. Deleting some data without
  the account: **Yes** (members delete their own workouts, routines,
  exercises).
- **In-app account deletion is required** by Google for any app with sign-up:
  *Perfil › Eliminar cuenta* (app and web), backed by `DELETE /me` (backend
  2.1.0). Production must run that backend before the review.
- **App access:** a dedicated CLIENT account **on the production API** (not a
  real member), booked on a center with a session so every tab has content.

### Graphics and screenshots

- `graphics/icon-512.png` (512×512) and `graphics/feature-graphic.png`
  (1024×500), from the brand manual's logos on the app tile's gradient.
- `screenshots/` — six **1080×1920 (9:16)** PNGs. Play only accepts 16:9 or
  9:16, and phones like the Pixel 7 capture 1080×2400 (9:20), so each capture
  is scaled to 1920 px high and centred on the app's background `#020c1c`.
  At least 4 are needed for the app to be promoted.

How they were made (repeat this for new ones, e.g. in English):

1. A **demo member** on the dev DB ("Lucía Martín", `demo-lucia-…@bloomboard.test`)
   with a 3-day strength routine, four weeks of logged workouts with
   progressive loads (so records and the progress chart have a story), past
   sessions, one running now and upcoming ones. Never a real member's data.
   Sessions need odd minutes (`18:37`): a center can't have two sessions of
   the same service at the same start.
2. The dev build on a phone (`docs/DEVELOPMENT.md`), signed in as the demo
   member. Dev menu → **Tools button** off, or the blue ⚙ shows in every shot.
3. Screens captured with `adb exec-out screencap -p`. To reach a screen without
   typing, use a deep link: `adb shell am start -a android.intent.action.VIEW
   -d "bloomboard://exercises/<id>" pro.bloomboard.app.dev`.
   **Don't type text into a dev build with `adb shell input text`**: two `r`s in
   a row ("ba**rr**a") are the reload shortcut.
4. Shown order: calendar, session under way, workout finished (records),
   exercise progress, workout history, a plan.

## 4. The first build and upload (by hand, once) — done

Google accepts uploads through the API (what GitHub Actions uses) only after a
first one made in the console.

1. `npx eas-cli build --profile production --platform android`. The first
   build **creates the Android upload keystore** and keeps it on EAS — nobody
   handles a keystore file. Google signs what members download with its own key
   (*Play App Signing*, accepted by default on the first upload).
2. **Expect a 2–3 hour wait** on EAS's free tier before the build starts (it
   takes ~15 min once running). Priority builds need a paid plan.
3. The first attempt (build 2, started from this Windows PC) failed with
   **"Runtime version mismatch"** — the `fingerprint` runtime policy hashes
   native code differently on Windows and on EAS's Linux machines. Builds queued
   from GitHub Actions (Linux) passed with the same setting. Fixed for both by
   `runtimeVersion: { policy: 'appVersion' }` (`docs/RELEASING.md`). `eas build`
   uploads the **local, committed** project, not GitHub — a fix only needs a
   commit, not a push.
4. Download the `.aab` from the build page (expo.dev → project → Builds).
5. Play Console → *Prueba y lanza → Pruebas internas → Crear nueva versión* →
   upload → release name `2.1.0 (5)` → notes in `<es-ES>…</es-ES>` and
   `<en-US>…</en-US>` tags → *Siguiente* → *Guardar y publicar*.
   - Warning **"No hay ningún archivo de desofuscación"**: harmless — the build
     is not minified with R8/ProGuard, so there is no mapping file.
6. *Testers* tab: an email list with the team's Google accounts → copy **"Unirse
   en la web"** → open it on the phone with that account → install.
   - **DF-DFERH-01** ("Se ha producido un error al recuperar la información del
     servidor") right after the first publish: the app has not propagated yet
     (minutes to ~2 hours), or the Play Store is open with another Google
     account / the work profile. Wait, switch account, or clear the Play
     Store's cache.
   - Until the first review, testers see the temporary name
     "pro.bloomboard.app (unreviewed)".

**Build 5 points at the production API** (`production` profile), although it
sits on the internal track: that way the same build could be promoted to
production. Builds from the `beta` branch will point at the beta API and show as
"Bloom Board (beta)".

## 5. Let EAS upload for you (once) — pending

1. **Google Cloud**: <https://console.cloud.google.com> → new project (e.g.
   "bloomboard-play") → *APIs & Services → Library* → enable **Google Play
   Android Developer API**.
2. *IAM & Admin → Service accounts → Create*: `eas-submit`, no roles. Open it →
   *Keys → Add key → JSON* → a `.json` file downloads. It is a password: never
   commit it (`.gitignore` covers `google-play-service-account.json`).
3. **Play Console** → *Usuarios y permisos → Invitar usuarios* → the service
   account's email (`eas-submit@….iam.gserviceaccount.com`) → *Permisos de la
   app* → **Bloom Board** → grant releasing to testing tracks, releasing to
   production, and managing testing tracks → invite.
4. `npx eas-cli credentials --platform android` → `production` → *Google Service
   Account* → *Upload a Google Service Account Key* → the `.json`. Then delete
   the file.

From then on, pushing `beta` or `main` builds **and** uploads.

## 6. Production — in review

1. *Prueba y lanza → Producción → Países/regiones* (Spain, United States) →
   *Crear nueva versión* → **Añadir desde la biblioteca** (the build already
   uploaded) → notes → *Siguiente* → *Descripción general de la publicación* →
   **Enviar N cambios a revisión**.
2. **Managed publishing** (*Publicación administrada*) decides what happens on
   approval: off → live at once; on → you press *Publicar*. It is off.
3. A new app's first review takes **1–7 days**; the result arrives by email
   (and in *Actividad de envío*). Don't edit the listing, forms or release while
   it is in review — a change can restart it.
4. Until the app has been published once, Google only accepts **draft**
   releases through the API — hence `"releaseStatus": "draft"` in both submit
   profiles. **After approval**, set both to `"completed"`: from then on a push
   to `main` sends a full release for review, and a push to `beta` rolls out to
   testers at once.

## Day to day

```
feature branch → develop → beta  ──► internal testing (team)
                              └──► main ──► production (everyone, after review)
```

- Bump `version` in `package.json` when a release changes something members see
  (Play's version name). The build number (`versionCode`) is EAS's: it grows on
  every build, also for builds that fail or are cancelled (the first uploaded
  one is 5).
- Each push to `beta` / `main` is one EAS build, with the free tier's queue.
  Promote in batches, not on every commit.
- iOS / App Store is a separate track (Apple Developer account, US$99/year) —
  not set up.
