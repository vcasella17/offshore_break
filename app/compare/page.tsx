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
  innings_pitched: number | null;
  wins: number | null;
  losses: number | null;
  era: number | null;
  whip: number | null;
  strikeouts_pitched: number | null;
};

type Team = {
  id: string;
  name: string;
  abbreviation: string;
};

function Headshot({ playerId }: { playerId: number }) {
  return (
    <img
      src={`https://img.mlbstatic.com/mlb-photos/image/upload/w_300,q_auto:good/v1/people/${playerId}/headshot/67/current`}
      alt=""
      className="h-28 w-28 object-contain"
    />
  );
}

function formatAverage(value: number | null | undefined) {
  if (value === null || value === undefined) return "—";
  return value.toFixed(3).replace(/^0/, "");
}

function formatDecimal(value: number | null | undefined) {
  if (value === null || value === undefined) return "—";
  return value.toFixed(3);
}

function formatNumber(value: number | null | undefined) {
  if (value === null || value === undefined) return "—";
  return value.toLocaleString();
}

// Rows to display. "higherIsBetter" decides which side gets highlighted.
const hittingRows: {
  label: string;
  key: keyof PlayerStat;
  format: (v: number | null | undefined) => string;
  higherIsBetter: boolean;
}[] = [
  { label: "AVG", key: "batting_avg", format: formatAverage, higherIsBetter: true },
  { label: "OBP", key: "obp", format: formatAverage, higherIsBetter: true },
  { label: "SLG", key: "slg", format: formatAverage, higherIsBetter: true },
  { label: "OPS", key: "ops", format: formatDecimal, higherIsBetter: true },
  { label: "HR", key: "home_runs", format: formatNumber, higherIsBetter: true },
  { label: "RBI", key: "rbi", format: formatNumber, higherIsBetter: true },
  { label: "Hits", key: "hits", format: formatNumber, higherIsBetter: true },
  { label: "Walks", key: "walks", format: formatNumber, higherIsBetter: true },
  { label: "Strikeouts", key: "strikeouts", format: formatNumber, higherIsBetter: false },
];

const pitchingRows: {
  label: string;
  key: keyof PlayerStat;
  format: (v: number | null | undefined) => string;
  higherIsBetter: boolean;
}[] = [
  { label: "ERA", key: "era", format: formatDecimal, higherIsBetter: false },
  { label: "WHIP", key: "whip", format: formatDecimal, higherIsBetter: false },
  { label: "Wins", key: "wins", format: formatNumber, higherIsBetter: true },
  { label: "Losses", key: "losses", format: formatNumber, higherIsBetter: false },
  { label: "Strikeouts", key: "strikeouts_pitched", format: formatNumber, higherIsBetter: true },
  { label: "Innings", key: "innings_pitched", format: formatDecimal, higherIsBetter: true },
];

