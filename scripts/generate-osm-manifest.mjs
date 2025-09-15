import { promises as fs } from 'node:fs';
import path from 'node:path';

async function main() {
  const root = process.cwd();
  const osmDir = path.join(root, 'public', 'osm');
  try {
    const entries = await fs.readdir(osmDir, { withFileTypes: true });
    const files = entries
      .filter(e => e.isFile() && e.name.toLowerCase().endsWith('.geojson'))
      .map(e => e.name)
      .sort();
    const items = files.map(file => {
      const base = file.replace(/\.geojson$/i, '');
      const id = base.replace(/[^a-z0-9_\-]/gi, '_');
      const title = base.replace(/[_\-]+/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
      return { id, title, file };
    });
    const outPath = path.join(osmDir, 'manifest.json');
    await fs.writeFile(outPath, JSON.stringify(items, null, 2));
    console.log(`[osm] Wrote manifest with ${items.length} items to ${outPath}`);
  } catch (err) {
    // If the folder doesn't exist, just skip silently
    console.warn('[osm] Skipping manifest generation:', err.message);
  }
}

main();


