import { supabase } from '@/lib/supabaseClient'
import Link from 'next/link'

export default async function PlayerPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params

  const { data: player, error: playerError } = await supabase
    .from('Player')
    .select('id, name, position, team_id')
    .eq('id', id)
    .single()
    console.log('Looking for id:', id, 'Error:', playerError)

  if (playerError || !player) {
    return <div className="p-8 text-red-600">Player not found.</div>
  }

  const { data: stats } = await supabase
    .from('PlayerStats')
    .select('*')
    .eq('player_id', id)
    .order('season', { ascending: false })

  const latest = stats?.[0]
  const isHitter = latest && latest.batting_avg !== null
  const isPitcher = latest && latest.era !== null

  return (
    <div className="p-8 max-w-2xl mx-auto">
      <Link href="/players" className="text-sm text-gray-500">&larr; Back to players</Link>
      <h1 className="text-3xl font-bold mt-2 mb-1">{player.name}</h1>
      <p className="text-gray-600 mb-6">{player.position}</p>

      {!latest && <p>No stats available yet for this player.</p>}

      {isHitter && (
        <div className="mb-8">
          <h2 className="text-xl font-semibold mb-3">{latest.season} Hitting</h2>
          <div className="grid grid-cols-3 gap-4">
            <Stat label="AVG" value={latest.batting_avg} />
            <Stat label="HR" value={latest.home_runs} />
            <Stat label="RBI" value={latest.rbi} />
            <Stat label="OPS" value={latest.ops} />
            <Stat label="Hits" value={latest.hits} />
            <Stat label="Walks" value={latest.walks} />
          </div>
        </div>
      )}

      {isPitcher && (
        <div>
          <h2 className="text-xl font-semibold mb-3">{latest.season} Pitching</h2>
          <div className="grid grid-cols-3 gap-4">
            <Stat label="ERA" value={latest.era} />
            <Stat label="Wins" value={latest.wins} />
            <Stat label="Losses" value={latest.losses} />
            <Stat label="WHIP" value={latest.whip} />
            <Stat label="Strikeouts" value={latest.strikeouts_pitched} />
            <Stat label="Innings" value={latest.innings_pitched} />
          </div>
        </div>
      )}
    </div>
  )
}

function Stat({ label, value }: { label: string; value: any }) {
  return (
    <div className="border rounded p-3 text-center">
      <div className="text-2xl font-bold">{value ?? '—'}</div>
      <div className="text-xs text-gray-500 uppercase">{label}</div>
    </div>
  )
}