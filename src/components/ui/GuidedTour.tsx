import { useState, useEffect, useCallback, useRef } from 'react'
import { TOUR_STEPS, type TourStep } from '../../constants/helpText'

interface GuidedTourProps {
  onComplete: () => void
}

interface Rect {
  top: number
  left: number
  width: number
  height: number
}

const PAD = 8
const TOOLTIP_GAP = 12

export function GuidedTour({ onComplete }: GuidedTourProps) {
  const [step, setStep] = useState(0)
  const [targetRect, setTargetRect] = useState<Rect | null>(null)
  const observerRef = useRef<ResizeObserver | null>(null)

  const current: TourStep = TOUR_STEPS[step]
  const isLast = step === TOUR_STEPS.length - 1

  const measure = useCallback(() => {
    const el = document.querySelector(`[data-tour-id="${current.target}"]`)
    if (!el) return
    const r = el.getBoundingClientRect()
    setTargetRect({ top: r.top, left: r.left, width: r.width, height: r.height })
  }, [current.target])

  useEffect(() => {
    measure()

    // Re-measure on scroll/resize
    window.addEventListener('resize', measure)
    window.addEventListener('scroll', measure, true)

    // ResizeObserver for layout shifts
    const el = document.querySelector(`[data-tour-id="${current.target}"]`)
    if (el) {
      observerRef.current = new ResizeObserver(measure)
      observerRef.current.observe(el)
    }

    return () => {
      window.removeEventListener('resize', measure)
      window.removeEventListener('scroll', measure, true)
      observerRef.current?.disconnect()
    }
  }, [current.target, measure])

  const next = () => {
    if (isLast) {
      localStorage.setItem('tickler-has-completed-tour', 'true')
      onComplete()
    } else {
      setStep((s) => s + 1)
    }
  }

  const skip = () => {
    localStorage.setItem('tickler-has-completed-tour', 'true')
    onComplete()
  }

  if (!targetRect) return null

  // Cutout coords with padding
  const cx = targetRect.left - PAD
  const cy = targetRect.top - PAD
  const cw = targetRect.width + PAD * 2
  const ch = targetRect.height + PAD * 2
  const cr = 12

  // Tooltip positioning
  const tooltipStyle = getTooltipPosition(current.position, targetRect)

  return (
    <div className="fixed inset-0 z-70 animate-fadeIn">
      {/* SVG mask overlay */}
      <svg className="absolute inset-0 w-full h-full pointer-events-auto" onClick={skip}>
        <defs>
          <mask id="tour-mask">
            <rect width="100%" height="100%" fill="white" />
            <rect x={cx} y={cy} width={cw} height={ch} rx={cr} ry={cr} fill="black" />
          </mask>
        </defs>
        <rect width="100%" height="100%" fill="rgba(0,0,0,0.6)" mask="url(#tour-mask)" />
      </svg>

      {/* Spotlight ring */}
      <div
        className="absolute pointer-events-none rounded-xl animate-spotlightPulse"
        style={{
          top: cy,
          left: cx,
          width: cw,
          height: ch,
        }}
      />

      {/* Tooltip */}
      <div
        className="absolute glass px-5 py-4 max-w-[280px] pointer-events-auto animate-fadeInUp"
        style={tooltipStyle}
      >
        <div className="text-sm font-bold text-white mb-1">{current.title}</div>
        <div className="text-xs text-white/50 leading-relaxed mb-4">{current.body}</div>
        <div className="flex items-center justify-between">
          <span className="text-[10px] text-white/25">{step + 1} of {TOUR_STEPS.length}</span>
          <div className="flex gap-2">
            <button
              onClick={skip}
              className="px-3 py-1.5 text-[11px] text-white/30 hover:text-white/60 cursor-pointer transition-colors"
            >
              Skip Tour
            </button>
            <button
              onClick={next}
              className="px-4 py-1.5 text-[11px] rounded-lg bg-white/15 hover:bg-white/25 text-white font-semibold cursor-pointer transition-all"
            >
              {isLast ? 'Done' : 'Next'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

function getTooltipPosition(
  position: TourStep['position'],
  rect: Rect,
): React.CSSProperties {
  switch (position) {
    case 'bottom':
      return {
        top: rect.top + rect.height + TOOLTIP_GAP + PAD,
        left: rect.left,
      }
    case 'top':
      return {
        bottom: window.innerHeight - rect.top + TOOLTIP_GAP + PAD,
        left: rect.left,
      }
    case 'left':
      return {
        top: rect.top,
        right: window.innerWidth - rect.left + TOOLTIP_GAP + PAD,
      }
    case 'right':
      return {
        top: rect.top,
        left: rect.left + rect.width + TOOLTIP_GAP + PAD,
      }
  }
}
