import { useRef, useEffect, useCallback } from 'react'
import { AudioAnalyzer } from '../services/audioAnalyzer'
import { useMusicStore } from '../stores/musicStore'
import type { MusicEngine } from '../types'

/**
 * Hook that connects an audio analyzer to a music engine
 * and pumps audio data into the music store every frame.
 */
export function useAudioAnalyzer(engine: MusicEngine | null) {
  const analyzerRef = useRef<AudioAnalyzer | null>(null)
  const rafRef = useRef<number>(0)

  const tick = useCallback(() => {
    if (analyzerRef.current) {
      const data = analyzerRef.current.analyze()
      useMusicStore.getState().setAudioData(data)
    }
    rafRef.current = requestAnimationFrame(tick)
  }, [])

  useEffect(() => {
    if (!engine) return

    const audioNode = engine.getAudioNode()
    if (!audioNode || !audioNode.context) return

    const ctx = audioNode.context as AudioContext
    const analyzer = new AudioAnalyzer(ctx)
    analyzer.connectSource(audioNode)
    analyzerRef.current = analyzer

    // Start analysis loop
    rafRef.current = requestAnimationFrame(tick)

    return () => {
      cancelAnimationFrame(rafRef.current)
      analyzerRef.current = null
    }
  }, [engine, tick])
}
