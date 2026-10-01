"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabaseClient";

const SEASON = 2026;

type Player = {
  id: number;
  name: string;
  team_id: string;
  position: string;
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

type PlayerRow = Player & {
  stats?: PlayerStat;
  team?: Team;
};

type Category = {
  key: keyof PlayerStat;
  label: string;
  shortLabel: string;
  type: "hitting" | "pitching";
  format: "number" | "average" | "decimal" | "innings";
  direction: "high" | "low";
};

const TEAM_COLORS: Record<string, { primary: string; secondary: string }> = {
  "Arizona Diamondbacks": { primary: "#A71930", secondary: "#2A9D8F" },
  "Atlanta Braves": { primary: "#13274F", secondary: "#CE1141" },
  "Baltimore Orioles": { primary: "#000000", secondary: "#DF4601" },
  "Boston Red Sox": { primary: "#0C2340", secondary: "#BD3039" },
  "Chicago Cubs": { primary: "#0E3386", secondary: "#CC3433" },
  "Chicago White Sox": { primary: "#000000", secondary: "#C4CED4" },
  "Cincinnati Reds": { primary: "#C6011F", secondary: "#000000" },
  "Cleveland Guardians": { primary: "#E50022", secondary: "#00385D" },
  "Colorado Rockies": { primary: "#333366", secondary: "#7663A8" },
  "Detroit Tigers": { primary: "#0C2340", secondary: "#FA4616" },
  "Houston Astros": { primary: "#002D62", secondary: "#EB6E1F" },
  "Kansas City Royals": { primary: "#004687", secondary: "#BD9B60" },
  "Los Angeles Angels": { primary: "#003263", secondary: "#BA0021" },
  "Los Angeles Dodgers": { primary: "#005A9C", secondary: "#D6E7F5" },
  "Miami Marlins": { primary: "#00A3E0", secondary: "#7CC7E8" },
  "Milwaukee Brewers": { primary: "#12284B", secondary: "#FFC52F" },
  "Minnesota Twins": { primary: "#002B5C", secondary: "#D31145" },
  "New York Mets": { primary: "#002D72", secondary: "#FF5910" },
  "New York Yankees": { primary: "#000000", secondary: "#C4CED4" },
  "Oakland Athletics": { primary: "#003831", secondary: "#EFB21E" },
  "Philadelphia Phillies": { primary: "#E81828", secondary: "#006BB6" },
  "Pittsburgh Pirates": { primary: "#27251F", secondary: "#FDB827" },
  "San Diego Padres": { primary: "#2F241D", secondary: "#FFC425" },
  "San Francisco Giants": { primary: "#000000", secondary: "#FD5A1E" },
  "Seattle Mariners": { primary: "#0C2C56", secondary: "#59B3AD" },
  "St. Louis Cardinals": { primary: "#0A2240", secondary: "#C41E3A" },
  "Tampa Bay Rays": { primary: "#092C5C", secondary: "#8FBCE6" },
  "Texas Rangers": { primary: "#003278", secondary: "#C9DDF2" },
  "Toronto Blue Jays": { primary: "#134A8E", secondary: "#13294B" },
  "Washington Nationals": { primary: "#AB0003", secondary: "#11225B" },
};

const hittingCategories: Category[] = [
  {
    key: "ops",
    label: "On-Base Plus Slugging",
    shortLabel: "OPS",
    type: "hitting",
    format: "average",
    direction: "high",
  },
  {
    key: "batting_avg",
    label: "Batting Average",
    shortLabel: "AVG",
    type: "hitting",
    format: "average",
    direction: "high",
  },
  {
    key: "obp",
    label: "On-Base Percentage",
    shortLabel: "OBP",
    type: "hitting",
    format: "average",
    direction: "high",
  },
  {
    key: "slg",
    label: "Slugging Percentage",
    shortLabel: "SLG",
    type: "hitting",
    format: "average",
    direction: "high",
  },
  {
    key: "home_runs",
    label: "Home Runs",
    shortLabel: "HR",
    type: "hitting",
    format: "number",
    direction: "high",
  },
  {
    key: "rbi",
    label: "Runs Batted In",
    shortLabel: "RBI",
    type: "hitting",
    format: "number",
    direction: "high",
  },
  {
    key: "hits",
    label: "Hits",
    shortLabel: "H",
    type: "hitting",
    format: "number",
    direction: "high",
  },
  {
    key: "walks",
    label: "Walks",
    shortLabel: "BB",
    type: "hitting",
    format: "number",
    direction: "high",
  },
  {
    key: "strikeouts",
    label: "Strikeouts",
    shortLabel: "K",
    type: "hitting",
    format: "number",
    direction: "low",
  },
];

const pitchingCategories: Category[] = [
  {
    key: "era",
    label: "Earned Run Average",
    shortLabel: "ERA",
    type: "pitching",
    format: "decimal",
    direction: "low",
  },
  {
    key: "whip",
    label: "Walks + Hits / Inning",
    shortLabel: "WHIP",
    type: "pitching",
    format: "decimal",
    direction: "low",
  },
  {
    key: "strikeouts_pitched",
    label: "Strikeouts",
    shortLabel: "K",
    type: "pitching",
    format: "number",
    direction: "high",
  },
  {
    key: "innings_pitched",
    label: "Innings Pitched",
    shortLabel: "IP",
    type: "pitching",
    format: "innings",
    direction: "high",
  },
  {
    key: "wins",
    label: "Wins",
    shortLabel: "W",
    type: "pitching",
    format: "number",
    direction: "high",
  },
  {
    key: "losses",
    label: "Losses",
    shortLabel: "L",
    type: "pitching",
    format: "number",
    direction: "low",
  },
  {
    key: "earned_runs",
    label: "Earned Runs",
    shortLabel: "ER",
    type: "pitching",
    format: "number",
    direction: "low",
  },
];

function formatAverage(value: number | null | undefined) {
  if (value == null) return "—";

  const formatted = value.toFixed(3);
  return value >= 1 ? formatted : formatted.replace(/^0/, "");
}

function formatDecimal(value: number | null | undefined) {
  return value == null ? "—" : value.toFixed(2);
}

function formatNumber(value: number | null | undefined) {
  return value == null ? "—" : value.toLocaleString();
}

function formatInnings(value: number | null | undefined) {
  return value == null ? "—" : value.toFixed(1);
}

function formatStat(
  value: number | null | undefined,
  format: Category["format"]
) {
  switch (format) {
    case "average":
      return formatAverage(value);
    case "decimal":
      return formatDecimal(value);
    case "innings":
      return formatInnings(value);
    default:
      return formatNumber(value);
  }
}

function TeamLogo({ teamId }: { teamId?: string }) {
  if (!teamId) {
    return (
      <div className="flex h-10 w-10 items-center justify-center bg-[#E8E1D5] font-mono text-[9px] font-bold text-[#687384]">
        FA
      </div>
    );
  }

  return (
    <img
      src={`https://www.mlbstatic.com/team-logos/${teamId}.svg`}
      alt=""
      aria-hidden="true"
      className="h-10 w-10 object-contain"
    />
  );
}

function LeaderboardTeamLogo({
  teamId,
  teamName,
}: {
  teamId?: string;
  teamName?: string;
}) {
  const backgroundColor = TEAM_COLORS[teamName ?? ""]?.primary ?? "#1A2842";

  if (!teamId) {
    return (
      <div
        className="flex h-9 w-9 shrink-0 items-center justify-center font-mono text-[9px] font-bold text-white"
        style={{ backgroundColor }}
      >
        FA
      </div>
    );
  }

  return (
    <div
      className="flex h-9 w-9 shrink-0 items-center justify-center"
      style={{ backgroundColor }}
    >
      <img
        src={`https://www.mlbstatic.com/team-logos/${teamId}.svg`}
        alt=""
        aria-hidden="true"
        className="h-6 w-6 object-contain"
        style={{ filter: "brightness(0) saturate(100%) invert(1)" }}
      />
    </div>
  );
}

function PlayerHeadshot({ playerId }: { playerId: number }) {
  const [failed, setFailed] = useState(false);

  if (failed) {
    return (
      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#E8E1D5] font-mono text-[9px] font-bold text-[#687384]">
        OB
      </div>
    );
  }

  return (
    <img
      src={`https://img.mlbstatic.com/mlb-photos/image/upload/d_people:generic:headshot:67:current.png/w_80,q_auto:best/v1/people/${playerId}/headshot/67/current`}
      alt=""
      aria-hidden="true"
      onError={() => setFailed(true)}
      className="h-10 w-10 shrink-0 rounded-full bg-[#E8E1D5] object-cover"
    />
  );
}

function qualifiesForLeaderboard(player: PlayerRow, category: Category) {
  const stats = player.stats;
  if (!stats) return false;

  if (category.type === "hitting") {
    return (stats.at_bats ?? 0) >= 100;
  }

  if (category.key === "innings_pitched") {
    return (stats.innings_pitched ?? 0) >= 1;
  }

  return (stats.innings_pitched ?? 0) >= 10;
}

function LeaderboardCard({
  category,
  players,
}: {
  category: Category;
  players: PlayerRow[];
}) {
  const ranked = [...players]
    .filter((player) => {
      const value = player.stats?.[category.key];
      return value != null && qualifiesForLeaderboard(player, category);
    })
    .sort((a, b) => {
      const aValue = Number(a.stats?.[category.key] ?? 0);
      const bValue = Number(b.stats?.[category.key] ?? 0);

      return category.direction === "high"
        ? bValue - aValue
        : aValue - bValue;
    })
    .slice(0, 10);

  return (
    <section className="overflow-hidden border-t-2 border-[#1A2842] bg-[#FCF9F3]">
      <div className="border-b border-[#1A2842]/10 px-5 py-5">
        <div className="flex items-end justify-between">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-[#D85F46]">
              {category.type === "hitting" ? "Hitting" : "Pitching"}
            </p>
            <h3 className="mt-1 text-xl font-bold tracking-tight">
              {category.shortLabel}
            </h3>
            <p className="mt-1 text-xs text-[#687384]">{category.label}</p>
          </div>

          <span className="font-mono text-[9px] text-[#687384]">TOP 10</span>
        </div>

        <p className="mt-4 border-t border-[#1A2842]/10 pt-3 font-mono text-[8px] uppercase tracking-[0.12em] text-[#8B887F]">
          {category.type === "hitting"
            ? "Qualified · 100+ AB"
            : category.key === "innings_pitched"
              ? "Minimum · 1+ IP"
              : "Qualified · 10+ IP"}
        </p>
      </div>

      {ranked.length === 0 ? (
        <div className="px-5 py-10 text-center text-sm text-[#687384]">
          No qualifying stats yet.
        </div>
      ) : (
        ranked.map((player, index) => {
          const value = player.stats?.[category.key] as number | null | undefined;

          return (
            <Link
              key={`${category.key}-${player.id}`}
              href={`/players/${player.id}`}
              className="group relative flex min-h-[72px] items-center gap-3 border-b border-[#1A2842]/8 px-5 py-3 transition-colors last:border-0 hover:bg-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#D85F46]"
            >
              <span
                className={`w-6 shrink-0 font-mono text-xs font-bold ${
                  index === 0 ? "text-[#D85F46]" : "text-[#1A2842]/40"
                }`}
              >
                {String(index + 1).padStart(2, "0")}
              </span>

              <PlayerHeadshot playerId={player.id} />

              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-bold group-hover:text-[#D85F46]">
                  {player.name}
                </p>

                <div className="mt-1 flex items-center gap-2">
                  <LeaderboardTeamLogo
                    teamId={player.team?.id}
                    teamName={player.team?.name}
                  />
                  <span className="font-mono text-[9px] text-[#687384]">
                    {player.team?.abbreviation ?? "FA"}
                  </span>
                  <span className="text-[#687384]/50">·</span>
                  <span className="truncate text-[10px] text-[#687384]">
                    {player.position || "—"}
                  </span>
                </div>
              </div>

              <p
                className={`shrink-0 font-mono text-sm font-bold ${
                  index === 0 ? "text-[#D85F46]" : "text-[#1A2842]"
                }`}
              >
                {formatStat(value, category.format)}
              </p>
            </Link>
          );
        })
      )}

      {ranked.length > 0 && (
        <div className="border-t border-[#1A2842]/10 px-5 py-4">
          <Link
            href={`/players?sort=${String(category.key)}`}
            className="text-xs font-semibold text-[#687384] transition hover:text-[#D85F46]"
          >
            See the full {category.shortLabel} leaderboard →
          </Link>
        </div>
      )}
    </section>
  );
}

function LeaderboardSkeleton() {
  return (
    <div
      className="grid gap-3 md:grid-cols-2 lg:grid-cols-5"
      aria-label="Loading leaders"
      aria-busy="true"
    >
      {Array.from({ length: 5 }, (_, index) => (
        <div
          key={index}
          className="border-t-2 border-[#1A2842] bg-[#FCF9F3] p-5"
        >
          <div className="h-6 w-10 animate-pulse bg-[#1A2842]/10" />
          <div className="mt-8 h-10 w-10 animate-pulse rounded-full bg-[#1A2842]/10" />
          <div className="mt-4 h-4 w-3/4 animate-pulse bg-[#1A2842]/10" />
          <div className="mt-2 h-3 w-1/2 animate-pulse bg-[#1A2842]/10" />
          <div className="mt-8 h-8 w-1/3 animate-pulse bg-[#1A2842]/10" />
        </div>
      ))}
    </div>
  );
}

export default function LeadersPage() {
  const [players, setPlayers] = useState<Player[]>([]);
  const [stats, setStats] = useState<PlayerStat[]>([]);
  const [teams, setTeams] = useState<Team[]>([]);
  const [view, setView] = useState<"hitting" | "pitching">("hitting");
  const [teamFilter, setTeamFilter] = useState("All");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;

    async function loadData() {
      setLoading(true);
      setError("");

      try {
        const [
          { data: playerData, error: playerError },
          { data: statData, error: statError },
          { data: teamData, error: teamError },
        ] = await Promise.all([
          supabase
            .from("Player")
            .select("id, name, team_id, position")
            .order("name")
            .range(0, 4999),

          supabase
            .from("PlayerStats")
            .select(`
              player_id,
              season,
              games,
              at_bats,
              hits,
              home_runs,
              rbi,
              walks,
              strikeouts,
              batting_avg,
              obp,
              slg,
              ops,
              innings_pitched,
              wins,
              losses,
              earned_runs,
              hits_allowed,
              walks_allowed,
              strikeouts_pitched,
              era,
              whip
            `)
            .eq("season", SEASON),

          supabase
            .from("Teams")
            .select("id, name, abbreviation")
            .order("name"),
        ]);

        const queryError = playerError ?? statError ?? teamError;
        if (queryError) throw queryError;

        if (!cancelled) {
          setPlayers(playerData ?? []);
          setStats(statData ?? []);
          setTeams(teamData ?? []);
        }
      } catch (err) {
        console.error("Failed to load leaderboard data:", err);

        if (!cancelled) {
          setError("We couldn’t load the leaderboard. Please try again.");
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    loadData();

    return () => {
      cancelled = true;
    };
  }, []);

  const statMap = useMemo(
    () => new Map(stats.map((stat) => [stat.player_id, stat])),
    [stats]
  );

  const teamMap = useMemo(
    () => new Map(teams.map((team) => [team.id, team])),
    [teams]
  );

  const playerRows = useMemo<PlayerRow[]>(
    () =>
      players.map((player) => ({
        ...player,
        stats: statMap.get(player.id),
        team: teamMap.get(player.team_id),
      })),
    [players, statMap, teamMap]
  );

  const filteredPlayers = useMemo(
    () =>
      playerRows.filter(
        (player) => teamFilter === "All" || player.team_id === teamFilter
      ),
    [playerRows, teamFilter]
  );

  const categories = view === "hitting" ? hittingCategories : pitchingCategories;
  const primaryCategory = categories[0];

  const primaryLeaders = useMemo(
    () =>
      [...filteredPlayers]
        .filter((player) => qualifiesForLeaderboard(player, primaryCategory))
        .filter((player) => player.stats?.[primaryCategory.key] != null)
        .sort((a, b) => {
          const aValue = Number(a.stats?.[primaryCategory.key] ?? 0);
          const bValue = Number(b.stats?.[primaryCategory.key] ?? 0);

          return primaryCategory.direction === "high"
            ? bValue - aValue
            : aValue - bValue;
        })
        .slice(0, 5),
    [filteredPlayers, primaryCategory]
  );

  const teamCount = useMemo(
    () =>
      new Set(
        filteredPlayers.map((player) => player.team_id).filter(Boolean)
      ).size,
    [filteredPlayers]
  );

  const currentTeamLabel =
    teamFilter === "All"
      ? "MLB"
      : teams.find((team) => team.id === teamFilter)?.abbreviation ?? "";

  return (
    <main className="min-h-screen bg-[#F8F3EA] text-[#1A2842]">
      <header className="border-b border-[#1A2842]/15">
        <div className="mx-auto max-w-[1440px] px-5 py-10 md:px-8 md:py-14">
          <div className="flex flex-col justify-between gap-8 lg:flex-row lg:items-end">
            <div>
              <div className="flex items-center gap-3">
                <span className="h-[2px] w-8 bg-[#D85F46]" />
                <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-[#687384]">
                  Offshore Break · The numbers
                </p>
              </div>

              <h1 className="mt-5 text-5xl font-black tracking-[-0.055em] md:text-7xl">
                The leaders
              </h1>

              <p className="mt-4 max-w-xl text-sm leading-6 text-[#687384]">
                A running look at who’s setting the pace this season. Filter
                by club, then follow any name to the full player profile.
              </p>
            </div>

            <div className="flex items-end gap-8 border-l border-[#1A2842]/15 pl-6">
              <div>
                <p className="font-mono text-3xl font-bold">{SEASON}</p>
                <p className="mt-1 text-[9px] uppercase tracking-[0.14em] text-[#687384]">
                  Season
                </p>
              </div>

              <div>
                <p className="font-mono text-3xl font-bold">{teamCount}</p>
                <p className="mt-1 text-[9px] uppercase tracking-[0.14em] text-[#687384]">
                  Clubs represented
                </p>
              </div>
            </div>
          </div>
        </div>
      </header>

      <section className="border-b border-[#1A2842]/15 bg-[#FCF9F3]">
        <div className="mx-auto flex max-w-[1440px] flex-col gap-5 px-5 py-5 md:px-8 lg:flex-row lg:items-center lg:justify-between">
          <div
            className="inline-flex border-b border-[#1A2842]/20"
            role="group"
            aria-label="Choose stat category"
          >
            <button
              type="button"
              aria-pressed={view === "hitting"}
              onClick={() => setView("hitting")}
              className={`border-b-2 px-4 py-3 text-sm transition ${
                view === "hitting"
                  ? "border-[#D85F46] font-bold text-[#1A2842]"
                  : "border-transparent text-[#687384] hover:text-[#1A2842]"
              }`}
            >
              Hitting
            </button>

            <button
              type="button"
              aria-pressed={view === "pitching"}
              onClick={() => setView("pitching")}
              className={`border-b-2 px-4 py-3 text-sm transition ${
                view === "pitching"
                  ? "border-[#D85F46] font-bold text-[#1A2842]"
                  : "border-transparent text-[#687384] hover:text-[#1A2842]"
              }`}
            >
              Pitching
            </button>
          </div>

          <div className="flex items-center gap-4">
            <label
              htmlFor="team-filter"
              className="text-xs font-medium text-[#687384]"
            >
              Club
            </label>

            <select
              id="team-filter"
              value={teamFilter}
              onChange={(event) => setTeamFilter(event.target.value)}
              className="min-w-[220px] border-b border-[#1A2842]/30 bg-transparent px-2 py-3 text-sm outline-none focus:border-[#D85F46]"
            >
              <option value="All">All teams</option>
              {teams.map((team) => (
                <option key={team.id} value={team.id}>
                  {team.abbreviation} — {team.name}
                </option>
              ))}
            </select>
          </div>
        </div>
      </section>

      {error && (
        <div
          role="alert"
          className="mx-auto mt-8 max-w-[1440px] px-5 md:px-8"
        >
          <div className="border border-[#D85F46]/30 bg-[#D85F46]/5 px-6 py-5 text-sm font-medium text-[#A84432]">
            {error}
          </div>
        </div>
      )}

      <section className="mx-auto max-w-[1440px] px-5 py-10 md:px-8">
        <div className="mb-5 flex items-end justify-between">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-[#D85F46]">
              The front of the pack
            </p>
            <h2 className="mt-1 text-2xl font-bold tracking-tight">
              {view === "hitting" ? "Best at the plate" : "On the mound"}
            </h2>
          </div>

          <span className="font-mono text-[10px] text-[#687384]">
            {currentTeamLabel} · {SEASON}
          </span>
        </div>

        {loading ? (
          <LeaderboardSkeleton />
        ) : primaryLeaders.length === 0 ? (
          <div className="border-t-2 border-[#1A2842] bg-[#FCF9F3] px-6 py-16 text-center">
            <p className="font-serif text-xl font-bold">
              No qualifying leaders yet
            </p>
            <p className="mt-2 text-sm text-[#687384]">
              Try another club or check back as the season develops.
            </p>
          </div>
        ) : (
          <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-5">
            {primaryLeaders.map((player, index) => {
              const value = player.stats?.[primaryCategory.key] as
                | number
                | null
                | undefined;

              const colors = TEAM_COLORS[player.team?.name ?? ""] ?? {
                primary: "#1A2842",
                secondary: "#D85F46",
              };

              return (
                <Link
                  key={player.id}
                  href={`/players/${player.id}`}
                  className={`group relative overflow-hidden border-t-2 bg-[#FCF9F3] p-5 transition hover:-translate-y-1 hover:shadow-[0_12px_30px_rgba(26,40,66,0.08)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#D85F46] ${
                    index === 0 ? "border-[#D85F46]" : "border-[#1A2842]"
                  }`}
                >
                  <div
                    className="pointer-events-none absolute right-0 top-0 h-24 w-24 opacity-[0.07]"
                    style={{ backgroundColor: colors.secondary }}
                  />

                  <div className="flex items-start justify-between">
                    <span
                      className={`font-mono text-2xl font-bold ${
                        index === 0 ? "text-[#D85F46]" : "text-[#1A2842]/30"
                      }`}
                    >
                      {String(index + 1).padStart(2, "0")}
                    </span>
                    <TeamLogo teamId={player.team?.id} />
                  </div>

                  <div className="mt-6">
                    <PlayerHeadshot playerId={player.id} />
                    <p className="mt-4 truncate text-sm font-bold group-hover:text-[#D85F46]">
                      {player.name}
                    </p>
                    <p className="mt-1 text-[10px] font-medium text-[#687384]">
                      {player.team?.abbreviation ?? "FA"} ·{" "}
                      {player.position || "—"}
                    </p>
                  </div>

                  <div className="mt-6 border-t border-[#1A2842]/10 pt-4">
                    <p className="font-mono text-3xl font-bold">
                      {formatStat(value, primaryCategory.format)}
                    </p>
                    <p className="mt-1 text-[10px] font-semibold uppercase tracking-[0.12em] text-[#687384]">
                      {primaryCategory.shortLabel}
                    </p>
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </section>

      <section className="mx-auto max-w-[1440px] px-5 pb-14 md:px-8">
        <div className="mb-5 flex items-end justify-between border-b border-[#1A2842]/15 pb-4">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-[#D85F46]">
              The full picture
            </p>
            <h2 className="mt-1 text-2xl font-bold tracking-tight">
              {view === "hitting" ? "Hitting leaders" : "Pitching leaders"}
            </h2>
          </div>

          <p className="hidden font-mono text-[10px] text-[#687384] md:block">
            TOP 10 · {SEASON}
          </p>
        </div>

        {loading ? (
          <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
            {Array.from({ length: categories.length }, (_, index) => (
              <div
                key={index}
                className="h-[320px] animate-pulse border-t-2 border-[#1A2842]/20 bg-[#FCF9F3]"
              />
            ))}
          </div>
        ) : (
          <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
            {categories.map((category) => (
              <LeaderboardCard
                key={String(category.key)}
                category={category}
                players={filteredPlayers}
              />
            ))}
          </div>
        )}
      </section>

      <section className="border-t border-[#1A2842]/15 bg-[#FCF9F3]">
        <div className="mx-auto grid max-w-[1440px] gap-8 px-5 py-10 md:grid-cols-3 md:px-8">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-[#D85F46]">
              Hitting
            </p>
            <p className="mt-2 text-sm leading-6 text-[#687384]">
              Hitting leaderboards use season totals from the Offshore Break
              database. Players need at least 100 at-bats to qualify.
            </p>
          </div>

          <div>
            <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-[#D85F46]">
              Pitching
            </p>
            <p className="mt-2 text-sm leading-6 text-[#687384]">
              Pitching rate stats require at least 10 innings. The innings
              pitched leaderboard includes pitchers with at least one inning.
            </p>
          </div>

          <div>
            <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-[#D85F46]">
              Keep looking
            </p>
            <p className="mt-2 text-sm leading-6 text-[#687384]">
              Open a player profile for more season stats, or browse the full
              player list.
            </p>
            <Link
              href="/players"
              className="mt-3 inline-block text-sm font-semibold text-[#1A2842] transition hover:text-[#D85F46]"
            >
              Browse all players →
            </Link>
          </div>
        </div>
      </section>

      <footer className="border-t border-[#101A2C] bg-[#1A2842] px-5 py-12 text-[#F8F3EA] md:px-8">
        <div className="mx-auto flex max-w-[1440px] flex-col justify-between gap-8 md:flex-row md:items-end">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-[#59B3AD]">
              Offshore Break
            </p>
            <h2 className="mt-3 text-3xl font-bold tracking-tight">
              There’s more to the game.
            </h2>
            <p className="mt-3 max-w-lg text-sm leading-6 text-white/55">
              Browse players, clubs, and comparisons across the Offshore Break
              baseball database.
            </p>
          </div>

          <nav aria-label="More baseball stats" className="flex flex-wrap gap-2">
            <Link
              href="/players"
              className="border border-white/20 px-4 py-3 text-xs font-semibold text-white/75 transition hover:border-[#D85F46] hover:bg-[#D85F46] hover:text-white"
            >
              Players →
            </Link>
            <Link
              href="/teams"
              className="border border-white/20 px-4 py-3 text-xs font-semibold text-white/75 transition hover:border-[#59B3AD] hover:bg-[#59B3AD] hover:text-white"
            >
              Teams →
            </Link>
            <Link
              href="/compare"
              className="border border-white/20 px-4 py-3 text-xs font-semibold text-white/75 transition hover:border-white hover:bg-white hover:text-[#1A2842]"
            >
              Compare →
            </Link>
          </nav>
        </div>
      </footer>
    </main>
  );
}