# AstroFlow

Hafizasi olan gunluk astroloji yasam asistani: dogum haritasi yorumu + AI
companion + niyet/ritual dongusu.

## Mimari

```
apps/mobile     Expo (React Native) + expo-router, Zustand, Reanimated, i18n (en/tr)
apps/api        NestJS + Prisma + PostgreSQL, BullMQ worker (opsiyonel)
packages/shared Paylasilan tipler
```

**Astroloji motoru:** `circular-natal-horoscope-js` (`apps/api/src/modules/astrology/ephemeris.service.ts`)
**AI:** DeepSeek, `ai-text-provider.ts` arkasinda soyutlanmis (saglayici degistirilebilir)

## Gelistirme

```bash
docker compose up -d          # postgres (redis opsiyonel, yorumda)
npm install
npm run api                   # http://localhost:3000
npm run mobile                # Expo
```

Ortam degiskenleri: `apps/api/.env.example` ve `apps/mobile/.env.example`.

## Yayin

Yayin durumu, eksikler ve kontrol listeleri: **[SHIP.md](./SHIP.md)**

```bash
npx ship-kit doctor           # ship standardi denetimi
npx ship-kit preflight        # submit oncesi zorunlu kontroller
```

Magaza beyanlari `ship.config.json` icindedir ve `doctor` tarafindan **koda
karsi** dogrulanir - beyan ile kod celisirse denetim kirmizi yanar.
