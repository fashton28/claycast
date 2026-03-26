import React, { useEffect, useRef } from 'react'
import { createPortal } from 'react-dom'
import { motion } from 'framer-motion'
import {
  CalendarBlank, VideoCamera, ListBullets, Plugs,
} from '@phosphor-icons/react'
import { usePopoverLayer } from './PopoverLayer'
import { useColors } from '../theme'

export interface AtCommand {
  trigger: string
  description: string
  integration: string
  connected: boolean
  icon: React.ReactNode
}

interface Props {
  filter: string
  selectedIndex: number
  onSelect: (cmd: AtCommand) => void
  anchorRect: DOMRect | null
  commands: AtCommand[]
}

const TRIGGER_ICONS: Record<string, React.ReactNode> = {
  schedule: <CalendarBlank size={13} />,
  meeting: <VideoCamera size={13} />,
  calendar: <ListBullets size={13} />,
}

function getIcon(trigger: string): React.ReactNode {
  return TRIGGER_ICONS[trigger] || <Plugs size={13} />
}

export function buildAtCommands(
  commands: Array<{ trigger: string; description: string; integration: string }>,
  connectedIds: Set<string>,
): AtCommand[] {
  return commands.map((cmd) => ({
    trigger: cmd.trigger,
    description: cmd.description,
    integration: cmd.integration,
    connected: connectedIds.has(cmd.integration),
    icon: getIcon(cmd.trigger),
  }))
}

export function getFilteredAtCommands(filter: string, commands: AtCommand[]): AtCommand[] {
  const q = filter.toLowerCase().replace(/^@/, '')
  if (!q) return commands
  return commands.filter((c) => c.trigger.startsWith(q))
}

export function AtCommandMenu({ filter, selectedIndex, onSelect, anchorRect, commands }: Props) {
  const listRef = useRef<HTMLDivElement>(null)
  const popoverLayer = usePopoverLayer()
  const filtered = getFilteredAtCommands(filter, commands)
  const colors = useColors()

  useEffect(() => {
    if (!listRef.current) return
    const item = listRef.current.children[selectedIndex] as HTMLElement | undefined
    item?.scrollIntoView({ block: 'nearest' })
  }, [selectedIndex])

  if (filtered.length === 0 || !anchorRect || !popoverLayer) return null

  return createPortal(
    <motion.div
      data-clui-ui
      initial={{ opacity: 0, y: 4 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 4 }}
      transition={{ duration: 0.12 }}
      style={{
        position: 'fixed',
        bottom: window.innerHeight - anchorRect.top + 4,
        left: anchorRect.left + 12,
        right: window.innerWidth - anchorRect.right + 12,
        pointerEvents: 'auto',
      }}
    >
      <div
        ref={listRef}
        className="overflow-y-auto rounded-xl py-1"
        style={{
          maxHeight: 220,
          background: colors.popoverBg,
          backdropFilter: 'blur(20px)',
          border: `1px solid ${colors.popoverBorder}`,
          boxShadow: colors.popoverShadow,
        }}
      >
        {filtered.map((cmd, i) => {
          const isSelected = i === selectedIndex
          return (
            <button
              key={cmd.trigger}
              onClick={() => onSelect(cmd)}
              className="w-full flex items-center gap-2.5 px-3 py-1.5 text-left transition-colors"
              style={{
                background: isSelected ? colors.accentLight : 'transparent',
              }}
              onMouseEnter={(e) => {
                (e.currentTarget as HTMLElement).style.background = colors.accentLight
              }}
              onMouseLeave={(e) => {
                if (!isSelected) {
                  (e.currentTarget as HTMLElement).style.background = 'transparent'
                }
              }}
            >
              <span
                className="flex items-center justify-center w-6 h-6 rounded-md flex-shrink-0"
                style={{
                  background: isSelected ? colors.accentSoft : colors.surfaceHover,
                  color: isSelected ? colors.accent : colors.textTertiary,
                }}
              >
                {cmd.icon}
              </span>
              <div className="min-w-0 flex-1 flex items-center gap-2">
                <span
                  className="text-[12px] font-mono font-medium"
                  style={{ color: isSelected ? colors.accent : colors.textPrimary }}
                >
                  @{cmd.trigger}
                </span>
                <span
                  className="text-[11px]"
                  style={{ color: colors.textTertiary }}
                >
                  {cmd.description}
                </span>
              </div>
              {!cmd.connected && (
                <span
                  className="text-[10px] px-1.5 py-0.5 rounded-full flex-shrink-0"
                  style={{
                    background: colors.surfaceHover,
                    color: colors.textTertiary,
                  }}
                >
                  not connected
                </span>
              )}
            </button>
          )
        })}
      </div>
    </motion.div>,
    popoverLayer,
  )
}
