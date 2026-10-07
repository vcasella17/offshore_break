import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import PlayerPicker from "@/components/PlayerPicker";
import { teamLogo } from "@/lib/baseball";
import { loadAppraisalContext } from "@/lib/appraisalData";
import { MODEL, formatMoney, formatWar } from "@/lib/appraisal";

export const revalidate = 3600;

export const metadata: Metadata = {
  title: "The Appraisal",
  description:
    "What every player is worth and what he is paid: comparable players, precedent contracts, and a discounted cash flow of his future production.",
};

type BoardRow = {
  id: number;
  name: string;
  teamId: string | null;
  teamAbbr: string;
  position: string | null;
  war: number;
  salary: number;
  surplus: number;
};

function BoardTable({
  title,
  eyebrow,
  accent,
  rows,
}: {
  title: string;
  eyebrow: string;
  accent: string;
  rows: BoardRow[];
}) {
  return (
    <div className="border-t-2 bg-white" style={{ borderColor: accent }}>
      <div className="border-b border-[#1A2842]/10 px-5 py-5">
        <p
          className="text-[0.75rem] font-bold uppercase tracking-[0.16em]"
          style={{ color: accent }}
        >
          {eyebrow}
        </p>
        <h3 className="mt-1 text-2xl font-black tracking-tight">{title}</h3>
      </div>

      {rows.length === 0 ? (
        <p className="px-5 py-10 text-sm text-[#687384]">No players to show yet.</p>
      ) : (
        rows.map((row, index) => (
          <Link
            key={row.id}
            href={`/appraisal/${row.id}`}
            className="group flex items-center gap-4 border-b border-[#1A2842]/10 px-5 py-3.5 transition-colors last:border-0 hover:bg-[#F8F3EA]"
          >
            <span className="w-7 shrink-0 font-mono text-sm font-bold text-[#1F7A74]">
              {String(index + 1).padStart(2, "0")}
            </span>

            {row.teamId ? (
              <img
                src={teamLogo(row.teamId)}
                alt=""
                aria-hidden="true"
                className="h-9 w-9 shrink-0 object-contain"
              />
            ) : (
              <span className="h-9 w-9 shrink-0" />
            )}

            <div className="min-w-0 flex-1">
              <p className="truncate text-base font-bold group-hover:text-[#D85F46]">
                {row.name}
              </p>
              <p className="mt-0.5 truncate font-mono text-xs text-[#687384]">
                {row.teamAbbr}
                {row.position ? ` · ${row.position}` : ""} · {formatWar(row.war)} WAR ·{" "}
                {formatMoney(row.salary)}
              </p>
            </div>

            <p className="shrink-0 font-mono text-lg font-bold" style={{ color: accent }}>
              {row.surplus >= 0 ? "+" : "−"}
              {formatMoney(Math.abs(row.surplus))}
            </p>
          </Link>
        ))
      )}
    </div>
  );
}

