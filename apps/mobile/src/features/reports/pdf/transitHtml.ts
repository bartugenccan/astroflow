import type { TimelineEvent, TransitReportData } from "../../../services/types";
import { aspectPhrase } from "../../../lib/astroLanguage";
import { formatDayMonthYear, monthLong } from "../../../lib/dates";
import { Chapter, beforeYouRead, birthLine, disclaimer, reportDocument } from "./document";
import {
  CHALLENGING,
  GOLD,
  HARMONIC,
  INK,
  PdfContext,
  aspectLabel,
  degText,
  esc,
  houseText,
  inlineGlyph,
  leadParas,
  longDate,
  natureColor,
  paras,
  pointName,
  signName,
} from "./html";
import { chartWheelSvg } from "./wheelSvg";

/**
 * The transit report: today's sky against the birth chart (bi-wheel, table,
 * planet-by-planet readings), then the next 24 months — the big transits,
 * every dated event month by month, season-by-season chapters and the key
 * dates (eclipses, retrograde stations).
 */
export function buildTransitHtml(data: TransitReportData, ctx: PdfContext, fontsCss: string): string {
  const { t } = ctx;
  const chapters: Chapter[] = [
    beforeYouRead(
      ctx,
      ["transit", "aspect", "orb", "house", "retrograde"],
      t("reports.pdf.howToReadTransit"),
      data.birth.unknownTime ? t("reports.pdf.unknownTimeNote") : undefined,
    ),
    todayChapter(data, ctx),
    detailsChapter(data, ctx),
  ];
  if (data.spotlights.length) chapters.push(spotlightsChapter(data, ctx));
  chapters.push(timelineChapter(data, ctx));
  if (data.quarters.length) chapters.push(quartersChapter(data, ctx));
  chapters.push(keyDatesChapter(data, ctx));
  chapters.push(disclaimer(ctx));

  return reportDocument({
    ctx,
    title: t("reports.pdf.transitTitle"),
    name: data.name,
    coverSub: `${t("reports.pdf.transitPeriod", {
      from: longDate(ctx, data.timeline.from),
      to: longDate(ctx, data.timeline.to),
    })} · ${birthLine(ctx, data.birth)}`,
    generatedAt: data.generatedAt,
    fontsCss,
    chapters,
  });
}

function shortDate(ctx: PdfContext, iso: string): string {
  return formatDayMonthYear(ctx.locale, iso.slice(0, 10));
}

/** "Day Mon" for rows inside a month heading. */
function dayMonth(ctx: PdfContext, iso: string): string {
  return shortDate(ctx, iso).replace(/\s\d{4}$/, "");
}

/** Readable sentence for an event, if the API didn't send one (older jobs). */
function fallbackLabel(ctx: PdfContext, e: TimelineEvent): string {
  const p = pointName(ctx, e.planet);
  switch (e.kind) {
    case "aspect":
      return e.aspect && e.target ? aspectPhrase(ctx.t, e.aspect, p, pointName(ctx, e.target)) : p;
    case "house_ingress":
      return `${p} → ${e.house ? houseText(ctx, e.house) : ""}`;
    case "sign_ingress":
      return `${p} → ${e.sign ? signName(ctx, e.sign) : ""}`;
    case "station":
      return `${p} ${e.direction === "retrograde" ? "℞" : "D"}${e.sign ? ` · ${signName(ctx, e.sign)}` : ""}`;
    case "eclipse":
      return `${e.eclipse === "solar" ? "☉" : "☽"} ${e.sign ? signName(ctx, e.sign) : ""}`;
  }
}

const labelOf = (ctx: PdfContext, e: TimelineEvent) => e.label?.trim() || fallbackLabel(ctx, e);

/**
 * The label for a row that already shows the date: one-day events end in
 * " — <date>" (see the API's describeEvent), which would just repeat it.
 * Aspects keep their span and exact dates.
 */
const rowLabel = (ctx: PdfContext, e: TimelineEvent) =>
  e.kind === "aspect" ? labelOf(ctx, e) : labelOf(ctx, e).replace(/\s+—\s+[^—]+$/, "");

function eventColor(e: TimelineEvent): string {
  if (e.kind === "aspect") return natureColor(e.nature);
  if (e.kind === "station") return e.direction === "retrograde" ? CHALLENGING : HARMONIC;
  if (e.kind === "eclipse") return INK;
  return GOLD;
}

