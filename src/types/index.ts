export interface StockTick {
  symbol: string
  price: number
  timestamp: number
  volume: number
}

export interface StockState {
  symbol: string
  price: number
  previousPrice: number
  open: number
  high: number
  low: number
  change: number
  changePercent: number
  volume: number
  history: number[]
  volatility: number
  momentum: number
  trend: 'bullish' | 'bearish' | 'neutral'
  rsi: number            // 0-100
  macdHistogram: number  // negative = bearish momentum, positive = bullish
  adx: number            // 0-100, trend strength regardless of direction
  atr: number            // 0-1 normalized
  macroTrend: number     // -1 to 1, slow-moving EMA crossover signal
}

export interface MusicParameters {
  tempo: number        // 60-200 BPM
  brightness: number   // 0-1
  density: number      // 0-1
  mood: 'euphoric' | 'tense' | 'calm' | 'dark' | 'neutral'
  energy: number       // 0-1
  key: string          // e.g. "C major", "A minor"
}

export interface AudioData {
  frequencyData: Float32Array
  waveformData: Float32Array
  bass: number         // 0-1 normalized
  mid: number          // 0-1 normalized
  treble: number       // 0-1 normalized
  rms: number          // 0-1 overall volume
}

export interface MusicEngine {
  start(): Promise<void>
  stop(): void
  updateParameters(params: MusicParameters): void
  getAudioNode(): AudioNode | null
  isPlaying(): boolean
}

// ---------------------------------------------------------------------------
// Candlestick pattern detection
// ---------------------------------------------------------------------------

export interface OHLCCandle {
  open: number
  high: number
  low: number
  close: number
  tickCount: number
  startIndex: number
}

export type CandlePatternType =
  | 'doji'
  | 'hammer'
  | 'shootingStar'
  | 'bullishEngulfing'
  | 'bearishEngulfing'
  | 'morningStar'
  | 'eveningStar'

export type PatternSentiment = 'bullish' | 'bearish' | 'neutral'

export interface DetectedPattern {
  type: CandlePatternType
  sentiment: PatternSentiment
  strength: number // 0-1
  timestamp: number
  candleIndex: number
}

export interface VisualizerUniforms {
  uTime: number
  uBass: number
  uMid: number
  uTreble: number
  uRms: number
  uSentiment: number    // -1 (bearish) to 1 (bullish)
  uVolatility: number   // 0-1
  uEnergy: number       // 0-1
  uMomentum: number     // -1 to 1
}
