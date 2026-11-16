import type { momentsEn } from "./moments.en";

/**
 * Önemli gökyüzü anları (Bugün kartı + sheet). Kurallar için moments.en.ts.
 * Gezegen adlarından sonra ek gelmeyecek şekilde yazıldı ("Satürn'ün" gibi
 * çekimler değişken adla doğru çıkmaz): "natal {{target}} noktan" kalıbı.
 */
export const momentsTr: typeof momentsEn = {
  cardLabel: "Gökyüzünde önemli an",
  more: "+{{n}} an daha",
  open: "Devamını oku",
  sheetTitle: "Gökyüzü anların",
  upcomingTitle: "Sıradakiler",
  passesLabel: "Tam tarihler",
  seasonLabel: "Mevsim",
  peakLabel: "Tam isabet",
  houseLine: "{{house}} evinde",
  possibleChip: "Olası",
  possibleNote: "Doğum saatin bilinmediği için Ay'ının yeri yaklaşık. Bu an kesin değil, olası.",
  softNote: "Bu klasik bir teknik değil, bir yansıma notu.",
  cta: "Bu an için bir manifest yaz",
  ctaHint: "Yeni bir manifest açar",
  remindMe: "Önemli anlardan bir gün önce haber ver",
  remindOn: "Bir gün önce haber vereceğim.",
  empty: "Önümüzdeki haftalarda büyük bir an yok. Sakin gökyüzü, alışkanlık kurmak için iyi bir zaman.",
  error: "Gökyüzü anlarını şu an okuyamadım.",
  when: {
    active: "Şu an etkin · {{end}} tarihine kadar",
    activeOpen: "Şu an etkin",
    upcoming: "{{start}} itibarıyla",
    day: "{{date}}",
    range: "{{start}} – {{end}}",
  },
  aspect: {
    conjunction: "kavuşumu",
    square: "karesi",
    opposition: "karşıtlığı",
  },
  aspectBase: {
    conjunction: "kavuşum",
    square: "kare",
    opposition: "karşıtlık",
  },
  target: {
    Ascendant: "Yükselen",
    Midheaven: "Tepe Noktası (MC)",
    NorthNode: "Kuzey Ay Düğümü",
    SouthNode: "Güney Ay Düğümü",
  },
  station: {
    retrograde: "retroya dönüyor",
    direct: "düz yöne dönüyor",
  },
  theme: {
    Jupiter: "büyüme ve yeni kapılar",
    Saturn: "yapı, sorumluluk ve sabır",
    Uranus: "değişim ve özgürleşme",
    Neptune: "hayaller, sezgi ve kontrolü bırakmak",
    Pluto: "derin dönüşüm",
    Mercury: "düşünce, konuşma ve planlar",
    Venus: "sevgi, değerler ve keyif",
    Mars: "enerji, cesaret ve sınırlar",
    Moon: "duygular ve ihtiyaçlar",
    Sun: "kimlik ve yön",
  },
  title: {
    saturn_return: "Satürn dönüşün",
    saturn_return2: "İkinci Satürn dönüşün",
    jupiter_return: "Jüpiter dönüşün",
    nodal_return: "Ay Düğümü dönüşün",
    nodal_reversal: "Ay Düğümü ters dönüşün",
    outer_transit: "{{planet}} – {{target}} {{aspect}}",
    generational: "{{planet}} {{aspect}}",
    station_on_natal: "{{planet}}, natal {{target}} noktanda duruyor",
    chart_ruler_station: "Harita yöneticin {{planet}} duruyor",
    eclipse_solar: "Güneş tutulması: natal {{target}} noktanda",
    eclipse_lunar: "Ay tutulması: natal {{target}} noktanda",
    lunation_new: "Yeni Ay: natal {{target}} noktanda",
    lunation_full: "Dolunay: natal {{target}} noktanda",
    retrograde_period: "{{planet}} retrosu",
    double_retrograde: "{{planet}} yine retroda",
  },
  body: {
    saturn_return:
      "Satürn, doğduğun gündeki yerine geri dönüyor; bu yaklaşık 29 yılda bir olur. Yetişkinlik temellerini kurma mevsimi: neyi tutacağını, neyi bırakacağını ve neyin sorumluluğunu alacağını seçersin.",
    jupiter_return:
      "Jüpiter 12 yıllık turunu tamamlayıp doğumdaki yerine geliyor. Büyüme, öğrenme ve yeni kapılar teması.",
    nodal_return:
      "Ay düğümleri doğumdaki yerine dönüyor (yaklaşık 18,6 yılda bir). Yön ve amaç soruları öne çıkabilir.",
    nodal_reversal:
      "Ay düğümleri doğumdakinin tam tersinde. Eski alışkanlıklara ve yeni yönlere yan yana bakmak için doğal bir zaman.",
    outer_transit:
      "Transit {{planet}}, natal {{target}} noktanla {{aspectBase}} yapıyor. Tema: {{theme}}. Tek bir gün değil, zamana yayılan bir dönem.",
    generational:
      "{{planet}}, doğumdaki kendi yerine {{aspectBase}} yapıyor ({{age}} yaş). Yaşıtlarınla paylaştığın bir geçiş dönemi.",
    station_on_natal:
      "{{planet}}, tam natal {{target}} noktanın üzerinde {{station}}. İstasyonda gezegen yavaşlar, bu yüzden bu tema bir süre odakta kalır: {{theme}}.",
    chart_ruler_station:
      "{{planet}} yükselen burcunun yöneticisi ve şu an {{station}}. Kendinle ve yönünle ilgili bir durup bakma zamanı.",
    eclipse:
      "Tutulma natal {{target}} noktana düşüyor. Tutulmalar tek bir günü değil, yaklaşık altı aylık bir bölümü açar.",
    lunation:
      "Bu {{lunation}} natal {{target}} noktana denk geliyor. Bir manifest yazmak ya da tazelemek için iyi bir an.",
    retrograde_period:
      "{{planet}}, {{start}} – {{end}} arasında geri gidiyormuş gibi görünüyor. Gözden geçirme ve yeniden düşünme zamanı; korkulacak bir şey yok.",
    double_retrograde:
      "Doğduğunda da {{planet}} retrodaydı. Bu yavaş ritim sana tanıdık gelebilir: acele etmeden geriye bakma zamanı.",
  },
  lunationName: {
    new: "Yeni Ay",
    full: "Dolunay",
  },
};
