import type { Metadata } from "next";
import Link from "next/link";
import { supabase } from "@/lib/supabaseClient";
import { teamLogo } from "@/lib/baseball";
import { getStadium } from "@/lib/stadiums";

export const revalidate = 3600;

export const metadata: Metadata = {
  title: "Ballparks",
};

type Team = {
  id: string;
  name: string;
  abbreviation: string;
};

export default async function StadiumsPage() {
  const { data, error } = await supabase
    .from("Teams")
    .select("id, name, abbreviation")
    .order("name");

  const teams = (data ?? []) as Team[];
  const available = teams.filter((team) => getStadium(team.abbreviation)).length;

  return (
    <div className="bg-[#F8F3EA] text-[#1A2842]">
      {/* HEADER */}
      <section className="paper-grid border-b border-[#1A2842]/15">
        <div className="container-page py-12 md:py-16">
          <div className="mb-5 flex items-center gap-3">
            <span className="h-[2px] w-10 bg-[#D85F46]" />
            <span className="font-mono text-[0.75rem] font-bold uppercase tracking-[0.22em] text-[#1F7A74]">
              Offshore Break / Ballparks
            </span>
          </div>

          <h1 className="text-[clamp(2.6rem,7vw,5.5rem)] font-black uppercase leading-[0.85] tracking-[-0.07em]">
            Step inside
            <br />
            <span className="text-[#D85F46]">the park.</span>
          </h1>

          <p className="mt-6 max-w-2xl text-base leading-7 text-[#687384]">
            Spin, zoom and fly around real 3D models of Major League ballparks.{" "}
            <strong>{available}</strong> of {teams.length} are ready so far.
          </p>
        </div>
      </section>

      {/* GRID */}
      <section className="container-page py-10">
        {error ? (
          <p className="border border-dashed border-[#D85F46]/50 bg-white px-6 py-10 text-center text-[#687384]">
            Couldn’t load the teams. Refresh the page to try again.
          </p>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {teams.map((team) => {
              const stadium = getStadium(team.abbreviation);

              const card = (
                <div
                  className={`flex h-full items-center gap-4 border-t-2 p-5 transition ${
                    stadium
                      ? "border-[#1A2842] bg-white hover:-translate-y-0.5 hover:border-[#D85F46] hover:shadow-[0_12px_30px_rgba(26,40,66,0.08)]"
                      : "border-[#1A2842]/15 bg-[#FCF9F3] opacity-60"
                  }`}
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={teamLogo(team.id)}
                    alt=""
                    aria-hidden="true"
                    className="h-14 w-14 shrink-0 object-contain"
                  />

                  <div className="min-w-0">
                    <p className="truncate text-base font-bold">{team.name}</p>
                    <p className="mt-0.5 truncate text-sm text-[#687384]">
                      {stadium?.name ?? "Model coming soon"}
                    </p>
                    <p className="mt-1 font-mono text-[0.7rem] font-bold uppercase tracking-[0.14em] text-[#1F7A74]">
                      {stadium ? "View in 3D →" : team.abbreviation}
                    </p>
                  </div>
                </div>
              );

              return stadium ? (
                <Link key={team.id} href={`/stadiums/${team.abbreviation}`}>
                  {card}
                </Link>
              ) : (
                <div key={team.id}>{card}</div>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
}
