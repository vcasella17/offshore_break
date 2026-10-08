"use client";

import { useEffect, useMemo, useState } from "react";

type SprayEvent = {
  id: string;
  gamePk: number;
  gameDate: string | null;
  homeTeam: string | null;
  awayTeam: string | null;
  event: "single" | "double" | "triple" | "home_run";
  bbType: string | null;
  launchSpeed: number | null;
  launchAngle: number | null;
  hitDistance: number | null;
  hcX: number;
  hcY: number;
  isHomeRun: boolean;
};

type SprayChartProps = {
  playerId: number;
  playerName: string;
  season?: number;
  homeTeam?: string | null;
  stadiumName?: string | null;
  teamColor?: string;
  compact?: boolean;
};

type FilterType = "all" | "single" | "double" | "triple" | "home_run";

const FILTERS: { key: FilterType; label: string }[] = [
  { key: "all", label: "All" },
  { key: "single", label: "1B" },
  { key: "double", label: "2B" },
  { key: "triple", label: "3B" },
  { key: "home_run", label: "HR" },
];

const EVENT_LABELS: Record<FilterType, string> = {
  all: "Hits",
  single: "Singles",
  double: "Doubles",
  triple: "Triples",
  home_run: "Home Runs",
};

const EVENT_COLORS: Record<
  "single" | "double" | "triple" | "home_run",
  string
> = {
  single: "#59B3AD",
  double: "#6287C7",
  triple: "#D8A84E",
  home_run: "#D85F46",
};

