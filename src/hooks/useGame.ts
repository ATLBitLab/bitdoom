import { useEffect } from 'react';
import { socket } from '../socket';

interface GameState {
  player: {
    position: { x: number; y: number; z: number };
    health: number;
    sats: number;
  };
}

declare global {
  interface Window {
    gameState: GameState;
  }
}

export function useGame() {
  useEffect(() => {
    // Initialize game state
    window.gameState = {
      player: {
        position: { x: 0, y: 0, z: 0 },
        health: 100,
        sats: 1000
      }
    };

    // Update player position from game engine
    const updatePlayerPosition = (position: { x: number; y: number; z: number }) => {
      if (window.gameState) {
        window.gameState.player.position = position;
      }
    };

    // Listen for position updates from game engine
    window.addEventListener('playerPositionUpdate', ((event: CustomEvent) => {
      updatePlayerPosition(event.detail.position);
    }) as EventListener);

    return () => {
      window.removeEventListener('playerPositionUpdate', ((event: CustomEvent) => {
        updatePlayerPosition(event.detail.position);
      }) as EventListener);
    };
  }, []);

  const emitRespawn = () => {
    socket.emit('respawn', { id: localStorage.getItem('playerId') });
  };

  return {
    emitRespawn,
  };
} 