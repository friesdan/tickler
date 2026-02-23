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
      rsiToBrightness: false,
      rsiToChordTension: false,
      macdToProgression: false,
      adxToDrums: false,
      adxToHats: false,
      atrToTempo: true,
      atrToSpace: false,
      emaToPad: true,
      emaToMoodKey: true,
      volToBassFilter: false,
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
// Toggle switch component
// ---------------------------------------------------------------------------

function Toggle({ on, onToggle }: { on: boolean; onToggle: () => void }) {
  return (
    <button
      onClick={onToggle}
      className={`relative w-9 h-5 rounded-full transition-colors cursor-pointer flex-shrink-0 ${
        on ? 'bg-white/30' : 'bg-white/10'
      }`}
    >
      <span
        className={`absolute top-0.5 left-0.5 w-4 h-4 rounded-full transition-transform ${
          on ? 'translate-x-4 bg-white' : 'translate-x-0 bg-white/40'
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
    sentiment === 'bullish' ? 'bg-emerald-400' :
    sentiment === 'bearish' ? 'bg-red-400' :
    'bg-yellow-400'
  return <span className={`inline-block w-2 h-2 rounded-full ${color} mr-2 flex-shrink-0`} />
}

// ---------------------------------------------------------------------------
// Indicator period slider groups
// ---------------------------------------------------------------------------

const PERIOD_GROUPS: { label: string; keys: (keyof IndicatorPeriods)[] }[] = [
  { label: 'Trend (EMA Crossover)', keys: ['emaShort', 'emaLong'] },
  { label: 'MACD', keys: ['macdFast', 'macdSlow', 'macdSignal'] },
  { label: 'Momentum & Volatility', keys: ['rsi', 'adx', 'atr'] },
]

// ---------------------------------------------------------------------------
// Main panel
// ---------------------------------------------------------------------------

export function SettingsPanel({ isOpen, onClose, onSaveApiKey }: SettingsPanelProps) {
  const [apiKey, setApiKey] = useState(() => localStorage.getItem('lyria-api-key') ?? '')
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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="glass p-6 w-[520px] max-h-[85vh] flex flex-col">
        {/* Header */}
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-white font-bold text-lg">Settings</h2>
          <button onClick={onClose} className="text-white/40 hover:text-white cursor-pointer">
            ✕
          </button>
        </div>

        {/* Scrollable content */}
        <div className="overflow-y-auto flex-1 space-y-5 pr-1 -mr-1">

          {/* --- API Keys --- */}
          <section>
            <h3 className="text-white/60 text-xs uppercase tracking-wider mb-2">API Keys</h3>
            <div>
              <label className="block text-white/40 text-xs mb-1">
                Google AI API Key (for Lyria RealTime)
              </label>
              <div className="flex gap-2">
                <input
                  type="password"
                  value={apiKey}
                  onChange={(e) => setApiKey(e.target.value)}
                  placeholder="AIza..."
                  className="flex-1 bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-white text-sm outline-none focus:border-white/30 transition-colors"
                />
                <button
                  onClick={() => {
                    localStorage.setItem('lyria-api-key', apiKey)
                    onSaveApiKey(apiKey)
                  }}
                  className="px-3 py-2 bg-white/10 hover:bg-white/20 rounded-lg text-sm text-white cursor-pointer transition-colors"
                >
                  Save
                </button>
              </div>
              <div className="text-white/20 text-xs mt-2">
                <p>ACE-Step: Start the local server with:</p>
                <code className="block mt-1 text-white/30 bg-white/5 px-2 py-1 rounded">
                  python ace-step-server.py
                </code>
              </div>
            </div>
          </section>

          <hr className="border-white/10" />

          {/* --- Presets --- */}
          <section>
            <h3 className="text-white/60 text-xs uppercase tracking-wider mb-2">Presets</h3>
            <div className="flex gap-2 flex-wrap">
              {Object.entries(PRESETS).map(([key, preset]) => (
                <button
                  key={key}
                  onClick={() => applyPreset(key)}
                  className="px-3 py-1.5 bg-white/5 hover:bg-white/15 border border-white/10 rounded-lg text-xs text-white cursor-pointer transition-colors"
                  title={preset.description}
                >
                  {preset.label}
                </button>
              ))}
            </div>
          </section>

          <hr className="border-white/10" />

          {/* --- Style --- */}
          <section>
            <h3 className="text-white/60 text-xs uppercase tracking-wider mb-2">Style</h3>
            <div className="flex flex-col gap-1.5">
              {MUSIC_STYLES.map((s) => {
                const cfg = getStyleConfig(s)
                const active = style === s
                return (
                  <button
                    key={s}
                    onClick={() => setStyle(s)}
                    className={`text-left px-3 py-2 border rounded-lg cursor-pointer transition-colors ${
                      active
                        ? 'bg-white/15 border-white/30'
                        : 'bg-white/5 hover:bg-white/10 border-white/10'
                    }`}
                  >
                    <span className={`text-sm font-medium ${active ? 'text-white' : 'text-white/80'}`}>
                      {cfg.name}
                    </span>
                    <span className="block text-xs text-white/40 mt-0.5">{cfg.description}</span>
                  </button>
                )
              })}
            </div>
          </section>

          <hr className="border-white/10" />

          {/* --- Mixer --- */}
          <section>
            <div className="flex justify-between items-center mb-2">
              <h3 className="text-white/60 text-xs uppercase tracking-wider">Mixer</h3>
              <button
                onClick={resetMixer}
                className="text-white/30 hover:text-white/60 text-xs cursor-pointer transition-colors"
              >
                Reset
              </button>
            </div>
            <div className="flex gap-3 justify-between">
              {(Object.keys(MIXER_LABELS) as (keyof MixerVolumes)[]).map((key) => (
                <div key={key} className="flex flex-col items-center gap-1.5 flex-1">
                  <span className="text-white/60 text-[10px] font-medium">
                    {Math.round(mixer[key] * 100)}
                  </span>
                  <input
                    type="range"
                    min={0}
                    max={1.5}
                    step={0.05}
                    value={mixer[key]}
                    onChange={(e) => setMixerVolume(key, parseFloat(e.target.value))}
                    className="w-full accent-white/60 cursor-pointer"
                    style={{
                      writingMode: 'vertical-lr' as any,
                      direction: 'rtl',
                      height: '80px',
                      width: '20px',
                    }}
                  />
                  <span className="text-white/40 text-[10px]">{MIXER_LABELS[key]}</span>
                </div>
              ))}
            </div>
          </section>

          <hr className="border-white/10" />

          {/* --- Signal Routing --- */}
          <section>
            <h3 className="text-white/60 text-xs uppercase tracking-wider mb-2">Signal Routing</h3>
            <div className="space-y-1">
              {(Object.keys(ROUTING_LABELS) as RoutingKey[]).map((key) => {
                const { indicator, effect } = ROUTING_LABELS[key]
                return (
                  <div key={key} className="flex items-center justify-between py-1.5">
                    <span className="text-white/70 text-sm">
                      <span className="text-white/40">{indicator}</span>
                      {' → '}
                      {effect}
                    </span>
                    <Toggle on={routings[key]} onToggle={() => toggleRouting(key)} />
                  </div>
                )
              })}
            </div>
          </section>

          <hr className="border-white/10" />

          {/* --- Indicator Periods --- */}
          <section>
            <div className="flex justify-between items-center mb-2">
              <h3 className="text-white/60 text-xs uppercase tracking-wider">Indicator Windows</h3>
              <button
                onClick={resetPeriods}
                className="text-white/30 hover:text-white/60 text-xs cursor-pointer transition-colors"
              >
                Reset
              </button>
            </div>
            <p className="text-white/25 text-xs mb-3">
              Shorter windows react faster to price changes · Longer windows smooth out noise
            </p>
            <div className="space-y-4">
              {PERIOD_GROUPS.map((group) => (
                <div key={group.label}>
                  <span className="text-white/35 text-[10px] uppercase tracking-wider">{group.label}</span>
                  <div className="space-y-2 mt-1.5">
                    {group.keys.map((key) => {
                      const [min, max] = PERIOD_RANGES[key]
                      const timeStr = ticksToTime(periods[key])
                      return (
                        <div key={key} className="flex items-center gap-3">
                          <span className="text-white/50 text-xs w-20 flex-shrink-0">{PERIOD_LABELS[key]}</span>
                          <input
                            type="range"
                            min={min}
                            max={max}
                            step={1}
                            value={periods[key]}
                            onChange={(e) => setPeriod(key, parseInt(e.target.value))}
                            className="flex-1 accent-white/60 cursor-pointer"
                          />
                          <span className="text-white/60 text-xs w-10 text-right font-medium">{timeStr}</span>
                        </div>
                      )
                    })}
                  </div>
                </div>
              ))}
            </div>
          </section>

          <hr className="border-white/10" />

          {/* --- Stinger Sounds --- */}
          <section>
            <h3 className="text-white/60 text-xs uppercase tracking-wider mb-2">Stinger Sounds</h3>
            <div className="space-y-1">
              {(Object.keys(STINGER_LABELS) as CandlePatternType[]).map((pattern) => {
                const { label, sentiment } = STINGER_LABELS[pattern]
                return (
                  <div key={pattern} className="flex items-center justify-between py-1.5">
                    <span className="text-white/70 text-sm flex items-center">
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
              <span className="text-white/40 text-xs w-20">Volume</span>
              <input
                type="range"
                min={0}
                max={1}
                step={0.05}
                value={stingerVolume}
                onChange={(e) => setStingerVolume(parseFloat(e.target.value))}
                className="flex-1 accent-white/60 cursor-pointer"
              />
              <span className="text-white/40 text-xs w-10 text-right">
                {Math.round(stingerVolume * 100)}%
              </span>
            </div>
          </section>

          <hr className="border-white/10" />

          {/* --- Reset --- */}
          <div className="flex justify-between items-center">
            <button
              onClick={resetDefaults}
              className="px-3 py-1.5 text-xs text-white/40 hover:text-white border border-white/10 hover:border-white/20 rounded-lg cursor-pointer transition-colors"
            >
              Reset to Defaults
            </button>
            <button
              onClick={onClose}
              className="px-4 py-2 bg-white/10 hover:bg-white/20 rounded-lg text-sm text-white cursor-pointer transition-colors"
            >
              Done
            </button>
          </div>

        </div>
      </div>
    </div>
  )
}
