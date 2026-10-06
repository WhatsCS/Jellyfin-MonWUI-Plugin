import { musicPlayerState } from "../core/state.js";
import { showNotification } from "../ui/notification.js";
import { getConfig } from "../../config.js";
import { musicDB } from "../utils/db.js";
import { fetchLyrics } from "../lyrics/lyrics.js";

const config = getConfig();
const BATCH_SIZE = config.gruplimit || 250;

let modalEl = null;
let modalBodyEl = null;
let loadingSpinnerEl = null;
let detailedModalEl = null;
let detailedTitleEl = null;
let detailedContentEl = null;
let closeBtn = null;
let detailedCloseBtn = null;
let refreshBtn = null;
let refreshIcon = null;
let fetchAllLyricsBtn = null;
let cancelLyricsBtn = null;
let lyricsProgressContainer = null;
let lyricsProgressFill = null;
let lyricsProgressText = null;
let keydownHandler = null;
let clickBackdropHandler = null;
let clickBackdropDetailedHandler = null;
let lyricsUpdateInProgress = false;
let lyricsCancelRequested = false;
let refreshInProgress = false;
let cachedStats = null;
let lastUpdateTime = 0;
const CACHE_DURATION = 5 * 60 * 1000;

async function updateLyricsDatabase() {
  if (lyricsUpdateInProgress) {
    showNotification(
      `<i class="fas fa-circle-notch fa-spin"></i> ${config.languageLabels?.fetchLyricsRunning || "Lyrics are already being updated..."}`,
      2000,
      "info"
    );
    return;
  }

  lyricsUpdateInProgress = true;
  lyricsCancelRequested = false;

  const btn = fetchAllLyricsBtn;
  const originalHTML = btn?.innerHTML;
  if (btn) {
    btn.disabled = true;
    btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i>';
  }
  if (cancelLyricsBtn) {
    cancelLyricsBtn.disabled = false;
    cancelLyricsBtn.innerHTML = '<i class="fas fa-stop"></i>';
    cancelLyricsBtn.style.display = 'inline-flex';
  }
  showLyricsProgress(0, config.languageLabels?.starting || "Starting...");

  try {
    const tracks = await musicDB.getAllTracks();
    const total = tracks.length || 0;
    let updatedCount = 0;
    const originalPlaylist = musicPlayerState.playlist;
    const originalIndex = musicPlayerState.currentIndex;
    await musicDB.replaceLyrics?.([]);
    for (let i = 0; i < total; i++) {
      if (lyricsCancelRequested) break;
      const track = tracks[i];
      musicPlayerState.playlist = [track];
      musicPlayerState.currentIndex = 0;

      try { delete musicPlayerState.lyricsCache?.[track.Id]; } catch {}

      let lyrics = null;
      try {
        lyrics = await fetchLyrics();
      } catch {}

      if (lyrics) {
        try {
          await musicDB.saveLyrics(track.Id, lyrics);
          updatedCount++;
        } catch (err) {
          console.warn(`Could not save lyrics (${track?.Name || track?.Id}):`, err);
        }
      }
      const pct = Math.floor(((i + 1) / total) * 100);
      const label = `${config.languageLabels?.processing || "Processing"}: ${i + 1}/${total}`;
      showLyricsProgress(pct, label);
    }
    musicPlayerState.playlist = originalPlaylist;
    musicPlayerState.currentIndex = originalIndex;
    if (lyricsCancelRequested) {
      showNotification(
        `<i class="fas fa-circle-pause"></i> ${config.languageLabels?.fetchLyricsCancelled || "Operation cancelled"} (${config.languageLabels?.saved || "saved"}: ${await musicDB.getLyricsCount?.() ?? updatedCount})`,
        3000,
        "warning"
      );
    } else {
      showNotification(
        `<i class="fas fa-music"></i> ${updatedCount} ${config.languageLabels?.fetchLyrics || "Lyrics added to the database"}`,
        3000,
        "db"
      );
    }

    await loadStatsIntoModal(true);
  } catch (err) {
    console.error("Error updating lyrics:", err);
    showNotification(
      `<i class="fas fa-exclamation-triangle"></i> ${config.languageLabels?.fetchLyricsError || "Failed to add lyrics to the database"}`,
      3000,
      "error"
    );
  } finally {
    if (btn) {
      btn.disabled = false;
      btn.innerHTML = originalHTML;
    }
    hideLyricsProgress();
    if (cancelLyricsBtn) {
      cancelLyricsBtn.disabled = false;
      cancelLyricsBtn.innerHTML = '<i class="fas fa-stop"></i>';
      cancelLyricsBtn.style.display = 'none';
    }
    lyricsUpdateInProgress = false;
    lyricsCancelRequested = false;
  }
}

