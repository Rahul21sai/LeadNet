// Dependency-free planar geometry helpers for ward boundaries (lng/lat degrees).
// Bengaluru spans < 0.6°, so an equirectangular scale (x · cos φ₀) is accurate
// enough for simplification tolerances and label placement.

export const BLR_LAT0 = 12.97;
const KX = Math.cos((BLR_LAT0 * Math.PI) / 180);

export const round = (n, dp) => {
  const f = 10 ** dp;
  return Math.round(n * f) / f;
};

/** Polygon/MultiPolygon → array of polygons (each [outer, ...holes]). */
export const polygonsOf = (geom) => (geom.type === 'Polygon' ? [geom.coordinates] : geom.type === 'MultiPolygon' ? geom.coordinates : []);

export const fromPolygons = (polys) =>
  polys.length === 1 ? { type: 'Polygon', coordinates: polys[0] } : { type: 'MultiPolygon', coordinates: polys };

/** Shoelace signed area in degrees² (positive = counter-clockwise). Ring may be open or closed. */
export function signedArea(ring) {
  let a = 0;
  for (let i = 0, n = ring.length; i < n; i++) {
    const [x1, y1] = ring[i];
    const [x2, y2] = ring[(i + 1) % n];
    a += x1 * y2 - x2 * y1;
  }
  return a / 2;
}

const same = (a, b) => a[0] === b[0] && a[1] === b[1];

/**
 * Round, drop consecutive duplicates, close, and orient a ring.
 * RFC 7946 winding: exterior counter-clockwise, holes clockwise.
 * Returns null when fewer than 3 distinct vertices remain.
 */
export function cleanRing(ring, dp, exterior) {
  const out = [];
  for (const [x, y] of ring) {
    const p = [round(x, dp), round(y, dp)];
    if (out.length && same(out[out.length - 1], p)) continue;
    // Source tracing and coordinate rounding can leave short, retraced spikes.
    const previous = out.findLastIndex((q) => same(q, p));
    if (previous >= 0 && out.length - previous <= 8 && Math.abs(signedArea([...out.slice(previous), p])) < 1e-9) {
      out.splice(previous + 1);
    } else out.push(p);
  }
  while (out.length > 1 && same(out[0], out[out.length - 1])) out.pop();
  if (out.length < 3) return null;
  const ccw = signedArea(out) > 0;
  if (ccw !== exterior) out.reverse();
  out.push([...out[0]]);
  return out;
}

export function cleanGeometry(geom, dp) {
  const polys = [];
  for (const poly of polygonsOf(geom)) {
    const outer = cleanRing(poly[0], dp, true);
    if (!outer) continue;
    const holes = poly.slice(1).map((r) => cleanRing(r, dp, false)).filter(Boolean);
    polys.push([outer, ...holes]);
  }
  return polys.length ? fromPolygons(polys) : null;
}

/* ---------- point in polygon (even-odd per ring, holes subtract) ---------- */

function inRing(x, y, ring) {
  let c = false;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const [xi, yi] = ring[i];
    const [xj, yj] = ring[j];
    if (yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) c = !c;
  }
  return c;
}

export function pointInPolygonGeom(lng, lat, geom) {
  for (const poly of polygonsOf(geom)) {
    if (!inRing(lng, lat, poly[0])) continue;
    if (poly.slice(1).some((h) => inRing(lng, lat, h))) continue;
    return true;
  }
  return false;
}

export function bboxOf(geom) {
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
  for (const poly of polygonsOf(geom))
    for (const [x, y] of poly[0]) {
      if (x < minX) minX = x;
      if (y < minY) minY = y;
      if (x > maxX) maxX = x;
      if (y > maxY) maxY = y;
    }
  return [minX, minY, maxX, maxY];
}

/* ---------- validity ---------- */

const orient = (a, b, c) => (b[0] - a[0]) * (c[1] - a[1]) - (b[1] - a[1]) * (c[0] - a[0]);
const onSeg = (a, b, p) =>
  Math.min(a[0], b[0]) <= p[0] && p[0] <= Math.max(a[0], b[0]) && Math.min(a[1], b[1]) <= p[1] && p[1] <= Math.max(a[1], b[1]);

