import type { moodEn, planEn } from "./plan.en";

/** Bugünün kişisel gökyüzü planı ve sabah gökyüzü check-in'i — bkz. plan.en.ts. */
export const planTr: typeof planEn = {
  title: "Senin gökyüzü planın",
  focus: "Bugün odak: {{area}}",
  moonLine: "Ay {{n}} evinde",
  progress: "{{done}}/{{total}}",
  progressA11y: "{{total}} adımın {{done}} tanesi tamam",
  expand: "Planı göster",
  collapse: "Planı gizle",
  xp: "+{{n}}",
  done: "Tamam",
  allDone: "Hepsi tamam! Aster parlıyor",
  resting: "Aster dinleniyor. Planın döndüğünde burada olacak — yorumun ve haritan açık kalır.",
  loadError: "Planını şu an çizemedim.",
  week: "Bu hafta",
  weekA11y: "Bu haftanın güçlü alanları. Öngörünü açar.",
  weekDay: "{{day}}: {{area}}",
  step: {
    skyCheckin: "Gökyüzünün nasıl olduğunu Aster'a söyle",
    skyRead: "Bugünün göğünü oku",
    checkin: "Güç manifestin için pratik yap",
    createWish: "Bir manifest yaz",
    affirmation: "Bugünün olumlamasını söyle",
    reflection: "Günü üç güzel şeyle kapat",
    breath: "Aster ile bir dakika nefes al",
    tarot: "Kartlara bugünün sorusunu sor",
    moon: {
      new: "Yeniay ritüeli: bir manifest yaz",
      full: "Dolunay ritüeli: hasat et ya da bırak",
    },
  },
  why: {
    focus: "Bugün {{area}} günün",
    gentle: "İçeride daha yumuşak bir gün",
    moon: {
      new: "Yeniay geldi",
      full: "Ay dolunayda",
    },
  },
  tarotQ: {
    harmonic: "{{planet}} haritamdaki {{natal}} noktasını desteklerken bugünü en iyi nasıl değerlendiririm?",
    challenging: "{{planet}} bugün haritamdaki {{natal}} noktası hakkında bana ne öğretmek istiyor?",
    neutral: "{{planet}} haritamdaki {{natal}} noktasıyla buluşurken bugün neye dikkat etmeliyim?",
    focus: "Bugün {{area}} alanımda beni ne bekliyor?",
  },
};

export const moodTr: typeof moodEn = {
  title: "Bugün gökyüzün nasıl?",
  subtitle: "Aster planını buna göre ayarlar.",
  sky: {
    RADIANT: "Işıl ışıl",
    CLEAR: "Açık",
    PARTLY: "Parçalı bulutlu",
    CLOUDY: "Bulutlu",
    STORMY: "Fırtınalı",
  },
  energy: "Enerji",
  energyA11y: "Enerji 5 üzerinden {{n}}",
  send: "Aster'a söyle",
  error: "Bu bana ulaşmadı. Tekrar dener misin?",
  reply: {
    RADIANT: "Işıl ışılsın! Bu ışığı bugün en önemli şeye verelim.",
    CLEAR: "Açık bir gökyüzü — sakin bir adım atmak için güzel bir gün.",
    PARTLY: "Birkaç bulut sorun değil. Bugünü hafif ve şefkatli tutalım.",
    CLOUDY: "Bulutlu günler de olur. Planını yumuşak tutacağım.",
    STORMY: "Fırtınalar geçer. Önce birlikte nefes alalım — ben buradayım.",
  },
  moon: "Ay {{sign}} burcunda, {{n}} evinde.",
  breathe: "Nefes al",
  gotIt: "Tamam",
};