function todayChapter(data: TransitReportData, ctx: PdfContext): Chapter {
  const { t } = ctx;
  const unknown = data.birth.unknownTime;
  const { report, overview } = data.today;

  const wheel =
    `<div class="wheel-wrap keep">${chartWheelSvg(data.chart, {
      unknownTime: unknown,
      labels: { asc: t("reports.pdf.asc"), mc: t("reports.pdf.mc") },
      transits: report.movements,
    })}</div>` + `<div class="caption">${esc(t("reports.pdf.biWheelCaption"))} · ${esc(longDate(ctx, report.date))}</div>`;

  const rows = report.movements
    .map((m) => {
      const contacts = m.aspects
        .map((a) => `<span class="chip">${inlineGlyph(a.aspect, natureColor(a.nature), 11)} ${esc(pointName(ctx, a.natalPlanet))}</span>`)
        .join("");
      return (
        `<tr><td>${inlineGlyph(m.planet)} ${esc(pointName(ctx, m.planet))}</td>` +
        `<td>${inlineGlyph(m.sign, GOLD)} ${esc(signName(ctx, m.sign))} ${degText(m.degree, m.minute)}${
          m.retrograde ? ` <span class="retro">${esc(t("reports.pdf.retro"))}</span>` : ""
        }</td>` +
        (unknown ? "" : `<td class="num">${m.natalHouse}</td><td class="num">${Math.round(m.daysInHouse)}</td>`) +
        `<td>${contacts || '<span class="muted">—</span>'}</td></tr>`
      );
    })
    .join("");

  const table =
    `<h2>${esc(t("reports.pdf.movementsTable"))}</h2>` +
    `<table class="data"><thead><tr><th>${esc(t("reports.pdf.colPlanet"))}</th><th>${esc(t("reports.pdf.colSign"))}</th>` +
    (unknown ? "" : `<th class="num">${esc(t("reports.pdf.colHouse"))}</th><th class="num">${esc(t("reports.pdf.colDays"))}</th>`) +
    `<th>${esc(t("reports.pdf.colAspect"))}</th></tr></thead><tbody>${rows}</tbody></table>`;

  return { title: t("reports.pdf.todayTitle"), body: leadParas(overview.text) + wheel + table };
}

function detailsChapter(data: TransitReportData, ctx: PdfContext): Chapter {
  const { t } = ctx;
  const unknown = data.birth.unknownTime;
  const items = data.today.details
    .map((d) => {
      const heading = unknown
        ? t("reports.pdf.placementLineNoHouse", { planet: pointName(ctx, d.planet), sign: signName(ctx, d.sign) })
        : t("reports.pdf.detailHeading", { planet: pointName(ctx, d.planet), sign: signName(ctx, d.sign), house: houseText(ctx, d.natalHouse) });
      const contacts = d.aspects
        .map((a) => `${inlineGlyph(a.aspect, natureColor(a.nature), 11)} ${esc(aspectLabel(ctx, a.aspect))} ${esc(pointName(ctx, a.natalPlanet))}`)
        .join(" · ");
      const meta = [d.retrograde ? esc(t("reports.pdf.retroLong")) : "", contacts].filter(Boolean).join(" · ");
      return (
        `<div class="item"><div class="item-head"><span class="badge">${inlineGlyph(d.planet, INK, 18)}</span><span class="title">${esc(heading)}</span></div>` +
        (meta ? `<div class="item-meta">${meta}</div>` : "") +
        paras(d.text) +
        `</div>`
      );
    })
    .join("");
  return { title: t("reports.pdf.detailsTitle"), body: items };
}

function spotlightsChapter(data: TransitReportData, ctx: PdfContext): Chapter {
  const { t } = ctx;
  const byId = new Map(data.timeline.events.map((e) => [e.id, e]));
  const items = data.spotlights
    .map((s) => {
      const e = byId.get(s.eventId);
      const glyphs = e
        ? `${inlineGlyph(e.planet, INK, 15)}${e.aspect ? inlineGlyph(e.aspect, natureColor(e.nature), 12) : ""}${e.target ? inlineGlyph(e.target, INK, 15) : ""}`
        : inlineGlyph("Sun", GOLD, 15);
      return (
        `<div class="item"><div class="item-head"><span class="badge wide">${glyphs}</span><span class="title">${esc(s.title)}</span></div>` +
        (e ? `<div class="item-meta">${esc(labelOf(ctx, e))}</div>` : "") +
        paras(s.text) +
        `<div class="card gold keep"><h3 style="margin-top:0">${esc(t("reports.pdf.howToUse"))}</h3>${paras(s.howToUse)}</div></div>`
      );
    })
    .join("");
  return { title: t("reports.pdf.spotlightsTitle"), body: `<p class="lead">${esc(t("reports.pdf.spotlightsIntro"))}</p>${items}` };
}

