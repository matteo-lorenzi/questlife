import QuestSidebar from '../quest/QuestSidebar'
import AgendaTab from '../agenda/AgendaTab'

// Registre des onglets du panneau gauche : ajouter un onglet = ajouter une entrée.
// `views` indique où l'onglet est disponible ('home' = accueil, 'chapter' = vue chapitre).
export const LEFT_PANEL_TABS = [
  { id: 'agenda', label: 'Agenda', component: AgendaTab, views: ['home', 'chapter'] },
  { id: 'quests', label: 'Quêtes', component: QuestSidebar, views: ['chapter'] },
]

export function tabsForView(view) {
  return LEFT_PANEL_TABS.filter(t => t.views.includes(view))
}
