const STORE = "psJeeLectureRecordsV1";
const count = document.getElementById("count");
const list = document.getElementById("list");
const fmt = seconds => {
  seconds = Math.max(0, Math.floor(seconds || 0));
  const m = Math.floor(seconds / 60), s = seconds % 60;
  return m + "m " + s + "s watched";
};
async function refresh() {
  const data = await chrome.storage.local.get(STORE);
  const rows = Array.isArray(data[STORE]) ? data[STORE] : [];
  count.textContent = rows.length;
  document.getElementById("time").textContent = rows.length ? "Tracked on this browser only · " + fmt(rows.reduce((sum, row) => sum + (row.watchedSeconds || 0), 0)) + " total" : "Only likely JEE-topic videos are tracked.";
  list.innerHTML = "";
  if (!rows.length) { list.innerHTML = '<p class="empty">Open a likely JEE lecture on YouTube.</p>'; return; }
  rows.slice(0, 8).forEach(row => {
    const item = document.createElement("article");
    item.className = "lecture";
    const title = document.createElement("strong"); title.textContent = row.title;
    const detail = document.createElement("small"); detail.textContent = row.subject + " · " + row.chapter + " · " + fmt(row.watchedSeconds);
    item.append(title, detail); list.appendChild(item);
  });
}
document.getElementById("refresh").addEventListener("click", refresh);
document.getElementById("export").addEventListener("click", async () => {
  const data = await chrome.storage.local.get(STORE);
  const rows = Array.isArray(data[STORE]) ? data[STORE] : [];
  const payload = { format: "personal-space-youtube-lectures-v1", exportedAt: new Date().toISOString(), lectures: rows };
  const url = URL.createObjectURL(new Blob([JSON.stringify(payload, null, 2)], {type:"application/json"}));
  const a = document.createElement("a"); a.href = url; a.download = "personal-space-youtube-lectures.json"; a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
});
refresh();