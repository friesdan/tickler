import { useMusicStore } from '../../stores/musicStore'
import { useStockStore } from '../../stores/stockStore'
import { InfoTooltip } from './InfoTooltip'
import { INDICATOR_HELP, PARAMETER_HELP } from '../../constants/helpText'

const PATTERN_LABELS: Record<string, string> = {
  doji: 'Doji',
  hammer: 'Hammer',
  shootingStar: 'Shooting Star',
  bullishEngulfing: 'Bull Engulfing',
  bearishEngulfing: 'Bear Engulfing',
  morningStar: 'Morning Star',
  eveningStar: 'Evening Star',
}

export function ParameterDisplay() {
  const params = useMusicStore((s) => s.parameters)
  const volatility = useStockStore((s) => s.volatility)
  const trend = useStockStore((s) => s.trend)
  const lastPattern = useStockStore((s) => s.lastPattern)
  const rsi = useStockStore((s) => s.rsi)
  const macdHistogram = useStockStore((s) => s.macdHistogram)
  const adx = useStockStore((s) => s.adx)
  const atr = useStockStore((s) => s.atr)
  const macroTrend = useStockStore((s) => s.macroTrend)

  const moodColor = {
    euphoric: 'text-yellow-300',
    tense: 'text-red-400',
    calm: 'text-blue-300',
    dark: 'text-purple-400',
    neutral: 'text-white/50',
  }[params.mood]

  const macdSign = macdHistogram > 0.01 ? '+' : macdHistogram < -0.01 ? '-' : '~'
  const trendDir = macroTrend > 0.1 ? 'up' : macroTrend < -0.1 ? 'down' : 'flat'

  return (
    <div data-tour-id="parameter-display" className="space-y-2 min-w-[200px]">
      {/* Music Parameters */}
      <div className="glass px-4 py-3 text-xs space-y-1.5">
        <div className="text-emerald-300/60 font-bold uppercase tracking-wider mb-2">
          Parameters
        </div>
        <Row label="Mood" value={params.mood} className={moodColor} tooltip={PARAMETER_HELP.Mood} />
        <Row label="Key" value={params.key} tooltip={PARAMETER_HELP.Key} />
        <Row label="Tempo" value={`${Math.round(params.tempo)} BPM`} tooltip={PARAMETER_HELP.Tempo} />
        <Bar label="Brightness" value={params.brightness} tooltip={PARAMETER_HELP.Brightness} />
        <Bar label="Density" value={params.density} tooltip={PARAMETER_HELP.Density} />
        <Bar label="Energy" value={params.energy} tooltip={PARAMETER_HELP.Energy} />
        <div className="border-t border-white/[0.15] pt-1.5 mt-2">
          <Row label="Trend" value={trend} className={
            trend === 'bullish' ? 'text-green-400' : trend === 'bearish' ? 'text-red-400' : 'text-white/50'
          } />
          <Bar label="Volatility" value={volatility} />
          {lastPattern && (
            <Row
              label="Pattern"
              value={PATTERN_LABELS[lastPattern.type] ?? lastPattern.type}
              className={
                lastPattern.sentiment === 'bullish' ? 'text-green-400'
                : lastPattern.sentiment === 'bearish' ? 'text-red-400'
                : 'text-yellow-300'
              }
            />
          )}
        </div>
      </div>

      {/* Indicator → Music Mappings */}
      <div className="glass px-4 py-3 text-xs space-y-1.5">
        <div className="text-emerald-300/60 font-bold uppercase tracking-wider mb-2">
          Indicators
        </div>
        <Indicator
          label="RSI"
          value={rsi.toFixed(0)}
          desc="filter cutoff, chord tension"
          color={rsi > 75 ? 'text-red-400' : rsi < 25 ? 'text-green-400' : 'text-white/60'}
          tooltip={INDICATOR_HELP.RSI ? `${INDICATOR_HELP.RSI.explanation} ${INDICATOR_HELP.RSI.musicEffect}` : undefined}
        />
        <Indicator
          label="MACD"
          value={macdSign === '+' ? 'bullish' : macdSign === '-' ? 'bearish' : 'flat'}
          desc="progression mood bias"
          color={macdSign === '+' ? 'text-green-400' : macdSign === '-' ? 'text-red-400' : 'text-white/50'}
          tooltip={INDICATOR_HELP.MACD ? `${INDICATOR_HELP.MACD.explanation} ${INDICATOR_HELP.MACD.musicEffect}` : undefined}
        />
        <Indicator
          label="ADX"
          value={adx.toFixed(0)}
          desc="drum density, kick/bass"
          color={adx > 50 ? 'text-yellow-300' : 'text-white/60'}
          tooltip={INDICATOR_HELP.ADX ? `${INDICATOR_HELP.ADX.explanation} ${INDICATOR_HELP.ADX.musicEffect}` : undefined}
        />
        <Indicator
          label="ATR"
          value={`${(atr * 100).toFixed(0)}%`}
          desc="tempo, delay, reverb"
          color={atr > 0.6 ? 'text-orange-400' : 'text-white/60'}
          tooltip={INDICATOR_HELP.ATR ? `${INDICATOR_HELP.ATR.explanation} ${INDICATOR_HELP.ATR.musicEffect}` : undefined}
        />
        <Indicator
          label="EMA"
          value={trendDir}
          desc="key, pad tone, mood"
          color={trendDir === 'up' ? 'text-green-400' : trendDir === 'down' ? 'text-red-400' : 'text-white/50'}
          tooltip={INDICATOR_HELP.EMA ? `${INDICATOR_HELP.EMA.explanation} ${INDICATOR_HELP.EMA.musicEffect}` : undefined}
        />
        <Indicator
          label="Vol"
          value={`${(volatility * 100).toFixed(0)}%`}
          desc="bass filter sweep"
          color={volatility > 0.6 ? 'text-orange-400' : 'text-white/60'}
          tooltip={INDICATOR_HELP.Vol ? `${INDICATOR_HELP.Vol.explanation} ${INDICATOR_HELP.Vol.musicEffect}` : undefined}
        />
      </div>
    </div>
  )
}

