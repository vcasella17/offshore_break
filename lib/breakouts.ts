import { supabase } from "@/lib/supabaseClient";

const CURRENT_SEASON = 2026;
const PREVIOUS_SEASON = 2025;

type Player = {
  id: number;
  name: string;
  team_id: string | null;
  position: string | null;
};

type Team = {
  id: string;
  name: string;
  abbreviation: string;
};

type PlayerStat = {
  player_id: number;
  season: number;
  games: number | null;
  at_bats: number | null;
  hits: number | null;
  home_runs: number | null;
  rbi: number | null;
  walks: number | null;
  strikeouts: number | null;
  batting_avg: number | null;
  obp: number | null;
  slg: number | null;
  ops: number | null;
};

type StatcastSeason = {
  player_id: number;
  season: number;
  batted_ball_events: number | null;
  avg_exit_velocity: number | null;
  max_exit_velocity: number | null;
  hard_hit_rate: number | null;
  barrel_rate: number | null;
  avg_launch_angle: number | null;
  xba: number | null;
  xslg: number | null;
  xwoba: number | null;
};

export type BreakoutPlayer = {
  rank: number;
  player: Player;
  team: Team | undefined;

  score: number;

  contactScore: number;
  expectedScore: number;
  trendScore: number;
  opportunityScore: number;
  developmentScore: number;

  current: PlayerStat;
  previous: PlayerStat | null;
  statcast: StatcastSeason;

  reasons: string[];
};

async function fetchAll<T>(
  table: string,
  select: string,
  filters: { column: string; value: string | number }[] = []
): Promise<T[]> {
  const rows: T[] = [];
  const pageSize = 1000;

  for (let start = 0; ; start += pageSize) {
    let query = supabase
      .from(table)
      .select(select)
      .range(start, start + pageSize - 1);

    for (const filter of filters) {
      query = query.eq(filter.column, filter.value);
    }

    const { data, error } = await query;

    if (error) {
      throw new Error(`${table}: ${error.message}`);
    }

    const page = (data ?? []) as T[];

    rows.push(...page);

    if (page.length < pageSize) {
      break;
    }
  }

  return rows;
}

function clamp(value: number, min = 0, max = 100) {
  return Math.max(min, Math.min(max, value));
}

function percentile(
  value: number | null,
  values: number[]
): number {
  if (value === null || values.length === 0) return 50;

  const valid = values.filter(Number.isFinite).sort((a, b) => a - b);

  if (valid.length === 0) return 50;

  const below = valid.filter((item) => item < value).length;

  return (below / valid.length) * 100;
}

function safe(value: number | null | undefined) {
  return value ?? 0;
}

function calculateBreakoutScore(
  current: PlayerStat,
  previous: PlayerStat | null,
  statcast: StatcastSeason,
  leagueStatcast: StatcastSeason[],
  leagueCurrent: PlayerStat[]
) {
  const hardHitValues = leagueStatcast
    .map((row) => row.hard_hit_rate)
    .filter((value): value is number => value !== null);

  const barrelValues = leagueStatcast
    .map((row) => row.barrel_rate)
    .filter((value): value is number => value !== null);

  const exitVelocityValues = leagueStatcast
    .map((row) => row.avg_exit_velocity)
    .filter((value): value is number => value !== null);

  const xwobaValues = leagueStatcast
    .map((row) => row.xwoba)
    .filter((value): value is number => value !== null);

  const xslgValues = leagueStatcast
    .map((row) => row.xslg)
    .filter((value): value is number => value !== null);

  const contactScore = clamp(
    percentile(statcast.hard_hit_rate, hardHitValues) * 0.35 +
      percentile(statcast.barrel_rate, barrelValues) * 0.35 +
      percentile(statcast.avg_exit_velocity, exitVelocityValues) * 0.15 +
      percentile(statcast.max_exit_velocity, leagueStatcast
        .map((row) => row.max_exit_velocity)
        .filter((value): value is number => value !== null)
      ) * 0.15
  );

  const xwobaPercentile = percentile(statcast.xwoba, xwobaValues);
  const xslgPercentile = percentile(statcast.xslg, xslgValues);

  const expectedScore = clamp(
    xwobaPercentile * 0.55 +
      xslgPercentile * 0.45
  );

  const opsTrend =
    previous?.ops !== null &&
    previous?.ops !== undefined &&
    current.ops !== null &&
    current.ops !== undefined
      ? current.ops - previous.ops
      : 0;

  const xslgGap =
    statcast.xslg !== null &&
    current.slg !== null
      ? statcast.xslg - current.slg
      : 0;

  const xbaGap =
    statcast.xba !== null &&
    current.batting_avg !== null
      ? statcast.xba - current.batting_avg
      : 0;

  const trendScore = clamp(
    50 +
      opsTrend * 250 +
      xslgGap * 100 +
      xbaGap * 100
  );

  const atBats = current.at_bats ?? 0;
  const games = current.games ?? 0;

  const opportunityScore = clamp(
    percentile(
      atBats,
      leagueCurrent
        .map((row) => row.at_bats)
        .filter((value): value is number => value !== null)
    ) * 0.7 +
      percentile(
        games,
        leagueCurrent
          .map((row) => row.games)
          .filter((value): value is number => value !== null)
      ) * 0.3
  );

  const developmentScore = clamp(
    50 +
      (previous?.ops !== null &&
      previous?.ops !== undefined &&
      current.ops !== null &&
      current.ops !== undefined
        ? (current.ops - previous.ops) * 300
        : 0)
  );

  const score = Math.round(
    contactScore * 0.30 +
      expectedScore * 0.30 +
      trendScore * 0.20 +
      opportunityScore * 0.10 +
      developmentScore * 0.10
  );

  return {
    score: clamp(score),
    contactScore: Math.round(contactScore),
    expectedScore: Math.round(expectedScore),
    trendScore: Math.round(trendScore),
    opportunityScore: Math.round(opportunityScore),
    developmentScore: Math.round(developmentScore),
  };
}

