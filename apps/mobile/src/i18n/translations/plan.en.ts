/**
 * Today's personal sky plan (SkyPlanCard) and the morning sky check-in
 * (SkyCheckInCard). Step / why / tarot keys mirror the server's plan rules
 * (apps/api/src/modules/plan/plan-rules.ts); `mood.reply.<SKY>` mirrors the
 * mood check-in's replyKey.
 */
export const planEn = {
  title: "Your sky plan",
  focus: "Today's focus: {{area}}",
  moonLine: "Moon in your {{n}} house",
  progress: "{{done}}/{{total}}",
  progressA11y: "{{done}} of {{total}} steps done",
  expand: "Show the plan",
  collapse: "Hide the plan",
  xp: "+{{n}}",
  done: "Done",
  allDone: "All done! Aster is glowing",
  resting: "Aster is resting. Your plan will be here when you're back — your reading and chart stay open.",
  loadError: "I couldn't draw your plan just now.",
  week: "This week",
  weekA11y: "This week's strongest areas. Opens your forecast.",
  weekDay: "{{day}}: {{area}}",
  step: {
    skyCheckin: "Tell Aster how your sky feels",
    skyRead: "Read today's sky",
    checkin: "Practise for your power manifestation",
    createWish: "Write a manifestation",
    affirmation: "Say today's affirmation",
    reflection: "Close the day with three good things",
    breath: "Breathe with Aster for a minute",
    tarot: "Ask the cards today's question",
    moon: {
      new: "New Moon ritual: write a manifestation",
      full: "Full Moon ritual: harvest or release",
    },
  },
  why: {
    focus: "Your {{area}} day",
    gentle: "A softer day inside",
    moon: {
      new: "The New Moon is here",
      full: "The Moon is full",
    },
  },
  tarotQ: {
    harmonic: "How can I make the most of {{planet}} supporting my {{natal}} today?",
    challenging: "What is {{planet}} asking me to learn about my {{natal}} today?",
    neutral: "What should I notice as {{planet}} meets my {{natal}} today?",
    focus: "What does today hold for my {{area}}?",
  },
};

export const moodEn = {
  title: "How is your sky today?",
  subtitle: "Aster tunes your plan to it.",
  sky: {
    RADIANT: "Radiant",
    CLEAR: "Clear",
    PARTLY: "Partly cloudy",
    CLOUDY: "Cloudy",
    STORMY: "Stormy",
  },
  energy: "Energy",
  energyA11y: "Energy {{n}} of 5",
  send: "Tell Aster",
  error: "That didn't reach me. Try again?",
  reply: {
    RADIANT: "You're shining! Let's use that light on what matters most today.",
    CLEAR: "A clear sky — a lovely day to take one steady step.",
    PARTLY: "A few clouds are fine. We'll keep today light and kind.",
    CLOUDY: "Cloudy days are allowed. I'll keep your plan gentle.",
    STORMY: "Storms pass. Let's breathe together first — I'm right here.",
  },
  moon: "The Moon is in {{sign}}, your {{n}} house.",
  breathe: "Breathe",
  gotIt: "Got it",
};