export function showStatsModal() {
  if (!modalEl) {
    buildStatsModal();
  }

  modalEl.classList.remove("hidden");
  document.body.style.overflow = "hidden";
  loadStatsIntoModal().finally(() => {
    if (loadingSpinnerEl) loadingSpinnerEl.style.display = "none";
    if (modalBodyEl) modalBodyEl.style.display = "flex";
  });
}

function buildStatsModal() {
  modalEl = document.createElement("div");
  modalEl.id = "music-stats-modal";
  modalEl.className = "modal";

  const modalContent = document.createElement("div");
  modalContent.className = "modal-content modal-stats-content";

  const closeRefreshContainer = document.createElement("div");
  closeRefreshContainer.className = "modallist-close-container";

  refreshBtn = document.createElement("span");
  refreshBtn.className = "modal-refresh-btn";
  refreshBtn.title = config.languageLabels?.refreshData || "Refresh Statistics";
  refreshIcon = document.createElement("i");
  refreshIcon.className = "fa-solid fa-rotate";
  refreshBtn.appendChild(refreshIcon);

  closeBtn = document.createElement("span");
  closeBtn.className = "modal-close-btn";
  const closeIcon = document.createElement("i");
  closeIcon.className = "fa-solid fa-xmark";
  closeBtn.appendChild(closeIcon);

  closeRefreshContainer.appendChild(refreshBtn);
  closeRefreshContainer.appendChild(closeBtn);

  const title = document.createElement("h2");
  title.className = "modal-stats-title";
  title.textContent = config.languageLabels?.statsTitle || "Database Statistics";

  loadingSpinnerEl = document.createElement("div");
  loadingSpinnerEl.className = "modal-loading-spinner";

  modalBodyEl = document.createElement("div");
  modalBodyEl.className = "modal-stats-body";
  modalBodyEl.style.display = "none";

  const statDefs = [
    ["stat-total-tracks", "fa-solid fa-music", config.languageLabels?.totalTracks || "Total Tracks"],
    ["stat-total-albums", "fa-solid fa-compact-disc", config.languageLabels?.totalAlbums || "Total Albums"],
    ["stat-total-artists", "fa-solid fa-user", config.languageLabels?.totalArtists || "Total Artists"],
    ["stat-db-size", "fa-solid fa-database", config.languageLabels?.databaseSize || "Database Size"],
    ["stat-total-lyrics", "fa-solid fa-align-left", config.languageLabels?.totalLyrics || "Lyrics added to the database"],
  ];
  statDefs.forEach(([id, icon, label]) => {
    const el = document.createElement("div");
    el.id = id;
    el.className = "stat-item";
    el.innerHTML = `<i class="${icon}"></i> ${label}: <span class="stat-value">...</span>`;
    modalBodyEl.appendChild(el);
  });

  const lyricsStat = modalBodyEl.querySelector("#stat-total-lyrics");

  fetchAllLyricsBtn = document.createElement("button");
  fetchAllLyricsBtn.id = "fetch-all-lyrics-btn";
  fetchAllLyricsBtn.className = "btn-icon";
  fetchAllLyricsBtn.title = config.languageLabels?.fetchAllLyrics || "Add all lyrics to the database (this may take some time)";
  fetchAllLyricsBtn.innerHTML = '<i class="fa-solid fa-sync"></i>';
  lyricsStat.appendChild(fetchAllLyricsBtn);

  cancelLyricsBtn = document.createElement("button");
  cancelLyricsBtn.id = "cancel-lyrics-btn";
  cancelLyricsBtn.className = "btn-icon";
  cancelLyricsBtn.title = config.languageLabels?.cancel || "Cancel";
  cancelLyricsBtn.style.display = "none";
  cancelLyricsBtn.innerHTML = '<i class="fas fa-stop"></i>';
  lyricsStat.appendChild(cancelLyricsBtn);

  lyricsProgressContainer = document.createElement("div");
  lyricsProgressContainer.id = "lyrics-progress-container";
  lyricsProgressContainer.className = "restore-progress-container";
  lyricsProgressContainer.style.display = "none";
  lyricsProgressContainer.innerHTML = `
    <div class="restore-progress-bar" style="width:160px; margin-left:8px;">
      <div class="restore-progress-fill" id="lyrics-progress-fill"></div>
    </div>
    <div class="restore-progress-text" id="lyrics-progress-text">0%</div>
  `;
  lyricsStat.appendChild(lyricsProgressContainer);
  lyricsProgressFill = lyricsProgressContainer.querySelector('#lyrics-progress-fill');
  lyricsProgressText = lyricsProgressContainer.querySelector('#lyrics-progress-text');
  const updatesSection = createStatSection(
    config.languageLabels?.recentUpdates || "Recently Updated",
    "stat-recent-updates",
    "show-all-updates",
    config.languageLabels?.showAllUpdates || "Show All Updates"
  );
  const deletesSection = createStatSection(
    config.languageLabels?.recentDeletes || "Recently Deleted",
    "stat-recent-deletes",
    "show-all-deletes",
    config.languageLabels?.showAllDeletes || "Show All Deletes"
  );
  modalBodyEl.appendChild(updatesSection);
  modalBodyEl.appendChild(deletesSection);
  const actionsDiv = document.createElement("div");
  actionsDiv.className = "modal-stats-actions";

  const backupBtn = document.createElement("button");
  backupBtn.id = "backup-db-btn";
  backupBtn.className = "btn btn-primary";
  backupBtn.innerHTML = `<i class="fas fa-download"></i> ${config.languageLabels?.backupDatabase || "Backup Database"}`;

  const restoreBtn = document.createElement("button");
  restoreBtn.id = "restore-db-btn";
  restoreBtn.className = "btn btn-warning";
  restoreBtn.innerHTML = `<i class="fas fa-upload"></i> ${config.languageLabels?.restoreDatabase || "Restore from Backup"}`;

  const restoreInput = document.createElement("input");
  restoreInput.type = "file";
  restoreInput.id = "restore-file-input";
  restoreInput.name = "restore-file-input";
  restoreInput.accept = ".json";
  restoreInput.style.display = "none";
  restoreInput.setAttribute("aria-label", config.languageLabels?.restoreDatabase || "Restore from Backup");

  const clearDbBtn = document.createElement("button");
  clearDbBtn.id = "clear-db-btn";
  clearDbBtn.className = "btn btn-danger";
  clearDbBtn.innerHTML = `<i class="fa-solid fa-trash"></i> ${config.languageLabels?.clearDatabase || "Clear Database"}`;

  actionsDiv.append(backupBtn, restoreBtn, restoreInput, clearDbBtn);
  modalBodyEl.appendChild(actionsDiv);
  modalContent.appendChild(closeRefreshContainer);
  modalContent.appendChild(title);
  modalContent.appendChild(loadingSpinnerEl);
  modalContent.appendChild(modalBodyEl);
  modalEl.appendChild(modalContent);
  document.body.appendChild(modalEl);

  detailedModalEl = document.createElement("div");
  detailedModalEl.id = "detailed-list-modal";
  detailedModalEl.className = "modal hidden";

  const detailedContent = document.createElement("div");
  detailedContent.className = "modal-content";

  const detailedCloseContainer = document.createElement("div");
  detailedCloseContainer.className = "modallist-close-container";

  detailedCloseBtn = document.createElement("span");
  detailedCloseBtn.className = "modal-close-btn";
  const detailedCloseIcon = document.createElement("i");
  detailedCloseIcon.className = "fa-solid fa-xmark";
  detailedCloseBtn.appendChild(detailedCloseIcon);
  detailedCloseContainer.appendChild(detailedCloseBtn);

  const detailedTitleContainer = document.createElement("div");
  detailedTitleContainer.className = "modallist-title-container";

  detailedTitleEl = document.createElement("h2");
  detailedTitleEl.id = "detailed-list-title";
  detailedTitleContainer.appendChild(detailedTitleEl);

  detailedContentEl = document.createElement("div");
  detailedContentEl.className = "detailed-list-container";
  detailedContentEl.id = "detailed-list-content";

  detailedContent.appendChild(detailedTitleContainer);
  detailedContent.appendChild(detailedCloseContainer);
  detailedContent.appendChild(detailedContentEl);
  detailedModalEl.appendChild(detailedContent);
  document.body.appendChild(detailedModalEl);

  clickBackdropHandler = (e) => {
    if (e.target === modalEl) hideStatsModal();
  };
  modalEl.addEventListener("click", clickBackdropHandler);

  clickBackdropDetailedHandler = (e) => {
    if (e.target === detailedModalEl) detailedModalEl.classList.add("hidden");
  };
  detailedModalEl.addEventListener("click", clickBackdropDetailedHandler);

  keydownHandler = (e) => {
    if (e.key === "Escape") {
      if (!detailedModalEl.classList.contains("hidden")) {
        detailedModalEl.classList.add("hidden");
      } else {
        hideStatsModal();
      }
    }
  };
  document.addEventListener("keydown", keydownHandler);

  closeBtn.addEventListener("click", hideStatsModal);
  detailedCloseBtn.addEventListener("click", () => detailedModalEl.classList.add("hidden"));
  refreshBtn.addEventListener("click", async () => {
    if (refreshInProgress) return;
    refreshInProgress = true;

    try {
      refreshIcon.classList.add("fa-spin");
      modalBodyEl.querySelectorAll(".stat-value").forEach((el) => (el.textContent = "..."));
      document.getElementById("stat-recent-updates").innerHTML = "";
      document.getElementById("stat-recent-deletes").innerHTML = "";

      cachedStats = null;
      lastUpdateTime = 0;

      await loadStatsIntoModal(true);
    } catch (error) {
      console.error("Error refreshing:", error);
      showNotification(
        `<i class="fas fa-sync-alt"></i> ${config.languageLabels?.refreshError || "Error refreshing list:"}`,
        3000,
        "error"
      );
    } finally {
      refreshIcon.classList.remove("fa-spin");
      refreshInProgress = false;
    }
  });

  fetchAllLyricsBtn.addEventListener("click", updateLyricsDatabase);
  cancelLyricsBtn.addEventListener("click", () => {
    if (!lyricsUpdateInProgress) return;
    lyricsCancelRequested = true;
    cancelLyricsBtn.disabled = true;
    cancelLyricsBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i>';
    showNotification(
      `<i class="fas fa-circle-pause"></i> ${config.languageLabels?.cancelling || "Cancelling..."}`,
      1500,
      'info'
    );
  });

  backupBtn.addEventListener("click", backupDatabase);
  restoreBtn.addEventListener("click", () => restoreInput.click());
  restoreInput.addEventListener("change", handleRestoreFile);
  clearDbBtn.addEventListener("click", clearDatabaseConfirmFlow);
  document.getElementById("show-all-updates").addEventListener("click", showAllUpdates);
  document.getElementById("show-all-deletes").addEventListener("click", showAllDeletes);
}

