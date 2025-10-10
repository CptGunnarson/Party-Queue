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

// Suche bei Eingabe
document.getElementById("search").addEventListener("input", (e) => {
  clearTimeout(searchTimeout);
  const query = e.target.value.trim();
  if (!query) {
    document.getElementById("results").innerHTML = "";
    return;
  }

  // leichte Verzögerung, um API nicht zu spammen
  searchTimeout = setTimeout(() => {
  fetch(`/search?q=${encodeURIComponent(query)}`)
    .then((res) => res.json())
    .then((tracks) => {
      // wie gehabt...
    })
    .catch((err) => {
      console.warn("Suchfehler (ignoriert):", err);
      // kein Toast, keine Störung
    });
}, 400);
        // Ergebnisse anzeigen
        tracks.forEach((track) => {
          const div = document.createElement("div");
          div.className = "track";

          const info = document.createElement("div");
          info.className = "track-info";
          info.innerHTML = `
            <div class="track-name">${track.name}</div>
            <div class="track-artist">${track.artists
              .map((a) => a.name)
              .join(", ")}</div>
          `;

          const button = document.createElement("button");
          button.textContent = "Hinzufügen";
          button.onclick = () => addToQueue(track.uri);

          div.appendChild(info);
          div.appendChild(button);
          results.appendChild(div);
        });
      })
      .catch((err) => {
        console.error(err);
        showToast("🚫 Verbindung zu Spotify verloren. Bitte neu verbinden!", "error");
      });
  }, 400);
});

// Song zur Queue hinzufügen
function addToQueue(uri) {
  fetch("/add", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({ uri }),
})
  .then(async (res) => {
    if (res.ok) {
      showToast("🎵 Song erfolgreich hinzugefügt!", "success");
    } else {
      console.warn("Fehler beim Hinzufügen zur Queue (wird ignoriert)");
      // keine Fehlermeldung mehr anzeigen
    }
  })
  .catch((err) => {
    console.warn("Netzwerkfehler (ignoriert):", err);
    // kein roter Toast mehr, nur still im Hintergrund loggen
  });

}
