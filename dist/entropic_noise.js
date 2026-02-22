/**
 * Entropic Noise - Main Application
 * Core p5.js sketch with setup, draw, and utility functions
 * 
 * Dependencies:
 * - p5.js (loaded globally)
 * - Tweakpane (loaded globally)
 * - entropy_classes.js (must load before this)
 * - ui.js (must load before this)
 */

//_________________________________________________________________________________________________
// GLOBAL VARIABLES
//_________________________________________________________________________________________________

let entropy;
let ui_slide_baseSpread;
let ui_slide_pushAmount;
let ui_slide_strokeWidth;
let ui_slide_opacity;
let ui_checkbox_fixedAngle;
let ui_displayed;
let allUIsVisible = true; // Track visibility of both old UI and Tweakpane
let ui_label_baseSpread;
let ui_label_baseSpreadValue;
let ui_label_pushAmount;
let ui_label_pushAmountValue;
let ui_label_opacity;
let ui_label_opacityValue;
let ui_label_strokeWidth;
let ui_label_strokeWidthValue;
let ui_button_clear;
let ui_checkbox_allowFunky;
let ui_dropdown_blendMode;
let ui_slide_oscAmp;
let ui_label_oscAmp;
let ui_label_oscAmpValue;
let ui_button_export;
let ui_colorPicker_bg;
let currentBgColor;
let ui_button_loadImage;
let ui_checkbox_sampleColor;
let ui_button_menu;
let ui_checkbox_useMic;
let ui_slider_micGain;
let ui_label_micGain
let ui_label_micGainValue

let ui_button_savePreset;
let ui_preset_modal;
let ui_preset_filenameInput;
let ui_preset_textarea;
let ui_preset_saveButton;
let ui_preset_cancelButton;
let ui_select_presets;
let ui_fileInput_presets;
let ui_button_applyPreset;
let ui_toast_div;
let ui_toast_timer = null;

let _presetsStore = {}; // name -> preset object

// Tweakpane UI
let tweakpane;
let tweakpaneParams = {};

let sourceImage = null;
let sourceImageX = 0;
let sourceImageY = 0;
let sourceImageScale = 1;
let sourceImageOriginalBuffer = null;
let sourceImageBuffer = null;
let sourceImageCanvasBuffer = null;
let showSourceImageOverlay = false;
let sourceImageOverlayEl = null;
let drawSourceImageOnCanvas = false;
let sourceGlitchAmount = 0;
let sourceGlitchChaos = 0.5;

let debugDrawImageOnce = false;

// audio stuff
let audioContext, analyser, micStream, audioData = new Uint8Array(256);
let audioFreqData = new Uint8Array(256);
let audioPrevFreqData = new Uint8Array(256);
let audioVolume = 0;
let micGain = 3.0;
let useMic = false;
let micInitInFlight = false;
let micNextRetryAt = 0;
let micFormula = 'ampCurve';
let micEnvFast = 0;
let micEnvSlow = 0;
let micFftFluxGain = 3.0;
let micFftLowGate = 0.06;
let micFftExciteCurve = 2.2;
let micAffectsStrokeWidth = false;

let backgroundUpdate = false;
let autoDrawEnabled = false;
let entropyPaused = false;
let lastMouseX;
let lastMouseY;
let _canvas;

//_________________________________________________________________________________________________
// P5.JS CORE FUNCTIONS
//_________________________________________________________________________________________________

function setup() {
  _canvas = createCanvas(windowWidth, windowHeight);
  colorMode(HSB, 100);
  currentBgColor = color(0, 0, 0); // black
  background(currentBgColor);
  strokeCap(ROUND);
  entropy = new _entropyBundle(_entropyBundleConfig(), _entropyConfig());
  //console.log(entropy);
  
  // menu
  ui_button_menu = createButton('☰');
  ui_button_menu.position(10, 10);
  ui_button_menu.style('z-index', '10');
  ui_button_menu.style('font-size', '18px');
  ui_button_menu.mousePressed(() => {
    ui_displayed ? uiHide() : uiShow();
  });

  // Audio init (may need user gesture; retries handled by ensureMicInput)
  ensureMicInput();

  uiBuild();
  uiHide(); // Hide the old UI immediately after building it
  ui_button_menu.hide(); // Also hide the menu button
  
  // Delay Tweakpane initialization to ensure library is loaded
  setTimeout(() => {
    console.log('🔧 Attempting to build Tweakpane UI...');
    console.log('Tweakpane available?', typeof Tweakpane !== 'undefined');
    buildTweakpaneUI();
  }, 100);
  
  loadPresetsFromServer();
}

function windowResized() {
  //resizeCanvas(windowWidth, windowHeight);
}

function draw() {
  if (entropyPaused) { return; }
  if (backgroundUpdate) {
    clearCanvas();
  }

  if (mouseX !== 0 || mouseY !== 0) {
    lastMouseX = mouseX;
    lastMouseY = mouseY;
  }

  if (debugDrawImageOnce && sourceImageBuffer) {
    image(sourceImageBuffer, 0, 0);
    debugDrawImageOnce = false;
  }

  // Audio reactivity should run regardless of old UI visibility state.
  // Also recover if the browser suspended the AudioContext.
  if (useMic && (!analyser || !audioContext) && !micInitInFlight && Date.now() >= micNextRetryAt) {
    ensureMicInput();
  }
  if (analyser && useMic) {
    if (audioContext && audioContext.state === 'suspended') {
      // Might still be blocked without user gesture; UI toggle handlers retry init.
      audioContext.resume().catch(() => {});
    }
    analyser.getByteTimeDomainData(audioData);
    let sum = 0;
    for (let i = 0; i < audioData.length; i++) {
      let v = (audioData[i] - 128) / 128;
      sum += v * v;
    }
    audioVolume = Math.sqrt(sum / audioData.length);

    const micControl = computeMicControlValue();
    entropy.set_pushAmount(map(micControl, 0, 1, 0.001, 0.1, true));
    if (micAffectsStrokeWidth && entropy && entropy.def && entropy.def.controllers && entropy.def.controllers.strokeWidth) {
      const sw = entropy.def.controllers.strokeWidth;
      const strokeFromMic = map(micControl, 0, 1, sw.min, sw.max, true);
      entropy.set_strokeWidth(strokeFromMic);
    }
  }

  if (!ui_displayed) {

    if (autoDrawEnabled) {
      //console.log("walkers:", entropy?.walkers?.length);
      entropy.run(lastMouseX, lastMouseY);
    } else if (mouseIsPressed && !isMouseOverUI()) {
      entropy.run(mouseX, mouseY);
    } else {
      entropy.stop();
      if (entropy.def.controllers.allowFunky) {
        getFunky();
      }
    }
  }

  // debuggin
  /* if (mouseIsPressed) {
    const el = document.elementFromPoint(mouseX, mouseY);
    console.log("Mouse over:", el?.tagName, el?.className, el?.id);
  } */
}

