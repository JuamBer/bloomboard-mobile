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
• Empieza desde cualquiera de tus rutinas o con un entrenamiento vacío, y apunta cada serie: peso, repeticiones, tiempo, RPE…
• Marca las series según las haces. Con el móvil bloqueado, el ejercicio y la serie que tocan están en la barra de notificaciones, con un botón para completarla.
• La pantalla no se apaga mientras entrenas.
• Al terminar, el resumen: duración, series, volumen y tus récords personales.

TUS RUTINAS Y PLANES
• Crea tus propias rutinas y entrenamientos con bloques, superseries y series compuestas.
• Si entrenas con un centro o un entrenador que usa Bloom Board, ves también las rutinas que te preparan.

TU PERFIL Y TU PROGRESO
• Todo lo que has entrenado, entrenamiento a entrenamiento, y un calendario con tu racha de semanas.
• Un catálogo de ejercicios con imágenes, filtros por grupo muscular y material, y tus propios ejercicios.
• La evolución de cada ejercicio: tu mejor marca, tu historial y tu progreso.
• Tus medidas corporales: peso, grasa y perímetros, de los últimos 3 meses, del año o de siempre.

TUS SESIONES EN EL CENTRO
• Si tu centro trabaja con Bloom Board, consulta tus sesiones en el calendario.
• Durante la sesión, controla tu entrenamiento desde el móvil: registra, marca y cambia de pantalla de TV. Tu entrenador lo ve al momento.

TU CUENTA
• Tema claro u oscuro, español o inglés, kilos o libras.
• Plan gratuito para empezar.
• Preguntas frecuentes y un buzón para enviarnos sugerencias o avisarnos de un problema.

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
• Start from any of your routines or with an empty workout, and log every set: weight, reps, time, RPE…
• Tick sets as you go. With your phone locked, the exercise and set you're on are in the notification shade, with a button to complete it.
• The screen stays on while you train.
• When you finish: duration, sets, volume and your personal records.

YOUR ROUTINES AND PLANS
• Build your own routines and workouts with blocks, super-sets and compound sets.
• If you train with a center or coach that uses Bloom Board, you also see the routines they prepare for you.

YOUR PROFILE AND YOUR PROGRESS
• Everything you've trained, workout by workout, and a calendar with your streak of weeks.
• An exercise catalog with images, filtered by muscle group and equipment, and your own exercises.
• Every exercise's history: your best, your log and your progress.
• Your body measurements: weight, body fat and girths, over the last 3 months, the year or all time.

YOUR SESSIONS AT THE CENTER
• If your center runs on Bloom Board, see your sessions in the calendar.
• During a session, control your workout from your phone: log, tick and move between TV screens. Your trainer sees it instantly.

YOUR ACCOUNT
• Light or dark theme, Spanish or English, kilograms or pounds.
• A free plan to start.
• An FAQ and an inbox to send us suggestions or report a problem.

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
member's sessions; Rutinas (start a workout from any card) and Perfil (history,
exercises, measurements, workout calendar; Ajustes behind the gear) work
without a session.
```

### Data safety

Does the app collect or share user data? **Yes, collects. Shares: No.**
Encrypted in transit: **Yes** (HTTPS only).

Account creation: **Username and password** only.

**Account deletion URL** (the field in *Data safety*, also shown on the store
listing): `https://bloomboard.pro/privacy/#eliminar-cuenta` — privacy policy
§10, which names Bloom Board, gives the steps and says what is deleted and what
is kept. Members delete their account themselves, instantly and
password-confirmed, in the app (*Perfil › Ajustes › Cuenta › Eliminar cuenta*) and on the web
(app.bloomboard.pro › *Perfil* › *Eliminar cuenta*); by email or through their
center otherwise. Deleting some data without deleting the account: **Yes** —
members delete their own workouts, routines, plans and exercises in the app.

| Data type | Collected | Shared | Optional | Purpose |
|---|---|---|---|---|
| Personal info → Name | Yes | No | Required | Account management, App functionality |
| Personal info → Email address | Yes | No | Required | Account management, App functionality |
| Personal info → Phone number | Yes | No | Optional | Account management |
| Personal info → Other info (birthday, gender, alias) | Yes | No | Optional | App functionality |
| Health and fitness → Fitness info (workouts, sets, records) | Yes | No | Required | App functionality |
| App activity → Other user-generated content (notes, own exercises, routines; suggestions and problem reports sent from Ajustes › Contáctanos, with the app version, system and language) | Yes | No | Optional | App functionality, Developer communications |
| App info and performance → Crash logs | No | — | — | — (no crash reporting SDK today) |

No location, contacts, photos, files, messages, audio, calendar, device IDs or
financial info. No ads, no analytics SDK, no tracking.
