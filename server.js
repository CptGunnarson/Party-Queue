// server.js
require("dotenv").config();
const express = require("express");
const fetch = require("node-fetch");
const cors = require("cors");
const bodyParser = require("body-parser");
const path = require("path");

const app = express();
app.use(cors());
app.use(bodyParser.json());
app.use(express.static(path.join(__dirname, "public")));

const PORT = process.env.PORT || 3000;

// === Spotify API Credentials ===
const CLIENT_ID = process.env.SPOTIFY_CLIENT_ID;
const CLIENT_SECRET = process.env.SPOTIFY_CLIENT_SECRET;
const REDIRECT_URI = process.env.REDIRECT_URI || "https://party-queue-5yzw.onrender.com/callback";

let access_token = null;
let refresh_token = null;

// === 1️⃣ Login Route ===
app.get("/login", (req, res) => {
  const scope = "user-modify-playback-state user-read-playback-state";
  const authUrl =
    "https://accounts.spotify.com/authorize" +
    "?response_type=code" +
    `&client_id=${CLIENT_ID}` +
    `&scope=${encodeURIComponent(scope)}` +
    `&redirect_uri=${encodeURIComponent(REDIRECT_URI)}`;
  res.redirect(authUrl);
});

// === 2️⃣ Callback Route ===
app.get("/callback", async (req, res) => {
  const code = req.query.code;
  if (!code) return res.status(400).send("Fehler: Kein Code erhalten");

  try {
    const response = await fetch("https://accounts.spotify.com/api/token", {
      method: "POST",
      headers: {
        Authorization:
          "Basic " + Buffer.from(`${CLIENT_ID}:${CLIENT_SECRET}`).toString("base64"),
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams({
        grant_type: "authorization_code",
        code: code,
        redirect_uri: REDIRECT_URI,
      }),
    });

    const data = await response.json();

    access_token = data.access_token;
    refresh_token = data.refresh_token;

    console.log("✅ Spotify verbunden!");
    res.redirect("/");
  } catch (err) {
    console.error("❌ Fehler beim Spotify-Login:", err);
    res.status(500).send("Fehler beim Verbinden mit Spotify");
  }
});

// === 3️⃣ Refresh Token (automatisch erneuern) ===
async function refreshAccessToken() {
  if (!refresh_token) return;

  try {
    const response = await fetch("https://accounts.spotify.com/api/token", {
      method: "POST",
      headers: {
        Authorization:
          "Basic " + Buffer.from(`${CLIENT_ID}:${CLIENT_SECRET}`).toString("base64"),
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams({
        grant_type: "refresh_token",
        refresh_token,
      }),
    });

    const data = await response.json();
    access_token = data.access_token;
    console.log("🔄 Token aktualisiert");
  } catch (err) {
    console.error("Fehler beim Token-Refresh:", err);
  }
}

// Alle 50 Minuten automatisch erneuern
setInterval(refreshAccessToken, 50 * 60 * 1000);

// === 4️⃣ Song-Suche ===
app.get("/search", async (req, res) => {
  if (!access_token) {
    return res.status(401).json({ error: "Bitte Spotify erneut verbinden." });
  }

  const query = req.query.q;
  if (!query) return res.status(400).json({ error: "Keine Suchanfrage angegeben." });

  try {
    const response = await fetch(`https://api.spotify.com/v1/search?q=${encodeURIComponent(query)}&type=track&limit=10`, {
      headers: { Authorization: "Bearer " + access_token },
    });

    if (response.status === 401) {
      await refreshAccessToken();
      return res.status(401).json({ error: "Token abgelaufen, bitte erneut verbinden." });
    }

    const data = await response.json();
    res.json(data.tracks.items);
  } catch (err) {
    console.error("Fehler bei der Spotify-Suche:", err);
    res.status(500).json({ error: "Fehler bei der Spotify-Suche." });
  }
});

// === 5️⃣ Song zur Queue hinzufügen ===
app.post("/add", async (req, res) => {
  if (!access_token) {
    return res.status(401).json({ error: "Bitte Spotify erneut verbinden." });
  }

  const trackUri = req.body.uri;
  if (!trackUri) return res.status(400).json({ error: "Keine Track-URI angegeben." });

  try {
    const response = await fetch(
      `https://api.spotify.com/v1/me/player/queue?uri=${encodeURIComponent(trackUri)}`,
      {
        method: "POST",
        headers: { Authorization: "Bearer " + access_token },
      }
    );

    if (response.status === 204) {
      console.log(`🎶 Song hinzugefügt: ${trackUri}`);
      return res.json({ success: true });
    }

    if (response.status === 401) {
      await refreshAccessToken();
      return res.status(401).json({ error: "Toke
