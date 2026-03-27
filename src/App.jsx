import React, { useEffect } from 'react'
import toast, { Toaster } from 'react-hot-toast'
import { useStore } from './store/useStore'
import HomePage from './components/layout/HomePage'
import CanvasView from './components/layout/CanvasView'
import ChapterHeader from './components/layout/ChapterHeader'
import ChapterModal from './components/chapters/ChapterModal'
import ProfilePage from './components/profile/ProfilePage'

const savedTheme = localStorage.getItem('questlife_theme')
const prefersDark = globalThis.matchMedia?.('(prefers-color-scheme: dark)')?.matches
const initialTheme = savedTheme ?? (prefersDark ? 'dark' : 'light')
globalThis.document?.documentElement.classList.toggle('dark', initialTheme === 'dark')

export default function App() {
  const { chapters, activeChapterId } = useStore()
  const activeChapter = chapters.find(c => c.id === activeChapterId)

  async function sendDesktopNotification(title, body) {
    if (!body) return false

    if (typeof globalThis.questlifeNotify === 'function') {
      try {
        const result = await globalThis.questlifeNotify({ title, body })
        if (result?.ok) return true
      } catch {
        // Fallback below when Electron bridge is not available/fails.
      }
    }

    if (!('Notification' in globalThis)) return false

    try {
      let permission = globalThis.Notification.permission
      if (permission === 'default') {
        permission = await globalThis.Notification.requestPermission()
      }
      if (permission !== 'granted') return false

      // Browser fallback (also works in non-Electron dev mode).
      new globalThis.Notification(title, { body })
      return true
    } catch {
      return false
    }
  }

  useEffect(() => {
    function onToast(e) {
      const type = e?.detail?.type || 'success'
      const msg = e?.detail?.msg || ''
      if (!msg) return
      if (type === 'error') toast.error(msg)
      else if (type === 'success') toast.success(msg)
      else toast(msg)
    }

    function onBadge(e) {
      toast.custom((t) => (
        <div className={`flex items-center gap-3 bg-white border border-amber-200 rounded-xl px-4 py-3 shadow-lg ${t.visible ? 'animate-slideInUp' : 'opacity-0'}`}>
          <div className="w-9 h-9 rounded-lg bg-amber-50 flex items-center justify-center flex-shrink-0">
            <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
              <polygon points="9,1.5 11.5,7 17.5,7.5 13,11.5 14.5,17.5 9,14.5 3.5,17.5 5,11.5 0.5,7.5 6.5,7" fill="#EF9F27" />
            </svg>
          </div>
          <div>
            <p className="text-xs font-medium text-gray-900">Badge debloque !</p>
            <p className="text-xs text-amber-700 font-medium">{e.detail.label}</p>
            <p className="text-xs text-gray-400">{e.detail.desc}</p>
          </div>
        </div>
      ), { duration: 4000 })
    }

    function onSystemNotify(e) {
      const title = e?.detail?.title || 'QuestLife'
      const body = e?.detail?.body || ''
      if (!body) return
      void sendDesktopNotification(title, body)
    }

    function runDeadlineChecks() {
      useStore.getState().checkDeadlinesAndEmitAlerts(Date.now())
    }

    globalThis.addEventListener('questlife:toast', onToast)
    globalThis.addEventListener('questlife:badge', onBadge)
    globalThis.addEventListener('questlife:system-notify', onSystemNotify)
    runDeadlineChecks()
    const deadlineInterval = globalThis.setInterval(runDeadlineChecks, 30000)
    return () => {
      globalThis.removeEventListener('questlife:toast', onToast)
      globalThis.removeEventListener('questlife:badge', onBadge)
      globalThis.removeEventListener('questlife:system-notify', onSystemNotify)
      globalThis.clearInterval(deadlineInterval)
    }
  }, [])

  return (
    <div className="h-screen flex flex-col overflow-hidden bg-gray-50 dark:bg-zinc-950">
      {activeChapter ? (
        <>
          <ChapterHeader chapter={activeChapter} />
          <CanvasView key={activeChapter.id} chapter={activeChapter} />
        </>
      ) : (
        <HomePage />
      )}
      <ChapterModal />
      <ProfilePage />
      <Toaster position="top-right"
        toastOptions={{
          style: { background: 'white', border: '1px solid #E5E5E0', borderRadius: 12, fontSize: 13 },
          success: { iconTheme: { primary: '#1D9E75', secondary: 'white' } },
          error: { iconTheme: { primary: '#E24B4A', secondary: 'white' } },
        }} />
    </div>
  )
}
