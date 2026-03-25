/**
 * Command Palette registry — pure data module.
 * Each command carries an execute() callback that is called lazily (reads store state at invocation time).
 */
import { useSessionStore } from './stores/sessionStore'
import { useThemeStore } from './theme'

export interface PaletteCommand {
  id: string
  label: string
  description: string
  category: 'Quick Action' | 'App' | 'Built-in' | 'AI Shortcut'
  iconName: string
  shortcut?: string
  execute: () => void | { prefill: string }
}

export function buildCommandRegistry(): PaletteCommand[] {
  return [
    // ─── Quick Actions ───
    {
      id: 'new-tab',
      label: 'New Tab',
      description: 'Open a new conversation tab',
      category: 'Quick Action',
      iconName: 'Plus',
      shortcut: '⌘N',
      execute: () => { useSessionStore.getState().createTab() },
    },
    {
      id: 'close-tab',
      label: 'Close Tab',
      description: 'Close the active tab',
      category: 'Quick Action',
      iconName: 'X',
      execute: () => {
        const { activeTabId, closeTab } = useSessionStore.getState()
        if (activeTabId) closeTab(activeTabId)
      },
    },
    {
      id: 'toggle-expanded',
      label: 'Toggle Expanded',
      description: 'Expand or collapse the chat view',
      category: 'Quick Action',
      iconName: 'ArrowsOutSimple',
      execute: () => { useSessionStore.getState().toggleExpanded() },
    },
    {
      id: 'clear-conversation',
      label: 'Clear Conversation',
      description: 'Clear the current chat history',
      category: 'Quick Action',
      iconName: 'Trash',
      execute: () => {
        useSessionStore.getState().clearTab()
        useSessionStore.getState().addSystemMessage('Conversation cleared.')
      },
    },

    // ─── App ───
    {
      id: 'open-customize',
      label: 'Open Customize',
      description: 'Change accent color, background, and font',
      category: 'App',
      iconName: 'Palette',
      execute: () => { useSessionStore.getState().toggleCustomize() },
    },
    {
      id: 'open-marketplace',
      label: 'Open Skills Marketplace',
      description: 'Browse and install skills and plugins',
      category: 'App',
      iconName: 'HeadCircuit',
      execute: () => { useSessionStore.getState().toggleMarketplace() },
    },
    {
      id: 'toggle-theme',
      label: 'Toggle Theme',
      description: 'Switch between dark and light mode',
      category: 'App',
      iconName: 'Moon',
      execute: () => {
        const { isDark, setThemeMode } = useThemeStore.getState()
        setThemeMode(isDark ? 'light' : 'dark')
      },
    },
    {
      id: 'toggle-full-width',
      label: 'Toggle Full Width',
      description: 'Expand or shrink the panel width',
      category: 'App',
      iconName: 'ArrowsOutSimple',
      execute: () => {
        const { expandedUI, setExpandedUI } = useThemeStore.getState()
        setExpandedUI(!expandedUI)
      },
    },

    // ─── Built-in (mirrors slash commands) ───
    {
      id: 'show-cost',
      label: 'Show Cost',
      description: 'Display token usage and cost for last run',
      category: 'Built-in',
      iconName: 'CurrencyDollar',
      execute: () => {
        const { tabs, activeTabId, addSystemMessage } = useSessionStore.getState()
        const tab = tabs.find((t) => t.id === activeTabId)
        if (tab?.lastResult) {
          const r = tab.lastResult
          const parts = [`$${r.totalCostUsd.toFixed(4)}`, `${(r.durationMs / 1000).toFixed(1)}s`, `${r.numTurns} turn${r.numTurns !== 1 ? 's' : ''}`]
          if (r.usage.input_tokens) {
            parts.push(`${r.usage.input_tokens.toLocaleString()} in / ${(r.usage.output_tokens || 0).toLocaleString()} out`)
          }
          addSystemMessage(parts.join(' · '))
        } else {
          addSystemMessage('No cost data yet — send a message first.')
        }
      },
    },
    {
      id: 'show-model',
      label: 'Show Model',
      description: 'Display current model info',
      category: 'Built-in',
      iconName: 'Cpu',
      execute: () => {
        const { tabs, activeTabId, staticInfo, preferredModel, addSystemMessage } = useSessionStore.getState()
        const tab = tabs.find((t) => t.id === activeTabId)
        const model = tab?.sessionModel || null
        const version = tab?.sessionVersion || staticInfo?.version || null
        const current = preferredModel || model || 'default'
        const header = version ? `Claude Code ${version}` : 'Claude Code'
        addSystemMessage(`${header}\nCurrent model: ${current}\n\nSwitch via /model <name>`)
      },
    },
    {
      id: 'show-mcp',
      label: 'Show MCP Status',
      description: 'Display connected MCP servers',
      category: 'Built-in',
      iconName: 'HardDrives',
      execute: () => {
        const { tabs, activeTabId, addSystemMessage } = useSessionStore.getState()
        const tab = tabs.find((t) => t.id === activeTabId)
        if (tab?.sessionMcpServers && tab.sessionMcpServers.length > 0) {
          const lines = tab.sessionMcpServers.map((s) => {
            const icon = s.status === 'connected' ? '\u2713' : s.status === 'failed' ? '\u2717' : '\u25CB'
            return `  ${icon} ${s.name} — ${s.status}`
          })
          addSystemMessage(`MCP Servers (${tab.sessionMcpServers.length}):\n${lines.join('\n')}`)
        } else {
          addSystemMessage('No MCP servers connected.')
        }
      },
    },
    {
      id: 'show-help',
      label: 'Show Help',
      description: 'List available commands and shortcuts',
      category: 'Built-in',
      iconName: 'Question',
      execute: () => {
        useSessionStore.getState().addSystemMessage(
          'Commands:\n' +
          '  /clear — Clear conversation\n' +
          '  /cost — Token usage & cost\n' +
          '  /model — Model info & switch\n' +
          '  /mcp — MCP server status\n' +
          '  /skills — Available skills\n' +
          '  /help — This list\n\n' +
          'Command Palette:\n' +
          '  Type > to open the command palette'
        )
      },
    },

    // ─── AI Shortcuts ───
    {
      id: 'ai-clipboard',
      label: 'Ask about clipboard',
      description: 'Analyze the contents of your clipboard',
      category: 'AI Shortcut',
      iconName: 'Clipboard',
      execute: () => ({ prefill: 'Analyze the contents of my clipboard: ' }),
    },
    {
      id: 'ai-summarize',
      label: 'Summarize file',
      description: 'Generate a summary of a file',
      category: 'AI Shortcut',
      iconName: 'FileText',
      execute: () => ({ prefill: 'Summarize this file: ' }),
    },
    {
      id: 'ai-explain',
      label: 'Explain code',
      description: 'Get an explanation of how code works',
      category: 'AI Shortcut',
      iconName: 'Code',
      execute: () => ({ prefill: 'Explain this code: ' }),
    },
    {
      id: 'ai-fix-bug',
      label: 'Fix bug',
      description: 'Find and fix a bug in your code',
      category: 'AI Shortcut',
      iconName: 'Bug',
      execute: () => ({ prefill: 'Find and fix the bug in: ' }),
    },
  ]
}

/** Simple token-based fuzzy filter. Scores by earliest match position. */
export function filterCommands(query: string, commands: PaletteCommand[]): PaletteCommand[] {
  if (!query.trim()) return commands

  const tokens = query.toLowerCase().split(/\s+/).filter(Boolean)
  const scored: Array<{ cmd: PaletteCommand; score: number }> = []

  for (const cmd of commands) {
    const haystack = `${cmd.label} ${cmd.description} ${cmd.category}`.toLowerCase()
    let matched = true
    let totalPos = 0

    for (const token of tokens) {
      const idx = haystack.indexOf(token)
      if (idx === -1) { matched = false; break }
      totalPos += idx
    }

    if (matched) {
      scored.push({ cmd, score: totalPos })
    }
  }

  scored.sort((a, b) => a.score - b.score)
  return scored.map((s) => s.cmd)
}
