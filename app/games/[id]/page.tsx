import Link from "next/link";

type TeamSide = "away" | "home";

type MlbTeam = {
  id: number;
  name: string;
  abbreviation?: string;
  teamName?: string;
  shortName?: string;
};

type Pitcher = {
  id: number;
  fullName: string;
  link?: string;
};

type LiveRunner = {
  id: number;
  fullName: string;
};

type GameContextMetrics = {
  awayWinProbability?: number;
  homeWinProbability?: number;
  leverageIndex?: number;
};

type WinProbabilityPoint = {
  about?: {
    atBatIndex?: number;
    inning?: number;
  };
  awayTeamWinProbability?: number;
  homeTeamWinProbability?: number;
  leverageIndex?: number;
};

type CurrentPlay = {
  matchup?: {
    batter?: {
      id: number;
      fullName: string;
    };
    pitcher?: {
      id: number;
      fullName: string;
    };
  };

  count?: {
    balls: number;
    strikes: number;
    outs: number;
  };

  result?: {
    event?: string;
    description?: string;
    rbi?: number;
  };

  runners?: Array<{
    details?: {
      runner?: {
        id: number;
        fullName: string;
      };
      event?: string;
      isScoringEvent?: boolean;
      responsiblePitcher?: boolean;
    };

    movement?: {
      start?: string;
      end?: string;
    };
  }>;
};

type MlbGameFeed = {
  gamePk: number;

  gameData: {
    datetime: {
      dateTime?: string;
      officialDate?: string;
    };

    status: {
      abstractGameState: string;
      detailedState: string;
      codedGameState?: string;
      statusCode?: string;
    };

    teams: {
      away: MlbTeam;
      home: MlbTeam;
    };

    probablePitchers?: {
      away?: Pitcher;
      home?: Pitcher;
    };

    venue?: {
      name?: string;
    };
  };

  liveData: {
    linescore?: {
      currentInning?: number;
      currentInningOrdinal?: string;
      inningState?: string;
      isTopInning?: boolean;
      scheduledInnings?: number;

      offense?: {
        batter?: LiveRunner;
        first?: LiveRunner;
        second?: LiveRunner;
        third?: LiveRunner;
      };

      teams: {
        away: {
          runs: number;
          hits: number;
          errors: number;
        };

        home: {
          runs: number;
          hits: number;
          errors: number;
        };
      };

      innings?: {
        num: number;
        ordinalNum?: string;

        home?: {
          runs?: number;
          hits?: number;
          errors?: number;
        };

        away?: {
          runs?: number;
          hits?: number;
          errors?: number;
        };
      }[];
    };

    plays?: {
      currentPlay?: CurrentPlay;
    };

    boxscore?: {
      teams?: {
        away?: MlbBoxscoreTeam;
        home?: MlbBoxscoreTeam;
      };
    };

    decisions?: {
      winner?: Pitcher;
      loser?: Pitcher;
      savePlayer?: Pitcher;
    };
  };
};

type MlbBoxscoreTeam = {
  team: MlbTeam;

  teamStats?: {
    batting?: {
      runs?: number;
      hits?: number;
      atBats?: number;
      baseOnBalls?: number;
      strikeOuts?: number;
      homeRuns?: number;
      stolenBases?: number;
      leftOnBase?: number;
    };

    pitching?: {
      runs?: number;
      hits?: number;
      earnedRuns?: number;
      baseOnBalls?: number;
      strikeOuts?: number;
      homeRuns?: number;
      inningsPitched?: string;
    };
  };

  pitchers?: number[];
  battingOrder?: number[];
  batters?: number[];

  players?: Record<
    string,
    {
      person: {
        id: number;
        fullName: string;
      };

      battingOrder?: string;

      position?: {
        abbreviation?: string;
        name?: string;
      };

      stats?: {
        batting?: {
          atBats?: number;
          runs?: number;
          hits?: number;
          homeRuns?: number;
          rbi?: number;
          baseOnBalls?: number;
          strikeOuts?: number;
          stolenBases?: number;
        };

        pitching?: {
          inningsPitched?: string;
          hits?: number;
          runs?: number;
          earnedRuns?: number;
          baseOnBalls?: number;
          strikeOuts?: number;
          homeRuns?: number;
        };
      };
    }
  >;
};

async function getGame(gamePk: string): Promise<MlbGameFeed | null> {
  try {
    const response = await fetch(
      `https://statsapi.mlb.com/api/v1.1/game/${gamePk}/feed/live`,
      {
        next: {
          revalidate: 15,
        },
      }
    );

    if (!response.ok) {
      return null;
    }

    return response.json();
  } catch {
    return null;
  }
}

async function getGameContext(
  gamePk: string
): Promise<GameContextMetrics | null> {
  try {
    const response = await fetch(
      `https://statsapi.mlb.com/api/v1/game/${gamePk}/contextMetrics`,
      {
        next: {
          revalidate: 15,
        },
      }
    );

    if (!response.ok) {
      return null;
    }

    return response.json();
  } catch {
    return null;
  }
}

async function getWinProbability(
  gamePk: string
): Promise<WinProbabilityPoint | null> {
  try {
    const response = await fetch(
      `https://statsapi.mlb.com/api/v1/game/${gamePk}/winProbability`,
      {
        next: {
          revalidate: 15,
        },
      }
    );

    if (!response.ok) {
      return null;
    }

    const data = await response.json();
    const points = Array.isArray(data) ? data : [];
    return points.length > 0 ? points[points.length - 1] : null;
  } catch {
    return null;
  }
}

