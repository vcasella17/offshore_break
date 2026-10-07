import { ImageResponse } from "next/og";
import { getAppraisalPage } from "@/lib/appraisalPage";
import { formatMoney, formatWar } from "@/lib/appraisal";

/*
 * The card people see when an appraisal link is shared (1200 x 630).
 * Next.js serves it at /appraisal/<id>/opengraph-image and adds it to the
 * page's social-preview tags automatically.
 */
export const alt = "Offshore Break player appraisal";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";
export const revalidate = 3600;

const NAVY = "#101A2C";
const TEAL = "#59B3AD";
const CORAL = "#D85F46";
const GOLD = "#C99A2E";
const CREAM = "#F8F3EA";

const VERDICT = {
  bargain: { label: "Good value", bg: TEAL, fg: NAVY },
  fair: { label: "About right", bg: CREAM, fg: NAVY },
  overpaid: { label: "Paid above estimate", bg: CORAL, fg: "#FFFFFF" },
} as const;

const TRACK = 1072; // width of the value-range bar, in pixels

function brandBar() {
  return (
    <div
      style={{
        position: "absolute",
        left: 0,
        top: 0,
        width: 1200,
        height: 10,
        background: `linear-gradient(to right, ${CORAL}, ${TEAL}, #6287C7)`,
      }}
    />
  );
}

function fallbackCard(title: string, subtitle: string) {
  return (
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        flexDirection: "column",
        justifyContent: "center",
        background: NAVY,
        color: "white",
        padding: "0 80px",
        position: "relative",
      }}
    >
      {brandBar()}
      <div
        style={{
          display: "flex",
          fontSize: 26,
          fontWeight: 700,
          letterSpacing: 6,
          color: TEAL,
          textTransform: "uppercase",
        }}
      >
        Offshore Break / The Appraisal
      </div>
      <div
        style={{
          display: "flex",
          marginTop: 28,
          fontSize: 96,
          fontWeight: 900,
          letterSpacing: -3,
          lineHeight: 1,
          textTransform: "uppercase",
        }}
      >
        {title}
      </div>
      <div
        style={{
          display: "flex",
          marginTop: 28,
          fontSize: 34,
          color: "rgba(255,255,255,0.6)",
        }}
      >
        {subtitle}
      </div>
    </div>
  );
}

