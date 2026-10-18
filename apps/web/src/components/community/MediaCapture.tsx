import { useEffect, useRef, useState } from 'react';
import { Camera, Circle, MapPin, Mic, Square, X } from 'lucide-react';
import type { CaptureLocation } from '@leadnet/shared';
import { getDevicePosition, readableError } from '../../lib/community.ts';

export function CameraCapture({ onCapture, onClose }: { onCapture: (file: File, location: CaptureLocation | null) => void; onClose: () => void }) {
  const video = useRef<HTMLVideoElement>(null); const stream = useRef<MediaStream | null>(null); const [ready, setReady] = useState(false); const [error, setError] = useState(''); const [busy, setBusy] = useState(false); const active = useRef(true);
  useEffect(() => {
    active.current = true; let cancelled = false; let ownStream: MediaStream | null = null;
    if (!navigator.mediaDevices?.getUserMedia) { setError('Camera access is unavailable. Choose a photo from your device instead.'); return; }
    void navigator.mediaDevices.getUserMedia({ video: { facingMode: { ideal: 'environment' }, width: { ideal: 1920 } }, audio: false }).then((camera) => {
      if (cancelled) { camera.getTracks().forEach((track) => track.stop()); return; }
      ownStream = camera; stream.current = camera; if (video.current) { video.current.srcObject = camera; void video.current.play().catch(() => { if (!cancelled) setError('Camera preview could not start. Choose a photo instead.'); }); }
    }).catch(() => { if (!cancelled) setError('Camera permission was declined or the camera is busy. Choose a photo from your device instead.'); });
    return () => { cancelled = true; active.current = false; ownStream?.getTracks().forEach((track) => track.stop()); };
  }, []);
  const takePhoto = async () => {
    if (!video.current || !ready || busy) return;
    setBusy(true); setError(''); const capturedAt = Date.now();
    const canvas = document.createElement('canvas'); const ratio = Math.min(1, 1920 / Math.max(video.current.videoWidth, video.current.videoHeight)); canvas.width = Math.round(video.current.videoWidth * ratio); canvas.height = Math.round(video.current.videoHeight * ratio);
    const context = canvas.getContext('2d'); if (!context) { setError('The camera could not capture a photo.'); setBusy(false); return; }
    context.drawImage(video.current, 0, 0, canvas.width, canvas.height);
    const location = getDevicePosition('camera', capturedAt).catch((cause: unknown) => { if (active.current) setError(readableError(cause)); return null; });
    const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, 'image/jpeg', 0.88));
    const position = await location;
    if (!active.current) return;
    setBusy(false);
    if (!blob) { setError('The camera could not capture a photo. Try again.'); return; }
    onCapture(new File([blob], `namma-civic-${capturedAt}.jpg`, { type: 'image/jpeg' }), position);
  };
  return <section className="community-camera" aria-label="Take an issue photo"><div className="community-camera-top"><span><Camera size={16} />Issue camera</span><button className="community-icon" type="button" onClick={onClose} aria-label="Close camera"><X size={18} /></button></div><video ref={video} muted playsInline onLoadedMetadata={() => setReady(true)} /><div className="community-camera-bottom"><p><MapPin size={14} />Your device location is requested when you take the photo.</p><button className="community-shutter" type="button" onClick={() => void takePhoto()} disabled={!ready || busy} aria-label={busy ? 'Finding photo location' : 'Take photo and find location'}><Circle size={33} strokeWidth={1.5} /></button><span role="status">{busy ? 'Finding location…' : 'Photo + location'}</span></div>{error && <p className="community-error" role="alert">{error}</p>}</section>;
}

export function VoiceRecorder({ audio, onAudio }: { audio: File | null; onAudio: (audio: File | null) => void }) {
  const [recording, setRecording] = useState(false); const [seconds, setSeconds] = useState(0); const [error, setError] = useState(''); const [url, setUrl] = useState(''); const [starting, setStarting] = useState(false);
  const recorder = useRef<MediaRecorder | null>(null); const tracks = useRef<MediaStream | null>(null); const timer = useRef<ReturnType<typeof setInterval> | null>(null); const mounted = useRef(true); const callback = useRef(onAudio); callback.current = onAudio;
  const stop = () => { if (recorder.current?.state === 'recording') recorder.current.stop(); else setRecording(false); tracks.current?.getTracks().forEach((track) => track.stop()); if (timer.current) clearInterval(timer.current); };
  useEffect(() => { mounted.current = true; return () => { mounted.current = false; if (recorder.current) recorder.current.onstop = null; if (recorder.current?.state === 'recording') recorder.current.stop(); tracks.current?.getTracks().forEach((track) => track.stop()); if (timer.current) clearInterval(timer.current); }; }, []);
  useEffect(() => { if (!audio) { setUrl(''); return; } const next = URL.createObjectURL(audio); setUrl(next); return () => URL.revokeObjectURL(next); }, [audio]);
  const start = async () => {
    setError(''); setStarting(true);
    if (!navigator.mediaDevices?.getUserMedia || typeof MediaRecorder === 'undefined') { setError('Voice recording is unavailable in this browser. Type your description below.'); setStarting(false); return; }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      if (!mounted.current) { stream.getTracks().forEach((track) => track.stop()); return; }
      tracks.current = stream; const chunks: Blob[] = [];
      const mimeType = ['audio/webm;codecs=opus', 'audio/webm', 'audio/mp4'].find((type) => MediaRecorder.isTypeSupported(type));
      const next = new MediaRecorder(stream, mimeType ? { mimeType } : undefined); recorder.current = next;
      next.ondataavailable = (event) => { if (event.data.size) chunks.push(event.data); };
      next.onstop = () => { stream.getTracks().forEach((track) => track.stop()); if (timer.current) clearInterval(timer.current); if (mounted.current) { const blob = new Blob(chunks, { type: next.mimeType || 'audio/webm' }); if (blob.size) callback.current(new File([blob], `private-voice.${blob.type.includes('mp4') ? 'm4a' : 'webm'}`, { type: blob.type })); setRecording(false); } };
      next.onerror = () => { stop(); if (mounted.current) setError('Recording interrupted. Please record again or type your description.'); };
      next.start(250); const started = Date.now(); setSeconds(0); setRecording(true);
      timer.current = setInterval(() => { const elapsed = Math.floor((Date.now() - started) / 1000); if (mounted.current) setSeconds(Math.min(30, elapsed)); if (elapsed >= 30) stop(); }, 200);
    } catch { tracks.current?.getTracks().forEach((track) => track.stop()); if (mounted.current) setError('Microphone permission was declined or recording could not start. Type your description instead.'); }
    finally { if (mounted.current) setStarting(false); }
  };
  return <div className="community-voice"><div className="community-voice-controls"><button type="button" className={`community-tool ${recording ? 'is-recording' : ''}`} disabled={starting} onClick={recording ? stop : () => void start()}>{recording ? <Square size={15} fill="currentColor" /> : <Mic size={17} />}{recording ? `Stop · ${seconds}s / 30s` : starting ? 'Opening microphone…' : audio ? 'Record again' : 'Record voice'}</button>{audio && !recording && <button type="button" className="community-tool" onClick={() => onAudio(null)}>Remove audio</button>}</div>{url && <audio src={url} controls preload="metadata" aria-label="Private voice recording" />}<p>Up to 30 seconds. Audio stays private and is never attached to a public post.</p>{error && <p className="community-error" role="alert">{error}</p>}</div>;
}
