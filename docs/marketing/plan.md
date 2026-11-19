# AstroFlow — 90 günlük görünürlük planı (TR önce, sıfır bütçe)

Son güncelleme: 2026-11-19 · Bağlam: [`.agents/product-marketing.md`](../../.agents/product-marketing.md) · ASO metinleri: [`aso.md`](aso.md)

Kısıtlar: reklam bütçesi yok, kurucu kamerada değil (Aster önde), günde 30–60 dk. Pazar sırası: Türkiye → (gün 60+) İngilizce.

## 1. Konumlandırma

> **Burç yorumu okuduğun değil, yıldızını büyüttüğün astroloji uygulaması.**
> *The astrology app where you don't just read your sign — you grow your star.*

Her içerik bu üç şeyden birini göstermeli:
1. **Aster yaşıyor.** Çatlıyor, büyüyor, özlüyor, cevap veriyor. TR'deki hiçbir astroloji app'inde karakter yok.
2. **Herkese değil, sana.** Doğum anına göre hesaplanan harita, Büyük Üçlü, iki okuma derinliği (sade/derin).
3. **Manifest alışkanlığı.** Yaz, olmuş gibi oku, kendi sesinle dinle.

Dil kuralları: konumlar "hesaplanmış" diye anlatılır, yorumlar "gerçek/kesin" diye değil; doğruluk iddiası yalnızca `check:astro` çıktısına dayanır. "manifest/pratik" kullan, asla "niyet/dilek" deme. Korku dili ve kesin kehanet yok ("rehberlik, asla kader değil"). "Beta" kelimesi geçmez.

## 2. Ön koşullar (ilk video yayınlanmadan önce)

| # | İş | Neden |
|---|----|-------|
| 1 | **Cihaz üreterek AI bütçesi tüketme açığını kapat** (güvenlik incelemesi, orta) | Bir video tutarsa gelen trafik doğrudan DeepSeek faturası olur |
| 2 | Paylaşım kartında `…/s` linki + `share_sheet_opened` olayı | Her paylaşılan kart, bir indirme yolu taşımalı |
| 3 | Onboarding'de "Bizi nereden duydun?" sorusu (`acquisition_source`) | Sıfır bütçede kaynağı ölçmenin tek yolu |
| 4 | Uygulama içi puan isteği (`expo-store-review`) | TR'de puan sayısı sıralamayı doğrudan etkiliyor |
| 5 | Landing'de App Store rozeti + `/get?c=<kaynak>` yönlendirmesi | Bio linki ve paylaşım kartı tek bir yere çıkar |
| 6 | **Web'i yeni mobil build'den önce yeniden yayınla** | `/s` ve `/get` canlıda yoksa paylaşım kartındaki link ölü olur; yayından sonra `/s`'i sondaki `/` olmadan da dene |

2–5 numaralı işler kodda yapıldı (bkz. §9). 4. iş native bir modül; yeni build'le gelir. Kod tembel yüklediği için bu kodla atılan bir OTA build 8'i (1.1.0) çökertmez, yalnızca orada puan istemi çıkmaz.

**Bilinen sınır (AB):** uygulama AB'de yayında değil, ama `/s` ve `/get` ülke bilmiyor. AB'deki bir iPhone kullanıcısı App Store'da "bu ülkede yok" sayfasını görür. AB açılana kadar kabul edilen bir kayıp; TR ve UK'de sorun yok.

## 3. Zaman çizelgesi

Lansman günü = **L**. Tarih kesinleşince bu tabloya yazılır.

