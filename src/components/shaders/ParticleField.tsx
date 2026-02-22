import { useRef, useMemo } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { useMusicStore } from '../../stores/musicStore'
import { useStockStore } from '../../stores/stockStore'

const PARTICLE_COUNT = 8000

// Encode size, phase, and velocity into extra attributes via color and uv
// Using PointsMaterial approach: encode in color (velocity) and size (via uniform array)
// Simpler: just use position + color channels to encode everything
const vertShader = /* glsl */ `
uniform float uTime;
uniform float uBass;
uniform float uMid;
uniform float uTreble;
uniform float uRms;
uniform float uSentiment;
uniform float uVolatility;
uniform float uEnergy;
uniform float uMomentum;

// Encode extra data: color.r = phase, color.g = size, color.b = velocity magnitude
// normal.xyz = velocity direction

varying float vAlpha;
varying float vSentiment;
varying float vEnergy;
varying float vPhase;

void main() {
  float phase = color.r;
  float size = color.g;
  vec3 vel = normal;

  vec3 pos = position;

  float angle = uTime * 0.3 + phase * 6.28;
  float orbitRadius = length(pos.xy) * (1.0 + uBass * 0.3);
  pos.x += sin(angle + pos.z * 0.5) * orbitRadius * 0.1;
  pos.y += cos(angle + pos.x * 0.5) * orbitRadius * 0.1;

  float freq = uBass * 0.5 + uMid * 0.3 + uTreble * 0.2;
  pos += vel * freq * 2.0;

  float shake = uVolatility * 0.5;
  pos.x += sin(uTime * 15.0 + phase * 100.0) * shake;
  pos.y += cos(uTime * 13.0 + phase * 80.0) * shake;
  pos.z += sin(uTime * 11.0 + phase * 60.0) * shake * 0.5;

  pos.y += uMomentum * sin(uTime * 0.5) * 0.5 * (0.5 + phase);

  float breathe = 1.0 + sin(uTime * 2.0 + phase * 3.14) * uEnergy * 0.3;
  pos *= breathe;

  vec4 mvPosition = modelViewMatrix * vec4(pos, 1.0);
  gl_Position = projectionMatrix * mvPosition;

  float baseSz = size * (2.0 + uBass * 3.0 + uRms * 1.0);
  float distScale = 20.0 / max(-mvPosition.z, 0.1);
  gl_PointSize = clamp(baseSz * distScale, 0.5, 30.0);

  vAlpha = smoothstep(0.0, 0.3, uRms + 0.2) * (0.15 + uEnergy * 0.35);
  vSentiment = uSentiment;
  vEnergy = uEnergy;
  vPhase = phase;
}
`

const fragShader = /* glsl */ `
varying float vAlpha;
varying float vSentiment;
varying float vEnergy;
varying float vPhase;

void main() {
  vec2 center = gl_PointCoord - 0.5;
  float dist = length(center);
  if (dist > 0.5) discard;
  float softEdge = 1.0 - smoothstep(0.2, 0.5, dist);

  vec3 bullishColor = vec3(0.0, 1.0, 0.53);
  vec3 bearishColor = vec3(1.0, 0.2, 0.4);
  vec3 euphoricColor = vec3(1.0, 0.84, 0.0);
  vec3 calmColor = vec3(0.3, 0.5, 1.0);

  float t = vSentiment * 0.5 + 0.5;
  vec3 baseColor = mix(bearishColor, bullishColor, t);

  float euphoricMix = smoothstep(0.6, 1.0, vEnergy) * smoothstep(0.3, 0.8, t);
  baseColor = mix(baseColor, euphoricColor, euphoricMix * 0.7);

  float calmMix = smoothstep(0.3, 0.0, vEnergy);
  baseColor = mix(baseColor, calmColor, calmMix * 0.5);

  baseColor += 0.05 * sin(vPhase * 50.0 + vec3(0.0, 2.09, 4.18));

  float glow = pow(max(1.0 - dist * 2.0, 0.0), 3.0) * 0.5;
  vec3 finalColor = baseColor + glow;

  gl_FragColor = vec4(finalColor, softEdge * vAlpha);
}
`

