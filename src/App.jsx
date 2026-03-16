import React, { useEffect } from 'react'
import { Toaster } from 'react-hot-toast'
import toast from 'react-hot-toast'
import { useStore } from './store/useStore'
import HomePage from './components/layout/HomePage'
import CanvasView from './components/layout/CanvasView'
import ChapterHeader from './components/layout/ChapterHeader'
import ChapterModal from './components/chapters/ChapterModal'

export default function App() {
  const { chapters, activeChapterId } = useStore()
  const activeChapter = chapters.find(c => c.id === activeChapterId)

  useEffect(() => {
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
    window.addEventListener('questlife:badge', onBadge)
    return () => window.removeEventListener('questlife:badge', onBadge)
  }, [])

  return (
    <div className="h-screen flex flex-col overflow-hidden bg-gray-50">
      {activeChapter ? (
        <>
          <ChapterHeader chapter={activeChapter} />
          <CanvasView key={activeChapter.id} chapter={activeChapter} />
        </>
      ) : (
        <HomePage />
      )}
      <ChapterModal />
      <Toaster position="top-right"
        toastOptions={{
          style: { background: 'white', border: '1px solid #E5E5E0', borderRadius: 12, fontSize: 13 },
          success: { iconTheme: { primary: '#1D9E75', secondary: 'white' } },
          error: { iconTheme: { primary: '#E24B4A', secondary: 'white' } },
        }} />
    </div>
  )
}
