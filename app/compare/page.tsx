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

type PlayerProfile = {
  player: Player;
  team: Team | null;
  stat: PlayerStat | null;
};

const currentYear = new Date().getFullYear();

function formatRate(value: number | null) {
  if (value === null || value === undefined) return "—";
  return value.toFixed(3).replace(/^0/, "");
}

function formatNumber(value: number | null) {
  if (value === null || value === undefined) return "—";
  return value.toLocaleString();
}

function formatERA(value: number | null) {
  if (value === null || value === undefined) return "—";
  return value.toFixed(2);
}

function formatIP(value: number | null) {
  if (value === null || value === undefined) return "—";
  return value.toFixed(1);
}

function getK9(stat: PlayerStat | null) {
  if (
    !stat ||
    stat.strikeouts_pitched === null ||
    stat.innings_pitched === null ||
    stat.innings_pitched === 0
  ) {
    return null;
  }

  return (stat.strikeouts_pitched / stat.innings_pitched) * 9;
}

function getBBRate(stat: PlayerStat | null) {
  if (!stat || !stat.at_bats || stat.at_bats === 0 || stat.walks === null) {
    return null;
  }

  return (stat.walks / stat.at_bats) * 100;
}

function getKRate(stat: PlayerStat | null) {
  if (
    !stat ||
    !stat.at_bats ||
    stat.at_bats === 0 ||
    stat.strikeouts === null
  ) {
    return null;
  }

  return (stat.strikeouts / stat.at_bats) * 100;
}

function getPercentile(
  value: number | null,
  population: (number | null)[],
  lowerIsBetter = false
) {
  if (value === null || value === undefined) return null;

  const valid = population.filter(
    (item): item is number =>
      item !== null && item !== undefined && Number.isFinite(item)
  );

  if (valid.length < 2) return 50;

  const better = valid.filter((item) =>
    lowerIsBetter ? item > value : item < value
  ).length;

  return Math.round((better / (valid.length - 1)) * 100);
}

function ProfileBar({
  label,
  left,
  right,
  leftValue,
  rightValue,
}: {
  label: string;
  left: string;
  right: string;
  leftValue: number | null;
  rightValue: number | null;
}) {
  return (
    <div className="border-b border-white/10 py-5 last:border-b-0">
      <div className="mb-3 flex items-center justify-between gap-4">
        <span className="text-[9px] font-black uppercase tracking-[0.15em] text-white/45">
          {label}
        </span>

        <span className="font-mono text-[8px] font-bold uppercase tracking-[0.12em] text-white/25">
          LEAGUE PERCENTILE
        </span>
      </div>

      <div className="grid grid-cols-[1fr_70px_1fr] items-center gap-4">
        <div className="text-right">
          <span className="analytics-number text-[15px] font-black text-white">
            {leftValue !== null ? leftValue : "—"}
          </span>

          <div className="mt-2 ml-auto h-2 max-w-[240px] overflow-hidden bg-white/10">
            <div
              className="ml-auto h-full bg-[#D85F46]"
              style={{
                width: `${Math.max(0, Math.min(100, leftValue ?? 0))}%`,
              }}
            />
          </div>

          <p className="mt-1 text-[8px] font-bold uppercase tracking-[0.08em] text-white/35">
            {left}
          </p>
        </div>

        <div className="text-center">
          <span className="font-mono text-[8px] font-black uppercase tracking-[0.15em] text-[#59B3AD]">
            {label}
          </span>
        </div>

        <div>
          <span className="analytics-number text-[15px] font-black text-white">
            {rightValue !== null ? rightValue : "—"}
          </span>

          <div className="mt-2 h-2 max-w-[240px] overflow-hidden bg-white/10">
            <div
              className="h-full bg-[#59B3AD]"
              style={{
                width: `${Math.max(0, Math.min(100, rightValue ?? 0))}%`,
              }}
            />
          </div>

          <p className="mt-1 text-[8px] font-bold uppercase tracking-[0.08em] text-white/35">
            {right}
          </p>
        </div>
      </div>
    </div>
  );
}

