const trackInput = document.getElementById("Input");
const queue = document.getElementById("queue");
const totalCount = document.getElementById("totalCount");
const monthTimeline = document.getElementById("monthTimeline");

const STORAGE_KEY = "trackQueue";

let tracks = [];
let draggedTrackId = null;
let xKeyHeld = false;

function loadTracks() {
  const saved = localStorage.getItem(STORAGE_KEY);

  if (!saved) {
    renderTracks();
    return;
  }

  try {
    const parsed = JSON.parse(saved);

    tracks = parsed.map((t) => ({
      id: t.id || crypto.randomUUID(),
      name: t.name || "",
      createdAt: t.createdAt || new Date().toISOString()
    }));

    saveTracks();
    renderTracks();
  } catch {
    localStorage.removeItem(STORAGE_KEY);
    tracks = [];
    renderTracks();
  }
}

function saveTracks() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(tracks));
}

function addTrack() {
  const name = trackInput.value.trim();
  if (!name) return;

  tracks.unshift({
    id: crypto.randomUUID(),
    name,
    createdAt: new Date().toISOString()
  });

  saveTracks();
  renderTracks();
  trackInput.value = "";
}

function getDayKey(track) {
  const d = new Date(track.createdAt);
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function getMonthKey(track) {
  const d = new Date(track.createdAt);
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, "0");
  return `${year}-${month}`;
}

function formatDay(track) {
  const d = new Date(track.createdAt);
  const month = d.getMonth() + 1;
  const day = d.getDate();
  const year = String(d.getFullYear()).slice(-2);
  return `${month}.${day}.${year}`;
}

function formatTime(track) {
  const d = new Date(track.createdAt);
  const hours = String(d.getHours()).padStart(2, "0");
  const minutes = String(d.getMinutes()).padStart(2, "0");
  const seconds = String(d.getSeconds()).padStart(2, "0");
  return `${hours}:${minutes}:${seconds}`;
}

function formatMonthLabel(monthKey) {
  const [year, month] = monthKey.split("-");
  return `${Number(month)}.${String(year).slice(-2)}`;
}

function groupTracksByDay() {
  const grouped = {};

  tracks.forEach((track) => {
    const key = getDayKey(track);
    if (!grouped[key]) grouped[key] = [];
    grouped[key].push(track);
  });

  return grouped;
}

function renderTracks() {
  queue.innerHTML = "";
  monthTimeline.innerHTML = "";
  totalCount.textContent = tracks.length;

  if (tracks.length === 0) return;

  const grouped = groupTracksByDay();
  const sortedDayKeys = Object.keys(grouped).sort((a, b) => new Date(b) - new Date(a));

  sortedDayKeys.forEach((dayKey) => {
    const dayTracks = grouped[dayKey];

    const dayGroup = document.createElement("div");
    dayGroup.className = "day-group";
    dayGroup.id = `day-${dayKey}`;

    const header = document.createElement("div");
    header.className = "day-header";

    const label = document.createElement("div");
    label.className = "day-label";
    label.textContent = `${formatDay(dayTracks[0])} (${dayTracks.length})`;

    header.appendChild(label);
    dayGroup.appendChild(header);

    dayTracks.forEach((track) => {
      dayGroup.appendChild(createRow(track));
    });

    queue.appendChild(dayGroup);
  });

  renderMonthTimeline(sortedDayKeys, grouped);
}

function renderMonthTimeline(sortedDayKeys, grouped) {
  const seenMonths = new Set();

  sortedDayKeys.forEach((dayKey) => {
    const firstTrack = grouped[dayKey][0];
    const monthKey = getMonthKey(firstTrack);

    if (seenMonths.has(monthKey)) return;
    seenMonths.add(monthKey);

    const monthItem = document.createElement("button");
    monthItem.className = "month-link";
    monthItem.textContent = formatMonthLabel(monthKey);

    monthItem.addEventListener("click", () => {
      const firstDayInMonth = sortedDayKeys.find((key) => key.startsWith(monthKey));
      const target = document.getElementById(`day-${firstDayInMonth}`);
      if (target) {
        target.scrollIntoView({ behavior: "smooth", block: "start" });
      }
    });

    monthTimeline.appendChild(monthItem);
  });
}

function createRow(track) {
  const row = document.createElement("div");
  row.className = "track-row";
  row.draggable = true;
  row.dataset.id = track.id;

  const drag = document.createElement("button");
  drag.className = "drag-handle";
  drag.type = "button";
  drag.textContent = "☰";

  const date = document.createElement("div");
  date.className = "track-cell";
  date.textContent = formatDay(track);

  const time = document.createElement("div");
  time.className = "track-cell";
  time.textContent = formatTime(track);

  const name = document.createElement("div");
  name.className = "track-cell name-cell";
  name.textContent = track.name;

  name.addEventListener("click", () => {
    if (name.isContentEditable) return;

    if (xKeyHeld) {
      startEditing(name);
      return;
    }

    const q = encodeURIComponent(name.textContent);
    window.open(`https://www.youtube.com/results?search_query=${q}`, "_blank");

    tracks = tracks.filter((t) => t.id !== track.id);
    saveTracks();
    renderTracks();
  });

  name.addEventListener("blur", () => {
    if (!name.isContentEditable) return;

    name.contentEditable = "false";
    name.classList.remove("editing");

    const cleaned = name.textContent.trim() || track.name;
    const found = tracks.find((t) => t.id === track.id);

    if (found) {
      found.name = cleaned;
      saveTracks();
    }
  });

  name.addEventListener("keydown", (e) => {
    if (e.key === "Enter") {
      e.preventDefault();
      name.blur();
    }
  });

  const del = document.createElement("button");
  del.className = "delete-btn";
  del.type = "button";
  del.textContent = "X";
  del.addEventListener("click", () => {
    tracks = tracks.filter((t) => t.id !== track.id);
    saveTracks();
    renderTracks();
  });

  setupDrag(row);

  row.append(drag, date, time, name, del);
  return row;
}

function startEditing(el) {
  el.contentEditable = "true";
  el.classList.add("editing");
  el.focus();

  const range = document.createRange();
  range.selectNodeContents(el);
  range.collapse(false);

  const selection = window.getSelection();
  selection.removeAllRanges();
  selection.addRange(range);
}

function setupDrag(row) {
  row.addEventListener("dragstart", () => {
    draggedTrackId = row.dataset.id;
    row.classList.add("dragging");
  });

  row.addEventListener("dragend", () => {
    draggedTrackId = null;
    row.classList.remove("dragging");
  });

  row.addEventListener("dragover", (e) => {
    e.preventDefault();
  });

  row.addEventListener("drop", () => {
    const targetId = row.dataset.id;

    const fromIndex = tracks.findIndex((t) => t.id === draggedTrackId);
    const toIndex = tracks.findIndex((t) => t.id === targetId);

    if (fromIndex === -1 || toIndex === -1 || fromIndex === toIndex) return;

    const [moved] = tracks.splice(fromIndex, 1);
    tracks.splice(toIndex, 0, moved);

    saveTracks();
    renderTracks();
  });
}

trackInput.addEventListener("keydown", (e) => {
  if (e.key === "Enter") {
    addTrack();
  }
});

document.addEventListener("keydown", (e) => {
  if (e.key.toLowerCase() === "x") {
    xKeyHeld = true;
  }
});

document.addEventListener("keyup", (e) => {
  if (e.key.toLowerCase() === "x") {
    xKeyHeld = false;
  }
});

window.addEventListener("blur", () => {
  xKeyHeld = false;
});

document.addEventListener("DOMContentLoaded", loadTracks);
