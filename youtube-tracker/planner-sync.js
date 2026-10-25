(() => {
  "use strict";
  if (window.__psJeePlannerSyncInstalled) return;
  window.__psJeePlannerSyncInstalled = true;

  const STORE = "psJeeLectureRecordsV1";
  const TELEGRAM_STORE = "psJeeTelegramLectureRecordsV1";
  const CONFIG_KEY = "psJeePlannerConfigV1";
  const LAST_SYNC_KEY = "psJeePlannerLastSyncV1";
  const EXTENSION_SOURCE = "PS_JEE_TRACKER_EXTENSION";
  const PLANNER_SOURCE = "PS_JEE_PLANNER_PAGE";
  let lastSignature = "";

  function pageIsConfigured(config) {
    if (!config || config.origin !== location.origin || typeof config.pathPrefix !== "string") return false;
    const prefix = config.pathPrefix;
    return !prefix || prefix === "/" || location.pathname === prefix ||
      location.pathname.startsWith(prefix.endsWith("/") ? prefix : prefix + "/");
  }

  async function publishRecords() {
    try {
      const data = await chrome.storage.local.get([STORE, TELEGRAM_STORE, CONFIG_KEY]);
      const config = data[CONFIG_KEY];
      if (!pageIsConfigured(config)) return;
      const records = Array.isArray(data[STORE]) ? data[STORE] : [];
      const telegramLectures = Array.isArray(data[TELEGRAM_STORE]) ? data[TELEGRAM_STORE] : [];
      const signature = JSON.stringify(records.map(row => [
        row.videoId, row.watchedSeconds, row.lastWatchedAt, row.subject, row.chapter
      ]));
      lastSignature = signature;
      window.postMessage({
        source: EXTENSION_SOURCE,
        type: "LECTURES_UPDATED",
        format: "personal-space-youtube-lectures-v1",
        lectures: records,
        telegramLectures,
        sentAt: new Date().toISOString()
      }, location.origin);
      await chrome.storage.local.set({
        [LAST_SYNC_KEY]: {
          origin: location.origin,
          path: location.pathname,
          count: records.length,
          telegramCount: telegramLectures.length,
          syncedAt: new Date().toISOString()
        }
      });
    } catch (error) {
      console.warn("Personal Space lecture sync failed", error);
    }
  }

  window.addEventListener("message", event => {
    if (event.source !== window || event.origin !== location.origin) return;
    const message = event.data;
    if (message?.source === PLANNER_SOURCE && message.type === "REQUEST_LECTURES") {
      publishRecords();
    }
  });

  chrome.storage.onChanged.addListener((changes, area) => {
    if (area === "local" && (changes[STORE] || changes[TELEGRAM_STORE] || changes[CONFIG_KEY])) publishRecords();
  });

  publishRecords();
})();