/**
 * Style configuration system for the multi-genre music engine.
 *
 * Each style defines its own drum patterns, chord progressions,
 * synth timbres, and feel — all driven by the same stock indicators.
 */

// Re-export Progression so toneEngine can import from here
export interface Progression {
  scale: string
  /** 4 chord degrees (0-indexed into the scale) */
  degrees: number[]
  voicing: ('triad' | '7th' | 'sus' | '9th' | 'shell')[]
}

export type MusicStyle = 'techno' | 'jazz' | 'ambient' | 'lofi' | 'pop' | 'country'

export type DrumKit = 'electronic' | 'acoustic' | 'brush' | 'minimal'

export interface StyleConfig {
  name: string
  description: string // one-line feel description for UI cards
  swing: number // 0 = straight, 0.55 = jazz swing
  padSynthType: 'synth' | 'fmsynth' // synth = Tone.Synth, fmsynth = Tone.FMSynth (Rhodes)
  bassMode: 'random' | 'walking' // random = pick notes randomly, walking = sequential cycle
  kickPatterns: number[][] // 4 patterns by energy level
  hatPatterns: number[][] // values 0–1 = closed hat/ride, >1 = open hat/ride bell (vel = val - 1)
  snarePatterns: number[][] // 4 patterns by energy level
  bassPatterns: number[][]
  drumKit: DrumKit // which drum sample set to use
  bassNoteDuration?: string // '16n' | '8n' | '8n.' | '2n' — defaults to '16n'
  progressions: Record<string, Progression[]> // per mood
  synthOverrides: {
    kick: { pitchDecay?: number; octaves?: number; oscillator?: { type: string }; envelope?: object; volume?: number }
    hats: { envelope?: object; harmonicity?: number; modulationIndex?: number; resonance?: number; octaves?: number; volume?: number }
    bass: { oscillator: { type: string }; envelope: object; filterEnvelope?: object; volume?: number }
    pad: { oscillator: { type: string }; envelope: object; volume: number; harmonicity?: number; modulationIndex?: number }
  }
  filterRange: [number, number] // [min, max] Hz for brightness mapping
  reverbWetRange: [number, number] // [min, max] for ATR mapping
  defaultTempo: number
}

// ---------------------------------------------------------------------------
// Techno — driving, mechanical, 4-on-floor
// ---------------------------------------------------------------------------

