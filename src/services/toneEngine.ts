import * as Tone from 'tone'
import type { MusicEngine, MusicParameters, CandlePatternType } from '../types'
import { useStockStore } from '../stores/stockStore'
import { useSettingsStore } from '../stores/settingsStore'
import { useMusicStore } from '../stores/musicStore'
import { getStyleConfig, type StyleConfig, type Progression, type DrumKit } from './styleConfigs'
import { STINGER_SOUND_MAP } from './stingerSounds'

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
// Chord symbol & Nashville number computation
// ---------------------------------------------------------------------------

const NOTE_NAMES = ['C', 'Db', 'D', 'Eb', 'E', 'F', 'Gb', 'G', 'Ab', 'A', 'Bb', 'B']

function computeChordSymbol(
  scaleIntervals: number[],
  degree: number,
  voicing: string,
): { name: string; nashville: string } {
  const len = scaleIntervals.length
  const idx = (d: number) => {
    const wrapped = ((d % len) + len) % len
    const octUp = Math.floor(d / len)
    return scaleIntervals[wrapped] + octUp * 12
  }

  const rootSemitone = idx(degree)
  const rootNote = NOTE_NAMES[rootSemitone % 12]
  const thirdInterval = idx(degree + 2) - rootSemitone
  const seventhInterval = idx(degree + 6) - rootSemitone

  const isMajor = thirdInterval === 4
  const isMinor = thirdInterval === 3
  const isMaj7 = seventhInterval === 11
  const num = (degree % len) + 1

  let name = rootNote
  let nash = `${num}`

  switch (voicing) {
    case 'triad':
      if (isMinor) { name += 'm'; nash += '-' }
      break
    case '7th':
    case 'shell':
      if (isMajor && isMaj7) { name += '△7'; nash += '△7' }
      else if (isMajor) { name += '7'; nash += '7' }
      else if (isMinor) { name += 'm7'; nash += '-7' }
      else { name += '7'; nash += '7' }
      break
    case '9th':
      if (isMajor && isMaj7) { name += '△9'; nash += '△9' }
      else if (isMajor) { name += '9'; nash += '9' }
      else if (isMinor) { name += 'm9'; nash += '-9' }
      else { name += '9'; nash += '9' }
      break
    case 'sus':
      name += 'sus'; nash += 'sus'
      break
  }

  return { name, nashville: nash }
}

// ---------------------------------------------------------------------------
// Drum kit sample mappings — maps drumKit type to sample files
// ---------------------------------------------------------------------------

const DRUM_KIT_SAMPLES: Record<DrumKit, Record<string, string>> = {
  electronic: {
    C1: '/samples/drums/kick.mp3',
    D1: '/samples/drums/clap.mp3',         // techno uses clap
    E1: '/samples/drums/hihat-closed.mp3',
    F1: '/samples/drums/hihat-open.mp3',
  },
  acoustic: {
    C1: '/samples/drums/kick.mp3',
    D1: '/samples/drums/snare.mp3',
    E1: '/samples/drums/hihat-closed.mp3',
    F1: '/samples/drums/hihat-open.mp3',
  },
  brush: {
    C1: '/samples/drums/kick-jazz.mp3',    // low-passed kick (no high-end click)
    D1: '/samples/drums/snare-brush.wav',  // synthesized brush (no real sample available)
    E1: '/samples/drums/ride.mp3',         // ride bow
    F1: '/samples/drums/ride-bell.wav',    // ride bell (synthesized)
  },
  minimal: {
    C1: '/samples/drums/kick.mp3',
    D1: '/samples/drums/snare.mp3',
    E1: '/samples/drums/hihat-closed.mp3',
    F1: '/samples/drums/hihat-open.mp3',
  },
}