function showLyricsProgress(pct, message) {
  if (!lyricsProgressContainer) return;
  lyricsProgressContainer.style.display = 'flex';
  if (lyricsProgressFill) lyricsProgressFill.style.width = `${Math.max(0, Math.min(100, pct))}%`;
  if (lyricsProgressText) lyricsProgressText.textContent =
    message ? `${pct}% — ${message}` : `${pct}%`;
}

function hideLyricsProgress() {
  if (!lyricsProgressContainer) return;
  lyricsProgressContainer.style.display = 'none';
  if (lyricsProgressFill) lyricsProgressFill.style.width = '0%';
  if (lyricsProgressText) lyricsProgressText.textContent = '0%';
}

function hideStatsModal() {
  if (!modalEl) return;
  modalEl.classList.add("hidden");
  document.body.style.overflow = "";
}

function createStatSection(title, listId, buttonId, buttonText) {
  const section = document.createElement("div");
  section.className = "stat-section";

  const titleEl = document.createElement("h3");
  titleEl.className = "stat-section-title";
  titleEl.textContent = title;
  section.appendChild(titleEl);

  const listContainer = document.createElement("div");
  listContainer.className = "stat-list-container";

  const listEl = document.createElement("div");
  listEl.className = "stat-list";
  listEl.id = listId;
  listContainer.appendChild(listEl);

  const button = document.createElement("button");
  button.className = "stat-more-btn";
  button.id = buttonId;
  button.textContent = buttonText;
  listContainer.appendChild(button);

  section.appendChild(listContainer);
  return section;
}

