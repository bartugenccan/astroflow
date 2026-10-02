import type { NatalReportData } from "../../../services/types";
import { aspectPhrase } from "../../../lib/astroLanguage";
import { Chapter, beforeYouRead, birthLine, disclaimer, reportDocument } from "./document";
import {
  CHALLENGING,
  GOLD,
  HARMONIC,
  INK,
  PdfContext,
  aspectLabel,
  degText,
  elementName,
  esc,
  houseText,
  inlineGlyph,
  lookup,
  paras,
  pointName,
  signName,
} from "./html";
import { chartWheelSvg } from "./wheelSvg";

/**
 * The birth chart report as one printable HTML document: cover, contents,
 * a plain-language primer, the wheel and tables, then every interpretation
 * the API prepared — overview, Big Three, backdrop, each planet, the twelve
 * houses, aspects, nodes, the report-only themes and a closing word.
 */
export function buildNatalHtml(data: NatalReportData, ctx: PdfContext, fontsCss: string): string {
  const { t } = ctx;
  const unknown = data.birth.unknownTime;

  const chapters: Chapter[] = [
    beforeYouRead(
      ctx,
      ["natalChart", "planet", "sign", "house", "aspect", "retrograde"],
      t("reports.pdf.howToReadNatal"),
      unknown ? t("reports.pdf.unknownTimeNote") : undefined,
    ),
    chartChapter(data, ctx),
    overviewChapter(data, ctx),
    {
      title: t("reports.pdf.contextTitle"),
      body:
        `<div class="grid3 keep">` +
        stat(t("glossary.terms.dayNightChart.title"), data.context.sect === "day" ? t("reports.pdf.sectDay") : t("reports.pdf.sectNight")) +
        stat(t("glossary.terms.saturnReturn.title"), `~${data.context.saturnReturnAge}`) +
        stat(pointName(ctx, "Saturn"), signName(ctx, data.context.saturnSign)) +
        `</div>` +
        paras(data.context.text),
    },
    placementsChapter(data, ctx),
  ];

  if (!unknown && data.houses.length) chapters.push(housesChapter(data, ctx));
  chapters.push(aspectsChapter(data, ctx));
  chapters.push({
    title: t("reports.pdf.nodesTitle"),
    body:
      `<div class="item-meta">${esc(
        t("reports.pdf.nodesLine", {
          north: unknown ? signName(ctx, data.nodes.northSign) : `${signName(ctx, data.nodes.northSign)} · ${houseText(ctx, data.nodes.northHouse)}`,
          south: unknown ? signName(ctx, data.nodes.southSign) : `${signName(ctx, data.nodes.southSign)} · ${houseText(ctx, data.nodes.southHouse)}`,
        }),
      )}</div>` + paras(data.nodes.text),
  });
  chapters.push(themesChapter(data, ctx));
  chapters.push(disclaimer(ctx, data.extras.closing));

  return reportDocument({
    ctx,
    title: t("reports.pdf.natalTitle"),
    name: data.name,
    coverSub: birthLine(ctx, data.birth),
    generatedAt: data.generatedAt,
    fontsCss,
    chapters,
  });
}

function stat(label: string, value: string): string {
  return `<div class="stat"><div class="label">${esc(label)}</div><div class="value">${esc(value)}</div></div>`;
}

