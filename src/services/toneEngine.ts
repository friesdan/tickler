import * as Tone from 'tone'
import type { MusicEngine, MusicParameters, CandlePatternType } from '../types'
import { useStockStore } from '../stores/stockStore'
import { useSettingsStore } from '../stores/settingsStore'
import { getStyleConfig, type StyleConfig, type Progression } from './styleConfigs'

/**
 * Tone.js Synthesizer Engine
 *
 * Multi-genre procedural music with chord progressions driven by market mood.
 * Each style has its own patterns, progressions, synths, and feel — all
 * driven by the same stock indicators via the StyleConfig system.
 */

// ---------------------------------------------------------------------------
// Music theory helpers
// ---------------------------------------------------------------------------

// Semitone intervals from root for each scale
const SCALES: Record<string, number[]> = {
  aeolian: [0, 2, 3, 5, 7, 8, 10],
  phrygianDom: [0, 1, 4, 5, 7, 8, 10],
  lydian: [0, 2, 4, 6, 7, 9, 11],
  dorian: [0, 2, 3, 5, 7, 9, 10],
  minor: [0, 2, 3, 5, 7, 8, 10],
  major: [0, 2, 4, 5, 7, 9, 11],
}

/** Build a chord (as MIDI note numbers) from scale degree, root, and scale. */
function chordFromDegree(
  scale: number[],
  root: number,
  degree: number,
  voicing: 'triad' | '7th' | 'sus' | '9th' | 'shell' = '7th',
): number[] {
  const idx = (i: number) => {
    const wrapped = ((degree + i) % scale.length + scale.length) % scale.length
    const octaveUp = Math.floor((degree + i) / scale.length)
    return root + scale[wrapped] + octaveUp * 12
  }
  if (voicing === 'triad') return [idx(0), idx(2), idx(4)]
  if (voicing === 'sus') return [idx(0), idx(1), idx(4)]
  if (voicing === 'shell') return [idx(0), idx(2), idx(6)] // root + 3rd + 7th
  if (voicing === '9th') return [idx(0), idx(2), idx(4), idx(6), idx(8)] // root + 3rd + 5th + 7th + 9th
  return [idx(0), idx(2), idx(4), idx(6)] // 7th
}

function midi(note: number): string {
  return Tone.Frequency(note, 'midi').toNote()
}

function pickPattern<T>(patterns: T[], energy: number): T {
  const idx = Math.min(Math.floor(energy * patterns.length), patterns.length - 1)
  return patterns[idx]
}

// ---------------------------------------------------------------------------
// Engine
// ---------------------------------------------------------------------------

export class ToneEngine implements MusicEngine {
  private playing = false
  private masterGain: Tone.Gain | null = null
  private analyzerNode: GainNode | null = null

  // Instruments
  private kick: Tone.MembraneSynth | null = null
  private hats: Tone.MetalSynth | null = null
  private acidSynth: Tone.MonoSynth | null = null
  private lowPass: Tone.Filter | null = null
  private pad: Tone.PolySynth | null = null
  private reverb: Tone.Reverb | null = null
  private delay: Tone.FeedbackDelay | null = null

  // Stinger system
  private stingerGain: Tone.Gain | null = null
  private lastStingerTimestamp = 0

  // Style config
  private styleConfig: StyleConfig = getStyleConfig('techno')

  // Progression state
  private currentMood = 'neutral'
  private progression: Progression = this.styleConfig.progressions.neutral[0]
  private chordIndex = 0 // which chord in the 4-chord progression
  private barCount = 0 // total bars elapsed
  private stepInBar = 0 // 0-15, current 16th step within bar

  // Pattern state (recomputed when energy/density change significantly)
  private kickPattern = this.styleConfig.kickPatterns[1]
  private hatPattern = this.styleConfig.hatPatterns[1]
  private bassPattern = this.styleConfig.bassPatterns[1]
  private energy = 0.5
  private density = 0.5
  private brightness = 0.5

  // Bass note pool for current chord
  private currentBassNotes: string[] = []

