import type { Metadata } from "next";
import Link from "next/link";
import PlayerPicker from "@/components/PlayerPicker";
import { supabase } from "@/lib/supabaseClient";
import {
  fetchAll,
  formatAverage,
  formatDecimal,
  formatInnings,
  formatNumber,
  getThresholds,
  headshotSilo,
} from "@/lib/baseball";

/* ───────────────────────── Types ───────────────────────── */

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

type ComparePageProps = {
  searchParams: Promise<{ player1?: string; player2?: string }>;
};

const CORAL = "#D85F46";
const TEAL_DEEP = "#1F7A74";

/* ───────────────────────── Page title ───────────────────────── */

function toId(value?: string) {
  const id = value ? Number(value) : NaN;
  return Number.isFinite(id) ? id : null;
}

/* A shared link reads "Aaron Judge vs Shohei Ohtani" instead of a generic title */
export async function generateMetadata({
  searchParams,
}: ComparePageProps): Promise<Metadata> {
  const params = await searchParams;
  const first = toId(params.player1);
  const second = toId(params.player2);

  if (first !== null && second !== null) {
    const { data } = await supabase
      .from("Player")
      .select("id, name")
      .in("id", [first, second]);

    const nameOf = (id: number) =>
      data?.find((player: { id: number; name: string }) => player.id === id)
        ?.name;

    const a = nameOf(first);
    const b = nameOf(second);

    if (a && b) return { title: `${a} vs ${b}` };
  }

  return {
    title: "Compare Players",
    description:
      "Put two players side by side and compare their production, performance, and Offshore Profile.",
  };
}

/* ───────────────────────── Math helpers ───────────────────────── */

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

function getPercentile(
  value: number | null,
  population: (number | null)[],
  lowerIsBetter = false
) {
  if (value === null || value === undefined) return null;

  const valid = population.filter(
    (item): item is number => item !== null && Number.isFinite(item)
  );

  if (valid.length < 2) return 50;

  const better = valid.filter((item) =>
    lowerIsBetter ? item > value : item < value
  ).length;

  return Math.round((better / (valid.length - 1)) * 100);
}

function pitches(profile: PlayerProfile | null) {
  return (profile?.stat?.innings_pitched ?? 0) > 0;
}

function hits(profile: PlayerProfile | null) {
  return (profile?.stat?.at_bats ?? 0) > 0;
}

/* ───────────────────────── Components ───────────────────────── */

/** One comparison row. The better number is highlighted in that player's color. */
function StatRow({
  label,
  left,
  right,
  format,
  lowerIsBetter = false,
}: {
  label: string;
  left: number | null | undefined;
  right: number | null | undefined;
  format: (value: number | null | undefined) => string;
  lowerIsBetter?: boolean;
}) {
  const l = left ?? null;
  const r = right ?? null;

  const better: "left" | "right" | null =
    l === null || r === null || l === r
      ? null
      : (l > r) !== lowerIsBetter
        ? "left"
        : "right";

  return (
    <div className="grid grid-cols-[1fr_8rem_1fr] items-center border-b border-[#1A2842]/10 py-4 last:border-b-0">
      <div
        className="analytics-number text-right text-2xl font-black"
        style={{ color: better === "left" ? CORAL : "#1A2842" }}
      >
        {format(l)}
      </div>

      <div className="text-center">
        <span className="font-mono text-[0.75rem] font-black uppercase tracking-[0.15em] text-[#1F7A74]">
          {label}
        </span>
      </div>

      <div
        className="analytics-number text-2xl font-black"
        style={{ color: better === "right" ? TEAL_DEEP : "#1A2842" }}
      >
        {format(r)}
      </div>
    </div>
  );
}

