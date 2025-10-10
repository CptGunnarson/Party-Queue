// --- Spotify Party Queue Backend ---
// mit automatischer Token-Erneuerung

import express from "express";
import fetch from "node-fetch";
import cors from "cors";
import bodyParser from "body-parser";
import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";

dotenv.config();
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

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
  console.log("🔗 Redirecting to Spotify login…");
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

  if (data.error) {
    console.error("Spotify Auth Error:", data);
    return res.status(400).send("Spotify Anmeldung fehlgeschlagen.");
  }

  access_token = data.access_token;
  refresh_token = data.refresh_token;

  console.log("✅ Spotify verbunden!");
  res.send("✅ Spotify verbunden! Du kannst dieses Fenster schließen.");
});

// -------- Token automatisch erneuern --------
async function refreshAccessToken() {
  if (!refresh_token) return;

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
    console.log("🔄 Spotify-Token automatisch erneuert");
  } else {
    console.error("⚠️ Fehler beim Erneuern des Tokens:", data);
  }
}

// alle 50 Minuten automatisch erneuern
setInterval(refreshAccessToken, 50 * 60 * 1000);

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
    return res.json({ success: true });
  } else if (response.status === 401) {
    console.warn("🔁 Token ungültig, versuche Refresh…");
    await refreshAccessToken();
    return res.status(401).send("Token erneuert, bitte erneut versuchen");
  } else {
    const err = await response.text();
    console.error("Spotify Add Error:", err);
    res.status(400).send(err);
  }
});
// -------- Status-Endpunkt --------
app.get("/status", (req, res) => {
  res.json({ connected: !!access_token });
});

// -------- Server starten --------
const port = process.env.PORT || 3000;
app.listen(port, () => {
  console.log(`✅ Server läuft auf Port ${port}`);
});
