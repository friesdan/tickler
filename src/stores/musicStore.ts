import { create } from 'zustand'
import type { AudioData, MusicParameters } from '../types'

export interface ChordInfo {
  symbols: string[]     // chord names like "Dm7", "G7", "Cmaj7"
  nashville: string[]   // Nashville notation like "2-7", "57", "1△7"
  activeIndex: number   // which chord is currently playing (0-3)
  mood: string
}

interface MusicStore {
  // Music parameters derived from stock data
  parameters: MusicParameters
  targetParameters: MusicParameters
  setTargetParameters: (params: MusicParameters) => void
  lerpParameters: (dt: number) => void

  // Audio analysis data from playing music
  audioData: AudioData
  setAudioData: (data: AudioData) => void

  // Chord progression display
  chordInfo: ChordInfo | null
  setChordInfo: (info: ChordInfo | null) => void

  // Engine state
  engineType: 'lyria' | 'ace-step' | 'tone' | 'none'
  isPlaying: boolean
  volume: number
  setEngineType: (type: 'lyria' | 'ace-step' | 'tone' | 'none') => void
  setIsPlaying: (playing: boolean) => void
  setVolume: (vol: number) => void
}

const DEFAULT_PARAMS: MusicParameters = {
  tempo: 90,
  brightness: 0.5,
  density: 0.3,
  mood: 'neutral',
  energy: 0.3,
  key: 'C major',
}

const EMPTY_AUDIO: AudioData = {
  frequencyData: new Float32Array(128),
  waveformData: new Float32Array(128),
  bass: 0,
  mid: 0,
  treble: 0,
  rms: 0,
}

function lerpVal(a: number, b: number, t: number): number {
  return a + (b - a) * t
}

export const useMusicStore = create<MusicStore>((set, get) => ({
  parameters: { ...DEFAULT_PARAMS },
  targetParameters: { ...DEFAULT_PARAMS },
  audioData: EMPTY_AUDIO,
  chordInfo: null,
  engineType: 'none',
  isPlaying: false,
  volume: 0.7,

  setTargetParameters: (params) => set({ targetParameters: params }),

  lerpParameters: (dt) => {
    const { parameters: p, targetParameters: t } = get()
    const smoothing = 1.5 // how fast params converge (lower = smoother transitions)
    const factor = 1 - Math.exp(-smoothing * dt)
    set({
      parameters: {
        tempo: lerpVal(p.tempo, t.tempo, factor),
        brightness: lerpVal(p.brightness, t.brightness, factor),
        density: lerpVal(p.density, t.density, factor),
        energy: lerpVal(p.energy, t.energy, factor),
        mood: t.mood, // discrete, no lerp
        key: t.key,
      },
    })
  },

  setChordInfo: (info) => set({ chordInfo: info }),
  setAudioData: (data) => set({ audioData: data }),

  setEngineType: (type) => set({ engineType: type }),
  setIsPlaying: (playing) => set({ isPlaying: playing }),
  setVolume: (vol) => set({ volume: vol }),
}))