  // RSI-driven voicing override (sus when extreme)
  private overrideVoicing: 'sus' | null = null
  // Pad oscillator type (for hysteresis)
  private lastPadType: 'sine' | 'triangle' | 'square' | null = null

  // Scheduled event IDs for cleanup
  private eventIds: number[] = []

  async start(): Promise<void> {
    if (this.playing) return
    await Tone.start()

    // Read active style config
    const cfg = getStyleConfig(useSettingsStore.getState().style)
    this.styleConfig = cfg

    // Master gain → destination
    this.masterGain = new Tone.Gain(0.8).toDestination()

    // Raw gain node for audio analyzer
    const rawCtx = Tone.getContext().rawContext as AudioContext
    this.analyzerNode = rawCtx.createGain()
    this.masterGain.connect(this.analyzerNode)

    // Stinger gain bus — connected directly to master (bypasses reverb/delay)
    this.stingerGain = new Tone.Gain(1).connect(this.masterGain)
    this.lastStingerTimestamp = 0

    // --- Kick ---
    this.kick = new Tone.MembraneSynth({
      pitchDecay: cfg.synthOverrides.kick.pitchDecay ?? 0.05,
      octaves: cfg.synthOverrides.kick.octaves ?? 10,
      oscillator: { type: (cfg.synthOverrides.kick.oscillator?.type as OscillatorType) ?? 'sine' },
      envelope: (cfg.synthOverrides.kick.envelope as any) ?? { attack: 0.001, decay: 0.4, sustain: 0.01, release: 1.4 },
    }).connect(this.masterGain)
    this.kick.volume.value = cfg.synthOverrides.kick.volume ?? -4

    // --- Hi-hats ---
    this.hats = new Tone.MetalSynth({
      envelope: (cfg.synthOverrides.hats.envelope as any) ?? { attack: 0.001, decay: 0.06, release: 0.08 },
      harmonicity: cfg.synthOverrides.hats.harmonicity ?? 5.1,
      modulationIndex: cfg.synthOverrides.hats.modulationIndex ?? 32,
      resonance: cfg.synthOverrides.hats.resonance ?? 4000,
      octaves: cfg.synthOverrides.hats.octaves ?? 1.5,
    }).connect(this.masterGain)
    this.hats.volume.value = cfg.synthOverrides.hats.volume ?? -18

    // --- Bass: MonoSynth → filter → delay ---
    this.lowPass = new Tone.Filter(800, 'lowpass', -24).connect(this.masterGain)
    this.delay = new Tone.FeedbackDelay('8n.', 0.2).connect(this.masterGain)
    this.delay.wet.value = 0.15

    this.acidSynth = new Tone.MonoSynth({
      oscillator: { type: cfg.synthOverrides.bass.oscillator.type as OscillatorType },
      envelope: cfg.synthOverrides.bass.envelope as any,
      filterEnvelope: (cfg.synthOverrides.bass.filterEnvelope as any) ?? {
        attack: 0.01,
        decay: 0.15,
        sustain: 0.05,
        release: 0.1,
        baseFrequency: 150,
        octaves: 4,
      },
    }).connect(this.lowPass)
    this.acidSynth.connect(this.delay)
    this.acidSynth.volume.value = cfg.synthOverrides.bass.volume ?? -10

    // --- Pad: PolySynth → reverb ---
    this.reverb = new Tone.Reverb(5).connect(this.masterGain)
    this.pad = new Tone.PolySynth(Tone.Synth).connect(this.reverb)
    this.pad.set({
      oscillator: { type: cfg.synthOverrides.pad.oscillator.type as OscillatorType },
      envelope: cfg.synthOverrides.pad.envelope as any,
    })
    this.pad.volume.value = cfg.synthOverrides.pad.volume

    // Init state
    this.chordIndex = 0
    this.barCount = 0
    this.stepInBar = 0
    this.kickPattern = cfg.kickPatterns[1] ?? cfg.kickPatterns[0]
    this.hatPattern = cfg.hatPatterns[1] ?? cfg.hatPatterns[0]
    this.bassPattern = cfg.bassPatterns[1] ?? cfg.bassPatterns[0]
    this.selectProgression('neutral')
    this.advanceChord()

    // Master sequencer: fires every 16th note
    this.scheduleMasterClock()

    const transport = Tone.getTransport()
    transport.bpm.value = cfg.defaultTempo
    transport.start()

    this.playing = true
    console.log(`[ToneEngine] Started (${cfg.name})`)
  }

