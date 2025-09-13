/** @format */

import express from "express";
import "dotenv/config";
import cors from "cors";
import http from "http";
import { connectDB } from "./lib/db.js";
import userRouter from "./routes/userRoutes.js";
import messageRouter from "./routes/messageRoutes.js";
import { Server } from "socket.io";

console.log("JWT_SECRET in server:", process.env.JWT_SECRET);


// Create Express app and HTTP server
const app = express();
const server = http.createServer(app);

// Initialize Socket.IO server with permissive CORS
export const io = new Server(server, {
  cors: { origin: "*" },
});

// Store online users: mapping of userId to socketId
export const userSocketMap = {}; // { userId: socketId }

// Socket.IO connection handler
io.on("connection", (socket) => {
  const userId = socket.handshake.query.userId;
  console.log("User Connected", userId);

  if (userId) {
    // Correct: use socket.id, not socket.userId
    userSocketMap[userId] = socket.id;
  }

  // Broadcast current online users to all clients
  io.emit("getOnlineUsers", Object.keys(userSocketMap));

  // Corrected disconnect listener
  socket.on("disconnect", () => {
    console.log("User Disconnected", userId);
    delete userSocketMap[userId];
    io.emit("getOnlineUsers", Object.keys(userSocketMap));
  });
});

// Middleware setup
app.use(express.json({ limit: "4mb" }));
app.use(cors());

// Route setup
app.use("/api/status", (req, res) => res.send("Server is live"));
app.use("/api/auth", userRouter);
app.use("/api/messages", messageRouter);

// Connect to MongoDB
await connectDB();

if (process.env.NODE_ENV !== "production") {
  const PORT = process.env.PORT || 5000;
  server.listen(PORT, () => console.log("Server is running on PORT:", PORT));
}


// Export server for Versel
export default server;
