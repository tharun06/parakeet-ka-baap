const fs = require("node:fs");
const path = require("node:path");

const mainPath = path.resolve(__dirname, "../app/dist/main/main.js");
let source = fs.readFileSync(mainPath, "utf8");

const replacements = [
  {
    name: "use the packaged preload bundle in development mode",
    from: 'preload:i.app.isPackaged?o.default.join(__dirname,"preload.js"):o.default.join(__dirname,"../../.erb/dll/preload.js")',
    to: 'preload:o.default.join(__dirname,"preload.js")',
  },
  {
    name: "use the packaged microphone worker in development mode",
    from: 'const n=i.app.isPackaged?o.default.join(__dirname,"mic-monitor-worker.js"):o.default.join(__dirname,"mic-monitor-worker.bundle.dev.js");',
    to: 'const n=o.default.join(__dirname,"mic-monitor-worker.js");',
  },
  {
    name: "disable the development remote-debugging port",
    from: 'l.app.isPackaged||l.app.commandLine.appendSwitch("remote-debugging-port","9223"),',
    to: "",
  },
  {
    name: "preserve protocol registration belonging to an official installation",
    from: 'l.app.isPackaged||(l.app.removeAsDefaultProtocolClient("parakeetai"),l.app.removeAsDefaultProtocolClient("parakeetai-dev"));',
    to: "0;",
  },
];

for (const replacement of replacements) {
  if (source.includes(replacement.from)) {
    source = source.replace(replacement.from, replacement.to);
  } else if (replacement.to && !source.includes(replacement.to)) {
    throw new Error(`Could not apply patch: ${replacement.name}`);
  }
}

