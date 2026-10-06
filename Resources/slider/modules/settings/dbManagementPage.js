import { createSection } from "./shared.js";
import { showNotification } from "../player/ui/notification.js";
import { getSessionInfo } from "../../../Plugins/JMSFusionV2/runtime/api.js";

const API_BASE = "/Plugins/JMSFusionV2/ScopedCache";
const BACKUP_FORMAT = "jms-scoped-cache-backup";
const BACKUP_FILE_VERSION = 1;
const SCOPED_CACHE_ROOT_HINT = "/plugins/configurations/JMSFusionV2/scoped-cache";

function setStatus(node, message) {
  node.textContent = message || "";
  node.style.display = message ? "block" : "none";
}

function formatLabel(template, values = {}) {
  return String(template || "").replace(/\{(\w+)\}/g, (_, key) => {
    const value = values[key];
    return value == null ? "" : String(value);
  });
}

function readFileAsText(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (event) => resolve(String(event?.target?.result || ""));
    reader.onerror = () => reject(reader.error || new Error("Could not read file."));
    reader.readAsText(file);
  });
}

function sanitizeFileNamePart(value) {
  const normalized = String(value || "")
    .trim()
    .replace(/[^a-z0-9._-]+/gi, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");

  return normalized || "cache";
}

function buildBackupFileName(entry, exportedAt) {
  const timestamp = String(exportedAt || new Date().toISOString())
    .replace(/\.\d+Z$/, "Z")
    .replace(/:/g, "-");

  return `${sanitizeFileNamePart(entry?.cacheType || entry?.key)}-backup-${timestamp}.json`;
}

function downloadJsonFile(filename, payload) {
  const blob = new Blob([JSON.stringify(payload, null, 2)], {
    type: "application/json"
  });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  anchor.style.display = "none";

  document.body.appendChild(anchor);
  anchor.click();

  setTimeout(() => {
    try {
      document.body.removeChild(anchor);
    } catch {}
    URL.revokeObjectURL(url);
  }, 100);
}

function safeStorageGet(storage, key) {
  try {
    return String(storage?.getItem?.(key) || "").trim();
  } catch {
    return "";
  }
}

function pickFirstString(...values) {
  for (const value of values) {
    const out = String(value || "").trim();
    if (out) return out;
  }
  return "";
}

function resolveScopedCacheScope() {
  let session = null;
  try {
    session = typeof getSessionInfo === "function" ? getSessionInfo() : null;
  } catch {
    session = null;
  }

  const serverId = pickFirstString(
    session?.serverId,
    safeStorageGet(globalThis.localStorage, "persist_server_id"),
    safeStorageGet(globalThis.localStorage, "serverId"),
    safeStorageGet(globalThis.sessionStorage, "serverId"),
    "global"
  );

  const userId = pickFirstString(
    session?.userId,
    safeStorageGet(globalThis.localStorage, "persist_user_id"),
    safeStorageGet(globalThis.localStorage, "jf_userId"),
    safeStorageGet(globalThis.localStorage, "userId"),
    "anon"
  );

  return `${serverId}|${userId}`;
}

function buildUrl(cacheType, scope) {
  return `${API_BASE}/${encodeURIComponent(String(cacheType || "").trim())}/${encodeURIComponent(String(scope || "").trim())}?ts=${Date.now()}`;
}

async function readScopedCache(cacheType, scope) {
  const response = await fetch(buildUrl(cacheType, scope), {
    method: "GET",
    cache: "no-store",
    credentials: "same-origin",
    headers: { Accept: "application/json" }
  });

  if (!response.ok) {
    const raw = await response.text().catch(() => "");
    throw new Error(raw || `${cacheType} cache read failed (${response.status})`);
  }

  const payload = await response.json().catch(() => ({}));
  return payload && typeof payload === "object" && !Array.isArray(payload) ? payload : {};
}

async function writeScopedCache(cacheType, scope, payload) {
  const response = await fetch(buildUrl(cacheType, scope), {
    method: "POST",
    cache: "no-store",
    credentials: "same-origin",
    headers: {
      Accept: "application/json",
      "Content-Type": "application/json"
    },
    body: JSON.stringify(payload && typeof payload === "object" && !Array.isArray(payload) ? payload : {})
  });

  if (!response.ok) {
    const raw = await response.text().catch(() => "");
    throw new Error(raw || `${cacheType} cache write failed (${response.status})`);
  }

  return response.json().catch(() => ({}));
}

async function deleteScopedCache(cacheType, scope) {
  const response = await fetch(buildUrl(cacheType, scope), {
    method: "DELETE",
    cache: "no-store",
    credentials: "same-origin",
    headers: { Accept: "application/json" }
  });

  if (!response.ok) {
    const raw = await response.text().catch(() => "");
    throw new Error(raw || `${cacheType} cache delete failed (${response.status})`);
  }

  return response.json().catch(() => ({}));
}

function countRecordsInValue(value) {
  if (Array.isArray(value)) return value.length;
  if (value && typeof value === "object") return Object.keys(value).length;
  return value == null ? 0 : 1;
}

function countTopLevelSections(payload) {
  if (!payload || typeof payload !== "object" || Array.isArray(payload)) return 0;
  return Object.keys(payload).filter((key) => key !== "meta" && key !== "metadata").length;
}

function countCacheRecords(payload) {
  if (!payload || typeof payload !== "object" || Array.isArray(payload)) return 0;
  return Object.entries(payload).reduce((total, [key, value]) => {
    if (key === "meta" || key === "metadata") return total;
    return total + countRecordsInValue(value);
  }, 0);
}

function getPayloadSizeBytes(payload) {
  try {
    return new TextEncoder().encode(JSON.stringify(payload || {})).length;
  } catch {
    return 0;
  }
}

function mapArrayByKey(records, keyName) {
  const out = {};
  for (const record of Array.isArray(records) ? records : []) {
    const key = String(record?.[keyName] || "").trim();
    if (key) out[key] = record;
  }
  return out;
}

function convertLegacyGmmpBackup(rawBackup) {
  if (!rawBackup || typeof rawBackup !== "object" || !Array.isArray(rawBackup.tracks)) {
    return null;
  }

  return {
    tracks: mapArrayByKey(rawBackup.tracks, "Id"),
    deletedTracks: Array.isArray(rawBackup.deletedTracks) ? rawBackup.deletedTracks : [],
    lyrics: mapArrayByKey(rawBackup.lyrics, "trackId"),
    meta: {
      restoredFromLegacyGmmpBackupAt: new Date().toISOString(),
      legacyCreatedAt: rawBackup?.metadata?.createdAt || null
    }
  };
}

function normalizeRestorePayload(rawBackup, entry, labels) {
  if (rawBackup?.format === BACKUP_FORMAT) {
    const cacheType = String(rawBackup?.cacheType || "").trim();
    if (cacheType && cacheType !== entry.cacheType) {
      throw new Error(
        formatLabel(
          labels?.dbRestoreWrongDatabase ||
            "The selected backup does not belong to the {name} cache area.",
          { name: entry.title }
        )
      );
    }

    const data = rawBackup?.data;
    if (!data || typeof data !== "object" || Array.isArray(data)) {
      throw new Error(labels?.dbRestoreInvalidFile || "Invalid cache backup file.");
    }

    return data;
  }

  if (entry.cacheType === "gmmpMusic") {
    const converted = convertLegacyGmmpBackup(rawBackup);
    if (converted) return converted;
  }

  if (rawBackup && typeof rawBackup === "object" && !Array.isArray(rawBackup)) {
    return rawBackup;
  }

  throw new Error(labels?.dbRestoreInvalidFile || "Invalid cache backup file.");
}

function buildScopedCacheBackup(entry, scope, data) {
  const exportedAt = new Date().toISOString();
  return {
    format: BACKUP_FORMAT,
    backupVersion: BACKUP_FILE_VERSION,
    exportedAt,
    cacheType: entry.cacheType,
    cacheKey: entry.key,
    title: entry.title,
    scope,
    data,
    metadata: {
      sectionCount: countTopLevelSections(data),
      recordCount: countCacheRecords(data),
      sizeBytes: getPayloadSizeBytes(data),
      storageRoot: `${SCOPED_CACHE_ROOT_HINT}/${entry.cacheType}`
    }
  };
}

function getCacheEntries(labels) {
  return [
    {
      key: "slider-cache",
      cacheType: "sliderCache",
      title: labels?.sliderCacheDbTitle || "Slider general cache",
      description:
        labels?.sliderCacheDbDescription ||
        "General slider item details, query results, and short-lived API cache entries are stored here.",
      prepare: async () => {
        const mod = await import("../sliderCache.js");
        await mod.prepareSliderCacheDbForDeletion?.();
      }
    },
    {
      key: "recent-rows",
      cacheType: "recentRows",
      title: labels?.recentRowsDbTitle || "Recently added and continue cards cache",
      description:
        labels?.recentRowsDbDescription ||
        "Cache data used for recently added rows, latest episodes, music rows, and continue watching cards is stored here.",
      prepare: async () => {
        const mod = await import("../recentRowsDb.js");
        await mod.prepareRecentRowsDbForDeletion?.();
      }
    },
    {
      key: "director-rows",
      cacheType: "directorRows",
      title: labels?.directorRowsDbTitle || "Director cards cache",
      description:
        labels?.directorRowsDbDescription ||
        "Director collection row data and content matching data used in director collection rows is stored here.",
      prepare: async () => {
        const mod = await import("../dirRowsDb.js");
        await mod.prepareDirRowsDbForDeletion?.();
      }
    },
    {
      key: "personal-recommendations",
      cacheType: "personalRecommendations",
      title: labels?.personalRecommendationsDbTitle || "Personal recommendations cache",
      description:
        labels?.personalRecommendationsDbDescription ||
        "Cache data used by personalized recommendation rows such as \"Recommended for You\" is stored here.",
      prepare: async () => {
        const mod = await import("../prcDb.js");
        await mod.preparePrcDbForDeletion?.();
      }
    },
    {
      key: "collection-cache",
      cacheType: "collectionCache",
      title: labels?.collectionCacheDbTitle || "Collection cards cache",
      description:
        labels?.collectionCacheDbDescription ||
        "Cache data for boxset and collection cards, along with the item lists inside those collections, is stored here.",
      prepare: async () => {
        const mod = await import("../collectionCacheDb.js");
        await mod.prepareCollectionCacheDbForDeletion?.();
      }
    },
    {
      key: "gmmp-music",
      cacheType: "gmmpMusic",
      title: labels?.gmmpMusicDbTitle || "GMMP music cache",
      description:
        labels?.gmmpMusicDbDescription ||
        "The GMMP track library, deleted track history, and lyrics are stored in this JSON cache.",
      prepare: async () => {
        const mod = await import("../player/utils/db.js");
        await mod.prepareMusicDbForDeletion?.();
      }
    }
  ];
}

function createCacheAction(entry, labels, scope) {
  const row = document.createElement("div");
  row.className = "db-management-item";

  const info = document.createElement("div");
  info.className = "db-management-item-info";

  const title = document.createElement("div");
  title.style.fontWeight = "600";
  title.textContent = entry.title;

  const description = document.createElement("div");
  description.className = "description-text";
  description.style.marginTop = "4px";
  description.textContent = entry.description;

  const cacheName = document.createElement("div");
  cacheName.className = "description-text2";
  cacheName.style.marginTop = "4px";
  cacheName.textContent = `Cache: ${entry.cacheType}`;

  const scopeName = document.createElement("div");
  scopeName.className = "description-text2";
  scopeName.style.marginTop = "2px";
  scopeName.textContent = `Scope: ${scope}`;

  const status = document.createElement("div");
  status.className = "description-text2";
  status.style.marginTop = "6px";
  status.style.display = "none";

  const actions = document.createElement("div");
  actions.className = "db-management-item-actions";

  const backupButton = document.createElement("button");
  backupButton.type = "button";
  backupButton.className = "db-management-item-button";
  backupButton.style.whiteSpace = "nowrap";

  const restoreButton = document.createElement("button");
  restoreButton.type = "button";
  restoreButton.className = "db-management-item-button";
  restoreButton.style.whiteSpace = "nowrap";

  const deleteButton = document.createElement("button");
  deleteButton.type = "button";
  deleteButton.className = "db-management-item-button";
  deleteButton.style.whiteSpace = "nowrap";

  const restoreInput = document.createElement("input");
  restoreInput.type = "file";
  restoreInput.accept = ".json,application/json";
  restoreInput.style.display = "none";

  function resetButtonLabels() {
    backupButton.textContent = labels?.dbBackupButton || labels?.backupDatabase || "Download Backup";
    restoreButton.textContent = labels?.dbRestoreButton || labels?.restoreDatabase || "Restore Backup";
    deleteButton.textContent = labels?.dbDeleteButton || "Delete Cache File";
  }

  function setRowBusy(active) {
    row.dataset.busy = active ? "1" : "0";
    backupButton.disabled = active;
    restoreButton.disabled = active;
    deleteButton.disabled = active;
    restoreInput.disabled = active;
  }

  async function runRowAction(button, busyLabel, action) {
    if (row.dataset.busy === "1") return;

    setRowBusy(true);
    resetButtonLabels();
    button.textContent = busyLabel;

    try {
      await action();
    } finally {
      setRowBusy(false);
      resetButtonLabels();
    }
  }

  backupButton.addEventListener("click", async () => {
    await runRowAction(
      backupButton,
      labels?.dbBackingUpButton || labels?.backupInProgress || "Downloading...",
      async () => {
        setStatus(status, labels?.dbBackupInProgress || "Preparing cache backup...");

        try {
          const payload = await readScopedCache(entry.cacheType, scope);
          const backup = buildScopedCacheBackup(entry, scope, payload);
          downloadJsonFile(buildBackupFileName(entry, backup.exportedAt), backup);

          const successText =
            formatLabel(
              labels?.dbBackupSuccessMessage ||
                "Backup downloaded. Exported {storeCount} sections and {recordCount} records.",
              {
                storeCount: backup.metadata.sectionCount,
                recordCount: backup.metadata.recordCount
              }
            );

          setStatus(status, successText);
          showNotification(
            `<i class="fas fa-download" style="margin-right: 8px;"></i> ${successText}`,
            3200,
            "success"
          );
        } catch (error) {
          const errorText =
            String(error?.message || "").trim() ||
            labels?.dbBackupFailed ||
            "The cache could not be backed up.";

          setStatus(status, errorText);
          showNotification(
            `<i class="fas fa-triangle-exclamation" style="margin-right: 8px;"></i> ${errorText}`,
            4200,
            "error"
          );
        }
      }
    );
  });

  restoreButton.addEventListener("click", () => {
    if (row.dataset.busy === "1") return;
    restoreInput.click();
  });

  restoreInput.addEventListener("change", async (event) => {
    const file = event.target?.files?.[0];
    if (!file) return;

    const confirmMessage = [
      formatLabel(
        labels?.dbRestoreConfirmQuestion ||
          "Do you want to restore the {name} cache area from the selected backup?",
        { name: entry.title }
      ),
      `Cache: ${entry.cacheType}`,
      `Scope: ${scope}`,
      labels?.dbRestoreConfirmOverwriteNote ||
        "The current JSON cache file will be replaced with the backup contents."
    ].join("\n\n");

    const confirmed = window.confirm(confirmMessage);
    if (!confirmed) {
      event.target.value = "";
      return;
    }

    await runRowAction(
      restoreButton,
      labels?.dbRestoringButton || "Uploading...",
      async () => {
        try {
          const fileContent = await readFileAsText(file);
          const rawBackup = JSON.parse(fileContent);
          const payload = normalizeRestorePayload(rawBackup, entry, labels);

          setStatus(
            status,
            labels?.dbRestorePrepareInProgress ||
              "Closing cache connections and preparing for restore..."
          );

          await entry.prepare?.();
          await writeScopedCache(entry.cacheType, scope, payload);

          const successText =
            formatLabel(
              labels?.dbRestoreSuccessMessage ||
                "Restore completed. Imported {storeCount} sections and {recordCount} records.",
              {
                storeCount: countTopLevelSections(payload),
                recordCount: countCacheRecords(payload)
              }
            );

          setStatus(status, successText);
          showNotification(
            `<i class="fas fa-upload" style="margin-right: 8px;"></i> ${successText}`,
            3400,
            "success"
          );
        } catch (error) {
          const errorText =
            String(error?.message || "").trim() ||
            labels?.dbRestoreFailed ||
            "The cache could not be restored.";

          setStatus(status, errorText);
          showNotification(
            `<i class="fas fa-triangle-exclamation" style="margin-right: 8px;"></i> ${errorText}`,
            5000,
            "error"
          );
        } finally {
          event.target.value = "";
        }
      }
    );
  });

  deleteButton.addEventListener("click", async () => {
    const confirmMessage = [
      formatLabel(
        labels?.dbDeleteConfirmQuestion || "Do you want to delete the {name} cache file?",
        { name: entry.title }
      ),
      `Cache: ${entry.cacheType}`,
      `Scope: ${scope}`,
      labels?.dbDeleteConfirmRecreateNote || "This data will be recreated automatically when needed."
    ].join("\n\n");

    const confirmed = window.confirm(confirmMessage);
    if (!confirmed) return;

    await runRowAction(
      deleteButton,
      labels?.dbDeletingButton || "Deleting...",
      async () => {
        setStatus(
          status,
          labels?.dbDeleteInProgress || "Closing cache connections and deleting the JSON file..."
        );

        try {
          await entry.prepare?.();
          await deleteScopedCache(entry.cacheType, scope);

          const successText =
            labels?.dbDeleteSuccessMessage ||
            "Deletion completed. The related module will recreate this cache file automatically when needed.";
          setStatus(status, successText);

          showNotification(
            `<i class="fas fa-database" style="margin-right: 8px;"></i> ${entry.title} deleted.`,
            3000,
            "success"
          );
        } catch (error) {
          const errorText =
            String(error?.message || "").trim() ||
            labels?.dbDeleteFailed ||
            "The cache could not be deleted.";

          setStatus(status, errorText);
          showNotification(
            `<i class="fas fa-triangle-exclamation" style="margin-right: 8px;"></i> ${errorText}`,
            4200,
            "error"
          );
        }
      }
    );
  });

  resetButtonLabels();

  info.append(title, description, cacheName, scopeName, status);
  actions.append(backupButton, restoreButton, deleteButton, restoreInput);
  row.append(info, actions);
  return row;
}

export function createDbManagementPanel(config, labels) {
  const panel = document.createElement("div");
  panel.id = "db-management-panel";
  panel.className = "settings-panel";

  const scope = resolveScopedCacheScope();
  const introSection = createSection(labels?.dbManagementTab || "DB Management");

  const introText = document.createElement("div");
  introText.className = "description-text";
  introText.textContent =
    labels?.dbManagementDescription ||
    "From here you can back up, restore, or delete the scoped JSON cache files stored on the server.";

  const blockedHint = document.createElement("div");
  blockedHint.className = "description-text2";
  blockedHint.style.marginTop = "8px";
  blockedHint.textContent =
    labels?.dbManagementBlockedHint ||
    `Files under ${SCOPED_CACHE_ROOT_HINT} are managed within the active server and user scope.`;

  introSection.append(introText, blockedHint);

  const listSection = createSection(labels?.dbManagementListTitle || "Manageable Cache Files");
  getCacheEntries(labels).forEach((entry) => {
    listSection.appendChild(createCacheAction(entry, labels, scope));
  });

  panel.append(introSection, listSection);
  return panel;
}
