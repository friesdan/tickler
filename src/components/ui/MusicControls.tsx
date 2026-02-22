import { useMusicStore } from '../../stores/musicStore'
import { useSettingsStore } from '../../stores/settingsStore'

export function MusicControls() {
  const isPlaying = useMusicStore((s) => s.isPlaying)
  const volume = useMusicStore((s) => s.volume)
  const setIsPlaying = useMusicStore((s) => s.setIsPlaying)
  const setVolume = useMusicStore((s) => s.setVolume)
  const style = useSettingsStore((s) => s.style)

  return (
    <div className="glass px-6 py-3 flex items-center gap-6">
      <button
        onClick={() => setIsPlaying(!isPlaying)}
        className="w-10 h-10 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center transition-all cursor-pointer"
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
        <span className="text-white/40 text-xs">VOL</span>
        <input
          type="range"
          min="0"
          max="1"
          step="0.01"
          value={volume}
          onChange={(e) => setVolume(parseFloat(e.target.value))}
          className="w-20 accent-white/60"
        />
      </div>

      <span className="text-white/30 text-xs uppercase tracking-wider">
        {style === 'lofi' ? 'LO-FI' : style.toUpperCase()}
      </span>

      <span className="text-white/20 text-xs">
        [SPACE] play · [M] mute · [F] fullscreen
      </span>
    </div>
  )
}
