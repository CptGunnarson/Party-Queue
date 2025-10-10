// --- Live-Suche mit Spotify + Toast Feedback ---

let searchTimeout;

// Toast-Funktion (für Erfolg / Fehler)
function showToast(message, type = "info") {
  const toast = document.createElement("div");
  toast.textContent = message;
  toast.className = "toast " + type;
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
      if (res.ok) console.log("✅ Song hinzugefügt");
      else console.warn("⚠️ Spotify antwortete mit Fehler:", res.status);
    })
    .catch((err) => console.error("Netzwerkfehler:", err));
}
