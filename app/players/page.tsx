"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabaseClient";

type Player = {
  id: number;
  name: string;
  team_id: string;
  position: string;
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
  innings_pitched?: number | null;
  wins?: number | null;
  losses?: number | null;
  earned_runs?: number | null;
  strikeouts_pitched?: number | null;
  era?: number | null;
  whip?: number | null;
};

type Team = {
  id: string;
  name: string;
  abbreviation: string;
};

type PlayerRow = Player & {
  stats?: PlayerStat;
  team?: Team;
};

type ViewMode = "all" | "hitting" | "pitching";

type SortKey =
  | "name"
  | "games"
  | "batting_avg"
  | "obp"
  | "slg"
  | "ops"
  | "home_runs"
  | "rbi"
  | "hits"
  | "walks"
  | "strikeouts"
  | "innings_pitched"
  | "era"
  | "whip"
  | "wins"
  | "losses"
  | "strikeouts_pitched";

const TEAM_COLORS: Record<
  string,
  { primary: string; secondary: string }
> = {
  "Arizona Diamondbacks": {
    primary: "#A71930",
    secondary: "#2A9D8F",
  },
  "Atlanta Braves": {
    primary: "#CE1141",
    secondary: "#13274F",
  },
  "Baltimore Orioles": {
    primary: "#DF4601",
    secondary: "#000000",
  },
  "Boston Red Sox": {
    primary: "#BD3039",
    secondary: "#0C2340",
  },
  "Chicago Cubs": {
    primary: "#0E3386",
    secondary: "#CC3433",
  },
  "Chicago White Sox": {
    primary: "#27251F",
    secondary: "#C4CED4",
  },
  "Cincinnati Reds": {
    primary: "#C6011F",
    secondary: "#000000",
  },
  "Cleveland Guardians": {
    primary: "#00385D",
    secondary: "#E50022",
  },
  "Colorado Rockies": {
    primary: "#333366",
    secondary: "#7663A8",
  },
  "Detroit Tigers": {
    primary: "#0C2340",
    secondary: "#FA4616",
  },
  "Houston Astros": {
    primary: "#002D62",
    secondary: "#EB6E1F",
  },
  "Kansas City Royals": {
    primary: "#004687",
    secondary: "#BD9B60",
  },
  "Los Angeles Angels": {
    primary: "#BA0021",
    secondary: "#003263",
  },
  "Los Angeles Dodgers": {
    primary: "#005A9C",
    secondary: "#D6E7F5",
  },
  "Miami Marlins": {
    primary: "#00A3E0",
    secondary: "#7CC7E8",
  },
  "Milwaukee Brewers": {
    primary: "#12284B",
    secondary: "#FFC52F",
  },
  "Minnesota Twins": {
    primary: "#002B5C",
    secondary: "#D31145",
  },
  "New York Mets": {
    primary: "#002D72",
    secondary: "#002D72",
  },
  "New York Yankees": {
    primary: "#003087",
    secondary: "#C4CED4",
  },
  "Oakland Athletics": {
    primary: "#003831",
    secondary: "#EFB21E",
  },
  "Philadelphia Phillies": {
    primary: "#E81828",
    secondary: "#006BB6",
  },
  "Pittsburgh Pirates": {
    primary: "#27251F",
    secondary: "#FDB827",
  },
  "San Diego Padres": {
    primary: "#2F241D",
    secondary: "#FFC425",
  },
  "San Francisco Giants": {
    primary: "#FD5A1E",
    secondary: "#000000",
  },
  "Seattle Mariners": {
    primary: "#0C2C56",
    secondary: "#59B3AD",
  },
  "St. Louis Cardinals": {
    primary: "#C41E3A",
    secondary: "#0A2240",
  },
  "Tampa Bay Rays": {
    primary: "#092C5C",
    secondary: "#8FBCE6",
  },
  "Texas Rangers": {
    primary: "#003278",
    secondary: "#C9DDF2",
  },
  "Toronto Blue Jays": {
    primary: "#134A8E",
    secondary: "#13294B",
  },
  "Washington Nationals": {
    primary: "#AB0003",
    secondary: "#11225B",
  },
};

const hittingSorts: { value: SortKey; label: string }[] = [
  { value: "ops", label: "OPS" },
  { value: "batting_avg", label: "AVG" },
  { value: "obp", label: "OBP" },
  { value: "slg", label: "SLG" },
  { value: "home_runs", label: "HR" },
  { value: "rbi", label: "RBI" },
  { value: "hits", label: "H" },
  { value: "walks", label: "BB" },
  { value: "strikeouts", label: "K" },
  { value: "games", label: "G" },
];

const pitchingSorts: { value: SortKey; label: string }[] = [
  { value: "era", label: "ERA" },
  { value: "whip", label: "WHIP" },
  { value: "strikeouts_pitched", label: "K" },
  { value: "innings_pitched", label: "IP" },
  { value: "wins", label: "W" },
  { value: "losses", label: "L" },
  { value: "games", label: "G" },
];

