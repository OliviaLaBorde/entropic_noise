let entropy;
let ui_slide_baseSpread;
let ui_slide_pushAmount;
let ui_slide_strokeWidth;
let ui_slide_opacity;
let ui_checkbox_fixedAngle;
let ui_displayed;
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

let sourceImage = null;
let sourceImageX = 0;
let sourceImageY = 0;
let sourceImageScale = 1;
let sourceImageBuffer = null;

let debugDrawImageOnce = false;

// audio stuff
let audioContext, analyser, micStream, audioData = new Uint8Array(256);
let audioVolume = 0;
let micGain = 3.0;
let useMic = false;

let backgroundUpdate = false;
let autoDrawEnabled = false;
let entropyPaused = false;
let lastMouseX;
let lastMouseY;
let _canvas;

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

  // audio set up
  navigator.mediaDevices.getUserMedia({ audio: true }).then(stream => {
    audioContext = new (window.AudioContext || window.webkitAudioContext)();
    micStream = audioContext.createMediaStreamSource(stream);
    analyser = audioContext.createAnalyser();
    analyser.fftSize = 512;
    micStream.connect(analyser);
  
    console.log("🎤 Raw mic input initialized");
  }).catch(err => {
    console.error("🚫 Mic access denied:", err);
  });

  uiBuild();
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

  if (!ui_displayed) {

    // Audio stuff
    if (analyser && useMic) {
      analyser.getByteTimeDomainData(audioData);
      let sum = 0;
      for (let i = 0; i < audioData.length; i++) {
        let v = (audioData[i] - 128) / 128;
        sum += v * v;
      }
      audioVolume = Math.sqrt(sum / audioData.length);

      // drive walker behavior
      //entropy.set_pushAmount(map(audioVolume, 0, 0.1, 0.001, 0.08));

      // she got curves
      let curved = pow(constrain(audioVolume * micGain, 0, 1), 1.5); // or try sqrt(audioVolume)
      //let curved = sqrt(constrain(audioVolume * micGain, 0, 1));
      //let curved = pow(constrain(audioVolume * 5.0, 0, 1), 2.0);
      entropy.set_pushAmount(map(curved, 0, 0.2, 0.001, 0.08));
    }

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
  //uiHide();
}

function resetEntropy() {
  // possibly stop auto draw then re-enable right after
  entropyPaused = true;
  let toggle = autoDrawEnabled;
  if(toggle) {autoDrawEnabled = false;}
  entropy.stop();
  entropy = new _entropyBundle(_entropyBundleConfig(), _entropyConfig());
  uiParamChanged();
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

function exportImage() {
  noLoop();
  setTimeout(() => {
    saveCanvas('entropic_noise_' + Date.now(), 'png');
    loop();
  }, 100); 
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
  }

  if (key === 'r' || key === 'R') {
    resetEntropy();
  }
}

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

      sourceImageBuffer = createGraphics(width, height);
      sourceImageBuffer.image(img, sourceImageX, sourceImageY, scaledW, scaledH); 
      sourceImageBuffer.loadPixels();

      clearCanvas();
    });
  }
}