function resetMicReactiveState() {
  micEnvFast = 0;
  micEnvSlow = 0;
  audioPrevFreqData.fill(0);
}

function setMicFormula(v) {
  const allowed = ['ampCurve', 'ampLift', 'envDelta', 'ampJitter', 'fftFlux'];
  micFormula = allowed.includes(v) ? v : 'ampCurve';
  resetMicReactiveState();
}

function computeMicControlValue() {
  const x = constrain(audioVolume * micGain, 0, 1);

  switch (micFormula) {
    case 'ampLift': {
      const curved = pow(x, 1.25);
      const lifted = max(curved, x * 0.35);
      return constrain(lifted, 0, 1);
    }
    case 'envDelta': {
      micEnvFast = lerp(micEnvFast, x, 0.35);
      micEnvSlow = lerp(micEnvSlow, x, 0.04);
      const delta = max(0, micEnvFast - micEnvSlow);
      const reactive = pow(micEnvSlow, 1.2) + (delta * 2.2);
      return constrain(reactive, 0, 1);
    }
    case 'ampJitter': {
      const base = pow(x, 1.2);
      const jitterAmt = 0.01 + (0.04 * base);
      const jitter = (Math.random() * 2 - 1) * jitterAmt;
      return constrain(base + jitter, 0, 1);
    }
    case 'fftFlux': {
      if (!analyser) return pow(x, 1.2);
      analyser.getByteFrequencyData(audioFreqData);
      let energy = 0;
      let flux = 0;
      for (let i = 0; i < audioFreqData.length; i++) {
        const n = audioFreqData[i] / 255;
        const p = audioPrevFreqData[i] / 255;
        energy += n;
        flux += max(0, n - p);
        audioPrevFreqData[i] = audioFreqData[i];
      }
      energy /= audioFreqData.length;
      flux /= audioFreqData.length;
      const gateDenom = max(0.0001, 1 - micFftLowGate);
      const gate = constrain((x - micFftLowGate) / gateDenom, 0, 1);
      const ampGate = pow(gate, 1.2);
      const ampExcite = pow(gate, micFftExciteCurve);
      const base = pow(constrain(energy * micGain, 0, 1), 1.1) * (0.15 + 0.85 * ampGate);
      return constrain(base + (flux * micFftFluxGain * ampExcite), 0, 1);
    }
    case 'ampCurve':
    default:
      return pow(x, 1.5);
  }
}

async function ensureMicInput() {
  if (micInitInFlight) return false;
  micInitInFlight = true;
  try {
    if (audioContext && analyser) {
      if (audioContext.state === 'suspended') {
        await audioContext.resume();
      }
      return true;
    }

    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    audioContext = new (window.AudioContext || window.webkitAudioContext)();
    micStream = audioContext.createMediaStreamSource(stream);
    analyser = audioContext.createAnalyser();
    analyser.fftSize = 512;
    micStream.connect(analyser);

    if (audioContext.state === 'suspended') {
      await audioContext.resume();
    }

    console.log('Mic input initialized');
    return true;
  } catch (err) {
    console.error('Mic init failed:', err);
    micNextRetryAt = Date.now() + 2000;
    return false;
  } finally {
    micInitInFlight = false;
  }
}

function ensureSourceOverlayElement() {
  if (sourceImageOverlayEl) return;
  sourceImageOverlayEl = createImg('', 'Source Overlay');
  sourceImageOverlayEl.style('position', 'fixed');
  sourceImageOverlayEl.style('left', '0');
  sourceImageOverlayEl.style('top', '0');
  sourceImageOverlayEl.style('width', '100vw');
  sourceImageOverlayEl.style('height', '100vh');
  sourceImageOverlayEl.style('pointer-events', 'none');
  sourceImageOverlayEl.style('object-fit', 'fill');
  sourceImageOverlayEl.style('z-index', '5');
  sourceImageOverlayEl.style('opacity', '0.8');
  sourceImageOverlayEl.hide();
}

function setShowSourceImageOverlay(v) {
  showSourceImageOverlay = !!v;
  ensureSourceOverlayElement();

  if (!sourceImageBuffer) {
    sourceImageOverlayEl.hide();
    return;
  }

  if (showSourceImageOverlay) {
    sourceImageOverlayEl.show();
  } else {
    sourceImageOverlayEl.hide();
  }
}

function setDrawSourceImageOnCanvas(v) {
  drawSourceImageOnCanvas = !!v;
  clearCanvas();
}

function _clampByte(v) {
  return Math.max(0, Math.min(255, v));
}

function _clampInt(v, minV, maxV) {
  return Math.max(minV, Math.min(maxV, Math.floor(v)));
}

