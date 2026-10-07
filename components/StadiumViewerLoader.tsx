"use client";

import dynamic from "next/dynamic";

/*
 * Loads the 3D viewer only in the browser. Three.js never runs on the
 * server, which keeps the dev server light and avoids server-side errors.
 */
const Viewer = dynamic(() => import("./StadiumViewer"), {
  ssr: false,
  loading: () => (
    <div className="flex h-[75vh] min-h-[30rem] w-full items-center justify-center bg-[#0B1423] font-mono text-xs font-bold uppercase tracking-[0.2em] text-[#59B3AD]">
      Loading ballpark…
    </div>
  ),
});

export default function StadiumViewerLoader({
  modelUrl,
}: {
  modelUrl: string;
}) {
  return (
    <Viewer modelUrl={modelUrl} className="h-[75vh] min-h-[30rem] w-full" />
  );
}
