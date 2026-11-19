# Product Marketing Context

*Last updated: 2026-11-19*

## Product Overview
**One-liner (tr):** Burç yorumu okuduğun değil, yıldızını büyüttüğün astroloji uygulaması.
**One-liner (en):** The astrology app where you don't just read your sign — you grow your star.

**What it does:** AstroFlow calculates the birth chart (Sun, Moon, Rising, every planet, house and aspect) on the server and turns the day's transits into short, plain-language guidance. Around that sits a small daily habit loop: read your sky, write and practise a manifest (3-6-9, gratitude, read → record → hear it in your own voice), pull tarot, check compatibility. Every positive action feeds **Aster**, a star mascot that hatches from an egg, grows, collects constellations, writes a weekly letter and gently misses you when you're away. Aster is also the AI companion: you ask it about your day, a decision or a person and it answers from your chart and remembers what you told it.

**Product category:** Astrology / horoscope app (App Store: Lifestyle). Adjacent shelf: manifestation & affirmation apps, gamified self-care (Finch-like).

**Product type:** Consumer mobile app (iOS first, Expo/React Native; Android later — no Play account yet).

**Business model:** Freemium. Free: full chart + Big Three, daily guidance, 5 Aster messages/day, 1 tarot/day, compatibility with up to 2 saved people. Premium (monthly or yearly via RevenueCat; yearly starts with a 7-day free trial; prices set in App Store Connect): unlimited Aster, weekly & monthly forecasts, 30-day best-days calendar, unlimited compatibility, election (best-time) search, natal + 24-month transit PDF reports. The beta (everything open) ends with build 1.1.0 (9); subscriptions launch with the App Store release.

## Target Audience
**Primary:** Turkish-speaking women and young adults (≈18–34) who already follow burç accounts on Instagram/TikTok, check their horoscope casually and are curious about manifestation ("manifest", 3-6-9, olumlama). They like cute, gamified daily habits but get bored by walls of text.
**Secondary (wave 2):** English-speaking astrology/manifestation users of the same profile (US/UK).
**Primary use case:** A 2–3 minute daily ritual: what does today's sky mean for me, practise my manifest, keep my Aster happy.
**Jobs to be done:**
- "Tell me what today means for *me*, not for all Lions."
- "Help me keep a manifestation habit without it feeling like homework."
- "Give me someone to ask about a decision or a person, who knows my chart and remembers me."

## Personas
Not B2B — single user persona above. Two reading styles exist inside it: **sade** (wants 2 sentences) and **derin** (wants every aspect). The app supports both (`detailLevel` sade/derin, "Daha derine in").

## Problems & Pain Points
- Generic sign horoscopes feel like they're written for everyone (TR market is dominated by sign-level daily yorum: Mynet Astroloji, Twitburc, news-site burç pages).
- Full astrology apps drown you in text; users said "kullanıcıyı yazıya boğmak" is the biggest problem.
- Manifestation is popular but there's no structure or feedback; people start and drop it.
- Privacy worry: birth data is sensitive.

## Competitive Landscape
**Direct (global):** Co-Star (cold, text-heavy, notifications with an edge), The Pattern (psychological, heavy), Nebula / Astroline (paid readers, aggressive paywalls), CHANI (calm, US-centric). None are gamified, none have a mascot, Turkish support is weak or missing.
**Direct (TR):** Mynet Astroloji, Twitburc, MapAstro (AI), Astroloji Quiz — sign-level content, love/career focus, ad-supported; mostly sign-level readings, no habit loop, no character.
**Secondary:** Manifestation/affirmation apps (I Am, ThinkUp-style voice affirmations) — habit but no astrology.
**Indirect:** Instagram/TikTok burç accounts and astrologer YouTube channels — free, entertaining, not personal.

## Differentiation
- **Aster:** a growing, code-drawn star buddy with real jobs (it hatches, grows, misses you, answers you). Nobody in astrology has a character.
- **Calculated chart, plain words:** positions calculated on the server for the exact birth moment, two reading depths. (Market positions as *calculated*, never interpretations as *real/true*; accuracy claims only from `npm run check:astro`.)
- **Manifest in your own voice:** read → record → hear it back; recordings stay on the phone.
- **Turkish-first:** native tr copy, not a translation.
- **Privacy by design:** raw birth date/time/place never goes to the AI; no account needed; delete-my-data in app.

