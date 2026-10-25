const STORE = "psJeeLectureRecordsV1";
const STATUS_KEY = "psJeeLectureTrackerStatusV1";
const TELEGRAM_STATUS_KEY = "psJeeTelegramTrackerStatusV1";
const TELEGRAM_STORE = "psJeeTelegramLectureRecordsV1";
const PLANNER_CONFIG_KEY = "psJeePlannerConfigV1";
const LAST_SYNC_KEY = "psJeePlannerLastSyncV1";
const SCRIPT_ID = "ps-jee-planner-auto-sync-v1";

const count = document.getElementById("count");
const list = document.getElementById("list");
const statusPanel = document.getElementById("trackerStatus");
const statusMessage = document.getElementById("statusMessage");
const statusTitle = document.getElementById("statusTitle");
const statusUpdated = document.getElementById("statusUpdated");
const telegramStatusPanel = document.getElementById("telegramTrackerStatus");
const telegramStatusMessage = document.getElementById("telegramStatusMessage");
const telegramStatusTitle = document.getElementById("telegramStatusTitle");
const telegramStatusUpdated = document.getElementById("telegramStatusUpdated");
const plannerUrlInput = document.getElementById("plannerUrl");
const connectButton = document.getElementById("connectPlanner");
const disconnectButton = document.getElementById("disconnectPlanner");
const syncConnectionMessage = document.getElementById("syncConnectionMessage");

