# SHIP.md - AstroFlow yayin durumu

> `ship-kit` tarafindan yonetilir. Denetim: `npx ship-kit doctor`
> Submit oncesi: `npx ship-kit preflight`

## Kod durumu (2026-08-29 denetimi)

21.346 satir kaynak kod, **0 TODO / 0 FIXME / 0 not-implemented**. Iskelet degil,
yazilmis kod. Asagidakiler denetimle **dogrulanmis** eksiklerdir.

| Alan | Durum |
|---|---|
| API modulleri (astrology, companion, gamification, intentions, users, ai) | ✅ yazilmis |
| 10 ekran ailesi + design system + UI kit | ✅ |
| i18n (en + tr) | ✅ |
| Paylasilabilir kart (`features/share/`) | ✅ dagitim motoru kodda |
| 5 Prisma migration | ✅ |
| Auth / JWT, hesap silme ucu | ✅ `DELETE /users/account` |
| CI, eas.json, Dockerfile, biome, .env.example | ✅ ship-kit apply ile kuruldu |

## TestFlight beta hazirligi (2026-10-30)

Karar: TestFlight'ta **herkes beta Premium** (odeme yok), **yerel hatirlaticilar** (push yok), API **Railway**'de.
`ship-kit doctor`: 27 gecti / 12 kaldi / 3 uyari (onceki 22/16/5).

