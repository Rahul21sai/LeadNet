#!/usr/bin/env node
// Convert a polygon KML to GeoJSON, keeping every Placemark name/ExtendedData field.
//   node scripts/geo/kml2geojson.mjs <input.kml> <output.geojson> [--dp 6]
import { readFileSync, writeFileSync } from 'node:fs';
import { parseKml } from './kml.mjs';
import { cleanGeometry } from './geo.mjs';

const args = process.argv.slice(2);
const dpAt = args.indexOf('--dp');
const dp = dpAt === -1 ? 6 : Number(args.splice(dpAt, 2)[1]);
const [input, output] = args;
if (!input || !output || !Number.isInteger(dp)) {
  console.error('usage: kml2geojson.mjs <input.kml> <output.geojson> [--dp 6]');
  process.exit(2);
}

const fc = parseKml(readFileSync(input, 'utf8'));
const features = fc.features
  .map((f) => ({ ...f, geometry: cleanGeometry(f.geometry, dp) }))
  .filter((f) => f.geometry);
writeFileSync(output, JSON.stringify({ type: 'FeatureCollection', features }));
console.log(`${input}: ${features.length} polygon features (${fc.skipped} placemarks without polygons skipped) -> ${output}`);
