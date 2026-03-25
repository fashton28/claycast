import React, { useState, useCallback } from 'react'
import { X, Palette, PaintBucket, TextAa, ArrowCounterClockwise, Check } from '@phosphor-icons/react'
import { useThemeStore, useColors } from '../theme'
import { useSessionStore } from '../stores/sessionStore'

const ACCENT_PRESETS = [
  { label: 'Default', value: null },
  { label: 'Coral', value: '#d97757' },
  { label: 'Blue', value: '#5b8def' },
  { label: 'Teal', value: '#4ecdc4' },
  { label: 'Purple', value: '#9b72cf' },
  { label: 'Pink', value: '#e06c9f' },
  { label: 'Green', value: '#7aac8c' },
  { label: 'Gold', value: '#d4a853' },
  { label: 'Red', value: '#e05555' },
  { label: 'Indigo', value: '#6366f1' },
]

const BG_PRESETS = [
  { label: 'Default', value: null },
  { label: 'Charcoal', value: '#1a1a2e' },
  { label: 'Midnight', value: '#0f0f1a' },
  { label: 'Forest', value: '#1a2418' },
  { label: 'Navy', value: '#141e30' },
  { label: 'Warm', value: '#2a2420' },
  { label: 'Slate', value: '#1e293b' },
  { label: 'Deep Purple', value: '#1a1025' },
  { label: 'Obsidian', value: '#0a0a0a' },
  { label: 'Mocha', value: '#2d2016' },
]

const FONT_OPTIONS = [
  { label: 'System Default', value: null },
  { label: 'Inter', value: 'Inter, sans-serif' },
  { label: 'SF Mono', value: '"SF Mono", monospace' },
  { label: 'JetBrains Mono', value: '"JetBrains Mono", monospace' },
  { label: 'Fira Code', value: '"Fira Code", monospace' },
  { label: 'IBM Plex Sans', value: '"IBM Plex Sans", sans-serif' },
  { label: 'Source Code Pro', value: '"Source Code Pro", monospace' },
]

function ColorSwatch({
  color,
  isDefault,
  isActive,
  onClick,
  accentColor,
}: {
  color: string | null
  isDefault: boolean
  isActive: boolean
  onClick: () => void
  accentColor: string
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      title={isDefault ? 'Default' : color ?? ''}
      className="relative flex items-center justify-center rounded-full transition-all hover:scale-110"
      style={{
        width: 28,
        height: 28,
        background: isDefault
          ? 'conic-gradient(from 0deg, #d97757, #5b8def, #4ecdc4, #9b72cf, #e06c9f, #7aac8c, #d97757)'
          : (color ?? 'transparent'),
        outline: isActive ? `2px solid ${accentColor}` : '2px solid transparent',
        outlineOffset: 2,
        cursor: 'pointer',
      }}
    >
      {isActive && (
        <Check size={12} weight="bold" color="#fff" style={{ filter: 'drop-shadow(0 1px 2px rgba(0,0,0,0.6))' }} />
      )}
    </button>
  )
}

function HexInput({
  value,
  onChange,
  colors,
}: {
  value: string
  onChange: (hex: string) => void
  colors: ReturnType<typeof useColors>
}) {
  const [local, setLocal] = useState(value)
  const isValid = /^#[0-9a-fA-F]{6}$/.test(local)

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let v = e.target.value
    if (!v.startsWith('#')) v = '#' + v
    setLocal(v)
    if (/^#[0-9a-fA-F]{6}$/.test(v)) {
      onChange(v)
    }
  }

  return (
    <div className="flex items-center gap-2">
      <div
        className="rounded-full flex-shrink-0"
        style={{
          width: 20,
          height: 20,
          background: isValid ? local : colors.surfaceSecondary,
          border: `1px solid ${colors.containerBorder}`,
        }}
      />
      <input
        type="text"
        value={local}
        onChange={handleChange}
        placeholder="#000000"
        maxLength={7}
        className="font-mono"
        style={{
          width: 80,
          fontSize: 11,
          padding: '4px 8px',
          borderRadius: 8,
          border: `1px solid ${isValid || local.length <= 1 ? colors.containerBorder : colors.statusError}`,
          background: colors.surfacePrimary,
          color: colors.textPrimary,
          outline: 'none',
          fontFamily: 'monospace',
        }}
      />
    </div>
  )
}