function rebuildCanvasSourceBuffer() {
  if (!sourceImageOriginalBuffer) {
    sourceImageCanvasBuffer = null;
    sourceImageBuffer = null;
    return;
  }

  const g = createGraphics(width, height);
  g.image(sourceImageOriginalBuffer, 0, 0);

  const amt = Math.max(0, Math.min(1, sourceGlitchAmount));
  const chaos = Math.max(0, Math.min(1, sourceGlitchChaos));
  const intensity = Math.max(0, Math.min(1, amt * (0.4 + chaos * 0.9)));
  if (amt > 0) {
    const blocks = Math.floor(map(intensity, 0, 1, 0, 700));
    const maxBlock = Math.floor(map(intensity, 0, 1, 6, 180));
    const maxShift = Math.floor(map(intensity, 0, 1, 2, 180));

    for (let i = 0; i < blocks; i++) {
      const bw = Math.floor(random(4, maxBlock));
      const bh = Math.floor(random(4, maxBlock));
      const sx = Math.floor(random(0, Math.max(1, width - bw)));
      const sy = Math.floor(random(0, Math.max(1, height - bh)));
      const dx = Math.floor(constrain(sx + random(-maxShift, maxShift), 0, width - bw));
      const dy = Math.floor(constrain(sy + random(-maxShift, maxShift), 0, height - bh));
      g.copy(g, sx, sy, bw, bh, dx, dy, bw, bh);
    }

    // Horizontal tear lines
    const tears = Math.floor(map(intensity, 0, 1, 0, 180));
    for (let i = 0; i < tears; i++) {
      const y = Math.floor(random(0, height));
      const h = Math.floor(random(1, Math.max(2, map(chaos, 0, 1, 4, 20))));
      const shift = Math.floor(random(-maxShift, maxShift));
      const dy = _clampInt(y, 0, Math.max(0, height - h));
      const dx = _clampInt(shift, -width, width);
      g.copy(g, 0, dy, width, h, dx, dy, width, h);
    }

    g.loadPixels();
    const totalPixels = g.pixels.length / 4;
    const px = g.pixels.slice(); // snapshot for channel-shift sampling
    const saltCount = Math.floor(totalPixels * map(intensity, 0, 1, 0, 0.08));
    const jitter = map(intensity, 0, 1, 0, 140);
    const shiftPx = Math.floor(map(intensity, 0, 1, 0, 12));

    // RGB channel misalignment
    if (shiftPx > 0) {
      const rdx = _clampInt(random(-shiftPx, shiftPx), -shiftPx, shiftPx);
      const gdy = _clampInt(random(-shiftPx, shiftPx), -shiftPx, shiftPx);
      const bdx = _clampInt(random(-shiftPx, shiftPx), -shiftPx, shiftPx);

      for (let y = 0; y < height; y++) {
        for (let x = 0; x < width; x++) {
          const i = (y * width + x) * 4;
          const rx = _clampInt(x + rdx, 0, width - 1);
          const gy = _clampInt(y + gdy, 0, height - 1);
          const bx = _clampInt(x + bdx, 0, width - 1);
          const ri = (y * width + rx) * 4;
          const gi = (gy * width + x) * 4;
          const bi = (y * width + bx) * 4;
          g.pixels[i] = px[ri];
          g.pixels[i + 1] = px[gi + 1];
          g.pixels[i + 2] = px[bi + 2];
        }
      }
    }

    // Posterize by reducing channel precision
    const levels = _clampInt(map(intensity, 0, 1, 256, 10), 2, 256);
    const qStep = 255 / (levels - 1);
    for (let i = 0; i < g.pixels.length; i += 4) {
      g.pixels[i] = Math.round(g.pixels[i] / qStep) * qStep;
      g.pixels[i + 1] = Math.round(g.pixels[i + 1] / qStep) * qStep;
      g.pixels[i + 2] = Math.round(g.pixels[i + 2] / qStep) * qStep;
    }

    for (let i = 0; i < saltCount; i++) {
      const p = Math.floor(random(totalPixels));
      const idx = p * 4;
      g.pixels[idx] = _clampByte(g.pixels[idx] + random(-jitter, jitter));
      g.pixels[idx + 1] = _clampByte(g.pixels[idx + 1] + random(-jitter, jitter));
      g.pixels[idx + 2] = _clampByte(g.pixels[idx + 2] + random(-jitter, jitter));
    }

    // Invert random chunks for harsher corruption
    const invertBlocks = Math.floor(map(intensity, 0, 1, 0, 65));
    for (let b = 0; b < invertBlocks; b++) {
      const bw = Math.floor(random(6, Math.max(8, maxBlock)));
      const bh = Math.floor(random(6, Math.max(8, maxBlock)));
      const sx = Math.floor(random(0, Math.max(1, width - bw)));
      const sy = Math.floor(random(0, Math.max(1, height - bh)));
      for (let yy = sy; yy < sy + bh; yy++) {
        for (let xx = sx; xx < sx + bw; xx++) {
          const idx = (yy * width + xx) * 4;
          g.pixels[idx] = 255 - g.pixels[idx];
          g.pixels[idx + 1] = 255 - g.pixels[idx + 1];
          g.pixels[idx + 2] = 255 - g.pixels[idx + 2];
        }
      }
    }

    g.updatePixels();
  }

  sourceImageCanvasBuffer = g;
  sourceImageBuffer = g; // Active source for both sampling and canvas drawing
  updateSourceImageOverlayImage();
}

function setSourceGlitchAmount(v) {
  sourceGlitchAmount = Math.max(0, Math.min(1, Number(v) || 0));
  rebuildCanvasSourceBuffer();
  if (drawSourceImageOnCanvas) {
    clearCanvas();
  }
}

function setSourceGlitchChaos(v) {
  sourceGlitchChaos = Math.max(0, Math.min(1, Number(v) || 0.5));
  rebuildCanvasSourceBuffer();
  if (drawSourceImageOnCanvas) {
    clearCanvas();
  }
}

