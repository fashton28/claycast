# Claycast: Integrations Plan

Reference document for the integration framework — Phases 1 through 3.

---

## Context

Claycast is evolving from a Claude Code GUI wrapper into a **modular, customizable personal assistant** with access to external services. Integrations are invoked via `@` commands typed directly in the chat input — keyboard-first, no mode switching.

---

## Phase 1: Framework + `@` Command System (Complete)

**Goal:** `@` autocomplete works in InputBar, registry accepts integrations, mock responses for testing.

### What was built

| File | Description |
|------|-------------|
| `src/main/integrations/types.ts` | Integration, IntegrationCommand, CommandResult, OAuthConfig interfaces |
| `src/main/integrations/registry.ts` | Registry singleton — register, discover, execute, connect/disconnect |
| `src/main/integrations/google/index.ts` | Mock GoogleIntegration with `@schedule`, `@meeting`, `@calendar` |
| `src/renderer/components/AtCommandMenu.tsx` | `@` autocomplete menu (mirrors SlashCommandMenu pattern) |
| `src/shared/types.ts` | Added IntegrationInfo, IntegrationCommandInfo, CommandResult, IntegrationStatusEvent, 6 IPC channels |
| `src/preload/index.ts` | Added 6 integration methods to CluiAPI |
| `src/main/index.ts` | Registry instantiation, Google registration, 5 IPC handlers |
| `src/renderer/components/InputBar.tsx` | `@` detection, AtCommandMenu rendering, keyboard nav, command dispatch |
| `src/renderer/stores/sessionStore.ts` | connectedIntegrations state, refreshIntegrations action |

### Architecture

```
User types "@schedule lunch tomorrow"
  → InputBar detects @trigger
  → IPC INTEGRATION_EXECUTE { trigger: 'schedule', rawInput: 'lunch tomorrow' }
  → IntegrationRegistry.executeCommand()
  → GoogleIntegration.executeCommand('schedule', 'lunch tomorrow')
  → CommandResult { success, message (markdown) }
  → Rendered as system message in chat
```

### IPC Channels

```typescript
INTEGRATIONS_LIST: 'clui:integrations-list'
INTEGRATION_CONNECT: 'clui:integration-connect'
INTEGRATION_DISCONNECT: 'clui:integration-disconnect'
INTEGRATION_EXECUTE: 'clui:integration-execute'
INTEGRATION_STATUS: 'clui:integration-status'       // main → renderer
INTEGRATION_COMMANDS: 'clui:integration-commands'
```

### Preload API

```typescript
listIntegrations(): Promise<IntegrationInfo[]>
connectIntegration(id: string): Promise<{ ok: boolean; error?: string }>
disconnectIntegration(id: string): Promise<{ ok: boolean; error?: string }>
executeAtCommand(trigger: string, rawInput: string): Promise<CommandResult>
getAtCommands(): Promise<IntegrationCommandInfo[]>
onIntegrationStatus(callback: (status: IntegrationStatusEvent) => void): () => void
```

---

## Phase 2: OAuth + Token Storage

**Goal:** User can authenticate with Google from the chat. Real credential flow replaces mock `_connected = true`.

### Files to create

| File | Description |
|------|-------------|
| `src/main/integrations/oauth.ts` | Generic OAuth2 flow — localhost callback server, token exchange |
| `src/main/integrations/token-store.ts` | Encrypted token persistence via Electron `safeStorage` |

### OAuth2 Flow

1. User types `@calendar` when not connected → system message: "Google not connected. Connect now?"
2. Main process starts temporary HTTP server on `localhost:17832`
3. Opens system browser via `shell.openExternal(authUrl)` with redirect to localhost
4. Browser completes Google sign-in → redirects to `http://localhost:17832/callback?code=...`
5. Local server captures auth code, exchanges for tokens via `net.request` to Google's token endpoint
6. Tokens encrypted with `safeStorage.encryptString()`, persisted to `~/.clui/integrations/google/tokens.enc`
7. Server shuts down, integration marked as connected, status event broadcast to renderer

### Token Refresh

Before each API call:
- Check `expires_at` on stored tokens
- If within 5 minutes of expiry, use `refresh_token` to get new `access_token`
- Update persisted tokens

### Environment Variables

```
CLUI_GOOGLE_CLIENT_ID=<from Google Cloud Console>
CLUI_GOOGLE_CLIENT_SECRET=<from Google Cloud Console>
```

### Google Cloud Setup (for the developer)

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project (or use existing)
3. Enable **Google Calendar API**
4. Go to **APIs & Services > Credentials > Create Credentials > OAuth client ID**
5. Application type: **Desktop app**
6. Authorized redirect URIs: `http://localhost:17832/callback`
7. Copy Client ID and Client Secret to env vars

### Key Design Decisions

- **`safeStorage`** over keytar — ships with Electron, uses macOS Keychain, zero deps
- **Localhost callback** over custom protocol — simpler, works with any browser, no app registration needed
- **Temporary server** — starts on connect, shuts down after callback captured (not always-on)