## Objections
| Objection | Response |
|-----------|----------|
| "Astrology apps are all the same text." | You get 2 sentences by default and a star that grows when you show up. |
| "Is this a kids' game?" | The chart is fully calculated (every planet, house, aspect, transits, solar return, election). Aster is the friendly face of it. |
| "What happens to my birth data?" | Calculated on our server; the AI only sees derived placements, never your raw birth info. No account needed. |
| "Another subscription?" | The daily practice is free; premium is for depth. (Pricing and the free/premium split are an open decision until payments ship — don't promise "free forever".) |

**Anti-persona:** people wanting fatalistic predictions (health, death, break-ups) — the app does not do fear or certainty ("rehberlik, asla kader değil").

## Switching Dynamics
**Push:** sign horoscopes feel generic; other apps feel cold or overwhelming; manifest habit keeps fading.
**Pull:** a cute character that reacts to you; a reading that's clearly about *your* chart; voice manifest.
**Habit:** daily Instagram burç scroll is free and easy.
**Anxiety:** birth data privacy, paywall surprises, "is it accurate if I don't know my birth time?" (works without time, just no houses).

## Customer Language
**How they describe the problem (tr):** "burç yorumları herkese aynı", "çok uzun yazıyor", "manifest yapıyorum ama devam edemiyorum", "Merkür retrosu yine", "yükselenim ne", "Big Three'm".
**How they describe us:** (to collect after launch — onboarding "nereden duydun" + reviews)
**Words to use (tr):** manifest, pratik, haritan, Büyük Üçlü / Big Three, yükselen, gökyüzün, Aster, yıldız dostun, sade, derin.
**Words to avoid (tr):** **niyet, dilek** (not understood — always "manifest"), "kader", "kesin", fear language ("seni bekleyen felaket"), "beta".
**Glossary:**
| Term | Meaning |
|------|---------|
| Aster | The star mascot + AI companion |
| Manifest | What the user writes/practises (code id: `intentions`) |
| Pratik | A manifest check-in |
| Yıldız Tozu / Işık | Aster's in-app currencies |
| Gökyüzü anı | A personal sky moment (e.g. chiron return, progressed moon) |

## Brand Voice
**Tone:** warm, playful, calm; a friend who knows astrology, never a fortune teller.
**Style:** short sentences, second person ("sen"), concrete; Aster speaks in a cute but not childish way.
**Personality:** sevimli, meraklı, sakin, dürüst, cesaretlendirici.
**Visual:** "Kozmik Şeker" — night base #1A1240, electric violet #7C4DFF, candy pink, star gold, mint; chunky Duolingo-style buttons; Nunito + DM Sans.

## Proof Points
**Metrics:** none yet (pre-launch).
**Customers:** TestFlight testers.
**Testimonials:** to collect at launch.
**Value themes:**
| Theme | Proof |
|-------|-------|
| Personal, not generic | Server-side natal + transit calculation; measured against astronomy-engine (`check:astro`) |
| Not overwhelming | sade/derin reading modes |
| Habit that sticks | Aster growth loop, streaks, welcome-back gifts |
| Private | No raw birth data to AI, no account, in-app delete |

## Goals
**Business goal:** Become visible in Turkey with zero ad budget; first 1,000 organic installs and first ratings in the first 90 days after launch, then copy the working formats to English.
**Conversion action:** App Store install → onboarding completed → Aster hatched.
**Current metrics:** pre-launch (TestFlight). Analytics: PostHog (anonymous), ASC App Analytics.

## Paid Ads (optional)
Not running ads (budget: zero).

## Learnings
| Date | Learning | Source |
|------|----------|--------|
| 2026-11-10 | "Niyet" isn't widely understood in Turkey; "manifest" is the word people know | User feedback |
| 2026-11-19 | Users split into "basic" vs "detail" readers; text overload is the top complaint | TestFlight feedback |

## Changelog
| Date | Change | Source |
|------|--------|--------|
| 2026-11-19 | Initial draft from README, landing copy, store screenshot benefits, project notes | Claude (to be confirmed by founder) |