function Row({ label, value, className = 'text-white/80', tooltip }: { label: string; value: string; className?: string; tooltip?: string }) {
  return (
    <div className="flex justify-between items-center">
      <span className="text-white/60 flex items-center">
        {label}
        {tooltip && <InfoTooltip text={tooltip} />}
      </span>
      <span className={className}>{value}</span>
    </div>
  )
}

function Bar({ label, value, tooltip }: { label: string; value: number; tooltip?: string }) {
  return (
    <div>
      <div className="flex justify-between mb-0.5 items-center">
        <span className="text-white/60 flex items-center">
          {label}
          {tooltip && <InfoTooltip text={tooltip} />}
        </span>
        <span className="text-white/60 font-data">{(value * 100).toFixed(0)}%</span>
      </div>
      <div className="h-1 bg-white/[0.12] rounded-full overflow-hidden">
        <div
          className="h-full bg-gradient-to-r from-emerald-400/80 to-emerald-400/40 rounded-full transition-all duration-300 shadow-[0_0_4px_rgba(52,211,153,0.3)]"
          style={{ width: `${value * 100}%` }}
        />
      </div>
    </div>
  )
}

function Indicator({ label, value, desc, color, tooltip }: { label: string; value: string; desc: string; color: string; tooltip?: string }) {
  return (
    <div className="flex items-center justify-between gap-2">
      <span className="text-white/60 shrink-0 flex items-center">
        {label}
        {tooltip && <InfoTooltip text={tooltip} />}
      </span>
      <span className="text-white/40 text-[10px] truncate">{desc}</span>
      <span className={`${color} shrink-0 font-data`}>{value}</span>
    </div>
  )
}
