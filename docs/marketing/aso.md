# AstroFlow — ASO ve featuring metinleri

Son güncelleme: 2026-11-19 · Plan: [`plan.md`](plan.md) · Bağlam: [`.agents/product-marketing.md`](../../.agents/product-marketing.md)

> **Önce:** App Store Connect'teki şu anki ad, alt başlık ve anahtar kelimeleri buraya yapıştır. Repoda kaydı yoktu. Aşağıdakiler önerilerdir; ASC'de değiştirmeden önce mevcut değerlerle karşılaştır.
>
> | Alan | Mevcut (ASC) |
> |------|--------------|
> | tr ad / alt başlık / anahtar kelime | — |
> | en ad / alt başlık / anahtar kelime | — |

## 1. Kurallar (Apple)

| Alan | Sınır | İndekslenir mi |
|------|-------|----------------|
| Ad | 30 karakter | Evet (en güçlü) |
| Alt başlık | 30 karakter | Evet |
| Anahtar kelimeler | **100 bayt** (karakter değil), virgülle ayrılır, boşluk yok | Evet (gizli) |
| Promosyon metni | 170 karakter | Hayır. Yeni sürüm göndermeden değiştirilebilir |
| Açıklama | 4000 karakter | Hayır (App Store'da). İlk 3 satır dönüşüm içindir |

- **Türkçe harfler 2 bayt:** ş, ğ, ı, ö, ü, ç, İ her biri UTF-8'de 2 bayt tutar. Bu yüzden TR anahtar kelime alanına ~100 değil ~85–90 karakter sığar. Aşağıdaki sayılar betikle ölçüldü.
- Bir kelimeyi iki kez yazma: ad, alt başlık ve anahtar kelimelerdeki kelimeler birleştirilir. Apple bir kelimeyi bir kez sayar.
- Kelimeler yalnızca **aynı lokalizasyon içinde** birleşir ("doğum" + "haritası" ancak aynı dilde olursa).
- Rakip ya da marka adı, fiyat ve doğrulanamayan iddia ("en iyi", "#1") yazma; bunlar ret sebebi.
- Türkçe büyük harfi elle yaz (İ/I); Python'daki `.upper()` bozuyor.

## 2. Türkiye storefront'u: iki lokalizasyon

TR storefront'u **Türkçe** ve **İngilizce (UK)** lokalizasyonlarını indeksliyor (üçüncü taraf ASO kaynakları; Apple'ın resmi tablosuyla doğrula). Elimizde tr ve en(US) var. **en-GB lokalizasyonu ekle**: TR aramaları için 100 bayt daha alan açılır. Bu alana Türkçe kelimelerin **aksansız** yazımları girer ("burc", "yukselen"), çünkü insanlar bunları aksansız da arıyor. en-GB'nin ad, alt başlık ve açıklaması en(US) ile aynı kalır; UK kullanıcısı İngilizce sayfa görür.

## 3. Öneriler

### Türkçe (tr)

| Alan | Metin | Uzunluk |
|------|-------|---------|
| Ad | `AstroFlow: Burç ve Astroloji` | 28/30 kr |
| Alt başlık | `Doğum Haritası ve Manifest` | 26/30 kr |
| Anahtar kelimeler | `yorumu,günlük,yükselen,uyumu,tarot,olumlama,yıldız,aşk,natal,retro,merkür,ay,zodyak,369` | 94/100 bayt |
| Promosyon metni | `Merkür retrosu, dolunay ve yılbaşı: gökyüzü senin haritana ne diyor? Aster'ini büyüt, manifestini kendi sesinle dinle.` | 118/170 kr |

Bunlarla oluşan aramalar: *burç yorumu, günlük burç, yükselen burç, burç uyumu, doğum haritası, astroloji, manifest, olumlama, tarot, merkür retrosu, natal harita, 369 manifest*.

**Açıklamanın ilk 3 satırı:**
> Burç yorumu okuduğun değil, yıldızını büyüttüğün astroloji uygulaması.
> Doğduğun ana göre hesaplanan haritan, bugünün gökyüzü ve sade bir günlük rehber. Manifestini yaz, kendi sesinle dinle.
> Her pratikte yıldız dostun Aster biraz daha büyüsün.

### İngilizce (UK) — TR storefront için ek alan

| Alan | Metin | Uzunluk |
|------|-------|---------|
| Ad | `AstroFlow: Astrology, Manifest` | 30/30 kr |
| Alt başlık | `Birth Chart & Your Star Buddy` | 29/30 kr |
| Anahtar kelimeler | `burc,yorumlari,gunluk,yukselen,harita,dogum,haritasi,fal,uyum,ask,kozmik,gokyuzu,yildiz,astrolog` | 96/100 bayt |

**Önce test et:** TR storefront'ta `burc` ile `burç` aramaları aynı sonuçları veriyorsa Apple aksanları katlıyor demektir; o zaman bu listeyi aksansız kopyalar yerine yeni kelimelere ayır (ör. `manifestasyon`, `ruhesi`, `rituel`). "fal" (tarot falı) çok aranan bir kelime ama kahve falı uygulamalarının kitlesini de çeker. İlk ayın sonunda ASC'deki arama kaynaklarına bak; işe yaramadıysa "tarot" ile değiştir.

### İngilizce (US) — EN dalgası

