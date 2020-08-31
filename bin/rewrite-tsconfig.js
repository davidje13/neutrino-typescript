#!/usr/bin/env node

const neutrino = require('neutrino');
const fs = require('fs');

const tsconfigPath = 'tsconfig.json';
const prefix = [
  '/* This file is auto-generated;',
  ' * Edit .neutrinorc.js to change configuration.',
  ' */',
  '',
].join('\n');

const config = neutrino().tsconfig();
const oldContent = loadFile(tsconfigPath);
const indent = getIndent(oldContent) || '  ';
const newContent = prefix + JSON.stringify(config, null, indent) + '\n';
if (newContent !== oldContent) {
  fs.writeFileSync(tsconfigPath, newContent);
}

function loadFile(filename) {
  try {
    return fs.readFileSync(filename, { encoding: 'utf8' });
  } catch (ignore) {}
  return '';
}

function getIndent(content) {
  const match = /(?:^|\n)([ \t]+)"/.exec(content);
  return match ? match[1] : null;
}
