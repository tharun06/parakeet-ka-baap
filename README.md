# ParakeetAI 3.9.9 recovered runnable project

This project runs the compiled Electron application recovered from
`ParakeetAI-Setup-3.9.9.exe`. It uses the exact Electron version detected in
the original Windows executable: **Electron 38.8.6**.

The supplied installer includes native audio bindings for Windows x64,
Windows ARM64, macOS x64, and macOS ARM64. It does not include a Linux native
binding, so this recovered build cannot run fully on Linux.

## Windows - easiest method

1. Install Node.js if it is not already installed.
2. Extract this entire ZIP to a normal folder.
3. Double-click `start-windows.cmd`.
4. The first run downloads Electron and can take a few minutes.

You may also open Command Prompt in this directory and run:

```text
npm install
npm start
```

To create a portable Windows x64 executable folder, run:

```text
npm run build:portable
```

Then double-click `release/ParakeetAI-Local-win32-x64/ParakeetAI Local.exe`.
Keep the complete generated folder together. The portable executable includes
Electron and starts its local backend automatically, so Node and npm are not
needed when running that generated copy.
Both the packaged main process and renderer are fixed to the localhost API;
the production ParakeetAI login endpoint is not selected in this build.

## What was adjusted

The original installer bundle expects packaged-only preload and worker paths.
Those two paths were redirected to the recovered compiled files so the app can
run through the Electron development runner.

For safety, the recovered runner also:

- does not expose Electron's development remote-debugging port;
- does not unregister protocol handlers belonging to an official installation;
- uses the separate `parakeetai-desktop-dev` user-data folder;
- does not enable the official app's automatic start-at-login behavior;
- skips packaged-app auto-updates.

The untouched compiled main bundle is preserved as
`app/dist/main/main.original.js`.

## Editing the recovered code

The executable JavaScript is under `app/dist/main/` and
`app/dist/renderer/`. These are compiled bundles rather than the original
TypeScript project, so edits must be made carefully. Run `npm start` again after
changing a file.

The default runner no longer uses ParakeetAI's online services or login flow.
It starts a local compatibility API, supplies a local user and plan, and routes
the recovered chat and transcription interfaces through that local backend.
The backend uses `OPENAI_API_KEY` for `gpt-5.6-terra` answers and
`gpt-live-transcribe` streaming transcription. Electron itself remains blocked
from making non-local HTTP or WebSocket requests.

Set the key in the Windows user environment, then run the application:

```powershell
setx OPENAI_API_KEY "your-key-here"
npm start
```

The launcher can read a newly saved Windows user key even before the current
terminal has been restarted. Override the defaults with `OPENAI_ANSWER_MODEL`
or `OPENAI_TRANSCRIPTION_MODEL` when needed.

## Local resumes and documents

Choose **Upload** from the resume or document picker. The app opens a local
page at `http://localhost:3000/dashboard/resumes` or
`http://localhost:3000/dashboard/documents`. Upload the file there, return to
the desktop app, refresh the picker, and select it.

PDF, DOCX, TXT, Markdown, RTF, CSV, and JSON files up to 15 MB are supported.
Original files and extracted text are saved under `local-data/`, which is
excluded from source control. Files are not sent to ParakeetAI. When a selected
file is used to answer a question, its extracted text is included as context in
the request to the configured OpenAI model.

**View Transcript** opens a local page at `/dashboard/callSessions`. Session
transcripts are saved in the same local data store, refresh live in the browser,
and can be copied or downloaded as a text file.

Company and job-description fields are optional in this local build. A session
can be created and started with those fields blank.

Screenshots attached in the live chat are sent as vision inputs to the
configured OpenAI model. Coding-problem screenshots request a simple problem
summary, a step-by-step approach, heavily commented complete code, a
walkthrough, complexity and edge cases, and a short explanation to say aloud.
Python 3 is used when the screenshot does not specify a language. Extra Context
is an always-visible editable field, pre-filled with this coding preference for
new sessions.

For a long coding question, click **Add Screenshot** once for each part. Each
capture is kept in the chat draft and shown as a removable thumbnail; no answer
is requested yet. After all parts are attached in reading order, optionally add
a message and click **Send** once. A draft supports up to 10 screenshots and 12
MB total, and the backend combines all attached images as one problem.

If an answer is not satisfactory, click **Regenerate** or press **Ctrl+R**
(**Command+R** on macOS). This repeats the most recent real question using the
same transcript text and attached screenshots. **Ctrl+Enter** remains the
**Answer** shortcut for a newly spoken question.

Non-coding answers are prompted as natural spoken interview responses: direct,
simple conversational English in one or two short paragraphs. Technical terms
and product names are preserved and explained plainly, while essay-style
headings, bullet lists, bold labels, and repeated summaries are avoided. Coding
answers keep the more detailed structured format described above.

## Validation result

The application has been launched and tested on Windows x64. Validation covers
local account startup, resume/document listing, TXT/PDF/DOCX extraction,
session creation and activation, screenshot vision for a coding problem, the
local transcription WebSocket handshake, and an OpenAI answer personalized
with uploaded resume context.
