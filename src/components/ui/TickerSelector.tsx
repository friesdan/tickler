import { useStockStore } from '../../stores/stockStore'
import { AVAILABLE_TICKERS } from '../../services/stockSimulator'

export function TickerSelector() {
  const symbol = useStockStore((s) => s.symbol)
  const setSymbol = useStockStore((s) => s.setSymbol)

  return (
    <div className="glass px-3 sm:px-4 py-2.5 sm:py-3">
      <div className="flex gap-1.5 sm:gap-2 flex-nowrap overflow-x-auto sm:flex-wrap">
        {AVAILABLE_TICKERS.map((t) => (
          <button
            key={t}
            onClick={() => setSymbol(t)}
            className={`px-2.5 sm:px-3 py-1.5 sm:py-1 rounded-lg text-xs font-bold transition-all cursor-pointer flex-shrink-0 min-h-[36px] sm:min-h-0 flex items-center ${
              t === symbol
                ? 'bg-white/20 text-white'
                : 'text-white/40 hover:text-white/70 active:text-white/90'
            }`}
          >
            {t}
          </button>
        ))}
      </div>
    </div>
  )
}
