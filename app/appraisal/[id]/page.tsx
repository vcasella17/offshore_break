import Link from "next/link";
import { notFound } from "next/navigation";
import FootballField, { type FieldRowData } from "@/components/FootballField";
import { formatInnings, headshotSilo, teamLogo } from "@/lib/baseball";
import { getBirthDate, loadAppraisalContext } from "@/lib/appraisalData";
import { CONTRACTS } from "@/lib/contracts";
import {
  MODEL,
  buildAppraisal,
  formatMoney,
  formatWar,
  type ScenarioKey,
  type Tone,
  type Verdict,
} from "@/lib/appraisal";

export const revalidate = 3600;

const TONE_COLOR: Record<Tone, string> = {
  navy: "#1A2842",
  teal: "#1F7A74",
  coral: "#D85F46",
  gold: "#C99A2E",
  indigo: "#6B78B8",
};

const VERDICT: Record<Verdict, { label: string; color: string; line: string }> = {
  bargain: {
    label: "Bargain",
    color: "#1F7A74",
    line: "He produces more than he is paid.",
  },
  fair: {
    label: "Fairly paid",
    color: "#1A2842",
    line: "His pay is in line with his value.",
  },
  overpaid: {
    label: "Overpaid",
    color: "#D85F46",
    line: "He is paid more than his production is worth.",
  },
};

function SummaryCard({
  label,
  value,
  caption,
  accent,
}: {
  label: string;
  value: string;
  caption: string;
  accent: string;
}) {
  return (
    <div className="border-t-2 bg-white p-6" style={{ borderColor: accent }}>
      <p
        className="text-[0.75rem] font-bold uppercase tracking-[0.16em]"
        style={{ color: accent }}
      >
        {label}
      </p>
      <p className="mt-3 font-mono text-4xl font-bold">{value}</p>
      <p className="mt-2 text-sm leading-6 text-[#687384]">{caption}</p>
    </div>
  );
}