function ProfileBar({
  label,
  leftValue,
  rightValue,
}: {
  label: string;
  leftValue: number | null;
  rightValue: number | null;
}) {
  const width = (value: number | null) =>
    `${Math.max(0, Math.min(100, value ?? 0))}%`;

  return (
    <div className="border-b border-white/10 py-6 last:border-b-0">
      <p className="mb-4 text-center text-[0.8rem] font-black uppercase tracking-[0.18em] text-[#59B3AD]">
        {label}
      </p>

      <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-5">
        <div className="text-right">
          <span className="analytics-number text-3xl font-black text-white">
            {leftValue ?? "—"}
          </span>
          <div className="ml-auto mt-2 h-2.5 overflow-hidden bg-white/10">
            <div
              className="ml-auto h-full bg-[#D85F46]"
              style={{ width: width(leftValue) }}
            />
          </div>
        </div>

        <span className="font-mono text-xs font-bold uppercase text-white/40">
          vs
        </span>

        <div>
          <span className="analytics-number text-3xl font-black text-white">
            {rightValue ?? "—"}
          </span>
          <div className="mt-2 h-2.5 overflow-hidden bg-white/10">
            <div
              className="h-full bg-[#59B3AD]"
              style={{ width: width(rightValue) }}
            />
          </div>
        </div>
      </div>
    </div>
  );
}

function PlayerHeaderCard({
  profile,
  slot,
}: {
  profile: PlayerProfile;
  slot: 1 | 2;
}) {
  const accent = slot === 1 ? CORAL : TEAL_DEEP;

  return (
    <Link
      href={`/players/${profile.player.id}`}
      className={`group relative block min-h-[12rem] overflow-hidden p-6 transition hover:bg-[#F8F3EA] ${
        slot === 1 ? "border-b border-[#1A2842]/15 md:border-b-0 md:border-r" : ""
      }`}
    >
      <img
        src={headshotSilo(profile.player.id)}
        alt=""
        aria-hidden="true"
        className="pointer-events-none absolute bottom-0 right-4 h-[95%] w-auto object-contain opacity-90 transition duration-500 group-hover:scale-[1.03]"
      />

      <div className="relative">
        <p
          className="font-mono text-[0.75rem] font-bold uppercase tracking-[0.18em]"
          style={{ color: accent }}
        >
          Player 0{slot}
        </p>

        <h2 className="mt-2 max-w-[70%] text-3xl font-black uppercase leading-none tracking-[-0.05em] text-[#1A2842] md:text-4xl">
          {profile.player.name}
        </h2>

        <div className="mt-4 flex flex-wrap items-center gap-2">
          <span className="font-mono text-xs font-bold uppercase tracking-[0.1em] text-[#1F7A74]">
            {profile.team?.abbreviation ?? "FREE AGENT"}
          </span>

          {profile.player.position && (
            <>
              <span
                className="h-1 w-1 rounded-full"
                style={{ backgroundColor: accent }}
              />
              <span className="font-mono text-xs font-bold uppercase tracking-[0.1em] text-[#1F7A74]">
                {profile.player.position}
              </span>
            </>
          )}
        </div>

        <span
          className="mt-6 inline-block text-sm font-bold transition-transform group-hover:translate-x-1"
          style={{ color: accent }}
        >
          Full profile →
        </span>
      </div>
    </Link>
  );
}

/* ───────────────────────── Page ───────────────────────── */

