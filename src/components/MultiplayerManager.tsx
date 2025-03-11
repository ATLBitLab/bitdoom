import { useEffect, useState } from 'react';
import { useThree } from '@react-three/fiber';
import { Vector3, Euler } from 'three';

interface PlayerState {
  id: string;
  position: Vector3;
  rotation: Euler;
  color: string;
}

// Generate a random color for the player
const getRandomColor = () => {
  const colors = ['#FF0000', '#00FF00', '#0000FF', '#FFFF00', '#FF00FF', '#00FFFF'];
  return colors[Math.floor(Math.random() * colors.length)];
};

export function MultiplayerManager() {
  const [players, setPlayers] = useState<Record<string, PlayerState>>({});
  const [socket, setSocket] = useState<WebSocket | null>(null);
  const [myId, setMyId] = useState<string>('');
  const { camera } = useThree();

  useEffect(() => {
    // Connect to WebSocket server
    const ws = new WebSocket('ws://localhost:8080');
    setSocket(ws);

    // Generate a random ID for this player
    const playerId = Math.random().toString(36).substring(7);
    setMyId(playerId);

    // Handle WebSocket events
    ws.onopen = () => {
      console.log('Connected to game server');
      // Send initial player state
      ws.send(JSON.stringify({
        type: 'join',
        id: playerId,
        color: getRandomColor()
      }));
    };

    ws.onmessage = (event) => {
      const data = JSON.parse(event.data);
      switch (data.type) {
        case 'players':
          setPlayers(data.players);
          break;
        case 'playerJoined':
          setPlayers(prev => ({
            ...prev,
            [data.player.id]: data.player
          }));
          break;
        case 'playerLeft':
          setPlayers(prev => {
            const newPlayers = { ...prev };
            delete newPlayers[data.id];
            return newPlayers;
          });
          break;
      }
    };

    ws.onclose = () => {
      console.log('Disconnected from game server');
    };

    // Cleanup
    return () => {
      ws.close();
    };
  }, []);

  // Send position updates
  useEffect(() => {
    if (!socket || !myId) return;

    const interval = setInterval(() => {
      socket.send(JSON.stringify({
        type: 'update',
        id: myId,
        position: {
          x: camera.position.x,
          y: camera.position.y,
          z: camera.position.z
        },
        rotation: {
          x: camera.rotation.x,
          y: camera.rotation.y,
          z: camera.rotation.z
        }
      }));
    }, 50); // Send updates 20 times per second

    return () => clearInterval(interval);
  }, [socket, myId, camera]);

  // Render other players
  return (
    <>
      {Object.entries(players).map(([id, player]) => {
        if (id === myId) return null; // Don't render self
        return (
          <mesh
            key={id}
            position={[player.position.x, player.position.y - 1, player.position.z]} // Offset Y to show player at feet level
            rotation={[0, player.rotation.y, 0]} // Only use Y rotation for player model
          >
            <planeGeometry args={[1, 2]} /> {/* 1 unit wide, 2 units tall plane */}
            <meshStandardMaterial color={player.color} />
          </mesh>
        );
      })}
    </>
  );
} 