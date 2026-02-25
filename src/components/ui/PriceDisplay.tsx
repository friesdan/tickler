import { useStockStore } from '../../stores/stockStore'

export function PriceDisplay() {
  const price = useStockStore((s) => s.price)
  const change = useStockStore((s) => s.change)
  const changePercent = useStockStore((s) => s.changePercent)
  const symbol = useStockStore((s) => s.symbol)
  const history = useStockStore((s) => s.history)

  const isUp = change >= 0
  const color = isUp ? 'text-green-400' : 'text-red-400'

  // Mini sparkline from history
  const sparkline = history.slice(-40)
  const min = Math.min(...sparkline)
  const max = Math.max(...sparkline)
  const range = max - min || 1
  const points = sparkline
    .map((p, i) => {
      const x = (i / (sparkline.length - 1)) * 120
      const y = 24 - ((p - min) / range) * 20
      return `${x},${y}`
    })
    .join(' ')

  const hasData = history.length > 0

  return (
    <div data-tour-id="price-display" className="glass px-3 sm:px-4 py-2.5 sm:py-3">
      <div className="text-white/60 text-[10px] sm:text-xs mb-1">{symbol}</div>
      {!hasData ? (
        <div className="text-white/25 text-xs py-1">Waiting for data...</div>
      ) : (
        <div className="flex items-baseline gap-2 sm:gap-3">
          <span className="text-xl sm:text-2xl font-bold font-data">
            ${price.toFixed(2)}
          </span>
          <span className={`text-xs sm:text-sm font-semibold font-data ${color}`}>
            {isUp ? '+' : ''}{change.toFixed(2)} ({isUp ? '+' : ''}{changePercent.toFixed(2)}%)
          </span>
        </div>
      )}
      {sparkline.length > 2 && (
        <svg width="120" height="24" className="mt-1.5 sm:mt-2 opacity-60">
          <polyline
            points={points}
            fill="none"
            stroke={isUp ? '#4ade80' : '#f87171'}
            strokeWidth="1.5"
          />
        </svg>
      )}
    </div>
  )
}
