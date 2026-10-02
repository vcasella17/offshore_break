import Link from "next/link";
import type { CSSProperties } from "react";
import { getTeamColors, teamLogo } from "@/lib/baseball";

/* ───────────────────────── Types ───────────────────────── */

type MlbTeam = {
  id: number;
  name: string;
  abbreviation?: string;
  league?: { id: number; name: string };
  division?: { id: number; name: string };
};

type MlbTeamRecord = {
  team: { id: number; name: string };
  wins: number;
  losses: number;
  winningPercentage?: string;
  gamesBack?: string;
  runDifferential?: number;
};

type MlbDivision = {
  division: {
    id: number;
    name: string;
    league: { id: number; name: string };
  };
  teamRecords: MlbTeamRecord[];
};

/* ───────────────────────── Helpers ───────────────────────── */

function getRecord(teamId: number, records: Map<number, MlbTeamRecord>) {
  const record = records.get(teamId);
  return record ? `${record.wins}–${record.losses}` : "—";
}

function getWinningPercentage(teamId: number, records: Map<number, MlbTeamRecord>) {
  const record = records.get(teamId);
  if (!record?.winningPercentage) return null;

  const percentage = Number(record.winningPercentage);
  if (!Number.isFinite(percentage)) return null;

  return percentage.toFixed(3).replace(/^0/, "");
}

function getGamesBack(teamId: number, records: Map<number, MlbTeamRecord>) {
  const gb = records.get(teamId)?.gamesBack;
  if (!gb) return "—";
  return gb === "-" ? "Lead" : gb;
}

function getRunDifferential(teamId: number, records: Map<number, MlbTeamRecord>) {
  const rd = records.get(teamId)?.runDifferential;
  if (rd == null) return "—";
  return rd > 0 ? `+${rd}` : String(rd);
}

/* ───────────────────────── Components ───────────────────────── */

function TeamCard({
  team,
  rank,
  records,
}: {
  team: MlbTeam;
  rank: number;
  records: Map<number, MlbTeamRecord>;
}) {
  const colors = getTeamColors(team.name);
  const winningPercentage = getWinningPercentage(team.id, records);

  const teamStyle = {
    "--team-primary": colors.primary,
    "--team-secondary": colors.secondary,
    "--team-hover-text": colors.hoverText,
  } as CSSProperties;

  return (
    <Link
      href={`/teams/${team.id}`}
      style={teamStyle}
      className="group relative flex min-h-[8.5rem] items-center justify-between gap-4 overflow-hidden border-b border-[#1A2842]/15 bg-[#F8F3EA] px-5 py-5 transition-colors duration-200 hover:bg-[var(--team-secondary)] hover:text-[var(--team-hover-text)] focus-visible:z-10 focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#D85F46] sm:px-7"
    >
      <span
        aria-hidden="true"
        className="absolute bottom-0 left-0 top-0 w-[3px] origin-bottom scale-y-0 bg-[var(--team-primary)] transition-transform duration-200 group-hover:scale-y-100"
      />

      <div className="flex min-w-0 items-center gap-4 sm:gap-5">
        <span className="w-5 shrink-0 font-mono text-sm font-bold text-[#1F7A74] transition-colors group-hover:text-[var(--team-hover-text)]">
          {rank}
        </span>

        <div className="flex h-14 w-14 shrink-0 items-center justify-center sm:h-[4.25rem] sm:w-[4.25rem]">
          <img
            src={teamLogo(team.id)}
            alt=""
            aria-hidden="true"
            loading="lazy"
            className="h-12 w-12 object-contain transition-transform duration-200 group-hover:scale-105 sm:h-[3.75rem] sm:w-[3.75rem]"
          />
        </div>

        <div className="min-w-0">
          <h3 className="text-lg font-bold leading-tight tracking-tight">
            {team.name}
          </h3>

          <div className="mt-2 flex flex-wrap items-center gap-x-2 gap-y-1 text-sm text-[#687384] transition-colors group-hover:text-[var(--team-hover-text)]">
            <span className="font-mono font-bold text-[#1F7A74] transition-colors group-hover:text-[var(--team-hover-text)]">
              {team.abbreviation ?? "MLB"}
            </span>
            <span aria-hidden="true" className="opacity-50">·</span>
            <span className="font-mono">{getRecord(team.id, records)}</span>
            {winningPercentage && (
              <>
                <span aria-hidden="true" className="opacity-50">·</span>
                <span className="font-mono">{winningPercentage}</span>
              </>
            )}
          </div>
        </div>
      </div>

      <div className="flex shrink-0 items-center gap-4">
        <div className="hidden gap-4 text-right sm:flex">
          <div>
            <p className="font-mono text-sm font-bold">{getGamesBack(team.id, records)}</p>
            <p className="mt-0.5 text-[0.65rem] font-bold uppercase tracking-[0.12em] text-[#1F7A74] transition-colors group-hover:text-[var(--team-hover-text)]">
              GB
            </p>
          </div>
          <div>
            <p className="font-mono text-sm font-bold">{getRunDifferential(team.id, records)}</p>
            <p className="mt-0.5 text-[0.65rem] font-bold uppercase tracking-[0.12em] text-[#1F7A74] transition-colors group-hover:text-[var(--team-hover-text)]">
              RD
            </p>
          </div>
        </div>

        <span
          aria-hidden="true"
          className="text-lg text-[#1A2842]/30 transition-all group-hover:translate-x-1 group-hover:text-[var(--team-hover-text)]"
        >
          →
        </span>
      </div>
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
          <p className="text-[0.75rem] font-bold uppercase tracking-[0.16em] text-[#1F7A74]">
            {leagueName}
          </p>
          <h3
            id={`${leagueName}-${divisionName}`}
            className="mt-1 text-2xl font-black tracking-tight"
          >
            {divisionName}
          </h3>
        </div>

        <div className="mt-5 h-px flex-1 bg-[#1A2842]/15" />

        <span className="mt-5 font-mono text-sm font-bold text-[#1F7A74]">
          {teams.length} teams
        </span>
      </div>

      <div className="border-t border-[#1A2842]/15">
        {teams.map((team, index) => (
          <TeamCard key={team.id} team={team} rank={index + 1} records={records} />
        ))}
      </div>
    </section>
  );
}

