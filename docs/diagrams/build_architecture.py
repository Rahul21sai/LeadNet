from copy import deepcopy
from pathlib import Path
import re
import xml.etree.ElementTree as ET


ROOT = Path(__file__).resolve().parent
NS = 'http://www.w3.org/2000/svg'
ET.register_namespace('', NS)
ET.register_namespace('xlink', 'http://www.w3.org/1999/xlink')
INK, MUTED, BLUE, GREEN = '#202124', '#5f6368', '#1a73e8', '#188038'
LINE, LIGHT = '#dadce0', '#f8fafd'
svg = ET.Element(f'{{{NS}}}svg', {'width': '2560', 'height': '1440', 'viewBox': '0 0 2560 1440', 'role': 'img', 'aria-labelledby': 'title desc'})


def el(tag, attrs=None, parent=None, **extra):
    return ET.SubElement(parent if parent is not None else svg, f'{{{NS}}}{tag}', {**(attrs or {}), **{k.replace('_', '-'): str(v) for k, v in extra.items()}})


el('title', {'id': 'title'}).text = 'Namma Civic system architecture with official Google Cloud and Firebase product icons'
el('desc', {'id': 'desc'}).text = 'Connected target: React SPA on Firebase Hosting calls the Hono API on Cloud Run, which uses Firebase Authentication, Firestore, Cloud Storage and bounded Vertex AI Gemini. Application code determines civic and connection outcomes. A separate configured Vercel demonstration uses fictional records and device storage. Deployment and video runtime are unverified.'
defs = el('defs')
for name, colour in [('blue', BLUE), ('gray', MUTED), ('green', GREEN)]:
    marker = el('marker', {'id': f'arrow-{name}', 'viewBox': '0 0 10 10', 'refX': '9', 'refY': '5', 'markerWidth': '8', 'markerHeight': '8', 'orient': 'auto-start-reverse'}, defs)
    el('path', {'d': 'M 0 0 L 10 5 L 0 10 z', 'fill': colour}, marker)


def rect(x, y, w, h, fill='#ffffff', stroke=LINE, radius=12, dash=None):
    attrs = dict(x=x, y=y, width=w, height=h, rx=radius, fill=fill, stroke=stroke, stroke_width=2)
    if dash:
        attrs['stroke_dasharray'] = dash
    return el('rect', **attrs)


def text(x, y, value, size=22, weight=400, colour=INK, anchor='start'):
    node = el('text', x=x, y=y, font_family='Arial, Helvetica, sans-serif', font_size=size, font_weight=weight, fill=colour, text_anchor=anchor)
    node.text = value
    return node


def wire(points, colour=BLUE, dashed=False, arrow='end', width=3):
    attrs = {'points': ' '.join(f'{x},{y}' for x, y in points), 'fill': 'none', 'stroke': colour, 'stroke-width': str(width), 'stroke-linejoin': 'round', 'stroke-linecap': 'round'}
    marker = 'green' if colour == GREEN else 'gray' if colour == MUTED else 'blue'
    if arrow in ('end', 'both'):
        attrs['marker-end'] = f'url(#arrow-{marker})'
    if arrow == 'both':
        attrs['marker-start'] = f'url(#arrow-{marker})'
    if dashed:
        attrs['stroke-dasharray'] = '8 7'
    return el('polyline', attrs)


def icon(name, x, y, size=76):
    node = deepcopy(ET.parse(ROOT / 'assets' / f'{name}.svg').getroot())
    prefix = f'{name}-{x}-{y}'
    identifiers = {item.get('id'): f'{prefix}-{item.get("id")}' for item in node.iter() if item.get('id')}
    for item in node.iter():
        for key, value in list(item.attrib.items()):
            if key == 'id':
                item.set(key, identifiers[value])
            elif key == 'class':
                item.set(key, ' '.join(f'{prefix}-{part}' for part in value.split()))
            else:
                for before, after in identifiers.items():
                    value = value.replace(f'url(#{before})', f'url(#{after})')
                    if value == f'#{before}':
                        value = f'#{after}'
                item.set(key, value)
        if item.tag == f'{{{NS}}}style' and item.text:
            item.text = re.sub(r'\.([a-zA-Z_][\w-]*)', lambda m: f'.{prefix}-{m.group(1)}', item.text)
    node.set('x', str(x)); node.set('y', str(y)); node.set('width', str(size)); node.set('height', str(size))
    node.set('preserveAspectRatio', 'xMidYMid meet')
    svg.append(node)


