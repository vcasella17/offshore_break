import Link from "next/link";
import type { CSSProperties } from "react";
import { supabase } from "@/lib/supabaseClient";

type Team = {
  id: string;
  name: string;
  abbreviation: string;
};

type MlbTeam = {
  id: number;
  name: string;
  abbreviation?: string;
  league?: {
    id: number;
    name: string;
  };
  division?: {
    id: number;
    name: string;
  };
};

type MlbTeamRecord = {
  team: {
    id: number;
    name: string;
  };
  wins: number;
  losses: number;
  winningPercentage?: string;
};

type MlbDivision = {
  division: {
    id: number;
    name: string;
    league: {
      id: number;
      name: string;
    };
  };
  teamRecords: MlbTeamRecord[];
};

type TeamColors = {
  primary: string;
  secondary: string;
  accent: string;
  hoverText: string;
};

/* =========================================================
   MLB TEAM COLORS
   ========================================================= */

const TEAM_COLORS: Record<string, TeamColors> = {
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

function getTeamColors(teamName: string): TeamColors {
  return (
    TEAM_COLORS[teamName] ?? {
      primary: "#1A2842",
      secondary: "#D85F46",
      accent: "#FFFFFF",
      hoverText: "#FFFFFF",
    }
  );
}

/* =========================================================
   HELPERS
   ========================================================= */

function teamLogo(teamId: number | string) {
  return `https://www.mlbstatic.com/team-logos/${teamId}.svg`;
}

function getRecord(
  teamId: number | string,
  records: Map<number, MlbTeamRecord>
) {
  const record = records.get(Number(teamId));

  if (!record) {
    return "—";
  }

  return `${record.wins}-${record.losses}`;
}

/* =========================================================
   TEAM CARD
   ========================================================= */

function TeamCard({
  team,
  record,
}: {
  team: MlbTeam;
  record: string;
}) {
  const colors = getTeamColors(team.name);

  const teamStyle = {
    "--team-secondary": colors.secondary,
    "--team-hover-text": colors.hoverText,
  } as CSSProperties;

  return (
    <Link
      href={`/teams/${team.id}`}
      style={teamStyle}
      className="
        group
        relative
        flex
        min-h-[160px]
        items-center
        justify-between
        overflow-hidden
        border
        border-[#1A2842]/15
        bg-[#F8F3EA]
        px-8
        py-7
        text-[#1A2842]
        transition-all
        duration-200
        hover:bg-[var(--team-secondary)]
        hover:text-[var(--team-hover-text)]
      "
    >
      {/* Team information */}
      <div className="flex min-w-0 items-center gap-7">
        {/* Logo */}
        <div className="flex h-20 w-20 shrink-0 items-center justify-center">
          <img
            src={teamLogo(team.id)}
            alt=""
            className="
              h-[72px]
              w-[72px]
              object-contain
              transition-transform
              duration-200
              group-hover:scale-105
            "
          />
        </div>

        {/* Name + record */}
        <div className="min-w-0">
          <h3
            className="
              text-[18px]
              font-black
              leading-tight
              tracking-[-0.035em]
              transition-colors
              duration-200
              group-hover:text-[var(--team-hover-text)]
            "
          >
            {team.name}
          </h3>

          <div className="mt-3 flex items-center gap-3">
            <span
              className="
                font-mono
                text-[9px]
                font-black
                uppercase
                tracking-[0.16em]
                text-[#1A2842]/50
                transition-colors
                duration-200
                group-hover:text-[var(--team-hover-text)]
                group-hover:opacity-70
              "
            >
              {team.abbreviation ?? ""}
            </span>

            <span
              className="
                h-1
                w-1
                rounded-full
                bg-[#D85F46]
                transition-colors
                duration-200
                group-hover:bg-[var(--team-hover-text)]
              "
            />

            <span
              className="
                font-mono
                text-[9px]
                font-medium
                text-[#1A2842]/45
                transition-colors
                duration-200
                group-hover:text-[var(--team-hover-text)]
                group-hover:opacity-70
              "
            >
              {record}
            </span>
          </div>
        </div>
      </div>

      {/* Arrow */}
      <span
        className="
          ml-4
          shrink-0
          text-xl
          text-[#1A2842]/25
          transition-all
          duration-200
          group-hover:translate-x-1
          group-hover:text-[var(--team-hover-text)]
        "
      >
        →
      </span>

      {/* Subtle team-color accent */}
      <div
        className="
          absolute
          bottom-0
          left-0
          h-[3px]
          w-0
          bg-[var(--team-secondary)]
          transition-all
          duration-200
          group-hover:w-full
        "
      />
    </Link>
  );
}

/* =========================================================
   DIVISION
   ========================================================= */

function DivisionSection({
  leagueName,
  divisionName,
  teams,
  records,
}: {
  leagueName: string;
  divisionName: string;
  teams: MlbTeam[];
  records: Map<number, MlbTeamRecord>;
}) {
  return (
    <section>
      {/* Division heading */}
      <div className="mb-7 flex items-end gap-5">
        <div className="h-3 w-3 shrink-0 bg-[#D85F46]" />

        <div className="min-w-0">
          <p className="text-[10px] font-black uppercase tracking-[0.22em] text-[#1A2842]">
            {leagueName}
          </p>

          <p className="mt-2 text-[9px] font-black uppercase tracking-[0.18em] text-[#1A2842]/50">
            {divisionName}
          </p>
        </div>

        <div className="mb-1 h-px flex-1 bg-[#1A2842]/15" />
      </div>

      {/* Team grid */}
      <div className="grid gap-px bg-[#1A2842]/15 md:grid-cols-2 xl:grid-cols-3">
        {teams.map((team) => (
          <TeamCard
            key={team.id}
            team={team}
            record={getRecord(team.id, records)}
          />
        ))}
      </div>
    </section>
  );
}

/* =========================================================
   PAGE
   ========================================================= */

export default async function TeamsPage() {
  const currentSeason = new Date().getFullYear();

  /* -------------------------------------------------------
     MLB TEAMS
     ------------------------------------------------------- */

  const teamsResponse = await fetch(
    "https://statsapi.mlb.com/api/v1/teams?sportId=1&hydrate=league,division",
    {
      next: {
        revalidate: 3600,
      },
    }
  );

  const teamsJson = await teamsResponse.json();

  const mlbTeams: MlbTeam[] = teamsJson.teams ?? [];

  /* -------------------------------------------------------
     MLB STANDINGS
     ------------------------------------------------------- */

  const standingsResponse = await fetch(
    `https://statsapi.mlb.com/api/v1/standings?leagueId=103,104&season=${currentSeason}&standingsTypes=regularSeason`,
    {
      next: {
        revalidate: 300,
      },
    }
  );

  const standingsJson = await standingsResponse.json();

  const records = new Map<number, MlbTeamRecord>();

  const divisions: MlbDivision[] = standingsJson.records ?? [];

  for (const division of divisions) {
    for (const teamRecord of division.teamRecords ?? []) {
      records.set(Number(teamRecord.team.id), teamRecord);
    }
  }

  /* -------------------------------------------------------
     GROUP TEAMS BY LEAGUE / DIVISION
     ------------------------------------------------------- */

  const grouped = new Map<string, MlbTeam[]>();

  for (const team of mlbTeams) {
    if (!team.division?.name || !team.league?.name) {
      continue;
    }

    const key = `${team.league.name}|||${team.division.name}`;

    if (!grouped.has(key)) {
      grouped.set(key, []);
    }

    grouped.get(key)!.push(team);
  }

  const americanLeague = Array.from(grouped.entries())
    .filter(([key]) => key.startsWith("American League|||"))
    .sort(([a], [b]) => a.localeCompare(b));

  const nationalLeague = Array.from(grouped.entries())
    .filter(([key]) => key.startsWith("National League|||"))
    .sort(([a], [b]) => a.localeCompare(b));

  /* -------------------------------------------------------
     PAGE
     ------------------------------------------------------- */

  return (
    <main className="min-h-screen bg-[#F8F3EA] text-[#1A2842]">
      {/* ===================================================
          HERO
          =================================================== */}

      <section className="border-b border-[#1A2842]/15">
        <div className="mx-auto flex max-w-[1440px] items-end justify-between px-6 py-12 md:px-10 md:py-14 lg:px-11">
          <div>
            <p className="text-[9px] font-black uppercase tracking-[0.22em] text-[#D85F46]">
              The League
            </p>

            <h1 className="mt-3 text-6xl font-black leading-none tracking-[-0.06em] md:text-7xl">
              Teams
            </h1>

            <p className="mt-5 max-w-xl text-sm leading-6 text-[#1A2842]/55 md:text-base">
              All 30 Major League clubs, rosters, players, and performance.
            </p>
          </div>

          <div className="hidden text-right md:block">
            <p className="font-mono text-5xl font-black leading-none tracking-[-0.06em]">
              {mlbTeams.length}
            </p>

            <p className="mt-2 text-[9px] font-black uppercase tracking-[0.2em] text-[#1A2842]/50">
              Teams
            </p>
          </div>
        </div>
      </section>

      {/* ===================================================
          TEAM DIRECTORY
          =================================================== */}

      <section className="mx-auto max-w-[1440px] px-6 py-16 md:px-10 md:py-20 lg:px-11">
        <div className="space-y-20">
          {/* AMERICAN LEAGUE */}

          <div>
            {americanLeague.map(([key, teams]) => {
              const [, divisionName] = key.split("|||");

              return (
                <div key={key} className="mb-16 last:mb-0">
                  <DivisionSection
                    leagueName="American League"
                    divisionName={divisionName}
                    teams={teams}
                    records={records}
                  />
                </div>
              );
            })}
          </div>

          {/* NATIONAL LEAGUE */}

          <div>
            {nationalLeague.map(([key, teams]) => {
              const [, divisionName] = key.split("|||");

              return (
                <div key={key} className="mb-16 last:mb-0">
                  <DivisionSection
                    leagueName="National League"
                    divisionName={divisionName}
                    teams={teams}
                    records={records}
                  />
                </div>
              );
            })}
          </div>
        </div>
      </section>
    </main>
  );
}