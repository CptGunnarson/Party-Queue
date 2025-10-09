const searchInput = document.getElementById("search");
const resultsDiv = document.getElementById("results");

async function searchTracks(q) {
  if (!q) {
    resultsDiv.innerHTML = "";
    return;
  }
  const res = await fetch(`/search?q=${encodeURIComponent(q)}`);
  const data = await res.json();

  resultsDiv.innerHTML = data
    .map(
      (track) => `
      <div class="track">
        <img src="${track.album.images[0]?.url}" width="50">
        <div class="info">
          <strong>${track.name}</strong><br>
          ${track.artists.map((a) => a.name).join(", ")}
        </div>
        <button onclick="addToQueue('${track.uri}')">+ Hinzufügen</button>
      </div>`
    )
    .join("");
}

async function addToQueue(uri) {
  try {
    const res = await fetch("/add", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ uri }),
    });

    if (!res.ok) {
      const text = await res.text();
      throw new Error(text);
    }

    alert("✅ Song hinzugefügt!");
  } catch (err) {
    alert("❌ Fehler: Bitte Spotify erneut verbinden.");
  }
}

// 🔥 NEU: Live-Suche beim Tippen
searchInput.addEventListener("input", (e) => {
  const query = e.target.value.trim();
  searchTracks(query);
});
