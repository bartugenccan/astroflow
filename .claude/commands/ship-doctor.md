---
description: Repoyu ship standardina karsi denetle ve eksikleri kapat
allowed-tools: Bash, Read, Edit, Write, Glob, Grep
---

`npx ship-kit doctor` calistir ve ciktiyi yorumla.

Sonra sunlari yap:

1. **Kaldi (FAIL) satirlarini oncelik sirasina koy.** Sirala: sir sizintisi >
   magaza uyumlulugu > build/CI > env uyumu > test > bagimlilik.
2. Her FAIL icin **kok sebebi** soyle, sadece belirtiyi degil.
3. Otomatik duzeltilebilenler icin `npx ship-kit apply` oner; elle karar
   gerektirenleri (ornegin `ship.config.json` icindeki URL'ler) kullaniciya sor.
4. **Uyarilari (WARN) FAIL gibi sunma.** Uyari bilgi verir, yayini engellemez.

Sonunda tek cumlelik hukum ver: bu repo yayina hazir mi, degilse en kritik
eksik ne.