async function loadStatsIntoModal(forceRefresh = false) {
  try {
    const now = Date.now();
    if (forceRefresh || !cachedStats || now - lastUpdateTime > CACHE_DURATION) {
      const [stats, recentlyDeleted, dbSize, lyricsCount] = await Promise.all([
        musicDB.getStats(),
        musicDB.getRecentlyDeleted(),
        getDatabaseSize(),
        musicDB.getLyricsCount(),
      ]);

      cachedStats = { ...stats, recentlyDeleted, dbSize, lyricsCount };
      lastUpdateTime = now;
    }

    modalBodyEl.querySelector("#stat-total-tracks .stat-value").textContent = cachedStats.totalTracks;
    modalBodyEl.querySelector("#stat-total-albums .stat-value").textContent = cachedStats.totalAlbums;
    modalBodyEl.querySelector("#stat-total-artists .stat-value").textContent = cachedStats.totalArtists;
    modalBodyEl.querySelector("#stat-db-size .stat-value").textContent = cachedStats.dbSize;
    modalBodyEl.querySelector("#stat-total-lyrics .stat-value").textContent = cachedStats.lyricsCount;

    await loadRecentItems(
      cachedStats.recentlyAdded,
      "stat-recent-updates",
      config.languageLabels?.recentlyAdded || "Son Eklenenler",
      formatTrackInfo
    );

    await loadRecentItems(
      cachedStats.recentlyDeleted.map((d) => d.trackData),
      "stat-recent-deletes",
      config.languageLabels?.recentDeletes || "Recently Deleted",
      (item, index) => {
        const deletedItem = cachedStats.recentlyDeleted[index];
        return formatTrackInfo({ ...item, DateCreated: deletedItem.deletedAt });
      }
    );
  } catch (error) {
    console.error("Error loading statistics:", error);
    showNotification(
      `<i class="fas fa-exclamation-circle"></i> ${config.languageLabels?.loadStatsError || "An error occurred while loading statistics"}`,
      3000,
      "error"
    );
  }
}

