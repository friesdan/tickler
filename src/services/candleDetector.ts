import type { OHLCCandle, DetectedPattern, CandlePatternType, PatternSentiment } from '../types'

/** Number of price ticks aggregated into one synthetic OHLC candle */
export const TICKS_PER_CANDLE = 50

// ---------------------------------------------------------------------------
// Candle helpers
// ---------------------------------------------------------------------------

function body(c: OHLCCandle): number {
  return Math.abs(c.close - c.open)
}

function range(c: OHLCCandle): number {
  return c.high - c.low
}

function upperWick(c: OHLCCandle): number {
  return c.high - Math.max(c.open, c.close)
}

function lowerWick(c: OHLCCandle): number {
  return Math.min(c.open, c.close) - c.low
}

function isBullish(c: OHLCCandle): boolean {
  return c.close > c.open
}

function isBearish(c: OHLCCandle): boolean {
  return c.close < c.open
}

// ---------------------------------------------------------------------------
// OHLC aggregation
// ---------------------------------------------------------------------------

export function aggregateCandles(history: number[], ticksPerCandle: number): OHLCCandle[] {
  const candles: OHLCCandle[] = []
  // Only aggregate complete candles
  const completeCount = Math.floor(history.length / ticksPerCandle)

  for (let i = 0; i < completeCount; i++) {
    const start = i * ticksPerCandle
    const slice = history.slice(start, start + ticksPerCandle)
    const open = slice[0]
    const close = slice[slice.length - 1]
    let high = -Infinity
    let low = Infinity
    for (const p of slice) {
      if (p > high) high = p
      if (p < low) low = p
    }
    candles.push({ open, high, low, close, tickCount: ticksPerCandle, startIndex: start })
  }

  return candles
}

// ---------------------------------------------------------------------------
// Pattern detectors — each returns strength (0-1) or 0 if not detected
// ---------------------------------------------------------------------------

function detectDoji(c: OHLCCandle): number {
  const r = range(c)
  if (r === 0) return 0
  const ratio = body(c) / r
  // Doji: very small body relative to range
  if (ratio < 0.1) return 1
  if (ratio < 0.15) return 0.7
  return 0
}

function detectHammer(c: OHLCCandle): number {
  const b = body(c)
  const r = range(c)
  const lw = lowerWick(c)
  const uw = upperWick(c)
  if (r === 0 || b === 0) return 0
  // Hammer: long lower wick (>2x body), small upper wick (<30% of range)
  if (lw >= b * 2 && uw < r * 0.3) {
    return Math.min(lw / (b * 2), 1)
  }
  return 0
}

function detectShootingStar(c: OHLCCandle): number {
  const b = body(c)
  const r = range(c)
  const lw = lowerWick(c)
  const uw = upperWick(c)
  if (r === 0 || b === 0) return 0
  // Shooting star: long upper wick (>2x body), small lower wick (<30% of range)
  if (uw >= b * 2 && lw < r * 0.3) {
    return Math.min(uw / (b * 2), 1)
  }
  return 0
}

function detectBullishEngulfing(prev: OHLCCandle, curr: OHLCCandle): number {
  if (!isBearish(prev) || !isBullish(curr)) return 0
  const prevBody = body(prev)
  const currBody = body(curr)
  if (prevBody === 0) return 0
  // Current bullish body fully engulfs previous bearish body
  if (curr.open <= prev.close && curr.close >= prev.open) {
    return Math.min(currBody / prevBody, 1)
  }
  return 0
}

function detectBearishEngulfing(prev: OHLCCandle, curr: OHLCCandle): number {
  if (!isBullish(prev) || !isBearish(curr)) return 0
  const prevBody = body(prev)
  const currBody = body(curr)
  if (prevBody === 0) return 0
  // Current bearish body fully engulfs previous bullish body
  if (curr.open >= prev.close && curr.close <= prev.open) {
    return Math.min(currBody / prevBody, 1)
  }
  return 0
}

function detectMorningStar(c0: OHLCCandle, c1: OHLCCandle, c2: OHLCCandle): number {
  // c0: bearish, c1: small body (star), c2: bullish closing above c0 midpoint
  if (!isBearish(c0)) return 0
  const c0Body = body(c0)
  const c1Body = body(c1)
  const c0Range = range(c0)
  if (c0Range === 0 || c0Body === 0) return 0
  // Star has small body relative to first candle
  if (c1Body > c0Body * 0.4) return 0
  if (!isBullish(c2)) return 0
  const c0Mid = (c0.open + c0.close) / 2
  if (c2.close > c0Mid) {
    return Math.min(body(c2) / c0Body, 1)
  }
  return 0
}

