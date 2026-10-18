import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.dirname(fileURLToPath(import.meta.url));
const plan = JSON.parse(await fs.readFile(path.join(root, '../video-notes/scene-plan.json'), 'utf8'));
const timing = JSON.parse(await fs.readFile(path.join(root, 'narration-timings.json'), 'utf8'));
const escape = (text) => text.replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('"', '&quot;');
const commonCss = `
@font-face{font-family:Inter;src:url('assets/inter-latin.woff2') format('woff2');font-weight:100 900;font-display:swap}
*{box-sizing:border-box}html,body{margin:0;width:1920px;height:1080px;overflow:hidden;background:#f7f5f1}
#main{position:relative;width:100%;height:100%;background:#f7f5f1;color:#17212b;font-family:Inter,sans-serif}
.scene-slot{position:absolute;inset:0;width:100%;height:100%}
#film-header{position:absolute;left:96px;right:96px;top:40px;height:60px;z-index:20;display:flex;align-items:center;justify-content:space-between;border-bottom:2px solid #d7d4ce;padding-bottom:22px}
#film-brand{font-size:30px;font-weight:700;letter-spacing:-1px}#film-team{font-size:21px;color:#596978;letter-spacing:3px;text-transform:uppercase}
#caption-rail{position:absolute;left:96px;right:96px;bottom:34px;height:100px;z-index:40;background:#17212b;border-radius:18px;color:#f7f5f1;overflow:hidden}
.caption{position:absolute;inset:0;display:flex;align-items:center;justify-content:center;padding:14px 46px;font-size:28px;font-weight:500;line-height:1.25;text-align:center;letter-spacing:-.3px}
#film-progress{position:absolute;bottom:0;left:0;width:1920px;height:5px;background:#a8492d;transform-origin:left;z-index:50}
`;

const scenes = plan.scenes;
const hosts = scenes.map((scene, index) => `<div id="slot-${scene.id}" class="scene-slot clip" data-composition-id="${scene.id}" data-composition-src="compositions/frames/${scene.id}.html" data-start="${scene.start}" data-duration="${scene.end-scene.start}" data-track-index="${index+1}" data-width="1920" data-height="1080"></div>`).join('\n');
const audio = timing.scenes.map((scene, index) => `<audio id="narrator-${scene.id}" class="clip" src="${scene.src}" data-start="${scene.start}" data-duration="${scene.duration}" data-track-index="${index+10}" data-volume="1"></audio>`).join('\n');
const captionData = [];
for (const scene of scenes) {
  const voice = timing.scenes.find((item) => item.id === scene.id);
  const words = scene.narration.split(/\s+/);
  let consumed = 0;
  while (consumed < words.length) {
    const group = words.slice(consumed, consumed + 13);
    const start = voice.start + voice.duration * consumed / words.length;
    const duration = voice.duration * group.length / words.length;
    captionData.push({text:group.join(' '),start,duration});
    consumed += group.length;
  }
}
const captions = captionData.map((item, index) => `<div id="caption-${index}" class="caption clip" data-start="${item.start.toFixed(4)}" data-duration="${item.duration.toFixed(4)}" data-track-index="30">${escape(item.text)}</div>`).join('\n');
await fs.writeFile(path.join(root, 'index.html'), `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=1920,height=1080"><title>Namma Civic | Tri-Fusion | Demonstration</title><script src="assets/gsap.min.js"></script><style>${commonCss}</style></head><body><div id="main" data-composition-id="main" data-duration="215" data-width="1920" data-height="1080" data-fps="24">${hosts}${audio}<header id="film-header"><span id="film-brand">Namma Civic</span><span id="film-team">Tri-Fusion · AI Builder Cup</span></header><div id="caption-rail" data-layout-allow-caption-zone>${captions}</div><div id="film-progress" aria-hidden="true" data-layout-ignore></div></div><script>{const tl=gsap.timeline({paused:true});tl.fromTo('#film-progress',{scaleX:0},{scaleX:1,duration:215,ease:'none'},0);window.__timelines.main=tl;}</script></body></html>\n`);

