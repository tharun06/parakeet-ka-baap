const fs = require("node:fs");
const path = require("node:path");

if (process.platform !== "win32" || process.arch !== "x64") {
  throw new Error(`This portable build script currently targets Windows x64, not ${process.platform} ${process.arch}.`);
}

const root = path.resolve(__dirname, "..");
const releaseRoot = path.join(root, "release");
const output = path.join(releaseRoot, "ParakeetAI-Local-win32-x64");
const electronDist = path.join(root, "node_modules", "electron", "dist");
const packagedRoot = path.join(output, "resources", "app");

if (!output.startsWith(`${releaseRoot}${path.sep}`)) throw new Error("Unsafe portable output path.");
if (!fs.existsSync(path.join(electronDist, "electron.exe"))) throw new Error("Electron runtime is missing. Run npm install first.");

fs.rmSync(output, { recursive: true, force: true });
fs.mkdirSync(output, { recursive: true });
fs.cpSync(electronDist, output, { recursive: true });

const electronExecutable = path.join(output, "electron.exe");
const localExecutable = path.join(output, "ParakeetAI Local.exe");
fs.renameSync(electronExecutable, localExecutable);

fs.mkdirSync(path.join(packagedRoot, "scripts"), { recursive: true });
fs.cpSync(path.join(root, "app"), path.join(packagedRoot, "app"), { recursive: true });
fs.copyFileSync(path.join(root, "scripts", "local-backend.cjs"), path.join(packagedRoot, "scripts", "local-backend.cjs"));
fs.copyFileSync(path.join(root, "scripts", "question-grouping.cjs"), path.join(packagedRoot, "scripts", "question-grouping.cjs"));

const rootNodeModules = path.join(root, "node_modules");
const packagedNodeModules = path.join(packagedRoot, "node_modules");
fs.cpSync(rootNodeModules, packagedNodeModules, {
  recursive: true,
  filter(source) {
    const relative = path.relative(rootNodeModules, source);
    return relative !== "electron" && !relative.startsWith(`electron${path.sep}`);
  },
});

fs.writeFileSync(path.join(packagedRoot, "package.json"), JSON.stringify({
  name: "parakeetai-local",
  productName: "ParakeetAI Local",
  version: "3.9.9-local",
  private: true,
  main: "app/local-bootstrap.cjs",
}, null, 2));

fs.writeFileSync(path.join(output, "README.txt"), [
  "ParakeetAI Local - portable Windows x64 build",
  "",
  "Double-click 'ParakeetAI Local.exe' to start the app.",
  "Keep this entire folder together; the EXE needs the resources and DLL files beside it.",
  "The app reads OPENAI_API_KEY from your Windows user environment.",
  "Local resumes and documents are stored under %APPDATA%\\ParakeetAI-Local\\local-data.",
  "",
].join("\r\n"));

console.log(`Portable app created: ${localExecutable}`);
