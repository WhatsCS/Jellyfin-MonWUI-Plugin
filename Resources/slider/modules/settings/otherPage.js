import { getConfig } from "../config.js";
import { compareSemver, fetchLatestGitHubVersion } from "../update.js";
import { createCheckbox, createSection, createImageTypeSelect, bindCheckboxKontrol, bindTersCheckboxKontrol } from "./shared.js";
import { clearQualityBadgesCacheAndRefresh } from "../qualityBadges.js";
import { fetchJmsPluginConfig } from "../jmsPluginConfig.js";

export function createStatusRatingPanel(config, labels) {
        const panel = document.createElement('div');
        panel.id = 'status-rating-panel';
        panel.className = 'settings-panel';

        const statusSection = createSection(labels.showStatusInfo || 'Status Info');
        const statusCheckbox = createCheckbox('showStatusInfo', labels.showStatusInfo || 'Show Status Info', config.showStatusInfo);
        statusSection.appendChild(statusCheckbox);

        const statusSubOptions = document.createElement('div');
        statusSubOptions.className = 'sub-options status-sub-options';
        statusSubOptions.appendChild(createCheckbox('showTypeInfo', labels.showTypeInfo || 'Media Type', config.showTypeInfo));
        statusSubOptions.appendChild(createCheckbox('showWatchedInfo', labels.showWatchedInfo || 'Watched', config.showWatchedInfo));
        statusSubOptions.appendChild(createCheckbox('showRuntimeInfo', labels.showRuntimeInfo || 'Duration', config.showRuntimeInfo));
        statusSubOptions.appendChild(createCheckbox('showQualityInfo', labels.showQualityInfo || 'Quality', config.showQualityInfo));

        const qualityDetailSubOptions = document.createElement('div');
        qualityDetailSubOptions.className = 'sub-options quality-detail-options';
        qualityDetailSubOptions.appendChild(createCheckbox('showQualityDetail', labels.showQualityDetail || 'Quality Details', config.showQualityDetail));
        statusSubOptions.appendChild(qualityDetailSubOptions);
        statusSection.appendChild(statusSubOptions);

        statusSubOptions.appendChild(createCheckbox('enableQualityBadges', labels.enableQualityBadges || 'Show quality badges on posters', config.enableQualityBadges));

        const badgeCacheControls = document.createElement('div');
        badgeCacheControls.className = 'inline-actions quality-badge-actions';

        const btnClear = document.createElement('button');
        btnClear.type = 'button';
        btnClear.className = 'btn btn-warning';
        btnClear.title = (labels.clearQualityCacheTitle || 'Clear quality badge cache');
        btnClear.textContent = (labels.clearQualityCache || 'Clear quality badge cache');
        btnClear.addEventListener('click', () => {
            try {
                clearQualityBadgesCacheAndRefresh();
                (window.showToast?.(labels.qualityCacheCleared || 'Quality badge cache was cleared and rebuilt.'))
                ?? alert(labels.qualityCacheCleared || 'Quality badge cache was cleared and rebuilt.');
            } catch (e) {
                (window.showToast?.(labels.qualityCacheClearError || 'An error occurred while clearing the cache.'))
                ?? alert(labels.qualityCacheClearError || 'An error occurred while clearing the cache.');
                console.warn('clearQualityBadgesCacheAndRefresh error:', e);
            }
        });

        badgeCacheControls.append(btnClear);
        statusSubOptions.appendChild(badgeCacheControls);

        bindCheckboxKontrol('#showStatusInfo', '.status-sub-options');
        bindCheckboxKontrol('#showQualityInfo', '.quality-detail-options');

        const ratingSection = createSection(labels.ratingInfoHeader || 'Rating Info');
        const ratingCheckbox = createCheckbox('showRatingInfo', labels.ratingInfo || 'Show Ratings', config.showRatingInfo);
        ratingSection.appendChild(ratingCheckbox);

        const ratingSubOptions = document.createElement('div');
        ratingSubOptions.className = 'sub-options rating-sub-options';
        ratingSubOptions.appendChild(createCheckbox('showCommunityRating', labels.showCommunityRating || 'Community', config.showCommunityRating));
        ratingSubOptions.appendChild(createCheckbox('showCriticRating', labels.showCriticRating || 'Rotten Tomato', config.showCriticRating));
        ratingSubOptions.appendChild(createCheckbox('showOfficialRating', labels.showOfficialRating || 'Certification', config.showOfficialRating));
        ratingSubOptions.appendChild(createCheckbox('showMatchPercentage', labels.showMatchPercentage || 'Match', config.showMatchPercentage));
        ratingSection.appendChild(ratingSubOptions);

        bindCheckboxKontrol('#showRatingInfo', '.rating-sub-options');

        const metaIconColorsCheckbox = createCheckbox('metaIconColors', labels.metaIconColors || 'Use colors in metadata icons', config.metaIconColors);
        ratingSection.appendChild(metaIconColorsCheckbox);

        const description = document.createElement('div');
        description.className = 'description-text';
        description.textContent = labels.statusRatingDescription || 'This setting controls visibility of quality, watch status, media type, duration, and rating information.';
        ratingSection.appendChild(description);

        panel.append(statusSection, ratingSection);
        return panel;
    }

