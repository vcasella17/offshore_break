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
  key: string;
  label: string;
  shortLabel: string;
  type: "hitting" | "pitching";
  format: "number" | "average" | "decimal" | "innings";
  direction: "high" | "low";
};

/* ================================================================
   TEAM COLORS
================================================================ */

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
    secondary: "#FF5910",
  },

  "New York Yankees": {
    primary: "#003087",
    secondary: "#C4CED4",
  },

  "Oakland Athletics": {
    primary: "#003831",
    secondary: "#EFB21E",
  },

  Athletics: {
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

/* ================================================================
   HITTING CATEGORIES
================================================================ */

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

/* ================================================================
   PITCHING CATEGORIES
================================================================ */

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
    direction: "high",
  },

  {
    key: "earned_runs",
    label: "Earned Runs",
    shortLabel: "ER",
    type: "pitching",
    format: "number",
    direction: "high",
  },
];

/* ================================================================
   FORMATTING
================================================================ */

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

function formatStat(
  value: number | null | undefined,
  format: Category["format"]
) {
  if (format === "average") {
    return formatAverage(value);
  }

  if (format === "decimal") {
    return formatDecimal(value);
  }

  if (format === "innings") {
    return formatInnings(value);
  }

  return formatNumber(value);
}

/* ================================================================
   STANDARD TEAM LOGO
   Used in the featured leader cards.
================================================================ */

