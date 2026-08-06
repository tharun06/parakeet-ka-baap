const fs = require("node:fs");
const path = require("node:path");

const supportedBindings = {
  win32: {
    x64: "parakeetai-native.win32-x64-msvc.node",
    arm64: "parakeetai-native.win32-arm64-msvc.node",
  },
  darwin: {
    x64: "parakeetai-native.darwin-x64.node",
    arm64: "parakeetai-native.darwin-arm64.node",
  },
};

const binding = supportedBindings[process.platform]?.[process.arch];
if (!binding) {
  console.error(
    `Unsupported platform: ${process.platform}-${process.arch}. ` +
      "The supplied installer contains native audio bindings only for Windows and macOS.",
  );
  process.exit(1);
}

const bindingPath = path.resolve(
  __dirname,
  "../app/node_modules/@parakeetai-desktop/native-modules/prebuilt",
  binding,
);
if (!fs.existsSync(bindingPath)) {
  console.error(`Required native binding is missing: ${binding}`);
  process.exit(1);
}

console.log(`Native runtime available: ${process.platform}-${process.arch}`);
