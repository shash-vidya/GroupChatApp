
document.addEventListener('DOMContentLoaded', () => {
  let username = localStorage.getItem('username');
  let userId = localStorage.getItem('userId') ? parseInt(localStorage.getItem('userId')) : null;
  let token = localStorage.getItem('token');

  // --- DOM Elements ---
  const usernameModal = document.getElementById('usernameModal');
  const usernameInput = document.getElementById('usernameInput');
  const usernameSubmitBtn = document.getElementById('usernameSubmitBtn');

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

  const addUserModal = document.getElementById('addUserModal'); // create this modal in HTML
  const addUserInput = document.getElementById('addUserInput');
  const addUserBtn = document.getElementById('addUserBtn');
  const cancelAddUserBtn = document.getElementById('cancelAddUserBtn');

  let currentGroupId = null;
  let groups = [];
  let localMessages = [];
  let socket;
  let amIAdminInGroup = false;

  // --- Helper Functions ---
  function showModal(modal) { modal.style.display = 'flex'; }
  function hideModal(modal) { modal.style.display = 'none'; }

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
    if (self) div.classList.add('self');
    else if (!system) div.classList.add('other');
    if (system) div.classList.add('system');

    div.textContent = system ? `📢 ${text}` : `${username}: ${text}`;

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
      li.addEventListener('click', () => { switchGroup(g.id); });
      groupList.appendChild(li);
    });
  }

  async function refreshAdminFlag() {
    if (!currentGroupId) return;
    try {
      const res = await fetch(`http://localhost:4000/api/groups/${currentGroupId}/is-admin`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json();
      amIAdminInGroup = !!data.isAdmin;
    } catch { amIAdminInGroup = false; }

    const groupName = groups.find(g => g.id === currentGroupId)?.name || '';
    setGroupTitle(groupName, amIAdminInGroup);
    await refreshMembers();
  }

  async function refreshMembers() {
    if (!currentGroupId) return;
    try {
      const res = await fetch(`http://localhost:4000/api/groups/${currentGroupId}/members`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const members = await res.json();
      renderMembers(members);
    } catch (err) { console.log('Failed to load members:', err.message); }
  }

  function renderMembers(members) {
    userList.innerHTML = '';
    const h = document.createElement('h3');
    h.textContent = 'Members';
    userList.appendChild(h);

    members.forEach(m => {
      const div = document.createElement('div');
      div.textContent = `${m.name} ${m.is_admin ? '(Admin)' : ''}`;

      if (amIAdminInGroup) {
        // Add buttons for admin actions
        const btnMakeAdmin = document.createElement('button');
        btnMakeAdmin.textContent = 'Make Admin';
        btnMakeAdmin.disabled = m.is_admin; // disable if already admin
        btnMakeAdmin.style.marginLeft = '10px';
        btnMakeAdmin.addEventListener('click', () => makeAdmin(m.id));

        const btnRemove = document.createElement('button');
        btnRemove.textContent = 'Remove';
        btnRemove.style.marginLeft = '5px';
        btnRemove.addEventListener('click', () => removeUser(m.id));

        div.appendChild(btnMakeAdmin);
        div.appendChild(btnRemove);
      }

      userList.appendChild(div);
    });

    // Add user button for admin
    if (amIAdminInGroup) {
      const addBtn = document.createElement('button');
      addBtn.textContent = 'Add User';
      addBtn.style.display = 'block';
      addBtn.style.marginTop = '10px';
      addBtn.addEventListener('click', () => showModal(addUserModal));
      userList.appendChild(addBtn);
    }
  }

  async function switchGroup(newGroupId) {
    if (currentGroupId === newGroupId) return;
    currentGroupId = newGroupId;
    localMessages = loadMessagesFromLocal(currentGroupId);
    renderMessages();
    await refreshAdminFlag();
    if (socket && socket.connected) socket.emit('joinRoom', currentGroupId.toString());
  }

  async function initChat() {
    if (!token) { showModal(usernameModal); return; }

    socket = io('http://localhost:4000', { auth: { token } });

    socket.on('connect', fetchGroups);

    socket.on('connect_error', (err) => {
      console.error('Auth error:', err.message);
      if (err.message.includes('jwt expired') || err.message.includes('jwt malformed')) {
        alert('Session expired. Please log in again.');
        localStorage.clear();
        location.reload();
      }
    });

    socket.on('message', data => {
      if (data.groupId != currentGroupId) return;
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

    messageForm.addEventListener('submit', e => {
      e.preventDefault();
      if (!messageInput.value.trim() || !currentGroupId || !socket) return;
      socket.emit('sendMessage', { groupId: currentGroupId, text: messageInput.value.trim() });
      messageInput.value = '';
    });

    messageInput.disabled = false;
    messageForm.querySelector('button').disabled = false;
  }

  async function fetchGroups() {
    try {
      const res = await fetch(`http://localhost:4000/api/groups/user/groups`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      groups = await res.json();
      renderGroups();
      if (groups.length > 0) switchGroup(groups[0].id);
    } catch (err) { console.error('Failed to fetch groups:', err.message); }
  }

  // --- Admin Actions ---
  async function addUserToGroup(newUserName) {
    try {
      const res = await fetch(`http://localhost:4000/api/groups/search-users?q=${encodeURIComponent(newUserName)}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const users = await res.json();
      if (!users.length) return alert('User not found');

      const newUserId = users[0].id;

      await fetch(`http://localhost:4000/api/groups/${currentGroupId}/addUser`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({ userId: newUserId })
      });
      hideModal(addUserModal);
      addUserInput.value = '';
      await refreshMembers();
    } catch (err) {
      alert('Failed to add user: ' + err.message);
    }
  }

  async function makeAdmin(targetUserId) {
    try {
      await fetch(`http://localhost:4000/api/groups/${currentGroupId}/makeAdmin`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({ userId: targetUserId })
      });
      await refreshMembers();
    } catch (err) {
      alert('Failed to make admin: ' + err.message);
    }
  }

  async function removeUser(targetUserId) {
    try {
      await fetch(`http://localhost:4000/api/groups/${currentGroupId}/removeUser`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({ userId: targetUserId })
      });
      await refreshMembers();
    } catch (err) {
      alert('Failed to remove user: ' + err.message);
    }
  }

  // --- Event Listeners ---
  usernameSubmitBtn.addEventListener('click', () => setUsername(usernameInput.value));
  usernameInput.addEventListener('keydown', e => { if (e.key === 'Enter') setUsername(usernameInput.value); });

  leaveBtn.addEventListener('click', () => { localStorage.clear(); location.reload(); });

  createGroupBtn.addEventListener('click', () => {
    groupModal.classList.remove('hidden');
    newGroupNameInput.value = '';
    newGroupNameInput.focus();
  });

  saveGroupBtn.addEventListener('click', async () => {
    const groupName = newGroupNameInput.value.trim();
    if (!groupName) { alert('Enter group name'); return; }
    try {
      await fetch(`http://localhost:4000/api/groups`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({ name: groupName })
      });
      await fetchGroups();
      groupModal.classList.add('hidden');
    } catch (err) { alert('Failed to create group: ' + err.message); }
  });

  cancelGroupBtn.addEventListener('click', () => groupModal.classList.add('hidden'));

  addUserBtn.addEventListener('click', () => addUserToGroup(addUserInput.value));
  cancelAddUserBtn.addEventListener('click', () => hideModal(addUserModal));

  // --- Initialize ---
  if (!username || !userId || !token) showModal(usernameModal);
  else { hideModal(usernameModal); initChat(); }
});
