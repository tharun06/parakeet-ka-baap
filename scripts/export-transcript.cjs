const fs = require("node:fs");
const path = require("node:path");

const sessionId = process.argv[2];
if (!sessionId) throw new Error("Usage: node scripts/export-transcript.cjs <session-id> [output-file]");

const localDataDirectory = process.env.PARAKEET_LOCAL_DATA_DIR
  ? path.resolve(process.env.PARAKEET_LOCAL_DATA_DIR)
  : path.resolve(process.env.APPDATA || "", "ParakeetAI-Local", "local-data");
const libraryPath = path.join(localDataDirectory, "library.json");
const library = JSON.parse(fs.readFileSync(libraryPath, "utf8"));
const session = (library.sessions || []).find(item => item.id === sessionId);
const rows = library.transcripts?.[sessionId] || [];
if (!session) throw new Error(`Session not found: ${sessionId}`);

const title = String(session.title || "interview").replace(/[^a-z0-9_-]+/gi, "-");
const outputPath = path.resolve(process.argv[3] || path.join(process.cwd(), "exports", `${title}-transcript.txt`));
const speakerLabel = type => type === "share" ? "Interviewer" : type === "microphone" ? "You" : "Combined";
const text = rows
  .filter(row => String(row.content || row.partialContent || "").trim())
  .sort((left, right) => new Date(left.createdAt) - new Date(right.createdAt))
  .map(row => `[${speakerLabel(row.type)}] ${String(row.content || row.partialContent).trim()}`)
  .join("\r\n\r\n");

fs.mkdirSync(path.dirname(outputPath), { recursive: true });
fs.writeFileSync(outputPath, `${session.title || "Interview"}\r\nSession: ${session.id}\r\n\r\n${text}\r\n`, "utf8");
console.log(outputPath);
