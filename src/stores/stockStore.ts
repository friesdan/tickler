import { create } from 'zustand'
import type { StockState, StockTick, OHLCCandle, DetectedPattern } from '../types'
import { StockSimulator } from '../services/stockSimulator'
import {
  computeVolatility, computeMomentum, detectTrend,
  computeRSI, computeMACD, computeADX, computeATR, computeEMACrossover,
  HISTORY_SIZE,
} from '../services/stockAnalyzer'
import { useSettingsStore } from './settingsStore'
import { clamp, mapRange } from '../utils/math'
import { detectPatterns, TICKS_PER_CANDLE } from '../services/candleDetector'

interface StockStore extends StockState {
  simulator: StockSimulator | null
  candles: OHLCCandle[]
  lastPattern: DetectedPattern | null
  lastPatternCandleCount: number
  totalTicks: number  // running counter, never capped — drives candle detection
  processTick: (tick: StockTick) => void
  startSimulator: (symbol: string) => void
  stopSimulator: () => void
  setSymbol: (symbol: string) => void
}

export const useStockStore = create<StockStore>((set, get) => ({
  symbol: 'AAPL',
  price: 0,
  previousPrice: 0,
  open: 0,
  high: 0,
  low: Infinity,
  change: 0,
  changePercent: 0,
  volume: 0,
  history: [],
  volatility: 0.3,
  momentum: 0,
  trend: 'neutral',
  rsi: 50,
  macdHistogram: 0,
  adx: 20,
  atr: 0.3,
  macroTrend: 0,
  simulator: null,
  candles: [],
  lastPattern: null,
  lastPatternCandleCount: 0,
  totalTicks: 0,

  processTick: (tick: StockTick) => {
    const state = get()
    const history = [...state.history, tick.price].slice(-HISTORY_SIZE)
    const totalTicks = state.totalTicks + 1
    const open = state.open || tick.price
    const high = Math.max(state.high || tick.price, tick.price)
    const low = Math.min(state.low === Infinity ? tick.price : state.low, tick.price)
    const change = tick.price - open
    const changePercent = open > 0 ? (change / open) * 100 : 0

    // Technical indicators (use configurable periods)
    const p = useSettingsStore.getState().periods
    const rsi = computeRSI(history, p.rsi)
    const macdResult = computeMACD(history, p.macdFast, p.macdSlow, p.macdSignal)
    const adx = computeADX(history, p.adx)
    const rawATR = computeATR(history, p.atr)
    const macroTrend = computeEMACrossover(history, p.emaShort, p.emaLong)

    // Normalize ATR: relative to price, mapped to 0-1
    // Typical per-tick ATR ranges ~0.001%-0.5% of price
    const currentPrice = history[history.length - 1] || 1
    const atr = clamp(mapRange(rawATR / currentPrice, 0.00005, 0.005, 0, 1), 0, 1)

    // Candle pattern detection — totalTicks drives count (never capped unlike history)
    const prevCandleCount = Math.floor(state.totalTicks / TICKS_PER_CANDLE)
    const newCandleCount = Math.floor(totalTicks / TICKS_PER_CANDLE)
    let candles = state.candles
    let lastPattern = state.lastPattern
    let lastPatternCandleCount = state.lastPatternCandleCount

    if (newCandleCount > prevCandleCount) {
      const result = detectPatterns(history)
      candles = result.candles

      if (result.patterns.length > 0) {
        // Cooldown: at least 2 candles since last pattern
        const candlesSinceLast = newCandleCount - lastPatternCandleCount
        if (candlesSinceLast >= 2 || lastPatternCandleCount === 0) {
          lastPattern = result.patterns[0]
          lastPatternCandleCount = newCandleCount
        }
      }
    }

    set({
      price: tick.price,
      previousPrice: state.price || tick.price,
      open,
      high,
      low,
      change,
      changePercent,
      volume: tick.volume,
      history,
      volatility: computeVolatility(history),
      momentum: computeMomentum(history),
      trend: detectTrend(history),
      rsi,
      macdHistogram: macdResult.histogram,
      adx,
      atr,
      macroTrend,
      candles,
      lastPattern,
      lastPatternCandleCount,
      totalTicks,
    })
  },

  startSimulator: (symbol: string) => {
    const state = get()
    state.simulator?.stop()

    set({
      symbol,
      price: 0,
      previousPrice: 0,
      open: 0,
      high: 0,
      low: Infinity,
      change: 0,
      changePercent: 0,
      volume: 0,
      history: [],
      volatility: 0.3,
      momentum: 0,
      trend: 'neutral',
      rsi: 50,
      macdHistogram: 0,
      adx: 20,
      atr: 0.3,
      macroTrend: 0,
      candles: [],
      lastPattern: null,
      lastPatternCandleCount: 0,
      totalTicks: 0,
    })

    const sim = new StockSimulator(symbol, (tick) => {
      get().processTick(tick)
    })
    sim.start(100)
    set({ simulator: sim })
  },

  stopSimulator: () => {
    get().simulator?.stop()
    set({ simulator: null })
  },

  setSymbol: (symbol: string) => {
    get().stopSimulator()
    get().startSimulator(symbol)
  },
}))
