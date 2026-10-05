export const SEASON = 2026;

/* ───────────── Paging (Supabase caps every request at 1,000 rows) ───────────── */

export async function fetchAll<T>(
  query: (
    from: number,
    to: number
  ) => PromiseLike<{ data: unknown[] | null; error: unknown }>
): Promise<T[]> {
  const pageSize = 1000;
  const rows: T[] = [];

  for (let from = 0; ; from += pageSize) {
    const { data, error } = await query(from, from + pageSize - 1);
    if (error) throw error;
    rows.push(...((data ?? []) as T[]));
    if (!data || data.length < pageSize) break;
  }

  return rows;
}

/* ───────────── Formatters ───────────── */

export function formatAverage(value: number | null | undefined) {
  if (value == null) return "—";
  const formatted = value.toFixed(3);
  return value >= 1 ? formatted : formatted.replace(/^0/, "");
}

export function formatDecimal(value: number | null | undefined) {
  return value == null ? "—" : value.toFixed(2);
}

export function formatNumber(value: number | null | undefined) {
  return value == null ? "—" : value.toLocaleString();
}

export function formatInnings(value: number | null | undefined) {
  return value == null ? "—" : value.toFixed(1);
}

/* ───────────── Images ───────────── */

export function teamLogo(teamId: number | string) {
  return `https://www.mlbstatic.com/team-logos/${teamId}.svg`;
}

/**
 * Standard MLB headshot.
 *
 * Use smaller widths for tables and larger widths for
 * player cards and profile pages.
 */
export function headshot(playerId: number, width = 120) {
  return `https://img.mlbstatic.com/mlb-photos/image/upload/d_people:generic:headshot:67:current.png/w_${width},q_auto:best/v1/people/${playerId}/headshot/67/current`;
}

/**
 * Higher-resolution MLB player image.
 *
 * 720px is the default for large cards and player pages.
 * You can pass 360 or 240 for smaller UI elements.
 */
export function headshotSilo(playerId: number, size = 720) {
  return `https://midfield.mlbstatic.com/v1/people/${playerId}/spots/${size}`;
}

/* ───────────── Qualification scales with how far into the season we are ───────────── */

export function getThresholds(rows: { games: number | null }[]) {
  const maxGames = Math.min(
    162,
    Math.max(0, ...rows.map((row) => row.games ?? 0))
  );

  return {
    minAb: Math.max(20, Math.round(maxGames * 2.7)),
    minIp: Math.max(10, maxGames),
  };
}

/* ───────────── Team colors (one shared palette) ───────────── */

export type TeamColors = {
  primary: string;
  secondary: string;
  accent: string;
  hoverText: string;
};

