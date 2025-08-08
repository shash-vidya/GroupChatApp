document.getElementById("loginForm").addEventListener("submit", async function (e) {
    e.preventDefault();

    const email = document.getElementById("email").value.trim();
    const password = document.getElementById("password").value.trim();

    try {
        const response = await fetch("http://localhost:4000/login", {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({ email, password })
        });

        const data = await response.json();

        if (response.ok) {
            alert("✅ Login successful!");
            localStorage.setItem("token", data.token); // Save JWT
            window.location.href = "chat.html"; // Redirect after login
        } else {
            alert(data.message || "❌ Invalid email or password");
        }
    } catch (err) {
        console.error("Error:", err);
        alert("❌ Error connecting to server");
    }
});
