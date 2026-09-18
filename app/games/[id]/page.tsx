import { supabase } from '@/lib/supabaseClient'
import Link from 'next/link'

export default async function GamePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params

  const { data: game, error } = await supabase
    .from('Games')
    .select('id, game_date, home_team_id, away_team_id, home_score, away_score')
    .eq('id', id)
    .single()

  if (error || !game) {
    return <div className="p-8 text-red-600">Game not found.</div>
  }

  const { data: teams } = await supabase
    .from('Teams')
    .select('id, name, abbreviation')
    .in('id', [game.home_team_id, game.away_team_id])

  const teamMap = new Map(teams?.map((t) => [t.id, t]))
  const home = teamMap.get(game.home_team_id)
  const away = teamMap.get(game.away_team_id)

  return (
    <div className="p-8 max-w-xl mx-auto">
      <Link href="/games" className="text-sm text-gray-500">&larr; Back to games</Link>
      <p className="text-gray-500 mt-2 mb-4">{game.game_date}</p>

      <div className="grid grid-cols-2 gap-4 text-center">
        <div className="border rounded p-6">
          <div className="text-lg font-semibold">{away?.name ?? game.away_team_id}</div>
          <div className="text-4xl font-bold mt-2">{game.away_score}</div>
        </div>
        <div className="border rounded p-6">
          <div className="text-lg font-semibold">{home?.name ?? game.home_team_id}</div>
          <div className="text-4xl font-bold mt-2">{game.home_score}</div>
        </div>
      </div>
    </div>
  )
}