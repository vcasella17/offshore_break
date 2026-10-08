import Link from "next/link";
import { getBreakoutBoard } from "@/lib/breakouts";

function formatAverage(value: number | null) {
  if (value === null) return "—";
  return value.toFixed(3).replace(/^0/, "");
}

function formatPercent(value: number | null) {
  if (value === null) return "—";
  return `${(value * 100).toFixed(1)}%`;
}

function ScoreBar({
  label,
  value,
}: {
  label: string;
  value: number;
}) {
  return (
    <div>
      <div className="mb-2 flex items-center justify-between">
        <span className="text-[8px] font-black uppercase tracking-[0.16em] text-white/45">
          {label}
        </span>

        <span className="font-mono text-[10px] font-black text-white">
          {value}
        </span>
      </div>

      <div className="h-1.5 bg-white/10">
        <div
          className="h-full bg-[#D85F46]"
          style={{ width: `${value}%` }}
        />
      </div>
    </div>
  );
}

function PlayerCard({
  row,
}: {
  row: Awaited<ReturnType<typeof getBreakoutBoard>>[number];
}) {
  return (
    <Link
      href={`/players/${row.player.id}`}
      className="group block border border-[#1A2842]/15 bg-[#F8F3EA] transition hover:-translate-y-1 hover:border-[#D85F46]"
    >
      <div className="border-b border-[#1A2842]/10 p-5">
        <div className="flex items-start justify-between">
          <div>
            <p className="font-mono text-[10px] font-black text-[#D85F46]">
              #{String(row.rank).padStart(2, "0")}
            </p>

            <p className="mt-3 text-[9px] font-black uppercase tracking-[0.18em] text-[#59B3AD]">
              {row.team?.abbreviation ?? "FA"} ·{" "}
              {row.player.position ?? "—"}
            </p>

            <h3 className="mt-1 text-2xl font-black tracking-[-0.04em] group-hover:text-[#D85F46]">
              {row.player.name}
            </h3>
          </div>

          <div className="text-right">
            <p className="font-mono text-4xl font-black text-[#1A2842]">
              {row.score}
            </p>

            <p className="text-[7px] font-black uppercase tracking-[0.16em] text-[#1A2842]/35">
              Breakout Score
            </p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-3 border-b border-[#1A2842]/10">
        <div className="border-r border-[#1A2842]/10 p-4">
          <p className="font-mono text-xl font-black">
            {formatAverage(row.current.batting_avg)}
          </p>

          <p className="mt-1 text-[7px] font-black uppercase tracking-[0.14em] text-[#1A2842]/35">
            AVG
          </p>
        </div>

        <div className="border-r border-[#1A2842]/10 p-4">
          <p className="font-mono text-xl font-black">
            {formatAverage(row.current.ops)}
          </p>

          <p className="mt-1 text-[7px] font-black uppercase tracking-[0.14em] text-[#1A2842]/35">
            OPS
          </p>
        </div>

        <div className="p-4">
          <p className="font-mono text-xl font-black">
            {row.current.home_runs ?? "—"}
          </p>

          <p className="mt-1 text-[7px] font-black uppercase tracking-[0.14em] text-[#1A2842]/35">
            HR
          </p>
        </div>
      </div>

      <div className="p-5">
        <p className="text-[8px] font-black uppercase tracking-[0.18em] text-[#59B3AD]">
          Why we're watching
        </p>

        <p className="mt-3 text-xs leading-5 text-[#1A2842]/65">
          {row.reasons[0]}
        </p>

        <div className="mt-5 flex items-center justify-between">
          <span className="text-[8px] font-black uppercase tracking-[0.16em] text-[#1A2842]/35">
            View player
          </span>

          <span className="font-black text-[#D85F46]">
            →
          </span>
        </div>
      </div>
    </Link>
  );
}

export default async function BreakoutsPage() {
  const board = await getBreakoutBoard();

  const featured = board[0];
  const rest = board.slice(1);

  return (
    <main className="min-h-screen bg-[#F8F3EA] text-[#1A2842]">
      {/* HERO */}

      <section className="bg-[#0B1423] text-white">
        <div className="mx-auto max-w-[1440px] px-5 py-16 md:px-8 md:py-24">
          <div className="max-w-4xl">
            <p className="text-[9px] font-black uppercase tracking-[0.24em] text-[#59B3AD]">
              The Breakout Board · 2027 Outlook
            </p>

            <h1 className="mt-5 text-5xl font-black tracking-[-0.06em] md:text-7xl">
              Who&apos;s about
              <br />
              <span className="text-[#D85F46]">
                to take off?
              </span>
            </h1>

            <p className="mt-7 max-w-2xl text-sm leading-7 text-white/45 md:text-base">
              Offshore Break looks beyond the box score to find
              hitters whose underlying contact quality, expected
              production, and recent trajectory point toward a
              bigger 2027.
            </p>
          </div>

          <div className="mt-14 grid border-t border-white/10 md:grid-cols-4">
            <div className="border-b border-white/10 py-6 md:border-b-0 md:border-r md:pr-6">
              <p className="font-mono text-3xl font-black">
                {board.length}
              </p>

              <p className="mt-2 text-[8px] font-black uppercase tracking-[0.16em] text-white/35">
                Candidates
              </p>
            </div>

            <div className="border-b border-white/10 py-6 md:border-b-0 md:border-r md:px-6">
              <p className="font-mono text-3xl font-black">
                2027
              </p>

              <p className="mt-2 text-[8px] font-black uppercase tracking-[0.16em] text-white/35">
                Outlook
              </p>
            </div>

            <div className="border-b border-white/10 py-6 md:border-b-0 md:border-r md:px-6">
              <p className="font-mono text-3xl font-black">
                100
              </p>

              <p className="mt-2 text-[8px] font-black uppercase tracking-[0.16em] text-white/35">
                Max Score
              </p>
            </div>

            <div className="py-6 md:pl-6">
              <p className="font-mono text-3xl font-black">
                5
              </p>

              <p className="mt-2 text-[8px] font-black uppercase tracking-[0.16em] text-white/35">
                Signals
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* FEATURED */}

      {featured && (
        <section className="mx-auto max-w-[1440px] px-5 py-12 md:px-8">
          <div className="mb-5 flex items-end justify-between border-b border-[#1A2842]/15 pb-4">
            <div>
              <p className="text-[9px] font-black uppercase tracking-[0.22em] text-[#D85F46]">
                The No. 1 Candidate
              </p>

              <h2 className="mt-1 text-2xl font-black tracking-[-0.04em]">
                Most likely to break out
              </h2>
            </div>
          </div>

          <Link
            href={`/players/${featured.player.id}`}
            className="grid overflow-hidden bg-[#101A2C] text-white lg:grid-cols-[1fr_360px]"
          >
            <div className="p-7 md:p-10">
              <p className="font-mono text-sm font-black text-[#D85F46]">
                01
              </p>

              <p className="mt-8 text-[9px] font-black uppercase tracking-[0.2em] text-[#59B3AD]">
                {featured.team?.name ?? "Free Agent"} ·{" "}
                {featured.player.position ?? "—"}
              </p>

              <h2 className="mt-2 text-4xl font-black tracking-[-0.05em] md:text-6xl">
                {featured.player.name}
              </h2>

              <p className="mt-6 max-w-2xl text-sm leading-6 text-white/45">
                {featured.reasons.join(" ")}
              </p>

              <div className="mt-9 grid gap-5 sm:grid-cols-3">
                <div>
                  <p className="font-mono text-3xl font-black">
                    {formatPercent(featured.statcast.hard_hit_rate)}
                  </p>

                  <p className="mt-1 text-[8px] font-black uppercase tracking-[0.16em] text-white/30">
                    Hard Hit
                  </p>
                </div>

                <div>
                  <p className="font-mono text-3xl font-black">
                    {formatPercent(featured.statcast.barrel_rate)}
                  </p>

                  <p className="mt-1 text-[8px] font-black uppercase tracking-[0.16em] text-white/30">
                    Barrel Rate
                  </p>
                </div>

                <div>
                  <p className="font-mono text-3xl font-black">
                    {featured.statcast.xwoba?.toFixed(3) ?? "—"}
                  </p>

                  <p className="mt-1 text-[8px] font-black uppercase tracking-[0.16em] text-white/30">
                    xwOBA
                  </p>
                </div>
              </div>
            </div>

            <div className="border-t border-white/10 bg-[#0B1423] p-7 md:p-10 lg:border-l lg:border-t-0">
              <p className="text-[8px] font-black uppercase tracking-[0.2em] text-white/30">
                Breakout Score
              </p>

              <p className="mt-2 font-mono text-8xl font-black text-[#D85F46]">
                {featured.score}
              </p>

              <p className="mt-1 text-[8px] font-black uppercase tracking-[0.18em] text-white/30">
                Out of 100
              </p>

              <div className="mt-10 space-y-5">
                <ScoreBar
                  label="Contact Quality"
                  value={featured.contactScore}
                />

                <ScoreBar
                  label="Expected Production"
                  value={featured.expectedScore}
                />

                <ScoreBar
                  label="2026 Trend"
                  value={featured.trendScore}
                />

                <ScoreBar
                  label="Opportunity"
                  value={featured.opportunityScore}
                />

                <ScoreBar
                  label="Development"
                  value={featured.developmentScore}
                />
              </div>
            </div>
          </Link>
        </section>
      )}

      {/* BOARD */}

      <section className="mx-auto max-w-[1440px] px-5 pb-20 md:px-8">
        <div className="flex items-end justify-between border-b border-[#1A2842]/15 pb-4">
          <div>
            <p className="text-[9px] font-black uppercase tracking-[0.22em] text-[#59B3AD]">
              The Board
            </p>

            <h2 className="mt-1 text-2xl font-black tracking-[-0.04em]">
              Other players to watch
            </h2>
          </div>

          <span className="font-mono text-[9px] font-black text-[#1A2842]/30">
            02—25
          </span>
        </div>

        <div className="mt-6 grid gap-px bg-[#1A2842]/15 md:grid-cols-2 lg:grid-cols-3">
          {rest.map((row) => (
            <PlayerCard
              key={row.player.id}
              row={row}
            />
          ))}
        </div>
      </section>

      {/* METHODOLOGY */}

      <section className="bg-[#101A2C] text-white">
        <div className="mx-auto max-w-[1440px] px-5 py-16 md:px-8">
          <div className="max-w-3xl">
            <p className="text-[9px] font-black uppercase tracking-[0.22em] text-[#D85F46]">
              How it works
            </p>

            <h2 className="mt-3 text-4xl font-black tracking-[-0.05em]">
              Not a leaderboard.
              <br />
              A forward-looking model.
            </h2>

            <p className="mt-5 text-sm leading-7 text-white/40">
              The Breakout Score combines underlying contact quality,
              expected production, year-over-year improvement, playing
              opportunity, and development. The goal isn't to identify
              the best player today. It's to identify the player whose
              next level may be closer than the box score suggests.
            </p>
          </div>

          <div className="mt-12 grid gap-px bg-white/10 md:grid-cols-5">
            {[
              ["30%", "Contact Quality"],
              ["30%", "Expected Production"],
              ["20%", "2026 Trend"],
              ["10%", "Opportunity"],
              ["10%", "Development"],
            ].map(([weight, label]) => (
              <div
                key={label}
                className="bg-[#101A2C] p-6"
              >
                <p className="font-mono text-3xl font-black text-[#D85F46]">
                  {weight}
                </p>

                <p className="mt-3 text-[8px] font-black uppercase tracking-[0.16em] text-white/35">
                  {label}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>
    </main>
  );
}