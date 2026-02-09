#!/usr/bin/env node
// generate_preset_index.js
// Scans ../preset_brush for .json files and writes preset_brush/index.json

const fs = require('fs');
const path = require('path');

const presetDir = path.join(__dirname, '..', 'preset_brush');
const indexPath = path.join(presetDir, 'index.json');

if (!fs.existsSync(presetDir)) {
  console.error('preset_brush directory does not exist:', presetDir);
  process.exit(1);
}

const files = fs.readdirSync(presetDir)
  .filter(f => f.toLowerCase().endsWith('.json') && f !== 'index.json')
  .sort();

fs.writeFileSync(indexPath, JSON.stringify(files, null, 2), 'utf8');
console.log('Wrote', indexPath, 'with', files.length, 'entries');
