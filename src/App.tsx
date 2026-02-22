import { Visualizer } from './components/Visualizer'
import { TickerSelector } from './components/ui/TickerSelector'
import { PriceDisplay } from './components/ui/PriceDisplay'
import { MusicControls } from './components/ui/MusicControls'
import { ParameterDisplay } from './components/ui/ParameterDisplay'
import { SettingsPanel } from './components/ui/SettingsPanel'
import { useStockStore } from './stores/stockStore'
import { useMusicStore } from './stores/musicStore'
import { useSettingsStore } from './stores/settingsStore'
import { useAudioAnalyzer } from './hooks/useAudioAnalyzer'
import { ToneEngine } from './services/toneEngine'
import { useEffect, useRef, useState, useCallback } from 'react'
import type { MusicEngine } from './types'

export function App() {
  const startSimulator = useStockStore((s) => s.startSimulator)
  const isPlaying = useMusicStore((s) => s.isPlaying)
  const setIsPlaying = useMusicStore((s) => s.setIsPlaying)
  const parameters = useMusicStore((s) => s.parameters)
  const [settingsOpen, setSettingsOpen] = useState(false)
  const [apiKey, setApiKey] = useState(() => localStorage.getItem('lyria-api-key') ?? '')
  const engineRef = useRef<MusicEngine | null>(null)

  // Start stock simulator on mount
  useEffect(() => {
    startSimulator('AAPL')
    return () => useStockStore.getState().stopSimulator()
  }, [startSimulator])

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

  // Feed music parameters to engine
  useEffect(() => {
    engineRef.current?.updateParameters(parameters)
  }, [parameters])

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

  const handleSaveApiKey = useCallback((key: string) => {
    setApiKey(key)
  }, [])

  return (
    <div className="relative w-full h-full">
      <Visualizer />

      {/* UI Overlay */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="pointer-events-auto absolute top-4 left-4 flex flex-col gap-3">
          <TickerSelector />
          <PriceDisplay />
        </div>

        <div className="pointer-events-auto absolute top-4 right-4 flex flex-col gap-3 items-end">
          <button
            onClick={() => setSettingsOpen(true)}
            className="glass px-3 py-1.5 text-white/30 hover:text-white/60 text-xs cursor-pointer transition-colors"
          >
            Settings [S]
          </button>
          <ParameterDisplay />
        </div>

        <div className="pointer-events-auto absolute bottom-4 left-1/2 -translate-x-1/2">
          <MusicControls />
        </div>
      </div>

      <SettingsPanel
        isOpen={settingsOpen}
        onClose={() => setSettingsOpen(false)}
        onSaveApiKey={handleSaveApiKey}
      />
    </div>
  )
}
