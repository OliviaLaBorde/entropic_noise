/**
 * Entropic Noise - UI Functions
 * Contains all UI building and management functions (Tweakpane + Old UI)
 * 
 * NOTE: This file relies on global variables defined in entropic_noise.js:
 * - entropy, tweakpane, tweakpaneParams
 * - All UI element variables (ui_*)
 * - currentBgColor, useMic, micGain, autoDrawEnabled
 * - _presetsStore, sourceImage, sourceImageBuffer, etc.
 */

//_________________________________________________________________________________________________
// TWEAKPANE UI FUNCTIONS
//_________________________________________________________________________________________________

function buildTweakpaneUI() {
  // Check if Tweakpane library is loaded
  if (typeof Tweakpane === 'undefined') {
    console.warn('⚠️ Tweakpane library not loaded. Skipping Tweakpane UI build.');
    return;
  }
  
  const presetCount = Object.keys(_presetsStore).length;
  console.log(`✨ Building Tweakpane UI (v3 API) with ${presetCount} presets...`);
  console.log('Entropy object:', entropy);
  
  if (tweakpane) {
    console.log('Disposing old Tweakpane instance');
    tweakpane.dispose();
  }
  
  try {
    tweakpane = new Tweakpane.Pane({
      title: 'Entropic Noise Controls',
      expanded: true,
      container: document.body,
    });
    
    console.log('✅ Tweakpane instance created:', tweakpane);
    
    // Ensure the element is visible and positioned
    if (tweakpane.element) {
      tweakpane.element.style.position = 'fixed';
      tweakpane.element.style.top = '10px';
      tweakpane.element.style.right = '10px';
      tweakpane.element.style.zIndex = '9999';
      console.log('✅ Tweakpane element styled:', tweakpane.element);
    }
  } catch (error) {
    console.error('❌ Error creating Tweakpane:', error);
    return;
  }

  // Helper function to build controls for a config object
  function buildControlsFromConfig(folder, config, path = '', updateCallback = null) {
    Object.keys(config).forEach(key => {
      const value = config[key];
      const fullPath = path ? `${path}.${key}` : key;
      
      // Handle objects with val/min/max/step (sliders)
      if (value && typeof value === 'object' && value.hasOwnProperty('val')) {
        tweakpaneParams[fullPath] = value.val;
        
        const binding = folder.addInput(tweakpaneParams, fullPath, {
          label: key,
          min: value.min,
          max: value.max,
          step: value.step
        });
        
        if (updateCallback) {
          binding.on('change', (ev) => {
            updateCallback(key, ev.value);
          });
        }
      }
      // Handle boolean values (checkboxes)
      else if (typeof value === 'boolean') {
        tweakpaneParams[fullPath] = value;
        
        const binding = folder.addInput(tweakpaneParams, fullPath, {
          label: key
        });
        
        if (updateCallback) {
          binding.on('change', (ev) => {
            updateCallback(key, ev.value);
          });
        }
      }
      // Handle string values (text input or dropdown if specific values)
      else if (typeof value === 'string') {
        tweakpaneParams[fullPath] = value;
        
        const binding = folder.addInput(tweakpaneParams, fullPath, {
          label: key
        });
        
        if (updateCallback) {
          binding.on('change', (ev) => {
            updateCallback(key, ev.value);
          });
        }
      }
      // Handle number values (numeric input)
      else if (typeof value === 'number') {
        tweakpaneParams[fullPath] = value;
        
        const binding = folder.addInput(tweakpaneParams, fullPath, {
          label: key
        });
        
        if (updateCallback) {
          binding.on('change', (ev) => {
            updateCallback(key, ev.value);
          });
        }
      }
    });
  }

  // Bundle Definition folder
  if (entropy && entropy.def && entropy.def.bundleDef) {
    const bundleFolder = tweakpane.addFolder({
      title: 'Bundle Definition',
      expanded: false,
    });
    
    buildControlsFromConfig(bundleFolder, entropy.def.bundleDef, 'bundle', (key, value) => {
      entropy.def.bundleDef[key].val = value;
      
      // Brush count changes require resetting the walkers to recreate the array
      if (key === 'brushCount') {
        showToast('Brush count changed - resetting walkers...', 1500);
        // Small delay to let the toast show before reset
        setTimeout(() => {
          resetEntropy();
        }, 100);
      }
    });
  }

  // Controllers folder - organized by category
  if (entropy && entropy.def && entropy.def.controllers) {
    const controllersFolder = tweakpane.addFolder({
      title: 'Controllers',
      expanded: true,
    });
    
    // Build controls for non-color-related controllers
    const excludeKeys = ['strokeWidth', 'opacity', 'colorHue', 'colorSaturation', 'colorBrightness', 'colorBlendMode', 'sampleColor'];
    
    Object.keys(entropy.def.controllers).forEach(key => {
      if (excludeKeys.includes(key)) return; // Skip color-related controls
      
      const value = entropy.def.controllers[key];
      
      // Handle slider values
      if (value && typeof value === 'object' && value.hasOwnProperty('val')) {
        tweakpaneParams[`controller_${key}`] = value.val;
        
        const binding = controllersFolder.addInput(tweakpaneParams, `controller_${key}`, {
          label: key,
          min: value.min,
          max: value.max,
          step: value.step
        });
        
        binding.on('change', (ev) => {
          const setterName = `set_${key}`;
          if (typeof entropy[setterName] === 'function') {
            entropy[setterName](ev.value);
          } else {
            entropy.def.controllers[key].val = ev.value;
            entropy.c.forEach(item => {
              if (item.def.controllers[key] && item.def.controllers[key].hasOwnProperty('val')) {
                item.def.controllers[key].val = ev.value;
              }
            });
          }
        });
      }
      // Handle boolean values
      else if (typeof value === 'boolean') {
        tweakpaneParams[`controller_${key}`] = value;
        
        const binding = controllersFolder.addInput(tweakpaneParams, `controller_${key}`, {
          label: key
        });
        
        binding.on('change', (ev) => {
          const setterName = `set_${key}`;
          if (typeof entropy[setterName] === 'function') {
            entropy[setterName](ev.value);
          } else {
            entropy.def.controllers[key] = ev.value;
            entropy.c.forEach(item => {
              item.def.controllers[key] = ev.value;
            });
          }
        });
      }
      // Handle numeric values (like oscillation amplitude)
      else if (typeof value === 'number') {
        tweakpaneParams[`controller_${key}`] = value;
        
        const binding = controllersFolder.addInput(tweakpaneParams, `controller_${key}`, {
          label: key
        });
        
        binding.on('change', (ev) => {
          const setterName = `set_${key}`;
          if (typeof entropy[setterName] === 'function') {
            entropy[setterName](ev.value);
          } else {
            entropy.def.controllers[key] = ev.value;
          }
        });
      }
    });
  }

  // Color Controls folder
  const colorFolder = tweakpane.addFolder({
    title: 'Color Controls',
    expanded: true,
  });

  // Brush Color - Enable/Disable color cycling
  tweakpaneParams.enableBrushColor = false;
  colorFolder.addInput(tweakpaneParams, 'enableBrushColor', {
    label: 'Enable Brush Color'
  }).on('change', (ev) => {
    // When disabled, use color cycling; when enabled, use fixed color
    entropy.def.controllers.useBrushColor = ev.value;
    entropy.c.forEach(item => {
      item.def.controllers.useBrushColor = ev.value;
    });
  });

  // Brush Color Picker
  tweakpaneParams.brushColor = '#ffffff';
  colorFolder.addInput(tweakpaneParams, 'brushColor', {
    label: 'Brush Color'
  }).on('change', (ev) => {
    const hexColor = ev.value;
    
    // Parse hex color manually to avoid colorMode issues
    const hex = hexColor.replace('#', '');
    const r = parseInt(hex.substring(0, 2), 16);
    const g = parseInt(hex.substring(2, 4), 16);
    const b = parseInt(hex.substring(4, 6), 16);
    
    // Convert RGB (0-255) to HSB (0-100) using manual calculation
    // This ensures we get the right values for colorMode(HSB, 100)
    const rNorm = r / 255;
    const gNorm = g / 255;
    const bNorm = b / 255;
    
    const max = Math.max(rNorm, gNorm, bNorm);
    const min = Math.min(rNorm, gNorm, bNorm);
    const delta = max - min;
    
    let h = 0;
    let s = 0;
    const br = max;
    
    if (delta !== 0) {
      s = delta / max;
      
      if (max === rNorm) {
        h = ((gNorm - bNorm) / delta) % 6;
      } else if (max === gNorm) {
        h = (bNorm - rNorm) / delta + 2;
      } else {
        h = (rNorm - gNorm) / delta + 4;
      }
      
      h = h / 6;
      if (h < 0) h += 1;
    }
    
    // Scale to 0-100 range for p5.js colorMode(HSB, 100)
    const hueValue = h * 100;
    const satValue = s * 100;
    const brightValue = br * 100;
    
    // Store the HSB values
    entropy.def.controllers.brushColorHue = hueValue;
    entropy.def.controllers.brushColorSaturation = satValue;
    entropy.def.controllers.brushColorBrightness = brightValue;
    
    entropy.c.forEach(item => {
      item.def.controllers.brushColorHue = hueValue;
      item.def.controllers.brushColorSaturation = satValue;
      item.def.controllers.brushColorBrightness = brightValue;
    });
    
    console.log(`Brush Color: ${hexColor} (RGB ${r},${g},${b}) -> HSB(${hueValue.toFixed(1)}, ${satValue.toFixed(1)}, ${brightValue.toFixed(1)})`);
  });

  // Stroke Width
  if (entropy.def.controllers.strokeWidth) {
    tweakpaneParams.strokeWidth = entropy.def.controllers.strokeWidth.val;
    colorFolder.addInput(tweakpaneParams, 'strokeWidth', {
      label: 'Stroke Width',
      min: entropy.def.controllers.strokeWidth.min,
      max: entropy.def.controllers.strokeWidth.max,
      step: entropy.def.controllers.strokeWidth.step
    }).on('change', (ev) => {
      entropy.set_strokeWidth(ev.value);
    });
  }

  // Opacity
  if (entropy.def.controllers.opacity) {
    tweakpaneParams.opacity = entropy.def.controllers.opacity.val;
    colorFolder.addInput(tweakpaneParams, 'opacity', {
      label: 'Opacity',
      min: entropy.def.controllers.opacity.min,
      max: entropy.def.controllers.opacity.max,
      step: entropy.def.controllers.opacity.step
    }).on('change', (ev) => {
      entropy.set_opacity(ev.value);
    });
  }

  // Color Blend Mode
  if (entropy.def.controllers.colorBlendMode) {
    tweakpaneParams.colorBlendMode = entropy.def.controllers.colorBlendMode;
    colorFolder.addInput(tweakpaneParams, 'colorBlendMode', {
      label: 'Blend Mode',
      options: {
        'BLEND': 'BLEND',
        'MULTIPLY': 'MULTIPLY',
        'SCREEN': 'SCREEN',
        'ADD': 'ADD',
        'OVERLAY': 'OVERLAY',
        'DARKEST': 'DARKEST',
        'LIGHTEST': 'LIGHTEST',
        'DIFFERENCE': 'DIFFERENCE',
        'EXCLUSION': 'EXCLUSION',
        'SOFT_LIGHT': 'SOFT_LIGHT',
        'HARD_LIGHT': 'HARD_LIGHT'
      }
    }).on('change', (ev) => {
      entropy.set_colorBlendMode(ev.value);
    });
  }

  // Sample Color from Image
  if (entropy.def.controllers.sampleColor !== undefined) {
    tweakpaneParams.sampleColor = entropy.def.controllers.sampleColor;
    colorFolder.addInput(tweakpaneParams, 'sampleColor', {
      label: 'Sample Color from Image'
    }).on('change', (ev) => {
      entropy.set_sampleColor(ev.value);
    });
  }

  // Background Color (moved from Meta Controls)
  tweakpaneParams.bgColor = '#000000';
  colorFolder.addInput(tweakpaneParams, 'bgColor', {
    label: 'Background'
  }).on('change', (ev) => {
    const hexColor = ev.value;
    currentBgColor = color(hexColor);
    if (ui_colorPicker_bg) {
      ui_colorPicker_bg.value(hexColor);
    }
    clearCanvas();
    adjustUILabelColors(currentBgColor);
  });

  // Color Cycling Controls (when Enable Brush Color is OFF)
  const colorCyclingFolder = colorFolder.addFolder({
    title: 'Color Cycling Settings',
    expanded: false,
  });

  // Add a button that explains when color cycling is active
  colorCyclingFolder.addButton({ 
    title: 'ℹ️ Active when Brush Color OFF' 
  }).on('click', () => {
    alert('Color Cycling is active when:\n\n' +
          '✓ "Enable Brush Color" is OFF\n' +
          '✓ "Sample Color from Image" is OFF\n\n' +
          'These controls set the range and speed of automatic color animation.');
  });

  colorCyclingFolder.addSeparator();

  // Hue Range
  if (entropy.def.controllers.colorHue) {
    tweakpaneParams.hueMin = entropy.def.controllers.colorHue.min;
    colorCyclingFolder.addInput(tweakpaneParams, 'hueMin', {
      label: 'Hue Min',
      min: 0,
      max: 100,
      step: 1
    }).on('change', (ev) => {
      entropy.def.controllers.colorHue.min = ev.value;
      entropy.c.forEach(item => {
        item.def.controllers.colorHue.min = ev.value;
      });
    });

    tweakpaneParams.hueMax = entropy.def.controllers.colorHue.max;
    colorCyclingFolder.addInput(tweakpaneParams, 'hueMax', {
      label: 'Hue Max',
      min: 0,
      max: 100,
      step: 1
    }).on('change', (ev) => {
      entropy.def.controllers.colorHue.max = ev.value;
      entropy.c.forEach(item => {
        item.def.controllers.colorHue.max = ev.value;
      });
    });
  }

  // Saturation Range
  if (entropy.def.controllers.colorSaturation) {
    tweakpaneParams.satMin = entropy.def.controllers.colorSaturation.min;
    colorCyclingFolder.addInput(tweakpaneParams, 'satMin', {
      label: 'Saturation Min',
      min: 0,
      max: 100,
      step: 1
    }).on('change', (ev) => {
      entropy.def.controllers.colorSaturation.min = ev.value;
      entropy.c.forEach(item => {
        item.def.controllers.colorSaturation.min = ev.value;
      });
    });

    tweakpaneParams.satMax = entropy.def.controllers.colorSaturation.max;
    colorCyclingFolder.addInput(tweakpaneParams, 'satMax', {
      label: 'Saturation Max',
      min: 0,
      max: 100,
      step: 1
    }).on('change', (ev) => {
      entropy.def.controllers.colorSaturation.max = ev.value;
      entropy.c.forEach(item => {
        item.def.controllers.colorSaturation.max = ev.value;
      });
    });
  }

  // Brightness Range
  if (entropy.def.controllers.colorBrightness) {
    tweakpaneParams.brightMin = entropy.def.controllers.colorBrightness.min;
    colorCyclingFolder.addInput(tweakpaneParams, 'brightMin', {
      label: 'Brightness Min',
      min: 0,
      max: 100,
      step: 1
    }).on('change', (ev) => {
      entropy.def.controllers.colorBrightness.min = ev.value;
      entropy.c.forEach(item => {
        item.def.controllers.colorBrightness.min = ev.value;
      });
    });

    tweakpaneParams.brightMax = entropy.def.controllers.colorBrightness.max;
    colorCyclingFolder.addInput(tweakpaneParams, 'brightMax', {
      label: 'Brightness Max',
      min: 0,
      max: 100,
      step: 1
    }).on('change', (ev) => {
      entropy.def.controllers.colorBrightness.max = ev.value;
      entropy.c.forEach(item => {
        item.def.controllers.colorBrightness.max = ev.value;
      });
    });
  }

  // Cycle Speed Controls (Counter Steps)
  colorCyclingFolder.addSeparator();

  if (entropy.def.counters) {
    tweakpaneParams.hueSpeed = entropy.def.counters.c1.step;
    colorCyclingFolder.addInput(tweakpaneParams, 'hueSpeed', {
      label: 'Hue Speed (c1)',
      min: 0,
      max: 0.5,
      step: 0.001
    }).on('change', (ev) => {
      entropy.def.counters.c1.step = ev.value;
    });

    tweakpaneParams.satSpeed = entropy.def.counters.c2.step;
    colorCyclingFolder.addInput(tweakpaneParams, 'satSpeed', {
      label: 'Saturation Speed (c2)',
      min: 0,
      max: 0.5,
      step: 0.001
    }).on('change', (ev) => {
      entropy.def.counters.c2.step = ev.value;
    });

    tweakpaneParams.brightSpeed = entropy.def.counters.c3.step;
    colorCyclingFolder.addInput(tweakpaneParams, 'brightSpeed', {
      label: 'Brightness Speed (c3)',
      min: 0,
      max: 0.5,
      step: 0.001
    }).on('change', (ev) => {
      entropy.def.counters.c3.step = ev.value;
    });
  }

  // Reset Color Cycling to defaults
  colorCyclingFolder.addSeparator();
  
  // Quick preset buttons for common color schemes
  const presetBtn1 = colorCyclingFolder.addButton({ title: '🌈 Full Rainbow' });
  presetBtn1.on('click', () => {
    entropy.def.controllers.colorHue.min = 0;
    entropy.def.controllers.colorHue.max = 100;
    entropy.def.controllers.colorSaturation.min = 80;
    entropy.def.controllers.colorSaturation.max = 100;
    entropy.def.controllers.colorBrightness.min = 80;
    entropy.def.controllers.colorBrightness.max = 100;
    entropy.c.forEach(item => {
      item.def.controllers.colorHue.min = 0;
      item.def.controllers.colorHue.max = 100;
      item.def.controllers.colorSaturation.min = 80;
      item.def.controllers.colorSaturation.max = 100;
      item.def.controllers.colorBrightness.min = 80;
      item.def.controllers.colorBrightness.max = 100;
    });
    buildTweakpaneUI();
    showToast('Applied: Full Rainbow', 2000);
  });

  const presetBtn2 = colorCyclingFolder.addButton({ title: '❄️ Cool Tones' });
  presetBtn2.on('click', () => {
    entropy.def.controllers.colorHue.min = 40;
    entropy.def.controllers.colorHue.max = 70;
    entropy.def.controllers.colorSaturation.min = 60;
    entropy.def.controllers.colorSaturation.max = 100;
    entropy.def.controllers.colorBrightness.min = 60;
    entropy.def.controllers.colorBrightness.max = 100;
    entropy.c.forEach(item => {
      item.def.controllers.colorHue.min = 40;
      item.def.controllers.colorHue.max = 70;
      item.def.controllers.colorSaturation.min = 60;
      item.def.controllers.colorSaturation.max = 100;
      item.def.controllers.colorBrightness.min = 60;
      item.def.controllers.colorBrightness.max = 100;
    });
    buildTweakpaneUI();
    showToast('Applied: Cool Tones', 2000);
  });

  const presetBtn3 = colorCyclingFolder.addButton({ title: '🔥 Warm Tones' });
  presetBtn3.on('click', () => {
    entropy.def.controllers.colorHue.min = 0;
    entropy.def.controllers.colorHue.max = 25;
    entropy.def.controllers.colorSaturation.min = 70;
    entropy.def.controllers.colorSaturation.max = 100;
    entropy.def.controllers.colorBrightness.min = 70;
    entropy.def.controllers.colorBrightness.max = 100;
    entropy.c.forEach(item => {
      item.def.controllers.colorHue.min = 0;
      item.def.controllers.colorHue.max = 25;
      item.def.controllers.colorSaturation.min = 70;
      item.def.controllers.colorSaturation.max = 100;
      item.def.controllers.colorBrightness.min = 70;
      item.def.controllers.colorBrightness.max = 100;
    });
    buildTweakpaneUI();
    showToast('Applied: Warm Tones', 2000);
  });

  const presetBtn4 = colorCyclingFolder.addButton({ title: '🌿 Earth Tones' });
  presetBtn4.on('click', () => {
    entropy.def.controllers.colorHue.min = 10;
    entropy.def.controllers.colorHue.max = 40;
    entropy.def.controllers.colorSaturation.min = 40;
    entropy.def.controllers.colorSaturation.max = 80;
    entropy.def.controllers.colorBrightness.min = 40;
    entropy.def.controllers.colorBrightness.max = 70;
    entropy.c.forEach(item => {
      item.def.controllers.colorHue.min = 10;
      item.def.controllers.colorHue.max = 40;
      item.def.controllers.colorSaturation.min = 40;
      item.def.controllers.colorSaturation.max = 80;
      item.def.controllers.colorBrightness.min = 40;
      item.def.controllers.colorBrightness.max = 70;
    });
    buildTweakpaneUI();
    showToast('Applied: Earth Tones', 2000);
  });

  const presetBtn5 = colorCyclingFolder.addButton({ title: '🌑 Monochrome' });
  presetBtn5.on('click', () => {
    entropy.def.controllers.colorHue.min = 0;
    entropy.def.controllers.colorHue.max = 0;
    entropy.def.controllers.colorSaturation.min = 0;
    entropy.def.controllers.colorSaturation.max = 0;
    entropy.def.controllers.colorBrightness.min = 0;
    entropy.def.controllers.colorBrightness.max = 100;
    entropy.c.forEach(item => {
      item.def.controllers.colorHue.min = 0;
      item.def.controllers.colorHue.max = 0;
      item.def.controllers.colorSaturation.min = 0;
      item.def.controllers.colorSaturation.max = 0;
      item.def.controllers.colorBrightness.min = 0;
      item.def.controllers.colorBrightness.max = 100;
    });
    buildTweakpaneUI();
    showToast('Applied: Monochrome', 2000);
  });
  
  colorCyclingFolder.addSeparator();
  
  colorCyclingFolder.addButton({ 
    title: 'Reset to Defaults' 
  }).on('click', () => {
    // Reset hue range
    entropy.def.controllers.colorHue.min = 0;
    entropy.def.controllers.colorHue.max = 100;
    
    // Reset saturation range
    entropy.def.controllers.colorSaturation.min = 0;
    entropy.def.controllers.colorSaturation.max = 100;
    
    // Reset brightness range
    entropy.def.controllers.colorBrightness.min = 50;
    entropy.def.controllers.colorBrightness.max = 100;
    
    // Reset speeds
    entropy.def.counters.c1.step = 0.02;
    entropy.def.counters.c2.step = 0.05;
    entropy.def.counters.c3.step = 0.02;
    
    // Update all walkers
    entropy.c.forEach(item => {
      item.def.controllers.colorHue.min = 0;
      item.def.controllers.colorHue.max = 100;
      item.def.controllers.colorSaturation.min = 0;
      item.def.controllers.colorSaturation.max = 100;
      item.def.controllers.colorBrightness.min = 50;
      item.def.controllers.colorBrightness.max = 100;
    });
    
    // Rebuild UI to show updated values
    buildTweakpaneUI();
    showToast('Color cycling reset to defaults', 2000);
  });

  // Counters folder
  if (entropy && entropy.def && entropy.def.counters) {
    const countersFolder = tweakpane.addFolder({
      title: 'Counters',
      expanded: false,
    });
    
    Object.keys(entropy.def.counters).forEach(key => {
      const counter = entropy.def.counters[key];
      
      // Value
      tweakpaneParams[`counter_${key}_val`] = counter.val;
      countersFolder.addInput(tweakpaneParams, `counter_${key}_val`, {
        label: `${key} (val)`,
      }).on('change', (ev) => {
        entropy.def.counters[key].val = ev.value;
      });
      
      // Step
      tweakpaneParams[`counter_${key}_step`] = counter.step;
      countersFolder.addInput(tweakpaneParams, `counter_${key}_step`, {
        label: `${key} (step)`,
        min: 0,
        max: 1,
        step: 0.001
      }).on('change', (ev) => {
        entropy.def.counters[key].step = ev.value;
      });
    });
  }

  // Meta controls folder
  const metaFolder = tweakpane.addFolder({
    title: 'Meta Controls',
    expanded: true,
  });

  // Mic controls
  tweakpaneParams.useMic = useMic;
  metaFolder.addInput(tweakpaneParams, 'useMic', {
    label: 'Use Mic'
  }).on('change', (ev) => {
    useMic = ev.value;
    if (ui_checkbox_useMic) ui_checkbox_useMic.checked(ev.value);
  });

  tweakpaneParams.micGain = micGain;
  metaFolder.addInput(tweakpaneParams, 'micGain', {
    label: 'Mic Gain',
    min: 0.5,
    max: 10.0,
    step: 0.1
  }).on('change', (ev) => {
    micGain = ev.value;
    if (ui_slider_micGain) ui_slider_micGain.value(ev.value);
    if (ui_label_micGainValue) ui_label_micGainValue.html(ev.value.toFixed(1));
  });

  // Auto draw
  tweakpaneParams.autoDraw = autoDrawEnabled;
  metaFolder.addInput(tweakpaneParams, 'autoDraw', {
    label: 'Auto Draw (A key)'
  }).on('change', (ev) => {
    autoDrawEnabled = ev.value;
  });

  // Action buttons
  const actionsFolder = tweakpane.addFolder({
    title: 'Actions',
    expanded: true,
  });

  actionsFolder.addButton({ title: 'Clear Canvas (C key)' }).on('click', () => {
    clearCanvas();
  });

  actionsFolder.addButton({ title: 'Reset Walkers (R key)' }).on('click', () => {
    resetEntropy();
  });

  actionsFolder.addButton({ title: '❓ Help & Tips' }).on('click', () => {
    showHelpModal();
  });

  actionsFolder.addButton({ title: 'Export PNG' }).on('click', () => {
    exportImage();
  });

  // Load image button - trigger the hidden p5 file input
  actionsFolder.addButton({ title: 'Load Background Image' }).on('click', () => {
    if (ui_button_loadImage && ui_button_loadImage.elt) {
      ui_button_loadImage.elt.click();
    }
  });

  // Presets section
  const presetsFolder = tweakpane.addFolder({
    title: 'Presets',
    expanded: false,
  });

  // Build options object from presets store
  const buildPresetOptions = () => {
    const options = { '-- Select Preset --': '-- Select Preset --' };
    Object.keys(_presetsStore).forEach(name => {
      options[name] = name;
    });
    return options;
  };

  tweakpaneParams.selectedPreset = '-- Select Preset --';
  
  // Add dropdown with current presets
  const presetOptions = buildPresetOptions();
  if (Object.keys(presetOptions).length > 1) {
    presetsFolder.addInput(tweakpaneParams, 'selectedPreset', {
      label: 'Preset',
      options: presetOptions
    });
  } else {
    // Show message if no presets loaded yet
    presetsFolder.addButton({ title: 'Loading presets...' }).disabled = true;
  }

  presetsFolder.addButton({ title: 'Apply Preset' }).on('click', () => {
    const name = tweakpaneParams.selectedPreset;
    if (!name || name === '-- Select Preset --') {
      alert('Select a preset first');
      return;
    }
    const preset = _presetsStore[name];
    if (!preset) {
      alert('Preset not found');
      return;
    }
    applyPresetObject(preset);
    if (typeof showToast === 'function') showToast('Applied preset: ' + name, 2500);
  });
  
  presetsFolder.addButton({ title: 'Load Preset File' }).on('click', () => {
    if (ui_fileInput_presets && ui_fileInput_presets.elt) {
      ui_fileInput_presets.elt.click();
    }
  });

  presetsFolder.addButton({ title: 'Save Current Settings as Preset' }).on('click', () => {
    openPresetModal();
  });

  console.log('✨ Tweakpane UI built successfully');
  console.log('Tweakpane element:', tweakpane.element);
}

