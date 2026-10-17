// Minimal, dependency-free KML → GeoJSON parser for polygon datasets.
//
// Scope is deliberately narrow: Placemark name + ExtendedData (Data/value and
// SchemaData/SimpleData) and Polygon / MultiGeometry geometry with
// outerBoundaryIs / innerBoundaryIs LinearRings. Points and lines are ignored
// because no boundary dataset we use contains them. The input is untrusted
// data: it is scanned with regular expressions and never evaluated.

const ENTITY = { amp: '&', lt: '<', gt: '>', quot: '"', apos: "'" };

/** Decode XML entities and unwrap CDATA. */
export function xmlText(raw) {
  if (raw == null) return '';
  const cdata = /^\s*<!\[CDATA\[([\s\S]*?)\]\]>\s*$/.exec(raw);
  if (cdata) return cdata[1].trim();
  return raw
    .replace(/&(#x[0-9a-f]+|#[0-9]+|[a-z]+);/gi, (m, e) => {
      if (e[0] === '#') {
        const code = e[1] === 'x' || e[1] === 'X' ? parseInt(e.slice(2), 16) : parseInt(e.slice(1), 10);
        return Number.isFinite(code) && code > 0 && code <= 0x10ffff ? String.fromCodePoint(code) : m;
      }
      return ENTITY[e.toLowerCase()] ?? m;
    })
    .trim();
}

/** All non-overlapping <tag ...>…</tag> bodies (namespace prefixes tolerated). */
function blocks(xml, tag) {
  const re = new RegExp(`<(?:[\\w-]+:)?${tag}\\b[^>]*?(?:/>|>([\\s\\S]*?)</(?:[\\w-]+:)?${tag}\\s*>)`, 'g');
  const out = [];
  let m;
  while ((m = re.exec(xml))) out.push(m[1] ?? '');
  return out;
}

function firstBlock(xml, tag) {
  return blocks(xml, tag)[0];
}

/** "lng,lat[,alt] lng,lat[,alt] …" → [[lng, lat], …] (altitude dropped). */
export function parseCoordinates(text) {
  const out = [];
  for (const tuple of text.trim().split(/\s+/)) {
    if (!tuple) continue;
    const [lng, lat] = tuple.split(',').map(Number);
    if (!Number.isFinite(lng) || !Number.isFinite(lat)) throw new Error(`Bad coordinate tuple "${tuple}"`);
    out.push([lng, lat]);
  }
  return out;
}

function ringsOf(boundaryXml) {
  return blocks(boundaryXml, 'LinearRing').map((ring) => parseCoordinates(xmlText(firstBlock(ring, 'coordinates') ?? '')));
}

/** One <Polygon> body → GeoJSON polygon coordinates [outer, ...holes]. */
function parsePolygon(polyXml) {
  const outerXml = firstBlock(polyXml, 'outerBoundaryIs');
  if (outerXml === undefined) throw new Error('Polygon without outerBoundaryIs');
  const [outer] = ringsOf(outerXml);
  if (!outer) throw new Error('outerBoundaryIs without LinearRing');
  const holes = blocks(polyXml, 'innerBoundaryIs').flatMap(ringsOf);
  return [outer, ...holes];
}

function parseProperties(pmXml) {
  const props = {};
  const name = firstBlock(pmXml, 'name');
  if (name !== undefined) props.name = xmlText(name);
  const ext = firstBlock(pmXml, 'ExtendedData');
  if (ext !== undefined) {
    const dataRe = /<(?:[\w-]+:)?Data\b[^>]*\bname\s*=\s*"([^"]*)"[^>]*>([\s\S]*?)<\/(?:[\w-]+:)?Data\s*>/g;
    let m;
    while ((m = dataRe.exec(ext))) {
      const value = firstBlock(m[2], 'value');
      props[xmlText(m[1])] = xmlText(value ?? '');
    }
    const simpleRe = /<(?:[\w-]+:)?SimpleData\b[^>]*\bname\s*=\s*"([^"]*)"[^>]*?(?:\/>|>([\s\S]*?)<\/(?:[\w-]+:)?SimpleData\s*>)/g;
    while ((m = simpleRe.exec(ext))) props[xmlText(m[1])] = xmlText(m[2] ?? '');
  }
  return props;
}

/**
 * Parse KML text into a GeoJSON FeatureCollection. Every Placemark with at least
 * one Polygon becomes a Feature (Polygon, or MultiPolygon when it has several).
 * Coordinates are returned exactly as written; callers round/close/validate.
 */
export function parseKml(text) {
  // Comments can contain markup-like text; drop them before scanning.
  const xml = text.replace(/<!--[\s\S]*?-->/g, '');
  const features = [];
  let skipped = 0;
  for (const pm of blocks(xml, 'Placemark')) {
    const polygons = blocks(pm, 'Polygon').map(parsePolygon);
    if (!polygons.length) {
      skipped++;
      continue;
    }
    features.push({
      type: 'Feature',
      properties: parseProperties(pm),
      geometry: polygons.length === 1 ? { type: 'Polygon', coordinates: polygons[0] } : { type: 'MultiPolygon', coordinates: polygons },
    });
  }
  return { type: 'FeatureCollection', features, skipped };
}
