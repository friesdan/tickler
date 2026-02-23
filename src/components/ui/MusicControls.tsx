import { useMusicStore } from '../../stores/musicStore'
import { useSettingsStore } from '../../stores/settingsStore'

export function MusicControls() {
  const isPlaying = useMusicStore((s) => s.isPlaying)
  const volume = useMusicStore((s) => s.volume)
  const setIsPlaying = useMusicStore((s) => s.setIsPlaying)
  const setVolume = useMusicStore((s) => s.setVolume)
  const style = useSettingsStore((s) => s.style)

  return (
    <div className="glass px-4 sm:px-6 py-3 flex items-center gap-3 sm:gap-6 w-full sm:w-auto justify-center">
      <button
        onClick={() => setIsPlaying(!isPlaying)}
        className="w-12 h-12 sm:w-10 sm:h-10 rounded-full bg-white/10 hover:bg-white/20 active:bg-white/30 flex items-center justify-center transition-all cursor-pointer flex-shrink-0"
        aria-label={isPlaying ? 'Pause' : 'Play'}
      >
        {isPlaying ? (
          <svg width="16" height="16" viewBox="0 0 16 16" fill="white">
            <rect x="3" y="2" width="4" height="12" rx="1" />
            <rect x="9" y="2" width="4" height="12" rx="1" />
          </svg>
        ) : (
          <svg width="16" height="16" viewBox="0 0 16 16" fill="white">
            <polygon points="4,2 14,8 4,14" />
          </svg>
        )}
      </button>

      <div className="flex items-center gap-2">
        <span className="text-white/40 text-xs hidden sm:inline">VOL</span>
        <input
          type="range"
          min="0"
          max="1"
          step="0.01"
          value={volume}
          onChange={(e) => setVolume(parseFloat(e.target.value))}
          className="slider w-16 sm:w-20"
        />
      </div>

      <span className="text-white/30 text-xs uppercase tracking-wider flex-shrink-0">
        {style === 'lofi' ? 'LO-FI' : style.toUpperCase()}
      </span>

      <span className="text-white/20 text-xs hidden lg:inline">
        [SPACE] play · [M] mute · [F] fullscreen
      </span>
    </div>
  )
}
