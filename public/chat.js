document.addEventListener('DOMContentLoaded', () => {
  let username = localStorage.getItem('username');
  let userId = localStorage.getItem('userId') ? parseInt(localStorage.getItem('userId')) : null;
  let token = localStorage.getItem('token');  // Your auth token

  // Modal elements
  const usernameModal = document.getElementById('usernameModal');
  const usernameInput = document.getElementById('usernameInput');
  const usernameSubmitBtn = document.getElementById('usernameSubmitBtn');

  // Chat UI elements
  const chatBox = document.getElementById('chatBox');
  const userList = document.getElementById('userList');
  const groupList = document.getElementById('groupList');
  const messageForm = document.getElementById('messageForm');
  const messageInput = document.getElementById('messageInput');
  const leaveBtn = document.getElementById('leaveBtn');
  const createGroupBtn = document.getElementById('createGroupBtn');
  const groupModal = document.getElementById('groupModal');
  const newGroupNameInput = document.getElementById('newGroupName');
  const saveGroupBtn = document.getElementById('saveGroupBtn');
  const cancelGroupBtn = document.getElementById('cancelGroupBtn');

  let currentGroupId = null;
  let groups = [];
  let localMessages = [];

  // Show/hide modal
  function showModal() { usernameModal.style.display = 'flex'; }
  function hideModal() { usernameModal.style.display = 'none'; }

  // Fetch user ID by username
  async function fetchUserIdByUsername(name) {
    const res = await fetch(`http://localhost:4000/api/users?name=${encodeURIComponent(name)}`, {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });
    if (!res.ok) throw new Error('User not found');
    const users = await res.json();
    if (!users.length) throw new Error('User not found');
    return users[0].id;
  }

  // Set username and userId then init chat
  async function setUsername(name) {
    if (name && name.trim() !== '') {
      username = name.trim();
      try {
        userId = await fetchUserIdByUsername(username);
        localStorage.setItem('username', username);
        localStorage.setItem('userId', userId);
        hideModal();
        initChat();
      } catch (err) {
        alert('User not found in database. Please register first.');
      }
    } else {
      alert('You must enter a name to chat');
    }
  }

  // Save/load messages locally (limit last 50)
  function saveMessagesToLocal(groupId, messages) {
    if (messages.length > 50) messages = messages.slice(messages.length - 50);
    localStorage.setItem(`chatMessages_${groupId}`, JSON.stringify(messages));
  }
  function loadMessagesFromLocal(groupId) {
    const msgs = localStorage.getItem(`chatMessages_${groupId}`);
    if (!msgs) return [];
    try { return JSON.parse(msgs); } catch { return []; }
  }

  // Display a chat message
  function displayMessage({ user, text, self = false, system = false, createdAt }) {
    const div = document.createElement('div');
    div.classList.add('message');
    if (system) {
      div.classList.add('system');
      div.textContent = `📢 ${text}`;
    } else if (self) {
      div.classList.add('self');
      div.textContent = `${user}: ${text}`;
    } else {
      div.classList.add('other');
      div.textContent = `${user}: ${text}`;
    }
    chatBox.appendChild(div);
    chatBox.scrollTop = chatBox.scrollHeight;

    return { user, text, createdAt: createdAt || new Date().toISOString() };
  }

  // Clear chat messages
  function clearMessages() {
    chatBox.innerHTML = '';
  }

  // Update online users list
  function updateOnlineUsers(users) {
    userList.innerHTML = '';
    users.forEach(user => {
      const btn = document.createElement('button');
      btn.textContent = user;
      btn.disabled = true;
      userList.appendChild(btn);
    });
  }

  // Render groups list
  function renderGroups() {
    groupList.innerHTML = '';
    groups.forEach(g => {
      const li = document.createElement('li');
      li.textContent = g.name;
      li.dataset.groupId = g.id;
      if (g.id === currentGroupId) li.classList.add('active');
      li.addEventListener('click', () => {
        if (currentGroupId !== g.id) selectGroup(g.id, g.name);
      });
      groupList.appendChild(li);
    });
  }

  // Select a group and load messages
  async function selectGroup(groupId, groupName) {
    currentGroupId = groupId;
    const currentGroupNameElem = document.getElementById('currentGroupName');
    if (currentGroupNameElem) currentGroupNameElem.textContent = groupName;

    messageInput.disabled = false;
    messageForm.querySelector('button').disabled = false;

    localMessages = loadMessagesFromLocal(groupId);
    clearMessages();

    localMessages.forEach(msg => displayMessage({
      user: msg.user,
      text: msg.text,
      self: msg.user === username,
      createdAt: msg.createdAt
    }));

    // Fetch new messages after last one
    let lastCreatedAt = localMessages.length ? localMessages[localMessages.length - 1].createdAt : null;

    try {
      const url = lastCreatedAt
        ? `http://localhost:4000/api/messages/${groupId}?after=${encodeURIComponent(lastCreatedAt)}&userId=${userId}`
        : `http://localhost:4000/api/messages/${groupId}?userId=${userId}`;

      const res = await fetch(url, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      if (res.ok) {
        const messages = await res.json();
        messages.forEach(msg => {
          const displayed = displayMessage({
            user: msg.User?.name || 'Unknown',
            text: msg.content,
            self: msg.User?.name === username,
            createdAt: msg.createdAt
          });
          localMessages.push(displayed);
        });
        saveMessagesToLocal(groupId, localMessages);
      } else {
        console.error('Failed to fetch new messages:', res.status);
      }
    } catch (err) {
      console.error('Error fetching new messages:', err);
    }
  }

  // Show/hide create group modal
  function toggleGroupModal(show) {
    if (show) {
      groupModal.classList.remove('hidden');
      newGroupNameInput.value = '';
    } else {
      groupModal.classList.add('hidden');
    }
  }

  // Create group API call with error handling and debug logs
  async function createGroup(groupName) {
    try {
      if (!userId) {
        alert('User ID missing. Please login again.');
        return;
      }
      console.log('Creating group:', groupName, 'UserId:', userId);
      const res = await fetch('http://localhost:4000/api/groups', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ name: groupName, userIds: [userId] })
      });
      console.log('Create group response status:', res.status);
      if (res.ok) {
        const data = await res.json();
        groups.push(data.group);
        renderGroups();
        selectGroup(data.group.id, data.group.name);
        toggleGroupModal(false);
      } else if (res.status === 409) {
        alert('Group name already exists. Please choose another.');
      } else {
        alert('Failed to create group. Status: ' + res.status);
      }
    } catch (err) {
      console.error('Create group error:', err);
      alert('Failed to create group. See console for details.');
    }
  }

  // Declare socket variable here, so accessible in submit event
  let socket;

  // Initialize socket and chat
  function initChat() {
    socket = io('http://localhost:4000');

    socket.on('connect', () => {
      console.log('Socket connected:', socket.id);
      socket.emit('join', username);
      socket.emit('getGroups', userId); // Request groups for user
    });

    socket.on('groupsList', (userGroups) => {
      groups = userGroups;
      renderGroups();
      if (groups.length > 0) selectGroup(groups[0].id, groups[0].name);
    });

    socket.on('message', (msg) => {
      // Ignore messages not for current group
      if (msg.groupId !== currentGroupId) return;

      if (msg.user === 'System') {
        displayMessage({ user: 'System', text: msg.text, system: true });
        return;
      }

      const displayed = displayMessage({
        user: msg.user,
        text: msg.text,
        self: msg.user === username,
        createdAt: new Date().toISOString(),
      });
      localMessages.push(displayed);
      saveMessagesToLocal(currentGroupId, localMessages);
    });

    socket.on('updateUsers', updateOnlineUsers);

    socket.on('connect_error', (err) => {
      console.error('Socket connection error:', err);
    });

    socket.on('error', (err) => {
      console.error('Socket error:', err);
    });
  }

  // Send message form event listener (added once outside initChat)
  messageForm.addEventListener('submit', (e) => {
    e.preventDefault();
    const text = messageInput.value.trim();
    if (!text || !currentGroupId) return;

    if (!socket || !socket.connected) {
      alert('Socket not connected yet. Please wait.');
      return;
    }

    // Emit chatMessage with user, text, and groupId
    socket.emit('chatMessage', { user: username, text, groupId: currentGroupId });
    messageInput.value = '';
  });

  // Leave chat button
  leaveBtn.addEventListener('click', () => {
    localStorage.removeItem('username');
    localStorage.removeItem('userId');
    localStorage.removeItem('token');  // Remove token on logout
    localStorage.clear();
    alert('You have left the chat.');
    window.location.reload();
  });

  // Group modal buttons
  createGroupBtn.addEventListener('click', () => toggleGroupModal(true));
  cancelGroupBtn.addEventListener('click', () => toggleGroupModal(false));
  saveGroupBtn.addEventListener('click', () => {
    const groupName = newGroupNameInput.value.trim();
    if (!groupName) {
      alert('Please enter a group name');
      return;
    }
    createGroup(groupName);
  });

  // Username submit button
  usernameSubmitBtn.addEventListener('click', () => {
    const name = usernameInput.value.trim();
    setUsername(name);
  });

  // Also allow Enter key in username input to submit
  usernameInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      usernameSubmitBtn.click();
    }
  });

  // Start: show modal or init chat
  if (!username || !userId || !token) {
    showModal();
  } else {
    hideModal();
    initChat();
  }
});