---

## Phase 3: Google Calendar + Meet

**Goal:** `@schedule`, `@meeting`, `@calendar` work end-to-end with real Google APIs.

### Files to create

| File | Description |
|------|-------------|
| `src/main/integrations/google/calendar.ts` | Google Calendar v3 REST API calls |
| `src/main/integrations/google/meet.ts` | Google Meet helpers (conferenceData on calendar events) |

### Files to modify

| File | Change |
|------|--------|
| `src/main/integrations/google/index.ts` | Replace mock methods with real API calls + NLP parsing |
| `src/main/claude/run-manager.ts` | Append integration context to system prompt when connected |

### Google Calendar v3 API (`calendar.ts`)

All calls use Electron's `net.request` (no npm deps). Pattern follows `src/main/marketplace/catalog.ts`.

```typescript
// List events
GET https://www.googleapis.com/calendar/v3/calendars/primary/events
  ?timeMin={ISO}&timeMax={ISO}&maxResults={n}&singleEvents=true&orderBy=startTime

// Create event
POST https://www.googleapis.com/calendar/v3/calendars/primary/events
  Body: { summary, start: { dateTime }, end: { dateTime }, description?, attendees?, location? }

// Create event with Meet
POST https://www.googleapis.com/calendar/v3/calendars/primary/events?conferenceDataVersion=1
  Body: { ...event, conferenceData: { createRequest: { requestId, conferenceSolutionKey: { type: 'hangoutsMeet' } } } }

// Free/busy query
POST https://www.googleapis.com/calendar/v3/freeBusy
  Body: { timeMin, timeMax, items: [{ id: 'primary' }] }
```

### Natural Language Parsing

Instead of building a date/time parser, use Claude via a focused one-shot prompt:

```
Extract structured event data from this natural language input.
Return JSON only: { "summary": string, "startTime": ISO8601, "endTime": ISO8601, "attendees": string[], "location": string | null }

Current time: 2024-03-25T14:30:00-07:00
Input: "lunch with Amy tomorrow at noon"
```

This runs as a separate Claude invocation (not the main conversation) to keep it fast and deterministic.

### Google Meet (`meet.ts`)

Meet links are created by adding `conferenceData` to a Calendar event — no separate API needed:

```typescript
{
  conferenceData: {
    createRequest: {
      requestId: crypto.randomUUID(),
      conferenceSolutionKey: { type: 'hangoutsMeet' }
    }
  }
}
```

The response includes `conferenceData.entryPoints[].uri` with the Meet link.

### System Prompt Integration

When Google is connected, append to `CLUI_SYSTEM_HINT` in `run-manager.ts`:

```
The user has Google Calendar connected. When they ask about their schedule,
meetings, or availability, you can reference this. The user can use @schedule,
@meeting, and @calendar commands directly — you don't need to execute these,
but you can suggest them when relevant.
```

### Result Rendering

`CommandResult.message` is markdown — rendered as a system message in ConversationView:

**@schedule** response:
```markdown
**Event Created**
> Team standup

| | |
|---|---|
| **When** | Mon Mar 25, 10:00 AM – 10:30 AM |
| **Calendar** | Primary |
```

**@meeting** response:
```markdown
**Meeting Created**
> Quick sync

| | |
|---|---|
| **Meet Link** | [meet.google.com/abc-defg-hij](https://meet.google.com/abc-defg-hij) |
| **When** | Mon Mar 25, 2:45 PM – 3:15 PM |
```

**@calendar** response:
```markdown
**Calendar — Today**

| Time | Event |
|------|-------|
| 9:00 AM | Team standup |
| 11:30 AM | Design review with Sarah |
| 2:00 PM | 1:1 with manager |
| 4:00 PM | Sprint planning |
```

---

## Phase 4: Polish + Extensibility (Future)

1. **Error handling** — expired tokens, network failures, quota limits → friendly chat messages
2. **Rich rendering** — event cards with action buttons (edit, delete, join meeting)
3. **Settings** — default calendar, meeting duration, timezone preferences
4. **Developer docs** — "Adding a new integration" guide (3-file pattern: types → directory → register)
5. **`/integrations` command** — manage connections (connect/disconnect/status) from slash commands
6. **More integrations** — Slack, GitHub Issues, Notion, Linear, etc. using the same framework

---

## Key Design Decisions

| Decision | Rationale |
|----------|-----------|
| `@` commands in chat | Raycast philosophy — keyboard-first, the chat IS the interface |
| Google first, env vars | Single OAuth covers Calendar + Meet. Credentials stay out of codebase |
| Claude for NLP parsing | No custom date parser needed. Send raw input → get structured JSON |
| `net.request` for APIs | Zero npm deps. Calendar v3 REST is simple. Follows `catalog.ts` pattern |
| `safeStorage` for tokens | macOS Keychain under the hood, zero deps, encrypted at rest |
| Registry + command map | Each integration declares `@` triggers. Menu is fully dynamic |
| Mock-first development | Phase 1 ships with mock responses so UI can be tested before APIs are wired |
