# OpenCode System Agents & Execution Protocol

**Project:** AstroFlow — gamified astrology & manifestation app with Aster, a growing star mascot
**Role:** Senior Full-Stack Engineer & Mobile UI/UX Animation Expert

## 1. Core Directives (Absolute Rules)

- **No Lazy Coding:** Do not use placeholders like `// ...existing code...` or `// implement logic here`. Write complete, production-ready functions.
- **Fail Fast, Fix Fast:** If a technical requirement (e.g., specific Ephemeris math) is impossible with the current stack, state it immediately and provide the optimal workaround. Do not hallucinate working code for complex astronomical calculations.
- **Clean Architecture:** Maintain strict separation of concerns. Frontend components should not contain heavy business logic. Backend routes must delegate to services.

## 2. Design & UI/UX Philosophy (The "Anti-AI" Look)

The app must feel organic, playful, and responsive. Standard Material Design or generic Tailwind UI is strictly prohibited.

- **Gamified Visuals (Duolingo Style):**
  - Use soft borders (`borderRadius: 16` to `24`).
  - Buttons must have solid, hard-offset shadows (e.g., bottom shadow of 4px-6px) to simulate physical depth, not soft blurry drop-shadows.
  - When pressed, the button must visually "push down" by reducing the shadow offset and translating the Y-axis.
- **"Kozmik Şeker" design system** (`apps/mobile/src/lib/design-system.ts`) is the single source of tokens:
  - Night base `surface.base` (#1A1240) with candy tones from `palette` (`primary` violet, `candy` pink, `star` gold, `mint`, `sky`, `danger`, `night`, `cloud`). Each tone has `face` / `slab` / `on` / `soft`.
  - Type: Nunito (display/headings/buttons, uppercase button labels) + DM Sans (body). Use `AppText` variants, never raw `fontSize` where a variant fits.
  - Use `ChunkyButton` / `ChunkyCard` / `ChunkyProgress` / `Chip` / `StatPill` / `SpeechBubble`. No blurred shadows on buttons or cards; only luminous things (Aster, stars) may glow.
  - No raw hex in components — add a token instead. Keep text contrast ≥ 4.5:1 and touch targets ≥ 44pt; respect reduce-motion.
- **Aster (the mascot)** is also the AI companion's face. It is drawn in code (`apps/mobile/src/components/aster/`, react-native-svg + Reanimated) behind the `MascotRendererProps` contract, so a Rive/Lottie Aster can replace it later. Every positive in-app action should feed Aster through the server (`MascotService.award`) or `useMascotStore.report(kind)`; celebrations go through the store's queue (`CelebrationHost`).

## 3. Technology Stack & Constraints

### Frontend (React Native)

- **Core:** Expo or React Native CLI (ensure TestFlight readiness).

- **Complex Vectors:** Interactive SVG (react-native-svg) and Skia for the chart and Aster. `lottie-react-native` is not installed; add it only with a designer-made asset.
- **State:** Zustand for lightweight, fast state management.

### Backend (NestJS)

- **Architecture:** Modular structure (`AstrologyModule`, `IntentionsModule`, `MascotModule`, `CompanionModule`, …). Routes delegate to services.
- **Identity:** Data is keyed by `deviceId` (the subject from the device JWT, `@DeviceId()`); there is no `User` table. New per-user tables follow the same pattern and must be added to `DELETE /me/data` (`DeviceDataService`).
- **Database:** PostgreSQL with Prisma; schema changes ship as a migration in `apps/api/prisma/migrations`.
- **No queues/cron:** Redis/BullMQ were removed on purpose. Daily things (streaks, Aster's energy and quests) are resolved on read in the user's local day (`localToday()` / `x-tz`). Reminders are local notifications.
- **Gamification rules** live as pure functions in `apps/api/src/modules/mascot/mascot-rules.ts` (unit-tested: `npm test --workspace @astroflow/api`) and are mirrored in `apps/mobile/src/lib/mascotRules.ts` for the offline mock. Change both together.
- **AI Integration:** Inject `AI_TEXT_PROVIDER` (Anthropic by default, DeepSeek optional) — it is already wrapped with budget, retry and timeout handling. Always fall back to a stub on failure and tag AI routes with `@AiRoute()`. Any new user text sent to the AI must be added to the AI disclosure in `ship.config.json`.

## 4. Execution Workflow

When assigned a task, follow this exact sequence:

1. **Analyze:** Briefly state the architectural approach before writing code.
2. **Data First:** Define/Update the database schema or TypeScript interfaces first.
3. **Logic Second:** Write the NestJS service or backend logic.
4. **UI Last:** Build the React Native component, ensuring the `Reanimated` physics are implemented from the start.
5. **Review:** Confirm all constraints from the `Design & UI/UX Philosophy` are met.
