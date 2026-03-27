const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("questlifeNotify", (payload) => {
  return ipcRenderer.invoke("questlife:notify", payload);
});
