import type { Metadata } from "next";
import Link from "next/link";
import { supabase } from "@/lib/supabaseClient";
import { fetchAll, getThresholds } from "@/lib/baseball";

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

/* a stat row for ANY player, used to build the league comparison pool */
type LeagueStat = PlayerStat & { player_id: number };

type StatcastStat = {
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

type Attribute = {
  label: string;
  percentile: number | null;
  value: string;
  color: "coral" | "teal" | "blue";
};

type View = "hitting" | "pitching";

const STAT_COLUMNS =
  "season, games, at_bats, hits, home_runs, rbi, walks, strikeouts, batting_avg, obp, slg, ops, innings_pitched, wins, losses, earned_runs, hits_allowed, walks_allowed, strikeouts_pitched, era, whip";

const LEAGUE_COLUMNS = `player_id, ${STAT_COLUMNS}`;

/* ───────────────────────── Page title ───────────────────────── */

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  const playerId = Number(id);

  if (!Number.isInteger(playerId)) return { title: "Player not found" };

  const { data } = await supabase
    .from("Player")
    .select("name, position")
    .eq("id", playerId)
    .maybeSingle();

  if (!data) return { title: "Player not found" };

  return {
    title: data.name,
    description: `${data.name}${data.position ? ` (${data.position})` : ""}: season stats, league percentiles and Statcast data on Offshore Break.`,
  };
}

/* ───────────────────────── Formatting ───────────────────────── */

function formatAverage(value: number | null) {
  if (value === null) return "-";
  return value.toFixed(3).replace(/^0/, "");
}

function formatNumber(value: number | null) {
  if (value === null) return "-";
  return value.toLocaleString();
}

/* three decimals: OPS, xSLG, xwOBA */
function formatDecimal(value: number | null) {
  if (value === null) return "-";
  return value.toFixed(3);
}

/* two decimals: ERA, WHIP */
function formatEra(value: number | null) {
  if (value === null) return "-";
  return value.toFixed(2);
}

function formatPercent(value: number | null) {
  if (value === null) return "-";
  return `${(value * 100).toFixed(1)}%`;
}

function formatInnings(value: number | null) {
  if (value === null) return "-";
  return value.toFixed(1);
}

/* 1st, 2nd, 3rd, 4th ... 11th, 12th, 13th ... 21st */
function ordinal(n: number) {
  const lastTwo = n % 100;
  if (lastTwo >= 11 && lastTwo <= 13) return `${n}th`;

  switch (n % 10) {
    case 1:
      return `${n}st`;
    case 2:
      return `${n}nd`;
    case 3:
      return `${n}rd`;
    default:
      return `${n}th`;
  }
}

/* ───────────────────────── Math helpers ───────────────────────── */

/** numerator / denominator * scale, or null if either is missing or the denominator is 0 */
function rate(
  numerator: number | null | undefined,
  denominator: number | null | undefined,
  scale = 1
) {
  if (
    numerator === null ||
    numerator === undefined ||
    denominator === null ||
    denominator === undefined ||
    denominator <= 0
  ) {
    return null;
  }

  return (numerator / denominator) * scale;
}

function population<T>(rows: T[], getter: (row: T) => number | null) {
  return rows
    .map(getter)
    .filter((value): value is number => value !== null && Number.isFinite(value));
}

/**
 * Where a value ranks among a pool of qualified players, 0 to 100.
 * Same formula as the Compare page, so the numbers match everywhere.
 * Returns null when there is nothing to compare against.
 */
function getPercentile(
  value: number | null,
  values: number[],
  higherIsBetter = true
) {
  if (value === null || !Number.isFinite(value) || values.length < 2) {
    return null;
  }

  const better = values.filter((other) =>
    higherIsBetter ? other < value : other > value
  ).length;

  return Math.max(
    0,
    Math.min(100, Math.round((better / (values.length - 1)) * 100))
  );
}

/* ───────────────────────── Components ───────────────────────── */

function Headshot({ playerId }: { playerId: number }) {
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={`https://img.mlbstatic.com/mlb-photos/image/upload/w_500,q_auto:good/v1/people/${playerId}/headshot/67/current`}
      alt=""
      className="h-full w-full object-contain"
    />
  );
}

