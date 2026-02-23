import type { IMarketDataProvider, MarketDataProviderOptions } from './marketDataProvider'
import type { TickerSearchResult } from '../types'

const POLL_INTERVAL = 3000
const TICKLE_INTERVAL = 60000

export class InteractiveBrokersProvider implements IMarketDataProvider {
  readonly provider = 'interactiveBrokers' as const
  private options: MarketDataProviderOptions
  private gatewayUrl: string
  private conidCache = new Map<string, number>()
  private currentConid: number | null = null
  private pollTimer: ReturnType<typeof setTimeout> | null = null
  private tickleTimer: ReturnType<typeof setInterval> | null = null
  private active = false

  constructor(options: MarketDataProviderOptions) {
    this.options = options
    // Gateway URL is passed via apiKey field
    this.gatewayUrl = (options.apiKey || 'https://localhost:5000').replace(/\/+$/, '')
  }

  connect() {
    this.active = true
    this.options.onStatusChange('connecting')
    this.checkAuth()
  }

  disconnect() {
    this.active = false
    if (this.pollTimer) {
      clearTimeout(this.pollTimer)
      this.pollTimer = null
    }
    if (this.tickleTimer) {
      clearInterval(this.tickleTimer)
      this.tickleTimer = null
    }
    this.currentConid = null
    this.options.onStatusChange('disconnected')
  }

  changeSymbol(symbol: string) {
    this.options.symbol = symbol
    this.currentConid = null
    if (this.pollTimer) {
      clearTimeout(this.pollTimer)
      this.pollTimer = null
    }
    if (this.active) {
      this.startPolling()
    }
  }

  private async checkAuth() {
    try {
      const res = await fetch(`${this.gatewayUrl}/v1/api/iserver/auth/status`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
      })
      if (!this.active) return
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      const data = await res.json()

      if (data.authenticated) {
        // Initialize brokerage session — required before snapshot requests
        await this.initAccounts()
        if (!this.active) return
        this.options.onStatusChange('connected', 'IBKR Gateway authenticated')
        this.startPolling()
        this.startTickle()
      } else if (data.connected) {
        // Connected but not authenticated — attempt reauthentication
        console.log('[IBKR] Connected but not authenticated, attempting reauth...')
        try {
          await fetch(`${this.gatewayUrl}/v1/api/iserver/reauthenticate`, {
            method: 'POST',
            credentials: 'include',
          })
        } catch { /* best effort */ }
        this.options.onStatusChange('error', 'Session expired — reauthenticating. Re-login in browser if this persists.')
      } else {
        this.options.onStatusChange('error', 'Not authenticated — log into the Client Portal Gateway in your browser')
      }
    } catch (err) {
      if (!this.active) return
      console.error('[IBKR] Auth check failed:', err)
      this.options.onStatusChange('error', 'Cannot reach gateway — is it running?')
    }
  }

  /** Call /iserver/accounts to initialize brokerage session (required before market data) */
  private async initAccounts() {
    try {
      await fetch(`${this.gatewayUrl}/v1/api/iserver/accounts`, {
        credentials: 'include',
      })
    } catch (err) {
      console.warn('[IBKR] Accounts init failed (non-fatal):', err)
    }
  }

  private async resolveConid(symbol: string): Promise<number | null> {
    const cached = this.conidCache.get(symbol)
    if (cached) return cached

    try {
      const res = await fetch(`${this.gatewayUrl}/v1/api/iserver/secdef/search`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ symbol }),
      })
      if (!res.ok) return null
      const data = await res.json()
      if (Array.isArray(data) && data.length > 0 && data[0].conid) {
        const conid = data[0].conid as number
        this.conidCache.set(symbol, conid)
        return conid
      }
      return null
    } catch (err) {
      console.error('[IBKR] Conid resolve failed:', err)
      return null
    }
  }

  private async startPolling() {
    if (!this.active) return

    const symbol = this.options.symbol
    const conid = await this.resolveConid(symbol)
    if (!this.active || symbol !== this.options.symbol) return

    if (!conid) {
      this.options.onStatusChange('error', `Could not resolve symbol: ${symbol}`)
      return
    }

    this.currentConid = conid
    this.poll()
  }

  private async poll() {
    if (!this.active || !this.currentConid) return

    const symbol = this.options.symbol
    const conid = this.currentConid

    try {
      // fields: 31=last, 84=bid, 86=ask, 55=symbol
      const res = await fetch(
        `${this.gatewayUrl}/v1/api/iserver/marketdata/snapshot?conids=${conid}&fields=31,84,86,55`,
        { credentials: 'include' },
      )
      if (!this.active || symbol !== this.options.symbol) return
      if (!res.ok) throw new Error(`HTTP ${res.status}`)

      const data = await res.json()
      if (symbol !== this.options.symbol || !this.active) return

      if (Array.isArray(data) && data.length > 0) {
        const snap = data[0]
        // Field 31 = last price. First request is a "preflight" with no data — skip it.
        const lastStr = snap['31']
        if (lastStr !== undefined && lastStr !== null) {
          const price = typeof lastStr === 'string' ? parseFloat(lastStr) : lastStr
          if (!isNaN(price) && price > 0) {
            this.options.onStatusChange('connected', 'IBKR live data')
            this.options.onTick({
              symbol,
              price,
              timestamp: Date.now(),
              volume: 0,
            })
          }
        }
      }
    } catch (err) {
      if (!this.active) return
      console.error('[IBKR] Poll error:', err)
      this.options.onStatusChange('error', 'Failed to fetch market data snapshot')
    }

    if (this.active) {
      this.pollTimer = setTimeout(() => this.poll(), POLL_INTERVAL)
    }
  }

  private startTickle() {
    this.tickleTimer = setInterval(async () => {
      if (!this.active) return
      try {
        await fetch(`${this.gatewayUrl}/v1/api/tickle`, {
          method: 'POST',
          credentials: 'include',
        })
      } catch {
        // Non-critical — session may expire eventually
      }
    }, TICKLE_INTERVAL)
  }
}

/** Search IBKR for ticker symbols via secdef search */
export async function searchIBKR(query: string, gatewayUrl: string): Promise<TickerSearchResult[]> {
  try {
    const url = gatewayUrl.replace(/\/+$/, '')
    const res = await fetch(`${url}/v1/api/iserver/secdef/search`, {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ symbol: query }),
    })
    if (!res.ok) return []
    const data = await res.json()
    if (!Array.isArray(data)) return []
    return data.slice(0, 10).map((r: { symbol?: string; companyName?: string; description?: string; secType?: string }) => ({
      symbol: r.symbol || r.description || query,
      name: r.companyName || r.description || '',
      type: r.secType || 'stock',
      provider: 'interactiveBrokers' as const,
    }))
  } catch {
    return []
  }
}
