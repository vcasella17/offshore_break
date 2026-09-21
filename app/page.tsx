import Link from "next/link";
import { supabase } from "@/lib/supabaseClient";

function TeamLogo({ teamId }: { teamId: string | number }) {
  return (
    <img
      src={`https://www.mlbstatic.com/team-logos/${teamId}.svg`}
      alt=""
      className="h-12 w-12 object-contain"
    />
  );
}

function TickerSidebar({ items }: { items: string[] }) {
  // Duplicate the list once so the loop is seamless.
  const doubled = [...items, ...items];

  return (
    <aside className="hidden shrink-0 lg:block lg:w-[240px]">
      <style>{`
        @keyframes offshore-ticker {
          from { transform: translateY(0); }
          to { transform: translateY(-50%); }
        }
        .offshore-ticker-track {
          animation: offshore-ticker 45s linear infinite;
        }
        .offshore-ticker-track:hover {
          animation-play-state: paused;
        }
      `}</style>

      <div className="sticky top-[76px] h-[calc(100vh-76px)] overflow-hidden border-l border-[#1A2842]/20 bg-[#1A2842]">
        <p className="border-b border-white/10 px-5 py-4 text-[10px] font-black uppercase tracking-[0.2em] text-[#59B3AD]">
          Wire
        </p>

        <div className="offshore-ticker-track">
          {doubled.map((item, i) => (
            <div
              key={i}
              className="border-b border-white/10 px-5 py-5 text-xs font-semibold leading-5 text-white/80"
            >
              {item}
            </div>
          ))}
        </div>
      </div>
    </aside>
  );
}