  /** Single master clock drives everything in sync */
  private scheduleMasterClock() {
    const transport = Tone.getTransport()

    this.eventIds.push(
      transport.scheduleRepeat((time) => {
        this.onStep(time)
        this.stepInBar++
        if (this.stepInBar >= 16) {
          this.stepInBar = 0
          this.barCount++
          // Advance chord every bar (4 chords = 4 bars = 1 full cycle)
          this.advanceChord()
        }
      }, '16n'),
    )
  }

  /** Called on every 16th note step */
  private onStep(time: number) {
    const step = this.stepInBar
    const cfg = this.styleConfig

    // Apply swing: delay odd-numbered 16th steps
    let t = time
    if (cfg.swing > 0 && step % 2 === 1) {
      const sixteenthDur = 60 / (Tone.getTransport().bpm.value * 4)
      t += cfg.swing * sixteenthDur * 0.5
    }

    // --- Kick ---
    const kickVel = this.kickPattern[step]
    if (kickVel > 0) {
      this.kick?.triggerAttackRelease('C1', '8n', t, kickVel)
    }

    // --- Hi-hats ---
    const hatVel = this.hatPattern[step]
    if (hatVel > 0) {
      // Add slight humanization
      const hatDecay = hatVel > 0.7 ? 0.06 : 0.03
      this.hats?.triggerAttackRelease('C4', hatDecay, t, hatVel * 0.8)
    }

    // --- Bass ---
    const bassHit = this.bassPattern[step]
    if (bassHit > 0 && this.currentBassNotes.length > 0) {
      // Mostly root, occasionally a scale tone for movement
      let note: string
      if (Math.random() < 0.7) {
        note = this.currentBassNotes[0] // root
      } else {
        note = this.currentBassNotes[Math.floor(Math.random() * this.currentBassNotes.length)]
      }
      // Accent slides: glide to note on some steps
      const glide = step % 4 !== 0 && Math.random() < 0.3
      if (this.acidSynth) {
        this.acidSynth.portamento = glide ? 0.08 : 0
      }
      this.acidSynth?.triggerAttackRelease(note, '16n', t, bassHit)
    }

    // --- Stinger: poll for new candlestick patterns ---
    if (step === 0) {
      const stock = useStockStore.getState()
      const pat = stock.lastPattern
      if (pat && pat.timestamp !== this.lastStingerTimestamp) {
        this.lastStingerTimestamp = pat.timestamp
        this.triggerStinger(pat.type, t)
      }
    }
  }

  // ---------------------------------------------------------------------------
  // Stinger sound system — on-demand synths, disposed after playback
  // ---------------------------------------------------------------------------

  private triggerStinger(type: CandlePatternType, time: number) {
    if (!this.stingerGain) return

    // Check if this stinger type is enabled
    const settings = useSettingsStore.getState()
    if (!settings.stingers[type]) return

    // Apply stinger volume
    this.stingerGain.gain.value = settings.stingerVolume

    console.log(`[ToneEngine] Stinger: ${type}`)

    switch (type) {
      case 'doji':             this.playDoji(time); break
      case 'hammer':           this.playHammer(time); break
      case 'shootingStar':     this.playShootingStar(time); break
      case 'bullishEngulfing': this.playBullishEngulfing(time); break
      case 'bearishEngulfing': this.playBearishEngulfing(time); break
      case 'morningStar':      this.playMorningStar(time); break
      case 'eveningStar':      this.playEveningStar(time); break
    }
  }

