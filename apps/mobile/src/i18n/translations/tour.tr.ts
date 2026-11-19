import type { tourEn } from "./tour.en";

/** Aster'in onboarding sonrası bir kez verdiği uygulama turu (TourHost). Kurallar için tour.en.ts. */
export const tourTr: typeof tourEn = {
  next: "İleri",
  skip: "Geç",
  done: "Başlayalım",
  stepA11y: "Adım {{n}} / {{total}}",
  overlayA11y: "Aster ile uygulama turu",
  steps: {
    aster: "Ben Aster! Bana dokunursan yuvama gelirsin: beni giydirebilir, büyüdüğümü görebilirsin.",
    asterEgg: "Bu yumurta benim, Aster! İlk manifestini yazınca çatlayacağım. Sonra bana dokunup yuvama gelebilirsin.",
    quests: "Bunlar bugünün hedefleri. Her biri beni besler ve yörüngeni sürdürür.",
    manifest: "Manifest sekmesinde manifestlerini yazar, pratiklerini yaparsın. Her pratik bir yıldızı parlatır.",
    sky: "Gökyüzü uygulamanın kalbi: Haritam'da haritanı adım adım öğrenir, İleride'de önündeki günleri, Uyum'da biriyle uyumunu görürsün.",
    tarot: "Tarot'ta kart çekip aklındaki soruya göre bir okuma alırsın.",
    notifications: "Hatırlatmaları buradan açarsın: günlük hatırlatma, manifestlerin ve gökyüzü anları. Saatini sen seçersin.",
    end: "Tur bu kadar! İstediğin zaman Profil'den tekrar izleyebilirsin.",
  },
  replayTitle: "Turu tekrar izle",
  replaySub: "Aster uygulamayı bir kez daha gezdirsin",
};
