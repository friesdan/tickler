import type { StockTick } from '../types'

/**
 * Alpaca Markets WebSocket client for real-time stock data.
 * Uses the free IEX data feed.
 *
 * To use: set ALPACA_API_KEY and ALPACA_SECRET in the settings panel
 * or localStorage.
 */

const WS_URL = 'wss://stream.data.alpaca.markets/v2/iex'

export class AlpacaClient {
  private ws: WebSocket | null = null
  private apiKey: string
  private apiSecret: string
  private symbol: string
  private onTick: (tick: StockTick) => void
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null

  constructor(apiKey: string, apiSecret: string, symbol: string, onTick: (tick: StockTick) => void) {
    this.apiKey = apiKey
    this.apiSecret = apiSecret
    this.symbol = symbol
    this.onTick = onTick
  }

  connect() {
    this.ws = new WebSocket(WS_URL)

    this.ws.onopen = () => {
      console.log('[Alpaca] Connected')
      // Authenticate
      this.ws?.send(JSON.stringify({
        action: 'auth',
        key: this.apiKey,
        secret: this.apiSecret,
      }))
    }

    this.ws.onmessage = (event) => {
      const messages = JSON.parse(event.data)
      for (const msg of messages) {
        if (msg.T === 'success' && msg.msg === 'authenticated') {
          console.log('[Alpaca] Authenticated, subscribing to', this.symbol)
          this.ws?.send(JSON.stringify({
            action: 'subscribe',
            trades: [this.symbol],
          }))
        }

        if (msg.T === 't') {
          // Trade message
          this.onTick({
            symbol: msg.S,
            price: msg.p,
            timestamp: new Date(msg.t).getTime(),
            volume: msg.s,
          })
        }
      }
    }

    this.ws.onerror = (err) => {
      console.error('[Alpaca] Error:', err)
    }

    this.ws.onclose = () => {
      console.log('[Alpaca] Disconnected')
      // Reconnect after 5s
      this.reconnectTimer = setTimeout(() => this.connect(), 5000)
    }
  }

  changeSymbol(symbol: string) {
    if (this.ws?.readyState === WebSocket.OPEN) {
      // Unsubscribe from old
      this.ws.send(JSON.stringify({
        action: 'unsubscribe',
        trades: [this.symbol],
      }))
      // Subscribe to new
      this.symbol = symbol
      this.ws.send(JSON.stringify({
        action: 'subscribe',
        trades: [this.symbol],
      }))
    }
  }

  disconnect() {
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer)
    }
    this.ws?.close()
    this.ws = null
  }
}
