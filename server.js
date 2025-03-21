import { Server } from "socket.io";
import { createServer } from "http";
import express from "express";
import * as dotenv from "dotenv";
dotenv.config();
import axios from "axios";
import cors from "cors";
import path from "path";
import { fileURLToPath } from "url";
import crypto from "crypto";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
app.use(cors()); // Enable CORS for all routes
app.use(express.json()); // Add middleware to parse JSON bodies

// API Routes
app.post("/invoice", async (req, res) => {
  try {
    console.log("Creating invoice");
    
    if (PAYMENT_PROCESSOR === 'voltage_payments') {
      // Generate a UUID for the payment
      const paymentId = crypto.randomUUID();
      
      // Create payment request
      const response = await axios.post(
        `${VOLTAGE_API_URL}/v1/organizations/${VOLTAGE_ORGANIZATION_ID}/environments/${VOLTAGE_ENVIRONMENT_ID}/payments`,
        {
          id: paymentId,
          wallet_id: VOLTAGE_WALLET_ID,
          currency: "btc",
          amount_msats: 1000000,
          payment_kind: "bolt11",
          description: "BitDoom Player Joins"
        },
        {
          headers: {
            "x-api-key": VOLTAGE_API_KEY,
            "Content-Type": "application/json"
          }
        }
      );

      if (response.status === 202) {
        return res.json({
          payment_request: null, // Will be populated by polling
          invoice_id: paymentId,
          payment_processor: 'voltage_payments'
        });
      }
    }

    // Default to LNBits
    const response = await axios.post(
      `${LNBITS_API_URL}/api/v1/payments`,
      { out: false, amount: 1000, memo: "player join" },
      {
        headers: {
          "X-Api-Key": LNBITS_ADMIN_KEY,
          "Content-Type": "application/json",
        },
      }
    );

    console.debug("returning invoice!");
    return res.json({
      payment_request: response.data.payment_request,
      invoice_id: response.data.payment_hash,
      payment_processor: 'lnbits'
    });
  } catch (error) {
    console.error(
      "Error creating invoice:",
      error.response?.data || error.message
    );
    res.status(500).json({ error: "Failed to create invoice" });
  }
});

app.get("/invoice", async (req, res) => {
  try {
    console.log("Checking invoice status");
    const { id, processor } = req.query;
    if (!id) {
      return res.status(400).json({ error: "Invoice ID is required" });
    }

    if (processor === 'voltage_payments') {
      const response = await axios.get(
        `${VOLTAGE_API_URL}/v1/organizations/${VOLTAGE_ORGANIZATION_ID}/environments/${VOLTAGE_ENVIRONMENT_ID}/payments/${id}`,
        {
          headers: {
            "x-api-key": VOLTAGE_API_KEY
          }
        }
      );

      const payment = response.data;
      
      // If the payment is still being created, return PENDING
      if (payment.status === 'receiving' && !payment.data?.payment_request) {
        return res.json({ status: "PENDING" });
      }

      // If we have the payment request but it's not paid yet
      if (payment.status === 'receiving' && payment.data?.payment_request) {
        return res.json({ 
          status: "PENDING",
          payment_request: payment.data.payment_request
        });
      }

      // If the payment is completed
      if (payment.status === 'completed') {
        return res.json({ status: "PAID" });
      }

      // If there was an error
      if (payment.error) {
        return res.status(500).json({ error: payment.error });
      }

      return res.json({ status: "PENDING" });
    }

    // Default to LNBits
    const response = await axios.get(
      `${LNBITS_API_URL}/api/v1/payments/${id}`,
      { headers: { "X-Api-Key": LNBITS_ADMIN_KEY } }
    );

    return res.json({ status: response.data.paid ? "PAID" : "PENDING" });
  } catch (error) {
    console.error(
      "Error checking invoice status:",
      error.response?.data || error.message
    );
    res.status(500).json({ error: "Failed to fetch invoice status" });
  }
});

