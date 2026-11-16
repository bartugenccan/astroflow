/**
 * Key sky moments (Today card + sheet). Copy rules from the research note
 * (vault arastirma/astroloji-kilit-anlar.md): no fear language, no certain
 * predictions, nothing about health, death or breakups; an eclipse is a
 * months-long chapter, not a single day; every moment pairs with a practice.
 */
export const momentsEn = {
  cardLabel: "Key moment in your sky",
  more: "+{{n}} more",
  open: "Read more",
  sheetTitle: "Your sky moments",
  upcomingTitle: "Coming up",
  passesLabel: "Exact dates",
  seasonLabel: "Season",
  peakLabel: "Exact hit",
  houseLine: "In your {{house}} house",
  possibleChip: "Possible",
  possibleNote: "Your birth time is unknown, so your Moon's position is approximate. This moment is possible, not certain.",
  softNote: "A reflective note rather than a classic technique.",
  cta: "Write a manifest for this moment",
  ctaHint: "Opens a new manifest",
  remindMe: "Tell me the day before key moments",
  remindOn: "I'll let you know the day before.",
  empty: "No big moment in the next weeks. A calm sky is a good time to build habits.",
  error: "Couldn't read your sky moments right now.",
  when: {
    active: "Active now · until {{end}}",
    activeOpen: "Active now",
    upcoming: "From {{start}}",
    day: "{{date}}",
    range: "{{start}} – {{end}}",
  },
  /** Title form ("Saturn – Sun square"). */
  aspect: {
    conjunction: "conjunction",
    square: "square",
    opposition: "opposition",
  },
  /** Sentence form ("makes a square"). */
  aspectBase: {
    conjunction: "conjunction",
    square: "square",
    opposition: "opposition",
  },
  target: {
    Ascendant: "Ascendant",
    Midheaven: "Midheaven (MC)",
    NorthNode: "North Node",
    SouthNode: "South Node",
  },
  station: {
    retrograde: "turns retrograde",
    direct: "turns direct",
  },
  theme: {
    Jupiter: "growth and new doors",
    Saturn: "structure, responsibility and patience",
    Uranus: "change and freedom",
    Neptune: "dreams, intuition and letting go of control",
    Pluto: "deep transformation",
    Mercury: "thinking, talking and plans",
    Venus: "love, values and pleasure",
    Mars: "drive, courage and boundaries",
    Moon: "feelings and needs",
    Sun: "identity and direction",
  },
  title: {
    saturn_return: "Your Saturn return",
    saturn_return2: "Your second Saturn return",
    jupiter_return: "Your Jupiter return",
    nodal_return: "Your nodal return",
    nodal_reversal: "Your nodal reversal",
    outer_transit: "{{planet}} – {{target}} {{aspect}}",
    generational: "{{planet}} {{aspect}}",
    station_on_natal: "{{planet}} pauses on your {{target}}",
    chart_ruler_station: "Your chart ruler {{planet}} pauses",
    eclipse_solar: "Solar eclipse on your {{target}}",
    eclipse_lunar: "Lunar eclipse on your {{target}}",
    lunation_new: "New Moon on your {{target}}",
    lunation_full: "Full Moon on your {{target}}",
    retrograde_period: "{{planet}} retrograde",
    double_retrograde: "{{planet}} retrograde again",
  },
  body: {
    saturn_return:
      "Saturn is coming back to where it was when you were born, about every 29 years. A season for building adult foundations: what to keep, what to let go, what to take responsibility for.",
    jupiter_return:
      "Jupiter completes its 12-year lap and returns to its birth position. Themes of growth, learning and new doors.",
    nodal_return:
      "The Moon's nodes return to their birth position (about every 18.6 years). Questions of direction and purpose can come forward.",
    nodal_reversal:
      "The nodes sit in the reverse of their birth position. A natural time to look at old patterns and new directions side by side.",
    outer_transit:
      "Transiting {{planet}} makes a {{aspectBase}} to your natal {{target}}. Theme: {{theme}}. It unfolds over a period, not a single day.",
    generational:
      "{{planet}} makes a {{aspectBase}} to its own birth position, at age {{age}}. A passage people your age share.",
    station_on_natal:
      "{{planet}} {{station}} right on your natal {{target}}. Stations slow a planet down, so this theme stays in focus for a while: {{theme}}.",
    chart_ruler_station:
      "{{planet}} rules your rising sign and {{station}} now. A good time to check in with yourself and your direction.",
    eclipse:
      "The eclipse falls on your natal {{target}}. Eclipses open a chapter of about six months rather than marking one day.",
    lunation:
      "This {{lunation}} lands on your natal {{target}}. A good moment to set or refresh a manifest.",
    retrograde_period:
      "{{planet}} appears to move backwards from {{start}} to {{end}}. A time to review and rethink; nothing to fear.",
    double_retrograde:
      "{{planet}} was retrograde when you were born, too. This slower rhythm may feel familiar: a time to look back without rushing.",
  },
  lunationName: {
    new: "New Moon",
    full: "Full Moon",
  },
};