export function createActorPanel(config, labels) {
        const panel = document.createElement('div');
        panel.id = 'actor-panel';
        panel.className = 'settings-panel';

        const section = createSection(labels.actorInfo || 'Cast Info');

        const actorAllCheckbox = createCheckbox('showActorAll', labels.showActorAll || 'None', config.showActorAll);
        section.appendChild(actorAllCheckbox);

        const actorCheckbox = createCheckbox('showActorInfo', labels.showActorInfo || 'Show Actor Names', config.showActorInfo);
        const actorCheckboxInput = actorCheckbox.querySelector('input');
        actorCheckboxInput.setAttribute('data-group', 'actor');
        section.appendChild(actorCheckbox);

        const actorSubOptions = document.createElement('div');
        actorSubOptions.className = 'sub-options actor-sub-options';
        const actorImgCheckbox = createCheckbox('showActorImg', labels.showActorImg || 'Show Actor Images', config.showActorImg);
        const actorImgCheckboxInput = actorImgCheckbox.querySelector('input');
        actorImgCheckboxInput.setAttribute('data-group', 'actor');
        actorSubOptions.appendChild(actorImgCheckbox);
        section.appendChild(actorSubOptions);

        const actorRolOptions = document.createElement('div');
        actorRolOptions.className = 'sub-options actor-rol-options';
        const actorRoleCheckbox = createCheckbox('showActorRole', labels.showActorRole || 'Show Actor Roles', config.showActorRole);
        const actorRoleCheckboxInput = actorRoleCheckbox.querySelector('input');
        actorRoleCheckboxInput.setAttribute('data-group', 'actor');
        actorRolOptions.appendChild(actorRoleCheckbox);
        section.appendChild(actorRolOptions);

        const artistLimitDiv = document.createElement('div');
        artistLimitDiv.className = 'setting-item artist-limit-container';
        const artistLimitLabel = document.createElement('label');
        artistLimitLabel.textContent = labels.artistLimit || 'Number of actors to show:';
        const artistLimitInput = document.createElement('input');
        artistLimitInput.type = 'number';
        artistLimitInput.value = config.artistLimit || 3;
        artistLimitInput.name = 'artistLimit';
        artistLimitInput.min = 1;
        artistLimitInput.step = 1;
        artistLimitInput.setAttribute('data-group', 'actor');
        artistLimitLabel.htmlFor = 'artistLimitInput';
        artistLimitInput.id = 'artistLimitInput';
        artistLimitDiv.append(artistLimitLabel, artistLimitInput);
        section.appendChild(artistLimitDiv);

        const description = document.createElement('div');
        description.className = 'description-text';
        description.textContent = labels.actorInfoDescription || 'This setting controls visibility of the first 3 cast members.';
        section.appendChild(description);

        panel.appendChild(section);

    setTimeout(() => {
        bindTersCheckboxKontrol(
            'input[name="showActorAll"]',
            null,
            0.5,
            Array.from(panel.querySelectorAll('[data-group="actor"]'))
        );
    }, 0);

    return panel;
}

 export function createDirectorPanel(config, labels) {
        const panel = document.createElement('div');
        panel.id = 'director-panel';
        panel.className = 'settings-panel';

        const section = createSection(labels.directorWriter || 'Director and Writer Settings');
        const directorCheckbox = createCheckbox('showDirectorWriter', labels.showDirectorWriter || 'Show Director and Writer Info', config.showDirectorWriter);
        section.appendChild(directorCheckbox);

        const subOptions = document.createElement('div');
        subOptions.className = 'sub-options director-sub-options';
        subOptions.appendChild(createCheckbox('showDirector', labels.showDirector || 'Director', config.showDirector));
        subOptions.appendChild(createCheckbox('showWriter', labels.showWriter || 'Writer', config.showWriter));
        section.appendChild(subOptions);

        bindCheckboxKontrol('#showDirectorWriter', '.director-sub-options');

        const description = document.createElement('div');
        description.className = 'description-text';
        description.textContent = labels.directorWriterDescription || 'This setting controls writer and director visibility. (Writer info is shown only if listed below).';
        section.appendChild(description);

        const writersHeader = document.createElement('h2');
        writersHeader.textContent = labels.writersListHeader || 'Writers List';
        section.appendChild(writersHeader);

        const writersDiv = document.createElement('div');
        writersDiv.className = 'setting-item writersLabel';
        const writersLabel = document.createElement('label');
        writersLabel.textContent = labels.writersListLabel || 'Separate names with commas:';
        const writersInput = document.createElement('textarea');
        writersInput.id = 'allowedWritersInput';
        writersInput.name = 'allowedWriters';
        writersInput.rows = 4;
        writersInput.placeholder = labels.writersListPlaceholder || 'Example: Quentin TARANTINO, Nuri Bilge CEYLAN';
        writersInput.value = config.allowedWriters ? config.allowedWriters.join(', ') : '';
        writersLabel.htmlFor = 'writersInput';
        writersInput.id = 'writersInput';
        writersDiv.append(writersLabel, writersInput);
        section.appendChild(writersDiv);

        const girisSureDiv = document.createElement('div');
        girisSureDiv.className = 'setting-item writersLabel';
        const girisSureLabel = document.createElement('label');
        girisSureLabel.textContent = labels.girisSure || 'Entry Duration (ms):';
        const girisSureInput = document.createElement('input');
        girisSureInput.type = 'number';
        girisSureInput.value = config.girisSure || 1000;
        girisSureInput.name = 'girisSure';
        girisSureInput.min = 50;
        girisSureInput.step = 50;

        girisSureLabel.htmlFor = 'girisSureInput';
        girisSureInput.id = 'girisSureInput';
        girisSureDiv.append(girisSureLabel, girisSureInput);
        section.appendChild(girisSureDiv);

        const aktifSureDiv = document.createElement('div');
        aktifSureDiv.className = 'setting-item writersLabel';
        const aktifSureLabel = document.createElement('label');
        aktifSureLabel.textContent = labels.aktifSure || 'Active Duration (ms):';
        const aktifSureInput = document.createElement('input');
        aktifSureInput.type = 'number';
        aktifSureInput.value = config.aktifSure || 5000;
        aktifSureInput.name = 'aktifSure';
        aktifSureInput.min = 50;
        aktifSureInput.step = 50;
        aktifSureLabel.htmlFor = 'aktifSureInput';
        aktifSureInput.id = 'aktifSureInput';
        aktifSureDiv.append(aktifSureLabel, aktifSureInput);
        section.appendChild(aktifSureDiv);

        panel.appendChild(section);
        return panel;
    }

