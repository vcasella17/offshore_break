import Link from "next/link";
import type { CSSProperties } from "react";

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

function getTeamLogoUrl(teamId: number) {
  return `https://www.mlbstatic.com/team-logos/${teamId}.svg`;
}

function getRecord(
  teamId: number,
  records: Map<number, MlbTeamRecord>
) {
  const record = records.get(teamId);
  return record ? `${record.wins}-${record.losses}` : "—";
}

function getWinningPercentage(
  teamId: number,
  records: Map<number, MlbTeamRecord>
) {
  const record = records.get(teamId);
  if (!record?.winningPercentage) return null;

  const percentage = Number(record.winningPercentage);
  if (!Number.isFinite(percentage)) return null;

  return percentage.toFixed(3).replace(/^0/, "");
}

function TeamCard({
  team,
  record,
  winningPercentage,
}: {
  team: MlbTeam;
  record: string;
  winningPercentage: string | null;
}) {
  const colors = getTeamColors(team.name);

  const teamStyle = {
    "--team-primary": colors.primary,
    "--team-secondary": colors.secondary,
    "--team-hover-text": colors.hoverText,
  } as CSSProperties;

  return (
    <Link
      href={`/teams/${team.id}`}
      style={teamStyle}
      className="group relative flex min-h-[136px] items-center justify-between overflow-hidden border-b border-[#1A2842]/15 bg-[#F8F3EA] px-5 py-5 transition-colors duration-200 hover:bg-[var(--team-secondary)] hover:text-[var(--team-hover-text)] focus-visible:z-10 focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#D85F46] sm:px-7"
    >
      <span
        aria-hidden="true"
        className="absolute bottom-0 left-0 top-0 w-[3px] origin-bottom scale-y-0 bg-[var(--team-primary)] transition-transform duration-200 group-hover:scale-y-100"
      />

      <div className="flex min-w-0 items-center gap-4 sm:gap-6">
        <div className="flex h-14 w-14 shrink-0 items-center justify-center sm:h-[68px] sm:w-[68px]">
          <img
            src={getTeamLogoUrl(team.id)}
            alt=""
            aria-hidden="true"
            loading="lazy"
            className="h-12 w-12 object-contain transition-transform duration-200 group-hover:scale-105 sm:h-[60px] sm:w-[60px]"
          />
        </div>

        <div className="min-w-0">
          <h3 className="truncate text-base font-bold tracking-tight sm:text-lg">
            {team.name}
          </h3>

          <div className="mt-2 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-[#687384] transition-colors group-hover:text-[var(--team-hover-text)]">
            <span className="font-mono font-semibold">
              {team.abbreviation ?? "MLB"}
            </span>
            <span aria-hidden="true" className="opacity-50">
              ·
            </span>
            <span className="font-mono">{record}</span>
            {winningPercentage && (
              <>
                <span aria-hidden="true" className="opacity-50">
                  ·
                </span>
                <span className="font-mono">. {winningPercentage}</span>
              </>
            )}
          </div>
        </div>
      </div>

      <span
        aria-hidden="true"
        className="ml-3 shrink-0 text-lg text-[#1A2842]/30 transition-all group-hover:translate-x-1 group-hover:text-[var(--team-hover-text)]"
      >
        →
      </span>
    </Link>
  );
}

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
    <section aria-labelledby={`${leagueName}-${divisionName}`}>
      <div className="mb-3 flex items-center gap-4">
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-[#D85F46]">
            {leagueName}
          </p>
          <h3
            id={`${leagueName}-${divisionName}`}
            className="mt-1 text-xl font-bold tracking-tight"
          >
            {divisionName}
          </h3>
        </div>

        <div className="mt-5 h-px flex-1 bg-[#1A2842]/15" />

        <span className="mt-5 font-mono text-xs text-[#687384]">
          {teams.length} clubs
        </span>
      </div>

      <div className="border-t border-[#1A2842]/15">
        {teams.map((team) => (
          <TeamCard
            key={team.id}
            team={team}
            record={getRecord(team.id, records)}
            winningPercentage={getWinningPercentage(team.id, records)}
          />
        ))}
      </div>
    </section>
  );
}

