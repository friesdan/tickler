import { useState, useRef, useEffect, useId } from 'react'

export function InfoTooltip({ text }: { text: string }) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)
  const tooltipId = useId()

  useEffect(() => {
    if (!open) return
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    function handleKey(e: KeyboardEvent) {
      if (e.key === 'Escape') setOpen(false)
    }
    document.addEventListener('mousedown', handleClick)
    window.addEventListener('keydown', handleKey)
    return () => {
      document.removeEventListener('mousedown', handleClick)
      window.removeEventListener('keydown', handleKey)
    }
  }, [open])

  return (
    <div ref={ref} className="relative inline-flex items-center ml-1">
      {/* 44px touch target area, visually 14px icon */}
      <button
        onClick={() => setOpen((o) => !o)}
        onMouseEnter={() => setOpen(true)}
        onMouseLeave={() => setOpen(false)}
        className="w-5 h-5 -m-0.5 rounded-full flex items-center justify-center cursor-pointer transition-colors flex-shrink-0 group"
        aria-label="More info"
        aria-describedby={open ? tooltipId : undefined}
      >
        <span className="w-3.5 h-3.5 rounded-full border border-white/20 text-white/30 group-hover:text-white/60 group-hover:border-white/40 text-[9px] leading-none flex items-center justify-center transition-colors">
          i
        </span>
      </button>
      {open && (
        <div
          id={tooltipId}
          role="tooltip"
          className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-56 glass px-3 py-2 text-[10px] text-white/70 leading-relaxed z-50 animate-fadeIn"
        >
          {text}
        </div>
      )}
    </div>
  )
}