function uiBuild() {
  let y = 40;

  ui_label_baseSpread = createDiv('Base Spread:');
  ui_label_baseSpread.position(10, y);
  ui_label_baseSpread.style('color', '#ffffff');
  ui_label_baseSpreadValue = createDiv(entropy.def.controllers.baseSpread.val);
  ui_label_baseSpreadValue.position(180, y);
  ui_label_baseSpreadValue.style('color', '#ffffff');
  y += 20;

  ui_slide_baseSpread = createSlider(entropy.def.controllers.baseSpread.min, entropy.def.controllers.baseSpread.max, entropy.def.controllers.baseSpread.val, entropy.def.controllers.baseSpread.step);
  ui_slide_baseSpread.position(10, y);
  ui_slide_baseSpread.size(450);
  ui_slide_baseSpread.changed(uiParamChanged);
  y += 30;

  ui_label_pushAmount = createDiv('Push Amount:');
  ui_label_pushAmount.position(10, y);
  ui_label_pushAmount.style('color', '#ffffff');
  ui_label_pushAmountValue = createDiv(entropy.def.controllers.pushAmount.val);
  ui_label_pushAmountValue.position(180, y);
  ui_label_pushAmountValue.style('color', '#ffffff');
  y += 20;

  ui_slide_pushAmount = createSlider(entropy.def.controllers.pushAmount.min, entropy.def.controllers.pushAmount.max, entropy.def.controllers.pushAmount.val, entropy.def.controllers.pushAmount.step);
  ui_slide_pushAmount.position(10, y);
  ui_slide_pushAmount.size(450);
  ui_slide_pushAmount.changed(uiParamChanged);
  y += 30;

  ui_label_opacity = createDiv('Opacity:');
  ui_label_opacity.position(10, y);
  ui_label_opacity.style('color', '#ffffff');
  ui_label_opacityValue = createDiv(entropy.def.controllers.opacity.val);
  ui_label_opacityValue.position(180, y);
  ui_label_opacityValue.style('color', '#ffffff');
  y += 20;

  ui_slide_opacity = createSlider(entropy.def.controllers.opacity.min, entropy.def.controllers.opacity.max, entropy.def.controllers.opacity.val, entropy.def.controllers.opacity.step);
  ui_slide_opacity.position(10, y);
  ui_slide_opacity.size(450);
  ui_slide_opacity.changed(uiParamChanged);
  y += 30;

  ui_label_strokeWidth = createDiv('Stroke Width:');
  ui_label_strokeWidth.position(10, y);
  ui_label_strokeWidth.style('color', '#ffffff');
  ui_label_strokeWidthValue = createDiv(entropy.def.controllers.strokeWidth.val);
  ui_label_strokeWidthValue.position(180, y);
  ui_label_strokeWidthValue.style('color', '#ffffff');
  y += 20;

  ui_slide_strokeWidth = createSlider(entropy.def.controllers.strokeWidth.min, entropy.def.controllers.strokeWidth.max, entropy.def.controllers.strokeWidth.val, entropy.def.controllers.strokeWidth.step);
  ui_slide_strokeWidth.position(10, y);
  ui_slide_strokeWidth.size(450);
  ui_slide_strokeWidth.changed(uiParamChanged);
  y += 30;

  ui_checkbox_fixedAngle = createCheckbox('Fixed Angle', entropy.def.controllers.fixedAngle);
  ui_checkbox_fixedAngle.position(10, y);
  ui_checkbox_fixedAngle.style('color', '#ffffff');
  ui_checkbox_fixedAngle.changed(uiParamChanged);
  y += 30;

  ui_button_clear = createButton('Clear');
  ui_button_clear.position(10, y);
  ui_button_clear.mousePressed(clearCanvas);
  y += 30;

  ui_checkbox_spreadOscillation = createCheckbox('Oscillate Spread', entropy.def.controllers.spreadOscillation);
  ui_checkbox_spreadOscillation.position(10, y);
  ui_checkbox_spreadOscillation.style('color', '#ffffff');
  ui_checkbox_spreadOscillation.changed(uiParamChanged);
  y += 30;

  ui_label_oscAmp = createDiv('Oscillation Amplitude:');
  ui_label_oscAmp.position(10, y);
  ui_label_oscAmp.style('color', '#ffffff');
  ui_label_oscAmpValue = createDiv(entropy.def.controllers.spreadOscillationAmplitude);
  ui_label_oscAmpValue.position(180, y);
  ui_label_oscAmpValue.style('color', '#ffffff');
  y += 20;

  ui_slide_oscAmp = createSlider(0, 500, entropy.def.controllers.spreadOscillationAmplitude, 1);
  ui_slide_oscAmp.position(10, y);
  ui_slide_oscAmp.size(450);
  ui_slide_oscAmp.changed(uiParamChanged);
  y += 30;

  ui_button_reset = createButton('Reset Walkers');
  ui_button_reset.position(10, y);
  ui_button_reset.mousePressed(resetEntropy);
  y += 30;

  ui_checkbox_allowFunky = createCheckbox('Keep Steppin When Idle', entropy.def.controllers.allowFunky);
  ui_checkbox_allowFunky.position(10, y);
  ui_checkbox_allowFunky.style('color', '#ffffff');
  ui_checkbox_allowFunky.changed(uiParamChanged);
  y += 30;

  ui_dropdown_blendMode = createSelect();
  ui_dropdown_blendMode.position(10, y);
  ui_dropdown_blendMode.option('BLEND');
  ui_dropdown_blendMode.option('MULTIPLY');
  ui_dropdown_blendMode.option('SCREEN');
  ui_dropdown_blendMode.option('ADD');
  ui_dropdown_blendMode.option('OVERLAY');
  ui_dropdown_blendMode.option('DARKEST');
  ui_dropdown_blendMode.option('LIGHTEST');
  ui_dropdown_blendMode.option('DIFFERENCE');
  ui_dropdown_blendMode.option('EXCLUSION');
  ui_dropdown_blendMode.option('SOFT_LIGHT');
  ui_dropdown_blendMode.option('HARD_LIGHT');
  ui_dropdown_blendMode.selected(entropy.def.controllers.colorBlendMode);
  ui_dropdown_blendMode.changed(uiParamChanged);
  y += 30;

  ui_button_export = createButton('Save as PNG');
  ui_button_export.position(10, y);
  ui_button_export.mousePressed(exportImage);
  y += 30;

  ui_colorPicker_bg = createColorPicker('#000000');
  ui_colorPicker_bg.position(10, y);
  ui_colorPicker_bg.style('width', '100px');
  ui_colorPicker_bg.input(() => {
    currentBgColor = ui_colorPicker_bg.color();
    clearCanvas(); // apply new color immediately
    adjustUILabelColors(currentBgColor); // Update label colors so we can see em mane
  });
  y += 40;

  ui_button_loadImage = createFileInput(handleImage);
  ui_button_loadImage.position(10, y);
  ui_button_loadImage.style('color', '#ffffff');
  y += 40;

  ui_checkbox_sampleColor = createCheckbox('Sample Color from Image', entropy.def.controllers.sampleColor);
  ui_checkbox_sampleColor.position(10, y);
  ui_checkbox_sampleColor.style('color', '#ffffff');
  ui_checkbox_sampleColor.changed(uiParamChanged);
  y += 30;

  ui_checkbox_useMic = createCheckbox('Use Mic Input', useMic);
  ui_checkbox_useMic.position(10, y);
  ui_checkbox_useMic.style('color', '#ffffff');
  ui_checkbox_useMic.changed(() => {
    useMic = ui_checkbox_useMic.checked();
  });
  y += 30;

  ui_label_micGain = createDiv('Mic Gain:');
  ui_label_micGain.position(10, y);
  ui_label_micGain.style('color', '#ffffff');

  ui_label_micGainValue = createDiv(micGain.toFixed(1));
  ui_label_micGainValue.position(180, y);
  ui_label_micGainValue.style('color', '#ffffff');
  y += 20;

  ui_slider_micGain = createSlider(0.5, 10.0, micGain, 0.1);
  ui_slider_micGain.position(10, y);
  ui_slider_micGain.size(450);
  ui_slider_micGain.input(() => {
    micGain = ui_slider_micGain.value();
    ui_label_micGainValue.html(micGain.toFixed(1));
    });
    y += 30;

  uiParamChanged();
  uiHide();
}


