// Load a polygon dataset from KML or GeoJSON (decided by file extension).
import { readFileSync } from 'node:fs';
import { parseKml } from './kml.mjs';

export function loadPolygons(path) {
  const text = readFileSync(path, 'utf8');
  if (/\.kml$/i.test(path)) return parseKml(text).features;
  const fc = JSON.parse(text);
  if (fc?.type !== 'FeatureCollection' || !Array.isArray(fc.features)) throw new Error(`${path}: not a GeoJSON FeatureCollection`);
  return fc.features.filter((f) => f?.geometry && (f.geometry.type === 'Polygon' || f.geometry.type === 'MultiPolygon'));
}

/** Minimal RFC 4180 CSV parser (quoted fields, doubled quotes). Returns rows of trimmed cells. */
export function parseCsv(text) {
  const rows = [];
  for (const line of text.replace(/^﻿/, '').split(/\r?\n/)) {
    if (!line.trim()) continue;
    const cells = [];
    let cur = '';
    let q = false;
    for (let i = 0; i < line.length; i++) {
      const ch = line[i];
      if (q) {
        if (ch === '"' && line[i + 1] === '"') {
          cur += '"';
          i++;
        } else if (ch === '"') q = false;
        else cur += ch;
      } else if (ch === '"') q = true;
      else if (ch === ',') {
        cells.push(cur);
        cur = '';
      } else cur += ch;
    }
    cells.push(cur);
    rows.push(cells.map((c) => c.trim()));
  }
  return rows;
}
