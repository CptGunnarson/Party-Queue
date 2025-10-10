// --- Spotify Party Queue Frontend ---
// Live-Suche, Toast-Bestätigung, automatischer Login & sanfte Animationen

let searchTimeout;

// === Automatischer Spotify-Login, falls keine Verbindung ===
window.addEventListener("load", () => {
  fetch("/device-status")
    .then((res) => res.json())
    .then((data) => {
      if (!data.connected) {
        console.log("Kein Spotify verbunden — leite weiter zu Login");
        window.location.href = "/login";
      }
    })
    .catch((err) => console.error("Login-Check Fehler:", err));
});

// === Toast-Funktion (transparent, oben, mit Slide-In) ===
function showToast(message) {
  const toast = document.createElement("div");
  toast.textContent = message;
  Object.assign(toast.style, {
    position: "fixed",
    top: "-60px",
    left: "50%",
    transform: "translateX(-50%)",
    background: "rgba(29,185,84,0.95)", // Spotify-Grün halbtransparent
    color: "#fff",
    padding: "14px 28px",
    borderRadius: "12px",
    fontSize: "1rem",
    fontWeight: "bold",
    zIndex: "999999",
    boxShadow: "0 6px 12px rgba(0,0,0,0.4)",
    opacity: "0",
    transition: "opacity 0.5s ease, top 0.6s cubic-bezier(0.19, 1, 0.22, 1)",
  });

  document.body.appendChild(toast);

  // sanft von oben einblenden
  requestAnimationFrame(() => {
    toast.style.top = "20px";
    toast.style.opacity = "1";
  });

  // nach 3 Sekunden wieder nach oben verschwinden
  setTimeout(() => {
    toast.style.top = "-60px";
    toast.style.opacity = "0";
    setTimeout(() => toast.remove(), 600);
  }, 2500);
}

// === Spotify-Verbindungs- UND Geräte-Status prüfen ===
async function checkStatus() {
  try {
    const res = await fetch("/device-status");
    const data = await res.json();

    const dot = document.getElementById("statusDot");
    const text = document.getElementById("statusText");
    const loginBtn = document.getElementById("loginBtn");

    if (!dot || !text) return;

    if (!data.connected) {
      dot.className = "dot offline";
      text.textContent = "Spotify getrennt";
      if (loginBtn) loginBtn.style.display = "inline";
      return;
    }

    if (loginBtn) loginBtn.style.display = "none";

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

// === Live-Suche ===
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
    if (res.status === 200 || res.status === 204 || res.status === 400) {
      showToast("🎵 Song hinzugefügt!");
      return;
    }

    const errText = await res.text();
    console.warn("Fehler beim Hinzufügen:", res.status, errText);
  } catch (err) {
    console.error("Fehler beim Hinzufügen:", err);
  }
}
