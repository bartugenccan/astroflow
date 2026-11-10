/**
 * Aster's voice on the onboarding, chart and Sky screens (UI pass C1).
 * Short, warm, first-person lines — Aster opens doors, it never lectures.
 */
export const screensEn = {
  welcome: {
    asterAsk: "Hi, I'm Aster — still curled up in my egg. What should I call you?",
    asterGreet: "Nice to meet you, {{name}}! Shall we read your sky together?",
  },
  onboarding: {
    asterDate: "What did the sky look like the moment you were born? Let's start with the day.",
    asterTime: "The hour tells me which sign was rising on the horizon. A guess is fine too.",
    asterPlace: "Last one! Where were you born? That sets the horizon your chart is drawn from.",
    placeLoading: "Looking for your city…",
    placeEmpty: "I couldn't find that city. Try another spelling — or enter the coordinates.",
    placeOffline: "I can't reach the map right now. You can still enter the coordinates.",
  },
  consent: {
    aster: "Before we look at your sky: I read it with help from AI. Here's exactly what that means.",
  },
  reveal: {
    asterLine: "Your Sun is in {{sun}}, your Moon in {{moon}}, and {{rising}} was rising… I'm starting to know you, {{name}}.",
    asterLineNoRising: "Your Sun is in {{sun}} and your Moon in {{moon}}… I'm starting to know you, {{name}}.",
    friend: "friend",
    error: "The sky got a little cloudy and I couldn't cast your chart. Shall we try again?",
  },
  tour: {
    progress: "{{n}} / {{total}}",
    skipA11y: "Skip the tour and enter AstroFlow",
  },
  sky: {
    hintChart: "Tap your wheel to see every planet — I'll explain each one.",
    hintFuture: "Here's what's coming. Your birthday chart sits on top.",
    hintMatch: "Curious about someone? Add them and I'll compare your skies.",
    hintAsk: "Ask me anything — I'll read the answer from your chart.",
  },
  chart: {
    transitBanner: "Today {{transit}} touches your natal {{planet}}",
    transitBannerBody: "Open your {{planet}} below to see what it holds, or see everything the sky is doing today.",
    transitCta: "See today's transits",
    signBanner: "Your {{sign}} corner",
    signPlanets: "{{planets}} sit in {{sign}} in your chart.",
    signPlanetsOne: "{{planets}} sits in {{sign}} in your chart.",
    signEmpty: "None of your planets sit in {{sign}} — its themes still colour the part of life it rules.",
    dismiss: "Hide this note",
    error: "I couldn't draw your chart this time.",
  },
  states: {
    transitsError: "I couldn't read today's sky this time.",
  },
};
