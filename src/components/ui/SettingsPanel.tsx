import { useState } from 'react'
import {
  useSettingsStore,
  ROUTING_LABELS,
  STINGER_LABELS,
  type RoutingKey,
} from '../../stores/settingsStore'
import { MUSIC_STYLES, type MusicStyle } from '../../services/styleConfigs'
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
    description: '9/21 EMA + price action — short-term NQ/QQQ scalper',
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
// Style label map
// ---------------------------------------------------------------------------

const STYLE_LABELS: Record<MusicStyle, string> = {
  techno: 'Techno',
  jazz: 'Jazz',
  ambient: 'Ambient',
  lofi: 'Lo-fi',
  pop: 'Pop',
  country: 'Country',
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
// Main panel
// ---------------------------------------------------------------------------

export function SettingsPanel({ isOpen, onClose, onSaveApiKey }: SettingsPanelProps) {
  const [apiKey, setApiKey] = useState(() => localStorage.getItem('lyria-api-key') ?? '')
  const {
    routings, stingers, stingerVolume, style,
    toggleRouting, toggleStinger, setStingerVolume, setStyle, resetDefaults,
  } = useSettingsStore()

  if (!isOpen) return null

  const applyPreset = (key: string) => {
    const preset = PRESETS[key]
    if (!preset) return
    const store = useSettingsStore.getState()
    // Set all routings from preset (missing keys stay as-is)
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
      <div className="glass p-6 w-[480px] max-h-[85vh] flex flex-col">
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
            <div className="flex gap-2 flex-wrap">
              {MUSIC_STYLES.map((s) => (
                <button
                  key={s}
                  onClick={() => setStyle(s)}
                  className={`px-3 py-1.5 border rounded-lg text-xs text-white cursor-pointer transition-colors ${
                    style === s
                      ? 'bg-white/20 border-white/30'
                      : 'bg-white/5 hover:bg-white/15 border-white/10'
                  }`}
                >
                  {STYLE_LABELS[s]}
                </button>
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
              <span className="text-white/40 text-xs w-8 text-right">
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
