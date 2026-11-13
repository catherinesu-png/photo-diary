"use strict";
/*
 * Photo Diary — static version.
 * Code lives in GitHub; your data does NOT. Entries and photos are stored
 * in this browser's IndexedDB on this device only (see README.md).
 * Use "Export backup" to download a copy you can restore later.
 */

// ---------- tiny IndexedDB wrapper ----------
const DB_NAME = "photo-diary";
const DB_VERSION = 1;
let dbPromise = null;

function openDb() {
  if (!dbPromise) {
    dbPromise = new Promise((resolve, reject) => {
      const req = indexedDB.open(DB_NAME, DB_VERSION);
      req.onupgradeneeded = () => {
        const db = req.result;
        // entries: { date: "YYYY-MM-DD", text, thumb: dataURL|null, photoCount }
        db.createObjectStore("entries", { keyPath: "date" });
        // photos: { id, date, blob, name, created, caption, visibility }
        // Framework note: every photo carries a caption ("" for now) and a
        // visibility ("private" for now) from day one, so a future social
        // layer can share selected photos without re-shaping stored data.
        // Diary text lives only in entries and is ALWAYS private — it is
        // never part of any future shared view; only photos/captions can be.
        const photos = db.createObjectStore("photos", { keyPath: "id", autoIncrement: true });
        photos.createIndex("date", "date", { unique: false });
      };
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
    });
  }
  return dbPromise;
}

async function idb(store, mode, fn) {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(store, mode);
    const request = fn(tx.objectStore(store));
    tx.oncomplete = () => resolve(request ? request.result : undefined);
    tx.onerror = () => reject(tx.error);
    if (request) request.onerror = () => reject(request.error);
  });
}
const getEntry = (date) => idb("entries", "readonly", (s) => s.get(date));
const putEntry = (entry) => idb("entries", "readwrite", (s) => s.put(entry));
const allEntries = () => idb("entries", "readonly", (s) => s.getAll());
const photosForDate = (date) =>
  idb("photos", "readonly", (s) => s.index("date").getAll(date));
const addPhotoRecord = (rec) => idb("photos", "readwrite", (s) => s.add(rec));
const deletePhotoRecord = (id) => idb("photos", "readwrite", (s) => s.delete(id));
const allPhotos = () => idb("photos", "readonly", (s) => s.getAll());

// ---------- date helpers ----------
const pad = (n) => String(n).padStart(2, "0");
const toKey = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
const fromKey = (key) => {
  const [y, m, d] = key.split("-").map(Number);
  return new Date(y, m - 1, d);
};
const MONTHS = ["January","February","March","April","May","June","July",
  "August","September","October","November","December"];

// ---------- state ----------
let viewYear, viewMonth;           // month shown on the calendar
let selectedKey = toKey(new Date()); // day shown in the day panel
{
  const now = new Date();
  viewYear = now.getFullYear();
  viewMonth = now.getMonth();
}

// ---------- DOM ----------
const $ = (id) => document.getElementById(id);
const calendarEl = $("calendar"), monthLabel = $("monthLabel");
const dayLabel = $("dayLabel"), photoGrid = $("photoGrid"), noPhotos = $("noPhotos");
const entryText = $("entryText"), saveStatus = $("saveStatus");

// ---------- thumbnails ----------
function makeThumb(blob) {
  return new Promise((resolve) => {
    const url = URL.createObjectURL(blob);
    const img = new Image();
    img.onload = () => {
      const scale = Math.min(1, 240 / Math.max(img.width, img.height));
      const canvas = document.createElement("canvas");
      canvas.width = Math.round(img.width * scale);
      canvas.height = Math.round(img.height * scale);
      canvas.getContext("2d").drawImage(img, 0, 0, canvas.width, canvas.height);
      URL.revokeObjectURL(url);
      resolve(canvas.toDataURL("image/jpeg", 0.72));
    };
    img.onerror = () => { URL.revokeObjectURL(url); resolve(null); };
    img.src = url;
  });
}

async function refreshEntryMeta(date) {
  const entry = (await getEntry(date)) || { date, text: "", thumb: null, photoCount: 0 };
  const photos = await photosForDate(date);
  entry.photoCount = photos.length;
  entry.thumb = photos.length ? await makeThumb(photos[0].blob) : null;
  await putEntry(entry);
  return entry;
}

// ---------- calendar ----------
async function renderCalendar() {
  monthLabel.textContent = `${MONTHS[viewMonth]} ${viewYear}`;
  const entries = await allEntries();
  const byDate = new Map(entries.map((e) => [e.date, e]));

  const first = new Date(viewYear, viewMonth, 1);
  const start = new Date(viewYear, viewMonth, 1 - first.getDay()); // Sunday on/before the 1st
  const todayKey = toKey(new Date());
  calendarEl.innerHTML = "";

  for (let i = 0; i < 42; i++) {
    const d = new Date(start.getFullYear(), start.getMonth(), start.getDate() + i);
    const key = toKey(d);
    const entry = byDate.get(key);
    const cell = document.createElement("button");
    cell.type = "button";
    cell.className = "day-cell"
      + (d.getMonth() !== viewMonth ? " other-month" : "")
      + (key === todayKey ? " today" : "")
      + (key === selectedKey ? " selected" : "");
    if (entry && entry.thumb) {
      const img = document.createElement("img");
      img.className = "thumb"; img.src = entry.thumb; img.alt = "";
      cell.appendChild(img);
    }
    const num = document.createElement("span");
    num.className = "num"; num.textContent = d.getDate();
    cell.appendChild(num);
    if (entry && entry.text && entry.text.trim()) {
      const dot = document.createElement("span");
      dot.className = "dot"; cell.appendChild(dot);
    }
    cell.addEventListener("click", () => selectDay(key));
    calendarEl.appendChild(cell);
  }
}

