import { createHash } from 'node:crypto';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';

const args = Object.fromEntries(process.argv.slice(2).reduce((pairs, value, index, all) => index % 2 ? pairs : [...pairs, [value.replace(/^--/, ''), all[index + 1]]], []));
if (!args['photo-meta'] || !args['audio-meta']) throw new Error('Use --photo-meta <photo_meta.json> --audio-meta <audio_meta.json>');
const root = fileURLToPath(new URL('../../', import.meta.url));
const output = resolve(root, 'apps/web/public/samples');
const photos = JSON.parse(readFileSync(args['photo-meta'], 'utf8'));
const audio = JSON.parse(readFileSync(args['audio-meta'], 'utf8'));
const spec = {
  'pothole-1': ['Potholes on a Bengaluru road', 'pothole', ['traffic_risk'], 'blr-pothole-a', 'report', 'Bengaluru, India'],
  'pothole-1-recrop': ['Same pothole, constructed crop', 'pothole', ['traffic_risk'], 'blr-pothole-a', 'duplicate', 'Bengaluru, India'],
  'pothole-2': ['Road damage in Munnekollala', 'pothole', ['traffic_risk'], 'blr-pothole-b', 'report', 'Bengaluru, India'],
  'pothole-3-before': ['Reform Row potholes before repair (London)', 'pothole', ['traffic_risk'], 'reform-row', 'report', 'Reform Row, Tottenham, London, UK'],
  'pothole-3-after': ['Reform Row after repairs (London)', 'pothole', [], 'reform-row', 'resolution', 'Reform Row, Tottenham, London, UK'],
  'road-elsewhere-1': ['Different street: Savalanga Road, Shivamogga', 'pothole', [], 'shivamogga-road', 'negative', 'Shivamogga, Karnataka, India'],
  'garbage-1': ['Garbage beside a Bengaluru footpath', 'garbage', ['health', 'pedestrian_risk'], 'blr-garbage-a', 'report', 'Bengaluru, India'],
  'garbage-1-closeup': ['A second view of the same Bengaluru waste pile', 'garbage', ['health', 'pedestrian_risk'], 'blr-garbage-a', 'duplicate', 'Jayanagara, Bengaluru, India'],
  'garbage-2': ['Garbage in Vishwapriya Nagar', 'garbage', ['health'], 'blr-garbage-b', 'report', 'Vishwapriya Nagar, Bengaluru, India'],
  'drainage-1': ['Bengaluru road flooding', 'drainage', ['flooding', 'traffic_risk'], 'blr-flood', 'report', 'Bengaluru, India'],
  'drainage-2': ['Open sewer in Pandharpur', 'drainage', ['health', 'pedestrian_risk'], 'pandharpur-sewer', 'report', 'Pandharpur, Maharashtra, India'],
  'footpath-1': ['Obstructed Bengaluru sidewalk', 'footpath', ['pedestrian_risk', 'accessibility'], 'blr-footpath', 'report', 'Bengaluru, India'],
  'trees-1': ['Fallen tree after flooding in Borivali', 'trees', ['traffic_risk'], 'borivali-tree', 'report', 'Borivali, Mumbai, India'],
  'streetlight-1': ['Tilting streetlight in Fairham', 'streetlight', ['electrical', 'pedestrian_risk'], 'fairham-light', 'report', 'Fairham, UK'],
};
const samples = [];
const sha256 = (bytes) => createHash('sha256').update(bytes).digest('hex');
for (const [id, [title, category, expectedHazards, scene, role, photographedLocation]] of Object.entries(spec)) {
  const parent = id === 'pothole-1-recrop' ? 'pothole-1' : id;
  const source = photos[parent];
  if (!source) throw new Error(`Missing source metadata for ${id}`);
  const file = `/samples/photos/${id}.jpg`;
  const bytes = readFileSync(resolve(output, `photos/${id}.jpg`));
  const meta = await sharp(bytes).metadata();
  if (meta.exif || meta.xmp || meta.iptc) throw new Error(`${id}: personal metadata must be removed`);
  samples.push({ id, kind: 'photo', file, title, category, expectedHazards, lat: 12.9756, lng: 77.6066,
    locationMode: 'illustrative_demo_pin', photographedLocation,
    credit: { author: source.author, license: source.license, licenseUrl: source.licenseUrl, source: source.source },
    derived: id === 'pothole-1-recrop', pairOf: id === 'pothole-1-recrop' ? 'pothole-1' : id === 'pothole-3-after' ? 'pothole-3-before' : id === 'garbage-1-closeup' ? 'garbage-1' : null,
    scene, role, width: meta.width, height: meta.height, bytes: bytes.length, sha256: sha256(bytes),
    originalDate: source.dateOriginal, exifStripped: true, privacyBlurRegions: source.blurredRegions,
    transformations: id === 'pothole-1-recrop' ? 'Crop [6%,20%,82%,62%] of parent; JPEG re-encode. No defect removed.' : `Resized to <=1600px; JPEG re-encode; ${source.blurredRegions} privacy blur regions.`,
  });
}
for (const [id, source] of Object.entries(audio)) {
  const file = `/samples/audio/${id}.mp3`;
  const bytes = readFileSync(resolve(output, `audio/${id}.mp3`));
  samples.push({ id, kind: 'audio', file, title: `${source.lang.toUpperCase()} synthetic demo complaint`,
    category: source.lang === 'kn' ? 'pothole' : source.lang === 'hi' ? 'garbage' : 'streetlight',
    lang: source.lang, transcript: source.transcript, seconds: source.seconds, sampleRate: source.sampleRate,
    synthetic: true, source: 'Google Translate text-to-speech (synthetic voice)',
    sourceUrl: 'https://translate.google.com/translate_tts', bytes: bytes.length, sha256: sha256(bytes),
    lat: source.lang === 'hi' ? 12.9634 : source.lang === 'en' ? 12.9784 : 12.9756,
    lng: source.lang === 'hi' ? 77.577 : source.lang === 'en' ? 77.6408 : 77.6066,
    locationMode: 'illustrative_demo_pin',
  });
}
const manifest = { generatedAt: Date.UTC(2026, 9, 17, 8),
  notice: 'Licensed illustration assets, reused in fictional demo records. Pins are replay locations, not photo geolocation. The repair pair is from London. Audio is synthetic; citizen recordings are never public.',
  evidencePairs: [{ before: 'pothole-3-before', after: 'pothole-3-after', relation: 'Same street, documented repair sequence, different viewpoints', sourceLocation: 'Reform Row, Tottenham, London, UK', defectCorrespondence: 'Individual pothole correspondence is not guaranteed.' }],
  samples };