function logoUrl(teamId: number) {
  return `https://www.mlbstatic.com/team-logos/${teamId}.svg`;
}

function headshotUrl(playerId: number) {
  return `https://img.mlbstatic.com/mlb-photos/image/upload/w_80,q_auto:good/v1/people/${playerId}/headshot/67/current`;
}

const TEAM_PRIMARY_COLORS: Record<number, string> = {
  108: "#BA0021", // Angels
  109: "#A71930", // Diamondbacks
  110: "#DF4601", // Orioles
  111: "#BD3039", // Red Sox
  112: "#0E3386", // Cubs
  113: "#C6011F", // Reds
  114: "#00385D", // Guardians
  115: "#33006F", // Rockies
  116: "#0C2340", // Tigers
  117: "#002D62", // Astros
  118: "#004687", // Royals
  119: "#005A9C", // Dodgers
  120: "#AB0003", // Nationals
  121: "#002D72", // Mets
  133: "#003831", // Athletics
  134: "#27251F", // Pirates
  135: "#2F241D", // Padres
  136: "#0C2C56", // Mariners
  137: "#FD5A1E", // Giants
  138: "#C41E3A", // Cardinals
  139: "#092C5C", // Rays
  140: "#003278", // Rangers
  141: "#134A8E", // Blue Jays
  142: "#002B5C", // Twins
  143: "#E81828", // Phillies
  144: "#CE1141", // Braves
  145: "#27251F", // White Sox
  146: "#00A3E0", // Marlins
  147: "#0C2340", // Yankees
  158: "#12284B", // Brewers
};

function teamColor(teamId: number) {
  return TEAM_PRIMARY_COLORS[teamId] ?? "#1A2842";
}

function formatDate(dateTime?: string) {
  if (!dateTime) return "";

  return new Date(dateTime).toLocaleDateString([], {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
  });
}

function formatTime(dateTime?: string) {
  if (!dateTime) return "";

  return new Date(dateTime).toLocaleTimeString([], {
    hour: "numeric",
    minute: "2-digit",
  });
}

function getStatus(feed: MlbGameFeed) {
  const state = feed.gameData.status.abstractGameState;

  if (state === "Live") {
    return {
      label: "LIVE",
      live: true,
      className: "bg-[#D85F46] text-white",
    };
  }

  if (state === "Final") {
    return {
      label: "FINAL",
      live: false,
      className: "bg-[#1A2842] text-white",
    };
  }

  return {
    label: feed.gameData.status.detailedState.toUpperCase(),
    live: false,
    className: "bg-[#E8E1D7] text-[#1A2842]",
  };
}

function getInningText(feed: MlbGameFeed) {
  const linescore = feed.liveData.linescore;

  if (!linescore?.currentInning) {
    return null;
  }

  const ordinal =
    linescore.currentInningOrdinal ??
    `${linescore.currentInning}${
      linescore.currentInning === 1
        ? "st"
        : linescore.currentInning === 2
          ? "nd"
          : linescore.currentInning === 3
            ? "rd"
            : "th"
    }`;

  const state = linescore.inningState;

  if (!state) {
    return ordinal;
  }

  const normalized = state.toLowerCase();

  if (normalized.includes("top")) {
    return `Top ${ordinal}`;
  }

  if (normalized.includes("bottom")) {
    return `Bottom ${ordinal}`;
  }

  if (normalized.includes("middle")) {
    return `Middle ${ordinal}`;
  }

  return ordinal;
}

function getBaseRunners(feed: MlbGameFeed) {
  const offense = feed.liveData.linescore?.offense;

  if (offense) {
    return {
      first: Boolean(offense.first),
      second: Boolean(offense.second),
      third: Boolean(offense.third),
    };
  }

  const currentPlay = feed.liveData.plays?.currentPlay;
  const occupied = {
    first: false,
    second: false,
    third: false,
  };

  for (const runner of currentPlay?.runners ?? []) {
    const start = runner.movement?.start;
    const end = runner.movement?.end;

    if (end === "1B") occupied.first = true;
    if (end === "2B") occupied.second = true;
    if (end === "3B") occupied.third = true;

    if (start === "1B" && end === "2B") occupied.first = false;
    if (start === "2B" && end === "3B") occupied.second = false;
    if (start === "3B" && end === "H") occupied.third = false;
  }

  return occupied;
}

function getBattingTeam(feed: MlbGameFeed) {
  const linescore = feed.liveData.linescore;

  if (linescore?.isTopInning === true) return feed.gameData.teams.away;
  if (linescore?.isTopInning === false) return feed.gameData.teams.home;

  const state = linescore?.inningState?.toLowerCase() ?? "";
  return state.includes("top") ? feed.gameData.teams.away : feed.gameData.teams.home;
}

function TeamHeader({
  team,
  score,
  align,
}: {
  team: MlbTeam;
  score: number;
  align: "left" | "right";
}) {
  return (
    <div
      className={`flex items-center gap-4 ${
        align === "right" ? "flex-row-reverse text-right" : ""
      }`}
    >
      <img
        src={logoUrl(team.id)}
        alt=""
        className="h-16 w-16 object-contain md:h-20 md:w-20"
      />

      <div>
        <div className="text-xs font-bold uppercase tracking-[0.16em] text-[#77736C]">
          {team.abbreviation}
        </div>

        <div className="mt-1 text-xl font-bold text-[#1A2842] md:text-2xl">
          {team.name}
        </div>

        <div className="mt-2 text-5xl font-bold tracking-tight text-[#1A2842] md:text-6xl">
          {score}
        </div>
      </div>
    </div>
  );
}

