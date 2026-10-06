import { bindCheckboxKontrol, createCheckbox, createSection } from "./shared.js";

export function createDetailsModalPanel(config, labels) {
  const panel = document.createElement("div");
  panel.id = "details-modal-panel";
  panel.className = "settings-panel";

  const section = createSection(labels.detailsModalSettingsTab || "Details Module Settings");

  const description = document.createElement("div");
  description.className = "description-text";
  description.textContent =
    labels.detailsModalSettingsDescription ||
    "You can control which fields are shown when the details module is enabled.";
  section.appendChild(description);

  const fieldsWrap = document.createElement("div");
  fieldsWrap.className = "sub-options details-modal-sub-options";

  fieldsWrap.appendChild(createCheckbox(
    "detailsModalTmdbReviewsEnabled",
    labels.detailsModalTmdbReviewsEnabled || "Show TMDb reviews section",
    config.detailsModalTmdbReviewsEnabled !== false
  ));

  fieldsWrap.appendChild(createCheckbox(
    "detailsModalLocalCommentsEnabled",
    labels.detailsModalLocalCommentsEnabled || "Show Community Comments section",
    config.detailsModalLocalCommentsEnabled === true
  ));

  section.appendChild(fieldsWrap);

  const localCommentsHint = document.createElement("div");
  localCommentsHint.className = "description-text";
  localCommentsHint.textContent =
    labels.detailsModalLocalCommentsHint ||
    "Community Comments is disabled by default.";
  section.appendChild(localCommentsHint);

  panel.appendChild(section);

  setTimeout(() => {
    bindCheckboxKontrol("#enableDetailsModalModule", ".details-modal-sub-options", 0.5);
  }, 0);

  return panel;
}
