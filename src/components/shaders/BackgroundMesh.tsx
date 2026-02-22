import { useRef } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import * as THREE from 'three'
import { useMusicStore } from '../../stores/musicStore'
import { useStockStore } from '../../stores/stockStore'

const bgVert = /* glsl */ `
varying vec2 vUv;
void main() {
  vUv = uv;
  gl_Position = vec4(position.xy * 2.0, 0.9999, 1.0);
}
`

const bgFrag = /* glsl */ `
uniform float uTime;
uniform float uSentiment;
uniform float uVolatility;
uniform float uEnergy;
uniform float uBass;
uniform float uRSI;
uniform float uADX;
uniform float uMood;
uniform vec2 uResolution;

varying vec2 vUv;

vec3 mod289v3(vec3 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
vec2 mod289v2(vec2 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
vec3 permute(vec3 x) { return mod289v3(((x * 34.0) + 1.0) * x); }

float snoise(vec2 v) {
  const vec4 C = vec4(0.211324865405187, 0.366025403784439, -0.577350269189626, 0.024390243902439);
  vec2 i = floor(v + dot(v, C.yy));
  vec2 x0 = v - i + dot(i, C.xx);
  vec2 i1 = (x0.x > x0.y) ? vec2(1.0, 0.0) : vec2(0.0, 1.0);
  vec4 x12 = x0.xyxy + C.xxzz;
  x12.xy -= i1;
  i = mod289v2(i);
  vec3 p = permute(permute(i.y + vec3(0.0, i1.y, 1.0)) + i.x + vec3(0.0, i1.x, 1.0));
  vec3 m = max(0.5 - vec3(dot(x0, x0), dot(x12.xy, x12.xy), dot(x12.zw, x12.zw)), 0.0);
  m = m * m; m = m * m;
  vec3 x = 2.0 * fract(p * C.www) - 1.0;
  vec3 h = abs(x) - 0.5;
  vec3 ox = floor(x + 0.5);
  vec3 a0 = x - ox;
  m *= 1.79284291400159 - 0.85373472095314 * (a0 * a0 + h * h);
  vec3 g;
  g.x = a0.x * x0.x + h.x * x0.y;
  g.yz = a0.yz * x12.xz + h.yz * x12.yw;
  return 130.0 * dot(m, g);
}

float fbm(vec2 p, float freqScale) {
  float val = 0.0; float amp = 0.5; float freq = freqScale;
  for(int i = 0; i < 5; i++) { val += amp * snoise(p * freq); freq *= 2.0; amp *= 0.5; }
  return val;
}

void main() {
  vec2 uv = vUv;
  float aspect = uResolution.x / uResolution.y;
  vec2 p = (uv - 0.5) * vec2(aspect, 1.0);
  float time = uTime * 0.15;

  // ADX controls fbm frequency — high ADX = sharper, more defined patterns
  float fbmFreq = 1.0 + uADX * 0.5;
  float n1 = fbm(p * 2.0 + time, fbmFreq);
  float n2 = fbm(p * 3.0 - time * 0.7 + 10.0, fbmFreq);
  float n3 = fbm(p * 1.5 + vec2(time * 0.3, -time * 0.5), fbmFreq);

  vec3 calmA = vec3(0.02, 0.02, 0.08);
  vec3 calmB = vec3(0.1, 0.05, 0.2);
  vec3 bullA = vec3(0.0, 0.08, 0.05);
  vec3 bullB = vec3(0.0, 0.3, 0.15);
  vec3 bearA = vec3(0.08, 0.01, 0.02);
  vec3 bearB = vec3(0.3, 0.05, 0.1);
  vec3 volA = vec3(0.1, 0.03, 0.0);
  vec3 volB = vec3(0.4, 0.15, 0.0);

  float sentT = uSentiment * 0.5 + 0.5;
  vec3 baseA = mix(bearA, bullA, sentT);
  vec3 baseB = mix(bearB, bullB, sentT);
  baseA = mix(baseA, volA, uVolatility * 0.6);
  baseB = mix(baseB, volB, uVolatility * 0.6);
  float calmF = smoothstep(0.3, 0.0, uEnergy);
  baseA = mix(baseA, calmA, calmF);
  baseB = mix(baseB, calmB, calmF);

  vec3 color = baseA;
  color = mix(color, baseB, smoothstep(-0.2, 0.5, n1));
  color += baseB * 0.3 * smoothstep(0.2, 0.7, n2);

  // ADX sharpens aurora smoothstep thresholds (more contrast when trending)
  float auroraLow = 0.3 - uADX * 0.1;   // 0.3 → 0.2 at high ADX
  float auroraHigh = 0.8 - uADX * 0.15;  // 0.8 → 0.65 at high ADX
  float aurora = smoothstep(auroraLow, auroraHigh, n3) * (0.3 + uEnergy * 0.5);
  vec3 auroraColor = mix(vec3(0.0, 0.5, 0.3), vec3(0.5, 0.0, 0.3), sentT);
  color += auroraColor * aurora * 0.4;
  color *= 1.0 + uBass * 0.3;

  // RSI hue tint: high RSI → warm amber, low RSI → cool cyan
  vec3 warmTint = vec3(0.3, 0.15, 0.02);
  vec3 coolTint = vec3(0.02, 0.15, 0.25);
  color = mix(color, color + coolTint, (1.0 - uRSI) * 0.15);
  color = mix(color, color + warmTint, uRSI * 0.15);

  // Mood color overlay — 5 mood palettes blended at ~35%
  // 0=neutral, 1=euphoric, 2=calm, 3=tense, 4=dark
  vec3 moodTint = vec3(0.0);
  float moodWeight = 0.0;
  // Euphoric: golden amber warmth
  float euphoric = smoothstep(0.5, 1.5, uMood) * (1.0 - smoothstep(1.5, 2.5, uMood));
  moodTint += vec3(0.35, 0.22, 0.05) * euphoric;
  moodWeight += euphoric;
  // Calm: deeper blue-purple, softer
  float calm = smoothstep(1.5, 2.5, uMood) * (1.0 - smoothstep(2.5, 3.5, uMood));
  moodTint += vec3(0.05, 0.1, 0.3) * calm;
  moodWeight += calm;
  // Tense: magenta/red sharpness
  float tense = smoothstep(2.5, 3.5, uMood) * (1.0 - smoothstep(3.5, 4.5, uMood));
  moodTint += vec3(0.3, 0.05, 0.15) * tense;
  moodWeight += tense;
  // Dark: deep indigo/purple
  float dark = smoothstep(3.5, 4.5, uMood);
  moodTint += vec3(0.1, 0.02, 0.25) * dark;
  moodWeight += dark;
  // Apply mood tint
  color = mix(color, color + moodTint, 0.35 * clamp(moodWeight, 0.0, 1.0));

  float vig = 1.0 - dot(p * 0.7, p * 0.7);
  color *= smoothstep(0.0, 0.7, vig);

  gl_FragColor = vec4(max(color, 0.0), 1.0);
}
`

