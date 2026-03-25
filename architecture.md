# Claycast Architecture Guide

Claycast (Clui CC) is a macOS desktop overlay that wraps the Claude Code CLI in a transparent, always-accessible GUI. Think Raycast meets Claude Code — press a hotkey, get a floating panel with multi-tab Claude sessions, permission approval cards, voice input, conversation history, and a skills marketplace.

---

## Tech Stack

| Layer | Technology | Purpose |
|-------|-----------|---------|
| Desktop runtime | Electron v35 | Native macOS window, tray icon, global hotkeys |
| Build tooling | Electron Vite + Vite v6 | HMR dev server, production bundling |
| Packaging | Electron Builder v26 | `.app` bundle generation |
| Language | TypeScript v5.7 | Type safety across main + renderer |
| UI framework | React v19 | Component-based renderer |
| State management | Zustand v5 | Single store, no boilerplate |
| Styling | Tailwind CSS v4 | Utility-first, Vite plugin integration |
| Animations | Framer Motion v12 | Expand/collapse, mount/unmount transitions |
| Markdown | React Markdown + Remark GFM | Renders Claude's markdown output |
| Icons | Phosphor Icons v2 | Consistent icon set |
| Terminal | Node PTY v1.1 | Legacy interactive mode support |
| CLI integration | Node.js `child_process` | Spawns `claude` CLI as subprocess |
| Voice input | WhisperKit CLI / whisper-cpp | Local on-device transcription |

---

## Directory Structure

```
src/
├── main/                   # Electron main process (Node.js)
├── renderer/               # React frontend (BrowserWindow)
├── preload/                # Context bridge (secure IPC)
└── shared/                 # Types shared between main + renderer
```

### `src/main/` — Main Process

| File | What it does |
|------|-------------|
| `index.ts` | Creates the transparent overlay window, registers `Option+Space` hotkey, sets up all IPC handlers, manages tray icon |
| `logger.ts` | Writes buffered debug logs to `~/.clui-debug.log` |
| `cli-env.ts` | Builds the PATH needed to locate the `claude` binary |
| `stream-parser.ts` | Parses newline-delimited JSON from Claude's stdout |
| `process-manager.ts` | Legacy subprocess manager (superseded by RunManager) |

#### `src/main/claude/` — Claude CLI Orchestration

| File | What it does |
|------|-------------|
| `control-plane.ts` | Central authority for tab lifecycle, request queuing, permission routing. Maps Claude sessions to UI tabs |
| `run-manager.ts` | Spawns `claude -p` with stream-json I/O, parses output, emits normalized events |
| `pty-run-manager.ts` | PTY-based transport for interactive permissions (legacy) |
| `event-normalizer.ts` | Stateless mapper that converts raw Claude stream events into canonical CLUI event types |

#### `src/main/hooks/` — Permission Management

| File | What it does |
|------|-------------|
| `permission-server.ts` | Local HTTP server on port 19836. Intercepts Claude's `PreToolUse` hooks, shows permission cards in the UI, returns allow/deny decisions |

#### `src/main/marketplace/` — Plugin Catalog

| File | What it does |
|------|-------------|
| `catalog.ts` | Fetches skill catalogs from GitHub repos, validates plugin metadata, handles install/uninstall via tarball download + atomic rename |

#### `src/main/skills/` — Skill Provisioning

| File | What it does |
|------|-------------|
| `installer.ts` | Auto-installs bundled skills on startup from a hardcoded manifest. Uses atomic temp-dir-then-rename pattern |
| `manifest.ts` | Declares which skills to auto-install (name, repo, path) |

---

### `src/renderer/` — React Frontend

| File | What it does |
|------|-------------|
| `main.tsx` | React root mount point |
| `App.tsx` | Top-level layout, theme provider, click-through mouse tracking, expand/collapse animation |
| `index.html` | HTML shell loaded by Electron |
| `index.css` | Base Tailwind imports and global styles |
| `theme.ts` | Dark/light design tokens (oklch palette), theme mode store |
| `env.d.ts` | TypeScript declarations for `window.clui` API |

#### `src/renderer/components/`

| File | What it does |
|------|-------------|
| `TabStrip.tsx` | Tab bar — create, close, switch between sessions |
| `ConversationView.tsx` | Renders messages, tool call blocks, permission cards, streaming text |
| `InputBar.tsx` | Text input, mic button, send, slash command trigger, file attachments |
| `StatusBar.tsx` | Shows model name, token count, cost, duration |
| `PermissionCard.tsx` | Tool approval UI — allow once, allow for session, allow for domain, or deny |
| `PermissionDeniedCard.tsx` | Displays fallback when a tool call was denied |
| `HistoryPicker.tsx` | Browse and resume past conversation sessions |
| `MarketplacePanel.tsx` | Skill/plugin browser with search, install, uninstall |
| `AttachmentChips.tsx` | Preview chips for attached files/images |
| `SettingsPopover.tsx` | Theme toggle, sound toggle, permission mode, model override |
| `SlashCommandMenu.tsx` | Command palette for `/` commands |
| `PopoverLayer.tsx` | Shared context layer for settings and history popovers |

