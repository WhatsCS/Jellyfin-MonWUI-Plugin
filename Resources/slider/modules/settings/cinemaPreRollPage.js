import { bindCheckboxKontrol, createCheckbox, createSection } from "./shared.js";

const DEFAULT_TRAILER_COUNT = 2;
const MAX_TRAILER_COUNT = 5;
const CINEMA_PREROLL_LANGUAGE_OPTIONS = Object.freeze([
  { value: "auto", label: "🌐 Auto" },
  { value: "tr-TR", label: "🇹🇷 Turkish" },
  { value: "en-US", label: "🇺🇸 English (US)" },
  { value: "en-GB", label: "🇬🇧 English (UK)" },
  { value: "de-DE", label: "🇩🇪 Deutsch" },
  { value: "fr-FR", label: "🇫🇷 Français" },
  { value: "es-ES", label: "🇪🇸 Español" },
  { value: "it-IT", label: "🇮🇹 Italiano" },
  { value: "ru-RU", label: "🇷🇺 Русский" },
  { value: "ja-JP", label: "🇯🇵 日本語" },
  { value: "zh-CN", label: "🇨🇳 简体中文" },
  { value: "pt-PT", label: "🇵🇹 Português (Portugal)" },
  { value: "pt-BR", label: "🇧🇷 Português (Brasil)" },
  { value: "nl-NL", label: "🇳🇱 Nederlands" },
  { value: "sv-SE", label: "🇸🇪 Svenska" },
  { value: "pl-PL", label: "🇵🇱 Polski" },
  { value: "uk-UA", label: "🇺🇦 Українська" },
  { value: "ko-KR", label: "🇰🇷 한국어" },
  { value: "ar-SA", label: "🇸🇦 العربية" },
  { value: "hi-IN", label: "🇮🇳 हिन्दी" },
  { value: "fa-IR", label: "🇮🇷 فارسی" }
]);
const CINEMA_PREROLL_REGION_OPTIONS = Object.freeze([
  { value: "TR", label: "Turkey (TR)" },
  { value: "US", label: "United States (US)" },
  { value: "GB", label: "United Kingdom (GB)" },
  { value: "DE", label: "Germany (DE)" },
  { value: "FR", label: "France (FR)" },
  { value: "ES", label: "Spain (ES)" },
  { value: "IT", label: "Italy (IT)" },
  { value: "RU", label: "Russia (RU)" },
  { value: "JP", label: "Japan (JP)" },
  { value: "KR", label: "South Korea (KR)" },
  { value: "CN", label: "China (CN)" },
  { value: "IN", label: "India (IN)" },
  { value: "BR", label: "Brazil (BR)" },
  { value: "PT", label: "Portugal (PT)" },
  { value: "NL", label: "Netherlands (NL)" },
  { value: "SE", label: "Sweden (SE)" },
  { value: "PL", label: "Poland (PL)" },
  { value: "UA", label: "Ukraine (UA)" },
  { value: "MX", label: "Mexico (MX)" },
  { value: "CA", label: "Canada (CA)" },
  { value: "AU", label: "Australia (AU)" }
]);

function normalizeTrailerCount(value) {
  const parsed = Number.parseInt(String(value ?? ""), 10);
  if (!Number.isFinite(parsed)) return DEFAULT_TRAILER_COUNT;
  return Math.min(MAX_TRAILER_COUNT, Math.max(1, parsed));
}

function normalizeRegionMode(value) {
  const mode = String(value || "").trim().toLowerCase();
  if (mode === "global") return "global";
  return "custom";
}

function normalizeFallbackMode(value) {
  const mode = String(value || "").trim().toLowerCase();
  if (mode === "none" || mode === "global") return mode;
  return "custom";
}

function normalizeCustomRegion(value) {
  const region = String(value || "")
    .trim()
    .toUpperCase()
    .replace(/[^A-Z]/g, "")
    .slice(0, 2);
  return region.length === 2 ? region : "";
}

function normalizeLanguageSetting(value) {
  const raw = String(value || "").trim();
  if (!raw) return "auto";
  if (raw.toLowerCase() === "auto") return "auto";
  const exact = CINEMA_PREROLL_LANGUAGE_OPTIONS.find((entry) => entry.value === raw);
  if (exact) return exact.value;
  return "auto";
}