function syncTweakpaneValues() {
  if (!tweakpane || !entropy) return;
  
  // Sync controller values
  if (entropy.def && entropy.def.controllers) {
    Object.keys(entropy.def.controllers).forEach(key => {
      const value = entropy.def.controllers[key];
      const paramKey = `controller_${key}`;
      
      if (value && typeof value === 'object' && value.hasOwnProperty('val')) {
        if (tweakpaneParams[paramKey] !== undefined) {
          tweakpaneParams[paramKey] = value.val;
        }
      } else if (typeof value === 'boolean' || typeof value === 'number' || typeof value === 'string') {
        if (tweakpaneParams[paramKey] !== undefined) {
          tweakpaneParams[paramKey] = value;
        }
      }
    });
  }
  
  // Sync meta values
  if (tweakpaneParams.useMic !== undefined) tweakpaneParams.useMic = useMic;
  if (tweakpaneParams.micGain !== undefined) tweakpaneParams.micGain = micGain;
  if (tweakpaneParams.autoDraw !== undefined) tweakpaneParams.autoDraw = autoDrawEnabled;
  
  // Refresh the pane
  tweakpane.refresh();
}

let presetsLoadedCount = 0;
let totalPresetsToLoad = 0;

function updateTweakpanePresetList() {
  if (!tweakpane) return;
  
  presetsLoadedCount++;
  
  // Rebuild Tweakpane UI when all presets are loaded
  // Use a small delay to batch multiple preset registrations
  clearTimeout(window.presetRebuildTimer);
  window.presetRebuildTimer = setTimeout(() => {
    console.log(`🔄 Rebuilding Tweakpane UI with ${Object.keys(_presetsStore).length} presets...`);
    buildTweakpaneUI();
  }, 500); // Wait 500ms after last preset registration
}

