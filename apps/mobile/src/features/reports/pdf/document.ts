import type { TranslationKey } from "../../../i18n";
import type { ReportBirth } from "../../../services/types";
import { reportCss } from "./reportStyles";
import { coverRingSvg } from "./wheelSvg";
import { PdfContext, esc, leadParas, longDate, paras, roman } from "./html";

/** One numbered chapter: its title (also the running header) and body HTML. */
export interface Chapter {
  title: string;
  body: string;
}

interface DocumentInput {
  ctx: PdfContext;
  /** The report's title, e.g. "Birth Chart Report". */
  title: string;
  name: string;
  /** Line under the title on the cover (birth details or the period). */
  coverSub: string;
  generatedAt: string;
  fontsCss: string;
  chapters: Chapter[];
}

/**
 * The whole printable document: navy cover, a contents page, then every
 * chapter as its own page-breaking table so the running header and footer
 * repeat on each printed page.
 */
export function reportDocument(input: DocumentInput): string {
  const { ctx, title, name, chapters } = input;
  const { t } = ctx;
  const runningHead = `${esc(name)} · ${esc(title)}`;

  const page = (head: string, body: string, first = false) =>
    `<table class="chapter${first ? " first" : ""}">` +
    `<thead><tr><td><div class="run-head"><span>${runningHead}</span><span>${head}</span></div></td></tr></thead>` +
    // The footer is spacing only: on a chapter's last page Chromium draws the
    // repeated <tfoot> right under the content, so any text there would float.
    `<tfoot><tr><td><div class="run-foot"></div></td></tr></tfoot>` +
    `<tbody><tr><td>${body}</td></tr></tbody></table>`;

  const contents = page(
    esc(t("reports.pdf.contents")),
    `<h1 class="ch-title">${esc(t("reports.pdf.contents"))}</h1><div class="rule"></div>` +
      `<ol class="toc">${chapters
        .map((c, i) => `<li><span class="num">${roman(i + 1)}</span><span class="t">${esc(c.title)}</span></li>`)
        .join("")}</ol>`,
    true,
  );

  const body = chapters
    .map((c, i) =>
      page(
        esc(c.title),
        `<div class="ch-num">${roman(i + 1)}</div><h1 class="ch-title">${esc(c.title)}</h1><div class="rule"></div>${c.body}`,
      ),
    )
    .join("");

  const cover =
    `<section class="cover">` +
    `<div class="brand">ASTROFLOW</div>` +
    `<div class="ring">${coverRingSvg(250)}</div>` +
    `<div class="kicker">${esc(t("reports.pdf.preparedFor"))}</div>` +
    `<div class="name">${esc(name)}</div>` +
    `<h1>${esc(title)}</h1>` +
    `<div class="sub">${esc(input.coverSub)}</div>` +
    `<div class="date">${esc(t("reports.pdf.preparedOn", { date: longDate(ctx, input.generatedAt) }))}</div>` +
    `</section>`;

  return (
    `<!DOCTYPE html><html lang="${ctx.locale}"><head><meta charset="utf-8">` +
    `<meta name="viewport" content="width=device-width, initial-scale=1">` +
    `<title>${esc(title)} — ${esc(name)}</title><style>${reportCss(input.fontsCss)}</style></head>` +
    `<body>${cover}${contents}${body}</body></html>`
  );
}

/** "Born 12 June 1994 at 14:30 · İstanbul" (or the unknown-time variant). */
export function birthLine(ctx: PdfContext, birth: ReportBirth): string {
  const place = birth.placeName?.trim() || coordinates(birth.latitude, birth.longitude);
  const date = longDate(ctx, birth.birthDate);
  return birth.unknownTime
    ? ctx.t("reports.pdf.bornNoTime", { date, place })
    : ctx.t("reports.pdf.born", { date, time: birth.birthTime, place });
}

function coordinates(lat: number, lng: number): string {
  const ns = lat >= 0 ? "N" : "S";
  const ew = lng >= 0 ? "E" : "W";
  return `${Math.abs(lat).toFixed(2)}°${ns}, ${Math.abs(lng).toFixed(2)}°${ew}`;
}

type GlossaryTerm = "natalChart" | "planet" | "sign" | "house" | "aspect" | "orb" | "retrograde" | "transit";

/**
 * "Before you read": the glossary's own plain-language definitions for the
 * terms the report leans on, so the PDF stands on its own away from the app.
 */
export function beforeYouRead(ctx: PdfContext, terms: GlossaryTerm[], howTo: string, extraNote?: string): Chapter {
  const { t } = ctx;
  const key = (term: GlossaryTerm, field: "title" | "short" | "what") => `glossary.terms.${term}.${field}` as TranslationKey;
  const body =
    `<p class="lead">${esc(t("reports.pdf.beforeIntro"))}</p>` +
    (extraNote ? `<div class="note">${esc(extraNote)}</div>` : "") +
    `<div class="card gold keep"><h3 style="margin-top:0">${esc(t("reports.pdf.howToRead"))}</h3>${paras(howTo)}</div>` +
    terms
      .map(
        (term) =>
          `<div class="item"><h2>${esc(t(key(term, "title")))}</h2>` +
          `<p><strong>${esc(t(key(term, "short")))}</strong></p>${paras(t(key(term, "what")))}</div>`,
      )
      .join("");
  return { title: t("reports.pdf.beforeTitle"), body };
}

export function disclaimer(ctx: PdfContext, closing?: string): Chapter {
  const { t } = ctx;
  return {
    title: closing ? t("reports.pdf.closingTitle") : t("reports.pdf.disclaimerTitle"),
    body:
      (closing ? leadParas(closing) : "") +
      `<h2>${esc(t("reports.pdf.disclaimerTitle"))}</h2>${paras(t("reports.pdf.disclaimer"))}` +
      `<p class="muted small" style="margin-top:8mm;text-align:center">${esc(t("reports.pdf.madeWith"))}</p>`,
  };
}
