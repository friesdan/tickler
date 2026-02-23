import { useEffect, useRef } from 'react'
import {
  createChart,
  CandlestickSeries,
  LineSeries,
  type IChartApi,
  type ISeriesApi,
  type CandlestickData,
  type LineData,
  ColorType,
  CrosshairMode,
} from 'lightweight-charts'
import { useStockStore } from '../../stores/stockStore'

export function PriceChart() {
  const containerRef = useRef<HTMLDivElement>(null)
  const chartRef = useRef<IChartApi | null>(null)
  const candleSeriesRef = useRef<ISeriesApi<'Candlestick'> | null>(null)
  const lineSeriesRef = useRef<ISeriesApi<'Line'> | null>(null)

  useEffect(() => {
    const el = containerRef.current
    if (!el) return

    const chart = createChart(el, {
      layout: {
        background: { type: ColorType.Solid, color: 'transparent' },
        textColor: 'rgba(255,255,255,0.3)',
        fontFamily: 'ui-monospace, monospace',
        fontSize: 11,
      },
      grid: {
        vertLines: { color: 'rgba(255,255,255,0.03)' },
        horzLines: { color: 'rgba(255,255,255,0.03)' },
      },
      crosshair: {
        mode: CrosshairMode.Normal,
        vertLine: { color: 'rgba(255,255,255,0.15)', width: 1, style: 2 },
        horzLine: { color: 'rgba(255,255,255,0.15)', width: 1, style: 2 },
      },
      rightPriceScale: {
        borderColor: 'rgba(255,255,255,0.05)',
        textColor: 'rgba(255,255,255,0.3)',
      },
      timeScale: {
        visible: false,
      },
      handleScroll: false,
      handleScale: false,
    })

    chartRef.current = chart

    const candleSeries = chart.addSeries(CandlestickSeries, {
      upColor: '#4ade80',
      downColor: '#f87171',
      borderUpColor: '#4ade80',
      borderDownColor: '#f87171',
      wickUpColor: '#4ade80',
      wickDownColor: '#f87171',
    })
    candleSeriesRef.current = candleSeries

    const lineSeries = chart.addSeries(LineSeries, {
      color: 'rgba(255,255,255,0.4)',
      lineWidth: 1,
      crosshairMarkerVisible: false,
      priceLineVisible: false,
      lastValueVisible: false,
    })
    lineSeriesRef.current = lineSeries

    // Resize observer
    const ro = new ResizeObserver(() => {
      chart.applyOptions({ width: el.clientWidth, height: el.clientHeight })
    })
    ro.observe(el)

    // Subscribe to store
    let prevSymbol = ''
    const unsub = useStockStore.subscribe((state) => {
      const { symbol, candles, history } = state

      // Reset on symbol change
      if (symbol !== prevSymbol) {
        prevSymbol = symbol
        candleSeries.setData([])
        lineSeries.setData([])
        return
      }

      if (candles.length >= 3) {
        // Use candlestick series, clear line
        lineSeries.setData([])
        const data: CandlestickData[] = candles.map((c, i) => ({
          time: (i + 1) as unknown as CandlestickData['time'],
          open: c.open,
          high: c.high,
          low: c.low,
          close: c.close,
        }))
        candleSeries.setData(data)
      } else if (history.length > 1) {
        // Fallback: line series from price history
        candleSeries.setData([])
        const data: LineData[] = history.map((p, i) => ({
          time: (i + 1) as unknown as LineData['time'],
          value: p,
        }))
        lineSeries.setData(data)
      }

      chart.timeScale().fitContent()
    })

    return () => {
      unsub()
      ro.disconnect()
      chart.remove()
      chartRef.current = null
      candleSeriesRef.current = null
      lineSeriesRef.current = null
    }
  }, [])

  return (
    <div
      ref={containerRef}
      className="w-[90vw] h-[25vh] sm:w-[60vw] sm:h-[35vh] opacity-50"
    />
  )
}