function SectionTitle({
  eyebrow,
  title,
}: {
  eyebrow: string;
  title: string;
}) {
  return (
    <div className="mb-5">
      <div className="text-[10px] font-bold uppercase tracking-[0.2em] text-[#59A7A2]">
        {eyebrow}
      </div>

      <h2 className="mt-1 text-xl font-bold text-[#1A2842]">{title}</h2>
    </div>
  );
}

function LiveAtBat({
  feed,
}: {
  feed: MlbGameFeed;
}) {
  const currentPlay = feed.liveData.plays?.currentPlay;

  if (!currentPlay) return null;

  const batter = currentPlay.matchup?.batter;
  const pitcher = currentPlay.matchup?.pitcher;
  const count = currentPlay.count;
  const runners = getBaseRunners(feed);
  const battingTeam = getBattingTeam(feed);
  const color = teamColor(battingTeam.id);
  const lastEvent = currentPlay.result?.event;
  const description = currentPlay.result?.description;

  return (
    <section>
      <SectionTitle eyebrow="Live Game" title="At the Plate" />

      <div
        className="overflow-hidden rounded-3xl border border-[#DED7CC] bg-white"
        style={{ borderTopColor: color, borderTopWidth: 3 }}
      >
        <div className="bg-[#1A2842] px-6 py-4 md:px-8">
          <div className="flex items-center justify-between gap-4">
            <div className="min-w-0">
              <div className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.2em] text-white/45">
                <span className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: color }} />
                Current at-bat
              </div>

              <div className="mt-1 truncate text-lg font-bold text-white">
                {batter?.fullName ?? "Waiting for batter"}
              </div>
            </div>

            <div className="flex shrink-0 items-center gap-2 rounded-full bg-[#D85F46] px-3 py-1.5 text-[10px] font-bold uppercase tracking-[0.16em] text-white">
              <span className="h-2 w-2 animate-pulse rounded-full bg-white" />
              Live
            </div>
          </div>
        </div>

        <div className="grid gap-8 p-6 md:grid-cols-[1fr_auto_1fr] md:items-center md:px-8">
          <div>
            <div className="text-[10px] font-bold uppercase tracking-[0.18em] text-[#77736C]">
              Batter
            </div>

            <div className="mt-3 flex items-center gap-4">
              {batter && (
                <Link href={`/players/${batter.id}`} className="shrink-0">
                  <img
                    src={headshotUrl(batter.id)}
                    alt=""
                    className="h-14 w-14 rounded-full bg-[#F4EEE5] object-cover ring-2 ring-transparent transition hover:ring-[#D85F46]"
                  />
                </Link>
              )}

              <div className="min-w-0">
                {batter ? (
                  <Link
                    href={`/players/${batter.id}`}
                    className="font-bold text-[#1A2842] transition hover:text-[#D85F46]"
                  >
                    {batter.fullName}
                  </Link>
                ) : (
                  <div className="font-bold text-[#1A2842]">Unknown</div>
                )}

                <div className="mt-1 flex items-center gap-2 text-xs text-[#77736C]">
                  <span>{battingTeam.abbreviation ?? battingTeam.teamName}</span>
                  <span>·</span>
                  <span>At the plate</span>
                </div>
              </div>
            </div>
          </div>

          <div className="text-center">
            <div className="text-[10px] font-bold uppercase tracking-[0.18em] text-[#77736C]">
              Count
            </div>

            <div className="mt-2 flex items-end justify-center gap-2">
              <span className="text-5xl font-black leading-none text-[#1A2842]">
                {count?.balls ?? 0}
              </span>

              <span className="pb-1 text-2xl font-black" style={{ color }}>
                -
              </span>

              <span className="text-5xl font-black leading-none text-[#1A2842]">
                {count?.strikes ?? 0}
              </span>
            </div>

            <div className="mt-2 text-xs font-semibold text-[#77736C]">
              {count?.outs ?? 0} {(count?.outs ?? 0) === 1 ? "out" : "outs"}
            </div>
          </div>

          <div className="md:text-right">
            <div className="text-[10px] font-bold uppercase tracking-[0.18em] text-[#77736C]">
              Pitcher
            </div>

            <div className="mt-3 flex items-center gap-4 md:justify-end">
              <div className="min-w-0 md:text-right">
                {pitcher ? (
                  <Link
                    href={`/players/${pitcher.id}`}
                    className="font-bold text-[#1A2842] transition hover:text-[#D85F46]"
                  >
                    {pitcher.fullName}
                  </Link>
                ) : (
                  <div className="font-bold text-[#1A2842]">Unknown</div>
                )}

                <div className="mt-1 text-xs text-[#77736C]">On the mound</div>
              </div>

              {pitcher && (
                <Link href={`/players/${pitcher.id}`} className="shrink-0">
                  <img
                    src={headshotUrl(pitcher.id)}
                    alt=""
                    className="h-14 w-14 rounded-full bg-[#F4EEE5] object-cover ring-2 ring-transparent transition hover:ring-[#D85F46]"
                  />
                </Link>
              )}
            </div>
          </div>
        </div>

        <div className="border-t border-[#E8E1D7] bg-[#F4EEE5] px-6 py-6 md:px-8">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <div className="text-[10px] font-bold uppercase tracking-[0.18em] text-[#77736C]">
                Runners on base
              </div>
              <div className="mt-1 text-xs font-semibold text-[#1A2842]">
                {Object.values(runners).some(Boolean) ? "Traffic on the bases" : "Bases empty"}
              </div>
            </div>

            {lastEvent && (
              <div className="text-left sm:max-w-md sm:text-right">
                <div className="text-[10px] font-bold uppercase tracking-[0.18em]" style={{ color }}>
                  {lastEvent}
                </div>
                {description && (
                  <div className="mt-1 text-xs leading-5 text-[#77736C]">
                    {description}
                  </div>
                )}
              </div>
            )}
          </div>

          <div className="mx-auto mt-5 h-44 w-56">
            <div className="relative h-full w-full">
              <div className="absolute left-1/2 top-[16%] h-12 w-12 -translate-x-1/2 rotate-45 border-2 bg-white shadow-sm" style={{ borderColor: runners.second ? color : "#D8D1C7", backgroundColor: runners.second ? color : "#FFFFFF" }} />

              <div className="absolute left-[24%] top-1/2 h-12 w-12 -translate-x-1/2 -translate-y-1/2 rotate-45 border-2 bg-white shadow-sm" style={{ borderColor: runners.third ? color : "#D8D1C7", backgroundColor: runners.third ? color : "#FFFFFF" }} />

              <div className="absolute left-[76%] top-1/2 h-12 w-12 -translate-x-1/2 -translate-y-1/2 rotate-45 border-2 bg-white shadow-sm" style={{ borderColor: runners.first ? color : "#D8D1C7", backgroundColor: runners.first ? color : "#FFFFFF" }} />

              <div
                className="absolute bottom-[7%] left-1/2 h-9 w-11 -translate-x-1/2 border-2 bg-white shadow-sm"
                style={{
                  borderColor: color,
                  clipPath: "polygon(50% 0%, 100% 42%, 78% 100%, 22% 100%, 0% 42%)",
                }}
              />

              <div className="absolute left-1/2 top-[28%] h-[42%] w-[1px] -translate-x-1/2 bg-[#1A2842]/10" />
              <div className="absolute left-[34%] top-[49%] h-[1px] w-[32%] bg-[#1A2842]/10" />

              {Object.values(runners).some(Boolean) && (
                <div
                  className="absolute bottom-0 left-1/2 h-2 w-2 -translate-x-1/2 rounded-full"
                  style={{ backgroundColor: color, boxShadow: `0 0 0 4px ${color}22` }}
                />
              )}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