mkdirSync(output, { recursive: true });
writeFileSync(resolve(output, 'manifest.json'), JSON.stringify(manifest, null, 2) + '\n');
writeFileSync(resolve(root, 'apps/api/data/sample-media.json'), JSON.stringify({ version: 1, samples: samples.map((sample) => ({
  id: sample.id, kind: sample.kind, sha256: sample.sha256, file: sample.file,
  source: sample.kind === 'photo' ? sample.credit.source : sample.source,
  illustrative: true, ...(sample.kind === 'audio' ? { synthetic: true } : { photographedLocation: sample.photographedLocation }),
})) }, null, 2) + '\n');
const credits = ['# Sample media credits', '', manifest.notice, '', 'Every photo retains its source licence. Resizing, JPEG re-encoding and privacy blurs are modifications; derivative files retain the parent licence.', '',
  ...samples.filter((s) => s.kind === 'photo').flatMap((s) => [`## ${s.id}`, '', `- **File:** ${s.file}`, `- **Author:** ${s.credit.author}`, `- **Licence:** [${s.credit.license}](${s.credit.licenseUrl})`, `- **Original:** [Wikimedia Commons](${s.credit.source})`, `- **Photographed location:** ${s.photographedLocation}`, `- **Original date:** ${s.originalDate}`, `- **Modifications:** ${s.transformations}`, `- **SHA-256:** ${s.sha256}`, '']),
  '## Synthetic audio', '', 'Generated using Google Translate text-to-speech on 17 October 2026. These clips contain scripted fictional complaints. They do not contain citizen recordings or identifiable speakers.', '',
  ...samples.filter((s) => s.kind === 'audio').flatMap((s) => [`- **${s.id}**: ${s.lang}, ${s.seconds}s, ${s.sampleRate}Hz, synthetic.`, `  Transcript: ${s.transcript}`]), '',
  '## Constructed evaluation relationships', '', 'pothole-1 / pothole-1-recrop is an explicitly constructed crop pair for duplicate matching. garbage-1 / garbage-1-closeup is a second photo of the same apparent waste pile, photographed about 90 seconds apart by the same photographer. pothole-3-before / pothole-3-after is a sourced same-street repair sequence from London, photographed on 3 August and 23 September 2017. Different viewpoints and individual-defect correspondence require human review. road-elsewhere-1 is a different city and is the wrong-location negative.', ''];
writeFileSync(resolve(output, 'CREDITS.md'), credits.join('\n'));
console.log(JSON.stringify({ photos: samples.filter((s) => s.kind === 'photo').length, audio: samples.filter((s) => s.kind === 'audio').length, filesWithoutExif: samples.filter((s) => s.kind === 'photo' && s.exifStripped).length, syntheticAudioSeconds: samples.filter((s) => s.kind === 'audio').map((s) => ({ id: s.id, seconds: s.seconds })) }, null, 2));
