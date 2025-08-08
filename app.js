require('dotenv').config();

const express = require('express');
const cors = require('cors');
const path = require('path');
const http = require('http');
const { Server } = require('socket.io');
const sequelize = require('./config/db');

const loginRoute = require('./routes/login');
const signupRoute = require('./routes/signup');

const app = express();

app.use(express.json());

// CORS config - allow frontend origins that you serve from
app.use(cors({
  origin: ['http://localhost:5500', 'http://127.0.0.1:5500', 'http://localhost:4000'],
  methods: ['GET', 'POST', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: true
}));

app.options('*', cors());

// Serve static frontend files from 'public' directory
app.use(express.static(path.join(__dirname, 'public')));

// Connect and sync database
sequelize.authenticate()
  .then(() => sequelize.sync())
  .then(() => console.log('DB connected & synced'))
  .catch(err => console.error('DB connection error:', err));

// API routes for login and signup
app.use('/login', loginRoute);
app.use('/signup', signupRoute);

// Create HTTP server from Express app to use with Socket.io
const server = http.createServer(app);

// Setup Socket.io with CORS options
const io = new Server(server, {
  cors: {
    origin: ['http://localhost:5500', 'http://127.0.0.1:5500'],
    methods: ['GET', 'POST']
  }
});

// In-memory storage of users and chat messages
const users = new Map();   // socket.id -> username
const messages = [];       // Array of { type, user?, text }

// Socket.io connection handler
io.on('connection', (socket) => {
  console.log('New user connected:', socket.id);

  // Send all previous messages & notifications to newly connected client
  socket.emit('chatHistory', messages);

  // Listen for user joining and save username
  socket.on('join', (username) => {
    users.set(socket.id, username);

    const joinMsg = { type: 'notification', text: `${username} joined the chat` };
    messages.push(joinMsg);

    // Broadcast join notification to all clients
    io.emit('notification', joinMsg.text);
  });

  // Listen for new chat messages from clients
  socket.on('chatMessage', (msg) => {
    const user = users.get(socket.id) || 'Unknown';

    const messageObj = { type: 'message', user, text: msg };
    messages.push(messageObj);

    // Broadcast message to all clients
    io.emit('message', messageObj);
  });

  // Handle user disconnect
  socket.on('disconnect', () => {
    const username = users.get(socket.id);

    if (username) {
      const leaveMsg = { type: 'notification', text: `${username} left the chat` };
      messages.push(leaveMsg);

      io.emit('notification', leaveMsg.text);
      users.delete(socket.id);
    }
    console.log('User disconnected:', socket.id);
  });
});

// Start server on port from .env or default 4000
const PORT = process.env.PORT || 4000;
server.listen(PORT, () => {
  console.log(`Server + Socket.io running at http://localhost:${PORT}`);
});
