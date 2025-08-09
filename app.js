require('dotenv').config();
const express = require('express');
const http = require('http');
const cors = require('cors');
const { Server } = require('socket.io');
const sequelize = require('./config/db');
const { User, Message } = require('./models'); // from models/index.js

const signupRoute = require('./routes/signup');
const loginRoute = require('./routes/login');

const app = express();
const server = http.createServer(app);

// Middleware
app.use(cors({
  origin: ['http://127.0.0.1:5500', 'http://localhost:5500'],
  methods: ['GET', 'POST', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: true,
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.options('*', cors());

// Routes
app.use('/signup', signupRoute);
app.use('/login', loginRoute);

// Socket.io Setup
const io = new Server(server, {
  cors: {
    origin: ['http://127.0.0.1:5500', 'http://localhost:5500'],
    methods: ['GET', 'POST', 'OPTIONS'],
    credentials: true,
  }
});

io.on('connection', async (socket) => {
  console.log('🔌 User connected:', socket.id);

  // Send last 50 messages to newly connected user
  try {
    const recentMessages = await Message.findAll({
      order: [['createdAt', 'ASC']],
      limit: 50,
      include: [{ model: User, as: 'user', attributes: ['name'] }]
    });

    socket.emit('recentMessages', recentMessages.map(msg => ({
      id: msg.id,
      message: msg.content,
      createdAt: msg.createdAt,
      user: msg.user ? msg.user.name : 'Unknown'
    })));
  } catch (err) {
    console.error('❌ Error fetching messages:', err);
  }

  // Track user info after join
  socket.on('join', async (username) => {
    try {
      if (!username || username.trim() === '') return;

      let user = await User.findOne({ where: { name: username } });
      if (!user) {
        user = await User.create({
          name: username,
          email: `${username}@example.com`,
          password: 'temp' // hash in real app
        });
      }

      socket.data.user = { id: user.id, name: user.name };

      // Broadcast user joined
      io.emit('userJoined', { user: user.name, message: `${user.name} has joined the chat` });
      console.log(`✅ ${user.name} joined`);
    } catch (err) {
      console.error('❌ Error handling join:', err);
    }
  });

  // Handle incoming chat messages
  socket.on('chatMessage', async (msg) => {
    const user = socket.data.user;
    if (!user) return;

    try {
      const savedMessage = await Message.create({
        content: msg,
        userId: user.id
      });

      io.emit('chatMessage', {
        id: savedMessage.id,
        message: savedMessage.content,
        createdAt: savedMessage.createdAt,
        user: user.name
      });
    } catch (err) {
      console.error('❌ Error saving message:', err);
    }
  });

  // Handle disconnect
  socket.on('disconnect', () => {
    if (socket.data.user) {
      io.emit('userLeft', { user: socket.data.user.name, message: `${socket.data.user.name} has left the chat` });
      console.log(`❌ ${socket.data.user.name} disconnected`);
    }
  });
});

// Sync DB and start server
sequelize.sync({ alter: true })
  .then(() => {
    server.listen(4000, () => {
      console.log('✅ Server running on port 4000');
    });
  })
  .catch(err => {
    console.error('❌ DB connection error:', err);
  });
