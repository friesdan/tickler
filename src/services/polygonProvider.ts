import type { IMarketDataProvider, MarketDataProviderOptions } from './marketDataProvider'
import type { TickerSearchResult } from '../types'

const WS_URL = 'wss://socket.polygon.io/stocks'
const REST_POLL_INTERVAL = 5000

export class PolygonProvider implements IMarketDataProvider {
  readonly provider = 'polygon' as const
  private ws: WebSocket | null = null
  private options: MarketDataProviderOptions
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null
  private reconnectDelay = 1000
  private intentionalClose = false
  private fallbackToRest = false
  private pollTimer: ReturnType<typeof setTimeout> | null = null

  constructor(options: MarketDataProviderOptions) {
    this.options = options
  }

  connect() {
    this.intentionalClose = false
    this.fallbackToRest = false
    this.options.onStatusChange('connecting')
    this.connectWebSocket()
  }

  disconnect() {
    this.intentionalClose = true
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer)
      this.reconnectTimer = null
    }
    if (this.pollTimer) {
      clearTimeout(this.pollTimer)
      this.pollTimer = null
    }
    if (this.ws) {
      this.ws.close()
      this.ws = null
    }
    this.options.onStatusChange('disconnected')
  }

  changeSymbol(symbol: string) {
    const prev = this.options.symbol
    this.options.symbol = symbol

    if (this.fallbackToRest) {
      // REST mode — just poll new symbol next cycle
      if (this.pollTimer) {
        clearTimeout(this.pollTimer)
      }
      this.pollRest()
      return
    }

    if (this.ws?.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify({ action: 'unsubscribe', params: `T.${prev}` }))
      this.ws.send(JSON.stringify({ action: 'subscribe', params: `T.${symbol}` }))
    }
  }

  private connectWebSocket() {
    this.ws = new WebSocket(WS_URL)

    this.ws.onopen = () => {
      console.log('[Polygon] Connected, authenticating...')
      this.ws?.send(JSON.stringify({ action: 'auth', params: this.options.apiKey }))
    }

    this.ws.onmessage = (event) => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      let messages: any[]
      try { messages = JSON.parse(event.data) } catch { return }
      for (const msg of messages) {
        if (msg.ev === 'status') {
          if (msg.status === 'auth_success') {
            console.log('[Polygon] Authenticated')
            this.reconnectDelay = 1000
            this.options.onStatusChange('connected')
            this.ws?.send(JSON.stringify({ action: 'subscribe', params: `T.${this.options.symbol}` }))
          } else if (msg.status === 'auth_failed') {
            console.warn('[Polygon] Auth failed, falling back to REST')
            this.ws?.close()
            this.ws = null
            this.startRestFallback()
          }
        }

        if (msg.ev === 'T') {
          // Trade event
          this.options.onTick({
            symbol: msg.sym,
            price: msg.p,
            timestamp: msg.t,
            volume: msg.s,
          })
        }
      }
    }

    this.ws.onerror = (err) => {
      console.error('[Polygon] WebSocket error:', err)
    }

    this.ws.onclose = () => {
      console.log('[Polygon] Disconnected')
      if (!this.intentionalClose && !this.fallbackToRest) {
        this.options.onStatusChange('reconnecting', `Reconnecting in ${Math.round(this.reconnectDelay / 1000)}s...`)
        this.reconnectTimer = setTimeout(() => {
          this.reconnectDelay = Math.min(this.reconnectDelay * 2, 30000)
          this.connectWebSocket()
        }, this.reconnectDelay)
      }
    }
  }

  private startRestFallback() {
    this.fallbackToRest = true
    this.options.onStatusChange('connecting', 'Using REST polling (free tier)')
    this.pollRest()
  }

  private async pollRest() {
    if (this.intentionalClose) return

    // Snapshot symbol before await to prevent stale-symbol race
    const symbol = this.options.symbol

    try {
      const url = `https://api.polygon.io/v2/last/trade/${encodeURIComponent(symbol)}?apiKey=${this.options.apiKey}`
      const res = await fetch(url)
      if (this.intentionalClose) return // disconnected mid-fetch
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      const data = await res.json()

      // Stale check: symbol changed or disconnected while fetching
      if (symbol !== this.options.symbol || this.intentionalClose) return

      if (data.results) {
        this.options.onStatusChange('connected', 'REST polling')
        this.options.onTick({
          symbol,
          price: data.results.p,
          timestamp: data.results.t,
          volume: data.results.s || 0,
        })
      }
    } catch (err) {
      if (this.intentionalClose) return
      console.error('[Polygon] REST poll error:', err)
      this.options.onStatusChange('error', 'Failed to fetch last trade')
    }

    if (!this.intentionalClose) {
      this.pollTimer = setTimeout(() => this.pollRest(), REST_POLL_INTERVAL)
    }
  }
}

/** Search Polygon for ticker symbols */
export async function searchPolygon(query: string, apiKey: string): Promise<TickerSearchResult[]> {
  const res = await fetch(`https://api.polygon.io/v3/reference/tickers?search=${encodeURIComponent(query)}&active=true&limit=10&apiKey=${apiKey}`)
  if (!res.ok) return []
  const data = await res.json()
  if (!data.results) return []
  return data.results.map((r: { ticker: string; name: string; type: string }) => ({
    symbol: r.ticker,
    name: r.name,
    type: r.type || 'stock',
    provider: 'polygon' as const,
  }))
}
