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
const BATCH_SIZE = 500;

const MAX_RETRIES = 5;
const RETRY_DELAY_MS = 5000;

const seasonStart = `${SEASON}-01-01`;
const today = new Date().toISOString().slice(0, 10);

/* =========================================================
   DATE HELPERS
========================================================= */

function dateString(date) {
  return date.toISOString().slice(0, 10);
}

function addDays(date, days) {
  const result = new Date(`${date}T00:00:00Z`);
  result.setUTCDate(result.getUTCDate() + days);
  return dateString(result);
}

/* =========================================================
   VALUE HELPERS
========================================================= */

function numberOrNull(value) {
  if (value === "" || value == null) return null;

  const number = Number(value);

  return Number.isFinite(number) ? number : null;
}

function integerOrNull(value) {
  if (value === "" || value == null) return null;

  const number = Number(value);

  return Number.isInteger(number) ? number : null;
}

/* =========================================================
   RETRY HELPER
========================================================= */

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function fetchWithRetry(url, start, end) {
  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    try {
      console.log(
        `Fetching ${start} through ${end}...` +
          (attempt > 1
            ? ` retry ${attempt}/${MAX_RETRIES}`
            : "")
      );

      const response = await fetch(url, {
        headers: {
          "User-Agent":
            "Mozilla/5.0 (compatible; OffshoreBreak/1.0)",
          Accept: "text/csv,*/*",
        },
      });

      if (response.ok) {
        return await response.text();
      }

      console.log(
        `Baseball Savant returned HTTP ${response.status}`
      );

      if (
        attempt === MAX_RETRIES ||
        ![429, 500, 502, 503, 504].includes(response.status)
      ) {
        throw new Error(
          `Baseball Savant returned HTTP ${response.status}`
        );
      }
    } catch (error) {
      if (attempt === MAX_RETRIES) {
        throw error;
      }

      console.log(
        `Request failed. Waiting ${RETRY_DELAY_MS / 1000}s before retry...`
      );
    }

    await sleep(RETRY_DELAY_MS * attempt);
  }

  throw new Error("Request failed after all retries.");
}

/* =========================================================
   EVENT CLASSIFICATION
========================================================= */

const HIT_EVENTS = new Set([
  "single",
  "double",
  "triple",
  "home_run",
]);

function isHitEvent(event) {
  return HIT_EVENTS.has(event);
}

function isHomeRunEvent(event) {
  return event === "home_run";
}

/* =========================================================
   BUILD STATCAST URL
========================================================= */

function buildUrl(start, endExclusive) {
  const url = new URL(
    "https://baseballsavant.mlb.com/statcast_search/csv"
  );

  url.searchParams.set("all", "true");
  url.searchParams.set("type", "details");
  url.searchParams.set("player_type", "batter");
  url.searchParams.set("hfSea", `${SEASON}|`);
  url.searchParams.set("hfGT", "R|");
  url.searchParams.set("group_by", "name-year");

  /*
   * Baseball Savant's date filters are exclusive.
   *
   * Therefore:
   *
   * start = 2026-05-22
   * end   = 2026-05-23
   *
   * captures May 22.
   */
  url.searchParams.set("game_date_gt", start);
  url.searchParams.set("game_date_lt", endExclusive);

  url.searchParams.set("csv", "true");

  return url;
}

/* =========================================================
   BUILD INDIVIDUAL BATTED-BALL EVENT
========================================================= */

