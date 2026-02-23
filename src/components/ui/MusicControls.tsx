import { useMusicStore } from '../../stores/musicStore'
import { useSettingsStore } from '../../stores/settingsStore'
import { usePlaylistStore } from '../../stores/playlistStore'
import type { AudioMode } from '../../types'

export function MusicControls() {
  const isPlaying = useMusicStore((s) => s.isPlaying)
  const volume = useMusicStore((s) => s.volume)
  const setIsPlaying = useMusicStore((s) => s.setIsPlaying)
  const setVolume = useMusicStore((s) => s.setVolume)
  const audioMode = useMusicStore((s) => s.audioMode)
  const setAudioMode = useMusicStore((s) => s.setAudioMode)
  const style = useSettingsStore((s) => s.style)
  const tracks = usePlaylistStore((s) => s.tracks)
  const currentIndex = usePlaylistStore((s) => s.currentIndex)
  const currentTrackName = tracks[currentIndex]?.name

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

      {/* Mode switcher */}
      <div className="flex items-center bg-white/[0.04] rounded-lg overflow-hidden flex-shrink-0">
        {([
          { mode: 'generative' as AudioMode, label: 'Synth' },
          { mode: 'playlist' as AudioMode, label: 'Tracks' },
        ]).map(({ mode, label }) => (
          <button
            key={mode}
            onClick={() => setAudioMode(mode)}
            className={`px-2.5 py-1 text-[10px] uppercase tracking-wider cursor-pointer transition-all ${
              audioMode === mode
                ? 'bg-white/[0.12] text-white/70'
                : 'text-white/25 hover:text-white/50'
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {/* Style label or now-playing track */}
      <span className="text-white/30 text-xs uppercase tracking-wider flex-shrink-0 truncate max-w-[120px]">
        {audioMode === 'playlist'
          ? (currentTrackName ?? 'No tracks')
          : (style === 'lofi' ? 'LO-FI' : style.toUpperCase())
        }
      </span>

      <span className="text-white/20 text-xs hidden lg:inline">
        [SPACE] play · [M] mute · [F] fullscreen
      </span>
    </div>
  )
}
