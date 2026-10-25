const STORE = "psJeeLectureRecordsV1";
const STATUS_KEY = "psJeeLectureTrackerStatusV1";
const count = document.getElementById("count");
const list = document.getElementById("list");
const statusPanel = document.getElementById("trackerStatus");
const statusMessage = document.getElementById("statusMessage");
const statusTitle = document.getElementById("statusTitle");
const statusUpdated = document.getElementById("statusUpdated");

const fmt = seconds => {
  seconds = Math.max(0, Math.floor(seconds || 0));
  const m = Math.floor(seconds / 60), s = seconds % 60;
  return m + "m " + s + "s watched";
};

async function refresh() {
  const data = await chrome.storage.local.get([STORE, STATUS_KEY]);
  const rows = Array.isArray(data[STORE]) ? data[STORE] : [];
  const status = data[STATUS_KEY];
  count.textContent = rows.length;
  document.getElementById("time").textContent = rows.length
    ? "Stored on this browser · " + fmt(rows.reduce((sum, row) => sum + (row.watchedSeconds || 0), 0)) + " total"
    : "No watched-time records saved yet.";
  list.innerHTML = "";
  if (!rows.length) {
    list.innerHTML = '<p class="empty">No matched lecture recorded yet. Check the tracker status above.</p>';
  } else {
    rows.slice(0, 8).forEach(row => {
      const item = document.createElement("article");
      item.className = "lecture";
      const title = document.createElement("strong"); title.textContent = row.title || "Untitled lecture";
      const detail = document.createElement("small");
      detail.textContent = (row.subject || "Unmatched subject") + " · " + (row.chapter || "Unmatched chapter") + " · " + fmt(row.watchedSeconds);
      item.append(title, detail); list.appendChild(item);
    });
  }

  if (!status) {
    statusPanel.className = "tracker-status type-waiting";
    statusMessage.textContent = "No response from a YouTube tab yet. Open a direct video page (youtube.com/watch?v=…), refresh that tab, then play a JEE lecture.";
    statusTitle.textContent = "";
    statusUpdated.textContent = "";
  } else {
    statusPanel.className = "tracker-status type-" + String(status.type || "unknown").replace(/[^a-z0-9_-]/gi, "");
    statusMessage.textContent = status.message || "Tracker responded, but did not provide a status message.";
    statusTitle.textContent = status.title ? "Video: " + status.title : "";
    let pageHost = "";
    try { pageHost = new URL(status.url).hostname; } catch {}
    const timeText = status.updatedAt ? "Last status: " + new Date(status.updatedAt).toLocaleTimeString() : "";
    statusUpdated.textContent = [pageHost, timeText].filter(Boolean).join(" · ");
  }
}

document.getElementById("refresh").addEventListener("click", refresh);
chrome.storage.onChanged.addListener((changes, area) => {
  if (area === "local" && (changes[STORE] || changes[STATUS_KEY])) refresh();
});
document.getElementById("export").addEventListener("click", async () => {
  const data = await chrome.storage.local.get(STORE);
  const rows = Array.isArray(data[STORE]) ? data[STORE] : [];
  const payload = { format: "personal-space-youtube-lectures-v1", exportedAt: new Date().toISOString(), lectures: rows };
  const url = URL.createObjectURL(new Blob([JSON.stringify(payload, null, 2)], {type:"application/json"}));
  const a = document.createElement("a"); a.href = url; a.download = "personal-space-youtube-lectures.json"; a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
});
refresh();
