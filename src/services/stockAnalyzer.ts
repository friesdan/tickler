import { clamp, mapRange } from '../utils/math'
import type { MusicParameters, StockState } from '../types'
import { useSettingsStore } from '../stores/settingsStore'

const HISTORY_SIZE = 1000

// ---------------------------------------------------------------------------
// Technical indicator helpers
// ---------------------------------------------------------------------------

/** Compute a single EMA value for the latest point in the series */
export function computeEMA(values: number[], period: number): number {
  if (values.length === 0) return 0
  if (values.length === 1) return values[0]
  const k = 2 / (period + 1)
  let ema = values[0]
  for (let i = 1; i < values.length; i++) {
    ema = values[i] * k + ema * (1 - k)
  }
  return ema
}

/** Wilder's smoothed RSI (0–100) */
export function computeRSI(history: number[], period = 140): number {
  if (history.length < period + 1) return 50 // neutral default
  const gains: number[] = []
  const losses: number[] = []
  for (let i = 1; i < history.length; i++) {
    const diff = history[i] - history[i - 1]
    gains.push(diff > 0 ? diff : 0)
    losses.push(diff < 0 ? -diff : 0)
  }
  // Wilder's smoothed averages
  let avgGain = gains.slice(0, period).reduce((a, b) => a + b, 0) / period
  let avgLoss = losses.slice(0, period).reduce((a, b) => a + b, 0) / period
  for (let i = period; i < gains.length; i++) {
    avgGain = (avgGain * (period - 1) + gains[i]) / period
    avgLoss = (avgLoss * (period - 1) + losses[i]) / period
  }
  if (avgLoss === 0) return 100
  const rs = avgGain / avgLoss
  return 100 - 100 / (1 + rs)
}

/** MACD: EMA(120) − EMA(260), signal = EMA(90) of MACD series */
export function computeMACD(history: number[]): { macd: number; signal: number; histogram: number } {
  if (history.length < 260) return { macd: 0, signal: 0, histogram: 0 }
  // Build MACD line series for signal EMA
  const k12 = 2 / (120 + 1)
  const k26 = 2 / (260 + 1)
  let ema12 = history[0]
  let ema26 = history[0]
  const macdSeries: number[] = []
  for (let i = 1; i < history.length; i++) {
    ema12 = history[i] * k12 + ema12 * (1 - k12)
    ema26 = history[i] * k26 + ema26 * (1 - k26)
    macdSeries.push(ema12 - ema26)
  }
  // Signal line: EMA(90) of MACD series
  const signal = computeEMA(macdSeries, 90)
  const macd = macdSeries[macdSeries.length - 1]
  return { macd, signal, histogram: macd - signal }
}

/** ADX (0–100): trend strength regardless of direction */
export function computeADX(history: number[], period = 140): number {
  if (history.length < period + 1) return 20 // default low trend
  // Compute +DM, -DM, and TR from price series (using price as proxy for H/L/C)
  const plusDM: number[] = []
  const minusDM: number[] = []
  const tr: number[] = []
  for (let i = 1; i < history.length; i++) {
    const diff = history[i] - history[i - 1]
    // Approximate directional movement from price changes
    plusDM.push(diff > 0 ? diff : 0)
    minusDM.push(diff < 0 ? -diff : 0)
    tr.push(Math.abs(diff)) // True range simplified for single-price series
  }
  // Wilder's smoothing for +DM, -DM, TR
  let smoothPlusDM = plusDM.slice(0, period).reduce((a, b) => a + b, 0)
  let smoothMinusDM = minusDM.slice(0, period).reduce((a, b) => a + b, 0)
  let smoothTR = tr.slice(0, period).reduce((a, b) => a + b, 0)
  const dxValues: number[] = []
  for (let i = period; i < plusDM.length; i++) {
    smoothPlusDM = smoothPlusDM - smoothPlusDM / period + plusDM[i]
    smoothMinusDM = smoothMinusDM - smoothMinusDM / period + minusDM[i]
    smoothTR = smoothTR - smoothTR / period + tr[i]
    if (smoothTR === 0) { dxValues.push(0); continue }
    const plusDI = smoothPlusDM / smoothTR
    const minusDI = smoothMinusDM / smoothTR
    const diSum = plusDI + minusDI
    if (diSum === 0) { dxValues.push(0); continue }
    dxValues.push(Math.abs(plusDI - minusDI) / diSum * 100)
  }
  if (dxValues.length === 0) return 20
  // ADX = Wilder's smoothed DX
  let adx = dxValues.slice(0, period).reduce((a, b) => a + b, 0) / Math.min(period, dxValues.length)
  for (let i = period; i < dxValues.length; i++) {
    adx = (adx * (period - 1) + dxValues[i]) / period
  }
  return clamp(adx, 0, 100)
}

