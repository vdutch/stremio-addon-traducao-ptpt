import { aggregatedTrending } from './aggregator.js';
import { translate } from './translator.js';
import { applyGlossary } from './glossary.js';
import { CONFIG } from './config.js';

async function run() {
  console.log('Pré-tradução iniciada...');
  for (const type of ['movie','series']) {
    const list = await aggregatedTrending(type).catch(()=>[]);
    for (const item of list) {
      const tName = applyGlossary(await translate(item.name, CONFIG.TARGET_LANG));
      const tDesc = applyGlossary(await translate(item.description || '', CONFIG.TARGET_LANG));
      console.log(`[CACHE] ${type} ${item.name} -> ${tName.slice(0,40)} / ${tDesc.slice(0,60)}`);
    }
  }
  console.log('Pré-tradução concluída.');
}
run();