const fmt = seconds => {
  seconds = Math.max(0, Math.floor(seconds || 0));
  return Math.floor(seconds / 60) + "m " + (seconds % 60) + "s watched";
};
function showConnectionMessage(message, isError = false) {
  syncConnectionMessage.textContent = message;
  syncConnectionMessage.classList.toggle("error", isError);
}
function pathPrefixFromUrl(url) {
  const path = url.pathname || "/";
  if (path.endsWith(".html") || path.endsWith(".htm")) return path.slice(0, path.lastIndexOf("/") + 1) || "/";
  return path === "/" ? "/" : path.replace(/\/+$/, "");
}
function pathnameMatches(pathname, prefix) {
  if (!prefix || prefix === "/") return true;
  return pathname === prefix || pathname.startsWith(prefix.endsWith("/") ? prefix : prefix + "/");
}
function matchPatternFor(url) {
  if (url.protocol === "https:") return "https://" + url.hostname + "/*";
  if (url.protocol === "http:" && ["localhost", "127.0.0.1"].includes(url.hostname)) return "http://" + url.hostname + "/*";
  throw new Error("Use an https:// planner URL. http:// is allowed only for localhost testing.");
}
async function restoreConnection() {
  const data = await chrome.storage.local.get([PLANNER_CONFIG_KEY, LAST_SYNC_KEY]);
  const config = data[PLANNER_CONFIG_KEY];
  if (config) {
    plannerUrlInput.value = config.url || "";
    disconnectButton.classList.remove("hidden");
    const last = data[LAST_SYNC_KEY];
    if (last && last.origin === config.origin) showConnectionMessage("Connected · " + (last.count || 0) + " YouTube + Telegram records synced at " + new Date(last.syncedAt).toLocaleTimeString() + ".");
    else showConnectionMessage("Connected to " + config.origin + ". Open or refresh your planner page to sync existing records.");
  } else showConnectionMessage("Not connected yet. Connect once; repeated export/import is not needed.");
}
async function connectPlanner() {
  let url, pattern;
  try {
    url = new URL(plannerUrlInput.value.trim());
    pattern = matchPatternFor(url);
    if (!url.hostname || url.username || url.password) throw new Error("Paste the normal planner URL from the address bar.");
  } catch (error) {
    showConnectionMessage(error.message || "Enter a valid planner URL.", true);
    return;
  }

  connectButton.disabled = true;
  connectButton.textContent = "Requesting permission…";
  try {
    // Request permission directly from the click gesture so the browser can display its normal consent prompt.
    const granted = await chrome.permissions.request({ origins: [pattern] });
    if (!granted) throw new Error("Permission was not granted, so automatic sync is not connected.");
    const config = {
      url: url.href, origin: url.origin, pathPrefix: pathPrefixFromUrl(url),
      matchPattern: pattern, connectedAt: new Date().toISOString()
    };
    await chrome.storage.local.set({ [PLANNER_CONFIG_KEY]: config });
    const existing = await chrome.scripting.getRegisteredContentScripts({ ids: [SCRIPT_ID] });
    if (existing.length) await chrome.scripting.unregisterContentScripts({ ids: [SCRIPT_ID] });
    await chrome.scripting.registerContentScripts([{
      id: SCRIPT_ID, matches: [pattern], js: ["planner-sync.js"],
      runAt: "document_idle", persistAcrossSessions: true
    }]);

    let injected = false;
    const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
    const tab = tabs && tabs[0];
    if (tab?.id && tab.url) {
      try {
        const activeUrl = new URL(tab.url);
        if (activeUrl.origin === config.origin && pathnameMatches(activeUrl.pathname, config.pathPrefix)) {
          await chrome.scripting.executeScript({ target: { tabId: tab.id }, files: ["planner-sync.js"] });
          injected = true;
        }
      } catch {}
    }
    disconnectButton.classList.remove("hidden");
    showConnectionMessage(injected
      ? "Connected! Auto-sync is active on this planner tab. Watch a matched lecture; it should appear without exporting a file."
      : "Connected! Open or refresh your planner page. It will sync automatically whenever you open it.");
    await refresh();
  } catch (error) {
    showConnectionMessage(error.message || "Could not connect the planner.", true);
  } finally {
    connectButton.disabled = false;
    connectButton.textContent = "Connect planner";
  }
}
async function disconnectPlanner() {
  try {
    const data = await chrome.storage.local.get(PLANNER_CONFIG_KEY);
    const config = data[PLANNER_CONFIG_KEY];
    const registered = await chrome.scripting.getRegisteredContentScripts({ ids: [SCRIPT_ID] });
    if (registered.length) await chrome.scripting.unregisterContentScripts({ ids: [SCRIPT_ID] });
    await chrome.storage.local.remove([PLANNER_CONFIG_KEY, LAST_SYNC_KEY]);
    if (config?.matchPattern) {
      try { await chrome.permissions.remove({ origins: [config.matchPattern] }); } catch {}
    }
    plannerUrlInput.value = "";
    disconnectButton.classList.add("hidden");
    showConnectionMessage("Planner disconnected. Your extension records remain saved.");
  } catch (error) {
    showConnectionMessage(error.message || "Could not disconnect.", true);
  }
}
async function refresh() {
  const data = await chrome.storage.local.get([STORE, STATUS_KEY, TELEGRAM_STATUS_KEY, TELEGRAM_STORE, PLANNER_CONFIG_KEY, LAST_SYNC_KEY]);
  const rows = Array.isArray(data[STORE]) ? data[STORE] : [];
  const status = data[STATUS_KEY];
  const telegramStatus = data[TELEGRAM_STATUS_KEY];
  const telegramRows = Array.isArray(data[TELEGRAM_STORE]) ? data[TELEGRAM_STORE] : [];
  if (telegramStatusPanel) {
    telegramStatusPanel.className = "tracker-status " + (telegramStatus?.type === "tracking" ? "type-tracking" : telegramStatus?.type === "error" ? "type-error" : telegramStatus?.type === "unmatched" ? "type-unmatched" : "type-waiting");
    telegramStatusMessage.textContent = telegramStatus?.message || "Open Telegram Web in this browser and play a lecture video to test detection.";
    telegramStatusTitle.textContent = telegramStatus?.title ? "Video/post: " + telegramStatus.title : "";
    telegramStatusUpdated.textContent = telegramStatus?.updatedAt ? "Telegram Web · " + new Date(telegramStatus.updatedAt).toLocaleTimeString() + " · " + telegramRows.length + " records" : "";
  }
  // YouTube and Telegram store records separately; show their combined total.
  const allRows = [
    ...rows.map(row => ({ ...row, trackerSource: "YouTube" })),
    ...telegramRows.map(row => ({ ...row, trackerSource: "Telegram Web" }))
  ];
  count.textContent = allRows.length;
  const totalSeconds = allRows.reduce((sum, row) => sum + (Number(row.watchedSeconds) || 0), 0);
  document.getElementById("time").textContent = allRows.length
    ? "YouTube + Telegram · " + fmt(totalSeconds) + " total"
    : "No watched-time records saved yet.";

  list.innerHTML = "";
  if (!allRows.length) {
    list.innerHTML = '<p class="empty">No matched lecture recorded yet. Check the tracker status above.</p>';
  } else {
    allRows.slice().sort((a, b) => String(b.lastWatchedAt || "").localeCompare(String(a.lastWatchedAt || ""))).slice(0, 8).forEach(row => {
      const item = document.createElement("article");
      item.className = "lecture";
      const title = document.createElement("strong"); title.textContent = row.title || "Untitled lecture";
      const detail = document.createElement("small");
      detail.textContent = (row.trackerSource || row.source || "Lecture") + " · " + (row.subject || "Unmatched subject") + " · " + (row.chapter || "Unmatched chapter") + " · " + fmt(row.watchedSeconds);
      item.append(title, detail); list.appendChild(item);
    });
  }

  if (!status) {
    statusPanel.className = "tracker-status type-waiting";
    statusMessage.textContent = "No response from a YouTube tab yet. Open a direct video page, refresh the tab, and play a JEE lecture.";
    statusTitle.textContent = ""; statusUpdated.textContent = "";
  } else {
    statusPanel.className = "tracker-status type-" + String(status.type || "unknown").replace(/[^a-z0-9_-]/gi, "");
    statusMessage.textContent = status.message || "Tracker responded, but did not provide a status message.";
    statusTitle.textContent = status.title ? "Video: " + status.title : "";
    let pageHost = "";
    try { pageHost = new URL(status.url).hostname; } catch {}
    const timeText = status.updatedAt ? "Last status: " + new Date(status.updatedAt).toLocaleTimeString() : "";
    statusUpdated.textContent = [pageHost, timeText].filter(Boolean).join(" · ");
  }
  const config = data[PLANNER_CONFIG_KEY];
  if (config) {
    plannerUrlInput.value = config.url || plannerUrlInput.value;
    disconnectButton.classList.remove("hidden");
    const last = data[LAST_SYNC_KEY];
    if (last && last.origin === config.origin) showConnectionMessage("Connected · " + (last.count || 0) + " YouTube + Telegram records synced at " + new Date(last.syncedAt).toLocaleTimeString() + ".");
    else showConnectionMessage("Connected to " + config.origin + ". Open or refresh your planner page to sync.");
  } else disconnectButton.classList.add("hidden");
}
document.getElementById("refresh").addEventListener("click", refresh);
chrome.storage.onChanged.addListener((changes, area) => {
  if (area === "local" && (changes[STORE] || changes[STATUS_KEY] || changes[TELEGRAM_STATUS_KEY] || changes[TELEGRAM_STORE] || changes[PLANNER_CONFIG_KEY] || changes[LAST_SYNC_KEY])) refresh();
});
connectButton.addEventListener("click", connectPlanner);
disconnectButton.addEventListener("click", disconnectPlanner);
document.getElementById("export").addEventListener("click", async () => {
  const data = await chrome.storage.local.get([STORE, TELEGRAM_STORE]);
  const rows = Array.isArray(data[STORE]) ? data[STORE] : [];
  const telegramRows = Array.isArray(data[TELEGRAM_STORE]) ? data[TELEGRAM_STORE] : [];
  // Keep the legacy format/lectures field compatible with the planner importer,
  // while also including Telegram rows so a single backup preserves everything.
  const payload = {
    format: "personal-space-youtube-lectures-v1",
    backupVersion: 2,
    exportedAt: new Date().toISOString(),
    lectures: rows,
    telegramLectures: telegramRows
  };
  const url = URL.createObjectURL(new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" }));
  const a = document.createElement("a");
  a.href = url;
  a.download = "personal-space-lecture-tracker-backup.json";
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
});
refresh();
restoreConnection();