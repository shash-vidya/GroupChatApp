
require('dotenv').config();
const express = require('express');
const http = require('http');
const path = require('path');
const cors = require('cors');
const { Server } = require('socket.io');
const jwt = require('jsonwebtoken');

// ------------------------------
// Database & Models
// ------------------------------
const { sequelize, User, Message, GroupMember, Group, ArchivedMessage } = require('./models');

// ------------------------------
// Routes
// ------------------------------
const signupRoute = require('./routes/signup');
const loginRoute = require('./routes/login');
const protectedRoute = require('./routes/protected');
const messageRoute = require('./routes/messages');
const groupsRoute = require('./routes/groups');
const loginOrCreateUserRoute = require('./routes/login-or-create-user');
const userRoutes = require('./routes/user');
const archiveRoute = require('./routes/archive');

// ------------------------------
// Express setup
// ------------------------------
const app = express();
const server = http.createServer(app);

const corsOptions = {
  origin: ['http://127.0.0.1:5500', 'http://localhost:5500'],
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
};
app.use(cors(corsOptions));
app.options('*', cors(corsOptions));

app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// ------------------------------
// Socket.IO setup
// ------------------------------
const io = new Server(server, {
  cors: {
    origin: ['http://127.0.0.1:5500', 'http://localhost:5500'],
    methods: ['GET', 'POST'],
    allowedHeaders: ['Authorization'],
  },
});

// Attach io to request object for controllers
app.use((req, res, next) => {
  req.io = io;
  next();
});

// ------------------------------
// API routes
// ------------------------------
app.use('/api/signup', signupRoute);
app.use('/api/login', loginRoute);
app.use('/api/protected', protectedRoute);
app.use('/api/messages', messageRoute);
app.use('/api/groups', groupsRoute);
app.use('/api/login-or-create-user', loginOrCreateUserRoute);
app.use('/api/users', userRoutes);
app.use('/api', archiveRoute);

// Serve login page
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'login.html'));
});

// ------------------------------
// Socket.IO events with JWT auth
// ------------------------------
io.use(async (socket, next) => {
  const token = socket.handshake.auth?.token;
  if (!token) return next(new Error('No token provided'));

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'your_jwt_secret');
    socket.userId = decoded.id;

    // Fetch username from DB
    const user = await User.findByPk(socket.userId);
    socket.username = user?.name || 'Unknown';
    next();
  } catch (err) {
    next(new Error('Invalid or expired token'));
  }
});

io.on('connection', (socket) => {
  console.log(`🟢 New user connected: ${socket.id} (${socket.username})`);
  socket.joinedGroups = new Set();

  // Join a room
  socket.on('joinRoom', (groupId) => {
    if (!groupId) return;
    socket.join(groupId.toString());
    socket.joinedGroups.add(groupId.toString());
    console.log(`✅ ${socket.username} joined group ${groupId}`);
  });

  // Send message
  socket.on('sendMessage', async ({ groupId, text }) => {
    if (!groupId || !text) return;
    try {
      const membership = await GroupMember.findOne({
        where: { user_id: socket.userId, group_id: groupId },
      });
      if (!membership) return console.error(`❌ User not in group ${groupId}`);

      const message = await Message.create({
        content: text,
        user_id: socket.userId,
        group_id: groupId,
      });

      // Emit message with correct username
      io.to(groupId.toString()).emit('message', {
        username: socket.username,
        text: message.content,
        userId: socket.userId,
        groupId,
        createdAt: message.createdAt,
      });

      console.log(`💬 Message sent to group ${groupId} by ${socket.username}`);
    } catch (err) {
      console.error('❌ Error sending message:', err);
    }
  });

  socket.on('disconnect', () => {
    console.log(`🔴 User disconnected: ${socket.username}`);
  });
});

// ------------------------------
// Nightly archive
// ------------------------------
const cron = require('node-cron');
const archiveOldMessages = require('./cron/archiveMessages');

cron.schedule('0 0 * * *', () => {
  console.log('Running nightly message archive...');
  archiveOldMessages();
});

// ------------------------------
// Start server
// ------------------------------
sequelize
  .sync({ force: false })
  .then(() => {
    const PORT = process.env.PORT || 4000;
    server.listen(PORT, () => console.log(`🚀 Server running on port ${PORT}`));
  })
  .catch((err) => console.error('❌ Database connection error:', err));
