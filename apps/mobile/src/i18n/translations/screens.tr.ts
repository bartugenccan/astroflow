import type { screensEn } from "./screens.en";

/** Aster'ın onboarding, harita ve Gökyüzü ekranlarındaki sesi — bkz. screens.en.ts. */
export const screensTr: typeof screensEn = {
  welcome: {
    asterAsk: "Merhaba, ben Aster — hâlâ yumurtamın içinde kıvrılmış duruyorum. Sana ne diye seslenelim?",
    asterGreet: "Tanıştığımıza çok sevindim, {{name}}! Gökyüzünü birlikte okuyalım mı?",
  },
  onboarding: {
    asterDate: "Doğduğun an gökyüzü nasıldı? Önce günden başlayalım.",
    asterTime: "Saat, ufukta hangi burcun yükseldiğini söyler. Tahmini bir saat de olur.",
    asterPlace: "Son soru! Nerede doğdun? Haritanın çizildiği ufku bu belirler.",
    placeLoading: "Şehrini arıyorum…",
    placeEmpty: "Bu şehri bulamadım. Başka bir yazımla dene — ya da koordinatları gir.",
    placeOffline: "Şu an haritaya ulaşamıyorum. Yine de koordinatları girebilirsin.",
  },
  consent: {
    aster: "Gökyüzüne bakmadan önce: onu yapay zekâ yardımıyla okuyorum. Bunun tam olarak ne demek olduğunu anlatayım.",
  },
  reveal: {
    asterLine: "Güneşin {{sun}} burcunda, Ayın {{moon}} burcunda, yükselenin de {{rising}}… Seni tanımaya başlıyorum, {{name}}.",
    asterLineNoRising: "Güneşin {{sun}} burcunda, Ayın {{moon}} burcunda… Seni tanımaya başlıyorum, {{name}}.",
    friend: "dostum",
    error: "Gökyüzü biraz bulutlandı, haritanı çıkaramadım. Bir daha deneyelim mi?",
  },
  tour: {
    progress: "{{n}} / {{total}}",
    skipA11y: "Turu geç ve AstroFlow'a gir",
  },
  sky: {
    hintChart: "Tüm gezegenlerini görmek için çarkına dokun — her birini sana anlatırım.",
    hintFuture: "İşte yaklaşanlar. Doğum günü haritan en üstte.",
    hintMatch: "Birini mi merak ediyorsun? Ekle, gökyüzlerinizi karşılaştırayım.",
    hintAsk: "Bana istediğini sor — cevabı haritandan okurum.",
  },
  chart: {
    transitBanner: "Bugün {{transit}}, doğum haritandaki {{planet}} ile temas ediyor",
    transitBannerBody: "Ne anlattığını görmek için aşağıdan {{planet}} yerleşimini aç ya da gökyüzünün bugün yaptığı her şeye bak.",
    transitCta: "Bugünün transitlerini gör",
    signBanner: "Haritandaki {{sign}} köşesi",
    signPlanets: "Haritanda {{planets}}, {{sign}} burcunda.",
    signPlanetsOne: "Haritanda {{planets}}, {{sign}} burcunda.",
    signEmpty: "Hiçbir gezegenin {{sign}} burcunda değil — yine de bu burcun temaları yönettiği hayat alanına renk katar.",
    dismiss: "Bu notu gizle",
    error: "Bu sefer haritanı çizemedim.",
  },
  states: {
    transitsError: "Bu sefer bugünün gökyüzünü okuyamadım.",
  },
};
