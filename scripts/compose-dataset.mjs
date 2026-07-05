/**
 * Validate the canonical dataset in data/ and compose the single
 * public/data/dataset.json the app serves. Runs automatically before
 * `npm run dev` and `npm run build`.
 */
import { loadParts, validate, composeDataset, writePublicDataset } from './lib.mjs';

const parts = loadParts();
validate(parts);
const dataset = composeDataset(parts);
writePublicDataset(dataset);
console.log(
  `dataset v${dataset.version} (${dataset.updated}): ` +
    `${dataset.games.length} rated, ${dataset.graveyard.length} in the graveyard, ` +
    `${dataset.publishers.length} publishers, ${dataset.stores.length} stores, ${dataset.laws.length} laws`,
);
