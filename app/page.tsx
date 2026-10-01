"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
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

type MlbTeam = {
  id: number;
  name: string;
  abbreviation?: string;
};

type MlbGame = {
  gamePk: number;
  gameDate: string;
  status: {
    abstractGameState: string;
    detailedState: string;
    codedGameState?: string;
  };
  teams?: {
    away?: {
      team: MlbTeam;
      score?: number;
      isWinner?: boolean;
    };
    home?: {
      team: MlbTeam;
      score?: number;
      isWinner?: boolean;
    };
  };
  linescore?: {
    currentInning?: number;
    currentInningOrdinal?: string;
    inningState?: string;
  };
};

type GameTab = "live" | "upcoming" | "final";
type LeaderTab = "OPS" | "Home Runs" | "Batting Average" | "ERA" | "Strikeouts";

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

function headshot(playerId: number) {
  return `https://img.mlbstatic.com/mlb-photos/image/upload/w_500,q_auto:good/v1/people/${playerId}/headshot/67/current`;
}

function getLocalDateString(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

function GameStatus({ game }: { game: MlbGame }) {
  const state = game.status.abstractGameState;

  if (state === "Live") {
    const inning = game.linescore?.currentInningOrdinal;
    const inningState = game.linescore?.inningState;

    return (
      <span className="inline-flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.12em] text-[#D85F46]">
        <span className="h-2 w-2 animate-pulse rounded-full bg-[#D85F46]" />
        {inning ? `${inningState ?? ""} ${inning}`.trim() : "Live"}
      </span>
    );
  }

  if (state === "Final") {
    return (
      <span className="text-[10px] font-semibold uppercase tracking-[0.12em] text-[#687384]">
        Final
      </span>
    );
  }

  return (
    <span className="text-[10px] font-semibold uppercase tracking-[0.12em] text-[#59B3AD]">
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
                <p className="mt-1 font-mono text-[10px] text-[#687384]">
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

function PlayerCard({
  player,
  team,
  stat,
  statLabel,
  statValue,
  featured = false,
}: {
  player: Player;
  team?: Team;
  stat: PlayerStat;
  statLabel: string;
  statValue: string;
  featured?: boolean;
}) {
  return (
    <Link
      href={`/players/${player.id}`}
      className={`group relative block overflow-hidden border border-[#1A2842]/15 bg-[#FCF9F3] transition hover:-translate-y-1 hover:border-[#D85F46]/60 hover:shadow-[0_14px_32px_rgba(26,40,66,0.12)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#D85F46] ${
        featured ? "min-h-[360px]" : ""
      }`}
    >
      <div className="absolute inset-0 bg-gradient-to-t from-[#101A2C]/90 via-[#101A2C]/10 to-transparent" />

      <img
        src={headshot(player.id)}
        alt=""
        aria-hidden="true"
        className={`absolute inset-0 h-full w-full object-cover object-top transition duration-500 group-hover:scale-[1.04] ${
          featured ? "opacity-90" : "opacity-70"
        }`}
      />

      <div className="absolute inset-0 bg-gradient-to-t from-[#101A2C] via-[#101A2C]/25 to-transparent" />

      <div className="relative flex min-h-[260px] flex-col justify-between p-5 text-white">
        <div className="flex items-start justify-between gap-3">
          <span className="bg-[#D85F46] px-2.5 py-1 text-[9px] font-bold uppercase tracking-[0.12em]">
            {statLabel}
          </span>

          {team && (
            <img
              src={teamLogo(team.id)}
              alt=""
              aria-hidden="true"
              className="h-10 w-10 object-contain drop-shadow"
            />
          )}
        </div>

        <div>
          <p className="text-xs text-white/65">
            {team?.name ?? "Free Agent"}
            {player.position ? ` · ${player.position}` : ""}
          </p>

          <h3
            className={`mt-1 font-bold leading-tight tracking-tight ${
              featured ? "text-3xl sm:text-4xl" : "text-xl"
            }`}
          >
            {player.name}
          </h3>

          <div className="mt-5 flex items-end justify-between border-t border-white/20 pt-4">
            <div>
              <p className="font-mono text-3xl font-bold">{statValue}</p>
              <p className="mt-1 text-[9px] font-semibold uppercase tracking-[0.12em] text-white/60">
                {statLabel}
              </p>
            </div>

            <span className="text-sm font-semibold text-white/70 transition group-hover:translate-x-1 group-hover:text-white">
              Profile →
            </span>
          </div>
        </div>
      </div>

      <div className="absolute bottom-0 left-0 h-1 w-0 bg-[#D85F46] transition-all duration-300 group-hover:w-full" />
      <span className="sr-only">
        {player.name}: {statValue} {statLabel}. View player profile.
      </span>
      <span className="sr-only">
        {stat.games ?? 0} games played this season.
      </span>
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
      className="group grid grid-cols-[28px_1fr_auto] items-center gap-3 border-b border-[#1A2842]/10 py-3 last:border-0 focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#D85F46]"
    >
      <span className="font-mono text-xs text-[#687384]">
        {String(rank).padStart(2, "0")}
      </span>

      <div className="flex min-w-0 items-center gap-3">
        <img
          src={headshot(player.id)}
          alt=""
          aria-hidden="true"
          className="h-10 w-10 shrink-0 bg-[#E8E1D5] object-cover object-top"
        />

        <div className="min-w-0">
          <p className="truncate text-sm font-semibold group-hover:text-[#D85F46]">
            {player.name}
          </p>
          <p className="mt-1 truncate text-xs text-[#687384]">
            {team?.abbreviation ?? "FA"}
            {player.position ? ` · ${player.position}` : ""}
          </p>
        </div>
      </div>

      <div className="text-right">
        <p className="font-mono text-sm font-bold">{value}</p>
        <p className="mt-1 text-[9px] uppercase tracking-[0.1em] text-[#687384]">
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
    <div className="flex flex-col justify-between gap-4 border-b border-[#1A2842]/15 pb-4 sm:flex-row sm:items-end">
      <div>
        <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-[#D85F46]">
          {eyebrow}
        </p>
        <h2 className="mt-1 text-2xl font-bold tracking-tight">{title}</h2>
        {description && (
          <p className="mt-2 max-w-xl text-sm leading-6 text-[#687384]">
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

  const today = useMemo(() => getLocalDateString(new Date()), []);

  useEffect(() => {
    let cancelled = false;

    async function loadHomepageData() {
      setLoading(true);
      setLoadError("");

      try {
        const [
          { data: playerData, error: playerError },
          { data: teamData, error: teamError },
          { data: latestSeason, error: seasonError },
        ] = await Promise.all([
          supabase
            .from("Player")
            .select("id, name, team_id, position")
            .order("name")
            .range(0, 4999),
          supabase.from("Teams").select("id, name, abbreviation").order("name"),
          supabase
            .from("PlayerStats")
            .select("season")
            .order("season", { ascending: false })
            .limit(1)
            .maybeSingle(),
        ]);

        if (playerError) throw playerError;
        if (teamError) throw teamError;
        if (seasonError) throw seasonError;

        const currentSeason = latestSeason?.season ?? new Date().getFullYear();

        const { data: statsData, error: statsError } = await supabase
          .from("PlayerStats")
          .select(`
            player_id,
            season,
            games,
            at_bats,
            hits,
            home_runs,
            rbi,
            walks,
            strikeouts,
            batting_avg,
            obp,
            slg,
            ops,
            innings_pitched,
            wins,
            losses,
            earned_runs,
            hits_allowed,
            walks_allowed,
            strikeouts_pitched,
            era,
            whip
          `)
          .eq("season", currentSeason);

        if (statsError) throw statsError;

        if (!cancelled) {
          setPlayers((playerData ?? []) as Player[]);
          setTeams((teamData ?? []) as Team[]);
          setStats((statsData ?? []) as PlayerStat[]);
          setSeason(currentSeason);
        }
      } catch (error) {
        console.error("Unable to load homepage data:", error);

        if (!cancelled) {
          setLoadError("Some season data couldn’t be loaded.");
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    loadHomepageData();

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    let cancelled = false;

    async function loadGames() {
      try {
        const response = await fetch(
          `https://statsapi.mlb.com/api/v1/schedule?sportId=1&date=${today}&hydrate=team,linescore`,
          { next: { revalidate: 30 } }
        );

        if (!response.ok) return;

        const data = await response.json();
        const todaysGames: MlbGame[] = data.dates?.[0]?.games ?? [];

        if (!cancelled) {
          setGames(todaysGames);
        }
      } catch (error) {
        console.error("Unable to load today's games:", error);
      }
    }

    loadGames();

    return () => {
      cancelled = true;
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

  const qualifiedHitters = useMemo(
    () =>
      stats.filter(
        (stat) => (stat.at_bats ?? 0) >= 50 && (stat.games ?? 0) >= 10
      ),
    [stats]
  );

  const qualifiedPitchers = useMemo(
    () => stats.filter((stat) => (stat.innings_pitched ?? 0) >= 10),
    [stats]
  );

  const leaderOptions = useMemo(() => {
    const getRanked = (
      rows: PlayerStat[],
      getValue: (row: PlayerStat) => number | null,
      direction: "high" | "low"
    ) =>
      rows
        .filter((row) => getValue(row) != null)
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
        rows: getRanked(qualifiedHitters, (row) => row.home_runs, "high"),
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
        rows: getRanked(
          qualifiedPitchers,
          (row) => row.strikeouts_pitched,
          "high"
        ),
        value: (row: PlayerStat) => formatNumber(row.strikeouts_pitched),
        label: "K",
        description: "Pitcher strikeouts",
      },
    };
  }, [qualifiedHitters, qualifiedPitchers]);

  const selectedLeaders = leaderOptions[leaderTab];

  const featuredStat = leaderOptions.OPS.rows[0];
  const featuredPlayer = featuredStat
    ? playerMap.get(featuredStat.player_id)
    : undefined;
  const featuredTeam = featuredPlayer?.team_id
    ? teamMap.get(featuredPlayer.team_id)
    : undefined;

  const liveGames = games.filter(
    (game) => game.status.abstractGameState === "Live"
  );
  const upcomingGames = games.filter(
    (game) => game.status.abstractGameState === "Preview"
  );
  const finalGames = games.filter(
    (game) => game.status.abstractGameState === "Final"
  );

  const gameLists: Record<GameTab, MlbGame[]> = {
    live: liveGames,
    upcoming: upcomingGames,
    final: finalGames,
  };

  const selectedGames = gameLists[gameTab];

  return (
    <main className="min-h-screen bg-[#F8F3EA] text-[#1A2842]">
      {/* MASTHEAD */}
      <section className="bg-[#101A2C] text-white">
        <div className="mx-auto grid max-w-[1440px] lg:grid-cols-[1.2fr_0.8fr]">
          <div className="paper-grid relative flex min-h-[480px] flex-col justify-between overflow-hidden border-x border-white/10 px-6 py-8 md:px-10 md:py-12">
            <div className="relative flex items-center justify-between">
              <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-[#59B3AD]">
                The baseball desk
              </p>
              <p className="font-mono text-xs text-white/45">{season} season</p>
            </div>

            <div className="relative mt-20">
              <p className="text-sm text-white/60">
                Numbers tell you what happened.
              </p>
              <h1 className="mt-3 max-w-4xl text-6xl font-black leading-[0.88] tracking-[-0.07em] md:text-8xl">
                Follow the
                <br />
                <span className="text-[#D85F46]">whole game.</span>
              </h1>
              <p className="mt-6 max-w-xl text-sm leading-6 text-white/55">
                Find a player, follow a score, or see who’s having a season
                worth talking about.
              </p>

              <div className="mt-7 flex flex-wrap gap-3">
                <Link
                  href="/players"
                  className="bg-[#D85F46] px-5 py-3 text-sm font-semibold text-white transition hover:bg-[#BD503B]"
                >
                  Find a player →
                </Link>
                <Link
                  href="/games"
                  className="border border-white/25 px-5 py-3 text-sm font-semibold text-white transition hover:border-white hover:bg-white/10"
                >
                  See today’s games
                </Link>
              </div>
            </div>

            <p className="relative mt-12 text-xs text-white/35">
              Player stats · Team pages · Game scores · Season leaders
            </p>
          </div>

          <div className="grid grid-cols-2 border-x border-white/10 bg-[#0B1423] lg:grid-cols-1">
            <Link
              href="/games"
              className="group border-b border-r border-white/10 p-5 transition hover:bg-white/[0.04] sm:p-7 lg:border-r-0"
            >
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-semibold uppercase tracking-[0.14em] text-white/45">
                  Today’s scoreboard
                </span>
                <span className="text-white/35 transition group-hover:translate-x-1 group-hover:text-white">
                  →
                </span>
              </div>

              <p className="mt-8 font-mono text-4xl font-bold text-white sm:text-5xl">
                {games.length}
              </p>
              <p className="mt-2 text-sm text-white/55">
                {liveGames.length > 0
                  ? `${liveGames.length} ${liveGames.length === 1 ? "game" : "games"} in progress`
                  : "games on today"}
              </p>
            </Link>

            <Link
              href="/teams"
              className="group border-b border-white/10 p-5 transition hover:bg-white/[0.04] sm:p-7"
            >
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-semibold uppercase tracking-[0.14em] text-white/45">
                  Around the league
                </span>
                <span className="text-white/35 transition group-hover:translate-x-1 group-hover:text-white">
                  →
                </span>
              </div>

              <p className="mt-8 font-mono text-4xl font-bold text-white sm:text-5xl">
                {teams.length}
              </p>
              <p className="mt-2 text-sm text-white/55">teams to explore</p>
            </Link>

            <div className="col-span-2 flex items-center justify-between p-5 sm:p-7">
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-white/45">
                  Season coverage
                </p>
                <p className="mt-2 text-sm text-white/65">
                  {players.length.toLocaleString()} players in the database
                </p>
              </div>

              <Link
                href="/leaders"
                className="border border-white/20 px-4 py-2 text-xs font-semibold text-white/75 transition hover:border-[#59B3AD] hover:text-[#59B3AD]"
              >
                View leaders →
              </Link>
            </div>
          </div>
        </div>
      </section>

      {loadError && (
        <div className="mx-auto max-w-[1440px] px-5 pt-5 md:px-8">
          <p className="border-l-2 border-[#D85F46] bg-[#D85F46]/5 px-4 py-3 text-sm text-[#687384]">
            {loadError} Some sections may be incomplete.
          </p>
        </div>
      )}

      {/* SCOREBOARD */}
      <section className="mx-auto max-w-[1440px] px-5 py-12 md:px-8">
        <SectionHeading
          eyebrow="The scoreboard"
          title="What’s happening today"
          description="Choose a tab to see live action, upcoming matchups, or the final scores."
          href="/games"
          linkText="Open game center"
        />

        <div className="mt-6 flex flex-wrap gap-2" role="tablist" aria-label="Game status">
          {([
            ["live", "Live now", liveGames.length],
            ["upcoming", "Upcoming", upcomingGames.length],
            ["final", "Final", finalGames.length],
          ] as const).map(([tab, label, count]) => (
            <button
              key={tab}
              type="button"
              role="tab"
              aria-selected={gameTab === tab}
              onClick={() => setGameTab(tab)}
              className={`border px-4 py-2 text-sm transition ${
                gameTab === tab
                  ? "border-[#1A2842] bg-[#1A2842] text-white"
                  : "border-[#1A2842]/15 bg-transparent text-[#687384] hover:border-[#D85F46] hover:text-[#1A2842]"
              }`}
            >
              {label}
              <span className="ml-2 font-mono text-xs opacity-65">{count}</span>
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
          <div className="mt-5 border border-[#1A2842]/15 bg-[#FCF9F3] p-8">
            <p className="font-semibold">
              {gameTab === "live"
                ? "No games are live right now."
                : gameTab === "upcoming"
                  ? "No upcoming games on today’s schedule."
                  : "No completed games yet today."}
            </p>
            <p className="mt-2 text-sm text-[#687384]">
              Choose another tab or visit the game center for more.
            </p>
          </div>
        )}
      </section>

      {/* LEADERS */}
      <section className="border-y border-[#1A2842]/10 bg-[#FCF9F3]">
        <div className="mx-auto max-w-[1440px] px-5 py-12 md:px-8">
          <SectionHeading
            eyebrow={`${season} season`}
            title="The players setting the pace"
            description="Switch categories to see the leaders. Select a player to open their profile."
            href="/leaders"
            linkText="All leaderboards"
          />

          <div className="mt-6 flex flex-wrap gap-2" role="tablist" aria-label="Leader category">
            {(
              [
                "OPS",
                "Home Runs",
                "Batting Average",
                "ERA",
                "Strikeouts",
              ] as LeaderTab[]
            ).map((tab) => (
              <button
                key={tab}
                type="button"
                role="tab"
                aria-selected={leaderTab === tab}
                onClick={() => setLeaderTab(tab)}
                className={`px-4 py-2 text-sm transition ${
                  leaderTab === tab
                    ? "bg-[#D85F46] font-semibold text-white"
                    : "border border-[#1A2842]/15 text-[#687384] hover:border-[#D85F46] hover:text-[#1A2842]"
                }`}
              >
                {tab}
              </button>
            ))}
          </div>

          <div className="mt-6 grid gap-6 lg:grid-cols-[0.8fr_1.2fr]">
            <div>
              {selectedLeaders.rows[0] &&
              playerMap.get(selectedLeaders.rows[0].player_id) ? (
                (() => {
                  const stat = selectedLeaders.rows[0];
                  const player = playerMap.get(stat.player_id)!;
                  const team = player.team_id
                    ? teamMap.get(player.team_id)
                    : undefined;

                  return (
                    <PlayerCard
                      player={player}
                      team={team}
                      stat={stat}
                      statLabel={selectedLeaders.description}
                      statValue={selectedLeaders.value(stat)}
                      featured
                    />
                  );
                })()
              ) : (
                <div className="flex min-h-[360px] items-end bg-[#1A2842] p-7 text-white">
                  <div>
                    <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-[#59B3AD]">
                      {selectedLeaders.description}
                    </p>
                    <h3 className="mt-3 text-2xl font-bold">
                      Leader data isn’t available yet.
                    </h3>
                    <p className="mt-2 text-sm text-white/60">
                      Try another category or check back later in the season.
                    </p>
                  </div>
                </div>
              )}
            </div>

            <div className="border border-[#1A2842]/15 bg-white p-5 sm:p-7">
              <div className="flex items-end justify-between border-b border-[#1A2842]/10 pb-4">
                <div>
                  <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-[#D85F46]">
                    Top five
                  </p>
                  <h3 className="mt-1 text-xl font-bold">{leaderTab}</h3>
                </div>
                <span className="font-mono text-xs text-[#687384]">
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
                      team={
                        player.team_id
                          ? teamMap.get(player.team_id)
                          : undefined
                      }
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

      {/* FEATURED PLAYER */}
      {featuredPlayer && featuredStat && (
        <section className="mx-auto max-w-[1440px] px-5 py-12 md:px-8">
          <SectionHeading
            eyebrow="A name to know"
            title="The season’s OPS leader"
            description="A closer look at the player currently leading the selected season in OPS."
          />

          <Link
            href={`/players/${featuredPlayer.id}`}
            className="group mt-6 grid overflow-hidden bg-[#101A2C] text-white transition hover:shadow-[0_18px_40px_rgba(26,40,66,0.18)] md:grid-cols-[280px_1fr] lg:grid-cols-[340px_1fr]"
          >
            <div className="relative flex min-h-[300px] items-end justify-center overflow-hidden bg-[#0B1423]">
              <div className="absolute left-5 top-5 z-10 text-[10px] font-semibold uppercase tracking-[0.14em] text-[#59B3AD]">
                Player spotlight
              </div>
              <img
                src={headshot(featuredPlayer.id)}
                alt=""
                aria-hidden="true"
                className="h-[300px] w-full object-contain object-bottom transition-transform duration-500 group-hover:scale-[1.03]"
              />
              <div className="absolute bottom-0 h-1 w-full bg-[#D85F46]" />
            </div>

            <div className="flex flex-col justify-between gap-8 p-6 sm:p-9">
              <div>
                <p className="text-sm text-white/55">
                  {featuredTeam?.name ?? "Free Agent"}
                  {featuredPlayer.position
                    ? ` · ${featuredPlayer.position}`
                    : ""}
                </p>

                <h3 className="mt-2 text-4xl font-bold tracking-tight sm:text-5xl">
                  {featuredPlayer.name}
                </h3>

                <p className="mt-4 max-w-xl text-sm leading-6 text-white/60">
                  Leading the qualified hitters in on-base plus slugging for
                  the {season} season.
                </p>
              </div>

              <div className="grid grid-cols-2 gap-4 border-t border-white/15 pt-5 sm:grid-cols-4">
                {[
                  ["AVG", formatAverage(featuredStat.batting_avg)],
                  ["OPS", formatDecimal(featuredStat.ops)],
                  ["HR", formatNumber(featuredStat.home_runs)],
                  ["RBI", formatNumber(featuredStat.rbi)],
                ].map(([label, value]) => (
                  <div key={label}>
                    <p className="font-mono text-2xl font-bold">{value}</p>
                    <p className="mt-1 text-[10px] font-semibold uppercase tracking-[0.12em] text-white/45">
                      {label}
                    </p>
                  </div>
                ))}
              </div>

              <span className="text-sm font-semibold text-[#59B3AD] transition group-hover:text-white">
                Read player profile →
              </span>
            </div>
          </Link>
        </section>
      )}

      {/* EXPLORE */}
      <section className="border-t border-[#1A2842]/10 bg-[#FCF9F3]">
        <div className="mx-auto max-w-[1440px] px-5 py-12 md:px-8">
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
                description:
                  "Find a player and explore their season stats and profile.",
                href: "/players",
                color: "#D85F46",
              },
              {
                number: "02",
                title: "Teams",
                description:
                  "Browse clubs, rosters, and team pages around the league.",
                href: "/teams",
                color: "#59B3AD",
              },
              {
                number: "03",
                title: "Games",
                description:
                  "Follow today’s schedule, live scores, and recent results.",
                href: "/games",
                color: "#6287C7",
              },
              {
                number: "04",
                title: "Compare",
                description:
                  "Put two players side by side and compare their numbers.",
                href: "/compare",
                color: "#D7A943",
              },
            ].map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className="group relative min-h-[220px] overflow-hidden bg-[#F8F3EA] p-6 transition-colors hover:bg-[#1A2842] hover:text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#D85F46]"
              >
                <span
                  className="absolute left-0 top-0 h-1 w-0 transition-all duration-300 group-hover:w-full"
                  style={{ backgroundColor: item.color }}
                />

                <div className="flex items-start justify-between">
                  <span
                    className="font-mono text-xs font-bold"
                    style={{ color: item.color }}
                  >
                    {item.number}
                  </span>
                  <span className="transition-transform group-hover:translate-x-1">
                    →
                  </span>
                </div>

                <div className="mt-16">
                  <h3 className="text-2xl font-bold">{item.title}</h3>
                  <p className="mt-3 text-sm leading-6 text-[#687384] transition-colors group-hover:text-white/65">
                    {item.description}
                  </p>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </section>
    </main>
  );
}