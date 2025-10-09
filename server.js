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
  PORT = 3000,
} = process.env;

let access_token = "";
let refresh_token = "";

// -------- Spotify Auth --------
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

app.get("/callback", async (req, res) => {
  const code = req.query.code || null;
  const response = await fetch("https://accounts.spotify.com/api/token", {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      Authorization:
        "Basic " +
        Buffer.from(SPOTIFY_CLIENT_ID + ":" + SPOTIFY_CLIENT_SECRET).toString(
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
  res.send("✅ Spotify verbunden! Du kannst dieses Fenster schließen.");
});

// -------- Songs suchen --------
app.get("/search", async (req, res) => {
  if (!access_token) return res.status(401).send("Nicht verbunden");
  const q = req.query.q;
  const response = await fetch(
    `https://api.spotify.com/v1/search?type=track&limit=10&q=${encodeURIComponent(
      q
    )}`,
    { headers: { Authorization: "Bearer " + access_token } }
  );
  const data = await response.json();
  res.json(data.tracks ? data.tracks.items : []);
});

// -------- Song zur Queue hinzufügen --------
app.post("/add", async (req, res) => {
  if (!access_token) return res.status(401).send("Nicht verbunden");
  const { uri } = req.body;
  const response = await fetch(
    `https://api.spotify.com/v1/me/player/queue?uri=${encodeURIComponent(uri)}`,
    {
      method: "POST",
      headers: { Authorization: "Bearer " + access_token },
    }
  );
  if (response.status === 204) {
    res.json({ success: true });
  } else {
    const err = await response.text();
    res.status(400).send(err);
  }
});

// --- Startseite für Gäste ---
app.get("/", (req, res) => {
  res.send(`
    <html>
      <head>
        <title>🎉 Party Queue</title>
        <style>
          body { font-family: sans-serif; text-align: center; padding: 50px; background: #121212; color: #fff; }
          h1 { font-size: 2em; margin-bottom: 0.5em; }
          p { font-size: 1.2em; margin-bottom: 1em; }
          a { background: #1DB954; color: white; padding: 10px 20px; border-radius: 30px; text-decoration: none; }
          a:hover { background: #1ed760; }
        </style>
      </head>
      <body>
        <h1>🎶 Willkommen zur Party Queue!</h1>
        <p>Scanne den QR-Code oder klicke unten, um Songs hinzuzufügen.</p>
        <a href="/login">Mit Spotify verbinden 🎵</a>
      </body>
    </html>
  `);
});

app.listen(PORT, () => {
  console.log(`✅ Server läuft auf http://localhost:${PORT}`);
  console.log(`👉 Öffne http://localhost:${PORT}/login um Spotify zu verbinden`);
});