function segmentsIntersect(a, b, c, d) {
  const o1 = orient(a, b, c), o2 = orient(a, b, d), o3 = orient(c, d, a), o4 = orient(c, d, b);
  if (((o1 > 0 && o2 < 0) || (o1 < 0 && o2 > 0)) && ((o3 > 0 && o4 < 0) || (o3 < 0 && o4 > 0))) return true;
  if (o1 === 0 && onSeg(a, b, c)) return true;
  if (o2 === 0 && onSeg(a, b, d)) return true;
  if (o3 === 0 && onSeg(c, d, a)) return true;
  if (o4 === 0 && onSeg(c, d, b)) return true;
  return false;
}

/** Number of intersecting non-adjacent segment pairs in a closed ring (sweep on min x). */
export function selfIntersections(ring) {
  const n = ring.length - 1;
  const segs = [];
  for (let i = 0; i < n; i++) {
    const a = ring[i], b = ring[i + 1];
    segs.push({ i, a, b, minX: Math.min(a[0], b[0]), maxX: Math.max(a[0], b[0]), minY: Math.min(a[1], b[1]), maxY: Math.max(a[1], b[1]) });
  }
  segs.sort((s, t) => s.minX - t.minX);
  let hits = 0;
  for (let p = 0; p < segs.length; p++) {
    const s = segs[p];
    for (let q = p + 1; q < segs.length && segs[q].minX <= s.maxX; q++) {
      const t = segs[q];
      const d = Math.abs(s.i - t.i);
      if (d === 1 || d === n - 1) continue; // neighbours share a vertex
      if (t.minY > s.maxY || t.maxY < s.minY) continue;
      if (segmentsIntersect(s.a, s.b, t.a, t.b)) hits++;
    }
  }
  return hits;
}

/** Structural checks for a Polygon/MultiPolygon. Returns a list of problems (empty = valid). */
export function validateGeometry(geom, bounds = [77.2, 12.6, 78.0, 13.4]) {
  const problems = [];
  if (!geom || (geom.type !== 'Polygon' && geom.type !== 'MultiPolygon')) return ['not a polygon'];
  polygonsOf(geom).forEach((poly, pi) => {
    poly.forEach((ring, ri) => {
      const tag = `part ${pi} ring ${ri}`;
      if (ring.length < 4) problems.push(`${tag}: fewer than 4 positions`);
      if (!same(ring[0], ring[ring.length - 1])) problems.push(`${tag}: not closed`);
      if (ring.some(([x, y]) => !Number.isFinite(x) || !Number.isFinite(y))) problems.push(`${tag}: non-finite coordinate`);
      if (ring.some(([x, y]) => x < bounds[0] || x > bounds[2] || y < bounds[1] || y > bounds[3])) problems.push(`${tag}: outside Bengaluru bounds`);
      const area = signedArea(ring.slice(0, -1));
      if (area === 0) problems.push(`${tag}: zero area`);
      if (ri === 0 && area < 0) problems.push(`${tag}: exterior not counter-clockwise`);
      if (ri > 0 && area > 0) problems.push(`${tag}: hole not clockwise`);
      const x = selfIntersections(ring);
      if (x) problems.push(`${tag}: ${x} self-intersection(s)`);
      if (ri > 0 && !inRing(ring[0][0], ring[0][1], poly[0])) problems.push(`${tag}: hole outside exterior`);
    });
  });
  return problems;
}

/* ---------- Douglas–Peucker ---------- */

function segDist2(p, a, b) {
  const px = p[0] * KX, py = p[1], ax = a[0] * KX, ay = a[1], bx = b[0] * KX, by = b[1];
  let dx = bx - ax, dy = by - ay;
  if (dx !== 0 || dy !== 0) {
    const t = ((px - ax) * dx + (py - ay) * dy) / (dx * dx + dy * dy);
    if (t > 1) {
      dx = px - bx;
      dy = py - by;
      return dx * dx + dy * dy;
    }
    if (t > 0) {
      dx = px - (ax + dx * t);
      dy = py - (ay + dy * t);
      return dx * dx + dy * dy;
    }
  }
  dx = px - ax;
  dy = py - ay;
  return dx * dx + dy * dy;
}

/** Douglas–Peucker on an open polyline; both endpoints are always kept. tol in degrees of latitude. */
export function douglasPeucker(points, tol) {
  if (points.length <= 2) return points.slice();
  const keep = new Uint8Array(points.length);
  keep[0] = keep[points.length - 1] = 1;
  const tol2 = tol * tol;
  const stack = [[0, points.length - 1]];
  while (stack.length) {
    const [first, last] = stack.pop();
    let maxD = 0, idx = -1;
    for (let i = first + 1; i < last; i++) {
      const d = segDist2(points[i], points[first], points[last]);
      if (d > maxD) {
        maxD = d;
        idx = i;
      }
    }
    if (idx !== -1 && maxD > tol2) {
      keep[idx] = 1;
      stack.push([first, idx], [idx, last]);
    }
  }
  return points.filter((_, i) => keep[i]);
}

