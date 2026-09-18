import { supabase } from '@/lib/supabaseClient'
import Link from 'next/link'

export default async function GamesPage() {
  const { data: games, error } = await supabase
    .from('Games')
    .select('id, game_date, home_team_id, away_team_id, home_score, away_score')
    .order('game_date', { ascending: false })
    .limit(50)

  if (error) {
    return <div className="p-8 text-red-600">Error loading games: {error.message}</div>
  }

  const teamIds = Array.from(
    new Set(games?.flatMap((g) => [g.home_team_id, g.away_team_id]) ?? [])
  )

  const { data: teams } = await supabase
    .from('Teams')
    .select('id, abbreviation')
    .in('id', teamIds.length ? teamIds : [0])

  const teamMap = new Map(teams?.map((t) => [t.id, t.abbreviation]))

  return (
    <div className="p-8 max-w-2xl mx-auto">
      <h1 className="text-3xl font-bold mb-6">Recent Games</h1>
      <ul className="space-y-2">
        {games?.map((game) => (
          <li key={game.id} className="border-b pb-2">
            <Link href={`/games/${game.id}`} className="hover:underline">
              <span className="text-gray-500 text-sm mr-3">{game.game_date}</span>
              <span className="font-semibold">
                {teamMap.get(game.away_team_id) ?? game.away_team_id} {game.away_score}
                {' @ '}
                {teamMap.get(game.home_team_id) ?? game.home_team_id} {game.home_score}
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  )
}