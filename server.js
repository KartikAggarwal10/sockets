const http = require("http");
const { Server } = require("socket.io");

const PORT = process.env.PORT || 3001;

// HTTP server with health-check endpoint for cloud hosting (Render / Railway)
const server = http.createServer((req, res) => {
  if (req.url === "/" || req.url === "/health") {
    res.writeHead(200, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ status: "online", port: PORT, timestamp: new Date() }));
  } else {
    res.writeHead(404);
    res.end();
  }
});

const io = new Server(server, {
  cors: {
    origin: (origin, callback) => {
      // Allow requests with no origin (e.g. mobile apps, curl)
      if (!origin) return callback(null, true);

      const allowedList = process.env.ALLOWED_ORIGINS
        ? process.env.ALLOWED_ORIGINS.split(",").map((s) => s.trim())
        : ["http://localhost:3000", "http://127.0.0.1:3000"];

      if (allowedList.includes("*") || allowedList.includes(origin) || origin.endsWith(".vercel.app")) {
        return callback(null, true);
      }

      return callback(null, true);
    },
    methods: ["GET", "POST"],
    credentials: true,
  },
});

io.on("connection", (socket) => {
  console.log(`[Socket Connected] ID: ${socket.id}`);

  // 1. Join user to their personal room
  socket.on("join", (userId) => {
    if (userId !== undefined && userId !== null) {
      const room = String(userId);
      socket.join(room);
      console.log(`[Room Joined] User ${userId} joined room "${room}"`);
    }
  });

  // 2. Route messages to the receiver's personal room
  socket.on("sendMessage", ({ _id, senderId, receiverId, message }) => {
    const targetRoom = String(receiverId);
    console.log(`[Message Routing] From ${senderId} to ${receiverId} in room "${targetRoom}": ${message}`);

    io.to(targetRoom).emit("receiveMessage", {
      _id,
      senderId: String(senderId),
      message,
      timestamp: new Date(),
    });
  });

  socket.on("disconnect", (reason) => {
    console.log(`[Socket Disconnected] ID: ${socket.id}, Reason: ${reason}`);
  });
});

server.listen(PORT, () => {
  console.log(`🟢 Socket.io server is running on http://localhost:${PORT}`);
});
