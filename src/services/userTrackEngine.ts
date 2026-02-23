import * as Tone from 'tone'
import type { MusicEngine, MusicParameters, CandlePatternType } from '../types'
import { useStockStore } from '../stores/stockStore'
import { useSettingsStore } from '../stores/settingsStore'
import { useMusicStore } from '../stores/musicStore'
import { usePlaylistStore } from '../stores/playlistStore'
import { getTrackAudio } from './trackStorage'
import { STINGER_SOUND_MAP } from './stingerSounds'

/**
 * User Track Playback Engine
 *
 * Plays user-uploaded audio files through a stock-indicator-driven filter chain.
 * Implements the MusicEngine interface so it slots in as a drop-in replacement
 * for ToneEngine.
 *
 * Audio chain:
 *   Tone.Player → LPF → HPF → BPF → masterGain → analyzerNode
 *                                          ↑
 *                                    stingerGain ← stinger synths
 */
export class UserTrackEngine implements MusicEngine {
  private playing = false
  private masterGain: Tone.Gain | null = null
  private analyzerNode: GainNode | null = null
  private stingerGain: Tone.Gain | null = null
  private lastStingerTimestamp = 0

  // Filter chain (always connected, disabled = transparent)
  private lpf: Tone.Filter | null = null  // lowpass
  private hpf: Tone.Filter | null = null  // highpass
  private bpf: Tone.Filter | null = null  // bandpass

  // Player
  private player: Tone.Player | null = null
  private blobUrl: string | null = null

  // Track loading guard (prevents onstop recursion)
  private loadingTrack = false

  // Playlist subscription (for index changes)
  private playlistUnsub: (() => void) | null = null

  // Stinger polling
  private stingerRafId: number | null = null

  async start(): Promise<void> {
    if (this.playing) return
    await Tone.start()

    // Master gain → destination
    this.masterGain = new Tone.Gain(0.8).toDestination()

    // Raw gain node for audio analyzer
    const rawCtx = Tone.getContext().rawContext as AudioContext
    this.analyzerNode = rawCtx.createGain()
    this.masterGain.connect(this.analyzerNode)

    // Stinger gain bus
    this.stingerGain = new Tone.Gain(1).connect(this.masterGain)
    this.lastStingerTimestamp = 0

    // Filter chain: player → BPF → HPF → LPF → masterGain
    // Order: BPF first (narrow), then HPF (remove low), then LPF (remove high)
    this.lpf = new Tone.Filter({ type: 'lowpass', frequency: 20000, rolloff: -24 }).connect(this.masterGain)
    this.hpf = new Tone.Filter({ type: 'highpass', frequency: 20, rolloff: -24 }).connect(this.lpf)
    this.bpf = new Tone.Filter({ type: 'bandpass', frequency: 1000, Q: 0.1 }).connect(this.hpf)

    // Mark playing BEFORE loading track (loadCurrentTrack checks this.playing)
    this.playing = true

    // Load current track
    await this.loadCurrentTrack()

    // Subscribe to playlist index changes for immediate track switching
    let lastTrackId = usePlaylistStore.getState().tracks[usePlaylistStore.getState().currentIndex]?.id
    this.playlistUnsub = usePlaylistStore.subscribe((state) => {
      const newTrackId = state.tracks[state.currentIndex]?.id
      if (newTrackId !== lastTrackId) {
        lastTrackId = newTrackId
        if (this.playing) this.loadCurrentTrack()
      }
    })

    // Start stinger polling
    this.startStingerPoll()

    console.log('[UserTrackEngine] Started')
  }

  stop(): void {
    this.playing = false

    // Unsubscribe from playlist store
    if (this.playlistUnsub) {
      this.playlistUnsub()
      this.playlistUnsub = null
    }

    // Stop stinger polling
    if (this.stingerRafId !== null) {
      cancelAnimationFrame(this.stingerRafId)
      this.stingerRafId = null
    }

    // Silence immediately
    if (this.masterGain) {
      this.masterGain.gain.cancelScheduledValues(Tone.now())
      this.masterGain.gain.setValueAtTime(0, Tone.now())
    }

    // Dispose player
    if (this.player) {
      this.player.stop()
      this.player.dispose()
      this.player = null
    }

    // Revoke blob URL
    if (this.blobUrl) {
      URL.revokeObjectURL(this.blobUrl)
      this.blobUrl = null
    }

    // Dispose audio chain
    this.bpf?.dispose()
    this.hpf?.dispose()
    this.lpf?.dispose()
    this.stingerGain?.dispose()
    this.masterGain?.dispose()

    this.bpf = null
    this.hpf = null
    this.lpf = null
    this.stingerGain = null
    this.masterGain = null
    this.analyzerNode = null
    this.lastStingerTimestamp = 0

    console.log('[UserTrackEngine] Stopped')
  }

