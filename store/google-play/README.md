# Publishing on Google Play — step by step

The Android app is `pro.bloomboard.app`, a **new** Play listing called "Bloom
Board". Once set up, releasing is automatic:

| Push to | GitHub Actions does | Members get |
|---|---|---|
| `beta` | EAS builds against the beta API → Play **internal testing** | Testers on the opt-in list, minutes after the build |
| `main` | EAS builds against production → Play **production**, tags `v<version>` | Everyone, after Google's review (hours–days) |

Texts, forms and graphics to paste: [`listing.md`](listing.md),
[`graphics/`](graphics/).

---

## 1. Google Play developer account (once)

1. Go to <https://play.google.com/console/signup> with the Google account that
   will own the app (use a company one, e.g. an `@bloomboard.pro` Workspace
   account, not a personal Gmail — it can't be moved later).
2. Choose **Organization** if Bloom Board is a registered business.
   - Needs a **D-U-N-S number** (free, from Dun & Bradstreet; takes days to
     weeks) and the company's legal name and address.
   - **Personal** accounts created after Nov 2023 must run a **closed test with
     at least 12 testers for 14 days** before Google lets them publish to
     production. Organization accounts skip that.
3. Pay the one-time **US$25** fee and complete identity verification (ID
   document; for organizations, the business documents). Verification can take
   a few days.

## 2. Expo / EAS (once)

EAS builds the app in the cloud (no Android Studio needed) and uploads it to
Play.

1. Create an account at <https://expo.dev> — ideally an **organization**
   (e.g. `bloomboard`) so the project isn't tied to one person.
2. In `bloomboard-mobile`:
   ```bash
   npx eas-cli login
   npx eas-cli init
   ```
   It prints a **project ID**. Put it, and the account/org name, at the top of
   `app.config.ts`:
   ```ts
   const EAS_PROJECT_ID = '<the id>';
   const EAS_OWNER = '<account or org>';
   ```
   and commit.
3. Create an access token: expo.dev → *Account settings → Access tokens* (a
   **robot** user token if you made an organization). In GitHub:
   `JuamBer/bloomboard-mobile` → *Settings → Secrets and variables → Actions →
   New repository secret* → `EXPO_TOKEN`.

## 3. Create the app in Play Console

*Home → Create app*:

- App name: `Bloom Board` · Default language: **Spanish (Spain) – es-ES**
- App or game: **App** · Free or paid: **Free** (the in-app Pro plan doesn't
  make the app paid)
- Accept the declarations.

Then work through the **Dashboard → "Set up your app"** checklist with
[`listing.md`](listing.md):

- **App content**: privacy policy, ads (no), app access (the review account),
  content rating, target audience (18+), news (no), government (no), financial
  features (none), health (activity and fitness tracking), **data safety**.
- **Store listing**: name, short and full description, icon, feature graphic,
  **screenshots**, category Health & Fitness, contact details.

### Screenshots

At least 2 phone screenshots (up to 8), portrait. With the dev app running on
your phone, take them with the phone's own screenshot (Power + Volume down) on:
Calendario, the session control, a workout being logged, the finish summary,
Rutinas, an exercise's progress. Use the review account's data, not a real
member's. Save them in `store/google-play/screenshots/`.

## 4. The first build and upload (by hand, once)

Google only accepts the API (what GitHub Actions uses) after the app has a first
upload made in the console.

1. Build the store bundle:
   ```bash
   npx eas-cli build --profile production --platform android
   ```
   The first time it asks to **generate a new Android keystore** → **Yes**. EAS
   keeps it; it's the *upload key*. (Google signs what members download with its
   own key: *Play App Signing*, on by default.)
2. When the build finishes, download the `.aab` from the link it prints.
3. Play Console → *Test and release → Testing → Internal testing → Create new
   release* → upload the `.aab` → release name `2.0.0` → notes → *Save* →
   *Review release* → *Start rollout to Internal testing*.
4. *Internal testing → Testers*: create an email list with the team's Google
   accounts, save, and open the **"Join on the web"** link on each tester's
   phone. They install "Bloom Board" from the Play Store.

## 5. Let EAS upload for you (once)

1. **Google Cloud**: <https://console.cloud.google.com> → create a project
   (e.g. "bloomboard-play") → *APIs & Services → Library* → enable **Google
   Play Android Developer API**.
2. *IAM & Admin → Service accounts → Create*: name `eas-submit`, no roles.
   Open it → *Keys → Add key → JSON* → it downloads a `.json` file. Treat it
   like a password: never commit it (`.gitignore` already covers
   `google-play-service-account.json`).
3. **Play Console** → *Users and permissions → Invite new users* → the service
   account's email (`eas-submit@….iam.gserviceaccount.com`) → *App
   permissions* → add **Bloom Board** → grant **Release apps to testing
   tracks**, **Release to production, exclude devices, and use Play App
   Signing**, and **Manage testing tracks and edit tester lists** → invite.
4. Upload the key to EAS:
   ```bash
   npx eas-cli credentials --platform android
   ```
   → `production` → *Google Service Account* → *Upload a Google Service
   Account Key* → pick the `.json`. Then delete the file from your Downloads.

From now on, pushing `beta` or `main` builds **and** uploads.

## 6. Production

1. When internal testing looks good, publish the first production release.
   Until the app has been published once, Google only accepts **draft**
   releases through the API — which is why `eas.json` has
   `"releaseStatus": "draft"`. So the first time: *Production → Create new
   release* → *Add from library* (pick the build) → notes → *Review* → *Send
   for review*.
   (Personal accounts: first finish the 12-tester / 14-day closed test.)
2. After Google approves and the app is live, change `releaseStatus` to
   `"completed"` in **both** submit profiles in `eas.json`. From then on a push
   to `main` sends a full release for review, and a push to `beta` rolls out to
   testers straight away.

## Day to day

```
feature branch → develop → beta  ──► internal testing (team)
                              └──► main ──► production (everyone, after review)
```

- Bump `version` in `package.json` when a release changes something members see
  (Play shows it as the version name). The build number (`versionCode`) is
  increased automatically by EAS.
- Each push to `beta` / `main` uses one EAS build. The free plan includes a
  limited number per month; promote in batches rather than on every commit.
- iOS / App Store is a separate track of work (Apple Developer account,
  US$99/year) — not set up yet.
