import { useRef } from 'react';
import { Mesh, PointLight, Vector3 } from 'three';
import { useFrame } from '@react-three/fiber';

interface FloatingOrb {
  position: [number, number, number];
  color: string;
  intensity: number;
}

const orbs: FloatingOrb[] = [
  { position: [0, 8, 0], color: '#ff4444', intensity: 2.5 },      // Center red orb
  { position: [-8, 10, -8], color: '#ffaa44', intensity: 3 },     // Back left yellow-orange orb
  { position: [8, 9, -8], color: '#ff4444', intensity: 2.8 },     // Back right red orb
  { position: [-8, 11, 8], color: '#ff4444', intensity: 2.5 },    // Front left red orb
  { position: [8, 10, 8], color: '#ffaa44', intensity: 3 }        // Front right yellow-orange orb
];

export function Environment() {
  const floorRef = useRef<Mesh>(null);
  const orbRefs = useRef<Array<{ mesh: Mesh | null; light: PointLight | null }>>(
    orbs.map(() => ({ mesh: null, light: null }))
  );

  // Animate orbs
  useFrame(({ clock }) => {
    orbRefs.current.forEach((refs, index) => {
      if (refs.mesh && refs.light) {
        const time = clock.getElapsedTime() + index * Math.PI * 0.5;
        // Gentle floating motion
        refs.mesh.position.y = orbs[index].position[1] + Math.sin(time * 0.5) * 0.5;
        // Subtle circular motion
        refs.mesh.position.x = orbs[index].position[0] + Math.sin(time * 0.3) * 0.3;
        refs.mesh.position.z = orbs[index].position[2] + Math.cos(time * 0.3) * 0.3;
        // Light follows the orb
        refs.light.position.copy(refs.mesh.position);
      }
    });
  });

  return (
    <>
      {/* Floor */}
      <mesh 
        ref={floorRef} 
        rotation={[-Math.PI / 2, 0, 0]} 
        position={[0, 0, 0]} 
        receiveShadow
      >
        <planeGeometry args={[1000, 1000]} />
        <meshStandardMaterial color="#555555" roughness={0.8} metalness={0.2} />
      </mesh>

      {/* Columns */}
      {[
        [-5, 2.5, -5],
        [5, 2.5, -5],
        [-5, 2.5, 5],
        [5, 2.5, 5],
      ].map((position, index) => (
        <mesh key={index} position={position as [number, number, number]} castShadow receiveShadow>
          <cylinderGeometry args={[1, 1, 5]} />
          <meshStandardMaterial color="#888888" roughness={0.7} metalness={0.3} />
        </mesh>
      ))}

      {/* Floating Orbs */}
      {orbs.map((orb, index) => (
        <group key={index}>
          <mesh
            ref={el => orbRefs.current[index].mesh = el}
            position={orb.position}
          >
            <sphereGeometry args={[0.5, 32, 32]} />
            <meshStandardMaterial
              color={orb.color}
              emissive={orb.color}
              emissiveIntensity={2}
              toneMapped={false}
            />
          </mesh>
          <pointLight
            ref={el => orbRefs.current[index].light = el}
            position={orb.position}
            color={orb.color}
            intensity={orb.intensity}
            distance={30}
            decay={1.5}
            castShadow
            shadow-mapSize-width={512}
            shadow-mapSize-height={512}
            shadow-bias={-0.001}
          />
        </group>
      ))}

      {/* Ambient Lighting */}
      <ambientLight intensity={1.0} />
      
      {/* Main Directional Light */}
      <directionalLight
        position={[10, 10, 5]}
        intensity={0.8}
        castShadow
        shadow-mapSize-width={2048}
        shadow-mapSize-height={2048}
      />
    </>
  );
}