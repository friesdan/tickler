import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { CandlePatternType, DataProvider } from '../types'
import type { MusicStyle } from '../services/styleConfigs'
import type { StingerAssignment } from '../services/stingerSounds'

// ---------------------------------------------------------------------------
// Signal routing keys — each maps one indicator to one music effect
// ---------------------------------------------------------------------------

export interface SignalRoutings {
  rsiToBrightness: boolean    // RSI → Filter Brightness (cutoff 200–6000 Hz)
  rsiToChordTension: boolean  // RSI → Chord Tension (sus voicings at extremes)
  macdToProgression: boolean  // MACD → Chord Progression (ascending vs descending)
  adxToDrums: boolean         // ADX → Kick & Bass (drum pattern complexity)
  adxToHats: boolean          // ADX → Hi-Hat Density (hat pattern complexity)
  atrToTempo: boolean         // ATR → Tempo (BPM 70–180)
  atrToSpace: boolean         // ATR → Reverb & Delay (wet amount, feedback)
  emaToPad: boolean           // EMA → Pad Character (sine/triangle/square)
  emaToMoodKey: boolean       // EMA → Mood & Key (scale/mood selection)
  volToBassFilter: boolean    // Volatility → Bass Filter (envelope sweep 2–8 oct)
}

export type RoutingKey = keyof SignalRoutings

export const ROUTING_LABELS: Record<RoutingKey, { indicator: string; effect: string }> = {
  rsiToBrightness:   { indicator: 'RSI', effect: 'Filter Brightness' },
  rsiToChordTension: { indicator: 'RSI', effect: 'Chord Tension' },
  macdToProgression: { indicator: 'MACD', effect: 'Chord Progression' },
  adxToDrums:        { indicator: 'ADX', effect: 'Kick & Bass' },
  adxToHats:         { indicator: 'ADX', effect: 'Hi-Hat Density' },
  atrToTempo:        { indicator: 'ATR', effect: 'Tempo' },
  atrToSpace:        { indicator: 'ATR', effect: 'Reverb & Delay' },
  emaToPad:          { indicator: 'EMA', effect: 'Pad Character' },
  emaToMoodKey:      { indicator: 'EMA', effect: 'Mood & Key' },
  volToBassFilter:   { indicator: 'Volatility', effect: 'Bass Filter' },
}

export const STINGER_LABELS: Record<CandlePatternType, { label: string; sentiment: 'bullish' | 'bearish' | 'neutral' }> = {
  doji:             { label: 'Doji', sentiment: 'neutral' },
  hammer:           { label: 'Hammer', sentiment: 'bullish' },
  shootingStar:     { label: 'Shooting Star', sentiment: 'bearish' },
  bullishEngulfing: { label: 'Bullish Engulfing', sentiment: 'bullish' },
  bearishEngulfing: { label: 'Bearish Engulfing', sentiment: 'bearish' },
  morningStar:      { label: 'Morning Star', sentiment: 'bullish' },
  eveningStar:      { label: 'Evening Star', sentiment: 'bearish' },
}

// ---------------------------------------------------------------------------
// Indicator periods
// ---------------------------------------------------------------------------

export interface IndicatorPeriods {
  rsi: number          // default 140, range 20–300
  macdFast: number     // default 120, range 20–200
  macdSlow: number     // default 260, range 50–500
  macdSignal: number   // default 90, range 20–200
  adx: number          // default 140, range 20–300
  atr: number          // default 140, range 20–300
  emaShort: number     // default 200, range 20–400
  emaLong: number      // default 500, range 100–1000
}

export const DEFAULT_PERIODS: IndicatorPeriods = {
  rsi: 140,
  macdFast: 120,
  macdSlow: 260,
  macdSignal: 90,
  adx: 140,
  atr: 140,
  emaShort: 200,
  emaLong: 500,
}

export const PERIOD_RANGES: Record<keyof IndicatorPeriods, [number, number]> = {
  rsi: [20, 300],
  macdFast: [20, 200],
  macdSlow: [50, 500],
  macdSignal: [20, 200],
  adx: [20, 300],
  atr: [20, 300],
  emaShort: [20, 400],
  emaLong: [100, 1000],
}

export const PERIOD_LABELS: Record<keyof IndicatorPeriods, string> = {
  rsi: 'RSI',
  macdFast: 'MACD Fast',
  macdSlow: 'MACD Slow',
  macdSignal: 'MACD Signal',
  adx: 'ADX',
  atr: 'ATR',
  emaShort: 'EMA Short',
  emaLong: 'EMA Long',
}

/** Simulator runs at 10 ticks/sec — convert tick count to human-readable duration */
export function ticksToTime(ticks: number): string {
  const seconds = ticks / 10
  if (seconds < 60) return `${Math.round(seconds)}s`
  const mins = Math.floor(seconds / 60)
  const secs = Math.round(seconds % 60)
  return secs > 0 ? `${mins}m ${secs}s` : `${mins}m`
}

