"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import SpotlightCard from "@/components/SpotlightCard";

/* ───────────────────────── Types ───────────────────────── */

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

type MlbTeam = { id: number; name: string; abbreviation?: string };

type MlbGame = {
  gamePk: number;
  gameDate: string;
  status: {
    abstractGameState: string;
    detailedState: string;
    codedGameState?: string;
  };
  teams?: {
    away?: { team: MlbTeam; score?: number; isWinner?: boolean };
    home?: { team: MlbTeam; score?: number; isWinner?: boolean };
  };
  linescore?: {
    currentInning?: number;
    currentInningOrdinal?: string;
    inningState?: string;
  };
};

type GameTab = "live" | "upcoming" | "final";
type LeaderTab = "OPS" | "Home Runs" | "Batting Average" | "ERA" | "Strikeouts";

/* ───────────────────────── Helpers ───────────────────────── */

const TEAL = "#59B3AD"; // light teal: use on dark backgrounds
const TEAL_DEEP = "#1F7A74"; // deeper teal: readable on cream/white

function formatAverage(value: number | null | undefined) {
  if (value == null) return "—";
  const result = value.toFixed(3);
  return value >= 1 ? result : result.replace(/^0/, "");
}

function formatDecimal(value: number | null | undefined) {
  return value == null ? "—" : value.toFixed(2);
}

function formatNumber(value: number | null | undefined) {
  return value == null ? "—" : value.toLocaleString();
}

function teamLogo(teamId: number | string) {
  return `https://www.mlbstatic.com/team-logos/${teamId}.svg`;
}

/** Small square headshot (used in list rows) */
function headshot(playerId: number) {
  return `https://img.mlbstatic.com/mlb-photos/image/upload/w_500,q_auto:good/v1/people/${playerId}/headshot/67/current`;
}