/* ---------- topology-preserving simplification ---------- */

const key = (p) => `${p[0]},${p[1]}`;

/**
 * Simplify every ring of every feature while keeping shared borders identical:
 * rings are cut into arcs at vertices where the set of rings using a vertex
 * changes, each distinct arc is simplified once, and rings are rebuilt from
 * the shared result. Neighbouring wards therefore never gap or overlap where
 * the source shared vertices. Rings that would collapse keep their original
 * vertices.
 */
export function simplifyTopology(geoms, tol) {
  const rings = [];
  geoms.forEach((g, gi) => polygonsOf(g).forEach((poly, pi) => poly.forEach((ring, ri) => rings.push({ gi, pi, ri, pts: ring.slice(0, -1) }))));

  // A vertex is a junction when the rings passing through it disagree about its
  // neighbours (TopoJSON-style): that is where a shared border starts or ends.
  const neighbours = new Map();
  for (const r of rings) {
    const n = r.pts.length;
    r.pts.forEach((p, i) => {
      const a = key(r.pts[(i - 1 + n) % n]);
      const b = key(r.pts[(i + 1) % n]);
      const pair = a < b ? `${a};${b}` : `${b};${a}`;
      const k = key(p);
      let s = neighbours.get(k);
      if (!s) neighbours.set(k, (s = new Set()));
      s.add(pair);
    });
  }
  const isJunction = (p) => neighbours.get(key(p)).size > 1;

  const cache = new Map();
  const simplifyArc = (arc) => {
    const fwd = arc.map(key);
    let reversed = fwd[0] > fwd[fwd.length - 1] || (fwd[0] === fwd[fwd.length - 1] && fwd.length > 2 && fwd[1] > fwd[fwd.length - 2]);
    const canon = reversed ? [...arc].reverse() : arc;
    const ck = (reversed ? [...fwd].reverse() : fwd).join(';');
    let res = cache.get(ck);
    if (!res) cache.set(ck, (res = douglasPeucker(canon, tol)));
    return reversed ? [...res].reverse() : res;
  };

  const simplifyClosed = (pts) => {
    // Canonical start (smallest key) and direction so twin rings (a hole and the ward filling it) agree.
    let s = 0;
    for (let i = 1; i < pts.length; i++) if (key(pts[i]) < key(pts[s])) s = i;
    let rot = [...pts.slice(s), ...pts.slice(0, s)];
    const flip = rot.length > 2 && key(rot[rot.length - 1]) < key(rot[1]);
    if (flip) rot = [rot[0], ...rot.slice(1).reverse()];
    let far = 1, farD = -1;
    for (let i = 1; i < rot.length; i++) {
      const d = segDist2(rot[i], rot[0], rot[0]);
      if (d > farD) {
        farD = d;
        far = i;
      }
    }
    const a = simplifyArc([...rot.slice(0, far + 1)]);
    const b = simplifyArc([...rot.slice(far), rot[0]]);
    let out = [...a, ...b.slice(1, -1)];
    if (flip) out = [out[0], ...out.slice(1).reverse()];
    return out;
  };

  const rebuilt = rings.map((r) => {
    const n = r.pts.length;
    const junction = [];
    for (let i = 0; i < n; i++) if (isJunction(r.pts[i])) junction.push(i);
    let out;
    if (!junction.length) out = simplifyClosed(r.pts);
    else {
      out = [];
      for (let j = 0; j < junction.length; j++) {
        const from = junction[j];
        const to = junction[(j + 1) % junction.length];
        const arc = [];
        for (let i = from; ; i = (i + 1) % n) {
          arc.push(r.pts[i]);
          if (i === to && arc.length > 1) break;
          if (arc.length > n + 1) break;
        }
        const simp = simplifyArc(arc);
        out.push(...simp.slice(0, -1));
      }
    }
    if (out.length < 3 || Math.abs(signedArea(out)) < Math.abs(signedArea(r.pts)) * 0.5) out = r.pts;
    return { ...r, pts: out };
  });

  return geoms.map((g, gi) => {
    const polys = polygonsOf(g).map((poly, pi) =>
      poly.map((_, ri) => {
        const r = rebuilt.find((x) => x.gi === gi && x.pi === pi && x.ri === ri);
        return [...r.pts, [...r.pts[0]]];
      }),
    );
    return fromPolygons(polys);
  });
}

