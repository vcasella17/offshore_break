import { supabase } from '@/lib/supabaseClient'
import Link from 'next/link'

export default async function TeamPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params

  const { data: team, error: teamError } = await supabase
    .from('Teams')
    .select('id, name, abbreviation, league')
    .eq('id', id)
    .single()

  if (teamError || !team) {
    return <div className="p-8 text-red-600">Team not found.</div>
  }

  const { data: roster } = await supabase
    .from('Player')
    .select('id, name, position')
    .eq('team_id', id)
    .order('name')

  return (
    <div className="p-8 max-w-2xl mx-auto">
      <Link href="/teams" className="text-sm text-gray-500">&larr; Back to teams</Link>
      <h1 className="text-3xl font-bold mt-2 mb-1">{team.name}</h1>
      <p className="text-gray-600 mb-6">{team.abbreviation}</p>

      <h2 className="text-xl font-semibold mb-3">Roster</h2>
      <ul className="space-y-2">
        {roster?.map((player) => (
          <li key={player.id} className="border-b pb-2">
            <Link href={`/players/${player.id}`} className="font-semibold text-blue-700 hover:underline">
              {player.name}
            </Link>
            {' — '}
            <span className="text-gray-600">{player.position}</span>
          </li>
        ))}
      </ul>
      {(!roster || roster.length === 0) && <p className="text-gray-500">No roster data available.</p>}
    </div>
  )
}