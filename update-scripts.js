
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

// Get the directory name in ES module
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

try {
  // Read the current package.json
  const packageJsonPath = path.join(__dirname, 'package.json');
  const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));

  // Add the Electron-related scripts without overriding existing ones
  const updatedScripts = {
    ...packageJson.scripts,
    "electron": "wait-on tcp:8080 && electron electron/main.js",
    "electron:dev": "cross-env ELECTRON_START_URL=http://localhost:8080 npm run dev -- --host & npm run electron",
    "electron:build": "npm run build && electron-builder build --config electron-builder.json"
  };

  // Only update if needed
  if (JSON.stringify(packageJson.scripts) !== JSON.stringify(updatedScripts)) {
    packageJson.scripts = updatedScripts;
    
    // Add the main entry for Electron if it doesn't exist
    if (!packageJson.main) {
      packageJson.main = "electron/main.js";
    }

    // Write the updated package.json back to disk
    fs.writeFileSync(packageJsonPath, JSON.stringify(packageJson, null, 2));
    console.log('Updated package.json with Electron scripts');
  } else {
    console.log('package.json already has the required scripts');
  }
} catch (error) {
  console.error('Error updating package.json:', error);
}