function formatDate(date: string | null) {
  if (!date) return "Unknown date";

  const parsed = new Date(`${date}T12:00:00`);

  if (Number.isNaN(parsed.getTime())) {
    return date;
  }

  return parsed.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function formatNumber(value: number | null, decimals = 0) {
  if (value === null || !Number.isFinite(value)) {
    return "—";
  }

  return value.toFixed(decimals);
}

/*
 * Statcast's raw hc_x / hc_y coordinates are centered around
 * approximately:
 *
 *   Home plate X = 125.42
 *   Home plate Y = 198.27
 *
 * We first convert them into approximate baseball-field coordinates.
 *
 * x:
 *   negative = left field
 *   positive = right field
 *
 * y:
 *   positive = toward the outfield
 */
function transformCoordinates(hcX: number, hcY: number) {
  return {
    x: 2.5 * (hcX - 125.42),
    y: 2.5 * (198.27 - hcY),
  };
}

/*
 * Convert field coordinates into our SVG viewBox.
 *
 * The SVG uses:
 *
 *   0,0 = top-left
 *   700,700 = bottom-right
 *
 * Home plate sits around:
 *
 *   x = 350
 *   y = 635
 */
function toSvgPosition(hcX: number, hcY: number) {
  const { x, y } = transformCoordinates(hcX, hcY);

  const svgX = 350 + x * 0.72;
  const svgY = 635 - y * 0.72;

  return {
    x: Math.max(35, Math.min(665, svgX)),
    y: Math.max(30, Math.min(650, svgY)),
  };
}

function eventLabel(event: SprayEvent["event"]) {
  switch (event) {
    case "single":
      return "Single";
    case "double":
      return "Double";
    case "triple":
      return "Triple";
    case "home_run":
      return "Home Run";
  }
}

function FieldBackground() {
  return (
    <>
      {/* Outfield grass */}
      <path
        d="M 112 400 A 338 338 0 0 1 588 400 L 350 635 Z"
        fill="#17372F"
        opacity="0.92"
      />

      {/* Warning track */}
      <path
        d="M 94 400 A 356 356 0 0 1 606 400"
        fill="none"
        stroke="#C9BCA8"
        strokeWidth="13"
        opacity="0.45"
      />

      {/* Foul lines */}
      <line
        x1="350"
        y1="635"
        x2="75"
        y2="365"
        stroke="#F8F3EA"
        strokeWidth="3"
        opacity="0.75"
      />

      <line
        x1="350"
        y1="635"
        x2="625"
        y2="365"
        stroke="#F8F3EA"
        strokeWidth="3"
        opacity="0.75"
      />

      {/* Infield dirt */}
      <path
        d="M 350 535
           L 446 631
           L 350 727
           L 254 631
           Z"
        fill="#8B5E3C"
        opacity="0.95"
      />

      {/* Infield grass */}
      <path
        d="M 350 548
           L 433 631
           L 350 714
           L 267 631
           Z"
        fill="#245A46"
        opacity="0.95"
      />

      {/* Base paths */}
      <line
        x1="350"
        y1="635"
        x2="350"
        y2="553"
        stroke="#F8F3EA"
        strokeWidth="2"
        opacity="0.7"
      />

      <line
        x1="350"
        y1="553"
        x2="432"
        y2="635"
        stroke="#F8F3EA"
        strokeWidth="2"
        opacity="0.7"
      />

      <line
        x1="432"
        y1="635"
        x2="350"
        y2="717"
        stroke="#F8F3EA"
        strokeWidth="2"
        opacity="0.7"
      />

      <line
        x1="350"
        y1="717"
        x2="268"
        y2="635"
        stroke="#F8F3EA"
        strokeWidth="2"
        opacity="0.7"
      />

      {/* Pitcher's mound */}
      <circle
        cx="350"
        cy="620"
        r="17"
        fill="#9B6B47"
        opacity="0.95"
      />

      <circle
        cx="350"
        cy="620"
        r="5"
        fill="#F8F3EA"
        opacity="0.75"
      />

      {/* Bases */}
      <rect
        x="344"
        y="547"
        width="12"
        height="12"
        transform="rotate(45 350 553)"
        fill="#F8F3EA"
      />

      <rect
        x="426"
        y="629"
        width="12"
        height="12"
        transform="rotate(45 432 635)"
        fill="#F8F3EA"
      />

      <rect
        x="344"
        y="711"
        width="12"
        height="12"
        transform="rotate(45 350 717)"
        fill="#F8F3EA"
      />

      <rect
        x="262"
        y="629"
        width="12"
        height="12"
        transform="rotate(45 268 635)"
        fill="#F8F3EA"
      />

      {/* Home plate */}
      <path
        d="M 338 635 L 362 635 L 362 648 L 350 659 L 338 648 Z"
        fill="#F8F3EA"
      />

      {/* Center field marker */}
      <text
        x="350"
        y="326"
        textAnchor="middle"
        fill="#F8F3EA"
        opacity="0.28"
        fontSize="9"
        fontWeight="700"
        letterSpacing="2"
      >
        CENTER
      </text>
    </>
  );
}

export default function SprayChart({
  playerId,
  playerName,
  season = 2026,
  homeTeam = null,
  stadiumName = null,
  teamColor = "#D85F46",
  compact = false,
}: SprayChartProps) {
  const [events, setEvents] = useState<SprayEvent[]>([]);
  const [filter, setFilter] = useState<FilterType>("all");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedEvent, setSelectedEvent] =
    useState<SprayEvent | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function loadSprayChart() {
      setLoading(true);
      setError(null);

      try {
        const params = new URLSearchParams({
          playerId: String(playerId),
          season: String(season),
        });

        if (homeTeam) {
          params.set("homeTeam", homeTeam);
        }

        const response = await fetch(
          `/api/spray-chart?${params.toString()}`,
          {
            cache: "no-store",
          }
        );

        const payload = await response.json();

        if (!response.ok) {
          throw new Error(
            payload?.error ?? "Unable to load spray chart."
          );
        }

        if (!cancelled) {
          setEvents(payload.events ?? []);
        }
      } catch (err) {
        if (!cancelled) {
          setError(
            err instanceof Error
              ? err.message
              : "Unable to load spray chart."
          );
          setEvents([]);
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    loadSprayChart();

    return () => {
      cancelled = true;
    };
  }, [playerId, season, homeTeam]);

  const filteredEvents = useMemo(() => {
    if (filter === "all") {
      return events;
    }

    return events.filter((event) => event.event === filter);
  }, [events, filter]);

  const counts = useMemo(() => {
    return {
      all: events.length,
      single: events.filter((event) => event.event === "single").length,
      double: events.filter((event) => event.event === "double").length,
      triple: events.filter((event) => event.event === "triple").length,
      home_run: events.filter((event) => event.event === "home_run").length,
    };
  }, [events]);

  const title = stadiumName
    ? `${season} Home Hits`
    : `${season} Spray Chart`;

  const subtitle = stadiumName
    ? `${playerName} at ${stadiumName}`
    : `${playerName} • Hits in play`;

  return (
    <section className="overflow-hidden border border-[#1A2842]/15 bg-[#101A2C] text-white">
      {/* Header */}
      <div className="border-b border-white/10 px-6 py-6 md:px-8">
        <div className="flex flex-col gap-5 md:flex-row md:items-end md:justify-between">
          <div>
            <p
              className="text-[9px] font-black uppercase tracking-[0.22em]"
              style={{ color: teamColor }}
            >
              Batted Ball Data
            </p>

            <h2 className="mt-2 text-2xl font-black tracking-[-0.04em] md:text-3xl">
              {title}
            </h2>

            <p className="mt-2 text-xs text-white/35">
              {subtitle}
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            {FILTERS.map((item) => {
              const active = filter === item.key;

              return (
                <button
                  key={item.key}
                  type="button"
                  onClick={() => setFilter(item.key)}
                  className={`border px-3 py-2 text-[8px] font-black uppercase tracking-[0.15em] transition ${
                    active
                      ? "border-[#D85F46] bg-[#D85F46] text-white"
                      : "border-white/10 bg-white/[0.03] text-white/40 hover:border-white/25 hover:text-white"
                  }`}
                >
                  {item.label}
                  <span className="ml-2 opacity-50">
                    {counts[item.key]}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Chart */}
      <div className="grid lg:grid-cols-[1fr_260px]">
        <div className="relative flex min-h-[560px] items-center justify-center bg-[#0B1423] p-5 md:p-8">
          {loading && (
            <div className="absolute inset-0 z-20 flex items-center justify-center bg-[#0B1423]/90">
              <div className="text-center">
                <div className="mx-auto h-8 w-8 animate-spin rounded-full border-2 border-white/10 border-t-[#D85F46]" />

                <p className="mt-4 text-[9px] font-black uppercase tracking-[0.2em] text-white/35">
                  Loading Statcast
                </p>
              </div>
            </div>
          )}

          {error && !loading && (
            <div className="absolute inset-0 z-20 flex items-center justify-center p-8">
              <div className="max-w-md border border-[#D85F46]/30 bg-[#D85F46]/10 p-6 text-center">
                <p className="text-[9px] font-black uppercase tracking-[0.2em] text-[#D85F46]">
                  Spray Chart Error
                </p>

                <p className="mt-3 text-xs leading-5 text-white/50">
                  {error}
                </p>
              </div>
            </div>
          )}

          {!loading && !error && filteredEvents.length === 0 && (
            <div className="absolute inset-0 z-10 flex items-center justify-center">
              <div className="text-center">
                <p className="font-mono text-4xl font-black text-white/15">
                  0
                </p>

                <p className="mt-2 text-[9px] font-black uppercase tracking-[0.2em] text-white/25">
                  {EVENT_LABELS[filter]}
                </p>
              </div>
            </div>
          )}

          <div
            className="relative w-full"
            style={{
              maxWidth: compact ? 600 : 720,
            }}
          >
            <svg
              viewBox="0 0 700 700"
              className="h-auto w-full overflow-visible"
              role="img"
              aria-label={`${season} ${playerName} spray chart`}
            >
              <FieldBackground />

              {/* Hit points */}
              {filteredEvents.map((event) => {
                const position = toSvgPosition(
                  event.hcX,
                  event.hcY
                );

                const isHR = event.event === "home_run";

                return (
                  <g
                    key={event.id}
                    onMouseEnter={() => setSelectedEvent(event)}
                    onMouseLeave={() => setSelectedEvent(null)}
                    onClick={() => setSelectedEvent(event)}
                    style={{ cursor: "pointer" }}
                  >
                    {isHR && (
                      <circle
                        cx={position.x}
                        cy={position.y}
                        r="9"
                        fill={EVENT_COLORS.home_run}
                        opacity="0.18"
                      />
                    )}

                    <circle
                      cx={position.x}
                      cy={position.y}
                      r={isHR ? 5.5 : 4}
                      fill={
                        isHR
                          ? EVENT_COLORS.home_run
                          : EVENT_COLORS[event.event]
                      }
                      stroke="#F8F3EA"
                      strokeWidth="1.5"
                      opacity="0.9"
                    />
                  </g>
                );
              })}
            </svg>

            {/* Hover card */}
            {selectedEvent && (
              <div className="pointer-events-none absolute left-1/2 top-3 z-30 w-[230px] -translate-x-1/2 border border-white/10 bg-[#101A2C]/95 p-4 shadow-2xl backdrop-blur">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p
                      className="text-[8px] font-black uppercase tracking-[0.18em]"
                      style={{
                        color:
                          EVENT_COLORS[selectedEvent.event],
                      }}
                    >
                      {eventLabel(selectedEvent.event)}
                    </p>

                    <p className="mt-1 text-sm font-black">
                      {formatDate(selectedEvent.gameDate)}
                    </p>
                  </div>

                  <span className="font-mono text-[8px] text-white/25">
                    #{selectedEvent.gamePk}
                  </span>
                </div>

                <div className="mt-4 grid grid-cols-3 border-t border-white/10 pt-3">
                  <div>
                    <p className="font-mono text-sm font-black">
                      {formatNumber(selectedEvent.launchSpeed, 1)}
                    </p>
                    <p className="mt-1 text-[7px] font-black uppercase tracking-widest text-white/25">
                      EV
                    </p>
                  </div>

                  <div>
                    <p className="font-mono text-sm font-black">
                      {formatNumber(selectedEvent.launchAngle, 0)}°
                    </p>
                    <p className="mt-1 text-[7px] font-black uppercase tracking-widest text-white/25">
                      LA
                    </p>
                  </div>

                  <div>
                    <p className="font-mono text-sm font-black">
                      {formatNumber(selectedEvent.hitDistance, 0)}
                    </p>
                    <p className="mt-1 text-[7px] font-black uppercase tracking-widest text-white/25">
                      FT
                    </p>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Side rail */}
        <div className="border-t border-white/10 bg-[#101A2C] lg:border-l lg:border-t-0">
          <div className="p-6 md:p-7">
            <p className="text-[8px] font-black uppercase tracking-[0.2em] text-white/25">
              {stadiumName ? "Ballpark Context" : "Hit Distribution"}
            </p>

            <div className="mt-5 space-y-1">
              {(
                [
                  ["single", "Singles"],
                  ["double", "Doubles"],
                  ["triple", "Triples"],
                  ["home_run", "Home Runs"],
                ] as const
              ).map(([key, label]) => (
                <div
                  key={key}
                  className="flex items-center justify-between border-b border-white/10 py-3"
                >
                  <div className="flex items-center gap-3">
                    <span
                      className="h-2 w-2 rounded-full"
                      style={{
                        backgroundColor: EVENT_COLORS[key],
                      }}
                    />

                    <span className="text-[9px] font-black uppercase tracking-[0.14em] text-white/45">
                      {label}
                    </span>
                  </div>

                  <span className="font-mono text-sm font-black">
                    {counts[key]}
                  </span>
                </div>
              ))}
            </div>

            <div className="mt-7 border-t border-white/10 pt-5">
              <p className="text-[8px] font-black uppercase tracking-[0.18em] text-white/25">
                Total Hits
              </p>

              <p
                className="mt-2 font-mono text-5xl font-black"
                style={{ color: teamColor }}
              >
                {filteredEvents.length}
              </p>
            </div>

            <div className="mt-7 border-t border-white/10 pt-5">
              <p className="text-[8px] leading-5 text-white/25">
                Location is derived from Statcast hit coordinates. Hover
                over a point to inspect the individual batted-ball event.
              </p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}