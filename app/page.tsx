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

function formatAverage(value: number | null) {
  if (value === null) return "—";
  return value.toFixed(3).replace(/^0/, "");
}

function formatDecimal(value: number | null) {
  if (value === null) return "—";
  return value.toFixed(3);
}

function formatNumber(value: number | null) {
  if (value === null) return "—";
  return value.toLocaleString();
}

function formatInnings(value: number | null) {
  if (value === null) return "—";
  return value.toFixed(1);
}

function teamLogo(teamId: number | string) {
  return `https://www.mlbstatic.com/team-logos/${teamId}.svg`;
}

function headshot(playerId: number) {
  return `https://img.mlbstatic.com/mlb-photos/image/upload/w_500,q_auto:good/v1/people/${playerId}/headshot/67/current`;
}

function SectionLabel({
  eyebrow,
  title,
  href,
  hrefLabel = "View All →",
}: {
  eyebrow: string;
  title: string;
  href?: string;
  hrefLabel?: string;
}) {
  return (
    <div className="flex items-end justify-between border-b border-[#1A2842]/15 pb-4">
      <div>
        <p className="text-[9px] font-black uppercase tracking-[0.22em] text-[#D85F46]">
          {eyebrow}
        </p>
        <h2 className="mt-1 text-2xl font-black tracking-[-0.04em]">
          {title}
        </h2>
      </div>

      {href && (
        <Link
          href={href}
          className="text-[9px] font-black uppercase tracking-[0.16em] text-[#1A2842]/45 transition hover:text-[#D85F46]"
        >
          {hrefLabel}
        </Link>
      )}
    </div>
  );
}

