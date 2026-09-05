# Submit oncesi kontrol listesi

> Once `npx ship-kit preflight` calistir. Bu liste otomatik kontrollerin
> **yakalayamadigi** maddeleri kapsar. Bir madde bile bos kalirsa submit etme.

## Uyumluluk tesisati
2026'nin en sik uc red sebebi bu ucudur - once bunlari kapat.

- [ ] **Destek URL'si tarayicida aciliyor** (Guideline 1.5)
- [ ] **Gizlilik politikasi URL'si aciliyor** ve uygulamanin gercekte topladigi veriyi anlatiyor (5.1.1)
- [ ] **App Privacy beyani binary ile birebir tutarli** - beyan ile davranis celisirse red
- [ ] Uygulama icinde **hesap silme** akisi calisiyor (5.1.1(v))
- [ ] **AI kullanimi ve AI'a gonderilen veri** beyan edildi (5.1.2(i))
- [ ] Her ucuncu parti SDK icin **privacy manifest** mevcut
- [ ] Google Play **Data Safety** formu gonderildi

## Odeme
- [ ] Sandbox'ta satin alma calisti
- [ ] Sandbox'ta yenileme calisti
- [ ] Sandbox'ta iptal ve geri yukleme (restore purchases) calisti
- [ ] Paywall'da fiyat, sure ve iptal kosulu **acikca** yaziyor
- [ ] Dijital abonelik icin App Store IAP / Play Billing kullaniliyor

## Urun
- [ ] Onboarding -> ana ekran -> paywall akisi **gercek cihazda** gecildi
- [ ] Eski bir Android cihazda cizim/render sorunu yok
- [ ] Bos durum, hata durumu ve cevrimdisi durum ekranlari var
- [ ] Bildirim izni istegi **anlamli bir anda** cikiyor, acilista degil
- [ ] Gunde en fazla 1 bildirim; hicbiri satis mesaji degil

## Altyapi
- [ ] API production'da ayakta, `/health` yesil
- [ ] Migration'lar production veritabanina uygulandi
- [ ] Yedek alindi ve **geri yukleme bir kez denendi**
- [ ] Pahali uclarda rate limit acik
- [ ] Sentry hem mobilde hem API'de olay aliyor

## Magaza kaydi
- [ ] Ekran goruntuleri guncel surumle uyumlu
- [ ] Aciklama ve anahtar kelimeler (ASO) yazildi
- [ ] Yas siniri ve icerik derecelendirmesi dolduruldu
- [ ] Test hesabi bilgileri App Review'a birakildi (giris gerekiyorsa)
