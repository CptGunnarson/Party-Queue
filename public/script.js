// --- Live-Suche mit Spotify + Toast Feedback ---

let searchTimeout;


// Toast-Funktion (für Erfolg / Fehler)
function showToast(message, type = "info") {
  const toast = document.createElement("div");
  toast.textContent = message;
  toast.style.position = "fixed";
  toast.style.bottom = "20px";
  toast.style.left = "50%";
  toast.style.transform = "translateX(-50%)";
  toast.style.background = "#1db954";
  toast.style.color = "white";
  toast.style.padding = "10px 20px";
  toast.style.borderRadius = "8px";
  toast.style.fontWeight = "bold";
  toast.style.zIndex = "999";
  toast.style.boxShadow = "0 4px 10px rgba(0,0,0,0.3)";
  toast.style.animation = "fadeOut 3s ease forwards";
  document.body.appendChild(toast);
  setTimeout(() => toast.remove(), 3000);
}
// Spotify-Verbindungsstatus prüfen
async function checkStatus() {
  try {
    const res = await fetch("/status");
    const data = await res.json();
    const dot = document.getElementById("statusDot");
    const text = document.getElementById("statusText");
    if (data.connected) {
      dot.className = "dot online";
      text.textContent = "Spotify verbunden";
    } else {
      dot.className = "dot offline";
      text.textContent = "Nicht verbunden";
    }
  } catch (err) {
    console.error(err);
  }
}

// alle 30 Sekunden prüfen
checkStatus();
setInterval(checkStatus, 30000);

// --- Suche ---
document.getElementById("search").addEventListener("input", (e) => {
  clearTimeout(searchTimeout);
  const query = e.target.value.trim();
  if (!query) {
    document.getElementById("results").innerHTML = "";
    return;
  }
  searchTimeout = setTimeout(() => {
    fetch(`/search?q=${encodeURIComponent(query)}`)
      .then((res) => res.json())
      .then((tracks) => {
        const results = document.getElementById("results");
        results.innerHTML = "";
        tracks.forEach((t) => {
          const div = document.createElement("div");
          div.className = "track";
          div.innerHTML = `
            <div class="track-info">
              <div class="track-name">${t.name}</div>
              <div class="track-artist">${t.artists
                .map((a) => a.name)
                .join(", ")}</div>
            </div>
            <button>Hinzufügen</button>`;
          div.querySelector("button").onclick = () => addToQueue(t.uri);
          results.appendChild(div);
        });
      })
      .catch((err) => console.error("Suchfehler:", err));
  }, 400);
});

// --- Song hinzufügen ---
function addToQueue(uri) {
  fetch("/add", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ uri }),
  })
    .then((res) => {
      if (res.ok) {
        const msg = document.createElement("div");
        msg.textContent = "✅ Song hinzugefügt!";
        msg.style.color = "#1db954";
        msg.style.fontWeight = "bold";
        msg.style.marginTop = "10px";
        document.body.appendChild(msg);
        setTimeout(() => msg.remove(), 2000);
      }
    })
    .catch((err) => console.error("Fehler beim Hinzufügen:", err));
}// CSS-Animation fürs Ausblenden
const style = document.createElement("style");
style.innerHTML = `
@keyframes fadeOut {
  0% { opacity: 1; transform: translate(-50%,0); }
  80% { opacity: 1; }
  100% { opacity: 0; transform: translate(-50%,20px); }
}`;
document.head.appendChild(style);

