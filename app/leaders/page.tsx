"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import {
  SEASON,
  fetchAll,
  formatAverage,
  formatDecimal,
  formatInnings,
  formatNumber,
  getTeamColors,
  getThresholds,
  teamLogo,
} from "@/lib/baseball";
import PlayerPhoto from "@/components/PlayerPhoto";

/* ───────────────────────── Types ───────────────────────── */

type Player = {
  id: number;
  name: string;
  team_id: string;
  position: string;
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

type PlayerRow = Player & {
  stats?: PlayerStat;
  team?: Team;
};

type Category = {
  key: keyof PlayerStat;
  label: string;
  shortLabel: string;
  type: "hitting" | "pitching";
  format: "number" | "average" | "decimal" | "innings";
  direction: "high" | "low";
  qualified: boolean;
};

type Thresholds = {
  minAb: number;
  minIp: number;
};

/* ───────────────────────── Categories ───────────────────────── */

const hittingCategories: Category[] = [
  {
    key: "ops",
    label: "On-Base Plus Slugging",
    shortLabel: "OPS",
    type: "hitting",
    format: "average",
    direction: "high",
    qualified: true,
  },
  {
    key: "batting_avg",
    label: "Batting Average",
    shortLabel: "AVG",
    type: "hitting",
    format: "average",
    direction: "high",
    qualified: true,
  },
  {
    key: "obp",
    label: "On-Base Percentage",
    shortLabel: "OBP",
    type: "hitting",
    format: "average",
    direction: "high",
    qualified: true,
  },
  {
    key: "slg",
    label: "Slugging Percentage",
    shortLabel: "SLG",
    type: "hitting",
    format: "average",
    direction: "high",
    qualified: true,
  },
  {
    key: "home_runs",
    label: "Home Runs",
    shortLabel: "HR",
    type: "hitting",
    format: "number",
    direction: "high",
    qualified: false,
  },
  {
    key: "rbi",
    label: "Runs Batted In",
    shortLabel: "RBI",
    type: "hitting",
    format: "number",
    direction: "high",
    qualified: false,
  },
  {
    key: "hits",
    label: "Hits",
    shortLabel: "H",
    type: "hitting",
    format: "number",
    direction: "high",
    qualified: false,
  },
  {
    key: "walks",
    label: "Walks",
    shortLabel: "BB",
    type: "hitting",
    format: "number",
    direction: "high",
    qualified: false,
  },
  {
    key: "strikeouts",
    label: "Fewest Strikeouts",
    shortLabel: "K",
    type: "hitting",
    format: "number",
    direction: "low",
    qualified: true,
  },
];

const pitchingCategories: Category[] = [
  {
    key: "era",
    label: "Earned Run Average",
    shortLabel: "ERA",
    type: "pitching",
    format: "decimal",
    direction: "low",
    qualified: true,
  },
  {
    key: "whip",
    label: "Walks + Hits / Inning",
    shortLabel: "WHIP",
    type: "pitching",
    format: "decimal",
    direction: "low",
    qualified: true,
  },
  {
    key: "strikeouts_pitched",
    label: "Strikeouts",
    shortLabel: "K",
    type: "pitching",
    format: "number",
    direction: "high",
    qualified: false,
  },
  {
    key: "innings_pitched",
    label: "Innings Pitched",
    shortLabel: "IP",
    type: "pitching",
    format: "innings",
    direction: "high",
    qualified: false,
  },
  {
    key: "wins",
    label: "Wins",
    shortLabel: "W",
    type: "pitching",
    format: "number",
    direction: "high",
    qualified: false,
  },
  {
    key: "losses",
    label: "Fewest Losses",
    shortLabel: "L",
    type: "pitching",
    format: "number",
    direction: "low",
    qualified: true,
  },
  {
    key: "earned_runs",
    label: "Fewest Earned Runs",
    shortLabel: "ER",
    type: "pitching",
    format: "number",
    direction: "low",
    qualified: true,
  },
];

/* ───────────────────────── Helpers ───────────────────────── */

function formatStat(
  value: number | null | undefined,
  format: Category["format"]
) {
  switch (format) {
    case "average":
      return formatAverage(value);

    case "decimal":
      return formatDecimal(value);

    case "innings":
      return formatInnings(value);

    default:
      return formatNumber(value);
  }
}

function qualifies(
  player: PlayerRow,
  category: Category,
  thresholds: Thresholds
) {
  const stats = player.stats;

  if (!stats) {
    return false;
  }

  if (category.type === "hitting") {
    return (
      (stats.at_bats ?? 0) >=
      (category.qualified ? thresholds.minAb : 1)
    );
  }

  return (
    (stats.innings_pitched ?? 0) >=
    (category.qualified ? thresholds.minIp : 1)
  );
}

function rankPlayers(
  players: PlayerRow[],
  category: Category,
  thresholds: Thresholds,
  limit: number
) {
  return players
    .filter(
      (player) =>
        player.stats?.[category.key] != null &&
        qualifies(player, category, thresholds)
    )
    .sort((a, b) => {
      const aValue = Number(a.stats?.[category.key] ?? 0);
      const bValue = Number(b.stats?.[category.key] ?? 0);

      return category.direction === "high"
        ? bValue - aValue
        : aValue - bValue;
    })
    .slice(0, limit);
}

/* ───────────────────────── Team Tile ───────────────────────── */

function TeamTile({
  teamId,
  teamName,
}: {
  teamId?: string;
  teamName?: string;
}) {
  const backgroundColor = getTeamColors(teamName).primary;

  const [logoFailed, setLogoFailed] = useState(false);

  useEffect(() => {
    setLogoFailed(false);
  }, [teamId]);

  return (
    <div
      className="flex h-8 w-8 shrink-0 items-center justify-center"
      style={{ backgroundColor }}
    >
      {teamId && !logoFailed ? (
        <img
          src={teamLogo(teamId)}
          alt=""
          aria-hidden="true"
          className="h-6 w-6 object-contain"
          onError={() => setLogoFailed(true)}
        />
      ) : (
        <span className="font-mono text-[0.6rem] font-bold text-white">
          {teamId ? teamId.slice(0, 2).toUpperCase() : "FA"}
        </span>
      )}
    </div>
  );
}

/* ───────────────────────── Leader Row ───────────────────────── */

function LeaderRow({
  player,
  rank,
  value,
  hot = false,
  size = "md",
  photoContext = "batting",
}: {
  player: PlayerRow;
  rank: number;
  value: string;
  hot?: boolean;
  size?: "md" | "lg";
  photoContext?: "batting" | "pitching" | "fielding" | "baserunning" | "general";
}) {
  const photoSize =
    size === "lg"
      ? "h-20 w-20"
      : "h-16 w-16";

  return (
    <Link
      href={`/players/${player.id}`}
      className={`group relative flex items-center gap-4 border-b border-[#1A2842]/10 px-5 transition-colors last:border-0 hover:bg-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#D85F46] ${
        size === "lg"
          ? "min-h-[6rem] py-4"
          : "min-h-[5rem] py-3"
      }`}
    >
      <span
        className={`w-7 shrink-0 font-mono text-sm font-bold ${
          hot
            ? "text-[#D85F46]"
            : "text-[#1F7A74]"
        }`}
      >
        {String(rank).padStart(2, "0")}
      </span>

      <div
        className={`${photoSize} shrink-0 overflow-hidden rounded-full bg-[#E8E1D5]`}
      >
        <PlayerPhoto
          playerId={player.id}
          playerName={player.name}
          context={photoContext}
          objectFit="cover"
          objectPosition="center"
        />
      </div>

      <div className="min-w-0 flex-1">
        <p className="truncate text-base font-bold group-hover:text-[#D85F46]">
          {player.name}
        </p>

        <div className="mt-1.5 flex items-center gap-2">
          <TeamTile
            teamId={player.team?.id}
            teamName={player.team?.name}
          />

          <span className="font-mono text-xs font-semibold text-[#1F7A74]">
            {player.team?.abbreviation ?? "FA"}
          </span>

          <span className="text-[#687384]/50">
            ·
          </span>

          <span className="truncate text-xs text-[#687384]">
            {player.position || "—"}
          </span>
        </div>
      </div>

      <p
        className={`shrink-0 font-mono text-lg font-bold ${
          hot
            ? "text-[#D85F46]"
            : "text-[#1A2842]"
        }`}
      >
        {value}
      </p>
    </Link>
  );
}

/* ───────────────────────── Leaderboard Card ───────────────────────── */

function LeaderboardCard({
  category,
  players,
  thresholds,
}: {
  category: Category;
  players: PlayerRow[];
  thresholds: Thresholds;
}) {
  const ranked = rankPlayers(
    players,
    category,
    thresholds,
    10
  );

  const note = category.qualified
    ? category.type === "hitting"
      ? `Qualified · ${thresholds.minAb}+ AB`
      : `Qualified · ${thresholds.minIp}+ IP`
    : "Season totals";

  const photoContext =
    category.type === "pitching"
      ? "pitching"
      : "batting";

  return (
    <section className="overflow-hidden border-t-2 border-[#1A2842] bg-[#FCF9F3]">
      <div className="border-b border-[#1A2842]/10 px-5 py-5">
        <div className="flex items-end justify-between">
          <div>
            <p className="text-[0.75rem] font-bold uppercase tracking-[0.16em] text-[#1F7A74]">
              {category.type === "hitting"
                ? "Hitting"
                : "Pitching"}
            </p>

            <h3 className="mt-1 text-2xl font-black tracking-tight">
              {category.shortLabel}
            </h3>

            <p className="mt-1 text-sm text-[#687384]">
              {category.label}
            </p>
          </div>

          <span className="font-mono text-xs font-bold text-[#1F7A74]">
            TOP 10
          </span>
        </div>

        <p className="mt-4 border-t border-[#1A2842]/10 pt-3 font-mono text-[0.7rem] font-semibold uppercase tracking-[0.12em] text-[#1F7A74]">
          {note}
        </p>
      </div>

      {ranked.length === 0 ? (
        <div className="px-5 py-10 text-center text-sm text-[#687384]">
          No qualifying stats yet.
        </div>
      ) : (
        ranked.map((player, index) => (
          <LeaderRow
            key={`${String(category.key)}-${player.id}`}
            player={player}
            rank={index + 1}
            value={formatStat(
              player.stats?.[category.key] as
                | number
                | null,
              category.format
            )}
            hot={index === 0}
            photoContext={photoContext}
          />
        ))
      )}

      {ranked.length > 0 && (
        <div className="border-t border-[#1A2842]/10 px-5 py-4">
          <Link
            href={`/players?sort=${String(
              category.key
            )}&dir=${
              category.direction === "low"
                ? "asc"
                : "desc"
            }`}
            className="text-sm font-semibold text-[#1A2842] transition hover:text-[#D85F46]"
          >
            See the full{" "}
            {category.shortLabel} leaderboard →
          </Link>
        </div>
      )}
    </section>
  );
}

/* ───────────────────────── Spotlight ───────────────────────── */

function Spotlight({
  player,
  team,
  stats,
  category,
  view,
}: {
  player: PlayerRow;
  team?: Team;
  stats: [string, string][];
  category: Category;
  view: "hitting" | "pitching";
}) {
  const photoContext =
    view === "pitching"
      ? "pitching"
      : "batting";

  return (
    <div className="relative min-h-[28rem] overflow-hidden bg-[#0B1423] text-white">
      {/* Player photo */}

      <div className="absolute inset-0">
        <PlayerPhoto
          playerId={player.id}
          playerName={player.name}
          context={photoContext}
          objectFit="cover"
          objectPosition="center top"
          priority
        />
      </div>

      {/* Dark gradient over image */}

      <div className="absolute inset-0 bg-gradient-to-t from-[#08111F] via-[#08111F]/45 to-transparent" />

      {/* Top label */}

      <div className="absolute left-5 top-5 z-10">
        <span className="inline-flex bg-[#D85F46] px-3 py-2 text-[0.65rem] font-black uppercase tracking-[0.16em] text-white">
          #1 · {category.label}
        </span>
      </div>

      {/* Team */}

      <div className="absolute right-5 top-5 z-10">
        {team && (
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-white/95">
            <img
              src={teamLogo(team.id)}
              alt=""
              className="h-9 w-9 object-contain"
            />
          </div>
        )}
      </div>

      {/* Player information */}

      <div className="absolute bottom-0 left-0 right-0 z-10 p-6 md:p-8">
        <p className="text-[0.7rem] font-black uppercase tracking-[0.18em] text-[#59B3AD]">
          {team?.name ?? "Free Agent"}
          {" · "}
          {player.position || "—"}
        </p>

        <h3 className="mt-2 text-4xl font-black tracking-[-0.045em] md:text-5xl">
          {player.name}
        </h3>

        <p className="mt-2 max-w-xl text-sm leading-6 text-white/65">
          {view === "hitting"
            ? `The current ${category.shortLabel} leader among Offshore Break's qualified hitters for the ${SEASON} season.`
            : `The current ${category.shortLabel} leader among Offshore Break's qualified pitchers for the ${SEASON} season.`}
        </p>

        <div className="mt-6 grid max-w-xl grid-cols-4 border-y border-white/15">
          {stats.map(([label, value], index) => (
            <div
              key={`${label}-${index}`}
              className={`py-4 ${
                index < stats.length - 1
                  ? "border-r border-white/15"
                  : ""
              } ${index > 0 ? "pl-4" : ""}`}
            >
              <p className="font-mono text-xl font-black">
                {value}
              </p>

              <p className="mt-1 text-[7px] font-black uppercase tracking-[0.15em] text-white/35">
                {label}
              </p>
            </div>
          ))}
        </div>

        <Link
          href={`/players/${player.id}`}
          className="mt-5 inline-block text-xs font-black uppercase tracking-[0.14em] text-white transition hover:text-[#D85F46]"
        >
          View player profile →
        </Link>
      </div>

      <div className="absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r from-[#D85F46] via-[#59B3AD] to-[#6287C7]" />
    </div>
  );
}

/* ───────────────────────── Skeleton ───────────────────────── */

function FrontOfPackSkeleton() {
  return (
    <div
      className="grid gap-4 lg:grid-cols-[1.25fr_1fr]"
      aria-busy="true"
      aria-label="Loading leaders"
    >
      <div className="min-h-[28rem] animate-pulse bg-[#1A2842]/10" />

      <div className="min-h-[28rem] animate-pulse bg-[#1A2842]/5" />
    </div>
  );
}

/* ───────────────────────── Page ───────────────────────── */

export default function LeadersPage() {
  const [players, setPlayers] = useState<Player[]>([]);
  const [stats, setStats] = useState<PlayerStat[]>([]);
  const [teams, setTeams] = useState<Team[]>([]);

  const [view, setView] =
    useState<"hitting" | "pitching">("hitting");

  const [teamFilter, setTeamFilter] =
    useState("All");

  const [loading, setLoading] =
    useState(true);

  const [error, setError] =
    useState("");

  /* ───────────────────────── Data ───────────────────────── */

  useEffect(() => {
    let cancelled = false;

    async function loadData() {
      setLoading(true);
      setError("");

      try {
        const [
          playerData,
          statData,
          teamResult,
        ] = await Promise.all([
          fetchAll<Player>((from, to) =>
            supabase
              .from("Player")
              .select(
                "id, name, team_id, position"
              )
              .order("id")
              .range(from, to)
          ),

          fetchAll<PlayerStat>((from, to) =>
            supabase
              .from("PlayerStats")
              .select("*")
              .eq("season", SEASON)
              .order("player_id")
              .range(from, to)
          ),

          supabase
            .from("Teams")
            .select(
              "id, name, abbreviation"
            )
            .order("name"),
        ]);

        if (teamResult.error) {
          throw teamResult.error;
        }

        if (!cancelled) {
          setPlayers(playerData);
          setStats(statData);
          setTeams(
            (teamResult.data ?? []) as Team[]
          );
        }
      } catch (err) {
        console.error(
          "Failed to load leaderboard data:",
          err
        );

        if (!cancelled) {
          setError(
            "We couldn’t load the leaderboard. Please try again."
          );
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    loadData();

    return () => {
      cancelled = true;
    };
  }, []);

  /* ───────────────────────── Maps ───────────────────────── */

  const thresholds = useMemo(
    () => getThresholds(stats),
    [stats]
  );

  const statMap = useMemo(
    () =>
      new Map(
        stats.map((stat) => [
          stat.player_id,
          stat,
        ])
      ),
    [stats]
  );

  const teamMap = useMemo(
    () =>
      new Map(
        teams.map((team) => [
          team.id,
          team,
        ])
      ),
    [teams]
  );

  const playerRows = useMemo<PlayerRow[]>(
    () =>
      players.map((player) => ({
        ...player,
        stats: statMap.get(player.id),
        team: teamMap.get(player.team_id),
      })),
    [players, statMap, teamMap]
  );

  /* ───────────────────────── Filtering ───────────────────────── */

  const filteredPlayers = useMemo(
    () =>
      playerRows.filter(
        (player) =>
          teamFilter === "All" ||
          player.team_id === teamFilter
      ),
    [playerRows, teamFilter]
  );

  const categories =
    view === "hitting"
      ? hittingCategories
      : pitchingCategories;

  const primaryCategory =
    categories[0];

  const primaryLeaders = useMemo(
    () =>
      rankPlayers(
        [...filteredPlayers],
        primaryCategory,
        thresholds,
        5
      ),
    [
      filteredPlayers,
      primaryCategory,
      thresholds,
    ]
  );

  const teamCount = useMemo(
    () =>
      new Set(
        filteredPlayers
          .map(
            (player) =>
              player.team_id
          )
          .filter(Boolean)
      ).size,
    [filteredPlayers]
  );

  const currentTeamLabel =
    teamFilter === "All"
      ? "MLB"
      : teams.find(
          (team) =>
            team.id === teamFilter
        )?.abbreviation ?? "";

  const topPlayer =
    primaryLeaders[0];

  /* ───────────────────────── Spotlight Stats ───────────────────────── */

  const spotlightStats: [string, string][] =
    topPlayer
      ? view === "hitting"
        ? [
            [
              primaryCategory.shortLabel,
              formatStat(
                topPlayer.stats?.[
                  primaryCategory.key
                ] as number | null,
                primaryCategory.format
              ),
            ],
            [
              "AVG",
              formatAverage(
                topPlayer.stats
                  ?.batting_avg
              ),
            ],
            [
              "HR",
              formatNumber(
                topPlayer.stats
                  ?.home_runs
              ),
            ],
            [
              "RBI",
              formatNumber(
                topPlayer.stats?.rbi
              ),
            ],
          ]
        : [
            [
              primaryCategory.shortLabel,
              formatStat(
                topPlayer.stats?.[
                  primaryCategory.key
                ] as number | null,
                primaryCategory.format
              ),
            ],
            [
              "IP",
              formatInnings(
                topPlayer.stats
                  ?.innings_pitched
              ),
            ],
            [
              "K",
              formatNumber(
                topPlayer.stats
                  ?.strikeouts_pitched
              ),
            ],
            [
              "WHIP",
              formatDecimal(
                topPlayer.stats?.whip
              ),
            ],
          ]
      : [];

  /* ───────────────────────── Render ───────────────────────── */

  return (
    <main className="min-h-screen bg-[#F8F3EA] text-[#1A2842]">

      {/* HERO */}

      <header className="border-b border-[#1A2842]/15">
        <div className="container-page py-10 md:py-14">
          <div className="flex flex-col justify-between gap-8 lg:flex-row lg:items-end">

            <div>
              <div className="flex items-center gap-3">
                <span className="h-[2px] w-8 bg-[#D85F46]" />

                <p className="text-[0.75rem] font-bold uppercase tracking-[0.18em] text-[#1F7A74]">
                  Offshore Break · The numbers
                </p>
              </div>

              <h1 className="mt-5 text-5xl font-black tracking-[-0.055em] md:text-7xl">
                The leaders
              </h1>

              <p className="mt-4 max-w-xl text-base leading-7 text-[#687384]">
                A running look at who’s setting the pace this season.
                Filter by club, then follow any name to the full player
                profile.
              </p>
            </div>

            <div className="flex items-end gap-8 border-l border-[#1A2842]/15 pl-6">
              <div>
                <p className="font-mono text-4xl font-bold">
                  {SEASON}
                </p>

                <p className="mt-1 text-[0.7rem] font-bold uppercase tracking-[0.14em] text-[#1F7A74]">
                  Season
                </p>
              </div>

              <div>
                <p className="font-mono text-4xl font-bold">
                  {teamCount}
                </p>

                <p className="mt-1 text-[0.7rem] font-bold uppercase tracking-[0.14em] text-[#1F7A74]">
                  Clubs represented
                </p>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* FILTERS */}

      <section className="border-b border-[#1A2842]/15 bg-[#FCF9F3]">
        <div className="container-page flex flex-col gap-5 py-5 lg:flex-row lg:items-center lg:justify-between">

          <div
            className="inline-flex border-b border-[#1A2842]/20"
            role="group"
            aria-label="Choose stat category"
          >
            {(
              ["hitting", "pitching"] as const
            ).map((mode) => (
              <button
                key={mode}
                type="button"
                aria-pressed={
                  view === mode
                }
                onClick={() =>
                  setView(mode)
                }
                className={`border-b-2 px-5 py-3 text-base capitalize transition ${
                  view === mode
                    ? "border-[#D85F46] font-bold text-[#1A2842]"
                    : "border-transparent text-[#687384] hover:text-[#1A2842]"
                }`}
              >
                {mode}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-4">
            <label
              htmlFor="team-filter"
              className="text-[0.75rem] font-bold uppercase tracking-[0.14em] text-[#1F7A74]"
            >
              Club
            </label>

            <select
              id="team-filter"
              value={teamFilter}
              onChange={(event) =>
                setTeamFilter(
                  event.target.value
                )
              }
              className="min-w-[16rem] border-b border-[#1A2842]/30 bg-transparent px-2 py-3 text-base outline-none focus:border-[#D85F46]"
            >
              <option value="All">
                All teams
              </option>

              {teams.map((team) => (
                <option
                  key={team.id}
                  value={team.id}
                >
                  {team.abbreviation} —{" "}
                  {team.name}
                </option>
              ))}
            </select>
          </div>
        </div>
      </section>

      {/* ERROR */}

      {error && (
        <div
          role="alert"
          className="container-page mt-8"
        >
          <div className="border border-[#D85F46]/30 bg-[#D85F46]/5 px-6 py-5 text-sm font-medium text-[#A84432]">
            {error}
          </div>
        </div>
      )}

      {/* FRONT OF PACK */}

      <section className="container-page py-12">
        <div className="mb-6 flex items-end justify-between">
          <div>
            <p className="text-[0.75rem] font-bold uppercase tracking-[0.16em] text-[#1F7A74]">
              The front of the pack
            </p>

            <h2 className="mt-1 text-3xl font-black tracking-tight">
              {view === "hitting"
                ? "Best at the plate"
                : "On the mound"}
            </h2>
          </div>

          <span className="font-mono text-xs font-bold text-[#1F7A74]">
            {currentTeamLabel} ·{" "}
            {SEASON} ·{" "}
            {primaryCategory.shortLabel}
          </span>
        </div>

        {loading ? (
          <FrontOfPackSkeleton />
        ) : !topPlayer ? (
          <div className="border-t-2 border-[#1A2842] bg-[#FCF9F3] px-6 py-16 text-center">
            <p className="text-xl font-bold">
              No qualifying leaders yet
            </p>

            <p className="mt-2 text-sm text-[#687384]">
              Try another club or check back as
              the season develops.
            </p>
          </div>
        ) : (
          <div className="grid gap-4 lg:grid-cols-[1.25fr_1fr]">

            {/* FEATURED PLAYER */}

            <Spotlight
              player={topPlayer}
              team={topPlayer.team}
              stats={spotlightStats}
              category={primaryCategory}
              view={view}
            />

            {/* OTHER TOP LEADERS */}

            <div className="border-t-2 border-[#1A2842] bg-[#FCF9F3]">
              {primaryLeaders
                .slice(1)
                .map(
                  (
                    player,
                    index
                  ) => (
                    <LeaderRow
                      key={player.id}
                      player={player}
                      rank={index + 2}
                      value={formatStat(
                        player.stats?.[
                          primaryCategory.key
                        ] as
                          | number
                          | null,
                        primaryCategory.format
                      )}
                      size="lg"
                      photoContext={
                        view ===
                        "pitching"
                          ? "pitching"
                          : "batting"
                      }
                    />
                  )
                )}
            </div>
          </div>
        )}
      </section>

      {/* FULL LEADERBOARDS */}

      <section className="container-page pb-14">
        <div className="mb-6 flex items-end justify-between border-b border-[#1A2842]/15 pb-4">
          <div>
            <p className="text-[0.75rem] font-bold uppercase tracking-[0.16em] text-[#1F7A74]">
              The full picture
            </p>

            <h2 className="mt-1 text-3xl font-black tracking-tight">
              {view === "hitting"
                ? "Hitting leaders"
                : "Pitching leaders"}
            </h2>
          </div>

          <p className="hidden font-mono text-xs font-bold text-[#1F7A74] md:block">
            TOP 10 · {SEASON}
          </p>
        </div>

        {loading ? (
          <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
            {Array.from(
              {
                length:
                  categories.length,
              },
              (_, index) => (
                <div
                  key={index}
                  className="h-[22rem] animate-pulse border-t-2 border-[#1A2842]/20 bg-[#FCF9F3]"
                />
              )
            )}
          </div>
        ) : (
          <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
            {categories.map(
              (category) => (
                <LeaderboardCard
                  key={String(
                    category.key
                  )}
                  category={
                    category
                  }
                  players={
                    filteredPlayers
                  }
                  thresholds={
                    thresholds
                  }
                />
              )
            )}
          </div>
        )}
      </section>

      {/* METHODOLOGY */}

      <section className="border-t border-[#1A2842]/15 bg-[#FCF9F3]">
        <div className="container-page grid gap-8 py-10 md:grid-cols-3">

          <div>
            <p className="text-[0.75rem] font-bold uppercase tracking-[0.16em] text-[#1F7A74]">
              Hitting
            </p>

            <p className="mt-2 text-base leading-7 text-[#687384]">
              Rate stats like OPS and AVG need at
              least {thresholds.minAb} at-bats to
              qualify. Counting stats like home runs
              and RBI use every player’s season total.
            </p>
          </div>

          <div>
            <p className="text-[0.75rem] font-bold uppercase tracking-[0.16em] text-[#1F7A74]">
              Pitching
            </p>

            <p className="mt-2 text-base leading-7 text-[#687384]">
              ERA and WHIP need at least{" "}
              {thresholds.minIp} innings. Strikeouts,
              wins, and innings pitched count every
              pitcher.
            </p>
          </div>

          <div>
            <p className="text-[0.75rem] font-bold uppercase tracking-[0.16em] text-[#1F7A74]">
              Keep looking
            </p>

            <p className="mt-2 text-base leading-7 text-[#687384]">
              Open a player profile for more season
              stats, or browse the full player list.
            </p>

            <Link
              href="/players"
              className="mt-3 inline-block text-base font-semibold text-[#1A2842] transition hover:text-[#D85F46]"
            >
              Browse all players →
            </Link>
          </div>

        </div>
      </section>
    </main>
  );
}