function buildBattedBallEvent(row) {
  const playerId = Number(row.batter);

  if (!Number.isInteger(playerId)) {
    return null;
  }

  const exitVelocity = numberOrNull(row.launch_speed);
  const launchAngle = numberOrNull(row.launch_angle);

  /*
   * Only keep actual batted balls.
   */
  const isBattedBall =
    exitVelocity !== null &&
    launchAngle !== null &&
    row.type === "X";

  if (!isBattedBall) {
    return null;
  }

  const gamePk = integerOrNull(row.game_pk);

  const atBatNumber = integerOrNull(
    row.at_bat_number
  );

  const pitchNumber = integerOrNull(
    row.pitch_number
  );

  /*
   * Baseball Savant event identifier.
   */
  const eventId = [
    gamePk ?? "unknown",
    atBatNumber ?? "unknown",
    pitchNumber ?? "unknown",
    playerId,
  ].join("-");

  const event = row.events || null;

  return {
    id: eventId,

    game_pk: gamePk,

    game_date:
      row.game_date || null,

    season: SEASON,

    player_id: playerId,

    pitcher_id:
      integerOrNull(row.pitcher),

    home_team_abbr:
      row.home_team || null,

    away_team_abbr:
      row.away_team || null,

    at_bat_number:
      atBatNumber,

    pitch_number:
      pitchNumber,

    inning:
      integerOrNull(row.inning),

    inning_topbot:
      row.inning_topbot || null,

    event,

    description:
      row.description || null,

    bb_type:
      row.bb_type || null,

    launch_speed:
      exitVelocity,

    launch_angle:
      launchAngle,

    hit_distance:
      numberOrNull(row.hit_distance_sc),

    hc_x:
      numberOrNull(row.hc_x),

    hc_y:
      numberOrNull(row.hc_y),

    estimated_ba:
      numberOrNull(
        row.estimated_ba_using_speedangle
      ),

    estimated_woba:
      numberOrNull(
        row.estimated_woba_using_speedangle
      ),

    estimated_slg:
      numberOrNull(
        row.estimated_slg_using_speedangle
      ),

    barrel:
      Number(row.launch_speed_angle) === 6,

    is_hit:
      isHitEvent(event),

    is_home_run:
      isHomeRunEvent(event),
  };
}

/* =========================================================
   MAIN IMPORT
========================================================= */

let start = seasonStart;

let totalRows = 0;
let totalBattedBalls = 0;
let totalHits = 0;
let totalDays = 0;

console.log("");
console.log("======================================");
console.log("OFFSHORE BREAK STATCAST IMPORT");
console.log("======================================");
console.log(`Season: ${SEASON}`);
console.log(`Starting: ${start}`);
console.log(`Through: ${today}`);
console.log("======================================");
console.log("");

while (start <= today) {
  /*
   * One-day window.
   *
   * If start = May 22,
   * endExclusive = May 23.
   */
  const endExclusive = addDays(start, 1);

  const url = buildUrl(
    start,
    endExclusive
  );

  const csv = await fetchWithRetry(
    url,
    start,
    start
  );

  const rows = parse(csv, {
    columns: true,
    skip_empty_lines: true,
    relax_column_count: true,
  });

  /*
   * Safety check against a malformed/truncated response.
   */
  if (rows.length >= 25000) {
    throw new Error(
      `Chunk ${start} returned ${rows.length} rows. Refusing to import possibly truncated data.`
    );
  }

  totalRows += rows.length;

  const events = [];

  for (const row of rows) {
    const event = buildBattedBallEvent(row);

    if (!event) {
      continue;
    }

    events.push(event);

    totalBattedBalls++;

    if (event.is_hit) {
      totalHits++;
    }
  }

  /*
   * Save THIS DAY immediately.
   *
   * If the next day fails, everything through this
   * day is already safely stored in Supabase.
   */
  if (events.length > 0) {
    for (
      let i = 0;
      i < events.length;
      i += BATCH_SIZE
    ) {
      const batch = events.slice(
        i,
        i + BATCH_SIZE
      );

      const { error } = await supabase
        .from("player_batted_ball_events")
        .upsert(batch, {
          onConflict: "id",
        });

      if (error) {
        throw new Error(
          `Batted-ball upsert failed for ${start}: ${error.message}`
        );
      }
    }
  }

  totalDays++;

  console.log(
    `✓ ${start} | ${rows.length.toLocaleString()} Statcast rows | ${events.length.toLocaleString()} batted balls`
  );

  /*
   * Move to the next day.
   */
  start = endExclusive;
}

/* =========================================================
   REBUILD SEASON-LEVEL STATCAST TABLE
========================================================= */

console.log("");
console.log("======================================");
console.log("REBUILDING SEASON STATCAST TOTALS");
console.log("======================================");

