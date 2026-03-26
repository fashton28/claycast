/**
 * Google Integration — Mock implementation for UI testing.
 *
 * Registers @schedule, @meeting, and @calendar commands with
 * placeholder responses. Will be replaced with real Google Calendar
 * API calls in Phase 3.
 */

import type { Integration, IntegrationCommand, OAuthConfig, CommandResult } from '../types'

const COMMANDS: IntegrationCommand[] = [
  {
    trigger: 'schedule',
    description: 'Create a calendar event',
    integration: 'google',
    examples: ['@schedule lunch with Amy tomorrow at noon', '@schedule team standup Monday 10am'],
  },
  {
    trigger: 'meeting',
    description: 'Create a Google Meet meeting',
    integration: 'google',
    examples: ['@meeting quick sync in 15 minutes', '@meeting project review Friday 2pm'],
  },
  {
    trigger: 'calendar',
    description: 'Show upcoming events',
    integration: 'google',
    examples: ['@calendar', '@calendar today', '@calendar this week'],
  },
]

export class GoogleIntegration implements Integration {
  id = 'google'
  name = 'Google'
  description = 'Google Calendar & Meet'
  commands = COMMANDS

  // Mock: always "connected" for UI testing
  private _connected = true

  oauthConfig: OAuthConfig = {
    authUrl: 'https://accounts.google.com/o/oauth2/v2/auth',
    tokenUrl: 'https://oauth2.googleapis.com/token',
    clientId: process.env.CLUI_GOOGLE_CLIENT_ID || '',
    clientSecret: process.env.CLUI_GOOGLE_CLIENT_SECRET || '',
    scopes: [
      'https://www.googleapis.com/auth/calendar.readonly',
      'https://www.googleapis.com/auth/calendar.events',
    ],
    redirectPort: 17832,
  }

  isConnected(): boolean {
    return this._connected
  }

  async connect(): Promise<void> {
    // TODO: Real OAuth flow in Phase 2
    this._connected = true
  }

  async disconnect(): Promise<void> {
    this._connected = false
  }

  async executeCommand(command: string, rawInput: string): Promise<CommandResult> {
    switch (command) {
      case 'schedule':
        return this._mockSchedule(rawInput)
      case 'meeting':
        return this._mockMeeting(rawInput)
      case 'calendar':
        return this._mockCalendar(rawInput)
      default:
        return { success: false, message: `Unknown command: @${command}` }
    }
  }

  getSystemPromptFragment(): string {
    return [
      'The user has Google Calendar connected. Available @ commands:',
      '- @schedule <description> — Create a calendar event',
      '- @meeting <description> — Create a Google Meet meeting',
      '- @calendar [today|this week] — Show upcoming events',
      'You can suggest these commands when the user asks about scheduling or meetings.',
    ].join('\n')
  }

  // ─── Mock responses ───

  private async _mockSchedule(rawInput: string): Promise<CommandResult> {
    const now = new Date()
    const later = new Date(now.getTime() + 60 * 60 * 1000)
    return {
      success: true,
      message: [
        `**Event Created** (mock)`,
        '',
        `> ${rawInput || 'Untitled Event'}`,
        '',
        `| | |`,
        `|---|---|`,
        `| **When** | ${later.toLocaleDateString()} at ${later.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} |`,
        `| **Calendar** | Primary |`,
        '',
        '*This is a mock response — real Calendar API coming in Phase 3.*',
      ].join('\n'),
      data: { eventId: 'mock-event-' + Date.now() },
    }
  }

  private async _mockMeeting(rawInput: string): Promise<CommandResult> {
    const meetCode = Math.random().toString(36).substring(2, 5) + '-' +
      Math.random().toString(36).substring(2, 6) + '-' +
      Math.random().toString(36).substring(2, 5)
    return {
      success: true,
      message: [
        `**Meeting Created** (mock)`,
        '',
        `> ${rawInput || 'Quick Meeting'}`,
        '',
        `| | |`,
        `|---|---|`,
        `| **Meet Link** | \`https://meet.google.com/${meetCode}\` |`,
        `| **Duration** | 30 minutes |`,
        '',
        '*This is a mock response — real Meet integration coming in Phase 3.*',
      ].join('\n'),
      data: { meetLink: `https://meet.google.com/${meetCode}` },
    }
  }

  private async _mockCalendar(rawInput: string): Promise<CommandResult> {
    const today = new Date()
    const fmt = (h: number, m: number) => {
      const d = new Date(today)
      d.setHours(h, m, 0, 0)
      return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    }

    const period = rawInput.trim().toLowerCase() || 'today'

    return {
      success: true,
      message: [
        `**Calendar — ${period}** (mock)`,
        '',
        `| Time | Event |`,
        `|------|-------|`,
        `| ${fmt(9, 0)} | Team standup |`,
        `| ${fmt(11, 30)} | Design review with Sarah |`,
        `| ${fmt(14, 0)} | 1:1 with manager |`,
        `| ${fmt(16, 0)} | Sprint planning |`,
        '',
        '*This is a mock response — real Calendar API coming in Phase 3.*',
      ].join('\n'),
      data: { eventCount: 4 },
    }
  }
}
