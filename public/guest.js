// --- Gäste-Frontend (ohne Auto-Login) ---
let searchTimeout;

// Toast (oben, smooth)
function showToast(msg) {
  const t = document.createElement("div");
  t.className = "toast";
  t.textContent = msg;
  document.body.appendChild(t);
  requestAnimationFrame(() => { t.style.top = "20px"; t.style.opacity = "1"; });
  setTimeout(() => { t.style.top = "-60px"; t.style.opacity = "0"; setTimeout(() => t.remove(), 600); }, 2500);
}

// Status prüfen (verbunden + aktives Gerät)
async function checkStatus() {
  try {
    const res = await fetch("/device-status");
    const d = await res.json();
    const dot = document.getElementById("statusDot");
    const text = document.getElementById("statusText");

    if (!d.connected) {
      dot.className = "dot offline";
      text.textContent = "Spotify getrennt (Host muss sich verbinden)";
      setInputsEnabled(false);
      return;
    }

    if (d.deviceActive) {
      dot.className = "dot online";
      text.textContent = "Spotify verbunden (Gerät aktiv)";
      setInputsEnabled(true);
    } else {
      dot.className = "dot idle";
      text.textContent = "Spotify verbunden (kein Gerät aktiv)";
      // Suchen erlauben, Hinzufügen klappt evtl. nicht – Hinweis bleibt im Status
      setInputsEnabled(true);
    }
  } catch (e) {
    console.error(e);
  }
}

function setInputsEnabled(enabled) {
  const search = document.getElementById("search");
  search.disabled = !enabled;
  document.querySelectorAll("#results button").forEach(b => b.disabled = !enabled);
}

// Live-Suche
document.getElementById("search").addEventListener("input", (e) => {
  clearTimeout(searchTimeout);
  const q = e.target.value.trim();
  const results = document.getElementById("results");
  if (!q) { results.innerHTML = ""; return; }

  searchTimeout = setTimeout(() => {
    fetch(`/search?q=${encodeURIComponent(q)}`)
      .then(r => r.json())
      .then(tracks => {
        results.innerHTML = "";
        if (!tracks || tracks.length === 0) {
          results.innerHTML = "<p>Keine Ergebnisse gefunden.</p>";
          return;
        }
        tracks.forEach(t => {
          const row = document.createElement("div");
          row.className = "track";
          row.innerHTML = `
            <div class="track-info">
              <div class="track-name">${t.name}</div>
              <div class="track-artist">${t.artists.map(a => a.name).join(", ")}</div>
            </div>
            <button>Hinzufügen</button>
          `;
          row.querySelector("button").onclick = () => addToQueue(t.uri);
          results.appendChild(row);
        });
      })
      .catch(err => console.error("Suchfehler:", err));
  }, 350);
});

// Hinzufügen (zeigt immer grünen Toast, Gäste sehen keine Fehler)
async function addToQueue(uri) {
  try {
    const res = await fetch("/add", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ uri }),
    });
    if (res.status === 200 || res.status === 204 || res.status === 400) {
      showToast("🎵 Song hinzugefügt!");
    } else {
      console.warn("Add response:", res.status, await res.text());
      showToast("🎵 Song hinzugefügt!"); // bewusst positiv
    }
  } catch (e) {
    console.error("Add error:", e);
    showToast("🎵 Song hinzugefügt!"); // Gäste: nie Fehlertoast
  }
}

checkStatus();
setInterval(checkStatus, 15000);
