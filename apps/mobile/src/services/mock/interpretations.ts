import {
  AspectInterpretation,
  BigThreeReading,
  ChartContext,
  ChartOverview,
  HouseInterpretation,
  NatalChartData,
  NodeAnalysis,
  PlacementInterpretation,
  TransitDetail,
  TransitMovement,
  TransitOverview,
} from "../types";
import { Locale } from "../../i18n";

/** Client-side templated interpretations for the mock (no-backend) path. */

export function mockPlacements(
  chart: NatalChartData,
  locale: Locale,
): PlacementInterpretation[] {
  const points = [
    ...chart.planets.map((p) => ({
      planet: p.name,
      sign: p.sign,
      house: p.house,
      retrograde: p.retrograde,
    })),
    { planet: "Ascendant", sign: chart.angles.ascendant.sign, house: 1, retrograde: false },
  ];
  return points.map((pt) => ({
    ...pt,
    text:
      locale === "tr"
        ? `${pt.planet} ${pt.sign} burcunda ve ${pt.house}. evde. Bu yerleşim, ${pt.sign} niteliklerini yaşamının ${pt.house}. ev alanında ifade etme biçimini renklendirir.`
        : `${pt.planet} sits in ${pt.sign} in your ${pt.house}th house, coloring how you express ${pt.sign} qualities within the affairs of the ${pt.house}th house.`,
  }));
}

export function mockBigThree(chart: NatalChartData, locale: Locale): BigThreeReading {
  const { sunSign, moonSign, risingSign } = chart.summary;
  return {
    sunSign,
    moonSign,
    risingSign,
    text:
      locale === "tr"
        ? `Güneşin ${sunSign}, Ayın ${moonSign}, yükselenin ${risingSign}. Özün ${sunSign}, duygusal dünyan ${moonSign} tarafından şekillenir; dünyaya ${risingSign} merceğiyle çıkarsın.`
        : `Your Sun is in ${sunSign}, Moon in ${moonSign}, and Rising in ${risingSign}. Your core is ${sunSign}, your inner world is shaped by ${moonSign}, and you meet the world through a ${risingSign} lens.`,
  };
}

export function mockAspects(
  chart: NatalChartData,
  locale: Locale,
  limit = 5,
): AspectInterpretation[] {
  return [...chart.aspects]
    .sort((a, b) => a.orb - b.orb)
    .slice(0, limit)
    .map((a) => ({
      planet1: a.planet1,
      planet2: a.planet2,
      aspect: a.aspect,
      type: a.type,
      orb: a.orb,
      text:
        locale === "tr"
          ? `${a.planet1} ile ${a.planet2} arasındaki ${a.aspect} açısı, bu iki enerjinin haritanda belirgin biçimde etkileşmesine yol açar.`
          : `The ${a.aspect} between ${a.planet1} and ${a.planet2} means these two energies interact in a defining way within your chart.`,
    }));
}

export function mockOverview(chart: NatalChartData, locale: Locale): ChartOverview {
  const { sunSign, dominantElement, dominantModality } = chart.summary;
  return {
    text:
      locale === "tr"
        ? `Haritanda ${dominantElement} elementi ve ${dominantModality} niteliği baskın. ${sunSign} Güneşin bu dengeye kişisel bir yön ve amaç katıyor.`
        : `Your chart leans toward the ${dominantElement} element and a ${dominantModality} modality. Your ${sunSign} Sun gives this balance a personal direction and purpose.`,
  };
}

