document.addEventListener('DOMContentLoaded', () => {
  let username = localStorage.getItem('username');
  let userId = localStorage.getItem('userId') ? parseInt(localStorage.getItem('userId')) : null;
  let token = localStorage.getItem('token'); // Your auth token

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

  function showModal() {
    if (usernameModal) usernameModal.style.display = 'flex';
  }
  function hideModal() {
    if (usernameModal) usernameModal.style.display = 'none';
  }

  function displayMessage({ user, text, self = false, system = false, createdAt }) {
    if (!chatBox) return;

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

  function clearMessages() {
    if (chatBox) chatBox.innerHTML = '';
  }

  function renderGroups() {
    if (!groupList) return;
    groupList.innerHTML = '';
    groups.forEach(g => {
      const li = document.createElement('li');
      li.textContent = g.name;
      li.dataset.groupId = g.id;
      if (Number(g.id) === currentGroupId) li.classList.add('active');
      li.style.cursor = 'pointer';
      li.addEventListener('click', () => {
        if (currentGroupId !== Number(g.id)) selectGroup(g.id, g.name);
      });
      groupList.appendChild(li);
    });
  }

  async function selectGroup(groupId, groupName) {
    currentGroupId = Number(groupId);

    const currentGroupNameElem = document.getElementById('currentGroupName');
    if (currentGroupNameElem) currentGroupNameElem.textContent = groupName;

    if (messageInput) {
      messageInput.disabled = false;
      messageInput.focus();
    }
    if (messageForm) {
      const btn = messageForm.querySelector('button[type="submit"]');
      if (btn) {
        btn.disabled = false;
        btn.setAttribute('aria-disabled', 'false');
      }
    }
    if (leaveBtn) {
      leaveBtn.disabled = false;
      leaveBtn.setAttribute('aria-disabled', 'false');
    }

    localMessages = loadMessagesFromLocal(currentGroupId);
    clearMessages();
    localMessages.forEach(msg =>
      displayMessage({
        user: msg.user,
        text: msg.text,
        self: msg.user === username,
        createdAt: msg.createdAt,
      })
    );

    const lastCreatedAt = localMessages.length
      ? localMessages[localMessages.length - 1].createdAt
      : null;

    try {
      let url = `http://localhost:4000/api/messages/${currentGroupId}`;
      if (lastCreatedAt) {
        url += `?after=${encodeURIComponent(lastCreatedAt)}`;
      }

      const res = await fetch(url, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (res.ok) {
        const messages = await res.json();
        messages.forEach(msg => {
          const displayed = displayMessage({
            user: msg.User?.name || 'Unknown',
            text: msg.content,
            self: msg.User?.name === username,
            createdAt: msg.createdAt,
          });
          localMessages.push(displayed);
        });
        saveMessagesToLocal(currentGroupId, localMessages);
      } else {
        console.error('Failed to fetch new messages:', res.status);
      }
    } catch (err) {
      console.error('Error fetching new messages:', err);
    }
  }

  function saveMessagesToLocal(groupId, messages) {
    if (messages.length > 50) messages = messages.slice(messages.length - 50);
    localStorage.setItem(`chatMessages_${groupId}`, JSON.stringify(messages));
  }

  function loadMessagesFromLocal(groupId) {
    const msgs = localStorage.getItem(`chatMessages_${groupId}`);
    if (!msgs) return [];
    try {
      return JSON.parse(msgs);
    } catch {
      return [];
    }
  }

  function toggleGroupModal(show) {
    if (!groupModal || !newGroupNameInput) return;

    if (show) {
      groupModal.classList.remove('hidden');
      newGroupNameInput.value = '';
      newGroupNameInput.focus();
      if (saveGroupBtn) saveGroupBtn.disabled = false;
    } else {
      groupModal.classList.add('hidden');
    }
  }

  async function createGroup(groupName) {
    if (!userId || !token) {
      alert('User not logged in properly. Please login again.');
      return;
    }

    try {
      const res = await fetch('http://localhost:4000/api/groups', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ name: groupName, userIds: [userId], creatorId: userId }),
      });

      const data = await res.json();

      if (res.ok) {
        if (!data.group) {
          alert('Group data missing in response.');
          return;
        }
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

  let socket;

  function initChat() {
    socket = io('http://localhost:4000', {
      auth: {
        token: token
      }
    });

    socket.on('connect', () => {
      console.log('Socket connected:', socket.id);
      socket.emit('join', { username, userId });
      socket.emit('getGroups', userId);
    });

    socket.on('groupsList', userGroups => {
      groups = userGroups;
      renderGroups();
      if (groups.length > 0) selectGroup(groups[0].id, groups[0].name);
    });

    socket.on('message', msg => {
      if (Number(msg.groupId) !== Number(currentGroupId)) return;

      if (msg.user === 'System') {
        displayMessage({ user: 'System', text: msg.text, system: true });
        return;
      }

      const displayed = displayMessage({
        user: msg.user,
        text: msg.text,
        self: msg.user === username,
        createdAt: msg.createdAt,
      });
      localMessages.push(displayed);
      saveMessagesToLocal(currentGroupId, localMessages);
    });

    socket.on('updateUsers', updateOnlineUsers);

    socket.on('connect_error', err => {
      console.error('Socket connection error:', err);
    });

    socket.on('error', err => {
      console.error('Socket error:', err);
    });
  }

  function updateOnlineUsers(users) {
    if (!userList) return;
    userList.innerHTML = '';
    users.forEach(user => {
      const btn = document.createElement('button');
      btn.textContent = user;
      btn.disabled = true;
      userList.appendChild(btn);
    });
  }

  if (messageForm) {
    messageForm.addEventListener('submit', e => {
      e.preventDefault();
      if (!messageInput) return;
      const text = messageInput.value.trim();
      if (!text || !currentGroupId) return;

      if (!socket || !socket.connected) {
        alert('Socket not connected yet. Please wait.');
        return;
      }

      // Optimistically display message immediately in UI
      const displayed = displayMessage({
        user: username,
        text,
        self: true,
        createdAt: new Date().toISOString(),
      });
      localMessages.push(displayed);
      saveMessagesToLocal(currentGroupId, localMessages);

      // Send message to server
      socket.emit('chatMessage', { user: username, text, groupId: currentGroupId });

      messageInput.value = '';
    });
  }

  if (leaveBtn) {
    leaveBtn.addEventListener('click', () => {
      if (socket) socket.disconnect();
      localStorage.clear();
      alert('You have left the chat.');
      window.location.reload();
    });
  }

  if (createGroupBtn) createGroupBtn.addEventListener('click', () => toggleGroupModal(true));
  if (cancelGroupBtn) cancelGroupBtn.addEventListener('click', () => toggleGroupModal(false));
  if (saveGroupBtn) {
    saveGroupBtn.addEventListener('click', () => {
      if (!newGroupNameInput) return;
      const groupName = newGroupNameInput.value.trim();
      if (!groupName) {
        alert('Please enter a group name');
        return;
      }
      createGroup(groupName);
    });
  }

  if (usernameSubmitBtn) {
    usernameSubmitBtn.addEventListener('click', () => {
      if (!usernameInput) return;
      const name = usernameInput.value.trim();
      if (name) {
        username = name;
        localStorage.setItem('username', username);

        // You need to set userId and token here after login or signup flow.
        // Example: localStorage.setItem('userId', <id>);
        // Example: localStorage.setItem('token', <token>);

        hideModal();
        initChat();
      } else {
        alert('Please enter your name');
      }
    });
  }

  if (usernameInput) {
    usernameInput.addEventListener('keypress', e => {
      if (e.key === 'Enter') {
        e.preventDefault();
        if (usernameSubmitBtn) usernameSubmitBtn.click();
      }
    });
  }

  if (!username || !userId || !token) {
    showModal();
  } else {
    hideModal();
    initChat();
  }
});
