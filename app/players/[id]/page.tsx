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

function Headshot({ playerId }: { playerId: number }) {
  return (
    <img
      src={`https://img.mlbstatic.com/mlb-photos/image/upload/w_300,q_auto:good/v1/people/${playerId}/headshot/67/current`}
      alt=""
      className="h-36 w-36 object-contain"
    />
  );
}

export default async function PlayerPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const playerId = Number(id);

  const [{ data: player }, { data: stats }, { data: teams }] =
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
          <h1 className="text-4xl font-black">Player not found</h1>
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

  const teamMap = new Map<string, Team>(
    (teams ?? []).map((team) => [team.id, team])
  );

  const team = player.team_id
    ? teamMap.get(player.team_id)
    : undefined;

  const currentStats = (stats?.[0] ?? null) as PlayerStat | null;

  const hasPitching =
    currentStats &&
    (currentStats.innings_pitched !== null ||
      currentStats.wins !== null ||
      currentStats.era !== null);

  return (
    <main className="min-h-screen bg-[#F8F3EA] text-[#1A2842]">
      {/* Player Header */}
      <section className="border-b border-[#1A2842]/20">
        <div className="mx-auto max-w-7xl px-6 py-12">
          <Link
            href="/players"
            className="text-sm font-bold text-[#687384] transition hover:text-[#D85F46]"
          >
            ← Back to players
          </Link>

          <div className="mt-10 flex flex-col gap-8 md:flex-row md:items-center">
            <div className="flex h-40 w-40 items-center justify-center border border-[#1A2842]/20 bg-[#EDE6DA]">
              <Headshot playerId={player.id} />
            </div>

            <div>
              <p className="text-xs font-bold uppercase tracking-[0.22em] text-[#D85F46]">
                Player Profile
              </p>

              <h1 className="mt-2 text-5xl font-black tracking-[-0.05em]">
                {player.name}
              </h1>

              <div className="mt-4 flex flex-wrap items-center gap-4 text-sm">
                <span className="font-bold">
                  {team?.abbreviation ?? "FA"}
                </span>

                <span className="text-[#687384]">
                  {team?.name ?? "Free Agent"}
                </span>

                <span className="text-[#687384]">•</span>

                <span className="text-[#687384]">
                  {player.position ?? "N/A"}
                </span>

                <span className="text-[#687384]">•</span>

                <span className="text-[#687384]">
                  MLB ID {player.id}
                </span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Snapshot */}
      <section className="mx-auto max-w-7xl px-6 py-10">
        <div className="flex items-end justify-between border-b border-[#1A2842] pb-4">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.2em] text-[#59B3AD]">
              2026 Season
            </p>

            <h2 className="mt-2 text-2xl font-black">
              Snapshot
            </h2>
          </div>

          <span className="text-xs font-bold uppercase tracking-[0.15em] text-[#687384]">
            Current Season
          </span>
        </div>

        <div className="grid grid-cols-2 border-l border-[#1A2842]/20 md:grid-cols-4 lg:grid-cols-8">
          {[
            ["AVG", formatAverage(currentStats?.batting_avg ?? null)],
            ["OBP", formatAverage(currentStats?.obp ?? null)],
            ["SLG", formatAverage(currentStats?.slg ?? null)],
            ["OPS", formatDecimal(currentStats?.ops ?? null)],
            ["HR", formatNumber(currentStats?.home_runs ?? null)],
            ["RBI", formatNumber(currentStats?.rbi ?? null)],
            ["H", formatNumber(currentStats?.hits ?? null)],
            ["BB", formatNumber(currentStats?.walks ?? null)],
          ].map(([label, value]) => (
            <div
              key={label}
              className="border-b border-r border-[#1A2842]/20 px-5 py-6"
            >
              <p className="text-2xl font-black">{value}</p>
              <p className="mt-1 text-xs font-bold uppercase tracking-[0.15em] text-[#687384]">
                {label}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* Batting */}
      <section className="mx-auto max-w-7xl px-6 pb-12">
        <div className="border-t border-[#1A2842]">
          <div className="flex items-end justify-between border-b border-[#1A2842]/20 py-5">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.2em] text-[#D85F46]">
                Performance
              </p>

              <h2 className="mt-1 text-2xl font-black">
                Batting
              </h2>
            </div>

            <span className="text-xs font-bold uppercase tracking-[0.15em] text-[#687384]">
              2026
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full min-w-[800px] text-sm">
              <thead>
                <tr className="border-b border-[#1A2842]/20 text-left text-xs font-bold uppercase tracking-[0.15em] text-[#687384]">
                  <th className="px-3 py-4">G</th>
                  <th className="px-3 py-4">AB</th>
                  <th className="px-3 py-4">H</th>
                  <th className="px-3 py-4">HR</th>
                  <th className="px-3 py-4">RBI</th>
                  <th className="px-3 py-4">BB</th>
                  <th className="px-3 py-4">K</th>
                  <th className="px-3 py-4">AVG</th>
                  <th className="px-3 py-4">OBP</th>
                  <th className="px-3 py-4">SLG</th>
                  <th className="px-3 py-4">OPS</th>
                </tr>
              </thead>

              <tbody>
                <tr className="border-b border-[#1A2842]/20">
                  <td className="px-3 py-5 font-bold">
                    {formatNumber(currentStats?.games ?? null)}
                  </td>
                  <td className="px-3 py-5">
                    {formatNumber(currentStats?.at_bats ?? null)}
                  </td>
                  <td className="px-3 py-5">
                    {formatNumber(currentStats?.hits ?? null)}
                  </td>
                  <td className="px-3 py-5">
                    {formatNumber(currentStats?.home_runs ?? null)}
                  </td>
                  <td className="px-3 py-5">
                    {formatNumber(currentStats?.rbi ?? null)}
                  </td>
                  <td className="px-3 py-5">
                    {formatNumber(currentStats?.walks ?? null)}
                  </td>
                  <td className="px-3 py-5">
                    {formatNumber(currentStats?.strikeouts ?? null)}
                  </td>
                  <td className="px-3 py-5 font-bold">
                    {formatAverage(currentStats?.batting_avg ?? null)}
                  </td>
                  <td className="px-3 py-5">
                    {formatAverage(currentStats?.obp ?? null)}
                  </td>
                  <td className="px-3 py-5">
                    {formatAverage(currentStats?.slg ?? null)}
                  </td>
                  <td className="px-3 py-5 font-bold text-[#D85F46]">
                    {formatDecimal(currentStats?.ops ?? null)}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </section>

      {/* Pitching */}
      {hasPitching && (
        <section className="mx-auto max-w-7xl px-6 pb-16">
          <div className="border-t border-[#1A2842]">
            <div className="flex items-end justify-between border-b border-[#1A2842]/20 py-5">
              <div>
                <p className="text-xs font-bold uppercase tracking-[0.2em] text-[#59B3AD]">
                  Performance
                </p>

                <h2 className="mt-1 text-2xl font-black">
                  Pitching
                </h2>
              </div>

              <span className="text-xs font-bold uppercase tracking-[0.15em] text-[#687384]">
                2026
              </span>
            </div>

            <div className="grid grid-cols-2 border-l border-[#1A2842]/20 md:grid-cols-4 lg:grid-cols-8">
              {[
                ["IP", formatInnings(currentStats?.innings_pitched ?? null)],
                ["W", formatNumber(currentStats?.wins ?? null)],
                ["L", formatNumber(currentStats?.losses ?? null)],
                ["ERA", formatDecimal(currentStats?.era ?? null)],
                ["WHIP", formatDecimal(currentStats?.whip ?? null)],
                ["H", formatNumber(currentStats?.hits_allowed ?? null)],
                ["BB", formatNumber(currentStats?.walks_allowed ?? null)],
                ["K", formatNumber(currentStats?.strikeouts_pitched ?? null)],
              ].map(([label, value]) => (
                <div
                  key={label}
                  className="border-b border-r border-[#1A2842]/20 px-5 py-6"
                >
                  <p className="text-2xl font-black">{value}</p>
                  <p className="mt-1 text-xs font-bold uppercase tracking-[0.15em] text-[#687384]">
                    {label}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </section>
      )}
    </main>
  );
}