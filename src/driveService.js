const fs = require("fs");
const path = require("path");
const { google } = require("googleapis");
const { getAuthClient } = require("./auth");

const DRIVE_FOLDER_NAME = "drive-sync"; // Folder in Google Drive

// Get or create Drive folder
async function getDriveFolderId(drive) {
  const res = await drive.files.list({
    q: `mimeType='application/vnd.google-apps.folder' and name='${DRIVE_FOLDER_NAME}'`,
    fields: "files(id, name)",
  });

  if (res.data.files.length > 0) return res.data.files[0].id;

  const folder = await drive.files.create({
    requestBody: { name: DRIVE_FOLDER_NAME, mimeType: "application/vnd.google-apps.folder" },
    fields: "id",
  });

  console.log(`✔ Created Drive folder '${DRIVE_FOLDER_NAME}' -> ${folder.data.id}`);
  return folder.data.id;
}

const HISTORY_PATH = path.join(process.cwd(), ".drive-history.json");

// ---------------- HISTORY LOGGER ----------------
function logHistory(entry) {
  const historyFile = path.join(process.cwd(), ".drive-history.json");
  let history = [];

  if (fs.existsSync(historyFile)) {
    try {
      const raw = fs.readFileSync(historyFile, "utf-8");
      history = JSON.parse(raw);
      if (!Array.isArray(history)) {
        history = []; // ✅ reset if file got corrupted or is an object
      }
    } catch (err) {
      history = []; // ✅ reset if JSON parse fails
    }
  }

  history.push(entry);

  fs.writeFileSync(historyFile, JSON.stringify(history, null, 2));
}


// ---------------- PUSH ----------------
async function pushFiles(filePaths = []) {
  const auth = getAuthClient();
  const drive = google.drive({ version: "v3", auth });
  const folderId = await getDriveFolderId(drive);

  if (filePaths.length === 0) {
    const allFiles = fs.readdirSync(process.cwd());
    for (let f of allFiles) {
      if (f.startsWith(".") || f === "node_modules") continue;
      filePaths.push(path.join(process.cwd(), f));
    }
  }

  for (let filePath of filePaths) {
    const fileName = path.basename(filePath); // ✅ define here
    try {
      const res = await drive.files.create({
        requestBody: {
          name: fileName,
          parents: [folderId],
        },
        media: {
          body: fs.createReadStream(filePath),
        },
        fields: "id",
      });

      console.log("✔ Uploaded:", fileName, "->", res.data.id);

      // ✅ log after upload success
      logHistory({
        user: process.env.USER || process.env.USERNAME || "unknown",
        timestamp: new Date().toISOString(),
        file: fileName,
        driveId: res.data.id,
        action: "upload",
      });

    } catch (err) {
      console.error("❌ Upload failed for", fileName, ":", err.message);
    }
  }
}



// ---------------- PULL ----------------
async function pullFiles() {
  const auth = getAuthClient();
  const drive = google.drive({ version: "v3", auth });

  const folderId = await getDriveFolderId(drive);

  const res = await drive.files.list({
    q: `'${folderId}' in parents`,
    fields: "files(id, name)",
  });

  const files = res.data.files;

  for (let file of files) {
    const dest = fs.createWriteStream(path.join(process.cwd(), file.name));
    await drive.files
      .get({ fileId: file.id, alt: "media" }, { responseType: "stream" })
      .then((res) => new Promise((resolve, reject) => {
        res.data.pipe(dest);
        dest.on("finish", resolve);
        dest.on("error", reject);
      }));
    console.log("✔ Downloaded:", file.name);
  }
}

module.exports = { pushFiles, pullFiles };
