// --- Spotify Party Queue Backend ---
import express from "express";
import fetch from "node-fetch";
import cors from "cors";
import bodyParser from "body-parser";
import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";

dotenv.config();

const app = express();
app.use(cors());
app.use(bodyParser.json());

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
app.use(express.static(path.join(__dirname, "public")));

const {
  SPOTIFY_CLIENT_ID,
  SPOTIFY_CLIENT_SECRET,
  REDIRECT_URI,
  PORT = process.env.PORT || 3000,
} = process.env;

let access_token = "";
let refresh_token = "";

// === LOGIN ===
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

// === CALLBACK ===
app.get("/callback", async (req, res) => {
  const code = req.query.code || null;
  try {
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

    if (data.access_token) {
      access_token = data.access_token;
      refresh_token = data.refresh_token;
      console.log("✅ Spotify verbunden!");
      res.send("✅ Spotify verbunden! Du kannst dieses Fenster schließen.");
    } else {
      console.error("Spotify Auth Error:", data);
      res.status(400).send("Fehler bei der Spotify-Authentifizierung.");
    }
  } catch (err) {
    console.error("Callback error:", err);
    res.status(500).send("Serverfehler beim Callback.");
  }
});

// === TOKEN REFRESH ===
async function refreshAccessToken() {
  if (!refresh_token) return false;

  try {
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
        grant_type: "refresh_token",
        refresh_token,
      }),
    });
    const data = await response.json();
    if (data.access_token) {
      access_token = data.access_token;
      console.log("♻️ Access Token aktualisiert");
      return true;
    }
  } catch (err) {
    console.error("Fehler beim Token-Refresh:", err);
  }
  return false;
}

// === NEU: DEVICE-STATUS ROUTE ===
app.get("/device-status", async (req, res) => {
  if (!access_token) {
    return res.json({ connected: false, deviceActive: false });
  }

  try {
    const response = await fetch("https://api.spotify.com/v1/me/player", {
      headers: { Authorization: "Bearer " + access_token },
    });

    if (response.status === 204) {
      // kein Gerät aktiv
      return res.json({ connected: true, deviceActive: false });
    }

    if (response.status === 401) {
      const refreshed = await refreshAccessToken();
      return res.json({ connected: refreshed, deviceActive: false });
    }

    const data = await response.json();
    const deviceActive = data?.device?.is_active ?? false;
    res.json({ connected: true, deviceActive });
  } catch (err) {
    console.error("Device check error:", err);
    res.json({ connected: false, deviceActive: false });
  }
});

// === SONG-SUCHE ===
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

// === SONG ZUR QUEUE ===
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
    return res.status(204).send();
  }

  const err = await response.text();
  res.status(400).send(err);
});

// === START SERVER ===
app.listen(PORT, () => {
  console.log(`✅ Server läuft auf Port ${PORT}`);
});
