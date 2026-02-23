import { useState } from 'react'
import {
  useSettingsStore,
  ROUTING_LABELS,
  STINGER_LABELS,
  PERIOD_LABELS,
  PERIOD_RANGES,
  MIXER_LABELS,
  ticksToTime,
  type RoutingKey,
  type IndicatorPeriods,
  type MixerVolumes,
} from '../../stores/settingsStore'
import { MUSIC_STYLES, getStyleConfig, type MusicStyle } from '../../services/styleConfigs'
import type { CandlePatternType } from '../../types'

interface SettingsPanelProps {
  isOpen: boolean
  onClose: () => void
  onSaveApiKey: (key: string) => void
}

// ---------------------------------------------------------------------------
// Presets
// ---------------------------------------------------------------------------

interface Preset {
  label: string
  description: string
  routings: Partial<Record<RoutingKey, boolean>>
  style?: MusicStyle
}

const PRESETS: Record<string, Preset> = {
  default: {
    label: 'Default',
    description: 'All indicators active',
    routings: {
      rsiToBrightness: true, rsiToChordTension: true, macdToProgression: true,
      adxToDrums: true, adxToHats: true, atrToTempo: true, atrToSpace: true,
      emaToPad: true, emaToMoodKey: true, volToBassFilter: true,
    },
    style: 'techno',
  },
  q: {
    label: 'Q',
    description: '9/21 EMA + price action — short-term NQ/MNQ futures scalper',
    routings: {
      rsiToBrightness: false, rsiToChordTension: false, macdToProgression: false,
      adxToDrums: false, adxToHats: false, atrToTempo: true, atrToSpace: false,
      emaToPad: true, emaToMoodKey: true, volToBassFilter: false,
    },
    style: 'jazz',
  },
  minimal: {
    label: 'Minimal',
    description: 'Mood & tempo only — ambient background',
    routings: {
      rsiToBrightness: false, rsiToChordTension: false, macdToProgression: false,
      adxToDrums: false, adxToHats: false, atrToTempo: true, atrToSpace: false,
      emaToPad: false, emaToMoodKey: true, volToBassFilter: false,
    },
    style: 'ambient',
  },
}

// ---------------------------------------------------------------------------
// Tabs
// ---------------------------------------------------------------------------

type Tab = 'sound' | 'routing' | 'config'

const TABS: { key: Tab; label: string }[] = [
  { key: 'sound', label: 'Sound' },
  { key: 'routing', label: 'Routing' },
  { key: 'config', label: 'Config' },
]

// ---------------------------------------------------------------------------
// Toggle switch component
// ---------------------------------------------------------------------------

function Toggle({ on, onToggle }: { on: boolean; onToggle: () => void }) {
  return (
    <button
      onClick={onToggle}
      className={`relative w-9 h-[18px] rounded-full transition-all duration-200 cursor-pointer flex-shrink-0 ${
        on
          ? 'bg-white/25 shadow-[0_0_8px_rgba(255,255,255,0.1)]'
          : 'bg-white/[0.07]'
      }`}
    >
      <span
        className={`absolute top-[2px] left-[2px] w-[14px] h-[14px] rounded-full transition-all duration-200 ${
          on
            ? 'translate-x-[18px] bg-white shadow-[0_0_6px_rgba(255,255,255,0.3)]'
            : 'translate-x-0 bg-white/30'
        }`}
      />
    </button>
  )
}

// ---------------------------------------------------------------------------
// Sentiment color dot
// ---------------------------------------------------------------------------

function SentimentDot({ sentiment }: { sentiment: 'bullish' | 'bearish' | 'neutral' }) {
  const color =
    sentiment === 'bullish' ? 'bg-emerald-400/80' :
    sentiment === 'bearish' ? 'bg-red-400/80' :
    'bg-yellow-400/80'
  return <span className={`inline-block w-1.5 h-1.5 rounded-full ${color} mr-2 flex-shrink-0`} />
}

// ---------------------------------------------------------------------------
// Section header
// ---------------------------------------------------------------------------

function SectionHeader({ children, action }: { children: React.ReactNode; action?: React.ReactNode }) {
  return (
    <div className="flex justify-between items-center mb-3">
      <h3 className="text-white/50 text-[10px] uppercase tracking-[0.15em] font-semibold">{children}</h3>
      {action}
    </div>
  )
}