  updateParameters(params: MusicParameters): void {
    if (!this.playing) return

    // Apply volume
    const vol = useMusicStore.getState().volume
    if (this.masterGain) {
      this.masterGain.gain.rampTo(vol * 0.8, 0.1)
    }

    const stock = useStockStore.getState()
    const fx = useSettingsStore.getState().trackEffectRoutings

    // LPF: RSI → cutoff 200Hz–20kHz (exponential)
    if (fx.lowPassEnabled && this.lpf) {
      const rsiNorm = Math.max(0, Math.min(1, stock.rsi / 100))
      const cutoff = 200 * Math.pow(100, rsiNorm) // 200 → 20000
      this.lpf.frequency.rampTo(cutoff, 2)
    } else if (this.lpf) {
      this.lpf.frequency.rampTo(20000, 0.5)
    }

    // HPF: ADX → cutoff 20Hz–2kHz (exponential)
    if (fx.highPassEnabled && this.hpf) {
      const adxNorm = Math.max(0, Math.min(1, stock.adx / 100))
      const cutoff = 20 * Math.pow(100, adxNorm) // 20 → 2000
      this.hpf.frequency.rampTo(cutoff, 2)
    } else if (this.hpf) {
      this.hpf.frequency.rampTo(20, 0.5)
    }

    // BPF: ATR → center 200Hz–8kHz, Q=2
    if (fx.bandPassEnabled && this.bpf) {
      const atr = Math.max(0, Math.min(1, stock.atr))
      const center = 200 * Math.pow(40, atr) // 200 → 8000
      this.bpf.frequency.rampTo(center, 2)
      this.bpf.Q.rampTo(2, 0.5)
    } else if (this.bpf) {
      // Transparent: wide Q, center at 1kHz (doesn't matter with Q 0.1)
      this.bpf.frequency.rampTo(1000, 0.5)
      this.bpf.Q.rampTo(0.1, 0.5)
    }

    // Playback rate: ATR → 0.85x–1.15x
    if (fx.playbackRateEnabled && this.player && this.player.loaded) {
      const atr = Math.max(0, Math.min(1, stock.atr))
      const rate = 0.85 + atr * 0.3
      this.player.playbackRate = rate
    } else if (this.player && this.player.loaded) {
      this.player.playbackRate = 1
    }
  }

  getAudioNode(): AudioNode | null {
    return this.analyzerNode
  }

  isPlaying(): boolean {
    return this.playing
  }

  // ---------------------------------------------------------------------------
  // Track loading
  // ---------------------------------------------------------------------------

  async loadCurrentTrack(): Promise<void> {
    if (this.loadingTrack) return
    this.loadingTrack = true

    const { tracks, currentIndex } = usePlaylistStore.getState()
    if (tracks.length === 0) { this.loadingTrack = false; return }

    const track = tracks[currentIndex]
    if (!track) { this.loadingTrack = false; return }

    // Revoke old blob URL
    if (this.blobUrl) {
      URL.revokeObjectURL(this.blobUrl)
      this.blobUrl = null
    }

    // Dispose old player (onstop may fire — guard prevents recursion)
    if (this.player) {
      this.player.stop()
      this.player.dispose()
      this.player = null
    }

    try {
      const buffer = await getTrackAudio(track.id)
      if (!this.playing) { this.loadingTrack = false; return }

      const blob = new Blob([buffer], { type: track.mimeType })
      this.blobUrl = URL.createObjectURL(blob)

      this.player = new Tone.Player({
        url: this.blobUrl,
        onload: () => {
          if (!this.playing || !this.player) return
          this.player.connect(this.bpf!)
          this.player.start()
          console.log(`[UserTrackEngine] Playing: ${track.name}`)
        },
        onstop: () => {
          // Track ended naturally — advance playlist
          if (!this.playing || this.loadingTrack) return
          const { repeat } = usePlaylistStore.getState()
          if (repeat === 'one') {
            if (this.player && this.player.loaded) {
              this.player.start()
            }
          } else {
            usePlaylistStore.getState().advanceTrack()
            this.loadCurrentTrack()
          }
        },
      })
    } catch (err) {
      console.error('[UserTrackEngine] Failed to load track:', err)
    } finally {
      this.loadingTrack = false
    }
  }

  // ---------------------------------------------------------------------------
  // Stinger polling (rAF loop)
  // ---------------------------------------------------------------------------

  private startStingerPoll(): void {
    const poll = () => {
      if (!this.playing) return

      const stock = useStockStore.getState()
      const pat = stock.lastPattern
      if (pat && pat.timestamp !== this.lastStingerTimestamp) {
        this.lastStingerTimestamp = pat.timestamp
        this.triggerStinger(pat.type)
      }

      this.stingerRafId = requestAnimationFrame(poll)
    }
    this.stingerRafId = requestAnimationFrame(poll)
  }

  private triggerStinger(type: CandlePatternType): void {
    if (!this.stingerGain) return
    const settings = useSettingsStore.getState()
    const soundId = settings.stingerAssignments[type]
    if (soundId === 'off') return

    this.stingerGain.gain.value = settings.stingerVolume
    const def = STINGER_SOUND_MAP[soundId]
    if (def) def.play(this.stingerGain!)
  }
}
