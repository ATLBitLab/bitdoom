import { useEffect, useState } from 'react';
import { useThree } from '@react-three/fiber';
import { Vector3, Euler, DoubleSide } from 'three';
import { Html } from '@react-three/drei';

interface PlayerState {
  id: string;
  position: Vector3;
  rotation: Euler;
  color: string;
  health: number;
  sats: number;
}

// Generate a random color for the player
const getRandomColor = () => {
  const colors = ['#FF0000', '#00FF00', '#0000FF', '#FFFF00', '#FF00FF', '#00FFFF'];
  return colors[Math.floor(Math.random() * colors.length)];
};

// Get or create persistent player ID
const getPlayerId = () => {
  const storedId = localStorage.getItem('playerId');
  if (storedId) return storedId;
  
  const newId = Math.random().toString(36).substring(7);
  localStorage.setItem('playerId', newId);
  return newId;
};

export function MultiplayerManager() {
  const [players, setPlayers] = useState<Record<string, PlayerState>>({});
  const [socket, setSocket] = useState<WebSocket | null>(null);
  const [myId, setMyId] = useState<string>('');
  const { camera } = useThree();

  // Handle projectile hits
  useEffect(() => {
    const handleProjectileHit = (event: CustomEvent) => {
      if (socket?.readyState === WebSocket.OPEN) {
        socket.send(JSON.stringify({
          type: 'hit',
          targetId: event.detail.targetId
        }));
      }
    };

    window.addEventListener('projectileHit', handleProjectileHit as EventListener);
    return () => window.removeEventListener('projectileHit', handleProjectileHit as EventListener);
  }, [socket]);

  useEffect(() => {
    const connectToServer = () => {
      const ws = new WebSocket('ws://localhost:8080');
      setSocket(ws);

      // Get persistent player ID
      const playerId = getPlayerId();
      setMyId(playerId);

      ws.onopen = () => {
        console.log('Connected to game server');
        // Send initial player state
        ws.send(JSON.stringify({
          type: 'join',
          id: playerId,
          color: getRandomColor(),
          health: 100,
          sats: 1000
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
          case 'playerHit':
            if (data.targetId === myId) {
              // We got hit!
              const event = new CustomEvent('playerDamaged', { 
                detail: { health: data.newHealth, sats: data.newSats } 
              });
              window.dispatchEvent(event);
            }
            break;
        }
      };

      ws.onclose = () => {
        console.log('Disconnected from game server');
        // Clean up old player data on disconnect
        setPlayers({});
        // Try to reconnect after a short delay
        setTimeout(connectToServer, 1000);
      };

      return ws;
    };

    const ws = connectToServer();

    return () => {
      ws.close();
    };
  }, []);

  // Send position updates
  useEffect(() => {
    if (!socket || !myId) return;

    const interval = setInterval(() => {
      if (socket.readyState === WebSocket.OPEN) {
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
      }
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
            position={[player.position.x, player.position.y - 1, player.position.z]}
            rotation={[0, player.rotation.y, 0]}
            userData={{ playerId: id }}
          >
            <planeGeometry args={[1, 2]} />
            <meshStandardMaterial color={player.color} side={DoubleSide} />
            
            {/* Health bar */}
            <Html position={[0, 1.2, 0]} center>
              <div className="w-20 h-1 bg-gray-800 rounded overflow-hidden">
                <div 
                  className="h-full bg-red-500 transition-all duration-300" 
                  style={{ width: `${player.health}%` }}
                />
              </div>
            </Html>
          </mesh>
        );
      })}
    </>
  );
} 