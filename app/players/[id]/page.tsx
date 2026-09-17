import { supabase } from '@/lib/supabaseClient'
import Link from 'next/link'

export default async function HomePage() {
  const { data: topHitters } = await supabase
    .from('PlayerStats')
    .select('player_id, batting_avg, home_runs, rbi, ops')
    .not('ops', 'is', null)
    .order('ops', { ascending: false })
    .limit(5)

  const playerIds = topHitters?.map((s) => s.player_id) ?? []

  const { data: players } = await supabase
    .from('Player')
    .select('id, name, position')
    .in('id', playerIds.length ? playerIds : [0])

  const playerMap = new Map(players?.map((p) => [p.id, p]))

  return (
    <div className="min-h-screen">
      <section className="border-b px-8 py-20 text-center">
        <h1 className="text-5xl font-bold mb-4">Offshore Break</h1>
        <p className="text-lg text-gray-600 max-w-xl mx-auto mb-8">
          Baseball stats, told as stories — real player data, updated daily.
        </p>
        <Link
          href="/players"
          className="inline-block bg-blue-700 text-white px-6 py-3 rounded font-semibold hover:bg-blue-800"
        >
          Browse Players
        </Link>
      </section>

      <section className="px-8 py-12 max-w-3xl mx-auto">
        <h2 className="text-2xl font-bold mb-6">Top Performers This Season</h2>
        <ul className="space-y-3">
          {topHitters?.map((stat) => {
            const player = playerMap.get(stat.player_id)
            if (!player) return null
            return (
              <li key={stat.player_id} className="border-b pb-3">
                <Link
                  href={`/players/${player.id}`}
                  className="font-semibold text-blue-700 hover:underline text-lg"
                >
                  {player.name}
                </Link>
                <span className="text-gray-600"> — {player.position}</span>
                <div className="text-sm text-gray-500 mt-1">
                  AVG {stat.batting_avg} · HR {stat.home_runs} · RBI {stat.rbi} · OPS {stat.ops}
                </div>
              </li>
            )
          })}
        </ul>
      </section>
    </div>
  )
}