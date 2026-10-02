"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import {
  SEASON,
  fetchAll,
  formatAverage,
  formatDecimal,
  formatInnings,
  formatNumber,
  getTeamColors,
  getThresholds,
  headshot,
  teamLogo,
} from "@/lib/baseball";

/* ───────────────────────── Types ───────────────────────── */

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
  | "earned_runs"
  | "strikeouts_pitched";

type Column = {
  key: SortKey;
  label: string;
  format: (value: number | null | undefined) => string;
  highlight?: boolean;
};

const PAGE_SIZE = 250;

const hittingColumns: Column[] = [
  { key: "games", label: "G", format: formatNumber },
  { key: "batting_avg", label: "AVG", format: formatAverage },
  { key: "obp", label: "OBP", format: formatAverage },
  { key: "slg", label: "SLG", format: formatAverage },
  { key: "ops", label: "OPS", format: formatAverage, highlight: true },
  { key: "home_runs", label: "HR", format: formatNumber },
  { key: "rbi", label: "RBI", format: formatNumber },
  { key: "hits", label: "H", format: formatNumber },
  { key: "walks", label: "BB", format: formatNumber },
  { key: "strikeouts", label: "K", format: formatNumber },
];

const pitchingColumns: Column[] = [
  { key: "games", label: "G", format: formatNumber },
  { key: "innings_pitched", label: "IP", format: formatInnings },
  { key: "era", label: "ERA", format: formatDecimal, highlight: true },
  { key: "whip", label: "WHIP", format: formatDecimal },
  { key: "strikeouts_pitched", label: "K", format: formatNumber },
  { key: "wins", label: "W", format: formatNumber },
  { key: "losses", label: "L", format: formatNumber },
  { key: "earned_runs", label: "ER", format: formatNumber },
];

const PITCHING_ONLY: SortKey[] = [
  "era",
  "whip",
  "strikeouts_pitched",
  "innings_pitched",
  "wins",
  "losses",
  "earned_runs",
];

/** Sensible starting filters so one-at-bat players don't top every list */
function defaultsFor(mode: ViewMode) {
  return {
    minAB: mode === "hitting" ? "50" : "0",
    minIP: mode === "pitching" ? "10" : "0",
  };
}

/* ───────────────────────── Components ───────────────────────── */

function TeamLogo({ teamId }: { teamId?: string }) {
  if (!teamId) {
    return (
      <div className="flex h-9 w-9 items-center justify-center border border-[#1A2842]/15 bg-white/40 font-mono text-[0.65rem] font-bold text-[#1F7A74]">
        FA
      </div>
    );
  }

  return (
    <img
      src={teamLogo(teamId)}
      alt=""
      aria-hidden="true"
      className="h-9 w-9 object-contain"
    />
  );
}