function detectEveningStar(c0: OHLCCandle, c1: OHLCCandle, c2: OHLCCandle): number {
  // c0: bullish, c1: small body (star), c2: bearish closing below c0 midpoint
  if (!isBullish(c0)) return 0
  const c0Body = body(c0)
  const c1Body = body(c1)
  const c0Range = range(c0)
  if (c0Range === 0 || c0Body === 0) return 0
  if (c1Body > c0Body * 0.4) return 0
  if (!isBearish(c2)) return 0
  const c0Mid = (c0.open + c0.close) / 2
  if (c2.close < c0Mid) {
    return Math.min(body(c2) / c0Body, 1)
  }
  return 0
}

// ---------------------------------------------------------------------------
// Main detection entry point
// ---------------------------------------------------------------------------

const PATTERN_META: Record<CandlePatternType, { sentiment: PatternSentiment; priority: number }> = {
  morningStar:      { sentiment: 'bullish', priority: 3 },
  eveningStar:      { sentiment: 'bearish', priority: 3 },
  bullishEngulfing: { sentiment: 'bullish', priority: 2 },
  bearishEngulfing: { sentiment: 'bearish', priority: 2 },
  hammer:           { sentiment: 'bullish', priority: 1 },
  shootingStar:     { sentiment: 'bearish', priority: 1 },
  doji:             { sentiment: 'neutral', priority: 1 },
}

export function detectPatterns(
  history: number[],
): { candles: OHLCCandle[]; patterns: DetectedPattern[] } {
  const candles = aggregateCandles(history, TICKS_PER_CANDLE)
  if (candles.length === 0) return { candles, patterns: [] }

  const patterns: DetectedPattern[] = []
  const lastIdx = candles.length - 1
  const last = candles[lastIdx]
  const now = Date.now()

  // 3-candle patterns (highest priority)
  if (candles.length >= 3) {
    const c0 = candles[lastIdx - 2]
    const c1 = candles[lastIdx - 1]

    const ms = detectMorningStar(c0, c1, last)
    if (ms > 0) {
      patterns.push({ type: 'morningStar', sentiment: 'bullish', strength: ms, timestamp: now, candleIndex: lastIdx })
    }

    const es = detectEveningStar(c0, c1, last)
    if (es > 0) {
      patterns.push({ type: 'eveningStar', sentiment: 'bearish', strength: es, timestamp: now, candleIndex: lastIdx })
    }
  }

  // 2-candle patterns
  if (candles.length >= 2) {
    const prev = candles[lastIdx - 1]

    const be = detectBullishEngulfing(prev, last)
    if (be > 0) {
      patterns.push({ type: 'bullishEngulfing', sentiment: 'bullish', strength: be, timestamp: now, candleIndex: lastIdx })
    }

    const bea = detectBearishEngulfing(prev, last)
    if (bea > 0) {
      patterns.push({ type: 'bearishEngulfing', sentiment: 'bearish', strength: bea, timestamp: now, candleIndex: lastIdx })
    }
  }

  // 1-candle patterns
  const dj = detectDoji(last)
  if (dj > 0) {
    patterns.push({ type: 'doji', sentiment: 'neutral', strength: dj, timestamp: now, candleIndex: lastIdx })
  }

  const hm = detectHammer(last)
  if (hm > 0) {
    patterns.push({ type: 'hammer', sentiment: 'bullish', strength: hm, timestamp: now, candleIndex: lastIdx })
  }

  const ss = detectShootingStar(last)
  if (ss > 0) {
    patterns.push({ type: 'shootingStar', sentiment: 'bearish', strength: ss, timestamp: now, candleIndex: lastIdx })
  }

  // Sort by priority descending — only return highest priority
  if (patterns.length > 1) {
    patterns.sort((a, b) => PATTERN_META[b.type].priority - PATTERN_META[a.type].priority)
  }

  // Only fire the single highest-priority pattern
  const best = patterns.length > 0 ? [patterns[0]] : []

  if (best.length > 0) {
    console.log(`[CandleDetector] ${best[0].type} (${best[0].sentiment}, strength=${best[0].strength.toFixed(2)}) at candle ${best[0].candleIndex}`)
  }

  return { candles, patterns: best }
}
