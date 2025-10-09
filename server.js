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
  res.send("✅ Spotify verbunden! Du kannst dieses Fenster