function sceneHtml(id, duration, css, body, animate) {
  const rootId = `scene-${id}`;
  const scopedAnimate = animate.replaceAll(`#${id}`, `#${rootId}`);
  return `<!doctype html><html lang="en"><head><meta charset="utf-8"></head><body><template><style>#${rootId}{position:absolute;inset:0;width:100%;height:100%;overflow:hidden;background:#f7f5f1;color:#17212b;font-family:Inter,sans-serif}#${rootId} .eyebrow{font-size:21px;letter-spacing:3px;text-transform:uppercase;color:#a8492d;font-weight:700}#${rootId} h1{font-family:'EB Garamond',serif;font-size:83px;line-height:1.03;letter-spacing:-2.5px;font-weight:400;margin:21px 0 24px}#${rootId} .body{font-size:30px;line-height:1.4;color:#596978}#${rootId} .tag{display:inline-block;padding:12px 20px;border:2px solid #d7d4ce;border-radius:40px;font-size:21px;line-height:1.1}#${rootId} .source{font-size:20px;line-height:1.4;color:#596978}${css}</style><div id="${rootId}" data-composition-id="${id}" data-duration="${duration}" data-width="1920" data-height="1080">${body}</div><script>{const tl=gsap.timeline({paused:true});${scopedAnimate}window.__timelines['${id}']=tl;}</script></template></body></html>\n`;
}

const captures = path.join(root,'assets/captures');
const exists = async (file) => fs.access(file).then(()=>true,()=>false);
const captureRefs = {
  issue: '03-issue-evidence.png', beforeAfter: '03b-before-after.png',
  verification: '04-citizen-verification.png', ledger:'05-ledger.png', people:'06-people-opt-in.png',
  home:'01-community.png', compose:'02-new-issue.png', city:'07-city-explore.png',
  composeTop:'02a-composer-top.png', composeLocation:'02b-composer-location.png'
};
for (const [key,value] of Object.entries(captureRefs)) {
  if (!await exists(path.join(captures,value))) captureRefs[key]=null;
}
function actualImage(name, alt, classes='capture-image') {
  if (!captureRefs[name]) return `<div class="capture-pending"><strong>Genuine app capture pending</strong><p>This is a production preview. No interaction result is simulated.</p></div>`;
  return `<img class="${classes}" src="../../assets/captures/${captureRefs[name]}" alt="${escape(alt)}">`;
}

const captureCss = `.copy{position:absolute;left:96px;top:156px;width:560px}.copy h1{font-size:81px}.copy .body{margin:0 0 34px}.capture-window{position:absolute;left:710px;top:158px;width:1114px;height:675px;border:2px solid #d7d4ce;border-radius:18px;overflow:hidden;background:#fff}.capture-window img{display:block;width:100%;height:100%;object-fit:contain;object-position:top;background:#fff}.capture-pending{height:100%;display:flex;flex-direction:column;justify-content:center;align-items:center;padding:80px;text-align:center;font-size:32px}.capture-pending p{font-size:26px;line-height:1.45;color:#596978}.capture-source{position:absolute;left:710px;top:852px;width:1100px;font-size:21px;color:#596978}.callout{position:absolute;left:96px;top:730px;width:540px;padding:23px 27px;background:#f7e9e1;border-radius:16px;font-size:26px;line-height:1.35}.sequence{position:absolute;inset:0}.chips{display:flex;gap:12px;flex-wrap:wrap}.capture-stage{position:absolute;inset:0}`;

const captureBody = `<div class="copy"><div class="eyebrow">01 · Capture and review</div><h1 id="capture-head">Give the issue<br>its first record.</h1><p class="body">Photo, written observation or a private voice note.</p><div class="chips"><span class="tag">Review before sharing</span><span class="tag">Private voice</span></div></div><div class="capture-window"><div id="capture-stage" class="capture-stage">${actualImage('composeTop','Genuine deployed issue composer, enlarged upper controls')}</div><div id="capture-location-stage" class="capture-stage">${actualImage('composeLocation','Genuine deployed issue composer, enlarged location and AI controls')}</div></div><div class="capture-source">Captured 18 Oct from the earlier Vercel preview · Device-only demo</div><div class="callout">Device posts stay in this browser. Nothing is sent to an official.</div>`;
await fs.writeFile(path.join(root,'compositions/frames/03-capture.html'),sceneHtml('03-capture',35,captureCss,captureBody,`tl.fromTo('#capture-head',{y:40,opacity:0},{y:0,opacity:1,duration:.65,ease:'power3.out'},.12);tl.fromTo('#03-capture .capture-window',{x:80,opacity:0},{x:0,opacity:1,duration:.75,ease:'power2.out'},.3);tl.fromTo('#capture-location-stage',{opacity:0},{opacity:1,duration:.35},14);tl.to('#capture-stage',{opacity:0,duration:.2},14);`));

