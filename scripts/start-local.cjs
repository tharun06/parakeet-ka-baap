const { execFileSync, spawn } = require("node:child_process");
const path = require("node:path");
const root = path.resolve(__dirname, "..");
const environment = { ...process.env, PARAKEET_LOCAL_ONLY: "1", DESKTOP_API_URL: "http://localhost:3000" };
delete environment.ELECTRON_RUN_AS_NODE;
if (!environment.OPENAI_API_KEY && process.platform === "win32") {
  try {
    const registry = execFileSync("reg.exe", ["query", "HKCU\\Environment", "/v", "OPENAI_API_KEY"], { encoding: "utf8", windowsHide: true });
    const match = registry.match(/OPENAI_API_KEY\s+REG_\w+\s+(.+)/);
    if (match) environment.OPENAI_API_KEY = match[1].trim();
  } catch {}
}
const backend = spawn(process.execPath, [path.join(__dirname, "local-backend.cjs")], { cwd: root, stdio: "inherit", env: environment });
const app = spawn(require("electron"), [path.join(root, "app")], { cwd: root, stdio: "inherit", env: environment });
let stopping = false;
function stop(code = 0) {
  if (stopping) return;
  stopping = true;
  if (!app.killed) app.kill();
  if (!backend.killed) backend.kill();
  setTimeout(() => process.exit(code), 250).unref();
}
backend.on("exit", code => stop(code || 0));
app.on("exit", code => stop(code || 0));
process.on("SIGINT", () => stop());
process.on("SIGTERM", () => stop());
