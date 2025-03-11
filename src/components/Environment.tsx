import { useRef } from 'react';
import { Mesh } from 'three';

export function Environment() {
  const floorRef = useRef<Mesh>(null);

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
        <meshStandardMaterial color="#333333" />
      </mesh>

      {/* Columns */}
      {[
        [-5, 2.5, -5],
        [5, 2.5, -5],
        [-5, 2.5, 5],
        [5, 2.5, 5],
      ].map((position, index) => (
        <mesh key={index} position={position} castShadow receiveShadow>
          <cylinderGeometry args={[1, 1, 5]} />
          <meshStandardMaterial color="#666666" />
        </mesh>
      ))}

      {/* Lighting */}
      <ambientLight intensity={0.2} />
      <directionalLight
        position={[10, 10, 5]}
        intensity={1}
        castShadow
        shadow-mapSize-width={2048}
        shadow-mapSize-height={2048}
      />
    </>
  );
}