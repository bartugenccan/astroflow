---
description: Sifirdan yeni uygulama kurulum akisini yurut
allowed-tools: Bash, Read, Edit, Write, Glob, Grep
---

Yeni uygulama kurulumu. Hedef: **bos repodan TestFlight'a bir hafta.**

1. `npx ship-kit init <ad>` - monorepo iskeleti + tum makine kurulur.
2. `ship.config.json` doldur: uygulama adi, bundle id, destek/gizlilik URL'leri.
3. Hesap isleri **hemen** baslatilir (Apple onayi gun alabilir):
   - Apple Developer Program, App Store Connect'te uygulama kaydi
   - Google Play Console'da uygulama kaydi
   - RevenueCat projesi + iki magazada urun tanimlari
4. `npx ship-kit doctor` yesile donene kadar eksikleri kapat.
5. Ilk `eas build --profile preview` ile cihazda calistir.
6. `/ship-preflight` -> `/ship-release`.

Kurulum bitince `docs/08-new-app.md` icinde **surtusme yasadigin adimi** not et;
bir sonraki uygulamada o adim otomatiklestirilecek.
