require('dotenv').config();
const express = require('express');
const http = require('http');
const path = require('path');
const cors = require('cors');
const { Server } = require('socket.io');
const sequelize = require('./config/db');
const { User, Message, Group, GroupMember } = require('./models');

const signupRoute = require('./routes/signup');
const loginRoute = require('./routes/login');
const protectedRoute = require('./routes/protected');
const messageRoute = require('./routes/messages');
const groupsRoute = require('./routes/groups');
const loginOrCreateUserRoute = require('./routes/login-or-create-user');
const userRoutes = require('./routes/user');

const app = express();
const server = http.createServer(app);

const io = new Server(server, {
  cors: {
    origin: 'http://127.0.0.1:5500',
    methods: ['GET', 'POST'],
  },
});

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// Add io to req for routes if needed
app.use((req, res, next) => {
  req.io = io;
  next();
});

// Mount routes
app.use('/api/signup', signupRoute);
app.use('/api/login', loginRoute);
app.use('/api/protected', protectedRoute);
app.use('/api/messages', messageRoute);
app.use('/api/groups', groupsRoute);
app.use('/api/login-or-create-user', loginOrCreateUserRoute);
app.use('/api/users', userRoutes);

app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'login.html'));
});

// Socket.IO group chat handling
io.on('connection', (socket) => {
  console.log('New user connected:', socket.id);

  // Track groups this socket has joined
  socket.joinedGroups = new Set();

  // Save username on join (optional)
  socket.on('join', (username) => {
    if (!username) return;
    socket.username = username;
    console.log(`Socket ${socket.id} associated with username: ${username}`);
  });

  // Client requests groups for a user
  socket.on('getGroups', async (userId) => {
    try {
      if (!userId) {
        socket.emit('groupsList', []);
        return;
      }
      // Find all groups where user is a member
      const userGroups = await Group.findAll({
        include: [{
          model: User,
          as: 'Users',
          where: { id: userId },
          attributes: [],
          through: { attributes: [] }
        }],
        attributes: ['id', 'name'],
      });

      // Join rooms for all groups for message broadcasting
      userGroups.forEach(group => {
        socket.join(group.id.toString());
        socket.joinedGroups.add(group.id.toString());
      });

      // Send groups list back to client
      socket.emit('groupsList', userGroups.map(g => ({ id: g.id, name: g.name })));

    } catch (err) {
      console.error('Error fetching groups:', err);
      socket.emit('groupsList', []);
    }
  });

  // Handle incoming chat messages
  socket.on('chatMessage', async ({ user, text, groupId }) => {
    if (!user || !text || !groupId) return;

    try {
      // Find user record
      const userRecord = await User.findOne({ where: { name: user } });
      if (!userRecord) {
        console.error('User not found for message:', user);
        return;
      }

      // Check if user belongs to the group
      const membership = await GroupMember.findOne({
        where: { userId: userRecord.id, groupId }
      });
      if (!membership) {
        console.error(`User ${user} is not a member of group ${groupId}`);
        return;
      }

      // Save message to DB
      const message = await Message.create({
        content: text,
        userId: userRecord.id,
        groupId,
      });

      // Broadcast message to group room only
      io.to(groupId.toString()).emit('message', {
        user,
        text,
        groupId,
        createdAt: message.createdAt,
      });

    } catch (err) {
      console.error('Error saving or broadcasting message:', err);
    }
  });

  // Handle disconnects
  socket.on('disconnect', () => {
    console.log('User disconnected:', socket.id);
  });
});

// Sequelize sync & start server
 sequelize.sync({ force: true })
  .then(() => {
    const PORT = process.env.PORT || 4000;
    server.listen(PORT, () => {
      console.log(`✅ Server running on port ${PORT}`);
    });
  })
  .catch((err) => {
    console.error('❌ Database connection error:', err);
  });