export function ParticleField() {
  const pointsRef = useRef<THREE.Points>(null!)
  const matRef = useRef<THREE.ShaderMaterial>(null!)

  // Build geometry with position, color (phase+size), and normal (velocity)
  const { positions, colors, normals } = useMemo(() => {
    const positions = new Float32Array(PARTICLE_COUNT * 3)
    const colors = new Float32Array(PARTICLE_COUNT * 3)
    const normals = new Float32Array(PARTICLE_COUNT * 3)

    for (let i = 0; i < PARTICLE_COUNT; i++) {
      const theta = Math.random() * Math.PI * 2
      const phi = Math.acos(2 * Math.random() - 1)
      const r = Math.pow(Math.random(), 0.5) * 8

      positions[i * 3] = r * Math.sin(phi) * Math.cos(theta)
      positions[i * 3 + 1] = r * Math.sin(phi) * Math.sin(theta)
      positions[i * 3 + 2] = r * Math.cos(phi)

      // Encode in color: r=phase, g=size, b=unused
      colors[i * 3] = Math.random()           // phase
      colors[i * 3 + 1] = 0.3 + Math.random() * 0.7  // size
      colors[i * 3 + 2] = 0

      // Encode velocity in normal
      normals[i * 3] = (Math.random() - 0.5) * 0.5
      normals[i * 3 + 1] = (Math.random() - 0.5) * 0.5
      normals[i * 3 + 2] = (Math.random() - 0.5) * 0.3
    }

    return { positions, colors, normals }
  }, [])

  useFrame((state) => {
    const mat = matRef.current
    if (!mat) return

    const audioData = useMusicStore.getState().audioData
    const params = useMusicStore.getState().parameters
    const stock = useStockStore.getState()
    const t = state.clock.elapsedTime
    const u = mat.uniforms

    u.uTime.value = t

    const isPlaying = useMusicStore.getState().isPlaying
    const mockBass = 0.3 + Math.sin(t * 2) * 0.15 + Math.sin(t * 0.7) * 0.1
    const mockMid = 0.25 + Math.sin(t * 3.1) * 0.12
    const mockTreble = 0.2 + Math.sin(t * 5.3) * 0.1
    const mockRms = 0.3 + Math.sin(t * 1.5) * 0.1

    const bass = isPlaying ? audioData.bass : mockBass
    const mid = isPlaying ? audioData.mid : mockMid
    const treble = isPlaying ? audioData.treble : mockTreble
    const rms = isPlaying ? audioData.rms : mockRms

    u.uBass.value += (bass - u.uBass.value) * 0.1
    u.uMid.value += (mid - u.uMid.value) * 0.1
    u.uTreble.value += (treble - u.uTreble.value) * 0.1
    u.uRms.value += (rms - u.uRms.value) * 0.1

    const sentiment = stock.changePercent > 0 ? Math.min(stock.changePercent / 3, 1) : Math.max(stock.changePercent / 3, -1)
    u.uSentiment.value += (sentiment - u.uSentiment.value) * 0.05
    u.uVolatility.value += (stock.volatility - u.uVolatility.value) * 0.05
    u.uEnergy.value += (params.energy - u.uEnergy.value) * 0.05
    u.uMomentum.value += (stock.momentum - u.uMomentum.value) * 0.05

    if (pointsRef.current) {
      pointsRef.current.rotation.y = t * 0.05
      pointsRef.current.rotation.x = Math.sin(t * 0.03) * 0.1
    }
  })

  return (
    <points ref={pointsRef}>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" args={[positions, 3]} count={PARTICLE_COUNT} itemSize={3} />
        <bufferAttribute attach="attributes-color" args={[colors, 3]} count={PARTICLE_COUNT} itemSize={3} />
        <bufferAttribute attach="attributes-normal" args={[normals, 3]} count={PARTICLE_COUNT} itemSize={3} />
      </bufferGeometry>
      <shaderMaterial
        ref={matRef}
        vertexShader={vertShader}
        fragmentShader={fragShader}
        transparent
        depthWrite={false}
        blending={THREE.AdditiveBlending}
        vertexColors
        uniforms={{
          uTime: { value: 0 },
          uBass: { value: 0 },
          uMid: { value: 0 },
          uTreble: { value: 0 },
          uRms: { value: 0 },
          uSentiment: { value: 0 },
          uVolatility: { value: 0.3 },
          uEnergy: { value: 0.3 },
          uMomentum: { value: 0 },
        }}
      />
    </points>
  )
}
