import { useRef, useEffect } from 'react';
import { Mesh, MeshStandardMaterial, PointLight } from 'three';
import { useFrame } from '@react-three/fiber';

interface PortalProps {
  isOpen: boolean;
  onPlayerEnter: () => void;
}

export function Portal({ isOpen, onPlayerEnter }: PortalProps) {
  const portalRef = useRef<Mesh>(null);
  const materialRef = useRef<MeshStandardMaterial>(null);
  const lightRef = useRef<PointLight>(null);

  // Animate portal
  useFrame(({ clock }) => {
    if (portalRef.current && materialRef.current && lightRef.current) {
      // Rotate portal
      portalRef.current.rotation.y += 0.02;
      
      // Pulse effect for material and light
      const time = clock.getElapsedTime();
      const pulse = Math.sin(time * 2) * 0.5 + 1.5;
      const slowPulse = Math.sin(time * 0.5) * 0.3 + 1.7;
      
      materialRef.current.emissiveIntensity = pulse;
      lightRef.current.intensity = slowPulse * 2;
    }
  });

  // Check for player collision
  useEffect(() => {
    if (!isOpen || !portalRef.current) return;

    const checkCollision = () => {
      if (!portalRef.current) return;
      
      // Get player position from the game state
      const playerPosition = window.gameState?.player?.position;
      if (!playerPosition) return;

      // Calculate distance between player and portal
      const dx = playerPosition.x - portalRef.current.position.x;
      const dy = playerPosition.y - portalRef.current.position.y;
      const dz = playerPosition.z - portalRef.current.position.z;
      const distance = Math.sqrt(dx * dx + dy * dy + dz * dz);

      // If player is within 2 units of portal, trigger escape
      if (distance < 2) {
        onPlayerEnter();
      }
    };

    const interval = setInterval(checkCollision, 100);
    return () => clearInterval(interval);
  }, [isOpen, onPlayerEnter]);

  if (!isOpen) return null;

  return (
    <group position={[15, 2, 0]} rotation={[Math.PI / 2, 0, 0]}>
      {/* Main portal disc */}
      <mesh ref={portalRef}>
        <cylinderGeometry args={[2, 2, 0.5, 32]} />
        <meshStandardMaterial
          ref={materialRef}
          color="#4466ff"
          emissive="#0033ff"
          emissiveIntensity={1.5}
          transparent
          opacity={0.9}
          metalness={0.5}
          roughness={0}
        />
      </mesh>

      {/* Inner glow disc */}
      <mesh position={[0, 0.1, 0]}>
        <cylinderGeometry args={[1.8, 1.8, 0.3, 32]} />
        <meshStandardMaterial
          color="#66aaff"
          emissive="#3366ff"
          emissiveIntensity={2}
          transparent
          opacity={0.7}
          metalness={0.8}
          roughness={0}
        />
      </mesh>

      {/* Portal light */}
      <pointLight
        ref={lightRef}
        color="#4466ff"
        intensity={2}
        distance={20}
        decay={2}
      />
    </group>
  );
} 