/** Average True Range, returned raw (normalized to 0–1 by caller) */
export function computeATR(history: number[], period = 140): number {
  if (history.length < period + 1) return 0
  const trValues: number[] = []
  for (let i = 1; i < history.length; i++) {
    trValues.push(Math.abs(history[i] - history[i - 1]))
  }
  // Wilder's smoothed ATR
  let atr = trValues.slice(0, period).reduce((a, b) => a + b, 0) / period
  for (let i = period; i < trValues.length; i++) {
    atr = (atr * (period - 1) + trValues[i]) / period
  }
  return atr
}

/** EMA crossover: normalized distance between short and long EMA (−1 to 1) */
export function computeEMACrossover(history: number[], short = 200, long = 500): number {
  if (history.length < long) {
    // Not enough data — use what we have with shorter windows
    if (history.length < 20) return 0
    const shortEma = computeEMA(history, Math.min(short, history.length))
    const longEma = computeEMA(history, Math.min(long, history.length))
    const price = history[history.length - 1]
    if (price === 0) return 0
    return clamp((shortEma - longEma) / price * 100, -1, 1)
  }
  const shortEma = computeEMA(history, short)
  const longEma = computeEMA(history, long)
  const price = history[history.length - 1]
  if (price === 0) return 0
  // Normalize: diff as % of price, scaled so ~1% diff → ±1
  return clamp((shortEma - longEma) / price * 100, -1, 1)
}

// ---------------------------------------------------------------------------
// Main analysis — maps indicators to music parameters
// ---------------------------------------------------------------------------

export function analyzeStock(state: StockState): MusicParameters {
  const { history, rsi, macdHistogram, adx, atr, macroTrend } = state
  const r = useSettingsStore.getState().routings

  // Normalized ATR: map raw ATR relative to current price
  const atrNorm = atr // already 0-1 from store

  // Normalized ADX: 0-100 → 0-1
  const adxNorm = clamp(adx / 100, 0, 1)

  // Tempo: ATR-driven (high ATR → fast, low → slow). 70-180 BPM
  const tempo = r.atrToTempo
    ? clamp(mapRange(atrNorm, 0, 1, 70, 180), 60, 200)
    : 120

  // Brightness: RSI mapped from 0–100 to 0–1
  const brightness = r.rsiToBrightness
    ? clamp(mapRange(rsi, 0, 100, 0, 1), 0, 1)
    : 0.5

  // Density: ADX-driven. High trend strength = dense patterns
  const density = r.adxToHats
    ? clamp(adxNorm, 0.1, 0.95)
    : 0.5

  // Energy: ATR × 0.6 + ADX × 0.4 (neutral if both off)
  const atrComponent = r.atrToTempo ? atrNorm : 0.5
  const adxComponent = (r.adxToDrums || r.adxToHats) ? adxNorm : 0.5
  const energy = clamp(atrComponent * 0.6 + adxComponent * 0.4, 0.1, 1)

  // Mood: multi-indicator decision tree
  let mood: MusicParameters['mood'] = 'neutral'
  if (r.emaToMoodKey) {
    if (macroTrend > 0.2 && rsi > 55) mood = 'euphoric'
    else if (macroTrend > 0 && macdHistogram > 0) mood = 'calm'
    else if (macroTrend < -0.2 && macdHistogram < 0) mood = 'tense'
    else if (macroTrend < 0 && rsi < 45) mood = 'dark'
  }

  // Key: macro trend driven
  const key = r.emaToMoodKey
    ? (macroTrend > 0.2 ? 'C major' : macroTrend < -0.2 ? 'A minor' : 'D dorian')
    : 'D dorian'

  return { tempo, brightness, density, mood, energy, key }
}

export function computeVolatility(history: number[]): number {
  if (history.length < 10) return 0.3
  const recent = history.slice(-20)
  const returns = recent.slice(1).map((p, i) => (p - recent[i]) / recent[i])
  const mean = returns.reduce((a, b) => a + b, 0) / returns.length
  const variance = returns.reduce((a, r) => a + (r - mean) ** 2, 0) / returns.length
  const stddev = Math.sqrt(variance)
  // Normalize: typical stock stddev per tick ~0.001-0.01
  return clamp(mapRange(stddev, 0.0005, 0.008, 0, 1), 0, 1)
}

export function computeMomentum(history: number[]): number {
  if (history.length < 5) return 0
  const lookback = Math.min(20, history.length)
  const recent = history.slice(-lookback)
  const start = recent[0]
  const end = recent[recent.length - 1]
  const pctChange = (end - start) / start
  return clamp(pctChange * 50, -1, 1) // scale so ±2% → ±1
}

export function detectTrend(history: number[]): 'bullish' | 'bearish' | 'neutral' {
  if (history.length < 10) return 'neutral'
  const recent = history.slice(-30)
  const mid = Math.floor(recent.length / 2)
  const firstHalf = recent.slice(0, mid).reduce((a, b) => a + b, 0) / mid
  const secondHalf = recent.slice(mid).reduce((a, b) => a + b, 0) / (recent.length - mid)
  const diff = (secondHalf - firstHalf) / firstHalf
  if (diff > 0.002) return 'bullish'
  if (diff < -0.002) return 'bearish'
  return 'neutral'
}

export { HISTORY_SIZE }
