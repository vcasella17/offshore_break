import Link from "next/link";
import PlayerActionPhoto from "@/components/PlayerActionPhoto";
import { teamLogo } from "@/lib/baseball";
import type { PhotoAction } from "@/lib/playerPhotos";

type SpotlightPlayer = {
  id: number;
  name: string;
  position?: string | null;
};

type SpotlightTeam = {
  id: string;
  name: string;
};

/**
 * Big player card.
 *
 * The photo sits in its own stage above the text, shown with object-contain
 * so the whole player is visible. A blurred copy of the same photo fills the
 * leftover space. If the photo can't be loaded, it falls back to a headshot
 * and then to a faint team logo (see PlayerActionPhoto).
 */
export default function SpotlightCard({
  player,
  team,
  badge,
  stats,
  action = "swing",
  className = "",
}: {
  player: SpotlightPlayer;
  team?: SpotlightTeam;
  badge: string;
  stats: [string, string][];
  action?: PhotoAction;
  className?: string;
}) {
  return (
    <Link
      href={`/players/${player.id}`}
      className={`group relative isolate flex flex-col overflow-hidden bg-[#0B1423] text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#D85F46] ${className}`}
    >
      {/* Top strip */}
      <div className="flex items-center justify-between gap-4 border-b border-white/10 px-6 py-4 md:px-8">
        <span className="bg-[#D85F46] px-3 py-1.5 text-[0.7rem] font-bold uppercase tracking-[0.14em]">
          {badge}
        </span>

        {team && (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={teamLogo(team.id)}
            alt=""
            aria-hidden="true"
            className="h-12 w-12 object-contain"
          />
        )}
      </div>

      {/* Photo stage */}
      <div className="relative min-h-[18rem] flex-1 overflow-hidden bg-[#101A2C]">
        <PlayerActionPhoto
          playerId={player.id}
          playerName={player.name}
          action={action}
          teamId={team?.id}
        />
      </div>

      {/* Info */}
      <div className="relative z-10 border-t border-white/10 p-6 md:p-8">
        <p className="text-[0.8rem] font-semibold uppercase tracking-[0.14em] text-[#59B3AD]">
          {team?.name ?? "Free Agent"}
          {player.position ? ` · ${player.position}` : ""}
        </p>

        <h3 className="mt-2 text-4xl font-black leading-[0.95] tracking-tight sm:text-5xl">
          {player.name}
        </h3>

        <div
          className="mt-6 grid gap-4 border-t border-white/20 pt-5"
          style={{
            gridTemplateColumns: `repeat(${stats.length}, minmax(0, 1fr))`,
          }}
        >
          {stats.map(([label, value], index) => (
            <div key={`${label}-${index}`}>
              <p className="font-mono text-2xl font-bold sm:text-3xl">
                {value}
              </p>

              <p className="mt-1 text-[0.7rem] font-semibold uppercase tracking-[0.14em] text-[#59B3AD]">
                {label}
              </p>
            </div>
          ))}
        </div>

        <div className="mt-5">
          <span className="text-sm font-semibold text-white/75 transition group-hover:text-white">
            View profile →
          </span>
        </div>
      </div>

      <div className="absolute bottom-0 left-0 z-10 h-1 w-0 bg-[#D85F46] transition-all duration-300 group-hover:w-full" />
    </Link>
  );
}