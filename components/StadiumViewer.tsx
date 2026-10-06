"use client";

import {
  Suspense,
  useCallback,
  useEffect,
  useRef,
  type ElementRef,
} from "react";
import { Canvas } from "@react-three/fiber";
import { CameraControls, Loader, useGLTF } from "@react-three/drei";
import * as THREE from "three";

type Vec3 = [number, number, number];

type Preset = {
  label: string;
  position: Vec3;
  target: Vec3;
};

const PRESETS: Preset[] = [
  { label: "Overview", position: [150, 110, 140], target: [0, 20, -50] },
  {
    label: "Behind home plate",
    position: [0, 12, 26],
    target: [0, 8, -90],
  },
  { label: "Upper deck", position: [0, 55, 42], target: [0, 0, -60] },
  { label: "Center field", position: [0, 12, -112], target: [0, 4, 0] },
  { label: "Overhead", position: [0, 240, -48], target: [0, 0, -52] },
];

function Stadium({ url }: { url: string }) {
  const { scene } = useGLTF(url);

  useEffect(() => {
    scene.traverse((object) => {
      const mesh = object as THREE.Mesh;
      if (!mesh.isMesh) return;

      const materials = Array.isArray(mesh.material)
        ? mesh.material
        : [mesh.material];

      materials.forEach((material) => {
        material.side = THREE.DoubleSide;
        material.needsUpdate = true;
      });
    });
  }, [scene]);

  return <primitive object={scene} />;
}

export default function StadiumViewer({
  modelUrl,
  className = "",
}: {
  modelUrl: string;
  className?: string;
}) {
  const controlsRef = useRef<ElementRef<typeof CameraControls> | null>(null);
  const placedStartView = useRef(false);

  const setControls = useCallback(
    (controls: ElementRef<typeof CameraControls> | null) => {
      controlsRef.current = controls;

      if (controls && !placedStartView.current) {
        placedStartView.current = true;
        const [first] = PRESETS;
        controls.setLookAt(...first.position, ...first.target, false);
      }
    },
    [],
  );

  function flyTo(preset: Preset) {
    controlsRef.current?.setLookAt(
      ...preset.position,
      ...preset.target,
      true,
    );
  }

  useEffect(() => {
    function onKey(event: KeyboardEvent) {
      if (event.key.toLowerCase() !== "p") return;

      const controls = controlsRef.current;
      if (!controls) return;

      const position = controls.getPosition(new THREE.Vector3());
      const target = controls.getTarget(new THREE.Vector3());
      const round = (n: number) => Math.round(n);

      console.log(
        `position: [${round(position.x)}, ${round(position.y)}, ${round(position.z)}], ` +
          `target: [${round(target.x)}, ${round(target.y)}, ${round(target.z)}]`,
      );
    }

    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  return (
    <div
      className={`relative overflow-hidden bg-[#0B1423] ${className}`}
    >
      <Canvas
        dpr={[1, 2]}
        camera={{
          fov: 50,
          near: 0.5,
          far: 2000,
          position: PRESETS[0].position,
        }}
      >
        <color attach="background" args={["#0B1423"]} />

        <ambientLight intensity={1.4} />
        <hemisphereLight args={["#ffffff", "#8a7a66", 0.8]} />
        <directionalLight position={[80, 160, 60]} intensity={1.6} />

        <Suspense fallback={null}>
          <Stadium url={modelUrl} />
        </Suspense>

        <CameraControls
          ref={setControls}
          makeDefault
          minDistance={4}
          maxDistance={600}
          maxPolarAngle={Math.PI / 2 - 0.02}
        />
      </Canvas>

      <Loader />

      <div className="absolute inset-x-0 bottom-0 z-10 flex flex-wrap gap-2 bg-gradient-to-t from-[#0B1423]/90 to-transparent p-4 pt-10">
        {PRESETS.map((preset) => (
          <button
            key={preset.label}
            type="button"
            onClick={() => flyTo(preset)}
            className="border border-white/25 bg-[#0B1423]/70 px-4 py-2 text-sm font-semibold text-white backdrop-blur transition hover:border-[#D85F46] hover:bg-[#D85F46]"
          >
            {preset.label}
          </button>
        ))}
      </div>

      <p className="pointer-events-none absolute right-4 top-4 z-10 hidden text-right text-[0.75rem] font-semibold uppercase tracking-[0.14em] text-[#59B3AD] md:block">
        Drag to rotate · Scroll to zoom · Right-drag to pan
      </p>
    </div>
  );
}