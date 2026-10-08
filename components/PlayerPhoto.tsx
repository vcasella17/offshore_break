"use client";

import { useState } from "react";
import {
  getPlayerPhoto,
  getPlayerHeadshot,
  type PhotoContext,
} from "@/lib/playerPhotos";

type PlayerPhotoProps = {
  playerId: number;
  playerName: string;
  context?: PhotoContext;

  className?: string;

  /**
   * How the image should fit inside its container.
   *
   * "cover" is best for hero cards.
   * "contain" is useful when you want to preserve more of the player.
   */
  objectFit?: "cover" | "contain";

  /**
   * Optional focal point.
   */
  objectPosition?: string;

  priority?: boolean;
};

export default function PlayerPhoto({
  playerId,
  playerName,
  context = "general",
  className = "",
  objectFit = "cover",
  objectPosition = "center",
  priority = false,
}: PlayerPhotoProps) {
  const actionPhoto = getPlayerPhoto(playerId, context);
  const fallbackPhoto = getPlayerHeadshot(playerId);

  const [src, setSrc] = useState(actionPhoto.src);
  const [usedFallback, setUsedFallback] = useState(false);

  function handleError() {
    if (!usedFallback) {
      setUsedFallback(true);
      setSrc(fallbackPhoto.src);
    }
  }

  return (
    <img
      src={src}
      alt={`${playerName} action photo`}
      className={className}
      onError={handleError}
      loading={priority ? "eager" : "lazy"}
      fetchPriority={priority ? "high" : "auto"}
      style={{
        width: "100%",
        height: "100%",
        objectFit,
        objectPosition,
        display: "block",
      }}
    />
  );
}