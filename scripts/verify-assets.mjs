import { statSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');

// Load registries by reading the TS source as text and extracting assetPath strings,
// avoiding the need to compile TS for this sanity check. The regex is intentionally
// narrow: matches `assetPath: '...'` or `assetPath: "..."`.
import { readFileSync } from 'node:fs';
const extract = (path) => {
  const src = readFileSync(resolve(root, path), 'utf8');
  return [...src.matchAll(/assetPath:\s*['"]([^'"]+)['"]/g)].map((m) => m[1]);
};
const fishPaths = extract('src/data/fish.ts');
const decorPaths = extract('src/data/decorations.ts');

let failed = 0;
const check = (rel) => {
  const abs = resolve(root, 'public', rel);
  try {
    statSync(abs);
  } catch {
    console.error(`MISSING: ${rel}`);
    failed++;
  }
};
fishPaths.forEach(check);
decorPaths.forEach(check);

// Also extract biome species lists vs fish ids to detect orphans.
const fishSrc = readFileSync(resolve(root, 'src/data/fish.ts'), 'utf8');
const biomeSrc = readFileSync(resolve(root, 'src/data/biomes.ts'), 'utf8');
const speciesIds = [...fishSrc.matchAll(/id:\s*['"]([^'"]+)['"]/g)].map((m) => m[1]);
const biomeIdMatches = [...biomeSrc.matchAll(/fishSpeciesIds:\s*\[([^\]]+)\]/g)];
const biomeFishIds = biomeIdMatches.flatMap((m) =>
  [...m[1].matchAll(/['"]([^'"]+)['"]/g)].map((x) => x[1]),
);

if (biomeFishIds.length !== speciesIds.length) {
  console.error(
    `COUNT MISMATCH: biomes list ${biomeFishIds.length} ids, FISH_SPECIES has ${speciesIds.length}`,
  );
  failed++;
}
for (const id of biomeFishIds) {
  if (!speciesIds.includes(id)) {
    console.error(`ORPHAN: biome references unknown species "${id}"`);
    failed++;
  }
}

if (failed > 0) {
  console.error(`\n${failed} error(s).`);
  process.exit(1);
} else {
  console.log(`OK: ${fishPaths.length} fish + ${decorPaths.length} decorations verified.`);
}