function uiParamChanged() {
  entropy.set_baseSpread(ui_slide_baseSpread.value());
  entropy.set_pushAmount(ui_slide_pushAmount.value());
  entropy.set_opacity(ui_slide_opacity.value());
  entropy.set_strokeWidth(ui_slide_strokeWidth.value());
  entropy.set_fixedAngle(ui_checkbox_fixedAngle.checked());
  entropy.set_spreadOscillation(ui_checkbox_spreadOscillation.checked());
  ui_label_baseSpreadValue.html(ui_slide_baseSpread.value());
  ui_label_pushAmountValue.html(ui_slide_pushAmount.value());
  ui_label_opacityValue.html(ui_slide_opacity.value());
  ui_label_strokeWidthValue.html(ui_slide_strokeWidth.value());
  entropy.set_allowFunky(ui_checkbox_allowFunky.checked());
  entropy.set_colorBlendMode(ui_dropdown_blendMode.value());
  entropy.set_spreadOscillationAmplitude(ui_slide_oscAmp.value());
  ui_label_oscAmpValue.html(ui_slide_oscAmp.value());
  entropy.set_sampleColor(ui_checkbox_sampleColor.checked());
  //uiValidateParameters();
}

function uiShow() {
  ui_label_baseSpread.show();
  ui_label_baseSpreadValue.show();
  ui_slide_baseSpread.show();
  ui_label_pushAmount.show();
  ui_label_pushAmountValue.show();
  ui_slide_pushAmount.show();
  ui_label_opacity.show();
  ui_label_opacityValue.show();
  ui_slide_opacity.show();
  ui_label_strokeWidth.show();
  ui_label_strokeWidthValue.show();
  ui_slide_strokeWidth.show();
  ui_checkbox_fixedAngle.show();
  ui_button_clear.show();
  ui_checkbox_spreadOscillation.show();
  ui_button_reset.show();
  ui_checkbox_allowFunky.show();
  ui_dropdown_blendMode.show();
  ui_label_oscAmp.show();
  ui_label_oscAmpValue.show();
  ui_slide_oscAmp.show();
  ui_button_export.show();
  ui_colorPicker_bg.show(); 
  ui_button_loadImage.show();
  ui_checkbox_sampleColor.show();
  ui_slider_micGain.show();
  ui_label_micGainValue.show();
  ui_label_micGain.show();
  ui_checkbox_useMic.show();
  ui_displayed = true;
}