function TeamLogo({ teamId }: { teamId?: string }) {
  if (!teamId) {
    return (
      <div className="flex h-8 w-8 items-center justify-center bg-[#E8E1D5] font-mono text-[8px] font-bold text-[#687384]">
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

/* ================================================================
   LEADERBOARD TEAM LOGO
   Two team colors + white logo.
================================================================ */

function LeaderboardTeamLogo({
  teamId,
  teamName,
}: {
  teamId?: string;
  teamName?: string;
}) {
  const colors =
    TEAM_COLORS[teamName ?? ""] ?? {
      primary: "#1A2842",
      secondary: "#D85F46",
    };

  return (
    <div
      className="relative flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden"
      style={{
        background: `linear-gradient(
          135deg,
          ${colors.primary} 0%,
          ${colors.primary} 58%,
          ${colors.secondary} 58%,
          ${colors.secondary} 100%
        )`,
      }}
    >
      {teamId ? (
        <img
          src={`https://www.mlbstatic.com/team-logos/${teamId}.svg`}
          alt=""
          className="h-7 w-7 object-contain"
          style={{
            filter:
              "brightness(0) saturate(100%) invert(100%)",
          }}
        />
      ) : (
        <span className="font-mono text-[7px] font-bold text-white">
          FA
        </span>
      )}
    </div>
  );
}

/* ================================================================
   PLAYER HEADSHOT
================================================================ */

function PlayerHeadshot({ playerId }: { playerId: number }) {
  return (
    <div className="h-10 w-10 shrink-0 overflow-hidden rounded-full bg-[#E8E1D5]">
      <img
        src={`https://img.mlbstatic.com/mlb-photos/image/upload/d_people:generic:headshot:67:current.png/w_80,q_auto:best/v1/people/${playerId}/headshot/67/current`}
        alt=""
        className="h-full w-full object-cover"
      />
    </div>
  );
}

/* ================================================================
   QUALIFICATIONS
================================================================ */

function qualifiesForLeaderboard(
  player: PlayerRow,
  category: Category
) {
  const stats = player.stats;

  if (!stats) {
    return false;
  }

  /*
    Hitting qualification:
    minimum 100 AB.

    This is an Offshore Break display qualification,
    not an official MLB qualification rule.
  */

  if (category.type === "hitting") {
    return (stats.at_bats ?? 0) >= 100;
  }

  /*
    IP leaderboard is a counting statistic,
    so anyone with at least 1 IP can appear.
  */

  if (category.key === "innings_pitched") {
    return (stats.innings_pitched ?? 0) >= 1;
  }

  /*
    Rate stats and other pitching leaderboards
    require at least 10 IP.
  */

  return (stats.innings_pitched ?? 0) >= 10;
}

/* ================================================================
   LEADERBOARD CARD
================================================================ */

function LeaderboardCard({
  category,
  players,
}: {
  category: Category;
  players: PlayerRow[];
}) {
  const ranked = [...players]
    .filter((player) => {
      const value =
        player.stats?.[
          category.key as keyof PlayerStat
        ];

      if (value === null || value === undefined) {
        return false;
      }

      return qualifiesForLeaderboard(player, category);
    })
    .sort((a, b) => {
      const aValue = Number(
        a.stats?.[
          category.key as keyof PlayerStat
        ] ?? 0
      );

      const bValue = Number(
        b.stats?.[
          category.key as keyof PlayerStat
        ] ?? 0
      );

      return category.direction === "high"
        ? bValue - aValue
        : aValue - bValue;
    })
    .slice(0, 10);

  return (
    <div className="border-t-2 border-[#1A2842] bg-[#FCF9F3]">
      {/* Card heading */}

      <div className="flex items-end justify-between border-b border-[#1A2842]/10 px-5 py-5">
        <div>
          <p className="text-[8px] font-black uppercase tracking-[0.2em] text-[#D85F46]">
            {category.type === "hitting"
              ? "Hitting"
              : "Pitching"}
          </p>

          <h3 className="mt-1 text-xl font-black tracking-[-0.03em]">
            {category.shortLabel}
          </h3>

          <p className="mt-1 text-[9px] text-[#687384]">
            {category.label}
          </p>
        </div>

        <span className="font-mono text-[8px] text-[#687384]">
          TOP 10
        </span>
      </div>

      {/* Qualification note */}

      <div className="border-b border-[#1A2842]/8 px-5 py-2">
        <p className="font-mono text-[7px] uppercase tracking-[0.12em] text-[#687384]/70">
          Qualified:{" "}
          {category.type === "hitting"
            ? "100+ AB"
            : category.key === "innings_pitched"
              ? "1+ IP"
              : "10+ IP"}
        </p>
      </div>

      {/* Rows */}

      <div>
        {ranked.length === 0 ? (
          <div className="px-5 py-10 text-center">
            <p className="font-mono text-[9px] text-[#687384]">
              No qualifying data available
            </p>
          </div>
        ) : (
          ranked.map((player, index) => {
            const teamColors =
              TEAM_COLORS[player.team?.name ?? ""] ?? {
                primary: "#1A2842",
                secondary: "#D85F46",
              };

            const value =
              player.stats?.[
                category.key as keyof PlayerStat
              ] as number | null | undefined;

            return (
              <Link
                key={`${category.key}-${player.id}`}
                href={`/players/${player.id}`}
                className="group relative flex items-center gap-3 border-b border-[#1A2842]/8 px-5 py-3 transition last:border-b-0 hover:bg-white"
              >
                {/* Team accent */}

                <span
                  className="absolute left-0 top-0 h-full w-[3px] opacity-0 transition group-hover:opacity-100"
                  style={{
                    backgroundColor: teamColors.secondary,
                  }}
                />

                {/* Rank */}

                <div
                  className={`w-6 shrink-0 font-mono text-xs font-black ${
                    index === 0
                      ? "text-[#D85F46]"
                      : index === 1
                        ? "text-[#1A2842]/60"
                        : index === 2
                          ? "text-[#1A2842]/45"
                          : "text-[#1A2842]/25"
                  }`}
                >
                  {String(index + 1).padStart(2, "0")}
                </div>

                {/* Headshot */}

                <PlayerHeadshot playerId={player.id} />

                {/* Player information */}

                <div className="min-w-0 flex-1">
                  <p className="truncate text-xs font-black group-hover:text-[#D85F46]">
                    {player.name}
                  </p>

                  <div className="mt-1 flex items-center gap-2">
                    <LeaderboardTeamLogo
                      teamId={player.team?.id}
                      teamName={player.team?.name}
                    />

                    <span className="font-mono text-[8px] text-[#687384]">
                      {player.team?.abbreviation ?? "FA"}
                    </span>

                    <span className="font-mono text-[8px] text-[#687384]/50">
                      {player.position || "-"}
                    </span>
                  </div>
                </div>

                {/* Value */}

                <div className="text-right">
                  <p
                    className={`font-mono text-sm font-black ${
                      index === 0
                        ? "text-[#D85F46]"
                        : "text-[#1A2842]"
                    }`}
                  >
                    {formatStat(value, category.format)}
                  </p>
                </div>
              </Link>
            );
          })
        )}
      </div>

      {/* Footer */}

      {ranked.length > 0 && (
        <div className="border-t border-[#1A2842]/10 px-5 py-3">
          <Link
            href={`/players?sort=${category.key}`}
            className="text-[8px] font-black uppercase tracking-[0.16em] text-[#687384] transition hover:text-[#D85F46]"
          >
            View full leaderboard →
          </Link>
        </div>
      )}
    </div>
  );
}

/* ================================================================
   MAIN PAGE
================================================================ */

export default function LeadersPage() {
  const [players, setPlayers] = useState<Player[]>([]);
  const [stats, setStats] = useState<PlayerStat[]>([]);
  const [teams, setTeams] = useState<Team[]>([]);

  const [view, setView] = useState<
    "hitting" | "pitching"
  >("hitting");

  const [teamFilter, setTeamFilter] = useState("All");

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  /* ================================================================
     LOAD DATA
  ================================================================ */

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
            "player_id, season, games, at_bats, hits, home_runs, rbi, walks, strikeouts, batting_avg, obp, slg, ops, innings_pitched, wins, losses, earned_runs, hits_allowed, walks_allowed, strikeouts_pitched, era, whip"
          )
          .eq("season", 2026),

        supabase
          .from("Teams")
          .select("id, name, abbreviation")
          .order("name"),
      ]);

      if (
        playerError ||
        statError ||
        teamError
      ) {
        setError(
          "Unable to load leaderboard data. Please refresh the page."
        );
      }

      setPlayers(playerData ?? []);
      setStats(statData ?? []);
      setTeams(teamData ?? []);
      setLoading(false);
    }

    loadData();
  }, []);

  /* ================================================================
     MAPS
  ================================================================ */

  const statMap = useMemo(() => {
    return new Map(
      stats.map((stat) => [
        stat.player_id,
        stat,
      ])
    );
  }, [stats]);

  const teamMap = useMemo(() => {
    return new Map(
      teams.map((team) => [
        team.id,
        team,
      ])
    );
  }, [teams]);

  /* ================================================================
     PLAYER ROWS
  ================================================================ */

  const playerRows = useMemo<PlayerRow[]>(() => {
    return players.map((player) => ({
      ...player,
      stats: statMap.get(player.id),
      team: teamMap.get(player.team_id),
    }));
  }, [players, statMap, teamMap]);

  /* ================================================================
     TEAM FILTER
  ================================================================ */

  const filteredPlayers = useMemo(() => {
    return playerRows.filter((player) => {
      if (teamFilter === "All") {
        return true;
      }

      return player.team_id === teamFilter;
    });
  }, [playerRows, teamFilter]);

  /* ================================================================
     CURRENT CATEGORIES
  ================================================================ */

  const categories =
    view === "hitting"
      ? hittingCategories
      : pitchingCategories;

  const primaryCategory =
    view === "hitting"
      ? hittingCategories[0]
      : pitchingCategories[0];

  /* ================================================================
     FEATURED LEADERS
  ================================================================ */

  const primaryLeaders = useMemo(() => {
    return [...filteredPlayers]
      .filter((player) => {
        const value =
          player.stats?.[
            primaryCategory.key as keyof PlayerStat
          ];

        if (
          value === null ||
          value === undefined
        ) {
          return false;
        }

        return qualifiesForLeaderboard(
          player,
          primaryCategory
        );
      })
      .sort((a, b) => {
        const aValue = Number(
          a.stats?.[
            primaryCategory.key as keyof PlayerStat
          ] ?? 0
        );

        const bValue = Number(
          b.stats?.[
            primaryCategory.key as keyof PlayerStat
          ] ?? 0
        );

        return primaryCategory.direction === "high"
          ? bValue - aValue
          : aValue - bValue;
      })
      .slice(0, 5);
  }, [
    filteredPlayers,
    primaryCategory,
  ]);

  /* ================================================================
     TEAM COUNT
  ================================================================ */

  const teamCount = useMemo(() => {
    return new Set(
      filteredPlayers
        .map((player) => player.team_id)
        .filter(Boolean)
    ).size;
  }, [filteredPlayers]);

  /* ================================================================
     RENDER
  ================================================================ */

  return (
    <main className="min-h-screen bg-[#F8F3EA] text-[#1A2842]">
      {/* ========================================================= */}
      {/* HEADER */}
      {/* ========================================================= */}

      <section className="border-b border-[#1A2842]/15">
        <div className="mx-auto max-w-[1440px] px-5 py-12 md:px-8 md:py-16">
          <div className="flex flex-col justify-between gap-10 lg:flex-row lg:items-end">
            <div>
              <p className="text-[9px] font-black uppercase tracking-[0.25em] text-[#D85F46]">
                Offshore Break / Statistics
              </p>

              <h1 className="mt-3 text-5xl font-black tracking-[-0.06em] md:text-7xl">
                Leaderboards
              </h1>

              <p className="mt-4 max-w-2xl text-sm leading-6 text-[#687384]">
                League-wide statistical leaders from the
                2026 season, organized across hitting and
                pitching.
              </p>
            </div>

            <div className="flex gap-8 border-l border-[#1A2842]/15 pl-6">
              <div>
                <p className="font-mono text-3xl font-black">
                  2026
                </p>

                <p className="mt-1 text-[8px] font-black uppercase tracking-[0.18em] text-[#687384]">
                  Season
                </p>
              </div>

              <div>
                <p className="font-mono text-3xl font-black">
                  {teamCount}
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
      {/* CONTROLS */}
      {/* ========================================================= */}

      <section className="border-b border-[#1A2842]/15 bg-[#FCF9F3]">
        <div className="mx-auto max-w-[1440px] px-5 py-6 md:px-8">
          <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex border border-[#1A2842]/20">
              <button
                onClick={() => setView("hitting")}
                className={`border-r border-[#1A2842]/20 px-6 py-3 text-[9px] font-black uppercase tracking-[0.16em] transition ${
                  view === "hitting"
                    ? "bg-[#1A2842] text-white"
                    : "text-[#687384] hover:bg-[#1A2842]/5"
                }`}
              >
                Hitting
              </button>

              <button
                onClick={() => setView("pitching")}
                className={`px-6 py-3 text-[9px] font-black uppercase tracking-[0.16em] transition ${
                  view === "pitching"
                    ? "bg-[#1A2842] text-white"
                    : "text-[#687384] hover:bg-[#1A2842]/5"
                }`}
              >
                Pitching
              </button>
            </div>

            <div className="flex items-center gap-4">
              <span className="text-[8px] font-black uppercase tracking-[0.16em] text-[#687384]">
                Team
              </span>

              <select
                value={teamFilter}
                onChange={(event) =>
                  setTeamFilter(
                    event.target.value
                  )
                }
                className="min-w-[220px] border border-[#1A2842]/20 bg-[#F8F3EA] px-4 py-3 text-xs outline-none focus:border-[#D85F46]"
              >
                <option value="All">
                  All Teams
                </option>

                {teams.map((team) => (
                  <option
                    key={team.id}
                    value={team.id}
                  >
                    {team.abbreviation} —{" "}
                    {team.name}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>
      </section>

      {/* ========================================================= */}
      {/* ERROR */}
      {/* ========================================================= */}

      {error && (
        <section className="mx-auto max-w-[1440px] px-5 pt-8 md:px-8">
          <div className="border border-[#D85F46]/30 bg-[#D85F46]/5 px-6 py-8 text-center">
            <p className="text-sm font-bold text-[#D85F46]">
              {error}
            </p>
          </div>
        </section>
      )}

      {/* ========================================================= */}
      {/* FEATURED LEADERS */}
      {/* ========================================================= */}

      <section className="mx-auto max-w-[1440px] px-5 py-10 md:px-8">
        <div className="mb-5 flex items-end justify-between">
          <div>
            <p className="text-[9px] font-black uppercase tracking-[0.2em] text-[#D85F46]">
              Featured
            </p>

            <h2 className="mt-1 text-2xl font-black tracking-[-0.03em]">
              {view === "hitting"
                ? "Top Offensive Performance"
                : "Top Pitching Performance"}
            </h2>
          </div>

          <span className="font-mono text-[9px] text-[#687384]">
            {teamFilter === "All"
              ? "MLB"
              : teams.find(
                    (team) =>
                      team.id === teamFilter
                  )?.abbreviation ?? ""}
          </span>
        </div>

        {loading ? (
          <div className="border-t-2 border-[#1A2842] bg-[#FCF9F3] px-6 py-16 text-center">
            <p className="font-mono text-xs text-[#687384]">
              Loading league leaders...
            </p>
          </div>
        ) : primaryLeaders.length === 0 ? (
          <div className="border-t-2 border-[#1A2842] bg-[#FCF9F3] px-6 py-16 text-center">
            <p className="text-sm font-black">
              No qualifying data available.
            </p>
          </div>
        ) : (
          <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-5">
            {primaryLeaders.map(
              (player, index) => {
                const value =
                  player.stats?.[
                    primaryCategory.key as keyof PlayerStat
                  ] as
                    | number
                    | null
                    | undefined;

                const colors =
                  TEAM_COLORS[
                    player.team?.name ?? ""
                  ] ?? {
                    primary: "#1A2842",
                    secondary: "#D85F46",
                  };

                return (
                  <Link
                    key={player.id}
                    href={`/players/${player.id}`}
                    className={`group relative overflow-hidden border-t-2 bg-[#FCF9F3] p-5 transition hover:-translate-y-1 hover:shadow-[0_12px_30px_rgba(26,40,66,0.08)] ${
                      index === 0
                        ? "border-[#D85F46]"
                        : "border-[#1A2842]"
                    }`}
                  >
                    <div
                      className="absolute right-0 top-0 h-20 w-20 opacity-[0.06]"
                      style={{
                        backgroundColor:
                          colors.secondary,
                      }}
                    />

                    <div className="flex items-start justify-between">
                      <span
                        className={`font-mono text-2xl font-black ${
                          index === 0
                            ? "text-[#D85F46]"
                            : "text-[#1A2842]/20"
                        }`}
                      >
                        {String(
                          index + 1
                        ).padStart(2, "0")}
                      </span>

                      <TeamLogo
                        teamId={
                          player.team?.id
                        }
                      />
                    </div>

                    <div className="mt-6">
                      <PlayerHeadshot
                        playerId={player.id}
                      />

                      <p className="mt-4 truncate text-sm font-black group-hover:text-[#D85F46]">
                        {player.name}
                      </p>

                      <p className="mt-1 text-[8px] font-black uppercase tracking-[0.15em] text-[#687384]">
                        {player.team?.abbreviation ??
                          "FA"}{" "}
                        ·{" "}
                        {player.position || "-"}
                      </p>
                    </div>

                    <div className="mt-6 border-t border-[#1A2842]/10 pt-4">
                      <p className="font-mono text-3xl font-black">
                        {formatStat(
                          value,
                          primaryCategory.format
                        )}
                      </p>

                      <p className="mt-1 text-[8px] font-black uppercase tracking-[0.16em] text-[#687384]">
                        {
                          primaryCategory.shortLabel
                        }
                      </p>
                    </div>
                  </Link>
                );
              }
            )}
          </div>
        )}
      </section>

      {/* ========================================================= */}
      {/* LEADERBOARD GRID */}
      {/* ========================================================= */}

      <section className="mx-auto max-w-[1440px] px-5 pb-14 md:px-8">
        <div className="mb-5 flex items-end justify-between border-b border-[#1A2842]/15 pb-4">
          <div>
            <p className="text-[9px] font-black uppercase tracking-[0.2em] text-[#D85F46]">
              Statistical Index
            </p>

            <h2 className="mt-1 text-2xl font-black tracking-[-0.03em]">
              {view === "hitting"
                ? "Hitting Leaders"
                : "Pitching Leaders"}
            </h2>
          </div>

          <p className="hidden font-mono text-[9px] text-[#687384] md:block">
            TOP 10 · 2026
          </p>
        </div>

        <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
          {categories.map(
            (category) => (
              <LeaderboardCard
                key={category.key}
                category={category}
                players={filteredPlayers}
              />
            )
          )}
        </div>
      </section>

      {/* ========================================================= */}
      {/* STAT DEFINITIONS */}
      {/* ========================================================= */}

      <section className="border-t border-[#1A2842]/15 bg-[#FCF9F3]">
        <div className="mx-auto max-w-[1440px] px-5 py-12 md:px-8">
          <div className="grid gap-8 md:grid-cols-3">
            <div>
              <p className="text-[8px] font-black uppercase tracking-[0.2em] text-[#D85F46]">
                Hitting
              </p>

              <p className="mt-2 text-xs leading-5 text-[#687384]">
                Hitting leaderboards require a
                minimum of 100 at-bats so rate
                statistics are not dominated by
                extremely small samples.
              </p>
            </div>

            <div>
              <p className="text-[8px] font-black uppercase tracking-[0.2em] text-[#D85F46]">
                Pitching
              </p>

              <p className="mt-2 text-xs leading-5 text-[#687384]">
                Pitching leaderboards require
                at least 10 innings for most
                statistics. The innings leaderboard
                itself requires at least 1 inning.
              </p>
            </div>

            <div>
              <p className="text-[8px] font-black uppercase tracking-[0.2em] text-[#D85F46]">
                Explore
              </p>

              <p className="mt-2 text-xs leading-5 text-[#687384]">
                Select any player to move from
                the leaderboard into their full
                Offshore Break player profile.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ========================================================= */}
      {/* FOOTER */}
      {/* ========================================================= */}

      <section className="border-t border-[#101A2C] bg-[#1A2842] px-5 py-14 text-[#F8F3EA] md:px-8">
        <div className="mx-auto max-w-[1440px]">
          <div className="flex flex-col justify-between gap-8 md:flex-row md:items-end">
            <div>
              <p className="text-[9px] font-black uppercase tracking-[0.2em] text-[#59B3AD]">
                Offshore Break
              </p>

              <h3 className="mt-3 text-3xl font-black tracking-[-0.04em]">
                Every number has a story.
              </h3>

              <p className="mt-3 max-w-lg text-xs leading-5 text-white/40">
                Explore individual players,
                team profiles, games, and the rest
                of the Offshore Break baseball
                database.
              </p>
            </div>

            <div className="flex flex-wrap gap-2">
              <Link
                href="/players"
                className="border border-white/15 px-5 py-3 text-[9px] font-black uppercase tracking-[0.15em] text-white/65 transition hover:border-[#D85F46] hover:bg-[#D85F46] hover:text-white"
              >
                Players →
              </Link>

              <Link
                href="/teams"
                className="border border-white/15 px-5 py-3 text-[9px] font-black uppercase tracking-[0.15em] text-white/65 transition hover:border-[#59B3AD] hover:bg-[#59B3AD] hover:text-white"
              >
                Teams →
              </Link>

              <Link
                href="/compare"
                className="border border-white/15 px-5 py-3 text-[9px] font-black uppercase tracking-[0.15em] text-white/65 transition hover:border-white hover:bg-white hover:text-[#1A2842]"
              >
                Compare →
              </Link>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}