//_________________________________________________________________________________________________
// OLD P5.JS UI FUNCTIONS
//_________________________________________________________________________________________________

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

  ui_button_savePreset = createButton('Save Preset (JSON)');
  ui_button_savePreset.position(10, y);
  ui_button_savePreset.mousePressed(openPresetModal);
  y += 30;

  // Presets dropdown and file input for loading presets
  ui_select_presets = createSelect();
  ui_select_presets.position(10, y);
  ui_select_presets.option('-- Select Preset --');
  ui_select_presets.changed(() => {});
  y += 30;

  ui_fileInput_presets = createFileInput(handlePresetFiles, true);
  ui_fileInput_presets.position(10, y);
  ui_fileInput_presets.style('color', '#ffffff');
  y += 30;

  ui_button_applyPreset = createButton('Apply Preset');
  ui_button_applyPreset.position(10, y);
  ui_button_applyPreset.mousePressed(applySelectedPreset);
  y += 30;

  ui_colorPicker_bg = createColorPicker('#000000');
  ui_colorPicker_bg.position(10, y);
  ui_colorPicker_bg.style('width', '100px');
  ui_colorPicker_bg.input(() => {
    currentBgColor = ui_colorPicker_bg.color();
    clearCanvas(); // apply new color immediately
    adjustUILabelColors(currentBgColor); // Update label colors so we can see em mane
    
    // Sync with Tweakpane (v3 uses hex strings)
    if (tweakpaneParams.bgColor !== undefined) {
      // Convert p5 color to hex
      const c = currentBgColor;
      const r = Math.round(red(c)).toString(16).padStart(2, '0');
      const g = Math.round(green(c)).toString(16).padStart(2, '0');
      const b = Math.round(blue(c)).toString(16).padStart(2, '0');
      tweakpaneParams.bgColor = `#${r}${g}${b}`;
      if (tweakpane) tweakpane.refresh();
    }
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
  syncTweakpaneValues(); // Sync Tweakpane with old UI changes
  //uiValidateParameters();
}

// Sync old UI FROM entropy values (opposite of uiParamChanged)
// This updates the UI sliders to match current entropy values without overwriting entropy
function syncOldUIFromEntropy() {
  if (!entropy || !entropy.def) return;
  
  // Update sliders with current entropy values
  if (ui_slide_baseSpread && entropy.def.controllers.baseSpread) {
    ui_slide_baseSpread.value(entropy.def.controllers.baseSpread.val);
    ui_label_baseSpreadValue.html(entropy.def.controllers.baseSpread.val);
  }
  if (ui_slide_pushAmount && entropy.def.controllers.pushAmount) {
    ui_slide_pushAmount.value(entropy.def.controllers.pushAmount.val);
    ui_label_pushAmountValue.html(entropy.def.controllers.pushAmount.val);
  }
  if (ui_slide_opacity && entropy.def.controllers.opacity) {
    ui_slide_opacity.value(entropy.def.controllers.opacity.val);
    ui_label_opacityValue.html(entropy.def.controllers.opacity.val);
  }
  if (ui_slide_strokeWidth && entropy.def.controllers.strokeWidth) {
    ui_slide_strokeWidth.value(entropy.def.controllers.strokeWidth.val);
    ui_label_strokeWidthValue.html(entropy.def.controllers.strokeWidth.val);
  }
  if (ui_checkbox_fixedAngle) {
    ui_checkbox_fixedAngle.checked(entropy.def.controllers.fixedAngle);
  }
  if (ui_checkbox_spreadOscillation) {
    ui_checkbox_spreadOscillation.checked(entropy.def.controllers.spreadOscillation);
  }
  if (ui_slide_oscAmp && entropy.def.controllers.spreadOscillationAmplitude !== undefined) {
    ui_slide_oscAmp.value(entropy.def.controllers.spreadOscillationAmplitude);
    ui_label_oscAmpValue.html(entropy.def.controllers.spreadOscillationAmplitude);
  }
  if (ui_checkbox_allowFunky) {
    ui_checkbox_allowFunky.checked(entropy.def.controllers.allowFunky);
  }
  if (ui_checkbox_sampleColor) {
    ui_checkbox_sampleColor.checked(entropy.def.controllers.sampleColor);
  }
  if (ui_dropdown_blendMode && entropy.def.controllers.colorBlendMode) {
    ui_dropdown_blendMode.selected(entropy.def.controllers.colorBlendMode);
  }
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
  ui_button_savePreset.show();
  ui_select_presets.show();
  ui_fileInput_presets.show();
  ui_button_applyPreset.show();
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
  ui_button_savePreset.hide();
  ui_select_presets.hide();
  ui_fileInput_presets.hide();
  ui_button_applyPreset.hide();
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

//_________________________________________________________________________________________________
// HELP MODAL
//_________________________________________________________________________________________________

function showHelpModal() {
  const modal = document.getElementById('helpModal');
  const helpContent = modal.querySelector('.help-content');
  
  // Build the help content
  helpContent.innerHTML = `
    <div class="help-section">
      <h3>🎮 Keyboard Shortcuts</h3>
      <ul>
        <li><code>H</code> - Hide/Show all UI panels (for full canvas drawing)</li>
        <li><code>C</code> - Clear canvas</li>
        <li><code>A</code> - Toggle Auto Draw mode</li>
        <li><code>R</code> - Reset walkers (keeps all settings)</li>
        <li><code>SHIFT</code> - Toggle old UI panel visibility</li>
      </ul>
    </div>

    <div class="help-section">
      <h3>📦 Bundle Definition</h3>
      <ul>
        <li><strong>Brush Count</strong> - Number of walkers drawing simultaneously. More = denser patterns but slower performance.</li>
        <li><strong>Push Offset</strong> - Varies the step speed between walkers (experimental).</li>
        <li><strong>Noise Map Offset X/Y</strong> - Separates each walker's noise path for more variation.</li>
      </ul>
    </div>

    <div class="help-section">
      <h3>🎛️ Controllers</h3>
      <ul>
        <li><strong>Base Spread</strong> - How far walkers can wander from the mouse/center. Higher = wider spread.</li>
        <li><strong>Spread Amount</strong> - How much the spread increases over time (creates expanding patterns).</li>
        <li><strong>Push Amount</strong> - Step size for each walker. Lower = smoother lines, higher = more chaotic.</li>
        <li><strong>Line Offset X/Y/Times</strong> - Creates echo/shadow effects by drawing additional offset lines.</li>
        <li><strong>Fixed Angle</strong> - When enabled, walkers move only horizontally OR vertically (not diagonally).</li>
        <li><strong>Update XY</strong> - When enabled, walkers follow the mouse position.</li>
        <li><strong>Always Step</strong> - Walkers keep moving even when mouse is idle.</li>
        <li><strong>Spread Oscillation</strong> - Makes spread pulse/wave in and out.</li>
        <li><strong>Oscillation Amplitude</strong> - How dramatic the spread oscillation is.</li>
        <li><strong>Allow Funky</strong> - Enables experimental behaviors when Auto Draw is on.</li>
      </ul>
    </div>

    <div class="help-section">
      <h3>🎨 Color Controls</h3>
      <ul>
        <li><strong>Enable Brush Color</strong> - Use a fixed color instead of color cycling.</li>
        <li><strong>Brush Color</strong> - Pick your fixed brush color (when enabled).</li>
        <li><strong>Stroke Width</strong> - Line thickness. Very low values create delicate wispy lines.</li>
        <li><strong>Opacity</strong> - Line transparency. Lower = more transparent, creates layered effects.</li>
        <li><strong>Color Blend Mode</strong> - How colors mix (Multiply, Screen, Add, etc.). Experiment!</li>
        <li><strong>Sample Color from Image</strong> - When an image is loaded, sample colors from it as walkers move.</li>
        <li><strong>Background Color</strong> - Canvas background color.</li>
      </ul>
    </div>

    <div class="help-section">
      <h3>🌈 Color Cycling Settings</h3>
      <p><em>Active when both "Enable Brush Color" and "Sample Color from Image" are OFF.</em></p>
      <ul>
        <li><strong>Hue/Saturation/Brightness Min/Max</strong> - Define the range for automatic color animation.</li>
        <li><strong>Hue/Saturation/Brightness Speed</strong> - How fast colors cycle through their ranges.</li>
        <li><strong>Quick Presets</strong> - Instant color schemes (Rainbow, Cool Tones, Warm Tones, etc.).</li>
      </ul>
    </div>

    <div class="help-section">
      <h3>⚙️ Meta Controls</h3>
      <ul>
        <li><strong>Auto Draw</strong> - Walkers draw continuously without mouse movement.</li>
        <li><strong>Use Microphone</strong> - (Experimental) Control parameters with audio input.</li>
        <li><strong>Mic Gain</strong> - Sensitivity for microphone input.</li>
      </ul>
    </div>

    <div class="help-section">
      <h3>🎬 Actions</h3>
      <ul>
        <li><strong>Clear Canvas</strong> - Erase everything and start fresh.</li>
        <li><strong>Reset Walkers</strong> - Reset walker positions and noise maps while keeping all your settings.</li>
        <li><strong>Export PNG</strong> - Save your artwork as an image.</li>
        <li><strong>Save Preset</strong> - Save all current settings as a JSON preset file.</li>
        <li><strong>Load Preset File</strong> - Load settings from a saved preset JSON file.</li>
        <li><strong>Preset Dropdown</strong> - Quick access to built-in presets.</li>
      </ul>
    </div>

    <div class="help-section">
      <h3>💡 Drawing Tips & Tricks</h3>
      <ul>
        <li>Start with low opacity (10-50) and layer your strokes for rich, complex textures.</li>
        <li>Very low push amounts (0.001-0.01) create smooth, flowing lines.</li>
        <li>Higher push amounts (0.05-0.1) create more chaotic, energetic patterns.</li>
        <li>Experiment with blend modes - Multiply/Screen/Add create very different effects!</li>
        <li>Use "Fixed Angle" for architectural/geometric patterns.</li>
        <li>Try oscillating spread with low amplitude (50-100) for breathing effects.</li>
        <li>Sample colors from photos to create artwork inspired by the image palette.</li>
        <li>Use Auto Draw + low opacity to create evolving, meditative patterns.</li>
      </ul>
    </div>

    <div class="help-section">
      <h3>🚀 Performance Tips</h3>
      <ul>
        <li>Lower brush counts (20-100) run faster on older hardware.</li>
        <li>Higher brush counts (150-500+) create denser patterns but require more CPU.</li>
        <li>Press <code>H</code> to hide UI for better performance during recording/export.</li>
      </ul>
    </div>

    <p style="text-align: center; margin-top: 30px; color: #666;">
      <em>More tips coming soon as we discover new techniques!</em>
    </p>
  `;
  
  // Show the modal
  modal.style.display = 'block';
  
  // Close button handler
  const closeBtn = modal.querySelector('.close-modal');
  closeBtn.onclick = function() {
    modal.style.display = 'none';
  };
  
  // Close when clicking outside the modal content
  window.onclick = function(event) {
    if (event.target == modal) {
      modal.style.display = 'none';
    }
  };
  
  // Close with ESC key
  document.onkeydown = function(event) {
    if (event.key === 'Escape' && modal.style.display === 'block') {
      modal.style.display = 'none';
    }
  };
}
