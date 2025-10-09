const searchInput = document.getElementById("search");
const resultsDiv = document.getElementById("results");

searchInput.addEventListener("input", async (e) => {
  const query = e.target.value.trim();
  if (query.length < 2) return (resultsDiv.innerHTML = "");
  const res = await fetch(`/search?q=${encodeURIComponent(query)}`);
  const data = await res.json();
  resultsDiv.innerHTML = data
    .map(
      (track) => `
    <div class="track">
      <img src="${track.album.images[2]?.url}" />
      <div class="info">
        <strong>${track.name}</strong><br/>
        <span>${track.artists.map((a) => a.name).join(", ")}</span>
      </div>
      <button onclick="addToQueue('${track.uri}')">+</button>
    </div>`
    )
    .join("");
});

async function addToQueue(uri) {
  const res = await fetch("/add", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ uri }),
  });
  if (res.ok) alert("✅ Song hinzugefügt!");
  else alert("⚠️ Fehler beim Hinzufügen");
}