function updateSourceImageOverlayImage() {
  if (!sourceImageBuffer) return;
  ensureSourceOverlayElement();
  sourceImageOverlayEl.attribute('src', sourceImageBuffer.canvas.toDataURL('image/png'));
  if (showSourceImageOverlay) sourceImageOverlayEl.show();
}

function keyPressed() {
  if (keyCode === SHIFT) {
    if (ui_displayed) {
      uiHide();
    } else {
      uiShow();
    }
  }

  if (key === 'a' || key === 'A') {
    autoDrawEnabled = !autoDrawEnabled;
    syncTweakpaneValues(); // Sync Tweakpane autoDraw checkbox
  }

  if (key === 'r' || key === 'R') {
    resetEntropy();
  }

  // H key - Toggle ALL UIs (both old UI and Tweakpane)
  if (key === 'h' || key === 'H') {
    allUIsVisible = !allUIsVisible;
    if (allUIsVisible) {
      showAllUIs();
    } else {
      hideAllUIs();
    }
  }

  // C key - Clear canvas
  if (key === 'c' || key === 'C') {
    clearCanvas();
  }
}

function hideAllUIs() {
  // Hide old UI
  if (ui_displayed) {
    uiHide();
  }
  
  // Hide Tweakpane
  if (tweakpane && tweakpane.element) {
    tweakpane.element.style.display = 'none';
  }
  
  showToast('UIs hidden - Press H to show', 2000);
}

function showAllUIs() {
  // Show old UI (but keep it hidden by default - user can toggle with SHIFT)
  // Don't automatically show old UI, just make it available
  
  // Show Tweakpane
  if (tweakpane && tweakpane.element) {
    tweakpane.element.style.display = 'block';
  }
  
  showToast('UIs visible - Press H to hide', 2000);
}

//_________________________________________________________________________________________________
// UTILITY FUNCTIONS
//_________________________________________________________________________________________________

function isMouseOverUI() {
  const el = document.elementFromPoint(mouseX, mouseY);
  return el && el !== _canvas.elt && el !== document.body;
}

function isMouseOverCanvas() {
  return (mouseX >= 0 && mouseX < width && mouseY >= 0 && mouseY < height);
}

function getFunky() {
  entropy.set_baseSpread(Math.floor(getRand(100, 500)));
  entropy.set_pushAmount(getRand(0.005, 0.05));
  entropy.set_fixedAngle((getRand(0, 1) > 0.5)?true:false);
  ui_label_baseSpreadValue.html(ui_slide_baseSpread.value());
  ui_label_pushAmountValue.html(ui_slide_pushAmount.value());
  ui_label_opacityValue.html(ui_slide_opacity.value());
  ui_label_strokeWidthValue.html(ui_slide_strokeWidth.value());
};

function getRand(min, max) {
  return Math.random() * (max - min) + min;
};

function clearCanvas() {
  clear();
  background(currentBgColor);
  if (drawSourceImageOnCanvas && sourceImageBuffer) {
    if (!sourceImageCanvasBuffer) rebuildCanvasSourceBuffer();
    image(sourceImageCanvasBuffer || sourceImageBuffer, 0, 0);
  }
  //uiHide();
}

