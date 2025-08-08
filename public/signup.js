document.getElementById("signupForm").addEventListener("submit", async function (e) {
    e.preventDefault();

    const name = document.getElementById("name").value.trim();
    const email = document.getElementById("email").value.trim();
    const phone = document.getElementById("phone").value.trim();
    const password = document.getElementById("password").value.trim();

    try {
        const response = await fetch("http://localhost:4000/signup", {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({ name, email, phone, password })
        });

        const data = await response.json();

        if (response.ok) {
            alert("✅ Successfully signed up!");
            // Redirect to login page
            window.location.href = "login.html";
        } else if (response.status === 409) {
            alert("⚠️ User already exists, Please Login");
            window.location.href = "login.html"; // Optional redirect
        } else {
            alert(data.message || "Signup failed");
        }
    } catch (err) {
        console.error("Error:", err);
        alert("❌ Error connecting to server");
    }
});
