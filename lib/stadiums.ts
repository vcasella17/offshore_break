/*
 * Which stadium models you have added.
 *
 * To add a stadium:
 *   1. Put the model at public/stadiums/<ABBR>.glb (e.g. NYY.glb)
 *   2. Add the team's abbreviation and park name below.
 */

export type StadiumInfo = {
  /** the park's name */
  name: string;
};

export const STADIUMS: Record<string, StadiumInfo> = {
  ARI: { name: "Chase Field" },
  ATL: { name: "Truist Park" },
  BAL: { name: "Oriole Park at Camden Yards" },
  BOS: { name: "Fenway Park" },
  CHC: { name: "Wrigley Field" },
  CWS: { name: "Rate Field" },
  CIN: { name: "Great American Ball Park" },
  CLE: { name: "Progressive Field" },
  COL: { name: "Coors Field" },
  DET: { name: "Comerica Park" },
  HOU: { name: "Daikin Park" },
  KC: { name: "Kauffman Stadium" },
  LAA: { name: "Angel Stadium" },
  LAD: { name: "Dodger Stadium" },
  MIA: { name: "loanDepot park" },
  MIL: { name: "American Family Field" },
  MIN: { name: "Target Field" },
  NYM: { name: "Citi Field" },
  NYY: { name: "Yankee Stadium" },
  PHI: { name: "Citizens Bank Park" },
  PIT: { name: "PNC Park" },
  SD: { name: "Petco Park" },
  SF: { name: "Oracle Park" },
  SEA: { name: "T-Mobile Park" },
  STL: { name: "Busch Stadium" },
  TB: { name: "Tropicana Field" },
  TEX: { name: "Globe Life Field" },
  TOR: { name: "Rogers Centre" },
  WSH: { name: "Nationals Park" },
};

/*
 * Other abbreviations a database might use for the same team.
 * Left side = what your database might say, right side = the file name above.
 */
const ALIASES: Record<string, string> = {
  AZ: "ARI",
  CHW: "CWS",
  KCR: "KC",
  SDP: "SD",
  SFG: "SF",
  TBR: "TB",
  WAS: "WSH",
  WSN: "WSH",
};

export type Stadium = StadiumInfo & {
  /** the abbreviation used for the .glb file name */
  code: string;
  /** the public URL of the .glb file */
  url: string;
};

export function stadiumUrl(code: string): string {
  return `/stadiums/${encodeURIComponent(code)}.glb`;
}

/** Returns the stadium for a team abbreviation, or null if no model exists. */
export function getStadium(abbreviation: string): Stadium | null {
  const upper = abbreviation.trim().toUpperCase();
  const code = ALIASES[upper] ?? upper;

  if (!Object.prototype.hasOwnProperty.call(STADIUMS, code)) return null;

  return { ...STADIUMS[code], code, url: stadiumUrl(code) };
}
