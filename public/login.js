document.getElementById("loginForm").addEventListener("submit", async (e) => {
  e.preventDefault();

  const email = document.getElementById("email").value.trim();
  const password = document.getElementById("password").value.trim();

  if (!email || !password) {
    alert("Please fill in all fields.");
    return;
  }

  try {
    const res = await fetch("http://localhost:4000/api/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
    });

    // Try to parse JSON only if content-type is JSON
    let data = null;
    const contentType = res.headers.get("content-type");
    if (contentType && contentType.includes("application/json")) {
      data = await res.json();
    }

    if (!res.ok) {
      alert(data?.message || "Login failed");
      return;
    }

    alert("✅ Login successful!");
    localStorage.setItem("token", data.token);
    window.location.href = "chat.html";
  } catch (err) {
    console.error("Error:", err);
    alert("Error connecting to server");
  }
});
