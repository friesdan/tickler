// Single source of truth for all user-facing onboarding / help text

export const INDICATOR_HELP: Record<string, { name: string; explanation: string; musicEffect: string }> = {
  RSI: {
    name: 'Relative Strength Index',
    explanation: 'Measures whether a stock is overbought (>70) or oversold (<30) based on recent price changes.',
    musicEffect: 'Controls filter brightness and chord tension — extremes make the sound edgier.',
  },
  MACD: {
    name: 'Moving Avg Convergence/Divergence',
    explanation: 'Shows momentum direction by comparing fast and slow moving averages.',
    musicEffect: 'Drives chord progression mood — bullish signals push ascending patterns, bearish descending.',
  },
  ADX: {
    name: 'Average Directional Index',
    explanation: 'Measures trend strength (0–100) regardless of direction. Above 25 = strong trend.',
    musicEffect: 'Controls drum complexity — stronger trends add kick, bass, and hi-hat layers.',
  },
  ATR: {
    name: 'Average True Range',
    explanation: 'Measures price volatility over recent bars. Higher = more volatile.',
    musicEffect: 'Adjusts tempo, reverb depth, and delay feedback — volatile markets get faster and wetter.',
  },
  EMA: {
    name: 'Exponential Moving Average',
    explanation: 'Smoothed trend direction from short vs long EMA crossover.',
    musicEffect: 'Sets the musical key, pad tone character, and overall mood.',
  },
  Vol: {
    name: 'Volatility',
    explanation: 'Normalized measure of recent price swings.',
    musicEffect: 'Sweeps the bass filter — calm markets get deep sub-bass, wild markets get gritty growl.',
  },
}

export const PARAMETER_HELP: Record<string, string> = {
  Mood: 'Overall emotional character of the music — euphoric, tense, calm, dark, or neutral.',
  Key: 'Musical key and scale. Major keys feel brighter, minor keys feel darker.',
  Tempo: 'Speed in beats per minute. Faster tempo = more energetic music.',
  Brightness: 'How open the frequency filter is — low = muffled, high = crisp and cutting.',
  Density: 'How many musical elements play at once — sparse ambient vs layered complexity.',
  Energy: 'Overall intensity and dynamics of the arrangement.',
}

export interface TourStep {
  target: string    // data-tour-id value
  title: string
  body: string
  position: 'bottom' | 'left' | 'right' | 'top'
}

export const TOUR_STEPS: TourStep[] = [
  {
    target: 'music-controls',
    title: 'Press Play',
    body: 'Start the music engine. Stock data drives every note, chord, and beat in real time.',
    position: 'top',
  },
  {
    target: 'ticker-selector',
    title: 'Choose a Stock',
    body: 'Pick a ticker to follow. Each stock produces a unique sound based on its price action.',
    position: 'bottom',
  },
  {
    target: 'price-display',
    title: 'Live Price',
    body: 'Watch the price update tick-by-tick with a sparkline chart. Green = up, red = down.',
    position: 'bottom',
  },
  {
    target: 'parameter-display',
    title: 'Music Parameters',
    body: 'See how indicators map to sound. Tap the (i) icons to learn what each one controls.',
    position: 'left',
  },
  {
    target: 'settings-button',
    title: 'Customize Everything',
    body: 'Change synth style, toggle signal routings, tune indicator periods, and connect live data.',
    position: 'left',
  },
]

export const WELCOME_CONTENT = {
  headline: 'Stock Market Meets Music',
  tagline: 'Real-time stock indicators drive a generative music engine and immersive WebGL visuals.',
  steps: [
    { icon: 'chart', label: 'Stock Data', desc: 'RSI, MACD, ADX and more' },
    { icon: 'music', label: 'Music Engine', desc: 'Synth, chords, drums, FX' },
    { icon: 'eye', label: 'Visuals', desc: 'Particles, bloom, color' },
  ],
  ctaPrimary: 'Try with Simulator',
  ctaSecondary: 'Connect Live Data',
}

export const KEYBOARD_SHORTCUTS = [
  { key: 'Space', action: 'Play / Pause' },
  { key: 'M', action: 'Mute / Unmute' },
  { key: 'F', action: 'Toggle Fullscreen' },
  { key: 'S', action: 'Open Settings' },
]
