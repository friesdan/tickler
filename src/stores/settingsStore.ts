import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { CandlePatternType } from '../types'
import type { MusicStyle } from '../services/styleConfigs'

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
// Store
// ---------------------------------------------------------------------------

interface SettingsState {
  routings: SignalRoutings
  stingers: Record<CandlePatternType, boolean>
  stingerVolume: number // 0–1
  style: MusicStyle
  periods: IndicatorPeriods
  mixer: MixerVolumes

  toggleRouting: (key: RoutingKey) => void
  toggleStinger: (pattern: CandlePatternType) => void
  setStingerVolume: (v: number) => void
  setStyle: (style: MusicStyle) => void
  setPeriod: (key: keyof IndicatorPeriods, value: number) => void
  resetPeriods: () => void
  setMixerVolume: (key: keyof MixerVolumes, value: number) => void
  resetMixer: () => void
  resetDefaults: () => void
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

const DEFAULT_STINGERS: Record<CandlePatternType, boolean> = {
  doji: true,
  hammer: true,
  shootingStar: true,
  bullishEngulfing: true,
  bearishEngulfing: true,
  morningStar: true,
  eveningStar: true,
}

const DEFAULT_STINGER_VOLUME = 0.8
const DEFAULT_STYLE: MusicStyle = 'techno'

export const useSettingsStore = create<SettingsState>()(
  persist(
    (set) => ({
      routings: { ...DEFAULT_ROUTINGS },
      stingers: { ...DEFAULT_STINGERS },
      stingerVolume: DEFAULT_STINGER_VOLUME,
      style: DEFAULT_STYLE,
      periods: { ...DEFAULT_PERIODS },
      mixer: { ...DEFAULT_MIXER },

      toggleRouting: (key) =>
        set((s) => ({ routings: { ...s.routings, [key]: !s.routings[key] } })),

      toggleStinger: (pattern) =>
        set((s) => ({ stingers: { ...s.stingers, [pattern]: !s.stingers[pattern] } })),

      setStingerVolume: (v) => set({ stingerVolume: v }),

      setStyle: (style) => set({ style }),

      setPeriod: (key, value) =>
        set((s) => ({ periods: { ...s.periods, [key]: value } })),

      resetPeriods: () => set({ periods: { ...DEFAULT_PERIODS } }),

      setMixerVolume: (key, value) =>
        set((s) => ({ mixer: { ...s.mixer, [key]: value } })),

      resetMixer: () => set({ mixer: { ...DEFAULT_MIXER } }),

      resetDefaults: () =>
        set({
          routings: { ...DEFAULT_ROUTINGS },
          stingers: { ...DEFAULT_STINGERS },
          stingerVolume: DEFAULT_STINGER_VOLUME,
          style: DEFAULT_STYLE,
          periods: { ...DEFAULT_PERIODS },
          mixer: { ...DEFAULT_MIXER },
        }),
    }),
    { name: 'music-ticker-settings' },
  ),
)