function TeamLogo({ teamId }: { teamId: string }) {
  return (
    // eslint-disable-next-line @next/next/no-img-element
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
            {attribute.percentile ?? "—"}
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
            width: `${attribute.percentile ?? 0}%`,
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
  percentile?: number | null;
}) {
  return (
    <div className="border-r border-b border-[#1A2842]/15 px-5 py-5">
      <p className="font-mono text-2xl font-black tracking-tight">{value}</p>

      <p className="mt-1 text-[8px] font-black uppercase tracking-[0.18em] text-[#687384]">
        {label}
      </p>

      {percentile !== undefined && percentile !== null && percentile > 0 && (
        <p className="mt-3 font-mono text-[8px] font-bold text-[#D85F46]">
          {ordinal(percentile)} percentile
        </p>
      )}
    </div>
  );
}

/* ───────────────────────── Page ───────────────────────── */

export default async function PlayerPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams?: Promise<{ season?: string; view?: string }>;
}) {
  const { id } = await params;
  const playerId = Number(id);

  const queryParams = searchParams ? await searchParams : {};
  const requestedSeason = Number(queryParams.season);

  const [
    { data: player },
    { data: playerStats },
    { data: teams },
    { data: statcastRows },
  ] = await Promise.all([
    supabase
      .from("Player")
      .select("id, name, team_id, position")
      .eq("id", playerId)
      .single(),

    supabase
      .from("PlayerStats")
      .select(STAT_COLUMNS)
      .eq("player_id", playerId)
      .order("season", { ascending: false }),

    supabase.from("Teams").select("id, name, abbreviation"),

    supabase
      .from("player_statcast_season")
      .select(
        "season, batted_ball_events, avg_exit_velocity, max_exit_velocity, hard_hit_rate, barrel_rate, avg_launch_angle, xba, xslg, xwoba"
      )
      .eq("player_id", playerId)
      .order("season", { ascending: false }),
  ]);

  if (!player) {
    return (
      <div className="bg-[#F8F3EA] px-6 py-20 text-[#1A2842]">
        <div className="container-wide ">
          <p className="text-[10px] font-black uppercase tracking-[0.2em] text-[#D85F46]">
            Offshore Break
          </p>

          <h1 className="mt-3 text-4xl font-black">Player not found</h1>

          <Link
            href="/players"
            className="mt-6 inline-block text-sm font-bold text-[#D85F46]"
          >
            ← Back to players
          </Link>
        </div>
      </div>
    );
  }

  const stats = (playerStats ?? []) as PlayerStat[];
  const statcastStats = (statcastRows ?? []) as StatcastStat[];

  const teamMap = new Map<string, Team>(
    (teams ?? []).map((team) => [team.id, team as Team])
  );

  const team = player.team_id ? teamMap.get(player.team_id) : undefined;
  const latestSeason = stats[0]?.season ?? 2026;

  const selectedSeason =
    Number.isFinite(requestedSeason) &&
    stats.some((stat) => stat.season === requestedSeason)
      ? requestedSeason
      : latestSeason;

  const current =
    stats.find((stat) => stat.season === selectedSeason) ?? null;

  const statcast =
    statcastRows === null
      ? null
      : (statcastStats.find((row) => row.season === selectedSeason) ?? null);

  /* ── League pool: every player that season, paged past the 1,000-row cap ── */
  const leagueStats = await fetchAll<LeagueStat>((from, to) =>
    supabase
      .from("PlayerStats")
      .select(LEAGUE_COLUMNS)
      .eq("season", selectedSeason)
      .order("player_id")
      .range(from, to)
  );

  /* Only qualified players count, so a 1-for-1 September call-up can't skew anything */
  const { minAb, minIp } = getThresholds(leagueStats);

  const hitterPool = leagueStats.filter((s) => (s.at_bats ?? 0) >= minAb);
  const pitcherPool = leagueStats.filter(
    (s) => (s.innings_pitched ?? 0) >= minIp
  );

  const hitPct = (
    value: number | null,
    getter: (s: LeagueStat) => number | null,
    higherIsBetter = true
  ) => getPercentile(value, population(hitterPool, getter), higherIsBetter);

  const pitchPct = (
    value: number | null,
    getter: (s: LeagueStat) => number | null,
    higherIsBetter = true
  ) => getPercentile(value, population(pitcherPool, getter), higherIsBetter);

  /* ── Hitter or pitcher? Two-way players get a toggle. ── */
  const atBats = current?.at_bats ?? 0;
  const inningsPitched = current?.innings_pitched ?? 0;
  const hasHitting = atBats > 0;
  const hasPitching = inningsPitched > 0;

  // whichever side has more volume is the default (3 outs per inning vs at-bats),
  // so a catcher who pitched one inning still shows as a hitter
  const defaultView: View =
    hasPitching && (!hasHitting || inningsPitched * 3 > atBats)
      ? "pitching"
      : "hitting";

  const showViewToggle =
    hasHitting &&
    hasPitching &&
    atBats >= minAb * 0.25 &&
    inningsPitched >= minIp * 0.25;

  const view: View =
    showViewToggle &&
    (queryParams.view === "hitting" || queryParams.view === "pitching")
      ? queryParams.view
      : defaultView;

  const isPitcher = view === "pitching";

  function profileHref(season: number, nextView: View = view) {
    return `/players/${player!.id}?season=${season}${
      showViewToggle ? `&view=${nextView}` : ""
    }`;
  }

  const qualified = isPitcher ? inningsPitched >= minIp : atBats >= minAb;

  /* ── Rates ── */
  const hrPerGame = rate(current?.home_runs, current?.games);
  const rbiPerGame = rate(current?.rbi, current?.games);
  const bbRate = rate(current?.walks, current?.at_bats);
  const kRate = rate(current?.strikeouts, current?.at_bats);
  const kPer9 = rate(current?.strikeouts_pitched, current?.innings_pitched, 9);
  const bbPer9 = rate(current?.walks_allowed, current?.innings_pitched, 9);

  /* ── Percentiles (hitters vs qualified hitters, pitchers vs qualified pitchers) ── */
  const avgPct = hitPct(current?.batting_avg ?? null, (s) => s.batting_avg);
  const obpPct = hitPct(current?.obp ?? null, (s) => s.obp);
  const slgPct = hitPct(current?.slg ?? null, (s) => s.slg);
  const opsPct = hitPct(current?.ops ?? null, (s) => s.ops);
  const hrPct = hitPct(hrPerGame, (s) => rate(s.home_runs, s.games));
  const rbiPct = hitPct(rbiPerGame, (s) => rate(s.rbi, s.games));
  const bbPct = hitPct(bbRate, (s) => rate(s.walks, s.at_bats));
  const kAvoidPct = hitPct(kRate, (s) => rate(s.strikeouts, s.at_bats), false);

  const eraPct = pitchPct(current?.era ?? null, (s) => s.era, false);
  const whipPct = pitchPct(current?.whip ?? null, (s) => s.whip, false);
  const k9Pct = pitchPct(kPer9, (s) =>
    rate(s.strikeouts_pitched, s.innings_pitched, 9)
  );
  const bb9Pct = pitchPct(
    bbPer9,
    (s) => rate(s.walks_allowed, s.innings_pitched, 9),
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
      value: formatEra(current?.era ?? null),
      color: "coral",
    },
    {
      label: "WHIP",
      percentile: whipPct,
      value: formatEra(current?.whip ?? null),
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
      percentile: pitchPct(
        current?.innings_pitched ?? null,
        (s) => s.innings_pitched
      ),
      value: formatInnings(current?.innings_pitched ?? null),
      color: "blue",
    },
    {
      label: "STRIKEOUTS",
      percentile: pitchPct(
        current?.strikeouts_pitched ?? null,
        (s) => s.strikeouts_pitched
      ),
      value: formatNumber(current?.strikeouts_pitched ?? null),
      color: "blue",
    },
  ];

  const attributes = isPitcher ? pitchingAttributes : hittingAttributes;

  return (
    <div className="bg-[#F8F3EA] text-[#1A2842]">
      <section className="overflow-hidden bg-[#101A2C] text-white">
        <div className="container-wide ">
          <div className="grid min-h-[430px] lg:grid-cols-[330px_1fr_280px]">
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

              {showViewToggle && (
                <div
                  className="mt-4 flex gap-1"
                  role="group"
                  aria-label="Choose hitting or pitching stats"
                >
                  {(["hitting", "pitching"] as const).map((option) => (
                    <Link
                      key={option}
                      href={profileHref(selectedSeason, option)}
                      aria-current={view === option ? "true" : undefined}
                      className={`border px-4 py-2 text-[9px] font-black uppercase tracking-[0.15em] transition ${
                        view === option
                          ? "border-[#59B3AD] bg-[#59B3AD] text-[#0B1423]"
                          : "border-white/15 text-white/50 hover:border-white/30 hover:text-white"
                      }`}
                    >
                      {option}
                    </Link>
                  ))}
                </div>
              )}

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
                        {formatEra(current?.era ?? null)}
                      </p>
                      <p className="mt-1 text-[8px] font-black uppercase tracking-widest text-white/30">
                        ERA
                      </p>
                    </div>
                    <div className="border-r border-white/10 py-4 pl-4">
                      <p className="font-mono text-2xl font-black">
                        {formatEra(current?.whip ?? null)}
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
                      href={profileHref(stat.season)}
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

      <div className="border-b border-[#1A2842]/15 bg-[#101A2C] text-white">
        <div className="container-page flex overflow-x-auto">
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

      <section
        id="profile"
        className="container-page paper-grid py-12"
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
                <AttributeBar key={attribute.label} attribute={attribute} />
              ))}

              <div className="border-t border-white/10 pt-5 md:col-span-2">
                <p className="text-[8px] font-black uppercase tracking-[0.18em] text-white/25">
                  Data Note
                </p>
                <p className="mt-2 max-w-3xl text-[10px] leading-5 text-white/35">
                  Percentiles compare this player against qualified{" "}
                  {isPitcher
                    ? `pitchers (${minIp}+ IP)`
                    : `hitters (${minAb}+ AB)`}{" "}
                  in the {selectedSeason} season. They are Offshore Break
                  league-context percentiles, not official MLB Statcast
                  percentiles.
                  {!qualified &&
                    (isPitcher
                      ? ` ${player.name} has ${formatInnings(current?.innings_pitched ?? null)} IP, below the cutoff, so these rest on a small sample.`
                      : ` ${player.name} has ${formatNumber(current?.at_bats ?? null)} AB, below the cutoff, so these rest on a small sample.`)}
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="container-page pb-12">
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
            <StatBlock label="H" value={formatNumber(current?.hits ?? null)} />
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
              value={formatEra(current?.era ?? null)}
              percentile={eraPct}
            />
            <StatBlock
              label="WHIP"
              value={formatEra(current?.whip ?? null)}
              percentile={whipPct}
            />
            <StatBlock
              label="K"
              value={formatNumber(current?.strikeouts_pitched ?? null)}
              percentile={k9Pct}
            />
            <StatBlock label="W" value={formatNumber(current?.wins ?? null)} />
            <StatBlock label="L" value={formatNumber(current?.losses ?? null)} />
          </div>
        )}
      </section>

      <section
        id="performance"
        className="container-page pb-12"
      >
        <SectionHeader eyebrow="Performance" title="At A Glance" />

        <div className="mt-6 grid gap-6 lg:grid-cols-2">
          <div className="border border-[#1A2842]/15 bg-white/20">
            <div className="border-b border-[#1A2842]/15 px-6 py-5">
              <p className="text-[9px] font-black uppercase tracking-[0.2em] text-[#D85F46]">
                {isPitcher ? "Pitching" : "At The Plate"}
              </p>
            </div>

            {!isPitcher ? (
              <div className="grid grid-cols-2">
                <StatBlock label="Games" value={formatNumber(current?.games ?? null)} />
                <StatBlock label="At Bats" value={formatNumber(current?.at_bats ?? null)} />
                <StatBlock label="Hits" value={formatNumber(current?.hits ?? null)} />
                <StatBlock label="Home Runs" value={formatNumber(current?.home_runs ?? null)} />
                <StatBlock label="RBI" value={formatNumber(current?.rbi ?? null)} />
                <StatBlock label="Strikeouts" value={formatNumber(current?.strikeouts ?? null)} />
              </div>
            ) : (
              <div className="grid grid-cols-2">
                <StatBlock label="Innings" value={formatInnings(current?.innings_pitched ?? null)} />
                <StatBlock label="Earned Runs" value={formatNumber(current?.earned_runs ?? null)} />
                <StatBlock label="Hits Allowed" value={formatNumber(current?.hits_allowed ?? null)} />
                <StatBlock label="Walks" value={formatNumber(current?.walks_allowed ?? null)} />
                <StatBlock label="Strikeouts" value={formatNumber(current?.strikeouts_pitched ?? null)} />
                <StatBlock label="Wins" value={formatNumber(current?.wins ?? null)} />
              </div>
            )}
          </div>

          <div className="border border-[#1A2842]/15 bg-[#1A2842] p-6 text-white">
            <div className="flex items-end justify-between border-b border-white/10 pb-5">
              <div>
                <p className="text-[9px] font-black uppercase tracking-[0.2em] text-[#59B3AD]">
                  League Context
                </p>
                <h3 className="mt-1 text-xl font-black">Relative Performance</h3>
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
                      value: formatEra(current?.era ?? null),
                      color: "coral",
                    }}
                  />
                  <AttributeBar
                    attribute={{
                      label: "WHIP",
                      percentile: whipPct,
                      value: formatEra(current?.whip ?? null),
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

      <section className="container-page pb-12">
        <SectionHeader eyebrow="Advanced Data" title="Statcast" accent="teal" />

        <div className="mt-6 overflow-hidden bg-[#101A2C] text-white">
          <div className="grid lg:grid-cols-[300px_1fr]">
            <div className="border-b border-white/10 bg-[#0B1423] p-7 lg:border-b-0 lg:border-r">
              <p className="text-[9px] font-black uppercase tracking-[0.2em] text-[#59B3AD]">
                {selectedSeason} Season
              </p>
              <h3 className="mt-3 text-3xl font-black">Batted Ball Data</h3>
              <p className="mt-4 text-xs leading-6 text-white/40">
                {statcast
                  ? `${formatNumber(statcast.batted_ball_events)} batted-ball events.`
                  : "No Statcast data is available for this player and season."}
              </p>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4">
              {[
                {
                  label: "Avg Exit Velocity",
                  value: statcast?.avg_exit_velocity?.toFixed(1) ?? "-",
                  unit: "mph",
                },
                {
                  label: "Max Exit Velocity",
                  value: statcast?.max_exit_velocity?.toFixed(1) ?? "-",
                  unit: "mph",
                },
                {
                  label: "Hard-Hit Rate",
                  value: formatPercent(statcast?.hard_hit_rate ?? null),
                  unit: "",
                },
                {
                  label: "Barrel Rate",
                  value: formatPercent(statcast?.barrel_rate ?? null),
                  unit: "",
                },
                {
                  label: "Avg Launch Angle",
                  value: statcast?.avg_launch_angle?.toFixed(1) ?? "-",
                  unit: "°",
                },
                {
                  label: "xBA",
                  value: formatAverage(statcast?.xba ?? null),
                  unit: "",
                },
                {
                  label: "xSLG",
                  value: formatDecimal(statcast?.xslg ?? null),
                  unit: "",
                },
                {
                  label: "xwOBA",
                  value: formatDecimal(statcast?.xwoba ?? null),
                  unit: "",
                },
              ].map((metric) => (
                <div
                  key={metric.label}
                  className="border-b border-r border-white/10 p-6"
                >
                  <p className="font-mono text-3xl font-black text-white">
                    {metric.value}
                    {metric.unit && (
                      <span className="ml-1 text-sm text-white/50">
                        {metric.unit}
                      </span>
                    )}
                  </p>
                  <p className="mt-3 text-[8px] font-black uppercase tracking-[0.16em] text-white/35">
                    {metric.label}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className="container-page pb-12">
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

      <section
        id="career"
        className="container-page pb-20"
      >
        <SectionHeader eyebrow="Career" title="Season History" accent="teal" />

        <div className="mt-6 overflow-x-auto border border-[#1A2842]/15">
          <div className="min-w-[700px]">
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
                href={profileHref(stat.season)}
                className={`grid grid-cols-[110px_repeat(5,1fr)] border-b border-[#1A2842]/10 px-4 py-5 text-xs transition hover:bg-white ${
                  stat.season === selectedSeason ? "bg-[#D85F46]/5" : ""
                }`}
              >
                <span className="font-mono font-black">{stat.season}</span>
                <span>{formatNumber(stat.games)}</span>
                <span className="font-bold">{formatAverage(stat.batting_avg)}</span>
                <span className="font-bold">{formatDecimal(stat.ops)}</span>
                <span>{formatNumber(stat.home_runs)}</span>
                <span>{formatEra(stat.era)}</span>
              </Link>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}
