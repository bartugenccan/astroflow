# customer-simulator: AstroFlow project notes

Read by the global `customer-simulator` skill (§1.1). These notes only get the app running and
point at known issues. They don't tell you what works.

## Targets
- **Mobile app** (`apps/mobile`, Expo dev-client build, no `react-native-web`). Expo web is
  **not** a valid target (secure-store, Skia and native sign-in don't work there). Use the
  Android emulator. There is no iOS simulator on this Windows machine.
- **Web** (`apps/web`, Next.js): `npm run web` → `http://localhost:3001`. Landing/marketing
  surface, good for first-impression and trust checks. Use a browser tool.

## Environment (Windows, user-level, no admin)
- JDK 17: `%LOCALAPPDATA%\Programs\Java\jdk-17.0.21+9`. SDK: `%LOCALAPPDATA%\Android\Sdk`.
  AVD **`AstroFlow_Pixel`** (Pixel 7, Android 16, Play Store image, 1080×2400).
  `JAVA_HOME`, `ANDROID_HOME`, `PATH` are user env vars. A shell started before setup won't see
  them, so use full paths (`$LOCALAPPDATA/Android/Sdk/platform-tools/adb.exe`).
- Start order: **Docker Desktop** (Postgres container `astroflow-postgres`) → `npm run api`
  (repo root, port 3000) → emulator → Metro. If the chart fails with a poetic error, check the
  API log for `ECONNREFUSED` first: that's Docker being stopped, not an app bug.
- The app calls the API at `EXPO_PUBLIC_API_URL=http://192.168.1.103:3000` (LAN IP, reachable
  from the emulator). If the LAN IP changed, update it at launch time, not in files.
- Boot the emulator if `adb devices` shows nothing:
  `"$LOCALAPPDATA/Android/Sdk/emulator/emulator.exe" -avd AstroFlow_Pixel -no-boot-anim`
  (detached), then wait until `adb shell getprop sys.boot_completed` returns `1`.

## Dev build (fast iteration, NOT for performance numbers)
- If installed (`adb shell pm list packages | grep com.astroflow.app`), start Metro:
  `npx expo start --dev-client --port 8081` in `apps/mobile` (background), then
  `adb shell am start -a android.intent.action.VIEW -d "exp+astroflow://expo-development-client/?url=http%3A%2F%2F192.168.1.103%3A8081"`.
- Rebuild only if native deps changed or the app is missing:
  `npx expo run:android --device emulator-5554` in `apps/mobile` (≈5 min warm, ≈20 min cold).
  - `apps/mobile/android/local.properties` must contain
    `cmake.dir=C\:\\Users\\bartu\\AppData\\Local\\Android\\Sdk\\cmake\\3.31.6`. The default
    CMake 3.22 ninja fails on Windows long paths (reanimated). Re-add it after any
    `expo prebuild --clean`.
  - `expo run:android` rewrites the `android`/`ios` scripts in `apps/mobile/package.json`.
    Revert with `git checkout -- apps/mobile/package.json`.

## Release build (performance and animation measurements)
- `npx expo run:android --variant release --device emulator-5554` in `apps/mobile`. Release is
  minified, Hermes, new architecture, signed with the debug keystore (fine for testing). The JS
  is bundled in, so Metro isn't needed. `EXPO_PUBLIC_*` values are baked in at build time, so
  set them on the build command line.
- Alternatively `eas build -p android --profile preview --local` (needs an EAS login).
- Measure with `adb shell dumpsys gfxinfo com.astroflow.app reset` → one flow → `dumpsys gfxinfo`.

## Feature flags (launch-time only, never edit files)
- Everyone is Premium during the beta: client `EXPO_PUBLIC_PREMIUM_BETA` defaults to `true`
  (`eas.json` sets it for all profiles); the API reads `PREMIUM_BETA` from `apps/api/.env`.
- To test the free tier and paywall, start **both** with the flag off:
  `PREMIUM_BETA=false npm run api` and `EXPO_PUBLIC_PREMIUM_BETA=false npx expo start --dev-client`
  (or on the release build command). If only one side is off, compatibility can lock with no
  way out; that combination isn't a real-user state, don't report it as one.
- There is no payment SDK yet. A real purchase flow can't be tested.

## First-time state and language
- `adb shell pm clear com.astroflow.app`, then
  `adb shell cmd locale set-app-locales com.astroflow.app --locales tr-TR`, then launch. The
  app reads the device language only on first launch and then saves it. English run:
  `--locales en-US`.
- The UI is Turkish-first. Judge copy as a Turkish speaker would. Note untranslated or
  mixed-language text. Turkish suffix rule after "Aster": Aster'e / Aster'in / Aster'i.
  In Turkish UI the practice is called "manifest"/"pratik", never "niyet"/"dilek".

## Dev-only chrome (ignore, never report)
The dev menu sheet ("This is the developer menu… Continue") and the floating blue gear button in
the top right. Dismiss the sheet with Continue / ✕. The `__expo_disable_*` URL flags don't hide
them reliably.

## Domain expert profiles (astrology)
Use these for the domain-expert persona. Check every claim against an independent ephemeris
(e.g. astro.com, or any published ephemeris table).
- **1997-09-24**: natal Saturn retrograde. Saturn is retrograde again in late 2026 (a "double
  retrograde"), and this birth year is in its first Saturn-return window around 2026–2027.
  Does the app surface this?
- **1990-05-15 08:30**: the default test profile used in earlier runs.
- Add 1–2 more birth dates whose charts have different notable features (e.g. an eclipse on the
  natal Sun this year, a Jupiter return this year) so the test shows whether highlights are
  really personal.

## Areas to cover (from earlier runs)
Not opened in the first run (2026-11-10): Aster shop, breathe, constellations, letter,
year-ahead, election, compatibility, companion chat ("Aster'e sor"), reports (PDF), ritual,
"Kağıda yaz", 3-6-9 and "Görselleştir" practices, the affirmation recording library.

## Known issues reported by the owner
- **Welcome → "Zaten hesabın var mı? Giriş yap"**: the sign-in page's entry animation jumps
  past the screen edge. Record it (`adb shell screenrecord`) and describe it.
- Tarot and other animation-heavy screens may stutter. Measure on a release build.

## Personas especially relevant here
- **Skeptical**: astrology plus a subscription, so trust, legal links and pricing clarity matter.
- **Impatient**: birth data entry during onboarding.
- **Domain expert**: the product's differentiator is personal, accurate sky moments.

## House rules
- Don't commit report files. The user handles git.
- Reports: `customer-sim-reports/YYYY-MM-DD-<target>.md`.
