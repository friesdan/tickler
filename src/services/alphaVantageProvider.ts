import type { IMarketDataProvider, MarketDataProviderOptions } from './marketDataProvider'
import type { TickerSearchResult } from '../types'

const POLL_INTERVAL = 8000 // 8 seconds
const BACKOFF_INTERVAL = 60000 // 1 minute on rate limit

export class AlphaVantageProvider implements IMarketDataProvider {
  readonly provider = 'alphaVantage' as const
  private options: MarketDataProviderOptions
  private pollTimer: ReturnType<typeof setTimeout> | null = null
  private active = false
  private currentInterval = POLL_INTERVAL

  constructor(options: MarketDataProviderOptions) {
    this.options = options
  }

  connect() {
    this.active = true
    this.currentInterval = POLL_INTERVAL
    this.options.onStatusChange('connecting')
    this.poll()
  }

  disconnect() {
    this.active = false
    if (this.pollTimer) {
      clearTimeout(this.pollTimer)
      this.pollTimer = null
    }
    this.options.onStatusChange('disconnected')
  }

  changeSymbol(symbol: string) {
    this.options.symbol = symbol
    // Reset polling immediately for new symbol
    if (this.pollTimer) {
      clearTimeout(this.pollTimer)
    }
    this.currentInterval = POLL_INTERVAL
    if (this.active) this.poll()
  }

  private async poll() {
    if (!this.active) return

    // Snapshot symbol before await to prevent stale-symbol race
    const symbol = this.options.symbol

    try {
      const url = `https://www.alphavantage.co/query?function=GLOBAL_QUOTE&symbol=${encodeURIComponent(symbol)}&apikey=${this.options.apiKey}`
      const res = await fetch(url)
      if (!this.active) return // disconnected mid-fetch
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      const data = await res.json()

      // Stale check: symbol changed while we were fetching
      if (symbol !== this.options.symbol || !this.active) return

      // Rate limit detection
      if (data['Note'] || data['Information']) {
        console.warn('[AlphaVantage] Rate limited:', data['Note'] || data['Information'])
        this.options.onStatusChange('error', 'Rate limited — backing off')
        this.currentInterval = BACKOFF_INTERVAL
        this.scheduleNext()
        return
      }

      const quote = data['Global Quote']
      if (!quote || !quote['05. price']) {
        this.options.onStatusChange('error', 'No data for symbol')
        this.scheduleNext()
        return
      }

      const price = parseFloat(quote['05. price'])
      const volume = parseInt(quote['06. volume'], 10) || 0

      this.options.onStatusChange('connected')
      this.currentInterval = POLL_INTERVAL

      this.options.onTick({
        symbol,
        price,
        timestamp: Date.now(),
        volume,
      })
    } catch (err) {
      if (!this.active) return
      console.error('[AlphaVantage] Poll error:', err)
      this.options.onStatusChange('error', 'Failed to fetch quote')
    }

    this.scheduleNext()
  }

  private scheduleNext() {
    if (!this.active) return
    this.pollTimer = setTimeout(() => this.poll(), this.currentInterval)
  }
}

/** Search Alpha Vantage for ticker symbols */
export async function searchAlphaVantage(query: string, apiKey: string): Promise<TickerSearchResult[]> {
  const res = await fetch(`https://www.alphavantage.co/query?function=SYMBOL_SEARCH&keywords=${encodeURIComponent(query)}&apikey=${apiKey}`)
  if (!res.ok) return []
  const data = await res.json()
  if (!data.bestMatches) return []
  return data.bestMatches.slice(0, 10).map((m: Record<string, string>) => ({
    symbol: m['1. symbol'],
    name: m['2. name'],
    type: m['3. type'],
    provider: 'alphaVantage' as const,
  }))
}