function PlayerHeadshot({ playerId }: { playerId: number }) {
  const [failed, setFailed] = useState(false);

  return (
    <div className="h-12 w-12 shrink-0 overflow-hidden rounded-full bg-[#E8E1D5]">
      {!failed && (
        <img
          src={headshot(playerId, 96)}
          alt=""
          aria-hidden="true"
          loading="lazy"
          onError={() => setFailed(true)}
          className="h-full w-full object-cover"
        />
      )}
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
  if (!active) return <span className="ml-1 text-[#1A2842]/25">↕</span>;

  return (
    <span className="ml-1 text-[#D85F46]">{direction === "desc" ? "↓" : "↑"}</span>
  );
}

/* ───────────────────────── Page ───────────────────────── */

export default function PlayersPage() {
  const [players, setPlayers] = useState<Player[]>([]);
  const [stats, setStats] = useState<PlayerStat[]>([]);
  const [teams, setTeams] = useState<Team[]>([]);

  const [search, setSearch] = useState("");
  const [position, setPosition] = useState("All");
  const [team, setTeam] = useState("All");
  const [viewMode, setViewMode] = useState<ViewMode>("hitting");

  const [sortBy, setSortBy] = useState<SortKey>("ops");
  const [sortDirection, setSortDirection] = useState<"desc" | "asc">("desc");

  const [minGames, setMinGames] = useState("0");
  const [minAB, setMinAB] = useState(defaultsFor("hitting").minAB);
  const [minIP, setMinIP] = useState(defaultsFor("hitting").minIP);

  const [showQualifiedOnly, setShowQualifiedOnly] = useState(false);
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  /* Load everything (paged past Supabase's 1,000-row cap) */
  useEffect(() => {
    let cancelled = false;

    async function loadData() {
      setLoading(true);
      setError("");

      try {
        const [playerData, statData, { data: teamData, error: teamError }] =
          await Promise.all([
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
                .eq("season", SEASON)
                .order("player_id")
                .range(from, to)
            ),
            supabase.from("Teams").select("id, name, abbreviation").order("name"),
          ]);

        if (teamError) throw teamError;

        if (!cancelled) {
          setPlayers(playerData);
          setStats(statData);
          setTeams((teamData ?? []) as Team[]);
        }
      } catch (err) {
        console.error("Failed to load players:", err);
        if (!cancelled) {
          setError("Unable to load player data. Please refresh the page.");
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

  /* Honor links from the leaders page: /players?sort=era&dir=asc */
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const sort = params.get("sort") as SortKey | null;
    if (!sort) return;

    const knownKeys = new Set<SortKey>([
      ...hittingColumns.map((column) => column.key),
      ...pitchingColumns.map((column) => column.key),
    ]);
    if (!knownKeys.has(sort)) return;

    const mode: ViewMode = PITCHING_ONLY.includes(sort) ? "pitching" : "hitting";
    const defaults = defaultsFor(mode);

    setViewMode(mode);
    setMinAB(defaults.minAB);
    setMinIP(defaults.minIP);
    setSortBy(sort);
    setSortDirection(params.get("dir") === "asc" ? "asc" : "desc");
  }, []);

  const thresholds = useMemo(() => getThresholds(stats), [stats]);

  const statMap = useMemo(
    () => new Map(stats.map((stat) => [stat.player_id, stat])),
    [stats]
  );

  const teamMap = useMemo(
    () => new Map(teams.map((item) => [item.id, item])),
    [teams]
  );

  const positions = useMemo(
    () =>
      Array.from(
        new Set(players.map((player) => player.position).filter(Boolean))
      ).sort(),
    [players]
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

  const filteredPlayers = useMemo(() => {
    const minimumGames = Number(minGames) || 0;
    const minimumAB = Number(minAB) || 0;
    const minimumIP = Number(minIP) || 0;
    const normalizedSearch = search.trim().toLowerCase();

    const filtered = playerRows.filter((player) => {
      const stat = player.stats;

      const matchesSearch =
        normalizedSearch.length === 0 ||
        player.name.toLowerCase().includes(normalizedSearch);

      const matchesPosition = position === "All" || player.position === position;
      const matchesTeam = team === "All" || player.team_id === team;

      const matchesMode =
        viewMode === "all" ||
        (viewMode === "hitting" && (stat?.at_bats ?? 0) > 0) ||
        (viewMode === "pitching" && (stat?.innings_pitched ?? 0) > 0);

      const matchesGames = (stat?.games ?? 0) >= minimumGames;
      const matchesAB = viewMode !== "hitting" || (stat?.at_bats ?? 0) >= minimumAB;
      const matchesIP =
        viewMode !== "pitching" || (stat?.innings_pitched ?? 0) >= minimumIP;

      const matchesQualified =
        !showQualifiedOnly ||
        (viewMode === "pitching"
          ? (stat?.innings_pitched ?? 0) >= thresholds.minIp
          : (stat?.at_bats ?? 0) >= thresholds.minAb);

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

      const aRaw = a.stats?.[sortBy as keyof PlayerStat];
      const bRaw = b.stats?.[sortBy as keyof PlayerStat];
      const aValue = aRaw == null ? null : Number(aRaw);
      const bValue = bRaw == null ? null : Number(bRaw);

      // players with no value always sink to the bottom
      if (aValue === null && bValue === null) return 0;
      if (aValue === null) return 1;
      if (bValue === null) return -1;

      return sortDirection === "asc" ? aValue - bValue : bValue - aValue;
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
    thresholds,
  ]);

  const visiblePlayers = filteredPlayers.slice(0, visibleCount);

  const selectedTeam = useMemo(
    () => teams.find((item) => item.id === team),
    [teams, team]
  );

  const defaults = defaultsFor(viewMode);

  const activeFilterCount =
    Number(search.length > 0) +
    Number(position !== "All") +
    Number(team !== "All") +
    Number(minGames !== "0") +
    Number(minAB !== defaults.minAB) +
    Number(minIP !== defaults.minIP) +
    Number(showQualifiedOnly);

  const columns = viewMode === "pitching" ? pitchingColumns : hittingColumns;
  const sortOptions = columns.map((column) => ({
    value: column.key,
    label: column.label,
  }));

  function changeSort(value: SortKey) {
    if (sortBy === value) {
      setSortDirection((current) => (current === "desc" ? "asc" : "desc"));
    } else {
      setSortBy(value);
      // ERA / WHIP / losses / earned runs: lower is better
      setSortDirection(
        ["era", "whip", "losses", "earned_runs", "name"].includes(value)
          ? "asc"
          : "desc"
      );
    }
  }

  function changeView(mode: ViewMode) {
    const next = defaultsFor(mode);

    setViewMode(mode);
    setMinAB(next.minAB);
    setMinIP(next.minIP);
    setVisibleCount(PAGE_SIZE);

    if (mode === "pitching") {
      setSortBy("era");
      setSortDirection("asc");
    } else {
      setSortBy("ops");
      setSortDirection("desc");
    }
  }

  function resetFilters() {
    const next = defaultsFor(viewMode);

    setSearch("");
    setPosition("All");
    setTeam("All");
    setMinGames("0");
    setMinAB(next.minAB);
    setMinIP(next.minIP);
    setShowQualifiedOnly(false);
    setVisibleCount(PAGE_SIZE);
  }

  const labelClass =
    "text-[0.7rem] font-bold uppercase tracking-[0.16em] text-[#1F7A74]";
  const selectClass =
    "border border-[#1A2842]/20 bg-[#F8F3EA] px-4 py-3.5 text-base outline-none focus:border-[#D85F46]";

  return (
    <main className="min-h-screen bg-[#F8F3EA] text-[#1A2842]">
      {/* HEADER */}
      <section className="border-b border-[#1A2842]/15">
        <div className="container-page py-12 md:py-16">
          <div className="flex flex-col justify-between gap-8 lg:flex-row lg:items-end">
            <div>
              <p className="text-[0.75rem] font-bold uppercase tracking-[0.22em] text-[#1F7A74]">
                Offshore Break / Database
              </p>

              <h1 className="mt-3 text-5xl font-black tracking-[-0.06em] md:text-7xl">
                Players
              </h1>

              <p className="mt-4 max-w-2xl text-base leading-7 text-[#687384]">
                Explore the {SEASON} player database by performance, team,
                position, and statistical profile.
              </p>
            </div>

            <div className="flex gap-8 border-l border-[#1A2842]/15 pl-6">
              <div>
                <p className="font-mono text-4xl font-black">
                  {players.length.toLocaleString()}
                </p>
                <p className={`mt-1 ${labelClass}`}>Players</p>
              </div>

              <div>
                <p className="font-mono text-4xl font-black">{teams.length}</p>
                <p className={`mt-1 ${labelClass}`}>Teams</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* CONTROLS */}
      <section className="border-b border-[#1A2842]/15 bg-[#FCF9F3]">
        <div className="container-page py-6">
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
                  className={`border-r border-[#1A2842]/20 px-6 py-3 text-[0.75rem] font-black uppercase tracking-[0.16em] transition last:border-r-0 ${
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
                  <span className="text-[0.75rem] font-black uppercase tracking-[0.15em]">
                    {selectedTeam.abbreviation}
                  </span>
                </div>
              )}

              <p className="font-mono text-sm font-bold text-[#1F7A74]">
                {filteredPlayers.length.toLocaleString()} results
              </p>

              {activeFilterCount > 0 && (
                <button
                  onClick={resetFilters}
                  className="text-[0.75rem] font-black uppercase tracking-[0.15em] text-[#D85F46] hover:underline"
                >
                  Reset
                </button>
              )}
            </div>
          </div>

          <div className="mt-6 grid gap-3 lg:grid-cols-[2fr_1fr_1fr_1fr]">
            <div className="relative">
              <input
                type="text"
                placeholder="Search player name..."
                value={search}
                onChange={(event) => {
                  setSearch(event.target.value);
                  setVisibleCount(PAGE_SIZE);
                }}
                className="w-full border border-[#1A2842]/20 bg-[#F8F3EA] px-4 py-3.5 pr-10 text-base outline-none transition placeholder:text-[#687384] focus:border-[#D85F46]"
              />

              {search && (
                <button
                  onClick={() => setSearch("")}
                  aria-label="Clear search"
                  className="absolute right-3 top-1/2 -translate-y-1/2 font-mono text-base text-[#687384] hover:text-[#D85F46]"
                >
                  ×
                </button>
              )}
            </div>

            <select
              value={team}
              onChange={(event) => {
                setTeam(event.target.value);
                setVisibleCount(PAGE_SIZE);
              }}
              className={selectClass}
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
                setVisibleCount(PAGE_SIZE);
              }}
              className={selectClass}
            >
              <option value="All">All Positions</option>
              {positions.map((item) => (
                <option key={item} value={item}>
                  {item}
                </option>
              ))}
            </select>

            <select
              value={sortBy === "name" ? "" : sortBy}
              onChange={(event) => changeSort(event.target.value as SortKey)}
              className={selectClass}
            >
              {sortBy === "name" && <option value="">Sorted by name</option>}
              {sortOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  Sort by {option.label}
                </option>
              ))}
            </select>
          </div>

          <div className="mt-3 grid gap-3 md:grid-cols-3 lg:grid-cols-4">
            <select
              value={minGames}
              onChange={(event) => {
                setMinGames(event.target.value);
                setVisibleCount(PAGE_SIZE);
              }}
              className="border border-[#1A2842]/15 bg-[#F8F3EA] px-4 py-3 text-sm outline-none focus:border-[#D85F46]"
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
                  setVisibleCount(PAGE_SIZE);
                }}
                className="border border-[#1A2842]/15 bg-[#F8F3EA] px-4 py-3 text-sm outline-none focus:border-[#D85F46]"
              >
                <option value="0">Any At Bats</option>
                <option value="50">50+ AB</option>
                <option value="100">100+ AB</option>
                <option value="150">150+ AB</option>
                <option value="300">300+ AB</option>
                <option value="450">450+ AB</option>
              </select>
            )}

            {viewMode === "pitching" && (
              <select
                value={minIP}
                onChange={(event) => {
                  setMinIP(event.target.value);
                  setVisibleCount(PAGE_SIZE);
                }}
                className="border border-[#1A2842]/15 bg-[#F8F3EA] px-4 py-3 text-sm outline-none focus:border-[#D85F46]"
              >
                <option value="0">Any Innings</option>
                <option value="10">10+ IP</option>
                <option value="25">25+ IP</option>
                <option value="50">50+ IP</option>
                <option value="100">100+ IP</option>
                <option value="150">150+ IP</option>
              </select>
            )}

            <label className="flex cursor-pointer items-center gap-3 border border-[#1A2842]/15 bg-[#F8F3EA] px-4 py-3">
              <input
                type="checkbox"
                checked={showQualifiedOnly}
                onChange={(event) => {
                  setShowQualifiedOnly(event.target.checked);
                  setVisibleCount(PAGE_SIZE);
                }}
                className="h-4 w-4 accent-[#D85F46]"
              />

              <span className="text-[0.75rem] font-black uppercase tracking-[0.14em]">
                Qualified Only
                <span className="ml-2 font-mono font-semibold normal-case tracking-normal text-[#1F7A74]">
                  {viewMode === "pitching"
                    ? `${thresholds.minIp}+ IP`
                    : `${thresholds.minAb}+ AB`}
                </span>
              </span>
            </label>

            <div className="hidden items-center justify-end lg:flex">
              <p className={labelClass}>
                {viewMode === "pitching" ? "Pitching data" : "Hitting data"} ·{" "}
                {SEASON}
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ACTIVE FILTERS */}
      {(search || position !== "All" || team !== "All" || showQualifiedOnly) && (
        <section className="border-b border-[#1A2842]/10 bg-[#F8F3EA]">
          <div className="container-page flex flex-wrap items-center gap-2 py-3">
            <span className={`mr-1 ${labelClass}`}>Filters</span>

            {search && (
              <span className="border border-[#1A2842]/15 bg-white/40 px-3 py-1.5 font-mono text-xs">
                {search}
              </span>
            )}

            {position !== "All" && (
              <span className="border border-[#1A2842]/15 bg-white/40 px-3 py-1.5 font-mono text-xs">
                {position}
              </span>
            )}

            {selectedTeam && (
              <span className="border border-[#1A2842]/15 bg-white/40 px-3 py-1.5 font-mono text-xs">
                {selectedTeam.abbreviation}
              </span>
            )}

            {showQualifiedOnly && (
              <span className="border border-[#D85F46]/30 bg-[#D85F46]/5 px-3 py-1.5 font-mono text-xs text-[#D85F46]">
                QUALIFIED
              </span>
            )}
          </div>
        </section>
      )}

      {/* TABLE */}
      <section className="container-page py-10">
        <div className="mb-5 flex items-end justify-between">
          <div>
            <p className={labelClass}>{SEASON} Player Index</p>

            <h2 className="mt-1 text-3xl font-black tracking-[-0.03em]">
              {viewMode === "pitching"
                ? "Pitching Leaders"
                : viewMode === "hitting"
                  ? "Hitting Leaders"
                  : "All Players"}
            </h2>
          </div>

          <div className="hidden text-right md:block">
            <p className="font-mono text-sm font-bold">
              Showing {visiblePlayers.length.toLocaleString()}
              {filteredPlayers.length > visiblePlayers.length
                ? ` of ${filteredPlayers.length.toLocaleString()}`
                : ""}
            </p>

            <p className={`mt-1 ${labelClass}`}>
              Sorted {sortDirection === "desc" ? "Descending" : "Ascending"}
            </p>
          </div>
        </div>

        {error ? (
          <div className="border border-[#D85F46]/30 bg-[#D85F46]/5 px-6 py-16 text-center">
            <p className="text-base font-bold text-[#D85F46]">{error}</p>

            <button
              onClick={() => window.location.reload()}
              className="mt-4 border border-[#1A2842] bg-[#1A2842] px-5 py-3 text-[0.75rem] font-black uppercase tracking-[0.15em] text-white"
            >
              Refresh
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto border-t-2 border-[#1A2842]">
            <table className="w-full min-w-[64rem] border-collapse">
              <thead>
                <tr className="border-b border-[#1A2842]/20 text-left">
                  <th
                    onClick={() => changeSort("name")}
                    className="sticky left-0 z-10 cursor-pointer bg-[#F8F3EA] py-4 pr-6 text-[0.75rem] font-black uppercase tracking-[0.14em] text-[#1F7A74]"
                  >
                    Player
                    <SortArrow active={sortBy === "name"} direction={sortDirection} />
                  </th>

                  <th className="px-4 py-4 text-[0.75rem] font-black uppercase tracking-[0.14em] text-[#1F7A74]">
                    Team
                  </th>

                  <th className="px-4 py-4 text-[0.75rem] font-black uppercase tracking-[0.14em] text-[#1F7A74]">
                    Pos
                  </th>

                  {columns.map((column) => (
                    <th
                      key={column.key}
                      onClick={() => changeSort(column.key)}
                      className={`cursor-pointer px-4 py-4 text-right text-[0.75rem] font-black uppercase tracking-[0.14em] ${
                        column.highlight ? "text-[#D85F46]" : "text-[#1F7A74]"
                      }`}
                    >
                      {column.label}
                      <SortArrow
                        active={sortBy === column.key}
                        direction={sortDirection}
                      />
                    </th>
                  ))}
                </tr>
              </thead>

              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan={3 + columns.length} className="py-20 text-center">
                      <p className="font-mono text-sm text-[#687384]">
                        Loading player database...
                      </p>
                    </td>
                  </tr>
                ) : visiblePlayers.length === 0 ? (
                  <tr>
                    <td colSpan={3 + columns.length} className="py-20 text-center">
                      <p className="text-xl font-black">No players found</p>
                      <p className="mt-2 text-sm text-[#687384]">
                        Try removing one or more filters.
                      </p>

                      <button
                        onClick={resetFilters}
                        className="mt-5 border border-[#1A2842] px-5 py-3 text-[0.75rem] font-black uppercase tracking-[0.15em] hover:bg-[#1A2842] hover:text-white"
                      >
                        Reset Filters
                      </button>
                    </td>
                  </tr>
                ) : (
                  visiblePlayers.map((player) => {
                    const colors = getTeamColors(player.team?.name);

                    return (
                      <tr
                        key={player.id}
                        className="group border-b border-[#1A2842]/10 transition hover:bg-white/50"
                      >
                        <td className="sticky left-0 z-10 bg-[#F8F3EA] py-3 pr-6 group-hover:bg-white/80">
                          <Link
                            href={`/players/${player.id}`}
                            className="relative flex items-center gap-3"
                          >
                            <span
                              className="absolute -left-5 top-0 h-full w-[3px] opacity-0 transition group-hover:opacity-100"
                              style={{ backgroundColor: colors.secondary }}
                            />

                            <PlayerHeadshot playerId={player.id} />

                            <div className="min-w-0">
                              <p className="truncate text-base font-black transition group-hover:text-[#D85F46]">
                                {player.name}
                              </p>
                              <p className="mt-0.5 font-mono text-[0.7rem] font-semibold text-[#1F7A74]">
                                #{player.id}
                              </p>
                            </div>
                          </Link>
                        </td>

                        <td className="px-4 py-3">
                          <Link
                            href={player.team ? `/teams/${player.team.id}` : "#"}
                            className="flex items-center gap-2"
                          >
                            <TeamLogo teamId={player.team?.id} />
                            <span className="text-xs font-black uppercase tracking-[0.08em] transition group-hover:text-[#D85F46]">
                              {player.team?.abbreviation ?? "-"}
                            </span>
                          </Link>
                        </td>

                        <td className="px-4 py-3">
                          <span className="border border-[#1F7A74]/25 px-2 py-1 font-mono text-xs font-semibold text-[#1F7A74]">
                            {player.position || "-"}
                          </span>
                        </td>

                        {columns.map((column) => {
                          const value = player.stats?.[
                            column.key as keyof PlayerStat
                          ] as number | null | undefined;

                          return (
                            <td
                              key={column.key}
                              className={`px-4 py-4 text-right font-mono text-sm ${
                                column.highlight
                                  ? "bg-[#D85F46]/[0.035] font-black text-[#D85F46]"
                                  : column.key === "games"
                                    ? "text-[#687384]"
                                    : ""
                              }`}
                            >
                              {column.format(value)}
                            </td>
                          );
                        })}
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        )}

        {!loading && filteredPlayers.length > visiblePlayers.length && (
          <div className="flex justify-center border-b border-[#1A2842]/10 py-8">
            <button
              onClick={() => setVisibleCount((current) => current + PAGE_SIZE)}
              className="border border-[#1A2842] bg-[#1A2842] px-8 py-3.5 text-[0.75rem] font-black uppercase tracking-[0.16em] text-white transition hover:border-[#D85F46] hover:bg-[#D85F46]"
            >
              Show More Players
            </button>
          </div>
        )}

        {!loading && filteredPlayers.length > 0 && (
          <div className="flex items-center justify-between pt-5">
            <p className="font-mono text-xs font-semibold text-[#1F7A74]">
              {visiblePlayers.length.toLocaleString()} of{" "}
              {filteredPlayers.length.toLocaleString()} shown
            </p>

            <p className={labelClass}>Offshore Break · {SEASON}</p>
          </div>
        )}
      </section>
    </main>
  );
}
