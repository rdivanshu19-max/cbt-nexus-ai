import { Suspense, useRef } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { Float, Icosahedron, MeshDistortMaterial, Sparkles, Stars, OrbitControls } from '@react-three/drei';
import * as THREE from 'three';

function Knot() {
  const ref = useRef<THREE.Mesh>(null!);
  useFrame((_, delta) => {
    ref.current.rotation.x += delta * 0.15;
    ref.current.rotation.y += delta * 0.2;
  });
  return (
    <mesh ref={ref} scale={1.15}>
      <torusKnotGeometry args={[1, 0.32, 220, 32]} />
      <MeshDistortMaterial
        color="#10b981"
        emissive="#0ea5a5"
        emissiveIntensity={0.55}
        roughness={0.18}
        metalness={0.85}
        distort={0.32}
        speed={1.4}
      />
    </mesh>
  );
}

function FloatingShard({ position, color }: { position: [number, number, number]; color: string }) {
  return (
    <Float speed={2} rotationIntensity={1.2} floatIntensity={1.6}>
      <Icosahedron args={[0.42, 0]} position={position}>
        <meshStandardMaterial color={color} emissive={color} emissiveIntensity={0.4} roughness={0.2} metalness={0.7} />
      </Icosahedron>
    </Float>
  );
}

export const Hero3D = () => {
  return (
    <div className="absolute inset-0 -z-10">
      <Canvas
        dpr={[1, 1.6]}
        camera={{ position: [0, 0, 5], fov: 50 }}
        gl={{ antialias: true, alpha: true }}
      >
        <color attach="background" args={[0, 0, 0]} />
        <ambientLight intensity={0.45} />
        <pointLight position={[5, 5, 5]} intensity={1.4} color="#34d399" />
        <pointLight position={[-5, -3, -3]} intensity={1.0} color="#22d3ee" />
        <Suspense fallback={null}>
          <Float speed={1.2} rotationIntensity={0.6} floatIntensity={1.1}>
            <Knot />
          </Float>
          <FloatingShard position={[-2.6, 1.4, -1]} color="#22d3ee" />
          <FloatingShard position={[2.4, -1.2, -0.5]} color="#10b981" />
          <FloatingShard position={[1.8, 1.6, -2]} color="#06b6d4" />
          <Sparkles count={70} scale={[8, 5, 4]} size={3} speed={0.5} color="#5eead4" />
          <Stars radius={45} depth={40} count={1500} factor={3} fade speed={0.6} />
        </Suspense>
        <OrbitControls enableZoom={false} enablePan={false} autoRotate autoRotateSpeed={0.8} enableRotate={false} />
      </Canvas>
      {/* soft vignette so foreground text remains readable */}
      <div className="absolute inset-0 bg-gradient-to-b from-background/30 via-background/10 to-background pointer-events-none" />
    </div>
  );
};
