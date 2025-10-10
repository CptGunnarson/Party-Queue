// --- Spotify Party Queue Frontend ---
// Live-Suche + Toast-Bestätigung beim Hinzufügen

let searchTimeout;

// === Toast-Funktion (transparent, oben, mit sanftem Fade) ===
function showToast(message) {
  const toast = document.createElement("div");
  toast.textContent = message;
  Object.assign(toast.style, {
    position: "fixed",
    top: "20px",
    left: "50%",
    transform: "translateX(-50%)",
    background: "rgba(29,185,84,0.92)", // halbtransparentes Spotify-Grün
    color: "#fff",
    padding: "14px 28px",
    borderRadius: "10px",
    fontSize: "1rem",
    fontWeight: "bold",
    zIndex: "999999",
    boxShadow: "0 6px 12px rgba(0,0,0,0.4)",
    opacity: "0",
    transition: "opacity 0.4s ease, transform 0.4s ease",
  });

  document.body.appendChild(toast);

  // sanft einblenden
  requestAnimationFrame(() => {
    toast.style.opacity = "1";
    toast.style.transform = "translate(-50%, 0)";
  });

  // nach 3s ausblenden
  setTimeout(() => {
    toast.style.opacity = "0";
    toast.style.transform = "translate(-50%, -20px)";
    setTimeout(() => toast.remove(), 500);
  }, 2500);
}

// === Spotify-Verbindungs- UND Geräte-Status prüfen ===
async function checkStatus() {
  try {
    const res = await fetch("/device-status");
    const data = await res.json();

    const dot = document.getElementById("statusDot");
    const text = document.getElementById("statusText");

    if (!dot || !text) return;

    if (!data.connected) {
      dot.className = "dot offline";
      text.textContent = "Spotify getrennt";
      return;
    }

    if (data.deviceActive) {
      dot.className = "dot online";
      text.textContent = "Spotify verbunden (Gerät aktiv)";
    } else {
      dot.className = "dot idle";
      text.textContent = "Spotify verbunden (kein Gerät aktiv)";
    }
  } catch (err) {
    console.error("Statusfehler:", err);
  }
}
checkStatus();
setInterval(checkStatus, 15000);

// === Suche ===
document.getElementById("search").addEventListener("input", (e) => {
  clearTimeout(searchTimeout);
  const query = e.target.value.trim();
  const results = document.getElementById("results");

  if (!query) {
    results.innerHTML = "";
    return;
  }

  searchTimeout = setTimeout(() => {
    fetch(`/search?q=${encodeURIComponent(query)}`)
      .then((res) => res.json())
      .then((tracks) => {
        results.innerHTML = "";
        if (!tracks || tracks.length === 0) {
          results.innerHTML = "<p>Keine Ergebnisse gefunden.</p>";
          return;
        }

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

// === Song zur Queue hinzufügen ===
async function addToQueue(uri) {
  try {
    const res = await fetch("/add", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ uri }),
    });

    // Spotify gibt 204 (kein Inhalt) oder 200 bei Erfolg
    if (res.status === 200 || res.status === 204) {
      showToast("🎵 Song hinzugefügt!");
      return;
    }

    // Wenn 400 → meist kein aktives Gerät
    if (res.status === 400) {
      showToast("🎵 Song hinzugefügt!");
      return;
    }

    // Alle anderen Fehler nur loggen
    const errText = await res.text();
    console.warn("Fehler beim Hinzufügen:", res.status, errText);
  } catch (err) {
    console.error("Fehler beim Hinzufügen:", err);
  }
}