function inferRegionFromConfig(config = {}) {
  const languageSetting = normalizeLanguageSetting(config?.cinemaPreRollLanguage);
  const fallbackLanguage = (
    typeof navigator !== "undefined" && navigator.language
      ? navigator.language
      : "tr-TR"
  );
  const language = String(
    languageSetting === "auto"
      ? (config?.defaultLanguage || fallbackLanguage)
      : languageSetting
  ).replace("_", "-");
  const match = language.match(/-([A-Za-z]{2})$/);
  return normalizeCustomRegion(match?.[1]) || "TR";
}

function regionOptionsWithCurrent(currentRegion) {
  const normalized = normalizeCustomRegion(currentRegion);
  if (!normalized || CINEMA_PREROLL_REGION_OPTIONS.some((entry) => entry.value === normalized)) {
    return CINEMA_PREROLL_REGION_OPTIONS;
  }
  return [
    ...CINEMA_PREROLL_REGION_OPTIONS,
    { value: normalized, label: `${normalized} (${normalized})` }
  ];
}

function createDescriptionText(text) {
  const description = document.createElement("div");
  description.className = "description-text cinema-preroll-field-note";
  description.textContent = text;
  return description;
}

function appendDescriptionText(parent, text) {
  const value = String(text || "").trim();
  if (!value) return null;
  const description = createDescriptionText(value);
  parent.appendChild(description);
  return description;
}