function buildReasons(
  current: PlayerStat,
  previous: PlayerStat | null,
  statcast: StatcastSeason
) {
  const reasons: string[] = [];

  if (
    statcast.xslg !== null &&
    current.slg !== null &&
    statcast.xslg - current.slg >= 0.025
  ) {
    reasons.push(
      `His ${statcast.xslg.toFixed(3)} expected slugging percentage is above his actual ${current.slg.toFixed(3)} mark.`
    );
  }

  if (
    statcast.xwoba !== null &&
    statcast.xwoba >= 0.350
  ) {
    reasons.push(
      `His underlying contact quality produced a ${statcast.xwoba.toFixed(3)} xwOBA.`
    );
  }

  if (
    statcast.hard_hit_rate !== null &&
    statcast.hard_hit_rate >= 0.40
  ) {
    reasons.push(
      `${(statcast.hard_hit_rate * 100).toFixed(1)}% of his batted balls were hit at 95+ mph.`
    );
  }

  if (
    statcast.barrel_rate !== null &&
    statcast.barrel_rate >= 0.08
  ) {
    reasons.push(
      `His ${(statcast.barrel_rate * 100).toFixed(1)}% barrel rate points to legitimate power.`
    );
  }

  if (
    previous?.ops !== null &&
    previous?.ops !== undefined &&
    current.ops !== null &&
    current.ops !== undefined &&
    current.ops - previous.ops >= 0.050
  ) {
    reasons.push(
      `His OPS improved by ${(current.ops - previous.ops).toFixed(3)} year over year.`
    );
  }

  if (reasons.length === 0) {
    reasons.push(
      "His underlying contact profile suggests there may be more production ahead."
    );
  }

  return reasons.slice(0, 3);
}

export async function getBreakoutBoard(): Promise<BreakoutPlayer[]> {
  const [players, teams, currentStats, previousStats, currentStatcast] =
    await Promise.all([
      fetchAll<Player>(
        "Player",
        "id, name, team_id, position"
      ),

      fetchAll<Team>(
        "Teams",
        "id, name, abbreviation"
      ),

      fetchAll<PlayerStat>(
        "PlayerStats",
        "player_id, season, games, at_bats, hits, home_runs, rbi, walks, strikeouts, batting_avg, obp, slg, ops",
        [
          { column: "season", value: CURRENT_SEASON },
        ]
      ),

      fetchAll<PlayerStat>(
        "PlayerStats",
        "player_id, season, games, at_bats, hits, home_runs, rbi, walks, strikeouts, batting_avg, obp, slg, ops",
        [
          { column: "season", value: PREVIOUS_SEASON },
        ]
      ),

      fetchAll<StatcastSeason>(
        "player_statcast_season",
        "player_id, season, batted_ball_events, avg_exit_velocity, max_exit_velocity, hard_hit_rate, barrel_rate, avg_launch_angle, xba, xslg, xwoba",
        [
          { column: "season", value: CURRENT_SEASON },
        ]
      ),
    ]);

  const teamMap = new Map(
    teams.map((team) => [team.id, team])
  );

  const previousMap = new Map(
    previousStats.map((stat) => [stat.player_id, stat])
  );

  const currentMap = new Map(
    currentStats.map((stat) => [stat.player_id, stat])
  );

  const statcastMap = new Map(
    currentStatcast.map((row) => [row.player_id, row])
  );

  /*
   * We intentionally focus on players who are still
   * developing rather than established stars.
   *
   * Minimum:
   * 75 AB
   * 50 Statcast batted-ball events
   *
   * Maximum:
   * 550 AB
   *
   * We also remove players already producing an elite
   * .950+ OPS because the question is "who is next?"
   */
  const candidates = currentStats.filter((stat) => {
    const statcast = statcastMap.get(stat.player_id);

    if (!statcast) return false;

    const atBats = stat.at_bats ?? 0;
    const battedBalls = statcast.batted_ball_events ?? 0;

    if (atBats < 75) return false;
    if (battedBalls < 50) return false;

    if (stat.ops !== null && stat.ops >= 0.950) {
      return false;
    }

    return true;
  });

  const scored = candidates
    .map((current) => {
      const previous = previousMap.get(current.player_id) ?? null;
      const statcast = statcastMap.get(current.player_id)!;

      const scoring = calculateBreakoutScore(
        current,
        previous,
        statcast,
        currentStatcast,
        currentStats
      );

      const player = players.find(
        (item) => item.id === current.player_id
      );

      if (!player) return null;

      return {
        rank: 0,
        player,
        team: player.team_id
          ? teamMap.get(player.team_id)
          : undefined,

        ...scoring,

        current,
        previous,
        statcast,

        reasons: buildReasons(
          current,
          previous,
          statcast
        ),
      };
    })
    .filter((row): row is BreakoutPlayer => row !== null)
    .sort((a, b) => b.score - a.score)
    .slice(0, 25)
    .map((row, index) => ({
      ...row,
      rank: index + 1,
    }));

  return scored;
}