export default async function AppraisalPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const playerId = Number(id);
  if (!Number.isInteger(playerId)) notFound();

  const ctx = await loadAppraisalContext();
  const player = ctx.players.find((p) => p.id === playerId);
  if (!player) notFound();

  const team = player.team_id
    ? ctx.teams.find((t) => t.id === player.team_id) ?? null
    : null;

  const birthDate = await getBirthDate(playerId);

  const appraisal = buildAppraisal({
    season: ctx.season,
    player,
    players: ctx.players,
    stats: ctx.stats,
    warRows: ctx.warRows,
    teams: ctx.teams,
    birthDate,
    contract: CONTRACTS[playerId] ?? null,
  });

  if (!appraisal) {
    return (
      <main className="min-h-screen bg-[#F8F3EA] text-[#1A2842]">
        <div className="container-page py-20">
          <p className="font-mono text-[0.75rem] font-bold uppercase tracking-[0.2em] text-[#1F7A74]">
            The Appraisal
          </p>
          <h1 className="mt-3 text-4xl font-black">
            No {ctx.season} stats for {player.name}
          </h1>
          <p className="mt-3 max-w-xl text-base leading-7 text-[#687384]">
            An appraisal needs season stats. Try a player who appeared in{" "}
            {ctx.season}.
          </p>
          <Link
            href="/appraisal"
            className="mt-6 inline-block font-semibold text-[#D85F46]"
          >
            ← Back to The Appraisal
          </Link>
        </div>
      </main>
    );
  }

  const fieldRows: FieldRowData[] = appraisal.rows.map((row) => ({
    key: row.key,
    label: row.label,
    sub: row.sub,
    range: row.range,
    color: TONE_COLOR[row.tone],
    highlight: row.highlight,
  }));

  const marker =
    appraisal.marketLine !== null
      ? {
          value: appraisal.marketLine,
          label:
            appraisal.marketSource === "contract"
              ? "Contract (per year)"
              : `${ctx.season} salary`,
        }
      : null;

  const verdict = appraisal.verdict ? VERDICT[appraisal.verdict] : null;
  const isPitcher = appraisal.estimate.kind === "pitcher";

  return (
    <main className="min-h-screen bg-[#F8F3EA] text-[#1A2842]">
      {/* HEADER */}
      <section className="paper-grid border-b border-[#1A2842]/15">
        <div className="container-page py-10 md:py-14">
          <div className="mb-5 flex items-center gap-3">
            <span className="h-[2px] w-10 bg-[#D85F46]" />
            <Link
              href="/appraisal"
              className="font-mono text-[0.75rem] font-bold uppercase tracking-[0.22em] text-[#1F7A74] hover:text-[#D85F46]"
            >
              The Appraisal
            </Link>
          </div>

          <div className="relative flex min-h-[11rem] items-center overflow-hidden border border-[#1A2842]/15 bg-white p-6 md:p-8">
            <div className="relative z-10 max-w-[65%]">
              <div className="flex items-center gap-3">
                {team && (
                  <img
                    src={teamLogo(team.id)}
                    alt=""
                    aria-hidden="true"
                    className="h-9 w-9 object-contain"
                  />
                )}
                <p className="font-mono text-[0.75rem] font-bold uppercase tracking-[0.18em] text-[#1F7A74]">
                  {team?.name ?? "Free agent"}
                  {player.position ? ` · ${player.position}` : ""}
                </p>
              </div>

              <h1 className="mt-2 text-4xl font-black uppercase leading-[0.95] tracking-[-0.05em] md:text-6xl">
                {player.name}
              </h1>

              <p className="mt-3 text-sm leading-6 text-[#687384]">
                {formatWar(appraisal.estimate.war)} WAR in {ctx.season}
                {appraisal.warSource === "estimated" && " (estimated)"}
                {" · "}
                {isPitcher
                  ? `${formatInnings(appraisal.estimate.ip)} IP`
                  : `${appraisal.estimate.pa} PA`}
                {" · "}
                age {appraisal.age} next season
                {!appraisal.ageKnown && " (assumed)"}
              </p>
            </div>

            <img
              src={headshotSilo(player.id)}
              alt=""
              aria-hidden="true"
              className="pointer-events-none absolute bottom-0 right-4 h-[115%] w-auto object-contain"
            />
          </div>
        </div>
      </section>

      {/* NOTICES */}
      {(!ctx.warAvailable || appraisal.warSource === "estimated") && (
        <section className="container-page pt-6">
          <p className="border-l-4 border-[#C99A2E] bg-white px-5 py-4 text-sm leading-6 text-[#687384]">
            {ctx.warAvailable
              ? "WAR for this player isn't in the database yet, so this uses an estimate built from his stats."
              : "WAR and salary data haven't been imported yet, so this page uses estimates and can't show salary."}
          </p>
        </section>
      )}

      {/* VERDICT */}
      {verdict && appraisal.surplus !== null && appraisal.marketLine !== null && (
        <section className="container-page pt-8">
          <div
            className="flex flex-col justify-between gap-4 border-l-8 bg-white p-6 md:flex-row md:items-center"
            style={{ borderColor: verdict.color }}
          >
            <div>
              <p
                className="font-mono text-[0.75rem] font-bold uppercase tracking-[0.2em]"
                style={{ color: verdict.color }}
              >
                The verdict
              </p>
              <p className="mt-1 text-4xl font-black uppercase tracking-[-0.04em]">
                {verdict.label}
              </p>
              <p className="mt-1 text-base text-[#687384]">{verdict.line}</p>
            </div>

            <div className="md:text-right">
              <p className="font-mono text-4xl font-bold" style={{ color: verdict.color }}>
                {appraisal.surplus >= 0 ? "+" : "−"}
                {formatMoney(Math.abs(appraisal.surplus))}
              </p>
              <p className="mt-1 text-sm text-[#687384]">
                fair value vs. pay, per season
              </p>
            </div>
          </div>

          {appraisal.earlyCareer && (
            <p className="mt-3 text-sm leading-6 text-[#687384]">
              He is paid near the league minimum, which is common early in a
              career. Teams control young players cheaply, so the surplus shows
              what he would earn on the open market, not what he can demand today.
            </p>
          )}
        </section>
      )}

      {/* SUMMARY */}
      <section className="container-page py-8">
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <SummaryCard
            label="Fair value"
            value={formatMoney(appraisal.blended.mid)}
            caption={`Per season, range ${formatMoney(appraisal.blended.low)} to ${formatMoney(appraisal.blended.high)}.`}
            accent={TONE_COLOR.gold}
          />
          <SummaryCard
            label={appraisal.marketSource === "contract" ? "Contract" : "Current pay"}
            value={appraisal.marketLine !== null ? formatMoney(appraisal.marketLine) : "—"}
            caption={
              appraisal.marketSource === "contract" && appraisal.contract
                ? `${appraisal.contract.years} years remaining.`
                : appraisal.marketLine !== null
                  ? `${ctx.season} salary.`
                  : "Salary isn't available for this player yet."
            }
            accent={TONE_COLOR.coral}
          />
          <SummaryCard
            label="Intrinsic value · DCF"
            value={formatMoney(appraisal.dcf.base.totalPv)}
            caption={`Present value of ${appraisal.dcf.base.rows.length} projected seasons.`}
            accent={TONE_COLOR.navy}
          />
          <SummaryCard
            label="Production value"
            value={formatMoney(appraisal.current.mid)}
            caption={`${ctx.season} WAR at about ${formatMoney(MODEL.dollarsPerWar)} per win.`}
            accent={TONE_COLOR.teal}
          />
        </div>

        {appraisal.contract &&
          appraisal.contractPvValue !== null &&
          appraisal.contractDcf !== null && (
            <div className="mt-4 border-l-4 border-[#D85F46] bg-white p-6">
              <p className="font-mono text-[0.75rem] font-bold uppercase tracking-[0.18em] text-[#D85F46]">
                Contract vs. intrinsic value
              </p>
              <p className="mt-2 text-lg leading-8">
                {formatMoney(appraisal.contract.aav)} × {appraisal.contract.years} yrs
                (present value {formatMoney(appraisal.contractPvValue)}). Over the
                same seasons his projected production is worth{" "}
                <strong>{formatMoney(appraisal.contractDcf)}</strong>.{" "}
                {appraisal.contractDcf >= appraisal.contractPvValue ? (
                  <span className="font-bold text-[#1F7A74]">
                    Surplus of{" "}
                    {formatMoney(appraisal.contractDcf - appraisal.contractPvValue)}.
                  </span>
                ) : (
                  <span className="font-bold text-[#D85F46]">
                    Shortfall of{" "}
                    {formatMoney(appraisal.contractPvValue - appraisal.contractDcf)}.
                  </span>
                )}
              </p>
              {appraisal.contract.note && (
                <p className="mt-2 text-sm text-[#687384]">{appraisal.contract.note}</p>
              )}
            </div>
          )}
      </section>

      {/* FOOTBALL FIELD */}
      <section className="container-page pb-14">
        <div className="mb-5">
          <p className="font-mono text-[0.75rem] font-bold uppercase tracking-[0.2em] text-[#1F7A74]">
            01 / Valuation range
          </p>
          <h2 className="mt-2 text-4xl font-black uppercase tracking-[-0.05em]">
            Football field
          </h2>
          <p className="mt-2 max-w-2xl text-base leading-7 text-[#687384]">
            Valuation outputs are shown as ranges, not point estimates. The
            dashed line is what he is paid.
          </p>
        </div>

        <FootballField rows={fieldRows} marker={marker} />
      </section>

      {/* COMPS + PRECEDENT */}
      <section className="container-page pb-14">
        <div className="mb-5">
          <p className="font-mono text-[0.75rem] font-bold uppercase tracking-[0.2em] text-[#1F7A74]">
            02 / Comparable players
          </p>
          <h2 className="mt-2 text-4xl font-black uppercase tracking-[-0.05em]">
            Comps &amp; precedent contracts
          </h2>
          <p className="mt-2 max-w-2xl text-base leading-7 text-[#687384]">
            {isPitcher
              ? "Matched on ERA, WHIP, strikeouts and walks per nine, and workload."
              : "Matched on OPS, average, power, walks, strikeouts and playing time."}{" "}
            Match is a 0–100 similarity score. Salaries under{" "}
            {formatMoney(MODEL.marketSalaryFloor)} are left out of the precedent
            range because they reflect early-career pay, not market prices.
          </p>
        </div>

        {appraisal.comps.length > 0 ? (
          <div className="overflow-x-auto border-t-2 border-[#1A2842] bg-white">
            <table className="w-full min-w-[44rem] border-collapse">
              <thead>
                <tr className="border-b border-[#1A2842]/20 text-left">
                  {["Comparable", "Team", "Pos", "Match", "WAR", "Production value", "Salary"].map(
                    (heading, index) => (
                      <th
                        key={heading}
                        className={`px-4 py-4 text-[0.75rem] font-black uppercase tracking-[0.14em] text-[#1F7A74] ${
                          index >= 3 ? "text-right" : ""
                        }`}
                      >
                        {heading}
                      </th>
                    )
                  )}
                </tr>
              </thead>
              <tbody>
                {appraisal.comps.map((comp) => (
                  <tr
                    key={comp.id}
                    className="border-b border-[#1A2842]/10 hover:bg-[#F8F3EA]/60"
                  >
                    <td className="px-4 py-3">
                      <Link
                        href={`/appraisal/${comp.id}`}
                        className="text-base font-bold hover:text-[#D85F46]"
                      >
                        {comp.payload.player.name}
                      </Link>
                    </td>
                    <td className="px-4 py-3">
                      <span className="flex items-center gap-2">
                        {comp.payload.team && (
                          <img
                            src={teamLogo(comp.payload.team.id)}
                            alt=""
                            aria-hidden="true"
                            className="h-7 w-7 object-contain"
                          />
                        )}
                        <span className="font-mono text-sm font-bold text-[#1F7A74]">
                          {comp.payload.team?.abbreviation ?? "FA"}
                        </span>
                      </span>
                    </td>
                    <td className="px-4 py-3 font-mono text-sm text-[#687384]">
                      {comp.payload.player.position ?? "—"}
                    </td>
                    <td className="px-4 py-3 text-right font-mono text-sm font-bold">
                      {comp.similarity}
                    </td>
                    <td className="px-4 py-3 text-right font-mono text-sm">
                      {formatWar(comp.war)}
                    </td>
                    <td className="px-4 py-3 text-right font-mono text-sm font-bold">
                      {formatMoney(comp.value)}
                    </td>
                    <td className="px-4 py-3 text-right font-mono text-sm">
                      {comp.payload.salary != null ? formatMoney(comp.payload.salary) : "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="bg-[#F8F3EA]">
                  <td colSpan={5} className="px-4 py-3 text-sm font-bold">
                    {player.name}
                  </td>
                  <td className="px-4 py-3 text-right font-mono text-sm font-bold text-[#D85F46]">
                    {formatMoney(appraisal.current.mid)}
                  </td>
                  <td className="px-4 py-3 text-right font-mono text-sm font-bold text-[#D85F46]">
                    {appraisal.salary != null ? formatMoney(appraisal.salary) : "—"}
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>
        ) : (
          <div className="border-t-2 border-[#1A2842] bg-white px-6 py-10 text-base text-[#687384]">
            Not enough comparable players found.
          </div>
        )}
      </section>

      {/* TRACK RECORD */}
      {appraisal.history.length > 0 && (
        <section className="container-page pb-14">
          <div className="mb-5">
            <p className="font-mono text-[0.75rem] font-bold uppercase tracking-[0.2em] text-[#1F7A74]">
              03 / Track record
            </p>
            <h2 className="mt-2 text-4xl font-black uppercase tracking-[-0.05em]">
              Season by season
            </h2>
          </div>

          <div className="overflow-x-auto border-t-2 border-[#1A2842] bg-white">
            <table className="w-full min-w-[28rem] border-collapse">
              <thead>
                <tr className="border-b border-[#1A2842]/20 text-left">
                  {["Season", "WAR", "Production value", "Salary"].map((heading, index) => (
                    <th
                      key={heading}
                      className={`px-4 py-4 text-[0.75rem] font-black uppercase tracking-[0.14em] text-[#1F7A74] ${
                        index >= 1 ? "text-right" : ""
                      }`}
                    >
                      {heading}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {appraisal.history.map((row) => (
                  <tr key={row.season} className="border-b border-[#1A2842]/10">
                    <td className="px-4 py-3 font-mono text-sm font-bold">{row.season}</td>
                    <td className="px-4 py-3 text-right font-mono text-sm">{formatWar(row.war)}</td>
                    <td className="px-4 py-3 text-right font-mono text-sm">{formatMoney(row.value)}</td>
                    <td className="px-4 py-3 text-right font-mono text-sm">
                      {row.salary != null ? formatMoney(row.salary) : "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {/* DCF */}
      <section className="bg-[#101A2C] text-white">
        <div className="container-page py-14 md:py-20">
          <p className="font-mono text-[0.75rem] font-bold uppercase tracking-[0.2em] text-[#59B3AD]">
            04 / Discounted cash flow
          </p>
          <h2 className="mt-2 text-4xl font-black uppercase tracking-[-0.05em]">
            Intrinsic value
          </h2>
          <p className="mt-3 max-w-2xl text-base leading-7 text-white/65">
            Each projected season becomes dollars and is discounted back to today
            at {(MODEL.scenarios.base.discount * 100).toFixed(1)}%. Seasons below
            replacement level count as zero, because a team can always sit a
            struggling player.
          </p>

          <div className="mt-8 grid gap-4 md:grid-cols-3">
            {(["bear", "base", "bull"] as ScenarioKey[]).map((key) => (
              <div
                key={key}
                className={`border-t-2 p-5 ${
                  key === "base"
                    ? "border-[#D85F46] bg-white/[0.07]"
                    : "border-white/20 bg-white/[0.03]"
                }`}
              >
                <p className="text-[0.75rem] font-bold uppercase tracking-[0.16em] text-[#59B3AD]">
                  {key} case · {(appraisal.dcf[key].discount * 100).toFixed(1)}% rate
                </p>
                <p className="mt-2 font-mono text-3xl font-bold">
                  {formatMoney(appraisal.dcf[key].totalPv)}
                </p>
                <p className="mt-1 text-sm text-white/55">
                  {formatMoney(appraisal.dcf[key].perSeason)} per season
                </p>
              </div>
            ))}
          </div>

          <div className="mt-8 overflow-x-auto">
            <table className="w-full min-w-[34rem] border-collapse">
              <thead>
                <tr className="border-b border-white/20 text-left">
                  {["Season", "Age", "Proj. WAR", "$ per WAR", "Value", "Present value"].map(
                    (heading, index) => (
                      <th
                        key={heading}
                        className={`px-3 py-3 text-[0.75rem] font-black uppercase tracking-[0.14em] text-[#59B3AD] ${
                          index >= 2 ? "text-right" : ""
                        }`}
                      >
                        {heading}
                      </th>
                    )
                  )}
                </tr>
              </thead>
              <tbody>
                {appraisal.dcf.base.rows.map((row) => (
                  <tr key={row.year} className="border-b border-white/10">
                    <td className="px-3 py-3 font-mono text-sm">{row.year}</td>
                    <td className="px-3 py-3 font-mono text-sm text-white/70">{row.age}</td>
                    <td className="px-3 py-3 text-right font-mono text-sm">{formatWar(row.war)}</td>
                    <td className="px-3 py-3 text-right font-mono text-sm text-white/70">
                      {formatMoney(row.price)}
                    </td>
                    <td className="px-3 py-3 text-right font-mono text-sm">{formatMoney(row.value)}</td>
                    <td className="px-3 py-3 text-right font-mono text-sm font-bold">
                      {formatMoney(row.pv)}
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr>
                  <td colSpan={5} className="px-3 py-3 text-sm font-bold text-[#59B3AD]">
                    Total present value (base case)
                  </td>
                  <td className="px-3 py-3 text-right font-mono text-base font-bold text-[#D85F46]">
                    {formatMoney(appraisal.dcf.base.totalPv)}
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>
      </section>

      {/* METHOD */}
      <section className="container-page py-14">
        <p className="font-mono text-[0.75rem] font-bold uppercase tracking-[0.2em] text-[#1F7A74]">
          05 / Method &amp; assumptions
        </p>
        <h2 className="mt-2 text-3xl font-black uppercase tracking-[-0.05em]">
          How to read this
        </h2>

        <div className="mt-6 grid gap-8 md:grid-cols-2">
          <ul className="space-y-3 text-base leading-7 text-[#687384]">
            <li>
              <strong className="text-[#1A2842]">WAR and salary.</strong> From
              Baseball-Reference where available, otherwise estimated from OPS
              or ERA, playing time and position.
            </li>
            <li>
              <strong className="text-[#1A2842]">Price of a win.</strong>{" "}
              {formatMoney(MODEL.dollarsPerWar)} per WAR, growing{" "}
              {(MODEL.dollarInflation * 100).toFixed(0)}% a year.
            </li>
            <li>
              <strong className="text-[#1A2842]">Projection.</strong> This
              season&apos;s rate is pulled toward an average regular, then aged
              year by year to age {MODEL.retireAge} (at most {MODEL.horizonCap}{" "}
              seasons).
            </li>
          </ul>

          <ul className="space-y-3 text-base leading-7 text-[#687384]">
            <li>
              <strong className="text-[#1A2842]">Fair value.</strong> A blend:{" "}
              {Math.round(MODEL.weights.dcf * 100)}% DCF,{" "}
              {Math.round(MODEL.weights.comps * 100)}% comps,{" "}
              {Math.round(MODEL.weights.precedent * 100)}% precedent contracts,{" "}
              {Math.round(MODEL.weights.forecast * 100)}% forecast,{" "}
              {Math.round(MODEL.weights.past * 100)}% past performance.
            </li>
            <li>
              <strong className="text-[#1A2842]">Verdict.</strong> Bargain if
              fair value is at least 25% above pay, overpaid if it is more than
              20% below.
            </li>
            <li>
              <strong className="text-[#1A2842]">Not advice.</strong> An
              estimate for analysis and entertainment. Injuries, role changes
              and contract terms can move real values a lot.
            </li>
          </ul>
        </div>
      </section>
    </main>
  );
}