# BARE-BONES MVP INSTRUCTION: Astrological Life Assistant

> **Context & Vision:**
> We are building the simplest viable MVP for an Astrology-based Life Assistant. All gamification, complex animations, and streak systems have been stripped out. The goal is strictly functional: collect birth data, calculate a highly accurate natal chart, display it cleanly, and provide a short daily AI-generated advice text based on current transits.

---

## 🛠️ Technology Stack & Architecture

- **Backend:** NestJS, PostgreSQL (Prisma or TypeORM).
- **Frontend:** React Native (Expo). Minimal, clean, and fast UI (standard React Native components are fine, keep styling modern but simple).
- **Astrology Engine:** `swisseph` (Swiss Ephemeris) Node.js wrapper or a reliable external Astrology REST API.
- **AI Integration:** DeepSeek API (for generating daily text).

---

## 📦 Core MVP Features

### Feature 1: User Onboarding & Database (Data Collection)

- **Database Schema:** Create a `User` and `BirthProfile` table.
- **Required Data:** Date of Birth (DD/MM/YYYY), Exact Time of Birth (HH:MM), and Birth Location (Latitude & Longitude).
- **Flow:** User enters this data upon registration, which is saved to the database to calculate the chart.

### Feature 2: Astrology Engine (Backend Core)

- **Service (`AstrologyService`):** A backend service that takes the user's birth data and calculates the exact astrological placements.
- **Output:** It must return the start degrees of the 12 houses (Cusps) and the exact zodiac signs/degrees of the core planets (Sun, Moon, Mercury, Venus, Mars, Jupiter, Saturn, Uranus, Neptune, Pluto).

### Feature 3: Chart Display & Placements List (Frontend Core)

- **UI Element 1 (The Chart):** A static or very simply drawn circular SVG astrological chart mapping the 12 houses and planet positions.
- **UI Element 2 (The List):** Below the chart, render a clean, readable flat list of the user's placements.
  - _Example Format:_ "Sun: Aries (1st House)", "Moon: Taurus (2nd House)".

### Feature 4: Daily AI Advice (Backend & Frontend)

- **Service (`AIDailyInsightService`):** Fetch the current day's planetary transits. Combine this with the user's natal chart data and send it as a prompt to the DeepSeek API.
- **Constraint:** The LLM must output exactly 2-3 sentences of actionable, practical daily advice (e.g., "The Moon is transiting your 2nd house today. It's a good day to review your budget and focus on financial stability.").
- **UI:** Display this short text prominently on the Home Screen when the user opens the app.

---

## 🎯 Execution Protocol

**Do not write the entire application at once.**

Please start with **Feature 1 & Feature 2** only:

1. Initialize the NestJS backend and define the PostgreSQL schema (Prisma/TypeORM) for the user's birth profile.
2. Create the `AstrologyService` that calculates or fetches the 12 houses and planetary placements based on the provided data.
3. Show me the database schema and the core logic for the astrology calculation. Wait for my approval before moving to the React Native frontend or AI integration.
