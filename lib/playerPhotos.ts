export type PhotoAction =
  | "swing"
  | "pitching"
  | "fielding"
  | "baserunning"
  | "general";

export type Photo = {
  src: string;
  action: PhotoAction;
  credit?: string;
};

export type PhotoContext =
  | "batting"
  | "pitching"
  | "fielding"
  | "baserunning"
  | "general";

/*
 * Offshore Break player photo system
 *
 * We use the MLB player ID to dynamically build an MLB action-photo URL.
 * This means we do NOT need to manually save thousands of player photos
 * inside public/players.
 *
 * Example:
 *   playerId = 592450
 *
 * becomes an MLB action-photo URL for that player.
 */

const MLB_IMAGE_BASE =
  "https://img.mlbstatic.com/mlb-photos/image/upload";

/**
 * Builds an MLB action photo URL.
 *
 * vertical/current gives us the current action image associated
 * with the player rather than a generic headshot.
 */
export function buildMLBActionPhotoUrl(
  playerId: number,
  width = 1200
): string {
  return `${MLB_IMAGE_BASE}/ar_4:5,c_fill,g_auto,w_${width}/v1/people/${playerId}/action/vertical/current.jpg`;
}

/**
 * MLB headshot fallback.
 *
 * This is intentionally only a fallback. We want action photos
 * whenever possible.
 */
export function buildMLBHeadshotUrl(
  playerId: number,
  width = 600
): string {
  return `${MLB_IMAGE_BASE}/ar_4:5,c_fill,g_face,w_${width}/v1/people/${playerId}/headshot/vertical/current.jpg`;
}

/**
 * Determines the appropriate action based on the page/stat context.
 */
export function actionForContext(
  context: PhotoContext
): PhotoAction {
  switch (context) {
    case "pitching":
      return "pitching";

    case "fielding":
      return "fielding";

    case "baserunning":
      return "baserunning";

    case "batting":
      return "swing";

    default:
      return "general";
  }
}

/**
 * Determines the most appropriate photo context from a player's
 * position and the statistic being displayed.
 */
export function contextForPlayer({
  position,
  statKey,
}: {
  position?: string | null;
  statKey?: string | null;
}): PhotoContext {
  const normalizedPosition = (position ?? "").toUpperCase();
  const stat = (statKey ?? "").toLowerCase();

  /*
   * Pitching stats always get a pitching image.
   */
  const pitchingStats = new Set([
    "era",
    "whip",
    "fip",
    "xfip",
    "siera",
    "strikeouts_pitched",
    "strikeouts_pitching",
    "innings_pitched",
    "ip",
    "wins",
    "losses",
    "saves",
    "save",
    "holds",
    "earned_runs",
    "walks_allowed",
    "hits_allowed",
    "home_runs_allowed",
    "k9",
    "bb9",
    "hr9",
    "k_bb",
    "kbb",
    "war_pitching",
  ]);

  if (pitchingStats.has(stat)) {
    return "pitching";
  }

  /*
   * Fielding stats get a fielding image.
   */
  const fieldingStats = new Set([
    "errors",
    "fielding_pct",
    "fielding_percentage",
    "assists",
    "putouts",
    "double_plays",
    "dps",
  ]);

  if (fieldingStats.has(stat)) {
    return "fielding";
  }

  /*
   * Baserunning stats.
   */
  const baserunningStats = new Set([
    "stolen_bases",
    "sb",
    "caught_stealing",
    "cs",
    "runs",
  ]);

  if (baserunningStats.has(stat)) {
    return "baserunning";
  }

  /*
   * If the player is a pitcher and no offensive stat was explicitly
   * requested, default to pitching.
   */
  if (
    normalizedPosition === "P" ||
    normalizedPosition === "SP" ||
    normalizedPosition === "RP"
  ) {
    return "pitching";
  }

  /*
   * Offensive players default to batting.
   */
  return "batting";
}

/**
 * Returns the preferred photo for a player.
 *
 * We intentionally do not maintain a giant manual photo database.
 * The MLB ID is enough to construct the image URL.
 */
export function getPlayerPhoto(
  playerId: number,
  context: PhotoContext = "general"
): Photo {
  const action = actionForContext(context);

  return {
    src: buildMLBActionPhotoUrl(playerId),
    action,
    credit: "MLB",
  };
}

/**
 * Returns the fallback headshot.
 *
 * Useful when the action image isn't available.
 */
export function getPlayerHeadshot(
  playerId: number
): Photo {
  return {
    src: buildMLBHeadshotUrl(playerId),
    action: "general",
    credit: "MLB",
  };
}

/**
 * Convenience function for components that know the player's
 * position and the stat they're displaying.
 */
export function getContextualPlayerPhoto({
  playerId,
  position,
  statKey,
}: {
  playerId: number;
  position?: string | null;
  statKey?: string | null;
}): Photo {
  const context = contextForPlayer({
    position,
    statKey,
  });

  return getPlayerPhoto(playerId, context);
}