| Alan | Metin | Uzunluk |
|------|-------|---------|
| Ad | `AstroFlow: Astrology, Manifest` | 30/30 kr |
| Alt başlık | `Birth Chart & Your Star Buddy` | 29/30 kr |
| Anahtar kelimeler | `horoscope,zodiac,natal,big,three,rising,sign,tarot,compatibility,affirmation,daily,moon,retrograde` | 98/100 bayt |
| Promosyon metni | `What does today's sky mean for your chart? Grow Aster, your star buddy, and hear your manifestation in your own voice.` | 118/170 kr |

**First 3 lines of the description:**
> The astrology app where you don't just read your sign — you grow your star.
> Your birth chart, calculated for the moment you were born, today's sky and a calm daily guide. Write your manifestation and hear it in your own voice.
> Every practice helps Aster, your star buddy, grow a little more.

### Ekran görüntüleri
5/5 tr + en yüklü (`apps/mobile/store/screenshots/out`). İlk iki kare arama sonuçlarında görünür: 1) Doğum haritası ve Büyük Üçlü, 2) Aster. Sıra doğru. Aster'in yumurtadan çıktığı 15–30 sn'lik bir **App Preview videosu** dönüşümü en çok artıracak sonraki adım (sessiz izlendiği için ekranda yazı olmalı).

## 4. Featuring nomination (ASC → Featuring → Nominations)

- **Tür:** App Launch
- **Zaman:** lansmandan en az 3 hafta önce (Apple en az 2 hafta, ideal olarak 3 ay öncesini öneriyor).
- **Bölgeler:** Türkiye (ana), Birleşik Krallık, ABD. AB ilk yayında kapalı olduğu için AB ülkelerini seçme.
- **Gerekli rol:** Account Holder, Admin, App Manager ya da Marketing.

**Metin (EN, form İngilizce):**

> **AstroFlow — astrology you grow, not just read**
>
> AstroFlow turns a birth chart calculated for your exact birth moment into a 2-minute daily ritual, built around Aster: a star mascot drawn entirely in code that hatches from an egg, grows with every practice, collects constellations, writes you a weekly letter and gently misses you when you're away. Aster is also the companion you can ask about your day; it answers from your chart and remembers what matters to you.
>
> - **Calculated, not generic:** planetary positions are calculated on our server for your exact birth moment; you choose a short or a deep reading.
> - **Manifest in your own voice:** write it as if it already happened, read it, record it and listen back. Recordings never leave the phone.
> - **Private by design:** no account needed; your raw birth date, time and place are never sent to the AI; delete all your data from inside the app.
> - **Made for Türkiye:** designed Turkish-first by an independent developer, with full English support.
>
> Accessibility: 44pt touch targets, Reduce Motion support and Turkish/English localization. *(Kurucu: göndermeden önce cihazda doğrula; doğrulanmayan iddiayı sil.)*

**Metin (TR, kendi kayıtların ve basın için):**

> **AstroFlow: okuduğun değil, büyüttüğün astroloji**
>
> AstroFlow doğduğun ana göre hesaplanan bir doğum haritasını iki dakikalık bir günlük ritüele dönüştürüyor. Merkezinde Aster var: tamamen kodla çizilmiş, yumurtadan çıkan, her pratikte büyüyen, takımyıldız toplayan, haftalık mektup yazan ve uzak kaldığında seni özleyen bir yıldız. Aster aynı zamanda gününü sorabileceğin yol arkadaşın: haritandan cevap veriyor ve senin için önemli olanı hatırlıyor. Gezegen konumları sunucuda tam doğum anına göre hesaplanıyor. Manifestini kendi sesinle kaydedip dinleyebiliyorsun; kayıtlar telefonundan çıkmıyor. Hesap açman gerekmiyor ve ham doğum bilgilerin yapay zekâya hiç gitmiyor.

**Sonraki başvurular** (her biri ayrı nomination; tür "New Content" ya da "App Enhancements"):
- Yılbaşı 2027 gökyüzü (Aralık ortasından önce)
- Merkür retrosu haftası (9 Şubat 2027; başvuru en geç 19 Ocak)

## 5. In-App Events (ücretsiz görünürlük)

Etkinlikler ürün sayfasında ve App Store aramasında ayrıca listelenir. Ad 30 karakter, kısa açıklama 50 karakter.

| Etkinlik | Ad (≤30) | Tarih |
|----------|----------|-------|
| Yılbaşı | `2027 Gökyüzün Hazır` | 26 Ara – 7 Oca |
| Merkür retrosu | `Merkür Retrosu Haftası` | 9 Şub – 3 Mar 2027 |
| Sevgililer Günü | `Big Three Uyum Haftası` | 10–16 Şub |

(Etkinlik için app içinde karşılık gelen bir ekran ya da deep link gerekir. `astroflow://` şeması var; etkinlik sayfası için hedef ekranı seç.)

## Kaynaklar
- Apple karakter sınırları ve 100 bayt kuralı: `.claude/skills/aso/references/apple-specs.md`
- TR storefront indeksleme: [Mobile Action, cross-localization](https://www.mobileaction.co/blog/app-store-cross-localization/) · [AppTweak](https://www.apptweak.com/en/aso-blog/how-to-benefit-from-cross-localization-on-the-app-store) · [aso.dev](https://aso.dev/aso/cross-localization/)
- Featuring: [Apple: Getting featured](https://developer.apple.com/app-store/getting-featured/)
