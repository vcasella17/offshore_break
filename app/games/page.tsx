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

function TeamLogo({ teamId }: { teamId: string }) {
  return (
    <img
      src={`https://www.mlbstatic.com/team-logos/${teamId}.svg`}
      alt=""
      className="h-10 w-10 object-contain"
    />
  );
}

export default async function GamesPage() {
  const [{ data: games }, { data: teams }] = await Promise.all([
  supabase
    .from("Games")
    .select(
      "id, game_date, home_team_id, away_team_id, home_score, away_score"
    )
    .order("game_date", { ascending: false })
    .limit(5),

  supabase
    .from("Teams")
    .select("id, name, abbreviation"),
]);

console.log("GAMES FROM SUPABASE", games);
console.log("TEAMS FROM SUPABASE", teams);

  const teamMap = new Map<string, Team>(
    (teams ?? []).map((team) => [team.id, team])
  );

  return (
    <main className="min-h-screen bg-[#F8F3EA] text-[#1A2842]">
      
      {/* Page Header */}

      <section className="border-b border-[#1A2842]/20">
        <div className="mx-auto max-w-7xl px-6 py-14">
          <p className="text-xs font-bold uppercase tracking-[0.25em] text-[#D85F46]">
            Around the League
          </p>

          <div className="mt-3 flex items-end justify-between gap-6">
            <div>
              <h1 className="text-5xl font-black tracking-[-0.05em]">
                Games
              </h1>

              <p className="mt-3 max-w-xl text-[#687384]">
                Scores, matchups, and results from around Major League Baseball.
              </p>
            </div>

            <div className="hidden text-right md:block">
              <p className="text-3xl font-black">
                {games?.length ?? 0}
              </p>

              <p className="text-xs font-bold uppercase tracking-[0.16em] text-[#687384]">
                Recent Games
              </p>
            </div>
          </div>
        </div>
      </section>


      {/* Dashboard */}

      <section className="mx-auto max-w-7xl px-6 py-10">

        {/* Controls */}

        <div className="mb-8 flex flex-wrap items-center justify-between gap-4 border-b border-[#1A2842]/20 pb-5">
          <div className="flex gap-2">
            <button className="border border-[#1A2842] bg-[#1A2842] px-4 py-2 text-xs font-bold uppercase tracking-[0.12em] text-[#F8F3EA]">
              Recent
            </button>

            <button className="border border-[#1A2842]/20 px-4 py-2 text-xs font-bold uppercase tracking-[0.12em] text-[#1A2842] hover:border-[#1A2842]">
              All Games
            </button>
          </div>

          <div className="text-xs font-bold uppercase tracking-[0.12em] text-[#687384]">
            2026 Season
          </div>
        </div>


        {/* Games */}

        <div className="border-t border-[#1A2842]">

          {(games ?? []).map((game) => {
            const homeTeam = teamMap.get(game.home_team_id);
            const awayTeam = teamMap.get(game.away_team_id);

            const homeWon =
              game.home_score !== null &&
              game.away_score !== null &&
              game.home_score > game.away_score;

            const awayWon =
              game.home_score !== null &&
              game.away_score !== null &&
              game.away_score > game.home_score;

            return (
              <Link
                href={`/games/${game.id}`}
                key={game.id}
                className="group grid grid-cols-[120px_1fr_auto] items-center border-b border-[#1A2842]/20 py-5 transition hover:bg-[#59B3AD]/10 md:grid-cols-[160px_1fr_180px]"
              >

                {/* Date */}

                <div>
                  <p className="text-xs font-bold uppercase tracking-[0.12em] text-[#687384]">
                    {new Date(`${game.game_date}T12:00:00`).toLocaleDateString(
                      "en-US",
                      {
                        month: "short",
                        day: "numeric",
                        year: "numeric",
                      }
                    )}
                  </p>

                  <p className="mt-1 text-[10px] uppercase tracking-[0.12em] text-[#59B3AD]">
                    Final
                  </p>
                </div>


                {/* Teams */}

                <div className="flex items-center justify-center gap-8 md:justify-start">

                  {/* Away */}

                  <div className="flex min-w-[150px] items-center justify-end gap-4">
                    <div className="text-right">
                      <p
                        className={`font-bold ${
                          awayWon ? "text-[#D85F46]" : ""
                        }`}
                      >
                        {awayTeam?.abbreviation ?? game.away_team_id}
                      </p>

                      <p className="text-xs text-[#687384]">
                        {awayTeam?.name ?? ""}
                      </p>
                    </div>

                    <TeamLogo teamId={game.away_team_id} />

                    <span
                      className={`w-8 text-center text-xl font-black ${
                        awayWon ? "text-[#1A2842]" : "text-[#687384]"
                      }`}
                    >
                      {game.away_score ?? "-"}
                    </span>
                  </div>


                  {/* Separator */}

                  <span className="text-xs font-bold text-[#687384]">
                    @
                  </span>


                  {/* Home */}

                  <div className="flex min-w-[150px] items-center gap-4">
                    <span
                      className={`w-8 text-center text-xl font-black ${
                        homeWon ? "text-[#1A2842]" : "text-[#687384]"
                      }`}
                    >
                      {game.home_score ?? "-"}
                    </span>

                    <TeamLogo teamId={game.home_team_id} />

                    <div>
                      <p
                        className={`font-bold ${
                          homeWon ? "text-[#D85F46]" : ""
                        }`}
                      >
                        {homeTeam?.abbreviation ?? game.home_team_id}
                      </p>

                      <p className="text-xs text-[#687384]">
                        {homeTeam?.name ?? ""}
                      </p>
                    </div>
                  </div>

                </div>


                {/* Arrow */}

                <div className="hidden text-right text-lg text-[#1A2842]/30 transition group-hover:text-[#D85F46] md:block">
                  →
                </div>

              </Link>
            );
          })}

        </div>

      </section>


      {/* Footer */}

      <section className="border-t border-[#1A2842] bg-[#1A2842] px-6 py-12 text-[#F8F3EA]">
        <div className="mx-auto max-w-7xl">
          <p className="text-xs font-bold uppercase tracking-[0.2em] text-[#59B3AD]">
            Offshore Break
          </p>

          <p className="mt-3 text-2xl font-black tracking-[-0.03em]">
            The numbers are only the beginning.
          </p>
        </div>
      </section>

    </main>
  );
}