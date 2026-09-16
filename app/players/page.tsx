import { supabase } from '@/lib/supabaseClient'

export default async function PlayersPage() {
  const { data: players, error } = await supabase
    .from('Player')
    .select('id, name, position, team_id')
    .order('name')
    .limit(50)

  if (error) {
    return <div className="p-8 text-red-600">Error loading players: {error.message}</div>
  }

  return (
    <div className="p-8 max-w-3xl mx-auto">
      <h1 className="text-3xl font-bold mb-6">Players</h1>
      <ul className="space-y-2">
        {players?.map((player) => (
          <li key={player.id} className="border-b pb-2">
            <span className="font-semibold">{player.name}</span>
            {' — '}
            <span className="text-gray-600">{player.position}</span>
          </li>
        ))}
      </ul>
    </div>
  )
}