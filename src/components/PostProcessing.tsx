import { useRef, useEffect, useMemo } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import * as THREE from 'three'
import {
  EffectComposer,
  RenderPass,
  EffectPass,
  BloomEffect,
  VignetteEffect,
} from 'postprocessing'
import { useMusicStore } from '../stores/musicStore'
import { useStockStore } from '../stores/stockStore'

export function PostProcessing() {
  const { gl, scene, camera, size } = useThree()
  const composerRef = useRef<EffectComposer | null>(null)
  const bloomRef = useRef<BloomEffect | null>(null)

  // Create composer once
  const composer = useMemo(() => {
    const c = new EffectComposer(gl, {
      frameBufferType: THREE.HalfFloatType,
    })

    const renderPass = new RenderPass(scene, camera)

    const bloom = new BloomEffect({
      intensity: 1.0,
      luminanceThreshold: 0.15,
      luminanceSmoothing: 0.9,
      mipmapBlur: true,
    })

    const vignette = new VignetteEffect({
      darkness: 0.5,
      offset: 0.3,
    })

    c.addPass(renderPass)
    c.addPass(new EffectPass(camera, bloom, vignette))
    c.setSize(size.width, size.height)

    bloomRef.current = bloom
    return c
  }, [gl, scene, camera])

  useEffect(() => {
    composerRef.current = composer
    return () => { composer.dispose() }
  }, [composer])

  useEffect(() => {
    composer.setSize(size.width, size.height)
  }, [size, composer])

  // Take over rendering at priority 1
  useFrame((_, delta) => {
    const audioData = useMusicStore.getState().audioData
    const stock = useStockStore.getState()
    const isPlaying = useMusicStore.getState().isPlaying

    if (bloomRef.current) {
      const bass = isPlaying ? audioData.bass : 0.3
      const target = 0.8 + bass * 2.0 + stock.volatility * 1.5
      bloomRef.current.intensity += (target - bloomRef.current.intensity) * 0.1
    }

    composer.render(delta)
  }, 1)

  return null
}
