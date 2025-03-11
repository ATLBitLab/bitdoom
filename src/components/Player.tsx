import { useRef, useEffect } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import { useKeyboardControls } from '@react-three/drei';
import { Vector3, Euler, MathUtils } from 'three';
import { Gun } from './Gun';

export function Player() {
  const playerRef = useRef<any>();
  const velocity = useRef(new Vector3());
  const direction = useRef(new Vector3());
  const frontVector = useRef(new Vector3());
  const sideVector = useRef(new Vector3());
  const rotation = useRef(new Euler(0, 0, 0, 'YXZ'));
  const speed = 5;
  const mouseSensitivity = 0.002;
  const jumpForce = 8;
  const gravity = 20;
  const isGrounded = useRef(true);

  // Set up keyboard controls
  const [, getKeys] = useKeyboardControls();
  const { camera } = useThree();

  useEffect(() => {
    const canvas = document.querySelector('canvas');
    if (!canvas) return;

    const lockPointer = () => {
      canvas.requestPointerLock();
    };

    canvas.addEventListener('click', lockPointer);
    return () => canvas.removeEventListener('click', lockPointer);
  }, []);

  useEffect(() => {
    const handleMouseMove = (event: MouseEvent) => {
      if (document.pointerLockElement) {
        rotation.current.y -= event.movementX * mouseSensitivity;
        rotation.current.x = MathUtils.clamp(
          rotation.current.x - event.movementY * mouseSensitivity,
          -Math.PI / 2,
          Math.PI / 2
        );
        rotation.current.z = 0;
      }
    };

    document.addEventListener('mousemove', handleMouseMove);
    return () => document.removeEventListener('mousemove', handleMouseMove);
  }, []);

  useFrame((state, delta) => {
    if (!playerRef.current) return;

    // Get current key states
    const { forward, backward, left, right, jump } = getKeys();

    // Handle jumping
    if (jump && isGrounded.current) {
      velocity.current.y = jumpForce;
      isGrounded.current = false;
    }

    // Apply gravity
    velocity.current.y -= gravity * delta;

    // Calculate movement direction based on Y rotation only
    const angle = rotation.current.y;
    frontVector.current.set(
      Math.sin(angle),
      0,
      Math.cos(angle)
    ).multiplyScalar(Number(backward) - Number(forward));
    
    sideVector.current.set(
      Math.cos(angle),
      0,
      -Math.sin(angle)
    ).multiplyScalar(Number(left) - Number(right));

    direction.current
      .subVectors(frontVector.current, sideVector.current)
      .normalize()
      .multiplyScalar(speed * delta);

    // Update player position
    playerRef.current.position.x += direction.current.x;
    playerRef.current.position.z += direction.current.z;
    playerRef.current.position.y += velocity.current.y * delta;

    // Ground check and collision
    if (playerRef.current.position.y < 2) { // 2 is the initial height
      playerRef.current.position.y = 2;
      velocity.current.y = 0;
      isGrounded.current = true;
    }

    // Update camera position and rotation
    camera.position.copy(playerRef.current.position);
    camera.rotation.copy(rotation.current);
  });

  return (
    <>
      <mesh ref={playerRef} position={[0, 2, 0]}>
        <capsuleGeometry args={[0.5, 1, 4]} />
        <meshStandardMaterial color="blue" opacity={0} transparent />
      </mesh>
      <Gun />
    </>
  );
}