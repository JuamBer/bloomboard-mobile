# Developing — running the app on a phone

The app runs in a **development build** ("Bloom Board (dev)",
`pro.bloomboard.app.dev`), not Expo Go: it uses `react-native-keyboard-controller`,
which Expo Go does not ship. The development build is installed once; after
that, Metro serves the JavaScript and every change reloads on the phone in a
second or two. Only a native change (a package with native code, a plugin, a
native setting in `app.config.ts`) needs a new development build.

Everything below was worked out on Windows with a Pixel 7.

## Every day

1. **Docker Desktop** running (the dev database lives there; it does not start
   on its own after a reboot).
2. **Backend** on `:3000`: in `bloomboard-backend`, `npm run start:dev`
   (restarts on change). The app needs backend **2.0.0 or later**.
3. **Metro**, advertising the PC's LAN address:
   ```powershell
   cd bloomboard-mobile
   $env:REACT_NATIVE_PACKAGER_HOSTNAME = "192.168.1.132"
   npx expo start --dev-client
   ```
   The app derives the API's address from Metro's (`src/shared/config/env.ts`),
   so this one variable points both Metro and the API at the PC.
4. On the phone, on the same network: open **Bloom Board (dev)**. It reconnects
   to the last server; otherwise scan Metro's QR code or type
   `http://192.168.1.132:8081` in the launcher.

Shake the phone (or tap the ⚙ *Tools button*) for the dev menu: reload,
debugger, element inspector, and the *Tools button* toggle itself.

## The network, once

- **Which address.** Use the address of the adapter that is actually connected
  (`ipconfig`). On this PC that is **Ethernet, `192.168.1.132`**; the Wi-Fi
  adapter shows `192.168.1.82` but is not connected, and the phone gets "No
  route to host" on it. DHCP may change the address — check `ipconfig` if the
  app stops connecting.
- **The firewall.** Windows treats the networks as *Public* and blocks incoming
  connections, so the phone can reach neither Metro nor the API. One rule, run
  once in an **Administrator** PowerShell — LAN only, two ports:
  ```powershell
  New-NetFirewallRule -DisplayName "Bloom Board dev (Metro 8081, API 3000) - LAN only" -Direction Inbound -Protocol TCP -LocalPort 3000,8081 -RemoteAddress LocalSubnet -Action Allow -Profile Any
  ```
- `adb reverse` (tunnelling the ports over the debugging connection) passed no
  traffic over **wireless** debugging; with a USB cable it is an alternative to
  the firewall rule.

## Wireless debugging (adb over Wi-Fi)

`adb` is `%LOCALAPPDATA%\Android\Sdk\platform-tools\adb.exe` (from Android
Studio; `ANDROID_HOME` is not set globally).

1. Phone: *Opciones para desarrolladores → Depuración inalámbrica* on →
   **Vincular dispositivo con código de vinculación**.
2. The popup shows a 6-digit code and an IP:**port** for pairing. That port is
   not the connection port, and it changes every time the popup opens — read it
   from `adb mdns services` (`_adb-tls-pairing`) if in doubt:
   ```bash
   adb pair 192.168.1.55:<pairing port> <code>
   ```
3. Connect on the `_adb-tls-connect` port: `adb mdns services`, then
   `adb connect 192.168.1.55:<connect port>`. `adb devices` should list it.
4. The connection drops when the phone locks; reconnect with step 3. Pairing
   is remembered.

## A new development build (native changes only)

`npx expo run:android` from the repo **does not work on this PC**: the path
`C:\Users\…\Bloom Fitness\bloomboard\bloomboard-mobile` is long enough that
reanimated's native build exceeds Windows' 260-character path limit, and the old
`ninja` in the Android SDK then loops on *"manifest 'build.ninja' still dirty
after 100 tries"*. Build from a short path instead:

```bash
# once: a worktree of develop at a short path
git worktree add --detach C:/bbm develop      # from bloomboard-mobile
cd C:/bbm && npm ci
# each time: bring it up to date, then build
git -C C:/bbm checkout --detach develop && (cd C:/bbm && npm ci)
cd C:/bbm && CI=1 npx expo prebuild --platform android --no-install
cd C:/bbm/android
JAVA_HOME="$USERPROFILE/.jdks/corretto-22.0.2" ANDROID_HOME="$LOCALAPPDATA/Android/Sdk" \
  ./gradlew.bat assembleDebug -PreactNativeArchitectures=arm64-v8a
adb install -r C:/bbm/android/app/build/outputs/apk/debug/app-debug.apk
```

- **JDK 22, not 24+.** JDK 25 (the default here, also bundled with Android
  Studio) prints "A restricted method in java.lang.System has been called", which
  breaks the CMake configure step. JDK 17 or 21 work too.
- **arm64 only** (`-PreactNativeArchitectures=arm64-v8a`): every current phone,
  and about 4 minutes instead of 15.
- `subst` drive aliases don't help: Expo's autolinking cannot find
  `package.json` at a drive root, and mixing the alias with the real path (Node
  resolves it) makes CMake think the build files keep changing.
- After a failed native build, delete every `node_modules/**/android/.cxx`
  folder before retrying — a stale one keeps failing the same way.
- Then start Metro as usual from the **real** repo: the phone runs the native
  shell from `C:\bbm` and the JavaScript from your working copy.
- `npx expo prebuild` also rewrites `package.json`'s `android`/`ios` scripts and
  creates `android/` (gitignored) — keep both out of commits.

## Metro crashing on Windows

`runtimeVersion: fingerprint` made the dev server spawn
`expo-updates runtimeversion:resolve` on every manifest request, which crashed
on Windows (exit 0xC0000142) and took Metro down after the app's first
request. The runtime version is now `appVersion` and only set for store builds
(`app.config.ts`); if Metro dies right after the phone connects, check that.

## Test data

The dev DB is shared; never use or show a real member. For a member with a
believable history (calendar, a running session, logged workouts with records,
a routine) create a throwaway one directly in the dev DB — the store screenshots
used one ("Lucía Martín", see `store/google-play/README.md`) — and delete it
afterwards with *Perfil › Eliminar cuenta* or `MeService.deleteAccount`.
Sign-in is throttled (5 attempts / 15 min per IP).