function ErrorMessage({ message }: { message: string }) {
  return (
    <main className="mx-auto min-h-[60vh] max-w-[900px] px-5 py-20">
      <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[#D85F46]">
        Teams directory
      </p>
      <h1 className="mt-3 text-3xl font-bold tracking-tight">
        We couldn’t load the teams.
      </h1>
      <p className="mt-3 max-w-xl text-sm leading-6 text-[#687384]">
        The MLB stats service may be temporarily unavailable. Please try again
        in a little while.
      </p>
      <p className="mt-4 text-xs text-[#687384]">{message}</p>
    </main>
  );
}

export default async function TeamsPage() {
  const currentSeason = new Date().getFullYear();

  try {
    const [teamsResponse, standingsResponse] = await Promise.all([
      fetch(
        "https://statsapi.mlb.com/api/v1/teams?sportId=1&hydrate=league,division",
        { next: { revalidate: 3600 } }
      ),
      fetch(
        `https://statsapi.mlb.com/api/v1/standings?leagueId=103,104&season=${currentSeason}&standingsTypes=regularSeason`,
        { next: { revalidate: 300 } }
      ),
    ]);

    if (!teamsResponse.ok) {
      throw new Error(`Teams request failed (${teamsResponse.status}).`);
    }

    const teamsJson = await teamsResponse.json();
    const mlbTeams: MlbTeam[] = teamsJson.teams ?? [];

    const records = new Map<number, MlbTeamRecord>();

    if (standingsResponse.ok) {
      const standingsJson = await standingsResponse.json();
      const divisions: MlbDivision[] = standingsJson.records ?? [];

      for (const division of divisions) {
        for (const teamRecord of division.teamRecords ?? []) {
          records.set(Number(teamRecord.team.id), teamRecord);
        }
      }
    }

    const grouped = new Map<string, MlbTeam[]>();

    for (const team of mlbTeams) {
      if (!team.division?.name || !team.league?.name) continue;

      const key = `${team.league.name}|||${team.division.name}`;
      const divisionTeams = grouped.get(key) ?? [];
      divisionTeams.push(team);
      grouped.set(key, divisionTeams);
    }

    for (const teams of grouped.values()) {
      teams.sort((a, b) => {
        const recordA = records.get(a.id);
        const recordB = records.get(b.id);

        if (recordA && recordB) {
          const percentageA = Number(recordA.winningPercentage ?? 0);
          const percentageB = Number(recordB.winningPercentage ?? 0);

          if (percentageA !== percentageB) {
            return percentageB - percentageA;
          }

          return recordB.wins - recordA.wins;
        }

        return a.name.localeCompare(b.name);
      });
    }

    const americanLeague = Array.from(grouped.entries())
      .filter(([key]) => key.startsWith("American League|||"))
      .sort(([a], [b]) => a.localeCompare(b));

    const nationalLeague = Array.from(grouped.entries())
      .filter(([key]) => key.startsWith("National League|||"))
      .sort(([a], [b]) => a.localeCompare(b));

    return (
      <main className="min-h-screen bg-[#F8F3EA] text-[#1A2842]">
        <section className="border-b border-[#1A2842]/15">
          <div className="container-page flex items-end justify-between gap-8 py-11 md:py-14">
            <div>
              <div className="flex items-center gap-3">
                <span className="h-[2px] w-8 bg-[#D85F46]" />
                <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-[#687384]">
                  Around the league
                </p>
              </div>

              <h1 className="mt-4 text-5xl font-black tracking-[-0.055em] md:text-7xl">
                The clubs
              </h1>

              <p className="mt-4 max-w-xl text-sm leading-6 text-[#687384]">
                Records, rosters, and player pages for every Major League
                club—all in one place.
              </p>
            </div>

            <div className="hidden border-l border-[#1A2842]/15 pl-6 text-right sm:block">
              <p className="font-mono text-4xl font-bold">{mlbTeams.length}</p>
              <p className="mt-1 text-[10px] uppercase tracking-[0.14em] text-[#687384]">
                Major League clubs
              </p>
            </div>
          </div>
        </section>

        <section className="container-page py-10 md:py-14">
          <div className="mb-10 flex items-center justify-between border-b border-[#1A2842]/15 pb-4">
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-[#D85F46]">
                {currentSeason} season
              </p>
              <h2 className="mt-1 text-2xl font-bold tracking-tight">
                The league directory
              </h2>
            </div>

            <p className="hidden text-xs text-[#687384] sm:block">
              Select a club to view its page
            </p>
          </div>

          {mlbTeams.length === 0 ? (
            <div className="border-t-2 border-[#1A2842] bg-[#FCF9F3] px-6 py-12">
              <p className="font-semibold">No teams are available right now.</p>
              <p className="mt-2 text-sm text-[#687384]">
                Please try again later.
              </p>
            </div>
          ) : (
            <div className="space-y-14">
              {americanLeague.length > 0 && (
                <section aria-labelledby="american-league-heading">
                  <div className="mb-6 flex items-baseline gap-4">
                    <h2
                      id="american-league-heading"
                      className="text-2xl font-bold tracking-tight"
                    >
                      American League
                    </h2>
                    <span className="font-mono text-xs text-[#687384]">
                      AL
                    </span>
                  </div>

                  <div className="grid gap-10 xl:grid-cols-3">
                    {americanLeague.map(([key, teams]) => {
                      const [, divisionName] = key.split("|||");

                      return (
                        <DivisionSection
                          key={key}
                          leagueName="American League"
                          divisionName={divisionName}
                          teams={teams}
                          records={records}
                        />
                      );
                    })}
                  </div>
                </section>
              )}

              {nationalLeague.length > 0 && (
                <section
                  aria-labelledby="national-league-heading"
                  className="border-t border-[#1A2842]/15 pt-10"
                >
                  <div className="mb-6 flex items-baseline gap-4">
                    <h2
                      id="national-league-heading"
                      className="text-2xl font-bold tracking-tight"
                    >
                      National League
                    </h2>
                    <span className="font-mono text-xs text-[#687384]">
                      NL
                    </span>
                  </div>

                  <div className="grid gap-10 xl:grid-cols-3">
                    {nationalLeague.map(([key, teams]) => {
                      const [, divisionName] = key.split("|||");

                      return (
                        <DivisionSection
                          key={key}
                          leagueName="National League"
                          divisionName={divisionName}
                          teams={teams}
                          records={records}
                        />
                      );
                    })}
                  </div>
                </section>
              )}
            </div>
          )}
        </section>
      </main>
    );
  } catch (error) {
    console.error("Failed to load MLB teams:", error);

    return (
      <ErrorMessage message="The team directory could not reach the MLB stats service." />
    );
  }
}