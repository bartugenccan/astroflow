/**
 * Glossary copy. Written for someone who has never read a horoscope, without
 * dumbing the detail down: `short` answers "what is this?", the rest is there
 * for whoever taps "Go deeper".
 */
export const glossaryEn = {
  ui: {
    whatIs: "What's this?",
    goDeeper: "Go deeper",
    showLess: "Show less",
    whatTitle: "What it is",
    howTitle: "How it's worked out",
    lifeTitle: "What it says about you",
    exampleTitle: "For example",
    yoursTitle: "In your chart",
    relatedTitle: "Related",
    screenTitle: "Glossary",
    screenEyebrow: "Astrology, explained",
    screenSub: "Every word the app uses, in plain language — with the detail underneath when you want it.",
    searchPlaceholder: "Search a term",
    noResults: "No term matches that.",
    openGlossary: "Glossary",
    openGlossarySub: "Every term, explained",
  },
  yours: {
    natalChart: "Cast for {{date}} at {{time}}, {{place}}.",
    bigThree: "Yours: {{sun}} Sun, {{moon}} Moon, {{rising}} Rising.",
    sun: "Your Sun is in {{sign}} ({{deg}}), in your {{house}}.",
    moon: "Your Moon is in {{sign}} ({{deg}}), in your {{house}}.",
    rising: "Your rising sign is {{sign}}, at {{deg}}.",
    midheaven: "Your career point is in {{sign}}.",
    planet: "The planet with the loudest voice in your chart: {{planet}}.",
    house: "Your busiest area is your {{house}}, with {{n}} planets in it.",
    aspect: "Your chart has {{n}} major connections. The tightest: {{phrase}}.",
    orb: "Your tightest connection is only {{orb}}° from exact: {{phrase}}.",
    retrograde: "Moving backward when you were born: {{list}}.",
    retrogradeNone: "None of your planets were moving backward when you were born.",
    northNode: "Your North Node is in {{sign}}, in your {{house}}.",
    saturnReturn: "Your first Saturn return arrives around age {{age}}.",
    day: "You were born in daylight — the Sun was above the horizon.",
    night: "You were born after dark — the Sun was below the horizon.",
  },
  terms: {
    natalChart: {
      title: "Natal chart",
      short: "A map of the sky at the exact minute and place you were born.",
      what:
        "Picture standing where you were born and freezing the sky at your first breath. The natal (birth) chart is that snapshot drawn as a circle: where the Sun, Moon and planets were, which zodiac sign each sat in, and which part of the sky they occupied.",
      how:
        "Your date, time and place are turned into exact planetary positions using astronomical tables (an ephemeris). The time and place also fix the horizon — which sign was rising in the east — and that splits the circle into twelve houses. That's why birth time matters: two people born on the same day hours apart get different charts.",
      life:
        "Astrology reads the chart as a portrait of temperament: what drives you (Sun), what you need to feel safe (Moon), how you meet the world (Rising), and how the rest of your energies cooperate or clash. It doesn't change — everything else in the app is compared against it.",
      example:
        "The wheel in the You tab, under \"In a picture\", is your natal chart. Each glyph on the ring is a planet in its sign.",
    },
    bigThree: {
      title: "The Big Three",
      short: "Your Sun, Moon and Rising sign — the three quickest keys to a chart.",
      what:
        "Most people only know their Sun sign (\"I'm a Leo\"). The Big Three add the Moon sign and the Rising sign, and together they describe a person far better than any one of them alone.",
      how:
        "The Sun sign comes from your birth date. The Moon changes sign every two to three days, so it needs the date and roughly the time. The Rising sign changes about every two hours, so it needs your exact birth time and place.",
      life:
        "Think of them as core, heart and front door: the Sun is who you're becoming, the Moon is how you feel and recharge, the Rising is the first impression you give and the way you start things.",
      example:
        "A Capricorn Sun, Pisces Moon, Leo Rising might look confident and warm on the outside, be ambitious at heart, and quietly sensitive underneath.",
    },
    sun: {
      title: "Sun",
      short: "Your core self — what you're here to grow into.",
      what:
        "The Sun is the center of the chart the way it's the center of the solar system. Its sign is the \"star sign\" people mean when they ask what you are.",
      how:
        "The Sun moves through all twelve signs once a year, spending about a month in each, so your birth date is enough to place it. Near the edge of two signs (the \"cusp\") the exact time decides.",
      life:
        "It shows your drive, your sense of purpose and what makes you feel most like yourself. Its house shows the part of life where you most want to shine.",
      example:
        "Sun in Aries: a need to start things and lead. Sun in Cancer: a need to protect and build a home.",
    },
    moon: {
      title: "Moon",
      short: "Your emotional side — what you need to feel safe and at ease.",
      what:
        "Where the Sun is who you're becoming, the Moon is who you already are when no one's watching: your moods, instincts, habits and comfort zone.",
      how:
        "The Moon is the fastest body in the chart. It changes sign every 2–3 days, so on some birth dates only the time tells which sign it was in.",
      life:
        "It describes how you react, what soothes you, and what you need from the people close to you. In the daily sky it's also the main mood-setter — its sign today colors how everyone feels.",
      example:
        "Moon in Taurus finds calm in routine and physical comfort. Moon in Gemini settles down by talking things through.",
    },
    rising: {
      title: "Rising sign (Ascendant)",
      short: "The sign that was rising on the eastern horizon when you were born — your \"front door\".",
      what:
        "Also called the Ascendant (AC or ASC on the wheel). It's the point where the eastern horizon cut the zodiac at your birth, and it's the starting line of your whole chart.",
      how:
        "The Earth turns, so every sign rises over the horizon once a day — roughly one sign every two hours. That's why it needs your exact birth time and place. It also decides where your 1st house begins, which sets up all twelve houses.",
      life:
        "It's your style, your first impression, the way you walk into a room and start new things. People often recognize someone's Rising before their Sun.",
      example:
        "A Virgo Sun with Sagittarius Rising may come across as open and adventurous before their careful side shows.",
    },
    planet: {
      title: "Planets",
      short: "The actors in a chart — each one stands for a different part of you.",
      what:
        "In astrology \"planets\" include the Sun and Moon. Each is a drive: Mercury thinks and talks, Venus loves and values, Mars acts and wants, Jupiter expands, Saturn structures, Uranus disrupts, Neptune dreams, Pluto transforms.",
      how:
        "Their positions at your birth are calculated astronomically. The inner, faster planets (Moon to Mars) describe your personal style; the slow outer planets spend years in a sign and speak more about your generation — unless they sit on a sensitive point in your chart.",
      life:
        "A planet tells you what part of you is involved; its sign says how it behaves; its house says where in life it shows up.",
      example:
        "Venus in Scorpio in the 7th house: love (Venus) that runs deep and intense (Scorpio), expressed through close partnerships (7th house).",
    },
    sign: {
      title: "Zodiac signs",
      short: "Twelve styles a planet can act in — the \"how\".",
      what:
        "The zodiac is the band of sky the Sun, Moon and planets travel along, divided into twelve equal 30° slices: Aries to Pisces. A planet in a sign takes on that sign's style.",
      how:
        "Each sign has an element (fire, earth, air, water) and a mode (starting, steady, adaptable). Fire is spirited, earth practical, air mental, water emotional — that pairing gives each sign its character.",
      life:
        "Signs don't act by themselves; they flavor the planets in them. That's why \"I'm a Scorpio\" is only one twelfth of the story.",
      example:
        "Mars (drive) in Libra acts diplomatically; Mars in Aries acts immediately.",
    },
    house: {
      title: "Houses",
      short: "Twelve areas of life — the \"where\" in your chart.",
      what:
        "The chart wheel is cut into twelve slices called houses. Each one is a part of life: self (1st), money (2nd), communication (3rd), home (4th), creativity and romance (5th), daily work and health (6th), partners (7th), shared resources and intimacy (8th), beliefs and travel (9th), career (10th), friends (11th), rest and the inner world (12th).",
      how:
        "Houses are fixed by your birth time and place: the 1st house starts at your Rising sign and they continue counter-clockwise. Each house also has a sign on its starting edge (the cusp) and a \"ruler\" — the planet linked to that sign — which carries its story elsewhere in the chart.",
      life:
        "A house full of planets is a busy part of your life. An empty house isn't a missing part of life — it just runs more quietly, and its ruler tells you how.",
      example:
        "Sun in the 10th house: identity tied to career and public life. Moon in the 4th: deep attachment to home and family.",
    },
    aspect: {
      title: "Aspects",
      short: "Angles between planets — how two parts of you get along.",
      what:
        "When two planets sit certain distances apart around the circle, they \"talk\" to each other. Those conversations are aspects, and they're drawn as lines inside the wheel.",
      how:
        "The main ones: conjunction (0°, merged), sextile (60°, an opening), square (90°, friction that pushes you to act), trine (120°, easy flow), opposition (180°, a pull between two ends). Sage lines in the wheel are easy aspects, rose lines are tense ones.",
      life:
        "Easy aspects are talents you take for granted. Tense ones are where you grow — they create pressure, but also motivation. Neither is simply good or bad.",
      example:
        "Moon square Mars: feelings flare into action fast. Venus trine Jupiter: warmth and generosity come naturally.",
    },
    orb: {
      title: "Orb (strength)",
      short: "How close an aspect is to exact — the closer, the stronger.",
      what:
        "Planets rarely sit at a perfect 90° or 120°. The orb is how many degrees off exact they are. The app shows it as a word: Exact, Strong, Clear or Faint.",
      how:
        "Under 1° reads as exact, up to about 3° as strong, up to about 6° as clear, and wider as faint. The Sun and Moon are allowed slightly wider orbs because they're the most important bodies.",
      life:
        "A tight aspect is something you feel constantly; a wide one is more of a background tone. For daily transits, a tightening orb means the effect is building; a widening one means it's fading.",
      example:
        "Sun square Saturn at 0.4° is a defining tension in a chart; at 7° it's barely there.",
    },
    transit: {
      title: "Transits",
      short: "Where the planets are today, and how that touches your birth chart.",
      what:
        "Your natal chart is frozen, but the sky keeps moving. A transit is a current planet forming an aspect to one of your natal planets or points. It's how astrology talks about timing.",
      how:
        "Today's planetary positions are compared with your chart. When a moving planet makes a meaningful angle to one of yours, that's a transit. Fast planets (Moon, Mercury, Venus) create day- or week-long moods; slow ones (Saturn, Pluto) create chapters that last months.",
      life:
        "Transits don't make things happen; they describe the weather you're walking through — when it's a good moment to push, rest, talk, or wait. The Today and Ahead tabs are built from them.",
      example:
        "Jupiter crossing your Sun: a period of confidence and opportunity. Saturn squaring your Moon: a heavier stretch that asks for patience.",
    },
    retrograde: {
      title: "Retrograde (℞)",
      short: "When a planet looks like it's moving backward in the sky.",
      what:
        "No planet actually reverses. Because the Earth and the planets orbit at different speeds, a planet sometimes appears to drift backward against the stars for a while, like a slower car seeming to roll back when you pass it.",
      how:
        "Mercury does this three or four times a year for about three weeks; Venus and Mars less often; the outer planets for months every year. The app marks it with ℞.",
      life:
        "Astrology reads a retrograde as a time to re-: review, revisit, repair, reconsider. In a birth chart it suggests a planet whose energy works more inwardly or in its own way.",
      example:
        "Mercury retrograde is a classic time for double-checking messages and plans rather than launching new ones.",
    },
    midheaven: {
      title: "Midheaven (career point)",
      short: "The highest point of your chart — your public direction and calling.",
      what:
        "The Midheaven (MC) is where the Sun would be at noon: the top of the chart. It marks the start of the 10th house.",
      how:
        "Like the Rising sign, it depends on exact birth time and place; the two are always roughly a quarter of the circle apart.",
      life:
        "It describes reputation, career direction and what you want to be known for — not necessarily your job title, but the kind of mark you want to make.",
      example:
        "Midheaven in Aquarius: recognition through originality, technology or causes that help many people.",
    },
    northNode: {
      title: "Lunar nodes",
      short: "Two points showing where you're growing (North) and what comes easily (South).",
      what:
        "The nodes aren't planets; they're the two points where the Moon's path crosses the Sun's path. They always sit exactly opposite each other.",
      how:
        "They move slowly backward through the zodiac, spending about 18 months in each sign. The North Node's sign and house describe a direction; the South Node, directly opposite, describes familiar ground.",
      life:
        "The South Node is your comfort zone — skills you lean on. The North Node is the direction that feels unfamiliar but fulfilling. Growth tends to happen when you move toward it without abandoning what you already have.",
      example:
        "North Node in Libra, South in Aries: learning partnership and compromise after a habit of doing everything alone.",
    },
    saturnReturn: {
      title: "Saturn return",
      short: "When Saturn comes back to where it was at your birth — around ages 29, 58 and 87.",
      what:
        "Saturn takes about 29.5 years to go all the way around the zodiac. When it returns to its birth position, astrology sees a major life checkpoint.",
      how:
        "The app calculates when Saturn reaches the exact degree it held in your chart. The effect is usually felt for a year or two around that date.",
      life:
        "It's known for maturity tests: what isn't built on solid ground tends to be questioned — careers, relationships, where you live — and what's real gets stronger. Many people later describe it as the moment they became a real adult.",
      example:
        "Changing career, committing to a relationship, or moving cities around 28–30 is often linked to the first Saturn return.",
    },
    dayNightChart: {
      title: "Day or night chart",
      short: "Whether the Sun was above or below the horizon when you were born.",
      what:
        "Traditional astrology splits charts into day and night births (called sect). It's simple to see: if the Sun is in the top half of the wheel, it's a day chart.",
      how:
        "It depends on the Sun's position relative to your Rising sign, so it needs your birth time.",
      life:
        "In a day chart the Sun, Jupiter and Saturn tend to express more constructively; in a night chart the Moon, Venus and Mars do. It subtly changes which planets are your natural helpers.",
      example:
        "In a night chart, a hard Saturn placement reads heavier, while Venus and the Moon offer more support.",
    },
    solarReturn: {
      title: "Solar return (your birthday chart)",
      short: "A chart for the moment the Sun returns to its birth position each year — a forecast from birthday to birthday.",
      what:
        "Once a year, on or near your birthday, the Sun comes back to the exact degree it held when you were born. A chart cast for that moment is your solar return, and astrologers read it as the theme of your coming year.",
      how:
        "The app finds the exact minute of your solar return (it can be a day either side of your birthday) and builds a full chart for it. Its Rising sign, where the Sun lands among the houses, and the busiest houses describe the year's focus. It's then compared with your birth chart.",
      life:
        "It tells you where the year puts its weight — career, relationships, home, health — how you'll come across, and which months carry the most change. It resets every birthday.",
      example:
        "A solar return with the Sun in the 7th house points to a year centered on partnerships — a new relationship, a business partner, or reworking an existing bond.",
    },
    synastry: {
      title: "Synastry (compatibility)",
      short: "Comparing two birth charts to see how two people interact.",
      what:
        "Synastry lays one person's chart over another's and looks at the aspects between them: your Venus to their Mars, your Moon to their Sun, and so on.",
      how:
        "Every planet in one chart is compared with every planet in the other. Tight, important contacts (Sun, Moon, Venus, Mars, Rising) weigh most. The app groups them into dimensions like attraction, communication and commitment.",
      life:
        "It shows where two people naturally click and where they'll need effort — useful for partners, but also friends, family and colleagues. Tension here isn't a verdict; it's where the relationship asks for understanding.",
      example:
        "Your Moon trine their Sun: they tend to feel supported by you, and you by them. Your Mars square their Mercury: arguments can escalate fast.",
    },
  },
};
