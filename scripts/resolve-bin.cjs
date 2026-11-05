// Résout le chemin du binaire JS d'un paquet via son champ `bin`.
// `require.resolve("pkg/dist/bin/x.js")` échoue (ERR_PACKAGE_PATH_NOT_EXPORTED) dès que le
// paquet déclare `exports` sans ce sous-chemin (concurrently >= 9.2) ; package.json, lui, reste exporté.
const path = require("node:path");

function resolveBin(pkgName, binName = pkgName) {
  const pkgJsonPath = require.resolve(`${pkgName}/package.json`);
  const { bin } = require(pkgJsonPath);
  const rel = typeof bin === "string" ? bin : bin[binName];
  if (!rel) throw new Error(`Aucun binaire "${binName}" déclaré par ${pkgName}.`);
  return path.resolve(path.dirname(pkgJsonPath), rel);
}

module.exports = { resolveBin };
