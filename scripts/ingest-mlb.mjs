import dotenv from "dotenv"
import { createClient } from "@supabase/supabase-js"

dotenv.config({ path: ".env.local" })

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SECRET_KEY
)

const response = await fetch(
  "https://statsapi.mlb.com/api/v1/stats?stats=season&group=pitching&season=2026&sportIds=1&limit=2000"
)

if (!response.ok) {
  throw new Error(`MLB API error: ${response.status}`)
}

const data = await response.json()

const stats = data.stats.flatMap(group =>
  group.splits.map(split => ({
    player_id: split.player.id,
    season: 2026,
    team_id: split.team.id.toString(),
    innings_pitched: Number(split.stat.inningsPitched),
    wins: split.stat.wins,
    losses: split.stat.losses,
    earned_runs: split.stat.earnedRuns,
    hits_allowed: split.stat.hits,
    walks_allowed: split.stat.baseOnBalls,
    strikeouts_pitched: split.stat.strikeOuts,
    era: Number(split.stat.era),
    whip: Number(split.stat.whip)
  }))
)

console.log(`Pulled ${stats.length} pitching stat lines`)

for (const stat of stats) {
  const { error } = await supabase
    .from("PlayerStats")
    .update(stat)
    .eq("player_id", stat.player_id)
    .eq("season", stat.season)
    .eq("team_id", stat.team_id)

  if (error) {
    throw error
  }
}

console.log("Pitching statistics successfully added to Supabase")