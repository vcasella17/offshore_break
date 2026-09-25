import Link from "next/link";
import { notFound } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";

type Team = {
  id: string;
  name: string;
  abbreviation: string;
};

type Player = {
  id: number;
  name: string;
  team_id: string | null;
  position: string | null;
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

  innings_pitched: number | null;
  wins: number | null;
  losses: number | null;
  earned_runs: number | null;
  hits_allowed: number | null;
  walks_allowed: number | null;
  strikeouts_pitched: number | null;
  era: number | null;
  whip: number | null;
};

type MlbDivision = {
  id: number;
  name: string;
  league?: {
    id: number;
    name: string;
    abbreviation?: string;
  };
};

type MlbTeam = {
  id: number;
  name: string;
  abbreviation?: string;
  teamName?: string;
  shortName?: string;
  division?: MlbDivision;
  league?: {
    id: number;
    name: string;
    abbreviation?: string;
  };
};

type MlbStanding = {
  team: {
    id: number;
    name: string;
  };
  wins?: number;
  losses?: number;
  divisionRank?: string;
  gamesBack?: string;
};

function teamLogo(teamId: number | string) {
  return `https://www.mlbstatic.com/team-logos/${teamId}.svg`;
}

function headshot(playerId: number) {
  return `https://img.mlbstatic.com/mlb-photos/image/upload/w_500,q_auto:good/v1/people/${playerId}/headshot/67/current`;
}

function formatAverage(value: number | null | undefined) {
  if (value === null || value === undefined) {
    return "—";
  }

  return value.toFixed(3).replace(/^0/, "");
}

function formatDecimal(value: number | null | undefined) {
  if (value === null || value === undefined) {
    return "—";
  }

  return value.toFixed(3);
}

function formatNumber(value: number | null | undefined) {
  if (value === null || value === undefined) {
    return "—";
  }

  return value.toLocaleString();
}

function formatInnings(value: number | null | undefined) {
  if (value === null || value === undefined) {
    return "—";
  }

  return value.toFixed(1);
}

function ordinal(value: string | undefined) {
  if (!value) return "";

  if (value === "1") return "1st";
  if (value === "2") return "2nd";
  if (value === "3") return "3rd";

  return `${value}th`;
}

/* ============================================================ */
/* MLB DATA */
/* ============================================================ */

async function getMlbTeam(teamId: string): Promise<MlbTeam | null> {
  try {
    const response = await fetch(
      `https://statsapi.mlb.com/api/v1/teams/${teamId}?hydrate=division,league,venue`,
      {
        next: {
          revalidate: 300,
        },
      }
    );

    if (!response.ok) {
      return null;
    }

    const data = await response.json();

    return data.teams?.[0] ?? null;
  } catch {
    return null;
  }
}

async function getTeamStanding(
  teamId: string
): Promise<MlbStanding | null> {
  const season = new Date().getFullYear();

  try {
    const response = await fetch(
      `https://statsapi.mlb.com/api/v1/standings?leagueId=103,104&season=${season}&standingsTypes=regularSeason`,
      {
        next: {
          revalidate: 300,
        },
      }
    );

    if (!response.ok) {
      return null;
    }

    const data = await response.json();

    for (const record of data.records ?? []) {
      const found = (record.teamRecords ?? []).find(
        (team: MlbStanding) =>
          String(team.team.id) === String(teamId)
      );

      if (found) {
        return found;
      }
    }

    return null;
  } catch {
    return null;
  }
}

/* ============================================================ */
/* PAGE */
/* ============================================================ */

