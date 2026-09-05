# Olay mudahale kontrol listesi

> Kesinti, cokme dalgasi veya yanlis surum. Sirayi bozma: **once durdur,
> sonra teshis et.**

## 1. Durdur (ilk 10 dakika)
- [ ] Etki alanini belirle: herkes mi, bir platform mu, bir surum mu?
- [ ] Sentry'de hata orani ve etkilenen kullanici sayisina bak
- [ ] Sebep **son deploy** ise: API'de bir onceki surume don
- [ ] Sebep **mobil JS** ise: `eas update --branch production` ile onceki
      calisan bundle'i yayinla (magaza onayi beklemez)
- [ ] Sebep **native** ise: magazada surumu **kaldirma**, hizli bir yama
      surumu hazirla; kaldirma kullanici kaybi yaratir

## 2. Duyur
- [ ] Uygulama ici veya sosyal medyadan kisa bilgilendirme
- [ ] Odeme etkilendiyse etkilenen kullanicilara ayrica yaz

## 3. Teshis
- [ ] Sentry stack trace + ilk goruldugu surum
- [ ] API loglari: hata orani, gecikme, veritabani baglanti havuzu
- [ ] Trafik ani mi? (Astroloji/ritual uygulamalarinda **retro, dolunay ve
      yilbasi sabahlari** ongorulebilir yuk anlaridir - rakipler bu
      sabahlarda cokuyor, senin hazirlikli olman bir konumlandirma avantaji)

## 4. Kalici duzeltme
- [ ] Kok sebep yazildi
- [ ] Regresyon testi eklendi (`ship-kit doctor --only testcoverage` yesillensin)
- [ ] Gerekiyorsa rate limit / olcekleme ayari guncellendi

## 5. Kayit
- [ ] `SHIP.md` surum gecmisine olay satiri eklendi
- [ ] Tekrarlanabilir bir eksikse `checklists/pre-submit.md`'ye madde eklendi