  /** Doji — high crystalline FM ping at E6 */
  private playDoji(time: number) {
    const synth = new Tone.FMSynth({
      harmonicity: 8,
      modulationIndex: 12,
      oscillator: { type: 'sine' },
      modulation: { type: 'triangle' },
      envelope: { attack: 0.001, decay: 0.3, sustain: 0, release: 0.5 },
      modulationEnvelope: { attack: 0.001, decay: 0.2, sustain: 0, release: 0.3 },
    }).connect(this.stingerGain!)
    synth.volume.value = -2
    synth.triggerAttackRelease('E6', '8n', time)
    setTimeout(() => synth.dispose(), 2000)
  }

  /** Hammer — rising pluck double-tap G3 → D4 */
  private playHammer(time: number) {
    const synth = new Tone.PluckSynth({
      attackNoise: 4,
      dampening: 3000,
      resonance: 0.95,
    }).connect(this.stingerGain!)
    synth.volume.value = -1
    synth.triggerAttack('G3', time)
    synth.triggerAttack('D4', time + 0.12)
    setTimeout(() => synth.dispose(), 2500)
  }

  /** Shooting Star — descending FM zap with pitch sweep C6 → C4 */
  private playShootingStar(time: number) {
    const synth = new Tone.FMSynth({
      harmonicity: 3,
      modulationIndex: 20,
      oscillator: { type: 'sine' },
      modulation: { type: 'square' },
      envelope: { attack: 0.001, decay: 0.5, sustain: 0, release: 0.3 },
      modulationEnvelope: { attack: 0.001, decay: 0.4, sustain: 0, release: 0.2 },
    }).connect(this.stingerGain!)
    synth.volume.value = -2
    synth.triggerAttackRelease('C6', '4n', time)
    synth.frequency.exponentialRampTo(Tone.Frequency('C4').toFrequency(), 0.4, time)
    setTimeout(() => synth.dispose(), 2500)
  }

  /** Bullish Engulfing — major power chord stab C4-G4-C5 with AM synth */
  private playBullishEngulfing(time: number) {
    const synth = new Tone.PolySynth(Tone.AMSynth).connect(this.stingerGain!)
    synth.set({
      harmonicity: 2,
      oscillator: { type: 'square' },
      modulation: { type: 'sawtooth' },
      envelope: { attack: 0.005, decay: 0.4, sustain: 0.1, release: 0.6 },
      modulationEnvelope: { attack: 0.01, decay: 0.3, sustain: 0, release: 0.4 },
    })
    synth.volume.value = 0
    synth.triggerAttackRelease(['C4', 'G4', 'C5'], '8n', time)
    setTimeout(() => synth.dispose(), 3000)
  }

  /** Bearish Engulfing — diminished chord stab C3-Gb3-Bb3 with FM + poly */
  private playBearishEngulfing(time: number) {
    const synth = new Tone.PolySynth(Tone.FMSynth).connect(this.stingerGain!)
    synth.set({
      harmonicity: 1.5,
      modulationIndex: 8,
      oscillator: { type: 'sine' },
      modulation: { type: 'triangle' },
      envelope: { attack: 0.005, decay: 0.5, sustain: 0.05, release: 0.8 },
      modulationEnvelope: { attack: 0.01, decay: 0.4, sustain: 0, release: 0.5 },
    })
    synth.volume.value = -1
    synth.triggerAttackRelease(['C3', 'Gb3', 'Bb3'], '8n', time)
    setTimeout(() => synth.dispose(), 3000)
  }

  /** Morning Star — ascending 3-note pluck fanfare C4 → E4 → G5 */
  private playMorningStar(time: number) {
    const synth = new Tone.PluckSynth({
      attackNoise: 6,
      dampening: 4000,
      resonance: 0.97,
    }).connect(this.stingerGain!)
    synth.volume.value = 0
    synth.triggerAttack('C4', time)
    synth.triggerAttack('E4', time + 0.1)
    synth.triggerAttack('G5', time + 0.2)
    setTimeout(() => synth.dispose(), 3000)
  }

