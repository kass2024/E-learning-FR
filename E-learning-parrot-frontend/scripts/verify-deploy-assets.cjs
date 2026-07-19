/**
 * Ensures deploy-critical files exist in dist/ after every production build.
 */
const fs = require("fs");
const path = require("path");

const root = path.join(__dirname, "..");
const dist = path.join(root, "dist");
const required = [
  path.join(dist, ".htaccess"),
  path.join(dist, "index.html"),
  path.join(dist, "version.json"),
];

const htaccessSrc = path.join(root, "public", ".htaccess");
const htaccessDest = path.join(dist, ".htaccess");

if (fs.existsSync(htaccessSrc)) {
  fs.copyFileSync(htaccessSrc, htaccessDest);
  console.log("[postbuild] Synced public/.htaccess -> dist/.htaccess");
} else {
  console.error("[postbuild] Missing source public/.htaccess");
  process.exit(1);
}

const missing = required.filter((file) => !fs.existsSync(file));
if (missing.length > 0) {
  console.error("[postbuild] Missing deploy files:");
  missing.forEach((file) => console.error(`  - ${path.relative(root, file)}`));
  process.exit(1);
}

console.log("[postbuild] dist/.htaccess, index.html, and version.json are ready for upload.");
