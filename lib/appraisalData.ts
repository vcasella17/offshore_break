import { supabase } from "@/lib/supabaseClient";
import { fetchAll } from "@/lib/baseball";
import type {
  PlayerLite,
  SeasonStat,
  TeamLite,
  WarRow,
} from "@/lib/appraisal";

/** Loads everything the Appraisal pages need. Safe if PlayerWar doesn't exist yet. */
export async function loadAppraisalContext() {
  const { data: latest } = await supabase
    .from("PlayerStats")
    .select("season")
    .order("season", { ascending: false })
    .limit(1)
    .maybeSingle();

  const season: number = latest?.season ?? new Date().getFullYear();

  const [players, stats, teamsResult] = await Promise.all([
    fetchAll<PlayerLite>((from, to) =>
      supabase
        .from("Player")
        .select("id, name, team_id, position")
        .order("id")
        .range(from, to)
    ),
    fetchAll<SeasonStat>((from, to) =>
      supabase
        .from("PlayerStats")
        .select("*")
        .eq("season", season)
        .order("player_id")
        .range(from, to)
    ),
    supabase.from("Teams").select("id, name, abbreviation"),
  ]);

  let warRows: WarRow[] = [];

  try {
    const raw = await fetchAll<{
      player_id: number;
      season: number;
      war: number | string | null;
      salary: number | string | null;
    }>((from, to) =>
      supabase
        .from("PlayerWar")
        .select("player_id, season, war, salary")
        .order("player_id")
        .order("season")
        .range(from, to)
    );

    warRows = raw.map((row) => ({
      player_id: Number(row.player_id),
      season: Number(row.season),
      war: row.war == null ? null : Number(row.war),
      salary: row.salary == null ? null : Number(row.salary),
    }));
  } catch (error) {
    console.warn("PlayerWar table unavailable (has it been created and imported?)", error);
  }

  return {
    season,
    players,
    stats,
    warRows,
    teams: (teamsResult.data ?? []) as TeamLite[],
    warAvailable: warRows.length > 0,
  };
}

/** Birth date from MLB's public people endpoint, used to age the projection. */
export async function getBirthDate(playerId: number): Promise<string | null> {
  try {
    const response = await fetch(
      `https://statsapi.mlb.com/api/v1/people/${playerId}`,
      { next: { revalidate: 86400 } }
    );
    if (!response.ok) return null;

    const data = await response.json();
    return data.people?.[0]?.birthDate ?? null;
  } catch {
    return null;
  }
}
