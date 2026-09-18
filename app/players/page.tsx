import { supabase } from '@/lib/supabaseClient'
import Link from 'next/link'

const PAGE_SIZE = 50

export default async function PlayersPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string }>
}) {
  const params = await searchParams
  const currentPage = Math.max(1, parseInt(params.page ?? '1', 10) || 1)
  const from = (currentPage - 1) * PAGE_SIZE
  const to = from + PAGE_SIZE - 1

  const { data: players, error, count } = await supabase
    .from('Player')
    .select('id, name, position, team_id', { count: 'exact' })
    .order('name')
    .range(from, to)

  if (error) {
    return <div className="p-8 text-red-600">Error loading players: {error.message}</div>
  }

  const totalPlayers = count ?? 0
  const totalPages = Math.ceil(totalPlayers / PAGE_SIZE)

  return (
    <div className="p-8 max-w-3xl mx-auto">
      <h1 className="text-3xl font-bold mb-2">Players</h1>
      <p className="text-sm text-gray-500 mb-6">
        Showing {from + 1}–{Math.min(to + 1, totalPlayers)} of {totalPlayers}
      </p>

      <ul className="space-y-2 mb-8">
        {players?.map((player) => (
          <li key={player.id} className="border-b pb-2">
            <Link href={`/players/${player.id}`} className="font-semibold text-blue-700 hover:underline">
              {player.name}
            </Link>
            {' — '}
            <span className="text-gray-600">{player.position}</span>
          </li>
        ))}
      </ul>

      <div className="flex justify-between items-center">
        {currentPage > 1 ? (
          <Link
            href={`/players?page=${currentPage - 1}`}
            className="px-4 py-2 border rounded font-semibold hover:bg-gray-50"
          >
            &larr; Previous
          </Link>
        ) : (
          <span />
        )}

        <span className="text-sm text-gray-500">
          Page {currentPage} of {totalPages}
        </span>

        {currentPage < totalPages ? (
          <Link
            href={`/players?page=${currentPage + 1}`}
            className="px-4 py-2 border rounded font-semibold hover:bg-gray-50"
          >
            Next &rarr;
          </Link>
        ) : (
          <span />
        )}
      </div>
    </div>
  )
}