const fs = require("node:fs");
const path = require("node:path");
const { groupRecentTranscriptEntries } = require("./question-grouping.cjs");

const root = path.resolve(__dirname, "..");
const requiredFiles = [
  "app/package.json",
  "app/local-bootstrap.cjs",
  "app/dist/main/main.js",
  "app/dist/main/main.original.js",
  "app/dist/main/preload.js",
  "app/dist/main/mic-monitor-worker.js",
  "app/dist/renderer/index.html",
  "app/dist/renderer/renderer.js",
  "app/assets/icons/512x512.png",
  "app/node_modules/@parakeetai-desktop/native-modules/prebuilt/parakeetai-native.win32-x64-msvc.node",
  "scripts/question-grouping.cjs",
];

const missing = requiredFiles.filter((file) => !fs.existsSync(path.join(root, file)));
if (missing.length > 0) {
  console.error("Missing required files:");
  for (const file of missing) console.error(`- ${file}`);
  process.exit(1);
}

const mainSource = fs.readFileSync(path.join(root, "app/dist/main/main.js"), "utf8");
const forbiddenFragments = [
  "../../.erb/dll/preload.js",
  "mic-monitor-worker.bundle.dev.js",
  'appendSwitch("remote-debugging-port","9223")',
  'removeAsDefaultProtocolClient("parakeetai")',
];
const remaining = forbiddenFragments.filter((fragment) => mainSource.includes(fragment));
if (remaining.length > 0) {
  console.error("The runtime patch is incomplete:");
  for (const fragment of remaining) console.error(`- ${fragment}`);
  process.exit(1);
}
if (!mainSource.includes('CommandOrControl+R') || !mainSource.includes('main/regenerate-ai-message-shortcut-pressed')) {
  throw new Error("The regenerate keyboard shortcut is missing.");
}
if (!mainSource.includes('process.env.PARAKEET_LOCAL_ONLY?"parakeetai-local"') ||
    !mainSource.includes('(0,w.initMain)(),(0,f.default)(),(0,v.default)()') ||
    !mainSource.includes('process.env.PARAKEET_LOCAL_ONLY?0:(0,p.default)(),(0,O.registerDisplayListeners)()') ||
    !mainSource.includes('l.app.isPackaged&&!process.env.PARAKEET_LOCAL_ONLY&&l.app.setLoginItemSettings')) {
  throw new Error("The packaged local app isolation patch is missing.");
}
if (!mainSource.includes('t.getDefaultApiConfig=function(){const e="localhost";return{environment:e,url:t.yl[e]')) {
  throw new Error("The main process API does not default to localhost.");
}

const appPackage = JSON.parse(fs.readFileSync(path.join(root, "app/package.json"), "utf8"));
if (appPackage.main !== "./local-bootstrap.cjs") {
  throw new Error(`Unexpected Electron entry point: ${appPackage.main}`);
}

const bootstrapSource = fs.readFileSync(path.join(root, "app/local-bootstrap.cjs"), "utf8");
if (!bootstrapSource.includes("PARAKEET_LOCAL_ONLY") || !bootstrapSource.includes("onBeforeRequest") ||
    !bootstrapSource.includes("ELECTRON_RUN_AS_NODE") || !bootstrapSource.includes("local-backend.cjs")) {
  throw new Error("The local-only network guard is missing.");
}

