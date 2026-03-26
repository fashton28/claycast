/**
 * Integration Registry — singleton that holds all registered integrations.
 *
 * Responsibilities:
 *  - Registration and discovery
 *  - @ command routing
 *  - Connection status tracking
 *  - System prompt fragment aggregation
 */

import { EventEmitter } from 'events'
import { log as _log } from '../logger'
import type {
  Integration,
  IntegrationCommand,
  IntegrationInfo,
  IntegrationStatusEvent,
  CommandResult,
} from './types'

function log(msg: string): void {
  _log('IntegrationRegistry', msg)
}

export class IntegrationRegistry extends EventEmitter {
  private integrations = new Map<string, Integration>()
  /** Maps trigger → integration id for fast @ command dispatch */
  private triggerMap = new Map<string, string>()

  /**
   * Register an integration. Called on app startup.
   */
  register(integration: Integration): void {
    if (this.integrations.has(integration.id)) {
      log(`Integration already registered: ${integration.id}`)
      return
    }

    this.integrations.set(integration.id, integration)

    for (const cmd of integration.commands) {
      if (this.triggerMap.has(cmd.trigger)) {
        log(`Warning: trigger @${cmd.trigger} already registered by ${this.triggerMap.get(cmd.trigger)}, overwriting with ${integration.id}`)
      }
      this.triggerMap.set(cmd.trigger, integration.id)
    }

    log(`Registered integration: ${integration.id} (${integration.commands.length} commands)`)
  }

  /**
   * Get all registered @ commands (for the autocomplete menu).
   */
  getCommands(): IntegrationCommand[] {
    const commands: IntegrationCommand[] = []
    for (const integration of this.integrations.values()) {
      commands.push(...integration.commands)
    }
    return commands
  }

  /**
   * Get info about all registered integrations.
   */
  listIntegrations(): IntegrationInfo[] {
    return Array.from(this.integrations.values()).map((i) => ({
      id: i.id,
      name: i.name,
      description: i.description,
      connected: i.isConnected(),
      commands: i.commands,
    }))
  }

  /**
   * Get IDs of connected integrations.
   */
  getConnectedIds(): string[] {
    return Array.from(this.integrations.values())
      .filter((i) => i.isConnected())
      .map((i) => i.id)
  }

  /**
   * Get aggregated system prompt fragments from all connected integrations.
   */
  getSystemPromptHints(): string {
    const fragments: string[] = []
    for (const integration of this.integrations.values()) {
      if (integration.isConnected()) {
        fragments.push(integration.getSystemPromptFragment())
      }
    }
    return fragments.join('\n\n')
  }

  /**
   * Connect an integration (initiates OAuth flow).
   */
  async connect(integrationId: string): Promise<{ ok: boolean; error?: string }> {
    const integration = this.integrations.get(integrationId)
    if (!integration) {
      return { ok: false, error: `Unknown integration: ${integrationId}` }
    }

    try {
      await integration.connect()
      log(`Connected: ${integrationId}`)

      const event: IntegrationStatusEvent = {
        integrationId,
        connected: true,
      }
      this.emit('status', event)

      return { ok: true }
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err)
      log(`Connect failed for ${integrationId}: ${msg}`)

      const event: IntegrationStatusEvent = {
        integrationId,
        connected: false,
        error: msg,
      }
      this.emit('status', event)

      return { ok: false, error: msg }
    }
  }

  /**
   * Disconnect an integration (revokes tokens).
   */
  async disconnect(integrationId: string): Promise<{ ok: boolean; error?: string }> {
    const integration = this.integrations.get(integrationId)
    if (!integration) {
      return { ok: false, error: `Unknown integration: ${integrationId}` }
    }

    try {
      await integration.disconnect()
      log(`Disconnected: ${integrationId}`)

      const event: IntegrationStatusEvent = {
        integrationId,
        connected: false,
      }
      this.emit('status', event)

      return { ok: true }
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err)
      log(`Disconnect failed for ${integrationId}: ${msg}`)
      return { ok: false, error: msg }
    }
  }

  /**
   * Execute an @ command by trigger word.
   */
  async executeCommand(trigger: string, rawInput: string): Promise<CommandResult> {
    const integrationId = this.triggerMap.get(trigger)
    if (!integrationId) {
      return {
        success: false,
        message: `Unknown command: @${trigger}`,
      }
    }

    const integration = this.integrations.get(integrationId)
    if (!integration) {
      return {
        success: false,
        message: `Integration not found: ${integrationId}`,
      }
    }

    if (!integration.isConnected()) {
      return {
        success: false,
        message: `**${integration.name}** is not connected. Use \`@connect ${integrationId}\` or connect from settings to get started.`,
        data: { needsConnection: true, integrationId },
      }
    }

    log(`Executing @${trigger}: "${rawInput.substring(0, 100)}"`)

    try {
      const result = await integration.executeCommand(trigger, rawInput)
      log(`@${trigger} result: success=${result.success}`)
      return result
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err)
      log(`@${trigger} error: ${msg}`)
      return {
        success: false,
        message: `Failed to execute @${trigger}: ${msg}`,
      }
    }
  }

  /**
   * Get a specific integration by ID.
   */
  get(integrationId: string): Integration | undefined {
    return this.integrations.get(integrationId)
  }
}
