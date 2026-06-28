/*
 * build.mjs - Erzeugt browserspezifische Pakete (ohne externe Abhaengigkeiten).
 *
 *   node scripts/build.mjs            -> baut chrome + firefox nach dist/
 *   node scripts/build.mjs chrome     -> nur Chrome
 *   node scripts/build.mjs firefox    -> nur Firefox
 *
 * Quelle ist die gemeinsame Codebasis + manifest.json (MV3, Chrome-kompatibel).
 * Fuer Firefox wird das Manifest um browser_specific_settings ergaenzt.
 */
import { cp, mkdir, rm, readFile, writeFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const dist = join(root, "dist");

// Dateien/Ordner, die in jedes Paket kopiert werden.
const SHARED = ["icons", "popup", "welcome", "src", "_locales"];

// Firefox-Add-on-ID: frei waehlbar (E-Mail- oder UUID-Form). Hier stabil halten,
// damit Updates/Einstellungen erhalten bleiben.
const GECKO_ID = "yt-studio-ratio@daonware";
// MAIN-World-Content-Scripts gibt es erst ab Firefox 128.
const GECKO_MIN_VERSION = "128.0";

async function readManifest() {
  return JSON.parse(await readFile(join(root, "manifest.json"), "utf8"));
}

function toFirefoxManifest(base) {
  const m = structuredClone(base);
  m.browser_specific_settings = {
    gecko: {
      id: GECKO_ID,
      strict_min_version: GECKO_MIN_VERSION,
      // AMO verlangt eine ausdrueckliche Datenschutz-Deklaration. Diese
      // Erweiterung sammelt keinerlei Daten und sendet nichts an Dritte.
      data_collection_permissions: { required: ["none"] }
    }
  };
  // Firefox MV3 nutzt fuer den Hintergrund eine Event-Page (scripts) statt eines
  // service_worker. Den Chrome-Schluessel entsprechend umschreiben.
  if (m.background && m.background.service_worker) {
    m.background = { scripts: [m.background.service_worker] };
  }
  return m;
}

async function buildTarget(target) {
  const out = join(dist, target);
  await rm(out, { recursive: true, force: true });
  await mkdir(out, { recursive: true });

  for (const entry of SHARED) {
    await cp(join(root, entry), join(out, entry), { recursive: true });
  }

  const base = await readManifest();
  const manifest = target === "firefox" ? toFirefoxManifest(base) : base;
  await writeFile(join(out, "manifest.json"), JSON.stringify(manifest, null, 2) + "\n");

  console.log(`✓ ${target} -> ${out}`);
}

const targets = process.argv.slice(2);
const wanted = targets.length ? targets : ["chrome", "firefox"];
for (const t of wanted) {
  if (t !== "chrome" && t !== "firefox") {
    console.error(`Unbekanntes Ziel: ${t} (erlaubt: chrome, firefox)`);
    process.exit(1);
  }
  await buildTarget(t);
}
