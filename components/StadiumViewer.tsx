"use client";

import {
  Component,
  Suspense,
  useCallback,
  useEffect,
  useRef,
  type ComponentRef,
  type ReactNode,
} from "react";
import { Canvas } from "@react-three/fiber";
import { CameraControls, Loader, useGLTF } from "@react-three/drei";
import * as THREE from "three";

/*
 * COORDINATES (measured from the Toronto model, in meters)
 * - Home plate is at the origin (0, 0, 0)
 * - y is up
 * - The outfield runs toward NEGATIVE z (center field is about z = -122)
 * - Left/right field are along x
 */

type Vec3 = [number, number, number];

type Preset = {
  label: string;
  position: Vec3;
  target: Vec3;
};

const PRESETS: Preset[] = [
  { label: "Overview", position: [150, 110, 140], target: [0, 20, -50] },
  { label: "Behind home plate", position: [0, 12, 26], target: [0, 8, -90] },
  { label: "Upper deck", position: [0, 55, 42], target: [0, 0, -60] },
  { label: "Center field", position: [0, 12, -112], target: [0, 4, 0] },
  { label: "Overhead", position: [0, 240, -48], target: [0, 0, -52] },
];

type Controls = ComponentRef<typeof CameraControls>;

/* Shows a message if the 3D model fails to load, instead of crashing the page */
class ModelErrorBoundary extends Component<
  { children: ReactNode },
  { failed: boolean }
> {
  state = { failed: false };

  static getDerivedStateFromError() {
    return { failed: true };
  }

  componentDidCatch(error: unknown) {
    console.error("Stadium model failed to load:", error);
  }

  render() {
    if (this.state.failed) {
      return (
        <div className="absolute inset-0 flex items-center justify-center p-8 text-center">
          <div>
            <p className="font-mono text-[0.75rem] font-bold uppercase tracking-[0.2em] text-[#59B3AD]">
              Model unavailable
            </p>
            <p className="mx-auto mt-3 max-w-sm text-sm leading-6 text-white/70">
              This ballpark’s 3D model couldn’t be loaded. Refresh the page, or
              check that the .glb file exists in public/stadiums.
            </p>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

function Stadium({ url }: { url: string }) {
  const { scene } = useGLTF(url);

  // Show both sides of every surface so the walls never look see-through
  // when the camera is inside the stands.
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
  /** e.g. "/stadiums/TOR.glb" */
  modelUrl: string;
  className?: string;
}) {
  const controlsRef = useRef<Controls | null>(null);
  const placedStartView = useRef(false);

  // Runs when the camera controls first exist: put the camera at "Overview".
  const setControls = useCallback((controls: Controls | null) => {
    controlsRef.current = controls;

    if (controls && !placedStartView.current) {
      placedStartView.current = true;
      const [first] = PRESETS;
      controls.setLookAt(...first.position, ...first.target, false);
    }
  }, []);

  function flyTo(preset: Preset) {
    controlsRef.current?.setLookAt(...preset.position, ...preset.target, true);
  }

  // Tuning tool: press "P" to print the current camera position in the
  // browser console, so you can create your own presets.
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
    <div className={`relative overflow-hidden bg-[#0B1423] ${className}`}>
      <ModelErrorBoundary>
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

        {/* Shows a progress bar while the model downloads */}
        <Loader />

        {/* Camera presets */}
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
      </ModelErrorBoundary>
    </div>
  );
}
