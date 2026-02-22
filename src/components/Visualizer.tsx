import { Canvas } from '@react-three/fiber'
import { useStockStore } from '../stores/stockStore'
import { useMusicStore } from '../stores/musicStore'
import { analyzeStock } from '../services/stockAnalyzer'
import { useEffect } from 'react'
import { ParticleField } from './shaders/ParticleField'
import { BackgroundMesh } from './shaders/BackgroundMesh'
import { CameraController } from './CameraController'
import { PostProcessing } from './PostProcessing'

export function Visualizer() {
  const stock = useStockStore()
  const setTarget = useMusicStore((s) => s.setTargetParameters)
  const lerpParams = useMusicStore((s) => s.lerpParameters)

  useEffect(() => {
    if (stock.price > 0) {
      setTarget(analyzeStock(stock))
    }
  }, [stock.price, stock.volatility, stock.momentum, stock.trend, setTarget])

  useEffect(() => {
    let lastTime = performance.now()
    const interval = setInterval(() => {
      const now = performance.now()
      lerpParams((now - lastTime) / 1000)
      lastTime = now
    }, 16)
    return () => clearInterval(interval)
  }, [lerpParams])

  return (
    <Canvas
      camera={{ position: [0, 0, 5], fov: 60 }}
      style={{ position: 'absolute', inset: 0 }}
      gl={{ preserveDrawingBuffer: true }}
      dpr={[1, 2]}
    >
      <color attach="background" args={['#050510']} />
      <BackgroundMesh />
      <ParticleField />
      <CameraController />
      <PostProcessing />
    </Canvas>
  )
}
