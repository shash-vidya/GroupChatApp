document.getElementById("signupForm").addEventListener("submit", async function (e) {
  e.preventDefault();

  const messageDiv = document.getElementById("message");
  messageDiv.textContent = "";

  const name = document.getElementById("name").value.trim();
  const email = document.getElementById("email").value.trim();
  const phone = document.getElementById("phone").value.trim();
  const password = document.getElementById("password").value.trim();

  if (!name || !email || !password) {
    messageDiv.textContent = "Please fill in name, email, and password.";
    return;
  }

  try {
    const response = await fetch("http://localhost:4000/api/signup", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, email, phone, password }),
    });

    const data = await response.json();

    if (response.ok) {
      alert("✅ Successfully signed up! Please login.");
      window.location.href = "login.html";
    } else if (response.status === 409) {
      messageDiv.textContent = "⚠️ User already exists, please login.";
    } else {
      messageDiv.textContent = data.message || "Signup failed. Please try again.";
    }
  } catch (err) {
    console.error("Error connecting to server:", err);
    messageDiv.textContent = "❌ Error connecting to server.";
  }
});
