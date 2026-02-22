import type { MusicEngine, MusicParameters } from '../types'

// Re-export interface for convenience
export type { MusicEngine, MusicParameters }

// Helper to build descriptive prompts from parameters
export function buildMusicPrompt(params: MusicParameters): string {
  const moodDescriptions: Record<string, string> = {
    euphoric: 'euphoric, triumphant, soaring, uplifting',
    tense: 'tense, ominous, dramatic, dark suspense',
    calm: 'calm, ambient, chill, lo-fi relaxing',
    dark: 'dark, melancholic, brooding, minor key',
    neutral: 'neutral, moderate, balanced, steady',
  }

  const moodDesc = moodDescriptions[params.mood] ?? moodDescriptions.neutral

  const tempoDesc = params.tempo > 140 ? 'fast-paced, energetic'
    : params.tempo > 100 ? 'moderate tempo'
    : 'slow, ambient'

  const densityDesc = params.density > 0.7 ? 'dense, layered, full'
    : params.density > 0.4 ? 'moderate arrangement'
    : 'sparse, minimal, space'

  return `${moodDesc}, ${tempoDesc}, ${densityDesc}, ${params.key}, ${Math.round(params.tempo)} BPM, electronic cinematic`
}
