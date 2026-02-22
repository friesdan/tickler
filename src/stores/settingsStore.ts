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
// Store
// ---------------------------------------------------------------------------

interface SettingsState {
  routings: SignalRoutings
  stingers: Record<CandlePatternType, boolean>
  stingerVolume: number // 0–1
  style: MusicStyle

  toggleRouting: (key: RoutingKey) => void
  toggleStinger: (pattern: CandlePatternType) => void
  setStingerVolume: (v: number) => void
  setStyle: (style: MusicStyle) => void
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

      toggleRouting: (key) =>
        set((s) => ({ routings: { ...s.routings, [key]: !s.routings[key] } })),

      toggleStinger: (pattern) =>
        set((s) => ({ stingers: { ...s.stingers, [pattern]: !s.stingers[pattern] } })),

      setStingerVolume: (v) => set({ stingerVolume: v }),

      setStyle: (style) => set({ style }),

      resetDefaults: () =>
        set({
          routings: { ...DEFAULT_ROUTINGS },
          stingers: { ...DEFAULT_STINGERS },
          stingerVolume: DEFAULT_STINGER_VOLUME,
          style: DEFAULT_STYLE,
        }),
    }),
    { name: 'music-ticker-settings' },
  ),
)
