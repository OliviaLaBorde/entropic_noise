# Tweakpane UI Integration - Notes

## What Was Done

Successfully integrated **Tweakpane v3.1.10** as a modern UI replacement for the entropic_noise project.

### Files Modified:
1. `dist/index.html` - Added Tweakpane library
2. `dist/entropic_noise.js` - Added Tweakpane UI builder
3. `dist/style.css` - Added Tweakpane positioning styles
4. `dist/tweakpane.min.js` - Downloaded library locally (152KB)

## Features

### Tweakpane UI Structure:
- **Bundle Definition** folder (collapsed) - brushCount, noise offsets
- **Controllers** folder (expanded) - All drawing parameters with sliders/checkboxes
- **Counters** folder (collapsed) - Counter values and steps (c1-c5)
- **Meta Controls** folder (expanded) - Background color, mic settings, auto draw
- **Actions** folder (expanded) - Clear, Reset, Export, Save Preset, Load Image buttons
- **Presets** folder (collapsed) - Load preset file, apply preset buttons

### Fixed Issues:
1. ✅ Reset Walkers now preserves current settings (doesn't reset to defaults)
2. ✅ Load Image button triggers the file picker
3. ✅ Presets load from server with console logging

## How to Use

### Opening UIs:
- **Tweakpane**: Always visible in top-right corner
- **Old UI**: Press `Shift` or click `☰` button to toggle

### Keyboard Shortcuts:
- `A` key - Toggle auto-draw
- `R` key - Reset walkers (preserves settings)
- `Shift` - Toggle old UI menu

### Presets:
- Presets load automatically from `preset_brush/` folder
- Check console for preset loading status
- Use old UI dropdown (Shift) to select presets
- Or use "Load Preset File" button in Tweakpane to load custom presets
- Click "Apply Selected Preset" to apply the chosen preset

### Load Image:
- Click "Load Image" button in Tweakpane Actions folder
- Select an image file
- Enable "Sample Color from Image" checkbox to draw using image colors

## Technical Details

### Why Tweakpane v3?
- v4 uses ES6 modules only (not compatible with regular script tags)
- v3 has proper UMD browser bundle
- v3 uses `addInput()` API instead of v4's `addBinding()`

### API Differences (v3):
```javascript
// Creating sliders
pane.addInput(params, 'paramName', {
  min: 0, max: 100, step: 1
});

// Creating checkboxes
pane.addInput(params, 'boolParam', {
  label: 'Enable Feature'
});

// Creating buttons
pane.addButton({ title: 'Click Me' }).on('click', () => {
  // handler
});

// Creating folders
const folder = pane.addFolder({
  title: 'My Folder',
  expanded: true
});
```

### Two-Way Sync:
- Old UI changes update Tweakpane via `syncTweakpaneValues()`
- Tweakpane changes update entropy and old UI directly
- Both UIs can be used simultaneously

## Known Limitations

1. **Preset Dropdown**: Tweakpane v3 doesn't support dynamic option updates
   - Workaround: Use old UI dropdown for preset selection
   - Or use "Load Preset File" button to load individual preset files

2. **Color Picker**: Uses hex strings instead of RGB objects
   - Old UI and Tweakpane stay in sync via hex conversion

3. **File Inputs**: Tweakpane doesn't have native file input
   - Solution: Buttons trigger hidden p5.js file inputs

## Future Improvements

1. Upgrade to Tweakpane v4 when p5.js project uses ES6 modules
2. Add custom preset dropdown that updates dynamically
3. Add more visual feedback (tooltips, parameter ranges)
4. Organize controls into more logical groupings
5. Add preset import/export directly in Tweakpane

## Troubleshooting

### Tweakpane not showing?
1. Hard refresh: Ctrl+Shift+R (Windows) or Cmd+Shift+R (Mac)
2. Check console for errors
3. Verify `tweakpane.min.js` exists in `dist/` folder

### Presets not loading?
1. Check console for preset loading messages
2. Verify `preset_brush/index.json` exists
3. Check Network tab in dev tools for 404 errors

### Controls not working?
1. Check console for JavaScript errors
2. Verify entropy object exists
3. Try resetting with R key
