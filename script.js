const trackInput = document.getElementById("Input");
const queue = document.getElementById("queue");

const STORAGE_KEY = "trackQueue";

let draggedRow = null;
let xKeyHeld = false;

function loadTracks() {
  const savedTracks = localStorage.getItem(STORAGE_KEY);
  if (!savedTracks) return;

  try {
    const tracks = JSON.parse(savedTracks);

    tracks.forEach((track) => {
      createTrackRow(track.date, track.time, track.name);
    });
  } catch (e) {
    console.error("Failed to load tracks from localStorage", e);
    localStorage.removeItem(STORAGE_KEY);
  }
}

function createTrackRow(date, time, name) {
  const trackRow = document.createElement("div");
  trackRow.className = "track-row";
  trackRow.draggable = true;

  const dragCell = document.createElement("button");
  dragCell.className = "drag-handle";
  dragCell.textContent = "☰";
  dragCell.title = "Drag to reorder";

  const dateCell = document.createElement("div");
  dateCell.className = "track-cell";
  dateCell.textContent = date;

  const timeCell = document.createElement("div");
  timeCell.className = "track-cell";
  timeCell.textContent = time;

  const nameCell = document.createElement("div");
  nameCell.className = "track-cell name-cell";
  nameCell.textContent = name;
  nameCell.title = "Click to search and remove. Hold X and click to edit.";

  nameCell.addEventListener("click", () => {
    if (nameCell.isContentEditable) return;

    if (xKeyHeld) {
      startEditing(nameCell);
      return;
    }

    const query = encodeURIComponent(nameCell.textContent.trim());
    const youtubeSearchUrl = `https://www.youtube.com/results?search_query=${query}`;
    window.open(youtubeSearchUrl, "_blank");

    trackRow.remove();
    saveTracks();
  });

  nameCell.addEventListener("blur", () => {
    if (nameCell.isContentEditable) {
      finishEditing(nameCell);
    }
  });

  nameCell.addEventListener("keydown", (event) => {
    if (!nameCell.isContentEditable) return;

    if (event.key === "Enter") {
      event.preventDefault();
      nameCell.blur();
    }

    if (event.key === "Escape") {
      event.preventDefault();
      cancelEditing(nameCell, name);
    }
  });

  const deleteCell = document.createElement("button");
  deleteCell.className = "track-cell delete-btn";
  deleteCell.textContent = "X";
  deleteCell.addEventListener("click", () => {
    trackRow.remove();
    saveTracks();
  });

  setupDragEvents(trackRow);

  trackRow.append(dragCell, dateCell, timeCell, nameCell, deleteCell);
  queue.appendChild(trackRow);
}

function startEditing(nameCell) {
  nameCell.dataset.originalValue = nameCell.textContent;
  nameCell.contentEditable = "true";
  nameCell.classList.add("editing");
  nameCell.focus();

  const selection = window.getSelection();
  const range = document.createRange();
  range.selectNodeContents(nameCell);
  selection.removeAllRanges();
  selection.addRange(range);
}

function finishEditing(nameCell) {
  nameCell.contentEditable = "false";
  nameCell.classList.remove("editing");

  const cleaned = nameCell.textContent.trim();

  if (cleaned === "") {
    nameCell.textContent = nameCell.dataset.originalValue || "(untitled)";
  } else {
    nameCell.textContent = cleaned;
  }

  saveTracks();
}

function cancelEditing(nameCell, fallbackName) {
  nameCell.textContent = nameCell.dataset.originalValue || fallbackName;
  nameCell.contentEditable = "false";
  nameCell.classList.remove("editing");
}

function setupDragEvents(trackRow) {
  trackRow.addEventListener("dragstart", () => {
    draggedRow = trackRow;
    trackRow.classList.add("dragging");
  });

  trackRow.addEventListener("dragend", () => {
    trackRow.classList.remove("dragging");
    draggedRow = null;
    saveTracks();
  });

  trackRow.addEventListener("dragover", (event) => {
    event.preventDefault();
  });

  trackRow.addEventListener("drop", (event) => {
    event.preventDefault();
    if (!draggedRow || draggedRow === trackRow) return;

    const rows = [...queue.querySelectorAll(".track-row")];
    const draggedIndex = rows.indexOf(draggedRow);
    const targetIndex = rows.indexOf(trackRow);

    if (draggedIndex < targetIndex) {
      queue.insertBefore(draggedRow, trackRow.nextSibling);
    } else {
      queue.insertBefore(draggedRow, trackRow);
    }
  });
}

function saveTracks() {
  const trackRows = queue.querySelectorAll(".track-row");
  const tracks = [];

  trackRows.forEach((row) => {
    tracks.push({
      date: row.children[1].textContent,
      time: row.children[2].textContent,
      name: row.children[3].textContent
    });
  });

  localStorage.setItem(STORAGE_KEY, JSON.stringify(tracks));
}

function addTrack() {
  const trackName = trackInput.value.trim();
  if (trackName === "") return;

  const date = getCurrentDate();
  const time = getCurrentTime();

  createTrackRow(date, time, trackName);
  saveTracks();

  trackInput.value = "";
}

function getCurrentDate() {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  return `${month}.${day}.${year}`;
}

function getCurrentTime() {
  const now = new Date();
  const hours = String(now.getHours()).padStart(2, "0");
  const minutes = String(now.getMinutes()).padStart(2, "0");
  return `${hours}:${minutes}`;
}

trackInput.addEventListener("keydown", (event) => {
  if (event.key === "Enter") {
    addTrack();
  }
});

document.addEventListener("keydown", (event) => {
  if (event.key.toLowerCase() === "x") {
    xKeyHeld = true;
  }
});

document.addEventListener("keyup", (event) => {
  if (event.key.toLowerCase() === "x") {
    xKeyHeld = false;
  }
});

window.addEventListener("blur", () => {
  xKeyHeld = false;
});

document.addEventListener("DOMContentLoaded", () => {
  loadTracks();
});