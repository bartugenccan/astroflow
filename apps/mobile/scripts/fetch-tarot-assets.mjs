#!/usr/bin/env node
/**
 * One-off: downloads the 78 Rider–Waite–Smith card scans (Pamela Colman Smith,
 * 1909 — public domain) from Wikimedia Commons into `assets/tarot/<id>.jpg`.
 * The downloaded files are committed; this script only exists so the set can be
 * re-created or re-sized. Run from anywhere: `node apps/mobile/scripts/fetch-tarot-assets.mjs`.
 *
 * Uses Commons' `Special:FilePath?width=` thumbnailer (a standard 500px step)
 * and a descriptive User-Agent, as Wikimedia's API etiquette asks. When ffmpeg
 * is on PATH each scan is re-encoded to 420px / q8 (~65 KB, ~5 MB for the deck);
 * `--compress-only` re-runs just that step on fresh 500px downloads (not twice —
 * each pass re-encodes the JPEG).
 */
import { mkdir, writeFile, stat, rename, unlink } from "node:fs/promises";
import { spawnSync } from "node:child_process";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const OUT_DIR = join(dirname(fileURLToPath(import.meta.url)), "..", "assets", "tarot");
const WIDTH = 500;
const UA = "AstroFlowAssetFetcher/1.0 (tarot deck import; contact: dev@astroflow.app)";

const MAJOR_FILES = [
  "RWS Tarot 00 Fool.jpg",
  "RWS Tarot 01 Magician.jpg",
  "RWS Tarot 02 High Priestess.jpg",
  "RWS Tarot 03 Empress.jpg",
  "RWS Tarot 04 Emperor.jpg",
  "RWS Tarot 05 Hierophant.jpg",
  "RWS Tarot 06 Lovers.jpg",
  "RWS Tarot 07 Chariot.jpg",
  "RWS Tarot 08 Strength.jpg",
  "RWS Tarot 09 Hermit.jpg",
  "RWS Tarot 10 Wheel of Fortune.jpg",
  "RWS Tarot 11 Justice.jpg",
  "RWS Tarot 12 Hanged Man.jpg",
  "RWS Tarot 13 Death.jpg",
  "RWS Tarot 14 Temperance.jpg",
  "RWS Tarot 15 Devil.jpg",
  "RWS Tarot 16 Tower.jpg",
  "RWS Tarot 17 Star.jpg",
  "RWS Tarot 18 Moon.jpg",
  "RWS Tarot 19 Sun.jpg",
  "RWS Tarot 20 Judgement.jpg",
  "RWS Tarot 21 World.jpg",
];

const SUIT_FILE_PREFIX = { wands: "Wands", cups: "Cups", swords: "Swords", pentacles: "Pents" };

function manifest() {
  const list = MAJOR_FILES.map((file, i) => ({
    id: `major_${String(i).padStart(2, "0")}`,
    file,
  }));
  for (const [suit, prefix] of Object.entries(SUIT_FILE_PREFIX)) {
    for (let r = 1; r <= 14; r++) {
      const nn = String(r).padStart(2, "0");
      list.push({ id: `${suit}_${nn}`, file: `${prefix}${nn}.jpg` });
    }
  }
  return list;
}

async function exists(path) {
  try {
    return (await stat(path)).size > 0;
  } catch {
    return false;
  }
}

async function download(file) {
  const url = `https://commons.wikimedia.org/wiki/Special:FilePath/${encodeURIComponent(file)}?width=${WIDTH}`;
  for (let attempt = 1; attempt <= 4; attempt++) {
    const res = await fetch(url, { headers: { "User-Agent": UA }, redirect: "follow" });
    if (res.ok) return Buffer.from(await res.arrayBuffer());
    if (res.status === 404) throw new Error("404 not found on Commons");
    await new Promise((r) => setTimeout(r, 1500 * attempt));
  }
  throw new Error("failed after retries");
}

const HAS_FFMPEG = spawnSync("ffmpeg", ["-version"], { stdio: "ignore" }).status === 0;

/** Re-encodes in place to 420px wide JPEG q8. Returns the new size in KB. */
async function compress(path) {
  const tmp = `${path}.tmp.jpg`;
  const r = spawnSync("ffmpeg", ["-v", "error", "-y", "-i", path, "-vf", "scale=420:-2", "-q:v", "8", tmp]);
  if (r.status !== 0) {
    await unlink(tmp).catch(() => {});
    throw new Error(`ffmpeg failed: ${r.stderr?.toString().trim()}`);
  }
  await rename(tmp, path);
  return Math.round((await stat(path)).size / 1024);
}

async function main() {
  const force = process.argv.includes("--force");
  const compressOnly = process.argv.includes("--compress-only");
  await mkdir(OUT_DIR, { recursive: true });
  if (!HAS_FFMPEG) console.log("ffmpeg not found — keeping the 500px originals uncompressed.");

  if (compressOnly) {
    if (!HAS_FFMPEG) return;
    for (const { id } of manifest()) {
      const out = join(OUT_DIR, `${id}.jpg`);
      if (await exists(out)) console.log(`${id.padEnd(13)} ${await compress(out)} KB`);
    }
    return;
  }

  const missing = [];
  for (const { id, file } of manifest()) {
    const out = join(OUT_DIR, `${id}.jpg`);
    if (!force && (await exists(out))) continue;
    try {
      const buf = await download(file);
      await writeFile(out, buf);
      const kb = HAS_FFMPEG ? await compress(out) : Math.round(buf.length / 1024);
      console.log(`ok   ${id.padEnd(13)} ${kb} KB  ← ${file}`);
    } catch (err) {
      missing.push(`${id} (${file}): ${err.message}`);
      console.log(`FAIL ${id.padEnd(13)} ${file}: ${err.message}`);
    }
    await new Promise((r) => setTimeout(r, 400));
  }
  if (missing.length) {
    console.log(`\n${missing.length} card(s) missing:\n  ${missing.join("\n  ")}`);
    process.exitCode = 1;
  } else {
    console.log("\nAll 78 cards present.");
  }
}

main();
