/**
 * Entropic Noise - Walker and Bundle Classes
 * Contains the core entropy walker and bundle classes plus configuration functions
 */

// Helper function for noise
function _noise(x) {
  return noise(x);
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
    // Performance: blend mode, colorMode, and strokeWeight are now set at bundle level
    let c;
    
    // Priority: 1. Sample from image, 2. Fixed brush color, 3. Color cycling
    if (this.def.controllers.sampleColor && sourceImage) {
      // Sample color from loaded image
      let px = floor(this.def.internals.x);
      let py = floor(this.def.internals.y);

      px = constrain(px, 0, sourceImageBuffer.width - 1);
      py = constrain(py, 0, sourceImageBuffer.height - 1);

      let rgb = sourceImageBuffer.get(px, py);
      
      // Create color in RGB mode with opacity
      colorMode(RGB, 255);
      c = color(red(rgb), green(rgb), blue(rgb), this.def.controllers.opacity.val);
      // Switch back to HSB for other walkers
      colorMode(HSB, 100);

    } else if (this.def.controllers.useBrushColor) {
      // Use fixed brush color - colorMode already set to HSB at bundle level
      const h = this.def.controllers.brushColorHue || 0;
      const s = this.def.controllers.brushColorSaturation || 0;
      const b = this.def.controllers.brushColorBrightness || 100;
      const a = map(this.def.controllers.opacity.val, 0, 255, 0, 100);
      c = color(h, s, b, a);
      
    } else {
      // Use color cycling - colorMode already set to HSB at bundle level
      const a = map(this.def.controllers.opacity.val, 0, 255, 0, 100);
      c = color(
        this.def.controllers.colorHue.val,
        this.def.controllers.colorSaturation.val,
        this.def.controllers.colorBrightness.val,
        a
      );
    }

    stroke(c);
    
    // strokeWeight is now set at bundle level for performance
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
      
      // Copy ALL controller values from bundle to this walker
      // This ensures stroke width, opacity, and all other settings are preserved
      Object.keys(this.def.controllers).forEach(key => {
        const bundleValue = this.def.controllers[key];
        
        // Handle objects with val property (sliders)
        if (bundleValue && typeof bundleValue === 'object' && bundleValue.hasOwnProperty('val')) {
          if (eW.controllers[key] && typeof eW.controllers[key] === 'object') {
            eW.controllers[key].val = bundleValue.val;
            eW.controllers[key].min = bundleValue.min;
            eW.controllers[key].max = bundleValue.max;
          }
        }
        // Handle primitives (boolean, number, string)
        else if (typeof bundleValue === 'boolean' || typeof bundleValue === 'number' || typeof bundleValue === 'string') {
          eW.controllers[key] = bundleValue;
        }
      });
      
      eW.internals.noiseMap_X = (i===0) ? (eW.internals.noiseMap_X) : (x + this.def.bundleDef.noiseMapOffset_X.val);
      eW.internals.noiseMap_Y = (i===0) ? (eW.internals.noiseMap_Y) : (y + this.def.bundleDef.noiseMapOffset_Y.val);
      x = eW.internals.noiseMap_X;
      y = eW.internals.noiseMap_Y;
      p = eW.controllers.pushAmount.val;
      this.c[i] = new _entropyWalker(eW);
    }
  }

  run(x, y) {
    // Set blend mode and color mode ONCE at the bundle level (not per-walker for performance)
    blendMode(this.def.controllers.colorBlendMode);
    colorMode(HSB, 100); // Set once for all walkers
    strokeWeight(this.def.controllers.strokeWidth.val); // Set once for all walkers
    
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
    // Do a deep copy to avoid reference issues
    obj = JSON.parse(JSON.stringify(_def_));
  } else {
    obj = new Object();
    obj.controllers = {
      strokeWidth: { val: 0.5, min: 0.2, max: 5, step: 0.1 },
      opacity: { val: 150, min: 2, max: 255, step: 1 },
      lineOffset_X: { val: 0, min: 0, max: 900, step: 1},
      lineOffset_Y: { val: 0, min: 0, max: 900, step: 1},
      lineOffset_Times: { val: 0, min: 0, max: 30, step: 1},
      baseSpread: { val: 400, min: 1, max: 900, step: 1 },
      spreadAmount: { val: 0, min: 0, max: 10, step: 0.01 },
      pushAmount: { val: 0.001, min: 0.001, max: 1, step: 0.001 },
        //BLEND, DARKEST, LIGHTEST, DIFFERENCE, MULTIPLY, EXCLUSION, SCREEN, REPLACE, OVERLAY, HARD_LIGHT, SOFT_LIGHT, DODGE, BURN, ADD, REMOVE, SUBTRACT
      colorBlendMode: BLEND,
      colorHue: { val: 0, min: 0, max: 100, step: 0.01},
      colorSaturation: { val: 0, min: 0, max: 100, step: 0.01},
      colorBrightness: { val: 0, min: 50, max: 100, step: 0.01},
      // New brush color controls
      useBrushColor: false,
      brushColorHue: 0,
      brushColorSaturation: 0,
      brushColorBrightness: 100,
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
  return obj;
}

function _entropyBundleConfig(_def_) {
  let obj;
  if (typeof _def_ === 'object' && _def_ != null) {
    // Do a deep copy of the preset to avoid reference issues
    obj = JSON.parse(JSON.stringify(_def_));
  } else {
    obj = new Object();
    obj.bundleDef = {
      brushCount: { val: 150, min: 1, max: 999, step: 1 },
      pushOffset: { val: 0.00, min: 0, max: 1, step: 0.01 },
      noiseMapOffset_X: { val: 0, min: 0.01, max: 100, step: 0.01 },
      noiseMapOffset_Y: { val: 0, min: 0.01, max: 100, step: 0.01 }
    };
    obj.controllers = {
      strokeWidth: { val: 0.5, min: 0.02, max: 5, step: 0.01 },
      opacity: { val: 200, min: 2, max: 255, step: 1 },
      baseSpread: { val: 400, min: 1, max: 1000, step: 1 },
      spreadAmount: { val: 0.0, min: 0, max: 10, step: 0.01 },
      pushAmount: { val: 0.025, min: 0.001, max: 1, step: 0.001 },
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
      // New brush color controls
      useBrushColor: false,
      brushColorHue: 0,
      brushColorSaturation: 0,
      brushColorBrightness: 100,
      //______________________________________________________________
      fixedAngle: false,
      updateXY: true,
      alwaysStep: false,
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
  return obj;
}
