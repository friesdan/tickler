import { useState, useEffect, useRef } from 'react'
import { useSettingsStore } from '../../stores/settingsStore'
import { useStockStore } from '../../stores/stockStore'
import type { DataProvider, ConnectionStatus } from '../../types'

interface ApiKeyWizardProps {
  isOpen: boolean
  onClose: () => void
  initialProvider?: DataProvider
}

const PROVIDERS: {
  id: DataProvider
  name: string
  recommended?: boolean
  signupUrl: string
  instructions: string
}[] = [
  {
    id: 'finnhub',
    name: 'Finnhub',
    recommended: true,
    signupUrl: 'https://finnhub.io/register',
    instructions: 'Create a free account at Finnhub to get a real-time WebSocket API key.',
  },
  {
    id: 'alphaVantage',
    name: 'Alpha Vantage',
    signupUrl: 'https://www.alphavantage.co/support/#api-key',
    instructions: 'Claim a free API key from Alpha Vantage. No credit card required.',
  },
  {
    id: 'polygon',
    name: 'Polygon.io',
    signupUrl: 'https://polygon.io/dashboard/signup',
    instructions: 'Sign up for a free Polygon.io account for delayed stock data.',
  },
]

export function ApiKeyWizard({ isOpen, onClose, initialProvider }: ApiKeyWizardProps) {
  const [wizardStep, setWizardStep] = useState(0)
  const [selectedProvider, setSelectedProvider] = useState<DataProvider>(initialProvider ?? 'finnhub')
  const [keyInput, setKeyInput] = useState('')
  const [testStatus, setTestStatus] = useState<'idle' | 'testing' | 'success' | 'error'>('idle')
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const setDataProvider = useSettingsStore((s) => s.setDataProvider)
  const setFinnhubKey = useSettingsStore((s) => s.setFinnhubKey)
  const setAlphaVantageKey = useSettingsStore((s) => s.setAlphaVantageKey)
  const setPolygonKey = useSettingsStore((s) => s.setPolygonKey)
  const connectionStatus = useStockStore((s) => s.connectionStatus)

  // Reset state when opened
  useEffect(() => {
    if (isOpen) {
      setWizardStep(0)
      setKeyInput('')
      setTestStatus('idle')
      if (initialProvider) setSelectedProvider(initialProvider)
    }
    return () => { if (timeoutRef.current) clearTimeout(timeoutRef.current) }
  }, [isOpen, initialProvider])

  // Escape key to close (only when not mid-test)
  useEffect(() => {
    if (!isOpen) return
    function handleKey(e: KeyboardEvent) {
      if (e.key === 'Escape' && testStatus !== 'testing') onClose()
    }
    window.addEventListener('keydown', handleKey)
    return () => window.removeEventListener('keydown', handleKey)
  }, [isOpen, testStatus, onClose])

  // Watch connectionStatus after test
  useEffect(() => {
    if (testStatus !== 'testing') return
    if (connectionStatus === 'connected') {
      setTestStatus('success')
      if (timeoutRef.current) clearTimeout(timeoutRef.current)
    } else if (connectionStatus === 'error') {
      setTestStatus('error')
      if (timeoutRef.current) clearTimeout(timeoutRef.current)
    }
  }, [connectionStatus, testStatus])

  if (!isOpen) return null

  const provider = PROVIDERS.find((p) => p.id === selectedProvider) ?? PROVIDERS[0]

  const testConnection = () => {
    // Save the key
    if (selectedProvider === 'finnhub') setFinnhubKey(keyInput)
    else if (selectedProvider === 'alphaVantage') setAlphaVantageKey(keyInput)
    else if (selectedProvider === 'polygon') setPolygonKey(keyInput)

    setDataProvider(selectedProvider)
    setTestStatus('testing')

    // Trigger provider reconnect
    const symbol = useStockStore.getState().symbol
    useStockStore.getState().startProvider(symbol)

    // Timeout after 10s
    timeoutRef.current = setTimeout(() => {
      setTestStatus((s) => (s === 'testing' ? 'error' : s))
    }, 10000)
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 animate-fadeIn" role="dialog" aria-modal="true" aria-labelledby="wizard-heading">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={wizardStep < 2 ? onClose : undefined} />

      <div className="relative w-full max-w-md glass px-6 py-6 sm:px-8 sm:py-8 animate-fadeInUp">
        {/* Close */}
        <button
          onClick={onClose}
          className="absolute top-3 right-3 text-white/20 hover:text-white/60 cursor-pointer text-lg transition-colors"
          aria-label="Close"
        >
          &times;
        </button>

        {/* Progress dots */}
        <div className="flex justify-center gap-2 mb-6">
          {[0, 1, 2, 3].map((i) => (
            <div
              key={i}
              className={`w-2 h-2 rounded-full transition-all ${
                i === wizardStep ? 'bg-emerald-400 scale-125' :
                i < wizardStep ? 'bg-emerald-400/50' : 'bg-white/10'
              }`}
            />
          ))}
        </div>

        {/* Step 0: Choose Provider */}
        {wizardStep === 0 && (
          <div>
            <h2 id="wizard-heading" className="text-lg font-bold text-white mb-1">Choose a Data Provider</h2>
            <p className="text-xs text-white/50 mb-5">All offer free tiers. Pick one to get started.</p>
            <div className="space-y-2">
              {PROVIDERS.map((p) => (
                <button
                  key={p.id}
                  onClick={() => { setSelectedProvider(p.id); setWizardStep(1) }}
                  className={`w-full flex items-center justify-between px-4 py-3 rounded-xl border transition-all cursor-pointer ${
                    selectedProvider === p.id
                      ? 'border-white/25 bg-white/[0.08]'
                      : 'border-white/[0.10] hover:border-white/15 bg-white/[0.05]'
                  }`}
                >
                  <span className="text-sm font-semibold text-white/80">{p.name}</span>
                  {p.recommended && (
                    <span className="text-[9px] uppercase tracking-wider text-emerald-400/80 bg-emerald-400/10 px-2 py-0.5 rounded-full">
                      Recommended
                    </span>
                  )}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Step 1: Get Your Key */}
        {wizardStep === 1 && (
          <div>
            <h2 className="text-lg font-bold text-white mb-1">Get Your API Key</h2>
            <p className="text-xs text-white/50 mb-5">{provider.instructions}</p>
            <a
              href={provider.signupUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="block w-full text-center px-4 py-3 rounded-xl border border-white/15 hover:border-white/30 text-sm text-white/70 hover:text-white transition-all mb-4"
            >
              Open {provider.name} Signup &#8599;
            </a>
            <button
              onClick={() => setWizardStep(2)}
              className="w-full px-4 py-3 rounded-xl bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 font-semibold text-sm transition-all cursor-pointer"
            >
              I have my key
            </button>
          </div>
        )}

        {/* Step 2: Paste Key */}
        {wizardStep === 2 && (
          <div>
            <h2 className="text-lg font-bold text-white mb-1">Paste Your Key</h2>
            <p className="text-xs text-white/50 mb-4">Your key is stored locally and never sent to our servers.</p>
            <input
              type="password"
              value={keyInput}
              onChange={(e) => { setKeyInput(e.target.value); setTestStatus('idle') }}
              placeholder={`${provider.name} API key`}
              className="w-full bg-white/[0.06] border border-white/[0.12] rounded-xl px-4 py-3 text-sm text-white/80 outline-none focus:border-white/20 placeholder:text-white/30 transition-all mb-4"
              autoFocus
            />
            {testStatus === 'error' && (
              <p className="text-xs text-red-400 mb-3">Connection failed. Check your key and try again.</p>
            )}
            <button
              onClick={testConnection}
              disabled={!keyInput.trim() || testStatus === 'testing'}
              className="w-full px-4 py-3 rounded-xl bg-emerald-500/20 hover:bg-emerald-500/30 disabled:opacity-30 disabled:cursor-not-allowed text-emerald-300 font-semibold text-sm transition-all cursor-pointer"
            >
              {testStatus === 'testing' ? 'Testing...' : 'Test Connection'}
            </button>
            {testStatus === 'success' && (
              <button
                onClick={() => setWizardStep(3)}
                className="w-full mt-3 px-4 py-3 rounded-xl bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 font-semibold text-sm transition-all cursor-pointer"
              >
                Connected! Continue &#8594;
              </button>
            )}
          </div>
        )}

        {/* Step 3: Success */}
        {wizardStep === 3 && (
          <div className="text-center">
            <div className="text-4xl mb-3">&#10003;</div>
            <h2 className="text-lg font-bold text-white mb-1">You're Live!</h2>
            <p className="text-xs text-white/50 mb-6">
              Real-time market data from {provider.name} is now driving the music.
            </p>
            <button
              onClick={onClose}
              className="px-6 py-3 rounded-xl bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 font-semibold text-sm transition-all cursor-pointer"
            >
              Start Exploring
            </button>
          </div>
        )}

        {/* Back button (steps 1-2) */}
        {wizardStep > 0 && wizardStep < 3 && (
          <button
            onClick={() => setWizardStep((s) => s - 1)}
            className="mt-4 text-xs text-white/40 hover:text-white/60 cursor-pointer transition-colors"
          >
            &#8592; Back
          </button>
        )}
      </div>
    </div>
  )
}
