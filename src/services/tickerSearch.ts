import type { TickerSearchResult } from '../types'
import { searchFinnhub } from './finnhubProvider'
import { searchAlphaVantage } from './alphaVantageProvider'
import { searchPolygon } from './polygonProvider'

interface ApiKeys {
  finnhubKey?: string
  alphaVantageKey?: string
  polygonKey?: string
}

// Simple cache: query -> { results, timestamp }
const cache = new Map<string, { results: TickerSearchResult[]; ts: number }>()
const CACHE_TTL = 5 * 60 * 1000 // 5 minutes

/**
 * Search all configured providers in parallel.
 * Deduplicates by symbol (first occurrence wins).
 */
export async function searchTickers(query: string, apiKeys: ApiKeys): Promise<TickerSearchResult[]> {
  const trimmed = query.trim().toUpperCase()
  if (!trimmed) return []

  // Check cache
  const cached = cache.get(trimmed)
  if (cached && Date.now() - cached.ts < CACHE_TTL) {
    return cached.results
  }

  const searches: Promise<TickerSearchResult[]>[] = []

  if (apiKeys.finnhubKey) {
    searches.push(searchFinnhub(trimmed, apiKeys.finnhubKey))
  }
  if (apiKeys.alphaVantageKey) {
    searches.push(searchAlphaVantage(trimmed, apiKeys.alphaVantageKey))
  }
  if (apiKeys.polygonKey) {
    searches.push(searchPolygon(trimmed, apiKeys.polygonKey))
  }

  if (searches.length === 0) return []

  const settled = await Promise.allSettled(searches)
  const all: TickerSearchResult[] = []
  const seen = new Set<string>()

  for (const result of settled) {
    if (result.status === 'fulfilled') {
      for (const r of result.value) {
        if (!seen.has(r.symbol)) {
          seen.add(r.symbol)
          all.push(r)
        }
      }
    }
  }

  // Cache results
  cache.set(trimmed, { results: all, ts: Date.now() })

  return all
}