// ---------------------------------------------------------------------------
// Mixer volumes — per-instrument faders (0 = muted, 1 = default)
// ---------------------------------------------------------------------------

export interface MixerVolumes {
  kick: number
  snare: number
  hats: number
  bass: number
  keys: number
}

export const DEFAULT_MIXER: MixerVolumes = {
  kick: 1,
  snare: 1,
  hats: 1,
  bass: 1,
  keys: 1,
}

export const MIXER_LABELS: Record<keyof MixerVolumes, string> = {
  kick: 'Kick',
  snare: 'Snare',
  hats: 'Hats / Ride',
  bass: 'Bass',
  keys: 'Keys',
}

// ---------------------------------------------------------------------------
// Custom presets
// ---------------------------------------------------------------------------

export interface CustomPreset {
  name: string
  routings: SignalRoutings
  style: MusicStyle
  periods: IndicatorPeriods
  mixer: MixerVolumes
  stingerAssignments: Record<CandlePatternType, StingerAssignment>
  stingerVolume: number
}

// ---------------------------------------------------------------------------
// Store
// ---------------------------------------------------------------------------

interface SettingsState {
  routings: SignalRoutings
  stingerAssignments: Record<CandlePatternType, StingerAssignment>
  stingerVolume: number // 0–1
  style: MusicStyle
  periods: IndicatorPeriods
  mixer: MixerVolumes
  customPresets: CustomPreset[]

  // Market data provider
  dataProvider: DataProvider
  finnhubKey: string
  alphaVantageKey: string
  polygonKey: string
  ibkrGatewayUrl: string
  favoriteTickers: string[]

  toggleRouting: (key: RoutingKey) => void
  setStingerAssignment: (pattern: CandlePatternType, sound: StingerAssignment) => void
  setStingerVolume: (v: number) => void
  setStyle: (style: MusicStyle) => void
  setPeriod: (key: keyof IndicatorPeriods, value: number) => void
  resetPeriods: () => void
  setMixerVolume: (key: keyof MixerVolumes, value: number) => void
  resetMixer: () => void
  resetDefaults: () => void
  savePreset: (name: string) => void
  loadPreset: (name: string) => void
  deletePreset: (name: string) => void
  setDataProvider: (provider: DataProvider) => void
  setFinnhubKey: (key: string) => void
  setAlphaVantageKey: (key: string) => void
  setPolygonKey: (key: string) => void
  setIbkrGatewayUrl: (url: string) => void
  addFavorite: (symbol: string) => void
  removeFavorite: (symbol: string) => void
}

const DEFAULT_ROUTINGS: SignalRoutings = {
  rsiToBrightness: true,
  rsiToChordTension: true,
  macdToProgression: true,
  adxToDrums: true,
  adxToHats: true,
  atrToTempo: true,
  atrToSpace: true,
  emaToPad: true,
  emaToMoodKey: true,
  volToBassFilter: true,
}

const DEFAULT_STINGER_ASSIGNMENTS: Record<CandlePatternType, StingerAssignment> = {
  doji: 'crystalPing',
  hammer: 'risingPluck',
  shootingStar: 'fallingZap',
  bullishEngulfing: 'powerChord',
  bearishEngulfing: 'darkChord',
  morningStar: 'hopeFanfare',
  eveningStar: 'doomDescent',
}

const DEFAULT_STINGER_VOLUME = 0.8
const DEFAULT_STYLE: MusicStyle = 'techno'

// v1→v2 migration map: old boolean stingers → sound IDs
const V1_STINGER_MAP: Record<CandlePatternType, StingerAssignment> = {
  doji: 'crystalPing',
  hammer: 'risingPluck',
  shootingStar: 'fallingZap',
  bullishEngulfing: 'powerChord',
  bearishEngulfing: 'darkChord',
  morningStar: 'hopeFanfare',
  eveningStar: 'doomDescent',
}