function resetEntropy() {
  // possibly stop auto draw then re-enable right after
  entropyPaused = true;
  let toggle = autoDrawEnabled;
  if(toggle) {autoDrawEnabled = false;}
  entropy.stop();
  
  // Reset walkers but preserve current settings by doing a deep copy
  // Create a fresh config and manually copy all the current values
  let currentDef = _entropyBundleConfig();
  
  // Preserve bundleDef values
  currentDef.bundleDef.brushCount.val = entropy.def.bundleDef.brushCount.val;
  currentDef.bundleDef.pushOffset.val = entropy.def.bundleDef.pushOffset.val;
  currentDef.bundleDef.noiseMapOffset_X.val = entropy.def.bundleDef.noiseMapOffset_X.val;
  currentDef.bundleDef.noiseMapOffset_Y.val = entropy.def.bundleDef.noiseMapOffset_Y.val;
  
  // Preserve all controller values (this is the important part)
  currentDef.controllers.strokeWidth.val = entropy.def.controllers.strokeWidth.val;
  currentDef.controllers.opacity.val = entropy.def.controllers.opacity.val;
  currentDef.controllers.baseSpread.val = entropy.def.controllers.baseSpread.val;
  currentDef.controllers.spreadAmount.val = entropy.def.controllers.spreadAmount.val;
  currentDef.controllers.pushAmount.val = entropy.def.controllers.pushAmount.val; // THIS ONE!
  currentDef.controllers.lineOffset_X.val = entropy.def.controllers.lineOffset_X.val;
  currentDef.controllers.lineOffset_Y.val = entropy.def.controllers.lineOffset_Y.val;
  currentDef.controllers.lineOffset_Times.val = entropy.def.controllers.lineOffset_Times.val;
  currentDef.controllers.colorBlendMode = entropy.def.controllers.colorBlendMode;
  currentDef.controllers.colorHue.val = entropy.def.controllers.colorHue.val;
  currentDef.controllers.colorHue.min = entropy.def.controllers.colorHue.min;
  currentDef.controllers.colorHue.max = entropy.def.controllers.colorHue.max;
  currentDef.controllers.colorSaturation.val = entropy.def.controllers.colorSaturation.val;
  currentDef.controllers.colorSaturation.min = entropy.def.controllers.colorSaturation.min;
  currentDef.controllers.colorSaturation.max = entropy.def.controllers.colorSaturation.max;
  currentDef.controllers.colorBrightness.val = entropy.def.controllers.colorBrightness.val;
  currentDef.controllers.colorBrightness.min = entropy.def.controllers.colorBrightness.min;
  currentDef.controllers.colorBrightness.max = entropy.def.controllers.colorBrightness.max;
  currentDef.controllers.useBrushColor = entropy.def.controllers.useBrushColor;
  currentDef.controllers.brushColorHue = entropy.def.controllers.brushColorHue;
  currentDef.controllers.brushColorSaturation = entropy.def.controllers.brushColorSaturation;
  currentDef.controllers.brushColorBrightness = entropy.def.controllers.brushColorBrightness;
  currentDef.controllers.fixedAngle = entropy.def.controllers.fixedAngle;
  currentDef.controllers.updateXY = entropy.def.controllers.updateXY;
  currentDef.controllers.alwaysStep = entropy.def.controllers.alwaysStep;
  currentDef.controllers.sampleColor = entropy.def.controllers.sampleColor;
  currentDef.controllers.spreadOscillation = entropy.def.controllers.spreadOscillation;
  currentDef.controllers.spreadOscillationAmplitude = entropy.def.controllers.spreadOscillationAmplitude;
  currentDef.controllers.allowFunky = entropy.def.controllers.allowFunky;
  currentDef.controllers.boundaryShape = entropy.def.controllers.boundaryShape;
  currentDef.controllers.noiseModel = entropy.def.controllers.noiseModel;
  currentDef.controllers.perlinOctaves.val = entropy.def.controllers.perlinOctaves.val;
  currentDef.controllers.perlinFalloff.val = entropy.def.controllers.perlinFalloff.val;
  currentDef.controllers.perlinScale.val = entropy.def.controllers.perlinScale.val;
  currentDef.controllers.valueScale.val = entropy.def.controllers.valueScale.val;
  currentDef.controllers.valueSmoothness.val = entropy.def.controllers.valueSmoothness.val;
  currentDef.controllers.hashScale.val = entropy.def.controllers.hashScale.val;
  currentDef.controllers.hashSteps.val = entropy.def.controllers.hashSteps.val;
  currentDef.controllers.fbmBaseModel = entropy.def.controllers.fbmBaseModel;
  currentDef.controllers.fbmOctaves.val = entropy.def.controllers.fbmOctaves.val;
  currentDef.controllers.fbmLacunarity.val = entropy.def.controllers.fbmLacunarity.val;
  currentDef.controllers.fbmGain.val = entropy.def.controllers.fbmGain.val;
  currentDef.controllers.fbmScale.val = entropy.def.controllers.fbmScale.val;
  currentDef.controllers.ridgedOctaves.val = entropy.def.controllers.ridgedOctaves.val;
  currentDef.controllers.ridgedLacunarity.val = entropy.def.controllers.ridgedLacunarity.val;
  currentDef.controllers.ridgedGain.val = entropy.def.controllers.ridgedGain.val;
  currentDef.controllers.ridgedScale.val = entropy.def.controllers.ridgedScale.val;
  currentDef.controllers.worleyScale.val = entropy.def.controllers.worleyScale.val;
  currentDef.controllers.worleyJitter.val = entropy.def.controllers.worleyJitter.val;
  currentDef.controllers.domainWarpScale.val = entropy.def.controllers.domainWarpScale.val;
  currentDef.controllers.domainWarpStrength.val = entropy.def.controllers.domainWarpStrength.val;
  currentDef.controllers.domainWarpFreq.val = entropy.def.controllers.domainWarpFreq.val;
  currentDef.controllers.domainWarpOctaves.val = entropy.def.controllers.domainWarpOctaves.val;
  
  // Preserve counter step values
  currentDef.counters.c1.step = entropy.def.counters.c1.step;
  currentDef.counters.c2.step = entropy.def.counters.c2.step;
  currentDef.counters.c3.step = entropy.def.counters.c3.step;
  currentDef.counters.c4.step = entropy.def.counters.c4.step;
  currentDef.counters.c5.step = entropy.def.counters.c5.step;
  // Reset counter values to 0 for fresh cycling
  currentDef.counters.c1.val = 0;
  currentDef.counters.c2.val = 0;
  currentDef.counters.c3.val = 0;
  currentDef.counters.c4.val = 0;
  currentDef.counters.c5.val = 0;
  
  entropy = new _entropyBundle(currentDef);
  
  // Don't call uiParamChanged() - it would overwrite our preserved values with old UI slider values
  // Just sync the Tweakpane to show the preserved values
  syncTweakpaneValues();
  
  if(toggle) {autoDrawEnabled = true;}
  if (ui_displayed) {
    uiHide();
    uiShow();
  }

  // need this frame pause to let everything settle on down
  setTimeout(() => {
    entropyPaused = false;
  }, 10);
}

//_________________________________________________________________________________________________
// PRESET FUNCTIONS
//_________________________________________________________________________________________________

function getPresetObject() {
  const preset = {
    timestamp: Date.now(),
    bundleDef: (entropy && entropy.def && entropy.def.bundleDef) ? entropy.def.bundleDef : null,
    controllers: (entropy && entropy.def && entropy.def.controllers) ? entropy.def.controllers : null,
    counters: (entropy && entropy.def && entropy.def.counters) ? entropy.def.counters : null,
    meta: {
      bgColor: (ui_colorPicker_bg && ui_colorPicker_bg.value) ? ui_colorPicker_bg.value() : null,
      useMic: useMic,
      micGain: micGain,
      micFormula: micFormula,
      micFftFluxGain: micFftFluxGain,
      micFftLowGate: micFftLowGate,
      micFftExciteCurve: micFftExciteCurve,
      micAffectsStrokeWidth: micAffectsStrokeWidth,
      showSourceImageOverlay: showSourceImageOverlay,
      drawSourceImageOnCanvas: drawSourceImageOnCanvas,
      sourceGlitchAmount: sourceGlitchAmount,
      sourceGlitchChaos: sourceGlitchChaos
    }
  };
  return preset;
}

