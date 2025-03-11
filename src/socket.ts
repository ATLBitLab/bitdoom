import { io } from "socket.io-client";

// Connect to the WebSocket server
export const socket = io('ws://localhost:8080', {
  transports: ['websocket'],
  autoConnect: true
});

// Socket event handlers
socket.on('connect', () => {
  console.log('Connected to game server');
});

socket.on('connect_error', (error) => {
  console.error('Socket connection error:', error);
});

socket.on('playerHit', (data) => {
  console.log('Received playerHit event:', data);
  // Dispatch playerDamaged event for HUD
  const event = new CustomEvent('playerDamaged', {
    detail: { health: data.newHealth, sats: data.newSats }
  });
  window.dispatchEvent(event);
  console.log('Dispatched playerDamaged event with health:', data.newHealth);
});

// Export a function to emit hit events
export const emitHit = (targetId: string) => {
  console.log('Emitting hit event for target:', targetId);
  socket.emit('hit', { targetId });
}; 