export const TEAM_COLORS: Record<string, TeamColors> = {
  "Arizona Diamondbacks": {
    primary: "#A71930",
    secondary: "#2A9D8F",
    accent: "#E3D4AD",
    hoverText: "#FFFFFF",
  },
  "Atlanta Braves": {
    primary: "#CE1141",
    secondary: "#13274F",
    accent: "#EAAA00",
    hoverText: "#FFFFFF",
  },
  "Baltimore Orioles": {
    primary: "#DF4601",
    secondary: "#000000",
    accent: "#FFFFFF",
    hoverText: "#FFFFFF",
  },
  "Boston Red Sox": {
    primary: "#BD3039",
    secondary: "#0C2340",
    accent: "#FFFFFF",
    hoverText: "#FFFFFF",
  },
  "Chicago Cubs": {
    primary: "#0E3386",
    secondary: "#CC3433",
    accent: "#FFFFFF",
    hoverText: "#FFFFFF",
  },
  "Chicago White Sox": {
    primary: "#27251F",
    secondary: "#C4CED4",
    accent: "#FFFFFF",
    hoverText: "#1A2842",
  },
  "Cincinnati Reds": {
    primary: "#C6011F",
    secondary: "#000000",
    accent: "#FFFFFF",
    hoverText: "#FFFFFF",
  },
  "Cleveland Guardians": {
    primary: "#00385D",
    secondary: "#E50022",
    accent: "#FFFFFF",
    hoverText: "#FFFFFF",
  },
  "Colorado Rockies": {
    primary: "#333366",
    secondary: "#7663A8",
    accent: "#C4CED4",
    hoverText: "#FFFFFF",
  },
  "Detroit Tigers": {
    primary: "#0C2340",
    secondary: "#FA4616",
    accent: "#FFFFFF",
    hoverText: "#FFFFFF",
  },
  "Houston Astros": {
    primary: "#002D62",
    secondary: "#EB6E1F",
    accent: "#F4911E",
    hoverText: "#FFFFFF",
  },
  "Kansas City Royals": {
    primary: "#004687",
    secondary: "#BD9B60",
    accent: "#FFFFFF",
    hoverText: "#FFFFFF",
  },
  "Los Angeles Angels": {
    primary: "#BA0021",
    secondary: "#003263",
    accent: "#862633",
    hoverText: "#FFFFFF",
  },
  "Los Angeles Dodgers": {
    primary: "#005A9C",
    secondary: "#D6E7F5",
    accent: "#EF3E42",
    hoverText: "#1A2842",
  },
  "Miami Marlins": {
    primary: "#00A3E0",
    secondary: "#7CC7E8",
    accent: "#EF3340",
    hoverText: "#1A2842",
  },
  "Milwaukee Brewers": {
    primary: "#12284B",
    secondary: "#FFC52F",
    accent: "#FFFFFF",
    hoverText: "#1A2842",
  },
  "Minnesota Twins": {
    primary: "#002B5C",
    secondary: "#D31145",
    accent: "#B9975B",
    hoverText: "#FFFFFF",
  },
  "New York Mets": {
    primary: "#002D72",
    secondary: "#002D72",
    accent: "#FF5910",
    hoverText: "#FFFFFF",
  },
  "New York Yankees": {
    primary: "#003087",
    secondary: "#C4CED4",
    accent: "#E4002B",
    hoverText: "#1A2842",
  },
  Athletics: {
    primary: "#003831",
    secondary: "#EFB21E",
    accent: "#FFFFFF",
    hoverText: "#1A2842",
  },
  "Oakland Athletics": {
    primary: "#003831",
    secondary: "#EFB21E",
    accent: "#FFFFFF",
    hoverText: "#1A2842",
  },
  "Philadelphia Phillies": {
    primary: "#E81828",
    secondary: "#002D72",
    accent: "#FFFFFF",
    hoverText: "#FFFFFF",
  },
  "Pittsburgh Pirates": {
    primary: "#27251F",
    secondary: "#FDB827",
    accent: "#FFFFFF",
    hoverText: "#1A2842",
  },
  "San Diego Padres": {
    primary: "#2F241D",
    secondary: "#FFC425",
    accent: "#FFFFFF",
    hoverText: "#1A2842",
  },
  "San Francisco Giants": {
    primary: "#FD5A1E",
    secondary: "#27251F",
    accent: "#FFFFFF",
    hoverText: "#FFFFFF",
  },
  "Seattle Mariners": {
    primary: "#0C2C56",
    secondary: "#005C5C",
    accent: "#C4CED4",
    hoverText: "#FFFFFF",
  },
  "St. Louis Cardinals": {
    primary: "#C41E3A",
    secondary: "#0C2340",
    accent: "#FFFFFF",
    hoverText: "#FFFFFF",
  },
  "Tampa Bay Rays": {
    primary: "#092C5C",
    secondary: "#8FBCE6",
    accent: "#F5D130",
    hoverText: "#1A2842",
  },
  "Texas Rangers": {
    primary: "#003278",
    secondary: "#C9DDF2",
    accent: "#C0111F",
    hoverText: "#1A2842",
  },
  "Toronto Blue Jays": {
    primary: "#134A8E",
    secondary: "#1D2D5C",
    accent: "#E8291C",
    hoverText: "#FFFFFF",
  },
  "Washington Nationals": {
    primary: "#AB0003",
    secondary: "#14225A",
    accent: "#FFFFFF",
    hoverText: "#FFFFFF",
  },
};

export function getTeamColors(teamName?: string | null): TeamColors {
  return (
    (teamName && TEAM_COLORS[teamName]) || {
      primary: "#1A2842",
      secondary: "#D85F46",
      accent: "#FFFFFF",
      hoverText: "#FFFFFF",
    }
  );
}