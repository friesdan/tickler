import { Visualizer } from './components/Visualizer'
import { TickerSelector } from './components/ui/TickerSelector'
import { PriceDisplay } from './components/ui/PriceDisplay'
import { MusicControls } from './components/ui/MusicControls'
import { ParameterDisplay } from './components/ui/ParameterDisplay'
import { SettingsPanel } from './components/ui/SettingsPanel'
import { PriceChart } from './components/ui/PriceChart'
import { ChordDisplay } from './components/ui/ChordDisplay'
import { useStockStore } from './stores/stockStore'
import { useMusicStore } from './stores/musicStore'
import { useSettingsStore } from './stores/settingsStore'
import { useAudioAnalyzer } from './hooks/useAudioAnalyzer'
import { ToneEngine } from './services/toneEngine'
import { useEffect, useRef, useState } from 'react'
import type { MusicEngine } from './types'

export function App() {
  const startProvider = useStockStore((s) => s.startProvider)
  const isPlaying = useMusicStore((s) => s.isPlaying)
  const setIsPlaying = useMusicStore((s) => s.setIsPlaying)
  const [settingsOpen, setSettingsOpen] = useState(false)
  const engineRef = useRef<MusicEngine | null>(null)

  // Start data provider on mount
  useEffect(() => {
    startProvider('AAPL')
    return () => useStockStore.getState().stopProvider()
  }, [startProvider])

  // Reconnect provider when dataProvider changes instantly, or API keys change (debounced)
  useEffect(() => {
    let keyDebounce: ReturnType<typeof setTimeout> | null = null
    const unsub = useSettingsStore.subscribe((state, prev) => {
      // Provider switch: reconnect immediately
      if (state.dataProvider !== prev.dataProvider) {
        if (keyDebounce) clearTimeout(keyDebounce)
        const symbol = useStockStore.getState().symbol
        useStockStore.getState().startProvider(symbol)
        return
      }
      // API key change: debounce 800ms (user is typing)
      if (
        state.finnhubKey !== prev.finnhubKey ||
        state.alphaVantageKey !== prev.alphaVantageKey ||
        state.polygonKey !== prev.polygonKey
      ) {
        if (keyDebounce) clearTimeout(keyDebounce)
        keyDebounce = setTimeout(() => {
          const symbol = useStockStore.getState().symbol
          useStockStore.getState().startProvider(symbol)
        }, 800)
      }
    })
    return () => {
      unsub()
      if (keyDebounce) clearTimeout(keyDebounce)
    }
  }, [])

  // Create/destroy music engine when playing state changes
  useEffect(() => {
    if (!isPlaying) {
      engineRef.current?.stop()
      engineRef.current = null
      return
    }

    const engine = new ToneEngine()
    engineRef.current = engine
    engine.start().catch((err) => {
      console.error('Failed to start engine:', err)
      setIsPlaying(false)
    })

    return () => {
      engine.stop()
      if (engineRef.current === engine) {
        engineRef.current = null
      }
    }
  }, [isPlaying, setIsPlaying])

  // Hot-swap engine when style changes while playing
  const lastStyleRef = useRef(useSettingsStore.getState().style)
  useEffect(() => {
    const unsub = useSettingsStore.subscribe((state) => {
      const newStyle = state.style
      if (newStyle === lastStyleRef.current) return
      lastStyleRef.current = newStyle
      if (!useMusicStore.getState().isPlaying) return
      // Stop old engine, start new one with new style
      engineRef.current?.stop()
      const engine = new ToneEngine()
      engineRef.current = engine
      engine.start().catch((err) => {
        console.error('Failed to hot-swap engine:', err)
        useMusicStore.getState().setIsPlaying(false)
      })
    })
    return unsub
  }, [])

  // Feed music parameters to engine — subscribe outside React render cycle
  useEffect(() => {
    let prev = useMusicStore.getState().parameters
    const unsub = useMusicStore.subscribe((state) => {
      if (state.parameters !== prev) {
        prev = state.parameters
        engineRef.current?.updateParameters(state.parameters)
      }
    })
    return unsub
  }, [])

  // Connect audio analyzer
  useAudioAnalyzer(isPlaying ? engineRef.current : null)

  // Keyboard shortcuts
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.target instanceof HTMLInputElement) return

      switch (e.key.toLowerCase()) {
        case ' ':
          e.preventDefault()
          useMusicStore.getState().setIsPlaying(!useMusicStore.getState().isPlaying)
          break
        case 'm':
          useMusicStore.getState().setVolume(useMusicStore.getState().volume > 0 ? 0 : 0.7)
          break
        case 'f':
          if (document.fullscreenElement) {
            document.exitFullscreen()
          } else {
            document.documentElement.requestFullscreen()
          }
          break
        case 's':
          setSettingsOpen((o) => !o)
          break
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [])

  return (
    <div className="relative w-full h-full no-select">
      <Visualizer />

      {/* UI Overlay */}
      <div className="absolute inset-0 pointer-events-none safe-top safe-bottom safe-left safe-right">
        {/* Center — price chart */}
        <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
          <PriceChart />
        </div>
        {/* Top left — ticker + price */}
        <div className="pointer-events-auto absolute top-3 left-3 sm:top-4 sm:left-4 flex flex-col gap-2 sm:gap-3 max-w-[55vw] sm:max-w-none">
          <TickerSelector />
          <PriceDisplay />
        </div>

        {/* Top right — settings + parameters */}
        <div className="pointer-events-auto absolute top-3 right-3 sm:top-4 sm:right-4 flex flex-col gap-2 sm:gap-3 items-end">
          <button
            onClick={() => setSettingsOpen(true)}
            className="glass px-3 py-2 sm:py-1.5 text-white/30 hover:text-white/60 active:text-white/80 text-xs cursor-pointer transition-colors min-w-[44px] min-h-[44px] sm:min-h-0 flex items-center justify-center"
            aria-label="Open settings"
          >
            <span className="hidden sm:inline">Settings [S]</span>
            <svg className="sm:hidden w-5 h-5" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M11.49 3.17c-.38-1.56-2.6-1.56-2.98 0a1.532 1.532 0 01-2.286.948c-1.372-.836-2.942.734-2.106 2.106.54.886.061 2.042-.947 2.287-1.561.379-1.561 2.6 0 2.978a1.532 1.532 0 01.947 2.287c-.836 1.372.734 2.942 2.106 2.106a1.532 1.532 0 012.287.947c.379 1.561 2.6 1.561 2.978 0a1.533 1.533 0 012.287-.947c1.372.836 2.942-.734 2.106-2.106a1.533 1.533 0 01.947-2.287c1.561-.379 1.561-2.6 0-2.978a1.532 1.532 0 01-.947-2.287c.836-1.372-.734-2.942-2.106-2.106a1.532 1.532 0 01-2.287-.947zM10 13a3 3 0 100-6 3 3 0 000 6z" clipRule="evenodd" />
            </svg>
          </button>
          <ParameterDisplay />
        </div>

        {/* Bottom left — chord display (hidden on very small screens when controls overlap) */}
        <div className="pointer-events-auto absolute bottom-16 left-3 sm:bottom-4 sm:left-4">
          <ChordDisplay />
        </div>

        {/* Bottom center — music controls */}
        <div className="pointer-events-auto absolute bottom-3 left-3 right-3 sm:bottom-4 sm:left-1/2 sm:right-auto sm:-translate-x-1/2 flex justify-center">
          <MusicControls />
        </div>
      </div>

      <SettingsPanel
        isOpen={settingsOpen}
        onClose={() => setSettingsOpen(false)}
      />
    </div>
  )
}
