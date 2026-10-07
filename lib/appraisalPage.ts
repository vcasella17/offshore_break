import { cache } from "react";
import { getBirthDate, loadAppraisalContext } from "@/lib/appraisalData";
import { CONTRACTS } from "@/lib/contracts";
import { buildAppraisal } from "@/lib/appraisal";

/*
 * Everything one appraisal needs, loaded once per request.
 * The page, its title, and its share image all call this, and React's
 * cache() makes sure the database work only happens one time.
 * Returns null when the player doesn't exist.
 */
export const getAppraisalPage = cache(async (playerId: number) => {
  const ctx = await loadAppraisalContext();

  const player = ctx.players.find((p) => p.id === playerId);
  if (!player) return null;

  const team = player.team_id
    ? (ctx.teams.find((t) => t.id === player.team_id) ?? null)
    : null;

  const birthDate = await getBirthDate(playerId);

  const appraisal = buildAppraisal({
    season: ctx.season,
    player,
    players: ctx.players,
    stats: ctx.stats,
    warRows: ctx.warRows,
    teams: ctx.teams,
    birthDate,
    contract: CONTRACTS[playerId] ?? null,
  });

  return { ctx, player, team, appraisal };
});