export default async function TeamPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const currentSeason = new Date().getFullYear();

  /*
   * Load everything simultaneously.
   */

  const [
    { data: teamData },
    { data: playersData },
    { data: statsData },
    mlbTeam,
    standing,
  ] = await Promise.all([
    supabase
      .from("Teams")
      .select("id, name, abbreviation")
      .eq("id", id)
      .single(),

    supabase
      .from("Player")
      .select("id, name, team_id, position")
      .eq("team_id", id)
      .order("name"),

    supabase
      .from("PlayerStats")
      .select(
        [
          "player_id",
          "season",
          "games",
          "at_bats",
          "hits",
          "home_runs",
          "rbi",
          "walks",
          "strikeouts",
          "batting_avg",
          "obp",
          "slg",
          "ops",
          "innings_pitched",
          "wins",
          "losses",
          "earned_runs",
          "hits_allowed",
          "walks_allowed",
          "strikeouts_pitched",
          "era",
          "whip",
        ].join(", ")
      )
      .eq("season", currentSeason),

    getMlbTeam(id),

    getTeamStanding(id),
  ]);

  /*
   * If the team does not exist in Supabase,
   * return the Next.js 404 page.
   */

  if (!teamData) {
    notFound();
  }

  const team = teamData as Team;
  const players = (playersData ?? []) as Player[];
  const stats = (statsData ?? []) as unknown as PlayerStat[];

  /*
   * Map stats by player ID.
   */

  const statMap = new Map<number, PlayerStat>();

  for (const stat of stats) {
    statMap.set(stat.player_id, stat);
  }

  /*
   * Only players actually belonging to this team.
   */

  const roster = players.filter(
    (player) => String(player.team_id) === String(id)
  );

  /*
   * Separate hitters and pitchers.
   */

  const hitters = roster.filter((player) => {
    const stat = statMap.get(player.id);

    return (
      (stat?.at_bats ?? 0) >= 10 &&
      (stat?.games ?? 0) >= 3
    );
  });

  const pitchers = roster.filter((player) => {
    const stat = statMap.get(player.id);

    return (stat?.innings_pitched ?? 0) > 0;
  });

  /*
   * Top hitter by OPS.
   */

  const topHitter = [...hitters]
    .filter((player) => {
      return statMap.get(player.id)?.ops !== null;
    })
    .sort(
      (a, b) =>
        (statMap.get(b.id)?.ops ?? -Infinity) -
        (statMap.get(a.id)?.ops ?? -Infinity)
    )[0];

  /*
   * Top pitcher by ERA.
   */

  const topPitcher = [...pitchers]
    .filter((player) => {
      return statMap.get(player.id)?.era !== null;
    })
    .sort(
      (a, b) =>
        (statMap.get(a.id)?.era ?? Infinity) -
        (statMap.get(b.id)?.era ?? Infinity)
    )[0];

  /*
   * Aggregate team statistics.
   */

  const teamHits = hitters.reduce(
    (total, player) =>
      total + (statMap.get(player.id)?.hits ?? 0),
    0
  );

  const teamHomeRuns = hitters.reduce(
    (total, player) =>
      total + (statMap.get(player.id)?.home_runs ?? 0),
    0
  );

  const teamRbi = hitters.reduce(
    (total, player) =>
      total + (statMap.get(player.id)?.rbi ?? 0),
    0
  );

  const teamAtBats = hitters.reduce(
    (total, player) =>
      total + (statMap.get(player.id)?.at_bats ?? 0),
    0
  );

  /*
   * Team batting average calculated from total hits / total AB.
   */

  const teamAverage =
    teamAtBats > 0 ? teamHits / teamAtBats : null;

  return (
    <main className="min-h-screen bg-[#F8F3EA] text-[#1A2842]">
      {/* ====================================================== */}
      {/* TEAM HERO */}
      {/* ====================================================== */}

      <section className="border-b border-[#1A2842]/15">
        <div className="mx-auto max-w-[1440px] px-6 py-12 md:px-10 md:py-16">
          <div className="grid items-center gap-10 lg:grid-cols-[1fr_auto]">
            {/* TEAM IDENTITY */}

            <div className="flex items-center gap-7">
              <div className="flex h-28 w-28 shrink-0 items-center justify-center border border-[#1A2842]/15 bg-[#F8F3EA] md:h-32 md:w-32">
                <img
                  src={teamLogo(team.id)}
                  alt={`${team.name} logo`}
                  className="h-24 w-24 object-contain md:h-28 md:w-28"
                />
              </div>

              <div className="min-w-0">
                <p className="text-[10px] font-black uppercase tracking-[0.24em] text-[#D85F46]">
                  {mlbTeam?.division?.name ??
                    mlbTeam?.league?.name ??
                    "Major League Baseball"}
                </p>

                <h1 className="mt-2 text-4xl font-black tracking-[-0.055em] md:text-6xl">
                  {team.name}
                </h1>

                <div className="mt-3 flex flex-wrap items-center gap-3 text-sm text-[#687384]">
                  <span>{team.abbreviation}</span>

                  <span className="h-1 w-1 rounded-full bg-[#D85F46]" />

                  <span>
                    {standing
                      ? `${standing.wins}-${standing.losses}`
                      : "—"}
                  </span>

                  {standing?.divisionRank && (
                    <>
                      <span className="h-1 w-1 rounded-full bg-[#D85F46]" />

                      <span>
                        {ordinal(standing.divisionRank)} in{" "}
                        {mlbTeam?.division?.name ??
                          "division"}
                      </span>
                    </>
                  )}
                </div>
              </div>
            </div>

            {/* QUICK STATS */}

            <div className="grid grid-cols-2 border border-[#1A2842]/15 md:grid-cols-3">
              <div className="px-6 py-5">
                <p className="text-[8px] font-black uppercase tracking-[0.18em] text-[#687384]">
                  Roster
                </p>

                <p className="mt-2 font-mono text-2xl font-black">
                  {roster.length}
                </p>
              </div>

              <div className="border-l border-[#1A2842]/15 px-6 py-5">
                <p className="text-[8px] font-black uppercase tracking-[0.18em] text-[#687384]">
                  Season
                </p>

                <p className="mt-2 font-mono text-2xl font-black">
                  {currentSeason}
                </p>
              </div>

              <div className="hidden border-l border-[#1A2842]/15 px-6 py-5 md:block">
                <p className="text-[8px] font-black uppercase tracking-[0.18em] text-[#687384]">
                  Record
                </p>

                <p className="mt-2 font-mono text-2xl font-black">
                  {standing
                    ? `${standing.wins}-${standing.losses}`
                    : "—"}
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ====================================================== */}
      {/* TEAM NAVIGATION */}
      {/* ====================================================== */}

      <div className="border-b border-[#1A2842]/15 bg-[#101A2C] text-white">
        <div className="mx-auto flex max-w-[1440px] overflow-x-auto px-5 md:px-10">
          <a
            href="#roster"
            className="border-b-2 border-[#D85F46] px-5 py-4 text-[9px] font-black uppercase tracking-[0.18em]"
          >
            Roster
          </a>

          <a
            href="#snapshot"
            className="border-b-2 border-transparent px-5 py-4 text-[9px] font-black uppercase tracking-[0.18em] text-white/40 transition hover:text-white"
          >
            Snapshot
          </a>

          <Link
            href="/teams"
            className="ml-auto px-5 py-4 text-[9px] font-black uppercase tracking-[0.18em] text-white/40 transition hover:text-white"
          >
            All Teams →
          </Link>
        </div>
      </div>

      {/* ====================================================== */}
      {/* ROSTER */}
      {/* ====================================================== */}

      <section
        id="roster"
        className="mx-auto max-w-[1440px] px-6 py-12 md:px-10 md:py-16"
      >
        <div className="flex items-end justify-between border-b border-[#1A2842]/20 pb-4">
          <div>
            <p className="text-[9px] font-black uppercase tracking-[0.22em] text-[#D85F46]">
              {team.abbreviation} · {currentSeason}
            </p>

            <h2 className="mt-1 text-3xl font-black tracking-[-0.04em]">
              Roster
            </h2>
          </div>

          <p className="font-mono text-[9px] text-[#687384]">
            {roster.length} PLAYERS
          </p>
        </div>

        {/* TABLE */}

        <div className="mt-6 overflow-hidden border border-[#1A2842]/15">
          {/* TABLE HEADER */}

          <div className="hidden grid-cols-[60px_minmax(280px,1fr)_80px_80px_80px_90px_90px_90px] border-b border-[#1A2842]/15 bg-[#F1EADF] px-5 py-3 md:grid">
            <p className="text-[8px] font-black uppercase tracking-[0.16em] text-[#687384]">
              #
            </p>

            <p className="text-[8px] font-black uppercase tracking-[0.16em] text-[#687384]">
              Player
            </p>

            <p className="text-center text-[8px] font-black uppercase tracking-[0.16em] text-[#687384]">
              Pos
            </p>

            <p className="text-center text-[8px] font-black uppercase tracking-[0.16em] text-[#687384]">
              G
            </p>

            <p className="text-center text-[8px] font-black uppercase tracking-[0.16em] text-[#687384]">
              HR
            </p>

            <p className="text-center text-[8px] font-black uppercase tracking-[0.16em] text-[#687384]">
              AVG
            </p>

            <p className="text-center text-[8px] font-black uppercase tracking-[0.16em] text-[#687384]">
              OPS
            </p>

            <p className="text-center text-[8px] font-black uppercase tracking-[0.16em] text-[#687384]">
              RBI
            </p>
          </div>

          {/* PLAYERS */}

          {roster.map((player, index) => {
            const stat = statMap.get(player.id);

            return (
              <Link
                key={player.id}
                href={`/players/${player.id}`}
                className="group block border-b border-[#1A2842]/10 px-5 py-5 transition last:border-b-0 hover:bg-[#F1EADF]"
              >
                {/* DESKTOP ROW */}

                <div className="hidden grid-cols-[60px_minmax(280px,1fr)_80px_80px_80px_90px_90px_90px] items-center md:grid">
                  <span className="font-mono text-[10px] text-[#687384]">
                    {index + 1}
                  </span>

                  <div className="flex min-w-0 items-center gap-4">
                    <div className="h-10 w-10 shrink-0 overflow-hidden bg-[#E9E1D5]">
                      <img
                        src={headshot(player.id)}
                        alt=""
                        className="h-full w-full object-contain"
                      />
                    </div>

                    <div className="min-w-0">
                      <p className="truncate text-[14px] font-black transition group-hover:text-[#D85F46]">
                        {player.name}
                      </p>

                      <p className="mt-1 text-[8px] font-black uppercase tracking-[0.16em] text-[#687384]">
                        {player.position ?? "—"}
                      </p>
                    </div>
                  </div>

                  <p className="text-center font-mono text-[11px] font-black text-[#687384]">
                    {player.position ?? "—"}
                  </p>

                  <p className="text-center font-mono text-[11px] font-black">
                    {stat?.games ?? "—"}
                  </p>

                  <p className="text-center font-mono text-[11px] font-black">
                    {stat?.home_runs ?? "—"}
                  </p>

                  <p className="text-center font-mono text-[11px] font-black">
                    {formatAverage(stat?.batting_avg)}
                  </p>

                  <p className="text-center font-mono text-[11px] font-black">
                    {formatDecimal(stat?.ops)}
                  </p>

                  <p className="text-center font-mono text-[11px] font-black">
                    {stat?.rbi ?? "—"}
                  </p>
                </div>

                {/* MOBILE ROW */}

                <div className="md:hidden">
                  <div className="flex items-center gap-4">
                    <div className="h-12 w-12 shrink-0 overflow-hidden bg-[#E9E1D5]">
                      <img
                        src={headshot(player.id)}
                        alt=""
                        className="h-full w-full object-contain"
                      />
                    </div>

                    <div className="min-w-0">
                      <p className="truncate text-[15px] font-black group-hover:text-[#D85F46]">
                        {player.name}
                      </p>

                      <p className="mt-1 text-[8px] font-black uppercase tracking-[0.16em] text-[#687384]">
                        {player.position ?? "—"}
                      </p>
                    </div>

                    <span className="ml-auto text-[#1A2842]/20 transition group-hover:translate-x-1 group-hover:text-[#D85F46]">
                      →
                    </span>
                  </div>

                  <div className="mt-5 grid grid-cols-5 border-t border-[#1A2842]/10 pt-4">
                    <div>
                      <p className="font-mono text-sm font-black">
                        {stat?.games ?? "—"}
                      </p>

                      <p className="mt-1 text-[7px] font-black uppercase tracking-[0.12em] text-[#687384]">
                        G
                      </p>
                    </div>

                    <div>
                      <p className="font-mono text-sm font-black">
                        {stat?.home_runs ?? "—"}
                      </p>

                      <p className="mt-1 text-[7px] font-black uppercase tracking-[0.12em] text-[#687384]">
                        HR
                      </p>
                    </div>

                    <div>
                      <p className="font-mono text-sm font-black">
                        {formatAverage(stat?.batting_avg)}
                      </p>

                      <p className="mt-1 text-[7px] font-black uppercase tracking-[0.12em] text-[#687384]">
                        AVG
                      </p>
                    </div>

                    <div>
                      <p className="font-mono text-sm font-black">
                        {formatDecimal(stat?.ops)}
                      </p>

                      <p className="mt-1 text-[7px] font-black uppercase tracking-[0.12em] text-[#687384]">
                        OPS
                      </p>
                    </div>

                    <div>
                      <p className="font-mono text-sm font-black">
                        {stat?.rbi ?? "—"}
                      </p>

                      <p className="mt-1 text-[7px] font-black uppercase tracking-[0.12em] text-[#687384]">
                        RBI
                      </p>
                    </div>
                  </div>
                </div>
              </Link>
            );
          })}

          {/* EMPTY STATE */}

          {roster.length === 0 && (
            <div className="px-6 py-16 text-center">
              <p className="text-sm font-black">
                No roster data available.
              </p>

              <p className="mt-2 text-xs text-[#687384]">
                Player assignments have not been loaded for this
                team yet.
              </p>
            </div>
          )}
        </div>
      </section>

      {/* ====================================================== */}
      {/* TEAM SNAPSHOT */}
      {/* ====================================================== */}

      <section
        id="snapshot"
        className="mx-auto max-w-[1440px] px-6 pb-16 md:px-10"
      >
        <div className="mb-6 border-b border-[#1A2842]/20 pb-4">
          <p className="text-[9px] font-black uppercase tracking-[0.22em] text-[#59B3AD]">
            Team Data
          </p>

          <h2 className="mt-1 text-3xl font-black tracking-[-0.04em]">
            Season Snapshot
          </h2>
        </div>

        <div className="grid border-l border-t border-[#1A2842]/15 md:grid-cols-3">
          {/* RECORD */}

          <div className="border-b border-r border-[#1A2842]/15 p-7">
            <p className="text-[8px] font-black uppercase tracking-[0.18em] text-[#687384]">
              Record
            </p>

            <p className="mt-4 font-mono text-4xl font-black">
              {standing
                ? `${standing.wins}-${standing.losses}`
                : "—"}
            </p>

            <p className="mt-2 text-[9px] text-[#687384]">
              {standing?.gamesBack
                ? `${standing.gamesBack} GB`
                : "Current season"}
            </p>
          </div>

          {/* TOP HITTER */}

          <div className="border-b border-r border-[#1A2842]/15 p-7">
            <p className="text-[8px] font-black uppercase tracking-[0.18em] text-[#687384]">
              Top Performer
            </p>

            {topHitter ? (
              <>
                <Link
                  href={`/players/${topHitter.id}`}
                  className="mt-4 block text-2xl font-black tracking-[-0.03em] hover:text-[#D85F46]"
                >
                  {topHitter.name}
                </Link>

                <p className="mt-2 font-mono text-[10px] text-[#687384]">
                  OPS{" "}
                  {formatDecimal(
                    statMap.get(topHitter.id)?.ops
                  )}
                </p>
              </>
            ) : (
              <p className="mt-4 text-2xl font-black">
                —
              </p>
            )}
          </div>

          {/* TOP PITCHER */}

          <div className="border-b border-r border-[#1A2842]/15 p-7">
            <p className="text-[8px] font-black uppercase tracking-[0.18em] text-[#687384]">
              Top Pitcher
            </p>

            {topPitcher ? (
              <>
                <Link
                  href={`/players/${topPitcher.id}`}
                  className="mt-4 block text-2xl font-black tracking-[-0.03em] hover:text-[#D85F46]"
                >
                  {topPitcher.name}
                </Link>

                <p className="mt-2 font-mono text-[10px] text-[#687384]">
                  ERA{" "}
                  {statMap.get(topPitcher.id)?.era?.toFixed(2) ??
                    "—"}
                </p>
              </>
            ) : (
              <p className="mt-4 text-2xl font-black">
                —
              </p>
            )}
          </div>

          {/* TEAM HITS */}

          <div className="border-b border-r border-[#1A2842]/15 p-7">
            <p className="text-[8px] font-black uppercase tracking-[0.18em] text-[#687384]">
              Team Hits
            </p>

            <p className="mt-4 font-mono text-4xl font-black">
              {formatNumber(teamHits)}
            </p>

            <p className="mt-2 text-[9px] text-[#687384]">
              Aggregate PlayerStats
            </p>
          </div>

          {/* TEAM HR */}

          <div className="border-b border-r border-[#1A2842]/15 p-7">
            <p className="text-[8px] font-black uppercase tracking-[0.18em] text-[#687384]">
              Home Runs
            </p>

            <p className="mt-4 font-mono text-4xl font-black">
              {formatNumber(teamHomeRuns)}
            </p>

            <p className="mt-2 text-[9px] text-[#687384]">
              Aggregate PlayerStats
            </p>
          </div>

          {/* TEAM AVG */}

          <div className="border-b border-r border-[#1A2842]/15 p-7">
            <p className="text-[8px] font-black uppercase tracking-[0.18em] text-[#687384]">
              Batting Average
            </p>

            <p className="mt-4 font-mono text-4xl font-black">
              {formatAverage(teamAverage)}
            </p>

            <p className="mt-2 text-[9px] text-[#687384]">
              Hits / At Bats
            </p>
          </div>

          {/* TEAM RBI */}

          <div className="border-b border-r border-[#1A2842]/15 p-7">
            <p className="text-[8px] font-black uppercase tracking-[0.18em] text-[#687384]">
              RBI
            </p>

            <p className="mt-4 font-mono text-4xl font-black">
              {formatNumber(teamRbi)}
            </p>

            <p className="mt-2 text-[9px] text-[#687384]">
              Aggregate PlayerStats
            </p>
          </div>

          {/* ROSTER */}

          <div className="border-b border-r border-[#1A2842]/15 p-7">
            <p className="text-[8px] font-black uppercase tracking-[0.18em] text-[#687384]">
              Roster Size
            </p>

            <p className="mt-4 font-mono text-4xl font-black">
              {roster.length}
            </p>

            <p className="mt-2 text-[9px] text-[#687384]">
              Players in database
            </p>
          </div>

          {/* SEASON */}

          <div className="border-b border-r border-[#1A2842]/15 p-7">
            <p className="text-[8px] font-black uppercase tracking-[0.18em] text-[#687384]">
              Season
            </p>

            <p className="mt-4 font-mono text-4xl font-black">
              {currentSeason}
            </p>

            <p className="mt-2 text-[9px] text-[#687384]">
              Offshore Break data
            </p>
          </div>
        </div>
      </section>

      {/* ====================================================== */}
      {/* FOOTER CTA */}
      {/* ====================================================== */}

      <section className="border-t border-[#1A2842]/15 bg-[#1A2842] text-white">
        <div className="mx-auto flex max-w-[1440px] flex-col justify-between gap-8 px-6 py-12 md:flex-row md:items-center md:px-10">
          <div>
            <p className="text-[9px] font-black uppercase tracking-[0.2em] text-[#59B3AD]">
              Offshore Break
            </p>

            <h3 className="mt-2 text-3xl font-black tracking-[-0.04em]">
              Explore the rest of the league.
            </h3>
          </div>

          <Link
            href="/teams"
            className="inline-flex w-fit border border-white/20 px-6 py-3 text-[9px] font-black uppercase tracking-[0.18em] transition hover:border-[#D85F46] hover:bg-[#D85F46]"
          >
            All Teams →
          </Link>
        </div>
      </section>
    </main>
  );
}
