import express from "express";
import fetch from "node-fetch";
import cors from "cors";
import bodyParser from "body-parser";
import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";

// 🌍 Lade Umgebungsvariablen (.env oder Render)
dotenv.config();

// --- Fallback für Render: ENV-Variablen sicherstellen ---
if (!process.env.SPOTIFY_CLIENT_ID && process.env.CLIENT_ID) {
  process.env.SPOTIFY_CLIENT_ID = process.env.CLIENT_ID;
}
if (!process.env.SPOTIFY_CLIENT_SECRET && process.env.CLIENT_SECRET) {
  process.env.SPOTIFY_CLIENT_SECRET = process.env.CLIENT_SECRET;
}
if (!process.env.REDIRECT_URI) {
  process.env.REDIRECT_URI = "https://party-queue-5yzw.onrender.com/callback";
}

// Debug-Ausgabe zum Überprüfen
console.log("✅ Server startet...");
console.log(
  "SPOTIFY_CLIENT_ID:",
  process.env.SPOTIFY_CLIENT_ID ? "✔️ geladen" : "❌ fehlt"
);
console.log(
  "SPOTIFY_CLIENT_SECRET:",
  process.env.SPOTIFY_CLIENT_SECRET ? "✔️ geladen" : "❌ fehlt"
);
console.log("REDIRECT_URI:", process.env.REDIRECT_URI);

// --- Grundkonfiguration ---
const app = express();
app.use(cors());
app.use(bodyParser.json());

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
app.use(express.static(path.join(__dirname, "public")));

const PORT = process.env.PORT || 3000;

// --- Globale Tokens ---
let access_token = "";
let refresh_token = "";

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
  console.log("🔗 Redirectin
