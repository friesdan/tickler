import { useState, useRef, useEffect } from 'react'
import { KEYBOARD_SHORTCUTS } from '../../constants/helpText'

interface HelpButtonProps {
  onStartTour: () => void
}

export function HelpButton({ onStartTour }: HelpButtonProps) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

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
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen((o) => !o)}
        className="w-11 h-11 rounded-full glass flex items-center justify-center text-white/50 hover:text-white/70 cursor-pointer transition-colors text-sm font-bold"
        aria-label="Help menu"
        aria-expanded={open}
        aria-controls="help-menu"
      >
        ?
      </button>

      {open && (
        <div id="help-menu" role="menu" className="absolute bottom-full right-0 mb-2 w-56 glass px-4 py-3 text-xs animate-fadeInUp">
          <button
            role="menuitem"
            onClick={() => { setOpen(false); onStartTour() }}
            className="w-full text-left py-1.5 text-white/70 hover:text-white cursor-pointer transition-colors"
          >
            Take Tour
          </button>

          <div className="border-t border-white/10 mt-2 pt-2">
            <div className="text-white/55 font-bold uppercase tracking-wider mb-1.5 text-[10px]">
              Keyboard Shortcuts
            </div>
            {KEYBOARD_SHORTCUTS.map((s) => (
              <div key={s.key} className="flex justify-between py-0.5">
                <kbd className="text-white/60 bg-white/[0.06] px-1.5 py-0.5 rounded text-[10px]">{s.key}</kbd>
                <span className="text-white/60">{s.action}</span>
              </div>
            ))}
          </div>

          <div className="border-t border-white/10 mt-2 pt-2">
            <span className="text-white/40 text-[10px]">
              Stock data &#8594; Music &#8594; Visuals
            </span>
          </div>
        </div>
      )}
    </div>
  )
}
