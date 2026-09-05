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

## Kapatilmasi gereken eksikler

| # | Eksik | Neden onemli |
|---|---|---|
| 1 | **Mobil istemci mock katmaninda** | `services/mock/` altinda 5 dosya; gercek istemci `httpAstrologyApi.ts` **yazilmis**, `config.ts` anahtarinin arkasinda. Yayini engelleyen tek yapisal is. |
| 2 | **Odeme SDK'si kurulu degil** | `PaywallSheet.tsx` kendi yorumunda soyluyor: *"Payments are stubbed... Replace `unlock()` with a real IAP/RevenueCat purchase flow."* Paywall bir arayuz kabugu; satin alma calismaz. |
| 3 | **Cokme takibi yok** (Sentry) | Yayin sonrasi kor ucus |
| 4 | **Analytics yok** (PostHog) | Retention olculemez - kategorinin oldugu yer tam olarak retention |
| 5 | **Hic test yok** | 178 kaynak dosya, 0 test. En pahali uc yer: efemeris hesabi, odeme, yetkilendirme |
| 6 | **Destek ve gizlilik URL'leri yok** | 2026'nin en sik iki red sebebi |
| 7 | **App Privacy beyani islenmemis** | DeepSeek'e veri gidiyor; beyan edilmezse Guideline 5.1.2(i) - kaldirma riski |

## Dogrulanmasi gereken teknik varsayim

**Astroloji motoru `circular-natal-horoscope-js`** - Swiss Ephemeris degil.
Urunun tum guveni bu hesabin dogrulugana dayaniyor. Yayindan once bilinen bir
dogum haritasi **astro.com ile karsilastirilmali**; en az bir sira disi durum
(yaz saati gecisi, gece yarisi dogum, yuksek enlem) test edilmeli.

## Yayin kontrol tablosu

| Asama | Durum |
|---|---|
| Apple Developer / Google Play hesaplari | ☐ |
| Gizlilik + destek URL yayinda | ☐ |
| `ship.config.json` URL alanlari dolduruldu | ☐ |
| Mock katmani kaldirildi, gercek API bagli | ☐ |
| Odeme SDK entegre, sandbox'ta satin alma calisti | ☐ |
| Sentry + PostHog kuruldu | ☐ |
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
