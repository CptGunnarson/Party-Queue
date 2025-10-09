const searchInput = document.getElementById("search");
const resultsDiv = document.getElementById("results");

// Songs suchen
async function searchTracks(query) {
  if (!query) {
    resultsDiv.innerHTML = "";
    return;
  }

  try {
    const res = await fetch(`/search?q=${encodeURIComponent(query)}`);
    const data = await res.json();

    resultsDiv.innerHTML = data
      .map(
        (track) => `
        <div class="track">
          <img src="${track.album.images[0]?.url || ''}" width="50">
          <div class="info">
            <strong>${track.name}</strong><br>
            ${track.artists.map((a) => a.name).join(", ")}
          </div>
          <button onclick="addToQueue('${track.uri}')">+ Hinzufügen</button>
        </div>`
      )
      .join("");
  } catch (err) {
    console.error("Fehler bei der Suche:", err);
  }
}

// Song zur Queue hinzufügen
async function addToQueue(uri) {
  try {
    const res = await fetch("/add", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ uri }),
    });

    if (res.ok) {
      alert("✅ Song wurde zur Queue hinzugefügt!");
    } else {
      const errText = await res.text();
      console.error("Fehler:", errText);
      alert("❌ Fehler: Bitte Spotify erneut verbinden.");
    }
  } catch (err) {
    console.error("Fehler beim Hinzufügen:", err);
    alert("❌ Fehler: Verbindung zum Server fehlgeschlagen.");
  }
}

// 🔥 Live-Suche beim Tippen
if (searchInput) {
  searchInput.addEventListener("input", (e) => {
    const query = e.target.value.trim();
    searchTracks(query);
  });
}