export default async function Home() {
  const [
    { data: players },
    { data: stats },
    { data: games },
    { data: teams },
    { data: allGames },
  ] = await Promise.all([
    supabase.from("Player").select("id, name, position").limit(2000),

    supabase
      .from("PlayerStats")
      .select(
        "player_id, season, games, hits, home_runs, rbi, batting_avg, obp, slg, ops, at_bats"
      )
      .eq("season", 2026)
      .not("ops", "is", null)
      .gte("at_bats", 200)
      .order("ops", { ascending: false })
      .limit(5),

    supabase
      .from("Games")
      .select(
        "id, game_date, home_team_id, away_team_id, home_score, away_score"
      )
      .order("game_date", { ascending: false })
      .limit(8),

    supabase.from("Teams").select("id, name, abbreviation"),

    // Lightweight pull of every game's result, just to compute win totals.
    supabase
      .from("Games")
      .select("home_team_id, away_team_id, home_score, away_score")
      .limit(5000),
  ]);

  const playerMap = new Map((players ?? []).map((p) => [p.id, p]));
  const teamMap = new Map((teams ?? []).map((t) => [t.id, t]));
  const topPerformers = stats ?? [];

  // Win totals per team, computed from raw game results.
  const winCounts = new Map<string, number>();
  for (const g of allGames ?? []) {
    if (g.home_score === null || g.away_score === null) continue;
    if (g.home_score > g.away_score) {
      winCounts.set(g.home_team_id, (winCounts.get(g.home_team_id) ?? 0) + 1);
    } else if (g.away_score > g.home_score) {
      winCounts.set(g.away_team_id, (winCounts.get(g.away_team_id) ?? 0) + 1);
    }
  }

  let leadingTeamId: string | null = null;
  let leadingWins = -1;
  for (const [teamId, wins] of winCounts.entries()) {
    if (wins > leadingWins) {
      leadingWins = wins;
      leadingTeamId = teamId;
    }
  }
  const leadingTeam = leadingTeamId ? teamMap.get(leadingTeamId) : undefined;

  const opsLeaderStat = topPerformers[0];
  const opsLeaderPlayer = opsLeaderStat
    ? playerMap.get(opsLeaderStat.player_id)
    : undefined;

  // Build the ticker feed: alternate recent scores with stat callouts.
  const tickerItems: string[] = [];
  const gameList = games ?? [];
  const maxLen = Math.max(gameList.length, topPerformers.length);

  for (let i = 0; i < maxLen; i++) {
    const g = gameList[i];
    if (g) {
      const home = teamMap.get(g.home_team_id)?.abbreviation ?? g.home_team_id;
      const away = teamMap.get(g.away_team_id)?.abbreviation ?? g.away_team_id;
      tickerItems.push(`FINAL — ${away} ${g.away_score} @ ${home} ${g.home_score}`);
    }

    const s = topPerformers[i];
    if (s) {
      const p = playerMap.get(s.player_id);
      if (p) {
        tickerItems.push(
          `${p.name} — ${Number(s.ops).toFixed(3)} OPS this season`
        );
      }
    }
  }

  if (tickerItems.length === 0) {
    tickerItems.push("Offshore Break — baseball stats, told as stories.");
  }

  return (
    <div className="flex">
      <main className="min-w-0 flex-1 bg-[#F8F3EA] text-[#1A2842]">
        {/* Hero */}

        <section className="border-b border-[#1A2842]/20">
          <div className="mx-auto grid max-w-7xl grid-cols-1 items-center gap-12 px-6 py-24 md:grid-cols-2">
            <div>
              <p className="mb-5 text-xs font-bold uppercase tracking-[0.28em] text-[#D85F46]">
                Baseball Analytics
              </p>

              <h1 className="max-w-2xl text-6xl font-black leading-[0.95] tracking-[-0.055em] md:text-8xl">
                THE GAME
                <br />
                BEYOND THE
                <br />
                <span className="text-[#D85F46]">BOX SCORE</span>
              </h1>

              <p className="mt-8 max-w-lg text-lg leading-8 text-[#687384]">
                Baseball statistics, player performance, and the numbers
                underneath the game.
              </p>

              <div className="mt-9 flex gap-4">
                <Link
                  href="/players"
                  className="border border-[#1A2842] bg-[#1A2842] px-6 py-3 text-sm font-bold uppercase tracking-[0.12em] text-[#F8F3EA] transition hover:bg-[#D85F46] hover:border-[#D85F46]"
                >
                  Explore Players
                </Link>

                <Link
                  href="/games"
                  className="border border-[#1A2842]/30 px-6 py-3 text-sm font-bold uppercase tracking-[0.12em] transition hover:border-[#1A2842] hover:bg-[#1A2842] hover:text-[#F8F3EA]"
                >
                  Recent Games
                </Link>
              </div>
            </div>

            <div className="relative flex min-h-[360px] items-center justify-center overflow-hidden">
              <div className="absolute h-72 w-72 rotate-12 border border-[#59B3AD]/50" />
              <div className="absolute h-56 w-56 -rotate-12 border border-[#D85F46]/50" />

              <div className="relative h-56 w-56 rounded-full border-[3px] border-[#1A2842]">
                <div className="absolute left-1/2 top-1/2 h-px w-48 -translate-x-1/2 rotate-45 bg-[#D85F46]" />
                <div className="absolute left-1/2 top-1/2 h-px w-48 -translate-x-1/2 -rotate-45 bg-[#D85F46]" />
                <div className="absolute left-1/2 top-1/2 h-5 w-5 -translate-x-1/2 -translate-y-1/2 rounded-full bg-[#59B3AD]" />
              </div>
            </div>
          </div>
        </section>

        {/* Quick Numbers */}

        <section className="border-b border-[#1A2842]/20">
          <div className="mx-auto grid max-w-7xl grid-cols-2 md:grid-cols-4">
            <div className="border-r border-[#1A2842]/20 px-6 py-10">
              <p className="text-4xl font-black tracking-[-0.04em]">
                {players?.length ?? 0}
              </p>
              <p className="mt-2 text-xs font-bold uppercase tracking-[0.18em] text-[#687384]">
                Players
              </p>
            </div>

            <div className="border-r border-[#1A2842]/20 px-6 py-10">
              <p className="text-4xl font-black tracking-[-0.04em]">
                {teams?.length ?? 0}
              </p>
              <p className="mt-2 text-xs font-bold uppercase tracking-[0.18em] text-[#687384]">
                Teams
              </p>
            </div>

            <div className="border-r border-[#1A2842]/20 px-6 py-10">
              <p className="text-4xl font-black tracking-[-0.04em]">
                {games?.length ?? 0}
              </p>
              <p className="mt-2 text-xs font-bold uppercase tracking-[0.18em] text-[#687384]">
                Recent Games
              </p>
            </div>

            <div className="px-6 py-10">
              <p className="text-4xl font-black tracking-[-0.04em] text-[#D85F46]">
                2026
              </p>
              <p className="mt-2 text-xs font-bold uppercase tracking-[0.18em] text-[#687384]">
                Season
              </p>
            </div>
          </div>
        </section>

        {/* Storylines — auto-generated from real data */}

        {(opsLeaderPlayer || leadingTeam) && (
          <section className="mx-auto max-w-7xl px-6 py-16">
            <div className="mb-8 border-b border-[#1A2842] pb-4">
              <p className="text-xs font-bold uppercase tracking-[0.2em] text-[#D85F46]">
                Right Now
              </p>
              <h2 className="mt-2 text-3xl font-black tracking-[-0.04em]">
                Storylines
              </h2>
            </div>

            <div className="grid grid-cols-1 gap-px border border-[#1A2842]/20 bg-[#1A2842]/20 md:grid-cols-2">
              {opsLeaderPlayer && opsLeaderStat && (
                <Link
                  href={`/players/${opsLeaderPlayer.id}`}
                  className="group bg-[#F8F3EA] p-8 transition hover:bg-[#59B3AD]/10"
                >
                  <p className="text-xs font-bold uppercase tracking-[0.15em] text-[#59B3AD]">
                    League Leader
                  </p>
                  <h3 className="mt-3 text-2xl font-black group-hover:text-[#D85F46]">
                    {opsLeaderPlayer.name}
                  </h3>
                  <p className="mt-3 text-sm leading-6 text-[#687384]">
                    {opsLeaderPlayer.name} leads all qualified hitters with a{" "}
                    {Number(opsLeaderStat.ops).toFixed(3)} OPS this season,
                    hitting {Number(opsLeaderStat.batting_avg).toFixed(3)} with{" "}
                    {opsLeaderStat.home_runs} home runs and{" "}
                    {opsLeaderStat.rbi} RBI.
                  </p>
                </Link>
              )}

              {leadingTeam && (
                <Link
                  href={`/teams/${leadingTeam.id}`}
                  className="group flex flex-col justify-between bg-[#F8F3EA] p-8 transition hover:bg-[#59B3AD]/10"
                >
                  <div>
                    <p className="text-xs font-bold uppercase tracking-[0.15em] text-[#D85F46]">
                      Team Watch
                    </p>
                    <h3 className="mt-3 text-2xl font-black group-hover:text-[#D85F46]">
                      {leadingTeam.name}
                    </h3>
                    <p className="mt-3 text-sm leading-6 text-[#687384]">
                      The {leadingTeam.name} lead the league with{" "}
                      {leadingWins} wins so far this season.
                    </p>
                  </div>

                  <div className="mt-6">
                    <TeamLogo teamId={leadingTeam.id} />
                  </div>
                </Link>
              )}
            </div>
          </section>
        )}

        {/* Content */}

        <section className="mx-auto grid max-w-7xl gap-16 px-6 py-20 md:grid-cols-[1.25fr_0.75fr]">
          {/* Top Performers */}

          <div>
            <div className="mb-8 flex items-end justify-between border-b border-[#1A2842] pb-4">
              <div>
                <p className="text-xs font-bold uppercase tracking-[0.2em] text-[#59B3AD]">
                  2026 Season
                </p>
                <h2 className="mt-2 text-3xl font-black tracking-[-0.04em]">
                  Top Performers
                </h2>
              </div>

              <Link
                href="/players"
                className="text-xs font-bold uppercase tracking-[0.15em] text-[#D85F46]"
              >
                View All
              </Link>
            </div>

            <div>
              {topPerformers.length === 0 && (
                <p className="py-8 text-sm text-[#687384]">
                  No qualifying performers found yet.
                </p>
              )}

              {topPerformers.map((stat, index) => {
                const player = playerMap.get(stat.player_id);
                if (!player) return null;

                return (
                  <Link
                    href={`/players/${player.id}`}
                    key={`${stat.player_id}-${stat.season}`}
                    className="group grid grid-cols-[48px_1fr_auto] items-center border-b border-[#1A2842]/20 py-5 transition hover:bg-[#59B3AD]/10"
                  >
                    <span className="text-sm font-bold text-[#687384]">
                      0{index + 1}
                    </span>

                    <div>
                      <h3 className="font-bold group-hover:text-[#D85F46]">
                        {player.name}
                      </h3>
                      <p className="mt-1 text-xs uppercase tracking-[0.12em] text-[#687384]">
                        {player.position}
                      </p>
                    </div>

                    <div className="text-right">
                      <p className="text-2xl font-black">
                        {Number(stat.ops).toFixed(3)}
                      </p>
                      <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-[#687384]">
                        OPS
                      </p>
                    </div>
                  </Link>
                );
              })}
            </div>
          </div>

          {/* Recent Games */}

          <div>
            <div className="mb-8 border-b border-[#1A2842] pb-4">
              <p className="text-xs font-bold uppercase tracking-[0.2em] text-[#D85F46]">
                Around the League
              </p>
              <h2 className="mt-2 text-3xl font-black tracking-[-0.04em]">
                Recent Games
              </h2>
            </div>

            <div>
              {(games ?? []).map((game) => {
                const homeTeam = teamMap.get(game.home_team_id);
                const awayTeam = teamMap.get(game.away_team_id);

                return (
                  <Link
                    href={`/games/${game.id}`}
                    key={game.id}
                    className="group block border-b border-[#1A2842]/20 py-4 transition hover:bg-[#59B3AD]/10"
                  >
                    <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-[#687384]">
                      {game.game_date}
                    </p>

                    <div className="mt-2 flex items-center justify-between">
                      <span className="font-bold">
                        {awayTeam?.abbreviation ?? game.away_team_id}
                      </span>
                      <span className="px-3 text-sm text-[#687384]">
                        {game.away_score} @ {game.home_score}
                      </span>
                      <span className="font-bold">
                        {homeTeam?.abbreviation ?? game.home_team_id}
                      </span>
                    </div>
                  </Link>
                );
              })}
            </div>

            <Link
              href="/games"
              className="mt-6 inline-block text-xs font-bold uppercase tracking-[0.15em] text-[#D85F46]"
            >
              See All Games →
            </Link>
          </div>
        </section>

        {/* Footer statement */}

        <section className="border-t border-[#1A2842] bg-[#1A2842] px-6 py-20 text-[#F8F3EA]">
          <div className="mx-auto max-w-7xl">
            <p className="max-w-3xl text-4xl font-black leading-tight tracking-[-0.04em] md:text-6xl">
              THE NUMBERS ARE ONLY
              <br />
              THE BEGINNING.
            </p>
            <div className="mt-8 h-1 w-20 bg-[#D85F46]" />
          </div>
        </section>
      </main>

      <TickerSidebar items={tickerItems} />
    </div>
  );
}