def simple_icon(kind, x, y):
    group = el('g', transform=f'translate({x} {y})', fill='none', stroke=MUTED, stroke_width=3, stroke_linecap='round', stroke_linejoin='round')
    if kind == 'people':
        el('circle', cx=19, cy=16, r=10, parent=group)
        el('circle', cx=49, cy=19, r=8, parent=group)
        el('path', {'d': 'M2 57 V48 C2 28 36 28 36 48 V57 M39 37 C56 31 65 42 63 55'}, group)
    else:
        el('rect', x=0, y=0, width=68, height=48, rx=5, parent=group)
        el('path', {'d': 'M0 12 H68 M24 60 H46 M35 48 V60'}, group)
        el('circle', cx=8, cy=6, r=1, parent=group)


# Page and scope boundaries.
rect(0, 0, 2560, 1440, stroke='none', radius=0)
text(80, 86, 'Namma Civic', 60, 700)
text(540, 86, 'System architecture', 34, 400, MUTED)
text(80, 127, 'Civic accountability, local community and consent-based connections', 24, 400, MUTED)
text(2470, 77, '18 OCT 2026', 19, 600, MUTED, 'end')
text(2470, 111, 'Source architecture • deployment unverified', 21, 400, MUTED, 'end')
rect(640, 165, 1840, 895, LIGHT, '#c6dafc', 18)
text(680, 216, 'Google Cloud + Firebase', 31, 600, BLUE)
text(2440, 216, 'CONNECTED TARGET', 19, 600, MUTED, 'end')
rect(1140, 335, 580, 675, '#ffffff', '#b8c9e6', 14)
icon('cloud-run', 1172, 360, 64)
text(1260, 394, 'Cloud Run', 32, 600)
text(1260, 429, 'Hono API • Node.js 22', 23, 400, MUTED)

# Connectors are placed before nodes so their endpoints stay behind the borders.
wire([(300, 295), (300, 365)])
wire([(520, 470), (720, 470)])
text(620, 450, 'HTTPS', 19, 400, BLUE, 'middle')
wire([(1020, 455), (1080, 455), (1080, 520), (1175, 520)])
text(1078, 434, '/api/v1', 19, 400, BLUE, 'middle')
wire([(520, 400), (590, 400), (590, 265), (2190, 265), (2190, 300)])
text(1960, 247, 'Rules-scoped realtime reads', 19, 400, BLUE, 'end')
wire([(520, 660), (600, 660), (600, 746), (720, 746)], arrow='both')
text(610, 783, 'Sign-in', 18, 400, BLUE)
wire([(1175, 565), (1090, 565), (1090, 744), (1020, 744)])
text(1084, 702, 'Token', 18, 400, BLUE, 'end')
text(1084, 725, 'checks', 18, 400, BLUE, 'end')
wire([(1685, 500), (1840, 500), (1840, 400), (1970, 400)], arrow='both')
text(1823, 380, 'Transactions', 19, 400, BLUE, 'middle')
wire([(1685, 545), (1810, 545), (1810, 660), (1970, 660)])
text(1880, 638, 'Processed media', 18, 400, BLUE, 'middle')
wire([(1685, 570), (1780, 570), (1780, 880), (1970, 880)])
text(1875, 857, 'Bounded AI call', 18, 400, BLUE, 'middle')
wire([(1970, 960), (1685, 960)])
text(1830, 990, 'Proposed output', 18, 400, BLUE, 'middle')
wire([(1685, 900), (1740, 900), (1740, 590), (1685, 590)], GREEN)
text(1705, 817, 'Verified /', 18, 400, GREEN, 'end')
text(1705, 840, 'fallback', 18, 400, GREEN, 'end')
wire([(1020, 945), (1150, 945), (1150, 745), (1175, 745)], MUTED, True)

# Browser and actor nodes.
rect(80, 195, 440, 100)
simple_icon('people', 108, 215)
text(199, 238, 'Citizens & leaders', 27, 600)
text(199, 272, 'Authorized roles and ward scope', 20, 400, MUTED)
rect(80, 365, 440, 340)
simple_icon('browser', 112, 397)
text(112, 507, 'React 19 + Vite', 31, 600)
text(112, 549, 'Community • capture • People', 23, 400, MUTED)
text(112, 582, 'Leaders • map • public ledger', 23, 400, MUTED)
text(112, 631, 'Camera / voice / location', 22, 400, MUTED)
text(112, 671, 'Review before publishing or connecting', 20, 400, MUTED)

# Firebase Hosting and Authentication: official individual product artwork.
rect(720, 365, 300, 180)
icon('firebase-hosting', 838, 384, 64)
text(870, 483, 'Firebase Hosting', 26, 600, anchor='middle')
text(870, 518, 'SPA + API rewrite', 21, 400, MUTED, 'middle')
rect(720, 655, 300, 180)
icon('firebase-auth', 838, 674, 64)
text(870, 775, 'Firebase Auth', 26, 600, anchor='middle')
text(870, 810, 'Anonymous / Google', 21, 400, MUTED, 'middle')
rect(720, 880, 300, 130, '#ffffff', LINE, 10)
text(744, 920, 'Routing & contacts', 24, 600)
text(744, 956, 'Ward GeoJSON', 21, 400, MUTED)
text(744, 987, 'Sourced MLA / MP JSON', 21, 400, MUTED)

