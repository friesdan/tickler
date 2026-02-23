import { useState, useRef, useEffect, useCallback } from 'react'
import { useStockStore } from '../../stores/stockStore'
import { useSettingsStore } from '../../stores/settingsStore'
import { AVAILABLE_TICKERS } from '../../services/stockSimulator'
import { searchTickers } from '../../services/tickerSearch'
import type { TickerSearchResult, ConnectionStatus } from '../../types'

function StatusDot({ status }: { status: ConnectionStatus }) {
  const cls =
    status === 'connected' ? 'bg-emerald-400' :
    status === 'connecting' || status === 'reconnecting' ? 'bg-yellow-400 animate-pulse' :
    status === 'error' ? 'bg-red-400' :
    'bg-white/20'
  return <span className={`inline-block w-1.5 h-1.5 rounded-full ${cls} flex-shrink-0`} />
}

export function TickerSelector({ onOpenConfig }: { onOpenConfig?: () => void }) {
  const symbol = useStockStore((s) => s.symbol)
  const setSymbol = useStockStore((s) => s.setSymbol)
  const connectionStatus = useStockStore((s) => s.connectionStatus)
  const dataProvider = useSettingsStore((s) => s.dataProvider)
  const favoriteTickers = useSettingsStore((s) => s.favoriteTickers)
  const addFavorite = useSettingsStore((s) => s.addFavorite)
  const removeFavorite = useSettingsStore((s) => s.removeFavorite)
  const finnhubKey = useSettingsStore((s) => s.finnhubKey)
  const alphaVantageKey = useSettingsStore((s) => s.alphaVantageKey)
  const polygonKey = useSettingsStore((s) => s.polygonKey)
  const ibkrGatewayUrl = useSettingsStore((s) => s.ibkrGatewayUrl)

  const isSimulator = dataProvider === 'simulator'
  const hasAnyKey = !!(finnhubKey || alphaVantageKey || polygonKey || ibkrGatewayUrl)

  const [bannerDismissed, setBannerDismissed] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [searchResults, setSearchResults] = useState<TickerSearchResult[]>([])
  const [isSearching, setIsSearching] = useState(false)
  const [showDropdown, setShowDropdown] = useState(false)
  const searchRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const debounceRef = useRef<ReturnType<typeof setTimeout>>(null)

  // Compute ticker list: favorites + simulator defaults (deduplicated)
  const tickers = isSimulator
    ? [...new Set([...favoriteTickers, ...AVAILABLE_TICKERS])]
    : favoriteTickers

  // Debounced search
  const doSearch = useCallback((query: string) => {
    if (debounceRef.current) clearTimeout(debounceRef.current)
    if (!query.trim()) {
      setSearchResults([])
      setIsSearching(false)
      return
    }
    setIsSearching(true)
    debounceRef.current = setTimeout(async () => {
      const results = await searchTickers(query, { finnhubKey, alphaVantageKey, polygonKey, ibkrGatewayUrl })
      setSearchResults(results)
      setIsSearching(false)
    }, 300)
  }, [finnhubKey, alphaVantageKey, polygonKey, ibkrGatewayUrl])

  // Clean up debounce timer on unmount
  useEffect(() => {
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current) }
  }, [])

  // Close dropdown on outside click
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (searchRef.current && !searchRef.current.contains(e.target as Node)) {
        setShowDropdown(false)
      }
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

  const handleSearchInput = (value: string) => {
    setSearchQuery(value)
    setShowDropdown(true)
    doSearch(value)
  }

  const selectResult = (sym: string) => {
    setSymbol(sym)
    setSearchQuery('')
    setSearchResults([])
    setShowDropdown(false)
  }

  return (
    <div className="glass px-3 sm:px-4 py-2.5 sm:py-3">
      {/* Connection status + search */}
      <div className="flex items-center gap-2 mb-2">
        <StatusDot status={connectionStatus} />

        {/* Search input (only show when not simulator, or when there are API keys) */}
        {(!isSimulator || hasAnyKey) && (
          <div ref={searchRef} className="relative flex-1">
            <input
              ref={inputRef}
              type="text"
              value={searchQuery}
              onChange={(e) => handleSearchInput(e.target.value)}
              onFocus={() => { if (searchResults.length > 0) setShowDropdown(true) }}
              placeholder="Search ticker..."
              className="w-full bg-white/[0.06] border border-white/[0.08] rounded-md px-2.5 py-1.5 text-[11px] text-white/80 outline-none focus:border-white/20 placeholder:text-white/20 transition-all"
            />
            {isSearching && (
              <span className="absolute right-2 top-1/2 -translate-y-1/2 text-white/30 text-[10px]">...</span>
            )}

            {/* Search dropdown */}
            {showDropdown && searchResults.length > 0 && (
              <div className="absolute top-full left-0 right-0 mt-1 bg-[rgba(12,12,30,0.95)] border border-white/[0.08] rounded-lg overflow-hidden z-50 max-h-48 overflow-y-auto shadow-xl">
                {searchResults.map((r) => (
                  <div
                    key={`${r.symbol}-${r.provider}`}
                    className="flex items-center justify-between px-3 py-2 hover:bg-white/[0.06] cursor-pointer transition-colors group"
                  >
                    <button
                      onClick={() => selectResult(r.symbol)}
                      className="flex-1 text-left cursor-pointer"
                    >
                      <span className="text-[11px] font-bold text-white/80">{r.symbol}</span>
                      <span className="text-[10px] text-white/30 ml-2 truncate">{r.name}</span>
                    </button>
                    {/* Add to favorites */}
                    {!favoriteTickers.includes(r.symbol) && (
                      <button
                        onClick={(e) => { e.stopPropagation(); addFavorite(r.symbol) }}
                        className="ml-2 text-white/15 hover:text-yellow-400/80 cursor-pointer transition-colors text-sm leading-none"
                        title="Add to favorites"
                      >
                        &#9734;
                      </button>
                    )}
                    {favoriteTickers.includes(r.symbol) && (
                      <span className="ml-2 text-yellow-400/60 text-sm leading-none">&#9733;</span>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Simulator banner */}
      {isSimulator && !hasAnyKey && !bannerDismissed && (
        <div className="flex items-center justify-between gap-2 px-0.5 mb-2">
          <div className="flex items-center gap-2 min-w-0">
            <span className="w-1 h-1 rounded-full bg-yellow-400/60 flex-shrink-0" />
            <span className="text-[10px] text-white/35 leading-tight truncate">
              Simulated data.{' '}
              {onOpenConfig ? (
                <button
                  onClick={onOpenConfig}
                  className="text-white/50 hover:text-white/80 underline underline-offset-2 decoration-white/20 hover:decoration-white/50 cursor-pointer transition-colors"
                >
                  Add an API key
                </button>
              ) : (
                <span>Add an API key in Settings</span>
              )}
              {' '}for live market data.
            </span>
          </div>
          <button
            onClick={() => setBannerDismissed(true)}
            className="text-white/15 hover:text-white/40 cursor-pointer transition-colors flex-shrink-0 leading-none text-xs"
            aria-label="Dismiss"
          >
            &times;
          </button>
        </div>
      )}

      {/* Favorites bar */}
      <div className="flex gap-1.5 sm:gap-2 flex-nowrap overflow-x-auto sm:flex-wrap">
        {tickers.map((t) => (
          <div key={t} className="relative group flex-shrink-0">
            <button
              onClick={() => setSymbol(t)}
              className={`px-2.5 sm:px-3 py-1.5 sm:py-1 rounded-lg text-xs font-bold transition-all cursor-pointer min-h-[36px] sm:min-h-0 flex items-center ${
                t === symbol
                  ? 'bg-white/20 text-white'
                  : 'text-white/40 hover:text-white/70 active:text-white/90'
              }`}
            >
              {t}
            </button>
            {/* Remove from favorites (only for user-added favorites, not simulator defaults) */}
            {favoriteTickers.includes(t) && (
              <button
                onClick={(e) => { e.stopPropagation(); removeFavorite(t) }}
                className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-black/60 text-white/30 hover:text-white/80 text-[9px] leading-none items-center justify-center cursor-pointer transition-colors hidden group-hover:flex"
                title="Remove from favorites"
              >
                &times;
              </button>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}
