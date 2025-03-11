import { WebSocketServer } from 'ws';

const wss = new WebSocketServer({ port: 8080 });

// Store all connected players
const players = {};
// Store WebSocket connections by player ID
const connections = {};

wss.on('connection', (ws) => {
  console.log('New connection established');
  let playerId = null;

  ws.on('message', (message) => {
    const data = JSON.parse(message);
    playerId = data.id; // Store the player ID for this connection

    switch (data.type) {
      case 'join':
        // Check if this player already exists
        if (connections[data.id]) {
          // Close the old connection
          connections[data.id].close();
        }

        // Store the new connection
        connections[data.id] = ws;

        // Update or create player
        players[data.id] = {
          id: data.id,
          color: data.color,
          position: { x: 0, y: 2, z: 0 },
          rotation: { x: 0, y: 0, z: 0 }
        };
        
        // Send current players to new player
        ws.send(JSON.stringify({
          type: 'players',
          players
        }));

        // Notify other players
        wss.clients.forEach(client => {
          if (client !== ws && client.readyState === ws.OPEN) {
            client.send(JSON.stringify({
              type: 'playerJoined',
              player: players[data.id]
            }));
          }
        });
        break;

      case 'update':
        // Update player position and rotation
        if (players[data.id]) {
          players[data.id].position = data.position;
          players[data.id].rotation = data.rotation;

          // Broadcast update to all other players
          wss.clients.forEach(client => {
            if (client !== ws && client.readyState === ws.OPEN) {
              client.send(JSON.stringify({
                type: 'players',
                players
              }));
            }
          });
        }
        break;
    }
  });

  ws.on('close', () => {
    if (playerId && connections[playerId] === ws) {
      // Only remove the player if this is their most recent connection
      console.log(`Player ${playerId} disconnected`);
      delete connections[playerId];
      delete players[playerId];

      // Notify other players
      wss.clients.forEach(client => {
        if (client.readyState === ws.OPEN) {
          client.send(JSON.stringify({
            type: 'playerLeft',
            id: playerId
          }));
        }
      });
    }
  });
}); 