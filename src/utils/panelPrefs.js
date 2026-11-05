// Préférences d'affichage du panneau gauche.
// Clé localStorage dédiée, volontairement hors de `questlife_data`.
export const PANEL_PREFS_KEY = 'questlife_left_panel'

// Événement demandant au panneau gauche d'afficher un onglet (et de se déployer).
export const OPEN_PANEL_TAB_EVENT = 'questlife:open-panel-tab'

export function requestOpenPanelTab(tabId) {
  globalThis.dispatchEvent(new CustomEvent(OPEN_PANEL_TAB_EVENT, { detail: { tabId } }))
}

const DEFAULTS ={ collapsed: false, activeTab: null }

export function loadPanelPrefs(storage = globalThis.localStorage) {
  try {
    const raw = storage?.getItem(PANEL_PREFS_KEY)
    if (!raw) return { ...DEFAULTS }
    const parsed = JSON.parse(raw)
    return {
      collapsed: parsed?.collapsed === true,
      activeTab: typeof parsed?.activeTab === 'string' ? parsed.activeTab : null,
    }
  } catch {
    return { ...DEFAULTS }
  }
}

export function savePanelPrefs(prefs, storage = globalThis.localStorage) {
  try {
    storage?.setItem(PANEL_PREFS_KEY, JSON.stringify({
      collapsed: prefs.collapsed === true,
      activeTab: prefs.activeTab ?? null,
    }))
  } catch {
    // Stockage indisponible : préférence non mémorisée.
  }
}
