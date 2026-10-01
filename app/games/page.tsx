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
  abbreviation?: string;
  teamName?: string;
};

type MlbGame = {
  gamePk: number;
  gameDate: string;
  status: {
    abstractGameState: string;
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

function getLocalDateString(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

async function getTodaysGames(): Promise<MlbGame[]> {
  const today = getLocalDateString(new Date());

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
      console.error("MLB schedule request failed:", response.status);
      return [];
    }

    const data: MlbScheduleResponse = await response.json();
    return data.dates?.flatMap((date) => date.games) ?? [];
  } catch (error) {
    console.error("Unable to load MLB schedule:", error);
    return [];
  }
}

function getStatus(game: MlbGame) {
  const state = game.status.abstractGameState;

  if (state === "Live") {
    return {
      label: "Live",
      className: "bg-[#D85F46] text-white",
    };
  }

  if (state === "Final") {
    return {
      label: "Final",
      className: "bg-[#1A2842] text-white",
    };
  }

  return {
    label: game.status.detailedState || "Scheduled",
    className: "bg-[#E8E1D7] text-[#1A2842]",
  };
}

function getLiveInning(game: MlbGame) {
  if (game.status.abstractGameState !== "Live" || !game.linescore) {
    return null;
  }

  const inning = game.linescore.currentInning;
  const ordinal = game.linescore.currentInningOrdinal;
  const inningState = game.linescore.inningState;

  if (!inning) return "In progress";

  if (ordinal) {
    return `${inningState ?? ""} ${ordinal}`.trim();
  }

  return `Inning ${inning}`;
}

function formatGameTime(gameDate: string) {
  return new Date(gameDate).toLocaleTimeString([], {
    hour: "numeric",
    minute: "2-digit",
  });
}

function formatDate(date: Date) {
  return date.toLocaleDateString([], {
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
      aria-hidden="true"
      width={size}
      height={size}
      loading="lazy"
      className="shrink-0 object-contain"
    />
  );
}

function ScoreRow({
  team,
  score,
  winner,
}: {
  team: MlbTeam;
  score?: number;
  winner?: boolean;
}) {
  return (
    <div className="flex items-center justify-between gap-4">
      <div className="flex min-w-0 items-center gap-3">
        <TeamLogo teamId={team.id} />

        <div className="min-w-0">
          <p
            className={`truncate text-sm ${
              winner ? "font-bold text-[#1A2842]" : "font-medium text-[#687384]"
            }`}
          >
            {team.name}
          </p>
          <p className="mt-0.5 text-[10px] uppercase tracking-[0.12em] text-[#8B887F]">
            {team.abbreviation ?? ""}
          </p>
        </div>
      </div>

      <p
        className={`shrink-0 font-mono text-2xl ${
          winner ? "font-bold text-[#1A2842]" : "font-medium text-[#687384]"
        }`}
      >
        {score ?? "—"}
      </p>
    </div>
  );
}

function TodayGameCard({ game }: { game: MlbGame }) {
  const status = getStatus(game);
  const liveInning = getLiveInning(game);

  return (
    <Link
      href={`/games/${game.gamePk}`}
      className="group block border-t-2 border-[#1A2842] bg-[#FCF9F3] transition hover:-translate-y-0.5 hover:border-[#D85F46] hover:shadow-[0_12px_30px_rgba(26,40,66,0.08)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#D85F46]"
    >
      <div className="flex items-center justify-between gap-3 border-b border-[#1A2842]/10 px-5 py-4">
        <p className="font-mono text-xs text-[#687384]">
          {formatGameTime(game.gameDate)}
        </p>

        <span
          className={`px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.1em] ${status.className}`}
        >
          {status.label}
        </span>
      </div>

      <div className="space-y-4 px-5 py-5">
        <ScoreRow
          team={game.teams.away.team}
          score={game.teams.away.score}
          winner={game.teams.away.isWinner}
        />

        <div className="ml-[54px] border-t border-dashed border-[#1A2842]/15" />

        <ScoreRow
          team={game.teams.home.team}
          score={game.teams.home.score}
          winner={game.teams.home.isWinner}
        />

        {liveInning && (
          <p className="border-t border-[#1A2842]/10 pt-3 text-center text-xs font-semibold text-[#D85F46]">
            {liveInning}
          </p>
        )}
      </div>

      <div className="flex items-center justify-between border-t border-[#1A2842]/10 px-5 py-3">
        <span className="text-xs text-[#687384]">
          {game.status.abstractGameState === "Final"
            ? "Final score"
            : "Game details"}
        </span>
        <span className="text-xs font-semibold text-[#1A2842] transition group-hover:text-[#D85F46]">
          View game →
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
      className="group block border-t-2 border-[#1A2842] bg-[#FCF9F3] transition hover:-translate-y-0.5 hover:border-[#D85F46] hover:shadow-[0_12px_30px_rgba(26,40,66,0.08)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#D85F46]"
    >
      <div className="flex items-center justify-between gap-3 border-b border-[#1A2842]/10 px-5 py-4">
        <p className="font-mono text-xs text-[#687384]">
          {formatGameTime(game.game_date)}
        </p>
        <span className="bg-[#1A2842] px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.1em] text-white">
          Final
        </span>
      </div>

      <div className="space-y-4 px-5 py-5">
        <div className="flex items-center justify-between gap-4">
          <div className="min-w-0">
            <p className="truncate text-sm font-medium text-[#1A2842]">
              {away?.name ?? "Away team"}
            </p>
            <p className="mt-0.5 text-[10px] uppercase tracking-[0.12em] text-[#8B887F]">
              {away?.abbreviation ?? ""}
            </p>
          </div>
          <p className="font-mono text-2xl font-bold text-[#1A2842]">
            {game.away_score ?? "—"}
          </p>
        </div>

        <div className="ml-1 border-t border-dashed border-[#1A2842]/15" />

        <div className="flex items-center justify-between gap-4">
          <div className="min-w-0">
            <p className="truncate text-sm font-medium text-[#1A2842]">
              {home?.name ?? "Home team"}
            </p>
            <p className="mt-0.5 text-[10px] uppercase tracking-[0.12em] text-[#8B887F]">
              {home?.abbreviation ?? ""}
            </p>
          </div>
          <p className="font-mono text-2xl font-bold text-[#1A2842]">
            {game.home_score ?? "—"}
          </p>
        </div>
      </div>

      <div className="flex items-center justify-between border-t border-[#1A2842]/10 px-5 py-3">
        <span className="text-xs text-[#687384]">Box score</span>
        <span className="text-xs font-semibold text-[#1A2842] transition group-hover:text-[#D85F46]">
          View game →
        </span>
      </div>
    </Link>
  );
}

function EmptyState({
  title,
  description,
}: {
  title: string;
  description: string;
}) {
  return (
    <div className="border-t-2 border-[#1A2842] bg-[#FCF9F3] px-6 py-12">
      <h3 className="text-lg font-bold text-[#1A2842]">{title}</h3>
      <p className="mt-2 text-sm leading-6 text-[#687384]">{description}</p>
    </div>
  );
}

export default async function GamesPage() {
  const today = new Date();

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

  const historicalGames: Game[] = historicalResult.data ?? [];

  if (historicalResult.error) {
    console.error("Unable to load historical games:", historicalResult.error);
  }

  const teamIds = [
    ...new Set(
      historicalGames.flatMap((game) => [
        game.home_team_id,
        game.away_team_id,
      ])
    ),
  ];

  const { data: teams, error: teamsError } = teamIds.length
    ? await supabase
        .from("Teams")
        .select("id, name, abbreviation")
        .in("id", teamIds)
    : { data: [], error: null };

  if (teamsError) {
    console.error("Unable to load teams for recent games:", teamsError);
  }

  const teamMap = new Map(
    (teams ?? []).map((team) => [team.id, team as Team])
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

  const otherGames = todaysGames.filter(
    (game) =>
      !["Live", "Preview", "Final"].includes(game.status.abstractGameState)
  );

  return (
    <main className="min-h-screen bg-[#F8F3EA] text-[#1A2842]">
      <section className="border-b border-[#1A2842]/15">
        <div className="container-page py-11 md:py-14">
          <div className="flex items-center gap-3">
            <span className="h-[2px] w-8 bg-[#D85F46]" />
            <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-[#687384]">
              The schedule
            </p>
          </div>

          <div className="mt-4 flex flex-col justify-between gap-6 sm:flex-row sm:items-end">
            <div>
              <h1 className="text-5xl font-black tracking-[-0.055em] md:text-7xl">
                Games
              </h1>
              <p className="mt-4 max-w-xl text-sm leading-6 text-[#687384]">
                Today’s matchups and recent results from around Major League
                Baseball.
              </p>
            </div>

            <p className="text-sm text-[#687384]">{formatDate(today)}</p>
          </div>
        </div>
      </section>

      <div className="container-page py-10 md:py-14">
        <section aria-labelledby="today-heading">
          <div className="mb-6 flex items-end justify-between gap-4 border-b border-[#1A2842]/15 pb-4">
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-[#D85F46]">
                {liveGames.length > 0 ? "In progress" : "The daily slate"}
              </p>
              <h2 id="today-heading" className="mt-1 text-2xl font-bold">
                Today&apos;s games
              </h2>
            </div>

            {liveGames.length > 0 && (
              <p className="flex items-center gap-2 text-xs font-semibold text-[#D85F46]">
                <span className="h-2 w-2 animate-pulse rounded-full bg-[#D85F46]" />
                {liveGames.length} live
              </p>
            )}
          </div>

          {todaysGames.length === 0 ? (
            <EmptyState
              title="No games on today"
              description="There isn’t a game on the MLB schedule today. Check back for the next slate."
            />
          ) : (
            <div className="space-y-9">
              {liveGames.length > 0 && (
                <div>
                  <h3 className="mb-3 text-xs font-semibold uppercase tracking-[0.14em] text-[#D85F46]">
                    Live now
                  </h3>
                  <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                    {liveGames.map((game) => (
                      <TodayGameCard key={game.gamePk} game={game} />
                    ))}
                  </div>
                </div>
              )}

              {scheduledGames.length > 0 && (
                <div>
                  <h3 className="mb-3 text-xs font-semibold uppercase tracking-[0.14em] text-[#687384]">
                    Coming up
                  </h3>
                  <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                    {scheduledGames.map((game) => (
                      <TodayGameCard key={game.gamePk} game={game} />
                    ))}
                  </div>
                </div>
              )}

              {finalGames.length > 0 && (
                <div>
                  <h3 className="mb-3 text-xs font-semibold uppercase tracking-[0.14em] text-[#687384]">
                    Final
                  </h3>
                  <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                    {finalGames.map((game) => (
                      <TodayGameCard key={game.gamePk} game={game} />
                    ))}
                  </div>
                </div>
              )}

              {otherGames.length > 0 && (
                <div>
                  <h3 className="mb-3 text-xs font-semibold uppercase tracking-[0.14em] text-[#687384]">
                    Other games
                  </h3>
                  <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                    {otherGames.map((game) => (
                      <TodayGameCard key={game.gamePk} game={game} />
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </section>

        <section
          aria-labelledby="recent-results-heading"
          className="mt-16 border-t border-[#1A2842]/15 pt-10"
        >
          <div className="mb-6 border-b border-[#1A2842]/15 pb-4">
            <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-[#D85F46]">
              From the database
            </p>
            <h2
              id="recent-results-heading"
              className="mt-1 text-2xl font-bold"
            >
              Recent results
            </h2>
            <p className="mt-1 text-sm text-[#687384]">
              Recently recorded games and box scores.
            </p>
          </div>

          {historicalResult.error ? (
            <EmptyState
              title="Recent results are unavailable"
              description="We couldn’t load the saved game results. Please try again later."
            />
          ) : historicalGames.length === 0 ? (
            <EmptyState
              title="No recent results yet"
              description="Saved game results will appear here when they’re available."
            />
          ) : (
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
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

        <div className="mt-10 border-t border-[#1A2842]/15 pt-5">
          <p className="text-xs leading-5 text-[#8B887F]">
            Today&apos;s schedule is provided by MLB. Recent results are from
            the Offshore Break database.
          </p>
        </div>
      </div>
    </main>
  );
}