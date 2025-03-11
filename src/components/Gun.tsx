import { useRef, useState, useEffect } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import { Vector3, Mesh, SphereGeometry, MeshBasicMaterial, Raycaster } from 'three';
import { emitHit } from '../socket';

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
  const raycaster = new Raycaster();

  // Handle projectile hit event
  useEffect(() => {
    const handleProjectileHit = (event: CustomEvent) => {
      // Use the centralized socket connection
      emitHit(event.detail.targetId);
    };

    window.addEventListener('projectileHit', handleProjectileHit as EventListener);
    return () => window.removeEventListener('projectileHit', handleProjectileHit as EventListener);
  }, []);

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

  // Handle respawn event
  useEffect(() => {
    const handleRespawn = () => {
      // Reset player position
      if (camera) {
        camera.position.set(0, 2, 0);
      }
    };

    window.addEventListener('playerRespawn', handleRespawn);
    return () => window.removeEventListener('playerRespawn', handleRespawn);
  }, [camera]);

  // Update projectiles and check collisions
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
        const movement = projectile.velocity.clone().multiplyScalar(1/60);
        projectile.mesh.position.add(movement);

        // Check for collisions with other players
        raycaster.set(projectile.mesh.position, projectile.velocity.clone().normalize());
        const intersects = raycaster.intersectObjects(scene.children, true);
        
        for (const intersect of intersects) {
          // Find the root mesh (the player mesh)
          let currentObject = intersect.object;
          while (currentObject.parent && !currentObject.userData.playerId) {
            currentObject = currentObject.parent;
          }

          // Check if we hit a player
          if (currentObject.userData.playerId && intersect.distance < 0.5) {
            // Remove the projectile
            scene.remove(projectile.mesh);
            
            // Send hit event
            const event = new CustomEvent('projectileHit', {
              detail: { targetId: currentObject.userData.playerId }
            });
            window.dispatchEvent(event);
            
            return false;
          }
        }

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