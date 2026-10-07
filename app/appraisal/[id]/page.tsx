import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import FootballField, { type FieldRowData } from "@/components/FootballField";
import { formatInnings, headshotSilo, teamLogo } from "@/lib/baseball";
import { getAppraisalPage } from "@/lib/appraisalPage";
import {
  MODEL,
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
    label: "Good value",
    color: "#1F7A74",
    line: "His production is worth more than his pay.",
  },
  fair: {
    label: "About right",
    color: "#1A2842",
    line: "His pay is close to his estimated value.",
  },
  overpaid: {
    label: "Paying more than the estimate",
    color: "#D85F46",
    line: "His pay is higher than his estimated production value.",
  },
};

/* ───────────────────────── Page title + share preview ───────────────────────── */

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  const playerId = Number(id);

  if (!Number.isInteger(playerId)) return { title: "Appraisal not found" };

  const data = await getAppraisalPage(playerId);
  if (!data) return { title: "Appraisal not found" };

  const { player, appraisal } = data;
  const title = `${player.name} appraisal`;

  const description = appraisal
    ? `${player.name} is worth an estimated ${formatMoney(appraisal.blended.mid)} a season${
        appraisal.marketLine !== null
          ? ` against ${formatMoney(appraisal.marketLine)} in pay`
          : ""
      }. See comparable players, projected value and the full range on Offshore Break.`
    : `What is ${player.name} worth, and what is he paid? An Offshore Break appraisal.`;

  return {
    title,
    description,
    openGraph: { title, description, type: "website" },
    twitter: { card: "summary_large_image", title, description },
  };
}

