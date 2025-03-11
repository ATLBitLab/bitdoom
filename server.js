import { Server } from "socket.io";
import { createServer } from "http";
import express from "express";
import * as dotenv from "dotenv";
dotenv.config();
import axios from "axios";
import cors from "cors";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
app.use(cors()); // Enable CORS for all routes
app.use(express.json()); // Add middleware to parse JSON bodies

// Serve static files from the React app build directory
app.use(express.static(path.join(__dirname, "dist")));

// Handle React routing, return all requests to React app
app.get("*", (req, res, next) => {
  if (req.path === "/invoice") {
    return next();
  }
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

// Route to create a Lightning invoice
app.post("/invoice", async (req, res) => {
  try {
    console.log("Creating invoice");
    const response = await axios.post(
      `${LNBITS_API_URL}/api/v1/payments`,
      { out: false, amount: 5, memo: "player join" },
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
    });
  } catch (error) {
    console.error(
      "Error creating invoice:",
      error.response?.data || error.message
    );
    res.status(500).json({ error: "Failed to create invoice" });
  }
});

// Route to check invoice status
app.get("/invoice", async (req, res) => {
  try {
    console.log("Checking invoice status");
    const { id } = req.query;
    if (!id) {
      return res.status(400).json({ error: "Invoice ID is required" });
    }

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

// Store all connected players
const players = {};
const DAMAGE = 5; // 5% damage per hit

io.on("connection", (socket) => {
  console.log("New connection established");
  let playerId = null;

  socket.on("join", (data) => {
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
      sats: data.sats || 1000,
    };

    // Send current players to new player
    socket.emit("players", { players });

    // Notify other players
    socket.broadcast.emit("playerJoined", {
      player: players[data.id],
    });
  });

  socket.on("update", (data) => {
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
    if (targetPlayer && targetPlayer.health > 0) {
      // Apply damage
      targetPlayer.health = Math.max(0, targetPlayer.health - DAMAGE);

      // If player dies, they lose their bitcoin
      if (targetPlayer.health <= 0) {
        targetPlayer.sats = 0;
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
