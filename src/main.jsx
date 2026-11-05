import React from 'react'
import ReactDOM from 'react-dom/client'
import './index.css'

// Mode démo (npm run electron:demo) : le jeu de données doit être écrit AVANT
// l'import de l'App, car les stores lisent le localStorage à leur import.
// Une seule fois par lancement (sessionStorage) : un rechargement de page ne
// doit pas écraser ce que l'utilisateur vient de modifier.
async function installDemoOnce() {
  try {
    if (sessionStorage.getItem('questlife_demo_installed')) return
    const { installDemo } = await import('./demo/installDemo')
    installDemo()
    sessionStorage.setItem('questlife_demo_installed', '1')
  } catch (e) {
    console.warn('Installation du jeu de démo impossible', e)
  }
}

async function bootstrap() {
  if (import.meta.env.VITE_DEMO === '1') await installDemoOnce()
  const { default: App } = await import('./App.jsx')

  ReactDOM.createRoot(document.getElementById('root')).render(
    <React.StrictMode>
      <App />
    </React.StrictMode>
  )
}

bootstrap()
