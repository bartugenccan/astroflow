# OpenCode System Agents & Execution Protocol

**Project:** Astro-Frekans Gamified Life Assistant (MVP)
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
- **Motion & Physics:**
  - Linear animations and simple fades are banned for primary interactions.
  - Use `react-native-reanimated` (v3) exclusively.
  - All transitions, bottom sheets, and scaling effects MUST use `withSpring` (spring physics) to feel bouncy and organic. Reference Catalin Miron's Duolingo clone mechanics.
- **Tactile Feedback:** Every positive interaction (streak completed, chart unlocked) must trigger a haptic response via `expo-haptics` or `react-native-haptic-feedback`.

## 3. Technology Stack & Constraints

### Frontend (React Native)

- **Core:** Expo or React Native CLI (ensure TestFlight readiness).
- **Animations:** `react-native-reanimated`, `react-native-gesture-handler`.
- **Complex Vectors:** Use `lottie-react-native` or interactive SVGs for the Astrological Chart and the Cymatics Water Crystal.
- **State:** Zustand for lightweight, fast state management.

### Backend (NestJS)

- **Architecture:** Modular structure (`UsersModule`, `AstrologyModule`, `GamificationModule`).
- **Database:** PostgreSQL with Prisma or TypeORM. Ensure relational integrity between `Users`, `BirthProfiles`, and `UserStreaks`.
- **Queues/Workers:** Redis and BullMQ are mandatory for CRON jobs (streak resets at midnight local time) and scheduling optimal "ritual" push notifications.
- **AI Integration:** DeepSeek API calls must be wrapped in a resilient service with retry mechanisms and timeout handling.

## 4. Execution Workflow

When assigned a task, follow this exact sequence:

1. **Analyze:** Briefly state the architectural approach before writing code.
2. **Data First:** Define/Update the database schema or TypeScript interfaces first.
3. **Logic Second:** Write the NestJS service or backend logic.
4. **UI Last:** Build the React Native component, ensuring the `Reanimated` physics are implemented from the start.
5. **Review:** Confirm all constraints from the `Design & UI/UX Philosophy` are met.