const rendererSource = fs.readFileSync(path.join(root, "app/dist/renderer/renderer.js"), "utf8");
if (!rendererSource.includes("ws://localhost:3000/v2") || rendererSource.includes("wss://eu2.rt.speechmatics.com/v2")) {
  throw new Error("The renderer transcription endpoint is not local-only.");
}
if (!rendererSource.includes('t.getDefaultApiConfig=function(){const e="localhost";return{environment:e,url:t.API_URLS[e]')) {
  throw new Error("The renderer API does not default to localhost.");
}
if (!rendererSource.includes("superRefine(()=>{})") || rendererSource.includes("Company is required for interview mode.")) {
  throw new Error("The local session form still requires cloud-era company/job fields.");
}
if (!rendererSource.includes('placeholder:"Extra Context or instructions for the AI..."') || rendererSource.includes("ye=_e?!me&&!ge&&!be:!be")) {
  throw new Error("The local Extra Context editor or session footer patch is missing.");
}
if (!rendererSource.includes('t.DEFAULT_EXTRA_CONTEXT="For non-coding questions: answer like a real person speaking in an interview')) {
  throw new Error("The preferred local coding context is missing.");
}
if (!rendererSource.includes('parakeet-local-queue-screenshot') || !rendererSource.includes('__parakeetPendingScreenshotCaptures') || !rendererSource.includes('children:"Add Screenshot"')) {
  throw new Error("The queued multi-screenshot workflow is missing.");
}
if (rendererSource.includes('ut({kind:"analyze-screen",triggeredUsingShortcut:e,screenshots:[t]})') || !rendererSource.includes('limit 12 MB')) {
  throw new Error("The screenshot action still auto-sends or has the old draft limit.");
}
if (!rendererSource.includes('children:"Regenerate"') || !rendererSource.includes('kind:"regenerate"')) {
  throw new Error("The local Regenerate control is missing.");
}
if (!rendererSource.includes('w.default,{callSession:t,combinedTranscript:He') ||
    !rendererSource.includes('onClear:R,onAnswer:ee,listeningIndicator:I') ||
    !rendererSource.includes('onClick:ee,className:"font-normal",children:"Answer"') ||
    !rendererSource.includes('onClick:Se,className:"font-normal",children:"Answer"')) {
  throw new Error("The transcript manual Answer controls are missing.");
}
const backendSource = fs.readFileSync(path.join(root, "scripts/local-backend.cjs"), "utf8");
if (!backendSource.includes("gpt-5.6-terra") || !backendSource.includes("gpt-live-transcribe")) {
  throw new Error("The OpenAI answer/transcription integration is missing.");
}
if (!backendSource.includes("/dashboard/resumes") || !backendSource.includes("/dashboard/documents") || !backendSource.includes("collectSessionContext")) {
  throw new Error("The local resume/document library integration is missing.");
}
if (!backendSource.includes('url.pathname === "/dashboard/callSessions"') ||
    !backendSource.includes('url.pathname === "/local-api/transcript"') ||
    !backendSource.includes("transcripts: Object.fromEntries(transcripts)")) {
  throw new Error("The persistent local transcript viewer is missing.");
}
if (!backendSource.includes("collectImages") || !backendSource.includes('type: "input_image"')) {
  throw new Error("The local screenshot vision integration is missing.");
}
if (!backendSource.includes("treat them as consecutive parts of one problem in attachment order") || !backendSource.includes("16 * 1024 * 1024")) {
  throw new Error("The backend multi-screenshot ordering or payload limit is missing.");
}
if (!backendSource.includes("replayableChatRequests") || !backendSource.includes('body?.trigger?.kind === "regenerate"')) {
  throw new Error("The backend answer regeneration support is missing.");
}
if (!backendSource.includes("sound like a real person speaking naturally in an interview") || !backendSource.includes("Do not use headings, bullet lists, bold labels")) {
  throw new Error("The natural spoken-answer prompt is missing.");
}
if (!backendSource.includes("groupRecentTranscriptEntries") ||
    !backendSource.includes("answer every named concept and every requested part")) {
  throw new Error("The multipart transcript question handling is missing.");
}

const groupedQuestion = groupRecentTranscriptEntries([
  { id: "old", type: "share", content: "What is Flask?", createdAt: "2026-08-06T15:23:00.000Z" },
  { id: "one", type: "share", content: "What is the difference between fine-tuning", createdAt: "2026-08-06T15:23:22.734Z" },
  { id: "two", type: "share", content: "Prompt engineering", createdAt: "2026-08-06T15:23:25.565Z" },
], [
  { id: "three", type: "share", content: "And RAG", createdAt: "2026-08-06T15:23:26.532Z" },
  { id: "three", type: "share", content: "And RAG", createdAt: "2026-08-06T15:23:26.532Z" },
]);
if (groupedQuestion.map(entry => entry.content).join(" | ") !==
    "What is the difference between fine-tuning | Prompt engineering | And RAG") {
  throw new Error("Multipart transcript grouping does not preserve the complete recent question.");
}

console.log("Recovered app structure and runtime patches are valid.");
