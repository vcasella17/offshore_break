import { supabase } from '@/lib/supabaseClient'
import Link from 'next/link'

export default async function TeamsPage() {
  const { data: teams, error } = await supabase
    .from('Teams')
    .select('id, name, abbreviation, league')
    .order('name')

  if (error) {
    return <div className="p-8 text-red-600">Error loading teams: {error.message}</div>
  }

  return (
    <div className="p-8 max-w-3xl mx-auto">
      <h1 className="text-3xl font-bold mb-6">Teams</h1>
      <ul className="space-y-2">
        {teams?.map((team) => (
          <li key={team.id} className="border-b pb-2">
            <Link href={`/teams/${team.id}`} className="font-semibold text-blue-700 hover:underline">
              {team.name}
            </Link>
            {' — '}
            <span className="text-gray-600">{team.abbreviation}</span>
          </li>
        ))}
      </ul>
    </div>
  )
}