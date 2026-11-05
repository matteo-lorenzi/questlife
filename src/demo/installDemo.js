// Écrit le jeu de démo dans le stockage, AVANT l'initialisation des stores.
// Écrase toujours les clés de jeu ; ne touche ni le thème ni la durée du minuteur.
import { buildDemoData } from "./demoData";
import { saveTodo } from "../utils/todoStorage";
import { savePanelPrefs } from "../utils/panelPrefs";

const DATA_KEY = "questlife_data";

export function installDemo(storage = globalThis.localStorage, now = Date.now()) {
  const { data, todo, panelPrefs } = buildDemoData(now);
  storage.setItem(DATA_KEY, JSON.stringify(data));
  saveTodo(todo, storage);
  savePanelPrefs(panelPrefs, storage);
}
