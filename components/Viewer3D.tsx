"use client";

import { Suspense } from "react";
import { Canvas } from "@react-three/fiber";
import { OrbitControls, Stage, useGLTF } from "@react-three/drei";

function Model({ url }: { url: string }) {
  const { scene } = useGLTF(url);
  return <primitive object={scene} />;
}

export default function Viewer3D({ meshUrl }: { meshUrl: string }) {
  return (
    <div className="w-full h-full">
      <Canvas camera={{ position: [0, 0, 4], fov: 45 }}>
        <Suspense fallback={null}>
          <Stage environment="city" intensity={0.6}>
            <Model url={meshUrl} />
          </Stage>
        </Suspense>
        <OrbitControls autoRotate autoRotateSpeed={1.2} enablePan={false} />
      </Canvas>
    </div>
  );
}
