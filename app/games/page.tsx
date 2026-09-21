import Link from "next/link";
import { supabase } from "@/lib/supabaseClient";

type Team = {
  id: string;
  name: string;
  abbreviation: string;
};

type Game = {
  id: number;
  game_date: string;
  home_team_id: string;
  away_team_id: string;
  home_score: number | null;
  away_score: number | null;
};

type MlbTeam = {
  id: number;
  name: string;
  abbreviation: string;
  teamName: string;
};

type MlbGame = {
  gamePk: number;
  gameDate: string;
  status: {
    abstractGameState: "Preview" | "Live" | "Final" | string;
    detailedState: string;
    codedGameState: string;
  };
  teams: {
    away: {
      team: MlbTeam;
      score?: number;
      isWinner?: boolean;
    };
    home: {
      team: MlbTeam;
      score?: number;
      isWinner?: boolean;
    };
  };
  linescore?: {
    currentInning?: number;
    currentInningOrdinal?: string;
    inningState?: string;
    isTopInning?: boolean;
  };
};

type MlbScheduleResponse = {
  dates?: {
    date: string;
    games: MlbGame[];
  }[];
};

async function getTodaysGames(): Promise<MlbGame[]> {
  const today = new Date().toISOString().slice(0, 10);

  try {
    const response = await fetch(
      `https://statsapi.mlb.com/api/v1/schedule?sportId=1&date=${today}&hydrate=team,linescore`,
      {
        next: {
          revalidate: 30,
        },
      }
    );

    if (!response.ok) {
      return [];
    }

    const data: MlbScheduleResponse = await response.json();

    return data.dates?.[0]?.games ?? [];
  } catch {
    return [];
  }
}

function getStatus(game: MlbGame) {
  const state = game.status.abstractGameState;

  if (state === "Live") {
    return {
      label: "LIVE",
      className: "bg-[#D85F46] text-white",
    };
  }

  if (state === "Final") {
    return {
      label: "FINAL",
      className: "bg-[#1A2842] text-white",
    };
  }

  return {
    label: game.status.detailedState.toUpperCase(),
    className: "bg-[#E7E1D7] text-[#1A2842]",
  };
}

function getLiveInning(game: MlbGame) {
  if (game.status.abstractGameState !== "Live" || !game.linescore) {
    return null;
  }

  const inning = game.linescore.currentInning;
  const ordinal = game.linescore.currentInningOrdinal;
  const state = game.linescore.inningState;

  if (!inning) {
    return "LIVE";
  }

  if (ordinal) {
    return `${state ?? ""} ${ordinal}`.trim();
  }

  return `INNING ${inning}`;
}

function formatGameTime(gameDate: string) {
  return new Date(gameDate).toLocaleTimeString([], {
    hour: "numeric",
    minute: "2-digit",
  });
}

function formatDate(date: string) {
  return new Date(date).toLocaleDateString([], {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
  });
}

function TeamLogo({
  teamId,
  size = 42,
}: {
  teamId: number;
  size?: number;
}) {
  return (
    <img
      src={`https://www.mlbstatic.com/team-logos/${teamId}.svg`}
      alt=""
      width={size}
      height={size}
      className="object-contain"
    />
  );
}