export default async function Image({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const playerId = Number(id);
  const data = Number.isInteger(playerId)
    ? await getAppraisalPage(playerId)
    : null;

  // no player or no stats yet: still give link previews something on-brand
  if (!data || !data.appraisal) {
    return new ImageResponse(
      fallbackCard(
        data?.player.name ?? "What he's worth.",
        data
          ? `No ${data.ctx.season} stats yet`
          : "What he's paid. Baseball, by the numbers.",
      ),
      { ...size },
    );
  }

  const { player, team, appraisal, ctx } = data;

  const verdict = appraisal.verdict ? VERDICT[appraisal.verdict] : null;
  const pay = appraisal.marketLine;
  const { low, mid, high } = appraisal.blended;

  /* the bar: estimated range, a tick at the middle, and a marker for his pay */
  const lo = Math.min(low, pay ?? low);
  const hi = Math.max(high, pay ?? high);
  const pad = (hi - lo) * 0.12 || Math.max(hi, 1) * 0.5;
  const min = lo - pad;
  const max = hi + pad;
  const x = (value: number) =>
    Math.round(((value - min) / (max - min)) * TRACK);

  // keep labels inside the bar's width
  const labelLeft = (value: number) =>
    Math.max(0, Math.min(TRACK - 170, x(value) - 85));

  const name = player.name;
  const nameSize =
    name.length <= 14 ? 104 : name.length <= 20 ? 84 : name.length <= 26 ? 66 : 48;

  const subline = [
    team?.name ?? "Free agent",
    player.position,
    `${formatWar(appraisal.estimate.war)} WAR in ${ctx.season}`,
  ]
    .filter(Boolean)
    .join("  ·  ");

  const surplus = appraisal.surplus;

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          background: NAVY,
          color: "white",
          padding: "52px 64px 44px",
          position: "relative",
        }}
      >
        {brandBar()}

        {/* top row */}
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            height: 52,
          }}
        >
          <div
            style={{
              display: "flex",
              fontSize: 24,
              fontWeight: 700,
              letterSpacing: 5,
              color: TEAL,
              textTransform: "uppercase",
            }}
          >
            Offshore Break / The Appraisal
          </div>

          {verdict && (
            <div
              style={{
                display: "flex",
                background: verdict.bg,
                color: verdict.fg,
                padding: "10px 22px",
                fontSize: 24,
                fontWeight: 900,
                letterSpacing: 3,
                textTransform: "uppercase",
              }}
            >
              {verdict.label}
            </div>
          )}
        </div>

        {/* name */}
        <div
          style={{
            display: "flex",
            marginTop: 34,
            fontSize: nameSize,
            fontWeight: 900,
            letterSpacing: -3,
            lineHeight: 1,
            textTransform: "uppercase",
          }}
        >
          {name}
        </div>

        <div
          style={{
            display: "flex",
            marginTop: 20,
            fontSize: 28,
            color: "rgba(255,255,255,0.6)",
          }}
        >
          {subline}
        </div>

        {/* three headline numbers */}
        <div style={{ display: "flex", marginTop: 34 }}>
          <div style={{ display: "flex", flexDirection: "column", width: 370 }}>
            <div
              style={{
                display: "flex",
                fontSize: 20,
                fontWeight: 700,
                letterSpacing: 4,
                color: TEAL,
                textTransform: "uppercase",
              }}
            >
              Estimated value
            </div>
            <div style={{ display: "flex", fontSize: 66, fontWeight: 900 }}>
              {formatMoney(mid)}
            </div>
          </div>

          <div style={{ display: "flex", flexDirection: "column", width: 370 }}>
            <div
              style={{
                display: "flex",
                fontSize: 20,
                fontWeight: 700,
                letterSpacing: 4,
                color: TEAL,
                textTransform: "uppercase",
              }}
            >
              {appraisal.marketSource === "contract" ? "Contract" : "Salary"}
            </div>
            <div style={{ display: "flex", fontSize: 66, fontWeight: 900 }}>
              {pay !== null ? formatMoney(pay) : "—"}
            </div>
          </div>

          <div style={{ display: "flex", flexDirection: "column" }}>
            <div
              style={{
                display: "flex",
                fontSize: 20,
                fontWeight: 700,
                letterSpacing: 4,
                color: TEAL,
                textTransform: "uppercase",
              }}
            >
              Versus pay
            </div>
            <div
              style={{
                display: "flex",
                fontSize: 66,
                fontWeight: 900,
                color: surplus === null ? "white" : surplus >= 0 ? TEAL : CORAL,
              }}
            >
              {surplus === null
                ? "—"
                : `${surplus >= 0 ? "+" : "−"}${formatMoney(Math.abs(surplus))}`}
            </div>
          </div>
        </div>

        {/* value range bar */}
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            marginTop: "auto",
            position: "relative",
            width: TRACK,
            height: 118,
          }}
        >
          {/* pay marker + label (above the bar) */}
          {pay !== null && (
            <div
              style={{
                position: "absolute",
                left: labelLeft(pay),
                top: 0,
                width: 170,
                display: "flex",
                justifyContent: "center",
                fontSize: 22,
                fontWeight: 900,
                letterSpacing: 2,
                color: CORAL,
                textTransform: "uppercase",
              }}
            >
              {`Pay ${formatMoney(pay)}`}
            </div>
          )}

          <div
            style={{
              position: "absolute",
              left: 0,
              top: 40,
              width: TRACK,
              height: 22,
              background: "rgba(255,255,255,0.12)",
              display: "flex",
            }}
          />
          <div
            style={{
              position: "absolute",
              left: x(low),
              top: 40,
              width: Math.max(4, x(high) - x(low)),
              height: 22,
              background: GOLD,
              display: "flex",
            }}
          />
          <div
            style={{
              position: "absolute",
              left: x(mid) - 2,
              top: 40,
              width: 4,
              height: 22,
              background: "white",
              display: "flex",
            }}
          />
          {pay !== null && (
            <div
              style={{
                position: "absolute",
                left: x(pay) - 3,
                top: 30,
                width: 6,
                height: 42,
                background: CORAL,
                display: "flex",
              }}
            />
          )}

          {/* range labels (below the bar) */}
          <div
            style={{
              position: "absolute",
              left: labelLeft(low),
              top: 76,
              width: 170,
              display: "flex",
              justifyContent: "center",
              fontSize: 22,
              color: "rgba(255,255,255,0.65)",
            }}
          >
            {formatMoney(low)}
          </div>
          <div
            style={{
              position: "absolute",
              left: labelLeft(high),
              top: 76,
              width: 170,
              display: "flex",
              justifyContent: "center",
              fontSize: 22,
              color: "rgba(255,255,255,0.65)",
            }}
          >
            {formatMoney(high)}
          </div>
        </div>

        {/* footer */}
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            marginTop: 10,
            fontSize: 18,
            letterSpacing: 4,
            color: "rgba(255,255,255,0.4)",
            textTransform: "uppercase",
          }}
        >
          <div style={{ display: "flex" }}>
            Estimated value range, per season
          </div>
          <div style={{ display: "flex" }}>Baseball, by the numbers</div>
        </div>
      </div>
    ),
    { ...size },
  );
}