app.post("/withdraw", async (req, res) => {
  try {
    console.log("Creating withdrawal invoice");
    const { lightningAddress, amount } = req.body;
    
    if (!lightningAddress || !amount || amount <= 0) {
      return res.status(400).json({ error: "Invalid withdrawal request" });
    }

    if (PAYMENT_PROCESSOR === 'voltage_payments') {
      // Generate a UUID for the payment
      const paymentId = crypto.randomUUID();
      
      // Create payment request
      const response = await axios.post(
        `${VOLTAGE_API_URL}/v1/organizations/${VOLTAGE_ORGANIZATION_ID}/environments/${VOLTAGE_ENVIRONMENT_ID}/payments`,
        {
          id: paymentId,
          wallet_id: VOLTAGE_WALLET_ID,
          currency: "btc",
          amount_msats: amount * 1000, // Convert sats to msats
          payment_kind: "bolt11",
          description: "BitDoom Withdrawal",
          destination: lightningAddress
        },
        {
          headers: {
            "x-api-key": VOLTAGE_API_KEY,
            "Content-Type": "application/json"
          }
        }
      );

      if (response.status === 202) {
        return res.json({
          payment_request: null, // Will be populated by polling
          invoice_id: paymentId,
          payment_processor: 'voltage_payments'
        });
      }
    }

    // Default to LNBits
    const response = await axios.post(
      `${LNBITS_API_URL}/api/v1/payments`,
      { 
        out: true, 
        amount: amount,
        memo: "BitDoom Withdrawal",
        lnurl: lightningAddress
      },
      {
        headers: {
          "X-Api-Key": LNBITS_ADMIN_KEY,
          "Content-Type": "application/json",
        },
      }
    );

    return res.json({
      payment_request: response.data.payment_request,
      invoice_id: response.data.payment_hash,
      payment_processor: 'lnbits'
    });
  } catch (error) {
    console.error(
      "Error creating withdrawal invoice:",
      error.response?.data || error.message
    );
    res.status(500).json({ error: "Failed to create withdrawal invoice" });
  }
});

app.post("/pay", async (req, res) => {
  try {
    const { payment_request, amount } = req.body;
    
    if (!payment_request || !amount || amount <= 0) {
      return res.status(400).json({ error: "Invalid payment request" });
    }

    // Generate a UUID for the payment
    const paymentId = crypto.randomUUID();
    
    // Create payment request
    const response = await axios.post(
      `${VOLTAGE_API_URL}/v1/organizations/${VOLTAGE_ORGANIZATION_ID}/environments/${VOLTAGE_ENVIRONMENT_ID}/payments`,
      {
        id: paymentId,
        wallet_id: VOLTAGE_WALLET_ID,
        currency: "btc",
        type: "bolt11",
        data: {
          amount_msats: amount * 1000, // Convert sats to msats
          max_fee_msats: Math.floor(amount * 1000 * 0.1), // 10% of amount
          payment_request: payment_request
        }
      },
      {
        headers: {
          "x-api-key": VOLTAGE_API_KEY,
          "Content-Type": "application/json"
        }
      }
    );

    if (response.status === 202) {
      return res.json({
        payment_id: paymentId,
        status: "pending"
      });
    }

    throw new Error("Failed to initiate payment");
  } catch (error) {
    console.error(
      "Error processing payment:",
      error.response?.data || error.message
    );
    res.status(500).json({ error: "Failed to process payment" });
  }
});

app.get("/payment-status/:id", async (req, res) => {
  try {
    const { id } = req.params;
    
    if (!id) {
      return res.status(400).json({ error: "Payment ID is required" });
    }

    const response = await axios.get(
      `${VOLTAGE_API_URL}/v1/organizations/${VOLTAGE_ORGANIZATION_ID}/environments/${VOLTAGE_ENVIRONMENT_ID}/payments/${id}`,
      {
        headers: {
          "x-api-key": VOLTAGE_API_KEY
        }
      }
    );

    const payment = response.data;
    
    if (payment.status === "completed") {
      return res.json({ status: "completed" });
    } else if (payment.error) {
      return res.json({ status: "error", error: payment.error });
    } else {
      return res.json({ status: "pending" });
    }
  } catch (error) {
    console.error(
      "Error checking payment status:",
      error.response?.data || error.message
    );
    res.status(500).json({ error: "Failed to check payment status" });
  }
});

