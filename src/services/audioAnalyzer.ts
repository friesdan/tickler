import type { AudioData } from '../types'
import { clamp } from '../utils/math'

/**
 * Web Audio AnalyserNode wrapper.
 * Connects to an audio source and extracts frequency/waveform data for the visualizer.
 */
export class AudioAnalyzer {
  private analyser: AnalyserNode
  private audioContext: AudioContext
  private frequencyData: Uint8Array
  private waveformData: Uint8Array
  private fftSize: number
  private normalizedFreq: Float32Array
  private normalizedWave: Float32Array

  constructor(audioContext: AudioContext, fftSize = 256) {
    this.audioContext = audioContext
    this.fftSize = fftSize
    this.analyser = audioContext.createAnalyser()
    this.analyser.fftSize = fftSize
    this.analyser.smoothingTimeConstant = 0.8
    this.frequencyData = new Uint8Array(this.analyser.frequencyBinCount)
    this.waveformData = new Uint8Array(fftSize)
    this.normalizedFreq = new Float32Array(this.analyser.frequencyBinCount)
    this.normalizedWave = new Float32Array(fftSize)
  }

  connectSource(source: AudioNode) {
    source.connect(this.analyser)
  }

  getAnalyserNode(): AnalyserNode {
    return this.analyser
  }

  analyze(): AudioData {
    this.analyser.getByteFrequencyData(this.frequencyData as Uint8Array<ArrayBuffer>)
    this.analyser.getByteTimeDomainData(this.waveformData as Uint8Array<ArrayBuffer>)

    const binCount = this.analyser.frequencyBinCount
    const normalizedFreq = this.normalizedFreq
    const normalizedWave = this.normalizedWave

    // Normalize frequency data to 0-1
    for (let i = 0; i < binCount; i++) {
      normalizedFreq[i] = this.frequencyData[i] / 255
    }

    // Normalize waveform data to -1..1
    for (let i = 0; i < this.fftSize; i++) {
      normalizedWave[i] = (this.waveformData[i] - 128) / 128
    }

    // Band splits
    const bassEnd = Math.floor(binCount * 0.15)    // ~0-300Hz
    const midEnd = Math.floor(binCount * 0.5)       // ~300-2kHz
    // treble: 2k-20kHz

    let bassSum = 0, midSum = 0, trebleSum = 0

    for (let i = 0; i < bassEnd; i++) bassSum += normalizedFreq[i]
    for (let i = bassEnd; i < midEnd; i++) midSum += normalizedFreq[i]
    for (let i = midEnd; i < binCount; i++) trebleSum += normalizedFreq[i]

    const bass = clamp(bassSum / bassEnd, 0, 1)
    const mid = clamp(midSum / (midEnd - bassEnd), 0, 1)
    const treble = clamp(trebleSum / (binCount - midEnd), 0, 1)

    // RMS
    let rmsSum = 0
    for (let i = 0; i < this.fftSize; i++) {
      const s = normalizedWave[i]
      rmsSum += s * s
    }
    const rms = clamp(Math.sqrt(rmsSum / this.fftSize), 0, 1)

    return {
      frequencyData: normalizedFreq,
      waveformData: normalizedWave,
      bass,
      mid,
      treble,
      rms,
    }
  }
}
