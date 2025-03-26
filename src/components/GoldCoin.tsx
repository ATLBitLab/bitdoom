import { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { Mesh, MeshStandardMaterial } from 'three';

interface GoldCoinProps {
  position: [number, number, number];
  value: number;
  onCollect: () => void;
}

export function GoldCoin({ position, value, onCollect }: GoldCoinProps) {
  const coinRef = useRef<Mesh>(null);
  const materialRef = useRef<MeshStandardMaterial>(null);

  // Animate coin
  useFrame(({ clock }) => {
    if (coinRef.current && materialRef.current) {
      // Rotate coin on X axis to show face
      coinRef.current.rotation.x = Math.PI / 2;
      // Gentle rotation on Y axis
      coinRef.current.rotation.y += 0.01;
      
      // Floating motion
      coinRef.current.position.y = position[1] + Math.sin(clock.getElapsedTime() * 2) * 0.2;
      
      // Shine effect
      materialRef.current.emissiveIntensity = Math.sin(clock.getElapsedTime() * 3) * 0.5 + 0.5;
    }
  });

  return (
    <mesh ref={coinRef} position={position}>
      <cylinderGeometry args={[0.15, 0.15, 0.025, 32]} />
      <meshStandardMaterial
        ref={materialRef}
        color="#FFD700"
        emissive="#FFA500"
        emissiveIntensity={1}
        metalness={0.8}
        roughness={0.2}
      />
    </mesh>
  );
} 