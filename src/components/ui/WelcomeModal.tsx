import React from 'react'
import { WELCOME_CONTENT } from '../../constants/helpText'

interface WelcomeModalProps {
  onTrySimulator: () => void
  onConnectLive: () => void
}

function ChartIcon() {
  return (
    <svg width="32" height="32" viewBox="0 0 32 32" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="4,24 10,16 16,20 22,10 28,14" />
      <line x1="4" y1="28" x2="28" y2="28" />
    </svg>
  )
}

function MusicIcon() {
  return (
    <svg width="32" height="32" viewBox="0 0 32 32" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="10" cy="24" r="4" />
      <circle cx="24" cy="20" r="4" />
      <line x1="14" y1="24" x2="14" y2="8" />
      <line x1="28" y1="20" x2="28" y2="4" />
      <line x1="14" y1="8" x2="28" y2="4" />
    </svg>
  )
}

function EyeIcon() {
  return (
    <svg width="32" height="32" viewBox="0 0 32 32" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M2 16s5-10 14-10 14 10 14 10-5 10-14 10S2 16 2 16z" />
      <circle cx="16" cy="16" r="4" />
    </svg>
  )
}

const ICONS: Record<string, () => React.JSX.Element> = {
  chart: ChartIcon,
  music: MusicIcon,
  eye: EyeIcon,
}

export function WelcomeModal({ onTrySimulator, onConnectLive }: WelcomeModalProps) {
  return (
    <div className="fixed inset-0 z-60 flex items-center justify-center p-4 animate-fadeIn">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />

      {/* Card */}
      <div className="relative w-full max-w-[520px] glass px-6 py-8 sm:px-8 sm:py-10 text-center animate-fadeInUp">
        <h1 className="text-2xl sm:text-3xl font-bold text-white mb-2">
          {WELCOME_CONTENT.headline}
        </h1>
        <p className="text-sm text-white/50 mb-8 max-w-md mx-auto">
          {WELCOME_CONTENT.tagline}
        </p>

        {/* Pipeline */}
        <div className="flex items-center justify-center gap-3 sm:gap-4 mb-10">
          {WELCOME_CONTENT.steps.map((step, i) => {
            const Icon = ICONS[step.icon]
            return (
              <div key={step.label} className="flex items-center gap-3 sm:gap-4">
                <div className="flex flex-col items-center gap-1.5 w-20 sm:w-24">
                  <div className="text-white/40">
                    <Icon />
                  </div>
                  <span className="text-[11px] font-bold text-white/70">{step.label}</span>
                  <span className="text-[9px] text-white/30 leading-tight">{step.desc}</span>
                </div>
                {i < WELCOME_CONTENT.steps.length - 1 && (
                  <span className="text-white/20 text-lg -mt-6">&#8594;</span>
                )}
              </div>
            )
          })}
        </div>

        {/* CTAs */}
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <button
            onClick={onTrySimulator}
            className="px-6 py-3 rounded-xl bg-white/15 hover:bg-white/25 active:bg-white/30 text-white font-semibold text-sm transition-all cursor-pointer"
          >
            {WELCOME_CONTENT.ctaPrimary}
          </button>
          <button
            onClick={onConnectLive}
            className="px-6 py-3 rounded-xl border border-white/15 hover:border-white/30 text-white/60 hover:text-white/90 text-sm transition-all cursor-pointer"
          >
            {WELCOME_CONTENT.ctaSecondary}
          </button>
        </div>
      </div>
    </div>
  )
}