export function BackgroundMesh() {
  const ref = useRef<THREE.ShaderMaterial>(null!)
  const { size } = useThree()

  useFrame((state) => {
    const mat = ref.current
    if (!mat) return
    const audioData = useMusicStore.getState().audioData
    const params = useMusicStore.getState().parameters
    const stock = useStockStore.getState()
    const t = state.clock.elapsedTime

    mat.uniforms.uTime.value = t
    mat.uniforms.uResolution.value.set(size.width, size.height)

    const sentiment = stock.changePercent > 0 ? Math.min(stock.changePercent / 3, 1) : Math.max(stock.changePercent / 3, -1)
    mat.uniforms.uSentiment.value += (sentiment - mat.uniforms.uSentiment.value) * 0.03
    mat.uniforms.uVolatility.value += (stock.volatility - mat.uniforms.uVolatility.value) * 0.03
    mat.uniforms.uEnergy.value += (params.energy - mat.uniforms.uEnergy.value) * 0.03

    // Mood as float: neutral=0, euphoric=1, calm=2, tense=3, dark=4
    const moodMap: Record<string, number> = { neutral: 0, euphoric: 1, calm: 2, tense: 3, dark: 4 }
    const targetMood = moodMap[params.mood] ?? 0
    mat.uniforms.uMood.value += (targetMood - mat.uniforms.uMood.value) * 0.03

    // RSI and ADX with same smooth lerp
    const rsiNorm = stock.rsi / 100
    const adxNorm = stock.adx / 100
    mat.uniforms.uRSI.value += (rsiNorm - mat.uniforms.uRSI.value) * 0.03
    mat.uniforms.uADX.value += (adxNorm - mat.uniforms.uADX.value) * 0.03

    const isPlaying = useMusicStore.getState().isPlaying
    const bass = isPlaying ? audioData.bass : (0.3 + Math.sin(t * 2) * 0.15)
    mat.uniforms.uBass.value += (bass - mat.uniforms.uBass.value) * 0.08
  })

  return (
    <mesh frustumCulled={false} renderOrder={-1000}>
      <planeGeometry args={[1, 1]} />
      <shaderMaterial
        ref={ref}
        vertexShader={bgVert}
        fragmentShader={bgFrag}
        depthTest={false}
        depthWrite={false}
        uniforms={{
          uTime: { value: 0 },
          uSentiment: { value: 0 },
          uVolatility: { value: 0.3 },
          uEnergy: { value: 0.3 },
          uBass: { value: 0 },
          uMood: { value: 0 },
          uRSI: { value: 0.5 },
          uADX: { value: 0.2 },
          uResolution: { value: new THREE.Vector2(800, 600) },
        }}
      />
    </mesh>
  )
}