async function getDatabaseSize() {
  try {
    const [allTracks, stats, recentlyDeleted, allLyrics] = await Promise.all([
      musicDB.getAllTracks(),
      musicDB.getStats(),
      musicDB.getRecentlyDeleted(),
      musicDB.getAllLyrics(),
    ]);
    const jsonString = JSON.stringify({ tracks: allTracks, deletedTracks: recentlyDeleted, lyrics: allLyrics });
    const sizeInBytes = new TextEncoder().encode(jsonString).length;
    const sizeInMB = (sizeInBytes / (1024 * 1024)).toFixed(2);
    return `${sizeInMB} MB`;
  } catch (error) {
    console.error("Could not calculate database size:", error);
    return "? MB";
  }
}

async function loadRecentItems(items, containerId, _sectionTitle, formatter) {
  const container = document.getElementById(containerId);
  container.innerHTML = "";

  if (!items || items.length === 0) {
    container.innerHTML = `<div class="no-items">${config.languageLabels?.noData || "No data found"}</div>`;
    return;
  }

  const valid = items.filter((it) => !!it?.DateCreated);
  const visible = valid.slice(0, 5);
  visible.forEach((item, index) => {
    const div = document.createElement("div");
    div.className = "detailed-list-item";
    div.innerHTML = formatter(item, index);
    container.appendChild(div);
  });
}

