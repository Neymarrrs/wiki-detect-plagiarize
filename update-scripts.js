
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

// Get the directory name in ES module
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Read the current package.json
const packageJsonPath = path.join(__dirname, 'package.json');
const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));

// Add the Electron-related scripts
packageJson.scripts = {
  ...packageJson.scripts,
  "electron": "wait-on tcp:8080 && electron electron/main.js",
  "electron:dev": "concurrently \"cross-env ELECTRON_START_URL=http://localhost:8080 npm run dev\" \"npm run electron\"",
  "electron:build": "npm run build && electron-builder build --config electron-builder.json"
};

// Add the main entry for Electron
packageJson.main = "electron/main.js";

// Write the updated package.json back to disk
fs.writeFileSync(packageJsonPath, JSON.stringify(packageJson, null, 2));

console.log('Updated package.json with Electron scripts');
