require('dotenv').config();
const express = require('express');
const http = require('http');
const path = require('path');
const cors = require('cors');
const { Server } = require('socket.io');
const sequelize = require('./config/db');
const { User, Message, Group, GroupMember } = require('./models');

// Routes
const signupRoute = require('./routes/signup');
const loginRoute = require('./routes/login');
const protectedRoute = require('./routes/protected');
const messageRoute = require('./routes/messages');
const groupsRoute = require('./routes/groups');
const loginOrCreateUserRoute = require('./routes/login-or-create-user');
const userRoutes = require('./routes/user');

const app = express();
const server = http.createServer(app);

// ✅ Socket.IO setup
const io = new Server(server, {
  cors: {
    origin: 'http://127.0.0.1:5500', // your frontend
    methods: ['GET', 'POST'],
  },
});

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// Make io accessible inside controllers (if needed)
app.use((req, res, next) => {
  req.io = io;
  next();
});

// API routes
app.use('/api/signup', signupRoute);
app.use('/api/login', loginRoute);
app.use('/api/protected', protectedRoute);
app.use('/api/messages', messageRoute);
app.use('/api/groups', groupsRoute);
app.use('/api/login-or-create-user', loginOrCreateUserRoute);
app.use('/api/users', userRoutes);

// Serve login page
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'login.html'));
});

// ✅ Socket.IO events
io.on('connection', (socket) => {
  console.log(`🟢 New user connected: ${socket.id}`);

  // track which groups this socket joined
  socket.joinedGroups = new Set();

  // Store username for display (optional)
  socket.on('join', (username) => {
    if (typeof username !== 'string' || username.trim() === '') return;
    socket.username = username.trim();
    console.log(`Socket ${socket.id} set username: ${socket.username}`);
  });

  // Fetch groups for a user and join their rooms
  socket.on('getGroups', async (userId) => {
    if (!userId) {
      socket.emit('groupsList', []);
      return;
    }
    try {
      const userGroups = await Group.findAll({
        include: [{
          model: User,
          as: 'users',
          where: { id: userId },
          attributes: [],
          through: { attributes: [] },
        }],
        attributes: ['id', 'name'],
      });

      // Join each group room
      userGroups.forEach(group => {
        const room = group.id.toString();
        socket.join(room);
        socket.joinedGroups.add(room);
      });

      // Send list of groups back to client
      socket.emit('groupsList', userGroups.map(g => ({ id: g.id, name: g.name })));
    } catch (error) {
      console.error('❌ Error fetching groups:', error);
      socket.emit('groupsList', []);
    }
  });

  // Handle sending a message
  socket.on('sendMessage', async ({ userId, username, text, groupId }) => {
    if (!userId || !text || !groupId) {
      console.warn('⚠️ Invalid sendMessage payload:', { userId, text, groupId });
      return;
    }

    try {
      // Verify user exists
      const userRecord = await User.findByPk(userId);
      if (!userRecord) {
        console.error('❌ User not found:', userId);
        return;
      }

      // Verify membership
      const membership = await GroupMember.findOne({
        where: { userId: userRecord.id, groupId },
      });
      if (!membership) {
        console.error(`❌ User ${userRecord.name} is not a member of group ${groupId}`);
        return;
      }

      // Save message in DB
      const message = await Message.create({
        content: text,
        userId: userRecord.id,
        groupId,
      });

      // Broadcast to group room
      io.to(groupId.toString()).emit('message', {
        id: message.id,
        userId: userRecord.id,
        username: userRecord.name,
        text,
        groupId,
        createdAt: message.createdAt,
      });

      console.log(`💬 Message sent to group ${groupId} by ${userRecord.name}`);
    } catch (error) {
      console.error('❌ Error saving/broadcasting message:', error);
    }
  });

  // Handle disconnect
  socket.on('disconnect', () => {
    console.log(`🔴 User disconnected: ${socket.id}`);
  });
});

// ✅ Start server
sequelize.sync() // No { force: true } to keep data safe
  .then(() => {
    const PORT = process.env.PORT || 4000;
    server.listen(PORT, () => {
      console.log(`🚀 Server running on port ${PORT}`);
    });
  })
  .catch((error) => {
    console.error('❌ Database connection error:', error);
  });