const screenshotShortcutRegistration = 'i.globalShortcut.register("CommandOrControl+Shift+Enter",()=>{a.mainWindow&&o.default.emit(a.mainWindow,"main/secondary-ai-message-shortcut-pressed")}),i.globalShortcut.register("CommandOrControl+Down"';
const screenshotAndRegenerateShortcutRegistration = 'i.globalShortcut.register("CommandOrControl+Shift+Enter",()=>{a.mainWindow&&o.default.emit(a.mainWindow,"main/secondary-ai-message-shortcut-pressed")}),i.globalShortcut.register("CommandOrControl+R",()=>{a.mainWindow&&o.default.emit(a.mainWindow,"main/regenerate-ai-message-shortcut-pressed")}),i.globalShortcut.register("CommandOrControl+Down"';
if (source.includes(screenshotShortcutRegistration)) {
  source = source.replace(screenshotShortcutRegistration, screenshotAndRegenerateShortcutRegistration);
} else if (!source.includes(screenshotAndRegenerateShortcutRegistration)) {
  throw new Error("Could not add the regenerate keyboard shortcut");
}
const cloudProtocolSelection = 't.PROTOCOL=l.app.isPackaged?"parakeetai":"parakeetai-local"';
const localProtocolSelection = 't.PROTOCOL=process.env.PARAKEET_LOCAL_ONLY?"parakeetai-local":l.app.isPackaged?"parakeetai":"parakeetai-local"';
if (source.includes(cloudProtocolSelection)) {
  source = source.replace(cloudProtocolSelection, localProtocolSelection);
} else if (!source.includes(localProtocolSelection)) {
  throw new Error("Could not preserve the local protocol in a packaged build");
}
const officialPackagedAppId = 't.isWindows&&(l.app.isPackaged&&l.app.setAppUserModelId("org.parakeetai.ParakeetAI"),l.app.commandLine.appendSwitch("disable-features","CalculateNativeWinOcclusion"))';
const localSafePackagedAppId = 't.isWindows&&(l.app.isPackaged&&!process.env.PARAKEET_LOCAL_ONLY&&l.app.setAppUserModelId("org.parakeetai.ParakeetAI"),l.app.commandLine.appendSwitch("disable-features","CalculateNativeWinOcclusion"))';
if (source.includes(officialPackagedAppId)) {
  source = source.replace(officialPackagedAppId, localSafePackagedAppId);
} else if (!source.includes(localSafePackagedAppId)) {
  throw new Error("Could not isolate the packaged local Windows app identity");
}
const incorrectlySkippedIpcInitialization = '(0,w.initMain)(),process.env.PARAKEET_LOCAL_ONLY?0:(0,f.default)(),(0,v.default)()';
const requiredIpcInitialization = '(0,w.initMain)(),(0,f.default)(),(0,v.default)()';
if (source.includes(incorrectlySkippedIpcInitialization)) {
  source = source.replace(incorrectlySkippedIpcInitialization, requiredIpcInitialization);
} else if (!source.includes(requiredIpcInitialization)) {
  throw new Error("Could not preserve the packaged IPC handler initialization");
}
const unconditionalUpdaterInitialization = '(0,p.default)(),(0,O.registerDisplayListeners)()';
const localSafeUpdaterInitialization = 'process.env.PARAKEET_LOCAL_ONLY?0:(0,p.default)(),(0,O.registerDisplayListeners)()';
const duplicatedLocalUpdaterInitialization = 'process.env.PARAKEET_LOCAL_ONLY?0:process.env.PARAKEET_LOCAL_ONLY?0:(0,p.default)(),(0,O.registerDisplayListeners)()';
if (source.includes(duplicatedLocalUpdaterInitialization)) {
  source = source.replace(duplicatedLocalUpdaterInitialization, localSafeUpdaterInitialization);
} else if (source.includes(localSafeUpdaterInitialization)) {
  // Already patched.
} else if (source.includes(unconditionalUpdaterInitialization)) {
  source = source.replace(unconditionalUpdaterInitialization, localSafeUpdaterInitialization);
} else {
  throw new Error("Could not disable official updates in the packaged local app");
}
const packagedLoginStartup = 'l.app.isPackaged&&l.app.setLoginItemSettings({openAtLogin:!0,args:t.isWindows?["--was-opened-at-login"]:void 0})';
const localSafePackagedLoginStartup = 'l.app.isPackaged&&!process.env.PARAKEET_LOCAL_ONLY&&l.app.setLoginItemSettings({openAtLogin:!0,args:t.isWindows?["--was-opened-at-login"]:void 0})';
if (source.includes(packagedLoginStartup)) {
  source = source.replace(packagedLoginStartup, localSafePackagedLoginStartup);
} else if (!source.includes(localSafePackagedLoginStartup)) {
  throw new Error("Could not disable automatic login startup in the packaged local app");
}
const cloudDefaultMainApi = 't.getDefaultApiConfig=function(){const e="production";return{environment:e,url:t.yl[e],bypassToken:""}}';
const localDefaultMainApi = 't.getDefaultApiConfig=function(){const e="localhost";return{environment:e,url:t.yl[e],bypassToken:""}}';
if (source.includes(cloudDefaultMainApi)) {
  source = source.replace(cloudDefaultMainApi, localDefaultMainApi);
} else if (!source.includes(localDefaultMainApi)) {
  throw new Error("Could not force the packaged main process API to localhost");
}

fs.writeFileSync(mainPath, source);
console.log(`Patched ${mainPath}`);

