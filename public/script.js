const input = document.getElementById("searchInput");
const results = document.getElementById("results");
const statusBox = document.getElementById("status");

let searchTimeout = null;

// --- Live-Suche ---
input.addEventListener("input", () => {
  const query = input.value.trim();
  clearTimeout(searchTimeout);
  if (query.length < 2) {
    results.innerHTML = "";
    return;
  }

  searchTimeout = setTimeout(async () => {
    try {
      const res = await fetch(`/search?q=${encodeURIComponent(query)}`);
      if (!res.ok) {
        throw new Error("Bitte Spotify erneut verbinden.");
      }

      const data = await res.json();
      results.innerHTML = "";

      data.forEach((track) => {
        const li = document.createElement("li");
        li.className =
          "flex justify-between items-center bg-gray-800 rounded-lg p-3 hover:bg-gray-700";
        li.innerHTML = `
          <div>
            <div class="font-semibold">${track.name}</div>
            <div class="text-sm text-gray-400">${track.artists
              .map((a) => a.name)
              .join(", ")}</div>
          </div>
          <button class="bg-green-600 hover:bg-green-700 text-white px-3 py-1 rounded add-btn">
            ➕
          </button>
        `;
        li.querySelector(".add-btn").addEventListener("click", async () => {
          await addToQueue(track.uri);
        });
        results.appendChild(li);
      });
    } catch (err) {
      showStatus(err.message, true);
    }
  }, 400); // kleine Verzögerung für Live-Suche
});

// --- Song hinzufügen ---
async function addToQueue(uri) {
  try {
    const res = await fetch("/add", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ uri }),
    });

    if (!res.ok) {
      throw new Error("Bitte Spotify erneut verbinden.");
    }

    showStatus("✅ Song hinzugefügt!");
  } catch (err) {
    showStatus(err.message, true);
  }
}

// --- Statusmeldung ---
function showStatus(message, error = false) {
  statusBox.textContent = message;
  statusBox.classList.remove("hidden");
  statusBox.style.backgroundColor = error ? "#dc2626" : "#16a34a";
  setTimeout(() => statusBox.classList.add("hidden"), 3000);
}
