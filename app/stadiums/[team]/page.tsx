import Link from "next/link";
import { notFound } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";
import { teamLogo } from "@/lib/baseball";
import { STADIUMS, stadiumUrl } from "@/lib/stadiums";
import StadiumViewer from "@/components/StadiumViewer";

export const revalidate = 3600;

export default async function StadiumPage({
  params,
}: {
  params: Promise<{ team: string }>;
}) {
  const { team } = await params;
  const abbreviation = team.toUpperCase();

  if (!/^[A-Z]{2,3}$/.test(abbreviation)) {
    notFound();
  }

  const { data: teamRow } = await supabase
    .from("Teams")
    .select("id, name, abbreviation")
    .eq("abbreviation", abbreviation)
    .maybeSingle();

  const stadium = STADIUMS[abbreviation];

  return (
    <main className="min-h-screen bg-[#F8F3EA] text-[#1A2842]">
      <section className="paper-grid border-b border-[#1A2842]/15">
        <div className="container-page py-10 md:py-14">
          <div className="mb-5 flex items-center gap-3">
            <span className="h-[2px] w-10 bg-[#D85F46]" />
            <Link
              href="/stadiums"
              className="font-mono text-[0.75rem] font-bold uppercase tracking-[0.22em] text-[#1F7A74] hover:text-[#D85F46]"
            >
              Offshore Break / Ballparks
            </Link>
          </div>

          <div className="flex items-center gap-5">
            {teamRow && (
              <img
                src={teamLogo(teamRow.id)}
                alt=""
                aria-hidden="true"
                className="h-16 w-16 object-contain md:h-20 md:w-20"
              />
            )}

            <div>
              <h1 className="text-4xl font-black uppercase leading-[0.95] tracking-[-0.05em] md:text-6xl">
                {stadium?.name ?? `${abbreviation} ballpark`}
              </h1>
              <p className="mt-2 font-mono text-sm font-bold uppercase tracking-[0.14em] text-[#1F7A74]">
                {teamRow?.name ?? abbreviation}
              </p>
            </div>
          </div>
        </div>
      </section>

      <section className="container-page py-8">
        {stadium ? (
          <>
            <StadiumViewer
              modelUrl={stadiumUrl(abbreviation)}
              className="h-[75vh] min-h-[30rem] w-full"
            />

            <p className="mt-4 text-sm leading-6 text-[#687384]">
              3D ballpark model from MLB Statcast, used here for a school
              project. Press{" "}
              <kbd className="border border-[#1A2842]/30 px-1.5">P</kbd> while
              viewing to print the camera position in the browser console.
            </p>
          </>
        ) : (
          <div className="border border-dashed border-[#1A2842]/20 bg-white px-6 py-20 text-center">
            <p className="font-mono text-[0.75rem] font-bold uppercase tracking-[0.2em] text-[#1F7A74]">
              Model not added yet
            </p>
            <h2 className="mt-3 text-3xl font-black uppercase tracking-[-0.04em]">
              No 3D model for {abbreviation} yet
            </h2>
            <p className="mx-auto mt-3 max-w-md text-base leading-7 text-[#687384]">
              Add{" "}
              <code>public/stadiums/{abbreviation}.glb</code> and list it in{" "}
              <code>lib/stadiums.ts</code>.
            </p>
            <Link
              href="/stadiums"
              className="mt-6 inline-block font-semibold text-[#D85F46]"
            >
              ← All ballparks
            </Link>
          </div>
        )}
      </section>
    </main>
  );
}