export const useSettingsStore = create<SettingsState>()(
  persist(
    (set) => ({
      routings: { ...DEFAULT_ROUTINGS },
      stingerAssignments: { ...DEFAULT_STINGER_ASSIGNMENTS },
      stingerVolume: DEFAULT_STINGER_VOLUME,
      style: DEFAULT_STYLE,
      periods: { ...DEFAULT_PERIODS },
      mixer: { ...DEFAULT_MIXER },
      customPresets: [],

      dataProvider: 'simulator' as DataProvider,
      finnhubKey: '',
      alphaVantageKey: '',
      polygonKey: '',
      ibkrGatewayUrl: '',
      favoriteTickers: ['AAPL', 'TSLA', 'NVDA', 'SPY', 'QQQ'],

      toggleRouting: (key) =>
        set((s) => ({ routings: { ...s.routings, [key]: !s.routings[key] } })),

      setStingerAssignment: (pattern, sound) =>
        set((s) => ({ stingerAssignments: { ...s.stingerAssignments, [pattern]: sound } })),

      setStingerVolume: (v) => set({ stingerVolume: Math.max(0, Math.min(1, v)) }),

      setStyle: (style) => set({ style }),

      setPeriod: (key, value) => {
        const range = PERIOD_RANGES[key]
        const clamped = Math.max(range[0], Math.min(range[1], Math.round(value)))
        set((s) => ({ periods: { ...s.periods, [key]: clamped } }))
      },

      resetPeriods: () => set({ periods: { ...DEFAULT_PERIODS } }),

      setMixerVolume: (key, value) =>
        set((s) => ({ mixer: { ...s.mixer, [key]: Math.max(0, Math.min(1, value)) } })),

      resetMixer: () => set({ mixer: { ...DEFAULT_MIXER } }),

      setDataProvider: (provider) => set({ dataProvider: provider }),
      setFinnhubKey: (key) => set({ finnhubKey: key }),
      setAlphaVantageKey: (key) => set({ alphaVantageKey: key }),
      setPolygonKey: (key) => set({ polygonKey: key }),
      setIbkrGatewayUrl: (url) => set({ ibkrGatewayUrl: url }),
      addFavorite: (symbol) =>
        set((s) => {
          if (s.favoriteTickers.includes(symbol)) return {}
          return { favoriteTickers: [...s.favoriteTickers, symbol] }
        }),
      removeFavorite: (symbol) =>
        set((s) => ({
          favoriteTickers: s.favoriteTickers.filter((t) => t !== symbol),
        })),

      resetDefaults: () =>
        set((s) => ({
          routings: { ...DEFAULT_ROUTINGS },
          stingerAssignments: { ...DEFAULT_STINGER_ASSIGNMENTS },
          stingerVolume: DEFAULT_STINGER_VOLUME,
          style: DEFAULT_STYLE,
          periods: { ...DEFAULT_PERIODS },
          mixer: { ...DEFAULT_MIXER },
          dataProvider: 'simulator' as DataProvider,
          favoriteTickers: ['AAPL', 'TSLA', 'NVDA', 'SPY', 'QQQ'],
          // Preserve API keys: finnhubKey, alphaVantageKey, polygonKey, ibkrGatewayUrl
        })),

      savePreset: (name) =>
        set((s) => {
          const preset: CustomPreset = {
            name,
            routings: { ...s.routings },
            style: s.style,
            periods: { ...s.periods },
            mixer: { ...s.mixer },
            stingerAssignments: { ...s.stingerAssignments },
            stingerVolume: s.stingerVolume,
          }
          const existing = s.customPresets.findIndex((p) => p.name === name)
          const updated = [...s.customPresets]
          if (existing >= 0) {
            updated[existing] = preset
          } else {
            updated.push(preset)
          }
          return { customPresets: updated }
        }),

      loadPreset: (name) =>
        set((s) => {
          const preset = s.customPresets.find((p) => p.name === name)
          if (!preset) return {}
          return {
            routings: { ...preset.routings },
            style: preset.style,
            periods: { ...preset.periods },
            mixer: { ...preset.mixer },
            stingerAssignments: { ...preset.stingerAssignments },
            stingerVolume: preset.stingerVolume,
          }
        }),

      deletePreset: (name) =>
        set((s) => ({
          customPresets: s.customPresets.filter((p) => p.name !== name),
        })),
    }),
    {
      name: 'music-ticker-settings',
      version: 4,
      migrate: (persisted: unknown, version: number) => {
        const state = persisted as Record<string, unknown>
        if (version < 2) {
          // Migrate v1 boolean stingers → v2 assignment map
          const oldStingers = state.stingers as Record<CandlePatternType, boolean> | undefined
          const assignments = { ...DEFAULT_STINGER_ASSIGNMENTS }
          if (oldStingers) {
            for (const [pattern, enabled] of Object.entries(oldStingers)) {
              assignments[pattern as CandlePatternType] = enabled
                ? V1_STINGER_MAP[pattern as CandlePatternType]
                : 'off'
            }
          }
          Object.assign(state, { stingerAssignments: assignments, stingers: undefined })
        }
        if (version < 3) {
          // v2 → v3: add market data provider fields
          if (!state.dataProvider) state.dataProvider = 'simulator'
          if (!state.finnhubKey) state.finnhubKey = ''
          if (!state.alphaVantageKey) state.alphaVantageKey = ''
          if (!state.polygonKey) state.polygonKey = ''
          if (!state.favoriteTickers) state.favoriteTickers = ['AAPL', 'TSLA', 'NVDA', 'SPY', 'QQQ']
        }
        if (version < 4) {
          // v3 → v4: add IBKR gateway URL
          state.ibkrGatewayUrl ??= ''
        }
        return state
      },
    },
  ),
)
