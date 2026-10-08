import {
  contextForPlayer,
  type PhotoContext,
} from "@/lib/playerPhotos";

export function getPhotoContextForPlayer(
  position?: string | null,
  statKey?: string | null
): PhotoContext {
  return contextForPlayer({
    position,
    statKey,
  });
}