function ResetButton({ onClick }: { onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="text-white/20 hover:text-white/50 text-[10px] uppercase tracking-wider cursor-pointer transition-colors"
    >
      Reset
    </button>
  )
}

// ---------------------------------------------------------------------------
// Indicator period slider groups
// ---------------------------------------------------------------------------

const PERIOD_GROUPS: { label: string; keys: (keyof IndicatorPeriods)[] }[] = [
  { label: 'Trend (EMA)', keys: ['emaShort', 'emaLong'] },
  { label: 'MACD', keys: ['macdFast', 'macdSlow', 'macdSignal'] },
  { label: 'Momentum', keys: ['rsi', 'adx', 'atr'] },
]

// ---------------------------------------------------------------------------
// Main panel
// ---------------------------------------------------------------------------

export function SettingsPanel({ isOpen, onClose, onSaveApiKey }: SettingsPanelProps) {
  const [apiKey, setApiKey] = useState(() => localStorage.getItem('lyria-api-key') ?? '')
  const [tab, setTab] = useState<Tab>('sound')
  const {
    routings, stingers, stingerVolume, style, periods, mixer,
    toggleRouting, toggleStinger, setStingerVolume, setStyle, setPeriod, resetPeriods,
    setMixerVolume, resetMixer, resetDefaults,
  } = useSettingsStore()

  if (!isOpen) return null

  const applyPreset = (key: string) => {
    const preset = PRESETS[key]
    if (!preset) return
    const store = useSettingsStore.getState()
    const newRoutings = { ...store.routings }
    for (const [k, v] of Object.entries(preset.routings)) {
      newRoutings[k as RoutingKey] = v as boolean
    }
    useSettingsStore.setState({ routings: newRoutings })
    if (preset.style) {
      useSettingsStore.setState({ style: preset.style })
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center"
      onClick={(e) => { if (e.target === e.currentTarget) onClose() }}
    >
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/60 backdrop-blur-md" />

      {/* Panel */}
      <div className="relative w-[540px] max-h-[85vh] flex flex-col rounded-2xl overflow-hidden border border-white/[0.06] bg-[rgba(8,8,24,0.85)] backdrop-blur-xl shadow-[0_32px_64px_rgba(0,0,0,0.5)]">

        {/* Header */}
        <div className="flex items-center justify-between px-6 pt-5 pb-1">
          <h2 className="text-white/90 font-semibold text-sm tracking-wide">Settings</h2>
          <button
            onClick={onClose}
            className="w-7 h-7 flex items-center justify-center rounded-full hover:bg-white/10 text-white/30 hover:text-white/70 cursor-pointer transition-all"
          >
            <svg width="10" height="10" viewBox="0 0 10 10" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
              <line x1="1" y1="1" x2="9" y2="9" /><line x1="9" y1="1" x2="1" y2="9" />
            </svg>
          </button>
        </div>

        {/* Tab bar */}
        <div className="flex gap-1 px-6 pt-2 pb-4">
          {TABS.map((t) => (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className={`px-3 py-1.5 rounded-lg text-[11px] uppercase tracking-[0.1em] font-medium cursor-pointer transition-all ${
                tab === t.key
                  ? 'bg-white/[0.12] text-white/80'
                  : 'text-white/30 hover:text-white/50 hover:bg-white/[0.04]'
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>

        {/* Divider */}
        <div className="h-px bg-white/[0.06]" />

        {/* Scrollable content */}
        <div className="flex-1 overflow-y-auto settings-scroll px-6 py-5">

          {/* ============================================================= */}
          {/* TAB: Sound — Style, Mixer, Presets                            */}
          {/* ============================================================= */}
          {tab === 'sound' && (
            <div className="space-y-6">

              {/* --- Presets --- */}
              <section>
                <SectionHeader>Presets</SectionHeader>
                <div className="flex gap-2">
                  {Object.entries(PRESETS).map(([key, preset]) => (
                    <button
                      key={key}
                      onClick={() => applyPreset(key)}
                      className="group px-3.5 py-2 bg-white/[0.04] hover:bg-white/[0.1] border border-white/[0.06] hover:border-white/[0.12] rounded-lg cursor-pointer transition-all"
                      title={preset.description}
                    >
                      <span className="text-[11px] font-medium text-white/60 group-hover:text-white/90 transition-colors">
                        {preset.label}
                      </span>
                    </button>
                  ))}
                </div>
              </section>

              {/* --- Style --- */}
              <section>
                <SectionHeader>Style</SectionHeader>
                <div className="grid grid-cols-3 gap-1.5">
                  {MUSIC_STYLES.map((s) => {
                    const cfg = getStyleConfig(s)
                    const active = style === s
                    return (
                      <button
                        key={s}
                        onClick={() => setStyle(s)}
                        className={`text-left px-3 py-2.5 rounded-lg cursor-pointer transition-all ${
                          active
                            ? 'bg-white/[0.12] ring-1 ring-white/20'
                            : 'bg-white/[0.03] hover:bg-white/[0.07]'
                        }`}
                      >
                        <span className={`text-[11px] font-semibold block ${active ? 'text-white' : 'text-white/60'}`}>
                          {cfg.name}
                        </span>
                        <span className="text-[9px] text-white/25 leading-tight line-clamp-2 mt-0.5 block">
                          {cfg.description}
                        </span>
                      </button>
                    )
                  })}
                </div>
              </section>

              {/* --- Mixer --- */}
              <section>
                <SectionHeader action={<ResetButton onClick={resetMixer} />}>Mixer</SectionHeader>
                <div className="flex justify-between px-2">
                  {(Object.keys(MIXER_LABELS) as (keyof MixerVolumes)[]).map((key) => {
                    const val = mixer[key]
                    const pct = Math.round(val * 100)
                    return (
                      <div key={key} className="flex flex-col items-center gap-2 w-14">
                        <span className={`text-[10px] font-mono tabular-nums ${val > 0 ? 'text-white/50' : 'text-white/20'}`}>
                          {pct}
                        </span>
                        <input
                          type="range"
                          min={0}
                          max={1.5}
                          step={0.05}
                          value={val}
                          onChange={(e) => setMixerVolume(key, parseFloat(e.target.value))}
                          className="fader"
                        />
                        <span className="text-[9px] text-white/30 uppercase tracking-wider">{MIXER_LABELS[key]}</span>
                      </div>
                    )
                  })}
                </div>
              </section>

              {/* --- Stinger Sounds --- */}
              <section>
                <SectionHeader>Stingers</SectionHeader>
                <div className="bg-white/[0.02] rounded-lg border border-white/[0.04] divide-y divide-white/[0.04]">
                  {(Object.keys(STINGER_LABELS) as CandlePatternType[]).map((pattern) => {
                    const { label, sentiment } = STINGER_LABELS[pattern]
                    return (
                      <div key={pattern} className="flex items-center justify-between px-3 py-2">
                        <span className="text-white/60 text-[11px] flex items-center">
                          <SentimentDot sentiment={sentiment} />
                          {label}
                        </span>
                        <Toggle on={stingers[pattern]} onToggle={() => toggleStinger(pattern)} />
                      </div>
                    )
                  })}
                </div>

                {/* Volume slider */}
                <div className="mt-3 flex items-center gap-3">
                  <span className="text-white/30 text-[10px] w-14">Volume</span>
                  <input
                    type="range"
                    min={0}
                    max={1}
                    step={0.05}
                    value={stingerVolume}
                    onChange={(e) => setStingerVolume(parseFloat(e.target.value))}
                    className="slider flex-1"
                  />
                  <span className="text-white/40 text-[10px] w-8 text-right font-mono tabular-nums">
                    {Math.round(stingerVolume * 100)}
                  </span>
                </div>
              </section>
            </div>
          )}

          {/* ============================================================= */}
          {/* TAB: Routing — Signal routing toggles                         */}
          {/* ============================================================= */}
          {tab === 'routing' && (
            <div className="space-y-6">
              <section>
                <SectionHeader>Signal Routing</SectionHeader>
                <div className="bg-white/[0.02] rounded-lg border border-white/[0.04] divide-y divide-white/[0.04]">
                  {(Object.keys(ROUTING_LABELS) as RoutingKey[]).map((key) => {
                    const { indicator, effect } = ROUTING_LABELS[key]
                    return (
                      <div key={key} className="flex items-center justify-between px-3 py-2.5">
                        <span className="text-[11px]">
                          <span className="text-white/30 font-medium">{indicator}</span>
                          <span className="text-white/15 mx-1.5">&rarr;</span>
                          <span className="text-white/60">{effect}</span>
                        </span>
                        <Toggle on={routings[key]} onToggle={() => toggleRouting(key)} />
                      </div>
                    )
                  })}
                </div>
              </section>

              {/* --- Indicator Windows --- */}
              <section>
                <SectionHeader action={<ResetButton onClick={resetPeriods} />}>Indicator Windows</SectionHeader>
                <p className="text-white/20 text-[10px] mb-4 -mt-1">
                  Shorter = faster reaction &middot; Longer = smoother
                </p>
                <div className="space-y-5">
                  {PERIOD_GROUPS.map((group) => (
                    <div key={group.label}>
                      <span className="text-white/25 text-[9px] uppercase tracking-[0.15em] font-medium">{group.label}</span>
                      <div className="space-y-3 mt-2">
                        {group.keys.map((key) => {
                          const [min, max] = PERIOD_RANGES[key]
                          const timeStr = ticksToTime(periods[key])
                          return (
                            <div key={key} className="flex items-center gap-3">
                              <span className="text-white/40 text-[10px] w-16 flex-shrink-0">{PERIOD_LABELS[key]}</span>
                              <input
                                type="range"
                                min={min}
                                max={max}
                                step={1}
                                value={periods[key]}
                                onChange={(e) => setPeriod(key, parseInt(e.target.value))}
                                className="slider flex-1"
                              />
                              <span className="text-white/50 text-[10px] w-10 text-right font-mono tabular-nums">{timeStr}</span>
                            </div>
                          )
                        })}
                      </div>
                    </div>
                  ))}
                </div>
              </section>
            </div>
          )}

          {/* ============================================================= */}
          {/* TAB: Config — API keys, reset                                 */}
          {/* ============================================================= */}
          {tab === 'config' && (
            <div className="space-y-6">
              <section>
                <SectionHeader>API Keys</SectionHeader>
                <div>
                  <label className="block text-white/30 text-[10px] mb-1.5">
                    Google AI API Key (Lyria RealTime)
                  </label>
                  <div className="flex gap-2">
                    <input
                      type="password"
                      value={apiKey}
                      onChange={(e) => setApiKey(e.target.value)}
                      placeholder="AIza..."
                      className="flex-1 bg-white/[0.04] border border-white/[0.08] rounded-lg px-3 py-2 text-white/80 text-[11px] outline-none focus:border-white/20 focus:bg-white/[0.06] transition-all placeholder:text-white/15"
                    />
                    <button
                      onClick={() => {
                        localStorage.setItem('lyria-api-key', apiKey)
                        onSaveApiKey(apiKey)
                      }}
                      className="px-3.5 py-2 bg-white/[0.08] hover:bg-white/[0.15] rounded-lg text-[11px] text-white/70 hover:text-white cursor-pointer transition-all"
                    >
                      Save
                    </button>
                  </div>
                  <div className="text-white/15 text-[10px] mt-3">
                    <p>ACE-Step local server:</p>
                    <code className="block mt-1 text-white/25 bg-white/[0.03] px-2.5 py-1.5 rounded-md font-mono">
                      python ace-step-server.py
                    </code>
                  </div>
                </div>
              </section>

              {/* --- Reset --- */}
              <section>
                <SectionHeader>Danger Zone</SectionHeader>
                <button
                  onClick={resetDefaults}
                  className="px-3.5 py-2 text-[10px] text-red-400/60 hover:text-red-400 border border-red-400/10 hover:border-red-400/30 rounded-lg cursor-pointer transition-all uppercase tracking-wider"
                >
                  Reset All to Defaults
                </button>
              </section>
            </div>
          )}

        </div>

        {/* Footer */}
        <div className="h-px bg-white/[0.06]" />
        <div className="flex justify-end px-6 py-3">
          <button
            onClick={onClose}
            className="px-5 py-2 bg-white/[0.08] hover:bg-white/[0.15] rounded-lg text-[11px] text-white/70 hover:text-white cursor-pointer transition-all font-medium"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  )
}