export default async function AppraisalHome({
  searchParams,
}: {
  searchParams: Promise<{ player?: string }>;
}) {
  const params = await searchParams;
  const picked = params.player ? Number(params.player) : NaN;
  if (Number.isInteger(picked)) redirect(`/appraisal/${picked}`);

  const ctx = await loadAppraisalContext();
  const teamMap = new Map(ctx.teams.map((team) => [team.id, team]));
  const playerMap = new Map(ctx.players.map((player) => [player.id, player]));

  /* The list the search box uses: name + team, A to Z */
  const pickerPlayers = [...ctx.players]
    .sort((a, b) => a.name.localeCompare(b.name))
    .map((player) => ({
      id: player.id,
      name: player.name,
      team: player.team_id
        ? (teamMap.get(player.team_id)?.abbreviation ?? null)
        : null,
    }));

  /* Bargain Board: production value minus salary, latest season with data */
  const warSeason = ctx.warRows.length
    ? Math.max(...ctx.warRows.map((row) => row.season))
    : null;

  const board: BoardRow[] = [];

  if (warSeason !== null) {
    for (const row of ctx.warRows) {
      if (row.season !== warSeason || row.war === null || row.salary === null) continue;

      const player = playerMap.get(row.player_id);
      if (!player) continue;

      const team = player.team_id ? teamMap.get(player.team_id) : undefined;

      board.push({
        id: player.id,
        name: player.name,
        teamId: team?.id ?? null,
        teamAbbr: team?.abbreviation ?? "FA",
        position: player.position,
        war: row.war,
        salary: row.salary,
        surplus: Math.max(0, row.war) * MODEL.dollarsPerWar - row.salary,
      });
    }
  }

  const bargains = [...board].sort((a, b) => b.surplus - a.surplus).slice(0, 10);
  const overpaid = board
    .filter((row) => row.salary >= 5_000_000)
    .sort((a, b) => a.surplus - b.surplus)
    .slice(0, 10);

  return (
    <div className="bg-[#F8F3EA] text-[#1A2842]">
      {/* HEADER */}
      <section className="paper-grid border-b border-[#1A2842]/15">
        <div className="container-page py-12 md:py-16">
          <div className="mb-5 flex items-center gap-3">
            <span className="h-[2px] w-10 bg-[#D85F46]" />
            <span className="font-mono text-[0.75rem] font-bold uppercase tracking-[0.22em] text-[#1F7A74]">
              Offshore Break / The Appraisal
            </span>
          </div>

          <h1 className="text-[clamp(2.6rem,7vw,5.5rem)] font-black uppercase leading-[0.85] tracking-[-0.07em]">
            What he&apos;s worth.
            <br />
            <span className="text-[#D85F46]">What he&apos;s paid.</span>
          </h1>

          <p className="mt-6 max-w-2xl text-base leading-7 text-[#687384]">
            Every player gets a fair value built like a banker&apos;s valuation:
            comparable players, precedent contracts, a discounted cash flow of
            his future production, and a football field that ties the ranges
            together.
          </p>
        </div>
      </section>

      {/* PICKER */}
      <section className="container-page py-8">
        <form
          action="/appraisal"
          method="GET"
          className="grid gap-3 md:grid-cols-[1fr_auto] md:items-end"
        >
          <PlayerPicker
            players={pickerPlayers}
            label="Appraise a player"
            name="player"
          />

          <button
            type="submit"
            className="h-12 bg-[#1A2842] px-8 text-[0.8rem] font-black uppercase tracking-[0.16em] text-white transition hover:bg-[#D85F46]"
          >
            Run appraisal
          </button>
        </form>
      </section>

      {/* BARGAIN BOARD */}
      <section className="container-page pb-16">
        <div className="mb-6 border-b border-[#1A2842]/15 pb-4">
          <p className="font-mono text-[0.75rem] font-bold uppercase tracking-[0.2em] text-[#1F7A74]">
            The Bargain Board
          </p>
          <h2 className="mt-2 text-4xl font-black uppercase tracking-[-0.05em]">
            Production minus pay
          </h2>
          <p className="mt-2 max-w-2xl text-base leading-7 text-[#687384]">
            {warSeason !== null
              ? `${warSeason} WAR at about ${formatMoney(MODEL.dollarsPerWar)} per win, minus salary. Overpaid list shows players earning $5M or more.`
              : "Nothing to rank yet."}
          </p>
        </div>

        {warSeason === null ? (
          <div className="border border-dashed border-[#1A2842]/20 bg-white px-6 py-16 text-center">
            <p className="font-mono text-[0.75rem] font-bold uppercase tracking-[0.2em] text-[#1F7A74]">
              Setup needed
            </p>
            <h3 className="mt-3 text-2xl font-black">WAR and salary aren&apos;t imported yet</h3>
            <p className="mx-auto mt-3 max-w-lg text-base leading-7 text-[#687384]">
              Run the import script once (<code>scripts/import-war.mjs</code>) and
              this board fills in. Individual appraisals still work in the
              meantime using estimates.
            </p>
          </div>
        ) : (
          <div className="grid gap-6 xl:grid-cols-2">
            <BoardTable
              eyebrow="Best value"
              title="Biggest bargains"
              accent="#1F7A74"
              rows={bargains}
            />
            <BoardTable
              eyebrow="Most expensive production"
              title="Most overpaid"
              accent="#D85F46"
              rows={overpaid}
            />
          </div>
        )}
      </section>
    </div>
  );
}