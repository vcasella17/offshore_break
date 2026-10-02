"use client";

import { useEffect, useState } from "react";
import { headshotSilo } from "@/lib/baseball";

export type Photo = {
  src: string;
  kind: "action" | "headshot";
  credit?: string;
};

const photoCache = new Map<number, Photo>();

/**
 * Looks for the best photo of a player, in this order:
 *  1. a file you uploaded: public/players/<mlbId>.jpg
 *  2. the lead photo from the player's Wikipedia article (free licence)
 *  3. MLB's transparent headshot
 */
export function usePlayerPhoto(player?: { id: number; name: string }): Photo | null {
  const [photo, setPhoto] = useState<Photo | null>(null);
  const id = player?.id;
  const name = player?.name;

  useEffect(() => {
    if (id == null || !name) {
      setPhoto(null);
      return;
    }

    const cached = photoCache.get(id);
    if (cached) {
      setPhoto(cached);
      return;
    }

    let cancelled = false;
    const fallback: Photo = { src: headshotSilo(id), kind: "headshot" };

    // show the headshot right away, then upgrade if something better exists
    setPhoto(fallback);

    (async () => {
      let result: Photo = fallback;

      const local = `/players/${id}.jpg`;
      const hasLocal = await new Promise<boolean>((resolve) => {
        const img = new Image();
        img.onload = () => resolve(true);
        img.onerror = () => resolve(false);
        img.src = local;
      });

      if (hasLocal) {
        result = { src: local, kind: "action" };
      } else {
        try {
          const title = encodeURIComponent(name.replace(/ /g, "_"));
          const res = await fetch(
            `https://en.wikipedia.org/api/rest_v1/page/summary/${title}`
          );

          if (res.ok) {
            const data = await res.json();
            const thumb: string | undefined = data?.thumbnail?.source;
            const isBaseball = /baseball/i.test(data?.description ?? "");

            if (data?.type === "standard" && isBaseball && thumb) {
              result = {
                src: thumb.replace(/\/\d+px-/, "/960px-"),
                kind: "action",
                credit: "Photo: Wikimedia Commons",
              };
            }
          }
        } catch {
          // keep the headshot
        }
      }

      photoCache.set(id, result);
      if (!cancelled) setPhoto(result);
    })();

    return () => {
      cancelled = true;
    };
  }, [id, name]);

  return photo;
}