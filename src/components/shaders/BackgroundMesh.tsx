import { useRef, useMemo } from 'react'
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
  float time = uTime * 0.25;

  // ADX controls fbm frequency — high ADX = sharper, more defined patterns
  float fbmFreq = 1.0 + uADX * 0.5;
  float n1 = fbm(p * 2.0 + time, fbmFreq);
  float n2 = fbm(p * 3.0 - time * 0.7 + 10.0, fbmFreq);
  float n3 = fbm(p * 1.5 + vec2(time * 0.3, -time * 0.5), fbmFreq);

  // Mood-driven palette — sunrise/sunset theme
  // 0=neutral, 1=euphoric, 2=calm, 3=tense, 4=dark
  float euphoric = smoothstep(0.5, 1.5, uMood) * (1.0 - smoothstep(1.5, 2.5, uMood));
  float calm = smoothstep(1.5, 2.5, uMood) * (1.0 - smoothstep(2.5, 3.5, uMood));
  float tense = smoothstep(2.5, 3.5, uMood) * (1.0 - smoothstep(3.5, 4.5, uMood));
  float dark = smoothstep(3.5, 4.5, uMood);
  float neutral = max(0.0, 1.0 - euphoric - calm - tense - dark);

  // Each mood has a dark (A) and bright (B) nebula color — high contrast
  // Euphoric: sunrise — deep amber to bright gold
  vec3 eupA = vec3(0.18, 0.06, 0.01);
  vec3 eupB = vec3(0.75, 0.38, 0.1);
  // Calm: blue hour — deep ocean to bright teal
  vec3 calA = vec3(0.01, 0.04, 0.14);
  vec3 calB = vec3(0.08, 0.28, 0.5);
  // Tense: storm — dark blood to hot crimson
  vec3 tenA = vec3(0.16, 0.01, 0.04);
  vec3 tenB = vec3(0.6, 0.1, 0.22);
  // Dark: deep night — near-black to rich purple
  vec3 drkA = vec3(0.03, 0.01, 0.08);
  vec3 drkB = vec3(0.16, 0.06, 0.42);
  // Neutral: twilight — dark gray to muted lavender
  vec3 neuA = vec3(0.04, 0.03, 0.07);
  vec3 neuB = vec3(0.22, 0.14, 0.3);

  vec3 baseA = neuA * neutral + eupA * euphoric + calA * calm + tenA * tense + drkA * dark;
  vec3 baseB = neuB * neutral + eupB * euphoric + calB * calm + tenB * tense + drkB * dark;

  // Sentiment: warm ↔ cool hue shift (momentum-driven, changes frequently)
  float sentT = uSentiment * 0.5 + 0.5;
  vec3 warmShift = vec3(0.18, 0.06, -0.1);
  vec3 coolShift = vec3(-0.1, 0.04, 0.18);
  vec3 sentShift = mix(coolShift, warmShift, sentT);
  baseA += sentShift * 0.6;
  baseB += sentShift * 0.8;

  // Volatility: brightens nebula and adds warmth
  baseB *= 1.0 + uVolatility * 0.5;
  baseB += vec3(0.12, 0.05, 0.0) * uVolatility;

  vec3 color = baseA;
  color = mix(color, baseB, smoothstep(-0.2, 0.5, n1));
  color += baseB * 0.3 * smoothstep(0.2, 0.7, n2);

  // Aurora streaks — ADX sharpens, energy intensifies
  float auroraLow = 0.3 - uADX * 0.1;
  float auroraHigh = 0.8 - uADX * 0.15;
  float aurora = smoothstep(auroraLow, auroraHigh, n3) * (0.3 + uEnergy * 0.5);
  vec3 auroraColor = mix(baseB * 1.5, vec3(0.5, 0.3, 0.1), euphoric + tense * 0.5);
  color += auroraColor * aurora * 0.4;

  // Bass pulse
  color *= 1.0 + uBass * 0.3;

  // RSI hue shift: overbought → warm glow, oversold → cool wash
  float rsiCenter = uRSI - 0.5;
  color += vec3(rsiCenter * 0.4, rsiCenter * 0.12, -rsiCenter * 0.25);

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

    // Sentiment from short-term momentum (oscillates frequently, not cumulative drift)
    const sentiment = Math.max(-1, Math.min(1, stock.momentum * 3))
    mat.uniforms.uSentiment.value += (sentiment - mat.uniforms.uSentiment.value) * 0.08
    mat.uniforms.uVolatility.value += (stock.volatility - mat.uniforms.uVolatility.value) * 0.06
    mat.uniforms.uEnergy.value += (params.energy - mat.uniforms.uEnergy.value) * 0.06

    // Mood as float: neutral=0, euphoric=1, calm=2, tense=3, dark=4
    const moodMap: Record<string, number> = { neutral: 0, euphoric: 1, calm: 2, tense: 3, dark: 4 }
    const targetMood = moodMap[params.mood] ?? 0
    mat.uniforms.uMood.value += (targetMood - mat.uniforms.uMood.value) * 0.08

    // RSI and ADX — faster lerp for visible response
    const rsiNorm = stock.rsi / 100
    const adxNorm = stock.adx / 100
    mat.uniforms.uRSI.value += (rsiNorm - mat.uniforms.uRSI.value) * 0.06
    mat.uniforms.uADX.value += (adxNorm - mat.uniforms.uADX.value) * 0.06

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
        uniforms={useMemo(() => ({
          uTime: { value: 0 },
          uSentiment: { value: 0 },
          uVolatility: { value: 0.3 },
          uEnergy: { value: 0.3 },
          uBass: { value: 0 },
          uMood: { value: 0 },
          uRSI: { value: 0.5 },
          uADX: { value: 0.2 },
          uResolution: { value: new THREE.Vector2(800, 600) },
        }), [])}
      />
    </mesh>
  )
}
