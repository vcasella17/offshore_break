import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabaseClient";

type SprayChartRow = {
  id: string;
  game_pk: number;
  game_date: string | null;
  home_team_abbr: string | null;
  away_team_abbr: string | null;
  event: string | null;
  bb_type: string | null;
  launch_speed: number | string | null;
  launch_angle: number | string | null;
  hit_distance: number | string | null;
  hc_x: number | string | null;
  hc_y: number | string | null;
  is_home_run: boolean | null;
};

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);

  const playerId = Number(searchParams.get("playerId"));
  const season = Number(searchParams.get("season") ?? 2026);

  if (!Number.isInteger(playerId) || playerId <= 0) {
    return NextResponse.json(
      { error: "Invalid playerId" },
      { status: 400 }
    );
  }

  if (!Number.isInteger(season) || season <= 0) {
    return NextResponse.json(
      { error: "Invalid season" },
      { status: 400 }
    );
  }

  const { data, error } = await supabase
    .from("player_batted_ball_events")
    .select(
      `
        id,
        game_pk,
        game_date,
        home_team_abbr,
        away_team_abbr,
        event,
        bb_type,
        launch_speed,
        launch_angle,
        hit_distance,
        hc_x,
        hc_y,
        is_home_run
      `
    )
    .eq("player_id", playerId)
    .eq("season", season)
    .eq("is_hit", true)
    .not("hc_x", "is", null)
    .not("hc_y", "is", null)
    .order("game_date", { ascending: false });

  if (error) {
    console.error("Spray chart query failed:", error);

    return NextResponse.json(
      { error: "Failed to load spray chart data" },
      { status: 500 }
    );
  }

  /*
   * Supabase currently does not have generated database types for
   * player_batted_ball_events, so explicitly tell TypeScript what
   * each returned row looks like.
   */
  const rows = (data ?? []) as unknown as SprayChartRow[];

  const events = rows
    .filter(
      (row) =>
        row.hc_x !== null &&
        row.hc_y !== null &&
        Number.isFinite(Number(row.hc_x)) &&
        Number.isFinite(Number(row.hc_y))
    )
    .map((row) => ({
      id: row.id,
      gamePk: row.game_pk,
      gameDate: row.game_date,
      homeTeam: row.home_team_abbr,
      awayTeam: row.away_team_abbr,
      event: row.event,
      bbType: row.bb_type,

      launchSpeed:
        row.launch_speed === null ? null : Number(row.launch_speed),

      launchAngle:
        row.launch_angle === null ? null : Number(row.launch_angle),

      hitDistance:
        row.hit_distance === null ? null : Number(row.hit_distance),

      hcX: Number(row.hc_x),
      hcY: Number(row.hc_y),

      isHomeRun: Boolean(row.is_home_run),
    }));

  return NextResponse.json({
    playerId,
    season,
    count: events.length,
    events,
  });
}