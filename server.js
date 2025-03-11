import { Server } from 'socket.io';
import { createServer } from 'http';

const httpServer = createServer();
const io = new Server(httpServer, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"]
  }
});

// Store all connected players
const players = {};
const DAMAGE = 5; // 5% damage per hit
const INITIAL_SATS = 1000; // Starting bitcoin amount

// Portal timer constants
const PORTAL_COUNTDOWN = 60;
const PORTAL_DURATION = 10;
let portalTimer = PORTAL_COUNTDOWN;
let portalOpen = false;
let timerInterval = null;

// Start the portal timer when the server starts
function startPortalTimer() {
  if (timerInterval) clearInterval(timerInterval);
  
  timerInterval = setInterval(() => {
    if (!portalOpen) {
      // Countdown phase
      portalTimer--;
      
      if (portalTimer <= 0) {
        // Open portal
        portalOpen = true;
        portalTimer = PORTAL_DURATION;
        io.emit('portalTimerSync', { countdown: portalTimer, isOpen: true });
        
        // Set timeout to close portal
        setTimeout(() => {
          portalOpen = false;
          portalTimer = PORTAL_COUNTDOWN;
          io.emit('portalTimerSync', { countdown: portalTimer, isOpen: false });
        }, PORTAL_DURATION * 1000);
      } else {
        // Regular countdown update
        io.emit('portalTimerSync', { countdown: portalTimer, isOpen: false });
      }
    }
  }, 1000);
}

// Start the timer when server starts
startPortalTimer();

io.on('connection', (socket) => {
  console.log('New connection established');
  let playerId = null;

  // Send current portal state to new connections
  socket.emit('portalTimerSync', { countdown: portalTimer, isOpen: portalOpen });

  socket.on('join', (data) => {
    playerId = data.id;
    
    // Join a room with the player's ID
    socket.join(playerId);
    console.log(`Player ${playerId} joined room ${playerId}`);

    // Update or create player
    players[data.id] = {
      id: data.id,
      color: data.color,
      position: { x: 0, y: 2, z: 0 },
      rotation: { x: 0, y: 0, z: 0 },
      health: data.health || 100,
      sats: INITIAL_SATS, // Always start with 1000 sats
      name: data.name // Store the player's name
    };
    
    // Send current players to new player
    socket.emit('players', { players });

    // Notify other players
    socket.broadcast.emit('playerJoined', {
      player: players[data.id]
    });
  });

  socket.on('playerEscaped', (data) => {
    const player = players[data.id];
    if (player && portalOpen) {
      // Handle player escape - they keep their sats
      io.to(data.id).emit('escaped', { sats: player.sats });
      delete players[data.id];
      socket.broadcast.emit('playerLeft', { id: data.id });
    }
  });

  socket.on('update', (data) => {
    // Update player position and rotation
    if (players[data.id]) {
      players[data.id].position = data.position;
      players[data.id].rotation = data.rotation;

      // Broadcast update to all other players
      socket.broadcast.emit('players', { players });
    }
  });

  socket.on('hit', (data) => {
    // Handle player being hit
    const targetPlayer = players[data.targetId];
    const attackingPlayer = players[data.id]; // Add the attacking player's ID to track who dealt the damage

    if (targetPlayer && targetPlayer.health > 0 && attackingPlayer) {
      // Apply damage
      targetPlayer.health = Math.max(0, targetPlayer.health - DAMAGE);
      
      // If player dies, transfer their bitcoin to the killer
      if (targetPlayer.health <= 0) {
        const stolenSats = targetPlayer.sats;
        targetPlayer.sats = 0;
        attackingPlayer.sats += stolenSats;

        console.log(`Player ${data.id} killed Player ${data.targetId} and stole ${stolenSats} sats`);
        
        // Notify the killer about their new sats
        io.to(data.id).emit('playerHit', {
          targetId: data.targetId,
          newHealth: attackingPlayer.health,
          newSats: attackingPlayer.sats,
          stolenSats: stolenSats
        });
      }

      console.log(`Player ${data.targetId} hit, new health: ${targetPlayer.health}`);

      // Notify the hit player through their room
      io.to(data.targetId).emit('playerHit', {
        targetId: data.targetId,
        newHealth: targetPlayer.health,
        newSats: targetPlayer.sats
      });

      // Update all players about the new state
      io.emit('players', { players });
    }
  });

  socket.on('respawn', (data) => {
    if (players[data.id]) {
      players[data.id].health = 100;
      players[data.id].position = { x: 0, y: 2, z: 0 };
      
      // Notify all players
      io.emit('players', { players });
    }
  });

  socket.on('disconnect', () => {
    if (playerId) {
      console.log(`Player ${playerId} disconnected`);
      delete players[playerId];

      // Leave the room
      socket.leave(playerId);

      // Notify other players
      socket.broadcast.emit('playerLeft', {
        id: playerId
      });
    }
  });
});

httpServer.listen(8080, () => {
  console.log('Server running on port 8080');
}); 