export default async function ComparePage({ searchParams }: ComparePageProps) {
  const params = await searchParams;

  const player1Id = toId(params.player1);
  const player2Id = toId(params.player2);

  /* Latest season (one row, not the whole table) */
  const { data: latest } = await supabase
    .from("PlayerStats")
    .select("season")
    .order("season", { ascending: false })
    .limit(1)
    .maybeSingle();

  const selectedSeason: number = latest?.season ?? new Date().getFullYear();

  /* Everything else, paged past Supabase's 1,000-row cap */
  const [players, stats, { data: teamsData }] = await Promise.all([
    fetchAll<Player>((from, to) =>
      supabase
        .from("Player")
        .select("id, name, team_id, position")
        .order("id")
        .range(from, to)
    ),
    fetchAll<PlayerStat>((from, to) =>
      supabase
        .from("PlayerStats")
        .select("*")
        .eq("season", selectedSeason)
        .order("player_id")
        .range(from, to)
    ),
    supabase.from("Teams").select("id, name, abbreviation"),
  ]);

  const teams = (teamsData ?? []) as Team[];
  const teamMap = new Map(teams.map((team) => [team.id, team]));
  const statMap = new Map(stats.map((stat) => [stat.player_id, stat]));

  /* The list both search boxes share: name + team, A to Z (built once) */
  const pickerPlayers = [...players]
    .sort((a, b) => a.name.localeCompare(b.name))
    .map((player) => ({
      id: player.id,
      name: player.name,
      team: player.team_id
        ? (teamMap.get(player.team_id)?.abbreviation ?? null)
        : null,
    }));

  function buildProfile(id: number | null): PlayerProfile | null {
    if (id === null) return null;

    const player = players.find((p) => p.id === id);
    if (!player) return null;

    return {
      player,
      team: player.team_id ? teamMap.get(player.team_id) ?? null : null,
      stat: statMap.get(player.id) ?? null,
    };
  }

  const profile1 = buildProfile(player1Id);
  const profile2 = buildProfile(player2Id);
  const hasComparison = profile1 !== null && profile2 !== null;

  /* Percentile pools: qualified players for the season */
  const { minAb, minIp } = getThresholds(stats);

  const hitterStats = stats.filter((s) => (s.at_bats ?? 0) >= minAb);
  const pitchingStats = stats.filter((s) => (s.innings_pitched ?? 0) >= minIp);

  const pools = {
    avg: hitterStats.map((s) => s.batting_avg),
    obp: hitterStats.map((s) => s.obp),
    ops: hitterStats.map((s) => s.ops),
    hrPerGame: hitterStats.map((s) =>
      s.games && s.home_runs !== null ? s.home_runs / s.games : null
    ),
    whip: pitchingStats.map((s) => s.whip),
    k9: pitchingStats.map((s) =>
      s.innings_pitched && s.strikeouts_pitched !== null
        ? (s.strikeouts_pitched / s.innings_pitched) * 9
        : null
    ),
  };

  function getProfile(profile: PlayerProfile | null) {
    const stat = profile?.stat;

    if (!stat) {
      return { power: null, contact: null, onBase: null, production: null, command: null, swingMiss: null };
    }

    return {
      power: getPercentile(
        stat.games && stat.home_runs !== null ? stat.home_runs / stat.games : null,
        pools.hrPerGame
      ),
      contact: getPercentile(stat.batting_avg, pools.avg),
      onBase: getPercentile(stat.obp, pools.obp),
      production: getPercentile(stat.ops, pools.ops),
      command: getPercentile(stat.whip, pools.whip, true),
      swingMiss: getPercentile(getK9(stat), pools.k9),
    };
  }

  const leftProfile = getProfile(profile1);
  const rightProfile = getProfile(profile2);

  const bothPitchers = pitches(profile1) && pitches(profile2);
  const showOffense = !bothPitchers || hits(profile1) || hits(profile2);

  return (
    <div className="bg-[#F8F3EA] text-[#1A2842]">
      {/* HERO */}
      <section className="paper-grid border-b border-[#1A2842]/15">
        <div className="container-page pb-12 pt-12 md:pb-16 md:pt-16">
          <div className="mb-5 flex items-center gap-3">
            <span className="h-[2px] w-10 bg-[#D85F46]" />
            <span className="font-mono text-[0.75rem] font-bold uppercase tracking-[0.22em] text-[#1F7A74]">
              Offshore Break / Head To Head
            </span>
          </div>

          <div className="flex flex-col justify-between gap-8 md:flex-row md:items-end">
            <div>
              <h1 className="text-[clamp(2.6rem,7vw,5.5rem)] font-black uppercase leading-[0.85] tracking-[-0.07em]">
                Player
                <br />
                <span className="text-[#D85F46]">Compare.</span>
              </h1>

              <p className="mt-6 max-w-xl text-base leading-7 text-[#687384]">
                Put two players side by side and see how their production,
                performance, and Offshore Profile stack up.
              </p>
            </div>

            <div className="border-l-2 border-[#59B3AD] pl-4">
              <p className="font-mono text-[0.7rem] font-bold uppercase tracking-[0.18em] text-[#1F7A74]">
                Comparison Season
              </p>
              <p className="analytics-number mt-1 text-3xl font-black">
                {selectedSeason}
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* SELECTORS */}
      <section className="container-page py-8 md:py-10">
        <form
          action="/compare"
          method="GET"
          className="grid gap-4 md:grid-cols-[1fr_auto_1fr] md:items-end"
        >
          <PlayerPicker
            players={pickerPlayers}
            label="Player One"
            name="player1"
            defaultValue={player1Id}
            accent="coral"
          />

          <div className="hidden h-12 items-center justify-center md:flex">
            <span className="text-lg font-black italic text-[#D85F46]">VS</span>
          </div>

          <PlayerPicker
            players={pickerPlayers}
            label="Player Two"
            name="player2"
            defaultValue={player2Id}
            accent="teal"
          />

          <button
            type="submit"
            className="h-12 bg-[#1A2842] px-7 text-[0.8rem] font-black uppercase tracking-[0.16em] text-white transition hover:bg-[#D85F46] md:col-span-3"
          >
            Compare Players
          </button>
        </form>
      </section>

      {!hasComparison ? (
        <section className="container-page pb-20">
          <div className="border border-dashed border-[#1A2842]/20 bg-white px-6 py-20 text-center">
            <p className="font-mono text-[0.75rem] font-bold uppercase tracking-[0.2em] text-[#1F7A74]">
              Data Desk Ready
            </p>

            <h2 className="mt-3 text-3xl font-black uppercase tracking-[-0.04em]">
              Select two players
            </h2>

            <p className="mx-auto mt-3 max-w-md text-base leading-7 text-[#687384]">
              Choose two players above to generate a side-by-side comparison
              using the current Offshore Break season.
            </p>
          </div>
        </section>
      ) : (
        <>
          {/* PLAYER HEADERS */}
          <section className="container-page pb-10">
            <div className="grid overflow-hidden border border-[#1A2842]/15 bg-white md:grid-cols-2">
              <PlayerHeaderCard profile={profile1} slot={1} />
              <PlayerHeaderCard profile={profile2} slot={2} />
            </div>
          </section>

          {/* OFFENSE */}
          {showOffense && (
            <section className="container-page pb-16">
              <div className="mb-6">
                <p className="font-mono text-[0.75rem] font-bold uppercase tracking-[0.2em] text-[#1F7A74]">
                  01 / Offense
                </p>
                <h2 className="mt-2 text-4xl font-black uppercase tracking-[-0.05em]">
                  Production
                </h2>
                <p className="mt-2 text-sm text-[#687384]">
                  The better number in each row is highlighted.
                </p>
              </div>

              <div className="border-t-2 border-[#1A2842] bg-white px-5 md:px-10">
                <StatRow label="AVG" left={profile1.stat?.batting_avg} right={profile2.stat?.batting_avg} format={formatAverage} />
                <StatRow label="OBP" left={profile1.stat?.obp} right={profile2.stat?.obp} format={formatAverage} />
                <StatRow label="SLG" left={profile1.stat?.slg} right={profile2.stat?.slg} format={formatAverage} />
                <StatRow label="OPS" left={profile1.stat?.ops} right={profile2.stat?.ops} format={formatAverage} />
                <StatRow label="HOME RUNS" left={profile1.stat?.home_runs} right={profile2.stat?.home_runs} format={formatNumber} />
                <StatRow label="RBI" left={profile1.stat?.rbi} right={profile2.stat?.rbi} format={formatNumber} />
                <StatRow label="HITS" left={profile1.stat?.hits} right={profile2.stat?.hits} format={formatNumber} />
                <StatRow label="WALKS" left={profile1.stat?.walks} right={profile2.stat?.walks} format={formatNumber} />
                <StatRow label="STRIKEOUTS" left={profile1.stat?.strikeouts} right={profile2.stat?.strikeouts} format={formatNumber} lowerIsBetter />
              </div>
            </section>
          )}

          {/* PROFILE */}
          <section className="bg-[#101A2C] text-white">
            <div className="container-page py-14 md:py-20">
              <div className="mb-10">
                <p className="font-mono text-[0.75rem] font-bold uppercase tracking-[0.2em] text-[#59B3AD]">
                  02 / Offshore Profile
                </p>

                <h2 className="mt-2 text-4xl font-black uppercase tracking-[-0.05em]">
                  Head To Head
                </h2>

                <p className="mt-3 max-w-xl text-base leading-7 text-white/60">
                  Percentiles compare each player against qualified players in
                  the {selectedSeason} season ({minAb}+ AB for hitters, {minIp}+
                  IP for pitchers).
                </p>

                <div className="mt-6 grid grid-cols-2 gap-5 border-t border-white/15 pt-5">
                  <p className="text-right text-lg font-black uppercase text-[#D85F46]">
                    {profile1.player.name}
                  </p>
                  <p className="text-lg font-black uppercase text-[#59B3AD]">
                    {profile2.player.name}
                  </p>
                </div>
              </div>

              <div className="border-t border-white/15">
                {showOffense && (
                  <>
                    <ProfileBar label="Power" leftValue={leftProfile.power} rightValue={rightProfile.power} />
                    <ProfileBar label="Contact" leftValue={leftProfile.contact} rightValue={rightProfile.contact} />
                    <ProfileBar label="On base" leftValue={leftProfile.onBase} rightValue={rightProfile.onBase} />
                    <ProfileBar label="Production" leftValue={leftProfile.production} rightValue={rightProfile.production} />
                  </>
                )}

                {bothPitchers && (
                  <>
                    <ProfileBar label="Command" leftValue={leftProfile.command} rightValue={rightProfile.command} />
                    <ProfileBar label="Swing & miss" leftValue={leftProfile.swingMiss} rightValue={rightProfile.swingMiss} />
                  </>
                )}
              </div>
            </div>
          </section>

          {/* PITCHING */}
          {bothPitchers && (
            <section className="container-page py-16">
              <div className="mb-6">
                <p className="font-mono text-[0.75rem] font-bold uppercase tracking-[0.2em] text-[#1F7A74]">
                  03 / Pitching
                </p>
                <h2 className="mt-2 text-4xl font-black uppercase tracking-[-0.05em]">
                  Pitching Matchup
                </h2>
              </div>

              <div className="border-t-2 border-[#1A2842] bg-white px-5 md:px-10">
                <StatRow label="ERA" left={profile1.stat?.era} right={profile2.stat?.era} format={formatDecimal} lowerIsBetter />
                <StatRow label="WHIP" left={profile1.stat?.whip} right={profile2.stat?.whip} format={formatDecimal} lowerIsBetter />
                <StatRow label="INNINGS" left={profile1.stat?.innings_pitched} right={profile2.stat?.innings_pitched} format={formatInnings} />
                <StatRow label="STRIKEOUTS" left={profile1.stat?.strikeouts_pitched} right={profile2.stat?.strikeouts_pitched} format={formatNumber} />
                <StatRow label="K / 9" left={getK9(profile1.stat)} right={getK9(profile2.stat)} format={formatDecimal} />
                <StatRow label="WINS" left={profile1.stat?.wins} right={profile2.stat?.wins} format={formatNumber} />
                <StatRow label="LOSSES" left={profile1.stat?.losses} right={profile2.stat?.losses} format={formatNumber} lowerIsBetter />
              </div>
            </section>
          )}

          {/* FOOTER LINKS */}
          <section className="border-t border-[#1A2842]/15 bg-[#EEE7DC]">
            <div className="container-page py-12">
              <div className="grid gap-8 md:grid-cols-2">
                <div>
                  <p className="font-mono text-[0.75rem] font-bold uppercase tracking-[0.2em] text-[#D85F46]">
                    Player 01
                  </p>
                  <Link
                    href={`/players/${profile1.player.id}`}
                    className="mt-3 block text-2xl font-black uppercase tracking-[-0.04em] hover:text-[#D85F46]"
                  >
                    View {profile1.player.name}
                    {"'"}s full profile →
                  </Link>
                </div>

                <div>
                  <p className="font-mono text-[0.75rem] font-bold uppercase tracking-[0.2em] text-[#1F7A74]">
                    Player 02
                  </p>
                  <Link
                    href={`/players/${profile2.player.id}`}
                    className="mt-3 block text-2xl font-black uppercase tracking-[-0.04em] hover:text-[#1F7A74]"
                  >
                    View {profile2.player.name}
                    {"'"}s full profile →
                  </Link>
                </div>
              </div>

              <div className="mt-10 border-t border-[#1A2842]/15 pt-5">
                <p className="font-mono text-[0.75rem] font-semibold uppercase tracking-[0.15em] text-[#1F7A74]">
                  Offshore Break / {selectedSeason} comparison / traditional
                  player data
                </p>
              </div>
            </div>
          </section>
        </>
      )}
    </div>
  );
}
