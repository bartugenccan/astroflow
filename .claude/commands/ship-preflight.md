---
description: Magazaya submit oncesi zorunlu kontrolleri yurut
allowed-tools: Bash, Read, Edit, Write, Glob, Grep
---

Submit oncesi kapisi. `npx ship-kit preflight` calistir.

Otomatik kontroller gectikten sonra **elle dogrulanmasi gerekenleri** tek tek
sor ve `SHIP.md` icindeki kutulari isaretle:

- [ ] Destek URL'si **tarayicida aciliyor mu** (Guideline 1.5 - 2026'nin en sik red sebebi)
- [ ] Gizlilik politikasi URL'si aciliyor ve **uygulamanin gercekte topladigi veriyi** anlatiyor mu
- [ ] App Store Connect'teki **App Privacy beyani binary ile birebir tutarli mi**
      (ucuncu en sik red sebebi - beyan ile davranis celisirse red)
- [ ] Uygulama icinde **hesap silme** akisi calisiyor mu (5.1.1(v))
- [ ] **AI kullanimi ve AI'a gonderilen veri** App Privacy'de beyan edildi mi (5.1.2(i))
- [ ] Her ucuncu parti SDK icin **privacy manifest** var mi
- [ ] Sandbox'ta **satin alma, yenileme ve iptal** denendi mi
- [ ] Google Play **Data Safety** formu gonderildi mi
- [ ] Ekran goruntuleri guncel surumle uyumlu mu

Bir madde bile isaretlenmemisse **submit etme** ve sebebini yaz.
