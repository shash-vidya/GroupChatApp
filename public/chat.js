const loginScreen = document.getElementById('loginScreen');
const chatScreen = document.getElementById('chatScreen');
const usernameInput = document.getElementById('usernameInput');
const joinBtn = document.getElementById('joinBtn');
const chatContainer = document.getElementById('chatContainer');
const messageInput = document.getElementById('messageInput');
const sendBtn = document.getElementById('sendBtn');

let socket;
let username;

function addMessage(user, text) {
  const div = document.createElement('div');
  div.classList.add('message');
  div.classList.add(user === username ? 'self' : 'other');

  const userSpan = document.createElement('div');
  userSpan.classList.add('username');
  userSpan.textContent = user;

  const msgSpan = document.createElement('div');
  msgSpan.textContent = text;

  div.appendChild(userSpan);
  div.appendChild(msgSpan);

  chatContainer.appendChild(div);
  chatContainer.scrollTop = chatContainer.scrollHeight;
}

function addNotification(text) {
  const div = document.createElement('div');
  div.classList.add('notification');
  div.textContent = text;
  chatContainer.appendChild(div);
  chatContainer.scrollTop = chatContainer.scrollHeight;
}

joinBtn.onclick = () => {
  const name = usernameInput.value.trim();
  if (!name) {
    alert('Please enter a username');
    return;
  }
  username = name;
  loginScreen.classList.add('hidden');
  chatScreen.classList.remove('hidden');

  socket = io('http://localhost:4000');

  socket.emit('join', username);

  socket.on('chatHistory', (messages) => {
    chatContainer.innerHTML = '';
    messages.forEach((msg) => {
      if (msg.type === 'notification') {
        addNotification(msg.text);
      } else if (msg.type === 'message') {
        addMessage(msg.user, msg.text);
      }
    });
  });

  socket.on('message', ({ user, text }) => {
    addMessage(user, text);
  });

  socket.on('notification', (text) => {
    addNotification(text);
  });
};

sendBtn.onclick = () => {
  const msg = messageInput.value.trim();
  if (!msg) return;

  socket.emit('chatMessage', msg);

  messageInput.value = '';
  messageInput.focus();
};

messageInput.addEventListener('keydown', (e) => {
  if (e.key === 'Enter') {
    sendBtn.click();
  }
});
