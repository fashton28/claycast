/**
 * Integration framework types.
 *
 * Each integration (Google, Zoom, etc.) implements the Integration interface
 * and registers its @ commands with the registry.
 */

export interface OAuthConfig {
  authUrl: string
  tokenUrl: string
  clientId: string
  clientSecret: string
  scopes: string[]
  /** Localhost port for OAuth redirect callback */
  redirectPort: number
}

export interface OAuthTokens {
  access_token: string
  refresh_token: string
  expires_at: number
  token_type: string
  scope?: string
}

export interface IntegrationCommand {
  /** The trigger word after @ (e.g. 'schedule', 'meeting', 'calendar') */
  trigger: string
  /** Short description shown in the @ autocomplete menu */
  description: string
  /** Parent integration id */
  integration: string
  /** Example usages shown as hints */
  examples: string[]
}

export interface CommandResult {
  success: boolean
  /** Markdown message to show in chat as a system message */
  message: string
  /** Structured data for future use (e.g. event object, meeting link) */
  data?: unknown
}

export interface IntegrationInfo {
  id: string
  name: string
  description: string
  connected: boolean
  commands: IntegrationCommand[]
}

export interface IntegrationStatusEvent {
  integrationId: string
  connected: boolean
  error?: string
}

/**
 * Base interface for all integrations.
 * Each integration module exports a class implementing this.
 */
export interface Integration {
  id: string
  name: string
  description: string
  oauthConfig: OAuthConfig
  commands: IntegrationCommand[]

  isConnected(): boolean
  connect(): Promise<void>
  disconnect(): Promise<void>

  /**
   * Execute an @ command.
   * @param command - The trigger word (e.g. 'schedule')
   * @param rawInput - Everything after the trigger (e.g. 'lunch with Amy tomorrow at noon')
   */
  executeCommand(command: string, rawInput: string): Promise<CommandResult>

  /**
   * Returns a string appended to Claude's system prompt when this integration is connected.
   * Tells Claude what capabilities are available.
   */
  getSystemPromptFragment(): string
}
