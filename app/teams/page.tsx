import Link from "next/link";
import { supabase } from "@/lib/supabaseClient";

function TeamLogo({ abbreviation }: { abbreviation: string }) {
  return (
    <img
      src={`https://a.espncdn.com/i/teamlogos/mlb/500/${abbreviation}.png`}
      alt=""
      className="h-14 w-14 object-contain"
    />
  );
}

export default async function TeamsPage() {
  const { data: teams, error } = await supabase
    .from("Teams")
    .select("id, name, abbreviation, league")
    .order("name");

  if (error) {
    return (
      <main className="min-h-screen bg-[#F8F3EA] px-6 py-20 text-[#1A2842]">
        <div className="mx-auto max-w-7xl">
          <p className="text-red-600">Error loading teams: {error.message}</p>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[#F8F3EA] text-[#1A2842]">
      <section className="border-b border-[#1A2842]/20">
        <div className="mx-auto max-w-7xl px-6 py-14">
          <p className="text-xs font-bold uppercase tracking-[0.25em] text-[#D85F46]">
            Around the League
          </p>

          <div className="mt-3 flex items-end justify-between gap-6">
            <div>
              <h1 className="text-5xl font-black tracking-[-0.05em]">
                Teams
              </h1>
              <p className="mt-3 max-w-xl text-[#687384]">
                All 30 Major League clubs — rosters, and results.
              </p>
            </div>

            <div className="hidden text-right md:block">
              <p className="text-3xl font-black">{teams?.length ?? 0}</p>
              <p className="text-xs font-bold uppercase tracking-[0.16em] text-[#687384]">
                Teams
              </p>
            </div>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-6 py-12">
        <div className="grid grid-cols-1 gap-px border border-[#1A2842]/20 bg-[#1A2842]/20 sm:grid-cols-2 lg:grid-cols-3">
          {teams?.map((team) => (
            <Link
              href={`/teams/${team.id}`}
              key={team.id}
              className="group flex items-center gap-4 bg-[#F8F3EA] p-6 transition hover:bg-[#59B3AD]/10"
            >
              <TeamLogo abbreviation={team.abbreviation} />

              <div>
                <h2 className="font-bold group-hover:text-[#D85F46]">
                  {team.name}
                </h2>
                <p className="mt-1 text-xs font-bold uppercase tracking-[0.12em] text-[#687384]">
                  {team.abbreviation}
                </p>
              </div>
            </Link>
          ))}
        </div>
      </section>
    </main>
  );
}
