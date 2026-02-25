import { useRef } from 'react'
import { usePlaylistStore, type PlaylistTrack } from '../../stores/playlistStore'
import { useMusicStore } from '../../stores/musicStore'

function formatDuration(secs: number): string {
  const m = Math.floor(secs / 60)
  const s = Math.floor(secs % 60)
  return `${m}:${s.toString().padStart(2, '0')}`
}

export function PlaylistPanel() {
  const { tracks, currentIndex, shuffle, repeat, addTracks, removeTrack, setCurrentIndex, advanceTrack, previousTrack, setShuffle, setRepeat } =
    usePlaylistStore()
  const isPlaying = useMusicStore((s) => s.isPlaying)
  const fileRef = useRef<HTMLInputElement>(null)

  const handleFiles = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files ?? [])
    try {
      if (files.length > 0) await addTracks(files)
    } finally {
      if (fileRef.current) fileRef.current.value = ''
    }
  }

  const handleTrackClick = (index: number) => {
    setCurrentIndex(index)
    // Engine subscribes to playlist index changes and reloads automatically
  }

  const currentTrack: PlaylistTrack | undefined = tracks[currentIndex]

  return (
    <div className="glass w-64 max-h-72 flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between px-3 pt-2.5 pb-1.5">
        <span className="text-white/60 text-[10px] uppercase tracking-[0.15em] font-semibold">
          My Music
        </span>
        <span className="text-white/35 text-[10px]">{tracks.length} track{tracks.length !== 1 ? 's' : ''}</span>
      </div>

      {/* Upload */}
      <div className="px-3 pb-2">
        <input
          ref={fileRef}
          type="file"
          accept="audio/*"
          multiple
          className="hidden"
          onChange={handleFiles}
        />
        <button
          onClick={() => fileRef.current?.click()}
          className="w-full px-2 py-1.5 bg-white/[0.04] hover:bg-white/[0.1] border border-dashed border-white/[0.08] hover:border-white/[0.15] rounded-lg cursor-pointer transition-all text-[10px] text-white/40 hover:text-white/70"
        >
          + Add Tracks
        </button>
      </div>

      {/* Track list */}
      {tracks.length > 0 && (
        <div className="flex-1 overflow-y-auto min-h-0 settings-scroll">
          {tracks.map((track, i) => {
            const active = i === currentIndex
            return (
              <div
                key={track.id}
                onClick={() => handleTrackClick(i)}
                className={`flex items-center justify-between px-3 py-1.5 cursor-pointer transition-all group ${
                  active
                    ? 'bg-white/[0.08]'
                    : 'hover:bg-white/[0.04]'
                }`}
              >
                <div className="flex items-center gap-2 min-w-0 flex-1">
                  {active && isPlaying && (
                    <span className="flex-shrink-0 w-2 h-2 rounded-full bg-white/40 animate-pulse" />
                  )}
                  <span className={`text-[11px] truncate ${active ? 'text-white/80' : 'text-white/50'}`}>
                    {track.name}
                  </span>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0 ml-2">
                  <span className="text-[9px] text-white/20 font-data">
                    {formatDuration(track.duration)}
                  </span>
                  <button
                    onClick={(e) => {
                      e.stopPropagation()
                      removeTrack(track.id)
                    }}
                    className="w-4 h-4 flex items-center justify-center rounded-full text-white/0 group-hover:text-white/30 hover:!text-white/70 hover:bg-white/10 cursor-pointer transition-all text-[10px] leading-none"
                    aria-label={`Remove ${track.name}`}
                  >
                    &times;
                  </button>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Transport bar */}
      {tracks.length > 0 && (
        <div className="flex items-center justify-center gap-3 px-3 py-2 border-t border-white/[0.06]">
          {/* Previous */}
          <button
            onClick={previousTrack}
            className="text-white/40 hover:text-white/70 cursor-pointer transition-colors"
            aria-label="Previous track"
          >
            <svg width="12" height="12" viewBox="0 0 12 12" fill="currentColor">
              <rect x="1" y="2" width="2" height="8" />
              <polygon points="11,2 4,6 11,10" />
            </svg>
          </button>

          {/* Now playing indicator */}
          <span className="text-[9px] text-white/35 truncate max-w-[100px]">
            {currentTrack?.name ?? '—'}
          </span>

          {/* Next */}
          <button
            onClick={advanceTrack}
            className="text-white/40 hover:text-white/70 cursor-pointer transition-colors"
            aria-label="Next track"
          >
            <svg width="12" height="12" viewBox="0 0 12 12" fill="currentColor">
              <polygon points="1,2 8,6 1,10" />
              <rect x="9" y="2" width="2" height="8" />
            </svg>
          </button>

          {/* Shuffle */}
          <button
            onClick={() => setShuffle(!shuffle)}
            className={`text-[9px] uppercase tracking-wider cursor-pointer transition-colors ${
              shuffle ? 'text-white/60' : 'text-white/20 hover:text-white/40'
            }`}
            aria-label="Toggle shuffle"
          >
            SHF
          </button>

          {/* Repeat */}
          <button
            onClick={() => setRepeat(repeat === 'all' ? 'one' : 'all')}
            className={`text-[9px] uppercase tracking-wider cursor-pointer transition-colors ${
              repeat === 'one' ? 'text-white/60' : 'text-white/20 hover:text-white/40'
            }`}
            aria-label={`Repeat: ${repeat}`}
          >
            {repeat === 'one' ? 'RPT1' : 'RPT'}
          </button>
        </div>
      )}
    </div>
  )
}
