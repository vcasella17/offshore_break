import Link from "next/link";
import { supabase } from "@/lib/supabaseClient";

type Team = {
  id: string;
  name: string;
  abbreviation: string;
};

type MlbDivision = {
  id: number;
  name: string;
  league?: {
    id: number;
    name: string;
    abbreviation?: string;
  };
};

type MlbTeam = {
  id: number;
  name: string;
  abbreviation?: string;
  teamName?: string;
  shortName?: string;
  division?: MlbDivision;
  league?: {
    id: number;
    name: string;
    abbreviation?: string;
  };
};

type TeamRecord = {
  team: {
    id: number;
    name: string;
  };
  wins?: number;
  losses?: number;
  divisionRank?: string;
};

function teamLogo(teamId: number | string) {
  return `https://www.mlbstatic.com/team-logos/${teamId}.svg`;
}

async function getMlbTeams(): Promise<MlbTeam[]> {
  const response = await fetch(
    "https://statsapi.mlb.com/api/v1/teams?sportId=1&hydrate=division,league",
    {
      next: {
        revalidate: 300,
      },
    }
  );

  if (!response.ok) {
    throw new Error("Failed to load MLB teams.");
  }

  const data = await response.json();

  return data.teams ?? [];
}

async function getTeamRecords() {
  const season = new Date().getFullYear();

  try {
    const response = await fetch(
      `https://statsapi.mlb.com/api/v1/standings?leagueId=103,104&season=${season}&standingsTypes=regularSeason`,
      {
        next: {
          revalidate: 300,
        },
      }
    );

    if (!response.ok) {
      return new Map<number, TeamRecord>();
    }

    const data = await response.json();

    const records = new Map<number, TeamRecord>();

    for (const record of data.records ?? []) {
      for (const teamRecord of record.teamRecords ?? []) {
        records.set(teamRecord.team.id, teamRecord);
      }
    }

    return records;
  } catch {
    return new Map<number, TeamRecord>();
  }
}

function ordinal(value: string | undefined) {
  if (!value) return "";

  if (value === "1") return "1st";
  if (value === "2") return "2nd";
  if (value === "3") return "3rd";

  return `${value}th`;
}