function uiHide() {
  ui_label_baseSpread.hide();
  ui_label_baseSpreadValue.hide();
  ui_slide_baseSpread.hide();
  ui_label_pushAmount.hide();
  ui_label_pushAmountValue.hide();
  ui_slide_pushAmount.hide();
  ui_label_opacity.hide();
  ui_label_opacityValue.hide();
  ui_slide_opacity.hide();
  ui_label_strokeWidth.hide();
  ui_label_strokeWidthValue.hide();
  ui_slide_strokeWidth.hide();
  ui_checkbox_fixedAngle.hide();
  ui_button_clear.hide();
  ui_checkbox_spreadOscillation.hide();
  ui_button_reset.hide();
  ui_checkbox_allowFunky.hide();
  ui_dropdown_blendMode.hide();
  ui_label_oscAmp.hide();
  ui_label_oscAmpValue.hide();
  ui_slide_oscAmp.hide();
  ui_button_export.hide();
  ui_colorPicker_bg.hide(); 
  ui_button_loadImage.hide();
  ui_checkbox_sampleColor.hide();
  ui_slider_micGain.hide();
  ui_label_micGainValue.hide();
  ui_label_micGain.hide();
  ui_checkbox_useMic.hide();
  ui_displayed = false;
}

function adjustUILabelColors(c) {
  let r = red(c);
  let g = green(c);
  let b = blue(c);

  // Perceived brightness
  let brightness = (r * 0.299 + g * 0.587 + b * 0.114);

  let textColor = (brightness > 128) ? '#000000' : '#ffffff';

  // Update all label elements
  ui_label_baseSpread.style('color', textColor);
  ui_label_baseSpreadValue.style('color', textColor);
  ui_label_pushAmount.style('color', textColor);
  ui_label_pushAmountValue.style('color', textColor);
  ui_label_opacity.style('color', textColor);
  ui_label_opacityValue.style('color', textColor);
  ui_label_strokeWidth.style('color', textColor);
  ui_label_strokeWidthValue.style('color', textColor);
  ui_label_oscAmp.style('color', textColor);
  ui_label_oscAmpValue.style('color', textColor);

  // change other elements cuz they need love too
  ui_checkbox_fixedAngle.style('color', textColor);
  ui_checkbox_spreadOscillation.style('color', textColor);
  ui_checkbox_allowFunky.style('color', textColor);
}

