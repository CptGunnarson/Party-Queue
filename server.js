// server.js
require("dotenv").config();
const express = require("express");
const fetch = require("node-fetch");
const cors = require("cors");
const bodyParser = require("body-parser");
const path = require("path");

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(bodyParser.json());
app.use(express.static(path.join(__dirname, "public")));

// Spotify API Credentials
const client_id = process.env.SPOTIFY_CLIENT_ID;
const client_secret = process.env.SPOTIFY_CLIENT_SECRET;
const redirect_uri = process.env.REDIRECT_URI || "http://localhost:3000/callback";

// Tokens
let access_token = process.env.SPOTIFY_ACCESS_TOKEN || "";
let refresh_token = process.env.SPOTIFY_REFRESH_TOKEN || "";

// --- Auth flow ---
app.get("/login", (req, res) => {
  const scopes = "user-modify-playback-state user-read-playback-state";
  res.redirect(
    `https://accounts.spotify.com/authorize?response_type=code&client_id=${client_id}&scope=${encodeURIComponent(
      scopes
    )}&redirect_uri=${encodeURIComponent(redirect_uri)}`
  );
});

app.get("/callback", async (req, res) => {
  const code = req.query.code || null;

  const params = new URLSearchParams();
  params.append("code", code);
  params.append("redirect_uri", redirect_uri);
  params.append("grant_type", "authorization_code");

  try {
    const result = await fetch("https://accounts.spotify.com/api/token", {
      method: "POST",
      headers: {
        Authorization:
          "Basic " +
          Buffer.from(`${client_id}:${client_secret}`).toString("base64"),
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: params,
    });

    const data = await result.json();

    access_token = data.access_token;
    refresh_token = data.refresh_token;

    // 🔒 Tokens persistent im Prozess speichern
    process.env.SPOTIFY_ACCESS_TOKEN = access_token;
    process.env.SPOTIFY_REFRESH_TOKEN = refresh_token;

    console.log("✅ Spotify verbunden!");
    console.log("Access Token:", access_token);
    console.log("Refresh Token:", refresh_token);

    res.redirect("/");
  } catch (err) {
    console.error("Fehler beim Auth Callback:", err);
    res.status(500).send("Fehler bei der Spotify-Verbindung");
  }
});

// --- Token Refresh ---
async function refreshAccessToken() {
  if (!refresh_token) {
    console.error("❌ Kein Refresh Token vorhanden!");
    return;
  }

  const params = new URLSearchParams();
  params.append("grant_type", "refresh_token");
  params.append("refresh_token", refresh_token);

  try {
    const result = await fetch("https://accounts.spotify.com/api/token", {
      method: "POST",
      headers: {
        Authorization:
          "Basic " +
          Buffer.from(`${client_id}:${client_secret}`).toString("base64"),
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: params,
    });

    const data = await result.json();

    if (data.access_token) {
      access_token = data.access_token;
      process.env.SPOTIFY_ACCESS_TOKEN = access_token;
      console.log("🔁 Access Token erfolgreich erneuert");
    } else {
      console.error("Fehler beim Token-Refresh:", data);
    }
  } catch (err) {
    console.error("Token-Refresh fehlgeschlagen:", err);
  }
}

// --- Songs suchen ---
app.get("/search", async (req, res) => {
  const query = req.query.q;
  if (!access_token) return res.status(401).json({ error: "Bitte Spotify erneut verbinden." });

  try {
    const result = await fetch(`https://api.spotify.com/v1/search?q=${encodeURIComponent(query)}&type=track&limit=5`, {
      headers: { Authorization: "Bearer " + access_token },
    });
    const data = await result.json();

    if (data.error?.status === 401) {
      await refreshAccessToken();
      return res.status(401).json({ error: "Token erneuert, bitte erneut versuchen." });
    }

    res.json(data.tracks.items || []);
  } catch (err) {
    console.error("Fehler bei /search:", err);
    res.status(500).json({ error: "Fehler bei der Suche" });
  }
});

// --- Song zur Queue hinzufügen ---
app.post("/add-to-queue", async (req, res) => {
  const { uri } = req.body;
  if (!access_token) return res.status(401).json({ error: "Bitte Spotify erneut verbinden." });

  try {
    const result = await fetch(`https://api.spotify.com/v1/me/player/queue?uri=${encodeURIComponent(uri)}`, {
      method: "POST",
      headers: { Authorization: "Bearer " + access_token },
    });

    if (result.status === 401) {
      await refreshAccessToken();
      return res.status(401).json({ error: "Token erneuert, bitte erneut versuchen." });
    }

    if (result.status === 204) {
      res.json({ success: true });
    } else {
      const error = await result.json();
      console.error("Fehler beim Hinzufügen:", error);
      res.status(400).json({ error: "Fehler beim Hinzufügen zur Warteschlange." });
    }
  } catch (err) {
    console.error("Fehler bei /add-to-queue:", err);
    res.status(500).json({ error: "Fehler beim Hinzufügen" });
  }
});

// --- Homepage bereitstellen ---
app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "index.html"));
});

// --- Server starten ---
app.listen(PORT, () => {
  console.log(`✅ Server läuft auf Port ${PORT}`);
});
