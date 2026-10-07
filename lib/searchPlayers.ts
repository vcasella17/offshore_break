/*
 * Search logic for the player picker. Pure functions, no React,
 * so it is easy to test and reuse (e.g. for a Cmd+K search later).
 */

export type PickerPlayer = {
  id: string | number;
  name: string;
  /** team abbreviation, e.g. "NYY" (optional) */
  team?: string | null;
};

export type IndexedPlayer = {
  player: PickerPlayer;
  /** normalized name used for matching */
  key: string;
  /** lower-case team abbreviation, or "" */
  team: string;
};

/** lower-case, no accents or punctuation: "Cristopher Sánchez" -> "cristopher sanchez" */
export function normalize(text: string): string {
  return text
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "") // accents
    .toLowerCase()
    .replace(/[.'’]/g, "") // J.P. -> jp, O'Hoppe -> ohoppe
    .replace(/[-–]/g, " ") // Ha-Seong -> ha seong
    .replace(/\s+/g, " ")
    .trim();
}

/** Build the search index once, then reuse it for every keystroke. */
export function indexPlayers(players: PickerPlayer[]): IndexedPlayer[] {
  return players.map((player) => ({
    player,
    key: normalize(player.name),
    team: (player.team ?? "").trim().toLowerCase(),
  }));
}

/**
 * Best matches first:
 *   0 = name starts with what you typed
 *   1 = every word you typed starts a word in the name (last-name search)
 *   2 = the words appear somewhere in the name
 * Typing a team abbreviation ("nyy") also works, alone or with a name.
 */
export function searchPlayers(
  index: IndexedPlayer[],
  query: string,
  limit = 50,
): PickerPlayer[] {
  const q = normalize(query);

  if (!q) return index.slice(0, limit).map((item) => item.player);

  const tokens = q.split(" ");
  const matches: { player: PickerPlayer; score: number }[] = [];

  for (const { player, key, team } of index) {
    const padded = ` ${key}`;

    const everyTokenMatches = tokens.every(
      (token) => key.includes(token) || team === token,
    );
    if (!everyTokenMatches) continue;

    const everyTokenStartsAWord = tokens.every(
      (token) => padded.includes(` ${token}`) || team === token,
    );

    const score = key.startsWith(q) ? 0 : everyTokenStartsAWord ? 1 : 2;
    matches.push({ player, score });
  }

  matches.sort(
    (a, b) => a.score - b.score || a.player.name.localeCompare(b.player.name),
  );

  return matches.slice(0, limit).map((match) => match.player);
}
