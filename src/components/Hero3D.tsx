import { Suspense, useRef } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { Float, OrbitControls } from '@react-three/drei';
import * as THREE from 'three';

function ConsoleModel() {
  const group = useRef<THREE.Group>(null!);

  useFrame((_, delta) => {
    group.current.rotation.y += delta * 0.08;
    group.current.rotation.x = Math.sin(Date.now() * 0.0006) * 0.04;
  });

  return (
    <group ref={group} rotation={[0.08, -0.42, 0]} position={[1.55, -0.05, -0.2]}>
      <mesh position={[0, 0, 0]}>
        <boxGeometry args={[3.8, 2.35, 0.18]} />
        <meshStandardMaterial color="#111827" roughness={0.32} metalness={0.45} />
      </mesh>
      <mesh position={[0, 0, 0.105]}>
        <boxGeometry args={[3.45, 1.95, 0.035]} />
        <meshStandardMaterial color="#f8fafc" roughness={0.55} metalness={0.08} />
      </mesh>

      {[-1.25, -0.45, 0.35, 1.15].map((x, i) => (
        <mesh key={x} position={[x, 0.52, 0.16]}>
          <boxGeometry args={[0.46, 0.28 + i * 0.1, 0.05]} />
          <meshStandardMaterial color={i % 2 ? '#f97316' : '#4f46e5'} roughness={0.35} metalness={0.2} />
        </mesh>
      ))}

      {Array.from({ length: 20 }).map((_, i) => {
        const row = Math.floor(i / 5);
        const col = i % 5;
        const color = i % 7 === 0 ? '#f97316' : i % 3 === 0 ? '#16a34a' : '#4f46e5';
        return (
          <mesh key={i} position={[-1.32 + col * 0.48, -0.52 - row * 0.28, 0.17]}>
            <circleGeometry args={[0.085, 28]} />
            <meshStandardMaterial color={color} roughness={0.45} metalness={0.1} />
          </mesh>
        );
      })}

      <mesh position={[1.15, 0.72, 0.18]}>
        <torusGeometry args={[0.24, 0.018, 16, 64]} />
        <meshStandardMaterial color="#4f46e5" roughness={0.25} metalness={0.35} />
      </mesh>
      <mesh position={[1.15, 0.72, 0.205]} rotation={[0, 0, -0.85]}>
        <boxGeometry args={[0.02, 0.22, 0.02]} />
        <meshStandardMaterial color="#111827" />
      </mesh>

      <mesh position={[0.9, -0.98, -0.22]} rotation={[0.3, 0.1, 0]}>
        <boxGeometry args={[2.7, 0.08, 0.7]} />
        <meshStandardMaterial color="#0f172a" roughness={0.4} metalness={0.65} />
      </mesh>
    </group>
  );
}

function OrbitingDots() {
  const ref = useRef<THREE.Group>(null!);
  useFrame((_, delta) => { ref.current.rotation.z += delta * 0.12; });
  return (
    <group ref={ref} position={[1.45, -0.05, -0.7]}>
      {Array.from({ length: 18 }).map((_, i) => {
        const angle = (i / 18) * Math.PI * 2;
        const radius = 2.45 + (i % 2) * 0.22;
        return (
          <mesh key={i} position={[Math.cos(angle) * radius, Math.sin(angle) * radius * 0.58, 0]}>
            <sphereGeometry args={[0.025 + (i % 3) * 0.01, 12, 12]} />
            <meshStandardMaterial color={i % 4 === 0 ? '#f97316' : '#4f46e5'} emissive={i % 4 === 0 ? '#f97316' : '#4f46e5'} emissiveIntensity={0.18} />
          </mesh>
        );
      })}
    </group>
  );
}

export const Hero3D = () => {
  return (
    <div className="absolute inset-0 -z-10 pointer-events-none opacity-80">
      <Canvas dpr={[1, 1.5]} camera={{ position: [0, 0, 6.2], fov: 42 }} gl={{ antialias: true, alpha: true }}>
        <ambientLight intensity={0.82} />
        <directionalLight position={[3, 4, 5]} intensity={1.2} color="#ffffff" />
        <pointLight position={[4, 1, 3]} intensity={0.75} color="#f97316" />
        <pointLight position={[-4, -2, 2]} intensity={0.55} color="#4f46e5" />
        <Suspense fallback={null}>
          <Float speed={0.85} rotationIntensity={0.18} floatIntensity={0.45}>
            <ConsoleModel />
          </Float>
          <OrbitingDots />
        </Suspense>
        <OrbitControls enableZoom={false} enablePan={false} enableRotate={false} />
      </Canvas>
      <div className="absolute inset-0 bg-gradient-to-r from-background via-background/55 to-background/10" />
    </div>
  );
};