// Piano samples from Tone.js CDN (Salamander grand piano)
const PIANO_SAMPLE_URLS: Record<string, string> = {
  A1: 'https://tonejs.github.io/audio/salamander/A1.mp3',
  A2: 'https://tonejs.github.io/audio/salamander/A2.mp3',
  A3: 'https://tonejs.github.io/audio/salamander/A3.mp3',
  A4: 'https://tonejs.github.io/audio/salamander/A4.mp3',
  A5: 'https://tonejs.github.io/audio/salamander/A5.mp3',
  A6: 'https://tonejs.github.io/audio/salamander/A6.mp3',
  C2: 'https://tonejs.github.io/audio/salamander/C2.mp3',
  C3: 'https://tonejs.github.io/audio/salamander/C3.mp3',
  C4: 'https://tonejs.github.io/audio/salamander/C4.mp3',
  C5: 'https://tonejs.github.io/audio/salamander/C5.mp3',
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

  // Sample-based instruments
  private drumSampler: Tone.Sampler | null = null
  private pianoSampler: Tone.Sampler | null = null
  private drumSamplesLoaded = false
  private pianoSamplesLoaded = false

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
  private snarePattern = this.styleConfig.snarePatterns[1]
  private bassPattern = this.styleConfig.bassPatterns[1]
  private energy = 0.5
  private density = 0.5
  private brightness = 0.5

  // Bass note pool for current chord
  private currentBassNotes: string[] = []
  // Walking bass state — pre-computed 4-note line per bar
  private walkingBassBar: string[] = [] // [beat1, beat2, beat3, beat4]
  private walkIndex = 0
  private nextChordRoot = 0 // MIDI note of next chord root for approach tones

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
    if (cfg.padSynthType === 'fmsynth') {
      this.pad = new Tone.PolySynth(Tone.FMSynth).connect(this.reverb)
      ;(this.pad as Tone.PolySynth<Tone.FMSynth>).set({
        oscillator: { type: cfg.synthOverrides.pad.oscillator.type as OscillatorType },
        envelope: cfg.synthOverrides.pad.envelope as any,
        harmonicity: cfg.synthOverrides.pad.harmonicity ?? 3,
        modulationIndex: cfg.synthOverrides.pad.modulationIndex ?? 10,
      } as any)
    } else {
      this.pad = new Tone.PolySynth(Tone.Synth).connect(this.reverb)
      this.pad.set({
        oscillator: { type: cfg.synthOverrides.pad.oscillator.type as OscillatorType },
        envelope: cfg.synthOverrides.pad.envelope as any,
      })
    }
    this.pad.volume.value = cfg.synthOverrides.pad.volume

    // --- Drum Sampler ---
    this.drumSamplesLoaded = false
    const kitSamples = DRUM_KIT_SAMPLES[cfg.drumKit]
    this.drumSampler = new Tone.Sampler({
      urls: kitSamples,
      onload: () => {
        this.drumSamplesLoaded = true
        console.log(`[ToneEngine] Drum samples loaded (${cfg.drumKit})`)
      },
    }).connect(this.masterGain)

    // --- Piano Sampler (for jazz/lofi styles that use fmsynth pad) ---
    this.pianoSamplesLoaded = false
    if (cfg.padSynthType === 'fmsynth') {
      this.pianoSampler = new Tone.Sampler({
        urls: PIANO_SAMPLE_URLS,
        onload: () => {
          this.pianoSamplesLoaded = true
          console.log('[ToneEngine] Piano samples loaded')
        },
      }).connect(this.reverb!)
      this.pianoSampler.volume.value = cfg.synthOverrides.pad.volume
    }

    // Init state
    this.chordIndex = 0
    this.barCount = 0
    this.stepInBar = 0
    this.kickPattern = cfg.kickPatterns[1] ?? cfg.kickPatterns[0]
    this.hatPattern = cfg.hatPatterns[1] ?? cfg.hatPatterns[0]
    this.snarePattern = cfg.snarePatterns[1] ?? cfg.snarePatterns[0]
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
    const mix = useSettingsStore.getState().mixer

    // Apply swing: delay odd-numbered 16th steps
    let t = time
    if (cfg.swing > 0 && step % 2 === 1) {
      const sixteenthDur = 60 / (Tone.getTransport().bpm.value * 4)
      t += cfg.swing * sixteenthDur * 0.5
    }

    // --- Kick ---
    const kickVel = this.kickPattern[step] * mix.kick
    if (kickVel > 0) {
      if (this.drumSamplesLoaded && this.drumSampler) {
        this.drumSampler.triggerAttackRelease('C1', '8n', t, kickVel)
      } else {
        this.kick?.triggerAttackRelease('C1', '8n', t, kickVel)
      }
    }

    // --- Snare ---
    const snareVel = this.snarePattern[step] * mix.snare
    if (snareVel > 0) {
      if (this.drumSamplesLoaded && this.drumSampler) {
        this.drumSampler.triggerAttackRelease('D1', '8n', t, snareVel)
      }
      // No synth fallback for snare — it's new functionality
    }

    // --- Hi-hats / Ride ---
    const hatRaw = this.hatPattern[step]
    if (hatRaw > 0 && mix.hats > 0) {
      if (this.drumSamplesLoaded && this.drumSampler) {
        if (hatRaw > 1.0) {
          // Open hat / ride bell
          const vel = (hatRaw - 1.0) * mix.hats
          this.drumSampler.triggerAttackRelease('F1', '4n', t, vel * 0.8)
        } else {
          // Closed hat / ride ping
          this.drumSampler.triggerAttackRelease('E1', '16n', t, hatRaw * mix.hats * 0.8)
        }
      } else {
        // Synth fallback
        const hatVel = Math.min(hatRaw, 1.0) * mix.hats
        const hatDecay = hatVel > 0.7 ? 0.06 : 0.03
        this.hats?.triggerAttackRelease('C4', hatDecay, t, hatVel * 0.8)
      }
    }

    // --- Bass ---
    const bassHit = this.bassPattern[step]
    const bassDur = cfg.bassNoteDuration ?? '16n'
    if (bassHit > 0 && this.currentBassNotes.length > 0 && mix.bass > 0) {
      let note: string
      if (cfg.bassMode === 'walking' && this.walkingBassBar.length === 4) {
        // Walking bass: pre-computed 4-note line per bar
        // root (beat1) → chord tone (beat2) → scale tone (beat3) → approach (beat4)
        note = this.walkingBassBar[this.walkIndex % 4]
        this.walkIndex++
        // Gentle portamento for walking feel
        if (this.acidSynth) {
          this.acidSynth.portamento = 0.04
        }
      } else if (cfg.bassMode === 'walking') {
        // Fallback if walkingBassBar not ready
        note = this.currentBassNotes[this.walkIndex % this.currentBassNotes.length]
        this.walkIndex++
        if (this.acidSynth) {
          this.acidSynth.portamento = 0.04
        }
      } else {
        // Random mode: mostly root, occasionally a scale tone
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
      }
      this.acidSynth?.triggerAttackRelease(note, bassDur, t, bassHit * mix.bass)
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
  // Stinger sound system — delegates to stingerSounds registry
  // ---------------------------------------------------------------------------

  private triggerStinger(type: CandlePatternType, time: number) {
    if (!this.stingerGain) return

    const settings = useSettingsStore.getState()
    const soundId = settings.stingerAssignments[type]
    if (soundId === 'off') return

    this.stingerGain.gain.value = settings.stingerVolume

    const def = STINGER_SOUND_MAP[soundId]
    if (def) def.play(this.stingerGain!, time)
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

    // Release previous pad and trigger new — use piano sampler if loaded
    if (this.pianoSamplesLoaded && this.pianoSampler) {
      this.pianoSampler.releaseAll(Tone.now())
      this.pianoSampler.triggerAttack(padNotes, Tone.now() + 0.05)
      // Piano replaces pad — silence any lingering pad notes
      this.pad?.releaseAll(Tone.now())
    } else {
      this.pad?.releaseAll(Tone.now())
      this.pad?.triggerAttack(padNotes, Tone.now() + 0.05)
    }

    // Build bass notes in octave 2 (MIDI 36 = C2)
    const rootMidi = 36 + scale[degree % scale.length]
    const thirdDeg = (degree + 2) % scale.length
    const thirdMidi = 36 + scale[thirdDeg]
    const fifthDeg = (degree + 4) % scale.length
    const fifthMidi = 36 + scale[fifthDeg]
    const seventhDeg = (degree + 6) % scale.length
    const seventhMidi = 36 + scale[seventhDeg]
    // General note pool for non-walking styles
    this.currentBassNotes = [midi(rootMidi), midi(thirdMidi), midi(fifthMidi), midi(rootMidi + 12)]

    // Compute next chord root for approach tones
    const nextIdx = (this.chordIndex + 1) % prog.degrees.length
    const nextDeg = prog.degrees[nextIdx]
    this.nextChordRoot = 36 + scale[nextDeg % scale.length]

    // Pre-compute walking bass line: root → chord tone → scale tone → approach
    // Beat 1: always root
    const beat1 = rootMidi
    // Beat 2: 3rd or 5th (alternate by bar)
    const beat2 = this.barCount % 2 === 0 ? thirdMidi : fifthMidi
    // Beat 3: pick a tone that moves toward the approach note
    // Use 5th if ascending toward approach, or 3rd if descending
    const approachTarget = this.nextChordRoot
    const beat3candidates = [thirdMidi, fifthMidi, seventhMidi]
    // Pick the beat3 note closest to the approach target for smooth motion
    let beat3 = fifthMidi
    let minDist = 99
    for (const c of beat3candidates) {
      const d = Math.abs(c - approachTarget)
      if (d < minDist && c !== beat2) { minDist = d; beat3 = c }
    }
    // Beat 4: approach note — chromatic half step below or above next root
    // Alternate approach direction, prefer below (more common in jazz)
    const beat4 = this.barCount % 3 === 0
      ? approachTarget + 1   // approach from above
      : approachTarget - 1   // approach from below (standard)

    this.walkingBassBar = [midi(beat1), midi(beat2), midi(beat3), midi(beat4)]
    this.walkIndex = 0

    // Push chord info to store for display
    const chordSymbols = prog.degrees.map((deg, i) => {
      const v = this.overrideVoicing ?? prog.voicing[i]
      return computeChordSymbol(scale, deg, v)
    })
    useMusicStore.getState().setChordInfo({
      symbols: chordSymbols.map(c => c.name),
      nashville: chordSymbols.map(c => c.nashville),
      activeIndex: this.chordIndex,
      mood: this.currentMood,
    })

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
    this.pianoSampler?.releaseAll()

    this.kick?.dispose()
    this.hats?.dispose()
    this.acidSynth?.dispose()
    this.lowPass?.dispose()
    this.delay?.dispose()
    this.pad?.dispose()
    this.drumSampler?.dispose()
    this.pianoSampler?.dispose()
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
    this.drumSampler = null
    this.pianoSampler = null
    this.drumSamplesLoaded = false
    this.pianoSamplesLoaded = false
    this.reverb = null
    this.masterGain = null
    this.analyzerNode = null

    // Clear chord display
    useMusicStore.getState().setChordInfo(null)

    console.log('[ToneEngine] Stopped')
  }

  updateParameters(params: MusicParameters): void {
    if (!this.playing) return

    // Apply volume from music store to master gain
    const vol = useMusicStore.getState().volume
    if (this.masterGain) {
      this.masterGain.gain.rampTo(vol * 0.8, 0.1)
    }

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
        this.snarePattern = pickPattern(cfg.snarePatterns, adxNorm)
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

    // Filter cutoff from brightness/RSI — exponential mapping for smooth, musical sweeps
    if (r.rsiToBrightness) {
      this.brightness = params.brightness
      const [minF, maxF] = cfg.filterRange
      const cutoff = minF * Math.pow(maxF / minF, params.brightness)
      this.lowPass?.frequency.rampTo(cutoff, 4)
    } else {
      const mid = Math.sqrt(cfg.filterRange[0] * cfg.filterRange[1]) // geometric mean
      this.lowPass?.frequency.rampTo(mid, 4)
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

    // Pad/piano volume: louder when calm, quieter when chaotic
    // Mixer keys fader: 1 = default, 0 = muted (maps to -40dB)
    const mix = useSettingsStore.getState().mixer
    const keysMixDb = mix.keys > 0 ? 20 * Math.log10(mix.keys) : -60
    const padVol = cfg.synthOverrides.pad.volume + (1 - params.energy) * 10 + keysMixDb
    if (this.pianoSamplesLoaded && this.pianoSampler) {
      this.pianoSampler.volume.rampTo(padVol, 1)
      // Piano replaces pad — keep pad silent
      if (this.pad) this.pad.volume.rampTo(-60, 0.5)
    } else if (this.pad) {
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
