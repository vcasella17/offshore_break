"use client";

import { Canvas } from "@react-three/fiber";
import { Bounds, Center, OrbitControls, useGLTF } from "@react-three/drei";
import { Suspense } from "react";

function StadiumModel({ abbreviation }: { abbreviation: string }) {
  const { scene } = useGLTF(`/stadiums/${abbreviation}.glb`);

  return (
    <Bounds fit clip observe margin={1.2}>
      <Center>
        <primitive object={scene} />
      </Center>
    </Bounds>
  );
}

export default function StadiumViewer({
  abbreviation,
}: {
  abbreviation: string;
}) {
  return (
    <div className="h-[65vh] min-h-[420px] w-full overflow-hidden bg-[#e8e1d5]">
      <Canvas camera={{ position: [0, 8, 14], fov: 45 }}>
        <color attach="background" args={["#e8e1d5"]} />
        <ambientLight intensity={1.5} />
        <directionalLight position={[10, 15, 10]} intensity={2} />

        <Suspense fallback={null}>
          <StadiumModel abbreviation={abbreviation} />
        </Suspense>

        <OrbitControls
          makeDefault
          enableDamping
          minDistance={3}
          maxDistance={80}
          maxPolarAngle={Math.PI / 2}
        />
      </Canvas>
    </div>
  );
}