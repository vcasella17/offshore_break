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

const statOptions = [
  { value: "name", label: "Player" },
  { value: "batting_avg", label: "AVG" },
  { value: "obp", label: "OBP" },
  { value: "slg", label: "SLG" },
  { value: "ops", label: "OPS" },
  { value: "home_runs", label: "HR" },
  { value: "rbi", label: "RBI" },
  { value: "hits", label: "H" },
  { value: "walks", label: "BB" },
  { value: "strikeouts", label: "K" },
];

function formatAverage(value: number | null | undefined) {
  if (value === null || value === undefined) return "-";
  return value.toFixed(3).replace(/^0/, "");
}

function formatNumber(value: number | null | undefined) {
  if (value === null || value === undefined) return "-";
  return value.toString();
}

function PlayerHeadshot({ playerId }: { playerId: number }) {
  return (
    <img
      src={`https://img.mlbstatic.com/mlb-photos/image/upload/d_people:generic:headshot:67:current.png/w_80,q_auto:best/v1/people/${playerId}/headshot/67/current`}
      alt=""
      className="h-12 w-12 rounded-full object-cover"
    />
  );
}

export default function PlayersPage() {
  const [players, setPlayers] = useState<Player[]>([]);
  const [stats, setStats] = useState<PlayerStat[]>([]);
  const [teams, setTeams] = useState<Team[]>([]);

  const [search, setSearch] = useState("");
  const [position, setPosition] = useState("All");
  const [team, setTeam] = useState("All");
  const [sortBy, setSortBy] = useState("ops");
  const [sortDirection, setSortDirection] = useState<"desc" | "asc">("desc");

  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadData() {
      const [{ data: playerData }, { data: statData }, { data: teamData }] =
        await Promise.all([
          supabase
            .from("Player")
            .select("id, name, team_id, position")
            .order("name")
            .range(0, 4999),

          supabase
            .from("PlayerStats")
            .select(
              "player_id, season, games, at_bats, hits, home_runs, rbi, walks, strikeouts, batting_avg, obp, slg, ops"
            )
            .eq("season", 2026),

          supabase
            .from("Teams")
            .select("id, name, abbreviation")
            .order("name"),
        ]);

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
      new Set(players.map((player) => player.position).filter(Boolean))
    ).sort();
  }, [players]);

  const filteredPlayers = useMemo(() => {
    const rows: PlayerRow[] = players.map((player) => ({
      ...player,
      stats: statMap.get(player.id),
      team: teamMap.get(player.team_id),
    }));

    const filtered = rows.filter((player) => {
      const matchesSearch = player.name
        .toLowerCase()
        .includes(search.toLowerCase());

      const matchesPosition =
        position === "All" || player.position === position;

      const matchesTeam = team === "All" || player.team_id === team;

      return matchesSearch && matchesPosition && matchesTeam;
    });

    filtered.sort((a, b) => {
      if (sortBy === "name") {
        return sortDirection === "asc"
          ? a.name.localeCompare(b.name)
          : b.name.localeCompare(a.name);
      }

      const aValue = Number(a.stats?.[sortBy as keyof PlayerStat] ?? -1);
      const bValue = Number(b.stats?.[sortBy as keyof PlayerStat] ?? -1);

      return sortDirection === "asc"
        ? aValue - bValue
        : bValue - aValue;
    });

    return filtered;
  }, [
    players,
    statMap,
    teamMap,
    search,
    position,
    team,
    sortBy,
    sortDirection,
  ]);

  function changeSort(value: string) {
    if (sortBy === value) {
      setSortDirection((current) => (current === "desc" ? "asc" : "desc"));
    } else {
      setSortBy(value);
      setSortDirection("desc");
    }
  }

  return (
    <main className="min-h-screen bg-[#F8F3EA] text-[#1A2842]">
      <section className="border-b border-[#1A2842]/20">
        <div className="mx-auto max-w-7xl px-6 py-14">
          <p className="text-xs font-bold uppercase tracking-[0.25em] text-[#D85F46]">
            Player Analytics
          </p>

          <div className="mt-3 flex items-end justify-between gap-6">
            <div>
              <h1 className="text-5xl font-black tracking-[-0.05em]">
                Players
              </h1>

              <p className="mt-3 max-w-xl text-[#687384]">
                Explore player performance across the 2026 season.
              </p>
            </div>

            <div className="hidden text-right md:block">
              <p className="text-3xl font-black">
                {players.length.toLocaleString()}
              </p>

              <p className="text-xs font-bold uppercase tracking-[0.16em] text-[#687384]">
                Players
              </p>
            </div>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-6 pt-8">
        <div className="grid gap-3 border-b border-[#1A2842]/20 pb-8 md:grid-cols-[2fr_1fr_1fr_1fr]">
          <input
            type="text"
            placeholder="Search players..."
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            className="border border-[#1A2842]/25 bg-transparent px-4 py-3 text-sm outline-none placeholder:text-[#687384] focus:border-[#1A2842]"
          />

          <select
            value={position}
            onChange={(event) => setPosition(event.target.value)}
            className="border border-[#1A2842]/25 bg-[#F8F3EA] px-4 py-3 text-sm outline-none focus:border-[#1A2842]"
          >
            <option value="All">All Positions</option>

            {positions.map((item) => (
              <option key={item} value={item}>
                {item}
              </option>
            ))}
          </select>

          <select
            value={team}
            onChange={(event) => setTeam(event.target.value)}
            className="border border-[#1A2842]/25 bg-[#F8F3EA] px-4 py-3 text-sm outline-none focus:border-[#1A2842]"
          >
            <option value="All">All Teams</option>

            {teams.map((item) => (
              <option key={item.id} value={item.id}>
                {item.abbreviation}
              </option>
            ))}
          </select>

          <select
            value={sortBy}
            onChange={(event) => changeSort(event.target.value)}
            className="border border-[#1A2842]/25 bg-[#F8F3EA] px-4 py-3 text-sm outline-none focus:border-[#1A2842]"
          >
            {statOptions.map((option) => (
              <option key={option.value} value={option.value}>
                Sort by {option.label}
              </option>
            ))}
          </select>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-6 py-8">
        <div className="mb-4 flex items-center justify-between">
          <p className="text-xs font-bold uppercase tracking-[0.15em] text-[#687384]">
            {filteredPlayers.length.toLocaleString()} Players
          </p>

          <p className="text-xs uppercase tracking-[0.15em] text-[#687384]">
            2026 Season
          </p>
        </div>

        <div className="overflow-x-auto border-t border-[#1A2842]">
          <table className="w-full min-w-[980px] border-collapse">
            <thead>
              <tr className="border-b border-[#1A2842]/20 text-left">
                <th className="py-4 pr-6 text-xs font-bold uppercase tracking-[0.12em] text-[#687384]">
                  Player
                </th>

                <th className="py-4 px-4 text-xs font-bold uppercase tracking-[0.12em] text-[#687384]">
                  Team
                </th>

                <th className="py-4 px-4 text-xs font-bold uppercase tracking-[0.12em] text-[#687384]">
                  Pos
                </th>

                {statOptions.slice(1).map((option) => (
                  <th
                    key={option.value}
                    onClick={() => changeSort(option.value)}
                    className="cursor-pointer px-4 py-4 text-right text-xs font-bold uppercase tracking-[0.12em] text-[#687384] hover:text-[#D85F46]"
                  >
                    {option.label}

                    {sortBy === option.value && (
                      <span className="ml-1 text-[#D85F46]">
                        {sortDirection === "desc" ? "↓" : "↑"}
                      </span>
                    )}
                  </th>
                ))}
              </tr>
            </thead>

            <tbody>
              {loading ? (
                <tr>
                  <td
                    colSpan={12}
                    className="py-16 text-center text-sm text-[#687384]"
                  >
                    Loading players...
                  </td>
                </tr>
              ) : filteredPlayers.length === 0 ? (
                <tr>
                  <td
                    colSpan={12}
                    className="py-16 text-center text-sm text-[#687384]"
                  >
                    No players found
                  </td>
                </tr>
              ) : (
                filteredPlayers.map((player) => (
                  <tr
                    key={player.id}
                    className="group border-b border-[#1A2842]/15 transition hover:bg-[#59B3AD]/10"
                  >
                    <td className="py-3 pr-6">
                      <Link
                        href={`/players/${player.id}`}
                        className="flex items-center gap-4"
                      >
                        <PlayerHeadshot playerId={player.id} />

                        <div>
                          <p className="font-bold group-hover:text-[#D85F46]">
                            {player.name}
                          </p>

                          <p className="text-xs text-[#687384]">
                            MLB ID {player.id}
                          </p>
                        </div>
                      </Link>
                    </td>

                    <td className="px-4 py-4">
                      <span className="text-sm font-bold">
                        {player.team?.abbreviation ?? "-"}
                      </span>
                    </td>

                    <td className="px-4 py-4 text-sm text-[#687384]">
                      {player.position || "-"}
                    </td>

                    <td className="px-4 py-4 text-right text-sm font-semibold">
                      {formatAverage(player.stats?.batting_avg)}
                    </td>

                    <td className="px-4 py-4 text-right text-sm font-semibold">
                      {formatAverage(player.stats?.obp)}
                    </td>

                    <td className="px-4 py-4 text-right text-sm font-semibold">
                      {formatAverage(player.stats?.slg)}
                    </td>

                    <td className="px-4 py-4 text-right text-sm font-black">
                      {formatAverage(player.stats?.ops)}
                    </td>

                    <td className="px-4 py-4 text-right text-sm">
                      {formatNumber(player.stats?.home_runs)}
                    </td>

                    <td className="px-4 py-4 text-right text-sm">
                      {formatNumber(player.stats?.rbi)}
                    </td>

                    <td className="px-4 py-4 text-right text-sm">
                      {formatNumber(player.stats?.hits)}
                    </td>

                    <td className="px-4 py-4 text-right text-sm">
                      {formatNumber(player.stats?.walks)}
                    </td>

                    <td className="px-4 py-4 text-right text-sm">
                      {formatNumber(player.stats?.strikeouts)}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>

      <section className="mt-8 border-t border-[#1A2842] bg-[#1A2842] px-6 py-12 text-[#F8F3EA]">
        <div className="mx-auto max-w-7xl">
          <p className="text-xs font-bold uppercase tracking-[0.2em] text-[#59B3AD]">
            Offshore Break
          </p>

          <p className="mt-3 text-2xl font-black tracking-[-0.03em]">
            The numbers are only the beginning.
          </p>
        </div>
      </section>
    </main>
  );
}