function chartChapter(data: NatalReportData, ctx: PdfContext): Chapter {
  const { t } = ctx;
  const unknown = data.birth.unknownTime;
  const chart = data.chart;

  const wheel =
    `<div class="wheel-wrap keep">${chartWheelSvg(chart, {
      unknownTime: unknown,
      labels: { asc: t("reports.pdf.asc"), mc: t("reports.pdf.mc") },
    })}</div>` +
    `<div class="caption">${esc(t("reports.pdf.wheelCaption"))}</div>` +
    `<div class="legend"><i style="background:${HARMONIC}"></i>${esc(aspectLabel(ctx, "Trine"))} · ${esc(aspectLabel(ctx, "Sextile"))}` +
    `<i style="background:${CHALLENGING}"></i>${esc(aspectLabel(ctx, "Square"))} · ${esc(aspectLabel(ctx, "Opposition"))}` +
    `<i style="background:${GOLD}"></i>${esc(aspectLabel(ctx, "Conjunction"))}</div>`;

  const planetRows = chart.planets
    .map(
      (p) =>
        `<tr><td>${inlineGlyph(p.name)} ${esc(pointName(ctx, p.name))}</td>` +
        `<td>${inlineGlyph(p.sign, GOLD)} ${esc(signName(ctx, p.sign))}</td>` +
        `<td class="num">${degText(p.degree, p.minute)}${p.retrograde ? ` <span class="retro">${esc(t("reports.pdf.retro"))}</span>` : ""}</td>` +
        (unknown ? "" : `<td class="num">${p.house}</td>`) +
        `</tr>`,
    )
    .join("");
  const angleRows = unknown
    ? ""
    : [
        ["Ascendant", chart.angles.ascendant, 1],
        ["Midheaven", chart.angles.midheaven, 10],
      ]
        .map(([name, pos, house]) => {
          const p = pos as { sign: string; degree: number; minute: number };
          return (
            `<tr><td>${inlineGlyph(name === "Ascendant" ? "Ascendant" : "MC")} ${esc(pointName(ctx, name as string))}</td>` +
            `<td>${inlineGlyph(p.sign, GOLD)} ${esc(signName(ctx, p.sign))}</td><td class="num">${degText(p.degree, p.minute)}</td><td class="num">${house}</td></tr>`
          );
        })
        .join("");
  const nodeRows = (["north", "south"] as const)
    .map((k) => {
      const n = chart.nodes[k];
      const name = k === "north" ? "NorthNode" : "SouthNode";
      return (
        `<tr><td>${inlineGlyph(name)} ${esc(pointName(ctx, name))}</td><td>${inlineGlyph(n.sign, GOLD)} ${esc(signName(ctx, n.sign))}</td>` +
        `<td class="num">${degText(n.degree, n.minute)}</td>${unknown ? "" : `<td class="num">${n.house}</td>`}</tr>`
      );
    })
    .join("");

  const planets =
    `<h2>${esc(t("reports.pdf.planetsTable"))}</h2>` +
    `<table class="data"><thead><tr><th>${esc(t("reports.pdf.colPlanet"))}</th><th>${esc(t("reports.pdf.colSign"))}</th>` +
    `<th class="num">${esc(t("reports.pdf.colDegree"))}</th>${unknown ? "" : `<th class="num">${esc(t("reports.pdf.colHouse"))}</th>`}</tr></thead>` +
    `<tbody>${planetRows}${angleRows}${nodeRows}</tbody></table>`;

  const houses = unknown
    ? ""
    : `<h2>${esc(t("reports.pdf.housesTable"))}</h2>` +
      `<table class="data"><thead><tr><th>${esc(t("reports.pdf.colHouseNo"))}</th><th>${esc(t("reports.pdf.colCusp"))}</th>` +
      `<th>${esc(t("reports.pdf.colRuler"))}</th><th>${esc(t("reports.pdf.colPlanet"))}</th></tr></thead><tbody>` +
      chart.houses
        .map(
          (h) =>
            `<tr><td class="num" style="text-align:left">${h.house}</td>` +
            `<td>${inlineGlyph(h.sign, GOLD)} ${esc(signName(ctx, h.sign))} ${degText(h.degree, h.minute)}</td>` +
            `<td>${inlineGlyph(h.ruler)} ${esc(pointName(ctx, h.ruler))} <span class="muted small">· ${esc(signName(ctx, h.rulerSign))}, ${h.rulerHouse}</span></td>` +
            `<td>${h.planetsInHouse.map((p) => inlineGlyph(p, INK, 13)).join("") || '<span class="muted">—</span>'}</td></tr>`,
        )
        .join("") +
      `</tbody></table>`;

  const aspects =
    `<h2>${esc(t("reports.pdf.aspectsTable"))}</h2>` +
    `<table class="data"><thead><tr><th>${esc(t("reports.pdf.colPlanet"))}</th><th>${esc(t("reports.pdf.colAspect"))}</th>` +
    `<th>${esc(t("reports.pdf.colPlanet"))}</th><th class="num">${esc(t("reports.pdf.colOrb"))}</th></tr></thead><tbody>` +
    chart.aspects
      .map((a) => {
        const color = a.type === "harmonic" ? HARMONIC : a.type === "challenging" ? CHALLENGING : GOLD;
        return (
          `<tr><td>${inlineGlyph(a.planet1)} ${esc(pointName(ctx, a.planet1))}</td>` +
          `<td>${inlineGlyph(a.aspect, color)} ${esc(aspectLabel(ctx, a.aspect))}</td>` +
          `<td>${inlineGlyph(a.planet2)} ${esc(pointName(ctx, a.planet2))}</td><td class="num">${Math.abs(a.orb).toFixed(1)}°</td></tr>`
        );
      })
      .join("") +
    `</tbody></table>`;

  return { title: t("reports.pdf.chartTitle"), body: wheel + planets + houses + aspects + balanceBlock(data, ctx) };
}

