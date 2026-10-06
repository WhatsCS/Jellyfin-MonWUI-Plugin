import { createCheckbox, createSection, bindCheckboxKontrol } from "./shared.js";

export function createProfileChooserPanel(config, labels) {
  const panel = document.createElement("div");
  panel.id = "profile-chooser-panel";
  panel.className = "settings-panel";

  const section = createSection(labels?.profileChooserHeader || "Who is Watching Settings");
  const enableRow = document.createElement("div");
  enableRow.className = "fsetting-item";

  const enableCb = createCheckbox(
    "enableProfileChooser",
    labels?.enableProfileChooser || "Enable profile chooser (Who is watching?)",
    config.enableProfileChooser
  );

  enableRow.appendChild(enableCb);

  const subWrap = document.createElement("div");
  subWrap.className = "profile-chooser-sub";

  const autoRow = document.createElement("div");
  autoRow.className = "fsetting-item profile-chooser-container";

  const autoCb = createCheckbox(
    "profileChooserAutoOpen",
    labels?.profileChooserAutoOpen || "Show automatically when page opens",
    config.profileChooserAutoOpen
  );

  autoRow.appendChild(autoCb);

  const autoRuleWrap = document.createElement("div");
  autoRuleWrap.className = "profile-chooser-auto-sub";

  const autoRuleRow = document.createElement("div");
  autoRuleRow.className = "fsetting-item profile-chooser-container";

  const autoRuleCb = createCheckbox(
    "profileChooserAutoOpenRequireQuickLogin",
    labels?.profileChooserAutoOpenRequireQuickLogin || "Auto-show if at least 1 quick login exists",
    config.profileChooserAutoOpenRequireQuickLogin
  );

  autoRuleRow.appendChild(autoRuleCb);
  autoRuleWrap.appendChild(autoRuleRow);

  const rememberRow = document.createElement("div");
  rememberRow.className = "fsetting-item profile-chooser-container";

  const rememberCb = createCheckbox(
    "profileChooserRememberTokens",
    labels?.profileChooserRememberTokens || "Remember tokens (local storage)",
    config.profileChooserRememberTokens
  );

  rememberRow.appendChild(rememberCb);

  const privacyRow = document.createElement("div");
  privacyRow.className = "fsetting-item profile-chooser-container";

  const privacyCb = createCheckbox(
    "profileChooserHideUsersFromRegularUsers",
    labels?.profileChooserHideUsersFromRegularUsers || "Hide other profiles from regular users",
    config.profileChooserHideUsersFromRegularUsers
  );

  privacyRow.appendChild(privacyCb);

  const desc = document.createElement("div");
  desc.className = "description-text";
  desc.textContent =
    labels?.profileChooserDesc ||
    "This setting opens a Netflix-like user chooser in Jellyfin. Auto-show, quick-login rule, and token memory are managed here.";

  subWrap.append(autoRow, autoRuleWrap, rememberRow, privacyRow, desc);

  section.append(enableRow, subWrap);
  panel.appendChild(section);

  bindCheckboxKontrol(
    "#enableProfileChooser",
    ".profile-chooser-sub",
    0.6,
    [autoCb, autoRuleCb, rememberCb, privacyCb]
  );

  bindCheckboxKontrol(
    "#profileChooserAutoOpen",
    ".profile-chooser-auto-sub",
    0.6,
    [autoRuleCb]
  );

  const enableInput = enableCb.querySelector("input");
  const autoInput = autoCb.querySelector("input");

  const syncAutoRuleVisibility = () => {
    const visible = !!(enableInput?.checked && autoInput?.checked);
    autoRuleWrap.style.display = visible ? "" : "none";
  };

  enableInput?.addEventListener("change", syncAutoRuleVisibility);
  autoInput?.addEventListener("change", syncAutoRuleVisibility);
  syncAutoRuleVisibility();

  return panel;
}