function ComparisonRow({
  label,
  left,
  right,
  leftClass = "",
  rightClass = "",
}: {
  label: string;
  left: string;
  right: string;
  leftClass?: string;
  rightClass?: string;
}) {
  return (
    <div className="grid grid-cols-[1fr_100px_1fr] items-center border-b border-[#1A2842]/10 py-4 last:border-b-0">
      <div
        className={`analytics-number text-right text-[17px] font-black text-[#1A2842] ${leftClass}`}
      >
        {left}
      </div>

      <div className="text-center">
        <span className="font-mono text-[8px] font-black uppercase tracking-[0.15em] text-[#9AA1AA]">
          {label}
        </span>
      </div>

      <div
        className={`analytics-number text-[17px] font-black text-[#1A2842] ${rightClass}`}
      >
        {right}
      </div>
    </div>
  );
}

export default async function ComparePage({
  searchParams,
}: {
  searchParams: Promise<{
    player1?: string;
    player2?: string;
  }>;
}) {
  const params = await searchParams;

  const player1Id = params.player1
    ? Number(params.player1)
    : null;

  const player2Id = params.player2
    ? Number(params.player2)
    : null;

  const { data: playersData } = await supabase
    .from("Player")
    .select("id, name, team_id, position")
    .order("name", { ascending: true });

  const { data: teamsData } = await supabase
    .from("Teams")
    .select("id, name, abbreviation");

  const players = (playersData ?? []) as Player[];
  const teams = (teamsData ?? []) as Team[];

  const teamMap = new Map(
    teams.map((team) => [team.id, team])
  );

  let selectedSeason = currentYear;

  const { data: seasonData } = await supabase
    .from("PlayerStats")
    .select("season")
    .order("season", { ascending: false });

  if (seasonData && seasonData.length > 0) {
    const seasons = Array.from(
      new Set(
        seasonData
          .map((row) => row.season)
          .filter(
            (season): season is number =>
              typeof season === "number"
          )
      )
    );

    if (seasons.length > 0) {
      selectedSeason = seasons[0];
    }
  }

  const { data: statsData } = await supabase
    .from("PlayerStats")
    .select("*")
    .eq("season", selectedSeason);

  const stats = (statsData ?? []) as PlayerStat[];

  const statMap = new Map(
    stats.map((stat) => [stat.player_id, stat])
  );

  const profile1: PlayerProfile | null = player1Id
    ? (() => {
        const player = players.find((p) => p.id === player1Id);

        if (!player) return null;

        return {
          player,
          team: player.team_id
            ? teamMap.get(player.team_id) ?? null
            : null,
          stat: statMap.get(player.id) ?? null,
        };
      })()
    : null;

  const profile2: PlayerProfile | null = player2Id
    ? (() => {
        const player = players.find((p) => p.id === player2Id);

        if (!player) return null;

        return {
          player,
          team: player.team_id
            ? teamMap.get(player.team_id) ?? null
            : null,
          stat: statMap.get(player.id) ?? null,
        };
      })()
    : null;

  const hitterStats = stats.filter(
    (stat) =>
      stat.at_bats !== null &&
      stat.at_bats >= 50
  );

  const pitchingStats = stats.filter(
    (stat) =>
      stat.innings_pitched !== null &&
      stat.innings_pitched >= 10
  );

  const avgPopulation = hitterStats.map(
    (stat) => stat.batting_avg
  );

  const obpPopulation = hitterStats.map(
    (stat) => stat.obp
  );

  const slgPopulation = hitterStats.map(
    (stat) => stat.slg
  );

  const opsPopulation = hitterStats.map(
    (stat) => stat.ops
  );

  const hrGamePopulation = hitterStats.map((stat) =>
    stat.games && stat.home_runs !== null
      ? stat.home_runs / stat.games
      : null
  );

  const rbiGamePopulation = hitterStats.map((stat) =>
    stat.games && stat.rbi !== null
      ? stat.rbi / stat.games
      : null
  );

  const bbRatePopulation = hitterStats.map((stat) =>
    stat.at_bats && stat.walks !== null
      ? (stat.walks / stat.at_bats) * 100
      : null
  );

  const kAvoidancePopulation = hitterStats.map((stat) =>
    stat.at_bats && stat.strikeouts !== null
      ? 100 - (stat.strikeouts / stat.at_bats) * 100
      : null
  );

  const eraPopulation = pitchingStats.map(
    (stat) => stat.era
  );

  const whipPopulation = pitchingStats.map(
    (stat) => stat.whip
  );

  const k9Population = pitchingStats.map((stat) =>
    stat.innings_pitched && stat.strikeouts_pitched !== null
      ? (stat.strikeouts_pitched / stat.innings_pitched) * 9
      : null
  );

  const getProfile = (profile: PlayerProfile | null) => {
    const stat = profile?.stat;

    if (!stat) {
      return {
        power: null,
        contact: null,
        onBase: null,
        production: null,
        command: null,
        swingMiss: null,
      };
    }

    return {
      power: getPercentile(
        stat.games && stat.home_runs !== null
          ? stat.home_runs / stat.games
          : null,
        hrGamePopulation
      ),

      contact: getPercentile(
        stat.batting_avg,
        avgPopulation
      ),

      onBase: getPercentile(
        stat.obp,
        obpPopulation
      ),

      production: getPercentile(
        stat.ops,
        opsPopulation
      ),

      command: getPercentile(
        stat.whip,
        whipPopulation,
        true
      ),

      swingMiss: getPercentile(
        getK9(stat),
        k9Population
      ),
    };
  };

  const leftProfile = getProfile(profile1);
  const rightProfile = getProfile(profile2);

  const isBothPitchers =
    profile1?.stat?.innings_pitched !== null &&
    profile1?.stat?.innings_pitched !== undefined &&
    profile1?.stat?.innings_pitched > 0 &&
    profile2?.stat?.innings_pitched !== null &&
    profile2?.stat?.innings_pitched !== undefined &&
    profile2?.stat?.innings_pitched > 0;

  const hasComparison =
    profile1 !== null &&
    profile2 !== null;

  return (
    <main className="min-h-screen bg-[#F8F3EA]">
      {/* HERO */}
      <section className="paper-grid border-b border-[#1A2842]/15">
        <div className="mx-auto max-w-[1440px] px-5 pb-12 pt-12 md:px-8 md:pb-16 md:pt-16">
          <div className="mb-5 flex items-center gap-3">
            <span className="h-[2px] w-10 bg-[#D85F46]" />

            <span className="font-mono text-[9px] font-bold uppercase tracking-[0.22em] text-[#687384]">
              Offshore Break / Head To Head
            </span>
          </div>

          <div className="flex flex-col justify-between gap-8 md:flex-row md:items-end">
            <div>
              <h1 className="text-[clamp(42px,7vw,86px)] font-black uppercase leading-[0.85] tracking-[-0.07em] text-[#1A2842]">
                Player
                <br />
                <span className="text-[#D85F46]">Compare.</span>
              </h1>

              <p className="mt-6 max-w-xl text-sm leading-6 text-[#687384]">
                Put two players side by side and see how their production,
                performance, and Offshore Profile stack up.
              </p>
            </div>

            <div className="border-l-2 border-[#59B3AD] pl-4">
              <p className="font-mono text-[8px] font-bold uppercase tracking-[0.18em] text-[#687384]">
                Comparison Season
              </p>

              <p className="analytics-number mt-1 text-2xl font-black text-[#1A2842]">
                {selectedSeason}
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* PLAYER SELECTORS */}
      <section className="mx-auto max-w-[1440px] px-5 py-8 md:px-8 md:py-10">
        <form
          action="/compare"
          method="GET"
          className="grid gap-4 md:grid-cols-[1fr_auto_1fr] md:items-end"
        >
          <div>
            <label
              htmlFor="player1"
              className="mb-2 block font-mono text-[8px] font-bold uppercase tracking-[0.18em] text-[#687384]"
            >
              Player One
            </label>

            <select
              id="player1"
              name="player1"
              defaultValue={player1Id ?? ""}
              className="h-12 w-full border border-[#1A2842]/20 bg-white px-4 text-[11px] font-black uppercase tracking-[0.04em] text-[#1A2842] outline-none transition focus:border-[#D85F46]"
            >
              <option value="">Select player</option>

              {players.map((player) => (
                <option key={player.id} value={player.id}>
                  {player.name}
                </option>
              ))}
            </select>
          </div>

          <div className="hidden h-12 items-center justify-center md:flex">
            <span className="font-black italic text-[#D85F46]">
              VS
            </span>
          </div>

          <div>
            <label
              htmlFor="player2"
              className="mb-2 block font-mono text-[8px] font-bold uppercase tracking-[0.18em] text-[#687384]"
            >
              Player Two
            </label>

            <select
              id="player2"
              name="player2"
              defaultValue={player2Id ?? ""}
              className="h-12 w-full border border-[#1A2842]/20 bg-white px-4 text-[11px] font-black uppercase tracking-[0.04em] text-[#1A2842] outline-none transition focus:border-[#59B3AD]"
            >
              <option value="">Select player</option>

              {players.map((player) => (
                <option key={player.id} value={player.id}>
                  {player.name}
                </option>
              ))}
            </select>
          </div>

          <button
            type="submit"
            className="h-12 bg-[#1A2842] px-7 text-[9px] font-black uppercase tracking-[0.16em] text-white transition hover:bg-[#D85F46] md:col-span-3"
          >
            Compare Players
          </button>
        </form>
      </section>

      {!hasComparison ? (
        <section className="mx-auto max-w-[1440px] px-5 pb-20 md:px-8">
          <div className="border border-dashed border-[#1A2842]/20 bg-white px-6 py-20 text-center">
            <p className="font-mono text-[9px] font-bold uppercase tracking-[0.2em] text-[#59B3AD]">
              Data Desk Ready
            </p>

            <h2 className="mt-3 text-2xl font-black uppercase tracking-[-0.04em] text-[#1A2842]">
              Select two players
            </h2>

            <p className="mx-auto mt-3 max-w-md text-xs leading-5 text-[#687384]">
              Choose two players above to generate a side-by-side comparison
              using the current Offshore Break season.
            </p>
          </div>
        </section>
      ) : (
        <>
          {/* PLAYER HEADERS */}
          <section className="mx-auto max-w-[1440px] px-5 pb-10 md:px-8">
            <div className="grid overflow-hidden border border-[#1A2842]/15 bg-white md:grid-cols-2">
              <Link
                href={`/players/${profile1.player.id}`}
                className="group border-b border-[#1A2842]/15 p-6 transition hover:bg-[#F8F3EA] md:border-b-0 md:border-r"
              >
                <div className="flex items-end justify-between gap-6">
                  <div>
                    <p className="font-mono text-[8px] font-bold uppercase tracking-[0.18em] text-[#D85F46]">
                      PLAYER 01
                    </p>

                    <h2 className="mt-2 text-3xl font-black uppercase leading-none tracking-[-0.05em] text-[#1A2842] md:text-4xl">
                      {profile1.player.name}
                    </h2>

                    <div className="mt-4 flex flex-wrap items-center gap-2">
                      <span className="font-mono text-[8px] font-bold uppercase tracking-[0.1em] text-[#687384]">
                        {profile1.team?.abbreviation ?? "FREE AGENT"}
                      </span>

                      {profile1.player.position && (
                        <>
                          <span className="h-1 w-1 rounded-full bg-[#D85F46]" />

                          <span className="font-mono text-[8px] font-bold uppercase tracking-[0.1em] text-[#687384]">
                            {profile1.player.position}
                          </span>
                        </>
                      )}
                    </div>
                  </div>

                  <span className="font-black text-[#D85F46] transition-transform group-hover:translate-x-1">
                    →
                  </span>
                </div>
              </Link>

              <Link
                href={`/players/${profile2.player.id}`}
                className="group p-6 transition hover:bg-[#F8F3EA]"
              >
                <div className="flex items-end justify-between gap-6">
                  <div>
                    <p className="font-mono text-[8px] font-bold uppercase tracking-[0.18em] text-[#59B3AD]">
                      PLAYER 02
                    </p>

                    <h2 className="mt-2 text-3xl font-black uppercase leading-none tracking-[-0.05em] text-[#1A2842] md:text-4xl">
                      {profile2.player.name}
                    </h2>

                    <div className="mt-4 flex flex-wrap items-center gap-2">
                      <span className="font-mono text-[8px] font-bold uppercase tracking-[0.1em] text-[#687384]">
                        {profile2.team?.abbreviation ?? "FREE AGENT"}
                      </span>

                      {profile2.player.position && (
                        <>
                          <span className="h-1 w-1 rounded-full bg-[#59B3AD]" />

                          <span className="font-mono text-[8px] font-bold uppercase tracking-[0.1em] text-[#687384]">
                            {profile2.player.position}
                          </span>
                        </>
                      )}
                    </div>
                  </div>

                  <span className="font-black text-[#59B3AD] transition-transform group-hover:translate-x-1">
                    →
                  </span>
                </div>
              </Link>
            </div>
          </section>

          {/* OFFENSE COMPARISON */}
          <section className="mx-auto max-w-[1440px] px-5 pb-16 md:px-8">
            <div className="mb-6">
              <p className="font-mono text-[8px] font-bold uppercase tracking-[0.2em] text-[#59B3AD]">
                01 / Offense
              </p>

              <h2 className="mt-2 text-3xl font-black uppercase tracking-[-0.05em] text-[#1A2842]">
                Production
              </h2>
            </div>

            <div className="border-t-2 border-[#1A2842] bg-white px-5 md:px-10">
              <ComparisonRow
                label="AVG"
                left={formatRate(profile1.stat?.batting_avg ?? null)}
                right={formatRate(profile2.stat?.batting_avg ?? null)}
              />

              <ComparisonRow
                label="OBP"
                left={formatRate(profile1.stat?.obp ?? null)}
                right={formatRate(profile2.stat?.obp ?? null)}
              />

              <ComparisonRow
                label="SLG"
                left={formatRate(profile1.stat?.slg ?? null)}
                right={formatRate(profile2.stat?.slg ?? null)}
              />

              <ComparisonRow
                label="OPS"
                left={formatRate(profile1.stat?.ops ?? null)}
                right={formatRate(profile2.stat?.ops ?? null)}
              />

              <ComparisonRow
                label="HOME RUNS"
                left={formatNumber(profile1.stat?.home_runs ?? null)}
                right={formatNumber(profile2.stat?.home_runs ?? null)}
              />

              <ComparisonRow
                label="RBI"
                left={formatNumber(profile1.stat?.rbi ?? null)}
                right={formatNumber(profile2.stat?.rbi ?? null)}
              />

              <ComparisonRow
                label="HITS"
                left={formatNumber(profile1.stat?.hits ?? null)}
                right={formatNumber(profile2.stat?.hits ?? null)}
              />

              <ComparisonRow
                label="WALKS"
                left={formatNumber(profile1.stat?.walks ?? null)}
                right={formatNumber(profile2.stat?.walks ?? null)}
              />

              <ComparisonRow
                label="STRIKEOUTS"
                left={formatNumber(profile1.stat?.strikeouts ?? null)}
                right={formatNumber(profile2.stat?.strikeouts ?? null)}
              />
            </div>
          </section>

          {/* PROFILE */}
          <section className="bg-[#101A2C]">
            <div className="mx-auto max-w-[1440px] px-5 py-14 md:px-8 md:py-20">
              <div className="mb-10">
                <p className="font-mono text-[8px] font-bold uppercase tracking-[0.2em] text-[#59B3AD]">
                  02 / Offshore Profile
                </p>

                <h2 className="mt-2 text-3xl font-black uppercase tracking-[-0.05em] text-white md:text-4xl">
                  Head To Head
                </h2>

                <p className="mt-3 max-w-xl text-xs leading-5 text-white/40">
                  Percentiles compare each player's available season statistics
                  against the qualifying player pool in Offshore Break.
                </p>
              </div>

              <div className="border-t border-white/15">
                <ProfileBar
                  label="POWER"
                  left={profile1.player.name}
                  right={profile2.player.name}
                  leftValue={leftProfile.power}
                  rightValue={rightProfile.power}
                />

                <ProfileBar
                  label="CONTACT"
                  left={profile1.player.name}
                  right={profile2.player.name}
                  leftValue={leftProfile.contact}
                  rightValue={rightProfile.contact}
                />

                <ProfileBar
                  label="ON BASE"
                  left={profile1.player.name}
                  right={profile2.player.name}
                  leftValue={leftProfile.onBase}
                  rightValue={rightProfile.onBase}
                />

                <ProfileBar
                  label="PRODUCTION"
                  left={profile1.player.name}
                  right={profile2.player.name}
                  leftValue={leftProfile.production}
                  rightValue={rightProfile.production}
                />

                {isBothPitchers && (
                  <>
                    <ProfileBar
                      label="COMMAND"
                      left={profile1.player.name}
                      right={profile2.player.name}
                      leftValue={leftProfile.command}
                      rightValue={rightProfile.command}
                    />

                    <ProfileBar
                      label="SWING & MISS"
                      left={profile1.player.name}
                      right={profile2.player.name}
                      leftValue={leftProfile.swingMiss}
                      rightValue={rightProfile.swingMiss}
                    />
                  </>
                )}
              </div>
            </div>
          </section>

          {/* PITCHING */}
          {isBothPitchers && (
            <section className="mx-auto max-w-[1440px] px-5 py-16 md:px-8">
              <div className="mb-6">
                <p className="font-mono text-[8px] font-bold uppercase tracking-[0.2em] text-[#D85F46]">
                  03 / Pitching
                </p>

                <h2 className="mt-2 text-3xl font-black uppercase tracking-[-0.05em] text-[#1A2842]">
                  Pitching Matchup
                </h2>
              </div>

              <div className="border-t-2 border-[#1A2842] bg-white px-5 md:px-10">
                <ComparisonRow
                  label="ERA"
                  left={formatERA(profile1.stat?.era ?? null)}
                  right={formatERA(profile2.stat?.era ?? null)}
                />

                <ComparisonRow
                  label="WHIP"
                  left={formatERA(profile1.stat?.whip ?? null)}
                  right={formatERA(profile2.stat?.whip ?? null)}
                />

                <ComparisonRow
                  label="INNINGS"
                  left={formatIP(profile1.stat?.innings_pitched ?? null)}
                  right={formatIP(profile2.stat?.innings_pitched ?? null)}
                />

                <ComparisonRow
                  label="STRIKEOUTS"
                  left={formatNumber(
                    profile1.stat?.strikeouts_pitched ?? null
                  )}
                  right={formatNumber(
                    profile2.stat?.strikeouts_pitched ?? null
                  )}
                />

                <ComparisonRow
                  label="K / 9"
                  left={formatNumber(getK9(profile1.stat),)}
                  right={formatNumber(getK9(profile2.stat))}
                />

                <ComparisonRow
                  label="WINS"
                  left={formatNumber(profile1.stat?.wins ?? null)}
                  right={formatNumber(profile2.stat?.wins ?? null)}
                />

                <ComparisonRow
                  label="LOSSES"
                  left={formatNumber(profile1.stat?.losses ?? null)}
                  right={formatNumber(profile2.stat?.losses ?? null)}
                />
              </div>
            </section>
          )}

          {/* SEASON SNAPSHOT */}
          <section className="border-t border-[#1A2842]/15 bg-[#EEE7DC]">
            <div className="mx-auto max-w-[1440px] px-5 py-12 md:px-8">
              <div className="grid gap-8 md:grid-cols-2">
                <div>
                  <p className="font-mono text-[8px] font-bold uppercase tracking-[0.2em] text-[#D85F46]">
                    Player 01
                  </p>

                  <Link
                    href={`/players/${profile1.player.id}`}
                    className="mt-3 block text-xl font-black uppercase tracking-[-0.04em] text-[#1A2842] hover:text-[#D85F46]"
                  >
                    View {profile1.player.name}
                    {"'"}s full profile →
                  </Link>
                </div>

                <div>
                  <p className="font-mono text-[8px] font-bold uppercase tracking-[0.2em] text-[#59B3AD]">
                    Player 02
                  </p>

                  <Link
                    href={`/players/${profile2.player.id}`}
                    className="mt-3 block text-xl font-black uppercase tracking-[-0.04em] text-[#1A2842] hover:text-[#59B3AD]"
                  >
                    View {profile2.player.name}
                    {"'"}s full profile →
                  </Link>
                </div>
              </div>

              <div className="mt-10 border-t border-[#1A2842]/15 pt-5">
                <p className="font-mono text-[8px] uppercase tracking-[0.15em] text-[#687384]">
                  OFFSHORE BREAK / {selectedSeason} COMPARISON / TRADITIONAL
                  PLAYER DATA
                </p>
              </div>
            </div>
          </section>
        </>
      )}
    </main>
  );
}