/*
 * Pull the individual events back from Supabase.
 *
 * This lets us rebuild player_statcast_season
 * from the exact same underlying event data.
 */

const allEvents = [];

for (let from = 0; ; from += 1000) {
  const { data, error } = await supabase
    .from("player_batted_ball_events")
    .select(
      `
        player_id,
        season,
        launch_speed,
        launch_angle,
        estimated_ba,
        estimated_slg,
        estimated_woba,
        barrel
      `
    )
    .eq("season", SEASON)
    .range(from, from + 999);

  if (error) {
    throw new Error(
      `Could not read batted-ball events: ${error.message}`
    );
  }

  if (!data || data.length === 0) {
    break;
  }

  allEvents.push(...data);

  if (data.length < 1000) {
    break;
  }
}

console.log(
  `Loaded ${allEvents.length.toLocaleString()} batted-ball events for aggregation.`
);

/* =========================================================
   AGGREGATE
========================================================= */

const totals = new Map();

for (const event of allEvents) {
  const playerId = Number(event.player_id);

  if (!Number.isInteger(playerId)) {
    continue;
  }

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

  if (event.launch_speed != null) {
    player.exitVelocities.push(
      Number(event.launch_speed)
    );

    if (Number(event.launch_speed) >= 95) {
      player.hardHits++;
    }
  }

  if (event.launch_angle != null) {
    player.launchAngles.push(
      Number(event.launch_angle)
    );
  }

  if (event.barrel) {
    player.barrels++;
  }

  if (event.estimated_ba != null) {
    player.xbaValues.push(
      Number(event.estimated_ba)
    );
  }

  if (event.estimated_slg != null) {
    player.xslgValues.push(
      Number(event.estimated_slg)
    );
  }

  if (event.estimated_woba != null) {
    player.xwobaValues.push(
      Number(event.estimated_woba)
    );
  }
}

function average(values) {
  return values.length
    ? values.reduce(
        (sum, value) => sum + value,
        0
      ) / values.length
    : null;
}

const records = [...totals.values()].map(
  (player) => ({
    player_id: player.player_id,

    season: SEASON,

    batted_ball_events:
      player.batted_ball_events,

    avg_exit_velocity:
      average(player.exitVelocities),

    max_exit_velocity:
      player.exitVelocities.length
        ? Math.max(
            ...player.exitVelocities
          )
        : null,

    hard_hit_rate:
      player.batted_ball_events > 0
        ? player.hardHits /
          player.batted_ball_events
        : null,

    barrel_rate:
      player.batted_ball_events > 0
        ? player.barrels /
          player.batted_ball_events
        : null,

    avg_launch_angle:
      average(player.launchAngles),

    xba:
      average(player.xbaValues),

    xslg:
      average(player.xslgValues),

    xwoba:
      average(player.xwobaValues),

    source: "baseball_savant",

    updated_at:
      new Date().toISOString(),
  })
);

/* =========================================================
   UPSERT SEASON TOTALS
========================================================= */

for (
  let i = 0;
  i < records.length;
  i += BATCH_SIZE
) {
  const batch = records.slice(
    i,
    i + BATCH_SIZE
  );

  const { error } = await supabase
    .from("player_statcast_season")
    .upsert(batch, {
      onConflict: "player_id,season",
    });

  if (error) {
    throw new Error(
      `Season aggregate upsert failed: ${error.message}`
    );
  }

  console.log(
    `Updated season stats ${Math.min(
      i + BATCH_SIZE,
      records.length
    ).toLocaleString()} / ${records.length.toLocaleString()}`
  );
}

/* =========================================================
   COMPLETE
========================================================= */

console.log("");
console.log("======================================");
console.log("STATCAST IMPORT COMPLETE");
console.log("======================================");

console.log(
  `Days processed: ${totalDays.toLocaleString()}`
);

console.log(
  `Statcast rows fetched: ${totalRows.toLocaleString()}`
);

console.log(
  `Batted-ball events: ${totalBattedBalls.toLocaleString()}`
);

console.log(
  `Hits: ${totalHits.toLocaleString()}`
);

console.log(
  `Players aggregated: ${records.length.toLocaleString()}`
);

console.log("======================================");
console.log("");