const TECHNO_CONFIG: StyleConfig = {
  name: 'Techno',
  description: 'Driving, mechanical — 4-on-floor, acid bass, dark pads',
  swing: 0,
  padSynthType: 'synth',
  bassMode: 'random',
  drumKit: 'electronic',
  kickPatterns: [
    [1, 0, 0, 0, 0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0],
    [1, 0, 0, 0, 1, 0, 0, 0, 1, 0, 0, 0, 1, 0, 0, 0],
    [1, 0, 0, 0, 1, 0, 0, 1, 0, 0, 1, 0, 1, 0, 0, 0],
    [1, 0, 0.5, 0, 1, 0, 0, 0.5, 1, 0, 0.5, 0, 1, 0, 0, 0.5],
  ],
  hatPatterns: [
    [0, 0, 1, 0, 0, 0, 1, 0, 0, 0, 1, 0, 0, 0, 1, 0],
    [1, 0, 1, 0, 1, 0, 1, 0, 1, 0, 1, 0, 1, 0, 1, 0],
    [1, 0.5, 1, 0.5, 1, 0.5, 1, 0.5, 1, 0.5, 1, 0.5, 1, 0.5, 1, 0.5],
    [1, 0.5, 1, 1.6, 1, 0.5, 1, 0.5, 1, 0.5, 1, 1.6, 1, 0.5, 1, 0.5],
  ],
  snarePatterns: [
    [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
    [0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0, 1, 0, 0, 0],
    [0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0, 1, 0, 0, 0],
    [0, 0, 0.3, 0, 1, 0, 0, 0.3, 0, 0, 0.3, 0, 1, 0, 0, 0.3],
  ],
  bassPatterns: [
    [1, 0, 0, 0, 0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0],
    [1, 0, 0, 0, 1, 0, 0, 0, 1, 0, 0, 0, 1, 0, 0, 0],
    [1, 0, 0, 1, 0, 0, 1, 0, 0, 1, 0, 0, 1, 0, 1, 0],
    [1, 0, 1, 0, 1, 0, 0, 1, 1, 0, 1, 0, 0, 1, 0, 1],
  ],
  progressions: {
    euphoric: [
      { scale: 'lydian', degrees: [0, 4, 5, 3], voicing: ['7th', 'triad', '7th', 'triad'] },
      { scale: 'lydian', degrees: [0, 2, 3, 4], voicing: ['7th', '7th', 'sus', 'triad'] },
      { scale: 'major', degrees: [0, 3, 5, 4], voicing: ['triad', '7th', '7th', 'triad'] },
    ],
    calm: [
      { scale: 'dorian', degrees: [0, 3, 2, 5], voicing: ['7th', '7th', 'triad', 'triad'] },
      { scale: 'dorian', degrees: [0, 4, 3, 0], voicing: ['7th', 'triad', 'sus', '7th'] },
      { scale: 'dorian', degrees: [0, 2, 6, 3], voicing: ['7th', '7th', 'triad', '7th'] },
    ],
    tense: [
      { scale: 'phrygianDom', degrees: [0, 1, 4, 5], voicing: ['7th', 'triad', '7th', 'triad'] },
      { scale: 'phrygianDom', degrees: [0, 5, 1, 4], voicing: ['triad', '7th', 'triad', '7th'] },
      { scale: 'phrygianDom', degrees: [0, 3, 1, 0], voicing: ['7th', '7th', 'triad', 'sus'] },
    ],
    dark: [
      { scale: 'aeolian', degrees: [0, 5, 2, 6], voicing: ['7th', 'triad', '7th', 'triad'] },
      { scale: 'aeolian', degrees: [0, 3, 5, 4], voicing: ['7th', '7th', 'triad', 'triad'] },
      { scale: 'aeolian', degrees: [0, 6, 5, 4], voicing: ['triad', '7th', '7th', 'triad'] },
    ],
    neutral: [
      { scale: 'minor', degrees: [0, 3, 6, 2], voicing: ['7th', 'triad', 'triad', '7th'] },
      { scale: 'minor', degrees: [0, 4, 3, 6], voicing: ['7th', '7th', 'triad', 'triad'] },
      { scale: 'minor', degrees: [0, 2, 6, 3], voicing: ['triad', '7th', '7th', 'triad'] },
    ],
  },
  synthOverrides: {
    kick: {},
    hats: {},
    bass: {
      oscillator: { type: 'sawtooth' },
      envelope: { attack: 0.003, decay: 0.15, sustain: 0.2, release: 0.15 },
      filterEnvelope: { attack: 0.01, decay: 0.15, sustain: 0.05, release: 0.1, baseFrequency: 150, octaves: 5 },
    },
    pad: {
      oscillator: { type: 'triangle' },
      envelope: { attack: 1.5, decay: 2, sustain: 0.8, release: 3 },
      volume: -18,
    },
  },
  filterRange: [200, 6000],
  reverbWetRange: [0.2, 0.8],
  defaultTempo: 120,
}

// ---------------------------------------------------------------------------
// Jazz — swung, warm, walking bass, extended voicings
// ---------------------------------------------------------------------------

const JAZZ_CONFIG: StyleConfig = {
  name: 'Jazz',
  description: 'Swung, warm — Rhodes piano, walking bass, ride cymbal',
  swing: 0.55,
  padSynthType: 'fmsynth',
  bassMode: 'walking',
  drumKit: 'brush',
  bassNoteDuration: '8n',
  kickPatterns: [
    // Low: beat 1 only, feathered (very soft)
    [0.3, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
    // Medium: feathered on 1 & 3
    [0.3, 0, 0, 0, 0, 0, 0, 0, 0.25, 0, 0, 0, 0, 0, 0, 0],
    // Higher: feathered quarters (barely audible pulse)
    [0.35, 0, 0, 0, 0.25, 0, 0, 0, 0.35, 0, 0, 0, 0.25, 0, 0, 0],
    // Hot: firmer quarters with occasional accent
    [0.5, 0, 0, 0, 0.4, 0, 0, 0, 0.5, 0, 0, 0, 0.4, 0, 0, 0.3],
  ],
  hatPatterns: [
    // Low: ride quarters, beats 2&4 accented
    [0.5, 0, 0, 0, 0.8, 0, 0, 0, 0.5, 0, 0, 0, 0.8, 0, 0, 0],
    // Medium: spang-a-lang — "ding DING-da ding-da DING" (skip notes only on &2 and &3)
    [0.6, 0, 0, 0, 0.9, 0, 0.4, 0, 0.6, 0, 0.4, 0, 0.9, 0, 0, 0],
    // High: stronger spang-a-lang, light tap before beat 4
    [0.7, 0, 0, 0, 1, 0, 0.5, 0, 0.7, 0, 0.5, 0, 1, 0, 0.3, 0],
    // Hot: bebop ride — ghost notes between + ride bell on &4
    [0.7, 0, 0.15, 0, 1, 0, 0.5, 0.15, 0.7, 0.15, 0.5, 0, 1, 0, 1.4, 0.2],
  ],
  snarePatterns: [
    // Very sparse — no brush
    [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
    // Light brush comping on 2 & 4
    [0, 0, 0, 0, 0.35, 0, 0, 0, 0, 0, 0, 0, 0.35, 0, 0, 0],
    // Brush with ghost notes between
    [0, 0, 0.12, 0, 0.4, 0, 0.15, 0, 0, 0, 0.12, 0, 0.45, 0, 0.15, 0],
    // Active brush comping — syncopated ghosts
    [0, 0.1, 0.15, 0, 0.45, 0, 0.15, 0.1, 0, 0.1, 0.15, 0, 0.45, 0.1, 0.15, 0.1],
  ],
  bassPatterns: [
    // Walking quarter notes
    [1, 0, 0, 0, 1, 0, 0, 0, 1, 0, 0, 0, 1, 0, 0, 0],
    // Walking with approach tones
    [1, 0, 0, 0, 1, 0, 0, 0, 1, 0, 0, 0, 1, 0, 0, 0.7],
    // Chromatic walks
    [1, 0, 0, 0.5, 1, 0, 0, 0, 1, 0, 0, 0.5, 1, 0, 0.5, 0],
    // Bebop walking
    [1, 0, 0.5, 0, 1, 0, 0, 0.5, 1, 0, 0.5, 0, 1, 0, 0.5, 0.7],
  ],
  progressions: {
    euphoric: [
      // ii-V-I with dwell on tonic
      { scale: 'major', degrees: [1, 4, 0, 0], voicing: ['shell', '7th', '9th', '9th'] },
      // I-vi-ii-V (rhythm changes A)
      { scale: 'major', degrees: [0, 5, 1, 4], voicing: ['9th', 'shell', '7th', '7th'] },
      // Lydian brightness: I-II-IV-V
      { scale: 'lydian', degrees: [0, 1, 3, 4], voicing: ['9th', '7th', '9th', '7th'] },
      // iii-vi-ii-V (full turnaround)
      { scale: 'major', degrees: [2, 5, 1, 4], voicing: ['7th', '7th', '9th', '7th'] },
      // I-iii-IV-ii (gentle cycle)
      { scale: 'major', degrees: [0, 2, 3, 1], voicing: ['9th', '7th', '9th', 'shell'] },
      // vi-ii-V-I (turnaround from vi)
      { scale: 'major', degrees: [5, 1, 4, 0], voicing: ['shell', '9th', '7th', '9th'] },
      // I-IV-V-iii (bright movement)
      { scale: 'major', degrees: [0, 3, 4, 2], voicing: ['9th', '7th', '7th', '9th'] },
      // I-IV-iii-vi (descending 3rds)
      { scale: 'major', degrees: [0, 3, 2, 5], voicing: ['9th', '9th', '7th', 'shell'] },
    ],
    calm: [
      // ii-V-I-vi (classic ballad)
      { scale: 'major', degrees: [1, 4, 0, 5], voicing: ['9th', '7th', '9th', 'shell'] },
      // Dorian vamp
      { scale: 'dorian', degrees: [0, 3, 0, 3], voicing: ['9th', '9th', 'shell', '7th'] },
      // Bossa: I-ii-iii-ii
      { scale: 'major', degrees: [0, 1, 2, 1], voicing: ['9th', 'shell', '7th', '9th'] },
      // I-IV-I-V (simple ballad)
      { scale: 'major', degrees: [0, 3, 0, 4], voicing: ['9th', '9th', 'shell', '7th'] },
      // I-iii-vi-ii (circle of 3rds)
      { scale: 'major', degrees: [0, 2, 5, 1], voicing: ['9th', '7th', 'shell', '9th'] },
      // ii-V-iii-vi (extended resolution)
      { scale: 'major', degrees: [1, 4, 2, 5], voicing: ['9th', '7th', '7th', 'shell'] },
      // I-vi-IV-V (50s ballad)
      { scale: 'major', degrees: [0, 5, 3, 4], voicing: ['9th', 'shell', '9th', '7th'] },
      // I-ii-iii-IV (ascending stepwise)
      { scale: 'major', degrees: [0, 1, 2, 3], voicing: ['9th', 'shell', '7th', '9th'] },
    ],
    tense: [
      // i-iv-V-i (minor turnaround)
      { scale: 'dorian', degrees: [0, 3, 4, 0], voicing: ['7th', '7th', '7th', 'shell'] },
      // i-bII-V-i (phrygian approach)
      { scale: 'phrygianDom', degrees: [0, 1, 4, 0], voicing: ['7th', 'shell', '7th', '7th'] },
      // Minor ii-V-i
      { scale: 'aeolian', degrees: [1, 4, 0, 0], voicing: ['shell', '7th', '9th', '7th'] },
      // i-iv-bVII-V (dorian tension)
      { scale: 'dorian', degrees: [0, 3, 6, 4], voicing: ['7th', '7th', '7th', '7th'] },
      // i-VI-ii-V (minor with major VI)
      { scale: 'aeolian', degrees: [0, 5, 1, 4], voicing: ['7th', '9th', 'shell', '7th'] },
      // bVI-bVII-i-V (Andalusian cadence)
      { scale: 'aeolian', degrees: [5, 6, 0, 4], voicing: ['9th', '7th', '7th', '7th'] },
      // i-bIII-bVI-V
      { scale: 'aeolian', degrees: [0, 2, 5, 4], voicing: ['9th', '7th', '7th', '7th'] },
      // i-IV-bVII-i (dorian modal)
      { scale: 'dorian', degrees: [0, 3, 6, 0], voicing: ['7th', '9th', '7th', 'shell'] },
    ],
    dark: [
      // Minor blues: i-iv-V-i
      { scale: 'aeolian', degrees: [0, 3, 4, 0], voicing: ['7th', '7th', '7th', 'shell'] },
      // i-bVII-bVI-V (descending)
      { scale: 'aeolian', degrees: [0, 6, 5, 4], voicing: ['9th', '7th', 'shell', '7th'] },
      // i-iv-i-V (haunting)
      { scale: 'aeolian', degrees: [0, 3, 0, 4], voicing: ['9th', 'shell', '7th', '7th'] },
      // i-iv-bVII-bVI (minor descent)
      { scale: 'aeolian', degrees: [0, 3, 6, 5], voicing: ['7th', '7th', '9th', 'shell'] },
      // i-bVI-bIII-bVII (relative major cycle)
      { scale: 'aeolian', degrees: [0, 5, 2, 6], voicing: ['9th', '7th', '7th', '7th'] },
      // i-ii-bVI-V (dark ii-V)
      { scale: 'aeolian', degrees: [0, 1, 5, 4], voicing: ['7th', 'shell', '9th', '7th'] },
      // bVI-V-i-iv (reversed minor)
      { scale: 'aeolian', degrees: [5, 4, 0, 3], voicing: ['9th', '7th', '9th', '7th'] },
      // i-bIII-bVII-iv (modal minor)
      { scale: 'aeolian', degrees: [0, 2, 6, 3], voicing: ['7th', '9th', '7th', 'shell'] },
    ],
    neutral: [
      // ii-V-I-vi (standard swing)
      { scale: 'major', degrees: [1, 4, 0, 5], voicing: ['7th', '7th', '9th', 'shell'] },
      // I-vi-ii-V (rhythm changes)
      { scale: 'major', degrees: [0, 5, 1, 4], voicing: ['9th', 'shell', '7th', '7th'] },
      // Dorian i-IV-ii-V
      { scale: 'dorian', degrees: [0, 3, 1, 4], voicing: ['9th', '7th', 'shell', '7th'] },
      // iii-VI-ii-V (extended turnaround)
      { scale: 'major', degrees: [2, 5, 1, 4], voicing: ['7th', '7th', '9th', '7th'] },
      // I-IV-iii-ii (stepwise descent)
      { scale: 'major', degrees: [0, 3, 2, 1], voicing: ['9th', '7th', '7th', 'shell'] },
      // I-iii-vi-V
      { scale: 'major', degrees: [0, 2, 5, 4], voicing: ['9th', '7th', 'shell', '7th'] },
      // ii-iii-IV-V (ascending)
      { scale: 'major', degrees: [1, 2, 3, 4], voicing: ['9th', '7th', '9th', '7th'] },
      // vi-V-IV-V (pendulum)
      { scale: 'major', degrees: [5, 4, 3, 4], voicing: ['shell', '7th', '9th', '7th'] },
    ],
  },
  synthOverrides: {
    kick: { pitchDecay: 0.03, octaves: 6, envelope: { attack: 0.001, decay: 0.25, sustain: 0, release: 0.8 }, volume: -14 },
    hats: { envelope: { attack: 0.001, decay: 0.12, release: 0.2 }, harmonicity: 3.5, modulationIndex: 8, resonance: 6000, octaves: 1, volume: -18 },
    bass: {
      oscillator: { type: 'triangle' },
      envelope: { attack: 0.015, decay: 0.4, sustain: 0.3, release: 0.2 },
      filterEnvelope: { attack: 0.01, decay: 0.3, sustain: 0.1, release: 0.15, baseFrequency: 200, octaves: 2.5 },
      volume: -8,
    },
    pad: {
      oscillator: { type: 'sine' },
      envelope: { attack: 0.01, decay: 0.8, sustain: 0.5, release: 1.5 },
      volume: -10,
      harmonicity: 3.5,
      modulationIndex: 10,
    },
  },
  filterRange: [800, 3000],
  reverbWetRange: [0.3, 0.7],
  defaultTempo: 110,
}

// ---------------------------------------------------------------------------
// Ambient — spacious, minimal, drone-based
// ---------------------------------------------------------------------------

const AMBIENT_CONFIG: StyleConfig = {
  name: 'Ambient',
  description: 'Spacious, minimal — slow drones, sparse shimmer, deep reverb',
  swing: 0,
  padSynthType: 'synth',
  bassMode: 'random',
  drumKit: 'minimal',
  bassNoteDuration: '2n',
  kickPatterns: [
    // Silent
    [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
    // Rare single hit
    [1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
    // Very sparse
    [0.5, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
    // Gentle pulse
    [0.7, 0, 0, 0, 0, 0, 0, 0, 0.5, 0, 0, 0, 0, 0, 0, 0],
  ],
  hatPatterns: [
    // Silence
    [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
    // Rare shimmer
    [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0.3, 0, 0, 0],
    // Occasional sparkle
    [0.3, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0.3, 0, 0, 0, 0, 0],
    // Sparse shimmer pattern
    [0.4, 0, 0, 0, 0, 0, 0.3, 0, 0, 0, 0, 0, 0.4, 0, 0, 0],
  ],
  snarePatterns: [
    // All silent — ambient rarely has snare
    [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
    [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
    [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0.2, 0, 0, 0],
    [0, 0, 0, 0, 0.2, 0, 0, 0, 0, 0, 0, 0, 0.2, 0, 0, 0],
  ],
  bassPatterns: [
    // Whole-note drone (hit on step 0 only)
    [1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
    // Drone
    [1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
    // Slight movement
    [1, 0, 0, 0, 0, 0, 0, 0, 0.5, 0, 0, 0, 0, 0, 0, 0],
    // Two-note drone
    [1, 0, 0, 0, 0, 0, 0, 0, 0.7, 0, 0, 0, 0, 0, 0, 0],
  ],
  progressions: {
    euphoric: [
      // Slow modal — two-chord vamp
      { scale: 'lydian', degrees: [0, 4, 0, 4], voicing: ['9th', '9th', '7th', '7th'] },
      // Suspended wonder
      { scale: 'major', degrees: [0, 3, 0, 3], voicing: ['sus', '9th', 'sus', '7th'] },
    ],
    calm: [
      // Whole-tone drift
      { scale: 'lydian', degrees: [0, 2, 0, 2], voicing: ['9th', '7th', '9th', 'sus'] },
      // Static pad
      { scale: 'major', degrees: [0, 0, 3, 3], voicing: ['9th', '7th', '9th', 'sus'] },
    ],
    tense: [
      // Suspended tension
      { scale: 'phrygianDom', degrees: [0, 1, 0, 1], voicing: ['sus', '7th', 'sus', '7th'] },
      // Frozen dissonance
      { scale: 'aeolian', degrees: [0, 5, 0, 5], voicing: ['9th', 'sus', '9th', 'sus'] },
    ],
    dark: [
      // Dark drone
      { scale: 'aeolian', degrees: [0, 5, 0, 5], voicing: ['7th', '9th', 'sus', '9th'] },
      // Aeolian stillness
      { scale: 'aeolian', degrees: [0, 3, 0, 3], voicing: ['9th', '7th', 'sus', '7th'] },
    ],
    neutral: [
      // Simple modal vamp
      { scale: 'dorian', degrees: [0, 3, 0, 3], voicing: ['9th', '7th', '9th', '7th'] },
      // Suspended calm
      { scale: 'minor', degrees: [0, 4, 0, 4], voicing: ['sus', '9th', 'sus', '7th'] },
    ],
  },
  synthOverrides: {
    kick: { pitchDecay: 0.08, octaves: 4, envelope: { attack: 0.01, decay: 0.6, sustain: 0, release: 2 }, volume: -12 },
    hats: { envelope: { attack: 0.01, decay: 0.15, release: 0.3 }, harmonicity: 8, resonance: 6000, octaves: 0.5, volume: -24 },
    bass: {
      oscillator: { type: 'sine' },
      envelope: { attack: 0.8, decay: 2.0, sustain: 0.6, release: 2 },
      volume: -10,
    },
    pad: {
      oscillator: { type: 'sine' },
      envelope: { attack: 3, decay: 4, sustain: 0.9, release: 5 },
      volume: -14,
    },
  },
  filterRange: [500, 2000],
  reverbWetRange: [0.6, 0.95],
  defaultTempo: 70,
}

// ---------------------------------------------------------------------------
// Lo-fi — lazy, warm, muted, hip-hop influenced
// ---------------------------------------------------------------------------

const LOFI_CONFIG: StyleConfig = {
  name: 'Lo-fi',
  description: 'Lazy, warm — dusty beats, muted keys, tape hiss vibes',
  swing: 0.3,
  padSynthType: 'fmsynth',
  bassMode: 'random',
  drumKit: 'acoustic',
  bassNoteDuration: '8n.',
  kickPatterns: [
    // Muted boom-bap
    [1, 0, 0, 0, 0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0],
    // Classic boom-bap
    [1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 0, 0, 0, 0, 0],
    // Dusty hip-hop
    [1, 0, 0, 0, 0, 0, 1, 0, 0, 0, 1, 0, 0, 0, 0, 0],
    // Busy lo-fi
    [1, 0, 0, 0.5, 0, 0, 1, 0, 0, 0, 1, 0, 0, 0.5, 0, 0],
  ],
  hatPatterns: [
    // Soft closed
    [0, 0, 0.5, 0, 0, 0, 0.5, 0, 0, 0, 0.5, 0, 0, 0, 0.5, 0],
    // Lazy shuffled
    [0.6, 0, 0.4, 0, 0.6, 0, 0.4, 0, 0.6, 0, 0.4, 0, 0.6, 0, 0.4, 0],
    // Dusty with open hats (>1.0 = open)
    [0.6, 0, 0.4, 0, 0.6, 0, 1.4, 0, 0.6, 0, 0.4, 0, 0.6, 0, 1.4, 0],
    // Shuffled with ghosts and opens
    [0.7, 0.2, 0.5, 0, 0.7, 0.2, 1.4, 0.2, 0.7, 0.2, 0.5, 0, 0.7, 0.2, 1.4, 0.2],
  ],
  snarePatterns: [
    // Minimal boom-bap — snare on beat 3
    [0, 0, 0, 0, 0, 0, 0, 0, 0.8, 0, 0, 0, 0, 0, 0, 0],
    // Snare on beat 3
    [0, 0, 0, 0, 0, 0, 0, 0, 0.8, 0, 0, 0, 0, 0, 0, 0],
    // Boom-bap with ghost
    [0, 0, 0, 0, 0, 0, 0, 0, 0.9, 0, 0, 0, 0, 0, 0.3, 0],
    // Active boom-bap
    [0, 0, 0.2, 0, 0, 0, 0, 0, 0.9, 0, 0, 0, 0, 0, 0.4, 0],
  ],
  bassPatterns: [
    // Warm quarter notes
    [1, 0, 0, 0, 1, 0, 0, 0, 1, 0, 0, 0, 1, 0, 0, 0],
    // Muted 8ths
    [1, 0, 0.5, 0, 1, 0, 0.5, 0, 1, 0, 0.5, 0, 1, 0, 0.5, 0],
    // Lazy groove
    [1, 0, 0, 0, 0, 0, 0.7, 0, 1, 0, 0, 0, 0, 0, 0.7, 0],
    // Neo-soul bass
    [1, 0, 0, 0.5, 0, 0, 1, 0, 0, 0.5, 0, 0, 1, 0, 0.5, 0],
  ],
  progressions: {
    euphoric: [
      // Jazzy ii-V-I with 9ths
      { scale: 'major', degrees: [1, 4, 0, 5], voicing: ['9th', '7th', '9th', 'shell'] },
      // Neo-soul I-iii-IV-iv
      { scale: 'major', degrees: [0, 2, 3, 3], voicing: ['9th', '7th', '9th', '7th'] },
    ],
    calm: [
      // Chill ii-V vamp
      { scale: 'dorian', degrees: [1, 4, 1, 4], voicing: ['9th', '7th', 'shell', '7th'] },
      // Lo-fi minor 9ths
      { scale: 'dorian', degrees: [0, 3, 2, 5], voicing: ['9th', '9th', 'shell', '7th'] },
      // Dreamy
      { scale: 'major', degrees: [0, 1, 2, 3], voicing: ['9th', 'shell', '7th', '9th'] },
    ],
    tense: [
      // Minor tension
      { scale: 'aeolian', degrees: [0, 3, 5, 4], voicing: ['9th', '7th', 'shell', '7th'] },
      // Dark neo-soul
      { scale: 'phrygianDom', degrees: [0, 1, 4, 0], voicing: ['7th', 'shell', '7th', '9th'] },
    ],
    dark: [
      // Moody minor
      { scale: 'aeolian', degrees: [0, 5, 3, 4], voicing: ['9th', 'shell', '7th', '7th'] },
      // Dark jazz loop
      { scale: 'aeolian', degrees: [0, 6, 5, 3], voicing: ['7th', '9th', 'shell', '7th'] },
    ],
    neutral: [
      // Standard lo-fi progression
      { scale: 'dorian', degrees: [0, 3, 1, 4], voicing: ['9th', '7th', 'shell', '7th'] },
      // Mellow vamp
      { scale: 'minor', degrees: [0, 2, 5, 4], voicing: ['9th', '7th', '9th', 'shell'] },
    ],
  },
  synthOverrides: {
    kick: { pitchDecay: 0.06, octaves: 6, envelope: { attack: 0.002, decay: 0.3, sustain: 0, release: 1 }, volume: -6 },
    hats: { envelope: { attack: 0.002, decay: 0.04, release: 0.06 }, harmonicity: 4, resonance: 3500, octaves: 1, volume: -20 },
    bass: {
      oscillator: { type: 'triangle' },
      envelope: { attack: 0.008, decay: 0.2, sustain: 0.3, release: 0.2 },
      filterEnvelope: { attack: 0.01, decay: 0.2, sustain: 0.1, release: 0.15, baseFrequency: 180, octaves: 2 },
      volume: -8,
    },
    pad: {
      oscillator: { type: 'sine' },
      envelope: { attack: 0.8, decay: 1.5, sustain: 0.6, release: 2.5 },
      volume: -16,
      harmonicity: 2.5,
      modulationIndex: 6,
    },
  },
  filterRange: [400, 2500],
  reverbWetRange: [0.3, 0.7],
  defaultTempo: 80,
}

// ---------------------------------------------------------------------------
// Pop — bright, punchy, accessible
// ---------------------------------------------------------------------------

const POP_CONFIG: StyleConfig = {
  name: 'Pop',
  description: 'Bright, punchy — crisp drums, saw pads, catchy chords',
  swing: 0,
  padSynthType: 'synth',
  bassMode: 'random',
  drumKit: 'acoustic',
  kickPatterns: [
    // Light four-on-floor
    [1, 0, 0, 0, 1, 0, 0, 0, 1, 0, 0, 0, 1, 0, 0, 0],
    // Pop standard
    [1, 0, 0, 0, 0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0],
    // Syncopated pop
    [1, 0, 0, 0, 0, 0, 1, 0, 0, 0, 1, 0, 0, 0, 0, 0],
    // Driving pop
    [1, 0, 0, 0, 1, 0, 0, 1, 0, 0, 1, 0, 1, 0, 0, 0],
  ],
  hatPatterns: [
    // Crisp 8ths
    [1, 0, 1, 0, 1, 0, 1, 0, 1, 0, 1, 0, 1, 0, 1, 0],
    // Accented 8ths
    [1, 0, 0.7, 0, 1, 0, 0.7, 0, 1, 0, 0.7, 0, 1, 0, 0.7, 0],
    // Driving 16ths
    [1, 0.5, 1, 0.5, 1, 0.5, 1, 0.5, 1, 0.5, 1, 0.5, 1, 0.5, 1, 0.5],
    // Pop shuffle
    [1, 0.3, 0.7, 0.3, 1, 0.3, 0.7, 0.3, 1, 0.3, 0.7, 0.3, 1, 0.3, 0.7, 0.3],
  ],
  snarePatterns: [
    // Light backbeat
    [0, 0, 0, 0, 0.8, 0, 0, 0, 0, 0, 0, 0, 0.8, 0, 0, 0],
    // Crisp backbeat on 2 & 4
    [0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0, 1, 0, 0, 0],
    // Backbeat with ghost
    [0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0.3, 0, 1, 0, 0, 0],
    // Active pop snare
    [0, 0, 0.2, 0, 1, 0, 0, 0.2, 0, 0, 0.3, 0, 1, 0, 0, 0.2],
  ],
  bassPatterns: [
    // Root pumping
    [1, 0, 0, 0, 1, 0, 0, 0, 1, 0, 0, 0, 1, 0, 0, 0],
    // Root-5th movement
    [1, 0, 0, 0, 0, 0, 1, 0, 1, 0, 0, 0, 0, 0, 1, 0],
    // Pop bass groove
    [1, 0, 0, 1, 0, 0, 1, 0, 1, 0, 0, 1, 0, 0, 1, 0],
    // Busy pop bass
    [1, 0, 1, 0, 0, 0, 1, 0, 1, 0, 1, 0, 0, 1, 0, 0],
  ],
  progressions: {
    euphoric: [
      // I-V-vi-IV (classic pop)
      { scale: 'major', degrees: [0, 4, 5, 3], voicing: ['triad', 'triad', 'triad', 'triad'] },
      // I-IV-vi-V
      { scale: 'major', degrees: [0, 3, 5, 4], voicing: ['triad', '7th', 'triad', 'triad'] },
      // vi-IV-I-V
      { scale: 'major', degrees: [5, 3, 0, 4], voicing: ['triad', 'triad', '7th', 'triad'] },
    ],
    calm: [
      // I-iii-IV-V
      { scale: 'major', degrees: [0, 2, 3, 4], voicing: ['triad', '7th', 'triad', 'triad'] },
      // I-V-IV-V
      { scale: 'major', degrees: [0, 4, 3, 4], voicing: ['7th', 'triad', 'triad', 'triad'] },
    ],
    tense: [
      // vi-V-IV-III (descending)
      { scale: 'minor', degrees: [0, 4, 3, 2], voicing: ['triad', 'triad', '7th', 'triad'] },
      // i-iv-V-i
      { scale: 'minor', degrees: [0, 3, 4, 0], voicing: ['triad', '7th', 'triad', 'triad'] },
    ],
    dark: [
      // i-VI-III-VII
      { scale: 'aeolian', degrees: [0, 5, 2, 6], voicing: ['triad', 'triad', '7th', 'triad'] },
      // i-iv-VI-V
      { scale: 'aeolian', degrees: [0, 3, 5, 4], voicing: ['7th', 'triad', 'triad', 'triad'] },
    ],
    neutral: [
      // I-V-vi-IV
      { scale: 'major', degrees: [0, 4, 5, 3], voicing: ['triad', '7th', 'triad', 'triad'] },
      // vi-IV-I-V
      { scale: 'major', degrees: [5, 3, 0, 4], voicing: ['triad', 'triad', 'triad', '7th'] },
    ],
  },
  synthOverrides: {
    kick: { pitchDecay: 0.04, octaves: 8, envelope: { attack: 0.001, decay: 0.3, sustain: 0, release: 1 }, volume: -4 },
    hats: { envelope: { attack: 0.001, decay: 0.05, release: 0.06 }, harmonicity: 5.5, resonance: 4500, octaves: 1.5, volume: -16 },
    bass: {
      oscillator: { type: 'square' },
      envelope: { attack: 0.005, decay: 0.12, sustain: 0.25, release: 0.12 },
      filterEnvelope: { attack: 0.005, decay: 0.1, sustain: 0.1, release: 0.08, baseFrequency: 200, octaves: 3 },
      volume: -10,
    },
    pad: {
      oscillator: { type: 'sawtooth' },
      envelope: { attack: 0.8, decay: 1.5, sustain: 0.7, release: 2 },
      volume: -20,
    },
  },
  filterRange: [300, 5000],
  reverbWetRange: [0.15, 0.5],
  defaultTempo: 120,
}

// ---------------------------------------------------------------------------
// Country — twangy, straight, boom-chick
// ---------------------------------------------------------------------------

const COUNTRY_CONFIG: StyleConfig = {
  name: 'Country',
  description: 'Twangy, straight — boom-chick, walking bass, simple chords',
  swing: 0.1,
  padSynthType: 'synth',
  bassMode: 'walking',
  drumKit: 'acoustic',
  kickPatterns: [
    // Boom-chick (beat 1, 3)
    [1, 0, 0, 0, 0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0],
    // Standard boom-chick
    [1, 0, 0, 0, 0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0],
    // Train beat
    [1, 0, 0, 0, 1, 0, 0, 0, 1, 0, 0, 0, 1, 0, 0, 0],
    // Driving country
    [1, 0, 0, 0.5, 1, 0, 0, 0, 1, 0, 0, 0.5, 1, 0, 0, 0],
  ],
  hatPatterns: [
    // Backbeat accents (snare-like on 2 and 4)
    [0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0, 1, 0, 0, 0],
    // Chick pattern (offbeats)
    [0, 0, 1, 0, 0, 0, 1, 0, 0, 0, 1, 0, 0, 0, 1, 0],
    // Driving 8ths
    [1, 0, 1, 0, 1, 0, 1, 0, 1, 0, 1, 0, 1, 0, 1, 0],
    // Busy country
    [1, 0, 0.7, 0, 1, 0, 0.7, 0, 1, 0, 0.7, 0, 1, 0, 0.7, 0],
  ],
  snarePatterns: [
    // Light rimshot on 2 & 4
    [0, 0, 0, 0, 0.7, 0, 0, 0, 0, 0, 0, 0, 0.7, 0, 0, 0],
    // Standard country rimshot
    [0, 0, 0, 0, 0.9, 0, 0, 0, 0, 0, 0, 0, 0.9, 0, 0, 0],
    // Rimshot with ghost
    [0, 0, 0, 0, 0.9, 0, 0, 0, 0, 0, 0.2, 0, 0.9, 0, 0, 0],
    // Active country
    [0, 0, 0.2, 0, 0.9, 0, 0, 0.2, 0, 0, 0.2, 0, 0.9, 0, 0, 0.2],
  ],
  bassPatterns: [
    // Root-5th alternating
    [1, 0, 0, 0, 0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0],
    // Walking root-5th
    [1, 0, 0, 0, 1, 0, 0, 0, 1, 0, 0, 0, 1, 0, 0, 0],
    // Country walk
    [1, 0, 0, 0, 1, 0, 0, 0.7, 1, 0, 0, 0, 1, 0, 0, 0.7],
    // Active country bass
    [1, 0, 0.5, 0, 1, 0, 0.5, 0, 1, 0, 0.5, 0, 1, 0, 0.5, 0],
  ],
  progressions: {
    euphoric: [
      // I-IV-V classic country
      { scale: 'major', degrees: [0, 3, 4, 0], voicing: ['triad', 'triad', 'triad', 'triad'] },
      // I-vi-IV-V
      { scale: 'major', degrees: [0, 5, 3, 4], voicing: ['triad', 'triad', '7th', 'triad'] },
    ],
    calm: [
      // I-IV-I-V
      { scale: 'major', degrees: [0, 3, 0, 4], voicing: ['triad', 'triad', 'triad', 'triad'] },
      // I-ii-IV-I
      { scale: 'major', degrees: [0, 1, 3, 0], voicing: ['triad', '7th', 'triad', 'triad'] },
    ],
    tense: [
      // i-IV-V-i (minor country)
      { scale: 'minor', degrees: [0, 3, 4, 0], voicing: ['triad', 'triad', 'triad', 'triad'] },
      // i-VI-III-VII
      { scale: 'aeolian', degrees: [0, 5, 2, 6], voicing: ['triad', 'triad', '7th', 'triad'] },
    ],
    dark: [
      // Minor country
      { scale: 'aeolian', degrees: [0, 3, 5, 4], voicing: ['triad', '7th', 'triad', 'triad'] },
      // Dark outlaw
      { scale: 'aeolian', degrees: [0, 6, 5, 3], voicing: ['triad', 'triad', 'triad', '7th'] },
    ],
    neutral: [
      // Nashville I-IV-V-I
      { scale: 'major', degrees: [0, 3, 4, 0], voicing: ['triad', '7th', 'triad', 'triad'] },
      // Country shuffle
      { scale: 'major', degrees: [0, 4, 3, 4], voicing: ['triad', 'triad', '7th', 'triad'] },
    ],
  },
  synthOverrides: {
    kick: { pitchDecay: 0.04, octaves: 8, envelope: { attack: 0.001, decay: 0.35, sustain: 0, release: 1.2 }, volume: -4 },
    hats: { envelope: { attack: 0.001, decay: 0.07, release: 0.1 }, harmonicity: 6, resonance: 5000, octaves: 1.5, volume: -16 },
    bass: {
      oscillator: { type: 'triangle' },
      envelope: { attack: 0.005, decay: 0.2, sustain: 0.3, release: 0.15 },
      filterEnvelope: { attack: 0.005, decay: 0.15, sustain: 0.1, release: 0.1, baseFrequency: 250, octaves: 2.5 },
      volume: -8,
    },
    pad: {
      oscillator: { type: 'triangle' },
      envelope: { attack: 0.6, decay: 1.5, sustain: 0.7, release: 2 },
      volume: -20,
    },
  },
  filterRange: [400, 4000],
  reverbWetRange: [0.15, 0.5],
  defaultTempo: 115,
}

// ---------------------------------------------------------------------------
// Registry
// ---------------------------------------------------------------------------

const STYLE_CONFIGS: Record<MusicStyle, StyleConfig> = {
  techno: TECHNO_CONFIG,
  jazz: JAZZ_CONFIG,
  ambient: AMBIENT_CONFIG,
  lofi: LOFI_CONFIG,
  pop: POP_CONFIG,
  country: COUNTRY_CONFIG,
}

export const MUSIC_STYLES: MusicStyle[] = ['techno', 'jazz', 'ambient', 'lofi', 'pop', 'country']

export function getStyleConfig(style: MusicStyle): StyleConfig {
  return STYLE_CONFIGS[style] ?? TECHNO_CONFIG
}
