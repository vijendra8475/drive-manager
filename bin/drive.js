// #!/usr/bin/env node

const { program } = require("commander");
const chalk = require("chalk");
const { pushFiles, pullFiles } = require("../src/driveService");
const fs = require("fs");
const path = require("path");

program
  .name("drive")
  .description("Google Drive CLI for code management")
  .version("1.0.0");

// ---------------- INIT ----------------
program
  .command("init")
  .description("Initialize Drive project and authenticate")
  .action(() => {
    console.log(chalk.green("✔ Drive project initialized!"));
    console.log(chalk.yellow("➡ Next, run 'drive push [file]' or 'drive pull'"));
  });

// ---------------- PUSH ----------------
program
  .command("push [file]")
  .description("Upload a specific file or all files if no file specified")
  .action(async (file) => {
    try {
      const filesToUpload = [];

      if (file) {
        const filePath = path.join(process.cwd(), file);
        if (!fs.existsSync(filePath)) {
          console.error(chalk.red(`❌ File not found: ${file}`));
          return;
        }
        filesToUpload.push(filePath);
      }

      console.log(chalk.blue("🔼 Uploading files to Google Drive..."));
      await pushFiles(filesToUpload);
      console.log(chalk.green("✔ Upload complete!"));
    } catch (err) {
      console.error(chalk.red("❌ Upload failed:"), err.message);
    }
  });

// ---------------- PULL ----------------
program
  .command("pull")
  .description("Download all files from Drive folder to local folder")
  .action(async () => {
    try {
      console.log(chalk.blue("🔽 Downloading files from Google Drive..."));
      await pullFiles();
      console.log(chalk.green("✔ Download complete!"));
    } catch (err) {
      console.error(chalk.red("❌ Download failed:"), err.message);
    }
  });

program.parse(process.argv);
