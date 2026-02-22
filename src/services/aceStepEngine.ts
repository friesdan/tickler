import type { MusicEngine, MusicParameters } from '../types'
import { buildMusicPrompt } from './musicEngine'

/**
 * ACE-Step Local Music Engine
 *
 * Connects to ACE-Step 1.5 API server at localhost:8001.
 * Uses async task queue: POST /release_task → poll /query_result → GET /v1/audio
 */

const ACE_STEP_URL = '/ace-step'

export class AceStepEngine implements MusicEngine {
  private audioContext: AudioContext | null = null
  private gainNode: GainNode | null = null
  private playing = false
  private currentParams: MusicParameters | null = null
  private currentSource: AudioBufferSourceNode | null = null
  private generateLoop: ReturnType<typeof setTimeout> | null = null
  private crossfadeDuration = 2 // seconds

  async start(): Promise<void> {
    if (this.playing) return

    this.audioContext = new AudioContext({ sampleRate: 44100 })
    this.gainNode = this.audioContext.createGain()
    this.gainNode.connect(this.audioContext.destination)
    this.playing = true

    // Check if ACE-Step server is running
    try {
      const res = await fetch(`${ACE_STEP_URL}/health`)
      if (!res.ok) throw new Error('Server not healthy')
      console.log('[AceStepEngine] Server is running')
    } catch {
      console.warn('[AceStepEngine] Server not available at', ACE_STEP_URL)
      console.warn('[AceStepEngine] Start with: cd ~/Developer/ACE-Step-1.5 && python -m acestep.api_server')
      this.playing = false
      throw new Error('ACE-Step server not running. Start it with: cd ~/Developer/ACE-Step-1.5 && python -m acestep.api_server')
    }

    this.scheduleGeneration()
  }

  private async scheduleGeneration() {
    if (!this.playing) return

    try {
      await this.generateAndPlay()
    } catch (err) {
      console.error('[AceStepEngine] Generation error:', err)
    }

    if (this.playing) {
      // Schedule next generation — clips are ~10s, start generating next one after 8s
      this.generateLoop = setTimeout(() => this.scheduleGeneration(), 8000)
    }
  }

  private async generateAndPlay() {
    if (!this.audioContext || !this.gainNode || !this.currentParams) return

    const prompt = buildMusicPrompt(this.currentParams)
    console.log('[AceStepEngine] Generating:', prompt)

    // Step 1: Submit generation task
    const taskRes = await fetch(`${ACE_STEP_URL}/release_task`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        prompt,
        audio_duration: 10,
        bpm: Math.round(this.currentParams.tempo),
        task_type: 'text2music',
        inference_steps: 8,
        audio_format: 'wav',
      }),
    })

    if (!taskRes.ok) {
      throw new Error(`Task submission failed: ${taskRes.status}`)
    }

    const taskData = await taskRes.json()
    // API wraps response in {data: {task_id: ...}, code: 200}
    const taskId = taskData.data?.task_id ?? taskData.task_id
    if (!taskId) throw new Error('No task_id returned')

    console.log('[AceStepEngine] Task submitted:', taskId)

    // Step 2: Poll for completion
    const audioPath = await this.pollForResult(taskId)
    if (!audioPath || !this.playing) return

    // Step 3: Download and play audio
    const audioUrl = `${ACE_STEP_URL}${audioPath}`
    console.log('[AceStepEngine] Downloading audio:', audioUrl)

    const audioRes = await fetch(audioUrl)
    if (!audioRes.ok) throw new Error(`Audio download failed: ${audioRes.status}`)

    const arrayBuffer = await audioRes.arrayBuffer()
    const audioBuffer = await this.audioContext.decodeAudioData(arrayBuffer)

    // Crossfade: fade out current, fade in new
    const now = this.audioContext.currentTime

    if (this.currentSource) {
      try { this.currentSource.stop(now + this.crossfadeDuration) } catch { /* already stopped */ }
    }

    // Create and play new source
    const source = this.audioContext.createBufferSource()
    source.buffer = audioBuffer
    const fadeGain = this.audioContext.createGain()
    fadeGain.gain.setValueAtTime(0, now)
    fadeGain.gain.linearRampToValueAtTime(1, now + this.crossfadeDuration)
    source.connect(fadeGain)
    fadeGain.connect(this.gainNode)
    source.start(now)

    this.currentSource = source
  }

  private async pollForResult(taskId: string): Promise<string | null> {
    const maxAttempts = 120 // ~2 minutes at 1s intervals
    for (let i = 0; i < maxAttempts; i++) {
      if (!this.playing) return null

      await new Promise((r) => setTimeout(r, 1000))

      try {
        const res = await fetch(`${ACE_STEP_URL}/query_result`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ task_id_list: [taskId] }),
        })

        if (!res.ok) continue

        const data = await res.json()
        // API wraps response in {data: {data_list: [...]}}
        const result = data?.data?.data_list?.[0] ?? data?.data_list?.[0] ?? data?.[0]
        if (!result) continue

        // status: 0=pending, 1=completed, 2=failed
        if (result.status === 2) {
          console.error('[AceStepEngine] Task failed:', taskId)
          return null
        }

        if (result.status === 1) {
          // Parse the result to find audio path
          const resultData = typeof result.result === 'string' ? JSON.parse(result.result) : result.result
          const audioPath = Array.isArray(resultData)
            ? resultData[0]?.audio_path
            : resultData?.audio_path

          if (audioPath) {
            console.log('[AceStepEngine] Generation complete:', taskId)
            return audioPath.startsWith('/') ? audioPath : `/v1/audio?path=${encodeURIComponent(audioPath)}`
          }
        }
      } catch {
        // Polling error, retry
      }
    }

    console.warn('[AceStepEngine] Polling timeout for task:', taskId)
    return null
  }

  stop(): void {
    this.playing = false
    if (this.generateLoop) {
      clearTimeout(this.generateLoop)
      this.generateLoop = null
    }
    try { this.currentSource?.stop() } catch { /* ok */ }
    this.currentSource = null
    this.audioContext?.close()
    this.audioContext = null
  }

  updateParameters(params: MusicParameters): void {
    this.currentParams = params
  }

  getAudioNode(): AudioNode | null {
    return this.gainNode
  }

  isPlaying(): boolean {
    return this.playing
  }
}
