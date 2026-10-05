import { NextResponse } from "next/server";
import { headshotSilo } from "@/lib/baseball";

const MLB_API = "https://statsapi.mlb.com/api/v1";
const SEASON = 2026;

type Keyword = {
  type?: string;
  value?: string;
  displayName?: string;
};

type ImageCut = {
  width?: number;
  height?: number;
  src?: string;
};

type MediaItem = {
  type?: string;
  keywordsAll?: Keyword[];
  image?: {
    title?: string;
    cuts?: ImageCut[];
  };
};

function getImage(item: MediaItem): string | null {
  const cuts = item.image?.cuts ?? [];

  const validCuts = cuts
    .filter((cut) => cut.src)
    .sort((a, b) => (b.width ?? 0) - (a.width ?? 0));

  return validCuts[0]?.src ?? null;
}

function collectMedia(
  value: unknown,
  results: MediaItem[] = []
): MediaItem[] {
  if (!value || typeof value !== "object") {
    return results;
  }

  if (Array.isArray(value)) {
    for (const item of value) {
      collectMedia(item, results);
    }

    return results;
  }

  const object = value as Record<string, unknown>;

  if (
    object.image &&
    typeof object.image === "object" &&
    Array.isArray(object.keywordsAll)
  ) {
    results.push(object as MediaItem);
  }

  for (const child of Object.values(object)) {
    collectMedia(child, results);
  }

  return results;
}

function scoreItem(
  item: MediaItem,
  playerId: number
): number {
  const tags = item.keywordsAll ?? [];

  let score = 0;

  const playerIdMatch = tags.some(
    (tag) =>
      tag.type === "player_id" &&
      tag.value === String(playerId)
  );

  const playerTagMatch = tags.some(
    (tag) =>
      tag.value === `playerid-${playerId}`
  );

  const actionMatch = tags.some(
    (tag) =>
      tag.value === "game-action-tracking" ||
      tag.value === "in-game-highlight"
  );

  const storyHighlight = tags.some(
    (tag) =>
      tag.value === "game-story-highlight"
  );

  if (playerIdMatch) score += 1000;
  if (playerTagMatch) score += 500;
  if (actionMatch) score += 500;
  if (storyHighlight) score += 200;

  if (item.image?.cuts?.length) {
    score += 100;
  }

  if (item.type === "video") {
    score -= 100;
  }

  return score;
}

async function getJSON<T>(url: string): Promise<T | null> {
  try {
    const response = await fetch(url, {
      next: {
        revalidate: 3600,
      },
    });

    if (!response.ok) {
      return null;
    }

    return (await response.json()) as T;
  } catch {
    return null;
  }
}

export async function GET(
  request: Request,
  context: {
    params: Promise<{ id: string }>;
  }
) {
  const { id } = await context.params;

  const playerId = Number(id);

  if (!Number.isInteger(playerId)) {
    return NextResponse.json(
      {
        src: "",
        kind: "headshot",
      },
      { status: 400 }
    );
  }

  const url = new URL(request.url);
  const playerName = url.searchParams.get("name") ?? "";

  /*
   * 1. Find the player's current MLB team.
   */
  const player = await getJSON<{
    people?: Array<{
      id: number;
      fullName?: string;
      currentTeam?: {
        id: number;
        name?: string;
      };
    }>;
  }>(
    `${MLB_API}/people/${playerId}?hydrate=currentTeam`
  );

  const currentPlayer = player?.people?.[0];

  const teamId = currentPlayer?.currentTeam?.id;

  if (!teamId) {
    return NextResponse.json({
      src: headshotSilo(playerId, 720),
      kind: "headshot",
      credit: "Photo: MLB",
    });
  }

  /*
   * 2. Get this team's 2026 schedule.
   */
  const today = new Date()
    .toISOString()
    .slice(0, 10);

  const schedule = await getJSON<{
    dates?: Array<{
      games?: Array<{
        gamePk?: number;
        status?: {
          abstractGameState?: string;
        };
      }>;
    }>;
  }>(
    `${MLB_API}/schedule` +
      `?sportId=1` +
      `&season=${SEASON}` +
      `&teamId=${teamId}` +
      `&startDate=${SEASON}-03-01` +
      `&endDate=${today}`
  );

  const gameIds =
    schedule?.dates
      ?.flatMap((date) => date.games ?? [])
      .filter(
        (game) =>
          game.gamePk &&
          game.status?.abstractGameState === "Final"
      )
      .map((game) => game.gamePk!)
      .reverse()
      .slice(0, 5) ?? [];

  /*
   * 3. Search the most recent completed games.
   */
  const contents = await Promise.all(
    gameIds.map((gamePk) =>
      getJSON<unknown>(
        `${MLB_API}/game/${gamePk}/content`
      )
    )
  );

  const candidates: Array<{
    item: MediaItem;
    score: number;
  }> = [];

  for (const content of contents) {
    if (!content) continue;

    const media = collectMedia(content);

    for (const item of media) {
      const tags = item.keywordsAll ?? [];

      const hasPlayerId = tags.some(
        (tag) =>
          tag.type === "player_id" &&
          tag.value === String(playerId)
      );

      const hasPlayerTag = tags.some(
        (tag) =>
          tag.value === `playerid-${playerId}`
      );

      if (!hasPlayerId && !hasPlayerTag) {
        continue;
      }

      const image = getImage(item);

      if (!image) {
        continue;
      }

      candidates.push({
        item,
        score: scoreItem(item, playerId),
      });
    }
  }

  /*
   * 4. Pick the highest-scoring action image.
   */
  candidates.sort((a, b) => b.score - a.score);

  const best = candidates[0];

  if (best) {
    const image = getImage(best.item);

    if (image) {
      return NextResponse.json({
        src: image,
        kind: "action",
        credit: "Photo: MLB",
      });
    }
  }

  /*
   * 5. Reliable fallback.
   */
  return NextResponse.json({
    src: headshotSilo(playerId, 720),
    kind: "headshot",
    credit: "Photo: MLB",
  });
}