export function createInfoPanel(config, labels) {
    const panel = document.createElement('div');
    panel.id = 'info-panel';
    panel.className = 'settings-panel';

    const section = createSection(labels.infoHeader || 'Genre, Year and Country Info');
    const infoCheckbox = createCheckbox('showInfo', labels.showInfo || 'Show Genre, Year and Country Info', config.showInfo);
    section.appendChild(infoCheckbox);

    const subOptions = document.createElement('div');
    subOptions.className = 'sub-options info-sub-options';
    subOptions.appendChild(createCheckbox('showGenresInfo', labels.showGenresInfo || 'Genre', config.showGenresInfo));
    subOptions.appendChild(createCheckbox('showYearInfo', labels.showYearInfo || 'Year', config.showYearInfo));
    subOptions.appendChild(createCheckbox('showCountryInfo', labels.showCountryInfo || 'Country', config.showCountryInfo));
    section.appendChild(subOptions);

    bindCheckboxKontrol('#showInfo', '.info-sub-options');

    const description = document.createElement('div');
    description.className = 'description-text';
    description.textContent = labels.infoDescription || 'This setting controls visibility of genre, production year, and country information.';
    section.appendChild(description);

    panel.appendChild(section);
    return panel;
}


export function createLogoTitlePanel(config, labels) {
    const panel = document.createElement('div');
    panel.id = 'logo-title-panel';
    panel.className = 'settings-panel';

    const section = createSection(labels.logoOrTitleHeader || 'Logo / Title Settings');
    const logoCheckbox = createCheckbox('showLogoOrTitle', labels.showLogoOrTitle || 'Show Logo Image', config.showLogoOrTitle);
    section.appendChild(logoCheckbox);

    const displayOrderDiv = document.createElement('div');
    displayOrderDiv.className = 'sub-options logo-sub-options';
    displayOrderDiv.id = 'displayOrderContainer';
    const displayOrderLabel = document.createElement('label');
    const displayOrderSpan = document.createElement('span');
    displayOrderSpan.textContent = labels.displayOrderlabel || 'Display Order:';
    const displayOrderInput = document.createElement('input');
    displayOrderInput.type = 'text';
    displayOrderInput.id = 'displayOrderInput';
    displayOrderInput.name = 'displayOrder';
    displayOrderInput.placeholder = 'clearart,disk,logo,originalTitle';
    displayOrderInput.value = config.displayOrder || 'logo,disk,originalTitle';
    const displayOrderSmall = document.createElement('small');
    displayOrderSmall.textContent = labels.displayOrderhelp || '(Example: clearart,disk,logo,originalTitle)';
    displayOrderLabel.append(displayOrderSpan, displayOrderInput, displayOrderSmall);
    displayOrderDiv.appendChild(displayOrderLabel);
    section.appendChild(displayOrderDiv);

    const titleOnlyCheckbox = createCheckbox('showTitleOnly', labels.showTitleOnly || 'Show Original Title Instead of Logo', config.showTitleOnly);
    const titleOnlyDiv = document.createElement('div');
    titleOnlyDiv.className = 'sub-options title-sub-options';
    titleOnlyDiv.id = 'showTitleOnlyLabel';
    titleOnlyDiv.appendChild(titleOnlyCheckbox);
    section.appendChild(titleOnlyDiv);

    const discOnlyCheckbox = createCheckbox('showDiscOnly', labels.showDiscOnly || 'Show Disc Image Instead of Logo', config.showDiscOnly);
    const discOnlyDiv = document.createElement('div');
    discOnlyDiv.className = 'sub-options disc-sub-options';
    discOnlyDiv.id = 'showDiscOnlyLabel';
    discOnlyDiv.appendChild(discOnlyCheckbox);
    section.appendChild(discOnlyDiv);

    function setupMutuallyExclusive(checkbox1, checkbox2) {
        const cb1 = checkbox1.querySelector('input');
        const cb2 = checkbox2.querySelector('input');

        cb1.addEventListener('change', function() {
            if (this.checked) {
                cb2.checked = false;
            }
        });

        cb2.addEventListener('change', function() {
            if (this.checked) {
                cb1.checked = false;
            }
        });
    }

    setupMutuallyExclusive(titleOnlyCheckbox, discOnlyCheckbox);

    bindCheckboxKontrol('#showLogoOrTitle', '.logo-sub-options');
    bindTersCheckboxKontrol('#showLogoOrTitle', '.title-sub-options');
    bindTersCheckboxKontrol('#showLogoOrTitle', '.disc-sub-options');

    if (titleOnlyCheckbox.querySelector('input').checked && discOnlyCheckbox.querySelector('input').checked) {
        discOnlyCheckbox.querySelector('input').checked = false;
    }

    const description = document.createElement('div');
    description.className = 'description-text';
    description.textContent = labels.logoOrTitleDescription || 'This setting controls logo or original title visibility on the slider.';
    section.appendChild(description);

    panel.appendChild(section);
    return panel;
}

