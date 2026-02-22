import { useStockStore } from '../../stores/stockStore'
import { AVAILABLE_TICKERS } from '../../services/stockSimulator'

export function TickerSelector() {
  const symbol = useStockStore((s) => s.symbol)
  const setSymbol = useStockStore((s) => s.setSymbol)

  return (
    <div className="glass px-4 py-3">
      <div className="flex gap-2 flex-wrap">
        {AVAILABLE_TICKERS.map((t) => (
          <button
            key={t}
            onClick={() => setSymbol(t)}
            className={`px-3 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
              t === symbol
                ? 'bg-white/20 text-white'
                : 'text-white/40 hover:text-white/70'
            }`}
          >
            {t}
          </button>
        ))}
      </div>
    </div>
  )
}