| Zaman | Ne yapılır |
|-------|------------|
| **L-21 veya daha önce** | ASC → Featuring → Nominations: lansman başvurusunu gönder (metin `aso.md` §4'te). Apple en az 2 hafta istiyor, 3 hafta ile 3 ay arası öneriyor. |
| **L-14 … L-7** | TikTok + Instagram **@asterastroflow** (ya da benzeri) hesabını aç. Bio: "AstroFlow'un yıldızı ⭐ Aster". **3–7 gün paylaşım yapma, ısın:** günde 15 dk TR burç/manifest akışında izle, beğen, gerçek yorum yaz, taklit edilebilir videoları "swipe" klasörüne kaydet. |
| **L-7 … L** | İlk 10 videoyu toplu üret (bkz. §5 haftalık ritim). TestFlight test kullanıcılarına "yayındayız, yorum bırakır mısın" mesajını hazırla. Landing'de `NEXT_PUBLIC_APP_STORE_URL`'i ayarla. |
| **L** | App Store'da yayın. İlk video. Kişisel çevre + TestFlight grubuna duyuru (puan + yorum isteği). Landing waitlist'ine tek seferlik e-posta. |
| **L … L+21** | **Format bulma:** günde 1 gönderi; aynı video hem TikTok'a hem Reels'e gider. Her gönderi test kaydına (§6) yazılır. |
| **L+21** | **Kanal kararı** (§6 ölçütleri). |
| **L+21 … L+60** | Kazanan formatı ölçekle: TikTok'ta günde 3'e kadar (aralarında 3–4 saat), içeriklerin %20'si yeni format denemesi. Mikro astrolog iş birlikleri (§7). |
| **L+60 … L+90** | EN dalgası: TR'de kazanan 2 formatı İngilizceye çevir; ayrı bir EN hesabı aç ve aynı ısınma kuralını uygula. Product Hunt (EN) lansmanı. |
| **L+90** | Gözden geçirme: hedef §8. |

### Takvim çapaları (Kasım 2026 – Mart 2027)

Tarihleri yayından önce uygulamanın kendi gökyüzü motorundan (Sky / Gökyüzü anları) doğrula. Kaynaklar dış astroloji takvimleri.

| Tarih | Olay | İçerik fırsatı |
|-------|------|----------------|
| Aralık sonu | **Yılbaşı: "2027'de burcunu neler bekliyor"** | Türkiye'de yılın en çok aranan burç anı. "2027'de Big Three'ne göre…" serisi; 12 burç için 12 slayt. |
| 22 Ocak 2027 | Aslan'da Dolunay | "Dolunay manifest ritüeli" ekran kaydı (3-6-9) |
| 6 Şubat 2027 | Halkalı Güneş tutulması | "Tutulma haftası yeni başlangıçlar" (korku dili yok) |
| 9 Şubat – 3 Mart 2027 | **Merkür retrosu (Kova)** | En güçlü mizah anı: "Merkür retrosunda Aster" skeç serisi |
| 14 Şubat | Sevgililer Günü | Uyum ekranı: "Big Three'nize göre ilişkiniz" |
| 20 Şubat 2027 | Yarı gölgeli Ay tutulması (dolunay) | Bırakma ritüeli, şükran satırları |

## 4. Kanal ve hesap

- **Tek marka hesabı, iki platform:** TikTok (ana) + Instagram Reels (aynı video). Duolingo'nun maskot videoları TikTok'ta tuttu ama Reels'te tutmadı (kendi ekipleri söylüyor). Türkiye'de Instagram burç kültürü çok güçlü, bu yüzden Reels'i 3 hafta boyunca test ediyoruz.
- **Çoklu hesap çiftliği yok:** ban riski taşıyor ve zamanımız yetmez. İkinci hesap ancak ilki görüntülenme tabanını tuttuğunda açılır (EN dalgası).
- **Yüz yok:** videolar app ekran kaydı (Aster animasyonları), slaytlar ve metin + müzikten oluşur. Aster'in sesi metin balonu ya da TTS seslendirmesi olur.
- **Üretim araçları:** iPhone ekran kaydı + CapCut (altyazı, trend ses). Aster pozları için app'teki ruh hallerini (mutlu, özlem, kutlama) kaydet ve bir "Aster stok" klasörü oluştur.

## 5. İçerik

### 4 sütun

| Sütun | Format | Ürünle bağı | Oran |
|-------|--------|-------------|------|
| **A. Aster skeç/tepki** | POV/skeç 10–20 sn, trend ses, Aster balonla konuşur | Aster = app | %35 |
| **B. Big Three sıralama** | 5–8 karelik slayt/carousel ("Top 3", "burçlara göre…") | Son kare: "Senin Big Three'n AstroFlow'da" | %30 |
| **C. Gökyüzü anı** | Takvim olayı + "bu hafta ne yapmalı" (15–30 sn) | Bugün ekranı ekran kaydı | %20 |
| **D. Manifest ritüeli** | Ekran kaydı: yaz → oku → kendi sesinle dinle, 3-6-9 | Manifest ekranı | %15 |

Her videonun bitişi: ekranda **"Aster'ini büyüt → bio'daki link"**, açıklamada aynı CTA.

### Hook bankası (ilk 50, TR)

Her hook'un yanındaki harf sütununu gösterir. İlk 3 saniyede ekranda yazı olarak çıkmalı. Haftanın en iyi 3 hook'u yeni görsellerle tekrar kurgulanır.

1. (A) POV: Merkür retrosu başladı ve Aster mesajlarını yanlış kişiye gönderdi
2. (A) Aster'i 3 gün açmazsan olan şey 🥺
3. (A) Yıldızın yumurtadan çıktığı an
4. (A) Aster'e "eski sevgilim bana yazar mı" diye sordum
5. (A) Burcun yükselenini öğrenince Aster'in yüzü
6. (A) Her burç Aster'ini nasıl büyütür
7. (A) Aster'in haftalık mektubunda bana yazdığı cümle
8. (A) Akrep yükselenine "sakin ol" demek:
9. (A) Aster ilk takımyıldızını bulunca
10. (A) Telefonumdaki en tatlı astrolog
11. (A) Terazi kararsızlığı vs Aster
12. (A) Aster'e sadece "bugün neden böyleyim" yazdım
13. (B) Big Three'n bunu söylüyor, burcun değil
14. (B) En inatçı 3 yükselen (bir tanesi seni şaşırtacak)
15. (B) Aşkta ilk adımı asla atmayan 3 Ay burcu
16. (B) Güneş burcun yalan söylüyor olabilir: Ay burcuna bak
17. (B) Big Three'si ateş olanlar bunu bilir
18. (B) Para konusunda en şanslı 3 yükselen
19. (B) Burcuna göre manifest yazma tarzın
20. (B) Ay burcuna göre üzgünken ne yaparsın
21. (B) Yükselenin ilk izlenimini nasıl bırakıyor
22. (B) Hangi burçlar mesajı görür ama cevap vermez
23. (B) Big Three'n bir film olsaydı
24. (B) Venüs burcuna göre seni ne etkiler
25. (B) En sakin görünüp en çok düşünen 3 burç
26. (B) Doğum saatini bilmiyorsan bile öğrenebileceğin 3 şey
27. (B) Burcuna göre 2027'de odaklanman gereken tek şey
28. (B) Sevgililer Günü: Big Three'nize göre uyumunuz
29. (C) Bu dolunay için 1 dakikalık ritüel
30. (C) Merkür retrosu 9 Şubat'ta başlıyor: yapma listesi
31. (C) Bu hafta gökyüzü senin hangi evine dokunuyor?
32. (C) Tutulma haftasında yeni bir şeye başlamalı mısın?
33. (C) "Bugün neden bu kadar yorgunum" (cevap gökyüzünde)
34. (C) Yeni Ay = yeni manifest. 3 adımda yaz
35. (C) Satürn dönüşü yaşı yaklaşıyorsa bunu izle
36. (C) Yılın en iyi 3 günü haritanda belli
37. (C) Doğum günün bir "Solar Return": yılın haritası
38. (C) Bugünün gökyüzünü 10 saniyede oku
39. (D) Manifestini olmuş gibi yazmanın tek kuralı
40. (D) 3-6-9 yöntemini doğru yapmıyorsun
41. (D) Kendi sesinden olumlama dinlemek neden farklı
42. (D) 21 gün manifest pratiği yaptım, Aster'e olan şey
43. (D) "İstiyorum" değil "sahibim" yaz
44. (D) Sabah 2 dakikalık manifest rutinim
45. (D) Manifestini burcunun diliyle yaz
46. (D) Şükran satırı yazınca Aster parlıyor
47. (D) Manifestini yazdığın an ile gerçekleştiği an arası
48. (D) Kariyer manifesti örneği (kopyala)
49. (D) Aşk manifesti yazarken yapılan 3 hata
50. (D) Bu sesi kaydet ve her sabah dinle

### Haftalık ritim (≈5 saat/hafta)

| Gün | İş | Süre |
|-----|----|------|
| Pazar | **Toplu üretim:** 7 hook seç → senaryo → ekran kayıtları → CapCut | 2,5 sa |
| Her gün | 1 gönderi (TikTok 19:00–23:00 arası, aynı videoyu Reels'e de at) + 15 dk yorum/etkileşim (kendi yorumlarına cevap, TR burç hesaplarına gerçek yorum) | 20–30 dk |
| Pazartesi | Test kaydını güncelle, haftanın en iyi 3 hook'unu seç | 15 dk |

Video senaryo şablonu (`social` skill'inden): **Hook 0–3 sn** (ekranda yazı + hareket) → **Gövde** (tek fikir, en fazla 3 kare) → **CTA son 3 sn** ("Aster'ini büyüt"). Altyazı her zaman olsun; videoların çoğu sessiz izleniyor.

## 6. Ölçüm ve karar kuralları

**Test kaydı** (her gönderi için tek satır; Notion ya da bir tablo):
`tarih · platform · sütun · hook # · 48. saatteki izlenme · izlenme süresi % · kaydetme · yorum · profil ziyareti · bio link tıklaması · o günkü indirme (ASC) · o günkü acquisition_source=tiktok/instagram (PostHog)`

**Kurallar:**
- **İzlenme tabanı:** bir video 48 saatte 1.000 izlenmeyi geçtiyse "dağıtıldı" sayılır.
- Hesap 1 hafta boyunca birkaç yüz izlenmeyi geçemiyorsa 2–3 gün paylaşımı durdur, formatı değiştir. Tutmayan formatı daha çok paylaşmak, platforma hesabın gösterilmeye değmediğini öğretir.
- Arka arkaya 5 videoda izlenme süresi %1'in altındaysa hook'ları değiştir.
- İzlenme yüksek, takip düşükse CTA'yı ve içerikle kitle uyumunu kontrol et.
- **Kazananı izlenmeye göre değil sonuca göre seç:** tabanı düzenli geçen ve indirmeyi oynatan format kazanır. Viral olup hiçbir şeyi oynatmayan format huninin üstü içindir.
- **L+21 kanal kararı:** Reels'in video başına medyan izlenmesi TikTok'un yarısından azsa *ve* bio link tıklaması TikTok'unkinin yarısından azsa, Reels yalnızca yeniden paylaşım kanalı olarak kalır (ayrı emek harcanmaz). Tersi olursa ağırlık Reels'e kayar.

**Haftalık huni** (her pazartesi):

| Basamak | Kaynak |
|---------|--------|
| İzlenme, profil ziyareti, link tıklaması | TikTok / Instagram analytics |
| Ürün sayfası görüntüleme, kampanya bazlı indirme (`ct=tiktok`, `ct=ig`, `ct=share`) | ASC App Analytics |
| `onboarding_completed`, `acquisition_source` dağılımı | PostHog |
| `share_sheet_opened` / aktif kullanıcı (iOS gönderildi mi bildirmiyor; paylaşım sayfasının açılması sayılır) | PostHog |
| Puan sayısı ve ortalama (TR) | ASC |

## 7. Sıfır bütçeli büyüme kanalları

- **Paylaşım kartı:** Uyum, Okuma ve Bugün ekranlarındaki kartlarda artık `…/s` linki var (ASC'de `ct=share` kampanyası). Story paylaşımlarını tetikleyen en iyi an uyum sonucu ("Big Three'nize göre uyumunuz").
- **Mikro astrolog / burç hesabı takası** (bağımlılık: premium hediye etmenin bir yolu henüz yok; RevenueCat ürünleri ve App Store Offer Codes ya da RevenueCat promosyonel erişim kurulmadan teklif verme. Beta açık kaldıkça hediye edilecek bir şey de yok): 5–50 bin takipçili TR astroloji ve manifest hesaplarına ömür boyu premium karşılığında 1 story/Reels teklif et. Ücret ödenmez; gönderide iş birliği etiketi zorunlu. Haftada 5 kişiye mesaj at, mesaj taslağı aşağıda.
- **Topluluk:** ekşi sözlük ("astroloji uygulaması önerisi" başlıkları), r/Turkey, r/astrology (EN dalgası), astroloji Discord'ları. Ürün değil değer paylaş; tanıtım kurallarına uy.
- **App Store featuring:** §3 L-21. Ayrıca her büyük güncellemede yeni bir başvuru yap (örneğin "Merkür retrosu modu", "Yılbaşı 2027").
- **In-App Event (ASC):** "Merkür Retrosu Haftası" ya da "Yılbaşı 2027 Gökyüzü" etkinliği. Etkinlikler App Store aramasında ve ürün sayfasında ayrıca görünüyor ve ücretsiz.
- **Puan ve yorum:** uygulama içi istek mutlu anda gösterilir (Aster glimmer aşamasına büyüdüğünde ya da manifest gerçekleştiğinde; çatlamada değil), yılda en fazla 3 kez (Apple sınırı).

**Mikro astrolog mesaj taslağı:**
> Merhaba [isim], içeriklerini uzun zamandır takip ediyorum. AstroFlow'u ben geliştirdim: doğum haritanı tam doğum anına göre hesaplayan, Aster adında büyüyen bir yıldız maskotu olan Türkçe bir astroloji ve manifest uygulaması. Sana ömür boyu premium hediye etmek isterim. Beğenirsen bir story'de bahsetmen beni çok mutlu eder ama hiçbir zorunluluk yok. Kodu buraya bırakıyorum: …

## 8. Hedefler (L+90)

İlk kez yapıldığı için tahmin; L+21'de güncellenir.

| Metrik | Hedef |
|--------|-------|
| Organik indirme (TR) | 1.000 |
| TR puan sayısı / ortalama | 50+ / 4,6+ |
| Kazanan format | en az 1 (taban 1.000 izlenmeyi düzenli geçen ve indirmeyi oynatan) |
| `acquisition_source` doldurma oranı | %40+ |
| Paylaşım sayfası açılışı / aktif kullanıcı (haftalık) | %5+ |

## 9. Bu plan için yapılan ürün işleri (2026-11-19)

- Paylaşım kartı: watermark altında kısa link `<site>/s` (eski kart, sahibi olmadığımız `astroflow.app` adresini basıyordu) + `share_sheet_opened { variant }` olayı
- Web: `/get?c=<kaynak>` ve `/s` yönlendirmeleri (iOS ve masaüstü → App Store `ct` + `pt`; Android ya da app yayında değilse → dile göre waitlist). `NEXT_PUBLIC_APP_STORE_URL` ve `NEXT_PUBLIC_APP_STORE_PT` Vercel'de ayarlanınca header ve hero CTA'sı App Store'a döner. Bio linkleri: `/get?c=tiktok`, `/get?c=ig`
- Onboarding: "Bizi nereden duydun?" (`acquisition_source { source }`), atlanabilir, cihazda kalır, PostHog'a anonim olay olarak gider
- Puan isteği: `expo-store-review`, Aster "glimmer" aşamasına (500 Işık) ve sonrasına büyüdüğünde ya da manifest gerçekleştiğinde, cihaz başına en fazla 120 günde bir (çatlama anında değil, çünkü orada hesap koruma istemi açılıyor)

## Kaynaklar

- Starcrossed: [masterhooks.com](https://www.masterhooks.com/articles/70k-mrr-in-3-months-how-starcrossed-used-emotional-hooks-to-scale-an-astrology-app) · Starla: [playkit](https://playkit.beehiiv.com/p/starla-s-relationship-app) · Astroapp slayt formatı: [shortimize](https://shortimize.com/blog/tiktok-multi-account-slideshow-strategy-making-50m-views-per-month). Rakamların hepsi vendor ya da bülten kaynaklı; anekdot olarak okunmalı.
- Duolingo maskotu ve Reels'te tutmaması: [lilachbullock.com](https://www.lilachbullock.com/duolingo-marketing-strategy/) · [Marketing Brew](https://cur.at/1u3qUK3?m=web)
- Featuring: [Apple: Getting featured](https://developer.apple.com/app-store/getting-featured/) · [Gummicube](https://www.gummicube.com/blog/featuring-nominations-live-in-app-store-connect)
- 2027 Merkür retrosu ve tutulmalar: [Almanac](https://www.almanac.com/content/mercury-retrograde-dates) · [natalecho](https://natalecho.com/learn/astrology/mercury-retrograde-2027-dates-signs-shadow-periods)
- Kısa video aşamaları ve karar kuralları: `.claude/skills/social/references/short-form-video.md` (coreyhaines31/marketingskills)
