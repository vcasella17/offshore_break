import Link from "next/link";
import { supabase } from "@/lib/supabaseClient";

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

type ProfileAttribute = {
  label: string;
  value: number | null;
  percentile: number;
  display: string;
  accent: "orange" | "teal" | "blue";
};

function formatAverage(value: number | null) {
  if (value === null) return "-";
  return value.toFixed(3).replace(/^0/, "");
}

function formatNumber(value: number | null) {
  if (value === null) return "-";
  return value.toLocaleString();
}

function formatDecimal(value: number | null) {
  if (value === null) return "-";
  return value.toFixed(3);
}

function formatInnings(value: number | null) {
  if (value === null) return "-";
  return value.toFixed(1);
}

function percentile(
  value: number | null,
  population: number[],
  higherIsBetter = true
) {
  if (value === null || population.length === 0) return 0;

  const valid = population.filter((v) => Number.isFinite(v));

  if (valid.length === 0) return 0;

  const betterCount = higherIsBetter
    ? valid.filter((v) => v < value).length
    : valid.filter((v) => v > value).length;

  return Math.max(
    1,
    Math.min(99, Math.round((betterCount / valid.length) * 100))
  );
}

function buildPopulation(
  stats: PlayerStat[],
  getValue: (stat: PlayerStat) => number | null
) {
  return stats
    .map(getValue)
    .filter((value): value is number => value !== null && Number.isFinite(value));
}

function Headshot({ playerId }: { playerId: number }) {
  return (
    <img
      src={`https://img.mlbstatic.com/mlb-photos/image/upload/w_500,q_auto:good/v1/people/${playerId}/headshot/67/current`}
      alt=""
      className="h-full w-full object-contain"
    />
  );
}

function TeamLogo({ teamId }: { teamId: string }) {
  return (
    <img
      src={`https://www.mlbstatic.com/team-logos/${teamId}.svg`}
      alt=""
      className="h-10 w-10 object-contain"
    />
  );
}

function AttributeBar({
  attribute,
}: {
  attribute: ProfileAttribute;
}) {
  const fillClass =
    attribute.accent === "orange"
      ? "bg-[#D85F46]"
      : attribute.accent === "teal"
        ? "bg-[#59B3AD]"
        : "bg-[#5C82C4]";

  return (
    <div className="group">
      <div className="mb-2 flex items-end justify-between">
        <div>
          <p className="text-[10px] font-black uppercase tracking-[0.18em] text-white/60">
            {attribute.label}
          </p>
        </div>

        <div className="flex items-baseline gap-2">
          <span className="text-lg font-black text-white">
            {attribute.percentile}
          </span>
          <span className="text-[9px] font-bold uppercase tracking-wider text-white/40">
            PCTL
          </span>
        </div>
      </div>

      <div className="relative h-3 overflow-hidden bg-white/[0.08]">
        <div
          className={`absolute inset-y-0 left-0 transition-all duration-500 ${fillClass}`}
          style={{ width: `${attribute.percentile}%` }}
        />

        <div
          className="absolute inset-y-0 left-1/4 w-px bg-white/10"
          aria-hidden
        />
        <div
          className="absolute inset-y-0 left-1/2 w-px bg-white/10"
          aria-hidden
        />
        <div
          className="absolute inset-y-0 left-3/4 w-px bg-white/10"
          aria-hidden
        />
      </div>

      <div className="mt-1 flex justify-between text-[8px] font-bold uppercase tracking-widest text-white/25">
        <span>0</span>
        <span>25</span>
        <span>50</span>
        <span>75</span>
        <span>100</span>
      </div>
    </div>
  );
}

function SectionLabel({
  eyebrow,
  title,
  accent = "orange",
}: {
  eyebrow: string;
  title: string;
  accent?: "orange" | "teal";
}) {
  return (
    <div className="flex items-end justify-between border-b border-[#1A2842]/20 pb-4">
      <div>
        <p
          className={`text-[10px] font-black uppercase tracking-[0.22em] ${
            accent === "orange" ? "text-[#D85F46]" : "text-[#59B3AD]"
          }`}
        >
          {eyebrow}
        </p>

        <h2 className="mt-1 text-2xl font-black tracking-tight">{title}</h2>
      </div>
    </div>
  );
}

