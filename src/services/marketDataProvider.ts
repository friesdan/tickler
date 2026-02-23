import type { StockTick, DataProvider, ConnectionStatus } from '../types'

export interface MarketDataProviderOptions {
  symbol: string
  onTick: (tick: StockTick) => void
  onStatusChange: (status: ConnectionStatus, message?: string) => void
  apiKey?: string
}

export interface IMarketDataProvider {
  readonly provider: DataProvider
  connect(): void
  disconnect(): void
  changeSymbol(symbol: string): void
}
