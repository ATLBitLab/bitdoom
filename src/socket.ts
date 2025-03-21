import { io } from "socket.io-client";

interface PlayerHitData {
  targetId: string;
  newHealth: number;
  newSats: number;
}

interface CoinsSpawnedData {
  targetId: string;
  position: { x: number; y: number; z: number };
  coins: number;
  totalSats: number;
}

interface CoinCollectedData {
  newSats: number;
}

// Connect to the WebSocket server
const SOCKET_URL = import.meta.env.DEV ? "http://localhost:8080" : "https://bitdoom.app";
export const socket = io(SOCKET_URL, {
  transports: ["websocket"],
  autoConnect: true,
});

// Socket event handlers
socket.on("connect", () => {
  console.log("Connected to game server");
});

socket.on("connect_error", (error: Error) => {
  console.error("Socket connection error:", error);
});

socket.on("playerHit", (data: PlayerHitData) => {
  console.log("Received playerHit event:", data);

  // Update window.gameState with new sats
  if (window.gameState) {
    window.gameState.player.sats = data.newSats;
  }

  // Dispatch playerDamaged event for HUD
  const event = new CustomEvent("playerDamaged", {
    detail: {
      health: data.newHealth,
      sats: data.newSats,
    },
  });
  window.dispatchEvent(event);

  console.log("Dispatched playerDamaged event with health:", data.newHealth);
});

socket.on("coinsSpawned", (data: CoinsSpawnedData) => {
  console.log("Received coinsSpawned event:", data);
  
  // Dispatch coinsSpawned event for game
  const event = new CustomEvent("coinsSpawned", {
    detail: {
      targetId: data.targetId,
      position: data.position,
      coins: data.coins,
      totalSats: data.totalSats
    }
  });
  window.dispatchEvent(event);
});

socket.on("coinCollected", (data: CoinCollectedData) => {
  console.log("Coin collected:", data);
  // Update window.gameState with new sats value
  if (window.gameState) {
    window.gameState.player.sats = data.newSats;
  }
  // Dispatch playerDamaged event to update HUD with new sats value
  window.dispatchEvent(new CustomEvent('playerDamaged', {
    detail: {
      health: window.gameState?.player?.health || 100,
      sats: data.newSats
    }
  }));
});

// Handle escaped event from server
socket.on("escaped", (data: { sats: number }) => {
  console.log("Received escaped event with sats:", data.sats);
  
  // Update window.gameState with final sats
  if (window.gameState) {
    window.gameState.player.sats = data.sats;
  }

  // Dispatch playerEscaped event for HUD
  const event = new CustomEvent("playerEscaped", {
    detail: { sats: data.sats }
  });
  window.dispatchEvent(event);
});

// Export a function to emit hit events
export const emitHit = (targetId: string) => {
  console.log("Emitting hit event for target:", targetId);
  socket.emit("hit", { targetId, id: localStorage.getItem("playerId") });
};

// Export a function to emit coin collection events
export const emitCoinCollected = () => {
  console.log("Emitting coinCollected event");
  socket.emit("collectCoin", { id: localStorage.getItem("playerId") });
};
