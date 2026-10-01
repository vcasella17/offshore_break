import "dotenv/config";
import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SECRET_KEY;
const season = Number(process.env.MLB_SEASON ?? new Date().getFullYear());

if (!supabaseUrl || !supabaseKey) {
  throw new Error(
    "Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SECRET_KEY in .env.local"
  );
}

const supabase = createClient(supabaseUrl, supabaseKey);

const BATCH_SIZE = 500;
const API_DELAY_MS = 150;
const TEAM_IDS = Array.from({ length: 30 }, (_, index) => index + 108);

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function normalizePlayer(person) {
  return {
    id: person.id,
    name: person.fullName,
    team_id: person.currentTeam?.id
      ? String(person.currentTeam.id)
      : null,
    position: person.primaryPosition?.abbreviation ?? null,
  };
}

async function fetchJson(url) {
  const response = await fetch(url, {
    headers: {
      "User-Agent": "OffshoreBreak baseball data importer",
    },
  });

  if (!response.ok) {
    throw new Error(`MLB API error ${response.status}: ${url}`);
  }

  return response.json();
}

/**
 * Imports MLB's historical player directory, including former players.
 * The API is paginated, so it continues until there are no more results.
 */
async function fetchAllPlayers() {
  const players = new Map();
  const pageSize = 1000;
  let start = 0;

  while (true) {
    const url = new URL("https://statsapi.mlb.com/api/v1/people");
    url.searchParams.set("sportIds", "1");
    url.searchParams.set("hydrate", "currentTeam,primaryPosition");
    url.searchParams.set("limit", String(pageSize));
    url.searchParams.set("offset", String(start));

    const data = await fetchJson(url);
    const page = data.people ?? [];

    if (page.length === 0) break;

    for (const person of page) {
      if (person.id && person.fullName) {
        players.set(person.id, normalizePlayer(person));
      }
    }

    console.log(
      `Fetched ${players.size} players from MLB (${page.length} in this page)`
    );

    start += page.length;

    if (page.length < pageSize) break;

    await sleep(API_DELAY_MS);
  }

  return [...players.values()];
}

async function upsertInBatches(table, rows, conflictColumn) {
  for (let index = 0; index < rows.length; index += BATCH_SIZE) {
    const batch = rows.slice(index, index + BATCH_SIZE);

    const { error } = await supabase
      .from(table)
      .upsert(batch, { onConflict: conflictColumn });

    if (error) {
      throw new Error(
        `Failed to upsert ${table} batch ${index / BATCH_SIZE + 1}: ${error.message}`
      );
    }

    console.log(
      `Saved ${Math.min(index + batch.length, rows.length)} / ${rows.length} ${table} rows`
    );
  }
}

async function fetchSeasonStats(group, teamId) {
  const url = new URL("https://statsapi.mlb.com/api/v1/stats");
  url.searchParams.set("stats", "season");
  url.searchParams.set("group", group);
  url.searchParams.set("season", String(season));
  url.searchParams.set("sportIds", "1");
  url.searchParams.set("teamId", String(teamId));
  url.searchParams.set("limit", "1000");

  const data = await fetchJson(url);
  return (data.stats ?? []).flatMap((groupData) => groupData.splits ?? []);
}

function numberOrNull(value) {
  if (value === undefined || value === null || value === "") return null;

  const number = Number(value);
  return Number.isFinite(number) ? number : null;
}

function makeHittingRows(splits) {
  return splits
    .filter((split) => split.player?.id && split.team?.id)
    .map((split) => {
      const stat = split.stat ?? {};

      return {
        player_id: split.player.id,
        season,
        team_id: String(split.team.id),
        games: numberOrNull(stat.gamesPlayed),
        at_bats: numberOrNull(stat.atBats),
        hits: numberOrNull(stat.hits),
        home_runs: numberOrNull(stat.homeRuns),
        rbi: numberOrNull(stat.rbi),
        walks: numberOrNull(stat.baseOnBalls),
        strikeouts: numberOrNull(stat.strikeOuts),
        batting_avg: numberOrNull(stat.avg),
        obp: numberOrNull(stat.obp),
        slg: numberOrNull(stat.slg),
        ops: numberOrNull(stat.ops),
      };
    });
}

function makePitchingRows(splits) {
  return splits
    .filter((split) => split.player?.id && split.team?.id)
    .map((split) => {
      const stat = split.stat ?? {};

      return {
        player_id: split.player.id,
        season,
        team_id: String(split.team.id),
        innings_pitched: numberOrNull(stat.inningsPitched),
        wins: numberOrNull(stat.wins),
        losses: numberOrNull(stat.losses),
        earned_runs: numberOrNull(stat.earnedRuns),
        hits_allowed: numberOrNull(stat.hits),
        walks_allowed: numberOrNull(stat.baseOnBalls),
        strikeouts_pitched: numberOrNull(stat.strikeOuts),
        era: numberOrNull(stat.era),
        whip: numberOrNull(stat.whip),
      };
    });
}

async function ingestSeasonStats() {
  const hittingRows = [];
  const pitchingRows = [];

  for (const teamId of TEAM_IDS) {
    console.log(`Fetching ${season} stats for MLB team ${teamId}...`);

    const [hittingSplits, pitchingSplits] = await Promise.all([
      fetchSeasonStats("hitting", teamId),
      fetchSeasonStats("pitching", teamId),
    ]);

    hittingRows.push(...makeHittingRows(hittingSplits));
    pitchingRows.push(...makePitchingRows(pitchingSplits));

    await sleep(API_DELAY_MS);
  }

  console.log(`Collected ${hittingRows.length} hitting stat lines`);
  console.log(`Collected ${pitchingRows.length} pitching stat lines`);

  // The table should have one row per player, season, and team.
  // Upserting lets the hitting and pitching columns share the same row.
  const combinedRows = new Map();

  for (const row of [...hittingRows, ...pitchingRows]) {
    const key = `${row.player_id}-${row.season}-${row.team_id}`;
    combinedRows.set(key, {
      ...combinedRows.get(key),
      ...row,
    });
  }

  const rows = [...combinedRows.values()];

  if (rows.length > 0) {
    await upsertInBatches(
      "PlayerStats",
      rows,
      "player_id,season,team_id"
    );
  }
}

async function main() {
  console.log("Fetching MLB player directory...");

  const players = await fetchAllPlayers();

  if (players.length === 0) {
    throw new Error("MLB returned no players.");
  }

  console.log(`Found ${players.length} players. Saving to Supabase...`);

  await upsertInBatches("Player", players, "id");

  console.log("Player directory import complete.");

  console.log(`Importing ${season} hitting and pitching statistics...`);
  await ingestSeasonStats();

  console.log("MLB import completed successfully.");
}

main().catch((error) => {
  console.error("MLB import failed:", error);
  process.exitCode = 1;
});