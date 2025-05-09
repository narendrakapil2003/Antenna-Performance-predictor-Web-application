
document.addEventListener("DOMContentLoaded", () => {
  const loginForm = document.getElementById("login-form");
  const registerForm = document.getElementById("register-form");
  const predictForm = document.getElementById("predict-form");

  if (loginForm) {
    loginForm.addEventListener("submit", async (e) => {
      e.preventDefault();
      const username = document.getElementById("login-username").value;
      const password = document.getElementById("login-password").value;

      const res = await fetch("/api/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password }),
      });

      const data = await res.json();
      if (res.ok) window.location.href = "predict.html";
      else alert(data.message || "Login failed");
    });
  }

  if (registerForm) {
    registerForm.addEventListener("submit", async (e) => {
      e.preventDefault();
      const username = document.getElementById("register-username").value;
      const password = document.getElementById("register-password").value;

      const res = await fetch("/api/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password }),
      });

      const data = await res.json();
      if (res.ok) window.location.href = "login.html";
      else alert(data.message || "Registration failed");
    });
  }

  if (predictForm) {
    fetch("/api/user-data")
      .then((res) => res.json())
      .then((data) => renderHistory(data))
      .catch((err) => console.error(err));

    predictForm.addEventListener("submit", async (e) => {
      e.preventDefault();
      const formData = new FormData(predictForm);
      const inputData = Object.fromEntries(formData.entries());

      const res = await fetch("/api/predict", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(inputData),
      });

      const data = await res.json();
      if (res.ok) {
        document.getElementById("efficiency").innerText = data.Efficiency_Percentage.toFixed(2);
        document.getElementById("gain").innerText = data.Gain.toFixed(2);
        document.getElementById("cost").innerText = data.Cost.toFixed(2);
        document.getElementById('insight-section').style.display = 'block';
        fetch("/api/user-data")
          .then((res) => res.json())
          .then((data) => renderHistory(data));
      } else {
        alert(data.message || "Prediction failed");
      }
    });
  }
});
res.json(output);
function renderHistory(data) {
  const table = document.getElementById("history-table");
  if (!table) return;
  if (!data.length) {
    table.innerHTML = "<tr><td>No history found.</td></tr>";
    return;
  }
  const headers = Object.keys(data[0]);
  table.innerHTML =
    "<tr>" + headers.map((h) => `<th>${h}</th>`).join("") + "</tr>" +
    data.map((row) =>
      "<tr>" + headers.map((h) => `<td>${row[h]}</td>`).join("") + "</tr>"
    ).join("");
}

function logout() {
  fetch("/api/logout", { method: "POST" })
    .then(() => window.location.href = "login.html")
    .catch(() => alert("Logout failed"));
}