function LiveContextMetrics({
  feed,
  context,
  probability,
}: {
  feed: MlbGameFeed;
  context: GameContextMetrics | null;
  probability: WinProbabilityPoint | null;
}) {
  const linescore = feed.liveData.linescore;
  const currentPlay = feed.liveData.plays?.currentPlay;

  if (!linescore) return null;

  const away = feed.gameData.teams.away;
  const home = feed.gameData.teams.home;
  const battingTeam = getBattingTeam(feed);
  const battingColor = teamColor(battingTeam.id);

  const awayWinProbability = Math.max(
    0,
    Math.min(
      100,
      context?.awayWinProbability ??
        probability?.awayTeamWinProbability ??
        50
    )
  );

  const homeWinProbability = Math.max(
    0,
    Math.min(
      100,
      context?.homeWinProbability ??
        probability?.homeTeamWinProbability ??
        50
    )
  );

  const leverage = context?.leverageIndex ?? probability?.leverageIndex ?? null;

  const leverageLabel =
    leverage === null
      ? "Unavailable"
      : leverage < 1
        ? "Low"
        : leverage < 2
          ? "Average"
          : leverage < 3
            ? "High"
            : "Critical";

  const runners = getBaseRunners(feed);
  const baseState = [
    runners.first ? "1B" : null,
    runners.second ? "2B" : null,
    runners.third ? "3B" : null,
  ]
    .filter(Boolean)
    .join(" · ");

  const inning = getInningText(feed) ?? "Game state";
  const balls = currentPlay?.count?.balls ?? 0;
  const strikes = currentPlay?.count?.strikes ?? 0;
  const outs = currentPlay?.count?.outs ?? 0;

  return (
    <section>
      <div className="mb-5 flex items-end justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.2em] text-[#59A7A2]">
            <span
              className="h-1.5 w-1.5 rounded-full"
              style={{ backgroundColor: battingColor }}
            />
            Live context
          </div>
          <h2 className="mt-1 text-xl font-bold text-[#1A2842]">
            Win Probability & Leverage
          </h2>
        </div>

        <div className="hidden text-right sm:block">
          <div className="text-[9px] font-bold uppercase tracking-[0.18em] text-[#8B867D]">
            {inning}
          </div>
          <div className="mt-1 text-xs font-semibold text-[#1A2842]">
            {outs} {outs === 1 ? "out" : "outs"} · {balls}-{strikes}
          </div>
        </div>
      </div>

      <div className="overflow-hidden rounded-2xl border border-[#DED7CC] bg-white">
        <div className="grid md:grid-cols-[1fr_1.4fr_1fr]">
          <div className="border-b border-[#E8E1D7] p-5 md:border-b-0 md:border-r">
            <div className="flex items-center gap-3">
              <img
                src={logoUrl(away.id)}
                alt=""
                className="h-8 w-8 object-contain"
              />
              <div className="min-w-0">
                <div className="truncate text-[10px] font-bold uppercase tracking-[0.14em] text-[#77736C]">
                  {away.abbreviation}
                </div>
                <div className="mt-1 font-mono text-2xl font-black text-[#1A2842]">
                  {awayWinProbability.toFixed(0)}%
                </div>
              </div>
            </div>
          </div>

          <div className="flex flex-col justify-center p-5">
            <div className="flex items-center justify-between gap-3 text-[9px] font-bold uppercase tracking-[0.14em] text-[#8B867D]">
              <span>{away.abbreviation}</span>
              <span>Win probability</span>
              <span>{home.abbreviation}</span>
            </div>

            <div className="mt-3 flex h-3 overflow-hidden rounded-full bg-[#E8E1D7]">
              <div
                className="h-full transition-all duration-500"
                style={{
                  width: `${awayWinProbability}%`,
                  backgroundColor: teamColor(away.id),
                }}
              />
              <div
                className="h-full transition-all duration-500"
                style={{
                  width: `${homeWinProbability}%`,
                  backgroundColor: teamColor(home.id),
                }}
              />
            </div>

            <div className="mt-3 flex items-center justify-between text-[10px] font-semibold text-[#77736C]">
              <span>{awayWinProbability.toFixed(1)}%</span>
              <span>{homeWinProbability.toFixed(1)}%</span>
            </div>
          </div>

          <div className="border-t border-[#E8E1D7] p-5 md:border-l md:border-t-0">
            <div className="flex items-center justify-between gap-4">
              <div>
                <div className="text-[9px] font-bold uppercase tracking-[0.16em] text-[#8B867D]">
                  Leverage
                </div>
                <div className="mt-1 font-mono text-2xl font-black text-[#1A2842]">
                  {leverage === null ? "—" : leverage.toFixed(2)}
                </div>
              </div>

              <span
                className={`rounded-full px-2.5 py-1 text-[9px] font-bold uppercase tracking-[0.12em] ${
                  leverageLabel === "Critical"
                    ? "bg-[#D85F46] text-white"
                    : leverageLabel === "High"
                      ? "bg-[#1A2842] text-white"
                      : leverageLabel === "Average"
                        ? "bg-[#59B3AD]/20 text-[#1A2842]"
                        : "bg-[#E8E1D7] text-[#77736C]"
                }`}
              >
                {leverageLabel}
              </span>
            </div>

            <div className="mt-4 text-xs leading-5 text-[#77736C]">
              {baseState || "Bases empty"} · {outs}{" "}
              {outs === 1 ? "out" : "outs"} · {balls}-{strikes}
            </div>
          </div>
        </div>

        <div className="border-t border-[#E8E1D7] bg-[#F4EEE5] px-5 py-3 text-[10px] leading-5 text-[#77736C]">
          {battingTeam.abbreviation} batting · MLB game-context metrics update
          with the current score, inning, outs, runners, and count.
        </div>
      </div>
    </section>
  );
}