function uiValidateParameters() {
  if (ui_checkbox_fixedAngle.checked()) {
    // nothing's here go away pls
  }
}

function _noise(x) {
  return noise(x);
}

function makeNoise(size, iterations) {
  let n, x, y, w, h;
  w = size;
  h = size;
  stroke(255, 1);
  for(n = 0; n < iterations; n++) {
    x = noise(n/5.0, n/11.0, frameCount/300);
    y = noise(n/13.0, n/7.0, frameCount/300);
    point(mouseX-(w/2) + (x*w), mouseY-(h/2) + (y*h));
  }
}

//_________________________________________________________________________________________________

class _entropyWalker {

  constructor(_config) {
    this.def = _config;
  }

  run(x, y) {
    this.step(x, y);
    if (!this.def.internals.active) {
      this.def.internals.active = true;
      this.step(x, y);
    }
    if (!this.def.internals.hasBeenInitialized) {
      this.x = x;
      this.y = y;
      this.def.internals.hasBeenInitialized = true;
      return; // Skip drawing on the very first frame
    }
    this.render();
  
    if (this.def.controllers.spreadOscillation) {
      const amp = this.def.controllers.spreadOscillationAmplitude || 100;
      this.def.internals.spread = this.def.controllers.baseSpread.val +
        sin(frameCount * 0.01) * amp;
    } else {
      this.def.internals.spread += this.def.controllers.spreadAmount.val;
    }
  }

  stop() {
    this.def.internals.spread = this.def.controllers.baseSpread.val;
    this.def.internals.active = false;
    if (this.def.controllers.updateXY === true) {
      this.def.internals.x = mouseX;
      this.def.internals.y = mouseY;
    }
    if (this.def.controllers.alwaysStep === true){
      this.step();
    }
  }

  step(x, y) {
    let spreadCalc = (this.def.internals.spread / 2);
    this.def.internals.prev_X = (this.def.internals.active === true) ? (this.def.internals.x) : x;
    this.def.internals.prev_Y = (this.def.internals.active === true) ? (this.def.internals.y) : y;
    let mappedX = map(_noise(this.def.internals.noiseMap_X), 0, 1, (x + -spreadCalc), (x + spreadCalc));
    let mappedY = map(_noise(this.def.internals.noiseMap_Y), 0, 1, (y + -spreadCalc), (y + spreadCalc));
    if (this.def.controllers.fixedAngle === true) {
      if (abs(mappedX - this.def.internals.prev_X) > abs(mappedY - this.def.internals.prev_Y)) { 
        this.def.internals.x = mappedX;
      } else { 
        this.def.internals.y = mappedY;
      }
    } else {
      this.def.internals.x = mappedX;
      this.def.internals.y = mappedY;
    }
    this.def.internals.noiseMap_X += random(0, this.def.controllers.pushAmount.val);
    this.def.internals.noiseMap_Y += random(0, this.def.controllers.pushAmount.val);
  }

