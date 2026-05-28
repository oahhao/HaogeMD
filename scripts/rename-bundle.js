import { readFileSync, writeFileSync, renameSync, readdirSync, existsSync } from "node:fs";
import { resolve, join } from "node:path";

const root = resolve(import.meta.dirname, "..");
const version = JSON.parse(readFileSync(join(root, "package.json"), "utf-8")).version;

const nsisDir = join(root, "src-tauri", "target", "release", "bundle", "nsis");
const releaseDir = join(root, "src-tauri", "target", "release");

const rename = (dir, oldPattern, newName) => {
  const files = readdirSync(dir);
  const old = files.find((f) => f.includes(oldPattern));
  if (old) {
    renameSync(join(dir, old), join(dir, newName));
    console.log(`[rename-bundle] ${old} -> ${newName}`);
  }
};

rename(nsisDir, "_x64-setup.exe", `ErgeMD-v${version}-setup.exe`);
rename(releaseDir, "ergemd.exe", `ErgeMD-v${version}.exe`);

console.log(`[rename-bundle] Done. Version: ${version}`);