#### `src/renderer/stores/`

| File | What it does |
|------|-------------|
| `sessionStore.ts` | Zustand store — single source of truth for tabs, messages, marketplace state, settings, attachments. All UI state flows through here |

#### `src/renderer/hooks/`

| File | What it does |
|------|-------------|
| `useClaudeEvents.ts` | Subscribes to IPC events from main process, batches text chunks via `requestAnimationFrame` to limit React re-renders |
| `useHealthReconciliation.ts` | Polls backend health status, reconciles tab states if main process and renderer drift |

---

### `src/preload/`

| File | What it does |
|------|-------------|
| `index.ts` | Context bridge — exposes `window.clui` API to the renderer. All IPC calls go through this secure layer |

### `src/shared/`

| File | What it does |
|------|-------------|
| `types.ts` | Shared TypeScript types: event types, tab states, run options, IPC channel names |

---

## Core Architecture

### Data Flow

```
User types prompt → InputBar → sessionStore.sendMessage()
    → IPC clui:prompt → ControlPlane.submitPrompt(tabId, requestId)
        → RunManager.startRun() → spawns `claude -p --stream-json`
            → stdout NDJSON → StreamParser → EventNormalizer
                → NormalizedEvent → ControlPlane emits 'event'
                    → IPC clui:normalized-event → useClaudeEvents hook
                        → RAF-batched text chunks → sessionStore → React renders
```

### Permission Flow

```
Claude tries to use a tool (Bash, Edit, Write, etc.)
    → Claude POSTs to localhost:19836/[app-secret]/[run-token]/permission
        → PermissionServer validates, masks sensitive fields
            → IPC → PermissionCard shown in UI
                → User clicks Allow/Deny
                    → HTTP response back to Claude → tool executes or is blocked
```

### Tab State Machine

```
new tab → idle → connecting → running → completed
                                  ↓
                               failed / dead
```

Each tab maps to one Claude session. The ControlPlane queues up to 32 requests per tab and dispatches them sequentially.

---

## Key Techniques

### RAF-Batched Text Streaming
Text chunks arrive fast during streaming (~100/sec). Instead of one React render per chunk, `useClaudeEvents` buffers text and flushes via `requestAnimationFrame`, capping renders at ~60/sec.

### Click-Through Overlay
The window is transparent. Mouse events over non-UI regions pass through to whatever app is underneath. `App.tsx` tracks mouse position and calls `setIgnoreMouseEvents` to toggle click-through on transparent areas.

### Warmup Init
When a tab is created, a silent `claude -p` session is spawned to pre-initialize. This warmup is invisible to the user but makes the first real prompt faster.

### Atomic Skill Install
Skills install via: download tarball → extract to temp dir → validate → atomic `renameSync` to final path. Prevents partial/corrupt installs.

### Per-Run Permission Tokens
Each Claude subprocess gets a unique UUID token. Permission HTTP requests include this token in the URL path, so the server routes approval to the correct tab even with multiple concurrent sessions.

### Deny-by-Default Permissions
Any validation failure, timeout (5 min), or error in the permission flow results in a deny. Safe tools (Read, Glob, Grep) are auto-approved. Dangerous tools (Bash with mutations, Write, Edit) require explicit user approval.

### Bash Safety Heuristic
The permission server parses bash commands to distinguish read-only (`ls`, `cat`, `grep`, `git status`) from mutating (`git push`, `rm`, `npm install`). Read-only commands get auto-approved; mutating ones show a permission card.

---

## Security Model

- **Context isolation**: Renderer cannot access Node.js APIs directly. All access goes through the preload context bridge.
- **Input validation**: Paths, plugin names, and permission decisions are validated with strict regex and allowlists.
- **Sensitive field masking**: Tool input fields like `token`, `password`, `apiKey` are redacted before reaching the renderer.
- **Per-launch app secret**: The permission server URL includes a random secret generated each launch, preventing external spoofing.
- **No telemetry**: All processing is local. Only outbound calls are GitHub API (marketplace catalog, cached 5 min) and Claude Code CLI auth.

---

## Config & Build

```bash
npm run dev      # Dev mode with hot reload
npm run dist     # Production build → release/Clui CC.app
npm run doctor   # Environment diagnostics
```

### Voice Transcription
Two local backends:
- **Apple Silicon preferred**: `whisperkit-cli` (via Homebrew)
- **Fallback**: `whisper-cpp` (via Homebrew)

No cloud API calls for voice — everything runs on-device.

### Marketplace Sources
Skills are fetched from three GitHub repos:
- `anthropics/skills` — Agent Skills
- `anthropics/knowledge-work-plugins` — Knowledge Work
- `anthropics/financial-services-plugins` — Financial Services
