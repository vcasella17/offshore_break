"use client";

import Link from "next/link";
import { usePlayerPhoto } from "@/lib/usePlayerPhoto";
import { teamLogo } from "@/lib/baseball";

type SpotlightPlayer = {
  id: number;
  name: string;
  position?: string | null;
};

type SpotlightTeam = {
  id: string;
  name: string;
};

export default function SpotlightCard({
  player,
  team,
  badge,
  stats,
  className = "",
}: {
  player: SpotlightPlayer;
  team?: SpotlightTeam;
  badge: string;
  stats: [string, string][];
  className?: string;
}) {
  const photo = usePlayerPhoto(player);

  return (
    <Link
      href={`/players/${player.id}`}
      className={`group relative isolate flex flex-col overflow-hidden bg-[#0B1423] text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#D85F46] ${className}`}
    >
      {photo &&
        (photo.kind === "action" ? (
          <img
            src={photo.src}
            alt=""
            aria-hidden="true"
            className="absolute inset-0 h-full w-full object-cover object-[50%_22%] transition duration-700 group-hover:scale-[1.03]"
          />
        ) : (
          <img
            src={photo.src}
            alt=""
            aria-hidden="true"
            className="absolute bottom-0 right-[6%] h-[90%] w-auto object-contain transition duration-700 group-hover:scale-[1.03]"
          />
        ))}

      <div className="absolute inset-0 bg-gradient-to-t from-[#0B1423] via-[#0B1423]/55 to-[#0B1423]/5" />
      <div className="absolute inset-0 bg-gradient-to-r from-[#0B1423]/70 via-transparent to-transparent" />

      <div className="relative z-10 flex flex-1 flex-col justify-between p-6 md:p-8">
        <div className="flex items-start justify-between gap-4">
          <span className="bg-[#D85F46] px-3 py-1.5 text-[0.7rem] font-bold uppercase tracking-[0.14em]">
            {badge}
          </span>
          {team && (
            <img
              src={teamLogo(team.id)}
              alt=""
              aria-hidden="true"
              className="h-14 w-14 object-contain drop-shadow-lg"
            />
          )}
        </div>

        <div>
          <p className="text-[0.8rem] font-semibold uppercase tracking-[0.14em] text-[#59B3AD]">
            {team?.name ?? "Free Agent"}
            {player.position ? ` · ${player.position}` : ""}
          </p>

          <h3 className="mt-2 text-4xl font-black leading-[0.95] tracking-tight sm:text-5xl">
            {player.name}
          </h3>

          <div
            className="mt-6 grid gap-4 border-t border-white/20 pt-5"
            style={{ gridTemplateColumns: `repeat(${stats.length}, minmax(0, 1fr))` }}
          >
            {stats.map(([label, value]) => (
              <div key={label}>
                <p className="font-mono text-2xl font-bold sm:text-3xl">{value}</p>
                <p className="mt-1 text-[0.7rem] font-semibold uppercase tracking-[0.14em] text-[#59B3AD]">
                  {label}
                </p>
              </div>
            ))}
          </div>

          <div className="mt-5 flex items-center justify-between">
            <span className="text-sm font-semibold text-white/75 transition group-hover:text-white">
              View profile →
            </span>
            {photo?.credit && (
              <span className="text-[0.65rem] text-white/40">{photo.credit}</span>
            )}
          </div>
        </div>
      </div>

      <div className="absolute bottom-0 left-0 z-10 h-1 w-0 bg-[#D85F46] transition-all duration-300 group-hover:w-full" />
    </Link>
  );
}
