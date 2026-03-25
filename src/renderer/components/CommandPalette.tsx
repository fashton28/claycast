import React, { useEffect, useRef, useMemo } from 'react'
import { createPortal } from 'react-dom'
import { motion } from 'framer-motion'
import {
  Plus, X, ArrowsOutSimple, Trash, Palette, HeadCircuit, Moon,
  CurrencyDollar, Cpu, HardDrives, Question, Clipboard, FileText,
  Code, Bug,
} from '@phosphor-icons/react'
import { usePopoverLayer } from './PopoverLayer'
import { useColors } from '../theme'
import { type PaletteCommand, buildCommandRegistry, filterCommands } from '../commandRegistry'

const ICON_MAP: Record<string, React.ReactNode> = {
  Plus: <Plus size={13} />,
  X: <X size={13} />,
  ArrowsOutSimple: <ArrowsOutSimple size={13} />,
  Trash: <Trash size={13} />,
  Palette: <Palette size={13} />,
  HeadCircuit: <HeadCircuit size={13} />,
  Moon: <Moon size={13} />,
  CurrencyDollar: <CurrencyDollar size={13} />,
  Cpu: <Cpu size={13} />,
  HardDrives: <HardDrives size={13} />,
  Question: <Question size={13} />,
  Clipboard: <Clipboard size={13} />,
  FileText: <FileText size={13} />,
  Code: <Code size={13} />,
  Bug: <Bug size={13} />,
}

const CATEGORY_ORDER: PaletteCommand['category'][] = ['Quick Action', 'App', 'Built-in', 'AI Shortcut']

interface Props {
  query: string
  selectedIndex: number
  onSelect: (cmd: PaletteCommand) => void
  onDismiss: () => void
  anchorRect: DOMRect | null
}

export function CommandPalette({ query, selectedIndex, onSelect, anchorRect }: Props) {
  const listRef = useRef<HTMLDivElement>(null)
  const popoverLayer = usePopoverLayer()
  const colors = useColors()

  const commands = useMemo(() => buildCommandRegistry(), [])
  const filtered = useMemo(() => filterCommands(query, commands), [query, commands])

  // Group by category, preserving order
  const grouped = useMemo(() => {
    const groups: Array<{ category: string; items: Array<{ cmd: PaletteCommand; globalIndex: number }> }> = []
    const categoryMap = new Map<string, Array<{ cmd: PaletteCommand; globalIndex: number }>>()

    filtered.forEach((cmd, i) => {
      const existing = categoryMap.get(cmd.category)
      if (existing) {
        existing.push({ cmd, globalIndex: i })
      } else {
        const items = [{ cmd, globalIndex: i }]
        categoryMap.set(cmd.category, items)
      }
    })

    for (const cat of CATEGORY_ORDER) {
      const items = categoryMap.get(cat)
      if (items && items.length > 0) {
        groups.push({ category: cat, items })
      }
    }

    return groups
  }, [filtered])

  useEffect(() => {
    if (!listRef.current) return
    const el = listRef.current.querySelector(`[data-palette-index="${selectedIndex}"]`) as HTMLElement | undefined
    el?.scrollIntoView({ block: 'nearest' })
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
        className="overflow-y-auto rounded-xl"
        style={{
          maxHeight: 340,
          background: colors.popoverBg,
          backdropFilter: 'blur(20px)',
          border: `1px solid ${colors.popoverBorder}`,
          boxShadow: colors.popoverShadow,
        }}
      >
        {/* Header */}
        <div
          className="px-3 py-2 flex items-center justify-between"
          style={{ borderBottom: `1px solid ${colors.popoverBorder}` }}
        >
          <span className="text-[10px] font-medium uppercase tracking-wider" style={{ color: colors.textTertiary }}>
            Command Palette
          </span>
          {query && (
            <span className="text-[10px]" style={{ color: colors.textTertiary }}>
              {filtered.length} result{filtered.length !== 1 ? 's' : ''}
            </span>
          )}
        </div>

        {/* Grouped items */}
        <div className="py-1">
          {grouped.map((group) => (
            <div key={group.category}>
              <div
                className="px-3 pt-2 pb-1 text-[10px] font-semibold uppercase tracking-wider"
                style={{ color: colors.textTertiary }}
              >
                {group.category}
              </div>
              {group.items.map(({ cmd, globalIndex }) => {
                const isSelected = globalIndex === selectedIndex
                return (
                  <button
                    key={cmd.id}
                    data-palette-index={globalIndex}
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
                    {/* Icon */}
                    <span
                      className="flex items-center justify-center w-6 h-6 rounded-md flex-shrink-0"
                      style={{
                        background: isSelected ? colors.accentSoft : colors.surfaceHover,
                        color: isSelected ? colors.accent : colors.textTertiary,
                      }}
                    >
                      {ICON_MAP[cmd.iconName] || <Question size={13} />}
                    </span>

                    {/* Label + description */}
                    <div className="min-w-0 flex-1">
                      <span
                        className="text-[12px] font-medium"
                        style={{ color: isSelected ? colors.accent : colors.textPrimary }}
                      >
                        {cmd.label}
                      </span>
                      <span
                        className="text-[11px] ml-2"
                        style={{ color: colors.textTertiary }}
                      >
                        {cmd.description}
                      </span>
                    </div>

                    {/* Shortcut */}
                    {cmd.shortcut && (
                      <span
                        className="text-[10px] font-mono flex-shrink-0"
                        style={{ color: colors.textTertiary }}
                      >
                        {cmd.shortcut}
                      </span>
                    )}
                  </button>
                )
              })}
            </div>
          ))}
        </div>
      </div>
    </motion.div>,
    popoverLayer,
  )
}

/** Exported for InputBar to use for index bounds */
export { buildCommandRegistry, filterCommands }