  render() {
    blendMode(this.def.controllers.colorBlendMode);
    let c;
    if (this.def.controllers.sampleColor && sourceImage) {

      let canvasX = this.def.internals.x - sourceImageX;
      let canvasY = this.def.internals.y - sourceImageY;

      let px = floor(this.def.internals.x);
      let py = floor(this.def.internals.y);

      px = constrain(px, 0, sourceImageBuffer.width - 1);
      py = constrain(py, 0, sourceImageBuffer.height - 1);

      let rgb = sourceImageBuffer.get(px, py);
      colorMode(RGB, 255);
      c = color(red(rgb), green(rgb), blue(rgb), this.def.controllers.opacity.val);
      colorMode(HSB, 100);

      //console.log(`Sampling at ${px},${py} → color:`, red(rgb), green(rgb), blue(rgb));

    } else {
      c = color(
        this.def.controllers.colorHue.val,
        this.def.controllers.colorSaturation.val,
        this.def.controllers.colorBrightness.val,
        this.def.controllers.opacity.val
      );
    }

    stroke(c);

    strokeWeight(this.def.controllers.strokeWidth.val);
    line(this.def.internals.prev_X, this.def.internals.prev_Y, this.def.internals.x, this.def.internals.y);
    let times = this.def.controllers.lineOffset_Times.val;
    let xOffset;
    let yOffset;
    for (var i = 0; i <= times; i++) {
      xOffset = random(0, this.def.controllers.lineOffset_X.val);
      yOffset = random(0, this.def.controllers.lineOffset_Y.val);
      line(this.def.internals.prev_X+xOffset, this.def.internals.prev_Y, this.def.internals.x+xOffset, this.def.internals.y);
      line(this.def.internals.prev_X-xOffset, this.def.internals.prev_Y, this.def.internals.x-xOffset, this.def.internals.y);
      line(this.def.internals.prev_X, this.def.internals.prev_Y+yOffset, this.def.internals.x, this.def.internals.y+yOffset);
      line(this.def.internals.prev_X, this.def.internals.prev_Y-yOffset, this.def.internals.x, this.def.internals.y-yOffset);
    }
  }
}

//_________________________________________________________________________________________________

class _entropyBundle {

  constructor(bundle, walker) {
    this.def = bundle;
    this.c = new Array(this.def.bundleDef.brushCount.val);
    let x = 0;
    let y = 0;
    let p = 0;
    for (var i = 0; i < this.c.length; i++) { 
      let eW = _entropyConfig();
      //eW.controllers = this.def.controllers;
      eW.internals.noiseMap_X = (i===0) ? (eW.internals.noiseMap_X) : (x + this.def.bundleDef.noiseMapOffset_X.val);
      eW.internals.noiseMap_Y = (i===0) ? (eW.internals.noiseMap_Y) : (y + this.def.bundleDef.noiseMapOffset_Y.val);
      x = eW.internals.noiseMap_X;
      y = eW.internals.noiseMap_Y;
      // Here I adjust the pushAmount for each brush based on the previous brushes pushAmount plus the Bundle pushOffset... bitch
      // ... wait i think it messed itself
      //eW.controllers.pushAmount.val = (i===0) ? (eW.controllers.pushAmount.val + this.def.bundleDef.pushOffset.val) : (p + this.def.bundleDef.pushOffset.val);
      eW.controllers.pushAmount.val = this.def.controllers.pushAmount.val;
      p = eW.controllers.pushAmount.val;
      this.c[i] = new _entropyWalker(eW);
    }
  }

  run(x, y) {
    this.stepCounters();
    let c1val = this.def.counters.c1.val;
    let c2val = this.def.counters.c2.val;
    let c3val = this.def.counters.c3.val;
    //let c4val = this.def.counters.c4.val;
    //let c5val = this.def.counters.c5.val;
    this.c.forEach( function(item, index) {
      item.def.controllers.colorHue.val = map(_noise(c1val), 0, 1, item.def.controllers.colorHue.min, item.def.controllers.colorHue.max);
      item.def.controllers.colorSaturation.val = map(_noise(c2val), 0, 1, item.def.controllers.colorSaturation.min, item.def.controllers.colorSaturation.max);
      item.def.controllers.colorBrightness.val = map(_noise(c3val), 0, 1, item.def.controllers.colorBrightness.min, item.def.controllers.colorBrightness.max);
      item.run(x, y);
    });
  }

  stepCounters() {
    this.def.counters.c1.val += this.def.counters.c1.step;
    this.def.counters.c2.val += this.def.counters.c2.step;
    this.def.counters.c3.val += this.def.counters.c3.step;
    this.def.counters.c4.val += this.def.counters.c4.step;
    this.def.counters.c5.val += this.def.counters.c5.step;
  }

