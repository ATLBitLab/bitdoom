import { useEffect, useState } from 'react';
import { useThree } from '@react-three/fiber';
import { Vector3, Euler, DoubleSide, TextureLoader } from 'three';
import { Html } from '@react-three/drei';
import { socket } from '../socket';

interface PlayerState {
  id: string;
  position: Vector3;
  rotation: Euler;
  color: string;
  health: number;
  sats: number;
}

interface PlayersEventData {
  players: Record<string, PlayerState>;
}

interface PlayerJoinedEventData {
  player: PlayerState;
}

interface PlayerLeftEventData {
  id: string;
}

// Load textures once outside component to avoid reloading
const textureLoader = new TextureLoader();
const frontTexture = textureLoader.load('/player-front.png');
const backTexture = textureLoader.load('/player-back.png');

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
  const [myId, setMyId] = useState<string>('');
  const { camera } = useThree();

  useEffect(() => {
    // Get persistent player ID
    const playerId = getPlayerId();
    setMyId(playerId);

    // Send initial player state
    socket.emit('join', {
      id: playerId,
      color: getRandomColor(),
      health: 100,
      sats: 1000
    });

    // Set up socket event listeners
    socket.on('players', (data: PlayersEventData) => {
      setPlayers(data.players);
    });

    socket.on('playerJoined', (data: PlayerJoinedEventData) => {
      setPlayers(prev => ({
        ...prev,
        [data.player.id]: data.player
      }));
    });

    socket.on('playerLeft', (data: PlayerLeftEventData) => {
      setPlayers(prev => {
        const newPlayers = { ...prev };
        delete newPlayers[data.id];
        return newPlayers;
      });
    });

    return () => {
      socket.off('players');
      socket.off('playerJoined');
      socket.off('playerLeft');
    };
  }, []);

  // Send position updates
  useEffect(() => {
    if (!myId) return;

    const interval = setInterval(() => {
      socket.emit('update', {
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
      });
    }, 50); // Send updates 20 times per second

    return () => clearInterval(interval);
  }, [myId, camera]);

  // Render other players
  return (
    <>
      {Object.entries(players).map(([id, player]) => {
        if (id === myId) return null; // Don't render self

        // Calculate angle between camera and player to determine which texture to show
        const cameraDirection = new Vector3();
        camera.getWorldDirection(cameraDirection);
        const playerPosition = new Vector3(player.position.x, player.position.y, player.position.z);
        const playerToCam = new Vector3().subVectors(camera.position, playerPosition).normalize();
        
        // Calculate player's forward direction based on their rotation
        const playerForward = new Vector3(0, 0, -1);
        playerForward.applyAxisAngle(new Vector3(0, 1, 0), player.rotation.y);
        
        // Use dot product between player's forward direction and vector to camera
        const dot = playerForward.dot(playerToCam);

        return (
          <group key={id} position={[player.position.x, player.position.y - 1, player.position.z]} rotation={[0, player.rotation.y, 0]}>
            {/* Front-facing plane */}
            <mesh userData={{ playerId: id }}>
              <planeGeometry args={[1, 2]} />
              <meshBasicMaterial 
                map={dot < 0 ? backTexture : frontTexture}
                transparent
                side={DoubleSide}
              />
            </mesh>
            
            {/* Health bar */}
            <Html position={[0, 1.2, 0]} center>
              <div className="w-20 h-1 bg-gray-800 rounded overflow-hidden">
                <div 
                  className="h-full bg-red-500 transition-all duration-300" 
                  style={{ width: `${player.health}%` }}
                />
              </div>
            </Html>
          </group>
        );
      })}
    </>
  );
} 