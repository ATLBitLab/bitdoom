import { useRef, useEffect } from 'react';
import { Mesh, MeshStandardMaterial, PointLight, Vector3 } from 'three';
import { useFrame } from '@react-three/fiber';

interface PortalProps {
  isOpen: boolean;
  onPlayerEnter: () => void;
}

// Random position for the portal, outside the column area
const portalPosition = new Vector3(
  (Math.random() < 0.5 ? -1 : 1) * (Math.random() * 5 + 12), // X: ±(12-17) units from center
  2, // Y: At player height
  (Math.random() < 0.5 ? -1 : 1) * (Math.random() * 5 + 12)  // Z: ±(12-17) units from center
);

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

      // Gentle hovering motion
      portalRef.current.position.y = 2 + Math.sin(time * 0.5) * 0.2; // Hover between 1.8 and 2.2 units
    }
  });

  // Check for player collision
  useEffect(() => {
    if (!isOpen) return;

    const checkCollision = () => {
      // Get player position from the game state
      const playerPosition = window.gameState?.player?.position;
      if (!playerPosition) {
        console.log('No player position found in gameState');
        return;
      }

      // Calculate distance between player and portal center
      const dx = playerPosition.x - portalPosition.x;
      const dy = playerPosition.y - portalPosition.y;
      const dz = playerPosition.z - portalPosition.z;
      const distance = Math.sqrt(dx * dx + dy * dy + dz * dz);

      // Debug log
      console.log('Distance to portal:', distance);
      console.log('Player position:', playerPosition);
      console.log('Portal position:', portalPosition);

      // If player is within 3 units of portal, trigger escape
      if (distance < 3) {
        console.log('Player entered portal! Triggering escape...');
        onPlayerEnter();
      }
    };

    const interval = setInterval(checkCollision, 100);
    return () => clearInterval(interval);
  }, [isOpen, onPlayerEnter]);

  if (!isOpen) return null;

  return (
    <group position={[portalPosition.x, portalPosition.y, portalPosition.z]} rotation={[Math.PI / 2, 0, 0]}>
      {/* Main portal disc */}
      <mesh ref={portalRef}>
        <cylinderGeometry args={[2, 2, 0.1, 32]} />
        <meshStandardMaterial
          ref={materialRef}
          color="#4466ff"
          emissive="#0033ff"
          emissiveIntensity={2}
          transparent
          opacity={0.9}
          metalness={0.8}
          roughness={0.2}
        />
      </mesh>

      {/* Inner glow disc */}
      <mesh position={[0, 0.05, 0]}>
        <cylinderGeometry args={[1.8, 1.8, 0.2, 32]} />
        <meshStandardMaterial
          color="#66aaff"
          emissive="#3366ff"
          emissiveIntensity={3}
          transparent
          opacity={0.7}
          metalness={0.8}
          roughness={0.2}
        />
      </mesh>

      {/* Portal light */}
      <pointLight
        ref={lightRef}
        color="#4466ff"
        intensity={5}
        distance={20}
        decay={2}
      />
    </group>
  );
} 