function balanceBlock(data: NatalReportData, ctx: PdfContext): string {
  const { t } = ctx;
  const b = data.balance;
  const bars = (entries: [string, number][]) => {
    const total = Math.max(1, entries.reduce((s, [, n]) => s + n, 0));
    return entries
      .map(
        ([label, n]) =>
          `<div class="bar-row"><span class="name">${esc(label)}</span><span class="bar"><i style="width:${((n / total) * 100).toFixed(1)}%"></i></span><span class="n">${n}</span></div>`,
      )
      .join("");
  };
  const modality = (m: string) => lookup(ctx, `reports.pdf.modality.${m}`, m);
  return (
    `<div class="keep"><h2>${esc(t("reports.pdf.balanceTable"))}</h2>` +
    `<div class="item-meta">${esc(t("reports.pdf.dominant", { element: elementName(ctx, b.dominantElement), modality: modality(b.dominantModality) }))} · ${esc(
      data.chart.sect === "day" ? t("reports.pdf.sectDay") : t("reports.pdf.sectNight"),
    )}</div>` +
    `<div class="grid2"><div class="bars"><h3>${esc(t("reports.pdf.elements"))}</h3>${bars(
      (["Fire", "Earth", "Air", "Water"] as const).map((e) => [elementName(ctx, e), b.elements[e]]),
    )}</div>` +
    `<div class="bars"><h3>${esc(t("reports.pdf.modalities"))}</h3>${bars(
      (["Cardinal", "Fixed", "Mutable"] as const).map((m) => [modality(m), b.modalities[m]]),
    )}</div></div></div>`
  );
}

function overviewChapter(data: NatalReportData, ctx: PdfContext): Chapter {
  const { t } = ctx;
  const unknown = data.birth.unknownTime;
  const three =
    `<div class="grid3 keep">` +
    stat(t("bigThree.sun"), signName(ctx, data.bigThree.sunSign)) +
    stat(t("bigThree.moon"), signName(ctx, data.bigThree.moonSign)) +
    (unknown ? "" : stat(t("bigThree.rising"), signName(ctx, data.bigThree.risingSign))) +
    `</div>`;
  return {
    title: t("reports.pdf.overviewTitle"),
    body: paras(data.overview.text) + `<h2>${esc(t("reports.pdf.bigThreeTitle"))}</h2>` + three + paras(data.bigThree.text),
  };
}

