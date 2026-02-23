import { randomNormal } from '../utils/math'
import type { StockTick } from '../types'

// Geometric Brownian Motion parameters per ticker
const STOCK_PROFILES: Record<string, { basePrice: number; mu: number; sigma: number }> = {
  AAPL:  { basePrice: 195,  mu: 0.0001,  sigma: 0.002 },
  TSLA:  { basePrice: 245,  mu: 0.0002,  sigma: 0.005 },
  NVDA:  { basePrice: 880,  mu: 0.00015, sigma: 0.004 },
  MSFT:  { basePrice: 420,  mu: 0.0001,  sigma: 0.0018 },
  AMZN:  { basePrice: 185,  mu: 0.00012, sigma: 0.0025 },
  GOOG:  { basePrice: 155,  mu: 0.0001,  sigma: 0.002 },
  META:  { basePrice: 500,  mu: 0.00015, sigma: 0.003 },
  SPY:   { basePrice: 510,  mu: 0.00005, sigma: 0.001 },
  QQQ:   { basePrice: 440,  mu: 0.00007, sigma: 0.0015 },
  NQ:    { basePrice: 18500, mu: 0.00008, sigma: 0.0018 },
  'MNQ1!': { basePrice: 18500, mu: 0.00008, sigma: 0.0018 },
  BTC:   { basePrice: 62000, mu: 0.0002,  sigma: 0.006 },
}

export const AVAILABLE_TICKERS = Object.keys(STOCK_PROFILES)

export class StockSimulator {
  private price: number
  private intervalId: ReturnType<typeof setInterval> | null = null
  private symbol: string
  private mu: number
  private sigma: number
  private baseVolume: number
  private onTick: (tick: StockTick) => void

  // Occasional regime changes for drama
  private regimeTimer = 0
  private regimeMu: number
  private regimeSigma: number

  constructor(symbol: string, onTick: (tick: StockTick) => void) {
    const profile = STOCK_PROFILES[symbol] ?? { basePrice: 100, mu: 0.0001, sigma: 0.003 }
    this.symbol = symbol
    this.price = profile.basePrice * (0.95 + Math.random() * 0.1)
    this.mu = profile.mu
    this.sigma = profile.sigma
    this.regimeMu = this.mu
    this.regimeSigma = this.sigma
    this.baseVolume = 50000 + Math.random() * 200000
    this.onTick = onTick
  }

  start(intervalMs = 100) {
    this.intervalId = setInterval(() => this.step(), intervalMs)
  }

  stop() {
    if (this.intervalId) {
      clearInterval(this.intervalId)
      this.intervalId = null
    }
  }

  private step() {
    // Occasional regime shifts (every ~30-120 seconds)
    this.regimeTimer++
    if (this.regimeTimer > 300 + Math.random() * 900) {
      this.regimeTimer = 0
      // Random regime: crash, rally, or normal
      const roll = Math.random()
      if (roll < 0.15) {
        // Crash regime
        this.regimeMu = -this.mu * 5
        this.regimeSigma = this.sigma * 3
      } else if (roll < 0.3) {
        // Rally regime
        this.regimeMu = this.mu * 5
        this.regimeSigma = this.sigma * 2.5
      } else {
        // Normal
        this.regimeMu = this.mu
        this.regimeSigma = this.sigma
      }
    }

    // GBM: dS = S * (mu*dt + sigma*sqrt(dt)*Z)
    const dt = 1 / 10 // 10 ticks per second
    const drift = this.regimeMu * dt
    const diffusion = this.regimeSigma * Math.sqrt(dt) * randomNormal()
    this.price = this.price * (1 + drift + diffusion)
    const profile = STOCK_PROFILES[this.symbol] ?? { basePrice: 100, mu: 0.0001, sigma: 0.003 }
    this.price = Math.max(profile.basePrice * 0.1, this.price) // floor at 10% of base price

    // Volume with spikes correlated to volatility
    const volumeMultiplier = 1 + Math.abs(diffusion) * 100
    const volume = Math.round(this.baseVolume * volumeMultiplier * (0.8 + Math.random() * 0.4))

    this.onTick({
      symbol: this.symbol,
      price: Math.round(this.price * 100) / 100,
      timestamp: Date.now(),
      volume,
    })
  }
}
