import { WebSocketServer } from 'ws';

const wss = new WebSocketServer({ port: 8080 });

// Store all connected players
const players = {};

wss.on('connection', (ws) => {
  console.log('New player connected');

  ws.on('message', (message) => {
    const data = JSON.parse(message);

    switch (data.type) {
      case 'join':
        // Add new player
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
          if (client !== ws) {
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
            if (client !== ws) {
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
    // Find and remove the disconnected player
    const disconnectedPlayer = Object.values(players).find(
      player => player.ws === ws
    );

    if (disconnectedPlayer) {
      delete players[disconnectedPlayer.id];

      // Notify other players
      wss.clients.forEach(client => {
        client.send(JSON.stringify({
          type: 'playerLeft',
          id: disconnectedPlayer.id
        }));
      });
    }
  });
}); 