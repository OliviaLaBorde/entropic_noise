Place JSON preset files in this folder.

Run the helper to generate `index.json` which `entropic_noise.js` will fetch at startup:

```bash
node ./tools/generate_preset_index.js
```

`index.json` will be an array of filenames, e.g.:

[
  "default.json",
  "grainy.json"
]