export function CustomizePanel() {
  const colors = useColors()
  const closeCustomize = useSessionStore((s) => s.closeCustomize)
  const customAccentColor = useThemeStore((s) => s.customAccentColor)
  const customBgColor = useThemeStore((s) => s.customBgColor)
  const customFont = useThemeStore((s) => s.customFont)
  const setCustomAccentColor = useThemeStore((s) => s.setCustomAccentColor)
  const setCustomBgColor = useThemeStore((s) => s.setCustomBgColor)
  const setCustomFont = useThemeStore((s) => s.setCustomFont)

  const hasCustomization = customAccentColor !== null || customBgColor !== null || customFont !== null

  return (
    <div
      data-clui-ui
      style={{
        height: 470,
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      {/* Header */}
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '16px 18px 10px',
        borderBottom: `1px solid ${colors.containerBorder}`,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <Palette size={20} weight="regular" style={{ color: colors.accent }} />
          <div>
            <div style={{ fontSize: 13, fontWeight: 700, color: colors.textPrimary }}>
              Customize
            </div>
            <div style={{ fontSize: 11, color: colors.textTertiary, marginTop: 2 }}>
              Personalize your interface
            </div>
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          {hasCustomization && (
            <button
              onClick={() => {
                setCustomAccentColor(null)
                setCustomBgColor(null)
                setCustomFont(null)
              }}
              style={{
                background: 'none', border: 'none', cursor: 'pointer',
                color: colors.textTertiary, padding: 2, display: 'flex',
                alignItems: 'center', gap: 4, fontSize: 11,
                borderRadius: 4, fontFamily: 'inherit',
              }}
              onMouseEnter={(e) => (e.currentTarget.style.color = colors.textPrimary)}
              onMouseLeave={(e) => (e.currentTarget.style.color = colors.textTertiary)}
            >
              <ArrowCounterClockwise size={12} />
              Reset all
            </button>
          )}
          <button
            onClick={closeCustomize}
            style={{
              background: 'none', border: 'none', cursor: 'pointer',
              color: colors.textTertiary, padding: 2, display: 'flex',
              borderRadius: 4,
            }}
            onMouseEnter={(e) => (e.currentTarget.style.color = colors.textPrimary)}
            onMouseLeave={(e) => (e.currentTarget.style.color = colors.textTertiary)}
          >
            <X size={14} />
          </button>
        </div>
      </div>

      {/* Body */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '0 18px', scrollbarWidth: 'thin' }}>

        {/* Accent Color */}
        <div style={{ padding: '16px 0 12px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 12 }}>
            <Palette size={14} style={{ color: colors.textTertiary }} />
            <div style={{ fontSize: 12, fontWeight: 600, color: colors.textPrimary }}>
              Accent Color
            </div>
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 10 }}>
            {ACCENT_PRESETS.map((preset) => (
              <ColorSwatch
                key={preset.label}
                color={preset.value}
                isDefault={preset.value === null}
                isActive={customAccentColor === preset.value}
                onClick={() => setCustomAccentColor(preset.value)}
                accentColor={colors.textPrimary}
              />
            ))}
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <div style={{ fontSize: 11, color: colors.textTertiary }}>Custom:</div>
            <HexInput
              value={customAccentColor ?? '#d97757'}
              onChange={(hex) => setCustomAccentColor(hex)}
              colors={colors}
            />
          </div>
        </div>

        <div style={{ height: 1, background: colors.containerBorder }} />

        {/* Background Color */}
        <div style={{ padding: '16px 0 12px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 12 }}>
            <PaintBucket size={14} style={{ color: colors.textTertiary }} />
            <div style={{ fontSize: 12, fontWeight: 600, color: colors.textPrimary }}>
              Background Color
            </div>
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 10 }}>
            {BG_PRESETS.map((preset) => (
              <ColorSwatch
                key={preset.label}
                color={preset.value}
                isDefault={preset.value === null}
                isActive={customBgColor === preset.value}
                onClick={() => setCustomBgColor(preset.value)}
                accentColor={colors.textPrimary}
              />
            ))}
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <div style={{ fontSize: 11, color: colors.textTertiary }}>Custom:</div>
            <HexInput
              value={customBgColor ?? '#242422'}
              onChange={(hex) => setCustomBgColor(hex)}
              colors={colors}
            />
          </div>
        </div>

        <div style={{ height: 1, background: colors.containerBorder }} />

        {/* Font */}
        <div style={{ padding: '16px 0 16px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 12 }}>
            <TextAa size={14} style={{ color: colors.textTertiary }} />
            <div style={{ fontSize: 12, fontWeight: 600, color: colors.textPrimary }}>
              Font
            </div>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            {FONT_OPTIONS.map((font) => {
              const isActive = customFont === font.value
              return (
                <button
                  key={font.label}
                  type="button"
                  onClick={() => setCustomFont(font.value)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '8px 12px',
                    borderRadius: 10,
                    border: `1px solid ${isActive ? colors.accent : colors.containerBorder}`,
                    background: isActive ? colors.accentLight : 'transparent',
                    cursor: 'pointer',
                    fontFamily: font.value ?? 'inherit',
                    transition: 'all 0.15s',
                  }}
                  onMouseEnter={(e) => {
                    if (!isActive) e.currentTarget.style.background = colors.surfaceHover
                  }}
                  onMouseLeave={(e) => {
                    if (!isActive) e.currentTarget.style.background = 'transparent'
                  }}
                >
                  <span style={{
                    fontSize: 12,
                    color: isActive ? colors.accent : colors.textPrimary,
                    fontWeight: isActive ? 600 : 400,
                  }}>
                    {font.label}
                  </span>
                  {isActive && <Check size={12} style={{ color: colors.accent }} />}
                </button>
              )
            })}
          </div>
        </div>
      </div>
    </div>
  )
}