  stop() {
    this.c.forEach(function(item, index) {
      item.stop();
    });
  }

  step(x, y) {
    this.c.forEach(function(item, index) {
      item.step(x, y);
    });
  }

  render() {
    this.c.forEach(function(item, index) {
      item.render();
    });
  }

  set_baseSpread(v) {
    //console.log('BaseSpread: ' + v);
    this.def.controllers.baseSpread.val = v;
    this.c.forEach(function(item, index) {
      item.def.controllers.baseSpread.val = v;
    });
  }

  set_pushAmount(v) {
    //console.log('PushAmount: ' + v);
    this.def.controllers.pushAmount.val = v;
    this.c.forEach(function(item, index) {
      item.def.controllers.pushAmount.val = v;
    });
  }

  set_opacity(v) {
    //console.log('Opacity: ' + v);
    this.def.controllers.opacity.val = v;
    this.c.forEach(function(item, index) {
      item.def.controllers.opacity.val = v;
    });
  }

  set_spreadOscillation(v) {
    this.def.controllers.spreadOscillation = v;
    this.c.forEach(item => item.def.controllers.spreadOscillation = v);
  }

  set_strokeWidth(v) {
    //console.log('StrokeWidth: ' + v);
    this.def.controllers.strokeWidth.val = v;
    this.c.forEach(function(item, index) {
      item.def.controllers.strokeWidth.val = v;
    });
  }
  
  set_fixedAngle(v) {
    //console.log('FixedAngle: ' + v);
    this.def.controllers.fixedAngle = v;
    this.c.forEach(function(item, index) {
      item.def.controllers.fixedAngle = v;
    });
  }
  
  set_sampleColor(v) {
    this.def.controllers.sampleColor = v;
    this.c.forEach(item => item.def.controllers.sampleColor = v);
  }

  /* set_colorBlendMode(v) {
    //console.log('ColorBlendMode: ' + v);
    item.def.controllers.colorBlendMode = v;
    this.c.forEach(function(item, index) {
      item.def.controllers.colorBlendMode = v;
    });
  } */

  set_colorBlendMode(v) {
    const modeMap = {
      'BLEND': BLEND,
      'MULTIPLY': MULTIPLY,
      'SCREEN': SCREEN,
      'ADD': ADD,
      'OVERLAY': OVERLAY,
      'DARKEST': DARKEST,
      'LIGHTEST': LIGHTEST,
      'DIFFERENCE': DIFFERENCE,
      'EXCLUSION': EXCLUSION,
      'SOFT_LIGHT': SOFT_LIGHT,
      'HARD_LIGHT': HARD_LIGHT
    };
  
    const mapped = modeMap[v] || BLEND;
  
    this.def.controllers.colorBlendMode = mapped;
  
    this.c.forEach(function(item) {
      item.def.controllers.colorBlendMode = mapped;
    });
  }

  set_allowFunky(v) {
    this.def.controllers.allowFunky = v;
  }

  set_spreadOscillationAmplitude(v) {
    this.def.controllers.spreadOscillationAmplitude = v;
    this.c.forEach(item => item.def.controllers.spreadOscillationAmplitude = v);
  }

  _setConfig(_config) {
    if(_config === null) {
      return _entropyBundleConfig();
    } else {
      return _config;
    }
  }

}

//_________________________________________________________________________________________________

