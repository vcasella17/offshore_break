"use client";

import { useState } from "react";
import { teamLogo } from "@/lib/baseball";
import {
  getPlayerHeadshot,
  getPlayerPhoto,
  type PhotoAction,
  type PhotoContext,
} from "@/lib/playerPhotos";

/*
 * lib/playerPhotos.ts has two related types:
 *   PhotoAction  = "swing" | "pitching" | ...   (what a card asks for)
 *   PhotoContext = "batting" | "pitching" | ...  (what getPlayerPhoto wants)
 * This map turns one into the other so the rest of the site only
 * has to say "swing" or "pitching".
 */
const CONTEXT_FOR_ACTION: Record<PhotoAction, PhotoContext> = {
  swing: "batting",
  pitching: "pitching",
  fielding: "fielding",
  baserunning: "baserunning",
  general: "general",
};

const ALT_TEXT: Record<PhotoAction, string> = {
  swing: "batting in game action",
  pitching: "pitching in game action",
  fielding: "fielding in game action",
  baserunning: "running the bases in game action",
  general: "in game action",
};

type Stage = "action" | "headshot" | "none";

/**
 * Fills its parent (which must be position: relative).
 *
 * Not every player has an MLB action photo, and MLB can change its image
 * addresses at any time. So this tries the action photo first, then the
 * headshot, then falls back to a faint team logo. Nobody ever sees a
 * broken-image icon.
 */
export default function PlayerActionPhoto({
  playerId,
  playerName,
  action = "swing",
  teamId,
}: {
  playerId: number;
  playerName: string;
  action?: PhotoAction;
  teamId?: string;
}) {
  const [stage, setStage] = useState<Stage>("action");

  if (stage === "none") {
    return teamId ? (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={teamLogo(teamId)}
        alt=""
        aria-hidden="true"
        className="absolute left-1/2 top-1/2 h-[70%] w-auto -translate-x-1/2 -translate-y-1/2 object-contain opacity-[0.12]"
      />
    ) : null;
  }

  const photo =
    stage === "headshot"
      ? getPlayerHeadshot(playerId)
      : getPlayerPhoto(playerId, CONTEXT_FOR_ACTION[action]);

  const next: Stage = stage === "action" ? "headshot" : "none";

  // move on once, even if the browser reports the failure twice
  const failed = () =>
    setStage((current) => (current === stage ? next : current));

  return (
    <>
      {/* blurred copy fills any leftover space around the photo */}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={photo.src}
        alt=""
        aria-hidden="true"
        onError={failed}
        className="absolute inset-0 h-full w-full scale-125 object-cover opacity-40 blur-2xl"
      />

      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        key={photo.src}
        src={photo.src}
        alt={`${playerName} ${
          stage === "headshot" ? "headshot" : ALT_TEXT[photo.action]
        }`}
        onError={failed}
        // covers an image that already failed before the page finished loading
        ref={(img) => {
          if (img && img.complete && img.naturalWidth === 0) failed();
        }}
        className="absolute inset-0 h-full w-full object-contain transition duration-700 group-hover:scale-[1.02]"
      />

      {photo.credit && (
        <span className="absolute bottom-2 right-3 z-10 text-[0.65rem] text-white/40">
          Photo: {photo.credit}
        </span>
      )}
    </>
  );
}