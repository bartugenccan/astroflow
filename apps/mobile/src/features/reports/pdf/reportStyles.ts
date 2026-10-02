export interface EmbeddedFont {
  family: "Cormorant" | "Manrope";
  weight: number;
  style: "normal" | "italic";
  base64: string;
}

/** `@font-face` rules with the TTFs inlined, so the PDF looks the same offline. */
export function fontFaceCss(fonts: EmbeddedFont[]): string {
  return fonts
    .map(
      (f) =>
        `@font-face{font-family:"${f.family}";font-weight:${f.weight};font-style:${f.style};` +
        `src:url(data:font/ttf;base64,${f.base64}) format("truetype");}`,
    )
    .join("\n");
}

/**
 * Print stylesheet for the PDF reports: A4, cream paper, ink text, gold rules,
 * a navy cover. `@page` margins are zero so the cream reaches the paper edge
 * (WebKit and Chromium paint page margins white); each chapter is a table
 * whose <thead>/<tfoot> repeat on every printed page, which gives the running
 * header, footer and top/bottom margins on both iOS and Android.
 */
export function reportCss(fontsCss: string): string {
  return `${fontsCss}
@page { size: A4; margin: 0; }
* { box-sizing: border-box; }
html, body {
  margin: 0; padding: 0;
  background: #FBF8F1; color: #1B1F33;
  -webkit-print-color-adjust: exact; print-color-adjust: exact;
}
body {
  font-family: "Manrope", "Helvetica Neue", Arial, sans-serif;
  font-size: 10.2pt; line-height: 1.62;
  -webkit-font-smoothing: antialiased;
}
.serif { font-family: "Cormorant", "Cormorant Garamond", Georgia, serif; }

/* ── Cover ─────────────────────────────────────────────────────────────── */
.cover {
  width: 210mm; height: 296mm; overflow: hidden; position: relative;
  background: #1B1F33;
  background-image: radial-gradient(circle at 50% 38%, #2A3150 0%, #1B1F33 58%, #141729 100%);
  color: #F3ECDC; text-align: center;
  display: flex; flex-direction: column; align-items: center; justify-content: center;
  padding: 22mm 22mm 26mm;
  page-break-after: always; break-after: page;
}
.cover::before {
  content: ""; position: absolute; inset: 9mm;
  border: 0.6pt solid rgba(217, 182, 111, 0.55); border-radius: 3mm;
}
.cover .brand { font-weight: 700; font-size: 8pt; letter-spacing: 0.42em; color: #D9B66F; margin-bottom: 14mm; }
.cover .ring { margin-bottom: 14mm; opacity: 0.95; }
.cover .kicker { font-size: 8pt; letter-spacing: 0.3em; text-transform: uppercase; color: #C9B892; }
.cover .name { font-family: "Cormorant", Georgia, serif; font-weight: 600; font-size: 34pt; line-height: 1.1; margin: 2mm 0 8mm; color: #FFFFFF; }
.cover h1 { font-family: "Cormorant", Georgia, serif; font-style: italic; font-weight: 500; font-size: 22pt; color: #D9B66F; margin: 0 0 4mm; }
.cover .sub { font-size: 9pt; color: #C9C3B4; max-width: 130mm; }
.cover .date { position: absolute; bottom: 17mm; left: 0; right: 0; font-size: 8pt; letter-spacing: 0.18em; text-transform: uppercase; color: #A79B7E; }

/* ── Chapters ──────────────────────────────────────────────────────────── */
table.chapter { width: 100%; border-collapse: collapse; page-break-before: always; break-before: page; }
table.chapter.first { page-break-before: auto; break-before: auto; }
table.chapter > thead > tr > td, table.chapter > tfoot > tr > td, table.chapter > tbody > tr > td { padding: 0 19mm; }
.run-head {
  height: 17mm; padding-bottom: 2.4mm; margin-bottom: 5mm;
  display: flex; align-items: flex-end; justify-content: space-between;
  font-size: 7pt; font-weight: 700; letter-spacing: 0.16em; text-transform: uppercase; color: #B08A3E;
  border-bottom: 0.5pt solid rgba(176, 138, 62, 0.45);
}
.run-foot {
  height: 15mm; padding-top: 5mm;
  font-size: 7pt; letter-spacing: 0.12em; text-transform: uppercase; color: #9A968C; text-align: center;
}
.ch-num { font-size: 8pt; font-weight: 700; letter-spacing: 0.3em; color: #B08A3E; margin-top: 3mm; }
h1.ch-title { font-family: "Cormorant", Georgia, serif; font-weight: 600; font-size: 29pt; line-height: 1.08; margin: 1.5mm 0 0; }
.rule { width: 26mm; height: 1.2pt; background: #B08A3E; margin: 5mm 0 7mm; }
h2 { font-family: "Cormorant", Georgia, serif; font-weight: 600; font-size: 17pt; line-height: 1.2; margin: 8mm 0 2.5mm; page-break-after: avoid; break-after: avoid; }
h3 { font-size: 8pt; font-weight: 700; letter-spacing: 0.14em; text-transform: uppercase; color: #B08A3E; margin: 6mm 0 2mm; page-break-after: avoid; break-after: avoid; }
p { margin: 0 0 3.2mm; text-align: justify; orphans: 3; widows: 3; }
.lead { font-family: "Cormorant", Georgia, serif; font-style: italic; font-weight: 500; font-size: 14.5pt; line-height: 1.42; color: #3A3D52; text-align: left; }
.muted { color: #6B6A75; }
.small { font-size: 8.6pt; }
.keep { page-break-inside: avoid; break-inside: avoid; }
.with-next { page-break-after: avoid; break-after: avoid; }

/* ── Blocks ────────────────────────────────────────────────────────────── */
.card {
  background: #FFFFFF; border: 0.6pt solid rgba(176, 138, 62, 0.38); border-radius: 3.5mm;
  padding: 5mm 6mm 2.5mm; margin: 0 0 5mm;
}
.card.gold { background: #FFF8E9; }
.note { border-left: 1.5pt solid #B08A3E; padding: 1mm 0 1mm 4mm; margin: 0 0 5mm; color: #3A3D52; font-size: 9.4pt; }
.item { margin: 0 0 6mm; }
.item-head { display: flex; align-items: center; gap: 2.5mm; margin: 7mm 0 1mm; page-break-after: avoid; break-after: avoid; page-break-inside: avoid; break-inside: avoid; }
.item-head .title { font-family: "Cormorant", Georgia, serif; font-weight: 600; font-size: 16pt; line-height: 1.15; }
.item-meta { font-size: 8.4pt; color: #6B6A75; letter-spacing: 0.02em; margin-bottom: 2.5mm; page-break-after: avoid; break-after: avoid; }
.badge {
  display: inline-flex; align-items: center; justify-content: center;
  width: 9mm; height: 9mm; border-radius: 50%; background: #FFFFFF; border: 0.6pt solid rgba(176, 138, 62, 0.5); flex-shrink: 0;
}
.badge.wide { width: auto; padding: 0 2.5mm; border-radius: 4.5mm; gap: 0.8mm; }
.chip {
  display: inline-block; padding: 0.5mm 2.4mm; margin: 0 1.4mm 1.4mm 0; border-radius: 3mm;
  font-size: 7.8pt; font-weight: 600; background: #F3ECDC; color: #5B4A26;
}
.grid2 { display: flex; flex-wrap: wrap; gap: 0 6mm; }
.grid2 > * { width: calc(50% - 3mm); }
.grid3 { display: flex; gap: 4mm; margin: 0 0 5mm; }
.grid3 > * { flex: 1; }
.stat { background: #FFFFFF; border: 0.6pt solid rgba(176, 138, 62, 0.38); border-radius: 3.5mm; padding: 4mm; text-align: center; }
.stat .label { font-size: 7pt; font-weight: 700; letter-spacing: 0.16em; text-transform: uppercase; color: #B08A3E; }
.stat .value { font-family: "Cormorant", Georgia, serif; font-weight: 600; font-size: 17pt; line-height: 1.2; margin-top: 1.5mm; }
.g { display: inline-block; vertical-align: -2.5px; }
.gtext { font-size: 8pt; font-weight: 700; }
.wheel-wrap { width: 150mm; margin: 0 auto 2mm; }
.caption { text-align: center; font-size: 8.2pt; color: #6B6A75; margin: 0 0 6mm; }
.legend { text-align: center; font-size: 7.8pt; color: #6B6A75; margin: -3mm 0 6mm; }
.legend i { display: inline-block; width: 6mm; height: 1.4pt; vertical-align: middle; margin: 0 1.5mm 0 4mm; }

/* ── Tables ────────────────────────────────────────────────────────────── */
table.data { width: 100%; border-collapse: collapse; font-size: 8.8pt; margin: 1mm 0 6mm; }
table.data th {
  text-align: left; font-size: 7pt; font-weight: 700; letter-spacing: 0.12em; text-transform: uppercase;
  color: #B08A3E; border-bottom: 0.8pt solid #B08A3E; padding: 1.4mm 2mm;
}
table.data td { border-bottom: 0.4pt solid rgba(27, 31, 51, 0.12); padding: 1.5mm 2mm; vertical-align: middle; }
table.data tr { page-break-inside: avoid; break-inside: avoid; }
table.data td.num, table.data th.num { text-align: right; font-variant-numeric: tabular-nums; }
.retro { color: #B0553F; font-weight: 700; }

/* ── Balance bars ──────────────────────────────────────────────────────── */
.bars { margin: 0 0 4mm; }
.bar-row { display: flex; align-items: center; gap: 3mm; margin: 0 0 2mm; font-size: 8.6pt; }
.bar-row .name { width: 22mm; }
.bar-row .n { width: 6mm; text-align: right; color: #6B6A75; }
.bar { flex: 1; height: 2.4mm; background: rgba(176, 138, 62, 0.16); border-radius: 2mm; overflow: hidden; }
.bar > i { display: block; height: 100%; background: #B08A3E; border-radius: 2mm; }

/* ── Contents ──────────────────────────────────────────────────────────── */
ol.toc { list-style: none; margin: 4mm 0 0; padding: 0; }
ol.toc li { display: flex; align-items: baseline; gap: 4mm; padding: 3.2mm 0; border-bottom: 0.4pt solid rgba(176, 138, 62, 0.3); }
ol.toc .num { width: 10mm; font-weight: 700; font-size: 8pt; letter-spacing: 0.2em; color: #B08A3E; }
ol.toc .t { font-family: "Cormorant", Georgia, serif; font-weight: 600; font-size: 15pt; }

/* ── Timeline ──────────────────────────────────────────────────────────── */
.month { margin: 0 0 4mm; }
.month h3 { margin-top: 5mm; }
.ev { display: flex; gap: 3mm; padding: 1.6mm 0; border-bottom: 0.4pt solid rgba(27, 31, 51, 0.1); font-size: 8.8pt; page-break-inside: avoid; break-inside: avoid; }
.ev .d { width: 17mm; flex-shrink: 0; font-weight: 700; font-variant-numeric: tabular-nums; }
.ev .dot { width: 2.2mm; height: 2.2mm; border-radius: 50%; margin-top: 1.6mm; flex-shrink: 0; }
.ev .txt { flex: 1; }
`;
}