export function createCinemaPreRollPanel(config, labels) {
  const panel = document.createElement("div");
  panel.id = "cinema-preroll-panel";
  panel.className = "settings-panel";

  const section = createSection(labels.cinemaPreRollTab || "Cinema Pre-Roll");

  const enableCheckbox = createCheckbox(
    "cinemaPreRollEnabled",
    labels.cinemaPreRollEnabled || "Play theatrical trailers before the main title begins",
    config.cinemaPreRollEnabled === true
  );
  section.appendChild(enableCheckbox);
  appendDescriptionText(
    section,
    labels.cinemaPreRollDescription ||
      "Trailers are selected from TMDb's now playing catalogue and presented before the main movie or episode as a cinema-style pre-show sequence."
  );
  appendDescriptionText(
    section,
    labels.cinemaPreRollHint ||
      "This feature requires a valid TMDb API key configured in the MonWUI Settings tab."
  );

  const subOptions = document.createElement("div");
  subOptions.className = "sub-options cinema-preroll-sub-options";

  const countRow = document.createElement("div");
  countRow.className = "fsetting-item";

  const countLabel = document.createElement("label");
  countLabel.className = "settings-label";
  countLabel.htmlFor = "cinemaPreRollTrailerCount";
  countLabel.textContent = labels.cinemaPreRollTrailerCount || "Number of pre-show trailers";

  const countSelect = document.createElement("select");
  countSelect.id = "cinemaPreRollTrailerCount";
  countSelect.name = "cinemaPreRollTrailerCount";
  countSelect.className = "settings-select";

  const currentCount = normalizeTrailerCount(config.cinemaPreRollTrailerCount);
  for (let value = 1; value <= MAX_TRAILER_COUNT; value += 1) {
    const option = document.createElement("option");
    option.value = String(value);
    option.textContent = `${value}`;
    option.selected = currentCount === value;
    countSelect.appendChild(option);
  }

  countRow.append(countLabel, countSelect);
  subOptions.appendChild(countRow);

  const fullscreenCheckbox = createCheckbox(
    "cinemaPreRollStartFullscreen",
    labels.cinemaPreRollStartFullscreen || "Start pre-show trailers in fullscreen when possible",
    config.cinemaPreRollStartFullscreen === true
  );
  subOptions.appendChild(fullscreenCheckbox);
  appendDescriptionText(
    subOptions,
    labels.cinemaPreRollStartFullscreenHint ||
      "On supported browsers, the pre-show player will attempt to open in fullscreen for a more theatrical presentation. Some devices may still require an initial tap because of browser restrictions."
  );

  const languageRow = document.createElement("div");
  languageRow.className = "fsetting-item";

  const languageLabel = document.createElement("label");
  languageLabel.className = "settings-label";
  languageLabel.htmlFor = "cinemaPreRollLanguage";
  languageLabel.textContent =
    labels.cinemaPreRollLanguage || "TMDb language";

  const languageSelect = document.createElement("select");
  languageSelect.id = "cinemaPreRollLanguage";
  languageSelect.name = "cinemaPreRollLanguage";
  languageSelect.className = "settings-select";

  const currentLanguage = normalizeLanguageSetting(config.cinemaPreRollLanguage);
  CINEMA_PREROLL_LANGUAGE_OPTIONS.forEach((entry) => {
    const option = document.createElement("option");
    option.value = entry.value;
    option.textContent =
      entry.value === "auto"
        ? (labels.cinemaPreRollLanguageAuto || "Auto - Follow the plugin / browser language")
        : entry.label;
    option.selected = currentLanguage === entry.value;
    languageSelect.appendChild(option);
  });

  languageRow.append(languageLabel, languageSelect);
  subOptions.appendChild(languageRow);
  appendDescriptionText(
    subOptions,
    labels.cinemaPreRollLanguageHint ||
      "This controls the language used for TMDb titles, overviews, and trailer pool results."
  );

  const regionModeRow = document.createElement("div");
  regionModeRow.className = "fsetting-item";

  const regionModeLabel = document.createElement("label");
  regionModeLabel.className = "settings-label";
  regionModeLabel.htmlFor = "cinemaPreRollRegionMode";
  regionModeLabel.textContent =
    labels.cinemaPreRollRegionMode || "TMDb region mode";

  const regionModeSelect = document.createElement("select");
  regionModeSelect.id = "cinemaPreRollRegionMode";
  regionModeSelect.name = "cinemaPreRollRegionMode";
  regionModeSelect.className = "settings-select";

  const currentRegionMode = normalizeRegionMode(config.cinemaPreRollRegionMode);
  [
    {
      value: "global",
      label: labels.cinemaPreRollRegionModeGlobal || "Global - Do not send a region to TMDb"
    },
    {
      value: "custom",
      label: labels.cinemaPreRollRegionModeCustom || "Country - Use the selected country below"
    }
  ].forEach((entry) => {
    const option = document.createElement("option");
    option.value = entry.value;
    option.textContent = entry.label;
    option.selected = currentRegionMode === entry.value;
    regionModeSelect.appendChild(option);
  });

  regionModeRow.append(regionModeLabel, regionModeSelect);
  subOptions.appendChild(regionModeRow);
  appendDescriptionText(
    subOptions,
    labels.cinemaPreRollRegionModeHint ||
      "Global omits the region parameter from TMDb. Country mode uses only the selected country's now playing and upcoming lists."
  );

  const customRegionRow = document.createElement("div");
  customRegionRow.className = "fsetting-item cinema-preroll-custom-region-row";

  const customRegionLabel = document.createElement("label");
  customRegionLabel.className = "settings-label";
  customRegionLabel.htmlFor = "cinemaPreRollCustomRegion";
  customRegionLabel.textContent =
    labels.cinemaPreRollCustomRegion || "TMDb country";

  const customRegionSelect = document.createElement("select");
  customRegionSelect.id = "cinemaPreRollCustomRegion";
  customRegionSelect.name = "cinemaPreRollCustomRegion";
  customRegionSelect.className = "settings-select";

  const currentRegion = normalizeCustomRegion(config.cinemaPreRollCustomRegion) || inferRegionFromConfig(config);
  regionOptionsWithCurrent(currentRegion).forEach((entry) => {
    const option = document.createElement("option");
    option.value = entry.value;
    option.textContent = entry.label;
    option.selected = currentRegion === entry.value;
    customRegionSelect.appendChild(option);
  });

  customRegionRow.append(customRegionLabel, customRegionSelect);
  subOptions.appendChild(customRegionRow);
  const customRegionHint = appendDescriptionText(
    subOptions,
    labels.cinemaPreRollCustomRegionHint ||
      "Choose which country's now playing and upcoming lists feed the pre-show pool. Changing it refreshes the cache for the selected country."
  );

  const fallbackModeRow = document.createElement("div");
  fallbackModeRow.className = "fsetting-item";

  const fallbackModeLabel = document.createElement("label");
  fallbackModeLabel.className = "settings-label";
  fallbackModeLabel.htmlFor = "cinemaPreRollFallbackMode";
  fallbackModeLabel.textContent =
    labels.cinemaPreRollFallbackMode || "Fill missing trailers";

  const fallbackModeSelect = document.createElement("select");
  fallbackModeSelect.id = "cinemaPreRollFallbackMode";
  fallbackModeSelect.name = "cinemaPreRollFallbackMode";
  fallbackModeSelect.className = "settings-select";

  const currentFallbackMode = normalizeFallbackMode(config.cinemaPreRollFallbackMode);
  [
    {
      value: "custom",
      label: labels.cinemaPreRollFallbackModeCustom || "Fill from selected country"
    },
    {
      value: "global",
      label: labels.cinemaPreRollFallbackModeGlobal || "Fill from the global list"
    },
    {
      value: "none",
      label: labels.cinemaPreRollFallbackModeNone || "Do not fill"
    }
  ].forEach((entry) => {
    const option = document.createElement("option");
    option.value = entry.value;
    option.textContent = entry.label;
    option.selected = currentFallbackMode === entry.value;
    fallbackModeSelect.appendChild(option);
  });

  fallbackModeRow.append(fallbackModeLabel, fallbackModeSelect);
  subOptions.appendChild(fallbackModeRow);
  appendDescriptionText(
    subOptions,
    labels.cinemaPreRollFallbackModeHint ||
      "If the selected country cannot fill the 150-trailer pool, choose where the remaining candidates should come from."
  );

  const fallbackRegionRow = document.createElement("div");
  fallbackRegionRow.className = "fsetting-item cinema-preroll-fallback-region-row";

  const fallbackRegionLabel = document.createElement("label");
  fallbackRegionLabel.className = "settings-label";
  fallbackRegionLabel.htmlFor = "cinemaPreRollFallbackRegion";
  fallbackRegionLabel.textContent =
    labels.cinemaPreRollFallbackRegion || "Fallback country";

  const fallbackRegionSelect = document.createElement("select");
  fallbackRegionSelect.id = "cinemaPreRollFallbackRegion";
  fallbackRegionSelect.name = "cinemaPreRollFallbackRegion";
  fallbackRegionSelect.className = "settings-select";

  const currentFallbackRegion = normalizeCustomRegion(config.cinemaPreRollFallbackRegion) || "US";
  regionOptionsWithCurrent(currentFallbackRegion).forEach((entry) => {
    const option = document.createElement("option");
    option.value = entry.value;
    option.textContent = entry.label;
    option.selected = currentFallbackRegion === entry.value;
    fallbackRegionSelect.appendChild(option);
  });

  fallbackRegionRow.append(fallbackRegionLabel, fallbackRegionSelect);
  subOptions.appendChild(fallbackRegionRow);
  const fallbackRegionHint = appendDescriptionText(
    subOptions,
    labels.cinemaPreRollFallbackRegionHint ||
      "If there are not enough trailers, choose which country's now playing and upcoming content should be used as the fallback source."
  );
  section.appendChild(subOptions);

  const updateCustomRegionState = () => {
    const enabled = normalizeRegionMode(regionModeSelect.value) === "custom";
    customRegionRow.style.display = enabled ? "" : "none";
    if (customRegionHint) customRegionHint.style.display = enabled ? "" : "none";
    customRegionSelect.disabled = !enabled;
  };
  updateCustomRegionState();
  regionModeSelect.addEventListener("change", updateCustomRegionState);

  const updateFallbackRegionState = () => {
    const enabled = normalizeFallbackMode(fallbackModeSelect.value) === "custom";
    fallbackRegionRow.style.display = enabled ? "" : "none";
    if (fallbackRegionHint) fallbackRegionHint.style.display = enabled ? "" : "none";
    fallbackRegionSelect.disabled = !enabled;
  };
  updateFallbackRegionState();
  fallbackModeSelect.addEventListener("change", updateFallbackRegionState);

  bindCheckboxKontrol("#cinemaPreRollEnabled", ".cinema-preroll-sub-options");

  panel.appendChild(section);
  return panel;
}
