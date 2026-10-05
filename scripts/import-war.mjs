/*
 * Loads WAR and salary into your Supabase "PlayerWar" table.
 *
 * Source: Baseball-Reference's published WAR files
 *   https://www.baseball-reference.com/data/war_daily_bat.txt
 *   https://www.baseball-reference.com/data/war_daily_pitch.txt
 *
 * Run from the project root:
 *   node --env-file=.env.local scripts/import-war.mjs
 *
 * If the download is blocked, save both files in your browser into
 *   scripts/data/war_daily_bat.txt
 *   scripts/data/war_daily_pitch.txt
 * and run the same command. The script uses local files when they exist.
 *
 * Check Sports Reference's data-use terms before using this on a public or
 * monetized site.
 */

import { createClient } from "@supabase/supabase-js";
import fs from "node:fs";
import path from "node:path";

const URLS = {
  bat: "https://www.baseball-reference.com/data/war_daily_bat.txt",
  pitch: "https://www.baseball-reference.com/data/war_daily_pitch.txt",
};

const LOCAL_DIR = path.join(process.cwd(), "scripts", "data");
const SEASONS_TO_KEEP = 5;
const BATCH_SIZE = 500;

const supabaseUrl =
  process.env.NEXT_PUBLIC_SUPABASE_URL ?? process.env.SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !serviceKey) {
  console.error(
    "\nMissing settings. Your .env.local needs:\n" +
      "  NEXT_PUBLIC_SUPABASE_URL=...\n" +
      "  SUPABASE_SERVICE_ROLE_KEY=...\n"
  );
  process.exit(1);
}

const supabase = createClient(supabaseUrl, serviceKey, {
  auth: { persistSession: false },
});

/* ───────────── Reading the files ───────────── */

async function loadText(kind) {
  const local = path.join(LOCAL_DIR, `war_daily_${kind}.txt`);

  if (fs.existsSync(local)) {
    console.log(`Using local file: ${local}`);
    return fs.readFileSync(local, "utf8");
  }

  console.log(`Downloading ${URLS[kind]} ...`);
  const response = await fetch(URLS[kind], {
    headers: { "User-Agent": "OffshoreBreak/1.0 (personal stats project)" },
  });

  if (!response.ok) {
    throw new Error(
      `Download failed (${response.status}). Save the file in your browser to ` +
        `scripts/data/war_daily_${kind}.txt and run this again.`
    );
  }

  return response.text();
}

/** Small CSV parser that understands quoted fields. */
function parseCsv(text) {
  const rows = [];
  let row = [];
  let field = "";
  let inQuotes = false;

  for (let i = 0; i < text.length; i++) {
    const char = text[i];

    if (inQuotes) {
      if (char === '"') {
        if (text[i + 1] === '"') {
          field += '"';
          i++;
        } else {
          inQuotes = false;
        }
      } else {
        field += char;
      }
    } else if (char === '"') {
      inQuotes = true;
    } else if (char === ",") {
      row.push(field);
      field = "";
    } else if (char === "\n") {
      row.push(field);
      rows.push(row);
      row = [];
      field = "";
    } else if (char !== "\r") {
      field += char;
    }
  }

  if (field.length > 0 || row.length > 0) {
    row.push(field);
    rows.push(row);
  }

  return rows;
}

function num(value) {
  if (value === undefined || value === null) return null;
  const trimmed = String(value).trim();
  if (trimmed === "" || trimmed.toUpperCase() === "NULL") return null;
  const parsed = Number(trimmed);
  return Number.isFinite(parsed) ? parsed : null;
}

/* ───────────── Combining hitting and pitching ───────────── */

const buckets = new Map();

function bucketFor(id, year) {
  const key = `${id}-${year}`;
  let bucket = buckets.get(key);

  if (!bucket) {
    bucket = { id, year, war: 0, hasWar: false, salary: null, pa: 0, ipOuts: 0 };
    buckets.set(key, bucket);
  }

  return bucket;
}

function ingest(rows, kind) {
  const header = rows[0];
  const col = Object.fromEntries(header.map((name, index) => [name.trim(), index]));

  for (const required of ["mlb_ID", "year_ID", "WAR"]) {
    if (col[required] === undefined) {
      throw new Error(`The ${kind} file is missing the "${required}" column.`);
    }
  }

  let used = 0;

  for (let r = 1; r < rows.length; r++) {
    const row = rows[r];
    if (row.length < header.length) continue;

    const id = num(row[col.mlb_ID]);
    const year = num(row[col.year_ID]);
    if (!id || !year) continue;

    const bucket = bucketFor(id, year);

    const war = num(row[col.WAR]);
    if (war !== null) {
      bucket.war += war;
      bucket.hasWar = true;
    }

    if (col.salary !== undefined) {
      const salary = num(row[col.salary]);
      if (salary !== null) bucket.salary = Math.max(bucket.salary ?? 0, salary);
    }

    if (kind === "bat" && col.PA !== undefined) {
      bucket.pa += num(row[col.PA]) ?? 0;
    }

    if (kind === "pitch" && col.IPouts !== undefined) {
      bucket.ipOuts += num(row[col.IPouts]) ?? 0;
    }

    used++;
  }

  console.log(`  ${kind}: read ${used.toLocaleString()} player-seasons`);
}

/* ───────────── Main ───────────── */

async function main() {
  const [batText, pitchText] = await Promise.all([
    loadText("bat"),
    loadText("pitch"),
  ]);

  console.log("Parsing...");
  ingest(parseCsv(batText), "bat");
  ingest(parseCsv(pitchText), "pitch");

  const all = [...buckets.values()].filter((b) => b.hasWar);
  const maxYear = Math.max(...all.map((b) => b.year));
  const minYear = maxYear - (SEASONS_TO_KEEP - 1);

  const rows = all
    .filter((b) => b.year >= minYear)
    .map((b) => ({
      player_id: b.id,
      season: b.year,
      war: Math.round(b.war * 100) / 100,
      salary: b.salary !== null ? Math.round(b.salary) : null,
      pa: b.pa || null,
      ip: b.ipOuts ? Math.round((b.ipOuts / 3) * 10) / 10 : null,
      source: "baseball-reference",
      updated_at: new Date().toISOString(),
    }));

  console.log(`\nUploading ${rows.length.toLocaleString()} rows (${minYear}-${maxYear})...`);

  for (let i = 0; i < rows.length; i += BATCH_SIZE) {
    const batch = rows.slice(i, i + BATCH_SIZE);
    const { error } = await supabase
      .from("PlayerWar")
      .upsert(batch, { onConflict: "player_id,season" });

    if (error) {
      console.error("\nUpload failed:", error.message);
      process.exit(1);
    }

    process.stdout.write(`  ${Math.min(i + BATCH_SIZE, rows.length)} / ${rows.length}\r`);
  }

  console.log("\n\nDone. Summary by season:");

  const bySeason = new Map();
  for (const row of rows) {
    const entry = bySeason.get(row.season) ?? { total: 0, withSalary: 0 };
    entry.total++;
    if (row.salary) entry.withSalary++;
    bySeason.set(row.season, entry);
  }

  for (const [season, entry] of [...bySeason.entries()].sort((a, b) => a[0] - b[0])) {
    console.log(
      `  ${season}: ${entry.total} players, ${entry.withSalary} with salary`
    );
  }

  console.log(
    "\nIf the latest season shows few players with salary, salary data for that " +
      "season may not be published yet. WAR will still work."
  );
}

main().catch((error) => {
  console.error("\n" + error.message);
  process.exit(1);
});