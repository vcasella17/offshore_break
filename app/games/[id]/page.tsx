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
      scheduledInnings?: number;

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

function logoUrl(teamId: number) {
  return `https://www.mlbstatic.com/team-logos/${teamId}.svg`;
}

function headshotUrl(playerId: number) {
  return `https://img.mlbstatic.com/mlb-photos/image/upload/w_80,q_auto:good/v1/people/${playerId}/headshot/67/current`;
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

function getBaseRunners(currentPlay: CurrentPlay) {
  const occupied = {
    first: false,
    second: false,
    third: false,
  };

  for (const runner of currentPlay.runners ?? []) {
    const start = runner.movement?.start;
    const end = runner.movement?.end;

    if (end === "1B") {
      occupied.first = true;
    }

    if (end === "2B") {
      occupied.second = true;
    }

    if (end === "3B") {
      occupied.third = true;
    }

    if (start === "1B" && end === "2B") {
      occupied.first = false;
      occupied.second = true;
    }

    if (start === "2B" && end === "3B") {
      occupied.second = false;
      occupied.third = true;
    }

    if (start === "3B" && end === "H") {
      occupied.third = false;
    }
  }

  return occupied;
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

  if (!currentPlay) {
    return null;
  }

  const batter = currentPlay.matchup?.batter;
  const pitcher = currentPlay.matchup?.pitcher;
  const count = currentPlay.count;

  const runners = getBaseRunners(currentPlay);

  return (
    <section>
      <SectionTitle eyebrow="Live Game" title="At the Plate" />

      <div className="overflow-hidden rounded-3xl border border-[#DED7CC] bg-white">
        <div className="border-b border-[#E8E1D7] bg-[#1A2842] px-6 py-4 md:px-8">
          <div className="flex items-center justify-between gap-4">
            <div>
              <div className="text-[10px] font-bold uppercase tracking-[0.2em] text-white/50">
                Current At-Bat
              </div>

              <div className="mt-1 text-lg font-bold text-white">
                {batter?.fullName ?? "Waiting for batter"}
              </div>
            </div>

            <div className="flex items-center gap-2 rounded-full bg-[#D85F46] px-3 py-1.5 text-[10px] font-bold uppercase tracking-[0.16em] text-white">
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
                <img
                  src={headshotUrl(batter.id)}
                  alt=""
                  className="h-14 w-14 rounded-full bg-[#F4EEE5] object-cover"
                />
              )}

              <div>
                <div className="font-bold text-[#1A2842]">
                  {batter?.fullName ?? "Unknown"}
                </div>

                <div className="mt-1 text-xs text-[#77736C]">
                  At the plate
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

              <span className="pb-1 text-2xl font-black text-[#D85F46]">
                -
              </span>

              <span className="text-5xl font-black leading-none text-[#1A2842]">
                {count?.strikes ?? 0}
              </span>
            </div>

            <div className="mt-2 text-xs font-semibold text-[#77736C]">
              {count?.outs ?? 0}{" "}
              {(count?.outs ?? 0) === 1 ? "out" : "outs"}
            </div>
          </div>

          <div className="md:text-right">
            <div className="text-[10px] font-bold uppercase tracking-[0.18em] text-[#77736C]">
              Pitcher
            </div>

            <div className="mt-3 flex items-center gap-4 md:justify-end">
              <div className="md:text-right">
                <div className="font-bold text-[#1A2842]">
                  {pitcher?.fullName ?? "Unknown"}
                </div>

                <div className="mt-1 text-xs text-[#77736C]">
                  On the mound
                </div>
              </div>

              {pitcher && (
                <img
                  src={headshotUrl(pitcher.id)}
                  alt=""
                  className="h-14 w-14 rounded-full bg-[#F4EEE5] object-cover"
                />
              )}
            </div>
          </div>
        </div>

        <div className="border-t border-[#E8E1D7] bg-[#F4EEE5] px-6 py-6 md:px-8">
          <div className="flex items-center justify-between">
            <div className="text-[10px] font-bold uppercase tracking-[0.18em] text-[#77736C]">
              Runners on Base
            </div>

            <div className="text-xs font-semibold text-[#77736C]">
              {[
                runners.first && "1B",
                runners.second && "2B",
                runners.third && "3B",
              ]
                .filter(Boolean)
                .join(" · ") || "Bases empty"}
            </div>
          </div>

          <div className="mx-auto mt-5 h-32 w-32">
            <div className="relative h-full w-full">
              <div
                className={`absolute left-1/2 top-2 h-9 w-9 -translate-x-1/2 rotate-45 border border-[#1A2842]/20 ${
                  runners.second ? "bg-[#D85F46]" : "bg-white"
                }`}
              />

              <div
                className={`absolute bottom-5 left-4 h-9 w-9 rotate-45 border border-[#1A2842]/20 ${
                  runners.third ? "bg-[#D85F46]" : "bg-white"
                }`}
              />

              <div
                className={`absolute bottom-5 right-4 h-9 w-9 rotate-45 border border-[#1A2842]/20 ${
                  runners.first ? "bg-[#D85F46]" : "bg-white"
                }`}
              />

              <div className="absolute bottom-0 left-1/2 h-7 w-7 -translate-x-1/2 rotate-45 bg-[#1A2842]" />

              <div className="absolute left-1/2 top-0 -translate-x-1/2 text-[9px] font-bold text-[#77736C]">
                2B
              </div>

              <div className="absolute bottom-2 left-0 text-[9px] font-bold text-[#77736C]">
                3B
              </div>

              <div className="absolute bottom-2 right-0 text-[9px] font-bold text-[#77736C]">
                1B
              </div>
            </div>
          </div>
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
}: {
  label: string;
  team?: MlbBoxscoreTeam;
}) {
  if (!team?.players) {
    return null;
  }

  const hitters = Object.values(team.players)
    .filter((player) => player.stats?.batting)
    .sort((a, b) => {
      const aOrder = Number(a.battingOrder ?? 999);
      const bOrder = Number(b.battingOrder ?? 999);

      return aOrder - bOrder;
    });

  if (hitters.length === 0) {
    return null;
  }

  return (
    <section>
      <SectionTitle eyebrow={label} title={`${team.team.name} Batting`} />

      <div className="overflow-x-auto rounded-2xl border border-[#DED7CC] bg-white">
        <table className="w-full min-w-[850px] border-collapse text-sm">
          <thead>
            <tr className="border-b border-[#E8E1D7] bg-[#F4EEE5]">
              <th className="sticky left-0 z-10 min-w-[240px] bg-[#F4EEE5] px-5 py-3 text-left text-[10px] font-bold uppercase tracking-[0.16em] text-[#77736C]">
                Batter
              </th>

              <th className="px-4 py-3 text-center text-[10px] font-bold uppercase tracking-wider text-[#77736C]">
                AB
              </th>

              <th className="px-4 py-3 text-center text-[10px] font-bold uppercase tracking-wider text-[#77736C]">
                R
              </th>

              <th className="px-4 py-3 text-center text-[10px] font-bold uppercase tracking-wider text-[#77736C]">
                H
              </th>

              <th className="px-4 py-3 text-center text-[10px] font-bold uppercase tracking-wider text-[#77736C]">
                RBI
              </th>

              <th className="px-4 py-3 text-center text-[10px] font-bold uppercase tracking-wider text-[#77736C]">
                BB
              </th>

              <th className="px-4 py-3 text-center text-[10px] font-bold uppercase tracking-wider text-[#77736C]">
                SO
              </th>

              <th className="px-4 py-3 text-center text-[10px] font-bold uppercase tracking-wider text-[#77736C]">
                HR
              </th>

              <th className="px-4 py-3 text-center text-[10px] font-bold uppercase tracking-wider text-[#77736C]">
                SB
              </th>
            </tr>
          </thead>

          <tbody>
            {hitters.map((player, index) => {
              const batting = player.stats?.batting;

              if (!batting) {
                return null;
              }

              return (
                <tr
                  key={player.person.id}
                  className={`border-b border-[#E8E1D7] last:border-0 ${
                    index % 2 === 1 ? "bg-[#FCFAF7]" : "bg-white"
                  }`}
                >
                  <td className="sticky left-0 bg-inherit px-5 py-3">
                    <div className="flex items-center gap-3">
                      <img
                        src={headshotUrl(player.person.id)}
                        alt=""
                        className="h-9 w-9 rounded-full bg-[#F4EEE5] object-cover"
                      />

                      <div>
                        <div className="font-semibold text-[#1A2842]">
                          {player.person.fullName}
                        </div>

                        <div className="mt-0.5 text-[10px] uppercase tracking-wider text-[#8B867D]">
                          {player.position?.abbreviation ?? ""}
                        </div>
                      </div>
                    </div>
                  </td>

                  <td className="px-4 py-3 text-center text-[#4F4B45]">
                    {batting.atBats ?? 0}
                  </td>

                  <td className="px-4 py-3 text-center text-[#4F4B45]">
                    {batting.runs ?? 0}
                  </td>

                  <td className="px-4 py-3 text-center font-semibold text-[#1A2842]">
                    {batting.hits ?? 0}
                  </td>

                  <td className="px-4 py-3 text-center text-[#4F4B45]">
                    {batting.rbi ?? 0}
                  </td>

                  <td className="px-4 py-3 text-center text-[#4F4B45]">
                    {batting.baseOnBalls ?? 0}
                  </td>

                  <td className="px-4 py-3 text-center text-[#4F4B45]">
                    {batting.strikeOuts ?? 0}
                  </td>

                  <td className="px-4 py-3 text-center text-[#4F4B45]">
                    {batting.homeRuns ?? 0}
                  </td>

                  <td className="px-4 py-3 text-center text-[#4F4B45]">
                    {batting.stolenBases ?? 0}
                  </td>
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

  const game = await getGame(id);

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

        {/* Starting Pitchers */}
        <StartingPitchers feed={game} />

        {/* Batting Box Scores */}
        {game.liveData.boxscore?.teams && (
          <>
            <BattingBoxScore
              label="Away Lineup"
              team={game.liveData.boxscore.teams.away}
            />

            <BattingBoxScore
              label="Home Lineup"
              team={game.liveData.boxscore.teams.home}
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