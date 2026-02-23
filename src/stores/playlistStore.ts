import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { storeTrackAudio, deleteTrackAudio, clearAllTrackAudio } from '../services/trackStorage'

export interface PlaylistTrack {
  id: string
  name: string
  mimeType: string
  duration: number // seconds
}

interface PlaylistStore {
  tracks: PlaylistTrack[]
  currentIndex: number
  shuffle: boolean
  repeat: 'all' | 'one'

  addTracks: (files: File[]) => Promise<void>
  removeTrack: (id: string) => void
  setCurrentIndex: (index: number) => void
  advanceTrack: () => void
  previousTrack: () => void
  setShuffle: (on: boolean) => void
  setRepeat: (mode: 'all' | 'one') => void
  clearAll: () => void
}

/** Strip file extension from filename */
function stripExt(name: string): string {
  const dot = name.lastIndexOf('.')
  return dot > 0 ? name.slice(0, dot) : name
}

export const usePlaylistStore = create<PlaylistStore>()(
  persist(
    (set, get) => ({
      tracks: [],
      currentIndex: 0,
      shuffle: false,
      repeat: 'all',

      addTracks: async (files) => {
        const newTracks: PlaylistTrack[] = []
        for (const file of files) {
          try {
            const id = crypto.randomUUID()
            const buffer = await file.arrayBuffer()
            await storeTrackAudio(id, buffer)

            // Decode to get duration
            let duration = 0
            const ctx = new AudioContext()
            try {
              const decoded = await ctx.decodeAudioData(buffer.slice(0))
              duration = decoded.duration
            } catch {
              // If decode fails, just store 0
            } finally {
              await ctx.close()
            }

            newTracks.push({
              id,
              name: stripExt(file.name),
              mimeType: file.type || 'audio/mpeg',
              duration,
            })
          } catch (err) {
            console.error(`[Playlist] Failed to add track "${file.name}":`, err)
          }
        }
        if (newTracks.length > 0) {
          set((s) => ({ tracks: [...s.tracks, ...newTracks] }))
        }
      },

      removeTrack: (id) => {
        deleteTrackAudio(id).catch(console.error)
        set((s) => {
          const idx = s.tracks.findIndex((t) => t.id === id)
          const tracks = s.tracks.filter((t) => t.id !== id)
          let currentIndex = s.currentIndex
          if (tracks.length === 0) {
            currentIndex = 0
          } else if (idx < s.currentIndex || s.currentIndex >= tracks.length) {
            currentIndex = Math.max(0, s.currentIndex - 1)
          }
          return { tracks, currentIndex }
        })
      },

      setCurrentIndex: (index) => set({ currentIndex: index }),

      advanceTrack: () => {
        const { tracks, currentIndex, shuffle, repeat } = get()
        if (tracks.length === 0) return
        if (repeat === 'one') return // stay on same track
        if (shuffle) {
          let next = Math.floor(Math.random() * tracks.length)
          if (tracks.length > 1 && next === currentIndex) {
            next = (next + 1) % tracks.length
          }
          set({ currentIndex: next })
        } else {
          set({ currentIndex: (currentIndex + 1) % tracks.length })
        }
      },

      previousTrack: () => {
        const { tracks, currentIndex } = get()
        if (tracks.length === 0) return
        set({ currentIndex: (currentIndex - 1 + tracks.length) % tracks.length })
      },

      setShuffle: (on) => set({ shuffle: on }),
      setRepeat: (mode) => set({ repeat: mode }),

      clearAll: () => {
        clearAllTrackAudio().catch(console.error)
        set({ tracks: [], currentIndex: 0 })
      },
    }),
    {
      name: 'tickler-playlist',
      version: 1,
      // Only persist metadata, not audio bytes (those are in IndexedDB)
    },
  ),
)