function slugify(text: string) {
  return text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

/* ───────────────────────── Components ───────────────────────── */

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

/* ───────────────────────── Page ───────────────────────── */

export default async function AppraisalPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const playerId = Number(id);
  if (!Number.isInteger(playerId)) notFound();

  const data = await getAppraisalPage(playerId);
  if (!data) notFound();

  const { ctx, player, team, appraisal } = data;

  if (!appraisal) {
    return (
      <div className="bg-[#F8F3EA] text-[#1A2842]">
        <div className="container-page py-20">
          <p className="font-mono text-[0.75rem] font-bold uppercase tracking-[0.2em] text-[#1F7A74]">
            What&apos;s he worth?
          </p>
          <h1 className="mt-3 text-4xl font-black">
            No {ctx.season} stats for {player.name}
          </h1>
          <p className="mt-3 max-w-xl text-base leading-7 text-[#687384]">
            We need season stats to estimate his value. Try a player who
            appeared in {ctx.season}.
          </p>
          <Link
            href="/appraisal"
            className="mt-6 inline-block font-semibold text-[#D85F46]"
          >
            ← Back to player search
          </Link>
        </div>
      </div>
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
    <div className="bg-[#F8F3EA] text-[#1A2842]">
      {/* HEADER */}
      <section className="paper-grid border-b border-[#1A2842]/15">
        <div className="container-page py-10 md:py-14">
          <div className="mb-5 flex items-center gap-3">
            <span className="h-[2px] w-10 bg-[#D85F46]" />
            <Link
              href="/appraisal"
              className="font-mono text-[0.75rem] font-bold uppercase tracking-[0.22em] text-[#1F7A74] hover:text-[#D85F46]"
            >
              What&apos;s he worth?
            </Link>
          </div>

          <div className="relative flex min-h-[11rem] items-center overflow-hidden border border-[#1A2842]/15 bg-white p-6 md:p-8">
            <div className="relative z-10 max-w-[65%]">
              <div className="flex items-center gap-3">
                {team && (
                  // eslint-disable-next-line @next/next/no-img-element
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

            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={headshotSilo(player.id)}
              alt=""
              aria-hidden="true"
              className="pointer-events-none absolute bottom-0 right-4 h-[115%] w-auto object-contain"
            />
          </div>

          {/* the same card people see when this page is shared */}
          <div className="mt-4 flex justify-end">
            <a
              href={`/appraisal/${player.id}/opengraph-image`}
              download={`${slugify(player.name)}-appraisal.png`}
              className="border border-[#1A2842]/20 bg-white px-4 py-2 font-mono text-[0.7rem] font-bold uppercase tracking-[0.16em] text-[#1F7A74] transition hover:border-[#D85F46] hover:text-[#D85F46]"
            >
              Save share card ↓
            </a>
          </div>
        </div>
      </section>

      {/* NOTICES */}
      {(!ctx.warAvailable || appraisal.warSource === "estimated") && (
        <section className="container-page pt-6">
          <p className="border-l-4 border-[#C99A2E] bg-white px-5 py-4 text-sm leading-6 text-[#687384]">
            {ctx.warAvailable
              ? "WAR for this player isn't in the database yet, so we're estimating it from his stats."
              : "WAR and salary data haven't been added yet. This page uses estimates and may not show his salary."}
          </p>
        </section>
      )}

      {/* VERDICT */}
      {verdict &&
        appraisal.surplus !== null &&
        appraisal.marketLine !== null && (
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
                  The quick take
                </p>
                <p className="mt-1 text-4xl font-black uppercase tracking-[-0.04em]">
                  {verdict.label}
                </p>
                <p className="mt-1 text-base text-[#687384]">{verdict.line}</p>
              </div>

              <div className="md:text-right">
                <p
                  className="font-mono text-4xl font-bold"
                  style={{ color: verdict.color }}
                >
                  {appraisal.surplus >= 0 ? "+" : "−"}
                  {formatMoney(Math.abs(appraisal.surplus))}
                </p>
                <p className="mt-1 text-sm text-[#687384]">
                  estimated value above or below pay, per season
                </p>
              </div>
            </div>

            {appraisal.earlyCareer && (
              <p className="mt-3 text-sm leading-6 text-[#687384]">
                He&apos;s paid near the league minimum, which is common early in
                a career. Teams have more control over young players&apos; pay,
                so this estimate shows what his production might be worth on
                the open market—not what he can necessarily ask for today.
              </p>
            )}
          </section>
        )}

      {/* SUMMARY */}
      <section className="container-page py-8">
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <SummaryCard
            label="Estimated value"
            value={formatMoney(appraisal.blended.mid)}
            caption={`Per season. Estimated range: ${formatMoney(appraisal.blended.low)} to ${formatMoney(appraisal.blended.high)}.`}
            accent={TONE_COLOR.gold}
          />
          <SummaryCard
            label={
              appraisal.marketSource === "contract"
                ? "Contract"
                : "This year's salary"
            }
            value={
              appraisal.marketLine !== null
                ? formatMoney(appraisal.marketLine)
                : "—"
            }
            caption={
              appraisal.marketSource === "contract" && appraisal.contract
                ? `${appraisal.contract.years} years left on the contract.`
                : appraisal.marketLine !== null
                  ? `${ctx.season} salary.`
                  : "Salary data isn't available for this player yet."
            }
            accent={TONE_COLOR.coral}
          />
          <SummaryCard
            label="Projected career value"
            value={formatMoney(appraisal.dcf.base.totalPv)}
            caption={`Today's value of ${appraisal.dcf.base.rows.length} projected seasons.`}
            accent={TONE_COLOR.navy}
          />
          <SummaryCard
            label="Value of this season"
            value={formatMoney(appraisal.current.mid)}
            caption={`${ctx.season} WAR valued at about ${formatMoney(MODEL.dollarsPerWar)} per win.`}
            accent={TONE_COLOR.teal}
          />
        </div>

        {appraisal.contract &&
          appraisal.contractPvValue !== null &&
          appraisal.contractDcf !== null && (
            <div className="mt-4 border-l-4 border-[#D85F46] bg-white p-6">
              <p className="font-mono text-[0.75rem] font-bold uppercase tracking-[0.18em] text-[#D85F46]">
                Contract compared with projected value
              </p>
              <p className="mt-2 text-lg leading-8">
                His contract is {formatMoney(appraisal.contract.aav)} a year for{" "}
                {appraisal.contract.years} years. In today&apos;s dollars,
                that&apos;s worth {formatMoney(appraisal.contractPvValue)}. His
                projected production over those same seasons is estimated at{" "}
                <strong>{formatMoney(appraisal.contractDcf)}</strong>.{" "}
                {appraisal.contractDcf >= appraisal.contractPvValue ? (
                  <span className="font-bold text-[#1F7A74]">
                    That&apos;s an estimated surplus of{" "}
                    {formatMoney(
                      appraisal.contractDcf - appraisal.contractPvValue,
                    )}
                    .
                  </span>
                ) : (
                  <span className="font-bold text-[#D85F46]">
                    That&apos;s an estimated shortfall of{" "}
                    {formatMoney(
                      appraisal.contractPvValue - appraisal.contractDcf,
                    )}
                    .
                  </span>
                )}
              </p>
              {appraisal.contract.note && (
                <p className="mt-2 text-sm text-[#687384]">
                  {appraisal.contract.note}
                </p>
              )}
            </div>
          )}
      </section>

      {/* VALUE RANGE */}
      <section className="container-page pb-14">
        <div className="mb-5">
          <p className="font-mono text-[0.75rem] font-bold uppercase tracking-[0.2em] text-[#1F7A74]">
            01 / Value range
          </p>
          <h2 className="mt-2 text-4xl font-black uppercase tracking-[-0.05em]">
            What the numbers say
          </h2>
          <p className="mt-2 max-w-2xl text-base leading-7 text-[#687384]">
            Each estimate is shown as a range because no single number tells
            the whole story. The dashed line marks his pay.
          </p>
        </div>

        <FootballField rows={fieldRows} marker={marker} />
      </section>

      {/* COMPARABLE PLAYERS */}
      <section className="container-page pb-14">
        <div className="mb-5">
          <p className="font-mono text-[0.75rem] font-bold uppercase tracking-[0.2em] text-[#1F7A74]">
            02 / Comparable players
          </p>
          <h2 className="mt-2 text-4xl font-black uppercase tracking-[-0.05em]">
            Comparable players
          </h2>
          <p className="mt-2 max-w-2xl text-base leading-7 text-[#687384]">
            These players had similar stats and playing time. The match score
            shows how closely their numbers line up. We leave out very small
            salaries because early-career pay usually isn&apos;t a good guide to
            a player&apos;s market value.{" "}
            {isPitcher
              ? "Pitchers are matched using ERA, WHIP, strikeouts and walks per nine, and workload."
              : "Hitters are matched using OPS, batting average, power, walks, strikeouts, and playing time."}
          </p>
        </div>

        {appraisal.comps.length > 0 ? (
          <div className="overflow-x-auto border-t-2 border-[#1A2842] bg-white">
            <table className="w-full min-w-[44rem] border-collapse">
              <thead>
                <tr className="border-b border-[#1A2842]/20 text-left">
                  {[
                    "Comparable",
                    "Team",
                    "Pos",
                    "Match",
                    "WAR",
                    "Value this season",
                    "Salary",
                  ].map((heading, index) => (
                    <th
                      key={heading}
                      className={`px-4 py-4 text-[0.75rem] font-black uppercase tracking-[0.14em] text-[#1F7A74] ${
                        index >= 3 ? "text-right" : ""
                      }`}
                    >
                      {heading}
                    </th>
                  ))}
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
                          // eslint-disable-next-line @next/next/no-img-element
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
                      {comp.payload.salary != null
                        ? formatMoney(comp.payload.salary)
                        : "—"}
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
                    {appraisal.salary != null
                      ? formatMoney(appraisal.salary)
                      : "—"}
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>
        ) : (
          <div className="border-t-2 border-[#1A2842] bg-white px-6 py-10 text-base text-[#687384]">
            We couldn&apos;t find enough similar players.
          </div>
        )}
      </section>

      {/* TRACK RECORD */}
      {appraisal.history.length > 0 && (
        <section className="container-page pb-14">
          <div className="mb-5">
            <p className="font-mono text-[0.75rem] font-bold uppercase tracking-[0.2em] text-[#1F7A74]">
              03 / Past seasons
            </p>
            <h2 className="mt-2 text-4xl font-black uppercase tracking-[-0.05em]">
              Year by year
            </h2>
          </div>

          <div className="overflow-x-auto border-t-2 border-[#1A2842] bg-white">
            <table className="w-full min-w-[28rem] border-collapse">
              <thead>
                <tr className="border-b border-[#1A2842]/20 text-left">
                  {["Season", "WAR", "Value that season", "Salary"].map(
                    (heading, index) => (
                      <th
                        key={heading}
                        className={`px-4 py-4 text-[0.75rem] font-black uppercase tracking-[0.14em] text-[#1F7A74] ${
                          index >= 1 ? "text-right" : ""
                        }`}
                      >
                        {heading}
                      </th>
                    ),
                  )}
                </tr>
              </thead>
              <tbody>
                {appraisal.history.map((row) => (
                  <tr key={row.season} className="border-b border-[#1A2842]/10">
                    <td className="px-4 py-3 font-mono text-sm font-bold">
                      {row.season}
                    </td>
                    <td className="px-4 py-3 text-right font-mono text-sm">
                      {formatWar(row.war)}
                    </td>
                    <td className="px-4 py-3 text-right font-mono text-sm">
                      {formatMoney(row.value)}
                    </td>
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

      {/* LOOKING AHEAD */}
      <section className="bg-[#101A2C] text-white">
        <div className="container-page py-14 md:py-20">
          <p className="font-mono text-[0.75rem] font-bold uppercase tracking-[0.2em] text-[#59B3AD]">
            04 / Looking ahead
          </p>
          <h2 className="mt-2 text-4xl font-black uppercase tracking-[-0.05em]">
            Projected value
          </h2>
          <p className="mt-3 max-w-2xl text-base leading-7 text-white/65">
            We estimate what his future seasons could be worth, then convert
            those amounts into today&apos;s dollars using a{" "}
            {(MODEL.scenarios.base.discount * 100).toFixed(1)}% discount rate.
            Seasons below replacement level count as zero in this estimate.
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
                  {key === "bear"
                    ? "Lower estimate"
                    : key === "base"
                      ? "Middle estimate"
                      : "Higher estimate"}{" "}
                  · {(appraisal.dcf[key].discount * 100).toFixed(1)}% rate
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
                  {[
                    "Season",
                    "Age",
                    "Projected WAR",
                    "Dollars per WAR",
                    "Season value",
                    "Value in today's dollars",
                  ].map((heading, index) => (
                    <th
                      key={heading}
                      className={`px-3 py-3 text-[0.75rem] font-black uppercase tracking-[0.14em] text-[#59B3AD] ${
                        index >= 2 ? "text-right" : ""
                      }`}
                    >
                      {heading}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {appraisal.dcf.base.rows.map((row) => (
                  <tr key={row.year} className="border-b border-white/10">
                    <td className="px-3 py-3 font-mono text-sm">{row.year}</td>
                    <td className="px-3 py-3 font-mono text-sm text-white/70">
                      {row.age}
                    </td>
                    <td className="px-3 py-3 text-right font-mono text-sm">
                      {formatWar(row.war)}
                    </td>
                    <td className="px-3 py-3 text-right font-mono text-sm text-white/70">
                      {formatMoney(row.price)}
                    </td>
                    <td className="px-3 py-3 text-right font-mono text-sm">
                      {formatMoney(row.value)}
                    </td>
                    <td className="px-3 py-3 text-right font-mono text-sm font-bold">
                      {formatMoney(row.pv)}
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr>
                  <td
                    colSpan={5}
                    className="px-3 py-3 text-sm font-bold text-[#59B3AD]"
                  >
                    Total projected value (middle estimate)
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
          05 / How we came up with this
        </p>
        <h2 className="mt-2 text-3xl font-black uppercase tracking-[-0.05em]">
          How to read these numbers
        </h2>

        <div className="mt-6 grid gap-8 md:grid-cols-2">
          <ul className="space-y-3 text-base leading-7 text-[#687384]">
            <li>
              <strong className="text-[#1A2842]">WAR and salary.</strong>{" "}
              WAR and salary come from the available data. If WAR is missing,
              we estimate it using stats, playing time, and position.
            </li>
            <li>
              <strong className="text-[#1A2842]">Value of a win.</strong>{" "}
              We use about {formatMoney(MODEL.dollarsPerWar)} per WAR, increasing
              by {(MODEL.dollarInflation * 100).toFixed(0)}% each year.
            </li>
            <li>
              <strong className="text-[#1A2842]">Future seasons.</strong> We
              start with this season&apos;s performance, pull it toward an
              average regular, and adjust for age each year through age{" "}
              {MODEL.retireAge}—up to {MODEL.horizonCap} seasons.
            </li>
          </ul>

          <ul className="space-y-3 text-base leading-7 text-[#687384]">
            <li>
              <strong className="text-[#1A2842]">Estimated value.</strong> We
              combine projected value, similar players, past contracts, future
              estimates, and past performance. Each gets a different weight.
            </li>
            <li>
              <strong className="text-[#1A2842]">The quick take.</strong> We
              call it good value when the estimate is at least 25% above pay,
              and paying more than the estimate when it&apos;s over 20% below.
            </li>
            <li>
              <strong className="text-[#1A2842]">Keep in mind.</strong> This is
              an estimate, not a prediction or contract advice. Injuries, role
              changes, and contract details can change a player&apos;s value a
              lot.
            </li>
          </ul>
        </div>
      </section>
    </div>
  );
}
