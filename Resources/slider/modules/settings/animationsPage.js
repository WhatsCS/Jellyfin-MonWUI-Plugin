import { getConfig } from "../config.js";
import { createCheckbox, createImageTypeSelect, bindCheckboxKontrol, bindTersCheckboxKontrol } from "./shared.js";
import { applySettings, applyRawConfig } from "./applySettings.js";

export function createAnimationPanel(config, labels) {
    const panel = document.createElement('div');
    panel.id = 'animation-panel';
    panel.className = 'settings-panel';

    const slideAnimDiv = document.createElement('div');
    slideAnimDiv.className = 'fsetting-item';

    const slideAnimCheckbox = createCheckbox(
        'enableSlideAnimations',
        labels.enableSlideAnimations || 'Enable Slide Animations',
        config.enableSlideAnimations
    );
    slideAnimDiv.appendChild(slideAnimCheckbox);

    const slideTypeDiv = document.createElement('div');
    slideTypeDiv.className = 'fsetting-item slide-anim-container';
    const slideTypeLabel = document.createElement('label');
    slideTypeLabel.textContent = labels.slideTransitionType || 'Slayt Transition Type:';
    const slideTypeSelect = document.createElement('select');
    slideTypeSelect.name = 'slideTransitionType';

    const slideTypes = [
        { value: 'flip', label: labels.flipAnimation || '3D Flip' },
        { value: 'glitch', label: labels.glitchAnimation || "Glitch Effect" },
        { value: 'morph', label: labels.morphAnimation || 'Morph' },
        { value: 'cube', label: labels.cubeAnimation || '3D Cube' },
        { value: 'zoom', label: labels.zoomAnimation || 'Zoom Loop' },
        { value: 'slide', label: labels.slide || 'Linear Slide' },
        { value: 'slide3d', label: labels.slide3dAnimation || '3D Slide' },
        { value: 'slideTop', label: labels.slideTop || 'Slide From Top' },
        { value: 'slideBottom', label: labels.slideBottom || 'Slide From Bottom' },
        { value: 'diagonal', label: labels.diagonal || 'Diagonal Slide' },
        { value: 'fadezoom', label: labels.fadezoom || 'Fade Zoom' },
        { value: 'parallax', label: labels.parallax || "Parallax"},
        { value: 'blur-fade', label: labels.blurfade || 'Blur Fade'},
        { value: 'rotateIn', label: labels.rotateIn || 'Rotate In'},
        { value: 'flipInX', label: labels.flipInX || 'Flip In X'},
        { value: 'flipInY', label: labels.flipInY || 'Flip In Y'},
        { value: 'jelly', label: labels.jelly || 'Jelly'},
        { value: 'eye', label: labels.eye || 'Eye'},
    ];

    slideTypes.forEach(type => {
        const option = document.createElement('option');
        option.value = type.value;
        option.textContent = type.label;
        if (type.value === config.slideTransitionType) {
            option.selected = true;
        }
        slideTypeSelect.appendChild(option);
    });

    slideTypeLabel.htmlFor = 'slideTypeSelect';
    slideTypeSelect.id = 'slideTypeSelect';
    slideTypeDiv.append(slideTypeLabel, slideTypeSelect);

    const slideDurationDiv = document.createElement('div');
    slideDurationDiv.className = 'fsetting-item slide-anim-container';
    const slideDurationLabel = document.createElement('label');
    slideDurationLabel.textContent = labels.slideAnimationDuration || 'Slayt Animasyon Duration (ms):';
    const slideDurationInput = document.createElement('input');
    slideDurationInput.type = 'number';
    slideDurationInput.value = config.slideAnimationDuration || 800;
    slideDurationInput.name = 'slideAnimationDuration';
    slideDurationInput.min = 100;
    slideDurationInput.max = 3000;
    slideDurationInput.step = 50;
    slideDurationLabel.htmlFor = 'slideDurationInput';
    slideDurationInput.id = 'slideDurationInput';
    slideDurationDiv.append(slideDurationLabel, slideDurationInput);

    const dotAnimDiv = document.createElement('div');
    dotAnimDiv.className = 'fsetting-item';

    const dotAnimCheckbox = createCheckbox(
        'enableDotPosterAnimations',
        labels.enableDotPosterAnimations || 'Enable Dot Poster Animations',
        config.enableDotPosterAnimations
    );

    dotAnimDiv.appendChild(dotAnimCheckbox);

    const dotTypeDiv = document.createElement('div');
    dotTypeDiv.className = 'fsetting-item dot-anim-container';
    const dotTypeLabel = document.createElement('label');
    dotTypeLabel.textContent = labels.dotPosterTransitionType || 'Dot Transition Type:';
    const dotTypeSelect = document.createElement('select');
    dotTypeSelect.name = 'dotPosterTransitionType';

    const dotTypes = [
        { value: 'scale', label: labels.scaleAnimation || 'Scale' },
        { value: 'bounce', label: labels.bounceAnimation || 'Bounce' },
        { value: 'rotate', label: labels.rotateAnimation || 'Rotate' },
        { value: 'color', label: labels.colorAnimation || 'Color Shift' },
        { value: 'float', label: labels.floatAnimation || 'Float' },
        { value: 'pulse', label: labels.pulseAnimation || 'Pulse' },
        { value: 'tilt', label: labels.tiltAnimation || 'Tilt' },
        { value: 'shake', label: labels.shakeAnimation || "Shake" },
        { value: 'glow', label: labels.glow || 'Glow' },
        { value: 'rubberBand', label: labels.rubberBand || "Rubber Band" },
        { value: 'swing', label: labels.swing || "Swing" },
        { value: 'flip', label: labels.flip || 'Flip' },
        { value: 'flash', label: labels.flash || 'Flash' },
        { value: 'wobble', label: labels.wobble || 'Salla' },
    ];

    dotTypes.forEach(type => {
        const option = document.createElement('option');
        option.value = type.value;
        option.textContent = type.label;
        if (type.value === config.dotPosterTransitionType) {
            option.selected = true;
        }
        dotTypeSelect.appendChild(option);
    });

    dotTypeLabel.htmlFor = 'dotTypeSelect';
    dotTypeSelect.id = 'dotTypeSelect';
    dotTypeDiv.append(dotTypeLabel, dotTypeSelect);

    const dotDurationDiv = document.createElement('div');
    dotDurationDiv.className = 'fsetting-item dot-anim-container';
    const dotDurationLabel = document.createElement('label');
    dotDurationLabel.textContent = labels.dotPosterAnimationDuration || 'Dot Animasyon Duration (ms):';
    const dotDurationInput = document.createElement('input');
    dotDurationInput.type = 'number';
    dotDurationInput.value = config.dotPosterAnimationDuration || 500;
    dotDurationInput.name = 'dotPosterAnimationDuration';
    dotDurationInput.min = 100;
    dotDurationInput.max = 3000;
    dotDurationInput.step = 50;
    dotDurationLabel.htmlFor = 'dotDurationInput';
    dotDurationInput.id = 'dotDurationInput';
    dotDurationDiv.append(dotDurationLabel, dotDurationInput);

    panel.append(
        slideAnimDiv,
        slideTypeDiv,
        slideDurationDiv,
        dotAnimDiv,
        dotTypeDiv,
       dotDurationDiv
    );

    bindCheckboxKontrol('#enableSlideAnimations', '.slide-anim-container', 0.6, [slideTypeSelect, slideDurationInput]);
    bindCheckboxKontrol('#enableDotPosterAnimations', '.dot-anim-container', 0.6, [dotTypeSelect, dotDurationInput]);
    return panel;
}
