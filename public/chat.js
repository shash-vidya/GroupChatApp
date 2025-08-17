document.addEventListener('DOMContentLoaded', () => {
  // User info and token from localStorage
  let username = localStorage.getItem('username');
  let userId = localStorage.getItem('userId') ? parseInt(localStorage.getItem('userId')) : null;
  let token = localStorage.getItem('token');

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
  const currentGroupNameElem = document.getElementById('currentGroupName');

  let currentGroupId = null;
  let groups = [];
  let localMessages = [];
  let socket;
  let amIAdminInGroup = false;

  function showModal() { usernameModal.style.display = 'flex'; }
  function hideModal() { usernameModal.style.display = 'none'; }

  async function fetchUserIdByUsername(name) {
    const res = await fetch(`http://localhost:4000/api/users?name=${encodeURIComponent(name)}`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    if (!res.ok) throw new Error(await res.text());
    const users = await res.json();
    if (!users.length) throw new Error('User not found');
    return users[0].id;
  }

  async function setUsername(name) {
    if (!name || name.trim() === '') {
      alert('You must enter a name to chat');
      return;
    }
    username = name.trim();
    try {
      userId = await fetchUserIdByUsername(username);
      localStorage.setItem('username', username);
      localStorage.setItem('userId', userId);
      hideModal();
      await initChat();
    } catch (err) {
      alert('User not found in database. Please register first.');
    }
  }

  function saveMessagesToLocal(groupId, messages) {
    if (messages.length > 50) messages = messages.slice(-50);
    localStorage.setItem(`chatMessages_${groupId}`, JSON.stringify(messages));
  }
  function loadMessagesFromLocal(groupId) {
    const msgs = localStorage.getItem(`chatMessages_${groupId}`);
    if (!msgs) return [];
    try { return JSON.parse(msgs); } catch { return []; }
  }

  function setGroupTitle(name, isAdmin) {
    currentGroupNameElem.innerHTML = '';
    const span = document.createElement('span');
    span.textContent = name;
    currentGroupNameElem.appendChild(span);

    if (isAdmin) {
      const badge = document.createElement('span');
      badge.textContent = ' 👑 Admin';
      badge.style.marginLeft = '8px';
      badge.style.fontSize = '0.9rem';
      badge.style.color = '#d97706';
      currentGroupNameElem.appendChild(badge);
    }
  }

  function displayMessage({ username, text, self = false, system = false, createdAt }) {
    const div = document.createElement('div');
    div.classList.add('message');
    if (system) {
      div.classList.add('system');
      div.textContent = `📢 ${text}`;
    } else if (self) {
      div.classList.add('self');
      div.textContent = `${username}: ${text}`;
    } else {
      div.classList.add('other');
      div.textContent = `${username}: ${text}`;
    }
    if (createdAt) {
      const timeSpan = document.createElement('span');
      timeSpan.style.fontSize = '0.75rem';
      timeSpan.style.opacity = '0.6';
      timeSpan.style.display = 'block';
      timeSpan.style.marginTop = '4px';
      timeSpan.textContent = new Date(createdAt).toLocaleTimeString();
      div.appendChild(timeSpan);
    }
    chatBox.appendChild(div);
    chatBox.scrollTop = chatBox.scrollHeight;
  }

  function renderMessages() {
    chatBox.innerHTML = '';
    localMessages.forEach(m => displayMessage(m));
  }

  function renderGroups() {
    groupList.innerHTML = '';
    groups.forEach(g => {
      const li = document.createElement('li');
      li.textContent = g.name;
      li.dataset.groupId = g.id;
      if (g.id === currentGroupId) li.classList.add('active');
      li.addEventListener('click', () => {
        if (currentGroupId !== g.id) switchGroup(g.id);
      });
      groupList.appendChild(li);
    });
  }

  function renderMembers(members) {
    userList.innerHTML = '';
    const h = document.createElement('h3');
    h.textContent = 'Members';
    userList.appendChild(h);

    if (amIAdminInGroup) {
      const tools = document.createElement('div');
      tools.style.marginBottom = '10px';

      const input = document.createElement('input');
      input.type = 'text';
      input.placeholder = 'Search user by name...';
      input.style.marginRight = '6px';

      const addBtn = document.createElement('button');
      addBtn.textContent = 'Add user';
      addBtn.addEventListener('click', async () => {
        const q = input.value.trim();
        if (!q) return;
        try {
          // FIXED: global search (not group-based)
          const res = await fetch(`http://localhost:4000/api/groups/search-users?q=${encodeURIComponent(q)}`, {
            headers: { 'Authorization': `Bearer ${token}` }
          });
          if (!res.ok) throw new Error(await res.text());

          const results = await res.json();
          if (!results.length) { alert('No users found'); return; }
          const picked = results[0];

          const addRes = await fetch(`http://localhost:4000/api/groups/${currentGroupId}/addUser`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({ userId: picked.id })
          });
          if (!addRes.ok) throw new Error(await addRes.text());

          await refreshMembers();
          input.value = '';
        } catch (err) {
          alert(err.message);
        }
      });

      tools.appendChild(input);
      tools.appendChild(addBtn);
      userList.appendChild(tools);
    }

    members.forEach(m => {
      const row = document.createElement('div');
      row.style.display = 'flex';
      row.style.alignItems = 'center';
      row.style.justifyContent = 'space-between';
      row.style.padding = '6px 0';
      row.style.borderBottom = '1px solid #eee';

      const left = document.createElement('div');
      left.textContent = `${m.name || 'User ' + m.userId}`;
      if (m.isAdmin) {
        const crown = document.createElement('span');
        crown.textContent = ' 👑';
        left.appendChild(crown);
      }

      const right = document.createElement('div');
      if (amIAdminInGroup && m.userId !== userId) {
        if (!m.isAdmin) {
          const mk = document.createElement('button');
          mk.textContent = 'Make admin';
          mk.style.marginRight = '6px';
          mk.addEventListener('click', async () => {
            const res = await fetch(`http://localhost:4000/api/groups/${currentGroupId}/makeAdmin`, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
              },
              body: JSON.stringify({ userId: m.userId })
            });
            if (!res.ok) alert(await res.text());
            await refreshMembers();
          });
          right.appendChild(mk);
        }
        const rm = document.createElement('button');
        rm.textContent = 'Remove';
        rm.addEventListener('click', async () => {
          const res = await fetch(`http://localhost:4000/api/groups/${currentGroupId}/removeUser`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({ userId: m.userId })
          });
          if (!res.ok) alert(await res.text());
          await refreshMembers();
        });
        right.appendChild(rm);
      }

      row.appendChild(left);
      row.appendChild(right);
      userList.appendChild(row);
    });
  }

  async function refreshAdminFlag() {
    if (!currentGroupId) return;
    try {
      const res = await fetch(`http://localhost:4000/api/groups/${currentGroupId}/is-admin`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (!res.ok) throw new Error(await res.text());
      const data = await res.json();
      amIAdminInGroup = !!data.isAdmin;
    } catch {
      amIAdminInGroup = false;
    }
    const groupName = groups.find(g => g.id === currentGroupId)?.name || '';
    setGroupTitle(groupName, amIAdminInGroup);
  }

  async function refreshMembers() {
    if (!currentGroupId) return;
    const res = await fetch(`http://localhost:4000/api/groups/${currentGroupId}/members`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    if (!res.ok) return alert(await res.text());
    const members = await res.json();
    renderMembers(members);
  }

  async function switchGroup(newGroupId) {
    if (currentGroupId === newGroupId) return;
    currentGroupId = newGroupId;
    localMessages = loadMessagesFromLocal(currentGroupId);
    renderMessages();
    await refreshAdminFlag();
    await refreshMembers();
  }

  async function initChat() {
    socket = io('http://localhost:4000', { auth: { token } });

    socket.on('connect', () => {
      console.log('✅ Connected to socket server');
      socket.emit('join', username);
      socket.emit('getGroups', userId);
    });

    socket.on('disconnect', () => {
      console.log('❌ Disconnected from socket server');
    });

    socket.on('groupsList', list => {
      groups = list || [];
      renderGroups();
      if (groups.length) {
        switchGroup(groups[0].id);
      }
    });

    socket.on('message', data => {
      if (data.groupId !== currentGroupId) return;

      const msg = {
        username: data.username,
        text: data.text,
        self: data.userId === userId,
        createdAt: data.createdAt
      };

      localMessages.push(msg);
      saveMessagesToLocal(currentGroupId, localMessages);
      displayMessage(msg);
    });

    messageInput.disabled = false;
    messageForm.querySelector('button').disabled = false;
  }

  // Username modal events
  usernameSubmitBtn.addEventListener('click', () => setUsername(usernameInput.value));
  usernameInput.addEventListener('keydown', e => {
    if (e.key === 'Enter') setUsername(usernameInput.value);
  });

  // Send a message
  messageForm.addEventListener('submit', e => {
    e.preventDefault();
    if (!messageInput.value.trim() || !currentGroupId || !socket) return;
    const text = messageInput.value.trim();
    socket.emit('sendMessage', { groupId: currentGroupId, userId, username, text });
    messageInput.value = '';
  });

  // Leave chat
  leaveBtn.addEventListener('click', () => {
    localStorage.clear();
    location.reload();
  });

  // Create group
  createGroupBtn.addEventListener('click', () => {
    groupModal.classList.remove('hidden');
    newGroupNameInput.value = '';
    newGroupNameInput.focus();
  });

  // Save new group
  saveGroupBtn.addEventListener('click', async () => {
    const groupName = newGroupNameInput.value.trim();
    if (!groupName) {
      alert('Please enter a group name');
      return;
    }
    try {
      const res = await fetch(`http://localhost:4000/api/groups`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ name: groupName, userIds: [userId] })
      });
      if (!res.ok) throw new Error(await res.text());
      await res.json();
      socket.emit('getGroups', userId); // refresh group list
      groupModal.classList.add('hidden');
    } catch (err) {
      alert('Failed to create group: ' + err.message);
    }
  });

  cancelGroupBtn.addEventListener('click', () => {
    groupModal.classList.add('hidden');
  });

  if (!username || !userId || !token) {
    showModal();
  } else {
    hideModal();
    initChat();
  }
});
