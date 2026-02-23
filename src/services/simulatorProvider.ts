import type { IMarketDataProvider, MarketDataProviderOptions } from './marketDataProvider'
import { StockSimulator } from './stockSimulator'

export class SimulatorProvider implements IMarketDataProvider {
  readonly provider = 'simulator' as const
  private simulator: StockSimulator | null = null
  private options: MarketDataProviderOptions

  constructor(options: MarketDataProviderOptions) {
    this.options = options
  }

  connect() {
    this.options.onStatusChange('connecting')
    this.simulator = new StockSimulator(this.options.symbol, this.options.onTick)
    this.simulator.start(100)
    this.options.onStatusChange('connected')
  }

  disconnect() {
    this.simulator?.stop()
    this.simulator = null
    this.options.onStatusChange('disconnected')
  }

  changeSymbol(symbol: string) {
    this.options.symbol = symbol
    this.simulator?.stop()
    this.simulator = new StockSimulator(symbol, this.options.onTick)
    this.simulator.start(100)
  }
}