function getLocalDateString(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

/** Supabase returns at most 1,000 rows per request, so page through everything. */
async function fetchAll<T>(
  query: (
    from: number,
    to: number
  ) => PromiseLike<{ data: unknown[] | null; error: unknown }>
): Promise<T[]> {
  const pageSize = 1000;
  const rows: T[] = [];

  for (let from = 0; ; from += pageSize) {
    const { data, error } = await query(from, from + pageSize - 1);
    if (error) throw error;
    rows.push(...((data ?? []) as T[]));
    if (!data || data.length < pageSize) break;
  }

  return rows;
}

/* ───────────────────────── Components ───────────────────────── */

function GameStatus({ game }: { game: MlbGame }) {
  const state = game.status.abstractGameState;

  if (state === "Live") {
    const inning = game.linescore?.currentInningOrdinal;
    const inningState = game.linescore?.inningState;

    return (
      <span className="inline-flex items-center gap-2 text-[0.75rem] font-bold uppercase tracking-[0.12em] text-[#D85F46]">
        <span className="h-2 w-2 animate-pulse rounded-full bg-[#D85F46]" />
        {inning ? `${inningState ?? ""} ${inning}`.trim() : "Live"}
      </span>
    );
  }

  if (state === "Final") {
    return (
      <span className="text-[0.75rem] font-semibold uppercase tracking-[0.12em] text-[#687384]">
        Final
      </span>
    );
  }

  return (
    <span className="text-[0.75rem] font-bold uppercase tracking-[0.12em] text-[#1F7A74]">
      {new Date(game.gameDate).toLocaleTimeString([], {
        hour: "numeric",
        minute: "2-digit",
      })}
    </span>
  );
}

function GameCard({ game }: { game: MlbGame }) {
  const away = game.teams?.away;
  const home = game.teams?.home;

  if (!away?.team || !home?.team) return null;

  return (
    <Link
      href={`/games/${game.gamePk}`}
      className="group block border border-[#1A2842]/15 bg-[#FCF9F3] transition hover:-translate-y-1 hover:border-[#D85F46]/60 hover:shadow-[0_14px_32px_rgba(26,40,66,0.12)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#D85F46]"
    >
      <div className="flex items-center justify-between border-b border-[#1A2842]/10 px-4 py-3">
        <GameStatus game={game} />
        <span className="text-xs text-[#687384] transition group-hover:text-[#D85F46]">
          Open game →
        </span>
      </div>

      <div className="space-y-4 p-5">
        {[away, home].map((side, index) => (
          <div
            key={`${side.team.id}-${index}`}
            className="flex items-center justify-between gap-4"
          >
            <div className="flex min-w-0 items-center gap-3">
              <img
                src={teamLogo(side.team.id)}
                alt=""
                aria-hidden="true"
                className="h-10 w-10 shrink-0 object-contain"
              />
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold text-[#1A2842]">
                  {side.team.name}
                </p>
                <p className="mt-1 font-mono text-[0.75rem] font-semibold text-[#1F7A74]">
                  {side.team.abbreviation ?? ""}
                </p>
              </div>
            </div>

            <span
              className={`font-mono text-2xl ${
                side.isWinner
                  ? "font-bold text-[#1A2842]"
                  : "font-medium text-[#687384]"
              }`}
            >
              {side.score ?? "—"}
            </span>
          </div>
        ))}
      </div>
    </Link>
  );
}

function LeaderListRow({
  player,
  team,
  value,
  label,
  rank,
}: {
  player: Player;
  team?: Team;
  value: string;
  label: string;
  rank: number;
}) {
  return (
    <Link
      href={`/players/${player.id}`}
      className="group grid grid-cols-[2rem_1fr_auto] items-center gap-4 border-b border-[#1A2842]/10 py-3.5 last:border-0 focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#D85F46]"
    >
      <span className="font-mono text-sm font-bold text-[#1F7A74]">
        {String(rank).padStart(2, "0")}
      </span>

      <div className="flex min-w-0 items-center gap-4">
        <img
          src={headshot(player.id)}
          alt=""
          aria-hidden="true"
          className="h-14 w-14 shrink-0 bg-[#E8E1D5] object-cover object-top"
        />

        <div className="min-w-0">
          <p className="truncate text-base font-semibold group-hover:text-[#D85F46]">
            {player.name}
          </p>
          <p className="mt-1 truncate text-sm text-[#687384]">
            {team?.name ?? "Free Agent"}
            {player.position ? ` · ${player.position}` : ""}
          </p>
        </div>
      </div>

      <div className="text-right">
        <p className="font-mono text-xl font-bold">{value}</p>
        <p className="mt-0.5 text-[0.7rem] font-semibold uppercase tracking-[0.12em] text-[#1F7A74]">
          {label}
        </p>
      </div>
    </Link>
  );
}

function SectionHeading({
  eyebrow,
  title,
  description,
  href,
  linkText,
}: {
  eyebrow: string;
  title: string;
  description?: string;
  href?: string;
  linkText?: string;
}) {
  return (
    <div className="flex flex-col justify-between gap-4 border-b border-[#1A2842]/15 pb-5 sm:flex-row sm:items-end">
      <div>
        <p className="text-[0.75rem] font-bold uppercase tracking-[0.18em] text-[#1F7A74]">
          {eyebrow}
        </p>
        <h2 className="mt-1.5 text-3xl font-black tracking-tight">{title}</h2>
        {description && (
          <p className="mt-2 max-w-xl text-base leading-7 text-[#687384]">
            {description}
          </p>
        )}
      </div>

      {href && (
        <Link
          href={href}
          className="shrink-0 text-sm font-semibold text-[#1A2842] transition hover:text-[#D85F46]"
        >
          {linkText ?? "See more"} →
        </Link>
      )}
    </div>
  );
}

/* ───────────────────────── Page ───────────────────────── */

export default function HomePage() {
  const [players, setPlayers] = useState<Player[]>([]);
  const [teams, setTeams] = useState<Team[]>([]);
  const [stats, setStats] = useState<PlayerStat[]>([]);
  const [games, setGames] = useState<MlbGame[]>([]);
  const [season, setSeason] = useState(new Date().getFullYear());
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [gameTab, setGameTab] = useState<GameTab>("live");
  const [leaderTab, setLeaderTab] = useState<LeaderTab>("OPS");
  const userPickedTab = useRef(false);

  const today = useMemo(() => getLocalDateString(new Date()), []);

  /* Season data (paged past Supabase's 1,000-row cap) */
  useEffect(() => {
    let cancelled = false;

    async function loadHomepageData() {
      setLoading(true);
      setLoadError("");

      try {
        const [
          { data: teamData, error: teamError },
          { data: latestSeason, error: seasonError },
        ] = await Promise.all([
          supabase.from("Teams").select("id, name, abbreviation").order("name"),
          supabase
            .from("PlayerStats")
            .select("season")
            .order("season", { ascending: false })
            .limit(1)
            .maybeSingle(),
        ]);

        if (teamError) throw teamError;
        if (seasonError) throw seasonError;

        const currentSeason = latestSeason?.season ?? new Date().getFullYear();

        const [playerData, statsData] = await Promise.all([
          fetchAll<Player>((from, to) =>
            supabase
              .from("Player")
              .select("id, name, team_id, position")
              .order("id")
              .range(from, to)
          ),
          fetchAll<PlayerStat>((from, to) =>
            supabase
              .from("PlayerStats")
              .select("*")
              .eq("season", currentSeason)
              .order("player_id")
              .range(from, to)
          ),
        ]);

        if (!cancelled) {
          setPlayers(playerData);
          setTeams((teamData ?? []) as Team[]);
          setStats(statsData);
          setSeason(currentSeason);
        }
      } catch (error) {
        console.error("Unable to load homepage data:", error);
        if (!cancelled) setLoadError("Some season data couldn’t be loaded.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    loadHomepageData();

    return () => {
      cancelled = true;
    };
  }, []);

  /* Today's games, refreshed every 30 seconds */
  useEffect(() => {
    let cancelled = false;

    async function loadGames() {
      try {
        const response = await fetch(
          `https://statsapi.mlb.com/api/v1/schedule?sportId=1&date=${today}&hydrate=team,linescore`,
          { cache: "no-store" }
        );

        if (!response.ok) return;

        const data = await response.json();
        const todaysGames: MlbGame[] = data.dates?.[0]?.games ?? [];

        if (!cancelled) setGames(todaysGames);
      } catch (error) {
        console.error("Unable to load today's games:", error);
      }
    }

    loadGames();
    const timer = setInterval(loadGames, 30000);

    return () => {
      cancelled = true;
      clearInterval(timer);
    };
  }, [today]);

  const teamMap = useMemo(
    () => new Map(teams.map((team) => [team.id, team])),
    [teams]
  );

  const playerMap = useMemo(
    () => new Map(players.map((player) => [player.id, player])),
    [players]
  );

  /* Qualification scales with how far into the season the data is */
  const qualifiedHitters = useMemo(() => {
    const maxGames = Math.max(0, ...stats.map((s) => s.games ?? 0));
    const minAb = Math.max(20, maxGames * 2.7);
    const qualified = stats.filter((s) => (s.at_bats ?? 0) >= minAb);
    return qualified.length >= 5
      ? qualified
      : stats.filter((s) => (s.at_bats ?? 0) > 0);
  }, [stats]);

  const allHitters = useMemo(
    () => stats.filter((s) => (s.at_bats ?? 0) > 0),
    [stats]
  );

  const qualifiedPitchers = useMemo(() => {
    const maxGames = Math.max(0, ...stats.map((s) => s.games ?? 0));
    const minIp = Math.max(10, maxGames * 1);
    const qualified = stats.filter((s) => (s.innings_pitched ?? 0) >= minIp);
    return qualified.length >= 5
      ? qualified
      : stats.filter((s) => (s.innings_pitched ?? 0) > 0);
  }, [stats]);

  const allPitchers = useMemo(
    () => stats.filter((s) => (s.innings_pitched ?? 0) > 0),
    [stats]
  );

  const leaderOptions = useMemo(() => {
    const getRanked = (
      rows: PlayerStat[],
      getValue: (row: PlayerStat) => number | null,
      direction: "high" | "low"
    ) =>
      rows
        .filter((row) => getValue(row) != null && playerMap.has(row.player_id))
        .sort((a, b) => {
          const aValue = getValue(a) ?? 0;
          const bValue = getValue(b) ?? 0;
          return direction === "high" ? bValue - aValue : aValue - bValue;
        })
        .slice(0, 5);

    return {
      OPS: {
        rows: getRanked(qualifiedHitters, (row) => row.ops, "high"),
        value: (row: PlayerStat) => formatDecimal(row.ops),
        label: "OPS",
        description: "On-base plus slugging",
      },
      "Home Runs": {
        rows: getRanked(allHitters, (row) => row.home_runs, "high"),
        value: (row: PlayerStat) => formatNumber(row.home_runs),
        label: "HR",
        description: "Home runs",
      },
      "Batting Average": {
        rows: getRanked(qualifiedHitters, (row) => row.batting_avg, "high"),
        value: (row: PlayerStat) => formatAverage(row.batting_avg),
        label: "AVG",
        description: "Batting average",
      },
      ERA: {
        rows: getRanked(qualifiedPitchers, (row) => row.era, "low"),
        value: (row: PlayerStat) => formatDecimal(row.era),
        label: "ERA",
        description: "Earned run average",
      },
      Strikeouts: {
        rows: getRanked(allPitchers, (row) => row.strikeouts_pitched, "high"),
        value: (row: PlayerStat) => formatNumber(row.strikeouts_pitched),
        label: "K",
        description: "Pitcher strikeouts",
      },
    };
  }, [qualifiedHitters, allHitters, qualifiedPitchers, allPitchers, playerMap]);

  const selectedLeaders = leaderOptions[leaderTab];

  /* Masthead spotlight = OPS leader */
  const featuredStat = leaderOptions.OPS.rows[0];
  const featuredPlayer = featuredStat
    ? playerMap.get(featuredStat.player_id)
    : undefined;
  const featuredTeam = featuredPlayer?.team_id
    ? teamMap.get(featuredPlayer.team_id)
    : undefined;

  /* Selected leader card */
  const topStat = selectedLeaders.rows[0];
  const topPlayer = topStat ? playerMap.get(topStat.player_id) : undefined;
  const topTeam = topPlayer?.team_id ? teamMap.get(topPlayer.team_id) : undefined;

  const liveGames = games.filter((g) => g.status.abstractGameState === "Live");
  const upcomingGames = games.filter(
    (g) => g.status.abstractGameState === "Preview"
  );
  const finalGames = games.filter((g) => g.status.abstractGameState === "Final");

  /* Open on the first tab that actually has games (until the visitor picks one) */
  useEffect(() => {
    if (userPickedTab.current || games.length === 0) return;
    if (liveGames.length > 0) setGameTab("live");
    else if (upcomingGames.length > 0) setGameTab("upcoming");
    else if (finalGames.length > 0) setGameTab("final");
  }, [games, liveGames.length, upcomingGames.length, finalGames.length]);

  const gameLists: Record<GameTab, MlbGame[]> = {
    live: liveGames,
    upcoming: upcomingGames,
    final: finalGames,
  };

  const selectedGames = gameLists[gameTab];

  return (
    <main className="min-h-screen bg-[#F8F3EA] text-[#1A2842]">
      {/* ─────────── MASTHEAD ─────────── */}
      <section className="bg-[#101A2C] text-white">
        <div className="container-wide grid lg:grid-cols-[1.05fr_0.95fr]">
          {/* Left: headline */}
          <div className="paper-grid relative flex min-h-[34rem] flex-col justify-between overflow-hidden border-x border-white/10 px-6 py-8 md:px-12 md:py-12">
            <div className="relative flex items-center justify-between">
              <p className="text-[0.75rem] font-bold uppercase tracking-[0.2em] text-[#59B3AD]">
                The baseball desk
              </p>
              <p className="font-mono text-sm text-[#59B3AD]">{season} season</p>
            </div>

            <div className="relative mt-16">
              <p className="text-base text-white/65">
                Numbers tell you what happened.
              </p>
              <h1 className="mt-3 max-w-4xl text-6xl font-black leading-[0.88] tracking-[-0.07em] md:text-8xl xl:text-9xl">
                Follow the
                <br />
                <span className="text-[#D85F46]">whole game.</span>
              </h1>
              <p className="mt-7 max-w-xl text-lg leading-8 text-white/65">
                Find a player, follow a score, or see who’s having a season
                worth talking about.
              </p>

              <div className="mt-8 flex flex-wrap gap-3">
                <Link
                  href="/players"
                  className="bg-[#D85F46] px-6 py-3.5 text-base font-semibold text-white transition hover:bg-[#BD503B]"
                >
                  Find a player →
                </Link>
                <Link
                  href="/games"
                  className="border border-white/25 px-6 py-3.5 text-base font-semibold text-white transition hover:border-white hover:bg-white/10"
                >
                  See today’s games
                </Link>
              </div>
            </div>

            <p className="relative mt-12 text-[0.8rem] font-semibold uppercase tracking-[0.14em] text-[#59B3AD]">
              Player stats · Team pages · Game scores · Season leaders
            </p>
          </div>

          {/* Right: spotlight photo + stat tiles */}
          <div className="flex flex-col border-x border-white/10 bg-[#0B1423]">
            {featuredPlayer && featuredStat ? (
              <SpotlightCard
                player={featuredPlayer}
                team={featuredTeam}
                badge="Player spotlight · OPS leader"
                action="swing"
                stats={[
                  ["AVG", formatAverage(featuredStat.batting_avg)],
                  ["OPS", formatDecimal(featuredStat.ops)],
                  ["HR", formatNumber(featuredStat.home_runs)],
                  ["RBI", formatNumber(featuredStat.rbi)],
                ]}
                className="min-h-[26rem] flex-1"
              />
            ) : (
              <div className="flex min-h-[26rem] flex-1 items-end p-8">
                <p className="text-sm font-semibold uppercase tracking-[0.14em] text-[#59B3AD]">
                  {loading ? "Loading the season’s top hitter…" : "Spotlight unavailable"}
                </p>
              </div>
            )}

            <div className="grid grid-cols-3 border-t border-white/10">
              <Link
                href="/games"
                className="group border-r border-white/10 p-5 transition hover:bg-white/[0.04]"
              >
                <p className="text-[0.7rem] font-bold uppercase tracking-[0.14em] text-[#59B3AD]">
                  Today’s games
                </p>
                <p className="mt-3 font-mono text-4xl font-bold">{games.length}</p>
                <p className="mt-1 text-sm text-white/60">
                  {liveGames.length > 0
                    ? `${liveGames.length} live now`
                    : "on the schedule"}
                </p>
              </Link>

              <Link
                href="/teams"
                className="group border-r border-white/10 p-5 transition hover:bg-white/[0.04]"
              >
                <p className="text-[0.7rem] font-bold uppercase tracking-[0.14em] text-[#59B3AD]">
                  Around the league
                </p>
                <p className="mt-3 font-mono text-4xl font-bold">{teams.length}</p>
                <p className="mt-1 text-sm text-white/60">teams to explore</p>
              </Link>

              <Link
                href="/leaders"
                className="group p-5 transition hover:bg-white/[0.04]"
              >
                <p className="text-[0.7rem] font-bold uppercase tracking-[0.14em] text-[#59B3AD]">
                  Season coverage
                </p>
                <p className="mt-3 font-mono text-4xl font-bold">
                  {players.length.toLocaleString()}
                </p>
                <p className="mt-1 text-sm text-white/60">players tracked →</p>
              </Link>
            </div>
          </div>
        </div>
      </section>

      {loadError && (
        <div className="container-page pt-5">
          <p className="border-l-2 border-[#D85F46] bg-[#D85F46]/5 px-4 py-3 text-sm text-[#687384]">
            {loadError} Some sections may be incomplete.
          </p>
        </div>
      )}

      {/* ─────────── SCOREBOARD ─────────── */}
      <section className="container-page py-14">
        <SectionHeading
          eyebrow="The scoreboard"
          title="What’s happening today"
          description="Live action, upcoming matchups, and final scores."
          href="/games"
          linkText="Open game center"
        />

        <div className="mt-6 flex flex-wrap gap-2" role="tablist" aria-label="Game status">
          {(
            [
              ["live", "Live now", liveGames.length],
              ["upcoming", "Upcoming", upcomingGames.length],
              ["final", "Final", finalGames.length],
            ] as const
          ).map(([tab, label, count]) => (
            <button
              key={tab}
              type="button"
              role="tab"
              aria-selected={gameTab === tab}
              onClick={() => {
                userPickedTab.current = true;
                setGameTab(tab);
              }}
              className={`border px-5 py-2.5 text-sm font-semibold transition ${
                gameTab === tab
                  ? "border-[#1A2842] bg-[#1A2842] text-white"
                  : "border-[#1A2842]/15 bg-transparent text-[#687384] hover:border-[#D85F46] hover:text-[#1A2842]"
              }`}
            >
              {label}
              <span
                className={`ml-2 font-mono text-xs ${
                  gameTab === tab ? "text-[#59B3AD]" : "text-[#1F7A74]"
                }`}
              >
                {count}
              </span>
            </button>
          ))}
        </div>

        {selectedGames.length > 0 ? (
          <div className="mt-5 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {selectedGames.slice(0, 6).map((game) => (
              <GameCard key={game.gamePk} game={game} />
            ))}
          </div>
        ) : (
          <div className="mt-5 flex flex-col justify-between gap-2 border border-[#1A2842]/15 bg-[#FCF9F3] px-6 py-5 sm:flex-row sm:items-center">
            <p className="font-semibold">
              {gameTab === "live"
                ? "No games are live right now."
                : gameTab === "upcoming"
                  ? "No upcoming games on today’s schedule."
                  : "No completed games yet today."}
            </p>
            <p className="text-sm text-[#687384]">
              Try another tab or visit the game center.
            </p>
          </div>
        )}
      </section>

      {/* ─────────── LEADERS ─────────── */}
      <section className="border-y border-[#1A2842]/10 bg-[#FCF9F3]">
        <div className="container-page py-14">
          <SectionHeading
            eyebrow={`${season} season`}
            title="The players setting the pace"
            description="Switch categories to see the leaders. Select a player to open their profile."
            href="/leaders"
            linkText="All leaderboards"
          />

          <div className="mt-6 flex flex-wrap gap-2" role="tablist" aria-label="Leader category">
            {(
              ["OPS", "Home Runs", "Batting Average", "ERA", "Strikeouts"] as LeaderTab[]
            ).map((tab) => (
              <button
                key={tab}
                type="button"
                role="tab"
                aria-selected={leaderTab === tab}
                onClick={() => setLeaderTab(tab)}
                className={`px-5 py-2.5 text-sm transition ${
                  leaderTab === tab
                    ? "bg-[#D85F46] font-semibold text-white"
                    : "border border-[#1A2842]/15 text-[#687384] hover:border-[#D85F46] hover:text-[#1A2842]"
                }`}
              >
                {tab}
              </button>
            ))}
          </div>

          <div className="mt-6 grid gap-6 lg:grid-cols-[1fr_1fr]">
            {topPlayer && topStat ? (
              <SpotlightCard
                key={`${leaderTab}-${topPlayer.id}`}
                player={topPlayer}
                team={topTeam}
                badge={`${selectedLeaders.description} leader`}
                action={
                  leaderTab === "ERA" || leaderTab === "Strikeouts"
                    ? "pitching"
                    : "swing"
                }
                stats={[
                  [selectedLeaders.label, selectedLeaders.value(topStat)],
                  ["Games", formatNumber(topStat.games)],
                  ...(leaderTab === "ERA" || leaderTab === "Strikeouts"
                    ? ([["IP", formatNumber(topStat.innings_pitched)]] as [string, string][])
                    : ([["HR", formatNumber(topStat.home_runs)]] as [string, string][])),
                ]}
                className="min-h-[30rem]"
              />
            ) : (
              <div className="flex min-h-[30rem] items-end bg-[#1A2842] p-8 text-white">
                <div>
                  <p className="text-[0.75rem] font-bold uppercase tracking-[0.14em] text-[#59B3AD]">
                    {selectedLeaders.description}
                  </p>
                  <h3 className="mt-3 text-2xl font-bold">
                    {loading ? "Loading leaders…" : "Leader data isn’t available yet."}
                  </h3>
                </div>
              </div>
            )}

            <div className="border border-[#1A2842]/15 bg-white p-6 sm:p-8">
              <div className="flex items-end justify-between border-b border-[#1A2842]/10 pb-4">
                <div>
                  <p className="text-[0.75rem] font-bold uppercase tracking-[0.16em] text-[#1F7A74]">
                    Top five
                  </p>
                  <h3 className="mt-1 text-2xl font-black">{leaderTab}</h3>
                </div>
                <span className="font-mono text-sm font-bold text-[#1F7A74]">
                  {selectedLeaders.label}
                </span>
              </div>

              <div className="mt-2">
                {selectedLeaders.rows.map((stat, index) => {
                  const player = playerMap.get(stat.player_id);
                  if (!player) return null;

                  return (
                    <LeaderListRow
                      key={stat.player_id}
                      player={player}
                      team={player.team_id ? teamMap.get(player.team_id) : undefined}
                      value={selectedLeaders.value(stat)}
                      label={selectedLeaders.label}
                      rank={index + 1}
                    />
                  );
                })}

                {!loading && selectedLeaders.rows.length === 0 && (
                  <p className="py-8 text-sm text-[#687384]">
                    No qualifying players found for this category.
                  </p>
                )}

                {loading && (
                  <p className="py-8 text-sm text-[#687384]">
                    Loading season leaders…
                  </p>
                )}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ─────────── EXPLORE ─────────── */}
      <section className="container-page py-14">
        <SectionHeading
          eyebrow="Pick a direction"
          title="Explore the game"
          description="Start with a player, a team, a game, or a head-to-head comparison."
        />

        <div className="mt-6 grid gap-px border border-[#1A2842]/15 bg-[#1A2842]/15 sm:grid-cols-2 lg:grid-cols-4">
          {[
            {
              number: "01",
              title: "Players",
              description: "Find a player and explore their season stats and profile.",
              href: "/players",
              color: "#D85F46",
            },
            {
              number: "02",
              title: "Teams",
              description: "Browse clubs, rosters, and team pages around the league.",
              href: "/teams",
              color: "#59B3AD",
            },
            {
              number: "03",
              title: "Games",
              description: "Follow today’s schedule, live scores, and recent results.",
              href: "/games",
              color: "#6287C7",
            },
            {
              number: "04",
              title: "Compare",
              description: "Put two players side by side and compare their numbers.",
              href: "/compare",
              color: "#D7A943",
            },
          ].map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="group relative min-h-[16rem] overflow-hidden bg-[#F8F3EA] p-7 transition-colors hover:bg-[#1A2842] hover:text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#D85F46]"
            >
              <span
                className="absolute left-0 top-0 h-1 w-0 transition-all duration-300 group-hover:w-full"
                style={{ backgroundColor: item.color }}
              />

              <div className="flex items-start justify-between">
                <span
                  className="font-mono text-sm font-bold"
                  style={{ color: item.color === TEAL ? TEAL_DEEP : item.color }}
                >
                  {item.number}
                </span>
                <span className="transition-transform group-hover:translate-x-1">→</span>
              </div>

              <div className="mt-16">
                <h3 className="text-3xl font-black">{item.title}</h3>
                <p className="mt-3 text-base leading-7 text-[#687384] transition-colors group-hover:text-white/70">
                  {item.description}
                </p>
              </div>
            </Link>
          ))}
        </div>
      </section>
    </main>
  );
}