function openPresetModal() {
  const obj = getPresetObject();
  const json = JSON.stringify(obj, null, 2);

  if (!ui_preset_modal) {
    ui_preset_modal = createDiv();
    ui_preset_modal.style('position', 'fixed');
    ui_preset_modal.style('left', '0');
    ui_preset_modal.style('top', '0');
    ui_preset_modal.style('width', '100%');
    ui_preset_modal.style('height', '100%');
    ui_preset_modal.style('background', 'rgba(0,0,0,0.7)');
    ui_preset_modal.style('z-index', '1000');
    ui_preset_modal.style('display', 'flex');
    ui_preset_modal.style('align-items', 'center');
    ui_preset_modal.style('justify-content', 'center');

    const inner = createDiv();
    inner.parent(ui_preset_modal);
    inner.style('background', '#222');
    inner.style('padding', '12px');
    inner.style('width', '600px');
    inner.style('max-height', '80%');
    inner.style('overflow', 'auto');
    inner.style('color', '#fff');

    createDiv('Preset Name:').parent(inner).style('margin-bottom', '6px');
    ui_preset_filenameInput = createInput('');
    ui_preset_filenameInput.parent(inner);
    ui_preset_filenameInput.style('width', '100%');
    ui_preset_filenameInput.style('margin-bottom', '8px');

    createDiv('Preset JSON:').parent(inner).style('margin', '6px 0');
    ui_preset_textarea = createElement('textarea');
    ui_preset_textarea.parent(inner);
    ui_preset_textarea.elt.style.width = '100%';
    ui_preset_textarea.elt.style.height = '300px';
    ui_preset_textarea.elt.value = json;

    const btnRow = createDiv();
    btnRow.parent(inner);
    btnRow.style('display', 'flex');
    btnRow.style('justify-content', 'flex-end');
    btnRow.style('gap', '8px');
    btnRow.style('margin-top', '8px');

    ui_preset_cancelButton = createButton('Cancel');
    ui_preset_cancelButton.parent(btnRow);
    ui_preset_cancelButton.mousePressed(closePresetModal);

    ui_preset_saveButton = createButton('Save Preset');
    ui_preset_saveButton.parent(btnRow);
    ui_preset_saveButton.mousePressed(savePresetFromModal);
  } else {
    ui_preset_textarea.elt.value = json;
  }

  const suggested = 'preset_' + Date.now();
  if (ui_preset_filenameInput && ui_preset_filenameInput.value) {
    ui_preset_filenameInput.value(suggested);
  }
  ui_preset_modal.show();
}

function closePresetModal() {
  if (ui_preset_modal) ui_preset_modal.hide();
}

