const socket = io("http://localhost:4000", { transports: ["websocket"] });

const chatBox = document.getElementById("chatBox");
const messageForm = document.getElementById("messageForm");
const messageInput = document.getElementById("messageInput");
const userList = document.getElementById("userList");
const leaveBtn = document.getElementById("leaveBtn");

let onlineUsers = new Set();

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

socket.emit("join", username);

socket.on("recentMessages", (messages) => {
  chatBox.innerHTML = "";
  messages.forEach((msg) => {
    displayMessage({
      user: msg.user,
      text: msg.message,
      self: msg.user === username,
    });
  });
});

socket.on("chatMessage", (data) => {
  displayMessage({
    user: data.user,
    text: data.message,
    self: data.user === username,
  });
});

socket.on("userJoined", (data) => {
  displayNotification(data.message);
  addUserToList(data.user);
});

socket.on("userLeft", (data) => {
  displayNotification(data.message);
  removeUserFromList(data.user);
});

messageForm.addEventListener("submit", (e) => {
  e.preventDefault();
  const text = messageInput.value.trim();
  if (text) {
    socket.emit("chatMessage", text);
    messageInput.value = "";
    messageInput.focus();
  }
});

leaveBtn.addEventListener("click", () => {
  socket.emit("leave", username);
  localStorage.removeItem("username");
  window.location.reload();
});

function displayMessage({ user, text, self }) {
  const div = document.createElement("div");
  div.classList.add("message");
  div.classList.add(self ? "self" : "other");
  div.innerHTML = `<strong>${escapeHtml(user)}:</strong> ${escapeHtml(text)}`;
  chatBox.appendChild(div);
  chatBox.scrollTop = chatBox.scrollHeight;
}

function displayNotification(text) {
  const div = document.createElement("div");
  div.classList.add("notification");
  div.textContent = text;
  chatBox.appendChild(div);
  chatBox.scrollTop = chatBox.scrollHeight;
}

function addUserToList(user) {
  if (!onlineUsers.has(user)) {
    onlineUsers.add(user);
    renderUserList();
  }
}

function removeUserFromList(user) {
  if (onlineUsers.has(user)) {
    onlineUsers.delete(user);
    renderUserList();
  }
}

function renderUserList() {
  userList.innerHTML = "<h3>Online Users</h3>";
  onlineUsers.forEach((user) => {
    const span = document.createElement("span");
    span.textContent = user;
    userList.appendChild(span);
  });
}

function escapeHtml(text) {
  const div = document.createElement("div");
  div.textContent = text;
  return div.innerHTML;
}
