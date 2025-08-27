import fs from 'fs';
import { CONFIG } from './config.js';

let glossary = {};

export function loadGlossary() {
  try {
    if (fs.existsSync(CONFIG.GLOSSARY_PATH)) {
      const raw = fs.readFileSync(CONFIG.GLOSSARY_PATH, 'utf-8');
      glossary = JSON.parse(raw);
    }
  } catch (e) {
    // ignore
  }
}

export function applyGlossary(text) {
  if (!text) return text;
  let result = text;
  for (const [original, replacement] of Object.entries(glossary)) {
    const regex = new RegExp(`\\b${original}\\b`, 'gi');
    result = result.replace(regex, replacement);
  }
  return result;
}

loadGlossary();