function ErrorMessage({ message }: { message: string }) {
  return (
    <main className="container-page min-h-[60vh] py-20">
      <p className="text-[0.75rem] font-bold uppercase tracking-[0.16em] text-[#1F7A74]">
        Teams directory
      </p>
      <h1 className="mt-3 text-4xl font-black tracking-tight">
        We couldn’t load the teams.
      </h1>
      <p className="mt-3 max-w-xl text-base leading-7 text-[#687384]">
        The MLB stats service may be temporarily unavailable. Please try again
        in a little while.
      </p>
      <p className="mt-4 text-sm text-[#687384]">{message}</p>
    </main>
  );
}

/* ───────────────────────── Page ───────────────────────── */

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

          if (percentageA !== percentageB) return percentageB - percentageA;
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
        {/* HEADER */}
        <section className="border-b border-[#1A2842]/15">
          <div className="container-page flex items-end justify-between gap-8 py-11 md:py-14">
            <div>
              <div className="flex items-center gap-3">
                <span className="h-[2px] w-8 bg-[#D85F46]" />
                <p className="text-[0.75rem] font-bold uppercase tracking-[0.16em] text-[#1F7A74]">
                  Around the league
                </p>
              </div>

              <h1 className="mt-4 text-5xl font-black tracking-[-0.055em] md:text-7xl">
                The teams
              </h1>

              <p className="mt-4 max-w-xl text-base leading-7 text-[#687384]">
                Records, rosters, and player pages for every Major League
                team—all in one place.
              </p>
            </div>

            <div className="hidden border-l border-[#1A2842]/15 pl-6 text-right sm:block">
              <p className="font-mono text-5xl font-bold">{mlbTeams.length}</p>
              <p className="mt-1 text-[0.7rem] font-bold uppercase tracking-[0.14em] text-[#1F7A74]">
                Major League Teams
              </p>
            </div>
          </div>
        </section>

        {/* DIRECTORY */}
        <section className="container-page py-10 md:py-14">
          <div className="mb-10 flex items-center justify-between border-b border-[#1A2842]/15 pb-4">
            <div>
              <p className="text-[0.75rem] font-bold uppercase tracking-[0.16em] text-[#1F7A74]">
                {currentSeason} season
              </p>
              <h2 className="mt-1 text-3xl font-black tracking-tight">
                The league directory
              </h2>
            </div>

            <p className="hidden text-sm text-[#687384] sm:block">
              Ranked by record within each division · select a team to view its page
            </p>
          </div>

          {mlbTeams.length === 0 ? (
            <div className="border-t-2 border-[#1A2842] bg-[#FCF9F3] px-6 py-12">
              <p className="font-semibold">No teams are available right now.</p>
              <p className="mt-2 text-sm text-[#687384]">Please try again later.</p>
            </div>
          ) : (
            <div className="space-y-14">
              {americanLeague.length > 0 && (
                <section aria-labelledby="american-league-heading">
                  <div className="mb-6 flex items-baseline gap-4">
                    <h2
                      id="american-league-heading"
                      className="text-3xl font-black tracking-tight"
                    >
                      American League
                    </h2>
                    <span className="font-mono text-sm font-bold text-[#1F7A74]">AL</span>
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
                      className="text-3xl font-black tracking-tight"
                    >
                      National League
                    </h2>
                    <span className="font-mono text-sm font-bold text-[#1F7A74]">NL</span>
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