function LineScore({
  feed,
  away,
  home,
}: {
  feed: MlbGameFeed;
  away: MlbTeam;
  home: MlbTeam;
}) {
  const linescore = feed.liveData.linescore;

  if (!linescore) {
    return null;
  }

  const innings = linescore.innings ?? [];

  const maxInning = Math.max(
    linescore.scheduledInnings ?? 9,
    innings.length,
    9
  );

  const inningNumbers = Array.from(
    { length: maxInning },
    (_, index) => index + 1
  );

  return (
    <section>
      <SectionTitle eyebrow="The Scorebook" title="Line Score" />

      <div className="overflow-x-auto rounded-2xl border border-[#DED7CC] bg-white">
        <table className="w-full min-w-[720px] border-collapse text-sm">
          <thead>
            <tr className="border-b border-[#E8E1D7] bg-[#F4EEE5]">
              <th className="sticky left-0 z-10 min-w-[190px] bg-[#F4EEE5] px-5 py-3 text-left text-[10px] font-bold uppercase tracking-[0.16em] text-[#77736C]">
                Team
              </th>

              {inningNumbers.map((inning) => (
                <th
                  key={inning}
                  className="px-3 py-3 text-center text-[10px] font-bold text-[#77736C]"
                >
                  {inning}
                </th>
              ))}

              <th className="border-l border-[#DED7CC] px-4 py-3 text-center text-[10px] font-bold uppercase tracking-wider text-[#1A2842]">
                R
              </th>

              <th className="px-4 py-3 text-center text-[10px] font-bold uppercase tracking-wider text-[#1A2842]">
                H
              </th>

              <th className="px-4 py-3 text-center text-[10px] font-bold uppercase tracking-wider text-[#1A2842]">
                E
              </th>
            </tr>
          </thead>

          <tbody>
            <tr className="border-b border-[#E8E1D7]">
              <td className="sticky left-0 bg-white px-5 py-4 font-semibold text-[#1A2842]">
                <div className="flex items-center gap-3">
                  <img
                    src={logoUrl(away.id)}
                    alt=""
                    className="h-7 w-7 object-contain"
                  />

                  <span>{away.abbreviation}</span>
                </div>
              </td>

              {inningNumbers.map((inning) => {
                const data = innings.find((item) => item.num === inning);

                return (
                  <td
                    key={inning}
                    className="px-3 py-4 text-center text-[#4F4B45]"
                  >
                    {data?.away?.runs ?? 0}
                  </td>
                );
              })}

              <td className="border-l border-[#DED7CC] px-4 py-4 text-center font-bold text-[#1A2842]">
                {linescore.teams.away.runs}
              </td>

              <td className="px-4 py-4 text-center">
                {linescore.teams.away.hits}
              </td>

              <td className="px-4 py-4 text-center">
                {linescore.teams.away.errors}
              </td>
            </tr>

            <tr>
              <td className="sticky left-0 bg-white px-5 py-4 font-semibold text-[#1A2842]">
                <div className="flex items-center gap-3">
                  <img
                    src={logoUrl(home.id)}
                    alt=""
                    className="h-7 w-7 object-contain"
                  />

                  <span>{home.abbreviation}</span>
                </div>
              </td>

              {inningNumbers.map((inning) => {
                const data = innings.find((item) => item.num === inning);

                return (
                  <td
                    key={inning}
                    className="px-3 py-4 text-center text-[#4F4B45]"
                  >
                    {data?.home?.runs ?? 0}
                  </td>
                );
              })}

              <td className="border-l border-[#DED7CC] px-4 py-4 text-center font-bold text-[#1A2842]">
                {linescore.teams.home.runs}
              </td>

              <td className="px-4 py-4 text-center">
                {linescore.teams.home.hits}
              </td>

              <td className="px-4 py-4 text-center">
                {linescore.teams.home.errors}
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </section>
  );
}