function formatTrackInfo(track, _index) {
  let displayDate = config.languageLabels?.unknownDate || "Bilinmeyen Tarih";
  try {
    if (track?.DateCreated) {
      const date = new Date(track.DateCreated);
      if (!isNaN(date)) {
        displayDate = date.toLocaleString(config.dateLocale, {
          day: "2-digit",
          month: "2-digit",
          year: "numeric",
          hour: "2-digit",
          minute: "2-digit",
          second: "2-digit",
        });
      }
    }
  } catch {
    try {
      displayDate = new Date(track.DateCreated).toISOString().slice(0, 19).replace("T", " ");
    } catch {}
  }

  const artists = Array.isArray(track?.Artists)
    ? track.Artists.join(", ")
    : track?.AlbumArtist || config.languageLabels?.artistUnknown || "Unknown Artist";

  return `
    <div class="track-info">
      <div class="track-name">${track?.Name || config.languageLabels?.unknownTrack || "Unknown Track"}</div>
      <div class="track-artist">${artists}</div>
      <div class="track-date">${displayDate}</div>
    </div>
  `;
}

async function backupDatabase() {
  const backupBtn = document.getElementById("backup-db-btn");
  const original = backupBtn.innerHTML;
  backupBtn.innerHTML = `<i class="fas fa-spinner fa-spin"></i> ${config.languageLabels?.backupInProgress || "Backing up..."}`;
  backupBtn.disabled = true;

  try {
    const [allTracks, stats, recentlyDeleted, allLyrics] = await Promise.all([
      musicDB.getAllTracks(),
      musicDB.getStats(),
      musicDB.getRecentlyDeleted(),
      musicDB.getAllLyrics(),
    ]);

    const backupData = {
      metadata: {
        version: 1,
        createdAt: new Date().toISOString(),
        totalTracks: stats.totalTracks,
        totalAlbums: stats.totalAlbums,
        totalArtists: stats.totalArtists,
        totalLyrics: allLyrics.length,
      },
      tracks: allTracks,
      deletedTracks: recentlyDeleted,
      lyrics: allLyrics,
    };

    const blob = new Blob([JSON.stringify(backupData, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);

    const a = document.createElement("a");
    a.href = url;
    a.download = `GMMP-backup-${new Date().toISOString().slice(0, 10)}.json`;
    document.body.appendChild(a);
    a.click();

    setTimeout(() => {
      try { document.body.removeChild(a); } catch {}
      URL.revokeObjectURL(url);
      showNotification(
        `<i class="fas fa-check-circle"></i> ${config.languageLabels?.backupSuccess || "Database backed up successfully"}`,
        3000,
        "db"
      );
    }, 100);
  } catch (error) {
    console.error("Backup error:", error);
    showNotification(
      `<i class="fas fa-exclamation-circle"></i> ${config.languageLabels?.backupError || "An error occurred during backup"}`,
      3000,
      "error"
    );
  } finally {
    backupBtn.innerHTML = original;
    backupBtn.disabled = false;
  }
}

async function handleRestoreFile(event) {
  const file = event.target.files?.[0];
  if (!file) return;

  const confirmed =
    confirm(
      config.languageLabels?.confirmRestore ||
        "Are you sure you want to restore the database from backup? Existing data will be overwritten!"
    ) === true;

  if (!confirmed) {
    event.target.value = "";
    return;
  }

  const restoreBtn = document.getElementById("restore-db-btn");
  const originalRestoreText = restoreBtn.innerHTML;
  restoreBtn.innerHTML = `<i class="fas fa-spinner fa-spin"></i> ${config.languageLabels?.restoreInProgress || "Restoring..."}`;
  restoreBtn.disabled = true;

  const progressContainer = document.createElement("div");
  progressContainer.className = "restore-progress-container";
  progressContainer.innerHTML = `
    <div class="restore-progress-bar">
      <div class="restore-progress-fill"></div>
    </div>
    <div class="restore-progress-text">0%</div>
  `;
  modalBodyEl.appendChild(progressContainer);

  const updateProgress = (percentage, message) => {
    const fill = progressContainer.querySelector(".restore-progress-fill");
    const text = progressContainer.querySelector(".restore-progress-text");
    fill.style.width = `${percentage}%`;
    text.textContent = message || `${percentage}%`;
  };

  try {
    const fileContent = await readFileAsText(file);
    const backupData = JSON.parse(fileContent);

    if (!backupData.tracks || !Array.isArray(backupData.tracks)) {
      throw new Error(config.languageLabels?.invalidBackupFile || "Invalid backup file");
    }

    showNotification(
      `<i class="fas fa-database"></i> ${config.languageLabels?.restoreStarted || "Restore started..."}`,
      3000,
      "db"
    );

    await musicDB.deleteAllTracks();
    updateProgress(20, config.languageLabels?.cleaningDatabase || "Cleaning database...");

    const totalBatches = Math.ceil(backupData.tracks.length / BATCH_SIZE);
    for (let i = 0; i < totalBatches; i++) {
      const start = i * BATCH_SIZE;
      const end = Math.min(start + BATCH_SIZE, backupData.tracks.length);
      const batch = backupData.tracks.slice(start, end);
      await musicDB.saveTracksInBatches(batch, BATCH_SIZE);

      const progress = 20 + Math.floor((i / totalBatches) * 60);
      updateProgress(
        progress,
        `${config.languageLabels?.restoringTracks || "Restoring tracks"} (${end}/${backupData.tracks.length})`
      );
    }

    updateProgress(80, config.languageLabels?.restoringDeletedItems || "Restoring deleted items...");
    await musicDB.replaceDeletedTracks?.(
      Array.isArray(backupData.deletedTracks) ? backupData.deletedTracks : []
    );

    updateProgress(95, config.languageLabels?.restoringLyrics || "Reloading lyrics...");
    await musicDB.replaceLyrics?.(
      Array.isArray(backupData.lyrics) ? backupData.lyrics : []
    );

    updateProgress(100, config.languageLabels?.restoreComplete || "Restore complete!");
    showNotification(
      `<i class="fas fa-check-circle"></i> ${config.languageLabels?.restoreSuccess || "Database restored successfully"}`,
      3000,
      "db"
    );
    await loadStatsIntoModal(true);
  } catch (error) {
    console.error("Restore error:", error);
    showNotification(
      `<i class="fas fa-exclamation-circle"></i> ${config.languageLabels?.restoreError || "An error occurred during restore"} ${error.message}`,
      5000,
      "error"
    );
  } finally {
    restoreBtn.innerHTML = originalRestoreText;
    restoreBtn.disabled = false;
    try { progressContainer.remove(); } catch {}
    event.target.value = "";
  }
}

function readFileAsText(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => resolve(e.target.result);
    reader.onerror = (err) => reject(err);
    reader.readAsText(file);
  });
}

