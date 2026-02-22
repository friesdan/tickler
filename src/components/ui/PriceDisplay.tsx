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

  return (
    <div className="glass px-4 py-3">
      <div className="text-white/50 text-xs mb-1">{symbol}</div>
      <div className="flex items-baseline gap-3">
        <span className="text-2xl font-bold tabular-nums">
          ${price.toFixed(2)}
        </span>
        <span className={`text-sm font-semibold ${color}`}>
          {isUp ? '+' : ''}{change.toFixed(2)} ({isUp ? '+' : ''}{changePercent.toFixed(2)}%)
        </span>
      </div>
      {sparkline.length > 2 && (
        <svg width="120" height="24" className="mt-2 opacity-60">
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
