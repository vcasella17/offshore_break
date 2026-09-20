import Link from "next/link";
import { supabase } from "@/lib/supabaseClient";

function TeamLogo({ abbreviation }: { abbreviation: string }) {
  return (
    <img
      src={`https://a.espncdn.com/i/teamlogos/mlb/500/${abbreviation}.png`}
      alt=""
      className="h-28 w-28 object-contain"
    />
  );
}

export default async function TeamPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const { data: team, error: teamError } = await supabase
    .from("Teams")
    .select("id, name, abbreviation, league")
    .eq("id", id)
    .single();

  if (teamError || !team) {
    return (
      <main className="min-h-screen bg-[#F8F3EA] px-6 py-20 text-[#1A2842]">
        <div className="mx-auto max-w-7xl">
          <h1 className="text-4xl font-black">Team not found</h1>
          <Link
            href="/teams"
            className="mt-6 inline-block text-sm font-bold text-[#D85F46]"
          >
            ← Back to teams
          </Link>
        </div>
      </main>
    );
  }

  const { data: roster } = await supabase
    .from("Player")
    .select("id, name, position")
    .eq("team_id", id)
    .order("name");

  return (
    <main className="min-h-screen bg-[#F8F3EA] text-[#1A2842]">
      <section className="border-b border-[#1A2842]/20">
        <div className="mx-auto max-w-7xl px-6 py-12">
          <Link
            href="/teams"
            className="text-sm font-bold text-[#687384] transition hover:text-[#D85F46]"
          >
            ← Back to teams
          </Link>

          <div className="mt-10 flex flex-col gap-8 md:flex-row md:items-center">
            <div className="flex h-40 w-40 items-center justify-center border border-[#1A2842]/20 bg-[#EDE6DA]">
              <TeamLogo abbreviation={team.abbreviation} />
            </div>

            <div>
              <p className="text-xs font-bold uppercase tracking-[0.22em] text-[#D85F46]">
                Team Profile
              </p>

              <h1 className="mt-2 text-5xl font-black tracking-[-0.05em]">
                {team.name}
              </h1>

              <div className="mt-4 flex flex-wrap items-center gap-4 text-sm">
                <span className="font-bold">{team.abbreviation}</span>
                <span className="text-[#687384]">•</span>
                <span className="text-[#687384]">
                  {roster?.length ?? 0} Active Players
                </span>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-6 py-12">
        <div className="flex items-end justify-between border-b border-[#1A2842] pb-4">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.2em] text-[#59B3AD]">
              2026 Season
            </p>
            <h2 className="mt-2 text-2xl font-black">Roster</h2>
          </div>
        </div>

        {(!roster || roster.length === 0) && (
          <p className="py-8 text-sm text-[#687384]">
            No roster data available.
          </p>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
          {roster?.map((player) => (
            <Link
              href={`/players/${player.id}`}
              key={player.id}
              className="group border-b border-r border-[#1A2842]/20 px-4 py-5 transition hover:bg-[#59B3AD]/10"
            >
              <p className="font-bold group-hover:text-[#D85F46]">
                {player.name}
              </p>
              <p className="mt-1 text-xs font-bold uppercase tracking-[0.12em] text-[#687384]">
                {player.position}
              </p>
            </Link>
          ))}
        </div>
      </section>
    </main>
  );
}
