import express from "express";
import fetch from "node-fetch";
import dotenv from "dotenv";
import cors from "cors";
import path from "path";
import { fileURLToPath } from "url";

dotenv.config();
const app = express();
app.use(express.json());
app.use(cors());

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
app.use(express.static(path.join(__dirname, "public")));

const client_id = process.env.CLIENT_ID;
const client_secret = process.env.CLIENT_SECRET;
const redirect_uri = process.env.REDIRECT_URI;

let currentAccessToken = null;
let currentRefreshToken = null;

// 🔐 Spotify Login
app.get("/login", (req, res) => {
  const scope = "user-read-playback-state user-modify-playback-state";
  const authUrl =
    "https://accounts.spotify.com/authorize?" +
    new URLSearchParams({
      response_type: "code",
      client_id,
      scope,
      redirect_uri,
    }).toString();

  res.redirect(authUrl);
});

// 🔄 Callback von Spotify
app.get("/callback", async (req, res) => {
  const code = req.query.code || null;
  const params = new URLSearchParams();
  params.append("code", code);
  params.append("redirect_uri", redirect_uri);
  params.append("grant_type", "authorization_code");

  const headers = {
    Authorization:
      "Basic " +
      Buffer.from(`${client_id}:${client_secret}`).toString("base64"),
    "Content-Type": "application/x-www-form-urlencoded",
  };

  try {
    const response = await fetch("https://accounts.spotify.com/api/token", {
      method: "POST",
      headers,
      body: params,
    });

    const data = await response.json();
    currentAccessToken = data.access_token;
    currentRefreshToken = data.refresh_token;

    console.log("✅ Spotify verbunden!");
    res.redirect("/");
  } catch (err) {
    console.error("Spotify Auth Fehler:", err);
    res.status(500).send("Fehler bei der Spotify-Authentifizierung.");
  }
});

// 🔁 Token aktualisieren
app.get("/refresh_token", async (req, res) => {
  if (!currentRefreshToken)
    return res.status(400).json({ error: "Kein Refresh Token verfügbar." });

  const params = new URLSearchParams();
  params.append("grant_type", "refresh_token");
  params.append("refresh_token", currentRefreshToken);

  const headers = {
    Authorization:
      "Basic " +
      Buffer.from(`${client_id}:${client_secret}`).toString("base64"),
    "Content-Type": "application/x-www-form-urlencoded",
  };

  try {
    const response = await fetch("https://accounts.spotify.com/api/token", {
      method: "POST",
      headers,
      body: params,
    });

    const data = await response.json();
    currentAccessToken = data.access_token;

    console.log("♻️ Token aktualisiert");
    res.json({ success: true });
  } catch (err) {
    console.error("Fehler beim Token-Refresh:", err);
    res.status(500).json({ error: "Fehler beim Token-Refresh" });
  }
});

// 🔍 Live-Suche
app.get("/search", async (req, res) => {
  const query = req.query.q;
  if (!currentAccessToken)
    return res.status(401).json({ error: "Bitte Spotify erneut verbinden." });

  try {
    const response = await fetch(
      `https://api.spotify.com/v1/search?q=${encodeURIComponent(
        query
      )}&type=track&limit=10`,
      {
        headers: { Authorization: `Bearer ${currentAccessToken}` },
      }
    );

    const data = await response.json();
    if (!data.tracks) {
      return res.status(400).json({ error: "Ungültige Antwort von Spotify" });
    }

    res.json(data.tracks.items);
  } catch (err) {
    console.error("Fehler bei der Suche:", err);
    res.status(500).json({ error: "Fehler bei der Suche" });
  }
});

// 🎵 Song zur Queue hinzufügen
app.post("/add-to-queue", async (req, res) => {
  try {
    const { uri } = req.body;
    const access_token = currentAccessToken;

    if (!access_token) {
      return res
        .status(401)
        .json({ error: "Bitte Spotify erneut verbinden." });
    }

    const response = await fetch(
      `https://api.spotify.com/v1/me/player/queue?uri=${encodeURIComponent(uri)}`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${access_token}`,
        },
      }
    );

    if (response.status === 204) {
      console.log("✅ Song erfolgreich hinzugefügt!");
      return res.json({ success: true });
    } else {
      const data = await response.json().catch(() => null);
      console.error("Fehler beim Hinzufügen:", data);
      return res.status(400).json({
        error: data?.error?.message || "Fehler beim Hinzufügen.",
      });
    }
  } catch (err) {
    console.error("Serverfehler:", err);
    res.status(500).json({ error: "Interner Serverfehler" });
  }
});

// 🏠 Frontend ausliefern
app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "index.html"));
});

// 🚀 Server starten
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`✅ Server läuft auf Port ${PORT}`));