async function clearDatabaseConfirmFlow() {
  const confirmed =
    confirm(
      config.languageLabels?.confirmClearDatabase ||
        "Are you sure you want to clear the entire database? This action cannot be undone!"
    ) === true;

  if (!confirmed) return;

  try {
    await musicDB.clearAll?.();

    showNotification(
      `<i class="fas fa-check-circle"></i> ${config.languageLabels?.databaseCleared || "Database cleared successfully"}`,
      3000,
      "db"
    );

    cachedStats = null;
    await loadStatsIntoModal(true);
  } catch (error) {
    console.error("Error clearing database:", error);
    showNotification(
      `<i class="fas fa-exclamation-circle"></i> ${config.languageLabels?.clearDatabaseError || "An error occurred while clearing the database"}`,
      3000,
      "error"
    );
  }
}

async function showAllUpdates() {
  const btn = document.getElementById("show-all-updates");
  const original = btn.innerHTML;
  btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i>';
  btn.disabled = true;

  try {
    const stats = await musicDB.getStats();
    toggleDetailedModal(
      config.languageLabels?.allUpdatedTracks || "All Recently Updated Tracks",
      stats.recentlyAdded,
      formatTrackInfo
    );
  } catch (error) {
    console.error("Error loading additions:", error);
    showNotification(
      `<i class="fas fa-exclamation-circle"></i> ${config.languageLabels?.loadStatsError || "An error occurred while loading statistics"}`,
      3000,
      "error"
    );
  } finally {
    btn.innerHTML = original;
    btn.disabled = false;
  }
}