function StatCell({
  label,
  value,
  accent = false,
}: {
  label: string;
  value: string;
  accent?: boolean;
}) {
  return (
    <div className="border-b border-r border-[#1A2842]/15 px-5 py-5">
      <p
        className={`text-xl font-black ${
          accent ? "text-[#D85F46]" : "text-[#1A2842]"
        }`}
      >
        {value}
      </p>

      <p className="mt-1 text-[9px] font-black uppercase tracking-[0.18em] text-[#687384]">
        {label}
      </p>
    </div>
  );
}

export default async function PlayerPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams?: Promise<{ season?: string }>;
}) {
  const { id } = await params;
  const playerId = Number(id);

  const resolvedSearchParams = searchParams
    ? await searchParams
    : {};

  const [{ data: player }, { data: stats }, { data: teams }] =
    await Promise.all([
      supabase
        .from("Player")
        .select("id, name, team_id, position")
        .eq("id", playerId)
        .single(),

      supabase
        .from("PlayerStats")
        .select(
          "season, games, at_bats, hits, home_runs, rbi, walks, strikeouts, batting_avg, obp, slg, ops, innings_pitched, wins, losses, earned_runs, hits_allowed, walks_allowed, strikeouts_pitched, era, whip"
        )
        .eq("player_id", playerId)
        .order("season", { ascending: false }),

      supabase
        .from("Teams")
        .select("id, name, abbreviation"),
    ]);

  if (!player) {
    return (
      <main className="min-h-screen bg-[#F8F3EA] px-6 py-20 text-[#1A2842]">
        <div className="mx-auto max-w-7xl">
          <h1 className="text-4xl font-black">Player not found</h1>

          <Link
            href="/players"
            className="mt-6 inline-block text-sm font-bold text-[#D85F46]"
          >
            ← Back to players
          </Link>
        </div>
      </main>
    );
  }

  const teamMap = new Map<string, Team>(
    (teams ?? []).map((team) => [team.id, team])
  );

  const team = player.team_id
    ? teamMap.get(player.team_id)
    : undefined;

  const playerStats = (stats ?? []) as PlayerStat[];

  const latestSeason = playerStats[0]?.season ?? 2026;

  const requestedSeason = Number(resolvedSearchParams.season);

  const selectedSeason =
    Number.isFinite(requestedSeason) &&
    playerStats.some((stat) => stat.season === requestedSeason)
      ? requestedSeason
      : latestSeason;

  const currentStats =
    playerStats.find((stat) => stat.season === selectedSeason) ?? null;

  /*
   * Pull every player's stats for the selected season.
   *
   * These are used to calculate relative percentile bars.
   * We only use statistics that already exist in your database.
   */
  const { data: leagueStatsData } = await supabase
    .from("PlayerStats")
    .select(
      "season, games, at_bats, hits, home_runs, rbi, walks, strikeouts, batting_avg, obp, slg, ops, innings_pitched, wins, losses, earned_runs, hits_allowed, walks_allowed, strikeouts_pitched, era, whip"
    )
    .eq("season", selectedSeason);

  const leagueStats = (leagueStatsData ?? []) as PlayerStat[];

  const isPitcher =
    currentStats &&
    (currentStats.innings_pitched !== null ||
      currentStats.wins !== null ||
      currentStats.era !== null);

  const hasHitting =
    currentStats &&
    (currentStats.at_bats !== null ||
      currentStats.hits !== null ||
      currentStats.batting_avg !== null);

  const games = currentStats?.games ?? null;

  const hrPerGame =
    currentStats?.home_runs !== null &&
    currentStats?.home_runs !== null &&
    games &&
    games > 0
      ? currentStats.home_runs / games
      : null;

  const rbiPerGame =
    currentStats?.rbi !== null &&
    currentStats?.rbi !== null &&
    games &&
    games > 0
      ? currentStats.rbi / games
      : null;

  const bbRate =
    currentStats?.walks !== null &&
    currentStats?.at_bats !== null &&
    currentStats.at_bats > 0
      ? currentStats.walks / currentStats.at_bats
      : null;

  const strikeoutRate =
    currentStats?.strikeouts !== null &&
    currentStats?.at_bats !== null &&
    currentStats.at_bats > 0
      ? currentStats.strikeouts / currentStats.at_bats
      : null;

  const hitRate =
    currentStats?.hits !== null &&
    currentStats?.at_bats !== null &&
    currentStats.at_bats > 0
      ? currentStats.hits / currentStats.at_bats
      : null;

  const kPer9 =
    currentStats?.strikeouts_pitched !== null &&
    currentStats?.innings_pitched !== null &&
    currentStats.innings_pitched > 0
      ? (currentStats.strikeouts_pitched /
          currentStats.innings_pitched) *
        9
      : null;

  const bbPer9 =
    currentStats?.walks_allowed !== null &&
    currentStats?.innings_pitched !== null &&
    currentStats.innings_pitched > 0
      ? (currentStats.walks_allowed /
          currentStats.innings_pitched) *
        9
      : null;

  const pitchingWinRate =
    currentStats?.wins !== null &&
    currentStats?.losses !== null &&
    currentStats.wins + currentStats.losses > 0
      ? currentStats.wins /
        (currentStats.wins + currentStats.losses)
      : null;

  const hittingAttributes: ProfileAttribute[] = [
    {
      label: "AVG",
      value: currentStats?.batting_avg ?? null,
      percentile: percentile(
        currentStats?.batting_avg ?? null,
        buildPopulation(leagueStats, (s) => s.batting_avg)
      ),
      display: formatAverage(currentStats?.batting_avg ?? null),
      accent: "orange",
    },
    {
      label: "OBP",
      value: currentStats?.obp ?? null,
      percentile: percentile(
        currentStats?.obp ?? null,
        buildPopulation(leagueStats, (s) => s.obp)
      ),
      display: formatAverage(currentStats?.obp ?? null),
      accent: "orange",
    },
    {
      label: "SLG",
      value: currentStats?.slg ?? null,
      percentile: percentile(
        currentStats?.slg ?? null,
        buildPopulation(leagueStats, (s) => s.slg)
      ),
      display: formatAverage(currentStats?.slg ?? null),
      accent: "orange",
    },
    {
      label: "OPS",
      value: currentStats?.ops ?? null,
      percentile: percentile(
        currentStats?.ops ?? null,
        buildPopulation(leagueStats, (s) => s.ops)
      ),
      display: formatDecimal(currentStats?.ops ?? null),
      accent: "orange",
    },
    {
      label: "HR / G",
      value: hrPerGame,
      percentile: percentile(
        hrPerGame,
        buildPopulation(leagueStats, (s) =>
          s.home_runs !== null && s.games && s.games > 0
            ? s.home_runs / s.games
            : null
        )
      ),
      display: hrPerGame !== null ? hrPerGame.toFixed(2) : "-",
      accent: "teal",
    },
    {
      label: "RBI / G",
      value: rbiPerGame,
      percentile: percentile(
        rbiPerGame,
        buildPopulation(leagueStats, (s) =>
          s.rbi !== null && s.games && s.games > 0
            ? s.rbi / s.games
            : null
        )
      ),
      display: rbiPerGame !== null ? rbiPerGame.toFixed(2) : "-",
      accent: "teal",
    },
    {
      label: "BB RATE",
      value: bbRate,
      percentile: percentile(
        bbRate,
        buildPopulation(leagueStats, (s) =>
          s.walks !== null && s.at_bats && s.at_bats > 0
            ? s.walks / s.at_bats
            : null
        )
      ),
      display: bbRate !== null ? `${(bbRate * 100).toFixed(1)}%` : "-",
      accent: "blue",
    },
    {
      label: "K AVOID",
      value: strikeoutRate,
      percentile: percentile(
        strikeoutRate,
        buildPopulation(leagueStats, (s) =>
          s.strikeouts !== null && s.at_bats && s.at_bats > 0
            ? s.strikeouts / s.at_bats
            : null
        ),
        false
      ),
      display:
        strikeoutRate !== null
          ? `${(strikeoutRate * 100).toFixed(1)}%`
          : "-",
      accent: "blue",
    },
  ];

  const pitchingAttributes: ProfileAttribute[] = [
    {
      label: "ERA",
      value: currentStats?.era ?? null,
      percentile: percentile(
        currentStats?.era ?? null,
        buildPopulation(leagueStats, (s) => s.era),
        false
      ),
      display: formatDecimal(currentStats?.era ?? null),
      accent: "teal",
    },
    {
      label: "WHIP",
      value: currentStats?.whip ?? null,
      percentile: percentile(
        currentStats?.whip ?? null,
        buildPopulation(leagueStats, (s) => s.whip),
        false
      ),
      display: formatDecimal(currentStats?.whip ?? null),
      accent: "teal",
    },
    {
      label: "K / 9",
      value: kPer9,
      percentile: percentile(
        kPer9,
        buildPopulation(leagueStats, (s) =>
          s.strikeouts_pitched !== null &&
          s.innings_pitched &&
          s.innings_pitched > 0
            ? (s.strikeouts_pitched / s.innings_pitched) * 9
            : null
        )
      ),
      display: kPer9 !== null ? kPer9.toFixed(1) : "-",
      accent: "orange",
    },
    {
      label: "BB / 9",
      value: bbPer9,
      percentile: percentile(
        bbPer9,
        buildPopulation(leagueStats, (s) =>
          s.walks_allowed !== null &&
          s.innings_pitched &&
          s.innings_pitched > 0
            ? (s.walks_allowed / s.innings_pitched) * 9
            : null
        ),
        false
      ),
      display: bbPer9 !== null ? bbPer9.toFixed(1) : "-",
      accent: "orange",
    },
    {
      label: "WIN RATE",
      value: pitchingWinRate,
      percentile: percentile(
        pitchingWinRate,
        buildPopulation(leagueStats, (s) =>
          s.wins !== null &&
          s.losses !== null &&
          s.wins + s.losses > 0
            ? s.wins / (s.wins + s.losses)
            : null
        )
      ),
      display:
        pitchingWinRate !== null
          ? `${(pitchingWinRate * 100).toFixed(0)}%`
          : "-",
      accent: "blue",
    },
    {
      label: "IP",
      value: currentStats?.innings_pitched ?? null,
      percentile: percentile(
        currentStats?.innings_pitched ?? null,
        buildPopulation(leagueStats, (s) => s.innings_pitched)
      ),
      display: formatInnings(currentStats?.innings_pitched ?? null),
      accent: "blue",
    },
  ];

  const profileAttributes = isPitcher
    ? pitchingAttributes
    : hittingAttributes;

  return (
    <main className="min-h-screen bg-[#F8F3EA] text-[#1A2842]">
      {/* --------------------------------------------------------- */}
      {/* TOP NAV */}
      {/* --------------------------------------------------------- */}

      <div className="border-b border-[#1A2842]/15 bg-[#F8F3EA]">
        <div className="mx-auto flex max-w-[1400px] items-center justify-between px-5 py-4 md:px-8">
          <Link
            href="/players"
            className="text-[10px] font-black uppercase tracking-[0.2em] text-[#687384] transition hover:text-[#D85F46]"
          >
            ← Players
          </Link>

          <div className="flex items-center gap-5 text-[9px] font-black uppercase tracking-[0.18em] text-[#687384]">
            <span className="text-[#D85F46]">Player Profile</span>
            <span className="hidden sm:block">Offshore Break</span>
          </div>
        </div>
      </div>

      {/* --------------------------------------------------------- */}
      {/* PLAYER HERO */}
      {/* --------------------------------------------------------- */}

      <section className="relative overflow-hidden bg-[#101A2C] text-white">
        {/* Decorative background */}
        <div className="absolute inset-0 overflow-hidden">
          <div
            className="absolute -left-20 top-10 h-80 w-80 rotate-[25deg] border-l-[70px] border-[#59B3AD]/10"
            aria-hidden
          />

          <div
            className="absolute right-[-100px] top-[-120px] h-[420px] w-[420px] rounded-full border-[80px] border-[#D85F46]/10"
            aria-hidden
          />

          <div
            className="absolute bottom-0 right-0 h-32 w-1/2 bg-[linear-gradient(135deg,transparent_0%,transparent_49%,rgba(216,95,70,0.08)_50%,rgba(216,95,70,0.08)_52%,transparent_53%)]"
            aria-hidden
          />

          <div
            className="absolute inset-0 opacity-20"
            style={{
              backgroundImage:
                "radial-gradient(circle at 1px 1px, rgba(255,255,255,0.35) 1px, transparent 0)",
              backgroundSize: "18px 18px",
            }}
            aria-hidden
          />
        </div>

        <div className="relative mx-auto max-w-[1400px] px-5 md:px-8">
          <div className="grid min-h-[390px] grid-cols-1 lg:grid-cols-[320px_1fr_280px]">
            {/* Player image */}
            <div className="relative flex items-end justify-center overflow-hidden border-x border-white/10 bg-[#0B1423]">
              <div className="absolute left-5 top-5">
                <p className="text-[9px] font-black uppercase tracking-[0.22em] text-[#59B3AD]">
                  MLB PLAYER
                </p>

                <p className="mt-1 font-mono text-[10px] text-white/30">
                  #{player.id}
                </p>
              </div>

              <div className="absolute bottom-0 left-0 h-1 w-full bg-gradient-to-r from-[#D85F46] via-[#59B3AD] to-[#5C82C4]" />

              <div className="relative mt-16 h-[330px] w-[280px]">
                <Headshot playerId={player.id} />
              </div>
            </div>

            {/* Player information */}
            <div className="flex flex-col justify-center px-7 py-12 md:px-12">
              <div className="flex items-center gap-3">
                {team && <TeamLogo teamId={team.id} />}

                <div>
                  <p className="text-[10px] font-black uppercase tracking-[0.22em] text-[#59B3AD]">
                    {team?.abbreviation ?? "FA"} · {player.position ?? "N/A"}
                  </p>

                  <p className="mt-1 text-[10px] font-bold uppercase tracking-[0.12em] text-white/40">
                    {team?.name ?? "Free Agent"}
                  </p>
                </div>
              </div>

              <h1 className="mt-7 max-w-3xl text-5xl font-black leading-[0.88] tracking-[-0.055em] md:text-7xl">
                {player.name}
              </h1>

              <div className="mt-7 flex flex-wrap gap-x-7 gap-y-4 border-t border-white/10 pt-5">
                <div>
                  <p className="text-[8px] font-black uppercase tracking-[0.18em] text-white/35">
                    Position
                  </p>
                  <p className="mt-1 text-sm font-black">
                    {player.position ?? "N/A"}
                  </p>
                </div>

                <div>
                  <p className="text-[8px] font-black uppercase tracking-[0.18em] text-white/35">
                    Team
                  </p>
                  <p className="mt-1 text-sm font-black">
                    {team?.abbreviation ?? "FA"}
                  </p>
                </div>

                <div>
                  <p className="text-[8px] font-black uppercase tracking-[0.18em] text-white/35">
                    Season
                  </p>
                  <p className="mt-1 text-sm font-black">
                    {selectedSeason}
                  </p>
                </div>

                <div>
                  <p className="text-[8px] font-black uppercase tracking-[0.18em] text-white/35">
                    Data
                  </p>
                  <p className="mt-1 text-sm font-black text-[#59B3AD]">
                    {isPitcher ? "Pitching" : "Hitting"}
                  </p>
                </div>
              </div>
            </div>

            {/* Season selector / side panel */}
            <div className="flex flex-col justify-between border-x border-white/10 bg-white/[0.025] p-6">
              <div>
                <p className="text-[9px] font-black uppercase tracking-[0.2em] text-white/35">
                  Season Archive
                </p>

                <div className="mt-4 space-y-1">
                  {playerStats.slice(0, 5).map((stat) => {
                    const active = stat.season === selectedSeason;

                    return (
                      <Link
                        key={stat.season}
                        href={`/players/${player.id}?season=${stat.season}`}
                        className={`flex items-center justify-between border px-4 py-3 text-xs font-black transition ${
                          active
                            ? "border-[#D85F46] bg-[#D85F46] text-white"
                            : "border-white/10 text-white/50 hover:border-white/30 hover:text-white"
                        }`}
                      >
                        <span>{stat.season}</span>
                        <span className="text-[9px] uppercase tracking-wider">
                          {active ? "Viewing" : "Open"}
                        </span>
                      </Link>
                    );
                  })}
                </div>
              </div>

              <div className="mt-8 border-t border-white/10 pt-5">
                <p className="text-[8px] font-black uppercase tracking-[0.18em] text-white/30">
                  Offshore Break
                </p>

                <p className="mt-2 text-xs leading-5 text-white/50">
                  Relative performance based on available season statistics.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* --------------------------------------------------------- */}
      {/* PROFILE NAV */}
      {/* --------------------------------------------------------- */}

      <div className="border-b border-[#1A2842]/15 bg-[#101A2C] text-white">
        <div className="mx-auto flex max-w-[1400px] overflow-x-auto px-5 md:px-8">
          <a
            href="#profile"
            className="border-b-2 border-[#D85F46] px-5 py-4 text-[9px] font-black uppercase tracking-[0.18em]"
          >
            Profile
          </a>

          <a
            href="#stats"
            className="border-b-2 border-transparent px-5 py-4 text-[9px] font-black uppercase tracking-[0.18em] text-white/40 transition hover:text-white"
          >
            MLB Stats
          </a>

          <a
            href="#history"
            className="border-b-2 border-transparent px-5 py-4 text-[9px] font-black uppercase tracking-[0.18em] text-white/40 transition hover:text-white"
          >
            History
          </a>
        </div>
      </div>

      {/* --------------------------------------------------------- */}
      {/* PROFILE / ATTRIBUTES */}
      {/* --------------------------------------------------------- */}

      <section
        id="profile"
        className="mx-auto max-w-[1400px] px-5 py-10 md:px-8"
      >
        <SectionLabel
          eyebrow="Offshore Profile"
          title="Performance Attributes"
        />

        <div className="mt-6 overflow-hidden bg-[#101A2C]">
          <div className="grid lg:grid-cols-[280px_1fr]">
            {/* Profile summary */}
            <div className="relative border-b border-white/10 bg-[#0B1423] p-7 lg:border-b-0 lg:border-r">
              <p className="text-[9px] font-black uppercase tracking-[0.22em] text-[#D85F46]">
                {selectedSeason} Profile
              </p>

              <h3 className="mt-3 text-3xl font-black tracking-tight text-white">
                {isPitcher ? "Pitching" : "Hitting"}
              </h3>

              <p className="mt-3 text-sm leading-6 text-white/45">
                Relative percentile rankings against players with available
                statistics in the Offshore Break database.
              </p>

              <div className="mt-8 border-t border-white/10 pt-6">
                <p className="text-[8px] font-black uppercase tracking-[0.2em] text-white/30">
                  Database
                </p>

                <p className="mt-2 text-2xl font-black text-white">
                  {leagueStats.length.toLocaleString()}
                </p>

                <p className="mt-1 text-[9px] font-bold uppercase tracking-widest text-white/30">
                  Stat Lines
                </p>
              </div>
            </div>

            {/* Attribute bars */}
            <div className="grid gap-x-10 gap-y-7 p-7 md:grid-cols-2 md:p-9">
              {profileAttributes.map((attribute) => (
                <AttributeBar
                  key={attribute.label}
                  attribute={attribute}
                />
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* --------------------------------------------------------- */}
      {/* SNAPSHOT */}
      {/* --------------------------------------------------------- */}

      <section className="mx-auto max-w-[1400px] px-5 pb-12 md:px-8">
        <SectionLabel
          eyebrow={`${selectedSeason} Season`}
          title="Stat Snapshot"
          accent="teal"
        />

        {hasHitting && !isPitcher && (
          <div className="mt-6 grid grid-cols-2 border-l border-[#1A2842]/15 md:grid-cols-4 lg:grid-cols-8">
            <StatCell
              label="AVG"
              value={formatAverage(currentStats?.batting_avg ?? null)}
            />

            <StatCell
              label="OBP"
              value={formatAverage(currentStats?.obp ?? null)}
            />

            <StatCell
              label="SLG"
              value={formatAverage(currentStats?.slg ?? null)}
            />

            <StatCell
              label="OPS"
              value={formatDecimal(currentStats?.ops ?? null)}
              accent
            />

            <StatCell
              label="HR"
              value={formatNumber(currentStats?.home_runs ?? null)}
            />

            <StatCell
              label="RBI"
              value={formatNumber(currentStats?.rbi ?? null)}
            />

            <StatCell
              label="H"
              value={formatNumber(currentStats?.hits ?? null)}
            />

            <StatCell
              label="BB"
              value={formatNumber(currentStats?.walks ?? null)}
            />
          </div>
        )}

        {isPitcher && (
          <div className="mt-6 grid grid-cols-2 border-l border-[#1A2842]/15 md:grid-cols-4 lg:grid-cols-8">
            <StatCell
              label="IP"
              value={formatInnings(currentStats?.innings_pitched ?? null)}
            />

            <StatCell
              label="W"
              value={formatNumber(currentStats?.wins ?? null)}
            />

            <StatCell
              label="L"
              value={formatNumber(currentStats?.losses ?? null)}
            />

            <StatCell
              label="ERA"
              value={formatDecimal(currentStats?.era ?? null)}
              accent
            />

            <StatCell
              label="WHIP"
              value={formatDecimal(currentStats?.whip ?? null)}
            />

            <StatCell
              label="H"
              value={formatNumber(currentStats?.hits_allowed ?? null)}
            />

            <StatCell
              label="BB"
              value={formatNumber(currentStats?.walks_allowed ?? null)}
            />

            <StatCell
              label="K"
              value={formatNumber(
                currentStats?.strikeouts_pitched ?? null
              )}
            />
          </div>
        )}
      </section>

      {/* --------------------------------------------------------- */}
      {/* MLB STAT TABLE */}
      {/* --------------------------------------------------------- */}

      <section
        id="stats"
        className="mx-auto max-w-[1400px] px-5 pb-12 md:px-8"
      >
        <SectionLabel
          eyebrow="Traditional Statistics"
          title="MLB Stats"
        />

        <div className="mt-6 overflow-hidden border border-[#1A2842]/15 bg-white/30">
          {hasHitting && !isPitcher && (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[850px] text-sm">
                <thead>
                  <tr className="border-b border-[#1A2842]/15 bg-[#1A2842] text-left text-[9px] font-black uppercase tracking-[0.16em] text-white/60">
                    <th className="px-4 py-4">G</th>
                    <th className="px-4 py-4">AB</th>
                    <th className="px-4 py-4">H</th>
                    <th className="px-4 py-4">HR</th>
                    <th className="px-4 py-4">RBI</th>
                    <th className="px-4 py-4">BB</th>
                    <th className="px-4 py-4">K</th>
                    <th className="px-4 py-4">AVG</th>
                    <th className="px-4 py-4">OBP</th>
                    <th className="px-4 py-4">SLG</th>
                    <th className="px-4 py-4">OPS</th>
                  </tr>
                </thead>

                <tbody>
                  <tr className="border-b border-[#1A2842]/10">
                    <td className="px-4 py-5 font-black">
                      {formatNumber(currentStats?.games ?? null)}
                    </td>

                    <td className="px-4 py-5">
                      {formatNumber(currentStats?.at_bats ?? null)}
                    </td>

                    <td className="px-4 py-5">
                      {formatNumber(currentStats?.hits ?? null)}
                    </td>

                    <td className="px-4 py-5">
                      {formatNumber(currentStats?.home_runs ?? null)}
                    </td>

                    <td className="px-4 py-5">
                      {formatNumber(currentStats?.rbi ?? null)}
                    </td>

                    <td className="px-4 py-5">
                      {formatNumber(currentStats?.walks ?? null)}
                    </td>

                    <td className="px-4 py-5">
                      {formatNumber(currentStats?.strikeouts ?? null)}
                    </td>

                    <td className="px-4 py-5 font-black">
                      {formatAverage(
                        currentStats?.batting_avg ?? null
                      )}
                    </td>

                    <td className="px-4 py-5">
                      {formatAverage(currentStats?.obp ?? null)}
                    </td>

                    <td className="px-4 py-5">
                      {formatAverage(currentStats?.slg ?? null)}
                    </td>

                    <td className="px-4 py-5 font-black text-[#D85F46]">
                      {formatDecimal(currentStats?.ops ?? null)}
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          )}

          {isPitcher && (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[700px] text-sm">
                <thead>
                  <tr className="border-b border-[#1A2842]/15 bg-[#1A2842] text-left text-[9px] font-black uppercase tracking-[0.16em] text-white/60">
                    <th className="px-4 py-4">IP</th>
                    <th className="px-4 py-4">W</th>
                    <th className="px-4 py-4">L</th>
                    <th className="px-4 py-4">ERA</th>
                    <th className="px-4 py-4">WHIP</th>
                    <th className="px-4 py-4">H</th>
                    <th className="px-4 py-4">BB</th>
                    <th className="px-4 py-4">K</th>
                  </tr>
                </thead>

                <tbody>
                  <tr className="border-b border-[#1A2842]/10">
                    <td className="px-4 py-5 font-black">
                      {formatInnings(
                        currentStats?.innings_pitched ?? null
                      )}
                    </td>

                    <td className="px-4 py-5">
                      {formatNumber(currentStats?.wins ?? null)}
                    </td>

                    <td className="px-4 py-5">
                      {formatNumber(currentStats?.losses ?? null)}
                    </td>

                    <td className="px-4 py-5 font-black text-[#D85F46]">
                      {formatDecimal(currentStats?.era ?? null)}
                    </td>

                    <td className="px-4 py-5">
                      {formatDecimal(currentStats?.whip ?? null)}
                    </td>

                    <td className="px-4 py-5">
                      {formatNumber(currentStats?.hits_allowed ?? null)}
                    </td>

                    <td className="px-4 py-5">
                      {formatNumber(currentStats?.walks_allowed ?? null)}
                    </td>

                    <td className="px-4 py-5">
                      {formatNumber(
                        currentStats?.strikeouts_pitched ?? null
                      )}
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          )}
        </div>
      </section>

      {/* --------------------------------------------------------- */}
      {/* CAREER HISTORY */}
      {/* --------------------------------------------------------- */}

      <section
        id="history"
        className="mx-auto max-w-[1400px] px-5 pb-20 md:px-8"
      >
        <SectionLabel
          eyebrow="Career"
          title="Season History"
          accent="teal"
        />

        <div className="mt-6 overflow-hidden border border-[#1A2842]/15">
          <div className="grid grid-cols-[90px_1fr_1fr_1fr] bg-[#1A2842] px-4 py-4 text-[9px] font-black uppercase tracking-[0.16em] text-white/60 md:grid-cols-[120px_1fr_1fr_1fr_1fr_1fr]">
            <span>Season</span>
            <span>G</span>
            <span>AVG</span>
            <span>OPS</span>
            <span className="hidden md:block">HR</span>
            <span className="hidden md:block">ERA</span>
          </div>

          {playerStats.map((stat) => (
            <Link
              key={stat.season}
              href={`/players/${player.id}?season=${stat.season}`}
              className={`grid grid-cols-[90px_1fr_1fr_1fr] border-b border-[#1A2842]/10 px-4 py-5 text-sm transition hover:bg-white md:grid-cols-[120px_1fr_1fr_1fr_1fr_1fr] ${
                stat.season === selectedSeason
                  ? "bg-[#D85F46]/5"
                  : ""
              }`}
            >
              <span className="font-black">{stat.season}</span>

              <span>{formatNumber(stat.games)}</span>

              <span className="font-bold">
                {formatAverage(stat.batting_avg)}
              </span>

              <span className="font-bold">
                {formatDecimal(stat.ops)}
              </span>

              <span className="hidden md:block">
                {formatNumber(stat.home_runs)}
              </span>

              <span className="hidden md:block">
                {formatDecimal(stat.era)}
              </span>
            </Link>
          ))}
        </div>
      </section>
    </main>
  );
}