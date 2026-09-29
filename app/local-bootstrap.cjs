const { execFileSync, spawn } = require("node:child_process");
const path = require("node:path");
const { app, clipboard, ipcMain, session } = require("electron");

let packagedBackend = null;

if (app.isPackaged) {
  process.env.PARAKEET_LOCAL_ONLY = "1";
  process.env.DESKTOP_API_URL = "http://localhost:3000";
  app.setName("ParakeetAI Local");
  app.setPath("userData", path.join(app.getPath("appData"), "ParakeetAI-Local"));

  if (!process.env.OPENAI_API_KEY && process.platform === "win32") {
    try {
      const registry = execFileSync("reg.exe", ["query", "HKCU\\Environment", "/v", "OPENAI_API_KEY"], {
        encoding: "utf8",
        windowsHide: true,
      });
      const match = registry.match(/OPENAI_API_KEY\s+REG_\w+\s+(.+)/);
      if (match) process.env.OPENAI_API_KEY = match[1].trim();
    } catch {}
  }

  const packagedRoot = path.resolve(__dirname, "..");
  const backendPath = path.join(packagedRoot, "scripts", "local-backend.cjs");
  const backendEnvironment = {
    ...process.env,
    ELECTRON_RUN_AS_NODE: "1",
    PARAKEET_LOCAL_DATA_DIR: path.join(app.getPath("userData"), "local-data"),
  };
  packagedBackend = spawn(process.execPath, [backendPath], {
    cwd: packagedRoot,
    env: backendEnvironment,
    stdio: "ignore",
    windowsHide: true,
  });
  packagedBackend.on("error", error => console.error(`[local-backend] failed to start: ${error.message}`));
  app.on("before-quit", () => {
    if (packagedBackend && !packagedBackend.killed) packagedBackend.kill();
  });
}

if (process.env.PARAKEET_LOCAL_ONLY === "1") {
  ipcMain.handle("local/copy-text", (_event, text) => {
    clipboard.writeText(String(text ?? ""));
    return true;
  });

  app.whenReady().then(() => {
    session.defaultSession.webRequest.onBeforeRequest((details, callback) => {
      let allowed = false;
      try {
        const url = new URL(details.url);
        allowed = ["file:", "data:", "blob:", "devtools:"].includes(url.protocol) ||
          (["http:", "ws:"].includes(url.protocol) && ["127.0.0.1", "localhost", "::1"].includes(url.hostname));
      } catch {}
      if (!allowed) console.warn(`[local-only] blocked ${details.url}`);
      callback({ cancel: !allowed });
    });

    // The recovered production bundle's CSP omits its own supported localhost
    // development API. Install this after its ready handlers register theirs.
    setImmediate(() => {
      session.defaultSession.webRequest.onHeadersReceived((details, callback) => {
        const headers = { ...details.responseHeaders };
        const key = Object.keys(headers).find(name => name.toLowerCase() === "content-security-policy");
        if (key) {
          headers[key] = headers[key].map(value => value.replace(
            "connect-src 'self'",
            "connect-src 'self' http://localhost:3000 ws://localhost:3000"
          ));
        }
        callback({ responseHeaders: headers });
      });
    });
  });
}

require("./dist/main/main.js");
