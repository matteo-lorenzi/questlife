// Lance vite + Electron en développement pour un profil de données donné.
//   node scripts/electron-dev.cjs          -> profil réel (comportement historique)
//   node scripts/electron-dev.cjs demo     -> profil « demo » : jeu de données fourni, régénéré à chaque lancement
//   node scripts/electron-dev.cjs empty    -> profil « empty » : vide, comme un premier lancement
// Les profils demo et empty ont leur propre dossier de données Electron (voir electron/main.cjs).
const { spawn } = require("node:child_process");

const profile = process.argv[2] || "";
const env = { ...process.env };
delete env.VITE_DEMO;
delete env.QUESTLIFE_PROFILE;

if (profile) {
  if (!["demo", "empty"].includes(profile)) {
    console.error(`Profil inconnu : "${profile}" (attendu : demo ou empty).`);
    process.exit(1);
  }
  env.QUESTLIFE_PROFILE = profile;
  if (profile === "demo") env.VITE_DEMO = "1";
}

// Hors `npm run`, node_modules/.bin n'est pas dans le PATH : on l'y ajoute pour vite, wait-on et electron.
const path = require("node:path");
const binDir = path.join(__dirname, "..", "node_modules", ".bin");
const pathKey = Object.keys(env).find((k) => k.toLowerCase() === "path") || "PATH";
env[pathKey] = `${binDir}${path.delimiter}${env[pathKey] || ""}`;

const concurrentlyBin = require("./resolve-bin.cjs").resolveBin("concurrently");
const child = spawn(
  process.execPath,
  [concurrentlyBin, "-k", "vite --strictPort", "wait-on http://localhost:5173 && electron ."],
  { stdio: "inherit", env },
);
child.on("exit", (code) => process.exit(code ?? 0));
