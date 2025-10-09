// --- Spotify Party Queue Backend ---
const express = require("express");
const fetch = require("node-fetch");
const cors = require("cors");
const bodyParser = require("body-parser");
const dotenv = require("dotenv");
const path = require("path");

dotenv.config();

const app = express();
app.use(cors());
app.use(bodyParser.json());
app.use(express.static(path.join(__dirname, "public")));

const {
  SPOTIFY_CLIENT_ID,
  SPOTIFY_CLIENT_SECRET,
  REDIRECT_URI,
  PORT = process.env.PORT || 3000,
} = process.env;

let access_token = "";
let refresh_token = "";

// -------- Hilfsfunktion: Token erneuern --------
async function refreshAccessToken() {
  if (!refresh_token) return false;

  const response = await fetch("https://accounts.spotify.com/api/token", {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      Authorization:
        "Basic " +
        Buffer.from(`${SPOTIFY_CLIENT_ID}:${SPOTIFY_CLIENT_SECRET}`).toString(
          "base64"
        ),
    },
    body: new URLSearchParams({
      grant_type: "refresh_token",
      refresh_token,
    }),
  });

  const data = await response.json();

  if (data.access_token) {
    access_token = data.access_token;
    console.log("🔁 Access Token erneuert");
    return true;
  } else {
    console.error("❌ Fehler beim Token-Refresh:", data);
    return false;
  }
}

// -------- Startseite --------
app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "index.html"));
});

// -------- Spotify Login --------
app.get("/login", (req, res) => {
  const scopes = "user-modify-playback-state user-read-playback-state";
  const authUrl =
    "https://accounts.spotify.com/authorize" +
    "?response_type=code" +
    "&client_id=" +
    encodeURIComponent(SPOTIFY_CLIENT_ID) +
    "&scope=" +
    encodeURIComponent(scopes) +
    "&redirect_uri=" +
    encodeURIComponent(REDIRECT_URI);
  res.redirect(authUrl);
});

// -------- Callback von Spotify --------
app.get("/callback", async (req, res) => {
  const code = req.query.code || null;

  const response = await fetch("https://accounts.spotify.com/api/token", {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      Authorization:
        "Basic " +
        Buffer.from(`${SPOTIFY_CLIENT_ID}:${SPOTIFY_CLIENT_SECRET}`).toString(
          "base64"
        ),
    },
    body: new URLSearchParams({
      grant_type: "authorization_code",
      code,
      redirect_uri: REDIRECT_URI,
    }),
  });

  const data = await response.json();
  access_token = data.access_token;
  refresh_token = data.refresh_token;

  console.log("✅ Spotify verbunden!");

  res.send(`
    <html>
      <head><title>Verbunden</title></head>
      <body style="font-family:Arial;text-align:center;padding:40px;">
        <h2>✅ Spotify erfolgreich verbunden!</h2>
        <p>Du kannst dieses Fenster schließen und Songs hinzufügen.</p>
        <a href="/">Zurück zur App</a>
      </body>
    </html>
  `);
});

// -------- Songs suchen --------
app.get("/search", async (req, res) => {
  if (!access_token) return res.status(401).send("Nicht verbunden");

  const q = req.query.q;
  let response = await fetch(
    `https://api.spotify.com/v1/search?type=track&limit=10&q=${encodeURIComponent(
      q
    )}`,
    { headers: { Authorization: "Bearer " + access_token } }
  );

  // Falls Token abgelaufen -> erneuern und nochmal versuchen
  if (response.status === 401) {
    const refreshed = await refreshAccessToken();
    if (!refreshed) return res.status(401).send("Nicht verbunden");
    response = await fetch(
      `https://api.spotify.com/v1/search?type=track&limit=10&q=${encodeURIComponent(
        q
      )}`,
      { headers: { Authorization: "Bearer " + access_token } }
    );
  }

  const data = await response.json();
  res.json(data.tracks ? data.tracks.items : []);
});

// -------- Song zur Queue hinzufügen --------
app.post("/add", async (req, res) => {
  if (!access_token) return res.status(401).send("Nicht verbunden");

  const { uri } = req.body;
  let response = await fetch(
    `https://api.spotify.com/v1/me/player/queue?uri=${encodeURIComponent(uri)}`,
    {
      method: "POST",
      headers: { Authorization: "Bearer " + access_token },
    }
  );

  // Falls Token abgelaufen -> erneuern und nochmal versuchen
  if (response.status === 401) {
    const refreshed = await refreshAccessToken();
    if (!refreshed) return res.status(401).send("Nicht verbunden");
    response = await fetch(
      `https://api.spotify.com/v1/me/player/queue?uri=${encodeURIComponent(uri)}`,
      {
        method: "POST",
        headers: { Authorization: "Bearer " + access_token },
      }
    );
  }

  if (response.status === 204) {
    res.json({ success: true });
  } else {
    const err = await response.text();
    res.status(400).send(err);
  }
});

// -------- Server starten --------
app.listen(PORT, () => {
  console.log(`✅ Server läuft auf Port ${PORT}`);
});