function _entropyConfig(_def_) {
  let obj;
  if (typeof _def_ === 'object' && _def_ != null) {
    obj = Object.assign({}, _def_);
  } else {
    obj = new Object();
    obj.controllers = {
      strokeWidth: { val: 0.02, min: 0.2, max: 5, step: 0.1 },
      opacity: { val: 150, min: 2, max: 255, step: 1 },
      lineOffset_X: { val: 0, min: 0, max: 900, step: 1},
      lineOffset_Y: { val: 0, min: 0, max: 900, step: 1},
      lineOffset_Times: { val: 0, min: 0, max: 30, step: 1},
      baseSpread: { val: 400, min: 1, max: 900, step: 1 },
      spreadAmount: { val: 0, min: 0, max: 10, step: 0.01 },
      pushAmount: { val: 0.001, min: 0.001, max: 0.3, step: 0.001 },
        //BLEND, DARKEST, LIGHTEST, DIFFERENCE, MULTIPLY, EXCLUSION, SCREEN, REPLACE, OVERLAY, HARD_LIGHT, SOFT_LIGHT, DODGE, BURN, ADD, REMOVE, SUBTRACT
      colorBlendMode: BLEND,
      colorHue: { val: 0, min: 0, max: 100, step: 0.01},
      colorSaturation: { val: 0, min: 0, max: 100, step: 0.01},
      colorBrightness: { val: 0, min: 50, max: 100, step: 0.01},
      fixedAngle: false,
      updateXY: true,
      alwaysStep: false,
      sampleColor: false,
      spreadOscillation: false,
      spreadOscillationAmplitude: 100,
      allowFunky: false
    };
    obj.internals = {
      noiseMap_X: 0,
      noiseMap_Y: 1,
      prev_X: 0,
      prev_Y: 0,
      x: 0,
      y: 0,
      spread: 0,
      active: true,
      hasBeenInitialized: false
    };
  }
  console.log('entropyConfig', JSON.stringify(obj.controllers, null, 2));
  return obj;
}

function _entropyBundleConfig(_def_) {
  let obj;
  if (typeof _def_ === 'object' && _def_ != null) {
    obj = Object.assign({}, _def_);
  } else {
    obj = new Object();
    obj.bundleDef = {
      brushCount: { val: 150, min: 1, max: 999, step: 1 },
      pushOffset: { val: 0.00, min: 0, max: 1, step: 0.01 },
      noiseMapOffset_X: { val: 0, min: 0.01, max: 100, step: 0.01 },
      noiseMapOffset_Y: { val: 0, min: 0.01, max: 100, step: 0.01 }
    };
    obj.controllers = {
      strokeWidth: { val: 0.02, min: 0.02, max: 5, step: 0.01 },
      opacity: { val: 200, min: 2, max: 255, step: 1 },
      baseSpread: { val: 400, min: 1, max: 1000, step: 1 },
      spreadAmount: { val: 0.0, min: 0, max: 10, step: 0.01 },
      pushAmount: { val: 0.05, min: 0.001, max: 0.3, step: 0.001 },
      //______________________________________________________________
      lineOffset_X: { val: 0, min: 0, max: 900, step: 1},
      lineOffset_Y: { val: 0, min: 0, max: 900, step: 1},
      lineOffset_Times: { val: 3, min: 0, max: 30, step: 1},
      //______________________________________________________________
          //BLEND, DARKEST, LIGHTEST, DIFFERENCE, MULTIPLY, EXCLUSION, SCREEN, REPLACE, OVERLAY, HARD_LIGHT, SOFT_LIGHT, DODGE, BURN, ADD, REMOVE, SUBTRACT
      colorBlendMode: "BLEND",
      colorHue: { val: 0, min: 0, max: 100, step: 0.01},
      colorSaturation: { val: 0, min: 0, max: 100, step: 0.01},
      colorBrightness: { val: 0, min: 25, max: 100, step: 0.01},
      //______________________________________________________________
      fixedAngle: false,
      updateXY: true,
      alwaysStep: true,
      sampleColor: false,
      spreadOscillation: false,
      spreadOscillationAmplitude: 100,
      allowFunky: false
    };
    obj.counters = {
      c1: { val: 0, step: 0.02 },
      c2: { val: 0, step: 0.05 },
      c3: { val: 0, step: 0.02 },
      c4: { val: 0, step: 0.01 },
      c5: { val: 0, step: 0.01 }
    }
  }
  console.log('entropyConfig', JSON.stringify(obj.controllers, null, 2));
  return obj;
}

//_________________________________________________________________________________________________
