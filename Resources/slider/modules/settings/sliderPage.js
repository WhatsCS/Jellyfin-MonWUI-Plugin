import { createCheckbox, createImageTypeSelect, bindCheckboxKontrol, bindTersCheckboxKontrol } from "./shared.js";
import { getDefaultLanguage, getStoredLanguagePreference } from '../../language/index.js';
import { fetchJmsPluginConfig, sanitizeTmdbApiKey } from "../jmsPluginConfig.js";

const LS_TMDB_LANG  = 'jms_tmdb_reviews_lang';

function lsGet(k, def = '') { try { return localStorage.getItem(k) ?? def; } catch { return def; } }
function lsSet(k, v) { try { (v ? localStorage.setItem(k, v) : localStorage.removeItem(k)); } catch {} }

function createTextInputSimple(id, labelText, value, placeholder = '') {
  const wrap = document.createElement('div');
  wrap.className = 'fsetting-item';
  const label = document.createElement('label');
  label.htmlFor = id; label.textContent = labelText;
  const input = document.createElement('input');
  input.type = 'text';
  input.id = id;
  input.name = id;
  input.value = value || '';
  input.placeholder = placeholder || '';
  wrap.append(label, input);
  return { wrap, input };
}

function createSelectSimple(id, labelText, value, options) {
  const wrap = document.createElement('div');
  wrap.className = 'fsetting-item';
  const label = document.createElement('label');
  label.htmlFor = id; label.textContent = labelText;
  const sel = document.createElement('select');
  sel.id = id;
  sel.name = id;
  for (const opt of options) {
    const o = document.createElement('option');
    o.value = opt.value;
    o.textContent = opt.label;
    sel.appendChild(o);
  }
  sel.value = value || options?.[0]?.value || '';
  wrap.append(label, sel);
  return { wrap, sel };
}

