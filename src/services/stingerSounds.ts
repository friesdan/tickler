import * as Tone from 'tone'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type StingerSoundId =
  // Existing 7
  | 'crystalPing'
  | 'risingPluck'
  | 'fallingZap'
  | 'powerChord'
  | 'darkChord'
  | 'hopeFanfare'
  | 'doomDescent'
  // New 7
  | 'etherealShimmer'
  | 'chromaticRun'
  | 'deepBoom'
  | 'metallicTrill'
  | 'reverseSwell'
  | 'glitchBurst'
  | 'triumphantHorn'

export type StingerAssignment = StingerSoundId | 'off'

export interface StingerSoundDef {
  id: StingerSoundId
  label: string
  description: string
  category: 'melodic' | 'percussive' | 'textural'
  play: (output: Tone.Gain, time?: number) => void
}

// ---------------------------------------------------------------------------
// Sound definitions
// ---------------------------------------------------------------------------

export const STINGER_SOUNDS: StingerSoundDef[] = [
  // --- Existing 7 (extracted from toneEngine.ts) ---

  {
    id: 'crystalPing',
    label: 'Crystal Ping',
    description: 'High FM ping at E6',
    category: 'melodic',
    play(output, time = Tone.now()) {
      const synth = new Tone.FMSynth({
        harmonicity: 8,
        modulationIndex: 12,
        oscillator: { type: 'sine' },
        modulation: { type: 'triangle' },
        envelope: { attack: 0.001, decay: 0.3, sustain: 0, release: 0.5 },
        modulationEnvelope: { attack: 0.001, decay: 0.2, sustain: 0, release: 0.3 },
      }).connect(output)
      synth.volume.value = -2
      synth.triggerAttackRelease('E6', '8n', time)
      setTimeout(() => synth.dispose(), 2000)
    },
  },

  {
    id: 'risingPluck',
    label: 'Rising Pluck',
    description: 'PluckSynth G3 to D4',
    category: 'melodic',
    play(output, time = Tone.now()) {
      const synth = new Tone.PluckSynth({
        attackNoise: 4,
        dampening: 3000,
        resonance: 0.95,
      }).connect(output)
      synth.volume.value = -1
      synth.triggerAttack('G3', time)
      synth.triggerAttack('D4', time + 0.12)
      setTimeout(() => synth.dispose(), 2500)
    },
  },

  {
    id: 'fallingZap',
    label: 'Falling Zap',
    description: 'FM sweep C6 to C4',
    category: 'melodic',
    play(output, time = Tone.now()) {
      const synth = new Tone.FMSynth({
        harmonicity: 3,
        modulationIndex: 20,
        oscillator: { type: 'sine' },
        modulation: { type: 'square' },
        envelope: { attack: 0.001, decay: 0.5, sustain: 0, release: 0.3 },
        modulationEnvelope: { attack: 0.001, decay: 0.4, sustain: 0, release: 0.2 },
      }).connect(output)
      synth.volume.value = -2
      synth.triggerAttackRelease('C6', '4n', time)
      synth.frequency.exponentialRampTo(Tone.Frequency('C4').toFrequency(), 0.4, time)
      setTimeout(() => synth.dispose(), 2500)
    },
  },

  {
    id: 'powerChord',
    label: 'Power Chord',
    description: 'AM chord stab C4-G4-C5',
    category: 'melodic',
    play(output, time = Tone.now()) {
      const synth = new Tone.PolySynth(Tone.AMSynth).connect(output)
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
    },
  },

  {
    id: 'darkChord',
    label: 'Dark Chord',
    description: 'FM dim chord C3-Gb3-Bb3',
    category: 'melodic',
    play(output, time = Tone.now()) {
      const synth = new Tone.PolySynth(Tone.FMSynth).connect(output)
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
    },
  },

  {
    id: 'hopeFanfare',
    label: 'Hope Fanfare',
    description: 'Pluck C4 to E4 to G5',
    category: 'melodic',
    play(output, time = Tone.now()) {
      const synth = new Tone.PluckSynth({
        attackNoise: 6,
        dampening: 4000,
        resonance: 0.97,
      }).connect(output)
      synth.volume.value = 0
      synth.triggerAttack('C4', time)
      synth.triggerAttack('E4', time + 0.1)
      synth.triggerAttack('G5', time + 0.2)
      setTimeout(() => synth.dispose(), 3000)
    },
  },

  {
    id: 'doomDescent',
    label: 'Doom Descent',
    description: 'FM Eb5 to Bb3 to Gb2',
    category: 'melodic',
    play(output, time = Tone.now()) {
      const synth = new Tone.FMSynth({
        harmonicity: 2.5,
        modulationIndex: 15,
        oscillator: { type: 'sine' },
        modulation: { type: 'square' },
        envelope: { attack: 0.005, decay: 0.6, sustain: 0, release: 0.5 },
        modulationEnvelope: { attack: 0.005, decay: 0.5, sustain: 0, release: 0.3 },
      }).connect(output)
      synth.volume.value = -1
      synth.triggerAttackRelease('Eb5', '16n', time)
      setTimeout(() => {
        synth.triggerAttackRelease('Bb3', '16n')
      }, 120)
      setTimeout(() => {
        synth.triggerAttackRelease('Gb2', '8n')
      }, 260)
      setTimeout(() => synth.dispose(), 3000)
    },
  },

  // --- New 7 ---

  {
    id: 'etherealShimmer',
    label: 'Ethereal Shimmer',
    description: 'Filtered noise with twinkling',
    category: 'textural',
    play(output, time = Tone.now()) {
      const filter = new Tone.AutoFilter({
        frequency: 6,
        baseFrequency: 800,
        octaves: 4,
        type: 'sine',
      }).connect(output)
      filter.start(time)
      const synth = new Tone.NoiseSynth({
        noise: { type: 'pink' },
        envelope: { attack: 0.05, decay: 0.8, sustain: 0, release: 0.5 },
      }).connect(filter)
      synth.volume.value = -8
      synth.triggerAttackRelease('4n', time)
      setTimeout(() => { synth.dispose(); filter.dispose() }, 3000)
    },
  },

  {
    id: 'chromaticRun',
    label: 'Chromatic Run',
    description: 'Fast ascending C4 to E4',
    category: 'melodic',
    play(output, time = Tone.now()) {
      const notes = ['C4', 'Db4', 'D4', 'Eb4', 'E4']
      const synth = new Tone.Synth({
        oscillator: { type: 'triangle' },
        envelope: { attack: 0.001, decay: 0.08, sustain: 0, release: 0.1 },
      }).connect(output)
      synth.volume.value = -4
      notes.forEach((note, i) => {
        synth.triggerAttackRelease(note, '32n', time + i * 0.06)
      })
      setTimeout(() => synth.dispose(), 2000)
    },
  },

  {
    id: 'deepBoom',
    label: 'Deep Boom',
    description: 'MembraneSynth impact at C1',
    category: 'percussive',
    play(output, time = Tone.now()) {
      const synth = new Tone.MembraneSynth({
        pitchDecay: 0.08,
        octaves: 6,
        oscillator: { type: 'sine' },
        envelope: { attack: 0.001, decay: 1.2, sustain: 0, release: 1.0 },
      }).connect(output)
      synth.volume.value = 2
      synth.triggerAttackRelease('C1', '2n', time)
      setTimeout(() => synth.dispose(), 3000)
    },
  },

  {
    id: 'metallicTrill',
    label: 'Metallic Trill',
    description: 'Rapid MetalSynth bell roll',
    category: 'percussive',
    play(output, time = Tone.now()) {
      const synth = new Tone.MetalSynth({
        harmonicity: 12,
        modulationIndex: 20,
        resonance: 3000,
        octaves: 1.5,
        envelope: { attack: 0.001, decay: 0.06, release: 0.1 },
      }).connect(output)
      synth.volume.value = -12
      for (let i = 0; i < 6; i++) {
        synth.triggerAttackRelease('32n', time + i * 0.05)
      }
      setTimeout(() => synth.dispose(), 2500)
    },
  },

  {
    id: 'reverseSwell',
    label: 'Reverse Swell',
    description: 'DuoSynth chord, slow attack',
    category: 'textural',
    play(output, time = Tone.now()) {
      const synth = new Tone.DuoSynth({
        voice0: {
          oscillator: { type: 'sawtooth' },
          envelope: { attack: 0.6, decay: 0.1, sustain: 0.8, release: 0.05 },
        },
        voice1: {
          oscillator: { type: 'sine' },
          envelope: { attack: 0.6, decay: 0.1, sustain: 0.8, release: 0.05 },
        },
        vibratoAmount: 0.3,
        vibratoRate: 5,
        harmonicity: 1.5,
      }).connect(output)
      synth.volume.value = -6
      synth.triggerAttackRelease('C4', 0.7, time)
      setTimeout(() => synth.dispose(), 3000)
    },
  },

  {
    id: 'glitchBurst',
    label: 'Glitch Burst',
    description: 'Rapid pentatonic spray',
    category: 'percussive',
    play(output, time = Tone.now()) {
      const notes = ['C5', 'D5', 'E5', 'G5', 'A5', 'C6', 'D6', 'E6']
      const synth = new Tone.Synth({
        oscillator: { type: 'square' },
        envelope: { attack: 0.001, decay: 0.02, sustain: 0, release: 0.02 },
      }).connect(output)
      synth.volume.value = -8
      for (let i = 0; i < 10; i++) {
        const note = notes[Math.floor(Math.random() * notes.length)]
        synth.triggerAttackRelease(note, '64n', time + i * 0.025)
      }
      setTimeout(() => synth.dispose(), 2000)
    },
  },

  {
    id: 'triumphantHorn',
    label: 'Triumphant Horn',
    description: 'FMSynth bright brass, ascending',
    category: 'melodic',
    play(output, time = Tone.now()) {
      const synth = new Tone.FMSynth({
        harmonicity: 1,
        modulationIndex: 4,
        oscillator: { type: 'sawtooth' },
        modulation: { type: 'sine' },
        envelope: { attack: 0.02, decay: 0.3, sustain: 0.3, release: 0.4 },
        modulationEnvelope: { attack: 0.01, decay: 0.2, sustain: 0.2, release: 0.3 },
      }).connect(output)
      synth.volume.value = -2
      synth.triggerAttackRelease('C4', '8n', time)
      synth.triggerAttackRelease('E4', '8n', time + 0.15)
      synth.triggerAttackRelease('G4', '4n', time + 0.3)
      setTimeout(() => synth.dispose(), 3000)
    },
  },
]

// ---------------------------------------------------------------------------
// Lookup map
// ---------------------------------------------------------------------------

export const STINGER_SOUND_MAP: Record<StingerSoundId, StingerSoundDef> =
  Object.fromEntries(STINGER_SOUNDS.map((s) => [s.id, s])) as Record<StingerSoundId, StingerSoundDef>

// ---------------------------------------------------------------------------
// Standalone preview (works without engine running)
// ---------------------------------------------------------------------------

export async function playStingerPreview(id: StingerSoundId, volume = 0.8) {
  await Tone.start()
  const gain = new Tone.Gain(volume).toDestination()
  const def = STINGER_SOUND_MAP[id]
  if (def) def.play(gain)
  // Auto-dispose gain after sound finishes
  setTimeout(() => gain.dispose(), 4000)
}
