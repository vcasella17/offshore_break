export type PhotoAction = "swing" | "fielding" | "baserunning" | "pitching";

export type Photo = {
  src: string;
  action: PhotoAction;
  credit?: string;
};

type PhotoEntry = { src: string; credit?: string };

/*
 * To add a photo:
 *   1. Save the image as  public/players/<mlbId>/<action>.jpg
 *      e.g. public/players/656941/swing.jpg
 *   2. Add a line below.
 */
export const PLAYER_PHOTOS: Record<
  number,
  Partial<Record<PhotoAction, PhotoEntry>>
> = {
  // Example (remove the // to use it):
  //
  // 656941: {
  //   swing: {
  //     src: "/players/656941/swing.jpg",
  //     credit: "Photo: Photographer Name / Wikimedia Commons (CC BY-SA 2.0)",
  //   },
  // },
};

/** Which kind of photo fits which stat column. */
const ACTION_BY_STAT: Record<string, PhotoAction> = {
  ops: "swing",
  batting_avg: "swing",
  obp: "swing",
  slg: "swing",
  home_runs: "swing",
  rbi: "swing",
  hits: "swing",
  walks: "swing",
  strikeouts: "swing",

  era: "pitching",
  whip: "pitching",
  strikeouts_pitched: "pitching",
  innings_pitched: "pitching",
  wins: "pitching",
  losses: "pitching",
  earned_runs: "pitching",

  stolen_bases: "baserunning",
  sb: "baserunning",

  errors: "fielding",
  fielding_pct: "fielding",
  assists: "fielding",
  putouts: "fielding",
};

export function actionForStat(statKey: string): PhotoAction {
  return ACTION_BY_STAT[statKey] ?? "swing";
}

/** Returns the photo for this player and action, or null. Strict: no mismatched fallbacks. */
export function getPlayerPhoto(
  playerId: number,
  action: PhotoAction
): Photo | null {
  const entry = PLAYER_PHOTOS[playerId]?.[action];
  if (!entry?.src) return null;

  return { src: entry.src, action, credit: entry.credit };
}
