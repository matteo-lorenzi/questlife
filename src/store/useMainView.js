import { create } from 'zustand'

// Vue affichée dans la zone principale de l'accueil. En mémoire uniquement :
// au démarrage on retombe sur « Mes chapitres ».
export const MAIN_VIEWS = ['chapters', 'todo']

export const useMainView = create(set => ({
  mainView: 'chapters',
  setMainView(id) {
    if (MAIN_VIEWS.includes(id)) set({ mainView: id })
  },
}))
