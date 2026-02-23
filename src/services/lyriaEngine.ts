import type { MusicEngine, MusicParameters } from '../types'
import { buildMusicPrompt } from './musicEngine'

/**
 * Lyria / Gemini Live Audio Music Engine
 *
 * Uses Google's Gemini Live API via WebSocket for real-time audio generation.
 * Falls back through model candidates until one works.
 */

const MODEL_CANDIDATES = [
  'models/gemini-2.5-flash-native-audio-latest',
]

export class LyriaEngine implements MusicEngine {
  private ws: WebSocket | null = null
  private audioContext: AudioContext | null = null
  private gainNode: GainNode | null = null
  private playing = false
  private apiKey: string
  private currentParams: MusicParameters | null = null
  private nextStartTime = 0
  private modelIndex = 0
  private setupComplete = false
  private reconnectCount = 0
  private maxReconnects = 3
  private lastPromptSent = 0
  private promptThrottleMs = 5000

  constructor(apiKey: string = '') {
    this.apiKey = apiKey
  }

  async start(): Promise<void> {
    if (this.playing) return

    if (!this.apiKey) {
      console.warn('[LyriaEngine] No API key — set one in Settings')
      return
    }

    this.audioContext = new AudioContext({ sampleRate: 24000 })
    this.gainNode = this.audioContext.createGain()
    this.gainNode.connect(this.audioContext.destination)
    this.playing = true
    this.modelIndex = 0
    this.reconnectCount = 0

    this.connectWebSocket()
  }

  private connectWebSocket() {
    if (!this.apiKey || !this.playing) return

    const model = MODEL_CANDIDATES[this.modelIndex]
    const url = `wss://generativelanguage.googleapis.com/ws/google.ai.generativelanguage.v1beta.GenerativeService.BidiGenerateContent?key=${this.apiKey}`

    try {
      this.ws = new WebSocket(url)
      this.setupComplete = false

      this.ws.onopen = () => {
        const setupMsg = {
          setup: {
            model,
            generationConfig: {
              responseModalities: ['AUDIO'],
              speechConfig: {
                voiceConfig: {
                  prebuiltVoiceConfig: { voiceName: 'Aoede' }
                }
              }
            }
          }
        }
        this.ws?.send(JSON.stringify(setupMsg))

        // Send initial prompt immediately after setup to prevent idle timeout
        setTimeout(() => {
          if (this.ws?.readyState === WebSocket.OPEN && !this.setupComplete) {
            const prompt = this.currentParams ? buildMusicPrompt(this.currentParams) : 'calm ambient electronic music, 70 BPM, C major, instrumental'
            this.ws.send(JSON.stringify({
              clientContent: {
                turns: [{
                  role: 'user',
                  parts: [{ text: `Generate continuous ambient instrumental music: ${prompt}. No vocals, no speech.` }]
                }],
                turnComplete: true
              }
            }))
          }
        }, 100)
      }

      this.ws.onmessage = async (event) => {
        try {
          let text: string
          if (typeof event.data === 'string') {
            text = event.data
          } else if (event.data instanceof Blob) {
            text = await event.data.text()
          } else if (event.data instanceof ArrayBuffer) {
            text = new TextDecoder().decode(event.data)
          } else {
            return
          }

          {
            const msg = JSON.parse(text)

            if (msg.setupComplete) {
              this.setupComplete = true
              this.reconnectCount = 0
              if (this.currentParams) {
                this.sendParameters(this.currentParams)
              }
            }

            // Handle inline audio data in server content
            if (msg.serverContent?.modelTurn?.parts) {
              for (const part of msg.serverContent.modelTurn.parts) {
                if (part.inlineData?.data) {
                  const raw = atob(part.inlineData.data)
                  const pcm = new Int16Array(raw.length / 2)
                  for (let i = 0; i < pcm.length; i++) {
                    pcm[i] = raw.charCodeAt(i * 2) | (raw.charCodeAt(i * 2 + 1) << 8)
                  }
                  this.playPCM(pcm)
                }
              }
            }
          }
        } catch (err) {
          console.error('[LyriaEngine] Message parse error:', err)
        }
      }

      this.ws.onerror = (err) => {
        console.error('[LyriaEngine] WebSocket error:', err)
      }

      this.ws.onclose = (event) => {
        console.log(`[LyriaEngine] WebSocket closed: code=${event.code} reason="${event.reason}"`)

        if (!this.playing) return

        // If setup never completed, try next model
        if (!this.setupComplete) {
          this.modelIndex++
          if (this.modelIndex < MODEL_CANDIDATES.length) {
            console.log('[LyriaEngine] Trying next model...')
            setTimeout(() => this.connectWebSocket(), 500)
            return
          }
          console.error('[LyriaEngine] All models failed. Check your API key at aistudio.google.com')
          return
        }

        // If it was working, try to reconnect
        this.reconnectCount++
        if (this.reconnectCount <= this.maxReconnects) {
          setTimeout(() => this.connectWebSocket(), 2000)
        }
      }
    } catch (err) {
      console.error('[LyriaEngine] Failed to connect:', err)
    }
  }

  private playPCM(pcm: Int16Array) {
    if (!this.audioContext || !this.gainNode) return

    const float32 = new Float32Array(pcm.length)
    for (let i = 0; i < pcm.length; i++) {
      float32[i] = pcm[i] / 32768
    }

    const buffer = this.audioContext.createBuffer(1, float32.length, 24000)
    buffer.getChannelData(0).set(float32)

    const source = this.audioContext.createBufferSource()
    source.buffer = buffer
    source.connect(this.gainNode)

    const now = this.audioContext.currentTime
    const startTime = Math.max(now, this.nextStartTime)
    source.start(startTime)
    this.nextStartTime = startTime + buffer.duration
  }

  private sendParameters(params: MusicParameters) {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN || !this.setupComplete) return

    const prompt = buildMusicPrompt(params)

    this.ws.send(JSON.stringify({
      clientContent: {
        turns: [{
          role: 'user',
          parts: [{ text: `Generate continuous ambient instrumental music with these characteristics: ${prompt}. No vocals, no speech. Pure instrumental ambient music.` }]
        }],
        turnComplete: true
      }
    }))
  }

  stop(): void {
    this.playing = false
    this.ws?.close()
    this.ws = null
    this.audioContext?.close()
    this.audioContext = null
  }

  updateParameters(params: MusicParameters): void {
    this.currentParams = params
    if (this.setupComplete) {
      const now = Date.now()
      if (now - this.lastPromptSent >= this.promptThrottleMs) {
        this.lastPromptSent = now
        this.sendParameters(params)
      }
    }
  }

  getAudioNode(): AudioNode | null {
    return this.gainNode
  }

  isPlaying(): boolean {
    return this.playing
  }
}