async function showAllDeletes() {
  const btn = document.getElementById("show-all-deletes");
  const original = btn.innerHTML;
  btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i>';
  btn.disabled = true;

  try {
    const recentlyDeleted = await musicDB.getRecentlyDeleted();
    const items = recentlyDeleted.map((d) => ({ ...d.trackData, DateCreated: d.deletedAt }));
    toggleDetailedModal(
      config.languageLabels?.allDeletedTracks || "All Recently Deleted Tracks",
      items,
      formatTrackInfo
    );
  } catch (error) {
    console.error("Error loading deleted items:", error);
    showNotification(
      `<i class="fas fa-exclamation-circle"></i> ${config.languageLabels?.loadStatsError || "An error occurred while loading statistics"}`,
      3000,
      "error"
    );
  } finally {
    btn.innerHTML = original;
    btn.disabled = false;
  }
}

function toggleDetailedModal(title, items, formatter) {
  const isOpen = !detailedModalEl.classList.contains("hidden");
  if (isOpen) {
    detailedModalEl.classList.add("hidden");
    return;
  }
  detailedTitleEl.textContent = title;
  detailedContentEl.innerHTML = "";
  items.forEach((item, index) => {
    const d = document.createElement("div");
    d.className = "detailed-list-item";
    d.innerHTML = formatter(item, index);
    detailedContentEl.appendChild(d);
  });
  detailedModalEl.classList.remove("hidden");
}

async function migrateDateCreated() {
  try {
    const tracks = await musicDB.getAllTracks();
    const toUpdate = tracks.filter((t) => !t.DateCreated);
    if (toUpdate.length > 0) {
      toUpdate.forEach((t) => {
        t.DateCreated = t.LastUpdated || new Date().toISOString();
      });
      await musicDB.saveTracksInBatches(toUpdate);
      console.log(`Updated ${toUpdate.length} records`);
    }
  } catch (error) {
    console.error("Migration error:", error);
  }
}