function PlayerPicker({
  label,
  players,
  teamMap,
  selectedId,
  onSelect,
}: {
  label: string;
  players: Player[];
  teamMap: Map<string, Team>;
  selectedId: number | null;
  onSelect: (id: number) => void;
}) {
  const [query, setQuery] = useState("");

  const matches = useMemo(() => {
    if (!query) return [];
    return players
      .filter((p) => p.name.toLowerCase().includes(query.toLowerCase()))
      .slice(0, 8);
  }, [query, players]);

  const selected = players.find((p) => p.id === selectedId);

  return (
    <div className="w-full">
      <p className="mb-2 text-xs font-bold uppercase tracking-[0.15em] text-[#687384]">
        {label}
      </p>

      {selected ? (
        <div className="flex items-center justify-between border border-[#1A2842]/25 bg-[#F8F3EA] px-4 py-3">
          <div>
            <p className="font-bold">{selected.name}</p>
            <p className="text-xs text-[#687384]">
              {teamMap.get(selected.team_id)?.abbreviation ?? "FA"} · {selected.position}
            </p>
          </div>
          <button
            onClick={() => {
              onSelect(0);
              setQuery("");
            }}
            className="text-xs font-bold uppercase tracking-[0.1em] text-[#D85F46]"
          >
            Change
          </button>
        </div>
      ) : (
        <div className="relative">
          <input
            type="text"
            placeholder="Search for a player..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="w-full border border-[#1A2842]/25 bg-transparent px-4 py-3 text-sm outline-none placeholder:text-[#687384] focus:border-[#1A2842]"
          />

          {matches.length > 0 && (
            <div className="absolute z-10 mt-1 w-full border border-[#1A2842]/25 bg-[#F8F3EA] shadow-lg">
              {matches.map((p) => (
                <button
                  key={p.id}
                  onClick={() => {
                    onSelect(p.id);
                    setQuery("");
                  }}
                  className="block w-full px-4 py-2 text-left text-sm hover:bg-[#59B3AD]/10"
                >
                  <span className="font-bold">{p.name}</span>{" "}
                  <span className="text-[#687384]">
                    — {teamMap.get(p.team_id)?.abbreviation ?? "FA"}
                  </span>
                </button>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default function ComparePage() {
  const [players, setPlayers] = useState<Player[]>([]);
  const [stats, setStats] = useState<PlayerStat[]>([]);
  const [teams, setTeams] = useState<Team[]>([]);
  const [loading, setLoading] = useState(true);

  const [playerAId, setPlayerAId] = useState<number | null>(null);
  const [playerBId, setPlayerBId] = useState<number | null>(null);

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
              "player_id, season, games, at_bats, hits, home_runs, rbi, walks, strikeouts, batting_avg, obp, slg, ops, innings_pitched, wins, losses, era, whip, strikeouts_pitched"
            )
            .eq("season", 2026),

          supabase.from("Teams").select("id, name, abbreviation"),
        ]);

      setPlayers(playerData ?? []);
      setStats(statData ?? []);
      setTeams(teamData ?? []);
      setLoading(false);
    }

    loadData();
  }, []);

  const teamMap = useMemo(
    () => new Map(teams.map((t) => [t.id, t])),
    [teams]
  );

  const statMap = useMemo(
    () => new Map(stats.map((s) => [s.player_id, s])),
    [stats]
  );

  const playerA = players.find((p) => p.id === playerAId);
  const playerB = players.find((p) => p.id === playerBId);
  const statA = playerAId ? statMap.get(playerAId) : undefined;
  const statB = playerBId ? statMap.get(playerBId) : undefined;

  const showPitching =
    (statA?.era !== undefined && statA?.era !== null) ||
    (statB?.era !== undefined && statB?.era !== null);

  function renderRow(row: (typeof hittingRows)[number]) {
    const rawA = statA?.[row.key] as number | null | undefined;
    const rawB = statB?.[row.key] as number | null | undefined;

    let aWins = false;
    let bWins = false;

    if (
      typeof rawA === "number" &&
      typeof rawB === "number" &&
      rawA !== rawB
    ) {
      if (row.higherIsBetter) {
        aWins = rawA > rawB;
        bWins = rawB > rawA;
      } else {
        aWins = rawA < rawB;
        bWins = rawB < rawA;
      }
    }

    return (
      <div
        key={row.label}
        className="grid grid-cols-[1fr_auto_1fr] items-center border-b border-[#1A2842]/15 py-4"
      >
        <p
          className={`text-2xl font-black text-left ${
            aWins ? "text-[#D85F46]" : ""
          }`}
        >
          {row.format(rawA)}
        </p>

        <p className="px-6 text-xs font-bold uppercase tracking-[0.15em] text-[#687384]">
          {row.label}
        </p>

        <p
          className={`text-2xl font-black text-right ${
            bWins ? "text-[#D85F46]" : ""
          }`}
        >
          {row.format(rawB)}
        </p>
      </div>
    );
  }

  return (
    <main className="min-h-screen bg-[#F8F3EA] text-[#1A2842]">
      <section className="border-b border-[#1A2842]/20">
        <div className="mx-auto max-w-5xl px-6 py-14">
          <p className="text-xs font-bold uppercase tracking-[0.25em] text-[#D85F46]">
            Head to Head
          </p>
          <h1 className="mt-3 text-5xl font-black tracking-[-0.05em]">
            Compare Players
          </h1>
          <p className="mt-3 max-w-xl text-[#687384]">
            Pick two players to see how their 2026 numbers stack up.
          </p>
        </div>
      </section>

      <section className="mx-auto max-w-5xl px-6 py-10">
        {loading ? (
          <p className="text-sm text-[#687384]">Loading players...</p>
        ) : (
          <>
            <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
              <PlayerPicker
                label="Player A"
                players={players}
                teamMap={teamMap}
                selectedId={playerAId}
                onSelect={(id) => setPlayerAId(id || null)}
              />
              <PlayerPicker
                label="Player B"
                players={players}
                teamMap={teamMap}
                selectedId={playerBId}
                onSelect={(id) => setPlayerBId(id || null)}
              />
            </div>

            {playerA && playerB && (
              <div className="mt-12 border-t border-[#1A2842] pt-8">
                {/* Headshots + names */}
                <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-4 pb-8">
                  <Link
                    href={`/players/${playerA.id}`}
                    className="flex flex-col items-center text-center hover:text-[#D85F46]"
                  >
                    <Headshot playerId={playerA.id} />
                    <p className="mt-3 font-bold">{playerA.name}</p>
                    <p className="text-xs text-[#687384]">
                      {teamMap.get(playerA.team_id)?.abbreviation ?? "FA"} ·{" "}
                      {playerA.position}
                    </p>
                  </Link>

                  <p className="px-4 text-2xl font-black text-[#687384]">VS</p>

                  <Link
                    href={`/players/${playerB.id}`}
                    className="flex flex-col items-center text-center hover:text-[#D85F46]"
                  >
                    <Headshot playerId={playerB.id} />
                    <p className="mt-3 font-bold">{playerB.name}</p>
                    <p className="text-xs text-[#687384]">
                      {teamMap.get(playerB.team_id)?.abbreviation ?? "FA"} ·{" "}
                      {playerB.position}
                    </p>
                  </Link>
                </div>

                {/* Hitting comparison */}
                <div className="border-t border-[#1A2842]/20 pt-6">
                  <p className="mb-2 text-xs font-bold uppercase tracking-[0.2em] text-[#59B3AD]">
                    Hitting
                  </p>
                  {hittingRows.map(renderRow)}
                </div>

                {/* Pitching comparison, only if relevant */}
                {showPitching && (
                  <div className="mt-10 border-t border-[#1A2842]/20 pt-6">
                    <p className="mb-2 text-xs font-bold uppercase tracking-[0.2em] text-[#D85F46]">
                      Pitching
                    </p>
                    {pitchingRows.map(renderRow)}
                  </div>
                )}

                {(!statA || !statB) && (
                  <p className="mt-8 text-sm text-[#687384]">
                    One or both players don&apos;t have 2026 stats on record yet.
                  </p>
                )}
              </div>
            )}
          </>
        )}
      </section>
    </main>
  );
}
