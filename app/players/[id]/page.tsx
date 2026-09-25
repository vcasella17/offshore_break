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

type Attribute = {
  label: string;
  percentile: number;
  value: string;
  color: "coral" | "teal" | "blue";
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

function population(
  stats: PlayerStat[],
  getter: (stat: PlayerStat) => number | null
) {
  return stats
    .map(getter)
    .filter((value): value is number => value !== null && Number.isFinite(value));
}

function getPercentile(
  value: number | null,
  values: number[],
  higherIsBetter = true
) {
  if (value === null || values.length === 0) return 0;

  const better = values.filter((other) =>
    higherIsBetter ? other < value : other > value
  ).length;

  return Math.max(
    1,
    Math.min(99, Math.round((better / values.length) * 100))
  );
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
      className="h-11 w-11 object-contain"
    />
  );
}

function AttributeBar({ attribute }: { attribute: Attribute }) {
  const color =
    attribute.color === "coral"
      ? "#D85F46"
      : attribute.color === "teal"
        ? "#59B3AD"
        : "#6287C7";

  return (
    <div>
      <div className="mb-2 flex items-end justify-between">
        <div>
          <p className="text-[9px] font-black uppercase tracking-[0.18em] text-white/45">
            {attribute.label}
          </p>

          <p className="mt-1 font-mono text-xs text-white/40">
            {attribute.value}
          </p>
        </div>

        <div className="text-right">
          <span className="font-mono text-2xl font-black text-white">
            {attribute.percentile}
          </span>

          <span className="ml-1 text-[8px] font-black uppercase tracking-widest text-white/35">
            PCTL
          </span>
        </div>
      </div>

      <div className="relative h-[10px] overflow-hidden bg-white/[0.07]">
        <div
          className="absolute inset-y-0 left-0"
          style={{
            width: `${attribute.percentile}%`,
            backgroundColor: color,
          }}
        />

        <div className="absolute inset-y-0 left-1/4 w-px bg-white/10" />
        <div className="absolute inset-y-0 left-1/2 w-px bg-white/10" />
        <div className="absolute inset-y-0 left-3/4 w-px bg-white/10" />
      </div>

      <div className="mt-1 flex justify-between font-mono text-[7px] text-white/20">
        <span>0</span>
        <span>25</span>
        <span>50</span>
        <span>75</span>
        <span>100</span>
      </div>
    </div>
  );
}

function SectionHeader({
  eyebrow,
  title,
  accent = "coral",
}: {
  eyebrow: string;
  title: string;
  accent?: "coral" | "teal";
}) {
  return (
    <div className="flex items-end justify-between border-b border-[#1A2842]/20 pb-4">
      <div>
        <p
          className={`text-[9px] font-black uppercase tracking-[0.22em] ${
            accent === "coral" ? "text-[#D85F46]" : "text-[#59B3AD]"
          }`}
        >
          {eyebrow}
        </p>

        <h2 className="mt-1 text-2xl font-black tracking-[-0.03em]">
          {title}
        </h2>
      </div>
    </div>
  );
}