/** Every month in [from, to] as "YYYY-MM". */
function monthsBetween(from: string, to: string): string[] {
  const out: string[] = [];
  let y = +from.slice(0, 4);
  let m = +from.slice(5, 7);
  const endKey = to.slice(0, 7);
  for (let guard = 0; guard < 48; guard++) {
    const key = `${y}-${String(m).padStart(2, "0")}`;
    out.push(key);
    if (key >= endKey) break;
    m += 1;
    if (m > 12) {
      m = 1;
      y += 1;
    }
  }
  return out;
}

function timelineChapter(data: TransitReportData, ctx: PdfContext): Chapter {
  const { t } = ctx;
  const sorted = [...data.timeline.events].sort((a, b) => a.start.localeCompare(b.start) || b.weight - a.weight);
  const months = monthsBetween(data.timeline.from, data.timeline.to)
    .map((ym) => {
      const events = sorted.filter((e) => e.start.slice(0, 7) === ym);
      const title = `${monthLong(ctx.locale, +ym.slice(5, 7))} ${ym.slice(0, 4)}`;
      const rows = events.length
        ? events
            .map((e) => {
              return (
                `<div class="ev"><span class="d">${esc(dayMonth(ctx, e.start))}</span><span class="dot" style="background:${eventColor(e)}"></span>` +
                `<span class="txt">${inlineGlyph(e.planet, INK, 12)} ${esc(rowLabel(ctx, e))}</span></div>`
              );
            })
            .join("")
        : `<div class="ev"><span class="txt muted">${esc(t("reports.pdf.noEvents"))}</span></div>`;
      return `<div class="month"><h3>${esc(title)}</h3>${rows}</div>`;
    })
    .join("");
  return { title: t("reports.pdf.timelineTitle"), body: `<p class="lead">${esc(t("reports.pdf.timelineIntro"))}</p>${months}` };
}

function quartersChapter(data: TransitReportData, ctx: PdfContext): Chapter {
  const { t } = ctx;
  const items = data.quarters
    .map(
      (q) =>
        `<div class="item"><h2>${esc(q.title)}</h2><div class="item-meta">${esc(shortDate(ctx, q.from))} → ${esc(shortDate(ctx, q.to))}</div>` +
        paras(q.text) +
        (q.focus.length
          ? `<div class="keep"><h3>${esc(t("reports.pdf.focus"))}</h3><div>${q.focus.map((f) => `<span class="chip">${esc(f)}</span>`).join("")}</div></div>`
          : "") +
        `</div>`,
    )
    .join("");
  return { title: t("reports.pdf.quartersTitle"), body: items };
}

function keyDatesChapter(data: TransitReportData, ctx: PdfContext): Chapter {
  const { t } = ctx;
  const list = (events: TimelineEvent[]) =>
    events.length
      ? `<table class="data"><tbody>${events
          .map(
            (e) =>
              `<tr><td style="width:30mm"><strong>${esc(shortDate(ctx, e.start))}</strong></td>` +
              `<td><span class="dot" style="display:inline-block;width:2.2mm;height:2.2mm;border-radius:50%;background:${eventColor(e)};margin-right:2mm"></span>` +
              `${inlineGlyph(e.planet, INK, 12)} ${esc(rowLabel(ctx, e))}</td></tr>`,
          )
          .join("")}</tbody></table>`
      : `<p class="muted">—</p>`;
  const sorted = [...data.timeline.events].sort((a, b) => a.start.localeCompare(b.start));
  const eclipses = sorted.filter((e) => e.kind === "eclipse");
  const stations = sorted.filter((e) => e.kind === "station");
  return {
    title: t("reports.pdf.keyDatesTitle"),
    body: `<h2>${esc(t("reports.pdf.eclipses"))}</h2>${list(eclipses)}<h2>${esc(t("reports.pdf.stations"))}</h2>${list(stations)}`,
  };
}
