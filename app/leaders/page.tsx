import Link from "next/link";
import { supabase } from "@/lib/supabaseClient";

type Player = {
  id: number;
  name: string;
  team_id: string | null;
  position: string | null;
};

type Team = {
  id: string;
  name: string;
  abbreviation: string;
};

type PlayerStat = {
  player_id: number;
  season: number;
  games: number | null;
  at_bats: number | null;
  hits: number | null;
  home_runs: number | null;
  rbi: number | null;
  walks: number | null;
  strikeouts: number | null;
  batting_avg: number | null;
  obp: number | null;
  slg: number | null;
  ops: number | null;
  innings_pitched: number | null;
  wins: number | null;
  losses: number | null;
  earned_runs: number | null;
  hits_allowed: number | null;
  walks_allowed: number | null;
  strikeouts_pitched: number | null;
  era: number | null;
  whip: number | null;
};

type LeaderRow = PlayerStat & {
  player: Player;
  team: Team | null;
};

const currentYear = new Date().getFullYear();

function formatNumber(value: number | null, decimals = 0) {
  if (value === null || value === undefined) return "—";
  return value.toFixed(decimals);
}

function formatRate(value: number | null) {
  if (value === null || value === undefined) return "—";
  return value.toFixed(3).replace(/^0/, "");
}

function formatERA(value: number | null) {
  if (value === null || value === undefined) return "—";
  return value.toFixed(2);
}

function formatIP(value: number | null) {
  if (value === null || value === undefined) return "—";
  return value.toFixed(1);
}

function getK9(row: LeaderRow) {
  if (
    row.strikeouts_pitched === null ||
    row.innings_pitched === null ||
    row.innings_pitched === 0
  ) {
    return null;
  }

  return (row.strikeouts_pitched / row.innings_pitched) * 9;
}

function getQualifiedHitters(rows: LeaderRow[]) {
  return rows.filter(
    (row) =>
      row.at_bats !== null &&
      row.at_bats >= 50 &&
      row.games !== null &&
      row.games >= 10
  );
}

function getQualifiedPitchers(rows: LeaderRow[]) {
  return rows.filter(
    (row) =>
      row.innings_pitched !== null &&
      row.innings_pitched >= 10
  );
}