/* ---------- pole of inaccessibility (label point) ---------- */

class MaxHeap {
  constructor() {
    this.a = [];
  }
  push(v) {
    const a = this.a;
    a.push(v);
    let i = a.length - 1;
    while (i > 0) {
      const p = (i - 1) >> 1;
      if (a[p].max >= a[i].max) break;
      [a[p], a[i]] = [a[i], a[p]];
      i = p;
    }
  }
  pop() {
    const a = this.a;
    const top = a[0];
    const last = a.pop();
    if (a.length) {
      a[0] = last;
      let i = 0;
      for (;;) {
        const l = 2 * i + 1, r = l + 1;
        let m = i;
        if (l < a.length && a[l].max > a[m].max) m = l;
        if (r < a.length && a[r].max > a[m].max) m = r;
        if (m === i) break;
        [a[m], a[i]] = [a[i], a[m]];
        i = m;
      }
    }
    return top;
  }
  get size() {
    return this.a.length;
  }
}

/** Signed distance from (x, y) to a projected polygon outline; positive inside. */
function signedDist(x, y, poly) {
  let inside = false;
  let min = Infinity;
  for (const ring of poly) {
    for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
      const a = ring[i], b = ring[j];
      if (a[1] > y !== b[1] > y && x < ((b[0] - a[0]) * (y - a[1])) / (b[1] - a[1]) + a[0]) inside = !inside;
      let dx = b[0] - a[0], dy = b[1] - a[1], px = a[0], py = a[1];
      if (dx !== 0 || dy !== 0) {
        const t = ((x - a[0]) * dx + (y - a[1]) * dy) / (dx * dx + dy * dy);
        if (t > 1) {
          px = b[0];
          py = b[1];
        } else if (t > 0) {
          px += dx * t;
          py += dy * t;
        }
      }
      dx = x - px;
      dy = y - py;
      min = Math.min(min, dx * dx + dy * dy);
    }
  }
  return (inside ? 1 : -1) * Math.sqrt(min);
}

function cell(x, y, h, poly) {
  const d = signedDist(x, y, poly);
  return { x, y, h, d, max: d + h * Math.SQRT2 };
}

/** Polylabel-style search on one polygon ([outer, ...holes], lng/lat). Returns { point, dist }. */
function poleOfPolygon(polygon, precision) {
  const poly = polygon.map((ring) => ring.map(([x, y]) => [x * KX, y]));
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
  for (const [x, y] of poly[0]) {
    minX = Math.min(minX, x);
    minY = Math.min(minY, y);
    maxX = Math.max(maxX, x);
    maxY = Math.max(maxY, y);
  }
  const size = Math.min(maxX - minX, maxY - minY);
  if (size === 0) return { point: [minX / KX, minY], dist: 0 };
  const heap = new MaxHeap();
  for (let x = minX; x < maxX; x += size) for (let y = minY; y < maxY; y += size) heap.push(cell(x + size / 2, y + size / 2, size / 2, poly));

  // Seed with the area centroid and the bbox centre.
  let cx = 0, cy = 0, A = 0;
  const ring = poly[0];
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const f = ring[i][0] * ring[j][1] - ring[j][0] * ring[i][1];
    cx += (ring[i][0] + ring[j][0]) * f;
    cy += (ring[i][1] + ring[j][1]) * f;
    A += f * 3;
  }
  let best = A ? cell(cx / A, cy / A, 0, poly) : cell(minX, minY, 0, poly);
  const mid = cell(minX + (maxX - minX) / 2, minY + (maxY - minY) / 2, 0, poly);
  if (mid.d > best.d) best = mid;

  while (heap.size) {
    const c = heap.pop();
    if (c.d > best.d) best = c;
    if (c.max - best.d <= precision) continue;
    const h = c.h / 2;
    heap.push(cell(c.x - h, c.y - h, h, poly));
    heap.push(cell(c.x + h, c.y - h, h, poly));
    heap.push(cell(c.x - h, c.y + h, h, poly));
    heap.push(cell(c.x + h, c.y + h, h, poly));
  }
  return { point: [best.x / KX, best.y], dist: best.d };
}

/** Interior label point for a Polygon/MultiPolygon: the pole of inaccessibility of its roomiest part. */
export function labelPoint(geom, precision = 0.00001) {
  let best = null;
  for (const poly of polygonsOf(geom)) {
    const r = poleOfPolygon(poly, precision);
    if (!best || r.dist > best.dist) best = r;
  }
  return best;
}