function formatAverage(value: number | null | undefined) {
  if (value === null || value === undefined) return "-";
  return value.toFixed(3).replace(/^0/, "");
}

function formatDecimal(value: number | null | undefined) {
  if (value === null || value === undefined) return "-";
  return value.toFixed(2);
}

function formatNumber(value: number | null | undefined) {
  if (value === null || value === undefined) return "-";
  return value.toLocaleString();
}

function formatInnings(value: number | null | undefined) {
  if (value === null || value === undefined) return "-";
  return value.toFixed(1);
}

function TeamLogo({ teamId }: { teamId?: string }) {
  if (!teamId) {
    return (
      <div className="flex h-8 w-8 items-center justify-center border border-[#1A2842]/15 bg-white/40 font-mono text-[8px] font-bold text-[#687384]">
        FA
      </div>
    );
  }

  return (
    <img
      src={`https://www.mlbstatic.com/team-logos/${teamId}.svg`}
      alt=""
      className="h-8 w-8 object-contain"
    />
  );
}

function PlayerHeadshot({ playerId }: { playerId: number }) {
  return (
    <div className="h-11 w-11 shrink-0 overflow-hidden rounded-full bg-[#E8E1D5]">
      <img
        src={`https://img.mlbstatic.com/mlb-photos/image/upload/d_people:generic:headshot:67:current.png/w_80,q_auto:best/v1/people/${playerId}/headshot/67/current`}
        alt=""
        className="h-full w-full object-cover"
      />
    </div>
  );
}

function SortArrow({
  active,
  direction,
}: {
  active: boolean;
  direction: "asc" | "desc";
}) {
  if (!active) {
    return <span className="ml-1 text-[#1A2842]/20">↕</span>;
  }

  return (
    <span className="ml-1 text-[#D85F46]">
      {direction === "desc" ? "↓" : "↑"}
    </span>
  );
}

