import express from "express";
import fetch from "node-fetch";
import cors from "cors";
import bodyParser from "body-parser";
import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";

dotenv.config();

// --- Fallback für Render ---
if (!process.env.SPOTIFY_CLIENT_ID && process.env.CLIENT_ID) {
  process.env.SPOTIFY_CLIENT_ID = process.env.CLIENT_ID;
}
if (!process.env.SPOTIFY_CLIENT_SECRET && process.env.CLIENT_SECRET) {
  process.env.SPOTIFY_CLIENT_SECRET = process.env.CLIENT_SECRET;
}
if (!process.env.REDIRECT_URI) {
  process.env.REDIRECT_URI = "https://party-queue-5yzw.onrender.com/callback";
}

console.log("Server startet...");
console.log(
  "SPOTIFY_CLIENT_ID:",
  process.env.SPOTIFY_CLIENT_ID ? "✔️ geladen" : "❌ fehlt"
);
console.log(
  "SPOTIFY_CLIENT_SECRET:",
  process.env.SPOTIFY_CLIENT_SECRET ? "✔️ geladen" : "❌ fehlt"
);
console.log("REDIRECT_URI:", process.env.REDIRECT_URI);

const app = express();
app.use(cors());
app.use(bodyParser.json());

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
app.use(express.static(path.join(__dirname, "public")));

const PORT = process.env.PORT || 3000;

// --- Tokens ---
let access_token = process.env.SPOTIFY_ACCESS_TOKEN || "";
let refresh_token = process.env.SPOTIFY_REFRESH_TOKEN || "";

// --- Spotify Login ---
app.get("/login", (req, res) => {
  const scopes = "user-modify-playback-state user-read-playback-state";
  const authUrl =
    "https://accounts.spotify.com/authorize" +
    "?response_type=code" +
    "&client_id=" +
    encodeURIComponent(process.env.SPOTIFY_CLIENT_ID) +
    "&scope=" +
    encodeURIComponent(scopes) +
    "&redirect_uri=" +
    encodeURIComponent(process.env.REDIRECT_URI);
  console.log("Redirecting to:", authUrl);
  res.redirect(authUrl);
});

// --- Callback nach erfolgreichem Login ---
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
            process.env.SPOTIFY_CLIENT_ID +
              ":" +
              process.env.SPOTIFY_CLIENT_SECRET
          ).toString("base64"),
      },
      body: new URLSearchParams({
        grant_type: "authorization_code",
        code,
        redirect_uri: process.env.REDIRECT_URI,
      }),
    });

    const data = await response.json();

    if (data.error) {
      console.error("Spotify Auth Error:", data);
      return res
        .status(400)
        .send(
          "Spotify-Authentifizierung fehlgeschlagen: " +
            (data.error_description || data.error)
        );
    }

    access_token = data.access_token;
    refresh_token = data.refresh_token;

    console.log("Spotify verbunden!");
    console.log("Access Token:", access_token?.substring(0, 20) + "...");
    console.log("Refresh Token:", refresh_token?.substring(0, 20) + "...");
    console.log("\n👉 Diese Tokens kannst du in Render speichern:");
    console.log("SPOTIFY_ACCESS_TOKEN=" + access_token);
    console.log("SPOTIFY_REFRESH_TOKEN=" + refresh_token + "\n");

    res.redirect("/");
  } catch (err) {
    console.error("Fehler im Callback:", err);
    res.status(500).send("Fehler bei der Spotify-Verbindung.");
  }
});

// --- Token automatisch erneuern ---
async function refreshAccessToken() {
  if (!refresh_token) {
    console.warn("⚠️ Kein Refresh-Token vorhanden, bitte erneut einloggen.");
    return;
  }

  try {
    const response = await fetch("https://accounts.spotify.com/api/token", {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        Authorization:
          "Basic " +
          Buffer.from(
            process.env.SPOTIFY_CLIENT_ID +
              ":" +
              process.env.SPOTIFY_CLIENT_SECRET
          ).toString("base64"),
      },
      body: new URLSearchParams({
        grant_type: "refresh_token",
        refresh_token,
      }),
    });

    const data = await response.json();

    if (data.access_token) {
      access_token = data.access_token;
      console.log("♻️ Token aktualisiert (Spotify-API).");
    } else {
      console.error("❌ Fehler beim Token-Refresh:", data);
    }
  } catch (err) {
    console.error("❌ Refresh-Error:", err.message);
  }
}

// beim Start einmal aktualisieren
refreshAccessToken();
// dann alle 30 Minuten automatisch
setInterval(refreshAccessToken, 1000 * 60 * 30);

// --- Songs suchen ---
app.get("/search", async (req, res) => {
  if (!access_token)
    return res.status(401).json({ error: "Bitte Spotify erneut verbinden." });

  const q = req.query.q;
  try {
    const response = await fetch(
      `https://api.spotify.com/v1/search?type=track&limit=10&q=${encodeURIComponent(
        q
      )}`,
      { headers: { Authorization: "Bearer " + access_token } }
    );
    const data = await response.json();

    if (!data.tracks) {
      console.error("Ungültige Antwort:", data);
      return res.status(400).json({ error: "Fehler bei der Spotify-Suche." });
    }

    res.json(data.tracks.items);
  } catch (err) {
    console.error("Suchfehler:", err);
    res.status(500).json({ error: "Serverfehler bei der Suche." });
  }
});

// --- Song zur Queue hinzufügen ---
app.post("/add", async (req, res) => {
  if (!access_token)
    return res.status(401).json({ error: "Bitte Spotify erneut verbinden." });

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
      console.log("Song hinzugefügt:", uri);
      return res.json({ success: true });
    } else {
      const text = await response.text();
      console.error("Fehler beim Hinzufügen:", text);
      return res
        .status(400)
        .json({ error: "Fehler beim Hinzufügen zur Queue." });
    }
  } catch (err) {
    console.error("Serverfehler beim Hinzufügen:", err);
    res.status(500).json({ error: "Serverfehler beim Hinzufügen." });
  }
});

// --- Status prüfen ---
app.get("/status", async (req, res) => {
  if (!access_token) return res.json({ connected: false, reason: "Kein Token" });

  try {
    const response = await fetch("https://api.spotify.com/v1/me", {
      headers: { Authorization: "Bearer " + access_token },
    });
    if (response.status === 200) {
      const me = await response.json();
      res.json({ connected: true, user: me.display_name });
    } else {
      const data = await response.json();
      res.json({ connected: false, error: data });
    }
  } catch (e) {
    res.json({ connected: false, error: e.message });
  }
});

// --- Homepage ---
app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "index.html"));
});

// --- Server starten ---
app.listen(PORT, () => {
  console.log(`✅ Server läuft auf Port ${PORT}`);
});