function GameStatus({ game }: { game: MlbGame }) {
  const state = game.status.abstractGameState;

  if (state === "Live") {
    const inning = game.linescore?.currentInningOrdinal
      ? `${game.linescore.currentInningOrdinal} ${game.linescore.inningState ?? ""}`
      : game.status.detailedState;

    return (
      <span className="inline-flex items-center gap-2 text-[8px] font-black uppercase tracking-[0.15em] text-[#D85F46]">
        <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-[#D85F46]" />
        {inning}
      </span>
    );
  }

  if (state === "Final") {
    return (
      <span className="text-[8px] font-black uppercase tracking-[0.15em] text-[#1A2842]/40">
        Final
      </span>
    );
  }

  const time = new Date(game.gameDate).toLocaleTimeString([], {
    hour: "numeric",
    minute: "2-digit",
  });

  return (
    <span className="text-[8px] font-black uppercase tracking-[0.15em] text-[#59B3AD]">
      {time}
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
      className="group block border border-[#1A2842]/12 bg-white/25 p-5 transition hover:-translate-y-0.5 hover:border-[#D85F46]/50 hover:bg-white/60"
    >
      <div className="flex items-center justify-between">
        <GameStatus game={game} />
        <span className="font-mono text-[8px] text-[#1A2842]/25">
          {game.gamePk}
        </span>
      </div>

      <div className="mt-5 space-y-3">
        {[away, home].map((side, index) => (
          <div
            key={`${side.team.id}-${index}`}
            className="flex items-center justify-between"
          >
            <div className="flex min-w-0 items-center gap-3">
              <img
                src={teamLogo(side.team.id)}
                alt=""
                className="h-8 w-8 object-contain"
              />
              <div className="min-w-0">
                <p className="truncate text-[11px] font-black">
                  {side.team.name}
                </p>
                <p className="font-mono text-[8px] text-[#1A2842]/35">
                  {side.team.abbreviation ?? ""}
                </p>
              </div>
            </div>

            <span
              className={`font-mono text-xl font-black ${
                side.isWinner ? "text-[#1A2842]" : "text-[#1A2842]/45"
              }`}
            >
              {side.score ?? 0}
            </span>
          </div>
        ))}
      </div>

      <div className="mt-5 border-t border-[#1A2842]/10 pt-3 text-right">
        <span className="text-[8px] font-black uppercase tracking-[0.15em] text-[#1A2842]/30 transition group-hover:text-[#D85F46]">
          Game Center →
        </span>
      </div>
    </Link>
  );
}

function LeaderRow({
  rank,
  player,
  team,
  value,
  label,
}: {
  rank: number;
  player: Player;
  team?: Team;
  value: string;
  label: string;
}) {
  return (
    <Link
      href={`/players/${player.id}`}
      className="group grid grid-cols-[32px_1fr_auto] items-center gap-3 border-b border-[#1A2842]/10 py-3 last:border-b-0"
    >
      <span className="font-mono text-[9px] font-black text-[#1A2842]/25">
        {String(rank).padStart(2, "0")}
      </span>

      <div className="flex min-w-0 items-center gap-3">
        <div className="h-9 w-9 shrink-0 overflow-hidden bg-[#E9E1D5]">
          <img
            src={headshot(player.id)}
            alt=""
            className="h-full w-full object-contain"
          />
        </div>

        <div className="min-w-0">
          <p className="truncate text-[10px] font-black transition group-hover:text-[#D85F46]">
            {player.name}
          </p>
          <p className="mt-0.5 text-[7px] font-black uppercase tracking-[0.14em] text-[#1A2842]/35">
            {team?.abbreviation ?? "FA"} · {player.position ?? "—"}
          </p>
        </div>
      </div>

      <div className="text-right">
        <p className="font-mono text-sm font-black">{value}</p>
        <p className="text-[7px] font-black uppercase tracking-[0.12em] text-[#1A2842]/30">
          {label}
        </p>
      </div>
    </Link>
  );
}

export default async function HomePage() {
  const today = new Date().toISOString().slice(0, 10);

  const [{ data: seasonRow }, { data: teamsData }, { data: playersData }] =
    await Promise.all([
      supabase
        .from("PlayerStats")
        .select("season")
        .order("season", { ascending: false })
        .limit(1)
        .maybeSingle(),
      supabase.from("Teams").select("id, name, abbreviation"),
      supabase.from("Player").select("id, name, team_id, position"),
    ]);

  const currentSeason = seasonRow?.season ?? new Date().getFullYear();
  const teams = (teamsData ?? []) as Team[];
  const players = (playersData ?? []) as Player[];

  const { data: statsData } = await supabase
    .from("PlayerStats")
    .select(
      "player_id, season, games, at_bats, hits, home_runs, rbi, walks, strikeouts, batting_avg, obp, slg, ops, innings_pitched, wins, losses, earned_runs, hits_allowed, walks_allowed, strikeouts_pitched, era, whip"
    )
    .eq("season", currentSeason);

  const stats = (statsData ?? []) as PlayerStat[];

  const playerMap = new Map(players.map((player) => [player.id, player]));
  const teamMap = new Map(teams.map((team) => [team.id, team]));

  const qualifiedHitters = stats.filter(
    (stat) => (stat.at_bats ?? 0) >= 50 && (stat.games ?? 0) >= 10
  );

  const qualifiedPitchers = stats.filter(
    (stat) => (stat.innings_pitched ?? 0) >= 10
  );

  const topOps = [...qualifiedHitters]
    .filter((stat) => stat.ops !== null)
    .sort((a, b) => (b.ops ?? -Infinity) - (a.ops ?? -Infinity))
    .slice(0, 5);

  const topHr = [...qualifiedHitters]
    .filter((stat) => stat.home_runs !== null)
    .sort((a, b) => (b.home_runs ?? -Infinity) - (a.home_runs ?? -Infinity))
    .slice(0, 5);

  const topAvg = [...qualifiedHitters]
    .filter((stat) => stat.batting_avg !== null)
    .sort(
      (a, b) =>
        (b.batting_avg ?? -Infinity) - (a.batting_avg ?? -Infinity)
    )
    .slice(0, 5);

  const topEra = [...qualifiedPitchers]
    .filter((stat) => stat.era !== null)
    .sort((a, b) => (a.era ?? Infinity) - (b.era ?? Infinity))
    .slice(0, 5);

  const topKs = [...qualifiedPitchers]
    .filter((stat) => stat.strikeouts_pitched !== null)
    .sort(
      (a, b) =>
        (b.strikeouts_pitched ?? -Infinity) -
        (a.strikeouts_pitched ?? -Infinity)
    )
    .slice(0, 5);

  const featuredStat =
    topOps[0] ??
    [...stats]
      .filter((stat) => stat.ops !== null)
      .sort((a, b) => (b.ops ?? -Infinity) - (a.ops ?? -Infinity))[0];

  const featuredPlayer = featuredStat
    ? playerMap.get(featuredStat.player_id)
    : undefined;

  const featuredTeam = featuredPlayer?.team_id
    ? teamMap.get(featuredPlayer.team_id)
    : undefined;

  let games: MlbGame[] = [];

  try {
    const response = await fetch(
      `https://statsapi.mlb.com/api/v1/schedule?sportId=1&date=${today}&hydrate=team,linescore`,
      { next: { revalidate: 30 } }
    );

    if (response.ok) {
      const data = await response.json();
      games = (data.dates?.[0]?.games ?? []) as MlbGame[];
    }
  } catch {
    games = [];
  }

  const liveGames = games.filter(
    (game) => game.status.abstractGameState === "Live"
  );
  const upcomingGames = games
    .filter((game) => game.status.abstractGameState === "Preview")
    .slice(0, 4);
  const completedGames = games
    .filter((game) => game.status.abstractGameState === "Final")
    .slice(-4)
    .reverse();

  const totalPlayers = players.length;
  const totalTeams = teams.length;
  const totalStats = stats.length;

  return (
    <main className="min-h-screen bg-[#F8F3EA] text-[#1A2842]">
      {/* HERO */}
      <section className="overflow-hidden bg-[#101A2C] text-white">
        <div className="mx-auto max-w-[1440px]">
          <div className="grid min-h-[520px] lg:grid-cols-[1.15fr_0.85fr]">
            <div className="relative flex flex-col justify-end overflow-hidden border-x border-white/10 px-6 py-12 md:px-10 lg:px-14">
              <div className="paper-grid absolute inset-0 opacity-[0.08]" />

              <div className="relative">
                <div className="flex items-center gap-3">
                  <span className="h-2 w-2 bg-[#D85F46]" />
                  <p className="text-[9px] font-black uppercase tracking-[0.24em] text-[#59B3AD]">
                    Baseball Intelligence
                  </p>
                </div>

                <h1 className="mt-7 max-w-4xl text-6xl font-black leading-[0.83] tracking-[-0.07em] md:text-8xl lg:text-[112px]">
                  OFFSHORE
                  <br />
                  <span className="text-[#D85F46]">BREAK.</span>
                </h1>

                <div className="mt-8 max-w-xl">
                  <p className="text-sm leading-6 text-white/50">
                    Baseball stats, told as stories. Explore players, games,
                    leaders, teams, and the numbers behind the game.
                  </p>
                </div>

                <div className="mt-8 flex flex-wrap gap-2">
                  <Link
                    href="/players"
                    className="border border-[#D85F46] bg-[#D85F46] px-5 py-3 text-[9px] font-black uppercase tracking-[0.16em] text-white transition hover:border-[#59B3AD] hover:bg-[#59B3AD]"
                  >
                    Explore Players →
                  </Link>

                  <Link
                    href="/games"
                    className="border border-white/15 bg-white/[0.04] px-5 py-3 text-[9px] font-black uppercase tracking-[0.16em] text-white/70 transition hover:border-white/30 hover:text-white"
                  >
                    Game Center →
                  </Link>

                  <Link
                    href="/leaders"
                    className="border border-white/15 bg-white/[0.04] px-5 py-3 text-[9px] font-black uppercase tracking-[0.16em] text-white/70 transition hover:border-white/30 hover:text-white"
                  >
                    Leaders →
                  </Link>
                </div>
              </div>
            </div>

            <div className="grid border-x border-white/10 bg-[#0B1423] md:grid-cols-2 lg:grid-cols-1">
              <div className="border-b border-white/10 p-7 md:border-r lg:border-r-0">
                <p className="text-[8px] font-black uppercase tracking-[0.2em] text-white/25">
                  Today
                </p>

                <div className="mt-5 flex items-end justify-between">
                  <p className="font-mono text-4xl font-black">
                    {new Date(`${today}T12:00:00`).toLocaleDateString(
                      undefined,
                      { month: "short", day: "numeric" }
                    )}
                  </p>
                  <p className="text-[8px] font-black uppercase tracking-widest text-[#59B3AD]">
                    {games.length} Games
                  </p>
                </div>

                <div className="mt-7 grid grid-cols-3 border-y border-white/10">
                  <div className="border-r border-white/10 py-5">
                    <p className="font-mono text-2xl font-black text-[#D85F46]">
                      {liveGames.length}
                    </p>
                    <p className="mt-1 text-[7px] font-black uppercase tracking-widest text-white/25">
                      Live
                    </p>
                  </div>

                  <div className="border-r border-white/10 py-5 pl-4">
                    <p className="font-mono text-2xl font-black">
                      {upcomingGames.length}
                    </p>
                    <p className="mt-1 text-[7px] font-black uppercase tracking-widest text-white/25">
                      Upcoming
                    </p>
                  </div>

                  <div className="py-5 pl-4">
                    <p className="font-mono text-2xl font-black">
                      {completedGames.length}
                    </p>
                    <p className="mt-1 text-[7px] font-black uppercase tracking-widest text-white/25">
                      Final
                    </p>
                  </div>
                </div>
              </div>

              <div className="p-7">
                <p className="text-[8px] font-black uppercase tracking-[0.2em] text-white/25">
                  Database
                </p>

                <div className="mt-6 space-y-5">
                  {[
                    ["Players", totalPlayers.toLocaleString()],
                    ["Teams", totalTeams.toLocaleString()],
                    ["Season", String(currentSeason)],
                    ["Stat Lines", totalStats.toLocaleString()],
                  ].map(([label, value]) => (
                    <div
                      key={label}
                      className="flex items-end justify-between border-b border-white/10 pb-4"
                    >
                      <span className="text-[8px] font-black uppercase tracking-[0.15em] text-white/30">
                        {label}
                      </span>
                      <span className="font-mono text-lg font-black">
                        {value}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* TODAY'S GAMES */}
      <section className="paper-grid mx-auto max-w-[1440px] px-5 py-12 md:px-8">
        <SectionLabel
          eyebrow="Around The League"
          title="Today's Games"
          href="/games"
          hrefLabel="Full Game Center →"
        />

        {games.length > 0 ? (
          <>
            {liveGames.length > 0 && (
              <div className="mt-7">
                <p className="mb-3 text-[8px] font-black uppercase tracking-[0.18em] text-[#D85F46]">
                  Live Now
                </p>
                <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                  {liveGames.map((game) => (
                    <GameCard key={game.gamePk} game={game} />
                  ))}
                </div>
              </div>
            )}

            <div className="mt-7">
              <p className="mb-3 text-[8px] font-black uppercase tracking-[0.18em] text-[#59B3AD]">
                Upcoming
              </p>
              <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                {(upcomingGames.length ? upcomingGames : completedGames).map(
                  (game) => (
                    <GameCard key={game.gamePk} game={game} />
                  )
                )}
              </div>
            </div>
          </>
        ) : (
          <div className="mt-6 border border-[#1A2842]/15 bg-white/25 p-10">
            <p className="font-mono text-xs text-[#1A2842]/40">
              No MLB games found for today.
            </p>
          </div>
        )}
      </section>

      {/* LEADERS */}
      <section className="mx-auto max-w-[1440px] px-5 pb-12 md:px-8">
        <SectionLabel
          eyebrow={`${currentSeason} Season`}
          title="The Numbers"
          href="/leaders"
          hrefLabel="All Leaderboards →"
        />

        <div className="mt-6 grid gap-6 lg:grid-cols-2">
          <div className="border border-[#1A2842]/15 bg-white/20 p-6">
            <div className="flex items-end justify-between border-b border-[#1A2842]/10 pb-4">
              <div>
                <p className="text-[8px] font-black uppercase tracking-[0.18em] text-[#D85F46]">
                  Hitting
                </p>
                <h3 className="mt-1 text-xl font-black">OPS Leaders</h3>
              </div>
              <span className="font-mono text-[8px] text-[#1A2842]/30">
                QUALIFIED
              </span>
            </div>

            <div className="mt-2">
              {topOps.map((stat, index) => {
                const player = playerMap.get(stat.player_id);
                if (!player) return null;

                return (
                  <LeaderRow
                    key={stat.player_id}
                    rank={index + 1}
                    player={player}
                    team={
                      player.team_id
                        ? teamMap.get(player.team_id)
                        : undefined
                    }
                    value={formatDecimal(stat.ops)}
                    label="OPS"
                  />
                );
              })}
            </div>
          </div>

          <div className="border border-[#1A2842]/15 bg-white/20 p-6">
            <div className="flex items-end justify-between border-b border-[#1A2842]/10 pb-4">
              <div>
                <p className="text-[8px] font-black uppercase tracking-[0.18em] text-[#59B3AD]">
                  Pitching
                </p>
                <h3 className="mt-1 text-xl font-black">ERA Leaders</h3>
              </div>
              <span className="font-mono text-[8px] text-[#1A2842]/30">
                QUALIFIED
              </span>
            </div>

            <div className="mt-2">
              {topEra.map((stat, index) => {
                const player = playerMap.get(stat.player_id);
                if (!player) return null;

                return (
                  <LeaderRow
                    key={stat.player_id}
                    rank={index + 1}
                    player={player}
                    team={
                      player.team_id
                        ? teamMap.get(player.team_id)
                        : undefined
                    }
                    value={formatDecimal(stat.era)}
                    label="ERA"
                  />
                );
              })}
            </div>
          </div>
        </div>
      </section>

      {/* LEADERBOARD STRIP */}
      <section className="mx-auto max-w-[1440px] px-5 pb-12 md:px-8">
        <div className="grid border-l border-[#1A2842]/15 sm:grid-cols-2 lg:grid-cols-5">
          {[
            {
              label: "AVG",
              color: "coral",
              data: topAvg,
              getValue: (stat: PlayerStat) => formatAverage(stat.batting_avg),
            },
            {
              label: "HR",
              color: "teal",
              data: topHr,
              getValue: (stat: PlayerStat) => formatNumber(stat.home_runs),
            },
            {
              label: "K",
              color: "blue",
              data: topKs,
              getValue: (stat: PlayerStat) =>
                formatNumber(stat.strikeouts_pitched),
            },
            {
              label: "OPS",
              color: "coral",
              data: topOps,
              getValue: (stat: PlayerStat) => formatDecimal(stat.ops),
            },
            {
              label: "WHIP",
              color: "teal",
              data: [...qualifiedPitchers]
                .filter((stat) => stat.whip !== null)
                .sort((a, b) => (a.whip ?? Infinity) - (b.whip ?? Infinity))
                .slice(0, 5),
              getValue: (stat: PlayerStat) => formatDecimal(stat.whip),
            },
          ].map((leader) => {
            const first = leader.data[0];
            const player = first ? playerMap.get(first.player_id) : undefined;

            return (
              <Link
                key={leader.label}
                href={player ? `/players/${player.id}` : "/leaders"}
                className="group border-r border-b border-[#1A2842]/15 bg-[#1A2842] p-5 text-white transition hover:bg-[#0B1423]"
              >
                <div className="flex items-center justify-between">
                  <span
                    className={`h-2 w-2 ${
                      leader.color === "coral"
                        ? "bg-[#D85F46]"
                        : leader.color === "teal"
                          ? "bg-[#59B3AD]"
                          : "bg-[#6287C7]"
                    }`}
                  />
                  <span className="text-[8px] font-black uppercase tracking-[0.16em] text-white/30">
                    Leader
                  </span>
                </div>

                <p className="mt-8 font-mono text-3xl font-black">
                  {first ? leader.getValue(first) : "—"}
                </p>

                <p className="mt-1 text-[8px] font-black uppercase tracking-[0.18em] text-white/30">
                  {leader.label}
                </p>

                <p className="mt-6 truncate text-[10px] font-black transition group-hover:text-[#D85F46]">
                  {player?.name ?? "No data"}
                </p>

                <p className="mt-1 text-[7px] font-black uppercase tracking-[0.14em] text-white/25">
                  {player?.team_id
                    ? teamMap.get(player.team_id)?.abbreviation ?? "—"
                    : "—"}
                </p>
              </Link>
            );
          })}
        </div>
      </section>

      {/* FEATURED PLAYER */}
      {featuredPlayer && featuredStat && (
        <section className="mx-auto max-w-[1440px] px-5 pb-12 md:px-8">
          <SectionLabel eyebrow="Player Spotlight" title="Featured" />

          <div className="mt-6 overflow-hidden bg-[#101A2C] text-white">
            <div className="grid lg:grid-cols-[300px_1fr_280px]">
              <div className="relative flex h-[300px] items-end justify-center overflow-hidden bg-[#0B1423]">
                <div className="absolute left-5 top-5">
                  <p className="text-[8px] font-black uppercase tracking-[0.2em] text-[#59B3AD]">
                    {currentSeason} Spotlight
                  </p>
                </div>

                <div className="h-[275px] w-[240px]">
                  <img
                    src={headshot(featuredPlayer.id)}
                    alt=""
                    className="h-full w-full object-contain"
                  />
                </div>

                <div className="absolute bottom-0 left-0 h-1 w-full bg-gradient-to-r from-[#D85F46] via-[#59B3AD] to-[#6287C7]" />
              </div>

              <div className="p-7 md:p-10">
                <div className="flex items-center gap-3">
                  {featuredTeam && (
                    <img
                      src={teamLogo(featuredTeam.id)}
                      alt=""
                      className="h-10 w-10 object-contain"
                    />
                  )}

                  <div>
                    <p className="text-[9px] font-black uppercase tracking-[0.2em] text-[#59B3AD]">
                      {featuredTeam?.name ?? "Free Agent"}
                    </p>
                    <p className="mt-1 text-[8px] font-black uppercase tracking-widest text-white/30">
                      {featuredPlayer.position ?? "N/A"}
                    </p>
                  </div>
                </div>

                <h3 className="mt-6 text-4xl font-black tracking-[-0.05em] md:text-5xl">
                  {featuredPlayer.name}
                </h3>

                <p className="mt-4 max-w-xl text-xs leading-6 text-white/40">
                  The current OPS leader among Offshore Break&apos;s qualified
                  hitters for the {currentSeason} season.
                </p>

                <div className="mt-7 grid max-w-xl grid-cols-4 border-y border-white/10">
                  <div className="border-r border-white/10 py-4">
                    <p className="font-mono text-xl font-black">
                      {formatAverage(featuredStat.batting_avg)}
                    </p>
                    <p className="mt-1 text-[7px] font-black uppercase tracking-widest text-white/25">
                      AVG
                    </p>
                  </div>
                  <div className="border-r border-white/10 py-4 pl-4">
                    <p className="font-mono text-xl font-black">
                      {formatDecimal(featuredStat.ops)}
                    </p>
                    <p className="mt-1 text-[7px] font-black uppercase tracking-widest text-white/25">
                      OPS
                    </p>
                  </div>
                  <div className="border-r border-white/10 py-4 pl-4">
                    <p className="font-mono text-xl font-black">
                      {formatNumber(featuredStat.home_runs)}
                    </p>
                    <p className="mt-1 text-[7px] font-black uppercase tracking-widest text-white/25">
                      HR
                    </p>
                  </div>
                  <div className="py-4 pl-4">
                    <p className="font-mono text-xl font-black">
                      {formatNumber(featuredStat.rbi)}
                    </p>
                    <p className="mt-1 text-[7px] font-black uppercase tracking-widest text-white/25">
                      RBI
                    </p>
                  </div>
                </div>

                <div className="mt-7">
                  <Link
                    href={`/players/${featuredPlayer.id}`}
                    className="inline-flex border border-[#D85F46] bg-[#D85F46] px-5 py-3 text-[9px] font-black uppercase tracking-[0.16em] text-white transition hover:border-[#59B3AD] hover:bg-[#59B3AD]"
                  >
                    View Player Profile →
                  </Link>
                </div>
              </div>

              <div className="border-t border-white/10 bg-white/[0.025] p-7 lg:border-l lg:border-t-0">
                <p className="text-[8px] font-black uppercase tracking-[0.2em] text-white/25">
                  Why They&apos;re Here
                </p>

                <p className="mt-4 font-mono text-6xl font-black text-[#D85F46]">
                  #{1}
                </p>

                <p className="mt-2 text-[8px] font-black uppercase tracking-[0.16em] text-white/35">
                  OPS Leader
                </p>

                <div className="mt-8 border-t border-white/10 pt-5">
                  <p className="text-[8px] leading-5 text-white/30">
                    Qualified hitter threshold: 50+ AB and 10+ games.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </section>
      )}

      {/* EXPLORE */}
      <section className="paper-grid mx-auto max-w-[1440px] px-5 pb-20 md:px-8">
        <SectionLabel eyebrow="The Database" title="Explore Offshore Break" />

        <div className="mt-6 grid gap-px bg-[#1A2842]/15 md:grid-cols-2">
          {[
            {
              number: "01",
              title: "Players",
              description:
                "Browse the player universe, filter through the data, and dive into individual profiles.",
              href: "/players",
            },
            {
              number: "02",
              title: "Teams",
              description:
                "Explore the league by team, roster, and performance context.",
              href: "/teams",
            },
            {
              number: "03",
              title: "Games",
              description:
                "Follow today's scoreboard, live games, finals, and full Game Center pages.",
              href: "/games",
            },
            {
              number: "04",
              title: "Leaders",
              description:
                "Find the players sitting at the top of the season's major statistical categories.",
              href: "/leaders",
            },
          ].map((item) => (
            <Link
              key={item.number}
              href={item.href}
              className="group bg-[#F8F3EA] p-7 transition hover:bg-[#1A2842] hover:text-white md:p-9"
            >
              <div className="flex items-start justify-between">
                <span className="font-mono text-[9px] font-black text-[#D85F46]">
                  {item.number}
                </span>
                <span className="text-lg transition-transform group-hover:translate-x-1">
                  →
                </span>
              </div>

              <h3 className="mt-12 text-3xl font-black tracking-[-0.04em]">
                {item.title}
              </h3>

              <p className="mt-3 max-w-md text-xs leading-6 text-[#1A2842]/45 group-hover:text-white/40">
                {item.description}
              </p>
            </Link>
          ))}
        </div>

        <Link
          href="/compare"
          className="mt-px block bg-[#D85F46] p-7 text-white transition hover:bg-[#59B3AD] md:p-9"
        >
          <div className="flex items-end justify-between gap-6">
            <div>
              <p className="text-[8px] font-black uppercase tracking-[0.2em] text-white/60">
                Head To Head
              </p>
              <h3 className="mt-2 text-3xl font-black tracking-[-0.04em]">
                Compare Players
              </h3>
              <p className="mt-3 max-w-xl text-xs leading-6 text-white/60">
                Put two players side by side and see how their numbers stack
                up across the Offshore Break data set.
              </p>
            </div>

            <span className="shrink-0 text-2xl">→</span>
          </div>
        </Link>
      </section>
    </main>
  );
}