// ---------- day panel ----------
const objectUrls = [];
function clearPhotoGrid() {
  while (objectUrls.length) URL.revokeObjectURL(objectUrls.pop());
  photoGrid.innerHTML = "";
}

async function renderDay() {
  const d = fromKey(selectedKey);
  dayLabel.textContent = d.toLocaleDateString(undefined, {
    weekday: "long", year: "numeric", month: "long", day: "numeric",
  });
  const entry = await getEntry(selectedKey);
  entryText.value = entry ? entry.text || "" : "";
  saveStatus.textContent = "";

  clearPhotoGrid();
  const photos = await photosForDate(selectedKey);
  noPhotos.hidden = photos.length > 0;
  for (const photo of photos) {
    const wrap = document.createElement("div");
    wrap.className = "photo-wrap";
    const url = URL.createObjectURL(photo.blob);
    objectUrls.push(url);
    const img = document.createElement("img");
    img.src = url; img.alt = photo.name || "Diary photo";
    img.addEventListener("click", () => openLightbox(url));
    const del = document.createElement("button");
    del.type = "button"; del.className = "del"; del.textContent = "×";
    del.title = "Delete this photo";
    del.addEventListener("click", async () => {
      await deletePhotoRecord(photo.id);
      await refreshEntryMeta(selectedKey);
      await renderDay();
      await renderCalendar();
    });
    wrap.appendChild(img); wrap.appendChild(del);
    photoGrid.appendChild(wrap);
  }
}

async function selectDay(key) {
  selectedKey = key;
  const d = fromKey(key);
  viewYear = d.getFullYear(); viewMonth = d.getMonth();
  await renderDay();
  await renderCalendar();
}

// ---------- events ----------
$("prevMonth").addEventListener("click", async () => {
  viewMonth--; if (viewMonth < 0) { viewMonth = 11; viewYear--; }
  await renderCalendar();
});
$("nextMonth").addEventListener("click", async () => {
  viewMonth++; if (viewMonth > 11) { viewMonth = 0; viewYear++; }
  await renderCalendar();
});
$("todayBtn").addEventListener("click", () => selectDay(toKey(new Date())));

$("photoInput").addEventListener("change", async (e) => {
  const files = Array.from(e.target.files).slice(0, 8); // up to 8 at a time
  for (const file of files) {
    await addPhotoRecord({
      date: selectedKey, blob: file, name: file.name, created: Date.now(),
      caption: "", visibility: "private",
    });
  }
  e.target.value = "";
  if (files.length) {
    await refreshEntryMeta(selectedKey);
    await renderDay();
    await renderCalendar();
  }
});

$("saveBtn").addEventListener("click", async () => {
  const entry = (await getEntry(selectedKey)) ||
    { date: selectedKey, text: "", thumb: null, photoCount: 0 };
  entry.text = entryText.value;
  await putEntry(entry);
  saveStatus.textContent = "Saved ✓";
  await renderCalendar();
});
entryText.addEventListener("input", () => { saveStatus.textContent = ""; });

// ---------- lightbox ----------
function openLightbox(url) {
  $("lightboxImg").src = url;
  $("lightbox").hidden = false;
}
$("lightboxClose").addEventListener("click", () => { $("lightbox").hidden = true; });
$("lightbox").addEventListener("click", (e) => {
  if (e.target === $("lightbox")) $("lightbox").hidden = true;
});

// ---------- backup: export / import ----------
const blobToDataUrl = (blob) => new Promise((resolve, reject) => {
  const r = new FileReader();
  r.onload = () => resolve(r.result);
  r.onerror = () => reject(r.error);
  r.readAsDataURL(blob);
});
const dataUrlToBlob = async (dataUrl) => (await fetch(dataUrl)).blob();

$("exportBtn").addEventListener("click", async () => {
  const entries = await allEntries();
  const photos = await allPhotos();
  const backup = {
    format: "photo-diary-backup-v1",
    exportedAt: new Date().toISOString(),
    entries,
    photos: [],
  };
  for (const p of photos) {
    backup.photos.push({
      date: p.date, name: p.name, created: p.created,
      caption: p.caption || "", visibility: p.visibility || "private",
      dataUrl: await blobToDataUrl(p.blob),
    });
  }
  const a = document.createElement("a");
  a.href = URL.createObjectURL(new Blob([JSON.stringify(backup)], { type: "application/json" }));
  a.download = `photo-diary-backup-${toKey(new Date())}.json`;
  a.click();
  URL.revokeObjectURL(a.href);
});

$("importInput").addEventListener("change", async (e) => {
  const file = e.target.files[0];
  e.target.value = "";
  if (!file) return;
  try {
    const backup = JSON.parse(await file.text());
    if (backup.format !== "photo-diary-backup-v1") throw new Error("not a photo diary backup");
    for (const entry of backup.entries || []) await putEntry(entry);
    for (const p of backup.photos || []) {
      await addPhotoRecord({
        date: p.date, name: p.name, created: p.created,
        caption: p.caption || "", visibility: p.visibility || "private",
        blob: await dataUrlToBlob(p.dataUrl),
      });
    }
    for (const entry of backup.entries || []) await refreshEntryMeta(entry.date);
    await renderDay();
    await renderCalendar();
    alert("Backup imported.");
  } catch (err) {
    alert("That file could not be imported: " + err.message);
  }
});

// ---------- go ----------
renderDay().then(renderCalendar);
