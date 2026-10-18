import { useEffect, useRef, useState, type FormEvent } from 'react';
import { Link, useNavigate } from 'react-router';
import { Camera, Check, ChevronLeft, LocateFixed, MapPin, Mic, Plus, Square, X } from 'lucide-react';
import { CATEGORIES, CATEGORY_META, DEPARTMENTS, HAZARDS, HAZARD_META, computePriority, zLatLng, zSubmitReport, type Category, type DraftResponse, type Severity, type SubmitReportResponse, type Triage } from '@leadnet/shared';
import { api } from '../../lib/api.ts';
import { Button, PageHeading, StatusPill } from '../../components/ui/index.tsx';

const input = 'min-h-11 w-full rounded-md border border-hairline bg-surface px-3 py-2.5 text-[15px] text-ink';
const label = 'mb-2 block text-[13px] font-medium text-ink-2';
const places = [{ name: 'MG Road', lat: 12.9757, lng: 77.6067 }, { name: 'Indiranagar', lat: 12.9784, lng: 77.6408 }, { name: 'KR Market', lat: 12.9607, lng: 77.5755 }];

export function Component() {
  const navigate = useNavigate();
  const [lat, setLat] = useState('');
  const [lng, setLng] = useState('');
  const [text, setText] = useState('');
  const [isSample, setIsSample] = useState(false);
  const [photo, setPhoto] = useState<File | null>(null);
  const [audio, setAudio] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [voicePreview, setVoicePreview] = useState<string | null>(null);
  const [draft, setDraft] = useState<DraftResponse | null>(null);
  const [edit, setEdit] = useState<Triage | null>(null);
  const [join, setJoin] = useState(false);
  const [busy, setBusy] = useState('');
  const [error, setError] = useState('');
  const [recording, setRecording] = useState(false);
  const [requestingMic, setRequestingMic] = useState(false);
  const [seconds, setSeconds] = useState(0);
  const alive = useRef(true);
  const recorder = useRef<MediaRecorder | null>(null);
  const stream = useRef<MediaStream | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const ticker = useRef<ReturnType<typeof setInterval> | null>(null);
  useEffect(() => { if (!photo) { setPreview(null); return; } const url = URL.createObjectURL(photo); setPreview(url); return () => URL.revokeObjectURL(url); }, [photo]);
  useEffect(() => { if (!audio) { setVoicePreview(null); return; } const url = URL.createObjectURL(audio); setVoicePreview(url); return () => URL.revokeObjectURL(url); }, [audio]);
  useEffect(() => { alive.current = true; return () => { alive.current = false; if (timer.current) clearTimeout(timer.current); if (ticker.current) clearInterval(ticker.current); if (recorder.current?.state === 'recording') recorder.current.stop(); stream.current?.getTracks().forEach((track) => track.stop()); }; }, []);

  function chooseFile(file: File | null, kind: 'photo' | 'audio') {
    setError(''); if (!file) return; setIsSample(false);
    if (file.size > (kind === 'photo' ? 8 : 2) * 1024 * 1024) { setError(`${kind === 'photo' ? 'Photo' : 'Voice note'} must be smaller than ${kind === 'photo' ? 8 : 2} MB.`); return; }
    if (kind === 'photo' ? !['image/jpeg', 'image/png', 'image/webp', 'image/heic', 'image/heif'].includes(file.type) : !file.type.startsWith('audio/')) { setError(`Choose a supported ${kind === 'photo' ? 'JPG, PNG, WebP, or HEIC image' : 'audio recording'}.`); return; }
    if (kind === 'photo') { setPhoto(file); return; }
    const url = URL.createObjectURL(file); const media = new Audio(url);
    media.onloadedmetadata = () => { URL.revokeObjectURL(url); if (!Number.isFinite(media.duration) || media.duration <= 0) setError('The length of this audio could not be read. Use an MP3, WAV, or record in the app.'); else if (media.duration > 30.25) setError('Keep the voice note to 30 seconds or less.'); else setAudio(file); };
    media.onerror = () => { URL.revokeObjectURL(url); setError('This voice note could not be read. Try an MP3, WAV, or a new recording.'); };
  }
  function locate() {
    setError(''); setIsSample(false); setBusy('location');
    if (!navigator.geolocation) { setBusy(''); setError('Enter coordinates or choose a landmark; location is unavailable.'); return; }
    navigator.geolocation.getCurrentPosition(({ coords }) => { setLat(coords.latitude.toFixed(6)); setLng(coords.longitude.toFixed(6)); setBusy(''); }, () => { setBusy(''); setError('Location access was unavailable. Enter coordinates or choose a landmark.'); }, { enableHighAccuracy: true, timeout: 12000 });
  }
  async function record() {
    setError(''); setIsSample(false); if (recording) { if (recorder.current?.state === 'recording') recorder.current.stop(); return; } if (requestingMic) return;
    if (!navigator.mediaDevices?.getUserMedia || typeof MediaRecorder === 'undefined') { setError('Recording is unavailable. Upload a voice note instead.'); return; }
    setRequestingMic(true);
    try {
      stream.current = await navigator.mediaDevices.getUserMedia({ audio: true });
      if (!alive.current) { stream.current.getTracks().forEach((track) => track.stop()); return; }
      const mimeType = ['audio/webm;codecs=opus', 'audio/ogg;codecs=opus', 'audio/mp4', 'audio/webm'].find((type) => MediaRecorder.isTypeSupported(type));
      const media = new MediaRecorder(stream.current, mimeType ? { mimeType } : undefined); const chunks: BlobPart[] = [];
      media.ondataavailable = (event) => { if (event.data.size) chunks.push(event.data); };
      media.onstop = () => { if (timer.current) clearTimeout(timer.current); if (ticker.current) clearInterval(ticker.current); stream.current?.getTracks().forEach((track) => track.stop()); if (!alive.current) return; const type = media.mimeType || 'audio/webm'; const file = new File(chunks, `voice-note.${type.includes('mp4') ? 'm4a' : type.includes('ogg') ? 'ogg' : 'webm'}`, { type }); if (!file.size) setError('No audio was captured. Try recording again.'); else if (file.size > 2 * 1024 * 1024) setError('Try a shorter recording; this one exceeds 2 MB.'); else setAudio(file); setRecording(false); };
      recorder.current = media; media.start(); setRecording(true); setSeconds(0);
      ticker.current = setInterval(() => setSeconds((value) => value + 1), 1000); timer.current = setTimeout(() => { if (media.state === 'recording') media.stop(); }, 30000);
    } catch { stream.current?.getTracks().forEach((track) => track.stop()); if (alive.current) setError('Microphone access was unavailable. Upload a voice note or use text.'); } finally { if (alive.current) setRequestingMic(false); }
  }
  async function sample() {
    setBusy('sample'); setError('');
    try { const [image, voice] = await Promise.all([fetch('/samples/photos/pothole-1.jpg'), fetch('/samples/audio/kn-pothole-mg-road.mp3')]); if (!image.ok || !voice.ok) throw new Error('Sample evidence is unavailable. Add your own photo, voice note, or text.'); setPhoto(new File([await image.blob()], 'demo-pothole.jpg', { type: 'image/jpeg' })); setAudio(new File([await voice.blob()], 'demo-kannada.mp3', { type: 'audio/mpeg' })); setLat('12.9757'); setLng('77.6067'); setText('A pothole on MG Road is dangerous for people crossing the street. Demo sample.'); setIsSample(true); }
    catch (err) { setError(err instanceof Error ? err.message : 'Could not load sample evidence.'); } finally { setBusy(''); }
  }
  async function prepare(event: FormEvent) {
    event.preventDefault(); setError('');
    if (!lat || !lng || !zLatLng.safeParse({ lat: Number(lat), lng: Number(lng) }).success) { setError('Choose a Bengaluru location: latitude 12.6–13.4, longitude 77.2–77.95.'); return; }
    if (!photo && !audio && !text.trim()) { setError('Add a photo, a voice note, or a description to continue.'); return; }
    setBusy('draft');
    try { const form = new FormData(); form.set('lat', lat); form.set('lng', lng); if (text.trim()) form.set('text', text.trim()); if (photo) form.set('photo', photo); if (audio) form.set('audio', audio); if (isSample) form.set('demo', 'true'); const result = await api.form<DraftResponse>('/reports/draft', form); setDraft(result); setEdit(result.triage); setJoin(false); window.scrollTo({ top: 0, behavior: 'instant' }); }
    catch (err) { setError(err instanceof Error ? err.message : 'Your draft could not be prepared. Your details are still here; try again.'); } finally { setBusy(''); }
  }
  async function publish(event: FormEvent) {
    event.preventDefault(); if (!draft || !edit) return; setError('');
    const checked = zSubmitReport.safeParse({ draftId: draft.draftId, category: edit.category, hazards: edit.hazards, severity: edit.severity, title: edit.title, summary: edit.summary, joinIssueId: join ? draft.duplicate?.match?.issueId ?? null : null, anonymous: true });
    if (!checked.success) { setError(checked.error.issues.map((issue) => issue.message).join(' ')); return; } setBusy('publish');
    try { const result = await api.post<SubmitReportResponse>('/reports', checked.data); navigate(`/pass/${result.issueId}`, { state: { justReported: true, merged: result.merged } }); } catch (err) { setError(err instanceof Error ? err.message : 'The report was not published. Try again.'); } finally { setBusy(''); }
  }
  const priority = edit ? computePriority({ category: edit.category, hazards: edit.hazards, severity: edit.severity, supporters: 1, ageHours: 0 }) : null;
  const match = draft?.duplicate?.match;

  return <div className="mx-auto max-w-[1120px] px-5 py-10 md:px-8 md:py-16">
    <PageHeading title={draft ? 'Check the report.' : 'Put it on the record.'} kn={draft ? 'ವರದಿಯನ್ನು ಪರಿಶೀಲಿಸಿ.' : 'ಸಮಸ್ಯೆಯನ್ನು ದಾಖಲಿಸಿ.'} description={draft ? 'You decide what gets published. Correct the suggestion before continuing.' : 'A photo, a few words, or your voice. Start with what you have.'} />
    <div className="mt-10 grid items-start gap-10 lg:grid-cols-[minmax(0,1fr)_300px] lg:gap-16"><div>
      {error && <p role="alert" className="mb-6 rounded-md border border-st-reopened/25 bg-st-reopened-tint p-4 text-[15px] text-st-reopened">{error}</p>}
      {!draft || !edit ? <form onSubmit={prepare} className="space-y-8">
        <section>{isSample && <p className="mb-5 rounded-md bg-fill px-4 py-3 text-[13px] text-ink-3">Demo illustration · Synthetic Kannada voice · Preset MG Road pin</p>}<h2 className="text-[21px] font-semibold tracking-tight">What needs attention?</h2><p className="mt-2 text-[15px] text-ink-3">Kannada, English, or Hindi. Voice notes stay private.</p>
          <div className="mt-5 grid gap-4 sm:grid-cols-2"><div className="overflow-hidden rounded-lg border border-hairline bg-surface">
            {preview ? <div className="relative"><img src={preview} alt="Your report photo preview" className="aspect-[4/3] w-full object-cover" /><button type="button" onClick={() => { setPhoto(null); setIsSample(false); }} className="absolute right-2 top-2 flex min-h-11 min-w-11 items-center justify-center rounded-pill bg-surface" aria-label="Remove photo"><X size={18} /></button></div> : <div className="flex min-h-40 items-center justify-center text-ink-3"><Camera size={32} strokeWidth={1.3} /></div>}
            <label className="flex min-h-12 cursor-pointer items-center justify-center gap-2 focus-within:ring-2 focus-within:ring-focus border-t border-hairline px-4 text-[15px] font-medium"><Plus size={17} />{photo ? 'Change photo' : 'Add a photo'}<input className="sr-only" type="file" accept="image/*" onChange={(event) => chooseFile(event.target.files?.[0] ?? null, 'photo')} /></label><p className="px-4 pb-3 text-center text-[12px] text-ink-3">JPG, PNG or WebP. Up to 8 MB.</p>
          </div><div className="flex flex-col rounded-lg border border-hairline bg-surface p-5"><div className="flex flex-1 flex-col items-center justify-center py-3"><Mic size={32} strokeWidth={1.3} className={recording ? 'text-st-reported' : 'text-ink-3'} /><p className="mt-3 text-[15px]">{recording ? `Recording ${seconds}s / 30s` : 'Say it in your own words'}</p><button type="button" onClick={record} disabled={requestingMic || Boolean(busy)} className="mt-3 inline-flex min-h-11 items-center gap-2 rounded-pill bg-fill px-4 text-[13px] font-medium">{recording ? <Square size={14} /> : <Mic size={14} />}{requestingMic ? 'Opening microphone…' : recording ? 'Stop recording' : 'Record voice'}</button></div>
            {voicePreview && <div className="mt-3"><audio controls src={voicePreview} className="h-10 w-full" /><button type="button" onClick={() => { setAudio(null); setIsSample(false); }} className="min-h-11 text-[13px] text-ink-3">Remove voice note</button></div>}
            <label className="mt-2 flex min-h-11 cursor-pointer items-center justify-center text-[13px] text-link focus-within:ring-2 focus-within:ring-focus">Upload a voice note<input className="sr-only" type="file" accept="audio/*" onChange={(event) => chooseFile(event.target.files?.[0] ?? null, 'audio')} /></label><p className="text-center text-[12px] text-ink-3">Up to 30 seconds and 2 MB.</p>
          </div></div>
          <label className={`${label} mt-6`} htmlFor="description">Add a description <span className="font-normal text-ink-3">(optional with photo or voice)</span></label><textarea id="description" className={`${input} min-h-28 resize-y`} maxLength={2000} value={text} onChange={(event) => { setText(event.target.value); setIsSample(false); }} placeholder="What happened? What should someone look for?" />
        </section>
        <section className="border-t border-hairline pt-8"><div className="flex flex-wrap items-center justify-between gap-3"><h2 className="text-[21px] font-semibold tracking-tight">Where is it?</h2><button type="button" onClick={locate} disabled={Boolean(busy)} className="inline-flex min-h-11 items-center gap-2 text-[15px] text-link disabled:opacity-50"><LocateFixed size={17} />{busy === 'location' ? 'Finding location…' : 'Use my location'}</button></div><p className="mt-2 text-[15px] text-ink-3">The ward is assigned from the location when you continue.</p>
          <div className="mt-5 flex flex-wrap gap-2">{places.map((place) => <button key={place.name} type="button" onClick={() => { setLat(String(place.lat)); setLng(String(place.lng)); setIsSample(false); }} className="min-h-11 rounded-pill bg-fill px-4 text-[13px]">{place.name}</button>)}</div>
          <div className="mt-5 grid grid-cols-2 gap-3"><div><label className={label} htmlFor="latitude">Latitude</label><input id="latitude" className={input} type="number" step="any" required value={lat} onChange={(event) => { setLat(event.target.value); setIsSample(false); }} /></div><div><label className={label} htmlFor="longitude">Longitude</label><input id="longitude" className={input} type="number" step="any" required value={lng} onChange={(event) => { setLng(event.target.value); setIsSample(false); }} /></div></div><p className="mt-3 flex items-start gap-2 text-[13px] text-ink-3"><MapPin size={15} className="mt-0.5 shrink-0" />Location and photos will be public. Avoid home addresses and identifiable faces.</p>
        </section><Button type="submit" disabled={Boolean(busy) || recording || requestingMic}>{busy === 'draft' ? 'Preparing your report…' : 'Continue to review'}</Button>{busy === 'draft' && <p role="status" className="text-[13px] text-ink-3">Reading the evidence and checking for nearby duplicates. This can take a moment.</p>}
      </form> : <form onSubmit={publish} className="space-y-6">
        <button type="button" onClick={() => { setDraft(null); setEdit(null); setError(''); }} className="inline-flex min-h-11 items-center gap-2 text-[15px] text-link"><ChevronLeft size={16} />Change evidence or location</button>
        <div className={`rounded-lg p-5 ${draft.fallbackUsed ? 'bg-st-awaiting-tint' : 'bg-surface'}`}><p className="text-[15px] font-medium">{draft.fallbackUsed ? 'Manual review is ready.' : 'A suggestion, ready for your review.'}</p><p className="mt-1 text-[13px] text-ink-3">{draft.fallbackUsed ? 'The AI suggestion was unavailable. Choose the category and complete both language fields below.' : 'Gemini suggested the wording and category. Code computes the location, priority, and deadlines.'}</p></div>
        {!edit.isCivicIssue && <p className="rounded-md bg-st-awaiting-tint p-4 text-[15px] text-st-awaiting">This may not be a civic issue. Review the details before publishing.</p>}
        <div><label className={label} htmlFor="category">Category</label><select id="category" className={input} value={edit.category} onChange={(event) => { setEdit({ ...edit, category: event.target.value as Category }); setJoin(false); }}>{CATEGORIES.map((category) => <option key={category} value={category}>{CATEGORY_META[category].en}</option>)}</select></div>
        <fieldset><legend className={label}>Safety concerns <span className="font-normal text-ink-3">(up to 4)</span></legend><div className="flex flex-wrap gap-2">{HAZARDS.map((hazard) => <label key={hazard} className={`flex min-h-11 cursor-pointer items-center gap-2 rounded-pill border px-3 focus-within:ring-2 focus-within:ring-focus text-[13px] ${edit.hazards.includes(hazard) ? 'border-ink bg-primary text-on-primary' : 'border-hairline bg-surface'}`}><input className="sr-only" type="checkbox" checked={edit.hazards.includes(hazard)} disabled={!edit.hazards.includes(hazard) && edit.hazards.length >= 4} onChange={(event) => setEdit({ ...edit, hazards: event.target.checked ? [...edit.hazards, hazard] : edit.hazards.filter((value) => value !== hazard) })} />{edit.hazards.includes(hazard) && <Check size={13} />}{HAZARD_META[hazard].en}</label>)}</div></fieldset>
        <div><label className={label} htmlFor="severity">Severity: {edit.severity} of 5</label><input id="severity" className="min-h-11 w-full accent-[var(--color-primary)]" type="range" min="1" max="5" value={edit.severity} onChange={(event) => setEdit({ ...edit, severity: Number(event.target.value) as Severity })} /><div className="flex justify-between text-[12px] text-ink-3"><span>Minor inconvenience</span><span>Immediate safety risk</span></div></div>
        <div className="space-y-5 border-t border-hairline pt-6">{(['en', 'kn'] as const).map((lang) => <div key={lang} className="space-y-4"><div><label className={label} htmlFor={`title-${lang}`}>{lang === 'en' ? 'Title in English' : 'Title in Kannada / ಕನ್ನಡ ಶೀರ್ಷಿಕೆ'}</label><input id={`title-${lang}`} lang={lang} className={input} required maxLength={lang === 'en' ? 160 : 200} value={edit.title[lang]} onChange={(event) => setEdit({ ...edit, title: { ...edit.title, [lang]: event.target.value } })} /></div><div><label className={label} htmlFor={`summary-${lang}`}>{lang === 'en' ? 'Details in English' : 'Details in Kannada / ಕನ್ನಡ ವಿವರಗಳು'}</label><textarea id={`summary-${lang}`} lang={lang} className={`${input} min-h-24`} required maxLength={lang === 'en' ? 400 : 500} value={edit.summary[lang]} onChange={(event) => setEdit({ ...edit, summary: { ...edit.summary, [lang]: event.target.value } })} /></div></div>)}</div>
        {edit.transcript && <details className="rounded-md bg-fill p-4 text-[13px]"><summary className="min-h-11 cursor-pointer font-medium">Your voice transcript (private)</summary><p className="mt-3 whitespace-pre-wrap text-ink-2">{edit.transcript}</p></details>}
        {match && edit.category === match.issue.category && <fieldset className="rounded-lg border border-hairline bg-surface p-5"><legend className="px-2 text-[15px] font-semibold">A nearby report may be the same problem</legend><div className="flex gap-4">{match.issue.coverPhotoUrl && <img src={match.issue.coverPhotoUrl} alt="Nearby issue" className="h-20 w-20 rounded-sm object-cover" />}<div><Link to={`/issue/${match.issueId}`} target="_blank" rel="noreferrer" className="text-[17px] font-medium text-link">{match.issue.title.en}</Link><p className="mt-1 text-[13px] text-ink-3">{Math.round(match.distanceM)} m away · {match.issue.reportCount} reports</p><div className="mt-2"><StatusPill status={match.issue.status} /></div></div></div><div className="mt-4 space-y-2"><label className="flex min-h-11 cursor-pointer items-center gap-3 text-[15px]"><input type="radio" name="duplicate" checked={join} onChange={() => setJoin(true)} />Join this issue and add my support</label><label className="flex min-h-11 cursor-pointer items-center gap-3 text-[15px]"><input type="radio" name="duplicate" checked={!join} onChange={() => setJoin(false)} />This is a different problem. File separately.</label></div><p className="mt-3 text-[13px] text-ink-3">{match.reasons.join(' ')}</p></fieldset>}
        <details className="border-y border-hairline py-4 text-[13px]"><summary className="flex min-h-11 cursor-pointer items-center font-medium">How the suggestion was checked</summary><ul className="mt-3 space-y-2">{draft.checks.map((check, index) => <li key={`${check.name}-${index}`} className="flex justify-between gap-4"><span className="text-ink-3">{check.name.replaceAll('_', ' ')}</span><span className={check.passed ? 'text-st-verified' : 'text-st-awaiting'}>{check.passed ? 'Passed' : 'Fallback used'}</span></li>)}</ul></details>
        <p className="text-[13px] text-ink-3">You appear publicly as “Citizen”. Your name and voice recording are never published. Remove personal details from your report.</p><Button type="submit" disabled={Boolean(busy)}>{busy === 'publish' ? 'Publishing…' : join ? 'Join this issue' : 'Publish report'}</Button>
      </form>}
    </div><aside className="space-y-6 border-t border-hairline pt-6 lg:sticky lg:top-24 lg:border-t-0 lg:pt-0">
      {draft && edit ? <><div className="rounded-lg bg-surface p-6"><p className="text-[13px] text-ink-3">Routed by location</p><p className="mt-2 text-[21px] font-semibold">{draft.ward?.name.en ?? 'Outside mapped wards'}</p>{draft.ward && <p lang="kn" className="mt-1 text-[15px] text-ink-3">{draft.ward.name.kn}</p>}<p className="mt-5 text-[13px] text-ink-3">Responsible department</p><p className="mt-1 text-[15px]">{DEPARTMENTS[CATEGORY_META[edit.category].department].en}</p><p className="mt-5 text-[13px] text-ink-3">Resolution target</p><p className="mt-1 text-[15px]">{CATEGORY_META[edit.category].slaResolveHours} hours from report</p></div>{priority && <details className="rounded-lg bg-surface p-6"><summary className="cursor-pointer text-[15px] font-medium">Priority <span className="float-right tabular-nums">{priority.score}/100</span></summary><p className="mt-3 text-[13px] text-ink-3">Computed preview for one reporting citizen. Recomputed on publication.</p><dl className="mt-4 space-y-3">{priority.components.map((part) => <div key={part.key} className="flex justify-between text-[13px]"><dt className="text-ink-3">{part.label}</dt><dd className="tabular-nums">{part.points} pts</dd></div>)}</dl></details>}</> : <><div className="rounded-lg bg-surface p-6"><h2 className="text-[17px] font-semibold">Try a sample report</h2><p className="mt-2 text-[15px] text-ink-3">No pothole nearby? Use an illustrated demo photo, synthetic Kannada voice, and a preset MG Road location.</p><button type="button" onClick={sample} disabled={Boolean(busy)} className="mt-4 min-h-11 text-[15px] font-medium text-link disabled:opacity-50">{busy === 'sample' ? 'Loading sample…' : 'Use demo evidence'}</button></div><div className="px-1"><p className="text-[15px] font-medium">One problem, one public record.</p><p className="mt-2 text-[13px] leading-relaxed text-ink-3">Nearby reports are checked before you publish. Join an existing issue or file a separate one.</p><Link to="/how-it-works" className="mt-3 inline-flex min-h-11 items-center text-[13px] text-link">Read how Namma Civic decides</Link></div></>}
    </aside></div>
  </div>;
}