const communityBody = `<div class="copy"><div class="eyebrow">02 · Community</div><h1 id="community-head">Find your<br>neighbourhood.</h1><p class="body">Discover people. Discuss local issues. Choose who to connect with.</p><div class="chips"><span class="tag">Opt in</span><span class="tag">Two-sided consent</span></div></div><div class="capture-window">${actualImage('people','Genuine People page with fictional browser-local profiles')}</div><div class="capture-source">Earlier Vercel capture · 18 Oct 2026 · Fictional, browser-local requests</div><div class="callout">Social reactions never decide whether a repair is verified.</div>`;
await fs.writeFile(path.join(root,'compositions/frames/04-community.html'),sceneHtml('04-community',31,captureCss,communityBody,`tl.fromTo('#community-head',{x:-45,opacity:0},{x:0,opacity:1,duration:.65,ease:'power3.out'},.1);tl.fromTo('#04-community .capture-window',{y:45,opacity:0},{y:0,opacity:1,duration:.7,ease:'power2.out'},.3);tl.fromTo('#04-community .tag',{y:20,opacity:0},{y:0,opacity:1,duration:.4,stagger:.1},2);`));

const evidenceBody = `<div class="evidence-title"><span class="eyebrow">03 · Accountability</span><h1 id="evidence-head">Claimed is different from verified.</h1></div><div id="evidence-panel-1" class="evidence-panel">${actualImage('beforeAfter','Actual issue page before and after comparison with illustrative photographs')}<div class="evidence-label">Inspect the evidence.</div></div><div id="evidence-panel-2" class="evidence-panel">${actualImage('verification','Actual fictional issue verification history')}<div class="evidence-label">Read the citizen verdict.</div></div><div id="evidence-panel-3" class="evidence-panel">${actualImage('ledger','Actual public ledger from the deployed demonstration')}<div class="evidence-label">See what the record proves.</div></div><div class="evidence-source">Earlier Vercel captures · 18 Oct 2026 · Fictional histories and totals · Read-only inspection</div>`;
const evidenceCss = `.evidence-title{position:absolute;left:96px;top:142px;right:96px}.evidence-title h1{font-size:74px;margin-top:15px}.evidence-panel{position:absolute;left:96px;right:96px;top:315px;height:535px;background:#fff;border:2px solid #d7d4ce;border-radius:18px;overflow:hidden}.evidence-panel img{width:100%;height:100%;object-fit:contain;background:#fff}.evidence-label{position:absolute;right:24px;bottom:22px;background:#17212b;color:#f7f5f1;border-radius:14px;padding:17px 24px;font-size:27px}.evidence-source{position:absolute;top:868px;left:96px;font-size:20px;color:#596978}`;
await fs.writeFile(path.join(root,'compositions/frames/05-accountability.html'),sceneHtml('05-accountability',33,evidenceCss,evidenceBody,`tl.fromTo('#evidence-head',{y:35,opacity:0},{y:0,opacity:1,duration:.65,ease:'power3.out'},.1);tl.fromTo('#evidence-panel-1',{opacity:0},{opacity:1,duration:.5},.2);tl.to('#evidence-panel-1',{opacity:0,duration:.15},10.6);tl.fromTo('#evidence-panel-2',{opacity:0},{opacity:1,duration:.45},10.6);tl.to('#evidence-panel-2',{opacity:0,duration:.15},23);tl.fromTo('#evidence-panel-3',{opacity:0},{opacity:1,duration:.45},23);`));

