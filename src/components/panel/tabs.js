import QuestSidebar from '../quest/QuestSidebar'
import AgendaTab from '../agenda/AgendaTab'
import FocusTimerTab from '../focus/FocusTimerTab'

// Registre des onglets du panneau gauche : ajouter un onglet = ajouter une entrée.
// `views` indique où l'onglet est disponible ('home' = accueil, 'chapter' = vue chapitre).
// `target` : 'panel' = le contenu s'affiche dans le panneau ; 'main' = l'onglet choisit
// la vue de la zone principale de l'accueil (sans composant dans le panneau).
export const LEFT_PANEL_TABS = [
  { id: 'chapters', label: 'Chapitres', target: 'main', component: null, views: ['home', 'chapter'] },
  { id: 'agenda', label: 'Agenda', target: 'panel', component: AgendaTab, views: ['home', 'chapter'] },
  { id: 'quests', label: 'Quêtes', target: 'panel', component: QuestSidebar, views: ['chapter'] },
  { id: 'timer', label: 'Minuteur', target: 'panel', component: FocusTimerTab, views: ['home', 'chapter'] },
  { id: 'todo', label: 'To-do', target: 'main', component: null, views: ['home', 'chapter'] },
]

export function tabsForView(view) {
  return LEFT_PANEL_TABS.filter(t => t.views.includes(view))
}
