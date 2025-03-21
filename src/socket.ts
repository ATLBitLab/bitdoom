import { io } from "socket.io-client";

interface PlayerHitData {
  targetId: string;
  newHealth: number;
  newSats: number;
  stolenSats?: number;
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
      stolenSats: data.stolenSats,
    },
  });
  window.dispatchEvent(event);

  console.log("Dispatched playerDamaged event with health:", data.newHealth);

  // If we stole bitcoin, show a notification
  if (data.stolenSats) {
    console.log(`Stole ${data.stolenSats} sats from kill!`);
    const killEvent = new CustomEvent("playerKill", {
      detail: { stolenSats: data.stolenSats },
    });
    window.dispatchEvent(killEvent);
  }
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
