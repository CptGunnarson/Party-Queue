// server.js
import express from "express";
import fetch from "node-fetch";
import dotenv from "dotenv";
import cors from "cors";
import path from "path";
import { fileURLToPath } from "url";

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());
app.use(express.static("public"));

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PORT = process.env.PORT || 3000;

// Debug-Ausgabe
console.log("✅ Server gestartet auf Port:", PORT);
console.log("CLIENT_ID:", process.env.CLIENT_ID ? "✔️ geladen" : "❌ fehlt");
console.log("REDIRECT_URI:", process.env.REDIRECT_URI);

// Spotify Login URL
app.get("/login", (req, res) => {
  const scope = "user-modify-playback-state user-read-playback-state";
  const redirect_uri = encodeURIComponent(process.env.REDIRECT_URI);
  const client_id = process.env.CLIENT_ID;
  const authUrl = `https://accounts.spotify.com/authorize?response_type=code&client_id=${client_id}&scope=${scope}&redirect_uri=${redirect_uri}`;
  res.redirect(authUrl);
});

// Callback (Spotify → App)
app.get("/callback", async (req, res) => {
  const code = req.query.code || null;

  try {
    const authOptions = {
      method: "POST",
      headers: {
        Authorization:
          "Basic " +
          Buffer.from(
            process.env.CLIENT_ID + ":" + process.env.CLIENT_SECRET
          ).toString("base64"),
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams({
        grant_type: "authorization_code",
        code: code,
        redirect_uri: process.env.REDIRECT_URI,
      }),
    };

    const response = await fetch("https://accounts.spotify.com/api/token", authOptions);
    const data = await response.json();

    if (data.error) {
      console.error("❌ Spotify Error:", data);
      return res.status(400).send("Spotify Login fehlgeschlagen: " + data.error_description);
    }

    global.access_token = data.access_token;
    console.log("✅ Spotify verbunden!");
    res.redirect("/");
  } catch (error) {
    console.error("❌ Callback Error:", error);
    res.status(500).send("Serverfehler beim Spotify Login");
  }
});

// Songsuche
app.get("/search", async (req, res) => {
  const q = req.query.q;
  if (!global.access_token) {
    return res.status(401).json({ error: "Bitte Spotify erneut verbinden." });
  }

  try {
    const searchUrl = `https://api.spotify.com/v1/search?q=${encodeURIComponent(q)}&type=track&limit=10`;
    const response = await fetch(searchUrl, {
      headers: { Authorization: `Bearer ${global.access_token}` },
    });
    const data = await response.json();

    if (data.error) {
      console.error("Spotify Search Error:", data.error);
      return res.status(400).json({ error: "Spotify-Fehler bei der Suche." });
    }

    res.json(data.tracks.items);
  } catch (err) {
    console.error("❌ Fehler bei /search:", err);
    res.status(500).json({ error: "Serverfehler bei der Suche" });
  }
});

// Songs zur Queue hinzufügen
app.post("/queue", async (req, res) => {
  const { uri } = req.body;
  if (!global.access_token) {
    return res.status(401).json({ error: "Bitte Spotify erneut verbinden." });
  }

  try {
    const response = await fetch(
      `https://api.spotify.com/v1/me/player/queue?uri=${encodeURIComponent(uri)}`,
      {
        method: "POST",
        headers: { Authorization: `Bearer ${global.access_token}` },
      }
    );

    if (response.status === 204) {
      console.log("✅ Song hinzugefügt:", uri);
      res.json({ success: true });
    } else {
      const error = await response.json();
      console.error("❌ Fehler beim Hinzufügen:", error);
      res.status(400).json({ error: "Spotify Queue Error" });
    }
  } catch (err) {
    console.error("❌ Fehler bei /queue:", err);
    res.status(500).json({ error: "Serverfehler bei /queue" });
  }
});

// Homepage
app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "index.html"));
});

app.listen(PORT, () => {
  console.log(`✅ Server läuft auf Port ${PORT}`);
});
