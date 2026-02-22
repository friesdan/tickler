import { useFrame, useThree } from '@react-three/fiber'
import { useStockStore } from '../stores/stockStore'
import { useMusicStore } from '../stores/musicStore'

export function CameraController() {
  const { camera } = useThree()

  useFrame((state) => {
    const t = state.clock.elapsedTime
    const stock = useStockStore.getState()
    const params = useMusicStore.getState().parameters

    // Gentle drift in calm markets, more shake in volatile ones
    const driftSpeed = 0.2 + stock.volatility * 0.5
    const driftRadius = 0.5 + stock.volatility * 2.0

    // Smooth circular drift
    const baseX = Math.sin(t * driftSpeed * 0.3) * driftRadius * 0.5
    const baseY = Math.cos(t * driftSpeed * 0.2) * driftRadius * 0.3
    const baseZ = 5 + Math.sin(t * 0.1) * 0.5

    // Volatile shake overlay
    const shakeAmount = stock.volatility * 0.3
    const shakeX = Math.sin(t * 15 + 1) * shakeAmount
    const shakeY = Math.cos(t * 13 + 2) * shakeAmount

    // Smoothly move camera
    camera.position.x += ((baseX + shakeX) - camera.position.x) * 0.02
    camera.position.y += ((baseY + shakeY) - camera.position.y) * 0.02
    camera.position.z += (baseZ - camera.position.z) * 0.02

    camera.lookAt(0, 0, 0)
  })

  return null
}
