import * as dotenv from "dotenv";
dotenv.config();
import { WebSocketServer } from "ws";
import express from "express";
import { createServer } from "http";
import path from "path";
import { fileURLToPath } from "url";
import axios from "axios";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const port = process.env.PORT || 8080;

// Create HTTP server
const server = createServer(app);

// Create WebSocket server attached to HTTP server
const wss = new WebSocketServer({ server });

// Serve static files from 'public' directory
app.use(express.static(path.join(__dirname, "public")));

const LNBITS_API_URL = process.env.LNBITS_API_URL;
const LNBITS_ADMIN_KEY = process.env.LNBITS_ADMIN_KEY;

// Route to create a Lightning invoice
app.post("/invoice", async (req, res) => {
  try {
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
// Store WebSocket connections by player ID
const connections = {};

wss.on("connection", (ws) => {
  console.log("New connection established");
  let playerId = null;

  ws.on("message", (message) => {
    const data = JSON.parse(message);
    playerId = data.id; // Store the player ID for this connection

    switch (data.type) {
      case "join":
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
          rotation: { x: 0, y: 0, z: 0 },
        };

        // Send current players to new player
        ws.send(
          JSON.stringify({
            type: "players",
            players,
          })
        );

        // Notify other players
        wss.clients.forEach((client) => {
          if (client !== ws && client.readyState === ws.OPEN) {
            client.send(
              JSON.stringify({
                type: "playerJoined",
                player: players[data.id],
              })
            );
          }
        });
        break;

      case "update":
        // Update player position and rotation
        if (players[data.id]) {
          players[data.id].position = data.position;
          players[data.id].rotation = data.rotation;

          // Broadcast update to all other players
          wss.clients.forEach((client) => {
            if (client !== ws && client.readyState === ws.OPEN) {
              client.send(
                JSON.stringify({
                  type: "players",
                  players,
                })
              );
            }
          });
        }
        break;
    }
  });

  ws.on("close", () => {
    if (playerId && connections[playerId] === ws) {
      // Only remove the player if this is their most recent connection
      console.log(`Player ${playerId} disconnected`);
      delete connections[playerId];
      delete players[playerId];

      // Notify other players
      wss.clients.forEach((client) => {
        if (client.readyState === ws.OPEN) {
          client.send(
            JSON.stringify({
              type: "playerLeft",
              id: playerId,
            })
          );
        }
      });
    }
  });
});

// Start the server
server.listen(port, () => {
  console.log(`Server running on port ${port}`);
});
