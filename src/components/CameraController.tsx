import { useRef } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import { useStockStore } from '../stores/stockStore'
import { useMusicStore } from '../stores/musicStore'

export function CameraController() {
  const { camera } = useThree()
  const frozenTimeRef = useRef(0)

  useFrame((state) => {
    const isPlaying = useMusicStore.getState().isPlaying

    // Freeze time when paused — camera smoothly settles to rest
    if (isPlaying) frozenTimeRef.current = state.clock.elapsedTime
    const t = frozenTimeRef.current

    const stock = useStockStore.getState()

    // Gentle drift in calm markets, more shake in volatile ones
    const driftSpeed = 0.2 + stock.volatility * 0.5
    const driftRadius = 0.5 + stock.volatility * 2.0

    // Smooth circular drift
    const baseX = Math.sin(t * driftSpeed * 0.3) * driftRadius * 0.5
    const baseY = Math.cos(t * driftSpeed * 0.2) * driftRadius * 0.3
    const baseZ = 5 + Math.sin(t * 0.1) * 0.5

    // No shake when paused
    const shakeAmount = isPlaying ? stock.volatility * 0.3 : 0
    const shakeX = Math.sin(t * 15 + 1) * shakeAmount
    const shakeY = Math.cos(t * 13 + 2) * shakeAmount

    // Smoothly move camera (lerp continues even when paused, settling to frozen position)
    camera.position.x += ((baseX + shakeX) - camera.position.x) * 0.02
    camera.position.y += ((baseY + shakeY) - camera.position.y) * 0.02
    camera.position.z += (baseZ - camera.position.z) * 0.02

    camera.lookAt(0, 0, 0)
  })

  return null
}
