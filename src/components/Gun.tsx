import { useRef, useState, useEffect } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import { Vector3, Mesh, SphereGeometry, MeshBasicMaterial } from 'three';

interface Projectile {
  mesh: Mesh;
  velocity: Vector3;
  createdAt: number;
}

export function Gun() {
  const gunRef = useRef<Mesh>(null);
  const [projectiles, setProjectiles] = useState<Projectile[]>([]);
  const { scene, camera } = useThree();
  const PROJECTILE_SPEED = 50;
  const PROJECTILE_LIFETIME = 3000; // 3 seconds

  useEffect(() => {
    const handleShoot = () => {
      if (!document.pointerLockElement) return;

      // Create projectile
      const projectileMesh = new Mesh(
        new SphereGeometry(0.1),
        new MeshBasicMaterial({ color: '#ff0000' })
      );

      // Set initial position at camera position
      projectileMesh.position.copy(camera.position);

      // Calculate direction from camera rotation
      const direction = new Vector3(0, 0, -1);
      direction.applyQuaternion(camera.quaternion);

      // Create velocity vector
      const velocity = direction.multiplyScalar(PROJECTILE_SPEED);

      // Add to scene and projectiles list
      scene.add(projectileMesh);
      setProjectiles(prev => [...prev, {
        mesh: projectileMesh,
        velocity: velocity,
        createdAt: Date.now()
      }]);
    };

    document.addEventListener('mousedown', handleShoot);
    return () => document.removeEventListener('mousedown', handleShoot);
  }, [camera, scene]);

  // Update projectiles
  useFrame(() => {
    const now = Date.now();
    setProjectiles(prev => {
      const remaining = prev.filter(projectile => {
        // Remove old projectiles
        if (now - projectile.createdAt > PROJECTILE_LIFETIME) {
          scene.remove(projectile.mesh);
          return false;
        }

        // Update position
        projectile.mesh.position.add(projectile.velocity.clone().multiplyScalar(1/60));
        return true;
      });

      return remaining;
    });
  });

  // Gun model (simple box for now)
  return (
    <mesh
      ref={gunRef}
      position={[0.3, -0.2, -0.5]} // Offset from camera
      rotation={[0, Math.PI, 0]} // Point forward
      scale={[0.1, 0.1, 0.3]} // Make it gun-shaped
    >
      <boxGeometry />
      <meshStandardMaterial color="#444444" />
    </mesh>
  );
} 