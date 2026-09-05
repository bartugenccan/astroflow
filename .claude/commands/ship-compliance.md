---
description: App Privacy / Data Safety beyanini koda karsi dogrula
allowed-tools: Bash, Read, Edit, Write, Glob, Grep
---

`npx ship-kit doctor --only storecompliance` calistir.

Sonra **beyan ile kodu karsilastir**. 2026'da ucuncu en sik red sebebi,
App Privacy beyaninin binary'nin gercekte yaptigi seyle celismesidir.

1. Kodda **disari veri gonderen her cagriyi** bul (AI saglayicilari, analytics,
   crash reporting, reklam, harita/geocoding, push).
2. Her biri icin **hangi alanlar** gidiyor? Ozellikle: kimlik, konum, saglik,
   hassas kisisel veri, kullanici uretimi icerik.
3. Bunlari `ship.config.json > compliance` altina yaz.
4. App Store Connect'teki App Privacy ve Google Play Data Safety formlariyla
   **satir satir** karsilastir; farklari listele.

**AI ozel notu:** Beyan edilmeyen AI veri paylasimi Guideline 5.1.2(i) ihlali
ve uygulama kaldirma sebebi. Kullanicinin girdisi bir LLM saglayicisina
gidiyorsa bu acikca beyan edilmeli.

Ciktiyi "beyan / kodda gercekte olan / fark" seklinde uc sutunlu tablo yap.
