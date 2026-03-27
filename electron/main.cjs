const {
  app,
  BrowserWindow,
  dialog,
  ipcMain,
  Notification,
} = require("electron");
const { autoUpdater } = require("electron-updater");
const fs = require("node:fs");
const path = require("node:path");

const isDev = !app.isPackaged;

function readUpdateConfig() {
  const configPath = path.join(__dirname, "update-config.json");

  try {
    const raw = fs.readFileSync(configPath, "utf-8");
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

function initAutoUpdates(win) {
  if (isDev) {
    return;
  }

  const config = readUpdateConfig();
  const feedUrl = process.env.QUESTLIFE_UPDATE_URL || config?.url;

  if (!feedUrl || feedUrl.includes("your-domain.com")) {
    return;
  }

  autoUpdater.autoDownload = true;
  autoUpdater.autoInstallOnAppQuit = true;
  autoUpdater.setFeedURL({
    provider: "generic",
    url: feedUrl,
  });

  autoUpdater.on("error", (err) => {
    // Keep updater failures non-blocking for regular app usage.
    console.error("Auto-update error:", err?.message || err);
  });

  autoUpdater.on("update-downloaded", async () => {
    const result = await dialog.showMessageBox(win, {
      type: "info",
      title: "Mise a jour prete",
      message: "Une nouvelle version de QuestLife est prete.",
      detail: "Redemarrer maintenant pour installer la mise a jour ?",
      buttons: ["Redemarrer", "Plus tard"],
      defaultId: 0,
      cancelId: 1,
    });

    if (result.response === 0) {
      autoUpdater.quitAndInstall();
    }
  });

  setTimeout(() => {
    autoUpdater.checkForUpdates().catch(() => {
      // Errors are already handled by the updater error event.
    });
  }, 3000);
}

function createMainWindow() {
  const win = new BrowserWindow({
    width: 1440,
    height: 900,
    minWidth: 1024,
    minHeight: 680,
    backgroundColor: "#f5f3ee",
    title: "QuestLife",
    autoHideMenuBar: true,
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
      preload: path.join(__dirname, "preload.cjs"),
    },
  });

  if (isDev) {
    win.loadURL("http://localhost:5173");
  } else {
    win.loadFile(path.join(__dirname, "..", "dist", "index.html"));
  }

  return win;
}

ipcMain.handle("questlife:notify", async (_event, payload) => {
  if (!Notification.isSupported()) return { ok: false, reason: "unsupported" };

  const titleRaw =
    typeof payload?.title === "string" ? payload.title : "QuestLife";
  const bodyRaw = typeof payload?.body === "string" ? payload.body : "";
  const title = titleRaw.trim().slice(0, 80) || "QuestLife";
  const body = bodyRaw.trim().slice(0, 240);
  if (!body) return { ok: false, reason: "empty" };

  const notif = new Notification({
    title,
    body,
    silent: false,
  });
  notif.show();
  return { ok: true };
});

app.whenReady().then(() => {
  const win = createMainWindow();
  initAutoUpdates(win);

  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createMainWindow();
    }
  });
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") {
    app.quit();
  }
});