  /** Evening Star — descending 3-note FM doom Eb5 → Bb3 → Gb2 */
  private playEveningStar(time: number) {
    const synth = new Tone.FMSynth({
      harmonicity: 2.5,
      modulationIndex: 15,
      oscillator: { type: 'sine' },
      modulation: { type: 'square' },
      envelope: { attack: 0.005, decay: 0.6, sustain: 0, release: 0.5 },
      modulationEnvelope: { attack: 0.005, decay: 0.5, sustain: 0, release: 0.3 },
    }).connect(this.stingerGain!)
    synth.volume.value = -1
    synth.triggerAttackRelease('Eb5', '16n', time)
    setTimeout(() => {
      synth.triggerAttackRelease('Bb3', '16n')
    }, 120)
    setTimeout(() => {
      synth.triggerAttackRelease('Gb2', '8n')
    }, 260)
    setTimeout(() => synth.dispose(), 3000)
  }

  /** Move to the next chord in the progression, update bass notes and pad */
  private advanceChord() {
    const prog = this.progression
    const scale = SCALES[prog.scale] ?? SCALES.aeolian
    const degree = prog.degrees[this.chordIndex]
    const voicing = this.overrideVoicing ?? prog.voicing[this.chordIndex]

    // Build pad chord in octave 4 (MIDI 60 = C4)
    const padMidi = chordFromDegree(scale, 60, degree, voicing)
    const padNotes = padMidi.map(midi)

    // Release previous pad and trigger new
    this.pad?.releaseAll(Tone.now())
    this.pad?.triggerAttack(padNotes, Tone.now() + 0.05)

    // Build bass notes: root + 5th in octave 2 (MIDI 36 = C2)
    const rootMidi = 36 + scale[degree % scale.length]
    const fifthDeg = (degree + 4) % scale.length
    const fifthMidi = 36 + scale[fifthDeg]
    // Also add octave of root
    this.currentBassNotes = [midi(rootMidi), midi(fifthMidi), midi(rootMidi + 12)]

    // Advance chord index
    this.chordIndex = (this.chordIndex + 1) % prog.degrees.length
  }

  /** Pick a new chord progression for the given mood.
   *  MACD histogram biases selection: positive → first half of pool (ascending/optimistic),
   *  negative → second half (descending/darker). */
  private selectProgression(mood: string, macdHistogram = 0) {
    const pool = this.styleConfig.progressions[mood] ?? this.styleConfig.progressions.neutral
    if (pool.length <= 1) {
      this.progression = pool[0]
    } else if (macdHistogram > 0) {
      // Pick from first half (ascending/optimistic progressions)
      const half = Math.ceil(pool.length / 2)
      this.progression = pool[Math.floor(Math.random() * half)]
    } else if (macdHistogram < 0) {
      // Pick from second half (descending/darker progressions)
      const half = Math.floor(pool.length / 2)
      this.progression = pool[half + Math.floor(Math.random() * (pool.length - half))]
    } else {
      this.progression = pool[Math.floor(Math.random() * pool.length)]
    }
    this.chordIndex = 0
  }

  stop(): void {
    this.playing = false

    // Immediately silence output — kills pad tails, delay trails, everything
    if (this.masterGain) {
      this.masterGain.gain.cancelScheduledValues(Tone.now())
      this.masterGain.gain.setValueAtTime(0, Tone.now())
    }

    const transport = Tone.getTransport()
    transport.stop()
    transport.cancel()
    for (const id of this.eventIds) transport.clear(id)
    this.eventIds = []

    this.pad?.releaseAll()

    this.kick?.dispose()
    this.hats?.dispose()
    this.acidSynth?.dispose()
    this.lowPass?.dispose()
    this.delay?.dispose()
    this.pad?.dispose()
    this.stingerGain?.dispose()
    this.reverb?.dispose()
    this.masterGain?.dispose()

    this.stingerGain = null
    this.lastStingerTimestamp = 0
    this.kick = null
    this.hats = null
    this.acidSynth = null
    this.lowPass = null
    this.delay = null
    this.pad = null
    this.reverb = null
    this.masterGain = null
    this.analyzerNode = null

    console.log('[ToneEngine] Stopped')
  }