function LeaderboardCard({
  title,
  eyebrow,
  rows,
  value,
  format,
  lowerIsBetter = false,
}: {
  title: string;
  eyebrow: string;
  rows: LeaderRow[];
  value: (row: LeaderRow) => number | null;
  format: (value: number | null) => string;
  lowerIsBetter?: boolean;
}) {
  const sorted = [...rows]
    .filter((row) => value(row) !== null)
    .sort((a, b) => {
      const aValue = value(a) ?? 0;
      const bValue = value(b) ?? 0;

      return lowerIsBetter ? aValue - bValue : bValue - aValue;
    })
    .slice(0, 10);

  return (
    <section className="overflow-hidden border border-[#1A2842]/15 bg-white">
      <div className="flex items-end justify-between border-b border-[#1A2842]/10 px-5 py-4">
        <div>
          <p className="font-mono text-[8px] font-bold uppercase tracking-[0.2em] text-[#59B3AD]">
            {eyebrow}
          </p>
          <h2 className="mt-1 text-[18px] font-black uppercase tracking-[-0.03em] text-[#1A2842]">
            {title}
          </h2>
        </div>

        <span className="font-mono text-[8px] font-bold uppercase tracking-[0.15em] text-[#9AA1AA]">
          TOP 10
        </span>
      </div>

      <div>
        {sorted.length === 0 ? (
          <div className="px-5 py-8 text-center">
            <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-[#9AA1AA]">
              No qualifying data
            </p>
          </div>
        ) : (
          sorted.map((row, index) => (
            <Link
              key={`${row.player_id}-${row.season}-${title}`}
              href={`/players/${row.player_id}`}
              className="group grid grid-cols-[34px_1fr_auto] items-center gap-3 border-b border-[#1A2842]/8 px-5 py-3 transition-colors last:border-b-0 hover:bg-[#F8F3EA]"
            >
              <span className="font-mono text-[9px] font-bold text-[#A4A7AA]">
                {String(index + 1).padStart(2, "0")}
              </span>

              <div className="min-w-0">
                <p className="truncate text-[11px] font-black uppercase tracking-[0.02em] text-[#1A2842] transition-colors group-hover:text-[#D85F46]">
                  {row.player.name}
                </p>

                <div className="mt-1 flex items-center gap-2">
                  <span className="font-mono text-[8px] font-bold uppercase tracking-[0.1em] text-[#9AA1AA]">
                    {row.team?.abbreviation ?? "—"}
                  </span>

                  {row.player.position && (
                    <>
                      <span className="h-1 w-1 rounded-full bg-[#D85F46]" />
                      <span className="font-mono text-[8px] font-bold uppercase tracking-[0.1em] text-[#9AA1AA]">
                        {row.player.position}
                      </span>
                    </>
                  )}
                </div>
              </div>

              <span className="analytics-number text-[14px] font-black text-[#1A2842]">
                {format(value(row))}
              </span>
            </Link>
          ))
        )}
      </div>
    </section>
  );
}

function MiniLeaderboard({
  title,
  rows,
  value,
  format,
  lowerIsBetter = false,
}: {
  title: string;
  rows: LeaderRow[];
  value: (row: LeaderRow) => number | null;
  format: (value: number | null) => string;
  lowerIsBetter?: boolean;
}) {
  const sorted = [...rows]
    .filter((row) => value(row) !== null)
    .sort((a, b) => {
      const aValue = value(a) ?? 0;
      const bValue = value(b) ?? 0;

      return lowerIsBetter ? aValue - bValue : bValue - aValue;
    })
    .slice(0, 5);

  return (
    <section className="border-t-2 border-[#1A2842] pt-4">
      <div className="mb-3 flex items-center justify-between">
        <h3 className="text-[11px] font-black uppercase tracking-[0.1em] text-[#1A2842]">
          {title}
        </h3>

        <span className="font-mono text-[8px] font-bold uppercase tracking-[0.15em] text-[#9AA1AA]">
          TOP 5
        </span>
      </div>

      <div>
        {sorted.map((row, index) => (
          <Link
            key={`${row.player_id}-${row.season}-${title}`}
            href={`/players/${row.player_id}`}
            className="group grid grid-cols-[25px_1fr_auto] items-center gap-2 border-b border-[#1A2842]/10 py-2.5 last:border-b-0"
          >
            <span className="font-mono text-[8px] font-bold text-[#9AA1AA]">
              {String(index + 1).padStart(2, "0")}
            </span>

            <span className="truncate text-[10px] font-bold uppercase text-[#1A2842] group-hover:text-[#D85F46]">
              {row.player.name}
            </span>

            <span className="analytics-number text-[11px] font-black text-[#1A2842]">
              {format(value(row))}
            </span>
          </Link>
        ))}
      </div>
    </section>
  );
}

export default async function LeadersPage({
  searchParams,
}: {
  searchParams: Promise<{ season?: string }>;
}) {
  const params = await searchParams;

  const selectedSeason =
    params.season && /^\d{4}$/.test(params.season)
      ? Number(params.season)
      : currentYear;

  const { data: statsData, error: statsError } = await supabase
    .from("PlayerStats")
    .select("*")
    .eq("season", selectedSeason);

  const { data: playersData, error: playersError } = await supabase
    .from("Player")
    .select("id, name, team_id, position");

  const { data: teamsData, error: teamsError } = await supabase
    .from("Teams")
    .select("id, name, abbreviation");

  if (statsError || playersError || teamsError) {
    return (
      <main className="min-h-screen bg-[#F8F3EA] px-5 py-20 md:px-8">
        <div className="mx-auto max-w-[1440px]">
          <div className="border border-[#D85F46]/30 bg-white p-8">
            <p className="font-mono text-[9px] font-bold uppercase tracking-[0.2em] text-[#D85F46]">
              Data Desk Error
            </p>

            <h1 className="mt-2 text-2xl font-black uppercase text-[#1A2842]">
              Unable to load leaderboard data
            </h1>

            <p className="mt-3 max-w-xl text-sm leading-6 text-[#687384]">
              The leaderboard could not connect to the current statistical
              tables. Check your Supabase connection and try again.
            </p>
          </div>
        </div>
      </main>
    );
  }

  const players = (playersData ?? []) as Player[];
  const teams = (teamsData ?? []) as Team[];
  const stats = (statsData ?? []) as PlayerStat[];

  const playerMap = new Map(players.map((player) => [player.id, player]));
  const teamMap = new Map(teams.map((team) => [team.id, team]));

  const rows: LeaderRow[] = stats
    .map((stat) => {
      const player = playerMap.get(stat.player_id);

      if (!player) return null;

      return {
        ...stat,
        player,
        team: player.team_id ? teamMap.get(player.team_id) ?? null : null,
      };
    })
    .filter((row): row is LeaderRow => row !== null);

  const hitters = getQualifiedHitters(
    rows.filter(
      (row) =>
        row.at_bats !== null &&
        row.at_bats > 0
    )
  );

  const pitchers = getQualifiedPitchers(
    rows.filter(
      (row) =>
        row.innings_pitched !== null &&
        row.innings_pitched > 0
    )
  );

  const seasons = Array.from(
    new Set(
      (statsData ?? [])
        .map((row) => row.season)
        .filter((season): season is number => typeof season === "number")
    )
  ).sort((a, b) => b - a);

  return (
    <main className="min-h-screen bg-[#F8F3EA]">
      {/* HERO */}
      <section className="paper-grid border-b border-[#1A2842]/15">
        <div className="mx-auto max-w-[1440px] px-5 pb-12 pt-12 md:px-8 md:pb-16 md:pt-16">
          <div className="flex flex-col justify-between gap-10 md:flex-row md:items-end">
            <div className="max-w-3xl">
              <div className="mb-5 flex items-center gap-3">
                <span className="h-[2px] w-10 bg-[#D85F46]" />
                <span className="font-mono text-[9px] font-bold uppercase tracking-[0.22em] text-[#687384]">
                  Offshore Break / Data Desk
                </span>
              </div>

              <h1 className="text-[clamp(42px,7vw,92px)] font-black uppercase leading-[0.84] tracking-[-0.07em] text-[#1A2842]">
                Leaderboard
                <br />
                <span className="text-[#D85F46]">Desk.</span>
              </h1>

              <p className="mt-7 max-w-xl text-sm leading-6 text-[#687384] md:text-[15px]">
                A season-long look at the players driving the numbers.
                Traditional production, rate statistics, and pitching
                performance, all in one place.
              </p>
            </div>

            <div className="w-full md:w-[190px]">
              <p className="mb-2 font-mono text-[8px] font-bold uppercase tracking-[0.18em] text-[#687384]">
                Season
              </p>

              <div className="flex flex-wrap gap-2">
                {seasons.length > 0 ? (
                  seasons.slice(0, 4).map((season) => (
                    <Link
                      key={season}
                      href={`/leaders?season=${season}`}
                      className={`border px-4 py-2 font-mono text-[9px] font-bold uppercase tracking-[0.12em] transition ${
                        season === selectedSeason
                          ? "border-[#1A2842] bg-[#1A2842] text-white"
                          : "border-[#1A2842]/20 bg-white text-[#1A2842] hover:border-[#D85F46] hover:text-[#D85F46]"
                      }`}
                    >
                      {season}
                    </Link>
                  ))
                ) : (
                  <span className="font-mono text-[9px] text-[#9AA1AA]">
                    No seasons
                  </span>
                )}
              </div>
            </div>
          </div>

          <div className="mt-10 grid grid-cols-2 border-t border-[#1A2842]/15 pt-5 md:grid-cols-4">
            <div className="border-r border-[#1A2842]/10 pr-4">
              <p className="font-mono text-[8px] font-bold uppercase tracking-[0.15em] text-[#9AA1AA]">
                Season
              </p>
              <p className="analytics-number mt-1 text-xl font-black text-[#1A2842]">
                {selectedSeason}
              </p>
            </div>

            <div className="px-4 md:border-r md:border-[#1A2842]/10">
              <p className="font-mono text-[8px] font-bold uppercase tracking-[0.15em] text-[#9AA1AA]">
                Player Lines
              </p>
              <p className="analytics-number mt-1 text-xl font-black text-[#1A2842]">
                {rows.length.toLocaleString()}
              </p>
            </div>

            <div className="border-r border-[#1A2842]/10 px-4">
              <p className="font-mono text-[8px] font-bold uppercase tracking-[0.15em] text-[#9AA1AA]">
                Hitters
              </p>
              <p className="analytics-number mt-1 text-xl font-black text-[#1A2842]">
                {hitters.length.toLocaleString()}
              </p>
            </div>

            <div className="pl-4">
              <p className="font-mono text-[8px] font-bold uppercase tracking-[0.15em] text-[#9AA1AA]">
                Pitchers
              </p>
              <p className="analytics-number mt-1 text-xl font-black text-[#1A2842]">
                {pitchers.length.toLocaleString()}
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* HITTING */}
      <section className="mx-auto max-w-[1440px] px-5 py-12 md:px-8 md:py-16">
        <div className="mb-8 flex items-end justify-between">
          <div>
            <p className="font-mono text-[8px] font-bold uppercase tracking-[0.2em] text-[#59B3AD]">
              01 / Offense
            </p>
            <h2 className="mt-2 text-3xl font-black uppercase tracking-[-0.05em] text-[#1A2842] md:text-4xl">
              Hitting Leaders
            </h2>
          </div>

          <span className="hidden font-mono text-[8px] font-bold uppercase tracking-[0.15em] text-[#9AA1AA] md:block">
            Minimum 50 AB
          </span>
        </div>

        <div className="grid gap-5 md:grid-cols-2">
          <LeaderboardCard
            eyebrow="Rate"
            title="OPS"
            rows={hitters}
            value={(row) => row.ops}
            format={formatRate}
          />

          <LeaderboardCard
            eyebrow="Power"
            title="Home Runs"
            rows={hitters}
            value={(row) => row.home_runs}
            format={(value) => formatNumber(value)}
          />

          <LeaderboardCard
            eyebrow="Contact"
            title="Batting Average"
            rows={hitters}
            value={(row) => row.batting_avg}
            format={formatRate}
          />

          <LeaderboardCard
            eyebrow="Production"
            title="RBI"
            rows={hitters}
            value={(row) => row.rbi}
            format={(value) => formatNumber(value)}
          />
        </div>

        <div className="mt-12 grid gap-8 md:grid-cols-2 lg:grid-cols-4">
          <MiniLeaderboard
            title="OBP"
            rows={hitters}
            value={(row) => row.obp}
            format={formatRate}
          />

          <MiniLeaderboard
            title="SLG"
            rows={hitters}
            value={(row) => row.slg}
            format={formatRate}
          />

          <MiniLeaderboard
            title="Hits"
            rows={hitters}
            value={(row) => row.hits}
            format={(value) => formatNumber(value)}
          />

          <MiniLeaderboard
            title="Walks"
            rows={hitters}
            value={(row) => row.walks}
            format={(value) => formatNumber(value)}
          />
        </div>
      </section>

      {/* PITCHING */}
      <section className="border-y border-[#1A2842]/15 bg-[#EEE7DC]">
        <div className="mx-auto max-w-[1440px] px-5 py-12 md:px-8 md:py-16">
          <div className="mb-8 flex items-end justify-between">
            <div>
              <p className="font-mono text-[8px] font-bold uppercase tracking-[0.2em] text-[#D85F46]">
                02 / Defense
              </p>

              <h2 className="mt-2 text-3xl font-black uppercase tracking-[-0.05em] text-[#1A2842] md:text-4xl">
                Pitching Leaders
              </h2>
            </div>

            <span className="hidden font-mono text-[8px] font-bold uppercase tracking-[0.15em] text-[#9AA1AA] md:block">
              Minimum 10 IP
            </span>
          </div>

          <div className="grid gap-5 md:grid-cols-2">
            <LeaderboardCard
              eyebrow="Run Prevention"
              title="ERA"
              rows={pitchers}
              value={(row) => row.era}
              format={formatERA}
              lowerIsBetter
            />

            <LeaderboardCard
              eyebrow="Command"
              title="WHIP"
              rows={pitchers}
              value={(row) => row.whip}
              format={formatERA}
              lowerIsBetter
            />

            <LeaderboardCard
              eyebrow="Swing & Miss"
              title="Strikeouts"
              rows={pitchers}
              value={(row) => row.strikeouts_pitched}
              format={(value) => formatNumber(value)}
            />

            <LeaderboardCard
              eyebrow="Strikeout Rate"
              title="K / 9"
              rows={pitchers}
              value={getK9}
              format={(value) => formatNumber(value, 1)}
            />
          </div>

          <div className="mt-12 grid gap-8 md:grid-cols-2 lg:grid-cols-4">
            <MiniLeaderboard
              title="Wins"
              rows={pitchers}
              value={(row) => row.wins}
              format={(value) => formatNumber(value)}
            />

            <MiniLeaderboard
              title="Innings"
              rows={pitchers}
              value={(row) => row.innings_pitched}
              format={formatIP}
            />

            <MiniLeaderboard
              title="Strikeouts"
              rows={pitchers}
              value={(row) => row.strikeouts_pitched}
              format={(value) => formatNumber(value)}
            />

            <MiniLeaderboard
              title="Walks Allowed"
              rows={pitchers}
              value={(row) => row.walks_allowed}
              format={(value) => formatNumber(value)}
              lowerIsBetter
            />
          </div>
        </div>
      </section>

      {/* FOOTNOTE */}
      <section className="mx-auto max-w-[1440px] px-5 py-10 md:px-8">
        <div className="flex flex-col justify-between gap-4 border-t border-[#1A2842]/15 pt-5 md:flex-row">
          <p className="max-w-2xl text-[10px] leading-5 text-[#687384]">
            Leaderboards are calculated from the player statistics currently
            available in Offshore Break. Qualification thresholds are used to
            prevent small-sample performances from dominating rate statistics.
          </p>

          <Link
            href="/players"
            className="whitespace-nowrap text-[9px] font-black uppercase tracking-[0.15em] text-[#1A2842] transition hover:text-[#D85F46]"
          >
            Explore all players →
          </Link>
        </div>
      </section>
    </main>
  );
}