function savePresetFromModal() {
  if (!ui_preset_textarea) return;
  let txt = ui_preset_textarea.elt.value;
  try {
    const parsed = JSON.parse(txt);
    let filename = (ui_preset_filenameInput && ui_preset_filenameInput.value) ? ui_preset_filenameInput.value().trim() : '';
    if (!filename) filename = 'preset_' + Date.now();
    if (!filename.toLowerCase().endsWith('.json')) filename += '.json';

    const blob = new Blob([JSON.stringify(parsed, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = createA(url, filename);
    a.elt.download = filename;
    a.elt.click();
    URL.revokeObjectURL(url);
    closePresetModal();
  } catch (e) {
    alert('Invalid JSON: ' + e.message);
  }
}

// Preset loading & applying
function handlePresetFiles(file) {
  // p5 createFileInput passes an object or FileList; support both
  if (!file) return;
  if (file.files && file.files.length) {
    // multiple files
    for (let i = 0; i < file.files.length; i++) {
      const f = file.files[i];
      readPresetFileObject(f);
    }
  } else if (Array.isArray(file)) {
    file.forEach(f => readPresetFileObject(f));
  } else if (file.name && file.data) {
    // p5 passes a {name,data,type} object when using createFileInput
    try {
      const parsed = JSON.parse(file.data);
      registerPreset(file.name.replace(/\.json$/i, ''), parsed);
    } catch (e) {
      console.error('Failed to parse preset from p5 file input', e);
    }
  }
}

function readPresetFileObject(f) {
  const reader = new FileReader();
  reader.onload = function(e) {
    try {
      const parsed = JSON.parse(e.target.result);
      const name = (f.name || ('preset_' + Date.now())).replace(/\.json$/i, '');
      registerPreset(name, parsed);
    } catch (err) {
      console.error('Error parsing preset file', f.name, err);
    }
  };
  reader.readAsText(f);
}

function registerPreset(name, obj) {
  _presetsStore[name] = obj;
  // update select options
  // remove existing option if present
  let found = false;
  for (let i = 0; i < ui_select_presets.elt.options.length; i++) {
    if (ui_select_presets.elt.options[i].value === name) { found = true; break; }
  }
  if (!found) ui_select_presets.option(name);
  
  // Update Tweakpane dropdown if it exists
  updateTweakpanePresetList();
}

function applySelectedPreset() {
  const name = ui_select_presets.value();
  if (!name || name === '-- Select Preset --') { alert('Select a preset first'); return; }
  const preset = _presetsStore[name];
  if (!preset) { alert('Preset not found'); return; }
  applyPresetObject(preset);
  // show a small confirmation toast
  if (typeof showToast === 'function') showToast('Applied preset: ' + name, 2500);
}

function applyPresetObject(preset) {
  if (!preset) return;
  
  // Save current color settings before applying preset
  const currentColorSettings = {
    colorHue: entropy.def.controllers.colorHue ? { ...entropy.def.controllers.colorHue } : null,
    colorSaturation: entropy.def.controllers.colorSaturation ? { ...entropy.def.controllers.colorSaturation } : null,
    colorBrightness: entropy.def.controllers.colorBrightness ? { ...entropy.def.controllers.colorBrightness } : null,
    useBrushColor: entropy.def.controllers.useBrushColor,
    brushColorHue: entropy.def.controllers.brushColorHue,
    brushColorSaturation: entropy.def.controllers.brushColorSaturation,
    brushColorBrightness: entropy.def.controllers.brushColorBrightness,
    sampleColor: entropy.def.controllers.sampleColor,
    colorBlendMode: entropy.def.controllers.colorBlendMode,
    opacity: entropy.def.controllers.opacity ? { ...entropy.def.controllers.opacity } : null,
    strokeWidth: entropy.def.controllers.strokeWidth ? { ...entropy.def.controllers.strokeWidth } : null
  };
  
  const currentBgColorValue = currentBgColor;
  
  // Apply controllers from preset
    if (preset.controllers) {
    const c = preset.controllers;
    // copy known values back to entropy.def.controllers and UI
    if (c.baseSpread && c.baseSpread.val !== undefined) ui_slide_baseSpread.value(c.baseSpread.val);
    if (c.pushAmount && c.pushAmount.val !== undefined) ui_slide_pushAmount.value(c.pushAmount.val);
    if (c.opacity && c.opacity.val !== undefined) ui_slide_opacity.value(c.opacity.val);
    if (c.strokeWidth && c.strokeWidth.val !== undefined) ui_slide_strokeWidth.value(c.strokeWidth.val);
    if (c.fixedAngle !== undefined) ui_checkbox_fixedAngle.checked(c.fixedAngle);
    if (c.spreadOscillation !== undefined) ui_checkbox_spreadOscillation.checked(c.spreadOscillation);
    if (c.spreadOscillationAmplitude !== undefined) ui_slide_oscAmp.value(c.spreadOscillationAmplitude);
    if (c.allowFunky !== undefined) ui_checkbox_allowFunky.checked(c.allowFunky);
    if (c.sampleColor !== undefined) ui_checkbox_sampleColor.checked(c.sampleColor);
    if (c.colorBlendMode !== undefined) ui_dropdown_blendMode.selected(c.colorBlendMode);
    // update mic settings
    if (preset.meta) {
      if (preset.meta.bgColor) ui_colorPicker_bg.value(preset.meta.bgColor);
      if (preset.meta.useMic !== undefined) { useMic = preset.meta.useMic; ui_checkbox_useMic.checked(useMic); }
      if (preset.meta.micGain !== undefined) { micGain = preset.meta.micGain; ui_slider_micGain.value(micGain); ui_label_micGainValue.html(micGain.toFixed(1)); }
      if (preset.meta.micFormula !== undefined) { setMicFormula(preset.meta.micFormula); }
      if (preset.meta.micFftFluxGain !== undefined) { micFftFluxGain = preset.meta.micFftFluxGain; }
      if (preset.meta.micFftLowGate !== undefined) { micFftLowGate = preset.meta.micFftLowGate; }
      if (preset.meta.micFftExciteCurve !== undefined) { micFftExciteCurve = preset.meta.micFftExciteCurve; }
      if (preset.meta.micAffectsStrokeWidth !== undefined) { micAffectsStrokeWidth = !!preset.meta.micAffectsStrokeWidth; }
      if (preset.meta.showSourceImageOverlay !== undefined) {
        setShowSourceImageOverlay(preset.meta.showSourceImageOverlay);
      }
      if (preset.meta.drawSourceImageOnCanvas !== undefined) {
        setDrawSourceImageOnCanvas(preset.meta.drawSourceImageOnCanvas);
      }
      if (preset.meta.sourceGlitchAmount !== undefined) {
        setSourceGlitchAmount(preset.meta.sourceGlitchAmount);
      }
      if (preset.meta.sourceGlitchChaos !== undefined) {
        setSourceGlitchChaos(preset.meta.sourceGlitchChaos);
      }
    }
  }

  // Apply bundleDef and controllers by reconstructing entropy
  const cfg = _entropyBundleConfig(preset || null);
  const walker = _entropyConfig(preset.controllers || null);

  // Backward compatibility for older presets: fill any missing keys from current defaults
  const defaultCfg = _entropyBundleConfig();
  if (!cfg.bundleDef) cfg.bundleDef = {};
  if (!cfg.controllers) cfg.controllers = {};
  if (!cfg.counters) cfg.counters = {};

  Object.keys(defaultCfg.bundleDef).forEach(key => {
    if (!cfg.bundleDef.hasOwnProperty(key)) {
      cfg.bundleDef[key] = JSON.parse(JSON.stringify(defaultCfg.bundleDef[key]));
    }
  });
  Object.keys(defaultCfg.controllers).forEach(key => {
    if (!cfg.controllers.hasOwnProperty(key)) {
      cfg.controllers[key] = JSON.parse(JSON.stringify(defaultCfg.controllers[key]));
    }
  });
  Object.keys(defaultCfg.counters).forEach(key => {
    if (!cfg.counters.hasOwnProperty(key)) {
      cfg.counters[key] = JSON.parse(JSON.stringify(defaultCfg.counters[key]));
    }
  });
  
  // Restore color settings if they were not in the preset
  if (preset.controllers) {
    // If color properties are missing from preset, restore saved values
    if (!preset.controllers.hasOwnProperty('colorHue') && currentColorSettings.colorHue) {
      cfg.controllers.colorHue = currentColorSettings.colorHue;
    }
    if (!preset.controllers.hasOwnProperty('colorSaturation') && currentColorSettings.colorSaturation) {
      cfg.controllers.colorSaturation = currentColorSettings.colorSaturation;
    }
    if (!preset.controllers.hasOwnProperty('colorBrightness') && currentColorSettings.colorBrightness) {
      cfg.controllers.colorBrightness = currentColorSettings.colorBrightness;
    }
    if (!preset.controllers.hasOwnProperty('useBrushColor')) {
      cfg.controllers.useBrushColor = currentColorSettings.useBrushColor;
    }
    if (!preset.controllers.hasOwnProperty('brushColorHue')) {
      cfg.controllers.brushColorHue = currentColorSettings.brushColorHue;
    }
    if (!preset.controllers.hasOwnProperty('brushColorSaturation')) {
      cfg.controllers.brushColorSaturation = currentColorSettings.brushColorSaturation;
    }
    if (!preset.controllers.hasOwnProperty('brushColorBrightness')) {
      cfg.controllers.brushColorBrightness = currentColorSettings.brushColorBrightness;
    }
    if (!preset.controllers.hasOwnProperty('sampleColor')) {
      cfg.controllers.sampleColor = currentColorSettings.sampleColor;
    }
    if (!preset.controllers.hasOwnProperty('colorBlendMode')) {
      cfg.controllers.colorBlendMode = currentColorSettings.colorBlendMode;
    }
    if (!preset.controllers.hasOwnProperty('opacity') && currentColorSettings.opacity) {
      cfg.controllers.opacity = currentColorSettings.opacity;
    }
    if (!preset.controllers.hasOwnProperty('strokeWidth') && currentColorSettings.strokeWidth) {
      cfg.controllers.strokeWidth = currentColorSettings.strokeWidth;
    }
  }
  
  // Restore background color if not in preset meta
  if (!preset.meta || !preset.meta.bgColor) {
    currentBgColor = currentBgColorValue;
  }
  
  entropy = new _entropyBundle(cfg, walker);
  
  // Sync old UI FROM entropy values (not the other way around)
  // This updates the UI sliders to match the loaded preset without overwriting entropy
  syncOldUIFromEntropy();
  
  // Rebuild the Tweakpane UI to show the loaded preset values
  buildTweakpaneUI();
  
  // Also sync Tweakpane params to ensure everything is in sync
  syncTweakpaneValues();
  
  // clearCanvas(); // commented out to preserve previous canvas state
}

function loadPresetsFromServer() {
  // Try several likely locations for the preset index so the server root
  // or serving folder doesn't break loading. When an index is found we
  // use its base path to fetch each listed preset.
  const candidates = [
    '/preset_brush/index.json',
    'preset_brush/index.json',
    '../preset_brush/index.json',
    '/dist/preset_brush/index.json',
    'dist/preset_brush/index.json'
  ];

  function tryFetchIndex(listPaths, idx = 0) {
    if (idx >= listPaths.length) {
      console.log('No preset index found at any expected location');
      return;
    }
    const attempt = listPaths[idx];
    fetch(attempt).then(res => {
      if (!res.ok) throw new Error('Index not found: ' + res.status);
      return res.json().then(list => ({ list, base: attempt.replace(/index\.json$/i, '') }));
    }).then(({ list, base }) => {
      if (!Array.isArray(list)) return;
      console.log(`✅ Found preset index at ${attempt}, loading ${list.length} presets...`);
      list.forEach(item => {
        if (typeof item === 'string') {
          const file = base + item;
          fetch(file).then(r => r.json()).then(p => {
            registerPreset(item.replace(/\.json$/i,''), p);
            console.log(`✅ Loaded preset: ${item}`);
          }).catch(e => console.warn('Failed to load preset', file, e));
        } else if (item && item.file) {
          const file = base + item.file;
          fetch(file).then(r => r.json()).then(p => {
            registerPreset(item.name || item.file.replace(/\.json$/i,''), p);
            console.log(`✅ Loaded preset: ${item.name || item.file}`);
          }).catch(e => console.warn('Failed to load preset', file, e));
        }
      });
    }).catch(err => {
      console.warn('Failed to fetch preset index at', attempt, err);
      tryFetchIndex(listPaths, idx + 1);
    });
  }

  tryFetchIndex(candidates);
}

//_________________________________________________________________________________________________
// IMAGE FUNCTIONS
//_________________________________________________________________________________________________

function handleImage(file) {
  if (file.type === 'image') {
    loadImage(file.data, img => {
      sourceImage = img;

      // Proportional mane
      let canvasRatio = width / height;
      let imageRatio = img.width / img.height;

      if (imageRatio > canvasRatio) {
        sourceImageScale = width / img.width;
      } else {
        sourceImageScale = height / img.height;
      }

      let scaledW = Math.floor(img.width * sourceImageScale);
      let scaledH = Math.floor(img.height * sourceImageScale);

      sourceImageX = Math.floor((width - scaledW) / 2);
      sourceImageY = Math.floor((height - scaledH) / 2);

      sourceImageOriginalBuffer = createGraphics(width, height);
      sourceImageOriginalBuffer.image(img, sourceImageX, sourceImageY, scaledW, scaledH);
      sourceImageOriginalBuffer.loadPixels();
      rebuildCanvasSourceBuffer();
      setShowSourceImageOverlay(showSourceImageOverlay);
      clearCanvas();
    });
  }
}

function exportImage() {
  noLoop();
  setTimeout(() => {
    saveCanvas('entropic_noise_' + Date.now(), 'png');
    loop();
  }, 100); 
}

//_________________________________________________________________________________________________
// TOAST NOTIFICATION
//_________________________________________________________________________________________________

// Simple toast helper for small confirmations
function showToast(msg, duration) {
  duration = duration || 2000;
  if (!ui_toast_div) {
    ui_toast_div = createDiv('');
    ui_toast_div.style('position', 'fixed');
    ui_toast_div.style('left', '50%');
    ui_toast_div.style('transform', 'translateX(-50%)');
    ui_toast_div.style('bottom', '24px');
    ui_toast_div.style('background', 'rgba(0,0,0,0.75)');
    ui_toast_div.style('color', '#fff');
    ui_toast_div.style('padding', '8px 12px');
    ui_toast_div.style('border-radius', '6px');
    ui_toast_div.style('z-index', '2000');
    ui_toast_div.style('font-family', 'sans-serif');
    ui_toast_div.style('font-size', '13px');
    ui_toast_div.hide();
  }
  ui_toast_div.html(msg);
  ui_toast_div.show();
  if (ui_toast_timer) clearTimeout(ui_toast_timer);
  ui_toast_timer = setTimeout(() => {
    if (ui_toast_div) ui_toast_div.hide();
    ui_toast_timer = null;
  }, duration);
}