export function createDescriptionPanel(config, labels) {
    const panel = document.createElement('div');
    panel.id = 'description-panel';
    panel.className = 'settings-panel';

    const section = createSection(labels.descriptionsHeader || 'Description Settings');
    const descCheckbox = createCheckbox('showDescriptions', labels.showDescriptions || 'Show Info', config.showDescriptions);
    section.appendChild(descCheckbox);

    const subOptions = document.createElement('div');
    subOptions.className = 'sub-options desc-sub-options';
    subOptions.appendChild(createCheckbox('showSloganInfo', labels.showSloganInfo || 'Slogan', config.showSloganInfo));
    subOptions.appendChild(createCheckbox('showTitleInfo', labels.showTitleInfo || 'Title', config.showTitleInfo));
    subOptions.appendChild(createCheckbox('showOriginalTitleInfo', labels.showOriginalTitleInfo || 'Original Title', config.showOriginalTitleInfo));

    const hideIfSameWrapper = document.createElement('div');
    hideIfSameWrapper.className = 'hide-original-if-same-wrapper';
    hideIfSameWrapper.appendChild(createCheckbox('hideOriginalTitleIfSame', labels.hideOriginalTitleIfSame || 'Do not show original title if it is the same as title', config.hideOriginalTitleIfSame));
    subOptions.appendChild(hideIfSameWrapper);

    subOptions.appendChild(createCheckbox('showPlotInfo', labels.showPlotInfo || 'Plot Text', config.showPlotInfo));
    subOptions.appendChild(createCheckbox('showPlaybackProgress', labels.showPlaybackProgress || 'Playback Progress Bar', config.showPlaybackProgress));

    section.appendChild(subOptions);

    bindCheckboxKontrol('#showDescriptions', '.desc-sub-options');
    bindCheckboxKontrol('#showOriginalTitleInfo', '.hide-original-if-same-wrapper');

    const description = document.createElement('div');
    description.className = 'description-text';
    description.textContent = labels.descriptionsDescription || 'This setting controls visibility of plot, slogan, title, and original title info.';
    section.appendChild(description);

    panel.appendChild(section);
    return panel;
}