Kodda yapilanlar:
- Paywall release'de beta metni gosterir ("Beta boyunca tum Premium ozellikler acik").
- Yerel bildirimler: `expo-notifications`, Profil'de gunluk yorum + aksam check-in hatirlaticisi, saat secici, dokununca dogru ekran. Push token yok.
- AI / eglence bildirimi + onay (dogum verisi girilmeden once; eski kurulumlar ve hesapla girenler icin root'ta bir kez). Profil > Yardim ve yasal: gizlilik, sartlar, destek, AI notu. Aster'da "AI ile yazildi" dipnotu.
- Niyet check-in'leri kullanicinin yerel gunune gore (`x-tz` basligi).
- `supportsTablet: false` (iPad ekran goruntusu gerekmez), production profilinde `SENTRY_ALLOW_FAILURE`.
- Eski `users`/`gamification`/`workers` modulleri ve kullanilmayan bagimliliklar (bullmq, ioredis, passport, bcrypt, @nestjs/schedule) kaldirildi; `nest build` temiz.
- `railway.json` + Dockerfile: prisma CLI artik runtime bagimliligi, migration'lar `preDeployCommand` ile.

### Guvenlik denetimi (ship-security, 2026-10-30) — kapatilanlar
Dogrulama: scratch API + PGlite + sahte Anthropic ile 17/17 e2e + 4 OTP kontrolu gecti.
- **Okuma onbellegi sahibe bagli**: dogum verisini bilen baska cihaz kimsenin okumasini goremez; `DELETE /me/data` hepsini siler (eski sahipsiz satirlar migration ile silindi).
- **AI butcesi**: cihaz limiti once kontrol edilir, reddedilen istek global sayaci yemez; sayac hatasinda fail-closed.
- `TRUST_PROXY` sadece sayi (hop), `NODE_ENV` zorunlu, stub unlock `ENABLE_STUB_UNLOCK` ister (production'da asla).
- Rapor kotasi atomik `daily_quotas` tablosunda, silmekle geri gelmez.
- Kullanici metni (check-in gecmisi, eleksiyon yer adi) prompt'a ⟦⟧ ile sarili.
- Legacy cihaz id claim'i kaldirildi; JWT `HS256` sabit.
- E-posta kodu: deneme karsilastirmadan once atomik sayilir, adres basina saatte 10 hata kilidi, gunde 10 kod, HKDF ile ayri pepper, eski kodlar temizlenir.
- `AUTH_ENCRYPTION_KEY`, `APPLE_PRIVATE_KEY` varken zorunlu.
- Gercek takvim tarihi/saat dogrulamasi, kayitli kisi limiti 50, sohbet gecmisi son 200 mesaj.
- Sentry: mobilde URL query'leri (sehir aramasi) span/breadcrumb/transaction'dan, API'de mesaj ve breadcrumb'lar temizlenir.
- Mobil: tarot/eleksiyon/olumlama verisi Keychain'e tasindi; PDF'ler Caches'e (yedege girmez).
- Bagimliliklar: kritik acik 0 (next, proxy-addr, shell-quote, body-parser, node-forge, multer 2.5.0 override).

### Kabul edilen riskler
- `expo-router` -> `query-string@7` -> `decode-uri-component@0.2` (DoS, yalnizca kendi deep link'lerimiz) ve expo CLI'daki `zod@3` (build araci). `npm audit`'in "duzeltmesi" expo@51'e dusurmek; expo SDK guncellemesinde kapanacak.
- Device token revocation cache instance basina 60 sn; Railway'de tek instance (`numReplicas: 1`).
- Tarot 1/gun, companion 5/gun, niyet ve kisi haritasi limitleri hala istemcide — odeme fazinda `daily_quotas` ile sunucuya tasinacak.
- ship-kit "hesap silme ucu bulunamadi" yanlis negatif: regex `@Delete('me')` ariyor; gercek uc `@Controller('me')` + `@Delete('data')` (e2e ile dogrulandi).

### Railway env (API)
`NODE_ENV=production`, `TRUST_PROXY=1`, `PREMIUM_BETA=true`, `DATABASE_URL` (Railway Postgres), `JWT_DEVICE_SECRET` (>=32),
`AI_PROVIDER=anthropic`, `ANTHROPIC_API_KEY`, opsiyonel: `SENTRY_DSN`, `APPLE_*` + `AUTH_ENCRYPTION_KEY`, `GOOGLE_CLIENT_IDS`, `RESEND_API_KEY` + `AUTH_EMAIL_FROM`.
**Production'a koyma:** `ALLOW_LEGACY_DEVICE_HEADER`, `ENABLE_STUB_UNLOCK`, `AUTH_EMAIL_DEV_LOG`.

### Elle yapilacaklar (TestFlight icin)
1. Railway: proje + Postgres + yukaridaki env, repo baglaninca `railway.json` kullanilir; `/api/v1/health/ready` yesil.
2. `cd apps/mobile && eas init` (projectId), `eas env:create --environment production --name EXPO_PUBLIC_API_URL --value https://<railway-domain>` (`/api/v1` EKLEME - istemci ekliyor).
3. Apple Developer: App ID `com.astroflow.app` + App Store Connect kaydi, `eas.json` submit alanlari (`appleId`, `ascAppId`, `appleTeamId`).
4. Site yayinda: https://astroflow-web.vercel.app (apps/web statik cikti, Vercel CLI ile `vercel deploy --prod`); getastroflow.com alininca EXPO_PUBLIC_SITE_URL ve ship.config.json URL'leri ona cevrilir. Gizlilik URL'si harici TestFlight icin zorunlu.
5. App Store Connect: App Privacy beyani (bkz. ship.config.json), TestFlight Test Information.
6. Commit, `eas build -p ios --profile production`, `eas submit -p ios`.

### TestFlight sonrasi (faz 2+)
RevenueCat + sunucu kotalari, AdMob SSV, sunucu push (yeni ay/dolunay), testler + PostHog, gercek ikon, efemerisin astro.com ile dogrulanmasi.

## Dogrulanmasi gereken teknik varsayim

**Astroloji motoru `circular-natal-horoscope-js`** - Swiss Ephemeris degil.
Urunun tum guveni bu hesabin dogrulugana dayaniyor. Yayindan once bilinen bir
dogum haritasi **astro.com ile karsilastirilmali**; en az bir sira disi durum
(yaz saati gecisi, gece yarisi dogum, yuksek enlem) test edilmeli.

## Preflight (2026-11-17) — submit EDILMEDI

`ship-kit preflight`: 27 gecti / 3 kaldi / 2 uyari. Kalanlar: hesap silme (bilinen yanlis negatif, yukarida),
odeme SDK (beta: herkes Premium, bilincli), analytics (faz 2). `JOURNEY_MINUTES` .env.example'a eklendi.

Elle dogrulama:
- [x] Destek URL'si tarayicida aciliyor (en/tr 200, astroflowhq@gmail.com)
- [x] Gizlilik politikasi aciliyor ve toplanan veriyi anlatiyor (AI saglayicilari, olumlama metni, Sentry, veri silme)
- [ ] App Store Connect App Privacy beyani binary ile tutarli — henuz yapilmadi
- [x] Uygulama icinde hesap silme calisiyor (cihazda denendi)
- [ ] AI kullanimi ve AI'a giden veri App Privacy'de beyan edildi (5.1.2(i)) — ASC beyaniyla birlikte bekliyor
- [x] Privacy manifest: app.json `ios.privacyManifests` + SDK'larin kendi manifestleri (ship.config.json envanteri)
- [ ] Sandbox satin alma/yenileme/iptal — beta'da odeme yok (PREMIUM_BETA), odeme fazinda
- [ ] Google Play Data Safety formu — gonderilmedi
- [ ] Ekran goruntuleri — hazir degil (TestFlight icin sart degil, App Store icin sart)

Submit edilmeme sebebi: production API (Railway) ayakta degil, `eas.json` iOS submit alanlari bos,
ASC App Privacy beyani yapilmadi. Magaza islemleri `release` branch'inden yurur.

## Yayin kontrol tablosu

| Asama | Durum |
|---|---|
| Apple Developer / Google Play hesaplari | ☐ |
| Gizlilik + destek URL yayinda | ✅ (2026-11-17, astroflowhq@gmail.com) |
| `ship.config.json` URL alanlari dolduruldu | ✅ (astroflow-web.vercel.app, yayinda) |
| Mock katmani release build disinda, gercek API bagli | ✅ (API URL EAS env ile verilecek) |
| Odeme SDK entegre, sandbox'ta satin alma calisti | ☐ |
| Sentry kuruldu | ◐ kod hazir; DSN + EAS SENTRY_AUTH_TOKEN bekleniyor |
| Yerel hatirlaticilar + AI onayi + yasal linkler | ✅ |
| Guvenlik denetimi (2026-10-30) | ✅ e2e dogrulandi |
| Opsiyonel hesap (Apple / Google / e-posta kodu) | ◐ kod hazir; Apple key, Google client id, Resend domain bekleniyor |
| Odullu reklam (AdMob + SSV) | ☐ |
| PostHog kuruldu | ☐ |
| Efemeris astro.com'a karsi dogrulandi | ☐ |
| Kritik modul testleri yazildi | ☐ |
| API production'da, `/health` yesil | ☐ |
| `ship-kit doctor` yesil | ☐ |
| `ship-kit preflight` yesil | ☐ |
| TestFlight | ☐ |
| App Store | ☐ |
| Google Play | ☐ |

## Ortamlar

| Ortam | API | EAS kanali |
|---|---|---|
| development | http://localhost:3000 | development |
| preview | | preview |
| production | | production |

## Surum gecmisi

| Surum | Tarih | Notlar |
|---|---|---|
| 1.0.0 | - | henuz yayinlanmadi |

## Kontrol listeleri

- Submit oncesi: [checklists/pre-submit.md](./checklists/pre-submit.md)
- Olay/kesinti: [checklists/incident.md](./checklists/incident.md)