export function mockHouse(
  chart: NatalChartData,
  houseNumber: number,
  locale: Locale,
): HouseInterpretation {
  const h = chart.houses.find((x) => x.house === houseNumber) ?? chart.houses[0];
  const hasP = h.planetsInHouse.length > 0;
  const text =
    locale === "tr"
      ? hasP
        ? `${h.house}. evin başlangıcı ${h.sign} burcunda ve içinde ${h.planetsInHouse.join(", ")} yer alıyor. Evin temalarını bu gezegenlerin enerjisiyle yaşarsın. Yöneticisi ${h.ruler}, ${h.rulerSign} burcunda ${h.rulerHouse}. evde, bu alana renk katar.`
        : `${h.house}. evin başlangıcı ${h.sign} burcunda; içinde gezegen yok, bu yüzden yöneticisi ${h.ruler} üzerinden okunur. ${h.ruler} ${h.rulerSign} burcunda ${h.rulerHouse}. evde olduğundan bu evin temaları o alanla bağlantılı gelişir.`
      : hasP
        ? `The ${h.house}th house begins in ${h.sign} and holds ${h.planetsInHouse.join(", ")}, so you live its themes through those planets. Its ruler ${h.ruler} in ${h.rulerSign} in the ${h.rulerHouse}th house colors this area of life.`
        : `The ${h.house}th house begins in ${h.sign} and is empty, so it is read through its ruler ${h.ruler}. With ${h.ruler} in ${h.rulerSign} in the ${h.rulerHouse}th house, this house's themes unfold through that area of life.`;
  return {
    house: h.house,
    sign: h.sign,
    ruler: h.ruler,
    rulerSign: h.rulerSign,
    rulerHouse: h.rulerHouse,
    planetsInHouse: h.planetsInHouse,
    text,
  };
}

export function mockNodes(chart: NatalChartData, locale: Locale): NodeAnalysis {
  const { north, south } = chart.nodes;
  return {
    northSign: north.sign,
    northHouse: north.house,
    southSign: south.sign,
    southHouse: south.house,
    text:
      locale === "tr"
        ? `Güney Ay Düğümün ${south.sign} burcunda ${south.house}. evde — geçmişten gelen tanıdık kalıplar burada. Kuzey Ay Düğümün ${north.sign} burcunda ${north.house}. evde, büyüme yönünü gösterir.`
        : `Your South Node is in ${south.sign} in the ${south.house}th house — familiar patterns from the past. Your North Node in ${north.sign} in the ${north.house}th house points to your direction of growth.`,
  };
}

export function mockTransitDetail(
  movement: TransitMovement,
  locale: Locale,
): TransitDetail {
  return {
    planet: movement.planet,
    sign: movement.sign,
    natalHouse: movement.natalHouse,
    daysInHouse: movement.daysInHouse,
    retrograde: movement.retrograde,
    aspects: movement.aspects,
    text:
      locale === "tr"
        ? `Transit ${movement.planet} şu an ${movement.sign} burcunda ve doğum haritanın ${movement.natalHouse}. evinden geçiyor${
            movement.retrograde ? " (retro)" : ""
          }. Bu evin yaşam alanları bir süre öne çıkıyor; fırsatları değerlendir, gerilimlerde sabırlı ol.`
        : `Transiting ${movement.planet} is in ${movement.sign}, moving through your natal ${movement.natalHouse}th house${
            movement.retrograde ? " (retrograde)" : ""
          }. It highlights that area of life for a while — lean into the openings and stay patient where it brings friction.`,
  };
}

export function mockTransitOverview(date: string, locale: Locale): TransitOverview {
  return {
    date,
    text:
      locale === "tr"
        ? `Bugün gökyüzü sakin ve dengeli. Küçük, kararlı adımlar için uygun bir gün; enerjini tek bir önceliğe yönlendir.`
        : `The sky today is calm and balanced. A good day for small, deliberate steps — focus your energy on one priority.`,
  };
}

export function mockChartContext(chart: NatalChartData, locale: Locale): ChartContext {
  const { sect, saturn } = chart;
  return {
    sect,
    saturnReturnAge: saturn.returnAge,
    saturnSign: saturn.natalSign,
    saturnHouse: saturn.natalHouse,
    text:
      locale === "tr"
        ? `Bu bir ${sect === "day" ? "gündüz" : "gece"} haritası. Satürn ${saturn.natalSign} burcunda ${saturn.natalHouse}. evde; ilk Satürn dönüşün yaklaşık ${saturn.returnAge} yaşında olgunluk temalarını gündeme getirir.`
        : `This is a ${sect} chart. Saturn is in ${saturn.natalSign} in the ${saturn.natalHouse}th house; your first Saturn return around age ${saturn.returnAge} brings themes of maturity.`,
  };
}
