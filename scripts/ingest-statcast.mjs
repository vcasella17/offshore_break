import dotenv from "dotenv";
import { createClient } from "@supabase/supabase-js";
import { parse } from "csv-parse/sync";

dotenv.config({ path: ".env.local" });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SECRET_KEY;

if (!supabaseUrl || !supabaseKey) {
  throw new Error(
    "Set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SECRET_KEY in .env.local"
  );
}

const supabase = createClient(supabaseUrl, supabaseKey);

const SEASON = 2026;
const SOURCE = "baseball_savant";
const CHUNK_DAYS = 1;
const BATCH_SIZE = 500;
const today = new Date().toISOString().slice(0, 10);
const seasonStart = `${SEASON}-01-01`;

function dateString(date) {
  return date.toISOString().slice(0, 10);
}

function addDays(date, days) {
  const result = new Date(`${date}T00:00:00Z`);
  result.setUTCDate(result.getUTCDate() + days);
  return dateString(result);
}

function numberOrNull(value) {
  if (value === "" || value == null) return null;
  const number = Number(value);
  return Number.isFinite(number) ? number : null;
}

const totals = new Map();
let totalRows = 0;

for (let start = seasonStart; start <= today; ) {
  const end = [addDays(start, CHUNK_DAYS - 1), today].sort()[0];

  const url = new URL("https://baseballsavant.mlb.com/statcast_search/csv");
  url.searchParams.set("all", "true");
  url.searchParams.set("type", "details");
  url.searchParams.set("player_type", "batter");
  url.searchParams.set("hfSea", `${SEASON}|`);
  url.searchParams.set("hfGT", "R|");
  url.searchParams.set("group_by", "name-year");
  url.searchParams.set("game_date_gt", start);
  url.searchParams.set("game_date_lt", end);
  url.searchParams.set("csv", "true");

  console.log(`Fetching ${start} through ${end}...`);

  const response = await fetch(url, {
    headers: { "User-Agent": "Mozilla/5.0" },
  });

  if (!response.ok) {
    throw new Error(`Baseball Savant returned HTTP ${response.status}`);
  }

  const csv = await response.text();
  const rows = parse(csv, {
    columns: true,
    skip_empty_lines: true,
    relax_column_count: true,
  });

  // Refuse a possibly truncated chunk rather than import partial stats.
  if (rows.length >= 25000) {
    throw new Error(
      `Chunk ${start}–${end} returned ${rows.length} rows; reduce CHUNK_DAYS and rerun.`
    );
  }

  totalRows += rows.length;

  for (const row of rows) {
    const playerId = Number(row.batter);
    if (!Number.isInteger(playerId)) continue;

    const exitVelocity = numberOrNull(row.launch_speed);
    const launchAngle = numberOrNull(row.launch_angle);
    const xba = numberOrNull(row.estimated_ba_using_speedangle);
    const xslg = numberOrNull(row.estimated_slg_using_speedangle);
    const xwoba = numberOrNull(row.estimated_woba_using_speedangle);

    // Statcast pitch-level CSV repeats the same batted-ball outcome on
    // multiple rows only in unusual data cases. Count only actual batted balls.
    const isBattedBall =
      exitVelocity !== null &&
      launchAngle !== null &&
      row.type === "X";

    if (!isBattedBall) continue;

    let player = totals.get(playerId);
    if (!player) {
      player = {
        player_id: playerId,
        season: SEASON,
        batted_ball_events: 0,
        exitVelocities: [],
        launchAngles: [],
        hardHits: 0,
        barrels: 0,
        xbaValues: [],
        xslgValues: [],
        xwobaValues: [],
      };
      totals.set(playerId, player);
    }

    player.batted_ball_events++;
    player.exitVelocities.push(exitVelocity);
    player.launchAngles.push(launchAngle);
    if (exitVelocity >= 95) player.hardHits++;
    if (Number(row.launch_speed_angle) === 6) player.barrels++;
    if (xba !== null) player.xbaValues.push(xba);
    if (xslg !== null) player.xslgValues.push(xslg);
    if (xwoba !== null) player.xwobaValues.push(xwoba);
  }

  start = addDays(end, 1);
}

function average(values) {
  return values.length
    ? values.reduce((sum, value) => sum + value, 0) / values.length
    : null;
}

const records = [...totals.values()].map((player) => ({
  player_id: player.player_id,
  season: SEASON,
  batted_ball_events: player.batted_ball_events,
  avg_exit_velocity: average(player.exitVelocities),
  max_exit_velocity: Math.max(...player.exitVelocities),
  hard_hit_rate: player.hardHits / player.batted_ball_events,
  barrel_rate: player.barrels / player.batted_ball_events,
  avg_launch_angle: average(player.launchAngles),
  xba: average(player.xbaValues),
  xslg: average(player.xslgValues),
  xwoba: average(player.xwobaValues),
  source: SOURCE,
  updated_at: new Date().toISOString(),
}));

if (!records.length) {
  console.log("No batted-ball records found; nothing to upsert.");
  process.exit(0);
}

console.log(
  `Fetched ${totalRows} pitch/event rows; aggregated ${records.length} batters.`
);
console.log("Sample aggregate:", records[0]);

for (let i = 0; i < records.length; i += BATCH_SIZE) {
  const batch = records.slice(i, i + BATCH_SIZE);
  const { error } = await supabase
    .from("player_statcast_season")
    .upsert(batch, { onConflict: "player_id,season" });

  if (error) {
    throw new Error(`Supabase upsert failed: ${error.message}`);
  }

  console.log(`Upserted ${Math.min(i + BATCH_SIZE, records.length)} / ${records.length}`);
}

console.log("Import complete.");