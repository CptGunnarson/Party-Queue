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

console.log("✅ Server gestartet auf Port:", PORT);
console.log("CLIENT_ID:", SPOTIFY_CLIENT_ID ? "✔️ geladen" : "❌ fehlt");
console.log("REDIRECT_URI:", REDIRECT_URI);

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
  try {
    const response = await fetch("https://accounts.spotify.com/api/token", {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        Authorization:
          "Basic " +
          Buffer.from(
            SPOTIFY_CLIENT_ID + ":" + SPOTIFY_CLIENT_SECRET
          ).toString("base64"),
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
      return res.status(400).send("Spotify-Authentifizierung fehlgeschlagen.");
    }

    access_token = data.access_token;
    refresh_token = data.refresh_token;
    res.send("✅ Spotify verbunden! Du kannst dieses Fenster schließen.");
  } catch (err) {
    console.error(err);
    res.status(500).send("Fehler bei der Spotify-Verbindung");
  }
});

// -------- Songs suchen --------
app.get("/search", async (req, res) => {
  if (!access_token) return res.status(401).json({ error: "Token fehlt" });
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
  if (!access_token) return res.status(401).json({ error: "Token fehlt" });
  const { uri } = req.body;

  try {
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
      const text = await response.text();
      res.status(400).json({ error: text });
    }
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.listen(PORT, () => {
  console.log(`✅ Server läuft auf Port ${PORT}`);
});
