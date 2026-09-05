---
description: Surum artir, build al, magazaya gonder
allowed-tools: Bash, Read, Edit, Write, Glob, Grep
---

Yayin akisini yurut. Sirayi bozma:

1. **Kapi:** `npx ship-kit preflight` - kirmizi varsa dur.
2. **Surum:** `app.json` icindeki `expo.version`'i semver'e gore artir.
   `eas.json` production profilinde `autoIncrement` acik oldugu icin build
   numarasi otomatik artar; elle dokunma.
3. **Degisiklik notu:** `SHIP.md` surum gecmisi tablosuna satir ekle.
4. **Build:** `eas build --platform <ios|android|all> --profile production`
5. **Dogrula:** TestFlight'a dusen build'i **gercek cihazda** ac; en az
   onboarding -> ana ekran -> paywall akisini gec.
6. **Submit:** `eas submit --platform <...> --profile production --latest`
7. `SHIP.md` durum tablosunu guncelle.

**Kucuk duzeltmeler icin once EAS Update dusun:** JS-only degisiklikte
`eas update --branch production` magaza onayini beklemeden yayinlar. Native
degisiklik veya surum artisi varsa tam build sart.
