# Google Play — store listing and forms

What to paste into Play Console for `pro.bloomboard.app`. Spanish (es-ES) is the
default language; English (en-US) is a translation added under *Store listing
→ Manage translations*. Limits: name 30, short description 80, full
description 4000 characters.

## Main store listing

| Field | Value |
|---|---|
| App name | `Bloom Board` |
| Category | Health & Fitness (*Salud y bienestar*) |
| Tags | Fitness, Workout tracker, Training |
| Contact email | `contacto@bloomfitness.es` |
| Website | `https://bloomboard.pro` |
| Privacy policy | `https://bloomboard.pro/privacy/` |
| App icon (512×512) | `graphics/icon-512.png` |
| Feature graphic (1024×500) | `graphics/feature-graphic.png` |
| Phone screenshots (2–8, 9:16) | `screenshots/` — take them from the app (see README) |

### Español (es-ES)

**Descripción breve** (≤ 80)

```
Tus entrenos, rutinas y sesiones del gimnasio, siempre contigo.
```

**Descripción completa**

```
Bloom Board es la app de entrenamiento para quienes entrenan en su gimnasio, con un entrenador online o en un centro que trabaja con Bloom Board.

REGISTRA CADA ENTRENAMIENTO
• Empieza un entrenamiento vacío o a partir de tu plan y apunta cada serie: peso, repeticiones, tiempo, RPE…
• Marca las series según las haces; el ejercicio terminado se pliega y pasa al siguiente.
• La pantalla no se apaga mientras entrenas.
• Al terminar, el resumen: duración, series, volumen y tus récords personales.

TUS RUTINAS Y PLANES
• Crea tus propias rutinas y entrenamientos con bloques, superseries y series compuestas.
• Si entrenas con un centro o un entrenador que usa Bloom Board, ves también las rutinas que te preparan.

EJERCICIOS Y PROGRESO
• Un catálogo de ejercicios con imágenes, filtros por grupo muscular y material.
• Crea tus propios ejercicios.
• La evolución de cada ejercicio: tu mejor marca, tu historial y tu progreso.

TUS SESIONES EN EL CENTRO
• Si tu centro trabaja con Bloom Board, consulta tus sesiones en el calendario.
• Durante la sesión, controla tu entrenamiento desde el móvil: registra, marca y cambia de pantalla de TV. Tu entrenador lo ve al momento.

TU CUENTA
• Tema claro u oscuro, español o inglés.
• Plan gratuito para empezar.

Bloom Board también está en la web: app.bloomboard.pro
```

### English (en-US)

**Short description** (≤ 80)

```
Your workouts, routines and gym sessions, always with you.
```

**Full description**

```
Bloom Board is the training app for people who train at their own gym, with an online coach, or at a center that runs on Bloom Board.

LOG EVERY WORKOUT
• Start an empty workout or follow your plan, and log every set: weight, reps, time, RPE…
• Tick sets as you go; a finished exercise folds away and the next one opens.
• The screen stays on while you train.
• When you finish: duration, sets, volume and your personal records.

YOUR ROUTINES AND PLANS
• Build your own routines and workouts with blocks, super-sets and compound sets.
• If you train with a center or coach that uses Bloom Board, you also see the routines they prepare for you.

EXERCISES AND PROGRESS
• An exercise catalog with images, filtered by muscle group and equipment.
• Create your own exercises.
• Every exercise's history: your best, your log and your progress.

YOUR SESSIONS AT THE CENTER
• If your center runs on Bloom Board, see your sessions in the calendar.
• During a session, control your workout from your phone: log, tick and move between TV screens. Your trainer sees it instantly.

YOUR ACCOUNT
• Light or dark theme, Spanish or English.
• A free plan to start.

Bloom Board is also on the web: app.bloomboard.pro
```

## App content (Policy → App content)

| Form | Answer |
|---|---|
| Privacy policy | `https://bloomboard.pro/privacy/` |
| Ads | **No**, the app has no ads |
| App access | **All or some functionality is restricted** → add the review account (see below) |
| Content rating | Questionnaire, category *Utility, Productivity, Communication or Other*: no violence, sexuality, language, drugs, gambling; users **do not** interact or share content with other users; no location sharing; no digital purchases (today). Expect **PEGI 3 / Everyone**. |
| Target audience | **18 and over** only (adults training; avoids the Families policy) |
| News app | No |
| Government app | No |
| Financial features | None |
| Health apps | Select **Activity and fitness tracking**. It is not a medical device and makes no medical claims. |
| Data safety | See next section |

### App access — review account

Google's reviewers need to sign in. Create a dedicated CLIENT account on the
**production** API (never a real member), booked on a center with a session and
a workout so every tab has something, and give:

```
Username: google-play-review@bloomboard.pro   (or the account you create)
Password: <its password>
Instructions: Sign in with the account above. The Calendar tab lists the
member's sessions; Rutinas, Entrenos and Ejercicios work without a session.
```

### Data safety

Does the app collect or share user data? **Yes, collects. Shares: No.**
Encrypted in transit: **Yes** (HTTPS only). Users can request deletion: **Yes**
— point to the privacy policy / contact email. (If Google requires a
self-service deletion URL, the web app needs an account-deletion page:
follow-up.)

| Data type | Collected | Shared | Optional | Purpose |
|---|---|---|---|---|
| Personal info → Name | Yes | No | Required | Account management, App functionality |
| Personal info → Email address | Yes | No | Required | Account management, App functionality |
| Personal info → Phone number | Yes | No | Optional | Account management |
| Personal info → Other info (birthday, gender, alias) | Yes | No | Optional | App functionality |
| Health and fitness → Fitness info (workouts, sets, records) | Yes | No | Required | App functionality |
| App activity → Other user-generated content (notes, own exercises, routines) | Yes | No | Optional | App functionality |
| App info and performance → Crash logs | No | — | — | — (no crash reporting SDK today) |

No location, contacts, photos, files, messages, audio, calendar, device IDs or
financial info. No ads, no analytics SDK, no tracking.