export default function PlayersPage() {
  const [players, setPlayers] = useState<Player[]>([]);
  const [stats, setStats] = useState<PlayerStat[]>([]);
  const [teams, setTeams] = useState<Team[]>([]);

  const [search, setSearch] = useState("");
  const [position, setPosition] = useState("All");
  const [team, setTeam] = useState("All");
  const [viewMode, setViewMode] = useState<ViewMode>("hitting");

  const [sortBy, setSortBy] = useState<SortKey>("ops");
  const [sortDirection, setSortDirection] =
    useState<"desc" | "asc">("desc");

  const [minGames, setMinGames] = useState("0");
  const [minAB, setMinAB] = useState("0");
  const [minIP, setMinIP] = useState("0");

  const [showQualifiedOnly, setShowQualifiedOnly] = useState(false);
  const [visibleCount, setVisibleCount] = useState(250);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    async function loadData() {
      setLoading(true);
      setError("");

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
          .select(
            "player_id, season, games, at_bats, hits, home_runs, rbi, walks, strikeouts, batting_avg, obp, slg, ops, innings_pitched, wins, losses, earned_runs, strikeouts_pitched, era, whip"
          )
          .eq("season", 2026),

        supabase
          .from("Teams")
          .select("id, name, abbreviation")
          .order("name"),
      ]);

      if (playerError || statError || teamError) {
        setError("Unable to load player data. Please refresh the page.");
      }

      setPlayers(playerData ?? []);
      setStats(statData ?? []);
      setTeams(teamData ?? []);
      setLoading(false);
    }

    loadData();
  }, []);

  const statMap = useMemo(() => {
    return new Map(stats.map((stat) => [stat.player_id, stat]));
  }, [stats]);

  const teamMap = useMemo(() => {
    return new Map(teams.map((team) => [team.id, team]));
  }, [teams]);

  const positions = useMemo(() => {
    return Array.from(
      new Set(
        players
          .map((player) => player.position)
          .filter(Boolean)
      )
    ).sort();
  }, [players]);

  const playerRows = useMemo<PlayerRow[]>(() => {
    return players.map((player) => ({
      ...player,
      stats: statMap.get(player.id),
      team: teamMap.get(player.team_id),
    }));
  }, [players, statMap, teamMap]);

  const filteredPlayers = useMemo(() => {
    const minimumGames = Number(minGames) || 0;
    const minimumAB = Number(minAB) || 0;
    const minimumIP = Number(minIP) || 0;

    const filtered = playerRows.filter((player) => {
      const stat = player.stats;

      const normalizedSearch = search.trim().toLowerCase();

      const matchesSearch =
        normalizedSearch.length === 0 ||
        player.name.toLowerCase().includes(normalizedSearch);

      const matchesPosition =
        position === "All" || player.position === position;

      const matchesTeam =
        team === "All" || player.team_id === team;

      const matchesMode =
        viewMode === "all" ||
        (viewMode === "hitting" &&
          (stat?.at_bats ?? 0) > 0) ||
        (viewMode === "pitching" &&
          (stat?.innings_pitched ?? 0) > 0);

      const matchesGames =
        (stat?.games ?? 0) >= minimumGames;

      const matchesAB =
        viewMode !== "hitting" ||
        (stat?.at_bats ?? 0) >= minimumAB;

      const matchesIP =
        viewMode !== "pitching" ||
        (stat?.innings_pitched ?? 0) >= minimumIP;

      const matchesQualified =
        !showQualifiedOnly ||
        (viewMode === "pitching"
          ? (stat?.innings_pitched ?? 0) >= 50
          : (stat?.at_bats ?? 0) >= 150);

      return (
        matchesSearch &&
        matchesPosition &&
        matchesTeam &&
        matchesMode &&
        matchesGames &&
        matchesAB &&
        matchesIP &&
        matchesQualified
      );
    });

    filtered.sort((a, b) => {
      if (sortBy === "name") {
        return sortDirection === "asc"
          ? a.name.localeCompare(b.name)
          : b.name.localeCompare(a.name);
      }

      const aValue = Number(
        a.stats?.[sortBy as keyof PlayerStat] ?? -1
      );

      const bValue = Number(
        b.stats?.[sortBy as keyof PlayerStat] ?? -1
      );

      return sortDirection === "asc"
        ? aValue - bValue
        : bValue - aValue;
    });

    return filtered;
  }, [
    playerRows,
    search,
    position,
    team,
    viewMode,
    sortBy,
    sortDirection,
    minGames,
    minAB,
    minIP,
    showQualifiedOnly,
  ]);

  const visiblePlayers = filteredPlayers.slice(0, visibleCount);

  const selectedTeam = useMemo(
    () => teams.find((item) => item.id === team),
    [teams, team]
  );

  const activeFilterCount =
    Number(search.length > 0) +
    Number(position !== "All") +
    Number(team !== "All") +
    Number(minGames !== "0") +
    Number(minAB !== "0") +
    Number(minIP !== "0") +
    Number(showQualifiedOnly);

  function changeSort(value: SortKey) {
    if (sortBy === value) {
      setSortDirection((current) =>
        current === "desc" ? "asc" : "desc"
      );
    } else {
      setSortBy(value);
      setSortDirection("desc");
    }
  }

  function changeView(mode: ViewMode) {
    setViewMode(mode);
    setVisibleCount(250);

    if (mode === "pitching") {
      setSortBy("era");
      setSortDirection("asc");
    } else {
      setSortBy("ops");
      setSortDirection("desc");
    }
  }

  function resetFilters() {
    setSearch("");
    setPosition("All");
    setTeam("All");
    setMinGames("0");
    setMinAB("0");
    setMinIP("0");
    setShowQualifiedOnly(false);
    setVisibleCount(250);
  }

  function getTeamAccent(player: PlayerRow) {
    if (!player.team) {
      return {
        primary: "#1A2842",
        secondary: "#D85F46",
      };
    }

    return (
      TEAM_COLORS[player.team.name] ?? {
        primary: "#1A2842",
        secondary: "#D85F46",
      }
    );
  }

  const currentSortOptions =
    viewMode === "pitching" ? pitchingSorts : hittingSorts;

  return (
    <main className="min-h-screen bg-[#F8F3EA] text-[#1A2842]">
      {/* ========================================================= */}
      {/* PAGE HEADER */}
      {/* ========================================================= */}

      <section className="border-b border-[#1A2842]/15">
        <div className="mx-auto max-w-[1440px] px-5 py-12 md:px-8 md:py-16">
          <div className="flex flex-col justify-between gap-8 lg:flex-row lg:items-end">
            <div>
              <p className="text-[9px] font-black uppercase tracking-[0.25em] text-[#D85F46]">
                Offshore Break / Database
              </p>

              <h1 className="mt-3 text-5xl font-black tracking-[-0.06em] md:text-7xl">
                Players
              </h1>

              <p className="mt-4 max-w-2xl text-sm leading-6 text-[#687384]">
                Explore the 2026 player database by performance,
                team, position, and statistical profile.
              </p>
            </div>

            <div className="flex gap-8 border-l border-[#1A2842]/15 pl-6">
              <div>
                <p className="font-mono text-3xl font-black">
                  {players.length.toLocaleString()}
                </p>

                <p className="mt-1 text-[8px] font-black uppercase tracking-[0.18em] text-[#687384]">
                  Players
                </p>
              </div>

              <div>
                <p className="font-mono text-3xl font-black">
                  {teams.length}
                </p>

                <p className="mt-1 text-[8px] font-black uppercase tracking-[0.18em] text-[#687384]">
                  Teams
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ========================================================= */}
      {/* DATABASE CONTROLS */}
      {/* ========================================================= */}

      <section className="border-b border-[#1A2842]/15 bg-[#FCF9F3]">
        <div className="mx-auto max-w-[1440px] px-5 py-6 md:px-8">
          {/* View switcher */}

          <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex border border-[#1A2842]/20">
              {[
                { value: "all" as ViewMode, label: "All Players" },
                { value: "hitting" as ViewMode, label: "Hitting" },
                { value: "pitching" as ViewMode, label: "Pitching" },
              ].map((item) => (
                <button
                  key={item.value}
                  onClick={() => changeView(item.value)}
                  className={`border-r border-[#1A2842]/20 px-5 py-3 text-[9px] font-black uppercase tracking-[0.16em] transition last:border-r-0 ${
                    viewMode === item.value
                      ? "bg-[#1A2842] text-white"
                      : "bg-transparent text-[#687384] hover:bg-[#1A2842]/5 hover:text-[#1A2842]"
                  }`}
                >
                  {item.label}
                </button>
              ))}
            </div>

            <div className="flex items-center gap-4">
              {selectedTeam && (
                <div className="hidden items-center gap-2 md:flex">
                  <TeamLogo teamId={selectedTeam.id} />

                  <span className="text-[9px] font-black uppercase tracking-[0.15em]">
                    {selectedTeam.abbreviation}
                  </span>
                </div>
              )}

              <p className="font-mono text-xs text-[#687384]">
                {filteredPlayers.length.toLocaleString()} results
              </p>

              {activeFilterCount > 0 && (
                <button
                  onClick={resetFilters}
                  className="text-[9px] font-black uppercase tracking-[0.15em] text-[#D85F46] hover:underline"
                >
                  Reset
                </button>
              )}
            </div>
          </div>

          {/* Search + filters */}

          <div className="mt-6 grid gap-3 lg:grid-cols-[2fr_1fr_1fr_1fr]">
            <div className="relative">
              <input
                type="text"
                placeholder="Search player name..."
                value={search}
                onChange={(event) => {
                  setSearch(event.target.value);
                  setVisibleCount(250);
                }}
                className="w-full border border-[#1A2842]/20 bg-[#F8F3EA] px-4 py-3.5 pr-10 text-sm outline-none transition placeholder:text-[#687384] focus:border-[#D85F46]"
              />

              {search && (
                <button
                  onClick={() => setSearch("")}
                  className="absolute right-3 top-1/2 -translate-y-1/2 font-mono text-xs text-[#687384] hover:text-[#D85F46]"
                >
                  ×
                </button>
              )}
            </div>

            <select
              value={team}
              onChange={(event) => {
                setTeam(event.target.value);
                setVisibleCount(250);
              }}
              className="border border-[#1A2842]/20 bg-[#F8F3EA] px-4 py-3.5 text-sm outline-none focus:border-[#D85F46]"
            >
              <option value="All">All Teams</option>

              {teams.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.abbreviation} — {item.name}
                </option>
              ))}
            </select>

            <select
              value={position}
              onChange={(event) => {
                setPosition(event.target.value);
                setVisibleCount(250);
              }}
              className="border border-[#1A2842]/20 bg-[#F8F3EA] px-4 py-3.5 text-sm outline-none focus:border-[#D85F46]"
            >
              <option value="All">All Positions</option>

              {positions.map((item) => (
                <option key={item} value={item}>
                  {item}
                </option>
              ))}
            </select>

            <select
              value={sortBy}
              onChange={(event) =>
                changeSort(event.target.value as SortKey)
              }
              className="border border-[#1A2842]/20 bg-[#F8F3EA] px-4 py-3.5 text-sm outline-none focus:border-[#D85F46]"
            >
              {currentSortOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  Sort by {option.label}
                </option>
              ))}
            </select>
          </div>

          {/* Advanced filters */}

          <div className="mt-3 grid gap-3 md:grid-cols-3 lg:grid-cols-4">
            <select
              value={minGames}
              onChange={(event) => {
                setMinGames(event.target.value);
                setVisibleCount(250);
              }}
              className="border border-[#1A2842]/15 bg-[#F8F3EA] px-4 py-3 text-xs outline-none focus:border-[#D85F46]"
            >
              <option value="0">Any Games Played</option>
              <option value="10">10+ Games</option>
              <option value="25">25+ Games</option>
              <option value="50">50+ Games</option>
              <option value="100">100+ Games</option>
            </select>

            {viewMode !== "pitching" && (
              <select
                value={minAB}
                onChange={(event) => {
                  setMinAB(event.target.value);
                  setVisibleCount(250);
                }}
                className="border border-[#1A2842]/15 bg-[#F8F3EA] px-4 py-3 text-xs outline-none focus:border-[#D85F46]"
              >
                <option value="0">Any At Bats</option>
                <option value="50">50+ AB</option>
                <option value="100">100+ AB</option>
                <option value="150">150+ AB</option>
                <option value="300">300+ AB</option>
              </select>
            )}

            {viewMode === "pitching" && (
              <select
                value={minIP}
                onChange={(event) => {
                  setMinIP(event.target.value);
                  setVisibleCount(250);
                }}
                className="border border-[#1A2842]/15 bg-[#F8F3EA] px-4 py-3 text-xs outline-none focus:border-[#D85F46]"
              >
                <option value="0">Any Innings</option>
                <option value="10">10+ IP</option>
                <option value="25">25+ IP</option>
                <option value="50">50+ IP</option>
                <option value="100">100+ IP</option>
              </select>
            )}

            <label className="flex cursor-pointer items-center gap-3 border border-[#1A2842]/15 bg-[#F8F3EA] px-4 py-3">
              <input
                type="checkbox"
                checked={showQualifiedOnly}
                onChange={(event) => {
                  setShowQualifiedOnly(event.target.checked);
                  setVisibleCount(250);
                }}
                className="h-4 w-4 accent-[#D85F46]"
              />

              <span className="text-[9px] font-black uppercase tracking-[0.14em]">
                Qualified Only
              </span>
            </label>

            <div className="hidden items-center justify-end lg:flex">
              <p className="text-[8px] font-black uppercase tracking-[0.16em] text-[#687384]">
                {viewMode === "pitching"
                  ? "Pitching data"
                  : "Hitting data"}{" "}
                · 2026
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ========================================================= */}
      {/* ACTIVE FILTER BAR */}
      {/* ========================================================= */}

      {(search ||
        position !== "All" ||
        team !== "All" ||
        showQualifiedOnly) && (
        <section className="border-b border-[#1A2842]/10 bg-[#F8F3EA]">
          <div className="mx-auto flex max-w-[1440px] flex-wrap items-center gap-2 px-5 py-3 md:px-8">
            <span className="mr-1 text-[8px] font-black uppercase tracking-[0.16em] text-[#687384]">
              Filters
            </span>

            {search && (
              <span className="border border-[#1A2842]/15 bg-white/40 px-3 py-1.5 font-mono text-[9px]">
                {search}
              </span>
            )}

            {position !== "All" && (
              <span className="border border-[#1A2842]/15 bg-white/40 px-3 py-1.5 font-mono text-[9px]">
                {position}
              </span>
            )}

            {selectedTeam && (
              <span className="border border-[#1A2842]/15 bg-white/40 px-3 py-1.5 font-mono text-[9px]">
                {selectedTeam.abbreviation}
              </span>
            )}

            {showQualifiedOnly && (
              <span className="border border-[#D85F46]/30 bg-[#D85F46]/5 px-3 py-1.5 font-mono text-[9px] text-[#D85F46]">
                QUALIFIED
              </span>
            )}
          </div>
        </section>
      )}

      {/* ========================================================= */}
      {/* PLAYER TABLE */}
      {/* ========================================================= */}

      <section className="mx-auto max-w-[1440px] px-5 py-8 md:px-8">
        <div className="mb-5 flex items-end justify-between">
          <div>
            <p className="text-[9px] font-black uppercase tracking-[0.2em] text-[#D85F46]">
              2026 Player Index
            </p>

            <h2 className="mt-1 text-2xl font-black tracking-[-0.03em]">
              {viewMode === "pitching"
                ? "Pitching Leaders"
                : viewMode === "hitting"
                  ? "Hitting Leaders"
                  : "All Players"}
            </h2>
          </div>

          <div className="hidden text-right md:block">
            <p className="font-mono text-xs font-bold">
              Showing {visiblePlayers.length.toLocaleString()}
              {filteredPlayers.length > visiblePlayers.length
                ? ` of ${filteredPlayers.length.toLocaleString()}`
                : ""}
            </p>

            <p className="mt-1 text-[8px] font-black uppercase tracking-[0.15em] text-[#687384]">
              Sorted{" "}
              {sortDirection === "desc"
                ? "Descending"
                : "Ascending"}
            </p>
          </div>
        </div>

        {error ? (
          <div className="border border-[#D85F46]/30 bg-[#D85F46]/5 px-6 py-16 text-center">
            <p className="text-sm font-bold text-[#D85F46]">
              {error}
            </p>

            <button
              onClick={() => window.location.reload()}
              className="mt-4 border border-[#1A2842] bg-[#1A2842] px-5 py-3 text-[9px] font-black uppercase tracking-[0.15em] text-white"
            >
              Refresh
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto border-t-2 border-[#1A2842]">
            <table className="w-full min-w-[1050px] border-collapse">
              <thead>
                <tr className="border-b border-[#1A2842]/20 text-left">
                  <th
                    onClick={() => changeSort("name")}
                    className="sticky left-0 z-10 cursor-pointer bg-[#F8F3EA] py-4 pr-6 text-[8px] font-black uppercase tracking-[0.14em] text-[#687384]"
                  >
                    Player
                    <SortArrow
                      active={sortBy === "name"}
                      direction={sortDirection}
                    />
                  </th>

                  <th className="px-4 py-4 text-[8px] font-black uppercase tracking-[0.14em] text-[#687384]">
                    Team
                  </th>

                  <th className="px-4 py-4 text-[8px] font-black uppercase tracking-[0.14em] text-[#687384]">
                    Pos
                  </th>

                  {viewMode !== "pitching" ? (
                    <>
                      <th
                        onClick={() => changeSort("games")}
                        className="cursor-pointer px-4 py-4 text-right text-[8px] font-black uppercase tracking-[0.14em] text-[#687384]"
                      >
                        G
                        <SortArrow
                          active={sortBy === "games"}
                          direction={sortDirection}
                        />
                      </th>

                      <th
                        onClick={() => changeSort("batting_avg")}
                        className="cursor-pointer px-4 py-4 text-right text-[8px] font-black uppercase tracking-[0.14em] text-[#687384]"
                      >
                        AVG
                        <SortArrow
                          active={sortBy === "batting_avg"}
                          direction={sortDirection}
                        />
                      </th>

                      <th
                        onClick={() => changeSort("obp")}
                        className="cursor-pointer px-4 py-4 text-right text-[8px] font-black uppercase tracking-[0.14em] text-[#687384]"
                      >
                        OBP
                        <SortArrow
                          active={sortBy === "obp"}
                          direction={sortDirection}
                        />
                      </th>

                      <th
                        onClick={() => changeSort("slg")}
                        className="cursor-pointer px-4 py-4 text-right text-[8px] font-black uppercase tracking-[0.14em] text-[#687384]"
                      >
                        SLG
                        <SortArrow
                          active={sortBy === "slg"}
                          direction={sortDirection}
                        />
                      </th>

                      <th
                        onClick={() => changeSort("ops")}
                        className="cursor-pointer px-4 py-4 text-right text-[8px] font-black uppercase tracking-[0.14em] text-[#D85F46]"
                      >
                        OPS
                        <SortArrow
                          active={sortBy === "ops"}
                          direction={sortDirection}
                        />
                      </th>

                      <th
                        onClick={() => changeSort("home_runs")}
                        className="cursor-pointer px-4 py-4 text-right text-[8px] font-black uppercase tracking-[0.14em] text-[#687384]"
                      >
                        HR
                        <SortArrow
                          active={sortBy === "home_runs"}
                          direction={sortDirection}
                        />
                      </th>

                      <th
                        onClick={() => changeSort("rbi")}
                        className="cursor-pointer px-4 py-4 text-right text-[8px] font-black uppercase tracking-[0.14em] text-[#687384]"
                      >
                        RBI
                        <SortArrow
                          active={sortBy === "rbi"}
                          direction={sortDirection}
                        />
                      </th>

                      <th
                        onClick={() => changeSort("hits")}
                        className="cursor-pointer px-4 py-4 text-right text-[8px] font-black uppercase tracking-[0.14em] text-[#687384]"
                      >
                        H
                        <SortArrow
                          active={sortBy === "hits"}
                          direction={sortDirection}
                        />
                      </th>

                      <th
                        onClick={() => changeSort("walks")}
                        className="cursor-pointer px-4 py-4 text-right text-[8px] font-black uppercase tracking-[0.14em] text-[#687384]"
                      >
                        BB
                        <SortArrow
                          active={sortBy === "walks"}
                          direction={sortDirection}
                        />
                      </th>

                      <th
                        onClick={() => changeSort("strikeouts")}
                        className="cursor-pointer px-4 py-4 text-right text-[8px] font-black uppercase tracking-[0.14em] text-[#687384]"
                      >
                        K
                        <SortArrow
                          active={sortBy === "strikeouts"}
                          direction={sortDirection}
                        />
                      </th>
                    </>
                  ) : (
                    <>
                      <th
                        onClick={() => changeSort("games")}
                        className="cursor-pointer px-4 py-4 text-right text-[8px] font-black uppercase tracking-[0.14em] text-[#687384]"
                      >
                        G
                        <SortArrow
                          active={sortBy === "games"}
                          direction={sortDirection}
                        />
                      </th>

                      <th
                        onClick={() => changeSort("innings_pitched")}
                        className="cursor-pointer px-4 py-4 text-right text-[8px] font-black uppercase tracking-[0.14em] text-[#687384]"
                      >
                        IP
                        <SortArrow
                          active={sortBy === "innings_pitched"}
                          direction={sortDirection}
                        />
                      </th>

                      <th
                        onClick={() => changeSort("era")}
                        className="cursor-pointer px-4 py-4 text-right text-[8px] font-black uppercase tracking-[0.14em] text-[#D85F46]"
                      >
                        ERA
                        <SortArrow
                          active={sortBy === "era"}
                          direction={sortDirection}
                        />
                      </th>

                      <th
                        onClick={() => changeSort("whip")}
                        className="cursor-pointer px-4 py-4 text-right text-[8px] font-black uppercase tracking-[0.14em] text-[#687384]"
                      >
                        WHIP
                        <SortArrow
                          active={sortBy === "whip"}
                          direction={sortDirection}
                        />
                      </th>

                      <th
                        onClick={() =>
                          changeSort("strikeouts_pitched")
                        }
                        className="cursor-pointer px-4 py-4 text-right text-[8px] font-black uppercase tracking-[0.14em] text-[#687384]"
                      >
                        K
                        <SortArrow
                          active={sortBy === "strikeouts_pitched"}
                          direction={sortDirection}
                        />
                      </th>

                      <th
                        onClick={() => changeSort("wins")}
                        className="cursor-pointer px-4 py-4 text-right text-[8px] font-black uppercase tracking-[0.14em] text-[#687384]"
                      >
                        W
                        <SortArrow
                          active={sortBy === "wins"}
                          direction={sortDirection}
                        />
                      </th>

                      <th
                        onClick={() => changeSort("losses")}
                        className="cursor-pointer px-4 py-4 text-right text-[8px] font-black uppercase tracking-[0.14em] text-[#687384]"
                      >
                        L
                        <SortArrow
                          active={sortBy === "losses"}
                          direction={sortDirection}
                        />
                      </th>
                    </>
                  )}
                </tr>
              </thead>

              <tbody>
                {loading ? (
                  <tr>
                    <td
                      colSpan={12}
                      className="py-20 text-center"
                    >
                      <p className="font-mono text-xs text-[#687384]">
                        Loading player database...
                      </p>
                    </td>
                  </tr>
                ) : visiblePlayers.length === 0 ? (
                  <tr>
                    <td
                      colSpan={12}
                      className="py-20 text-center"
                    >
                      <p className="text-lg font-black">
                        No players found
                      </p>

                      <p className="mt-2 text-xs text-[#687384]">
                        Try removing one or more filters.
                      </p>

                      <button
                        onClick={resetFilters}
                        className="mt-5 border border-[#1A2842] px-5 py-3 text-[9px] font-black uppercase tracking-[0.15em] hover:bg-[#1A2842] hover:text-white"
                      >
                        Reset Filters
                      </button>
                    </td>
                  </tr>
                ) : (
                  visiblePlayers.map((player) => {
                    const colors = getTeamAccent(player);

                    return (
                      <tr
                        key={player.id}
                        className="group border-b border-[#1A2842]/10 transition hover:bg-white/50"
                      >
                        {/* Player */}

                        <td className="sticky left-0 z-10 bg-[#F8F3EA] py-3 pr-6 group-hover:bg-white/80">
                          <Link
                            href={`/players/${player.id}`}
                            className="relative flex items-center gap-3"
                          >
                            <span
                              className="absolute -left-5 top-0 h-full w-[3px] opacity-0 transition group-hover:opacity-100"
                              style={{
                                backgroundColor: colors.secondary,
                              }}
                            />

                            <PlayerHeadshot playerId={player.id} />

                            <div className="min-w-0">
                              <p className="truncate text-sm font-black transition group-hover:text-[#D85F46]">
                                {player.name}
                              </p>

                              <p className="mt-0.5 font-mono text-[8px] text-[#687384]">
                                #{player.id}
                              </p>
                            </div>
                          </Link>
                        </td>

                        {/* Team */}

                        <td className="px-4 py-3">
                          <Link
                            href={
                              player.team
                                ? `/teams/${player.team.id}`
                                : "#"
                            }
                            className="flex items-center gap-2"
                          >
                            <TeamLogo
                              teamId={player.team?.id}
                            />

                            <span className="text-[10px] font-black uppercase tracking-[0.08em] transition group-hover:text-[#D85F46]">
                              {player.team?.abbreviation ?? "-"}
                            </span>
                          </Link>
                        </td>

                        {/* Position */}

                        <td className="px-4 py-3">
                          <span className="border border-[#1A2842]/10 px-2 py-1 font-mono text-[9px] text-[#687384]">
                            {player.position || "-"}
                          </span>
                        </td>

                        {viewMode !== "pitching" ? (
                          <>
                            <td className="px-4 py-4 text-right font-mono text-xs text-[#687384]">
                              {formatNumber(player.stats?.games)}
                            </td>

                            <td className="px-4 py-4 text-right font-mono text-xs">
                              {formatAverage(
                                player.stats?.batting_avg
                              )}
                            </td>

                            <td className="px-4 py-4 text-right font-mono text-xs">
                              {formatAverage(player.stats?.obp)}
                            </td>

                            <td className="px-4 py-4 text-right font-mono text-xs">
                              {formatAverage(player.stats?.slg)}
                            </td>

                            <td className="bg-[#D85F46]/[0.035] px-4 py-4 text-right font-mono text-xs font-black text-[#D85F46]">
                              {formatAverage(player.stats?.ops)}
                            </td>

                            <td className="px-4 py-4 text-right font-mono text-xs">
                              {formatNumber(
                                player.stats?.home_runs
                              )}
                            </td>

                            <td className="px-4 py-4 text-right font-mono text-xs">
                              {formatNumber(player.stats?.rbi)}
                            </td>

                            <td className="px-4 py-4 text-right font-mono text-xs">
                              {formatNumber(player.stats?.hits)}
                            </td>

                            <td className="px-4 py-4 text-right font-mono text-xs">
                              {formatNumber(player.stats?.walks)}
                            </td>

                            <td className="px-4 py-4 text-right font-mono text-xs">
                              {formatNumber(
                                player.stats?.strikeouts
                              )}
                            </td>
                          </>
                        ) : (
                          <>
                            <td className="px-4 py-4 text-right font-mono text-xs text-[#687384]">
                              {formatNumber(player.stats?.games)}
                            </td>

                            <td className="px-4 py-4 text-right font-mono text-xs">
                              {formatInnings(
                                player.stats?.innings_pitched
                              )}
                            </td>

                            <td className="bg-[#D85F46]/[0.035] px-4 py-4 text-right font-mono text-xs font-black text-[#D85F46]">
                              {formatDecimal(player.stats?.era)}
                            </td>

                            <td className="px-4 py-4 text-right font-mono text-xs">
                              {formatDecimal(player.stats?.whip)}
                            </td>

                            <td className="px-4 py-4 text-right font-mono text-xs">
                              {formatNumber(
                                player.stats?.strikeouts_pitched
                              )}
                            </td>

                            <td className="px-4 py-4 text-right font-mono text-xs">
                              {formatNumber(player.stats?.wins)}
                            </td>

                            <td className="px-4 py-4 text-right font-mono text-xs">
                              {formatNumber(player.stats?.losses)}
                            </td>
                          </>
                        )}
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        )}

        {/* Show more */}

        {!loading &&
          filteredPlayers.length > visiblePlayers.length && (
            <div className="flex justify-center border-b border-[#1A2842]/10 py-8">
              <button
                onClick={() =>
                  setVisibleCount((current) => current + 250)
                }
                className="border border-[#1A2842] bg-[#1A2842] px-7 py-3 text-[9px] font-black uppercase tracking-[0.16em] text-white transition hover:bg-[#D85F46] hover:border-[#D85F46]"
              >
                Show More Players
              </button>
            </div>
          )}

        {!loading &&
          filteredPlayers.length > 0 && (
            <div className="flex items-center justify-between pt-5">
              <p className="font-mono text-[9px] text-[#687384]">
                {visiblePlayers.length.toLocaleString()} of{" "}
                {filteredPlayers.length.toLocaleString()} shown
              </p>

              <p className="text-[8px] font-black uppercase tracking-[0.15em] text-[#687384]">
                Offshore Break · 2026
              </p>
            </div>
          )}
      </section>

      {/* ========================================================= */}
      {/* FOOTER */}
      {/* ========================================================= */}

      <section className="mt-8 border-t border-[#101A2C] bg-[#1A2842] px-5 py-14 text-[#F8F3EA] md:px-8">
        <div className="mx-auto max-w-[1440px]">
          <div className="flex flex-col justify-between gap-8 md:flex-row md:items-end">
            <div>
              <p className="text-[9px] font-black uppercase tracking-[0.2em] text-[#59B3AD]">
                Offshore Break
              </p>

              <h3 className="mt-3 text-3xl font-black tracking-[-0.04em]">
                The numbers are only the beginning.
              </h3>

              <p className="mt-3 max-w-lg text-xs leading-5 text-white/40">
                Browse the player database, compare individual
                profiles, or explore the rest of the Offshore Break
                baseball universe.
              </p>
            </div>

            <div className="flex flex-wrap gap-2">
              <Link
                href="/leaders"
                className="border border-white/15 px-5 py-3 text-[9px] font-black uppercase tracking-[0.15em] text-white/65 transition hover:border-[#D85F46] hover:bg-[#D85F46] hover:text-white"
              >
                Leaderboards →
              </Link>

              <Link
                href="/teams"
                className="border border-white/15 px-5 py-3 text-[9px] font-black uppercase tracking-[0.15em] text-white/65 transition hover:border-[#59B3AD] hover:bg-[#59B3AD] hover:text-white"
              >
                Teams →
              </Link>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}