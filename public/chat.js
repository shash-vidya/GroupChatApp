const socket = io("http://localhost:4000", { transports: ["websocket"] });

const chatBox = document.getElementById("chatBox");
const messageForm = document.getElementById("messageForm");
const messageInput = document.getElementById("messageInput");
const userList = document.getElementById("userList");
const leaveBtn = document.getElementById("leaveBtn");

// Manage list of online users locally
let onlineUsers = new Set();

// Get username from localStorage or prompt user
let username = localStorage.getItem("username");
if (!username) {
  username = prompt("Enter your name:");
  if (!username || username.trim() === "") {
    alert("Username is required!");
    window.location.reload();
  } else {
    localStorage.setItem("username", username);
  }
}

// Join chat and send username to server
socket.emit("join", username);

// Listen for recent messages on connection
socket.on("recentMessages", (messages) => {
  chatBox.innerHTML = ""; // clear existing messages
  messages.forEach((msg) => {
    displayMessage({
      user: msg.user,
      text: msg.message,
      self: msg.user === username,
    });
  });
});

// Listen for new chat messages
socket.on("chatMessage", (data) => {
  displayMessage({
    user: data.user,
    text: data.message,
    self: data.user === username,
  });
});

// Listen for user joined notifications
socket.on("userJoined", (data) => {
  displayNotification(data.message);
  addUserToList(data.user);
});

// Listen for user left notifications
socket.on("userLeft", (data) => {
  displayNotification(data.message);
  removeUserFromList(data.user);
});

// Listen for updated user list (optional)
socket.on("userList", (users) => {
  onlineUsers = new Set(users);
  renderUserList();
});

// Send chat message on form submit
messageForm.addEventListener("submit", (e) => {
  e.preventDefault();
  const text = messageInput.value.trim();
  if (text) {
    socket.emit("chatMessage", text);
    messageInput.value = "";
    messageInput.focus();
  }
});

// Leave chat button
leaveBtn.addEventListener("click", () => {
  socket.emit("leave", username);
  localStorage.removeItem("username");
  window.location.reload();
});

// Display a chat message
function displayMessage({ user, text, self }) {
  const div = document.createElement("div");
  div.classList.add("message");
  div.classList.add(self ? "self" : "other");
  div.innerHTML = `<strong>${user}:</strong> ${escapeHtml(text)}`;
  chatBox.appendChild(div);
  chatBox.scrollTop = chatBox.scrollHeight;
}

// Display join/leave notifications
function displayNotification(text) {
  const div = document.createElement("div");
  div.classList.add("notification");
  div.textContent = text;
  chatBox.appendChild(div);
  chatBox.scrollTop = chatBox.scrollHeight;
}

// Add user to online users set and update UI
function addUserToList(user) {
  if (!onlineUsers.has(user)) {
    onlineUsers.add(user);
    renderUserList();
  }
}

// Remove user from online users set and update UI
function removeUserFromList(user) {
  if (onlineUsers.has(user)) {
    onlineUsers.delete(user);
    renderUserList();
  }
}

// Render the user list UI
function renderUserList() {
  userList.innerHTML = "<h3>Online Users</h3>";
  onlineUsers.forEach((user) => {
    const span = document.createElement("span");
    span.textContent = user;
    userList.appendChild(span);
  });
}

// Basic HTML escaping to avoid injection
function escapeHtml(text) {
  const div = document.createElement("div");
  div.textContent = text;
  return div.innerHTML;
}