export  function createProviderPanel(config, labels) {
    const panel = document.createElement('div');
    panel.id = 'provider-panel';
    panel.className = 'settings-panel';

    const section = createSection(labels.providerHeader || 'External Links / Provider Settings');
    section.appendChild(createCheckbox('showProviderInfo', labels.showProviderInfo || 'Show Metadata Links', config.showProviderInfo));

    const castModuleCheckbox = createCheckbox(
      'enableCastModule',
      labels.enableCastModule || 'Enable cast module',
      config.enableCastModule
    );
    section.appendChild(castModuleCheckbox);

    const castModuleSubOptions = document.createElement('div');
    castModuleSubOptions.className = 'sub-options cast-module-sub-options';
    castModuleSubOptions.appendChild(createCheckbox('showCast', labels.showCast || 'Show Chromecast', config.showCast));
    castModuleSubOptions.appendChild(createCheckbox(
      'allowSharedCastViewerForUsers',
      labels.allowSharedCastViewerForUsers || 'Allow all users to see who is watching what in the cast module',
      config.allowSharedCastViewerForUsers
    ));
    section.appendChild(castModuleSubOptions);
    bindCheckboxKontrol('#enableCastModule', '.cast-module-sub-options');

    const settingsLinkDiv = document.createElement('div');
    settingsLinkDiv.id = 'settingsLinkContainer';
    settingsLinkDiv.appendChild(createCheckbox('showSettingsLink', labels.showSettingsLink || 'Show Settings Shortcut', config.showSettingsLink));
    section.appendChild(settingsLinkDiv);

    const trailerIconDiv = document.createElement('div');
    trailerIconDiv.appendChild(createCheckbox('showTrailerIcon', labels.showTrailerIcon || 'Show Trailer Icon', config.showTrailerIcon));
    section.appendChild(trailerIconDiv);

    const description = document.createElement('div');
    description.className = 'description-text';
    description.textContent = labels.providerDescription || 'This setting controls visibility of metadata links.';
    section.appendChild(description);

    const castModuleInput = castModuleCheckbox.querySelector('input');
    const showCastInput = castModuleSubOptions.querySelector('input[name="showCast"]');
    const sharedViewerInput = castModuleSubOptions.querySelector('input[name="allowSharedCastViewerForUsers"]');

    const syncCastOptionsWithModule = () => {
      if (!castModuleInput) return;
      if (!castModuleInput.checked) {
        if (showCastInput) {
          showCastInput.checked = false;
        }
        if (sharedViewerInput) {
          sharedViewerInput.checked = false;
        }
      }
    };

    if (castModuleInput) {
      castModuleInput.addEventListener('change', syncCastOptionsWithModule);
      syncCastOptionsWithModule();
    }

    fetchJmsPluginConfig()
      .then((pluginConfig) => {
        const pluginEnableCastModule =
          pluginConfig?.enableCastModule ?? pluginConfig?.EnableCastModule;
        const pluginAllowSharedCastViewerForUsers =
          pluginConfig?.allowSharedCastViewerForUsers ?? pluginConfig?.AllowSharedCastViewerForUsers;

        if (castModuleInput) {
          castModuleInput.checked = pluginEnableCastModule !== false;
          castModuleInput.dispatchEvent(new Event('change', { bubbles: true }));
        }
        if (sharedViewerInput) {
          sharedViewerInput.checked = pluginAllowSharedCastViewerForUsers === true;
        }
        syncCastOptionsWithModule();
      })
      .catch(() => {});

    if (config?.currentUserIsAdmin !== true) {
      [castModuleInput, sharedViewerInput].forEach((input) => {
        if (!input) return;
        input.disabled = true;
        input.style.opacity = '0.6';
      });
    }

    panel.appendChild(section);
    return panel;
}