export default async function TeamsPage() {
  const [{ data: databaseTeams }, mlbTeams, records] =
    await Promise.all([
      supabase
        .from("Teams")
        .select("id, name, abbreviation")
        .order("name"),

      getMlbTeams(),

      getTeamRecords(),
    ]);

  const dbTeams = (databaseTeams ?? []) as Team[];

  /*
   * Map the database teams by MLB team ID.
   *
   * Your Teams.id is the same MLB team ID used throughout
   * the rest of Offshore Break.
   */
  const databaseTeamMap = new Map(
    dbTeams.map((team) => [String(team.id), team])
  );

  /*
   * Only use actual MLB clubs.
   */
  const teams = mlbTeams.filter((team) => team.division);

  /*
   * Group dynamically by league + division.
   *
   * Nothing here is hardcoded for the 30 teams.
   */
  const grouped = new Map<
    string,
    {
      leagueName: string;
      divisionName: string;
      teams: MlbTeam[];
    }
  >();

  for (const team of teams) {
    const leagueName =
      team.division?.league?.name ??
      team.league?.name ??
      "Major League Baseball";

    const divisionName =
      team.division?.name ?? "Division";

    const key = `${leagueName}-${divisionName}`;

    if (!grouped.has(key)) {
      grouped.set(key, {
        leagueName,
        divisionName,
        teams: [],
      });
    }

    grouped.get(key)!.teams.push(team);
  }

  /*
   * Sort:
   * American League first
   * National League second
   *
   * Then divisions alphabetically.
   */
  const leagueOrder = new Map([
    ["American League", 1],
    ["National League", 2],
  ]);

  const divisionGroups = Array.from(grouped.values()).sort((a, b) => {
    const leagueA = leagueOrder.get(a.leagueName) ?? 99;
    const leagueB = leagueOrder.get(b.leagueName) ?? 99;

    if (leagueA !== leagueB) {
      return leagueA - leagueB;
    }

    return a.divisionName.localeCompare(b.divisionName);
  });

  return (
    <main className="min-h-screen bg-[#F8F3EA] text-[#1A2842]">
      {/* ====================================================== */}
      {/* HEADER */}
      {/* ====================================================== */}

      <section className="border-b border-[#1A2842]/15">
        <div className="mx-auto max-w-[1440px] px-6 py-16 md:px-10 md:py-20">
          <div className="flex items-end justify-between gap-8">
            <div>
              <p className="text-[10px] font-black uppercase tracking-[0.25em] text-[#D85F46]">
                Around the League
              </p>

              <h1 className="mt-3 text-5xl font-black tracking-[-0.055em] md:text-7xl">
                Teams
              </h1>

              <p className="mt-4 max-w-xl text-base leading-7 text-[#1A2842]/55">
                All 30 Major League clubs, rosters, players, and
                performance.
              </p>
            </div>

            <div className="hidden text-right md:block">
              <p className="font-mono text-5xl font-black tracking-[-0.05em]">
                {teams.length}
              </p>

              <p className="mt-1 text-[9px] font-black uppercase tracking-[0.2em] text-[#687384]">
                Teams
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ====================================================== */}
      {/* TEAM DIRECTORY */}
      {/* ====================================================== */}

      <div className="mx-auto max-w-[1440px] px-6 py-14 md:px-10 md:py-20">
        {divisionGroups.map((division) => (
          <section
            key={`${division.leagueName}-${division.divisionName}`}
            className="mb-16 last:mb-0"
          >
            {/* DIVISION HEADER */}

            <div className="mb-5 flex items-center gap-4">
              <span className="h-2 w-2 shrink-0 bg-[#D85F46]" />

              <div className="shrink-0">
                <p className="text-[10px] font-black uppercase tracking-[0.22em]">
                  {division.leagueName}
                </p>

                <p className="mt-1 text-[9px] font-black uppercase tracking-[0.2em] text-[#687384]">
                  {division.divisionName}
                </p>
              </div>

              <div className="h-px flex-1 bg-[#1A2842]/15" />
            </div>

            {/* TEAM GRID */}

            <div className="grid overflow-hidden border border-[#1A2842]/20 md:grid-cols-2 lg:grid-cols-3">
              {division.teams
                .sort((a, b) => a.name.localeCompare(b.name))
                .map((mlbTeam) => {
                  const databaseTeam = databaseTeamMap.get(
                    String(mlbTeam.id)
                  );

                  /*
                   * MLB ID is the fallback because it is also the
                   * ID used by the MLB API and logo service.
                   */
                  const teamId =
                    databaseTeam?.id ?? String(mlbTeam.id);

                  const record = records.get(mlbTeam.id);

                  return (
                    <Link
                      key={mlbTeam.id}
                      href={`/teams/${teamId}`}
                      className="group flex min-h-[128px] items-center gap-5 border-b border-r border-[#1A2842]/15 px-7 py-6 transition-colors duration-200 hover:bg-[#1A2842] hover:text-white"
                    >
                      {/* LOGO */}

                      <div className="flex h-16 w-16 shrink-0 items-center justify-center">
                        <img
                          src={teamLogo(mlbTeam.id)}
                          alt={`${mlbTeam.name} logo`}
                          className="h-14 w-14 object-contain transition-transform duration-200 group-hover:scale-110"
                        />
                      </div>

                      {/* TEAM INFORMATION */}

                      <div className="min-w-0">
                        <h2 className="truncate text-[17px] font-black tracking-[-0.025em]">
                          {mlbTeam.name}
                        </h2>

                        <div className="mt-2 flex items-center gap-3">
                          <span className="text-[10px] font-black uppercase tracking-[0.16em] text-[#687384] group-hover:text-white/45">
                            {mlbTeam.abbreviation ??
                              databaseTeam?.abbreviation ??
                              ""}
                          </span>

                          {record && (
                            <>
                              <span className="h-1 w-1 rounded-full bg-[#D85F46]" />

                              <span className="font-mono text-[10px] text-[#687384] group-hover:text-white/45">
                                {record.wins}-{record.losses}
                              </span>
                            </>
                          )}
                        </div>
                      </div>

                      {/* ARROW */}

                      <div className="ml-auto shrink-0 text-lg text-[#1A2842]/20 transition-all duration-200 group-hover:translate-x-1 group-hover:text-[#D85F46]">
                        →
                      </div>
                    </Link>
                  );
                })}
            </div>
          </section>
        ))}
      </div>

      {/* ====================================================== */}
      {/* FOOTER */}
      {/* ====================================================== */}

      <footer className="border-t border-[#1A2842]/15">
        <div className="mx-auto flex max-w-[1440px] items-center justify-between px-6 py-8 md:px-10">
          <p className="text-[8px] font-black uppercase tracking-[0.2em] text-[#687384]">
            Offshore Break
          </p>

          <p className="font-mono text-[8px] text-[#687384]">
            {teams.length} MLB CLUBS
          </p>
        </div>
      </footer>
    </main>
  );
}