function placementsChapter(data: NatalReportData, ctx: PdfContext): Chapter {
  const { t } = ctx;
  const unknown = data.birth.unknownTime;
  const items = data.placements
    .filter((p) => !(unknown && p.planet === "Ascendant"))
    .map((p) => {
      const pos = data.chart.planets.find((x) => x.name === p.planet);
      const line = unknown
        ? t("reports.pdf.placementLineNoHouse", { planet: pointName(ctx, p.planet), sign: signName(ctx, p.sign) })
        : t("reports.pdf.placementLine", { planet: pointName(ctx, p.planet), sign: signName(ctx, p.sign), house: houseText(ctx, p.house) });
      const meta = [
        pos ? degText(pos.degree, pos.minute) + " " + signName(ctx, pos.sign) : "",
        p.retrograde ? t("reports.pdf.retroLong") : "",
      ]
        .filter(Boolean)
        .join(" · ");
      return (
        `<div class="item"><div class="item-head"><span class="badge">${inlineGlyph(p.planet, INK, 18)}</span><span class="title">${esc(line)}</span></div>` +
        (meta ? `<div class="item-meta">${esc(meta)}</div>` : "") +
        `${paras(p.text)}</div>`
      );
    })
    .join("");
  return { title: t("reports.pdf.placementsTitle"), body: items };
}

function housesChapter(data: NatalReportData, ctx: PdfContext): Chapter {
  const { t } = ctx;
  const items = [...data.houses]
    .sort((a, b) => a.house - b.house)
    .map((h) => {
      const house = houseText(ctx, h.house);
      const heading = t("reports.pdf.houseHeading", { house: house.charAt(0).toUpperCase() + house.slice(1), sign: signName(ctx, h.sign) });
      const ruler = t("reports.pdf.houseRuler", {
        ruler: pointName(ctx, h.ruler),
        sign: signName(ctx, h.rulerSign),
        house: houseText(ctx, h.rulerHouse),
      });
      const inHouse = h.planetsInHouse.length
        ? t("reports.pdf.houseHas", { list: h.planetsInHouse.map((p) => pointName(ctx, p)).join(", ") })
        : t("reports.pdf.houseEmpty");
      return (
        `<div class="item"><div class="item-head"><span class="badge">${inlineGlyph(h.sign, GOLD, 18)}</span><span class="title">${esc(heading)}</span></div>` +
        `<div class="item-meta">${esc(ruler)} · ${esc(inHouse)}</div>${paras(h.text)}</div>`
      );
    })
    .join("");
  return { title: t("reports.pdf.housesTitle"), body: items };
}

function aspectsChapter(data: NatalReportData, ctx: PdfContext): Chapter {
  const { t } = ctx;
  const items = data.aspects
    .map((a) => {
      const color = a.type === "harmonic" ? HARMONIC : a.type === "challenging" ? CHALLENGING : GOLD;
      const phrase = aspectPhrase(t, a.aspect, pointName(ctx, a.planet1), pointName(ctx, a.planet2), false);
      return (
        `<div class="item"><div class="item-head"><span class="badge">${inlineGlyph(a.aspect, color, 18)}</span><span class="title">${esc(phrase)}</span></div>` +
        `<div class="item-meta">${inlineGlyph(a.planet1, INK, 12)} ${esc(aspectLabel(ctx, a.aspect))} ${inlineGlyph(a.planet2, INK, 12)} · ${esc(
          t("reports.pdf.colOrb"),
        )} ${Math.abs(a.orb).toFixed(1)}°</div>${paras(a.text)}</div>`
      );
    })
    .join("");
  return { title: t("reports.pdf.aspectsTitle"), body: items };
}

function themesChapter(data: NatalReportData, ctx: PdfContext): Chapter {
  const { t } = ctx;
  const ruler = data.balance.chartRuler;
  const themes = (["love", "career", "money", "growth"] as const)
    .map((k) => `<div class="item"><h2>${esc(t(`reports.pdf.themes.${k}`))}</h2>${paras(data.extras.themes[k])}</div>`)
    .join("");
  return {
    title: t("reports.pdf.themesTitle"),
    body:
      `<h2>${esc(t("reports.pdf.balanceTitle"))}</h2>${paras(data.extras.balance)}` +
      (ruler && !data.birth.unknownTime
        ? `<h2>${esc(t("reports.pdf.rulerTitle"))}</h2><div class="item-meta">${inlineGlyph(ruler.planet, INK, 12)} ${esc(
            t("reports.pdf.placementLine", { planet: pointName(ctx, ruler.planet), sign: signName(ctx, ruler.sign), house: houseText(ctx, ruler.house) }),
          )}</div>${paras(data.extras.chartRuler)}`
        : "") +
      themes,
  };
}
