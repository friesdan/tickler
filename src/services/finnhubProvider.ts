import type { IMarketDataProvider, MarketDataProviderOptions } from './marketDataProvider'
import type { TickerSearchResult } from '../types'

export class FinnhubProvider implements IMarketDataProvider {
  readonly provider = 'finnhub' as const
  private ws: WebSocket | null = null
  private options: MarketDataProviderOptions
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null
  private reconnectDelay = 1000
  private intentionalClose = false
  private lastPrice = 0

  constructor(options: MarketDataProviderOptions) {
    this.options = options
  }

  connect() {
    this.intentionalClose = false
    this.options.onStatusChange('connecting')

    const url = `wss://ws.finnhub.io?token=${this.options.apiKey}`
    this.ws = new WebSocket(url)

    this.ws.onopen = () => {
      console.log('[Finnhub] Connected')
      this.reconnectDelay = 1000
      this.options.onStatusChange('connected')
      this.subscribe(this.options.symbol)
    }

    this.ws.onmessage = (event) => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      let data: any
      try { data = JSON.parse(event.data) } catch { return }
      if (data.type === 'trade' && Array.isArray(data.data)) {
        for (const trade of data.data) {
          this.lastPrice = trade.p
          this.options.onTick({
            symbol: trade.s,
            price: trade.p,
            timestamp: trade.t,
            volume: trade.v,
          })
        }
      }
      if (data.type === 'error') {
        console.error('[Finnhub] Error:', data.msg)
        this.options.onStatusChange('error', String(data.msg))
      }
    }

    this.ws.onerror = (err) => {
      console.error('[Finnhub] WebSocket error:', err)
      this.options.onStatusChange('error', 'WebSocket connection error')
    }

    this.ws.onclose = () => {
      console.log('[Finnhub] Disconnected')
      if (!this.intentionalClose) {
        this.options.onStatusChange('reconnecting', `Reconnecting in ${Math.round(this.reconnectDelay / 1000)}s...`)
        this.reconnectTimer = setTimeout(() => {
          this.reconnectDelay = Math.min(this.reconnectDelay * 2, 30000)
          this.connect()
        }, this.reconnectDelay)
      }
    }
  }

  disconnect() {
    this.intentionalClose = true
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer)
      this.reconnectTimer = null
    }
    if (this.ws) {
      if (this.ws.readyState === WebSocket.OPEN) {
        this.unsubscribe(this.options.symbol)
      }
      this.ws.close()
      this.ws = null
    }
    this.options.onStatusChange('disconnected')
  }

  changeSymbol(symbol: string) {
    const prev = this.options.symbol
    this.options.symbol = symbol
    this.lastPrice = 0
    if (this.ws?.readyState === WebSocket.OPEN) {
      this.unsubscribe(prev)
      this.subscribe(symbol)
    }
  }

  private subscribe(symbol: string) {
    this.ws?.send(JSON.stringify({ type: 'subscribe', symbol }))
  }

  private unsubscribe(symbol: string) {
    this.ws?.send(JSON.stringify({ type: 'unsubscribe', symbol }))
  }
}

/** Search Finnhub for ticker symbols */
export async function searchFinnhub(query: string, apiKey: string): Promise<TickerSearchResult[]> {
  const res = await fetch(`https://finnhub.io/api/v1/search?q=${encodeURIComponent(query)}&token=${apiKey}`)
  if (!res.ok) return []
  const data = await res.json()
  if (!data.result) return []
  return data.result.slice(0, 10).map((r: { symbol: string; description: string; type: string }) => ({
    symbol: r.symbol,
    name: r.description,
    type: r.type,
    provider: 'finnhub' as const,
  }))
}