const rendererPath = path.resolve(__dirname, "../app/dist/renderer/renderer.js");
let rendererSource = fs.readFileSync(rendererPath, "utf8");
const upstreamTranscriptionUrl = "wss://eu2.rt.speechmatics.com/v2";
const localTranscriptionUrl = "ws://localhost:3000/v2";
if (rendererSource.includes(upstreamTranscriptionUrl)) {
  rendererSource = rendererSource.replace(upstreamTranscriptionUrl, localTranscriptionUrl);
} else if (!rendererSource.includes(localTranscriptionUrl)) {
  throw new Error("Could not redirect the transcription WebSocket to localhost");
}
const cloudDefaultRendererApi = 't.getDefaultApiConfig=function(){const e="production";return{environment:e,url:t.API_URLS[e],bypassToken:""}}';
const localDefaultRendererApi = 't.getDefaultApiConfig=function(){const e="localhost";return{environment:e,url:t.API_URLS[e],bypassToken:""}}';
if (rendererSource.includes(cloudDefaultRendererApi)) {
  rendererSource = rendererSource.replace(cloudDefaultRendererApi, localDefaultRendererApi);
} else if (!rendererSource.includes(localDefaultRendererApi)) {
  throw new Error("Could not force the packaged renderer API to localhost");
}
const localFormRequirements = '}).superRefine((e,t)=>{"interview"===e.sessionMode&&(0===e.title.length&&t.addIssue({code:"custom",message:"Company is required for interview mode.",path:["title"]}),0===e.description.length&&t.addIssue({code:"custom",message:"Job description is required for interview mode.",path:["description"]}))})';
const relaxedLocalFormRequirements = '}).superRefine(()=>{})';
if (rendererSource.includes(localFormRequirements)) {
  rendererSource = rendererSource.replace(localFormRequirements, relaxedLocalFormRequirements);
} else if (!rendererSource.includes(relaxedLocalFormRequirements)) {
  throw new Error("Could not relax the local session form requirements");
}
const cloudFormFooterRequirements = 'ye=_e?!me&&!ge&&!be:!be,Se=_e&&(me||ge)?me&&ge?"Please enter a company name and job description to continue.":me?"Please enter a company name to continue.":"Please enter a job description to continue.":void 0';
const localFormFooterRequirements = 'ye=!be,Se=void 0';
if (rendererSource.includes(cloudFormFooterRequirements)) {
  rendererSource = rendererSource.replace(cloudFormFooterRequirements, localFormFooterRequirements);
} else if (!rendererSource.includes(localFormFooterRequirements)) {
  throw new Error("Could not enable the local session form footer");
}
const modalExtraContext = 'He=(0,r.jsx)(S.ContextPillButton,{filled:ze,onClick:ue,disabled:V,emptyLabel:"Add Extra Context",filledIcon:Ge,filledContent:qe})';
const inlineExtraContext = 'He=(0,r.jsx)(p.Textarea,{placeholder:"Extra Context or instructions for the AI...",value:q.extraContext,onChange:e=>n.setFieldValue("extraContext",e.target.value),className:"min-h-24 w-full",maxLength:m.EXTRA_CONTEXT_MAX_CHARS,disabled:V})';
if (rendererSource.includes(modalExtraContext)) {
  rendererSource = rendererSource.replace(modalExtraContext, inlineExtraContext);
} else if (!rendererSource.includes(inlineExtraContext)) {
  throw new Error("Could not expose the inline Extra Context editor");
}
const emptyDefaultExtraContext = 't.DEFAULT_EXTRA_CONTEXT=""';
const previousPreferredDefaultExtraContext = 't.DEFAULT_EXTRA_CONTEXT="For coding questions: first explain in simple words what the problem is asking. Then give a clear step-by-step approach and why it works. Next provide complete code with many useful comments so I can understand every important part. Walk through the example, cover time and space complexity plus edge cases, and end with a short explanation I can say aloud to the interviewer."';
const preferredDefaultExtraContext = 't.DEFAULT_EXTRA_CONTEXT="For non-coding questions: answer like a real person speaking in an interview. Start directly, use simple conversational English and short sentences, and keep necessary technical terms while explaining them plainly. Use one or two compact paragraphs with no headings, bullet lists, bold labels, repeated conclusion, or phrase like the short answer is. For coding questions: first explain in simple words what the problem is asking. Then give a clear step-by-step approach and why it works. Next provide complete code with many useful comments so I can understand every important part. Walk through the example, cover time and space complexity plus edge cases, and end with a short explanation I can say aloud to the interviewer."';
if (rendererSource.includes(emptyDefaultExtraContext)) {
  rendererSource = rendererSource.replace(emptyDefaultExtraContext, preferredDefaultExtraContext);
} else if (rendererSource.includes(previousPreferredDefaultExtraContext)) {
  rendererSource = rendererSource.replace(previousPreferredDefaultExtraContext, preferredDefaultExtraContext);
} else if (!rendererSource.includes(preferredDefaultExtraContext)) {
  throw new Error("Could not set the preferred local coding context");
}
const fourMegabyteScreenshotDraft = 'if(y.reduce((e,t)=>e+h.encode(t).length,0)+h.encode(e).length>4194304)return void s.toast.error("Screenshots are too large (limit 4 MB).");';
const twelveMegabyteScreenshotDraft = 'if(y.reduce((e,t)=>e+h.encode(t).length,0)+h.encode(e).length>12582912)return void s.toast.error("Screenshots are too large (limit 12 MB).");';
if (rendererSource.includes(fourMegabyteScreenshotDraft)) {
  rendererSource = rendererSource.replace(fourMegabyteScreenshotDraft, twelveMegabyteScreenshotDraft);
} else if (!rendererSource.includes(twelveMegabyteScreenshotDraft)) {
  throw new Error("Could not raise the multi-screenshot draft size limit");
}
const immediateScreenshotListener = '(0,a.useEffect)(()=>window.electron.ipcRendererProxy.on("main/add-screenshot-shortcut-pressed",()=>{C()}),[_,y.length,g])';
const queuedScreenshotListener = '(0,a.useEffect)(()=>{const e=()=>{C()},t=window.electron.ipcRendererProxy.on("main/add-screenshot-shortcut-pressed",e);return window.addEventListener("parakeet-local-queue-screenshot",e),()=>{t(),window.removeEventListener("parakeet-local-queue-screenshot",e)}},[_,y.length,g])';
const persistentQueuedScreenshotListener = '(0,a.useEffect)(()=>{const e=()=>{window.__parakeetPendingScreenshotCaptures>0&&(window.__parakeetPendingScreenshotCaptures-=1),C()},t=window.electron.ipcRendererProxy.on("main/add-screenshot-shortcut-pressed",e);return window.addEventListener("parakeet-local-queue-screenshot",e),window.__parakeetPendingScreenshotCaptures>0&&queueMicrotask(e),()=>{t(),window.removeEventListener("parakeet-local-queue-screenshot",e)}},[_,y.length,g])';
if (rendererSource.includes(immediateScreenshotListener)) {
  rendererSource = rendererSource.replace(immediateScreenshotListener, persistentQueuedScreenshotListener);
} else if (rendererSource.includes(queuedScreenshotListener)) {
  rendererSource = rendererSource.replace(queuedScreenshotListener, persistentQueuedScreenshotListener);
} else if (!rendererSource.includes(persistentQueuedScreenshotListener)) {
  throw new Error("Could not add the local screenshot draft listener");
}
const autoSendScreenshot = 'async function dt({triggeredUsingShortcut:e}){let t;try{t=await Ve()}catch{return void V.toast.error("Failed to capture screenshot.")}ut({kind:"analyze-screen",triggeredUsingShortcut:e,screenshots:[t]})}';
const delayedQueueScreenshot = 'async function dt({triggeredUsingShortcut:e}){xt(!0),setTimeout(()=>window.dispatchEvent(new Event("parakeet-local-queue-screenshot")),200)}';
const queueScreenshot = 'async function dt({triggeredUsingShortcut:e}){window.__parakeetPendingScreenshotCaptures=(window.__parakeetPendingScreenshotCaptures||0)+1,xt(!0),window.dispatchEvent(new Event("parakeet-local-queue-screenshot"))}';
if (rendererSource.includes(autoSendScreenshot)) {
  rendererSource = rendererSource.replace(autoSendScreenshot, queueScreenshot);
} else if (rendererSource.includes(delayedQueueScreenshot)) {
  rendererSource = rendererSource.replace(delayedQueueScreenshot, queueScreenshot);
} else if (!rendererSource.includes(queueScreenshot)) {
  throw new Error("Could not route the main screenshot action into the chat draft");
}
const screenshotButtonLabel = 'onClick:()=>dt({triggeredUsingShortcut:!1}),children:"Screenshot"';
const addScreenshotButtonLabel = 'onClick:()=>dt({triggeredUsingShortcut:!1}),children:"Add Screenshot"';
if (rendererSource.includes(screenshotButtonLabel)) {
  rendererSource = rendererSource.replace(screenshotButtonLabel, addScreenshotButtonLabel);
} else if (!rendererSource.includes(addScreenshotButtonLabel)) {
  throw new Error("Could not clarify the screenshot button label");
}
const answerOnlyShortcutEffect = '(0,h.useEffect)(()=>{const e=window.electron.ipcRendererProxy.on("main/hide-live-call-session-screen-shortcut-pressed",()=>{c(!a)}),n=window.electron.ipcRendererProxy.on("main/primary-ai-message-shortcut-pressed",()=>{t.activatedAt&&!t.isEndedOrExpired&&ut({kind:"ai-help",triggeredUsingShortcut:!0})}),r=window.electron.ipcRendererProxy.on("main/secondary-ai-message-shortcut-pressed",()=>{t.activatedAt&&!t.isEndedOrExpired&&dt({triggeredUsingShortcut:!0})}),i=window.electron.ipcRendererProxy.on("main/clear-transcript-shortcut-pressed",()=>{t.activatedAt&&!t.isEndedOrExpired&&Ye()}),o=window.electron.ipcRendererProxy.on("main/chat-shortcut-pressed",()=>{t.activatedAt&&!t.isEndedOrExpired&&wt()});return()=>{e(),n(),r(),i(),o()}},[t.activatedAt,t.isEndedOrExpired,ut,wt])';
const answerAndRegenerateShortcutEffect = '(0,h.useEffect)(()=>{const e=window.electron.ipcRendererProxy.on("main/hide-live-call-session-screen-shortcut-pressed",()=>{c(!a)}),n=window.electron.ipcRendererProxy.on("main/primary-ai-message-shortcut-pressed",()=>{t.activatedAt&&!t.isEndedOrExpired&&ut({kind:"ai-help",triggeredUsingShortcut:!0})}),r=window.electron.ipcRendererProxy.on("main/secondary-ai-message-shortcut-pressed",()=>{t.activatedAt&&!t.isEndedOrExpired&&dt({triggeredUsingShortcut:!0})}),i=window.electron.ipcRendererProxy.on("main/clear-transcript-shortcut-pressed",()=>{t.activatedAt&&!t.isEndedOrExpired&&Ye()}),o=window.electron.ipcRendererProxy.on("main/chat-shortcut-pressed",()=>{t.activatedAt&&!t.isEndedOrExpired&&wt()}),l=window.electron.ipcRendererProxy.on("main/regenerate-ai-message-shortcut-pressed",()=>{t.activatedAt&&!t.isEndedOrExpired&&ut({kind:"regenerate",triggeredUsingShortcut:!0})});return()=>{e(),n(),r(),i(),o(),l()}},[t.activatedAt,t.isEndedOrExpired,ut,wt])';
if (rendererSource.includes(answerOnlyShortcutEffect)) {
  rendererSource = rendererSource.replace(answerOnlyShortcutEffect, answerAndRegenerateShortcutEffect);
} else if (!rendererSource.includes(answerAndRegenerateShortcutEffect)) {
  throw new Error("Could not connect the regenerate keyboard shortcut");
}
const answerAndScreenshotButtons = '(0,l.jsx)(f.default,{disabled:"ai-help"===je,shortcut:(0,l.jsx)(B.Shortcut,{noPlus:!0,shortcuts:[B.ShortcutKey,u.CornerDownLeft]}),onClick:()=>ut({kind:"ai-help",triggeredUsingShortcut:!1}),children:"Answer"}),(0,l.jsx)(f.default,{disabled:"analyze-screen"===je,shortcut:';
const answerRegenerateAndScreenshotButtons = '(0,l.jsx)(f.default,{disabled:"ai-help"===je,shortcut:(0,l.jsx)(B.Shortcut,{noPlus:!0,shortcuts:[B.ShortcutKey,u.CornerDownLeft]}),onClick:()=>ut({kind:"ai-help",triggeredUsingShortcut:!1}),children:"Answer"}),(0,l.jsx)(f.default,{disabled:"regenerate"===je||0===Me.length,shortcut:(0,l.jsx)(B.Shortcut,{noPlus:!0,shortcuts:[B.ShortcutKey,"R"]}),onClick:()=>ut({kind:"regenerate",triggeredUsingShortcut:!1}),children:"Regenerate"}),(0,l.jsx)(f.default,{disabled:"analyze-screen"===je,shortcut:';
if (rendererSource.includes(answerAndScreenshotButtons)) {
  rendererSource = rendererSource.replace(answerAndScreenshotButtons, answerRegenerateAndScreenshotButtons);
} else if (!rendererSource.includes(answerRegenerateAndScreenshotButtons)) {
  throw new Error("Could not add the Regenerate button");
}
const immediateAutoAnswer = 'X.current=e=>{R?.autoAnswer&&!e&&se.generateAiResponse({kind:"auto-ai-help"})}';
if (!rendererSource.includes(immediateAutoAnswer)) {
  throw new Error("Could not preserve the original Auto Answer timing");
}
const compactTranscriptStart = '},46866(e,t,n){"use strict";var r=this&&this.__importDefault||function(e){return e&&e.__esModule?e:{default:e}};Object.defineProperty(t,"__esModule",{value:!0}),t.default=function(e){const t=(0,o.c)(26),{combinedTranscript:n,isMicrophoneTranscribing:r,isShareTranscribing:g,width:_,listeningIndicator:v,onUnMinimize:b,onClear:y}=e;';
const compactTranscriptWithAnswerStart = '},46866(e,t,n){"use strict";var r=this&&this.__importDefault||function(e){return e&&e.__esModule?e:{default:e}};Object.defineProperty(t,"__esModule",{value:!0}),t.default=function(e){const t=(0,o.c)(27),{combinedTranscript:n,isMicrophoneTranscribing:r,isShareTranscribing:g,width:_,listeningIndicator:v,onUnMinimize:b,onClear:y,onAnswer:Se}=e;';
if (rendererSource.includes(compactTranscriptStart)) {
  rendererSource = rendererSource.replace(compactTranscriptStart, compactTranscriptWithAnswerStart);
} else if (!rendererSource.includes(compactTranscriptWithAnswerStart)) {
  throw new Error("Could not expose a manual Answer action in the compact transcript");
}
const compactTranscriptControls = 't[18]!==N||t[19]!==w?(A=(0,i.jsxs)("div",{"data-transparent":"true",className:"flex h-full flex-row items-center gap-1",children:[C,w,N]}),t[18]=N,t[19]=w,t[20]=A):A=t[20],t[21]!==S||t[22]!==A||t[23]!==E||t[24]!==T?(k=(0,i.jsxs)(f.default,{className:"flex flex-row items-center justify-between gap-1 transition-[width] duration-200 ease-out motion-reduce:transition-none",style:S,children:[E,T,A]}),t[21]=S,t[22]=A,t[23]=E,t[24]=T,t[25]=k):k=t[25]';
const compactTranscriptControlsWithAnswer = 't[18]!==N||t[19]!==w||t[20]!==Se?(A=(0,i.jsxs)("div",{"data-transparent":"true",className:"flex h-full flex-row items-center gap-1",children:[C,(0,i.jsx)(u.default,{transparent:!0,onClick:Se,className:"font-normal",children:"Answer"}),w,N]}),t[18]=N,t[19]=w,t[20]=Se,t[21]=A):A=t[21],t[22]!==S||t[23]!==A||t[24]!==E||t[25]!==T?(k=(0,i.jsxs)(f.default,{className:"flex flex-row items-center justify-between gap-1 transition-[width] duration-200 ease-out motion-reduce:transition-none",style:S,children:[E,T,A]}),t[22]=S,t[23]=A,t[24]=E,t[25]=T,t[26]=k):k=t[26]';
if (rendererSource.includes(compactTranscriptControls)) {
  rendererSource = rendererSource.replace(compactTranscriptControls, compactTranscriptControlsWithAnswer);
} else if (!rendererSource.includes(compactTranscriptControlsWithAnswer)) {
  throw new Error("Could not add the compact transcript Answer button");
}
const compactTranscriptUsage = 'Z&&k&&(0,l.jsx)(L.default,{combinedTranscript:He,isMicrophoneTranscribing:we,isShareTranscribing:be,width:At??void 0,listeningIndicator:Lt,onUnMinimize:()=>ee(!1),onClear:Ye})';
const compactTranscriptUsageWithAnswer = 'Z&&k&&(0,l.jsx)(L.default,{combinedTranscript:He,isMicrophoneTranscribing:we,isShareTranscribing:be,width:At??void 0,listeningIndicator:Lt,onUnMinimize:()=>ee(!1),onClear:Ye,onAnswer:()=>ut({kind:"ai-help",triggeredUsingShortcut:!1})})';
if (rendererSource.includes(compactTranscriptUsage)) {
  rendererSource = rendererSource.replace(compactTranscriptUsage, compactTranscriptUsageWithAnswer);
} else if (!rendererSource.includes(compactTranscriptUsageWithAnswer)) {
  throw new Error("Could not connect the compact transcript Answer button");
}

fs.writeFileSync(rendererPath, rendererSource);
console.log(`Patched ${rendererPath}`);