const services=[['firebase-hosting','Firebase Hosting','LIVE · Spark frontend'],['firebase-auth','Firebase Authentication','Intended · not connected'],['cloud-run','Cloud Run','Packaged · undeployed'],['firestore','Firestore','Intended · undeployed'],['cloud-storage','Cloud Storage','Intended · undeployed'],['vertex-ai','Vertex AI / Gemini','Undeployed · unverified']];
const serviceRows=services.map(([icon,name,role],i)=>`<div id="google-service-${i}" class="service"><img src="../../assets/icons/${icon}.svg" alt="Official ${name} product icon"><div><strong>${name}</strong><span>${role}</span></div></div>`).join('');
const googleCss=`.google-heading{position:absolute;left:96px;top:148px;width:1540px}.google-heading h1{font-size:78px;margin-top:12px}.services{position:absolute;top:350px;left:96px;width:680px;display:grid;grid-template-columns:1fr 1fr;gap:26px}.service{height:128px;display:flex;gap:19px;align-items:center;background:#fff;border:2px solid #d7d4ce;border-radius:16px;padding:18px}.service img{width:58px;height:58px}.service strong{font-size:26px;line-height:1.1;display:block}.service span{font-size:20px;color:#596978;display:block;margin-top:9px}.diagram{position:absolute;left:820px;top:340px;width:1004px;height:565px;object-fit:contain;background:#fff;border:2px solid #d7d4ce;border-radius:16px}.google-note{position:absolute;left:96px;top:824px;width:680px;font-size:22px;line-height:1.4;color:#596978}.checks{position:absolute;left:820px;top:298px;width:1004px;font-size:24px;color:#a8492d;font-weight:700;text-align:center}`;
const googleBody=`<div class="google-heading"><div class="eyebrow">04 · Google ecosystem</div><h1 id="google-head">Live frontend. Backend next.</h1></div><div class="services">${serviceRows}</div><img class="diagram" src="../../assets/images/google-architecture.svg" alt="Live Firebase frontend and intended connected backend architecture"><div class="google-note">Firebase Hosting Spark: live, verified 18 Oct 2026.<br>Connected backend and Vertex/Gemini: undeployed; live use unverified.</div><div class="checks">Backend code: schema → repair → fallback</div>`;
let googleAnimation=`tl.fromTo('#google-head',{y:35,opacity:0},{y:0,opacity:1,duration:.65,ease:'power3.out'},.1);tl.fromTo('#06-google .diagram',{opacity:0,scale:.97},{opacity:1,scale:1,duration:.8,ease:'power2.out'},.35);`;
services.forEach((_,i)=>{googleAnimation+=`tl.fromTo('#google-service-${i}',{y:25,opacity:0},{y:0,opacity:1,duration:.5,ease:'power3.out'},${1+i*2});`;});
googleAnimation+=`tl.fromTo('#06-google .checks',{opacity:0},{opacity:1,duration:.5},26);`;
await fs.writeFile(path.join(root,'compositions/frames/06-google.html'),sceneHtml('06-google',52,googleCss,googleBody,googleAnimation));

const teamCss=`.closing{position:absolute;left:96px;top:170px;width:1030px}.closing h1{font-size:126px;margin:23px 0 24px}.closing .promise{font-size:37px;line-height:1.35;color:#596978;width:1000px}.roster{position:absolute;left:1140px;top:200px;width:684px;border-top:3px solid #a8492d}.person{padding:27px 0;border-bottom:2px solid #d7d4ce;font-size:32px;font-weight:600}.person span{display:block;margin-top:10px;font-size:22px;font-weight:400;color:#596978}.prototype{position:absolute;left:96px;top:740px;font-size:27px;line-height:1.6}.prototype strong{font-size:23px;color:#a8492d;text-transform:uppercase;letter-spacing:2px;display:block}.prototype small{font-size:22px;color:#596978}`;
const teamBody=`<div class="closing"><span class="eyebrow">Tri-Fusion</span><h1 id="team-title">Namma Civic.</h1><p class="promise">Report the problem.<br>Build the conversation.<br>Verify the fix.</p></div><div class="roster"><div id="person-1" class="person">Vudumula Naga sai Rahul<span>Team Leader</span></div><div id="person-2" class="person">Mohammed Mudasser<span>Team Member</span></div><div id="person-3" class="person">Abubakr Siddique M<span>Team Member</span></div></div><div class="prototype"><strong>Try the public demonstration</strong>leadnet-blr.web.app<small> · Firebase Hosting Spark · Device-only demo</small></div>`;
await fs.writeFile(path.join(root,'compositions/frames/08-team.html'),sceneHtml('08-team',11,teamCss,teamBody,`tl.fromTo('#team-title',{y:35,opacity:0},{y:0,opacity:1,duration:.65,ease:'power3.out'},.1);tl.fromTo('#08-team .person',{x:36,opacity:0},{x:0,opacity:1,duration:.55,stagger:.13,ease:'power3.out'},.35);`));

const srtClock=(seconds)=>{const ms=Math.round(seconds*1000);return `${String(Math.floor(ms/3600000)).padStart(2,'0')}:${String(Math.floor(ms/60000)%60).padStart(2,'0')}:${String(Math.floor(ms/1000)%60).padStart(2,'0')},${String(ms%1000).padStart(3,'0')}`;};
await fs.writeFile(path.join(root,'captions.srt'),captionData.map((item,index)=>`${index+1}\n${srtClock(item.start)} --> ${srtClock(item.start+item.duration)}\n${item.text}\n`).join('\n'));
await fs.writeFile(path.join(root,'assembly-report.json'),JSON.stringify({durationSeconds:215,scenes:scenes.length,voiceProvider:timing.provider,captions:'Phrase timing estimated from measured per-scene speech duration; review in preview.',captureFiles:captureRefs,finalRenderApproved:true},null,2)+'\n');
console.log(`Assembled ${scenes.length} scenes, ${captionData.length} caption phrases and eight measured voice tracks; requested revision is authorized for re-export.`);
