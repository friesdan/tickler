import { create } from 'zustand'
import type { StockState, StockTick, OHLCCandle, DetectedPattern, ConnectionStatus } from '../types'
import type { IMarketDataProvider } from '../services/marketDataProvider'
import { SimulatorProvider } from '../services/simulatorProvider'
import { FinnhubProvider } from '../services/finnhubProvider'
import { AlphaVantageProvider } from '../services/alphaVantageProvider'
import { PolygonProvider } from '../services/polygonProvider'
import {
  computeVolatility, computeMomentum, detectTrend,
  computeRSI, computeMACD, computeADX, computeATR, computeEMACrossover,
  HISTORY_SIZE,
} from '../services/stockAnalyzer'
import { useSettingsStore } from './settingsStore'
import { clamp, mapRange } from '../utils/math'
import { detectPatterns, TICKS_PER_CANDLE } from '../services/candleDetector'

interface StockStore extends StockState {
  provider: IMarketDataProvider | null
  connectionStatus: ConnectionStatus
  connectionMessage: string | null
  candles: OHLCCandle[]
  lastPattern: DetectedPattern | null
  lastPatternCandleCount: number
  totalTicks: number  // running counter, never capped — drives candle detection
  processTick: (tick: StockTick) => void
  startProvider: (symbol: string) => void
  stopProvider: () => void
  setSymbol: (symbol: string) => void
}

const INITIAL_STATE = {
  price: 0,
  previousPrice: 0,
  open: 0,
  high: 0,
  low: Infinity,
  change: 0,
  changePercent: 0,
  volume: 0,
  history: [] as number[],
  volatility: 0.3,
  momentum: 0,
  trend: 'neutral' as const,
  rsi: 50,
  macdHistogram: 0,
  adx: 20,
  atr: 0.3,
  macroTrend: 0,
  candles: [] as OHLCCandle[],
  lastPattern: null as DetectedPattern | null,
  lastPatternCandleCount: 0,
  totalTicks: 0,
}

function createProvider(symbol: string, onTick: (tick: StockTick) => void, onStatusChange: (status: ConnectionStatus, message?: string) => void): IMarketDataProvider {
  const settings = useSettingsStore.getState()
  const dp = settings.dataProvider
  const opts = { symbol, onTick, onStatusChange }

  switch (dp) {
    case 'finnhub':
      if (settings.finnhubKey) {
        return new FinnhubProvider({ ...opts, apiKey: settings.finnhubKey })
      }
      // Fall back to simulator if no key
      return new SimulatorProvider(opts)
    case 'alphaVantage':
      if (settings.alphaVantageKey) {
        return new AlphaVantageProvider({ ...opts, apiKey: settings.alphaVantageKey })
      }
      return new SimulatorProvider(opts)
    case 'polygon':
      if (settings.polygonKey) {
        return new PolygonProvider({ ...opts, apiKey: settings.polygonKey })
      }
      return new SimulatorProvider(opts)
    default:
      return new SimulatorProvider(opts)
  }
}

export const useStockStore = create<StockStore>((set, get) => ({
  symbol: 'AAPL',
  ...INITIAL_STATE,
  provider: null,
  connectionStatus: 'disconnected',
  connectionMessage: null,

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

  startProvider: (symbol: string) => {
    const state = get()
    state.provider?.disconnect()

    set({
      symbol,
      ...INITIAL_STATE,
      provider: null,
      connectionStatus: 'connecting',
      connectionMessage: null,
    })

    const provider = createProvider(
      symbol,
      (tick) => get().processTick(tick),
      (status, message) => set({ connectionStatus: status, connectionMessage: message ?? null }),
    )
    provider.connect()
    set({ provider })
  },

  stopProvider: () => {
    get().provider?.disconnect()
    set({ provider: null, connectionStatus: 'disconnected', connectionMessage: null })
  },

  setSymbol: (symbol: string) => {
    const state = get()
    if (state.provider) {
      // Reset state for new symbol
      set({
        symbol,
        ...INITIAL_STATE,
      })
      state.provider.changeSymbol(symbol)
    } else {
      get().startProvider(symbol)
    }
  },
}))
