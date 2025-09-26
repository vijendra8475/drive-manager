const fs = require("fs");
const path = require("path");
const readline = require("readline");
const { google } = require("googleapis");

const CREDENTIALS_PATH = path.join(__dirname, "../credentials.json");
const TOKEN_PATH = path.join(__dirname, "../token.json");

async function initAuth() {
  const credentials = JSON.parse(fs.readFileSync(CREDENTIALS_PATH));
  const { client_id, client_secret, redirect_uris } = credentials.installed;
  const oAuth2Client = new google.auth.OAuth2(client_id, client_secret, redirect_uris[0]);

  const authUrl = oAuth2Client.generateAuthUrl({
    access_type: "offline",
    scope: ["https://www.googleapis.com/auth/drive.file"],
  });

  console.log("Authorize this app by visiting this URL:");
  console.log(authUrl);

  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  rl.question("Enter the code from that page: ", async (code) => {
    rl.close();
    const { tokens } = await oAuth2Client.getToken(code);
    oAuth2Client.setCredentials(tokens);
    fs.writeFileSync(TOKEN_PATH, JSON.stringify(tokens));
    console.log("✔ Token stored to", TOKEN_PATH);
  });
}

initAuth();