function StatBlock({
  label,
  value,
  percentile,
}: {
  label: string;
  value: string;
  percentile?: number;
}) {
  return (
    <div className="border-r border-b border-[#1A2842]/15 px-5 py-5">
      <p className="font-mono text-2xl font-black tracking-tight">
        {value}
      </p>

      <p className="mt-1 text-[8px] font-black uppercase tracking-[0.18em] text-[#687384]">
        {label}
      </p>

      {percentile !== undefined && percentile > 0 && (
        <p className="mt-3 font-mono text-[8px] font-bold text-[#D85F46]">
          {percentile}th percentile
        </p>
      )}
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

  const queryParams = searchParams ? await searchParams : {};
  const requestedSeason = Number(queryParams.season);

  const [{ data: player }, { data: playerStats }, { data: teams }] =
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
          <p className="text-[10px] font-black uppercase tracking-[0.2em] text-[#D85F46]">
            Offshore Break
          </p>

          <h1 className="mt-3 text-4xl font-black">
            Player not found
          </h1>

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

  const stats = (playerStats ?? []) as PlayerStat[];
  const teamMap = new Map<string, Team>(
    (teams ?? []).map((team) => [team.id, team])
  );

  const team = player.team_id
    ? teamMap.get(player.team_id)
    : undefined;

  const latestSeason = stats[0]?.season ?? 2026;

  const selectedSeason =
    Number.isFinite(requestedSeason) &&
    stats.some((stat) => stat.season === requestedSeason)
      ? requestedSeason
      : latestSeason;

  const current =
    stats.find((stat) => stat.season === selectedSeason) ?? null;

  /*
   * League comparison data
   */
  const { data: leagueData } = await supabase
    .from("PlayerStats")
    .select(
      "season, games, at_bats, hits, home_runs, rbi, walks, strikeouts, batting_avg, obp, slg, ops, innings_pitched, wins, losses, earned_runs, hits_allowed, walks_allowed, strikeouts_pitched, era, whip"
    )
    .eq("season", selectedSeason);

  const leagueStats = (leagueData ?? []) as PlayerStat[];

  const isPitcher =
    current &&
    (current.innings_pitched !== null ||
      current.era !== null ||
      current.strikeouts_pitched !== null);

  const games = current?.games ?? null;

  const hrPerGame =
    current?.home_runs !== null &&
    current?.home_runs !== undefined &&
    games !== null &&
    games > 0
      ? current.home_runs / games
      : null;

  const rbiPerGame =
    current?.rbi !== null &&
    current?.rbi !== undefined &&
    games !== null &&
    games > 0
      ? current.rbi / games
      : null;

  const bbRate =
    current?.walks !== null &&
    current?.walks !== undefined &&
    current?.at_bats !== null &&
    current.at_bats > 0
      ? current.walks / current.at_bats
      : null;

  const kRate =
    current?.strikeouts !== null &&
    current?.strikeouts !== undefined &&
    current?.at_bats !== null &&
    current.at_bats > 0
      ? current.strikeouts / current.at_bats
      : null;

  const kPer9 =
    current?.strikeouts_pitched !== null &&
    current?.strikeouts_pitched !== undefined &&
    current?.innings_pitched !== null &&
    current.innings_pitched > 0
      ? (current.strikeouts_pitched / current.innings_pitched) * 9
      : null;

  const bbPer9 =
    current?.walks_allowed !== null &&
    current?.walks_allowed !== undefined &&
    current?.innings_pitched !== null &&
    current.innings_pitched > 0
      ? (current.walks_allowed / current.innings_pitched) * 9
      : null;

  /*
   * Percentiles
   */
  const avgPct = getPercentile(
    current?.batting_avg ?? null,
    population(leagueStats, (s) => s.batting_avg)
  );

  const obpPct = getPercentile(
    current?.obp ?? null,
    population(leagueStats, (s) => s.obp)
  );

  const slgPct = getPercentile(
    current?.slg ?? null,
    population(leagueStats, (s) => s.slg)
  );

  const opsPct = getPercentile(
    current?.ops ?? null,
    population(leagueStats, (s) => s.ops)
  );

  const hrPct = getPercentile(
    hrPerGame,
    population(leagueStats, (s) =>
      s.home_runs !== null &&
      s.games !== null &&
      s.games > 0
        ? s.home_runs / s.games
        : null
    )
  );

  const rbiPct = getPercentile(
    rbiPerGame,
    population(leagueStats, (s) =>
      s.rbi !== null &&
      s.games !== null &&
      s.games > 0
        ? s.rbi / s.games
        : null
    )
  );

  const bbPct = getPercentile(
    bbRate,
    population(leagueStats, (s) =>
      s.walks !== null &&
      s.at_bats !== null &&
      s.at_bats > 0
        ? s.walks / s.at_bats
        : null
    )
  );

  const kAvoidPct = getPercentile(
    kRate,
    population(leagueStats, (s) =>
      s.strikeouts !== null &&
      s.at_bats !== null &&
      s.at_bats > 0
        ? s.strikeouts / s.at_bats
        : null
    ),
    false
  );

  const eraPct = getPercentile(
    current?.era ?? null,
    population(leagueStats, (s) => s.era),
    false
  );

  const whipPct = getPercentile(
    current?.whip ?? null,
    population(leagueStats, (s) => s.whip),
    false
  );

  const k9Pct = getPercentile(
    kPer9,
    population(leagueStats, (s) =>
      s.strikeouts_pitched !== null &&
      s.innings_pitched !== null &&
      s.innings_pitched > 0
        ? (s.strikeouts_pitched / s.innings_pitched) * 9
        : null
    )
  );

  const bb9Pct = getPercentile(
    bbPer9,
    population(leagueStats, (s) =>
      s.walks_allowed !== null &&
      s.innings_pitched !== null &&
      s.innings_pitched > 0
        ? (s.walks_allowed / s.innings_pitched) * 9
        : null
    ),
    false
  );

  const hittingAttributes: Attribute[] = [
    {
      label: "CONTACT",
      percentile: avgPct,
      value: formatAverage(current?.batting_avg ?? null),
      color: "coral",
    },
    {
      label: "ON-BASE",
      percentile: obpPct,
      value: formatAverage(current?.obp ?? null),
      color: "teal",
    },
    {
      label: "POWER",
      percentile: slgPct,
      value: formatAverage(current?.slg ?? null),
      color: "coral",
    },
    {
      label: "PRODUCTION",
      percentile: opsPct,
      value: formatDecimal(current?.ops ?? null),
      color: "teal",
    },
    {
      label: "HR / GAME",
      percentile: hrPct,
      value: hrPerGame !== null ? hrPerGame.toFixed(2) : "-",
      color: "blue",
    },
    {
      label: "RBI / GAME",
      percentile: rbiPct,
      value: rbiPerGame !== null ? rbiPerGame.toFixed(2) : "-",
      color: "blue",
    },
    {
      label: "BB RATE",
      percentile: bbPct,
      value: bbRate !== null ? `${(bbRate * 100).toFixed(1)}%` : "-",
      color: "teal",
    },
    {
      label: "K AVOIDANCE",
      percentile: kAvoidPct,
      value: kRate !== null ? `${(kRate * 100).toFixed(1)}%` : "-",
      color: "coral",
    },
  ];

  const pitchingAttributes: Attribute[] = [
    {
      label: "ERA",
      percentile: eraPct,
      value: formatDecimal(current?.era ?? null),
      color: "coral",
    },
    {
      label: "WHIP",
      percentile: whipPct,
      value: formatDecimal(current?.whip ?? null),
      color: "teal",
    },
    {
      label: "K / 9",
      percentile: k9Pct,
      value: kPer9 !== null ? kPer9.toFixed(1) : "-",
      color: "coral",
    },
    {
      label: "BB / 9",
      percentile: bb9Pct,
      value: bbPer9 !== null ? bbPer9.toFixed(1) : "-",
      color: "teal",
    },
    {
      label: "INNINGS",
      percentile: getPercentile(
        current?.innings_pitched ?? null,
        population(leagueStats, (s) => s.innings_pitched)
      ),
      value: formatInnings(current?.innings_pitched ?? null),
      color: "blue",
    },
    {
      label: "STRIKEOUTS",
      percentile: getPercentile(
        current?.strikeouts_pitched ?? null,
        population(leagueStats, (s) => s.strikeouts_pitched)
      ),
      value: formatNumber(current?.strikeouts_pitched ?? null),
      color: "blue",
    },
  ];

  const attributes = isPitcher
    ? pitchingAttributes
    : hittingAttributes;

  return (
    <main className="min-h-screen bg-[#F8F3EA] text-[#1A2842]">
      {/* ====================================================== */}
      {/* PLAYER HERO */}
      {/* ====================================================== */}

      <section className="overflow-hidden bg-[#101A2C] text-white">
        <div className="mx-auto max-w-[1440px]">
          <div className="grid min-h-[430px] lg:grid-cols-[330px_1fr_280px]">
            {/* Headshot */}
            <div className="relative flex items-end justify-center overflow-hidden border-x border-white/10 bg-[#0B1423]">
              <div className="absolute left-6 top-6">
                <p className="text-[9px] font-black uppercase tracking-[0.22em] text-[#59B3AD]">
                  PLAYER
                </p>

                <p className="mt-1 font-mono text-[9px] text-white/30">
                  MLB #{player.id}
                </p>
              </div>

              <div className="absolute bottom-0 left-0 h-1 w-full bg-gradient-to-r from-[#D85F46] via-[#59B3AD] to-[#6287C7]" />

              <div className="h-[390px] w-[310px]">
                <Headshot playerId={player.id} />
              </div>
            </div>

            {/* Identity */}
            <div className="flex flex-col justify-center px-7 py-12 md:px-12">
              <div className="flex items-center gap-4">
                {team && <TeamLogo teamId={team.id} />}

                <div>
                  <p className="text-[10px] font-black uppercase tracking-[0.2em] text-[#59B3AD]">
                    {team?.name ?? "Free Agent"}
                  </p>

                  <p className="mt-1 text-[9px] font-bold uppercase tracking-widest text-white/35">
                    {player.position ?? "N/A"}
                  </p>
                </div>
              </div>

              <h1 className="mt-8 text-5xl font-black leading-[0.9] tracking-[-0.06em] md:text-7xl">
                {player.name}
              </h1>

              <div className="mt-7 flex flex-wrap gap-2">
                <Link
                  href={`/compare?player1=${player.id}`}
                  className="inline-flex items-center border border-[#D85F46] bg-[#D85F46] px-4 py-3 text-[9px] font-black uppercase tracking-[0.15em] text-white transition hover:border-[#59B3AD] hover:bg-[#59B3AD]"
                >
                  Compare Player →
                </Link>

                <Link
                  href="/players"
                  className="inline-flex items-center border border-white/15 bg-white/[0.04] px-4 py-3 text-[9px] font-black uppercase tracking-[0.15em] text-white/65 transition hover:border-white/30 hover:bg-white/[0.08] hover:text-white"
                >
                  All Players
                </Link>

                {team && (
                  <Link
                    href={`/teams/${team.id}`}
                    className="inline-flex items-center border border-white/15 bg-white/[0.04] px-4 py-3 text-[9px] font-black uppercase tracking-[0.15em] text-white/65 transition hover:border-white/30 hover:bg-white/[0.08] hover:text-white"
                  >
                    {team.abbreviation} →
                  </Link>
                )}
              </div>

              <div className="mt-8 grid grid-cols-4 border-y border-white/10">
                {!isPitcher ? (
                  <>
                    <div className="border-r border-white/10 py-4">
                      <p className="font-mono text-2xl font-black">
                        {formatAverage(current?.batting_avg ?? null)}
                      </p>
                      <p className="mt-1 text-[8px] font-black uppercase tracking-widest text-white/30">
                        AVG
                      </p>
                    </div>

                    <div className="border-r border-white/10 py-4 pl-4">
                      <p className="font-mono text-2xl font-black">
                        {formatAverage(current?.obp ?? null)}
                      </p>
                      <p className="mt-1 text-[8px] font-black uppercase tracking-widest text-white/30">
                        OBP
                      </p>
                    </div>

                    <div className="border-r border-white/10 py-4 pl-4">
                      <p className="font-mono text-2xl font-black">
                        {formatAverage(current?.slg ?? null)}
                      </p>
                      <p className="mt-1 text-[8px] font-black uppercase tracking-widest text-white/30">
                        SLG
                      </p>
                    </div>

                    <div className="py-4 pl-4">
                      <p className="font-mono text-2xl font-black text-[#D85F46]">
                        {formatDecimal(current?.ops ?? null)}
                      </p>
                      <p className="mt-1 text-[8px] font-black uppercase tracking-widest text-white/30">
                        OPS
                      </p>
                    </div>
                  </>
                ) : (
                  <>
                    <div className="border-r border-white/10 py-4">
                      <p className="font-mono text-2xl font-black">
                        {formatDecimal(current?.era ?? null)}
                      </p>
                      <p className="mt-1 text-[8px] font-black uppercase tracking-widest text-white/30">
                        ERA
                      </p>
                    </div>

                    <div className="border-r border-white/10 py-4 pl-4">
                      <p className="font-mono text-2xl font-black">
                        {formatDecimal(current?.whip ?? null)}
                      </p>
                      <p className="mt-1 text-[8px] font-black uppercase tracking-widest text-white/30">
                        WHIP
                      </p>
                    </div>

                    <div className="border-r border-white/10 py-4 pl-4">
                      <p className="font-mono text-2xl font-black">
                        {formatNumber(current?.strikeouts_pitched ?? null)}
                      </p>
                      <p className="mt-1 text-[8px] font-black uppercase tracking-widest text-white/30">
                        K
                      </p>
                    </div>

                    <div className="py-4 pl-4">
                      <p className="font-mono text-2xl font-black text-[#D85F46]">
                        {formatInnings(current?.innings_pitched ?? null)}
                      </p>
                      <p className="mt-1 text-[8px] font-black uppercase tracking-widest text-white/30">
                        IP
                      </p>
                    </div>
                  </>
                )}
              </div>
            </div>

            {/* Season rail */}
            <div className="border-x border-white/10 bg-white/[0.025] p-6">
              <div className="flex items-center justify-between">
                <p className="text-[9px] font-black uppercase tracking-[0.2em] text-white/35">
                  Season
                </p>

                <span className="font-mono text-[9px] text-white/25">
                  {stats.length} YEARS
                </span>
              </div>

              <div className="mt-5 space-y-1">
                {stats.slice(0, 6).map((stat) => {
                  const active = stat.season === selectedSeason;

                  return (
                    <Link
                      key={stat.season}
                      href={`/players/${player.id}?season=${stat.season}`}
                      className={`flex items-center justify-between border px-4 py-3 transition ${
                        active
                          ? "border-[#D85F46] bg-[#D85F46] text-white"
                          : "border-white/10 text-white/45 hover:border-white/25 hover:text-white"
                      }`}
                    >
                      <span className="font-mono text-xs font-black">
                        {stat.season}
                      </span>

                      <span className="text-[8px] font-black uppercase tracking-widest">
                        {active ? "Current" : "View"}
                      </span>
                    </Link>
                  );
                })}
              </div>

              <div className="mt-8 border-t border-white/10 pt-5">
                <p className="text-[8px] font-black uppercase tracking-[0.18em] text-white/25">
                  Offshore Break
                </p>

                <p className="mt-2 text-xs leading-5 text-white/40">
                  Baseball performance through the lens of available data.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ====================================================== */}
      {/* SECTION NAV */}
      {/* ====================================================== */}

      <div className="border-b border-[#1A2842]/15 bg-[#101A2C] text-white">
        <div className="mx-auto flex max-w-[1440px] overflow-x-auto px-5 md:px-8">
          <a
            href="#profile"
            className="border-b-2 border-[#D85F46] px-5 py-4 text-[9px] font-black uppercase tracking-[0.18em]"
          >
            Profile
          </a>

          <a
            href="#performance"
            className="border-b-2 border-transparent px-5 py-4 text-[9px] font-black uppercase tracking-[0.18em] text-white/40 hover:text-white"
          >
            Performance
          </a>

          <a
            href="#career"
            className="border-b-2 border-transparent px-5 py-4 text-[9px] font-black uppercase tracking-[0.18em] text-white/40 hover:text-white"
          >
            Career
          </a>
        </div>
      </div>

      {/* ====================================================== */}
      {/* OFFSHORE PROFILE */}
      {/* ====================================================== */}

      <section
        id="profile"
        className="paper-grid mx-auto max-w-[1440px] px-5 py-12 md:px-8"
      >
        <SectionHeader
          eyebrow="Offshore Profile"
          title="Performance Attributes"
        />

        <div className="mt-6 overflow-hidden bg-[#101A2C]">
          <div className="grid lg:grid-cols-[280px_1fr]">
            <div className="relative bg-[#0B1423] p-7">
              <div className="absolute right-0 top-0 h-full w-[3px] bg-[#D85F46]" />

              <p className="text-[9px] font-black uppercase tracking-[0.2em] text-[#D85F46]">
                Player Type
              </p>

              <h3 className="mt-4 text-3xl font-black text-white">
                {isPitcher ? "Pitcher" : "Position Player"}
              </h3>

              <div className="mt-8 space-y-5">
                <div>
                  <p className="text-[8px] font-black uppercase tracking-widest text-white/25">
                    Position
                  </p>

                  <p className="mt-1 text-sm font-black text-white">
                    {player.position ?? "N/A"}
                  </p>
                </div>

                <div>
                  <p className="text-[8px] font-black uppercase tracking-widest text-white/25">
                    Team
                  </p>

                  <p className="mt-1 text-sm font-black text-white">
                    {team?.abbreviation ?? "FA"}
                  </p>
                </div>

                <div>
                  <p className="text-[8px] font-black uppercase tracking-widest text-white/25">
                    Season
                  </p>

                  <p className="mt-1 font-mono text-sm font-black text-white">
                    {selectedSeason}
                  </p>
                </div>
              </div>
            </div>

            <div className="grid gap-x-10 gap-y-8 p-7 md:grid-cols-2 md:p-10">
              {attributes.map((attribute) => (
                <AttributeBar
                  key={attribute.label}
                  attribute={attribute}
                />
              ))}

              <div className="md:col-span-2 border-t border-white/10 pt-5">
                <p className="text-[8px] font-black uppercase tracking-[0.18em] text-white/25">
                  Data Note
                </p>
                <p className="mt-2 max-w-3xl text-[10px] leading-5 text-white/35">
                  Percentiles compare this player against the PlayerStats records
                  available for the selected season. They are Offshore Break
                  league-context percentiles, not official MLB Statcast percentiles.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ====================================================== */}
      {/* SEASON SNAPSHOT */}
      {/* ====================================================== */}

      <section className="mx-auto max-w-[1440px] px-5 pb-12 md:px-8">
        <SectionHeader
          eyebrow={`${selectedSeason} Season`}
          title="Stat Snapshot"
          accent="teal"
        />

        {!isPitcher ? (
          <div className="mt-6 grid grid-cols-2 border-l border-[#1A2842]/15 md:grid-cols-4 lg:grid-cols-8">
            <StatBlock
              label="AVG"
              value={formatAverage(current?.batting_avg ?? null)}
              percentile={avgPct}
            />

            <StatBlock
              label="OBP"
              value={formatAverage(current?.obp ?? null)}
              percentile={obpPct}
            />

            <StatBlock
              label="SLG"
              value={formatAverage(current?.slg ?? null)}
              percentile={slgPct}
            />

            <StatBlock
              label="OPS"
              value={formatDecimal(current?.ops ?? null)}
              percentile={opsPct}
            />

            <StatBlock
              label="HR"
              value={formatNumber(current?.home_runs ?? null)}
              percentile={hrPct}
            />

            <StatBlock
              label="RBI"
              value={formatNumber(current?.rbi ?? null)}
              percentile={rbiPct}
            />

            <StatBlock
              label="H"
              value={formatNumber(current?.hits ?? null)}
            />

            <StatBlock
              label="BB"
              value={formatNumber(current?.walks ?? null)}
              percentile={bbPct}
            />
          </div>
        ) : (
          <div className="mt-6 grid grid-cols-2 border-l border-[#1A2842]/15 md:grid-cols-4 lg:grid-cols-6">
            <StatBlock
              label="IP"
              value={formatInnings(current?.innings_pitched ?? null)}
            />

            <StatBlock
              label="ERA"
              value={formatDecimal(current?.era ?? null)}
              percentile={eraPct}
            />

            <StatBlock
              label="WHIP"
              value={formatDecimal(current?.whip ?? null)}
              percentile={whipPct}
            />

            <StatBlock
              label="K"
              value={formatNumber(current?.strikeouts_pitched ?? null)}
              percentile={k9Pct}
            />

            <StatBlock
              label="W"
              value={formatNumber(current?.wins ?? null)}
            />

            <StatBlock
              label="L"
              value={formatNumber(current?.losses ?? null)}
            />
          </div>
        )}
      </section>

      {/* ====================================================== */}
      {/* PERFORMANCE */}
      {/* ====================================================== */}

      <section
        id="performance"
        className="mx-auto max-w-[1440px] px-5 pb-12 md:px-8"
      >
        <SectionHeader
          eyebrow="Performance"
          title="At A Glance"
        />

        <div className="mt-6 grid gap-6 lg:grid-cols-2">
          {/* Main stats */}
          <div className="border border-[#1A2842]/15 bg-white/20">
            <div className="border-b border-[#1A2842]/15 px-6 py-5">
              <p className="text-[9px] font-black uppercase tracking-[0.2em] text-[#D85F46]">
                {isPitcher ? "Pitching" : "At The Plate"}
              </p>
            </div>

            {!isPitcher ? (
              <div className="grid grid-cols-2">
                <StatBlock
                  label="Games"
                  value={formatNumber(current?.games ?? null)}
                />

                <StatBlock
                  label="At Bats"
                  value={formatNumber(current?.at_bats ?? null)}
                />

                <StatBlock
                  label="Hits"
                  value={formatNumber(current?.hits ?? null)}
                />

                <StatBlock
                  label="Home Runs"
                  value={formatNumber(current?.home_runs ?? null)}
                />

                <StatBlock
                  label="RBI"
                  value={formatNumber(current?.rbi ?? null)}
                />

                <StatBlock
                  label="Strikeouts"
                  value={formatNumber(current?.strikeouts ?? null)}
                />
              </div>
            ) : (
              <div className="grid grid-cols-2">
                <StatBlock
                  label="Innings"
                  value={formatInnings(current?.innings_pitched ?? null)}
                />

                <StatBlock
                  label="Earned Runs"
                  value={formatNumber(current?.earned_runs ?? null)}
                />

                <StatBlock
                  label="Hits Allowed"
                  value={formatNumber(current?.hits_allowed ?? null)}
                />

                <StatBlock
                  label="Walks"
                  value={formatNumber(current?.walks_allowed ?? null)}
                />

                <StatBlock
                  label="Strikeouts"
                  value={formatNumber(current?.strikeouts_pitched ?? null)}
                />

                <StatBlock
                  label="Wins"
                  value={formatNumber(current?.wins ?? null)}
                />
              </div>
            )}
          </div>

          {/* Percentile comparison */}
          <div className="border border-[#1A2842]/15 bg-[#1A2842] p-6 text-white">
            <div className="flex items-end justify-between border-b border-white/10 pb-5">
              <div>
                <p className="text-[9px] font-black uppercase tracking-[0.2em] text-[#59B3AD]">
                  League Context
                </p>

                <h3 className="mt-1 text-xl font-black">
                  Relative Performance
                </h3>
              </div>

              <span className="font-mono text-[9px] text-white/25">
                {selectedSeason}
              </span>
            </div>

            <div className="mt-7 space-y-6">
              {!isPitcher ? (
                <>
                  <AttributeBar
                    attribute={{
                      label: "BATTING AVG",
                      percentile: avgPct,
                      value: formatAverage(current?.batting_avg ?? null),
                      color: "coral",
                    }}
                  />

                  <AttributeBar
                    attribute={{
                      label: "ON BASE",
                      percentile: obpPct,
                      value: formatAverage(current?.obp ?? null),
                      color: "teal",
                    }}
                  />

                  <AttributeBar
                    attribute={{
                      label: "POWER",
                      percentile: slgPct,
                      value: formatAverage(current?.slg ?? null),
                      color: "coral",
                    }}
                  />

                  <AttributeBar
                    attribute={{
                      label: "OVERALL PRODUCTION",
                      percentile: opsPct,
                      value: formatDecimal(current?.ops ?? null),
                      color: "teal",
                    }}
                  />
                </>
              ) : (
                <>
                  <AttributeBar
                    attribute={{
                      label: "ERA",
                      percentile: eraPct,
                      value: formatDecimal(current?.era ?? null),
                      color: "coral",
                    }}
                  />

                  <AttributeBar
                    attribute={{
                      label: "WHIP",
                      percentile: whipPct,
                      value: formatDecimal(current?.whip ?? null),
                      color: "teal",
                    }}
                  />

                  <AttributeBar
                    attribute={{
                      label: "K / 9",
                      percentile: k9Pct,
                      value: kPer9 !== null ? kPer9.toFixed(1) : "-",
                      color: "coral",
                    }}
                  />

                  <AttributeBar
                    attribute={{
                      label: "BB / 9",
                      percentile: bb9Pct,
                      value: bbPer9 !== null ? bbPer9.toFixed(1) : "-",
                      color: "teal",
                    }}
                  />
                </>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* ====================================================== */}
      {/* STATCAST PLACEHOLDER */}
      {/* ====================================================== */}

      <section className="mx-auto max-w-[1440px] px-5 pb-12 md:px-8">
        <SectionHeader
          eyebrow="Advanced Data"
          title="Statcast"
          accent="teal"
        />

        <div className="mt-6 overflow-hidden bg-[#101A2C] text-white">
          <div className="grid lg:grid-cols-[300px_1fr]">
            <div className="border-b border-white/10 bg-[#0B1423] p-7 lg:border-b-0 lg:border-r">
              <p className="text-[9px] font-black uppercase tracking-[0.2em] text-[#59B3AD]">
                Next Layer
              </p>

              <h3 className="mt-3 text-3xl font-black">
                Statcast
              </h3>

              <p className="mt-4 text-xs leading-6 text-white/40">
                Deeper player measurements will populate this section as
                Offshore Break's Statcast data layer is added.
              </p>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4">
              {[
                "Exit Velocity",
                "Hard-Hit %",
                "Barrel %",
                "xBA",
                "xSLG",
                "xwOBA",
                "Chase %",
                "Whiff %",
              ].map((label) => (
                <div
                  key={label}
                  className="border-b border-r border-white/10 p-6"
                >
                  <p className="font-mono text-3xl font-black text-white/20">
                    —
                  </p>

                  <p className="mt-3 text-[8px] font-black uppercase tracking-[0.16em] text-white/35">
                    {label}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ====================================================== */}
      {/* PLAYER ACTIONS */}
      {/* ====================================================== */}

      <section className="mx-auto max-w-[1440px] px-5 pb-12 md:px-8">
        <div className="border border-[#1A2842]/15 bg-[#1A2842] p-6 text-white md:flex md:items-center md:justify-between md:px-8">
          <div>
            <p className="text-[9px] font-black uppercase tracking-[0.2em] text-[#59B3AD]">
              Keep Exploring
            </p>
            <h3 className="mt-2 text-2xl font-black tracking-[-0.03em]">
              Put {player.name} in context.
            </h3>
            <p className="mt-2 max-w-xl text-xs leading-5 text-white/40">
              Compare this player head-to-head, browse the full player index,
              or jump back into the broader Offshore Break dataset.
            </p>
          </div>

          <div className="mt-5 flex flex-wrap gap-2 md:mt-0 md:justify-end">
            <Link
              href={`/compare?player1=${player.id}`}
              className="inline-flex items-center border border-[#D85F46] bg-[#D85F46] px-5 py-3 text-[9px] font-black uppercase tracking-[0.15em] text-white transition hover:border-[#59B3AD] hover:bg-[#59B3AD]"
            >
              Compare →
            </Link>

            <Link
              href="/leaders"
              className="inline-flex items-center border border-white/15 bg-white/[0.04] px-5 py-3 text-[9px] font-black uppercase tracking-[0.15em] text-white/65 transition hover:border-white/30 hover:bg-white/[0.08] hover:text-white"
            >
              Leaderboards →
            </Link>

            <Link
              href="/players"
              className="inline-flex items-center border border-white/15 bg-white/[0.04] px-5 py-3 text-[9px] font-black uppercase tracking-[0.15em] text-white/65 transition hover:border-white/30 hover:bg-white/[0.08] hover:text-white"
            >
              Players →
            </Link>
          </div>
        </div>
      </section>

      {/* ====================================================== */}
      {/* CAREER */}
      {/* ====================================================== */}

      <section
        id="career"
        className="mx-auto max-w-[1440px] px-5 pb-20 md:px-8"
      >
        <SectionHeader
          eyebrow="Career"
          title="Season History"
          accent="teal"
        />

        <div className="mt-6 overflow-x-auto border border-[#1A2842]/15">
          <div className="min-w-[700px]">
            {/* Header */}
            <div className="grid grid-cols-[110px_repeat(5,1fr)] bg-[#1A2842] px-4 py-4 text-[8px] font-black uppercase tracking-[0.16em] text-white/50">
              <span>Season</span>
              <span>G</span>
              <span>AVG</span>
              <span>OPS</span>
              <span>HR</span>
              <span>ERA</span>
            </div>

            {stats.map((stat) => (
              <Link
                key={stat.season}
                href={`/players/${player.id}?season=${stat.season}`}
                className={`grid grid-cols-[110px_repeat(5,1fr)] border-b border-[#1A2842]/10 px-4 py-5 text-xs transition hover:bg-white ${
                  stat.season === selectedSeason
                    ? "bg-[#D85F46]/5"
                    : ""
                }`}
              >
                <span className="font-mono font-black">
                  {stat.season}
                </span>

                <span>{formatNumber(stat.games)}</span>

                <span className="font-bold">
                  {formatAverage(stat.batting_avg)}
                </span>

                <span className="font-bold">
                  {formatDecimal(stat.ops)}
                </span>

                <span>{formatNumber(stat.home_runs)}</span>

                <span>{formatDecimal(stat.era)}</span>
              </Link>
            ))}
          </div>
        </div>
      </section>
    </main>
  );
}