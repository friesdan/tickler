import { useMusicStore } from '../../stores/musicStore'

const MOOD_COLORS: Record<string, string> = {
  euphoric: 'text-yellow-300',
  calm: 'text-blue-300',
  tense: 'text-red-400',
  dark: 'text-purple-400',
  neutral: 'text-white/40',
}

export function ChordDisplay() {
  const chordInfo = useMusicStore((s) => s.chordInfo)
  const isPlaying = useMusicStore((s) => s.isPlaying)

  if (!chordInfo || !isPlaying) return null

  return (
    <div className="glass px-4 py-3 min-w-[200px]">
      <div className="flex items-center gap-2 mb-2">
        <span className="text-white/30 text-[10px] uppercase tracking-wider font-bold">
          Progression
        </span>
        <span className={`text-[10px] ${MOOD_COLORS[chordInfo.mood] ?? 'text-white/40'}`}>
          {chordInfo.mood}
        </span>
      </div>

      <div className="flex gap-1">
        {chordInfo.nashville.map((nash, i) => {
          const active = i === chordInfo.activeIndex
          return (
            <div
              key={i}
              className={`flex-1 text-center px-2 py-1.5 rounded transition-all duration-200 ${
                active
                  ? 'bg-white/15 scale-105'
                  : 'bg-white/[0.03]'
              }`}
            >
              <div
                className={`text-sm font-mono font-bold transition-colors duration-200 ${
                  active ? 'text-white' : 'text-white/25'
                }`}
              >
                {nash}
              </div>
              <div
                className={`text-[9px] font-mono transition-colors duration-200 ${
                  active ? 'text-white/50' : 'text-white/15'
                }`}
              >
                {chordInfo.symbols[i]}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