export function createAboutPanel(labels) {
  const panel = document.createElement('div');
  panel.id = 'about-panel';
  panel.className = 'settings-panel';

  const section = createSection('MONWUI');

  const info = document.createElement('div');
  info.className = 'ggrbz-info';
  info.textContent = labels.aboutHeader || 'About';
  section.appendChild(info);

  const aboutContent = document.createElement('div');
  aboutContent.className = 'about-content';

  const creatorInfo = document.createElement('p');
  creatorInfo.textContent = ` WhatsCS ${labels.aboutCreator || 'CS'}`;
  creatorInfo.style.fontWeight = 'bold';
  creatorInfo.style.marginBottom = '20px';

  const supportInfo = document.createElement('p');
  supportInfo.textContent = labels.aboutSupport || 'For suggestions, requests, or issues:';
  supportInfo.style.marginBottom = '10px';

  const githubLink = document.createElement('a');
  githubLink.href = 'https://github.com/WhatsCS/Jellyfin-MonWUI-Plugin';
  githubLink.target = '_blank';
  githubLink.textContent = labels.aboutGithub || 'GitHub: https://github.com/WhatsCS/Jellyfin-MonWUI-Plugin';
  githubLink.style.display = 'block';
  githubLink.style.marginBottom = '10px';
  githubLink.style.color = '#00a8ff';

  const emailLink = document.createElement('a');
  emailLink.href = 'mailto:whatscs@jointheb.org';
  emailLink.innerHTML = `${labels.aboutEmail || 'Email:'} whatscs@jointheb.org`;
  emailLink.style.display = 'block';
  emailLink.style.color = '#00a8ff';

  const updateWrap = document.createElement('div');
  updateWrap.className = 'update-check-wrapper';
  updateWrap.style.marginTop = '16px';

  const cfg = getConfig?.() || {};
  const currentVersion =
    cfg.extensionVersion || cfg.version || (typeof window !== "undefined" && window.JMS_VERSION) || "0.0.0";

  const currentP = document.createElement('p');
  currentP.className = 'current-version';
  currentP.style.margin = '8px 0';
  currentP.textContent = (labels.currentVersionText || 'Installed version') + `: ${currentVersion}`;
  updateWrap.appendChild(currentP);

  const statusP = document.createElement('p');
  statusP.className = 'update-status';
  statusP.style.margin = '6px 0';
  statusP.style.minHeight = '20px';
  updateWrap.appendChild(statusP);

  const checkBtn = document.createElement('button');
  checkBtn.type = 'button';
  checkBtn.className = 'btn check-update-btn';
  checkBtn.title = labels.checkUpdateTitle || 'Check latest version on GitHub';
  checkBtn.textContent = labels.checkUpdateText || 'Check for updates';
  checkBtn.style.padding = '8px 12px';
  checkBtn.style.borderRadius = '8px';
  checkBtn.style.border = '1px solid var(--theme-accent, #00a8ff)';
  checkBtn.style.cursor = 'pointer';
  checkBtn.style.background = 'transparent';
  checkBtn.style.color = 'var(--theme-accent, #00a8ff)';
  checkBtn.style.fontWeight = '600';

  const resultSpan = document.createElement('span');
  resultSpan.className = 'update-result-link';
  resultSpan.style.marginLeft = '12px';

  const btnRow = document.createElement('div');
  btnRow.style.display = 'flex';
  btnRow.style.alignItems = 'center';
  btnRow.append(checkBtn, resultSpan);

  updateWrap.appendChild(btnRow);

  let checking = false;
  checkBtn.addEventListener('click', async () => {
    if (checking) return;
    checking = true;
    const prev = checkBtn.textContent;
    checkBtn.textContent = (labels.checkingText || 'Checking...');
    checkBtn.disabled = true;
    statusP.textContent = '';
    resultSpan.textContent = '';

    try {
      const { version: latest, html_url } = await fetchLatestGitHubVersion("WhatsCS", "Jellyfin-MonWUI-Plugin");
      if (!latest) {
        statusP.textContent = labels.updateUnknown || 'Could not fetch latest version.';
      } else {
        const cmp = compareSemver(latest, currentVersion);
        if (cmp > 0) {
          statusP.textContent = (labels.updateAvailable || 'New version available') + `: ${latest}`;
          const a = document.createElement('a');
          a.href = html_url;
          a.target = '_blank';
          a.rel = 'noopener';
          a.textContent = labels.viewOnGithub || 'View / Download on GitHub';
          a.style.marginLeft = '8px';
          resultSpan.replaceChildren(a);
        } else if (cmp === 0) {
          statusP.textContent = labels.upToDate || 'You are up to date.';
        } else {
          statusP.textContent = (labels.localNewer || 'Local version appears newer') + ` (${currentVersion} > ${latest})`;
          const a = document.createElement('a');
          a.href = html_url;
          a.target = '_blank';
          a.rel = 'noopener';
          a.textContent = labels.viewOnGithub || 'View on GitHub';
          a.style.marginLeft = '8px';
          resultSpan.replaceChildren(a);
        }
      }
    } catch (err) {
      statusP.textContent = (labels.updateError || 'An error occurred while checking updates.');
      if (window?.console) console.warn('Update check error:', err);
    } finally {
      checkBtn.textContent = prev;
      checkBtn.disabled = false;
      checking = false;
    }
  });

  aboutContent.append(creatorInfo, supportInfo, githubLink, emailLink, updateWrap);
  section.appendChild(aboutContent);

  panel.appendChild(section);
  return panel;
}