  updateParameters(params: MusicParameters): void {
    if (!this.playing) return

    const stock = useStockStore.getState()
    const r = useSettingsStore.getState().routings
    const cfg = this.styleConfig

    // Tempo
    Tone.getTransport().bpm.rampTo(params.tempo, 2)

    // Mood change → pick new progression
    // MACD histogram sign biases progression selection within mood
    if (params.mood !== this.currentMood) {
      this.currentMood = params.mood
      this.selectProgression(
        params.mood,
        r.macdToProgression ? stock.macdHistogram : 0,
      )
    }

    // ADX → drum pattern grid tier (use style-specific patterns)
    if (r.adxToDrums) {
      const adxNorm = Math.min(stock.adx / 100, 1)
      if (Math.abs(adxNorm - this.energy) > 0.1) {
        this.energy = adxNorm
        this.kickPattern = pickPattern(cfg.kickPatterns, adxNorm)
        this.bassPattern = pickPattern(cfg.bassPatterns, adxNorm)
      }
    }

    // Hat density from density param
    if (r.adxToHats) {
      const d = params.density
      if (Math.abs(d - this.density) > 0.1) {
        this.density = d
        this.hatPattern = pickPattern(cfg.hatPatterns, d)
      }
    }

    // RSI extremes → chord voicing tension
    if (r.rsiToChordTension && (stock.rsi > 75 || stock.rsi < 25)) {
      this.overrideVoicing = 'sus'
    } else {
      this.overrideVoicing = null
    }

    // Filter cutoff from brightness/RSI — use style config range
    if (r.rsiToBrightness) {
      this.brightness = params.brightness
      const [minF, maxF] = cfg.filterRange
      const cutoff = minF + params.brightness * (maxF - minF)
      this.lowPass?.frequency.rampTo(cutoff, 2)
    } else {
      const mid = (cfg.filterRange[0] + cfg.filterRange[1]) / 2
      this.lowPass?.frequency.rampTo(mid, 2)
    }

    // ATR → delay wet + reverb — use style config reverb range
    if (r.atrToSpace) {
      const atr = stock.atr
      if (this.delay) {
        this.delay.feedback.rampTo(0.05 + atr * 0.4, 1)
        this.delay.wet.rampTo(0.05 + atr * 0.3, 1)
      }
      if (this.reverb) {
        const [minR, maxR] = cfg.reverbWetRange
        this.reverb.wet.rampTo(minR + atr * (maxR - minR), 1)
      }
    } else {
      // Moderate defaults when routing is off
      if (this.delay) {
        this.delay.feedback.rampTo(0.2, 1)
        this.delay.wet.rampTo(0.15, 1)
      }
      if (this.reverb) {
        const mid = (cfg.reverbWetRange[0] + cfg.reverbWetRange[1]) / 2
        this.reverb.wet.rampTo(mid, 1)
      }
    }

    // Pad volume: louder when calm, quieter when chaotic
    if (this.pad) {
      const padVol = cfg.synthOverrides.pad.volume + (1 - params.energy) * 10
      this.pad.volume.rampTo(padVol, 1)
    }

    // EMA/macroTrend → pad character (oscillator type) with hysteresis
    if (r.emaToPad && this.pad) {
      let padType: 'sine' | 'triangle' | 'square' = 'triangle'
      // Hysteresis: only switch at ±0.3, prevents flickering near boundary
      if (stock.macroTrend > 0.3) padType = 'sine'
      else if (stock.macroTrend < -0.3) padType = 'square'
      else padType = this.lastPadType ?? 'triangle' // hold previous type in dead zone
      if (padType !== this.lastPadType) {
        this.lastPadType = padType
        this.pad.set({ oscillator: { type: padType } })
      }
    }

    // Volatility → filter envelope intensity + bass accent
    if (r.volToBassFilter && this.acidSynth && stock.volatility !== undefined) {
      this.acidSynth.set({ filterEnvelope: { octaves: 2 + stock.volatility * 6 } })
    } else if (!r.volToBassFilter && this.acidSynth) {
      this.acidSynth.set({ filterEnvelope: { octaves: 4 } })
    }
  }

  getAudioNode(): AudioNode | null {
    return this.analyzerNode
  }

  isPlaying(): boolean {
    return this.playing
  }
}