# Cloud Run is one runtime; policy and verifier boxes are application modules.
rect(1175, 465, 510, 135, '#f8fafd', '#d2e3fc', 9)
text(1200, 503, 'Application API', 26, 600)
text(1200, 541, 'Reports • evidence • citizen verification', 22, 400, MUTED)
text(1200, 573, 'Creators • People • connection requests', 22, 400, MUTED)
wire([(1430, 600), (1430, 655)], MUTED, True)
text(1450, 637, 'Imports code', 18, 400, MUTED)
rect(1175, 655, 510, 140, '#f8f9fa', LINE, 9)
text(1200, 691, 'Deterministic application logic', 25, 600)
text(1200, 725, 'API: ward routing, privacy, limits, transactions', 20, 400, MUTED)
text(1200, 754, 'Shared: priority, SLA, state, quorum, ledger', 20, 400, MUTED)
text(1200, 782, 'Shared: connection consent and revisions', 20, 400, MUTED)
rect(1175, 850, 510, 125, '#f1f8f2', '#b7dfc3', 9)
text(1200, 889, 'AI response checks', 25, 600, GREEN)
text(1200, 926, 'Schema + task checks → one repair retry', 21, 400, MUTED)
text(1200, 957, 'Validated output or deterministic fallback', 21, 400, MUTED)

# Managed storage and bounded AI services.
rect(1970, 300, 440, 195)
icon('firestore', 1994, 321, 70)
text(2090, 366, 'Firestore', 30, 600)
text(1994, 420, 'Public issues / posts / wards / ledger', 21, 400, MUTED)
text(1994, 450, 'Private ownership / connections / drafts', 21, 400, MUTED)
text(1994, 479, 'Private AI audits + approved public trails', 20, 400, MUTED)
rect(1970, 570, 440, 180)
icon('cloud-storage', 1994, 590, 70)
text(2090, 635, 'Cloud Storage', 30, 600)
text(1994, 696, 'Sanitized photos • private voice', 21, 400, MUTED)
text(1994, 725, 'Video: FFmpeg runtime unverified', 21, 400, MUTED)
rect(1970, 835, 440, 175)
icon('vertex-ai', 1994, 855, 70)
text(2090, 900, 'Vertex AI / Gemini', 29, 600)
text(1994, 956, 'Classify • transcribe • compose', 21, 400, MUTED)
text(1994, 986, 'Compare duplicates and evidence', 21, 400, MUTED)

text(680, 1039, 'All mutations and private connection reads pass through the API. Code determines civic outcomes.', 21, 400, MUTED)
text(680, 1102, 'Optional user-reviewed outreach: API → Resend email  |  Browser → X composer', 23, 400, MUTED)

# The preview is deliberately disconnected from the cloud target.
rect(80, 1160, 2400, 180, '#f8f9fa', '#c9cdd3', 14, '9 7')
text(112, 1206, 'Vercel static demo configuration', 29, 600)
text(112, 1244, 'VITE_DEMO_MODE=1', 22, 400, MUTED)
text(112, 1280, 'Browser-only activity; no deployed Cloud API', 21, 400, MUTED)
el('line', x1=750, y1=1190, x2=750, y2=1307, stroke=LINE, stroke_width=2)
text(795, 1208, 'Bundled assets', 26, 600)
text(795, 1247, 'Real ward geometry + fictional city records', 22, 400, MUTED)
text(795, 1282, 'Fictional People profiles and incoming requests', 22, 400, MUTED)
el('line', x1=1600, y1=1190, x2=1600, y2=1307, stroke=LINE, stroke_width=2)
text(1645, 1208, 'Device storage', 26, 600)
text(1645, 1247, 'IndexedDB: captured media and community posts', 22, 400, MUTED)
text(1645, 1282, 'localStorage: connection requests and preferences', 22, 400, MUTED)
text(80, 1393, 'Product artwork: official Google Cloud icon library + Firebase brand assets. Diagram reflects implemented source, not verified deployment.', 19, 400, MUTED)
text(2480, 1393, 'Namma Civic', 22, 600, MUTED, 'end')

ET.indent(svg, space='  ')
target = ROOT / 'leadnet-google-cloud-architecture.svg'
target.write_bytes(ET.tostring(svg, encoding='utf-8', xml_declaration=True))
print(target)
