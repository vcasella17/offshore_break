import { formatMoney, type Range } from "@/lib/appraisal";

export type FieldRowData = {
  key: string;
  label: string;
  sub: string;
  range: Range;
  color: string;
  highlight?: boolean;
};

/**
 * Football field: one horizontal bar per method, low and high labeled at the
 * ends, with a dashed line for what the player is paid today.
 * All values are dollars per season so the bars are directly comparable.
 */
export default function FootballField({
  rows,
  marker,
}: {
  rows: FieldRowData[];
  marker: { value: number; label: string } | null;
}) {
  const highest = Math.max(
    ...rows.map((row) => row.range.high),
    marker?.value ?? 0,
    1_000_000
  );
  const max = highest * 1.05;

  // keep bars away from the edges so the end labels have room
  const PAD = 13;
  const x = (value: number) =>
    PAD + (Math.min(Math.max(value, 0), max) / max) * (100 - PAD * 2);

  const ticks = [0, 0.25, 0.5, 0.75, 1].map((t) => t * max);

  return (
    <div className="bg-white p-5 md:p-8">
      <div className="grid grid-cols-[8.5rem_1fr] md:grid-cols-[14rem_1fr]">
        {/* Row labels */}
        <div>
          <div className="h-10" />
          {rows.map((row) => (
            <div
              key={row.key}
              className="flex h-[4.5rem] flex-col justify-center pr-3"
            >
              <p
                className={`leading-tight ${
                  row.highlight ? "text-lg font-black" : "text-base font-bold"
                }`}
              >
                {row.label}
              </p>
              <p className="mt-0.5 text-[0.8rem] leading-snug text-[#687384]">
                {row.sub}
              </p>
            </div>
          ))}
          <div className="h-8" />
        </div>

        {/* Plot */}
        <div className="relative">
          {/* Marker label */}
          <div className="relative h-10">
            {marker && (
              <p
                className="absolute bottom-1 -translate-x-1/2 whitespace-nowrap text-center text-sm font-bold text-[#D85F46]"
                style={{ left: `${x(marker.value)}%` }}
              >
                {marker.label} {formatMoney(marker.value)}
              </p>
            )}
          </div>

          {/* Rows */}
          <div className="relative">
            {rows.map((row) => {
              const left = x(row.range.low);
              const right = x(row.range.high);
              const width = Math.max(0.7, right - left);
              const mid = x(row.range.mid);

              return (
                <div
                  key={row.key}
                  className="relative h-[4.5rem] border-b border-[#1A2842]/5 last:border-b-0"
                >
                  <div
                    className={`absolute top-1/2 -translate-y-1/2 ${
                      row.highlight ? "h-11" : "h-9"
                    }`}
                    style={{
                      left: `${left}%`,
                      width: `${width}%`,
                      backgroundColor: row.color,
                    }}
                  />

                  <div
                    className={`absolute top-1/2 w-[3px] -translate-y-1/2 bg-white/90 ${
                      row.highlight ? "h-11" : "h-9"
                    }`}
                    style={{ left: `${mid}%` }}
                    title={`Midpoint ${formatMoney(row.range.mid)}`}
                  />

                  <span
                    className="absolute top-1/2 -translate-y-1/2 pr-2 text-right font-mono text-sm font-semibold"
                    style={{ right: `${100 - left}%` }}
                  >
                    {formatMoney(row.range.low)}
                  </span>

                  <span
                    className="absolute top-1/2 -translate-y-1/2 pl-2 font-mono text-sm font-semibold"
                    style={{ left: `${right}%` }}
                  >
                    {formatMoney(row.range.high)}
                  </span>
                </div>
              );
            })}

            {marker && (
              <div
                className="pointer-events-none absolute inset-y-0 border-l-2 border-dashed border-[#D85F46]"
                style={{ left: `${x(marker.value)}%` }}
              />
            )}
          </div>

          {/* Axis */}
          <div className="relative h-8 border-t border-[#1A2842]/20">
            {ticks.map((tick, index) => (
              <span
                key={index}
                className="absolute top-1.5 -translate-x-1/2 font-mono text-[0.7rem] font-semibold text-[#1F7A74]"
                style={{ left: `${x(tick)}%` }}
              >
                {formatMoney(tick)}
              </span>
            ))}
          </div>
        </div>
      </div>

      <p className="mt-5 text-sm leading-6 text-[#687384]">
        Every bar is in <strong>dollars per season</strong>, so the methods can
        be compared directly. The white tick marks each method&apos;s midpoint.
      </p>
    </div>
  );
}