function StartingPitchers({
  feed,
}: {
  feed: MlbGameFeed;
}) {
  const probable = feed.gameData.probablePitchers;

  const away = probable?.away;
  const home = probable?.home;

  if (!away && !home) {
    return null;
  }

  return (
    <section>
      <SectionTitle eyebrow="On the Mound" title="Starting Pitchers" />

      <div className="grid gap-4 md:grid-cols-2">
        <div className="rounded-2xl border border-[#DED7CC] bg-white p-5">
          <div className="text-[10px] font-bold uppercase tracking-[0.18em] text-[#77736C]">
            Away Starter
          </div>

          <div className="mt-3 flex items-center gap-4">
            {away && (
              <img
                src={headshotUrl(away.id)}
                alt=""
                className="h-14 w-14 rounded-full bg-[#F4EEE5] object-cover"
              />
            )}

            <div>
              <div className="font-bold text-[#1A2842]">
                {away?.fullName ?? "TBD"}
              </div>

              <div className="mt-1 text-xs text-[#77736C]">
                {away ? "Starting Pitcher" : "Not announced"}
              </div>
            </div>
          </div>
        </div>

        <div className="rounded-2xl border border-[#DED7CC] bg-white p-5">
          <div className="text-[10px] font-bold uppercase tracking-[0.18em] text-[#77736C]">
            Home Starter
          </div>

          <div className="mt-3 flex items-center gap-4">
            {home && (
              <img
                src={headshotUrl(home.id)}
                alt=""
                className="h-14 w-14 rounded-full bg-[#F4EEE5] object-cover"
              />
            )}

            <div>
              <div className="font-bold text-[#1A2842]">
                {home?.fullName ?? "TBD"}
              </div>

              <div className="mt-1 text-xs text-[#77736C]">
                {home ? "Starting Pitcher" : "Not announced"}
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

function BattingBoxScore({
  label,
  team,
  currentBatterId,
}: {
  label: string;
  team?: MlbBoxscoreTeam;
  currentBatterId?: number;
}) {
  if (!team?.players) return null;

  const hitters = Object.values(team.players)
    .filter(
      (player) =>
        Boolean(player.stats?.batting) &&
        Boolean(player.battingOrder) &&
        Number(player.battingOrder) % 100 === 0
    )
    .sort((a, b) => Number(a.battingOrder ?? 999) - Number(b.battingOrder ?? 999))
    .slice(0, 9);

  if (hitters.length === 0) return null;

  const color = teamColor(team.team.id);

  return (
    <section>
      <div className="mb-5 flex items-end justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.2em]" style={{ color }}>
            <span className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: color }} />
            {label}
          </div>
          <h2 className="mt-1 text-xl font-bold text-[#1A2842]">
            {team.team.name} Starting Lineup
          </h2>
        </div>

        <img src={logoUrl(team.team.id)} alt="" className="h-9 w-9 object-contain" />
      </div>

      <div className="overflow-x-auto rounded-2xl border border-[#DED7CC] bg-white">
        <table className="w-full min-w-[780px] border-collapse text-sm">
          <thead>
            <tr className="border-b border-[#E8E1D7] bg-[#F4EEE5]">
              <th className="sticky left-0 z-10 min-w-[270px] bg-[#F4EEE5] px-5 py-3 text-left text-[10px] font-bold uppercase tracking-[0.16em] text-[#77736C]">
                Batter
              </th>
              {['AB', 'R', 'H', 'RBI', 'BB', 'SO', 'HR', 'SB'].map((stat) => (
                <th key={stat} className="px-4 py-3 text-center text-[10px] font-bold uppercase tracking-wider text-[#77736C]">
                  {stat}
                </th>
              ))}
            </tr>
          </thead>

          <tbody>
            {hitters.map((player, index) => {
              const batting = player.stats?.batting;
              if (!batting) return null;

              const isCurrent = player.person.id === currentBatterId;

              return (
                <tr
                  key={player.person.id}
                  className={`border-b border-[#E8E1D7] last:border-0 ${index % 2 === 1 ? "bg-[#FCFAF7]" : "bg-white"}`}
                  style={isCurrent ? { boxShadow: `inset 3px 0 0 ${color}` } : undefined}
                >
                  <td className="sticky left-0 bg-inherit px-5 py-3">
                    <Link href={`/players/${player.person.id}`} className="group flex items-center gap-3">
                      <div className="relative h-9 w-9 shrink-0 overflow-hidden rounded-full bg-[#F4EEE5]">
                        <img src={headshotUrl(player.person.id)} alt="" className="h-full w-full object-cover" />
                        {isCurrent && (
                          <span className="absolute inset-0 ring-2 ring-inset" style={{ boxShadow: `inset 0 0 0 2px ${color}` }} />
                        )}
                      </div>

                      <div className="min-w-0">
                        <div className="truncate font-semibold text-[#1A2842] transition group-hover:text-[#D85F46]">
                          {player.person.fullName}
                        </div>
                        <div className="mt-0.5 flex items-center gap-2 text-[10px] uppercase tracking-wider text-[#8B867D]">
                          <span>{player.position?.abbreviation ?? ""}</span>
                          {isCurrent && <span style={{ color }}>At bat</span>}
                        </div>
                      </div>
                    </Link>
                  </td>

                  {[
                    batting.atBats,
                    batting.runs,
                    batting.hits,
                    batting.rbi,
                    batting.baseOnBalls,
                    batting.strikeOuts,
                    batting.homeRuns,
                    batting.stolenBases,
                  ].map((value, statIndex) => (
                    <td
                      key={statIndex}
                      className={`px-4 py-3 text-center ${statIndex === 2 ? "font-bold text-[#1A2842]" : "text-[#4F4B45]"}`}
                    >
                      {value ?? 0}
                    </td>
                  ))}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </section>
  );
}

function TeamTotals({
  label,
  team,
}: {
  label: string;
  team?: MlbBoxscoreTeam;
}) {
  if (!team) return null;

  const batting = team.teamStats?.batting;
  const pitching = team.teamStats?.pitching;

  return (
    <div className="rounded-2xl border border-[#DED7CC] bg-white p-5">
      <div className="mb-5 flex items-center gap-3">
        <img
          src={logoUrl(team.team.id)}
          alt=""
          className="h-9 w-9 object-contain"
        />

        <div>
          <div className="text-[10px] font-bold uppercase tracking-[0.16em] text-[#77736C]">
            {label}
          </div>

          <div className="font-bold text-[#1A2842]">
            {team.team.name}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-4 gap-3">
        <StatBox label="H" value={batting?.hits ?? 0} />
        <StatBox label="HR" value={batting?.homeRuns ?? 0} />
        <StatBox label="BB" value={batting?.baseOnBalls ?? 0} />
        <StatBox label="K" value={batting?.strikeOuts ?? 0} />
      </div>

      {pitching && (
        <div className="mt-4 border-t border-[#E8E1D7] pt-4">
          <div className="mb-2 text-[10px] font-bold uppercase tracking-[0.16em] text-[#77736C]">
            Pitching
          </div>

          <div className="grid grid-cols-4 gap-3 text-sm">
            <div>
              <div className="text-[10px] uppercase text-[#8B867D]">
                IP
              </div>

              <div className="font-semibold text-[#1A2842]">
                {pitching.inningsPitched ?? "-"}
              </div>
            </div>

            <div>
              <div className="text-[10px] uppercase text-[#8B867D]">
                ER
              </div>

              <div className="font-semibold text-[#1A2842]">
                {pitching.earnedRuns ?? 0}
              </div>
            </div>

            <div>
              <div className="text-[10px] uppercase text-[#8B867D]">
                BB
              </div>

              <div className="font-semibold text-[#1A2842]">
                {pitching.baseOnBalls ?? 0}
              </div>
            </div>

            <div>
              <div className="text-[10px] uppercase text-[#8B867D]">
                K
              </div>

              <div className="font-semibold text-[#1A2842]">
                {pitching.strikeOuts ?? 0}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function StatBox({
  label,
  value,
}: {
  label: string;
  value: string | number;
}) {
  return (
    <div className="rounded-xl bg-[#F4EEE5] px-3 py-3 text-center">
      <div className="text-[9px] font-bold uppercase tracking-wider text-[#8B867D]">
        {label}
      </div>

      <div className="mt-1 text-lg font-bold text-[#1A2842]">
        {value}
      </div>
    </div>
  );
}

export default async function GamePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const [game, contextMetrics, latestWinProbability] = await Promise.all([
    getGame(id),
    getGameContext(id),
    getWinProbability(id),
  ]);

  if (!game) {
    return (
      <main className="min-h-screen bg-[#F8F3EA] px-6 py-16">
        <div className="mx-auto max-w-3xl">
          <Link
            href="/games"
            className="text-sm font-semibold text-[#59A7A2]"
          >
            ← Back to games
          </Link>

          <div className="mt-8 rounded-2xl border border-[#DED7CC] bg-white p-10 text-center">
            <h1 className="text-2xl font-bold text-[#1A2842]">
              Game not found
            </h1>

            <p className="mt-2 text-sm text-[#77736C]">
              MLB could not return game data for game {id}.
            </p>
          </div>
        </div>
      </main>
    );
  }

  const status = getStatus(game);
  const linescore = game.liveData.linescore;

  const away = game.gameData.teams.away;
  const home = game.gameData.teams.home;

  const awayScore = linescore?.teams.away.runs ?? 0;
  const homeScore = linescore?.teams.home.runs ?? 0;

  const inningText = getInningText(game);

  return (
    <main className="min-h-screen bg-[#F8F3EA]">
      {/* Top navigation */}
      <div className="mx-auto max-w-7xl px-6 pt-7 md:px-10">
        <Link
          href="/games"
          className="text-sm font-semibold text-[#59A7A2] transition hover:text-[#D85F46]"
        >
          ← Back to games
        </Link>
      </div>

      {/* Game Header */}
      <section className="mx-auto max-w-7xl px-6 pb-10 pt-7 md:px-10 md:pt-10">
        <div className="overflow-hidden rounded-3xl border border-[#DED7CC] bg-white">
          {/* Status strip */}
          <div className="flex flex-col gap-3 border-b border-[#E8E1D7] bg-[#F4EEE5] px-6 py-4 sm:flex-row sm:items-center sm:justify-between md:px-8">
            <div className="flex items-center gap-3">
              <div
                className={`rounded-full px-3 py-1 text-[10px] font-bold tracking-[0.16em] ${status.className}`}
              >
                {status.label}
              </div>

              {status.live && (
                <span className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-[#D85F46]">
                  <span className="h-2 w-2 animate-pulse rounded-full bg-[#D85F46]" />
                  Live
                </span>
              )}

              {inningText && (
                <span className="text-xs font-semibold uppercase tracking-wider text-[#77736C]">
                  {inningText}
                </span>
              )}
            </div>

            <div className="text-xs text-[#77736C]">
              {formatDate(game.gameData.datetime.dateTime)} ·{" "}
              {formatTime(game.gameData.datetime.dateTime)}
            </div>
          </div>

          {/* Score */}
          <div className="px-6 py-10 md:px-12 md:py-14">
            <div className="grid items-center gap-8 md:grid-cols-[1fr_auto_1fr]">
              <TeamHeader
                team={away}
                score={awayScore}
                align="right"
              />

              <div className="hidden text-center md:block">
                <div className="text-[10px] font-bold uppercase tracking-[0.2em] text-[#B0AAA1]">
                  {status.live ? "In Progress" : status.label}
                </div>

                <div className="mx-auto mt-3 h-px w-12 bg-[#D85F46]" />
              </div>

              <TeamHeader
                team={home}
                score={homeScore}
                align="left"
              />
            </div>

            {status.live && inningText && (
              <div className="mx-auto mt-8 max-w-xs rounded-xl bg-[#F4EEE5] px-4 py-3 text-center">
                <div className="text-[10px] font-bold uppercase tracking-[0.18em] text-[#D85F46]">
                  Now Playing
                </div>

                <div className="mt-1 font-bold text-[#1A2842]">
                  {inningText}
                </div>
              </div>
            )}

            {game.gameData.venue?.name && (
              <div className="mt-8 text-center text-xs text-[#8B867D]">
                {game.gameData.venue.name}
              </div>
            )}
          </div>
        </div>
      </section>

      {/* Game Information */}
      <div className="mx-auto max-w-7xl space-y-12 px-6 pb-16 md:px-10">
        {/* Line Score */}
        {linescore && (
          <LineScore
            feed={game}
            away={away}
            home={home}
          />
        )}

        {/* Live At-Bat */}
        {status.live && <LiveAtBat feed={game} />}

        {/* Live Win Probability + Leverage */}
        {status.live && (
          <LiveContextMetrics
            feed={game}
            context={contextMetrics}
            probability={latestWinProbability}
          />
        )}

        {/* Starting Pitchers */}
        <StartingPitchers feed={game} />

        {/* Batting Box Scores */}
        {game.liveData.boxscore?.teams && (
          <>
            <BattingBoxScore
              label="Away"
              team={game.liveData.boxscore.teams.away}
              currentBatterId={game.liveData.plays?.currentPlay?.matchup?.batter?.id}
            />

            <BattingBoxScore
              label="Home"
              team={game.liveData.boxscore.teams.home}
              currentBatterId={game.liveData.plays?.currentPlay?.matchup?.batter?.id}
            />

            {/* Team Totals */}
            <section>
              <SectionTitle
                eyebrow="Game Book"
                title="Team Totals"
              />

              <div className="grid gap-5 md:grid-cols-2">
                <TeamTotals
                  label="Away"
                  team={game.liveData.boxscore.teams.away}
                />

                <TeamTotals
                  label="Home"
                  team={game.liveData.boxscore.teams.home}
                />
              </div>
            </section>
          </>
        )}

        {/* Decisions */}
        {game.liveData.decisions &&
          (game.liveData.decisions.winner ||
            game.liveData.decisions.loser ||
            game.liveData.decisions.savePlayer) && (
            <section>
              <SectionTitle
                eyebrow="Decisions"
                title="Pitching Decisions"
              />

              <div className="grid gap-4 sm:grid-cols-3">
                {game.liveData.decisions.winner && (
                  <div className="rounded-2xl border border-[#DED7CC] bg-white p-5">
                    <div className="text-[10px] font-bold uppercase tracking-[0.16em] text-[#59A7A2]">
                      Win
                    </div>

                    <div className="mt-2 font-bold text-[#1A2842]">
                      {game.liveData.decisions.winner.fullName}
                    </div>
                  </div>
                )}

                {game.liveData.decisions.loser && (
                  <div className="rounded-2xl border border-[#DED7CC] bg-white p-5">
                    <div className="text-[10px] font-bold uppercase tracking-[0.16em] text-[#D85F46]">
                      Loss
                    </div>

                    <div className="mt-2 font-bold text-[#1A2842]">
                      {game.liveData.decisions.loser.fullName}
                    </div>
                  </div>
                )}

                {game.liveData.decisions.savePlayer && (
                  <div className="rounded-2xl border border-[#DED7CC] bg-white p-5">
                    <div className="text-[10px] font-bold uppercase tracking-[0.16em] text-[#77736C]">
                      Save
                    </div>

                    <div className="mt-2 font-bold text-[#1A2842]">
                      {game.liveData.decisions.savePlayer.fullName}
                    </div>
                  </div>
                )}
              </div>
            </section>
          )}
      </div>
    </main>
  );
}