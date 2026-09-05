---
description: OWASP MASVS temelli guvenlik taramasi
allowed-tools: Bash, Read, Glob, Grep
---

`npx ship-kit doctor --only secrets,deps` calistir, sonra asagidaki manuel
incelemeyi yap. Her madde icin **dosya ve satir** goster; "muhtemelen iyi"
deme, koda bak.

**Depolama**
- Token/oturum bilgisi `expo-secure-store` (veya Keychain/Keystore) icinde mi,
  `AsyncStorage` gibi duz depoda mi?
- Hassas kullanici verisi cihazda sifresiz duruyor mu?

**Ag**
- Tum istekler HTTPS mi? Sertifika dogrulamasi devre disi birakilmis mi?

**Yetkilendirme - en sik atlanan yer**
- Her endpoint kaynagin **sahipligini** kontrol ediyor mu? Baska kullanicinin
  id'siyle cagirinca veri donuyor mu? (IDOR)
- Guard/decorator'i unutulmus rota var mi?

**API kotuye kullanimi**
- Pahali uclarda (ozellikle AI cagrilari) **rate limit** var mi?
- Girdi dogrulama (DTO/validation pipe) tum uclari kapsiyor mu?

**Platform**
- Deeplink/intent handler'lar dogrulanmamis girdiyle is yapiyor mu?
- `app.json` icindeki izinler gercekten kullaniliyor mu? Kullanilmayan izin sil.

**Ucuncu parti**
- Bagimlilik listesini cikar; her SDK icin ne veri topladigini yaz.
  2026'da her SDK icin privacy manifest gerekiyor.

Sonunda bulgulari **ciddiyet sirasina** gore listele ve her biri icin somut
duzeltme oner.