export function createSliderPanel(config, labels) {
  const panel = document.createElement('div');
  panel.id = 'slider-panel';
  panel.className = 'settings-panel';

  const languageDiv = document.createElement('div');
  languageDiv.className = 'setting-item';
  const languageLabel = document.createElement('label');
  languageLabel.textContent = labels.defaultLanguage || 'Dil:';
  languageLabel.htmlFor = 'defaultLanguageSelect';
  const languageSelect = document.createElement('select');
  languageSelect.name = 'defaultLanguage';
  languageSelect.id = 'defaultLanguageSelect';

  const uiPref = getStoredLanguagePreference() || 'auto';
  const effective = getDefaultLanguage();

  const languages = [
    { value: 'auto', label: labels.optionAuto || "🌐 Automatic (Browser language)" },
    { value: 'tur',  label: labels.optionTurkish || '🇹🇷 Turkish' },
    { value: 'eng',  label: labels.optionEnglish || '🇬🇧 English' },
    { value: 'spa',  label: labels.optionEspanol || '🇪🇸 Español' },
    { value: 'deu',  label: labels.optionGerman  || '🇩🇪 Deutsch' },
    { value: 'fre',  label: labels.optionFrench  || "🇫🇷 Français" },
    { value: 'rus',  label: labels.optionRussian || '🇷🇺 Русский' },
    { value: 'ita',  label: '🇮🇹 Italiano' },
    { value: 'jpn',  label: '🇯🇵 日本語' },
    { value: 'por',  label: '🇧🇷 Português' },
  ];

  languages.forEach(lang => {
    const option = document.createElement('option');
    option.value = lang.value;
    option.textContent = lang.label;
    languageSelect.appendChild(option);
  });

  const selectedLanguage = languages.some(lang => lang.value === uiPref)
    ? uiPref
    : (languages.some(lang => lang.value === effective) ? effective : 'auto');
  languageSelect.value = selectedLanguage;

  languageDiv.append(languageLabel, languageSelect);

  const tmdbWrap = document.createElement('div');
  tmdbWrap.className = 'fsetting-item';
  const canEditGlobalTmdb = config?.currentUserIsAdmin === true;

  const tmdbTitle = document.createElement('h3');
  tmdbTitle.textContent = labels.tmdbReviewsTitle || 'TMDb Reviews';

  const tmdbKeyField = (() => {
    const w = document.createElement('div');
    w.className = 'fsetting-item';
    const l = document.createElement('label');
    l.textContent = labels.tmdbApiKeyForReviews || 'TMDb API Key (for reviews)';
    l.htmlFor = 'tmdbKeyForReviews';
    const i = document.createElement('input');
    i.type = 'password';
    i.id = 'tmdbKeyForReviews';
    i.name = 'TmdbApiKey';
    i.placeholder = '••••••••';
    i.value = sanitizeTmdbApiKey(config?.TmdbApiKey || config?.tmdbApiKey || '');
    i.disabled = !canEditGlobalTmdb;
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.textContent = (labels.showSecret || 'Show');
    btn.style.cssText = 'margin-left:8px; padding:6px 10px; border-radius:10px; border:1px solid rgba(255,255,255,.15); background:transparent; color:inherit; cursor:pointer;';
    btn.disabled = !canEditGlobalTmdb;
    btn.onclick = () => {
      const hidden = i.type === 'password';
      i.type = hidden ? 'text' : 'password';
      btn.textContent = hidden ? (labels.hideSecret || 'Hide') : (labels.showSecret || 'Show');
    };

    const row = document.createElement('div');
    row.style.cssText = 'display:flex; align-items:center; gap:6px;';
    row.append(i, btn);

    const hint = document.createElement('div');
    hint.className = 'description-text';
    hint.textContent = canEditGlobalTmdb
      ? (labels.tmdbKeyHint || "This key is stored in your browser and will remain until cookies are cleared.")
      : (labels.settingsReadOnly || "Non-administrator users cannot change settings");

    w.append(l, row, hint);
    return w;
  })();

  const tmdbLangSelect = createSelectSimple(
    'tmdbReviewsLang',
    labels.tmdbReviewsLang || 'Yorum Dili',
    lsGet(LS_TMDB_LANG, 'tr-TR'),
    [
      { value: 'tr-TR', label: '🇹🇷 Turkish (tr-TR)' },
      { value: 'en-US', label: '🇺🇸 English (en-US)' },
      { value: 'es-ES', label: '🇪🇸 Español (es-ES)' },
      { value: 'de-DE', label: '🇩🇪 Deutsch (de-DE)' },
      { value: 'fr-FR', label: '🇫🇷 Français (fr-FR)' },
      { value: 'ru-RU', label: '🇷🇺 Русский (ru-RU)' },
      { value: 'it-IT', label: '🇮🇹 Italiano (it-IT)' },
      { value: 'ja-JP', label: '🇯🇵 日本語 (ja-JP)' },
      { value: 'pt-BR', label: '🇧🇷 Português (pt-BR)' },
      { value: '', label: labels.noParam || "Automatic (No parameters)" },
    ]
  );
  tmdbLangSelect.sel.addEventListener('change', () => lsSet(LS_TMDB_LANG, tmdbLangSelect.sel.value));
  tmdbWrap.append(tmdbTitle, tmdbKeyField, tmdbLangSelect.wrap);

  (async () => {
    try {
      const latest = await fetchJmsPluginConfig();
      const input = tmdbKeyField.querySelector('#tmdbKeyForReviews');
      if (input) input.value = sanitizeTmdbApiKey(latest?.TmdbApiKey ?? latest?.tmdbApiKey);
    } catch {}
  })();

  const cssDiv = document.createElement('div');
  cssDiv.className = 'fsetting-item';
  const cssLabel = document.createElement('h3');
  cssLabel.textContent = labels.gorunum || "Appearance";
  const cssSelect = document.createElement('select');
  cssSelect.name = 'cssVariant';
  const activeCssVariant = (() => {
    const variant = String(config.cssVariant || '').trim().toLowerCase();
    if (!variant) return 'normalslider';
    if (variant.includes('peak')) return 'peakslider';
    if (variant.includes('full')) return 'normalslider';
    if (variant.includes('normal')) return 'normalslider';
    if (variant.includes('slider')) return 'slider';
    return 'normalslider';
  })();

  const variants = [
    { value: 'slider', label: labels.kompaktslider || 'Kompakt' },
    { value: 'normalslider' ,label: labels.normalslider || 'Normal' },
    { value: 'peakslider', label: (labels.peakslider || 'Peak') },
  ];

  const enableSliderCheckbox = createCheckbox(
    'enableSlider',
    labels.enableSlider || 'Enable Slider',
    (config.enableSlider !== false)
  );

  const onlyShowSliderOnHomeTabCheckbox = createCheckbox(
    'onlyShowSliderOnHomeTab',
    labels.onlyShowSliderOnHomeTab || 'Show Only on Home Tab',
    (config.onlyShowSliderOnHomeTab !== false)
  );

  variants.forEach(variant => {
    const option = document.createElement('option');
    option.value = variant.value;
    option.textContent = variant.label;
    if (variant.value === activeCssVariant) {
      option.selected = true;
    }
    cssSelect.appendChild(option);
  });

  const peakDiagonalCheckbox = createCheckbox(
    'peakDiagonal',
    labels.peakDiagonal || 'Diagonal View',
    (activeCssVariant === 'peakslider') && !!config.peakDiagonal
  );

  function updatePeakDiagonalVisibility() {
    const isPeak = cssSelect.value === 'peakslider';
    const input = peakDiagonalCheckbox.querySelector('input');
    peakDiagonalCheckbox.style.display = isPeak ? '' : 'none';

    if (isPeak) {
      input.disabled = false;
    } else {
      input.disabled = true;
      input.checked = false;
    }
    const peakRailFields = [
      peakSpanLeftLabel, peakSpanLeftInput,
      peakSpanRightLabel, peakSpanRightInput,
      peakGapRightLabel, peakGapRightInput,
      peakGapLeftLabel, peakGapLeftInput
    ];
    const diagonalOnlyFields = [
      peakGapYLabel, peakGapYInput
    ];
    const showDiagonalSettings = isPeak && input.checked;

    peakRailFields.forEach(el => {
      el.style.display = showDiagonalSettings ? '' : 'none';
    });

    diagonalOnlyFields.forEach(el => {
      el.style.display = showDiagonalSettings ? '' : 'none';
    });
  }

  const cssDesc = document.createElement('div');
  cssDesc.className = 'description-text';
  const baseDesc =
    labels.cssDescriptionBase ||
    labels.cssDescription ||
    "• If you use poster-sized dots, you should adjust your home page from the 'Position Settings' tab.";
  const mobileNote =
    labels.cssMobileNote ||
    "• On mobile devices, it is recommended to select up to 3 neighbors when Diagonal View is enabled";
  cssDesc.innerHTML = `${baseDesc}<br><br>${mobileNote}`;

  cssLabel.htmlFor = 'cssVariantSelect';
  cssSelect.id = 'cssVariantSelect';

  const peakSpanRightLabel = document.createElement('label');
  peakSpanRightLabel.textContent = labels.peakSpanRight || "Right Neighbor Card Count:";
  const peakSpanRightInput = document.createElement('input');
  peakSpanRightInput.type = 'number';
  peakSpanRightInput.value = config.peakSpanRight || 3;
  peakSpanRightInput.name = 'peakSpanRight';
  peakSpanRightInput.min = 1;
  peakSpanRightInput.step = 1;
  peakSpanRightInput.setAttribute('data-group', 'actor');
  peakSpanRightLabel.htmlFor = 'peakSpanRightInput';
  peakSpanRightInput.id = 'peakSpanRightInput';

  const peakSpanLeftLabel = document.createElement('label');
  peakSpanLeftLabel.textContent = labels.peakSpanLeft || "Left Neighbor Card Count:";
  const peakSpanLeftInput = document.createElement('input');
  peakSpanLeftInput.type = 'number';
  peakSpanLeftInput.value = config.peakSpanLeft || 3;
  peakSpanLeftInput.name = 'peakSpanLeft';
  peakSpanLeftInput.min = 1;
  peakSpanLeftInput.step = 1;
  peakSpanLeftInput.setAttribute('data-group', 'actor');
  peakSpanLeftLabel.htmlFor = 'peakSpanLeftInput';
  peakSpanLeftInput.id = 'peakSpanLeftInput';

  const peakGapLeftLabel = document.createElement('label');
  peakGapLeftLabel.textContent = labels.peakGapLeft || "Left Neighbor X Axis (px)";
  const peakGapLeftInput = document.createElement('input');
  peakGapLeftInput.type = 'number';
  peakGapLeftInput.value = config.peakGapLeft || 80;
  peakGapLeftInput.name = 'peakGapLeft';
  peakGapLeftInput.min = 0;
  peakGapLeftInput.step = 1;
  peakGapLeftInput.setAttribute('data-group', 'actor');
  peakGapLeftLabel.htmlFor = 'peakGapLeftInput';
  peakGapLeftInput.id = 'peakGapLeftInput';

  const peakGapRightLabel = document.createElement('label');
  peakGapRightLabel.textContent = labels.peakGapRight || "Right Neighbor X Axis (px)";
  const peakGapRightInput = document.createElement('input');
  peakGapRightInput.type = 'number';
  peakGapRightInput.value = config.peakGapRight || 80;
  peakGapRightInput.name = 'peakGapRight';
  peakGapRightInput.min = 0;
  peakGapRightInput.step = 1;
  peakGapRightInput.setAttribute('data-group', 'actor');
  peakGapRightLabel.htmlFor = 'peakGapRightInput';
  peakGapRightInput.id = 'peakGapRightInput';

  const peakGapYLabel = document.createElement('label');
  peakGapYLabel.textContent = labels.peakGapY || 'Y Ekseni (px)';
  const peakGapYInput = document.createElement('input');
  peakGapYInput.type = 'number';
  peakGapYInput.value = config.peakGapY || 0;
  peakGapYInput.name = 'peakGapY';
  peakGapYInput.min = 0;
  peakGapYInput.step = 1;
  peakGapYInput.setAttribute('data-group', 'actor');
  peakGapYLabel.htmlFor = 'peakGapYInput';
  peakGapYInput.id = 'peakGapYInput';

  cssDiv.append(enableSliderCheckbox, onlyShowSliderOnHomeTabCheckbox, cssLabel, cssSelect, peakDiagonalCheckbox, peakSpanLeftLabel, peakSpanLeftInput, peakSpanRightLabel, peakSpanRightInput, peakGapRightLabel, peakGapRightInput, peakGapLeftLabel, peakGapLeftInput, peakGapYLabel, peakGapYInput, cssDesc);

  cssSelect.addEventListener('change', updatePeakDiagonalVisibility);
  peakDiagonalCheckbox.querySelector('input').addEventListener('change', updatePeakDiagonalVisibility);
  updatePeakDiagonalVisibility();

  const sliderDiv = document.createElement('div');
  sliderDiv.className = 'fsetting-item';
  const sliderLabel = document.createElement('h3');
  sliderLabel.textContent = labels.sliderDuration || 'Slider Duration (ms):';
  const sliderInput = document.createElement('input');
  sliderInput.type = 'number';
  sliderInput.value = config.sliderDuration || 15000;
  sliderInput.name = 'sliderDuration';
  sliderInput.min = 1000;
  sliderInput.step = 250;
  sliderLabel.htmlFor = 'sliderDurationInput';
  sliderInput.id = 'sliderDurationInput';
  const sliderDesc = document.createElement('div');
  sliderDesc.className = 'description-text';
  sliderDesc.textContent = labels.sliderDurationDescription || "This setting should be in milliseconds.";
  sliderDiv.append(sliderLabel, sliderDesc, sliderInput);

  const showSecondsCheckbox = createCheckbox(
    'showProgressAsSeconds',
    (labels.showProgressAsSeconds || "Show Progress in Seconds"),
    config.showProgressAsSeconds || false
  );
  sliderDiv.appendChild(showSecondsCheckbox);

  const playbackOptionsDiv = document.createElement('div');
  playbackOptionsDiv.className = 'fsetting-item';

  const playbackTitle = document.createElement('h3');
  playbackTitle.textContent = labels.previewPlaybackOptions || "Built-in Hover Playback Options";
  playbackOptionsDiv.appendChild(playbackTitle);

  const playbackCheckboxesDiv = document.createElement('div');
  const trailerPlaybackCheckbox = createCheckbox(
    'enableTrailerPlayback',
    labels.enableTrailerPlayback || "Play Embedded Trailer on Slider Hover",
    config.enableTrailerPlayback
  );

  const videoPlaybackCheckbox = createCheckbox(
    'enableVideoPlayback',
    labels.enableVideoPlayback || "Play Embedded Video on Slider Hover",
    config.enableVideoPlayback
  );

  const trailerThenVideoCheckbox = createCheckbox(
    'enableTrailerThenVideo',
    labels.enableTrailerThenVideo || "Play Trailer > Video on Slider Hover",
    config.enableTrailerThenVideo
  );

  const sliderAutoTrailerPlaybackCheckbox = createCheckbox(
    'sliderAutoTrailerPlayback',
    labels.sliderAutoTrailerPlayback || "Automatically play the active slider trailer",
    config.sliderAutoTrailerPlayback === true
  );

  const disableAllPlaybackCheckbox = createCheckbox(
    'disableAllPlayback',
    labels.selectNone || 'None',
    config.disableAllPlayback || false
  );

  function disableAllPlaybackOptions() {
    const trailerCheckbox = document.querySelector('#enableTrailerPlayback');
    const videoCheckbox = document.querySelector('#enableVideoPlayback');
    const trailerThenVideoCheckbox = document.querySelector('#enableTrailerThenVideo');
    const autoTrailerCheckbox = document.querySelector('#sliderAutoTrailerPlayback');

    if (trailerCheckbox) trailerCheckbox.checked = false;
    if (videoCheckbox) videoCheckbox.checked = false;
    if (trailerThenVideoCheckbox) trailerThenVideoCheckbox.checked = false;
    if (autoTrailerCheckbox) autoTrailerCheckbox.checked = false;

    localStorage.setItem('previewPlaybackMode', 'none');
    updateTrailerRelatedFields();
  }

  playbackCheckboxesDiv.appendChild(trailerPlaybackCheckbox);
  playbackCheckboxesDiv.appendChild(videoPlaybackCheckbox);
  playbackCheckboxesDiv.appendChild(trailerThenVideoCheckbox);
  playbackCheckboxesDiv.appendChild(sliderAutoTrailerPlaybackCheckbox);
  playbackCheckboxesDiv.appendChild(disableAllPlaybackCheckbox);

  disableAllPlaybackCheckbox.querySelector('input').addEventListener('change', (e) => {
    if (e.target.checked) {
      disableAllPlaybackOptions();
    }
  });

  [trailerPlaybackCheckbox, videoPlaybackCheckbox, trailerThenVideoCheckbox, sliderAutoTrailerPlaybackCheckbox].forEach(checkbox => {
    checkbox.querySelector('input').addEventListener('change', () => {
      disableAllPlaybackCheckbox.querySelector('input').checked = false;
    });
  });

  playbackOptionsDiv.appendChild(playbackCheckboxesDiv);

  function setPlaybackMode(mode) {
    const t = trailerPlaybackCheckbox.querySelector('input');
    const v = videoPlaybackCheckbox.querySelector('input');
    const tv = trailerThenVideoCheckbox.querySelector('input');
    const none = disableAllPlaybackCheckbox.querySelector('input');

    if (mode === 'trailer') { t.checked = true; v.checked = false; tv.checked = false; }
    else if (mode === 'video') { t.checked = false; v.checked = true; tv.checked = false; }
    else { t.checked = false; v.checked = false; tv.checked = true; }
    none.checked = false;

    localStorage.setItem('previewPlaybackMode', mode);
    localStorage.setItem('previewTrailerEnabled', String(mode === 'trailer'));
    updateTrailerRelatedFields();
  }

  trailerPlaybackCheckbox.querySelector('input').addEventListener('change', (e) => {
    if (e.target.checked) setPlaybackMode('trailer');
  });
  videoPlaybackCheckbox.querySelector('input').addEventListener('change', (e) => {
    if (e.target.checked) setPlaybackMode('video');
  });
  trailerThenVideoCheckbox.querySelector('input').addEventListener('change', (e) => {
    if (e.target.checked) setPlaybackMode('trailerThenVideo');
  });

  const initialPlaybackMode = (() => {
    if (config.disableAllPlayback) return 'none';
    if (
      config.previewPlaybackMode === 'trailer' ||
      config.previewPlaybackMode === 'video' ||
      config.previewPlaybackMode === 'trailerThenVideo'
    ) {
      return config.previewPlaybackMode;
    }
    if (config.enableTrailerThenVideo) return 'trailerThenVideo';
    if (config.enableTrailerPlayback) return 'trailer';
    if (config.enableVideoPlayback) return 'video';
    return 'video';
  })();

  if (initialPlaybackMode === 'none') {
    disableAllPlaybackCheckbox.querySelector('input').checked = true;
    disableAllPlaybackOptions();
  } else {
    setPlaybackMode(initialPlaybackMode);
  }

  trailerPlaybackCheckbox.querySelector('input').addEventListener('change', (e) => {
    if (e.target.checked) {
      videoPlaybackCheckbox.querySelector('input').checked = false;
    }
    updateTrailerRelatedFields();
  });

  videoPlaybackCheckbox.querySelector('input').addEventListener('change', (e) => {
    if (e.target.checked) {
      trailerPlaybackCheckbox.querySelector('input').checked = false;
    }
    updateTrailerRelatedFields();
  });

  sliderDiv.appendChild(playbackOptionsDiv);

  const delayDiv = document.createElement('div');
  delayDiv.className = 'fsetting-item trailer-delay-container';
  const delayLabel = document.createElement('label');
  delayLabel.textContent = labels.gecikmeInput || "Trailer playback delay on slider (ms)";
  const delayInput = document.createElement('input');
  delayInput.type = 'number';
  delayInput.value = config.gecikmeSure || 500;
  delayInput.name = 'gecikmeSure';
  delayInput.min = 0;
  delayInput.max = 10000;
  delayInput.step = 50;
  delayLabel.htmlFor = 'delayInput';
  delayInput.id = 'delayInput';
  delayDiv.append(delayLabel, delayInput);
  sliderDiv.appendChild(delayDiv);

  const backgroundOptionsDiv = document.createElement('div');
  backgroundOptionsDiv.className = 'fsetting-item';

  const backgroundTitle = document.createElement('h3');
  backgroundTitle.textContent = labels.backgroundOptions || "Slider Background Display Settings";
  backgroundOptionsDiv.appendChild(backgroundTitle);
  sliderDiv.appendChild(backgroundOptionsDiv);

  const indexZeroDesc = document.createElement('div');
  indexZeroDesc.className = 'description-text';
  indexZeroDesc.textContent = labels.indexZeroDescription || "When active, always selects the image at index 0 and does not pick among background images.";
  sliderDiv.appendChild(indexZeroDesc);

  const indexZeroCheckbox = createCheckbox(
    'indexZeroSelection',
    labels.indexZeroSelection || "Always select default image",
    config.indexZeroSelection
  );
  sliderDiv.appendChild(indexZeroCheckbox);

  const manualBackdropCheckbox = createCheckbox(
    'manualBackdropSelection',
    labels.manualBackdropSelection || "Change Slide Background",
    config.manualBackdropSelection
  );
  sliderDiv.appendChild(manualBackdropCheckbox);

  const backdropDiv = document.createElement('div');
  backdropDiv.className = 'fsetting-item backdrop-container';
  const backdropLabel = document.createElement('label');
  backdropLabel.textContent = labels.slideBackgroundImageType || 'Slider Arka Plan Image Type:';
  const backdropSelect = createImageTypeSelect('backdropImageType', config.backdropImageType || 'backdropUrl', true);
  backdropLabel.htmlFor = 'backdropSelect';
  backdropSelect.id = 'backdropSelect';
  backdropDiv.append(backdropLabel, backdropSelect);
  sliderDiv.appendChild(backdropDiv);

  const minQualityDiv = document.createElement('div');
  minQualityDiv.className = 'fsetting-item min-quality-container';
  const minQualityLabel = document.createElement('label');
  minQualityLabel.textContent = labels.minHighQualityWidthInput || "Minimum Width (px)";

  const minQualityInput = document.createElement('input');
  minQualityInput.type = 'number';
  minQualityInput.value = config.minHighQualityWidth || 1920;
  minQualityInput.name = 'minHighQualityWidth';
  minQualityInput.min = 1;

  const minQualityDesc = document.createElement('div');
  minQualityDesc.className = 'description-text';
  minQualityDesc.textContent = labels.minHighQualitydescriptiontext ||
    "This setting determines the minimum width of the image to be assigned as the background. (It will not work if 'Change Slide Background' is active. If there is no image with the specified width, the highest quality one will be selected.)";

  minQualityLabel.htmlFor = 'minHighQualityWidthInput';
  minQualityInput.id = 'minHighQualityWidthInput';
  minQualityDiv.append(minQualityLabel, minQualityDesc, minQualityInput);
  sliderDiv.appendChild(minQualityDiv);

  bindCheckboxKontrol('#manualBackdropSelection', '.backdrop-container', 0.6, [backdropSelect]);
  bindTersCheckboxKontrol('#manualBackdropSelection', '.min-quality-container', 0.6, [minQualityInput]);

  const backdropMaxWidthDiv = document.createElement('div');
  backdropMaxWidthDiv.className = 'fsetting-item min-quality-container';
  const backdropMaxWidthLabel = document.createElement('label');
  backdropMaxWidthLabel.textContent = labels.backdropMaxWidthInput || "Max Scale (px):";

  const backdropMaxWidthInput = document.createElement('input');
  backdropMaxWidthInput.type = 'number';
  backdropMaxWidthInput.value = config.backdropMaxWidth || 1920;
  backdropMaxWidthInput.name = 'backdropMaxWidth';
  backdropMaxWidthInput.min = 1;

  const backdropMaxWidthDesc = document.createElement('div');
  backdropMaxWidthDesc.className = 'description-text';
  backdropMaxWidthDesc.textContent = labels.backdropMaxWidthLabel ||
    "The image set as background will be scaled to the entered value. (Does not apply if 'Change Slide Background' is active. Images smaller than the value will not be scaled.)";

  backdropMaxWidthLabel.htmlFor = 'backdropMaxWidthInput';
  backdropMaxWidthInput.id = 'backdropMaxWidthInput';
  backdropMaxWidthDiv.append(backdropMaxWidthLabel, backdropMaxWidthDesc, backdropMaxWidthInput);
  sliderDiv.appendChild(backdropMaxWidthDiv);

  const minPixelDiv = document.createElement('div');
  minPixelDiv.className = 'fsetting-item min-quality-container';
  const minPixelLabel = document.createElement('label');
  minPixelLabel.textContent = labels.minPixelCountInput || "Minimum Pixel Count:";

  const minPixelInput = document.createElement('input');
  minPixelInput.type = 'number';
  minPixelInput.value = config.minPixelCount || (1920 * 1080);
  minPixelInput.name = 'minPixelCount';
  minPixelInput.min = 1;

  const minPixelDesc = document.createElement('div');
  minPixelDesc.className = 'description-text';
  minPixelDesc.textContent = labels.minPixelCountDescription ||
    "The result of width × height. Images below this value are considered low quality. Ex: 1920×1080 = 2073600";

  minPixelLabel.htmlFor = 'minPixelInput';
  minPixelInput.id = 'minPixelInput';
  minPixelDiv.append(minPixelLabel, minPixelDesc, minPixelInput);
  sliderDiv.appendChild(minPixelDiv);

  const sizeFilterToggleDiv = document.createElement('div');
  sizeFilterToggleDiv.className = 'fsetting-item min-quality-container';

  const sizeFilterLabel = document.createElement('label');
  sizeFilterLabel.textContent = labels.enableImageSizeFilter || "Enable Image Size Filtering";
  sizeFilterLabel.htmlFor = 'enableImageSizeFilter';

  const sizeFilterCheckbox = document.createElement('input');
  sizeFilterCheckbox.type = 'checkbox';
  sizeFilterCheckbox.id = 'enableImageSizeFilter';
  sizeFilterCheckbox.name = 'enableImageSizeFilter';
  sizeFilterCheckbox.checked = config.enableImageSizeFilter ?? false;

  sizeFilterLabel.prepend(sizeFilterCheckbox);
  sizeFilterToggleDiv.appendChild(sizeFilterLabel);
  sliderDiv.appendChild(sizeFilterToggleDiv);

  const minSizeDiv = document.createElement('div');
  minSizeDiv.className = 'fsetting-item min-quality-container';
  const minSizeLabel = document.createElement('label');
  minSizeLabel.textContent = labels.minImageSizeKB || "Minimum Image Size (KB):";

  const minSizeInput = document.createElement('input');
  minSizeInput.type = 'number';
  minSizeInput.value = config.minImageSizeKB || 800;
  minSizeInput.name = 'minImageSizeKB';
  minSizeInput.min = 1;

  const minSizeDesc = document.createElement('div');
  minSizeDesc.className = 'description-text';
  minSizeDesc.textContent = labels.minImageSizeDescription || 'Specifies the minimum file size in KB for the image to be selected.';

  minSizeLabel.htmlFor = 'minSizeInput';
  minSizeInput.id = 'minSizeInput';
  minSizeDiv.append(minSizeLabel, minSizeDesc, minSizeInput);
  sliderDiv.appendChild(minSizeDiv);

  const maxSizeDiv = document.createElement('div');
  maxSizeDiv.className = 'fsetting-item min-quality-container';
  const maxSizeLabel = document.createElement('label');
  maxSizeLabel.textContent = labels.maxImageSizeKB || "Maximum Image Size (KB):";

  const maxSizeInput = document.createElement('input');
  maxSizeInput.type = 'number';
  maxSizeInput.value = config.maxImageSizeKB || 1500;
  maxSizeInput.name = 'maxImageSizeKB';
  maxSizeInput.min = 1;

  const maxSizeDesc = document.createElement('div');
  maxSizeDesc.className = 'description-text';
  maxSizeDesc.textContent = labels.maxImageSizeDescription || 'Specifies the maximum file size in KB for the image to be selected.';

  maxSizeLabel.htmlFor = 'maxSizeInput';
  maxSizeInput.id = 'maxSizeInput';
  maxSizeDiv.append(maxSizeLabel, maxSizeDesc, maxSizeInput);
  sliderDiv.appendChild(maxSizeDiv);

  bindTersCheckboxKontrol('#manualBackdropSelection', '.min-quality-container', 0.6, [minPixelInput, minSizeInput, maxSizeInput, backdropMaxWidthInput]);
  bindCheckboxKontrol('#enableImageSizeFilter', '.min-quality-container', 0.6, [minSizeInput, maxSizeInput]);

  const dotOptionsDiv = document.createElement('div');
  dotOptionsDiv.className = 'fsetting-item';

  const dotTitle = document.createElement('h3');
  dotTitle.textContent = labels.dotOptions || "Navigation (Dot) Settings";
  dotOptionsDiv.appendChild(dotTitle);
  sliderDiv.appendChild(dotOptionsDiv);

  const dotCheckboxs = document.createElement('div');
  dotCheckboxs.className = 'fsetting-item min-quality-container';

  const dotNavCheckbox = createCheckbox(
    'showDotNavigation',
    labels.showDotNavigation || 'Show Dot Navigation',
    config.showDotNavigation
  );
  sliderDiv.appendChild(dotNavCheckbox);

  const posterDotsDesc = document.createElement('div');
  posterDotsDesc.className = 'description-text';
  posterDotsDesc.textContent = labels.posterDotsDescription || 'Brings dot navigation to poster size ( Slider Area also requires positioning )';
  sliderDiv.appendChild(posterDotsDesc);

  const posterDotsCheckbox = createCheckbox(
    'dotPosterMode',
    labels.dotPosterMode || 'Poster-Sized Dot Navigation',
    config.dotPosterMode
  );
  sliderDiv.appendChild(posterDotsCheckbox);

  const dotVisibleCountDiv = document.createElement('div');
  dotVisibleCountDiv.className = 'setting-item dot-visible-count-container';

  const dotVisibleCountLabel = document.createElement('label');
  dotVisibleCountLabel.textContent = labels.dotVisibleCount || "Visible dot count";
  dotVisibleCountLabel.htmlFor = 'dotVisibleCount';

  const dotVisibleCountInput = document.createElement('input');
  dotVisibleCountInput.type = 'number';
  dotVisibleCountInput.min = '0';
  dotVisibleCountInput.step = '1';
  dotVisibleCountInput.value = Math.max(0, Number(config.dotVisibleCount ?? 0));
  dotVisibleCountInput.name = 'dotVisibleCount';
  dotVisibleCountInput.id = 'dotVisibleCount';

  const dotVisibleCountDesc = document.createElement('div');
  dotVisibleCountDesc.className = 'description-text';
  dotVisibleCountDesc.textContent = labels.dotVisibleCountDescription || "0 = all dots stay visible. Lower values assign the monwui-dot-hidden class to distant dots.";

  dotVisibleCountDiv.append(dotVisibleCountLabel, dotVisibleCountDesc, dotVisibleCountInput);
  sliderDiv.appendChild(dotVisibleCountDiv);

  const previewModalCheckbox = createCheckbox(
    'previewModal',
    labels.previewModal || "Enable HoverTrailer on Poster Dot",
    config.previewModal
  );
  sliderDiv.appendChild(previewModalCheckbox);

  const dotPreviewDiv = document.createElement('div');
  dotPreviewDiv.className = 'fsetting-item';
  const dotPreviewLabel = document.createElement('div');
  dotPreviewLabel.id = 'dotPreviewPlaybackModeLabel';
  dotPreviewLabel.textContent = labels.dotPreviewMode || "Poster Dot Preview Mode";
  dotPreviewLabel.style.display = 'block';
  dotPreviewLabel.style.marginBottom = '6px';

  const modes = [
    { value: 'trailer',     text: labels.preferTrailersInPreviewModal || 'Fragman + Video' },
    { value: 'video',       text: labels.videoOnly || 'Video' },
    { value: 'onlyTrailer', text: labels.onlyTrailerInPreviewModal || 'Sadece Fragman' },
  ];

  const dotPreviewGroup = document.createElement('div');
  dotPreviewGroup.setAttribute('role', 'radiogroup');
  dotPreviewGroup.setAttribute('aria-labelledby', 'dotPreviewPlaybackModeLabel');
  dotPreviewGroup.style.display = 'flex';
  dotPreviewGroup.style.flexDirection = 'column';
  dotPreviewGroup.style.gap = '4px';

  modes.forEach(m => {
    const wrap = document.createElement('label');
    wrap.style.display = 'flex';
    wrap.style.alignItems = 'center';
    wrap.style.gap = '8px';
    const input = document.createElement('input');
    input.type = 'radio';
    input.name = 'dotPreviewPlaybackMode';
    input.value = m.value;
    input.checked = (config.dotPreviewPlaybackMode || '') === m.value;
    wrap.appendChild(input);
    wrap.appendChild(document.createTextNode(m.text));
    dotPreviewGroup.appendChild(wrap);
  });

  if (!config.dotPreviewPlaybackMode) {
    const first = dotPreviewGroup.querySelector('input[value="trailer"]');
    if (first) first.checked = true;
  }

  dotPreviewDiv.append(dotPreviewLabel, dotPreviewGroup);
  sliderDiv.appendChild(dotPreviewDiv);

  document.addEventListener('DOMContentLoaded', () => {
    if (typeof updateModalRelatedFields === 'function') {
      updateModalRelatedFields();
    }
  });

  const dotBgDiv = document.createElement('div');
  dotBgDiv.className = 'fsetting-item';
  dotBgDiv.classList.add('dot-bg-container');
  const dotBgLabel = document.createElement('label');
  dotBgLabel.textContent = labels.dotBackgroundImageType || 'Dot Arka Plan Image Type:';
  const dotBgSelect = createImageTypeSelect(
    'dotBackgroundImageType',
    config.dotBackgroundImageType || 'useSlideBackground',
    true,
    true
  );

  dotBgLabel.htmlFor = 'dotBgSelect';
  dotBgSelect.id = 'dotBgSelect';
  dotBgDiv.append(dotBgLabel, dotBgSelect);
  sliderDiv.appendChild(dotBgDiv);

  bindCheckboxKontrol('#showDotNavigation', '.dot-bg-container', 0.6, [dotBgSelect, dotBgLabel]);
  bindCheckboxKontrol('#showDotNavigation', '.dot-visible-count-container', 0.6, [dotVisibleCountInput, dotVisibleCountLabel]);

  const dotblurDiv = document.createElement('div');
  dotblurDiv.className = 'setting-item';

  const dotblurLabel = document.createElement('label');
  dotblurLabel.textContent = labels.backgroundBlur || "Background blur";
  dotblurLabel.htmlFor = 'dotBackgroundBlur';

  const dotblurInput = document.createElement('input');
  dotblurInput.type = 'range';
  dotblurInput.min = '0';
  dotblurInput.max = '20';
  dotblurInput.step = '1';
  dotblurInput.value = config.dotBackgroundBlur ?? 10;
  dotblurInput.name = 'dotBackgroundBlur';
  dotblurInput.id = 'dotBackgroundBlur';

  const dotblurValue = document.createElement('span');
  dotblurValue.className = 'range-value';
  dotblurValue.textContent = dotblurInput.value + 'px';

  dotblurInput.addEventListener('input', () => {
    dotblurValue.textContent = dotblurInput.value + 'px';
  });

  dotblurDiv.append(dotblurLabel, dotblurInput, dotblurValue);
  sliderDiv.appendChild(dotblurDiv);

  const dotopacityDiv = document.createElement('div');
  dotopacityDiv.className = 'setting-item';

  const dotopacityLabel = document.createElement('label');
  dotopacityLabel.textContent = labels.backgroundOpacity || "Background opacity";
  dotopacityLabel.htmlFor = 'dotBackgroundOpacity';

  const dotopacityInput = document.createElement('input');
  dotopacityInput.type = 'range';
  dotopacityInput.min = '0';
  dotopacityInput.max = '1';
  dotopacityInput.step = '0.1';
  dotopacityInput.value = config.dotBackgroundOpacity ?? 0.5;
  dotopacityInput.name = 'dotBackgroundOpacity';
  dotopacityInput.id = 'dotBackgroundOpacity';

  const dotopacityValue = document.createElement('span');
  dotopacityValue.className = 'range-value';
  dotopacityValue.textContent = dotopacityInput.value;

  dotopacityInput.addEventListener('input', () => {
  dotopacityValue.textContent = dotopacityInput.value;
  });

  dotopacityDiv.append(dotopacityLabel, dotopacityInput, dotopacityValue);
  sliderDiv.appendChild(dotopacityDiv);


  panel.append(
    languageDiv,
    tmdbWrap,
    cssDiv,
    sliderDiv,
  );

  requestAnimationFrame(() => {
    updateTrailerRelatedFields();
  });

  return panel;
}

function updateTrailerRelatedFields() {
  const t = document.querySelector('#enableTrailerPlayback')?.checked;
  const v = document.querySelector('#enableVideoPlayback')?.checked;
  const tv = document.querySelector('#enableTrailerThenVideo')?.checked;
  const isEnabled = !!(t || v || tv);

  const trailerDelayContainer = document.querySelector('.trailer-delay-container');
  if (trailerDelayContainer) {
    trailerDelayContainer.style.opacity = isEnabled ? 1 : 0.6;

    trailerDelayContainer.querySelectorAll('input, select').forEach(el => el.disabled = !isEnabled);
  }
}
document.addEventListener('DOMContentLoaded', updateTrailerRelatedFields);