function TodayGameCard({ game }: { game: MlbGame }) {
  const status = getStatus(game);
  const liveInning = getLiveInning(game);

  const awayScore =
    game.teams.away.score !== undefined ? game.teams.away.score : "-";

  const homeScore =
    game.teams.home.score !== undefined ? game.teams.home.score : "-";

  return (
    <Link
      href={`/games/${game.gamePk}`}
      className="group block overflow-hidden rounded-2xl border border-[#DED7CC] bg-white transition hover:-translate-y-0.5 hover:border-[#59B3AD] hover:shadow-lg"
    >
      {/* Header */}
      <div className="flex items-center justify-between border-b border-[#E8E1D7] px-5 py-3">
        <div className="text-xs font-medium uppercase tracking-[0.16em] text-[#77736C]">
          {formatGameTime(game.gameDate)}
        </div>

        <div
          className={`rounded-full px-3 py-1 text-[10px] font-bold tracking-[0.14em] ${status.className}`}
        >
          {status.label}
        </div>
      </div>

      {/* Teams */}
      <div className="px-5 py-5">
        <div className="space-y-4">
          {/* Away */}
          <div className="flex items-center justify-between">
            <div className="flex min-w-0 items-center gap-3">
              <TeamLogo teamId={game.teams.away.team.id} />

              <div className="min-w-0">
                <div className="truncate text-sm font-semibold text-[#1A2842]">
                  {game.teams.away.team.name}
                </div>

                <div className="text-[11px] uppercase tracking-wider text-[#8B867D]">
                  {game.teams.away.team.abbreviation}
                </div>
              </div>
            </div>

            <div className="text-2xl font-bold text-[#1A2842]">
              {awayScore}
            </div>
          </div>

          {/* Home */}
          <div className="flex items-center justify-between">
            <div className="flex min-w-0 items-center gap-3">
              <TeamLogo teamId={game.teams.home.team.id} />

              <div className="min-w-0">
                <div className="truncate text-sm font-semibold text-[#1A2842]">
                  {game.teams.home.team.name}
                </div>

                <div className="text-[11px] uppercase tracking-wider text-[#8B867D]">
                  {game.teams.home.team.abbreviation}
                </div>
              </div>
            </div>

            <div className="text-2xl font-bold text-[#1A2842]">
              {homeScore}
            </div>
          </div>
        </div>

        {/* Live information */}
        {liveInning && (
          <div className="mt-5 rounded-xl bg-[#F4EEE5] px-4 py-3 text-center">
            <span className="text-xs font-bold uppercase tracking-[0.16em] text-[#D85F46]">
              {liveInning}
            </span>
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="border-t border-[#E8E1D7] px-5 py-3 text-right">
        <span className="text-xs font-semibold text-[#59A7A2] transition group-hover:text-[#D85F46]">
          View Game →
        </span>
      </div>
    </Link>
  );
}

function HistoricalGameCard({
  game,
  teamMap,
}: {
  game: Game;
  teamMap: Map<string, Team>;
}) {
  const away = teamMap.get(game.away_team_id);
  const home = teamMap.get(game.home_team_id);

  return (
    <Link
      href={`/games/${game.id}`}
      className="group block rounded-2xl border border-[#DED7CC] bg-white transition hover:-translate-y-0.5 hover:border-[#59B3AD] hover:shadow-lg"
    >
      <div className="flex items-center justify-between border-b border-[#E8E1D7] px-5 py-3">
        <div className="text-xs font-medium uppercase tracking-[0.16em] text-[#77736C]">
          {formatGameTime(game.game_date)}
        </div>

        <div className="rounded-full bg-[#1A2842] px-3 py-1 text-[10px] font-bold tracking-[0.14em] text-white">
          FINAL
        </div>
      </div>

      <div className="px-5 py-5">
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-sm font-semibold text-[#1A2842]">
                {away?.name ?? game.away_team_id}
              </div>

              <div className="text-[11px] uppercase tracking-wider text-[#8B867D]">
                {away?.abbreviation ?? ""}
              </div>
            </div>

            <div className="text-2xl font-bold text-[#1A2842]">
              {game.away_score ?? "-"}
            </div>
          </div>

          <div className="flex items-center justify-between">
            <div>
              <div className="text-sm font-semibold text-[#1A2842]">
                {home?.name ?? game.home_team_id}
              </div>

              <div className="text-[11px] uppercase tracking-wider text-[#8B867D]">
                {home?.abbreviation ?? ""}
              </div>
            </div>

            <div className="text-2xl font-bold text-[#1A2842]">
              {game.home_score ?? "-"}
            </div>
          </div>
        </div>
      </div>

      <div className="border-t border-[#E8E1D7] px-5 py-3 text-right">
        <span className="text-xs font-semibold text-[#59A7A2] transition group-hover:text-[#D85F46]">
          View Box Score →
        </span>
      </div>
    </Link>
  );
}

export default async function GamesPage() {
  const [todaysGames, historicalResult] = await Promise.all([
    getTodaysGames(),

    supabase
      .from("Games")
      .select(
        "id, game_date, home_team_id, away_team_id, home_score, away_score"
      )
      .order("game_date", { ascending: false })
      .limit(30),
  ]);

  const historicalGames = historicalResult.data ?? [];

  const teamIds = [
    ...new Set(
      historicalGames.flatMap((game) => [
        game.home_team_id,
        game.away_team_id,
      ])
    ),
  ];

  const { data: teams } = teamIds.length
    ? await supabase
        .from("Teams")
        .select("id, name, abbreviation")
        .in("id", teamIds)
    : { data: [] };

  const teamMap = new Map(
    (teams ?? []).map((team) => [team.id, team])
  );

  const liveGames = todaysGames.filter(
    (game) => game.status.abstractGameState === "Live"
  );

  const scheduledGames = todaysGames.filter(
    (game) => game.status.abstractGameState === "Preview"
  );

  const finalGames = todaysGames.filter(
    (game) => game.status.abstractGameState === "Final"
  );

  return (
    <main className="min-h-screen bg-[#F8F3EA]">
      {/* Page Header */}
      <section className="border-b border-[#DED7CC] bg-[#F8F3EA]">
        <div className="mx-auto max-w-7xl px-6 py-12 md:px-10">
          <div className="max-w-3xl">
            <div className="mb-3 text-xs font-bold uppercase tracking-[0.2em] text-[#D85F46]">
              Around the League
            </div>

            <h1 className="text-4xl font-bold tracking-tight text-[#1A2842] md:text-5xl">
              Games
            </h1>

            <p className="mt-4 max-w-2xl text-base leading-7 text-[#68645E]">
              Follow today&apos;s action live and explore recent results from
              around Major League Baseball.
            </p>
          </div>
        </div>
      </section>

      <div className="mx-auto max-w-7xl px-6 py-10 md:px-10">
        {/* TODAY */}
        <section>
          <div className="mb-6 flex items-end justify-between">
            <div>
              <div className="text-xs font-bold uppercase tracking-[0.18em] text-[#59A7A2]">
                Live Feed
              </div>

              <h2 className="mt-1 text-2xl font-bold text-[#1A2842]">
                Today
              </h2>

              <p className="mt-1 text-sm text-[#77736C]">
                {formatDate(new Date().toISOString())}
              </p>
            </div>

            {liveGames.length > 0 && (
              <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-[#D85F46]">
                <span className="h-2 w-2 animate-pulse rounded-full bg-[#D85F46]" />
                {liveGames.length} Live
              </div>
            )}
          </div>

          {todaysGames.length === 0 ? (
            <div className="rounded-2xl border border-[#DED7CC] bg-white px-6 py-12 text-center">
              <div className="text-lg font-semibold text-[#1A2842]">
                No games today
              </div>

              <p className="mt-2 text-sm text-[#77736C]">
                Check back during the next slate of games.
              </p>
            </div>
          ) : (
            <>
              {/* Live */}
              {liveGames.length > 0 && (
                <div className="mb-8">
                  <div className="mb-3 text-xs font-bold uppercase tracking-[0.16em] text-[#D85F46]">
                    In Progress
                  </div>

                  <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">
                    {liveGames.map((game) => (
                      <TodayGameCard key={game.gamePk} game={game} />
                    ))}
                  </div>
                </div>
              )}

              {/* Scheduled */}
              {scheduledGames.length > 0 && (
                <div className="mb-8">
                  <div className="mb-3 text-xs font-bold uppercase tracking-[0.16em] text-[#77736C]">
                    Upcoming
                  </div>

                  <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">
                    {scheduledGames.map((game) => (
                      <TodayGameCard key={game.gamePk} game={game} />
                    ))}
                  </div>
                </div>
              )}

              {/* Final */}
              {finalGames.length > 0 && (
                <div>
                  <div className="mb-3 text-xs font-bold uppercase tracking-[0.16em] text-[#77736C]">
                    Completed
                  </div>

                  <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">
                    {finalGames.map((game) => (
                      <TodayGameCard key={game.gamePk} game={game} />
                    ))}
                  </div>
                </div>
              )}
            </>
          )}
        </section>

        {/* RECENT RESULTS */}
        <section className="mt-16">
          <div className="mb-6">
            <div className="text-xs font-bold uppercase tracking-[0.18em] text-[#59A7A2]">
              Archive
            </div>

            <h2 className="mt-1 text-2xl font-bold text-[#1A2842]">
              Recent Results
            </h2>

            <p className="mt-1 text-sm text-[#77736C]">
              Completed games from your Offshore Break database.
            </p>
          </div>

          {historicalGames.length === 0 ? (
            <div className="rounded-2xl border border-[#DED7CC] bg-white px-6 py-12 text-center text-sm text-[#77736C]">
              No historical games available.
            </div>
          ) : (
            <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">
              {historicalGames.map((game) => (
                <HistoricalGameCard
                  key={game.id}
                  game={game}
                  teamMap={teamMap}
                />
              ))}
            </div>
          )}
        </section>
      </div>
    </main>
  );
}