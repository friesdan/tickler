import { useState, useRef, useEffect } from 'react'

export function InfoTooltip({ text }: { text: string }) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [open])

  return (
    <div ref={ref} className="relative inline-flex items-center ml-1">
      <button
        onClick={() => setOpen((o) => !o)}
        onMouseEnter={() => setOpen(true)}
        onMouseLeave={() => setOpen(false)}
        className="w-3.5 h-3.5 rounded-full border border-white/20 text-white/30 hover:text-white/60 hover:border-white/40 text-[9px] leading-none flex items-center justify-center cursor-pointer transition-colors flex-shrink-0"
        aria-label="More info"
      >
        i
      </button>
      {open && (
        <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-56 glass px-3 py-2 text-[10px] text-white/70 leading-relaxed z-50 pointer-events-none animate-fadeIn">
          {text}
        </div>
      )}
    </div>
  )
}
