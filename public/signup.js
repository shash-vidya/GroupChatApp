document.getElementById("signupForm").addEventListener("submit", async function (e) {
  e.preventDefault();

  // Collect and trim input values
  const name = document.getElementById("name").value.trim();
  const email = document.getElementById("email").value.trim();
  const phone = document.getElementById("phone").value.trim();
  const password = document.getElementById("password").value.trim();

  // Simple client-side validation (optional but helpful)
  if (!name || !email || !password) {
    alert("Please fill in name, email, and password.");
    return;
  }

  // Log data to check correctness before sending
  console.log({ name, email, phone, password });

  try {
    const response = await fetch("http://localhost:4000/api/signup", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({ name, email, phone, password })
    });

    // Parse response JSON safely
    const data = await response.json();

    if (response.ok) {
      alert("✅ Successfully signed up!");
      window.location.href = "login.html";
    } else if (response.status === 409) {
      alert("⚠️ User already exists, Please Login");
      window.location.href = "login.html";
    } else {
      alert(data.message || "Signup failed");
    }
  } catch (err) {
    console.error("Error connecting to server:", err);
    alert("❌ Error connecting to server");
  }
});
