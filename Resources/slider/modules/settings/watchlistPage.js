import { bindCheckboxKontrol, createCheckbox, createSection } from "./shared.js";

export function createWatchlistPanel(config, labels) {
    const panel = document.createElement("div");
    panel.id = "watchlist-settings-panel";
    panel.className = "settings-panel";

    const section = createSection(labels.watchlistSettingsTab || "Watchlist Settings");

    section.appendChild(
        createCheckbox(
            "watchlistTabsSliderEnabled",
            labels.watchlistTabsSliderEnabled || "Add watchlist button into .emby-tabs-slider",
            config.watchlistTabsSliderEnabled
        )
    );

    const sharingCheckbox = createCheckbox(
        "watchlistSharingEnabled",
        labels.watchlistSharingEnabled || "Enable watchlist sharing",
        config.watchlistSharingEnabled !== false
    );
    sharingCheckbox.classList.add("watchlist-sharing-container");

    const sharingDescription = document.createElement("div");
    sharingDescription.className = "description-text";
    sharingDescription.textContent = labels.watchlistSharingEnabledDescription
        || "When disabled, sharing buttons in watchlist and details modal are hidden; the user picker does not open.";

    const sharingWrapper = document.createElement("div");
    sharingWrapper.className = "watchlist-sharing-wrapper";
    sharingWrapper.appendChild(sharingCheckbox);
    sharingWrapper.appendChild(sharingDescription);
    section.appendChild(sharingWrapper);

    section.appendChild(
        createCheckbox(
            "watchlistAutoRemovePlayed",
            labels.watchlistAutoRemovePlayed || "Automatically remove watched items from watchlist",
            config.watchlistAutoRemovePlayed
        )
    );

    const autoRemoveFavoriteCheckbox = createCheckbox(
        "watchlistAutoRemovePlayedFromFavorites",
        labels.watchlistAutoRemovePlayedFromFavorites || "Also remove from Jellyfin favorites during auto-removal",
        config.watchlistAutoRemovePlayedFromFavorites
    );
    autoRemoveFavoriteCheckbox.classList.add("watchlist-auto-remove-favorite-container");
    section.appendChild(autoRemoveFavoriteCheckbox);

    const importFavoritesCheckbox = createCheckbox(
        "watchlistImportFavoritesOnStartup",
        labels.watchlistImportFavoritesOnStartup || "Import existing Jellyfin favorites to watchlist on startup",
        config.watchlistImportFavoritesOnStartup
    );

    importFavoritesCheckbox.classList.add("watchlist-import-favorites-container");

    const importFavoritesDescription = document.createElement("div");
    importFavoritesDescription.className = "description-text";
    importFavoritesDescription.textContent = labels.watchlistImportFavoritesOnStartupDescription
        || "Enable during initial setup or when you want to import favorites. It can be disabled after import completes.";

    const importFavoritesWrapper = document.createElement("div");
    importFavoritesWrapper.className = "watchlist-import-wrapper";

    importFavoritesWrapper.appendChild(importFavoritesCheckbox);
    importFavoritesWrapper.appendChild(importFavoritesDescription);

    section.appendChild(importFavoritesWrapper);

    bindCheckboxKontrol("#watchlistAutoRemovePlayed", ".watchlist-auto-remove-favorite-container", 0.6);

    bindCheckboxKontrol(
        "#watchlistImportFavoritesOnStartup",
        ".watchlist-import-wrapper .description-text",
        0.5
    );

    panel.appendChild(section);
    return panel;
}