// Serve static files from the React app build directory
app.use(express.static(path.join(__dirname, "dist")));

// Handle React routing, return all requests to React app
app.get("*", (req, res) => {
  res.sendFile(path.join(__dirname, "dist", "index.html"));
});

const httpServer = createServer(app);
const io = new Server(httpServer, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"],
  },
});

const LNBITS_API_URL = process.env.LNBITS_API_URL;
const LNBITS_ADMIN_KEY = process.env.LNBITS_ADMIN_KEY;
const PAYMENT_PROCESSOR = process.env.PAYMENT_PROCESSOR || 'lnbits';

// Voltage Payments configuration
const VOLTAGE_API_URL = process.env.VOLTAGE_API_URL;
const VOLTAGE_API_KEY = process.env.VOLTAGE_API_KEY;
const VOLTAGE_ORGANIZATION_ID = process.env.VOLTAGE_ORGANIZATION_ID;
const VOLTAGE_ENVIRONMENT_ID = process.env.VOLTAGE_ENVIRONMENT_ID;
const VOLTAGE_WALLET_ID = process.env.VOLTAGE_WALLET_ID;

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
    socket.emit("players", { players });

    // Notify other players
    socket.broadcast.emit("playerJoined", {
      player: players[data.id],
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
      socket.broadcast.emit("players", { players });
    }
  });

  socket.on("hit", (data) => {
    // Handle player being hit
    const targetPlayer = players[data.targetId];
    const attackingPlayer = players[data.id];

    if (targetPlayer && targetPlayer.health > 0 && attackingPlayer) {
      // Apply damage
      targetPlayer.health = Math.max(0, targetPlayer.health - DAMAGE);

      // If player dies, spawn coins instead of direct transfer
      if (targetPlayer.health <= 0) {
        const coinsToSpawn = Math.floor(targetPlayer.sats / 100);
        targetPlayer.sats = 0;

        console.log(
          `Player ${data.id} killed Player ${data.targetId} and spawned ${coinsToSpawn} coins`
        );

        // Notify all players about the coins spawn
        io.emit("coinsSpawned", {
          targetId: data.targetId,
          position: targetPlayer.position,
          coins: coinsToSpawn,
          totalSats: coinsToSpawn * 100
        });

        // Notify the killer about the kill
        io.to(data.id).emit("playerKilled", {
          targetId: data.targetId,
          newHealth: attackingPlayer.health,
          newSats: attackingPlayer.sats
        });
      }

      console.log(
        `Player ${data.targetId} hit, new health: ${targetPlayer.health}`
      );

      // Notify the hit player through their room
      io.to(data.targetId).emit("playerHit", {
        targetId: data.targetId,
        newHealth: targetPlayer.health,
        newSats: targetPlayer.sats,
      });

      // Update all players about the new state
      io.emit("players", { players });
    }
  });

  // Handle coin collection
  socket.on("collectCoin", (data) => {
    const player = players[data.id];
    if (player) {
      player.sats += 100; // Each coin is worth 100 sats
      
      // Notify the player about their new sats
      io.to(data.id).emit("coinCollected", {
        newSats: player.sats
      });

      // Update all players about the new state
      io.emit("players", { players });
    }
  });

  socket.on("respawn", (data) => {
    if (players[data.id]) {
      players[data.id].health = 100;
      players[data.id].position = { x: 0, y: 2, z: 0 };

      // Notify all players
      io.emit("players", { players });
    }
  });

  socket.on("disconnect", () => {
    if (playerId) {
      console.log(`Player ${playerId} disconnected`);
      delete players[playerId];

      // Leave the room
      socket.leave(playerId);

      // Notify other players
      socket.broadcast.emit("playerLeft", {
        id: playerId,
      });
    }
  });
});

httpServer.listen(8080, () => {
  console.log("Server running on port 8080");
});
